import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Audit photos plan 2 task 3 (spec 2026-11-10-audit-photos-design §5): the round dialog's list, one item's photos for
// one round, read only when the dialog opens.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const ROUTE = "src/app/api/audit-rounds/[id]/items/[itemId]/photos/route.ts"

test("the item photos route needs audit:view and asset:view and reads nothing before both", () => {
  const source = read(ROUTE)
  assert.match(source, /export async function GET\(/)
  assert.doesNotMatch(source, /export async function (POST|PUT|PATCH|DELETE)\(/)
  const auth = source.indexOf("await requireAuth()")
  const auditView = source.indexOf('requirePermission(user, "audit", "view")')
  const assetView = source.indexOf('requirePermission(user, "asset", "view")')
  const firstRead = source.indexOf("prisma.auditItem.findFirst(")
  assert.ok(auth > 0 && auditView > auth && assetView > auth, "both permissions are checked")
  assert.ok(firstRead > auditView && firstRead > assetView, "the item is read after both checks")
})

test("the item must be in the round, else 404; the photos are this round's only, newest first from the loader", () => {
  const source = read(ROUTE)
  assert.match(source, /where: \{ id: itemId, auditRoundId: id, auditRound: \{ isActive: true \} \}/)
  assert.match(source, /if \(!item\) return NextResponse\.json\(\{ error: "Audit item not found" \}, \{ status: 404 \}\)/)
  assert.match(source, /loadAuditRoundPhotos\(prisma as unknown as AuditRoundPhotoDb, \[item\.assetId\]\)/)
  assert.match(source, /\.filter\(\(photo\) => photo\.auditRoundId === id\)/)
  assert.match(source, /uploadedAtIso: photo\.uploadedAt\.toISOString\(\)/)
  assert.match(source, /NextResponse\.json\(\{ assetTag: item\.asset\.assetTag, auditNo: item\.auditRound\.auditNo, photos \}\)/)
  assert.match(source, /return errorResponse\(error\)/)
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(|\$executeRaw|\$queryRaw/)
})
