// Reports and exports (spec §6.5): each report view shows the run's E2E assets, each export the role may use
// downloads a file that opens, and a role without the export permission does not see it (nor may it download it).
// The users and their permissions are spec §7's (run-plan.ts); export-rights.ts says which export each may use.
import { expect, test, asUser } from "../support/fixtures.ts"
import { readRunState } from "../support/state.ts"
import { mayExport } from "./support/export-rights.ts"
import { downloadBy, isPdf, openWorkbook } from "./support/files.ts"
import { createAsset, projectMarker, readAssetChoices, registerAssetsAsItStaff } from "./support/records.ts"
import { bangkokToday, catalogCard, expectCatalogRights, inReport, openView, queueCell } from "./support/reports-ui.ts"
import { statValue } from "./support/ui.ts"

test.describe("IT staff", () => {
  asUser("itStaff")

  test("IT staff see the run's assets in every report view and download the register and the overview, which open", async ({ page, measure, e2eDevice }, testInfo) => {
    const choices = await readAssetChoices(page, measure)
    const assets = []
    for (const [index, price] of [1000, 2000, 3000].entries()) {
      assets.push(await createAsset(page.request, testInfo, choices, { slug: `RPT${index + 1}`, name: `รายงาน ${index + 1}`, purchasePrice: price }))
    }
    const search = `${projectMarker(testInfo)}-RPT`

    // Overview: the totals, the preview of the three, and the run's department in the breakdown.
    await measure.visit(`/th/reports?search=${encodeURIComponent(search)}`, "reports: overview")
    await expect(statValue(page, "ทรัพย์สินทั้งหมด")).toHaveText("3")
    await expect(statValue(page, "ราคาซื้อรวม")).toHaveText("6,000.00")
    for (const asset of assets) await expect(inReport(page, asset.assetTag)).toBeVisible()
    // The group tables read the name with the code under it (group 10 spec §4.2). The phone shows one table at a time
    // (spec §7, `group=`), so it opens the department table first.
    if (e2eDevice === "phone") await measure.visit(`/th/reports?search=${encodeURIComponent(search)}&group=department`, "reports: overview, departments on the phone")
    await expect(inReport(page, `${readRunState().runId} แผนกทดสอบ E2E`)).toBeVisible()

    // The two exports of the header, each a file that opens with the three assets.
    const register = await downloadBy(page, () => page.getByRole("link", { name: "ส่งออกทะเบียนทรัพย์สิน" }).click(), "register", (name) => testInfo.outputPath(name))
    expect(register.filename).toMatch(/^assets-export-\d{4}-\d{2}-\d{2}\.xlsx$/)
    expect((await openWorkbook(register.bytes)).Assets.slice(1).map((row) => row[0]).sort()).toEqual(assets.map((asset) => asset.assetTag).sort())
    const overview = await downloadBy(page, () => page.getByRole("link", { name: "ส่งออกรายงานภาพรวม" }).click(), "overview", (name) => testInfo.outputPath(name))
    expect(overview.filename).toMatch(/^asset-overview-report-\d{4}-\d{2}-\d{2}\.xlsx$/)
    const overviewSheets = await openWorkbook(overview.bytes)
    expect(overviewSheets.Overview).toContainEqual(["Total Assets", 3])
    expect(overviewSheets.Overview).toContainEqual(["Total Purchase Value", 6000])

    // Accounting: the purchase cost of the three, each in the book-value list.
    await openView(page, "accounting")
    await measure.recordPage("reports: accounting")
    await expect(statValue(page, "ต้นทุนซื้อ", "[data-report-view-content]")).toHaveText("6,000.00")
    for (const asset of assets) await expect(inReport(page, `${asset.assetTag} - ${asset.name}`)).toBeVisible()

    // Operations: no serial number on any of the three, each in the data-fix queue.
    await openView(page, "operations")
    await measure.recordPage("reports: operations")
    await expect(statValue(page, "ไม่มีหมายเลขเครื่อง", "[data-report-view-content]")).toHaveText("3")
    for (const asset of assets) await expect(inReport(page, asset.assetTag)).toBeVisible()
    // The serial cell filters the queue (issue=serial): the three, one page ("แสดง 1–3 จาก 3"), each serial badge a
    // link to the asset's edit page (IT staff hold asset:edit), and the export of that issue alone (dataQuality=serial).
    await queueCell(page, "ไม่มีหมายเลขเครื่อง").click()
    await expect(page).toHaveURL(/[?&]issue=serial(?:&|#|$)/)
    await measure.recordPage("reports: operations, no serial")
    await expect(queueCell(page, "ไม่มีหมายเลขเครื่อง")).toHaveAttribute("aria-current", "page")
    await expect(page.locator("[data-report-ops-queue-head] h3")).toHaveText("ไม่มีหมายเลขเครื่อง 3 ชิ้น")
    await expect(page.locator("[data-report-view-content] nav").filter({ hasText: "แสดง 1–3 จาก 3" })).toBeVisible()
    for (const asset of assets) {
      await expect(inReport(page, asset.assetTag)).toBeVisible()
      await expect(page.locator(`[data-report-ops-issue="serial"][href="/th/assets/${asset.id}/edit"]`).filter({ visible: true })).toHaveCount(1)
    }
    const queueExport = page.locator("[data-report-ops-export]")
    await expect(queueExport).toHaveText("ส่งออก 3 รายการ Excel")
    await expect(queueExport).toHaveAttribute("href", /^\/api\/assets\/export\?(?:.*&)?dataQuality=serial(?:&|$)/)
    const serialFile = await downloadBy(page, () => queueExport.click(), "queue-serial", (name) => testInfo.outputPath(name))
    expect(serialFile.filename).toMatch(/^assets-export-\d{4}-\d{2}-\d{2}\.xlsx$/)
    expect((await openWorkbook(serialFile.bytes)).Assets.slice(1).map((row) => row[0]).sort()).toEqual(assets.map((asset) => asset.assetTag).sort())

    // The catalog: the reports by who uses them, the exports IT staff may use, and the ones they may not.
    await openView(page, "catalog")
    await measure.recordPage("reports: catalog")
    await expect(page.locator('[data-report-catalog-section="accounting"] h2')).toHaveText("บัญชีและทะเบียนทรัพย์สิน")
    for (const audience of ["accounting", "maintenance", "approver", "auditor", "admin"]) {
      await expect(page.locator(`[data-report-catalog-section="${audience}"]`), audience).toBeVisible()
    }
    // The register card's export downloads the three (the catalog keeps the report's filters), and the card then says
    // when: "ส่งออกล่าสุด" with today's Bangkok date (each export route logs to SystemLog).
    const registerCard = catalogCard(page, "accounting", "assets-register")
    const catalogRegister = await downloadBy(page, () => registerCard.getByRole("link", { name: "ส่งออก Excel: ทะเบียนทรัพย์สิน" }).click(), "catalog-register", (name) => testInfo.outputPath(name))
    expect((await openWorkbook(catalogRegister.bytes)).Assets.slice(1).map((row) => row[0]).sort()).toEqual(assets.map((asset) => asset.assetTag).sort())
    await page.reload()
    await expect(registerCard.locator("[data-report-last-export]")).toContainText("ส่งออกล่าสุด")
    await expect(registerCard.locator("[data-report-last-export]")).toContainText(bangkokToday())
    await expectCatalogRights(page, "itStaff")
  })

  // Finding M1: the audit findings page and an audit round's page show no export to a role without audit:export. Since
  // decision DX6 (ก) the IT head holds it, so the check runs as IT staff, who hold audit:view only.
  test("the audit findings and round pages offer no export without audit:export (finding M1)", async ({ page, measure }) => {
    // M1 fixed (FX4): this test now keeps the audit exports hidden from a role without audit:export.
    const rounds = (await (await page.request.get("/api/audit-rounds")).json()) as { id: string; status: string }[]
    const round = rounds.find((candidate) => candidate.status !== "cancelled")
    if (!round) throw new Error("no audit round that is not cancelled")
    await measure.visit("/th/audit/findings", "audit findings (IT staff)")
    await expect(page.locator('main a[href^="/api/audit-findings/export"]')).toHaveCount(0)
    await measure.visit(`/th/audit/rounds/${round.id}`, "audit round (IT staff)")
    await expect(page.locator(`main a[href^="/api/audit-rounds/${round.id}/"]`)).toHaveCount(0)
  })
})

test.describe("the viewer", () => {
  asUser("viewer")

  test("the viewer reads the reports and downloads the register, with no overview export", async ({ page, measure, browser }, testInfo) => {
    const desk = await registerAssetsAsItStaff(browser, testInfo, [
      { slug: "VWR1", name: "รายงานผู้ดู 1", purchasePrice: 4000 },
      { slug: "VWR2", name: "รายงานผู้ดู 2", purchasePrice: 5000 },
    ])
    await desk.close()
    const search = `${projectMarker(testInfo)}-VWR`

    await measure.visit(`/th/reports?search=${encodeURIComponent(search)}`, "reports: overview (viewer)")
    await expect(statValue(page, "ทรัพย์สินทั้งหมด")).toHaveText("2")
    for (const asset of desk.assets) await expect(inReport(page, asset.assetTag)).toBeVisible()
    // The register export needs asset:view only; the overview export needs report:export, which the viewer lacks.
    expect(mayExport("viewer", "register") && !mayExport("viewer", "overview")).toBe(true)
    await expect(page.getByRole("link", { name: "ส่งออกรายงานภาพรวม" })).toHaveCount(0)
    const register = await downloadBy(page, () => page.getByRole("link", { name: "ส่งออกทะเบียนทรัพย์สิน" }).click(), "register", (name) => testInfo.outputPath(name))
    expect((await openWorkbook(register.bytes)).Assets.slice(1).map((row) => row[0]).sort()).toEqual(desk.assets.map((asset) => asset.assetTag).sort())
    // A direct request is refused too.
    expect((await page.request.get(`/api/reports/assets-overview/export?search=${encodeURIComponent(search)}`)).status()).toBe(403)

    await openView(page, "catalog")
    await measure.recordPage("reports: catalog (viewer)")
    // The overview card offers the viewer no export: "ไม่มีสิทธิ์ส่งออก" and the permission it needs in words; the
    // register card keeps its export (asset:view).
    const overviewCard = catalogCard(page, "accounting", "assets-overview")
    await expect(overviewCard.locator('a[href^="/api/reports/assets-overview/export"]')).toHaveCount(0)
    await expect(overviewCard.getByText("ไม่มีสิทธิ์ส่งออก", { exact: true })).toBeVisible()
    await expect(overviewCard.getByText("ต้องมีสิทธิ์ส่งออกของรายงาน", { exact: true })).toBeVisible()
    await expect(page.locator('[data-report-view-content] a[href^="/api/reports/assets-overview/export"]')).toHaveCount(0)
    await expect(catalogCard(page, "accounting", "assets-register").getByRole("link", { name: "ส่งออก Excel: ทะเบียนทรัพย์สิน" })).toBeVisible()
    await expectCatalogRights(page, "viewer")
  })

  // Finding M2 (expected to fail until fixed): the import and export page shows the import template's download to a
  // role without asset:create, and the template route answers it 403.
  test("the import and export page offers no import template without asset:create (finding M2)", async ({ page, measure }) => {
    // M2 fixed (FX5): this test now keeps the import template hidden from a role without asset:create.
    await measure.visit("/th/asset-management/import-export", "asset import and export (viewer)")
    expect((await page.request.get("/api/assets/import-template")).status()).toBe(403)
    await expect(page.locator('main a[href^="/api/assets/import-template"]')).toHaveCount(0)
  })
})

test.describe("the IT head", () => {
  asUser("itHead")

  test("the IT head is offered the repair and disposal exports their role holds", async ({ page, measure }) => {
    // Spec §7 since decision DX6 (ก): the IT head holds maintenance:export, disposal:export and audit:export.
    for (const key of ["maintenance", "disposal", "audit"] as const) expect(mayExport("itHead", key), key).toBe(true)
    await measure.visit("/th/reports?view=catalog", "reports: catalog (IT head)")
    await expectCatalogRights(page, "itHead")
    await measure.visit("/th/maintenance", "maintenance list (IT head)")
    await expect(page.locator('main a[href^="/api/maintenance-tickets/export"]')).toHaveCount(1)
    await measure.visit("/th/disposal", "disposal list (IT head)")
    await expect(page.locator('main a[href^="/api/disposal-requests/export"]')).toHaveCount(1)
  })

  // The module exports only the IT head may use (spec §7 since DX6 (ก)): the IT head's own session proves the files
  // open. A GET of each, no page: it runs in one project, since no device or theme takes part.
  test("the IT head's repair, disposal and findings exports download files that open", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-light", "a GET of each file: no device or theme takes part")
    // The findings exports narrow to the run's own asset tags: the dev data grows run by run, and the export of
    // everything is not what this step checks (it proves the files open).
    const runId = readRunState().runId
    for (const [route, sheet] of [
      ["/api/maintenance-tickets/export", null],
      ["/api/disposal-requests/export", null],
      [`/api/audit-findings/export?status=all&search=${runId}`, "Audit Findings"],
    ] as const) {
      const response = await page.request.get(route)
      expect(response.status(), route).toBe(200)
      expect(response.headers()["content-type"], route).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      const sheets = await openWorkbook(await response.body())
      const names = Object.keys(sheets)
      expect(names.length, route).toBeGreaterThan(0)
      if (sheet) expect(names, route).toContain(sheet)
      expect(sheets[names[0]][0]?.length ?? 0, `${route}: a header row`).toBeGreaterThan(1)
    }
    const pdf = await page.request.get(`/api/audit-findings/export-pdf?status=all&search=${runId}`)
    expect(pdf.status()).toBe(200)
    expect(isPdf(await pdf.body()), "the findings PDF opens").toBe(true)
  })
})
