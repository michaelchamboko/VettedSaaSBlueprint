import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DesignReferenceCatalogueV1 } from "../src/lib/design-references/contracts";
import { selectDesignReferences } from "../src/lib/design-references/selector";
import { validateDesignReferenceCatalogueDirectory } from "./validate-design-reference-catalogue";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const category = argument("--category");
  const buyerDecision = argument("--buyer-decision");
  if (!category || !buyerDecision) throw new Error("Usage: tsx scripts/select-design-references.ts --category <slug> --buyer-decision <text> [--tags tag,tag]");
  const cataloguePath = argument("--catalogue") ?? path.join(process.cwd(), "docs", "design-references", "landing-pages", "catalogue.json");
  const validationErrors = await validateDesignReferenceCatalogueDirectory(path.dirname(path.resolve(cataloguePath)));
  if (validationErrors.length) {
    process.stdout.write(`${JSON.stringify({ status: "hold_for_design_direction", reasons: validationErrors }, null, 2)}\n`);
    return;
  }
  const catalogue = DesignReferenceCatalogueV1.parse(JSON.parse(await readFile(cataloguePath, "utf8")));
  const adjacent_category_tags = (argument("--tags") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  process.stdout.write(`${JSON.stringify(selectDesignReferences({ catalogue, product_category: category, adjacent_category_tags, buyer_decision: buyerDecision }), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
