"use client"

import { useRef, type ReactNode } from "react"
import type { OperationReviewItem } from "@/lib/asset-operation-review"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"

type OperationReviewDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  items: OperationReviewItem[]
  confirmLabel: string
  cancelLabel: string
  closeLabel?: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function OperationReviewDialog({
  open,
  title,
  description,
  items,
  confirmLabel,
  cancelLabel,
  closeLabel,
  busy = false,
  onClose,
  onConfirm,
}: OperationReviewDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  return (
    <AccessibleDialog
      open={open}
      title={title}
      description={description}
      busy={busy}
      size="sm"
      closeLabel={closeLabel}
      initialFocusRef={confirmButtonRef}
      onClose={onClose}
    >
      <AccessibleDialogBody className="py-2">
        <dl className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="break-words text-right font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel>{cancelLabel}</AccessibleDialogCancel>
        <Button ref={confirmButtonRef} busy={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
  )
}
