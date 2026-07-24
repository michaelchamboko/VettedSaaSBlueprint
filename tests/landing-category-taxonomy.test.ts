import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeLandingCategory,
  normalizeLandingCategories,
  landingCategoryAliases,
} from "@/lib/landing-workflow/category-taxonomy";

test("category normalization handles known aliases", () => {
  assert.equal(normalizeLandingCategory("CRM"), "crm-tools");
  assert.equal(normalizeLandingCategory("Customer Relationship Management"), "crm-tools");
  assert.equal(normalizeLandingCategory("healthcare practice management"), "saas-tools");
  assert.equal(normalizeLandingCategory("AI voice generator"), "video-audio");
  assert.equal(normalizeLandingCategory("ecommerce analytics"), "analytics");
  assert.equal(normalizeLandingCategory("advertising creative"), "marketing-tools");
});

test("category normalization rejects unknown categories", () => {
  assert.throws(() => normalizeLandingCategory("unknown-category"));
});

test("adjacent tag normalization preserves canonical aliases", () => {
  const normalized = normalizeLandingCategories(["SaaS", "Analytics", "workflow-tools"]).join(",");
  assert.equal(normalized, "saas-tools,analytics,workflow-tools");
});

test("alias map is non-empty and explicit", () => {
  const aliases = Object.entries(landingCategoryAliases);
  assert.ok(aliases.length > 5);
  assert.ok(aliases.some(([alias, canonical]) => alias === "crm" && canonical === "crm-tools"));
});
