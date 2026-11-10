import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Audit photos plan 2 task 3 (spec 2026-11-10-audit-photos-design §5): the round page's photo column shows this round's
// newest photo as a button that opens the item's photos for the round; "ไม่มีรูป" stays text; a pending row shows its
// register photo, plain and labelled, or "—"; the evidence line counts by the same rule.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const DATA = "src/lib/audit-round-page-data.ts"
const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx"
const DIALOG = "src/components/audit/audit-round-photos-dialog.tsx"
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`))

test("the page data reads this round's photos through the one loader, and the register photos once for the page's pending rows", () => {
  const data = read(DATA)
  assert.match(data, /loadAuditRoundPhotos\(prisma as unknown as AuditRoundPhotoDb, evidenceAssetIds, \{ uploadedFrom: round\.startDate \}\)/)
  assert.match(data, /\.filter\(\(photo\) => photo\.auditRoundId === roundId\)/)
  assert.doesNotMatch(data, /uploadedAt: \{ gte: round\.startDate \}/)
  assert.doesNotMatch(data, /prisma\.attachment\.findMany/)
  assert.equal(data.match(/readAuditScanPhotos\(/g)?.length, 1)
  assert.match(data, /const pendingAssetsOnPage = items\.filter\(\(item\) => item\.auditStatus === "pending"\)\.map\(\(item\) => \(\{ id: item\.asset\.id, modelId: item\.asset\.modelId \}\)\)/)
  assert.match(data, /readAuditScanPhotos\(prisma as unknown as AssetPhotoPreviewDb, pendingAssetsOnPage, auditScanPhotoAccess\(user\)\)/)
  assert.match(data, /modelId: true,/)
  // The checklist and hasPhoto read the same names: this round's photos.
  assert.match(data, /attachmentNamesByAssetId,\n\s+checklistByCategoryId,/)
  assert.match(data, /hasPhoto: item\.auditStatus === "pending" \? null : attachmentNamesByAssetId\.has\(item\.assetId\),/)
  assert.match(data, /roundPhoto: item\.auditStatus === "pending" \? null : \(roundPhotoByAssetId\.get\(item\.assetId\) \?\? null\),/)
  assert.match(data, /registerPhoto: item\.auditStatus === "pending" \? \(registerPhotos\.get\(item\.asset\.id\) \?\? null\) : null,/)
})

test("the page: the round photo button on a checked row with photos, ไม่มีรูป as text, the register thumbnail or — on a pending row, on both layouts", () => {
  const page = read(PAGE)
  assert.match(page, /import \{ AuditRegisterPhotoThumb, AuditRoundPhotosButton \} from "@\/components\/audit\/audit-round-photos-dialog"/)
  assert.match(page, /photo: item\.roundPhoto \? \(/)
  assert.match(page, /<AuditRoundPhotosButton\s+roundId=\{round\.id\}\s+itemId=\{item\.id\}\s+assetId=\{item\.asset\.id\}\s+assetTag=\{item\.asset\.assetTag\}\s+auditNo=\{round\.auditNo\}\s+photo=\{item\.roundPhoto\}\s*\/>/)
  assert.match(page, /\) : item\.hasPhoto === false \? \(\n\s+t\("photoMissing"\)\n\s+\) : item\.registerPhoto \? \(\n\s+<AuditRegisterPhotoThumb photo=\{item\.registerPhoto\} \/>\n\s+\) : null,/)
  // "มีรูป" is no longer the cell's text: the button carries it as its name.
  assert.doesNotMatch(page, /t\("photoAttached"\)/)
  // Both layouts draw the one value: the phone card's KeyValueList and the table cell (— when null).
  assert.match(page, /\{ key: "photo", label: t\("photoColumn"\), value: item\.photo \},/)
  assert.match(page, /<DataTableCell className="whitespace-nowrap text-muted-foreground">\{item\.photo \?\? <Nil \/>\}<\/DataTableCell>/)
  // The evidence line is unchanged and reads the same rule (the data's names).
  assert.match(page, /t\("evidenceLine", \{ withPhoto: formatCount\(data\.evidence\.withPhoto\), checked: formatCount\(data\.evidence\.checked\) \}\)/)
})

test("the row button: a lazy fixed-size thumbnail, +n over one, named with มีรูป and the count; it loads the list on open, not on render", () => {
  const source = read(DIALOG)
  assert.match(source, /^"use client"/)
  assert.match(source, /export function AuditRoundPhotosButton\(/)
  assert.match(source, /aria-label=\{t\("roundPhotoCount", \{ label: t\("photoAttached"\), count: photo\.count \}\)\}/)
  assert.match(source, /data-no-row-click/)
  assert.match(source, /src=\{thumbnailUrl\(photo\.attachmentId\)\}/)
  assert.match(source, /loading="lazy"/)
  assert.match(source, /decoding="async"/)
  assert.match(source, /width=\{rowThumbSize\}\s+height=\{rowThumbSize\}/)
  assert.match(source, /\{photo\.count > 1 \? \(/)
  assert.match(source, /\+\{formatCount\(photo\.count - 1\)\}/)
  // On open only: the opener calls load(); no effect fetches on render.
  assert.doesNotMatch(source, /useEffect/)
  assert.match(source, /function openDialog\(\) \{\n\s+setOpen\(true\)\n\s+void load\(\)/)
  assert.match(source, /fetch\(`\/api\/audit-rounds\/\$\{roundId\}\/items\/\$\{itemId\}\/photos`/)
  // The dialogs' portal events never reach the clickable table row (it would open the asset).
  assert.match(source, /<span hidden onClick=\{stopPortalEvent\} onKeyDown=\{stopPortalEvent\}>\s*<Dialog open=\{open\}/)
  assert.match(source, /if \(!event\.currentTarget\.contains\(event\.target as Node\)\) event\.stopPropagation\(\)/)
})

test("the dialog: card-size tiles that open the shared preview, the files-tab link with photoRound, an empty state and a retry", () => {
  const source = read(DIALOG)
  assert.match(source, /t\("roundPhotosTitle", \{ assetTag, auditNo \}\)/)
  assert.match(source, /src=\{thumbnailUrl\(entry\.id, "card"\)\}/)
  assert.match(source, /import \{ AttachmentPreviewDialog \} from "@\/components\/ui\/attachment-preview-dialog"/)
  assert.match(source, /<AttachmentPreviewDialog\b/)
  assert.match(source, /src=\{preview \? `\/api\/attachments\/\$\{preview\.id\}\?inline=1` : ""\}/)
  assert.match(source, /href=\{`\/\$\{locale\}\/assets\/\$\{assetId\}\?view=files&photoRound=\$\{encodeURIComponent\(auditNo\)\}`\}/)
  assert.match(source, /t\("roundPhotosViewInFiles"\)/)
  assert.match(source, /t\("roundPhotosEmpty"\)/)
  assert.match(source, /t\("roundPhotosLoadFailed"\)/)
  assert.match(source, /onClick=\{\(\) => void load\(\)\}/)
  assert.match(source, /tCommon\("tryAgain"\)/)
})

test("the pending row's register photo: plain (not a button), decorative, lazy, labelled รูปทะเบียน or รูปประจำรุ่น, text on error", () => {
  const source = read(DIALOG)
  const start = source.indexOf("export function AuditRegisterPhotoThumb(")
  assert.ok(start > 0)
  const thumb = source.slice(start)
  assert.doesNotMatch(thumb, /<button|onClick/)
  assert.match(thumb, /alt=""/)
  assert.match(thumb, /loading="lazy"/)
  assert.match(thumb, /width=\{rowThumbSize\}\s+height=\{rowThumbSize\}/)
  assert.match(thumb, /photo\.fromModel \? tAsset\("modelPhoto"\) : t\("registerPhoto"\)/)
  assert.match(thumb, /onError=\{\(\) => setFailedId\(photo\.attachmentId\)\}/)
})

test("the words: รูปทะเบียน, the dialog title, ดูในแท็บไฟล์ and the count, in Thai and English", () => {
  const th = messages("th").auditRound
  const en = messages("en").auditRound
  assert.equal(th.registerPhoto, "รูปทะเบียน")
  assert.equal(th.roundPhotosTitle, "รูปของ {assetTag} ในรอบ {auditNo}")
  assert.equal(th.roundPhotosViewInFiles, "ดูในแท็บไฟล์")
  assert.equal(th.roundPhotoCount, "{label} {count} รูป")
  assert.equal(messages("th").asset.modelPhoto, "รูปประจำรุ่น")
  for (const key of ["registerPhoto", "roundPhotosTitle", "roundPhotosViewInFiles", "roundPhotoCount", "roundPhotosEmpty", "roundPhotosLoadFailed"]) {
    assert.equal(typeof th[key], "string", key)
    assert.equal(typeof en[key], "string", key)
  }
})
