import { z } from "zod"
import { maintenancePlanFrequencies } from "@/lib/preventive-maintenance"
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
    dueDate: optionalDate,
    repairType: z.enum(repairTypes),
    vendorId: optionalText,
    laborCost: optionalDecimal,
    partsCost: optionalDecimal,
    repairCost: optionalDecimal,
    quotationNo: optionalText,
    invoiceNo: optionalText,
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

const optionalIntervalDays = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().int().min(1).max(3650).optional()
)

export const maintenancePlanSchema = z.object({
  assetId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  frequency: z.enum(maintenancePlanFrequencies),
  intervalDays: optionalIntervalDays,
  nextDueDate: z.coerce.date(),
  assignedToId: optionalText,
  vendorId: optionalText,
  notes: optionalText,
})

export type MaintenancePlanInput = z.infer<typeof maintenancePlanSchema>

export const maintenanceTicketCloseSchema = z.object({
  laborCost: optionalDecimal,
  partsCost: optionalDecimal,
  repairCost: optionalDecimal,
  quotationNo: optionalText,
  invoiceNo: optionalText,
  warrantyClaim: z.coerce.boolean().optional().default(false),
  rootCause: z.string().trim().min(1).max(4000),
  resolution: z.string().trim().min(1).max(4000),
  returnDate: z.coerce.date(),
  inspectedById: z.string().trim().min(1),
  nextStatusId: z.string().trim().min(1),
})

export type MaintenanceTicketCloseInput = z.infer<typeof maintenanceTicketCloseSchema>

export const maintenanceTicketStatusSchema = z.object({
  repairStatus: z.enum(["reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"]),
  assignedToId: optionalText,
  dueDate: optionalDate,
  remark: optionalText,
})

export type MaintenanceTicketStatusInput = z.infer<typeof maintenanceTicketStatusSchema>
