import type React from "react"
import { AlertTriangle, Database, FileArchive, FolderOpen, HardDrive } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDateTime } from "@/lib/utils"
import { getEmptyStateClasses, getPanelClasses, getTableShellClasses } from "@/lib/design-system"
import {
  buildStorageGovernanceDryRun,
  formatStorageSize,
  scanUploadDirectory,
  summarizeStorageGovernance,
} from "@/lib/storage-governance"
import { getUploadRoot } from "@/lib/uploads"
import { StorageArchiveButton } from "@/components/admin/storage-archive-button"
import { StatusBadge } from "@/components/ui/status-badge"

type StoragePageProps = {
  params: Promise<{ locale: string }>
}

const largeFileThresholdBytes = 10 * 1024 * 1024

export default async function StorageGovernancePage({ params }: StoragePageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "setting", "view")
  const t = await getTranslations("storagePage")
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard label={t("activeFiles")} value={summary.activeFiles.toLocaleString()} detail={t("inactiveFiles", { count: summary.inactiveFiles })} tone="primary" icon={<FileArchive className="h-5 w-5" />} />
        <SummaryCard label={t("totalSize")} value={formatStorageSize(summary.totalBytes)} detail={t("totalSizeHelp")} tone="success" icon={<HardDrive className="h-5 w-5" />} />
        <SummaryCard label={t("largeFiles")} value={summary.largeFileCount.toLocaleString()} detail={t("largeFilesHelp")} tone="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <SummaryCard label={t("reviewNeeded")} value={(summary.duplicatePathCount + summary.missingPathCount + dryRun.orphanFiles.length + dryRun.missingFiles.length).toLocaleString()} detail={t("reviewNeededHelp")} tone="danger" icon={<Database className="h-5 w-5" />} />
      </section>

      <section className={`${getPanelClasses()} p-5`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("filesystemDryRun")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("filesystemDryRunHelp")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="font-semibold text-foreground">{dryRun.matchedFiles.length.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("matchedFiles")}</div>
            </div>
            <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
              <div className="font-semibold text-foreground">{dryRun.orphanFiles.length.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("orphanFiles")}</div>
            </div>
            <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2">
              <div className="font-semibold text-foreground">{dryRun.missingFiles.length.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("missingFiles")}</div>
            </div>
          </div>
        </div>
        <div className={`mt-4 ${getTableShellClasses()}`}>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("dryRunAction")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("file")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("size")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dryRun.actions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">{t("emptyDryRunActions")}</td>
                </tr>
              ) : (
                dryRun.actions.slice(0, 10).map((action, index) => (
                  <tr key={`${action.action}-${index}`} className="hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={action.action === "archive_orphan_file" ? t("archiveOrphanFile") : t("reviewMissingDbFile")}
                        tone={action.action === "archive_orphan_file" ? "warning" : "danger"}
                        size="xs"
                      />
                    </td>
                    <td className="break-all px-4 py-3 text-muted-foreground">
                      {action.action === "archive_orphan_file" ? action.relativePath : action.filePath}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatStorageSize(action.action === "archive_orphan_file" ? action.sizeBytes : action.expectedSizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {action.action === "archive_orphan_file" ? (
                        <StorageArchiveButton relativePath={action.relativePath} />
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("archiveUnavailable")}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${getPanelClasses()} p-5`}>
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("moduleBreakdown")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("moduleBreakdownHelp")}</p>
            </div>
          </div>
          <div className={`mt-4 ${getTableShellClasses()}`}>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("module")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("fileCount")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("size")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.byModule.map((item) => (
                  <tr key={item.module} className="hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium text-foreground">{moduleLabel(item.module, t)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{item.count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatStorageSize(item.totalBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <StorageReviewList
          title={t("reviewList")}
          description={t("reviewListHelp")}
          items={reviewItems}
          pathCounts={pathCounts}
          t={t}
        />
      </section>

      <StorageFileList title={t("largestFiles")} description={t("largestFilesHelp")} items={largeFiles} t={t} />
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
          <div className={getEmptyStateClasses()}>
            {t("emptyReview")}
          </div>
        ) : (
          items.map((item) => {
            const duplicate = item.filePath?.trim() ? pathCounts.get(normalizePath(item.filePath))! > 1 : false
            return (
              <div key={item.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.originalName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.module} · {item.referenceId}</div>
                  </div>
                  <StatusBadge label={duplicate ? t("duplicatePath") : t("missingPath")} tone={duplicate ? "warning" : "danger"} size="xs" />
                </div>
                <div className="mt-2 break-all text-xs text-muted-foreground">{item.filePath || "-"}</div>
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
  t,
}: {
  title: string
  description: string
  items: StorageAttachmentItem[]
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <section className={`${getPanelClasses()} p-5`}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className={`mt-4 ${getTableShellClasses()}`}>
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("file")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("module")}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("size")}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("uploadedAt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">{t("emptyLargeFiles")}</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-accent/50">
                  <td className="max-w-sm truncate px-4 py-3 font-medium text-foreground">{item.originalName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{moduleLabel(item.module, t)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatStorageSize(item.fileSize)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatDateTime(item.uploadedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string
  value: string
  detail: string
  tone: "primary" | "success" | "warning" | "danger"
  icon: React.ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "border-danger/30 bg-danger/5 text-danger"
      : tone === "warning"
        ? "border-warning/30 bg-warning/5 text-warning"
        : tone === "success"
          ? "border-success/30 bg-success/5 text-success"
          : "border-primary/30 bg-primary/5 text-primary"

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-4 text-3xl font-bold text-foreground">{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
        </div>
        <div>{icon}</div>
      </div>
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
