import { prisma } from "@/lib/db"

export async function assertCanInstallComponent(parentAssetId: string, componentAssetId: string, slotNo?: string | null) {
  if (parentAssetId === componentAssetId) {
    throw new Error("Component asset cannot be the same as parent asset")
  }

  const [parent, component, activeComponentLink, activeSlotLink, wouldCycle] = await Promise.all([
    prisma.asset.findFirst({ where: { id: parentAssetId, isActive: true }, select: { id: true } }),
    prisma.asset.findFirst({ where: { id: componentAssetId, isActive: true }, select: { id: true } }),
    prisma.assetComponent.findFirst({
      where: { componentAssetId, status: "installed", removedAt: null },
      select: { id: true, parentAsset: { select: { assetTag: true } } },
    }),
    slotNo?.trim()
      ? prisma.assetComponent.findFirst({
          where: { parentAssetId, slotNo: slotNo.trim(), status: "installed", removedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    hasComponentPath(componentAssetId, parentAssetId),
  ])

  if (!parent) throw new Error("Parent asset not found")
  if (!component) throw new Error("Component asset not found")
  if (activeComponentLink) {
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
      where: { parentAssetId: current, status: "installed", removedAt: null },
      select: { componentAssetId: true },
    })
    frontier.push(...children.map((child) => child.componentAssetId))
  }

  return false
}
