// The smoke check of one E2E user: the run's session signs them in with no login, "/th" sends them to their landing
// page (src/lib/default-home.ts), the page carries the project's theme, and the measurements of the visit pass.
import type { Page } from "@playwright/test"
import { expect } from "./fixtures.ts"
import type { E2eTheme } from "./matrix.ts"
import type { Measure } from "./measure.ts"
import { E2E_USER_PLANS, type E2eUserKey } from "./run-plan.ts"
import { readRunData } from "./state.ts"

export async function expectLanding(page: Page, measure: Measure, key: E2eUserKey, theme: E2eTheme) {
  const user = readRunData().users[key]
  if (!user) throw new Error(`the run has no ${key} user: the setup project did not finish`)
  const landing = await measure.visit("/th", `${key} landing`)
  await expect(page).toHaveURL(new RegExp(`${E2E_USER_PLANS[key].landingPath}(?:[?#]|$)`))
  expect(landing.loadMs, "the landing page's load time is recorded").not.toBeNull()
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
  await expect(page.getByRole("main")).toBeVisible()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  // The session is this user's (the display name carries the run id).
  const session = (await (await page.request.get("/api/auth/session")).json()) as { user?: { name?: string } }
  expect(session.user?.name).toBe(user.displayName)
}
