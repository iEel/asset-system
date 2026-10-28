// The audit exports in words (group 2 spec §5, plan 4 Task 6, P4-R7, P4-R8): each stored code a cell holds maps to the
// full message key of the word its page shows, read with getTranslations({ locale }) (root keys). Headers and sheet
// names stay English. Pure and client-safe: `import type` and relative .ts imports only, so node --test imports it.
import { auditFindingTypes } from "./audit-finding-filters.ts"
import { getAuditItemReconcileStatusLabelKey, getAuditItemStatusLabelKey } from "./audit-item-status-labels.ts"
import { auditRoundResultBadge } from "./audit-round-page-rules.ts"
import { AUDIT_ROUND_OTHER_CATEGORY, type AuditExportFilterLabelInput, type AuditFindingField, type AuditRoundResultFilter } from "./audit-round-result-filters.ts"

export type AuditExportLocale = "th" | "en"

/** The request's language (?locale=), Thai unless English is asked, as the asset history export (R15). */
export function resolveAuditExportLocale(value: string | null | undefined): AuditExportLocale {
  return value === "en" ? "en" : "th"
}

export type AuditExportTranslate = (key: string, values?: Record<string, string>) => string

// The codes each column holds, as their writers store them (prisma/schema.prisma defaults, the review, scan and
// mark-not-found routes). The six type codes are Task 2's auditFindingTypes. tests/audit-export-labels.test.ts checks
// that the routes write no other actionTaken or type.
export const auditFindingReviewStatusCodes = ["pending", "approved", "rejected", "exception"] as const
export const auditFindingActionStatusCodes = ["not_required", "planned", "in_progress", "done", "closed"] as const
export const auditFindingActionTakenCodes = [
  "master_asset_updated",
  "master_asset_updated_from_audit_scan",
  "finding_rejected",
  "out_of_scope_confirmed_no_master_update",
  "not_found_confirmed_no_master_update",
  "manual_review_required",
  "pending_investigation",
  "out_of_scope_detected_by_audit_scan",
  "out_of_scope_actual_field_reported",
  "component_confirmed_with_parent_mismatch",
  "component_confirmed_with_parent_mismatch_resolved",
  "found_later_by_component_confirmation",
  "found_later_by_audit_scan",
] as const

function keyIn(codes: readonly string[], prefix: string, code: string | null | undefined): string | null {
  return code && codes.includes(code) ? `${prefix}${code}` : null
}

/** An item's check status, as the findings page's item badge (auditFinding.itemStatus_*). */
export function auditExportItemStatusKey(code: string | null | undefined): string | null {
  const key = getAuditItemStatusLabelKey(code)
  return key ? `auditFinding.${key}` : null
}

/** An item's result, as the round page's ผล column (P2-R2): always a word, a checked item with no result reads ไม่ตรง. */
export function auditExportItemResultKey(auditStatus: string, auditResult: string | null): string {
  return `auditRound.${auditRoundResultBadge(auditStatus, auditResult).labelKey}`
}

export function auditExportReconcileStatusKey(code: string | null | undefined): string | null {
  const key = getAuditItemReconcileStatusLabelKey(code)
  return key ? `auditFinding.${key}` : null
}

export function auditExportFindingTypeKey(code: string | null | undefined): string | null {
  return keyIn(auditFindingTypes, "auditFinding.type_", code)
}

export function auditExportReviewStatusKey(code: string | null | undefined): string | null {
  return keyIn(auditFindingReviewStatusCodes, "auditFinding.status_", code)
}

export function auditExportActionStatusKey(code: string | null | undefined): string | null {
  return keyIn(auditFindingActionStatusCodes, "auditFinding.actionStatus_", code)
}

export function auditExportActionTakenKey(code: string | null | undefined): string | null {
  return keyIn(auditFindingActionTakenCodes, "auditFinding.actionTaken_", code)
}

/** A code in words: a blank stays blank; a code with no word yet shows as stored, never hidden (docs/19). */
export function auditExportWord(t: (key: string) => string, key: string | null, code: string | null | undefined): string {
  if (!code) return ""
  return key ? t(key) : code
}

/** actionTaken in words; a code with no word reads as the export's empty cell, never the code (P4-R8, P4-R29). */
export function auditExportActionTaken(t: (key: string) => string, code: string | null | undefined): string {
  const key = auditExportActionTakenKey(code)
  return key ? t(key) : ""
}

export type AuditExportFilterWords = {
  result: Readonly<Record<AuditRoundResultFilter, string>>
  field: Readonly<Record<AuditFindingField, string>>
  company: (code: string) => string
  branch: (code: string) => string
  category: (code: string) => string
  categoryOther: string
  componentsMissing: string
  search: (text: string) => string
  none: string
}

/** The round page's chip words (rounds/[id]/page.tsx resultFilterLabels and resultFilterChips). */
export function auditExportFilterWords(t: AuditExportTranslate): AuditExportFilterWords {
  return {
    result: {
      all: t("auditRound.viewAll"),
      pending: t("auditRound.pending"),
      found: t("auditRound.found"),
      mismatch: t("auditRound.mismatchShort"),
      not_found: t("auditRound.notFound"),
      out_of_scope: t("auditRound.outOfScope"),
      pending_review: t("auditRound.pendingReview"),
    },
    field: {
      location: t("auditFinding.type_wrong_location"),
      department: t("auditFinding.type_wrong_department"),
      custodian: t("auditFinding.type_wrong_custodian"),
      condition: t("auditFinding.type_wrong_condition"),
    },
    company: (code) => t("auditRound.companyFilterChip", { company: code }),
    branch: (code) => t("auditRound.branchFilterChip", { branch: code }),
    category: (code) => t("auditRound.categoryFilterChip", { category: code }),
    categoryOther: t("auditRound.categoryFilterChip", { category: t("auditRound.categoryOther") }),
    componentsMissing: t("auditRound.exportFilterComponentsMissing"),
    search: (text) => t("auditRound.exportFilterSearch", { search: text }),
    none: t("auditRound.viewAll"),
  }
}

/** The round PDF's filter line: buildAuditExportFilterLabel's parts in its order, in words, joined by " · ". */
export function buildAuditExportFilterWords(input: AuditExportFilterLabelInput, words: AuditExportFilterWords): string {
  const parts: string[] = []
  if (input.result !== "all") parts.push(words.result[input.result])
  if (input.company) parts.push(words.company(input.company.code))
  if (input.branch) parts.push(words.branch(input.company ? input.branch.code : `${input.branch.company.code}-${input.branch.code}`))
  if (input.category) parts.push(input.category.code === AUDIT_ROUND_OTHER_CATEGORY ? words.categoryOther : words.category(input.category.code))
  if (input.field) parts.push(words.field[input.field])
  if (input.components) parts.push(words.componentsMissing)
  const searchText = input.search ? input.search.trim() : ""
  if (searchText) parts.push(words.search(searchText))
  return parts.length > 0 ? parts.join(" · ") : words.none
}

/** The findings PDF's filter line: the round, the topic and the search; a topic with no word is left out. */
export function buildAuditFindingExportFilterWords(input: { roundNo: string | null; findingType: string | null; search: string | null }, t: AuditExportTranslate): string {
  const typeKey = auditExportFindingTypeKey(input.findingType)
  const searchText = input.search?.trim() ?? ""
  const parts = [
    ...(input.roundNo ? [`${t("auditFinding.auditRound")}: ${input.roundNo}`] : []),
    ...(typeKey ? [t(typeKey)] : []),
    ...(searchText ? [t("auditRound.exportFilterSearch", { search: searchText })] : []),
  ]
  return parts.length > 0 ? parts.join(" · ") : t("auditFinding.status_all")
}
