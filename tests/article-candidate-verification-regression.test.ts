import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { assertVerifierResult, canonicalJson } from "../src/lib/article-import/verification-evidence";

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
  const receiptDigest = createHash("sha256").update(JSON.stringify(result)).digest("hex");
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint, receiptDigest }]));
  try {
    assert.doesNotThrow(() => assertVerifierResult(target, result, root, { importId, sourceFingerprint }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("candidate verifier rejects constructed legacy receipt whose served artifact fingerprint does not match approved record", async () => {
  const importId = "article-22222222-3333-4444-9555-666666666666";
  const sourceFingerprint = "d".repeat(64);
  const approvedArtifactFingerprint = target.artifactFingerprint;
  const root = await mkdtemp(path.join(tmpdir(), "hist-"));
  await mkdir(path.join(root, ".automation"), { recursive: true });
  const baseResult = {
    verificationMode: "candidate",
    origin: "http://127.0.0.1:3000",
    canonicalOrigin: "https://example.com",
    status: "pass",
    robots_ok: true,
    sitemap_ok: true,
    pages: [
      {
        path: target.renderedRoutes[0],
        desktop: {
          httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true,
          browserErrors: [], artifactFingerprint: approvedArtifactFingerprint,
        },
        mobile: {
          httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true,
          browserErrors: [], artifactFingerprint: approvedArtifactFingerprint,
        },
      },
    ],
  };
  const receiptDigest = createHash("sha256").update(JSON.stringify(baseResult)).digest("hex");
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint, artifactFingerprint: approvedArtifactFingerprint, receiptDigest }]));
  try {
    assert.doesNotThrow(() => assertVerifierResult(target, baseResult, root, { importId, sourceFingerprint }));
    const wrong = JSON.parse(JSON.stringify(baseResult));
    wrong.pages[0].desktop.artifactFingerprint = "b".repeat(64);
    wrong.pages[0].mobile.artifactFingerprint = "b".repeat(64);
    assert.throws(() => assertVerifierResult(target, wrong, root, { importId, sourceFingerprint }), /CANDIDATE_CANNOT_CLAIM_PRODUCTION_CHECKS/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("historical binding accepts digest-only entry with correct compact digest", async () => {
  const importId = "article-aaaa1111-2222-4333-8444-555555555555";
  const sourceFingerprint = "e".repeat(64);
  const root = await mkdtemp(path.join(tmpdir(), "hist-"));
  await mkdir(path.join(root, ".automation"), { recursive: true });
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
  const receiptDigest = createHash("sha256").update(JSON.stringify(result)).digest("hex");
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint, receiptDigest }]));
  const trusted = { importId, sourceFingerprint };
  try {
    assert.doesNotThrow(() => assertVerifierResult(target, result, root, trusted));
    assert.doesNotThrow(() => assertVerifierResult(target, result, trusted, root));
    assert.throws(() => assertVerifierResult(target, result, { root, trusted } as never), /CANDIDATE_CANNOT_CLAIM_PRODUCTION_CHECKS/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("historical binding rejects digest-only entry when nested content is altered", async () => {
  const importId = "article-bbbb2222-3333-4444-9555-666666666666";
  const sourceFingerprint = "f".repeat(64);
  const root = await mkdtemp(path.join(tmpdir(), "hist-"));
  await mkdir(path.join(root, ".automation"), { recursive: true });
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
        desktop: { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [], errorOverlay: false },
        mobile: { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [], errorOverlay: false },
      },
    ],
  };
  const receiptDigest = createHash("sha256").update(JSON.stringify(result)).digest("hex");
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint, receiptDigest }]));
  try {
    const wrong = JSON.parse(JSON.stringify(result));
    wrong.pages[0].desktop.errorOverlay = true;
    wrong.pages[0].mobile.errorOverlay = true;
    assert.throws(() => assertVerifierResult(target, wrong, root, { importId, sourceFingerprint }), /CANDIDATE_CANNOT_CLAIM_PRODUCTION_CHECKS/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("historical binding accepts canonical-form digest with reordered keys (order-invariant)", async () => {
  const importId = "article-cccc3333-4444-5555-9666-777777777777";
  const sourceFingerprint = "1".repeat(64);
  const root = await mkdtemp(path.join(tmpdir(), "hist-"));
  await mkdir(path.join(root, ".automation"), { recursive: true });
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
  const canonicalDigestValue = createHash("sha256").update(canonicalJson(result)).digest("hex");
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint, receiptDigest: canonicalDigestValue, receiptDigestSha256: canonicalDigestValue }]));
  // remove duplicate field name confusion: keep only canonical digest field
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint, receiptDigest: canonicalDigestValue }]));
  try {
    const reordered = {
      pages: [
        {
          path: target.renderedRoutes[0],
          mobile: { browserErrors: [], allRevealSectionsVisible: true, allCtasExact: true, disclosureOk: true, httpOk: true },
          desktop: { browserErrors: [], allRevealSectionsVisible: true, allCtasExact: true, disclosureOk: true, httpOk: true },
        },
      ],
      sitemap_ok: true,
      robots_ok: true,
      status: "pass",
      canonicalOrigin: "https://example.com",
      origin: "http://127.0.0.1:3000",
      verificationMode: "candidate",
    };
    assert.doesNotThrow(() => assertVerifierResult(target, reordered, root, { importId, sourceFingerprint }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("lossy sorted-key digest regression: nested content changes must change digest", () => {
  const base = { outer: { inner: { value: 1, errorOverlay: false } } };
  const altered = { outer: { inner: { value: 1, errorOverlay: true } } };
  const oldLossy = (v: unknown) => createHash("sha256").update(JSON.stringify(v, Object.keys(v as object).sort())).digest("hex");
  // documents the historical collision bug
  assert.equal(oldLossy(base), oldLossy(altered));
  const compactBase = createHash("sha256").update(JSON.stringify(base)).digest("hex");
  const compactAltered = createHash("sha256").update(JSON.stringify(altered)).digest("hex");
  assert.notEqual(compactBase, compactAltered);
  const canonBase = createHash("sha256").update(canonicalJson(base)).digest("hex");
  const canonAltered = createHash("sha256").update(canonicalJson(altered)).digest("hex");
  assert.notEqual(canonBase, canonAltered);
});

test("historical binding rejects identity-only allowlist entry (no digest)", async () => {
  const importId = "article-dddd4444-5555-6666-9777-888888888888";
  const sourceFingerprint = "2".repeat(64);
  const root = await mkdtemp(path.join(tmpdir(), "hist-"));
  await mkdir(path.join(root, ".automation"), { recursive: true });
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
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint }]));
  try {
    assert.throws(() => assertVerifierResult(target, result, root, { importId, sourceFingerprint }), /CANDIDATE_CANNOT_CLAIM_PRODUCTION_CHECKS/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("historical binding rejects fingerprint-only allowlist entry (no digest)", async () => {
  const importId = "article-eeee5555-6666-7777-9888-999999999999";
  const sourceFingerprint = "3".repeat(64);
  const approvedArtifactFingerprint = target.artifactFingerprint;
  const root = await mkdtemp(path.join(tmpdir(), "hist-"));
  await mkdir(path.join(root, ".automation"), { recursive: true });
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
        desktop: { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [], artifactFingerprint: approvedArtifactFingerprint },
        mobile: { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [], artifactFingerprint: approvedArtifactFingerprint },
      },
    ],
  };
  writeFileSync(path.join(root, ".automation", "historical-candidate-receipts.json"), JSON.stringify([{ importId, sourceFingerprint, artifactFingerprint: approvedArtifactFingerprint }]));
  try {
    assert.throws(() => assertVerifierResult(target, result, root, { importId, sourceFingerprint }), /CANDIDATE_CANNOT_CLAIM_PRODUCTION_CHECKS/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
