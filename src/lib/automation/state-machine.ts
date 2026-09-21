export type DailyRunState =
  | "scope_selected"
  | "questions_discovered"
  | "source_plan_created"
  | "evidence_retrieved"
  | "evidence_normalised"
  | "calculations_completed"
  | "pages_assembled"
  | "validation_completed"
  | "preview_rendered"
  | "production_deployed"
  | "release_verified"
  | "improvements_scheduled"
  | "rescue_active"
  | "blocked"
  | "failed";

export type DailyRunStage =
  | "scope_selection"
  | "research"
  | "authoring"
  | "quality"
  | "preview"
  | "release"
  | "production_verification"
  | "complete"
  | "rescue";

export type WorkflowEvent =
  | { kind: "start_research" }
  | { kind: "questions_discovered" }
  | { kind: "source_plan_created" }
  | { kind: "evidence_retrieved" }
  | { kind: "evidence_normalised" }
  | { kind: "calculations_completed" }
  | { kind: "pages_assembled" }
  | { kind: "validation_passed" }
  | { kind: "validation_failed" }
  | { kind: "preview_verified" }
  | { kind: "deploy_production" }
  | { kind: "production_verified" }
  | { kind: "release_verified" }
  | { kind: "improvements_scheduled" }
  | { kind: "trigger_rescue" }
  | { kind: "rescue_completed" }
  | { kind: "block" }
  | { kind: "fail" }
  | { kind: "retry" };

const transitionTable: Record<DailyRunState, Partial<Record<DailyRunState, true>>> = {
  scope_selected: { questions_discovered: true, blocked: true, failed: true },
  questions_discovered: { source_plan_created: true, blocked: true, failed: true },
  source_plan_created: { evidence_retrieved: true, blocked: true, failed: true },
  evidence_retrieved: { evidence_normalised: true, blocked: true, failed: true },
  evidence_normalised: { calculations_completed: true, blocked: true, failed: true },
  calculations_completed: { pages_assembled: true, blocked: true, failed: true },
  pages_assembled: { validation_completed: true, blocked: true, failed: true },
  validation_completed: { preview_rendered: true, blocked: true, failed: true },
  preview_rendered: { production_deployed: true, blocked: true, failed: true },
  production_deployed: { release_verified: true, blocked: true, failed: true },
  release_verified: { improvements_scheduled: true, blocked: true, failed: true },
  improvements_scheduled: {},
  rescue_active: { production_deployed: true, release_verified: true, blocked: true, failed: true },
  blocked: { scope_selected: true, questions_discovered: true, source_plan_created: true, evidence_retrieved: true, evidence_normalised: true, calculations_completed: true, pages_assembled: true, validation_completed: true, preview_rendered: true, production_deployed: true, failed: true },
  failed: { scope_selected: true },
};

export function canTransitionDailyRun(
  from: DailyRunState,
  to: DailyRunState,
): boolean {
  return transitionTable[from][to] === true;
}

export function nextDailyRunState(
  current: DailyRunState,
  event: WorkflowEvent,
): DailyRunState {
  const mapped: Partial<Record<WorkflowEvent["kind"], DailyRunState>> = {
    start_research: "questions_discovered",
    questions_discovered: "source_plan_created",
    source_plan_created: "evidence_retrieved",
    evidence_retrieved: "evidence_normalised",
    evidence_normalised: "calculations_completed",
    calculations_completed: "pages_assembled",
    pages_assembled: "validation_completed",
    validation_passed: "preview_rendered",
    validation_failed: "pages_assembled",
    preview_verified: "production_deployed",
    deploy_production: "production_deployed",
    production_verified: "release_verified",
    release_verified: "improvements_scheduled",
    improvements_scheduled: "improvements_scheduled",
    trigger_rescue: "rescue_active",
    rescue_completed: "release_verified",
    block: "blocked",
    fail: "failed",
    retry: "scope_selected",
  };

  const next = mapped[event.kind];

  if (!next) {
    throw new Error(`Unknown workflow event: ${event.kind}`);
  }

  if (!canTransitionDailyRun(current, next)) {
    throw new Error(`Invalid daily run transition: ${current} --${event.kind}--> ${next}`);
  }

  return next;
}

export function getStageForState(state: DailyRunState): DailyRunStage {
  const stageMap: Record<DailyRunState, DailyRunStage> = {
    scope_selected: "scope_selection",
    questions_discovered: "research",
    source_plan_created: "research",
    evidence_retrieved: "research",
    evidence_normalised: "research",
    calculations_completed: "authoring",
    pages_assembled: "authoring",
    validation_completed: "quality",
    preview_rendered: "preview",
    production_deployed: "release",
    release_verified: "production_verification",
    improvements_scheduled: "complete",
    rescue_active: "rescue",
    blocked: "research",
    failed: "research",
  };
  return stageMap[state] ?? "research";
}

export function isTerminalState(state: DailyRunState): boolean {
  return ["improvements_scheduled", "failed"].includes(state);
}

export function isRescueState(state: DailyRunState): boolean {
  return state === "rescue_active";
}

export function getValidNextStates(state: DailyRunState): DailyRunState[] {
  return Object.keys(transitionTable[state] ?? {}) as DailyRunState[];
}

export function describeState(state: DailyRunState): string {
  const descriptions: Record<DailyRunState, string> = {
    scope_selected: "Daily scope selected - customer problem and 3-page set defined",
    questions_discovered: "Real customer questions and pain points discovered",
    source_plan_created: "Source plan created with approved evidence sources",
    evidence_retrieved: "Evidence retrieved from approved sources",
    evidence_normalised: "Evidence normalized into common schema",
    calculations_completed: "Evidence confidence, product scores, fit scores calculated",
    pages_assembled: "Three structured page records assembled from evidence",
    validation_completed: "Content and claim validation completed",
    preview_rendered: "Preview rendered and tested",
    production_deployed: "Production deployment completed",
    release_verified: "Release verified and recorded",
    improvements_scheduled: "Improvement tasks scheduled for next cycle",
    rescue_active: "Premium rescue active - 23:00 SAST takeover",
    blocked: "Workflow blocked - awaiting resolution",
    failed: "Workflow failed - requires manual intervention",
  };
  return descriptions[state] ?? "Unknown state";
}