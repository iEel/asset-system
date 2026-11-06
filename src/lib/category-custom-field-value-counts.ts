import { addCustomFieldValueCounts } from "./category-custom-field-names.ts"

// G8P2-R1: the edit page reads, per custom field name, how many of the category's active assets hold a value under it.
// The assets are read in id order, 2,000 at a time after the last id read, with only the id and the JSON selected.
export const customFieldValueCountPageSize = 2000

export type CategoryAssetValuePageArgs = {
  where: { categoryId: string; isActive: true; id?: { gt: string } }
  orderBy: { id: "asc" }
  take: number
  select: { id: true; customFieldsJson: true }
}

export type CategoryAssetValuePage = { id: string; customFieldsJson: string | null }[]

// readPage is prisma.asset.findMany at the call site, so this file stays free of the database client.
export async function readCategoryCustomFieldValueCounts(
  categoryId: string,
  readPage: (args: CategoryAssetValuePageArgs) => Promise<CategoryAssetValuePage>
): Promise<Record<string, number>> {
  const counts = new Map<string, number>()
  let after: string | null = null
  for (;;) {
    const page: CategoryAssetValuePage = await readPage({
      where: { categoryId, isActive: true, ...(after ? { id: { gt: after } } : {}) },
      orderBy: { id: "asc" },
      take: customFieldValueCountPageSize,
      select: { id: true, customFieldsJson: true },
    })
    for (const asset of page) addCustomFieldValueCounts(counts, asset.customFieldsJson)
    if (page.length < customFieldValueCountPageSize) break
    after = page[page.length - 1].id
  }
  return Object.fromEntries(counts)
}
