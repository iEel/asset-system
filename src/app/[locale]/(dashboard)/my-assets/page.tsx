import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { PackageCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { getSessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { buildMyAssetsWhere, summarizeMyAssets } from "@/lib/my-assets"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn, formatDateTime } from "@/lib/utils"

type MyAssetsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[] }>
}

// An asset's photo: its newest active image. The list and the summary read it the same way.
const myAssetPhotoWhere = { module: "asset", fileType: { startsWith: "image/" }, isActive: true } satisfies Prisma.AttachmentWhereInput

const myAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  updatedAt: true,
  custodianId: true,
  category: { select: { code: true, name: true } },
  company: { select: { code: true } },
  branch: { select: { code: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
  attachments: {
    where: myAssetPhotoWhere,
    select: { id: true, originalName: true },
    orderBy: { uploadedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.AssetSelect

type MyAssetRow = Prisma.AssetGetPayload<{ select: typeof myAssetSelect }>

export default async function MyAssetsPage({ params, searchParams }: MyAssetsPageProps) {
  const { locale } = await params
  const { page, pageSize } = await searchParams
  const user = await getSessionUser()
  const t = await getTranslations("myAssets")
  const tCommon = await getTranslations("common")

  if (!user?.employeeId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} meta={t("subtitle")} />
        <ContentPanel>
          <ActionEmptyState tone="permission" title={t("noLinkedEmployeeTitle")} description={t("noLinkedEmployeeHelp")} />
        </ContentPanel>
      </div>
    )
  }

  const listPage = parseListPage({ page, pageSize })
  const basePath = `/${locale}/my-assets`
  // The list URL with its page and page size; the defaults stay out of it, so page 1 keeps today's URL (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = appendListPage(new URLSearchParams(), next).toString()
    return query ? `${basePath}?${query}` : basePath
  }
  // buildMyAssetsWhere scopes to custodianId server-side.
  const where = buildMyAssetsWhere({ employeeId: user.employeeId })
  const { skip, take } = listPageWindow(listPage)
  // One round trip: the page of assets, the count of all of them, and a light read of every one (its status name and
  // one photo id) for the summary, which stays a full total (spec 2B §5.9.2 row 9).
  const [assets, total, summaryAssets] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: myAssetSelect,
      orderBy: [{ status: { sortOrder: "asc" } }, { updatedAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      select: { status: { select: { name: true } }, attachments: { where: myAssetPhotoWhere, select: { id: true }, take: 1 } },
    }),
  ])
  // A page past the last one (an old link, or an asset handed back since) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (assets.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  // The detail page's back link returns to this page of the list, with its page size (spec 2B §5.9.2 row 9, 2D M32 c).
  const returnHref = listHref({ page: listPage.page, pageSize: listPage.pageSize })
  const labels = {
    asset: t("asset"),
    serialNumber: t("serialNumber"),
    status: t("status"),
    condition: t("condition"),
    location: t("location"),
    companyBranch: t("companyBranch"),
    category: t("category"),
    updatedAt: t("updatedAt"),
    openDetail: t("openDetail"),
  }
  const summary = summarizeMyAssets(
    summaryAssets.map((asset) => ({
      statusName: asset.status.name,
      hasPhoto: asset.attachments.length > 0,
    })),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={`/${locale}/work-center?view=mine`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {t("openWorkCenter")}
          </Link>
        }
      />

      <section aria-label={t("summary")}>
        <StatStrip
          items={[
            { key: "total", label: t("total"), value: formatCount(summary.total) },
            { key: "ready", label: t("ready"), value: formatCount(summary.ready) },
            { key: "needsAttention", label: t("needsAttention"), value: formatCount(summary.needsAttention) },
            { key: "missingPhoto", label: t("missingPhoto"), value: formatCount(summary.missingPhoto) },
          ]}
        />
      </section>

      <ContentPanel divided flush className="overflow-hidden" title={t("list")}>
        {total === 0 ? (
          <ActionEmptyState icon={<PackageCheck />} title={t("emptyTitle")} description={t("emptyHelp")} />
        ) : (
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {assets.map((asset) => (
                <MobileAssetCard key={asset.id} labels={labels} asset={asset} href={buildMyAssetDetailHref(locale, asset.id, returnHref)} />
              ))}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("list")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{labels.asset}</DataTableHead>
                  <DataTableHead>{labels.serialNumber}</DataTableHead>
                  <DataTableHead>{labels.status}</DataTableHead>
                  <DataTableHead>{labels.condition}</DataTableHead>
                  <DataTableHead>{labels.location}</DataTableHead>
                  <DataTableHead>{labels.companyBranch}</DataTableHead>
                  <DataTableHead>{labels.updatedAt}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {assets.map((asset) => {
                  const href = buildMyAssetDetailHref(locale, asset.id, returnHref)
                  return (
                    <ClickableTableRow key={asset.id} href={href} label={`${labels.openDetail}: ${asset.assetTag}`}>
                      <DataTableCell>
                        <AssetIdentity asset={asset} href={href} />
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : <Nil />}</DataTableCell>
                      <DataTableCell>
                        <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
                      </DataTableCell>
                      <DataTableCell>
                        <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} />
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">
                        <span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">
                        <span className="tag">{asset.company.code}</span> / <span className="tag">{asset.branch.code}</span>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(asset.updatedAt)}</DataTableCell>
                    </ClickableTableRow>
                  )
                })}
              </DataTableBody>
            </DataTable>
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
          </>
        )}
      </ContentPanel>
    </div>
  )
}

function AssetIdentity({ asset, href }: { asset: MyAssetRow; href?: string }) {
  const photo = asset.attachments[0]
  const content = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        {photo ? (
          <Image
            src={`/api/attachments/${photo.id}?inline=1`}
            alt={photo.originalName}
            width={48}
            height={48}
            className="h-full w-full object-contain bg-image-stage"
            unoptimized
          />
        ) : (
          <PackageCheck className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-foreground"><span className="tag font-medium">{asset.assetTag}</span></div>
        <div className="truncate text-sm text-foreground">{asset.name}</div>
        <div className="truncate text-meta text-muted-foreground">
          <span className="tag">{asset.category.code}</span> - {asset.category.name}
        </div>
      </div>
    </div>
  )

  if (!href) return content
  return (
    <Link href={href} className="block rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  )
}

// A card in a panel is a quiet grouping (2D-2 R4); its facts are the shared label and value list (spec 2D D19).
function MobileAssetCard({ labels, asset, href }: { labels: Record<string, string>; asset: MyAssetRow; href: string }) {
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-3">
      <AssetIdentity asset={asset} href={href} />
      <KeyValueList
        className="mt-3"
        items={[
          { key: "serialNumber", label: labels.serialNumber, value: asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : null },
          { key: "category", label: labels.category, value: <><span className="tag">{asset.category.code}</span> - {asset.category.name}</> },
          { key: "location", label: labels.location, value: <><span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}</> },
          { key: "companyBranch", label: labels.companyBranch, value: <><span className="tag">{asset.company.code}</span> / <span className="tag">{asset.branch.code}</span></> },
          { key: "status", label: labels.status, value: <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} /> },
          { key: "condition", label: labels.condition, value: <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} /> },
          { key: "updatedAt", label: labels.updatedAt, value: formatDateTime(asset.updatedAt) },
        ]}
      />
      <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}>
        {labels.openDetail}
      </Link>
    </article>
  )
}

function buildMyAssetDetailHref(locale: string, assetId: string, returnHref: string) {
  return appendOperationalReturnTo(`/${locale}/my-assets/${encodeURIComponent(assetId)}`, returnHref)
}
