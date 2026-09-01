import assert from "node:assert/strict";
import test from "node:test";

import { listPublishedBlogPosts } from "../src/lib/blog/catalogue";
import { auditBlogCollection, auditBlogPost } from "../src/lib/blog/quality";

test("every published article passes the project-owned AEO quality gate", () => {
  for (const post of listPublishedBlogPosts()) {
    assert.deepEqual(auditBlogPost(post), [], post.slug);
  }
});

test("the collection is unique, complete, and links only to published reviews", () => {
  assert.deepEqual(auditBlogCollection(listPublishedBlogPosts()), []);
});

test("articles contain no direct affiliate destinations or long dash characters", () => {
  for (const post of listPublishedBlogPosts()) {
    const serialized = JSON.stringify(post);
    assert.doesNotMatch(serialized, /partnerstack|pscr\.pt|go\.vettedsaasblueprint/i);
    assert.doesNotMatch(serialized, /[\u2013\u2014]/);
  }
});

test("articles provide citable answers, primary evidence, and practical actions", () => {
  for (const post of listPublishedBlogPosts()) {
    assert.ok(post.answerSummary.length >= 120, post.slug);
    assert.ok(post.sources.length >= 3, post.slug);
    assert.ok(
      post.sources.filter((source) => source.kind !== "vendor").length >= 1,
      post.slug,
    );
    assert.ok(post.sections.length >= 5, post.slug);
    assert.ok(
      post.sections.some((section) => (section.checklist?.length ?? 0) >= 4),
      post.slug,
    );
    assert.ok(post.faqs.length >= 3, post.slug);
  }
});
