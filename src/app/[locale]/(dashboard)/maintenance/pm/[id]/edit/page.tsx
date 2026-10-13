import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { toLocalDateInputValue } from "@/lib/local-date"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"

type Props = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditMaintenancePlanPage({ params, searchParams }: Props) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  // The PM list page and page size the user came from (spec 2B B4, §5.9.2 row 6); any other target is the PM list.
  const returnTo = normalizeOperationalReturnTo(locale, "maintenance-pm", rawSearchParams.returnTo)
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
        returnHref={returnTo}
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
