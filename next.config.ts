import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The immutable baseline has an incomplete route inventory. Restore typed routes
  // after the Phase One route set is committed and covered by route tests.
  typedRoutes: false,
  async rewrites() {
    const approvedPreview = {
      source: "/landing-page-previews/:slug",
      has: [{ type: "query" as const, key: "importId", value: "(?<articleId>article-[0-9a-f-]{36})" }],
      destination: "/dev/approved-article-preview/:slug?importId=:articleId&packetPreview=1",
    };
    return { beforeFiles: process.env.NODE_ENV === "development" ? [approvedPreview] : [], afterFiles: [], fallback: [] };
  },
  // Keep package resolution inside the selected checkout. Without an explicit
  // root, Turbopack can treat src/app/../../node_modules as outside a linked
  // worktree on Windows and fail before compiling application code.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
