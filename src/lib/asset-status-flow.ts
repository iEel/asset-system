import { prisma } from "@/lib/db"

export const checkinReturnStatusNames = ["Ready", "Pending Repair", "Pending Disposal"] as const

export async function getRequiredAssetStatusId(name: string) {
  const status = await prisma.assetStatus.findFirst({
    where: { name, isActive: true },
    select: { id: true },
  })
  if (!status) throw new Error(`Required asset status is not configured: ${name}`)
  return status.id
}

export async function getCheckinReturnStatuses() {
  return prisma.assetStatus.findMany({
    where: { isActive: true, name: { in: [...checkinReturnStatusNames] } },
    select: { id: true, name: true, nameTh: true },
    orderBy: { sortOrder: "asc" },
  })
}

export async function isValidCheckinReturnStatus(statusId: string) {
  const status = await prisma.assetStatus.findFirst({
    where: {
      id: statusId,
      isActive: true,
      name: { in: [...checkinReturnStatusNames] },
    },
    select: { id: true },
  })
  return Boolean(status)
}
