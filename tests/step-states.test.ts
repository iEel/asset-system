import assert from "node:assert/strict"
import test from "node:test"
import { getLinearStepStates, getStepFocusIndex } from "../src/lib/step-states.ts"

// Phase 2C K17 (spec 2C section 7.2.1, I18). The Steps rail and its three call sites share these rules.
test("steps before the current one are complete and the ones after it are upcoming", () => {
  assert.deepEqual(getLinearStepStates(3, 0), ["current", "upcoming", "upcoming"])
  assert.deepEqual(getLinearStepStates(3, 1), ["complete", "current", "upcoming"])
  assert.deepEqual(getLinearStepStates(3, 2), ["complete", "complete", "current"])
  assert.deepEqual(getLinearStepStates(3, 1, "in_progress"), getLinearStepStates(3, 1), "in_progress is the default")
})

test("a rejected step takes the place of the current step, and the steps after it stay upcoming", () => {
  assert.deepEqual(getLinearStepStates(3, 1, "rejected"), ["complete", "rejected", "upcoming"])
  assert.deepEqual(getLinearStepStates(3, 0, "rejected"), ["rejected", "upcoming", "upcoming"])
})

test("a finished flow has every step complete and no current step", () => {
  assert.deepEqual(getLinearStepStates(5, 4, "complete"), ["complete", "complete", "complete", "complete", "complete"])
  assert.deepEqual(getLinearStepStates(3, 0, "complete"), ["complete", "complete", "complete"])
})

test("an index outside the steps is pulled back inside them", () => {
  assert.deepEqual(getLinearStepStates(3, -1), ["current", "upcoming", "upcoming"], "indexOf() returns -1 for an unknown step")
  assert.deepEqual(getLinearStepStates(3, 9), ["complete", "complete", "current"])
  assert.deepEqual(getLinearStepStates(3, Number.NaN), ["current", "upcoming", "upcoming"])
  assert.deepEqual(getLinearStepStates(3, 1.7), ["complete", "current", "upcoming"])
  assert.deepEqual(getLinearStepStates(0, 0), [])
})

test("the focus step is the current or rejected one, else the last step once all are complete", () => {
  assert.equal(getStepFocusIndex(["complete", "current", "upcoming"]), 1)
  assert.equal(getStepFocusIndex(["complete", "rejected", "upcoming"]), 1)
  assert.equal(getStepFocusIndex(["complete", "complete", "complete"]), 2)
  assert.equal(getStepFocusIndex(["upcoming", "upcoming"]), 0)
  assert.equal(getStepFocusIndex([]), 0)
})
