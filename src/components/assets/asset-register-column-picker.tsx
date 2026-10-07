"use client"

import { Columns3 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  assetRegisterColumnOrder,
  assetRegisterColumnPresets,
  assetRegisterColumnsMatchPreset,
  type AssetRegisterColumnKey,
  type AssetRegisterColumnPresetKey,
} from "@/lib/asset-register-columns"

const presetKeys = ["all", "operations", "accounting", "audit"] as const
const presetLabelKeys = {
  all: "columnPresetAll",
  operations: "columnPresetOperations",
  accounting: "columnPresetAccounting",
  audit: "columnPresetAudit",
} as const satisfies Record<AssetRegisterColumnPresetKey, string>
const columnLabelKeys = {
  assetTag: "assetTag",
  name: "assetName",
  category: "category",
  companyBranch: "company",
  currentLocation: "currentLocation",
  custodian: "custodian",
  ownershipType: "ownershipType",
  status: "status",
  condition: "condition",
  purchasePrice: "purchasePrice",
} as const satisfies Record<AssetRegisterColumnKey, string>

export function AssetRegisterColumnPicker({
  visibleColumns,
  onToggleColumn,
  onApplyPreset,
}: {
  visibleColumns: ReadonlySet<AssetRegisterColumnKey>
  onToggleColumn: (column: AssetRegisterColumnKey) => void
  onApplyPreset: (preset: AssetRegisterColumnPresetKey) => void
}) {
  const t = useTranslations("asset")
  const activePreset = presetKeys.find((preset) => assetRegisterColumnsMatchPreset(visibleColumns, assetRegisterColumnPresets[preset])) ?? ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Columns3 className="size-4" aria-hidden="true" />
          {t("columns")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{t("columnPresets")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activePreset} onValueChange={(value) => onApplyPreset(value as AssetRegisterColumnPresetKey)}>
          {presetKeys.map((preset) => (
            <DropdownMenuRadioItem key={preset} value={preset} onSelect={(event) => event.preventDefault()}>
              {t(presetLabelKeys[preset])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{t("columns")}</DropdownMenuLabel>
        {assetRegisterColumnOrder.map((column) => {
          const checked = visibleColumns.has(column)
          return (
            <DropdownMenuCheckboxItem
              key={column}
              checked={checked}
              disabled={checked && visibleColumns.size === 1}
              onCheckedChange={() => onToggleColumn(column)}
              onSelect={(event) => event.preventDefault()}
            >
              {t(columnLabelKeys[column])}
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
