from __future__ import annotations

import json
import hashlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RECONCILER = ROOT / "scripts" / "reconcile-build-pack-source-projections.py"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


class AuthorityAlignmentCloseoutTests(unittest.TestCase):
    def test_execution_state_matches_current_requirements_and_phase_map(self) -> None:
        requirements = read_json(ROOT / "build-pack/requirements.json")
        phase_map = read_json(ROOT / "build-pack/requirements-phase-map.json")
        execution_state = read_json(ROOT / "build-pack/execution-state.json")
        extensions = execution_state["extensions"]
        denominator = len(requirements["requirements"])
        phase_requirements = phase_map["requirements"]
        expected_digest = hashlib.sha256(
            json.dumps(
                phase_requirements,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8")
        ).hexdigest()

        self.assertEqual(denominator, phase_map["denominatorCount"])
        self.assertEqual(denominator, len(phase_requirements))
        self.assertEqual(denominator, extensions["requirement_denominator"])
        self.assertEqual(denominator, extensions["acceptance_denominator"])
        self.assertEqual(expected_digest, extensions["digest"])

    def test_document_intelligence_reproducibility_is_encoding_and_format_independent(self) -> None:
        extractor = (ROOT / "scripts/extract-relationship-candidates.ps1").read_text(
            encoding="utf-8-sig"
        )
        graph_builder = (ROOT / "scripts/build-document-graph.ps1").read_text(
            encoding="utf-8-sig"
        )
        verifier = (ROOT / "scripts/verify-document-intelligence.ps1").read_text(
            encoding="utf-8-sig"
        )

        self.assertGreaterEqual(extractor.count("Get-Content -Raw -Encoding UTF8"), 2)
        self.assertGreaterEqual(graph_builder.count("Get-Content -Raw -Encoding UTF8"), 2)
        self.assertIn("function Get-SemanticJsonSha256", verifier)
        self.assertIn("Get-SemanticJsonSha256 -Path $freshCandidatePath", verifier)
        self.assertIn("Get-SemanticJsonSha256 -Path $freshGraphPath", verifier)
        self.assertNotIn(
            "Get-Sha256File -Path $freshCandidatePath", verifier
        )
        self.assertNotIn("Get-Sha256File -Path $freshGraphPath", verifier)

    def test_every_operational_source_declares_the_cadence_supersession(self) -> None:
        manifest = read_json(ROOT / "docs/document-intelligence/SOURCE_MANIFEST.json")
        operational_sources = {
            source["source_id"]: ROOT / source["path"]
            for source in manifest["sources"]
            if source["source_id"] in {f"D{index:02d}" for index in range(1, 11)}
        }

        self.assertEqual({f"D{index:02d}" for index in range(1, 11)}, set(operational_sources))
        for source_id, path in operational_sources.items():
            with self.subTest(source_id=source_id):
                text = path.read_text(encoding="utf-8-sig")
                self.assertIn("Cadence supersession (owner directive 2026-10-28)", text)

        architecture = operational_sources["D03"].read_text(encoding="utf-8-sig")
        self.assertNotIn("- whether model escalation should occur early.", architecture)
        self.assertNotIn(
            "The exact warning times are an implementation decision.", architecture
        )

        for source_id, path in operational_sources.items():
            lines = path.read_text(encoding="utf-8-sig").splitlines()
            for index, line in enumerate(lines):
                if not any(time in line for time in ("06:00", "20:00", "23:00")):
                    continue
                local_context = " ".join(lines[index : index + 4]).upper()
                with self.subTest(source_id=source_id, line=index + 1):
                    self.assertIn("RETIRED", local_context)

    def test_current_inventory_has_clean_utf8_source_headings(self) -> None:
        manifest = read_json(ROOT / "docs/document-intelligence/SOURCE_MANIFEST.json")
        d03 = next(source for source in manifest["sources"] if source["source_id"] == "D03")
        headings = "\n".join(section["heading"] for section in d03["sections"])

        self.assertNotIn(chr(0xC3), d03["title"] + headings)
        self.assertNotIn(chr(0xFFFD), d03["title"] + headings)
        self.assertIn(
            "Vetted SaaS Blueprint — AI-First System Architecture and Automation Blueprint",
            headings,
        )
        self.assertIn("State 1 — Daily scope selected", headings)

    def test_reconciler_updates_source_fields_and_preserves_execution_fields(self) -> None:
        scratch = ROOT / ".scratch"
        scratch.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as temporary:
            build_pack = Path(temporary) / "build-pack"
            build_pack.mkdir()
            for relative in (
                "requirements.json",
                "requirements-phase-map.json",
                "source-manifest.json",
            ):
                shutil.copy2(ROOT / "build-pack" / relative, build_pack / relative)

            before = read_json(build_pack / "requirements.json")
            target = next(
                item
                for item in before["requirements"]
                if item.get("sources")
                and item["sources"][0].get("display_id") == "D02-H006"
            )
            target["status"] = "sentinel-status"
            target["tasks"] = ["SENTINEL-TASK"]
            target["acceptance_ids"] = ["SENTINEL-ACCEPTANCE"]
            (build_pack / "requirements.json").write_text(
                json.dumps(before, indent=2) + "\n", encoding="utf-8", newline="\n"
            )
            phase_before = read_json(build_pack / "requirements-phase-map.json")
            phase_target = next(
                item
                for item in phase_before["requirements"]
                if item["requirementId"] == target["id"]
            )
            phase_target["task"] = "SENTINEL-TASK"
            phase_target["disposition"] = "sentinel-disposition"
            phase_target["acceptanceIds"] = ["SENTINEL-ACCEPTANCE"]
            (build_pack / "requirements-phase-map.json").write_text(
                json.dumps(phase_before, indent=2) + "\n", encoding="utf-8", newline="\n"
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(RECONCILER),
                    "--root",
                    str(ROOT),
                    "--build-pack",
                    str(build_pack),
                    "--write",
                ],
                text=True,
                encoding="utf-8",
                capture_output=True,
            )
            self.assertEqual(0, result.returncode, result.stderr)

            after = read_json(build_pack / "requirements.json")
            reconciled = next(
                item
                for item in after["requirements"]
                if item.get("sources")
                and item["sources"][0].get("display_id") == "D02-H006"
            )
            current_manifest = read_json(ROOT / "docs/document-intelligence/SOURCE_MANIFEST.json")
            current_section = next(
                section
                for source in current_manifest["sources"]
                if source["source_id"] == "D02"
                for section in source["sections"]
                if section["display_id"] == "D02-H006"
            )

            self.assertEqual(f"R-C-{current_section['stable_uid']}", reconciled["id"])
            self.assertEqual(current_section["stable_uid"], reconciled["sources"][0]["section_id"])
            self.assertEqual("sentinel-status", reconciled["status"])
            self.assertEqual(["SENTINEL-TASK"], reconciled["tasks"])
            self.assertEqual(["SENTINEL-ACCEPTANCE"], reconciled["acceptance_ids"])

            retired_watchdog = next(
                item
                for item in after["requirements"]
                if item["id"] == "R-C-D03-S-87056c5d3838"
            )
            self.assertEqual("owner-retired", retired_watchdog["status"])
            self.assertIn("RETIRED by owner directive", retired_watchdog["statement"])
            self.assertNotIn("At **23:00 Africa/Johannesburg time**", retired_watchdog["statement"])

            retired_warning = next(
                item
                for item in after["requirements"]
                if item["id"] == "R-C-D03-S-4cb790f028a7"
            )
            self.assertEqual("owner-retired", retired_warning["status"])
            self.assertIn("RETIRED by owner directive", retired_warning["statement"])

            phase_map = read_json(build_pack / "requirements-phase-map.json")
            mapped = next(
                item
                for item in phase_map["requirements"]
                if item["requirementId"] == reconciled["id"]
            )
            self.assertEqual("sentinel-disposition", mapped["disposition"])
            self.assertEqual("SENTINEL-TASK", mapped["task"])
            self.assertEqual(["SENTINEL-ACCEPTANCE"], mapped["acceptanceIds"])
            retired_warning_map = next(
                item
                for item in phase_map["requirements"]
                if item["requirementId"] == "R-C-D03-S-4cb790f028a7"
            )
            self.assertEqual("owner-retired", retired_warning_map["disposition"])

            check = subprocess.run(
                [
                    sys.executable,
                    str(RECONCILER),
                    "--root",
                    str(ROOT),
                    "--build-pack",
                    str(build_pack),
                    "--check",
                ],
                text=True,
                encoding="utf-8",
                capture_output=True,
            )
            self.assertEqual(0, check.returncode, check.stderr)


if __name__ == "__main__":
    unittest.main()
