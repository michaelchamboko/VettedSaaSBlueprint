# Manual article intake

Run `npm run import:article -- --intake` from the primary checkout. This captures the regular Markdown and text files currently in `Article Intake` in stable filename order. The captured source bytes and hashes define the run; files added later wait for another manual start.

For the returned run ID, use `npm run import:article -- --intake-resume <run-id>`. Continue each selected article through its recorded research, transformation, editorial, validation, release, merge, deployment, and production-verification actions before selecting the next entry. Record every result and keep unresolved entries visible.

Use `npm run import:article -- --intake-status <run-id>` to inspect the run. Article-specific failures are recorded and skipped. Shared Git, credential, editorial-tool, or deployment failures stop the run for explicit later resumption. `PROCESSING_PASS_FINISHED` means the captured set was processed; it does not mean every eligible article was published unless every entry is verified `LIVE`.

## Refining workflow

Eleanor applies the three SlopMonster passes to every editable prose field. For a direct review with an approved affiliate destination, each pass receives the accepted buyer brief, retained research and approved URL. The diagram shows where those inputs affect the edit and what happens when a check fails.

```mermaid
flowchart TD
    Draft["Draft enters Refining"] --> Scope{"Direct review with an approved affiliate destination?"}
    Scope -->|Yes| Brief["Load the buyer brief, research and approved URL"]
    Scope -->|No| Standard["Use the article's reader, intent and evidence"]
    Brief --> Structure
    Standard --> Structure

    subgraph Eleanor["Eleanor's three SlopMonster passes"]
        Structure["1. Purpose and structure<br/>Answer the reader's decision early.<br/>Order the sections around what they need to know."] --> Meaning
        Meaning["2. Meaning and evidence<br/>Check the main advantage and disqualifier against the research.<br/>Preserve qualifications and disclosure."] --> Wording
        Wording["3. Wording and rhythm<br/>Cut repetition and generic phrasing.<br/>For affiliate copy, match the next step to the approved URL."]
    end

    Wording --> Independent{"Verified reviewer context separate from every rewrite session?"}
    Independent -->|"No: self-review or unverifiable context"| Retry["Repeat the review in a separate, verifiable context"]
    Retry --> Independent
    Independent -->|Yes| Review["Independent reviewer applies the cleanse prompt.<br/>For affiliate reviews, quote and explain fit, rationale,<br/>when to choose an alternative, and the next step."]
    Review --> Verdict{"Review passed with all findings resolved?"}
    Verdict -->|No| Repair["Repair the prose. Return to drafting or research<br/>if the evidence or structure needs to change."]
    Repair --> Draft
    Verdict -->|Yes| Fidelity{"Final fidelity passes, checker scores 5/5 CLEAN,<br/>and the review matches the final text?"}
    Fidelity -->|No| Repair
    Fidelity -->|Yes| Affiliate{"Approved affiliate direct review?"}
    Affiliate -->|No| Approve["Record approval for this exact article"]
    Affiliate -->|Yes| Count{"How many reader-visible words?"}
    Count -->|"1,799 or fewer"| Expand["Answer a remaining buyer question with evidence"]
    Count -->|"1,800–2,300 inclusive"| Approve
    Count -->|"2,301 or more"| Cut["Cut repetition or detail that adds nothing to the decision"]
    Expand --> Repair
    Cut --> Repair
```

The count excludes metadata, URLs, repeated buttons and boilerplate disclosure. An in-range article can still fail independent review for padding, unsupported claims, a misleading call to action or an unresolved buyer objection. Editing approved prose requires fresh review.
