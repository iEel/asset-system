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
    ["asset_tag_running_digits", "2.5", "invalidNumber"],
    ["asset_tag_running_digits", "", null],
    ["ldap_sync_max_scheduled_deactivations", "-1", "outOfRange"],
    ["ldap_sync_max_scheduled_deactivations", "1.5", "invalidNumber"],
    ["operation_document_running_digits", "4.5", "invalidNumber"],
    ["asset_label_12_width_mm", "40.5", "invalidNumber"],
    ["asset_label_custom_margin_mm", "0.3", "invalidNumber"],
    ["asset_label_custom_margin_mm", "1.5", null],
    ["company_name", "1.5", null],
  ]
  for (const [key, value, code] of control) assert.equal(rules.settingControlCode(key, value), code, `${key} = ${value}`)
  assert.deepEqual(await serverErrors(defaults.map((entry) => (entry.key === "asset_label_12_width_mm" ? { ...entry, value: "40.5" } : entry))), {}, "the server takes a width of 40.5")
  assert.deepEqual(rules.settingSaveErrors(defaults.map((entry) => (entry.key === "asset_label_12_width_mm" ? { ...entry, value: "40.5" } : entry)), [], every), { "settings.asset_label_12_width_mm": "invalidNumber" })
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
  const codes: [string, string][] = [["asset_tag_running_digits", "outOfRange"], ["asset_label_12_width_mm", "invalidNumber"], ["asset_label_custom_margin_mm", "invalidNumber"]]
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
