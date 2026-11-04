import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const PM_PAGE = "src/app/[locale]/(dashboard)/maintenance/pm/page.tsx"
const ROW_ACTIONS = "src/components/maintenance/maintenance-plan-row-actions.tsx"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).maintenancePage

// Group 5 plan 4 Task 3 (spec §9, G5P4-R1..R7): tabs, search, the due cells on the active tab, a DataTable with phone
// cards, ⋯ row actions and the open-record link.
test("the PM page reads one page through readPmPlanPage and renders tabs, search, the active tab's cells and a DataTable (spec §9)", () => {
  const source = read(PM_PAGE)
  assert.match(source, /await readPmPlanPage\(prisma, query, now\)/)
  assert.doesNotMatch(source, /planStatePageSlices|ContentPanelRows|MaintenancePlanStateActions/)
  assert.match(source, /<TabNav\n/)
  assert.match(source, /current=\{query\.tab\}/)
  assert.match(source, /<SearchField\b[^>]*name="q"[^>]*placeholder=\{t\("pmSearchPlaceholder"\)\}/)
  // The cells show on the active tab only (G5P4-R2), each with its hook, its link and the cell in use.
  assert.match(source, /query\.tab === "active" && due \?/)
  assert.match(source, /<StatStrip\n/)
  assert.match(source, /data: \{ "data-pm-due-cell": bucket \}/)
  assert.match(source, /current: query\.due === bucket/)
  assert.match(source, /attention: bucket === "overdue" && due\.overdue\.count > 0/)
  assert.match(source, /filterNote: dueSum/)
  assert.match(source, /t\("pmDueOutOfScope", \{ count: due\.outOfScope \}\)/)
  // The week value is a removable chip (spec §9).
  assert.match(source, /<FilterChipList\b/)
  assert.match(source, /t\("pmDueWeekChip"\)/)
  assert.match(source, /<DataTable\b/)
  assert.match(source, /"data-pm-plan-row": plan\.id/)
  assert.match(source, /getMobileCardListClasses\(\)/)
  // The foot: the range and the order of the tab, the "–" note, paging with the past-the-end redirect.
  assert.match(source, /t\(query\.tab === "ended" \? "pmOrderByEnded" : "pmOrderByDue"\)/)
  assert.match(source, /t\("pmNoVendorNote"\)/)
  assert.match(source, /redirect\(listHref\(\{ page: lastPage, pageSize: query\.pageSize \}\)\)/)
  // Ended rows say when the plan ended (decision 10.1).
  assert.match(source, /t\("pmEndedAt", \{ date: formatDate\(due\.at\) \}\)/)
  // The three empty states: no plans, an empty tab, no match.
  assert.match(source, /t\("pmEmptyTitle"\)/)
  assert.match(source, /t\("pmEmptyPaused"\)/)
  assert.match(source, /t\("pmEmptyEnded"\)/)
  assert.match(source, /t\("pmEmptyFiltered"\)/)
})

test("the PM page's title links to the edit page with returnTo on the active and paused tabs, with edit (G5P4-R7)", () => {
  const source = read(PM_PAGE)
  assert.match(source, /const editHref = canEdit && plan\.planState !== "ended" \? appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/pm\/\$\{plan\.id\}\/edit`, returnTo\) : null/)
  assert.match(source, /<ClickableTableRow\b/)
  assert.match(source, /<MaintenancePlanRowActions\b/)
})

test("the PM row actions: RowActions with the record-done link carrying returnTo, ⋯ with edit, pause or resume and end, and the confirm outside the menu (G5P4-R5, R6)", () => {
  const source = read(ROW_ACTIONS)
  assert.match(source, /^"use client"/)
  assert.match(source, /<RowActions\n/)
  assert.match(source, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/new\?planId=\$\{plan\.id\}`, returnTo\)/)
  assert.match(source, /tRecord\("pmRecordDone"\)/)
  // The open record replaces บันทึกว่าทำแล้ว with a link to that record, for anyone who reads the page.
  assert.match(source, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{openRecord\.id\}`, returnTo\)/)
  assert.match(source, /t\("pmOpenRecord", \{ repairNo: openRecord\.repairNo \}\)/)
  assert.match(source, /canCreate && plan\.planState === "active" && !openRecord/)
  // ⋯: แก้ไข, พักแผน or เปิดใช้งานต่อ, a separator, จบแผน with its hint.
  assert.match(source, /hint: t\("pmActions\.endHint"\)/)
  assert.match(source, /destructive: true/)
  // The dialogs sit outside the menu, opened through their handles, focus going back to ⋯.
  assert.match(source, /<MaintenancePlanStateButton\b[^>]*hideTrigger[^>]*returnFocusRef=\{openerRef\}/)
  assert.match(source, /<span hidden onClick=\{stopPortalEvent\} onKeyDown=\{stopPortalEvent\}>/)
  // The server call stays as it was: a PATCH of the plan's action.
  assert.match(source, /method: "PATCH",\n\s*headers: \{ "Content-Type": "application\/json" \},\n\s*body: JSON\.stringify\(\{ action \}\)/)
  assert.ok(!existsSync("src/components/maintenance/maintenance-plan-state-actions.tsx"), "the inline state buttons are gone")
})

test("the shared parts gain what the PM page needs: a menu action's hint and a StatStrip cell's data hook", () => {
  const rowActions = read("src/components/ui/row-actions.tsx")
  assert.match(rowActions, /\{ kind: "action"; key: string; label: string; onSelect: \(\) => void; icon\?: ReactNode; destructive\?: boolean; hint\?: string \}/)
  assert.match(rowActions, /<DropdownMenuItemDescription>\{item\.hint\}<\/DropdownMenuItemDescription>/)
  const statStrip = read("src/components/ui/stat-strip.tsx")
  assert.match(statStrip, /data\?: Readonly<Record<`data-\$\{string\}`, string>>/)
  assert.match(statStrip, /<div key=\{item\.key\} \{\.\.\.item\.data\} data-slot="stat"/)
})

test("the PM page words follow spec §13 verbatim", () => {
  const th = messages("th")
  const expected: Record<string, string> = {
    pmPlanCount: "· ทั้งหมด {count, number} แผน",
    pmSearchPlaceholder: "ค้นหาชื่อแผน ชื่อหรือรหัสทรัพย์สิน",
    pmDueCellOverdueFoot: "นานสุด {days, number} วัน",
    pmDueCellSoonFoot: "ภายใน 14 วัน · ครบ {date}",
    pmDueCellLaterFoot: "ไกลกว่า 14 วัน",
    pmDueSum: "{overdue} + {soon} + {later} = {total, number} แผนที่ใช้งาน",
    pmDueOutOfScope: "· ไม่นับ {count, number} แผนของทรัพย์สินที่ตัดจำหน่ายหรือปลดระวางแล้ว",
    pmDueWeekChip: "ครบกำหนดใน 7 วัน",
    pmEndedAt: "จบแผนเมื่อ {date}",
    pmOrderByDue: "เรียงจากกำหนดที่ถึงก่อน",
    pmOrderByEnded: "เรียงจากที่จบแผนล่าสุด",
    pmNoVendorNote: "“–” คือช่างภายในทำเอง ไม่มีผู้ให้บริการภายนอก",
    pmEmptyPaused: "ไม่มีแผนที่พักไว้",
    pmEmptyEnded: "ยังไม่มีแผนที่จบแล้ว",
    pmEmptyFiltered: "ไม่พบแผนที่ตรงกับการค้นหาหรือตัวกรอง",
    pmRowActions: "การดำเนินการของแผน {planNo}",
    pmOpenRecord: "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}",
  }
  for (const [key, value] of Object.entries(expected)) assert.equal(th[key], value, key)
  assert.equal(th.pmActions.endHint, "ถาวร · มีให้ยืนยัน")
  assert.equal(th.pmActions.pauseHelp, "แผนนี้จะไม่แสดงในกล่อง PM ครบกำหนดใน 7 วัน จนกว่าจะเปิดใช้งานต่อ")
  assert.equal(th.pmActions.resumeHelp, "แผนนี้จะกลับมาแสดงในกล่อง PM ครบกำหนดใน 7 วันเมื่อใกล้ครบกำหนด")
  // The cells' labels and the row badges are the plan-1 words.
  assert.deepEqual(th.pmDueState, { overdue: "เกินกำหนด", due_soon: "ใกล้ถึงกำหนด", upcoming: "รอบถัดไป" })
  assert.equal(th.pmDue.overdue, "เกินกำหนด {days} วัน")
  const en = messages("en")
  for (const key of [...Object.keys(expected), "pmDueCellSoonWindow", "pmColumnPlan"]) assert.equal(typeof en[key], "string", key)
  assert.equal(typeof en.pmActions.endHint, "string")
})

test("PM plans no longer ask for an internal assignee", () => {
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8")
  const route = readFileSync("src/app/api/maintenance-plans/route.ts", "utf8")
  const service = readFileSync("src/lib/maintenance-plan-service.ts", "utf8")
  for (const source of [form, route, service]) assert.doesNotMatch(source, /assignedToId|assignedTo:/)
  // After a save the form goes to returnHref: the PM list page the edit page came from, else the PM list (2B-2 Task 14).
  assert.match(form, /returnHref = `\/\$\{locale\}\/maintenance\/pm`,/)
  assert.match(form, /router\.push\(returnHref\)/)
})

test("the PM plan form uses the shared field primitives and a busy save button (2C batch 1a)", () => {
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(form, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(form, /function Field\(|<input|<select|<textarea|Loader2|ml-1 text-danger/)
  // Each starred Field names its control and shows its error (v-track plan 2 M3); the days Field says its range.
  assert.equal(form.match(/<Field label=\{t\("pm\w+"\)\} id="maintenance-plan-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 3)
  assert.match(form, /<Field\n\s+label=\{t\("pmIntervalDays"\)\}\n\s+id="maintenance-plan-interval-days"\n\s+required\n/)
  // Four controls keep the browser's own required; the asset select and the days Field write theirs on a line too.
  assert.equal(form.match(/^\s+required$/gm)?.length, 6, "each starred field keeps the browser's own required check")
  assert.match(form, /<Textarea\n\s+value=\{values\.notes\}[\s\S]*?maxLength=\{4000\}[\s\S]*?className="min-h-20"/)
  assert.match(form, /<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">\n\s+<Save \/>/)
})

test("the PM plan state confirm keeps a busy verb confirm in a fixed footer, now opened from ⋯ (2C batch 3, K12; G5P4-R6)", () => {
  const source = read(ROW_ACTIONS)
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel \/>\n\s+<Button variant=\{action === "end" \? "destructive" : "default"\} busy=\{saving\} onClick=\{submitAction\}>\n\s+\{t\(`pmActions\.\$\{action\}`\)\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.match(source, /<AccessibleDialog\n/, "the dialog stays: it waits with busy while the plan saves, which useConfirm cannot (K12)")
  assert.match(source, /returnFocusRef=\{returnFocusRef \?\? triggerRef\}/)
  assert.doesNotMatch(source, /<button\b|Loader2|flex-col-reverse|tCommon\("confirm"\)|useConfirm/)
})

test("an edited PM plan says it was saved, not created (critique 2026-10-20 D1)", () => {
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8")
  assert.ok(form.includes('toast.success(t(planId ? "pmUpdateSuccess" : "pmCreateSuccess"))'))
  assert.doesNotMatch(form, /toast\.success\(t\("pmCreateSuccess"\)\)/)
  for (const l of ["th", "en"]) assert.equal(typeof JSON.parse(readFileSync(`messages/${l}.json`, "utf8")).maintenancePage.pmUpdateSuccess, "string")
})

test("the PM form offers PM asset options with their reasons and sends the plan's updatedAt with an edit (G5P1-R12, R13)", () => {
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8")
  const edit = readFileSync("src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx", "utf8")
  assert.match(form, /type="pmAsset"/)
  assert.match(form, /formatReason=\{\(code\) => getMaintenanceErrorMessage\(code, t, code\)\}/)
  assert.match(form, /expectedUpdatedAt\?: string/)
  assert.match(form, /\{ action: "update", expectedUpdatedAt \}/)
  assert.match(edit, /expectedUpdatedAt=\{plan\.updatedAt\.toISOString\(\)\}/)
})
