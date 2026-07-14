import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { prisma } from "@/lib/db"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { requirePagePermission } from "@/lib/page-auth"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string; returnTo?: string | string[] }>
}

export default async function NewMaintenancePlanPage({ params, searchParams }: Props) {
  const { locale } = await params
  const query = await searchParams
  await requirePagePermission(locale, "maintenance", "create")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const returnTo = normalizeOperationalReturnTo(locale, "maintenance", query.returnTo)
  const asset = query.assetId
    ? await prisma.asset.findFirst({
        where: { id: query.assetId, isActive: true },
        select: { id: true, assetTag: true, name: true, status: { select: { nameTh: true } } },
      })
    : null
  const initialAsset = asset
    ? { id: asset.id, label: `${asset.assetTag} - ${asset.name} (${asset.status.nameTh})` }
    : undefined

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("title"), href: returnTo }, { label: t("pmCreateTitle") }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("pmCreateTitle")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("pmSubtitle")}</p>
        </div>
        <Link href={returnTo} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
          {tCommon("cancel")}
        </Link>
      </div>
      <MaintenancePlanForm locale={locale} initialAsset={initialAsset} />
    </div>
  )
}
