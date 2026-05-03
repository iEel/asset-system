import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { AdminUserForm } from "@/components/admin/admin-user-form"

type NewAdminUserPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewAdminUserPage({ params }: NewAdminUserPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "user", "create")

  const [employees, roles] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true, user: null },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.role.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true, displayNameTh: true },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
  ])

  return <AdminUserForm employees={employees} roles={roles} />
}
