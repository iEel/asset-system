import { prisma } from "@/lib/db"

export function categoryPhotoChecklistKey(categoryId: string) {
  return `asset_category_photo_checklist:${categoryId}`
}

export function parsePhotoChecklist(value?: string | null) {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean)
    }
  } catch {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

export function serializePhotoChecklist(items: string[]) {
  const normalized = Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
  return JSON.stringify(normalized)
}

export async function getCategoryPhotoChecklist(categoryId: string) {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: categoryPhotoChecklistKey(categoryId) },
    select: { value: true },
  })

  return parsePhotoChecklist(setting?.value)
}

export async function saveCategoryPhotoChecklist(categoryId: string, items: string[], userId?: string) {
  const value = serializePhotoChecklist(items)
  await prisma.systemSetting.upsert({
    where: { key: categoryPhotoChecklistKey(categoryId) },
    create: {
      key: categoryPhotoChecklistKey(categoryId),
      value,
      description: "Asset photo checklist for category",
      updatedBy: userId,
    },
    update: {
      value,
      updatedBy: userId,
    },
  })
}
