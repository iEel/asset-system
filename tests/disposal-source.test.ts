import assert from "node:assert/strict"
import test from "node:test"

import { readDisposalSourceLinks, toDisposalSourceLink } from "../src/lib/disposal-source.ts"

test("a maintenance source links to its repair with the repair number", () => {
  assert.deepEqual(
    toDisposalSourceLink("th", { sourceType: "maintenance", sourceId: "mt-1" }, { repairNo: "MT-20261012-0045" }),
    { kind: "maintenance", number: "MT-20261012-0045", href: "/th/maintenance/mt-1" },
  )
})

test("an audit finding source links to the findings page with the round number", () => {
  assert.deepEqual(
    toDisposalSourceLink("th", { sourceType: "audit_finding", sourceId: "f-1" }, { auditNo: "AUD-2026-0003" }),
    { kind: "audit_finding", number: "AUD-2026-0003", href: "/th/audit/findings?finding=f-1" },
  )
})

test("no source gives null", () => {
  assert.equal(toDisposalSourceLink("th", { sourceType: null, sourceId: null }, {}), null)
})

test("an unknown source type keeps today's text", () => {
  assert.deepEqual(toDisposalSourceLink("th", { sourceType: "manual", sourceId: "abc" }, {}), {
    kind: "other",
    text: "manual / abc",
    href: null,
  })
})

test("a known source type whose record is not found keeps today's text", () => {
  assert.deepEqual(toDisposalSourceLink("th", { sourceType: "maintenance", sourceId: "mt-9" }, { repairNo: null }), {
    kind: "other",
    text: "maintenance / mt-9",
    href: null,
  })
  assert.deepEqual(toDisposalSourceLink("en", { sourceType: "audit_finding", sourceId: "f-9" }, {}), {
    kind: "other",
    text: "audit_finding / f-9",
    href: null,
  })
})

type FindManyArgs = { where: { id: { in: string[] } } }

test("readDisposalSourceLinks reads each source table once and maps every request", async () => {
  const calls: Array<{ table: string; args: FindManyArgs }> = []
  const db = {
    maintenanceTicket: {
      async findMany(args: FindManyArgs) {
        calls.push({ table: "maintenanceTicket", args })
        return [{ id: "mt-1", repairNo: "MT-20261012-0045" }]
      },
    },
    auditFinding: {
      async findMany(args: FindManyArgs) {
        calls.push({ table: "auditFinding", args })
        return [{ id: "f-1", auditRound: { auditNo: "AUD-2026-0003" } }]
      },
    },
  }

  const links = await readDisposalSourceLinks(db, "en", [
    { id: "r1", sourceType: "maintenance", sourceId: "mt-1" },
    { id: "r2", sourceType: "audit_finding", sourceId: "f-1" },
    { id: "r3", sourceType: null, sourceId: null },
    { id: "r4", sourceType: "maintenance", sourceId: "mt-gone" },
  ])

  assert.equal(calls.length, 2)
  assert.deepEqual(calls.find((call) => call.table === "maintenanceTicket")?.args.where.id.in, ["mt-1", "mt-gone"])
  assert.deepEqual(calls.find((call) => call.table === "auditFinding")?.args.where.id.in, ["f-1"])
  assert.deepEqual(links.get("r1"), { kind: "maintenance", number: "MT-20261012-0045", href: "/en/maintenance/mt-1" })
  assert.deepEqual(links.get("r2"), { kind: "audit_finding", number: "AUD-2026-0003", href: "/en/audit/findings?finding=f-1" })
  assert.equal(links.get("r3"), null)
  assert.deepEqual(links.get("r4"), { kind: "other", text: "maintenance / mt-gone", href: null })
})

test("readDisposalSourceLinks skips a table with no ids", async () => {
  let reads = 0
  const db = {
    maintenanceTicket: {
      async findMany() {
        reads += 1
        return []
      },
    },
    auditFinding: {
      async findMany() {
        reads += 1
        return []
      },
    },
  }
  const links = await readDisposalSourceLinks(db, "th", [{ id: "r1", sourceType: "manual", sourceId: "abc" }])
  assert.equal(reads, 0)
  assert.deepEqual(links.get("r1"), { kind: "other", text: "manual / abc", href: null })
})
