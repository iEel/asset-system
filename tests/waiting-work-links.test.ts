import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  WAITING_WORK_KEYS,
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  buildWaitingWorkHref,
  duePmWhere,
  licenseExpiringSoonWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  returnsDueSoonAssetWhere,
  startOfBangkokDay,
  warrantyExpiringSoonWhere,
  type WaitingWorkKey,
  type WaitingWorkRules,
} from "../src/lib/waiting-work-rules.ts"
import { buildAssetWhere, parseAssetListParams } from "../src/lib/asset-list-query.ts"
import { buildAuditFindingWhere } from "../src/lib/audit-finding-filters.ts"
import { buildDisposalWhere, parseDisposalListParams } from "../src/lib/disposal-query.ts"
import { buildMaintenanceWhere, parseMaintenanceListParams } from "../src/lib/maintenance-query.ts"
import { buildDuePmPlanWhere } from "../src/lib/preventive-maintenance.ts"

// The count side is Task 1's tests/waiting-work-source.test.ts, which records the where of every count the source
// makes. This file proves that each kind's link opens a list built from that same where, with the same rules.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
const now = new Date("2026-10-26T03:00:00.000Z") // 10:00 in Bangkok
const today = startOfBangkokDay(now)
// Not today's defaults, so a list that ignored the rules would fail.
const rules: WaitingWorkRules = { returnDueSoonDays: 5, auditActionDueSoonDays: 14, warrantyExpiryDays: 45, licenseExpiryDays: 60 }
const query = (key: WaitingWorkKey) => new URLSearchParams(buildWaitingWorkHref("th", key).split("#")[0].split("?")[1] ?? "")

test("each waiting kind has one link, to a list (group 1 spec §6.3)", () => {
  assert.deepEqual(Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, buildWaitingWorkHref("th", key)])), {
    approvalInbox: "/th/admin/approvals",
    openRepairs: "/th/maintenance?status=in_progress",
    stuckRepairs: "/th/maintenance#stuck",
    duePm: "/th/maintenance#pm-due",
    pendingAuditFindings: "/th/audit/findings?status=pending",
    openAuditActions: "/th/audit/findings?status=action_not_due",
    auditActionsDueSoon: "/th/audit/findings?status=action_due_soon",
    pendingDisposals: "/th/disposal?status=pending",
    approvedDisposals: "/th/disposal?status=approved",
    returnsDueSoon: "/th/assets?dataQuality=returnDue&exact=1",
    warrantyExpiringSoon: "/th/assets?dataQuality=warranty&exact=1",
    licenseExpiringSoon: "/th/assets?dataQuality=licenseExpiry&exact=1",
  })
  assert.equal(buildWaitingWorkHref("en", "stuckRepairs"), "/en/maintenance#stuck")
  assert.equal(buildWaitingWorkHref("en", "returnsDueSoon"), "/en/assets?dataQuality=returnDue&exact=1")
})

test("the register's three kinds: the link's own filter builds the count's where", () => {
  // Each count's where holds isActive: true, so the register's { isActive: true, AND: [where] } lists exactly its rows.
  const listWhere = (key: WaitingWorkKey) => buildAssetWhere(parseAssetListParams(query(key)), { today, rules })
  assert.deepEqual(listWhere("returnsDueSoon"), { isActive: true, AND: [returnsDueSoonAssetWhere(today, rules)] })
  assert.deepEqual(listWhere("warrantyExpiringSoon"), { isActive: true, AND: [warrantyExpiringSoonWhere(today, rules)] })
  assert.deepEqual(listWhere("licenseExpiringSoon"), { isActive: true, AND: [licenseExpiringSoonWhere(today, rules)] })
})

test("the findings, maintenance and disposal kinds: the link's own filter builds the count's where", () => {
  const findings = (key: WaitingWorkKey) => buildAuditFindingWhere({ status: query(key).get("status"), now, rules })
  assert.deepEqual(findings("pendingAuditFindings"), pendingAuditFindingsWhere)
  assert.deepEqual(findings("openAuditActions"), openAuditActionsWhere(today, rules))
  assert.deepEqual(findings("auditActionsDueSoon"), auditActionsDueSoonWhere(today, rules))
  assert.deepEqual(buildMaintenanceWhere(parseMaintenanceListParams(query("openRepairs"))), openRepairsWhere)
  assert.deepEqual(buildDisposalWhere(parseDisposalListParams(query("pendingDisposals"))), pendingDisposalsWhere)
  assert.deepEqual(buildDisposalWhere(parseDisposalListParams(query("approvedDisposals"))), approvedDisposalsWhere)
  assert.deepEqual(duePmWhere(now), buildDuePmPlanWhere(now))
})

test("the maintenance boxes and the approvals total count with the source's own rule", () => {
  const maintenance = read(`${D}maintenance/page.tsx`)
  assert.match(maintenance, /const duePmWhere = buildDuePmPlanWhere\(now\)/)
  assert.match(maintenance, /prisma\.maintenancePlan\.count\(\{ where: duePmWhere \}\)/)
  assert.match(maintenance, /<section id="pm-due"[\s\S]*?\{t\("pmDueTitle"\)\} \(\{formatCount\(dueTotal\)\}\)/)
  assert.match(maintenance, /prisma\.asset\.count\(\{ where: stuckRepairsWhere \}\)/)
  assert.match(maintenance, /<section id="stuck"[\s\S]*?\{t\("stuckTitle"\)\} \(\{formatCount\(stuckTotal\)\}\)/)
  assert.match(read(`${D}admin/approvals/page.tsx`), /\{ key: "total", label: t\("total"\), value: formatCount\(summary\.total\) \}/)
  assert.equal(read("src/lib/approval-inbox-query.ts").match(/countApprovalInbox\(user, access, policy\)/g)?.length, 2, "the page's total and the source's count are one function")
})
