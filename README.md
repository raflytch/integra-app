# Resik App foundation

An npm-workspace foundation for a NestJS API and Next.js web app. It establishes infrastructure, tooling, and a visual system without business entities or product features.

## Stack and structure

| Workspace  | Stack                                                                             | Purpose                            |
| ---------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| `apps/api` | NestJS, TypeScript, Prisma, PostgreSQL, `@nestjs/axios`, class-validator          | HTTP and infrastructure foundation |
| `apps/web` | Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Axios | Responsive frontend foundation     |

The backend has `domain`, `application`, `infrastructure`, and `presentation` directories. Dependencies point inward: pure domain rules have no framework dependency; use cases depend on ports; Prisma and external HTTP clients implement those ports in infrastructure. This keeps business rules testable and independent of transport and persistence. The frontend uses a lighter App Router/components/providers/services structure because duplicating backend layers there would add ceremony without a current need. npm workspaces and `concurrently` cover local orchestration without a monorepo framework.

## Prerequisites and setup

Use Node.js 22.18+ (Node 24 is supported), npm, and PostgreSQL for future database-backed work. All commands run from the repository root. On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run prisma:generate
npm run dev
```

Edit the copied environment files for your machine. `apps/api/.env.example` provides `DATABASE_URL` and `PORT=3001`; `apps/web/.env.example` provides `NEXT_PUBLIC_API_URL=http://localhost:3001`. The API starts without a database while no repository is wired. Once a real data feature is added, start PostgreSQL (example: localhost port 5433, database `app`), set `DATABASE_URL`, add a real Prisma model, and run `npm run prisma:migrate`. No application tables or seed data are created by this scaffold.

## Everyday commands

| Command                   | Action                                              |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Start API and web together; Ctrl+C stops both       |
| `npm run dev:client`      | Start web at `http://localhost:3000`                |
| `npm run dev:server`      | Start API at `http://localhost:3001`                |
| `npm run build`           | Build both workspaces                               |
| `npm run lint`            | Lint both workspaces                                |
| `npm run typecheck`       | Typecheck both workspaces                           |
| `npm run format`          | Format repository files                             |
| `npm run format:check`    | Check formatting                                    |
| `npm run prisma:generate` | Generate Prisma client                              |
| `npm run prisma:validate` | Validate Prisma schema                              |
| `npm run prisma:migrate`  | Create/apply a local migration after adding a model |
| `npm run prisma:deploy`   | Apply committed migrations                          |
| `npm run prisma:studio`   | Open Prisma Studio                                  |
| `npm run seed`            | Demo accounts plus 300 raw demo claims (no LLM)     |
| `npm run seed:users`      | Demo verifier and supervisor accounts with TOTP QR  |
| `npm run seed:demo`       | Reset `KLM-DEMO-*` claims to raw, unanalyzed data   |
| `npm run seed:fixture`    | Load the UC-1 contract fixture claim                |
| `npm run data:generate`   | Generate the LLM dataset (paid LLM calls)           |
| `npm run data:seed`       | Load the generated LLM dataset                      |

Targeted `build:client`, `build:server`, `lint:client`, `lint:server`, `typecheck:client`, and `typecheck:server` are also available.

Development data for the INTEGRA demo, run from the repository root:

- Anyone can create a verifier account from the login page: enter an email that has no account, confirm the prompt, then scan the QR code (or paste the setup key) into an authenticator app and enter its 6-digit code within 5 minutes. The account is created only after that code matches, and the user is signed in right away. A new QR code can be generated at any time; an expired one leaves nothing behind.
- `npm run seed:users` creates the demo verifier and supervisor accounts and prints each TOTP setup key with a scannable QR code; the QR is also saved as a PNG in the gitignored `apps/api/.totp-qr/` (add `-- --rotate` for a new key). With `DEMO_LOGIN_ENABLED=true` in `apps/api/.env` (the `.env.example` default), `verifikator@integra.local` and `supervisor@integra.local` sign in with the email alone, no authenticator code. Keep it `false` in production; every other account always needs its code.
- `npm run seed:demo` creates 12 fictional facilities and 300 template-based raw claims (April–September 2026, about 1,950 clinical documents) without calling the LLM. Documents stay unextracted, with no findings or decisions, and every claim waits for a decision. In the app, nothing is analyzed until you choose it: tick claims in Antrean Klaim (or use the Pilih menu for this page, the top 5/10/25 unanalyzed, or every claim in the table) and click "Analisis AI", use the Analisis button on a row, or "Analisis dengan AI" on a Kartu Klaim. Each unread document is one paid LLM call (about 6 per claim); a confirmation shows the count first, a full-screen loader shows progress and can stop the run, and verifiers then record decisions themselves. Use `npm run seed:demo -- --count=800` for another size (up to 5,000). Rerunning it resets the demo: it replaces `KLM-DEMO-*` claims, with their findings and decisions, and `RM-DEMO-*` patients.
- `npm run seed:fixture` loads the UC-1 claim, its AI extraction, and evidence rules from `docs/contracts`.

## Deployment

Production runs with Docker Compose on one VPS behind Caddy (automatic HTTPS), with images built by GitHub Actions and pushed to GHCR. One root `Dockerfile` builds the `api`, `web`, and `migrate` targets; the stack lives in `deploy/`. See [docs/deployment.md](docs/deployment.md) for the full server setup, secrets, and operations.

## Design and engineering guidance

The Genesis-inspired editorial visual system is documented in [apps/web/DESIGN.md](apps/web/DESIGN.md). It uses General Sans and DM Sans, an indigo accent reserved for interactive elements, Lucide icons through `react-icons/lu`, a shadcn sidebar, an Ikhtisar page with token-colored charts, searchable and sortable tables, and surfaces framed by 1px borders with small, low-opacity shadows. Reuse shadcn primitives and Tailwind tokens for consistency. [AGENTS.md](AGENTS.md) records dependency rules and conventions for future coding agents.

## Troubleshooting

- If `npm` is blocked by Windows PowerShell execution policy, run `npm.cmd`.
- If the web font loader cannot fetch fonts, check network access and retry the build.
- If Prisma commands cannot connect, check the API environment file and PostgreSQL host/port. `prisma:generate` and schema validation do not need a running database.
- If ports 3000 or 3001 are occupied, stop the conflicting process. The API `PORT` is configurable; adjust the web API URL to match.
