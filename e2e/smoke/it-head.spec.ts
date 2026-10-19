// Smoke: the IT head (spec §7) signs in with the run's session and lands on the work dashboard, in all four projects.
import { asUser, test } from "../support/fixtures.ts"
import { expectLanding } from "../support/landing.ts"

asUser("itHead")

test("the IT head lands on the work dashboard with the run's session", async ({ page, measure, e2eTheme }) => {
  await expectLanding(page, measure, "itHead", e2eTheme)
})
