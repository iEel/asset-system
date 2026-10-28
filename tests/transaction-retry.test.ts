import assert from "node:assert/strict"
import test from "node:test"

import { isDeadlockError, withDeadlockRetry } from "../src/lib/transaction-retry.ts"

// The shapes a SQL Server deadlock (error 1205) takes through Prisma 7's mssql adapter: the adapter maps 1205 to
// kind "TransactionWriteConflict" (node_modules/@prisma/adapter-mssql/dist/index.js), the client turns that into
// P2034, and an error of a kind the client does not map is rethrown as a DriverAdapterError carrying the kind.
const p2034 = Object.assign(new Error("Transaction failed due to a write conflict or a deadlock. Please retry your transaction"), { name: "PrismaClientKnownRequestError", code: "P2034" })
const adapterConflict = Object.assign(new Error("TransactionWriteConflict"), { name: "DriverAdapterError", cause: { kind: "TransactionWriteConflict", originalCode: "EREQUEST" } })
const tediousDeadlock = Object.assign(new Error("Transaction (Process ID 61) was deadlocked on lock resources"), { number: 1205 })

const noSleep = async () => {}

test("a deadlock is P2034, the adapter's TransactionWriteConflict or a driver error numbered 1205", () => {
  assert.equal(isDeadlockError(p2034), true)
  assert.equal(isDeadlockError(adapterConflict), true)
  assert.equal(isDeadlockError(tediousDeadlock), true)
  assert.equal(isDeadlockError({ cause: { number: 1205 } }), true)
})

test("nothing else is a deadlock: a unique conflict, a refusal the route throws, a word in a message, no error", () => {
  assert.equal(isDeadlockError({ code: "P2002" }), false)
  assert.equal(isDeadlockError(new Error("Audit finding has already been reviewed")), false)
  assert.equal(isDeadlockError(new Error("deadlock")), false, "a message alone never counts")
  assert.equal(isDeadlockError(Object.assign(new Error("x"), { name: "DriverAdapterError", cause: { kind: "UniqueConstraintViolation" } })), false)
  assert.equal(isDeadlockError({ number: 2627 }), false)
  assert.equal(isDeadlockError(null), false)
  assert.equal(isDeadlockError("1205"), false)
})

test("a deadlock is run again and the later result returned", async () => {
  let runs = 0
  const result = await withDeadlockRetry(async () => {
    runs += 1
    if (runs < 3) throw runs === 1 ? p2034 : adapterConflict
    return "decided"
  }, { attempts: 3, sleep: noSleep })
  assert.equal(result, "decided")
  assert.equal(runs, 3)
})

test("the last deadlock is thrown once the attempts are spent", async () => {
  let runs = 0
  await assert.rejects(() => withDeadlockRetry(async () => {
    runs += 1
    throw p2034
  }, { attempts: 3, sleep: noSleep }), (error) => error === p2034)
  assert.equal(runs, 3)
})

test("any other error is thrown at once, never run again", async () => {
  for (const error of [new Error("Audit finding has already been reviewed"), { code: "P2002" }, new TypeError("x")]) {
    let runs = 0
    await assert.rejects(() => withDeadlockRetry(async () => {
      runs += 1
      throw error
    }, { attempts: 3, sleep: noSleep }), (thrown) => thrown === error)
    assert.equal(runs, 1)
  }
})

test("a short wait between attempts, longer each time; none before the first", async () => {
  const waits: number[] = []
  let runs = 0
  await withDeadlockRetry(async () => {
    runs += 1
    if (runs < 3) throw p2034
    return null
  }, { attempts: 3, sleep: async (ms) => { waits.push(ms) } })
  assert.equal(waits.length, 2)
  assert.ok(waits[0] > 0 && waits[0] < waits[1] && waits[1] <= 500, JSON.stringify(waits))
})
