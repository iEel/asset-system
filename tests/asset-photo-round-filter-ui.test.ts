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

test("the tile renders the round chip and the primary chip together", () => {
  const source = read(FILES)
  assert.match(
    source,
    /\{photo\.primary \? <Chip>\{t\("filesTab\.primaryPhoto"\)\}<\/Chip> : null\}\n\s+\{photo\.round \? <Chip className="tag">\{photo\.round\.auditNo\}<\/Chip> : null\}/,
  )
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
