// The import card's pure helpers (group 4 plan 5, P5-R4 and P5-R8). Client-safe: no server module is imported, so the
// row cap and the required columns are copies that tests/asset-import-wizard.test.ts holds equal to the server's.
import type { AssetImportIssue } from "./asset-import-validate.ts"
import type { AssetImportColumnMapping } from "./asset-import-mapping.ts"

export const assetImportWizardSteps = ["template", "upload", "review", "import", "complete"] as const
export type AssetImportWizardStep = (typeof assetImportWizardSteps)[number]

// ASSET_IMPORT_MAX_ROWS (asset-import-validate.ts) and the template's required columns (asset-excel.ts).
export const ASSET_IMPORT_ROW_CAP = 1000
export const assetImportRequiredColumnKeys: readonly string[] = ["name", "categoryCode", "companyCode", "branchCode", "currentLocationCode", "status", "condition"]

export type AssetImportWizardState = {
  hasSelectedFile?: boolean
  hasPreview?: boolean
  isLoading?: boolean
  isImporting?: boolean
  hasSuccess?: boolean
}

export function getAssetImportWizardStep(state: AssetImportWizardState): AssetImportWizardStep {
  if (state.hasSuccess) return "complete"
  if (state.isImporting) return "import"
  if (state.hasPreview || state.hasSelectedFile) return "review"
  if (state.isLoading) return "upload"
  return "template"
}

type IssueKey = { field: string; code: string }

// The repeated problems (group 4 plan 5, P5-R4): rows are counted once per field and code, whatever the file value. The
// first issue of each group is kept as its sample, so the summary can word a notUnder or tooLong like the row does.
export function summarizeAssetImportPreviewIssues<I extends IssueKey>(rows: Array<{ issues: I[] }>, limit = 5) {
  const counts = new Map<string, { field: string; code: string; count: number; sample: I }>()
  for (const row of rows) {
    const seen = new Set<string>()
    for (const issue of row.issues) {
      const key = `${issue.field}:${issue.code}`
      if (seen.has(key)) continue
      seen.add(key)
      const entry = counts.get(key) ?? { field: issue.field, code: issue.code, count: 0, sample: issue }
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

// next-intl's t over the asset namespace.
export type AssetImportTranslate = (key: string, values?: Record<string, string | number>) => string

export type AssetImportIssueParts = {
  // "<ชื่อช่อง>: <ปัญหา>"
  line: string
  // "ค่าในไฟล์: <value>", or null when the file had no value
  value: string | null
  separator: string
  // "ใช้อยู่กับ <tag>" (or "... ที่ปิดใช้งานแล้ว") split around the tag, which the page draws as a link to href
  usedBy: { before: string; tag: string; after: string; href: string } | null
}

const TAG_MARK = "⁣TAG⁣"

export function importIssueFieldName(field: string, t: AssetImportTranslate, fields: Record<string, string>) {
  if (field === "_form") return t("importIssue.fileForm")
  return fields[field] ?? field
}

export function importIssueProblem(issue: Pick<AssetImportIssue, "code" | "parent" | "conflict" | "max">, t: AssetImportTranslate, fields: Record<string, string>) {
  const values: Record<string, string | number> = {}
  if (issue.code === "notUnder") values.parent = issue.parent ? importIssueFieldName(issue.parent, t, fields) : ""
  if (issue.code === "duplicateInFile") values.row = issue.conflict && "row" in issue.conflict ? issue.conflict.row : ""
  if (issue.code === "tooLong") values.max = issue.max ?? ""
  return t(`importError.${issue.code}`, values)
}

// One issue as the two lines the table shows (P5-R4): the field and the problem, then the file value and, for a clash
// with an asset in the register, the tag that holds it.
export function buildImportIssueParts(issue: AssetImportIssue, t: AssetImportTranslate, context: { fields: Record<string, string>; locale: string }): AssetImportIssueParts {
  const line = t("importIssue.line", { field: importIssueFieldName(issue.field, t, context.fields), problem: importIssueProblem(issue, t, context.fields) })
  const raw = issue.value == null ? "" : String(issue.value).trim()
  const value = raw ? t("importIssue.value", { value: raw }) : null
  let usedBy: AssetImportIssueParts["usedBy"] = null
  if (issue.conflict && "assetId" in issue.conflict) {
    const text = t(issue.conflict.inactive ? "importIssue.usedByInactive" : "importIssue.usedBy", { tag: TAG_MARK })
    const [before = "", after = ""] = text.split(TAG_MARK)
    usedBy = { before, tag: issue.conflict.assetTag, after, href: `/${context.locale}/assets/${issue.conflict.assetId}` }
  }
  return { line, value, separator: t("importIssue.separator"), usedBy }
}

export type AssetImportFilter = "error" | "ready" | "all"

// P5-R8: the rows with errors first when there are any.
export function defaultImportFilter(summary: { totalRows: number; readyRows: number; errorRows: number }): AssetImportFilter {
  return summary.errorRows > 0 ? "error" : "all"
}

// The filter first, then the cut: at most `limit` rows are drawn, and the page says how many were left out.
export function filterImportRows<R extends { status: "ready" | "error" }>(rows: R[], filter: AssetImportFilter, limit = 100) {
  const matched = filter === "all" ? rows : rows.filter((row) => row.status === filter)
  const shown = matched.slice(0, limit)
  return { rows: shown, total: matched.length, hidden: matched.length - shown.length }
}

// The column-matching line: matched of total, and the missing columns by whether the import needs them.
export function splitImportMapping(mapping: AssetImportColumnMapping[]) {
  const missing = mapping.filter((column) => column.sourceColumn == null).map((column) => column.key)
  return {
    matched: mapping.length - missing.length,
    total: mapping.length,
    missingRequired: missing.filter((key) => assetImportRequiredColumnKeys.includes(key)),
    missingOptional: missing.filter((key) => !assetImportRequiredColumnKeys.includes(key)),
  }
}
