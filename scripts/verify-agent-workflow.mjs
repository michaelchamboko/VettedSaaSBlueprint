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
  ".agents/skills/before-and-after/scripts/adapters/0x0st.sh": "08541f18c7253cbba5c919a0eab54f8a63eae9e30e71a296783866702a262a09",
  ".agents/skills/before-and-after/scripts/adapters/blob.sh": "10f915c96ef52a6ebe9c18b849328b872b7be0a62d823b099f40466055eef8ca",
  ".agents/skills/before-and-after/scripts/adapters/gist.sh": "25565e137dc1071beb3959037fe816a68cad7ae335aca68832c277382a50cce9",
  ".agents/skills/before-and-after/scripts/capture.sh": "a5df8a62e28e9c78df64c63bb2b6c3a8c9a3fbe7d6b99c2990d27f1b9ed052fb",
  ".agents/skills/before-and-after/scripts/upload-and-copy.sh": "b24c807e70ddd9590827aad41cc3b67a37aa8380280edc53b2987d32578a658f",
  ".agents/skills/before-and-after/SKILL.md": "8b3ce992ccf3153a9de5a83712968725946b3cd71a2a13a119bb60295713d8ad",
  ".agents/skills/code-review/SKILL.md": "2f25829e278a76174c98ac5a7969a34be7219d95c9142328da7bcfda252d7a08",
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
for (const marker of ["<!-- build-faster-skills:workflow:start -->", "<!-- build-faster-skills:workflow:end -->", "Every repository-changing task", "**Isolate**", "**Build**", "**Prove**", "**Ship**", "no merge without owner approval", "design-taste-frontend", "Impeccable", "npm run verify:agent-workflow", "npm run lint", "npm run typecheck", "npm test"]) {
  if (!agents.includes(marker)) fail(`AGENTS.md marker or requirement missing: ${marker}`);
}
const packageJson = JSON.parse(await read("package.json"));
if (packageJson.scripts?.test !== "node scripts/run-active-tests.mjs") fail("npm test wiring drifted");
if (packageJson.scripts?.["verify:agent-workflow"] !== "node scripts/verify-agent-workflow.mjs") fail("contract script wiring drifted");

if (process.exitCode) process.exit(process.exitCode);
console.log("Agent workflow contract passed: pinned upstream, vendored hashes, AGENTS markers, and npm wiring are intact.");
