import { requirePagePermission } from "@/lib/page-auth"
import { prisma } from "@/lib/db"
import { RolePermissionForm } from "@/components/admin/role-permission-form"

type NewRolePageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewRolePage({ params }: NewRolePageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "role", "create")

  const permissions = await prisma.permission.findMany({
    select: { id: true, module: true, action: true },
    orderBy: [{ module: "asc" }, { action: "asc" }],
  })

  return (
    <RolePermissionForm
      role={{
        name: "",
        displayName: "",
        displayNameTh: "",
        description: "",
        isActive: true,
        isSystem: false,
      }}
      permissions={permissions}
      selectedPermissionIds={[]}
    />
  )
}
