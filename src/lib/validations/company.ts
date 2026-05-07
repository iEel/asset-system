import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

export const companySchema = z.object({
  code: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()),
  assetTagCode: z
    .string()
    .trim()
    .max(20)
    .transform((value) => (value.length > 0 ? value.toUpperCase() : null))
    .nullable()
    .optional(),
  nameTh: z.string().trim().min(1).max(200),
  nameEn: optionalText,
  taxId: optionalText,
  address: optionalText,
  isActive: z.boolean().default(true),
})

export type CompanyInput = z.infer<typeof companySchema>
