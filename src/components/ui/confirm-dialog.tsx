"use client"

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  emptyConfirmQueue,
  enqueueConfirm,
  settleConfirm,
  type ConfirmOptions,
  type ConfirmQueue,
} from "@/lib/confirm-queue"

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const tCommon = useTranslations("common")
  const [queue, setQueue] = useState<ConfirmQueue>(emptyConfirmQueue)
  const queueRef = useRef<ConfirmQueue>(emptyConfirmQueue)
  const nextIdRef = useRef(0)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const closingRequestRef = useRef<ConfirmOptions | null>(null)

  const commit = useCallback((next: ConfirmQueue) => {
    queueRef.current = next
    setQueue(next)
  }, [])

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        nextIdRef.current += 1
        commit(enqueueConfirm(queueRef.current, { ...options, id: nextIdRef.current, resolve }))
      }),
    [commit],
  )

  const settle = useCallback(
    (id: number, confirmed: boolean) => {
      const { queue: next, settled } = settleConfirm(queueRef.current, id)
      if (!settled) return
      commit(next)
      settled.resolve(confirmed)
    },
    [commit],
  )

  const current = queue.current

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={current !== null}
        onOpenChange={(open) => {
          if (!open && current) settle(current.id, false)
        }}
      >
        {current ? (
          <AlertDialogContent
            key={current.id}
            {...(current.description ? {} : { "aria-describedby": undefined })}
            onOpenAutoFocus={() => {
              restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
              closingRequestRef.current = current
            }}
            onCloseAutoFocus={(event) => {
              const target = [restoreFocusRef.current, closingRequestRef.current?.returnFocusRef?.current].find((candidate) => candidate?.isConnected)
              if (!target) return
              event.preventDefault()
              target.focus()
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{current.title}</AlertDialogTitle>
              {current.description ? <AlertDialogDescription>{current.description}</AlertDialogDescription> : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={(event) => {
                  event.preventDefault()
                  settle(current.id, false)
                }}
              >
                {current.cancelLabel ?? tCommon("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant={current.tone === "destructive" ? "destructive" : "default"}
                onClick={(event) => {
                  event.preventDefault()
                  settle(current.id, true)
                }}
              >
                {current.confirmLabel ?? tCommon("confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>")
  return confirm
}
