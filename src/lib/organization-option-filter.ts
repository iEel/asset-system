export type OrganizationScopedOption = {
  companyId?: string | null
  branchId?: string | null
  branchCode?: string | null
  departmentId?: string | null
  departmentCode?: string | null
}

export type OrganizationScope = {
  companyId?: string | null
  branchId?: string | null
  branchCode?: string | null
  departmentId?: string | null
  departmentCode?: string | null
}

export function optionMatchesOrganizationScope(option: OrganizationScopedOption, scope: OrganizationScope) {
  return (
    matchesScopeValue(option.companyId, scope.companyId) &&
    matchesScopeValue(option.branchId, scope.branchId, option.branchCode, scope.branchCode) &&
    matchesScopeValue(option.departmentId, scope.departmentId, option.departmentCode, scope.departmentCode)
  )
}

function matchesScopeValue(
  optionValue?: string | null,
  selectedValue?: string | null,
  optionCode?: string | null,
  selectedCode?: string | null
) {
  const selected = selectedValue?.trim()
  const selectedCodeKey = normalizeCode(selectedCode)
  if (!selected && !selectedCodeKey) return true

  const option = optionValue?.trim()
  if (option && selected && option === selected) return true

  const optionCodeKey = normalizeCode(optionCode)
  if (optionCodeKey && selectedCodeKey && optionCodeKey === selectedCodeKey) return true

  return !option && !optionCodeKey
}

function normalizeCode(value?: string | null) {
  return value?.trim().toLocaleLowerCase() || ""
}
