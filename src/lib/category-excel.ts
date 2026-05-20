export type CategoryExportSource = {
  code: string
  name: string
  description: string | null
  isActive: boolean
  _count: {
    assets: number
    models: number
    customFieldDefs: number
  }
  customFieldDefs: Array<{
    fieldName: string
    fieldLabel: string
    fieldType: string
    isRequired: boolean
  }>
}

export type CategoryExportContext = {
  categoryIdByCode: Map<string, string>
  checklistByCategoryId: Map<string, string[]>
  prefixByCategoryCode: Map<string, string>
}

export function buildCategoryExportRows(categories: CategoryExportSource[], context: CategoryExportContext) {
  return categories.map((category) => {
    const categoryId = context.categoryIdByCode.get(category.code) ?? ""
    return {
      code: category.code,
      name: category.name,
      description: category.description ?? "",
      models: category._count.models,
      assets: category._count.assets,
      customFields: category.customFieldDefs.map(formatCustomField).join(", "),
      photoChecklist: (context.checklistByCategoryId.get(categoryId) ?? []).join(", "),
      assetTagPrefix: context.prefixByCategoryCode.get(category.code) ?? "",
      active: category.isActive ? "Y" : "N",
    }
  })
}

export function buildCategoryTemplateRows() {
  return {
    categories: [{ code: "COM", name: "Computer", description: "Desktop / workstation", active: "Y" }],
    customFields: [
      {
        categoryCode: "COM",
        fieldName: "cpu",
        fieldLabel: "CPU",
        fieldLabelTh: "ซีพียู",
        fieldType: "text",
        options: "",
        required: "N",
        active: "Y",
      },
    ],
    photoChecklist: [{ categoryCode: "COM", item: "รูปหน้าเครื่อง" }],
  }
}

function formatCustomField(field: CategoryExportSource["customFieldDefs"][number]) {
  return `${field.fieldName} (${field.fieldLabel}, ${field.fieldType}, ${field.isRequired ? "required" : "optional"})`
}
