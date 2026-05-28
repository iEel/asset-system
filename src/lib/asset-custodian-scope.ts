type AssetScope = {
  companyId: string
  branchId?: string | null
  custodianId?: string | null
}

type CustodianScope = {
  id: string
  companyId: string
  branchId: string
  company?: { code: string; nameTh: string } | null
  branch?: { code: string; name: string } | null
}

export type CustodianScopeAudit = {
  crossCompanyCustodian: boolean
  crossBranchCustodian: boolean
  assetCompanyId: string
  assetBranchId: string | null
  custodianId: string
  custodianCompanyId: string
  custodianBranchId: string
  custodianCompanyLabel?: string
  custodianBranchLabel?: string
}

export function buildCustodianScopeAudit(asset: AssetScope, custodian?: CustodianScope | null): CustodianScopeAudit | null {
  if (!asset.custodianId || !custodian) return null

  const crossCompanyCustodian = custodian.companyId !== asset.companyId
  const crossBranchCustodian = Boolean(asset.branchId) && custodian.branchId !== asset.branchId
  if (!crossCompanyCustodian && !crossBranchCustodian) return null

  return {
    crossCompanyCustodian,
    crossBranchCustodian,
    assetCompanyId: asset.companyId,
    assetBranchId: asset.branchId ?? null,
    custodianId: asset.custodianId,
    custodianCompanyId: custodian.companyId,
    custodianBranchId: custodian.branchId,
    ...(custodian.company ? { custodianCompanyLabel: `${custodian.company.code} - ${custodian.company.nameTh}` } : {}),
    ...(custodian.branch ? { custodianBranchLabel: `${custodian.branch.code} - ${custodian.branch.name}` } : {}),
  }
}
