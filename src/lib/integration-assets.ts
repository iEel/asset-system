import type { Prisma } from "@prisma/client"

export type IntegrationAssetListParams = {
  q: string
  assetTag: string
  serialNumber: string
  employeeCode: string
  companyCode: string
  branchCode: string
  locationCode: string
  status: string
  condition: string
  includeInactive: boolean
  page: number
  limit: number
}

export const integrationAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  fixedAssetCode: true,
  ownershipType: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { code: true, name: true } },
  brand: { select: { name: true } },
  model: { select: { name: true } },
  company: { select: { code: true, nameTh: true } },
  branch: { select: { code: true, name: true, company: { select: { code: true } } } },
  department: { select: { code: true, name: true } },
  custodian: {
    select: {
      code: true,
      fullNameTh: true,
      company: { select: { code: true, nameTh: true } },
      branch: { select: { code: true, name: true, company: { select: { code: true } } } },
      department: { select: { code: true, name: true } },
    },
  },
  homeLocation: {
    select: {
      code: true,
      name: true,
      branch: { select: { code: true, name: true, company: { select: { code: true } } } },
    },
  },
  currentLocation: {
    select: {
      code: true,
      name: true,
      branch: { select: { code: true, name: true, company: { select: { code: true } } } },
    },
  },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
} satisfies Prisma.AssetSelect

export type IntegrationAssetRecord = Prisma.AssetGetPayload<{ select: typeof integrationAssetSelect }>

export function parseIntegrationAssetListParams(input: URLSearchParams | Record<string, unknown>): IntegrationAssetListParams {
  const getValue = (key: string) => (input instanceof URLSearchParams ? input.get(key) : input[key])
  const page = Math.max(1, Number(getValue("page") ?? 1) || 1)
  const limitValue = Number(getValue("limit") ?? 50) || 50

  return {
    q: clean(getValue("q")),
    assetTag: clean(getValue("assetTag")),
    serialNumber: clean(getValue("serialNumber")),
    employeeCode: clean(getValue("employeeCode")),
    companyCode: clean(getValue("companyCode")),
    branchCode: clean(getValue("branchCode")),
    locationCode: clean(getValue("locationCode")),
    status: clean(getValue("status")),
    condition: clean(getValue("condition")),
    includeInactive: clean(getValue("includeInactive")).toLowerCase() === "true",
    page,
    limit: Math.min(100, Math.max(1, limitValue)),
  }
}

export function buildIntegrationAssetWhere(filters: IntegrationAssetListParams): Prisma.AssetWhereInput {
  return {
    ...(filters.includeInactive ? {} : { isActive: true }),
    ...(filters.assetTag ? { assetTag: { contains: filters.assetTag } } : {}),
    ...(filters.serialNumber ? { serialNumber: { contains: filters.serialNumber } } : {}),
    ...(filters.employeeCode ? { custodian: { code: { contains: filters.employeeCode } } } : {}),
    ...(filters.companyCode ? { company: { code: { contains: filters.companyCode } } } : {}),
    ...(filters.branchCode ? { branch: { code: { contains: filters.branchCode } } } : {}),
    ...(filters.locationCode ? { currentLocation: { code: { contains: filters.locationCode } } } : {}),
    ...(filters.status
      ? { status: { OR: [{ name: { contains: filters.status } }, { nameTh: { contains: filters.status } }] } }
      : {}),
    ...(filters.condition
      ? { condition: { OR: [{ name: { contains: filters.condition } }, { nameTh: { contains: filters.condition } }] } }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { assetTag: { contains: filters.q } },
            { name: { contains: filters.q } },
            { serialNumber: { contains: filters.q } },
            { fixedAssetCode: { contains: filters.q } },
            { custodian: { code: { contains: filters.q } } },
          ],
        }
      : {}),
  }
}

export function buildIntegrationAssetOrderBy(_filters: IntegrationAssetListParams): Prisma.AssetOrderByWithRelationInput[] {
  return [{ updatedAt: "desc" }, { assetTag: "asc" }]
}

export function toIntegrationAssetDto(asset: IntegrationAssetRecord) {
  return {
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    serialNumber: asset.serialNumber,
    fixedAssetCode: asset.fixedAssetCode,
    ownershipType: asset.ownershipType,
    isActive: asset.isActive,
    category: asset.category,
    brand: asset.brand ? { name: asset.brand.name } : null,
    model: asset.model ? { name: asset.model.name } : null,
    ownerCompany: {
      code: asset.company.code,
      name: asset.company.nameTh,
    },
    ownerBranch: formatBranchDto(asset.branch),
    department: asset.department ? { code: asset.department.code, name: asset.department.name } : null,
    custodian: asset.custodian
      ? {
          employeeCode: asset.custodian.code,
          name: asset.custodian.fullNameTh,
          company: { code: asset.custodian.company.code, name: asset.custodian.company.nameTh },
          branch: formatBranchDto(asset.custodian.branch),
          department: { code: asset.custodian.department.code, name: asset.custodian.department.name },
        }
      : null,
    homeLocation: asset.homeLocation ? formatLocationDto(asset.homeLocation) : null,
    currentLocation: formatLocationDto(asset.currentLocation),
    status: {
      code: asset.status.name,
      nameTh: asset.status.nameTh,
      colorCode: asset.status.colorCode,
    },
    condition: {
      code: asset.condition.name,
      nameTh: asset.condition.nameTh,
      colorCode: asset.condition.colorCode,
    },
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim()
}

function formatBranchDto(branch: { code: string; name: string; company?: { code: string } | null }) {
  return {
    companyCode: branch.company?.code ?? null,
    code: branch.code,
    name: branch.name,
  }
}

function formatLocationDto(location: { code: string; name: string; branch: { code: string; name: string; company?: { code: string } | null } }) {
  return {
    code: location.code,
    name: location.name,
    branch: formatBranchDto(location.branch),
  }
}
