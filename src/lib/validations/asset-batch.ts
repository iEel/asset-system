import { z } from "zod"
import { assetBaseSchema } from "./asset.ts"
import { optionalText } from "./shared.ts"

export const assetBatchRowSchema = z.object({
  clientId: z.string().trim().min(1),
  // Optional for legacy assets. Blank rows receive generated tags on the server.
  assetTag: optionalText,
  serialNumber: optionalText,
  custodianId: optionalText,
  departmentId: optionalText,
  remark: optionalText,
})

export const assetBatchCreateSchema = z.object({
  common: assetBaseSchema.omit({
    assetTag: true,
    serialNumber: true,
  }),
  rows: z
    .array(assetBatchRowSchema)
    .min(2, "Batch create requires at least 2 rows")
    .max(100, "Batch create supports up to 100 rows"),
  purchaseDocumentIds: z.array(z.string().trim().min(1)).default([]),
})

export type AssetBatchCreateInput = z.infer<typeof assetBatchCreateSchema>
export type AssetBatchRowInput = z.infer<typeof assetBatchRowSchema>
