import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import { getApiErrorKey } from "../src/lib/api-error-catalog.ts"
import { PERMISSION_ACTION_ORDER } from "../src/lib/permission-groups.ts"
import { setMany } from "../src/lib/role-editor-model.ts"

// Page group 11 plan 3 task 4 (spec §7, §3, §9; board US-Role-Edit): the role editor at /admin/roles/new and
// /admin/roles/[id]/edit, and the E2E setup helper that drives it. Sources are read with \r stripped, so a regex here may
// hold \n.
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const F = "src/components/admin/role-form/"
const FORM = "src/components/admin/role-permission-form.tsx"
const HEADER = `${F}role-form-header.tsx`
const DETAILS = `${F}role-details-section.tsx`
const MATRIX = `${F}role-permission-matrix.tsx`
const SUMMARY = `${F}role-change-summary.tsx`
const PEOPLE = `${F}role-people-section.tsx`
const DIALOG = `${F}role-add-users-dialog.tsx`
const DATA = "src/lib/role-form-data.ts"
const NEW_PAGE = "src/app/[locale]/(dashboard)/admin/roles/new/page.tsx"
const EDIT_PAGE = "src/app/[locale]/(dashboard)/admin/roles/[id]/edit/page.tsx"
const SETUP = "e2e/setup/run-data.setup.ts"
const messages = (locale: "th" | "en") => {
  const text = read(`messages/${locale}.json`)
  return (text ? JSON.parse(text) : {}) as { adminRolesPage?: { form?: Record<string, string> }; apiErrors?: Record<string, string> }
}
const thForm = () => messages("th").adminRolesPage?.form ?? {}

test("one header row with column select in fixed action order", () => {
  assert.deepEqual([...PERMISSION_ACTION_ORDER], ["view", "create", "edit", "export", "approve", "delete"])
  const matrix = read(MATRIX)
  assert.equal(matrix.match(/<DataTableHeader>/g)?.length, 1, "one header for the whole table")
  assert.match(matrix, /<DataTableHeader>\n\s+<tr>\n\s+<DataTableHead[^>]*>\{t\("module"\)\}<\/DataTableHead>\n\s+<DataTableHead[^>]*>\{t\("form\.wholeRow"\)\}<\/DataTableHead>\n\s+\{columns\.map\(/)
  assert.match(matrix, /const columns = PERMISSION_ACTION_ORDER\.map\(\(action\) =>/)
  assert.match(matrix, /\.\.\.bulkSelect\(current, keys, isLocked\)/, "the column state counts the keys that can change")
  assert.match(matrix, /<span className="num">\{column\.selected\}\/\{column\.rows\}<\/span>/)
  assert.match(matrix, /label=\{t\("form\.selectColumn", \{ action: actionName\(column\.action\) \}\)\}/)
  assert.match(matrix, /indeterminate=\{column\.state === "some"\}/)
  assert.match(matrix, /\.indeterminate = indeterminate/, "the column checkbox shows a mixed state")
  assert.match(matrix, /column\.action === "delete" && "text-warning"/, "ลบ is last, in the warning tone")
  assert.equal(thForm().wholeRow, "ทั้งแถว")
  assert.equal(thForm().selectColumn, "เลือกทั้งคอลัมน์ {action}")
})

test("row and column select clear past locked cells", () => {
  const matrix = read(MATRIX)
  assert.match(matrix, /onChange=\{\(\) => onSetMany\(column\.keys, column\.on\)\}/)
  assert.match(matrix, /const row = bulkSelect\(current, rowKeys, isLocked\)/)
  assert.match(matrix, /checked=\{row\.state === "all"\}/)
  assert.match(matrix, /indeterminate=\{row\.state === "some"\}/)
  assert.match(matrix, /onChange=\{\(\) => onSetMany\(rowKeys, row\.on\)\}/)
  assert.doesNotMatch(matrix, /column\.state !== "all"|held !== rowKeys\.length/, "no target state from every key, locked ones included")
})

test("groups fold with aria-expanded and keep their rows in the DOM", () => {
  const matrix = read(MATRIX)
  assert.match(matrix, /PERMISSION_GROUPS\.map\(\(group\) =>/)
  assert.match(matrix, /<DataTableBody key=\{group\.key\} id=\{`role-group-\$\{group\.key\}`\}/, "one tbody per group")
  assert.match(matrix, /aria-expanded=\{open\}/)
  assert.match(matrix, /aria-controls=\{`role-group-\$\{group\.key\}`\}/)
  assert.match(matrix, /<tr key=\{module\} hidden=\{!open\}/, "a folded group's rows stay in the DOM, hidden")
  assert.match(matrix, /t\("form\.groupLine", \{ modules: summary\.modules, selected: summary\.selected, total: summary\.total \}\)/)
  assert.match(matrix, /groupSummary\(current, group\.key\)/)
  // A group starts open when it holds a change or is not one of the two long groups; a toggle overrides.
  const form = read(FORM)
  assert.match(form, /const FOLDED_GROUPS: readonly PermissionGroupKey\[\] = \["masterData", "system"\]/)
  assert.match(form, /openGroups\[key\] \?\? \(groupHasChange\(key\) \|\| !FOLDED_GROUPS\.includes\(key\)\)/)
  assert.equal(thForm().groupLine, "{modules, number} โมดูล · เลือก {selected, number} จาก {total, number}")
})

test("cells are named action and module, with added and removed suffixes", () => {
  const matrix = read(MATRIX)
  assert.match(matrix, /const cellName = added \? "form\.cellAdded" : removed \? "form\.cellRemoved" : "form\.cell"/)
  assert.match(matrix, /label=\{t\(cellName, \{ action: actionName\(action\), module: moduleName\(module\) \}\)\}/)
  assert.match(matrix, /aria-label=\{label\}/, "the name is the checkbox's own")
  assert.match(matrix, /added && "bg-success-soft"/)
  assert.match(matrix, /removed && "bg-danger-soft"/)
  assert.match(matrix, />\+<\/span>/)
  assert.match(matrix, />−<\/span>/)
  assert.match(matrix, /permissionMarks\(initial, current\)/)
  assert.match(matrix, /title=\{t\("form\.changedRow"\)\}/, "a changed row shows the dot")
  assert.match(matrix, /label=\{t\("form\.selectRow", \{ module: moduleName\(module\) \}\)\}/)
  assert.match(matrix, /\{held\}\/\{rowKeys\.length\}/)
  assert.equal(thForm().cell, "{action} {module}")
  assert.equal(thForm().cellAdded, "{action} {module} (เพิ่มใหม่)")
  assert.equal(thForm().cellRemoved, "{action} {module} (เอาออก)")
  // Each checkbox sits in a 40–44px target; the table scrolls inside its own box.
  assert.match(matrix, /const TARGET = "relative inline-flex size-11 items-center justify-center rounded-md md:size-10/)
  assert.match(matrix, /<DataTable framed=\{false\} caption=/)
})

test("locked cells are disabled and kept by setMany", () => {
  const locked = (key: string) => key === "role:edit"
  const next = setMany(new Set(["asset:view"]), ["role:edit", "user:edit"], true, locked)
  assert.deepEqual([...next].sort(), ["asset:view", "user:edit"])
  const matrix = read(MATRIX)
  assert.match(matrix, /const locked = isLocked\(key\)/)
  assert.match(matrix, /disabled=\{locked\}/)
  // The reason is the title and, for screen readers, a shared description; system_admin's cells say they are protected.
  assert.match(matrix, /const reasonKey = protectedRole \? "form\.protectedCell" : "form\.lockedCell"/)
  assert.match(matrix, /title=\{locked \? t\(reasonKey\) : undefined\}/)
  assert.match(matrix, /describedBy=\{locked \? \(protectedRole \? PROTECTED_REASON_ID : LOCKED_REASON_ID\) : undefined\}/)
  assert.match(matrix, /aria-describedby=\{describedBy\}/)
  assert.match(matrix, /<span id=\{LOCKED_REASON_ID\} className="sr-only">\{t\("form\.lockedCell"\)\}<\/span>/)
  assert.match(matrix, /<span id=\{PROTECTED_REASON_ID\} className="sr-only">\{t\("form\.protectedCell"\)\}<\/span>/)
  assert.match(matrix, /protectedRole=\{allLocked\}/)
  assert.equal(thForm().protectedCell, "สิทธิ์ของ System Administrator ถูกล็อก")
  assert.equal(messages("en").adminRolesPage?.form?.protectedCell, "System Administrator permissions are locked")
  const form = read(FORM)
  assert.match(form, /setValues\(\(current\) => setMany\(current, keys, on, isLocked\)\)/)
  assert.match(form, /const isLocked = \(key: string\) => permissionsLocked \|\| lockedKeys\.has\(key\)/)
  const data = read(DATA)
  assert.match(data, /getRolePermissionChangeError\(\{ actor, currentPermissionKeys: currentKeys, requestedPermissionKeys: \[key\] \}\) !== null/)
  assert.match(data, /role\?\.name === "system_admin"\n?\s*\? allKeys/)
  assert.equal(thForm().lockedCell, "ให้สิทธิ์นี้ไม่ได้ เพราะคุณไม่มีสิทธิ์นี้")
})

test("system_admin matrix is locked", () => {
  const form = read(FORM)
  assert.match(form, /const permissionsLocked = role\.name === "system_admin"/)
  const matrix = read(MATRIX)
  assert.match(matrix, /description=\{allLocked \? t\("permissionLockedSubtitle"\) : t\("form\.matrixHint"\)\}/)
  // Row and column checkboxes are disabled when none of their cells can change.
  assert.equal(matrix.match(/disabled=\{allLocked \|\| /g)?.length, 2)
})

test("the summary names up to three users only with user:view", () => {
  const summary = read(SUMMARY)
  assert.match(summary, /people\.slice\(0, 3\)/)
  assert.match(summary, /canViewUsers && people\.length > 0\n?\s*\? t\("form\.appliesToNames"/)
  assert.match(summary, /: t\("form\.appliesTo", \{ count: userCount \}\)/)
  assert.match(summary, /t\("form\.summaryTitle", \{ before: initial\.size, after: current\.size \}\)/)
  const data = read(DATA)
  assert.match(data, /canViewUsers\n?\s*\? prisma\.user\.findMany\(/, "the people query runs only with user:view")
  assert.match(data, /take: 10/)
  assert.match(data, /orderBy: \{ displayName: "asc" \}/)
  assert.match(read(FORM), /\{isCreate \? null : \(\n\s+<RoleChangeSummary/)
  // A line names the action as a permission, so เพิ่ม · ตรวจนับ never reads "เพิ่ม เพิ่ม".
  assert.equal(thForm().summaryAdd, "เพิ่มสิทธิ์ {action} · {module}")
  assert.equal(thForm().summaryRemove, "เอาสิทธิ์ {action} ออก · {module}")
})

test("segregation warning reads the setting", () => {
  const data = read(DATA)
  assert.match(data, /disposalSegregationOn: parseWorkflowApprovalPolicy\(settings\)\.segregationRequired/)
  assert.match(data, /where: \{ key: \{ in: \[\.\.\.workflowApprovalSettingKeys\] \} \}/)
  const summary = read(SUMMARY)
  assert.match(summary, /segregationWarnings\(current, disposalSegregationOn\)/)
  // The warning is its own component, shown on create and edit; the change summary stays edit-only.
  assert.match(summary, /export function RoleSegregationNotice\(/)
  const form = read(FORM)
  assert.match(form, /\n\s+<RoleSegregationNotice current=\{values\} disposalSegregationOn=\{data\.disposalSegregationOn\} \/>/)
  assert.doesNotMatch(form, /\{isCreate \? null : \(\n\s+<RoleSegregationNotice/)
  assert.match(summary, /<Notice tone="warning" title=\{t\("form\.sodTitle"\)\}/)
  assert.match(summary, /warning\.settingOn \? t\("form\.sodDisposalOn"\) : t\("form\.sodDisposalOff"\)/)
  assert.match(summary, /t\("form\.sodAudit"\)/)
  assert.match(summary, /t\("form\.sodHint"\)/)
  assert.doesNotMatch(summary, /disabled|preventDefault/, "never blocking")
})

test("people section and add dialog are gated by user:view and user:edit", () => {
  const form = read(FORM)
  assert.match(form, /\{role\.id && data\.canViewUsers \? \(\n\s+<RolePeopleSection/)
  const header = read(HEADER)
  assert.match(header, /canViewUsers \? <a href="#role-people"/, "usersInRole jumps to the people section only when it is there")
  assert.match(header, /<a href="#role-people" className=\{cn\(linkVariants\(\), "num inline-flex min-h-11 items-center md:min-h-0"\)\}>/, "a 44px target below md")
  const people = read(PEOPLE)
  assert.match(people, /<section id="role-people"/)
  assert.match(people, /canEditUsers \? \(\n\s+<Link href=\{`\/\$\{locale\}\/admin\/users\/\$\{person\.id\}\/edit`\}/)
  // ดูทั้งหมด opens the user list with exactly role=<id>; the page builds it (the user list's defaults are server-side).
  assert.match(read(EDIT_PAGE), /buildUserListQuery\(USER_LIST_DEFAULT_STATE, USER_LIST_DEFAULT_FILTERS, \{ roleId: id \}\)/)
  assert.match(people, /<Link href=\{usersHref\}/)
  assert.match(people, /\{canEditUsers && roleActive \? \(/)
  assert.match(people, /canEditUsers && !roleActive \? /)
  assert.match(people, /t\("form\.peopleEmpty"\)/)
  const dialog = read(DIALOG)
  assert.match(dialog, /fetch\("\/api\/admin\/users"\)/)
  assert.match(dialog, /user\.isActive && !user\.userRoles\.some\(\(userRole\) => userRole\.roleId === roleId\)/)
  assert.match(dialog, /export const MAX_PICK = 50/)
  assert.match(dialog, /fetch\(`\/api\/admin\/roles\/\$\{roleId\}\/users`, \{\n\s+method: "POST"/)
  assert.match(dialog, /body: JSON\.stringify\(\{ userIds: \[\.\.\.picked\], note: note\.trim\(\) \|\| null \}\)/)
  assert.match(dialog, /apiError\.describe\(refusal\.reason\)\.message/, "every refusal reads in Thai through the catalog")
  assert.match(dialog, /router\.refresh\(\)/)
  // People added, or found already in the role, leave the list at once; the already-held are counted apart.
  assert.match(dialog, /const gone = new Set\(\[\.\.\.done\.added, \.\.\.done\.alreadyHeld\]\)/)
  assert.match(dialog, /setCandidates\(\(current\) => current\?\.filter\(\(candidate\) => !gone\.has\(candidate\.id\)\) \?\? null\)/)
  assert.match(dialog, /t\("form\.addUsersAlreadyHeld", \{ count: result\.alreadyHeld\.length \}\)/)
  assert.equal(thForm().addUsersAlreadyHeld, "อยู่ในบทบาทนี้แล้ว {count, number} คน")
  assert.doesNotMatch(dialog, /<form\b/)
  // Every refusal the route can send has a catalog key.
  const catalog = read("src/lib/api-error-catalog.ts")
  assert.match(catalog, /"User not found or inactive": "userNotFoundOrInactive"/)
  assert.match(catalog, /\[\/\^Forbidden: cannot grant \\S\+ without holding it\$\/, "grantPermissionForbidden"\]/)
  assert.equal(getApiErrorKey("Forbidden: cannot grant role:edit without holding it"), "grantPermissionForbidden")
  assert.equal(getApiErrorKey("User not found or inactive"), "userNotFoundOrInactive")
  assert.equal(messages("th").apiErrors?.userNotFoundOrInactive, "ไม่พบผู้ใช้หรือบัญชีปิดใช้งานอยู่")
})

test("history only with canViewLogs", () => {
  const header = read(HEADER)
  assert.match(header, /actions=\{\n\s+canViewLogs \? \(\n\s+<DropdownMenu modal=\{false\}>/)
  assert.match(header, /<Link href=\{buildSystemLogRecordHref\(locale, "role", role\.id\)\}>/)
  assert.match(header, /\{t\("form\.history"\)\}/)
  assert.match(header, /t\("form\.editTitle", \{ name: role\.displayNameTh \|\| role\.displayName \}\)/)
  assert.match(header, /<span className="tag">\{role\.name\}<\/span>/)
  assert.match(read(DATA), /canViewLogs: hasPermission\(actor, "system", "view"\)/)
})

test("footer keeps the save name บันทึกสิทธิ์ and sends the note", () => {
  const form = read(FORM)
  assert.match(form, /<StickyFormFooter\b/)
  assert.match(form, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{t\("savePermissions"\)\}\n\s+<\/Button>/)
  assert.match(form, /note: note\.trim\(\) \|\| null,/)
  assert.match(form, /t\("form\.footerStatus", \{/)
  // Below sm the note is in the form body; from sm it sits in the footer with its label. One is displayed at a time.
  assert.match(form, /<section className=\{cn\(getPanelClasses\(\), "p-4 sm:hidden"\)\}>\n\s+<Field label=\{t\("form\.noteOptional"\)\} id="role-note-phone">/)
  assert.match(form, /<Field label=\{t\("form\.noteOptional"\)\} id="role-note" className="hidden sm:grid sm:w-80">/)
  assert.equal(form.match(/maxLength=\{500\}/g)?.length, 2)
  assert.equal(messages("th").adminRolesPage && (messages("th").adminRolesPage as Record<string, unknown>).savePermissions, "บันทึกสิทธิ์")
})

test("kept: role key rules, field errors focus, system role notices", () => {
  const form = read(FORM)
  assert.match(form, /check\("name", required\(values\.name\) \?\? minLength\(values\.name, 2\) \?\? maxLength\(values\.name, 50\) \?\? pattern\(values\.name, \/\^\[a-z\]\[a-z0-9_\]\*\$\/\)\)/)
  // A permissions error opens every group first, so the cell focus moves to is shown.
  assert.match(form, /fieldErrors\.focusFirst\(FIELD_ORDER, \{\n\s+idFor: \(key\) => FIELD_IDS\[key\],\n\s+reveal: \(key\) => \{\n\s+if \(key === "permissionIds"\) setOpenGroups\(/)
  assert.match(form, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/)
  assert.match(form, /toast\.success\(tCommon\("savedSuccess"\)\)\n\s+router\.push\(backHref\)/)
  const details = read(DETAILS)
  assert.match(details, /\{isSystemRole \? <Notice tone="neutral" className="mb-5">\{permissionsLocked \? t\("systemAdminGuard"\) : t\("systemRoleGuard"\)\}<\/Notice> : null\}/)
  assert.equal(details.match(/disabled=\{isSystemRole\}/g)?.length, 2, "a system role keeps its key and its status")
  for (const id of ["role-key", "role-display-name", "role-display-name-th", "role-description"]) assert.ok(details.includes(`id="${id}"`), id)
  assert.ok(read(MATRIX).includes('id={key === focusKey ? "role-permissions" : undefined}'))
  // Both pages load through loadRoleFormData.
  assert.match(read(NEW_PAGE), /loadRoleFormData\(\{ roleId: null, actor \}\)/)
  assert.match(read(EDIT_PAGE), /loadRoleFormData\(\{ roleId: id, actor \}\)/)
  assert.match(read(EDIT_PAGE), /if \(!data\) notFound\(\)/)
})

test("the E2E setup opens folded groups and finds cells by action then module", () => {
  const setup = read(SETUP)
  assert.match(setup, /const ACTION_LABELS: Record<string, string> = \{ view: "ดู", create: "เพิ่ม", edit: "แก้ไข", delete: "ลบ", export: "ส่งออก", approve: "อนุมัติ" \}/)
  assert.match(setup, /async function openAllGroups\(page: Page\)/)
  assert.match(setup, /page\.locator\('#role-permission-matrix button\[aria-expanded="false"\]'\)/)
  assert.equal(setup.match(/await openAllGroups\(page\)/g)?.length, 2, "on the new page and on the read-back")
  assert.equal(setup.match(/getByRole\("checkbox", \{ name: new RegExp\("\^" \+ ACTION_LABELS\[action\] \+ " "\) \}\)/g)?.length, 1)
  assert.equal(setup.match(/getByRole\("checkbox", \{ name: new RegExp\("\^" \+ label \+ " "\) \}\)/g)?.length, 1)
  assert.match(setup, /if \(\(await row\.locator\("span\.tag"\)\.count\(\)\) === 0\) continue/)
  assert.match(read(MATRIX), /<div\n\s+id="role-permission-matrix"/)
})
