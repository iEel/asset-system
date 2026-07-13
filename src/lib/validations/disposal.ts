import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"
import {
  disposalTypeValues,
  getDisposalDecisionFieldErrors,
  getDisposalExecutionFieldErrors,
} from "@/lib/disposal-type-policy"

const optionalDecimal = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.coerce.number().nonnegative().nullable().optional()
)

export const disposalTypes = disposalTypeValues

export const disposalRequestSchema = z.object({
  assetId: z.string().trim().min(1),
  disposalType: z.enum(disposalTypes),
  reason: z.string().trim().min(12).max(4000),
  requestedById: z.string().trim().min(1),
  approverId: optionalText,
  saleValue: optionalDecimal,
  salvageValue: optionalDecimal,
  sourceType: optionalText,
  sourceId: optionalText,
})

export const disposalDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  nextStatusId: z.string().trim().min(1),
  saleValue: optionalDecimal,
  salvageValue: optionalDecimal,
  approvalRemark: optionalText,
}).superRefine((input, context) => {
  for (const error of getDisposalDecisionFieldErrors(input)) {
    context.addIssue({ code: "custom", path: [error.field], message: error.message })
  }
})

export const disposalExecutionSchema = z.object({
  disposalType: z.enum(disposalTypes),
  executionDate: z.coerce.date(),
  executedById: z.string().trim().min(1),
  nextStatusId: z.string().trim().min(1),
  recipientName: optionalText,
  documentNo: optionalText,
  actualSaleValue: optionalDecimal,
  actualSalvageValue: optionalDecimal,
  executionRemark: optionalText,
}).superRefine((input, context) => {
  for (const error of getDisposalExecutionFieldErrors(input)) {
    context.addIssue({ code: "custom", path: [error.field], message: error.message })
  }
})

export type DisposalRequestInput = z.infer<typeof disposalRequestSchema>
export type DisposalDecisionInput = z.infer<typeof disposalDecisionSchema>
export type DisposalExecutionInput = z.infer<typeof disposalExecutionSchema>
