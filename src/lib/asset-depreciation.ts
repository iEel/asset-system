export type DepreciationStatus = "depreciating" | "fully_depreciated"

export const depreciationPolicySettingKey = "accounting_depreciation_policy"

export type DepreciationPolicyRule = {
  match: string
  usefulLifeMonths: number
  residualRate?: number
}

export type DepreciationPolicy = {
  defaultUsefulLifeMonths: number
  defaultResidualRate: number
  rules: DepreciationPolicyRule[]
}

export type DepreciationPolicyParseResult = {
  policy: DepreciationPolicy
  isValid: boolean
  errors: string[]
}

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
  residualRate: number
  residualValue: number
  depreciableCost: number
  ageMonths: number
  monthlyDepreciation: number
  accumulatedDepreciation: number
  netBookValue: number
  depreciatedRatio: number
  status: DepreciationStatus
}

export type DepreciationSummary = {
  totalAcquisitionCost: number
  totalResidualValue: number
  totalDepreciableCost: number
  totalAccumulatedDepreciation: number
  totalNetBookValue: number
  missingAccountingInfoCount: number
  fullyDepreciatedCount: number
  depreciableAssets: DepreciableAsset[]
  topNetBookValueAssets: DepreciableAsset[]
}

export type DepreciationPeriodSnapshot = {
  period: string
  generatedAt: string
  lockState: "draft" | "locked"
  assetCount: number
  totals: {
    acquisitionCost: number
    residualValue: number
    depreciableCost: number
    accumulatedDepreciation: number
    netBookValue: number
  }
  assets: Array<{
    id: string
    label: string
    purchasePrice: number
    accumulatedDepreciation: number
    netBookValue: number
    status: DepreciationStatus
  }>
}

export const defaultDepreciationPolicy: DepreciationPolicy = {
  defaultUsefulLifeMonths: 60,
  defaultResidualRate: 0,
  rules: [
    { match: "software_license", usefulLifeMonths: 36, residualRate: 0 },
    { match: "License", usefulLifeMonths: 36, residualRate: 0 },
    { match: "Software", usefulLifeMonths: 36, residualRate: 0 },
    { match: "Computer Component", usefulLifeMonths: 36, residualRate: 0 },
    { match: "RAM", usefulLifeMonths: 36, residualRate: 0 },
  ],
}

export function buildDepreciationSummary(
  assets: DepreciationAssetInput[],
  asOf = new Date(),
  options: { maxTopAssets?: number; policy?: DepreciationPolicy } = {}
): DepreciationSummary {
  const policy = normalizeDepreciationPolicy(options.policy ?? defaultDepreciationPolicy)
  const depreciableAssets = assets.flatMap((asset) => {
    if (!asset.purchasePrice || asset.purchasePrice <= 0 || !asset.purchaseDate) return []
    return [buildDepreciableAsset(asset, asOf, policy)]
  })
  const totalAcquisitionCost = roundMoney(
    depreciableAssets.reduce((sum, asset) => sum + asset.purchasePrice, 0)
  )
  const totalResidualValue = roundMoney(depreciableAssets.reduce((sum, asset) => sum + asset.residualValue, 0))
  const totalDepreciableCost = roundMoney(depreciableAssets.reduce((sum, asset) => sum + asset.depreciableCost, 0))
  const totalAccumulatedDepreciation = roundMoney(
    depreciableAssets.reduce((sum, asset) => sum + asset.accumulatedDepreciation, 0)
  )
  const totalNetBookValue = roundMoney(depreciableAssets.reduce((sum, asset) => sum + asset.netBookValue, 0))
  const maxTopAssets = options.maxTopAssets ?? 5

  return {
    totalAcquisitionCost,
    totalResidualValue,
    totalDepreciableCost,
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

export function buildDepreciationPeriodSnapshot({
  period,
  summary,
  generatedAt = new Date(),
  lockState = "draft",
}: {
  period: string
  summary: DepreciationSummary
  generatedAt?: Date
  lockState?: "draft" | "locked"
}): DepreciationPeriodSnapshot {
  return {
    period,
    generatedAt: generatedAt.toISOString(),
    lockState,
    assetCount: summary.depreciableAssets.length,
    totals: {
      acquisitionCost: summary.totalAcquisitionCost,
      residualValue: summary.totalResidualValue,
      depreciableCost: summary.totalDepreciableCost,
      accumulatedDepreciation: summary.totalAccumulatedDepreciation,
      netBookValue: summary.totalNetBookValue,
    },
    assets: summary.depreciableAssets.map((asset) => ({
      id: asset.id,
      label: asset.label,
      purchasePrice: asset.purchasePrice,
      accumulatedDepreciation: asset.accumulatedDepreciation,
      netBookValue: asset.netBookValue,
      status: asset.status,
    })),
  }
}

export function inferUsefulLifeMonths(
  input: Pick<DepreciationAssetInput, "categoryCode" | "categoryName" | "ownershipType">,
  policy: DepreciationPolicy = defaultDepreciationPolicy
) {
  return resolveDepreciationPolicyForAsset(input, policy).usefulLifeMonths
}

export function resolveDepreciationPolicyForAsset(
  input: Pick<DepreciationAssetInput, "categoryCode" | "categoryName" | "ownershipType">,
  policy: DepreciationPolicy = defaultDepreciationPolicy
) {
  const normalizedPolicy = normalizeDepreciationPolicy(policy)
  const key = `${input.ownershipType ?? ""} ${input.categoryCode ?? ""} ${input.categoryName ?? ""}`.toLowerCase()
  const matchedRule = normalizedPolicy.rules.find((rule) => key.includes(rule.match.trim().toLowerCase()))
  return {
    usefulLifeMonths: matchedRule?.usefulLifeMonths ?? normalizedPolicy.defaultUsefulLifeMonths,
    residualRate: clampRate(matchedRule?.residualRate ?? normalizedPolicy.defaultResidualRate),
  }
}

export function parseDepreciationPolicySetting(value: string | null | undefined): DepreciationPolicyParseResult {
  if (!value || value.trim().length === 0) {
    return { policy: defaultDepreciationPolicy, isValid: true, errors: [] }
  }

  try {
    const parsed = JSON.parse(value) as Partial<DepreciationPolicy>
    const rawPolicy = {
      defaultUsefulLifeMonths: Number(parsed.defaultUsefulLifeMonths),
      defaultResidualRate: Number(parsed.defaultResidualRate ?? 0),
      rules: Array.isArray(parsed.rules)
        ? parsed.rules.map((rule) => ({
            match: String(rule?.match ?? ""),
            usefulLifeMonths: Number(rule?.usefulLifeMonths),
            residualRate: rule?.residualRate == null ? undefined : Number(rule.residualRate),
          }))
        : [],
    } satisfies DepreciationPolicy
    const errors = validateDepreciationPolicy(rawPolicy)
    return {
      policy: errors.length === 0 ? normalizeDepreciationPolicy(rawPolicy) : defaultDepreciationPolicy,
      isValid: errors.length === 0,
      errors,
    }
  } catch {
    return {
      policy: defaultDepreciationPolicy,
      isValid: false,
      errors: ["Depreciation policy must be valid JSON"],
    }
  }
}

function inferLegacyUsefulLifeMonths(input: Pick<DepreciationAssetInput, "categoryCode" | "categoryName" | "ownershipType">) {
  const key = `${input.ownershipType ?? ""} ${input.categoryCode ?? ""} ${input.categoryName ?? ""}`.toLowerCase()
  if (key.includes("software") || key.includes("license") || key.includes("ลิขสิทธิ์")) return 36
  if (key.includes("component") || key.includes("ram") || key.includes("ส่วนควบ")) return 36
  return 60
}

function buildDepreciableAsset(asset: DepreciationAssetInput, asOf: Date, policy: DepreciationPolicy): DepreciableAsset {
  const purchaseDate = new Date(asset.purchaseDate as Date | string)
  const purchasePrice = roundMoney(asset.purchasePrice ?? 0)
  const resolvedPolicy = resolveDepreciationPolicyForAsset(asset, policy)
  const usefulLifeMonths = resolvedPolicy.usefulLifeMonths
  const residualRate = resolvedPolicy.residualRate
  const residualValue = roundMoney(purchasePrice * residualRate)
  const depreciableCost = roundMoney(Math.max(0, purchasePrice - residualValue))
  const ageMonths = Math.min(usefulLifeMonths, Math.max(0, diffWholeMonths(purchaseDate, asOf)))
  const monthlyDepreciation = roundMoney(depreciableCost / usefulLifeMonths)
  const accumulatedDepreciation = roundMoney(Math.min(depreciableCost, monthlyDepreciation * ageMonths))
  const netBookValue = roundMoney(Math.max(0, purchasePrice - accumulatedDepreciation))
  const depreciatedRatio = depreciableCost > 0 ? accumulatedDepreciation / depreciableCost : 0

  return {
    ...asset,
    purchasePrice,
    purchaseDate,
    usefulLifeMonths,
    residualRate,
    residualValue,
    depreciableCost,
    ageMonths,
    monthlyDepreciation,
    accumulatedDepreciation,
    netBookValue,
    depreciatedRatio,
    status: accumulatedDepreciation >= depreciableCost ? "fully_depreciated" : "depreciating",
  }
}

function normalizeDepreciationPolicy(policy: DepreciationPolicy): DepreciationPolicy {
  return {
    defaultUsefulLifeMonths: normalizeUsefulLifeMonths(policy.defaultUsefulLifeMonths, defaultDepreciationPolicy.defaultUsefulLifeMonths),
    defaultResidualRate: clampRate(policy.defaultResidualRate),
    rules: policy.rules
      .map((rule) => ({
        match: String(rule.match ?? "").trim(),
        usefulLifeMonths: normalizeUsefulLifeMonths(rule.usefulLifeMonths, inferLegacyUsefulLifeMonths({ categoryCode: rule.match, categoryName: null, ownershipType: null })),
        residualRate: clampRate(rule.residualRate ?? policy.defaultResidualRate ?? 0),
      }))
      .filter((rule) => rule.match.length > 0),
  }
}

function validateDepreciationPolicy(policy: DepreciationPolicy) {
  const errors: string[] = []
  if (!Number.isInteger(policy.defaultUsefulLifeMonths) || policy.defaultUsefulLifeMonths < 1 || policy.defaultUsefulLifeMonths > 600) {
    errors.push("Default useful life must be 1-600 months")
  }
  if (!Number.isFinite(policy.defaultResidualRate) || policy.defaultResidualRate < 0 || policy.defaultResidualRate > 0.9) {
    errors.push("Default residual rate must be between 0 and 0.9")
  }
  for (const rule of policy.rules) {
    if (!rule.match.trim()) errors.push("Rule match is required")
    if (!Number.isInteger(rule.usefulLifeMonths) || rule.usefulLifeMonths < 1 || rule.usefulLifeMonths > 600) {
      errors.push(`Useful life for ${rule.match || "rule"} must be 1-600 months`)
    }
    if (!Number.isFinite(rule.residualRate ?? 0) || (rule.residualRate ?? 0) < 0 || (rule.residualRate ?? 0) > 0.9) {
      errors.push(`Residual rate for ${rule.match || "rule"} must be between 0 and 0.9`)
    }
  }
  return errors
}

function normalizeUsefulLifeMonths(value: number, fallback: number) {
  return Number.isInteger(value) && value >= 1 && value <= 600 ? value : fallback
}

function clampRate(value: number) {
  return Number.isFinite(value) ? Math.min(0.9, Math.max(0, value)) : 0
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
