import assert from "node:assert/strict"
import test from "node:test"

import { applyMessageChanges, serializeMessages } from "../scripts/lib/messages-edit-core.mjs"

test("set changes only the named locale, keeps key order and does not mutate the input", () => {
  const messages = { a: { one: "1", two: "2" }, b: { three: "3" } }
  const next = applyMessageChanges(messages, { set: { th: { "a.two": "สอง", "b.four": "4" } } }, "th")
  assert.deepEqual(Object.keys(next.a), ["one", "two"])
  assert.equal(next.a.two, "สอง")
  assert.equal(next.b.four, "4")
  assert.equal(messages.a.two, "2")
  assert.deepEqual(applyMessageChanges(messages, { set: { th: { "a.two": "x" } } }, "en"), messages)
})

test("delete removes keys and drops groups left empty", () => {
  const messages = { a: { one: "1" }, b: { nested: { x: "x" }, keep: "k" } }
  assert.deepEqual(applyMessageChanges(messages, { delete: ["a.one", "b.nested.x"] }, "en"), { b: { keep: "k" } })
})

test("deleting a key that does not exist fails loudly", () => {
  assert.throws(() => applyMessageChanges({ a: {} }, { delete: ["a.nope"] }, "th"), /No such key: a\.nope/)
})

test("serialize uses two-space indent and the given line ending", () => {
  assert.equal(serializeMessages({ a: { b: "c" } }, "\r\n"), '{\r\n  "a": {\r\n    "b": "c"\r\n  }\r\n}\r\n')
})
