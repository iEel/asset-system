// ของใช้สิ้นเปลือง (consumables spec): the item, receive, issue and adjust requests. Whole-number quantities; issue and
// receive take 1–9999, a count 0–99999; a receive date is a Bangkok yyyy-mm-dd day, not after today. Pure and
// client-safe (relative imports only): the consumables forms read the same limits.
import { z } from "zod"
import { CONSUMABLE_ADJUST_MAX, CONSUMABLE_ISSUE_MAX } from "../consumable-rules.ts"
import { getBangkokDateKey } from "../preventive-maintenance.ts"

const idSchema = z.string().trim().min(1).max(100)
const noteSchema = z.string().trim().max(500).optional()
const issueQuantitySchema = z.number().int().min(1).max(CONSUMABLE_ISSUE_MAX)

/** A real calendar day as yyyy-mm-dd (2026-02-30 is refused). */
function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export const consumableItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(20).default("ชิ้น"),
  minQuantity: z.number().int().min(0).max(CONSUMABLE_ADJUST_MAX).default(0),
})

export const consumableReceiveSchema = z.object({
  itemId: idSchema,
  quantity: issueQuantitySchema,
  receivedDate: z.string().trim()
    .refine(isCalendarDay, { message: "CONSUMABLE_RECEIVED_DATE_INVALID" })
    .refine((value) => value <= getBangkokDateKey(new Date()), { message: "CONSUMABLE_RECEIVED_DATE_IN_FUTURE" }),
  note: noteSchema,
})

export const consumableIssueSchema = z.object({
  itemId: idSchema,
  quantity: issueQuantitySchema,
  assetId: idSchema,
  note: noteSchema,
})

export const consumableAdjustSchema = z.object({
  itemId: idSchema,
  counted: z.number().int().min(0).max(CONSUMABLE_ADJUST_MAX),
  reason: z.string().trim().min(3).max(500),
})

export type ConsumableItemInput = z.infer<typeof consumableItemSchema>
export type ConsumableReceiveInput = z.infer<typeof consumableReceiveSchema>
export type ConsumableIssueInput = z.infer<typeof consumableIssueSchema>
export type ConsumableAdjustInput = z.infer<typeof consumableAdjustSchema>
