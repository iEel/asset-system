import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("LDAP default role setting uses real active roles instead of free text", () => {
  const settingsPage = readFileSync("src/app/[locale]/(dashboard)/admin/settings/page.tsx", "utf8")
  const settingsForm = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")

  assert.match(settingsPage, /prisma\.role\.findMany\(\{/)
  assert.match(settingsPage, /where: \{ isActive: true \}/)
  assert.match(settingsPage, /defaultRoleOptions=\{defaultRoleOptions\}/)
  assert.match(settingsForm, /import \{ SearchableSelect \}/)
  assert.match(settingsForm, /defaultRoleOptions: Array<\{/)
  assert.match(settingsForm, /SearchableSelect[\s\S]+value=\{getValue\("ldap_default_role"\)\}/)
  assert.doesNotMatch(settingsForm, /<input[\s\S]+id="ldap-default-role"/)

  const ldapSectionStart = settingsForm.indexOf('{activeTab === "ldap-login" ? (')
  assert.notEqual(ldapSectionStart, -1)
  const ldapSectionOpening = settingsForm.slice(ldapSectionStart, ldapSectionStart + 240)
  assert.match(ldapSectionOpening, /overflow-visible rounded-lg border border-border bg-surface shadow-sm/)
  assert.doesNotMatch(ldapSectionOpening, /overflow-hidden rounded-lg border border-border bg-surface shadow-sm/)
})
