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
