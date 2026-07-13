import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/ui",
  outputDir: "test-results/ui",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 100,
      scale: "css",
    },
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    colorScheme: "dark",
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "node scripts/serve-dashboard-ui.mjs",
    url: "http://127.0.0.1:4173/bundles/logger-system/dashboard/log-viewer.html",
    timeout: 30_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 500 },
  },
});
