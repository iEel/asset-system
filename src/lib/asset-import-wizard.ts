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
  issues: Array<{ field: string; code: string }>
}

export function getAssetImportWizardStep(state: AssetImportWizardState): AssetImportWizardStep {
  if (state.hasSuccess) return "complete"
  if (state.isImporting) return "import"
  if (state.hasPreview || state.hasSelectedFile) return "review"
  if (state.isLoading) return "upload"
  return "template"
}

// The repeated problems (group 4 plan 5, P5-R4): rows are counted once per field and code, whatever the file value.
export function summarizeAssetImportPreviewIssues(rows: AssetImportPreviewIssueSource[], limit = 5) {
  const counts = new Map<string, { field: string; code: string; count: number }>()
  for (const row of rows) {
    const seen = new Set<string>()
    for (const issue of row.issues) {
      const key = `${issue.field}:${issue.code}`
      if (seen.has(key)) continue
      seen.add(key)
      const entry = counts.get(key) ?? { field: issue.field, code: issue.code, count: 0 }
      entry.count += 1
      counts.set(key, entry)
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return `${a.field}:${a.code}`.localeCompare(`${b.field}:${b.code}`)
    })
    .slice(0, limit)
}
