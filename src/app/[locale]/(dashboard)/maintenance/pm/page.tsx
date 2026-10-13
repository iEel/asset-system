import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDate } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getMaintenancePlanDueState, planStatePageSlices } from "@/lib/preventive-maintenance"
import type { MaintenancePlanState } from "@/lib/maintenance-plan-service"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTableFoot } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatusBadge } from "@/components/ui/status-badge"
import { MaintenancePlanStateActions } from "@/components/maintenance/maintenance-plan-state-actions"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[] }>
}

export default async function MaintenancePlansPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { page, pageSize } = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tRecord = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const now = new Date()
  const listPage = parseListPage({ page, pageSize })
  const basePath = `/${locale}/maintenance/pm`
  // The list URL with its page and page size; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = appendListPage(new URLSearchParams(), next).toString()
    return query ? `${basePath}?${query}` : basePath
  }
  const planListReturnHref = listHref(listPage)

  // Active plans first, then paused, then ended, each by next due date, across every page (spec 2B §5.9.2 row 6).
  // The count per state places the page's window in the states it covers: usually one findMany, at most three.
  const stateCounts = await prisma.maintenancePlan.groupBy({ by: ["planState"], _count: { _all: true } })
  const total = stateCounts.reduce((sum, row) => sum + row._count._all, 0)
  const slices = planStatePageSlices(
    stateCounts.map((row) => ({ planState: row.planState, count: row._count._all })),
    listPageWindow(listPage),
  )
  const plans = (
    await Promise.all(
      slices.map((slice) =>
        prisma.maintenancePlan.findMany({
          where: { planState: slice.planState },
          include: {
            asset: { select: { assetTag: true, name: true } },
            vendor: { select: { code: true, name: true } },
          },
          orderBy: [{ nextDueDate: "asc" }, { id: "asc" }],
          skip: slice.skip,
          take: slice.take,
        }),
      ),
    )
  ).flat()
  // A page past the last one (an old or hand-typed link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (plans.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)

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
              const dueState = getMaintenancePlanDueState(plan.nextDueDate, now)
              const dueTone = dueState === "overdue" ? "danger" : dueState === "due_soon" ? "warning" : "primary"
              return (
                <li key={plan.id} className="grid min-w-0 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(200px,260px)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{plan.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      <span className="tag">{plan.planNo}</span> · <span className="tag">{plan.asset.assetTag}</span> - {plan.asset.name}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{t("pmNextDueDate")}: {formatDate(plan.nextDueDate)}</div>
                    <div className="mt-1">{t("pmExternalProvider")}: {plan.vendor ? <><span className="tag">{plan.vendor.code}</span> - {plan.vendor.name}</> : t("pmNoExternalProvider")}</div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                    {isActivePlan ? <StatusBadge label={t(`pmDueState.${dueState}`)} tone={dueTone} /> : null}
                    <StatusBadge label={t(`pmFrequencies.${plan.frequency}`)} tone="muted" />
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
              page={listPage.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
              nextHref={listHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
              pageSize={listPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
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
