from __future__ import annotations

import argparse
import importlib.util
import json
from copy import deepcopy
from pathlib import Path
from typing import Any


PRESERVED_REQUIREMENT_FIELDS = (
    "status",
    "tasks",
    "acceptance_ids",
    "owner_authorized_phase_one",
)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def pretty_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def source_key(requirement: dict[str, Any]) -> tuple[tuple[str | None, str | None], ...]:
    return tuple(
        (source.get("source_id"), source.get("display_id"))
        for source in requirement.get("sources", [])
    )


def unique_index(items: list[dict[str, Any]], key_fn, label: str) -> dict[Any, dict[str, Any]]:
    result: dict[Any, dict[str, Any]] = {}
    for item in items:
        key = key_fn(item)
        if key in result:
            raise ValueError(f"duplicate {label}: {key}")
        result[key] = item
    return result


def load_intake_module(root: Path):
    path = root / "scripts" / "generate-globalsetup-intake.py"
    spec = importlib.util.spec_from_file_location("vetted_globalsetup_intake", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"unable to load intake producer: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def reconcile(root: Path, build_pack: Path) -> tuple[dict[str, str], dict[str, Any]]:
    intake = load_intake_module(root)
    inventory = intake.read_json(root / intake.SOURCE_MANIFEST)
    graph = intake.read_json(root / intake.DOCUMENT_GRAPH)
    source_manifest, _, section_index = intake.build_source_manifest(root, inventory)
    generated_requirements, _ = intake.build_requirements(graph, section_index)

    current_document = read_json(build_pack / "requirements.json")
    current_requirements = current_document["requirements"]
    generated = generated_requirements["requirements"]
    current_by_id = unique_index(current_requirements, lambda item: item["id"], "requirement id")
    current_by_source = unique_index(
        [item for item in current_requirements if item["id"].startswith("R-C-")],
        source_key,
        "claim requirement source key",
    )
    phase_map = read_json(build_pack / "requirements-phase-map.json")
    phase_by_id = unique_index(
        phase_map["requirements"], lambda item: item["requirementId"], "phase-map requirement id"
    )

    manifest_sections = {
        (source["id"], section["display_id"]): section
        for source in source_manifest["sources"]
        for section in source["sections"]
    }
    consumed_ids: set[str] = set()
    old_for_new: dict[str, dict[str, Any] | None] = {}
    reconciled: list[dict[str, Any]] = []
    migrations: list[dict[str, str]] = []

    for generated_item in generated:
        old = current_by_id.get(generated_item["id"])
        if old is None:
            old = current_by_source.get(source_key(generated_item))
        merged = deepcopy(generated_item)
        if old is not None:
            consumed_ids.add(old["id"])
            old_for_new[merged["id"]] = old
            for field in PRESERVED_REQUIREMENT_FIELDS:
                if field in old:
                    merged[field] = deepcopy(old[field])
            if old["id"] != merged["id"]:
                migrations.append({"from": old["id"], "to": merged["id"]})
        else:
            old_for_new[merged["id"]] = None
        reconciled.append(merged)

    retained_history: list[str] = []
    for old in current_requirements:
        if old["id"] in consumed_ids:
            continue
        key = source_key(old)
        source_still_resolves = bool(key) and all(part in manifest_sections for part in key)
        source_hashes_unchanged = source_still_resolves and all(
            manifest_sections[part]["hash"] == reference.get("hash")
            for part, reference in zip(key, old.get("sources", []), strict=True)
        )
        source_declares_retirement = source_still_resolves and all(
            any(
                marker in section_index[part[1]]["text"]
                for marker in ("RETIRED by owner directive", "RETIRED 2026-10-28")
            )
            for part in key
        )
        if (
            old.get("status") == "owner-retired"
            or source_hashes_unchanged
            or source_declares_retirement
        ):
            retained = deepcopy(old)
            if source_declares_retirement:
                retained["status"] = "owner-retired"
            if source_still_resolves and len(key) == 1:
                current = section_index[key[0][1]]
                section = current["section"]
                retained["statement"] = current["text"]
                retained["planned_outcome"] = (
                    f"Deliver or review {section['heading']} within the "
                    f"{retained['authority_domain']} boundary."
                )
                retained["sources"] = [
                    {
                        "source_id": current["source_id"],
                        "section_id": section["stable_uid"],
                        "display_id": section["display_id"],
                        "heading": section["heading"],
                        "hash": current["normalized_hash"],
                    }
                ]
                existing_acceptance = retained.get("acceptance_criteria", [])
                retained["acceptance_criteria"] = [
                    (
                        f"The outcome cites {current['source']['path']} at "
                        f"{section['display_id']} ({section['stable_uid']})."
                    ),
                    *existing_acceptance[1:],
                ]
            reconciled.append(retained)
            old_for_new[retained["id"]] = old
            retained_history.append(retained["id"])
            continue
        raise ValueError(
            f"unresolved current requirement absent from generated graph: {old['id']} ({key})"
        )

    reconciled.sort(key=lambda item: item["id"])
    requirements_document = {
        **{key: deepcopy(value) for key, value in current_document.items() if key != "requirements"},
        "requirements": reconciled,
    }

    phase_requirements: list[dict[str, Any]] = []
    for requirement in reconciled:
        old = old_for_new[requirement["id"]]
        old_phase = phase_by_id.get(old["id"]) if old is not None else None
        phase_item = deepcopy(old_phase) if old_phase is not None else {}
        phase_item["requirementId"] = requirement["id"]
        phase_item.setdefault("task", (requirement.get("tasks") or [None])[0])
        phase_item.setdefault("disposition", requirement.get("status"))
        phase_item.setdefault("acceptanceIds", deepcopy(requirement.get("acceptance_ids", [])))
        phase_item["evidenceAcceptance"] = deepcopy(requirement.get("acceptance_criteria", []))
        phase_item["evidenceSources"] = deepcopy(requirement.get("sources", []))
        if requirement.get("status") == "owner-retired":
            phase_item["disposition"] = "owner-retired"
        phase_requirements.append(phase_item)

    phase_document = {
        **{key: deepcopy(value) for key, value in phase_map.items() if key != "requirements"},
        "denominatorCount": len(reconciled),
        "mappedAtLeast": sum(1 for item in phase_requirements if item.get("task")),
        "requirements": phase_requirements,
    }
    rendered = {
        "requirements.json": pretty_json(requirements_document),
        "requirements-phase-map.json": pretty_json(phase_document),
        "source-manifest.json": pretty_json(source_manifest),
    }
    report = {
        "requirements": len(reconciled),
        "migrations": migrations,
        "retained_history": retained_history,
    }
    return rendered, report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("--build-pack", default="build-pack")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    build_pack = Path(args.build_pack).resolve()
    rendered, report = reconcile(root, build_pack)
    stale = [
        relative
        for relative, content in rendered.items()
        if not (build_pack / relative).is_file()
        or (build_pack / relative).read_text(encoding="utf-8-sig") != content
    ]
    if args.check:
        if stale:
            raise ValueError("; ".join(f"stale source projection: {path}" for path in stale))
    else:
        for relative, content in rendered.items():
            (build_pack / relative).write_text(content, encoding="utf-8", newline="\n")

    print(json.dumps({**report, "stale": stale}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
