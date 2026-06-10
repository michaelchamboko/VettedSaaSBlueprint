# 11 — Task Graph

## Dependency Order

```mermaid
flowchart TD
  T00["T00 Planning Approval"] --> T01["T01 Governance Files"]
  T01 --> T02A["T02A Oracle DB Connectivity Readiness"]
  T02A --> T02["T02 Oracle DB Migrations"]
  T02 --> T03["T03 DB Access Layer"]
  T03 --> T04["T04 Auth Strategy"]
  T04 --> T05["T05 Product Vault"]
  T05 --> T06["T06 Affiliate Link Vault"]
  T06 --> T06A["T06A Offer Intelligence Folder"]
  T06A --> T06B["T06B Program Resource Intake"]
  T06B --> T06C["T06C Purchase Destination Review"]
  T06C --> T07["T07 Compliance Profiles"]
  T07 --> T08["T08 Manual Review Queue"]
  T03 --> T09["T09 Job Queue APIs"]
  T09 --> T10["T10 Oracle Hermes Worker"]
  T10 --> T11["T11 Budget Guard"]
  T11 --> T12["T12 Scrapling Research"]
  T12 --> T13["T13 Evidence Ledger"]
  T13 --> T14["T14 Page JSON Drafting"]
  T14 --> T15["T15 Quality Compliance Gate"]
  T15 --> T16["T16 Approval Publishing"]
  T16 --> T17["T17 Public Renderer"]
  T17 --> T18["T18 Tracking Events"]
  T18 --> T19["T19 Optimization Recommendations"]
  T19 --> T20["T20 Pre-Ship Review"]
```

## Task Sizing Rule

No task card should modify more than three source files or require more than three implementation steps. If a task exceeds this, split it before Step 2 execution.

## Critical Path

Planning approval → database foundation → auth → product/link/compliance workflows → jobs → Hermes → evidence → page drafting → approval/publishing → tracking → optimization.

## Parallelizable Areas After Auth/DB Foundation

- Admin UI surfaces.
- Hermes worker internals.
- Compliance/evidence tests.
- Public renderer polish.
- Deployment documentation.
