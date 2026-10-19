"use client"

import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type AccessibleDialogSize = "sm" | "md" | "lg" | "xl"

const sizeClasses: Record<AccessibleDialogSize, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-5xl",
}

// Goes on the <form> that wraps AccessibleDialogBody and AccessibleDialogFooter. The flex column lets the body
// scroll on its own while the footer stays in view; without it the whole form scrolls and the footer can scroll away.
export const accessibleDialogFormClasses = "flex min-h-0 flex-1 flex-col"

// AccessibleDialogCancel reads busy and onClose from the dialog, so callers do not pass them twice.
const AccessibleDialogContext = createContext<{ busy: boolean; onClose: () => void } | null>(null)

export function AccessibleDialog({
  open,
  title,
  description,
  busy = false,
  initialFocusRef,
  returnFocusRef,
  fallbackFocusRef,
  size = "md",
  closeLabel,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: ReactNode
  busy?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  returnFocusRef?: RefObject<HTMLElement | null>
  fallbackFocusRef?: RefObject<HTMLElement | null>
  size?: AccessibleDialogSize
  closeLabel?: string
  onClose: () => void
  children: ReactNode
}) {
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose()
      }}
    >
      <DialogContent
        closeLabel={closeLabel}
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
          const target = [returnFocusRef?.current, restoreFocusRef.current, fallbackFocusRef?.current].find((candidate) => candidate?.isConnected)
          if (!target) return
          event.preventDefault()
          target.focus()
        }}
        className={cn(
          "top-auto bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-lg border-border bg-surface p-0 shadow-overlay sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%]",
          sizeClasses[size],
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-16 text-left sm:pl-5">
          <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div data-slot="accessible-dialog-content" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <AccessibleDialogContext.Provider value={{ busy, onClose }}>{children}</AccessibleDialogContext.Provider>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// The parts are optional. Children that do not use them keep their own height, so the content slot scrolls them as before.
// A body that scrolls takes the keyboard (WCAG 2.1.1, axe scrollable-region-focusable; the E2E suite's findings TX-A8,
// D3, M9): while its content overflows it is a focusable region named by the dialog's title, as a wide table's scroll
// area is (DataTableScrollArea). The observers run on the content's changes too (a preview that loads after the open).
export function AccessibleDialogBody({ className, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [labelledBy, setLabelledBy] = useState<string | undefined>(undefined)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      setOverflowing(element.scrollHeight > element.clientHeight + 1)
      setLabelledBy(element.closest("[aria-labelledby]")?.getAttribute("aria-labelledby") ?? undefined)
    }
    const resize = new ResizeObserver(measure)
    resize.observe(element)
    const mutation = new MutationObserver(measure)
    mutation.observe(element, { childList: true, subtree: true, characterData: true })
    return () => {
      resize.disconnect()
      mutation.disconnect()
    }
  }, [])

  return <div ref={ref} role={overflowing ? "region" : undefined} aria-labelledby={overflowing ? labelledBy : undefined} tabIndex={overflowing ? 0 : undefined} data-slot="accessible-dialog-body" className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5", className)} {...props} />
}

// Buttons only (guard GD3), secondary first and primary last (K8): phones stack them full width with cancel on top,
// and from sm they form a right-aligned row. With no body before it, first:border-t-0 leaves the header's line alone.
export function AccessibleDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="accessible-dialog-footer"
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t border-border-soft bg-background px-4 py-3 first:border-t-0 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5",
        className,
      )}
      {...props}
    />
  )
}

// A real disabled attribute while busy: focus stays on the busy primary button, and the X and Escape are off as well.
export function AccessibleDialogCancel({
  children,
  disabled,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "type" | "children"> & { children?: ReactNode }) {
  const dialog = useContext(AccessibleDialogContext)
  const tCommon = useTranslations("common")
  if (!dialog) throw new Error("AccessibleDialogCancel must be used inside <AccessibleDialog>")

  return (
    <Button {...props} type="button" variant="outline" disabled={dialog.busy || disabled} onClick={onClick ?? dialog.onClose}>
      {children ?? tCommon("cancel")}
    </Button>
  )
}
