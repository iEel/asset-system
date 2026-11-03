"use client"

import Image from "next/image"
import { Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button-variants"

export function AttachmentPreviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  kind,
  src,
  alt,
  downloadHref,
  downloadLabel,
  actions,
  closeLabel,
  onCloseAutoFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  kind: "image" | "pdf"
  src: string
  alt?: string
  downloadHref?: string
  downloadLabel?: string
  // More commands in the footer before the download, e.g. the repair record's delete (group 5 spec §8.5).
  actions?: React.ReactNode
  closeLabel?: string
  // Where focus goes on close when the tile that opened the preview is gone (a deleted file): call preventDefault and
  // focus the target.
  onCloseAutoFocus?: (event: Event) => void
}) {
  const tCommon = useTranslations("common")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        closeLabel={closeLabel ?? tCommon("close")}
        {...(subtitle ? {} : { "aria-describedby": undefined })}
        className="flex h-[92dvh] w-[calc(100%-1.5rem)] max-w-none flex-col gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-5xl"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-16 text-left">
          <DialogTitle className="truncate text-sm font-semibold text-foreground">{title}</DialogTitle>
          {subtitle ? <DialogDescription className="truncate text-xs text-muted-foreground">{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <div className="relative min-h-0 flex-1 bg-black">
          {src ? (
            kind === "image" ? (
              <Image src={src} alt={alt ?? title} fill unoptimized className="object-contain" />
            ) : (
              <iframe src={src} title={title} className="h-full w-full bg-white" />
            )
          ) : null}
        </div>
        {(downloadHref && downloadLabel) || actions ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3">
            {actions}
            {downloadHref && downloadLabel ? (
              <a href={downloadHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Download aria-hidden="true" />
                {downloadLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
