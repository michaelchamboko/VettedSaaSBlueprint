import { readFileSync } from "node:fs";
import path from "node:path";

import { blogPostSchema, type BlogPost } from "./contracts";

function loadCatalogue(): BlogPost[] {
  try {
    const cataloguePath = path.join(process.cwd(), "src", "generated", "blog-posts", "posts.json");
    const parsed: unknown = JSON.parse(readFileSync(cataloguePath, "utf8"));
    const result = blogPostSchema.array().safeParse(parsed);

    if (!result.success) {
      console.error("Generated blog catalogue failed validation.", result.error.flatten());
      return [];
    }

    return result.data.toSorted((left, right) => left.cyclePosition - right.cyclePosition);
  } catch (error) {
    console.error("Generated blog catalogue could not be loaded.", error);
    return [];
  }
}

const publishedPosts = loadCatalogue();

export function listPublishedBlogPosts(): BlogPost[] {
  return publishedPosts;
}

export function listPublishedBlogPostParams(): Array<{ slug: string }> {
  return publishedPosts.map(({ slug }) => ({ slug }));
}

export function getPublishedBlogPost(slug: string): BlogPost | null {
  return publishedPosts.find((post) => post.slug === slug) ?? null;
}
