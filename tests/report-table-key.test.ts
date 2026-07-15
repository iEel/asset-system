import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const reportsPage = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
const overviewView = readFileSync("src/components/reports/reports-overview-view.tsx", "utf8")
const accountingView = readFileSync("src/components/reports/reports-accounting-view.tsx", "utf8")
const operationsView = readFileSync("src/components/reports/reports-operations-view.tsx", "utf8")

test("report table rows use stable row keys so duplicate labels are safe", () => {
  assert.match(overviewView, /rows\.map\(\(row\) =>/)
  assert.match(overviewView, /key=\{row\.key\}/)
  assert.doesNotMatch(overviewView, /key=\{row\.label\}/)
})

test("branch report labels include company code to disambiguate repeated branch names", () => {
  assert.match(
    reportsPage,
    /prisma\.branch\.findMany\(\{ where: \{ id: \{ in: byBranch\.map\(\(item\) => item\.branchId\) \} \}, select: \{ id: true, code: true, name: true, company: \{ select: \{ code: true \} \} \} \}\)/
  )
  assert.match(
    reportsPage,
    /const branchMap = new Map\(branches\.map\(\(branch\) => \[branch\.id, `\$\{branch\.company\.code\} \/ \$\{branch\.code\} - \$\{branch\.name\}`\]\)\)/
  )
})

test("reports page exposes cross-scope asset visibility and export shortcuts", () => {
  assert.match(reportsPage, /buildAssetCrossScopeSummary\(buildAssetWhere\(crossScopeFilters\), 8\)/)
  assert.match(reportsPage, /crossScopeCards/)
  assert.match(reportsPage, /crossScope: "all"/)
  assert.match(reportsPage, /exportCrossScopeAssets/)
  assert.match(operationsView, /crossScope\.cards/)
  assert.match(operationsView, /CrossScopePreviewTable/)
})

test("adaptive report rows use stable database identifiers", () => {
  assert.match(overviewView, /rowKey=\{\(asset\) => asset\.id\}/)
  assert.equal(accountingView.match(/rowKey=\{\(asset\) => asset\.id\}/g)?.length, 2)
  assert.match(operationsView, /rowKey=\{\(asset\) => asset\.id\}/)
  assert.doesNotMatch(overviewView + accountingView + operationsView, /rowKey=\{\(.*\) => .*\.label\}/)
})

test("frequent repair rows retain stable keys and exact asset drilldowns", () => {
  assert.match(reportsPage, /key: item\.assetId,[\s\S]*href: `\/\$\{locale\}\/assets\/\$\{item\.assetId\}`/)
  assert.match(operationsView, /row\.href/)
  assert.match(operationsView, /min-h-11/)
})
