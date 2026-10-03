# Engineering guide

## Project overview

This npm-only monorepo contains `apps/api` (NestJS, TypeScript, Prisma, PostgreSQL, Axios, class-validator) and `apps/web` (Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Axios). There are no shared packages until real cross-application requirements justify one. The backend follows Clean Architecture. Frontend visuals follow [apps/web/DESIGN.md](apps/web/DESIGN.md). Deployment (root `Dockerfile`, `deploy/`, `.github/workflows/ci-cd.yml`) is described in [docs/deployment.md](docs/deployment.md); new API variables also go in `deploy/.env.example`.

## Root commands

Use root commands for normal work: `npm run dev` (both), `npm run dev:client`, `npm run dev:server`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run format`, `npm run format:check`, `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:deploy`, `npm run prisma:studio`, `npm run prisma:validate`, `npm run llm:smoke` (two small paid calls to the configured LLM), and the free demo seeds `npm run seed` (`seed:users` then `seed:demo`), `npm run seed:demo -- --count=N`, and `npm run seed:fixture`. `seed:demo` stores raw, unextracted claims; the AI analysis (`POST /analysis/claims/:id`, one claim per call) and `npm run data:generate` make paid LLM calls, so trigger them only when asked. Never add a UI or endpoint that analyzes claims the user did not select. Prefer these over changing into a workspace. Use npm only: never pnpm, Yarn, or Bun.

## Architecture

Dependencies point inward: presentation and infrastructure depend on application/domain abstractions; application may depend on domain; domain depends on neither application nor frameworks. Domain and application must not import Prisma, Axios, NestJS HTTP concepts, Express request/response objects, or database details. Prisma remains in infrastructure. Infrastructure implements ports owned by inner layers. Controllers stay thin: receive validated input, call application behavior, and present output. No business rules or queries in controllers.

Backend placement: `src/domain` for pure entities, value objects, repository contracts, and domain errors; `src/application` for use cases, ports, and application DTOs; `src/infrastructure` for Prisma, configuration, and external HTTP adapters; `src/presentation` for controllers, HTTP DTOs, presenters, and filters. Create types and abstractions when a real feature needs them. Wire Nest dependency injection at module composition boundaries. Use class-validator and class-transformer only at transport boundaries, with the global ValidationPipe. Translate infrastructure errors before exposing them to clients. Read environment configuration through `ConfigService<Env, true>` (`get(key, { infer: true })`); the Zod schema in `infrastructure/config/env.schema.ts` validates it at startup, so add every new variable there and to `.env.example`. Never hardcode credentials or service URLs. Zod is reserved for environment and LLM output schemas; HTTP DTOs keep class-validator.

Shared ports are ready for injection: `PrismaService` (repositories only), `LlmClient` (never import `openai` outside `infrastructure/llm`), `SecretCipher`, and `TotpVerifier`. Feature errors extend `DomainError` and register their HTTP status in `presentation/filters/domain-exception.filter.ts`. Schema changes go through `npm run prisma:migrate`; constraints Prisma cannot express are added to the migration SQL and noted on the model.

## Frontend conventions

App Router owns routing and layouts. Server Components are the default; add `use client` only for browser APIs, event handlers, React state, or client data libraries. The QueryClient provider is a small client boundary. Use the centralized Axios instance in `src/lib/api-client.ts` from future `services/`. `components/ui` contains official shadcn primitives; check those before building a custom primitive. Icons come only from `react-icons/lu` (Lucide); swap `lucide-react` imports when adding a shadcn component. Data tables use `components/data-table` with the `useTableControls` hook for search, filters, sorting, and pagination. `components` holds reusable application components, `hooks` reusable hooks, `providers` global React providers, and `types` frontend contracts when needed. Keep backend DTOs separate until sharing is justified.

Follow `apps/web/DESIGN.md` for every visual decision. Reuse its palette, typography, spacing, radius, and surface tokens; do not introduce arbitrary colors or spacing. Build accessible forms and keyboard controls. Prefer Skeleton for structured loading, plain recovery actions for errors, and concise empty states.

## Quality and agent behavior

Inspect existing code before changing it. Keep TypeScript strict, lint and format passing, names meaningful, modules small, and `any` rare and justified. Avoid dead code, fake examples, speculative abstractions, unnecessary dependencies, and unrequested product behavior. Respect Clean Architecture, reuse existing ports and shadcn components, keep Prisma and Axios out of inner layers, preserve Server Components, and update documentation when architecture changes. Do not silently violate established conventions.
