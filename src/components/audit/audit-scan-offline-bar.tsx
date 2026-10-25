"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
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
  // Offline with nothing failed, the shell's banner says it all (menu B shell §6.7); failed saves stay listed either way.
  const failed = queue.filter((entry) => entry.syncStatus === "failed")
  if (queue.length === 0 || (!online && failed.length === 0)) return null

  // Saves waiting on the device are something to deal with: a warning box; the send runs busy (focus kept, never faded).
  return (
    <Notice
      tone="warning"
      role="status"
      data-audit-scan-offline
      className="mb-2"
      title={t("offlineBarPending", { count: queue.length })}
      action={
        online && queue.length > 0 ? (
          <Button variant="outline" size="md" busy={sending} onClick={onSendNow}>
            {t("sendNow")}
          </Button>
        ) : undefined
      }
    >
      {failed.length > 0 ? (
        <ul className="space-y-1">
          {failed.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">{t("queueFailed", { assetTag: assetTagFor(entry.assetId), error: entry.lastSyncError ?? "-" })}</span>
              <Button variant="outline" size="sm" onClick={() => onRemove(entry.id)}>
                {t("removeFromQueue")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Notice>
  )
}
