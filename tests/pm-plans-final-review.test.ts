import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 5 plan 4 final whole-branch review fixes (PM page and PM form).
const PM_PAGE = "src/app/[locale]/(dashboard)/maintenance/pm/page.tsx"
const ROW_ACTIONS = "src/components/maintenance/maintenance-plan-row-actions.tsx"
const FORM = "src/components/maintenance/maintenance-plan-form.tsx"
const EDIT_PAGE = "src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx"
const OPTION_SELECT = "src/components/maintenance/maintenance-option-select.tsx"
const FRAME = "src/components/asset-operations/operation-form-frame.tsx"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).maintenancePage

test("the option select shows the stored option when the value is back on it after a search left it out (final review 1)", () => {
  const source = read(OPTION_SELECT)
  assert.match(source, /initialOption && value === initialOption\.id && !visibleOptions\.some\(\(option\) => option\.id === initialOption\.id\)/)
  assert.match(source, /\? \[initialOption, \.\.\.visibleOptions\]/)
})

test("a row whose asset is written off or inactive has no บันทึกว่าทำแล้ว; ⋯ stays (final review 2)", () => {
  const actions = read(ROW_ACTIONS)
  assert.match(actions, /assetOut: boolean/)
  assert.match(actions, /canCreate && plan\.planState === "active" && !openRecord && !assetOut/)
  const page = read(PM_PAGE)
  assert.equal(page.match(/assetOut=\{plan\.due\.kind === "assetStatus"\}/g)?.length, 2)
})

test("an inactive asset's plan opens read-only: a warning in section 1 and no save (final review 3)", () => {
  const edit = read(EDIT_PAGE)
  // The update refuses an inactive asset (mutateMaintenancePlan reads the asset with isActive: true).
  assert.match(edit, /editBlocked=\{!plan\.asset\.isActive\}/)
  assert.match(read("src/lib/maintenance-plan-service.ts"), /where: \{ id: current\.assetId, isActive: true \}/)
  const form = read(FORM)
  assert.match(form, /editBlocked \? \(\n\s*<Notice tone="warning" data-pm-edit-blocked>\{t\("pmFormEditBlocked"\)\}<\/Notice>/)
  assert.match(form, /submitDisabled: editBlocked/)
  assert.match(form, /if \(editBlocked\) return/)
  const frame = read(FRAME)
  assert.match(frame, /submitDisabled\?: boolean/)
  assert.match(frame, /<Button type="submit" form=\{footer\.formId\} busy=\{footer\.busy\} disabled=\{footer\.submitDisabled\}>/)
  assert.equal(messages("th").pmFormEditBlocked, "แก้ไขแผนนี้ไม่ได้ เพราะทรัพย์สินถูกปิดใช้งานแล้ว · จบแผนได้จากเมนู ⋯ ในหน้ารายการแผน")
  assert.equal(typeof messages("en").pmFormEditBlocked, "string")
})

test("เพิ่มแผน PM carries returnTo, in the header and the empty state (final review 4)", () => {
  const page = read(PM_PAGE)
  assert.match(page, /const createHref = appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/pm\/new`, returnTo\)/)
})

test("the edit page's meta puts planNo before the state badge (final review 5, spec §10)", () => {
  const edit = read(EDIT_PAGE)
  assert.match(edit, /<span className="tag">\{plan\.planNo\}<\/span>\n\s*<StatusBadge label=\{t\(`pmPlanStates/)
})

test("คืนค่าเดิม gives focus to the field's control (final review 6)", () => {
  const form = read(FORM)
  assert.match(form, /function focusRestored\(field: PmPlanChangedField\)/)
  assert.match(form, /`#\$\{FIELD_IDS\.frequency\} \[aria-pressed="true"\]`/)
  assert.match(form, /document\.getElementById\(FIELD_IDS\[field\]\)/)
  assert.match(form, /focusField\(element\)/)
  // Both ways out of restore focus the field.
  assert.equal(form.match(/focusRestored\(field\)/g)?.length, 2)
})

test("after a state change the row leaves; focus goes to the current tab once ⋯ is gone (final review 7)", () => {
  const actions = read(ROW_ACTIONS)
  assert.match(actions, /function focusAfterStateChange\(opener: RefObject<HTMLElement \| null>\)/)
  assert.match(actions, /\[data-pm-tabs\] \[aria-current="page"\]/)
  assert.match(actions, /if \(returnFocusRef\) focusAfterStateChange\(returnFocusRef\)/)
  const page = read(PM_PAGE)
  assert.match(page, /<TabNav\n\s*data-pm-tabs\n/)
})
