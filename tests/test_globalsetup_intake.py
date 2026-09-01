from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "scripts" / "generate-globalsetup-intake.py"


class GlobalSetupIntakeTests(unittest.TestCase):
    def run_generator(self, output: Path, *extra: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(GENERATOR),
                "--root",
                str(ROOT),
                "--output",
                str(output),
                "--globalsetup-commit",
                "7bc03227e78a838c19f8a28d082b1d46e7e2f288",
                "--globalsetup-release-status",
                "unreleased-main",
                "--globalsetup-test-result",
                "46 passed in 195.444s",
                "--gitnexus-version",
                "1.6.10",
                "--gitnexus-license",
                "PolyForm-Noncommercial-1.0.0",
                "--operator-name",
                "mike jones",
                "--destination-github-head",
                "956e3a830ea7c11ae4867635ff2edf8c5865c856",
                "--destination-vercel-deployment",
                "dpl_E6HTSnuzu8BK4qCnjJZoZ8xPQH3Q",
                "--destination-vercel-url",
                "https://vetted-saa-s-blueprint-fszaa5ej7-michaelchamboko-gravityclaw.vercel.app",
                *extra,
            ],
            text=True,
            encoding="utf-8",
            capture_output=True,
        )

    def test_maps_every_claim_and_directive_without_approving_proposals(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "build-pack"
            result = self.run_generator(output)
            self.assertEqual(0, result.returncode, result.stderr)

            graph = json.loads(
                (ROOT / "docs" / "document-intelligence" / "DOCUMENT_GRAPH.json").read_text(encoding="utf-8-sig")
            )
            requirements = json.loads((output / "requirements.json").read_text(encoding="utf-8"))
            actual_ids = {item["id"] for item in requirements["requirements"]}
            expected_ids = {f"R-{item['id']}" for item in graph["claims"]}
            expected_ids.update(f"R-{item['id']}" for item in graph["directives"])
            self.assertEqual(expected_ids, actual_ids)

            manifest = json.loads((output / "source-manifest.json").read_text(encoding="utf-8"))
            sources = {item["id"]: item for item in manifest["sources"]}
            self.assertEqual(("supporting", "approved"), (sources["UI"]["classification"], sources["UI"]["authority"]))
            self.assertEqual(("authoritative", "approved"), (sources["D05"]["classification"], sources["D05"]["authority"]))
            self.assertEqual(("proposed", "proposed"), (sources["D11"]["classification"], sources["D11"]["authority"]))

            capabilities = json.loads((output / "capabilities.json").read_text(encoding="utf-8"))
            self.assertEqual("disabled", capabilities["graph"]["provider"])
            self.assertFalse(capabilities["graph"]["required"])
            self.assertNotIn("status_argv", capabilities["graph"])
            self.assertNotIn("sync_argv", capabilities["graph"])

            state = json.loads((output / "execution-state.json").read_text(encoding="utf-8"))
            self.assertEqual(9, len(state["tasks"]))
            self.assertEqual({"blocked"}, {task["status"] for task in state["tasks"]})
            tasks = {task["id"]: task for task in state["tasks"]}
            self.assertEqual("high", tasks["SLC-002"]["risk"])
            self.assertEqual("high", tasks["SLC-008"]["risk"])
            self.assertEqual("high", tasks["SLC-009"]["risk"])
            mapped_ids = {requirement_id for task in state["tasks"] for requirement_id in task["requirement_ids"]}
            self.assertEqual(actual_ids, mapped_ids)
            affected_checks = [
                check
                for task in state["tasks"]
                for check in task["validation"]
                if check["name"] == "affected source-intelligence verification"
            ]
            self.assertTrue(affected_checks)
            self.assertTrue(all("-SkipGitNexus" in check["argv"] for check in affected_checks))

            preflight = json.loads((output / "preflight-evidence.json").read_text(encoding="utf-8"))
            self.assertEqual("46 passed in 195.444s", preflight["globalsetup"]["upstream_tests"])
            self.assertEqual("not queried; provider disabled", preflight["prerequisites"]["gitnexus_installed"])
            self.assertEqual("this-repository-only", preflight["local_runtime"]["installation_scope"])
            self.assertFalse(preflight["local_runtime"]["external_source_modified"])

            approval = json.loads((output / "grommet-approval.json").read_text(encoding="utf-8"))
            self.assertEqual("pending", approval["status"])
            self.assertEqual("mike jones", approval["operator"])
            self.assertRegex(approval["candidate_digest"], r"^[0-9a-f]{64}$")

            for relative in (
                "PREFLIGHT_AND_MUTATION_PLAN.md",
                "00-source-to-build-review.md",
                "04-existing-codebase-discovery.md",
                "05-architecture-map.md",
                "10-implementation-plan.md",
                "11-task-graph.md",
                "12-test-plan.md",
                "13-review-gate.md",
                "14-rollback-plan.md",
                "16-definition-of-done.md",
            ):
                self.assertTrue((output / relative).is_file(), relative)
            mutation_plan = (output / "PREFLIGHT_AND_MUTATION_PLAN.md").read_text(encoding="utf-8")
            self.assertIn("build-pack/preflight-evidence.json", mutation_plan)
            self.assertIn("build-pack/tasks/SLC-009.md", mutation_plan)
            self.assertIn("created on first run and deterministically replaced on rerun", mutation_plan)

    def test_check_mode_detects_a_stale_generated_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "build-pack"
            generated = self.run_generator(output)
            self.assertEqual(0, generated.returncode, generated.stderr)
            (output / "requirements.json").write_text("{}\n", encoding="utf-8")

            checked = self.run_generator(output, "--check")
            self.assertNotEqual(0, checked.returncode)
            self.assertIn("stale generated file: requirements.json", checked.stderr)

    def test_check_from_provenance_keeps_the_recorded_preflight_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "build-pack"
            generated = self.run_generator(output)
            self.assertEqual(0, generated.returncode, generated.stderr)
            evidence_path = output / "preflight-evidence.json"
            evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
            evidence["repository"]["status"] = "recorded status snapshot"
            evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")

            checked = self.run_generator(output, "--check-from-provenance")
            self.assertEqual(0, checked.returncode, checked.stderr)


if __name__ == "__main__":
    unittest.main()
