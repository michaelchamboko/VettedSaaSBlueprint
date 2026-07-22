import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "@playwright/test";
import sharp from "sharp";

import { ingestDesignReferences, type ReferenceCaptureAdapter } from "../src/lib/design-references/ingestion";

export function createBoundedPlaywrightReferenceCaptureAdapter(input: {
  browser: Browser;
  navigationTimeoutMs?: number;
  settleDelayMs?: number;
}): ReferenceCaptureAdapter {
  const navigationTimeoutMs = input.navigationTimeoutMs ?? 15_000;
  const settleDelayMs = input.settleDelayMs ?? 250;
  return {
    async capture(url, viewport) {
      const page = await input.browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeoutMs });
        await page.evaluate(async () => { await document.fonts.ready; });
        await page.waitForTimeout(settleDelayMs);
        const png = await page.screenshot({ type: "png" });
        return await sharp(png).webp({ quality: viewport.quality }).toBuffer();
      } finally {
        await page.close();
      }
    },
    close: async () => input.browser.close(),
  };
}

export async function createPlaywrightReferenceCaptureAdapter(): Promise<ReferenceCaptureAdapter> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  return createBoundedPlaywrightReferenceCaptureAdapter({ browser });
}

export async function runDesignReferenceIngestionCli(input: {
  args?: string[];
  catalogueDirectory?: string;
  adapter?: ReferenceCaptureAdapter;
  write?: (output: string) => void;
} = {}) {
  const args = input.args ?? process.argv.slice(2);
  const manifestFlag = args.indexOf("--manifest");
  const manifestPath = manifestFlag >= 0 ? args[manifestFlag + 1] : undefined;
  if (!manifestPath) throw new Error("--manifest requires a local manifest path.");
  const dryRun = args.includes("--dry-run");
  const ci = args.includes("--ci") || process.env.CI === "true";
  const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
  const adapter = input.adapter ?? (!dryRun && !ci ? await createPlaywrightReferenceCaptureAdapter() : undefined);
  try {
    const result = await ingestDesignReferences({
      manifest,
      catalogueDirectory: input.catalogueDirectory ?? path.join(process.cwd(), "docs", "design-references", "landing-pages"),
      adapter,
      dryRun,
      ci,
    });
    (input.write ?? ((output) => process.stdout.write(output)))(`${JSON.stringify(result)}\n`);
    return result;
  } finally {
    await adapter?.close?.();
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void runDesignReferenceIngestionCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
