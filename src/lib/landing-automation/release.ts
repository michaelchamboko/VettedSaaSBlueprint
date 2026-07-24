export type ProductionCheck = {
  ok: boolean;
  summary: string;
  failedLayer?: string;
};

export type ReleaseActionResult = {
  ok: boolean;
  summary: string;
};

export type LandingReleaseAdapter = {
  verifyProduction(): Promise<ProductionCheck>;
  restorePreviousDeployment(): Promise<ReleaseActionResult>;
  repairFailedLayer(input: {
    failedLayer: string;
    attempt: number;
    failureSummary: string;
  }): Promise<ReleaseActionResult>;
  retryRelease(attempt: number): Promise<ReleaseActionResult>;
};

export type LandingReleaseRecoveryResult = {
  status: "LIVE" | "NEEDS_HELP";
  attempts: number;
  evidence: Array<{
    action: string;
    outcome: string;
  }>;
};

export async function verifyOrRecoverLandingRelease(
  adapter: LandingReleaseAdapter,
  maximumRetries = 2,
): Promise<LandingReleaseRecoveryResult> {
  if (!Number.isInteger(maximumRetries) || maximumRetries < 0) {
    throw new Error("Release recovery retries must be a non-negative integer.");
  }

  const evidence: LandingReleaseRecoveryResult["evidence"] = [];
  let verification = await adapter.verifyProduction();
  evidence.push({
    action: "Verify the canonical production deployment.",
    outcome: verification.summary,
  });
  if (verification.ok) {
    return { status: "LIVE", attempts: 0, evidence };
  }

  for (let attempt = 1; attempt <= maximumRetries; attempt += 1) {
    const restoration = await adapter.restorePreviousDeployment();
    evidence.push({
      action: `Restore the previous working deployment before repair ${attempt}.`,
      outcome: restoration.summary,
    });
    if (!restoration.ok) {
      return { status: "NEEDS_HELP", attempts: attempt, evidence };
    }

    const repair = await adapter.repairFailedLayer({
      failedLayer: verification.failedLayer ?? "production verification",
      attempt,
      failureSummary: verification.summary,
    });
    evidence.push({
      action: `Repair ${verification.failedLayer ?? "the failed production layer"} for retry ${attempt}.`,
      outcome: repair.summary,
    });
    if (!repair.ok) {
      if (attempt === maximumRetries) {
        return { status: "NEEDS_HELP", attempts: attempt, evidence };
      }
      verification = {
        ok: false,
        summary: repair.summary,
        failedLayer: verification.failedLayer,
      };
      continue;
    }

    const release = await adapter.retryRelease(attempt);
    evidence.push({
      action: `Retry the reviewed release (${attempt}/${maximumRetries}).`,
      outcome: release.summary,
    });
    if (!release.ok) {
      verification = {
        ok: false,
        summary: release.summary,
        failedLayer: "deployment",
      };
      continue;
    }

    verification = await adapter.verifyProduction();
    evidence.push({
      action: `Verify the canonical production deployment after retry ${attempt}.`,
      outcome: verification.summary,
    });
    if (verification.ok) {
      return { status: "LIVE", attempts: attempt, evidence };
    }
  }

  return { status: "NEEDS_HELP", attempts: maximumRetries, evidence };
}
