# Application

Use cases, ports, and application DTOs belong here. Use cases depend on domain types and abstractions, never on infrastructure or transport details.

`ports/` holds abstract classes that double as Nest DI tokens: `LlmClient` (with errors in `llm.errors.ts`), `SecretCipher`, and `TotpVerifier`. Implementations live in `infrastructure`.
