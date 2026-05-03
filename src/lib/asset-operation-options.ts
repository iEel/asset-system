import { prisma } from "@/lib/db"
import { getCheckinReturnStatuses } from "@/lib/asset-status-flow"

export async function getAssetOperationOptions() {
  const [assets, activeCheckouts, employees, departments, locations, statuses, conditions] = await Promise.all([
    prisma.asset.findMany({
      where: { isActive: true },
      select: {
        id: true,
        assetTag: true,
        name: true,
        currentLocationId: true,
        custodianId: true,
        departmentId: true,
      },
      orderBy: { assetTag: "asc" },
    }),
    prisma.assetCheckout.findMany({
      where: { isReturned: false },
      select: {
        id: true,
        assetId: true,
        checkoutDate: true,
        checkoutType: true,
        asset: { select: { assetTag: true, name: true } },
      },
      orderBy: { checkoutDate: "desc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    getCheckinReturnStatuses(),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  const activeCheckoutAssetIds = new Set(activeCheckouts.map((checkout) => checkout.assetId))

  return {
    assets: assets.map((asset) => ({
      id: asset.id,
      label: `${asset.assetTag} - ${asset.name}`,
      disabled: activeCheckoutAssetIds.has(asset.id),
    })),
    activeCheckouts: activeCheckouts.map((checkout) => ({
      id: checkout.id,
      assetId: checkout.assetId,
      label: `${checkout.asset.assetTag} - ${checkout.asset.name}`,
      checkoutType: checkout.checkoutType,
    })),
    employees: employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` })),
    departments: departments.map((department) => ({ id: department.id, label: `${department.code} - ${department.name}` })),
    locations: locations.map((location) => ({ id: location.id, label: `${location.code} - ${location.name}` })),
    statuses: statuses.map((status) => ({ id: status.id, label: status.nameTh, name: status.name })),
    conditions: conditions.map((condition) => ({ id: condition.id, label: condition.nameTh, name: condition.name })),
  }
}
