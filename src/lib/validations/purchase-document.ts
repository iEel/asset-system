import { z } from "zod"
import { purchaseDocumentLimits as limits } from "@/lib/asset-form-rules"
import { optionalText } from "@/lib/validations/shared"

// Every field is bounded to its column (final review): a value past it answers an error under its field, never a
// database error the client sees as a hidden 500. The limits are the form's own (asset-form-rules.ts).
const boundedText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional()

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.date().min(new Date(limits.dateMin)).max(new Date(limits.dateMax)).nullable().optional()
)

const optionalMoney = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.number().nonnegative().max(limits.amountMax).multipleOf(10 ** -limits.amountDecimals).nullable().optional()
)

export const purchaseDocumentTypes = [
  "purchase_order",
  "invoice",
  "delivery_note",
  "warranty",
  "quotation",
  "contract",
  "other",
] as const

export type PurchaseDocumentType = (typeof purchaseDocumentTypes)[number]

export const purchaseDocumentSchema = z.object({
  documentType: z.enum(purchaseDocumentTypes),
  documentNo: z.string().trim().min(1).max(limits.documentNo),
  poNumber: boundedText(limits.poNumber),
  invoiceNumber: boundedText(limits.invoiceNumber),
  documentDate: optionalDate,
  // Absent (undefined) follows the asset's or the batch's supplier; sent empty (null after the parse) is "ไม่ระบุผู้ขาย".
  supplierId: optionalText,
  totalAmount: optionalMoney,
  currency: boundedText(limits.currency),
  remark: boundedText(limits.remark),
})

export const purchaseDocumentLinkSchema = z.object({
  purchaseDocumentIds: z.array(z.string().trim().min(1)).max(50).default([]),
})

export type PurchaseDocumentInput = z.infer<typeof purchaseDocumentSchema>
