import { prisma } from "@/lib/db"

type MovementValue = {
  id: string
  movementType: string
  fromValue?: string | null
  toValue?: string | null
}

type MovementLabels = {
  from: string | null
  to: string | null
}

const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

const snapshotLabels: Record<string, string> = {
  assetTag: "Asset Tag",
  componentAssetTag: "ส่วนควบ",
  componentName: "ชื่อส่วนควบ",
  componentRole: "บทบาท",
  custodianId: "ผู้ถือครอง",
  departmentId: "แผนก",
  locationId: "พื้นที่",
  parentAssetTag: "ทรัพย์สินหลัก",
  parentName: "ชื่อทรัพย์สินหลัก",
  reason: "เหตุผล",
  referenceType: "อ้างอิง",
  slotNo: "ช่อง/ตำแหน่ง",
}

export async function getMovementDisplayLabels(movements: MovementValue[]) {
  const ids = collectMovementIds(movements)
  const lookup = await buildMovementLookup(ids)

  return new Map<string, MovementLabels>(
    movements.map((movement) => [
      movement.id,
      {
        from: formatMovementValue(movement.fromValue, lookup),
        to: formatMovementValue(movement.toValue, lookup),
      },
    ])
  )
}

function collectMovementIds(movements: MovementValue[]) {
  const ids = new Set<string>()
  for (const movement of movements) {
    for (const value of [movement.fromValue, movement.toValue]) {
      if (!value) continue
      for (const id of value.match(uuidPattern) ?? []) {
        ids.add(id.toLowerCase())
      }
    }
  }
  return [...ids]
}

async function buildMovementLookup(ids: string[]) {
  const lookup = new Map<string, string>()
  if (ids.length === 0) return lookup

  const [locations, statuses, conditions, departments, employees, assets, companies, branches] = await Promise.all([
    prisma.location.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, name: true },
    }),
    prisma.assetStatus.findMany({
      where: { id: { in: ids } },
      select: { id: true, nameTh: true },
    }),
    prisma.assetCondition.findMany({
      where: { id: { in: ids } },
      select: { id: true, nameTh: true },
    }),
    prisma.department.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, name: true },
    }),
    prisma.employee.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, fullNameTh: true },
    }),
    prisma.asset.findMany({
      where: { id: { in: ids } },
      select: { id: true, assetTag: true, name: true },
    }),
    prisma.company.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, nameTh: true },
    }),
    prisma.branch.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, name: true },
    }),
  ])

  for (const item of locations) lookup.set(item.id.toLowerCase(), `${item.code} - ${item.name}`)
  for (const item of statuses) lookup.set(item.id.toLowerCase(), item.nameTh)
  for (const item of conditions) lookup.set(item.id.toLowerCase(), item.nameTh)
  for (const item of departments) lookup.set(item.id.toLowerCase(), `${item.code} - ${item.name}`)
  for (const item of employees) lookup.set(item.id.toLowerCase(), `${item.code} - ${item.fullNameTh}`)
  for (const item of assets) lookup.set(item.id.toLowerCase(), `${item.assetTag} - ${item.name}`)
  for (const item of companies) lookup.set(item.id.toLowerCase(), `${item.code} - ${item.nameTh}`)
  for (const item of branches) lookup.set(item.id.toLowerCase(), `${item.code} - ${item.name}`)

  return lookup
}

function formatMovementValue(value: string | null | undefined, lookup: Map<string, string>) {
  const rawValue = value?.trim()
  if (!rawValue) return null

  const parsed = parseJson(rawValue)
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return formatSnapshot(parsed as Record<string, unknown>, lookup)
  }

  const directLabel = lookup.get(rawValue.toLowerCase())
  if (directLabel) return directLabel

  const replaced = rawValue.replace(uuidPattern, (id) => lookup.get(id.toLowerCase()) ?? compactUnknownId(id))
  return replaced
}

function parseJson(value: string) {
  if (!value.startsWith("{") && !value.startsWith("[")) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function formatSnapshot(snapshot: Record<string, unknown>, lookup: Map<string, string>): string | null {
  const entries: string[] = Object.entries(snapshot)
    .map(([key, value]) => {
      const label = snapshotLabels[key] ?? key
      const displayValue = formatSnapshotValue(value, lookup)
      return displayValue ? `${label}: ${displayValue}` : null
    })
    .filter((entry): entry is string => Boolean(entry))

  return entries.length > 0 ? entries.join(" / ") : null
}

function formatSnapshotValue(value: unknown, lookup: Map<string, string>): string | null {
  if (value == null || value === "") return null
  if (typeof value === "string") {
    const label = lookup.get(value.toLowerCase())
    if (label) return label
    return value.replace(uuidPattern, (id) => lookup.get(id.toLowerCase()) ?? compactUnknownId(id))
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map((item) => formatSnapshotValue(item, lookup)).filter(Boolean).join(", ")
  if (typeof value === "object") return formatSnapshot(value as Record<string, unknown>, lookup)
  return String(value)
}

function compactUnknownId(id: string) {
  return `ID ${id.slice(0, 8)}...${id.slice(-4)}`
}
