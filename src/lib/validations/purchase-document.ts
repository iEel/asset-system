import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.date().nullable().optional()
)

const optionalMoney = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.coerce.number().nonnegative().nullable().optional()
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

export const purchaseDocumentSchema = z.object({
  documentType: z.enum(purchaseDocumentTypes),
  documentNo: z.string().trim().min(1).max(100),
  poNumber: optionalText,
  invoiceNumber: optionalText,
  documentDate: optionalDate,
  supplierId: optionalText,
  totalAmount: optionalMoney,
  currency: optionalText,
  remark: optionalText,
})

export const purchaseDocumentLinkSchema = z.object({
  purchaseDocumentIds: z.array(z.string().trim().min(1)).default([]),
})

export type PurchaseDocumentInput = z.infer<typeof purchaseDocumentSchema>
