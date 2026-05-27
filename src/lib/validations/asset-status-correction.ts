import { z } from "zod"

export const assetStatusCorrectionSchema = z.object({
  nextStatusId: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
})

export type AssetStatusCorrectionInput = z.infer<typeof assetStatusCorrectionSchema>
