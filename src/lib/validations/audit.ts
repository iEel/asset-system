import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const auditStatuses = ["draft", "open", "closed"] as const
export const auditRiskPresets = [
  "all",
  "data_quality",
  "high_value",
  "stale_movement",
  "repair_history",
  "license_expiring",
] as const

export const auditRoundSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    auditYear: z.coerce.number().int().min(2000).max(2100),
    scopeCompanyId: optionalText,
    scopeBranchId: optionalText,
    scopeDepartmentId: optionalText,
    scopeLocationId: optionalText,
    scopeCategoryId: optionalText,
    scopeCustodianId: optionalText,
    scopeStatusId: optionalText,
    scopeConditionId: optionalText,
    riskPreset: z.enum(auditRiskPresets).default("all"),
    sampleRate: z.coerce.number().int().min(1).max(100).default(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(auditStatuses).default("draft"),
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
  remark: optionalText,
})

export const auditFindingReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewRemark: optionalText,
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

export type AuditRoundInput = z.infer<typeof auditRoundSchema>
export type AuditScanInput = z.infer<typeof auditScanSchema>
export type AuditFindingReviewInput = z.infer<typeof auditFindingReviewSchema>
export type AuditFindingActionPlanInput = z.infer<typeof auditFindingActionPlanSchema>
export type AuditFindingCloseInput = z.infer<typeof auditFindingCloseSchema>
export type AuditMarkNotFoundInput = z.infer<typeof auditMarkNotFoundSchema>
