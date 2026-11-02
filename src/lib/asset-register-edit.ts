// The history rows of one asset edit (group 4 spec §7.2-§7.4; plan 2, P2-R4, P2-R5). Pure and client-safe: the PUT route
// writes these rows and the edit form (Task 8) reads the same rules, so the file imports Prisma's types only.
import type { Prisma } from "@prisma/client"

// The asset columns a register_field_correction names, keyed as the history's snapshot keys (asset-history-rules.ts).
export const REGISTER_FIELD_CORRECTION_FIELDS = [
  "name",
  "serialNumber",
  "categoryId",
  "brandId",
  "modelId",
  "companyId",
  "branchId",
  "ownershipType",
  "purchaseDate",
  "purchasePrice",
  "warrantyStartDate",
  "warrantyEndDate",
  "poNumber",
  "invoiceNumber",
] as const

export type RegisterFieldCorrectionField = (typeof REGISTER_FIELD_CORRECTION_FIELDS)[number]

// The values of an asset before or after the save. Dates come as a Date or as text, a price as a number, text or a
// Prisma Decimal; each is compared and written in its normal form.
export type RegisterEditValues = Record<RegisterFieldCorrectionField, unknown> & {
  assetTag: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  statusId: string
  conditionId: string
  licenseTotalSeats: number | null
  licenseUsedSeats: number | null
  licenseAssignedAssetId: string | null
}

// from/to are NVarChar(500).
const SNAPSHOT_MAX_LENGTH = 500
const DATE_FIELDS = new Set<string>(["purchaseDate", "warrantyStartDate", "warrantyEndDate"])
// The rows a person did not type a reason for store a fixed sentence, which history never shows (ASSET_HISTORY_REASON_TYPES).
const FIXED_REASON = "Asset register update"

function normalText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function normalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? normalText(text) : date.toISOString().slice(0, 10)
}

function normalPrice(value: unknown): string | null {
  const text = normalText(value)
  if (text === null) return null
  const number = Number(text)
  return Number.isFinite(number) ? String(number) : text
}

/** A field's value as the history stores it: a date as YYYY-MM-DD, a price as its number's text, empty text as null. */
export function normalizeRegisterFieldValue(field: string, value: unknown): string | null {
  if (DATE_FIELDS.has(field)) return normalDate(value)
  if (field === "purchasePrice") return normalPrice(value)
  return normalText(value)
}

/** `{"<field>": value}` within 500 characters; a long value is cut first, so the JSON always parses. */
export function buildFieldCorrectionSnapshot(field: string, value: unknown): string {
  const normal = normalizeRegisterFieldValue(field, value)
  const whole = JSON.stringify({ [field]: normal })
  if (whole.length <= SNAPSHOT_MAX_LENGTH || normal === null) return whole
  const characters = Array.from(normal)
  let low = 0
  let high = characters.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (JSON.stringify({ [field]: characters.slice(0, middle).join("") }).length <= SNAPSHOT_MAX_LENGTH) low = middle
    else high = middle - 1
  }
  return JSON.stringify({ [field]: characters.slice(0, low).join("") })
}

/** A room, holder or department the person changed needs a reason; the automatic fix to the holder's department does not. */
export function registerEditNeedsReason(input: {
  locationChanged: boolean
  custodianChanged: boolean
  departmentChanged: boolean
  departmentAutomatic: boolean
}): boolean {
  return input.locationChanged || input.custodianChanged || (input.departmentChanged && !input.departmentAutomatic)
}

function seats(value: number | null | undefined): string | null {
  return value == null ? null : String(value)
}

/** One save's rows, all under one reference (P2-R5); a value that did not change writes nothing. */
export function planRegisterEditMovements(input: {
  existing: RegisterEditValues & { id: string }
  next: RegisterEditValues
  nextDepartmentId: string | null
  departmentAutomatic: boolean
  correctionReason: string | null
  referenceId: string
  performedBy: string
}): Prisma.AssetMovementCreateManyInput[] {
  const { existing, next, correctionReason } = input
  const rows: Prisma.AssetMovementCreateManyInput[] = []
  const add = (row: { movementType: string; fromValue: string | null; toValue: string | null; reason: string | null }) => {
    if (row.fromValue === row.toValue) return
    rows.push({
      assetId: existing.id,
      ...row,
      referenceType: "register_edit",
      referenceId: input.referenceId,
      performedBy: input.performedBy,
    })
  }

  add({ movementType: "register_location_correction", fromValue: normalText(existing.currentLocationId), toValue: normalText(next.currentLocationId), reason: correctionReason })
  add({ movementType: "register_custodian_correction", fromValue: normalText(existing.custodianId), toValue: normalText(next.custodianId), reason: correctionReason })
  // The automatic fix (the holder unchanged, the department set to the holder's) has no typed reason.
  add({
    movementType: "register_department_correction",
    fromValue: normalText(existing.departmentId),
    toValue: normalText(input.nextDepartmentId),
    reason: input.departmentAutomatic ? null : correctionReason,
  })

  for (const field of REGISTER_FIELD_CORRECTION_FIELDS) {
    if (normalizeRegisterFieldValue(field, existing[field]) === normalizeRegisterFieldValue(field, next[field])) continue
    rows.push({
      assetId: existing.id,
      movementType: "register_field_correction",
      fromValue: buildFieldCorrectionSnapshot(field, existing[field]),
      toValue: buildFieldCorrectionSnapshot(field, next[field]),
      reason: FIXED_REASON,
      referenceType: "register_edit",
      referenceId: input.referenceId,
      performedBy: input.performedBy,
    })
  }

  // The plain old and new tag: plan 6 compares the current tag with the last printed one.
  add({ movementType: "asset_tag_change", fromValue: normalText(existing.assetTag), toValue: normalText(next.assetTag), reason: FIXED_REASON })
  add({ movementType: "license_total_seats_change", fromValue: seats(existing.licenseTotalSeats), toValue: seats(next.licenseTotalSeats), reason: FIXED_REASON })
  add({ movementType: "license_used_seats_change", fromValue: seats(existing.licenseUsedSeats), toValue: seats(next.licenseUsedSeats), reason: FIXED_REASON })
  add({ movementType: "license_assigned_asset_change", fromValue: normalText(existing.licenseAssignedAssetId), toValue: normalText(next.licenseAssignedAssetId), reason: FIXED_REASON })
  add({ movementType: "status_change", fromValue: existing.statusId, toValue: next.statusId, reason: FIXED_REASON })
  add({ movementType: "condition_change", fromValue: existing.conditionId, toValue: next.conditionId, reason: FIXED_REASON })

  return rows
}
