import assert from "node:assert/strict"
import test from "node:test"
import { formatDisposalRoundNumber, nextDisposalRoundSequence } from "../src/lib/disposal-round-number.ts"

test("formatDisposalRoundNumber gives DPR-yyyyMMdd-NNNN from the Bangkok day key", () => {
  assert.equal(formatDisposalRoundNumber("2026-11-05", 7), "DPR-20261105-0007")
  assert.equal(formatDisposalRoundNumber("2026-11-05", 12), "DPR-20261105-0012")
})

test("nextDisposalRoundSequence is that Bangkok day's round count plus one", async () => {
  const calls: unknown[] = []
  const db = {
    disposalRound: {
      count: async (args: { where: { roundNo: { startsWith: string } } }) => {
        calls.push(args)
        return 2
      },
    },
  }
  assert.equal(await nextDisposalRoundSequence(db, "2026-11-05"), 3)
  assert.deepEqual(calls, [{ where: { roundNo: { startsWith: "DPR-20261105-" } } }])
})
