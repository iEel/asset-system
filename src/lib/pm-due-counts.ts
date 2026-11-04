// The PM due counts the PM page and the maintenance list read (group 5 spec §5, §9). Server reader: the database is
// injected, so tests pass a fake and this file never imports the client.
import type { Prisma } from "@prisma/client"

import { buildPmDueBucketWhere, type PmDueBucket } from "./preventive-maintenance.ts"

export type PmDueCount = { count: number; earliest: Date | null }

export type PmDueCounts = {
  overdue: PmDueCount
  week: PmDueCount
  soon: PmDueCount
  later: PmDueCount
  total: number
  outOfScope: number
}

export type PmDueCountsDb = {
  maintenancePlan: {
    aggregate(args: {
      where: Prisma.MaintenancePlanWhereInput
      _count: { _all: true }
      _min: { nextDueDate: true }
    }): Promise<{ _count: { _all: number }; _min: { nextDueDate: Date | null } }>
    count(args: { where: Prisma.MaintenancePlanWhereInput }): Promise<number>
  }
}

const buckets: readonly PmDueBucket[] = ["overdue", "week", "soon", "later"]

// Active plans the due counts leave out: the asset is inactive, Disposed or Retired (spec §9 scope note).
const outOfScopeWhere: Prisma.MaintenancePlanWhereInput = {
  isActive: true,
  planState: "active",
  OR: [{ asset: { isActive: false } }, { asset: { status: { name: { in: ["Disposed", "Retired"] } } } }],
}

// `where` (the PM page's search, G5P4-R1) is ANDed into each bucket and the out-of-scope count.
export async function readPmDueCounts(
  db: PmDueCountsDb,
  now: Date,
  where?: Prisma.MaintenancePlanWhereInput,
): Promise<PmDueCounts> {
  const withWhere = (base: Prisma.MaintenancePlanWhereInput): Prisma.MaintenancePlanWhereInput =>
    where ? { AND: [base, where] } : base
  const [overdue, week, soon, later, outOfScope] = await Promise.all([
    ...buckets.map(async (bucket): Promise<PmDueCount> => {
      const result = await db.maintenancePlan.aggregate({
        where: withWhere(buildPmDueBucketWhere(bucket, now)),
        _count: { _all: true },
        _min: { nextDueDate: true },
      })
      return { count: result._count._all, earliest: result._min.nextDueDate }
    }),
    db.maintenancePlan.count({ where: withWhere(outOfScopeWhere) }),
  ]) as [PmDueCount, PmDueCount, PmDueCount, PmDueCount, number]
  // week sits inside soon, so the total adds overdue, soon and later only.
  return { overdue, week, soon, later, total: overdue.count + soon.count + later.count, outOfScope }
}
