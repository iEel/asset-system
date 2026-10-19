// Smoke: the view-only user (spec §7) signs in with the run's session and lands on the work dashboard, in all four
// projects.
import { asUser, test } from "../support/fixtures.ts"
import { expectLanding } from "../support/landing.ts"

asUser("viewer")

test("the viewer lands on the work dashboard with the run's session", async ({ page, measure, e2eTheme }) => {
  await expectLanding(page, measure, "viewer", e2eTheme)
})
