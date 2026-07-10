export const masterDataWorkspaceIds = ["companies", "branches", "locations", "employees", "suppliers"] as const

export type MasterDataWorkspaceId = (typeof masterDataWorkspaceIds)[number]

export type MasterDataWorkspaceLabels = Record<MasterDataWorkspaceId, string>

export function buildMasterDataWorkspaceItems(
  locale: string,
  activeId: MasterDataWorkspaceId,
  labels: MasterDataWorkspaceLabels,
) {
  return masterDataWorkspaceIds.map((id) => ({
    id,
    label: labels[id],
    href: `/${locale}/master-data/${id}`,
    active: id === activeId,
  }))
}
