import assert from "node:assert/strict"
import test from "node:test"
import { emptyConfirmQueue, enqueueConfirm, settleConfirm, type ConfirmRequest } from "../src/lib/confirm-queue.ts"

function request(id: number): ConfirmRequest {
  return { id, title: `confirm ${id}`, resolve: () => {} }
}

test("first request shows immediately, later ones wait in order", () => {
  const first = enqueueConfirm(emptyConfirmQueue, request(1))
  const second = enqueueConfirm(first, request(2))
  const third = enqueueConfirm(second, request(3))
  assert.equal(third.current?.id, 1)
  assert.deepEqual(third.pending.map((item) => item.id), [2, 3])
})

test("settling the shown request promotes the next one", () => {
  const queue = enqueueConfirm(enqueueConfirm(emptyConfirmQueue, request(1)), request(2))
  const { queue: next, settled } = settleConfirm(queue, 1)
  assert.equal(settled?.id, 1)
  assert.equal(next.current?.id, 2)
  assert.deepEqual(next.pending, [])
})

test("a stale or repeated settle never touches the next request", () => {
  const queue = enqueueConfirm(enqueueConfirm(emptyConfirmQueue, request(1)), request(2))
  const { queue: afterFirst } = settleConfirm(queue, 1)
  const repeated = settleConfirm(afterFirst, 1)
  assert.equal(repeated.settled, null)
  assert.equal(repeated.queue, afterFirst)
  assert.equal(repeated.queue.current?.id, 2)
})

test("settling an empty queue is a no-op", () => {
  const result = settleConfirm(emptyConfirmQueue, 1)
  assert.equal(result.settled, null)
  assert.equal(result.queue, emptyConfirmQueue)
})
