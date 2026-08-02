import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@/app": path.resolve(import.meta.dirname, "./app"),
      "@/components": path.resolve(import.meta.dirname, "./components"),
      "@/domain": path.resolve(import.meta.dirname, "./domain"),
      "@/application": path.resolve(import.meta.dirname, "./application"),
      "@/infrastructure": path.resolve(import.meta.dirname, "./infrastructure"),
      "@/lib": path.resolve(import.meta.dirname, "./lib"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}", "domain/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/unit/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
          hookTimeout: 30000,
          testTimeout: 30000,
        },
      },
    ],
  },
});
