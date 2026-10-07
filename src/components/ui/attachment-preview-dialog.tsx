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
  closeLabel,
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
  closeLabel?: string
}) {
  const tCommon = useTranslations("common")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={closeLabel ?? tCommon("close")}
        {...(subtitle ? {} : { "aria-describedby": undefined })}
        className="flex h-[92dvh] w-[calc(100%-1.5rem)] max-w-none flex-col gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-5xl"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-16 text-left">
          <DialogTitle className="truncate text-sm font-semibold text-foreground">{title}</DialogTitle>
          {subtitle ? <DialogDescription className="truncate text-xs text-muted-foreground">{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <div className="relative min-h-0 flex-1 bg-black">
          {kind === "image" ? (
            <Image src={src} alt={alt ?? title} fill unoptimized className="object-contain" />
          ) : (
            <iframe src={src} title={title} className="h-full w-full bg-white" />
          )}
        </div>
        {downloadHref && downloadLabel ? (
          <div className="flex shrink-0 justify-end border-t border-border px-4 py-3">
            <a href={downloadHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Download aria-hidden="true" />
              {downloadLabel}
            </a>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
