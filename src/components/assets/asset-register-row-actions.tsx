"use client"

import { useTranslations } from "next-intl"
import { ArrowRightLeft, Copy, PackageCheck, Pencil, Undo2 } from "lucide-react"
import { RowActions, type RowActionItem } from "@/components/ui/row-actions"
import {
  getRowNextAction,
  type AssetRegisterTransaction,
  type AssetRegisterTransactionAction,
} from "@/lib/asset-operation-policy"

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
  open_checkout: "transactionReasonOpenCheckout",
} as const

// The register's row actions, pattern ช1 (spec 2B I5, §7.9): a client wrapper that turns one row into the data-only
// props of the shared RowActions. RowActions draws the next-step button (desktop rows only; a row without one keeps the
// empty 120px slot), ⋯ (a dropdown in the table, a bottom sheet in the phone list), the delete confirm and the focus
// return to ⋯. This file keeps the register's own rules: which step is next, the order, the permissions and the reasons.
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
  const nextAction = getRowNextAction(transactions)
  const next = nextAction ? transactions.find((transaction) => transaction.action === nextAction) : undefined
  const ordered = next ? [next, ...transactions.filter((transaction) => transaction !== next)] : transactions
  const reasonOf = (transaction: AssetRegisterRowTransaction) =>
    transaction.reason ? t(reasonLabelKeys[transaction.reason]) : ""
  const icon = (action: AssetRegisterTransactionAction, className?: string) => {
    const Icon = transactionIcons[action]
    return <Icon className={className} aria-hidden="true" />
  }
  // A blocked transaction stays in the menu as "unavailable": arrow keys reach it, it reads its reason, and it does nothing.
  const transactionItems: RowActionItem[] = ordered.map((transaction) =>
    transaction.enabled
      ? { kind: "link", key: transaction.action, label: t(transactionLabelKeys[transaction.action]), href: transaction.href, icon: icon(transaction.action, "text-primary"), onNavigate }
      : { kind: "unavailable", key: transaction.action, label: t(transactionLabelKeys[transaction.action]), reason: reasonOf(transaction), icon: icon(transaction.action) },
  )
  const recordItems: RowActionItem[] = [
    ...(permissions.canEdit ? [{ kind: "link" as const, key: "edit", label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" />, onNavigate }] : []),
    ...(permissions.canCreate ? [{ kind: "link" as const, key: "clone", label: t("cloneAsset"), href: cloneHref, icon: <Copy aria-hidden="true" />, onNavigate }] : []),
  ]

  // RowActions skips an empty group, so a user who may neither edit nor create sees the transactions alone.
  return (
    <RowActions
      code={assetTag}
      name={assetName}
      menuLabel={t("rowActionsMenu", { assetTag })}
      menu={variant === "desktop" ? "dropdown" : "sheet"}
      next={variant === "desktop" ? (next ? { label: t(transactionLabelKeys[next.action]), href: next.href, icon: icon(next.action), onNavigate } : null) : undefined}
      groups={[
        { key: "transactions", label: t("transactionMenu"), items: transactionItems },
        { key: "record", items: recordItems },
      ]}
      deleteAction={permissions.canDelete ? { endpoint: `/api/assets/${assetId}` } : undefined}
      className={className}
    />
  )
}
