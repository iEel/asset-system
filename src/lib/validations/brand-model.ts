import { z } from "zod"
import { optionalText } from "./shared.ts"

// Where a brand or model was added from: the asset form's quick add or the master-data pages. It goes into the system log
// (newValue.source), never onto the record (group 7 plan 1).
export const brandModelSources = ["asset-form", "master-data"] as const
const source = z.enum(brandModelSources).default("master-data")

export const brandSchema = z.object({
  name: z.string().trim().min(1).max(200),
  isActive: z.boolean().default(true),
  source,
})

export const assetModelSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().trim().min(1),
  brandId: z.string().trim().min(1),
  specs: optionalText,
  isActive: z.boolean().default(true),
  source,
})

export type BrandInput = z.infer<typeof brandSchema>
export type AssetModelInput = z.infer<typeof assetModelSchema>
