import { prisma } from "@/lib/db"
import { type SystemLogRecordLabels } from "@/lib/system-log-presenter"
import { collectSystemLogRecordLabelRefs, getSystemLogRecordLabelIds, type SystemLogRowForLabels } from "@/lib/system-log-record-label-refs"

export type { SystemLogRowForLabels }

export async function buildSystemLogRecordLabels(logs: SystemLogRowForLabels[]): Promise<SystemLogRecordLabels> {
  const idsByModule = collectSystemLogRecordLabelRefs(logs)
  const ids = (module: string) => getSystemLogRecordLabelIds(idsByModule, module)
  const assetIds = ids("asset")
  const maintenanceIds = ids("maintenance")
  const disposalIds = ids("disposal")
  const auditRoundIds = ids("auditRound")
  const auditFindingIds = ids("auditFinding")
  const auditItemIds = ids("auditItem")
  const companyIds = ids("company")
  const branchIds = ids("branch")
  const departmentIds = ids("department")
  const locationIds = ids("location")
  const categoryIds = ids("category")
  const brandIds = ids("brand")
  const supplierIds = ids("supplier")
  const employeeIds = ids("employee")
  const userIds = ids("user")
  const roleIds = ids("role")
  const modelIds = ids("model")
  const purchaseDocumentIds = ids("purchaseDocument")
  const statusIds = ids("status")
  const conditionIds = ids("condition")

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
    findManyWhenIds(assetIds, () => prisma.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, assetTag: true, name: true } })),
    findManyWhenIds(maintenanceIds, () => prisma.maintenanceTicket.findMany({ where: { id: { in: maintenanceIds } }, select: { id: true, repairNo: true, asset: { select: { assetTag: true } } } })),
    findManyWhenIds(disposalIds, () => prisma.disposalRequest.findMany({ where: { id: { in: disposalIds } }, select: { id: true, disposalNo: true, asset: { select: { assetTag: true } } } })),
    findManyWhenIds(auditRoundIds, () => prisma.auditRound.findMany({ where: { id: { in: auditRoundIds } }, select: { id: true, auditNo: true, name: true } })),
    findManyWhenIds(auditFindingIds, () => prisma.auditFinding.findMany({ where: { id: { in: auditFindingIds } }, select: { id: true, findingType: true, asset: { select: { assetTag: true } }, auditRound: { select: { auditNo: true } } } })),
    findManyWhenIds(auditItemIds, () => prisma.auditItem.findMany({ where: { id: { in: auditItemIds } }, select: { id: true, asset: { select: { assetTag: true } }, auditRound: { select: { auditNo: true } } } })),
    findManyWhenIds(companyIds, () => prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, code: true, nameTh: true } })),
    findManyWhenIds(branchIds, () => prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, code: true, name: true } })),
    findManyWhenIds(departmentIds, () => prisma.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, code: true, name: true } })),
    findManyWhenIds(locationIds, () => prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, code: true, name: true } })),
    findManyWhenIds(categoryIds, () => prisma.assetCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, code: true, name: true } })),
    findManyWhenIds(brandIds, () => prisma.assetBrand.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true } })),
    findManyWhenIds(supplierIds, () => prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, code: true, name: true } })),
    findManyWhenIds(employeeIds, () => prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, code: true, fullNameTh: true } })),
    findManyWhenIds(userIds, () => prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, displayName: true } })),
    findManyWhenIds(roleIds, () => prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, displayName: true, name: true } })),
    findManyWhenIds(modelIds, () => prisma.assetModel.findMany({ where: { id: { in: modelIds } }, select: { id: true, name: true, brand: { select: { name: true } } } })),
    findManyWhenIds(purchaseDocumentIds, () => prisma.purchaseDocument.findMany({ where: { id: { in: purchaseDocumentIds } }, select: { id: true, documentType: true, documentNo: true } })),
    findManyWhenIds(statusIds, () => prisma.assetStatus.findMany({ where: { id: { in: statusIds } }, select: { id: true, nameTh: true, name: true } })),
    findManyWhenIds(conditionIds, () => prisma.assetCondition.findMany({ where: { id: { in: conditionIds } }, select: { id: true, nameTh: true, name: true } })),
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

function findManyWhenIds<T>(ids: string[], query: () => Promise<T[]>) {
  return ids.length > 0 ? query() : Promise.resolve([] as T[])
}
