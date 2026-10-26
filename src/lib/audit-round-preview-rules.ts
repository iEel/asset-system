// The create form's live count (group 2 spec §7): pure, so the form and node --test import it.

export type AuditPreviewCategoryCount = { id: string; count: number }

// The selected assets by category, largest first; a tie keeps the id order, so two counts of one scope list alike.
// A component counts under its own category.
export function countAuditPreviewCategories(assets: readonly { categoryId: string }[]): AuditPreviewCategoryCount[] {
  const counts = new Map<string, number>()
  for (const asset of assets) counts.set(asset.categoryId, (counts.get(asset.categoryId) ?? 0) + 1)
  return [...counts]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id))
}

export type AuditRoundOverlapRow = { assetId: string; auditRound: { id: string; auditNo: string } }

export type AuditRoundOverlap = { count: number; rounds: { id: string; auditNo: string }[] }

// Each selected asset counts once however many rounds hold it; every round is named once, by number.
export function foldAuditRoundOverlap(rows: readonly AuditRoundOverlapRow[]): AuditRoundOverlap {
  const assetIds = new Set<string>()
  const rounds = new Map<string, { id: string; auditNo: string }>()
  for (const row of rows) {
    assetIds.add(row.assetId)
    if (!rounds.has(row.auditRound.id)) rounds.set(row.auditRound.id, { id: row.auditRound.id, auditNo: row.auditRound.auditNo })
  }
  return {
    count: assetIds.size,
    rounds: [...rounds.values()].sort((left, right) => left.auditNo.localeCompare(right.auditNo)),
  }
}
