// The asset page's frame rules (group 1 asset detail task 8B): the fact strip's cells, its links, the date
// formatter of the page (R37), the disposal offer (R5), the "อื่น ๆ" groups (R21, R57) and the overview's
// "ข้อมูลยังไม่ครบ" line (R59). Pure: relative imports only, so `node --test` loads it.
import type { AssetOwnershipKind } from "./asset-actions.ts"
import { buildExactAssetRegisterHref } from "./asset-register-view-memory.ts"
import { getAuditRoundItemResultLabelKey } from "./audit-round-result-filters.ts"
import { getDisposalAssetEligibilityError } from "./disposal-policy.ts"
import type { DisposalReadinessBlocker } from "./disposal-readiness.ts"
import { bangkokDayDiff } from "./waiting-work-rules.ts"

// --- The fact strip's first cell: who holds it, by ownership type (spec §7.4, R30) ---

export type AssetHolderCell =
  | { kind: "custodian"; employeeId: string; name: string; department: string | null; heldDays: number | null }
  | { kind: "noCustodian" }
  | { kind: "department"; label: "managing" | "using"; department: string | null }
  | { kind: "parent"; parent: { id: string; assetTag: string; name: string } | null }
  | { kind: "seats"; used: number; total: number | null }

export function describeAssetHolder(input: {
  ownership: AssetOwnershipKind
  custodian: { id: string; code: string; fullNameTh: string; department: string | null } | null
  department: string | null
  parent: { id: string; assetTag: string; name: string } | null
  seats: { used: number | null; total: number | null }
  openCheckoutDate: Date | null
  now: Date
}): AssetHolderCell {
  switch (input.ownership) {
    case "personal": {
      const custodian = input.custodian
      if (!custodian) return { kind: "noCustodian" }
      return {
        kind: "custodian",
        employeeId: custodian.id,
        name: custodian.fullNameTh,
        department: custodian.department,
        heldDays: input.openCheckoutDate ? Math.max(0, bangkokDayDiff(input.openCheckoutDate, input.now)) : null,
      }
    }
    case "stock":
      return { kind: "department", label: "managing", department: input.department }
    case "shared":
      return { kind: "department", label: "using", department: input.department }
    case "component":
      return { kind: "parent", parent: input.parent }
    case "software_license":
      return { kind: "seats", used: input.seats.used ?? 0, total: input.seats.total }
  }
}

// --- ตรวจนับล่าสุด (spec §7.4, R54) ---

export type AuditRoundRef = { id: string; auditNo: string }

export type AssetAuditCell =
  | { kind: "result"; result: string; labelKey: string | null; tone: "success" | "danger" | "muted"; at: Date; round: AuditRoundRef }
  | { kind: "pending"; round: AuditRoundRef }
  | { kind: "never" }

// The round page's item badge tones (audit/rounds/[id]/page.tsx, R54).
function auditResultTone(result: string): "success" | "danger" | "muted" {
  if (result === "found" || result === "confirmed_with_parent") return "success"
  if (result === "not_found") return "danger"
  return "muted"
}

export function describeAssetAudit(
  latest: { auditResult: string; at: Date; round: AuditRoundRef } | null,
  pending: { round: AuditRoundRef } | null,
): AssetAuditCell {
  if (pending) return { kind: "pending", round: pending.round }
  if (!latest) return { kind: "never" }
  return {
    kind: "result",
    result: latest.auditResult,
    labelKey: getAuditRoundItemResultLabelKey(latest.auditResult),
    tone: auditResultTone(latest.auditResult),
    at: latest.at,
    round: latest.round,
  }
}

// --- ประกัน (spec §7.4) ---

export type AssetWarrantyCell = { kind: "until"; date: Date } | { kind: "expired"; date: Date } | { kind: "unknown" }

// The end day is still covered: it expires only once the Bangkok day after it begins.
export function describeAssetWarranty(warrantyEndDate: Date | null, now: Date): AssetWarrantyCell {
  if (!warrantyEndDate) return { kind: "unknown" }
  return bangkokDayDiff(now, warrantyEndDate) >= 0 ? { kind: "until", date: warrantyEndDate } : { kind: "expired", date: warrantyEndDate }
}

// --- The page's one date formatter (R37) ---

export function formatAssetDetailDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

// --- The fact strip's links (spec §7.4, R9) ---

export function buildCustodianHref(locale: string, employeeId: string, canViewEmployee: boolean): string {
  if (canViewEmployee) return `/${locale}/master-data/employees/${encodeURIComponent(employeeId)}`
  return buildExactAssetRegisterHref(locale, { custodianId: employeeId })
}

export function buildLocationRegisterHref(locale: string, locationId: string): string {
  return buildExactAssetRegisterHref(locale, { locationId })
}

// --- ขอตัดจำหน่าย (spec §7.1, R5) ---

// Offered with disposal:create when the status allows a request and none is open. The API refuses on any
// readiness blocker (disposal-requests/route.ts), so the first one is the reason it shows as unavailable.
export function getDisposalRequestOffer(input: {
  canCreate: boolean
  status: { name: string; nameTh?: string | null }
  openDisposalId: string | null
  blockers: readonly DisposalReadinessBlocker[]
}): { blocker: DisposalReadinessBlocker | null } | null {
  if (!input.canCreate || input.openDisposalId) return null
  if (getDisposalAssetEligibilityError(input.status) !== null) return null
  return { blocker: input.blockers[0] ?? null }
}

// --- อื่น ๆ (spec §7.1, §7.8; R3, R21, R57) ---

export type AssetDetailDialogKey = "correctStatus" | "cancelLatest"

export type AssetDetailMoreItem =
  | { kind: "link"; key: string; label: string; href: string; phoneOnly?: true }
  | { kind: "unavailable"; key: string; label: string; reason: string }
  | { kind: "dialog"; key: AssetDetailDialogKey; label: string }

export type AssetDetailMoreGroup = { key: "transactions" | "asset"; items: AssetDetailMoreItem[] }

export type AssetDetailMoreTransaction = { key: string; label: string; href: string | null; enabled: boolean; reason: string | null }

export function buildAssetDetailMoreGroups(input: {
  primaryKey: string | null
  transactions: readonly AssetDetailMoreTransaction[]
  recordRepair: { label: string; href: string } | null
  disposal: { label: string; href: string; reason: string | null } | null
  correctStatus: string | null
  cancelLatest: string | null
  manageComponents: { label: string; href: string } | null
  clone: { label: string; href: string } | null
  edit: { label: string; href: string } | null
  printLabel: { label: string; href: string }
}): AssetDetailMoreGroup[] {
  // Task 1's transactions never hold the primary (R3): the available ones as links first, then the rest with their reason.
  const transactionItems: AssetDetailMoreItem[] = [
    ...input.transactions.flatMap((action): AssetDetailMoreItem[] =>
      action.enabled && action.href ? [{ kind: "link", key: action.key, label: action.label, href: action.href }] : [],
    ),
    ...input.transactions.flatMap((action): AssetDetailMoreItem[] =>
      action.enabled ? [] : [{ kind: "unavailable", key: action.key, label: action.label, reason: action.reason ?? "" }],
    ),
  ]

  const assetItems: AssetDetailMoreItem[] = []
  // บันทึกซ่อม comes only from the scan page, where the phone bar has no room for it; the desktop pins it in the header (R21).
  if (input.recordRepair) assetItems.push({ kind: "link", key: "recordRepair", ...input.recordRepair, phoneOnly: true })
  if (input.disposal) {
    const { label, href, reason } = input.disposal
    assetItems.push(reason ? { kind: "unavailable", key: "requestDisposal", label, reason } : { kind: "link", key: "requestDisposal", label, href })
  }
  if (input.correctStatus) assetItems.push({ kind: "dialog", key: "correctStatus", label: input.correctStatus })
  if (input.cancelLatest) assetItems.push({ kind: "dialog", key: "cancelLatest", label: input.cancelLatest })
  if (input.manageComponents) assetItems.push({ kind: "link", key: "manageComponents", ...input.manageComponents })
  if (input.clone) assetItems.push({ kind: "link", key: "clone", ...input.clone })
  // แก้ไข and พิมพ์ป้าย end the phone sheet (R57); the desktop header holds them.
  if (input.edit) assetItems.push({ kind: "link", key: "edit", ...input.edit, phoneOnly: true })
  assetItems.push({ kind: "link", key: "printLabel", ...input.printLabel, phoneOnly: true })

  const groups: AssetDetailMoreGroup[] = [
    { key: "transactions", items: transactionItems },
    { key: "asset", items: assetItems.filter((item) => item.key !== input.primaryKey) },
  ]
  return groups.filter((group) => group.items.length > 0)
}

export function withoutPhoneOnly(groups: readonly AssetDetailMoreGroup[]): AssetDetailMoreGroup[] {
  return groups
    .map((group) => ({ key: group.key, items: group.items.filter((item) => !(item.kind === "link" && item.phoneOnly)) }))
    .filter((group) => group.items.length > 0)
}

// --- ข้อมูลยังไม่ครบ (R59): today's data-health items (page.tsx:736-759) as a pure rule ---

export type AssetDataGapKey =
  | "serial"
  | "licenseKey"
  | "photo"
  | "checklist"
  | "purchaseDocument"
  | "responsibility"
  | "licenseSeats"
  | "warranty"
  | "licenseExpiry"

// `labelKey` is a full message key for the root translator (R2); `anchor` is a field id of the edit form (asset-form.tsx).
export type AssetDataGap = {
  key: AssetDataGapKey
  labelKey: string
  target: "edit" | "files" | "purchaseDocuments"
  anchor: string | null
  count?: number
}

// Who is responsible follows the ownership type (hasAssetResponsibility), in the fact strip's words (R30). A component's
// parent is set from the parent's components manager, so its edit form opens at the top.
const responsibilityGap: Record<AssetOwnershipKind, { labelKey: string; anchor: string | null }> = {
  personal: { labelKey: "asset.custodian", anchor: "asset-custodian" },
  stock: { labelKey: "assetDetail.managingDepartment", anchor: "asset-department" },
  shared: { labelKey: "assetDetail.usingDepartment", anchor: "asset-department" },
  component: { labelKey: "asset.parentAsset", anchor: null },
  software_license: { labelKey: "asset.licenseAssignee", anchor: "asset-custodian" },
}

export function listAssetDataGaps(input: {
  ownership: AssetOwnershipKind
  hasSerial: boolean
  hasResponsibility: boolean
  hasPrimaryPhoto: boolean
  missingChecklistCount: number
  hasPurchaseDocument: boolean
  hasWarrantyEnd: boolean
  hasLicenseSeats: boolean
}): AssetDataGap[] {
  const responsibility: AssetDataGap = { key: "responsibility", target: "edit", ...responsibilityGap[input.ownership] }
  const purchaseDocument: AssetDataGap = { key: "purchaseDocument", labelKey: "asset.purchaseDocuments", target: "purchaseDocuments", anchor: null }

  // A licence has no photo or checklist; its key is the serial field and its expiry the warranty field.
  const items: Array<[done: boolean, gap: AssetDataGap]> =
    input.ownership === "software_license"
      ? [
          [input.hasSerial, { key: "licenseKey", labelKey: "asset.licenseKey", target: "edit", anchor: "asset-serial-number" }],
          [input.hasResponsibility, responsibility],
          [input.hasLicenseSeats, { key: "licenseSeats", labelKey: "asset.licenseTotalSeats", target: "edit", anchor: "asset-license-total-seats" }],
          [input.hasPurchaseDocument, purchaseDocument],
          [input.hasWarrantyEnd, { key: "licenseExpiry", labelKey: "asset.dataGapLicenseExpiry", target: "edit", anchor: "asset-warranty-end" }],
        ]
      : [
          [input.hasSerial, { key: "serial", labelKey: "asset.serialNumber", target: "edit", anchor: "asset-serial-number" }],
          [input.hasPrimaryPhoto, { key: "photo", labelKey: "asset.primaryAssetPhoto", target: "files", anchor: null }],
          [
            input.missingChecklistCount <= 0,
            { key: "checklist", labelKey: "asset.dataHealthChecklistMissing", target: "files", anchor: null, count: input.missingChecklistCount },
          ],
          [input.hasPurchaseDocument, purchaseDocument],
          [input.hasResponsibility, responsibility],
          [input.hasWarrantyEnd, { key: "warranty", labelKey: "asset.dataGapWarranty", target: "edit", anchor: "asset-warranty-end" }],
        ]

  return items.filter(([done]) => !done).map(([, gap]) => gap)
}
