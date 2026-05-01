import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

export const supplierSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  contactPerson: optionalText,
  phone: optionalText,
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
    z.string().trim().email().max(200).nullable().optional()
  ),
  address: optionalText,
  isActive: z.boolean().default(true),
})

export type SupplierInput = z.infer<typeof supplierSchema>
