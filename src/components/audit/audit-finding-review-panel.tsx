import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { Archive, ArrowRight } from "lucide-react"
import { AssetPhotoFrame } from "@/components/assets/asset-photo-frame"
import { AuditFindingDecision } from "@/components/audit/audit-finding-decision"
import { AuditFindingFollowUpActions } from "@/components/audit/audit-finding-review-actions"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataFreshnessBanner } from "@/components/ui/data-freshness-banner"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { isThumbnailable } from "@/lib/attachment-thumbnail"
import {
  auditFindingApprovalEffect,
  auditFindingApprovalEffectKey,
  auditFindingApproveAllSiblings,
  auditFindingComparisonRows,
  auditFindingPanelGate,
  type AuditFindingApprovalEffect,
  type AuditFindingComparisonField,
} from "@/lib/audit-finding-review-panel-rules"
import type { AuditFindingsPanel } from "@/lib/audit-findings-page-data"
import { formatDateTime } from "@/lib/utils"

// The page's state badges of a finding (its findingStatusBadges).
export type AuditFindingStatusBadge = { key: string; title: string; label: string; status?: string; tone?: StatusTone }

// The review panel of the findings page (group 2 spec §10, plan 4 Task 4): the chosen finding (?finding=) beside the
// table, and full screen on the phone (Task 3's slot). A server component: the page hands it Task 2's panel data
// (P4-R20). What approve does is read from auditFindingApprovalEffect, which follows the review route's own branches;
// deciding is the client AuditFindingDecision, the follow-up dialogs AuditFindingFollowUpActions.
export async function AuditFindingReviewPanel({
  locale,
  data,
  canApprove,
  employees,
  statusBadges,
  evidence,
  disposalHref,
  loadedAtIso,
  loadedAtLabel,
  closeHref,
}: {
  locale: string
  data: AuditFindingsPanel
  canApprove: boolean
  employees: { id: string; label: string }[]
  statusBadges: readonly AuditFindingStatusBadge[]
  /** The page's AuditFindingEvidenceList of this finding. */
  evidence: ReactNode
  disposalHref: string | null
  loadedAtIso: string
  loadedAtLabel: string
  /** The list without a finding: where the panel goes when nothing is left to decide. */
  closeHref: string
}) {
  const t = await getTranslations("auditFinding")
  const tRound = await getTranslations("auditRound")
  const tScan = await getTranslations("auditScan")
  const tCommon = await getTranslations("common")
  const { finding, labels } = data
  const fieldLabel = (field: AuditFindingComparisonField) => tRound(`differenceField_${field}`)
  // An id the lookups do not know reads ไม่อยู่ในรายการ, never the raw id (group 2 spec §5).
  const valueText = (id: string | null) => (id ? (labels.get(id) ?? tScan("valueNotInList")) : null)
  // The consequence sentence (P4-R24): a field change in words, else the word of its kind.
  const effectText = (effect: AuditFindingApprovalEffect) =>
    effect.kind === "change"
      ? t("effectChange", { field: fieldLabel(effect.field), from: valueText(effect.from) ?? t("effectNoValue"), to: valueText(effect.to) ?? t("effectNoValue") })
      : t(auditFindingApprovalEffectKey(effect))
  const effect = auditFindingApprovalEffect(finding)
  const gate = auditFindingPanelGate({ canApprove, reviewStatus: finding.reviewStatus, reportedByViewer: finding.reportedByViewer, readOnly: data.readOnly })
  const siblings = auditFindingApproveAllSiblings(data.siblings).map((sibling) => ({
    id: sibling.id,
    typeLabel: t(`type_${sibling.findingType}`),
    effectText: effectText(auditFindingApprovalEffect(sibling)),
  }))
  const assetLabel = finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo
  // finding.evidence is newest first (Task 2). Closure files from ปิดรายการไม่ตรง are newer than the check's own photo,
  // so the check's photo is the oldest image (P4-R33).
  const photo = finding.evidence.filter((attachment) => isThumbnailable(attachment.fileType)).at(-1) ?? null
  const reporter = data.reporterLabel ?? tCommon("noValue")
  const room = valueText(finding.auditItem.actualLocationId)
  const inspected = [
    finding.findingType === "not_found" ? t("reportedNotFoundBy", { name: reporter }) : t("inspectedBy", { name: reporter }),
    formatDateTime(finding.reportedAt),
    finding.findingType !== "not_found" && room ? t("roomLabel", { room }) : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ")
  const comparison = auditFindingComparisonRows(finding.findingType, finding.auditItem).map((row) => ({
    key: row.field,
    label: fieldLabel(row.field),
    value: (
      <span data-audit-finding-field={row.field} data-mismatch={row.mismatch ? "true" : undefined} className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {row.mismatch ? (
          <>
            <span className="sr-only">{t("systemValue")}: </span>
            <span className="text-muted-foreground line-through">{valueText(row.expectedId) ?? <Nil />}</span>
            <ArrowRight aria-hidden="true" className="size-3.5 text-faint-foreground" />
            <span className="sr-only">{t("foundValue")}: </span>
            <span className="font-medium">{valueText(row.foundId) ?? <Nil />}</span>
            <StatusBadge label={tScan("fieldMismatch")} tone="warning" />
          </>
        ) : (
          (valueText(row.expectedId) ?? <Nil />)
        )}
      </span>
    ),
  }))

  return (
    <div data-audit-finding-panel data-finding-id={finding.id} className="min-w-0">
      <ContentPanel
        divided
        title={assetLabel}
        description={finding.parent ? t("componentOfParent", { assetTag: finding.parent.assetTag, name: finding.parent.name }) : undefined}
        actions={
          finding.asset ? (
            <Link href={`/${locale}/assets/${finding.asset.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t("openAsset")}
            </Link>
          ) : undefined
        }
      >
        <div className="grid gap-5">
          <div className="grid gap-2">
            <ul data-audit-finding-badges className="flex flex-wrap items-center gap-2">
              <li>
                <Chip>{t(`type_${finding.findingType}`)}</Chip>
              </li>
              {statusBadges.map((badge) => (
                <li key={badge.key} title={`${badge.title}: ${badge.label}`}>
                  <span className="sr-only">{badge.title}: </span>
                  <StatusBadge label={badge.label} status={badge.status} tone={badge.tone} />
                </li>
              ))}
            </ul>
            <p className="text-meta text-muted-foreground">
              {t("auditRound")}{" "}
              <Link href={`/${locale}/audit/rounds/${finding.auditRound.id}`} className={linkVariants({ size: "inherit" })}>
                <span className="tag">{finding.auditRound.auditNo}</span>
              </Link>
              {" · "}
              {finding.auditRound.name}
            </p>
          </div>

          {comparison.length > 0 ? (
            <div data-audit-finding-comparison>
              <KeyValueList items={comparison} />
            </div>
          ) : null}

          {photo || finding.remark ? (
            <div className="grid gap-3">
              {photo ? <AssetPhotoFrame key={photo.id} attachmentId={photo.id} alt={photo.originalName} canUpload={false} className="h-56" /> : null}
              {finding.remark ? <KeyValueList items={[{ key: "scanRemark", label: t("scanRemark"), value: finding.remark }]} /> : null}
            </div>
          ) : null}
          <p data-audit-finding-inspected className="text-meta text-muted-foreground">{inspected}</p>

          {finding.reviewStatus === "pending" ? (
            <Notice tone="info" data-audit-finding-effect>
              {effectText(effect)}
            </Notice>
          ) : (
            <KeyValueList items={[{ key: "decisionRemark", label: t("decisionRemark"), value: finding.reviewRemark }]} />
          )}

          <DataFreshnessBanner
            loadedAtIso={loadedAtIso}
            loadedAtLabel={loadedAtLabel}
            labels={{
              freshTitle: t("freshnessFreshTitle"),
              freshHelp: t("freshnessFreshHelp"),
              staleTitle: t("freshnessStaleTitle"),
              staleHelp: t("freshnessStaleHelp"),
              refresh: t("freshnessRefresh"),
            }}
          />
          {gate.decide === "ownFinding" ? <Notice tone="warning">{t("segregationReviewBlocked")}</Notice> : null}
          {gate.decide === "roundReadOnly" ? <Notice tone="neutral">{t("roundReadOnlyReview")}</Notice> : null}
          {gate.decide === "noPermission" ? null : (
            <AuditFindingDecision
              key={finding.id}
              findingId={finding.id}
              typeLabel={t(`type_${finding.findingType}`)}
              decidable={gate.decide === "open"}
              effectKind={effect.kind}
              position={data.queue?.position ?? null}
              total={data.queue?.total ?? 0}
              siblings={siblings}
              nextHref={data.queue?.nextHref ?? null}
              nextHrefAfterSiblings={data.queue?.nextHrefAfterSiblings ?? null}
              closeHref={closeHref}
            />
          )}

          <section aria-labelledby={`audit-finding-follow-up-${finding.id}`} data-audit-finding-follow-up className="grid gap-3 border-t border-border-soft pt-5">
            <h3 id={`audit-finding-follow-up-${finding.id}`} className="text-sm font-semibold text-foreground">{t("followUpTitle")}</h3>
            <KeyValueList
              items={[
                { key: "actionPlan", label: t("actionPlan"), value: finding.actionPlan },
                { key: "actionOwner", label: t("actionOwner"), value: finding.ownerLabel, nilLabel: t("noActionOwner") },
                { key: "actionDueDate", label: t("actionDueDate"), value: finding.actionDueDate ? formatDateTime(finding.actionDueDate) : null },
              ]}
            />
            {gate.followUp ? (
              <AuditFindingFollowUpActions
                findingId={finding.id}
                actionStatus={finding.actionStatus}
                actionPlan={finding.actionPlan}
                actionOwnerId={finding.actionOwnerId}
                actionDueDate={finding.actionDueDate}
                evidenceCount={finding.evidence.length}
                employees={employees}
              />
            ) : null}
            {evidence}
            {disposalHref ? (
              <Link href={disposalHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                <Archive aria-hidden="true" />
                {t("openDisposalRequest")}
              </Link>
            ) : null}
          </section>
        </div>
      </ContentPanel>
    </div>
  )
}

// The slot with no finding open (P4-R18): what to do, an unknown ?finding=, or that the filters hold nothing left to
// decide. Task 3's words, and the same hook as Task 3's empty slot.
export async function AuditFindingReviewPanelEmpty({ state }: { state: "choose" | "notFound" | "done" }) {
  const t = await getTranslations("auditFinding")
  return (
    <div data-audit-finding-panel-empty className="min-w-0">
      <ContentPanel title={t("panelTitle")}>
        <EmptyNote tone={state === "done" ? "clear" : "empty"} role="status">
          {state === "done" ? t("panelEmptyDone") : state === "notFound" ? t("panelNotFound") : t("panelEmpty")}
        </EmptyNote>
      </ContentPanel>
    </div>
  )
}
