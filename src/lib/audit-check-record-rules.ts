// The record sheet's per-field state (group 2 spec §12, plan 3 P3-R8 to P3-R11). ตรง / ไม่ตรง is UI state beside the values;
// what a save means stays the chosen value, which diffCheckValues compares as the scan route does. Pure: relative `.ts`
// imports only, so node --test imports it.
import { normalizeAssetOwnershipType, requiresCustodian } from "./asset-ownership.ts"
import {
  suggestDepartmentForCustodian,
  type AuditCheckField,
  type AuditCheckValues,
  type AuditScanEmployeeOption,
  type AuditScanOption,
} from "./audit-scan-session.ts"

export const AUDIT_CHECK_FIELD_ORDER: readonly AuditCheckField[] = ["location", "custodian", "department", "condition"]
// "ไม่มี / ไม่ระบุ" as a choosable option (P3-R9). It stands for "" (no value), which the picker shows as its placeholder.
export const AUDIT_CHECK_NONE_OPTION_ID = "__none__"

export type AuditCheckFieldMode = "match" | "mismatch"
export type AuditCheckFieldState = { mode: AuditCheckFieldMode; chosen: boolean }
export type AuditCheckRecord = {
  values: AuditCheckValues
  fields: Record<AuditCheckField, AuditCheckFieldState>
  // The person set the department (ตรง, ไม่ตรง or a choice), or it already differed when the sheet opened.
  departmentTouched: boolean
  // The department came from the found custodian and differs from the expected one ("ตามแผนกของผู้ถือครองที่พบ").
  departmentFollowsCustodian: boolean
}
export type AuditCheckRecordContext = {
  expected: AuditCheckValues
  ownershipType: string | null
  employees: readonly AuditScanEmployeeOption[]
}

const MATCH: AuditCheckFieldState = { mode: "match", chosen: false }
const CHOSEN: AuditCheckFieldState = { mode: "mismatch", chosen: true }
const UNCHOSEN: AuditCheckFieldState = { mode: "mismatch", chosen: false }

/** The fields the scan route compares for this asset (bug 22, P3-R11): no location for a licence, the custodian only for a personal asset. */
export function auditCheckShownFields(ownershipType: string | null): AuditCheckField[] {
  const type = normalizeAssetOwnershipType(ownershipType)
  return AUDIT_CHECK_FIELD_ORDER.filter((field) => {
    if (field === "location") return type !== "software_license"
    if (field === "custodian") return requiresCustodian(type)
    return true
  })
}

/** The sheet as it opens: a hidden field takes the expected value; a shown field that differs (the walked room, a saved result) opens ไม่ตรง and chosen. */
export function startAuditCheckRecord(values: AuditCheckValues, context: Pick<AuditCheckRecordContext, "expected" | "ownershipType">): AuditCheckRecord {
  const shown = auditCheckShownFields(context.ownershipType)
  const next = { ...values }
  for (const field of AUDIT_CHECK_FIELD_ORDER) if (!shown.includes(field)) next[field] = context.expected[field]
  const state = (field: AuditCheckField) => (next[field] === context.expected[field] ? MATCH : CHOSEN)
  const fields = { location: state("location"), custodian: state("custodian"), department: state("department"), condition: state("condition") }
  return { values: next, fields, departmentTouched: fields.department.mode === "mismatch", departmentFollowsCustodian: false }
}

/** ตรง: the expected value again; on the custodian it also takes back a department that followed the found custodian. */
export function pressAuditCheckMatch(record: AuditCheckRecord, field: AuditCheckField, context: AuditCheckRecordContext): AuditCheckRecord {
  const values = { ...record.values, [field]: context.expected[field] }
  const fields = { ...record.fields, [field]: MATCH }
  if (field === "department") return { values, fields, departmentTouched: true, departmentFollowsCustodian: false }
  if (field === "custodian" && record.departmentFollowsCustodian) {
    return {
      values: { ...values, department: context.expected.department },
      fields: { ...fields, department: MATCH },
      departmentTouched: record.departmentTouched,
      departmentFollowsCustodian: false,
    }
  }
  return { ...record, values, fields }
}

/** ไม่ตรง: "ที่พบ" opens with nothing chosen, and the value stays the expected one until a choice (P3-R8). */
export function pressAuditCheckMismatch(record: AuditCheckRecord, field: AuditCheckField): AuditCheckRecord {
  if (record.fields[field].mode === "mismatch") return record
  const fields = { ...record.fields, [field]: UNCHOSEN }
  if (field === "department") return { ...record, fields, departmentTouched: true, departmentFollowsCustodian: false }
  return { ...record, fields }
}

/**
 * A choice in "ที่พบ" ("" is ไม่มี / ไม่ระบุ). The expected value turns the row back to ตรง. A new custodian of a personal
 * asset brings that person's department (N-AU1) unless the person set the department; a custodian with none takes back
 * a department that followed the last one (P3-R11).
 */
export function chooseAuditCheckValue(record: AuditCheckRecord, field: AuditCheckField, value: string, context: AuditCheckRecordContext): AuditCheckRecord {
  if (value === context.expected[field]) return pressAuditCheckMatch(record, field, context)
  const next: AuditCheckRecord = { ...record, values: { ...record.values, [field]: value }, fields: { ...record.fields, [field]: CHOSEN } }
  if (field === "department") return { ...next, departmentTouched: true, departmentFollowsCustodian: false }
  if (field !== "custodian" || !requiresCustodian(context.ownershipType) || record.departmentTouched) return next
  const suggested = suggestDepartmentForCustodian(context.employees, value)
  if (suggested === null) {
    return record.departmentFollowsCustodian
      ? { ...next, values: { ...next.values, department: context.expected.department }, fields: { ...next.fields, department: MATCH }, departmentFollowsCustodian: false }
      : next
  }
  const follows = suggested !== context.expected.department
  return { ...next, values: { ...next.values, department: suggested }, fields: { ...next.fields, department: follows ? CHOSEN : MATCH }, departmentFollowsCustodian: follows }
}

/** Rows marked ไม่ตรง with nothing chosen yet: save asks for each ("เลือกค่าที่พบ"). */
export function auditCheckUnchosenFields(record: AuditCheckRecord, ownershipType: string | null): AuditCheckField[] {
  return auditCheckShownFields(ownershipType).filter((field) => record.fields[field].mode === "mismatch" && !record.fields[field].chosen)
}

/** Rows marked ไม่ตรง, chosen or not, in field order: the save label names them. */
export function auditCheckMarkedFields(record: AuditCheckRecord, ownershipType: string | null): AuditCheckField[] {
  return auditCheckShownFields(ownershipType).filter((field) => record.fields[field].mode === "mismatch")
}

/** The "ที่พบ" picker's value: "" while nothing is chosen (its placeholder), the none option for "". */
export function auditCheckFoundValue(record: AuditCheckRecord, field: AuditCheckField): string {
  if (!record.fields[field].chosen) return ""
  return record.values[field] === "" ? AUDIT_CHECK_NONE_OPTION_ID : record.values[field]
}

export function auditCheckValueFromFound(id: string): string {
  return id === AUDIT_CHECK_NONE_OPTION_ID ? "" : id
}

/** "ที่พบ" lists: ไม่มี / ไม่ระบุ first (custodian, department and condition), except for the location, which the server requires (P3-R9, P3-R20). */
export function auditCheckFoundOptions(field: AuditCheckField, options: readonly AuditScanOption[], noneLabel: string): AuditScanOption[] {
  return field === "location" ? [...options] : [{ id: AUDIT_CHECK_NONE_OPTION_ID, label: noneLabel }, ...options]
}

/** A custodian reads "code - name · department" (P3-R10); one with no known department keeps its own label. */
export function auditCheckCustodianOptions(employees: readonly AuditScanEmployeeOption[], departments: readonly AuditScanOption[]): AuditScanOption[] {
  const departmentLabels = new Map(departments.map((department) => [department.id, department.label]))
  return employees.map((employee) => {
    const department = employee.departmentId ? departmentLabels.get(employee.departmentId) : undefined
    return { id: employee.id, label: department ? `${employee.label} · ${department}` : employee.label }
  })
}
