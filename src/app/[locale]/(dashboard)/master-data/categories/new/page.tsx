import { requirePagePermission } from "@/lib/page-auth"
import { CategoryForm } from "@/components/master-data/category-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type NewCategoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewCategoryPage({ params, searchParams }: NewCategoryPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "categories", rawSearchParams.returnTo)
  await requirePagePermission(locale, "category", "create")

  return <CategoryForm backHref={returnToHref} />
}
