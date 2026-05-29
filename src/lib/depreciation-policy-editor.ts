import {
  buildDepreciationSummary,
  type DepreciationPolicy,
  type DepreciationPolicyRule,
} from "./asset-depreciation.ts"

export type DepreciationPolicyEditorCategory = {
  id: string
  code: string
  name: string
}

export type DepreciationPolicyEditorGroup = {
  id: string
  name: string
  usefulLifeMonths: number
  residualRatePercent: number
  categoryIds: string[]
  sourceOrder?: number
  sourceRule?: LabeledPolicyRule
}

export type DepreciationPolicyEditorState = {
  defaultUsefulLifeMonths: number
  defaultResidualRatePercent: number
  groups: DepreciationPolicyEditorGroup[]
  legacyRules: LegacyPolicyRule[]
  unassignedCategoryIds: string[]
}

export type DepreciationPolicyPreviewInput = {
  purchasePrice: number
  purchaseDate: string
  asOf?: Date
  usefulLifeMonths: number
  residualRatePercent: number
}

export type DepreciationPolicyPreview = {
  monthlyDepreciation: number
  ageMonths: number
  accumulatedDepreciation: number
  netBookValue: number
  residualValue: number
}

type LabeledPolicyRule = DepreciationPolicyRule & {
  label?: string
  [metadata: string]: unknown
}

type LegacyPolicyRule = LabeledPolicyRule & {
  sourceOrder?: number
}

export function buildDepreciationPolicyEditorState(
  policy: DepreciationPolicy,
  categories: DepreciationPolicyEditorCategory[]
): DepreciationPolicyEditorState {
  const usedCategoryIds = new Set<string>()
  const groups: DepreciationPolicyEditorGroup[] = []
  const legacyRules: LegacyPolicyRule[] = []

  for (const [index, rule] of (policy.rules as LabeledPolicyRule[]).entries()) {
    const category = findCategoryForRule(rule, categories)
    if (!category) {
      legacyRules.push({ ...rule, sourceOrder: index })
      continue
    }

    usedCategoryIds.add(category.id)
    const residualRatePercent = rateToPercent(rule.residualRate ?? policy.defaultResidualRate)
    groups.push({
      id: buildStableGroupId(rule, groups.length + 1),
      name: rule.label?.trim() || `${category.code} policy`,
      usefulLifeMonths: rule.usefulLifeMonths,
      residualRatePercent,
      categoryIds: [category.id],
      sourceOrder: index,
      sourceRule: { ...rule },
    })
  }

  return {
    defaultUsefulLifeMonths: policy.defaultUsefulLifeMonths,
    defaultResidualRatePercent: rateToPercent(policy.defaultResidualRate),
    groups,
    legacyRules,
    unassignedCategoryIds: categories.filter((category) => !usedCategoryIds.has(category.id)).map((category) => category.id),
  }
}

export function serializeDepreciationPolicyEditorState(
  state: DepreciationPolicyEditorState,
  categories: DepreciationPolicyEditorCategory[]
): DepreciationPolicy & { rules: LabeledPolicyRule[] } {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const assignedCategoryIds = new Set<string>()
  const orderedRules: Array<{ order: number; sequence: number; rule: LabeledPolicyRule }> = []
  let sequence = 0

  for (const group of state.groups) {
    for (const categoryId of dedupeKnownCategoryIds(group.categoryIds, categories)) {
      if (assignedCategoryIds.has(categoryId)) continue
      assignedCategoryIds.add(categoryId)

      const category = categoryById.get(categoryId)
      if (!category) continue

      orderedRules.push({
        order: group.sourceOrder ?? Number.MAX_SAFE_INTEGER,
        sequence: sequence++,
        rule: {
          ...group.sourceRule,
        match: category.code,
        usefulLifeMonths: group.usefulLifeMonths,
        residualRate: percentToRate(group.residualRatePercent),
        label: group.name.trim() || `${category.code} policy`,
        },
      })
    }
  }

  orderedRules.push(
    ...state.legacyRules.map((rule) => ({
      order: rule.sourceOrder ?? Number.MAX_SAFE_INTEGER,
      sequence: sequence++,
      rule: stripEditorMetadata(rule),
    }))
  )

  return {
    defaultUsefulLifeMonths: state.defaultUsefulLifeMonths,
    defaultResidualRate: percentToRate(state.defaultResidualRatePercent),
    rules: orderedRules
      .sort((left, right) => left.order - right.order || left.sequence - right.sequence)
      .map(({ rule }) => rule),
  }
}

export function buildDepreciationPolicyPreview(input: DepreciationPolicyPreviewInput): DepreciationPolicyPreview {
  const summary = buildDepreciationSummary(
    [
      {
        id: "preview",
        label: "Preview asset",
        categoryCode: "Preview",
        categoryName: "Preview",
        ownershipType: "preview",
        purchasePrice: input.purchasePrice,
        purchaseDate: input.purchaseDate,
      },
    ],
    input.asOf ?? new Date(),
    {
      policy: {
        defaultUsefulLifeMonths: input.usefulLifeMonths,
        defaultResidualRate: percentToRate(input.residualRatePercent),
        rules: [],
      },
    }
  )
  const asset = summary.depreciableAssets[0]

  return {
    monthlyDepreciation: asset?.monthlyDepreciation ?? 0,
    ageMonths: asset?.ageMonths ?? 0,
    accumulatedDepreciation: asset?.accumulatedDepreciation ?? 0,
    netBookValue: asset?.netBookValue ?? input.purchasePrice,
    residualValue: asset?.residualValue ?? 0,
  }
}

export function percentToRate(percent: number) {
  if (!Number.isFinite(percent)) return 0
  return Math.round(percent * 100) / 10000
}

export function rateToPercent(rate: number | undefined) {
  if (!Number.isFinite(rate ?? 0)) return 0
  return Math.round((rate ?? 0) * 10000) / 100
}

function findCategoryForRule(rule: DepreciationPolicyRule, categories: DepreciationPolicyEditorCategory[]) {
  const match = rule.match.trim().toLowerCase()
  return categories.find((category) => category.code.toLowerCase() === match || category.name.toLowerCase() === match)
}

function buildStableGroupId(rule: DepreciationPolicyRule, index: number) {
  const slug = rule.match.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `group-${slug || "policy"}-${index}`
}

function stripEditorMetadata(rule: LegacyPolicyRule): LabeledPolicyRule {
  const { sourceOrder: _sourceOrder, ...serializedRule } = rule
  return serializedRule
}

function dedupeKnownCategoryIds(categoryIds: string[], categories: DepreciationPolicyEditorCategory[]) {
  const knownCategoryIds = new Set(categories.map((category) => category.id))
  const uniqueIds: string[] = []
  for (const categoryId of categoryIds) {
    if (!knownCategoryIds.has(categoryId) || uniqueIds.includes(categoryId)) continue
    uniqueIds.push(categoryId)
  }
  return uniqueIds
}
