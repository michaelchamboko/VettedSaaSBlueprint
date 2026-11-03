# Verified automation models

Owner directives, 2026-11-03: configure and test the models, then merge and deploy the reviewed automation changes. Do not build articles, start or resume imports, migrate real records, or publish articles.

| Role | Exact provider/model ID | Family |
| --- | --- | --- |
| Supervisor and writer | `opencode-go/beam-free` | `reflection-beam` |
| Eleanor cleanse | `nvidia/minimaxai/minimax-m3.1-flash` | `minimax` |

The local OpenCode default is Beam Free. The named `eleanor-cleanse` agent uses NVIDIA MiniMax and denies tools. Its system instructions require the complete bound input and pinned cleanse instructions. The agent name alone is not editorial evidence: the existing ordered passes, captured input/output, family checks, fidelity review, and 5/5 CLEAN gate still apply.

Use the desktop OpenCode 2.2.5 executable through `OPENCODE_EXECUTABLE`. The old PATH executable is 1.19.4 and does not expose the same connected providers. Earlier failures from that old runtime do not establish desktop model availability. New processes inherit the user environment setting; existing processes must reload it or receive the explicit value. No credentials are stored in this repository.

The capture adapter supports exactly 1.19.4 and 2.2.5. The configured manifest requires 2.2.5. Unknown versions fail closed. V2 evidence requires a fresh session containing exactly one user message, one completed assistant response, and one successful idle event. Parent, fork, revert, tool use, attachments, extra history, mismatched identities, changed prose, and changed pinned instructions are rejected. Reasoning is excluded from retained receipts.

## Observed verification

Both models returned `MODEL_IDENTITY_PROBE_OK` in isolated temporary directories with all tool permissions denied. Both sessions reported cost `0`. A second synthetic JSON exchange for each model passed `captureOpenCodeExecution`, preserving its exact provider/model identity and bound input/output. These were configuration tests, not articles or Eleanor acceptance runs.

| Model | Connectivity session | Bound receipt session |
| --- | --- | --- |
| Beam | `ses_e5e76ec8bffeWRHvf8URjOXG5F` | `ses_e5e70231dffeSgFL2TVq7v55Hi` |
| MiniMax | `ses_e5e7624beffe7qhOEr9J0ebmNg` | `ses_e5e6e1acaffe42HN1i4GIaaY2Q` |

The running desktop service resolved the Beam default and the exact MiniMax model for `eleanor-cleanse`. All 64 capability file hashes matched. All 531 files in the pre-existing intake/import inventory remained byte-for-byte unchanged.

One follow-up session creation hit a local CLI timeout under concurrent test load. The subsequent bounded retry succeeded. No model fallback was used.

## Primary evidence and limits

- [Reflection Beam model card](https://reflection.ai/beam-model-card) identifies Beam as Reflection's model.
- [NVIDIA MiniMax model card](https://build.nvidia.com/minimaxai/minimax-m3.1-flash/modelcard) identifies the MiniMax family. NVIDIA describes its endpoint as a research/development trial; this probe does not establish production usage rights or an unlimited free allowance.
- [OpenCode Go documentation](https://opencode.ai/v2/docs/console/go/) lists Beam Free as limited-time and region-dependent.

The local runtime configuration is active. Repository adapter and capability-manifest changes are released through the reviewed PR from `codex/automation-model-identities`. Verify the merged primary checkout and the deployed commit before reporting release completion. No real article acceptance run has been authorized or performed.

Before release, the full regression suite passed 465 tests with no failures and three Windows symlink-privilege skips. Lint reported no errors and 15 existing warnings; type checking and the agent-workflow check passed. Both genuine synthetic model exchanges passed receipt capture, read-only capability preflight returned no diagnostics, and independent local review found no actionable issues.
