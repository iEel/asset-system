import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the remark is a row of ข้อมูลทรัพย์สิน (group 1 asset detail task 9)", () => {
  const source = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  const overview = read("src/components/assets/detail/asset-overview.tsx")
  assert.doesNotMatch(source, /<section id="(?:overview|specs|ownership|purchase|notes)"/)
  assert.match(overview, /<div id="overview" className="min-w-0 scroll-mt-24/)
  assert.match(overview, /<div id="purchase" className="scroll-mt-24">/, "the reports' warranty link lands on the purchase rows")
  assert.match(overview, /\{ key: "remark", label: tAsset\("remark"\), value: details\.remark \}/)
  assert.doesNotMatch(source, /sectionLinks\.map/)
})
