import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 4 (spec 2C §8.9 "ชุด 4"): the admin user form on the shared fields and buttons. The form is CRLF in the
// working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/admin/admin-user-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the admin user form uses the shared fields, checkboxes and a busy save button (2C batch 4)", () => {
  assert.match(source, /import \{ Field, FieldError \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|disabled=/)
  assert.equal(source.match(/<input\b/g)?.length, 2, "only the active and role checkboxes stay native inputs")
  const inputs = findJsxTags(source, ["Input"])
  assert.equal(inputs.length, 4)
  assert.deepEqual(
    ["required", "maxLength", "minLength"].map((attr) => inputs.filter((tag) => hasJsxAttr(tag.text, attr)).length),
    [3, 4, 1],
    "username, password and display name keep the browser's own checks",
  )
  // Each Field names its control and shows its error (v-track plan 1 M7).
  assert.equal(source.match(/<Field label=\{t\("(?:username|displayName)"\)\} id="admin-user-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>\n\s+<Input\n/g)?.length, 2)
  assert.match(source, /<Field\n\s+label=\{isEdit \? t\("newPassword"\) : t\("password"\)\}\n\s+id="admin-user-password"\n\s+required=\{!isEdit\}\n[^\n]*\n\s+>\n\s+<Input\n\s+type="password"\n/)
  assert.match(source, /<Field label=\{t\("email"\)\} id="admin-user-email" error=\{fieldErrors\.message\("email"\)\}>\n\s+<Input\n\s+type="email"\n/)
  assert.match(source, /<Field label=\{t\("employee"\)\} id="admin-user-employee" error=\{fieldErrors\.message\("employeeId"\)\}>\n\s+<NativeSelect\n/)
  assert.match(source, /onChange=\{\(event\) => setField\("isActive", event\.target\.checked\)\}\n\s+className=\{checkboxVariants\(\)\}/)
  assert.match(source, /onChange=\{\(\) => toggleRole\(role\.id\)\}\n\s+className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}\n\s+<\/Link>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}\n\s+<\/Button>/)
})
