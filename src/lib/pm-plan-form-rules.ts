// The PM form's rules (MT-PM-Form, group 5 spec §10; plan 4 Task 2, G5P4-R10, Review Focus 4): the client checks, the
// fields an edit changed, the four-round preview "กำหนดรอบถัดไป", the impact on the PM page's counts and the footer's
// words. Pure and client-safe: relative imports only, no React, no db. Dates are ISO days (YYYY-MM-DD), as the form
// posts nextDueDate; an ISO day reads as its UTC midnight, the instant the server stores, which is the same Bangkok day.
import type { PmPlanTab } from "./pm-plan-list.ts"
import {
  bangkokDayDiff,
  calculateNextMaintenanceDueDate,
  getMaintenancePlanIntervalDays,
  getPmDueBadge,
  pmDueSoonWindowDays,
  pmReminderWindowDays,
  type MaintenancePlanFrequency,
  type PmDueBadge,
} from "./preventive-maintenance.ts"
import { maxLength, range, required, wholeNumber } from "./validation-rules.ts"

export type PmPlanFormValues = {
  assetId: string
  title: string
  frequency: MaintenancePlanFrequency
  intervalDays: string
  nextDueDate: string
  vendorId: string
  notes: string
}

export type PmPlanField = keyof PmPlanFormValues

// noValidate turns the browser's check off, so this restates the controls' required, min, max, step and maxLength, and
// the asset the server needs on create; an edit keeps its asset (the picker is fixed and not sent) (v-track M-R2).
export function validatePmPlanForm(values: PmPlanFormValues, isEdit: boolean): Partial<Record<PmPlanField, string>> {
  const errors: Partial<Record<PmPlanField, string>> = {}
  const check = (key: PmPlanField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", isEdit ? null : required(values.assetId))
  check("title", required(values.title) ?? maxLength(values.title, 200))
  check("frequency", required(values.frequency))
  // The days count only for a custom frequency: whole days from 1 to 3650.
  check(
    "intervalDays",
    values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays) : null,
  )
  check("nextDueDate", required(values.nextDueDate))
  check("notes", maxLength(values.notes, 4000))
  return errors
}

export type PmPlanChangedField = "title" | "frequency" | "intervalDays" | "nextDueDate" | "vendorId" | "notes"

// The fields an edit changed, in the form's order ("แก้ N ช่อง"). The asset is fixed on edit. The days count only
// between two custom plans: a switch to or from custom is the frequency's change. Text is compared trimmed, as saved.
export function pmPlanChangedFields(initial: PmPlanFormValues, values: PmPlanFormValues): PmPlanChangedField[] {
  const same = (a: string, b: string) => a.trim() === b.trim()
  const changed: PmPlanChangedField[] = []
  if (!same(initial.title, values.title)) changed.push("title")
  if (initial.frequency !== values.frequency) changed.push("frequency")
  if (initial.frequency === "custom" && values.frequency === "custom" && !same(initial.intervalDays, values.intervalDays)) {
    changed.push("intervalDays")
  }
  if (!same(initial.nextDueDate, values.nextDueDate)) changed.push("nextDueDate")
  if (!same(initial.vendorId, values.vendorId)) changed.push("vendorId")
  if (!same(initial.notes, values.notes)) changed.push("notes")
  return changed
}

export type PmPreviewStep = "first" | "month1" | "month3" | "year1" | "days"
export type PmPreviewRound = { date: string; step: PmPreviewStep; days?: number; badge?: PmDueBadge }

export const pmPreviewRounds = 4

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

// An ISO day as its UTC midnight, or null when it is not a real day (2026-02-30 included).
function isoDayToDate(day: string): Date | null {
  const match = ISO_DAY.exec(day)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.toISOString().slice(0, 10) === day ? date : null
}

const isoDayOf = (date: Date) => date.toISOString().slice(0, 10)

function stepOf(frequency: MaintenancePlanFrequency): Exclude<PmPreviewStep, "first"> {
  if (frequency === "monthly") return "month1"
  if (frequency === "quarterly") return "month3"
  if (frequency === "yearly") return "year1"
  return "days"
}

// "กำหนดรอบถัดไป · ถ้าบันทึกว่าทำแล้วตรงวันทุกรอบ": the next due date and three rounds after it, each from
// calculateNextMaintenanceDueDate of the one before, exactly as the server moves the plan when a PM is recorded on its
// day (so 31 Jan monthly reads 28 Feb, 28 Mar, 28 Apr). The first carries its due badge. Empty without a valid day.
export function buildPmPreview(
  nextDueDate: string,
  frequency: MaintenancePlanFrequency,
  intervalDays: number | null,
  now: Date,
): PmPreviewRound[] {
  const first = isoDayToDate(nextDueDate)
  if (!first) return []
  const step = stepOf(frequency)
  const days = step === "days" ? getMaintenancePlanIntervalDays(frequency, intervalDays) : undefined
  const rounds: PmPreviewRound[] = [{ date: nextDueDate, step: "first", badge: getPmDueBadge(first, now) }]
  let previous = first
  while (rounds.length < pmPreviewRounds) {
    previous = calculateNextMaintenanceDueDate(previous, frequency, intervalDays)
    rounds.push(days === undefined ? { date: isoDayOf(previous), step } : { date: isoDayOf(previous), step, days })
  }
  return rounds
}

export type PmPlanImpact =
  | { kind: "paused" }
  | { kind: "counts"; overdue: [number, number]; soon: [number, number]; later: [number, number]; total: number; inWeek: boolean }

type PmCountBucket = "overdue" | "soon" | "later"

// A due day's PM page cell, as readPmDueCounts counts it: before today Bangkok, within 14 days, or later. The reminder
// box (buildDuePmPlanWhere) counts the overdue plans too.
function bucketOf(nextDueDate: string, now: Date): { bucket: PmCountBucket; inWeek: boolean } {
  const days = bangkokDayDiff(now, isoDayToDate(nextDueDate) ?? new Date(nextDueDate))
  const bucket: PmCountBucket = days < 0 ? "overdue" : days <= pmDueSoonWindowDays ? "soon" : "later"
  return { bucket, inWeek: days <= pmReminderWindowDays }
}

// "ผลต่อหน้าแผน PM (ใช้งาน N แผน)" (G5P4-R10): the server passes the three active counts; this moves the plan from its
// old cell to its new one (a new plan only adds). A plan that is not active (paused; an ended plan has no edit page) is
// not on the counts and reads "แผนพักอยู่ ไม่นับในหน้าแผน PM". A plan whose asset is written off or inactive (inScope
// false) is outside the counts before and after the save, so nothing moves and it is not in the reminder box.
export function buildPmPlanImpact(input: {
  counts: { overdue: number; soon: number; later: number }
  before: { nextDueDate: string; planState: PmPlanTab; inScope: boolean } | null
  after: { nextDueDate: string }
  now: Date
}): PmPlanImpact {
  const { counts, before, after, now } = input
  if (before && before.planState !== "active") return { kind: "paused" }
  const next = { ...counts }
  const inScope = before ? before.inScope : true
  const moved = bucketOf(after.nextDueDate, now)
  if (inScope) {
    if (before) next[bucketOf(before.nextDueDate, now).bucket] -= 1
    next[moved.bucket] += 1
  }
  return {
    kind: "counts",
    overdue: [counts.overdue, next.overdue],
    soon: [counts.soon, next.soon],
    later: [counts.later, next.later],
    total: next.overdue + next.soon + next.later,
    inWeek: inScope && moved.inWeek,
  }
}

// The footer's message keys, namespaced (read them with useTranslations() at the root). Edit: "แก้ไขแผน {title} {planNo}
// · แก้ {count} ช่อง", "ยกเลิกการแก้ไข", "บันทึกการแก้ไข"; create: "เพิ่มแผน PM {title} · {asset}", "ยกเลิก", "บันทึก".
// The maintenancePage keys come with the PM form's words (Task 4, p4-form.json).
export function pmPlanFooterKey(isEdit: boolean): { line: string; cancel: string; submit: string } {
  return isEdit
    ? { line: "maintenancePage.pmFormFooterEdit", cancel: "maintenancePage.pmFormCancelEdit", submit: "maintenancePage.pmFormSaveEdit" }
    : { line: "maintenancePage.pmFormFooterCreate", cancel: "common.cancel", submit: "common.save" }
}
