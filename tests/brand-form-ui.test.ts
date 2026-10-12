import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C batch 2 (spec 2C §8.9): the brand form on the shared field and buttons. The form is CRLF in the
// working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/master-data/brand-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the brand form uses the shared field and a busy save button (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /<label className="block">|mb-1\.5 block text-sm|ml-1 text-danger|<button|Loader2|disabled=/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a native input")
  assert.match(source, /<Field label=\{t\("brandName"\)\} required>\n\s+<Input\n\s+value=\{values\.name\}\n[^\n]*\n\s+maxLength=\{200\}\n\s+required\n\s+\/>\n\s+<\/Field>/)
  assert.match(source, /className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
