# Presentation

Controllers, request DTOs, presenters, and HTTP filters belong here. Keep controllers thin and validate input at this boundary.

`filters/domain-exception.filter.ts` maps `DomainError` codes to HTTP statuses; other errors fall through to Nest's default handler.
