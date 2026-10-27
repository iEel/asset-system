// The round page's rules (group 2 spec §5, §8): who decided a finding, the field bars' distinct items, a person's name,
// the category chips, the photo count, who checked a row, a parent's missing components. Pure and client-safe:
// `import type` and relative .ts imports only, so node --test imports it.
import type { Prisma } from "@prisma/client"
import { foldTopCategories, isAuditRoundOwnItem } from "./audit-round-counts-rules.ts"
import { auditCountedFindingReviewStatuses, auditFindingFields, auditFindingTypeByField, type AuditFindingField } from "./audit-round-result-filters.ts"

// The scan closes a finding itself in four ways. A re-scan rejects stale findings with this remark (scan/route.ts:44,
// :623-639). Three paths set these actionTaken values (scan/route.ts:346-357, :359-372, :466-479). None of them is a
// person's decision. An approval written by an approver's scan (`master_asset_updated_from_audit_scan`) is one.
export const AUDIT_STALE_FINDING_REVIEW_REMARK = "ยกเลิกเพราะแก้ผลตรวจ"

export const auditSystemFindingDecisionActions = [
  "component_confirmed_with_parent_mismatch_resolved",
  "found_later_by_component_confirmation",
  "found_later_by_audit_scan",
] as const

// reviewRemark and actionTaken are nullable; Prisma's `not` / `notIn` drop NULL rows, so the null branch is spelled out.
export const auditPersonDecidedFindingWhere: Prisma.AuditFindingWhereInput = {
  reviewStatus: { in: ["approved", "rejected", "exception"] },
  AND: [
    { OR: [{ reviewRemark: null }, { reviewRemark: { not: AUDIT_STALE_FINDING_REVIEW_REMARK } }] },
    { OR: [{ actionTaken: null }, { actionTaken: { notIn: [...auditSystemFindingDecisionActions] } }] },
  ],
}

// Step 2's พิจารณาแล้ว counts findings, as its รอ and its button do, so the step equals the findings page it opens (P2-R26).
// AND, so the round never overwrites the rule's own AND.
export function auditRoundPersonDecidedFindingWhere(roundId: string): Prisma.AuditFindingWhereInput {
  return { AND: [{ auditRoundId: roundId }, auditPersonDecidedFindingWhere] }
}

// An item with any field finding the bars count (P2-R1): the bars' distinct items (P2-R18).
export const auditRoundAnyFieldFindingWhere: Prisma.AuditItemWhereInput = {
  findings: {
    some: {
      findingType: { in: auditFindingFields.map((field) => auditFindingTypeByField[field]) },
      reviewStatus: { in: [...auditCountedFindingReviewStatuses] },
    },
  },
}

// "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง": the bars' sum exceeds the distinct items they count (P2-R18).
export function hasMultipleAuditFieldFindings(counts: Readonly<Record<AuditFindingField, number>>, distinctItems: number): boolean {
  const sum = auditFindingFields.reduce((total, field) => total + counts[field], 0)
  return sum > distinctItems
}

export function formatAuditUserLabel(user: { username: string; displayName: string } | null | undefined, fallbackId: string | null): string | null {
  if (!user) return fallbackId
  return user.displayName === user.username ? user.username : `${user.displayName} (${user.username})`
}

export type AuditRoundCategoryCount = { id: string; count: number }

export type AuditRoundCategoryChip = { id: string; code: string; name: string; count: number }

export type AuditRoundCategoryChips = {
  visible: boolean
  all: number
  top: AuditRoundCategoryChip[]
  other: { categories: number; count: number }
  selected: AuditRoundCategoryChip | null
}

// Sorted by id first (`<` / `>`, not localeCompare), so equal counts keep id order: the six shown, and with them
// categoryId=other, are the same on every request and the same six the exports leave out (their rows come in id order).
function foldAuditRoundCategories(rows: readonly AuditRoundCategoryCount[]) {
  const sorted = [...rows].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
  return foldTopCategories(sorted, 6)
}

export function auditRoundTopCategoryIds(rows: readonly AuditRoundCategoryCount[]): string[] {
  return foldAuditRoundCategories(rows).top.map((row) => row.id)
}

export function buildAuditRoundCategoryChips({
  rows,
  names,
  selectedCategoryId,
  topIds,
}: {
  rows: readonly AuditRoundCategoryCount[]
  names: ReadonlyMap<string, { code: string; name: string }>
  selectedCategoryId: string | null
  topIds?: readonly string[]
}): AuditRoundCategoryChips {
  const countById = new Map(rows.map((row) => [row.id, row.count]))
  const chip = (id: string, count: number): AuditRoundCategoryChip => ({ id, code: names.get(id)?.code ?? "", name: names.get(id)?.name ?? "", count })
  let top: AuditRoundCategoryChip[]
  let other: { categories: number; count: number }
  if (topIds) {
    // The six ranked over every result (P2-R11): each counted within the result in use, 0 allowed; อื่น ๆ is the rest.
    const shown = new Set(topIds)
    top = topIds.map((id) => chip(id, countById.get(id) ?? 0))
    const rest = rows.filter((row) => !shown.has(row.id))
    other = { categories: rest.length, count: rest.reduce((sum, row) => sum + row.count, 0) }
  } else {
    const folded = foldAuditRoundCategories(rows)
    top = folded.top.map((row) => chip(row.id, row.count))
    other = folded.other
  }
  const selected =
    selectedCategoryId && !top.some((entry) => entry.id === selectedCategoryId) && names.has(selectedCategoryId)
      ? chip(selectedCategoryId, countById.get(selectedCategoryId) ?? 0)
      : null
  return {
    visible: rows.length > 1,
    all: rows.reduce((sum, row) => sum + row.count, 0),
    top,
    other,
    selected,
  }
}

export type AuditRoundEvidenceItem = { assetId: string; categoryId: string; auditStatus: string; auditResult: string | null }

export type AuditRoundEvidence = { checked: number; withPhoto: number; withoutPhoto: number; checklistComplete: number; checklistIncomplete: number }

// รูปหลักฐาน counts the round's own checked items only (bug 10): never a pending item, never an out-of-scope find. A
// category's checklist is complete when every label has a photo named "<label> - ...".
export function foldAuditRoundEvidence({
  items,
  attachmentNamesByAssetId,
  checklistByCategoryId,
}: {
  items: readonly AuditRoundEvidenceItem[]
  attachmentNamesByAssetId: ReadonlyMap<string, readonly string[]>
  checklistByCategoryId: ReadonlyMap<string, readonly string[]>
}): AuditRoundEvidence {
  let checked = 0
  let withPhoto = 0
  let checklistComplete = 0
  let checklistIncomplete = 0
  for (const item of items) {
    if (item.auditStatus === "pending" || !isAuditRoundOwnItem(item)) continue
    checked += 1
    const names = attachmentNamesByAssetId.get(item.assetId) ?? []
    if (names.length > 0) withPhoto += 1
    const checklist = checklistByCategoryId.get(item.categoryId) ?? []
    if (checklist.length === 0) continue
    if (checklist.every((label) => names.some((name) => name.startsWith(`${label} - `)))) checklistComplete += 1
    else checklistIncomplete += 1
  }
  return { checked, withPhoto, withoutPhoto: checked - withPhoto, checklistComplete, checklistIncomplete }
}

// ตรวจโดย: the scanner and the first scan time; mark-not-found sets no scanner, so a not-found item reads its latest
// not-found finding's reporter. The rows load findings in reportedAt asc, id asc order, so the last is the latest.
export function resolveAuditRoundRowChecker(item: {
  auditResult: string | null
  scannedBy: string | null
  scannedAt: Date | null
  findings: readonly { findingType: string; reportedBy: string; reportedAt: Date }[]
}): { userId: string; at: Date } | null {
  if (item.scannedBy && item.scannedAt) return { userId: item.scannedBy, at: item.scannedAt }
  if (item.auditResult !== "not_found") return null
  const notFound = item.findings.filter((finding) => finding.findingType === "not_found")
  const latest = notFound[notFound.length - 1]
  return latest ? { userId: latest.reportedBy, at: latest.reportedAt } : null
}

// A parent's installed components whose own item in this round is ไม่พบ (decision 6, P2-R19); the rows load only those items.
export function listAuditRoundMissingComponents(
  links: readonly { componentAsset: { id: string; assetTag: string; name: string; auditItems: readonly { id: string }[] } }[],
): { id: string; assetTag: string; name: string }[] {
  return links
    .filter((link) => link.componentAsset.auditItems.length > 0)
    .map((link) => ({ id: link.componentAsset.id, assetTag: link.componentAsset.assetTag, name: link.componentAsset.name }))
}
