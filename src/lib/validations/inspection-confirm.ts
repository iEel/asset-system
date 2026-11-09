// ยืนยันผลตรวจ (inspection-confirm spec §4): the confirm-results request. 1–500 asset ids, no duplicates; a reason of
// 3–500 characters after trim; the outcome defaults to "confirm", and "damaged" takes exactly one id. Pure and
// client-safe (relative imports only): the confirm page reads the same limits.
import { z } from "zod"
import { INSPECTION_CONFIRM_MAX_ASSETS, inspectionConfirmOutcomes } from "../inspection-confirm-rules.ts"

export const inspectionConfirmSchema = z.object({
  assetIds: z.array(z.string().trim().min(1).max(100)).min(1).max(INSPECTION_CONFIRM_MAX_ASSETS),
  reason: z.string().trim().min(3).max(500),
  outcome: z.enum(inspectionConfirmOutcomes).default("confirm"),
}).superRefine((input, context) => {
  const seen = new Set<string>()
  input.assetIds.forEach((assetId, index) => {
    if (seen.has(assetId)) context.addIssue({ code: "custom", path: ["assetIds", index], message: "INSPECTION_CONFIRM_DUPLICATE_ASSET" })
    seen.add(assetId)
  })
  if (input.outcome === "damaged" && input.assetIds.length !== 1) {
    context.addIssue({ code: "custom", path: ["assetIds"], message: "INSPECTION_CONFIRM_DAMAGED_ONE_ASSET" })
  }
})

export type InspectionConfirmInput = z.infer<typeof inspectionConfirmSchema>
