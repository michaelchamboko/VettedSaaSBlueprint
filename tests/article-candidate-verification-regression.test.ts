import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { assertVerifierResult } from "../src/lib/article-import/verification-evidence";

const target = {
  format: "direct-review" as const,
  slug: "fixture",
  artifactFingerprint: "a".repeat(64),
  renderedRoutes: ["/preview/fixture"],
};

function shot(artifactFingerprint: string | undefined) {
  return {
    httpOk: true,
    disclosureOk: true,
    exactCtaCount: 1,
    allCtasExact: true,
    ctasFitViewport: true,
    allRevealSectionsVisible: true,
    horizontalPageScrollPossible: false,
    errorOverlay: false,
    browserErrors: [],
    robots: "noindex,nofollow",
    ...(artifactFingerprint === undefined ? {} : { artifactFingerprint }),
  };
}

test("candidate verifier rejects served page without artifact-fingerprint meta", () => {
  const result = {
    verificationMode: "candidate",
    origin: "http://127.0.0.1:3000",
    canonicalOrigin: "https://example.com",
    status: "pass",
    robots_ok: false,
    sitemap_ok: false,
    pages: [
      {
        path: "/landing-page-previews/fixture",
        desktop: shot(undefined),
        mobile: shot(undefined),
        reduced_motion: shot(undefined),
      },
    ],
  };
  assert.throws(() => assertVerifierResult(target, result), /VERIFIER_ARTIFACT_FINGERPRINT_MISMATCH/);
});

test("candidate verifier rejects served page with wrong artifact fingerprint", () => {
  const result = {
    verificationMode: "candidate",
    origin: "http://127.0.0.1:3000",
    canonicalOrigin: "https://example.com",
    status: "pass",
    robots_ok: false,
    sitemap_ok: false,
    pages: [
      {
        path: "/landing-page-previews/fixture",
        desktop: shot("b".repeat(64)),
        mobile: shot("b".repeat(64)),
        reduced_motion: shot("b".repeat(64)),
      },
    ],
  };
  assert.throws(() => assertVerifierResult(target, result), /VERIFIER_ARTIFACT_FINGERPRINT_MISMATCH/);
});

test("candidate verifier accepts served page with correct artifact fingerprint", () => {
  const result = {
    verificationMode: "candidate",
    origin: "http://127.0.0.1:3000",
    canonicalOrigin: "https://example.com",
    status: "pass",
    robots_ok: false,
    sitemap_ok: false,
    pages: [
      {
        path: "/landing-page-previews/fixture",
        desktop: shot(target.artifactFingerprint),
        mobile: shot(target.artifactFingerprint),
        reduced_motion: shot(target.artifactFingerprint),
      },
    ],
  };
  assert.doesNotThrow(() => assertVerifierResult(target, result));
});

test("candidate verifier rejects production checks without authenticated historical binding", () => {
  const result = {
    verificationMode: "candidate",
    origin: "http://127.0.0.1:3000",
    canonicalOrigin: "https://example.com",
    status: "pass",
    robots_ok: true,
    sitemap_ok: true,
    // broken signals mirrored from reviewer reproduction
    pages: [
      {
        path: target.renderedRoutes[0],
        desktop: {
          httpOk: true,
          disclosureOk: true,
          exactCtaCount: 1,
          allCtasExact: true,
          ctasFitViewport: true,
          allRevealSectionsVisible: true,
          horizontalPageScrollPossible: true,
          errorOverlay: true,
          browserErrors: [],
          robots: "index,follow",
        },
        mobile: {
          httpOk: true,
          disclosureOk: true,
          exactCtaCount: 1,
          allCtasExact: true,
          ctasFitViewport: true,
          allRevealSectionsVisible: true,
          horizontalPageScrollPossible: true,
          errorOverlay: true,
          browserErrors: [],
          robots: "index,follow",
        },
      },
    ],
  };
  assert.throws(() => assertVerifierResult(target, result), /CANDIDATE_CANNOT_CLAIM_PRODUCTION_CHECKS/);
});

test("candidate verifier rejects replayed historical allowlist pair in unrelated artifact", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "hist-"));
  const importId = "article-11111111-2222-4333-8444-555555555555";
  const sourceFingerprint = "b".repeat(64);
  await mkdir(path.join(root, ".automation"), { recursive: true });
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint }]));
  try {
    const result = {
      verificationMode: "candidate",
      origin: "http://127.0.0.1:3000",
      canonicalOrigin: "https://example.com",
      status: "pass",
      // replayed identity from allowlist; must be ignored
      importId,
      sourceFingerprint,
      robots_ok: true,
      sitemap_ok: true,
      pages: [
        {
          path: target.renderedRoutes[0],
          desktop: {
            httpOk: true, disclosureOk: true, exactCtaCount: 1, allCtasExact: true,
            ctasFitViewport: true, allRevealSectionsVisible: true, horizontalPageScrollPossible: true,
            errorOverlay: true, browserErrors: [], robots: "index,follow",
          },
          mobile: {
            httpOk: true, disclosureOk: true, exactCtaCount: 1, allCtasExact: true,
            ctasFitViewport: true, allRevealSectionsVisible: true, horizontalPageScrollPossible: true,
            errorOverlay: true, browserErrors: [], robots: "index,follow",
          },
        },
      ],
    };
    // trusted identity is the unrelated artifact's (not the allowlisted pair)
    const trusted = { importId: "article-99999999-8888-4777-aaaa-bbbbbbbbbbbb", sourceFingerprint: "c".repeat(64) };
    assert.throws(() => assertVerifierResult(target, result, root, trusted), /CANDIDATE_CANNOT_CLAIM_PRODUCTION_CHECKS/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("candidate verifier accepts genuinely historical receipt via authenticated binding", async () => {
  const importId = "article-11111111-2222-4333-8444-555555555555";
  const sourceFingerprint = "b".repeat(64);
  const root = await mkdtemp(path.join(tmpdir(), "hist-"));
  await mkdir(path.join(root, ".automation"), { recursive: true });
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint }]));
  try {
    const result = {
      verificationMode: "candidate",
      origin: "http://127.0.0.1:3000",
      canonicalOrigin: "https://example.com",
      status: "pass",
      robots_ok: true,
      sitemap_ok: true,
      pages: [
        {
          path: target.renderedRoutes[0],
          desktop: { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] },
          mobile: { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] },
        },
      ],
    };
    assert.doesNotThrow(() => assertVerifierResult(target, result, root, { importId, sourceFingerprint }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});