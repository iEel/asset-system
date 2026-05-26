type NameOption = {
  label?: string | null
}

export function buildSuggestedAssetName(category?: NameOption | null, brand?: NameOption | null, model?: NameOption | null) {
  const categoryName = getCompactLabel(category?.label)
  const brandName = brand?.label?.trim() ?? ""
  const modelName = model?.label?.trim() ?? ""
  const modelStartsWithBrand =
    Boolean(brandName) && Boolean(modelName) && modelName.toLocaleLowerCase().startsWith(brandName.toLocaleLowerCase())

  return [categoryName, modelStartsWithBrand ? "" : brandName, modelName].filter(Boolean).join(" ")
}

function getCompactLabel(label?: string | null) {
  return label?.split(" - ")[0]?.trim() ?? ""
}
