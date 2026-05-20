export type DepreciationStatus = "depreciating" | "fully_depreciated"

export type DepreciationAssetInput = {
  id: string
  label: string
  categoryCode?: string | null
  categoryName?: string | null
  ownershipType?: string | null
  purchasePrice: number | null
  purchaseDate: Date | string | null
}

export type DepreciableAsset = DepreciationAssetInput & {
  purchasePrice: number
  purchaseDate: Date
  usefulLifeMonths: number
  ageMonths: number
  monthlyDepreciation: number
  accumulatedDepreciation: number
  netBookValue: number
  depreciatedRatio: number
  status: DepreciationStatus
}

export type DepreciationSummary = {
  totalAcquisitionCost: number
  totalAccumulatedDepreciation: number
  totalNetBookValue: number
  missingAccountingInfoCount: number
  fullyDepreciatedCount: number
  depreciableAssets: DepreciableAsset[]
  topNetBookValueAssets: DepreciableAsset[]
}

export function buildDepreciationSummary(
  assets: DepreciationAssetInput[],
  asOf = new Date(),
  options: { maxTopAssets?: number } = {}
): DepreciationSummary {
  const depreciableAssets = assets.flatMap((asset) => {
    if (!asset.purchasePrice || asset.purchasePrice <= 0 || !asset.purchaseDate) return []
    return [buildDepreciableAsset(asset, asOf)]
  })
  const totalAcquisitionCost = roundMoney(
    depreciableAssets.reduce((sum, asset) => sum + asset.purchasePrice, 0)
  )
  const totalAccumulatedDepreciation = roundMoney(
    depreciableAssets.reduce((sum, asset) => sum + asset.accumulatedDepreciation, 0)
  )
  const totalNetBookValue = roundMoney(depreciableAssets.reduce((sum, asset) => sum + asset.netBookValue, 0))
  const maxTopAssets = options.maxTopAssets ?? 5

  return {
    totalAcquisitionCost,
    totalAccumulatedDepreciation,
    totalNetBookValue,
    missingAccountingInfoCount: assets.filter((asset) => !asset.purchasePrice || asset.purchasePrice <= 0 || !asset.purchaseDate).length,
    fullyDepreciatedCount: depreciableAssets.filter((asset) => asset.status === "fully_depreciated").length,
    depreciableAssets,
    topNetBookValueAssets: [...depreciableAssets]
      .sort((left, right) => right.netBookValue - left.netBookValue || right.purchasePrice - left.purchasePrice)
      .slice(0, maxTopAssets),
  }
}

export function inferUsefulLifeMonths(input: Pick<DepreciationAssetInput, "categoryCode" | "categoryName" | "ownershipType">) {
  const key = `${input.ownershipType ?? ""} ${input.categoryCode ?? ""} ${input.categoryName ?? ""}`.toLowerCase()
  if (key.includes("software") || key.includes("license") || key.includes("ลิขสิทธิ์")) return 36
  if (key.includes("component") || key.includes("ram") || key.includes("ส่วนควบ")) return 36
  return 60
}

function buildDepreciableAsset(asset: DepreciationAssetInput, asOf: Date): DepreciableAsset {
  const purchaseDate = new Date(asset.purchaseDate as Date | string)
  const purchasePrice = roundMoney(asset.purchasePrice ?? 0)
  const usefulLifeMonths = inferUsefulLifeMonths(asset)
  const ageMonths = Math.min(usefulLifeMonths, Math.max(0, diffWholeMonths(purchaseDate, asOf)))
  const monthlyDepreciation = roundMoney(purchasePrice / usefulLifeMonths)
  const accumulatedDepreciation = roundMoney(Math.min(purchasePrice, monthlyDepreciation * ageMonths))
  const netBookValue = roundMoney(Math.max(0, purchasePrice - accumulatedDepreciation))
  const depreciatedRatio = purchasePrice > 0 ? accumulatedDepreciation / purchasePrice : 0

  return {
    ...asset,
    purchasePrice,
    purchaseDate,
    usefulLifeMonths,
    ageMonths,
    monthlyDepreciation,
    accumulatedDepreciation,
    netBookValue,
    depreciatedRatio,
    status: netBookValue <= 0 ? "fully_depreciated" : "depreciating",
  }
}

function diffWholeMonths(start: Date, end: Date) {
  const yearDiff = end.getFullYear() - start.getFullYear()
  const monthDiff = end.getMonth() - start.getMonth()
  const dayAdjustment = end.getDate() < start.getDate() ? -1 : 0
  return yearDiff * 12 + monthDiff + dayAdjustment
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
