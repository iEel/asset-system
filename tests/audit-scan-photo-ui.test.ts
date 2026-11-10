import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The scan page draws the photo (audit photos spec §3, plan 1 task 5): a card in the check form and on the out-of-scope
// card, a lazy 48px thumb at the start of the room rows, the search rows, the component rows and the installed-in line,
// "รูปประจำรุ่น" for a model photo, and no frame at all for a viewer who may not see photos. Reads strip \r.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PHOTO = "src/components/audit/audit-scan-photo.tsx"

test("the check form and the out-of-scope card show the card photo", () => {
  const photo = read(PHOTO)
  assert.match(photo, /export function AuditScanPhotoCard\(\{ photo, alt \}: \{ photo: AuditScanPhoto \| null; alt: string \}\)/)
  assert.match(photo, /import type \{ AuditScanPhoto \} from/, "the type only: audit-scan-photos.ts is server-only")
  assert.match(photo, /<AssetPhotoFrame[\s\S]*?attachmentId=\{photo\.attachmentId\}[\s\S]*?canUpload=\{false\}/)
  assert.match(photo, /if \(!photo\) return null/)

  const form = read("src/components/audit/audit-scan-check-form.tsx")
  assert.match(form, /const targetPhoto = target\.kind === "item" \? target\.item\.photo : target\.asset\.photo/)
  const body = form.slice(form.indexOf("data-audit-check-body"))
  assert.ok(body.indexOf("<AuditScanPhotoCard") >= 0 && body.indexOf("<AuditScanPhotoCard") < body.indexOf("{statusLine}"), "the card sits at the top of the form")

  const lookup = read("src/components/audit/audit-scan-lookup-card.tsx")
  const outOfScope = lookup.slice(lookup.indexOf('state.status === "out_of_scope"'), lookup.indexOf('state.status === "candidates"'))
  assert.match(outOfScope, /<AuditScanPhotoCard photo=\{state\.asset\.photo\}/)
  const candidates = lookup.slice(lookup.indexOf('state.status === "candidates"'))
  assert.doesNotMatch(candidates, /AuditScanPhoto/, "candidates get no photo (spec §3)")
})

test("room rows, search rows and component rows show the lazy thumb", () => {
  const photo = read(PHOTO)
  assert.match(photo, /export function AuditScanPhotoThumb\(\{ photo, alt, emptyFrame \}: \{ photo: AuditScanPhoto \| null; alt: string; emptyFrame: boolean \}\)/)
  const img = photo.slice(photo.indexOf("<img", photo.indexOf("AuditScanPhotoThumb(")))
  assert.match(img, /src=\{thumbnailUrl\(photo\.attachmentId\)\}/, "the thumbnail route's 96px size")
  assert.match(img, /loading="lazy"/)
  assert.match(img, /decoding="async"/)
  assert.match(img, /width=\{48\}/)
  assert.match(img, /height=\{48\}/)
  assert.match(img, /alt=\{alt\}/)
  assert.match(img, /onError=\{/, "an error falls back to the neutral square")
  assert.match(photo, /if \(!photo && !emptyFrame\) return null/)

  const room = read("src/components/audit/audit-scan-room-list.tsx")
  const row = room.slice(room.indexOf("data-audit-scan-row\n"), room.indexOf("</button>", room.indexOf("data-audit-scan-row\n")))
  assert.match(row, /<AuditScanPhotoThumb photo=\{item\.photo\} alt=\{`\$\{item\.assetTag\} \$\{item\.name\}`\} emptyFrame=\{canSeePhotos\} \/>\s*<span className="min-w-0 flex-1">/, "the thumb at the row's start")

  const search = read("src/components/audit/audit-scan-search.tsx")
  assert.match(search, /<AuditScanPhotoThumb photo=\{match\.item\.photo\} alt=\{`\$\{match\.item\.assetTag\} \$\{match\.item\.name\}`\} emptyFrame=\{canSeePhotos\} \/>\s*<span className="min-w-0 flex-1">/)

  const panels = read("src/components/audit/audit-scan-panels.tsx")
  assert.match(panels, /data-audit-component-row[^>]*>\s*<AuditScanPhotoThumb photo=\{component\.photo\} alt=\{`\$\{component\.assetTag\} \$\{component\.name\}`\} emptyFrame=\{emptyFrame\} \/>/)

  const form = read("src/components/audit/audit-scan-check-form.tsx")
  assert.match(form, /components\.installedIn\.map\(\(parent\) => \([\s\S]*?<AuditScanPhotoThumb photo=\{parent\.photo\} alt=\{`\$\{parent\.assetTag\} \$\{parent\.name\}`\} emptyFrame=\{canSeePhotos\} \/>/, "the installed-in line: the parent's thumb")
})

test("a model photo is named รูปประจำรุ่น, on the card as a chip and on rows in the meta line", () => {
  const th = JSON.parse(read("messages/th.json"))
  assert.equal(th.asset.modelPhoto, "รูปประจำรุ่น")
  const photo = read(PHOTO)
  assert.match(photo, /photo\.fromModel \? <StatusBadge[^>]*label=\{t\("modelPhoto"\)\}/, "the card's chip")
  assert.match(photo, /useTranslations\("asset"\)/)
  const room = read("src/components/audit/audit-scan-room-list.tsx")
  assert.match(room, /item\.photo\?\.fromModel \? <> · <span data-audit-scan-model-photo>\{tAsset\("modelPhoto"\)\}<\/span><\/> : null/)
  const search = read("src/components/audit/audit-scan-search.tsx")
  assert.match(search, /match\.item\.photo\?\.fromModel \? <> · <span data-audit-scan-model-photo>\{tAsset\("modelPhoto"\)\}<\/span><\/> : null/)
})

test("no frame is drawn for a viewer who may not see photos", () => {
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx")
  // The same pure permission check the loader is given (no read): either kind of photo draws the frames.
  assert.match(page, /const photoAccess = auditScanPhotoAccess\(user\)\n\s+const canSeePhotos = photoAccess\.assetPhotos \|\| photoAccess\.modelPhotos/)
  assert.match(page, /canSeePhotos=\{canSeePhotos\}/)

  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /canSeePhotos: boolean/)
  assert.equal((workspace.match(/canSeePhotos=\{canSeePhotos\}/g) ?? []).length, 3, "the room list, the search results and the check form")

  for (const file of ["audit-scan-room-list.tsx", "audit-scan-search.tsx", "audit-scan-check-form.tsx"]) {
    assert.match(read(`src/components/audit/${file}`), /canSeePhotos: boolean/, file)
  }
  assert.match(read("src/components/audit/audit-scan-check-form.tsx"), /<AuditComponentPanel[\s\S]*?emptyFrame=\{canSeePhotos\}/)
  assert.match(read("src/components/audit/audit-scan-panels.tsx"), /emptyFrame: boolean/)
})
