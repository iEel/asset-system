import { prisma } from "@/lib/db"

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
  const [locations, employees, departments, conditions] = await Promise.all([
    prisma.location.findMany({
      where: { id: { in: idList } },
      select: { id: true, code: true, name: true },
    }),
    prisma.employee.findMany({
      where: { id: { in: idList } },
      select: { id: true, code: true, fullNameTh: true },
    }),
    prisma.department.findMany({
      where: { id: { in: idList } },
      select: { id: true, code: true, name: true },
    }),
    prisma.assetCondition.findMany({
      where: { id: { in: idList } },
      select: { id: true, name: true, nameTh: true },
    }),
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
