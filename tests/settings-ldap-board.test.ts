import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Group 12 plan 5 Task 4: the LDAP part of board AD-Settings — the bind password shown as saved with a change link,
// the test result next to its button, preview and apply locked while LDAP edits are unsaved, and apply behind a confirm
// with counts that sends the preview's deactivation count. Source pins, CRLF-safe.

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const form = () => read("src/components/admin/system-settings-form.tsx")
const page = () => read("src/app/[locale]/(dashboard)/admin/settings/page.tsx")
const bind = () => read("src/components/admin/settings/ldap-bind-password-field.tsx")
const confirmDialog = () => read("src/components/admin/settings/ldap-apply-confirm.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).systemSettingsPage as Record<string, unknown>
const at = (tree: Record<string, unknown>, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree)
const slice = (source: string, from: string, to: string) => {
  const start = source.indexOf(from)
  assert.notEqual(start, -1, `found ${from}`)
  const end = source.indexOf(to, start + from.length)
  assert.notEqual(end, -1, `found ${to} after ${from}`)
  return source.slice(start, end)
}

test("the bind password is never rendered and the stored box says saved", () => {
  // The page masks the secret before it reaches the client; the form only learns whether one is stored.
  assert.match(page(), /settings=\{maskSecretSystemSettings\(settings\.map\(/)
  const f = form()
  assert.match(f, /^import \{ LdapBindPasswordField \} from "@\/components\/admin\/settings\/ldap-bind-password-field"$/m)
  assert.match(f, /^import \{ ldapTestPasswordNeededError, storedSecretPlaceholder \} from "@\/lib\/system-setting-secrets"$/m)
  assert.match(f, /const bindPasswordStored = initialValues\[ldapBindPasswordKey\] === storedSecretPlaceholder/)
  // The input shows only what the person typed: the placeholder reads as an empty box.
  assert.match(f, /const bindPasswordTyped = bindPasswordValue === \(initialValues\[ldapBindPasswordKey\] \?\? ""\) \? "" : bindPasswordValue/)
  const usage = slice(f, "<LdapBindPasswordField", "/>")
  assert.match(usage, /id="ldap-bind-password"/)
  assert.match(usage, /error=\{settingError\("ldap_bind_password"\)\}/)
  assert.match(usage, /stored=\{bindPasswordStored\}/)
  assert.match(usage, /value=\{bindPasswordTyped\}/)
  assert.doesNotMatch(f, /value=\{getValue\("ldap_bind_password"\)\}/, "the old box showed the placeholder text")

  const source = bind()
  assert.ok(source, "ldap-bind-password-field.tsx exists")
  assert.match(source, /^"use client"/)
  assert.match(source, /stored \? t\("ldapBind\.stored"\) : t\("ldapBind\.notSet"\)/)
  assert.match(source, /\{t\("ldapBind\.change"\)\}/)
  assert.match(source, /<Button variant="ghost" size="sm" className="text-primary" aria-label=\{`\$\{t\("ldapBind\.change"\)\} \$\{label\}`\} aria-describedby=\{stateId\} onClick=\{onOpen\}>/, "the change control is a small text button")
  const th = messages("th")
  assert.equal(at(th, "ldapBind.stored"), "•••••••• บันทึกไว้แล้ว")
  assert.equal(at(th, "ldapBind.notSet"), "ยังไม่ได้ตั้ง")
  assert.equal(at(th, "ldapBind.change"), "เปลี่ยน")
  assert.equal(at(th, "ldapBind.cancel"), "ยกเลิก")
  for (const key of ["stored", "notSet", "change", "cancel", "keepHint"]) assert.equal(typeof at(messages("en"), `ldapBind.${key}`), "string", key)
})

test("bind password input refuses autofill", () => {
  const source = bind()
  assert.match(source, /autoComplete="new-password"/)
  assert.match(source, /name="ldap-bind-password-new"/)
  assert.match(source, /type=\{shown \? "text" : "password"\}/)
  assert.match(source, /aria-label=\{shown \? tAuth\("hidePassword"\) : tAuth\("showPassword"\)\}/)
  assert.match(source, /aria-pressed=\{shown\}/)
})

test("cancel returns to the stored state", () => {
  const f = form()
  // An empty box in change mode sends the placeholder (or "" with nothing stored, which the server drops).
  assert.match(f, /setValue\(ldapBindPasswordKey, text === "" \? \(initialValues\[ldapBindPasswordKey\] \?\? ""\) : text\)\n\s+setBindPasswordEditing\(true\)/, "typing keeps the field open after its error clears")
  const cancel = slice(f, "const cancelBindPasswordEdit = () => {", "\n  }\n")
  assert.match(cancel, /setValue\(ldapBindPasswordKey, initialValues\[ldapBindPasswordKey\] \?\? ""\)/)
  assert.match(cancel, /setBindPasswordEditing\(false\)/)
  // The field opens by itself when the server or the test refuses without a new password.
  assert.match(f, /const bindPasswordOpen = bindPasswordEditing \|\| Boolean\(fieldErrors\.errors\[settingFieldKey\(ldapBindPasswordKey\)\]\)/)
  // ยกเลิกการแก้ไข closes the change mode too (Task 3's hook).
  const discard = slice(f, "async function discardEdits()", "async function handleSubmit(")
  assert.match(discard, /bind-password change mode/i)
  assert.match(discard, /setBindPasswordEditing\(false\)/)
  // After a save the typed password is stored: the field goes back to the stored state.
  const submit = slice(f, "async function handleSubmit(", "async function handleLdapTest(")
  assert.match(submit, /router\.refresh\(\)\n\s+if \(bindPasswordTyped\) setValues\(\(current\) => \(\{ \.\.\.current, \[ldapBindPasswordKey\]: storedSecretPlaceholder \}\)\)\n\s+setBindPasswordEditing\(false\)/)
  const source = bind()
  assert.match(source, /onClick=\{onCancel\}/)
  assert.match(source, /\{t\("ldapBind\.cancel"\)\}/)
})

test("the test result shows next to the button for this visit", () => {
  const f = form()
  assert.match(f, /const \[ldapTestResult, setLdapTestResult\] = useState<LdapTestResult \| null>\(null\)/)
  const handler = slice(f, "async function handleLdapTest()", "async function handleLdapSync(")
  assert.doesNotMatch(handler, /toast\.success/, "no toast for a passed test")
  assert.doesNotMatch(handler, /apiError\.toast\(error instanceof Error \? error : labels\.ldapTestFailed\)/, "no English toast for a refusal")
  // The "needs a new password" refusal shows under the bind password field.
  assert.match(handler, /payload\?\.error === ldapTestPasswordNeededError/)
  assert.match(handler, /\[settingFieldKey\(ldapBindPasswordKey\)\]: "ldapBindPasswordNeeded"/)
  assert.match(handler, /setLdapTestResult\(\{ ok: true, at: new Date\(\) \}\)/)
  assert.match(handler, /setLdapTestResult\(\{ ok: false, at: new Date\(\), reason: apiError\.describe\(/)
  assert.match(f, /tPage\("ldapTest\.passed", \{ time: formatTestTime\(ldapTestResult\.at\) \}\)/)
  assert.match(f, /tPage\("ldapTest\.failed", \{ time: formatTestTime\(ldapTestResult\.at\), reason: ldapTestResult\.reason \}\)/)
  assert.match(f, /<p id="ldap-test-result" role="status"/)
  const th = messages("th")
  assert.equal(at(th, "ldapTest.passed"), "ทดสอบผ่าน {time}")
  assert.equal(at(th, "ldapTest.failed"), "ทดสอบไม่ผ่าน {time} · {reason}")
  // The secrets module names the refusal the client matches.
  assert.match(read("src/lib/system-setting-secrets.ts"), /export const ldapTestPasswordNeededError =/)
})

test("preview and apply lock while LDAP edits are unsaved", () => {
  const f = form()
  assert.match(f, /^import \{ dirtyCounts, ldapDirty, reviewValue \} from "@\/lib\/settings-page-model"$/m)
  assert.match(f, /const ldapSyncLocked = ldapDirty\(\[\.\.\.changedKeys\]\)/)
  const buttons = slice(f, 'onClick={() => handleLdapSync("preview")}', "</FormSection>")
  assert.match(buttons, /aria-disabled=\{ldapSyncLocked \|\| undefined\}\n\s+aria-describedby=\{ldapSyncLocked \? "ldap-sync-locked" : undefined\}/)
  assert.match(buttons, /aria-disabled=\{ldapSyncLocked \|\| !applyReady \|\| undefined\}/)
  assert.match(f, /<p id="ldap-sync-locked" className="text-sm text-warning"/)
  assert.match(f, /tPage\("ldapSyncLocked"\)/)
  const handler = slice(f, "async function handleLdapSync(", "\n  return (\n")
  assert.match(handler, /if \(ldapSyncLocked\) return\n/)
  assert.equal(messages("th").ldapSyncLocked, "บันทึกค่า LDAP ก่อน")
})

test("apply opens a confirm with counts and sends expectedDeactivations", () => {
  const f = form()
  assert.match(f, /^import \{ LdapApplyConfirm \} from "@\/components\/admin\/settings\/ldap-apply-confirm"$/m)
  assert.match(f, /const applyReady = syncPreview !== null && !syncPreview\.applied/)
  assert.match(f, /ref=\{applyButtonRef\}/)
  assert.match(f, /onClick=\{openApplyConfirm\}/)
  assert.match(f, /<LdapApplyConfirm\n\s+open=\{applyConfirmOpen\}/)
  assert.match(f, /returnFocusRef=\{applyButtonRef\}/)
  const handler = slice(f, "async function handleLdapSync(", "\n  return (\n")
  assert.match(handler, /expectedDeactivations: syncPreview\.deactivates\.length/)

  const source = confirmDialog()
  assert.ok(source, "ldap-apply-confirm.tsx exists")
  assert.match(source, /^"use client"/)
  assert.match(source, /<AccessibleDialog/)
  assert.match(source, /t\("ldapApply\.counts", \{ creates, updates, deactivates: deactivations\.length \}\)/)
  assert.match(source, /<Notice tone="danger"/)
  assert.match(source, /deactivations\.slice\(0, 5\)/)
  assert.match(source, /t\("ldapApply\.more", \{ count: deactivations\.length - 5 \}\)/)
  assert.match(source, /deactivations\.length > 0 \? t\("ldapApply\.confirmDeactivate", \{ count: deactivations\.length \}\) : t\("ldapApply\.confirm"\)/)
  assert.match(source, /<AccessibleDialogCancel \/>/)
  const th = messages("th")
  assert.equal(at(th, "ldapApply.counts"), "เพิ่ม {creates, number} · แก้ {updates, number} · ปิด {deactivates, number}")
  assert.equal(at(th, "ldapApply.confirmDeactivate"), "ซิงก์และปิดบัญชี {count, number} รายการ")
  assert.equal(at(th, "ldapApply.confirm"), "ซิงก์")
  assert.match(String(at(messages("en"), "ldapApply.confirmDeactivate")), /\{count, plural,/)
})

test("a 409 clears the preview and asks for a new one", () => {
  const f = form()
  const handler = slice(f, "async function handleLdapSync(", "\n  return (\n")
  assert.match(handler, /if \(response\.status === 409\) setSyncPreview\(null\)/)
  // The dialog closes before the request, so a refusal never reopens it; the message is the Thai catalog line.
  const open = slice(f, "const confirmApply = () => {", "\n  }\n")
  assert.match(open, /setApplyConfirmOpen\(false\)\n\s+void handleLdapSync\("apply"\)/)
  assert.match(f, /<ApiErrorText error=\{syncError\} \/>/)
})

test("plain LDAP fields show the changed marker; the bind password shows its own state", () => {
  const f = form()
  const ldap = slice(f, '{activeTab === "ldap-login" ? (', '{activeTab === "advanced"')
  const keys = [...ldap.matchAll(/<FormChangedField change=\{changeFor\("(ldap_\w+)"\)\}>/g)].map((match) => match[1])
  assert.deepEqual(keys, [
    "ldap_enabled", "ldap_start_tls", "ldap_tls_reject_unauthorized", "ldap_url", "ldap_base_dn", "ldap_bind_dn",
    "ldap_user_filter", "ldap_upn_domain", "ldap_domain", "ldap_user_dn_template", "ldap_auto_provision", "ldap_default_role",
    "ldap_sync_enabled", "ldap_sync_deactivate_missing", "ldap_sync_mode", "ldap_sync_max_scheduled_deactivations", "ldap_sync_base_dn",
    "ldap_sync_default_company_code", "ldap_sync_default_branch_code", "ldap_sync_default_department_code",
    "ldap_sync_schedule", "ldap_sync_filter",
  ])
  assert.doesNotMatch(f, /changeFor\("ldap_bind_password"\)/)
  // คืนค่าเดิม on the schedule puts its preset select back too.
  assert.match(f, /if \(key === "ldap_sync_schedule"\) setCustomScheduleSelected\(isCustomSchedule\(initialValues\[key\]\)\)/)
})
