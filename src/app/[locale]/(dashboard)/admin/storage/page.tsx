import path from "node:path"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { cn, formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import {
  buildStorageGovernanceDryRun,
  formatStorageSize,
  scanUploadDirectory,
  summarizeStorageGovernance,
} from "@/lib/storage-governance"
import {
  buildStorageRows,
  filterStorageRows,
  parseStorageFilter,
  STORAGE_ROWS_PREVIEW,
  storageFolderLabelKey,
  storageModuleLabelKey,
  type AssetRef,
  type StorageFilter,
  type StorageRefs,
  type StorageRow as StorageRowModel,
} from "@/lib/storage-page-model"
import { getUploadRoot } from "@/lib/uploads"
import { StorageFilterChips } from "@/components/admin/storage/storage-filter-chips"
import { StorageRow, storageRowGridClasses, type StorageRowView } from "@/components/admin/storage/storage-row"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type StoragePageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const largeFileThresholdBytes = 10 * 1024 * 1024

// Board AD-Storage (page group 12 plan 3, spec §8, §15 item 10): the header names the upload folder; four tiles with the
// review breakdown; the file check with the equation line, filter chips (missing files first), rows that expand and
// show-all as a URL param; the module table with share bars and a total; the duplicate or empty path list and the
// largest files, both naming the asset. Gate setting:view; the archive button needs setting:edit.
export default async function StorageGovernancePage({ params, searchParams }: StoragePageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "setting", "view")
  const canArchiveStorageFiles = hasPermission(user, "setting", "edit")
  const query = await searchParams
  const filter = parseStorageFilter(query.filter)
  const showAll = query.showAll === "1"
  const t = await getTranslations("storagePage")
  const tCommon = await getTranslations("common")
  const uploadRoot = getUploadRoot()
  const now = new Date()

  const attachments = await prisma.attachment.findMany({
    select: {
      id: true,
      module: true,
      referenceId: true,
      originalName: true,
      fileType: true,
      fileSize: true,
      filePath: true,
      isActive: true,
      uploadedAt: true,
      asset: { select: { id: true, name: true, assetTag: true } },
    },
    orderBy: { uploadedAt: "desc" },
  })
  const summary = summarizeStorageGovernance(attachments, { largeFileThresholdBytes })
  const filesystemFiles = await scanUploadDirectory(uploadRoot)
  const dryRun = buildStorageGovernanceDryRun({
    attachments,
    files: filesystemFiles,
    uploadRoot,
  })
  const pathCounts = countActivePaths(attachments)
  const largeFiles = attachments
    .filter((attachment) => attachment.isActive && attachment.fileSize >= largeFileThresholdBytes)
    .sort((left, right) => right.fileSize - left.fileSize)
    .slice(0, 10)
  // Sorted by path, so records that share a file sit together and the second one can say so.
  const reviewItems = attachments
    .filter((attachment) => attachment.isActive && (!attachment.filePath?.trim() || pathCounts.get(normalizePath(attachment.filePath))! > 1))
    .sort((left, right) => normalizePath(left.filePath ?? "").localeCompare(normalizePath(right.filePath ?? "")))
    .slice(0, 20)
  const reviewNeededCount = summary.duplicatePathCount + summary.missingPathCount + dryRun.orphanFiles.length + dryRun.missingFiles.length

  // Names for the files the page shows: the missing files, the review list and the largest files. Each missing-file
  // action names its attachment, so records that share one stored path each show their own file name, asset or batch.
  const attachmentById = new Map(attachments.map((attachment) => [attachment.id, attachment]))
  const missingAttachments = dryRun.missingFiles.flatMap((item) => {
    const attachment = item.id ? attachmentById.get(item.id) : undefined
    return attachment ? [attachment] : []
  })
  const resolved = await resolveAttachmentRefs([...missingAttachments, ...reviewItems, ...largeFiles])
  const refs: StorageRefs = { assetById: resolved.assetById, batchById: resolved.batchById }

  const rows = buildStorageRows(dryRun.actions, refs, now)
  const visible = filterStorageRows(rows, filter, showAll)
  const chips: { key: StorageFilter; label: string; count: number }[] = [
    { key: "all", label: t("filterAll"), count: rows.length },
    { key: "missing", label: t("filterMissing"), count: dryRun.missingFiles.length },
    { key: "orphan", label: t("filterOrphan"), count: dryRun.orphanFiles.length },
  ]
  const basePath = `/${locale}/admin/storage`
  const storageHref = (next: { filter: StorageFilter; showAll?: boolean }) => {
    const search = new URLSearchParams()
    if (next.filter !== "all") search.set("filter", next.filter)
    if (next.showAll) search.set("showAll", "1")
    const text = search.toString()
    return text ? `${basePath}?${text}` : basePath
  }
  const moduleLabel = (module: string) => {
    const key = storageModuleLabelKey(module)
    return key ? t(key) : module
  }
  const assetHref = (asset: AssetRef) => `/${locale}/assets/${asset.id}`
  const folderLabel = (key: string) => t(key)
  const rowViews = visible.rows.map((row, index) => toRowView(row, index, { uploadRoot, attachmentById, moduleLabel, folderLabel, assetHref, locale }))
  const share = (bytes: number) => (summary.totalBytes > 0 ? Math.round((bytes / summary.totalBytes) * 1000) / 10 : 0)
  const reviewCounts = {
    orphans: dryRun.orphanFiles.length,
    missing: dryRun.missingFiles.length,
    duplicate: summary.duplicatePathCount,
    empty: summary.missingPathCount,
  }
  // Which record holds a file: the asset (name and tag), the disposal batch, the purchase document or model, else the
  // raw reference id as the old review list showed it, so every row still says where to look.
  const recordRef = (item: StorageAttachmentItem) => {
    const asset = resolved.assetById.get(item.id)
    if (asset) {
      return (
        <>
          <Link href={assetHref(asset)} className={linkVariants({ size: "inherit" })}>{asset.name}</Link>{" "}
          <span className="tag">{asset.assetTag}</span>
        </>
      )
    }
    const batch = resolved.batchById.get(item.id)
    if (batch) return <span className="tag">{batch.number}</span>
    const record = resolved.recordById.get(item.id)
    if (record) return record
    return <span className="tag">{item.referenceId}</span>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={
          <>
            <span>{t("subtitle")}</span>
            <span className="min-w-0">
              {t("uploadFolder")} <span className="tag break-all">{uploadRoot}</span>
            </span>
          </>
        }
      />

      <StatStrip
        items={[
          { key: "activeFiles", label: t("activeFiles"), value: formatCount(summary.activeFiles), foot: t("inactiveFiles", { count: summary.inactiveFiles }) },
          { key: "totalSize", label: t("totalSize"), value: formatStorageSize(summary.totalBytes), foot: t("totalSizeHelp") },
          { key: "largeFiles", label: t("largeFiles"), value: formatCount(summary.largeFileCount), foot: t("largeFilesHelp") },
          {
            key: "reviewNeeded",
            label: t("reviewNeeded"),
            value: formatCount(reviewNeededCount),
            // Two short lines so all four counts fit the foot's two-line clamp on a phone; the title has the sentence.
            foot: (
              <>
                <span className="block">{t("reviewBreakdownFiles", reviewCounts)}</span>
                <span className="block">{t("reviewBreakdownPaths", reviewCounts)}</span>
              </>
            ),
            footTitle: t("reviewBreakdown", reviewCounts),
            attention: reviewNeededCount > 0,
          },
        ]}
      />

      <ContentPanel divided flush className="overflow-hidden" title={t("filesystemDryRun")} description={t("filesystemDryRunHelp")}>
        <div className="space-y-3 px-4 py-3 md:px-5">
          <p className="num text-meta text-muted-foreground">
            {t("equation", { disk: filesystemFiles.length, inUse: dryRun.matchedFiles.length, orphans: dryRun.orphanFiles.length })}
          </p>
          <StorageFilterChips label={t("filterLabel")} chips={chips.map((chip) => ({ ...chip, href: storageHref({ filter: chip.key }) }))} current={filter} />
          <p className="text-meta text-muted-foreground">{t("legend")}</p>
        </div>

        <div aria-hidden="true" className={cn("hidden border-t border-border-soft bg-background px-5 py-2 text-meta font-medium text-muted-foreground", storageRowGridClasses)}>
          <span>{t("dryRunAction")}</span>
          <span>{t("file")}</span>
          <span>{t("source")}</span>
          <span className="text-right">{t("size")}</span>
          <span className="text-right">{t("action")}</span>
          <span />
        </div>
        {rowViews.length === 0 ? (
          <div className="border-t border-border-soft px-4 py-3 md:px-5">
            <EmptyNote>{rows.length === 0 ? t("emptyDryRunActions") : t("emptyFiltered")}</EmptyNote>
          </div>
        ) : (
          <ul className="border-t border-border-soft">
            {rowViews.map((row) => (
              <StorageRow key={row.key} row={row} canArchive={canArchiveStorageFiles} />
            ))}
          </ul>
        )}
        {visible.total > STORAGE_ROWS_PREVIEW ? (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-border-soft px-4 py-3 text-meta text-muted-foreground md:px-5">
            <span className="num">{t("showingOf", { shown: visible.rows.length, total: visible.total })}</span>
            <span aria-hidden="true">·</span>
            <Link href={storageHref({ filter, showAll: !showAll })} scroll={false} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
              {showAll ? t("showLess") : t("showAll")}
            </Link>
          </div>
        ) : null}
      </ContentPanel>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContentPanel title={t("moduleBreakdown")} description={t("moduleBreakdownHelp")}>
          <DataTable framed={false} caption={t("moduleBreakdown")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("module")}</DataTableHead>
                <DataTableHead className="hidden md:table-cell">{t("shareOfSize")}</DataTableHead>
                <DataTableHead align="right">{t("fileCount")}</DataTableHead>
                <DataTableHead align="right">{t("size")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {summary.byModule.length === 0 ? (
                <TableEmptyRow colSpan={4}>{tCommon("noData")}</TableEmptyRow>
              ) : (
                <>
                  {summary.byModule.map((item) => (
                    <DataTableRow key={item.module}>
                      <DataTableCell className="font-medium text-foreground">
                        {moduleLabel(item.module)}
                        {/* Below md the share column is hidden (the table then fits a phone), so the bar sits under the name. */}
                        <div aria-hidden="true" className="mt-1.5 h-1.5 w-full rounded-xs bg-muted md:hidden">
                          <div className="h-full rounded-xs bg-primary" style={{ width: `${share(item.totalBytes)}%` }} />
                        </div>
                        <span className="sr-only md:hidden">{` ${share(item.totalBytes)}%`}</span>
                      </DataTableCell>
                      <DataTableCell className="hidden min-w-24 md:table-cell">
                        <div className="h-2 w-full rounded-xs bg-muted" title={`${share(item.totalBytes)}%`}>
                          <div className="h-full rounded-xs bg-primary" style={{ width: `${share(item.totalBytes)}%` }} />
                        </div>
                        <span className="sr-only">{`${share(item.totalBytes)}%`}</span>
                      </DataTableCell>
                      <DataTableCell numeric className="text-muted-foreground">{formatCount(item.count)}</DataTableCell>
                      <DataTableCell numeric className="text-muted-foreground">{formatStorageSize(item.totalBytes)}</DataTableCell>
                    </DataTableRow>
                  ))}
                  <DataTableRow>
                    <DataTableCell className="font-semibold text-foreground">{t("total")}</DataTableCell>
                    <DataTableCell className="hidden md:table-cell" />
                    <DataTableCell numeric className="font-semibold text-foreground">{formatCount(summary.activeFiles)}</DataTableCell>
                    <DataTableCell numeric className="font-semibold text-foreground">{formatStorageSize(summary.totalBytes)}</DataTableCell>
                  </DataTableRow>
                </>
              )}
            </DataTableBody>
          </DataTable>
        </ContentPanel>

        <ContentPanel title={t("reviewList")} description={t("reviewListHelp")}>
          <div className="space-y-3">
            {reviewItems.length === 0 ? (
              <EmptyNote>{t("emptyReview")}</EmptyNote>
            ) : (
              reviewItems.map((item, index) => {
                const itemPath = item.filePath?.trim() ? normalizePath(item.filePath) : ""
                const duplicate = itemPath ? pathCounts.get(itemPath)! > 1 : false
                const previous = index > 0 ? reviewItems[index - 1] : null
                const sameAsAbove = duplicate && previous?.filePath?.trim() ? normalizePath(previous.filePath) === itemPath : false
                return (
                  <div key={item.id} className="rounded-md border border-border bg-background p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground" title={item.originalName}>{item.originalName}</div>
                        <div className="mt-1 break-words text-meta text-muted-foreground">
                          {moduleLabel(item.module)}
                          {" · "}
                          {recordRef(item)}
                          {sameAsAbove ? ` · ${t("samePathAsAbove")}` : null}
                        </div>
                      </div>
                      <StatusBadge label={duplicate ? t("duplicatePath") : t("missingPath")} tone={duplicate ? "warning" : "danger"} />
                    </div>
                    <div className="mt-2 break-all text-meta text-muted-foreground">{orNil(item.filePath)}</div>
                  </div>
                )
              })
            )}
          </div>
        </ContentPanel>
      </section>

      {/* No empty table (a scroll box with nothing to focus), and no five-column table on a phone: below md the files
          are stacked rows like the file check's, the table starts at md (group 12 plan 3 final review). */}
      <ContentPanel title={t("largestFiles")} description={t("largestFilesHelp")}>
        {largeFiles.length === 0 ? (
          <EmptyNote>{t("emptyLargeFiles")}</EmptyNote>
        ) : (
          <>
            <ul className="divide-y divide-border-soft md:hidden">
              {largeFiles.map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 truncate font-medium text-foreground" title={item.originalName}>{item.originalName}</span>
                    <span className="num shrink-0 text-meta text-muted-foreground">{formatStorageSize(item.fileSize)}</span>
                  </div>
                  <div className="mt-1 break-words text-meta text-muted-foreground">
                    {moduleLabel(item.module)}
                    {" · "}
                    {recordRef(item)}
                  </div>
                  <div className="mt-0.5 text-meta text-muted-foreground">{formatDateTime(item.uploadedAt)}</div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <DataTable framed={false} caption={t("largestFiles")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("file")}</DataTableHead>
                    <DataTableHead>{t("module")}</DataTableHead>
                    <DataTableHead>{t("asset")}</DataTableHead>
                    <DataTableHead align="right">{t("size")}</DataTableHead>
                    <DataTableHead align="right">{t("uploadedAt")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {largeFiles.map((item) => (
                    <DataTableRow key={item.id}>
                      <DataTableCell className="max-w-sm truncate font-medium text-foreground">{item.originalName}</DataTableCell>
                      <DataTableCell className="text-muted-foreground">{moduleLabel(item.module)}</DataTableCell>
                      <DataTableCell className="text-muted-foreground">{recordRef(item)}</DataTableCell>
                      <DataTableCell numeric className="text-muted-foreground">{formatStorageSize(item.fileSize)}</DataTableCell>
                      <DataTableCell align="right" className="whitespace-nowrap text-muted-foreground">{formatDateTime(item.uploadedAt)}</DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          </>
        )}
      </ContentPanel>
    </div>
  )
}

type StorageAttachmentItem = {
  id: string
  module: string
  referenceId: string
  originalName: string
  fileType: string
  fileSize: number
  filePath: string | null
  isActive: boolean
  uploadedAt: Date
  asset: AssetRef | null
}

const CHECKOUT_MODULES = new Set(["checkout_photo_before", "checkout_receiver_signature"])
const CHECKIN_MODULES = new Set(["checkin_photo_after", "checkin_return_signature", "checkin_receive_signature"])

// Spec §15 item 10: Attachment.assetId where it is set; otherwise a checkout or checkin file names the record's asset
// through referenceId, and a disposal_batch file names its batch. A purchase_document or asset_model file has no asset:
// it names its document number or model name (final review). One query per kind of record.
async function resolveAttachmentRefs(items: StorageAttachmentItem[]) {
  const assetById = new Map<string, AssetRef>()
  const batchById = new Map<string, { id: string; number: string }>()
  const recordById = new Map<string, string>()
  const checkoutIds = new Set<string>()
  const checkinIds = new Set<string>()
  const batchIdSet = new Set<string>()
  const documentIds = new Set<string>()
  const modelIds = new Set<string>()

  for (const item of items) {
    if (item.module === "disposal_batch") batchIdSet.add(item.referenceId)
    else if (item.asset) assetById.set(item.id, item.asset)
    else if (CHECKOUT_MODULES.has(item.module)) checkoutIds.add(item.referenceId)
    else if (CHECKIN_MODULES.has(item.module)) checkinIds.add(item.referenceId)
    else if (item.module === "purchase_document") documentIds.add(item.referenceId)
    else if (item.module === "asset_model") modelIds.add(item.referenceId)
  }

  const assetSelect = { select: { id: true, name: true, assetTag: true } } as const
  const batchIds = [...batchIdSet]
  const [checkouts, checkins, batches, documents, models] = await Promise.all([
    checkoutIds.size > 0 ? prisma.assetCheckout.findMany({ where: { id: { in: [...checkoutIds] } }, select: { id: true, asset: assetSelect } }) : [],
    checkinIds.size > 0 ? prisma.assetCheckin.findMany({ where: { id: { in: [...checkinIds] } }, select: { id: true, asset: assetSelect } }) : [],
    batchIds.length > 0 ? prisma.disposalBatch.findMany({ where: { id: { in: batchIds } }, select: { id: true, batchNo: true } }) : [],
    documentIds.size > 0 ? prisma.purchaseDocument.findMany({ where: { id: { in: [...documentIds] } }, select: { id: true, documentNo: true } }) : [],
    modelIds.size > 0 ? prisma.assetModel.findMany({ where: { id: { in: [...modelIds] } }, select: { id: true, name: true } }) : [],
  ])
  const checkoutAsset = new Map(checkouts.map((record) => [record.id, record.asset]))
  const checkinAsset = new Map(checkins.map((record) => [record.id, record.asset]))
  const batchNumber = new Map(batches.map((batch) => [batch.id, batch.batchNo]))
  const documentNumber = new Map(documents.map((document) => [document.id, document.documentNo]))
  const modelName = new Map(models.map((model) => [model.id, model.name]))

  for (const item of items) {
    if (item.module === "disposal_batch") {
      const number = batchNumber.get(item.referenceId)
      if (number) batchById.set(item.id, { id: item.referenceId, number })
    } else if (!item.asset) {
      const asset = CHECKOUT_MODULES.has(item.module) ? checkoutAsset.get(item.referenceId) : CHECKIN_MODULES.has(item.module) ? checkinAsset.get(item.referenceId) : undefined
      if (asset) assetById.set(item.id, asset)
      const record = item.module === "purchase_document" ? documentNumber.get(item.referenceId) : item.module === "asset_model" ? modelName.get(item.referenceId) : undefined
      if (record) recordById.set(item.id, record)
    }
  }
  return { assetById, batchById, recordById }
}

function toRowView(
  row: StorageRowModel,
  index: number,
  context: {
    uploadRoot: string
    attachmentById: Map<string, StorageAttachmentItem>
    moduleLabel: (module: string) => string
    folderLabel: (key: string) => string
    assetHref: (asset: AssetRef) => string
    locale: string
  }
): StorageRowView {
  if (row.kind === "orphan") {
    const folder = path.posix.dirname(row.relativePath.replace(/\\/g, "/"))
    // A folder the upload routes write reads as its Thai name; anything else stays the raw top folder.
    const folderKey = storageFolderLabelKey(row.relativePath)
    return {
      key: `orphan-${index}-${row.relativePath}`,
      kind: "orphan",
      fileName: path.posix.basename(row.relativePath.replace(/\\/g, "/")),
      folder: folder === "." ? "/" : `${folder}/`,
      source: folderKey ? context.folderLabel(folderKey) : folder === "." ? "/" : folder.split("/")[0],
      sourceIsCode: !folderKey,
      size: formatStorageSize(row.sizeBytes),
      path: row.relativePath,
      asset: null,
      batch: null,
      destination: row.destination,
    }
  }

  const relative = pathInUploadRoot(row.filePath, context.uploadRoot)
  const folder = path.posix.dirname(relative)
  const attachment = row.attachmentId ? context.attachmentById.get(row.attachmentId) : undefined
  return {
    key: `missing-${index}-${row.filePath}`,
    kind: "missing",
    fileName: attachment?.originalName || path.posix.basename(relative),
    folder: folder === "." ? "/" : `${folder}/`,
    source: context.moduleLabel(row.module),
    sourceIsCode: false,
    size: formatStorageSize(row.expectedSizeBytes),
    path: relative,
    asset: row.asset ? { name: row.asset.name, assetTag: row.asset.assetTag, href: context.assetHref(row.asset) } : null,
    batch: row.batch ? { number: row.batch.number, href: `/${context.locale}/disposal/batches/${row.batch.id}` } : null,
    destination: "",
  }
}

// A stored path inside the upload root reads relative to it; anything else (a relative path, or one outside the root)
// is shown as stored, with forward slashes.
function pathInUploadRoot(filePath: string, uploadRoot: string) {
  const trimmed = filePath.trim()
  if (path.isAbsolute(trimmed)) {
    const relative = path.relative(path.resolve(uploadRoot), path.resolve(trimmed))
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) return relative.replace(/\\/g, "/")
  }
  return trimmed.replace(/\\/g, "/")
}

function countActivePaths(items: { isActive: boolean; filePath: string | null }[]) {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (!item.isActive || !item.filePath?.trim()) continue
    const itemPath = normalizePath(item.filePath)
    counts.set(itemPath, (counts.get(itemPath) ?? 0) + 1)
  }
  return counts
}

function normalizePath(value: string) {
  return value.trim().replace(/\\/g, "/").toLowerCase()
}
