"use client"

import { Columns3 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
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
        <Button variant="outline" size="md">
          <Columns3 aria-hidden="true" />
          {t("columns")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("columnPresets")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activePreset} onValueChange={(value) => onApplyPreset(value as AssetRegisterColumnPresetKey)}>
          {presetKeys.map((preset) => (
            <DropdownMenuRadioItem key={preset} value={preset} onSelect={(event) => event.preventDefault()}>
              {t(presetLabelKeys[preset])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("columns")}</DropdownMenuLabel>
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
