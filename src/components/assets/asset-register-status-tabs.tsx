import { TabNav, type TabNavItem } from "@/components/ui/tab-nav"

// count is already formatted (formatCount). The page marks one item active; TabNav takes its key as current.
export type AssetRegisterStatusTabItem = TabNavItem & { active: boolean }

// A server wrapper of TabNav (spec 2B §7.7, I9): underline tabs at every width, 44px targets below md. The class lets
// the row scroll to the screen edge on phones; data-asset-status-tabs reaches the nav element through navProps.
// sumLine is the already formatted line under the tabs: the tabs add up to ทั้งหมด (group 4 spec §6.2). The page gives it
// only when สถานะอื่น has assets, and sumLabel leads it for a screen reader, which otherwise hears bare numbers (final
// review C2).
export function AssetRegisterStatusTabs({ label, items, sumLine, sumLabel }: { label: string; items: AssetRegisterStatusTabItem[]; sumLine?: string; sumLabel?: string }) {
  return (
    <>
      <TabNav
        aria-label={label}
        items={items}
        current={items.find((item) => item.active)?.key ?? ""}
        data-asset-status-tabs
        className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"
      />
      {sumLine ? (
        <p data-asset-status-sum className="text-meta text-muted-foreground num mb-2 md:mb-3">
          {sumLabel ? <span className="sr-only">{sumLabel} </span> : null}
          {sumLine}
        </p>
      ) : null}
    </>
  )
}
