# CAPTURE-REPLAY-1110 repair note

User directive: implement reproducible evidence capture before accepting handoffs; real article remains paused.

Forensic source (read-only): primary checkout `.automation/article-imports/work/article-ea8e4b04-2bd0-44fc-b897-8dd145a8b714/quarantine-hand-built-20261109/README.md`. Three design captures were hand-built although raw user messages contained a prose wrapper and `<file>` envelope attachment; `extractOpenCodeExecution` rejects that transport, but `validateExecutionEvidence` previously accepted self-consistent manually constructed records without replay.

Repair: captured OpenCode evidence now retains a strict `replay` object `{ export, inputRefs, outputRefs }`. `export` holds the minimal selected source export (identity/timing/linkage/completion metadata and selected text only; no reasoning, tools, unrelated history, or nonessential metadata). `extractOpenCodeExecution` produces replay automatically from the raw source; `validateExecutionEvidence` replays through `extractOpenCodeExecutionCore` and rejects missing or divergent replay. Historical records remain readable but cannot satisfy handoff validation without genuine replay evidence.

The user authorized this code repair and synthetic tests. The real article remains paused. Code release follows the repository's existing PR and deployment gates; it does not authorize an article run or changes to historical evidence.
