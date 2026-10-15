import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-1 (spec 2D D8, M23): the asset search results and the label page data carry the read-only English status name,
// so plan 2D-3 can pick the StatusBadge tone with getAssetStateTone. The query, the select and every old field stay.
test("search API adds the read-only status name to asset results and keeps the old fields (D8)", () => {
  const source = readFileSync("src/app/api/search/route.ts", "utf8")
  assert.match(source, /status\?: \{\s*name: string\s*label: string\s*colorCode: string \| null\s*\}/)
  assert.match(source, /status: \{ select: \{ name: true, nameTh: true, colorCode: true \} \}/)
  assert.match(source, /status: \{\s*name: asset\.status\.name,\s*label: statusLabel,\s*colorCode: asset\.status\.colorCode,\s*\}/)
  assert.match(source, /badge: \{ label: statusLabel, colorCode: asset\.status\.colorCode \}/)
})

test("label page data carries the read-only status name (D8)", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const tool = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")
  assert.match(page, /status: \{\s*name: asset\.status\?\.name \?\? null,\s*label: locale === "th"/)
  assert.match(tool, /status: \{ name\?: string \| null; label: string; colorCode: string \| null \}/)
})
