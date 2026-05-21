import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = process.env.MEMROOS_ROOT || path.resolve(__dirname, "../..");

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
    root: monorepoRoot,
  },
};

export default nextConfig;
