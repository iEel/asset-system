import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/employee-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the employee form uses the shared fields, checkbox and buttons (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|Loader2|ml-1 text-danger|disabled=\{saving\}/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a raw input")
  assert.equal(source.match(/<Field label=\{t\("\w+"\)\} required>/g)?.length, 6)
  assert.equal(source.match(/<Field label=\{t\("\w+"\)\}>/g)?.length, 4)
  assert.equal(source.match(/^\s+required$/gm)?.length, 6, "each starred field keeps the browser's own required check")
  assert.equal(source.match(/^\s+maxLength=\{\d+\}$/gm)?.length, 5)
  assert.match(source, /<Input\n\s+type="email"\n\s+value=\{values\.email \?\? ""\}/)
  assert.match(source, /<input\n\s+type="checkbox"[\s\S]*?className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})

test("the employee form still narrows branch and department to the chosen company", () => {
  assert.match(source, /<Field label=\{t\("company"\)\} required>\n\s+<NativeSelect\n\s+value=\{values\.companyId\}\n\s+onChange=\{\(event\) => handleCompanyChange\(event\.target\.value\)\}/)
  assert.match(source, /<Field label=\{t\("branch"\)\} required>\n\s+<NativeSelect[\s\S]*?>\n\s+<option value="">\{t\("selectBranch"\)\}<\/option>\n\s+\{filteredBranches\.map\(/)
  assert.match(source, /<Field label=\{t\("department"\)\} required>\n\s+<NativeSelect[\s\S]*?>\n\s+<option value="">\{t\("selectDepartment"\)\}<\/option>\n\s+\{filteredDepartments\.map\(/)
})
