import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"
import { buildDuplicateNameGroups } from "@/lib/brand-model-query"
import { summarizeModelSpecs } from "@/lib/model-specs"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "brand", "export")

    const [brands, models, modelPhotos] = await Promise.all([
      prisma.assetBrand.findMany({
        where: { isActive: true },
        include: { _count: { select: { models: true, assets: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.assetModel.findMany({
        where: { isActive: true },
        include: {
          brand: { select: { name: true } },
          category: { select: { code: true, name: true } },
          _count: { select: { assets: true } },
        },
        orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
      }),
      prisma.attachment.findMany({
        where: {
          module: "asset_model",
          isActive: true,
          fileType: { startsWith: "image/" },
        },
        select: { referenceId: true },
      }),
    ])
    const modelIdsWithPhotos = new Set(modelPhotos.map((photo) => photo.referenceId))

    const workbook = createWorkbook()
    const brandSheet = workbook.addWorksheet("Brands")
    brandSheet.columns = [
      { header: "Brand Name", key: "name", width: 34 },
      { header: "Model Count", key: "modelCount", width: 16 },
      { header: "Asset Count", key: "assetCount", width: 16 },
      { header: "Active", key: "active", width: 12 },
    ]
    brandSheet.addRows(brands.map((brand) => ({
      name: brand.name,
      modelCount: brand._count.models,
      assetCount: brand._count.assets,
      active: brand.isActive ? "Y" : "N",
    })))
    styleWorksheetHeader(brandSheet)

    const modelSheet = workbook.addWorksheet("Models")
    modelSheet.columns = [
      { header: "Model Name", key: "name", width: 34 },
      { header: "Brand Name", key: "brand", width: 28 },
      { header: "Category Code", key: "categoryCode", width: 18 },
      { header: "Category Name", key: "categoryName", width: 28 },
      { header: "Specifications", key: "specs", width: 60 },
      { header: "Asset Count", key: "assetCount", width: 16 },
      { header: "Has Photo", key: "hasPhoto", width: 14 },
      { header: "Active", key: "active", width: 12 },
    ]
    modelSheet.addRows(models.map((model) => ({
      name: model.name,
      brand: model.brand.name,
      categoryCode: model.category.code,
      categoryName: model.category.name,
      specs: summarizeModelSpecs(model.specs, 8) ?? "",
      assetCount: model._count.assets,
      hasPhoto: modelIdsWithPhotos.has(model.id) ? "Y" : "N",
      active: model.isActive ? "Y" : "N",
    })))
    styleWorksheetHeader(modelSheet)

    const duplicateSheet = workbook.addWorksheet("Duplicate Review")
    duplicateSheet.columns = [
      { header: "Type", key: "type", width: 16 },
      { header: "Normalized Name", key: "normalizedName", width: 28 },
      { header: "Names", key: "names", width: 80 },
      { header: "Count", key: "count", width: 12 },
    ]
    duplicateSheet.addRows([
      ...buildDuplicateNameGroups(brands).map((group) => ({
        type: "Brand",
        normalizedName: group.normalizedName,
        names: group.items.map((item) => item.name).join(", "),
        count: group.items.length,
      })),
      ...buildDuplicateNameGroups(models).map((group) => ({
        type: "Model",
        normalizedName: group.normalizedName,
        names: group.items.map((item) => `${item.brand.name} / ${item.name}`).join(", "),
        count: group.items.length,
      })),
    ])
    styleWorksheetHeader(duplicateSheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `brand-models-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}
