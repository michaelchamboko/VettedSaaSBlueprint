import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const outdir = resolve(process.cwd(), ".stage2", "hermes-worker");
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: {
    "hermes-landing-worker": "hermes/landing-research-worker.ts",
    "hermes-product-identity": "hermes/executors/product-identity.ts",
    "hermes-landing-research": "hermes/executors/landing-research.ts",
  },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir,
  outExtension: { ".js": ".mjs" },
  sourcemap: false,
  legalComments: "none",
});
process.stdout.write(JSON.stringify({ status: "built", target: "node22", output: "hermes-landing-worker.mjs" }) + "\n");
