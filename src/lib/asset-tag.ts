import { prisma } from "@/lib/db"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"

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

export async function generateAssetTag({
  companyId,
  branchId,
  categoryId,
}: {
  companyId: string
  branchId: string
  categoryId: string
}) {
  const [company, branch, category, digitsSetting, separatorSetting, categoryPrefixesSetting] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { code: true } }),
    prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } }),
    prisma.assetCategory.findUnique({ where: { id: categoryId }, select: { code: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_running_digits" }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_separator" }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: assetTagCategoryPrefixesKey }, select: { value: true } }),
  ])

  if (!company || !branch || !category) {
    throw new Error("Invalid asset tag master data")
  }

  const digits = Number(digitsSetting?.value ?? 5)
  const separator = normalizeSeparator(separatorSetting?.value)
  const categoryPrefixes = parseCategoryPrefixes(categoryPrefixesSetting?.value)
  const categorySegment = categoryPrefixes[categoryId] ?? category.code
  const prefix = [company.code, branch.code, categorySegment].join(separator)
  const count = await prisma.asset.count({
    where: {
      companyId,
      branchId,
      categoryId,
      assetTag: { startsWith: `${prefix}${separator}` },
    },
  })

  for (let offset = 1; offset <= 100; offset += 1) {
    const running = String(count + offset).padStart(Number.isFinite(digits) ? digits : 5, "0")
    const assetTag = [prefix, running].join(separator)
    const existing = await prisma.asset.findUnique({ where: { assetTag }, select: { id: true } })
    if (!existing) return assetTag
  }

  throw new Error("Unable to generate unique asset tag")
}
