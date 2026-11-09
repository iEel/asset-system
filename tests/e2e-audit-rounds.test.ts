import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import test from "node:test"

// The rounds list and round form steps of the E2E suite (plan docs/superpowers/plans/2026-10-26-group2-audit-rounds.md,
// Task 7; spec docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md §6, §7, §14, §16): the words are the
// app's, the helpers stand on the form's and the list's markup, and the rounds list spec opens its own round and
// always cancels it. Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => (typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : [])
// A words-file template and a th.json value are the same text whatever their placeholders are named.
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")

test("the rounds list and round form steps read the app's own words, and ร่าง is gone from the audit words (group 2 plan 1 task 7)", async () => {
  const { ROUNDS_WORDS } = await import("../e2e/audit/rounds-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(ROUNDS_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  // The keys the skeleton names (Tasks 1, 4 and 6).
  const round = th.auditRound as Record<string, string>
  assert.equal(ROUNDS_WORDS.tabOpen, round.viewOpen)
  assert.equal(ROUNDS_WORDS.tabClosed, round.viewClosed)
  assert.equal(ROUNDS_WORDS.tabCancelled, round.viewCancelled)
  assert.equal(ROUNDS_WORDS.tabAll, round.viewAll)
  assert.equal(ROUNDS_WORDS.statusOpen, round.statusOpen)
  assert.equal(ROUNDS_WORDS.statusClosed, round.statusClosed)
  assert.equal(ROUNDS_WORDS.statusCancelled, round.statusCancelled)
  assert.equal(ROUNDS_WORDS.continueScan, round.actionContinueScan)
  assert.equal(ROUNDS_WORDS.viewPending, round.viewPending)
  assert.equal(ROUNDS_WORDS.activeFilters, round.activeFilters)
  assert.equal(ROUNDS_WORDS.clearFilter, round.clearFilter)
  assert.equal(ROUNDS_WORDS.createTitle, round.createTitle)
  assert.equal(ROUNDS_WORDS.listTitle, round.title)
  assert.equal(ROUNDS_WORDS.clearSearch, th.auditPending.clearSearch)
  for (const key of ["scopeDepartment", "scopeLocation", "scopeStatus"] as const) assert.equal(ROUNDS_WORDS[key], round[key])
  // Spec §14: the word ร่าง leaves the audit UI (systemLogPage keeps the stored value's name for the history).
  assert.deepEqual(values(round).filter((text) => text.includes("ร่าง")), [])
})

test("the steps stand on the form's pickers, the list's tabs and chips, and the IT head's saved session (group 2 plan 1 task 7)", () => {
  const steps = read("e2e/audit/round-steps.ts")
  for (const name of ["addCondition", "waitForFirstCount", "createButton", "willCreate", "readWillCreate", "showSample", "cancelAsItHead", "roundEntry", "tab", "expectTabs", "workViewChip", "expectWhole"]) {
    assert.match(steps, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  assert.ok(steps.includes(`storageState: fromRoot(authStateFile(readRunState().runId, "itHead"))`), "the IT head cancels, from the run's saved session")
  assert.ok(steps.includes(`{ data: { action: "cancel", reason } }`), "a cancel through the round route, never a DELETE")
  assert.ok(steps.includes(`new URL(response.url()).pathname === "/api/audit-rounds/preview"`), "each condition waits for its own live count, so the next change never aborts one in flight")
  // The form (Tasks 3-4): the condition pickers' ids, and no status field.
  const form = read("src/components/audit/audit-round-form.tsx")
  assert.ok(form.includes("audit-round-scope-"), "the condition pickers' ids")
  assert.ok(!form.includes("audit-round-status"), "no status field")
  // The list (Task 6): the status tabs, and the work view as a FilterChipList chip with the app's words.
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/page.tsx")
  assert.match(page, /<TabNav\b/)
  assert.match(page, /<FilterChipList\b[\s\S]*?label=\{t\("activeFilters"\)\}[\s\S]*?removeLabel=\{t\("clearFilter"\)\}/)
  assert.match(read("src/components/ui/tab-nav.tsx"), /data-slot="tab-nav"/)
  assert.match(read("src/components/ui/page-header.tsx"), /data-slot="page-header-meta"/)
})

test("the rounds list spec opens its own round, finds it by its number, checks the next step by role and cancels the round whatever happens (group 2 plan 1 task 7)", () => {
  const spec = read("e2e/audit/rounds-list.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  assert.ok(spec.includes(`asUser("itStaff")`) && spec.includes(`await actAs(page, "viewer", e2eTheme)`))
  // Its own room and round, found by its number (spec §16: no step relies on a first page or a global count).
  assert.ok(spec.includes("const roomId = await createRoom(`${prefix}-R`, "))
  assert.ok(spec.includes("const list = `/th/audit/rounds?search=${encodeURIComponent(round.auditNo)}`"))
  // The body the form sends: no status (spec §7).
  assert.doesNotMatch(spec, /\bstatus: "/)
  // The next step by role, shown whole (spec §13 bug 1).
  assert.ok(spec.includes("const scanHref = new RegExp(`^/th/audit/rounds/${round.id}/scan(?:[?#]|$)`)"))
  assert.ok(spec.includes("const pendingHref = new RegExp(`^/th/audit/rounds/${round.id}/pending(?:[?#]|$)`)"))
  assert.equal((spec.match(/await rounds\.expectWhole\(/g) ?? []).length, 2)
  assert.ok(spec.includes(`await expect(page.locator('main a[href*="/scan"]').filter({ visible: true })).toHaveCount(0)`))
  // The work view from the strip cell, with its chip; the tabs with their counts, before and after the cancel.
  assert.ok(spec.includes("const chip = rounds.workViewChip(page, W.viewPending)"))
  assert.equal((spec.match(/await rounds\.expectTabs\(page, /g) ?? []).length, 2)
  // Cancelled whatever happens.
  assert.match(spec, /\} finally \{\n\s+if \(!cancelled\) await rounds\.cancelAsItHead\(playwright\.request, baseURL, round\.id, /)
})

test("the round page and pending list steps read the app's own words (group 2 plan 2 task 7)", async () => {
  const { ROUND_PAGE_WORDS } = await import("../e2e/audit/round-page-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(ROUND_PAGE_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  // The keys that stay from plan 1 and before.
  const round = th.auditRound as Record<string, string>
  assert.equal(ROUND_PAGE_WORDS.nextStep, round.nextStep)
  assert.equal(ROUND_PAGE_WORDS.continueScan, round.nextStepContinueScan)
  assert.equal(ROUND_PAGE_WORDS.closeRound, round.closeRound)
  assert.equal(ROUND_PAGE_WORDS.noUnconfirmed, round.closeNoUnconfirmed)
  assert.equal(ROUND_PAGE_WORDS.cancelRound, round.cancelRound)
  assert.equal(ROUND_PAGE_WORDS.activeFilters, round.activeFilters)
  assert.equal(ROUND_PAGE_WORDS.clearFilter, round.clearFilter)
  assert.equal(ROUND_PAGE_WORDS.scanThis, th.auditPending.scanPendingAsset)
  assert.equal(ROUND_PAGE_WORDS.viewAsset, th.auditPending.viewAsset)
  assert.equal(ROUND_PAGE_WORDS.markNotFound, th.auditPending.markNotFound)
  assert.equal(ROUND_PAGE_WORDS.noCustodian, th.asset.noCustodian)
  // The words Tasks 4-5 put on the page, by key.
  assert.equal(ROUND_PAGE_WORDS.reviewWaiting, round.stepReviewWaiting)
  assert.equal(ROUND_PAGE_WORDS.viewPendingFindings, round.nextStepViewPendingFindings)
  assert.equal(ROUND_PAGE_WORDS.componentsMissingChip, round.componentsMissingChip)
  assert.equal(ROUND_PAGE_WORDS.missingComponentPrefix, round.missingComponentPrefix)
  assert.equal(ROUND_PAGE_WORDS.fieldDepartment, th.auditFinding.type_wrong_department)
  assert.equal(ROUND_PAGE_WORDS.fieldCondition, th.auditFinding.type_wrong_condition)
  // Bug 12 and P2-R15: no English report name and no ผู้ตรวจสอบ left in the round and pending words.
  assert.deepEqual(values(round).filter((text) => text.includes("Variance")), [])
  assert.deepEqual([...values(round), ...values(th.auditPending)].filter((text) => text.includes("ผู้ตรวจสอบ")), [])
  // The result card's help is Task 4's round-wide sentence (P2-R15 applied there); Task 6 does not touch it.
  assert.match(round.resultDashboardHelp, /^นับทั้งรอบ ไม่ขึ้นกับตัวกรองของรายการด้านล่าง/)
})

test("the round page and pending steps stand on the result list's chips, the cards' headings and the rows (group 2 plan 2 task 7)", () => {
  const steps = read("e2e/audit/round-page-steps.ts")
  for (const name of ["resultRows", "resultChips", "categoryChips", "chipByLabel", "chipByHref", "chipCount", "chipLabel", "expectChips", "expectChip", "expectChipsMatchRows", "nextStepCard", "mismatchCard", "fieldBar", "componentsMissingLine", "filterChip", "expectInside"]) {
    assert.match(steps, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  const pending = read("e2e/audit/pending-steps.ts")
  for (const name of ["pendingRows", "pendingEntry", "roomChips", "expectRoomChips", "markNotFound"]) {
    assert.match(pending, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  // Spec §5: a chip row is checked against the rows each chip opens, never against a global count.
  assert.ok(steps.includes("await expect(rows, `${chip.text}: its count is its rows (spec §5)`).toHaveCount(Number(chip.count.replace(/,/g, \"\")))"))
  // E2E-1027B/C: a navigation right after a load cancels the page's own requests (the shell's session and notification
  // fetches, the service worker's sw.js); WebKit raises a page error for a cancelled shell request, which the allow-list
  // does not allow. So each navigation away first lets the page finish its requests, then the registration settle.
  assert.match(steps, /^export async function settlePageRequests\(page: Page\)/m)
  assert.ok(!steps.includes("settleServiceWorker"), "one helper, renamed")
  const settle = steps.slice(steps.indexOf("export async function settlePageRequests("))
  assert.match(settle, /^export async function settlePageRequests\(page: Page\) \{\s*await page\.waitForLoadState\("networkidle"\)\s*await page\.evaluate\(/)
  assert.ok(steps.includes("navigator.serviceWorker?.ready"))
  assert.ok(steps.includes("setTimeout(resolve, 5000)"))
  const matchRows = steps.slice(steps.indexOf("export async function expectChipsMatchRows("))
  assert.match(matchRows, /for \(const chip of chips\) \{[\s\S]*?await settlePageRequests\(page\)\s*await page\.goto\(chip\.href\)/)
  assert.match(matchRows, /await settlePageRequests\(page\)\s*await page\.goto\(start\)/)
  assert.equal((steps.match(/page\.goto\(/g) ?? []).length, 2, "every goto of the steps is behind the wait")
  // The round-page block of the field-audit spec navigates in quick turns too (E2E-1027C): each of those is behind it.
  const spec = read("e2e/audit/field-audit.spec.ts")
  const roundBlock = spec.slice(spec.indexOf('test("IT staff read the round page after the walk'), spec.indexOf("const missingLine = roundPage.componentsMissingLine(card)"))
  assert.match(roundBlock, /await roundPage\.settlePageRequests\(page\)\s*await roundPage\.chipByLabel\(results, W\.resultNotFound\)\.click\(\)/)
  assert.match(roundBlock, /await roundPage\.settlePageRequests\(page\)\s*await roundPage\.fieldBar\(card, field\)\.click\(\)/)
  const gotos = roundBlock.match(/await page\.goto\(roundHref\)/g) ?? []
  assert.equal(gotos.length, 2, "the block's two returns to the round page")
  assert.equal((roundBlock.match(/await roundPage\.settlePageRequests\(page\)\s*await page\.goto\(roundHref\)/g) ?? []).length, gotos.length, "every goto of the block is behind the wait")
  // The markup the steps read (Tasks 4-6): the result list's anchor, TabNav's count span, and the pending list's
  // TabNav room chips with the whole row still opening the asset (P2-R28).
  const audit = ["src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", ...readdirSync("src/components/audit").filter((file) => /\.tsx?$/.test(file)).map((file) => `src/components/audit/${file}`)]
  assert.ok(audit.some((file) => read(file).includes('id="audit-result-list"')), "the result list's anchor")
  assert.match(read("src/components/ui/tab-nav.tsx"), /<span className=\{cn\("ms-1\.5 text-meta num"/)
  const pendingPage = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx")
  assert.match(pendingPage, /<TabNav\b/)
  assert.match(pendingPage, /<ClickableTableRow\b/)
})

test("the rounds list spec's viewer reads the pending list and the round page with no scan, not-found or menu (group 2 plan 2 task 7)", () => {
  const spec = read("e2e/audit/rounds-list.spec.ts")
  assert.ok(spec.includes("const assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])"))
  assert.ok(spec.includes(`await pending.expectRoomChips(page, 2, { [roomId]: 2 }, "all")`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("button", { name: P.markNotFound, exact: true })).toHaveCount(0)`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("link", { name: P.scanThis, exact: true })).toHaveCount(0)`))
  assert.ok(spec.includes(`await expect(roundPage.nextStepCard(page).getByRole("link", { name: nextName, exact: true })).toHaveAttribute("href", pendingHref)`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("button", { name: P.more, exact: true })).toHaveCount(0)`))
  // No visible scan link for the viewer: the rounds list, the pending list and the round page.
  assert.equal((spec.match(/await expect\(page\.locator\('main a\[href\*="\/scan"\]'\)\.filter\(\{ visible: true \}\)\)\.toHaveCount\(0\)/g) ?? []).length, 3)
})

test("the ยืนยันผลตรวจ spec reads the app's own words, key by key (inspection-confirm plan 3 task 4)", async () => {
  const { INSPECTION_CONFIRM_WORDS: W } = await import("../e2e/audit/inspection-confirm-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const page = th.inspectionConfirmPage as Record<string, string>
  const round = th.auditRound as Record<string, string>
  const byKey: Record<keyof typeof W, string> = {
    title: page.title,
    backToRound: page.backToRound,
    tabReady: page.tab_ready,
    tabAwaitingReview: page.tab_awaitingReview,
    tabDamaged: page.tab_damaged,
    tabNotFound: page.tab_notFound,
    tabNotScanned: page.tab_notScanned,
    awaitingReviewBanner: page.awaitingReviewBanner,
    noEditNotice: page.noEditNotice,
    emptyTitle: page.emptyTitle,
    emptyTabTitle: page.emptyTabTitle,
    selectAll: page.selectAll,
    selectedCount: page.selectedCount,
    selectionSummary: page.selectionSummary,
    confirmOpen: page.confirmOpen,
    dialogTitle: page.dialogTitle,
    dialogLineInUse: page.dialogLineInUse,
    dialogLineReady: page.dialogLineReady,
    submit: page.submit,
    successNotice: page.successNotice,
    nextStepTitle: round.nextStepTitle,
    stepReview: round.stepReview,
    stepConfirmWaiting: round.stepConfirmWaiting,
    closeUnconfirmedCount: round.closeUnconfirmedCount,
    closeRound: round.closeRound,
    statusInUse: th.asset.quickFilterInUse,
    statusReady: th.asset.quickFilterReady,
  }
  assert.deepEqual({ ...W }, byKey)
  // The statuses are the seed's Thai names too.
  const seed = read("prisma/seed.ts")
  assert.ok(seed.includes(`{ name: "In Use", nameTh: "${W.statusInUse}"`) && seed.includes(`{ name: "Ready", nameTh: "${W.statusReady}"`))
})

test("the ยืนยันผลตรวจ spec opens its own round, sets the run's assets under inspection after the walk, and never closes or cancels (inspection-confirm plan 3 task 4)", () => {
  const spec = read("e2e/audit/inspection-confirm.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's fixtures")
  assert.ok(spec.includes(`test.skip(e2eTheme === "dark",`), "the light projects")
  assert.ok(spec.includes(`const prefix = recordPrefix(testInfo, "INC")`), "run-marked records")
  assert.ok(spec.includes("scopeLocationId: roomId,"), "its own round over its own room")
  // The walk, the empty page, then the one write, then the people.
  const order = [
    "/api/audit-rounds/${round.id}/scan`",
    "await pending.markNotFound(",
    "W.emptyTitle",
    "await markUnderInspection(runId, [assets.personal.id, assets.shared.id, assets.notFound.id])",
    `await actAs(page, "itHead", e2eTheme)`,
    `await actAs(page, "viewer", e2eTheme)`,
    `await actAs(page, "itStaff", e2eTheme)`,
    "/confirm-results`",
  ]
  const at = order.map((text) => spec.indexOf(text))
  for (const [index, position] of at.entries()) assert.ok(position >= 0, order[index])
  assert.deepEqual([...at].sort((a, b) => a - b), at, "in order")
  assert.equal(spec.split("markUnderInspection(").length - 1, 1, "one write")
  // The close is only tried by the route and refused; nothing cancels the round.
  assert.ok(spec.includes('page.request.patch(`/api/audit-rounds/${round.id}`, { data: { action: "close" } })'))
  assert.ok(spec.includes(`expect(close.status(), "the close is refused").toBe(400)`))
  assert.ok(!spec.includes("cancelAsItHead") && !/action: "cancel"/.test(spec))
  // The viewer has no tick; IT staff confirm the 2 ready from พร้อมยืนยัน.
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByText(W.noEditNotice, { exact: true })).toBeVisible()`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)`))
  assert.ok(spec.includes(`expect(await answer.json()).toMatchObject({ confirmed: 2 })`))
})

test("the damaged and not-found ยืนยันผลตรวจ spec reads the app's own words, key by key (inspection-confirm plan 4 task 5)", async () => {
  const { INSPECTION_CONFIRM_MORE_WORDS: W } = await import("../e2e/audit/inspection-confirm-more-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const page = th.inspectionConfirmPage as Record<string, string>
  const round = th.auditRound as Record<string, string>
  const disposal = th.disposalPage
  const byKey: Record<keyof typeof W, string> = {
    title: page.title,
    tabReady: page.tab_ready,
    tabAwaitingReview: page.tab_awaitingReview,
    tabDamaged: page.tab_damaged,
    tabNotFound: page.tab_notFound,
    tabNotScanned: page.tab_notScanned,
    emptyTitle: page.emptyTitle,
    selectedCount: page.selectedCount,
    dialogTitle: page.dialogTitle,
    damagedDialogTitle: page.damagedDialogTitle,
    dialogLineReady: page.dialogLineReady,
    submit: page.submit,
    damagedRepair: page.damagedRepair,
    damagedDispose: page.damagedDispose,
    damagedConfirmOnly: page.damagedConfirmOnly,
    damagedReasonDefault: page.damagedReasonDefault,
    missingOpen: page.missingOpen,
    missingDialogTitle: page.missingDialogTitle,
    missingDialogLine: page.missingDialogLine,
    missingReasonDefault: page.missingReasonDefault,
    missingSubmit: page.missingSubmit,
    missingSuccess: page.missingSuccess,
    lostBlock: page.lostBlock,
    lostAfterClose: page.lostAfterClose,
    lostLink: page.lostLink,
    afterCloseTitle: page.afterCloseTitle,
    damagedForDisposalTitle: page.damagedForDisposalTitle,
    damagedDisposeLink: page.damagedDisposeLink,
    closeRound: round.closeRound,
    closeConfirm: round.closeConfirm,
    closeSuccess: round.closeSuccess,
    stepsClosedTitle: round.stepsClosedTitle,
    closedDisposalLine: round.closedDisposalLine,
    fromRoundNotice: disposal.batchForm.fromRoundNotice,
    batchPhoneNote: disposal.batchForm.phoneTitle,
    methodLost: disposal.types.lost,
    methodSell: disposal.types.sell,
    blockerStatus: disposal.readinessBlockers.lifecycle_status,
  }
  assert.deepEqual({ ...W }, byKey)
  // The glossary: the repair action reads บันทึกซ่อม, never แจ้งซ่อม.
  assert.ok(W.damagedRepair.endsWith("บันทึกซ่อม") && !W.damagedRepair.includes("แจ้งซ่อม"))
})

test("the damaged and not-found ยืนยันผลตรวจ spec walks its own round, writes once, closes as the IT head and submits no form (inspection-confirm plan 4 task 5)", () => {
  const spec = read("e2e/audit/inspection-confirm-more.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's fixtures")
  assert.ok(spec.includes(`test.skip(e2eTheme === "dark",`), "the light projects")
  assert.ok(spec.includes(`const prefix = recordPrefix(testInfo, "INM")`), "run-marked records")
  assert.ok(spec.includes("scopeLocationId: roomId,"), "its own round over its own room")
  assert.ok(spec.includes("actualConditionId: masters.conditionDamaged"), "the damaged asset is checked as เสียหาย")
  // The walk, the IT head's approvals, the one write, IT staff on the confirm page, the IT head's close, the forms.
  const order = [
    "/api/audit-rounds/${round.id}/scan`",
    "await pending.markNotFound(",
    `await actAs(page, "itHead", e2eTheme)`,
    "/review`",
    "await markUnderInspection(runId, [assets.found.id, assets.damaged.id, assets.lost1.id, assets.lost2.id])",
    `await actAs(page, "itStaff", e2eTheme)`,
    "W.damagedRepair",
    "/th/maintenance/new",
    "W.missingOpen",
    "W.lostAfterClose",
    `await actAs(page, "itHead", e2eTheme)\n  await measure.visit(roundPath`,
    "W.closeConfirm",
    "W.closedDisposalLine",
    "W.afterCloseTitle",
    "/th/disposal/batch/new",
    "/th/disposal/new",
  ]
  let from = 0
  for (const text of order) {
    const at = spec.indexOf(text, from)
    assert.ok(at >= 0, `${text} (in order)`)
    from = at + 1
  }
  assert.equal(spec.split("markUnderInspection(").length - 1, 1, "one write")
  // While the round is open the damaged row offers no disposal, and the lost block has no link.
  assert.ok(spec.includes(`getByRole("button", { name: W.damagedDispose })).toHaveCount(0)`))
  // The damaged buttons are named with the row's tag and name, the dialog's title with the tag (plan 4 final review).
  assert.ok(spec.includes("const damagedName = (label: string) => `${label} ${assets.damaged.tag} ${assets.damaged.name}`"))
  assert.ok(spec.includes("fillTemplate(W.damagedDialogTitle, { assetTag: assets.damaged.tag })"))
  assert.ok(spec.includes(`getByRole("link", { name: W.lostLink, exact: true })).toHaveCount(0)`))
  // No form is sent: the repair form, the batch form and the single request form are only read.
  for (const text of ["saveRepairForm", "sendBatch", "sendRequestButton", "createBatchThroughApi", "/api/disposal-requests", "/api/disposal-batches", "/api/maintenance"]) {
    assert.ok(!spec.includes(text), `no ${text}`)
  }
  assert.ok(!spec.includes("cancelAsItHead") && !/action: "cancel"/.test(spec), "nothing cancels the round")
})

test("the detail-page ยืนยันผลตรวจ spec reads the app's own words, key by key (inspection-confirm plan 5 task 4)", async () => {
  const { INSPECTION_DETAIL_WORDS: W } = await import("../e2e/audit/inspection-detail-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const notice = th.assetInspectionNotice as Record<string, string>
  const page = th.inspectionConfirmPage as Record<string, string>
  const byKey: Record<keyof typeof W, string> = {
    noticeTitle: notice.title,
    roundLink: notice.roundLink,
    button: notice.button,
    dialogTitle: notice.dialogTitle,
    inUseNeedsHolder: notice.inUseNeedsHolder,
    submit: notice.submit,
    success: notice.success,
    tabReady: page.tab_ready,
    tabAwaitingReview: page.tab_awaitingReview,
    tabDamaged: page.tab_damaged,
    tabNotFound: page.tab_notFound,
    tabNotScanned: page.tab_notScanned,
    backToAsset: page.backToAsset,
    backToFindings: page.backToFindings,
    handoffConfirm: th.auditFinding.handoffConfirm,
    handoffConfirmLink: th.auditFinding.handoffConfirmLink,
    statusCorrection: th.asset.statusCorrectionButton,
    movementStatusCorrection: th.asset.movementTypes.status_correction,
    movementCustodianChange: th.asset.movementTypes.custodian_change,
    movementLocationChange: th.asset.movementTypes.location_change,
    statusInUse: th.asset.quickFilterInUse,
  }
  assert.deepEqual({ ...W }, byKey)
  // The hand-off reads พิจารณา, never อนุมัติ (the glossary, plan 3 ruling).
  assert.ok(W.handoffConfirm.startsWith("พิจารณา") && !W.handoffConfirm.includes("อนุมัติ"))
})

test("the detail-page ยืนยันผลตรวจ spec walks one asset into its own round, writes once, follows the notice, the dialog and the findings hand-off (inspection-confirm plan 5 task 4)", () => {
  const spec = read("e2e/audit/inspection-detail.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's fixtures")
  assert.ok(spec.includes(`test.skip(e2eTheme === "dark",`), "the light projects")
  assert.ok(spec.includes(`const prefix = recordPrefix(testInfo, "IND")`), "run-marked records")
  assert.ok(spec.includes("scopeLocationId: roundRoomId,"), "its own round over its own room")
  const order = [
    "/api/audit-rounds/${round.id}/scan`",
    "await markUnderInspection(runId, [assets.inRound.id, assets.noRound.id])",
    "fillTemplate(W.roundLink, { auditNo: round.auditNo })",
    "await expectNoStatusCorrection(page, e2eDevice)",
    "W.backToAsset",
    "W.handoffConfirm",
    "W.handoffConfirmLink",
    "W.backToFindings",
    "W.inUseNeedsHolder",
    "/confirm-inspection`",
    "W.success",
    "W.movementStatusCorrection",
  ]
  let from = 0
  for (const text of order) {
    const at = spec.indexOf(text, from)
    assert.ok(at >= 0, `${text} (in order)`)
    from = at + 1
  }
  assert.equal(spec.split("markUnderInspection(").length - 1, 1, "one write")
  // The toast and the refreshed page are waited for together. The confirm page's back link returns where it was opened
  // from (plan 5 final review): the asset page, then the findings list; never the round's own back label here.
  assert.match(spec, /await Promise\.all\(\[\n\s*expect\(page\.getByText\(W\.success, \{ exact: true \}\)\)\.toBeVisible\(\),/)
  assert.ok(spec.includes("await expectConfirmBackLink(page, W.backToAsset, inRoundPath)"), "back to the asset page")
  assert.ok(spec.includes(`await expectConfirmBackLink(page, W.backToFindings, "/th/audit/findings")`), "back to the findings list")
  assert.ok(!spec.includes("backToRound"), "no round back label")
  assert.ok(!spec.includes("cancelAsItHead") && !/action: "(?:cancel|close)"/.test(spec), "the round stays open")
})
