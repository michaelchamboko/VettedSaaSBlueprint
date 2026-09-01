import { access } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { listPublishedBlogPosts } from "../src/lib/blog/catalogue";
import { auditBlogCollection } from "../src/lib/blog/quality";

async function main() {
  const posts = listPublishedBlogPosts();
  const failures = auditBlogCollection(posts);

  for (const post of posts) {
    for (const media of [post.media.hero, post.media.figure]) {
      const filePath = path.join(process.cwd(), "public", media.path.replace(/^\//, ""));
      try {
        await access(filePath);
        const metadata = await sharp(filePath).metadata();
        if (metadata.width !== media.width || metadata.height !== media.height || metadata.format !== "webp") {
          failures.push(`${post.slug}: media metadata mismatch for ${media.path}`);
        }
      } catch {
        failures.push(`${post.slug}: missing media ${media.path}`);
      }
    }
  }

  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, posts: posts.length, sources: posts.reduce((sum, post) => sum + post.sources.length, 0), images: posts.length * 2 }, null, 2));
  }
}

void main();
