import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-1 (spec 2D §3.1, D3–D6, M1, M2): when `default` and `icon` become 36px, a button in the same row as a 40px
// field keeps 40px: text buttons take size="lg" and icon buttons size="icon-lg" (2C 06-actions.md §6.2.3). Every
// PageHeader button is md. Sources are read with LF line endings, so the regexes below may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("buttons in a row of 40px fields stay 40px: lg for text, icon-lg for icons (spec 2D D3, D5, M2)", () => {
  const rows: Array<[string, RegExp, number]> = [
    [`${C}assets/asset-batch-form.tsx`, /variant="outline"\n\s+size="icon-lg"\n\s+onClick=\{\(\) => handleRemoveRow\(row\.clientId\)\}/g, 1],
    [`${C}assets/asset-form.tsx`, /<Button\n\s+variant="outline"\n\s+size="icon-lg"\n\s+className="justify-self-start"\n\s+onClick=\{\(\) => removeRow\(row\.id\)\}/g, 1],
    [`${C}master-data/asset-model-form.tsx`, /variant="danger"\n\s+size="icon-lg"\n\s+onClick=\{\(\) => removeSpecItem\(item\.id\)\}/g, 1],
    [`${C}master-data/category-form.tsx`, /variant="outline"\n\s+size="icon-lg"\n\s+onClick=\{\(\) => (?:moveItem\(index, -1\)|moveItem\(index, 1\)|duplicateItem\(index\)|removeItem\(index\))\}/g, 4],
  ]
  for (const [path, pattern, count] of rows) assert.equal(read(path).match(pattern)?.length, count, path)
  // The phone card header of the batch form is not a field row: its remove icon follows `icon` to 36px.
  assert.match(read(`${C}assets/asset-batch-form.tsx`), /variant="outline"\n\s+size="icon"\n\s+className="shrink-0"\n\s+onClick=\{\(\) => handleRemoveRow\(row\.clientId\)\}/)
  // The label print toolbar: the print button sits beside two boxed 40px fields (K21).
  assert.match(read(`${C}assets/asset-label-print.tsx`), /<Button type="submit" size="lg" busy=\{recordingPrint\} className="w-full sm:w-auto">/)
})

test("the repair record's header buttons are md, like every PageHeader button (spec 2D D6)", () => {
  const source = read(`${C}maintenance/repair-record-actions.tsx`)
  assert.match(source, /<Button size="md" onClick=\{\(\) => setDialog\("complete"\)\}>/)
  assert.match(source, /<Button variant="danger" size="md" onClick=\{\(\) => setDialog\("cancel"\)\}>/)
  assert.match(source, /<Button variant="outline" size="md" onClick=\{\(\) => setDialog\("edit"\)\}>/)
})
