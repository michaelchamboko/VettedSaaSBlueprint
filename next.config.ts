import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The immutable baseline has an incomplete route inventory. Restore typed routes
  // after the Phase One route set is committed and covered by route tests.
  typedRoutes: false,
};

export default nextConfig;
