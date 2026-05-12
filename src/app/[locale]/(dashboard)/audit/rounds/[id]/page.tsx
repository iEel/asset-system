import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Download, FileText, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { formatDate } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type AuditRoundDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AuditRoundDetailPage({ params }: AuditRoundDetailPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "audit", "view")
  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")

  const [round, pendingCount, scannedCount] = await Promise.all([
    prisma.auditRound.findFirst({
      where: { id, isActive: true },
      include: {
        scopeCompany: { select: { code: true, nameTh: true } },
        scopeBranch: { select: { code: true, name: true } },
        scopeDepartment: { select: { code: true, name: true } },
        scopeLocation: { select: { code: true, name: true } },
        scopeCategory: { select: { code: true, name: true } },
        items: {
          take: 100,
          orderBy: [{ auditStatus: "asc" }, { createdAt: "desc" }],
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                name: true,
                currentLocation: { select: { code: true, name: true } },
                custodian: { select: { code: true, fullNameTh: true } },
                condition: { select: { nameTh: true } },
              },
            },
          },
        },
        _count: { select: { items: true, findings: true } },
      },
    }),
    prisma.auditItem.count({ where: { auditRoundId: id, auditStatus: "pending" } }),
    prisma.auditItem.count({ where: { auditRoundId: id, auditStatus: "scanned" } }),
  ])
  if (!round) notFound()

  const progress = round._count.items > 0 ? Math.round(((round._count.items - pendingCount) / round._count.items) * 100) : 0

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/${locale}/audit/rounds`} className="text-sm text-primary hover:underline">
            {tCommon("back")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{round.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {round.auditNo} • {formatDate(round.startDate)} - {formatDate(round.endDate)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="inline-flex w-fit rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
            {round.status}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <a
              href={`/api/audit-rounds/${round.id}/export`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              {t("exportResult")}
            </a>
            <a
              href={`/api/audit-rounds/${round.id}/export-pdf`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <FileText className="h-4 w-4" />
              {t("exportResultPdf")}
            </a>
            <Link
              href={`/${locale}/audit/rounds/${round.id}/pending`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <AlertTriangle className="h-4 w-4" />
              {t("pendingAssets")}
            </Link>
            <Link
              href={`/${locale}/audit/rounds/${round.id}/scan`}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <ScanLine className="h-4 w-4" />
              {t("scan")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Metric label={t("totalExpected")} value={round._count.items} />
        <Metric label={t("pending")} value={pendingCount} />
        <Metric label={t("scanned")} value={scannedCount} />
        <Metric label={t("progress")} value={`${progress}%`} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("expectedAssets")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("assetTag")}</ColumnHeader>
                <ColumnHeader>{t("assetName")}</ColumnHeader>
                <ColumnHeader>{t("expectedLocation")}</ColumnHeader>
                <ColumnHeader>{t("expectedCustodian")}</ColumnHeader>
                <ColumnHeader>{t("status")}</ColumnHeader>
                <ColumnHeader>{t("result")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {round.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                round.items.map((item) => (
                  <ClickableTableRow
                    key={item.id}
                    href={`/${locale}/assets/${item.asset.id}`}
                    label={`${tCommon("view")}: ${item.asset.assetTag}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{item.asset.assetTag}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{item.asset.name}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {item.asset.currentLocation.code} - {item.asset.currentLocation.name}
                    </td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {item.asset.custodian ? `${item.asset.custodian.code} - ${item.asset.custodian.fullNameTh}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.auditStatus}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.auditResult ?? "-"}</td>
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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}
