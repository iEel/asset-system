import { z } from "zod"

const integrationScopeSchema = z.enum(["asset:read", "reference:read", "integration:read"])

export const integrationClientCreateSchema = z.object({
  clientId: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[A-Za-z0-9._:-]+$/),
  displayName: z.string().trim().min(1).max(200),
  scopes: z.array(integrationScopeSchema).min(1),
})

export type IntegrationClientCreateInput = z.infer<typeof integrationClientCreateSchema>
