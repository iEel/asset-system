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
  assert.match(source, /export async function getAssetHistory\(assetId: string, locale: string, options\?: \{ limit\?: number; filesHref\?: string \}\): Promise<AssetHistory>/)
  assert.match(source, /export async function getAssetHistoryCounts\(assetId: string\): Promise<AssetHistoryCounts>/)
  assert.match(source, /export async function getLatestAssetHistory\(assetId: string, locale: string, take: number\): Promise<AssetHistoryEvent\[\]>/)
  // The overview's latest events come from the history's own loader: the same sources, merge rules and order (R50).
  assert.ok(source.includes("return (await loadAssetHistory(assetId, locale, take, false, null)).events"), "getLatestAssetHistory delegates to the shared loader, without the photos")
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

test("the history lookup names a category, a brand and a model, so a field correction never shows an id (group 4 plan 2, P2-R5)", () => {
  const source = read("src/lib/movement-labels.ts")
  assert.match(source, /prisma\.assetCategory\.findMany\(\{\n\s*where: \{ id: \{ in: ids \} \},\n\s*select: \{ id: true, code: true, name: true \},/)
  assert.match(source, /prisma\.assetBrand\.findMany\(\{\n\s*where: \{ id: \{ in: ids \} \},\n\s*select: \{ id: true, name: true \},/)
  assert.match(source, /prisma\.assetModel\.findMany\(\{\n\s*where: \{ id: \{ in: ids \} \},\n\s*select: \{ id: true, name: true \},/)
  assert.ok(source.includes("for (const item of categories) lookup.set(item.id.toLowerCase(), `${item.code} - ${item.name}`)"))
  assert.ok(source.includes("for (const item of brands) lookup.set(item.id.toLowerCase(), item.name)"))
  assert.ok(source.includes("for (const item of models) lookup.set(item.id.toLowerCase(), item.name)"))
  // The history labels every field a snapshot may carry, the 14 asset columns of a field correction among them.
  const history = read("src/lib/asset-history.ts")
  for (const field of ["name", "serialNumber", "category", "brand", "model", "company", "ownershipType", "purchaseDate", "purchasePrice", "warrantyStart", "warrantyEnd", "poNumber", "invoiceNumber"]) {
    assert.ok(history.includes(`  "${field}",\n`), field)
  }
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

test("an audit event links to its round's photos: one photo read for the asset, only for a caller that gives the files tab's link (audit photos spec §6)", () => {
  const source = read("src/lib/asset-history.ts")
  assert.match(source, /^import \{ loadAuditRoundPhotos, type AuditRoundPhotoDb \} from "@\/lib\/audit-round-photos-data"$/m)
  assert.equal(source.match(/loadAuditRoundPhotos\(/g)?.length, 1, "one call")
  assert.ok(source.includes("filesHref && auditItems.length > 0 ? loadAuditRoundPhotos(prisma as unknown as AuditRoundPhotoDb, [assetId]) : []"))
  assert.ok(source.includes("auditPhotos: assetHistoryAuditPhotos(photoRoundIds, item.auditRound, filesHref),"))
  assert.equal(source.match(/auditPhotos: null,/g)?.length, 1, "a movement event never carries photos")
  assert.ok(source.includes("const { events, groups, auditItems } = await loadAssetHistory(assetId, locale, limit, true, options?.filesHref ?? null)"))
  // The page gives the files tab's own link, with the same returnTo the files tab keeps.
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.ok(page.includes('getAssetHistory(asset.id, locale, { filesHref: buildAssetDetailViewHref(locale, asset.id, "files", returnToHref) })'))
})
