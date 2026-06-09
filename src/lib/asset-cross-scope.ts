import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import {
  assetMatchesCrossScopeFilter,
  getAssetCrossScopeFlagLabels,
  getAssetCrossScopeFlags,
  normalizeAssetCrossScopeFilter,
  summarizeAssetCrossScope,
  type AssetCrossScopeFilter,
} from "./asset-cross-scope-filter.ts"

const assetCrossScopeSelect = {
  id: true,
  assetTag: true,
  name: true,
  companyId: true,
  branchId: true,
  company: { select: { code: true, nameTh: true } },
  branch: { select: { code: true, name: true, company: { select: { code: true } } } },
  custodian: {
    select: {
      code: true,
      fullNameTh: true,
      companyId: true,
      branchId: true,
      company: { select: { code: true, nameTh: true } },
      branch: { select: { code: true, name: true, company: { select: { code: true } } } },
    },
  },
  homeLocation: {
    select: {
      code: true,
      name: true,
      branchId: true,
      branch: { select: { code: true, name: true, company: { select: { code: true } } } },
    },
  },
  currentLocation: {
    select: {
      code: true,
      name: true,
      branchId: true,
      branch: { select: { code: true, name: true, company: { select: { code: true } } } },
    },
  },
} satisfies Prisma.AssetSelect

type AssetCrossScopeRecord = Prisma.AssetGetPayload<{ select: typeof assetCrossScopeSelect }>

export type AssetCrossScopeSummaryRow = {
  id: string
  assetTag: string
  name: string
  ownerCompany: string
  ownerBranch: string
  custodian: string
  custodianCompany: string
  custodianBranch: string
  homeLocation: string
  homeLocationBranch: string
  currentLocation: string
  currentLocationBranch: string
  flags: ReturnType<typeof getAssetCrossScopeFlags>
}

export async function applyAssetCrossScopeFilter(where: Prisma.AssetWhereInput, value: unknown): Promise<Prisma.AssetWhereInput> {
  const filter = normalizeAssetCrossScopeFilter(value)
  if (!filter) return where

  const assets = await getAssetCrossScopeCandidates(where)
  const ids = assets
    .filter((asset) => assetMatchesCrossScopeFilter(asset, filter))
    .map((asset) => asset.id)

  return { AND: [where, { id: { in: ids } }] }
}

export async function buildAssetCrossScopeSummary(where: Prisma.AssetWhereInput, limit = 8) {
  const assets = await getAssetCrossScopeCandidates(where)
  const summary = summarizeAssetCrossScope(assets)
  const rows = assets
    .filter((asset) => assetMatchesCrossScopeFilter(asset, "all"))
    .slice(0, limit)
    .map(toAssetCrossScopeSummaryRow)

  return { ...summary, rows }
}

export function getAssetCrossScopeRecordFlags(asset: AssetCrossScopeRecord) {
  return getAssetCrossScopeFlags(asset)
}

export function formatAssetCrossScopeFlags(asset: AssetCrossScopeRecord) {
  const labels = getAssetCrossScopeFlagLabels(getAssetCrossScopeRecordFlags(asset), {
    custodianCompany: "Custodian different company",
    custodianBranch: "Custodian different branch",
    locationBranch: "Location different branch",
  })
  return labels.join("; ")
}

export function assetCrossScopeLinkQueryValue(filter: AssetCrossScopeFilter) {
  return filter
}

async function getAssetCrossScopeCandidates(where: Prisma.AssetWhereInput) {
  return prisma.asset.findMany({
    where,
    select: assetCrossScopeSelect,
    orderBy: { assetTag: "asc" },
  })
}

function toAssetCrossScopeSummaryRow(asset: AssetCrossScopeRecord): AssetCrossScopeSummaryRow {
  return {
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    ownerCompany: formatCompany(asset.company),
    ownerBranch: formatBranch(asset.branch),
    custodian: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : "-",
    custodianCompany: asset.custodian ? formatCompany(asset.custodian.company) : "-",
    custodianBranch: asset.custodian ? formatBranch(asset.custodian.branch) : "-",
    homeLocation: asset.homeLocation ? formatLocation(asset.homeLocation) : "-",
    homeLocationBranch: asset.homeLocation ? formatBranch(asset.homeLocation.branch) : "-",
    currentLocation: formatLocation(asset.currentLocation),
    currentLocationBranch: formatBranch(asset.currentLocation.branch),
    flags: getAssetCrossScopeRecordFlags(asset),
  }
}

function formatCompany(company: { code: string; nameTh: string }) {
  return `${company.code} - ${company.nameTh}`
}

function formatBranch(branch: { code: string; name: string; company?: { code: string } | null }) {
  return `${branch.company?.code ? `${branch.company.code} / ` : ""}${branch.code} - ${branch.name}`
}

function formatLocation(location: { code: string; name: string }) {
  return `${location.code} - ${location.name}`
}
