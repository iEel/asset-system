// The multi-return's request (รับคืนหลายรายการ, group 7 plan 4 Task 2): one holder, one return date, one returner and one
// receiver, one next location for all, and 1–50 machines (G7P4-R3), each with its own condition, next status and optional
// room override. Pure and client-safe (relative imports only): the form (Task 4) reads the limit and the codes.
import { z } from "zod"
import { optionalText } from "./shared.ts"

// G7P4-R3: at most 50 machines per multi-return.
export const MAX_BATCH_CHECKIN_ITEMS = 50

// The 409's per-machine refusal codes, in the order a machine's first failing reason is picked (the single return's
// pre-checks, then G7P4-R2). Each blocked entry carries one of these.
export const batchCheckinBlockedCodes = [
  "ASSET_NOT_ACTIVE",
  // G7P4-R2: an outstanding component, an open repair or ส่งซ่อม as the next status goes through the single form.
  "BATCH_CHECKIN_NEEDS_SINGLE",
  // The handover named in the row is no longer open, or one opened since the form was read, or a claim lost a race.
  "ASSET_CHANGED_DURING_OPERATION",
  "ASSET_ACTIVE_CHECKOUT_EXISTS",
  // The machine is not held by the multi-return's holder.
  "BATCH_CHECKIN_NOT_HELD",
  "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED",
  "ASSET_LICENSE_CHECKIN_NOT_ALLOWED",
  "ASSET_STATUS_CHECKIN_NOT_ALLOWED",
  "ASSET_HANDOVER_MODE_MISSING",
  "ASSET_HANDOVER_STATUS_MISMATCH",
  "BATCH_CHECKIN_CONDITION_INVALID",
  "BATCH_CHECKIN_STATUS_INVALID",
  "CHECKIN_RETURN_DATE_BEFORE_HANDOVER",
  "ASSET_CHECKIN_LOCATION_INACTIVE",
] as const
export type BatchCheckinBlockedCode = (typeof batchCheckinBlockedCodes)[number]
export type BatchCheckinBlockedAsset = { assetId: string; assetTag: string; code: BatchCheckinBlockedCode }

// A blank or absent checkoutId is a held asset with no handover (G7P4-R6: the save backfills its HO-).
const optionalCheckoutId = z.preprocess(
  (value) => (value === undefined || (typeof value === "string" && value.trim().length === 0) ? null : value),
  z.string().trim().min(1).max(100).nullable(),
)

export const batchCheckinItemSchema = z.object({
  assetId: z.string().trim().min(1).max(100),
  checkoutId: optionalCheckoutId,
  conditionAfter: z.string().trim().min(1),
  nextStatusId: z.string().trim().min(1),
  // Absent: the multi-return's next location (G7P4-R4).
  nextLocationId: optionalText,
  damageNote: optionalText,
  remark: optionalText,
})

export const batchCheckinSchema = z.object({
  // The holder whose machines come back; every machine must be held by this employee.
  employeeId: z.string().trim().min(1).max(100),
  returnDate: z.coerce.date(),
  returnByEmployeeId: optionalText,
  returnBy: z.string().trim().min(1).max(100),
  receiveByEmployeeId: optionalText,
  receiveBy: z.string().trim().min(1).max(100),
  nextLocationId: z.string().trim().min(1),
  items: z.array(batchCheckinItemSchema).min(1).max(MAX_BATCH_CHECKIN_ITEMS),
}).superRefine((input, context) => {
  const seen = new Set<string>()
  input.items.forEach((item, index) => {
    if (seen.has(item.assetId)) {
      context.addIssue({ code: "custom", path: ["items", index, "assetId"], message: "BATCH_CHECKIN_DUPLICATE_ASSET" })
    }
    seen.add(item.assetId)
  })
})

export type BatchCheckinItemInput = z.infer<typeof batchCheckinItemSchema>
export type BatchCheckinInput = z.infer<typeof batchCheckinSchema>
