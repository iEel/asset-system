import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Group 6 plan 3 Task 3 (spec §9.1–9.3, §9.5): the request page as board DP-Request. Sources read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx"
const CARD = "src/components/disposal/disposal-next-step-card.tsx"
const DECISION = "src/components/disposal/disposal-decision-button.tsx"
const ATTACHMENTS = "src/components/disposal/disposal-attachments.tsx"
const GALLERY = "src/components/disposal/disposal-photo-gallery.tsx"
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)) as Record<string, Record<string, unknown>>

test("the page loads the real previous status, every photo and the source link", () => {
  const source = read(PAGE)
  assert.match(source, /previousAssetStatus: \{ select: \{/)
  assert.match(source, /listDisposalPhotos\(prisma, \[/)
  assert.match(source, /readDisposalSourceLinks\(prisma, locale, \[disposalRequest\]\)/)
  assert.match(source, /getDisposalApprovalSodReason\(/)
})

test("the page renders the next-step card and the photo gallery in a 380px aside", () => {
  const source = read(PAGE)
  assert.match(source, /<DisposalNextStepCard\b/)
  assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_380px\]/)
  const aside = source.slice(source.indexOf("<aside"), source.indexOf("</aside>"))
  assert.match(aside, /<DisposalPhotoGallery\b/)
  assert.match(aside, /<DisposalAttachments\b/)
  assert.match(aside, /<KeyValueList className=\{stackedKeyValues\} items=\{assetItems\} \/>/)
  assert.match(source, /const stackedKeyValues = "[^"]*\[overflow-wrap:anywhere\]"/)
  assert.ok(source.indexOf("data-disposal-no-photo") > source.indexOf("<aside"), "the no-photo notice sits in the aside")
  assert.doesNotMatch(source, /DisposalWorkflowStepper/)
  assert.equal(existsSync("src/components/disposal/disposal-workflow-stepper.tsx"), false)
})

test("the page reads ?uploadErrors= and shows the no-photo notice on top of the aside", () => {
  const source = read(PAGE)
  assert.match(source, /uploadErrors\?: string \| string\[\]/)
  assert.match(source, /rawSearchParams\.uploadErrors/)
  assert.match(source, /t\("requestPage\.uploadFailedNoPhoto", \{ count: /)
  assert.match(source, /t\("requestPage\.noPhoto"\)/)
  assert.match(source, /data-disposal-no-photo/)
})

test("the delete button shows only with disposal:edit, and the last qualifying file keeps its × hidden while pending or approved", () => {
  const page = read(PAGE)
  assert.match(page, /canDelete=\{canEdit\}/)
  const source = read(ATTACHMENTS)
  assert.match(source, /canDelete\?: boolean/)
  assert.match(source, /lastFileLock/)
  assert.match(source, /\["pending", "approved"\]\.includes\(/)
  assert.match(source, /t\("errors\.DISPOSAL_LAST_PHOTO"\)/)
})

test("evidence images are 96px thumbnails that open the preview dialog; PDFs are file rows", () => {
  const source = read(ATTACHMENTS)
  assert.match(source, /thumbnailUrl\(attachment\.id\)/)
  assert.match(source, /<AttachmentPreviewDialog\b/)
  assert.match(source, /size-24/)
  assert.doesNotMatch(source, /<img src=\{`\/api\/attachments\/\$\{attachment\.id\}\?inline=1`\}/)
  assert.match(source, /accept=\{disposalEvidenceAccept\}/)
  assert.match(source, /getDisposalQueuedFileError\(/)
  assert.match(source, /t\("photoTypeRefused"\)/)
  assert.match(source, /getDisposalApiErrorMessage\(/)
})

test("the decision button takes a preset decision and sends no next status and no price", () => {
  const source = read(DECISION)
  assert.match(source, /initialDecision\?: "approve" \| "reject"/)
  assert.match(source, /triggerLabel\?: string/)
  assert.doesNotMatch(source, /nextStatusId|saleValue|salvageValue|statuses/)
  assert.match(source, /body: JSON\.stringify\(\{\n\s+decision: values\.decision,\n\s+approvalRemark: values\.approvalRemark \|\| null,\n\s+\}\)/)
})

test("the page renders approve and reject as two triggers", () => {
  const source = read(PAGE)
  assert.match(source, /initialDecision="approve"\n\s+triggerLabel=\{t\("approve"\)\}/)
  assert.match(source, /initialDecision="reject"\n\s+triggerLabel=\{t\("reject"\)\}/)
  for (const locale of ["th"] as const) {
    const disposal = messages(locale).disposalPage as Record<string, string>
    assert.equal(disposal.approve, "อนุมัติ")
    assert.equal(disposal.reject, "ปฏิเสธ")
  }
})

test("the next-step card covers every state and reuses the inbox's effect and separation-of-duties words", () => {
  const source = read(CARD)
  assert.match(source, /export type DisposalNextStepState = "decide" \| "own" \| "waiting" \| "approved" \| "disposed" \| "rejected"/)
  assert.match(source, /state: DisposalNextStepState\n/)
  assert.match(source, /<Steps\b/)
  assert.match(source, /useTranslations\("approvalInboxPage"\)/)
  assert.match(source, /tInbox\("sodBlocked"/)
  assert.match(source, /tInbox\("sodAllowed"\)/)
  assert.match(source, /tInbox\("effectIfApprove"\)/)
  assert.match(source, /data-disposal-next-step=\{state\}/)
})

test("the photo gallery moved to components/disposal and both pages import it there", () => {
  assert.equal(existsSync("src/components/approvals/approval-photo-gallery.tsx"), false)
  assert.match(read(GALLERY), /export function DisposalPhotoGallery\(/)
  assert.match(read("src/components/approvals/approval-disposal-panel.tsx"), /import \{ DisposalPhotoGallery \} from "@\/components\/disposal\/disposal-photo-gallery"/)
  assert.match(read(PAGE), /import \{ DisposalPhotoGallery \} from "@\/components\/disposal\/disposal-photo-gallery"/)
})

test("the source link uses linkVariants, and the header holds print and a ⋯ with history and the asset page", () => {
  const source = read(PAGE)
  assert.match(source, /<Link href=\{sourceLink\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /<RowActions\b/)
  assert.match(source, /href: "#history"/)
  assert.match(source, /t\("requestPage\.openAssetPage"\)/)
})

test("the request page words, Thai first", () => {
  const th = messages("th").disposalPage as Record<string, Record<string, unknown>>
  const page = th.requestPage as Record<string, unknown>
  assert.equal(page.titleDecide, "รอคุณพิจารณา")
  assert.equal(page.titleOwn, "คุณพิจารณาคำขอนี้เองไม่ได้")
  assert.equal(page.titleWaiting, "รอผู้มีสิทธิ์พิจารณา")
  assert.equal(page.waitingFor, "รอใคร: {approver} (ระบุไว้) หรือผู้มีสิทธิ์คนอื่น")
  assert.equal(page.waitingForQueue, "รอใคร: คิวอนุมัติส่วนกลาง · ผู้มีสิทธิ์พิจารณาคนใดก็ได้ที่ไม่ใช่คุณ")
  assert.equal(page.waitingSince, "รอมาแล้ว ตั้งแต่ {date}")
  assert.equal(page.titleApproved, "อนุมัติแล้ว · รอบันทึกตัดจำหน่าย")
  assert.equal(page.approverCannotExecute, "คุณอนุมัติคำขอนี้ จึงบันทึกตัดจำหน่ายรายการนี้เองไม่ได้")
  assert.equal(page.titleDisposed, "ตัดจำหน่ายแล้ว · {date}")
  assert.equal(page.titleRejected, "ไม่อนุมัติ · {remark}")
  assert.equal(page.restoredTo, "ทรัพย์สินกลับเป็น{status}")
  assert.equal(page.noPhoto, "คำขอนี้ยังไม่มีรูป · แนบรูปได้ที่นี่")
  assert.equal(page.uploadFailedNoPhoto, "อัปโหลดไม่สำเร็จ {count} ไฟล์ · คำขอนี้ยังไม่มีรูป")
  assert.equal(page.evidenceHint, "เพิ่มรูปได้ระหว่างรอพิจารณา ผู้พิจารณาจะเห็นทันที")
  assert.deepEqual(page.steps, { request: "ยื่นคำขอ", decision: "พิจารณา", round: "บันทึกในรอบตัดจำหน่าย" })
  const en = messages("en").disposalPage as Record<string, Record<string, unknown>>
  assert.deepEqual(Object.keys(en.requestPage).sort(), Object.keys(page).sort())
  assert.doesNotMatch(JSON.stringify(page), /จริง/)
})
