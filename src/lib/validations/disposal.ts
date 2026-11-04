import { z } from "zod"
import { optionalText } from "./shared.ts"
import {
  disposalTypeValues,
  getDisposalDecisionFieldErrors,
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
  // No price at request time (user 2026-11-04): the form sends neither, so both may be absent.
  saleValue: optionalDecimal.optional(),
  salvageValue: optionalDecimal.optional(),
  sourceType: optionalText,
  sourceId: optionalText,
})

export const disposalDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  // Old clients still send the Pending Disposal id; without one the route resolves it.
  nextStatusId: optionalText,
  saleValue: optionalDecimal.optional(),
  salvageValue: optionalDecimal.optional(),
  approvalRemark: optionalText,
}).superRefine((input, context) => {
  for (const error of getDisposalDecisionFieldErrors(input)) {
    context.addIssue({ code: "custom", path: [error.field], message: error.message })
  }
})

export const MAX_DISPOSAL_BULK_DECISION_ITEMS = 200

const disposalBulkRequestIds = z.array(z.string().uuid()).min(1).max(MAX_DISPOSAL_BULK_DECISION_ITEMS)

export const disposalBulkDecisionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("preview"), requestIds: disposalBulkRequestIds }).strict(),
  z.object({
    mode: z.literal("commit"),
    requestIds: disposalBulkRequestIds,
    approvalRemark: z.string().trim().max(4000).transform((value) => value || null).nullable().optional(),
  }).strict(),
]).superRefine((input, context) => {
  if (new Set(input.requestIds.map((requestId) => requestId.toLowerCase())).size !== input.requestIds.length) {
    context.addIssue({ code: "custom", path: ["requestIds"], message: "Disposal request IDs must be unique" })
  }
})

export type DisposalRequestInput = z.infer<typeof disposalRequestSchema>
export type DisposalDecisionInput = z.infer<typeof disposalDecisionSchema>
export type DisposalBulkDecisionInput = z.infer<typeof disposalBulkDecisionSchema>
