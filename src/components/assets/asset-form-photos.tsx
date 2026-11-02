"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { FieldError } from "@/components/ui/field"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FoldedSection, type AssetFormDisclosure, type AssetFormFieldErrors } from "@/components/assets/asset-form-section"
import type { AssetField, AssetPhotoDraft, ExistingAssetPhoto } from "@/lib/asset-form-rules"
import { formatFileSize } from "@/lib/uploads"

// รูปทรัพย์สิน: the category's checklist, the drop zone, the photos already kept and the queued ones (group 4 plan 2
// Task 5 moved it out of asset-form.tsx; the queue and the upload stay there). Folded since Task 6a, where a chosen
// file joins the queue at once under the chosen photo type (spec §8: no add button), and the drop zone empties for the next.
export function AssetFormPhotos({
  isEdit,
  categoryId,
  errorText,
  fieldErrors,
  saving,
  selectedPhotoChecklist,
  effectivePhotoLabel,
  queuedPhotoLabels,
  existingPhotoLabels,
  setPhotoLabel,
  existingAssetPhotos,
  addAssetPhoto,
  newAssetPhotos,
  removeAssetPhoto,
  disclosure,
}: {
  isEdit: boolean
  categoryId: string
  errorText: (key: AssetField) => string | undefined
  fieldErrors: AssetFormFieldErrors
  saving: boolean
  selectedPhotoChecklist: string[]
  effectivePhotoLabel: string
  queuedPhotoLabels: Set<string>
  existingPhotoLabels: Set<string>
  setPhotoLabel: (label: string) => void
  existingAssetPhotos: ExistingAssetPhoto[]
  addAssetPhoto: (file: File | null) => void
  newAssetPhotos: AssetPhotoDraft[]
  removeAssetPhoto: (id: string) => void
  disclosure: AssetFormDisclosure
}) {
  const t = useTranslations("asset")
  // The photo-type chips are one radio group (T5): one name for the group and one id for its hint.
  const photoLabelRadioName = useId()
  const photoLabelHintId = useId()

  return (
    <FoldedSection title={t(isEdit ? "assetPhotos" : "initialAssetPhotos")} disclosure={disclosure}>
      <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
        <p className="mb-3 text-sm text-muted-foreground">{t(isEdit ? "assetPhotosEditHelp" : "initialAssetPhotosHelp")}</p>

        {selectedPhotoChecklist.length > 0 ? (
          <div className="mb-3">
            <fieldset className="min-w-0" aria-describedby={photoLabelHintId}>
              <legend className={fieldLabelClasses}>{t("selectPhotoType")}</legend>
              <p id={photoLabelHintId} className="mt-1 text-meta text-faint-foreground">
                {t("autoPhotoLabelHint", { label: effectivePhotoLabel || t("generalPhoto") })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPhotoChecklist.map((item) => {
                  const isSelected = effectivePhotoLabel === item
                  const isQueued = queuedPhotoLabels.has(item)
                  const alreadyExists = existingPhotoLabels.has(item)

                  return (
                    <ChoiceChip
                      key={item}
                      type="radio"
                      name={photoLabelRadioName}
                      checked={isSelected}
                      onChange={() => setPhotoLabel(item)}
                      label={item}
                      detail={
                        <span className={alreadyExists || isQueued ? "text-success" : undefined}>
                          {alreadyExists ? t("photoChecklistDone") : isQueued ? t("photoChecklistQueued") : t("photoChecklistPending")}
                        </span>
                      }
                    />
                  )
                })}
              </div>
            </fieldset>
          </div>
        ) : (
          <EmptyNote className="mb-3">
            {categoryId ? t("photoChecklistEmptyForCategory") : t("photoChecklistSelectCategory")}
          </EmptyNote>
        )}

        <FileDropzone
          file={null}
          onFileChange={addAssetPhoto}
          id="asset-photo-file"
          aria-invalid={fieldErrors.errors.assetPhotoFile ? true : undefined}
          aria-describedby={fieldErrors.errors.assetPhotoFile ? "asset-photo-file-error" : undefined}
          disabled={saving}
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
          capture="environment"
          title={t("dropAssetPhotoTitle")}
          browseLabel={t("dropAssetPhotoHint")}
        />
        {fieldErrors.errors.assetPhotoFile ? (
          <FieldError id="asset-photo-file-error" className="mt-1.5">{errorText("assetPhotoFile")}</FieldError>
        ) : null}

        {existingAssetPhotos.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t("existingAssetPhotos")}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {existingAssetPhotos.map((photo) => (
                <a
                  key={photo.id}
                  href={`/api/attachments/${photo.id}?inline=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex aspect-video items-center justify-center bg-background p-2">
                    {/* Authenticated attachment URLs render more reliably as browser-native images. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/attachments/${photo.id}?inline=1`}
                      alt={photo.originalName}
                      width={240}
                      height={160}
                      loading="lazy"
                      className="max-h-full w-full object-contain bg-image-stage"
                    />
                  </div>
                  <div className="border-t border-border p-2">
                    <div className="truncate text-meta font-medium text-foreground">{photo.originalName}</div>
                    <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(photo.fileSize)}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {newAssetPhotos.length > 0 && (
          <div className="mt-4 space-y-2">
            {newAssetPhotos.map((photo) => (
              <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {photo.label ? `${photo.label} · ` : ""}{photo.file.name}
                  </div>
                  <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(photo.file.size)}</div>
                </div>
                <Button
                  variant="danger"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() => removeAssetPhoto(photo.id)}
                  aria-label={t("removeAssetPhoto")}
                  title={t("removeAssetPhoto")}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </FoldedSection>
  )
}
