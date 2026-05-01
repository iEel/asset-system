import Link from "next/link"
import { Download, FileSpreadsheet } from "lucide-react"
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
  const [totalAssets, totalValue, byStatus, byCategory, byCompany] = await Promise.all([
    prisma.asset.count({ where: { isActive: true } }),
    prisma.asset.aggregate({ where: { isActive: true }, _sum: { purchasePrice: true } }),
    prisma.asset.groupBy({ by: ["statusId"], where: { isActive: true }, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["categoryId"], where: { isActive: true }, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["companyId"], where: { isActive: true }, _count: { _all: true } }),
  ])
  const [statuses, categories, companies] = await Promise.all([
    prisma.assetStatus.findMany({ where: { id: { in: byStatus.map((item) => item.statusId) } }, select: { id: true, nameTh: true } }),
    prisma.assetCategory.findMany({ where: { id: { in: byCategory.map((item) => item.categoryId) } }, select: { id: true, code: true, name: true } }),
    prisma.company.findMany({ where: { id: { in: byCompany.map((item) => item.companyId) } }, select: { id: true, code: true, nameTh: true } }),
  ])

  const statusMap = new Map(statuses.map((status) => [status.id, status.nameTh]))
  const categoryMap = new Map(categories.map((category) => [category.id, `${category.code} - ${category.name}`]))
  const companyMap = new Map(companies.map((company) => [company.id, `${company.code} - ${company.nameTh}`]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/api/assets/export"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          {t("exportAssetRegister")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label={t("totalAssets")} value={totalAssets.toLocaleString("th-TH")} />
        <Metric label={t("totalValue")} value={formatCurrency(totalValue._sum.purchasePrice ? Number(totalValue._sum.purchasePrice) : 0)} />
        <Metric label={t("reportsReady")} value="3" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportTable title={t("byStatus")} rows={byStatus.map((item) => [statusMap.get(item.statusId) ?? item.statusId, item._count._all])} />
        <ReportTable title={t("byCategory")} rows={byCategory.map((item) => [categoryMap.get(item.categoryId) ?? item.categoryId, item._count._all])} />
        <ReportTable title={t("byCompany")} rows={byCompany.map((item) => [companyMap.get(item.companyId) ?? item.companyId, item._count._all])} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t("quickReports")}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link href={`/${locale}/assets`} className="flex items-center gap-3 rounded-md border border-border p-4 transition-colors hover:bg-accent">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="font-medium">{t("assetRegister")}</span>
          </Link>
          <Link href="/api/assets/export" className="flex items-center gap-3 rounded-md border border-border p-4 transition-colors hover:bg-accent">
            <Download className="h-5 w-5 text-primary" />
            <span className="font-medium">{t("assetRegisterExcel")}</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
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
