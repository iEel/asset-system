import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Audit photos plan 2 task 2 (spec 2026-11-10-audit-photos-design §4, option ข): the files tab keeps one photo list,
// marks each round photo with its round, and filters by round through ?photoRound=. Sources are read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const FILES = "src/components/assets/asset-attachments.tsx"
const TAB = "src/components/assets/detail/asset-files-tab.tsx"
const LOADER = "src/lib/asset-files-data.ts"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"

test("the tile keeps its name row and puts the round chip on its own line under it (final review F3); the name wraps to 2 lines on a phone tile (phone polish 1)", () => {
  const source = read(FILES)
  // The name row is the one before this plan: the primary chip, the name, the delete button; no round chip in it.
  // Phone polish 1: the name wraps (at most 2 lines, the full name as its title) instead of being cut to "รูปห...", and
  // the row aligns to the top so the delete button stays at the top when the name takes 2 lines.
  assert.match(
    source,
    /<div className="mt-2 flex min-w-0 items-start gap-2">\n\s+\{photo\.primary \? <Chip>\{t\("filesTab\.primaryPhoto"\)\}<\/Chip> : null\}\n\s+<span title=\{name\} className="line-clamp-2 min-w-0 flex-1 break-words text-sm text-foreground">\{name\}<\/span>\n\s+\{onDelete \? \(/,
  )
  assert.doesNotMatch(source.slice(source.indexOf("function PhotoTile("), source.indexOf("function RoundLine(")), /\btruncate\b/)
  // The round chip: its own line after the name row, the whole round number as its title, tag on an inner span (Chip
  // sets text-meta, and globals.css keeps tag off an element with a text size).
  const tile = source.slice(source.indexOf("function PhotoTile("), source.indexOf("function RoundLine("))
  const nameRowEnd = tile.indexOf("</div>", tile.indexOf('<div className="mt-2 flex min-w-0 items-start gap-2">'))
  const roundLine = tile.indexOf("{photo.round ? (")
  assert.ok(nameRowEnd > 0 && roundLine > nameRowEnd, "the round chip comes after the name row closes")
  assert.match(
    tile,
    /\{photo\.round \? \(\n\s+<div className="mt-1 flex min-w-0">\n\s+<Chip title=\{photo\.round\.auditNo\}>\n\s+<span className="tag">\{photo\.round\.auditNo\}<\/span>\n\s+<\/Chip>\n\s+<\/div>\n\s+\) : null\}/,
  )
  assert.doesNotMatch(source, /<Chip className="tag"/)
  assert.equal(tile.match(/photo\.round\.auditNo/g)?.length, 2)
})

test("the chip row is the shared TabNav, its links in the URL with a count on each chip", () => {
  const source = read(FILES)
  assert.match(source, /import \{ TabNav \} from "@\/components\/ui\/tab-nav"/)
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("filesTab\.roundFilterLabel"\)\}/)
  assert.match(source, /count: formatCount\(chip\.count\)/)
  assert.match(source, /href: chip\.href/)
  assert.match(source, /current=\{roundFilter\.chips\.find\(\(chip\) => chip\.selected\)\?\.key \?\? "all"\}/)
  // The words: ทั้งหมด is the shared common.all; the last chip is ไม่ได้มาจากการตรวจนับ.
  assert.match(source, /chip\.key === "all" \? tCommon\("all"\) : chip\.key === "none" \? t\("filesTab\.notFromAudit"\) : chip\.label/)
  // The fold applies to the filtered tiles.
  assert.match(source, /const gallery = getAssetPhotoGalleryState\(shownPhotos, showAllPhotos\)/)
  assert.match(source, /roundFilter \? photos\.filter\(\(photo\) => visibleIds\.has\(photo\.id\)\) : photos/)
})

test("the line links the round only with can.auditView", () => {
  const loader = read(LOADER)
  assert.match(loader, /can\.auditView && selected\b[^\n]*\n?[^\n]*buildAssetMovementDocumentHref\(locale, \{ kind: "auditRound", id: selected\.roundId, code: selected\.auditNo \}\)/)
  assert.match(loader, /loadAuditRoundPhotos\(prisma as unknown as AuditRoundPhotoDb, \[asset\.id\]\)/)
  assert.match(loader, /assetHistoryActorLabel\(/)
  assert.match(loader, /auditItemResultKey\(item\.auditStatus, item\.auditResult\)/)
  assert.match(loader, /item\.lastScanAt \?\? item\.updatedAt/)
  assert.match(loader, /cancelled: round\.status === "cancelled"/)
  const source = read(FILES)
  assert.match(source, /\{roundHref \? \(\n\s+<Link href=\{roundHref\}[^>]*>\n\s+<span className="tag">\{selectedRound\.auditNo\}<\/span>\n\s+<\/Link>\n\s+\) : \(\n\s+<span className="tag[^"]*">\{selectedRound\.auditNo\}<\/span>\n\s+\)\}/)
  const tab = read(TAB)
  assert.match(tab, /roundFilter=\{data\.photoRoundFilter\} roundHref=\{data\.photoRoundHref\}/)
  const page = read(PAGE)
  assert.match(page, /photoRound\?: string \| string\[\]/)
  assert.match(page, /photoRound: rawSearchParams\.photoRound,/)
  assert.match(page, /filesHref: buildAssetDetailViewHref\(locale, asset\.id, "files", returnToHref\),/)
})

test("a cancelled round shows ยกเลิกแล้ว", () => {
  const source = read(FILES)
  assert.match(source, /\{selectedRound\.cancelled \? <StatusBadge label=\{t\("filesTab\.roundCancelled"\)\} tone="muted" \/> : null\}/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as { asset: { filesTab: Record<string, string> } }
  assert.equal(th.asset.filesTab.roundCancelled, "ยกเลิกแล้ว")
  assert.equal(th.asset.filesTab.notFromAudit, "ไม่ได้มาจากการตรวจนับ")
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as { asset: { filesTab: Record<string, string> } }
  for (const key of ["roundCancelled", "notFromAudit", "roundFilterLabel", "roundScannedBy"]) assert.equal(typeof en.asset.filesTab[key], "string", key)
})

test("uploads, deletes and the checklist hints are unchanged", () => {
  const source = read(FILES)
  assert.match(source, /\{canEdit \? <AssetFileUpload assetId=\{assetId\} \/> : null\}/)
  // The hints sit after the filtered tiles and do not depend on the round.
  assert.match(source, /\{canEdit \? missingChecklistLabels\.map\(\(label\) => \(/)
  assert.doesNotMatch(source.slice(source.indexOf("missingChecklistLabels.map(")), /^[^\n]*roundFilter/)
  assert.equal(source.match(/onDelete=\{canEdit \? \(\) => handleDelete\((?:photo|document)\) : undefined\}/g)?.length, 2)
  assert.match(source, /await postAssetAttachment\(assetId, file, label, tCommon\("error"\)\)/)
  assert.match(source, /fetch\(`\/api\/attachments\/\$\{file\.id\}`, \{\n\s+method: "DELETE",/)
  // The heading still counts every photo, and the primary chip and the checklist order are computed on every photo.
  assert.match(source, /t\("filesTab\.photos", \{ count: formatCount\(photos\.length\) \}\)/)
  assert.match(read(LOADER), /groupAssetFiles\(files, checklist, roundOf\)/)
})
