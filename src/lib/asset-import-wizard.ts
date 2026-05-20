export const assetImportWizardSteps = ["template", "upload", "review", "import", "complete"] as const
export type AssetImportWizardStep = (typeof assetImportWizardSteps)[number]

export type AssetImportWizardState = {
  hasSelectedFile?: boolean
  hasPreview?: boolean
  isLoading?: boolean
  isImporting?: boolean
  hasSuccess?: boolean
}

export type AssetImportPreviewIssueSource = {
  errors: string[]
}

export function getAssetImportWizardStep(state: AssetImportWizardState): AssetImportWizardStep {
  if (state.hasSuccess) return "complete"
  if (state.isImporting) return "import"
  if (state.hasPreview || state.hasSelectedFile) return "review"
  if (state.isLoading) return "upload"
  return "template"
}

export function summarizeAssetImportPreviewIssues(rows: AssetImportPreviewIssueSource[], limit = 5) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const error of row.errors) {
      counts.set(error, (counts.get(error) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.message.localeCompare(b.message)
    })
    .slice(0, limit)
}
