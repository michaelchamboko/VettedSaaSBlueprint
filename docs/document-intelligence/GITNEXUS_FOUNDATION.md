---
title: "Vetted SaaS B GitNexus Foundation Record"
tags: [gitnexus, document-intelligence, local-only, verification]
status: active
created: 2026-08-29
reviewed: 2026-08-31
---

# Vetted SaaS B GitNexus Foundation Record

## Indexed workspace

- Repository: `Vetted SaaS B - Content Strategy and Growth Strategy`
- Path: this workspace only
- GitNexus version: `1.6.9`
- Analysis command: `npx --yes gitnexus@1.6.9 analyze --force --index-only --workers 1 --wal-checkpoint-threshold 67108864`
- Embeddings: disabled
- PDG: disabled
- Context injection: disabled through `.gitnexusrc` `indexOnly: true`
- Current graph: 60 files, 5,431 nodes, 8,854 edges, 789 clusters, 0 processes, 0 embeddings
- Source corpus: 12 registered documents and 1,424 headings
- Canonical graph: 1,424 sections, 790 claims, 8 directives, 857 relationships
- Generated bridge: 2,222 node symbols, 857 relation symbols, 1,714 endpoint calls
- Git baseline: local repository on `main`, with the initial commit explicitly deferred
- Remotes: none

## Authority and isolation boundaries

- `DOCUMENT_GRAPH.json` is the semantic authority.
- The generated bridge and GitNexus index are structural corroboration and navigation only.
- Global Setup, ScrollCraft implementation, and VettedSaaSBlueprint application code are not members of this workspace index.
- The requested `michaelchamboko/marketingskills` fork is external evidence reviewed at commit `8bfcdffb655f16e713940cd04fb08891899c47db`; it is not indexed, installed, copied, or promoted to semantic authority.
- The requested `michaelchamboko/hormozi-skills` fork is external evidence reviewed at commit `25ec2b0789ae8c760b45f577024782ff399983a6`; only ten mapped individual copy capabilities may be called, and neither the bundle nor its orchestrator is installed, copied, indexed, or promoted to authority.
- D11 is indexed as the verified-fork strategy document and retains `implementation_authority: false` for production-page work.
- The UI catalogue is a visual-reference catalogue; its consumption relationship with D04 remains unresolved.
- External production and deployment evidence is excluded from this phase.
- `.gitnexus/`, `.scratch/`, `.claude/`, and `CLAUDE.md` are excluded from source intake.

The GitNexus registry may contain separate indexes for other repositories. Isolation means no external file or symbol is present in this workspace's named graph; it does not require deleting unrelated registry entries.

## Reproducible commands

```powershell
rtk powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-document-inventory.ps1
rtk powershell -NoProfile -ExecutionPolicy Bypass -File scripts\extract-relationship-candidates.ps1
rtk powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-document-graph.ps1
rtk powershell -NoProfile -ExecutionPolicy Bypass -File scripts\generate-gitnexus-bridge.ps1
rtk powershell -NoProfile -ExecutionPolicy Bypass -File scripts\refresh-gitnexus.ps1
rtk powershell -NoProfile -ExecutionPolicy Bypass -File scripts\reconcile-gitnexus-bridge.ps1
rtk powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-document-intelligence.ps1
```

Representative impact query:

```powershell
rtk powershell -NoProfile -ExecutionPolicy Bypass -File scripts\impact-document-change.ps1 -SectionUid D05-S-8b31a6de2a36
```

## Reconciliation evidence

- Canonical node IDs equal indexed bridge node symbol names as sets, not only as totals.
- Canonical edge IDs equal indexed relation function names as sets.
- Every relation function has exactly two endpoint `CALLS`.
- Relationship modules produce indexed `IMPORTS` edges.
- Generated modules pass runtime set and payload verification.
- All 101 extracted candidates have `accepted`, `duplicate`, or `unresolved` dispositions.
- All 1,424 sections have `claims-extracted` or `no-extracted-claim`; `unreviewed = 0`.
- Domain query evidence covers daily publishing, buyer decisions, affiliate independence, commercial intent, evidence, design/UI, motion, reduced motion, editorial operations, research, QA, page copy/content, SEO/AEO/schema, CRO/trust, analytics/experiments, and customer/competitor evidence.

## Indexer observations and limitations

- GitNexus skips `DOCUMENT_GRAPH.json` and `SOURCE_MANIFEST.json` because each exceeds its 512 KB source-file limit. This is expected: the generated JavaScript bridge is the indexable representation, and reconciliation proves exact set equality against those canonical files.
- The Windows LadybugDB store failed once at the default WAL checkpoint threshold during an incremental refresh. The documented 64 MiB threshold completed a forced clean rebuild, so the pinned refresh script now supplies that value explicitly.
- No execution processes are expected from this document graph.
- Search ranking proves discoverability, not authority or consistency.
- GitNexus commit-delta detection is not an acceptance gate because the repository has no baseline commit.
- Stable UIDs, source/content hashes, canonical edges, and `impact-document-change` provide the approved no-commit change-impact mechanism.
- The verifier regenerates relationship candidates and the canonical graph into unique temporary files and requires exact SHA-256 equality, preventing stale but internally consistent generated semantics from passing.
- A successful index never proves that prose semantics are consistent.

## Marketing capability boundary

The complete 45-skill disposition and conflict-resolution record lives in `DOMAIN_QUERY_EVIDENCE.md`, an existing semantic document rather than a new plan. Marketing skills are selected by page type and lifecycle stage, consume the existing research-context contract, return proposals, and remain subject to the local evidence, editorial, conversion, trust, disclosure, crawler, analytics, and QA authorities. UD-007 and its five canonical `constrains` relationships make that boundary graph-visible.

The same semantic record maps the ten requested Hormozi outputs to individual skill calls under UD-008 and ten canonical `constrains` relationships. Pricing strategy, monetary value anchoring, guarantee construction, fake scarcity, seller-controlled urgency, and arbitrary bonus values are excluded because Vetted is an affiliate publisher. Decision-relevant vendor pricing remains separately admissible only as a verified fact from the official pricing page with current date and region.

## Refresh procedure

1. Abort if the approved 12-source, 1,424-heading snapshot or any source hash drifts unexpectedly.
2. Rebuild inventory and candidates.
3. Review and deliberately disposition every new or changed candidate.
4. Rebuild the canonical graph and generated bridge.
5. Run the bridge runtime verifier.
6. Refresh GitNexus with pinned version `1.6.9` and `--index-only`.
7. Reconcile exact node and edge sets, endpoint calls, and imports.
8. Confirm no Claude-specific authority files or generated GitNexus block appear.
9. Run full document-intelligence verification, including deterministic candidate and graph reproduction.
10. Re-index after each later approved document batch.

## Readiness

`DOCUMENT GRAPH READY`

This state means every section and candidate is visible and classified, every canonical relationship is structurally represented, and impact can be calculated before an amendment. It does not resolve the recorded authority or commercial-motion tensions.
