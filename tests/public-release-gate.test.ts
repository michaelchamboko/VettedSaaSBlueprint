import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/preview-build.yml", "utf8");
const productionWorkflow = readFileSync(
  ".github/workflows/landing-production-verify.yml",
  "utf8",
);
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  buildCommand?: string;
};
const publicSiteContract = readFileSync("src/lib/site/public-site.ts", "utf8");
const publicCatalogue = readFileSync("src/lib/generated/landing-pages.ts", "utf8");
const releaseRunbook = readFileSync("docs/deployment/public-site-release.md", "utf8");

function workflowJob(name: string): string {
  const start = workflow.indexOf(`  ${name}:`);
  assert.notEqual(start, -1, `${name} job must exist`);
  const remaining = workflow.slice(start);
  const nextJob = remaining.slice(1).search(/\n  [a-zA-Z0-9_-]+:\n/);
  return nextJob === -1 ? remaining : remaining.slice(0, nextJob + 1);
}

test("the release contract fixes the approved public identity", () => {
  assert.match(publicSiteContract, /VettedSaaSBlueprint/);
  assert.match(publicSiteContract, /vettedsaasblueprint@proton\.me/);
  assert.match(publicSiteContract, /3 Wagner Lane/);
  assert.match(publicSiteContract, /Sagewood/);
  assert.match(publicSiteContract, /Johannesburg/);
});

test("public release validation is a named source-side gate", () => {
  assert.equal(packageJson.scripts["validate:public-site"], "tsx scripts/validate-public-site.ts");
  assert.equal(packageJson.scripts["gate:public-release"], "npm run validate:public-site");
  assert.equal(vercel.buildCommand, "npm run validate:public-site && next build");
});

test("published review links retain the typed dynamic-route contract", () => {
  assert.match(publicCatalogue, /path:\s*`\/landing-page-builders\/\$\{string\}`;/);
});

test("the public site publishes an application icon", () => {
  assert.equal(existsSync("src/app/icon.svg"), true);
});

test("build and final workflow gates receive release values", () => {
  for (const jobName of ["build", "landing-workflow"]) {
    const job = workflowJob(jobName);

    assert.match(job, /PUBLIC_POLICY_EFFECTIVE_DATE:\s*\$\{\{ vars\.PUBLIC_POLICY_EFFECTIVE_DATE \}\}/);
    assert.match(job, /INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT:\s*\$\{\{ vars\.INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT \}\}/);
    assert.match(job, /PUBLIC_SITE_ORIGIN:\s*https:\/\/vetted-saa-s-blueprint\.vercel\.app/);
  }
});

test("public release validation runs before build and Stage 2 reporting", () => {
  const buildJob = workflowJob("build");
  assert.ok(buildJob.indexOf("npm run gate:public-release") < buildJob.indexOf("npm run build"));

  const finalJob = workflowJob("landing-workflow");
  assert.ok(finalJob.indexOf("npm run gate:public-release") < finalJob.indexOf("npm run gate:stage2:pre-review"));
});

test("workflow does not create or target another hosting project", () => {
  assert.doesNotMatch(workflow, /vercel\s+(?:link|project|deploy)|create[_ -]?project|sites[_ -]?project/i);
  assert.match(releaseRunbook, /existing Vercel project\s+`vetted-saa-s-blueprint`/);
});

test("automatic production verification uses the canonical public origin", () => {
  assert.match(
    productionWorkflow,
    /CANONICAL_ORIGIN:\s*https:\/\/vetted-saa-s-blueprint\.vercel\.app/,
  );
  assert.match(
    productionWorkflow,
    /url="\$\{MANUAL_URL:-\$CANONICAL_ORIGIN\}"/,
  );
  assert.doesNotMatch(
    productionWorkflow,
    /url="\$\{MANUAL_URL:-\$DEPLOYMENT_URL\}"/,
  );
});
