import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs", "document-intelligence", "DESIGN_STANDARDS.json");
const APP_DIR = path.join(ROOT, "src", "app");

const errors = [];
const warnings = [];

function readText(file) {
  return readFileSync(file, "utf8");
}

function walkPageRoutes(dir, prefix) {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const rel = `${prefix}/${entry}`;
    if (existsSync(path.join(full, "page.tsx")) || existsSync(path.join(full, "page.js"))) {
      routes.push(rel);
    }
    routes.push(...walkPageRoutes(full, rel));
  }
  return routes;
}

function normalizeRoute(route) {
  return route
    .split("/")
    .map((segment) => (segment.startsWith("[") ? "*" : segment))
    .join("/")
    .replace(/\/\*$/, "/*");
}

function matchPageType(route, pageTypes) {
  const matches = pageTypes.filter((type) =>
    type.routes.some((pattern) => {
      if (pattern.endsWith("/*")) {
        return route === pattern || route.startsWith(pattern.slice(0, -1));
      }
      return route === pattern;
    }),
  );
  return matches;
}

function isInt1To10(value) {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

const manifest = JSON.parse(readText(MANIFEST_PATH));

if (manifest.schema !== "design-standards-v1") {
  errors.push(`Unsupported design standards schema: ${manifest.schema}`);
}

const patternNames = new Set();
for (const pattern of manifest.patterns) {
  if (patternNames.has(pattern.name)) errors.push(`Duplicate motion pattern name: ${pattern.name}`);
  patternNames.add(pattern.name);
  if (typeof pattern.purpose !== "string" || pattern.purpose.trim().length < 40) {
    errors.push(`DS-MOT-001: pattern "${pattern.name}" lacks a declared purpose (>= 40 chars)`);
  }
  if (pattern.reducedMotionFallback !== "static") {
    errors.push(`DS-MOT-004: pattern "${pattern.name}" must declare reducedMotionFallback "static"`);
  }
  if (pattern.delaysContent !== false) {
    errors.push(`DS-MOT-005: pattern "${pattern.name}" must declare delaysContent false`);
  }
  if (pattern.library !== "approved-internal" && pattern.reviewLogged !== true) {
    errors.push(`DS-MOT-006: pattern "${pattern.name}" is not from an approved library and is not logged for review`);
  }
}

const seenPageTypeIds = new Set();
for (const type of manifest.pageTypes) {
  if (seenPageTypeIds.has(type.id)) errors.push(`Duplicate pageType id: ${type.id}`);
  seenPageTypeIds.add(type.id);

  if (type.signatureInteraction === "delegated") continue;

  if (!type.tasteSettings) {
    errors.push(`Taste settings missing for pageType "${type.id}" (doc 04 §33 checklist)`);
  } else {
    const { variance, motion, density } = type.tasteSettings;
    if (!(isInt1To10(variance) && isInt1To10(motion) && isInt1To10(density))) {
      errors.push(`Taste dials out of range for pageType "${type.id}"`);
    }
  }

  for (const name of type.patterns) {
    if (!patternNames.has(name)) errors.push(`pageType "${type.id}" references unknown motion pattern "${name}"`);
  }

  if (type.signatureInteraction === "required") {
    if (type.patterns.length === 0) {
      errors.push(`DS-MOT-002: pageType "${type.id}" requires a signature interaction but registers no patterns`);
    }
    if (!type.motionComponents?.length || !type.motionHookAttribute) {
      errors.push(`pageType "${type.id}" must bind motionComponents and motionHookAttribute`);
      continue;
    }
    for (const component of type.motionComponents) {
      const file = path.join(ROOT, component);
      if (!existsSync(file)) {
        errors.push(`Motion component missing for "${type.id}": ${component}`);
        continue;
      }
      const source = readText(file);
      if (!source.includes("prefers-reduced-motion: no-preference")) {
        errors.push(`DS-MOT-004: ${component} does not gate motion behind prefers-reduced-motion`);
      }
    }
    const hookFiles = [
      path.join(ROOT, "src", "components", "public"),
      path.join(ROOT, "src", "app"),
    ];
    const found = hookFiles.some((dir) =>
      readdirSync(dir, { recursive: true }).some((entry) => {
        const full = path.join(dir, String(entry));
        return /\.(tsx|ts)$/.test(full) && statSync(full).isFile() && readText(full).includes(type.motionHookAttribute);
      }),
    );
    if (!found) {
      errors.push(`Motion hook "${type.motionHookAttribute}" not attached anywhere for pageType "${type.id}"`);
    }
  }

  if (type.signatureInteraction === "pending-owner-decision") {
    warnings.push(`pageType "${type.id}": signature interaction awaiting owner decision (DS-MOT-002 open)`);
  }
}

const routes = ["", ...walkPageRoutes(APP_DIR, "")]
  .map((route) => (route === "" ? "/" : normalizeRoute(route)))
  .filter((route, index, all) => all.indexOf(route) === index)
  .sort();

for (const route of routes) {
  const matches = matchPageType(route, manifest.pageTypes);
  if (matches.length === 0) {
    errors.push(`Unmapped public route: ${route} (add a pageType to DESIGN_STANDARDS.json)`);
  } else if (matches.length > 1 && new Set(matches.map((m) => m.id)).size > 1) {
    errors.push(`Ambiguous route mapping for ${route}: ${matches.map((m) => m.id).join(", ")}`);
  }
}

const dynamicLiterals = routes.filter((route) => route.includes("*"));
if (dynamicLiterals.length === 0) {
  warnings.push("No dynamic page routes detected; dynamic pattern coverage not exercised");
}

for (const warning of warnings) console.warn(`warn  ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`error ${error}`);
  console.error(`\nDesign standards gate failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(
  `Design standards gate passed: ${manifest.pageTypes.length} page types, ${manifest.patterns.length} approved motion patterns, ${routes.length} public routes mapped.`,
);
