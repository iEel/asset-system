import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { PageBackLink } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { normalizeAssetStateName } from "@/lib/asset-lifecycle-policy"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { maintenanceListCrumbHref, normalizeMaintenanceReturnTo } from "@/lib/operational-return-navigation"
import { readPmDueCounts } from "@/lib/pm-due-counts"
import { getBangkokDateKey, maintenancePlanFrequencies, type MaintenancePlanFrequency } from "@/lib/preventive-maintenance"
import { loadRepairAssetFacts, type RepairAssetFactsDb } from "@/lib/repair-asset-facts"
import type { RepairAssetFacts } from "@/lib/repair-record-outlook"
import { formatDate } from "@/lib/utils"

type Props = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

const isPlanFrequency = (value: string): value is MaintenancePlanFrequency => (maintenancePlanFrequencies as readonly string[]).includes(value)
// The due counts leave out an inactive, Disposed or Retired asset's plans (spec §9 scope note, pmDueScopeWhere).
const writtenOffStatusNames = new Set(["disposed", "retired"])

// แก้ไขแผน PM (MT-PM-Form edit, group 5 spec §10): the header's meta (planNo, the state badge, the rhythm with the stored
// due date, and where pause and end live), the locked asset card from the facts read (G5P4-R9), the PM page's three
// counts for the summary (G5P4-R10) and the plan's updatedAt for the stale-save check (G5P1-R12). An ended plan is 404.
export default async function EditMaintenancePlanPage({ params, searchParams }: Props) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tRecord = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  // The PM list page and page size the user came from (spec 2B B4, §5.9.2 row 6), the repair list or the asset tab
  // (group 5 spec §5 "Way back"); any other target is the PM list.
  const returnTo = normalizeMaintenanceReturnTo(locale, rawSearchParams.returnTo, "maintenance-pm")
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id, planState: { not: "ended" } },
    include: {
      asset: { select: { id: true, assetTag: true, name: true, isActive: true, status: { select: { name: true, nameTh: true } } } },
      vendor: { select: { id: true, code: true, name: true } },
    },
  })
  if (!plan) notFound()

  const now = new Date()
  const [loadedFacts, due] = await Promise.all([
    loadRepairAssetFacts(prisma as unknown as RepairAssetFactsDb, plan.asset.id),
    readPmDueCounts(prisma, now),
  ])
  // The facts read skips an inactive asset; its card still names it from the plan's own asset row.
  const facts: RepairAssetFacts = loadedFacts ?? {
    id: plan.asset.id,
    assetTag: plan.asset.assetTag,
    name: plan.asset.name,
    statusName: plan.asset.status.name,
    statusLabel: plan.asset.status.nameTh,
    conditionId: "",
    conditionLabel: "",
    ownershipType: null,
    custodianId: null,
    holderName: null,
    departmentName: null,
    roomName: null,
    branchName: null,
    photo: null,
    openRecord: null,
    activeCheckout: null,
  }
  const inScope = plan.asset.isActive && !writtenOffStatusNames.has(normalizeAssetStateName(plan.asset.status.name))
  const frequency = isPlanFrequency(plan.frequency) ? plan.frequency : "monthly"
  const planState = plan.planState === "paused" ? "paused" : "active"
  const rhythm = frequency === "custom"
    ? `${t("pmFrequencies.custom")} · ${t("pmFormFrequencyCustomDays", { days: plan.intervalDays })}`
    : t(`pmFrequencies.${frequency}`)

  return (
    <MaintenancePlanForm
      breadcrumbs={[
        { label: tRecord("title"), href: `/${locale}/maintenance` },
        { label: t("pmTitle"), href: maintenanceListCrumbHref(returnTo, `/${locale}/maintenance/pm`) },
        { label: t("pmFormEditCrumb") },
      ]}
      back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      title={t("pmFormEditTitle", { title: plan.title })}
      description={(
        <>
          <span className="tag">{plan.planNo}</span>
          <StatusBadge label={t(`pmPlanStates.${plan.planState}`)} tone={planState === "active" ? "success" : "warning"} />
          <span>{rhythm} · {t("pmFormWasDue", { date: formatDate(plan.nextDueDate) })}</span>
          <span>{t("pmFormStateHint")}</span>
        </>
      )}
      locale={locale}
      planId={plan.id}
      planNo={plan.planNo}
      planState={planState}
      inScope={inScope}
      // The update refuses a plan whose asset is inactive (mutateMaintenancePlan reads it with isActive: true); a
      // written-off asset that is still active can be edited (final review).
      editBlocked={!plan.asset.isActive}
      returnHref={returnTo}
      expectedUpdatedAt={plan.updatedAt.toISOString()}
      initialFacts={facts}
      initialVendor={plan.vendor ? { id: plan.vendor.id, label: `${plan.vendor.code} - ${plan.vendor.name}` } : undefined}
      initialValues={{
        title: plan.title,
        frequency,
        intervalDays: String(plan.intervalDays),
        nextDueDate: getBangkokDateKey(plan.nextDueDate),
        vendorId: plan.vendorId ?? "",
        notes: plan.notes ?? "",
      }}
      dueCounts={{ overdue: due.overdue.count, soon: due.soon.count, later: due.later.count }}
      todayKey={getBangkokDateKey(now)}
    />
  )
}
