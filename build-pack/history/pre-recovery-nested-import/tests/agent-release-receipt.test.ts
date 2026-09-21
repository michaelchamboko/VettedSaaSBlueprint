import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadPublishedLandingPageFromDirectory,
} from "@/lib/generated/landing-pages";
import { fingerprint } from "@/lib/landing-automation/run";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

const exactUrl = "https://try.elevenlabs.io/izj2b165mcsj";
const complianceScannerPath = path.resolve(
  ".agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs",
);

function runComplianceScanner(directory: string) {
  const result = spawnSync(
    process.execPath,
    [complianceScannerPath, directory, "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  return {
    ...result,
    report: JSON.parse(result.stdout) as {
      status: string;
      reason_codes: string[];
      issue_arrays: Record<string, Array<{ message: string }>>;
    },
  };
}

async function writeJson(filePath: string, value: unknown): Promise<string> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(filePath, body, "utf8");
  return fingerprint(body);
}

async function createAgentReleaseCatalogue(directory: string) {
  const slug = "workflow-tools-review";
  const pageArtifact = `${slug}.json`;
  const releaseRoot = `releases/${slug}`;
  const pageDigest = await writeJson(
    path.join(directory, pageArtifact),
    samplePageBlueprint,
  );

  const artifactPaths = {
    product_evidence: `${releaseRoot}/product-evidence.json`,
    visual_review: `${releaseRoot}/visual-review.json`,
    uniqueness_review: `${releaseRoot}/uniqueness-review.json`,
    compliance_review: `${releaseRoot}/compliance-review.json`,
    conversion_review: `${releaseRoot}/conversion-review.json`,
    quality_receipt: `${releaseRoot}/quality.json`,
  } as const;
  const artifactDigests: Record<string, string> = {};
  for (const [name, relativePath] of Object.entries(artifactPaths)) {
    artifactDigests[name] = await writeJson(path.join(directory, relativePath), {
      schema_version: name,
      status: "pass",
    });
  }

  const releaseReceiptPath = `${releaseRoot}/release-receipt.json`;
  await writeJson(path.join(directory, releaseReceiptPath), {
    schema_version: "LandingReleaseReceiptV1",
    slug,
    path: `/landing-page-builders/${slug}`,
    exact_affiliate_url: exactUrl,
    url_fingerprint: fingerprint(exactUrl),
    authorization: {
      source: "approved-urls.md",
      exact_url: exactUrl,
      url_fingerprint: fingerprint(exactUrl),
    },
    artifacts: {
      page: { path: pageArtifact, sha256: pageDigest },
      ...Object.fromEntries(
        Object.entries(artifactPaths).map(([name, relativePath]) => [
          name,
          { path: relativePath, sha256: artifactDigests[name] },
        ]),
      ),
    },
    checks: {
      product_evidence: true,
      visual: true,
      uniqueness: true,
      compliance: true,
      conversion: true,
      quality: true,
      exact_cta: true,
      disclosure: true,
      preview: true,
      clean_build: true,
    },
    release: {
      reviewed_commit: "a".repeat(40),
      preview_url: "https://example-preview.vercel.app/landing-page-previews/workflow-tools-review",
      verified_at: "2026-07-24T10:00:00.000Z",
    },
    claims_removed_or_softened: [],
    publication_sync: "not_configured",
  });

  await writeJson(path.join(directory, "index.json"), {
    generated_at: "2026-07-24T10:00:00.000Z",
    pages: [
      {
        slug,
        title: "Workflow Tools Review",
        artifact: pageArtifact,
        path: `/landing-page-builders/${slug}`,
        status: "published",
        publication_source: "agent_verified_release",
        published_at: "2026-07-24T10:00:00.000Z",
        current_version_id: "release-v1",
        release_receipt: releaseReceiptPath,
      },
    ],
  });

  return { slug, artifactPaths };
}

test("agent release receipt exposes a page with the exact affiliate CTA", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "agent-release-"));
  try {
    const { slug } = await createAgentReleaseCatalogue(directory);
    const published = loadPublishedLandingPageFromDirectory(directory, slug);

    assert.ok(published);
    assert.equal(published.blueprint.metadata.url_slug, slug);
    assert.equal(published.exactAffiliateUrl, exactUrl);
    assert.equal(published.publicationSource, "agent_verified_release");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("altered release evidence is rejected instead of becoming public", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "altered-release-"));
  try {
    const { slug, artifactPaths } =
      await createAgentReleaseCatalogue(directory);
    await writeFile(
      path.join(directory, artifactPaths.compliance_review),
      '{"status":"fail"}\n',
      "utf8",
    );

    assert.throws(
      () => loadPublishedLandingPageFromDirectory(directory, slug),
      /fingerprint mismatch.*compliance/i,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("public route passes receipt-bound URL to the renderer", async () => {
  const source = await readFile(
    path.resolve("src/app/landing-page-builders/[slug]/page.tsx"),
    "utf8",
  );
  assert.match(
    source,
    /affiliateUrlOverride=\{published\.exactAffiliateUrl(?: \?\? undefined)?\}/,
  );
});

test("production scanners recognize independently verified agent releases", async () => {
  const scannerPaths = [
    "scripts/scan-landing-static.mjs",
    ".agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs",
    ".agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs",
    ".agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs",
  ];
  for (const scannerPath of scannerPaths) {
    const source = await readFile(path.resolve(scannerPath), "utf8");
    assert.match(
      source,
      /agent_verified_release[\s\S]{0,240}release_receipt|release_receipt[\s\S]{0,240}agent_verified_release/,
      scannerPath,
    );
  }
});

test("production compliance accepts a complete receipt-bound agent release", () => {
  const result = runComplianceScanner(
    path.resolve("src/generated/landing-pages"),
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.report.status, "pass");
});

test("production compliance rejects altered receipt-bound external evidence", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "tampered-compliance-release-"),
  );
  try {
    await cp(path.resolve("src/generated/landing-pages"), directory, {
      recursive: true,
    });
    await writeFile(
      path.join(
        directory,
        "releases/elevenlabs-ai-voice-generator/product-evidence.json",
      ),
      '{"tampered":true}\n',
      "utf8",
    );

    const result = runComplianceScanner(directory);
    assert.notEqual(result.status, 0);
    assert.ok(
      result.report.reason_codes.includes("release_authorization_missing"),
    );
    assert.match(JSON.stringify(result.report.issue_arrays), /fingerprint/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
