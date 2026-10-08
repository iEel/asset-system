import type { WorkflowApprovalPolicy } from "@/lib/workflow-approval"

export type ApprovalInboxKind =
  | "disposal_review"
  | "audit_finding_review"
  | "audit_round_close"

export type ApprovalInboxItem = {
  id: string
  kind: ApprovalInboxKind
  module: "disposal" | "audit"
  recordId: string
  title: string
  description: string
  requestedBy: string
  requestedAt: Date
  actionLabel: string
  href: string
  tone: "danger" | "warning" | "primary"
}

export type ApprovalInboxSource = {
  locale: string
  policy: WorkflowApprovalPolicy
  disposalRequests: Array<{
    id: string
    disposalNo: string
    assetTag: string
    assetName: string
    requestedBy: string
    requestDate: Date
  }>
  auditFindings: Array<{
    id: string
    auditNo: string
    findingType: string
    assetTag: string | null
    reportedBy: string
    reportedAt: Date
  }>
  auditRoundsReadyToClose: Array<{
    id: string
    auditNo: string
    name: string
    createdBy: string
    updatedAt: Date
  }>
}

export function buildApprovalInboxItems(source: ApprovalInboxSource): ApprovalInboxItem[] {
  const items: ApprovalInboxItem[] = []
  const copy = approvalInboxCopy(source.locale)

  if (source.policy.auditCloseRequired) {
    for (const round of source.auditRoundsReadyToClose) {
      items.push({
        id: `audit-round-close:${round.id}`,
        kind: "audit_round_close",
        module: "audit",
        recordId: round.id,
        title: `${round.auditNo} - ${round.name}`,
        description: copy.auditRoundReady,
        requestedBy: round.createdBy,
        requestedAt: round.updatedAt,
        actionLabel: copy.auditRoundAction,
        href: `/${source.locale}/audit/rounds/${round.id}`,
        tone: "primary",
      })
    }
  }

  for (const finding of source.auditFindings) {
    items.push({
      id: `audit-finding-review:${finding.id}`,
      kind: "audit_finding_review",
      module: "audit",
      recordId: finding.id,
      title: `${finding.auditNo} - ${finding.assetTag ?? finding.findingType}`,
      description: `${copy.findingReview}: ${humanizeApprovalKey(finding.findingType)}`,
      requestedBy: finding.reportedBy,
      requestedAt: finding.reportedAt,
      actionLabel: copy.findingAction,
      href: `/${source.locale}/audit/findings?status=pending`,
      tone: "warning",
    })
  }

  if (source.policy.disposalRequired) {
    for (const request of source.disposalRequests) {
      items.push({
        id: `disposal-review:${request.id}`,
        kind: "disposal_review",
        module: "disposal",
        recordId: request.id,
        title: `${request.disposalNo} - ${request.assetTag}`,
        description: copy.disposalReady(request.assetName),
        requestedBy: request.requestedBy,
        requestedAt: request.requestDate,
        actionLabel: copy.disposalAction,
        href: `/${source.locale}/disposal/${request.id}`,
        tone: "danger",
      })
    }
  }

  return items.sort((a, b) => {
    const toneOrder = tonePriority(b.tone) - tonePriority(a.tone)
    if (toneOrder !== 0) return toneOrder
    return b.requestedAt.getTime() - a.requestedAt.getTime()
  })
}

export function summarizeApprovalInbox(items: ApprovalInboxItem[]) {
  return {
    total: items.length,
    disposal: items.filter((item) => item.module === "disposal").length,
    audit: items.filter((item) => item.module === "audit").length,
  }
}

function tonePriority(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return 3
  if (tone === "warning") return 2
  return 1
}

function humanizeApprovalKey(value: string) {
  return value.replaceAll("_", " ")
}

function approvalInboxCopy(locale: string) {
  if (locale === "th") {
    return {
      auditRoundReady: "รอบตรวจนับพร้อมปิดแล้ว ไม่มีรายการค้างที่ต้องตัดสินใจ",
      auditRoundAction: "อนุมัติปิดรอบตรวจนับ",
      findingReview: "รายการไม่ตรงรอพิจารณา",
      findingAction: "พิจารณารายการไม่ตรง",
      disposalReady: (assetName: string) => `คำขอตัดจำหน่าย ${assetName} รออนุมัติ`,
      disposalAction: "พิจารณาตัดจำหน่าย",
    }
  }

  return {
    auditRoundReady: "Audit round is ready to close with no pending decision items.",
    auditRoundAction: "Approve Round Closure",
    findingReview: "Discrepancy awaiting decision",
    findingAction: "Decide Discrepancy",
    disposalReady: (assetName: string) => `Disposal request for ${assetName} is awaiting approval.`,
    disposalAction: "Decide Disposal",
  }
}
