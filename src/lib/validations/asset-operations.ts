import { z } from "zod"
import { assetHandoverModes, assertHandoverModeFields } from "../asset-handover-mode.ts"
import { componentLateReturnOutcomes } from "../component-late-return.ts"
import { optionalText } from "./shared.ts"

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.date().nullable().optional()
)

export const checkoutTypes = ["user", "department", "location"] as const

export const assetCheckoutSchema = z
  .object({
    handoverMode: z.enum(assetHandoverModes, { error: "HANDOVER_MODE_REQUIRED" }),
    checkoutType: z.enum(checkoutTypes),
    custodianId: optionalText,
    departmentId: optionalText,
    locationId: optionalText,
    checkoutDate: z.coerce.date(),
    expectedReturnDate: optionalDate,
    conditionBefore: z.string().trim().min(1),
    remark: optionalText,
    receiverSignature: optionalText,
  })
  .superRefine((input, context) => {
    if (input.checkoutType === "user" && !input.custodianId) {
      context.addIssue({ code: "custom", path: ["custodianId"], message: "Custodian is required" })
    }
    if (input.checkoutType === "department" && !input.departmentId) {
      context.addIssue({ code: "custom", path: ["departmentId"], message: "Department is required" })
    }
    if (input.checkoutType === "location" && !input.locationId) {
      context.addIssue({ code: "custom", path: ["locationId"], message: "Location is required" })
    }

    try {
      assertHandoverModeFields(input)
    } catch (error) {
      const message = error instanceof Error ? error.message : "HANDOVER_MODE_REQUIRED"
      const path = message === "HANDOVER_PERMANENT_CUSTODIAN_REQUIRED"
        ? ["custodianId"]
        : [
            "HANDOVER_PERMANENT_DUE_DATE_NOT_ALLOWED",
            "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED",
            "HANDOVER_RETURN_BEFORE_CHECKOUT",
          ].includes(message)
          ? ["expectedReturnDate"]
          : ["handoverMode"]
      context.addIssue({ code: "custom", path, message })
    }
  })

export const assetCheckinSchema = z.object({
  checkoutId: z.string().trim().min(1),
  returnDate: z.coerce.date(),
  returnByEmployeeId: optionalText,
  returnBy: z.string().trim().min(1).max(100),
  receiveByEmployeeId: optionalText,
  receiveBy: z.string().trim().min(1).max(100),
  conditionAfter: z.string().trim().min(1),
  missingAccessories: optionalText,
  damageNote: optionalText,
  nextStatusId: z.string().trim().min(1),
  nextLocationId: z.string().trim().min(1),
  remark: optionalText,
  maintenanceReportedById: optionalText,
  maintenanceProblem: optionalText,
  missingComponentIds: z.array(z.string().trim().min(1).max(100)).max(100).default([]).transform((ids) => [...new Set(ids)]),
}).superRefine((input, context) => {
  // A component left out stays with ผู้คืน (spec §8.5), so ผู้คืน must be an employee (P2-R18); Task 3 checks the ids
  // against the parent.
  if (input.missingComponentIds.length > 0 && !input.returnByEmployeeId) {
    context.addIssue({ code: "custom", path: ["returnBy"], message: "CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED" })
  }
})

export const assetTransferSchema = z
  .object({
    toLocationId: optionalText,
    toCustodianId: optionalText,
    toDepartmentId: optionalText,
    reason: z.string().trim().min(1).max(500),
    remark: optionalText,
  })
  .superRefine((input, context) => {
    if (!input.toLocationId && !input.toCustodianId && !input.toDepartmentId) {
      context.addIssue({
        code: "custom",
        path: ["toLocationId"],
        message: "At least one transfer destination is required",
      })
    }
  })

export const assetBulkMoveSchema = z.object({
  assetIds: z.array(z.string().trim().min(1)).min(1),
  toLocationId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
  remark: optionalText,
})

export const assetBulkUpdateSchema = z
  .object({
    assetIds: z.array(z.string().trim().min(1)).min(1),
    toLocationId: optionalText,
    toCustodianId: optionalText,
    reason: z.string().trim().min(1).max(500),
    remark: optionalText,
  })
  .superRefine((input, context) => {
    if (!input.toLocationId && !input.toCustodianId) {
      context.addIssue({
        code: "custom",
        path: ["toLocationId"],
        message: "At least one bulk update field is required",
      })
    }
  })

export const assetComponentInstallSchema = z.object({
  componentAssetId: z.string().trim().min(1),
  componentRole: z.string().trim().min(1).max(100),
  slotNo: optionalText,
  installedAt: optionalDate,
  reason: optionalText,
  referenceType: optionalText,
  referenceId: optionalText,
})

export const assetComponentRemoveSchema = z.object({
  // zod 4's preprocess refuses an absent key, so a JSON ถอดออก without removedAt needs the outer optional.
  removedAt: optionalDate.optional(),
  reason: optionalText,
  referenceType: optionalText,
  referenceId: optionalText,
})

// The late return of an outstanding component (group 3 spec §8.6, P2-R3). A component standing alone needs its room.
export const assetComponentReturnSchema = z
  .object({
    componentLinkId: z.string().trim().min(1).max(100),
    checkinId: z.string().trim().min(1).max(100),
    expectedOutcome: z.enum(componentLateReturnOutcomes),
    returnDate: z.coerce.date(),
    receiveByEmployeeId: optionalText,
    receiveBy: z.string().trim().min(1).max(100),
    conditionId: optionalText,
    nextLocationId: optionalText,
    remark: optionalText,
  })
  .superRefine((input, context) => {
    if (input.expectedOutcome === "standalone" && !input.nextLocationId) {
      context.addIssue({ code: "custom", path: ["nextLocationId"], message: "Location is required" })
    }
  })

export type AssetCheckoutInput = z.infer<typeof assetCheckoutSchema>
export type AssetCheckinInput = z.infer<typeof assetCheckinSchema>
export type AssetTransferInput = z.infer<typeof assetTransferSchema>
export type AssetBulkMoveInput = z.infer<typeof assetBulkMoveSchema>
export type AssetBulkUpdateInput = z.infer<typeof assetBulkUpdateSchema>
export type AssetComponentInstallInput = z.infer<typeof assetComponentInstallSchema>
export type AssetComponentRemoveInput = z.infer<typeof assetComponentRemoveSchema>
export type AssetComponentReturnInput = z.infer<typeof assetComponentReturnSchema>
