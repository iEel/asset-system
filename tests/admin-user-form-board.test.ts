import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Page group 11 plan 2 task 4 (spec §5, §9; board US-User-Edit): the create and edit user form. Sources are read with
// \r stripped, so a regex here may hold \n. A missing file reads as "", so every pin fails until its part exists.
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const FORM = "src/components/admin/admin-user-form.tsx"
const P = "src/components/admin/user-form/"
const D = "src/app/[locale]/(dashboard)/admin/users/"
const form = () => read(FORM)
const header = () => read(`${P}user-form-header.tsx`)
const account = () => read(`${P}user-account-section.tsx`)
const employee = () => read(`${P}user-employee-section.tsx`)
const roles = () => read(`${P}user-roles-section.tsx`)
const preview = () => read(`${P}user-access-preview.tsx`)
const dialog = () => read(`${P}user-status-dialog.tsx`)

test("create offers AD first and local reveals the password", () => {
  const source = account()
  // Two radio ChoiceCards, AD before local, on create only.
  assert.match(source, /<ChoiceCard\n\s+type="radio"\n\s+name="admin-user-auth-mode"\n\s+value="ad"[\s\S]*?<ChoiceCard\n\s+type="radio"\n\s+name="admin-user-auth-mode"\n\s+value="local"/)
  assert.match(source, /label=\{t\("form\.authAd"\)\}\n\s+description=\{t\("form\.authAdHint"\)\}/)
  assert.match(source, /label=\{t\("form\.authLocal"\)\}\n\s+description=\{t\("form\.authLocalHint"\)\}/)
  assert.match(source, /\{isEdit \? null : \(/, "the choice shows on create only")
  // The password field shows on edit, or on create for a local account, where it is required.
  assert.match(source, /\{isEdit \|\| values\.authMode === "local" \? \(/)
  assert.match(source, /required=\{!isEdit\}/)
  assert.match(source, /hint=\{isEdit \? t\("form\.passwordEditHint"\) : undefined\}/)
  // AD is the default; an AD account sends no password at all (a short one would fail the server's check).
  const main = form()
  assert.match(main, /authMode: "ad",/)
  assert.match(main, /\.\.\.\(isEdit \? \{ password: values\.password \|\| null \} : \{ authMode: values\.authMode \}\),/)
  assert.match(main, /\.\.\.\(!isEdit && values\.authMode === "local" \? \{ password: values\.password \} : \{\}\),/)
  assert.match(main, /check\("password", \(isEdit \|\| values\.authMode === "ad" \? null : required\(values\.password\)\)/)
})

test("the employee card links holdings exactly and shows a left badge", () => {
  const source = employee()
  assert.match(source, /<SearchableSelect\n\s+id="admin-user-employee"/)
  assert.match(source, /description: `\$\{employee\.code\} · \$\{employee\.departmentName\} · \$\{employee\.branchName\}`/)
  assert.match(source, /\.filter\(\(employee\) => !employee\.hasLeft\)/, "a resigned employee is never offered for a new link")
  assert.match(source, /hint=\{t\("form\.employeeHint"\)\}/)
  assert.match(source, /buildExactAssetRegisterHref\(locale, \{ custodianId: selected\.id \}\)/)
  assert.match(source, /canViewAssets \? \(\n\s+<Link/, "the holdings link only with asset:view, plain text otherwise")
  assert.match(source, /selected\.heldAssetCount > 0 \?/)
  assert.match(source, /selected\.hasLeft \? <StatusBadge label=\{t\("employeeLeft"\)\}/)
  assert.match(source, /\{t\("form\.change"\)\}/)
  assert.match(source, /\{t\("form\.unlink"\)\}/)
  // On create a chosen employee fills the empty fields; a suggested login name says so under the field.
  const main = form()
  assert.match(main, /if \(!isEdit && next\) \{\n\s+const filled = fillFromEmployee\(/)
  assert.match(account(), /usernameSuggested \? t\("form\.usernameSuggested"\) : undefined/)
})

test("role chips mark new and removed with undo", () => {
  const source = roles()
  assert.match(source, /const \{ added, removed \} = roleChangeMarks\(initialIds, currentIds\)/)
  assert.match(source, /const chipIds = \[\.\.\.currentIds, \.\.\.removed\]/)
  assert.match(source, /t\("form\.rolesChosen", \{ count: currentIds\.length \}\)/)
  assert.match(source, /isAdded \? <StatusBadge label=\{t\("form\.roleNew"\)\} tone="info" \/> : null/)
  assert.match(source, /isRemoved \? <StatusBadge label=\{t\("form\.roleRemoved"\)\} tone="danger" \/> : null/)
  assert.match(source, /isRemoved && "line-through/)
  assert.match(source, /\{t\("form\.undo"\)\}/)
  assert.match(source, /aria-label=\{t\("form\.removeRole", \{ name: role\.label \}\)\}/)
  assert.match(source, /t\("form\.systemRoles"\)/)
  assert.match(source, /t\("form\.customRoles"\)/)
  assert.match(source, /<SearchField\b[\s\S]*?placeholder=\{t\("form\.roleSearch"\)\}/)
  assert.match(source, /href=\{`\/\$\{locale\}\/admin\/roles\?view=matrix`\}/)
  assert.match(source, /\{t\("form\.inactiveRolesNote"\)\}/)
})

test("held inactive roles show as chips", () => {
  // The page data loads the inactive roles the user holds, the list offers only active ones, and the chip says so.
  assert.match(read("src/lib/admin-user-form-data.ts"), /\{ OR: \[\{ isActive: true \}, \{ userRoles: \{ some: \{ userId \} \} \}\] \}/)
  const source = roles()
  assert.match(source, /roles\.filter\(\(role\) => role\.isActive\)/)
  assert.match(source, /!role\.isActive \? <StatusBadge label=\{t\("form\.roleInactive"\)\} tone="muted" \/> : null/)
})

test("locked roles are disabled with their reason", () => {
  const source = roles()
  // A role the user holds stays usable, so a removed one can be undone.
  assert.match(source, /const isLocked = \(role: FormRole\) => role\.lockReason !== null && !initial\.has\(role\.id\)/)
  assert.match(source, /const locked = isLocked\(role\)/)
  assert.match(source, /disabled=\{locked\}/)
  assert.match(source, /role\.lockReason === "systemAdminOnly" \? t\("form\.lockSystemAdmin"\) : t\("form\.lockMissing"\)/)
  assert.match(source, /t\("form\.permissionCount", \{ count: role\.permissionKeys\.length \}\)/)
})

test("the preview table uses accessPreview", () => {
  const source = preview()
  assert.match(source, /accessPreview\(roles, initialIds, currentIds\)/)
  assert.match(source, /<DataTable\b/)
  for (const key of ["previewTask", "previewNow", "previewAfter", "previewNone", "previewSame", "appliesNow"]) {
    assert.ok(source.includes(`t("form.${key}")`), key)
  }
  assert.match(source, /t\("form\.previewTotal", \{ before: preview\.beforeCount, after: preview\.afterCount \}\)/)
  assert.match(source, /t\(`form\.group\.\$\{row\.group\}`\)/)
  assert.match(source, /tRoles\(`actions\.\$\{action\}`\)/)
  assert.match(source, /className="font-medium text-success"/, "a gained action is + in the success tone")
  assert.match(source, /className="text-danger line-through"/, "a lost action is a struck − in the danger tone")
  assert.match(source, /t\("form\.highRiskGained", \{ list: /)
  assert.match(source, /preview\.coveredRemovals\.map\(\(label\) =>/)
  assert.match(source, /t\("form\.coveredRemoval", \{ role: label \}\)/)
})

test("closing waits for unsaved edits", () => {
  const source = header()
  assert.match(source, /const statusBlocked = user\.isSelf \? t\("form\.closeSelf"\) : dirty \? t\("form\.saveFirst"\) : null/)
  assert.match(source, /unavailable=\{true\}/)
  assert.match(source, /<DropdownMenuItemDescription>\{statusBlocked\}<\/DropdownMenuItemDescription>/)
  assert.match(form(), /dirty=\{changeCount > 0\}/)
})

test("own account cannot be closed", () => {
  assert.match(header(), /user\.isSelf \? t\("form\.closeSelf"\)/)
  assert.match(read("src/lib/admin-user-form-data.ts"), /isSelf: user\.id === actor\.id/)
  // The dialog calls the status route and refreshes; a refusal goes through useApiError.
  const source = dialog()
  assert.match(source, /fetch\(`\/api\/admin\/users\/\$\{user\.id\}\/status`, \{\n\s+method: "PATCH"/)
  assert.match(source, /body: JSON\.stringify\(\{ isActive: !user\.isActive, note: note\.trim\(\) \|\| null \}\)/)
  assert.match(source, /apiError\.toast\(error\)/)
  assert.match(source, /router\.refresh\(\)/)
  assert.match(source, /<AccessibleDialog\b/)
  assert.match(source, /maxLength=\{500\}/)
})

test("history shows only with canViewLogs", () => {
  const source = header()
  assert.match(source, /\{canViewLogs \? \(\n\s+<DropdownMenuItem asChild>\n\s+<Link href=\{buildSystemLogRecordHref\(locale, "user", user\.id\)\}>/)
  assert.match(source, /t\("form\.history"\)/)
  assert.match(source, /t\("form\.more"\)/)
  assert.match(source, /t\("form\.lastLogin", \{ time: formatDateTime\(user\.lastLoginAt\) \}\)/)
  assert.match(source, /t\("neverLoggedIn"\)/)
  assert.match(source, /t\("form\.createdAt", \{ date: formatDate\(user\.createdAt\) \}\)/)
})

test("the footer carries the note and the change count", () => {
  const source = form()
  assert.match(source, /<StickyFormFooter\n/)
  assert.match(source, /changeCount > 0 \? t\("form\.changes", \{ count: changeCount \}\) : t\("form\.noChanges"\)/)
  assert.match(source, /const changeCount = changedFields\(initialValues, values\) \+ added\.length \+ removed\.length/)
  assert.match(source, /<Textarea\n\s+value=\{note\}[\s\S]*?maxLength=\{500\}/)
  assert.match(source, /note: note\.trim\(\) \|\| null,/)
})

test("no isActive checkbox in the form", () => {
  const source = form()
  assert.doesNotMatch(source, /setField\("isActive"|tCommon\("active"\)|checkboxVariants/)
  assert.match(source, /isActive: user \? user\.isActive : true,/, "an edit keeps the stored status; a new account is active")
})

test("kept: field errors focus the first field", () => {
  const source = form()
  assert.match(source, /const FIELD_ORDER = Object\.keys\(FIELD_IDS\) as AdminUserField\[\]/)
  assert.match(source, /fieldErrors\.focusFirst\(FIELD_ORDER, \{/)
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/)
  // Both pages load the form data; a missing user is a 404.
  const create = read(`${D}new/page.tsx`)
  assert.match(create, /loadUserFormData\(\{ userId: null, actor \}\)/)
  const edit = read(`${D}[id]/edit/page.tsx`)
  assert.match(edit, /loadUserFormData\(\{ userId: id, actor \}\)/)
  assert.match(edit, /if \(!data\.user\) notFound\(\)/)
})
