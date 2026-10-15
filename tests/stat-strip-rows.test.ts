import assert from "node:assert/strict"
import test from "node:test"
import { splitStatRows } from "../src/lib/stat-strip-rows.ts"

// Plan 2D-2: the work center and the dashboard split their StatStrip cells with one shared helper.
test("splitStatRows makes rows of at most four cells, as even as they split", () => {
  const sizes = (count: number, most?: number) => splitStatRows(Array.from({ length: count }, (_, index) => index), most).map((row) => row.length)
  assert.deepEqual(sizes(8), [4, 4])
  assert.deepEqual(sizes(7), [4, 3])
  assert.deepEqual(sizes(6), [3, 3])
  assert.deepEqual(sizes(5), [3, 2])
  assert.deepEqual(sizes(4), [4])
  assert.deepEqual(sizes(2), [2])
  assert.deepEqual(sizes(0), [])
  assert.deepEqual(sizes(5, 3), [3, 2])
  assert.deepEqual(splitStatRows(["a", "b", "c", "d", "e"]), [["a", "b", "c"], ["d", "e"]])
})
