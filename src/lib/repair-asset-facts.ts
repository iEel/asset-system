// The one read of a repair's asset facts (G5P2-R1): the page load of MT-New and the picker's by-id read both use it.
// The db is injected (a Prisma client is passed as `prisma as unknown as RepairAssetFactsDb`); this file never imports ./db.
import { readAssetPhotoPreviews, type AssetPhotoPreviewDb } from "./asset-photo-preview.ts"
import type { RepairAssetFacts } from "./repair-record-outlook.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

// Method syntax, so fakes may narrow args.
type FindFirst = { findFirst(args: object): Promise<unknown> }
export type RepairAssetFactsDb = AssetPhotoPreviewDb & {
  asset: FindFirst
  maintenanceTicket: FindFirst
  assetCheckout: FindFirst
  department: FindFirst
  location: FindFirst
}

type AssetRow = {
  id: string
  assetTag: string
  name: string
  ownershipType: string | null
  custodianId: string | null
  conditionId: string
  modelId: string | null
  status: { name: string; nameTh: string }
  condition: { nameTh: string } | null
  custodian: { fullNameTh: string } | null
  department: { name: string } | null
  currentLocation: { name: string; branch: { name: string } | null } | null
}

type CheckoutRow = {
  id: string
  documentNo: string | null
  checkoutType: string
  departmentId: string | null
  locationId: string | null
  parentAssetId: string | null
  custodian: { fullNameTh: string } | null
}

type NameRow = { name: string } | null

export async function loadRepairAssetFacts(db: RepairAssetFactsDb, assetId: string): Promise<RepairAssetFacts | null> {
  const asset = (await db.asset.findFirst({
    where: { id: assetId, isActive: true },
    select: {
      id: true,
      assetTag: true,
      name: true,
      ownershipType: true,
      custodianId: true,
      conditionId: true,
      modelId: true,
      status: { select: { name: true, nameTh: true } },
      condition: { select: { nameTh: true } },
      custodian: { select: { fullNameTh: true } },
      department: { select: { name: true } },
      currentLocation: { select: { name: true, branch: { select: { name: true } } } },
    },
  })) as AssetRow | null
  if (!asset) return null

  const [openRecord, checkout, photos] = await Promise.all([
    db.maintenanceTicket.findFirst({
      where: { ...openRepairRecordWhere, assetId: asset.id },
      select: { id: true, repairNo: true },
      orderBy: { createdAt: "desc" },
    }) as Promise<{ id: string; repairNo: string } | null>,
    db.assetCheckout.findFirst({
      where: { assetId: asset.id, isReturned: false, transactionStatus: "active" },
      select: {
        id: true,
        documentNo: true,
        checkoutType: true,
        departmentId: true,
        locationId: true,
        parentAssetId: true,
        custodian: { select: { fullNameTh: true } },
      },
      orderBy: [{ checkoutDate: "desc" }, { createdAt: "desc" }],
    }) as Promise<CheckoutRow | null>,
    readAssetPhotoPreviews(db, [{ id: asset.id, modelId: asset.modelId }]),
  ])

  return {
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    statusName: asset.status.name,
    statusLabel: asset.status.nameTh,
    conditionId: asset.conditionId,
    conditionLabel: asset.condition?.nameTh ?? "",
    ownershipType: asset.ownershipType ?? null,
    custodianId: asset.custodianId ?? null,
    holderName: asset.custodian?.fullNameTh ?? null,
    departmentName: asset.department?.name ?? null,
    roomName: asset.currentLocation?.name ?? null,
    branchName: asset.currentLocation?.branch?.name ?? null,
    photo: photos.get(asset.id) ?? null,
    openRecord: openRecord ? { id: openRecord.id, repairNo: openRecord.repairNo } : null,
    activeCheckout: checkout
      ? { id: checkout.id, documentNo: checkout.documentNo ?? null, holderName: await readCheckoutHolderName(db, checkout) }
      : null,
  }
}

// G5P2-R2: the handover's holder by its checkoutType. Department, location and parent-asset ids are plain strings on
// the checkout, so their names are read by id, with no isActive filter (a handover may point at a since-closed one).
async function readCheckoutHolderName(db: RepairAssetFactsDb, checkout: CheckoutRow): Promise<string | null> {
  const nameOf = async (read: Promise<unknown>) => ((await read) as NameRow)?.name ?? null
  const select = { name: true }
  switch (checkout.checkoutType) {
    case "user":
      return checkout.custodian?.fullNameTh ?? null
    case "department":
      return checkout.departmentId ? nameOf(db.department.findFirst({ where: { id: checkout.departmentId }, select })) : null
    case "location":
      return checkout.locationId ? nameOf(db.location.findFirst({ where: { id: checkout.locationId }, select })) : null
    case "asset":
      return checkout.parentAssetId ? nameOf(db.asset.findFirst({ where: { id: checkout.parentAssetId }, select })) : null
    default:
      return null
  }
}
