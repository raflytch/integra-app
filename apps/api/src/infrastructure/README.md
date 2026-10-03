# Infrastructure

Adapters that implement contracts owned by the domain or application layer. Do not inject Prisma, Axios, or SDK clients into controllers or use cases.

- `config/`: Zod environment schema, validated at startup.
- `database/prisma/`: `PrismaService`, for repositories only; Prisma implementations of domain repository contracts live in `repositories/` (`PrismaClaimRepository`).
- `llm/`: `OpenAiLlmClient` for any OpenAI-compatible provider, with a concurrency `Semaphore`.
- `security/`: AES-256-GCM `SecretCipher` and otplib `TotpVerifier`.
- `auth/`: `HmacSessionTokenService`, an HS256 session token built on `node:crypto` with `JWT_SECRET`.
- `tariffs/`: `SyntheticTariffSchedule`, synthetic INA-CBG tariffs per severity for the tariff gap.
