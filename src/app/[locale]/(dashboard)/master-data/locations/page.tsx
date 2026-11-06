import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
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
import { LocationDeactivateButton } from "@/components/master-data/location-deactivate-button"
import { LocationTreeView, type LocationTreeViewBranch, type LocationTreeViewNode } from "@/components/master-data/location-tree-view"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { locationTypes } from "@/lib/validations/location"
import { formatLocationType, getLocationTypeLabels, matchLocationTypesByLabel } from "@/lib/location-types"
import { buildLocationTree, locationRuleSelect, type LocationTreeNode } from "@/lib/location-tree"
import { locationTreeOpenState } from "@/lib/location-tree-view"
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

  // G7P3-R4: the tree is the default view. The list's page of rows is read only when the list is shown.
  const showList = listState.view === "list"

  const [locations, total, activeLocations, branches] = await Promise.all([
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
    // Every active location once (a branch holds hundreds): the summary, the tree with its counts and the name paths are
    // built from these in memory. The counts are the ones DELETE checks, so ปิดใช้งาน can name its blockers up front.
    prisma.location.findMany({
      where: { isActive: true },
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
  const summary = buildLocationSummary(activeLocations)
  const typeLabel = (type: string) => formatLocationType(type, t)

  // The tree (spec §6.1): roots per branch with own and subtree asset counts (G7P3-R2) and the name path of each node.
  const locationById = new Map(activeLocations.map((location) => [location.id, location]))
  const tree = buildLocationTree(
    activeLocations.map((location) => ({
      id: location.id,
      code: location.code,
      name: location.name,
      locationType: location.locationType,
      branchId: location.branchId,
      parentId: location.parentId,
      isActive: location.isActive,
      ownAssetCount: location._count.currentAssets,
    })),
  )
  const namePaths = new Map<string, string[]>()
  const collectPaths = (node: LocationTreeNode) => {
    namePaths.set(node.id, node.path)
    node.children.forEach(collectPaths)
  }
  for (const roots of tree.values()) roots.forEach(collectPaths)
  // The list writes the path with names; an inactive row (not in the tree) hangs its name under its parent's path.
  const namePathOf = (location: { id: string; name: string; parentId: string | null }) =>
    (namePaths.get(location.id) ?? [...((location.parentId && namePaths.get(location.parentId)) || []), location.name]).join(" › ")

  const toTreeViewNode = (node: LocationTreeNode): LocationTreeViewNode => {
    const counts = locationById.get(node.id)?._count
    return {
      id: node.id,
      code: node.code,
      name: node.name,
      typeLabel: typeLabel(node.locationType),
      ownAssetCount: node.ownAssetCount,
      subtreeAssetCount: node.subtreeAssetCount,
      parentOtherBranch: node.parentOtherBranch,
      path: node.path.join(" › "),
      editHref: appendMasterDataReturnTo(`/${locale}/master-data/locations/${node.id}/edit`, locationReturnHref),
      addChildHref: appendMasterDataReturnTo(buildLocationAddChildHref({ locale, branchId: node.branchId, parentId: node.id }), locationReturnHref),
      assetsHref: buildLocationDrilldownHrefs({ locale, locationId: node.id }).assets,
      counts: {
        currentAssets: counts?.currentAssets ?? 0,
        homeAssets: counts?.homeAssets ?? 0,
        activeChildren: counts?.children ?? 0,
        auditRounds: counts?.auditRounds ?? 0,
      },
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
  // G7P3-R1: one level open; a search opens the ancestors of its matches and marks them.
  const treeOpenState = locationTreeOpenState(
    treeBranches.flatMap((branch) => tree.get(branch.id) ?? []),
    listState.search,
    typeLabel,
  )
  const treeFooter = t("tree.footer", {
    branches: formatCount(treeBranches.length),
    locations: formatCount(treeBranches.reduce((sum, branch) => sum + branch.count, 0)),
  })
  const viewHref = (view: LocationListState["view"]) => `${basePath}?${buildLocationQueryString(listState, { view, page: 1 })}`
  const listHref = (next: Partial<LocationListState>) => `${basePath}?${buildLocationQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (locations.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = showList
    ? listState.status !== "active" || Boolean(listState.search || listState.branchId || listState.locationType || listState.assetUsage !== "all" || listState.hierarchy !== "all")
    : Boolean(listState.search || listState.branchId)
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
          className={showList ? "grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]" : "grid gap-3 md:grid-cols-[minmax(220px,1.4fr)_minmax(200px,1fr)_auto]"}
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
            </>
          ) : null}
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 md:flex">
        <TabNav
          aria-label={t("view.label")}
          current={listState.view}
          items={[
            { key: "tree", label: t("view.tree"), href: viewHref("tree") },
            { key: "list", label: t("view.list"), href: viewHref("list") },
          ]}
        />
        {showList ? null : <p className="text-meta text-muted-foreground">{t("tree.activeOnly")}</p>}
      </div>

      {/* Phone: the tree only, as an indented list (spec §6.1). */}
      <div className={showList ? "md:hidden" : undefined}>
        <LocationTreeView
          key={`${listState.search}|${listState.branchId}`}
          branches={treeBranches}
          initialExpanded={treeOpenState.expanded}
          matches={treeOpenState.matches}
          search={listState.search}
          footer={treeFooter}
        />
      </div>

      {showList ? (
        <div className="hidden md:block">
          <DataTable
            caption={t("title")}
            scrollHint={tCommon("tableScrollHint")}
            footer={
              total > 0 ? (
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
              ) : undefined
            }
          >
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
                      </DataTableCell>
                      <DataTableCell align="right" sticky="right">
                        <LocationDeactivateButton
                          endpoint={`/api/locations/${location.id}`}
                          name={location.name}
                          path={namePathOf(location)}
                          isActive={location.isActive}
                          counts={{
                            currentAssets: location._count.currentAssets,
                            homeAssets: location._count.homeAssets,
                            activeChildren: location._count.children,
                            auditRounds: location._count.auditRounds,
                          }}
                          addChildHref={appendMasterDataReturnTo(buildLocationAddChildHref({ locale, branchId: location.branchId, parentId: location.id }), locationReturnHref)}
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
        </div>
      ) : null}
    </div>
  )
}
