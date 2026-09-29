import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const writeJson = async (path, value) => {
  await writeFile(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
};
const readOptionalJson = async (path) => {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
};

const phaseOneTaskIds = new Set([
  "P1-PLAN-001",
  "RCV-002R",
  "RCV-004",
  "P1-CONTENT-001",
  "P1-UI-001",
  "P1-MOTION-001",
  "P1-DISCOVERY-001",
  "P1-VERIFY-001",
  "P1-RELEASE-001",
]);

const reopenedP2TaskIds = new Set([
  "P2-RESEARCH-001",
  "P2-EDITORIAL-001",
  "P2-WATCH-001",
  "P2-VERIFY-001",
  "P2-ACT-001",
]);

const taskDefinitions = [
  ["P1-PLAN-001", "Phase One authority and traceability", [], "medium", [1, 1, 1, 0, 0]],
  ["RCV-002R", "Recovered baseline and active-test reconciliation", ["P1-PLAN-001"], "medium", [1, 1, 1, 0, 0]],
  ["RCV-004", "Reproducible toolchain and release gate", ["RCV-002R"], "high", [1, 1, 2, 0, 2]],
  ["P1-CONTENT-001", "Source-bound decision journey catalogue", ["RCV-004"], "medium", [1, 1, 1, 0, 0]],
  ["P1-UI-001", "Server-rendered decision journey pages", ["P1-CONTENT-001"], "medium", [1, 1, 1, 0, 0]],
  ["P1-MOTION-001", "Progressive decision-journey motion", ["P1-UI-001"], "medium", [1, 1, 1, 0, 0]],
  ["P1-DISCOVERY-001", "Decision-guide navigation and sitemap discovery", ["P1-UI-001"], "medium", [1, 1, 1, 0, 0]],
  ["P1-VERIFY-001", "Phase One source, route, and accessibility verification", ["P1-MOTION-001", "P1-DISCOVERY-001"], "high", [1, 1, 2, 0, 1]],
  ["P1-RELEASE-001", "Phase One direct production deployment", ["P1-VERIFY-001"], "high", [1, 1, 2, 0, 2]],
  ["P2-PLAN-001", "Phase Two authority and traceability", ["P1-RELEASE-001"], "medium", [1, 1, 1, 0, 0]],
  ["P2-CLEAN-001", "Remove obsolete remote-worker surface", ["P2-PLAN-001"], "medium", [1, 1, 1, 0, 0]],
  ["P2-RUNNER-001", "Local TypeScript automation runner", ["P2-CLEAN-001"], "high", [2, 1, 2, 1, 1]],
  ["P2-RESEARCH-001", "Reuse-first daily evidence refresh", ["P2-RUNNER-001"], "high", [1, 1, 2, 1, 1]],
  ["P2-EDITORIAL-001", "Editorial brief and bounded work queue", ["P2-RESEARCH-001"], "high", [1, 1, 2, 1, 1]],
  ["P2-OPT-001", "Evidence-backed optimisation proposals", ["P2-EDITORIAL-001"], "high", [1, 1, 2, 1, 1]],
  ["P2-WATCH-001", "Production watchdog and rescue queue", ["P2-OPT-001"], "high", [2, 1, 2, 1, 1]],
  ["P2-RELEASE-001", "Controlled local Git and Vercel release", ["P2-WATCH-001"], "high", [2, 1, 2, 1, 2]],
  ["P2-SCHEDULE-001", "Project-scoped Codex desktop schedules", ["P2-DEPLOY-001"], "high", [1, 1, 2, 1, 2]],
  ["P2-VERIFY-001", "Automation and production verification", ["P2-RELEASE-001"], "high", [1, 1, 2, 1, 2]],
  ["P2-DEPLOY-001", "Direct Phase Two production deployment", ["P2-VERIFY-001"], "high", [1, 1, 2, 0, 2]],
  ["P2-ACT-001", "Manual and scheduled-cycle activation", ["P2-SCHEDULE-001"], "high", [1, 1, 2, 1, 2]],
  ["P3-PLAN-001", "Phase Three authority and traceability", [], "medium", [1, 1, 1, 0, 0]],
  ["P3-CATALOGUE-001", "Versioned decision-set catalogue and permanent routes", ["P2-ACT-001", "P3-PLAN-001"], "high", [2, 1, 2, 0, 1]],
  ["P3-ASSET-001", "Browser-only printable decision report", ["P3-CATALOGUE-001"], "medium", [1, 1, 1, 0, 0]],
  ["P3-DISCOVERY-001", "Decision-set discovery, metadata, and sitemap", ["P3-CATALOGUE-001"], "medium", [1, 1, 1, 0, 1]],
  ["P3-AUTOMATION-001", "Decision-set workflow extension", ["P3-CATALOGUE-001"], "high", [2, 1, 2, 0, 1]],
  ["P3-TRUST-001", "Uncertainty treatment, integrity, and experiment governance", ["P3-ASSET-001", "P3-AUTOMATION-001"], "high", [1, 1, 2, 0, 1]],
  ["P3-VERIFY-001", "Phase Three schema, route, privacy, and browser verification", ["P3-DISCOVERY-001", "P3-TRUST-001"], "high", [1, 1, 2, 0, 1]],
  ["P3-DEPLOY-001", "Direct Phase Three production deployment", ["P3-VERIFY-001"], "high", [1, 1, 2, 0, 2]],
  ["P3-ACT-001", "Manual and scheduled new-set activation", ["P3-DEPLOY-001"], "high", [1, 1, 2, 0, 2]],
  ["P3-EXCLUDED-001", "Owner-excluded external and personal-data requirements", ["P3-PLAN-001"], "medium", [0, 2, 1, 0, 0]],
  ["P4-COMMERCIAL-001", "Deferred commercial infrastructure", ["P3-ACT-001"], "high", [2, 1, 2, 1, 2]],
];

const taskForRequirement = (requirement) => {
  const sources = new Set(requirement.sources.map((source) => source.source_id));
  const headings = requirement.sources.map((source) => source.heading ?? "").join(" ").toLowerCase();
  if (sources.has("D11")) return "P1-MOTION-001";
  if (sources.has("D05")) return "P1-CONTENT-001";
  if (sources.has("D04")) return /motion|reduced motion|scroll|animation/.test(headings) ? "P1-MOTION-001" : "P1-UI-001";
  if (sources.has("UI")) return "P1-UI-001";
  if (sources.has("D10") && /roles and accountability|requirements traceability/.test(headings)) return "P2-VERIFY-001";
  if (sources.has("D10")) return "P1-VERIFY-001";
  if (/licensing|paid access|monetisation|monetization/.test(headings)) return "P4-COMMERCIAL-001";
  if (/decision asset|decision report|scorecard|checklist|implementation plan/.test(headings)) return "P3-ASSET-001";
  if (/email|community|partnership|feed|paid|social distribution|personal.?data|lead magnet/.test(headings)) return "P3-EXCLUDED-001";
  if (/asset integrity|uncertainty|trust|experiment|ethical/.test(headings)) return "P3-TRUST-001";
  if (/answer engine|organic|crawler|internal link|discovery|metadata|sitemap/.test(headings)) return "P3-DISCOVERY-001";
  if (/connected release|feedback loop|compile|decision set|page set/.test(headings)) return "P3-AUTOMATION-001";
  if (/watchdog|hard takeover|deployment failure|recovery/.test(headings)) return "P2-WATCH-001";
  if (/release|deployment|vercel|production publish/.test(headings)) return "P2-RELEASE-001";
  if (/retry|idempotency|lease|observability|control plane/.test(headings)) return "P2-RUNNER-001";
  if (/repository provenance|application baseline|migration context/.test(headings)) return "RCV-002R";
  if (/repository layout|runtime contract|toolchain|node|npm/.test(headings)) return "RCV-004";
  if (/build|public launch|production gate/.test(headings) && sources.has("D06")) return "RCV-004";
  if (requirement.id.startsWith("R-UD-")) return "P1-PLAN-001";
  if (sources.has("D08")) return "P2-RESEARCH-001";
  if (sources.has("D07")) return "P3-AUTOMATION-001";
  if (sources.has("D09")) return "P3-TRUST-001";
  if (sources.has("D03")) return "P2-RUNNER-001";
  if (sources.has("D06")) return "P1-PLAN-001";
  if (sources.has("D01")) return "P3-CATALOGUE-001";
  return "P1-DISCOVERY-001";
};

const command = (name, tier, argv) => ({ name, tier, kind: "command", location: "local", argv, timeout_seconds: 900 });

const validationFor = (id, risk) => {
  const task = [command("task checks", "task", ["npm", "run", "lint"]), command("affected checks", "affected", ["npm", "run", "typecheck"])];
  if (risk === "high") task.push(command("full checks", "full", ["npm", "test"]));
  if (["P1-RELEASE-001", "P2-DEPLOY-001", "P3-DEPLOY-001"].includes(id)) task.push({ name: "production receipt", tier: "full", kind: "receipt", location: "vercel-production" });
  return task;
};

const main = async () => {
  const requirements = await readJson("build-pack/requirements.json");
  const phaseMap = await readJson("build-pack/requirements-phase-map.json");
  const releaseReceipt = await readOptionalJson("build-pack/receipts/phase-one-release.json");
  const phaseOneVerified =
    releaseReceipt?.phase === "P1" &&
    releaseReceipt?.status === "verified" &&
    typeof releaseReceipt?.release_commit === "string" &&
    typeof releaseReceipt?.deployment?.id === "string";
  const assignments = new Map();

  for (const requirement of requirements.requirements) {
    const task = taskForRequirement(requirement);
    assignments.set(requirement.id, task);
    requirement.tasks = [task];
    requirement.acceptance_ids = [`AC-${requirement.id.replace(/^R-/, "")}`];
    if (requirement.sources.some((source) => source.source_id === "D11")) {
      requirement.owner_authorized_phase_one = true;
      requirement.status = "owner-authorized-phase-one";
    }
  }

  const requiredTaskSeeds = [
    ["RCV-002R", "P1-PLAN-001"],
    ["RCV-004", "P1-PLAN-001"],
    ["P1-RELEASE-001", "P1-DISCOVERY-001"],
    ["P2-PLAN-001", "P1-VERIFY-001"],
    ["P2-CLEAN-001", "P1-VERIFY-001"],
    ["P2-EDITORIAL-001", "P2-RESEARCH-001"],
    ["P2-OPT-001", "P2-RESEARCH-001"],
    ["P2-SCHEDULE-001", "P1-VERIFY-001"],
    ["P2-VERIFY-001", "P1-VERIFY-001"],
    ["P2-DEPLOY-001", "P1-VERIFY-001"],
    ["P2-ACT-001", "P1-VERIFY-001"],
    ["P3-PLAN-001", "P1-VERIFY-001"],
    ["P3-CATALOGUE-001", "P1-VERIFY-001"],
    ["P3-ASSET-001", "P1-VERIFY-001"],
    ["P3-DISCOVERY-001", "P1-VERIFY-001"],
    ["P3-AUTOMATION-001", "P1-VERIFY-001"],
    ["P3-TRUST-001", "P1-VERIFY-001"],
    ["P3-VERIFY-001", "P1-VERIFY-001"],
    ["P3-DEPLOY-001", "P1-VERIFY-001"],
    ["P3-ACT-001", "P1-VERIFY-001"],
    ["P3-EXCLUDED-001", "P1-VERIFY-001"],
    ["P4-COMMERCIAL-001", "P1-VERIFY-001"],
  ];
  for (const [taskId, sourceTaskId] of requiredTaskSeeds) {
    if ([...assignments.values()].includes(taskId)) continue;
    const candidate = requirements.requirements.find((requirement) =>
      assignments.get(requirement.id) === sourceTaskId && !requirement.id.startsWith("R-UD-")
    );
    if (!candidate) throw new Error(`No standards requirement available for ${taskId}`);
    assignments.set(candidate.id, taskId);
    candidate.tasks = [taskId];
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
    const completedPhaseOneTask = phaseOneVerified && phaseOneTaskIds.has(id);
    const completedPhaseTwoTask = ["P2-PLAN-001", "P2-CLEAN-001", "P2-RUNNER-001", "P2-RESEARCH-001", "P2-EDITORIAL-001", "P2-OPT-001", "P2-WATCH-001", "P2-RELEASE-001", "P2-SCHEDULE-001", "P2-VERIFY-001", "P2-DEPLOY-001"].includes(id) && !reopenedP2TaskIds.has(id);
    const completedPhaseThreePlanningTask = ["P3-PLAN-001", "P3-EXCLUDED-001"].includes(id);
    const task = {
      id,
      title,
      status: reopenedP2TaskIds.has(id)
        ? id === "P2-RESEARCH-001" || id === "P2-WATCH-001" || id === "P2-VERIFY-001" ? "ready" : "blocked"
        : completedPhaseOneTask || completedPhaseTwoTask || completedPhaseThreePlanningTask
        ? "done"
        : "blocked",
      dependencies,
      risk,
      risk_assessment: {
        blast_radius: scores[0], reversibility: scores[1], authority: scores[2], sensitive_data: scores[3], external_impact: scores[4],
      },
      source_changes: true,
      requirement_ids: requirementIds,
      context_files: ["planning.md", "build-pack/requirements.json", "build-pack/source-manifest.json"],
      validation: validationFor(id, risk),
      evidence: completedPhaseOneTask
        ? [
            {
              name: "Phase One production receipt",
              kind: "receipt",
              location: "vercel-production",
              verified_at: releaseReceipt.verified_at,
              release_commit: releaseReceipt.release_commit,
              deployment_id: releaseReceipt.deployment.id,
              task_summary: releaseReceipt.task_evidence?.[id] ?? "Verified by the Phase One production receipt.",
            },
          ]
        : completedPhaseTwoTask ? [{ name: "Phase Two implementation and deployment receipt", kind: "receipt", location: "planning.md", task_summary: "Recorded in the Phase Two deployment and activation receipt; P2-ACT-001 remains the only active Phase Two acceptance gate." }]
        : completedPhaseThreePlanningTask ? [{ name: "Phase Three authority and exclusion record", kind: "receipt", location: "planning.md", task_summary: "799 requirements and acceptance IDs reconcile across the owner-approved 32-packet model; excluded requirements cannot authorize runtime work." }]
        : [],
      evidence_refs: completedPhaseOneTask ? ["build-pack/receipts/phase-one-release.json"] : completedPhaseTwoTask ? ["planning.md#phase-two-deployment-and-activation-receipt--2026-09-01"] : completedPhaseThreePlanningTask ? ["planning.md#phase-three-repository-local-growth-authority--v30"] : [],
      model_route: { worker: risk === "high" ? "standard" : "spark-ready-after-gate", verifier: "standard", escalation: risk === "high" ? "operator" : "none" },
      context_packet: { window_tokens: 32000, initial_tokens: 12000, retrieval: "targeted" },
      operation_phase: completedPhaseOneTask || completedPhaseTwoTask || completedPhaseThreePlanningTask ? "committed" : "prepared",
    };
    if (id === "P2-ACT-001") {
      task.blocker = {
        reason: "The v2.2 correction excludes earlier cycles; corrected activation requires a fresh release, one manual canary, then three consecutive corrected scheduled cycles.",
        recorded_at: "2026-09-29T00:00:00Z",
      };
    }
    if (completedPhaseOneTask) {
      task.verified_commit = releaseReceipt.release_commit;
      task.verified_at = releaseReceipt.verified_at;
      task.completed_at = releaseReceipt.verified_at;
      if (risk === "high") {
        task.review = {
          status: "passed",
          reviewer: "independent production verifier",
          summary: "Vercel readiness, custom-domain HTTP, browser modes, and repository gates passed.",
          receipt: "build-pack/receipts/phase-one-release.json",
          commit: releaseReceipt.release_commit,
          reviewed_at: releaseReceipt.verified_at,
        };
      }
    } else if (completedPhaseTwoTask) {
      task.completed_at = "2026-09-01T00:00:00Z";
      task.verified_at = "2026-09-01T00:00:00Z";
      task.verified_commit = "6697f4bb635921c7f4cd62fb990958e844f99b5f";
    } else if (completedPhaseThreePlanningTask) {
      task.completed_at = "2026-09-01T00:00:00Z";
      task.verified_at = "2026-09-01T00:00:00Z";
    }
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
      lifecycle: phaseOneVerified ? "IMPLEMENTATION_ACTIVE" : "EVIDENCE_RECOVERY_REQUIRED",
      phase_one: phaseOneVerified ? "P1_VERIFIED" : "EVIDENCE_RECOVERY_REQUIRED",
      phase_one_receipt: phaseOneVerified ? "build-pack/receipts/phase-one-release.json" : null,
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
    graph: {
      required: false,
      provider: "disabled",
      reason: "The Phase One commit was indexed separately in GitNexus index-only mode. BuildRunner graph execution remains disabled until commercial licence eligibility is documented; deterministic source hashes, rg, imports, route inventories, and affected-test checks remain mandatory.",
    },
  };

  await writeJson("build-pack/requirements.json", requirements);
  await writeJson("build-pack/requirements-phase-map.json", phaseMap);
  await writeJson("build-pack/execution-state.json", state);
  await writeJson("build-pack/capabilities.json", capabilities);
  console.log(JSON.stringify({ requirements: requirements.requirements.length, tasks: tasks.map((task) => [task.id, task.requirement_ids.length]) }));
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
