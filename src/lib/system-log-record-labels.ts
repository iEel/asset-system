import { prisma } from "@/lib/db"
import {
  isSyntheticRecordId,
  normalizeLogModule,
  parseLogJson,
  type SystemLogRecordLabels,
} from "@/lib/system-log-presenter"

export type SystemLogRowForLabels = {
  recordId: string | null
  action: string
  module: string
  oldValue: string | null
  newValue: string | null
}

export async function buildSystemLogRecordLabels(logs: SystemLogRowForLabels[]): Promise<SystemLogRecordLabels> {
  const idsByModule = new Map<string, Set<string>>()
  for (const log of logs) {
    if (log.recordId && !isSyntheticRecordId(log.recordId)) {
      if (log.module === "audit") {
        addRecordId(idsByModule, "auditRound", log.recordId)
        addRecordId(idsByModule, "auditFinding", log.recordId)
        addRecordId(idsByModule, "auditItem", log.recordId)
      } else {
        addRecordId(idsByModule, normalizeLogModule(log.module, log), log.recordId)
      }
    }
    addReferencedValueIds(idsByModule, log)
  }

  const ids = (module: string) => Array.from(idsByModule.get(module) ?? [])
  const [
    assets,
    maintenanceTickets,
    disposalRequests,
    auditRounds,
    auditFindings,
    auditItems,
    companies,
    branches,
    departments,
    locations,
    categories,
    brands,
    suppliers,
    employees,
    users,
    roles,
    models,
    purchaseDocuments,
    statuses,
    conditions,
  ] = await Promise.all([
    prisma.asset.findMany({ where: { id: { in: ids("asset") } }, select: { id: true, assetTag: true, name: true } }),
    prisma.maintenanceTicket.findMany({ where: { id: { in: ids("maintenance") } }, select: { id: true, repairNo: true, asset: { select: { assetTag: true } } } }),
    prisma.disposalRequest.findMany({ where: { id: { in: ids("disposal") } }, select: { id: true, disposalNo: true, asset: { select: { assetTag: true } } } }),
    prisma.auditRound.findMany({ where: { id: { in: ids("auditRound") } }, select: { id: true, auditNo: true, name: true } }),
    prisma.auditFinding.findMany({ where: { id: { in: ids("auditFinding") } }, select: { id: true, findingType: true, asset: { select: { assetTag: true } }, auditRound: { select: { auditNo: true } } } }),
    prisma.auditItem.findMany({ where: { id: { in: ids("auditItem") } }, select: { id: true, asset: { select: { assetTag: true } }, auditRound: { select: { auditNo: true } } } }),
    prisma.company.findMany({ where: { id: { in: ids("company") } }, select: { id: true, code: true, nameTh: true } }),
    prisma.branch.findMany({ where: { id: { in: ids("branch") } }, select: { id: true, code: true, name: true } }),
    prisma.department.findMany({ where: { id: { in: ids("department") } }, select: { id: true, code: true, name: true } }),
    prisma.location.findMany({ where: { id: { in: ids("location") } }, select: { id: true, code: true, name: true } }),
    prisma.assetCategory.findMany({ where: { id: { in: ids("category") } }, select: { id: true, code: true, name: true } }),
    prisma.assetBrand.findMany({ where: { id: { in: ids("brand") } }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { id: { in: ids("supplier") } }, select: { id: true, code: true, name: true } }),
    prisma.employee.findMany({ where: { id: { in: ids("employee") } }, select: { id: true, code: true, fullNameTh: true } }),
    prisma.user.findMany({ where: { id: { in: ids("user") } }, select: { id: true, username: true, displayName: true } }),
    prisma.role.findMany({ where: { id: { in: ids("role") } }, select: { id: true, displayName: true, name: true } }),
    prisma.assetModel.findMany({ where: { id: { in: ids("model") } }, select: { id: true, name: true, brand: { select: { name: true } } } }),
    prisma.purchaseDocument.findMany({ where: { id: { in: ids("purchaseDocument") } }, select: { id: true, documentType: true, documentNo: true } }),
    prisma.assetStatus.findMany({ where: { id: { in: ids("status") } }, select: { id: true, nameTh: true, name: true } }),
    prisma.assetCondition.findMany({ where: { id: { in: ids("condition") } }, select: { id: true, nameTh: true, name: true } }),
  ])

  return {
    asset: new Map(assets.map((item) => [item.id, `${item.assetTag} - ${item.name}`])),
    maintenance: new Map(maintenanceTickets.map((item) => [item.id, `${item.repairNo} - ${item.asset.assetTag}`])),
    disposal: new Map(disposalRequests.map((item) => [item.id, `${item.disposalNo} - ${item.asset.assetTag}`])),
    auditRound: new Map(auditRounds.map((item) => [item.id, `${item.auditNo} - ${item.name}`])),
    auditFinding: new Map(auditFindings.map((item) => [item.id, `${item.auditRound.auditNo} - ${item.asset?.assetTag ?? item.findingType}`])),
    auditItem: new Map(auditItems.map((item) => [item.id, `${item.auditRound.auditNo} - ${item.asset.assetTag}`])),
    company: new Map(companies.map((item) => [item.id, `${item.code} - ${item.nameTh}`])),
    branch: new Map(branches.map((item) => [item.id, `${item.code} - ${item.name}`])),
    department: new Map(departments.map((item) => [item.id, `${item.code} - ${item.name}`])),
    location: new Map(locations.map((item) => [item.id, `${item.code} - ${item.name}`])),
    category: new Map(categories.map((item) => [item.id, `${item.code} - ${item.name}`])),
    brand: new Map(brands.map((item) => [item.id, item.name])),
    supplier: new Map(suppliers.map((item) => [item.id, `${item.code} - ${item.name}`])),
    employee: new Map(employees.map((item) => [item.id, `${item.code} - ${item.fullNameTh}`])),
    user: new Map(users.map((item) => [item.id, item.displayName ?? item.username])),
    role: new Map(roles.map((item) => [item.id, item.displayName ?? item.name])),
    model: new Map(models.map((item) => [item.id, `${item.brand.name} - ${item.name}`])),
    purchaseDocument: new Map(purchaseDocuments.map((item) => [item.id, `${item.documentType} - ${item.documentNo}`])),
    status: new Map(statuses.map((item) => [item.id, item.nameTh ?? item.name])),
    condition: new Map(conditions.map((item) => [item.id, item.nameTh ?? item.name])),
  }
}

function addRecordId(idsByModule: Map<string, Set<string>>, module: string, id: string) {
  if (!idsByModule.has(module)) idsByModule.set(module, new Set())
  idsByModule.get(module)?.add(id)
}

function addReferencedValueIds(idsByModule: Map<string, Set<string>>, log: SystemLogRowForLabels) {
  const values = [parseLogJson(log.oldValue), parseLogJson(log.newValue)].filter((value): value is Record<string, unknown> => Boolean(value))
  for (const value of values) {
    addStringReference(idsByModule, "location", value.currentLocationId)
    addStringReference(idsByModule, "location", value.locationId)
    addStringReference(idsByModule, "location", value.nextLocationId)
    addStringReference(idsByModule, "employee", value.custodianId)
    addStringReference(idsByModule, "employee", value.returnByEmployeeId)
    addStringReference(idsByModule, "employee", value.receiveByEmployeeId)
    addStringReference(idsByModule, "department", value.departmentId)
    addStringReference(idsByModule, "asset", value.assetId)
    addStringReference(idsByModule, "asset", value.parentAssetId)
    addStringReference(idsByModule, "company", value.companyId)
    addStringReference(idsByModule, "branch", value.branchId)
    addStringReference(idsByModule, "category", value.categoryId)
    addStringReference(idsByModule, "brand", value.brandId)
    addStringReference(idsByModule, "model", value.modelId)
    addStringReference(idsByModule, "supplier", value.supplierId)
    addStringReference(idsByModule, "location", value.homeLocationId)
    addStringReference(idsByModule, "status", value.statusId)
    addStringReference(idsByModule, "status", value.nextStatusId)
    addStringReference(idsByModule, "condition", value.conditionId)
    addStringReference(idsByModule, "condition", value.conditionBefore)
    addStringReference(idsByModule, "condition", value.conditionAfter)
    addStringReference(idsByModule, "role", value.roleId)
    addStringReference(idsByModule, "role", value.ldap_default_role)
  }
}

function addStringReference(idsByModule: Map<string, Set<string>>, module: string, value: unknown) {
  if (typeof value === "string" && value.trim()) addRecordId(idsByModule, module, value)
}
