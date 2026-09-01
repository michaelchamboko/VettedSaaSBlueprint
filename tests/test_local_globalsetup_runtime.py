from __future__ import annotations

import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts" / "build-runner.py"
CAPABILITIES_SCHEMA = ROOT / "build-pack" / "capabilities.schema.json"


def load_runner():
    spec = importlib.util.spec_from_file_location("local_globalsetup_runner", RUNNER)
    if spec is None or spec.loader is None:
        raise AssertionError("could not load the local GlobalSetup runner")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class LocalGlobalSetupRuntimeTests(unittest.TestCase):
    def test_generic_runtime_and_schema_are_installed_locally(self) -> None:
        self.assertTrue(RUNNER.is_file(), "the generic GlobalSetup runner must be installed in this repository")
        self.assertTrue(CAPABILITIES_SCHEMA.is_file(), "the generic capabilities schema must be installed locally")

    def test_disabled_graph_provider_never_executes_a_graph_command(self) -> None:
        self.assertTrue(RUNNER.is_file(), "the generic GlobalSetup runner must be installed before it can be tested")
        runner = load_runner()
        capabilities = {
            "graph": {
                "required": False,
                "provider": "disabled",
                "reason": "Commercial use is not eligible for the configured graph provider.",
            }
        }

        runner.validate_v2_graph(capabilities)
        with mock.patch.object(runner, "run_argv") as run_argv:
            self.assertIsNone(runner.graph_status(ROOT, capabilities))
            self.assertIsNone(runner.graph_sync(ROOT, capabilities))
        run_argv.assert_not_called()

    def test_disabled_graph_provider_rejects_executable_commands(self) -> None:
        self.assertTrue(RUNNER.is_file(), "the generic GlobalSetup runner must be installed before it can be tested")
        runner = load_runner()
        capabilities = {
            "graph": {
                "required": False,
                "provider": "disabled",
                "reason": "Commercial use is not eligible for the configured graph provider.",
                "sync_argv": ["gitnexus", "analyze"],
            }
        }

        with self.assertRaisesRegex(runner.ContractError, "must not declare executable commands"):
            runner.validate_v2_graph(capabilities)

    def test_proposed_sources_remain_hash_bound_but_non_executable(self) -> None:
        self.assertTrue(RUNNER.is_file(), "the generic GlobalSetup runner must be installed before it can be tested")
        runner = load_runner()
        source_authorities = {("D11", "D11-S-001"): "proposed"}
        requirement = {
            "id": "R-D11-001",
            "status": "separate-authority-required",
            "sources": [{"source_id": "D11", "section_id": "D11-S-001"}],
        }

        self.assertTrue(runner.validate_v2_requirement_sources(requirement, source_authorities))
        requirement["status"] = "candidate"
        with self.assertRaisesRegex(runner.ContractError, "must require separate authority"):
            runner.validate_v2_requirement_sources(requirement, source_authorities)

    def test_task_with_proposed_requirements_must_remain_explicitly_blocked(self) -> None:
        self.assertTrue(RUNNER.is_file(), "the generic GlobalSetup runner must be installed before it can be tested")
        runner = load_runner()
        task = {
            "id": "SLC-PROPOSED",
            "status": "blocked",
            "requirement_ids": ["R-D11-001"],
            "blocker": {"reason": "Separate operator authority is required."},
        }

        runner.validate_v2_task_authority(task, {"R-D11-001"})
        task.pop("blocker")
        with self.assertRaisesRegex(runner.ContractError, "must remain explicitly blocked"):
            runner.validate_v2_task_authority(task, {"R-D11-001"})

    def test_capabilities_schema_is_reusable_for_enabled_or_disabled_graphs(self) -> None:
        self.assertTrue(CAPABILITIES_SCHEMA.is_file(), "the generic capabilities schema must be installed locally")
        schema = json.loads(CAPABILITIES_SCHEMA.read_text(encoding="utf-8"))
        graph_schema = schema["properties"]["graph"]
        providers = {
            variant["properties"]["provider"]["const"]
            for variant in graph_schema["oneOf"]
        }
        self.assertEqual({"disabled", "gitnexus"}, providers)

    def test_v2_build_pack_validator_reaches_the_grommet_gate(self) -> None:
        result = subprocess.run(
            [
                "pwsh",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(ROOT / "scripts" / "validate-build-pack.ps1"),
            ],
            cwd=ROOT,
            text=True,
            encoding="utf-8",
            capture_output=True,
        )
        output = result.stdout + result.stderr
        self.assertNotEqual(0, result.returncode)
        self.assertNotIn("[missing]", output)
        self.assertIn("Grommet approval is required before execution", output)

    def test_shell_validator_has_the_same_v2_pack_contract(self) -> None:
        script = (ROOT / "scripts" / "validate-build-pack.sh").read_text(encoding="utf-8")
        self.assertIn("schema_version", script)
        self.assertIn("00-source-to-build-review.md", script)
        self.assertIn("build-pack/tasks/*.md", script)


if __name__ == "__main__":
    unittest.main()
