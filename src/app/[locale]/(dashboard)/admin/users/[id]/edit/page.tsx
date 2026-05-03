import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AdminUserForm } from "@/components/admin/admin-user-form"

type EditAdminUserPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditAdminUserPage({ params }: EditAdminUserPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "user", "edit")

  const [user, employees, roles] = await Promise.all([
    prisma.user.findFirst({
      where: { id },
      include: { userRoles: { select: { roleId: true } } },
    }),
    prisma.employee.findMany({
      where: { isActive: true, OR: [{ user: null }, { user: { id } }] },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.role.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true, displayNameTh: true },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
  ])

  if (!user) notFound()

  return (
    <AdminUserForm
      employees={employees}
      roles={roles}
      user={{
        id: user.id,
        username: user.username,
        password: "",
        displayName: user.displayName,
        email: user.email,
        employeeId: user.employeeId,
        roleIds: user.userRoles.map((role) => role.roleId),
        isActive: user.isActive,
      }}
    />
  )
}
