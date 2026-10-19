// The suite's test object: every spec imports test and expect from here, never from @playwright/test. It gives each
// test:
// - the project's device and theme (playwright.config.ts sets e2eDevice and e2eTheme from e2e/support/matrix.ts);
// - its browser: Chromium, or WebKit on the phone for a file that calls runPhoneOnWebKit() (spec §8), with the
//   phone's user agent of that browser;
// - the theme cookie, set before the first page (spec §8 "Themes"), and the matching color scheme;
// - the signed-in user of its file (asUser), from the run's storage states, so no test signs in;
// - its measurements (measure.ts), started before it and checked after it.
// The fixtures name their callback provide, not use: the React hooks lint reads a call of use as a hook.
import { test as base, expect } from "@playwright/test"
import { browserFor, phoneUserAgent, type E2eBrowser, type E2eTestOptions, type E2eWorkerOptions } from "./matrix.ts"
import { Measure } from "./measure.ts"
import { authStateFile, fromRoot } from "./paths.ts"
import type { E2eUserKey } from "./run-plan.ts"
import { readRunState } from "./state.ts"

type SuiteTestOptions = E2eTestOptions & { e2eUser: E2eUserKey | null }

export const test = base.extend<SuiteTestOptions & { measure: Measure }, E2eWorkerOptions>({
  e2eDevice: ["desktop", { option: true, scope: "worker" }],
  webkitOnPhone: [false, { option: true, scope: "worker" }],
  e2eTheme: ["light", { option: true }],
  e2eUser: [null, { option: true }],
  browserName: [async ({ e2eDevice, webkitOnPhone }, provide) => provide(browserFor(e2eDevice, webkitOnPhone)), { scope: "worker" }],
  userAgent: async ({ e2eDevice, browserName }, provide) => provide(phoneUserAgent(e2eDevice, browserName as E2eBrowser)),
  colorScheme: async ({ e2eTheme }, provide) => provide(e2eTheme),
  storageState: async ({ e2eUser }, provide) => provide(e2eUser ? fromRoot(authStateFile(readRunState().runId, e2eUser)) : undefined),
  context: async ({ context, e2eTheme, baseURL }, provide) => {
    if (!baseURL) throw new Error("playwright.config.ts sets use.baseURL")
    await context.addCookies([{ name: "theme", value: e2eTheme, url: baseURL }])
    await provide(context)
  },
  measure: [
    async ({ page, e2eDevice, e2eTheme, browserName, e2eUser }, provide, testInfo) => {
      const measure = new Measure(page, testInfo, { device: e2eDevice, theme: e2eTheme, browser: browserName, user: e2eUser })
      measure.start()
      await provide(measure)
      await measure.finish()
    },
    { auto: true },
  ],
})

export { expect }

// The file's phone runs use WebKit (spec §8: the field audit walk and the desk delivery); its desktop runs stay on
// Chromium. Call it at the top level of the spec file: the browser is a worker option.
export function runPhoneOnWebKit() {
  test.use({ webkitOnPhone: true })
}

// The file's tests run as this E2E user (spec §7), signed in through the run's storage state: no test signs in.
export function asUser(user: E2eUserKey) {
  test.use({ e2eUser: user })
}
