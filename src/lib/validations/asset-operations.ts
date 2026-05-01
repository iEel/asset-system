import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.date().nullable().optional()
)

export const checkoutTypes = ["user", "department", "location", "asset"] as const

export const assetCheckoutSchema = z
  .object({
    checkoutType: z.enum(checkoutTypes),
    custodianId: optionalText,
    departmentId: optionalText,
    locationId: optionalText,
    parentAssetId: optionalText,
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
    if (input.checkoutType === "asset" && !input.parentAssetId) {
      context.addIssue({ code: "custom", path: ["parentAssetId"], message: "Parent asset is required" })
    }
  })

export const assetCheckinSchema = z.object({
  checkoutId: z.string().trim().min(1),
  returnDate: z.coerce.date(),
  returnBy: z.string().trim().min(1).max(100),
  receiveBy: z.string().trim().min(1).max(100),
  conditionAfter: z.string().trim().min(1),
  missingAccessories: optionalText,
  damageNote: optionalText,
  nextStatusId: z.string().trim().min(1),
  nextLocationId: z.string().trim().min(1),
  remark: optionalText,
})

export type AssetCheckoutInput = z.infer<typeof assetCheckoutSchema>
export type AssetCheckinInput = z.infer<typeof assetCheckinSchema>
