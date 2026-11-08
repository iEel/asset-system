import { notFound } from "next/navigation"
import { requirePagePermission } from "@/lib/page-auth"
import { loadRoleFormData } from "@/lib/role-form-data"
import { RolePermissionForm } from "@/components/admin/role-permission-form"

type NewRolePageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewRolePage({ params }: NewRolePageProps) {
  const { locale } = await params
  const actor = await requirePagePermission(locale, "role", "create")
  const data = await loadRoleFormData({ roleId: null, actor })
  if (!data) notFound()

  return <RolePermissionForm data={data} />
}
