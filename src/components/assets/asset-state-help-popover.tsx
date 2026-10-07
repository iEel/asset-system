"use client"

import { CircleHelp } from "lucide-react"
import { useRef, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type AssetStateHelpPopoverProps = {
  title: string
  description: string
  items: string[]
  srLabel?: string
  size?: "default" | "compact"
}

export function AssetStateHelpPopover({ title, description, items, srLabel, size = "default" }: AssetStateHelpPopoverProps) {
  const [open, setOpen] = useState(false)
  const pinnedRef = useRef(false)
  const isCompact = size === "compact"
  const buttonClassName = isCompact
    ? "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    : "inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  const iconClassName = isCompact ? "h-3.5 w-3.5" : "h-4 w-4"

  return (
    <Popover open={open} onOpenChange={(next) => {
      if (!next) pinnedRef.current = false
      setOpen(next)
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={srLabel ?? title}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setOpen(true)
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse" && !pinnedRef.current) setOpen(false)
          }}
          onClick={(event) => {
            event.preventDefault()
            pinnedRef.current = true
            setOpen(true)
          }}
          className={buttonClassName}
        >
          <CircleHelp className={iconClassName} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[min(20rem,calc(100vw-1.5rem))] p-3 text-left"
      >
        <span role="status" aria-live="polite" className="block">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
          <span className="mt-2 block space-y-1">
            {items.map((item) => (
              <span key={item} className="block text-xs leading-relaxed text-foreground">
                {item}
              </span>
            ))}
          </span>
        </span>
      </PopoverContent>
    </Popover>
  )
}
