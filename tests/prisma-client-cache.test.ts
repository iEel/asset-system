import assert from "node:assert/strict"
import test from "node:test"

import { hasPrismaModelDelegate, isPrismaClientCacheUsable } from "../src/lib/prisma-client-cache.ts"

test("rejects a stale Prisma client cache without required delegates", () => {
  assert.equal(isPrismaClientCacheUsable(undefined), false)
  assert.equal(isPrismaClientCacheUsable({ maintenanceTicket: { findMany() {} } }), false)
})

test("accepts a Prisma client cache when required delegates are present", () => {
  assert.equal(isPrismaClientCacheUsable({ maintenancePlan: { findMany() {} } }), true)
})

test("checks an individual Prisma model delegate", () => {
  assert.equal(hasPrismaModelDelegate({ asset: { findMany() {} } }, "asset"), true)
  assert.equal(hasPrismaModelDelegate({ asset: {} }, "asset"), false)
})
