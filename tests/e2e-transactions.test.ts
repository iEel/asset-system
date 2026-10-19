import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The E2E suite's asset transaction area (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §6.1):
// the pure plan and the known findings are loaded; the specs, which run under Playwright, are read as text.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")

// Every transaction spec runs as IT staff, takes test from the suite's fixtures (measured, themed, signed in) and never
// from @playwright/test.
function readTxSpec(file: string): string {
  const source = read(file)
  assert.ok(source.split("\n").includes(`asUser("itStaff")`), `${file}: as IT staff`)
  assert.match(source, /from "\.\.\/support\/fixtures\.ts"/, `${file}: the suite's test`)
  assert.doesNotMatch(source, /from "@playwright\/test"/, `${file}: not Playwright's own test`)
  return source
}

// The expected-to-fail tests of a file, by the finding each names.
function expectedFailures(source: string): string[] {
  return [...source.matchAll(/test\.fail\(true, "(TX-A\d+): /g)].map((match) => match[1])
}

test("an asset registered on the form with a photo and a purchase document, a wrong entry first; the area's records carry the run and the project (e2e transactions task 1, TX1)", async () => {
  const plan = await import("../e2e/transactions/tx-plan.ts")
  const { E2E_PROJECTS } = await import("../e2e/support/matrix.ts")
  // One code per project of the foundation's matrix, so the four projects never share an asset.
  assert.deepEqual(Object.keys(plan.PROJECT_CODES), E2E_PROJECTS.map((project) => project.name))
  assert.equal(new Set(Object.values(plan.PROJECT_CODES)).size, 4)
  assert.equal(plan.txAssetTag("E2E-1019T2329", "phone-dark", "REG"), "E2E-1019T2329-PD-REG")
  assert.equal(plan.txAssetName("E2E-1019A", "desktop-light", "โน้ตบุ๊ก"), "E2E-1019A DL โน้ตบุ๊ก")
  assert.ok(plan.txAssetTag("E2E-1019T2329", "desktop-light", "BM3").length <= 50)
  assert.throws(() => plan.txAssetTag("E2E-1019A", "setup", "X"), /four device × theme projects/)
  assert.deepEqual(plan.secondLocation("E2E-1019A"), { code: "E2E-1019A-L2", name: "E2E-1019A ห้องปลายทาง E2E", locationType: "Room" })
  // Asia/Bangkok is UTC+7: 17:30 UTC is already the next day there.
  assert.equal(plan.bangkokDate(0, new Date("2026-10-19T17:30:00Z")), "2026-10-20")
  assert.equal(plan.bangkokDate(-1, new Date("2026-10-19T10:00:00Z")), "2026-10-18")
  assert.equal(plan.bangkokDate(7, new Date("2026-10-19T10:00:00Z")), "2026-10-26")
  assert.deepEqual(plan.PHONE_KEYBOARD_OPEN, { width: 390, height: 360 })

  // A known finding drops only its own rule on its own element, keeps axe's counts, and says so on the test.
  const known = await import("../e2e/transactions/known-findings.ts")
  const violation = (target: string) => ({ id: "svg-img-alt", impact: "serious", help: "", targets: [target] })
  const record = {
    label: "asset page",
    url: "/th/assets/1",
    loadMs: 1,
    domContentLoadedMs: 1,
    axe: { serious: 2, critical: 0, moderate: 0, minor: 0, failing: [violation(`svg[height="160"]`), violation("svg.chart")] },
  }
  const annotations: { type: string; description?: string }[] = []
  // The rule is shown on a list of its own: TX-A2, the finding it was written for, is fixed (FX2).
  const qrWithoutName = { finding: "TX-A2", rule: "svg-img-alt", target: /^svg\[height="160"\]$/, why: "the asset page's QR code is an image with no text alternative" }
  known.dropKnownAxe(record, [qrWithoutName], { annotations } as never)
  assert.deepEqual(record.axe.failing.map((item) => item.targets[0]), ["svg.chart"])
  assert.equal(record.axe.serious, 2, "axe's counts stay in the summary")
  assert.match(annotations[0]?.description ?? "", /^TX-A2: /)
  // Every known finding has its expected-to-fail test.
  const findings = readTxSpec("e2e/transactions/findings.spec.ts")
  for (const entry of known.KNOWN_AXE) assert.ok(expectedFailures(findings).includes(entry.finding), entry.finding)

  // The register's thumbnails (the shared allow-list, ruling TX-R9): a 404 (a file outside this server's upload folder,
  // FX8) or a cancelled image of /api/attachments/<id>/thumbnail passes; the same answer of the attachment itself does not.
  const core = await import("../e2e/support/measure-core.ts")
  const { ALLOW_LIST } = await import("../e2e/support/allow-list.ts")
  const register = "http://localhost:3100/th/assets"
  const attachment = "http://localhost:3100/api/attachments/23f49e63-83eb-44fb-ba55-4f77bef5b552"
  const classified = core.classify(
    {
      console: [],
      responses: [
        { method: "GET", url: `${attachment}/thumbnail`, status: 404, resourceType: "image", pageUrl: register },
        { method: "GET", url: attachment, status: 404, resourceType: "image", pageUrl: register },
      ],
      failures: [{ method: "GET", url: `${attachment}/thumbnail`, errorText: "net::ERR_ABORTED", resourceType: "image", pageUrl: register }],
    },
    ALLOW_LIST,
    [],
  )
  assert.deepEqual(classified.allowed.map((item) => item.id), ["foreign-attachment-thumbnail", "thumbnail-cancelled-on-leave"])
  assert.deepEqual(classified.unexpectedResponses.map((response) => response.url), [attachment])

  // The register spec: the wrong entry first (no room), the photo and the PDF, the save bar with the keyboard open.
  const spec = readTxSpec("e2e/transactions/register-asset.spec.ts")
  assert.match(spec, /await expectFieldError\(page, "asset-current-location", "กรุณาระบุข้อมูลนี้"\)/)
  assert.match(spec, /expect\(posted, "the wrong entry posts nothing"\)\.toBe\(0\)/)
  assert.match(spec, /setInputFiles\(PDF_FIXTURE\)/)
  assert.match(spec, /setInputFiles\(PHOTO_FIXTURE\)/)
  assert.match(spec, /if \(e2eDevice === "phone"\) await openPhoneKeyboard\(page\)/)
  assert.match(spec, /await expectReachable\(save\)/)
  // Every measured page of the area goes through the settle and the known list, never the bare Measure calls.
  const support = read("e2e/transactions/tx-support.ts")
  assert.match(support, /return dropKnownAxe\(await measure\.recordPage\(label\), KNOWN_AXE, testInfo\)/)
  assert.doesNotMatch(spec, /measure\.(visit|recordPage)\(/)
})

test("a handover signed with the device's own pointer and printed, a due date before the handover refused under the field, and no double checkout (e2e transactions task 2, TX2)", async () => {
  const spec = readTxSpec("e2e/transactions/handover.spec.ts")
  assert.match(spec, /await expectFieldError\(page, "checkout-handover-mode", "กรุณาเลือกลักษณะการส่งมอบก่อนดำเนินการต่อ"\)/)
  assert.match(spec, /await expectFieldError\(page, "checkout-expected-return", "วันกำหนดคืนต้องเป็นวันเดียวกับหรือหลังวันที่ส่งมอบ"\)/)
  assert.match(spec, /review\.getByRole\("button", \{ name: "ยืนยันส่งมอบ" \}\)/)
  assert.match(spec, /await expectPrints\(page, "พิมพ์ใบส่งมอบ"\)/)
  assert.match(spec, /expect\(after\.status\.name\)\.toBe\("In Use"\)/)
  assert.match(spec, /expect\(after\.status\.name\)\.toBe\("Checked Out"\)/)
  // The double checkout: a second form of the same asset, refused (409) as the test itself declares.
  assert.match(spec, /const otherDesk = await page\.context\(\)\.newPage\(\)/)
  assert.match(spec, /measure\.expectRefusal\(\{ method: "POST", url: new RegExp\(`\/api\/assets\/\$\{asset\.id\}\/checkout\$`\), status: 409,/)
  assert.deepEqual(expectedFailures(spec), ["TX-A1"])
  // The pad: the mouse on the desktop, Chromium's touch input on the phone, then the tap the emulation loses.
  const support = read("e2e/transactions/tx-support.ts")
  assert.match(support, /await cdp\.send\("Input\.dispatchTouchEvent", \{ type: "touchStart", touchPoints: \[points\[0\]\] \}\)/)
  assert.match(support, /expect\(pointerTypes, "the stroke reached the pad as the device's own pointer"\)\.toEqual\(\[device === "desktop" \? "mouse" : "touch"\]\)/)
  assert.match(support, /await group\.locator\("div\[id\]"\)\.first\(\)\.tap\(\)/)
  // The A4 documents' finding is fixed (FX1): no workflow drops it, and its test is no longer expected to fail.
  const known = await import("../e2e/transactions/known-findings.ts")
  assert.ok(!known.KNOWN_AXE.some((entry) => entry.rule === "dlitem"))
  assert.ok(!expectedFailures(read("e2e/transactions/findings.spec.ts")).includes("TX-A3"))
})

test("a return to the second room prints the RT- document, and a return sent to repair opens a repair record (e2e transactions task 3, TX3)", async () => {
  const spec = readTxSpec("e2e/transactions/return.spec.ts")
  for (const field of ["checkin-return-by", "checkin-receive-by", "checkin-condition-after", "checkin-next-status", "checkin-next-location"]) {
    assert.ok(spec.includes(`"${field}"`), field)
  }
  assert.match(spec, /await expectPrints\(page, "พิมพ์ใบรับคืน"\)/)
  assert.match(spec, /expect\(after\.currentLocationId\)\.toBe\(room\.id\)/)
  assert.match(spec, /selectOption\(\{ label: "ส่งซ่อม" \}\)/)
  assert.match(spec, /page\.request\.get\(`\/api\/maintenance-tickets\?assetId=\$\{asset\.id\}`\)/)
  assert.match(spec, /expect\(after\.status\.name\)\.toBe\("Under Maintenance"\)/)
  assert.deepEqual(expectedFailures(spec), [])
  // The run's second room: once per run, as the seed admin, through the location API.
  const support = read("e2e/transactions/tx-support.ts")
  assert.match(support, /request\.newContext\(\{ baseURL, storageState: fromRoot\(ADMIN_STATE_FILE\) \}\)/)
  assert.match(support, /admin\.post\("\/api\/locations"/)
  // The phone's scrolling review: fixed (FX3); its phone-only test keeps it fixed.
  const known = await import("../e2e/transactions/known-findings.ts")
  assert.ok(!known.KNOWN_AXE.some((entry) => entry.rule === "scrollable-region-focusable"))
  const findings = read("e2e/transactions/findings.spec.ts")
  assert.ok(!expectedFailures(findings).includes("TX-A8"))
  assert.match(findings, /test\.skip\(e2eDevice !== "phone", "the review dialog scrolls on the phone only"\)/)
})

test("a transfer to the second room and a new custodian, and its TR- document; the two gaps of the document are expected to fail (e2e transactions task 4, TX4)", async () => {
  const spec = readTxSpec("e2e/transactions/transfer.spec.ts")
  assert.match(spec, /await expectFieldError\(page, "transfer-to-location", "เลือกปลายทางการโอนย้ายอย่างน้อย 1 รายการ"\)/)
  assert.match(spec, /await expectFieldError\(page, "transfer-reason", "กรุณาระบุข้อมูลนี้"\)/)
  assert.match(spec, /expect\(after\.custodianId\)\.toBe\(receiver\.id\)/)
  assert.match(spec, /await visit\(measure, `\/th\/asset-management\/transfers\/\$\{transfer\.id\}`, "TR- document", testInfo\)/)
  assert.match(spec, /await expectPrints\(page, "พิมพ์เอกสารโอนย้าย"\)/)
  assert.deepEqual(expectedFailures(spec), ["TX-A4", "TX-A6"])
  assert.match(spec, /test\.describe\.configure\(\{ mode: "serial" \}\)/)
})

test("three assets added on the batch form move to the second room in one bulk move, a wrong entry first (e2e transactions task 5, TX5)", async () => {
  const spec = readTxSpec("e2e/transactions/bulk-move.spec.ts")
  assert.match(spec, /getByRole\("button", \{ name: "เพิ่มเป็นชุด" \}\)/)
  assert.match(spec, /expect\(batch\.created\)\.toBe\(3\)/)
  assert.match(spec, /await expectFieldError\(page, "bulk-move-assets", "กรุณาเลือกทรัพย์สินอย่างน้อย 1 รายการ"\)/)
  assert.match(spec, /await expectFieldError\(page, "bulk-move-to-location", "กรุณาระบุข้อมูลนี้"\)/)
  assert.match(spec, /expect\(after\.currentLocationId, asset\.assetTag\)\.toBe\(room\.id\)/)
  assert.match(spec, /await page\.waitForLoadState\("networkidle"\)/)
  assert.deepEqual(expectedFailures(spec), [])
})

test("the latest transaction cancelled: the state before it, the VOID document with the reason, the cancel in the history; its two gaps are expected to fail (e2e transactions task 6, TX6)", async () => {
  const spec = readTxSpec("e2e/transactions/cancel.spec.ts")
  assert.match(spec, /await expectFieldError\(page, "transaction-cancel-reason", "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร"\)/)
  assert.match(spec, /page\.getByRole\("status"\)\.filter\(\{ hasText: "VOID \/ ยกเลิกแล้ว" \}\)/)
  assert.match(spec, /expect\(after\.custodianId\)\.toBeNull\(\)/)
  assert.match(spec, /await visitAssetPage\(measure, asset\.id, "asset history after the cancel", testInfo, "operations"\)/)
  assert.deepEqual(expectedFailures(spec), ["TX-A5", "TX-A7"])
})

test("the desk delivery on the phone: taps, the keyboard over the form, a finger signature, the HO- document on the phone (e2e transactions task 7, TX7)", async () => {
  const spec = readTxSpec("e2e/transactions/desk-delivery.spec.ts")
  assert.match(spec, /test\.skip\(e2eDevice !== "phone", "the desk delivery is done on the phone \(spec §6\.1\.8\)"\)/)
  // Chromium on the phone (ruling TX-R3): Playwright draws a finger only through Chromium's touch input.
  assert.ok(!spec.split("\n").includes("runPhoneOnWebKit()"), "the desk delivery stays on Chromium")
  assert.match(spec, /await openPhoneKeyboard\(page\)/)
  assert.match(spec, /await expectReachable\(save\)/)
  assert.match(spec, /await expectReachable\(confirm\)/)
  assert.match(spec, /\.tap\(\)/)
  assert.match(spec, /await signOnPad\(page, page\.getByRole\("group", \{ name: "ลายเซ็นผู้รับ" \}\), e2eDevice, browserName\)/)
  // Every spec of the area is pinned by this file.
  const { readdirSync } = await import("node:fs")
  assert.deepEqual(readdirSync("e2e/transactions").filter((file) => file.endsWith(".spec.ts")).sort(), [
    "bulk-move.spec.ts", "cancel.spec.ts", "desk-delivery.spec.ts", "findings.spec.ts", "handover.spec.ts", "register-asset.spec.ts", "return.spec.ts", "transfer.spec.ts",
  ])
})
