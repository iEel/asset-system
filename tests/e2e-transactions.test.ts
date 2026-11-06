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
  // The department tests' assets start in an existing department (group 3 plan 1 task 8): IT first, else the first by code,
  // among those the asset form offers for the run's company; never the run's own nor another run's. The run makes none.
  const departments = [
    { id: "d-run", code: "E2E-1019A-D", name: "E2E-1019A แผนกทดสอบ E2E", companyId: "c1" },
    { id: "d-old", code: "E2E-1018B-D", name: "E2E-1018B แผนกทดสอบ E2E", companyId: "c1" },
    { id: "d-other", code: "ADM", name: "ธุรการ", companyId: "c2" },
    { id: "d-hr", code: "HR", name: "ทรัพยากรบุคคล", companyId: null },
    { id: "d-acc", code: "ACC", name: "บัญชี", companyId: "c1" },
    { id: "d-it", code: "IT", name: "เทคโนโลยีสารสนเทศ", companyId: "c1" },
  ]
  const run = { departmentId: "d-run", companyId: "c1" }
  assert.equal(plan.chooseSecondDepartment(departments, run)?.id, "d-it")
  assert.equal(plan.chooseSecondDepartment(departments.filter((department) => department.code !== "IT"), run)?.id, "d-acc")
  assert.equal(plan.chooseSecondDepartment(departments.filter((department) => !["IT", "ACC"].includes(department.code)), run)?.id, "d-hr")
  assert.equal(plan.chooseSecondDepartment(departments.slice(0, 3), run), undefined)
  // The negative search's word: one of the other department's name that the asset's own text does not hold.
  assert.equal(plan.departmentWord("ฝ่าย เทคโนโลยีสารสนเทศ", ["E2E-1019A-DL-MW1", "E2E-1019A DL โน้ตบุ๊กค้นหาหลายคำ", "E2E-1019A แผนกทดสอบ E2E"]), "เทคโนโลยีสารสนเทศ")
  assert.equal(plan.departmentWord("e2e IT", ["E2E-1019A-DL-MW1"]), "IT")
  assert.throws(() => plan.departmentWord("dl", ["E2E-1019A DL โน้ตบุ๊ก"]), /every word/)
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

  // The thumbnails (the shared allow-list, ruling TX-R9): the register's 96px ones and the asset page's photo card
  // (?size=card, group 1 asset detail task 4). A 404 (a file outside this server's upload folder, FX8) or a cancelled
  // image of /api/attachments/<id>/thumbnail passes; another size, or the same answer of the attachment itself, does not.
  const core = await import("../e2e/support/measure-core.ts")
  const { ALLOW_LIST } = await import("../e2e/support/allow-list.ts")
  const register = "http://localhost:3100/th/assets"
  const detail = "http://localhost:3100/th/assets/23f49e63-83eb-44fb-ba55-4f77bef5b552"
  const attachment = "http://localhost:3100/api/attachments/23f49e63-83eb-44fb-ba55-4f77bef5b552"
  const classified = core.classify(
    {
      console: [],
      responses: [
        { method: "GET", url: `${attachment}/thumbnail`, status: 404, resourceType: "image", pageUrl: register },
        { method: "GET", url: `${attachment}/thumbnail?size=card`, status: 404, resourceType: "image", pageUrl: detail },
        { method: "GET", url: `${attachment}/thumbnail?size=huge`, status: 404, resourceType: "image", pageUrl: detail },
        { method: "GET", url: attachment, status: 404, resourceType: "image", pageUrl: register },
      ],
      failures: [
        { method: "GET", url: `${attachment}/thumbnail`, errorText: "net::ERR_ABORTED", resourceType: "image", pageUrl: register },
        { method: "GET", url: `${attachment}/thumbnail?size=card`, errorText: "net::ERR_ABORTED", resourceType: "image", pageUrl: detail },
      ],
    },
    ALLOW_LIST,
    [],
  )
  assert.deepEqual(classified.allowed.map((item) => item.id), ["foreign-attachment-thumbnail", "foreign-attachment-thumbnail", "thumbnail-cancelled-on-leave", "thumbnail-cancelled-on-leave"])
  assert.deepEqual(classified.unexpectedResponses.map((response) => response.url), [`${attachment}/thumbnail?size=huge`, attachment])

  // The register spec: the wrong entry first (no room), the photo and the PDF, the save bar with the keyboard open.
  const spec = readTxSpec("e2e/transactions/register-asset.spec.ts")
  assert.match(spec, /await expectFieldError\(page, "asset-current-location", "กรุณาระบุข้อมูลนี้"\)/)
  assert.match(spec, /expect\(posted, "the wrong entry posts nothing"\)\.toBe\(0\)/)
  assert.match(spec, /setInputFiles\(PDF_FIXTURE\)/)
  assert.match(spec, /setInputFiles\(PHOTO_FIXTURE\)/)
  // Group 4 plan 2 Task 6a: the photo section is folded, so the spec opens it before it checks the queued photo.
  assert.match(spec, /await openAssetFormSection\(page, "รูปแรกเข้าทรัพย์สิน"\)\n\s+await page\.locator\("#asset-photo-file"\)\.setInputFiles\(PHOTO_FIXTURE\)/)
  assert.equal(JSON.parse(readFileSync("messages/th.json", "utf8")).asset.initialAssetPhotos, "รูปแรกเข้าทรัพย์สิน", "the create form's photo section title")
  assert.match(spec, /if \(e2eDevice === "phone"\) await openPhoneKeyboard\(page\)/)
  assert.match(spec, /await expectReachable\(save\)/)
  // Every measured page of the area goes through the settle and the known list, never the bare Measure calls.
  const support = read("e2e/transactions/tx-support.ts")
  assert.match(support, /return dropKnownAxe\(await measure\.recordPage\(label\), KNOWN_AXE, testInfo\)/)
  assert.doesNotMatch(spec, /measure\.(visit|recordPage)\(/)
  // The streamed form's options are waited for before readAssetMasters reads them (menu B shell task 13B loop 3).
  const masters = support.slice(support.indexOf("export async function readAssetMasters("), support.indexOf("export type CreatedAsset"))
  const goto = masters.indexOf(`await page.goto("/th/assets/new")`)
  const read0 = masters.indexOf(`const categories = await options("asset-category")`)
  for (const wait of [
    `await expect(page.locator("#asset-category option").filter({ hasText: /คอมพิวเตอร์พกพา/ }).first()).toBeAttached()`,
    `await expect(page.locator("#asset-status option", { hasText: /^พร้อมใช้งาน$/ })).toHaveCount(1)`,
    `await expect(page.locator("#asset-condition option", { hasText: /^ดี$/ })).toHaveCount(1)`,
  ]) {
    const at = masters.indexOf(wait)
    assert.ok(goto >= 0 && at > goto && at < read0, wait)
  }
  // The four transaction pages load no asset register (server asset search): the first arrival check after a
  // navigation into one waits TRANSACTION_PAGE_ARRIVAL_MS, 15 s (30 s while they loaded every asset, 13B loop 7);
  // nothing else waits longer.
  assert.match(read("src/lib/asset-operation-options.ts"), /export async function getAssetOperationMasterOptions\(options\?: \{ employeeDetail\?: false; conditionsFor\?: AssetOperationConditionOperation \}\): Promise<AssetOperationMasterOptions>/)
  // โอนย้าย alone reads the employees' own department and the rooms' branch, with no held count (group 3 plan 3 P3-R9).
  assert.match(read("src/lib/asset-operation-options.ts"), /export async function getAssetOperationMasterOptions\(options: \{ employeeDepartment: true; locationBranch: true; conditionsFor\?: AssetOperationConditionOperation \}\): Promise<AssetOperationMasterOptions<AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption>>/)
  assert.match(read("src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx"), /readBulkMovePageOptions\(db\)/, "bulk-move reads its active rooms and categories only (group 3 spec §10.3; plan 4 P4-R12)")
  assert.doesNotMatch(read("src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx"), /getAssetOperationMasterOptions/, "bulk-move")
  assert.match(read("src/app/[locale]/(dashboard)/asset-management/transfer/page.tsx"), /getAssetOperationMasterOptions\(\{ employeeDepartment: true, locationBranch: true \}\)/, "โอนย้าย reads the employees' own department and the rooms' branch (group 3 plan 3 P3-R9)")
  assert.match(read("src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx"), /getAssetOperationMasterOptions\(\{ conditionsFor: "checkin" \}\)/, "รับคืน names its conditions (group 3 plan 2 Task 8)")
  assert.match(read("src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx"), /getAssetOperationMasterOptions\(\{ employeeDetail: true, conditionsFor: "checkout" \}\)/, "ส่งมอบ alone reads the employees' detail (final review M4) and offers the checkout conditions (group 3 spec §19.1)")
  assert.doesNotMatch(read("src/lib/asset-operation-options.ts"), /getAssetOperationAssetLists\b/)
  assert.match(support, /export const TRANSACTION_PAGE_ARRIVAL_MS = 15_000\n/)
  assert.match(support, /const TRANSACTION_PAGE_PATH = \/\^\\\/th\\\/asset-management\\\/\(\?:checkout\|checkin\|transfer\|bulk-move\)\(\?:\[\?#\]\|\$\)\//)
  assert.match(support, /await measure\.page\.goto\(path, \{ waitUntil: "load" \}\)\n\s*if \(TRANSACTION_PAGE_PATH\.test\(path\)\) await expect\(measure\.page\.getByRole\("heading", \{ level: 1 \}\)\)\.toBeVisible\(\{ timeout: TRANSACTION_PAGE_ARRIVAL_MS \}\)\n\s*return record\(measure, label, testInfo\)/)
  const arrival = "{ timeout: TRANSACTION_PAGE_ARRIVAL_MS }"
  const arrivals: [string, string, number][] = [
    ["e2e/transactions/handover.spec.ts", `toBeVisible(${arrival})`, 2],
    ["e2e/transactions/return.spec.ts", `toBeVisible(${arrival})`, 1],
    ["e2e/transactions/transfer.spec.ts", `toBeVisible(${arrival})`, 1],
    ["e2e/transactions/desk-delivery.spec.ts", `toBeVisible(${arrival})`, 1],
    ["e2e/transactions/findings.spec.ts", `toBeVisible(${arrival})`, 1],
    ["e2e/cross-cutting/field-errors.spec.ts", `toContainText(asset.assetTag, ${arrival})`, 4],
  ]
  for (const [file, check, count] of arrivals) assert.equal(read(file).split(check).length - 1, count, file)
  // The global expect timeout stays 10 s.
  assert.match(read("playwright.config.ts"), /expect: \{ timeout: 10_000 \},/)
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
  assert.ok(spec.includes('await expectFieldError(page, "checkout-asset", TX_WORDS.reasonNotReady)'))
  assert.ok(spec.includes('const blocked = await findAssetRow(page, "checkout-asset", asset.assetTag, asset.assetTag)'))
  assert.ok(spec.includes("await expectAssetBlocked(page, blocked, TX_WORDS.reasonNotReady)"))
  assert.ok(!spec.includes('toContainText("ไม่พบรายการ")'))
  assert.deepEqual(expectedFailures(spec), [], "TX-A1 is fixed (FX9)")
  // Group 3 plan 1 Task 6: the footer's ตรวจสอบและบันทึก, the condition chips preselected, desktop only (the phone steps
  // are desk-delivery.spec.ts), and the footer that shows.
  assert.ok(spec.includes("{ name: TX_WORDS.reviewAndSave, exact: true }"))
  assert.ok(!spec.includes('{ name: "บันทึก", exact: true }'))
  assert.equal(spec.split('test.skip(e2eDevice === "phone", PHONE_STEPS)').length - 1, 4)
  assert.ok(spec.includes('await expect(conditionChip(page, "ดี")).toBeChecked()'))
  assert.equal(spec.split(`page.locator('[data-slot="sticky-form-footer"]').filter({ visible: true })`).length - 1, 2, "the bar that shows: from Task 7 the page also holds the phone bar")
  // The pad: the mouse on the desktop, Chromium's touch input on the phone, then the tap the emulation loses.
  const support = read("e2e/transactions/tx-support.ts")
  assert.ok(support.includes('export function conditionChip(page: Page, label: string, groupId = "checkout-condition"): Locator {'))
  assert.match(support, /await cdp\.send\("Input\.dispatchTouchEvent", \{ type: "touchStart", touchPoints: \[points\[0\]\] \}\)/)
  assert.match(support, /expect\(pointerTypes, "the stroke reached the pad as the device's own pointer"\)\.toEqual\(\[device === "desktop" \? "mouse" : "touch"\]\)/)
  assert.match(support, /await group\.locator\("div\[id\]"\)\.first\(\)\.tap\(\)/)
  // The A4 documents' finding is fixed (FX1): no workflow drops it, and its test is no longer expected to fail.
  const known = await import("../e2e/transactions/known-findings.ts")
  assert.ok(!known.KNOWN_AXE.some((entry) => entry.rule === "dlitem"))
  assert.ok(!expectedFailures(read("e2e/transactions/findings.spec.ts")).includes("TX-A3"))
})

test("a return to the second room prints the RT- document and writes the return department, and a return sent to repair links its repair record from the RT- (e2e transactions task 3, TX3; group 3 plan 2 task 11)", async () => {
  const spec = readTxSpec("e2e/transactions/return.spec.ts")
  for (const field of ["checkin-condition-after", "checkin-next-status", "checkin-next-location"]) assert.ok(spec.includes(`"${field}"`), field)
  // ผู้รับคืน starts as the signed-in person (group 3 spec §8.3), so the first wrong field is the condition group, which has no default.
  assert.ok(spec.includes(`await expect(page.locator('input[name="checkin-condition-after"]').first()).toBeFocused()`))
  assert.ok(!spec.includes('await expect(page.locator("#checkin-receive-by")).toBeFocused()'))
  assert.equal(spec.split("await expect(page.locator(\"#checkin-receive-by\")).toContainText(`${staff.code} - ${staff.fullNameTh}`)").length - 1, 3)
  assert.ok(!spec.includes('pickSearchable(page, "checkin-receive-by"'))
  assert.equal(spec.split('await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)').length - 1, 2, "both returns start with the holder")
  assert.ok(!spec.includes('pickSearchable(page, "checkin-return-by"'))
  assert.ok(spec.includes('const listbox = await searchAssets(page, "checkin-checkout", receiver.code)'))
  assert.ok(spec.includes('await pickAsset(page, "checkin-checkout", asset.assetTag, asset.assetTag)'))
  // The chips, the searchable room and the footer's ตรวจสอบและบันทึก (spec §5, §8.3, §17).
  assert.equal(spec.split('await conditionChip(page, "ดี", "checkin-condition-after").check()').length - 1, 1)
  assert.equal(spec.split('await conditionChip(page, "เสียหาย", "checkin-condition-after").check()').length - 1, 2)
  assert.equal(spec.split("await pickSearchable(page, \"checkin-next-location\", room.code, `${room.code} - ${room.name}`)").length - 1, 3)
  for (const old of ['locator("#checkin-condition-after").selectOption', 'locator("#checkin-next-location").selectOption', '{ name: "บันทึก", exact: true }']) assert.ok(!spec.includes(old), old)
  assert.ok(spec.includes("{ name: TX_WORDS.reviewAndSave, exact: true }"))
  assert.equal(spec.split("await saveReturnForm(page, asset.id, ").length - 1, 3)
  assert.match(spec, /await expectPrints\(page, "พิมพ์ใบรับคืน"\)/)
  assert.match(spec, /expect\(after\.currentLocationId\)\.toBe\(room\.id\)/)
  // The return department, read from the asset (spec §6, §12): the setting's default, and its own history line.
  assert.ok(spec.includes("expect(after.departmentId).toBe(returnDepartment.id)"))
  assert.ok(spec.includes("expect(after.department?.code).toBe(RETURN_DEPARTMENT_CODE)"))
  assert.ok(spec.includes('await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)'))
  assert.equal(spec.split('if (e2eDevice === "desktop")').length - 1, 1, "the summary on the desktop only")
  // ส่งซ่อม: the hint, then the RT-'s link to the record it opened or joined (spec §8.3, §8.7).
  assert.match(spec, /selectOption\(\{ label: "ส่งซ่อม" \}\)/)
  assert.ok(spec.includes('await expect(page.getByRole("main")).toContainText(TX_WORDS.sendToRepairHint)'))
  assert.ok(spec.includes("fillTemplate(TX_WORDS.repairOpened, { repairNo: ticket.repairNo })") && spec.includes("fillTemplate(TX_WORDS.repairJoined, { repairNo: repair.repairNo })"))
  assert.ok(spec.includes("expect(checkin.repair).toEqual({ id: ticket.id, repairNo: ticket.repairNo, joined: false })"))
  assert.ok(spec.includes("expect(checkin.repair).toEqual({ id: repair.id, repairNo: repair.repairNo, joined: true })"))
  assert.ok(!spec.includes("await visit(measure, `/th/maintenance/"), "the repair record opens from the RT-'s link, not by its address")
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

test("a permanent handover whose asset went into repair is returned into ส่งซ่อม under that repair (server search addendum S-R48)", async () => {
  const spec = readTxSpec("e2e/transactions/return.spec.ts")
  const th = JSON.parse(read("messages/th.json"))
  const title = "a permanent handover whose asset went into repair is returned into ส่งซ่อม under that repair, with no second record and no custodian (S-R48)"
  const start = spec.indexOf(`test("${title}"`)
  assert.ok(start >= 0, "the S-R48 test")
  const body = spec.slice(start)
  // Its asset carries the run and the project; the repair is opened unfinished through the repair form's own route.
  assert.ok(body.includes('await createTxAsset(page, masters, testInfo.project.name, "RT3", '))
  assert.ok(body.includes('page.request.post("/api/maintenance-tickets", {'))
  assert.match(body, /done: false,/)
  assert.ok(body.includes('expect((await readAsset(page, asset.id)).status.name, "the repair moved the asset").toBe("Under Maintenance")'))
  // The picker takes it, and the next status is ส่งซ่อม alone, with the app's own notice.
  assert.ok(body.includes('await pickAsset(page, "checkin-checkout", asset.assetTag, asset.assetTag)'))
  assert.ok(body.includes(`await expect(nextStatus).toHaveText("${th.checkin.sendToRepairOption}")`))
  // The app's notice, read through TX_WORDS (group 3 spec §8.3); Task 8 keeps its words.
  const { TX_WORDS } = await import("../e2e/transactions/tx-words.ts")
  assert.equal(TX_WORDS.openRepairNotice, th.checkin.openRepairReturnNotice)
  assert.ok(body.includes('await expect(page.getByRole("main")).toContainText(TX_WORDS.openRepairNotice)'), "checkin.openRepairReturnNotice")
  // After the save: Under Maintenance, no custodian, and the one repair record still open.
  assert.match(body, /expect\(after\.status\.name\)\.toBe\("Under Maintenance"\)/)
  assert.match(body, /expect\(after\.custodianId\)\.toBeNull\(\)/)
  assert.ok(body.includes('toEqual([repair.id])'))
  assert.ok(body.includes(`toContainText("${th.asset.noCustodian}")`))
  // Nothing deleted, and none of the run's forbidden writes.
  for (const banned of ["request.delete", "/api/admin/settings", "ldap", "import-confirm", "import-preview"]) assert.ok(!body.toLowerCase().includes(banned), banned)
})

test("โอนย้าย through the footer: the second room and a new holder whose department the asset takes, read back with its history line and the TR-'s แผนกเดิม; a held asset moved only to another room; a ส่วนกลาง asset that keeps its department; a computer whose component follows; a broken asset refused a holder (e2e transactions task 4, TX4; group 3 plan 3 task 7)", () => {
  const spec = readTxSpec("e2e/transactions/transfer.spec.ts")
  const support = read("e2e/transactions/tx-support.ts")
  // TR1 keeps the wrong entry, the custodian, the TR- document and its print; TX-A4, TX-A6 and the ข้อมูลเก่า row stay.
  assert.match(spec, /await expectFieldError\(page, "transfer-to-location", "เลือกปลายทางการโอนย้ายอย่างน้อย 1 รายการ"\)/)
  assert.match(spec, /await expectFieldError\(page, "transfer-reason", "กรุณาระบุข้อมูลนี้"\)/)
  assert.match(spec, /expect\(after\.custodianId\)\.toBe\(receiver\.id\)/)
  assert.match(spec, /await visit\(measure, `\/th\/asset-management\/transfers\/\$\{transfer\.id\}`, "TR- document", testInfo\)/)
  assert.match(spec, /await expectPrints\(page, "พิมพ์เอกสารโอนย้าย"\)/)
  assert.deepEqual(expectedFailures(spec), [], "TX-A4 (FX10) and TX-A6 (FX13) are fixed")
  assert.ok(spec.includes('await expect(row).toContainText(TX_WORDS.legacyRow.replace("{location}", `${room.code} - ${room.name}`))'), "the ข้อมูลเก่า line names the room (S-R47)")
  assert.ok(!spec.includes("legacy-checkout") && !spec.includes("pickAsset("), "the ข้อมูลเก่า row is read, never picked")
  assert.match(spec, /test\.describe\.configure\(\{ mode: "serial" \}\)/)
  assert.ok(!spec.includes("prints the status, room and department before and after"), "TX-A6's comment says what the TR- printed (P3-R8)")
  // The footer's ตรวจสอบและบันทึก (spec §5, §17), here and in TX-A8; the other forms keep common.save.
  for (const file of ["e2e/transactions/transfer.spec.ts", "e2e/transactions/findings.spec.ts"]) {
    const source = read(file)
    assert.ok(!source.includes('{ name: "บันทึก", exact: true }'), `${file}: no exact บันทึก`)
    assert.ok(source.includes("{ name: TX_WORDS.reviewAndSave, exact: true }"), `${file}: the footer's word`)
  }
  // The helpers. The save sets its wait first, then the footer, the review and its confirm, and the TR- opens. A holder
  // pick waits for the page's re-ask under the holder's rule (S-R40), so no search is in flight when a save leaves.
  for (const signature of [
    "export async function readConditionId(page: Page, label: string): Promise<string>",
    'export function transferNowCell(page: Page, row: "location" | "holder" | "department"): Locator',
    "export async function pickTransferHolder(page: Page, assetId: string, employee: { code: string; fullNameTh: string }): Promise<void>",
    "export async function centreInView(locator: Locator): Promise<void>",
    "export type SavedTransfer = { id: string; documentNo: string }",
    "export async function saveTransferForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedTransfer>",
  ]) assert.ok(support.includes(signature), signature)
  const body = (name: string) => {
    const start = support.indexOf(`export async function ${name}(`)
    return support.slice(start, support.indexOf("\nexport ", start + 1))
  }
  const save = body("saveTransferForm")
  const at = ["TX_WORDS.reviewAndSave", '"ตรวจสอบก่อนโอนย้าย"', '"ยืนยันโอนย้าย"'].map((word) => save.indexOf(word))
  assert.ok(at.every((index, i) => index >= 0 && (i === 0 || index > at[i - 1])), "saveTransferForm: footer, review, confirm")
  assert.ok(save.indexOf("page.waitForResponse(") >= 0 && save.indexOf("page.waitForResponse(") < at[0], "saveTransferForm: the wait first")
  assert.ok(save.includes("/transfer`") && save.includes("/th/asset-management/transfers/"), "saveTransferForm: the route, then the TR-")
  const holder = body("pickTransferHolder")
  assert.ok(holder.indexOf("page.waitForResponse(") >= 0 && holder.indexOf("page.waitForResponse(") < holder.indexOf('pickSearchable(page, "transfer-to-custodian"'), "pickTransferHolder: the wait before the pick")
  assert.ok(holder.includes('url.searchParams.get("assignCustodian") === "1"'), "pickTransferHolder: the re-ask under the holder's rule")
  const condition = body("readConditionId")
  assert.ok(condition.includes('page.goto("/th/assets/new")') && condition.includes('page.locator("#asset-condition option"'), "readConditionId: the new asset form's conditions")
  // TR1 (spec §6, §9, §17): ตอนนี้, the picker's name in the table, the locked row, a chip, the summary or the footer
  // line, the department read back from the asset, the history and the TR-.
  for (const part of [
    '"TR1", "โน้ตบุ๊กโอนย้าย", { departmentId: second.id })',
    'await expect(transferNowCell(page, "department")).toContainText(`${second.code} - ${second.name}`)',
    'await expect(page.locator("#transfer-to-custodian")).toHaveAccessibleName(/^ผู้ถือครองปลายทาง/)',
    "await expect(department).toContainText(fillTemplate(TX_WORDS.transferFollowsHolder, { department: runDepartment.name }))",
    'page.getByRole("group", { name: /^เหตุผลการโอนย้าย/ }).getByRole("button", { name: TX_WORDS.reasonChipUser, exact: true })',
    "await centreInView(chip)",
    "await expect(reason).toHaveValue(`${TX_WORDS.reasonChipUser}: `)",
    'await expect(chip).toHaveAttribute("aria-pressed", "true")',
    'templatePattern(TX_WORDS.transferLead, { count: "3" })',
    "await expect(summary).not.toContainText(templatePattern(TX_WORDS.transferCrossBranch, {}))",
    "await expect(footer).toContainText(templatePattern(TX_WORDS.transferFooter, { tag: asset.assetTag }))",
    "await page.waitForURL(new RegExp(`/th/asset-management/transfers/${transfer.id}(?:[?#]|$)`))",
    "expect(after.departmentId).toBe(data.departmentId)",
    'await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)',
    "await expect(valueBeside(page, TX_WORDS.fromDepartment)).toHaveText(`${second.code} - ${second.name}`)",
  ]) assert.ok(spec.includes(part), part)
  // TR2 (call 4; group 4 plan 2 P2-R9: seeded with its holder's department, a room-only transfer is one change),
  // TR3 (ส่วนกลาง), TR4 (a component), TR5 (a broken asset, P3-R1).
  for (const part of [
    '"TR2", "โน้ตบุ๊กย้ายห้องตามผู้ถือครอง", { custodianId: holder.id })',
    'expect([before.custodianId, before.departmentId, before.status.name]).toEqual([holder.id, data.departmentId, "Ready"])',
    'templatePattern(TX_WORDS.transferLead, { count: "1" })',
    "await expect(summary.locator('[data-summary-row=\"department\"]')).toContainText(fillTemplate(TX_WORDS.summaryKept, { value: runDepartment.name }))",
    "await expect(review).not.toContainText(runDepartment.name)",
    'toEqual([room.id, holder.id, data.departmentId, "Ready"])',
    'await expect(footer).not.toContainText(holder.fullNameTh)',
    '"TR3", "จอส่วนกลางโอนย้าย", { ownershipType: "shared", departmentId: second.id })',
    "await expect(department).toBeEnabled()",
    'toEqual([receiver.id, second.id, "In Use", data.locationId])',
    'await expect(page.getByRole("main")).not.toContainText(TX_WORDS.departmentChange)',
    '"TR4C", "เมาส์ติดเครื่องโอนย้าย", { ownershipType: "component", departmentId: second.id })',
    'await installComponentByApi(page, asset.id, component.id, "เมาส์", "1")',
    'page.locator("[data-transfer-components]")',
    'await expect(valueBeside(review, "ส่วนควบ")).toHaveText(fillTemplate(TX_WORDS.transferSummaryComponents, { count: 1 }))',
    "toEqual([receiver.id, room.id, data.departmentId])",
    'const damaged = await readConditionId(page, "เสียหาย")',
    '"TR5", "โน้ตบุ๊กเสียโอนย้าย", { conditionId: damaged })',
    "fillTemplate(TX_WORDS.assetClearedForCustodian, { assetTag: asset.assetTag, reason: TX_WORDS.reasonTransferDamaged })",
    'toEqual([409, "ASSET_TRANSFER_CONDITION_BLOCKED", "transferConditionDamaged"])',
    'toEqual([room.id, null, "Ready", data.departmentId])',
    "await expect(changes).toContainText(TX_WORDS.transferKeptBoth)",
  ]) assert.ok(spec.includes(part), part)
  assert.equal(spec.split("await saveTransferForm(page, asset.id").length - 1, 5, "every save through the footer and the review")
  assert.equal(spec.split("await pickTransferHolder(page, asset.id, ").length - 1, 5, "every holder pick waits for the re-ask (TR1 picks twice)")
  // TR1, Review Focus 3 (final review tests-1): a department picked, a holder chosen locks the row, the × in the holder's
  // row clears the holder, the row is free and empty, and the holder is chosen again; in that order, before the chip.
  const focus = [
    'await pickSearchable(page, "transfer-to-department", runDepartment.code, `${runDepartment.code} - ${runDepartment.name}`)',
    "await pickTransferHolder(page, asset.id, receiver)",
    "await expect(department).toBeDisabled()",
    "await expect(department).toContainText(fillTemplate(TX_WORDS.transferFollowsHolder, { department: runDepartment.name }))",
    `await page.locator('[data-transfer-row="holder"]').getByRole("button", { name: TX_WORDS.transferNoChange, exact: true }).click()`,
    "await expect(department).toBeEnabled()",
    "await expect(department).toHaveText(TX_WORDS.transferNoChange)",
    "await pickTransferHolder(page, asset.id, receiver)",
    "await centreInView(chip)",
  ]
  let from = 0
  for (const step of focus) {
    const index = spec.indexOf(step, from)
    assert.ok(index >= 0, `TR1 in order: ${step}`)
    from = index + step.length
  }
  assert.equal(spec.split("await readSecondDepartment()").length - 1, 3, "TR1, TR3 and TR4 (TR2 needs no second department)")
  assert.ok(!spec.includes("departmentId: second.id, custodianId: holder.id"), "no seeded mismatch (P2-R9)")
  assert.equal(spec.split('if (e2eDevice === "desktop")').length - 1, 4, "the summary on the desktop only")
  for (const banned of ["request.delete", "/api/admin/settings", "/api/departments", "/api/locations", "ldap", "import-confirm", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
})

test("ย้ายที่ตั้งหลายรายการ: the batch form's three assets and a held computer with its components gathered from two filters into one move, the bar's errors, the review's lines, the page stays with the result line; a stale tick named under the table and taken out, the refused row disabled with its reason, the route's named 409 and its cap; the phone's notice only (group 3 spec §10, §11, §17; P4-R1, P4-R3, P4-R4, P4-R8, P4-R10, P4-R18, P4-R19, P4-R22)", () => {
  const spec = readTxSpec("e2e/transactions/bulk-move.spec.ts")
  assert.match(spec, /getByRole\("button", \{ name: "เพิ่มเป็นชุด" \}\)/)
  assert.match(spec, /expect\(batch\.created\)\.toBe\(3\)/)
  assert.equal(spec.split('test.skip(e2eDevice === "phone", DESKTOP_ONLY)').length - 1, 2, "BM1 and BM2 on the desktop")
  assert.equal(spec.split('test.skip(e2eDevice !== "phone", PHONE_ONLY)').length - 1, 1, "the notice on the phone")
  const bm1 = [
    "await searchBulkMoveList(page, `${code} จอภาพย้ายที่ตั้ง ${runId}`)",
    'await expect(pageBox).toHaveAttribute("aria-checked", "mixed")',
    "const words = `${runId} ${code} ครบชุด`",
    "await searchBulkMoveList(page, words)",
    'await pickSearchable(page, "bulk-move-filter-location", runRoom.code, `${runRoom.code} - ${runRoom.name}`)',
    "await expect(bulkMoveRow(page, c2.assetTag)).toHaveCount(0)",
    "fillTemplate(TX_WORDS.bulkSelectedCount, { count: 4 })",
    'await expectFieldError(page, "bulk-move-to-location", "กรุณาระบุข้อมูลนี้")',
    'await expect(page.locator("#bulk-move-to-location")).toBeFocused()',
    'await pickSearchable(page, "bulk-move-to-location", room.code, `${room.code} - ${room.name}`)',
    "await expect(review).toContainText(fillTemplate(TX_WORDS.bulkComponentsMoved, { count: 1 }))",
    "await expect(review).toContainText(TX_WORDS.transferKeptBoth)",
    "expect(saved).toMatchObject({ updated: 4, unchanged: 0, componentSync: { updated: 1, skipped: 0 } })",
    "await expect(page).toHaveURL(/\\/th\\/asset-management\\/bulk-move(?:[?#]|$)/)",
    "await expect(result).toContainText(`${room.code} - ${room.name}`)",
    "fillTemplate(TX_WORDS.bulkFound, { count: 0 })",
    "await expect(bulkMoveRow(page, parent.assetTag)).toContainText(fillTemplate(TX_WORDS.bulkComponentsFollow, { count: 3 }))",
    "expect(after.departmentId, asset.assetTag).toBe(data.departmentId)",
    "expect(after.branchId, asset.assetTag).toBe(data.branchId)",
    'expect((await readAsset(page, parent.id)).custodianId, "the holder stays (spec §6, §10.2)").toBe(receiver.id)',
  ]
  let from = 0
  for (const step of bm1) {
    const index = spec.indexOf(step, from)
    assert.ok(index >= 0, `BM1 in order: ${step}`)
    from = index + step.length
  }
  for (const part of [
    'measure.expectRefusal({ method: "POST", url: /\\/api\\/assets\\/bulk-move$/, status: 409,',
    'await expect(page.locator("#bulk-move-selection").getByRole("button", { name: TX_WORDS.bulkRemoveBlocked, exact: true })).toBeFocused()',
    "await page.getByRole(\"button\", { name: TX_WORDS.bulkRemoveBlocked, exact: true }).click()",
    "await expect(box).toHaveAccessibleDescription(TX_WORDS.bulkReasonOpenCheckout)",
    'code: "ASSET_ACTIVE_CHECKOUT_EXISTS", error: "ASSET_ACTIVE_CHECKOUT_EXISTS", blocked: [{ assetId: asset.id, assetTag: asset.assetTag, code: "ASSET_ACTIVE_CHECKOUT_EXISTS" }]',
    'fieldErrors: { assetIds: "outOfRange" }',
    'await expect(page.getByRole("link", { name: TX_WORDS.bulkBackToRegister, exact: true })).toHaveAttribute("href", "/th/assets")',
    'expect(asked, "nothing is fetched below md (P4-R19)").toEqual([])',
  ]) assert.ok(spec.includes(part), part)
  // BM2 reads the refused row's reason on the same page after the 409, before any fresh visit, then takes it out (plan 4
  // final review tests-1, journeys-2; P4-R9).
  const bm2 = [
    "const reread = bulkMoveListAnswer(page, { q: asset.assetTag })",
    "await review.getByRole(\"button\", { name: TX_WORDS.bulkReviewConfirm, exact: true }).click()",
    "expect((await reread).status()).toBe(200)",
    "await expect(bulkMoveRow(page, asset.assetTag)).toContainText(TX_WORDS.bulkReasonOpenCheckout)",
    "await expect(bulkMoveRowBox(page, asset.assetTag)).toBeChecked()",
    "await expect(bulkMoveRowBox(page, asset.assetTag)).toBeEnabled()",
    "await page.getByRole(\"button\", { name: TX_WORDS.bulkRemoveBlocked, exact: true }).click()",
    "await expect(bulkMoveRowBox(page, asset.assetTag), \"unticked, the refused row locks with its reason\").toBeDisabled()",
    'await visit(measure, PAGE, "bulk move, after the other tab", testInfo)',
  ]
  let at2 = spec.indexOf("BM2: ")
  for (const step of bm2) {
    const index = spec.indexOf(step, at2)
    assert.ok(at2 >= 0 && index >= 0, `BM2 in order: ${step}`)
    at2 = index + step.length
  }
  // "ส่วนควบ" is no filter word: RCP and TR4 carry it with the same run id and code (Z9).
  for (const old of ["bulk-move-assets", "pickAsset(", "chosenList", "alreadyChosen", "networkidle", 'waitForURL("**/th/assets")', "${code} ส่วนควบ`"]) assert.ok(!spec.includes(old), old)
  for (const banned of ["request.delete", "/api/admin/settings", "/api/departments", "/api/locations", "ldap", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
  const support = read("e2e/transactions/tx-support.ts")
  for (const signature of [
    'export const BULK_MOVE_LIST_PATH = "/api/asset-operations/bulk-move-list"',
    "export function bulkMoveListAnswer(page: Page, query: BulkMoveListQuery = {}): Promise<Response>",
    "export async function searchBulkMoveList(page: Page, text: string): Promise<void>",
    "export function bulkMoveRowBox(page: Page, assetTag: string): Locator",
    "export async function saveBulkMove(page: Page, measure: Measure, count: number, atReview?: (review: Locator) => Promise<void>): Promise<SavedBulkMove>",
  ]) assert.ok(support.includes(signature), signature)
  const start = support.indexOf("export async function saveBulkMove(")
  const save = support.slice(start, support.indexOf("\nexport ", start + 1))
  const confirm = save.indexOf("TX_WORDS.bulkReviewConfirm")
  // Each wait must be there before it is compared, as the searchAssets pin below does (plan 4 final review tests-4).
  const wait = save.indexOf("page.waitForResponse(")
  const refresh = save.indexOf("bulkMoveListAnswer(page)")
  assert.ok(confirm >= 0 && wait >= 0 && refresh >= 0 && wait < confirm && refresh < confirm, "the save and the page's fetch after it are waited for from before the click")
  assert.deepEqual(expectedFailures(spec), [])
})

test("signOnPad centres the pad once, then watches it without scrolling: two reads an interval apart with the same top and the pad under its own middle settle it, and a moved read or a failed hit centres it again (E2E-1031M; group 3 plan 3 final review tests-3)", () => {
  const support = read("e2e/transactions/tx-support.ts")
  const start = support.indexOf("export async function signOnPad(")
  const body = support.slice(start, support.indexOf("\nexport ", start + 1))
  const poll = body.slice(body.indexOf("await expect.poll("), body.indexOf(".toBe(true)"))
  assert.ok(start >= 0 && poll.length > 0)
  assert.match(body, /const centre = \(\) => canvas\.evaluate\(\(element\) => element\.scrollIntoView\(\{ block: "center" \}\)\)\n\s+await centre\(\)\n\s+let lastTop: number \| null = null\n\s+await expect\.poll\(/)
  // The read itself never scrolls; only a moved read or a failed hit centres again, and the watch starts over.
  assert.equal(body.split("scrollIntoView(").length - 1, 1, "one scroll, in centre()")
  for (const part of [
    "const rect = element.getBoundingClientRect()",
    "document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === element",
    "if (hit && lastTop === top) return true",
    "intervals: [100, 150, 250]",
  ]) assert.ok(poll.includes(part), part)
  assert.match(poll, /if \(!hit \|\| \(lastTop !== null && lastTop !== top\)\) \{\n\s+await centre\(\)\n\s+lastTop = null\n\s+\} else \{\n\s+lastTop = top\n\s+\}/)
  assert.doesNotMatch(body, /stays put/, "the comment says what it does now")
})

test("the latest transaction cancelled: the state before it, the VOID document with the reason, the cancel in the history; its two gaps are expected to fail (e2e transactions task 6, TX6)", async () => {
  const spec = readTxSpec("e2e/transactions/cancel.spec.ts")
  assert.match(spec, /await expectFieldError\(page, "transaction-cancel-reason", "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร"\)/)
  assert.match(spec, /page\.getByRole\("status"\)\.filter\(\{ hasText: "VOID \/ ยกเลิกแล้ว" \}\)/)
  assert.match(spec, /expect\(after\.custodianId\)\.toBeNull\(\)/)
  assert.match(spec, /await visitAssetPage\(measure, asset\.id, "asset history after the cancel", testInfo, "history"\)/)
  assert.deepEqual(expectedFailures(spec), [], "TX-A5 (FX11) and TX-A7 (FX12) are fixed")
})

test("the desk delivery on the phone: three steps on one form, the read-back, a finger signature, a loan to a room, the HO- document on the phone (e2e transactions task 7, TX7; group 3 plan 1 task 7)", async () => {
  const spec = readTxSpec("e2e/transactions/desk-delivery.spec.ts")
  assert.equal(spec.split('test.skip(e2eDevice !== "phone", "the desk delivery is done on the phone (spec §6.1.8)")').length - 1, 2)
  assert.ok(!spec.split("\n").includes("runPhoneOnWebKit()"), "the desk delivery stays on Chromium")
  for (const part of ["await openPhoneKeyboard(page)", "await expectReachable(next)", "await expectReachable(confirm)", "await expectReachable(save)",
    'await expectFieldError(page, "checkout-handover-mode", "กรุณาเลือกลักษณะการส่งมอบก่อนดำเนินการต่อ")',
    'await expectFieldError(page, "checkout-expected-return", "วันกำหนดคืนต้องเป็นวันเดียวกับหรือหลังวันที่ส่งมอบ")',
    'await expectFieldError(page, "checkout-asset", TX_WORDS.reasonNotReady)',
    'page.locator("[data-checkout-read-back]")', "TX_WORDS.phoneFix", "TX_WORDS.signOnBehalf", 'await expect(page.getByRole("dialog")).toHaveCount(0)',
    'const pad = page.getByRole("group", { name: "ลายเซ็นผู้รับ" })', "await signOnPad(page, pad, e2eDevice, browserName)", ".tap()"]) assert.ok(spec.includes(part), part)
  assert.equal(read("e2e/transactions/handover.spec.ts").split('test.skip(e2eDevice === "phone", PHONE_STEPS)').length - 1, 4, "the phone's handover is desk-delivery.spec.ts")
  // Every spec of the area is pinned by this file.
  const { readdirSync } = await import("node:fs")
  assert.deepEqual(readdirSync("e2e/transactions").filter((file) => file.endsWith(".spec.ts")).sort(), [
    "bulk-move.spec.ts", "cancel.spec.ts", "desk-delivery.spec.ts", "findings.spec.ts", "handover-condition.spec.ts", "handover-department.spec.ts", "handover.spec.ts", "multi-return.spec.ts", "register-asset.spec.ts", "return-components.spec.ts", "return.spec.ts", "transfer.spec.ts",
  ])
})

test("the transaction specs find assets on the shared picker: the helper waits for the search's answer to the typed text, reads the picker's hooks, and the words are the app's (server asset search task 8)", async () => {
  const support = read("e2e/transactions/tx-support.ts")
  assert.ok(support.includes('export const ASSET_SEARCH_PATH = "/api/asset-operations/search"'))
  assert.match(read("src/app/api/asset-operations/search/route.ts"), /export async function GET\(/)
  for (const signature of [
    "export async function searchAssets(page: Page, fieldId: string, text: string): Promise<Locator>",
    "export async function findAssetRow(page: Page, fieldId: string, text: string, assetTag: string): Promise<Locator>",
    "export async function pickAsset(page: Page, fieldId: string, text: string, assetTag: string): Promise<string>",
    "export async function expectAssetBlocked(page: Page, row: Locator, reason: string)",
    "export function pickedAsset(page: Page, assetId: string): Locator",
  ]) assert.ok(support.includes(signature), signature)
  const search = support.slice(support.indexOf("export async function searchAssets("), support.indexOf("export async function findAssetRow("))
  assert.ok(search.indexOf("page.waitForResponse(") >= 0 && search.indexOf("page.waitForResponse(") < search.indexOf(".fill(text)"), "the wait is set before the text is typed")
  const picker = read("src/components/ui/asset-operation-picker.tsx")
  for (const hook of ['role="combobox"', "-listbox", "data-asset-option=", "data-asset-option-reason", "data-asset-option-group", "data-asset-picked=", "aria-disabled"]) assert.ok(picker.includes(hook), hook)
  for (const [file, id] of [["checkout-form.tsx", "checkout-asset"], ["checkin-form.tsx", "checkin-checkout"], ["transfer-form.tsx", "transfer-asset"]]) {
    assert.match(read(`src/components/asset-operations/${file}`), new RegExp(`<AssetOperationPicker\\s+id="${id}"`), file)
  }
  assert.doesNotMatch(read("src/components/asset-operations/bulk-move-form.tsx"), /<AssetOperationPicker\b/, "ย้ายที่ตั้งหลายรายการ ticks rows in its table (group 3 spec §10.1)")
  const { readdirSync } = await import("node:fs")
  const specs = [...readdirSync("e2e/transactions").filter((name) => name.endsWith(".spec.ts")).map((name) => `e2e/transactions/${name}`), "e2e/cross-cutting/field-errors.spec.ts"]
  for (const file of specs) {
    const source = read(file)
    assert.doesNotMatch(source, /(?:pickSearchable|choose)\(\w+, "(?:checkout-asset|checkin-checkout|transfer-asset|bulk-move-assets)"/, file)
    for (const id of ["checkout-asset", "checkin-checkout", "transfer-asset"]) assert.ok(!source.includes(`locator("#${id}")`), `${file}: ${id} is read through pickedAsset`)
  }
  const { TX_WORDS } = await import("../e2e/transactions/tx-words.ts")
  const values = new Set<string>()
  const walk = (node: unknown): void => {
    if (typeof node === "string") values.add(node.replace(/\{\w+\}/g, "{}"))
    else if (node && typeof node === "object") Object.values(node).forEach(walk)
  }
  walk(JSON.parse(read("messages/th.json")))
  for (const [key, word] of Object.entries(TX_WORDS)) assert.ok(values.has(word.replace(/\{\w+\}/g, "{}")), key)
})

test("ส่งมอบ gives a บุคคล asset the receiver's department, a ส่วนกลาง asset keeps its own, and a search of name words and a department word finds the asset (group 3 plan 1 task 8)", () => {
  const spec = readTxSpec("e2e/transactions/handover-department.spec.ts")
  const support = read("e2e/transactions/tx-support.ts")
  for (const signature of [
    // Group 4 plan 3 Task 7: an existing model with its brand and category, for the purchase-document search by model;
    // group 4 plan 4 Task 6: a run-unique Serial, for the scan page's search by part of it.
    'export type CreateAssetOptions = { ownershipType?: "personal" | "shared" | "component"; departmentId?: string; custodianId?: string; conditionId?: string; categoryId?: string; brandId?: string; modelId?: string; serialNumber?: string }',
    "export async function readSecondDepartment(): Promise<{ id: string; code: string; name: string }>",
    "export async function expectNoAssetFound(page: Page, fieldId: string, text: string)",
    "export async function saveHandoverForm(page: Page, device: E2eDevice, assetId: string): Promise<{ id: string; documentNo: string }>",
  ]) assert.ok(support.includes(signature), signature)
  // The second department is an existing one, read as the seed admin and chosen by the plan's rule; the E2E makes no department.
  const readStart = support.indexOf("export async function readSecondDepartment(")
  const readSecond = support.slice(readStart, support.indexOf("\nexport ", readStart + 1))
  assert.ok(readSecond.includes('admin.get("/api/departments")'), "read through the department API")
  assert.ok(readSecond.includes("chooseSecondDepartment("), "chosen by chooseSecondDepartment")
  for (const [file, source] of [["tx-support.ts", support], ["handover-department.spec.ts", spec]]) assert.doesNotMatch(source, /\.post\(\s*["'`]\/api\/departments/, file)
  // The desktop saves through the footer and the review, the phone through its three steps (spec §7.3, §7.4).
  const start = support.indexOf("export async function saveHandoverForm(")
  const save = support.slice(start, support.indexOf("\nexport ", start + 1))
  const at = ["ตรวจสอบและบันทึก", "ตรวจสอบก่อนส่งมอบ", "ยืนยันส่งมอบ", "ถัดไป: ให้ผู้รับตรวจ", "ถูกต้อง ลงชื่อรับ", "บันทึกการส่งมอบ"].map((word) => save.indexOf(`"${word}"`))
  assert.ok(at.every((index, i) => index >= 0 && (i === 0 || index > at[i - 1])), "both paths, in order")
  assert.ok(save.indexOf("page.waitForResponse(") < at[0], "the wait is set before the first click")
  assert.equal(spec.split("await readSecondDepartment()").length - 1, 4)
  assert.ok(spec.includes("expect(after.departmentId).toBe(data.departmentId)"))
  assert.equal(spec.split("expect(after.departmentId).toBe(second.id)").length - 1, 2)
  assert.equal(spec.split('ownershipType: "shared"').length - 1, 2)
  assert.ok(spec.includes('await expect(page.getByRole("main")).toContainText(TX_WORDS.departmentChange)'))
  // The summary is read on the desktop only (P1-R4); for a ส่วนกลาง asset it never shows the chosen department (P1-R2).
  assert.equal(spec.split('if (e2eDevice === "desktop")').length - 1, 3)
  assert.equal(spec.split(`const summary = page.locator('[data-slot="operation-summary-card"]')`).length - 1, 3)
  assert.equal(spec.split("await expect(summary).not.toContainText(runDepartment.name)").length - 1, 2)
  assert.ok(spec.includes('await page.locator("#checkout-type").getByRole("button", { name: "แผนก", exact: true }).click()'))
  assert.ok(spec.includes('await findAssetRow(page, "checkout-asset", `${asset.name} ${RUN_DEPARTMENT_WORD}`, asset.assetTag)'))
  assert.ok(spec.includes("const secondWord = departmentWord(second.name, [asset.assetTag, asset.name, runDepartment.name])"))
  assert.ok(spec.includes('await expectNoAssetFound(page, "checkout-asset", `${asset.name} ${secondWord}`)'))
  for (const banned of ["request.delete", "/api/admin/settings", "/api/departments", "ldap", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
})

test("ส่งมอบ refuses a broken asset with a ส่งซ่อม link until its repair closes ใช้งานได้, a salvage asset with none, closing as ซ่อมไม่ได้ makes ซาก, and the register's photo shows (group 3 spec §19, addendum task A5)", () => {
  const spec = readTxSpec("e2e/transactions/handover-condition.spec.ts")
  // The app's words, verbatim (spec §19.3-4).
  for (const word of ["สภาพเสียหาย ต้องส่งซ่อมก่อนส่งมอบ", "เป็นซาก รอตัดจำหน่าย ส่งมอบไม่ได้", "สภาพของทรัพย์สินจะเปลี่ยนเป็น ซาก", "สภาพหลังซ่อม"]) assert.ok(spec.includes(`"${word}"`), word)
  const th = read("messages/th.json")
  for (const word of ["สภาพเสียหาย ต้องส่งซ่อมก่อนส่งมอบ", "เป็นซาก รอตัดจำหน่าย ส่งมอบไม่ได้", "สภาพของทรัพย์สินจะเปลี่ยนเป็น ซาก", "สภาพหลังซ่อม"]) assert.ok(th.includes(`"${word}"`), `messages: ${word}`)
  // ส่งมอบ offers exactly three conditions; the link goes to a new repair for the asset.
  assert.ok(spec.includes('for (const label of ["ใหม่", "ดี", "พอใช้"])'))
  assert.ok(spec.includes('await expect(repairLink).toHaveAttribute("href", `/th/maintenance/new?assetId=${asset.id}`)'))
  assert.ok(spec.includes('await expect(page.locator("[data-checkout-repair-link]")).toHaveCount(0)'))
  // The condition changes on the asset edit form (PUT), as IT staff at the desk; the repair is recorded on its forms.
  // It is opened through visitAssetEdit, which records the page once its duplicate check has answered (E2E-1103G/H).
  assert.ok(spec.includes('await visitAssetEdit(measure, `/th/assets/${assetId}/edit`'))
  assert.match(spec, /^\s+visitAssetEdit,$/m)
  assert.ok(spec.includes('response.request().method() === "PUT"'))
  // Group 4 plan 2 Task 7: the edit page's primary reads บันทึกการแก้ไข (create keeps บันทึก).
  assert.ok(spec.includes('await page.getByRole("button", { name: "บันทึกการแก้ไข", exact: true }).filter({ visible: true }).click()'))
  assert.equal(JSON.parse(read("messages/th.json")).asset.saveCorrection, "บันทึกการแก้ไข")
  assert.ok(spec.includes('await condition.getByRole("radio", { name: "ดี", exact: true }).check()'))
  assert.ok(spec.includes('filter({ hasText: "เสียหาย → ดี" })'))
  assert.ok(spec.includes("await saveHandoverForm(page, e2eDevice, asset.id)"))
  assert.ok(spec.includes("await uploadPhotoByApi(page, withPhoto.id)"))
  // The handover writes the condition chosen at it (fix brief item 4), and the review shows the photo before it (M5).
  assert.ok(spec.includes('await conditionChip(page, "พอใช้").check()'))
  assert.ok(spec.includes('expect(handedOver.condition?.nameTh, "the condition chosen at the handover").toBe("พอใช้")'))
  assert.ok(spec.includes('filter({ hasText: "ดี → พอใช้" })') && spec.includes("await expect(assessed).toContainText(checkout.documentNo)"))
  assert.ok(spec.includes('await page.locator("form input[type=file]").setInputFiles(PHOTO_FIXTURE)'))
  assert.ok(spec.includes('await expect(reviewPhoto).toHaveAttribute("width", "48")'))
  // The desktop runs every test; the phone the repair loop's first half only.
  assert.equal(spec.split('test.skip(e2eDevice === "phone", DESKTOP_ONLY)').length - 1, 4)
  assert.equal(spec.split('if (e2eDevice === "phone") return').length - 1, 1)
  for (const banned of ["request.delete", "/api/admin/settings", "ldap", "import-confirm", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
})

test("รับคืน leaves a component out and lists it on the RT-, ส่งมอบ warns of it unsaved, and its late return re-attaches it to the parent in IT stock (group 3 plan 2 task 11)", async () => {
  const spec = readTxSpec("e2e/transactions/return-components.spec.ts")
  const support = read("e2e/transactions/tx-support.ts")
  const plan = await import("../e2e/transactions/tx-plan.ts")
  // The return department E2E expects is the setting's default (spec §12): E2E never saves the setting.
  assert.equal(plan.RETURN_DEPARTMENT_CODE, (await import("../src/lib/checkin-department.ts")).DEFAULT_CHECKIN_DEPARTMENT_CODE)
  for (const signature of [
    "export async function installComponentByApi(page: Page, parentId: string, componentId: string, role: string, slotNo: string): Promise<void>",
    "export async function readReturnDepartment(): Promise<{ id: string; code: string; name: string }>",
    "export function returnChecklistBox(page: Page, assetTag: string): Locator {",
    "export async function saveReturnForm(page: Page, assetId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedReturn>",
    "export async function saveLateReturn(page: Page, componentId: string, atReview?: (review: Locator) => Promise<void>): Promise<SavedLateReturn>",
  ]) assert.ok(support.includes(signature), signature)
  // The return department is read by its code with a GET as the seed admin; nothing makes or sets one.
  const readStart = support.indexOf("export async function readReturnDepartment(")
  const readReturn = support.slice(readStart, support.indexOf("\nexport ", readStart + 1))
  assert.ok(readReturn.includes('admin.get("/api/departments")') && readReturn.includes("department.code === RETURN_DEPARTMENT_CODE"))
  for (const [file, source] of [["tx-support.ts", support], ["return-components.spec.ts", spec]]) assert.doesNotMatch(source, /\.post\(\s*["'`]\/api\/departments/, file)
  // Both saves set the wait first, then the footer, the review and its confirm; the RT- opens after.
  for (const [name, route] of [["saveReturnForm", "/checkin`"], ["saveLateReturn", "/component-return`"]]) {
    const start = support.indexOf(`export async function ${name}(`)
    const body = support.slice(start, support.indexOf("\nexport ", start + 1))
    const at = ["TX_WORDS.reviewAndSave", '"ตรวจสอบก่อนรับคืน"', '"ยืนยันรับคืน"'].map((word) => body.indexOf(word))
    assert.ok(at.every((index, i) => index >= 0 && (i === 0 || index > at[i - 1])), `${name}: footer, review, confirm`)
    assert.ok(body.indexOf("page.waitForResponse(") >= 0 && body.indexOf("page.waitForResponse(") < at[0], `${name}: the wait first`)
    assert.ok(body.includes(route) && body.includes("/th/asset-management/checkins/"), name)
  }
  // The flow in its binding order (spec §17): left out, listed, warned of on an unsaved ส่งมอบ, back late and re-attached.
  assert.match(spec, /test\.describe\.configure\(\{ mode: "serial" \}\)/)
  assert.equal(spec.split('{ ownershipType: "component" }').length - 1, 2)
  assert.equal(spec.split("await installComponentByApi(page, parent.id, ").length - 1, 2)
  assert.ok(spec.includes("await returnChecklistBox(page, leftOut.assetTag).uncheck()"))
  assert.ok(spec.includes("expect(checkin.missingComponents).toEqual([{ assetTag: leftOut.assetTag, name: leftOut.name }])"))
  assert.ok(spec.includes(`page.locator('[data-document-line="missing"]')`) && spec.includes(`page.locator('[data-document-line="returned"]')`))
  assert.ok(spec.includes("toEqual([receiver.id, data.locationId, data.departmentId])"), "the component left out stays with the person returning, in its room")
  assert.ok(spec.includes("`/th/asset-management/checkout?assetId=${run.parent.id}`"))
  for (const save of ["saveHandoverForm(", "ยืนยันส่งมอบ", "บันทึกการส่งมอบ"]) assert.ok(!spec.includes(save), `ส่งมอบ is never saved: ${save}`)
  // ส่งมอบ's warning names its count, then the list it fills (checkout.componentsOutstanding, "…: {list}").
  assert.ok(spec.includes(`part.locator("[data-checkout-outstanding]")`))
  assert.ok(spec.includes('templatePattern(TX_WORDS.checkoutOutstanding, { count: "1" })'))
  assert.ok(spec.includes("fillTemplate(TX_WORDS.checkoutSummaryOutstanding, { count: 1 })"))
  assert.ok(spec.includes('await expect(row).not.toContainText("ข้อมูลเก่า")'))
  assert.ok(spec.includes('for (const id of ["checkin-late-location", "checkin-components", "checkin-condition-after", "checkin-next-status", "checkin-next-location"])'))
  assert.ok(spec.includes('expect(late).toEqual({ checkinId: checkin.id, documentNo: checkin.documentNo, outcome: "reattached" })'))
  assert.ok(spec.includes("toEqual([null, room.id, returnDepartment.id])"))
  // The summary card on the desktop (P2-R12); the phone's footer counts instead.
  assert.equal(spec.split('if (e2eDevice === "desktop")').length - 1, 3)
  assert.ok(spec.includes("TX_WORDS.phoneComponentsFooter"))
  for (const banned of ["request.delete", "/api/admin/settings", "ldap", "import-confirm", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
})

test("the asset pages read the outstanding line: the parent's components tab and the component's own page (group 3 spec §8.5, plan 2 task 12)", () => {
  const spec = readTxSpec("e2e/transactions/return-components.spec.ts")
  const first = spec.slice(spec.indexOf('test("a return with one component left out'), spec.indexOf('test("the parent\'s next ส่งมอบ'))
  const manager = first.indexOf("`/th/assets/${parent.id}/components`")
  const pages = first.indexOf('[[parent.id, "components", "the parent\'s components tab, one outstanding"], [leftOut.id, undefined, "the outstanding component\'s page"]]')
  assert.ok(manager > 0 && pages > manager, "at the end of the first test, after the component manager's check")
  assert.ok(first.includes("await visitAssetPage(measure, assetId, label, testInfo, view)"))
  assert.match(spec, /^\s+visitAssetPage,$/m)
})

test("รับคืนหลายรายการ: the employee page's entry, the locked repair row, a machine returned elsewhere refused and removed, one RT- with three machines and the backfilled HO-, then one line cancelled (group 7 plan 4 task 5)", () => {
  // The IT head: the employee page needs employee:view, which IT staff lack (e2e/support/run-plan.ts).
  const spec = read("e2e/transactions/multi-return.spec.ts")
  assert.ok(spec.split("\n").includes(`asUser("itHead")`))
  assert.match(spec, /from "\.\.\/support\/fixtures\.ts"/)
  assert.doesNotMatch(spec, /from "@playwright\/test"/)
  for (const part of [
    'const BATCH_PATH = "/api/asset-checkins/batch"',
    'expect(unsignedBody.code).toBe("BATCH_CHECKIN_SIGNATURE_REQUIRED")',
    'code: "BATCH_CHECKIN_NEEDS_SINGLE"',
    "await expect(tick(page, inRepair)).toBeDisabled()",
    "formRow(page, inRepair).getByRole(\"link\", { name: TX_WORDS.multiReturnNeedsSingle, exact: true })",
    'await conditionChip(page, "เสียหาย", `batch-checkin-condition-${damaged.id}`).check()',
    String.raw`measure.expectRefusal({ method: "POST", url: /\/api\/asset-checkins\/batch$/, status: 409,`,
    "await page.getByRole(\"button\", { name: TX_WORDS.multiReturnRemoveBlocked, exact: true }).click()",
    "await expect(machines).toHaveCount(3)",
    "await expect(machine(legacy)).toContainText(/HO-/)",
    'await expect(damagedLine).toHaveAttribute("data-voided", "true")',
    "`/api/asset-checkins/${damagedCheckinId}/cancel`",
    "createTxAsset(page, masters, project, \"MRL\", \"โน้ตบุ๊กข้อมูลเก่าคืนหลายรายการ\", { custodianId: employee.id })",
  ]) assert.ok(spec.includes(part), part)
  assert.ok(spec.split("recordSettled(page, measure, ").length - 1 >= 6, "axe on each step's page")
  for (const banned of ["request.delete", ".delete(", "/api/admin/settings", "ldap", "import-confirm", "isactive: false"]) assert.ok(!spec.toLowerCase().includes(banned), banned)
})
