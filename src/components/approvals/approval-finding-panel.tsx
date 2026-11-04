import { getTranslations } from "next-intl/server"
import { ApprovalInboxSeen } from "@/components/approvals/approval-inbox-seen"
import { AuditFindingEvidenceList } from "@/components/audit/audit-finding-evidence-list"
import { AuditFindingReviewPanel, type AuditFindingStatusBadge } from "@/components/audit/audit-finding-review-panel"
import type { AuditFindingPanelLoad } from "@/lib/audit-findings-page-data"
import { formatDateTime } from "@/lib/utils"

export type ApprovalFindingQueue = {
  position: number | null
  total: number
  nextHref: string | null
  nextHrefAfterSiblings: string | null
}

// A finding in the approvals panel (group 6 spec §7.5): the group-2 review panel as the findings page renders it, with
// the inbox's queue in place of the findings list's: its "k จาก N" and its next item (past the siblings after
// "อนุมัติทุกช่องของทรัพย์สินนี้"). The panel's own approve, reject and 409 confirm stay.
export async function ApprovalFindingPanel({
  locale,
  load,
  queue,
  closeHref,
  disposalHref,
  loadedAt,
}: {
  locale: string
  load: AuditFindingPanelLoad
  queue: ApprovalFindingQueue
  closeHref: string
  disposalHref: string | null
  loadedAt: Date
}) {
  const t = await getTranslations({ locale, namespace: "auditFinding" })
  const { finding } = load.panel
  // The inbox shows pending findings only (a decided one reads the stale notice): its state badge is รอพิจารณา.
  const statusBadges: AuditFindingStatusBadge[] =
    finding.reviewStatus === "pending"
      ? [{ key: "resolutionState", title: t("resolutionState"), label: t("resolutionStatePendingReview"), tone: "warning" }]
      : [{ key: "reviewStatus", title: t("reviewStatus"), label: t(`status_${finding.reviewStatus}`), status: finding.reviewStatus }]

  return (
    <div data-approval-finding-panel={finding.id} className="min-w-0">
      <ApprovalInboxSeen itemKey={`finding:${finding.id}`} />
      <AuditFindingReviewPanel
        locale={locale}
        data={{ ...load.panel, queue: { ...queue } }}
        canApprove
        employees={load.employees}
        statusBadges={statusBadges}
        evidence={
          <AuditFindingEvidenceList
            attachments={finding.evidence}
            labels={{
              title: t("evidenceAttachments"),
              count: t("evidenceAttachmentCount", { count: finding.evidence.length }),
              open: t("openEvidenceAttachment"),
            }}
          />
        }
        disposalHref={disposalHref}
        loadedAtIso={loadedAt.toISOString()}
        loadedAtLabel={formatDateTime(loadedAt)}
        closeHref={closeHref}
      />
    </div>
  )
}
