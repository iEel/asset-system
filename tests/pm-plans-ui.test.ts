import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const PM_PAGE = "src/app/[locale]/(dashboard)/maintenance/pm/page.tsx"
const ROW_ACTIONS = "src/components/maintenance/maintenance-plan-row-actions.tsx"
const FORM = "src/components/maintenance/maintenance-plan-form.tsx"
const ASSET_CARD = "src/components/maintenance/pm-plan-asset-card.tsx"
const NEW_PAGE = "src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx"
const EDIT_PAGE = "src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx"
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
  // The sum is one line under the strip (spec §9, Appendix B), not each cell's filterNote (that explains the filter).
  assert.match(source, /<p data-pm-due-sum className="mt-2 text-meta text-muted-foreground">\{dueSum\}<\/p>/)
  assert.doesNotMatch(source, /filterNote: dueSum/)
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

test("the PM plan form uses the shared field primitives; the frame's footer holds the busy save (2C batch 1a; G5P4 Task 4)", () => {
  const form = read(FORM)
  assert.match(form, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(form, /function Field\(|<input|<select|<textarea|Loader2|ml-1 text-danger|NativeSelect/)
  // Each starred Field names its control and shows its error (v-track plan 2 M3); the days Field says its range.
  assert.equal(form.match(/<Field label=\{t\("pm\w+"\)\} id="maintenance-plan-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 2)
  assert.match(form, /<Field\n\s+label=\{t\("pmIntervalDays"\)\}\n\s+id="maintenance-plan-interval-days"\n\s+required\n/)
  // The title, the days and the date keep the browser's own required; the asset select and the days Field write theirs on a line too.
  assert.equal(form.match(/^\s+required$/gm)?.length, 5, "each starred field keeps the browser's own required check")
  assert.match(form, /<Textarea\n\s+value=\{values\.notes\}[\s\S]*?maxLength=\{4000\}/)
  // The save is the frame's footer button, busy while the plan saves (no button of the form's own).
  assert.match(form, /busy: saving,\n\s+formId: PM_PLAN_FORM_ID,/)
  assert.doesNotMatch(form, /<Button type="submit"/)
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

// Group 5 plan 4 Task 4 (spec §10, G5P4-R8..R10, Review Focus 3): the PM form on the operation frame.
test("the PM form sits on OperationFormFrame with three sections, a Segmented frequency, the preview, changed fields and the summary with the impact (spec §10)", () => {
  const form = read(FORM)
  assert.match(form, /^"use client"/)
  assert.match(form, /<form onSubmit=\{handleSubmit\} noValidate id=\{PM_PLAN_FORM_ID\}>\n\s+<OperationFormFrame\n/)
  assert.match(form, /breadcrumbs=\{breadcrumbs\}/)
  assert.match(form, /back=\{back\}/)
  assert.equal(form.match(/<FormSection number=\{\d\}/g)?.length, 3)
  for (const key of ["pmFormSectionAsset", "pmFormSectionDetails", "pmFormSectionSchedule"]) assert.match(form, new RegExp(`<FormSection number=\\{\\d\\} title=\\{t\\("${key}"\\)\\}>`), key)
  // Section 1: the locked card and its hint on edit; on create the pmAsset picker until an asset is picked (G5P4-R9).
  assert.match(form, /<PmPlanAssetCard facts=\{currentFacts\} locked=\{isEdit\} onChange=\{isEdit \? undefined : clearAsset\} \/>/)
  assert.match(form, /t\("pmFormAssetHint"\)/)
  assert.match(form, /fetch\(`\/api\/maintenance-options\?type=pmAsset&id=\$\{encodeURIComponent\(assetId\)\}`/)
  // Section 3: the frequency is a Segmented inside the FieldGroup that keeps the stable id (spec §5 "Stable hooks").
  assert.match(form, /<FieldGroup legend=\{t\("pmFrequencyLabel"\)\} id="maintenance-plan-frequency" required error=\{fieldErrors\.message\("frequency"\)\}>\n\s+<Segmented\n\s+labelledBy="maintenance-plan-frequency-legend"/)
  assert.match(form, /hint=\{t\("pmFormIntervalHint"\)\}/)
  assert.match(form, /buildPmPreview\(values\.nextDueDate, values\.frequency, /)
  assert.match(form, /t\("pmFormPreviewNote"\)/)
  // Changed fields on edit (G5P4-R8), counted in the summary and the footer.
  assert.match(form, /import \{ FormChangedField, type FormFieldChange \} from "@\/components\/ui\/form-changed-field"/)
  for (const field of ["title", "vendorId", "notes", "frequency", "intervalDays", "nextDueDate"]) {
    assert.match(form, new RegExp(`<FormChangedField change=\\{changeOf\\("${field}"\\)\\}>`), field)
  }
  assert.match(form, /pmPlanChangedFields\(initial, values\)/)
  // The summary and the impact on the PM page (G5P4-R10).
  assert.match(form, /<OperationSummaryCard\n/)
  assert.match(form, /buildPmPlanImpact\(\{/)
  assert.match(form, /t\("pmFormImpactTitle", \{ count: impact\.total \}\)/)
  assert.match(form, /t\("pmFormPaused"\)/)
  assert.match(form, /t\(impact\.inWeek \? "pmFormInWeek" : "pmFormNotInWeek"\)/)
})

test("the PM form's footer reads its words through pmPlanFooterKey: บันทึกการแก้ไข on edit", () => {
  const form = read(FORM)
  assert.match(form, /const footerKeys = pmPlanFooterKey\(isEdit\)/)
  assert.match(form, /submitLabel: tRoot\(footerKeys\.submit\),/)
  assert.match(form, /cancelLabel: tRoot\(footerKeys\.cancel\),/)
  assert.match(form, /cancelHref: returnHref,/)
  const th = messages("th")
  assert.equal(th.pmFormSaveEdit, "บันทึกการแก้ไข")
  assert.equal(th.pmFormCancelEdit, "ยกเลิกการแก้ไข")
})

test("a refused save keeps the values: the catch only toasts, nothing resets the form (Review Focus 3)", () => {
  const form = read(FORM)
  assert.match(form, /\} catch \(error\) \{\n\s+apiError\.toast\(error\)\n\s+\} finally \{\n\s+setSaving\(false\)\n\s+\}/)
  // The PATCH carries the plan's updatedAt as the page read it; a 409 MAINTENANCE_PLAN_CONFLICT is its message.
  assert.match(form, /throw new Error\(getMaintenanceErrorMessage\(payload\?\.code, t, tCommon\("error"\)\)\)/)
  assert.doesNotMatch(form, /setValues\(initial\)|setValues\(\{ \.\.\.initial|\.reset\(\)/)
})

test("the PM asset card: photo, name, tag, status badge, room · branch, and on edit แก้ไขไม่ได้ with the lock (G5P4-R9)", () => {
  const card = read(ASSET_CARD)
  assert.match(card, /export function PmPlanAssetCard\(\{ facts, locked, onChange \}: \{\n\s+facts: RepairAssetFacts\n\s+locked: boolean\n\s+onChange\?: \(\) => void\n\}\)/)
  assert.match(card, /<AssetThumbnail photo=\{facts\.photo\}/)
  assert.match(card, /<StatusBadge label=\{facts\.statusLabel\} tone=\{getAssetStateTone\(facts\.statusName\)\} \/>/)
  assert.match(card, /\[facts\.roomName, facts\.branchName\]\.filter/)
  assert.match(card, /<Lock aria-hidden="true"/)
  assert.match(card, /t\("pmFormLocked"\)/)
  assert.match(card, /onChange && !locked \?/)
})

test("the PM pages pass the facts, the edit meta, the three due counts and todayKey (spec §10)", () => {
  const edit = read(EDIT_PAGE)
  const create = read(NEW_PAGE)
  for (const source of [edit, create]) {
    assert.match(source, /loadRepairAssetFacts\(prisma as unknown as RepairAssetFactsDb, /)
    assert.match(source, /readPmDueCounts\(prisma, now\)/)
    assert.match(source, /todayKey=\{getBangkokDateKey\(now\)\}/)
    assert.match(source, /<MaintenancePlanForm\n/)
  }
  assert.match(edit, /t\("pmFormEditTitle", \{ title: plan\.title \}\)/)
  assert.match(edit, /t\("pmFormEditCrumb"\)/)
  assert.match(edit, /t\("pmFormWasDue", \{ date: formatDate\(plan\.nextDueDate\) \}\)/)
  assert.match(edit, /t\("pmFormStateHint"\)/)
  assert.match(edit, /<StatusBadge label=\{t\(`pmPlanStates\.\$\{plan\.planState\}`\)\}/)
  // An ended plan stays a 404 (Appendix A).
  assert.match(edit, /where: \{ id, planState: \{ not: "ended" \} \}/)
  assert.match(create, /t\("pmCreateTitle"\)/)
})

test("the PM form words follow spec §13 verbatim", () => {
  const th = messages("th")
  const expected: Record<string, string> = {
    pmFormEditCrumb: "แก้ไขแผน PM",
    pmFormEditTitle: "แก้ไขแผน PM · {title}",
    pmFormWasDue: "เดิมกำหนด {date}",
    pmFormStateHint: "พักแผนหรือจบแผนทำจากเมนู ⋯ ในหน้ารายการแผน",
    pmFormSectionAsset: "ทรัพย์สินของแผน",
    pmFormLocked: "แก้ไขไม่ได้",
    pmFormAssetHint: "ถ้าจะใช้แผนนี้กับทรัพย์สินอื่น ให้จบแผนนี้แล้วเพิ่มแผนใหม่",
    pmFormSectionDetails: "รายละเอียดแผน",
    pmFormSectionSchedule: "รอบและกำหนด",
    pmFormIntervalHint: "ใส่จำนวนวันต่อรอบได้ 1–3,650 วัน",
    pmFormPreviewTitle: "กำหนดรอบถัดไป",
    pmFormPreviewHint: "ถ้าบันทึกว่าทำแล้วตรงวันทุกรอบ",
    pmFormPreviewFirst: "ครั้งถัดไป",
    pmFormPreviewRound: "รอบที่ {n}",
    pmFormStepMonths: "+{n, number} เดือน",
    pmFormStepYear: "+1 ปี",
    pmFormStepDays: "+{n, number} วัน",
    pmFormPreviewNote: "ระบบนับรอบถัดไปจากวันที่บันทึกว่าทำแล้วจริง ถ้าทำช้าหรือเร็วกว่ากำหนด วันรอบต่อไปจะเลื่อนตาม",
    pmFormChangeCount: "แก้ {count, number} ช่อง",
    pmFormBefore: "ก่อนแก้",
    pmFormAfter: "หลังแก้",
    pmFormDueState: "สถานะกำหนด",
    pmFormImpactTitle: "ผลต่อหน้าแผน PM (ใช้งาน {count, number} แผน)",
    pmFormInWeek: "อยู่ในกล่อง PM ครบกำหนดใน 7 วันของหน้าซ่อมบำรุง",
    pmFormNotInWeek: "ไม่อยู่ในกล่อง PM ครบกำหนดใน 7 วันของหน้าซ่อมบำรุง",
    pmFormPaused: "แผนพักอยู่ ไม่นับในหน้าแผน PM",
    pmFormFooterEdit: "แก้ไขแผน {title} {planNo} · แก้ {count, number} ช่อง",
    pmFormCancelEdit: "ยกเลิกการแก้ไข",
    pmFormSaveEdit: "บันทึกการแก้ไข",
    pmFormFooterCreate: "เพิ่มแผน PM {title} · {asset}",
  }
  for (const [key, value] of Object.entries(expected)) assert.equal(th[key], value, key)
  const en = messages("en")
  for (const key of Object.keys(expected)) assert.equal(typeof en[key], "string", key)
})
