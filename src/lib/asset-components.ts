import { prisma } from "@/lib/db"
import { installedOrOutstandingLinkWhere, isOutstandingLink } from "@/lib/asset-component-outstanding"

export async function assertCanInstallComponent(parentAssetId: string, componentAssetId: string, slotNo?: string | null) {
  if (parentAssetId === componentAssetId) {
    throw new Error("Component asset cannot be the same as parent asset")
  }

  const [parent, component, activeComponentLink, activeSlotLink, wouldCycle] = await Promise.all([
    prisma.asset.findFirst({ where: { id: parentAssetId, isActive: true }, select: { id: true } }),
    prisma.asset.findFirst({ where: { id: componentAssetId, isActive: true }, select: { id: true } }),
    prisma.assetComponent.findFirst({
      where: { componentAssetId, ...installedOrOutstandingLinkWhere },
      select: { id: true, status: true, removedAt: true, parentAsset: { select: { assetTag: true } } },
    }),
    slotNo?.trim()
      ? prisma.assetComponent.findFirst({
          where: { parentAssetId, slotNo: slotNo.trim(), ...installedOrOutstandingLinkWhere },
          select: { id: true },
        })
      : Promise.resolve(null),
    hasComponentPath(componentAssetId, parentAssetId),
  ])

  if (!parent) throw new Error("Parent asset not found")
  if (!component) throw new Error("Component asset not found")
  if (activeComponentLink) {
    // An outstanding component (group 3 spec §8.5) is still linked to its parent: it is returned before it goes anywhere.
    if (isOutstandingLink(activeComponentLink)) throw new Error("ASSET_COMPONENT_OUTSTANDING")
    throw new Error(`Component is already installed in ${activeComponentLink.parentAsset.assetTag}`)
  }
  if (activeSlotLink) {
    throw new Error("This parent asset already has a component in the same slot")
  }
  if (wouldCycle) {
    throw new Error("Installing this component would create a parent/child cycle")
  }
}

async function hasComponentPath(startParentAssetId: string, targetComponentAssetId: string) {
  const visited = new Set<string>()
  const frontier = [startParentAssetId]

  while (frontier.length > 0) {
    const current = frontier.shift()
    if (!current || visited.has(current)) continue
    if (current === targetComponentAssetId) return true

    visited.add(current)
    const children = await prisma.assetComponent.findMany({
      // An outstanding child counts, so a later re-attach cannot close a cycle.
      where: { parentAssetId: current, ...installedOrOutstandingLinkWhere },
      select: { componentAssetId: true },
    })
    frontier.push(...children.map((child) => child.componentAssetId))
  }

  return false
}
