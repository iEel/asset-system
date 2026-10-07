import { prisma } from "@/lib/db"
import { getCheckinReturnStatuses } from "@/lib/asset-status-flow"
import { isAssetHandoverMode } from "@/lib/asset-handover-mode"
import {
  filterCheckoutEligibleAssets,
  filterLegacyReturnEligibleAssets,
  filterPersonalTransferEligibleAssets,
  getAssetOperationConditionOptions,
} from "@/lib/asset-lifecycle-policy"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"

export async function getAssetOperationOptions() {
  const [assets, activeCheckouts, activeMaintenanceTickets, employees, departments, locations, statuses, conditions] = await Promise.all([
    prisma.asset.findMany({
      where: { isActive: true },
      select: {
        id: true,
        assetTag: true,
        name: true,
        currentLocationId: true,
        custodianId: true,
        conditionId: true,
        departmentId: true,
        status: { select: { name: true, nameTh: true } },
        custodian: { select: { code: true, fullNameTh: true } },
      },
      orderBy: { assetTag: "asc" },
    }),
    prisma.assetCheckout.findMany({
      where: { isReturned: false, transactionStatus: "active" },
      select: {
        id: true,
        documentNo: true,
        assetId: true,
        departmentId: true,
        locationId: true,
        parentAssetId: true,
        checkoutDate: true,
        expectedReturnDate: true,
        checkoutType: true,
        handoverMode: true,
        conditionBefore: true,
        remark: true,
        custodian: { select: { code: true, fullNameTh: true } },
        asset: {
          select: {
            assetTag: true,
            name: true,
            serialNumber: true,
            status: { select: { name: true, nameTh: true } },
          },
        },
      },
      orderBy: { checkoutDate: "desc" },
    }),
    prisma.maintenanceTicket.findMany({ where: openRepairRecordWhere, select: { assetId: true } }),
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
  const activeMaintenanceAssetIds = new Set(activeMaintenanceTickets.map((ticket) => ticket.assetId))
  const assetLabelById = new Map(assets.map((asset) => [asset.id, `${asset.assetTag} - ${asset.name}`]))
  const departmentLabelById = new Map(departments.map((department) => [department.id, `${department.code} - ${department.name}`]))
  const locationLabelById = new Map(locations.map((location) => [location.id, `${location.code} - ${location.name}`]))
  type LegacyReturnAsset = (typeof assets)[number] & { custodianId: string }
  const checkoutEligibleAssets = filterCheckoutEligibleAssets(assets)
  const personalTransferEligibleIds = new Set(filterPersonalTransferEligibleAssets(assets).map((asset) => asset.id))
  const legacyReturnAssets = filterLegacyReturnEligibleAssets(assets.map((asset) => ({
    ...asset,
    hasOpenCheckout: activeCheckoutAssetIds.has(asset.id),
    hasActiveMaintenance: activeMaintenanceAssetIds.has(asset.id),
  }))).filter((asset): asset is LegacyReturnAsset & { hasOpenCheckout: boolean; hasActiveMaintenance: boolean } => Boolean(asset.custodianId))

  const mapAssetOption = (asset: (typeof assets)[number]) => ({
    id: asset.id,
    label: `${asset.assetTag} - ${asset.name}`,
    disabled: activeCheckoutAssetIds.has(asset.id),
    statusName: asset.status.name,
    personalTransferEligible: personalTransferEligibleIds.has(asset.id),
  })

  return {
    assets: assets.map(mapAssetOption),
    checkoutAssets: checkoutEligibleAssets.map(mapAssetOption),
    personalTransferAssets: filterPersonalTransferEligibleAssets(assets).map(mapAssetOption),
    activeCheckouts: activeCheckouts.map((checkout) => ({
      id: checkout.id,
      documentNo: checkout.documentNo,
      assetId: checkout.assetId,
      label: `${checkout.asset.assetTag} - ${checkout.asset.name}`,
      disabled: !isAssetHandoverMode(checkout.handoverMode),
      disabledReason: "ASSET_HANDOVER_MODE_MISSING",
      assetTag: checkout.asset.assetTag,
      assetName: checkout.asset.name,
      serialNumber: checkout.asset.serialNumber,
      checkoutType: checkout.checkoutType,
      handoverMode: checkout.handoverMode,
      statusName: checkout.asset.status.name,
      statusLabel: checkout.asset.status.nameTh,
      checkoutDate: checkout.checkoutDate.toISOString(),
      expectedReturnDate: checkout.expectedReturnDate?.toISOString() ?? null,
      conditionBefore: checkout.conditionBefore,
      destinationLabel: getCheckoutDestinationLabel(checkout, {
        departments: departmentLabelById,
        locations: locationLabelById,
        assets: assetLabelById,
      }),
      remark: checkout.remark,
    })),
    legacyReturnCandidates: legacyReturnAssets
      .map((asset) => ({
        id: asset.id,
        label: `${asset.assetTag} - ${asset.name}`,
        assetTag: asset.assetTag,
        assetName: asset.name,
        custodianLabel: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : "-",
        custodianId: asset.custodianId,
        currentLocationId: asset.currentLocationId,
        currentLocationLabel: locationLabelById.get(asset.currentLocationId) ?? asset.currentLocationId,
        conditionId: asset.conditionId,
      })),
    employees: employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` })),
    departments: departments.map((department) => ({ id: department.id, label: `${department.code} - ${department.name}` })),
    locations: locations.map((location) => ({ id: location.id, label: `${location.code} - ${location.name}` })),
    statuses: statuses.map((status) => ({ id: status.id, label: status.nameTh, name: status.name })),
    conditions: getAssetOperationConditionOptions(conditions)
      .map((condition) => ({ id: condition.id, label: condition.nameTh, name: condition.name })),
  }
}

function getCheckoutDestinationLabel(checkout: {
  checkoutType: string
  departmentId: string | null
  locationId: string | null
  parentAssetId: string | null
  custodian: { code: string; fullNameTh: string } | null
}, labels: {
  departments: Map<string, string>
  locations: Map<string, string>
  assets: Map<string, string>
}) {
  if (checkout.checkoutType === "user" && checkout.custodian) {
    return `${checkout.custodian.code} - ${checkout.custodian.fullNameTh}`
  }
  if (checkout.checkoutType === "department" && checkout.departmentId) {
    return labels.departments.get(checkout.departmentId) ?? checkout.departmentId
  }
  if (checkout.checkoutType === "location" && checkout.locationId) {
    return labels.locations.get(checkout.locationId) ?? checkout.locationId
  }
  if (checkout.checkoutType === "asset" && checkout.parentAssetId) {
    return labels.assets.get(checkout.parentAssetId) ?? checkout.parentAssetId
  }
  return "-"
}
