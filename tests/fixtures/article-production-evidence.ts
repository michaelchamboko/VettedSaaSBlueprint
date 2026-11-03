import { importArtifactTarget } from "../../src/lib/article-import/format-validation";
import { storeProductionVerifierEvidence } from "../../src/lib/article-import/verification-evidence";
import type { ReleaseDeployment } from "../../src/lib/article-import/release";

/** Synthetic command output for isolated release tests; never invokes a production runner. */
export async function productionFixture(root: string, importId: string, target: ReturnType<typeof importArtifactTarget>, deployment: ReleaseDeployment, sourceFingerprint: string) {
  const origin = "https://vettedsaasblueprint.online";
  const snapshot = { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] };
  const common = { target, verificationMode: "production", origin, canonicalOrigin: origin, expected_commit: deployment.commitSha };
  const result = target.format === "direct-review"
    ? { ...common, status: "pass", robots_ok: true, sitemap_ok: true, pages: target.renderedRoutes.map((route) => ({ path: route, desktop: snapshot, mobile: snapshot })) }
    : target.format === "decision-set"
      ? { ...common, passed: true, browser_errors_ok: true, robots_ok: true, sitemap_ok: true, checks: [{ passed: true }], screenshots: target.renderedRoutes.flatMap((route) => [{ route, mode: "desktop" }, { route, mode: "mobile" }]) }
      : { ...common, ok: true, routes: target.renderedRoutes.length, verifiedRoutes: target.renderedRoutes, viewportChecks: target.renderedRoutes.length * 2 };
  const identity = { id: deployment.deploymentId, target: "production", readyState: "READY", commitSha: deployment.commitSha };
  const productionVerifierRef = await storeProductionVerifierEvidence(root, importId, {
    schemaVersion: "ImportProductionVerifierEvidenceV1", importId, sourceFingerprint, target, deployment, deploymentBefore: identity, deploymentAfter: identity,
    command: { command: "synthetic-owner-verifier", args: ["--expected-sha", deployment.commitSha], stdout: JSON.stringify(result), stderr: "", exitCode: 0 }, result,
  });
  return { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true, productionVerifierRef };
}
