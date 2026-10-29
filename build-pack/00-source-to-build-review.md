# Mandatory Grommet Source-To-Build Review

Candidate digest: `c3e8ab12cee7746854e08e596ab6070ef5c5035117d80ee51e58a76d0003f22f`

## What will be built after approval

Nine serial vertical outcomes cover provenance, harmonisation, evidence architecture, the three buyer-decision experiences, research/editorial automation, distribution, design alignment, a separately approved ScrollCraft pilot, and integrated migration/release verification.

## What will not be built under this approval

This candidate does not authorize production code, ScrollCraft adoption, GitHub history changes, Neon repository intelligence execution, Vercel changes, secrets, autonomous publication, or deployment.

## Source classification

| Source | Classification | Runtime authority | Path | Sections |
|---|---|---|---|---:|
| UI | supporting | approved | `docs/APPROVED_UI_COMPONENT_CATALOGUE.md` | 69 |
| D01 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-01-Market-Research-and-Opportunity-Plan-v1.md` | 101 |
| D02 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-02-Product-Roadmap-v1.md` | 127 |
| D03 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-03-AI-First-System-Architecture-and-Automation-Blueprint-v1.md` | 165 |
| D04 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-04-Design-System-and-Experience-Standards-v1.md` | 210 |
| D05 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-05-Master-PRD-v1.md` | 182 |
| D06 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-06-Agent-Technology-and-Implementation-Standards.md` | 150 |
| D07 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-07-Content-Intelligence-and-Editorial-Operations.md` | 145 |
| D08 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-08-Knowledge-Acquisition-and-Research-Operations.md` | 115 |
| D09 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-09-Growth-and-Distribution-Strategy.md` | 65 |
| D10 | authoritative | approved | `docs/Vetted-SaaS-Blueprint-10-QA-and-Testing-Plan.md` | 48 |
| D11 | proposed | proposed | `docs/Vetted-SaaS-Blueprint-11-ScrollCraft-Narrative-Motion-Strategy-and-Fork-Tailoring-Plan.md` | 47 |

## Contradictions and operator decisions

| ID | Status | Practical impact | Recommendation |
|---|---|---|---|
| GS-PREFLIGHT-001 | blocking | GlobalSetup commit 7bc03227e78a838c19f8a28d082b1d46e7e2f288 is on main but is not a tagged release (unreleased-main). | Create or identify an immutable released V2 tag, then rerun intake with that ref. |
| GS-PREFLIGHT-002 | resolved | Neon Postgres schema repository_intelligence_v1 is the approved persistence and impact-query boundary under managed-neon-service. | Test migrations on an isolated Neon branch and retain commit and digest evidence. |
| GS-PREFLIGHT-003 | resolved | The retired local graph index has been replaced by deterministic repository snapshots stored in Neon. | Use direct source inspection alongside bounded database impact queries. |
| GS-PREFLIGHT-004 | blocking | The workspace has no commit or remote baseline, while the eventual GitHub and Vercel destinations contain state that requires read-only provenance and rollback review. | Approve a history-reconciliation and in-place Vercel migration approach during the Grommet before publication work. |
| GS-CONTRACT-001 | resolved | The local generic BuildRunner accepts hash-bound proposed sources while requiring every connected requirement and task to remain explicitly blocked. | Keep D11 proposal-only until a separate digest-bound operator approval grants implementation authority. |
| F-002 | open-for-harmonisation | Some source relationship sections still describe an older ten-document set. | Adjudicate through document harmonisation and regenerate the candidate digest. |
| F-003 | open-for-harmonisation | A stale Master PRD filename exists and is resolved only through the explicit alias registry. | Adjudicate through document harmonisation and regenerate the candidate digest. |
| F-005 | open-and-visible | The UI catalogue has no explicit D04 consumer or authority relationship. | Adjudicate through document harmonisation and regenerate the candidate digest. |
| F-006 | open-for-harmonisation | The local foundation boundary and active-day deployment rules require later applicability adjudication. | Adjudicate through document harmonisation and regenerate the candidate digest. |
| F-011 | partially-mitigated | An explicit D10-to-D11 verification relationship now covers the narrative-motion verification matrix; UI-catalogue traceability remains a later amendment. | Adjudicate through document harmonisation and regenerate the candidate digest. |

## Approval rule

Approval is blocked while any row above remains blocking or open, any requirement loses its exact source mapping, or the candidate digest changes. Approval must name the operator and exact digest in `grommet-approval.json`.
