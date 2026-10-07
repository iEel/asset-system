"use client"

import { useTranslations } from "next-intl"
import type { AuditCheckField, AuditCheckMode } from "@/lib/audit-scan-session"
import { cn } from "@/lib/utils"

export type AuditSavedNotice = {
  assetId: string
  assetTag: string
  diff: AuditCheckField[]
  mode: AuditCheckMode
  queued: boolean
}

// Same words as the check sheet's field labels, so the banner and the sheet agree.
const mismatchShortKey = {
  location: "expectedLocation",
  custodian: "expectedCustodian",
  department: "expectedDepartment",
  condition: "expectedCondition",
} as const

export function AuditScanSavedBanner({
  notice,
  photoRetryCount,
  onEdit,
  onRetryPhotos,
}: {
  notice: AuditSavedNotice
  photoRetryCount: number
  onEdit: () => void
  onRetryPhotos: () => void
}) {
  const t = useTranslations("auditScan")
  const message = notice.queued
    ? t("savedQueued", { assetTag: notice.assetTag })
    : notice.mode === "out_of_scope"
      ? t("savedOutOfScope", { assetTag: notice.assetTag })
      : notice.diff.length === 0
        ? t("savedAllMatch", { assetTag: notice.assetTag })
        : t("savedMismatch", { assetTag: notice.assetTag, fields: notice.diff.map((field) => t(mismatchShortKey[field])).join(", ") })

  return (
    <div
      role="status"
      data-audit-scan-saved
      className={cn(
        "mb-2 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
        notice.queued ? "border-border bg-muted text-foreground" : notice.diff.length > 0 ? "border-warning-border bg-warning-soft text-warning" : "border-success-border bg-success-soft text-success",
      )}
    >
      <span className="min-w-0 flex-1">{message}</span>
      {notice.mode !== "out_of_scope" ? (
        <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline md:min-h-8">
          {t("editAgain")}
        </button>
      ) : null}
      {photoRetryCount > 0 ? (
        <span className="flex w-full flex-wrap items-center gap-2 text-danger">
          {t("photoRetryMessage")}
          <button type="button" onClick={onRetryPhotos} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline md:min-h-8">
            {t("retryPhotos")}
          </button>
        </span>
      ) : null}
    </div>
  )
}
