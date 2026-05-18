export type CostInsightAssetInput = {
  id: string
  label: string
  purchasePrice: number | null
  repairCost: number
  repairCount: number
}

export type CostExposureAsset = CostInsightAssetInput & {
  repairToPurchaseRatio: number | null
}

export type CostInsightSummary = {
  totalPurchaseValue: number
  totalRepairCost: number
  repairToPurchaseRatio: number | null
  missingPurchasePriceCount: number
  highValueAssetCount: number
  highRepairExposureAssets: CostExposureAsset[]
}

export function buildCostInsights(
  assets: CostInsightAssetInput[],
  options: { highValueThreshold?: number; maxExposureAssets?: number } = {}
): CostInsightSummary {
  const highValueThreshold = options.highValueThreshold ?? 50000
  const maxExposureAssets = options.maxExposureAssets ?? 5
  const totalPurchaseValue = assets.reduce((sum, asset) => sum + (asset.purchasePrice ?? 0), 0)
  const totalRepairCost = assets.reduce((sum, asset) => sum + asset.repairCost, 0)
  const highRepairExposureAssets = assets
    .filter((asset) => asset.repairCost > 0)
    .map((asset) => ({
      ...asset,
      repairToPurchaseRatio:
        asset.purchasePrice && asset.purchasePrice > 0 ? asset.repairCost / asset.purchasePrice : null,
    }))
    .sort((left, right) => {
      const leftRatio = left.repairToPurchaseRatio ?? -1
      const rightRatio = right.repairToPurchaseRatio ?? -1
      if (rightRatio !== leftRatio) return rightRatio - leftRatio
      return right.repairCost - left.repairCost
    })
    .slice(0, maxExposureAssets)

  return {
    totalPurchaseValue,
    totalRepairCost,
    repairToPurchaseRatio: totalPurchaseValue > 0 ? totalRepairCost / totalPurchaseValue : null,
    missingPurchasePriceCount: assets.filter((asset) => asset.purchasePrice == null).length,
    highValueAssetCount: assets.filter((asset) => (asset.purchasePrice ?? 0) >= highValueThreshold).length,
    highRepairExposureAssets,
  }
}
