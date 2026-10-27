import { readFile } from "node:fs/promises";
import { advanceImport, ensureImportContentApproval, ensureImportPresentation, loadImport, recordImportPresentation } from "../src/lib/article-import/engine";
import { presentationInputFromVerifier } from "../src/lib/article-import/presentation";

function argument(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
export async function recordArticlePresentation(root: string, importId: string, receipt: string, designReceipt: string) {
  let record = await ensureImportContentApproval(root, await loadImport(root, importId));
  if (!record.contentApproval) throw new Error("The current artifact needs fresh content approval.");
  if (record.stage !== "VALIDATING") record = await ensureImportPresentation(root, record);
  if (record.stage !== "VALIDATING") throw new Error("Presentation can only be recorded during VALIDATING.");
  const pageDesign = JSON.parse(await readFile(designReceipt, "utf8"));
  record = await recordImportPresentation(root, record, await presentationInputFromVerifier(root, record, receipt, pageDesign));
  return advanceImport(root, record, "Local candidate presentation verified; ready for release review.");
}
async function main() {
  const importId = argument("--import-id");
  const receipt = argument("--receipt");
  const designReceipt = argument("--design-receipt");
  if (!importId || !receipt || !designReceipt) throw new Error("Use --import-id <id> --receipt <local-candidate-verifier.json> --design-receipt <page-design.json>.");
  const record = await recordArticlePresentation(process.cwd(), importId, receipt, designReceipt);
  console.log(JSON.stringify({ importId: record.importId, stage: record.stage, presentation: record.presentation }, null, 2));
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/record-article-presentation.ts")) {
  void main().catch((error) => { console.error(error); process.exitCode = 1; });
}
