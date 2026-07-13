import assert from "node:assert/strict"
import test from "node:test"

import { isPrismaUniqueConstraintError, withPrismaUniqueRetry } from "../src/lib/prisma-unique-retry.ts"

test("retries transient Prisma unique conflicts and returns the next result", async () => {
  let attempts = 0
  const result = await withPrismaUniqueRetry(async () => {
    attempts += 1
    if (attempts < 3) throw { code: "P2002" }
    return "created"
  })

  assert.equal(result, "created")
  assert.equal(attempts, 3)
})

test("does not retry unrelated Prisma failures", async () => {
  let attempts = 0
  await assert.rejects(() => withPrismaUniqueRetry(async () => {
    attempts += 1
    throw { code: "P2025" }
  }))
  assert.equal(attempts, 1)
  assert.equal(isPrismaUniqueConstraintError({ code: "P2002" }), true)
})
