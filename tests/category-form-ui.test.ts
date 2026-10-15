import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/category-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the category form uses the shared fields, buttons and a busy save button (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|disabled:opacity/)
  assert.equal(source.match(/<input\b/g)?.length, 2, "only the two checkboxes stay raw inputs")
  assert.equal(source.match(/<input\n\s+type="checkbox"/g)?.length, 2)
  assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2)
  assert.equal(source.match(/<Field label=/g)?.length, 9)
  assert.equal(source.match(/^\s+required$/gm)?.length, 4, "code, name, field name and field label keep the browser's own required check")
  assert.match(source, /<Textarea\n\s+value=\{values\.description \?\? ""\}[\s\S]*?maxLength=\{500\}[\s\S]*?className="min-h-28"/)
  assert.match(source, /<label className="inline-flex min-h-11 items-center gap-2 text-sm">/, "the required checkbox row is a 44px target")
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})

test("the template editors keep their move limits and use the shared button looks (2C batch 2)", () => {
  assert.equal(source.match(/<Button\s+variant="outline"\s+size="md"/g)?.length, 5, "add custom field, add photo item, move up, move down, duplicate")
  assert.match(source, /<Button variant="danger" size="md" onClick=\{\(\) => removeField\(index\)\}>/)
  assert.match(source, /onClick=\{\(\) => moveField\(index, -1\)\} disabled=\{index === 0\}>/)
  assert.match(source, /onClick=\{\(\) => moveField\(index, 1\)\} disabled=\{index === fields\.length - 1\}>/)
  assert.match(source, /sm:grid-cols-\[minmax\(0,1fr\)_repeat\(4,auto\)\]/, "the icon columns size to the 44px phone button")
  assert.match(source, /<Field label=\{labels\.item\} hideLabel>\n\s+<Input\n\s+value=\{item\}[\s\S]*?maxLength=\{100\}/)
  assert.equal(source.match(/variant="outline"\n\s+size="icon-lg"/g)?.length, 4, "the photo item icons are 40px beside the 40px field (2D D5); remove is neutral (K22)")
  assert.equal(source.match(/className="justify-self-start"/g)?.length, 4)
  assert.match(source, /onClick=\{\(\) => moveItem\(index, -1\)\}\n\s+disabled=\{index === 0\}/)
  assert.match(source, /onClick=\{\(\) => moveItem\(index, 1\)\}\n\s+disabled=\{index === items\.length - 1\}/)
})
