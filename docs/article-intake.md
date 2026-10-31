# Manual article intake

Run `npm run import:article -- --intake` from the primary checkout. This captures the regular Markdown and text files currently in `Article Intake` in stable filename order. The captured source bytes and hashes define the run; files added later wait for another manual start.

For the returned run ID, use `npm run import:article -- --intake-resume <run-id>`. Continue each selected article through its recorded research, transformation, editorial, validation, release, merge, deployment, and production-verification actions before selecting the next entry. Record every result and keep unresolved entries visible.

Use `npm run import:article -- --intake-status <run-id>` to inspect the run. Article-specific failures are recorded and skipped. Shared Git, credential, editorial-tool, or deployment failures stop the run for explicit later resumption. `PROCESSING_PASS_FINISHED` means the captured set was processed; it does not mean every eligible article was published unless every entry is verified `LIVE`.
