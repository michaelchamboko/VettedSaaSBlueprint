# Serial Vertical-Slice Implementation Plan

All slices are blocked pending the Grommet and preflight resolutions. Each slice owns an exact requirement set in `execution-state.json`, declares context, measured risk, validation tiers, independent review, and rollback boundaries.

| Slice | Outcome | Dependencies | Risk | Requirements | State |
|---|---|---|---|---:|---|
| SLC-001 | Repository provenance and strategy contracts | none | medium | 101 | blocked |
| SLC-002 | Approved document harmonisation | SLC-001 | high | 3 | blocked |
| SLC-003 | Content domain model and evidence architecture | SLC-002 | medium | 146 | blocked |
| SLC-004 | Decision Hub, Solution Hub, and scenario experience | SLC-003 | medium | 192 | blocked |
| SLC-005 | Research and editorial automation | SLC-004 | high | 140 | blocked |
| SLC-006 | Search, answer-engine, distribution, analytics, and crawlability | SLC-005 | high | 43 | blocked |
| SLC-007 | Design-system and UI-catalogue alignment | SLC-004 | medium | 145 | blocked |
| SLC-008 | Representative ScrollCraft pilot after separate approval | SLC-007 | high | 29 | blocked |
| SLC-009 | Integrated quality, migration, and release verification | SLC-006, SLC-008 | high | 22 | blocked |
