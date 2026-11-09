import type { Prisma } from "@prisma/client"
import { getDisposalAssetEligibilityError } from "./disposal-policy.ts"
import {
  disposalReadinessAssetSelect,
  getDisposalOutstandingComponentTags,
  getDisposalReadinessBlockersForAsset,
} from "./disposal-readiness.ts"

// One disposal picker option, read the same way by the picker's search (/api/disposal-assets) and by the batch form's
// prefill from an audit round (ยืนยันผลตรวจ plan 4 task 4).
export const disposalAssetOptionSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  status: { select: { name: true, nameTh: true } },
  company: { select: { code: true } },
  branch: { select: { code: true, name: true } },
  currentLocation: { select: { code: true, name: true } },
  custodian: { select: { code: true, fullNameTh: true } },
  ...disposalReadinessAssetSelect,
} satisfies Prisma.AssetSelect

type DisposalOptionAsset = Parameters<typeof getDisposalReadinessBlockersForAsset>[0] & {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  status: { name: string; nameTh: string }
  company: { code: string }
  branch: { code: string }
  currentLocation: { name: string }
  custodian: { code: string; fullNameTh: string } | null
}

// disposalType: the request's method; a lost (สูญหาย) one lets หาไม่พบ through (getDisposalAssetEligibilityError).
export function toDisposalAssetOption(asset: DisposalOptionAsset, disposalType: string | null) {
  const readinessBlockers = getDisposalReadinessBlockersForAsset(asset)
  const lifecycleBlocked = getDisposalAssetEligibilityError(asset.status, disposalType) !== null
  const blockers = lifecycleBlocked ? (["lifecycle_status", ...readinessBlockers] as const) : readinessBlockers
  return {
    id: asset.id,
    label: `${asset.assetTag} - ${asset.name}`,
    // The batch form's row shows the tag, the name and the register's Serial apart (request batches spec §4).
    assetTag: asset.assetTag,
    name: asset.name,
    serialNumber: asset.serialNumber ?? null,
    metadata: [
      asset.status.nameTh,
      `${asset.company.code}/${asset.branch.code}`,
      asset.currentLocation.name,
      asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null,
    ].filter(Boolean).join(" · "),
    eligible: blockers.length === 0,
    blockers: [...blockers],
    outstandingComponentTags: getDisposalOutstandingComponentTags(asset),
    // Allowed only by the method สูญหาย (a หาไม่พบ asset): the batch form blocks it again when the method leaves lost.
    lostOnly: getDisposalAssetEligibilityError(asset.status, null) !== null && getDisposalAssetEligibilityError(asset.status, "lost") === null,
  }
}
