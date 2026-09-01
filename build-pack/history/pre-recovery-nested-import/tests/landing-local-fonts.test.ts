import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repositoryRoot = process.cwd();

const landingRendererPaths = [
  "src/components/landing/EditorialReviewPage.tsx",
  "src/components/landing/EditorialV2PreviewPage.tsx",
  "src/components/landing/ReferenceComposedReviewPage.tsx",
] as const;

const requiredLocalFontPackages = [
  "@fontsource/archivo-black",
  "@fontsource/dm-serif-display",
  "@fontsource-variable/dm-sans",
  "@fontsource-variable/fraunces",
  "@fontsource-variable/instrument-sans",
  "@fontsource-variable/manrope",
  "@fontsource-variable/source-sans-3",
  "@fontsource-variable/space-grotesk",
] as const;

test("landing renderers use only locked local font packages", () => {
  const packageJson = JSON.parse(
    readFileSync(path.resolve(repositoryRoot, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };

  for (const relativePath of landingRendererPaths) {
    const source = readFileSync(path.resolve(repositoryRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /next\/font\/google/);
  }

  for (const packageName of requiredLocalFontPackages) {
    assert.match(packageJson.dependencies?.[packageName] ?? "", /^\d+\.\d+\.\d+$/);
  }
});
