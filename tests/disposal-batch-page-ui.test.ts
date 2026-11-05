import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Request batches Task 3 (spec §5): the batch page (DP-Batch) on the Task 1 read model. Progress, the lot photo in the
// side panel, each machine with its own photo or "ใช้รูปรวม" and a link to its files, the round link of a recorded
// machine, and "สร้างรอบตัดจำหน่ายจากชุดนี้" from md for disposal:edit (PB-R6). Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx"
const BUTTON = "src/components/disposal/disposal-batch-round-button.tsx"
const REQUEST_PAGE = "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx"

test("the batch page reads the batch through readDisposalBatch, with an actor only for disposal:edit", () => {
  const source = read(PAGE)
  assert.match(source, /readDisposalBatch\(prisma, id, actor, \{/)
  assert.match(source, /const canEdit = hasPermission\(user, "disposal", "edit"\)/)
  assert.match(source, /const actor = canEdit\n?\s*\? \{ userId: user\.id, employeeId: user\.employeeId, roles: user\.roles, permissions: user\.permissions \}\n?\s*: null/)
  assert.doesNotMatch(source, /prisma\.disposalBatch\.findFirst/, "the page reads through the read model only")
  assert.match(source, /if \(!result\) notFound\(\)/)
})

test("the batch page header: the batch number is the h1, the title and method · requester · date in the meta, back keeps returnTo", () => {
  const source = read(PAGE)
  assert.match(source, /title=\{<span className="tag font-medium">\{batch\.batchNo\}<\/span>\}/)
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/disposal` \}, \{ label: batch\.batchNo, code: true \}\]\}/)
  assert.match(source, /\{batch\.title\}/)
  assert.match(source, /\{method\} · \{batch\.requestedByName \?\? "–"\} · \{formatDate\(batch\.requestDate\)\}/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
})

test("the batch page progress: ตัดจำหน่ายแล้ว {x}/{y} with a PaceBar, and the four stage counts in the queue's words", () => {
  const source = read(PAGE)
  assert.match(source, /t\("batchPage\.progress", \{ disposed: formatCount\(counts\.disposed\), total: formatCount\(counts\.total\) \}\)/)
  assert.match(source, /<PaceBar value=\{counts\.total > 0 \? counts\.disposed \/ counts\.total : 0\} pace=\{null\} label=\{progressLabel\} behind=\{false\} \/>/)
  for (const stage of ["pending", "approved", "disposed", "rejected"]) {
    assert.ok(source.includes(`"${stage}"`), `no ${stage} stage`)
  }
  assert.match(source, /label: t\(`statuses\.\$\{stage\}`\)/)
})

test("the batch page side panel: the lot photo in DisposalPhotoGallery and the batch's files in DisposalAttachments", () => {
  const source = read(PAGE)
  assert.match(source, /<DisposalPhotoGallery\n\s+photos=\{lotPhotos\.map\(\(photo\) => \(\{ id: photo\.id, originalName: photo\.originalName \}\)\)\}/)
  assert.match(source, /<DisposalAttachments requestId=\{batch\.id\} attachments=\{attachments\} canManage=\{canManage\} uploadEndpoint=\{`\/api\/disposal-batches\/\$\{batch\.id\}\/attachments`\} title=\{t\("batchSharedEvidence"\)\} \/>/)
  assert.match(source, /module: "disposal_batch", referenceId: batch\.id, isActive: true/)
})

test("the batch page machines: own photo or ใช้รูปรวม with แนบรูป to the request's #files, the request link, the stage badge, the round link", () => {
  const source = read(PAGE)
  assert.match(source, /machine\.ownPhotoId === null/)
  assert.match(source, /labels\.useLotPhoto/)
  assert.match(source, /useLotPhoto: t\("batchPage\.useLotPhoto"\)/)
  assert.match(source, /attachPhoto: t\("batchPage\.attachPhoto"\)/)
  assert.match(source, /#files`/)
  assert.match(source, /\/disposal\/rounds\/\$\{machine\.round\.id\}/)
  assert.match(source, /<StatusBadge label=\{labels\.stage\(machine\.requestStatus\)\} status=\{machine\.requestStatus\} \/>/)
  assert.match(source, /machine\.serialNumber \?\? "–"/)
  assert.match(source, /<AssetThumbnail\n?\s*photo=\{\{ id: machine\.ownPhotoId/)
  assert.match(source, /<ContentPanelRows className="md:hidden">/, "phone cards")
  assert.match(source, /<DataTable framed=\{false\} className="hidden md:block"/, "the desktop table")
})

test("the batch page round button: only for disposal:edit with joinable machines, from md, with the blocked line and the phone note", () => {
  const source = read(PAGE)
  assert.match(source, /canEdit && roundCandidates\.joinableIds\.length > 0/)
  assert.match(source, /className="hidden md:flex/)
  assert.match(source, /<DisposalBatchRoundButton ids=\{roundCandidates\.joinableIds\} href=\{`\/\$\{locale\}\/disposal\/rounds\/new`\} label=\{t\("batchPage\.roundCreate", \{ count: formatCount\(roundCandidates\.joinableIds\.length\) \}\)\} \/>/)
  assert.match(source, /t\("batchPage\.roundBlocked", \{ count: formatCount\(roundCandidates\.blocked\.length\), reasons: /)
  assert.match(source, /DISPOSAL_SOD_CONFLICT: t\("queue\.roundTickApprover"\)/)
  assert.match(source, /DISPOSAL_EVIDENCE_REQUIRED: t\("queue\.roundTickNoEvidence"\)/)
  assert.match(source, /className="text-meta text-muted-foreground md:hidden">\{t\("queue\.roundPhoneNote"\)\}/)
})

test("the round button hands the ids over in the queue's selection key and opens the round page (PB-R6)", () => {
  const source = read(BUTTON)
  assert.match(source, /^"use client"/)
  assert.match(source, /export function DisposalBatchRoundButton\(\{ ids, href, label \}: \{ ids: string\[\]; href: string; label: string \}\)/)
  assert.match(source, /disposalRoundSelectionStorageKey/)
  assert.match(source, /disposalRoundSelectionScope\(\{ search: "", disposalType: "", dateFrom: "", dateTo: "" \}\)/)
  assert.match(source, /try \{\n\s+window\.sessionStorage\.setItem\(disposalRoundSelectionStorageKey, JSON\.stringify\(selection\)\)\n\s+\} catch \{/)
  assert.match(source, /router\.push\(href\)/)
})

test("the request page's files panel is the #files anchor that แนบรูป opens", () => {
  const source = read(REQUEST_PAGE)
  assert.match(source, /<div id="files" data-disposal-panel="evidence" className="min-w-0 scroll-mt-24 space-y-6 max-lg:order-3">/)
})

// Request batches Task 4 (spec §6, PB-R5): the batch list (DP-Batches) on the Task 1 read model, in the rounds list's
// look: search, a name and progress per batch, the strip of every batch's requests by stage, paging 25/50/100.
const LIST = "src/app/[locale]/(dashboard)/disposal/batches/page.tsx"

test("the batch list reads through readDisposalBatchList with the search in q, the page and the page size", () => {
  const source = read(LIST)
  assert.match(source, /readDisposalBatchList\(prisma, \{/)
  assert.doesNotMatch(source, /prisma\.disposalBatch\.(?:findMany|count)/, "the list reads through the read model only")
  assert.match(source, /searchParams: Promise<\{ q\?: string \| string\[\]; page\?: string \| string\[\]; pageSize\?: string \| string\[\] \}>/)
  assert.match(source, /<form action=\{basePath\} method="get" role="search"/)
  assert.match(source, /name="q"/)
  assert.match(source, /placeholder=\{t\("batchList\.searchPlaceholder"\)\}/)
  assert.match(source, /<input type="hidden" name="pageSize" value=\{listPage\.pageSize\} \/>/)
  assert.match(source, /if \(search\) query\.set\("q", search\)/)
  assert.match(source, /titleWords: \{\n\s+same: \(name, count\) => t\("rounds\.titleSame", \{ name, count \}\),\n\s+mixed: \(name, count\) => t\("rounds\.titleMixed", \{ name, count \}\),/)
})

test("the batch list columns: batch number, name with the machine count, method, requester, date, progress with a bar, open", () => {
  const source = read(LIST)
  const head = source.slice(source.indexOf("<DataTableHeader>"), source.indexOf("</DataTableHeader>"))
  const order = ['t("batchNo")', 't("batchList.colName")', 't("batchList.colMethod")', 't("requestedBy")', 't("requestDate")', 't("batchList.colProgress")', 'tCommon("actions")']
  let at = -1
  for (const label of order) {
    const next = head.indexOf(label)
    assert.ok(next > at, `${label} after the previous column`)
    at = next
  }
  assert.match(source, /<DataTableCell className="min-w-56">\n\s+<div className="font-medium text-foreground \[overflow-wrap:anywhere\]">\{row\.title\}<\/div>/)
  assert.match(source, /t\("batchList\.machineCount", \{ count: formatCount\(row\.machineCount\) \}\)/)
  assert.match(source, /<DataTableCell className="whitespace-nowrap text-muted-foreground">\{method\(row\.disposalType\)\}<\/DataTableCell>/)
  assert.match(source, /<DataTableCell className="min-w-40 text-muted-foreground \[overflow-wrap:anywhere\]">\{row\.requestedByShortName \?\? "–"\}<\/DataTableCell>/)
  assert.match(source, /data-batch-progress=""/)
  assert.match(source, /t\("batchPage\.progress", \{ disposed: formatCount\(row\.counts\.disposed\), total: formatCount\(row\.counts\.total\) \}\)/)
  assert.match(source, /<PaceBar value=\{row\.counts\.total > 0 \? row\.counts\.disposed \/ row\.counts\.total : 0\} pace=\{null\} label=\{progress\} behind=\{false\} \/>/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
})

test("the batch list strip: every batch's requests by stage with {n} คำขอจาก {m} ชุด (PB-R5)", () => {
  const source = read(LIST)
  assert.match(source, /data-batch-strip=""/)
  assert.match(source, /t\("batchList\.stripLine", \{ requests: formatCount\(strip\.total\), batches: formatCount\(strip\.batches\) \}\)/)
  assert.match(source, /<StatStrip/)
  assert.match(source, /stages\.map\(\(stage\) => \(\{ key: stage, label: t\(`statuses\.\$\{stage\}`\), value: formatCount\(strip\[stage\]\) \}\)\)/)
})

test("the batch list: empty, no match, paging 25/50/100, a page past the end goes to the last", () => {
  const source = read(LIST)
  assert.match(source, /title=\{t\("batchList\.emptyTitle"\)\}/)
  assert.match(source, /<EmptyNote padded>\{t\("batchList\.searchEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(rows\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
})

test("the batch list words in Thai and English", () => {
  const messages = JSON.parse(read("messages/th.json")).disposalPage
  const th = messages.batchList
  const en = JSON.parse(read("messages/en.json")).disposalPage.batchList
  assert.equal(th.searchPlaceholder, "ค้นหาเลขที่ชุด ชื่อทรัพย์สิน รหัส หรือผู้ขอ")
  assert.equal(th.machineCount, "{count} เครื่อง")
  assert.equal(th.stripLine, "{requests} คำขอจาก {batches} ชุด")
  assert.equal(th.emptyTitle, "ยังไม่มีชุดคำขอ")
  assert.equal(messages.batchPage.progress, "ตัดจำหน่ายแล้ว {disposed}/{total}")
  for (const key of Object.keys(th)) assert.equal(typeof en[key], "string", key)
})

// Look-step fix: at 1024 and 1440 the table crushed the name letter by letter; it now scrolls instead (the rounds list's
// widths: the name min-w-56, the codes, the stage and the round on one line).
test("the batch page machines table keeps readable widths: the name min-w-56, the other columns whitespace-nowrap", () => {
  const source = read(PAGE)
  assert.match(source, /<DataTableCell className="whitespace-nowrap"><MachinePhoto /)
  // The "ใช้รูปรวม" tile wraps its own words inside the nowrap photo column.
  assert.match(source, /<span className="inline-flex size-11 shrink-0 items-center justify-center whitespace-normal [^"]*">\{labels\.useLotPhoto\}<\/span>/)
  assert.match(source, /<DataTableCell className="min-w-56 text-foreground">\{machine\.assetName\}<\/DataTableCell>/)
  assert.match(source, /<DataTableCell className="whitespace-nowrap"><span className="tag">\{machine\.assetTag\}<\/span><\/DataTableCell>/)
  assert.match(source, /<DataTableCell className="whitespace-nowrap text-muted-foreground">\{machine\.serialNumber \?\? "–"\}<\/DataTableCell>/)
  assert.match(source, /<DataTableCell className="whitespace-nowrap">\n\s+<Link href=\{requestHref\(machine\.requestId\)\}/)
  assert.match(source, /<DataTableCell className="whitespace-nowrap"><StatusBadge label=\{labels\.stage\(machine\.requestStatus\)\}/)
  assert.match(source, /<DataTableCell className="whitespace-nowrap text-muted-foreground"><RoundLink /)
  assert.doesNotMatch(source, /<DataTableCell className="[^"]*\[overflow-wrap:anywhere\]">\{machine\.(?:assetName|serialNumber)/, "the phone card may wrap; the table cells scroll")
})
