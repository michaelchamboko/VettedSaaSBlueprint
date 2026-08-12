import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const files = ["hermes-landing-worker.mjs", "hermes-product-identity.mjs", "hermes-landing-research.mjs"];
const fileHashes = Object.fromEntries(await Promise.all(files.map(async (file) => {
  const source = await readFile(resolve(outdir, file));
  return [file, createHash("sha256").update(source).digest("hex")];
})));
const bundleSha256 = createHash("sha256").update(JSON.stringify(fileHashes)).digest("hex");
const manifest = {
  bundle_sha256: bundleSha256,
  files: fileHashes,
  source_commit_sha: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
};
await writeFile(resolve(outdir, "bundle-manifest.json"), `${JSON.stringify(manifest)}\n`, "utf8");
process.stdout.write(JSON.stringify({ status: "built", target: "node22", output: "hermes-landing-worker.mjs", bundleSha256 }) + "\n");
