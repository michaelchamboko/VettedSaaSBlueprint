import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseApprovedUrls } from "@/lib/landing-automation/approved-urls";

export type LandingRunState =
  | "WORKING"
  | "FIXING"
  | "DEPLOYING"
  | "LIVE"
  | "NEEDS_HELP"
  | "STOPPED";

export type LandingRunStage =
  | "research"
  | "authoring"
  | "quality"
  | "preview"
  | "release"
  | "production_verification"
  | "complete";

export type PublicationSyncState = "complete" | "pending" | "not_configured";

export type LandingRunNextAction = {
  kind:
    | "verify_destination_and_research"
    | "author_page"
    | "repair_page_field"
    | "run_quality_checks"
    | "verify_preview"
    | "create_release"
    | "verify_production"
    | "retry_source"
    | "restore_and_repair_release"
    | "human_action_required"
    | "none";
  description: string;
  command?: string;
  target?: string;
};

export type LandingPreviewResult = {
  url: string;
  deployment_id?: string;
  http_ok: boolean;
  disclosure_ok: boolean;
  exact_cta_ok: boolean;
  desktop_ok: boolean;
  mobile_ok: boolean;
  overflow_ok: boolean;
  robots_ok: boolean;
  browser_errors: string[];
};

export type LandingProductionResult = {
  canonical_url: string;
  deployment_id: string;
  production_commit: string;
  http_ok: boolean;
  disclosure_ok: boolean;
  exact_cta_ok: boolean;
  desktop_ok: boolean;
  mobile_ok: boolean;
  robots_ok: boolean;
  sitemap_ok: boolean;
  browser_errors: string[];
};

export type RecoveryEvidence = {
  kind: string;
  attempted: string;
  outcome: string;
  affected_field?: string;
  recorded_at: string;
};

export type LandingRunV1 = {
  schema_version: "LandingRunV1";
  exact_url: string;
  url_fingerprint: string;
  run_id: string;
  page_slug: string;
  batch_id: string;
  state: LandingRunState;
  stage: LandingRunStage;
  source_attempts: number;
  repair_attempts: number;
  deployment_attempts: number;
  artifact_fingerprints: {
    product_evidence?: string;
    page_artifact?: string;
    quality_receipt?: string;
    release_receipt?: string;
  };
  review_fingerprints: {
    visual?: string;
    uniqueness?: string;
    compliance?: string;
    conversion?: string;
  };
  preview_result: LandingPreviewResult | null;
  production_result: LandingProductionResult | null;
  publication_sync: PublicationSyncState;
  recovery_evidence: RecoveryEvidence[];
  created_at: string;
  updated_at: string;
  next_action: LandingRunNextAction;
};

type PlainEnglishEvidence = {
  summary: string;
  attempted: string;
  affected_field?: string;
};

export type LandingRunEvent =
  | {
      kind: "destination_verified";
      now: string;
      productEvidenceFingerprint: string;
    }
  | {
      kind: "authoring_completed";
      now: string;
      pageArtifactFingerprint: string;
      reviewFingerprints?: LandingRunV1["review_fingerprints"];
    }
  | {
      kind: "quality_failed";
      now: string;
      evidence: PlainEnglishEvidence;
    }
  | {
      kind: "quality_passed";
      now: string;
      qualityReceiptFingerprint: string;
      reviewFingerprints: Required<LandingRunV1["review_fingerprints"]>;
    }
  | {
      kind: "preview_verified";
      now: string;
      result: LandingPreviewResult;
    }
  | { kind: "release_started"; now: string }
  | {
      kind: "production_verified";
      now: string;
      result: LandingProductionResult;
      releaseReceiptFingerprint?: string;
    }
  | {
      kind: "source_failure";
      now: string;
      evidence: PlainEnglishEvidence;
    }
  | {
      kind: "deployment_failed";
      now: string;
      evidence: PlainEnglishEvidence;
    }
  | {
      kind: "recovery_recorded";
      now: string;
      evidence: PlainEnglishEvidence;
    }
  | { kind: "publication_sync_updated"; now: string; state: PublicationSyncState }
  | { kind: "stop"; now: string; reason: string };

export type LoadOrCreateLandingRunInput = {
  repositoryRoot: string;
  exactUrl: string;
  slug: string;
  now?: string;
  databaseConfigured?: boolean;
};

export type LoadOrCreateLandingRunResult = {
  created: boolean;
  run: LandingRunV1;
  run_file: string;
};

export async function ensureAuthorizedExactUrl(
  repositoryRoot: string,
  exactUrlInput: string,
): Promise<{ added: boolean; allowlist_file: string }> {
  const exactUrl = validateExactUrl(exactUrlInput);
  const allowlistFile = path.join(
    path.resolve(repositoryRoot),
    "approved-urls.md",
  );
  const markdown = await readFile(allowlistFile, "utf8");
  const manifest = parseApprovedUrls(markdown);
  if (manifest.entries.some((entry) => entry.exactUrl === exactUrl)) {
    return { added: false, allowlist_file: allowlistFile };
  }

  const separator = markdown.endsWith("\n") ? "" : "\n";
  const nextMarkdown = `${markdown}${separator}- ${exactUrl}\n`;
  parseApprovedUrls(nextMarkdown);
  const temporaryFile = `${allowlistFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, nextMarkdown, "utf8");
  await rename(temporaryFile, allowlistFile);
  return { added: true, allowlist_file: allowlistFile };
}

export function fingerprint(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function validateExactUrl(exactUrl: string): string {
  if (exactUrl !== exactUrl.trim()) {
    throw new Error("The affiliate URL cannot contain leading or trailing whitespace.");
  }
  const parsed = new URL(exactUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("The affiliate URL must use HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.hash) {
    throw new Error("The affiliate URL cannot contain credentials or a fragment.");
  }
  return exactUrl;
}

function validateSlug(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("The landing page slug must use lowercase words separated by hyphens.");
  }
  return slug;
}

function assertFingerprint(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 fingerprint.`);
  }
}

function recordRecovery(
  run: LandingRunV1,
  kind: string,
  evidence: PlainEnglishEvidence,
  now: string,
): RecoveryEvidence[] {
  if (!evidence.attempted.trim() || !evidence.summary.trim()) {
    throw new Error("Recovery evidence must plainly say what was attempted and what happened.");
  }
  return [
    ...run.recovery_evidence,
    {
      kind,
      attempted: evidence.attempted.trim(),
      outcome: evidence.summary.trim(),
      affected_field: evidence.affected_field?.trim() || undefined,
      recorded_at: now,
    },
  ];
}

function requirePassingPreview(result: LandingPreviewResult): void {
  if (!result.http_ok) throw new Error("Preview verification requires a successful HTTP response.");
  if (!result.disclosure_ok) throw new Error("Preview verification requires the affiliate disclosure.");
  if (!result.exact_cta_ok) throw new Error("Preview verification requires the exact affiliate CTA.");
  if (!result.desktop_ok || !result.mobile_ok || !result.overflow_ok) {
    throw new Error("Preview verification requires passing desktop, mobile, and overflow checks.");
  }
  if (!result.robots_ok) throw new Error("Preview verification requires the noindex preview robots policy.");
  if (result.browser_errors.length > 0) throw new Error("Preview verification cannot retain browser errors.");
}

function requirePassingProduction(result: LandingProductionResult): void {
  if (!result.http_ok) throw new Error("Production verification requires a successful HTTP response.");
  if (!result.disclosure_ok) throw new Error("Production verification requires the affiliate disclosure.");
  if (!result.exact_cta_ok) throw new Error("Production verification requires the exact affiliate CTA.");
  if (!result.desktop_ok || !result.mobile_ok) {
    throw new Error("Production verification requires passing desktop and mobile checks.");
  }
  if (!result.robots_ok) throw new Error("Production verification requires the production robots policy.");
  if (!result.sitemap_ok) throw new Error("Production verification requires the public sitemap entry.");
  if (result.browser_errors.length > 0) throw new Error("Production verification cannot retain browser errors.");
  if (!/^[a-f0-9]{40}$/.test(result.production_commit)) {
    throw new Error("Production verification requires a full reviewed Git commit SHA.");
  }
  if (!result.deployment_id.trim()) {
    throw new Error("Production verification requires the Vercel deployment identity.");
  }
}

function assertRunCanAdvance(run: LandingRunV1): void {
  if (run.state === "LIVE" || run.state === "STOPPED") {
    throw new Error(`A ${run.state} landing run cannot be advanced.`);
  }
}

export function advanceLandingRun(
  run: LandingRunV1,
  event: LandingRunEvent,
): LandingRunV1 {
  if (event.kind !== "publication_sync_updated") assertRunCanAdvance(run);

  const updated: LandingRunV1 = {
    ...run,
    artifact_fingerprints: { ...run.artifact_fingerprints },
    review_fingerprints: { ...run.review_fingerprints },
    recovery_evidence: [...run.recovery_evidence],
    updated_at: event.now,
  };

  switch (event.kind) {
    case "destination_verified":
      assertFingerprint(event.productEvidenceFingerprint, "Product evidence");
      return {
        ...updated,
        state: "WORKING",
        stage: "authoring",
        artifact_fingerprints: {
          ...updated.artifact_fingerprints,
          product_evidence: event.productEvidenceFingerprint,
        },
        next_action: {
          kind: "author_page",
          description:
            "Create the evidence-backed structured page, apply one existing-writer Eleanor refinement pass using .agents/skills/eleanor-editorial/SKILL.md before candidate validation, and record the prose comparison outside public content alongside design direction, preview artifacts, and independent review records.",
        },
      };

    case "authoring_completed":
      assertFingerprint(event.pageArtifactFingerprint, "Page artifact");
      return {
        ...updated,
        state: "WORKING",
        stage: "quality",
        artifact_fingerprints: {
          ...updated.artifact_fingerprints,
          page_artifact: event.pageArtifactFingerprint,
        },
        review_fingerprints: {
          ...updated.review_fingerprints,
          ...(event.reviewFingerprints ?? {}),
        },
        next_action: {
          kind: "run_quality_checks",
          description:
            "Run visual, uniqueness, compliance, conversion, static, link, and build checks.",
        },
      };

    case "quality_failed": {
      const attempts = updated.repair_attempts + 1;
      const recovery = recordRecovery(updated, event.kind, event.evidence, event.now);
      if (attempts > 2) {
        return {
          ...updated,
          state: "NEEDS_HELP",
          repair_attempts: attempts,
          recovery_evidence: recovery,
          next_action: {
            kind: "human_action_required",
            description:
              "The page still cannot pass after two repair rounds. Review the recorded attempts and supply one supportable product fact or explicitly stop the URL.",
          },
        };
      }
      return {
        ...updated,
        state: "FIXING",
        stage: "quality",
        repair_attempts: attempts,
        recovery_evidence: recovery,
        next_action: {
          kind: "repair_page_field",
          target: event.evidence.affected_field,
          description: `Repair ${event.evidence.affected_field ?? "the failed page field"}, rerun the owning check, and preserve all passing upstream work.`,
        },
      };
    }

    case "quality_passed":
      assertFingerprint(event.qualityReceiptFingerprint, "Quality receipt");
      for (const [name, value] of Object.entries(event.reviewFingerprints)) {
        assertFingerprint(value, `${name} review`);
      }
      return {
        ...updated,
        state: "WORKING",
        stage: "preview",
        artifact_fingerprints: {
          ...updated.artifact_fingerprints,
          quality_receipt: event.qualityReceiptFingerprint,
        },
        review_fingerprints: { ...event.reviewFingerprints },
        next_action: {
          kind: "verify_preview",
          description:
            "Build the Vercel preview and verify route, disclosure, exact CTA, desktop/mobile rendering, overflow, browser errors, and noindex policy.",
        },
      };

    case "preview_verified":
      requirePassingPreview(event.result);
      return {
        ...updated,
        state: "WORKING",
        stage: "release",
        preview_result: { ...event.result },
        next_action: {
          kind: "create_release",
          description:
            "Create the GitHub change, pass required checks, merge it, and let the existing Vercel Git connection deploy main.",
        },
      };

    case "release_started":
      return {
        ...updated,
        state: "DEPLOYING",
        stage: "production_verification",
        deployment_attempts: updated.deployment_attempts + 1,
        next_action: {
          kind: "verify_production",
          description:
            "Verify the canonical production commit, deployment, route, disclosure, exact CTA, robots policy, sitemap, and desktop/mobile rendering.",
        },
      };

    case "production_verified":
      requirePassingProduction(event.result);
      if (event.releaseReceiptFingerprint) {
        assertFingerprint(event.releaseReceiptFingerprint, "Release receipt");
      }
      return {
        ...updated,
        state: "LIVE",
        stage: "complete",
        artifact_fingerprints: {
          ...updated.artifact_fingerprints,
          release_receipt:
            event.releaseReceiptFingerprint ??
            fingerprint(JSON.stringify(event.result)),
        },
        production_result: { ...event.result },
        next_action: {
          kind: "none",
          description: "The canonical production page is verified and recorded as LIVE.",
        },
      };

    case "source_failure": {
      const attempts = updated.source_attempts + 1;
      const recovery = recordRecovery(updated, event.kind, event.evidence, event.now);
      if (attempts > 3) {
        return {
          ...updated,
          state: "NEEDS_HELP",
          source_attempts: attempts,
          recovery_evidence: recovery,
          next_action: {
            kind: "human_action_required",
            description:
              "The affiliate destination or required source remained unavailable after three retries. Supply a working exact URL or stop this run.",
          },
        };
      }
      return {
        ...updated,
        state: "WORKING",
        source_attempts: attempts,
        recovery_evidence: recovery,
        next_action: {
          kind: "retry_source",
          description:
            "Retry the failed source with a fresh request and retain all completed evidence.",
        },
      };
    }

    case "deployment_failed": {
      const attempts = updated.deployment_attempts + 1;
      const recovery = recordRecovery(updated, event.kind, event.evidence, event.now);
      if (attempts > 2) {
        return {
          ...updated,
          state: "NEEDS_HELP",
          deployment_attempts: attempts,
          recovery_evidence: recovery,
          next_action: {
            kind: "human_action_required",
            description:
              "Release still fails after two distinct repairs. Restore the last working deployment or repair the recorded GitHub/Vercel access failure.",
          },
        };
      }
      return {
        ...updated,
        state: "FIXING",
        stage: "release",
        deployment_attempts: attempts,
        recovery_evidence: recovery,
        next_action: {
          kind: "restore_and_repair_release",
          target: event.evidence.affected_field,
          description:
            "Restore the previous working deployment if production changed, repair only the failed release layer, and retry.",
        },
      };
    }

    case "recovery_recorded":
      return {
        ...updated,
        recovery_evidence: recordRecovery(
          updated,
          event.kind,
          event.evidence,
          event.now,
        ),
      };

    case "publication_sync_updated":
      return { ...updated, publication_sync: event.state };

    case "stop":
      return {
        ...updated,
        state: "STOPPED",
        next_action: { kind: "none", description: event.reason },
      };
  }
}

function runFileFor(repositoryRoot: string, urlFingerprint: string): string {
  return path.join(
    path.resolve(repositoryRoot),
    ".stage2",
    "landing-runs",
    urlFingerprint,
    "run.json",
  );
}

async function persistRun(runFile: string, run: LandingRunV1): Promise<void> {
  await mkdir(path.dirname(runFile), { recursive: true });
  const temporaryFile = `${runFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  await rename(temporaryFile, runFile);
}

export async function saveLandingRun(
  repositoryRoot: string,
  run: LandingRunV1,
): Promise<string> {
  validateExactUrl(run.exact_url);
  if (fingerprint(run.exact_url) !== run.url_fingerprint) {
    throw new Error("Landing run URL fingerprint does not match the exact URL.");
  }
  const runFile = runFileFor(repositoryRoot, run.url_fingerprint);
  await persistRun(runFile, run);
  return runFile;
}

export async function loadOrCreateLandingRun(
  input: LoadOrCreateLandingRunInput,
): Promise<LoadOrCreateLandingRunResult> {
  const exactUrl = validateExactUrl(input.exactUrl);
  const slug = validateSlug(input.slug);
  const urlFingerprint = fingerprint(exactUrl);
  const runFile = runFileFor(input.repositoryRoot, urlFingerprint);

  try {
    const existing = JSON.parse(await readFile(runFile, "utf8")) as LandingRunV1;
    if (
      existing.schema_version !== "LandingRunV1" ||
      existing.exact_url !== exactUrl ||
      existing.url_fingerprint !== urlFingerprint
    ) {
      throw new Error("Stored landing run identity does not match this exact URL and slug.");
    }
    if (existing.page_slug !== slug) {
      if (existing.state !== "WORKING" || existing.stage !== "research") {
        throw new Error("A landing run slug can only be corrected while research is in progress.");
      }
      const renamed: LandingRunV1 = {
        ...existing,
        page_slug: slug,
        updated_at: input.now ?? new Date().toISOString(),
      };
      await persistRun(runFile, renamed);
      return { created: false, run: renamed, run_file: runFile };
    }
    return { created: false, run: existing, run_file: runFile };
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      (error as NodeJS.ErrnoException).code !== "ENOENT"
    ) {
      throw error;
    }
  }

  const now = input.now ?? new Date().toISOString();
  const run: LandingRunV1 = {
    schema_version: "LandingRunV1",
    exact_url: exactUrl,
    url_fingerprint: urlFingerprint,
    run_id: `landing-${randomUUID()}`,
    page_slug: slug,
    batch_id: randomUUID(),
    state: "WORKING",
    stage: "research",
    source_attempts: 0,
    repair_attempts: 0,
    deployment_attempts: 0,
    artifact_fingerprints: {},
    review_fingerprints: {},
    preview_result: null,
    production_result: null,
    publication_sync: input.databaseConfigured ? "pending" : "not_configured",
    recovery_evidence: [],
    created_at: now,
    updated_at: now,
    next_action: {
      kind: "verify_destination_and_research",
      description:
        "Verify the destination, identify the product honestly, and create the fingerprinted product evidence pack.",
    },
  };
  await persistRun(runFile, run);
  return { created: true, run, run_file: runFile };
}
