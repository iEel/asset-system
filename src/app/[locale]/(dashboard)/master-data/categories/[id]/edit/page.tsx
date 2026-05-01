import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { CategoryForm } from "@/components/master-data/category-form"

type EditCategoryPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "category", "edit")

  const category = await prisma.assetCategory.findFirst({
    where: { id, isActive: true },
  })

  if (!category) notFound()

  return (
    <CategoryForm
      category={{
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description,
        isActive: category.isActive,
      }}
    />
  )
}
