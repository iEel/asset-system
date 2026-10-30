// ส่งมอบ's form rules (group 3 spec §7.1-§7.3, plan 1 Task 6): the สรุปก่อนบันทึก rows and checklist, the chosen asset's
// detail answer, its condition default and the receiver. Pure and client-safe; the department row reads the same rule
// the checkout route calls (asset-department-rule.ts), so the card never promises what the save does not write.
import { getCheckoutNextDepartmentId } from "./asset-department-rule.ts"
import type { AssetHandoverMode } from "./asset-handover-mode.ts"
import type { AssetOperationEmployeeOption, AssetOperationOption } from "./asset-operation-options.ts"
import type { AssetOperationChosenComponent, AssetOperationSearchRow } from "./asset-operation-search-rules.ts"

export type CheckoutDestinationType = "user" | "department" | "location"
/** The phone's three steps (spec §7.4, P1-R4): the only export of this type. */
export type CheckoutPhoneStep = 1 | 2 | 3
export type CheckoutChoice = {
  asset: AssetOperationSearchRow | null
  checkoutType: CheckoutDestinationType
  handoverMode: "" | AssetHandoverMode
  employee: AssetOperationEmployeeOption | null
  department: AssetOperationOption | null
  location: AssetOperationOption | null
}
export type CheckoutSummaryWords = {
  holder: string
  department: string
  location: string
  status: string
  components: string
  none: string
  notChosen: string
  inUse: string
  checkedOut: string
  kept: (value: string) => string
  count: (count: number) => string
  componentsGo: (count: number) => string
}
export type CheckoutSummaryRow = { key: "holder" | "department" | "location" | "status" | "components"; label: string; now: string; next: string; changed: boolean }
export type CheckoutCheckWords = { asset: string; receiver: string; mode: string; signature: string; signatureMissing: string }
export type CheckoutCheck = { key: "asset" | "receiver" | "mode" | "signature"; label: string; done: boolean; note?: string }

// The ownerships whose department never follows the receiver (asset-department-rule.ts): the summary never waits on them.
const FIXED_DEPARTMENT_OWNERSHIPS: ReadonlySet<string> = new Set(["shared", "component", "software_license"])

/** The asset's own condition when the master still offers it (spec §7.2), else none chosen. */
export function checkoutConditionDefault(row: Pick<AssetOperationSearchRow, "conditionId"> | null, conditions: readonly { id: string }[]): string {
  return row && conditions.some((condition) => condition.id === row.conditionId) ? row.conditionId : ""
}

/** The detail=1 answer replaces the chosen row only while it is still the chosen asset; a failed read keeps the row. */
export function withCheckoutAssetDetail(current: AssetOperationSearchRow | null, answered: AssetOperationSearchRow | null): AssetOperationSearchRow | null {
  return current && answered && answered.id === current.id ? answered : current
}

/** The installed components: those that go with the parent and those that stay (their own open handover). */
export function checkoutComponents(row: AssetOperationSearchRow | null): { travelling: AssetOperationChosenComponent[]; staying: AssetOperationChosenComponent[] } {
  const components = row?.detail?.components ?? []
  return { travelling: components.filter((component) => component.travels), staying: components.filter((component) => !component.travels) }
}

/** The chosen destination's label, by the checkout type; null until one is chosen. */
export function checkoutReceiverLabel(choice: CheckoutChoice): string | null {
  if (choice.checkoutType === "user") return choice.employee?.label ?? null
  if (choice.checkoutType === "department") return choice.department?.label ?? null
  return choice.location?.label ?? null
}

/** สรุปก่อนบันทึก (spec §7.3): ตอนนี้ and หลังบันทึก per field the save writes; none without the asset's detail. */
export function buildCheckoutSummaryRows(choice: CheckoutChoice, words: CheckoutSummaryWords): CheckoutSummaryRow[] {
  const asset = choice.asset
  const detail = asset?.detail
  if (!asset || !detail) return []
  const rows: CheckoutSummaryRow[] = []

  const holderNow = detail.holderLabel ?? words.none
  if (choice.checkoutType === "user") {
    rows.push({
      key: "holder",
      label: words.holder,
      now: holderNow,
      next: choice.employee?.label ?? words.notChosen,
      changed: choice.employee !== null && choice.employee.label !== detail.holderLabel,
    })
  } else {
    rows.push({ key: "holder", label: words.holder, now: holderNow, next: detail.holderLabel ? words.kept(detail.holderLabel) : words.none, changed: false })
  }

  const departmentNow = detail.departmentLabel ?? words.none
  const waitingOnReceiver =
    !FIXED_DEPARTMENT_OWNERSHIPS.has(detail.ownership) &&
    ((choice.checkoutType === "user" && !choice.employee) || (choice.checkoutType === "department" && !choice.department))
  const nextDepartmentId = getCheckoutNextDepartmentId({
    ownership: detail.ownership,
    checkoutType: choice.checkoutType,
    currentDepartmentId: detail.departmentId,
    employeeDepartmentId: choice.employee?.departmentId ?? null,
    chosenDepartmentId: choice.department?.id ?? null,
  })
  const departmentNext = waitingOnReceiver
    ? words.notChosen
    : nextDepartmentId === detail.departmentId
      ? departmentNow
      : choice.employee && nextDepartmentId === choice.employee.departmentId
        ? choice.employee.departmentLabel
        : choice.department && nextDepartmentId === choice.department.id
          ? choice.department.label
          : departmentNow
  rows.push({ key: "department", label: words.department, now: departmentNow, next: departmentNext, changed: !waitingOnReceiver && nextDepartmentId !== detail.departmentId })

  if (choice.checkoutType === "location") {
    rows.push({
      key: "location",
      label: words.location,
      now: asset.locationLabel,
      next: choice.location?.label ?? words.notChosen,
      changed: choice.location !== null && choice.location.id !== asset.currentLocationId,
    })
  }

  rows.push({
    key: "status",
    label: words.status,
    now: asset.statusLabel,
    next: choice.handoverMode === "permanent_assignment" ? words.inUse : choice.handoverMode === "temporary_loan" ? words.checkedOut : words.notChosen,
    changed: choice.handoverMode !== "",
  })

  if (detail.components.length > 0) {
    const { travelling } = checkoutComponents(asset)
    rows.push({
      key: "components",
      label: words.components,
      now: words.count(detail.components.length),
      next: words.componentsGo(travelling.length),
      changed: travelling.length > 0,
    })
  }
  return rows
}

/** The card's checklist (spec §7.3): the asset can be taken, a receiver, a mode, and the optional signature. */
export function buildCheckoutChecklist(choice: CheckoutChoice & { signed: boolean }, words: CheckoutCheckWords): CheckoutCheck[] {
  return [
    { key: "asset", label: words.asset, done: choice.asset?.eligible === true },
    { key: "receiver", label: words.receiver, done: checkoutReceiverLabel(choice) !== null },
    { key: "mode", label: words.mode, done: choice.handoverMode !== "" },
    choice.signed
      ? { key: "signature", label: words.signature, done: true }
      : { key: "signature", label: words.signature, done: false, note: words.signatureMissing },
  ]
}
