import { prisma } from "@/lib/db"

export async function getAuditRoundOptions() {
  const [companies, branches, departments, locations, categories, employees, statuses, conditions] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, company: { select: { code: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.assetStatus.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  return {
    companies: companies.map((company) => ({ id: company.id, label: `${company.code} - ${company.nameTh}` })),
    branches: branches.map((branch) => ({ id: branch.id, label: `${branch.company.code} / ${branch.code} - ${branch.name}` })),
    departments: departments.map((department) => ({ id: department.id, label: `${department.code} - ${department.name}` })),
    locations: locations.map((location) => ({ id: location.id, label: `${location.code} - ${location.name}` })),
    categories: categories.map((category) => ({ id: category.id, label: `${category.code} - ${category.name}` })),
    employees: employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` })),
    statuses: statuses.map((status) => ({ id: status.id, label: status.nameTh || status.name })),
    conditions: conditions.map((condition) => ({ id: condition.id, label: condition.nameTh || condition.name })),
  }
}
