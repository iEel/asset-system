import Link from "next/link"
import { ClipboardCheck, DatabaseZap, Download, FileSpreadsheet, ShieldCheck, Trash2, Wrench } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency } from "@/lib/utils"

type ReportsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "report", "view")
  const t = await getTranslations("reportsPage")
  const warrantyThreshold = new Date()
  warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
  const [
    totalAssets,
    totalValue,
    byStatus,
    byCategory,
    byCompany,
    byBranch,
    byDepartment,
    missingCustodian,
    missingSerial,
    missingPhoto,
    warrantyExpiring,
  ] = await Promise.all([
    prisma.asset.count({ where: { isActive: true } }),
    prisma.asset.aggregate({ where: { isActive: true }, _sum: { purchasePrice: true } }),
    prisma.asset.groupBy({ by: ["statusId"], where: { isActive: true }, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["categoryId"], where: { isActive: true }, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["companyId"], where: { isActive: true }, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["branchId"], where: { isActive: true }, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["departmentId"], where: { isActive: true, departmentId: { not: null } }, _count: { _all: true } }),
    prisma.asset.count({ where: { isActive: true, custodianId: null } }),
    prisma.asset.count({ where: { isActive: true, OR: [{ serialNumber: null }, { serialNumber: "" }] } }),
    prisma.asset.count({
      where: {
        isActive: true,
        attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } },
      },
    }),
    prisma.asset.count({ where: { isActive: true, warrantyEndDate: { gte: new Date(), lte: warrantyThreshold } } }),
  ])
  const [statuses, categories, companies, branches, departments] = await Promise.all([
    prisma.assetStatus.findMany({ where: { id: { in: byStatus.map((item) => item.statusId) } }, select: { id: true, nameTh: true } }),
    prisma.assetCategory.findMany({ where: { id: { in: byCategory.map((item) => item.categoryId) } }, select: { id: true, code: true, name: true } }),
    prisma.company.findMany({ where: { id: { in: byCompany.map((item) => item.companyId) } }, select: { id: true, code: true, nameTh: true } }),
    prisma.branch.findMany({ where: { id: { in: byBranch.map((item) => item.branchId) } }, select: { id: true, code: true, name: true } }),
    prisma.department.findMany({ where: { id: { in: byDepartment.map((item) => item.departmentId).filter((id): id is string => Boolean(id)) } }, select: { id: true, code: true, name: true } }),
  ])

  const statusMap = new Map(statuses.map((status) => [status.id, status.nameTh]))
  const categoryMap = new Map(categories.map((category) => [category.id, `${category.code} - ${category.name}`]))
  const companyMap = new Map(companies.map((company) => [company.id, `${company.code} - ${company.nameTh}`]))
  const branchMap = new Map(branches.map((branch) => [branch.id, `${branch.code} - ${branch.name}`]))
  const departmentMap = new Map(departments.map((department) => [department.id, `${department.code} - ${department.name}`]))
  const reportCatalog = [
    {
      title: t("catalogAssetTitle"),
      description: t("catalogAssetDescription"),
      audience: t("catalogAssetAudience"),
      icon: <FileSpreadsheet className="h-5 w-5" />,
      reports: [
        { label: t("assetRegister"), viewHref: `/${locale}/assets`, exportHref: "/api/assets/export", exportLabel: t("exportAssetRegister") },
        { label: t("assetOverviewExcel"), viewHref: `/${locale}/reports`, exportHref: "/api/reports/assets-overview/export", exportLabel: t("exportAssetOverview") },
      ],
    },
    {
      title: t("catalogDataQualityTitle"),
      description: t("catalogDataQualityDescription"),
      audience: t("catalogDataQualityAudience"),
      icon: <DatabaseZap className="h-5 w-5" />,
      reports: [
        { label: t("dataQuality"), viewHref: `/${locale}/admin/data-quality`, exportHref: "/api/reports/assets-overview/export", exportLabel: t("exportAssetOverview") },
      ],
    },
    {
      title: t("catalogMaintenanceTitle"),
      description: t("catalogMaintenanceDescription"),
      audience: t("catalogMaintenanceAudience"),
      icon: <Wrench className="h-5 w-5" />,
      reports: [
        { label: t("maintenanceReport"), viewHref: `/${locale}/maintenance`, exportHref: "/api/maintenance-tickets/export", exportLabel: t("exportMaintenance") },
      ],
    },
    {
      title: t("catalogAuditTitle"),
      description: t("catalogAuditDescription"),
      audience: t("catalogAuditAudience"),
      icon: <ClipboardCheck className="h-5 w-5" />,
      reports: [
        { label: t("auditFindingsReport"), viewHref: `/${locale}/audit/findings`, exportHref: "/api/audit-findings/export?status=all", exportLabel: t("exportAuditFindings") },
        { label: t("auditFindingsPdf"), viewHref: `/${locale}/audit/findings`, exportHref: "/api/audit-findings/export-pdf?status=all", exportLabel: t("exportPdf") },
      ],
    },
    {
      title: t("catalogDisposalTitle"),
      description: t("catalogDisposalDescription"),
      audience: t("catalogDisposalAudience"),
      icon: <Trash2 className="h-5 w-5" />,
      reports: [
        { label: t("disposalReport"), viewHref: `/${locale}/disposal`, exportHref: "/api/disposal-requests/export", exportLabel: t("exportDisposal") },
      ],
    },
    {
      title: t("catalogSystemTitle"),
      description: t("catalogSystemDescription"),
      audience: t("catalogSystemAudience"),
      icon: <ShieldCheck className="h-5 w-5" />,
      reports: [
        { label: t("rolePermissionAudit"), viewHref: `/${locale}/admin/roles`, exportHref: "/api/admin/roles/export", exportLabel: t("exportRoleAudit") },
        { label: t("systemLogs"), viewHref: `/${locale}/admin/logs` },
      ],
    },
  ]
  const reportCount = reportCatalog.reduce((sum, category) => sum + category.reports.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/api/reports/assets-overview/export"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            {t("exportAssetOverview")}
          </Link>
          <Link
            href="/api/assets/export"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            {t("exportAssetRegister")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label={t("totalAssets")} value={totalAssets.toLocaleString("th-TH")} />
        <Metric label={t("totalValue")} value={formatCurrency(totalValue._sum.purchasePrice ? Number(totalValue._sum.purchasePrice) : 0)} />
        <Metric label={t("reportsReady")} value={reportCount.toLocaleString("th-TH")} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">{t("dataQuality")}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Metric label={t("missingCustodian")} value={missingCustodian.toLocaleString("th-TH")} compact />
          <Metric label={t("missingSerial")} value={missingSerial.toLocaleString("th-TH")} compact />
          <Metric label={t("missingPhoto")} value={missingPhoto.toLocaleString("th-TH")} compact />
          <Metric label={t("warrantyExpiring")} value={warrantyExpiring.toLocaleString("th-TH")} compact />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportTable title={t("byStatus")} rows={byStatus.map((item) => [statusMap.get(item.statusId) ?? item.statusId, item._count._all])} />
        <ReportTable title={t("byCategory")} rows={byCategory.map((item) => [categoryMap.get(item.categoryId) ?? item.categoryId, item._count._all])} />
        <ReportTable title={t("byCompany")} rows={byCompany.map((item) => [companyMap.get(item.companyId) ?? item.companyId, item._count._all])} />
        <ReportTable title={t("byBranch")} rows={byBranch.map((item) => [branchMap.get(item.branchId) ?? item.branchId, item._count._all])} />
        <ReportTable title={t("byDepartment")} rows={byDepartment.map((item) => [departmentMap.get(item.departmentId ?? "") ?? item.departmentId ?? t("unassigned"), item._count._all])} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-foreground">{t("reportCatalog")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("reportCatalogHelp")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {reportCatalog.map((category) => (
            <div key={category.title} className="rounded-md border border-border bg-background p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">{category.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{category.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  <p className="mt-2 text-xs font-medium text-primary">{category.audience}</p>
                </div>
              </div>
              <div className="grid gap-2">
                {category.reports.map((report) => (
                  <div key={report.label} className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-foreground">{report.label}</span>
                    <div className="flex flex-wrap gap-2">
                      <Link href={report.viewHref} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent">
                        {t("openReport")}
                      </Link>
                      {report.exportHref ? (
                        <Link href={report.exportHref} className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90">
                          <Download className="h-3.5 w-3.5" />
                          {report.exportLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 font-bold text-foreground ${compact ? "text-xl" : "text-2xl"}`}>{value}</div>
    </div>
  )
}

function ReportTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">-</div>
        ) : (
          rows.map(([label, count]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{label}</span>
              <span className="font-semibold text-foreground">{count.toLocaleString("th-TH")}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
