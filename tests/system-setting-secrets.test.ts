import assert from "node:assert/strict"
import test from "node:test"

import {
  getRestrictedSettingChangeError,
  maskSecretSystemSettings,
  redactSecretSettingValues,
  resolveLdapTestSettings,
  resolveSubmittedSecretSettings,
  storedSecretPlaceholder,
} from "../src/lib/system-setting-secrets.ts"

test("masks stored secret settings before they leave the server", () => {
  const masked = maskSecretSystemSettings([
    { key: "ldap_bind_password", value: "Real-AD-Password" },
    { key: "ldap_url", value: "ldap://10.0.0.2:389" },
  ])

  assert.deepEqual(masked, [
    { key: "ldap_bind_password", value: "__STORED_SECRET__" },
    { key: "ldap_url", value: "ldap://10.0.0.2:389" },
  ])
})

test("keeps an empty secret empty so the form shows that nothing is stored", () => {
  assert.deepEqual(maskSecretSystemSettings([{ key: "ldap_bind_password", value: "" }]), [
    { key: "ldap_bind_password", value: "" },
  ])
})

test("treats the placeholder as 'keep the stored secret' when settings are saved", () => {
  const resolved = resolveSubmittedSecretSettings(
    [
      { key: "ldap_bind_password", value: storedSecretPlaceholder },
      { key: "ldap_url", value: "ldap://10.0.0.2:389" },
    ],
    new Map([["ldap_bind_password", "Real-AD-Password"]]),
  )

  assert.deepEqual(resolved, [
    { key: "ldap_bind_password", value: "Real-AD-Password" },
    { key: "ldap_url", value: "ldap://10.0.0.2:389" },
  ])
})

test("accepts a newly typed secret and an intentionally cleared secret", () => {
  const stored = new Map([["ldap_bind_password", "Old-Password"]])

  assert.deepEqual(resolveSubmittedSecretSettings([{ key: "ldap_bind_password", value: "New-Password" }], stored), [
    { key: "ldap_bind_password", value: "New-Password" },
  ])
  assert.deepEqual(resolveSubmittedSecretSettings([{ key: "ldap_bind_password", value: "" }], stored), [
    { key: "ldap_bind_password", value: "" },
  ])
})

test("redacts secret values in audit log snapshots", () => {
  assert.deepEqual(
    redactSecretSettingValues({ ldap_bind_password: "Real-AD-Password", ldap_url: "ldap://10.0.0.2:389" }),
    { ldap_bind_password: "[REDACTED]", ldap_url: "ldap://10.0.0.2:389" },
  )
})

test("only system administrators may change LDAP settings", () => {
  assert.equal(
    getRestrictedSettingChangeError(["ldap_url", "company_name"], ["data_quality_reviewer"]),
    "Forbidden: only system_admin can change ldap_url",
  )
  assert.equal(getRestrictedSettingChangeError(["company_name"], ["data_quality_reviewer"]), null)
  assert.equal(getRestrictedSettingChangeError(["ldap_url", "ldap_bind_password"], ["system_admin"]), null)
})

test("LDAP test reuses the stored password only for the stored server and bind account", () => {
  const stored = {
    ldap_url: "ldap://10.0.0.2:389",
    ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local",
    ldap_bind_password: "Real-AD-Password",
  }

  assert.deepEqual(
    resolveLdapTestSettings(
      { ldap_url: "ldap://10.0.0.2:389", ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local", ldap_bind_password: storedSecretPlaceholder },
      stored,
    ),
    {
      ok: true,
      settings: {
        ldap_url: "ldap://10.0.0.2:389",
        ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local",
        ldap_bind_password: "Real-AD-Password",
      },
    },
  )
})

test("LDAP test refuses to send the stored password to a different server or bind account", () => {
  const stored = {
    ldap_url: "ldap://10.0.0.2:389",
    ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local",
    ldap_bind_password: "Real-AD-Password",
  }

  for (const submitted of [
    { ldap_url: "ldap://attacker.example:389", ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local", ldap_bind_password: storedSecretPlaceholder },
    { ldap_url: "ldap://attacker.example:389", ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local", ldap_bind_password: "" },
    { ldap_url: "ldap://10.0.0.2:389", ldap_bind_dn: "CN=other,DC=corp,DC=local", ldap_bind_password: storedSecretPlaceholder },
  ]) {
    const result = resolveLdapTestSettings(submitted, stored)
    assert.equal(result.ok, false, JSON.stringify(submitted))
  }

  assert.deepEqual(
    resolveLdapTestSettings(
      { ldap_url: "ldap://new-dc:389", ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local", ldap_bind_password: "Typed-Password" },
      stored,
    ),
    {
      ok: true,
      settings: { ldap_url: "ldap://new-dc:389", ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local", ldap_bind_password: "Typed-Password" },
    },
  )
})
