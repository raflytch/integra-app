# Application

Use cases, ports, and application DTOs belong here. Use cases depend on domain types and abstractions, never on infrastructure or transport details.

`ports/` holds abstract classes that double as Nest DI tokens: `LlmClient` (with errors in `llm.errors.ts`), `SecretCipher`, `TotpVerifier`, `SessionTokenService`, and `TariffSchedule`. Implementations live in `infrastructure`.

`analysis/` holds the analysis pipeline: `ExtractClaimDocumentsUseCase` (M-03, one LLM call per unextracted document via `LlmClient`, with the output schema and prompt next to it), `EvaluateClaimUseCase` (detectors plus scores for one claim), and `AnalyzeClaimUseCase` (one claim end to end). There is deliberately no "analyze everything" use case: the web app calls one claim at a time for the claims a verifier selects, so LLM cost stays opt-in.
