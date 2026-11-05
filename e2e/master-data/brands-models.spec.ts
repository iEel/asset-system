// Page group 7 plan 1 (spec docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md §4; plan
// docs/superpowers/plans/2026-11-05-group7-brands-models.md Task 5): brands and models in all four projects.
// - The IT head (the run's role holds brand:view, brand:create and brand:edit, the Task 5 ruling) adds a model from the
//   new asset form: the model picker offers "เพิ่มรุ่นใหม่: …" (G7P1-R4), the dialog lists a similar model of the brand,
//   the save picks the new model and every typed field stays as typed (Review Focus 5). The same name again with other
//   spaces and case is refused with "มี … อยู่แล้ว", and "ใช้ …" picks the existing one (the duplicate rule, G7P1-R1).
// - The brands page's เพิ่มล่าสุด 7 วัน lists the model with "จากฟอร์มทรัพย์สิน" (G7P1-R3); its ⋯ ปิดใช้งาน asks first
//   with the asset count, and is cancelled (DELETE is a hazard of the suite, so nothing is deactivated here). The phone
//   shows the brand select and the model cards with the photo placeholder.
// - IT staff (no brand:create) find no create row, only "ไม่พบ · แจ้งผู้ดูแลข้อมูลหลักให้เพิ่ม" (Review Focus 4).
// Every brand and model made here carries the run id and the project's code; no shared master data is changed.
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { txAssetName, txAssetTag } from "../transactions/tx-plan.ts"
import { createTxAsset, pickSearchable, readAssetMasters } from "../transactions/tx-support.ts"
import { BRAND_MODEL_WORDS as W } from "./brands-models-words.ts"

// "E2E-1105A DL": the run and the project, at the head of every name this file makes.
function marker(projectName: string): string {
  return txAssetName(readRunState().runId, projectName, "").trim()
}

async function postJson(page: Page, path: string, data: Record<string, string>): Promise<{ id: string; name: string }> {
  const response = await page.request.post(path, { data })
  expect(response.status(), `POST ${path} ${data.name}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; name: string }
}

// The model picker opened and searched: its search box is the popover's combobox.
async function searchModel(page: Page, text: string): Promise<void> {
  const trigger = page.locator("#asset-model")
  await expect(trigger).toHaveCount(1)
  await trigger.click()
  await page.getByRole("dialog").last().getByRole("combobox").fill(text)
}

const quickAddDialog = (page: Page, brandName: string): Locator =>
  page.getByRole("dialog", { name: fillTemplate(W.modelTitle, { brand: brandName }), exact: true })

test.describe("the IT head adds a model from the asset form and finds it on the brands page", () => {
  asUser("itHead")

  test("a model added from the asset form with its similar names, the duplicate rule's ใช้, then เพิ่มล่าสุด and ปิดใช้งาน's confirm on the brands page (group 7 spec §4, G7P1-R1, R3, R4; Review Focus 5)", async ({ page, measure, e2eDevice }, testInfo) => {
    const { runId } = readRunState()
    const project = testInfo.project.name
    const mark = marker(project)
    const masters = await readAssetMasters(page)

    // The run's brand and one model of it, through the API: the model the dialog will list as similar.
    const brandName = `${mark} Brandtest`
    const similarName = `${mark} Nova 54`
    const newName = `${mark} Nova54 Plus`
    const brand = await postJson(page, "/api/brands", { name: brandName })
    await postJson(page, "/api/models", { name: similarName, brandId: brand.id, categoryId: masters.categoryId })

    // The new asset form, typed first: the tag, the category, the name (after the category, which suggests one), the Serial.
    const tag = txAssetTag(runId, project, "BMF")
    const assetName = `${mark} โน้ตบุ๊กรุ่นที่เพิ่มจากฟอร์ม`
    const serial = txAssetTag(runId, project, "BMSN")
    await page.goto("/th/assets/new", { waitUntil: "load" })
    await page.locator("#asset-tag").fill(tag)
    await page.locator("#asset-category").selectOption(masters.categoryId)
    await page.locator("#asset-name").fill(assetName)
    await page.locator("#asset-serial-number").fill(serial)
    await pickSearchable(page, "asset-brand", brandName, brandName)
    await recordSettled(page, measure, "new asset form, the run's brand chosen")

    // The model is not in the list: the picker offers to add it with the typed name (G7P1-R4).
    await searchModel(page, newName)
    const createRow = page.getByRole("option", { name: fillTemplate(W.createModel, { query: newName }), exact: true })
    await expect(createRow).toBeVisible()
    await recordSettled(page, measure, "new asset form, the model picker's create row")
    await createRow.click()

    // The dialog: the typed name, and the brand's similar model with its "use" button (a warning, never a block).
    let dialog = quickAddDialog(page, brandName)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("textbox")).toHaveValue(newName)
    await expect(dialog.getByRole("heading", { name: W.similarHeading, exact: true })).toBeVisible()
    await expect(dialog.getByRole("listitem").filter({ hasText: similarName })).toHaveCount(1)
    await expect(dialog.getByRole("button", { name: `${W.useThis} ${similarName}`, exact: true })).toBeVisible()
    await recordSettled(page, measure, "the quick add dialog with a similar name")

    // บันทึกและเลือก: the model is created from the asset form and chosen; nothing typed has changed.
    const created = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/models")
    await dialog.getByRole("button", { name: W.save, exact: true }).click()
    const createdResponse = await created
    expect(createdResponse.status(), "the quick add's save").toBe(201)
    const model = (await createdResponse.json()) as { id: string; name: string }
    expect(model.name).toBe(newName)
    await expect(dialog).toHaveCount(0)
    await expect(page.locator("#asset-model")).toContainText(newName)
    await expect(page.locator("#asset-brand")).toContainText(brandName)
    await expect(page.locator("#asset-tag")).toHaveValue(tag)
    await expect(page.locator("#asset-name")).toHaveValue(assetName)
    await expect(page.locator("#asset-serial-number")).toHaveValue(serial)
    await expect(page.locator("#asset-category")).toHaveValue(masters.categoryId)

    // The same name with other spaces and case: the server's duplicate rule refuses it and names the existing model.
    const variant = `${mark.toLowerCase()}  NOVA54plus`
    await searchModel(page, `${mark} Nova55`)
    await page.getByRole("option", { name: fillTemplate(W.createModel, { query: `${mark} Nova55` }), exact: true }).click()
    dialog = quickAddDialog(page, brandName)
    await expect(dialog).toBeVisible()
    await dialog.getByRole("textbox").fill(variant)
    measure.expectRefusal({ method: "POST", url: /\/api\/models$/, status: 409, reason: "the duplicate rule: the same model name with other spaces and case (G7P1-R1)" })
    const refused = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/models")
    await dialog.getByRole("button", { name: W.save, exact: true }).click()
    expect((await refused).status(), "the variant's save").toBe(409)
    await expect(dialog).toContainText(fillTemplate(W.exists, { name: newName }))
    const use = dialog.getByRole("button", { name: fillTemplate(W.use, { name: newName }), exact: true })
    await expect(use).toBeVisible()
    await recordSettled(page, measure, "the quick add dialog with the duplicate rule's answer")
    await use.click()
    await expect(dialog).toHaveCount(0)
    await expect(page.locator("#asset-model")).toContainText(newName)
    await expect(page.locator("#asset-name")).toHaveValue(assetName)

    // An asset of the new model (the asset API), so ปิดใช้งาน's confirm has an asset to count.
    await createTxAsset(page, masters, project, "BM1", "โน้ตบุ๊กรุ่นที่เพิ่มจากฟอร์ม", { brandId: brand.id, modelId: model.id })

    // The brands page: the run's models found by the marker, then เพิ่มล่าสุด 7 วัน from the filter form.
    await page.goto(`/th/master-data/brands?search=${encodeURIComponent(`${mark} Nova`)}`, { waitUntil: "load" })
    const recent = page.getByLabel(W.recentLabel, { exact: true })
    await recent.selectOption({ label: W.days7 })
    await recent.locator("xpath=ancestor::form").getByRole("button", { name: W.filter, exact: true }).click()
    await expect(page).toHaveURL(/[?&]added=7(?:&|$)/)
    const itHeadName = readRunData().users.itHead?.displayName
    if (!itHeadName) throw new Error("the run has no IT head user: the setup project did not finish")
    const modelEntry = (name: string): Locator =>
      e2eDevice === "desktop" ? page.locator("tbody tr").filter({ hasText: name }) : page.locator("li article").filter({ hasText: name })
    await expect(modelEntry(newName)).toHaveCount(1)
    await expect(modelEntry(newName)).toContainText(fillTemplate(W.addedBy, { name: itHeadName, source: W.sourceAssetForm }))
    await expect(modelEntry(similarName)).toContainText(fillTemplate(W.addedBy, { name: itHeadName, source: W.sourceMasterData }))
    // No photo yet: the placeholder, never a broken image (the table cell keeps its words for screen readers).
    await expect(modelEntry(newName)).toContainText(W.photoNone)
    await recordSettled(page, measure, "brands page, เพิ่มล่าสุด 7 วัน")

    // ⋯ ปิดใช้งาน asks first, with the one asset of the model; cancelled, so nothing is deactivated (no DELETE).
    await page.getByRole("button", { name: fillTemplate(W.moreActionsFor, { code: newName }), exact: true }).filter({ visible: true }).click()
    const menu = e2eDevice === "desktop" ? page.getByRole("menu") : page.getByRole("dialog").filter({ visible: true }).last()
    await expect(menu).toBeVisible()
    await menu.getByRole("menuitem", { name: W.deactivate, exact: true }).or(menu.getByRole("button", { name: W.deactivate, exact: true })).first().click()
    const confirm = page.getByRole("alertdialog", { name: fillTemplate(W.deactivateTitle, { name: newName }), exact: true })
    await expect(confirm).toBeVisible()
    await expect(confirm).toContainText(fillTemplate(W.deactivateBodyModel, { assets: 1 }))
    await recordSettled(page, measure, "brands page, ปิดใช้งาน's confirm")
    await confirm.getByRole("button", { name: W.cancel, exact: true }).click()
    await expect(confirm).toHaveCount(0)
    await expect(modelEntry(newName)).toHaveCount(1)

    // The phone: the brand select in place of the brand list, and one card per model of the chosen brand.
    if (e2eDevice === "phone") {
      const brandSelect = page.getByLabel(W.phoneBrandSelect, { exact: true })
      await expect(brandSelect).toBeVisible()
      await brandSelect.selectOption({ label: brandName })
      await brandSelect.locator("xpath=ancestor::form").getByRole("button", { name: W.filter, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`[?&]modelBrandId=${brand.id}(?:&|$)`))
      await expect(page.locator("li article")).toHaveCount(2)
      for (const name of [newName, similarName]) await expect(modelEntry(name)).toBeVisible()
      await expect(modelEntry(newName)).toContainText(fillTemplate(W.assetCount, { count: 1 }))
      await expect(modelEntry(newName).getByText(W.photoNone, { exact: true })).toBeVisible()
      await recordSettled(page, measure, "brands page on the phone, one brand's model cards")
    } else {
      await expect(page.getByLabel(W.phoneBrandSelect, { exact: true })).toBeHidden()
    }
  })
})

test.describe("IT staff cannot add a brand or model", () => {
  asUser("itStaff")

  test("without brand:create the brand picker says who adds a missing brand, and offers no create row (Review Focus 4)", async ({ page, measure }, testInfo) => {
    const missing = `${marker(testInfo.project.name)} Nobrand`
    await page.goto("/th/assets/new", { waitUntil: "load" })
    const trigger = page.locator("#asset-brand")
    await expect(trigger).toHaveCount(1)
    await trigger.click()
    const popover = page.getByRole("dialog").last()
    await popover.getByRole("combobox").fill(missing)
    await expect(popover.getByText(W.noPermission, { exact: true })).toBeVisible()
    await expect(page.getByRole("option", { name: fillTemplate(W.createBrand, { query: missing }), exact: true })).toHaveCount(0)
    await recordSettled(page, measure, "new asset form as IT staff, a missing brand")
  })
})
