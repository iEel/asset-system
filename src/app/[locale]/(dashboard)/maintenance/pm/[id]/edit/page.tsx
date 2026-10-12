import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { toLocalDateInputValue } from "@/lib/local-date"

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditMaintenancePlanPage({ params }: Props) {
  const { locale, id } = await params
  await requirePagePermission(locale, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const returnTo = `/${locale}/maintenance/pm`
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id, planState: { not: "ended" } },
    include: { asset: { select: { id: true, assetTag: true, name: true, status: { select: { nameTh: true } } } } },
  })
  if (!plan) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("pmTitle"), href: returnTo }, { label: plan.planNo, code: true }]}
        title={plan.title}
        meta={<span className="tag">{plan.planNo}</span>}
        back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      />
      <MaintenancePlanForm
        locale={locale}
        planId={plan.id}
        initialAsset={{ id: plan.asset.id, label: `${plan.asset.assetTag} - ${plan.asset.name} (${plan.asset.status.nameTh})` }}
        initialValues={{
          title: plan.title,
          frequency: plan.frequency,
          intervalDays: String(plan.intervalDays),
          nextDueDate: toLocalDateInputValue(plan.nextDueDate),
          vendorId: plan.vendorId ?? "",
          notes: plan.notes ?? "",
        }}
      />
    </div>
  )
}
