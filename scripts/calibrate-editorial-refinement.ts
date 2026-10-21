import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const definitions = [
  { format: "decision", source: "src/content/decision-journeys/sets/governed-ai-client-work-preparation.json", changes: [
    { ...{"path":"pages.decisionHub.decisionContext","category":"overly_cautious","changeExplanation":"The abstract 'pilot question' phrasing delays the actual decision. The revision states the question and then gives the same limits separately.","integrityCheck":"Controlled internal pilot remains conditional. Neither a universal recommendation nor client-information permission is added. Evidence records and disclosure-related content remain unchanged."}, after: "The evidence supports asking whether to run a controlled internal pilot. It gives neither a universal recommendation nor permission to use client information." },
    { ...{"path":"pages.decisionHub.blocks.1.summary","category":"overly_cautious","changeExplanation":"The indirect 'choice is whether ... can be made' construction puts distance between the reader and the decision. A direct question retains the uncertainty without that extra framing.","integrityCheck":"The bounded workflow, manual baseline and safer-and-more-useful comparison remain. 'Can' still expresses uncertainty. No facts, permissions or disclosures change."}, after: "Can a bounded preparation workflow be safer and more useful than the team's current manual process? That is the decision." },
  ], semanticNotes: "Both passages retain the controlled-pilot boundary and the comparison with the manual process. No recommendation, client-data permission or evidence certainty was added." },
  { format: "landing", source: "src/generated/landing-pages/moosend-email-marketing-automation.json", changes: [
    { ...{"path":"hero.subheadline","category":"generic","changeExplanation":"The long audience-and-tasks sentence ends in a generic one-off contrast. Splitting it makes the repeatability requirement easier to read.","integrityCheck":"Small marketing teams remain the audience; email building, segmentation and repeatable follow-up remain the tasks. No product capability or performance claim is added. Affiliate disclosures and destinations are unchanged."}, after: "For small marketing teams building emails, segmenting an audience and setting up repeatable follow-up. The first campaign should be something the team can run again." },
    { ...{"path":"problem_solution.problem","category":"generic","changeExplanation":"The feature-list framing delays the buyer's practical question. Two short sentences separate that setup from the campaign-repeatability decision.","integrityCheck":"Platforms only 'can' look interchangeable; the same conditional wording and workflow question remain. No vendor comparison or unsupported fact is added. Disclosures and destinations are unchanged."}, after: "Email platforms can look interchangeable on a feature list. The useful question is whether your team can turn one campaign into repeatable follow-up." },
  ], semanticNotes: "The same small-team audience, campaign tasks and repeatability question remain. No new product capability, pricing or performance claim was introduced. Disclosures and CTAs are unchanged." },
  { format: "blog", source: "src/generated/blog-posts/posts.json", changes: [
    { ...{"path":"answerSummary","category":"strong","changeExplanation":"The original already gives concrete controls and a useful answer. A light edit splits its long checklist sentence and removes the novelty aside; no new advice is needed.","integrityCheck":"Consent, access, real-script and language testing, approval, takedown and human release review all remain. The demo still starts rather than completes evaluation. No source, qualifier, disclosure or destination is altered."}, after: "Treat a voice clone as a controlled production asset. Confirm the speaker's informed consent and restrict who can create and export audio. Test the voice on the scripts and languages you actually use, document approval and takedown paths, and keep a human reviewer responsible for every release. A convincing demo starts the evaluation; it does not finish it." },
    { ...{"path":"sections.0.paragraphs.0","category":"strong","changeExplanation":"The original is specific and preserves a meaningful consent caveat. A light edit combines its opening contrast into a direct instruction and shortens the description of the speaker.","integrityCheck":"Proof of understood and permitted use remains required. Channels, languages, territories, duration, operators and the conditional expansion caveat remain. No legal assurance or experience claim is introduced; disclosures and sources are unchanged."}, after: "Before judging how convincing a clone sounds, check whether the organization can prove that the speaker understood and permitted its intended uses. Record the permitted channels, languages, territories, duration and people allowed to operate the tool. A generic release offers little reassurance if the workflow later expands into advertising, support calls or localization the speaker never considered." },
  ], semanticNotes: "Consent, access restrictions, representative testing, release review and takedown requirements remain. The release caveat preserves the same examples and uncertainty. The revised prose adds no personal testing claim or legal conclusion." },
];
async function main() {
  const directory = path.resolve("build-pack/editorial/calibration-2026-10-21");
  const scratch = path.resolve("build-pack/runtime/editorial-calibration");
  await mkdir(directory, { recursive: true });
  await mkdir(scratch, { recursive: true });
  const passages: unknown[] = [];
  for (const definition of definitions) {
    const raw = JSON.parse(await readFile(definition.source, "utf8"));
    const before = definition.format === "blog" ? raw[0] : raw;
    const after = structuredClone(before);
    for (const change of definition.changes) {
      const parts = change.path.split(".");
      let cursor = after;
      for (const part of parts.slice(0, -1)) cursor = cursor[part];
      const key = parts.at(-1)!;
      passages.push({ format: definition.format, source: definition.source, path: change.path, category: change.category, changeExplanation: change.changeExplanation, integrityCheck: change.integrityCheck, before: cursor[key], after: change.after });
      cursor[key] = change.after;
    }
    const beforeFile = path.join(scratch, definition.format + "-before.json");
    const afterFile = path.join(scratch, definition.format + "-after.json");
    const notesFile = path.join(scratch, definition.format + "-notes.json");
    await writeFile(beforeFile, JSON.stringify(before));
    await writeFile(afterFile, JSON.stringify(after));
    const exceptions: Record<string, string[]> = {"decision":["The eight retained rhythm hits name governance controls, workflow inputs or review criteria in unchanged passages. These are substantive lists, not new rhetorical filler; the two revised passages add no checker findings."],"landing":[],"blog":["The retained 'can help you examine' wording limits what a product review can establish and immediately excludes rights analysis and real-script testing. The four retained rhythm hits enumerate evaluation criteria and release controls or describe disclosure records in unchanged passages; they do not claim new proof."]};
    await writeFile(notesFile, JSON.stringify({ semanticNotes: definition.semanticNotes, exceptions: exceptions[definition.format], meaningPreserved: true, arrayOrderPreserved: true }));
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/compare-editorial-artifacts.ts", definition.format, beforeFile, afterFile, notesFile, path.join(directory, definition.format + ".json")], { stdio: "inherit" });
    if (result.error || result.status !== 0) throw new Error(`Calibration failed for ${definition.format}: ${result.error?.message ?? result.status}`);
  }
  await writeFile(path.join(directory, "passages.json"), JSON.stringify({ status: "unpublished calibration only", passages }, null, 2) + "\n", { flag: "wx" });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
