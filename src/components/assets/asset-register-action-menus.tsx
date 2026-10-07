"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { ArrowRightLeft, Check, ChevronDown, Copy, MoreHorizontal, PackageCheck, Undo2 } from "lucide-react"
import { AssetDeleteButton } from "@/components/master-data/asset-delete-button"
import type { AssetRegisterTransaction, AssetRegisterTransactionAction } from "@/lib/asset-operation-policy"

type Labels = {
  transaction: string
  more: string
  checkout: string
  checkin: string
  transfer: string
  cloneAsset: string
  reason: Record<string, string>
}

export function AssetRegisterTransactionMenu({
  actions,
  labels,
  variant = "icon",
}: {
  actions: Array<AssetRegisterTransaction & { href: string }>
  labels: Labels
  variant?: "icon" | "full"
}) {
  return (
    <FixedActionMenu
      label={labels.transaction}
      icon={<ArrowRightLeft className="h-4 w-4" aria-hidden="true" />}
      variant={variant}
    >
      <div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {labels.transaction}
      </div>
      {actions.map((action) => {
        const Icon = transactionIcon[action.action]
        const title = labels[action.action]
        if (!action.enabled) {
          return (
            <div key={action.action} aria-disabled="true" className="flex gap-3 px-3 py-2.5 opacity-45">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{title}</div>
                <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {action.reason ? labels.reason[action.reason] : ""}
                </div>
              </div>
            </div>
          )
        }
        return (
          <Link
            key={action.action}
            href={action.href}
            className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{title}</span>
            <Check className="ml-auto h-3.5 w-3.5 text-success" aria-hidden="true" />
          </Link>
        )
      })}
    </FixedActionMenu>
  )
}

export function AssetRegisterMoreMenu({
  assetId,
  cloneHref,
  labels,
}: {
  assetId: string
  cloneHref: string
  labels: Labels
}) {
  return (
    <FixedActionMenu
      label={labels.more}
      icon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
    >
      <div className="p-1.5">
        <Link
          href={cloneHref}
          className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          {labels.cloneAsset}
        </Link>
        <AssetDeleteButton id={assetId} showLabel />
      </div>
    </FixedActionMenu>
  )
}

function FixedActionMenu({
  label,
  icon,
  variant = "icon",
  children,
}: {
  label: string
  icon: React.ReactNode
  variant?: "icon" | "full"
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("mousedown", close)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      window.removeEventListener("mousedown", close)
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  function toggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const menuWidth = 288
      const menuHeight = 230
      const left = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12)
      const top = rect.bottom + menuHeight < window.innerHeight
        ? rect.bottom + 6
        : Math.max(12, rect.top - menuHeight - 6)
      setPosition({ left, top })
    }
    setOpen((current) => !current)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        title={label}
        aria-label={label}
        aria-expanded={open}
        className={variant === "full"
          ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
          : "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        }
      >
        {icon}
        {variant === "full" ? <><span>{label}</span><ChevronDown className="h-4 w-4" aria-hidden="true" /></> : null}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              data-no-row-click
              role="menu"
              className="fixed z-50 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
              style={position}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

const transactionIcon: Record<AssetRegisterTransactionAction, typeof PackageCheck> = {
  checkout: PackageCheck,
  checkin: Undo2,
  transfer: ArrowRightLeft,
}
