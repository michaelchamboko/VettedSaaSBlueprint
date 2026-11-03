# Automation hardening brief

Owner-approved scope: enforce the existing article workflow through locally validated, byte-bound evidence. Preserve real editorial and verifier outputs. Require Eleanor, SEO and AEO assessment before release; stop missing or stale proof. Keep historical completion distinct from current eligibility and keep genuine quarantine distinct from publication.

Implementation and tests use an isolated checkout and synthetic fixtures. Do not build articles, resume imports, mutate actual intake records, publish, merge or deploy. No model calls are needed for testing. Model family identities must be explicitly configured before a future real run; unknown aliases stop execution.

Acceptance: valid fixture chains pass, incomplete or stale chains fail before side effects, concurrent creation uses one source identity, invalid terminal intake cannot be skipped, diagnosis counts do not reset across error messages, and read-only commands leave state unchanged. Record actual test and independent code-review results before declaring completion.
