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

Targeted `build:client`, `build:server`, `lint:client`, `lint:server`, `typecheck:client`, and `typecheck:server` are also available.

Development data for the INTEGRA demo, run from the repository root:

- `npx tsx --tsconfig apps/api/tsconfig.json apps/api/scripts/load-contract-fixture.ts` loads the UC-1 claim, its AI extraction, and evidence rules from `docs/contracts`.
- `npx tsx --tsconfig apps/api/tsconfig.json apps/api/scripts/seed-users.ts` creates the demo verifier and supervisor accounts and prints each TOTP setup key with a scannable QR code; the QR is also saved as a PNG in the gitignored `apps/api/.totp-qr/` (add `--rotate` for a new key).

## Design and engineering guidance

The Heptabase-inspired light visual system is documented in [apps/web/DESIGN.md](apps/web/DESIGN.md). It uses warm paper surfaces, the INTEGRA teal palette from the logo for primary actions, compact spacing, and flat cards. Reuse shadcn primitives and Tailwind tokens for consistency. [AGENTS.md](AGENTS.md) records dependency rules and conventions for future coding agents.

## Troubleshooting

- If `npm` is blocked by Windows PowerShell execution policy, run `npm.cmd`.
- If the web font loader cannot fetch fonts, check network access and retry the build.
- If Prisma commands cannot connect, check the API environment file and PostgreSQL host/port. `prisma:generate` and schema validation do not need a running database.
- If ports 3000 or 3001 are occupied, stop the conflicting process. The API `PORT` is configurable; adjust the web API URL to match.
