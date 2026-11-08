import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const passwordSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.string().min(8).max(100).nullable().optional()
)

export const adminUserSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: passwordSchema.optional(),
  displayName: z.string().trim().min(1).max(200),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
    z.string().trim().email().max(200).nullable().optional()
  ),
  employeeId: optionalText,
  roleIds: z.array(z.string().trim().min(1)).min(1),
  isActive: z.boolean().default(true),
  authMode: z.enum(["ad", "local"]).optional(),
  note: z.string().trim().max(500).nullable().optional(),
})

export type AdminUserInput = z.infer<typeof adminUserSchema>

// The edit (PUT): isActive is optional and an absent one keeps the stored status, so a stale form never reopens an
// account someone closed meanwhile; the status changes through PATCH /status (group 11 plan 2 final review).
export const adminUserUpdateSchema = adminUserSchema.extend({ isActive: z.boolean().optional() })

export const adminUserStatusSchema = z.object({
  isActive: z.boolean(),
  note: z.string().trim().max(500).nullable().optional(),
})
