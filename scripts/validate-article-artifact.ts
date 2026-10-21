import { readFile } from "node:fs/promises";
import { importFormatSchema } from "../src/lib/article-import/contracts";
import { importFormatQualityGates, validateImportArtifact } from "../src/lib/article-import/format-validation";
import { fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";

async function main() {
  const [format, file] = process.argv.slice(2);
  if (!file) throw new Error("An artifact path is required.");
  const parsedFormat = importFormatSchema.exclude(["agent_review_required"]).parse(format);
  const artifact = JSON.parse(await readFile(file, "utf8"));
  const routes = validateImportArtifact(parsedFormat, artifact);
  console.log(JSON.stringify({ passed: true, format: parsedFormat, artifactFingerprint: fingerprintEditorialArtifact(artifact), gate: importFormatQualityGates[parsedFormat], routes }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
