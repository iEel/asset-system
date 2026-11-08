import { notFound } from "next/navigation"
import { requirePagePermission } from "@/lib/page-auth"
import { buildUserListQuery, parseUserListFilters } from "@/lib/admin-users-list"
import { userSorts } from "@/lib/admin-users-page-data"
import { parseMasterDataListParams } from "@/lib/master-data-query"
import { loadRoleFormData } from "@/lib/role-form-data"
import { RolePermissionForm } from "@/components/admin/role-permission-form"

type EditRolePageProps = {
  params: Promise<{ locale: string; id: string }>
}

// The user list with its defaults, so ดูทั้งหมดในหน้าจัดการผู้ใช้ opens exactly /admin/users?role=<id> (as the role list).
const USER_LIST_DEFAULT_STATE = parseMasterDataListParams({ input: {}, allowedSorts: userSorts, defaultSort: "createdAt" })
const USER_LIST_DEFAULT_FILTERS = parseUserListFilters({})

export default async function EditRolePage({ params }: EditRolePageProps) {
  const { locale, id } = await params
  const actor = await requirePagePermission(locale, "role", "edit")
  const data = await loadRoleFormData({ roleId: id, actor })
  if (!data) notFound()
  const usersHref = `/${locale}/admin/users?${buildUserListQuery(USER_LIST_DEFAULT_STATE, USER_LIST_DEFAULT_FILTERS, { roleId: id })}`

  return <RolePermissionForm data={data} usersHref={usersHref} />
}
