import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string }>
}

export default async function NewMaintenancePlanPage({ params, searchParams }: Props) {
  const { locale } = await params
  const query = await searchParams
  await requirePagePermission(locale, "maintenance", "create")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const returnTo = `/${locale}/maintenance/pm`
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
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("pmTitle"), href: returnTo }, { label: t("pmCreateTitle") }]}
        title={t("pmCreateTitle")}
        meta={t("pmSubtitle")}
        back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      />
      <MaintenancePlanForm locale={locale} initialAsset={initialAsset} />
    </div>
  )
}
