import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { filterConsumablesByListState, parseConsumableListState } from "@/lib/consumable-rules"
import { getConsumableFrequentReport, listConsumablesWithUsage, parseConsumableReportDays } from "@/lib/consumable-service"
import { requirePagePermission } from "@/lib/page-auth"
import { ConsumablesFrequentReport } from "@/components/consumables/consumables-frequent-report"
import { ConsumablesWorkspace } from "@/components/consumables/consumables-workspace"
import type { FilterChipItem } from "@/components/ui/filter-chips"
import { TabNav, type TabNavItem } from "@/components/ui/tab-nav"

// ของใช้สิ้นเปลือง (consumables plan 2 Task 2): the IT room's spare cabinet, one row per active kind with its count,
// minimum, stock state and 90-day use. consumable:view opens the page; create (issue, receive) and edit (adjust, add,
// edit, deactivate) decide which buttons the workspace renders.
// Plan 3 Task 3: TabNav รายการ (no view) / เครื่องที่เปลี่ยนของบ่อย (?view=frequent), each keeping the other params. The
// report reads ?days= (30/90/180/365, default 90), ?item= (one kind, active or not) and ?asset= (one machine).
// Plan 4 Task 2: the list reads ?state=low (the bell's ของใช้สิ้นเปลืองต้องซื้อเพิ่ม), keeping the kinds the bell counts
// (isConsumableLow, plan 4 final review) with a removable chip; the banner and the เบิก / รับเข้า dialogs still read the
// whole list.
type RawParam = string | string[] | undefined

type ConsumablesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ view?: string | string[]; days?: string | string[]; item?: string | string[]; asset?: string | string[]; state?: string | string[] }>
}

type ConsumablesQuery = { view?: string; days?: string; item?: string; asset?: string; state?: string }

// The first value, trimmed; empty or longer than an id is dropped.
function oneParam(value: RawParam): string | undefined {
  const first = (Array.isArray(value) ? value[0] : value)?.trim()
  return first && first.length <= 64 ? first : undefined
}

// This page with the query, a key set to undefined in overrides removed.
function consumablesHref(locale: string, query: ConsumablesQuery, overrides: Partial<ConsumablesQuery> = {}) {
  const next = { ...query, ...overrides }
  const search = new URLSearchParams()
  for (const key of ["view", "days", "item", "asset", "state"] as const) {
    const value = next[key]
    if (value) search.set(key, value)
  }
  const text = search.toString()
  return `/${locale}/consumables${text ? `?${text}` : ""}`
}

export default async function ConsumablesPage({ params, searchParams }: ConsumablesPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "consumable", "view")
  const canCreate = hasPermission(user, "consumable", "create")
  const canEdit = hasPermission(user, "consumable", "edit")
  const raw = await searchParams
  const query: ConsumablesQuery = { view: oneParam(raw.view), days: oneParam(raw.days), item: oneParam(raw.item), asset: oneParam(raw.asset), state: oneParam(raw.state) }
  const frequent = query.view === "frequent"
  const t = await getTranslations("consumablesPage")

  const tabItems: TabNavItem[] = [
    { key: "list", label: t("tab_list"), href: consumablesHref(locale, query, { view: undefined }) },
    { key: "frequent", label: t("tab_frequent"), href: consumablesHref(locale, query, { view: "frequent" }) },
  ]
  const tabs = <TabNav aria-label={t("title")} items={tabItems} current={frequent ? "frequent" : "list"} scroll={false} />

  if (frequent) {
    const days = parseConsumableReportDays(query.days)
    const [report, items, chipAsset] = await Promise.all([
      getConsumableFrequentReport(prisma, { days, itemId: query.item, assetId: query.asset, now: new Date() }),
      prisma.consumableItem.findMany({
        select: { id: true, name: true, isActive: true },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      query.asset ? prisma.asset.findUnique({ where: { id: query.asset }, select: { assetTag: true } }) : null,
    ])
    const chips: FilterChipItem[] = query.asset
      ? [{ key: "asset", label: t("asset_chip", { tag: chipAsset?.assetTag ?? query.asset }), href: consumablesHref(locale, query, { asset: undefined }) }]
      : []

    return (
      <ConsumablesFrequentReport
        locale={locale}
        tabs={tabs}
        days={days}
        itemId={query.item ?? null}
        assetId={query.asset ?? null}
        items={items}
        chips={chips}
        rows={report.rows}
        more={report.more}
      />
    )
  }

  const listState = parseConsumableListState(query.state)
  const rows = await listConsumablesWithUsage(prisma)
  const listChips: FilterChipItem[] = listState === "low"
    ? [{ key: "state", label: t("filterLow"), href: consumablesHref(locale, query, { state: undefined }) }]
    : []

  return (
    <ConsumablesWorkspace
      locale={locale}
      rows={filterConsumablesByListState(rows, listState)}
      allRows={rows}
      lowRows={filterConsumablesByListState(rows, "low")}
      chips={listChips}
      canCreate={canCreate}
      canEdit={canEdit}
      tabs={tabs}
    />
  )
}
