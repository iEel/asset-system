// ส่งมอบ's form rules (group 3 spec §7.1-§7.3, plan 1 Task 6): the สรุปก่อนบันทึก rows and checklist, the chosen asset's
// detail answer, its condition default and the receiver. Pure and client-safe; the department row reads the same rule
// the checkout route calls (asset-department-rule.ts), so the card never promises what the save does not write.
import { getCheckoutNextDepartmentId } from "./asset-department-rule.ts"
import { checkoutConditionBlockReasonKeys, operationConditionDefault } from "./asset-lifecycle-policy.ts"
import type { AssetHandoverMode } from "./asset-handover-mode.ts"
import type { AssetOperationEmployeeOption, AssetOperationNamedOption } from "./asset-operation-options.ts"
import type { AssetOperationChosenComponent, AssetOperationSearchRow } from "./asset-operation-search-rules.ts"

export type CheckoutDestinationType = "user" | "department" | "location"
/** The phone's three steps (spec §7.4, P1-R4): the only export of this type. */
export type CheckoutPhoneStep = 1 | 2 | 3
/** The chosen asset's detail=1 read, owned by the form beside the asset (final review I1). */
export type CheckoutDetailState = "loading" | "failed" | "ready"
export type CheckoutChoice = {
  asset: AssetOperationSearchRow | null
  checkoutType: CheckoutDestinationType
  handoverMode: "" | AssetHandoverMode
  employee: AssetOperationEmployeeOption | null
  department: AssetOperationNamedOption | null
  location: AssetOperationNamedOption | null
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

/** ส่งมอบ's name for operationConditionDefault, which lives beside the operation's condition options (final review M11). */
export const checkoutConditionDefault = operationConditionDefault

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

/** The chosen destination's plain name (an employee's fullNameTh, a department's or room's name) for the phone's read-back (look L1). */
export function checkoutReceiverName(choice: CheckoutChoice): string | null {
  if (choice.checkoutType === "user") return choice.employee?.name ?? null
  if (choice.checkoutType === "department") return choice.department?.name ?? null
  return choice.location?.name ?? null
}

/**
 * What a submit does (final review I1, M3). The desktop's ตรวจสอบและบันทึก and the phone's step 1 read the chosen asset
 * again (detail=1) first, and go on only once that read is ready: the review, or step 2. Step 3 saves on what step 2
 * showed. Step 2 has no submit button and never saves or moves by a submit: should one arrive, it only reads again and
 * stays. Without an asset (the field checks stop that first) there is nothing to read.
 */
export function checkoutSubmitAction(input: { isDesktop: boolean; step: CheckoutPhoneStep; detail: CheckoutDetailState; hasAsset: boolean }): "review" | "nextStep" | "save" | "readDetail" {
  if (!input.isDesktop && input.step === 3) return "save"
  if (!input.isDesktop && input.step === 2) return "readDetail"
  if (input.hasAsset && input.detail !== "ready") return "readDetail"
  return input.isDesktop ? "review" : "nextStep"
}

/**
 * สรุปก่อนบันทึก (spec §7.3): ตอนนี้ and หลังบันทึก per field the save writes; none without the asset's detail. People and
 * departments read by name, not "code - name", so the narrow card does not wrap (look L1).
 */
export function buildCheckoutSummaryRows(choice: CheckoutChoice, words: CheckoutSummaryWords): CheckoutSummaryRow[] {
  const asset = choice.asset
  const detail = asset?.detail
  if (!asset || !detail) return []
  const rows: CheckoutSummaryRow[] = []

  const holderNow = detail.holderName ?? words.none
  if (choice.checkoutType === "user") {
    rows.push({
      key: "holder",
      label: words.holder,
      now: holderNow,
      next: choice.employee?.name ?? words.notChosen,
      // Compared by "code - name", which tells two people of one name apart.
      changed: choice.employee !== null && choice.employee.label !== detail.holderLabel,
    })
  } else {
    rows.push({ key: "holder", label: words.holder, now: holderNow, next: detail.holderName ? words.kept(detail.holderName) : words.none, changed: false })
  }

  const departmentNow = detail.departmentName ?? words.none
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
        ? choice.employee.departmentName
        : choice.department && nextDepartmentId === choice.department.id
          ? choice.department.name
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

const CONDITION_REASON_KEYS: ReadonlySet<string> = new Set(Object.values(checkoutConditionBlockReasonKeys))
const REPAIR_REASON_KEYS: ReadonlySet<string> = new Set([checkoutConditionBlockReasonKeys.damaged, checkoutConditionBlockReasonKeys.nonFunctional])

/** A row refused for its condition (เสียหาย, ใช้งานไม่ได้, ซาก): the only refused row ส่งมอบ's picker lets IT pick (A1-R1). */
export function isCheckoutConditionReasonKey(reasonKey: string | null | undefined): boolean {
  return typeof reasonKey === "string" && CONDITION_REASON_KEYS.has(reasonKey)
}

/** เสียหาย or ใช้งานไม่ได้: the ส่งซ่อม link shows; ซาก gets none (group 3 spec §19.3). */
export function checkoutNeedsRepairReasonKey(reasonKey: string | null | undefined): boolean {
  return typeof reasonKey === "string" && REPAIR_REASON_KEYS.has(reasonKey)
}

/** The ส่งซ่อม link shows for เสียหาย/ใช้งานไม่ได้, and only to someone who may record a repair (final review I3). */
export function checkoutRepairLinkShown(reasonKey: string | null | undefined, canCreateRepair: boolean): boolean {
  return canCreateRepair && checkoutNeedsRepairReasonKey(reasonKey)
}

/**
 * ส่งซ่อม: a new repair for the asset. No returnTo: the repair page keeps only its own section's way back (its first
 * crumb reads งานซ่อม), so a checkout path would be dropped (A2 review).
 */
export function checkoutRepairHref(locale: string, assetId: string): string {
  return `/${locale}/maintenance/new?assetId=${encodeURIComponent(assetId)}`
}
