// The E2E workflow suite (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md): `npm run test:e2e`.
// Kept out of `npm test`: its files are e2e/**/*.spec.ts and e2e/setup/*.setup.ts, never *.test.ts under tests/.
import { defineConfig } from "@playwright/test"
import { E2E_PROJECTS, type E2eTestOptions, type E2eWorkerOptions } from "./e2e/support/matrix.ts"
import { ARTIFACTS_DIR, e2eBaseUrl, REPORT_DIR } from "./e2e/support/paths.ts"

const baseURL = e2eBaseUrl()

export default defineConfig<E2eTestOptions, E2eWorkerOptions>({
  testDir: "e2e",
  outputDir: ARTIFACTS_DIR,
  // The workflows write to the dev database through the app; one worker keeps the run in a readable order.
  workers: 1,
  fullyParallel: false,
  // A retry would sign in again and create a second set of records: a failure is reported, never retried.
  retries: 0,
  forbidOnly: true,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: REPORT_DIR, open: "never" }]],
  use: {
    baseURL,
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // Every workflow four times (spec §6): desktop and phone, light and dark.
    ...E2E_PROJECTS.map((project) => ({
      name: project.name,
      testMatch: /\.spec\.ts$/,
      use: {
        viewport: project.viewport,
        screen: project.screen,
        deviceScaleFactor: project.deviceScaleFactor,
        isMobile: project.isMobile,
        hasTouch: project.hasTouch,
        e2eDevice: project.device,
        e2eTheme: project.theme,
      },
    })),
  ],
})
