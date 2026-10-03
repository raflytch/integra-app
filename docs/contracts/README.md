# INTEGRA data contracts (T02)

Shared contract between the API (`apps/api`) and the web app (`apps/web`), and between M-03 extraction and the three detectors. Every example JSON in this folder is synthetic and follows `apps/api/prisma/schema.prisma`, which follows the MVP ERD.

## General rules

- IDs are UUID strings.
- Date-only columns (`admitted_at`, `discharged_at`, `birth_date`) are `YYYY-MM-DD`. Timestamps are ISO 8601 with offset.
- Money is a JSON number in rupiah (repositories convert Prisma `Decimal`).
- Enums keep their database spelling (`PENDING`, `EXISTENCE`, `MEDICAL_RESUME`, and so on). The web app owns the Indonesian labels.
- `claims.injected_case` is the dataset answer key and never appears in any API response.
- Errors use the `DomainExceptionFilter` shape: `{ "statusCode": 404, "code": "CLAIM_NOT_FOUND", "message": "..." }`.

## `clinical_documents.extracted` (M-03 writes, M-04/M-05 read)

Example: [`clinical-extraction.example.json`](clinical-extraction.example.json). One object per document. Every item keeps the original `quote` so the Kartu Klaim can show it.

| Field         | Item shape                                       | Maps to `evidence_type` |
| ------------- | ------------------------------------------------ | ----------------------- |
| `diagnoses`   | `{ name, icd10Code \| null, quote }`             | none                    |
| `findings`    | `{ name, isPresent, observedAt \| null, quote }` | `FINDING`               |
| `vitalSigns`  | `{ name, value, observedAt \| null, quote }`     | `VITAL_SIGN`            |
| `medications` | `{ name, dose \| null, givenAt \| null, quote }` | `MEDICATION`            |
| `procedures`  | `{ name, performedAt \| null, quote }`           | `PROCEDURE`             |

`isPresent: false` records an explicit negation such as "pasien tidak sesak", which Uji Konsisten needs (UC-2).

M-03 extraction (`ExtractClaimDocumentsUseCase`) sends one document per LLM call at temperature 0 with the output schema in `application/analysis/clinical-extraction.schema.ts`. Before saving, `groundExtraction` drops every item whose `quote` is not an exact substring of the document and maps explicit synonyms to the canonical terms in `domain/analysis/clinical-vocabulary.ts`. A document whose call fails transiently stays `extracted = null` and is retried on the next run.

## `findings.citations` (detectors write, Kartu Klaim reads)

An array of citation objects, discriminated by `kind`:

| `kind`             | Shape                                            | Used by                       |
| ------------------ | ------------------------------------------------ | ----------------------------- |
| `MISSING_EVIDENCE` | `{ kind, evidenceType, expected, guidelineRef }` | Uji Ada: evidence not found   |
| `QUOTE`            | `{ kind, documentId, quote }`                    | Uji Konsisten, Uji Ada        |
| `IDENTICAL_TEXT`   | `{ kind, documentId, relatedDocumentId, text }`  | Uji Bukan Salinan (highlight) |

## `GET /claims/:id` (M-08 Kartu Klaim)

Example: [`claim-detail.example.json`](claim-detail.example.json). Returns `404 CLAIM_NOT_FOUND` for an unknown id. `documents` exclude `extracted` and expose `isExtracted` instead (true once M-03 has read the document); findings expose `relatedClaim` as `{ id, claimNo, facilityName }` (Uji Bukan Salinan) or `null` instead of a bare id. Findings are ordered by `testType`, then `strength` descending. `decisions` lists `{ id, action, reason, createdAt, verifier: { id, name } }`, newest first.

## `GET /claims` (M-07 antrean)

Example: [`claim-list.example.json`](claim-list.example.json). Optional `?status=PENDING|APPROVED|CLARIFICATION_REQUESTED|ESCALATED`. Ordered by `priorityScore` descending, then `potentialGap` descending. `findingCounts` drives the per-test badges; a claim with any finding is labelled "perlu klarifikasi", never "fraud". `documentCount` and `extractedDocumentCount` show how many documents the AI has read. `analyzedAt` is the ISO timestamp of the last completed analysis (every document extracted and the tests run), or `null` while the claim is unanalyzed; `GET /claims/:id` returns it too.

## `GET /facilities/summary` (M-10 Ringkasan Faskes)

Example: [`facility-summary.example.json`](facility-summary.example.json). One row per facility, computed by query and never stored. `flaggedClaimCount` counts claims with at least one finding. Ordered by `totalPotentialGap` descending.

## Auth (M-11)

Every endpoint except `GET /health`, `POST /auth/login`, and `POST /auth/logout` needs the httpOnly `integra_session` cookie (HS256 JWT, 8 hours). Missing or invalid sessions get `401`; a role mismatch gets `403`.

| Endpoint            | Body              | Response                                                                                                                       |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `POST /auth/login`  | `{ email, code }` | `{ id, name, email, role }` plus the cookie; `401 INVALID_LOGIN` for a wrong or reused code; `429` after 5 attempts per minute |
| `POST /auth/logout` | none              | `204`, cookie cleared                                                                                                          |
| `GET /auth/me`      | none              | `{ id, name, email, role }`                                                                                                    |

`GET /facilities/summary` requires `SUPERVISOR`.

## `POST /claims/:id/decisions` (M-09)

Body `{ action: APPROVE | REQUEST_CLARIFICATION | ESCALATE, reason }` with a trimmed reason of 10 to 1000 characters. `verifier_id` comes from the session, never the body. The claim status becomes `APPROVED`, `CLARIFICATION_REQUESTED`, or `ESCALATED` in the same transaction. Returns the decision in the `decisions` item shape.

## `POST /analysis/claims/:id` (T21)

Runs M-03 extraction (paid LLM calls) on the claim's documents that are still unextracted, then, once every document is extracted, runs every available test on the claim, rewrites its findings, sets `analyzed_at` to now, and recalculates `potential_gap` (sum of `tariffGap`) and `priority_score` (`0.7 × strongest finding strength + 0.3 × min(potentialGap / tariffAmount, 1)`). A claim that is already extracted is only re-tested, without LLM calls. There is no bulk endpoint: the web app calls this once per claim the verifier selected, two at a time, so a run can be stopped between claims. Returns `{ extractedDocumentCount, failedDocumentCount, isAnalyzed, findingCount, potentialGap }`; `isAnalyzed` is false while some documents still failed. `404 CLAIM_NOT_FOUND` for an unknown id; `503 EXTRACTION_UNAVAILABLE` when the LLM is misconfigured or every remaining document failed.

Uji Ada (M-04) rules: a secondary diagnosis is flagged when at least half of its `evidence_rules` are not found. A rule is found when an extracted item of the same evidence type contains `expected` (case-insensitive). `FINDING` only counts items with `isPresent: true`; `VITAL_SIGN` also matches present findings such as "hipotensi". Each flagged diagnosis lowers severity by one level, and `tariffGap` is the tariff difference between those levels from the `TariffSchedule` port.

Uji Konsisten (M-05) rules: it compares notes within one medical record and never judges which note is clinically right. Finding names are compared through `toCanonicalFinding` (synonym, then the longest canonical finding the name contains). An item's time is its `observedAt`, `givenAt`, or `performedAt` when written as an ISO date (Jakarta time when no offset), otherwise its document's `recordedAt`. Claim documents are `EXAM_NOTE` and `MEDICAL_RESUME`. The stay runs from `admittedAt` 00:00 to the end of `dischargedAt`, Jakarta time.

| Code                     | Rule                                                                                                                                                                                                              | `strength` | `documentId` / `relatedDocumentId` |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------- |
| `CONTRADICTED_FINDING`   | A present finding in a claim document is negated by a `DAILY_NOTE` within 24 hours; one finding per canonical name, closest pair                                                                                  | 0.9        | claim document / daily note        |
| `FINDING_WITHOUT_ACTION` | A present finding in a claim document listed in `FINDING_REQUIRED_ACTIONS` (`sesak napas` → oksigen; `akral dingin` → resusitasi cairan or ringer laktat) has no matching medication or procedure in any document | 0.7        | first mention / `null`             |
| `IMPLAUSIBLE_TIME`       | A document's `recordedAt` or an item time falls outside the stay; one finding per document                                                                                                                        | 0.6        | that document / `null`             |

Citations are `QUOTE`s: both quotes for a contradiction, otherwise the item quote or the document's first sentence.
