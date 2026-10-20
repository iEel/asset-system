// The E2E workflow suite (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md): `npm run test:e2e`.
// Kept out of `npm test`: its files are e2e/**/*.spec.ts and e2e/setup/*.setup.ts, never *.test.ts under tests/.
import { defineConfig } from "@playwright/test"
import { guardAppEnv } from "./e2e/support/app-env.ts"
import { DESKTOP, E2E_PROJECTS, type E2eTestOptions, type E2eWorkerOptions } from "./e2e/support/matrix.ts"
import { ARTIFACTS_DIR, e2eBaseUrl, e2ePort, REPORT_DIR } from "./e2e/support/paths.ts"

// The guard, first (spec §5): Playwright starts the web server before the global setup, so the config itself checks
// the env files next start reads, and stops on anything but asset_management_dev with the login asset_dev.
guardAppEnv(process.cwd())

const baseURL = e2eBaseUrl()

export default defineConfig<E2eTestOptions, E2eWorkerOptions>({
  testDir: "e2e",
  outputDir: ARTIFACTS_DIR,
  globalSetup: "./e2e/global-setup.ts",
  // The workflows write to the dev database through the app; one worker keeps the run in a readable order.
  workers: 1,
  fullyParallel: false,
  // A retry would sign in again and create a second set of records: a failure is reported, never retried.
  retries: 0,
  forbidOnly: true,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: REPORT_DIR, open: "never" }], ["./e2e/support/summary-reporter.ts"]],
  use: {
    baseURL,
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // A production build (spec §5): `npm run build` first; the suite starts next start on its own port and stops it after.
  // The app's base URL is this server's, so a sign-in stays on it.
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${e2ePort()}`,
    url: `${baseURL}/th/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    // The app's only sender is the notification digest's webhook (src/lib/notification-delivery.ts): blank for the app
    // under test, so nothing it does reaches outside (spec §5). The process environment wins over the env files.
    env: { AUTH_URL: baseURL, NEXTAUTH_URL: baseURL, NOTIFICATION_DIGEST_WEBHOOK_URL: "" },
    stdout: "ignore",
    stderr: "pipe",
  },
  projects: [
    // The run's data and users, created once through the app as the seed admin (spec §7). No trace: it types passwords.
    {
      name: "setup",
      testMatch: /setup[\\/][^\\/]+\.setup\.ts$/,
      use: { ...DESKTOP, trace: "off", screenshot: "off" },
    },
    // Every workflow four times (spec §6): desktop and phone, light and dark.
    ...E2E_PROJECTS.map((project) => ({
      name: project.name,
      testMatch: /\.spec\.ts$/,
      dependencies: ["setup"],
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
