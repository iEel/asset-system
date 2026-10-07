import { z } from "zod"
import { maintenancePlanFrequencies } from "../preventive-maintenance.ts"
import { repairOutcomes } from "../repair-record-policy.ts"
import { optionalText } from "./shared.ts"

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
  vendorId: optionalText,
  notes: optionalText,
})

export type MaintenancePlanInput = z.infer<typeof maintenancePlanSchema>

const maintenancePlanUpdateSchema = z.object({
  action: z.literal("update"),
  title: z.string().trim().min(1).max(200),
  frequency: z.enum(maintenancePlanFrequencies),
  intervalDays: optionalIntervalDays,
  nextDueDate: z.coerce.date(),
  vendorId: optionalText,
  notes: optionalText,
})

export const maintenancePlanActionSchema = z.discriminatedUnion("action", [
  maintenancePlanUpdateSchema,
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("end") }),
])

export type MaintenancePlanActionInput = z.infer<typeof maintenancePlanActionSchema>

const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().nullable(),
).optional().transform((value) => value ?? null)

const optionalNote = (max: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().max(max).nullable(),
).optional().transform((value) => value ?? null)

const optionalAmount = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.coerce.number().nonnegative().nullable(),
).optional().transform((value) => value ?? null)

export const repairRecordCreateSchema = z.object({
  assetId: z.string().trim().min(1),
  maintenancePlanId: optionalId,
  problem: z.string().trim().min(1).max(4000),
  reportedDate: z.coerce.date(),
  // JSON boolean only: z.coerce.boolean() would turn the string "false" into true.
  done: z.boolean(),
  outcome: z.enum(repairOutcomes).default("usable"),
  reportedById: optionalId,
  vendorId: optionalId,
  repairCost: optionalAmount,
  invoiceNo: optionalNote(100),
  remark: optionalNote(4000),
})

export type RepairRecordCreateInput = z.infer<typeof repairRecordCreateSchema>

export const repairRecordActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    expectedUpdatedAt: z.coerce.date(),
    returnDate: z.coerce.date(),
    outcome: z.enum(repairOutcomes),
    vendorId: optionalId,
    repairCost: optionalAmount,
    invoiceNo: optionalNote(100),
    remark: optionalNote(4000),
  }),
  z.object({
    action: z.literal("cancel"),
    expectedUpdatedAt: z.coerce.date(),
    reason: optionalNote(1000),
  }),
  z.object({
    action: z.literal("update"),
    expectedUpdatedAt: z.coerce.date(),
    reportedDate: z.coerce.date(),
    problem: z.string().trim().min(1).max(4000),
    vendorId: optionalId,
    repairCost: optionalAmount,
    invoiceNo: optionalNote(100),
    remark: optionalNote(4000),
  }),
])

export type RepairRecordActionInput = z.infer<typeof repairRecordActionSchema>
export type RepairRecordCompleteInput = Extract<RepairRecordActionInput, { action: "complete" }>
export type RepairRecordCancelInput = Extract<RepairRecordActionInput, { action: "cancel" }>
export type RepairRecordUpdateInput = Extract<RepairRecordActionInput, { action: "update" }>
