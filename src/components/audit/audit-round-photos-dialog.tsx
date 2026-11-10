"use client"

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ImageIcon } from "lucide-react"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyNote } from "@/components/ui/empty-note"
import { Notice } from "@/components/ui/notice"
import { thumbnailUrl } from "@/lib/attachment-thumbnail"
import { formatCount } from "@/lib/display-format"
import { cn, formatDateTime } from "@/lib/utils"
// Type only: audit-scan-photos.ts is server-only (it reaches the db).
import type { AuditScanPhoto } from "@/lib/audit-scan-photos"

// The round page's photo column (audit photos spec 2026-11-10 §5). A checked item with photos in this round shows the
// newest one as a button that opens that item's photos for the round; a pending item shows its register photo, plain
// and labelled, so it never reads as the round's evidence.

/** The row thumbnail's box: 48px, drawn from the thumbnail route's 96px size so it stays sharp on a phone. */
const rowThumbSize = 48
const rowThumbBox = "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"

// React sends the events of a dialog's portal up the component tree to the table row (ClickableTableRow), which would
// open the asset on a click or an Enter inside the dialog. The dialogs sit in an empty hidden span that stops events
// coming from outside it, as the disposal row actions do.
function stopPortalEvent(event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
}

type RoundPhoto = { id: string; originalName: string; uploadedAtIso: string }
type LoadState = { status: "idle" | "loading" | "error" } | { status: "ready"; photos: RoundPhoto[] }

export function AuditRoundPhotosButton({
  roundId,
  itemId,
  assetId,
  assetTag,
  auditNo,
  photo,
}: {
  roundId: string
  itemId: string
  assetId: string
  assetTag: string
  auditNo: string
  photo: { attachmentId: string; count: number }
}) {
  const t = useTranslations("auditRound")
  const tAsset = useTranslations("asset")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<LoadState>({ status: "idle" })
  const [preview, setPreview] = useState<RoundPhoto | null>(null)
  // Keyed by the photo, so a row that gets a new photo tries it again.
  const [failedId, setFailedId] = useState<string | null>(null)
  const requestRef = useRef(0)
  const name = t("roundPhotoCount", { label: t("photoAttached"), count: photo.count })

  // The full list is read when the dialog opens (spec §5 Loading), never on render; a retry reads it again.
  async function load() {
    const request = ++requestRef.current
    setState({ status: "loading" })
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/items/${itemId}/photos`, { cache: "no-store" })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as { photos: RoundPhoto[] }
      if (request === requestRef.current) setState({ status: "ready", photos: body.photos })
    } catch {
      if (request === requestRef.current) setState({ status: "error" })
    }
  }

  function openDialog() {
    setOpen(true)
    void load()
  }

  return (
    <>
      <button
        type="button"
        data-no-row-click
        data-audit-round-photo
        onClick={openDialog}
        aria-label={t("roundPhotoCount", { label: t("photoAttached"), count: photo.count })}
        title={name}
        className="inline-flex items-center gap-1.5 rounded-md text-meta text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn(rowThumbBox, "transition-colors hover:border-primary")}>
          {failedId === photo.attachmentId ? (
            <ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route
            <img
              src={thumbnailUrl(photo.attachmentId)}
              alt=""
              width={rowThumbSize}
              height={rowThumbSize}
              loading="lazy"
              decoding="async"
              onError={() => setFailedId(photo.attachmentId)}
              className="size-full bg-image-stage object-contain p-0.5"
            />
          )}
        </span>
        {photo.count > 1 ? (
          <span aria-hidden="true" className="tabular-nums">+{formatCount(photo.count - 1)}</span>
        ) : null}
      </button>

      <span hidden onClick={stopPortalEvent} onKeyDown={stopPortalEvent}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader className="pr-10 text-left">
              <DialogTitle className="text-base font-semibold text-foreground">
                {t("roundPhotosTitle", { assetTag, auditNo })}
              </DialogTitle>
            </DialogHeader>

            {state.status === "error" ? (
              <Notice
                tone="danger"
                action={
                  <Button variant="outline" size="sm" onClick={() => void load()}>
                    {tCommon("tryAgain")}
                  </Button>
                }
              >
                {t("roundPhotosLoadFailed")}
              </Notice>
            ) : state.status === "ready" ? (
              state.photos.length === 0 ? (
                <EmptyNote>{t("roundPhotosEmpty")}</EmptyNote>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {state.photos.map((entry) => (
                    <RoundPhotoTile key={entry.id} entry={entry} label={tAsset("filesTab.openPhoto", { name: entry.originalName })} onOpen={() => setPreview(entry)} />
                  ))}
                </ul>
              )
            ) : (
              <p role="status" className="text-meta text-muted-foreground">{tCommon("loading")}</p>
            )}

            <div className="flex justify-end">
              <Link
                href={`/${locale}/assets/${assetId}?view=files&photoRound=${encodeURIComponent(auditNo)}`}
                className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm md:min-h-0")}
              >
                {t("roundPhotosViewInFiles")}
              </Link>
            </div>
          </DialogContent>
        </Dialog>

        {/* The original, the files tab's preview. */}
        <AttachmentPreviewDialog
          open={preview !== null}
          onOpenChange={(next) => {
            if (!next) setPreview(null)
          }}
          title={preview?.originalName ?? ""}
          subtitle={preview ? formatDateTime(preview.uploadedAtIso) : undefined}
          kind="image"
          src={preview ? `/api/attachments/${preview.id}?inline=1` : ""}
          alt={preview?.originalName}
          downloadHref={preview ? `/api/attachments/${preview.id}` : undefined}
          downloadLabel={tAsset("download")}
        />
      </span>
    </>
  )
}

function RoundPhotoTile({ entry, label, onOpen }: { entry: RoundPhoto; label: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false)
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {failed ? (
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route
          <img
            src={thumbnailUrl(entry.id, "card")}
            alt=""
            width={240}
            height={180}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="size-full bg-image-stage object-contain"
          />
        )}
      </button>
      <p className="mt-1.5 truncate text-meta text-muted-foreground" title={entry.originalName}>
        {formatDateTime(entry.uploadedAtIso)}
      </p>
    </li>
  )
}

/** A pending row's register photo (spec §5): the same size as the round photo, but plain (not a button: the round
 * dialog is for this round's photos, and a pending item has none) and labelled รูปทะเบียน or รูปประจำรุ่น, so it never
 * reads as the round's evidence. Decorative: the row already names the asset. A photo that fails to load leaves the
 * label alone. */
export function AuditRegisterPhotoThumb({ photo }: { photo: AuditScanPhoto }) {
  const t = useTranslations("auditRound")
  const tAsset = useTranslations("asset")
  const [failedId, setFailedId] = useState<string | null>(null)
  const label = photo.fromModel ? tAsset("modelPhoto") : t("registerPhoto")
  return (
    <span data-audit-register-photo data-from-model={photo.fromModel ? "true" : undefined} className="inline-flex flex-col items-start gap-1">
      {failedId === photo.attachmentId ? null : (
        <span className={rowThumbBox}>
          {/* eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route */}
          <img
            src={thumbnailUrl(photo.attachmentId)}
            alt=""
            width={rowThumbSize}
            height={rowThumbSize}
            loading="lazy"
            decoding="async"
            onError={() => setFailedId(photo.attachmentId)}
            className="size-full bg-image-stage object-contain p-0.5"
          />
        </span>
      )}
      <span className="whitespace-nowrap text-meta text-faint-foreground">{label}</span>
    </span>
  )
}
