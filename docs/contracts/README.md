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

Example: [`claim-list.example.json`](claim-list.example.json). Optional `?status=PENDING|APPROVED|CLARIFICATION_REQUESTED|ESCALATED`. Ordered by `priorityScore` descending, then `potentialGap` descending. `findingCounts` drives the per-test badges; a claim with any finding is labelled "perlu klarifikasi", never "fraud".

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

## `POST /analysis/run` (T21)

Runs every available test over claims whose documents all have `extracted`, rewrites their findings, and recalculates `potential_gap` (sum of `tariffGap`) and `priority_score` (`0.7 × strongest finding strength + 0.3 × min(potentialGap / tariffAmount, 1)`). Returns `{ analyzedClaimCount, skippedClaimCount, flaggedClaimCount, findingCount }`; skipped claims are waiting for M-03 extraction.

Uji Ada (M-04) rules: a secondary diagnosis is flagged when at least half of its `evidence_rules` are not found. A rule is found when an extracted item of the same evidence type contains `expected` (case-insensitive). `FINDING` only counts items with `isPresent: true`; `VITAL_SIGN` also matches present findings such as "hipotensi". Each flagged diagnosis lowers severity by one level, and `tariffGap` is the tariff difference between those levels from the `TariffSchedule` port.
