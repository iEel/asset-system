import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { rbacRoutePermissionMatrix } from "../src/lib/rbac-route-matrix.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const ROUTE = "src/app/api/assets/[id]/history/export/route.ts"

test("the history rules are pure and count days with the waiting work's Bangkok helper (node --test imports them)", () => {
  const source = read("src/lib/asset-history-rules.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.match(source, /import \{[^}]*\bbangkokDayDiff\b[^}]*\} from "\.\/waiting-work-rules\.ts"/)
  assert.match(source, /from "\.\/asset-movement-labels\.ts"/)
  // tests/asset-movement-labels.test.ts counts every `movementType: "…"` literal in src as a written type (47).
  assert.doesNotMatch(source, /movementType:\s*"/)
})

test("one history: the movements as its spine, the scans that wrote no movement, the repair records merged in; reads in rounds, never a write (spec §7.6)", () => {
  const source = read("src/lib/asset-history.ts")
  assert.match(source, /export async function getAssetHistory\(assetId: string, locale: string, options\?: \{ limit\?: number \}\): Promise<AssetHistory>/)
  assert.match(source, /export async function getAssetHistoryCounts\(assetId: string\): Promise<AssetHistoryCounts>/)
  assert.match(source, /export async function getLatestAssetHistory\(assetId: string, locale: string, take: number\): Promise<AssetHistoryEvent\[\]>/)
  // The overview's latest events come from the history's own loader: the same sources, merge rules and order (R50).
  assert.ok(source.includes("return (await loadAssetHistory(assetId, locale, take, false)).events"), "getLatestAssetHistory delegates to the shared loader")
  assert.match(source, /prisma\.assetMovement\.findMany\(\{\n\s*where: \{ assetId \},\n\s*orderBy: \[\{ performedAt: "desc" \}, \{ id: "desc" \}\],\n\s*take: limit,/)
  assert.match(source, /prisma\.assetMovement\.groupBy\(\{\n\s*by: \["movementType"\],\n\s*where: \{ assetId \},/)
  assert.match(source, /prisma\.auditItem\.findMany\(\{\n\s*where: \{ assetId, auditStatus: \{ not: "pending" \} \},/)
  assert.match(source, /where: \{ assetId, referenceType: \{ in: \["audit_finding", "audit_scan"\] \} \}/)
  for (const call of [
    "auditItemsWithoutMovement(",
    "countAssetHistory(",
    "orderAssetHistory(",
    "assetHistoryMovementDetail(",
    "assetHistoryCategory(",
    "assetMovementLabelKey(",
    "assetMovementReferenceLookup(",
    "resolveAssetMovementDocuments(movements)",
    "buildAssetMovementDocumentHref(locale, ",
    "getMovementValueLookup(",
    "getTranslations({ locale })",
  ]) assert.ok(source.includes(call), call)
  // The documents' numbers come from the shared reader (R13); this file reads only what the detail column needs.
  assert.match(source, /^import \{ resolveAssetMovementDocuments \} from "@\/lib\/asset-movement-documents"$/m)
  assert.doesNotMatch(source, /prisma\.(?:assetTransfer|disposalRequest|auditFinding)\./)
  assert.doesNotMatch(source, /documentNo: true|repairNo: true/)
  // A repair record is read through its movement's reference only; a component's events are its movements.
  assert.match(source, /prisma\.maintenanceTicket\.findMany\(\{ where: \{ id: \{ in: /)
  assert.doesNotMatch(source, /prisma\.assetComponent\b/)
  assert.doesNotMatch(source, /maintenanceTicket\.findMany\(\{\s*where: \{ assetId/)
  assert.equal(source.match(/await Promise\.all\(\[/g)?.length, 3, "the audit inputs, the movements, then the documents and the people")
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(/)
  assert.doesNotMatch(source, /movementType:\s*"/)
  assert.match(read("src/lib/movement-labels.ts"), /export async function getMovementValueLookup\(ids: string\[\]\): Promise<Map<string, string>>/)
})

test("the history's Excel: every event of one asset, with asset:view, in the page's language (spec §7.6)", () => {
  const route = read(ROUTE)
  assert.match(route, /const user = await requireAuth\(\)\n\s*requirePermission\(user, "asset", "view"\)/)
  assert.match(route, /const locale = request\.nextUrl\.searchParams\.get\("locale"\) === "en" \? "en" : "th"/)
  assert.match(route, /prisma\.asset\.findFirst\(\{ where: \{ id, isActive: true \}, select: \{ assetTag: true \} \}\)/)
  assert.match(route, /return NextResponse\.json\(\{ error: "Asset not found" \}, \{ status: 404 \}\)/)
  for (const call of [
    "getAssetHistory(id, locale, { limit: ASSET_HISTORY_EXPORT_LIMIT })",
    "getTranslations({ locale })",
    "createWorkbook()",
    "workbook.addWorksheet(t(\"asset.history.exportSheet\"))",
    "ASSET_HISTORY_EXCEL_COLUMNS.map(",
    "assetHistoryExcelRow(event, t)",
    // A document's code only for a kind the downloader may open, as the page shows it (R52).
    "hasPermission(",
    "ASSET_MOVEMENT_DOCUMENT_PERMISSION[",
    "styleWorksheetHeader(worksheet)",
    "workbookResponse(buffer, buildAssetHistoryExportFilename(asset.assetTag, new Date()))",
    "return errorResponse(error)",
  ]) assert.ok(route.includes(call), call)
  assert.deepEqual(rbacRoutePermissionMatrix.find((entry) => entry.filePath === ROUTE)?.checks, [{ module: "asset", action: "view" }])
})
