import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Eye } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { formatDate } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"

type AuditRoundsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function AuditRoundsPage({ params, searchParams }: AuditRoundsPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "audit", "view")

  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const rounds = await prisma.auditRound.findMany({
    where: {
      isActive: true,
      ...(searchText
        ? {
            OR: [
              { auditNo: { contains: searchText } },
              { name: { contains: searchText } },
              { scopeCompany: { code: { contains: searchText } } },
              { scopeBranch: { code: { contains: searchText } } },
              { scopeLocation: { code: { contains: searchText } } },
            ],
          }
        : {}),
    },
    include: {
      scopeCompany: { select: { code: true, nameTh: true } },
      scopeBranch: { select: { code: true, name: true } },
      scopeLocation: { select: { code: true, name: true } },
      _count: { select: { items: true, findings: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  const roundIds = rounds.map((round) => round.id)
  const statusCounts = roundIds.length
    ? await prisma.auditItem.groupBy({
        by: ["auditRoundId", "auditStatus"],
        where: { auditRoundId: { in: roundIds } },
        _count: { _all: true },
      })
    : []
  const progressByRoundId = new Map<string, { pending: number; processed: number }>()
  for (const row of statusCounts) {
    const current = progressByRoundId.get(row.auditRoundId) ?? { pending: 0, processed: 0 }
    if (row.auditStatus === "pending") {
      current.pending += row._count._all
    } else {
      current.processed += row._count._all
    }
    progressByRoundId.set(row.auditRoundId, current)
  }

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/audit/rounds/new`}
        createLabel={t("createTitle")}
      />

      <MasterDataSearch
        action={`/${locale}/audit/rounds`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("auditNo")}</ColumnHeader>
                <ColumnHeader>{t("name")}</ColumnHeader>
                <ColumnHeader>{t("scope")}</ColumnHeader>
                <ColumnHeader>{t("dateRange")}</ColumnHeader>
                <ColumnHeader>{t("status")}</ColumnHeader>
                <ColumnHeader align="right">{t("items")}</ColumnHeader>
                <ColumnHeader>{t("progress")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rounds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                rounds.map((round) => {
                  const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }

                  return (
                    <ClickableTableRow
                      key={round.id}
                      href={`/${locale}/audit/rounds/${round.id}`}
                      label={`${tCommon("view")}: ${round.auditNo}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{round.auditNo}</td>
                      <td className="min-w-56 px-4 py-3 text-foreground">{round.name}</td>
                      <td className="min-w-64 px-4 py-3 text-muted-foreground">{formatScope(round)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(round.startDate)} - {formatDate(round.endDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <AuditStatusBadge status={round.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">{round._count.items}</td>
                      <td className="min-w-52 px-4 py-3">
                        <AuditProgressBar
                          compact
                          total={round._count.items}
                          processed={progress.processed}
                          pending={progress.pending}
                          label={t("progress")}
                          processedLabel={t("scanned")}
                          pendingLabel={t("pending")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          href={`/${locale}/audit/rounds/${round.id}`}
                          title={tCommon("view")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AuditStatusBadge({ status }: { status: string }) {
  const className =
    status === "open"
      ? "bg-info/10 text-info"
      : status === "closed"
        ? "bg-muted text-muted-foreground"
        : "bg-warning/10 text-warning"

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${className}`}>{status}</span>
}

function formatScope(round: {
  scopeCompany: { code: string; nameTh: string } | null
  scopeBranch: { code: string; name: string } | null
  scopeLocation: { code: string; name: string } | null
}) {
  const parts = [
    round.scopeCompany ? `${round.scopeCompany.code} - ${round.scopeCompany.nameTh}` : null,
    round.scopeBranch ? `${round.scopeBranch.code} - ${round.scopeBranch.name}` : null,
    round.scopeLocation ? `${round.scopeLocation.code} - ${round.scopeLocation.name}` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" / ") : "All assets"
}
