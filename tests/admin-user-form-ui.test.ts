import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 4 (spec 2C §8.9 "ชุด 4"): the admin user form on the shared fields and buttons. The form is CRLF in the
// working tree, so the source is read with \r stripped before the multi-line regexes.
// Group 11 plan 2 Task 4 split the form into user-form/ (board US-User-Edit): the fields went to the account section,
// the employee select became a SearchableSelect, the role and AD/local choices are ChoiceCards (no native input left),
// and the ใช้งาน checkbox left the form (closing is in the header's อื่น ๆ menu).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const source = read("src/components/admin/admin-user-form.tsx")
const account = read("src/components/admin/user-form/user-account-section.tsx")
const employee = read("src/components/admin/user-form/user-employee-section.tsx")
const roles = read("src/components/admin/user-form/user-roles-section.tsx")
const all = [source, account, employee, roles].join("\n")

test("the admin user form uses the shared fields, checkboxes and a busy save button (2C batch 4)", () => {
  assert.match(account, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.match(roles, /import \{ FieldError, FieldRequiredMark \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(all, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|NativeSelect/)
  assert.equal(all.match(/<input\b/g), null, "the role and AD/local choices are ChoiceCards")
  assert.equal(roles.match(/<ChoiceCard\n\s+key=\{role\.id\}\n\s+type="checkbox"/g)?.length, 1)
  assert.equal(account.match(/<ChoiceCard\n\s+type="radio"/g)?.length, 2)
  const inputs = findJsxTags(account, ["Input"])
  assert.equal(inputs.length, 4)
  assert.deepEqual(
    ["required", "maxLength", "minLength"].map((attr) => inputs.filter((tag) => hasJsxAttr(tag.text, attr)).length),
    [3, 4, 1],
    "username, password and display name keep the browser's own checks",
  )
  // Each Field names its control and shows its error (v-track plan 1 M7).
  assert.match(account, /<Field\n\s+label=\{t\("username"\)\}\n\s+id="admin-user-username"\n\s+required\n[^\n]*\n\s+error=\{fieldErrors\.message\("username"\)\}\n\s+>\n\s+<Input\n/)
  assert.match(account, /<Field label=\{t\("displayName"\)\} id="admin-user-display-name" required hint=\{adSyncedHint\} error=\{fieldErrors\.message\("displayName"\)\}>\n\s+<Input\n/)
  assert.match(account, /<Field\n\s+label=\{isEdit \? t\("newPassword"\) : t\("password"\)\}\n\s+id="admin-user-password"\n\s+required=\{!isEdit\}\n[^\n]*\n[^\n]*\n\s+>\n\s+<Input\n\s+type="password"\n/)
  assert.match(account, /<Field label=\{t\("email"\)\} id="admin-user-email" hint=\{adSyncedHint\} error=\{fieldErrors\.message\("email"\)\}>\n\s+<Input\n\s+type="email"\n/)
  assert.match(employee, /<SearchableSelect\n\s+id="admin-user-employee"\n\s+label=\{t\("employee"\)\}[\s\S]*?error=\{error\}/)
  assert.match(source, /error=\{fieldErrors\.message\("employeeId"\)\}/)
  assert.match(roles, /onChange=\{\(\) => onToggle\(role\.id\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}\n\s+<\/Link>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}\n\s+<\/Button>/)
})
