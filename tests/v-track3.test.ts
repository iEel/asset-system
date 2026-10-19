import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { issuesToFieldErrors, settingFieldKeyFor } from "../src/lib/field-errors.ts"

// V track plan 3: the settings form and its prefix editor show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #45 and #46, U8). One test per task, appended
// in order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

// The settings rules and the server's schema import "@/…", which node --test cannot load: a resolve hook maps it to src,
// as tests/v-track-s.test.ts does. Nothing here needs a stand-in.
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>

type Entry = { key: string; value: string }
type Rules = {
  settingSaveErrors(entries: readonly Entry[], prefixRows: readonly { categoryId: string; prefix: string }[], changedKeys: ReadonlySet<string>): Record<string, string>
  settingLiveErrors(entries: readonly Entry[], prefixRows: readonly { categoryId: string; prefix: string }[]): Record<string, string>
  settingControlCode(key: string, value: string): string | null
  isValidCategoryPrefix(prefix: string): boolean
  settingFieldKey(key: string): string
  settingKeyOf(field: string): string
}
type Schema = { systemSettingsUpdateSchema: { safeParse(input: unknown): { success: boolean; error?: { issues: Parameters<typeof issuesToFieldErrors>[0] } } } }

// What the settings route answers for this list: no fieldErrors when the schema passes, else the keyed codes (S-R4).
async function serverErrors(entries: readonly Entry[]) {
  const { systemSettingsUpdateSchema } = await load<Schema>("src/lib/validations/system-settings.ts")
  const input = { settings: entries }
  const parsed = systemSettingsUpdateSchema.safeParse(input)
  return parsed.success ? {} : issuesToFieldErrors(parsed.error!.issues, settingFieldKeyFor(input))
}

test("the settings rules answer what the server answers for every setting, and the controls' own limits on top (v-track plan 3 task 1, ST1)", async () => {
  const rules = await load<Rules>("src/lib/system-settings-field-rules.ts")
  const { systemSettingDefaults } = await load<{ systemSettingDefaults: readonly Entry[] }>("src/lib/system-setting-defaults.ts")
  const defaults = systemSettingDefaults.map(({ key, value }) => ({ key, value }))
  // A save checks the controls' own limits only on the settings it changes (open issue 13): here every setting changes.
  const every = new Set(defaults.map(({ key }) => key))
  // The shipped defaults break no rule on either side.
  assert.deepEqual(await serverErrors(defaults), {})
  assert.deepEqual(rules.settingSaveErrors(defaults, [], every), {})
  // One broken value for every rule of systemSettingsUpdateSchema: the form finds the code the server answers.
  const broken: Record<string, [string, string]> = {
    asset_tag_format_template: ["{companyCode}-{bogus}", "assetTagTemplateInvalid"],
    asset_label_default_tape_size: ["36", "labelTapeSizeInvalid"],
    asset_qr_public_base_url: ["ftp://asset.example", "publicQrUrlInvalid"],
    asset_label_12_width_mm: ["200", "labelWidthRange"],
    asset_label_18_height_mm: ["", "labelHeightRange"],
    asset_label_24_qr_size: ["19", "labelQrSizeRange"],
    asset_label_custom_margin_mm: ["11", "labelSpacingRange"],
    asset_label_12_gap_mm: ["-1", "labelSpacingRange"],
    asset_label_18_layout: ["qr-right", "labelLayoutUnsupported"],
    asset_label_compact_asset_name_enabled: ["yes", "labelToggleInvalid"],
    asset_label_24_primary_template: ["{assetTag} {owner}", "labelTemplateTokens"],
    checkout_document_template: ["CO-{year}", "documentTemplateInvalid"],
    operation_document_running_digits: ["13", "documentRunningDigitsRange"],
    notification_return_due_soon_days: ["1.5", "notificationDaysRange"],
    notification_license_expiry_days: ["366", "notificationDaysRange"],
    retention_audit_log_days: ["0", "retentionDaysRange"],
    ldap_sync_mode: ["sometimes", "schedulerModeInvalid"],
    ldap_sync_schedule: ["every day", "schedulerCronInvalid"],
    accounting_depreciation_policy: ["{", "depreciationPolicyInvalid"],
    workflow_approval_disposal_required: ["yes", "approvalToggleInvalid"],
    workflow_approval_min_approvers: ["6", "approvalMinApproversRange"],
    workflow_approval_sla_days: ["0", "approvalSlaDaysRange"],
  }
  const entries = defaults.map(({ key, value }) => ({ key, value: broken[key]?.[0] ?? value }))
  assert.equal(entries.filter((entry) => broken[entry.key]).length, Object.keys(broken).length, "every broken key is a default setting")
  const expected = Object.fromEntries(Object.entries(broken).map(([key, [, code]]) => [`settings.${key}`, code]))
  assert.deepEqual(await serverErrors(entries), expected)
  assert.deepEqual(rules.settingSaveErrors(entries, [], every), expected)
  // Every code reads its own sentence in both languages (the hook resolves apiErrors after common.validation).
  for (const code of new Set(Object.values(expected))) {
    for (const locale of ["th", "en"] as const) assert.equal(typeof messages(locale).apiErrors[code], "string", `${locale} apiErrors.${code}`)
  }
  // While typing, only the rules the old boxes showed (spec U8); the tape size, the compact toggle and the sync mode wait
  // for save (U6).
  const live = { ...expected }
  for (const key of ["asset_label_default_tape_size", "asset_label_compact_asset_name_enabled", "ldap_sync_mode"]) delete live[`settings.${key}`]
  assert.deepEqual(rules.settingLiveErrors(entries, []), live)
  // The server's 5000-character limit, after trimming as the server does.
  const long = defaults.map(({ key, value }) => ({ key, value: key === "company_name" ? `  ${"x".repeat(5001)}  ` : value }))
  assert.deepEqual(await serverErrors(long), { "settings.company_name": "tooLong" })
  assert.deepEqual(rules.settingSaveErrors(long, [], every), { "settings.company_name": "tooLong" })
  // What the control allowed before noValidate, where the server allows more: client only, on save.
  const control: [string, string, string | null][] = [
    ["asset_tag_running_digits", "13", "outOfRange"],
    ["asset_tag_running_digits", "2.5", "notWholeNumber"],
    ["asset_tag_running_digits", "", null],
    ["ldap_sync_max_scheduled_deactivations", "-1", "outOfRange"],
    ["ldap_sync_max_scheduled_deactivations", "1.5", "notWholeNumber"],
    ["operation_document_running_digits", "4.5", "notWholeNumber"],
    ["asset_label_12_width_mm", "40.5", "notWholeNumber"],
    ["asset_label_custom_margin_mm", "0.3", "invalidNumber"],
    ["asset_label_custom_margin_mm", "1.5", null],
    ["company_name", "1.5", null],
  ]
  for (const [key, value, code] of control) assert.equal(rules.settingControlCode(key, value), code, `${key} = ${value}`)
  assert.deepEqual(await serverErrors(defaults.map((entry) => (entry.key === "asset_label_12_width_mm" ? { ...entry, value: "40.5" } : entry))), {}, "the server takes a width of 40.5")
  assert.deepEqual(rules.settingSaveErrors(defaults.map((entry) => (entry.key === "asset_label_12_width_mm" ? { ...entry, value: "40.5" } : entry)), [], every), { "settings.asset_label_12_width_mm": "notWholeNumber" })
  // A field key is the server's: settings.<key>, and back.
  assert.equal(rules.settingFieldKey("asset_label_12_width_mm"), "settings.asset_label_12_width_mm")
  assert.equal(rules.settingKeyOf("settings.asset_label_12_width_mm"), "asset_label_12_width_mm")
  // The prefix groups: no server rule; a stored group with a bad prefix shows the editor's own sentence under the table.
  assert.equal(rules.isValidCategoryPrefix(" ab1 "), true)
  assert.equal(rules.isValidCategoryPrefix("A"), false)
  assert.equal(rules.isValidCategoryPrefix("AB-1"), false)
  const badPrefix = [{ categoryId: "c1", prefix: "COM" }, { categoryId: "c2", prefix: "A" }]
  assert.deepEqual(rules.settingSaveErrors(defaults, badPrefix, every), { "settings.asset_tag_category_prefixes": "invalidPrefix" })
  assert.deepEqual(rules.settingLiveErrors(defaults, badPrefix), { "settings.asset_tag_category_prefixes": "invalidPrefix" })
  // Each setting opens on the tab that shows it (spec §4.2); the depreciation policy is on the organization tab.
  const { getSystemSettingsTabForKey } = await load<{ getSystemSettingsTabForKey(key: string): string }>("src/lib/settings-search.ts")
  assert.equal(getSystemSettingsTabForKey("accounting_depreciation_policy"), "organization")
  assert.equal(getSystemSettingsTabForKey("asset_tag_category_prefixes"), "asset-numbering")
})

// The controls' own limits are client rules the server does not have (ST-R2), so a value stored before noValidate (a
// save from another tab, which the browser did not check) can break one. Like the asset edit form's warranty pair (spec
// §7.4), they are checked only on the settings a save changes; the server's rules stay on every setting sent (open issue
// 13, the user's answer).
test("a stored value only a control's own limit refuses stops a save only when the save changes that setting (v-track plan 3 task 1, ST1, open issue 13)", async () => {
  const rules = await load<Rules>("src/lib/system-settings-field-rules.ts")
  const { systemSettingDefaults } = await load<{ systemSettingDefaults: readonly Entry[] }>("src/lib/system-setting-defaults.ts")
  const stored: Record<string, string> = { asset_tag_running_digits: "13", asset_label_12_width_mm: "40.5", asset_label_custom_margin_mm: "0.3" }
  const entries = systemSettingDefaults.map(({ key, value }) => ({ key, value: key === "company_name" ? "Another Company" : (stored[key] ?? value) }))
  assert.deepEqual(await serverErrors(entries), {}, "the server takes each stored value")
  // A save of another setting (the company name): the stored values do not stop it.
  assert.deepEqual(rules.settingSaveErrors(entries, [], new Set(["company_name"])), {})
  // The same value stops the save when the save changes that setting itself.
  const codes: [string, string][] = [["asset_tag_running_digits", "outOfRange"], ["asset_label_12_width_mm", "notWholeNumber"], ["asset_label_custom_margin_mm", "invalidNumber"]]
  for (const [key, code] of codes) {
    assert.deepEqual(rules.settingSaveErrors(entries, [], new Set(["company_name", key])), { [`settings.${key}`]: code }, key)
  }
  // The server's own rules and its 5000-character limit stay on every setting sent, changed or not.
  const serverBroken = entries.map((entry) =>
    entry.key === "operation_document_running_digits" ? { ...entry, value: "13" } : entry.key === "ldap_base_dn" ? { ...entry, value: "x".repeat(5001) } : entry,
  )
  const serverCodes = { "settings.operation_document_running_digits": "documentRunningDigitsRange", "settings.ldap_base_dn": "tooLong" }
  assert.deepEqual(await serverErrors(serverBroken), serverCodes)
  assert.deepEqual(rules.settingSaveErrors(serverBroken, [], new Set(["company_name"])), serverCodes)
})

// The source files the later tests read, with LF line endings.
function read(path: string) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n")
}
function formSource() {
  return read("src/components/admin/system-settings-form.tsx")
}

test("a switch, the label's name choice, each label field and the depreciation JSON take an id and an error (v-track plan 3 task 2, ST2)", () => {
  const form = formSource()
  // ToggleField: the checkbox takes the id, aria-invalid and aria-describedby; the error sits under the line, never as an alert.
  const toggle = form.slice(form.indexOf("function ToggleField("), form.indexOf("function SyncPreviewPanel("))
  assert.match(toggle, /<input\n\s+id=\{id\}\n\s+type="checkbox"\n\s+checked=\{checked\}\n\s+aria-invalid=\{error \? true : undefined\}\n\s+aria-describedby=\{errorId\}\n/)
  assert.match(toggle, /const errorId = error && id \? `\$\{id\}-error` : undefined/)
  assert.match(toggle, /\{error \? <FieldError id=\{errorId\}>\{error\}<\/FieldError> : null\}/)
  assert.doesNotMatch(toggle, /role="alert"|aria-live/)
  // The label's name choice is one group with its legend, hint and error (spec §7.3); the Segmented line is unchanged.
  assert.match(form, /<FieldGroup legend=\{label\} hint=\{description\} error=\{error\} id=\{id\}>\n\s+<Segmented aria-label=\{label\} value=\{compactEnabled \? "compact" : "full"\}/)
  assert.doesNotMatch(form, /FieldHint/)
  // Each of the nine fields of a tape's panel shows its setting's error and announces it while typing (spec U8).
  const panel = form.slice(form.indexOf("function LabelTemplatePanel("), form.indexOf("function LabelPreviewPanel("))
  assert.match(panel, /errorFor\?: \(key: string\) => string \| undefined\n/)
  for (const suffix of ["width_mm", "height_mm", "qr_size", "margin_mm", "gap_mm", "layout", "primary_template", "secondary_template", "tertiary_template"]) {
    assert.ok(panel.includes(`error={errorFor?.(\`\${prefix}_${suffix}\`)} liveError>`), suffix)
  }
  // The depreciation JSON: its id and its live error, and its closed section opens while the JSON is invalid.
  const builder = read("src/components/admin/depreciation-policy-builder.tsx")
  assert.match(builder, /export function DepreciationPolicyBuilder\(\{ categories, policyJson, labels, onPolicyJsonChange, jsonId, jsonError \}: DepreciationPolicyBuilderProps\) \{/)
  assert.match(builder, /<details ref=\{jsonDetailsRef\} className="rounded-md border border-border bg-background p-4">/)
  assert.match(builder, /useEffect\(\(\) => \{\n\s+if \(!isPolicyJsonValid && jsonDetailsRef\.current\) jsonDetailsRef\.current\.open = true\n\s+\}, \[isPolicyJsonValid\]\)/)
  assert.match(builder, /hint=\{labels\.depreciationAdvancedJsonDescription\}\n\s+id=\{jsonId\}\n\s+error=\{jsonError\}\n\s+liveError\n\s+className="mt-3"\n\s+>\n\s+<Textarea value=\{policyJson\}/)
})

// Each setting the form shows, in visual order, with its id, as the form's SETTING_FIELD_IDS lists them, and the
// expression its error is read with (true: the rule shows while typing, spec U8).
function settingFields(): [key: string, id: string, errorKey: string, live: boolean][] {
  return [
    ["asset_tag_format_template", "asset-tag-template", "assetTagFormatTemplateKey", true],
    ["asset_tag_running_digits", "asset-tag-running-digits", '"asset_tag_running_digits"', false],
    ["asset_tag_separator", "asset-tag-separator", '"asset_tag_separator"', false],
    ["asset_tag_prefix", "asset-tag-global-prefix", '"asset_tag_prefix"', false],
    ["asset_tag_category_prefixes", "category-prefix-groups", "assetTagCategoryPrefixesKey", false],
    ["asset_qr_public_base_url", "asset-qr-public-base-url", "assetQrPublicBaseUrlKey", true],
    ["asset_label_default_tape_size", "asset-label-default-tape-size", '"asset_label_default_tape_size"', false],
    ["asset_label_compact_asset_name_enabled", "asset-label-compact-asset-name", '"asset_label_compact_asset_name_enabled"', false],
    ["checkout_document_template", "checkout-document-template", "checkoutDocumentTemplateKey", true],
    ["checkin_document_template", "checkin-document-template", "checkinDocumentTemplateKey", true],
    ["operation_document_running_digits", "operation-document-running-digits", "operationDocumentRunningDigitsKey", true],
    ["company_name", "company-name", '"company_name"', false],
    ["default_currency", "default-currency", '"default_currency"', false],
    ["accounting_depreciation_policy", "depreciation-policy-json", "depreciationPolicySettingKey", true],
    ["notification_return_due_soon_days", "notification-return-due-days", "notificationReturnDueSoonDaysKey", true],
    ["notification_audit_action_due_soon_days", "notification-audit-action-days", "notificationAuditActionDueSoonDaysKey", true],
    ["notification_warranty_expiry_days", "notification-warranty-expiry-days", "notificationWarrantyExpiryDaysKey", true],
    ["notification_license_expiry_days", "notification-license-expiry-days", "notificationLicenseExpiryDaysKey", true],
    ["workflow_approval_disposal_required", "workflow-approval-disposal-required", "workflowApprovalDisposalRequiredKey", false],
    ["workflow_approval_audit_close_required", "workflow-approval-audit-close-required", "workflowApprovalAuditCloseRequiredKey", false],
    ["workflow_approval_segregation_required", "workflow-approval-segregation-required", "workflowApprovalSegregationRequiredKey", false],
    ["workflow_approval_min_approvers", "workflow-approval-min-approvers", "workflowApprovalMinApproversKey", true],
    ["workflow_approval_sla_days", "workflow-approval-sla-days", "workflowApprovalSlaDaysKey", true],
    ["retention_attachment_days", "retention-attachment-days", "retentionAttachmentDaysKey", true],
    ["retention_audit_log_days", "retention-audit-log-days", "retentionAuditLogDaysKey", true],
    ["retention_orphan_file_days", "retention-orphan-file-days", "retentionOrphanFileDaysKey", true],
    ["ldap_url", "ldap-url", '"ldap_url"', false],
    ["ldap_base_dn", "ldap-base-dn", '"ldap_base_dn"', false],
    ["ldap_bind_dn", "ldap-bind-dn", '"ldap_bind_dn"', false],
    ["ldap_bind_password", "ldap-bind-password", '"ldap_bind_password"', false],
    ["ldap_user_filter", "ldap-user-filter", '"ldap_user_filter"', false],
    ["ldap_upn_domain", "ldap-upn-domain", '"ldap_upn_domain"', false],
    ["ldap_domain", "ldap-domain", '"ldap_domain"', false],
    ["ldap_user_dn_template", "ldap-user-dn-template", '"ldap_user_dn_template"', false],
    ["ldap_sync_mode", "ldap-sync-mode", '"ldap_sync_mode"', false],
    ["ldap_sync_max_scheduled_deactivations", "ldap-sync-max-scheduled-deactivations", '"ldap_sync_max_scheduled_deactivations"', false],
    ["ldap_sync_base_dn", "ldap-sync-base-dn", '"ldap_sync_base_dn"', false],
    ["ldap_sync_default_company_code", "ldap-sync-default-company", '"ldap_sync_default_company_code"', false],
    ["ldap_sync_default_branch_code", "ldap-sync-default-branch", '"ldap_sync_default_branch_code"', false],
    ["ldap_sync_default_department_code", "ldap-sync-default-department", '"ldap_sync_default_department_code"', false],
    ["ldap_sync_filter", "ldap-sync-filter", '"ldap_sync_filter"', false],
    ["ldap_sync_schedule", "ldap-sync-custom-schedule", '"ldap_sync_schedule"', true],
  ]
}

test("the settings form shows every setting's error under its field, opens its tab and focuses it, and takes the server's refusals (v-track plan 3 task 3, ST3)", async () => {
  const form = formSource()
  assert.match(form, /<form onSubmit=\{handleSubmit\} noValidate className="space-y-6">/)
  assert.match(form, /^import \{ useFieldErrors, useValidationMessage \} from "@\/components\/ui\/use-field-errors"$/m)
  assert.match(form, /\} from "@\/lib\/system-settings-field-rules"\n/)
  // The field table in visual order: the rows, with the four tapes' label settings after the compact choice.
  const table = form.match(/const SETTING_FIELD_IDS: Readonly<Record<string, string>> = \{\n([\s\S]*?)\n\}\n/)
  assert.ok(table, "const SETTING_FIELD_IDS = { … }")
  const rows = table[1].split("\n").filter((line) => /^ {2}\w+: "[\w-]+",$/.test(line))
  assert.deepEqual(rows, settingFields().map(([key, id]) => `  ${key}: "${id}",`))
  assert.match(table[1], /\n {2}\.\.\.Object\.fromEntries\(\n {4}assetLabelTapeSizes\.flatMap\(\(size\) => LABEL_FIELD_SUFFIXES\.map\(\(suffix\) => \[`asset_label_\$\{size\}_\$\{suffix\}`, `asset_label_\$\{size\}-\$\{suffix\.replace\(\/_\/g, "-"\)\}`\]\)\)\n {2}\),\n {2}checkout_document_template:/)
  assert.match(form, /const LABEL_FIELD_SUFFIXES = \["width_mm", "height_mm", "qr_size", "margin_mm", "gap_mm", "layout", "primary_template", "secondary_template", "tertiary_template"\]/)
  // Visual order is tab order: the tabs of the table's settings never go back.
  const { getSystemSettingsTabForKey } = await load<{ getSystemSettingsTabForKey(key: string): string }>("src/lib/settings-search.ts")
  const { settingsTabIds } = await load<{ settingsTabIds: readonly string[] }>("src/lib/settings-information-architecture.ts")
  const tabs = settingFields().map(([key]) => settingsTabIds.indexOf(getSystemSettingsTabForKey(key)))
  assert.ok(tabs.every((tab, index) => tab >= 0 && (index === 0 || tab >= tabs[index - 1])), `tab order ${tabs.join(" ")}`)
  // Each id once on its control, and each setting's error under its field, live where a box showed it (spec U8).
  for (const [key, id, errorKey, live] of settingFields()) {
    // The prefix groups and the depreciation JSON take their ids in their own lines (below).
    if (key !== "asset_tag_category_prefixes" && key !== "accounting_depreciation_policy") assert.equal(form.split(`id="${id}"`).length - 1, 1, `id "${id}" once`)
    if (key === "asset_tag_category_prefixes" || key === "accounting_depreciation_policy") continue
    const error = live ? `error={settingError(${errorKey})} liveError` : `error={settingError(${errorKey})}`
    assert.equal(form.split(error).length - 1, 1, `${key}: ${error}`)
    if (!live) assert.ok(!form.includes(`${error} liveError`), `${key} waits for save (U6)`)
  }
  assert.ok(form.includes('jsonId="depreciation-policy-json"\n              jsonError={settingError(depreciationPolicySettingKey)}'))
  assert.match(form, /<div\n\s+id="category-prefix-groups"\n\s+role="group"\n\s+aria-label=\{labels\.categoryPrefixes\}\n\s+aria-describedby=\{prefixGroupsError \? "category-prefix-groups-error" : undefined\}/)
  assert.ok(form.includes('{prefixGroupsError ? <FieldError id="category-prefix-groups-error">{prefixGroupsError}</FieldError> : null}'))
  assert.ok(form.includes("errorFor={settingError}"))
  assert.match(form, /<Field label=\{setting\.key\} hideLabel error=\{settingError\(setting\.key\)\}>\n\s+<Input\n\s+id=\{settingFieldId\(setting\.key\)\}/)
  assert.match(form, /const settingFieldId = \(key: string\) => SETTING_FIELD_IDS\[key\] \?\? `setting-\$\{key\}`/)
  // The live rules and the save's errors: one line per field, the live one first; invalidPrefix reads the editor's sentence.
  assert.match(form, /const liveErrors = settingLiveErrors\(submittedSettings, activePrefixRows\)/)
  assert.match(form, /const code = liveErrors\[field\] \?\? fieldErrors\.errors\[field\]\n\s+if \(!code\) return undefined\n\s+return code === "invalidPrefix" \? labels\.invalidPrefix : validationMessage\(code, settingControlParams\[key\]\)/)
  assert.match(form, /^function validate\(entries: readonly SettingEntry\[\], prefixRows: readonly CategoryPrefixRow\[\], changed: readonly \{ key: string \}\[\]\) \{\n {2}return settingSaveErrors\(entries, prefixRows, new Set\(changed\.map\(\(setting\) => setting\.key\)\)\)\n\}$/m)
  // The controls' own limits apply to the settings this save changes: changedSettings compares each with its stored
  // value (open issue 13).
  assert.match(form, /const changedSettings = settings\.filter\(\n\s+\(setting\) => normalizeSettingValue\(setting\.key, effectiveValues\[setting\.key\]\) !== normalizeSettingValue\(setting\.key, initialValues\[setting\.key\]\)\n\s+\)/)
  // Save: validate, then the first wrong setting's tab opens and its field takes focus; a refusal does the same.
  const submit = form.slice(form.indexOf("  async function handleSubmit("), form.indexOf("  async function handleLdapTest("))
  assert.match(submit, /fieldErrors\.setErrors\(validate\(submittedSettings, activePrefixRows, changedSettings\)\)\n\s+if \(focusFirstError\(\)\) return\n/)
  assert.match(submit, /body: JSON\.stringify\(\{ settings: submittedSettings \}\)/)
  assert.match(submit, /if \(!response\.ok\) \{\n[^\n]*\n\s+if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+throw new Error\(payload\?\.error \?\? labels\.error\)\n\s+\}/)
  assert.match(form, /const fieldOrder = \[\.\.\.Object\.keys\(SETTING_FIELD_IDS\), \.\.\.generalSettings\.map\(\(setting\) => setting\.key\)\]\.map\(settingFieldKey\)/)
  assert.match(form, /fieldErrors\.focusFirst\(fieldOrder, \{\n\s+idFor: \(field\) => settingFieldId\(settingKeyOf\(field\)\),\n\s+reveal: \(field\) => selectTab\(SETTING_FIELD_IDS\[settingKeyOf\(field\)\] \? getSystemSettingsTabForKey\(settingKeyOf\(field\)\) : "advanced"\),\n\s+\}\)/)
  // A change clears its setting's error; so does a change of the prefix groups.
  assert.match(form, /const setValue = \(key: string, value: string\) => \{\n\s+setValues\(\(current\) => \(\{ \.\.\.current, \[key\]: value \}\)\)\n\s+fieldErrors\.clear\(settingFieldKey\(key\)\)\n\s+\}/)
  assert.equal(form.split("fieldErrors.clear(settingFieldKey(assetTagCategoryPrefixesKey))").length - 1, 2)
  assert.doesNotMatch(form, /setValues\(\(current\) => \(\{ \.\.\.current, \[(?:setting\.key|assetTagFormatTemplateKey)\]/)
  // No validation toast and no box on the page: the rules live in the rules module (the prefix editor is task 4).
  assert.doesNotMatch(form, /\btoast\.(?:error|warning)\(/)
  assert.doesNotMatch(form, /hasInvalid|hasDuplicateCategory|const assetTagFormatTokens = \[|function isValidCategoryPrefix/)
  assert.doesNotMatch(form, /<ValidationMessage message=\{labels\.(?!invalidPrefix\})/)
})

test("the prefix editor checks its prefix and its categories on save, its save is enabled, and the form is a V form (v-track plan 3 task 4, ST4)", () => {
  const form = formSource()
  // The editor's fields in visual order and its own rules: the prefix required and 2 to 10 A-Z or digits, a category.
  assert.match(form, /const PREFIX_EDITOR_FIELD_IDS = \{\n {2}prefix: "category-prefix-editor-prefix",\n {2}categoryIds: "category-prefix-editor-categories",\n\} as const/)
  assert.match(form, /const prefixCode = required\(editor\.prefix\) \?\? \(isValidCategoryPrefix\(editor\.prefix\) \? null : "invalidPrefix"\)/)
  assert.match(form, /const categoriesCode = atLeastOne\(editor\.categoryIds\)/)
  // Save runs the rules and focuses the first wrong field inside the dialog; the content gate is gone (spec §4.4).
  assert.match(form, /const applyPrefixEditor = \(\) => \{\n\s+if \(!prefixEditor\) return\n\s+prefixErrors\.setErrors\(validatePrefixEditor\(prefixEditor\)\)\n\s+if \(prefixErrors\.focusFirst\(PREFIX_EDITOR_ORDER, \{ idFor: \(key\) => PREFIX_EDITOR_FIELD_IDS\[key\] \}\)\) return\n/)
  assert.match(form, /<Button onClick=\{applyPrefixEditor\}>\n\s+<Save \/>\n\s+\{labels\.savePrefixGroup\}/)
  assert.doesNotMatch(form, /canApplyPrefixEditor/)
  // The prefix: a star, its error under it, live once there is a prefix (spec U8); an empty one waits for save (U6).
  assert.match(form, /<Field label=\{labels\.prefix\} required error=\{prefixEditorError\("prefix"\)\} liveError>/)
  assert.match(form, /const prefixLiveCode = prefixEditor\?\.prefix\.trim\(\) && !isValidCategoryPrefix\(prefixEditor\.prefix\) \? "invalidPrefix" : null/)
  assert.match(form, /return field === "categoryIds" \? labels\.prefixCategoriesRequired : validationMessage\(code\)/)
  // The two lists are one group with its error under them, still inside the dialog body (no form, no submit: GD5).
  assert.match(form, /<div\n\s+id="category-prefix-editor-categories"\n\s+role="group"\n\s+aria-label=\{labels\.selectedPrefixCategories\}\n\s+aria-describedby=\{prefixCategoriesError \? "category-prefix-editor-categories-error" : undefined\}/)
  assert.ok(form.includes('{prefixCategoriesError ? <FieldError id="category-prefix-editor-categories-error">{prefixCategoriesError}</FieldError> : null}\n              </AccessibleDialogBody>'))
  // A change clears its error; opening and closing start clean.
  assert.equal(form.split('prefixErrors.clear("categoryIds")').length - 1, 2)
  assert.match(form, /prefix: event\.target\.value\.toUpperCase\(\) \} : current\n\s+\)\n\s+prefixErrors\.clear\("prefix"\)/)
  assert.equal(form.split("prefixErrors.setErrors({})").length - 1, 2)
  // The boxes are gone; the editor keeps its maxLength (FMG CONSTRAINT_FLOORS).
  assert.doesNotMatch(form, /\bValidationMessage\b/)
  assert.match(form, /maxLength=\{10\}/)
  // The new sentence, in the glossary's words (หมวดหมู่), and the page passes it.
  assert.equal(messages("th").systemSettingsPage.prefixCategoriesRequired, "เลือกหมวดหมู่อย่างน้อย 1 หมวดหมู่สำหรับคำนำหน้ารหัสนี้")
  assert.equal(messages("en").systemSettingsPage.prefixCategoriesRequired, "Choose at least one category for this prefix")
  assert.match(read("src/app/[locale]/(dashboard)/admin/settings/page.tsx"), /prefixCategoriesRequired: t\("prefixCategoriesRequired"\),/)
  // The file is a V form now: V_FORMS equals V_SCOPE (spec §5, U5).
  const guards = read("tests/validation-guards.test.ts")
  assert.ok(guards.includes("  `${C}admin/system-settings-form.tsx`,\n]\n\n// Required selects"))
})

test("the save waits with its reason when nothing changed, and LDAP apply waits for a preview with its reason (v-track plan 3 task 5, ST5)", () => {
  const form = formSource()
  // Save: aria-disabled (it stays focusable), tied to the visible status line, and the handler returns first.
  assert.match(form, /<p id="settings-save-status" className="text-sm font-semibold text-foreground">\n\s+\{changedCount > 0 \? labels\.unsavedChanges/)
  assert.match(form, /<Button\n\s+type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{changedCount === 0 \|\| undefined\}\n\s+aria-describedby=\{changedCount === 0 \? "settings-save-status" : undefined\}\n\s+>/)
  assert.doesNotMatch(form, /disabled=\{changedCount === 0\}/)
  const submit = form.slice(form.indexOf("  async function handleSubmit("), form.indexOf("  async function handleLdapTest("))
  assert.match(submit, /event\.preventDefault\(\)\n(?:\s+\/\/[^\n]*\n)+\s+if \(changedCount === 0\) return\n\s+fieldErrors\.setErrors\(validate\(/)
  // LDAP apply: still disabled while a preview runs (another action is busy, not a gate); without a preview it is
  // aria-disabled, tied to the line that says no preview has run, and its handler returns first.
  assert.match(form, /disabled=\{syncingLdap === "preview"\}\n\s+aria-disabled=\{!syncPreview \|\| undefined\}\n\s+aria-describedby=\{!syncPreview \? "ldap-sync-no-preview" : undefined\}/)
  assert.match(form, /return <EmptyNote id="ldap-sync-no-preview">\{labels\.ldapSyncNoPreview\}<\/EmptyNote>/)
  assert.match(form, /async function handleLdapSync\(action: "preview" \| "apply"\) \{\n(?:\s+\/\/[^\n]*\n)+\s+if \(action === "apply" && !syncPreview\) return\n/)
  assert.doesNotMatch(form, /\|\| !syncPreview\}/)
})

test("the eleven group sentences of the old boxes and toasts are gone with their labels; the prefix sentence stays (v-track plan 3 task 6, ST6)", () => {
  const form = formSource()
  const page = read("src/app/[locale]/(dashboard)/admin/settings/page.tsx")
  const retired = [
    "duplicateCategory",
    "invalidFormatTemplate",
    "invalidPublicQrBaseUrl",
    "invalidLabelTemplate",
    "invalidLabelSize",
    "invalidOperationDocumentTemplate",
    "invalidNotificationRule",
    "invalidRetentionPolicy",
    "invalidAccountingDepreciationPolicy",
    "invalidWorkflowApproval",
    "invalidSchedulerSchedule",
  ]
  for (const key of retired) {
    assert.doesNotMatch(form, new RegExp(`\\b${key}\\b`), `form: ${key}`)
    assert.doesNotMatch(page, new RegExp(`\\b${key}\\b`), `page: ${key}`)
    for (const locale of ["th", "en"] as const) assert.equal(messages(locale).systemSettingsPage[key], undefined, `${locale}: systemSettingsPage.${key}`)
  }
  // Each setting now reads its own sentence from apiErrors (task 1); the prefix editor and the prefix groups keep theirs.
  assert.match(page, /\n\s+invalidPrefix: t\("invalidPrefix"\),\n\s+prefixCategoriesRequired: t\("prefixCategoriesRequired"\),\n/)
  assert.match(form, /\n\s+invalidPrefix: string\n\s+prefixCategoriesRequired: string\n/)
  for (const locale of ["th", "en"] as const) assert.equal(typeof messages(locale).systemSettingsPage.invalidPrefix, "string")
})
