import { z } from "zod"

export const assetTransactionCancellationSchema = z.object({
  reason: z.string().trim().min(5).max(2000),
  expectedUpdatedAt: z.coerce.date(),
})
