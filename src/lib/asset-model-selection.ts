export type AssetModelSelectionOption = {
  id: string
  categoryId?: string | null
  brandId?: string | null
}

export function resolveModelIdForScope({
  models,
  categoryId,
  brandId,
  currentModelId,
}: {
  models: AssetModelSelectionOption[]
  categoryId?: string | null
  brandId?: string | null
  currentModelId?: string | null
}) {
  const currentModel = models.find((model) => model.id === currentModelId)
  if (currentModel && modelMatchesScope(currentModel, categoryId, brandId)) {
    return currentModel.id
  }

  if (!categoryId || !brandId) return ""

  const matchingModels = models.filter((model) => model.categoryId === categoryId && model.brandId === brandId)
  return matchingModels.length === 1 ? matchingModels[0].id : ""
}

function modelMatchesScope(
  model: AssetModelSelectionOption,
  categoryId?: string | null,
  brandId?: string | null
) {
  return (!categoryId || model.categoryId === categoryId) && (!brandId || model.brandId === brandId)
}
