import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { RepairRecordForm } from "@/components/maintenance/repair-record-form"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
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
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("title"), href: returnTo }, { label: t("createTitle") }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{plan ? t("pmCreateSubtitle") : t("createSubtitle")}</p>
        </div>
        <Link href={returnTo} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
          {tCommon("cancel")}
        </Link>
      </div>
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
