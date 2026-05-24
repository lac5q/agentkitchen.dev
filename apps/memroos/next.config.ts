import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    ignoreIssue: [
      {
        path: "**/next.config.ts",
        title: "Encountered unexpected file in NFT list",
      },
    ],
  },
  outputFileTracingExcludes: {
    "/api/library/qmd-update": ["./next.config.ts"],
    "/api/**/*": ["./next.config.ts"],
    "/*": ["./next.config.ts"],
  },
};

export default nextConfig;
