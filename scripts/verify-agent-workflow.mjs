import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFile(resolve(root, file), "utf8");
const fail = (message) => {
  console.error(`Agent workflow contract failed: ${message}`);
  process.exitCode = 1;
};

const manifest = JSON.parse(await read(".agents/build-faster-skills.lock.json"));
const expectedCommit = "2a8e2bee0a3fcc078786c9a741f2341b0a6dae56";
if (manifest.source?.url !== "https://github.com/michaelchamboko/build-faster-skills.git") fail("upstream URL drifted");
if (manifest.source?.commit !== expectedCommit) fail("upstream commit drifted");
const expectedSkills = ["new-feature", "code-structure", "evidence-driven-testing", "before-and-after", "code-review", "unslop"];
if (JSON.stringify(manifest.requiredSkills) !== JSON.stringify(expectedSkills)) fail("required skill list drifted");
const expectedFiles = {
  ".agents/skills/before-and-after/LICENSE": "6dd71e6a950f1d85ea07643f8075578e5411815577ce61578b969ac6edcee04f",
  ".agents/skills/before-and-after/scripts/adapters/0x0st.sh": "41f7332528c8bed5aef244a852343e4ad74dba29438044e2a3cf0aaa00729a2b",
  ".agents/skills/before-and-after/scripts/adapters/blob.sh": "2f1eb23d5ceefb12a997d68ccdb04ffa0deff77f31187cf3af5442caf91eb815",
  ".agents/skills/before-and-after/scripts/adapters/gist.sh": "3b595606b308c625adbd16b95e72fd1999a1c2d42ad8e00fc7270bc5600bc374",
  ".agents/skills/before-and-after/scripts/capture.sh": "d13c99cf25adfb6f761b8f8b994e3298a893a783e027d042bad724b01949cbf7",
  ".agents/skills/before-and-after/scripts/upload-and-copy.sh": "e23be6b5b3ac2c6635f9cf702326382ac81b797e56687e3d473090567423e472",
  ".agents/skills/before-and-after/SKILL.md": "8b3ce992ccf3153a9de5a83712968725946b3cd71a2a13a119bb60295713d8ad",
  ".agents/skills/code-review/SKILL.md": "6cf7c43896aa01ae33ed0c8a81080063bc7d5d1eab66e2a7263ce0fa16de39be",
  ".agents/skills/code-structure/SKILL.md": "2f0ed408b525c65d422699490a159584fd977d0cfca5b15a5c9a47cf07b95f71",
  ".agents/skills/evidence-driven-testing/scripts/evidence.py": "62ab4e8f689e3d19c9149999ec0d8fbca605f11c4e7581014ab1a34a4cc5a7cf",
  ".agents/skills/evidence-driven-testing/SKILL.md": "94556f36f386d897b9378d1c31408b567c77bc3f6eb9b133737996174f54577b",
  ".agents/skills/new-feature/SKILL.md": "2cdeaddcf9b58f3589d0f0e53d874ce1e6d5bf9d267ea83000c01b492d4af6b6",
  ".agents/skills/unslop/LICENSE": "0b179de8c206d95074651dc54810d1278cbe3c7edef85f6d3eb09c7bd2c2f02f",
  ".agents/skills/unslop/SKILL.md": "75210dcf90be6d0f4e15e6e039e6a52160a9c11d4450fc7834ebee5e2c3bd854"
};
if (JSON.stringify(manifest.files) !== JSON.stringify(expectedFiles)) fail("manifest file inventory or hashes drifted");

for (const [file, expectedHash] of Object.entries(expectedFiles)) {
  try {
    const actualHash = createHash("sha256").update(await read(file)).digest("hex");
    if (actualHash !== expectedHash) fail(`${file} hash mismatch`);
  } catch (error) {
    fail(`${file} is missing (${error.message})`);
  }
}
if (Object.keys(manifest.files ?? {}).length !== 14) fail("vendored file inventory is incomplete");

const agents = await read("AGENTS.md");
for (const marker of ["<!-- build-faster-skills:workflow:start -->", "<!-- build-faster-skills:workflow:end -->", "Every repository-changing task", "**Isolate**", "**Build**", "**Prove**", "**Ship**", "merge and deploy automatically", "design-taste-frontend", "Impeccable", "npm run verify:agent-workflow", "npm run lint", "npm run typecheck", "npm test"]) {
  if (!agents.includes(marker)) fail(`AGENTS.md marker or requirement missing: ${marker}`);
}
const packageJson = JSON.parse(await read("package.json"));
if (packageJson.scripts?.test !== "node scripts/run-active-tests.mjs") fail("npm test wiring drifted");
if (packageJson.scripts?.["verify:agent-workflow"] !== "node scripts/verify-agent-workflow.mjs") fail("contract script wiring drifted");

if (process.exitCode) process.exit(process.exitCode);
console.log("Agent workflow contract passed: pinned upstream, vendored hashes, AGENTS markers, and npm wiring are intact.");
