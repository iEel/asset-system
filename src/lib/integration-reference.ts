export function toIntegrationStatusDto(status: {
  id: string
  name: string
  nameTh: string
  colorCode: string | null
  sortOrder: number
  isActive: boolean
}) {
  return {
    id: status.id,
    code: status.name,
    nameTh: status.nameTh,
    colorCode: status.colorCode,
    sortOrder: status.sortOrder,
    isActive: status.isActive,
  }
}

export function toIntegrationCompanyDto(company: {
  id: string
  code: string
  nameTh: string
  nameEn: string | null
  isActive: boolean
}) {
  return {
    id: company.id,
    code: company.code,
    nameTh: company.nameTh,
    nameEn: company.nameEn,
    isActive: company.isActive,
  }
}

export function toIntegrationBranchDto(branch: {
  id: string
  code: string
  name: string
  isActive: boolean
  company: { code: string; nameTh: string }
}) {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    isActive: branch.isActive,
    company: {
      code: branch.company.code,
      nameTh: branch.company.nameTh,
    },
  }
}

export function toIntegrationLocationDto(location: {
  id: string
  code: string
  name: string
  locationType: string
  isActive: boolean
  branch: {
    code: string
    name: string
    company: { code: string; nameTh: string }
  }
}) {
  return {
    id: location.id,
    code: location.code,
    name: location.name,
    locationType: location.locationType,
    isActive: location.isActive,
    branch: {
      code: location.branch.code,
      name: location.branch.name,
      company: {
        code: location.branch.company.code,
        nameTh: location.branch.company.nameTh,
      },
    },
  }
}
