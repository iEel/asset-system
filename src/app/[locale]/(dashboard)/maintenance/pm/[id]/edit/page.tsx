import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { prisma } from "@/lib/db"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { requirePagePermission } from "@/lib/page-auth"
import { toLocalDateInputValue } from "@/lib/local-date"

type Props = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditMaintenancePlanPage({ params, searchParams }: Props) {
  const { locale, id } = await params
  const query = await searchParams
  await requirePagePermission(locale, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const returnTo = normalizeOperationalReturnTo(locale, "maintenance", query.returnTo)
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id, planState: { not: "ended" } },
    include: { asset: { select: { id: true, assetTag: true, name: true, status: { select: { nameTh: true } } } } },
  })
  if (!plan) notFound()

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("title"), href: returnTo }, { label: plan.planNo }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{plan.planNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{plan.title}</p>
        </div>
        <Link href={returnTo} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
          {tCommon("cancel")}
        </Link>
      </div>
      <MaintenancePlanForm
        locale={locale}
        planId={plan.id}
        initialAsset={{ id: plan.asset.id, label: `${plan.asset.assetTag} - ${plan.asset.name} (${plan.asset.status.nameTh})` }}
        initialValues={{
          title: plan.title,
          frequency: plan.frequency,
          intervalDays: String(plan.intervalDays),
          nextDueDate: toLocalDateInputValue(plan.nextDueDate),
          assignedToId: plan.assignedToId ?? "",
          vendorId: plan.vendorId ?? "",
          notes: plan.notes ?? "",
        }}
      />
    </div>
  )
}
