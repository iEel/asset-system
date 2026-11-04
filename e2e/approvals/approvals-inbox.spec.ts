// งานรออนุมัติ (boards AP and AP-Phone; page group 6 plan 2), as the IT head on the computer and the phone, light and
// dark. The strip counts every pending item the IT head may see, and the dev database keeps its old pending requests,
// so a cell is compared with the tab read on the same page, never with a fixed number. IT staff make three run-marked
// requests, each with a photo; the IT head reads them in the strip, the tabs and the search, opens one in the panel,
// rejects it with a remark (the next one opens), and approves the other two at once with the not-opened warning. A
// request of the IT head's own shows the separation-of-duties badge, a disabled tick and a panel without buttons. axe
// runs on every page the tests visit, the panel open, in both themes (the four projects).
import { asUser, expect, test } from "../support/fixtures.ts"
import { actAs, createAssets, createRoom, expectToast, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import {
  approvalsUrl,
  createInboxRequest,
  createStaffRequests,
  disposalPanel,
  inboxTab,
  openItem,
  queueEntries,
  queueEntry,
  selectionBar,
  stripValue,
  tabCount,
  tick,
  type InboxRequest,
} from "./approvals-support.ts"

asUser("itHead")

test("the IT head's own request reads อนุมัติเองไม่ได้ with a disabled tick, and its panel has no decision", async ({ page, measure, e2eTheme, e2eDevice }, testInfo) => {
  const ownPrefix = recordPrefix(testInfo, "APR2")
  // IT staff make the room and the asset; the IT head asks for its disposal in their own name.
  await actAs(page, "itStaff", e2eTheme)
  const roomId = await createRoom(`${ownPrefix}-R`, `${ownPrefix} ห้องทดสอบงานรออนุมัติ`)
  const choices = await readAssetChoices(page, measure)
  const [asset] = await createAssets(page, choices, roomId, [`${ownPrefix}-A1`])
  await actAs(page, "itHead", e2eTheme)
  const own = await createInboxRequest(page, asset, "itHead", `${ownPrefix} คำขอของหัวหน้า IT เอง เสนอตัดจำหน่าย`)

  await measure.visit(approvalsUrl({ tab: "disposal", search: ownPrefix }), "IT head: their own request in the queue")
  const entry = queueEntry(page, e2eDevice, own.id)
  await expect(entry).toBeVisible()
  if (e2eDevice === "phone") {
    // The card names the requester as คุณ and the reason it cannot be decided; there are no ticks.
    await expect(entry).toContainText("คุณ ·")
    await expect(entry).toContainText("คุณเป็นผู้ขอ")
  } else {
    await expect(entry).toContainText("อนุมัติเองไม่ได้")
    await expect(tick(page, own)).toBeDisabled()
    await expect(page.getByRole("button", { name: /^เลือกทั้งหมดที่อนุมัติได้/ }).filter({ visible: true })).toHaveCount(0)
  }

  const panel = await openItem(page, e2eDevice, own)
  await expect(panel.locator('[data-approval-sod="blocked"]')).toBeVisible()
  await expect(panel.getByRole("button", { name: /^(?:อนุมัติ|ปฏิเสธ)$/ })).toHaveCount(0)
  await expect(panel.locator("#approval-disposal-remark")).toHaveCount(0)
  await measure.recordPage("IT head: their own request in the panel")
})

// The three requests walk through four tests: read in the list, opened in the panel, one rejected, two approved at
// once. Each needs the one before; a failure skips the rest.
test.describe("three requests of IT staff", () => {
  test.describe.configure({ mode: "serial" })

  let prefix = ""
  let requests: InboxRequest[] = []
  const queueOf = () => ({ tab: "disposal", search: prefix })

  test("the strip and the tabs count the same pending items, and a search for the run's marker leaves its three requests", async ({ page, measure, e2eTheme, e2eDevice }, testInfo) => {
    prefix = recordPrefix(testInfo, "APR1")
    requests = await createStaffRequests(page, measure, e2eTheme, prefix, 3)
    await actAs(page, "itHead", e2eTheme)

    // The unfiltered page: the รอทั้งหมด cell counts what the ทั้งหมด tab lists (no search, no overdue filter).
    await measure.visit(approvalsUrl(), "IT head: approvals")
    await expect(page.locator("[data-approval-strip-cell]")).toHaveCount(3)
    expect(await stripValue(page, "total"), "the total cell and the ทั้งหมด tab").toBe(await tabCount(page, "ทั้งหมด"))

    // ตัดจำหน่าย: its count is the list's total.
    await inboxTab(page, "ตัดจำหน่าย").click()
    await page.waitForURL((url) => url.searchParams.get("tab") === "disposal")
    await expect(inboxTab(page, "ตัดจำหน่าย")).toHaveAttribute("aria-current", "page")
    await measure.recordPage("IT head: the disposal tab")
    const disposalTotal = await tabCount(page, "ตัดจำหน่าย")
    await expect(page.getByRole("main")).toContainText(`จาก ${disposalTotal}`)

    // The search for the run's marker: the three requests and nothing else, on every tab's count.
    const search = page.getByRole("search").locator('input[name="search"]')
    await search.fill(prefix)
    await search.press("Enter")
    await page.waitForURL((url) => url.searchParams.get("search") === prefix && url.searchParams.get("tab") === "disposal")
    await measure.recordPage("IT head: the run's requests")
    await expect(queueEntries(page, e2eDevice).filter({ visible: true })).toHaveCount(3)
    for (const request of requests) await expect(queueEntry(page, e2eDevice, request.id)).toBeVisible()
    expect(await tabCount(page, "ตัดจำหน่าย")).toBe("3")
    expect(await tabCount(page, "ทั้งหมด")).toBe("3")
    expect(await tabCount(page, "ตรวจนับ")).toBe("0")
    // The strip does not follow the search.
    expect(await stripValue(page, "total")).not.toBe("")
  })

  test("a row opens its request in the panel: the photo, the reason and what each decision does; on the phone the panel takes the page", async ({ page, measure, e2eDevice }) => {
    const [first] = requests
    expect(first, "the first test made the requests").toBeTruthy()
    await measure.visit(approvalsUrl(queueOf()), "IT head: the run's requests")
    await expect(page.locator('[data-approval-panel="empty"]').filter({ visible: true })).toHaveCount(e2eDevice === "phone" ? 0 : 1)
    if (e2eDevice === "phone") {
      // No ticks and no selection bar on the phone (spec §7.7).
      await expect(page.locator("[data-approval-tick]").filter({ visible: true })).toHaveCount(0)
      await expect(page.getByRole("button", { name: /^เลือกทั้งหมดที่อนุมัติได้/ }).filter({ visible: true })).toHaveCount(0)
    }

    const panel = await openItem(page, e2eDevice, first)
    await expect(panel).toBeVisible()
    await expect(panel.locator("[data-approval-photos]")).toContainText("รูปที่ 1 / 1")
    await expect(panel).toContainText(first.reason)
    await expect(panel).toContainText("ถ้าปฏิเสธ")
    await expect(panel).toContainText(first.disposalNo)
    await expect(panel.getByRole("button", { name: "อนุมัติ", exact: true })).toBeVisible()
    await expect(panel.getByRole("button", { name: "ปฏิเสธ", exact: true })).toBeVisible()
    await measure.recordPage("IT head: a request in the panel")

    const back = page.getByRole("link", { name: "กลับไปงานรออนุมัติ" }).filter({ visible: true })
    if (e2eDevice === "phone") {
      // The list waits behind the back link; the panel is the page's width (the 16px gutters aside).
      await expect(page.locator("[data-approval-list]")).toBeHidden()
      await expect(back).toBeVisible()
      // The panel's section (its card fills it), not the card's padded content.
      const width = (await page.locator('[data-approval-panel="disposal"]').boundingBox())?.width ?? 0
      expect(width, "the panel spans the phone").toBeGreaterThan((page.viewportSize()?.width ?? 0) - 48)
      await back.click()
      await page.waitForURL((url) => !url.searchParams.has("item"))
      await expect(queueEntry(page, e2eDevice, first.id)).toBeVisible()
    } else {
      // From xl the list stays beside the panel, the chosen row marked.
      await expect(back).toHaveCount(0)
      await expect(queueEntry(page, e2eDevice, first.id)).toBeVisible()
    }
  })

  test("a rejection needs a remark; with one the next request opens, and the first reads ไม่อนุมัติ", async ({ page, measure, e2eDevice }) => {
    const [first, second] = requests
    expect(first, "the first test made the requests").toBeTruthy()
    await measure.visit(approvalsUrl({ ...queueOf(), item: `disposal:${first.id}` }), "IT head: the first request in the panel")
    const panel = disposalPanel(page, first.id)
    await expect(panel).toBeVisible()

    // No remark: the error shows under the field, focus goes to it, and nothing is sent.
    await panel.getByRole("button", { name: "ปฏิเสธ", exact: true }).click()
    const remark = page.locator("#approval-disposal-remark")
    await expect(page.locator("#approval-disposal-remark-error")).toContainText("กรุณาระบุเหตุผล")
    await expect(remark).toHaveAttribute("aria-invalid", "true")
    await expect(remark).toBeFocused()
    await measure.recordPage("IT head: the rejection's missing remark under the field")

    await remark.fill(`${prefix} รูปไม่ตรงกับทรัพย์สิน ขอข้อมูลเพิ่ม`)
    await measure.timed("IT head: reject the first request", async () => {
      await panel.getByRole("button", { name: "ปฏิเสธ", exact: true }).click()
      await page.waitForURL((url) => url.searchParams.get("item") === `disposal:${second.id}`)
    })
    await expectToast(page, `ปฏิเสธคำขอ ${first.disposalNo} แล้ว`)
    await expect(disposalPanel(page, second.id)).toBeVisible()
    await measure.recordPage("IT head: the next request after the rejection")
    if (e2eDevice === "desktop") await expect(queueEntry(page, e2eDevice, first.id)).toHaveCount(0)

    await measure.visit(`/th/disposal/${first.id}`, "IT head: the rejected request")
    await expect(page.getByRole("main").getByText("ไม่อนุมัติ").first()).toBeVisible()
  })

  test("two requests ticked are approved at once, the tick kept across pages, with the warning for the one not opened", async ({ page, measure, e2eDevice }) => {
    test.skip(e2eDevice === "phone", "the phone has no ticks (spec §7.7): it decides in the panel, as the rejection test does")
    const [, second, third] = requests
    expect(third, "the first test made the requests").toBeTruthy()
    await measure.visit(approvalsUrl(queueOf()), "IT head: the run's two pending requests")
    // The second is opened in the panel; the third never is.
    await openItem(page, e2eDevice, second)
    await tick(page, second).check()
    await tick(page, third).check()
    const bar = selectionBar(page)
    await expect(bar).toContainText("2 เลือกแล้ว (จากทุกหน้า) · คำขอตัดจำหน่าย")
    await measure.recordPage("IT head: two requests ticked")

    // Another page and back (a second page of the list when it has one, the first page loaded afresh when not): the
    // selection is kept in the tab's session.
    const range = (await page.getByRole("main").innerText()).match(/จาก ([\d,]+) ·/)
    const total = Number((range?.[1] ?? "0").replace(/,/g, ""))
    if (total > 25) {
      await measure.visit(approvalsUrl({ ...queueOf(), pageSize: "25", page: "2" }), "IT head: page 2 of the run's requests")
      await expect(selectionBar(page)).toContainText("2 เลือกแล้ว")
    }
    await measure.visit(approvalsUrl(queueOf()), "IT head: back to the run's requests")
    await expect(selectionBar(page)).toContainText("2 เลือกแล้ว (จากทุกหน้า) · คำขอตัดจำหน่าย")
    await expect(tick(page, second)).toBeChecked()
    await expect(tick(page, third)).toBeChecked()

    await selectionBar(page).getByRole("button", { name: "ตรวจสอบและอนุมัติ 2 รายการ" }).click()
    const dialog = page.getByRole("dialog", { name: "อนุมัติ 2 รายการ" })
    await expect(dialog.getByText("อนุมัติได้ 2 รายการ · ข้ามไป 0 รายการ")).toBeVisible()
    const notOpened = dialog.locator("[data-approval-not-opened]")
    await expect(notOpened).toContainText("ยังไม่ได้เปิดดูรูป 1 รายการ")
    await expect(notOpened).toContainText(third.asset.assetTag)
    await expect(notOpened).not.toContainText(second.asset.assetTag)
    await dialog.locator("#approval-inbox-bulk-remark").fill(`${prefix} อนุมัติทั้งสองรายการ`)
    await measure.recordPage("IT head: the bulk approval's confirm")
    await measure.timed("IT head: approve the two", async () => {
      await dialog.getByRole("button", { name: "อนุมัติ 2 รายการ" }).click()
      await expect(dialog).toHaveCount(0)
    })
    await expectToast(page, "อนุมัติแล้ว 2 รายการ")
    await expect(selectionBar(page)).toHaveCount(0)
    await expect(queueEntries(page, e2eDevice)).toHaveCount(0)
    await measure.recordPage("IT head: the run's requests approved")

    for (const request of [second, third]) {
      await measure.visit(`/th/disposal/${request.id}`, "IT head: an approved request")
      await expect(page.getByRole("main").getByText("อนุมัติแล้ว รอตัดจำหน่าย").first()).toBeVisible()
    }
  })
})
