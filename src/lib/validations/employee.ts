import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

export const employmentStatuses = ["active", "resigned", "suspended"] as const

export const employeeSchema = z.object({
  code: z.string().trim().min(1).max(20),
  fullNameTh: z.string().trim().min(1).max(200),
  fullNameEn: optionalText,
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
    z.string().trim().email().max(200).nullable().optional()
  ),
  companyId: z.string().trim().min(1),
  branchId: z.string().trim().min(1),
  departmentId: z.string().trim().min(1),
  position: optionalText,
  employmentStatus: z.enum(employmentStatuses).default("active"),
  managerId: optionalText,
  isActive: z.boolean().default(true),
})

export type EmployeeInput = z.infer<typeof employeeSchema>
