import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { LocationDeactivateButton, LocationReactivateButton } from "@/components/master-data/location-deactivate-button"
import { LocationTreeView, type LocationTreeViewBranch, type LocationTreeViewNode } from "@/components/master-data/location-tree-view"
import { formatCount } from "@/lib/display-format"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { locationTypes } from "@/lib/validations/location"
import { formatLocationType, getLocationTypeLabels, matchLocationTypesByLabel } from "@/lib/location-types"
import { buildLocationTree, locationRuleSelect, type LocationNodeInput, type LocationTreeNode } from "@/lib/location-tree"
import {
  buildLocationAddChildHref,
  buildLocationDrilldownHrefs,
  buildLocationOrderBy,
  buildLocationQueryString,
  buildLocationSummary,
  buildLocationWhere,
  parseLocationListParams,
  type LocationListParams,
  type LocationListState,
  type LocationSort,
} from "@/lib/location-list-query"

type LocationsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<LocationListParams>
}

export default async function LocationsPage({ params, searchParams }: LocationsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "location", "view")

  const t = await getTranslations("location")
  const tCommon = await getTranslations("common")
  const listState = parseLocationListParams(rawSearchParams)
  const searchText = listState.search
  const where = buildLocationWhere(listState, matchLocationTypesByLabel(listState.search, getLocationTypeLabels(t)))

  // G7P3-R4: the tree is the default view. A search shows the list with paths (board MD-Locations, the user's ruling).
  // The list's page of rows is read only when the list is shown.
  const showList = listState.view === "list" || listState.search !== ""

  const [locations, total, allLocations, branches] = await Promise.all([
    showList
      ? prisma.location.findMany({
          where,
          include: {
            branch: {
              select: {
                code: true,
                name: true,
                company: {
                  select: {
                    code: true,
                    nameTh: true,
                  },
                },
              },
            },
            parent: {
              select: {
                code: true,
                name: true,
              },
            },
            _count: {
              select: {
                currentAssets: { where: { isActive: true } },
                homeAssets: { where: { isActive: true } },
                children: { where: { isActive: true } },
                auditRounds: true,
              },
            },
          },
          orderBy: buildLocationOrderBy(listState),
          skip: (listState.page - 1) * listState.pageSize,
          take: listState.pageSize,
        })
      : Promise.resolve([]),
    showList ? prisma.location.count({ where }) : Promise.resolve(0),
    // Every location once (a branch holds hundreds): the summary, the tree with its counts and the name paths are built
    // from these in memory. The counts are the ones DELETE checks, so ปิดใช้งาน can name its blockers up front.
    prisma.location.findMany({
      select: {
        ...locationRuleSelect,
        branch: {
          select: {
            code: true,
            name: true,
            company: {
              select: {
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            currentAssets: { where: { isActive: true } },
            homeAssets: { where: { isActive: true } },
            children: { where: { isActive: true } },
            auditRounds: true,
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        company: {
          select: {
            code: true,
          },
        },
      },
      orderBy: { code: "asc" },
    }),
  ])
  const basePath = `/${locale}/master-data/locations`
  const locationReturnHref = `${basePath}?${buildLocationQueryString(listState, {})}`
  const activeLocations = allLocations.filter((location) => location.isActive)
  const summary = buildLocationSummary(activeLocations)
  const typeLabel = (type: string) => formatLocationType(type, t)

  // The tree (spec §6.1): roots per branch with own and subtree asset counts (G7P3-R2). Every row hangs under its stored
  // parent whatever its status (isActive is given as true to the builder), so "ทั้งหมด" shows an inactive room in its
  // place and the name paths run through inactive parents. The tree shows the rows of the status filter.
  const locationById = new Map(allLocations.map((location) => [location.id, location]))
  const asTreeInput = (location: (typeof allLocations)[number]): LocationNodeInput => ({
    id: location.id,
    code: location.code,
    name: location.name,
    locationType: location.locationType,
    branchId: location.branchId,
    parentId: location.parentId,
    isActive: true,
    ownAssetCount: location._count.currentAssets,
  })
  const fullTree = buildLocationTree(allLocations.map(asTreeInput))
  const tree =
    listState.status === "all"
      ? fullTree
      : buildLocationTree(allLocations.filter((location) => location.isActive === (listState.status === "active")).map(asTreeInput))
  const namePaths = new Map<string, string[]>()
  const collectPaths = (node: LocationTreeNode) => {
    namePaths.set(node.id, node.path)
    node.children.forEach(collectPaths)
  }
  for (const roots of fullTree.values()) roots.forEach(collectPaths)
  // The list writes the path with names ("สำนักงานใหญ่ › อาคาร A › ชั้น 3").
  const namePathOf = (location: { id: string; name: string }) => (namePaths.get(location.id) ?? [location.name]).join(" › ")

  const toTreeViewNode = (node: LocationTreeNode): LocationTreeViewNode => {
    const location = locationById.get(node.id)
    const counts = location?._count
    return {
      id: node.id,
      code: node.code,
      name: node.name,
      typeLabel: typeLabel(node.locationType),
      isActive: location?.isActive ?? true,
      ownAssetCount: node.ownAssetCount,
      subtreeAssetCount: node.subtreeAssetCount,
      parentOtherBranch: node.parentOtherBranch,
      path: namePathOf(node),
      editHref: appendMasterDataReturnTo(`/${locale}/master-data/locations/${node.id}/edit`, locationReturnHref),
      addChildHref: appendMasterDataReturnTo(buildLocationAddChildHref({ locale, branchId: node.branchId, parentId: node.id }), locationReturnHref),
      assetsHref: buildLocationDrilldownHrefs({ locale, locationId: node.id }).assets,
      counts: {
        currentAssets: counts?.currentAssets ?? 0,
        homeAssets: counts?.homeAssets ?? 0,
        activeChildren: counts?.children ?? 0,
        auditRounds: counts?.auditRounds ?? 0,
      },
      record: { code: node.code, name: node.name, branchId: node.branchId, parentId: node.parentId, locationType: node.locationType },
      children: node.children.map(toTreeViewNode),
    }
  }
  const countNodes = (nodes: readonly LocationTreeNode[]): number => nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0)
  const treeBranches: LocationTreeViewBranch[] = [...tree.entries()]
    .filter(([branchId]) => !listState.branchId || branchId === listState.branchId)
    .map(([branchId, roots]) => ({ branchId, roots, branch: locationById.get(roots[0].id)!.branch }))
    .sort((a, b) => a.branch.company.code.localeCompare(b.branch.company.code) || a.branch.code.localeCompare(b.branch.code))
    .map(({ branchId, roots, branch }) => ({
      id: branchId,
      name: branch.name,
      meta: `${branch.company.code} / ${branch.code}`,
      count: countNodes(roots),
      addHref: appendMasterDataReturnTo(buildLocationAddChildHref({ locale, branchId }), locationReturnHref),
      roots: roots.map(toTreeViewNode),
    }))
  const treeFooter = t("tree.footer", {
    branches: formatCount(treeBranches.length),
    locations: formatCount(treeBranches.reduce((sum, branch) => sum + branch.count, 0)),
  })
  // "โครงสร้าง" clears the search: a search always shows the list.
  const viewHref = (view: LocationListState["view"]) =>
    `${basePath}?${buildLocationQueryString(listState, view === "tree" ? { view, search: "", page: 1 } : { view, page: 1 })}`
  const listHref = (next: Partial<LocationListState>) => `${basePath}?${buildLocationQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (locations.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = showList
    ? listState.status !== "active" || Boolean(listState.search || listState.branchId || listState.locationType || listState.assetUsage !== "all" || listState.hierarchy !== "all")
    : listState.status !== "active" || Boolean(listState.branchId)
  type ListLocation = (typeof locations)[number]
  const blockerCountsOf = (location: ListLocation) => ({
    currentAssets: location._count.currentAssets,
    homeAssets: location._count.homeAssets,
    activeChildren: location._count.children,
    auditRounds: location._count.auditRounds,
  })
  const addChildHrefOf = (location: ListLocation) =>
    appendMasterDataReturnTo(buildLocationAddChildHref({ locale, branchId: location.branchId, parentId: location.id }), locationReturnHref)
  const reactivateRecord = (location: ListLocation) => ({
    code: location.code,
    name: location.name,
    branchId: location.branchId,
    parentId: location.parentId,
    locationType: location.locationType,
  })
  const sortBy = (field: LocationSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/locations/new`, locationReturnHref)} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />

      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(summary.total),
            foot: t("summaryRoot", { count: summary.rootLocations }),
            footTitle: t("summaryRoot", { count: summary.rootLocations }),
            href: basePath,
          },
          {
            key: "withAssets",
            label: t("summaryWithAssets"),
            value: formatCount(summary.withAssets),
            foot: t("summaryWithAssetsHelp"),
            footTitle: t("summaryWithAssetsHelp"),
            href: listHref({ assetUsage: "withAssets", view: "list", page: 1 }),
            current: showList && listState.assetUsage === "withAssets",
          },
          {
            key: "withoutAssets",
            label: t("summaryWithoutAssets"),
            value: formatCount(summary.withoutAssets),
            foot: t("summaryWithoutAssetsHelp"),
            footTitle: t("summaryWithoutAssetsHelp"),
            href: listHref({ assetUsage: "withoutAssets", view: "list", page: 1 }),
            current: showList && listState.assetUsage === "withoutAssets",
            attention: summary.withoutAssets > 0,
          },
          {
            key: "leaf",
            label: t("summaryLeaf"),
            value: formatCount(summary.leafLocations),
            foot: t("summaryLeafHelp"),
            footTitle: t("summaryLeafHelp"),
            href: listHref({ hierarchy: "leaf", view: "list", page: 1 }),
            current: showList && listState.hierarchy === "leaf",
          },
          {
            key: "root",
            label: t("summaryRootCard"),
            value: formatCount(summary.rootLocations),
            foot: t("summaryRootHelp"),
            footTitle: t("summaryRootHelp"),
            href: listHref({ hierarchy: "root", view: "list", page: 1 }),
            current: showList && listState.hierarchy === "root",
          },
        ]}
      />

      <FilterPanel>
        <form
          role="search"
          action={basePath}
          className={showList ? "grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]" : "grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(200px,1fr)_minmax(150px,1fr)_auto]"}
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          {showList ? <input type="hidden" name="view" value="list" /> : null}
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={searchText} placeholder={t("searchPlaceholder")} />
          </Field>
          <FilterSelect
            label={t("branch")}
            name="branchId"
            defaultValue={listState.branchId}
            options={[
              { value: "", label: tCommon("all") },
              ...branches.map((branch) => ({
                value: branch.id,
                label: `${branch.company.code} / ${branch.code} - ${branch.name}`,
              })),
            ]}
          />
          {showList ? (
            <>
              <FilterSelect
                label={t("locationType")}
                name="locationType"
                defaultValue={listState.locationType}
                options={[
                  { value: "", label: tCommon("all") },
                  ...locationTypes.map((type) => ({ value: type, label: formatLocationType(type, t) })),
                ]}
              />
              <FilterSelect
                label={t("assetUsageFilter")}
                name="assetUsage"
                defaultValue={listState.assetUsage}
                options={[
                  { value: "all", label: tCommon("all") },
                  { value: "withAssets", label: t("withAssets") },
                  { value: "withoutAssets", label: t("withoutAssets") },
                ]}
              />
              <FilterSelect
                label={t("hierarchyFilter")}
                name="hierarchy"
                defaultValue={listState.hierarchy}
                options={[
                  { value: "all", label: tCommon("all") },
                  { value: "root", label: t("rootLocations") },
                  { value: "child", label: t("childLocations") },
                  { value: "leaf", label: t("leafLocations") },
                ]}
              />
            </>
          ) : null}
          <FilterSelect
            label={tCommon("status")}
            name="status"
            defaultValue={listState.status}
            options={[
              { value: "active", label: tCommon("active") },
              { value: "inactive", label: tCommon("inactive") },
              { value: "all", label: tCommon("all") },
            ]}
          />
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <TabNav
          aria-label={t("view.label")}
          current={showList ? "list" : "tree"}
          items={[
            { key: "tree", label: t("view.tree"), href: viewHref("tree") },
            { key: "list", label: t("view.list"), href: viewHref("list") },
          ]}
        />
        <p className="text-meta text-muted-foreground">{t("view.hint")}</p>
      </div>

      {showList ? (
        <div className={cn(getPanelClasses(), "overflow-hidden")}>
          <DataTable framed={false} className="hidden md:block" caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead sort={sortBy("code")}>{t("code")}</DataTableHead>
                  <DataTableHead sort={sortBy("name")}>{t("name")}</DataTableHead>
                  <DataTableHead>{t("fullPath")}</DataTableHead>
                  <DataTableHead sort={sortBy("branch")}>{t("branch")}</DataTableHead>
                  <DataTableHead sort={sortBy("locationType")}>{t("locationType")}</DataTableHead>
                  <DataTableHead sort={sortBy("parent")}>{t("parentLocation")}</DataTableHead>
                  <DataTableHead align="right" sort={sortBy("currentAssets")}>{t("currentAssets")}</DataTableHead>
                  <DataTableHead align="right" sort={sortBy("children")}>{t("childCount")}</DataTableHead>
                  <DataTableHead>{tCommon("status")}</DataTableHead>
                  <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {locations.length === 0 ? (
                  hasActiveFilters ? (
                    <TableEmptyRow colSpan={10} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
                  ) : (
                    <TableEmptyRow colSpan={10}>{tCommon("noData")}</TableEmptyRow>
                  )
                ) : (
                  locations.map((location) => {
                    const drilldown = buildLocationDrilldownHrefs({ locale, locationId: location.id })
                    const editHref = appendMasterDataReturnTo(`/${locale}/master-data/locations/${location.id}/edit`, locationReturnHref)
                    return (
                      <ClickableTableRow
                        key={location.id}
                        href={editHref}
                        label={`${tCommon("edit")}: ${location.code}`}
                      >
                        <DataTableCell className="whitespace-nowrap">
                          <span className="tag font-medium text-foreground">{location.code}</span>
                        </DataTableCell>
                        <DataTableCell className="min-w-48 text-foreground">{location.name}</DataTableCell>
                        <DataTableCell className="min-w-64 text-muted-foreground">
                          {namePathOf(location)}
                        </DataTableCell>
                        <DataTableCell className="min-w-56 text-muted-foreground">
                          <span className="tag">{location.branch.company.code}</span> / <span className="tag">{location.branch.code}</span> - {location.branch.name}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatLocationType(location.locationType, t)}</DataTableCell>
                        <DataTableCell className="min-w-44 text-muted-foreground">
                          {location.parent ? (
                            <>
                              <span className="tag">{location.parent.code}</span> - {location.parent.name}
                            </>
                          ) : (
                            <Nil />
                          )}
                        </DataTableCell>
                        <DataTableCell numeric className="text-muted-foreground">
                          {location._count.currentAssets > 0 ? (
                            <Link
                              href={drilldown.assets}
                              className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                            >
                              {formatCount(location._count.currentAssets)}
                            </Link>
                          ) : (
                            formatCount(0)
                          )}
                        </DataTableCell>
                        <DataTableCell numeric className="text-muted-foreground">{formatCount(location._count.children)}</DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <StatusBadge label={location.isActive ? tCommon("active") : tCommon("inactive")} tone={location.isActive ? "success" : "muted"} />
                          {location.isActive ? null : (
                            <LocationReactivateButton endpoint={`/api/locations/${location.id}`} name={location.name} record={reactivateRecord(location)} />
                          )}
                        </DataTableCell>
                        <DataTableCell align="right" sticky="right">
                          <LocationDeactivateButton
                            endpoint={`/api/locations/${location.id}`}
                            name={location.name}
                            path={namePathOf(location)}
                            isActive={location.isActive}
                            counts={blockerCountsOf(location)}
                            addChildHref={addChildHrefOf(location)}
                            menuLabel={tCommon("moreActionsFor", { code: location.code })}
                            next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                          />
                        </DataTableCell>
                      </ClickableTableRow>
                    )
                  })
                )}
              </DataTableBody>
          </DataTable>

          {/* Phone: the list as compact cards (name, path, type, counts, ⋯). */}
          <div data-location-mobile-list className="md:hidden">
            {locations.length === 0 ? (
              <ActionEmptyState
                title={tCommon("noData")}
                actionHref={hasActiveFilters ? basePath : undefined}
                actionLabel={hasActiveFilters ? t("clearFilters") : undefined}
                actionVariant="secondary"
              />
            ) : (
              <div className="grid gap-3 p-3">
                {locations.map((location) => {
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/locations/${location.id}/edit`, locationReturnHref)
                  return (
                    <article key={location.id} className="relative min-w-0 rounded-md border border-border bg-background p-3">
                      <h2 className="break-words text-base font-semibold text-primary">
                        <Link
                          href={editHref}
                          className="rounded-md after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                        >
                          {location.name}
                        </Link>
                      </h2>
                      <p className="text-meta text-muted-foreground">
                        <span className="tag">{location.code}</span> · {formatLocationType(location.locationType, t)}
                      </p>
                      <p className="mt-1 break-words text-sm text-muted-foreground">{namePathOf(location)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-1">
                        <StatusBadge label={location.isActive ? tCommon("active") : tCommon("inactive")} tone={location.isActive ? "success" : "muted"} />
                        {location.isActive ? null : (
                          <span className="relative z-10">
                            <LocationReactivateButton endpoint={`/api/locations/${location.id}`} name={location.name} record={reactivateRecord(location)} />
                          </span>
                        )}
                        <span className="num text-meta text-muted-foreground">
                          {t("childCount")} {formatCount(location._count.children)}
                        </span>
                        <span className="ml-auto flex items-center">
                          {location._count.currentAssets > 0 ? (
                            <Link
                              href={buildLocationDrilldownHrefs({ locale, locationId: location.id }).assets}
                              aria-label={t("tree.assetsAt", { name: location.name, n: formatCount(location._count.currentAssets) })}
                              className={cn(linkVariants({ size: "inherit" }), "num relative z-10 inline-flex min-h-11 items-center text-sm font-medium")}
                            >
                              {t("currentAssets")} {formatCount(location._count.currentAssets)}
                            </Link>
                          ) : (
                            <span className="inline-flex min-h-11 items-center text-sm text-muted-foreground">
                              {t("currentAssets")} {formatCount(0)}
                            </span>
                          )}
                          <LocationDeactivateButton
                            className="relative z-10"
                            endpoint={`/api/locations/${location.id}`}
                            name={location.name}
                            path={namePathOf(location)}
                            isActive={location.isActive}
                            counts={blockerCountsOf(location)}
                            addChildHref={addChildHrefOf(location)}
                            menuLabel={tCommon("moreActionsFor", { code: location.code })}
                            next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                          />
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          {total > 0 ? (
            <DataTableFoot>
        <Pagination
          page={listState.page}
          totalPages={totalPages}
          previousHref={listHref({ page: listState.page - 1 })}
          nextHref={listHref({ page: listState.page + 1 })}
          pageSize={listState.pageSize}
          pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
          labels={{
            navigation: tCommon("pagination"),
            previous: tCommon("previous"),
            next: tCommon("next"),
            pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
            range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
            pageSizeGroup: tCommon("pageSizeLabel"),
            rowsPerPage: tCommon("rowsPerPage"),
          }}
        />
            </DataTableFoot>
          ) : null}
        </div>
      ) : (
        <LocationTreeView key={`${listState.status}|${listState.branchId}`} branches={treeBranches} footer={treeFooter} />
      )}
    </div>
  )
}
