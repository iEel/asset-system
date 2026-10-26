import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Wrench } from "lucide-react"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AssetPrimaryAction } from "@/lib/asset-actions"
import { formatRepairPeriod, repairDays, summarizeAssetRepairs, type AssetPmPlanRow, type AssetRepairRow } from "@/lib/asset-repair-rules"
import { formatCount, formatMoney } from "@/lib/display-format"
import { getMaintenancePlanDueState } from "@/lib/preventive-maintenance"
import { getRepairRecordStatusTone, isOpenRepairStatus, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { formatDate } from "@/lib/utils"

// The repair / PM tab (group 1 spec §7.7): three numbers over the asset's repairs, the replacement notice, the repair
// records and the PM plans. A repair links only for a person with maintenance:view; บันทึกซ่อม is the action rule's
// answer (Task 1, R4) and ตั้งรอบ PM needs maintenance:create on an asset that is not written off (R40).
export async function AssetMaintenanceTab({
  locale,
  assetId,
  repairs,
  plans,
  purchasePrice,
  now,
  recordRepair,
  canViewRepairs,
  canCreatePlan,
}: {
  locale: string
  assetId: string
  repairs: readonly AssetRepairRow[]
  plans: readonly AssetPmPlanRow[]
  purchasePrice: number | null
  now: Date
  recordRepair: AssetPrimaryAction | null
  canViewRepairs: boolean
  canCreatePlan: boolean
}) {
  const t = await getTranslations("asset")
  const tMaintenance = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  // The action rule's full message keys (R2).
  const tAll = await getTranslations()
  const summary = summarizeAssetRepairs(repairs, purchasePrice, now)

  const repairHref = (repair: AssetRepairRow) => `/${locale}/maintenance/${repair.id}`
  const daysLabel = (repair: AssetRepairRow) => {
    const days = repairDays(repair, now)
    if (days === null) return null
    return isOpenRepairStatus(repair.repairStatus) ? t("repairTab.openDays", { days: formatCount(days) }) : t("repairTab.days", { days: formatCount(days) })
  }
  const statusBadge = (repair: AssetRepairRow) => (
    <StatusBadge label={tMaintenance(`statuses.${toRepairRecordStatus(repair.repairStatus)}`)} tone={getRepairRecordStatusTone(repair.repairStatus)} />
  )

  return (
    <div id="maintenance" className="scroll-mt-24 space-y-6">
      <StatStrip
        items={[
          {
            key: "repairs",
            label: t("repairTab.repairCount"),
            value: formatCount(summary.repairCount), unit: t("repairTab.timesUnit"),
            foot: summary.excludedCount > 0 ? t("repairTab.excludedFoot", { count: formatCount(summary.excludedCount) }) : undefined,
          },
          {
            key: "downtime",
            label: t("repairTab.downtime"),
            value: formatCount(summary.downtimeDays), unit: t("repairTab.daysUnit"),
            foot: summary.hasOpenRepair ? t("repairTab.openFoot") : undefined,
          },
          { key: "cost", label: t("repairTab.cost"), value: formatMoney(summary.totalCost), unit: tCommon("baht") },
        ]}
      />

      {summary.replacementWarning ? <Notice tone="warning">{t("maintenanceReplacementWarning")}</Notice> : null}

      <ContentPanel divided flush title={t("repairTab.repairsTitle")}
        actions={
          recordRepair ? (
            <Link href={recordRepair.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Wrench aria-hidden="true" />
              {tAll(recordRepair.labelKey)}
            </Link>
          ) : undefined
        }
      >
        {repairs.length === 0 ? (
          <EmptyNote padded>{t("noMaintenanceTitle")}</EmptyNote>
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable framed={false} caption={t("repairTab.repairsTitle")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{tMaintenance("repairNo")}</DataTableHead>
                    <DataTableHead>{t("repairTab.workColumn")}</DataTableHead>
                    <DataTableHead>{t("repairTab.periodColumn")}</DataTableHead>
                    <DataTableHead>{t("repairTab.repairerColumn")}</DataTableHead>
                    <DataTableHead align="right">{t("repairTab.costColumn")}</DataTableHead>
                    <DataTableHead>{tCommon("status")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {repairs.map((repair) => {
                    const days = daysLabel(repair)
                    const cells = (
                      <>
                        <DataTableCell className="whitespace-nowrap">
                          {canViewRepairs ? (
                            <Link href={repairHref(repair)} className={linkVariants({ size: "inherit" })}>
                              <span className="tag">{repair.repairNo}</span>
                            </Link>
                          ) : (
                            <span className="tag">{repair.repairNo}</span>
                          )}
                        </DataTableCell>
                        <DataTableCell className="min-w-72">
                          <div className="flex flex-wrap items-center gap-2">
                            {repair.maintenancePlanId ? <Chip>{t("maintenancePmBadge")}</Chip> : null}
                            <span className="text-foreground">{repair.problem}</span>
                          </div>
                          {repair.resolution ? <div className="mt-1 text-muted-foreground">{repair.resolution}</div> : null}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <div>{formatRepairPeriod(repair.reportedDate, repair.returnDate, locale)}</div>
                          {days ? <div className="text-meta text-muted-foreground">{days}</div> : null}
                        </DataTableCell>
                        <DataTableCell className="text-muted-foreground">{orNil(repair.repairer)}</DataTableCell>
                        <DataTableCell numeric>{orNil(formatMoney(repair.repairCost))}</DataTableCell>
                        <DataTableCell className="whitespace-nowrap">{statusBadge(repair)}</DataTableCell>
                      </>
                    )
                    return canViewRepairs ? (
                      <ClickableTableRow key={repair.id} href={repairHref(repair)} label={`${tCommon("view")}: ${repair.repairNo}`}>
                        {cells}
                      </ClickableTableRow>
                    ) : (
                      <DataTableRow key={repair.id}>{cells}</DataTableRow>
                    )
                  })}
                </DataTableBody>
              </DataTable>
            </div>
            <ContentPanelRows className="md:hidden">
              {repairs.map((repair) => {
                const work = [repair.problem, repair.resolution].filter(Boolean).join(" · ")
                const facts = [
                  formatRepairPeriod(repair.reportedDate, repair.returnDate, locale),
                  daysLabel(repair),
                  repair.repairer,
                  repair.repairCost == null ? null : formatMoney(repair.repairCost, { unit: tCommon("baht") }),
                ]
                  .filter(Boolean)
                  .join(" · ")
                const body = (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <span className="tag">{repair.repairNo}</span>
                      {statusBadge(repair)}
                    </div>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-foreground">
                      {repair.maintenancePlanId ? <Chip>{t("maintenancePmBadge")}</Chip> : null}
                      <span className="break-words">{work}</span>
                    </div>
                    <div className="mt-1 text-meta text-muted-foreground">{facts}</div>
                  </>
                )
                return (
                  <li key={repair.id}>
                    {canViewRepairs ? (
                      <Link href={repairHref(repair)} aria-label={`${tCommon("view")}: ${repair.repairNo}`} className="block min-w-0">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                )
              })}
            </ContentPanelRows>
          </>
        )}
      </ContentPanel>

      <ContentPanel divided flush title={t("repairTab.pmTitle")}
        actions={
          canCreatePlan ? (
            <Link href={`/${locale}/maintenance/pm/new?assetId=${encodeURIComponent(assetId)}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t("repairTab.pmSetup")}
            </Link>
          ) : undefined
        }
      >
        {plans.length === 0 ? (
          <EmptyNote padded>{t("repairTab.pmEmpty")}</EmptyNote>
        ) : (
          <ContentPanelRows>
            {plans.map((plan) => {
              const isActivePlan = plan.planState === "active"
              const dueState = getMaintenancePlanDueState(plan.nextDueDate, now)
              const dueTone = dueState === "overdue" ? "danger" : dueState === "due_soon" ? "warning" : "primary"
              return (
                <li key={plan.id} className="grid min-w-0 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(200px,260px)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{plan.title}</div>
                    <div className="mt-1 truncate text-meta text-muted-foreground">
                      <span className="tag">{plan.planNo}</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{tMaintenance("pmNextDueDate")}: {formatDate(plan.nextDueDate)}</div>
                    <div className="mt-1">
                      {tMaintenance("pmExternalProvider")}: {plan.vendor ? <><span className="tag">{plan.vendor.code}</span> - {plan.vendor.name}</> : tMaintenance("pmNoExternalProvider")}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                    {isActivePlan ? <StatusBadge label={tMaintenance(`pmDueState.${dueState}`)} tone={dueTone} /> : null}
                    <Chip>{tMaintenance(`pmFrequencies.${plan.frequency}`)}</Chip>
                    <StatusBadge label={tMaintenance(`pmPlanStates.${plan.planState}`)} tone={isActivePlan ? "success" : plan.planState === "paused" ? "warning" : "muted"} />
                  </div>
                </li>
              )
            })}
          </ContentPanelRows>
        )}
      </ContentPanel>
    </div>
  )
}
