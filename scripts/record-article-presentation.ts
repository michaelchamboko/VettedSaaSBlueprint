import { readFile } from "node:fs/promises";
import { advanceImport, ensureImportContentApproval, recordImportPresentation, withImportLease } from "../src/lib/article-import/engine";
import { assertPrimaryArticleCheckout, assertArticleCapabilities, type CapabilityProbe } from "../src/lib/article-import/preflight";
import { presentationInputFromVerifier } from "../src/lib/article-import/presentation";

function argument(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
export async function recordArticlePresentation(root: string, importId: string, receipt: string, designReceipt: string, probe?: CapabilityProbe) {
  await assertPrimaryArticleCheckout(root);
  await assertArticleCapabilities(root, probe);
  return withImportLease(root, importId, async (record) => {
    if (record.stage !== "VALIDATING") throw new Error("Presentation can only be recorded during VALIDATING.");
    const current = await ensureImportContentApproval(root, record);
    if (!current.contentApproval) throw new Error("The current artifact needs fresh content approval.");
    if (current.stage !== "VALIDATING") throw new Error("Presentation can only be recorded during VALIDATING.");
    const pageDesign = JSON.parse(await readFile(designReceipt, "utf8"));
    const input = await presentationInputFromVerifier(root, current, receipt, pageDesign);
    const recorded = await recordImportPresentation(root, current, input);
    if (recorded.stage !== "VALIDATING" || !recorded.presentation) throw new Error("Presentation evidence was not recorded.");
    return advanceImport(root, recorded, "Local candidate presentation verified; ready for release review.");
  });
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
