import assert from "node:assert/strict"
import test from "node:test"

import {
  assertHandoverModeFields,
  getHandoverRequiredSourceStatusName,
  getHandoverTargetStatusName,
  isAssetHandoverMode,
} from "../src/lib/asset-handover-mode.ts"
import { assetCheckoutSchema } from "../src/lib/validations/asset-operations.ts"

test("derives the lifecycle status from the explicit handover mode", () => {
  assert.equal(getHandoverTargetStatusName("permanent_assignment"), "In Use")
  assert.equal(getHandoverTargetStatusName("temporary_loan"), "Checked Out")
  assert.equal(getHandoverRequiredSourceStatusName("permanent_assignment"), "In Use")
  assert.equal(getHandoverRequiredSourceStatusName("temporary_loan"), "Checked Out")
})

test("recognizes only supported handover modes", () => {
  assert.equal(isAssetHandoverMode("permanent_assignment"), true)
  assert.equal(isAssetHandoverMode("temporary_loan"), true)
  assert.equal(isAssetHandoverMode(""), false)
  assert.equal(isAssetHandoverMode("legacy"), false)
  assert.equal(isAssetHandoverMode(null), false)
})

test("permanent assignment requires a user custodian and forbids a due date", () => {
  assert.doesNotThrow(() => assertHandoverModeFields({
    handoverMode: "permanent_assignment",
    checkoutType: "user",
    custodianId: "employee-1",
    checkoutDate: new Date("2026-08-31T00:00:00.000Z"),
    expectedReturnDate: null,
  }))

  assert.throws(() => assertHandoverModeFields({
    handoverMode: "permanent_assignment",
    checkoutType: "department",
    custodianId: null,
    checkoutDate: new Date("2026-08-31T00:00:00.000Z"),
    expectedReturnDate: null,
  }), /HANDOVER_PERMANENT_USER_ONLY/)

  assert.throws(() => assertHandoverModeFields({
    handoverMode: "permanent_assignment",
    checkoutType: "user",
    custodianId: null,
    checkoutDate: new Date("2026-08-31T00:00:00.000Z"),
    expectedReturnDate: null,
  }), /HANDOVER_PERMANENT_CUSTODIAN_REQUIRED/)

  assert.throws(() => assertHandoverModeFields({
    handoverMode: "permanent_assignment",
    checkoutType: "user",
    custodianId: "employee-1",
    checkoutDate: new Date("2026-08-31T00:00:00.000Z"),
    expectedReturnDate: new Date("2026-09-30T00:00:00.000Z"),
  }), /HANDOVER_PERMANENT_DUE_DATE_NOT_ALLOWED/)
})

test("temporary loan requires a due date on or after the checkout date", () => {
  assert.doesNotThrow(() => assertHandoverModeFields({
    handoverMode: "temporary_loan",
    checkoutType: "location",
    custodianId: null,
    checkoutDate: new Date("2026-08-31T00:00:00.000Z"),
    expectedReturnDate: new Date("2026-08-31T00:00:00.000Z"),
  }))

  assert.throws(() => assertHandoverModeFields({
    handoverMode: "temporary_loan",
    checkoutType: "user",
    custodianId: "employee-1",
    checkoutDate: new Date("2026-08-31T00:00:00.000Z"),
    expectedReturnDate: null,
  }), /HANDOVER_TEMPORARY_DUE_DATE_REQUIRED/)

  assert.throws(() => assertHandoverModeFields({
    handoverMode: "temporary_loan",
    checkoutType: "user",
    custodianId: "employee-1",
    checkoutDate: new Date("2026-08-31T00:00:00.000Z"),
    expectedReturnDate: new Date("2026-08-30T00:00:00.000Z"),
  }), /HANDOVER_RETURN_BEFORE_CHECKOUT/)
})

test("checkout validation requires a coherent handover mode", () => {
  const baseInput = {
    checkoutType: "user" as const,
    custodianId: "employee-1",
    checkoutDate: "2026-08-31",
    expectedReturnDate: null,
    conditionBefore: "good",
  }

  assert.equal(assetCheckoutSchema.safeParse({
    ...baseInput,
    handoverMode: "permanent_assignment",
  }).success, true)
  assert.equal(assetCheckoutSchema.safeParse({
    ...baseInput,
    handoverMode: "temporary_loan",
    expectedReturnDate: "2026-09-01",
  }).success, true)

  assert.equal(assetCheckoutSchema.safeParse(baseInput).success, false)

  const permanentWithDueDate = assetCheckoutSchema.safeParse({
    ...baseInput,
    handoverMode: "permanent_assignment",
    expectedReturnDate: "2026-09-01",
  })
  assert.equal(permanentWithDueDate.success, false)
  if (!permanentWithDueDate.success) {
    assert.equal(permanentWithDueDate.error.issues[0]?.message, "HANDOVER_PERMANENT_DUE_DATE_NOT_ALLOWED")
  }

  const temporaryWithoutDueDate = assetCheckoutSchema.safeParse({
    ...baseInput,
    handoverMode: "temporary_loan",
  })
  assert.equal(temporaryWithoutDueDate.success, false)
  if (!temporaryWithoutDueDate.success) {
    assert.equal(temporaryWithoutDueDate.error.issues[0]?.message, "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED")
  }
})
