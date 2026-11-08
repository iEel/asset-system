import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 4 (spec 2C §8.9 "ชุด 4", §4.12): the role permission form on the shared fields, checkboxes and buttons,
// and its permission table under the white 13px header of DataTable (2B spec R-e). The form is CRLF in the working
// tree, so the source is read with \r stripped before the multi-line regexes.
// Group 11 plan 3 Task 4 (board US-Role-Edit) split the form into role-form/: the fields are in role-details-section.tsx
// and the matrix in role-permission-matrix.tsx; the form keeps the footer with ยกเลิก and บันทึกสิทธิ์.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const source = read("src/components/admin/role-permission-form.tsx")
const details = read("src/components/admin/role-form/role-details-section.tsx")
const matrix = read("src/components/admin/role-form/role-permission-matrix.tsx")

test("the role permission form uses the shared fields, 16px checkboxes in rows that read as locked, and a busy save button (2C batch 4)", () => {
  assert.match(details, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.match(matrix, /import \{ FieldError \} from "@\/components\/ui\/field"/)
  for (const file of [source, details, matrix]) assert.doesNotMatch(file, /function Field\(|<select|<textarea|Loader2|ml-1 text-danger|rounded border-border|disabled:opacity|uppercase|\bbg-muted\//)
  for (const file of [source, details]) assert.doesNotMatch(file, /<button/)
  assert.equal(matrix.match(/<button\b/g)?.length, 1, "only the group header row's fold button (its N3 EXEMPT row)")
  assert.equal(details.match(/<input\b/g)?.length, 1, "the active checkbox stays a native input")
  assert.equal(matrix.match(/<input\b/g)?.length, 1, "every matrix checkbox (column, row, cell) is the one MatrixCheckbox input")
  assert.equal(source.match(/<input\b/g), null)
  const controls = findJsxTags(details, ["Input", "Textarea"])
  assert.equal(controls.length, 4)
  assert.deepEqual(["required", "maxLength"].map((attr) => controls.filter((tag) => hasJsxAttr(tag.text, attr)).length), [2, 3], "the key and display names keep the browser's own checks")
  assert.match(details, /<Field\n\s+label=\{t\("roleKey"\)\}\n\s+id="role-key"\n\s+required\n[^\n]*\n\s+>\n\s+<Input\n\s+value=\{meta\.name\}\n\s+required\n\s+pattern="\[a-z\]\[a-z0-9_\]\*"\n\s+disabled=\{isSystemRole\}\n/)
  assert.match(details, /<Field label=\{t\("description"\)\} id="role-description" error=\{fieldErrors\.message\("description"\)\}>\n\s+<Textarea\n\s+value=\{meta\.description\}\n\s+rows=\{3\}\n\s+maxLength=\{500\}\n/)
  assert.equal(details.match(/className=\{checkboxVariants\(\)\}/g)?.length, 1)
  assert.equal(matrix.match(/className=\{checkboxVariants\(\)\}/g)?.length, 1)
  assert.match(details, /<label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">/, "a locked row reads as unavailable instead of fading its box")
  assert.match(matrix, /const TARGET = "[^"]*has-disabled:cursor-not-allowed"/, "a locked matrix cell shows the not-allowed cursor over its whole target")
  // Plan 2D-2: the shared DataTable (its white 13/500 header) in a flush panel, instead of the copied header classes. The
  // board's one header row holds the module, ทั้งแถว and the actions with their column checkboxes.
  assert.match(matrix, /<DataTableHeader>\n\s+<tr>\n\s+<DataTableHead[^>]*>\{t\("module"\)\}<\/DataTableHead>\n\s+<DataTableHead[^>]*>\{t\("form\.wholeRow"\)\}<\/DataTableHead>/)
  assert.doesNotMatch(matrix, /<table\b|<thead\b/)
  assert.equal(matrix.match(/<th\b/g)?.length, 1, "only the group header cell, a <th scope=\"rowgroup\">")
  assert.match(matrix, /<th scope="rowgroup" colSpan=\{columnCount\}/)
  for (const file of [source, details]) assert.doesNotMatch(file, /<table\b|<thead\b|<th\b/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}\n\s+<\/Link>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{t\("savePermissions"\)\}\n\s+<\/Button>/)
})
