import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("label print page exposes QR target safety messaging", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8")

  assert.match(source, /isLikelyLocalAssetQrValue/)
  assert.match(source, /qrLocalWarning/)
  assert.match(source, /qrPrintTarget/)
})

test("label print typography uses high-contrast black text for thermal tape", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8")

  assert.match(source, /print-color-adjust: exact/)
  assert.match(source, /text-black/)
  assert.match(source, /secondaryClass[\s\S]+font-black/)
  assert.doesNotMatch(source, /text-slate-600|text-slate-700/)
})

test("label print pages provide tape size placeholder to translated printer guidance", () => {
  const batchPage = readFileSync("src/app/[locale]/(print)/assets/labels/page.tsx", "utf8")
  const singlePage = readFileSync("src/app/[locale]/(print)/assets/[id]/label/page.tsx", "utf8")

  for (const source of [batchPage, singlePage]) {
    assert.match(source, /printerTapeGuidance:\s*t\("labelPrinterTapeGuidance",\s*{\s*tapeSize:\s*"{tapeSize}"\s*}\)/)
    assert.doesNotMatch(source, /printerTapeGuidance:\s*t\("labelPrinterTapeGuidance"\)/)
  }
})

test("label batch tool exposes queue filters and print-order controls", () => {
  const source = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")

  assert.match(source, /queueFilters/)
  assert.match(source, /selectedSort/)
  assert.match(source, /labelPrint\.count/)
  assert.match(source, /printFirstLabel/)
  assert.match(source, /loadMoreQueue/)
})

test("label queue display name de-duplicates asset brand and model text", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const component = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")
  const helper = readFileSync("src/lib/asset-label-display.ts", "utf8")

  assert.match(page, /buildAssetLabelSubtitle/)
  assert.match(component, /buildAssetLabelSubtitle/)
  assert.match(helper, /isRedundantLabelPart/)
  assert.doesNotMatch(page, /\[asset\.name,\s*asset\.brand\?\.name,\s*asset\.model\?\.name\]/)
  assert.doesNotMatch(component, /\[asset\.name,\s*asset\.brand\?\.name,\s*asset\.model\?\.name\]/)
})

test("label queue branch filter stays scoped to the selected company", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const component = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")

  assert.match(page, /select:\s*{\s*id:\s*true,\s*code:\s*true,\s*name:\s*true,\s*companyId:\s*true,\s*company:\s*{\s*select:\s*{\s*code:\s*true\s*}/)
  assert.match(page, /branches:\s*branches\.map\(\(branch\)\s*=>\s*\(\{[\s\S]*label:\s*`\$\{branch\.company\.code\} \/ \$\{branch\.code\} - \$\{branch\.name\}`[\s\S]*companyId:\s*branch\.companyId/)
  assert.match(component, /companyId\?: string/)
  assert.match(component, /filteredBranchOptions/)
  assert.match(component, /branch\.companyId === queueFilters\.companyId/)
  assert.match(component, /updateQueueFilter\("branchId", "all"\)/)
})

test("label queue location filter follows company and branch hierarchy", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const component = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")

  assert.match(page, /select:\s*{\s*id:\s*true,\s*code:\s*true,\s*name:\s*true,\s*branchId:\s*true,\s*branch:\s*{\s*select:\s*{\s*code:\s*true,\s*name:\s*true,\s*companyId:\s*true,\s*company:\s*{\s*select:\s*{\s*code:\s*true\s*}/)
  assert.match(page, /locations:\s*locations\.map\(\(location\)\s*=>\s*\(\{[\s\S]*label:\s*`\$\{location\.branch\.company\.code\} \/ \$\{location\.branch\.code\} \/ \$\{location\.code\} - \$\{location\.name\}`[\s\S]*branchId:\s*location\.branchId[\s\S]*companyId:\s*location\.branch\.companyId/)
  assert.match(component, /branchId\?: string/)
  assert.match(component, /shortLabel\?: string/)
  assert.match(component, /filteredLocationOptions/)
  assert.match(component, /location\.branchId === queueFilters\.branchId/)
  assert.match(component, /location\.companyId === queueFilters\.companyId/)
  assert.match(component, /isLocationInScope/)
  assert.match(component, /locationId:\s*"all"/)
})

test("label queue API consumes operational filters and sort order", () => {
  const source = readFileSync("src/app/api/assets/label-prints/route.ts", "utf8")

  assert.match(source, /normalizeLabelPrintQueueFilters/)
  assert.match(source, /buildAssetLabelPrintQueueOrderBy/)
  assert.match(source, /companyId/)
  assert.match(source, /createdFrom/)
  assert.match(source, /createdTo/)
})

test("label tool messages include queue filter and print ordering labels", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th.assetTools, en.assetTools]) {
    assert.equal(typeof messages.labelQueueFiltersTitle, "string")
    assert.equal(typeof messages.queueFilterCompany, "string")
    assert.equal(typeof messages.queueFilterCreatedFrom, "string")
    assert.equal(typeof messages.selectedSortLabel, "string")
    assert.equal(typeof messages.printFirstLabel, "string")
    assert.equal(typeof messages.labelPrintedBadge, "string")
  }
})

test("label search pre-query guidance stays compact under the input", () => {
  const source = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")

  assert.match(source, /<p className="mt-2 text-xs text-muted-foreground">\{labels\.minChars\}<\/p>/)
  assert.doesNotMatch(source, /<div className="p-6 text-center text-sm text-muted-foreground">\{labels\.minChars\}<\/div>/)
})

test("label queue presents company and branch print scope before location filtering", () => {
  const source = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(source, /queueScopeSummary/)
  assert.match(source, /getQueueScopeSummary/)
  assert.match(source, /addFilteredQueue/)
  assert.match(source, /addFilteredQueueUnavailable/)
  assert.match(page, /queueScopeTitle:\s*t\("queueScopeTitle"\)/)

  for (const messages of [th.assetTools, en.assetTools]) {
    assert.equal(typeof messages.queueScopeTitle, "string")
    assert.equal(typeof messages.queueScopeHelp, "string")
    assert.equal(typeof messages.queueScopeCompany, "string")
    assert.equal(typeof messages.queueScopeBranch, "string")
    assert.equal(typeof messages.queueScopeLocation, "string")
    assert.equal(typeof messages.queueScopeAll, "string")
    assert.equal(typeof messages.addFilteredQueue, "string")
    assert.equal(typeof messages.addFilteredQueueUnavailable, "string")
  }
})
