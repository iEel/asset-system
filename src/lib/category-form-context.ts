import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { buildCategoryDrilldownHrefs, buildCategoryPrefixSettingsHref } from "@/lib/category-list-query"
import { readCategoryCustomFieldValueCounts } from "@/lib/category-custom-field-value-counts"
import { categoryPrefixFor, parsePrefixRows, type AssetTagExampleParts } from "@/lib/category-prefix-groups"
import { chunkListIds } from "@/lib/master-data-list-ui"
import { assetTagCategoryPrefixesKey, assetTagFormatTemplateKey, defaultAssetTagFormatTemplate } from "@/lib/system-setting-defaults"

// What the category form shows beside its fields (board MD-Category-Edit), read by the new and edit pages.
export type CategoryFormContext = {
  // The read-only prefix box: the prefix from the settings (null: the category code is used), the active categories
  // sharing it, and the settings link (setting:view only).
  prefix: string | null
  sharedWith: string[]
  settingsHref: string | null
  tagExample: AssetTagExampleParts
  // Edit only: "ใช้อยู่กับ {m} รุ่น และ {a} ทรัพย์สิน" (active ones, as the list counts), each linked with its list's view
  // permission; and G8P2-R1's per-field-name count of active assets holding a value.
  usage: { models: number; assets: number; modelsHref: string | null; assetsHref: string | null } | null
  fieldValueCounts: Record<string, number>
}

type SessionUser = Parameters<typeof hasPermission>[0]

const TAG_SETTING_KEYS = [assetTagCategoryPrefixesKey, assetTagFormatTemplateKey, "asset_tag_separator", "asset_tag_prefix", "asset_tag_running_digits"]

export async function readCategoryFormContext({
  locale,
  user,
  categoryId,
}: {
  locale: string
  user: SessionUser
  categoryId?: string
}): Promise<CategoryFormContext> {
  const [settings, company, usage, fieldValueCounts] = await Promise.all([
    prisma.systemSetting.findMany({ where: { key: { in: TAG_SETTING_KEYS } }, select: { key: true, value: true } }),
    // The example tag needs one company and branch code: the first active company by code and its first active branch.
    prisma.company.findFirst({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { code: true, assetTagCode: true, branches: { where: { isActive: true }, orderBy: { code: "asc" }, take: 1, select: { code: true } } },
    }),
    categoryId
      ? Promise.all([
          prisma.assetModel.count({ where: { categoryId, isActive: true } }),
          prisma.asset.count({ where: { categoryId, isActive: true } }),
        ])
      : Promise.resolve(null),
    categoryId ? readCategoryCustomFieldValueCounts(categoryId, (args) => prisma.asset.findMany(args)) : Promise.resolve({}),
  ])
  const setting = (key: string) => settings.find((row) => row.key === key)?.value ?? ""
  const { prefix, sharedWithIds } = categoryPrefixFor(parsePrefixRows(setting(assetTagCategoryPrefixesKey)), categoryId)
  // "ใช้ร่วมกับ {names}": the active categories of the group, read in id chunks of 2,000.
  const shared = (
    await Promise.all(
      chunkListIds(sharedWithIds).map((chunk) =>
        prisma.assetCategory.findMany({ where: { id: { in: chunk }, isActive: true }, select: { name: true } })
      )
    )
  ).flat()
  const digits = Number(setting("asset_tag_running_digits") || 5)
  const hrefs = categoryId ? buildCategoryDrilldownHrefs({ locale, categoryId }) : null

  return {
    prefix,
    sharedWith: shared.map((category) => category.name).sort((a, b) => a.localeCompare(b, "th")),
    settingsHref: hasPermission(user, "setting", "view") ? buildCategoryPrefixSettingsHref(locale) : null,
    tagExample: {
      template: setting(assetTagFormatTemplateKey) || defaultAssetTagFormatTemplate,
      separator: setting("asset_tag_separator"),
      globalPrefix: setting("asset_tag_prefix"),
      companyCode: company?.assetTagCode?.trim() || company?.code || "CO",
      branchCode: company?.branches[0]?.code ?? "HQ",
      runningDigits: Number.isFinite(digits) && digits > 0 ? Math.min(Math.floor(digits), 12) : 5,
      year: new Date().getFullYear(),
    },
    usage:
      usage && hrefs
        ? {
            models: usage[0],
            assets: usage[1],
            modelsHref: hasPermission(user, "brand", "view") ? hrefs.models : null,
            assetsHref: hasPermission(user, "asset", "view") ? hrefs.assets : null,
          }
        : null,
    fieldValueCounts,
  }
}
