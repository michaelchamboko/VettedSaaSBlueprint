import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  advanceLandingRun,
  ensureAuthorizedExactUrl,
  loadOrCreateLandingRun,
  type LandingRunV1,
} from "@/lib/landing-automation/run";

const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj";
const slug = "elevenlabs-ai-voice-generator";

async function withTempRepository(
  work: (repositoryRoot: string) => Promise<void>,
) {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "landing-run-"));
  try {
    await work(repositoryRoot);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
}

test("one exact URL creates a durable non-Oracle run and resumes it", async () => {
  await withTempRepository(async (repositoryRoot) => {
    const first = await loadOrCreateLandingRun({
      repositoryRoot,
      exactUrl: affiliateUrl,
      slug,
      now: "2026-07-24T08:00:00.000Z",
    });

    assert.equal(first.created, true);
    assert.equal(first.run.state, "WORKING");
    assert.equal(first.run.stage, "research");
    assert.equal(first.run.oracle_sync, "not_configured");
    assert.equal(first.run.next_action.kind, "verify_destination_and_research");
    assert.match(first.run.url_fingerprint, /^[a-f0-9]{64}$/);

    const resumed = await loadOrCreateLandingRun({
      repositoryRoot,
      exactUrl: affiliateUrl,
      slug,
      now: "2026-07-24T09:00:00.000Z",
    });

    assert.equal(resumed.created, false);
    assert.equal(resumed.run.run_id, first.run.run_id);
    assert.equal(resumed.run.created_at, first.run.created_at);
    assert.equal(resumed.run.stage, "research");

    const persisted = JSON.parse(
      await readFile(first.run_file, "utf8"),
    ) as LandingRunV1;
    assert.equal(persisted.exact_url, affiliateUrl);
  });
});

test("URL submission records the exact URL once in the active allowlist", async () => {
  await withTempRepository(async (repositoryRoot) => {
    const allowlistPath = path.join(repositoryRoot, "approved-urls.md");
    await writeFile(allowlistPath, "# Approved affiliate URLs\n\n", "utf8");

    const first = await ensureAuthorizedExactUrl(repositoryRoot, affiliateUrl);
    const second = await ensureAuthorizedExactUrl(repositoryRoot, affiliateUrl);
    const markdown = await readFile(allowlistPath, "utf8");

    assert.equal(first.added, true);
    assert.equal(second.added, false);
    assert.equal(
      markdown.split(affiliateUrl).length - 1,
      1,
      "the exact URL must not be normalized or duplicated",
    );
  });
});

test("quality failures become bounded field repairs before NEEDS_HELP", () => {
  const base = makeRun();
  const first = advanceLandingRun(base, {
    kind: "quality_failed",
    evidence: {
      summary: "The first CTA wrapped over the card edge on a 390px viewport.",
      attempted: "Reduced the CTA label and tightened the card padding.",
      affected_field: "hero.primary_cta_label",
    },
    now: "2026-07-24T08:05:00.000Z",
  });
  assert.equal(first.state, "FIXING");
  assert.equal(first.repair_attempts, 1);
  assert.equal(first.next_action.kind, "repair_page_field");
  assert.equal(first.next_action.target, "hero.primary_cta_label");

  const second = advanceLandingRun(first, {
    kind: "quality_failed",
    evidence: {
      summary: "The limitation copy remained too generic.",
      attempted: "Rewrote it around long-form pronunciation review.",
      affected_field: "limitations.0",
    },
    now: "2026-07-24T08:10:00.000Z",
  });
  assert.equal(second.state, "FIXING");
  assert.equal(second.repair_attempts, 2);

  const exhausted = advanceLandingRun(second, {
    kind: "quality_failed",
    evidence: {
      summary: "The page still cannot make a useful, supportable buyer decision.",
      attempted: "Simplified the layout and removed every unsupported claim.",
      affected_field: "hero",
    },
    now: "2026-07-24T08:15:00.000Z",
  });
  assert.equal(exhausted.state, "NEEDS_HELP");
  assert.equal(exhausted.next_action.kind, "human_action_required");
  assert.match(exhausted.next_action.description, /two repair rounds/i);
  assert.equal(exhausted.recovery_evidence.length, 3);
});

test("successful recovery evidence is recorded without changing the next action or retry budgets", () => {
  const base = makeRun();
  const recovered = advanceLandingRun(base, {
    kind: "recovery_recorded",
    evidence: {
      summary:
        "The production build compiled and generated all 52 routes after network access was enabled.",
      attempted:
        "Retried the unchanged build with access to the Google Fonts endpoints required by next/font.",
      affected_field: "release build network",
    },
    now: "2026-07-24T08:03:00.000Z",
  });

  assert.equal(recovered.state, base.state);
  assert.equal(recovered.stage, base.stage);
  assert.deepEqual(recovered.next_action, base.next_action);
  assert.equal(recovered.source_attempts, base.source_attempts);
  assert.equal(recovered.repair_attempts, base.repair_attempts);
  assert.equal(recovered.deployment_attempts, base.deployment_attempts);
  assert.equal(recovered.recovery_evidence.length, 1);
  assert.equal(recovered.recovery_evidence[0]?.kind, "recovery_recorded");
  assert.match(recovered.recovery_evidence[0]?.outcome ?? "", /52 routes/i);
});

test("LIVE requires exact CTA, disclosure, responsive checks, and production identity", () => {
  const deploying = {
    ...makeRun(),
    state: "DEPLOYING",
    stage: "production_verification",
  } satisfies LandingRunV1;

  assert.throws(
    () =>
      advanceLandingRun(deploying, {
        kind: "production_verified",
        now: "2026-07-24T08:20:00.000Z",
        result: {
          canonical_url:
            "https://vettedsaasblueprint.online/landing-page-builders/elevenlabs-ai-voice-generator",
          deployment_id: "dpl_test",
          production_commit: "a".repeat(40),
          http_ok: true,
          disclosure_ok: true,
          exact_cta_ok: false,
          desktop_ok: true,
          mobile_ok: true,
          robots_ok: true,
          sitemap_ok: true,
          browser_errors: [],
        },
      }),
    /exact affiliate CTA/i,
  );

  const live = advanceLandingRun(deploying, {
    kind: "production_verified",
    now: "2026-07-24T08:21:00.000Z",
    result: {
      canonical_url:
        "https://vettedsaasblueprint.online/landing-page-builders/elevenlabs-ai-voice-generator",
      deployment_id: "dpl_test",
      production_commit: "a".repeat(40),
      http_ok: true,
      disclosure_ok: true,
      exact_cta_ok: true,
      desktop_ok: true,
      mobile_ok: true,
      robots_ok: true,
      sitemap_ok: true,
      browser_errors: [],
    },
  });

  assert.equal(live.state, "LIVE");
  assert.equal(live.stage, "complete");
  assert.equal(live.next_action.kind, "none");
});

function makeRun(): LandingRunV1 {
  return {
    schema_version: "LandingRunV1",
    exact_url: affiliateUrl,
    url_fingerprint: "a".repeat(64),
    run_id: "landing-a".padEnd(44, "0"),
    page_slug: slug,
    batch_id: "11111111-1111-4111-8111-111111111111",
    state: "WORKING",
    stage: "quality",
    source_attempts: 1,
    repair_attempts: 0,
    deployment_attempts: 0,
    artifact_fingerprints: {},
    review_fingerprints: {},
    preview_result: null,
    production_result: null,
    oracle_sync: "not_configured",
    recovery_evidence: [],
    created_at: "2026-07-24T08:00:00.000Z",
    updated_at: "2026-07-24T08:00:00.000Z",
    next_action: {
      kind: "run_quality_checks",
      description: "Run the automatic landing quality checks.",
    },
  };
}
