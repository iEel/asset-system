import assert from "node:assert/strict"
import test from "node:test"

import { readPmDueCounts, type PmDueCountsDb } from "../src/lib/pm-due-counts.ts"
import { buildPmDueBucketWhere } from "../src/lib/preventive-maintenance.ts"

const now = new Date("2026-11-02T17:30:00Z")
const buckets = ["overdue", "week", "soon", "later"] as const

test("readPmDueCounts reads one aggregate per bucket and counts the plans out of scope", async () => {
  const aggregateArgs: unknown[] = []
  const countArgs: unknown[] = []
  const counts = { overdue: 3, week: 2, soon: 5, later: 0 }
  const earliest = {
    overdue: new Date("2026-10-20T00:00:00Z"),
    week: new Date("2026-11-04T00:00:00Z"),
    soon: new Date("2026-11-04T00:00:00Z"),
    later: null,
  }
  const db: PmDueCountsDb = {
    maintenancePlan: {
      async aggregate(args) {
        aggregateArgs.push(args)
        const where = JSON.stringify((args as { where: unknown }).where)
        const bucket = buckets.find((key) => JSON.stringify(buildPmDueBucketWhere(key, now)) === where)
        assert.ok(bucket, "each aggregate reads one bucket's where")
        return { _count: { _all: counts[bucket] }, _min: { nextDueDate: earliest[bucket] } }
      },
      async count(args) {
        countArgs.push(args)
        return 4
      },
    },
  }

  const result = await readPmDueCounts(db, now)

  assert.deepEqual(
    aggregateArgs,
    buckets.map((bucket) => ({
      where: buildPmDueBucketWhere(bucket, now),
      _count: { _all: true },
      _min: { nextDueDate: true },
    })),
  )
  assert.deepEqual(countArgs, [
    {
      where: {
        isActive: true,
        planState: "active",
        OR: [{ asset: { isActive: false } }, { asset: { status: { name: { in: ["Disposed", "Retired"] } } } }],
      },
    },
  ])
  assert.deepEqual(result, {
    overdue: { count: 3, earliest: earliest.overdue },
    week: { count: 2, earliest: earliest.week },
    soon: { count: 5, earliest: earliest.soon },
    later: { count: 0, earliest: null },
    total: 8,
    outOfScope: 4,
  })
})

test("readPmDueCounts ANDs an extra where into each bucket and the out-of-scope count (G5P4-R1)", async () => {
  const where = { title: { contains: "UPS" } }
  const aggregateWheres: unknown[] = []
  const countWheres: unknown[] = []
  const db: PmDueCountsDb = {
    maintenancePlan: {
      async aggregate(args) {
        aggregateWheres.push(args.where)
        return { _count: { _all: 1 }, _min: { nextDueDate: null } }
      },
      async count(args) {
        countWheres.push(args.where)
        return 0
      },
    },
  }

  await readPmDueCounts(db, now, where)

  assert.deepEqual(aggregateWheres, buckets.map((bucket) => ({ AND: [buildPmDueBucketWhere(bucket, now), where] })))
  assert.equal(countWheres.length, 1)
  assert.deepEqual((countWheres[0] as { AND: unknown[] }).AND[1], where)
})
