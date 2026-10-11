"use client"

import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Upload } from "lucide-react"
import { optimizeEvidenceImageFile } from "@/lib/evidence-image-optimization"

// The status line, the description and the image hint under the title.
const subLineClasses = "mt-1 block text-meta text-faint-foreground"

export function FileDropzone({
  file,
  onFileChange,
  onFilesChange,
  disabled,
  accept,
  capture,
  multiple = false,
  title,
  hint,
  description,
  browseLabel,
  optimizeImages = true,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  onFilesChange?: (files: File[]) => void
  disabled?: boolean
  accept?: string
  capture?: "user" | "environment"
  multiple?: boolean
  title: string
  // Shown in the box after a file is chosen (single-file mode). Without it the box repeats browseLabel.
  hint?: string
  // Always shown under the status line, before and after a file is chosen.
  description?: React.ReactNode
  browseLabel: string
  optimizeImages?: boolean
  // id, aria-describedby and aria-invalid come from a wrapping Field. aria-required is accepted so Field's control
  // props type-check, but it is not passed on: a file input has no role that supports it. Field still shows the asterisk.
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-required"?: boolean | "true" | "false"
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const tCommon = useTranslations("common")
  const [dragging, setDragging] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const isDisabled = disabled || optimizing
  const showImageOptimizationHint = optimizeImages && (accept?.includes("image") ?? true)
  const invalid = ariaInvalid === true || ariaInvalid === "true"
  // The title is the field's name. The three sub-lines are aria-hidden inside the <label> and reach screen readers
  // through aria-describedby, which still reads hidden text (spec 2C I13).
  const statusId = `${inputId}-status`
  const descriptionId = description ? `${inputId}-description` : undefined
  const optimizeId = showImageOptimizationHint ? `${inputId}-optimize` : undefined
  const describedBy = [ariaDescribedBy, statusId, descriptionId, optimizeId].filter(Boolean).join(" ")

  async function handleSelectedFiles(nextFileList: FileList | File[] | null | undefined) {
    const files = Array.from(nextFileList ?? [])
    const selectedFiles = multiple ? files : files.slice(0, 1)

    if (selectedFiles.length === 0) {
      onFileChange(null)
      return
    }

    if (!optimizeImages) {
      if (multiple && onFilesChange) onFilesChange(selectedFiles)
      else onFileChange(selectedFiles[0] ?? null)
      return
    }

    setOptimizing(true)
    try {
      const optimizedFiles = await Promise.all(
        selectedFiles.map(async (nextFile) => {
          if (!nextFile.type.startsWith("image/")) return nextFile
          const result = await optimizeEvidenceImageFile(nextFile)
          return result.file
        })
      )
      if (multiple && onFilesChange) onFilesChange(optimizedFiles)
      else onFileChange(optimizedFiles[0] ?? null)
    } finally {
      setOptimizing(false)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    if (isDisabled) return

    const droppedFiles = Array.from(event.dataTransfer.files ?? [])
    if (droppedFiles.length > 0) {
      void handleSelectedFiles(droppedFiles)
    }
  }

  return (
    <label
      htmlFor={inputId}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setDragging(false)
      }}
      onDrop={handleDrop}
      className={[
        "block cursor-pointer rounded-md border border-dashed p-4 text-center transition-colors motion-reduce:transition-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
        isDisabled ? "pointer-events-none border-border bg-background" : dragging ? "border-primary bg-primary-soft" : invalid ? "border-danger bg-surface hover:bg-background" : "border-input bg-surface hover:bg-background",
      ].join(" ")}
    >
      <input
        id={inputId}
        type="file"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        accept={accept}
        capture={capture}
        multiple={multiple}
        disabled={isDisabled}
        className="sr-only"
        onChange={(event) => {
          void handleSelectedFiles(Array.from(event.target.files ?? []))
          event.currentTarget.value = ""
        }}
      />
      <Upload className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
      <span className={`mt-3 block text-sm font-medium ${isDisabled ? "text-faint-foreground" : "text-foreground"}`}>{file ? file.name : title}</span>
      <span id={statusId} aria-hidden="true" className={subLineClasses}>
        {optimizing ? tCommon("imageOptimizing") : file ? (hint ?? browseLabel) : browseLabel}
      </span>
      {description ? (
        <span id={descriptionId} aria-hidden="true" className={subLineClasses}>
          {description}
        </span>
      ) : null}
      {showImageOptimizationHint ? (
        <span id={optimizeId} aria-hidden="true" className={subLineClasses}>
          {tCommon("imageOptimizationHint")}
        </span>
      ) : null}
    </label>
  )
}
