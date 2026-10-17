"use client"

import { CircleHelp } from "lucide-react"
import { useRef, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type AssetStateHelpPopoverProps = {
  title: string
  description: string
  items: string[]
  srLabel?: string
}

export function AssetStateHelpPopover({ title, description, items, srLabel }: AssetStateHelpPopoverProps) {
  const [open, setOpen] = useState(false)
  const pinnedRef = useRef(false)

  return (
    <Popover open={open} onOpenChange={(next) => {
      if (!next) pinnedRef.current = false
      setOpen(next)
    }}>
      {/* A 24px circle beside a field label, in the page header or in a table head. Below md its ::after box makes the
          target 44px (the user, 2026-10-17): 10px to each side, 16px up and 4px down, where the field's own control
          starts. From md, where the pointer is a mouse, it stays 24px. */}
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
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative after:absolute after:-inset-x-2.5 after:-top-4 after:-bottom-1 md:after:hidden"
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
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
