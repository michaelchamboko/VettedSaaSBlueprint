import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateDesignReferenceCatalogueDirectory } from "../src/lib/design-references/catalogue-directory";

export { validateDesignReferenceCatalogueDirectory };

async function main() {
  const directoryFlag = process.argv.indexOf("--dir");
  const directory = directoryFlag >= 0 ? process.argv[directoryFlag + 1] : path.join(process.cwd(), "docs", "design-references", "landing-pages");
  if (!directory) throw new Error("--dir requires a catalogue directory.");
  const errors = await validateDesignReferenceCatalogueDirectory(path.resolve(directory));
  process.stdout.write(`${JSON.stringify({ valid: errors.length === 0, errors }, null, 2)}\n`);
  if (errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
