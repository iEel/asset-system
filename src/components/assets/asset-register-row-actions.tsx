"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRightLeft, Copy, MoreHorizontal, PackageCheck, Pencil, Trash2, Undo2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useDeleteAction } from "@/components/master-data/use-delete-action"
import {
  getRowNextAction,
  type AssetRegisterTransaction,
  type AssetRegisterTransactionAction,
} from "@/lib/asset-operation-policy"
import { cn } from "@/lib/utils"

export type AssetRegisterRowTransaction = AssetRegisterTransaction & { href: string }
export type AssetRegisterRowPermissions = { canEdit: boolean; canCreate: boolean; canDelete: boolean }

const transactionIcons: Record<AssetRegisterTransactionAction, typeof PackageCheck> = {
  checkout: PackageCheck,
  checkin: Undo2,
  transfer: ArrowRightLeft,
}
const transactionLabelKeys = {
  checkout: "rowActionCheckout",
  checkin: "rowActionCheckin",
  transfer: "rowActionTransfer",
} as const
const reasonLabelKeys = {
  permission_required: "transactionReasonPermission",
  status_not_ready: "transactionReasonStatusNotReady",
  no_return_record: "transactionReasonNoReturnRecord",
  active_maintenance: "transactionReasonActiveMaintenance",
  status_not_returnable: "transactionReasonStatusNotReturnable",
  status_not_transferable: "transactionReasonStatusNotTransferable",
} as const
const sheetItemClasses =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function AssetRegisterRowActions({
  variant,
  assetId,
  assetTag,
  assetName,
  transactions,
  editHref,
  cloneHref,
  permissions,
  onNavigate,
  className,
}: {
  variant: "desktop" | "mobile"
  assetId: string
  assetTag: string
  assetName: string
  transactions: AssetRegisterRowTransaction[]
  editHref: string
  cloneHref: string
  permissions: AssetRegisterRowPermissions
  onNavigate?: () => void
  className?: string
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [sheetOpen, setSheetOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const { deleting, runDelete } = useDeleteAction(`/api/assets/${assetId}`, { returnFocusRef: triggerRef })
  const nextAction = getRowNextAction(transactions)
  const next = nextAction ? transactions.find((transaction) => transaction.action === nextAction) : undefined
  const ordered = next ? [next, ...transactions.filter((transaction) => transaction !== next)] : transactions
  const menuLabel = t("rowActionsMenu", { assetTag })
  const reasonOf = (transaction: AssetRegisterRowTransaction) =>
    transaction.reason ? t(reasonLabelKeys[transaction.reason]) : ""

  if (variant === "desktop") {
    return (
      <div className={cn("flex items-center justify-end gap-1", className)}>
        {next ? (
          <NextActionLink transaction={next} label={t(transactionLabelKeys[next.action])} assetTag={assetTag} onNavigate={onNavigate} />
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              aria-label={menuLabel}
              title={menuLabel}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-no-row-click align="end" className="w-64">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{t("transactionMenu")}</DropdownMenuLabel>
            {ordered.map((transaction) => {
              const Icon = transactionIcons[transaction.action]
              const title = t(transactionLabelKeys[transaction.action])
              if (!transaction.enabled) {
                return (
                  <DropdownMenuItem key={transaction.action} disabled className="items-start">
                    <Icon className="mt-0.5" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{reasonOf(transaction)}</span>
                    </span>
                  </DropdownMenuItem>
                )
              }
              return (
                <DropdownMenuItem key={transaction.action} asChild>
                  <Link href={transaction.href} onClick={onNavigate}>
                    <Icon className="text-primary" aria-hidden="true" />
                    {title}
                  </Link>
                </DropdownMenuItem>
              )
            })}
            {permissions.canEdit || permissions.canCreate ? <DropdownMenuSeparator /> : null}
            {permissions.canEdit ? (
              <DropdownMenuItem asChild>
                <Link href={editHref} onClick={onNavigate}>
                  <Pencil aria-hidden="true" />
                  {tCommon("edit")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {permissions.canCreate ? (
              <DropdownMenuItem asChild>
                <Link href={cloneHref} onClick={onNavigate}>
                  <Copy aria-hidden="true" />
                  {t("cloneAsset")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {permissions.canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={deleting} onSelect={() => void runDelete()}>
                  <Trash2 aria-hidden="true" />
                  {tCommon("delete")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={menuLabel}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        closeLabel={tCommon("close")}
        data-no-row-click
        className="max-h-[85dvh] gap-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="pr-14">
          <SheetTitle>{assetTag}</SheetTitle>
          <SheetDescription className="truncate">{assetName}</SheetDescription>
        </SheetHeader>
        <ul className="space-y-0.5 overflow-y-auto px-2 pb-3">
          {ordered.map((transaction) => {
            const Icon = transactionIcons[transaction.action]
            const title = t(transactionLabelKeys[transaction.action])
            return (
              <li key={transaction.action}>
                {transaction.enabled ? (
                  <Link href={transaction.href} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {title}
                  </Link>
                ) : (
                  <div aria-disabled="true" className={cn(sheetItemClasses, "cursor-not-allowed py-2 text-muted-foreground hover:bg-transparent")}>
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block">{title}</span>
                      <span className="block text-xs font-normal">{reasonOf(transaction)}</span>
                    </span>
                  </div>
                )}
              </li>
            )
          })}
          {permissions.canEdit ? (
            <li className="border-t border-border pt-0.5">
              <Link href={editHref} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                <Pencil className="size-4" aria-hidden="true" />
                {tCommon("edit")}
              </Link>
            </li>
          ) : null}
          {permissions.canCreate ? (
            <li>
              <Link href={cloneHref} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                <Copy className="size-4" aria-hidden="true" />
                {t("cloneAsset")}
              </Link>
            </li>
          ) : null}
          {permissions.canDelete ? (
            <li className="border-t border-border pt-0.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setSheetOpen(false)
                  void runDelete()
                }}
                className={cn(sheetItemClasses, "text-danger disabled:cursor-not-allowed")}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {tCommon("delete")}
              </button>
            </li>
          ) : null}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

function NextActionLink({
  transaction,
  label,
  assetTag,
  onNavigate,
}: {
  transaction: AssetRegisterRowTransaction
  label: string
  assetTag: string
  onNavigate?: () => void
}) {
  const Icon = transactionIcons[transaction.action]
  return (
    <Link
      href={transaction.href}
      onClick={onNavigate}
      aria-label={`${label}: ${assetTag}`}
      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary-border bg-primary-soft px-2.5 text-xs font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  )
}
