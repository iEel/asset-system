// What a person reads on screen in the cross-cutting workflows: a total in a stat strip, the access-denied and
// not-found screens, the searchable pickers, and an error under a field (the V track's contract: the control is
// marked invalid, its error line is <id>-error and is named by aria-describedby, and the first wrong field has focus
// after a save).
import type { Locator, Page } from "@playwright/test"
import { expect } from "../../support/fixtures.ts"
import type { Measure } from "../../support/measure.ts"

// The value of a stat strip cell, by its label ("ทรัพย์สินทั้งหมด" → "3").
export function statValue(page: Page, label: string, scope = "main") {
  return page
    .locator(`${scope} [data-slot="stat"]`)
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) })
    .locator(".text-metric")
}

// requirePagePermission sends a person without the permission to the access-denied page (src/lib/access-denied.ts),
// which names the permission they need.
export async function expectAccessDenied(page: Page, permission: string) {
  const [moduleName, action] = permission.split(":")
  await expect(page).toHaveURL(new RegExp(`/th/access-denied\\?(?=.*module=${moduleName})(?=.*action=${action})`))
  // The screen's title is plain text, not a heading (findings, note N13).
  await expect(page.getByRole("main").getByText("ไม่มีสิทธิ์เข้าหน้านี้", { exact: true })).toBeVisible()
  await expect(page.getByText(`สิทธิ์ที่ต้องใช้: ${permission}`)).toBeVisible()
}

// Open a page the person may not use. The dashboard's loading.tsx streams every page, so requirePagePermission's
// redirect reaches the browser after the first load, as a client navigation: wait for the access-denied page and its
// load, then measure it (axe on the page the person is left on).
export async function visitRefused(page: Page, measure: Measure, path: string, permission: string, label: string) {
  await page.goto(path, { waitUntil: "load" })
  await expectAccessDenied(page, permission)
  await page.waitForLoadState("load")
  await measure.recordPage(label)
}

// notFound() under the streamed dashboard renders the not-found screen in place (the document answers 200).
export async function expectNotFound(page: Page) {
  await expect(page.getByRole("main").getByText("ไม่พบหน้าที่ต้องการ", { exact: true })).toBeVisible()
}

// A SearchableSelect (src/components/ui/searchable-select.tsx): open it (its button, by id or locator), type the
// search, choose the first option that matches, and see it chosen.
export async function choose(page: Page, trigger: string | Locator, search: string, option: string | RegExp = search) {
  const button = typeof trigger === "string" ? page.locator(`#${trigger}`) : trigger
  await button.click()
  await page.getByRole("dialog").getByRole("combobox").fill(search)
  await page.getByRole("option", { name: option }).first().click()
  await expect(button).toContainText(search)
}

// The error under one field after a save: its text under the field, the control marked invalid (aria-invalid on an
// input, data-invalid on a SearchableSelect's button; a radio group's fieldset carries neither, FieldGroup) and naming
// the error, and focus on the first wrong field (the control itself, or for a group the element given).
export async function expectFieldError(page: Page, controlId: string, message: string, options: { focus?: string | false; group?: boolean } = {}) {
  const control = page.locator(`#${controlId}`)
  const error = page.locator(`#${controlId}-error`)
  await expect(error).toHaveText(message)
  await expect(error).toBeVisible()
  if (!options.group) await expect(page.locator(`#${controlId}:is([aria-invalid="true"], [data-invalid="true"])`)).toHaveCount(1)
  await expect(control).toHaveAttribute("aria-describedby", new RegExp(`(?:^|\\s)${controlId}-error(?:\\s|$)`))
  if (options.focus !== false) await expect(options.focus ? page.locator(options.focus) : control).toBeFocused()
}

// The error is gone as soon as the field changes (V track spec §4.3), before any new save.
export async function expectNoFieldError(page: Page, controlId: string) {
  await expect(page.locator(`#${controlId}-error`)).toHaveCount(0)
}
