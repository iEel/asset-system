import { notFound } from "next/navigation"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { loadUserFormData } from "@/lib/admin-user-form-data"
import { AdminUserForm } from "@/components/admin/admin-user-form"

type EditAdminUserPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditAdminUserPage({ params }: EditAdminUserPageProps) {
  const { locale, id } = await params
  const actor = await requirePagePermission(locale, "user", "edit")
  const data = await loadUserFormData({ userId: id, actor })
  if (!data.user) notFound()

  return <AdminUserForm data={data} canViewAssets={hasPermission(actor, "asset", "view")} />
}
