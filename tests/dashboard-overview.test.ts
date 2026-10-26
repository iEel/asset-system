import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the overview counts with the register's own filters, in one round of reads, and never writes (spec §6.4-6.6)", () => {
  const source = read("src/lib/dashboard-overview.ts")
  assert.match(source, /export async function getDashboardOverview\(\{ companyId, now \}: \{ companyId: string \| null; now: Date \}\): Promise<DashboardOverview>/)
  for (const count of ["total", "idle180", "custodianAssigned", "responsibilityMissing"]) {
    assert.match(source, new RegExp(`buildAssetWhere\\(parseAssetListParams\\(dashboardRegisterParams\\("${count}", companyId\\)\\)\\)`), count)
  }
  assert.match(source, /prisma\.asset\.groupBy\(\{\s*by: \["statusId"\],\s*where: totalWhere,/)
  // The share's denominator is the very fragment custodianState=assigned uses (Task 3), with the same company.
  assert.match(source, /import \{ assetNotClosedStatusWhere \} from "@\/lib\/asset-custodian-state-filter"/)
  assert.match(source, /\{ AND: \[totalWhere, assetNotClosedStatusWhere\] \}/)
  assert.doesNotMatch(source, /CLOSED_AUDIT_STATUS_NAMES/)
  assert.match(source, /countDashboardAssetCrossScope\(companyId\)/)
  assert.match(source, /status: auditRoundOperationalWhere/)
  assert.match(source, /by: \["auditRoundId", "expectedBranchId", "auditStatus"\]/)
  assert.match(source, /where: withAuditRoundOwnItems\(\{ auditRound: \{ isActive: true, status: auditRoundOperationalWhere \}, \.\.\.\(companyId \? \{ expectedCompanyId: companyId \} : \{\}\) \}\),/)
  assert.match(source, /buildDashboardAudit\(\{/)
  assert.match(source, /today: startOfBangkokDay\(now\)/)
  assert.match(source, /narrowedToCompany: companyId !== null/)
  assert.match(source, /buildDashboardStatusRows\(/)
  assert.equal(source.match(/await Promise\.all\(\[/g)?.length, 1, "one round of parallel reads")
  assert.doesNotMatch(source, /await prisma\.|\.(create|update|upsert|delete)(Many)?\(|systemLog|getNotificationCenter/)
})

test("the overview rules are pure and count days with the waiting work's Bangkok helper, as every dashboard part does", () => {
  const source = read("src/lib/dashboard-overview-rules.ts")
  assert.doesNotMatch(source, /from "@\//, "node --test imports this file")
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.match(source, /import \{[^}]*\bbangkokDayDiff\b[^}]*\} from "\.\/waiting-work-rules\.ts"/)
  assert.doesNotMatch(source, /toLocalDateInputValue|86_?400_?000/, "no private day helper")
})

test("the cross-scope count is the register's crossScope=all rule in SQL, narrowed by company (spec §6.6)", () => {
  const source = read("src/lib/asset-cross-scope.ts")
  const count = source.slice(source.indexOf("export async function countDashboardAssetCrossScope("))
  assert.match(count, /^export async function countDashboardAssetCrossScope\(companyId: string \| null\): Promise<number>/)
  assert.match(count, /WHERE a\.\[isActive\] = 1/)
  assert.match(count, /\$\{companyId \? Prisma\.sql`AND a\.\[companyId\] = \$\{companyId\}` : Prisma\.empty\}/)
  assert.match(count, /\(e\.\[id\] IS NOT NULL AND \(e\.\[companyId\] <> a\.\[companyId\] OR e\.\[branchId\] <> a\.\[branchId\]\)\)/)
  assert.match(count, /\(hl\.\[id\] IS NOT NULL AND hl\.\[branchId\] <> a\.\[branchId\]\)/)
  assert.match(count, /OR cl\.\[branchId\] <> a\.\[branchId\]/)
})

test("the recent feed reads asset movements only, without the mirror rows (spec §6.8)", () => {
  const source = read("src/lib/dashboard-recent.ts")
  assert.match(source, /export async function getRecentAssetEvents\(take: number\): Promise<RecentAssetEvent\[\]>/)
  assert.match(source, /prisma\.assetMovement\.findMany\(\{/)
  assert.match(source, /movementType: \{ notIn: \[\.\.\.ASSET_MOVEMENT_MIRROR_TYPES\] \}/)
  assert.match(source, /asset: \{ isActive: true \}/)
  assert.match(source, /orderBy: \[\{ performedAt: "desc" \}, \{ id: "desc" \}\]/)
  assert.match(source, /const documentOf = await resolveAssetMovementDocuments\(movements\)/)
  assert.doesNotMatch(source, /prisma\.(?:assetCheckout|assetCheckin|assetTransfer|maintenanceTicket|disposalRequest|auditFinding|auditItem)\./)
  assert.doesNotMatch(source, /systemLog|\.(create|update|upsert|delete)(Many)?\(/)
})

test("a movement's documents are read once per kind present, never per row (group 1 asset detail task 3)", () => {
  const source = read("src/lib/asset-movement-documents.ts")
  assert.match(source, /export async function resolveAssetMovementDocuments\(references: readonly AssetMovementReference\[\]\): Promise<\(reference: AssetMovementReference\) => AssetMovementDocument \| null>/)
  assert.match(source, /assetMovementReferenceLookup\(/)
  for (const model of ["assetCheckout", "assetCheckin", "assetTransfer", "maintenanceTicket", "disposalRequest", "auditFinding", "auditItem"]) {
    assert.equal(source.match(new RegExp(`prisma\\.${model}\\.findMany\\(`, "g"))?.length, 1, model)
  }
  assert.equal(source.match(/await Promise\.all\(\[/g)?.length, 1, "one round of reads")
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(/)
  assert.match(read("src/lib/asset-movement-labels.ts"), /export type AssetMovementReference = \{ referenceType: string \| null; referenceId: string \| null \}/)
})
