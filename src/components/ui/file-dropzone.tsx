"use client"

import { useId, useState } from "react"
import { Upload } from "lucide-react"

export function FileDropzone({
  file,
  onFileChange,
  disabled,
  accept,
  title,
  hint,
  browseLabel,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
  accept?: string
  title: string
  hint: string
  browseLabel: string
}) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return

    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      onFileChange(droppedFile)
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
        disabled ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Upload className="h-5 w-5" />
      </span>
      <span className="mt-3 block text-sm font-medium text-foreground">{file ? file.name : title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{file ? hint : browseLabel}</span>
    </label>
  )
}
