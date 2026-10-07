"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { isThumbnailable, thumbnailUrl } from "@/lib/attachment-thumbnail"
import { cn } from "@/lib/utils"

export type AssetThumbnailPhoto = { id: string; alt: string; fileType: string }

export function AssetThumbnail({
  photo,
  assetTag,
  assetName,
  size,
  preview = true,
  className,
}: {
  photo: AssetThumbnailPhoto | null
  assetTag: string
  assetName: string
  size: 40 | 44
  preview?: boolean
  className?: string
}) {
  const t = useTranslations("asset")
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const frame = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground",
    size === 40 ? "size-10" : "size-11",
    className,
  )

  if (!photo || !isThumbnailable(photo.fileType) || failed) {
    return (
      <span className={frame}>
        <ImageIcon className="size-4" aria-hidden="true" />
      </span>
    )
  }

  // Decorative: the row already names the asset; the button carries the label.
  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route
    <img
      src={thumbnailUrl(photo.id)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-full object-contain p-0.5"
    />
  )

  if (!preview) return <span className={frame}>{image}</span>

  return (
    <>
      <button
        type="button"
        data-no-row-click
        onClick={() => setOpen(true)}
        aria-label={t("viewPhoto", { assetTag })}
        className={cn(frame, "transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      >
        {image}
      </button>
      <AttachmentPreviewDialog
        open={open}
        onOpenChange={setOpen}
        title={assetTag}
        subtitle={assetName}
        kind="image"
        src={`/api/attachments/${photo.id}?inline=1`}
        alt={photo.alt}
        downloadHref={`/api/attachments/${photo.id}`}
      />
    </>
  )
}
