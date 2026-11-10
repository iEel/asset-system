"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetPhotoFrame } from "@/components/assets/asset-photo-frame"
import { StatusBadge } from "@/components/ui/status-badge"
import { thumbnailUrl } from "@/lib/attachment-thumbnail"
// Type only: audit-scan-photos.ts is server-only (it reaches the db).
import type { AuditScanPhoto } from "@/lib/audit-scan-photos"

// The photo on the audit scan page (audit photos spec §3): the asset's own, else its model's (named รูปประจำรุ่น), else
// none. The card sits at the top of the check form and on the out-of-scope card; the thumb at the start of a row.

/** The check form's photo: the thumbnail route's card size in the shared photo frame, a รูปประจำรุ่น chip over a model
 * photo; nothing at all without a photo (the rows already say there is none). */
export function AuditScanPhotoCard({ photo, alt }: { photo: AuditScanPhoto | null; alt: string }) {
  const t = useTranslations("asset")
  if (!photo) return null
  return (
    <div data-audit-scan-photo-card data-from-model={photo.fromModel ? "true" : undefined} className="relative h-40 md:h-48">
      <AssetPhotoFrame attachmentId={photo.attachmentId} alt={alt} canUpload={false} />
      {photo.fromModel ? <StatusBadge tone="info" label={t("modelPhoto")} className="pointer-events-none absolute left-2 top-2" /> : null}
    </div>
  )
}

const thumbBox = "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"

/** A row's 48px photo, drawn from the thumbnail route's 96px size so it stays sharp on a phone. A row without a photo
 * (or one that fails to load) keeps a neutral square when the viewer may see photos, so the rows line up; a viewer who
 * may not gets no frame. */
export function AuditScanPhotoThumb({ photo, alt, emptyFrame }: { photo: AuditScanPhoto | null; alt: string; emptyFrame: boolean }) {
  // Keyed by the photo, so a row that gets a new photo tries it again.
  const [failedId, setFailedId] = useState<string | null>(null)
  if (!photo && !emptyFrame) return null
  if (!photo || failedId === photo.attachmentId) {
    return (
      <span data-audit-scan-photo-thumb data-empty="true" aria-hidden="true" className={thumbBox}>
        <ImageIcon className="size-5 text-muted-foreground" />
      </span>
    )
  }
  return (
    <span data-audit-scan-photo-thumb data-from-model={photo.fromModel ? "true" : undefined} className={thumbBox}>
      {/* eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route */}
      <img
        src={thumbnailUrl(photo.attachmentId)}
        alt={alt}
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        onError={() => setFailedId(photo.attachmentId)}
        className="size-full object-contain p-0.5 bg-image-stage"
      />
    </span>
  )
}
