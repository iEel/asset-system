"use client"

import { useTranslations } from "next-intl"
import type { QueuedAuditScan } from "@/lib/audit-offline-queue"

export function AuditScanOfflineBar({
  online,
  queue,
  assetTagFor,
  sending,
  onSendNow,
  onRemove,
}: {
  online: boolean
  queue: QueuedAuditScan[]
  assetTagFor: (assetId: string) => string
  sending: boolean
  onSendNow: () => void
  onRemove: (queuedId: string) => void
}) {
  const t = useTranslations("auditScan")
  if (online && queue.length === 0) return null
  const failed = queue.filter((entry) => entry.syncStatus === "failed")

  return (
    <div role="status" data-audit-scan-offline className="mb-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 font-medium">
          {online ? t("offlineBarPending", { count: queue.length }) : t("offlineBarOffline", { count: queue.length })}
        </span>
        {online && queue.length > 0 ? (
          <button type="button" onClick={onSendNow} disabled={sending} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60 md:min-h-8">
            {t("sendNow")}
          </button>
        ) : null}
      </div>
      {failed.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {failed.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="min-w-0 flex-1">{t("queueFailed", { assetTag: assetTagFor(entry.assetId), error: entry.lastSyncError ?? "-" })}</span>
              <button type="button" onClick={() => onRemove(entry.id)} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline md:min-h-8">
                {t("removeFromQueue")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
