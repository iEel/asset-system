"use client"

import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Upload } from "lucide-react"
import { optimizeEvidenceImageFile } from "@/lib/evidence-image-optimization"

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
  browseLabel,
  optimizeImages = true,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  onFilesChange?: (files: File[]) => void
  disabled?: boolean
  accept?: string
  capture?: "user" | "environment"
  multiple?: boolean
  title: string
  hint: string
  browseLabel: string
  optimizeImages?: boolean
}) {
  const inputId = useId()
  const tCommon = useTranslations("common")
  const [dragging, setDragging] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const isDisabled = disabled || optimizing
  const showImageOptimizationHint = optimizeImages && (accept?.includes("image") ?? true)

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
        isDisabled ? "pointer-events-none border-border bg-background" : dragging ? "border-primary bg-primary-soft" : "border-input bg-surface hover:bg-background",
      ].join(" ")}
    >
      <input
        id={inputId}
        type="file"
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
      <span className="mt-1 block text-meta text-faint-foreground">{optimizing ? tCommon("imageOptimizing") : file ? hint : browseLabel}</span>
      {showImageOptimizationHint ? (
        <span className="mt-1 block text-meta text-faint-foreground">{tCommon("imageOptimizationHint")}</span>
      ) : null}
    </label>
  )
}
