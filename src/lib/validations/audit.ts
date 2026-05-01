import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const auditStatuses = ["draft", "open", "closed"] as const

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

export type AuditRoundInput = z.infer<typeof auditRoundSchema>
