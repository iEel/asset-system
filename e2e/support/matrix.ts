// The E2E suite's device × theme matrix (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §6, §8).
// Plain data and pure functions: playwright.config.ts builds its projects from it, and tests/e2e-suite.test.ts
// (node --test) imports it, so it imports nothing.

export type E2eDevice = "desktop" | "phone"
export type E2eTheme = "light" | "dark"
export type E2eBrowser = "chromium" | "webkit"

// The options a project sets (playwright.config.ts) and the suite's fixtures read (e2e/support/fixtures.ts). The
// browser is a worker option: a spec file asks for WebKit on the phone with runPhoneOnWebKit().
export type E2eTestOptions = { e2eTheme: E2eTheme }
export type E2eWorkerOptions = { e2eDevice: E2eDevice; webkitOnPhone: boolean }

export type E2eProject = {
  name: string
  device: E2eDevice
  theme: E2eTheme
  viewport: { width: number; height: number }
  screen: { width: number; height: number }
  deviceScaleFactor: number
  isMobile: boolean
  hasTouch: boolean
}

// Spec §8: the desktop is 1440×900; the phone is 390×664, the visible area with the browser bars, with touch, DPR 3
// and a mobile user agent.
export const DESKTOP = {
  viewport: { width: 1440, height: 900 },
  screen: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
}
export const PHONE = {
  viewport: { width: 390, height: 664 },
  screen: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
}

// The phone's user agent follows the browser that runs it (Playwright 1.61.1's Pixel 7 and iPhone 15 descriptors).
export const PHONE_USER_AGENTS: Record<E2eBrowser, string> = {
  chromium: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36",
  webkit: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
}

// Every workflow runs four times (spec §6): desktop light, desktop dark, phone light, phone dark.
export const E2E_PROJECTS: readonly E2eProject[] = [
  { name: "desktop-light", device: "desktop", theme: "light", ...DESKTOP },
  { name: "desktop-dark", device: "desktop", theme: "dark", ...DESKTOP },
  { name: "phone-light", device: "phone", theme: "light", ...PHONE },
  { name: "phone-dark", device: "phone", theme: "dark", ...PHONE },
]

// Spec §8: the phone runs on WebKit for the field audit walk and the desk delivery only, on Chromium for the rest; the
// desktop always runs on Chromium. A spec file opts in with runPhoneOnWebKit() (e2e/support/fixtures.ts).
export function browserFor(device: E2eDevice, webkitOnPhone: boolean): E2eBrowser {
  return device === "phone" && webkitOnPhone ? "webkit" : "chromium"
}

export function phoneUserAgent(device: E2eDevice, browser: E2eBrowser): string | undefined {
  return device === "phone" ? PHONE_USER_AGENTS[browser] : undefined
}

// The project a test runs in, read back from its name.
export function projectNamed(name: string): E2eProject | undefined {
  return E2E_PROJECTS.find((project) => project.name === name)
}
