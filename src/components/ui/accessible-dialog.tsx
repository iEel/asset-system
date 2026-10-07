"use client"

import { useRef, type ReactNode, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type AccessibleDialogSize = "sm" | "md" | "lg" | "xl"

const sizeClasses: Record<AccessibleDialogSize, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-5xl",
}

export function AccessibleDialog({
  open,
  title,
  description,
  busy = false,
  initialFocusRef,
  returnFocusRef,
  size = "md",
  closeLabel,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  busy?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  returnFocusRef?: RefObject<HTMLElement | null>
  size?: AccessibleDialogSize
  closeLabel?: string
  onClose: () => void
  children: ReactNode
}) {
  const tCommon = useTranslations("common")
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose()
      }}
    >
      <DialogContent
        closeLabel={closeLabel ?? tCommon("close")}
        closeDisabled={busy}
        aria-busy={busy || undefined}
        {...(description ? {} : { "aria-describedby": undefined })}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault()
        }}
        onOpenAutoFocus={(event) => {
          restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          const target = initialFocusRef?.current
          if (!target) return
          event.preventDefault()
          target.focus()
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current ?? restoreFocusRef.current
          if (!target?.isConnected) return
          event.preventDefault()
          target.focus()
        }}
        className={cn(
          "top-auto bottom-3 flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-lg border-border bg-surface p-0 shadow-xl sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%]",
          sizeClasses[size],
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-16 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
