import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { LocationDeleteButton } from "@/components/master-data/location-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { paginationRange } from "@/lib/master-data-query"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { locationTypes } from "@/lib/validations/location"
import {
  buildLocationDrilldownHrefs,
  buildLocationOrderBy,
  buildLocationPathMap,
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
  const tWorkspace = await getTranslations("masterData")
  const listState = parseLocationListParams(rawSearchParams)
  const searchText = listState.search
  const where = buildLocationWhere(listState)

  const [locations, total, summaryLocations, branches, pathLocations] = await Promise.all([
    prisma.location.findMany({
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
    }),
    prisma.location.count({ where }),
    prisma.location.findMany({
      where: { isActive: true },
      select: {
        parentId: true,
        locationType: true,
        _count: {
          select: {
            currentAssets: { where: { isActive: true } },
            children: { where: { isActive: true } },
          },
        },
      },
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
    prisma.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        parentId: true,
      },
      orderBy: { code: "asc" },
    }),
  ])
  const basePath = `/${locale}/master-data/locations`
  const locationReturnHref = `${basePath}?${buildLocationQueryString(listState, {})}`
  const summary = buildLocationSummary(summaryLocations)
  const locationPaths = buildLocationPathMap(pathLocations)

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/locations/new`, locationReturnHref)}
        createLabel={tCommon("create")}
        workspace={{
          locale,
          activeId: "locations",
          labels: {
            companies: tWorkspace("companies"),
            branches: tWorkspace("branches"),
            locations: tWorkspace("locations"),
            employees: tWorkspace("employees"),
            suppliers: tWorkspace("suppliers"),
          },
          navigationLabel: tWorkspace("workspaceNavigation"),
        }}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryTile
          label={t("summaryTotal")}
          value={summary.total}
          detail={t("summaryRoot", { count: summary.rootLocations })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryWithAssets")}
          value={summary.withAssets}
          detail={t("summaryWithAssetsHelp")}
          href={`${basePath}?${buildLocationQueryString(listState, { assetUsage: "withAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutAssets")}
          value={summary.withoutAssets}
          detail={t("summaryWithoutAssetsHelp")}
          href={`${basePath}?${buildLocationQueryString(listState, { assetUsage: "withoutAssets", page: 1 })}`}
          tone={summary.withoutAssets > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryLeaf")}
          value={summary.leafLocations}
          detail={t("summaryLeafHelp")}
          href={`${basePath}?${buildLocationQueryString(listState, { hierarchy: "leaf", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryRootCard")}
          value={summary.rootLocations}
          detail={t("summaryRootHelp")}
          href={`${basePath}?${buildLocationQueryString(listState, { hierarchy: "root", page: 1 })}`}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(150px,1fr))_auto]"
          action={basePath}
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={searchText}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
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
          <FilterSelect
            label={t("locationType")}
            name="locationType"
            defaultValue={listState.locationType}
            options={[
              { value: "", label: tCommon("all") },
              ...locationTypes.map((type) => ({ value: type, label: type })),
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
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              {tCommon("filter")}
            </button>
            <Link
              href={basePath}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <LocationSortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</LocationSortableColumnHeader>
                <ColumnHeader>{t("fullPath")}</ColumnHeader>
                <LocationSortableColumnHeader field="branch" current={listState} basePath={basePath}>{t("branch")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="locationType" current={listState} basePath={basePath}>{t("locationType")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="parent" current={listState} basePath={basePath}>{t("parentLocation")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="currentAssets" current={listState} basePath={basePath}>{t("currentAssets")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="children" current={listState} basePath={basePath}>{t("childCount")}</LocationSortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                locations.map((location) => {
                  const drilldown = buildLocationDrilldownHrefs({ locale, locationCode: location.code })
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/locations/${location.id}/edit`, locationReturnHref)
                  return (
                    <ClickableTableRow
                      key={location.id}
                      href={editHref}
                      label={`${tCommon("edit")}: ${location.code}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{location.code}</td>
                      <td className="min-w-48 px-4 py-3 text-foreground">{location.name}</td>
                      <td className="min-w-64 px-4 py-3 text-muted-foreground">
                        {locationPaths.get(location.id) ?? location.code}
                      </td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {location.branch.company.code} / {location.branch.code} - {location.branch.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{location.locationType}</td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">
                        {location.parent ? `${location.parent.code} - ${location.parent.name}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {location._count.currentAssets > 0 ? (
                          <Link
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {location._count.currentAssets.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {location._count.children.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={editHref}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <LocationDeleteButton id={location.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <LocationPagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  href: string
  tone?: "neutral" | "warning"
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 ${
        tone === "warning" ? "border-warning/40" : "border-border"
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}

function LocationSortableColumnHeader({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: LocationSort
  current: LocationListState
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildLocationQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <Link href={href} className={`inline-flex items-center gap-1 hover:text-primary ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

function LocationPagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: LocationListState
  total: number
  basePath: string
  labels: {
    rowsPerPage: string
    page: string
    of: string
    previous: string
    next: string
  }
}) {
  const { start, end, totalPages } = paginationRange(current.page, current.pageSize, total)
  const safePage = Math.min(current.page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((pageSize) => (
          <Link
            key={pageSize}
            href={`${basePath}?${buildLocationQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildLocationQueryString(current, { page: previousPage })}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildLocationQueryString(current, { page: nextPage })}`}
          aria-disabled={safePage >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
