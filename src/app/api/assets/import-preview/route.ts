import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { parseAssetImportWorkbook, type AssetImportReferences } from "@/lib/asset-import-preview"

const maxImportSize = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "กรุณาเลือกไฟล์ Excel" }, { status: 400 })
    }
    if (file.size > maxImportSize) {
      return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "รองรับเฉพาะไฟล์ .xlsx" }, { status: 400 })
    }

    const references = await getReferences()
    const preview = await parseAssetImportWorkbook(await file.arrayBuffer(), references)
    return NextResponse.json(preview)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function getReferences(): Promise<AssetImportReferences> {
  const [
    assets,
    categories,
    companies,
    branches,
    departments,
    locations,
    statuses,
    conditions,
    brands,
    models,
    employees,
    suppliers,
  ] = await Promise.all([
    prisma.asset.findMany({
      where: { isActive: true },
      select: { assetTag: true, serialNumber: true },
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, companyId: true },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, companyId: true },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, branchId: true },
    }),
    prisma.assetStatus.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
    }),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameTh: true },
    }),
    prisma.assetBrand.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
    prisma.assetModel.findMany({
      where: { isActive: true },
      select: { id: true, name: true, brandId: true, categoryId: true },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    }),
  ])

  return {
    assetTags: new Set(assets.map((asset) => asset.assetTag.trim().toLowerCase())),
    serialNumbers: new Set(
      assets.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber.trim().toLowerCase()] : []))
    ),
    categories: new Map(categories.map((category) => [category.code.trim().toLowerCase(), category.id])),
    companies: new Map(companies.map((company) => [company.code.trim().toLowerCase(), company.id])),
    branches: new Map(branches.map((branch) => [branch.code.trim().toLowerCase(), { id: branch.id, companyId: branch.companyId }])),
    departments: new Map(
      departments.map((department) => [
        department.code.trim().toLowerCase(),
        { id: department.id, companyId: department.companyId },
      ])
    ),
    locations: new Map(locations.map((location) => [location.code.trim().toLowerCase(), { id: location.id, branchId: location.branchId }])),
    statuses: new Map(
      statuses.flatMap((status) => [
        [status.name.trim().toLowerCase(), status.id] as const,
        [status.nameTh.trim().toLowerCase(), status.id] as const,
      ])
    ),
    conditions: new Map(
      conditions.flatMap((condition) => [
        [condition.name.trim().toLowerCase(), condition.id] as const,
        [condition.nameTh.trim().toLowerCase(), condition.id] as const,
      ])
    ),
    brands: new Map(brands.map((brand) => [brand.name.trim().toLowerCase(), brand.id])),
    models: new Map(
      models.map((model) => [
        model.name.trim().toLowerCase(),
        { id: model.id, brandId: model.brandId, categoryId: model.categoryId },
      ])
    ),
    employees: new Map(employees.map((employee) => [employee.code.trim().toLowerCase(), employee.id])),
    suppliers: new Map(suppliers.map((supplier) => [supplier.code.trim().toLowerCase(), supplier.id])),
  }
}
