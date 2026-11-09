// ยืนยันผลตรวจ plan 5 (agreed 2026-10-28): the single-asset confirm-inspection request, for an asset Under Inspection in no
// audit round. The body chooses Ready or In Use only: with an open handover the server writes the rule's target (In Use
// or Checked Out) itself, so Checked Out is never sent. A holder may be null (Ready); the location is required; a reason
// of 3–500 characters after trim. Pure and client-safe: the dialog reads the same limits.
import { z } from "zod"

export const assetConfirmInspectionStatusNames = ["Ready", "In Use"] as const
export type AssetConfirmInspectionStatusName = (typeof assetConfirmInspectionStatusNames)[number]

export const assetConfirmInspectionSchema = z.object({
  statusName: z.enum(assetConfirmInspectionStatusNames),
  custodianId: z.string().trim().min(1).max(100).nullable(),
  locationId: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(3).max(500),
})

export type AssetConfirmInspectionInput = z.infer<typeof assetConfirmInspectionSchema>
