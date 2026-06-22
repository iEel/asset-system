import { selectAuditSample } from "./audit-round-scope.ts"

export type AuditComponentCandidateAsset = {
  id: string
  assetTag: string
  name: string
  companyId: string
  branchId: string
  departmentId: string | null
  currentLocationId: string
  custodianId: string | null
  conditionId: string | null
}

export type AuditComponentLink<TAsset extends AuditComponentCandidateAsset> = {
  parentAssetId: string
  componentAsset: TAsset
}

export type AuditComponentCandidateGroup<TAsset extends AuditComponentCandidateAsset> = {
  id: string
  rootAsset: TAsset
  assets: TAsset[]
  componentAssetIds: Set<string>
}

export type AuditComponentSelectedItem<TAsset extends AuditComponentCandidateAsset> = {
  asset: TAsset
  includedVia: "direct" | "component"
  parentAssetId?: string
  parentAssetTag?: string
}

export type AuditComponentSelection<TAsset extends AuditComponentCandidateAsset> = {
  matchedAssets: number
  selectedItems: AuditComponentSelectedItem<TAsset>[]
  selectedAssets: TAsset[]
  componentItems: number
  groups: AuditComponentCandidateGroup<TAsset>[]
}

export function buildAuditComponentCandidateGroups<TAsset extends AuditComponentCandidateAsset>(
  candidateAssets: TAsset[],
  componentLinks: Array<AuditComponentLink<TAsset>>
): Array<AuditComponentCandidateGroup<TAsset>> {
  const componentsByParent = new Map<string, TAsset[]>()
  for (const link of componentLinks) {
    const current = componentsByParent.get(link.parentAssetId) ?? []
    current.push(link.componentAsset)
    componentsByParent.set(link.parentAssetId, current)
  }

  return candidateAssets.map((asset) => {
    const componentAssets = dedupeAssetsById(componentsByParent.get(asset.id) ?? [])
    return {
      id: asset.id,
      rootAsset: asset,
      assets: [asset, ...componentAssets],
      componentAssetIds: new Set(componentAssets.map((component) => component.id)),
    }
  })
}

export function selectAuditComponentCandidates<TAsset extends AuditComponentCandidateAsset>(
  candidateAssets: TAsset[],
  componentLinks: Array<AuditComponentLink<TAsset>>,
  sampleRate: number,
  sampleGroups: <TGroup extends { id: string }>(groups: TGroup[], sampleRate: number) => TGroup[] = selectAuditSample
): AuditComponentSelection<TAsset> {
  const groups = buildAuditComponentCandidateGroups(candidateAssets, componentLinks)
  const selectedGroups = sampleGroups(groups, sampleRate)
  const directCandidatesById = new Map(candidateAssets.map((asset) => [asset.id, asset] as const))
  const selectedRootAssetIds = new Set(selectedGroups.map((group) => group.rootAsset.id))
  const selectedById = new Map<string, AuditComponentSelectedItem<TAsset>>()

  for (const group of selectedGroups) {
    for (const asset of group.assets) {
      const existing = selectedById.get(asset.id)
      if (existing?.includedVia === "direct") continue

      const isSelectedRootAsset = asset.id === group.rootAsset.id && selectedRootAssetIds.has(asset.id)
      const directAsset = isSelectedRootAsset ? directCandidatesById.get(asset.id) : undefined
      if (directAsset) {
        selectedById.set(asset.id, { asset: directAsset, includedVia: "direct" })
        continue
      }

      const selectedAsset = directCandidatesById.get(asset.id) ?? asset
      selectedById.set(asset.id, {
        asset: selectedAsset,
        includedVia: "component",
        parentAssetId: group.rootAsset.id,
        parentAssetTag: group.rootAsset.assetTag,
      })
    }
  }

  const selectedItems = Array.from(selectedById.values())
  return {
    matchedAssets: candidateAssets.length,
    selectedItems,
    selectedAssets: selectedItems.map((item) => item.asset),
    componentItems: selectedItems.filter((item) => item.includedVia === "component").length,
    groups,
  }
}

function dedupeAssetsById<TAsset extends AuditComponentCandidateAsset>(assets: TAsset[]) {
  const byId = new Map<string, TAsset>()
  for (const asset of assets) {
    if (!byId.has(asset.id)) byId.set(asset.id, asset)
  }
  return Array.from(byId.values()).sort((left, right) => left.assetTag.localeCompare(right.assetTag, "th-TH"))
}
