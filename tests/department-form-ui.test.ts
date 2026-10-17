import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/department-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the department form uses the shared fields, checkbox and buttons (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|Loader2|ml-1 text-danger|disabled=\{saving\}/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a raw input")
  assert.match(source, /<Field label=\{t\("code"\)\} id="department-code" required error=\{fieldErrors\.message\("code"\)\}>\n\s+<Input\n[\s\S]*?maxLength=\{20\}\n\s+required\n\s+\/>/)
  assert.match(source, /<Field label=\{t\("name"\)\} id="department-name" required error=\{fieldErrors\.message\("name"\)\}>\n\s+<Input\n[\s\S]*?maxLength=\{200\}\n\s+required\n\s+\/>/)
  assert.match(source, /<Field label=\{t\("company"\)\}>\n\s+<NativeSelect\n\s+value=\{values\.companyId \?\? ""\}/)
  assert.match(source, /<option value="">\{t\("sharedDepartment"\)\}<\/option>/)
  assert.match(source, /<input\n\s+type="checkbox"[\s\S]*?className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
