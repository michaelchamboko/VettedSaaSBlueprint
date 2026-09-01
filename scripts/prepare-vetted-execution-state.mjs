import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const writeJson = async (path, value) => {
  await writeFile(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
};

const taskDefinitions = [
  ["RCV-001", "Protocol authority and traceability recovery", [], "medium", [1, 1, 1, 0, 0]],
  ["RCV-002", "Verified application baseline reconstruction", ["RCV-001"], "medium", [1, 1, 1, 0, 0]],
  ["RCV-003", "Repository layout and runtime repair", ["RCV-002"], "medium", [1, 1, 1, 0, 0]],
  ["RCV-004", "Reproducible toolchain and release gate", ["RCV-003"], "high", [1, 1, 2, 0, 2]],
  ["P1-001", "Source-bound connected decision journey", ["RCV-004"], "medium", [1, 1, 1, 0, 0]],
  ["P1-002", "Phase One direct production deployment", ["P1-001"], "high", [1, 1, 2, 0, 2]],
  ["AUT-001", "Durable automation control plane", ["P1-002"], "high", [2, 1, 2, 1, 1]],
  ["AUT-002", "Daily research and evidence refresh", ["AUT-001"], "high", [1, 1, 2, 1, 1]],
  ["AUT-003", "Editorial brief and optimisation workflow", ["AUT-002"], "high", [1, 1, 2, 1, 1]],
  ["AUT-004", "Publishing watchdog and in-app operations", ["AUT-003"], "high", [2, 1, 2, 1, 1]],
  ["AUT-005", "Git-backed low-risk iterative release", ["AUT-004"], "high", [2, 1, 2, 1, 2]],
  ["ACT-001", "Production automation activation and soak", ["AUT-005"], "high", [1, 1, 2, 1, 2]],
  ["FUT-001", "Motion authority adjudication", ["RCV-001"], "medium", [1, 1, 1, 0, 0]],
];

const taskForRequirement = (requirement) => {
  const sources = new Set(requirement.sources.map((source) => source.source_id));
  const headings = requirement.sources.map((source) => source.heading ?? "").join(" ").toLowerCase();
  if (sources.has("D11")) return "FUT-001";
  if (/watchdog|hard takeover|retry|idempotency|deployment failure|recovery/.test(headings)) return "AUT-004";
  if (/release|deployment|vercel|production publish/.test(headings)) return "AUT-005";
  if (/qa|testing|acceptance|verification/.test(headings) && sources.has("D10")) return "ACT-001";
  if (/repository provenance|application baseline|migration context/.test(headings)) return "RCV-002";
  if (/repository layout|runtime contract|toolchain|node|npm/.test(headings)) return "RCV-003";
  if (/build|public launch|production gate/.test(headings) && sources.has("D06")) return "RCV-004";
  if (requirement.id.startsWith("R-UD-")) return "RCV-001";
  if (sources.has("D10")) return "P1-002";
  if (sources.has("D08")) return "AUT-002";
  if (sources.has("D07") || sources.has("D09")) return "AUT-003";
  if (sources.has("D03")) return "AUT-001";
  if (sources.has("D06")) return "RCV-001";
  if (sources.has("D01")) return "AUT-002";
  return "P1-001";
};

const command = (name, tier, argv) => ({ name, tier, kind: "command", location: "local", argv, timeout_seconds: 900 });

const validationFor = (id, risk) => {
  const task = [command("task checks", "task", ["npm", "run", "lint"]), command("affected checks", "affected", ["npm", "run", "typecheck"])];
  if (risk === "high") task.push(command("full checks", "full", ["npm", "test"]));
  if (id === "P1-002") task.push({ name: "production receipt", tier: "full", kind: "receipt", location: "vercel-production" });
  return task;
};

const main = async () => {
  const requirements = await readJson("build-pack/requirements.json");
  const phaseMap = await readJson("build-pack/requirements-phase-map.json");
  const byId = new Map(requirements.requirements.map((requirement) => [requirement.id, requirement]));
  const assignments = new Map();

  for (const requirement of requirements.requirements) {
    const task = taskForRequirement(requirement);
    assignments.set(requirement.id, task);
    requirement.tasks = [task];
    requirement.acceptance_ids = [`AC-${requirement.id.replace(/^R-/, "")}`];
    if (requirement.sources.some((source) => source.source_id === "D11")) {
      requirement.status = "separate-authority-required";
    }
  }

  for (const recoveryTask of ["RCV-002", "RCV-003", "RCV-004"]) {
    if ([...assignments.values()].includes(recoveryTask)) continue;
    const candidate = requirements.requirements.find((requirement) =>
      assignments.get(requirement.id) === "RCV-001" && !requirement.id.startsWith("R-UD-")
    );
    if (!candidate) throw new Error(`No standards requirement available for ${recoveryTask}`);
    assignments.set(candidate.id, recoveryTask);
    candidate.tasks = [recoveryTask];
  }

  phaseMap.generatedAt = new Date().toISOString();
  phaseMap.denominatorCount = requirements.requirements.length;
  phaseMap.mappedAtLeast = requirements.requirements.length;
  phaseMap.requirements = requirements.requirements.map((requirement) => ({
    requirementId: requirement.id,
    task: assignments.get(requirement.id),
    acceptanceIds: requirement.acceptance_ids,
    evidenceAcceptance: requirement.acceptance_criteria,
    evidenceSources: requirement.sources,
    verification: requirement.tests,
  }));

  const taskIds = new Set(taskDefinitions.map(([id]) => id));
  if ([...assignments.values()].some((id) => !taskIds.has(id))) throw new Error("Unassigned requirement task");

  const tasks = taskDefinitions.map(([id, title, dependencies, risk, scores]) => {
    const requirementIds = requirements.requirements.filter((requirement) => assignments.get(requirement.id) === id).map((requirement) => requirement.id);
    const task = {
      id,
      title,
      status: id === "RCV-001" ? "ready" : "blocked",
      dependencies,
      risk,
      risk_assessment: {
        blast_radius: scores[0], reversibility: scores[1], authority: scores[2], sensitive_data: scores[3], external_impact: scores[4],
      },
      source_changes: id !== "FUT-001",
      requirement_ids: requirementIds,
      context_files: ["planning.md", "build-pack/requirements.json", "build-pack/source-manifest.json"],
      validation: validationFor(id, risk),
      evidence: [],
      evidence_refs: [],
      model_route: { worker: risk === "high" ? "standard" : "spark-ready-after-gate", verifier: "standard", escalation: risk === "high" ? "operator" : "none" },
      context_packet: { window_tokens: 32000, initial_tokens: 12000, retrieval: "targeted" },
      operation_phase: "prepared",
    };
    if (id === "FUT-001") task.blocker = { reason: "D11 remains proposed implementation authority and requires a separate product-owner adjudication." };
    return task;
  });

  const state = {
    schema_version: 2,
    mode: "high_assurance",
    capabilities_file: "build-pack/capabilities.json",
    source_manifest_file: "build-pack/source-manifest.json",
    requirements_file: "build-pack/requirements.json",
    automation_authority: { publication: { enabled: false, destinations: ["vercel:vetted-saa-s-blueprint"], command_prefixes: [] } },
    tasks,
    extensions: {
      lifecycle: "EVIDENCE_RECOVERY_REQUIRED",
      planning_authority: "planning.md",
      requirement_denominator: requirements.requirements.length,
      acceptance_denominator: requirements.requirements.length,
      baseline_commit: "956e3a830ea7c11ae4867635ff2edf8c5865c856",
      digest: createHash("sha256").update(JSON.stringify(phaseMap.requirements)).digest("hex"),
    },
  };

  const capabilities = {
    schema_version: 2,
    python: { required: true, minimum_version: "3.10", observed_version: "3.11.15" },
    workspace: { integration_branch: "codex/vetted-saas-integration", serial: true },
    graph: { required: false, provider: "disabled", reason: "GitNexus is not commercially authorized; deterministic source and import checks are the required fallback." },
  };

  await writeJson("build-pack/requirements.json", requirements);
  await writeJson("build-pack/requirements-phase-map.json", phaseMap);
  await writeJson("build-pack/execution-state.json", state);
  await writeJson("build-pack/capabilities.json", capabilities);
  console.log(JSON.stringify({ requirements: requirements.requirements.length, tasks: tasks.map((task) => [task.id, task.requirement_ids.length]) }));
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
