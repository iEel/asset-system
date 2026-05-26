import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Download, FileText } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditFindingReviewActions } from "@/components/audit/audit-finding-review-actions"
import { AuditFindingsBatchActions } from "@/components/audit/audit-findings-batch-actions"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { isSameAuditActor } from "@/lib/audit-segregation"

type AuditFindingsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string }>
}

export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
  const { locale } = await params
  const { search = "", status = "pending" } = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  const canEdit = hasPermission(user, "audit", "edit")
  const canApprove = hasPermission(user, "audit", "approve")
  const canCreateDisposal = hasPermission(user, "disposal", "create")

  const t = await getTranslations("auditFinding")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const exportParams = new URLSearchParams()
  if (searchText) exportParams.set("search", searchText)
  exportParams.set("status", status)
  const [findings, employees] = await Promise.all([
    prisma.auditFinding.findMany({
    where: {
      ...(status === "all" ? {} : { reviewStatus: status }),
      ...(searchText
        ? {
            OR: [
              { findingType: { contains: searchText } },
              { auditRound: { auditNo: { contains: searchText } } },
              { auditRound: { name: { contains: searchText } } },
              { asset: { assetTag: { contains: searchText } } },
              { asset: { name: { contains: searchText } } },
            ],
          }
        : {}),
    },
    include: {
      auditRound: { select: { id: true, auditNo: true, name: true } },
      auditItem: { select: { auditStatus: true, reconcileStatus: true } },
      asset: { select: { id: true, assetTag: true, name: true } },
    },
    orderBy: { reportedAt: "desc" },
    take: 200,
    }),
    canEdit
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, code: true, fullNameTh: true },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
  ])
  const findingIds = findings.map((finding) => finding.id)
  const attachmentCounts = findingIds.length
    ? await prisma.attachment.groupBy({
        by: ["referenceId"],
        where: { module: "audit_finding", referenceId: { in: findingIds }, isActive: true },
        _count: { _all: true },
      })
    : []
  const attachmentCountByFindingId = new Map(attachmentCounts.map((row) => [row.referenceId, row._count._all]))
  const employeeOptions = employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` }))
  const employeeLabelById = new Map(employeeOptions.map((employee) => [employee.id, employee.label]))
  const valueLabels = await buildFindingValueLabels(findings)
  const batchReviewFindings = findings
    .filter((finding) => finding.reviewStatus === "pending" && !isSameAuditActor(user.id, finding.reportedBy))
    .map((finding) => ({
      id: finding.id,
      label: finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo,
      detail: `${finding.auditRound.auditNo} · ${t(`type_${finding.findingType}`)}`,
    }))

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/audit/rounds`}
        createLabel={t("backToRounds")}
      />

      <MasterDataSearch
        action={`/${locale}/audit/findings`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-wrap gap-2">
          {["pending", "approved", "rejected", "exception", "all"].map((item) => (
            <Link
              key={item}
              href={`/${locale}/audit/findings?status=${item}`}
              className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition-colors sm:h-9 sm:min-h-0 ${
                status === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:bg-accent"
              }`}
            >
              {t(`status_${item}`)}
            </Link>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={`/api/audit-findings/export?${exportParams.toString()}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"
          >
            <Download className="h-4 w-4" />
            {t("exportFindings")}
          </a>
          <a
            href={`/api/audit-findings/export-pdf?${exportParams.toString()}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"
          >
            <FileText className="h-4 w-4" />
            {t("exportFindingsPdf")}
          </a>
        </div>
      </div>

      {canApprove ? <AuditFindingsBatchActions findings={batchReviewFindings} /> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="grid gap-3 p-3 md:hidden">
          {findings.length === 0 ? (
            <ActionEmptyState
              icon={<FileText className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyHelp")}
              actionHref={`/${locale}/audit/rounds`}
              actionLabel={t("backToRounds")}
            />
          ) : (
            findings.map((finding) => (
              <div key={finding.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(finding.reportedAt)}</div>
                  </div>
                  <ReviewStatusBadge status={finding.reviewStatus} />
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <Info label={t("findingType")} value={t(`type_${finding.findingType}`)} />
                  <Info label={t("expectedValue")} value={formatFindingValue(finding.findingType, finding.expectedValue, valueLabels)} />
                  <Info label={t("actualValue")} value={formatFindingValue(finding.findingType, finding.actualValue, valueLabels)} />
                  <Info label={t("actionStatus")} value={t(`actionStatus_${finding.actionStatus}`)} />
                  <Info label={t("actionOwner")} value={finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : "-"} />
                  <Info label={t("actionDueDate")} value={formatDateTime(finding.actionDueDate)} />
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium"
                  >
                    {tCommon("view")}
                  </Link>
                  {canEdit || canApprove ? (
                    <AuditFindingReviewActions
                      findingId={finding.id}
                      reviewStatus={finding.reviewStatus}
                      actionStatus={finding.actionStatus}
                      actionPlan={finding.actionPlan}
                      actionOwnerId={finding.actionOwnerId}
                      actionDueDate={finding.actionDueDate}
                      evidenceCount={attachmentCountByFindingId.get(finding.id) ?? 0}
                      employees={employeeOptions}
                      reviewBlocked={isSameAuditActor(user.id, finding.reportedBy)}
                      reviewBlockedReason={t("segregationReviewBlocked")}
                    />
                  ) : null}
                  {canCreateDisposal && finding.asset ? (
                    <Link
                      href={`/${locale}/disposal?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-warning/40 bg-warning/5 px-3 text-sm font-medium text-warning"
                    >
                      {t("openDisposalRequest")}
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("reportedAt")}</ColumnHeader>
                <ColumnHeader>{t("auditRound")}</ColumnHeader>
                <ColumnHeader>{t("asset")}</ColumnHeader>
                <ColumnHeader>{t("findingType")}</ColumnHeader>
                <ColumnHeader>{t("expectedValue")}</ColumnHeader>
                <ColumnHeader>{t("actualValue")}</ColumnHeader>
                <ColumnHeader>{t("reviewStatus")}</ColumnHeader>
                <ColumnHeader>{t("actionStatus")}</ColumnHeader>
                <ColumnHeader>{t("actionOwner")}</ColumnHeader>
                <ColumnHeader>{t("actionDueDate")}</ColumnHeader>
                <ColumnHeader>{t("itemStatus")}</ColumnHeader>
                <ColumnHeader>{t("reconcileStatus")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-6">
                    <ActionEmptyState
                      icon={<FileText className="h-6 w-6" />}
                      title={t("emptyTitle")}
                      description={t("emptyHelp")}
                      actionHref={`/${locale}/audit/rounds`}
                      actionLabel={t("backToRounds")}
                    />
                  </td>
                </tr>
              ) : (
                findings.map((finding) => (
                  <ClickableTableRow
                    key={finding.id}
                    href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                    label={`${tCommon("view")}: ${finding.asset?.assetTag ?? finding.auditRound.auditNo}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(finding.reportedAt)}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      <Link href={`/${locale}/audit/rounds/${finding.auditRound.id}`} className="text-primary hover:underline">
                        {finding.auditRound.auditNo}
                      </Link>
                      <div className="text-xs text-muted-foreground">{finding.auditRound.name}</div>
                    </td>
                    <td className="min-w-56 px-4 py-3 text-foreground">
                      {finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{t(`type_${finding.findingType}`)}</td>
                    <td className="max-w-56 truncate px-4 py-3 text-muted-foreground">{formatFindingValue(finding.findingType, finding.expectedValue, valueLabels)}</td>
                    <td className="max-w-56 truncate px-4 py-3 text-muted-foreground">{formatFindingValue(finding.findingType, finding.actualValue, valueLabels)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ReviewStatusBadge status={finding.reviewStatus} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActionStatusBadge status={finding.actionStatus} label={t(`actionStatus_${finding.actionStatus}`)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(finding.actionDueDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{finding.auditItem.auditStatus}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{finding.auditItem.reconcileStatus ?? "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {canEdit || canApprove ? (
                        <AuditFindingReviewActions
                          findingId={finding.id}
                          reviewStatus={finding.reviewStatus}
                          actionStatus={finding.actionStatus}
                          actionPlan={finding.actionPlan}
                          actionOwnerId={finding.actionOwnerId}
                          actionDueDate={finding.actionDueDate}
                          evidenceCount={attachmentCountByFindingId.get(finding.id) ?? 0}
                          employees={employeeOptions}
                          reviewBlocked={isSameAuditActor(user.id, finding.reportedBy)}
                          reviewBlockedReason={t("segregationReviewBlocked")}
                        />
                      ) : "-"}
                      {canCreateDisposal && finding.asset ? (
                        <Link
                          href={`/${locale}/disposal?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`}
                          className="ml-2 inline-flex h-8 items-center rounded-md border border-warning/40 bg-warning/5 px-2 text-xs font-medium text-warning"
                        >
                          {t("openDisposalRequest")}
                        </Link>
                      ) : null}
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm text-foreground">{value || "-"}</div>
    </div>
  )
}

function ReviewStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} status={status} size="xs" />
}

function ActionStatusBadge({ status, label }: { status: string; label: string }) {
  return <StatusBadge label={label} status={status} size="xs" />
}
