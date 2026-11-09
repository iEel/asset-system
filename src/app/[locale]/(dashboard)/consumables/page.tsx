import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { listConsumablesWithUsage } from "@/lib/consumable-service"
import { requirePagePermission } from "@/lib/page-auth"
import { ConsumablesWorkspace } from "@/components/consumables/consumables-workspace"

// ของใช้สิ้นเปลือง (consumables plan 2 Task 2): the IT room's spare cabinet, one row per active kind with its count,
// minimum, stock state and 90-day use. consumable:view opens the page; create (issue, receive) and edit (adjust, add,
// edit, deactivate) decide which buttons the workspace renders.
type ConsumablesPageProps = {
  params: Promise<{ locale: string }>
}

export default async function ConsumablesPage({ params }: ConsumablesPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "consumable", "view")
  const canCreate = hasPermission(user, "consumable", "create")
  const canEdit = hasPermission(user, "consumable", "edit")
  const rows = await listConsumablesWithUsage(prisma)

  return <ConsumablesWorkspace locale={locale} rows={rows} canCreate={canCreate} canEdit={canEdit} />
}
