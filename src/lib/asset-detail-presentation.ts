export type AssetResponsibilityInput = {
  ownershipType: "personal" | "shared" | "stock" | "component" | "software_license"
  custodianLabel: string | null
  departmentLabel: string | null
  currentLocationLabel: string | null
  installedParentLabel: string | null
  licenseAssignedLabel: string | null
}

export function resolveAssetResponsibilityValue(input: AssetResponsibilityInput) {
  if (input.ownershipType === "personal") return input.custodianLabel

  if (input.ownershipType === "shared" || input.ownershipType === "stock") {
    return input.departmentLabel ?? input.currentLocationLabel
  }

  if (input.ownershipType === "component") {
    return input.installedParentLabel ?? input.currentLocationLabel
  }

  return input.licenseAssignedLabel ?? input.currentLocationLabel
}
