import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

export const departmentSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  companyId: optionalText,
  isActive: z.boolean().default(true),
})

export type DepartmentInput = z.infer<typeof departmentSchema>
