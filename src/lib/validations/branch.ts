import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

export const branchSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  companyId: z.string().trim().min(1),
  address: optionalText,
  contactPerson: optionalText,
  isActive: z.boolean().default(true),
})

export type BranchInput = z.infer<typeof branchSchema>
