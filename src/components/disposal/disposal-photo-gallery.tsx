"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { FileText } from "lucide-react"
import { AssetPhotoFrame } from "@/components/assets/asset-photo-frame"
import { Notice } from "@/components/ui/notice"
import { thumbnailUrl } from "@/lib/attachment-thumbnail"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type GalleryFile = { id: string; originalName: string }

// The disposal request's photos, in the approvals panel and on the request page (group 6 spec §7.5, §9.3, decision 2;
// P3-R2): one large photo, the card-size thumbnail in the shared AssetPhotoFrame, whose button opens the original in
// AttachmentPreviewDialog; a strip of 64px thumbnails that change it; then the PDFs as file chips. With no photo, the
// warning (or, for a lost machine, which cannot be photographed, the muted line the row shows); the request page
// renders it only with a photo, as its own no-photo notice sits on top of the panel.
export function DisposalPhotoGallery({
  photos,
  documents,
  assetName,
  isLost,
}: {
  photos: readonly GalleryFile[]
  documents: readonly GalleryFile[]
  assetName: string
  isLost: boolean
}) {
  const t = useTranslations("approvalInboxPage")
  const [index, setIndex] = useState(0)
  const current = photos[Math.min(index, Math.max(0, photos.length - 1))] ?? null
  const position = (i: number) => t("photoPosition", { index: formatCount(i + 1), total: formatCount(photos.length) })

  return (
    <section aria-label={t("photosLabel")} data-approval-photos className="grid min-w-0 gap-2">
      {current ? (
        <>
          {/* Keyed by the photo, so a failed load resets when another thumbnail is chosen. */}
          <AssetPhotoFrame key={current.id} attachmentId={current.id} alt={assetName} label={position(index)} canUpload={false} className="h-60" />
          {photos.length > 1 ? (
            <ul className="flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-pressed={i === index}
                    aria-label={t("photoThumb", { index: formatCount(i + 1) })}
                    className={cn(
                      "block size-16 overflow-hidden rounded-md border bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      i === index ? "border-primary ring-1 ring-primary" : "border-border hover:border-input",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route */}
                    <img src={thumbnailUrl(photo.id)} alt="" width={64} height={64} decoding="async" loading="lazy" className="size-full object-cover bg-image-stage" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : isLost ? (
        <p className="text-meta text-muted-foreground">{t("noPhotoLost")}</p>
      ) : (
        <Notice tone="warning">{t("noPhotoNotice")}</Notice>
      )}

      {documents.length > 0 ? (
        <ul aria-label={t("documentsLabel")} className="flex flex-wrap gap-2">
          {documents.map((document) => (
            <li key={document.id} className="min-w-0 max-w-full">
              <a
                href={`/api/attachments/${document.id}?inline=1`}
                target="_blank"
                rel="noreferrer"
                aria-label={t("openDocument", { name: document.originalName })}
                className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-meta font-medium text-foreground transition-colors hover:border-input hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-8"
              >
                <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{document.originalName}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
