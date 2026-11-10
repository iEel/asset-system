import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Audit photos plan 1 task 2 (spec 2026-11-10-audit-photos-design §2): a photo taken on the scan page records the
// audit item (round) it was taken for in audit_items.photoEvidence.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const uploadRoute = () => read("src/app/api/assets/[id]/attachments/route.ts")
const scanRoute = () => read("src/app/api/audit-rounds/[id]/scan/route.ts")
const workspace = () => read("src/components/audit/audit-scan-workspace.tsx")
// The link transaction: from the item lookup to the end of the transaction.
const linkStep = (source: string) => {
  const start = source.indexOf("tx.auditItem.findFirst(")
  const end = source.indexOf("isolationLevel: Prisma.TransactionIsolationLevel.Serializable", start)
  assert.ok(start > 0 && end > start, "the link transaction is found")
  return source.slice(start, end)
}

test("the upload links a photo to its audit item only for the same asset and a round that is not cancelled", () => {
  const source = uploadRoute()
  assert.match(source, /formData\.get\("auditItemId"\)/)
  // Scoped to the link step (final review F1): attachment.create also carries `assetId: asset.id`.
  const link = linkStep(source)
  assert.match(link, /where: \{\s*id: auditItemId,\s*assetId: asset\.id,/)
  assert.match(link, /item\.assetId !== asset\.id/)
  assert.match(link, /auditRound: \{ isActive: true/)
  assert.match(link, /status: \{ not: "cancelled" \}/)
  assert.match(link, /item\.auditRound\.status === "cancelled"/)
  // Closed rounds stay linkable: only cancelled is refused.
  assert.doesNotMatch(link, /getAuditRoundReadOnlyError|"completed"|"closed"/)
  assert.match(source, /appendPhotoEvidence\(/)
  assert.match(source, /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/)
  // A link counts only when the new id is in `linked`.
  assert.match(source, /\.linked\.includes\(attachment\.id\)/)
})

test("only a user with audit:edit links a photo; others save it unlinked (final review F10)", () => {
  const source = uploadRoute()
  assert.match(source, /import \{[^}]*\bhasPermission\b[^}]*\} from "@\/lib\/auth-utils"/)
  assert.match(source, /if \(auditItemId && hasPermission\(user, "audit", "edit"\)\) \{/)
  // The upload itself still needs only asset:edit.
  assert.match(source, /requirePermission\(user, "asset", "edit"\)/)
  assert.doesNotMatch(source, /requirePermission\(user, "audit"/)
})

test("a link refused by the cap or the length guard still bumps the item's updatedAt (final review F8)", () => {
  const link = linkStep(uploadRoute())
  const refusedAt = link.indexOf("if (!evidence.linked.includes(attachment.id)) {")
  assert.ok(refusedAt > 0, "the refused-link branch is found")
  const refused = link.slice(refusedAt)
  const refusedBlock = refused.slice(0, refused.indexOf("return false") + "return false".length)
  assert.match(refusedBlock, /await tx\.auditItem\.update\(\{ where: \{ id: item\.id \}, data: \{ updatedAt: new Date\(\) \} \}\)/)
  // An item of another asset, an inactive or a cancelled round returns before any write.
  const guardAt = link.indexOf("if (!item || item.assetId !== asset.id")
  assert.ok(guardAt > 0 && guardAt < link.indexOf("tx.auditItem.update("), "the item guard comes before any write")
})

test("a refused link never refuses the photo", () => {
  const source = uploadRoute()
  assert.match(source, /NextResponse\.json\(\{ \.\.\.attachment, auditLinked \}, \{ status: 201 \}\)/)
  assert.match(source, /let auditLinked = false/)
  // The link step runs after the photo is saved.
  const created = source.indexOf("prisma.attachment.create(")
  const linkStep = source.indexOf("appendPhotoEvidence(")
  assert.ok(created > 0 && linkStep > created, "the link step comes after prisma.attachment.create")
  // No error response is keyed on the audit item: a bad item id only gives auditLinked: false.
  for (const line of source.split("\n")) {
    if (/NextResponse\.json\(\{ error/.test(line)) assert.doesNotMatch(line, /audit/i, line)
  }
  assert.doesNotMatch(source, /auditItemId[^\n]*\n[^\n]*return NextResponse\.json\(\{ error/)
  // Any failure of the link step is caught.
  assert.match(source, /\} catch \{\n\s+auditLinked = false\n/)
})

test("an out-of-scope find writes its evidence ids into the new item's photoEvidence", () => {
  const source = scanRoute()
  assert.match(source, /import \{ appendPhotoEvidence \} from "@\/lib\/audit-round-photos-rules"/)
  const createAt = source.indexOf("tx.auditItem.create(")
  assert.ok(createAt > 0)
  const createBlock = source.slice(createAt, source.indexOf("})", source.indexOf("remark: input.remark", createAt)))
  assert.match(createBlock, /photoEvidence: appendPhotoEvidence\(null, evidenceAttachmentIds\)\.value/)
  // The recorded-find path appends to the existing item's photoEvidence.
  assert.match(source, /appendPhotoEvidence\(item\.photoEvidence, evidenceAttachmentIds\)/)
  assert.match(source, /photoEvidence: rescanEvidence\.value/)
})

test("the scan page links each photo to the item the /scan response returned", () => {
  const source = workspace()
  assert.match(source, /uploadPhotoFile = useCallback\(async \(assetId: string, file: File, label: string, auditItemId\?: string\)/)
  assert.match(source, /if \(auditItemId\) body\.append\("auditItemId", auditItemId\)/)
  assert.match(source, /uploadPhotos\(row\.assetId, submission\.photos, result\.item\.id\)/)
  // sendQueue: the id from that send's own /scan response, never from the queued payload.
  assert.match(source, /const sentItemId = typeof result\?\.item\?\.id === "string" \? result\.item\.id : undefined/)
  assert.match(source, /photo\.label, sentItemId\)/)
  assert.doesNotMatch(source, /queued\.auditItemId|queued\.itemId/)
  // The retry keeps auditItemId.
  assert.match(source, /useState<\{ assetId: string; auditItemId: string \| null; photos: QueuedAuditPhoto\[\] \} \| null>/)
  assert.match(source, /setPhotoRetry\(\{ assetId, auditItemId: auditItemId \?\? null, photos \}\)/)
  assert.match(source, /uploadPhotos\(photoRetry\.assetId, photoRetry\.photos, photoRetry\.auditItemId \?\? undefined\)/)
  // Out-of-scope uploads send no item id: the scan route links them.
  assert.match(source, /uploadPhotoFile\(asset\.id, photo\.file, photo\.label\)\)\.id/)
})
