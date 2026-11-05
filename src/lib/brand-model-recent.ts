// Page group 7 plan 1 (spec §4.3, G7P1-R3): "เพิ่มล่าสุด" on the brands page. Brands and models added in the last 7 or
// 30 Bangkok days, by createdAt, newest first. Brands and models have no createdBy column, so who added a record and
// where (the brands page or the asset form) come from its newest "create" row of the system log (module "brand", for
// brands and models alike); a record the log no longer holds reads null for both, and the page shows "–".
import { startOfBangkokDay } from "./preventive-maintenance.ts"

export const recentAddedDays = [7, 30] as const
export type RecentAddedDays = (typeof recentAddedDays)[number]

export type BrandModelCreateSource = "asset-form" | "master-data"

export type RecentBrandModel = {
  kind: "brand" | "model"
  id: string
  name: string
  brandName: string | null
  createdAt: Date
  addedByName: string | null
  source: BrandModelCreateSource | null
}

type CreatedAtWhere = { where: { createdAt: { gte: Date } } }

export type RecentBrandModelDb = {
  assetBrand: {
    findMany: (args: CreatedAtWhere & { select: { id: true; name: true; createdAt: true } }) => Promise<Array<{ id: string; name: string; createdAt: Date }>>
  }
  assetModel: {
    findMany: (
      args: CreatedAtWhere & { select: { id: true; name: true; createdAt: true; brand: { select: { name: true } } } }
    ) => Promise<Array<{ id: string; name: string; createdAt: Date; brand: { name: string } }>>
  }
  systemLog: {
    findMany: (args: {
      where: { module: "brand"; action: "create"; recordId: { in: string[] } }
      select: { recordId: true; newValue: true; createdAt: true; user: { select: { displayName: true } } }
      orderBy: { createdAt: "desc" }
    }) => Promise<Array<{ recordId: string | null; newValue: string | null; createdAt: Date; user: { displayName: string } | null }>>
  }
}

const dayMs = 86_400_000
// SQL Server takes at most 2,100 parameters, so the id list goes to the log in chunks of 2,000.
const LOG_ID_CHUNK = 2000

export function parseRecentAddedDays(value: unknown): RecentAddedDays | null {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return recentAddedDays.includes(parsed as RecentAddedDays) ? (parsed as RecentAddedDays) : null
}

// The start of the window: today in Bangkok counts as the first day, so 7 days is today and the six days before it.
// Bangkok has no daylight saving, so a day is always 24 hours.
export function recentAddedWindowStart(days: RecentAddedDays, now: Date): Date {
  return new Date(startOfBangkokDay(now).getTime() - (days - 1) * dayMs)
}

export async function readRecentBrandModels(db: RecentBrandModelDb, days: RecentAddedDays, now: Date): Promise<RecentBrandModel[]> {
  const where = { createdAt: { gte: recentAddedWindowStart(days, now) } }
  const [brands, models] = await Promise.all([
    db.assetBrand.findMany({ where, select: { id: true, name: true, createdAt: true } }),
    db.assetModel.findMany({ where, select: { id: true, name: true, createdAt: true, brand: { select: { name: true } } } }),
  ])

  const ids = [...brands.map((brand) => brand.id), ...models.map((model) => model.id)]
  const newestLog = new Map<string, { addedByName: string | null; source: BrandModelCreateSource | null; createdAt: Date }>()
  for (let start = 0; start < ids.length; start += LOG_ID_CHUNK) {
    const logs = await db.systemLog.findMany({
      where: { module: "brand", action: "create", recordId: { in: ids.slice(start, start + LOG_ID_CHUNK) } },
      select: { recordId: true, newValue: true, createdAt: true, user: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
    })
    for (const log of logs) {
      if (!log.recordId) continue
      const known = newestLog.get(log.recordId)
      if (known && known.createdAt >= log.createdAt) continue
      newestLog.set(log.recordId, { addedByName: log.user?.displayName ?? null, source: readSource(log.newValue), createdAt: log.createdAt })
    }
  }

  const who = (id: string) => {
    const log = newestLog.get(id)
    return { addedByName: log?.addedByName ?? null, source: log?.source ?? null }
  }
  const rows: RecentBrandModel[] = [
    ...brands.map((brand) => ({ kind: "brand" as const, id: brand.id, name: brand.name, brandName: null, createdAt: brand.createdAt, ...who(brand.id) })),
    ...models.map((model) => ({ kind: "model" as const, id: model.id, name: model.name, brandName: model.brand.name, createdAt: model.createdAt, ...who(model.id) })),
  ]
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.name.localeCompare(b.name))
}

function readSource(newValue: string | null): BrandModelCreateSource | null {
  if (!newValue) return null
  try {
    const source = (JSON.parse(newValue) as { source?: unknown } | null)?.source
    return source === "asset-form" || source === "master-data" ? source : null
  } catch {
    return null
  }
}
