// The role of an installed component (group 4 plan 4, P4-R4): the install form stores one of these English values
// and shows a Thai label. Older rows may hold other free text; those have no key and show as stored.
export const COMPONENT_ROLE_VALUES = ["RAM", "SSD", "HDD", "Power Supply", "Network Card", "Monitor", "Adapter", "Other"] as const

export type ComponentRoleValue = (typeof COMPONENT_ROLE_VALUES)[number]

const roleKeys: Record<ComponentRoleValue, string> = {
  RAM: "ram",
  SSD: "ssd",
  HDD: "hdd",
  "Power Supply": "powerSupply",
  "Network Card": "networkCard",
  Monitor: "monitor",
  Adapter: "adapter",
  Other: "other",
}

/** The message key under `asset` for an exact stored value, or null (the caller shows the stored text). */
export function componentRoleLabelKey(stored: string): string | null {
  if (!(COMPONENT_ROLE_VALUES as readonly string[]).includes(stored)) return null
  return `componentRoles.${roleKeys[stored as ComponentRoleValue]}`
}
