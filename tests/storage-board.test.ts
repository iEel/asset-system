import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Page group 12 plan 3 task 4 (spec §8, §15 item 10, board AD-Storage): the storage page. Source pins, read with \r stripped.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/admin/storage/page.tsx")
const row = () => read("src/components/admin/storage/storage-row.tsx")
const button = () => read("src/components/admin/storage-archive-button.tsx")
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).storagePage as Record<string, string>

test("tiles show the review breakdown and the equation", () => {
  const source = page()
  assert.match(source, /foot: t\("inactiveFiles", \{ count: summary\.inactiveFiles \}\)/)
  // The breakdown keeps all four counts on a phone: two short lines inside the foot's two-line clamp, and the full
  // sentence as footTitle (final review).
  assert.match(source, /const reviewCounts = \{\n?\s*orphans: dryRun\.orphanFiles\.length,\n?\s*missing: dryRun\.missingFiles\.length,\n?\s*duplicate: summary\.duplicatePathCount,\n?\s*empty: summary\.missingPathCount,?\n?\s*\}/)
  assert.match(source, /<span className="block">\{t\("reviewBreakdownFiles", reviewCounts\)\}<\/span>/)
  assert.match(source, /<span className="block">\{t\("reviewBreakdownPaths", reviewCounts\)\}<\/span>/)
  assert.match(source, /footTitle: t\("reviewBreakdown", reviewCounts\),/)
  assert.match(source, /attention: reviewNeededCount > 0,/)
  assert.match(source, /t\("equation", \{ disk: filesystemFiles\.length, inUse: dryRun\.matchedFiles\.length, orphans: dryRun\.orphanFiles\.length \}\)/)
  // The header shows the upload folder (the readiness page shows the same value to the same gate).
  assert.match(source, /<span className="tag break-all">\{uploadRoot\}<\/span>/)
  const th = messages("th")
  assert.equal(th.inactiveFiles, "ไม่ใช้งาน {count, number}")
  assert.equal(th.reviewBreakdown, "หลุด {orphans, number} · หาย {missing, number} · path ซ้ำ {duplicate, number} · path ว่าง {empty, number}")
  assert.equal(th.reviewBreakdownFiles, "หลุด {orphans, number} · หาย {missing, number}")
  assert.equal(th.reviewBreakdownPaths, "path ซ้ำ {duplicate, number} · ว่าง {empty, number}")
  assert.match(th.equation, /\{disk, number\} = .*\{inUse, number\} \+ .*\{orphans, number\}/)
  assert.match(messages("en").inactiveFiles, /\{count, plural,/)
})

test("chips filter rows and missing files come first", () => {
  const source = page()
  assert.match(source, /const filter = parseStorageFilter\(query\.filter\)/)
  assert.match(source, /const rows = buildStorageRows\(dryRun\.actions, refs, now\)/)
  assert.match(source, /const visible = filterStorageRows\(rows, filter, showAll\)/)
  assert.match(source, /\{ key: "all", label: t\("filterAll"\), count: rows\.length \}/)
  assert.match(source, /\{ key: "missing", label: t\("filterMissing"\), count: dryRun\.missingFiles\.length \}/)
  assert.match(source, /\{ key: "orphan", label: t\("filterOrphan"\), count: dryRun\.orphanFiles\.length \}/)
  assert.match(source, /<StorageFilterChips label=\{t\("filterLabel"\)\} chips=\{chips\.map\(\(chip\) => \(\{ \.\.\.chip, href: storageHref\(\{ filter: chip\.key \}\) \}\)\)\} current=\{filter\} \/>/)
  assert.match(read("src/components/admin/storage/storage-filter-chips.tsx"), /aria-current=\{chip\.key === current \? "page" : undefined\}/)
  const th = messages("th")
  assert.equal(th.filterAll, "ทั้งหมด")
  assert.equal(th.filterMissing, "ไฟล์หาย")
  assert.equal(th.filterOrphan, "ไฟล์หลุด")
})

test("file names truncate and expand shows the full path", () => {
  const source = row()
  assert.match(source, /^"use client"/)
  assert.match(source, /<span className="block truncate font-medium text-foreground" title=\{row\.fileName\}>\{row\.fileName\}<\/span>/)
  assert.match(source, /aria-expanded=\{open\}/)
  assert.match(source, /aria-controls=\{detailId\}/)
  assert.match(source, /<span className="tag break-all">\{row\.path\}<\/span>/)
  assert.match(source, /await navigator\.clipboard\.writeText\(row\.path\)/)
  assert.match(source, /toast\.success\(t\("pathCopied"\)\)/)
  assert.match(source, /t\("destinationPreview", \{ destination: row\.destination \}\)/)
  assert.match(source, /t\("noReference"\)/)
  // Missing rows name the asset (or the batch) and stay review-only.
  assert.match(source, /t\("openAsset"\)/)
  assert.match(source, /t\("archiveUnavailable"\)/)
  const th = messages("th")
  assert.equal(th.pathCopied, "คัดลอกแล้ว")
  assert.equal(th.destinationPreview, "ย้ายไป {destination} (ประมาณ)")
  assert.equal(th.noReference, "ไม่มีรายการใดอ้างถึง")
  assert.equal(th.openAsset, "เปิดทรัพย์สิน")
  assert.equal(th.archiveUnavailable, "ตรวจสอบเท่านั้น")
  // The page resolves names on the server: Attachment.assetId first, then the checkout or checkin record, and a
  // disposal_batch file's batch number.
  const pageSource = page()
  assert.match(pageSource, /prisma\.assetCheckout\.findMany\(/)
  assert.match(pageSource, /prisma\.assetCheckin\.findMany\(/)
  assert.match(pageSource, /prisma\.disposalBatch\.findMany\(\{ where: \{ id: \{ in: batchIds \} \}, select: \{ id: true, batchNo: true \} \}\)/)
})

test("the archive button keeps its confirm and gate", () => {
  const source = row()
  assert.match(source, /row\.kind === "orphan" && canArchive \? \(\n\s+<StorageArchiveButton relativePath=\{row\.path\} \/>/)
  assert.equal(source.match(/<StorageArchiveButton/g)?.length, 1)
  const pageSource = page()
  assert.match(pageSource, /const canArchiveStorageFiles = hasPermission\(user, "setting", "edit"\)/)
  assert.match(pageSource, /canArchive=\{canArchiveStorageFiles\}/)
  const archive = button()
  assert.match(archive, /await confirm\(\{ title: t\("archiveConfirm", \{ file: relativePath \}\), confirmLabel: t\("archiveOrphanFile"\) \}\)/)
  assert.ok(archive.includes('fetch("/api/admin/storage/archive-orphan"'))
  assert.equal(messages("th").archiveOrphanFile, "ย้ายไปที่เก็บถาวร")
})

test("the restore note says ผู้ดูแลเซิร์ฟเวอร์ย้ายกลับได้", () => {
  assert.match(row(), /t\("restoreNote"\)/)
  assert.equal(messages("th").restoreNote, "ผู้ดูแลเซิร์ฟเวอร์ย้ายกลับได้")
  // No in-app restore is promised anywhere in Thai storage copy.
  for (const [key, value] of Object.entries(messages("th"))) {
    if (key === "restoreNote") continue
    assert.doesNotMatch(value, /ย้ายกลับได้/, key)
  }
})

test("show-all toggles with a URL param", () => {
  const source = page()
  assert.match(source, /const showAll = query\.showAll === "1"/)
  assert.match(source, /t\("showingOf", \{ shown: visible\.rows\.length, total: visible\.total \}\)/)
  assert.match(source, /showAll \? t\("showLess"\) : t\("showAll"\)/)
  assert.match(source, /storageHref\(\{ filter, showAll: !showAll \}\)/)
  const th = messages("th")
  assert.equal(th.showingOf, "แสดง {shown, number} จาก {total, number}")
  assert.equal(th.showAll, "ดูทั้งหมด")
  assert.equal(th.showLess, "แสดงน้อยลง")
})

test("kept: module breakdown, review list, largest files, setting:view gate", () => {
  const source = page()
  assert.match(source, /const user = await requirePagePermission\(locale, "setting", "view"\)/)
  // Module table: Thai labels, a share bar and a total row.
  assert.match(source, /storageModuleLabelKey\(module\)/)
  assert.match(source, /style=\{\{ width: `\$\{share\(item\.totalBytes\)\}%` \}\}/)
  assert.match(source, /t\("total"\)/)
  // Review list: the asset name and tag, the batch, the purchase document or model, else the raw reference id as the old
  // list showed it (final review), and the same-file note.
  assert.match(source, /prisma\.purchaseDocument\.findMany\(/)
  assert.match(source, /prisma\.assetModel\.findMany\(/)
  assert.match(source, /<span className="tag">\{item\.referenceId\}<\/span>/)
  assert.match(source, /t\("samePathAsAbove"\)/)
  assert.equal(messages("th").samePathAsAbove, "ชี้ไฟล์เดียวกับรายการบน")
  // Largest files: module, asset and date.
  assert.match(source, /largeFiles\.map\(/)
  assert.match(source, /formatDateTime\(item\.uploadedAt\)/)
  // Thai words replace Dry-run, flag and Archive.
  for (const value of Object.values(messages("th"))) assert.doesNotMatch(value, /dry-run|flag|archive/i)
})

test("missing rows are keyed by attachment, not by path (final review)", () => {
  const source = page()
  assert.doesNotMatch(source, /missingByPath|assetByPath|batchByPath/)
  assert.match(source, /const refs: StorageRefs = \{ assetById: resolved\.assetById, batchById: resolved\.batchById \}/)
  assert.match(source, /const attachment = row\.attachmentId \? context\.attachmentById\.get\(row\.attachmentId\) : undefined/)
})

test("largest files: an empty note, not an empty table; stacked rows on a phone, the table from md (final review)", () => {
  const source = page()
  assert.match(source, /largeFiles\.length === 0 \? \(\n\s+<EmptyNote>\{t\("emptyLargeFiles"\)\}<\/EmptyNote>/)
  assert.doesNotMatch(source, /<TableEmptyRow colSpan=\{5\}>/)
  assert.match(source, /<ul className="divide-y divide-border-soft md:hidden">/)
  assert.match(source, /<div className="hidden md:block">\n\s+<DataTable framed=\{false\} caption=\{t\("largestFiles"\)\}/)
  // The module table drops its share column below md and draws the bar under the module name instead.
  assert.match(source, /<DataTableHead className="hidden md:table-cell">\{t\("shareOfSize"\)\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell className="hidden min-w-24 md:table-cell">/)
})

test("phone rows: the source has its visible label, the actions and the expand button share a line (final review)", () => {
  const source = row()
  assert.match(source, /<span className="md:hidden">\{t\("source"\)\}: <\/span>/)
  assert.doesNotMatch(source, /sr-only md:hidden/)
  assert.match(source, /<div className="flex items-center justify-between gap-2 md:contents">/)
  // An orphan's top folder reads as its Thai name when the app knows it.
  assert.match(page(), /storageFolderLabelKey\(row\.relativePath\)/)
})

test("the scroll area measures at once and after fonts load, not only on the first observer callback (final review)", () => {
  const source = read("src/components/ui/data-table-scroll.tsx")
  assert.match(source, /measure\(\)\n\s+void document\.fonts\?\.ready\.then\(measure\)/)
})
