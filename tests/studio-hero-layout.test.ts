import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("studio hero uses balanced grid and contained heading", () => {
  const css = readFileSync("src/app/studio/[slug]/page.module.css", "utf8");
  assert.match(css, /\.hero\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\);/);
  assert.match(css, /max-width:\s*none/);
  assert.match(css, /font-size:\s*clamp\(2\.75rem,\s*5\.5vw,\s*5\.75rem\)/);
  assert.match(css, /line-height:\s*\.98/);
  assert.match(css, /@media \(max-width: ?1024px\)/);
  assert.doesNotMatch(css, /max-width:\s*9ch/);
  assert.doesNotMatch(css, /7\.5vw,\s*7\.6rem/);
});

test("studio step numbers are positional 01/02/03", () => {
  const catalogue = readFileSync("src/lib/studio-catalogue.ts", "utf8");
  assert.match(catalogue, /"01 \/ Name the moment"/);
  assert.match(catalogue, /"02 \/ Check the working detail"/);
  assert.match(catalogue, /"03 \/ Decide the next experiment"/);
});