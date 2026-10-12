import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/company-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the company form uses the shared fields with hints and a busy save button (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|resize-none|text-xs text-muted-foreground/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a raw input")
  assert.match(source, /<input\n\s+type="checkbox"[\s\S]*?className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Field label=\{t\("code"\)\} required hint=\{t\("codeHelp"\)\}>\n\s+<Input\n/)
  assert.match(source, /<Field label=\{t\("assetTagCode"\)\} hint=\{t\("assetTagCodeHelp"\)\}>\n\s+<Input\n/)
  assert.equal(source.match(/<Field label=/g)?.length, 6)
  assert.equal(source.match(/^\s+required$/gm)?.length, 2, "code and Thai name keep the browser's own required check")
  assert.equal(source.match(/^\s+maxLength=\{\d+\}$/gm)?.length, 6)
  assert.equal(source.match(/event\.target\.value\.toUpperCase\(\)/g)?.length, 2, "both codes are still typed in upper case")
  assert.match(source, /<Textarea\n\s+value=\{values\.address \?\? ""\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
