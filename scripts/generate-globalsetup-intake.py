#!/usr/bin/env python3
"""Generate the source-intake-only GlobalSetup V2 candidate build pack."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


SOURCE_MANIFEST = "docs/document-intelligence/SOURCE_MANIFEST.json"
DOCUMENT_GRAPH = "docs/document-intelligence/DOCUMENT_GRAPH.json"
GLOBALSETUP_INSTRUCTION = "GLOBALSETUP_APPLICATION_INSTRUCTION.md"
OPEN_FINDING_STATUSES = {"open-for-harmonisation", "open-and-visible", "partially-mitigated"}
OWNER_RETIRED_REQUIREMENTS = {
    "R-C-D03-S-4cb790f028a7",
    "R-C-D03-S-5aed3f9cadd5",
    "R-C-D03-S-87056c5d3838",
    "R-C-D04-S-c4b95ead9969",
    "R-C-D07-S-cda2f93a025a",
    "R-C-D07-S-24ce753f0331",
    "R-C-D07-S-51c73f72ca7f",
    "R-C-D08-S-1419bc672bd8",
    "R-C-D08-S-8a9b77a9a639",
    "R-C-D08-S-aeebd36c92f4",
}

NON_EXECUTABLE_RETIREMENT_CONTEXT_REQUIREMENTS = {
    "R-C-D03-S-1591bfbb4a5d",
    "R-C-D03-S-51149f65d8b9",
    "R-C-D03-S-61259be0ec50",
    "R-C-D03-S-75d88f0be02c",
    "R-C-D03-S-fa592ef88ff8",
    "R-C-D03-S-fddd6f144f2c",
    "R-C-D07-S-4c6012467710",
    "R-C-D07-S-6aafd0d67023",
    "R-C-D08-S-b3ea66f554f2",
    "R-C-D08-S-de8aa1c5d8cf",
}


def is_non_executable_retirement(requirement: dict[str, Any]) -> bool:
    """Keep only the owner-adjudicated retirement sections out of task mappings."""
    return requirement["id"] in OWNER_RETIRED_REQUIREMENTS | NON_EXECUTABLE_RETIREMENT_CONTEXT_REQUIREMENTS


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def pretty_json(value: Any) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def exact_section(path: Path, start: int, end: int) -> str:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    if start < 1 or end < start or end > len(lines):
        raise ValueError(f"invalid section locator {path}:{start}-{end}")
    return "\n".join(lines[start - 1 : end])


def normalized_section(text: str) -> str:
    return "\n".join(line.rstrip() for line in text.splitlines()).strip() + "\n"


def run_text(argv: list[str], cwd: Path) -> str:
    command = shutil.which(argv[0])
    if not command:
        return f"unavailable: {argv[0]} is not on PATH"
    try:
        result = subprocess.run([command, *argv[1:]], cwd=cwd, text=True, encoding="utf-8", errors="replace", capture_output=True)
    except OSError as exc:
        return f"unavailable: {exc}"
    if result.returncode != 0:
        return f"unavailable: {(result.stderr or result.stdout).strip()}"
    return result.stdout.strip()


def source_classification(authority_status: str) -> tuple[str, str]:
    if authority_status == "draft-proposal-no-implementation-authority":
        return "proposed", "proposed"
    if authority_status == "visual-reference-catalogue":
        return "supporting", "approved"
    return "authoritative", "approved"


def build_source_manifest(root: Path, inventory: dict[str, Any]) -> tuple[dict[str, Any], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    if inventory.get("schema_version") != "2.0":
        raise ValueError("document-intelligence source manifest must use schema_version 2.0")
    source_index: dict[str, dict[str, Any]] = {}
    section_index: dict[str, dict[str, Any]] = {}
    sources: list[dict[str, Any]] = []
    for source in inventory.get("sources", []):
        source_id = source["source_id"]
        relative = source["path"]
        classification, authority = source_classification(source["authority_status"])
        sections: list[dict[str, Any]] = []
        for section in source.get("sections", []):
            exact_text = exact_section(root / relative, section["line_start"], section["line_end"])
            if sha256_text(exact_text) != section["content_sha256"] or exact_text != section["exact_text"]:
                raise ValueError(f"stale source hash: {source_id}/{section['stable_uid']}")
            text = normalized_section(exact_text)
            digest = sha256_text(text)
            item = {
                "id": section["stable_uid"],
                "display_id": section["display_id"],
                "heading": section["heading"],
                "heading_path": section["heading_path"],
                "locator": {"start_line": section["line_start"], "end_line": section["line_end"]},
                "hash": digest,
                "repository_hash": section["content_sha256"],
            }
            sections.append(item)
            section_index[section["stable_uid"]] = {
                "source_id": source_id,
                "source": source,
                "section": section,
                "text": text,
                "normalized_hash": digest,
            }
            section_index[section["display_id"]] = section_index[section["stable_uid"]]
        item = {
            "id": source_id,
            "path": relative.replace("\\", "/"),
            "title": source["title"],
            "classification": classification,
            "authority": authority,
            "authority_status": source["authority_status"],
            "document_hash": source["sha256"],
            "sections": sections,
        }
        sources.append(item)
        source_index[source_id] = item
    return {"schema_version": 1, "sources": sources}, source_index, section_index


def requirement_status(relevance: str, classification: str) -> str:
    if classification == "proposal" or relevance == "proposal-only":
        return "separate-authority-required"
    if relevance == "visual-reference-only":
        return "approved-reference-not-implementation-authority"
    return "candidate"


def build_requirements(graph: dict[str, Any], section_index: dict[str, dict[str, Any]]) -> tuple[dict[str, Any], dict[str, list[str]]]:
    requirements: list[dict[str, Any]] = []
    by_source: dict[str, list[str]] = {}
    seen: set[str] = set()

    for claim in graph.get("claims", []):
        requirement_id = f"R-{claim['id']}"
        if requirement_id in seen:
            raise ValueError(f"duplicate requirement id: {requirement_id}")
        seen.add(requirement_id)
        section = section_index.get(claim["section_uid"])
        if not section or section["source_id"] != claim["document_id"]:
            raise ValueError(f"claim has no exact source section: {claim['id']}")
        source = section["source"]
        source_section = section["section"]
        requirements.append(
            {
                "id": requirement_id,
                "classification": claim["classification"],
                "authority_domain": claim["authority_domain"],
                "implementation_relevance": claim["implementation_relevance"],
                "status": requirement_status(claim["implementation_relevance"], claim["classification"]),
                "statement": section["text"],
                "planned_outcome": f"Deliver or review {source_section['heading']} within the {claim['authority_domain']} boundary.",
                "acceptance_criteria": [
                    f"The outcome cites {source['path']} at {source_section['display_id']} ({source_section['stable_uid']}).",
                    "Evidence demonstrates the cited section without adding product meaning beyond its exact text.",
                ],
                "verification_obligations": ["source-hash", "requirement-traceability", "risk-tier-validation"],
                "sources": [
                    {
                        "source_id": claim["document_id"],
                        "section_id": claim["section_uid"],
                        "display_id": source_section["display_id"],
                        "heading": source_section["heading"],
                        "hash": section["normalized_hash"],
                    }
                ],
            }
        )
        by_source.setdefault(claim["document_id"], []).append(requirement_id)

    for directive in graph.get("directives", []):
        requirement_id = f"R-{directive['id']}"
        if requirement_id in seen:
            raise ValueError(f"duplicate requirement id: {requirement_id}")
        seen.add(requirement_id)
        references: list[dict[str, Any]] = []
        source_ids: set[str] = set()
        for display_id in directive.get("requirements_checked", []):
            section = section_index.get(display_id)
            if not section:
                raise ValueError(f"directive has unknown source section: {directive['id']}/{display_id}")
            source_ids.add(section["source_id"])
            source_section = section["section"]
            references.append(
                {
                    "source_id": section["source_id"],
                    "section_id": source_section["stable_uid"],
                    "display_id": source_section["display_id"],
                    "heading": source_section["heading"],
                    "hash": section["normalized_hash"],
                }
            )
        if not references:
            raise ValueError(f"directive has no source reconciliation: {directive['id']}")
        owner_authorized_proposal = (
            directive["resolution_state"] == "confirmed"
            and any(
                source_classification(section_index[ref["section_id"]]["source"]["authority_status"])[1] == "proposed"
                for ref in references
            )
        )
        requirements.append(
            {
                "id": requirement_id,
                "classification": "user-directive",
                "authority_domain": directive["authority_domain"],
                "implementation_relevance": "governance",
                "status": "owner-authorized-phase-one" if owner_authorized_proposal else directive["resolution_state"],
                **({"owner_authorized_phase_one": True} if owner_authorized_proposal else {}),
                "statement": directive["exact_text"],
                "planned_outcome": f"Preserve the operator's {directive['authority_domain']} decision at every connected task and approval gate.",
                "acceptance_criteria": [
                    "Every connected task cites this directive and its reconciled source sections.",
                    "No automated transition weakens or silently resolves the directive.",
                ],
                "verification_obligations": ["directive-traceability", "operator-authority", "source-reconciliation"],
                "sources": references,
            }
        )
        for source_id in source_ids:
            by_source.setdefault(source_id, []).append(requirement_id)
        by_source.setdefault(directive["id"], []).append(requirement_id)

    requirements.sort(key=lambda item: item["id"])
    return {"schema_version": 1, "requirements": requirements}, by_source


def estimate_tokens(root: Path, context_files: list[str]) -> int:
    characters = 0
    for relative in context_files:
        path = root / relative
        if path.is_file():
            characters += len(path.read_text(encoding="utf-8-sig"))
    return max(1, math.ceil(characters / 4))


def validation_for(risk: str) -> list[dict[str, Any]]:
    checks = [
        {
            "name": "focused document-intelligence tests",
            "tier": "task",
            "kind": "command",
            "location": "local",
            "argv": ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "tests/document-intelligence.tests.ps1"],
        }
    ]
    if risk in {"medium", "high"}:
        checks.append(
            {
                "name": "affected source-intelligence verification",
                "tier": "affected",
                "kind": "command",
                "location": "local",
                "argv": ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/verify-document-intelligence.ps1"],
            }
        )
    if risk == "high":
        checks.append(
            {
                "name": "full GlobalSetup intake determinism check",
                "tier": "full",
                "kind": "command",
                "location": "local",
                "argv": ["python", "scripts/generate-globalsetup-intake.py", "--check-from-provenance"],
            }
        )
    return checks


def measured_risk(values: tuple[int, int, int, int, int], force_high: bool = False) -> tuple[dict[str, int], str]:
    names = ("blast_radius", "reversibility", "authority", "sensitive_data", "external_impact")
    assessment = dict(zip(names, values))
    total = sum(values)
    risk = "low" if total <= 2 else "medium" if total <= 5 else "high"
    if force_high or assessment["authority"] == 2 or assessment["sensitive_data"] == 2:
        risk = "high"
    return assessment, risk


def build_tasks(root: Path, by_source: dict[str, list[str]]) -> list[dict[str, Any]]:
    definitions = [
        ("SLC-001", "Repository provenance and strategy contracts", [], (1, 0, 1, 0, 1), ["D06", "UD-001", "UD-002", "UD-004"], [GLOBALSETUP_INSTRUCTION, SOURCE_MANIFEST, DOCUMENT_GRAPH, "docs/Vetted-SaaS-Blueprint-06-Agent-Technology-and-Implementation-Standards.md"]),
        ("SLC-002", "Approved document harmonisation", ["SLC-001"], (1, 1, 2, 0, 0), ["UD-001", "UD-002", "UD-004"], ["docs/document-intelligence/FINDINGS_AND_CONFLICTS.md", "docs/document-intelligence/RELATIONSHIP_MAP.md", DOCUMENT_GRAPH]),
        ("SLC-003", "Content domain model and evidence architecture", ["SLC-002"], (1, 1, 1, 1, 0), ["D01", "D03"], ["docs/Vetted-SaaS-Blueprint-01-Market-Research-and-Opportunity-Plan-v1.md", "docs/Vetted-SaaS-Blueprint-03-AI-First-System-Architecture-and-Automation-Blueprint-v1.md"]),
        ("SLC-004", "Decision Hub, Solution Hub, and scenario experience", ["SLC-003"], (1, 1, 1, 1, 0), ["D02", "D05"], ["docs/Vetted-SaaS-Blueprint-02-Product-Roadmap-v1.md", "docs/Vetted-SaaS-Blueprint-05-Master-PRD-v1.md"]),
        ("SLC-005", "Research and editorial automation", ["SLC-004"], (2, 1, 2, 1, 1), ["D07", "D08", "UD-007", "UD-008"], ["docs/Vetted-SaaS-Blueprint-07-Content-Intelligence-and-Editorial-Operations.md", "docs/Vetted-SaaS-Blueprint-08-Knowledge-Acquisition-and-Research-Operations.md", "docs/document-intelligence/DOMAIN_QUERY_EVIDENCE.md"]),
        ("SLC-006", "Search, answer-engine, distribution, analytics, and crawlability", ["SLC-005"], (2, 1, 2, 0, 2), ["D09", "UD-003", "UD-008"], ["docs/Vetted-SaaS-Blueprint-09-Growth-and-Distribution-Strategy.md", "docs/Vetted-SaaS-Blueprint-03-AI-First-System-Architecture-and-Automation-Blueprint-v1.md"]),
        ("SLC-007", "Design-system and UI-catalogue alignment", ["SLC-004"], (1, 1, 1, 0, 1), ["D04", "UI"], ["docs/Vetted-SaaS-Blueprint-04-Design-System-and-Experience-Standards-v1.md", "docs/APPROVED_UI_COMPONENT_CATALOGUE.md"]),
        ("SLC-008", "Representative ScrollCraft pilot after separate approval", ["SLC-007"], (1, 1, 2, 0, 1), ["D11", "UD-005", "UD-006"], ["docs/Vetted-SaaS-Blueprint-11-ScrollCraft-Narrative-Motion-Strategy-and-Fork-Tailoring-Plan.md", "docs/Vetted-SaaS-Blueprint-04-Design-System-and-Experience-Standards-v1.md"]),
        ("SLC-009", "Integrated quality, migration, and release verification", ["SLC-006", "SLC-008"], (2, 2, 2, 1, 2), ["D10"], ["docs/Vetted-SaaS-Blueprint-10-QA-and-Testing-Plan.md", GLOBALSETUP_INSTRUCTION]),
    ]
    tasks: list[dict[str, Any]] = []
    for task_id, title, dependencies, factors, mappings, context_files in definitions:
        requirement_ids = sorted({requirement_id for mapping in mappings for requirement_id in by_source.get(mapping, [])})
        if not requirement_ids:
            raise ValueError(f"task has no mapped requirements: {task_id}")
        release_task = task_id == "SLC-009"
        assessment, risk = measured_risk(factors, force_high=release_task)
        initial_tokens = estimate_tokens(root, context_files)
        minimum_window = max(10_000, math.ceil(initial_tokens / 0.40))
        task: dict[str, Any] = {
            "id": task_id,
            "title": title,
            "status": "blocked",
            "dependencies": dependencies,
            "risk": risk,
            "risk_assessment": assessment,
            "source_changes": task_id == "SLC-002",
            "requirement_ids": requirement_ids,
            "context_files": context_files,
            "model_route": {"selection": "pending", "minimum_context_window_tokens": minimum_window},
            "context_packet": {
                "window_tokens": minimum_window,
                "initial_tokens": initial_tokens,
                "basis": "minimum required capacity derived from the current context files; select an actual runtime model at task start",
            },
            "validation": validation_for(risk),
            "evidence": [],
            "evidence_refs": [],
            "operation_phase": "blocked-before-start",
            "review": {"status": "pending", "required": risk == "high", "reviewer_must_be_distinct": True},
            "blocker": {
                "reason": "Grommet approval and an immutable released GlobalSetup V2 ref are absent; repository intelligence does not grant execution authority.",
                "resolution": "Resolve the recorded contradictions, reseal the digest, and obtain explicit operator approval.",
            },
            "extensions": {"vertical_slice": True},
        }
        tasks.append(task)
    return tasks


def candidate_digest(manifest: dict[str, Any], requirements: dict[str, Any], tasks: list[dict[str, Any]]) -> str:
    task_plan = [
        {key: task.get(key) for key in ("id", "title", "dependencies", "requirement_ids", "risk", "publication")}
        for task in tasks
    ]
    return sha256_text(stable_json({"manifest": manifest, "requirements": requirements, "task_plan": task_plan}))


def bind_requirements_to_tasks(requirements: dict[str, Any], tasks: list[dict[str, Any]]) -> None:
    task_ids_by_requirement: dict[str, list[str]] = {}
    for task in tasks:
        for requirement_id in task["requirement_ids"]:
            task_ids_by_requirement.setdefault(requirement_id, []).append(task["id"])
    for requirement in requirements["requirements"]:
        requirement_id = requirement["id"]
        requirement["acceptance_ids"] = [f"AC-{requirement_id.removeprefix('R-')}"]
        if requirement_id in OWNER_RETIRED_REQUIREMENTS:
            requirement["status"] = "owner-retired"
            requirement["tasks"] = []
            requirement["planned_outcome"] = "Retain this source statement for traceability without an executable mapping."
        elif is_non_executable_retirement(requirement):
            requirement["status"] = "separate-authority-required"
            requirement["tasks"] = []
            requirement["planned_outcome"] = "Retain this retirement context for traceability without an executable mapping."
        else:
            requirement["tasks"] = sorted(task_ids_by_requirement.get(requirement_id, []))


def build_contradictions(graph: dict[str, Any], args: argparse.Namespace) -> list[dict[str, Any]]:
    contradictions = [
        {
            "id": "GS-PREFLIGHT-001",
            "status": "blocking",
            "summary": f"GlobalSetup commit {args.globalsetup_commit} is on main but is not a tagged release ({args.globalsetup_release_status}).",
            "recommendation": "Create or identify an immutable released V2 tag, then rerun intake with that ref.",
        },
        {
            "id": "GS-PREFLIGHT-002",
            "status": "resolved",
            "summary": f"Neon Postgres schema {args.repository_intelligence_schema} is the approved persistence and impact-query boundary under {args.neon_service_basis}.",
            "recommendation": "Test migrations on an isolated Neon branch and retain commit and digest evidence.",
        },
        {
            "id": "GS-PREFLIGHT-003",
            "status": "resolved",
            "summary": "The retired local graph index has been replaced by deterministic repository snapshots stored in Neon.",
            "recommendation": "Use direct source inspection alongside bounded database impact queries.",
        },
        {
            "id": "GS-PREFLIGHT-004",
            "status": "blocking",
            "summary": "The workspace has no commit or remote baseline, while the eventual GitHub and Vercel destinations contain state that requires read-only provenance and rollback review.",
            "recommendation": "Approve a history-reconciliation and in-place Vercel migration approach during the Grommet before publication work.",
        },
        {
            "id": "GS-CONTRACT-001",
            "status": "resolved",
            "summary": "The local generic BuildRunner accepts hash-bound proposed sources while requiring every connected requirement and task to remain explicitly blocked.",
            "recommendation": "Keep D11 proposal-only until a separate digest-bound operator approval grants implementation authority.",
        },
    ]
    for finding in graph.get("findings", []):
        if finding.get("status") in OPEN_FINDING_STATUSES:
            contradictions.append(
                {
                    "id": finding["id"],
                    "status": finding["status"],
                    "summary": finding["summary"],
                    "recommendation": "Adjudicate through document harmonisation and regenerate the candidate digest.",
                }
            )
    return contradictions


def preflight_evidence(root: Path, inventory: dict[str, Any], graph: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "repository": {
            "root": str(root),
            "status": "not retained; inspect the current checkout at execution time",
            "remotes": run_text(["git", "remote", "-v"], root),
            "worktrees": run_text(["git", "worktree", "list", "--porcelain"], root),
            "publication_baseline": "absent",
        },
        "prerequisites": {
            "git": run_text(["git", "--version"], root),
            "python": sys.version.split()[0],
            "node": run_text(["node", "--version"], root),
            "npm": run_text(["npm", "--version"], root),
            "neon_connection_available": "not probed during document generation",
        },
        "globalsetup": {
            "commit": args.globalsetup_commit,
            "release_status": args.globalsetup_release_status,
            "source": "https://github.com/michaelchamboko/globalsetup",
            "upstream_tests": args.globalsetup_test_result,
        },
        "local_runtime": {
            "installation_scope": "this-repository-only",
            "source_snapshot": args.globalsetup_commit,
            "external_source_modified": False,
            "generic_adaptations": [
                "Neon-backed repository snapshot with explicit dry-run and apply commands",
                "hash-bound proposed sources remain explicitly non-executable",
            ],
        },
        "neon-postgres": {
            "schema": args.repository_intelligence_schema,
            "service_basis": args.neon_service_basis,
            "commercial_project": True,
            "eligible": True,
            "decision": "enabled through the repository capability contract",
        },
        "publication_baseline_evidence": {
            "github_main_commit": args.destination_github_head or "unverified",
            "vercel_production_deployment": args.destination_vercel_deployment or "unverified",
            "vercel_production_url": args.destination_vercel_url or "unverified",
        },
        "source_intake": {
            "source_count": inventory["source_count"],
            "heading_count": inventory["heading_count"],
            "manifest_sha256": inventory["manifest_sha256"],
            "claim_count": len(graph.get("claims", [])),
            "directive_count": len(graph.get("directives", [])),
        },
    }


def markdown_documents(
    manifest: dict[str, Any],
    requirements: dict[str, Any],
    tasks: list[dict[str, Any]],
    contradictions: list[dict[str, Any]],
    digest: str,
    evidence: dict[str, Any],
) -> dict[str, str]:
    source_rows = "\n".join(
        f"| {source['id']} | {source['classification']} | {source['authority']} | `{source['path']}` | {len(source['sections'])} |"
        for source in manifest["sources"]
    )
    contradiction_rows = "\n".join(
        f"| {item['id']} | {item['status']} | {item['summary']} | {item['recommendation']} |" for item in contradictions
    )
    task_rows = "\n".join(
        f"| {task['id']} | {task['title']} | {', '.join(task['dependencies']) or 'none'} | {task['risk']} | {len(task['requirement_ids'])} | {task['status']} |"
        for task in tasks
    )
    build_pack_paths = [
        "00-source-to-build-review.md",
        "04-existing-codebase-discovery.md",
        "05-architecture-map.md",
        "10-implementation-plan.md",
        "11-task-graph.md",
        "12-test-plan.md",
        "13-review-gate.md",
        "14-rollback-plan.md",
        "16-definition-of-done.md",
        "PREFLIGHT_AND_MUTATION_PLAN.md",
        "capabilities.json",
        "execution-state.json",
        "grommet-approval.json",
        "preflight-evidence.json",
        "requirements.json",
        "source-manifest.json",
        *(f"tasks/{task['id']}.md" for task in tasks),
    ]
    build_pack_file_rows = "\n".join(f"- `build-pack/{relative}`" for relative in sorted(build_pack_paths))
    docs: dict[str, str] = {}
    docs["PREFLIGHT_AND_MUTATION_PLAN.md"] = f"""# GlobalSetup V2 Preflight And Mutation Plan

## Outcome

The generic GlobalSetup runtime is installed only in this repository. Product meaning remains in repository-local sources and contracts. Neon repository intelligence is disabled; feature work, migration, publication, and deployment remain blocked pending the unresolved Grommet rows.

## Evidence

- Repository publication baseline: `{evidence['repository']['publication_baseline']}`.
- Source inventory: {evidence['source_intake']['source_count']} sources and {evidence['source_intake']['heading_count']} headings; digest `{evidence['source_intake']['manifest_sha256']}`.
- GlobalSetup candidate: `{evidence['globalsetup']['commit']}`; release status `{evidence['globalsetup']['release_status']}`; upstream tests `{evidence['globalsetup']['upstream_tests']}`.
- Neon repository intelligence: schema `{evidence['neon-postgres']['schema']}`, service basis `{evidence['neon-postgres']['service_basis']}`, eligible=`true`.
- GitHub rollback baseline: `{evidence['publication_baseline_evidence']['github_main_commit']}`.
- Vercel rollback baseline: `{evidence['publication_baseline_evidence']['vercel_production_deployment']}` at `{evidence['publication_baseline_evidence']['vercel_production_url']}`.

## Generic local runtime installed from the pinned source snapshot

- `.agents/` rules, skills, templates, reviewers, and safeguards
- `.githooks/pre-commit`
- Generic BuildRunner, validation, repository-guard, and wrapper scripts under `scripts/`
- GlobalSetup contract schemas under `build-pack/`

## Files created on first run and deterministically replaced on rerun

- `scripts/generate-globalsetup-intake.py`
- `tests/test_globalsetup_intake.py`
{build_pack_file_rows}

## Files preserved

- `AGENTS.md`, all strategy documents under `docs/`, all existing document-intelligence scripts and artifacts, production database state, and every external checkout.
- No database schema or data, dependency, commit, remote, or deployment state is created or changed.

## Rollback

Remove only the locally installed `.agents/`, `.githooks/`, copied generic runtime scripts and schemas, the two intake test/generator files, and the generated `build-pack/` tree. No source document, external checkout, remote history, or production state participates in this installation.
"""
    docs["00-source-to-build-review.md"] = f"""# Mandatory Grommet Source-To-Build Review

Candidate digest: `{digest}`

## What will be built after approval

Nine serial vertical outcomes cover provenance, harmonisation, evidence architecture, the three buyer-decision experiences, research/editorial automation, distribution, design alignment, a separately approved ScrollCraft pilot, and integrated migration/release verification.

## What will not be built under this approval

This candidate does not authorize production code, ScrollCraft adoption, GitHub history changes, Neon repository intelligence execution, Vercel changes, secrets, autonomous publication, or deployment.

## Source classification

| Source | Classification | Runtime authority | Path | Sections |
|---|---|---|---|---:|
{source_rows}

## Contradictions and operator decisions

| ID | Status | Practical impact | Recommendation |
|---|---|---|---|
{contradiction_rows}

## Approval rule

Approval is blocked while any row above remains blocking or open, any requirement loses its exact source mapping, or the candidate digest changes. Approval must name the operator and exact digest in `grommet-approval.json`.
"""
    docs["04-existing-codebase-discovery.md"] = """# Existing Codebase Discovery

This repository currently contains strategy documents and document-intelligence tooling, not an application runtime. It has no commit or remote publication baseline. The existing VettedSaaSBlueprint checkout is expressly excluded as an implementation source and was not inspected or modified during intake.

The reusable local foundation is the 12-source, stable-UID document graph plus a deterministic repository snapshot stored in Neon. Database results remain navigation evidence and never outrank cited source sections.
"""
    docs["05-architecture-map.md"] = """# Candidate Architecture And Dependency Map

`docs/` authoritative evidence flows into `docs/document-intelligence/` stable sections and relationships. The intake generator converts those exact sections into `source-manifest.json` and `requirements.json`; the task plan and those two contracts produce the candidate digest reviewed by the Grommet. Only after approval and resolution of the engine/licence gates may a released BuildRunner control managed worktrees, verification, integration, publication, and recovery.

The public product architecture remains source-defined. No GlobalSetup template or graph output creates product meaning.
"""
    docs["10-implementation-plan.md"] = f"""# Serial Vertical-Slice Implementation Plan

All slices are blocked pending the Grommet and preflight resolutions. Each slice owns an exact requirement set in `execution-state.json`, declares context, measured risk, validation tiers, independent review, and rollback boundaries.

| Slice | Outcome | Dependencies | Risk | Requirements | State |
|---|---|---|---|---:|---|
{task_rows}
"""
    docs["11-task-graph.md"] = f"""# Task Graph

The graph is serial except that design alignment may follow the core experience before joining the final release gate. Exactly one task may become active after approval.

| Task | Outcome | Dependencies | Risk | Requirements | State |
|---|---|---|---|---:|---|
{task_rows}
"""
    docs["12-test-plan.md"] = """# Test Plan

Every task runs focused document-intelligence tests. Medium- and high-risk tasks also run the affected source-intelligence verifier. High-risk tasks additionally run the deterministic GlobalSetup intake check and require a distinct reviewer. Later application tests must be added from each mapped acceptance criterion before product implementation begins; no runtime stack has yet been approved from which to name truthful commands.
"""
    docs["13-review-gate.md"] = """# Review Gate

The Grommet must resolve every open or blocking contradiction, verify every source and requirement mapping, select actual runtime model capacity, approve automation and publication authority separately, and approve the exact candidate digest. High-risk work requires a distinct verifier and immutable evidence receipts. Proposal-only D11 and visual-reference-only UI entries never become implementation authority by inclusion in this pack.
"""
    docs["14-rollback-plan.md"] = """# Rollback Plan

Before implementation, rollback means deleting only the generated candidate pack and its generator/test additions. During later work, each managed task worktree is disposable until verified integration. Migration must retain the prior GitHub commit and live Vercel deployment as rollback references; failed post-deployment health checks must restore the preserved production reference. Force-push, unique-branch deletion, dirty-worktree removal, and silent domain changes are prohibited.
"""
    docs["16-definition-of-done.md"] = """# Definition Of Done

GlobalSetup application is done only when an immutable released V2 engine is pinned, Neon repository intelligence use is lawfully authorized or removed by a reviewed released engine, all source conflicts are adjudicated, the digest is explicitly approved, the released engine validates the pack, every slice is independently verified and integrated, publication is Git-backed through the accepted review path, production health and provenance pass, and rollback evidence is retained. The current candidate intentionally does not satisfy these conditions.
"""
    for task in tasks:
        requirements_list = "\n".join(f"- `{item}`" for item in task["requirement_ids"])
        validations = "\n".join(
            f"- `{check['tier']}`: `{' '.join(check['argv'])}`" for check in task["validation"]
        )
        docs[f"tasks/{task['id']}.md"] = f"""# {task['id']}: {task['title']}

Status: **blocked**  
Risk: **{task['risk']}**  
Dependencies: {', '.join(task['dependencies']) or 'none'}

## Requirement ownership

{requirements_list}

## Validation obligations

{validations}

## Start gate

Resolve the blocker recorded in `execution-state.json`, verify the candidate digest remains approved, then create the managed task worktree through the released BuildRunner. Do not implement in the operator checkout.
"""
    return docs


def render(args: argparse.Namespace) -> dict[str, str]:
    root = Path(args.root).resolve()
    inventory = read_json(root / SOURCE_MANIFEST)
    graph = read_json(root / DOCUMENT_GRAPH)
    if graph.get("source_manifest_sha256") != inventory.get("manifest_sha256"):
        raise ValueError("document graph is stale relative to the source manifest")
    manifest, _, section_index = build_source_manifest(root, inventory)
    requirements, by_source = build_requirements(graph, section_index)
    non_executable_ids = {requirement["id"] for requirement in requirements["requirements"] if is_non_executable_retirement(requirement)}
    executable_by_source = {
        source_id: [requirement_id for requirement_id in requirement_ids if requirement_id not in non_executable_ids]
        for source_id, requirement_ids in by_source.items()
    }
    tasks = build_tasks(root, executable_by_source)
    bind_requirements_to_tasks(requirements, tasks)
    digest = candidate_digest(manifest, requirements, tasks)
    contradictions = build_contradictions(graph, args)
    evidence = getattr(args, "recorded_preflight", None) or preflight_evidence(root, inventory, graph, args)
    capabilities = {
        "schema_version": 2,
        "python": {"required": True, "minimum_version": "3.10", "observed_version": sys.version.split()[0]},
        "workspace": {"integration_branch": "globalsetup/integration", "serial": True},
        "graph": {
            "required": True,
            "provider": "neon-postgres",
            "schema": args.repository_intelligence_schema,
            "status_argv": ["npm", "run", "intelligence:sync"],
            "sync_argv": ["npm", "run", "intelligence:sync:apply"],
            "timeout_seconds": 900,
        },
    }
    state = {
        "schema_version": 2,
        "mode": "high_assurance",
        "capabilities_file": "build-pack/capabilities.json",
        "source_manifest_file": "build-pack/source-manifest.json",
        "requirements_file": "build-pack/requirements.json",
        "grommet_file": "build-pack/grommet-approval.json",
        "automation_authority": {
            "publication": {
                "enabled": False,
                "destinations": [],
                "command_prefixes": [],
            }
        },
        "tasks": tasks,
        "extensions": {
            "execution_blocked": True,
            "globalsetup_commit": args.globalsetup_commit,
            "globalsetup_release_status": args.globalsetup_release_status,
            "preflight_evidence_file": "build-pack/preflight-evidence.json",
        },
    }
    approval = {
        "schema_version": 1,
        "status": "pending",
        "operator": args.operator_name or "",
        "approved_at": "",
        "contradictions": contradictions,
        "candidate_digest": digest,
    }
    rendered = {
        "source-manifest.json": pretty_json(manifest),
        "requirements.json": pretty_json(requirements),
        "capabilities.json": pretty_json(capabilities),
        "execution-state.json": pretty_json(state),
        "grommet-approval.json": pretty_json(approval),
        "preflight-evidence.json": pretty_json(evidence),
    }
    rendered.update(markdown_documents(manifest, requirements, tasks, contradictions, digest, evidence))
    return rendered


def write_or_check(output: Path, rendered: dict[str, str], check: bool) -> None:
    stale: list[str] = []
    for relative, content in rendered.items():
        path = output / relative
        if check:
            if not path.is_file() or path.read_text(encoding="utf-8") != content:
                stale.append(relative)
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
    if stale:
        raise ValueError("; ".join(f"stale generated file: {item}" for item in stale))


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--root", default=".")
    result.add_argument("--output", default="build-pack")
    result.add_argument("--globalsetup-commit", required=False)
    result.add_argument("--globalsetup-release-status", required=False)
    result.add_argument("--globalsetup-test-result", required=False)
    result.add_argument("--repository-intelligence-schema", required=False)
    result.add_argument("--neon-service-basis", required=False)
    result.add_argument("--operator-name", required=False)
    result.add_argument("--destination-github-head", required=False)
    result.add_argument("--destination-vercel-deployment", required=False)
    result.add_argument("--destination-vercel-url", required=False)
    result.add_argument("--check", action="store_true")
    result.add_argument("--check-from-provenance", action="store_true")
    return result


def hydrate_from_provenance(args: argparse.Namespace) -> None:
    if not args.check_from_provenance:
        return
    args.check = True
    path = Path(args.root).resolve() / args.output / "preflight-evidence.json"
    evidence = read_json(path)
    args.recorded_preflight = evidence
    args.globalsetup_commit = evidence["globalsetup"]["commit"]
    args.globalsetup_release_status = evidence["globalsetup"]["release_status"]
    args.globalsetup_test_result = evidence["globalsetup"]["upstream_tests"]
    args.repository_intelligence_schema = evidence["neon-postgres"]["schema"]
    args.neon_service_basis = evidence["neon-postgres"]["service_basis"]
    baseline = evidence.get("publication_baseline_evidence", {})
    args.destination_github_head = baseline.get("github_main_commit")
    args.destination_vercel_deployment = baseline.get("vercel_production_deployment")
    args.destination_vercel_url = baseline.get("vercel_production_url")
    approval_path = Path(args.root).resolve() / args.output / "grommet-approval.json"
    if approval_path.is_file():
        args.operator_name = read_json(approval_path).get("operator") or args.operator_name


def main() -> int:
    args = parser().parse_args()
    try:
        hydrate_from_provenance(args)
        required = (
            "globalsetup_commit",
            "globalsetup_release_status",
            "globalsetup_test_result",
            "repository_intelligence_schema",
            "neon_service_basis",
        )
        missing = [name for name in required if not getattr(args, name)]
        if missing:
            raise ValueError(f"missing provenance arguments: {', '.join(missing)}")
        rendered = render(args)
        write_or_check(Path(args.output).resolve(), rendered, args.check)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(pretty_json({"ok": True, "status": "checked" if args.check else "generated", "files": sorted(rendered)}).rstrip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
