import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { LocationDeleteButton } from "@/components/master-data/location-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataPagination,
  MasterDataSearch,
  SortableColumnHeader,
} from "@/components/master-data/master-data-layout"
import { parseMasterDataListParams } from "@/lib/master-data-query"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type LocationsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string; sort?: string; direction?: string }>
}

const locationSorts = ["createdAt", "code", "name", "branch", "locationType", "parent"] as const
type LocationSort = (typeof locationSorts)[number]

export default async function LocationsPage({ params, searchParams }: LocationsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "location", "view")

  const t = await getTranslations("location")
  const tCommon = await getTranslations("common")
  const listState = parseMasterDataListParams<LocationSort>({
    input: rawSearchParams,
    allowedSorts: locationSorts,
    defaultSort: "createdAt",
  })
  const searchText = listState.search
  const where: Prisma.LocationWhereInput = {
    isActive: true,
    ...(searchText
      ? {
          OR: [
            { code: { contains: searchText } },
            { name: { contains: searchText } },
            { locationType: { contains: searchText } },
            { branch: { code: { contains: searchText } } },
            { branch: { name: { contains: searchText } } },
            { branch: { company: { code: { contains: searchText } } } },
            { branch: { company: { nameTh: { contains: searchText } } } },
          ],
        }
      : {}),
  }

  const [locations, total] = await Promise.all([
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
      },
      orderBy: buildLocationOrderBy(listState.sort, listState.direction),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.location.count({ where }),
  ])
  const basePath = `/${locale}/master-data/locations`

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/locations/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/master-data/locations`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ pageSize: listState.pageSize, sort: listState.sort, direction: listState.direction }}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <SortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</SortableColumnHeader>
                <SortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</SortableColumnHeader>
                <SortableColumnHeader field="branch" current={listState} basePath={basePath}>{t("branch")}</SortableColumnHeader>
                <SortableColumnHeader field="locationType" current={listState} basePath={basePath}>{t("locationType")}</SortableColumnHeader>
                <SortableColumnHeader field="parent" current={listState} basePath={basePath}>{t("parentLocation")}</SortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                locations.map((location) => (
                  <ClickableTableRow
                    key={location.id}
                    href={`/${locale}/master-data/locations/${location.id}/edit`}
                    label={`${tCommon("edit")}: ${location.code}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{location.code}</td>
                    <td className="min-w-48 px-4 py-3 text-foreground">{location.name}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {location.branch.company.code} / {location.branch.code} - {location.branch.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{location.locationType}</td>
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">
                      {location.parent ? `${location.parent.code} - ${location.parent.name}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActiveBadge label={tCommon("active")} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/master-data/locations/${location.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <LocationDeleteButton id={location.id} />
                      </div>
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
        <MasterDataPagination
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

function buildLocationOrderBy(sort: LocationSort, direction: "asc" | "desc"): Prisma.LocationOrderByWithRelationInput {
  if (sort === "branch") return { branch: { code: direction } }
  if (sort === "parent") return { parent: { code: direction } }
  return { [sort]: direction }
}
