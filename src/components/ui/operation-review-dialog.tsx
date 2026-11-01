"use client"

import { useRef, type ReactNode } from "react"
import type { OperationReviewItem } from "@/lib/asset-operation-review"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"

type OperationReviewDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  /** A value may be a node (group 3 spec §19.5: the chosen photo beside "แนบแล้ว"). */
  items: Array<Omit<OperationReviewItem, "value"> & { value: ReactNode }>
  confirmLabel: string
  cancelLabel: string
  closeLabel?: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
  /** Under the items, inside the body: what is not one label and value (ย้ายที่ตั้งหลายรายการ's sentence lines and หมายเหตุ; group 3 plan 4 P4-R17). */
  children?: ReactNode
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
  children,
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
        {children ? <div className="border-t border-border py-3">{children}</div> : null}
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel>{cancelLabel}</AccessibleDialogCancel>
        <Button ref={confirmButtonRef} busy={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
  )
}
