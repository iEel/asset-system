"use client"

import { useRef } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRightLeft, Check, ChevronDown, Copy, MoreHorizontal, PackageCheck, Trash2, Undo2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDeleteAction } from "@/components/master-data/use-delete-action"
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={labels.transaction}
          aria-label={labels.transaction}
          className={variant === "full"
            ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
            : "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          }
        >
          <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
          {variant === "full" ? <><span>{labels.transaction}</span><ChevronDown className="h-4 w-4" aria-hidden="true" /></> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent data-no-row-click align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{labels.transaction}</DropdownMenuLabel>
        {actions.map((action) => {
          const Icon = transactionIcon[action.action]
          const title = labels[action.action]
          if (!action.enabled) {
            return (
              <DropdownMenuItem key={action.action} disabled className="items-start">
                <Icon className="mt-0.5" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {action.reason ? labels.reason[action.reason] : ""}
                  </span>
                </span>
              </DropdownMenuItem>
            )
          }
          return (
            <DropdownMenuItem key={action.action} asChild>
              <Link href={action.href}>
                <Icon className="text-primary" aria-hidden="true" />
                <span>{title}</span>
                <Check className="ml-auto size-3.5 text-success" aria-hidden="true" />
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AssetRegisterMoreMenu({ assetId, cloneHref, labels }: { assetId: string; cloneHref: string; labels: Labels }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const { deleting, runDelete } = useDeleteAction(`/api/assets/${assetId}`, { returnFocusRef: triggerRef })
  const tCommon = useTranslations("common")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          title={labels.more}
          aria-label={labels.more}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent data-no-row-click align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={cloneHref}>
            <Copy aria-hidden="true" />
            {labels.cloneAsset}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" disabled={deleting} onSelect={() => void runDelete()}>
          <Trash2 aria-hidden="true" />
          {tCommon("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const transactionIcon: Record<AssetRegisterTransactionAction, typeof PackageCheck> = {
  checkout: PackageCheck,
  checkin: Undo2,
  transfer: ArrowRightLeft,
}
