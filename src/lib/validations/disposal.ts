import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const optionalDecimal = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.coerce.number().nonnegative().nullable().optional()
)

export const disposalTypes = ["sell", "donate", "destroy", "lost", "dispose"] as const

export const disposalRequestSchema = z.object({
  assetId: z.string().trim().min(1),
  disposalType: z.enum(disposalTypes),
  reason: z.string().trim().min(1).max(4000),
  requestedById: z.string().trim().min(1),
  approverId: optionalText,
  saleValue: optionalDecimal,
  salvageValue: optionalDecimal,
})

export const disposalDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  nextStatusId: z.string().trim().min(1),
  saleValue: optionalDecimal,
  salvageValue: optionalDecimal,
  approvalRemark: optionalText,
})

export type DisposalRequestInput = z.infer<typeof disposalRequestSchema>
export type DisposalDecisionInput = z.infer<typeof disposalDecisionSchema>
