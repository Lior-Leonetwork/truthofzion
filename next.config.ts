import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is prerendered from content/ at build time; publishing is a
  // reviewed pull request followed by a rebuild.
  experimental: {
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
