import assert from "node:assert/strict";
import test from "node:test";

import {
  getPublishedBlogPost,
  listPublishedBlogPostParams,
  listPublishedBlogPosts,
} from "../src/lib/blog/catalogue";

test("the first release exposes exactly ten distinct buyer guides", () => {
  const posts = listPublishedBlogPosts();

  assert.equal(posts.length, 10);
  assert.equal(new Set(posts.map((post) => post.slug)).size, 10);
  assert.equal(new Set(posts.map((post) => post.title)).size, 10);
  assert.equal(new Set(posts.map((post) => post.buyerQuestion)).size, 10);
  assert.deepEqual(
    posts.map((post) => post.cyclePosition),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
});

test("published blog posts are addressable through stable route params", () => {
  const params = listPublishedBlogPostParams();

  assert.equal(params.length, 10);
  assert.deepEqual(params[0], {
    slug: "production-ready-ai-voice-cloning-checklist",
  });
  assert.equal(getPublishedBlogPost(params[0].slug)?.cyclePosition, 1);
  assert.equal(getPublishedBlogPost("not-a-real-post"), null);
});

test("the planned cadence keeps positions three, six, and nine trend-led", () => {
  const trendPositions = listPublishedBlogPosts()
    .filter((post) => post.publicationType === "trend")
    .map((post) => post.cyclePosition);

  assert.deepEqual(trendPositions, [3, 6, 9]);
});
