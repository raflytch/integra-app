# Application

Use cases, ports, and application DTOs belong here. Use cases depend on domain types and abstractions, never on infrastructure or transport details.

`ports/` holds abstract classes that double as Nest DI tokens: `LlmClient` (with errors in `llm.errors.ts`), `SecretCipher`, `TotpVerifier`, `SessionTokenService`, and `TariffSchedule`. Implementations live in `infrastructure`.

`analysis/` holds the analysis pipeline: `ExtractClaimDocumentsUseCase` (M-03, one LLM call per unextracted document via `LlmClient`, with the output schema and prompt next to it), `EvaluateClaimUseCase` (detectors plus scores for one claim), `AnalyzeClaimUseCase` (one claim end to end), and `RunAnalysisUseCase` (the next `ANALYSIS_BATCH_SIZE` claims, then rescoring every extracted claim).
