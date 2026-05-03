import { z } from "zod"

export const systemSettingsUpdateSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(100),
        value: z.string().trim().max(5000),
      })
    )
    .min(1),
})

export type SystemSettingsUpdateInput = z.infer<typeof systemSettingsUpdateSchema>
