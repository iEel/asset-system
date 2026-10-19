// Smoke: the employee (spec §7) signs in with the run's session and lands on My Assets, in all four projects.
import { asUser, test } from "../support/fixtures.ts"
import { expectLanding } from "../support/landing.ts"

asUser("employee")

test("the employee lands on My Assets with the run's session", async ({ page, measure, e2eTheme }) => {
  await expectLanding(page, measure, "employee", e2eTheme)
})
