import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C batch 2 (spec 2C §8.9): the branch form on the shared fields and buttons. The form is CRLF in the
// working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/master-data/branch-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the branch form uses the shared fields and a busy save button that still waits for a company (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|resize-none/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a native input")
  assert.equal(source.match(/<Field label=\{t\("(?:code|name|company)"\)\} required>/g)?.length, 3)
  assert.equal(source.match(/^\s+required$/gm)?.length, 3, "code, name and company keep the browser's own required check")
  assert.match(source, /<Textarea\n\s+value=\{values\.address \?\? ""\}\n[^\n]*\n\s+rows=\{4\}\n\s+maxLength=\{500\}\n\s+\/>/)
  assert.match(source, /className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{companies\.length === 0\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
