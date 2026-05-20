export type LdapDeactivationEmployee = {
  id: string
  code: string
  fullNameTh: string
  email: string | null
}

export type LdapCustodianAsset = {
  id: string
  assetTag: string
  name: string
  custodianId: string | null
}

export type LdapLinkedUser = {
  id: string
  employeeId: string | null
  username: string
  isActive: boolean
}

export type LdapDeactivationImpact = {
  employeeId: string
  code: string
  name: string
  email: string | null
  activeAssetCount: number
  activeUserCount: number
  assets: Array<{
    id: string
    assetTag: string
    name: string
  }>
}

export function buildLdapDeactivationImpacts({
  employees,
  assets,
  users,
}: {
  employees: LdapDeactivationEmployee[]
  assets: LdapCustodianAsset[]
  users: LdapLinkedUser[]
}): LdapDeactivationImpact[] {
  return employees.map((employee) => {
    const employeeAssets = assets
      .filter((asset) => asset.custodianId === employee.id)
      .map((asset) => ({
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
      }))
    const activeUserCount = users.filter((user) => user.employeeId === employee.id && user.isActive).length

    return {
      employeeId: employee.id,
      code: employee.code,
      name: employee.fullNameTh,
      email: employee.email,
      activeAssetCount: employeeAssets.length,
      activeUserCount,
      assets: employeeAssets,
    }
  })
}

export function getActiveUserIdsForDeactivatedEmployees({
  employeeIds,
  users,
}: {
  employeeIds: string[]
  users: LdapLinkedUser[]
}) {
  const employeeIdSet = new Set(employeeIds)
  return users
    .filter((user) => user.isActive && user.employeeId && employeeIdSet.has(user.employeeId))
    .map((user) => user.id)
}
