// Page group 8 plan 2 (spec docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md §3, §6, §8,
// §9; plan docs/superpowers/plans/2026-11-07-group8-categories.md Task 4): the categories list (board MD-Categories)
// and the category edit form (board MD-Category-Edit), in all four projects, as the IT head. The run's role holds
// category:view and category:edit since this task (e2e/support/run-plan.ts): the list, ⋯ แก้ไข and the edit form, which
// opens only with category:edit. No category:create (no เพิ่มหมวดหมู่ in the header), no category:delete (no ปิดใช้งาน in
// ⋯: its reason and confirm stay with tests/categories-list-board.test.ts), no setting:view (no prefix link in ⋯).
// - The run's own category, created by the seed admin through the categories API with one text field and no photo
//   items, and a run brand with one run model of it (so the category is in use and its status cannot be unticked). The
//   category's code is <run>-<project>-CTG, every name starts with the run and the project; the model's name is four
//   words, so readOneModel (e2e/assets/purchase-steps.ts, one to three words) never picks it. No prefix is set for it:
//   the settings are never written. No shared category, brand or model is changed.
// - The list: a search for the run category's code: ใช้งาน 1 (aria-current) / ไม่ใช้งาน 0 / ทั้งหมด 1, the row's facts
//   (name, code, ยังไม่ตั้ง with "ใช้ {code} แทน", รุ่น 1 linked to the brands page by the category, ทรัพย์สิน 0, ข้อมูลเพิ่ม
//   "1 ช่อง", รูปที่ต้องถ่าย ยังไม่มี), the footer's totals, no status column under ใช้งาน and one under ทั้งหมด; ⋯ holds
//   แก้ไข, ดูรุ่น (1) and ดูทรัพย์สิน (0), nothing else.
// - The form (from ⋯ แก้ไข): the header and its counts line, the prefix box's fallback, the status checkbox disabled with
//   the guard's reason (one model), the side panel ผลของการแก้ไข at 1 ช่อง; a วันที่ field and a ใช่/ไม่ใช่ field are added
//   (ใหม่ on both), the panel's หลังบันทึก goes to 3 ช่อง and names them, the footer says เพิ่มช่องข้อมูล 2 ช่อง; บันทึก
//   (PUT) goes back to the list with its search, now "3 ช่อง"; reopened, both fields are kept with their types and no
//   row is ใหม่, the panel and the footer show nothing changed.
// - The phone: the list is the table in its scroll region with the hint, ⋯ opens the bottom sheet, the page never
//   scrolls sideways (list and form), and the side panel follows the form's sections. axe through recordSettled on
//   every step. The suite sends no DELETE.
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { menuItem, readMenuEntries } from "../asset-detail/detail-steps.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { seedAdminApi } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { projectCode, txAssetName } from "../transactions/tx-plan.ts"
import { CATEGORY_WORDS as W } from "./categories-words.ts"

// The seed admin's request context (seedAdminApi): the type comes from the helper, as specs import nothing from
// @playwright/test but the suite's fixtures.
type APIRequestContext = Awaited<ReturnType<typeof seedAdminApi>>

type RunCategory = { id: string; code: string; name: string }
type RunModel = { id: string; name: string }

// The reason the category guard gives for one model and no asset (getCategoryDeleteBlockReason; a server string, not a
// message key, so it is here and tests/e2e-master-data.test.ts pins it to the function).
const CATEGORY_BLOCKED = "ปิดใช้งานหมวดหมู่นี้ไม่ได้ เพราะยังมีรุ่น 1 รายการใช้งานอยู่"

// The saved field the category starts with, and the two this spec adds (a วันที่ and a ใช่/ไม่ใช่).
const SAVED_FIELD = { fieldName: "serial_note", fieldLabel: "Serial note", fieldLabelTh: "หมายเหตุซีเรียล" }
const ADDED_FIELDS = [
  { fieldName: "received_on", fieldLabel: "Received on", fieldLabelTh: "วันที่ตรวจรับ", fieldType: "date", typeLabel: W.fieldTypeDate },
  { fieldName: "on_warranty", fieldLabel: "On warranty", fieldLabelTh: "อยู่ในประกัน", fieldType: "boolean", typeLabel: W.fieldTypeBoolean },
] as const

// A rich message as the screen reads it: its tags dropped.
const plainText = (text: string) => text.replace(/<\/?\w+>/g, "")

async function created(response: Awaited<ReturnType<APIRequestContext["post"]>>, what: string): Promise<string> {
  expect(response.status(), `POST ${what}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return ((await response.json()) as { id: string }).id
}

// The run's category of this project with one text field and no photo items, and a run brand with one model in it (the
// seed admin, the same APIs the master-data pages post to, every key of each schema).
async function createRunCategory(projectName: string): Promise<{ category: RunCategory; model: RunModel }> {
  const { runId } = readRunState()
  const name = (label: string) => txAssetName(runId, projectName, label)
  const admin = await seedAdminApi()
  try {
    const category = { id: "", code: `${runId}-${projectCode(projectName)}-CTG`, name: name("หมวดหมู่ทดสอบแม่แบบ") }
    category.id = await created(await admin.post("/api/categories", {
      data: {
        code: category.code, name: category.name, description: null, isActive: true, photoChecklist: [],
        customFieldDefs: [{ ...SAVED_FIELD, fieldType: "text", options: null, isRequired: false, sortOrder: 0, isActive: true }],
      },
    }), `/api/categories ${category.code}`)
    const brandId = await created(await admin.post("/api/brands", { data: { name: name("ยี่ห้อทดสอบหมวดหมู่"), isActive: true } }), "/api/brands")
    const model = { id: "", name: name("รุ่น ทดสอบหมวดหมู่") }
    model.id = await created(await admin.post("/api/models", {
      data: { name: model.name, categoryId: category.id, brandId, specs: null, isActive: true },
    }), `/api/models ${model.name}`)
    return { category, model }
  } finally {
    await admin.dispose()
  }
}

// The list's one row of a record (the table on both devices: the list has no phone cards).
const listRow = (page: Page, code: string): Locator => page.locator("table tbody tr").filter({ hasText: code })
// A count cell's link by its href (the page writes them whole).
const countLink = (row: Locator, href: string): Locator => row.locator(`a[href="${href}"]`)

// The record-status segmented control: each option a link named by its word and its count.
function statusLink(page: Page, label: string, count: number): Locator {
  return page.getByRole("navigation", { name: W.recordStatusLabel, exact: true }).getByRole("link", { name: new RegExp(`^${label}\\s*${count}$`) })
}
async function expectStatusCounts(page: Page, chosen: "active" | "all", counts: { active: number; inactive: number; all: number }) {
  const links = { active: statusLink(page, W.recordActive, counts.active), inactive: statusLink(page, W.recordInactive, counts.inactive), all: statusLink(page, W.recordAll, counts.all) }
  for (const [key, link] of Object.entries(links)) {
    if (key === chosen) await expect(link).toHaveAttribute("aria-current", "page")
    else await expect(link).not.toHaveAttribute("aria-current")
  }
}

// A row's ⋯: the menu on the computer, the bottom sheet on the phone.
async function openRowMenu(page: Page, row: Locator, code: string, phone: boolean): Promise<Locator> {
  await row.getByRole("button", { name: fillTemplate(W.moreActionsFor, { code }), exact: true }).click()
  const menu = phone ? page.getByRole("dialog").filter({ visible: true }).last() : page.getByRole("menu").filter({ visible: true }).last()
  await expect(menu).toBeVisible()
  return menu
}

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)

// The phone: the table is a named scroll region with the hint above it, and the page itself does not scroll sideways.
async function expectPhoneTable(page: Page, caption: string) {
  await expect(page.getByRole("region", { name: caption, exact: true })).toBeVisible()
  await expect(page.getByText(W.tableScrollHint, { exact: true }).filter({ visible: true })).toHaveCount(1)
  expect(await noSidewaysScroll(page), "the page does not scroll sideways").toBe(true)
}

// The side panel's row (ช่องข้อมูลเพิ่ม): its ตอนนี้ and หลังบันทึก cells.
function summaryCells(page: Page, key: string) {
  const row = page.locator(`[data-category-edit-summary] [data-summary-row="${key}"]`)
  return { row, now: row.locator("td").first(), after: row.locator("td").last() }
}

test.describe("the IT head reads the categories list and adds fields to a category", () => {
  asUser("itHead")

  test("the list shows the run category's board facts, ⋯ แก้ไข / ดูรุ่น / ดูทรัพย์สิน only; the form locks the status while a model uses it, the side panel and the footer follow two added fields, and a วันที่ and a ใช่/ไม่ใช่ field are kept after the save (group 8 spec §3, §6; G8P2-R2, G8P2-R3)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(300_000)
    const project = testInfo.project.name
    const phone = e2eDevice === "phone"
    const { category, model } = await createRunCategory(project)

    // ── The list (board MD-Categories) ──
    const listPath = "/th/master-data/categories"
    const listHref = `${listPath}?search=${encodeURIComponent(category.code)}`
    await page.goto(listHref, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: W.categoriesTitle, exact: true })).toBeVisible()
    await expectStatusCounts(page, "active", { active: 1, inactive: 0, all: 1 })
    await expect(page.locator("table tbody tr")).toHaveCount(1)
    const row = listRow(page, category.code)
    // No category:create: no เพิ่มหมวดหมู่ in the header.
    await expect(page.getByRole("main").getByRole("link", { name: W.createTitle, exact: true })).toHaveCount(0)
    // Name first with the code under it; no prefix in the settings: ยังไม่ตั้ง, "ใช้ {code} แทน".
    await expect(row).toContainText(category.name)
    await expect(row.getByText(W.prefixMissing, { exact: true })).toHaveCount(1)
    await expect(row).toContainText(fillTemplate(W.prefixFallback, { code: category.code }))
    // รุ่น 1 links to the brands page by the category (brand:view); ทรัพย์สิน 0 is a plain number; ข้อมูลเพิ่ม 1 ช่อง; no photo items.
    const modelsHref = `/th/master-data/brands?modelCategoryId=${category.id}&modelPage=1`
    await expect(countLink(row, modelsHref)).toHaveText("1")
    await expect(row.locator(`a[href^="/th/assets?categoryId="]`)).toHaveCount(0)
    await expect(row.getByText(fillTemplate(W.customFieldCount, { count: 1 }), { exact: true })).toHaveCount(1)
    await expect(row.getByText(W.none, { exact: true })).toHaveCount(1)
    // The footer's totals over the filtered set and its counts; the status column only under ทั้งหมด.
    const foot = page.locator('[data-slot="data-table-foot"]')
    await expect(foot).toContainText(fillTemplate(W.listTotals, { models: 1, assets: 0 }))
    await expect(foot).toContainText(fillTemplate(W.footerCounts, { active: 1, inactive: 0 }))
    const statusColumn = page.getByRole("columnheader", { name: W.statusColumn, exact: true })
    await expect(statusColumn).toHaveCount(0)
    if (phone) await expectPhoneTable(page, W.categoriesTitle)
    await recordSettled(page, measure, "categories list, the run category")

    // ⋯: แก้ไข, ดูรุ่น (1), ดูทรัพย์สิน (0); no prefix link without setting:view, no ปิดใช้งาน without category:delete.
    const rowMenu = await openRowMenu(page, row, category.code, phone)
    expect(await readMenuEntries(rowMenu)).toEqual([
      { label: W.edit, reason: null, available: true },
      { label: fillTemplate(W.viewModels, { count: 1 }), reason: null, available: true },
      { label: fillTemplate(W.viewAssets, { count: 0 }), reason: null, available: true },
    ])
    await expect(menuItem(rowMenu, W.setPrefixInSettings)).toHaveCount(0)
    await expect(menuItem(rowMenu, W.deactivate)).toHaveCount(0)
    await recordSettled(page, measure, "categories list, a category's ⋯")
    await page.keyboard.press("Escape")
    await expect(rowMenu).toBeHidden()

    // รุ่น 1 opens the brands page by the category, with the run model on it.
    await countLink(listRow(page, category.code), modelsHref).click()
    await page.waitForURL((url) => url.pathname === "/th/master-data/brands" && url.searchParams.get("modelCategoryId") === category.id)
    await expect(page.getByRole("main").getByText(model.name, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await recordSettled(page, measure, "brands page by the category, from the categories list")

    // ทั้งหมด: chosen, and the status column shows the row ใช้งาน.
    await page.goto(`${listHref}&status=all`, { waitUntil: "load" })
    await expectStatusCounts(page, "all", { active: 1, inactive: 0, all: 1 })
    await expect(statusColumn).toHaveCount(1)
    await expect(listRow(page, category.code).getByText(W.recordActive, { exact: true })).toHaveCount(1)
    await recordSettled(page, measure, "categories list, ทั้งหมด with the status column")

    // ── The form (board MD-Category-Edit), from ⋯ แก้ไข ──
    await page.goto(listHref, { waitUntil: "load" })
    const editPath = `/th/master-data/categories/${category.id}/edit`
    await menuItem(await openRowMenu(page, listRow(page, category.code), category.code, phone), W.edit).click()
    await page.waitForURL((url) => url.pathname === editPath)
    expect(new URL(new URL(page.url()).searchParams.get("returnTo") ?? "", "http://e2e.invalid").searchParams.get("search")).toBe(category.code)
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.editTitle, { name: category.name }), exact: true })).toBeVisible()
    // "รหัส {code} · ใช้อยู่กับ 1 รุ่น และ 0 ทรัพย์สิน · …", the model count linked (brand:view).
    const usage = page.locator("[data-category-usage]")
    await expect(usage).toHaveText(plainText(fillTemplate(W.usageLine, { code: category.code, models: 1, assets: 0 })))
    await expect(usage.locator(`a[href="${modelsHref}"]`)).toHaveCount(1)
    // Section 1's prefix box: no prefix, the code is used instead.
    await expect(page.locator('section[aria-labelledby="category-section-info"]')).toContainText(plainText(fillTemplate(W.formPrefixFallback, { code: category.code })))

    // Section 4: ใช้งาน cannot be unticked while a model uses the category; the guard's reason is under it.
    const statusSection = page.locator('section[aria-labelledby="category-section-status"]')
    const statusBox = statusSection.getByRole("checkbox")
    await expect(statusBox).toBeChecked()
    await expect(statusBox).toBeDisabled()
    await expect(statusSection.locator("#category-status-locked")).toHaveText(CATEGORY_BLOCKED)
    await expect(statusBox).toHaveAccessibleDescription(new RegExp(CATEGORY_BLOCKED))

    // The side panel and the footer before any change: 1 ช่อง both sides, รุ่นในหมวดหมู่ 1, nothing changed yet.
    const panel = page.locator("[data-category-edit-summary]")
    await expect(panel.getByRole("heading", { name: W.summaryTitle, exact: true })).toBeVisible()
    await expect(panel.getByRole("link", { name: new RegExp(`^${W.summaryModels}\\s*1$`) })).toHaveAttribute("href", modelsHref)
    const fields = summaryCells(page, "fields")
    await expect(fields.now).toHaveText(fillTemplate(W.summaryFieldCount, { count: 1 }))
    await expect(fields.after).toHaveText(fillTemplate(W.summaryFieldCount, { count: 1 }))
    await expect(fields.row).not.toHaveAttribute("data-changed")
    const footer = page.locator("[data-category-footer]")
    const footerHead = plainText(fillTemplate(W.footerEdit, { name: category.name }))
    await expect(footer).toHaveText(`${footerHead} · ${W.noChanges}`)
    // The saved field is not ใหม่.
    const templateSection = page.locator('section[aria-labelledby="category-section-template"]')
    await expect(page.locator("#category-field-0-name")).toHaveValue(SAVED_FIELD.fieldName)
    await expect(templateSection.getByText(W.newBadge, { exact: true })).toHaveCount(0)
    if (phone) {
      expect(await noSidewaysScroll(page), "the form does not scroll sideways").toBe(true)
      // On the phone the side panel follows the form's sections.
      const mainBox = await page.locator("[data-category-form-main]").boundingBox()
      const panelBox = await panel.boundingBox()
      expect(mainBox && panelBox && panelBox.y >= mainBox.y + mainBox.height - 1, "the side panel is under the sections").toBe(true)
    }
    await recordSettled(page, measure, "category form, a category in use")

    // Two fields added: a วันที่ and a ใช่/ไม่ใช่, each ใหม่ until saved.
    const addField = templateSection.getByRole("button", { name: W.addCustomField, exact: true })
    for (const [offset, field] of ADDED_FIELDS.entries()) {
      const index = offset + 1
      await addField.click()
      await expect(page.locator(`[data-category-field-row="${index}"]`)).toHaveCount(1)
      await page.locator(`#category-field-${index}-name`).fill(field.fieldName)
      await page.locator(`#category-field-${index}-label`).fill(field.fieldLabel)
      await page.locator(`#category-field-${index}-label-th`).fill(field.fieldLabelTh)
      await page.locator(`#category-field-${index}-type`).selectOption(field.fieldType)
      await expect(page.locator(`#category-field-${index}-type option:checked`)).toHaveText(field.typeLabel)
      await expect(page.locator(`[data-category-field-row="${index}"]`).getByText(W.newBadge, { exact: true })).toBeVisible()
    }
    await expect(page.locator('[data-category-field-row="0"]').getByText(W.newBadge, { exact: true })).toHaveCount(0)
    // หลังบันทึก goes to 3 ช่อง (ตอนนี้ stays 1), the panel names the two new fields, the footer counts them.
    await expect(fields.now).toHaveText(fillTemplate(W.summaryFieldCount, { count: 1 }))
    await expect(fields.after).toHaveText(fillTemplate(W.summaryFieldCount, { count: 3 }))
    await expect(fields.row).toHaveAttribute("data-changed", "true")
    await expect(panel).toContainText(plainText(fillTemplate(W.summaryNewFields, { names: ADDED_FIELDS.map((field) => field.fieldLabelTh).join(", ") })))
    await expect(footer).toHaveText(`${footerHead} · ${fillTemplate(W.changeFieldsAdded, { count: 2 })}`)
    if (phone) expect(await noSidewaysScroll(page), "the form with the new rows does not scroll sideways").toBe(true)
    await recordSettled(page, measure, "category form, two fields added")

    // บันทึก: the PUT answers 200 and the form goes back to the list with its search, now 3 ช่อง.
    const saved = page.waitForResponse((response) => response.request().method() === "PUT" && new URL(response.url()).pathname === `/api/categories/${category.id}`)
    await page.getByRole("button", { name: W.save, exact: true }).click()
    expect((await saved).status()).toBe(200)
    await page.waitForURL((url) => url.pathname === listPath && url.searchParams.get("search") === category.code)
    await expect(listRow(page, category.code).getByText(fillTemplate(W.customFieldCount, { count: 3 }), { exact: true })).toHaveCount(1)
    await recordSettled(page, measure, "categories list after the save")

    // Reopened: both fields kept with their types, in order after the saved one; nothing is ใหม่ and nothing changed.
    await page.goto(editPath, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.editTitle, { name: category.name }), exact: true })).toBeVisible()
    await expect(page.locator("#category-field-0-name")).toHaveValue(SAVED_FIELD.fieldName)
    for (const [offset, field] of ADDED_FIELDS.entries()) {
      const index = offset + 1
      await expect(page.locator(`#category-field-${index}-name`)).toHaveValue(field.fieldName)
      await expect(page.locator(`#category-field-${index}-label`)).toHaveValue(field.fieldLabel)
      await expect(page.locator(`#category-field-${index}-label-th`)).toHaveValue(field.fieldLabelTh)
      await expect(page.locator(`#category-field-${index}-type`)).toHaveValue(field.fieldType)
    }
    await expect(page.locator("[data-category-field-row]")).toHaveCount(3)
    await expect(page.locator('section[aria-labelledby="category-section-template"]').getByText(W.newBadge, { exact: true })).toHaveCount(0)
    const reopened = summaryCells(page, "fields")
    await expect(reopened.now).toHaveText(fillTemplate(W.summaryFieldCount, { count: 3 }))
    await expect(reopened.after).toHaveText(fillTemplate(W.summaryFieldCount, { count: 3 }))
    await expect(page.locator("[data-category-footer]")).toHaveText(`${footerHead} · ${W.noChanges}`)
    // Still in use: the status stays locked.
    await expect(page.locator('section[aria-labelledby="category-section-status"]').getByRole("checkbox")).toBeDisabled()
    await recordSettled(page, measure, "category form reopened, the two fields kept")
  })
})
