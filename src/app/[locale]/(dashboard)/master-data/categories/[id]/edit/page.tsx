import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { CategoryForm } from "@/components/master-data/category-form"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"

type EditCategoryPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "category", "edit")

  const [category, photoChecklist] = await Promise.all([
    prisma.assetCategory.findFirst({
      where: { id, isActive: true },
      include: {
        customFieldDefs: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    getCategoryPhotoChecklist(id),
  ])

  if (!category) notFound()

  return (
    <CategoryForm
      category={{
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        customFieldDefs: category.customFieldDefs.map((field) => ({
          id: field.id,
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          fieldLabelTh: field.fieldLabelTh,
          fieldType: toCustomFieldType(field.fieldType),
          options: optionsToText(field.options),
          isRequired: field.isRequired,
          sortOrder: field.sortOrder,
          isActive: field.isActive,
        })),
        photoChecklist,
      }}
    />
  )
}

function optionsToText(options: string | null) {
  if (!options) return ""

  try {
    const parsed = JSON.parse(options) as unknown
    return Array.isArray(parsed) ? parsed.join("\n") : options
  } catch {
    return options
  }
}

function toCustomFieldType(value: string) {
  if (["text", "number", "date", "select", "boolean"].includes(value)) {
    return value as "text" | "number" | "date" | "select" | "boolean"
  }

  return "text"
}
