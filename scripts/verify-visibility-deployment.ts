import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { getPublishedVisibilityPage } from "../src/lib/visibility-pages/catalogue";
import { visibilityPageSchema } from "../src/lib/visibility-pages/contracts";
import { readImportArtifactTarget } from "../src/lib/article-import/format-validation";
import { writeImportVerifierEvidence } from "../src/lib/article-import/verification-evidence";

function argument(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
async function main() {
  const origin = new URL(argument("--origin") ?? "https://vettedsaasblueprint.online").origin;
  const artifactPath = argument("--artifact");
  const approved = artifactPath ? await readImportArtifactTarget(process.cwd(), "visibility", artifactPath, argument("--slug")) : undefined;
  const route = approved?.target.renderedRoutes[0] ?? `/${(argument("--slug") ?? "").replace(/^\//, "")}`;
  const record = getPublishedVisibilityPage(route);
  if (!record) throw new Error(`No published visibility target: ${route}`);
  if (approved && JSON.stringify(record.page) !== JSON.stringify(visibilityPageSchema.parse(approved.artifact))) throw new Error("VISIBILITY_PUBLISHED_ARTIFACT_MISMATCH");
  const [robots, sitemap] = await Promise.all(["robots.txt", "sitemap.xml"].map(async (file) => {
    const response = await fetch(`${origin}/${file}`);
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return response.text();
  }));
  if (/^Disallow:\s*\/\s*$/im.test(robots) || !sitemap.includes(`${origin}${route}`)) throw new Error("Visibility discovery checks failed.");
  const output = path.resolve(".automation/receipts/visibility-production");
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const profile of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: profile, reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      const response = await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
      const checks = await page.evaluate(() => ({
        headline: document.querySelector("h1")?.textContent,
        canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
        noindex: document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content.includes("noindex"),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        sections: document.querySelectorAll("main section").length,
      }));
      if (!response?.ok() || checks.headline !== record.page.hero.headline || checks.canonical !== `${origin}${route}` || checks.noindex || checks.overflow || !checks.sections || errors.length) throw new Error(`Visibility ${profile.name} checks failed: ${JSON.stringify({ checks, errors })}`);
      await page.screenshot({ path: path.join(output, `${route.slice(1).replaceAll("/", "-")}-${profile.name}.png`), fullPage: true });
      await page.close();
    }
  } finally { await browser.close(); }
  const result = { ok: true, routes: 1, verifiedRoutes: [route], viewportChecks: 2 };
  await writeImportVerifierEvidence(argument("--receipt"), approved?.target, result);
  console.log(JSON.stringify({ ...result, target: approved?.target }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
