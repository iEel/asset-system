// The phone walk's search past ten (group 2 spec §16, "Phone walk (phone projects)": the search offers "แสดงเพิ่ม" past
// 10; P3-R15). Phone projects only, the phone on WebKit as the field audit's walk. The walk's own round has 8 items
// (P3-R23), so the test opens its own round on its own room of eleven assets whose tags share one search word, and the
// IT head cancels the round whatever happens (spec §16: never on a first page or a global count).
import { asUser, expect, runPhoneOnWebKit, test } from "../support/fixtures.ts"
import { createAssets, createRoom, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import * as rounds from "./round-steps.ts"
import * as scan from "./scan-steps.ts"
import { SCAN_WORDS as S } from "./scan-words.ts"

runPhoneOnWebKit()
asUser("itStaff")

test("the phone walk's search shows ten matches with แสดงเพิ่ม, and the press shows the eleventh (group 2 spec §16, P3-R15)", async ({ page, measure, e2eDevice, playwright, baseURL }, testInfo) => {
  test.skip(e2eDevice !== "phone", "the phone walk's search (spec §16: phone projects)")
  test.setTimeout(240_000)
  const prefix = recordPrefix(testInfo, "AUW")
  const roomCode = `${prefix}-R`
  const roomName = `${prefix} ห้องทดสอบค้นหาเดินตรวจ`
  const roomId = await createRoom(roomCode, roomName)
  const choices = await readAssetChoices(page, measure)
  // Eleven tags that share the search word "<prefix>-W"; none is the word whole, so no exact code goes first (P3-R17).
  const tags = Array.from({ length: 11 }, (_, index) => `${prefix}-W${String(index + 1).padStart(2, "0")}`)
  const assets = await createAssets(page, choices, roomId, tags)
  // The body the form sends (spec §7: no status).
  const opened = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบทดสอบค้นหาเดินตรวจ`,
      auditYear: Number(bangkokDate().slice(0, 4)),
      scopeLocationId: roomId,
      includeClosedAssets: false,
      riskPreset: "all",
      sampleRate: 100,
      startDate: bangkokDate(),
      endDate: bangkokDate(10),
    },
  })
  expect(opened.status(), await opened.text()).toBe(201)
  const round = (await opened.json()) as { id: string; auditNo: string; generatedItems: number }
  expect(round.generatedItems, "the room's eleven assets").toBe(11)
  const term = `${prefix}-W`
  try {
    await measure.visit(`/th/audit/rounds/${round.id}/scan`, "scan page, a round of eleven")
    await scan.pickRoom(page, { code: roomCode, name: roomName })
    await scan.typeSearch(page, term)
    await scan.expectSearchLine(page, term, 11, 0)
    const more = scan.searchResults(page).getByRole("button", { name: S.showMore, exact: true })
    await expect(scan.searchRows(page)).toHaveCount(10)
    await expect(more).toBeVisible()
    await measure.recordPage("search of eleven, ten shown with แสดงเพิ่ม")
    await more.click()
    await expect(scan.searchRows(page)).toHaveCount(11)
    await expect(more).toHaveCount(0)
    for (const asset of assets) await expect(scan.searchRows(page).filter({ hasText: asset.assetTag })).toHaveCount(1)
  } finally {
    await rounds.cancelAsItHead(playwright.request, baseURL, round.id, `${prefix} ยกเลิกรอบทดสอบค้นหาเดินตรวจ`)
  }
})
