import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

export const categorySchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  isActive: z.boolean().default(true),
})

export type CategoryInput = z.infer<typeof categorySchema>
