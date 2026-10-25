// Smoke: the measurements on a page no one is signed in to, in all four projects. The login page opens in the
// project's theme, with its form, and passes the measurements (console, requests, axe, load time). No sign-in.
import { expect, test } from "../support/fixtures.ts"

test("the login page opens in the project's theme and passes the measurements", async ({ page, measure, e2eTheme }) => {
  const login = await measure.visit("/th/login", "login page")
  expect(login.loadMs, "the login page's load time is recorded").not.toBeNull()
  expect(login.axe, "axe ran on the login page").not.toBeNull()
  await expect(page.locator("html")).toHaveAttribute("data-theme", e2eTheme)
  await expect(page.getByRole("heading", { level: 1, name: "เข้าสู่ระบบ" })).toBeVisible()
  await expect(page.getByText("ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับที่เข้าเครื่องคอมพิวเตอร์ของบริษัท", { exact: true })).toBeVisible()
  await expect(page.getByText(/IT Helpdesk|อีเมล IT|ติดต่อ IT/)).toHaveCount(0)
  // The run's database is asset_management_dev, so the test-system pill shows (spec §8).
  await expect(page.getByText("ระบบทดสอบ", { exact: true }).filter({ visible: true })).toHaveCount(1)
  await expect(page.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/login")
  await expect(page.locator("#login-username")).toBeVisible()
  await expect(page.locator("#login-password")).toBeVisible()
})

test("the login names where it goes next, and its English page reads in English", async ({ page, measure }) => {
  const callback = "/th/assets/00000000-0000-4000-8000-000000000000"
  await measure.visit(`/th/login?callbackUrl=${encodeURIComponent(callback)}`, "login page with a destination")
  await expect(page.getByText(/เข้าแล้วจะไปที่\s*รายละเอียดทรัพย์สิน/)).toBeVisible()
  await expect(page.getByRole("link", { name: "English" })).toHaveAttribute("href", `/en/login?callbackUrl=${encodeURIComponent(callback.replace("/th/", "/en/"))}`)
  await measure.visit("/en/login", "login page in English")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(page.getByRole("heading", { level: 1, name: "Sign In" })).toBeVisible()
  await expect(page.getByRole("link", { name: "ภาษาไทย" })).toHaveAttribute("href", "/th/login")
})
