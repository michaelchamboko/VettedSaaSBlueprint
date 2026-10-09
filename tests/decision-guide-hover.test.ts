import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

const source = readFileSync("src/components/public/HomepageMotion.tsx", "utf8");

function mount(motion = true, guideHover = true) {
  const decks = Array.from({ length: 2 }, () => Array.from({ length: 3 }, (_, index) =>
    Object.assign(new EventTarget(), { open: index === 0 })));
  const cleanups: (() => void)[] = [];
  const timeline = { from: () => timeline };
  const gsap = {
    registerPlugin() {}, set() {}, to() {}, from() {}, timeline: () => timeline,
    utils: { toArray: (selector: string) => selector === ".decision-guide-accordion"
      ? decks.map((cards) => ({ querySelectorAll: () => cards })) : [] },
    matchMedia: () => ({
      add(_query: unknown, callback: (context: unknown) => (() => void) | undefined) {
        const cleanup = callback({ conditions: { motion, desktop: true, guideHover } });
        if (cleanup) cleanups.push(cleanup);
      },
      revert: () => cleanups.forEach((cleanup) => cleanup()),
    }),
    context(callback: () => void) { callback(); return { revert() {} }; },
  };
  const compiledModule = { exports: {} as { HomepageMotion: () => void } };
  let unmount = () => {};
  runInNewContext(transformSync(source, { loader: "tsx", format: "cjs" }).code, {
    module: compiledModule, exports: compiledModule.exports,
    require: (name: string) => {
      if (name === "react") return {
        useRef: () => ({ current: false }),
        useLayoutEffect: (effect: () => () => void) => { unmount = effect(); },
      };
      if (name === "gsap") return gsap;
      if (name === "gsap/ScrollTrigger") return { ScrollTrigger: { batch() {}, create() {} } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    document: { querySelector: () => ({ closest: () => ({}) }) },
  });
  compiledModule.exports.HomepageMotion();
  return { decks, unmount };
}

test("decision decks never pin or select cards from scroll progress", () => {
  assert.doesNotMatch(source, /pin:\s*true|activeDecisionGuideIndex|ScrollTrigger\.create/);
  assert.match(source, /guideHover: "\(min-width: 801px\) and \(hover: hover\) and \(pointer: fine\)"/);
  assert.doesNotMatch(source, /preventDefault\(/);
});

for (const motion of [true, false]) {
  test(`hover opens each card in both directions in both decks, motion=${motion}`, () => {
    const { decks, unmount } = mount(motion);
    for (const cards of decks) {
      for (const index of [1, 2, 1, 0]) {
        cards[index].dispatchEvent(new Event("pointerenter"));
        assert.deepEqual(cards.map((card) => card.open), cards.map((_, i) => i === index));
      }
    }
    unmount();
    decks[0][2].dispatchEvent(new Event("pointerenter"));
    assert.deepEqual(decks[0].map((card) => card.open), [true, false, false]);
  });
}

test("touch and narrow layouts keep native disclosures", () => {
  const { decks, unmount } = mount(true, false);
  decks[0][2].dispatchEvent(new Event("pointerenter"));
  assert.deepEqual(decks[0].map((card) => card.open), [true, false, false]);
  unmount();
});

test("touch input on a hybrid desktop does not trigger hover reveal", () => {
  const { decks, unmount } = mount();
  const touch = Object.assign(new Event("pointerenter"), { pointerType: "touch" });
  decks[0][2].dispatchEvent(touch);
  assert.deepEqual(decks[0].map((card) => card.open), [true, false, false]);
  unmount();
});

test("native summary controls and guide links remain available", () => {
  const accordion = readFileSync("src/components/public/DecisionGuideAccordion.tsx", "utf8");
  assert.match(accordion, /<details[\s\S]*name=\{groupName\}[\s\S]*<summary>/);
  assert.match(accordion, /<Link href=\{item.href\}>/);
  assert.doesNotMatch(source, /addEventListener\("(?:click|keydown|keyup)"/);
});
