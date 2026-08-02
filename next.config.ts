import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Type errors must be caught by `pnpm typecheck` in CI; never silently ignored at build time.
    ignoreBuildErrors: false,
  },
  // Next 16 dropped built-in ESLint build integration; `pnpm lint` is a separate CI gate
  // (see TEST_STRATEGY.md §6) rather than a next.config option.
};

export default nextConfig;
