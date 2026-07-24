export type HermesJobStatus = "queued" | "running" | "completed" | "failed";

export function isClaimable(status: HermesJobStatus, lockedAt: Date | null, now = new Date()) {
  return status === "queued" || (status === "running" && lockedAt !== null && now.getTime() - lockedAt.getTime() > 15 * 60 * 1000);
}

export function nextFailureState(retryCount: number) {
  return retryCount >= 3 ? "failed" : "queued";
}

export function canHeartbeat(status: HermesJobStatus) {
  return status === "running";
}

export function completeJobStatus() {
  return "completed" as const;
}
