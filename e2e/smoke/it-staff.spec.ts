// Smoke: IT staff (spec §7) sign in with the run's session and land on the work dashboard, in all four projects.
import { asUser, test, runPhoneOnWebKit } from "../support/fixtures.ts"
import { expectLanding } from "../support/landing.ts"

asUser("itStaff")
// IT staff walk the audit and deliver at the desk on the phone, so their smoke runs the phone on WebKit (spec §8).
runPhoneOnWebKit()

test("IT staff land on the work dashboard with the run's session", async ({ page, measure, e2eTheme }) => {
  await expectLanding(page, measure, "itStaff", e2eTheme)
})
