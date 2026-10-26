"use client"

import { useTranslations } from "next-intl"
import { Copy, Pencil } from "lucide-react"
import { RowActions, type RowActionItem } from "@/components/ui/row-actions"
import { assetActionIcons } from "@/components/assets/asset-action-icons"
import type { AssetAction, AssetActionKey, AssetActionSet } from "@/lib/asset-actions"

export type AssetRegisterRowPermissions = { canEdit: boolean; canCreate: boolean; canDelete: boolean }

// The register's row actions, pattern ช1 (spec 2B I5, §7.9): a client wrapper that turns one row into the data-only
// props of the shared RowActions. RowActions draws the next-step button (desktop rows only; a row without one keeps the
// empty 120px slot), ⋯ (a dropdown in the table, a bottom sheet in the phone list), the delete confirm and the focus
// return to ⋯. The rule (`src/lib/asset-actions.ts`, shared with the asset page) decides the next step, the other
// transactions, their words and their reasons; this file adds edit, clone and delete by permission.
export function AssetRegisterRowActions({
  variant,
  assetId,
  assetTag,
  assetName,
  actions,
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
  actions: AssetActionSet
  editHref: string
  cloneHref: string
  permissions: AssetRegisterRowPermissions
  onNavigate?: () => void
  className?: string
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const { primary } = actions
  const icon = (key: AssetActionKey, className?: string) => {
    const Icon = assetActionIcons[key]
    return <Icon className={className} aria-hidden="true" />
  }
  // An action that cannot run now stays in the menu as "unavailable": arrow keys reach it, it reads its reason, and it does nothing.
  const toItem = (action: AssetAction): RowActionItem =>
    action.enabled && action.href
      ? { kind: "link", key: action.key, label: tAll(action.labelKey), href: action.href, icon: icon(action.key, "text-primary"), onNavigate }
      : { kind: "unavailable", key: action.key, label: tAll(action.labelKey), reason: action.reasonKey ? tAll(action.reasonKey) : "", icon: icon(action.key) }
  // A phone row has no next-step slot, so the primary leads the sheet (group 1 spec §7.1).
  const transactionItems: RowActionItem[] = [...(variant === "mobile" && actions.primary ? [actions.primary] : []), ...actions.transactions].map(toItem)
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
      next={variant === "desktop" ? (primary ? { label: tAll(primary.labelKey), href: primary.href, icon: icon(primary.key), onNavigate } : null) : undefined}
      groups={[
        { key: "transactions", label: t("transactionMenu"), items: transactionItems },
        { key: "record", items: recordItems },
      ]}
      deleteAction={permissions.canDelete ? { endpoint: `/api/assets/${assetId}` } : undefined}
      className={className}
    />
  )
}
