import { TabNav, type TabNavItem } from "@/components/ui/tab-nav"

// count is already formatted (formatCount). The page marks one item active; TabNav takes its key as current.
export type AssetRegisterStatusTabItem = TabNavItem & { active: boolean }

// A server wrapper of TabNav (spec 2B §7.7, I9): underline tabs at every width, 44px targets below md. The class lets
// the row scroll to the screen edge on phones; data-asset-status-tabs reaches the nav element through navProps.
export function AssetRegisterStatusTabs({ label, items }: { label: string; items: AssetRegisterStatusTabItem[] }) {
  return (
    <TabNav
      aria-label={label}
      items={items}
      current={items.find((item) => item.active)?.key ?? ""}
      data-asset-status-tabs
      className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"
    />
  )
}
