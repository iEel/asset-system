"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import type { AuditCheckField, AuditCheckMode } from "@/lib/audit-scan-session"

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

  // The tone follows the result: kept on the device is info, saved with a mismatch a warning box, saved a success line.
  // It appears by itself after a save, so it is the one live status region. The photo retry under it has no live role:
  // the failed upload's toast already announced it.
  return (
    <div data-audit-scan-saved className="mb-2 space-y-2">
      <Notice
        tone={notice.queued ? "info" : notice.diff.length > 0 ? "warning" : "success"}
        role="status"
        action={
          notice.mode !== "out_of_scope" ? (
            <Button variant="outline" size="md" onClick={onEdit}>
              {t("editAgain")}
            </Button>
          ) : undefined
        }
      >
        {message}
      </Notice>
      {photoRetryCount > 0 ? (
        <Notice
          tone="danger"
          action={
            <Button variant="outline" size="md" onClick={onRetryPhotos}>
              {t("retryPhotos")}
            </Button>
          }
        >
          {t("photoRetryMessage")}
        </Notice>
      ) : null}
    </div>
  )
}
