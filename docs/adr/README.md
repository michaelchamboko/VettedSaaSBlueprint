# Architecture decision records

Read the relevant record before changing a design that other parts of the system rely on.

| Record | Status | Revisit when |
| --- | --- | --- |
| [0001 Use one primary agent by default](0001-single-primary-agent.md) | Accepted | Measurements show a material benefit from multiple agents. |

## Writing a record

Record a decision when reversing it would take significant work, the reasoning would surprise someone reading the code, and the team weighed real alternatives. A database migration that changes who owns persistent data may qualify. A local variable rename belongs in the diff.

Copy the [ADR template](../../.agents/templates/architecture/adr-template.md) into this directory. Use the next four-digit number and a descriptive filename. Add a row to the index above. Start with Proposed and mark it Accepted when the decision maker agrees. For a historical decision, cite the original record and leave unknown dates or deciders explicit.

When a decision changes, write a new record with the new evidence. Link it to the old record, mark the old one Superseded, and update the index. Keep the original rationale available.

ADRs explain choices. Source strategy documents retain product authority, and [planning.md](../../planning.md) governs execution. During a design discussion, `grill-with-docs` combines `grilling` and `domain-modeling` to explore alternatives and capture decisions that meet the criteria above.
