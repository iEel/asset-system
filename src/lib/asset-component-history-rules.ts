// The components tab's install/remove history (group 1 asset detail task 10, spec §7.7): each link row gives an
// installation and, once removed, a removal, seen from this asset's side. Pure: relative type imports only, so
// `node --test` loads it.
import type { AssetMovementDocument, AssetMovementReference } from "./asset-movement-labels.ts"

export type AssetComponentHistoryAsset = { id: string; assetTag: string; name: string; isActive: boolean }

export type AssetComponentLinkRow = AssetMovementReference & {
  id: string
  parentAssetId: string
  componentAssetId: string
  installedAt: Date
  removedAt: Date | null
  reason: string | null
  parentAsset: AssetComponentHistoryAsset
  componentAsset: AssetComponentHistoryAsset
}

// The movement types, so assetMovementLabelKey(kind) labels them.
export type AssetComponentHistoryKind = "component_install" | "component_remove" | "installed_in_parent" | "removed_from_parent"

export type AssetComponentHistoryEvent = {
  id: string
  at: Date
  kind: AssetComponentHistoryKind
  other: AssetComponentHistoryAsset
  reason: string | null
  document: AssetMovementDocument | null
}

const rowIdOf = (eventId: string) => eventId.slice(0, eventId.lastIndexOf(":"))
const isRemoval =(kind: AssetComponentHistoryKind) => kind === "component_remove" || kind === "removed_from_parent"

export function buildAssetComponentHistory(
  rows: readonly AssetComponentLinkRow[],
  assetId: string,
  documentOf: (reference: AssetMovementReference) => AssetMovementDocument | null,
): AssetComponentHistoryEvent[] {
  const events: AssetComponentHistoryEvent[] = []
  for (const row of rows) {
    if (row.parentAssetId !== assetId && row.componentAssetId !== assetId) continue
    const parentSide = row.parentAssetId === assetId
    const other = parentSide ? row.componentAsset : row.parentAsset
    // The row keeps one reason and one reference. The remove API keeps the install's when the removal gives none
    // (`?? existing.*`), so they belong to the row's latest event: the removal when there is one, else the installation.
    const latest = { reason: row.reason, document: documentOf(row) }
    const none = { reason: null, document: null }
    events.push({
      id: `${row.id}:install`,
      at: row.installedAt,
      kind: parentSide ? "component_install" : "installed_in_parent",
      other,
      ...(row.removedAt ? none : latest),
    })
    if (row.removedAt) {
      events.push({
        id: `${row.id}:remove`,
        at: row.removedAt,
        kind: parentSide ? "component_remove" : "removed_from_parent",
        other,
        ...latest,
      })
    }
  }
  // Newest first; at one instant the removal reads first, then by row id.
  return events.sort((a, b) => {
    const byTime = b.at.getTime() - a.at.getTime()
    if (byTime !== 0) return byTime
    const byRemoval = Number(isRemoval(b.kind)) - Number(isRemoval(a.kind))
    if (byRemoval !== 0) return byRemoval
    const rowA = rowIdOf(a.id)
    const rowB = rowIdOf(b.id)
    return rowA < rowB ? -1 : rowA > rowB ? 1 : 0
  })
}

// The table's third column names what the rows hold: components, a parent, or both.
export function assetComponentHistoryColumn(events: readonly Pick<AssetComponentHistoryEvent, "kind">[]): "component" | "parent" | "related" {
  const parentSide = events.some((event) => event.kind === "component_install" || event.kind === "component_remove")
  const componentSide = events.some((event) => event.kind === "installed_in_parent" || event.kind === "removed_from_parent")
  if (parentSide && componentSide) return "related"
  if (componentSide) return "parent"
  return "component"
}
