import type { RecordStatusFilter } from "./master-data-query.ts"

// Shared reads of the master-data lists rebuilt to the canvas boards (page group 8 spec §3: companies, branches,
// departments, categories, suppliers; the employee list uses the same counts). No imports beyond types: tests and pages
// both load this module.

export type RecordStatusCounts = { active: number; inactive: number; all: number }

// The counts on a list's record-status segmented control (ใช้งาน {n} / ไม่ใช้งาน {n} / ทั้งหมด {n}): the list's own where
// (every other filter kept) with that record status. The list's where builder is passed in, so each list keeps its own.
export function recordStatusCountWheres<TState extends { status: RecordStatusFilter }, TWhere>(
  state: TState,
  buildWhere: (state: TState) => TWhere
): { active: TWhere; inactive: TWhere } {
  return {
    active: buildWhere({ ...state, status: "active" }),
    inactive: buildWhere({ ...state, status: "inactive" }),
  }
}

// A Prisma delegate's count, structurally, so tests pass a fake.
export type RecordStatusCountModel<TWhere> = { count(args: { where: TWhere }): PromiseLike<number> }

// Two counts; ทั้งหมด is their sum, as isActive is never null.
export async function readRecordStatusCounts<TWhere>(
  model: RecordStatusCountModel<TWhere>,
  wheres: { active: TWhere; inactive: TWhere }
): Promise<RecordStatusCounts> {
  const [active, inactive] = await Promise.all([model.count({ where: wheres.active }), model.count({ where: wheres.inactive })])
  return { active, inactive, all: active + inactive }
}

// SQL Server takes at most 2,100 parameters, so an IN list of a page's ids goes in chunks of 2,000.
export const masterDataListIdChunkSize = 2000

export function chunkListIds<T>(ids: readonly T[], size = masterDataListIdChunkSize): T[][] {
  const chunks: T[][] = []
  for (let start = 0; start < ids.length; start += size) chunks.push(ids.slice(start, start + size))
  return chunks
}

// The system-log module names the routes write (logAudit in src/app/api/<list>/[id]/route.ts). Their DELETE only sets
// isActive = false and logs action "delete".
export const deactivatedAtLogModules = ["company", "branch", "department", "category", "supplier"] as const
export type DeactivatedAtLogModule = (typeof deactivatedAtLogModules)[number]

export type DeactivatedAtReader = { systemLog: { groupBy(args: object): PromiseLike<unknown[]> } }

// G8P1-R2: "ปิดใช้งานเมื่อ {date}" is the newest "delete" (deactivate) system-log entry of each record; a record without
// one is left out of the map (the page shows "–"). One grouped query per 2,000 ids. A deactivation saved through the edit
// form (PUT isActive false) logs "delete" beside its "update" too (group 8 plan 1 Task 2), so it is read the same way.
export async function readDeactivatedAt(
  db: DeactivatedAtReader,
  module: DeactivatedAtLogModule,
  ids: readonly string[]
): Promise<Map<string, Date>> {
  const result = new Map<string, Date>()
  if (ids.length === 0) return result
  const parts = await Promise.all(
    chunkListIds(ids).map((chunk) =>
      db.systemLog.groupBy({
        by: ["recordId"],
        where: { module, action: "delete", recordId: { in: chunk } },
        _max: { createdAt: true },
      })
    )
  )
  for (const row of parts.flat() as { recordId: string | null; _max: { createdAt: Date | null } }[]) {
    const at = row._max.createdAt
    if (!row.recordId || !at) continue
    const existing = result.get(row.recordId)
    if (!existing || existing < at) result.set(row.recordId, at)
  }
  return result
}

// The date of "· ปิดใช้งานเมื่อ {date}" on an inactive row: the Bangkok day, short month, Buddhist year in Thai
// ("2 พ.ค. 2569"), as the asset detail page writes its dates.
export function formatDeactivatedAt(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

type QueryValue = string | string[] | number | null | undefined

function firstValue(value: QueryValue) {
  if (Array.isArray(value)) return String(value[0] ?? "")
  return String(value ?? "")
}

// The boards sort by name by default (spec §3). With no sort, or one the list does not allow, the name sort applies, A→Z
// unless a direction is given. Every other allowed sort stays reachable; without a direction it keeps today's default
// (desc: newest or largest first).
export function parseNameDefaultSort<TSort extends string>(
  input: { sort?: QueryValue; direction?: QueryValue },
  allowedSorts: readonly TSort[],
  nameSort: TSort
): { sort: TSort; direction: "asc" | "desc" } {
  const sortValue = firstValue(input.sort)
  const sort = allowedSorts.includes(sortValue as TSort) ? (sortValue as TSort) : nameSort
  const directionValue = firstValue(input.direction)
  if (directionValue === "asc" || directionValue === "desc") return { sort, direction: directionValue }
  return { sort, direction: sort === nameSort ? "asc" : "desc" }
}
