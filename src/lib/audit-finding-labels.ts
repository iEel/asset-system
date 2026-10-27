import { prisma } from "@/lib/db"
import { chunkAuditIds } from "@/lib/audit-round-counts-rules"

type FindingValue = {
  findingType: string
  expectedValue: string | null
  actualValue: string | null
}

export async function buildFindingValueLabels(findings: FindingValue[]) {
  const ids = new Set<string>()
  for (const finding of findings) {
    for (const value of [finding.expectedValue, finding.actualValue]) {
      if (value && shouldResolveValue(finding.findingType, value)) ids.add(value)
    }
  }

  const idList = Array.from(ids)
  return buildAuditReferenceLabels(idList)
}

// The room, custodian, department and condition labels of a list of ids, for the round's exports and finding values.
// SQL Server takes at most 2,100 parameters, and one round's export can name every room and custodian of its items
// (1,509 on AUD-2026-0002), so each IN list goes in chunks of 2,000 (P2-R20).
export async function buildAuditReferenceLabels(ids: ReadonlyArray<string | null | undefined>): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  const chunks = chunkAuditIds(uniqueIds)
  const readChunked = async <T>(read: (chunk: string[]) => Promise<T[]>): Promise<T[]> => (await Promise.all(chunks.map(read))).flat()
  const [locations, employees, departments, conditions] = await Promise.all([
    readChunked((chunk) => prisma.location.findMany({ where: { id: { in: chunk } }, select: { id: true, code: true, name: true } })),
    readChunked((chunk) => prisma.employee.findMany({ where: { id: { in: chunk } }, select: { id: true, code: true, fullNameTh: true } })),
    readChunked((chunk) => prisma.department.findMany({ where: { id: { in: chunk } }, select: { id: true, code: true, name: true } })),
    readChunked((chunk) => prisma.assetCondition.findMany({ where: { id: { in: chunk } }, select: { id: true, name: true, nameTh: true } })),
  ])

  const labels = new Map<string, string>()
  for (const location of locations) labels.set(location.id, `${location.code} - ${location.name}`)
  for (const employee of employees) labels.set(employee.id, `${employee.code} - ${employee.fullNameTh}`)
  for (const department of departments) labels.set(department.id, `${department.code} - ${department.name}`)
  for (const condition of conditions) labels.set(condition.id, condition.nameTh || condition.name)
  return labels
}

export function formatFindingValue(findingType: string, value: string | null, labels: Map<string, string>) {
  if (!value) return "-"
  if (findingType === "not_found") return formatNotFoundValue(value)
  if (findingType === "out_of_scope") return formatOutOfScopeValue(value)
  return labels.get(value) ?? value
}

function shouldResolveValue(findingType: string, value: string) {
  return findingType !== "not_found" && !value.trim().startsWith("{")
}

function formatNotFoundValue(value: string) {
  try {
    const parsed = JSON.parse(value) as { assetTag?: string; assetName?: string }
    return [parsed.assetTag, parsed.assetName].filter(Boolean).join(" - ") || value
  } catch {
    return value
  }
}

function formatOutOfScopeValue(value: string) {
  try {
    const parsed = JSON.parse(value) as { assetTag?: string; assetName?: string }
    return [parsed.assetTag, parsed.assetName].filter(Boolean).join(" - ") || value
  } catch {
    return value
  }
}
