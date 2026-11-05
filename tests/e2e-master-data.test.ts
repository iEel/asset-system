import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The brands and models E2E spec of page group 7 plan 1 (plan docs/superpowers/plans/2026-11-05-group7-brands-models.md,
// Task 5): what it stands on — the app's own words, the suite's fixtures, the IT head's run role with brand:create and
// IT staff without it, run-marked names only, axe through recordSettled, and no DELETE. The spec runs with
// `npx playwright test e2e/master-data`; these pins need no app. Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")

test("the brands and models spec reads the app's own words (group 7 plan 1 task 5)", async () => {
  const { BRAND_MODEL_WORDS } = await import("../e2e/master-data/brands-models-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(BRAND_MODEL_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(BRAND_MODEL_WORDS.createModel, th.brandModel.quickAdd.createModel)
  assert.equal(BRAND_MODEL_WORDS.noPermission, th.brandModel.quickAdd.noPermission)
  assert.equal(BRAND_MODEL_WORDS.exists, th.brandModel.clash.exists)
  assert.equal(BRAND_MODEL_WORDS.use, th.brandModel.clash.use)
  assert.equal(BRAND_MODEL_WORDS.sourceAssetForm, th.brandModel.recent.sourceAssetForm)
  assert.equal(BRAND_MODEL_WORDS.deactivateBodyModel, th.brandModel.deactivate.confirmBodyModel)
})

test("the IT head's run role adds brands and models, IT staff do not (group 7 plan 1 task 5 ruling)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  for (const permission of ["brand:view", "brand:create", "brand:edit"]) assert.ok(E2E_ROLE_PERMISSIONS.itHead.includes(permission), permission)
  for (const key of ["itStaff", "viewer", "employee"] as const) {
    assert.ok(!E2E_ROLE_PERMISSIONS[key].some((permission) => permission.startsWith("brand:")), `${key} holds no brand permission`)
  }
})

test("the brands and models spec: the quick add with its similar name, the duplicate rule, เพิ่มล่าสุด, the confirm cancelled, the phone, IT staff's hint (group 7 plan 1 task 5)", () => {
  const spec = read("e2e/master-data/brands-models.spec.ts")
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!/import \{[^}]*\b(?:test|expect)\b[^}]*\} from "@playwright\/test"/.test(spec), "test and expect from the fixtures")
  assert.ok(spec.includes(`asUser("itHead")`) && spec.includes(`asUser("itStaff")`))
  // Run-marked names only: every brand and model name starts with the run and project marker.
  for (const name of ["const brandName = `${mark} Brandtest`", "const similarName = `${mark} Nova 54`", "const newName = `${mark} Nova54 Plus`"]) assert.ok(spec.includes(name), name)
  assert.ok(spec.includes("return txAssetName(readRunState().runId, projectName, \"\").trim()"))
  // The quick add: the create row, the similar name, the save, the typed fields unchanged (Review Focus 5).
  assert.ok(spec.includes("fillTemplate(W.createModel, { query: newName })"))
  assert.ok(spec.includes("dialog.getByRole(\"heading\", { name: W.similarHeading, exact: true })"))
  for (const field of ["#asset-tag\")).toHaveValue(tag)", "#asset-name\")).toHaveValue(assetName)", "#asset-serial-number\")).toHaveValue(serial)", "#asset-category\")).toHaveValue(masters.categoryId)"]) assert.ok(spec.includes(field), field)
  // The duplicate rule: a 409 the test expects, then ใช้ picks the existing model.
  assert.ok(spec.includes("measure.expectRefusal({ method: \"POST\", url: /\\/api\\/models$/, status: 409"))
  assert.ok(spec.includes("fillTemplate(W.use, { name: newName })"))
  // เพิ่มล่าสุด from the filter form, and ปิดใช้งาน's confirm cancelled: the suite sends no DELETE.
  assert.ok(spec.includes("await expect(page).toHaveURL(/[?&]added=7(?:&|$)/)"))
  assert.ok(spec.includes("source: W.sourceAssetForm"))
  assert.ok(spec.includes("fillTemplate(W.deactivateBodyModel, { assets: 1 })"))
  assert.ok(spec.includes("await confirm.getByRole(\"button\", { name: W.cancel, exact: true }).click()"))
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(/)
  // The phone's brand select and cards; IT staff's hint without a create row (Review Focus 4).
  assert.ok(spec.includes("page.getByLabel(W.phoneBrandSelect, { exact: true })"))
  assert.ok(spec.includes("popover.getByText(W.noPermission, { exact: true })"))
  // axe through recordSettled; no shared master data and no sign-in.
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 7)
  assert.doesNotMatch(spec, /\/api\/(?:locations|departments|employees|admin|categories)|signInOnce\(/)
})
