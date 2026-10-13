import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 4 (spec 2C §8.9 "ชุด 4", §4.12): the role permission form on the shared fields, checkboxes and buttons,
// and its permission table under the white 13px header of DataTable (2B spec R-e). The form is CRLF in the working
// tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/admin/role-permission-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the role permission form uses the shared fields, 16px checkboxes in rows that read as locked, and a busy save button (2C batch 4)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|disabled:opacity|uppercase|\bbg-muted\//)
  assert.equal(source.match(/<input\b/g)?.length, 3, "only the active, module and permission checkboxes stay native inputs")
  const controls = findJsxTags(source, ["Input", "Textarea"])
  assert.equal(controls.length, 4)
  assert.deepEqual(["required", "maxLength"].map((attr) => controls.filter((tag) => hasJsxAttr(tag.text, attr)).length), [2, 3], "the key and display names keep the browser's own checks")
  assert.match(source, /<Field label=\{t\("roleKey"\)\} required>\n\s+<Input\n\s+value=\{meta\.name\}\n\s+required\n\s+pattern="\[a-z\]\[a-z0-9_\]\*"\n\s+disabled=\{isSystemRole\}\n/)
  assert.match(source, /<Field label=\{t\("description"\)\}>\n\s+<Textarea\n\s+value=\{meta\.description\}\n\s+rows=\{3\}\n\s+maxLength=\{500\}\n/)
  assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 3)
  assert.equal(source.match(/ has-disabled:cursor-not-allowed has-disabled:text-faint-foreground"/g)?.length, 3, "a locked row reads as unavailable instead of fading its box")
  assert.match(source, /<label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled/)
  assert.match(source, /<label className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground has-disabled/)
  assert.match(source, /<span className="text-sm">\{t\(`actions\.\$\{permission\.action\}`\)\}<\/span>/)
  assert.match(source, /<thead>\n\s+<tr>\n\s+<th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">\n\s+\{t\("module"\)\}/)
  assert.equal(source.match(/<th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">/g)?.length, 2)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}\n\s+<\/Link>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{t\("savePermissions"\)\}\n\s+<\/Button>/)
})
