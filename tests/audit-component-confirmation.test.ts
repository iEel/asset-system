import assert from "node:assert/strict"
import test from "node:test"

import {
  buildComponentConfirmationFindingActions,
  isRetryableComponentConfirmationTransactionError,
} from "../src/lib/audit-component-confirmation.ts"

test("component confirmation updates existing pending mismatch instead of creating duplicates", () => {
  const actions = buildComponentConfirmationFindingActions(
    [
      { id: "finding-location", findingType: "wrong_location" },
      { id: "finding-location-dupe", findingType: "wrong_location" },
    ],
    [{ type: "wrong_location", expectedValue: "loc-old", actualValue: "loc-new" }]
  )

  assert.deepEqual(actions.create, [])
  assert.deepEqual(actions.update, [
    {
      findingId: "finding-location",
      mismatch: { type: "wrong_location", expectedValue: "loc-old", actualValue: "loc-new" },
    },
  ])
  assert.deepEqual(actions.reject, [{ findingId: "finding-location-dupe", findingType: "wrong_location" }])
})

test("component confirmation creates only missing current mismatch types", () => {
  const actions = buildComponentConfirmationFindingActions(
    [{ id: "finding-location", findingType: "wrong_location" }],
    [
      { type: "wrong_location", expectedValue: "loc-old", actualValue: "loc-new" },
      { type: "wrong_custodian", expectedValue: "emp-old", actualValue: "emp-new" },
    ]
  )

  assert.deepEqual(actions.update, [
    {
      findingId: "finding-location",
      mismatch: { type: "wrong_location", expectedValue: "loc-old", actualValue: "loc-new" },
    },
  ])
  assert.deepEqual(actions.create, [{ type: "wrong_custodian", expectedValue: "emp-old", actualValue: "emp-new" }])
  assert.deepEqual(actions.reject, [])
})

test("component confirmation rejects stale pending mismatch types", () => {
  const actions = buildComponentConfirmationFindingActions(
    [
      { id: "finding-location", findingType: "wrong_location" },
      { id: "finding-condition", findingType: "wrong_condition" },
    ],
    [{ type: "wrong_location", expectedValue: "loc-old", actualValue: "loc-new" }]
  )

  assert.deepEqual(actions.update, [
    {
      findingId: "finding-location",
      mismatch: { type: "wrong_location", expectedValue: "loc-old", actualValue: "loc-new" },
    },
  ])
  assert.deepEqual(actions.create, [])
  assert.deepEqual(actions.reject, [{ findingId: "finding-condition", findingType: "wrong_condition" }])
})

test("component confirmation retries only Prisma serialization conflicts", () => {
  assert.equal(isRetryableComponentConfirmationTransactionError({ code: "P2034" }), true)
  assert.equal(
    isRetryableComponentConfirmationTransactionError({ message: "Transaction failed due to a write conflict or a deadlock" }),
    true
  )
  assert.equal(isRetryableComponentConfirmationTransactionError({ code: "P2002" }), false)
  assert.equal(isRetryableComponentConfirmationTransactionError(new Error("validation failed")), false)
  assert.equal(isRetryableComponentConfirmationTransactionError(null), false)
})
