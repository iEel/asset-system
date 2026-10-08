import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const th = JSON.parse(readFileSync("messages/th.json", "utf8"))

test("production readiness and approval inbox labels are Thai on the Thai page", () => {
  for (const value of [
    th.productionReadinessPage.check_uploadDir_title,
    th.productionReadinessPage.check_uploadScanner_title,
    th.approvalInboxPage.permissionKey,
  ]) {
    assert.match(value, /[฀-๿]/)
    assert.doesNotMatch(value, /Upload|Permission/)
  }
})

test("leftover English-only labels are translated on the Thai page (task 11b)", () => {
  const keys = [
    "asset.ownershipType_software_license",
    "asset.labelTapeCustom",
    "asset.quickAssignLicense",
    "asset.licensePool",
    "productionReadinessPage.check_notificationRules_title",
    "productionReadinessPage.check_adminCoverage_title",
    "productionReadinessPage.check_masterData_title",
    "productionReadinessPage.check_appBaseUrl_title",
    "productionReadinessPage.check_authSecret_title",
    "productionReadinessPage.check_databaseConfig_title",
    "productionReadinessPage.check_schedulerTokens_title",
    "productionReadinessPage.check_schedulerRuns_title",
    "productionReadinessPage.check_backupStatus_title",
    "productionReadinessPage.check_pwaAssets_title",
    "storagePage.dryRunAction",
    "systemSettingsPage.tabAutomation",
    "systemSettingsPage.labelLayout",
    "systemSettingsPage.ldapSyncDefaultCompanyCode",
    "systemSettingsPage.ldapSyncDefaultBranchCode",
    "systemSettingsPage.ldapSyncDefaultDepartmentCode",
    "integrationApiPage.rotate",
    "systemLogPage.action_rotate_client",
  ]
  for (const key of keys) {
    const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], th) as string
    assert.equal(typeof value, "string", `${key} missing`)
    assert.match(value, /[฀-๿]/, `${key} has no Thai: ${value}`)
  }
})

test("Thai copy writes License the same way everywhere (glossary: kept term)", () => {
  const offenders: string[] = []
  const walk = (node: unknown, path: string) => {
    if (typeof node === "string") {
      if (/ไลเซนส์/.test(node)) offenders.push(`${path}: ${node}`)
      return
    }
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) walk(child, path ? `${path}.${key}` : key)
  }
  walk(th, "")
  assert.deepEqual(offenders, [])
})
