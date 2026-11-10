import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The scan page draws the photo (audit photos spec §3, plan 1 task 5): a card in the check form and on the out-of-scope
// card, a lazy 48px thumb at the start of the room rows, the search rows, the component rows and the installed-in line,
// "รูปประจำรุ่น" for a model photo, the shared empty frame (ยังไม่มีรูป) on the card when the viewer may see photos and the
// asset has none (fix 1, F1: own → model → empty frame), no frame at all for a viewer who may not, and decorative row
// thumbs (fix 1, F2: the rows already name the asset). Reads strip \r.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PHOTO = "src/components/audit/audit-scan-photo.tsx"

test("the check form and the out-of-scope card show the card photo, or the shared empty frame", () => {
  const photo = read(PHOTO)
  assert.match(photo, /export function AuditScanPhotoCard\(\{ photo, alt, emptyFrame \}: \{ photo: AuditScanPhoto \| null; alt: string; emptyFrame: boolean \}\)/)
  assert.match(photo, /import type \{ AuditScanPhoto \} from/, "the type only: audit-scan-photos.ts is server-only")
  const card = photo.slice(photo.indexOf("export function AuditScanPhotoCard("), photo.indexOf("const thumbBox"))
  // A model photo's alt (the preview's title, the open button's name) names it as the model's (final review F6).
  assert.match(card, /<AssetPhotoFrame attachmentId=\{photo\.attachmentId\} alt=\{photo\.fromModel \? `\$\{t\("modelPhoto"\)\} \$\{alt\}` : alt\} canUpload=\{false\} \/>/)
  assert.match(card, /if \(!photo && !emptyFrame\) return null/)
  assert.match(card, /data-audit-scan-photo-card data-empty="true"[\s\S]*?<AssetPhotoFrame attachmentId=\{null\} alt=\{alt\} canUpload=\{false\} \/>/, "the empty frame")
  // The shared frame's empty state: ยังไม่มีรูป, and no upload link while canUpload is false.
  const frame = read("src/components/assets/asset-photo-frame.tsx")
  assert.match(frame, /const upload = canUpload && uploadHref \?/)
  assert.match(frame, /title=\{t\("photoFrame\.emptyTitle"\)\}/)
  assert.equal(JSON.parse(read("messages/th.json")).asset.photoFrame.emptyTitle, "ยังไม่มีรูป")

  const form = read("src/components/audit/audit-scan-check-form.tsx")
  assert.match(form, /const targetPhoto = target\.kind === "item" \? target\.item\.photo : target\.asset\.photo/)
  assert.match(form, /<AuditScanPhotoCard photo=\{targetPhoto\} alt=\{targetPhotoAlt\} emptyFrame=\{canSeePhotos\} \/>/)
  const body = form.slice(form.indexOf("data-audit-check-body"))
  assert.ok(body.indexOf("<AuditScanPhotoCard") >= 0 && body.indexOf("<AuditScanPhotoCard") < body.indexOf("{statusLine}"), "the card sits at the top of the form")

  const lookup = read("src/components/audit/audit-scan-lookup-card.tsx")
  const outOfScope = lookup.slice(lookup.indexOf('state.status === "out_of_scope"'), lookup.indexOf('state.status === "candidates"'))
  assert.match(outOfScope, /<AuditScanPhotoCard photo=\{state\.asset\.photo\} alt=\{`\$\{state\.asset\.assetTag\} \$\{state\.asset\.title\}`\} emptyFrame=\{canSeePhotos\} \/>/)
  const candidates = lookup.slice(lookup.indexOf('state.status === "candidates"'))
  assert.doesNotMatch(candidates, /AuditScanPhoto/, "candidates get no photo (spec §3)")
})

test("room rows, search rows and component rows show the lazy thumb, decorative", () => {
  const photo = read(PHOTO)
  assert.match(photo, /export function AuditScanPhotoThumb\(\{ photo, emptyFrame \}: \{ photo: AuditScanPhoto \| null; emptyFrame: boolean \}\)/)
  const thumb = photo.slice(photo.indexOf("export function AuditScanPhotoThumb("))
  const img = thumb.slice(thumb.indexOf("<img"))
  assert.match(img, /src=\{thumbnailUrl\(photo\.attachmentId\)\}/, "the thumbnail route's 96px size")
  assert.match(img, /loading="lazy"/)
  assert.match(img, /decoding="async"/)
  assert.match(img, /width=\{48\}/)
  assert.match(img, /height=\{48\}/)
  assert.match(img, /alt=""/, "decorative: the row names the asset")
  assert.match(img, /onError=\{/, "an error falls back to the neutral square")
  assert.match(thumb, /if \(!photo && !emptyFrame\) return null/)
  assert.match(thumb, /data-empty="true" aria-hidden="true"/)

  const room = read("src/components/audit/audit-scan-room-list.tsx")
  const row = room.slice(room.indexOf("data-audit-scan-row\n"), room.indexOf("</button>", room.indexOf("data-audit-scan-row\n")))
  assert.match(row, /<AuditScanPhotoThumb photo=\{item\.photo\} emptyFrame=\{canSeePhotos\} \/>\s*<span className="min-w-0 flex-1">/, "the thumb at the row's start")

  const search = read("src/components/audit/audit-scan-search.tsx")
  assert.match(search, /<AuditScanPhotoThumb photo=\{match\.item\.photo\} emptyFrame=\{canSeePhotos\} \/>\s*<span className="min-w-0 flex-1">/)

  const panels = read("src/components/audit/audit-scan-panels.tsx")
  assert.match(panels, /data-audit-component-row[^>]*>\s*<AuditScanPhotoThumb photo=\{component\.photo\} emptyFrame=\{emptyFrame\} \/>/)

  const form = read("src/components/audit/audit-scan-check-form.tsx")
  assert.match(form, /components\.installedIn\.map\(\(parent\) => \([\s\S]*?<AuditScanPhotoThumb photo=\{parent\.photo\} emptyFrame=\{canSeePhotos\} \/>/, "the installed-in line: the parent's thumb")

  // No labelled row passes an alt to the thumb.
  for (const file of ["audit-scan-room-list.tsx", "audit-scan-search.tsx", "audit-scan-panels.tsx", "audit-scan-check-form.tsx"]) {
    assert.doesNotMatch(read(`src/components/audit/${file}`), /<AuditScanPhotoThumb[^>]*\balt=/, file)
  }
})

test("a model photo is named รูปประจำรุ่น, on the card as a chip and on rows in the meta line", () => {
  const th = JSON.parse(read("messages/th.json"))
  assert.equal(th.asset.modelPhoto, "รูปประจำรุ่น")
  const photo = read(PHOTO)
  assert.match(photo, /photo\.fromModel \? <StatusBadge[^>]*label=\{t\("modelPhoto"\)\}/, "the card's chip")
  assert.match(photo, /useTranslations\("asset"\)/)
  // One shared label: never shrunk by a truncated line, never broken mid-word (final review F4, F5).
  const label = photo.slice(photo.indexOf("export function AuditScanModelPhotoLabel("), photo.indexOf("const thumbBox"))
  assert.match(label, /if \(!photo\?\.fromModel\) return null/)
  assert.match(label, /className=\{cn\("shrink-0 whitespace-nowrap", className\)\}/)
  assert.match(label, /<span data-audit-scan-model-photo>\{t\("modelPhoto"\)\}<\/span>/)

  const room = read("src/components/audit/audit-scan-room-list.tsx")
  const ownRow = room.slice(room.indexOf("data-audit-scan-row\n"), room.indexOf("</button>", room.indexOf("data-audit-scan-row\n")))
  assert.match(ownRow, /\{item\.assetTag\}<\/span>\{" "\}\s*<AuditScanModelPhotoLabel photo=\{item\.photo\} \/>/)
  // Recorded out-of-scope rows: the thumb and the label too (final review F7).
  const recorded = room.slice(room.indexOf("data-audit-scan-recorded-row"), room.indexOf("</button>", room.indexOf("data-audit-scan-recorded-row")))
  assert.match(recorded, /<AuditScanPhotoThumb photo=\{item\.photo\} emptyFrame=\{canSeePhotos\} \/>\s*<span className="min-w-0 flex-1">/)
  assert.match(recorded, /<AuditScanModelPhotoLabel photo=\{item\.photo\} \/>/)

  // Search rows: beside the tag, outside any truncate (F5).
  const search = read("src/components/audit/audit-scan-search.tsx")
  assert.match(search, /<span className="min-w-0 truncate text-sm text-foreground">\s*<span className="tag font-medium">[^\n]*\n\s*<\/span>\s*<AuditScanModelPhotoLabel photo=\{match\.item\.photo\} className="text-meta text-muted-foreground" \/>/)
  assert.doesNotMatch(search, /data-audit-scan-model-photo/, "only through the shared label")

  // Component rows and the installed-in line (F4).
  const panels = read("src/components/audit/audit-scan-panels.tsx")
  assert.match(panels, /\{meta \? <span className="min-w-0 truncate">\{meta\}<\/span> : null\}\s*<AuditScanModelPhotoLabel photo=\{component\.photo\} separator=\{Boolean\(meta\)\} \/>/)
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  assert.match(form, /components\.installedIn\.map\(\(parent\) => \([\s\S]*?<AuditScanModelPhotoLabel photo=\{parent\.photo\} \/>/)

  // No row draws the label itself, and none puts it in a truncated span.
  for (const file of ["audit-scan-room-list.tsx", "audit-scan-search.tsx", "audit-scan-panels.tsx", "audit-scan-check-form.tsx"]) {
    const source = read(`src/components/audit/${file}`)
    assert.doesNotMatch(source, /tAsset\("modelPhoto"\)/, file)
    assert.doesNotMatch(source, /truncate[^"]*">[^<]*(\{[^}]*\})*[^<]*<AuditScanModelPhotoLabel/, file)
  }
})

test("no frame is drawn for a viewer who may not see photos", () => {
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx")
  // The same pure permission check the loader is given (no read): either kind of photo draws the frames.
  assert.match(page, /const photoAccess = auditScanPhotoAccess\(user\)\n\s+const canSeePhotos = photoAccess\.assetPhotos \|\| photoAccess\.modelPhotos/)
  assert.match(page, /canSeePhotos=\{canSeePhotos\}/)

  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /canSeePhotos: boolean/)
  assert.equal((workspace.match(/canSeePhotos=\{canSeePhotos\}/g) ?? []).length, 4, "the room list, the search results, the out-of-scope card and the check form")

  for (const file of ["audit-scan-room-list.tsx", "audit-scan-search.tsx", "audit-scan-check-form.tsx", "audit-scan-lookup-card.tsx"]) {
    assert.match(read(`src/components/audit/${file}`), /canSeePhotos: boolean/, file)
  }
  assert.match(read("src/components/audit/audit-scan-check-form.tsx"), /<AuditComponentPanel[\s\S]*?emptyFrame=\{canSeePhotos\}/)
  assert.match(read("src/components/audit/audit-scan-panels.tsx"), /emptyFrame: boolean/)
})
