import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Group 12 plan 5 Task 3: the settings shell to board AD-Settings — the grouped left menu with summaries and unsaved
// badges (the overview panel is gone), changed-field markers, reset behind a confirm, the counting footer and the Thai
// review table. Source pins, CRLF-safe.

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const form = () => read("src/components/admin/system-settings-form.tsx")
const page = () => read("src/app/[locale]/(dashboard)/admin/settings/page.tsx")
const menu = () => read("src/components/admin/settings/settings-menu.tsx")
const review = () => read("src/components/admin/settings/settings-review-table.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).systemSettingsPage as Record<string, unknown>
const at = (tree: Record<string, unknown>, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree)

test("the menu groups the eleven tabs with summaries and unsaved badges", () => {
  const source = menu()
  assert.ok(source, "settings-menu.tsx exists")
  assert.match(source, /^"use client"/)
  assert.match(source, /import \{ SETTINGS_GROUPS, type SettingsGroupKey \} from "@\/lib\/settings-page-model"/)
  assert.match(source, /SETTINGS_GROUPS\.map\(\(group\) =>/)
  assert.match(source, /t\(`menuGroup\.\$\{group\.key\}`\)/, "each heading is one of the four group names")
  assert.match(source, /groupUnsaved\[group\.key\]/, "each heading counts its unsaved values")
  assert.match(source, /t\("unsavedBadge", \{ count: (?:unsaved|item\.unsaved|groupCount) \}\)/, "the badges say how many values are unsaved")
  assert.match(source, /item\.summary/, "each item has a one-line summary")
  assert.match(source, /aria-current=\{selected \? "page" : undefined\}/)
  // Below lg: a jump select over the same items, and the stacked list in a disclosure (my call).
  assert.match(source, /className="hidden lg:block"/)
  assert.match(source, /className="space-y-3 lg:hidden"/)
  assert.match(source, /<NativeSelect/)
  assert.match(source, /<optgroup key=\{group\.key\} label=\{t\(`menuGroup\.\$\{group\.key\}`\)\}>/)

  const f = form()
  assert.match(f, /^import \{ SettingsMenu \} from "@\/components\/admin\/settings\/settings-menu"$/m)
  assert.match(f, /const dirty = dirtyCounts\(changedSettings\.map\(\(setting\) => setting\.key\)\)/)
  assert.match(f, /const tabSummaries: Record<SettingsTabId, React\.ReactNode> = \{/)
  for (const tab of ["asset-numbering", "label-template", "documents", "organization", "notifications", "workflow-approval", "automation", "governance", "ldap-login", "ldap-sync", "advanced"]) {
    assert.match(f, new RegExp(`\\n\\s+"?${tab}"?: `), `summary for ${tab}`)
  }
  assert.match(f, /<SettingsMenu\n/)
  assert.match(f, /groupUnsaved=\{dirty\.byGroup\}/)
  assert.match(f, /unsaved: dirty\.byTab\[id\] \?\? 0/)

  const th = messages("th")
  const en = messages("en")
  assert.equal(at(th, "menuGroup.assetsDocuments"), "ทรัพย์สินและเอกสาร")
  assert.equal(at(th, "menuGroup.organizationWork"), "องค์กรและการทำงาน")
  assert.equal(at(th, "menuGroup.signIn"), "การเข้าสู่ระบบ")
  assert.equal(at(th, "menuGroup.other"), "อื่น ๆ")
  for (const key of ["assetsDocuments", "organizationWork", "signIn", "other"]) assert.equal(typeof at(en, `menuGroup.${key}`), "string", key)
  assert.equal(th.unsavedBadge, "แก้ {count, number}")
  assert.match(String(en.unsavedBadge), /\{count, plural,/)
})

test("the overview panel is gone", () => {
  const f = form()
  assert.doesNotMatch(f, /overviewItems|settingsOverview|KeyValueList items=\{overviewItems/)
  assert.doesNotMatch(f, /labels\.overview(?:AssetTag|Label|Documents|Organization|Notifications|Approval|Governance|LdapLogin|LdapSync|Advanced)\b/)
  assert.doesNotMatch(page(), /settingsOverview|overviewAssetTag|overviewLdapSync|overviewAdvanced/)
  for (const locale of ["th", "en"] as const) {
    const m = messages(locale)
    for (const key of ["settingsOverview", "settingsOverviewDescription", "overviewAssetTag", "overviewApproval", "overviewLdapSync", "unsavedChanges", "noUnsavedChanges"]) {
      assert.equal(m[key], undefined, `${locale} ${key} removed`)
    }
  }
})

test("changed fields show the saved value", () => {
  const f = form()
  assert.match(f, /^import \{ FormChangedField, type FormFieldChange \} from "@\/components\/ui\/form-changed-field"$/m)
  assert.match(f, /const changeFor = \(key: string\): FormFieldChange \| null =>/)
  assert.match(f, /was: savedDisplayValue\(key\), onRestore: \(\) => restoreSetting\(key\)/)
  const wrapped = f.match(/<FormChangedField change=\{changeFor\(/g) ?? []
  // asset numbering 5, label 3, documents 3, organization 4, notifications 4, approval 5, governance 3, advanced 1.
  assert.ok(wrapped.length >= 28, `every non-LDAP field is wrapped (${wrapped.length})`)
  assert.match(f, /changeFor=\{changeFor\}/, "the tape panels wrap their nine fields")
  assert.match(f, /<FormChangedField change=\{changeFor\?\.\(`\$\{prefix\}_width_mm`\) \?\? null\}>/)
  // LDAP: the sections say "แก้ n ค่า"; the fields stay as they are (Task 4 owns the LDAP content).
  assert.match(f, /const sectionTitle = \(title: string, keys: readonly string\[\]\) =>/)
  assert.match(f, /tPage\("sectionChanged", \{ count \}\)/)
  assert.equal((f.match(/title=\{sectionTitle\(labels\.ldapStep/g) ?? []).length, 6, "the six LDAP sections with fields")
  assert.equal(messages("th").sectionChanged, "แก้ {count, number} ค่า")
})

test("reset restores saved values everywhere, behind a confirm", () => {
  const f = form()
  assert.match(f, /^import \{ useConfirm \} from "@\/components\/ui\/confirm-dialog"$/m)
  const body = f.slice(f.indexOf("async function discardEdits()"), f.indexOf("async function handleSubmit("))
  assert.ok(body.length > 0, "discardEdits exists before handleSubmit")
  assert.match(body, /if \(changedCount === 0\) return/)
  assert.match(body, /await confirm\(\{\n?\s*title: tPage\("discardConfirmTitle", \{ count: changedCount \}\),/)
  assert.match(body, /setValues\(\{ \.\.\.initialValues \}\)/)
  assert.match(body, /setPrefixRows\(parsePrefixRows\(initialValues\[assetTagCategoryPrefixesKey\]\)\)/)
  assert.match(body, /setCustomScheduleSelected\(isCustomSchedule\(initialValues\.ldap_sync_schedule\)\)/)
  assert.match(body, /fieldErrors\.setErrors\(\{\}\)/)
  assert.match(body, /closePrefixEditor\(\)/)
  assert.match(body, /bind-password change mode/i, "the hook Task 4 fills")
  const th = messages("th")
  assert.equal(th.discardChanges, "ยกเลิกการแก้ไข")
})

test("the footer counts changes and keeps aria-disabled save", () => {
  const f = form()
  const footer = f.slice(f.indexOf("<StickyFormFooter"), f.indexOf("</StickyFormFooter>"))
  assert.match(footer, /changedCount > 0 \? tPage\("footerUnsaved", \{ count: changedCount \}\) : tPage\("footerNoChanges"\)/)
  assert.match(footer, /onClick=\{discardEdits\}/)
  assert.match(footer, /\{tPage\("discardChanges"\)\}/)
  assert.match(footer, /type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{changedCount === 0 \|\| undefined\}\n\s+aria-describedby=\{changedCount === 0 \? "settings-save-status" : undefined\}/)
  assert.match(footer, /changedCount > 0 \? tPage\("saveCount", \{ count: changedCount \}\) : labels\.save/)
  // The discard button is secondary and comes first (K8).
  assert.ok(footer.indexOf("discardEdits") < footer.indexOf('type="submit"'))
  const th = messages("th")
  assert.equal(th.footerUnsaved, "เปลี่ยน {count, number} ค่า ยังไม่บันทึก")
  assert.equal(th.footerNoChanges, "ยังไม่มีการเปลี่ยนแปลง")
  assert.equal(th.saveCount, "บันทึก {count, number} ค่า")
})

test("the review table uses Thai names and formatted values", () => {
  const source = review()
  assert.ok(source, "settings-review-table.tsx exists")
  assert.match(source, /import \{ LDAP_DEFAULT_ROLE_KEY, SETTING_LABEL_KEYS, SETTING_LABEL_NAMESPACE, reviewValue \} from "@\/lib\/settings-page-model"/)
  assert.match(source, /useTranslations\(SETTING_LABEL_NAMESPACE\)/)
  assert.match(source, /SETTING_LABEL_KEYS\[row\.key\]/)
  assert.match(source, /<span className="block text-meta text-muted-foreground"><span className="tag">\{row\.key\}<\/span><\/span>/, "the key is small and mono")
  assert.match(source, /case "bool":\n\s+return value\.on \? t\("enabled"\) : t\("disabled"\)/)
  assert.match(source, /t\("reviewSecretChanged"\)/)
  assert.match(source, /t\("reviewRoleMissing"\)/)
  assert.match(source, /onNavigate=\{\(event\) => \{\n\s+event\.preventDefault\(\)\n\s+onOpenTab\(row\.tab\)/, "the key links to its tab")
  const f = form()
  assert.match(f, /<SettingsReviewTable\n/)
  assert.doesNotMatch(f, /function formatReviewValue/)
  const th = messages("th")
  assert.equal(th.reviewSecretChanged, "เปลี่ยนรหัสผ่าน")
  assert.equal(th.reviewRoleMissing, "ไม่พบบทบาท")
  // Approval summary: "ผู้อนุมัติ {n} · SLA {n} วัน · SOD เปิด/ปิด", no "/SOD".
  assert.equal(th.approvalSummary, "ผู้อนุมัติ {approvers, number} · SLA {days, number} วัน · {sod}")
  assert.match(f, /tPage\("approvalSummary", \{\n?\s*approvers: workflowApprovalPolicy\.minApprovers,/)
  assert.doesNotMatch(f, /\/\$\{workflowApprovalPolicy\.segregationRequired/)
})

test("kept: tab URLs and in-place switching, search, field errors open their tab, beforeunload, refresh after save", () => {
  const m = menu()
  assert.match(m, /<Link\n\s+href=\{item\.href\}/)
  assert.match(m, /onNavigate=\{\(event\) => \{\n\s+event\.preventDefault\(\)\n\s+onSelect\(item\.tab\)/, "a plain click switches in place")
  assert.match(m, /\{search\}/, "the settings search sits at the top of the menu")
  const f = form()
  assert.match(f, /href: buildSystemSettingsTabHref\(pathname, searchParams\.toString\(\), id\)/)
  assert.match(f, /window\.history\.replaceState\(null, "", href\)/)
  assert.match(f, /search=\{\n?\s*<div/)
  assert.match(f, /<SearchField value=\{settingsSearch\}/)
  assert.match(f, /openSettingGroup\(result\.tab\)/)
  assert.match(f, /reveal: \(field\) => selectTab\(/)
  assert.match(f, /addEventListener\("beforeunload", warnBeforeUnload\)/)
  assert.match(f, /toast\.success\(labels\.success\)\n\s+router\.refresh\(\)/)
  assert.match(f, /<div id="settings-workspace" className="min-w-0 space-y-6">/)
})
