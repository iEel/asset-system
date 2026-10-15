import { FolderOpen } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { getPanelClasses } from "@/lib/design-system"
import {
  buildStorageGovernanceDryRun,
  formatStorageSize,
  scanUploadDirectory,
  summarizeStorageGovernance,
} from "@/lib/storage-governance"
import { getUploadRoot } from "@/lib/uploads"
import { StorageArchiveButton } from "@/components/admin/storage-archive-button"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type StoragePageProps = {
  params: Promise<{ locale: string }>
}

const largeFileThresholdBytes = 10 * 1024 * 1024

export default async function StorageGovernancePage({ params }: StoragePageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "setting", "view")
  const canArchiveStorageFiles = hasPermission(user, "setting", "edit")
  const t = await getTranslations("storagePage")
  const tCommon = await getTranslations("common")
  const uploadRoot = getUploadRoot()

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
  const reviewItems = attachments
    .filter((attachment) => attachment.isActive && (!attachment.filePath?.trim() || pathCounts.get(normalizePath(attachment.filePath))! > 1))
    .slice(0, 20)
  const reviewNeededCount = summary.duplicatePathCount + summary.missingPathCount + dryRun.orphanFiles.length + dryRun.missingFiles.length

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <StatStrip
        items={[
          { key: "activeFiles", label: t("activeFiles"), value: formatCount(summary.activeFiles), foot: t("inactiveFiles", { count: summary.inactiveFiles }) },
          { key: "totalSize", label: t("totalSize"), value: formatStorageSize(summary.totalBytes), foot: t("totalSizeHelp") },
          { key: "largeFiles", label: t("largeFiles"), value: formatCount(summary.largeFileCount), foot: t("largeFilesHelp") },
          {
            key: "reviewNeeded",
            label: t("reviewNeeded"),
            value: formatCount(reviewNeededCount),
            foot: t("reviewNeededHelp"),
            footTitle: t("reviewNeededHelp"),
            attention: reviewNeededCount > 0,
          },
        ]}
      />

      <section className={`${getPanelClasses()} p-5`}>
        <h2 className="font-semibold text-foreground">{t("filesystemDryRun")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("filesystemDryRunHelp")}</p>
        <StatStrip
          className="mt-4"
          items={[
            { key: "matchedFiles", label: t("matchedFiles"), value: formatCount(dryRun.matchedFiles.length) },
            { key: "orphanFiles", label: t("orphanFiles"), value: formatCount(dryRun.orphanFiles.length) },
            { key: "missingFiles", label: t("missingFiles"), value: formatCount(dryRun.missingFiles.length) },
          ]}
        />
        <DataTable framed={false} className="mt-4" caption={t("filesystemDryRun")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("dryRunAction")}</DataTableHead>
              <DataTableHead>{t("file")}</DataTableHead>
              <DataTableHead align="right">{t("size")}</DataTableHead>
              <DataTableHead align="right">{t("action")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {dryRun.actions.length === 0 ? (
              <TableEmptyRow colSpan={4}>{t("emptyDryRunActions")}</TableEmptyRow>
            ) : (
              dryRun.actions.slice(0, 10).map((action, index) => (
                <DataTableRow key={`${action.action}-${index}`}>
                  <DataTableCell>
                    <StatusBadge
                      label={action.action === "archive_orphan_file" ? t("archiveOrphanFile") : t("reviewMissingDbFile")}
                      tone={action.action === "archive_orphan_file" ? "warning" : "danger"}
                    />
                  </DataTableCell>
                  <DataTableCell className="break-all text-muted-foreground">
                    {action.action === "archive_orphan_file" ? action.relativePath : action.filePath}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {formatStorageSize(action.action === "archive_orphan_file" ? action.sizeBytes : action.expectedSizeBytes)}
                  </DataTableCell>
                  <DataTableCell align="right">
                    {action.action === "archive_orphan_file" && canArchiveStorageFiles ? (
                      <StorageArchiveButton relativePath={action.relativePath} />
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("archiveUnavailable")}</span>
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${getPanelClasses()} p-5`}>
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-primary-border bg-primary-soft p-2 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("moduleBreakdown")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("moduleBreakdownHelp")}</p>
            </div>
          </div>
          <DataTable framed={false} className="mt-4" caption={t("moduleBreakdown")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("module")}</DataTableHead>
                <DataTableHead align="right">{t("fileCount")}</DataTableHead>
                <DataTableHead align="right">{t("size")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {summary.byModule.length === 0 ? (
                <TableEmptyRow colSpan={3}>{tCommon("noData")}</TableEmptyRow>
              ) : (
                summary.byModule.map((item) => (
                  <DataTableRow key={item.module}>
                    <DataTableCell className="font-medium text-foreground">{moduleLabel(item.module, t)}</DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{formatCount(item.count)}</DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{formatStorageSize(item.totalBytes)}</DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>

        <StorageReviewList
          title={t("reviewList")}
          description={t("reviewListHelp")}
          items={reviewItems}
          pathCounts={pathCounts}
          t={t}
        />
      </section>

      <StorageFileList title={t("largestFiles")} description={t("largestFilesHelp")} items={largeFiles} scrollHint={tCommon("tableScrollHint")} t={t} />
    </div>
  )
}

function StorageReviewList({
  title,
  description,
  items,
  pathCounts,
  t,
}: {
  title: string
  description: string
  items: StorageAttachmentItem[]
  pathCounts: Map<string, number>
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <div className={`${getPanelClasses()} p-5`}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <EmptyNote>{t("emptyReview")}</EmptyNote>
        ) : (
          items.map((item) => {
            const duplicate = item.filePath?.trim() ? pathCounts.get(normalizePath(item.filePath))! > 1 : false
            return (
              <div key={item.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.originalName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{moduleLabel(item.module, t)} · <span className="tag">{item.referenceId}</span></div>
                  </div>
                  <StatusBadge label={duplicate ? t("duplicatePath") : t("missingPath")} tone={duplicate ? "warning" : "danger"} />
                </div>
                <div className="mt-2 break-all text-xs text-muted-foreground">{orNil(item.filePath)}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StorageFileList({
  title,
  description,
  items,
  scrollHint,
  t,
}: {
  title: string
  description: string
  items: StorageAttachmentItem[]
  scrollHint: string
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <section className={`${getPanelClasses()} p-5`}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <DataTable framed={false} className="mt-4" caption={title} scrollHint={scrollHint}>
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("file")}</DataTableHead>
            <DataTableHead>{t("module")}</DataTableHead>
            <DataTableHead align="right">{t("size")}</DataTableHead>
            <DataTableHead align="right">{t("uploadedAt")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {items.length === 0 ? (
            <TableEmptyRow colSpan={4}>{t("emptyLargeFiles")}</TableEmptyRow>
          ) : (
            items.map((item) => (
              <DataTableRow key={item.id}>
                <DataTableCell className="max-w-sm truncate font-medium text-foreground">{item.originalName}</DataTableCell>
                <DataTableCell className="text-muted-foreground">{moduleLabel(item.module, t)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatStorageSize(item.fileSize)}</DataTableCell>
                <DataTableCell align="right" className="whitespace-nowrap text-muted-foreground">{formatDateTime(item.uploadedAt)}</DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </section>
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
}

function countActivePaths(items: StorageAttachmentItem[]) {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (!item.isActive || !item.filePath?.trim()) continue
    const path = normalizePath(item.filePath)
    counts.set(path, (counts.get(path) ?? 0) + 1)
  }
  return counts
}

function normalizePath(path: string) {
  return path.trim().replace(/\\/g, "/").toLowerCase()
}

function moduleLabel(module: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (module === "asset") return t("moduleAsset")
  if (module === "maintenance") return t("moduleMaintenance")
  if (module === "audit_finding") return t("moduleAuditFinding")
  if (module === "disposal") return t("moduleDisposal")
  if (module === "asset_model") return t("moduleAssetModel")
  if (module === "purchase_document") return t("modulePurchaseDocument")
  if (module === "asset_purchase") return t("moduleAssetPurchase")
  return module
}
