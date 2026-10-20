// Reports and exports (spec §6.5): each report view shows the run's E2E assets, each export the role may use
// downloads a file that opens, and a role without the export permission does not see it (nor may it download it).
// The users and their permissions are spec §7's (run-plan.ts); export-rights.ts says which export each may use.
import { expect, test, asUser } from "../support/fixtures.ts"
import { readRunState } from "../support/state.ts"
import { mayExport } from "./support/export-rights.ts"
import { downloadBy, isPdf, openWorkbook } from "./support/files.ts"
import { createAsset, projectMarker, readAssetChoices, registerAssetsAsItStaff } from "./support/records.ts"
import { expectCatalogRights, inReport, openView } from "./support/reports-ui.ts"
import { statValue } from "./support/ui.ts"

test.describe("IT staff", () => {
  asUser("itStaff")

  test("IT staff see the run's assets in every report view and download the register and the overview, which open", async ({ page, measure }, testInfo) => {
    const choices = await readAssetChoices(page, measure)
    const assets = []
    for (const [index, price] of [1000, 2000, 3000].entries()) {
      assets.push(await createAsset(page.request, testInfo, choices, { slug: `RPT${index + 1}`, name: `รายงาน ${index + 1}`, purchasePrice: price }))
    }
    const search = `${projectMarker(testInfo)}-RPT`

    // Overview: the totals, the preview of the three, and the run's department in the breakdown.
    await measure.visit(`/th/reports?search=${encodeURIComponent(search)}`, "reports: overview")
    await expect(statValue(page, "ทรัพย์สินทั้งหมด")).toHaveText("3")
    await expect(statValue(page, "มูลค่ารวม")).toHaveText("6,000.00")
    for (const asset of assets) await expect(inReport(page, asset.assetTag)).toBeVisible()
    await expect(page.locator("[data-report-view-content]").getByText(new RegExp(`^${readRunState().runId}-D - `)).filter({ visible: true }).first()).toBeVisible()

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

    // Operations: no serial number on any of the three, each in the list to fix.
    await openView(page, "operations")
    await measure.recordPage("reports: operations")
    await expect(statValue(page, "ไม่มีหมายเลขเครื่อง", "[data-report-view-content]")).toHaveText("3")
    for (const asset of assets) await expect(inReport(page, asset.assetTag)).toBeVisible()

    // The catalog: the exports IT staff may use, and the ones they may not.
    await openView(page, "catalog")
    await measure.recordPage("reports: catalog")
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
    for (const [route, sheet] of [
      ["/api/maintenance-tickets/export", null],
      ["/api/disposal-requests/export", null],
      ["/api/audit-findings/export?status=all", "Audit Findings"],
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
    const pdf = await page.request.get("/api/audit-findings/export-pdf?status=all")
    expect(pdf.status()).toBe(200)
    expect(isPdf(await pdf.body()), "the findings PDF opens").toBe(true)
  })
})
