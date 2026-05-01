import { requirePagePermission } from "@/lib/page-auth"
import { CategoryForm } from "@/components/master-data/category-form"

type NewCategoryPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewCategoryPage({ params }: NewCategoryPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "category", "create")

  return <CategoryForm />
}
