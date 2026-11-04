import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDate } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { buildPmPlanHref, parsePmPlanQuery, type PmPlanRowView } from "@/lib/pm-plan-list"
import { readPmPlanPage } from "@/lib/pm-plan-page-data"
import type { MaintenancePlanState } from "@/lib/maintenance-plan-service"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTableFoot } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatusBadge } from "@/components/ui/status-badge"
import { MaintenancePlanStateActions } from "@/components/maintenance/maintenance-plan-state-actions"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MaintenancePlansPage({ params, searchParams }: Props) {
  const { locale } = await params
  const query = parsePmPlanQuery(await searchParams)
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tRecord = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const now = new Date()
  // The list URL keeps the tab, the search and the due filter; the default page and page size stay out of it (spec 2B
  // B4). Task 3 of group 5 plan 4 rebuilds this page on the tabs, the due cells and the table.
  const listHref = (next: { page?: number; pageSize?: number }) => buildPmPlanHref(locale, query, next)
  const planListReturnHref = listHref({ page: query.page })

  // One state per page, in that state's order (G5P4-R4), with the open repair record of each plan's asset (G5P4-R5).
  const { rows: plans, total } = await readPmPlanPage(prisma, query, now)
  // A page past the last one (an old or hand-typed link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, query.pageSize)
  if (plans.length === 0 && total > 0 && query.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: query.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(query.page, query.pageSize, total)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: tRecord("title"), href: `/${locale}/maintenance` }, { label: t("pmTitle") }]}
        title={t("pmTitle")}
        meta={t("pmSubtitle")}
        back={<PageBackLink href={`/${locale}/maintenance`} label={tCommon("back")} />}
        actions={
          canCreate ? (
            <Link href={`/${locale}/maintenance/pm/new`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("pmCreateTitle")}
            </Link>
          ) : undefined
        }
      />

      <ContentPanel divided flush className="overflow-hidden">
        {plans.length === 0 ? (
          <div className="p-4">
            <ActionEmptyState title={t("pmEmptyTitle")} description={t("pmEmptyHelp")} />
          </div>
        ) : (
          <ContentPanelRows>
            {plans.map((plan) => {
              const isActivePlan = plan.planState === "active"
              return (
                <li key={plan.id} className="grid min-w-0 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(200px,260px)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{plan.title}</div>
                    <div className="mt-1 truncate text-meta text-muted-foreground">
                      <span className="tag">{plan.planNo}</span> · <span className="tag">{plan.assetTag}</span> - {plan.assetName}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{t("pmNextDueDate")}: {formatDate(plan.nextDueDate)}</div>
                    <div className="mt-1">{t("pmExternalProvider")}: {plan.vendor ? <><span className="tag">{plan.vendor.code}</span> - {plan.vendor.name}</> : t("pmNoExternalProvider")}</div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                    <PlanDueBadge due={plan.due} dueLabel={(state) => t(`pmDueState.${state}`)} />
                    <Chip>{t(`pmFrequencies.${plan.frequency}`)}</Chip>
                    <StatusBadge label={t(`pmPlanStates.${plan.planState}`)} tone={isActivePlan ? "success" : plan.planState === "paused" ? "warning" : "muted"} />
                    {canCreate && isActivePlan ? (
                      <Link href={`/${locale}/maintenance/new?planId=${plan.id}`} className={buttonVariants({ size: "sm" })}>
                        {tRecord("pmRecordDone")}
                      </Link>
                    ) : null}
                    {canEdit && plan.planState !== "ended" ? (
                      <Link href={appendOperationalReturnTo(`/${locale}/maintenance/pm/${plan.id}/edit`, planListReturnHref)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {tCommon("edit")}
                      </Link>
                    ) : null}
                    {canEdit ? <MaintenancePlanStateActions planId={plan.id} state={plan.planState as MaintenancePlanState} /> : null}
                  </div>
                </li>
              )
            })}
          </ContentPanelRows>
        )}
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
              page={query.page}
              totalPages={totalPages}
              previousHref={listHref({ page: query.page - 1, pageSize: query.pageSize })}
              nextHref={listHref({ page: query.page + 1, pageSize: query.pageSize })}
              pageSize={query.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: query.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </ContentPanel>
    </div>
  )
}

// Today's due badge, from the row view: the due state of an active plan in scope, the asset's status for one whose
// asset is written off or inactive (G5P4-R3), nothing for paused or ended plans.
function PlanDueBadge({ due, dueLabel }: { due: PmPlanRowView["due"]; dueLabel: (state: "overdue" | "due_soon" | "upcoming") => string }) {
  if (due.kind === "assetStatus") return <StatusBadge label={due.statusLabel} tone="muted" />
  if (due.kind !== "badge") return null
  const state = due.badge.key === "overdue" ? "overdue" : due.badge.key === "later" ? "upcoming" : "due_soon"
  return <StatusBadge label={dueLabel(state)} tone={due.badge.tone} />
}
