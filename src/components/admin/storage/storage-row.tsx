"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ChevronDown, Copy } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { StorageArchiveButton } from "@/components/admin/storage-archive-button"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

// One finding of the file check, as plain data the server page built (storage-page-model reads node:fs, so this client
// part never imports it). path is relative to the upload root; for an orphan it is also what the archive API takes.
export type StorageRowView = {
  key: string
  kind: "missing" | "orphan"
  fileName: string
  folder: string
  // The Thai module label for a missing file; an orphan has no record, so the source is its upload folder's Thai name, or
  // the raw top folder (sourceIsCode) when the app does not know it.
  source: string
  sourceIsCode: boolean
  size: string
  path: string
  asset: { name: string; assetTag: string; href: string } | null
  batch: { number: string; href: string } | null
  // Where the archive would move an orphan (archiveDestinationPreview); "" when the path is one the archive refuses.
  destination: string
}

// The board's row grid from md: finding, file, source, size, action, expand. Below md the parts stack, with the actions
// and the expand button on one line.
export const storageRowGridClasses = "md:grid md:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,11rem)_5.5rem_minmax(0,auto)_2.75rem] md:items-center md:gap-x-3"

// Board AD-Storage (group 12 spec §8): the file name on one line with an ellipsis, its folder or the asset it belongs
// to, the source, the size and the action. Missing files are review-only; an orphan takes the archive button (its confirm
// dialog and the server's 409 check are unchanged) when the viewer has setting:edit. The expand button shows the path
// in the upload folder with a copy button and, for an orphan, where the archive would move it.
export function StorageRow({ row, canArchive }: { row: StorageRowView; canArchive: boolean }) {
  const t = useTranslations("storagePage")
  const [open, setOpen] = useState(false)
  const detailId = useId()

  async function copyPath() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(row.path)
      toast.success(t("pathCopied"))
    } catch {
      toast.error(t("copyFailed"))
    }
  }

  return (
    <li data-storage-row={row.kind} className="border-t border-border-soft first:border-t-0">
      <div className={cn("flex flex-col gap-2 px-4 py-3 md:px-5", storageRowGridClasses)}>
        <div className="flex items-center justify-between gap-2 md:block">
          <StatusBadge label={row.kind === "missing" ? t("kindMissing") : t("kindOrphan")} tone={row.kind === "missing" ? "danger" : "warning"} />
          <span className="num text-meta text-muted-foreground md:hidden">{row.size}</span>
        </div>
        <div className="min-w-0">
          <span className="block truncate font-medium text-foreground" title={row.fileName}>{row.fileName}</span>
          {row.asset ? (
            <span className="block truncate text-meta text-muted-foreground">
              {t("usedWith", { name: row.asset.name })} · <span className="tag">{row.asset.assetTag}</span>
            </span>
          ) : row.batch ? (
            <span className="block truncate text-meta text-muted-foreground">
              {t("usedWithBatch")} · <span className="tag">{row.batch.number}</span>
            </span>
          ) : (
            <span className="block truncate text-meta text-muted-foreground" title={row.folder}>
              <span className="tag">{row.folder}</span>
            </span>
          )}
        </div>
        <div className="min-w-0 text-meta text-muted-foreground">
          <span className="md:hidden">{t("source")}: </span>
          {row.sourceIsCode ? <span className="tag">{row.source}</span> : row.source}
        </div>
        <div className="num hidden text-right text-meta text-muted-foreground md:block">{row.size}</div>
        <div className="flex items-center justify-between gap-2 md:contents">
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {row.kind === "missing" ? (
              <>
                {row.asset ? (
                  <Link href={row.asset.href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                    {t("openAsset")}
                  </Link>
                ) : row.batch ? (
                  <Link href={row.batch.href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                    {t("openBatch")}
                  </Link>
                ) : null}
                <StatusBadge label={t("archiveUnavailable")} tone="muted" />
              </>
            ) : row.kind === "orphan" && canArchive ? (
              <StorageArchiveButton relativePath={row.path} />
            ) : (
              <StatusBadge label={t("archiveUnavailable")} tone="muted" />
            )}
          </div>
          <div className="flex md:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-expanded={open}
              aria-controls={detailId}
              aria-label={t("showDetails", { file: row.fileName })}
              onClick={() => setOpen((value) => !value)}
            >
              <ChevronDown aria-hidden="true" className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
            </Button>
          </div>
        </div>
      </div>
      <div id={detailId} hidden={!open} className="space-y-2 border-t border-border-soft bg-background px-4 py-3 text-meta md:px-5">
        <div className="text-muted-foreground">{t("pathInUploads")}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag break-all">{row.path}</span>
          <Button type="button" variant="outline" size="sm" onClick={copyPath}>
            <Copy aria-hidden="true" />
            {t("copyPath")}
          </Button>
        </div>
        {row.kind === "orphan" ? (
          <>
            {row.destination ? <p className="break-all text-muted-foreground">{t("destinationPreview", { destination: row.destination })}</p> : null}
            <p className="font-medium text-foreground">{t("noReference")}</p>
            <p className="text-muted-foreground">{t("noReferenceHelp")}</p>
            <p className="text-muted-foreground">{t("restoreNote")}</p>
          </>
        ) : (
          <p className="text-muted-foreground">{t("missingHelp")}</p>
        )}
      </div>
    </li>
  )
}
