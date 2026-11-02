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

// Group 4 plan 6 Task 4 (P6-R11): every row of the labels page is the queue's row, which shows the print state, not the
// asset state; the incoming ids come through the same lookup, so the page no longer reads or maps a status.
test("label page rows are queue rows from the lookup and carry no asset state (group 4 plan 6 P6-R11)", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  assert.match(page, /lookupLabelPrintRows\(prisma as unknown as LabelQueueDb, preselectedIds, queueLocale\)/)
  for (const path of ["src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "src/components/assets/asset-label-batch-tool.tsx", "src/components/assets/asset-label-queue.tsx", "src/components/assets/asset-label-print-list.tsx"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /\bstatus: \{|getAssetStateTone|colorCode/, path)
  }
})
