"use client"

import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChosenPhotoPreview } from "@/components/ui/chosen-photo-preview"
import { FieldError } from "@/components/ui/field"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { FileQueueList } from "@/components/ui/file-queue-list"
import { disposalEvidenceAccept, disposalPhotoMimeTypes } from "@/lib/disposal-photo"
import { getDisposalQueuedFileError } from "@/lib/disposal-request-form-rules"

export type DisposalBatchQueuedFile = { id: string; file: File }
export type DisposalBatchMachine = { id: string; name: string; assetTag: string; serialNumber: string | null }

const isPhoto = (file: File) => (disposalPhotoMimeTypes as readonly string[]).includes(file.type.toLowerCase())

// One machine of the batch (request batches spec §4, DP-Batch-New): its name, tag and the register's Serial (read only,
// "–" when none), its optional photo slot, and remove. The photo slot takes the single form's accept list and refuses a
// HEIC at once; a lost batch has no slot per machine (showPhoto false), the lot's file covers every machine.
export function DisposalBatchMachineRow({
  machine,
  files,
  showPhoto,
  disabled,
  onAddFiles,
  onRemoveFile,
  onRemove,
}: {
  machine: DisposalBatchMachine
  files: DisposalBatchQueuedFile[]
  showPhoto: boolean
  disabled: boolean
  onAddFiles: (files: File[]) => void
  onRemoveFile: (id: string) => void
  onRemove: () => void
}) {
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const photoId = useId()
  const [refused, setRefused] = useState(false)
  const imageFiles = files.filter((item) => isPhoto(item.file))
  const otherFiles = files.filter((item) => !isPhoto(item.file))

  function addFiles(next: File[]) {
    const accepted = next.filter((file) => getDisposalQueuedFileError(file) === null)
    setRefused(accepted.length < next.length)
    if (accepted.length > 0) onAddFiles(accepted)
  }

  return (
    <li data-disposal-batch-machine={machine.assetTag} className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] md:items-start">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-foreground">{machine.name}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-meta text-muted-foreground">
          <span className="tag">{machine.assetTag}</span>
          <span data-disposal-batch-serial>
            {t("batchForm.serial")} <span className="num text-foreground">{machine.serialNumber || t("batchForm.none")}</span>
          </span>
        </p>
      </div>
      {showPhoto ? (
        <div data-disposal-batch-machine-photo className="grid min-w-0 gap-2">
          <FileDropzone
            id={photoId}
            file={null}
            onFileChange={(file) => {
              if (file) addFiles([file])
            }}
            onFilesChange={addFiles}
            disabled={disabled}
            accept={disposalEvidenceAccept}
            multiple
            compact
            title={t("batchForm.rowPhoto")}
            browseLabel={t("dropEvidenceHint")}
          />
          {refused ? <FieldError data-disposal-photo-refused>{t("photoTypeRefused")}</FieldError> : null}
          {imageFiles.length > 0 ? (
            <ul aria-label={tCommon("selectedFiles")} className="flex flex-wrap gap-2">
              {imageFiles.map((item) => (
                <li key={item.id} data-disposal-queued-photo className="relative">
                  <ChosenPhotoPreview file={item.file} alt={item.file.name} size={48} />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label={tCommon("removeFile", { name: item.file.name })}
                    onClick={() => onRemoveFile(item.id)}
                    className="absolute -right-2 -top-2 bg-surface"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <FileQueueList items={otherFiles.map((item) => ({ id: item.id, name: item.file.name }))} disabled={disabled} onRemove={onRemoveFile} />
        </div>
      ) : <div className="max-md:hidden" />}
      <Button
        variant="outline"
        size="icon-sm"
        disabled={disabled}
        aria-label={t("batchForm.remove", { name: `${machine.assetTag} ${machine.name}` })}
        onClick={onRemove}
        className="justify-self-end"
      >
        <X aria-hidden="true" />
      </Button>
    </li>
  )
}
