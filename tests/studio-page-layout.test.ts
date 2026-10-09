import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("shared Studio hero keeps its columns top-aligned and its title sized to the copy column", () => {
  const css = readFileSync("src/app/studio/[slug]/page.module.css", "utf8");
  const hero = css.match(/\.hero \{([^}]+)\}/)?.[1] ?? "";
  const copy = css.match(/\.copy \{([^}]+)\}/)?.[1] ?? "";
  const title = css.match(/\.copy h1 \{([^}]+)\}/)?.[1] ?? "";

  assert.match(hero, /align-items:start/);
  assert.match(hero, /grid-template-columns:minmax\(0,[^)]+\) minmax\(0,[^)]+\)/);
  assert.match(copy, /container-type:inline-size/);
  assert.match(copy, /min-width:0/);
  assert.match(title, /font-size:clamp\([^;]+cqi[^;]+\)/);
  assert.match(title, /overflow-wrap:anywhere/);
  assert.doesNotMatch(title, /max-width:[^;]*ch/);
  assert.equal((css.match(/\.copy h1 \{/g) ?? []).length, 1, "mobile must retain column-responsive title sizing");
  assert.match(css, /@media \(max-width:760px\)[\s\S]*?\.hero \{ grid-template-columns:1fr;/);
});
