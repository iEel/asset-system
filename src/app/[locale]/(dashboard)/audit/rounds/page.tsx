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

type CoverageAsset = {
  id: string
  categoryId: string
  departmentId: string | null
  category: { code: string; name: string }
  department: { code: string; name: string } | null
}

type CoverageGap = {
  id: string
  label: string
  href?: string
  total: number
  covered: number
  missing: number
  percent: number
}

export default async function AuditRoundsPage({ params, searchParams }: AuditRoundsPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "audit", "view")

  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const currentYear = new Date().getFullYear()
  const [rounds, activeAssets, coveredItems, currentYearRoundCount, openItemStatusCounts, openFollowUpCount] = await Promise.all([
    prisma.auditRound.findMany({
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
    }),
    prisma.asset.findMany({
      where: { isActive: true },
      select: {
        id: true,
        categoryId: true,
        departmentId: true,
        category: { select: { code: true, name: true } },
        department: { select: { code: true, name: true } },
      },
    }),
    prisma.auditItem.findMany({
      where: { auditRound: { isActive: true, auditYear: currentYear } },
      distinct: ["assetId"],
      select: { assetId: true },
    }),
    prisma.auditRound.count({ where: { isActive: true, auditYear: currentYear } }),
    prisma.auditItem.groupBy({
      by: ["auditStatus"],
      where: { auditRound: { isActive: true, status: { not: "closed" } } },
      _count: { _all: true },
    }),
    prisma.auditFinding.count({
      where: {
        auditRound: { isActive: true, status: { not: "closed" } },
        OR: [{ reviewStatus: "pending" }, { actionStatus: { in: ["planned", "in_progress"] } }],
      },
    }),
  ])
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
  const coveredAssetIds = new Set(coveredItems.map((item) => item.assetId))
  const coveredAssetCount = activeAssets.filter((asset) => coveredAssetIds.has(asset.id)).length
  const uncoveredAssetCount = Math.max(activeAssets.length - coveredAssetCount, 0)
  const openPendingItems = openItemStatusCounts.find((row) => row.auditStatus === "pending")?._count._all ?? 0
  const openProcessedItems = openItemStatusCounts
    .filter((row) => row.auditStatus !== "pending")
    .reduce((sum, row) => sum + row._count._all, 0)
  const categoryGaps = buildCoverageGaps(
    activeAssets,
    coveredAssetIds,
    (asset) => ({
      id: asset.categoryId,
      label: `${asset.category.code} - ${asset.category.name}`,
      href: `/${locale}/assets?categoryId=${asset.categoryId}`,
    }),
  )
  const departmentGaps = buildCoverageGaps(
    activeAssets,
    coveredAssetIds,
    (asset) => ({
      id: asset.departmentId ?? "unassigned",
      label: asset.department ? `${asset.department.code} - ${asset.department.name}` : t("coverageUnassigned"),
    }),
  )

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/audit/rounds/new`}
        createLabel={t("createTitle")}
      />

      <section className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("coverageTitle", { year: currentYear })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("coverageHelp")}</p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {t("coverageRoundCount")}: <span className="font-semibold text-foreground">{currentYearRoundCount}</span>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CoverageMetric label={t("coverageActiveAssets")} value={activeAssets.length} />
          <CoverageMetric label={t("coverageCoveredThisYear")} value={coveredAssetCount} />
          <CoverageMetric label={t("coverageUncoveredThisYear")} value={uncoveredAssetCount} tone="warning" />
          <CoverageMetric label={t("coverageOpenPending")} value={openPendingItems + openFollowUpCount} tone="danger" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <AuditProgressBar
            total={activeAssets.length}
            processed={coveredAssetCount}
            pending={uncoveredAssetCount}
            label={t("coverageProgress")}
            processedLabel={t("coverageCoveredLabel")}
            pendingLabel={t("coverageMissingLabel")}
            breakdown={[
              { label: t("coverageCoveredLabel"), value: coveredAssetCount, tone: "success" },
              { label: t("coverageMissingLabel"), value: uncoveredAssetCount, tone: "warning" },
              { label: t("scanned"), value: openProcessedItems, tone: "info" },
              { label: t("pendingReview"), value: openFollowUpCount, tone: "danger" },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <CoverageGapList
              title={t("coverageByCategory")}
              help={t("coverageGapHelp")}
              rows={categoryGaps}
              emptyLabel={t("coverageNoGaps")}
              labels={{
                group: t("coverageGroup"),
                missing: t("coverageMissing"),
                total: t("coverageTotal"),
                rate: t("coverageRate"),
              }}
            />
            <CoverageGapList
              title={t("coverageByDepartment")}
              help={t("coverageGapHelp")}
              rows={departmentGaps}
              emptyLabel={t("coverageNoGaps")}
              labels={{
                group: t("coverageGroup"),
                missing: t("coverageMissing"),
                total: t("coverageTotal"),
                rate: t("coverageRate"),
              }}
            />
          </div>
        </div>
      </section>

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

function CoverageMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warning" | "danger" }) {
  const toneClass =
    tone === "danger"
      ? "border-danger/30 bg-danger/10 text-danger"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-border bg-background text-foreground"

  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}

function CoverageGapList({
  title,
  help,
  rows,
  emptyLabel,
  labels,
}: {
  title: string
  help: string
  rows: CoverageGap[]
  emptyLabel: string
  labels: { group: string; missing: string; total: string; rate: string }
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{help}</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-surface px-3 py-4 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium">{labels.group}</th>
                <th className="px-2 py-2 text-right font-medium">{labels.missing}</th>
                <th className="px-2 py-2 text-right font-medium">{labels.total}</th>
                <th className="px-2 py-2 text-right font-medium">{labels.rate}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="min-w-44 px-2 py-2 font-medium text-foreground">
                    {row.href ? (
                      <Link href={row.href} className="text-primary hover:underline">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-warning">{row.missing}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-muted-foreground">{row.total}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-muted-foreground">{row.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function buildCoverageGaps(
  assets: CoverageAsset[],
  coveredAssetIds: Set<string>,
  getGroup: (asset: CoverageAsset) => { id: string; label: string; href?: string },
) {
  const groups = new Map<string, { label: string; href?: string; total: number; covered: number }>()
  for (const asset of assets) {
    const group = getGroup(asset)
    const current = groups.get(group.id) ?? { label: group.label, href: group.href, total: 0, covered: 0 }
    current.total += 1
    if (coveredAssetIds.has(asset.id)) current.covered += 1
    groups.set(group.id, current)
  }

  return Array.from(groups.entries())
    .map(([id, group]) => {
      const missing = Math.max(group.total - group.covered, 0)
      return {
        id,
        label: group.label,
        href: group.href,
        total: group.total,
        covered: group.covered,
        missing,
        percent: group.total > 0 ? Math.round((group.covered / group.total) * 100) : 0,
      }
    })
    .filter((group) => group.missing > 0)
    .sort((a, b) => b.missing - a.missing || a.label.localeCompare(b.label))
    .slice(0, 5)
}
