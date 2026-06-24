import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, Next infers a parent
  // directory as root because an unrelated lockfile exists higher up.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
