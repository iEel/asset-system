import { requirePagePermission } from "@/lib/page-auth"
import { prisma } from "@/lib/db"
import { loadAssetLabelPrintSettings } from "@/lib/asset-label-print-settings"
import { normalizeLabelPrintAssetIds } from "@/lib/asset-label-print-tracking"
import { lookupLabelPrintRows, type LabelQueueDb } from "@/lib/asset-label-queue"
import { AssetLabelBatchTool } from "@/components/assets/asset-label-batch-tool"

type AssetLabelsToolPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetIds?: string; from?: string }>
}

export default async function AssetLabelsToolPage({ params, searchParams }: AssetLabelsToolPageProps) {
  const { locale } = await params
  const { assetIds, from } = await searchParams
  await requirePagePermission(locale, "asset", "view")
  const queueLocale = locale === "en" ? "en" : "th"
  // The incoming ids keep their order, once each, at most 100 (P6-R2); their rows come from the queue's lookup, so they
  // carry their real print state like every other row (P6-R11). The register adds from=register (P6-R1). The label
  // settings come through the one loader, so the page's preview and the print route draw the same label (recon X11).
  const preselectedIds = normalizeLabelPrintAssetIds((assetIds ?? "").split(","))
  const [preselected, labelSettings, companies, branches, categories, locations] = await Promise.all([
    lookupLabelPrintRows(prisma as unknown as LabelQueueDb, preselectedIds, queueLocale),
    loadAssetLabelPrintSettings(),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true, nameEn: true },
      orderBy: { code: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true, company: { select: { code: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        branchId: true,
        branch: { select: { code: true, name: true, companyId: true, company: { select: { code: true } } } },
      },
      orderBy: { code: "asc" },
    }),
  ])

  return (
    <AssetLabelBatchTool
      locale={queueLocale}
      filterOptions={{
        companies: companies.map((company) => {
          const name = locale === "th" ? company.nameTh : company.nameEn ?? company.nameTh
          return { id: company.id, label: `${company.code} - ${name}`, name }
        }),
        branches: branches.map((branch) => ({
          id: branch.id,
          label: `${branch.company.code} / ${branch.code} - ${branch.name}`,
          name: branch.name,
          companyId: branch.companyId,
        })),
        categories: categories.map((category) => ({ id: category.id, label: `${category.code} - ${category.name}`, name: category.name })),
        locations: locations.map((location) => ({
          id: location.id,
          label: `${location.branch.company.code} / ${location.branch.code} / ${location.code} - ${location.name}`,
          name: location.name,
          branchId: location.branchId,
          companyId: location.branch.companyId,
          branchName: location.branch.name,
          branchLabel: `${location.branch.code} - ${location.branch.name}`,
          shortLabel: `${location.code} - ${location.name}`,
        })),
      }}
      preselectedRows={preselected.rows}
      fromRegister={from === "register"}
      settings={labelSettings}
    />
  )
}
