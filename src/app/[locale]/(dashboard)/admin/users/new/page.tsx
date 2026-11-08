import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { loadUserFormData } from "@/lib/admin-user-form-data"
import { AdminUserForm } from "@/components/admin/admin-user-form"

type NewAdminUserPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewAdminUserPage({ params }: NewAdminUserPageProps) {
  const { locale } = await params
  const actor = await requirePagePermission(locale, "user", "create")
  const data = await loadUserFormData({ userId: null, actor })

  return <AdminUserForm data={data} canViewAssets={hasPermission(actor, "asset", "view")} />
}
