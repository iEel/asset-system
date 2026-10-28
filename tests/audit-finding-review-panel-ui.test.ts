import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The findings review panel (group 2 spec §10, plan 4 Task 4): the server panel, the client decision, the page's slot
// and the words. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PANEL = "src/components/audit/audit-finding-review-panel.tsx"
const DECISION = "src/components/audit/audit-finding-decision.tsx"
const PAGE = "src/app/[locale]/(dashboard)/audit/findings/page.tsx"

test("the panel: a divided ContentPanel titled with the asset, ส่วนควบของ under it, เปิดหน้าทรัพย์สิน, the type Chip, the state badges and the round, under Task 3's two hooks (group 2 spec §10, decision 6, P4-R2)", () => {
  const source = read(PANEL)
  assert.doesNotMatch(source, /^"use client"/m, "a server component: the page hands it the finding")
  assert.match(source, /data: AuditFindingsPanel\n/)
  assert.match(source, /<div data-audit-finding-panel data-finding-id=\{finding\.id\} className="min-w-0">\n\s+<ContentPanel\n\s+divided\n\s+title=\{assetLabel\}\n\s+description=\{finding\.parent \? t\("componentOfParent", \{ assetTag: finding\.parent\.assetTag, name: finding\.parent\.name \}\) : undefined\}/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/assets\/\$\{finding\.asset\.id\}`\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}>\n\s+\{t\("openAsset"\)\}/)
  assert.match(source, /<li>\n\s+<Chip>\{t\(`type_\$\{finding\.findingType\}`\)\}<\/Chip>\n\s+<\/li>/)
  assert.match(source, /<StatusBadge label=\{badge\.label\} status=\{badge\.status\} tone=\{badge\.tone\} \/>/)
  assert.match(source, /<span className="tag">\{finding\.auditRound\.auditNo\}<\/span>/)
})

test("the four-field comparison: one KeyValueList; a different field strikes the expected value and carries ไม่ตรง; an empty value is Nil and an unknown id reads ไม่อยู่ในรายการ (group 2 spec §5, §10)", () => {
  const source = read(PANEL)
  assert.match(source, /const comparison = auditFindingComparisonRows\(finding\.findingType, finding\.auditItem\)\.map\(\(row\) => \(\{/)
  assert.match(source, /<span data-audit-finding-field=\{row\.field\} data-mismatch=\{row\.mismatch \? "true" : undefined\} className="inline-flex flex-wrap items-center gap-x-1\.5 gap-y-1">/)
  assert.match(source, /<span className="text-muted-foreground line-through">\{valueText\(row\.expectedId\) \?\? <Nil \/>\}<\/span>/)
  assert.match(source, /<StatusBadge label=\{tScan\("fieldMismatch"\)\} tone="warning" \/>/)
  assert.match(source, /const valueText = \(id: string \| null\) => \(id \? \(labels\.get\(id\) \?\? tScan\("valueNotInList"\)\) : null\)/)
  assert.match(source, /\{comparison\.length > 0 \? \(\n\s+<div data-audit-finding-comparison>\n\s+<KeyValueList items=\{comparison\} \/>/)
  assert.doesNotMatch(source, /function (?:Info|InfoRow|DetailItem|FindingComparison|ReviewItem|ReviewValue|ReviewPreviewField)\b|"-"|\btext-xs\b|\bdark:/)
})

test("the photo, the remark, ตรวจโดย … · time · ห้อง, and for a pending finding the consequence sentence from the approval effect and its word (group 2 spec §10, P4-R24)", () => {
  const source = read(PANEL)
  assert.match(source, /const photo = finding\.evidence\.filter\(\(attachment\) => isThumbnailable\(attachment\.fileType\)\)\.at\(-1\) \?\? null/, "the check's own photo: the oldest image, since closure files come later (P4-R33)")
  assert.match(source, /<AssetPhotoFrame key=\{photo\.id\} attachmentId=\{photo\.id\} alt=\{photo\.originalName\} canUpload=\{false\} className="h-56" \/>/, "a new photo never inherits the last one's failed load (P4-R33)")
  assert.match(source, /\{ key: "scanRemark", label: t\("scanRemark"\), value: finding\.remark \}/)
  assert.match(source, /const reporter = data\.reporterLabel \?\? tCommon\("noValue"\)/)
  assert.match(source, /finding\.findingType === "not_found" \? t\("reportedNotFoundBy", \{ name: reporter \}\) : t\("inspectedBy", \{ name: reporter \}\)/)
  assert.match(source, /<p data-audit-finding-inspected className="text-meta text-muted-foreground">\{inspected\}<\/p>/)
  assert.match(source, /\{finding\.reviewStatus === "pending" \? \(\n\s+<Notice tone="info" data-audit-finding-effect>\n\s+\{effectText\(effect\)\}\n\s+<\/Notice>\n\s+\) : \(\n\s+<KeyValueList items=\{\[\{ key: "decisionRemark", label: t\("decisionRemark"\), value: finding\.reviewRemark \}\]\} \/>/)
  assert.match(source, /\? t\("effectChange", \{ field: fieldLabel\(effect\.field\), from: valueText\(effect\.from\) \?\? t\("effectNoValue"\), to: valueText\(effect\.to\) \?\? t\("effectNoValue"\) \}\)\n\s+: t\(auditFindingApprovalEffectKey\(effect\)\)/)
})

test("the gate: the decision for an approver (kept mounted for the approve-all result), the own-finding and closed-round sentences, the follow-up only where it can be saved, the freshness banner above the decision (roles M4, P4-R10, Appendix A §10)", () => {
  const source = read(PANEL)
  assert.match(source, /const gate = auditFindingPanelGate\(\{ canApprove, reviewStatus: finding\.reviewStatus, reportedByViewer: finding\.reportedByViewer, readOnly: data\.readOnly \}\)/)
  assert.match(source, /\{gate\.decide === "ownFinding" \? <Notice tone="warning">\{t\("segregationReviewBlocked"\)\}<\/Notice> : null\}/)
  assert.match(source, /\{gate\.decide === "roundReadOnly" \? <Notice tone="neutral">\{t\("roundReadOnlyReview"\)\}<\/Notice> : null\}/)
  assert.match(source, /<AuditFindingDecision\n\s+key=\{finding\.id\}\n\s+findingId=\{finding\.id\}\n\s+typeLabel=\{t\(`type_\$\{finding\.findingType\}`\)\}\n\s+decidable=\{gate\.decide === "open"\}\n\s+effectKind=\{effect\.kind\}\n\s+position=\{data\.queue\?\.position \?\? null\}\n\s+total=\{data\.queue\?\.total \?\? 0\}/)
  assert.match(source, /nextHref=\{data\.queue\?\.nextHref \?\? null\}\n\s+nextHrefAfterSiblings=\{data\.queue\?\.nextHrefAfterSiblings \?\? null\}\n\s+closeHref=\{closeHref\}/)
  assert.match(source, /<DataFreshnessBanner\n\s+loadedAtIso=\{loadedAtIso\}\n\s+loadedAtLabel=\{loadedAtLabel\}/)
  assert.match(source, /const siblings = auditFindingApproveAllSiblings\(data\.siblings\)\.map\(\(sibling\) => \(\{/)
  assert.doesNotMatch(source, /isSameAuditActor|viewerId/, "who reported it is Task 2's reportedByViewer (P4-R20)")
})

test("the follow-up section: plan, owner by name and due date, แผนแก้ไข / ปิดรายการไม่ตรง, the evidence list and the disposal request (Appendix A §10, P4-R11)", () => {
  const source = read(PANEL)
  assert.match(source, /<section aria-labelledby=\{`audit-finding-follow-up-\$\{finding\.id\}`\} data-audit-finding-follow-up className="grid gap-3 border-t border-border-soft pt-5">/)
  assert.match(source, /\{ key: "actionOwner", label: t\("actionOwner"\), value: finding\.ownerLabel, nilLabel: t\("noActionOwner"\) \}/)
  assert.match(source, /\{gate\.followUp \? \(\n\s+<AuditFindingFollowUpActions\n\s+findingId=\{finding\.id\}\n\s+actionStatus=\{finding\.actionStatus\}/)
  assert.match(source, /evidenceCount=\{finding\.evidence\.length\}/)
  assert.match(source, /\n\s+\{evidence\}\n/)
  assert.match(source, /\{disposalHref \? \(\n\s+<Link href=\{disposalHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /actionOwnerId \?\?|employeeLabelById/, "the owner is a name or Nil, never an id (P4-R11)")
})

test("no finding open: the empty panel says to choose one, that the chosen one was not found, or that nothing is left to decide (P4-R18)", () => {
  const source = read(PANEL)
  assert.match(source, /export async function AuditFindingReviewPanelEmpty\(\{ state \}: \{ state: "choose" \| "notFound" \| "done" \}\)/)
  assert.match(source, /<div data-audit-finding-panel-empty className="min-w-0">\n\s+<ContentPanel title=\{t\("panelTitle"\)\}>/)
  assert.match(source, /<EmptyNote tone=\{state === "done" \? "clear" : "empty"\} role="status">\n\s+\{state === "done" \? t\("panelEmptyDone"\) : state === "notFound" \? t\("panelNotFound"\) : t\("panelEmpty"\)\}/)
})

test("deciding: the reason box, approve primary and reject danger with k จาก N, no confirm dialog, then Task 2's next finding (group 2 spec §10, decision 5, P4-R18, P4-R25, P4-R27)", () => {
  const source = read(DECISION)
  assert.match(source, /^"use client"/)
  assert.match(source, /<Field label=\{t\("reviewReasonLabel"\)\} id=\{FIELD_IDS\.reviewRemark\} error=\{fieldErrors\.errors\.reviewRemark === "required" \? t\("reviewReasonRequired"\) : fieldErrors\.message\("reviewRemark"\)\}>/)
  assert.match(source, /<Button onClick=\{\(\) => decide\("approve"\)\} busy=\{phase === "approve"\} disabled=\{phase !== null && phase !== "approve"\}>\n\s+<Check aria-hidden="true" \/>\n\s+\{conflict \? t\("reviewConfirmConflict"\) : t\("approve"\)\}/)
  assert.match(source, /<Button variant="danger" onClick=\{\(\) => decide\("reject"\)\} busy=\{phase === "reject"\} disabled=\{phase !== null && phase !== "reject"\}>\n\s+<X aria-hidden="true" \/>\n\s+\{t\("reject"\)\}/)
  assert.match(source, /\{position !== null \? \(\n\s+<span data-audit-finding-position className="num text-meta text-muted-foreground">\n\s+\{t\("positionOf", \{ index: formatCount\(position\), total: formatCount\(total\) \}\)\}/)
  assert.match(source, /body: JSON\.stringify\(\{ action, reviewRemark: reviewRemark\.trim\(\), confirmConflict \}\)/)
  assert.match(source, /const \{ payload, outcome \} = await send\(findingId, action, action === "approve" && conflict !== null\)/)
  assert.match(source, /function moveOn\(href: string \| null\) \{\n\s+router\.replace\(href \?\? closeHref, \{ scroll: false \}\)\n\s+\}/)
  assert.match(source, /toast\.success\(action === "reject" \? t\("rejectedSuccess"\) : effectKind === "change" \? t\("approvedSuccess"\) : t\("approvedSuccessNoRegisterChange"\)\)\n\s+moveOn\(nextHref\)/)
  assert.doesNotMatch(source, /AccessibleDialog|ConfirmTextDialog|window\.(?:confirm|prompt)|<form\b|<button\b|toast\.(?:error|warning)\(|nextAuditFindingHref|nextPageHref/)
})

test("a refusal: a 409 warns in the panel and the next approve confirms it, a reason the server refuses lands under the box, a finding decided elsewhere refreshes (group 2 spec §10, P4-R6)", () => {
  const source = read(DECISION)
  assert.match(source, /if \(outcome\.reason === "assetChanged"\) \{\n\s+setConflict\(payload as ReviewConflictPayload\)\n\s+return\n\s+\}/)
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/)
  assert.match(source, /if \(outcome\.reason === "alreadyDecided"\) router\.refresh\(\)/)
  assert.match(source, /<Notice tone="warning" role="alert" title=\{t\("reviewConflictTitle"\)\}>\{t\("reviewConflictHelp"\)\}<\/Notice>/)
})

test("อนุมัติทุกช่องของทรัพย์สินนี้: one review per finding in turn, never confirming a conflict, folded by the shared classifier; a failure stays on the panel as สำเร็จ X · ไม่สำเร็จ Y in a Notice, never a warning toast (group 2 spec §10, §15, P4-R23)", () => {
  const source = read(DECISION)
  assert.match(source, /for \(const id of \[findingId, \.\.\.siblings\.map\(\(sibling\) => sibling\.id\)\]\) \{/)
  assert.match(source, /results\.push\(\{ id, outcome: \(await send\(id, "approve", false\)\)\.outcome \}\)/)
  assert.match(source, /results\.push\(\{ id, outcome: \{ ok: false, reason: "failed" \} \}\)/)
  assert.match(source, /const \{ succeeded, failed \} = foldAuditFindingBatchResults\(results\)/)
  assert.match(source, /moveOn\(nextHrefAfterSiblings\)/)
  assert.match(source, /<Notice tone="warning" role="status" title=\{t\("reviewResultSummary", \{ succeeded: formatCount\(result\.succeeded\), failed: formatCount\(result\.failed\.length\) \}\)\}>/)
  assert.match(source, /reason: t\(`reviewFailure_\$\{failure\.reason\}`\)/)
  assert.match(source, /failed: failed\.map\(\(failure\) => \(\{ \.\.\.failure, label: labelById\.get\(failure\.id\) \?\? typeLabel \}\)\)/, "each failure keeps its label: the refresh drops a sibling decided elsewhere")
  assert.match(source, /type: failure\.label,/)
  assert.match(source, /if \(!decidable && !result\) return null/)
})

test("the page fills Task 3's slot with the panel or the empty panel, passes Task 2's data and the freshness to it, and keeps no review trigger, badge list or banner of its own (group 2 spec §10, P4-R18, P4-R20)", () => {
  const page = read(PAGE)
  assert.match(page, /const panel = data\.panel \? \(\n\s+<AuditFindingReviewPanel\n\s+locale=\{locale\}\n\s+data=\{data\.panel\}\n\s+canApprove=\{canApprove\}\n\s+employees=\{data\.employees\}\n/)
  assert.match(page, /evidence=\{\n\s+<AuditFindingEvidenceList\n\s+attachments=\{data\.panel\.finding\.evidence\}/)
  assert.match(page, /disposalHref=\{disposalHrefFor\(data\.panel\.finding\)\}/)
  assert.match(page, /loadedAtIso=\{data\.loadedAt\.toISOString\(\)\}/)
  assert.match(page, /closeHref=\{closeHref\}/)
  assert.match(page, /<AuditFindingReviewPanelEmpty state=\{findingId \? "notFound" : data\.reviewableTotal === 0 && \(view\.tab === "pending" \|\| view\.tab === "all"\) \? "done" : "choose"\} \/>/, "done only on รอพิจารณา and ทั้งหมด, the tabs whose work is deciding (P4-R32)")
  assert.match(page, /\{chosen \? <AuditFindingPaneTop key=\{chosen\.id\} \/> : null\}\n\s+\{chosen \? <PageBackLink href=\{closeHref\} label=\{t\("backToList"\)\} className="mb-3 xl:hidden" \/> : null\}\n\s+\{panel\}/, "the next finding opens at its top (P4-R13, P4-R31)")
  assert.doesNotMatch(page, /<DataFreshnessBanner\b|<AuditFindingReviewActions\b|import \{ DataFreshnessBanner \}|function FindingStatusBadges|data-audit-finding-panel-body|chosenDisposalHref/)
})

test("the panel's words in th and en (glossary: รายการไม่ตรง, พิจารณา, ผู้ถือครอง, ที่ตั้ง); Task 3's words are reused; the decision dialog's words are gone", () => {
  const th = JSON.parse(read("messages/th.json")).auditFinding as Record<string, string | undefined>
  const en = JSON.parse(read("messages/en.json")).auditFinding as Record<string, string | undefined>
  const words: Record<string, [string, string]> = {
    effectChange: ["ถ้าอนุมัติ ทะเบียนจะเปลี่ยน{field} จาก {from} เป็น {to}", "If approved, the register's {field} changes from {from} to {to}"],
    effectNoChangeOutOfScope: ["อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย", "Approving leaves the register as it is. To move the asset, make a transfer."],
    effectNoChangeNotFound: ["อนุมัติแล้วทะเบียนจะไม่เปลี่ยน", "Approving leaves the register as it is."],
    reviewReasonLabel: ["เหตุผล (ต้องกรอกเมื่อปฏิเสธ)", "Reason (required to reject)"],
    reviewReasonRequired: ["กรุณาระบุเหตุผลการปฏิเสธ", "Enter a reason to reject."],
    positionOf: ["{index} จาก {total}", "{index} of {total}"],
    approveAllFields: ["อนุมัติทุกช่องของทรัพย์สินนี้", "Approve every field of this asset"],
    reviewResultSummary: ["สำเร็จ {succeeded} · ไม่สำเร็จ {failed}", "{succeeded} done · {failed} not done"],
    reviewFailure_assetChanged: ["ข้อมูลทรัพย์สินเปลี่ยนหลังรายงาน ให้พิจารณารายการนี้ในแผงพิจารณา", "The asset changed after the report; decide this one in the review panel"],
    reviewFailure_alreadyDecided: ["มีการพิจารณารายการนี้แล้ว", "Already decided"],
    roundReadOnlyReview: ["รอบตรวจนับนี้ปิดหรือยกเลิกแล้ว จึงพิจารณาหรือบันทึกแผนแก้ไขไม่ได้", "This audit round is closed or cancelled, so its discrepancies cannot be decided or planned."],
    panelEmptyDone: ["ไม่มีรายการรอพิจารณาในตัวกรองนี้แล้ว", "Nothing is left to decide in these filters"],
    // Task 3's, reused.
    componentOfParent: ["ส่วนควบของ {assetTag} {name}", "Component of {assetTag} {name}"],
    openAsset: ["เปิดหน้าทรัพย์สิน", "Open the asset"],
  }
  for (const [key, [thText, enText]] of Object.entries(words)) {
    assert.equal(th[key], thText, key)
    assert.equal(en[key], enText, key)
  }
  for (const reason of ["assetChanged", "alreadyDecided", "ownFinding", "reasonRequired", "roundReadOnly", "notFound", "failed"]) {
    assert.equal(typeof th[`reviewFailure_${reason}`], "string", reason)
    assert.equal(typeof en[`reviewFailure_${reason}`], "string", reason)
  }
  for (const gone of ["reviewDecisionTitle_approve", "reviewDecisionTitle_reject", "reviewDecisionImpactTitle_approve", "reviewDecisionImpactTitle_reject", "reviewDecisionHelp_approve", "reviewDecisionHelp_reject", "reviewRemarkLabel_approve", "reviewRemarkLabel_reject", "reviewSubmit_approve", "reviewSubmit_reject", "effectNoChange", "openAssetPage", "panelEmptyChoose"]) {
    assert.equal(th[gone], undefined, gone)
    assert.equal(en[gone], undefined, gone)
  }
})
