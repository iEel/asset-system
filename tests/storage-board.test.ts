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
  assert.match(source, /foot: t\("reviewBreakdown", \{\n?\s*orphans: dryRun\.orphanFiles\.length,\n?\s*missing: dryRun\.missingFiles\.length,\n?\s*duplicate: summary\.duplicatePathCount,\n?\s*empty: summary\.missingPathCount,?\n?\s*\}\)/)
  assert.match(source, /attention: reviewNeededCount > 0,/)
  assert.match(source, /t\("equation", \{ disk: filesystemFiles\.length, inUse: dryRun\.matchedFiles\.length, orphans: dryRun\.orphanFiles\.length \}\)/)
  // The header shows the upload folder (the readiness page shows the same value to the same gate).
  assert.match(source, /<span className="tag break-all">\{uploadRoot\}<\/span>/)
  const th = messages("th")
  assert.equal(th.inactiveFiles, "ไม่ใช้งาน {count, number}")
  assert.equal(th.reviewBreakdown, "หลุด {orphans, number} · หาย {missing, number} · path ซ้ำ {duplicate, number} · path ว่าง {empty, number}")
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
  // Review list: asset name and tag, not the raw reference id, and the same-file note.
  assert.doesNotMatch(source, /item\.referenceId\}<\/span>/)
  assert.match(source, /t\("samePathAsAbove"\)/)
  assert.equal(messages("th").samePathAsAbove, "ชี้ไฟล์เดียวกับรายการบน")
  // Largest files: module, asset and date.
  assert.match(source, /largeFiles\.map\(/)
  assert.match(source, /formatDateTime\(item\.uploadedAt\)/)
  // Thai words replace Dry-run, flag and Archive.
  for (const value of Object.values(messages("th"))) assert.doesNotMatch(value, /dry-run|flag|archive/i)
})
