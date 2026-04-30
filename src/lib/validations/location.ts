import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

export const locationTypes = [
  "Site",
  "Building",
  "Floor",
  "Room",
  "Area",
  "Zone",
  "Rack",
  "Desk",
  "Storage",
  "Vehicle",
  "User-held",
  "Offsite",
] as const

export const locationSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  branchId: z.string().trim().min(1),
  parentId: optionalText,
  locationType: z.enum(locationTypes),
  description: optionalText,
  isActive: z.boolean().default(true),
})

export type LocationInput = z.infer<typeof locationSchema>
