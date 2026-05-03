import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { RolePermissionForm } from "@/components/admin/role-permission-form"

type EditRolePageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditRolePage({ params }: EditRolePageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "role", "edit")

  const [role, permissions] = await Promise.all([
    prisma.role.findFirst({
      where: { id },
      include: { rolePermissions: { select: { permissionId: true } } },
    }),
    prisma.permission.findMany({
      select: { id: true, module: true, action: true },
      orderBy: [{ module: "asc" }, { action: "asc" }],
    }),
  ])

  if (!role) notFound()

  return (
    <RolePermissionForm
      role={{
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        displayNameTh: role.displayNameTh,
      }}
      permissions={permissions}
      selectedPermissionIds={role.rolePermissions.map((permission) => permission.permissionId)}
    />
  )
}
