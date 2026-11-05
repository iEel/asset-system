"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { ImageIcon, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

// The model thumbnail of the brands page (group 7 spec §4.3). A photo that fails to load shows a placeholder with
// "โหลดรูปไม่สำเร็จ", never a broken image; no photo shows "ยังไม่มีรูป". The 48px table cell has room for the icon only,
// so the words are its title and its screen-reader text; the phone card's larger box shows them.
export function ModelPhoto({ src, size = "sm" }: { src: string | null; size?: "sm" | "lg" }) {
  const t = useTranslations("brandModel")
  const [failed, setFailed] = useState(false)
  const placeholder = !src ? t("photo.none") : failed ? t("photo.failed") : null
  const box = size === "lg" ? "h-20 w-20" : "h-12 w-12"

  return (
    <div
      className={cn("relative flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-border bg-muted text-muted-foreground", box)}
      title={placeholder ?? undefined}
    >
      {placeholder === null && src ? (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          onError={() => setFailed(true)}
          className="object-contain p-1 bg-image-stage"
          sizes={size === "lg" ? "80px" : "48px"}
        />
      ) : (
        <>
          {failed ? <ImageOff className="size-5" aria-hidden="true" /> : <ImageIcon className="size-5" aria-hidden="true" />}
          <span className={size === "lg" ? "px-1 text-center text-meta leading-tight" : "sr-only"}>{placeholder}</span>
        </>
      )}
    </div>
  )
}
