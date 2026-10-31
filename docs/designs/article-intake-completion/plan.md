# Manual fixed-snapshot article publication workflow

Status: approved for implementation

The manual intake command captures the files present in `Article Intake` at start time, preserves their bytes and hashes, and processes entries in stable filename order through the existing import stages. A supervising agent executes every returned action through verified publication before selecting the next entry. Article-specific blockers are recorded and skipped; shared capability or release failures stop the run. Files added after capture wait for the next manual start.

The first implementation slice adds wrapped Markdown normalisation, immutable intake capture, run inspection commands, explicit authority instructions, and tests for wrapper parsing and late-file exclusion. Existing release gates remain authoritative. Merge and deployment require the repository checks and the current-head Codex connector review required by the release adapter.
