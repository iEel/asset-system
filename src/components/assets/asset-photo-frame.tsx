"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ImageIcon, ImageOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { buttonVariants } from "@/components/ui/button-variants"
import { thumbnailUrl } from "@/lib/attachment-thumbnail"
import { cn } from "@/lib/utils"

const imageBox = "flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"

// A detail page's photo card (spec §7.5): the thumbnail route's card-size WebP, a placeholder when it fails, and the
// original only in the preview dialog a person opens. The frame fills the box its caller sizes and has no height of its
// own. The caller passes only an image the thumbnail route renders (isThumbnailable).
export function AssetPhotoFrame({ attachmentId, alt, label, canUpload, uploadHref, previewable = true, className }: { attachmentId: string | null; alt: string; label?: string; canUpload: boolean; uploadHref?: string; previewable?: boolean; className?: string }) {
  const t = useTranslations("asset")
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)

  // A link to where the photos are added (the files tab); the camera input lives there, not in this card.
  const upload = canUpload && uploadHref ? (
    <Link href={uploadHref} className={buttonVariants({ variant: "outline", size: "md" })}>
      <span className="max-md:hidden">{t("photoFrame.upload")}</span>
      <span className="md:hidden">{t("photoFrame.takePhoto")}</span>
    </Link>
  ) : null

  let content: ReactNode
  if (!attachmentId) {
    content = <ActionEmptyState icon={<ImageIcon />} title={t("photoFrame.emptyTitle")} description={t("photoFrame.emptyHelp")} action={upload} />
  } else if (failed) {
    content = <ActionEmptyState tone="error" icon={<ImageOff />} title={t("photoFrame.loadFailed")} action={upload} />
  } else {
    // Decorative: the button (or the caller's own control) names the photo.
    const image = (
      // eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route
      <img
        src={thumbnailUrl(attachmentId, "card")}
        alt=""
        width={480}
        height={360}
        decoding="async"
        onError={() => setFailed(true)}
        className="max-h-full w-full object-contain bg-image-stage"
      />
    )

    content = (
      <>
        {previewable ? (
          <button type="button"
            onClick={() => setOpen(true)}
            aria-label={t("photoFrame.open", { name: alt })}
            className={cn(imageBox, "transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
          >
            {image}
          </button>
        ) : (
          <div className={imageBox}>{image}</div>
        )}
        {label ? <p className="text-meta text-muted-foreground">{label}</p> : null}
        {previewable ? (
          <AttachmentPreviewDialog
            open={open}
            onOpenChange={setOpen}
            title={alt}
            subtitle={label}
            kind="image"
            src={`/api/attachments/${attachmentId}?inline=1`}
            alt={alt}
            downloadHref={`/api/attachments/${attachmentId}`}
            downloadLabel={t("download")}
          />
        ) : null}
      </>
    )
  }

  return <div className={cn("flex h-full w-full min-w-0 flex-col gap-2", className)}>{content}</div>
}
