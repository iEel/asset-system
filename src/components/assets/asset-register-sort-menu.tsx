"use client"

import { ArrowUpDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { assetRegisterSortOptions, getActiveSortKey } from "@/lib/asset-register-sort"

const sortLabelKeys = {
  newest: "sortNewest",
  oldest: "sortOldest",
  tagAsc: "sortTagAsc",
  tagDesc: "sortTagDesc",
  nameAsc: "sortNameAsc",
  purchaseDateDesc: "sortPurchaseDateDesc",
  priceDesc: "sortPriceDesc",
} as const

export function AssetRegisterSortMenu() {
  const t = useTranslations("asset")
  const { filters, navigate } = useAssetRegisterNavigation()
  const activeKey = getActiveSortKey(filters.sort, filters.direction)
  const activeLabel = activeKey ? t(sortLabelKeys[activeKey]) : t("sortMenu")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("sortMenu")}: ${activeLabel}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:min-h-0 md:border md:border-border md:bg-surface md:px-3"
        >
          <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="hidden text-muted-foreground md:inline">{t("sortMenu")}:</span>
          <span>{activeLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{t("sortMenu")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activeKey ?? ""} onValueChange={(key) => {
          const option = assetRegisterSortOptions.find((item) => item.key === key)
          if (option) navigate({ sort: option.sort, direction: option.direction })
        }}>
          {assetRegisterSortOptions.map((option) => (
            <DropdownMenuRadioItem key={option.key} value={option.key}>
              {t(sortLabelKeys[option.key])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
