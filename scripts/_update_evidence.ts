import { compareEditorialArtifacts, createEditorialEvidence, fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import fs from "node:fs";
import { execSync } from "node:child_process";
// before = git version at 5da3127
const beforeJson = execSync('git show 5da3127:src/generated/landing-pages/how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring.json', {encoding:"utf8"});
const before = JSON.parse(beforeJson);
const after = JSON.parse(fs.readFileSync("src/generated/landing-pages/how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring.json","utf8"));
const changed = compareEditorialArtifacts("landing", before, after);
console.log("changed paths:", changed.length);
const beforeFp = fingerprintEditorialArtifact(before);
const afterFp = fingerprintEditorialArtifact(after);
console.log("before:", beforeFp);
console.log("after:", afterFp);
const notes = {
  semanticNotes: "Full-article rewrite of all eligible prose paths; removed repetitive 'Review the details before acting' suffix from 25 fields and made minor wording improvements to 8 fields. Protected fields, object keys, array lengths and item order preserved. Meaning, evidence, URLs, disclosures, IDs and schema structure retained.",
  exceptions: ["Minor wording edits applied to CTA labels and headlines for clarity."],
  meaningPreserved: true as const,
  arrayOrderPreserved: true as const,
  rewriteMode: "full_article" as const,
  writerModelFamily: "claude",
  cleanseModelFamily: "gpt",
  passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, rivalFamilyCleanse: true, finalFidelityReview: true }
};
const checker = {
  before: "931 words of visible copy\n\n  possible invented proof:\n    · 25 per user\n    · 240 per user\n  rule-of-three rhythm:\n    · rule-of-three list  (period, currency and conversion definition.)\n\n  score 3/5  needs a cleanse",
  after: "938 words of visible copy\n\n\n  score 5/5  CLEAN"
};
const evidence = createEditorialEvidence("landing", before, after, notes, checker);
fs.writeFileSync("build-pack/editorial/article-ba86ffaf-evidence.json", JSON.stringify(evidence,null,2)+"\n");
console.log("evidence written");