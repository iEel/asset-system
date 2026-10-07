import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { CalendarClock, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDate } from "@/lib/utils"
import { getMaintenancePlanDueState } from "@/lib/preventive-maintenance"
import type { MaintenancePlanState } from "@/lib/maintenance-plan-service"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { MaintenancePlanStateActions } from "@/components/maintenance/maintenance-plan-state-actions"

type Props = { params: Promise<{ locale: string }> }

const planStateOrder: Record<string, number> = { active: 0, paused: 1, ended: 2 }

export default async function MaintenancePlansPage({ params }: Props) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tRecord = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const now = new Date()
  const plans = (await prisma.maintenancePlan.findMany({
    include: {
      asset: { select: { assetTag: true, name: true } },
      vendor: { select: { code: true, name: true } },
    },
    orderBy: { nextDueDate: "asc" },
    take: 500,
  })).sort((left, right) => (planStateOrder[left.planState] ?? 3) - (planStateOrder[right.planState] ?? 3))

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: tRecord("title"), href: `/${locale}/maintenance` }, { label: t("pmTitle") }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <CalendarClock className="h-6 w-6 text-primary" />{t("pmTitle")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("pmSubtitle")}</p>
        </div>
        {canCreate ? (
          <Link href={`/${locale}/maintenance/pm/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />{t("pmCreateTitle")}
          </Link>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {plans.length === 0 ? (
          <div className="p-4">
            <ActionEmptyState title={t("pmEmptyTitle")} description={t("pmEmptyHelp")} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {plans.map((plan) => {
              const isActivePlan = plan.planState === "active"
              const dueState = getMaintenancePlanDueState(plan.nextDueDate, now)
              const dueTone = dueState === "overdue" ? "danger" : dueState === "due_soon" ? "warning" : "primary"
              return (
                <li key={plan.id} className="grid min-w-0 gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_minmax(200px,260px)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{plan.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{plan.planNo} · {plan.asset.assetTag} - {plan.asset.name}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{t("pmNextDueDate")}: {formatDate(plan.nextDueDate)}</div>
                    <div className="mt-1">{t("pmExternalProvider")}: {plan.vendor ? `${plan.vendor.code} - ${plan.vendor.name}` : t("pmNoExternalProvider")}</div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                    {isActivePlan ? <StatusBadge label={t(`pmDueState.${dueState}`)} tone={dueTone} size="xs" /> : null}
                    <StatusBadge label={t(`pmFrequencies.${plan.frequency}`)} tone="muted" size="xs" />
                    <StatusBadge label={t(`pmPlanStates.${plan.planState}`)} tone={isActivePlan ? "success" : plan.planState === "paused" ? "warning" : "muted"} size="xs" />
                    {canCreate && isActivePlan ? (
                      <Link href={`/${locale}/maintenance/new?planId=${plan.id}`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                        {tRecord("pmRecordDone")}
                      </Link>
                    ) : null}
                    {canEdit && plan.planState !== "ended" ? (
                      <Link href={`/${locale}/maintenance/pm/${plan.id}/edit`} className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-accent">
                        {tCommon("edit")}
                      </Link>
                    ) : null}
                    {canEdit ? <MaintenancePlanStateActions planId={plan.id} state={plan.planState as MaintenancePlanState} /> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
