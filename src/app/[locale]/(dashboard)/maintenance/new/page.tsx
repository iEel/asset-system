import { getTranslations } from "next-intl/server"
import { RepairRecordForm } from "@/components/maintenance/repair-record-form"
import { PageBackLink } from "@/components/ui/page-header"
import { getRepairConditionOptions, normalizeAssetStateName, repairBeyondRepairConditionName, repairConditionDefault } from "@/lib/asset-lifecycle-policy"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { maintenanceListCrumbHref, normalizeMaintenanceReturnTo } from "@/lib/operational-return-navigation"
import { requirePagePermission } from "@/lib/page-auth"
import { getBangkokDateKey, maintenancePlanFrequencies, type MaintenancePlanFrequency } from "@/lib/preventive-maintenance"
import { loadRepairAssetFacts, type RepairAssetFactsDb } from "@/lib/repair-asset-facts"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string; planId?: string; returnTo?: string | string[] }>
}

const isPlanFrequency = (value: string): value is MaintenancePlanFrequency => (maintenancePlanFrequencies as readonly string[]).includes(value)

export default async function NewRepairRecordPage({ params, searchParams }: Props) {
  const { locale } = await params
  const query = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "create")
  const t = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  // The repair list, the PM list or the asset page the user came from (group 5 spec §5 "Way back").
  const returnTo = normalizeMaintenanceReturnTo(locale, query.returnTo, "maintenance")
  const plan = query.planId
    ? await prisma.maintenancePlan.findFirst({
        where: { id: query.planId, isActive: true, planState: "active" },
        select: {
          id: true, planNo: true, title: true, assetId: true, nextDueDate: true, frequency: true, intervalDays: true,
          vendor: { select: { id: true, code: true, name: true } },
        },
      })
    : null
  const assetId = plan?.assetId ?? query.assetId
  // The one read of the asset's facts (G5P2-R1): the card, the eligibility line, the status line and the summary.
  const facts = assetId ? await loadRepairAssetFacts(prisma as unknown as RepairAssetFactsDb, assetId) : null
  // Every active status by its name, so the client names the next status without a fetch (G5P2-R7).
  const statuses = await prisma.assetStatus.findMany({ where: { isActive: true }, select: { name: true, nameTh: true } })
  const statusLabels = Object.fromEntries(statuses.map((status) => [status.name, status.nameTh]))
  const conditions = await prisma.assetCondition.findMany({
    where: { isActive: true },
    select: { id: true, name: true, nameTh: true, isActive: true },
    orderBy: { sortOrder: "asc" },
  })
  // The condition after a usable repair (group 3 spec §19.4): ดี or พอใช้, starting at the asset's own when offered.
  const conditionOptions = getRepairConditionOptions(conditions).map((condition) => ({ id: condition.id, label: condition.nameTh }))
  const salvageLabel = conditions.find((condition) => normalizeAssetStateName(condition.name) === normalizeAssetStateName(repairBeyondRepairConditionName))?.nameTh
    ?? repairBeyondRepairConditionName
  // The footnote names the signed-in account's employee (spec §7.5).
  const employee = user.employeeId
    ? await prisma.employee.findFirst({ where: { id: user.employeeId }, select: { fullNameTh: true } })
    : null
  const initialAsset = facts ? { id: facts.id, label: `${facts.assetTag} - ${facts.name} (${facts.statusLabel})`, conditionId: facts.conditionId } : undefined
  const planOption = plan
    ? {
        id: plan.id,
        label: `${plan.planNo} - ${plan.title}`,
        title: plan.title,
        vendor: plan.vendor ? { id: plan.vendor.id, label: `${plan.vendor.code} - ${plan.vendor.name}` } : null,
        nextDueDate: getBangkokDateKey(plan.nextDueDate),
        frequency: isPlanFrequency(plan.frequency) ? plan.frequency : "monthly",
        intervalDays: plan.intervalDays,
      }
    : undefined

  return (
    <RepairRecordForm
      breadcrumbs={[{ label: t("title"), href: maintenanceListCrumbHref(returnTo, `/${locale}/maintenance`) }, { label: t("createTitle") }]}
      back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      locale={locale}
      returnTo={returnTo}
      initialAsset={initialAsset}
      initialFacts={facts}
      plan={planOption}
      needsReporter={!user.employeeId}
      reporterName={employee?.fullNameTh ?? user.name}
      canReturn={hasPermission(user, "asset", "edit")}
      todayKey={getBangkokDateKey(new Date())}
      statusLabels={statusLabels}
      conditionOptions={conditionOptions}
      salvageLabel={salvageLabel}
      initialConditionId={repairConditionDefault(facts?.conditionId ?? null, conditionOptions)}
    />
  )
}
