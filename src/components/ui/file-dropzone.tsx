"use client"

import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Upload } from "lucide-react"
import { optimizeEvidenceImageFile } from "@/lib/evidence-image-optimization"

export function FileDropzone({
  file,
  onFileChange,
  disabled,
  accept,
  capture,
  title,
  hint,
  browseLabel,
  optimizeImages = true,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
  accept?: string
  capture?: "user" | "environment"
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

  async function handleSelectedFile(nextFile: File | null) {
    if (!nextFile) {
      onFileChange(null)
      return
    }

    if (!optimizeImages || !nextFile.type.startsWith("image/")) {
      onFileChange(nextFile)
      return
    }

    setOptimizing(true)
    try {
      const result = await optimizeEvidenceImageFile(nextFile)
      onFileChange(result.file)
    } finally {
      setOptimizing(false)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    if (isDisabled) return

    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      void handleSelectedFile(droppedFile)
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
        "block cursor-pointer rounded-md border border-dashed p-4 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border bg-surface hover:bg-accent",
        isDisabled ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        capture={capture}
        disabled={isDisabled}
        className="sr-only"
        onChange={(event) => {
          void handleSelectedFile(event.target.files?.[0] ?? null)
          event.currentTarget.value = ""
        }}
      />
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Upload className="h-5 w-5" />
      </span>
      <span className="mt-3 block text-sm font-medium text-foreground">{file ? file.name : title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{optimizing ? tCommon("imageOptimizing") : file ? hint : browseLabel}</span>
      {showImageOptimizationHint ? (
        <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{tCommon("imageOptimizationHint")}</span>
      ) : null}
    </label>
  )
}
