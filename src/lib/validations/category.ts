import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const customFieldDefinitionSchema = z.object({
  id: z.string().optional(),
  fieldName: z.string().trim().min(1).max(100),
  fieldLabel: z.string().trim().min(1).max(200),
  fieldLabelTh: optionalText,
  fieldType: z.enum(["text", "number", "date", "select", "boolean"]),
  options: optionalText,
  isRequired: z.boolean().default(false),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
})

export const categorySchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  isActive: z.boolean().default(true),
  customFieldDefs: z.array(customFieldDefinitionSchema).default([]),
  photoChecklist: z.array(z.string().trim().min(1).max(100)).default([]),
})

export type CategoryInput = z.infer<typeof categorySchema>
