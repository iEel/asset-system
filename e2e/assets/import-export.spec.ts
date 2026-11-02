// Page group 4 plan 5 (spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §13, §17, Appendix A;
// plan docs/superpowers/plans/2026-11-02-group4-import-export.md Task 6): the Excel import run for real on the dev
// database, which the user allowed on 2026-11-02 (P5-R1; every other ban of the suite stays: no LDAP, no settings save,
// no sign-in, nothing deleted, no master data). IT staff, in all four projects: an asset of the test's own holds a run-unique
// Serial; a file built in memory (import-file.ts, never the downloadable template, whose employee sheet would land in a
// failure's trace) has three rows, each with a run-marked tag: one ready, one in a room that does not exist, one with the
// holder's Serial. The check shows 3 / 1 / 2 with the two Thai lines, the filter switches, the confirm imports the one
// row it promised, the done state and the history row (found by the run-unique file name) say so, and the imported asset
// opens. The viewer sees the export card only and both import routes refuse them.
//
// Each project adds 2 assets (the Serial holder and the imported one), 1 import movement and log, and 1 batch log. A
// second run of this spec under the same run id finds its own tags taken and fails: run it again with a new run id, as
// every spec that makes assets. The env guard keeps the app on the dev database (e2e/support/env-guard.ts).
import { asUser, expect, test } from "../support/fixtures.ts"
import { runRecords } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import type { Page } from "../asset-detail/detail-steps.ts"
import { VIEWER_API_REFUSALS } from "../cross-cutting/support/refusals.ts"
import { expectRefused } from "../cross-cutting/support/roles-ui.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { projectCode, txAssetName, txAssetTag } from "../transactions/tx-plan.ts"
import { createTxAsset, readAssetMasters, record, visit, type AssetMasters, type CreatedAsset } from "../transactions/tx-support.ts"
import { IMPORT_WORDS } from "./import-export-words.ts"
import { buildImportFile } from "./import-file.ts"

const IMPORT_PATH = "/th/asset-management/import-export"
const IMPORT_PREVIEW_PATH = "/api/assets/import-preview"
const IMPORT_CONFIRM_PATH = "/api/assets/import-confirm"
// The check and the confirm each read every active asset, employee, room and model of a dev database of 7,000 assets
// and more (critic R9).
const IMPORT_ANSWER_MS = 30_000
// The status and condition as the file names them: their Thai names, as the new asset form offers them.
const READY_STATUS = "พร้อมใช้งาน"
const GOOD_CONDITION = "ดี"

type ImportedAsset = Pick<CreatedAsset, "id" | "assetTag">

// The codes the file needs, from the new asset form's option labels ("code - name"), which IT staff may open: the run's
// company and branch (the branch list follows the company picked; nothing is saved) and the Notebook category.
// readAssetMasters has just opened the form.
async function readImportCodes(page: Page, masters: AssetMasters) {
  const data = readRunData()
  const codeOf = async (select: string, value: string) => {
    const option = page.locator(`${select} option[value="${value}"]`)
    await expect(option).toBeAttached()
    const label = ((await option.textContent()) ?? "").trim()
    const at = label.indexOf(" - ")
    if (at <= 0) throw new Error(`${select}: the option "${label}" is not "code - name"`)
    return label.slice(0, at)
  }
  const company = await codeOf("#asset-company", data.companyId)
  await page.locator("#asset-company").selectOption(data.companyId)
  const branch = await codeOf("#asset-branch", data.branchId)
  const category = await codeOf("#asset-category", masters.categoryId)
  return { company, branch, category }
}

test.describe("IT staff", () => {
  asUser("itStaff")

  test("a file of three rows checks as 3 / 1 / 2 with the two Thai lines, the filter switches, the confirm imports the one ready row, the history names the file, and the imported asset opens (group 4 spec §13, P5-R1, P5-R4)", async ({ page, measure }, testInfo) => {
    const { runId } = readRunState()
    const code = projectCode(testInfo.project.name)
    const masters = await readAssetMasters(page)
    const codes = await readImportCodes(page, masters)
    const runRoom = runRecords(runId).location

    // The holder of the Serial the third row repeats: an active asset of this run and project.
    const serialPrefix = `SN-${runId}-${code}-IMP`
    const holderSerial = `${serialPrefix}S`
    const holder = await createTxAsset(page, masters, testInfo.project.name, "IMPS", "โน้ตบุ๊กถือ Serial นำเข้า", { serialNumber: holderSerial })

    const fileName = `${runId}-${code}-import.xlsx`
    const missingRoom = `${runId}-${code}-NOLOC`
    const readyTag = txAssetTag(runId, testInfo.project.name, "IMP1")
    const names = {
      ready: txAssetName(runId, testInfo.project.name, "โน้ตบุ๊กนำเข้า"),
      missingRoom: txAssetName(runId, testInfo.project.name, "นำเข้าห้องที่ไม่มี"),
      serialClash: txAssetName(runId, testInfo.project.name, "นำเข้า Serial ซ้ำ"),
    }
    const common = { categoryCode: codes.category, companyCode: codes.company, branchCode: codes.branch, status: READY_STATUS, condition: GOOD_CONDITION }
    // Rows 2, 3 and 4 of the sheet (row 1 is the header). No holder: the ready row stays Ready.
    const file = await buildImportFile(fileName, [
      { ...common, assetTag: txAssetTag(runId, testInfo.project.name, "IMP1"), name: names.ready, currentLocationCode: runRoom.code, serialNumber: `${serialPrefix}1` },
      { ...common, assetTag: txAssetTag(runId, testInfo.project.name, "IMP2"), name: names.missingRoom, currentLocationCode: missingRoom, serialNumber: `${serialPrefix}2` },
      { ...common, assetTag: txAssetTag(runId, testInfo.project.name, "IMP3"), name: names.serialClash, currentLocationCode: runRoom.code, serialNumber: holderSerial },
    ])

    await visit(measure, IMPORT_PATH, "import and export, on arrival", testInfo)
    const main = page.getByRole("main")
    await expect(main.getByRole("heading", { level: 1, name: IMPORT_WORDS.pageTitle })).toBeVisible()
    // The template is checked by its link only; its body is never fetched (it lists every active employee).
    const template = page.locator('main a[href="/api/assets/import-template"]')
    await expect(template).toHaveText(IMPORT_WORDS.templateDownload)
    await expect(template).toHaveAttribute("download", "")

    // The upload: the check answers, the dropzone names the file, and the result reads 3 rows, 1 ready, 2 with errors.
    const previewed = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return response.request().method() === "POST" && url.pathname === IMPORT_PREVIEW_PATH
    }, { timeout: IMPORT_ANSWER_MS })
    await page.locator("#asset-import-file").setInputFiles(file)
    expect((await previewed).status(), IMPORT_PREVIEW_PATH).toBe(200)
    const result = page.locator('section[aria-labelledby="asset-import-result-title"]')
    await expect(result.getByRole("heading", { name: IMPORT_WORDS.resultTitle, exact: true })).toBeVisible()
    await expect(main.getByText(fileName, { exact: true })).toBeVisible()
    const stat = (label: string) => result.locator('[data-slot="stat"]').filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator(".text-metric")
    await expect(stat(IMPORT_WORDS.statRows)).toHaveText("3")
    await expect(stat(IMPORT_WORDS.statReady)).toHaveText("1")
    await expect(stat(IMPORT_WORDS.statErrors)).toHaveText("2")

    // The filter opens on the rows with errors (P5-R8); each row is read where it shows (the table from md, the list on
    // the phone).
    const filterButton = (value: string) => page.locator(`button:has([data-import-filter="${value}"])`)
    const importRow = (rowNumber: number) => page.locator(`[data-import-row="${rowNumber}"]`).filter({ visible: true })
    const shownRows = page.locator("[data-import-row]").filter({ visible: true })
    await expect(filterButton("error")).toHaveAttribute("aria-pressed", "true")
    await expect(filterButton("error")).toHaveText(fillTemplate(IMPORT_WORDS.filterErrors, { count: 2 }))
    await expect(filterButton("ready")).toHaveText(fillTemplate(IMPORT_WORDS.filterReady, { count: 1 }))
    await expect(filterButton("all")).toHaveText(fillTemplate(IMPORT_WORDS.filterAll, { count: 3 }))
    await expect(shownRows).toHaveCount(2)
    expect(await shownRows.evaluateAll((rows) => rows.map((row) => row.getAttribute("data-import-row")))).toEqual(["3", "4"])

    // Row 3: the room that does not exist, with the value from the file.
    const missing = importRow(3)
    await expect(missing).toContainText(names.missingRoom)
    await expect(missing.getByText(fillTemplate(IMPORT_WORDS.issueLine, { field: IMPORT_WORDS.fieldCurrentLocation, problem: IMPORT_WORDS.notFound }), { exact: true })).toBeVisible()
    await expect(missing.getByText(fillTemplate(IMPORT_WORDS.issueValue, { value: missingRoom }), { exact: true })).toBeVisible()
    // Row 4: the Serial the holder has, with "ใช้อยู่กับ <tag>" linking to the holder.
    const clash = importRow(4)
    await expect(clash).toContainText(names.serialClash)
    await expect(clash.getByText(fillTemplate(IMPORT_WORDS.issueLine, { field: IMPORT_WORDS.fieldSerial, problem: IMPORT_WORDS.duplicateExisting }), { exact: true })).toBeVisible()
    const usedBy = `${fillTemplate(IMPORT_WORDS.issueValue, { value: holderSerial })}${IMPORT_WORDS.issueSeparator}${fillTemplate(IMPORT_WORDS.usedBy, { tag: holder.assetTag })}`
    await expect(clash.getByText(usedBy, { exact: true })).toBeVisible()
    await expect(clash.getByRole("link", { name: holder.assetTag, exact: true })).toHaveAttribute("href", `/th/assets/${holder.id}`)
    await expect(page.locator("#asset-import-ready-summary")).toHaveText(fillTemplate(IMPORT_WORDS.footerSummary, { ready: 1, skipped: 2 }))
    await record(measure, "import, the file checked (review)", testInfo)

    // The filter: the ready row alone, then all three.
    await filterButton("ready").click()
    await expect(filterButton("ready")).toHaveAttribute("aria-pressed", "true")
    await expect(shownRows).toHaveCount(1)
    await expect(importRow(2)).toContainText(names.ready)
    await expect(importRow(2)).toContainText(readyTag)
    await expect(importRow(2).getByText(IMPORT_WORDS.rowReady, { exact: true })).toBeVisible()
    await filterButton("all").click()
    await expect(filterButton("all")).toHaveAttribute("aria-pressed", "true")
    await expect(shownRows).toHaveCount(3)

    // The confirm imports the one row it promised (P5-R2), and answers with that asset.
    const confirmed = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return response.request().method() === "POST" && url.pathname === IMPORT_CONFIRM_PATH
    }, { timeout: IMPORT_ANSWER_MS })
    await main.getByRole("button", { name: fillTemplate(IMPORT_WORDS.confirm, { count: 1 }), exact: true }).click()
    const answer = await confirmed
    expect(answer.status(), IMPORT_CONFIRM_PATH).toBe(200)
    const body = (await answer.json()) as { imported: number; skipped: number; assets: ImportedAsset[] }
    expect([body.imported, body.skipped, body.assets.map((asset) => asset.assetTag)]).toEqual([1, 2, [readyTag]])
    const imported = body.assets[0]

    // The done state, and the history row found by the run-unique file name (never by its place in the list, R11).
    await expect(main.getByText(fillTemplate(IMPORT_WORDS.doneSummary, { imported: 1, skipped: 2 }), { exact: true })).toBeVisible()
    await expect(main.getByRole("heading", { level: 3, name: IMPORT_WORDS.doneAssets, exact: true })).toBeVisible()
    await expect(main.getByRole("heading", { name: IMPORT_WORDS.historyTitle, exact: true })).toBeVisible()
    const historyRow = main.locator("li").filter({ has: page.getByRole("heading", { level: 3, name: fileName, exact: true }) })
    await expect(historyRow).toHaveCount(1)
    await expect(historyRow).toContainText(fillTemplate(IMPORT_WORDS.historyCounts, { imported: 1, total: 3, skipped: 2 }))
    await expect(historyRow).toContainText(IMPORT_WORDS.outcomePartial)
    await record(measure, "import, done", testInfo)

    // The imported asset opens from the done state.
    await main.getByRole("link", { name: readyTag, exact: true }).click()
    await page.waitForURL((url) => url.pathname === `/th/assets/${imported.id}`)
    await expect(page.getByRole("heading", { level: 1, name: names.ready })).toBeVisible()
    await record(measure, "the imported asset", testInfo)
  })
})

test.describe("the viewer", () => {
  asUser("viewer")

  test("the viewer sees the export card with its count line and the history, no dropzone, no template and no confirm; both import routes refuse them (group 4 plan 5, P5-R9)", async ({ page, measure }, testInfo) => {
    await visit(measure, IMPORT_PATH, "import and export (viewer)", testInfo)
    const main = page.getByRole("main")
    await expect(main.getByRole("heading", { level: 1, name: IMPORT_WORDS.pageTitle })).toBeVisible()
    // The count is never pinned: the dev data grows with every run.
    const exportAll = main.locator('a[href="/api/assets/export"][download]')
    await expect(exportAll).toContainText(IMPORT_WORDS.exportAll)
    await expect(exportAll).toContainText(templatePattern(IMPORT_WORDS.exportAllCount, { count: "[\\d,]+" }))
    await expect(main.getByRole("heading", { name: IMPORT_WORDS.historyTitle, exact: true })).toBeVisible()
    await expect(main.locator('input[type="file"]')).toHaveCount(0)
    await expect(main.locator('a[href="/api/assets/import-template"]')).toHaveCount(0)
    await expect(main.getByRole("heading", { name: IMPORT_WORDS.cardTitle, exact: true })).toHaveCount(0)
    await expect(main.getByRole("button", { name: templatePattern(IMPORT_WORDS.confirm, {}) })).toHaveCount(0)
    await expectRefused(page.request, VIEWER_API_REFUSALS.filter((refusal) => refusal.file.startsWith("assets/import-")))
  })
})
