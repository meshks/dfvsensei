import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Some sandboxes pre-install Chromium outside Playwright's own managed cache and
// skip `playwright install` entirely (see repo environment notes) -- point at it
// explicitly when present. Falls back to Playwright's normal resolution
// (its managed browser cache) everywhere else, so this doesn't break a normal
// `pnpm exec playwright install && pnpm test:e2e` setup.
const SANDBOX_CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const chromiumExecutablePath = existsSync(SANDBOX_CHROMIUM_PATH)
  ? SANDBOX_CHROMIUM_PATH
  : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {},
      },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
