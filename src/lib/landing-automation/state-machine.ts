export type LandingAutomationState =
  | "queued"
  | "researching"
  | "authoring"
  | "previewing"
  | "quality_review"
  | "publication_gate"
  | "release_pr"
  | "deploying"
  | "published"
  | "blocked"
  | "failed"
  | "cancelled";

export type AutomationEvent =
  | { kind: "start" }
  | { kind: "research_completed" }
  | { kind: "authoring_completed" }
  | { kind: "preview_verified" }
  | { kind: "quality_passed" }
  | { kind: "release_pr_opened" }
  | { kind: "release_merged" }
  | { kind: "deployment_verified" }
  | { kind: "gate_failed" }
  | { kind: "transient_failure" }
  | { kind: "terminal_failure" }
  | { kind: "cancel" };

const transitionTable: Record<LandingAutomationState, Partial<Record<LandingAutomationState, true>>> = {
  queued: { researching: true, cancelled: true },
  researching: { authoring: true, blocked: true, failed: true, cancelled: true },
  authoring: { previewing: true, blocked: true, failed: true, cancelled: true },
  previewing: { quality_review: true, blocked: true, failed: true, cancelled: true },
  quality_review: { publication_gate: true, blocked: true, failed: true, cancelled: true },
  publication_gate: { release_pr: true, blocked: true, failed: true, cancelled: true },
  release_pr: { deploying: true, blocked: true, failed: true, cancelled: true },
  deploying: { published: true, blocked: true, failed: true, cancelled: true },
  published: {},
  blocked: { queued: true, cancelled: true },
  failed: { queued: true, cancelled: true },
  cancelled: {},
};

export function canTransitionAutomationRun(
  from: LandingAutomationState,
  to: LandingAutomationState,
): boolean {
  return transitionTable[from][to] === true;
}

export function nextAutomationState(
  current: LandingAutomationState,
  event: AutomationEvent,
): LandingAutomationState {
  if (event.kind === "transient_failure") return "queued";
  if (event.kind === "gate_failed") return "blocked";
  if (event.kind === "terminal_failure") return "failed";
  if (event.kind === "cancel") return "cancelled";

  const mapped: Partial<Record<AutomationEvent["kind"], LandingAutomationState>> = {
    start: "researching",
    research_completed: "authoring",
    authoring_completed: "previewing",
    preview_verified: "quality_review",
    quality_passed: "release_pr",
    release_pr_opened: "release_pr",
    release_merged: "deploying",
    deployment_verified: "published",
  };
  const next = mapped[event.kind];

  if (!next || !canTransitionAutomationRun(current, next)) {
    throw new Error(`Invalid automation transition: ${current} --${event.kind}--> ${next ?? "unknown"}.`);
  }

  return next;
}
