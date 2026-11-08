import { z } from "zod"

export const adminRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/),
  displayName: z.string().trim().min(1).max(200),
  displayNameTh: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().trim().max(200).nullable().optional()
  ),
  description: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().trim().max(500).nullable().optional()
  ),
  isActive: z.boolean().default(true),
  permissionIds: z.array(z.string().trim().min(1)).default([]),
  note: z.string().trim().max(500).nullable().optional(),
})

export type AdminRoleInput = z.infer<typeof adminRoleSchema>

// POST /api/admin/roles/[id]/users: add several users to one role (group 11 plan 3).
export const roleUsersAddSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1).max(50),
  note: z.string().trim().max(500).nullable().optional(),
})

export type RoleUsersAddInput = z.infer<typeof roleUsersAddSchema>
