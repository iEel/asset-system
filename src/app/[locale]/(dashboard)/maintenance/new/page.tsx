import { getTranslations } from "next-intl/server"
import { RepairRecordForm } from "@/components/maintenance/repair-record-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { prisma } from "@/lib/db"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { requirePagePermission } from "@/lib/page-auth"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string; planId?: string; returnTo?: string | string[] }>
}

export default async function NewRepairRecordPage({ params, searchParams }: Props) {
  const { locale } = await params
  const query = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "create")
  const t = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const returnTo = normalizeOperationalReturnTo(locale, "maintenance", query.returnTo)
  const plan = query.planId
    ? await prisma.maintenancePlan.findFirst({
        where: { id: query.planId, isActive: true, planState: "active" },
        select: { id: true, planNo: true, title: true, assetId: true, vendor: { select: { id: true, code: true, name: true } } },
      })
    : null
  const assetId = plan?.assetId ?? query.assetId
  const asset = assetId
    ? await prisma.asset.findFirst({
        where: { id: assetId, isActive: true },
        select: { id: true, assetTag: true, name: true, status: { select: { nameTh: true } } },
      })
    : null
  const initialAsset = asset ? { id: asset.id, label: `${asset.assetTag} - ${asset.name} (${asset.status.nameTh})` } : undefined
  const planOption = plan
    ? {
        id: plan.id,
        label: `${plan.planNo} - ${plan.title}`,
        title: plan.title,
        vendor: plan.vendor ? { id: plan.vendor.id, label: `${plan.vendor.code} - ${plan.vendor.name}` } : null,
      }
    : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: returnTo }, { label: t("createTitle") }]}
        title={t("createTitle")}
        meta={plan ? t("pmCreateSubtitle") : t("createSubtitle")}
        back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      />
      <RepairRecordForm
        locale={locale}
        returnTo={returnTo}
        initialAsset={initialAsset}
        plan={planOption}
        needsReporter={!user.employeeId}
      />
    </div>
  )
}
