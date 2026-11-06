import { requirePagePermission } from "@/lib/page-auth"
import { CategoryForm } from "@/components/master-data/category-form"
import { normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { readCategoryFormContext } from "@/lib/category-form-context"

type NewCategoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function NewCategoryPage({ params, searchParams }: NewCategoryPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "categories", rawSearchParams.returnTo)
  const user = await requirePagePermission(locale, "category", "create")
  // The same form without counts: the prefix box and its example tag only (board MD-Category-Edit).
  const context = await readCategoryFormContext({ locale, user })

  return <CategoryForm backHref={returnToHref} context={context} />
}
