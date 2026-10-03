# INTEGRA

**Detect with evidence. Decide with integrity.**

INTEGRA is a review assistant for Indonesian national health insurance (JKN) inpatient claims, built for claim verifiers and their supervisors. It reads each claim's medical record and flags claims whose evidence is missing, whose notes contradict each other, or whose documents look copied from another patient's claim. Every flag links to a quote from the original document, so the verifier can check the evidence themselves.

INTEGRA never accuses anyone of fraud. Its only label is "perlu klarifikasi" (needs clarification), and the final decision (approve, request clarification, or escalate) always belongs to a person.

## How it works

1. **Claims arrive.** Claims come from the demo seed or from an imported file (JSON, CSV, or text). Each claim holds the facility, patient, admission dates, INA-CBG code, severity level, billed tariff, diagnoses, and clinical documents such as exam notes, daily notes, prescriptions, procedures, and the medical resume.
2. **The AI reads the medical record.** Analysis runs only on the claims the verifier selects (up to one page of 10 at a time), because every document is one paid LLM call. The AI extracts diagnoses, findings, vital signs, medications, and procedures. Each item must carry a quote that appears verbatim in the document; items without a matching quote are dropped.
3. **Clinical rules judge.** Three deterministic tests run on the extraction:

   | Test                               | What it checks                                                                                                                                                          |
   | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **Uji Ada** (existence)            | Secondary diagnoses without clinical evidence under the evidence rules (PNPK guidelines). Each unsupported diagnosis lowers severity and yields a potential tariff gap. |
   | **Uji Konsisten** (consistency)    | Notes in one record that contradict each other, findings without the action they require, or note times outside the inpatient stay.                                     |
   | **Uji Bukan Salinan** (not a copy) | Documents nearly identical to another patient's claim (TF-IDF and cosine similarity, no LLM). The shared sentences are highlighted in both claims.                      |

4. **The queue is prioritized.** A priority score combines the strongest flag with the potential tariff gap, so the claims most worth reviewing come first.
5. **The verifier decides.** On the claim card (Kartu Klaim), the verifier reads the AI summary, checks the quotes, and records a decision with a reason that becomes part of the audit trail.

## Features

| Page                                    | Roles                | Contents                                                                                                                                                         |
| --------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Antrean Klaim** (claim queue)         | Verifier, supervisor | Server-paginated claim list (10 per page) with status chips and counts, search, filters, sorting, and AI analysis of selected rows or the whole page             |
| **Kartu Klaim** (claim card)            | Verifier, supervisor | Claim summary, INTEGRA AI result, the three test panels with document quotes, diagnoses, medical record, and the decision panel                                  |
| **Impor Klaim** (claim import)          | Verifier, supervisor | Upload a file of up to 2 MB or 200 claims, preview validation, then import. Files not in `integra-claims/v1` format are reshaped by the AI after the user agrees |
| **Ikhtisar** (overview)                 | Supervisor           | Statistics and charts for the queue, AI analysis results, decision status, and per-facility patterns, computed by the API                                        |
| **Eskalasi** (escalations)              | Supervisor           | Claims verifiers escalated for joint review with the anti-fraud team                                                                                             |
| **Ringkasan Faskes** (facility summary) | Supervisor           | Server-paginated claim count, flags per test, and potential tariff gap per facility to prioritize facility coaching                                              |

Also included:

- Passwordless sign-in with an email address and a TOTP code from an authenticator app. New users create their own account from the login page by scanning a QR code.
- Interactive onboarding tours: the login guide (welcome, sign-in steps, copyable demo emails) opens on every visit to the login page; the review-flow tour covers the queue to a decision.
- Responsive layouts for phones, tablets, and desktops. Below 1024 px, tables become card lists and the sidebar becomes a slide-over sheet. On desktop, the sidebar collapses to an icon rail (Ctrl/⌘+B).

The user interface is in Indonesian; code, API, and documentation are in English.

## Stack and structure

An npm-workspaces monorepo with no shared packages:

| Workspace  | Stack                                                                                         | Role                                     |
| ---------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `apps/api` | NestJS, TypeScript, Prisma, PostgreSQL, class-validator, Zod, an OpenAI-compatible LLM client | REST API, claim analysis, authentication |
| `apps/web` | Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Axios, Recharts   | Verifier and supervisor interface        |

The backend follows Clean Architecture, with dependencies pointing inward:

- `src/domain`: entities, the three test rules, the priority score, and repository contracts. No framework imports.
- `src/application`: use cases (analysis, import, decisions, authentication) and ports such as `LlmClient`.
- `src/infrastructure`: Prisma repositories, the LLM client, TOTP secret encryption, and environment configuration validated with Zod.
- `src/presentation`: controllers, HTTP DTOs, presenters, session guards, and error filters.

API contracts and example JSON live in [docs/contracts](docs/contracts/README.md). Architecture rules for contributors and coding agents are in [AGENTS.md](AGENTS.md). The visual system is in [apps/web/DESIGN.md](apps/web/DESIGN.md).

## Setup

You need Node.js 22.18 or later (Node 24 is supported), npm, and PostgreSQL. Use npm only, not pnpm, Yarn, or Bun. Run every command from the repository root. On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run dev
```

The web app runs at `http://localhost:3000` and the API at `http://localhost:3001`.

Key variables in `apps/api/.env`:

| Variable                                   | Purpose                                                    |
| ------------------------------------------ | ---------------------------------------------------------- |
| `DATABASE_URL`                             | PostgreSQL connection (example: port 5433, database `app`) |
| `WEB_ORIGIN`                               | Web origin allowed by CORS                                 |
| `JWT_SECRET`                               | Session signing secret, at least 32 characters             |
| `TOTP_ENCRYPTION_KEY`                      | AES-256 key for TOTP secrets (`openssl rand -base64 32`)   |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | Any OpenAI-compatible LLM provider                         |
| `SIMILARITY_THRESHOLD`                     | Uji Bukan Salinan similarity threshold (default 0.65)      |

`apps/web/.env.local` only needs `NEXT_PUBLIC_API_URL=http://localhost:3001`. Every new API variable also goes in `deploy/.env.example`.

## Demo data and accounts

- `npm run seed:users` creates the demo accounts `verifikator@integra.local` and `supervisor@integra.local` and prints each TOTP setup key with a QR code. The QR code is also saved as a PNG in the gitignored `apps/api/.totp-qr/`. Add `-- --rotate` for a new key. Both demo accounts sign in with the email alone, without an authenticator code; every other account always needs its code.
- `npm run seed:demo` creates 12 fictional facilities and 300 raw claims (April to September 2026, about 1,950 clinical documents) without calling the LLM. Every claim is unanalyzed and awaits a decision. For another size, use `npm run seed:demo -- --count=800` (up to 5,000). Rerunning it resets the `KLM-DEMO-*` claims with their findings and decisions, and the `RM-DEMO-*` patients.
- `npm run seed:fixture` loads the UC-1 contract claim with its AI extraction and evidence rules from `docs/contracts`.
- Anyone can create a verifier account from the login page: enter an email that has no account, confirm the prompt, scan the QR code with an authenticator app, and enter its 6-digit code within 5 minutes. The account is created only once the code matches.

AI analysis costs money. Nothing is analyzed until a verifier chooses it: tick claims in Antrean Klaim or Eskalasi (or the header checkbox for the whole page of 10) and click "Analisis AI", click "Analisis" on one row, or "Analisis dengan AI" on a claim card. Each unread document is one LLM call (about 6 per claim); a confirmation dialog shows the count first, and the run can be stopped from the loading screen.

## Everyday commands

| Command                   | Action                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`             | Start the API and web together; Ctrl+C stops both                        |
| `npm run dev:client`      | Start the web app at `http://localhost:3000`                             |
| `npm run dev:server`      | Start the API at `http://localhost:3001`                                 |
| `npm run build`           | Build both workspaces                                                    |
| `npm run lint`            | Lint both workspaces                                                     |
| `npm run typecheck`       | Typecheck both workspaces                                                |
| `npm run format`          | Format repository files                                                  |
| `npm run format:check`    | Check formatting                                                         |
| `npm run prisma:generate` | Generate the Prisma client                                               |
| `npm run prisma:validate` | Validate the Prisma schema                                               |
| `npm run prisma:migrate`  | Create and apply a local migration after a schema change                 |
| `npm run prisma:deploy`   | Apply committed migrations                                               |
| `npm run prisma:studio`   | Open Prisma Studio                                                       |
| `npm run seed`            | Demo accounts plus 300 raw demo claims (no LLM)                          |
| `npm run seed:users`      | Demo verifier and supervisor accounts with TOTP QR codes                 |
| `npm run seed:demo`       | Reset `KLM-DEMO-*` claims to raw, unanalyzed data                        |
| `npm run seed:fixture`    | Load the UC-1 contract claim                                             |
| `npm run llm:smoke`       | Two small LLM calls to check the configuration (paid)                    |
| `npm run data:generate`   | Generate the synthetic dataset with the LLM (paid)                       |
| `npm run data:seed`       | Load the dataset produced by `data:generate`                             |
| `npm run eval:similarity` | Calibration report for the Uji Bukan Salinan threshold                   |
| `npm run eval:detection`  | Precision and recall of the three tests against the synthetic answer key |

Per-workspace variants are also available: `build:client`, `build:server`, `lint:client`, `lint:server`, `typecheck:client`, and `typecheck:server`.

## Deployment

Production runs with Docker Compose on a single VPS behind Caddy (automatic HTTPS). GitHub Actions builds the images and pushes them to GHCR. One root `Dockerfile` builds the `api`, `web`, and `migrate` targets; the stack lives in `deploy/`. See [docs/deployment.md](docs/deployment.md) for server setup, secrets, and operations.

## Troubleshooting

- If Windows PowerShell's execution policy blocks `npm`, run `npm.cmd`.
- If fonts fail to load during a build, check network access and retry.
- If Prisma cannot connect, check `DATABASE_URL` and the PostgreSQL host and port. `prisma:generate` and `prisma:validate` do not need a running database.
- If AI analysis fails with `503`, check the `LLM_*` variables and run `npm run llm:smoke`.
- If port 3000 or 3001 is taken, stop the conflicting process. The API `PORT` is configurable; update `NEXT_PUBLIC_API_URL` to match.
