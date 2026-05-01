import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

export const brandSchema = z.object({
  name: z.string().trim().min(1).max(200),
  isActive: z.boolean().default(true),
})

export const assetModelSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().trim().min(1),
  brandId: z.string().trim().min(1),
  specs: optionalText,
  isActive: z.boolean().default(true),
})

export type BrandInput = z.infer<typeof brandSchema>
export type AssetModelInput = z.infer<typeof assetModelSchema>
