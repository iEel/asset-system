// Smoke: the measurements on a page no one is signed in to, in all four projects. The login page opens in the
// project's theme, with its form, and passes the measurements (console, requests, axe, load time). No sign-in.
import { expect, test } from "../support/fixtures.ts"

test("the login page opens in the project's theme and passes the measurements", async ({ page, measure, e2eTheme }) => {
  const login = await measure.visit("/th/login", "login page")
  expect(login.loadMs, "the login page's load time is recorded").not.toBeNull()
  expect(login.axe, "axe ran on the login page").not.toBeNull()
  await expect(page.locator("html")).toHaveAttribute("data-theme", e2eTheme)
  await expect(page.getByRole("heading", { level: 2, name: "เข้าสู่ระบบ" })).toBeVisible()
  await expect(page.locator("#login-username")).toBeVisible()
  await expect(page.locator("#login-password")).toBeVisible()
})
