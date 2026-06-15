import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildLdapSyncHistoryItems,
  buildSystemLogFilterHref,
  resolveSystemLogQuickFilter,
  systemLogQuickFilters,
} from "../src/lib/system-log-history.ts"

test("exposes LDAP sync as a first-class system log quick filter", () => {
  const ldapFilter = systemLogQuickFilters.find((filter) => filter.key === "ldap_sync")

  assert.deepEqual(ldapFilter, {
    key: "ldap_sync",
    module: "employee",
    action: "ldap_sync",
    labelKey: "quickFilterLdapSync",
  })
  assert.equal(buildSystemLogFilterHref("th", "all"), "/th/admin/logs")
  assert.equal(buildSystemLogFilterHref("th", "ldap_sync"), "/th/admin/logs?module=employee&action=ldap_sync")
  assert.equal(resolveSystemLogQuickFilter({ module: "employee", action: "ldap_sync" }), "ldap_sync")
  assert.equal(buildSystemLogFilterHref("th", "integration_api"), "/th/admin/logs?module=integration_api")
  assert.equal(resolveSystemLogQuickFilter({ module: "integration_api" }), "integration_api")
  assert.equal(resolveSystemLogQuickFilter({ module: "asset", action: "delete" }), "custom")
})

test("summarizes LDAP sync history from system logs", () => {
  const items = buildLdapSyncHistoryItems([
    {
      id: "log-1",
      action: "ldap_sync",
      module: "employee",
      recordId: "ldap_sync",
      newValue: JSON.stringify({
        total: 320,
        blockers: ["Missing department"],
        applied: {
          created: 2,
          updated: 3,
          deactivated: 4,
          deactivatedUsers: 1,
        },
      }),
      createdAt: new Date("2026-05-28T08:30:00.000Z"),
      user: { username: "admin", displayName: "Admin User" },
    },
  ])

  assert.deepEqual(items, [
    {
      id: "log-1",
      createdAt: "2026-05-28T08:30:00.000Z",
      actorLabel: "Admin User",
      total: 320,
      created: 2,
      updated: 3,
      deactivated: 4,
      deactivatedUsers: 1,
      blockerCount: 1,
    },
  ])
})

test("settings and system log pages expose the LDAP sync history path", () => {
  const settingsPage = readFileSync("src/app/[locale]/(dashboard)/admin/settings/page.tsx", "utf8")
  const settingsForm = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")
  const logsPage = readFileSync("src/app/[locale]/(dashboard)/admin/logs/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(settingsPage, /buildLdapSyncHistoryItems/)
  assert.match(settingsPage, /ldapSyncHistory=\{ldapSyncHistory\}/)
  assert.match(settingsForm, /ldapSyncHistoryTitle/)
  assert.match(settingsForm, /buildSystemLogFilterHref\(locale, "ldap_sync"\)/)
  assert.match(logsPage, /systemLogQuickFilters/)
  assert.equal(th.systemSettingsPage.ldapSyncHistoryTitle, "ประวัติการ Sync ล่าสุด")
  assert.equal(en.systemSettingsPage.ldapSyncHistoryTitle, "Recent Sync History")
  assert.equal(th.systemLogPage.quickFilterLdapSync, "LDAP Sync")
  assert.equal(en.systemLogPage.quickFilterLdapSync, "LDAP Sync")
  assert.equal(th.systemLogPage.quickFilterIntegrationApi, "Integration API")
  assert.equal(en.systemLogPage.quickFilterIntegrationApi, "Integration API")
})
