import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Download, FileText } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditFindingReviewActions } from "@/components/audit/audit-finding-review-actions"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type AuditFindingsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string }>
}

export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
  const { locale } = await params
  const { search = "", status = "pending" } = await searchParams
  await requirePagePermission(locale, "audit", "view")

  const t = await getTranslations("auditFinding")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const exportParams = new URLSearchParams()
  if (searchText) exportParams.set("search", searchText)
  exportParams.set("status", status)
  const findings = await prisma.auditFinding.findMany({
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
  })
  const valueLabels = await buildFindingValueLabels(findings)

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
        <div className="flex flex-wrap gap-2">
          {["pending", "approved", "rejected", "exception", "all"].map((item) => (
            <Link
              key={item}
              href={`/${locale}/audit/findings?status=${item}`}
              className={`inline-flex h-9 items-center rounded-md border px-3 text-sm transition-colors ${
                status === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:bg-accent"
              }`}
            >
              {t(`status_${item}`)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/audit-findings/export?${exportParams.toString()}`}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            {t("exportFindings")}
          </a>
          <a
            href={`/api/audit-findings/export-pdf?${exportParams.toString()}`}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <FileText className="h-4 w-4" />
            {t("exportFindingsPdf")}
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
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
                <ColumnHeader>{t("itemStatus")}</ColumnHeader>
                <ColumnHeader>{t("reconcileStatus")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
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
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{finding.auditItem.auditStatus}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{finding.auditItem.reconcileStatus ?? "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {finding.reviewStatus === "pending" ? <AuditFindingReviewActions findingId={finding.id} /> : "-"}
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

function ReviewStatusBadge({ status }: { status: string }) {
  const className =
    status === "approved"
      ? "bg-success/10 text-success"
      : status === "rejected"
        ? "bg-danger/10 text-danger"
        : status === "exception"
          ? "bg-warning/10 text-warning"
          : "bg-info/10 text-info"

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${className}`}>{status}</span>
}
