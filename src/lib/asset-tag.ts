import { prisma } from "@/lib/db"
import {
  assetTagCategoryPrefixesKey,
  assetTagFormatTemplateKey,
  defaultAssetTagFormatTemplate,
} from "@/lib/system-setting-defaults"
import { getNextAssetTagRunningNumber } from "@/lib/asset-tag-sequence"

function parseCategoryPrefixes(value?: string | null) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([categoryId, prefix]) => [categoryId, typeof prefix === "string" ? prefix.trim().toUpperCase() : ""])
        .filter(([, prefix]) => prefix)
    )
  } catch {
    return {}
  }
}

function normalizeSeparator(value?: string | null) {
  const separator = value?.trim()
  return separator || "-"
}

function normalizeRunningDigits(value?: string | null) {
  const digits = Number(value ?? 5)
  return Number.isFinite(digits) && digits > 0 ? Math.min(Math.floor(digits), 12) : 5
}

function renderAssetTagTemplate(template: string | null | undefined, tokens: Record<string, string>) {
  const safeTemplate = template?.trim() || defaultAssetTagFormatTemplate
  const templateWithRunning = safeTemplate.includes("{running}")
    ? safeTemplate
    : defaultAssetTagFormatTemplate

  return templateWithRunning.replace(/\{([A-Za-z0-9]+)\}/g, (_match, token: string) => tokens[token] ?? "")
}

function renderSequencePrefix(template: string | null | undefined, tokens: Record<string, string>) {
  const safeTemplate = template?.trim() || defaultAssetTagFormatTemplate
  const templateWithRunning = safeTemplate.includes("{running}")
    ? safeTemplate
    : defaultAssetTagFormatTemplate
  return renderAssetTagTemplate(templateWithRunning.slice(0, templateWithRunning.indexOf("{running}")), tokens)
}

function renderSequenceSuffix(template: string | null | undefined, tokens: Record<string, string>) {
  const safeTemplate = template?.trim() || defaultAssetTagFormatTemplate
  const templateWithRunning = safeTemplate.includes("{running}")
    ? safeTemplate
    : defaultAssetTagFormatTemplate
  const runningEndIndex = templateWithRunning.indexOf("{running}") + "{running}".length
  return renderAssetTagTemplate(templateWithRunning.slice(runningEndIndex), tokens)
}

export async function generateAssetTag({
  companyId,
  branchId,
  categoryId,
}: {
  companyId: string
  branchId: string
  categoryId: string
}) {
  const [
    company,
    branch,
    category,
    digitsSetting,
    separatorSetting,
    prefixSetting,
    formatSetting,
    categoryPrefixesSetting,
  ] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { code: true, assetTagCode: true } }),
    prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } }),
    prisma.assetCategory.findUnique({ where: { id: categoryId }, select: { code: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_running_digits" }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_separator" }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_prefix" }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: assetTagFormatTemplateKey }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: assetTagCategoryPrefixesKey }, select: { value: true } }),
  ])

  if (!company || !branch || !category) {
    throw new Error("Invalid asset tag master data")
  }

  const digits = normalizeRunningDigits(digitsSetting?.value)
  const separator = normalizeSeparator(separatorSetting?.value)
  const categoryPrefixes = parseCategoryPrefixes(categoryPrefixesSetting?.value)
  const categorySegment = categoryPrefixes[categoryId] ?? category.code
  const now = new Date()
  const baseTokens = {
    companyCode: company.code,
    assetCompanyCode: company.assetTagCode?.trim() || company.code,
    branchCode: branch.code,
    categoryCode: category.code,
    assetPrefix: categorySegment,
    globalPrefix: prefixSetting?.value?.trim() || "AST",
    separator,
    year: String(now.getFullYear()),
    year2: String(now.getFullYear()).slice(-2),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    day: String(now.getDate()).padStart(2, "0"),
  }
  const sequencePrefix = renderSequencePrefix(formatSetting?.value, baseTokens)
  const sequenceSuffix = renderSequenceSuffix(formatSetting?.value, baseTokens)
  const existingAssets = await prisma.asset.findMany({
    where: {
      assetTag: { startsWith: sequencePrefix },
    },
    select: { assetTag: true },
  })
  let nextRunning = getNextAssetTagRunningNumber({
    existingAssetTags: existingAssets.map((asset) => asset.assetTag),
    sequencePrefix,
    sequenceSuffix,
    runningDigits: digits,
  })

  for (let offset = 1; offset <= 100; offset += 1) {
    const running = String(nextRunning).padStart(digits, "0")
    const assetTag = renderAssetTagTemplate(formatSetting?.value, { ...baseTokens, running })
    const existing = await prisma.asset.findUnique({ where: { assetTag }, select: { id: true } })
    if (!existing) return assetTag
    nextRunning += 1
  }

  throw new Error("Unable to generate unique asset tag")
}
