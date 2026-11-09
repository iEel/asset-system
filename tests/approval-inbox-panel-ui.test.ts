import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/admin/approvals/page.tsx"
const FINDINGS_PAGE = "src/app/[locale]/(dashboard)/audit/findings/page.tsx"
const DISPOSAL_PANEL = "src/components/approvals/approval-disposal-panel.tsx"
const DECISION = "src/components/approvals/approval-disposal-decision.tsx"
// Group 6 plan 3 P3-R2: the gallery moved to components/disposal, shared with the request page.
const GALLERY = "src/components/disposal/disposal-photo-gallery.tsx"
const ROUND_PANEL = "src/components/approvals/approval-round-close-panel.tsx"
const FINDING_PANEL = "src/components/approvals/approval-finding-panel.tsx"
const SEEN = "src/components/approvals/approval-inbox-seen.tsx"
const EVIDENCE = "src/components/audit/audit-finding-evidence-list.tsx"

// Group 6 plan 2 Task 4 (spec §7.5–7.7): the approvals page's right panel.
test("disposal panel: the photo gallery on the shared photo frame and its preview dialog", () => {
  const gallery = read(GALLERY)
  assert.match(gallery, /"use client"/)
  assert.match(gallery, /<AssetPhotoFrame\b/)
  // The frame's own preview opens AttachmentPreviewDialog (the original, inline) from the large photo.
  assert.doesNotMatch(gallery, /previewable=\{false\}/)
  assert.match(read("src/components/assets/asset-photo-frame.tsx"), /<AttachmentPreviewDialog\b/)
  assert.match(gallery, /thumbnailUrl\(photo\.id\)/)
  assert.match(gallery, /size-16/)
  assert.match(gallery, /\/api\/attachments\/\$\{document\.id\}\?inline=1/)
  assert.match(gallery, /tone="warning"/)
  assert.match(read(DISPOSAL_PANEL), /<DisposalPhotoGallery\b/)
})

test("disposal panel: head, details, effect from previousStatusName, the separation-of-duties line, the foot", () => {
  const panel = read(DISPOSAL_PANEL)
  assert.doesNotMatch(panel, /"use client"/)
  assert.match(panel, /<h2\b/)
  assert.match(panel, /\/disposal\/\$\{/)
  assert.match(panel, /<KeyValueList\b/)
  assert.match(panel, /previousStatusName/)
  assert.match(panel, /t\("effectTitle"\)/)
  assert.match(panel, /t\("sodAllowed"\)/)
  assert.match(panel, /panel\.block/)
  assert.match(panel, /<ApprovalDisposalDecision\b/)
  assert.match(panel, /<ApprovalInboxSeen\b/)
  assert.match(panel, /t\("panelFoot"/)
  // A blocked request has no decision area.
  assert.match(panel, /panel\.block \? null : \(\s*<ApprovalDisposalDecision/)
})

test("disposal decision: the remark field, approve and reject, no nextStatusId, the next item after success", () => {
  const decision = read(DECISION)
  assert.match(decision, /"use client"/)
  assert.match(decision, /id="approval-disposal-remark"/)
  assert.match(decision, /t\("approve"\)/)
  assert.match(decision, /t\("reject"\)/)
  assert.doesNotMatch(decision, /nextStatusId/)
  assert.match(decision, /method: "PATCH"/)
  assert.match(decision, /JSON\.stringify\(\{ decision, approvalRemark/)
  assert.match(decision, /router\.replace\(nextHref \?\? closeHref, \{ scroll: false \}\)/)
  assert.match(decision, /router\.refresh\(\)/)
  assert.match(decision, /busy=/)
})

test("disposal decision: a stale request shows the notice; a reject with no remark stops before any request", () => {
  const decision = read(DECISION)
  assert.match(decision, /DISPOSAL_CONCURRENT_UPDATE/)
  assert.match(decision, /DISPOSAL_INVALID_STAGE/)
  assert.match(decision, /t\("staleNotice"\)/)
  assert.match(decision, /getDisposalDecisionFieldErrors\(/)
  // The local check runs, and returns, before the fetch.
  const check = decision.indexOf("getDisposalDecisionFieldErrors(")
  const focus = decision.indexOf("if (focusFirstError()) return")
  const send = decision.indexOf("await fetch(")
  assert.ok(check > 0 && focus > check && send > focus)
})

test("the seen writer records <key>:<id> in approval-inbox-seen inside try/catch", () => {
  const seen = read(SEEN)
  assert.match(seen, /"use client"/)
  assert.match(seen, /approvalInboxSeenStorageKey/)
  assert.match(seen, /addApprovalInboxSeen\(/)
  assert.match(seen, /try \{[\s\S]*sessionStorage\.setItem\(approvalInboxSeenStorageKey[\s\S]*\} catch/)
  assert.match(seen, /useEffect\(/)
  for (const path of [DISPOSAL_PANEL, ROUND_PANEL, FINDING_PANEL]) assert.match(read(path), /<ApprovalInboxSeen\b/)
})

test("round-close panel: the checklist and one primary link to the round", () => {
  const panel = read(ROUND_PANEL)
  assert.match(panel, /t\("roundOpen"\)/)
  assert.match(panel, /\/audit\/rounds\/\$\{/)
  assert.match(panel, /checklist/)
  assert.match(panel, /buttonVariants\(\{ variant: "default"/)
})

test("finding panel: the group-2 review panel fed the inbox queue; the evidence list is shared with the findings page", () => {
  const panel = read(FINDING_PANEL)
  assert.match(panel, /<AuditFindingReviewPanel\b/)
  assert.match(panel, /queue: \{/)
  assert.match(panel, /<AuditFindingEvidenceList\b/)
  assert.ok(existsSync(EVIDENCE))
  assert.match(read(EVIDENCE), /export function AuditFindingEvidenceList/)
  const findings = read(FINDINGS_PAGE)
  assert.match(findings, /from "@\/components\/audit\/audit-finding-evidence-list"/)
  assert.doesNotMatch(findings, /function AuditFindingEvidenceList/)
})

test("approvals page: the panel from the chosen kind, next from approvalInboxNeighbours, siblings skipped for a finding", () => {
  const page = read(PAGE)
  assert.match(page, /approvalInboxNeighbours\(data\.order, item\)/)
  assert.match(page, /approvalInboxNeighbours\(data\.order, item, siblingSkip\)/)
  assert.match(page, /loadDisposalInboxPanel\(/)
  assert.match(page, /loadAuditFindingPanel\(/)
  assert.match(page, /loadAuditRoundClosePanel\(/)
  assert.match(page, /<ApprovalDisposalPanel\b/)
  assert.match(page, /<ApprovalFindingPanel\b/)
  assert.match(page, /<ApprovalRoundClosePanel\b/)
  // Each kind behind its permission; a stale or hidden item reads the one notice with the link to next.
  assert.match(page, /access\.canApproveDisposal/)
  assert.match(page, /access\.canApproveAudit/)
  assert.match(page, /t\("staleNotice"\)/)
  assert.match(page, /t\("panelEmpty"\)/)
  assert.match(page, /<PageBackLink href=\{closeHref\} label=\{t\("backToInbox"\)\}/)
  // A closed or cancelled round reads the stale notice even with a clear checklist.
  assert.match(page, /round\?\.ready && round\.operational \? framed\(/)
})

test("approvals page: below xl each item, and the next after a decision, opens at the top of #main; from xl nothing moves", () => {
  const page = read(PAGE)
  assert.match(page, /\{item \? <AuditFindingPaneTop key=\{`\$\{item\.key\}:\$\{item\.id\}`\} pane="\[data-approval-panel\]" \/> : null\}/)
  const paneTop = read("src/components/audit/audit-finding-pane-top.tsx")
  assert.match(paneTop, /window\.matchMedia\("\(min-width: 1280px\)"\)/)
  assert.match(paneTop, /if \(pane\) document\.querySelector\(pane\)/)
  assert.match(paneTop, /else document\.getElementById\("main"\)\?\.scrollTo\(\{ top: 0 \}\)/)
  // The decision still replaces with scroll: false, so the list beside the panel keeps its place from xl.
  assert.match(read(DECISION), /router\.replace\(nextHref \?\? closeHref, \{ scroll: false \}\)/)
})

test("panel words are in both message files", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).approvalInboxPage
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).approvalInboxPage
  const expected: Record<string, string> = {
    openRequest: "เปิดคำขอตัดจำหน่าย",
    photoPosition: "รูปที่ {index} / {total}",
    noPhotoNotice: "คำขอนี้ยังไม่มีรูปทรัพย์สิน",
    detailReason: "เหตุผล",
    detailRequester: "ผู้ขอ",
    detailSource: "ที่มา",
    detailSerial: "Serial",
    detailPrice: "ราคาซื้อ",
    priceWithYear: "{price} บาท · ซื้อปี {year}",
    detailLocation: "ที่ตั้ง",
    detailCustodian: "ผู้ถือครอง",
    detailCondition: "สภาพ",
    effectTitle: "ผลของการตัดสินใจ",
    effectIfApprove: "ถ้าอนุมัติ",
    effectIfReject: "ถ้าปฏิเสธ",
    sodAllowed: "แยกหน้าที่: คุณไม่ใช่ผู้ขอหรือผู้สร้างคำขอนี้ จึงอนุมัติได้ · เมื่ออนุมัติแล้ว คุณจะเป็นผู้บันทึกตัดจำหน่ายรายการนี้เองไม่ได้",
    remarkLabel: "หมายเหตุการพิจารณา",
    remarkHint: "ต้องกรอกเมื่อปฏิเสธ",
    approve: "อนุมัติ",
    reject: "ปฏิเสธ",
    staleNotice: "รายการนี้ถูกตัดสินแล้วหรือไม่อยู่ในคิว",
    panelFoot: "ตัดสินใจแล้วไปรายการถัดไปอัตโนมัติ · {position} จาก {total}",
    roundOpen: "เปิดรอบตรวจนับเพื่อปิดรอบ",
    roundChecklistClear: "ไม่มีรายการค้าง · ไม่มีรายการไม่ตรงทะเบียนค้าง · ไม่มีแผนแก้ไขค้าง · ยืนยันผลตรวจครบแล้ว",
  }
  // The inbox shows the panel only while the close checklist is clear, ยืนยันผลตรวจ included (inspection-confirm plan 2 final review).
  assert.equal(en.roundChecklistClear, "No items left to check · no findings left to review · no open action plans · all audit results confirmed")
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(th[key], value, key)
    assert.equal(typeof en[key], "string", key)
  }
  // Keys may say Inbox; no Thai text does.
  assert.doesNotMatch(Object.values(th).join(" "), /Inbox/)
})
