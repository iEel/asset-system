import { z } from "zod"
import { optionalText } from "@/lib/validations/shared"

const optionalDate = z.preprocess(
  (value) => (value == null || (typeof value === "string" && value.trim().length === 0) ? undefined : value),
  z.union([z.coerce.date(), z.null(), z.undefined()])
)

const optionalDecimal = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.coerce.number().nonnegative().nullable().optional()
)

export const repairTypes = ["internal", "vendor"] as const

export const maintenanceTicketSchema = z
  .object({
    assetId: z.string().trim().min(1),
    problem: z.string().trim().min(1).max(4000),
    reportedById: z.string().trim().min(1),
    reportedDate: z.coerce.date(),
    assignedToId: optionalText,
    repairType: z.enum(repairTypes),
    vendorId: optionalText,
    repairCost: optionalDecimal,
    warrantyClaim: z.coerce.boolean().optional().default(false),
    rootCause: optionalText,
    resolution: optionalText,
    returnDate: optionalDate,
  })
  .superRefine((input, context) => {
    if (input.repairType === "vendor" && !input.vendorId) {
      context.addIssue({ code: "custom", path: ["vendorId"], message: "Vendor is required for vendor repair" })
    }
  })

export type MaintenanceTicketInput = z.infer<typeof maintenanceTicketSchema>

export const maintenanceTicketCloseSchema = z.object({
  repairCost: optionalDecimal,
  warrantyClaim: z.coerce.boolean().optional().default(false),
  rootCause: z.string().trim().min(1).max(4000),
  resolution: z.string().trim().min(1).max(4000),
  returnDate: z.coerce.date(),
  nextStatusId: z.string().trim().min(1),
})

export type MaintenanceTicketCloseInput = z.infer<typeof maintenanceTicketCloseSchema>
