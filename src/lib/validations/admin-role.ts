import { z } from "zod"

export const adminRolePermissionSchema = z.object({
  permissionIds: z.array(z.string().trim().min(1)).default([]),
})

export type AdminRolePermissionInput = z.infer<typeof adminRolePermissionSchema>
