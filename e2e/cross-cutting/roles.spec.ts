// Roles and permissions (spec §6.6): the view-only user is refused every create, edit and approve page and request
// and reads lists that offer no such action; IT staff are refused the approve and review actions; the employee lands
// on My Assets and sees only their own assets. refusals.ts holds the pages and requests (pinned by the unit test).
import { expect, test, asUser } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { createAsset, handOver, projectMarker, readAssetChoices, registerAssetsAsItStaff } from "./support/records.ts"
import { APPROVE_API_REFUSALS, isWriteLink, lacks, READ_ONLY_LISTS, REVIEW_BUTTON_NAMES, VIEWER_API_REFUSALS, VIEWER_PAGE_REFUSALS } from "./support/refusals.ts"
import { expectApprovalInboxNotFound, expectRefused, readOnlyUrl, writeControls } from "./support/roles-ui.ts"
import { expectNotFound, visitRefused } from "./support/ui.ts"
import { controlNames, detailWriteControls, openMoreActionsIfShown, readMenuEntries } from "../asset-detail/detail-steps.ts"
import { DETAIL_VIEWS, DETAIL_WORDS } from "../asset-detail/detail-words.ts"

test.describe("the viewer", () => {
  asUser("viewer")

  test("the viewer is refused every create, edit and approve page", async ({ page, measure, browser }, testInfo) => {
    const desk = await registerAssetsAsItStaff(browser, testInfo, [{ slug: "ROLE1", name: "สิทธิ์ผู้ดู" }])
    await desk.close()
    for (const refusal of VIEWER_PAGE_REFUSALS) {
      expect(lacks("viewer", refusal.permission), refusal.path).toBe(true)
      if (refusal.permission === "approve-inbox") {
        await expectApprovalInboxNotFound(page, measure, "the viewer")
        continue
      }
      await visitRefused(page, measure, refusal.path.replace(":asset", desk.assets[0].id), refusal.permission, `refused: ${refusal.path}`)
    }
  })

  test("the viewer's create, edit and approve requests are refused with 403", async ({ page }) => {
    for (const refusal of [...VIEWER_API_REFUSALS, ...APPROVE_API_REFUSALS]) expect(lacks("viewer", refusal.permission), refusal.path).toBe(true)
    await expectRefused(page.request, [...VIEWER_API_REFUSALS, ...APPROVE_API_REFUSALS])
  })

  // Finding M5 (expected to fail until fixed): the asset register, an asset's page and the audit rounds offer the
  // viewer create, edit and scan links (and the import helper) that lead to the access-denied page.
  test("the viewer's lists offer no create, edit or approve control (finding M5)", async ({ page, measure, browser }, testInfo) => {
    // M5 fixed (FX5, FX6): this test now keeps the view-only lists free of create, edit and scan links.
    const desk = await registerAssetsAsItStaff(browser, testInfo, [{ slug: "ROLE2", name: "รายการอ่านอย่างเดียว" }])
    await desk.close()
    const offered: string[] = []
    for (const path of READ_ONLY_LISTS) {
      const url = readOnlyUrl(path, desk.assets[0], "ROLE2", testInfo)
      // The asset's page is measured by the finding M6 test (its QR code fails axe); here only its controls count.
      if (path === "/th/assets/:asset") await page.goto(url, { waitUntil: "load" })
      else await measure.visit(url, `read-only: ${path}`)
      for (const control of await writeControls(page)) offered.push(`${path}: ${control}`)
    }
    expect(offered).toEqual([])
  })

  // Finding M6 (expected to fail until fixed): an asset's page draws its QR code as <svg role="img"> with no name
  // (qrcode.react without a title), an axe serious violation (svg-img-alt, WCAG 1.1.1) for every person who opens it.
  test("an asset's page passes axe: its QR code has a name (finding M6)", async ({ page, measure, browser }, testInfo) => {
    // M6 fixed (FX2): this test now keeps the QR code named.
    const desk = await registerAssetsAsItStaff(browser, testInfo, [{ slug: "ROLE4", name: "หน้าทรัพย์สิน" }])
    await desk.close()
    await measure.visit(`/th/assets/${desk.assets[0].id}`, "asset page (viewer)")
    await expect(page.getByRole("main").getByText(desk.assets[0].assetTag).first()).toBeVisible()
  })

  // Page group 1 (spec §7.1, §10): no tab of an asset's page offers the viewer a write control: no create, edit or
  // transaction link, none of the page's write words ("จัดการ" included, R35), no file to upload. Everyone gets the
  // phone's bar, and the viewer's holds only "การดำเนินการอื่น", whose sheet holds only "พิมพ์ป้าย" (R21); the
  // desktop draws no empty "อื่น ๆ". An action the person may not take is left out, never shown as unavailable. The
  // overview's "ข้อมูลยังไม่ครบ" line is for asset:edit only (R59), so the viewer never sees it.
  test("the viewer's asset page offers no write control on any tab (group 1 asset detail)", async ({ page, measure, browser, e2eDevice }, testInfo) => {
    const desk = await registerAssetsAsItStaff(browser, testInfo, [{ slug: "ROLE5", name: "แท็บอ่านอย่างเดียว", ownershipType: "personal" }])
    await desk.close()
    const asset = desk.assets[0]
    const offered: string[] = []
    for (const view of DETAIL_VIEWS) {
      await measure.visit(`/th/assets/${asset.id}${view === "overview" ? "" : `?view=${view}`}`, `asset page, ${view} (viewer)`)
      for (const control of [...(await writeControls(page)), ...(await detailWriteControls(page))]) offered.push(`${view}: ${control}`)
      if ((await page.getByRole("main").locator('input[type="file"]').count()) > 0) offered.push(`${view}: a file input`)
      if ((await page.getByRole("main").locator('[data-slot="asset-data-gaps"]').count()) > 0) offered.push(`${view}: the data gaps line`)
      if (e2eDevice === "phone") expect(await controlNames(page.locator('[data-slot="action-bar"]')), `${view}: the viewer's bar`).toEqual([DETAIL_WORDS.moreActions])
      const more = await openMoreActionsIfShown(page, e2eDevice)
      if (!more) continue
      for (const entry of await readMenuEntries(more)) {
        if (!entry.available) offered.push(`${view}: ${entry.label}, unavailable`)
        else if (entry.label !== DETAIL_WORDS.printLabel) offered.push(`${view}: ${entry.label}`)
      }
      for (const href of await more.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))) {
        if (isWriteLink(href)) offered.push(`${view}: link ${href.split("?")[0]}`)
      }
      await page.keyboard.press("Escape")
    }
    expect(offered).toEqual([])
  })
})

test.describe("IT staff", () => {
  asUser("itStaff")

  test("IT staff are refused the approve and review actions, and their own request shows no decision", async ({ page, measure }, testInfo) => {
    for (const refusal of APPROVE_API_REFUSALS) expect(lacks("itStaff", refusal.permission), refusal.path).toBe(true)
    await expectRefused(page.request, APPROVE_API_REFUSALS)
    await expectApprovalInboxNotFound(page, measure, "IT staff")

    // Their own disposal request: they may ask, not decide.
    const choices = await readAssetChoices(page, measure)
    const asset = await createAsset(page.request, testInfo, choices, { slug: "ROLE3", name: "คำขอของเจ้าหน้าที่" })
    const run = readRunData()
    const response = await page.request.post("/api/disposal-requests", {
      data: {
        assetId: asset.id,
        disposalType: "dispose",
        reason: `${projectMarker(testInfo)} ขอตัดจำหน่ายเพื่อทดสอบสิทธิ์`,
        requestedById: run.employees.itStaff.id,
        approverId: null,
        saleValue: null,
        salvageValue: null,
        sourceType: null,
        sourceId: null,
      },
    })
    expect(response.status(), await response.text()).toBe(201)
    const request = (await response.json()) as { id: string }
    await measure.visit(`/th/disposal/${request.id}`, "own disposal request (IT staff)")
    await expect(page.getByRole("main").getByText(asset.assetTag).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "พิจารณาคำขอ" })).toHaveCount(0)
  })

  // Finding M4, decided (DX3 (ก)): the findings page shows the approve, reject, plan and close controls only to a role
  // with audit:approve, the permission the review route checks; IT staff hold audit:edit and see none of them.
  test("the findings page offers IT staff no review control without audit:approve (finding M4)", async ({ page, measure }) => {
    await measure.visit("/th/audit/findings", "audit findings (IT staff)")
    // The queue's empty state (auditFinding.emptyTitle) shows when there is no pending finding to look at.
    const empty = await page.getByRole("main").getByText("ไม่พบรายการไม่ตรงตามตัวกรอง", { exact: true }).filter({ visible: true }).count()
    test.skip(empty > 0, "no pending finding in the dev database to look at")
    for (const name of REVIEW_BUTTON_NAMES) await expect(page.getByRole("main").getByRole("button", { name, exact: true }).filter({ visible: true })).toHaveCount(0)
  })
})

test.describe("the employee", () => {
  asUser("employee")

  test("the employee lands on My Assets and sees only their own assets", async ({ page, measure, browser }, testInfo) => {
    const run = readRunData()
    const desk = await registerAssetsAsItStaff(browser, testInfo, [
      { slug: "OWN", name: "ของพนักงาน", ownershipType: "personal" },
      { slug: "OTHER", name: "ของผู้รับมอบ", ownershipType: "personal" },
    ])
    const [own, other] = desk.assets
    await handOver(desk.request, own, run.employees.employee.id, desk.choices)
    await handOver(desk.request, other, run.employees.receiver1.id, desk.choices)
    await desk.close()

    await measure.visit("/th", "employee landing")
    await expect(page).toHaveURL(/\/th\/my-assets(?:[?#]|$)/)
    const main = page.getByRole("main")
    await expect(main.getByText(own.assetTag, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(main.getByText(other.assetTag, { exact: true })).toHaveCount(0)
    // Every tag listed is one of the run's handovers to this employee (one per project): a tag names its project.
    const tags = await main.getByText(new RegExp(`^${readRunState().runId}-(?:desktop|phone)-\\S+$`)).filter({ visible: true }).allTextContents()
    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) expect(tag.trim()).toMatch(/-OWN$/)

    await measure.visit(`/th/my-assets/${own.id}`, "my asset detail")
    await expect(main.getByText(own.assetTag).first()).toBeVisible()
    await measure.visit(`/th/my-assets/${other.id}`, "another person's asset (employee)")
    await expectNotFound(page)
    // The register and the reports are not the employee's.
    await visitRefused(page, measure, `/th/assets/${own.id}`, "asset:view", "asset page (employee)")
    await visitRefused(page, measure, "/th/reports", "report:view", "reports (employee)")
    expect((await page.request.get(`/api/assets/${own.id}`)).status()).toBe(403)
  })
})
