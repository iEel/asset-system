import { prisma } from "@/lib/db"

// True when Admin > Settings has LDAP sync on: the same ldap_sync_enabled row applyLdapSync requires before it writes.
// While it is on, the sync owns every employee's "ใช้งาน" (user decision 2026-10-21 Y4).
export async function isLdapSyncEnabled(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "ldap_sync_enabled" }, select: { value: true } })
  return setting?.value === "true"
}
