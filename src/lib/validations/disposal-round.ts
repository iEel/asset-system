import { z } from "zod"
import { optionalText } from "./shared.ts"
import { disposalTypeValues, getDisposalRoundFieldErrors } from "../disposal-type-policy.ts"

// A disposal round (group 6 spec §11.2): up to 200 approved requests recorded as one actual disposal, with one method,
// one date, one executor, one recipient, one document and one lump price.
export const MAX_DISPOSAL_ROUND_ITEMS = 200

const emptyToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value)

const requestIds = z.array(z.string().uuid()).min(1).max(MAX_DISPOSAL_ROUND_ITEMS)

// The lump price: baht, at least 0, 2 decimal places, within decimal(18, 2). In zod 4 a preprocessed key is optional
// only when the preprocess itself is wrapped in .optional().
const saleValue = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.coerce.number().nonnegative().multipleOf(0.01).lt(10_000_000_000_000_000).nullable().optional(),
).optional()

const sharedFields = {
  requestIds,
  recipientName: optionalText,
  saleValue,
  remark: optionalText,
  useHistoricalEvidenceException: z.boolean().optional().default(false),
  evidenceExceptionReason: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || null : value),
    z.string().max(2000).nullable().optional(),
  ).optional(),
}

// The preview lists the chosen machines before the form is filled (the round page posts the ids it holds), so only the
// ids are required; whatever else is sent (the executor, the exception) is checked against each machine.
const previewSchema = z.object({
  mode: z.literal("preview"),
  ...sharedFields,
  disposalType: z.preprocess(emptyToUndefined, z.enum(disposalTypeValues).optional()).optional(),
  executionDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()).optional(),
  executedById: optionalText,
  documentNo: optionalText,
})

const commitSchema = z.object({
  mode: z.literal("commit"),
  ...sharedFields,
  disposalType: z.enum(disposalTypeValues),
  executionDate: z.coerce.date(),
  executedById: z.string().trim().min(1),
  documentNo: optionalText,
})

export const disposalRoundInputSchema = z.discriminatedUnion("mode", [previewSchema, commitSchema]).superRefine((input, context) => {
  if (new Set(input.requestIds.map((requestId) => requestId.toLowerCase())).size !== input.requestIds.length) {
    context.addIssue({ code: "custom", path: ["requestIds"], message: "Disposal request IDs must be unique" })
  }
  if (input.mode !== "commit") return
  for (const error of getDisposalRoundFieldErrors(input)) {
    context.addIssue({ code: "custom", path: [error.field], message: error.message })
  }
  if (input.useHistoricalEvidenceException) {
    const length = input.evidenceExceptionReason?.trim().length ?? 0
    if (length < 20 || length > 2000) {
      context.addIssue({ code: "custom", path: ["evidenceExceptionReason"], message: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED" })
    }
  }
})

export type DisposalRoundInput = z.infer<typeof disposalRoundInputSchema>
export type DisposalRoundPreviewInput = z.infer<typeof previewSchema>
export type DisposalRoundCommitInput = z.infer<typeof commitSchema>
