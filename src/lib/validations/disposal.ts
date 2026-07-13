import { z } from "zod"
import { optionalText } from "./shared.ts"
import {
  disposalTypeValues,
  getDisposalDecisionFieldErrors,
  getDisposalExecutionFieldErrors,
} from "../disposal-type-policy.ts"

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

const disposalBulkRequestIds = z.array(z.string().uuid()).min(1).max(50)

export const disposalBulkDecisionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("preview"), requestIds: disposalBulkRequestIds }).strict(),
  z.object({
    mode: z.literal("commit"),
    requestIds: disposalBulkRequestIds,
    approvalRemark: z.string().trim().max(4000).transform((value) => value || null).nullable().optional(),
  }).strict(),
]).superRefine((input, context) => {
  if (new Set(input.requestIds).size !== input.requestIds.length) {
    context.addIssue({ code: "custom", path: ["requestIds"], message: "Disposal request IDs must be unique" })
  }
})

export type DisposalRequestInput = z.infer<typeof disposalRequestSchema>
export type DisposalDecisionInput = z.infer<typeof disposalDecisionSchema>
export type DisposalExecutionInput = z.infer<typeof disposalExecutionSchema>
export type DisposalBulkDecisionInput = z.infer<typeof disposalBulkDecisionSchema>
