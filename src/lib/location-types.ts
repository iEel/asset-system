// The location types a location can have. The database stores the English value (a free-text column, so an older or
// imported row may hold anything); people read it through the location.type_<value> message (critique 2026-10-20 E2).
// No imports: the validation schema re-exports the list, and node tests load this module.
export const locationTypes = [
  "Site",
  "Building",
  "Floor",
  "Room",
  "Area",
  "Zone",
  "Rack",
  "Desk",
  "Storage",
  "Vehicle",
  "User-held",
  "Offsite",
] as const

export type LocationType = (typeof locationTypes)[number]
export type LocationTypeLabelKey = `type_${LocationType}`

export function getLocationTypeLabelKey(type: string | null | undefined): LocationTypeLabelKey | null {
  return type && (locationTypes as readonly string[]).includes(type) ? (`type_${type}` as LocationTypeLabelKey) : null
}

// An unknown value shows as stored, so nothing is hidden.
export function formatLocationType(type: string, t: (key: LocationTypeLabelKey) => string) {
  const key = getLocationTypeLabelKey(type)
  return key ? t(key) : type
}

// Every type's label in the person's language, read through the location translator.
export function getLocationTypeLabels(t: (key: LocationTypeLabelKey) => string): Record<LocationType, string> {
  return Object.fromEntries(locationTypes.map((type) => [type, t(`type_${type}`)])) as Record<LocationType, string>
}

// The types whose label contains the query (any case), so typing "ห้อง" finds the rooms although the database stores
// "Room" (user decision 2026-10-21 Y3). An empty query matches nothing: it is not a search.
export function matchLocationTypesByLabel(query: string, labels: Record<LocationType, string>): LocationType[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return locationTypes.filter((type) => labels[type]?.toLocaleLowerCase().includes(needle))
}
