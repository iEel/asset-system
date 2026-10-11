import assert from "node:assert/strict"
import test from "node:test"
import { getMobileShellMode } from "../src/lib/mobile-field-navigation.ts"
import {
  budgetOverruns,
  countByFile,
  countMatchesByFile,
  findJsxElements,
  findJsxTags,
  findMatches,
  hasJsxAttr,
  jsxAttrValue,
  readSourceFiles,
} from "./helpers/source-files.ts"

// Phase 2C guards (spec 2C §9, rulings I26 and §10.4 table C). Budgets start at their 5ffee76 values and only go down:
// the commit that migrates a file lowers that file's numbers (deleting rows that reach 0) and adds the file to
// MIGRATED_FILES (spec §9.9). The GF4, GF6, GF8, GB2 and GB3 checks run on migrated files only.
// Phase 2D widens every guard to all of src and sets the budgets to {}.
const sources = readSourceFiles("src")
const C = "src/components/"

// The 66 files of 2C by batch (spec §8.6, §8.9), relative to src/components/.
const BATCH_FILES: Record<string, readonly string[]> = {
  "1a": ["maintenance/maintenance-plan-form.tsx", "maintenance/repair-record-form.tsx", "maintenance/repair-record-actions.tsx", "maintenance/maintenance-attachments.tsx"],
  "1b": ["asset-operations/checkin-form.tsx", "asset-operations/checkout-form.tsx", "asset-operations/transfer-form.tsx", "asset-operations/bulk-move-form.tsx", "asset-operations/signature-pad.tsx", "ui/operation-review-dialog.tsx"],
  "1c": ["disposal/disposal-request-form.tsx", "disposal/disposal-batch-form.tsx", "disposal/disposal-execution-button.tsx", "disposal/disposal-asset-picker.tsx", "disposal/disposal-decision-button.tsx"],
  "1d": ["audit/audit-scan-check-form.tsx", "audit/audit-finding-review-actions.tsx", "audit/audit-mark-not-found-button.tsx", "audit/audit-scan-component-missing-dialog.tsx"],
  "1g": ["master-data/asset-model-form.tsx"],
  "1e": ["assets/asset-form.tsx", "assets/asset-batch-form.tsx", "assets/asset-component-manager.tsx", "assets/asset-attachments.tsx"],
  "1f": ["admin/system-settings-form.tsx", "admin/depreciation-policy-builder.tsx"],
  "2": ["master-data/branch-form.tsx", "master-data/brand-form.tsx", "master-data/category-form.tsx", "master-data/company-form.tsx", "master-data/department-form.tsx", "master-data/employee-form.tsx", "master-data/location-form.tsx", "master-data/supplier-form.tsx"],
  "3": ["disposal/disposal-bulk-approval.tsx", "disposal/disposal-bulk-execution.tsx", "audit/audit-round-form.tsx", "audit/audit-round-cancel-button.tsx", "audit/audit-findings-batch-actions.tsx", "audit/audit-scan-room-picker.tsx", "audit/audit-scan-check-panel.tsx", "maintenance/maintenance-plan-state-actions.tsx", "ui/confirm-text-dialog.tsx"],
  "4": ["admin/admin-user-form.tsx", "admin/role-permission-form.tsx", "admin/IntegrationClientManager.tsx", "admin/asset-state-review-dialog.tsx", "admin/data-quality-rule-form.tsx", "assets/asset-label-batch-tool.tsx", "assets/asset-label-print.tsx", "assets/asset-scan-search-tool.tsx", "assets/asset-status-correction-button.tsx", "assets/asset-register-table.tsx", "assets/asset-import-preview-panel.tsx", "assets/asset-evidence-drawer.tsx", "assets/asset-create-workspace.tsx", "asset-operations/transaction-cancel-dialog.tsx", "auth/login-form.tsx", "reports/report-preset-controls.tsx", "notifications/notification-center-actions.tsx", "ui/activity-drawer.tsx"],
  "5": ["ui/mobile-action-bar.tsx", "disposal/disposal-mobile-action-bar.tsx", "disposal/disposal-workflow-stepper.tsx", "ui/confirm-dialog.tsx", "ui/alert-dialog.tsx"],
}
// Primitives 2C creates: every guard applies to them from the first day (action-bar.tsx arrives in batch 5).
const NEW_2C_FILES = ["ui/segmented.tsx", "ui/sticky-form-footer.tsx", "ui/form-section.tsx", "ui/choice-card.tsx", "ui/file-queue-list.tsx", "ui/steps.tsx", "ui/action-bar.tsx"].map((path) => C + path)
// Files already migrated. The commit that migrates a file adds its line here; never remove one.
const MIGRATED_FILES: string[] = [
  // one line per migrated file, in commit order
  `${C}maintenance/maintenance-plan-form.tsx`,
  `${C}maintenance/repair-record-form.tsx`,
  `${C}maintenance/repair-record-actions.tsx`,
  `${C}maintenance/maintenance-attachments.tsx`,
  `${C}asset-operations/checkin-form.tsx`,
  `${C}asset-operations/checkout-form.tsx`,
  `${C}asset-operations/transfer-form.tsx`,
  `${C}asset-operations/bulk-move-form.tsx`,
  `${C}asset-operations/signature-pad.tsx`,
  `${C}ui/operation-review-dialog.tsx`,
  `${C}disposal/disposal-request-form.tsx`,
  `${C}disposal/disposal-batch-form.tsx`,
  `${C}disposal/disposal-execution-button.tsx`,
  `${C}disposal/disposal-asset-picker.tsx`,
  `${C}disposal/disposal-decision-button.tsx`,
  `${C}audit/audit-scan-check-form.tsx`,
  `${C}audit/audit-finding-review-actions.tsx`,
]
const owned = new Set([...Object.values(BATCH_FILES).flat().map((path) => C + path), ...NEW_2C_FILES])
const migrated = new Set([...NEW_2C_FILES, ...MIGRATED_FILES])
const notOwned = (path: string) => !owned.has(path)
const migratedSources = () => sources.filter((file) => migrated.has(file.path))
const read = (path: string) => sources.find((file) => file.path === path)?.source ?? ""

// Same message as assertWithinBudget in visual-foundation-guards.test.ts, but over counts taken already (so a JSX count works too).
function assertWithinBudget(counts: Record<string, number>, budget: Record<string, number>, what: string) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  assert.deepEqual(
    budgetOverruns(counts, budget),
    [],
    `${what}: ${total} in ${Object.keys(counts).length} files. Lower a number in the task that removes a site; never raise one. Phase 2D widens every guard to all of src and sets the budgets to {}.`,
  )
}

const NON_FIELD_INPUT = /^(?:checkbox|radio|hidden|file)$/
const CONTROL_TAGS = ["Input", "NativeSelect", "Textarea", "SearchField", "ScannerTextInput", "FileDropzone", "input", "select", "textarea", "Select", "SelectField", "QueueSelect"]
const CONSTRAINT_TAGS = [...CONTROL_TAGS, "ChoiceCard", "ChoiceChip"]
const CONSTRAINT_ATTRS = ["required", "maxLength", "minLength"] as const
// "Class string" = one double-quoted string on one line (as in visual-foundation-guards.test.ts). A field class string
// has the field focus border, or a field's border, corners, padding and width/height with no button or box words.
// Strings with hover: are left out (fields have no hover; list buttons do).
const isFieldClassString = (text: string) =>
  !/\bhover:/.test(text) &&
  (/\bfocus(?:-visible)?:border-ring\b/.test(text) ||
    (/\bborder-(?:border|input)\b/.test(text) &&
      /\brounded(?:-md)?\b/.test(text) &&
      /\b(?:px-3|px-2|pl-9|pl-10)\b/.test(text) &&
      /\b(?:w-full|min-h-\d+|h-(?:9|10|11))\b/.test(text) &&
      !/\b(?:inline-flex|flex|grid|justify-center|font-medium|font-semibold)\b|\bfile:/.test(text)))
const rawFieldTags = (source: string) =>
  findJsxTags(source, ["input", "select", "textarea"]).filter((tag) => tag.name !== "input" || !NON_FIELD_INPUT.test(jsxAttrValue(tag.text, "type") ?? ""))
const classStringsWhere = (source: string, keep: (text: string) => boolean) => [...source.matchAll(/"[^"\n]*"/g)].filter((match) => keep(match[0])).length
// GD1: a close label typed as a literal (English or Thai; it must come from tCommon("close") or a key), and English X labels.
const LITERAL_CLOSE_LABEL = /closeLabel(?:Prop)?\s*=\s*"|closeLabel=\{["`]|(?:aria-label|title)="(?:Close|Cancel|Dismiss)"/g
const CLOSE_IS_CANCEL = /closeLabel=\{[^}]*\bcancel\b[^}]*\}/g
const OLD_FIELD_MARKUP = /ml-1 text-danger">\*|mb-1\.5 block text-sm font-medium text-foreground|<legend className="mb-2 text-sm font-medium text-foreground"|\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b/g
const OLD_HELPER_MARKUP = /\bfunction (?:FormStep|WizardStep|Choice|AssetStateFieldLabel)\b|aria-label=\{t\("batchAssetTagHelp"\)\}/g
// The star that the server enforces while the control has no required (spec §4.3 F5), keyed by the label expression, not a line number.
const STAR_ONLY = new Set([`${C}asset-operations/checkin-form.tsx|t("returnDate")`, `${C}assets/asset-form.tsx|t("licenseTotalSeats")`, `${C}assets/asset-form.tsx|t("componentRole")`])
// K13: the label a button swapped to while busy. Each expression occurs once in its file at 5ffee76.
const BUSY_LABEL_SWAPS: Record<string, RegExp> = {
  [`${C}admin/asset-state-review-dialog.tsx`]: /labels\.saving\b/,
  [`${C}asset-operations/checkin-form.tsx`]: /t\("legacyReturnCreating"\)/,
  [`${C}assets/asset-batch-form.tsx`]: /t\("batchCheckDuplicatesRunning"\)/,
  [`${C}assets/asset-component-manager.tsx`]: /labels\.(?:installing|removing)\b/,
  [`${C}assets/asset-status-correction-button.tsx`]: /labels\.submitting\b/,
  [`${C}auth/login-form.tsx`]: /t\("loggingIn"\)/,
  [`${C}assets/asset-import-preview-panel.tsx`]: /\$\{labels\.chooseFile\}\.\.\.|labels\.importing\b/,
  [`${C}assets/asset-label-print.tsx`]: /translations\.recordingPrint\b/,
}
// Files that render StickyFormFooter and the routes that show them. Every route must be a focus route (no bottom navigation).
const STICKY_FOOTER_ROUTES: Record<string, string[]> = {
  [`${C}assets/asset-form.tsx`]: ["/th/assets/new", "/th/assets/sample-1/edit"],
  [`${C}admin/system-settings-form.tsx`]: ["/th/admin/settings"],
}

// ---- Budgets at 5ffee76 (spec §9.4). "→ n" = what stays after the file's own task, and why.

// GF1 `function Field(` per file
const LOCAL_FIELD: Record<string, number> = {
  // 1a
  // 1b
  // 1c
  // 1g
  [`${C}master-data/asset-model-form.tsx`]: 1,
  // 1e
  [`${C}assets/asset-form.tsx`]: 1,
  [`${C}assets/asset-batch-form.tsx`]: 1,
  // 1f
  [`${C}admin/system-settings-form.tsx`]: 1,
  // 2
  [`${C}master-data/branch-form.tsx`]: 1,
  [`${C}master-data/category-form.tsx`]: 1,
  [`${C}master-data/company-form.tsx`]: 1,
  [`${C}master-data/department-form.tsx`]: 1,
  [`${C}master-data/employee-form.tsx`]: 1,
  [`${C}master-data/location-form.tsx`]: 1,
  [`${C}master-data/supplier-form.tsx`]: 1,
  // 3
  [`${C}audit/audit-round-form.tsx`]: 1,
  // 4
  [`${C}admin/admin-user-form.tsx`]: 1,
  [`${C}admin/role-permission-form.tsx`]: 1,
}

// GF2 hand-written <input> (not checkbox/radio/hidden/file), <select> and <textarea>
const RAW_FIELDS: Record<string, number> = {
  // 1a
  // 1b
  // 1c
  // 1d
  [`${C}audit/audit-mark-not-found-button.tsx`]: 1,
  [`${C}audit/audit-scan-component-missing-dialog.tsx`]: 1,
  // 1g
  [`${C}master-data/asset-model-form.tsx`]: 6,
  // 1e
  [`${C}assets/asset-form.tsx`]: 27,
  [`${C}assets/asset-batch-form.tsx`]: 13,
  [`${C}assets/asset-component-manager.tsx`]: 5,
  [`${C}assets/asset-attachments.tsx`]: 1,
  // 1f
  [`${C}admin/system-settings-form.tsx`]: 50,
  [`${C}admin/depreciation-policy-builder.tsx`]: 9,
  // 2
  [`${C}master-data/branch-form.tsx`]: 5,
  [`${C}master-data/brand-form.tsx`]: 1,
  [`${C}master-data/category-form.tsx`]: 9,
  [`${C}master-data/company-form.tsx`]: 6,
  [`${C}master-data/department-form.tsx`]: 3,
  [`${C}master-data/employee-form.tsx`]: 10,
  [`${C}master-data/location-form.tsx`]: 6,
  [`${C}master-data/supplier-form.tsx`]: 6,
  // 3
  [`${C}disposal/disposal-bulk-approval.tsx`]: 1,
  [`${C}disposal/disposal-bulk-execution.tsx`]: 5,
  [`${C}audit/audit-round-form.tsx`]: 6,
  [`${C}audit/audit-round-cancel-button.tsx`]: 1,
  [`${C}audit/audit-scan-room-picker.tsx`]: 2, // → 1: the room search :75 stays (O20)
  [`${C}ui/confirm-text-dialog.tsx`]: 1,
  // 4
  [`${C}admin/admin-user-form.tsx`]: 5,
  [`${C}admin/role-permission-form.tsx`]: 4,
  [`${C}admin/IntegrationClientManager.tsx`]: 3,
  [`${C}admin/asset-state-review-dialog.tsx`]: 3,
  [`${C}admin/data-quality-rule-form.tsx`]: 1,
  [`${C}assets/asset-label-batch-tool.tsx`]: 4,
  [`${C}assets/asset-label-print.tsx`]: 2, // → 2: the toolbar :225, :236 (K21)
  [`${C}assets/asset-status-correction-button.tsx`]: 1,
  [`${C}assets/asset-register-table.tsx`]: 4,
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1,
  [`${C}auth/login-form.tsx`]: 2,
  [`${C}reports/report-preset-controls.tsx`]: 1,
  [`${C}notifications/notification-center-actions.tsx`]: 1,
}

// GF3 hand-written field class strings
const FIELD_CLASS_STRINGS: Record<string, number> = {
  // 1a
  // 1b
  // 1c
  // 1d
  [`${C}audit/audit-mark-not-found-button.tsx`]: 1,
  [`${C}audit/audit-scan-component-missing-dialog.tsx`]: 1,
  // 1g
  [`${C}master-data/asset-model-form.tsx`]: 6,
  // 1e
  [`${C}assets/asset-form.tsx`]: 27,
  [`${C}assets/asset-batch-form.tsx`]: 1,
  [`${C}assets/asset-component-manager.tsx`]: 5,
  [`${C}assets/asset-attachments.tsx`]: 1,
  // 1f
  [`${C}admin/system-settings-form.tsx`]: 48,
  [`${C}admin/depreciation-policy-builder.tsx`]: 3,
  // 2
  [`${C}master-data/branch-form.tsx`]: 5,
  [`${C}master-data/brand-form.tsx`]: 1,
  [`${C}master-data/category-form.tsx`]: 9,
  [`${C}master-data/company-form.tsx`]: 6,
  [`${C}master-data/department-form.tsx`]: 3,
  [`${C}master-data/employee-form.tsx`]: 10,
  [`${C}master-data/location-form.tsx`]: 6,
  [`${C}master-data/supplier-form.tsx`]: 1,
  // 3
  [`${C}disposal/disposal-bulk-approval.tsx`]: 1,
  [`${C}disposal/disposal-bulk-execution.tsx`]: 5,
  [`${C}audit/audit-round-form.tsx`]: 6,
  [`${C}audit/audit-round-cancel-button.tsx`]: 1,
  [`${C}ui/confirm-text-dialog.tsx`]: 1,
  // 4
  [`${C}admin/admin-user-form.tsx`]: 5,
  [`${C}admin/role-permission-form.tsx`]: 4,
  [`${C}admin/IntegrationClientManager.tsx`]: 3,
  [`${C}admin/asset-state-review-dialog.tsx`]: 3,
  [`${C}admin/data-quality-rule-form.tsx`]: 1,
  [`${C}assets/asset-label-batch-tool.tsx`]: 4,
  [`${C}assets/asset-status-correction-button.tsx`]: 1,
  [`${C}assets/asset-register-table.tsx`]: 4,
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1,
  [`${C}auth/login-form.tsx`]: 2,
  [`${C}reports/report-preset-controls.tsx`]: 1,
  [`${C}notifications/notification-center-actions.tsx`]: 1,
}

// GF5 floors per file: [required, maxLength, minLength] on CONSTRAINT_TAGS. A floor never drops.
const CONSTRAINT_FLOORS: Record<string, readonly [number, number, number]> = {
  // 1a
  [`${C}maintenance/maintenance-plan-form.tsx`]: [4, 2, 0],
  [`${C}maintenance/repair-record-form.tsx`]: [2, 3, 0],
  [`${C}maintenance/repair-record-actions.tsx`]: [3, 6, 0],
  // 1b
  [`${C}asset-operations/checkin-form.tsx`]: [4, 0, 0],
  [`${C}asset-operations/checkout-form.tsx`]: [6, 0, 0],
  [`${C}asset-operations/transfer-form.tsx`]: [1, 1, 0],
  [`${C}asset-operations/bulk-move-form.tsx`]: [1, 1, 0],
  // 1c
  [`${C}disposal/disposal-request-form.tsx`]: [3, 1, 1],
  [`${C}disposal/disposal-batch-form.tsx`]: [1, 1, 1],
  [`${C}disposal/disposal-execution-button.tsx`]: [8, 4, 1],
  [`${C}disposal/disposal-decision-button.tsx`]: [3, 1, 0],
  // 1d
  [`${C}audit/audit-finding-review-actions.tsx`]: [1, 3, 0],
  // 1g
  [`${C}master-data/asset-model-form.tsx`]: [3, 1, 0],
  // 1e
  [`${C}assets/asset-form.tsx`]: [12, 10, 0],
  [`${C}assets/asset-batch-form.tsx`]: [10, 5, 0],
  [`${C}assets/asset-component-manager.tsx`]: [0, 4, 0],
  // 1f
  [`${C}admin/system-settings-form.tsx`]: [0, 1, 0],
  // 2
  [`${C}master-data/branch-form.tsx`]: [3, 4, 0],
  [`${C}master-data/brand-form.tsx`]: [1, 1, 0],
  [`${C}master-data/category-form.tsx`]: [4, 7, 0],
  [`${C}master-data/company-form.tsx`]: [2, 6, 0],
  [`${C}master-data/department-form.tsx`]: [2, 2, 0],
  [`${C}master-data/employee-form.tsx`]: [6, 5, 0],
  [`${C}master-data/location-form.tsx`]: [4, 3, 0],
  [`${C}master-data/supplier-form.tsx`]: [2, 6, 0],
  // 3
  [`${C}disposal/disposal-bulk-approval.tsx`]: [0, 1, 0],
  [`${C}disposal/disposal-bulk-execution.tsx`]: [5, 2, 1],
  [`${C}audit/audit-round-form.tsx`]: [7, 1, 0],
  [`${C}audit/audit-round-cancel-button.tsx`]: [1, 0, 0],
  // 4
  [`${C}admin/admin-user-form.tsx`]: [3, 4, 1],
  [`${C}admin/role-permission-form.tsx`]: [2, 3, 0],
  [`${C}admin/IntegrationClientManager.tsx`]: [3, 3, 1],
  [`${C}admin/asset-state-review-dialog.tsx`]: [1, 1, 1],
  [`${C}assets/asset-label-print.tsx`]: [0, 1, 0],
  [`${C}assets/asset-register-table.tsx`]: [1, 1, 0],
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: [0, 1, 0],
  [`${C}auth/login-form.tsx`]: [2, 0, 0],
  [`${C}reports/report-preset-controls.tsx`]: [0, 1, 0],
}

// GF7 old label span, red star, legend and checkbox markup
const OLD_MARKUP: Record<string, number> = {
  // 1a
  // 1b
  // 1c
  // 1d
  // 1g
  [`${C}master-data/asset-model-form.tsx`]: 3,
  // 1e
  [`${C}assets/asset-form.tsx`]: 10,
  [`${C}assets/asset-batch-form.tsx`]: 5,
  [`${C}assets/asset-component-manager.tsx`]: 4,
  // 1f
  [`${C}admin/system-settings-form.tsx`]: 4,
  // 2
  [`${C}master-data/branch-form.tsx`]: 3,
  [`${C}master-data/brand-form.tsx`]: 3,
  [`${C}master-data/category-form.tsx`]: 4,
  [`${C}master-data/company-form.tsx`]: 3,
  [`${C}master-data/department-form.tsx`]: 3,
  [`${C}master-data/employee-form.tsx`]: 3,
  [`${C}master-data/location-form.tsx`]: 3,
  [`${C}master-data/supplier-form.tsx`]: 3,
  // 3
  [`${C}disposal/disposal-bulk-approval.tsx`]: 3, // → 2: list checkboxes :456, :499 (2B)
  [`${C}disposal/disposal-bulk-execution.tsx`]: 5, // → 2: list checkboxes :689, :738 (2B)
  [`${C}audit/audit-round-form.tsx`]: 3,
  [`${C}audit/audit-findings-batch-actions.tsx`]: 1, // → 1: list checkbox :113 (2B, O5)
  // 4
  [`${C}admin/admin-user-form.tsx`]: 4,
  [`${C}admin/role-permission-form.tsx`]: 5,
  [`${C}admin/IntegrationClientManager.tsx`]: 5,
  [`${C}admin/data-quality-rule-form.tsx`]: 1,
  [`${C}assets/asset-label-batch-tool.tsx`]: 1,
  [`${C}assets/asset-scan-search-tool.tsx`]: 1,
  [`${C}assets/asset-register-table.tsx`]: 6, // → 2: list checkboxes :549, :620 (2B, O1)
  [`${C}auth/login-form.tsx`]: 2,
  [`${C}reports/report-preset-controls.tsx`]: 1,
}

// GB1 <Loader2 tags (every tag, also icons kept in a variable)
const LOADER2: Record<string, number> = {
  // 1a
  [`${C}maintenance/maintenance-attachments.tsx`]: 1, // → 1: the delete button :210 (2D)
  // 1b
  // 1c
  [`${C}disposal/disposal-asset-picker.tsx`]: 1, // → 1: the spinner in the search field :58
  // 1d
  [`${C}audit/audit-scan-check-form.tsx`]: 1, // components header toggle :242 (§6.14)
  [`${C}audit/audit-finding-review-actions.tsx`]: 2, // → 2: the row triggers :102, :112 (2B, O21)
  [`${C}audit/audit-mark-not-found-button.tsx`]: 2,
  [`${C}audit/audit-scan-component-missing-dialog.tsx`]: 1,
  // 1g
  [`${C}master-data/asset-model-form.tsx`]: 2,
  // 1e
  [`${C}assets/asset-form.tsx`]: 1,
  [`${C}assets/asset-batch-form.tsx`]: 2,
  [`${C}assets/asset-component-manager.tsx`]: 3, // → 1: the status line :474
  [`${C}assets/asset-attachments.tsx`]: 2,
  // 1f
  [`${C}admin/system-settings-form.tsx`]: 4,
  // 2
  [`${C}master-data/branch-form.tsx`]: 1,
  [`${C}master-data/brand-form.tsx`]: 1,
  [`${C}master-data/category-form.tsx`]: 1,
  [`${C}master-data/company-form.tsx`]: 1,
  [`${C}master-data/department-form.tsx`]: 1,
  [`${C}master-data/employee-form.tsx`]: 1,
  [`${C}master-data/location-form.tsx`]: 1,
  [`${C}master-data/supplier-form.tsx`]: 1,
  // 3
  [`${C}disposal/disposal-bulk-approval.tsx`]: 4, // → 3: :424 (2B) and the status lines :546, :547
  [`${C}disposal/disposal-bulk-execution.tsx`]: 2, // → 1: BusyLabel :993 (:971 goes with the footer, GD3)
  [`${C}audit/audit-round-form.tsx`]: 2,
  [`${C}audit/audit-round-cancel-button.tsx`]: 2,
  [`${C}audit/audit-findings-batch-actions.tsx`]: 2, // → 2: the buttons :88, :97 (2B, O5)
  [`${C}maintenance/maintenance-plan-state-actions.tsx`]: 1,
  // 4
  [`${C}admin/admin-user-form.tsx`]: 1,
  [`${C}admin/role-permission-form.tsx`]: 1,
  [`${C}admin/IntegrationClientManager.tsx`]: 4, // → 2: the status line :528 and the row button :863 (2D)
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // → 2: the status lines :321, :469
  [`${C}assets/asset-label-print.tsx`]: 1,
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // → 1: the status line :146
  [`${C}assets/asset-register-table.tsx`]: 1,
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 2, // → 1: the status line :131
  [`${C}auth/login-form.tsx`]: 1,
}

// GL3 old helpers: FormStep, WizardStep, Choice, AssetStateFieldLabel and the batch asset tag help label
const OLD_HELPERS: Record<string, number> = {
  [`${C}assets/asset-form.tsx`]: 1, // function AssetStateFieldLabel (1e)
  [`${C}assets/asset-batch-form.tsx`]: 2, // aria-label={t("batchAssetTagHelp")} (1e)
  [`${C}admin/system-settings-form.tsx`]: 1, // function WizardStep (1f)
  [`${C}assets/asset-import-preview-panel.tsx`]: 1, // function WizardStep (batch 4)
}

// GD4 flex-col-reverse in the 2C files and in ui/ (Task 4 already fixed ui/dialog.tsx DialogFooter and ui/alert-dialog.tsx:94)
const REVERSE: Record<string, number> = {
  [`${C}assets/asset-form.tsx`]: 1, // 1e (the save bar)
  [`${C}assets/asset-component-manager.tsx`]: 2, // 1e (I24)
  [`${C}admin/system-settings-form.tsx`]: 1, // 1f
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1, // batch 3
  [`${C}maintenance/maintenance-plan-state-actions.tsx`]: 1, // batch 3
  [`${C}admin/IntegrationClientManager.tsx`]: 1, // batch 4
}

// GD1 closeLabel={…cancel…}: the X read "Cancel"
const CLOSE_LABEL_IS_CANCEL: Record<string, number> = {
  [`${C}admin/system-settings-form.tsx`]: 1, // → 0 in 1f
  [`${C}admin/IntegrationClientManager.tsx`]: 1, // → 0 in batch 4
}

// GL1 class strings with both fixed and bottom-
const FIXED_BOTTOM_BARS: Record<string, number> = {
  [`${C}assets/asset-form.tsx`]: 1, // :1501 → StickyFormFooter (1e), then delete the row
  [`${C}assets/asset-register-table.tsx`]: 1, // :455 the mobile multi-select bar (2B / phase 3)
  [`${C}ui/mobile-action-bar.tsx`]: 1, // batch 5 deletes both files
  [`${C}disposal/disposal-mobile-action-bar.tsx`]: 1, // and adds "ui/action-bar.tsx": 1
}

// GD2 files whose AccessibleDialogs still wait for AccessibleDialogFooter. The commit that migrates a file's dialogs removes its line.
const PENDING_FOOTER_PARTS = new Set([
  // 1a
  `${C}maintenance/maintenance-attachments.tsx`, // the delete dialog :239 waits for batch 5 (K12)
  // 1b
  // 1c
  // 1d
  `${C}audit/audit-mark-not-found-button.tsx`,
  `${C}audit/audit-scan-component-missing-dialog.tsx`,
  // 1e
  `${C}assets/asset-component-manager.tsx`,
  // 1f
  `${C}admin/system-settings-form.tsx`,
  // 3
  `${C}disposal/disposal-bulk-approval.tsx`,
  `${C}disposal/disposal-bulk-execution.tsx`,
  `${C}audit/audit-round-cancel-button.tsx`,
  `${C}maintenance/maintenance-plan-state-actions.tsx`,
  `${C}ui/confirm-text-dialog.tsx`,
  // 4
  `${C}admin/IntegrationClientManager.tsx`,
  `${C}admin/asset-state-review-dialog.tsx`,
  `${C}assets/asset-register-table.tsx`,
  `${C}asset-operations/transaction-cancel-dialog.tsx`,
])

test("the JSX reader skips arrows, selectors, braces, quoted text and comments", () => {
  const source = [
    '<input onChange={(e) => set(e.target.value)} className="[&>svg]:size-4 required" required />',
    '<Field label={t("a")} required>',
    '  <Input value={x > 1 ? "a" : "b"} maxLength={20} />',
    "</Field>",
    "// <input commented />",
    '<label htmlFor="n"><label>inner</label></label>',
    '<Field label={t("open")}>',
  ].join("\n")
  const [input, ...more] = findJsxTags(source, ["input"])
  assert.equal(more.length, 0, "a tag on a // line is a comment")
  assert.equal(hasJsxAttr(input.text, "required"), true)
  assert.equal(input.selfClosing, true)
  assert.equal(jsxAttrValue(input.text, "className"), "[&>svg]:size-4 required")
  assert.equal(jsxAttrValue(input.text, "onChange"), "(e) => set(e.target.value)")
  const [field, open] = findJsxElements(source, "Field")
  assert.equal(field.line, 2)
  assert.equal(jsxAttrValue(field.text, "label"), 't("a")')
  assert.equal(jsxAttrValue(field.text, "required"), "")
  assert.equal(jsxAttrValue(field.text, "hint"), null)
  assert.match(field.children ?? "", /<Input value=/)
  assert.equal(open.children, null, "no closing tag")
  const [control] = findJsxTags(field.children ?? "", ["Input"])
  assert.equal(jsxAttrValue(control.text, "maxLength"), "20")
  const [outer] = findJsxElements(source, "label")
  assert.equal(outer.children, "<label>inner</label>", "same-name nesting is counted")
  assert.equal(hasJsxAttr("<Input value={required} />", "required"), false)
  assert.equal(hasJsxAttr('<Input className="x required" />', "required"), false)
  assert.equal(hasJsxAttr("<Input aria-required />", "required"), false)
  assert.equal(findJsxTags("<SelectField required />", ["Select"]).length, 0)
  assert.deepEqual(countByFile([{ path: "src/a.tsx", source: "<input /><input />" }, { path: "src/b.tsx", source: "" }], (file) => findJsxTags(file.source, ["input"]).length), { "src/a.tsx": 2 })
  assert.deepEqual(budgetOverruns({ "src/a.tsx": 2, "src/b.tsx": 1 }, { "src/a.tsx": 2 }), ["src/b.tsx: 1 > 0"])
})

test("the guard's own lists name real 2C files", () => {
  const exists = (path: string) => sources.some((file) => file.path === path)
  const problems: string[] = []
  for (const path of Object.values(BATCH_FILES).flat()) if (!exists(C + path)) problems.push(`BATCH_FILES: ${path} not found`)
  for (const path of MIGRATED_FILES) if (!owned.has(path)) problems.push(`MIGRATED_FILES: ${path} is not a 2C file`)
  const ownedKeys = {
    LOCAL_FIELD,
    RAW_FIELDS,
    FIELD_CLASS_STRINGS,
    CONSTRAINT_FLOORS,
    OLD_MARKUP,
    LOADER2,
    OLD_HELPERS,
    CLOSE_LABEL_IS_CANCEL,
    FIXED_BOTTOM_BARS,
    BUSY_LABEL_SWAPS,
    STICKY_FOOTER_ROUTES,
  }
  for (const [name, budget] of Object.entries(ownedKeys)) {
    for (const path of Object.keys(budget)) if (!owned.has(path)) problems.push(`${name}: ${path} is not a 2C file`)
  }
  for (const path of Object.keys(REVERSE)) if (!owned.has(path) && !path.startsWith(`${C}ui/`)) problems.push(`REVERSE: ${path} is outside the 2C files and ui/`)
  for (const path of PENDING_FOOTER_PARTS) if (!owned.has(path)) problems.push(`PENDING_FOOTER_PARTS: ${path} is not a 2C file`)
  assert.deepEqual(problems, [])
})

test("GF1 no 2C file keeps its own Field component", () => {
  assertWithinBudget(countMatchesByFile(sources, /\bfunction Field\s*\(/g, notOwned), LOCAL_FIELD, "GF1 local function Field(")
})

test("GF2 hand-written inputs, selects and textareas do not grow", () => {
  assertWithinBudget(countByFile(sources, (file) => rawFieldTags(file.source).length, notOwned), RAW_FIELDS, "GF2 hand-written fields")
})

test("GF3 hand-written field class strings do not grow", () => {
  assertWithinBudget(countByFile(sources, (file) => classStringsWhere(file.source, isFieldClassString), notOwned), FIELD_CLASS_STRINGS, "GF3 field class strings")
})

test("GF4 a Field that shows the required star keeps native required on its control (critic risk 5)", () => {
  const problems: string[] = []
  for (const file of migratedSources()) {
    const vTrack = /\bnoValidate\b/.test(file.source) && /\bvalidate\(/.test(file.source)
    for (const field of findJsxElements(file.source, "Field")) {
      const where = `${file.path}:${field.line}`
      const children = field.children ?? ""
      if (findJsxTags(children, ["SearchableSelect"]).length > 0) problems.push(`${where}: SearchableSelect inside Field (it renders its own label)`)
      // The first control (a file input counts; checkbox, radio and hidden do not).
      const control = findJsxTags(children, CONTROL_TAGS).find((tag) => !/^(?:checkbox|radio|hidden)$/.test(jsxAttrValue(tag.text, "type") ?? ""))
      const star = hasJsxAttr(field.text, "required")
      const native = control ? hasJsxAttr(control.text, "required") : /\brequired\b/.test(children)
      const exempt = STAR_ONLY.has(`${file.path}|${jsxAttrValue(field.text, "label")}`)
      if (star && !native && !vTrack && !exempt) problems.push(`${where}: star without native required (the only browser check would disappear)`)
      if (native && !star) problems.push(`${where}: native required without the star`)
    }
  }
  assert.deepEqual(problems, [])
})

test("GF5 required, maxLength and minLength never disappear quietly (K4)", () => {
  const lost: string[] = []
  for (const [path, floor] of Object.entries(CONSTRAINT_FLOORS)) {
    const tags = findJsxTags(read(path), CONSTRAINT_TAGS)
    CONSTRAINT_ATTRS.forEach((attr, index) => {
      const count = tags.filter((tag) => hasJsxAttr(tag.text, attr)).length
      if (count < floor[index]) lost.push(`${path}: ${attr} ${count} < ${floor[index]}`)
    })
  }
  assert.deepEqual(lost, [], "Field only adds aria-required: keep required, maxLength and minLength on the control itself")
})

test("GF6 money fields open the decimal keypad (K26)", () => {
  const problems: string[] = []
  for (const file of migratedSources()) {
    for (const tag of findJsxTags(file.source, ["Input", "input"])) {
      if (/\sstep="0\.01"/.test(tag.text) && jsxAttrValue(tag.text, "inputMode") !== "decimal") problems.push(`${file.path}:${tag.line}`)
    }
  }
  assert.deepEqual(problems, [], 'a step="0.01" field needs inputMode="decimal"')
})

test("GF7 the old label, star, legend and checkbox markup does not grow", () => {
  assertWithinBudget(countMatchesByFile(sources, OLD_FIELD_MARKUP, notOwned), OLD_MARKUP, "GF7 old field markup")
})

test("GF8 a label never wraps something that brings its own label", () => {
  const problems: string[] = []
  for (const file of migratedSources()) {
    for (const label of findJsxElements(file.source, "label")) {
      const nested = (label.children ?? "").match(/<(Field|FileDropzone|ScannerTextInput|SearchableSelect|label)(?=[\s/>])/)
      if (nested) problems.push(`${file.path}:${label.line}: <label> wraps <${nested[1]}>`)
    }
  }
  assert.deepEqual(problems, [])
})

test("GB1 hand-written spinners do not grow", () => {
  assertWithinBudget(countMatchesByFile(sources, /<Loader2\b/g, notOwned), LOADER2, "GB1 <Loader2")
})

test("GB2 a spinner outside a button stops for users who reduce motion", () => {
  const problems: string[] = []
  for (const file of migratedSources()) {
    const buttons = [...findJsxElements(file.source, "Button"), ...findJsxElements(file.source, "button")].filter((button) => button.children !== null)
    for (const loader of findJsxTags(file.source, ["Loader2"])) {
      const inButton = buttons.some((button) => loader.start >= button.end && loader.start < button.closeEnd)
      if (!inButton && !/\bmotion-reduce:animate-none\b/.test(loader.text)) problems.push(`${file.path}:${loader.line}`)
    }
  }
  assert.deepEqual(problems, [], "add motion-reduce:animate-none")
})

test("GB3 a busy button keeps its label (K13)", () => {
  const problems: string[] = []
  for (const [path, swap] of Object.entries(BUSY_LABEL_SWAPS)) {
    if (migrated.has(path) && swap.test(read(path))) problems.push(`${path}: ${swap}`)
  }
  assert.deepEqual(problems, [])
})

test("GB4 disabled never repeats the busy condition, so focus stays on the busy button", () => {
  const problems: string[] = []
  let busyTags = 0
  for (const file of sources) {
    for (const tag of findJsxTags(file.source, ["[A-Za-z][\\w.]*"])) {
      const busy = jsxAttrValue(tag.text, "busy")
      if (busy === null) continue
      busyTags++
      const disabled = jsxAttrValue(tag.text, "disabled")
      if (disabled === null || busy.trim() === "") continue
      const expression = busy.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")
      if (new RegExp(`(?<![\\w.$])${expression}(?![\\w$])`).test(disabled)) problems.push(`${file.path}:${tag.line}: busy={${busy}} disabled={${disabled}}`)
    }
  }
  assert.ok(busyTags > 0, "the reader found no busy= at all")
  assert.deepEqual(problems, [])
})

test("GD1 close buttons are named in the reader's language, never Close or Cancel", () => {
  const english = ["dialog", "sheet", "alert-dialog", "accessible-dialog"]
    .map((name) => `${C}ui/${name}.tsx`)
    .filter((path) => !read(path) || /"Close"|>\s*Close\s*</.test(read(path)))
  assert.deepEqual(english, [], 'these dialog primitives are missing or still say "Close"')
  assert.deepEqual(findMatches(sources, LITERAL_CLOSE_LABEL), [], 'take the X label from tCommon("close") or a key')
  assertWithinBudget(countMatchesByFile(sources, CLOSE_IS_CANCEL), CLOSE_LABEL_IS_CANCEL, "GD1 closeLabel set to a cancel label")
})

test("GD2 migrated dialogs use the footer part, and the pending list holds only files still waiting", () => {
  const problems: string[] = []
  for (const file of sources) {
    if (file.path === `${C}ui/accessible-dialog.tsx`) continue
    const dialogs = findJsxTags(file.source, ["AccessibleDialog"]).length
    const footers = findJsxTags(file.source, ["AccessibleDialogFooter"]).length
    if (PENDING_FOOTER_PARTS.has(file.path)) {
      if (dialogs === 0) problems.push(`${file.path}: no AccessibleDialog left; remove it from PENDING_FOOTER_PARTS`)
      if (footers > 0) problems.push(`${file.path}: uses AccessibleDialogFooter now; remove it from PENDING_FOOTER_PARTS`)
    } else if (footers < dialogs) problems.push(`${file.path}: ${dialogs} AccessibleDialog, ${footers} AccessibleDialogFooter`)
  }
  for (const path of PENDING_FOOTER_PARTS) if (!read(path)) problems.push(`${path}: listed in PENDING_FOOTER_PARTS but not found`)
  assert.deepEqual(problems, [])
})

test("GD3 a dialog footer holds only Button parts", () => {
  const problems: string[] = []
  for (const file of sources) {
    for (const footer of findJsxElements(file.source, "AccessibleDialogFooter")) {
      if (footer.children === null) {
        problems.push(`${file.path}:${footer.line}: no closing tag`)
        continue
      }
      const bad = footer.children.match(/<button(?=[\s/>])|<Loader2\b|className=|size="|flex-col-reverse|\bsticky\b|opacity-/)
      if (bad) problems.push(`${file.path}:${footer.line}: ${bad[0]}`)
    }
  }
  assert.deepEqual(problems, [], "use Button / AccessibleDialogCancel with the default size, busy for work in progress, and no classes")
})

test("GD4 the secondary action comes before the primary one, and nothing reverses the order (K8)", () => {
  const problems: string[] = []
  for (const file of sources) {
    for (const name of ["AccessibleDialogFooter", "StickyFormFooter"]) {
      for (const footer of findJsxElements(file.source, name)) {
        const children = footer.children ?? ""
        const secondary = children.search(/<AccessibleDialogCancel\b|variant(?:=|: )"outline"/)
        const submit = children.indexOf('type="submit"')
        if (secondary !== -1 && submit !== -1 && submit < secondary) problems.push(`${file.path}:${footer.line}: submit before the secondary action`)
      }
    }
  }
  assert.deepEqual(problems, [])
  assertWithinBudget(countMatchesByFile(sources, /\bflex-col-reverse\b/g, (path) => notOwned(path) && !path.startsWith(`${C}ui/`)), REVERSE, "GD4 flex-col-reverse")
})

test("GD5 a dialog that renders inside a form has no form and no submit button of its own (P13)", () => {
  const problems: string[] = []
  let pairs = 0
  for (const file of sources) {
    for (const form of findJsxElements(file.source, "form")) {
      for (const dialog of findJsxElements(form.children ?? "", "AccessibleDialog")) {
        pairs++
        if (/<form(?=[\s/>])|type="submit"/.test(dialog.children ?? "")) problems.push(`${file.path}:${form.line}: the dialog inside this form submits the outer form`)
      }
    }
  }
  assert.ok(pairs > 0, "expected the settings prefix dialog inside the settings form")
  assert.deepEqual(problems, [])
})

test("GD6 a form that holds a dialog footer is a flex column, so the footer stays at the bottom", () => {
  const problems: string[] = []
  for (const file of sources) {
    for (const form of findJsxElements(file.source, "form")) {
      const children = form.children ?? ""
      // A page form that wraps a whole dialog (the settings prefix dialog) is not the dialog's form.
      if (!/<AccessibleDialogFooter(?=[\s/>])/.test(children) || /<AccessibleDialog(?=[\s/>])/.test(children)) continue
      if (jsxAttrValue(form.text, "className") !== "accessibleDialogFormClasses") problems.push(`${file.path}:${form.line}`)
    }
  }
  assert.deepEqual(problems, [], "use className={accessibleDialogFormClasses}")
})

test("GL1 the long-form save bar is a flat sticky bar, used only on focus routes", () => {
  const footer = read(`${C}ui/sticky-form-footer.tsx`)
  assert.match(footer, /\bsticky\b/)
  assert.doesNotMatch(footer, /\bfixed\b|\bshadow-|backdrop-blur|\bbg-[\w-]+\/\d+/)
  const problems: string[] = []
  for (const file of sources) {
    if (findJsxTags(file.source, ["StickyFormFooter"]).length === 0) continue
    const routes = STICKY_FOOTER_ROUTES[file.path]
    if (!routes) problems.push(`${file.path}: add its routes to STICKY_FOOTER_ROUTES`)
    for (const route of routes ?? []) if (getMobileShellMode(route) !== "focus") problems.push(`${file.path}: ${route} shows the bottom navigation, which covers the bar`)
  }
  assert.deepEqual(problems, [])
  const fixedBottom = (text: string) => /\bfixed\b/.test(text) && /\bbottom-/.test(text)
  assertWithinBudget(countByFile(sources, (file) => classStringsWhere(file.source, fixedBottom), notOwned), FIXED_BOTTOM_BARS, "GL1 fixed bottom bars")
})

// GL2 (form routes hide the bottom navigation, K15) arrives with the K15 commit in Task 18.

test("GL3 the old step, choice and label helpers do not come back", () => {
  assertWithinBudget(countMatchesByFile(sources, OLD_HELPER_MARKUP, notOwned), OLD_HELPERS, "GL3 old helpers")
})
