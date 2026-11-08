import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

import { settingsTabIds } from "../src/lib/settings-information-architecture.ts"
import {
  SETTINGS_GROUPS,
  SETTING_LABEL_KEYS,
  SETTING_LABEL_NAMESPACE,
  dirtyCounts,
  ldapDirty,
  reviewValue,
  tabOfSettingKey,
} from "../src/lib/settings-page-model.ts"

// Group 12 plan 5 task 2: the pure model behind the AD-Settings board (groups, dirty counts, Thai labels, review values).
// system-setting-defaults imports "@/…", which node --test cannot load: a resolve hook maps it to src (as v-track3 does).
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

const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
function lookup(tree: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree)
}

test("four groups cover the eleven tabs once", () => {
  assert.deepEqual(SETTINGS_GROUPS.map((group) => group.key), ["assetsDocuments", "organizationWork", "signIn", "other"])
  const tabs = SETTINGS_GROUPS.flatMap((group) => [...group.tabs])
  assert.equal(tabs.length, 11)
  assert.equal(new Set(tabs).size, tabs.length)
  assert.deepEqual([...tabs].sort(), [...settingsTabIds].sort())
  assert.deepEqual(SETTINGS_GROUPS.find((group) => group.key === "signIn")?.tabs, ["ldap-login", "ldap-sync"])
  assert.deepEqual(SETTINGS_GROUPS.find((group) => group.key === "other")?.tabs, ["governance", "advanced"])
})

test("every known setting key has a Thai label", async () => {
  const { knownSystemSettingKeys } = (await import(pathToFileURL("src/lib/system-setting-defaults.ts").href)) as { knownSystemSettingKeys: Set<string> }
  const th = messages("th")
  const en = messages("en")
  assert.ok(knownSystemSettingKeys.size > 50)
  for (const key of knownSystemSettingKeys) {
    const messageKey = SETTING_LABEL_KEYS[key]
    assert.ok(messageKey, `no label key for ${key}`)
    const thText = lookup(th, `${SETTING_LABEL_NAMESPACE}.${messageKey}`)
    const enText = lookup(en, `${SETTING_LABEL_NAMESPACE}.${messageKey}`)
    assert.ok(typeof thText === "string" && thText.trim(), `no Thai label for ${key} (${messageKey})`)
    assert.ok(typeof enText === "string" && enText.trim(), `no English label for ${key} (${messageKey})`)
  }
  // Each tape size keeps its own label: the review list must tell 12 mm from 24 mm.
  assert.notEqual(SETTING_LABEL_KEYS.asset_label_12_width_mm, SETTING_LABEL_KEYS.asset_label_24_width_mm)
})

test("dirty counts by tab and group", () => {
  assert.equal(tabOfSettingKey("asset_tag_prefix"), "asset-numbering")
  assert.equal(tabOfSettingKey("ldap_sync_mode"), "ldap-sync")
  assert.equal(tabOfSettingKey("something_new"), "advanced")
  const counts = dirtyCounts([
    "asset_tag_prefix",
    "asset_label_12_width_mm",
    "checkout_document_template",
    "ldap_url",
    "ldap_bind_password",
    "ldap_sync_mode",
    "workflow_approval_sla_days",
    "something_new",
    "asset_tag_prefix",
  ])
  assert.deepEqual(counts.byTab, {
    "asset-numbering": 1,
    "label-template": 1,
    documents: 1,
    "ldap-login": 2,
    "ldap-sync": 1,
    "workflow-approval": 1,
    advanced: 1,
  })
  assert.deepEqual(counts.byGroup, { assetsDocuments: 3, signIn: 3, organizationWork: 1, other: 1 })
  assert.equal(counts.total, 8)
  assert.deepEqual(dirtyCounts([]), { byTab: {}, byGroup: {}, total: 0 })
})

test("booleans read on or off, secrets never show, a deleted role is flagged", () => {
  const context = { roleNames: new Set(["asset_user", "asset_admin"]) }
  assert.deepEqual(reviewValue("ldap_enabled", "true", context), { kind: "bool", on: true })
  assert.deepEqual(reviewValue("workflow_approval_disposal_required", "false", context), { kind: "bool", on: false })
  assert.deepEqual(reviewValue("asset_label_compact_asset_name_enabled", "true", context), { kind: "bool", on: true })
  const secret = reviewValue("ldap_bind_password", "hunter2", context)
  assert.deepEqual(secret, { kind: "secret" })
  assert.ok(!JSON.stringify(secret).includes("hunter2"))
  assert.deepEqual(reviewValue("ldap_bind_password", "", context), { kind: "secret" })
  assert.deepEqual(reviewValue("ldap_default_role", "removed_role", context), { kind: "missingRole", name: "removed_role" })
  assert.deepEqual(reviewValue("ldap_default_role", "asset_user", context), { kind: "text", text: "asset_user" })
  assert.deepEqual(reviewValue("company_name", "true", context), { kind: "text", text: "true" })
  assert.deepEqual(reviewValue("asset_tag_prefix", "AST", context), { kind: "text", text: "AST" })
})

test("ldap sync status keys do not count as LDAP edits", () => {
  assert.equal(ldapDirty([]), false)
  assert.equal(ldapDirty(["ldap_sync_last_run_at", "ldap_sync_last_status", "ldap_sync_last_error"]), false)
  assert.equal(ldapDirty(["asset_tag_prefix", "company_name"]), false)
  assert.equal(ldapDirty(["ldap_sync_last_status", "ldap_url"]), true)
  assert.equal(ldapDirty(["ldap_sync_mode"]), true)
  assert.equal(ldapDirty(["ldap_bind_password"]), true)
})
