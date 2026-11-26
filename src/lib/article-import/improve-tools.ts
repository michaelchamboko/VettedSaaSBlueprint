import { execFile } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { z } from "zod";
import { externalArticleImportSchema } from "./contracts";
import { evidenceReference, evidenceRefSchema, storeEvidence } from "./execution-evidence";
import { writeJsonAtomically } from "./engine";
import { isRepairFile } from "./improve-scope";
import { repairDecisionSchema, verifyImproveResearch } from "./improve-supervisor";
import { createLocalReleaseOperations } from "./local-release-adapter";
import { improveChecklistPath, retainImproveMeasurement } from "./improve-checklist";

const run = promisify(execFile);
const key = z.string().regex(/^[a-f0-9]{64}$/);
const packetSchema = z.object({
  stage: z.literal("IMPROVE"), improvePhase: z.enum(["ASSESSING", "RESOLVING"]),
  publicationKey: key, boundCommitSha: z.string().regex(/^[a-f0-9]{40}$/),
  record: externalArticleImportSchema, runRef: evidenceRefSchema,
});
const file = z.string().refine(isRepairFile);
const schemas = {
  retain: z.object({ content: z.string().min(1) }).strict(),
  measure: z.union([
    z.object({ issue: z.string(), revision: z.enum(["before", "after"]), file,
      literal: z.string().min(1), expectedCount: z.number().int().nonnegative() }).strict(),
    z.object({ issue: z.string(), revision: z.enum(["before", "after"]), githubCheck: z.string().min(1) }).strict(),
  ]),
  submit: z.object({ files: z.array(file).min(1), decisions: z.array(repairDecisionSchema).min(1) }).strict(),
  review: z.object({}).strict(),
};
const descriptions = {
  retain: "Archive a handoff or JSON receipt and return its path and SHA-256. Pass structured receipts as serialized JSON.",
  measure: "Measure a literal count in committed source or read a named GitHub Actions check at the bound original or repair revision. Returns a controller-issued regression receipt.",
  submit: "Commit the declared workflow repair on its isolated branch, open its pull request and request independent review.",
  review: "Collect a verified independent review receipt for the current repair head, or return its pending status.",
};

async function server(root: string, workPath: string) {
  const packet = packetSchema.parse(JSON.parse(await readFile(path.resolve(root, workPath), "utf8")));
  const { record, publicationKey, boundCommitSha } = packet;
  const assignment = record.improve;
  if (record.stage !== "LIVE" || !assignment || assignment.publicationKey !== publicationKey ||
      record.release?.commitSha !== boundCommitSha) throw new Error("IMPROVE_TOOL_BINDING");
  const branch = "codex/improve-" + publicationKey.slice(0, 16);
  const repair = path.join(root, ".worktrees", branch.slice(6));
  const command = async (name: "git" | "gh", args: string[]) =>
    (await run(name, args, { cwd: repair, windowsHide: true, timeout: 90000, maxBuffer: 8 * 1024 * 1024 })).stdout.trimEnd();
  const git = (...args: string[]) => command("git", args);
  const gh = (...args: string[]) => command("gh", args);
  const save = (value: unknown) => storeEvidence(root, record.importId, value);
  async function call(name: keyof typeof schemas, args: unknown) {
    if (name === "retain") {
      const { content } = schemas.retain.parse(args);
      if (Buffer.byteLength(content) > 150000) throw new Error("IMPROVE_HANDOFF_TOO_LARGE");
      try { return await save(JSON.parse(content)); }
      catch (error) { if (!(error instanceof SyntaxError)) throw error; return save(content); }
    }
    if (packet.improvePhase !== "RESOLVING" || await git("branch", "--show-current") !== branch ||
      await realpath(repair) !== await realpath(await git("rev-parse", "--show-toplevel"))) throw new Error("IMPROVE_REPAIR_BINDING");
    await git("merge-base", "--is-ancestor", boundCommitSha, "HEAD");
    const issues = assignment!.issueKeys;
    if (name === "measure") {
      const measurement = schemas.measure.parse(args);
      if (!issues.includes(measurement.issue)) {
        const checklist = JSON.parse(await readFile(path.join(root, improveChecklistPath), "utf8")) as {key: string; resolutions: unknown[]}[];
        if (!checklist.some(item => item.key === measurement.issue && item.resolutions.length)) throw new Error("IMPROVE_UNKNOWN_ISSUE");
      }
      const head = measurement.revision === "before" ? boundCommitSha : await git("rev-parse", "HEAD");
      if ("githubCheck" in measurement) {
        const raw = await gh("api", "--paginate", "--slurp", `repos/{owner}/{repo}/commits/${head}/check-runs?per_page=100`);
        type Check = { name: string; head_sha: string; conclusion: string; status: string; app: {slug: string}; html_url: string };
        const runs = (JSON.parse(raw) as {check_runs: Check[]}[]).flatMap(page => page.check_runs);
        const matches = runs.filter(run => run.name === measurement.githubCheck && run.head_sha === head && run.app.slug === "github-actions");
        if (matches.length !== 1 || matches[0].status !== "completed" || !["failure", "success"].includes(matches[0].conclusion)) throw new Error("IMPROVE_CHECK_UNVERIFIED");
        const output = await save(matches[0]);
        return retainImproveMeasurement(root, publicationKey, { key: measurement.issue, check: "github-actions/" + measurement.githubCheck,
          commitSha: head, outcome: matches[0].conclusion === "success" ? "pass" : "fail", output });
      }
      const { stdout: source } = await run("git", ["show", head + ":" + measurement.file], { cwd: repair, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
      const count = source.split(measurement.literal).length - 1;
      const { issue, file, literal, expectedCount } = measurement;
      const output = await save({ issue, file, literal, expectedCount, count, head });
      return retainImproveMeasurement(root, publicationKey, { key: issue, check: JSON.stringify([file, literal, expectedCount]), commitSha: head,
        outcome: count === expectedCount ? "pass" : "fail", output });
    }
    if (name === "submit") {
      const rejectionFile = path.join(root, ".automation/article-imports/improve", publicationKey, "rejected-repairs.json");
      const rejectedItem = z.object({ key: z.string().min(1), candidate: z.string().min(1) });
      let rejected: z.infer<typeof rejectedItem>[] = [];
      try { rejected = rejectedItem.array().parse(JSON.parse(await readFile(rejectionFile, "utf8"))); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      const plans = z.object({ decisions: z.array(z.unknown()) }).parse(args);
      for (const plan of plans.decisions) {
        const decision = repairDecisionSchema.safeParse(plan);
        if (!decision.success && decision.error.issues.some(item => item.message === "IMPROVE_COMPLEXITY_INCREASE")) {
          const candidate = rejectedItem.parse(plan);
          if (!issues.includes(candidate.key)) throw new Error("IMPROVE_UNKNOWN_ISSUE");
          if (!rejected.some(item => item.key === candidate.key && item.candidate === candidate.candidate)) rejected.push(candidate);
          await writeJsonAtomically(rejectionFile, rejected);
          throw new Error("IMPROVE_COMPLEXITY_INCREASE: reject this candidate, invoke research, and submit its research receipt with a simpler alternative.");
        }
      }
      const { files, decisions } = schemas.submit.parse(args);
      if (!decisions.some(d => d.decision === "accepted") || decisions.some(d => !issues.includes(d.key))) throw new Error("IMPROVE_APPROVED_REPAIR_REQUIRED");
      for (const decision of decisions) await verifyImproveResearch(root, decision);
      for (const candidate of rejected) {
        if (decisions.some(d => d.key === candidate.key && d.decision === "accepted") &&
          (!decisions.some(d => d.key === candidate.key && d.candidate === candidate.candidate && d.decision === "rejected") ||
           decisions.some(d => d.key === candidate.key && d.candidate === candidate.candidate && d.decision === "accepted"))) {
          throw new Error("IMPROVE_RESEARCH_AND_SIMPLER_CANDIDATE_REQUIRED");
        }
      }
      await git("add", "--", ...files);
      const staged = (await git("diff", "--cached", "--name-only", "-z")).split("\0").filter(Boolean);
      if (staged.some(p => !files.includes(p))) throw new Error("IMPROVE_UNDECLARED_STAGED_FILES");
      if (staged.length) await git("commit", "-m", "Repair article workflow for " + record.importId);
      const changed = (await git("diff", "--name-only", "-z", boundCommitSha, "HEAD")).split("\0").filter(Boolean);
      if (!changed.length || changed.some(p => !files.includes(p) || !isRepairFile(p))) throw new Error("IMPROVE_REPAIR_SCOPE");
      await git("push", "origin", "HEAD:refs/heads/" + branch);
      const existing = JSON.parse(await gh("pr", "list", "--head", branch, "--base", "main", "--state", "all", "--json", "url,headRefOid,state")) as {url: string; headRefOid: string; state: string}[];
      const submitted = await git("rev-parse", "HEAD");
      if (!existing.some(pr => pr.state === "OPEN" || pr.headRefOid === submitted)) await gh("pr", "create", "--head", branch, "--base", "main", "--title", "Repair article workflow for " + record.importId,
        "--body", "IMPROVE found " + issues.join(", ") + " during verified publication. Independent review is required before closure.");
    } else if (name !== "review") throw new Error("IMPROVE_UNKNOWN_TOOL");
    const head = await git("rev-parse", "HEAD");
    const pr = JSON.parse(await gh("pr", "view", branch, "--json", "url,state,headRefOid,comments")) as {
      url: string; state: string; headRefOid: string; comments: { url: string; body: string; createdAt: string; author: { login: string } }[];
    };
    if (pr.headRefOid !== head) throw new Error("IMPROVE_REVIEW_HEAD_MISMATCH");
    if (pr.state === "CLOSED") return { status: "CLOSED_UNMERGED", commitSha: head, pullRequestUrl: pr.url };
    const marker = `<!-- improve-review:${head} -->`;
    if (name === "submit" && !pr.comments.some(comment => comment.body.includes(marker))) {
      await gh("pr", "comment", pr.url, "--body", "@codex review\n\n" + marker);
    }
    const review = pr.comments.findLast(c => c.body.includes("codex-review-state:v1") && c.body.includes(head) &&
      c.author.login.replace(/\[bot\]$/, "") === "chatgpt-codex-connector");
    if (!review) return { status: "PENDING", commitSha: head, pullRequestUrl: pr.url };
    const verifier = createLocalReleaseOperations(root, { format: record.format });
    try { await verifier.verifyCodeReview(pr.url, review.url, head); }
    catch (error) {
      if (!(error instanceof Error) || error.message !== "CODE_REVIEW_NOT_CLEAN_CURRENT_HEAD") throw error;
      const number = new URL(pr.url).pathname.split("/").at(-1);
      if (!number || !/^[1-9]\d*$/.test(number)) throw new Error("IMPROVE_PR_INVALID");
      const notes = JSON.parse(await gh("api", "--paginate", "--slurp", `repos/{owner}/{repo}/pulls/${number}/comments?per_page=100`)) as {
        commit_id: string; path: string; line: number | null; body: string; user: {login: string};
      }[][];
      const findings = notes.flat().filter(note => note.commit_id === head && note.user.login === "chatgpt-codex-connector[bot]")
        .map(({ path, line, body }) => ({ path, line, body }));
      return { status: "CHANGES_REQUESTED", commitSha: head, pullRequestUrl: pr.url, evidenceUrl: review.url, reviewText: review.body, findings };
    }
    if (pr.state !== "MERGED") return { status: "PENDING_MERGE", commitSha: head, pullRequestUrl: pr.url, evidenceUrl: review.url };
    const reviewFile = path.join(root, ".automation/article-imports/improve", publicationKey, "reviews", head + ".json");
    await writeJsonAtomically(reviewFile, { schemaVersion: "ImportCodeReviewV1",
      passed: true, independent: true, reviewer: "codex", reviewedCommitSha: head, pullRequestUrl: pr.url,
      evidenceUrl: review.url, reviewedAt: new Date(review.createdAt).toISOString() });
    return { status: "REVIEWED", commitSha: head, review: await evidenceReference(root, reviewFile) };
  }
  for await (const line of createInterface({ input: process.stdin })) {
    const request = JSON.parse(line);
    if (request.id === undefined) continue;
    let result: unknown;
    if (request.method === "initialize") result = { protocolVersion: request.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "improve", version: "1" } };
    else if (request.method === "tools/list") result = { tools: (Object.keys(schemas) as (keyof typeof schemas)[])
      .filter(n => n === "retain" || packet.improvePhase === "RESOLVING")
      .map(n => ({ name: n, description: descriptions[n], inputSchema: z.toJSONSchema(schemas[n]) })) };
    else if (request.method === "tools/call") {
      try { result = { content: [{ type: "text", text: JSON.stringify(await call(request.params.name, request.params.arguments)) }] }; }
      catch (error) { result = { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "IMPROVE_TOOL_FAILED" }] }; }
    } else if (request.method === "ping") result = {};
    else { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Unknown method" } }) + "\n"); continue; }
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }) + "\n");
  }
}
if (require.main === module) server(process.argv[2], process.argv[3]).catch(() => { process.exitCode = 1; });
