"use client"

import { useCallback } from "react"
import { cn } from "@/lib/utils"

const frameSize = { 48: "size-12", 96: "size-24" } as const

// A small preview of a photo chosen for upload (group 3 spec §19.5): nothing is uploaded, the browser reads the file.
// One object URL per file, made when the image mounts and revoked when the file changes or the preview unmounts
// (a React 19 ref cleanup). Nothing for no file or a file that is not an image.
export function ChosenPhotoPreview({ file, alt, size, className }: { file: File | null; alt: string; size: 48 | 96; className?: string }) {
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (!node || !file) return
    const url = URL.createObjectURL(file)
    node.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!file || !file.type.startsWith("image/")) return null
  return (
    <span data-slot="chosen-photo-preview" className={cn("inline-flex shrink-0 overflow-hidden rounded-md border border-border", frameSize[size], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a served image */}
      <img ref={attach} alt={alt} width={size} height={size} className="size-full object-cover bg-image-stage" />
    </span>
  )
}
