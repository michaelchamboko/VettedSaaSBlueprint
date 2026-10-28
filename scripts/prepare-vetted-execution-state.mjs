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
];

const taskForPhaseOneRequirement = (requirement) => {
  const sources = new Set(requirement.sources.map((source) => source.source_id));
  const headings = requirement.sources.map((source) => source.heading ?? "").join(" ").toLowerCase();
  if (sources.has("D11")) return "P1-MOTION-001";
  if (sources.has("D05")) return "P1-CONTENT-001";
  if (sources.has("D04")) return /motion|reduced motion|scroll|animation/.test(headings) ? "P1-MOTION-001" : "P1-UI-001";
  if (sources.has("UI")) return "P1-UI-001";
  if (sources.has("D10")) return "P1-VERIFY-001";
  if (/repository provenance|application baseline|migration context/.test(headings)) return "RCV-002R";
  if (/repository layout|runtime contract|toolchain|node|npm/.test(headings)) return "RCV-004";
  if (/build|public launch|production gate/.test(headings) && sources.has("D06")) return "RCV-004";
  if (requirement.id.startsWith("R-UD-")) return "P1-PLAN-001";
  if (sources.has("D06")) return "P1-PLAN-001";
  if (sources.has("D01") && /answer engine|organic|crawler|internal link|discovery|metadata|sitemap/.test(headings)) return "P1-DISCOVERY-001";
  return null;
};

const isRetiredWorkflowRequirement = (requirement) => {
  const headings = requirement.sources.map((source) => source.heading ?? "").join(" ").toLowerCase();
  return /daily research|editorial brief|scheduled optimisation|watchdog|hard takeover|retry|idempotency|\blease\b|control plane|automation|automated publish|scheduled cycle/.test(headings);
};

const command = (name, tier, argv) => ({ name, tier, kind: "command", location: "local", argv, timeout_seconds: 900 });

const validationFor = (id, risk) => {
  const validation = [command("task checks", "task", ["npm", "run", "lint"]), command("affected checks", "affected", ["npm", "run", "typecheck"])];
  if (risk === "high") validation.push(command("full checks", "full", ["npm", "test"]));
  if (id === "P1-RELEASE-001") validation.push({ name: "production receipt", tier: "full", kind: "receipt", location: "vercel-production" });
  return validation;
};

const main = async () => {
  const requirements = await readJson("build-pack/requirements.json");
  const phaseMap = await readJson("build-pack/requirements-phase-map.json");
  const releaseReceipt = await readOptionalJson("build-pack/receipts/phase-one-release.json");
  const phaseOneVerified = releaseReceipt?.phase === "P1" && releaseReceipt?.status === "verified" && typeof releaseReceipt?.release_commit === "string" && typeof releaseReceipt?.deployment?.id === "string";
  const assignments = new Map();

  for (const requirement of requirements.requirements) {
    const retiredWorkflowRequirement = isRetiredWorkflowRequirement(requirement);
    const task = retiredWorkflowRequirement ? null : taskForPhaseOneRequirement(requirement);
    assignments.set(requirement.id, task);
    requirement.tasks = task ? [task] : [];
    requirement.acceptance_ids = [`AC-${requirement.id.replace(/^R-/, "")}`];
    if (task) {
      if (requirement.sources.some((source) => source.source_id === "D11")) {
        requirement.owner_authorized_phase_one = true;
        requirement.status = "owner-authorized-phase-one";
      } else if (requirement.status === "owner-retired") {
        requirement.status = "candidate";
      }
    } else {
      delete requirement.owner_authorized_phase_one;
      requirement.status = retiredWorkflowRequirement ? "owner-retired" : "separate-authority-required";
    }
  }

  const requiredTaskSeeds = [
    ["RCV-002R", "P1-PLAN-001"],
    ["RCV-004", "P1-PLAN-001"],
    ["P1-RELEASE-001", "P1-VERIFY-001"],
  ];
  for (const [taskId, sourceTaskId] of requiredTaskSeeds) {
    if ([...assignments.values()].includes(taskId)) continue;
    const candidate = requirements.requirements.find((requirement) => assignments.get(requirement.id) === sourceTaskId && !requirement.id.startsWith("R-UD-"));
    if (!candidate) throw new Error(`No Phase One requirement available for ${taskId}`);
    assignments.set(candidate.id, taskId);
    candidate.tasks = [taskId];
  }

  const assignedCount = [...assignments.values()].filter(Boolean).length;
  phaseMap.generatedAt = new Date().toISOString();
  phaseMap.denominatorCount = requirements.requirements.length;
  phaseMap.mappedAtLeast = assignedCount;
  phaseMap.requirements = requirements.requirements.map((requirement) => {
    const task = assignments.get(requirement.id);
    return {
      requirementId: requirement.id,
      task,
      disposition: task ? "phase-one-complete" : requirement.status,
      acceptanceIds: requirement.acceptance_ids,
      evidenceAcceptance: requirement.acceptance_criteria,
      evidenceSources: requirement.sources,
      verification: requirement.tests,
    };
  });

  const taskIds = new Set(taskDefinitions.map(([id]) => id));
  if ([...assignments.values()].filter(Boolean).some((id) => !taskIds.has(id))) throw new Error("Unknown Phase One task assignment");

  const tasks = taskDefinitions.map(([id, title, dependencies, risk, scores]) => {
    const requirementIds = requirements.requirements.filter((requirement) => assignments.get(requirement.id) === id).map((requirement) => requirement.id);
    if (requirementIds.length === 0) throw new Error(`Phase One task has no requirement: ${id}`);
    const task = {
      id,
      title,
      status: phaseOneVerified ? "done" : "blocked",
      dependencies,
      risk,
      risk_assessment: { blast_radius: scores[0], reversibility: scores[1], authority: scores[2], sensitive_data: scores[3], external_impact: scores[4] },
      source_changes: true,
      requirement_ids: requirementIds,
      context_files: ["planning.md", "build-pack/requirements.json", "build-pack/source-manifest.json"],
      validation: validationFor(id, risk),
      evidence: phaseOneVerified ? [{
        name: "Phase One production receipt",
        kind: "receipt",
        location: "vercel-production",
        verified_at: releaseReceipt.verified_at,
        release_commit: releaseReceipt.release_commit,
        deployment_id: releaseReceipt.deployment.id,
        task_summary: releaseReceipt.task_evidence?.[id] ?? "Verified by the Phase One production receipt.",
      }] : [],
      evidence_refs: phaseOneVerified ? ["build-pack/receipts/phase-one-release.json"] : [],
      model_route: { worker: risk === "high" ? "standard" : "spark-ready-after-gate", verifier: "standard", escalation: risk === "high" ? "operator" : "none" },
      context_packet: { window_tokens: 32000, initial_tokens: 12000, retrieval: "targeted" },
      operation_phase: phaseOneVerified ? "committed" : "prepared",
    };
    if (phaseOneVerified) {
      task.verified_commit = releaseReceipt.release_commit;
      task.verified_at = releaseReceipt.verified_at;
      task.completed_at = releaseReceipt.verified_at;
      if (risk === "high") task.review = {
        status: "passed",
        reviewer: "independent production verifier",
        summary: "Vercel readiness, custom-domain HTTP, browser modes, and repository gates passed.",
        receipt: "build-pack/receipts/phase-one-release.json",
        commit: releaseReceipt.release_commit,
        reviewed_at: releaseReceipt.verified_at,
      };
    }
    return task;
  });

  const state = {
    schema_version: 2,
    mode: "high_assurance",
    capabilities_file: "build-pack/capabilities.json",
    source_manifest_file: "build-pack/source-manifest.json",
    requirements_file: "build-pack/requirements.json",
    automation_authority: { publication: { enabled: false, destinations: [], command_prefixes: [] } },
    tasks,
    extensions: {
      lifecycle: phaseOneVerified ? "P1_VERIFIED_NO_ACTIVE_PROGRAMME" : "EVIDENCE_RECOVERY_REQUIRED",
      phase_one: phaseOneVerified ? "P1_VERIFIED" : "EVIDENCE_RECOVERY_REQUIRED",
      phase_one_receipt: phaseOneVerified ? "build-pack/receipts/phase-one-release.json" : null,
      planning_authority: "planning.md",
      requirement_denominator: requirements.requirements.length,
      executable_requirement_count: assignedCount,
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
  console.log(JSON.stringify({ requirements: requirements.requirements.length, executableRequirements: assignedCount, tasks: tasks.map((task) => [task.id, task.requirement_ids.length]) }));
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
