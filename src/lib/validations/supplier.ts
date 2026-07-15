import { z } from "zod"

function optionalLimitedText(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
    z.string().trim().max(maxLength).nullable()
  ).optional()
}

export const supplierSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  contactPerson: optionalLimitedText(200),
  phone: optionalLimitedText(50),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
    z.string().trim().email().max(200).nullable()
  ).optional(),
  address: optionalLimitedText(500),
  isActive: z.boolean().default(true),
})

export type SupplierInput = z.infer<typeof supplierSchema>
