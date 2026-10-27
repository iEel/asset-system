import { z } from "zod"
import { optionalText } from "./shared.ts"

export const auditRiskPresets = [
  "all",
  "data_quality",
  "high_value",
  "stale_movement",
  "repair_history",
  "license_expiring",
] as const

// The scope of a round: what it audits and how it samples. The create form's live count parses this alone, so a
// half-typed name, year or date never fails a count (group 2 spec §7, R10).
export const auditRoundPreviewSchema = z.object({
  scopeCompanyId: optionalText,
  scopeBranchId: optionalText,
  scopeDepartmentId: optionalText,
  scopeLocationId: optionalText,
  scopeCategoryId: optionalText,
  scopeCustodianId: optionalText,
  scopeStatusId: optionalText,
  scopeConditionId: optionalText,
  includeClosedAssets: z.coerce.boolean().default(false),
  riskPreset: z.enum(auditRiskPresets).default("all"),
  sampleRate: z.coerce.number().int().min(1).max(100).default(100),
})

// A new round has no status: it opens at once (group 2 spec §14, bug §13.6). The object is not strict, so a client
// that still sends status has it dropped, never refused.
export const auditRoundSchema = auditRoundPreviewSchema
  .extend({
    name: z.string().trim().min(1).max(200),
    auditYear: z.coerce.number().int().min(2000).max(2100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .superRefine((input, context) => {
    if (input.endDate < input.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after start date",
      })
    }
  })

export const auditScanSchema = z.object({
  assetId: z.string().trim().min(1),
  actualDepartmentId: optionalText,
  actualLocationId: optionalText,
  actualCustodianId: optionalText,
  actualConditionId: optionalText,
  scanSource: z.enum(["manual", "qr"]).default("manual"),
  applyCorrections: z.boolean().default(false),
  resultCorrection: z.boolean().default(false),
  evidenceAttachmentIds: z.array(z.string().trim().min(1)).max(20).default([]),
  confirmedWithParentAssetId: optionalText,
  componentConfirmationReason: optionalText,
  remark: optionalText,
})

export const auditScanLookupSchema = z.object({
  rawValue: z.string().trim().min(1),
  scanSource: z.enum(["manual", "qr"]).default("manual"),
})

export const auditRoundCancelSchema = z.object({
  reason: z.string().trim().min(1).max(4000),
})

export const auditFindingReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewRemark: optionalText,
  confirmConflict: z.boolean().optional().default(false),
})

const optionalDate = z.preprocess(
  (value) => (value == null || (typeof value === "string" && value.trim().length === 0) ? undefined : value),
  z.union([z.coerce.date(), z.null(), z.undefined()])
)

export const auditFindingActionPlanSchema = z.object({
  actionPlan: z.string().trim().min(1).max(4000),
  actionOwnerId: optionalText,
  actionDueDate: optionalDate,
  actionStatus: z.enum(["planned", "in_progress", "done"]).default("planned"),
})

export const auditFindingCloseSchema = z.object({
  closureRemark: optionalText,
})

export const auditMarkNotFoundSchema = z.object({
  remark: optionalText,
})

export type AuditRoundScopeInput = z.infer<typeof auditRoundPreviewSchema>
export type AuditRoundInput = z.infer<typeof auditRoundSchema>
export type AuditRoundCancelInput = z.infer<typeof auditRoundCancelSchema>
export type AuditScanInput = z.infer<typeof auditScanSchema>
export type AuditScanLookupInput = z.infer<typeof auditScanLookupSchema>
export type AuditFindingReviewInput = z.infer<typeof auditFindingReviewSchema>
export type AuditFindingActionPlanInput = z.infer<typeof auditFindingActionPlanSchema>
export type AuditFindingCloseInput = z.infer<typeof auditFindingCloseSchema>
export type AuditMarkNotFoundInput = z.infer<typeof auditMarkNotFoundSchema>
