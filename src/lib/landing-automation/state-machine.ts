export type LandingAutomationState =
  | "queued"
  | "researching"
  | "drafting"
  | "previewing"
  | "quality_review"
  | "release_pr"
  | "published"
  | "blocked"
  | "failed"
  | "cancelled";

export type AutomationEvent =
  | { kind: "start" }
  | { kind: "research_complete" }
  | { kind: "draft_complete" }
  | { kind: "preview_complete" }
  | { kind: "quality_passed" }
  | { kind: "release_pr_opened" }
  | { kind: "release_merged" }
  | { kind: "gate_failed" }
  | { kind: "transient_failure" }
  | { kind: "terminal_failure" }
  | { kind: "cancel" };

const transitionTable: Record<LandingAutomationState, Partial<Record<LandingAutomationState, true>>> = {
  queued: { researching: true, cancelled: true },
  researching: { drafting: true, queued: true, blocked: true, failed: true, cancelled: true },
  drafting: { previewing: true, queued: true, blocked: true, failed: true, cancelled: true },
  previewing: { quality_review: true, queued: true, blocked: true, failed: true, cancelled: true },
  quality_review: { release_pr: true, queued: true, blocked: true, failed: true, cancelled: true },
  release_pr: { published: true, queued: true, blocked: true, failed: true, cancelled: true },
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
    research_complete: "drafting",
    draft_complete: "previewing",
    preview_complete: "quality_review",
    quality_passed: "release_pr",
    release_pr_opened: "release_pr",
    release_merged: "published",
  };
  const next = mapped[event.kind];

  if (!next || !canTransitionAutomationRun(current, next)) {
    throw new Error(`Invalid automation transition: ${current} --${event.kind}--> ${next ?? "unknown"}.`);
  }

  return next;
}
