import { prisma } from "@/lib/db"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"

export async function getAssetFormOptions() {
  const [
    companies,
    branches,
    departments,
    employees,
    locations,
    categories,
    brands,
    models,
    statuses,
    conditions,
    suppliers,
  ] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true },
      orderBy: { code: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true },
      orderBy: { code: "asc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true, fullNameTh: true, companyId: true, branchId: true },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, branchId: true },
      orderBy: { code: "asc" },
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        customFieldDefs: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            categoryId: true,
            fieldName: true,
            fieldLabel: true,
            fieldLabelTh: true,
            fieldType: true,
            options: true,
            isRequired: true,
            sortOrder: true,
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.assetBrand.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.assetModel.findMany({
      where: { isActive: true },
      select: { id: true, name: true, categoryId: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.assetStatus.findMany({
      where: { isActive: true },
      select: { id: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ])
  const photoChecklistSettings = await prisma.systemSetting.findMany({
    where: { key: { in: categories.map((category) => categoryPhotoChecklistKey(category.id)) } },
    select: { key: true, value: true },
  })
  const photoChecklistByCategoryId = new Map(
    photoChecklistSettings.map((setting) => [setting.key.replace("asset_category_photo_checklist:", ""), parsePhotoChecklist(setting.value)])
  )

  return {
    companies: companies.map((company) => ({ id: company.id, label: `${company.code} - ${company.nameTh}` })),
    branches: branches.map((branch) => ({
      id: branch.id,
      label: `${branch.code} - ${branch.name}`,
      companyId: branch.companyId,
    })),
    departments: departments.map((department) => ({
      id: department.id,
      label: `${department.code} - ${department.name}`,
      companyId: department.companyId,
    })),
    employees: employees.map((employee) => ({
      id: employee.id,
      label: `${employee.code} - ${employee.fullNameTh}`,
      companyId: employee.companyId,
      branchId: employee.branchId,
    })),
    locations: locations.map((location) => ({
      id: location.id,
      label: `${location.code} - ${location.name}`,
      branchId: location.branchId,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      label: `${category.code} - ${category.name}`,
      photoChecklist: photoChecklistByCategoryId.get(category.id) ?? [],
    })),
    customFieldDefinitions: categories.flatMap((category) =>
      category.customFieldDefs.map((field) => ({
        id: field.id,
        categoryId: field.categoryId,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldLabelTh: field.fieldLabelTh,
        fieldType: field.fieldType,
        options: parseFieldOptions(field.options),
        isRequired: field.isRequired,
        sortOrder: field.sortOrder,
      }))
    ),
    brands: brands.map((brand) => ({ id: brand.id, label: brand.name })),
    models: models.map((model) => ({
      id: model.id,
      label: model.name,
      categoryId: model.categoryId,
      brandId: model.brandId,
    })),
    statuses: statuses.map((status) => ({ id: status.id, label: status.nameTh })),
    conditions: conditions.map((condition) => ({ id: condition.id, label: condition.nameTh })),
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      label: `${supplier.code} - ${supplier.name}`,
    })),
  }
}

function parseFieldOptions(options: string | null) {
  if (!options) return []

  try {
    const parsed = JSON.parse(options) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return options
      .split(/\r?\n|,/)
      .map((option) => option.trim())
      .filter(Boolean)
  }
}
