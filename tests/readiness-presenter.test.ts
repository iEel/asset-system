import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildProductionReadinessChecks, type ProductionReadinessCheck } from "../src/lib/production-readiness.ts"
import { READINESS_GROUPS, groupReadiness, nextSteps, parseReadinessFilter } from "../src/lib/readiness-presenter.ts"

// Group 12 plan 1 Task 3 (spec §6, board AD-Readiness): the readiness checks fall into four groups, sort fail → warning
// → pass, filter by status, and carry a structured Thai value (display) and the env names that fix them (fixEnv).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
type Input = Parameters<typeof buildProductionReadinessChecks>[0]

const settings = new Map([
  ["asset_qr_public_base_url", "https://asset.company.com"],
  ["notification_return_due_soon_days", "3"],
  ["notification_audit_action_due_soon_days", "7"],
  ["notification_warranty_expiry_days", "30"],
  ["notification_license_expiry_days", "30"],
  ["retention_attachment_days", "1095"],
  ["retention_audit_log_days", "2555"],
  ["retention_orphan_file_days", "90"],
])

const healthy: Input = {
  settings,
  approverMatrix: [
    { key: "disposal", status: "ready", approverCount: 2 },
    { key: "maintenance", status: "ready", approverCount: 2 },
  ],
  activeAdminUsers: 2,
  activeUserCount: 8,
  deployment: {
    nodeEnv: "production",
    authUrl: "https://asset.company.com",
    nextAuthUrl: "https://asset.company.com",
    authSecret: "abcdefghijklmnopqrstuvwxyz1234567890",
    nextAuthSecret: "abcdefghijklmnopqrstuvwxyz1234567890",
    uploadDir: "/var/www/asset-system/uploads",
    databaseUrl: "sqlserver://192.168.1.10;database=asset_management;user=asset_app;password=pw",
    dbServer: "192.168.1.10",
    dbUser: "asset_app",
    dbPassword: "pw",
    ldapSyncToken: "ldap-token",
    notificationDigestToken: "digest-token",
    uploadScanCommand: "/usr/bin/clamscan",
    uploadScanArgs: "--no-summary {file}",
    uploadScanTimeoutMs: "30000",
    schedulerRunStatuses: [
      { name: "ldap_sync", status: "success" },
      { name: "notification_digest", status: "success" },
    ],
    backupStatus: "success",
    backupLastRunAt: "2026-05-20T01:00:00.000Z",
    backupLastRestoreTestAt: "2026-05-21T01:00:00.000Z",
    pwaAssets: { available: 10, total: 10 },
  },
  masterDataCounts: { companies: 1, branches: 2, departments: 3, locations: 4, categories: 5, statuses: 3, conditions: 3 },
}

const broken: Input = {
  ...healthy,
  settings: new Map([...settings, ["asset_qr_public_base_url", ""], ["retention_orphan_file_days", "0"]]),
  approverMatrix: [{ key: "disposal", status: "thin", approverCount: 1 }],
  activeAdminUsers: 1,
  deployment: {
    nodeEnv: "development",
    authUrl: "http://asset.local",
    nextAuthUrl: "",
    authSecret: "",
    nextAuthSecret: "",
    uploadDir: "uploads",
    databaseUrl: "",
    dbServer: "",
    dbUser: "",
    dbPassword: "",
    ldapSyncToken: "ldap-token",
    notificationDigestToken: "",
    uploadScanCommand: "/usr/bin/clamscan",
    uploadScanArgs: "--no-summary",
    uploadScanTimeoutMs: "x",
    schedulerRunStatuses: [
      { name: "ldap_sync", status: "failed" },
      { name: "notification_digest", status: "" },
    ],
    backupStatus: "missing",
    backupLastRunAt: "",
    backupLastRestoreTestAt: "not a date",
    pwaAssets: { available: 0, total: 10 },
  },
  masterDataCounts: { ...healthy.masterDataCounts, branches: 0 },
}

const statusOf = (checks: ProductionReadinessCheck[]) => checks.map((check) => check.status)

test("the four groups cover the 16 checks once", () => {
  const keys = READINESS_GROUPS.flatMap((group) => group.checks)
  const all = buildProductionReadinessChecks(healthy).map((check) => check.key)
  assert.equal(keys.length, 16)
  assert.deepEqual([...keys].sort(), [...all].sort())
  assert.deepEqual(READINESS_GROUPS.map((group) => group.key), ["access", "backupJobs", "workflowData", "filesApp"])
  // Final review: the retention policy sits with the QR, workflow and master data group, as on the board.
  assert.ok(READINESS_GROUPS.find((group) => group.key === "workflowData")?.checks.includes("retentionPolicy"))
  assert.ok(!READINESS_GROUPS.find((group) => group.key === "backupJobs")?.checks.includes("retentionPolicy"))
  assert.deepEqual(
    groupReadiness(buildProductionReadinessChecks(healthy), "all").map((group) => group.checks.length),
    [4, 4, 5, 3],
  )
})

test("groups sort fail, warning, pass", () => {
  const order = { fail: 0, warning: 1, pass: 2 }
  const groups = groupReadiness(buildProductionReadinessChecks(broken), "all")
  for (const group of groups) {
    const ranks = statusOf(group.checks).map((status) => order[status])
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), group.key)
    assert.equal(group.counts.fail + group.counts.warning + group.counts.pass, group.checks.length)
  }
  const access = groups.find((group) => group.key === "access")
  assert.deepEqual(access?.checks.map((check) => check.key), ["authSecret", "databaseConfig", "adminCoverage", "appBaseUrl"])
})

test("a filter keeps only matching checks and drops empty groups", () => {
  const checks = buildProductionReadinessChecks(broken)
  for (const filter of ["fail", "warning", "pass"] as const) {
    const groups = groupReadiness(checks, filter)
    for (const group of groups) {
      assert.ok(group.checks.length > 0, `${filter} ${group.key} is not empty`)
      assert.ok(group.checks.every((check) => check.status === filter), `${filter} ${group.key}`)
    }
    assert.equal(groups.flatMap((group) => group.checks).length, checks.filter((check) => check.status === filter).length)
  }
  assert.deepEqual(groupReadiness(buildProductionReadinessChecks(healthy), "fail"), [])
  // The counts stay the group's own counts, so the heading reads the same under every filter.
  const warningAccess = groupReadiness(checks, "warning").find((group) => group.key === "access")
  assert.deepEqual(warningAccess?.counts, { fail: 2, warning: 2, pass: 0 })
  assert.equal(parseReadinessFilter("fail"), "fail")
  assert.equal(parseReadinessFilter(["warning", "fail"]), "warning")
  assert.equal(parseReadinessFilter("nope"), "all")
  assert.equal(parseReadinessFilter(undefined), "all")
})

test("all pass shows no next-steps card", () => {
  assert.deepEqual(nextSteps(buildProductionReadinessChecks(healthy)), [])
  const steps = nextSteps(buildProductionReadinessChecks(broken))
  assert.ok(steps.length > 0)
  assert.ok(steps.every((check) => check.status === "fail"))
  const page = read("src/app/[locale]/(dashboard)/admin/readiness/page.tsx")
  assert.match(page, /\{steps\.length > 0 \? \(\n\s+<ReadinessNextSteps\b/)
})

test("final review: the next-steps card keeps what to do, the status column fits its badge, the fix link wraps", () => {
  const page = read("src/app/[locale]/(dashboard)/admin/readiness/page.tsx")
  // An env-fixed check names the env values and then its own fix sentence (what to do first, then restart).
  assert.match(page, /fix: check\.href \? null : t\(`check_\$\{check\.key\}_fix`\),\n\s+\}\)\}/)
  assert.doesNotMatch(page, /line\.env \?\? line\.fix/)
  assert.match(page, /\{line\.env \? <>\{line\.env\} <\/> : null\}\n\s+\{line\.fix\}/)
  // The card's link alone on its line has a 44px target below md.
  assert.match(page, /<Link href=\{`\/\$\{locale\}\$\{check\.href\}`\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  // The status column fits "ควรตรวจ"; the fix button wraps inside its column.
  assert.match(page, /<col className="w-36" \/>/)
  // Look step at 1024: a long token (AUTH_URL/NEXTAUTH_URL, a URL, an env name) wraps inside its cell, never over the next.
  assert.match(page, /<DataTableCell className="\[overflow-wrap:anywhere\]">\n\s+<div className="font-medium text-foreground">\{labels\.title\}<\/div>/)
  assert.match(page, /<DataTableCell className="\[overflow-wrap:anywhere\]">\{labels\.value\}<\/DataTableCell>/)
  assert.match(page, /<DataTableCell className="\[overflow-wrap:anywhere\]">\n\s+<ReadinessFix /)
  // The env names are mono .tag spans (white-space: nowrap); they break anywhere in the fix column.
  assert.match(page, /<span key=\{name\} className="tag whitespace-normal break-all">\{name\}<\/span>/)
  assert.doesNotMatch(page, /<col className="w-28" \/>/)
  assert.match(page, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "md" \}\), "h-auto whitespace-normal py-2 text-left md:h-auto md:min-h-9"\)\}/)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).productionReadinessPage
    assert.equal(messages.filter_warning, messages.status_warning, `${locale}: the warning chip and badge use one word`)
    assert.doesNotMatch(messages.nextStepEnv, /restart|รีสตาร์ต/, `${locale}: the fix sentence says restart once`)
    for (const key of ["backupStatus", "backupRestoreDrill", "authSecret"]) assert.equal(typeof messages[`check_${key}_fix`], "string")
  }
})

test("every display key has a Thai message", () => {
  const values = JSON.parse(readFileSync("messages/th.json", "utf8")).productionReadinessPage.values
  const enValues = JSON.parse(readFileSync("messages/en.json", "utf8")).productionReadinessPage.values
  const words = JSON.parse(readFileSync("messages/th.json", "utf8")).productionReadinessPage.words
  const enWords = JSON.parse(readFileSync("messages/en.json", "utf8")).productionReadinessPage.words
  const inputs: Input[] = [
    healthy,
    broken,
    { ...healthy, deployment: undefined },
    {
      ...healthy,
      deployment: { ...healthy.deployment, authSecret: "short-but-real", nextAuthSecret: "short-but-real", uploadScanCommand: "", schedulerRunStatuses: [], backupStatus: "", backupLastRestoreTestAt: "" },
    },
  ]
  for (const input of inputs) {
    for (const check of buildProductionReadinessChecks(input)) {
      assert.equal(typeof values?.[check.display.key], "string", `th values.${check.display.key} (${check.key})`)
      assert.equal(typeof enValues?.[check.display.key], "string", `en values.${check.display.key} (${check.key})`)
      for (const word of Object.values(check.display.words ?? {})) {
        assert.equal(typeof words?.[word], "string", `th words.${word} (${check.key})`)
        assert.equal(typeof enWords?.[word], "string", `en words.${word} (${check.key})`)
      }
      for (const name of check.fixEnv) assert.match(name, /^[A-Z][A-Z_]+$/, check.key)
      if (check.href) assert.deepEqual(check.fixEnv, [], `${check.key} is fixed in the app`)
    }
  }
})

test("scheduler tokens name the missing one", () => {
  const tokens = (deployment: Input["deployment"]) => buildProductionReadinessChecks({ ...healthy, deployment }).find((check) => check.key === "schedulerTokens")
  const oneMissing = tokens({ ...healthy.deployment, notificationDigestToken: "" })
  assert.equal(oneMissing?.status, "warning")
  assert.deepEqual(oneMissing?.display, { key: "tokensMissing", values: { names: "NOTIFICATION_DIGEST_TOKEN" } })
  assert.deepEqual(oneMissing?.fixEnv, ["NOTIFICATION_DIGEST_TOKEN"])
  const both = tokens({ ...healthy.deployment, ldapSyncToken: "", notificationDigestToken: "replace-with-token" })
  assert.deepEqual(both?.display, { key: "tokensMissing", values: { names: "LDAP_SYNC_TOKEN · NOTIFICATION_DIGEST_TOKEN" } })
  const none = tokens(healthy.deployment)
  assert.deepEqual(none?.display, { key: "configuredOf", values: { have: 2, total: 2 } })
  assert.deepEqual(none?.fixEnv, ["LDAP_SYNC_TOKEN", "NOTIFICATION_DIGEST_TOKEN"])
  // The runs row names each job's result as a word the page translates; an unknown status stays raw.
  const runs = buildProductionReadinessChecks(broken).find((check) => check.key === "schedulerRuns")
  assert.deepEqual(runs?.display, { key: "runs", words: { ldapSync: "failed", notificationDigest: "neverRun" } })
  const running = buildProductionReadinessChecks({
    ...healthy,
    deployment: { ...healthy.deployment, schedulerRunStatuses: [{ name: "ldap_sync", status: "running" }, { name: "notification_digest", status: "success" }] },
  }).find((check) => check.key === "schedulerRuns")
  assert.deepEqual(running?.display, { key: "runs", values: { ldapSync: "running" }, words: { notificationDigest: "success" } })
})

test("no check display carries a secret value", () => {
  const secret = "s3cret"
  const input: Input = {
    ...healthy,
    deployment: {
      ...healthy.deployment,
      authSecret: secret,
      nextAuthSecret: secret,
      dbPassword: secret,
      databaseUrl: `sqlserver://db;password=${secret}`,
      ldapSyncToken: secret,
      notificationDigestToken: secret,
    },
  }
  const longSecret = `${secret}-abcdefghijklmnopqrstuvwxyz0123456789`
  const passing: Input = { ...input, deployment: { ...input.deployment, authSecret: longSecret, nextAuthSecret: longSecret } }
  for (const candidate of [input, passing]) {
    for (const check of buildProductionReadinessChecks(candidate)) {
      assert.doesNotMatch(JSON.stringify(check.display.values ?? {}), /s3cret/, check.key)
      assert.doesNotMatch(JSON.stringify(check.display), /s3cret/, check.key)
    }
  }
})
