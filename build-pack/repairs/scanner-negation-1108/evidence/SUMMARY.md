# Baseline vs repaired scanner evidence

Synthetic clones of src/generated/landing-pages/elevenlabs-ai-voice-generator.json (only faq[0].answer changed). Baseline copies from origin/main 53fada6; repaired from current worktree. Runtime Node 24.22.2.

| Case | Answer (truncated) | Scanner | Baseline exit | Baseline faq.0.answer finding | Repaired exit | Repaired faq.0.answer finding |
|---|---|---|---:|---|---:|---|
| 1 | Yes. Check the inboxes your readers use ... | compliance | 1 | unsupported_sensitive_claim | 0 | (none) |
| 1 | Yes. Check the inboxes your readers use ... | conversion | 1 | unsupported_hype_or_pressure | 0 | (none) |
| 1 | Yes. Check the inboxes your readers use ... | uniqueness | 1 | unsupported_sensitive_claim | 0 | (none) |
| 2 | We guarantee consistent rendering.... | compliance | 1 | unsupported_sensitive_claim | 1 | unsupported_sensitive_claim |
| 2 | We guarantee consistent rendering.... | conversion | 1 | unsupported_hype_or_pressure | 1 | unsupported_hype_or_pressure |
| 2 | We guarantee consistent rendering.... | uniqueness | 1 | unsupported_sensitive_claim | 1 | unsupported_sensitive_claim |
| 3 | A visual editor alone cannot guarantee c... | compliance | 1 | unsupported_sensitive_claim | 1 | unsupported_sensitive_claim |
| 3 | A visual editor alone cannot guarantee c... | conversion | 1 | unsupported_hype_or_pressure | 1 | unsupported_hype_or_pressure |
| 3 | A visual editor alone cannot guarantee c... | uniqueness | 1 | unsupported_sensitive_claim | 1 | unsupported_sensitive_claim |
| 4 | Our results are not less guaranteed.... | compliance | 1 | unsupported_sensitive_claim | 1 | unsupported_sensitive_claim |
| 4 | Our results are not less guaranteed.... | conversion | 1 | unsupported_hype_or_pressure | 1 | unsupported_hype_or_pressure |
| 4 | Our results are not less guaranteed.... | uniqueness | 1 | unsupported_sensitive_claim | 1 | unsupported_sensitive_claim |
| 5 | Do not avoid a guarantee.... | compliance | 1 | unsupported_sensitive_claim | 1 | unsupported_sensitive_claim |
| 5 | Do not avoid a guarantee.... | conversion | 1 | unsupported_hype_or_pressure | 1 | unsupported_hype_or_pressure |
| 5 | Do not avoid a guarantee.... | uniqueness | 1 | unsupported_sensitive_claim | 1 | unsupported_sensitive_claim |

Exit codes and fixture hashes are in index.jsonl.