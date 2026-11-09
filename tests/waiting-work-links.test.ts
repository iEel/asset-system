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
    consumablesLow: "/th/consumables?state=low",
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
  // Group 5 plan 5: the page reads through readRepairListPage; the PM card lists the bell's reminder set and counts it
  // as readPmDueCounts' overdue and week buckets, and the stuck card counts with the bell's where. Both cards keep the
  // anchors the bell links to (#pm-due, #stuck) and always render.
  const maintenance = read(`${D}maintenance/page.tsx`)
  assert.match(maintenance, /await readRepairListPage\(prisma, filters, now\)/)
  const data = read("src/lib/repair-list-page-data.ts")
  assert.match(data, /db\.maintenancePlan\.findMany\(\{ where: buildDuePmPlanWhere\(now\),/)
  assert.match(data, /readPmDueCounts\(db, now\)/)
  assert.match(data, /db\.asset\.count\(\{ where: stuckRepairsWhere \}\)/)
  const pm = read("src/components/maintenance/repair-pm-due-card.tsx")
  assert.match(pm, /<ContentPanel\n\s+id="pm-due"[\s\S]*?title=\{t\("pmDueTitle"\)\}[\s\S]*?t\("pmDueCount", \{ count: formatCount\(total\) \}\)/)
  const stuck = read("src/components/maintenance/repair-stuck-card.tsx")
  assert.match(stuck, /<ContentPanel\n\s+id="stuck"[\s\S]*?title=\{t\("stuckTitle"\)\}[\s\S]*?t\("stuckCount", \{ count: formatCount\(total\) \}\)/)
  assert.match(maintenance, /<RepairStuckCard\n\s+rows=\{stuck\.rows\}\n\s+total=\{stuck\.total\}/)
  // Group 6 plan 2: the page's "รอทั้งหมด" cell is the read model's strip total, loaded with the same wheres as the count.
  assert.match(read(`${D}admin/approvals/page.tsx`), /key: "total",\n\s+label: t\("stripTotal"\),\n\s+value: formatCount\(strip\.total\.total\),/)
  const inboxQuery = read("src/lib/approval-inbox-query.ts")
  assert.equal(inboxQuery.match(/countApprovalInbox\(user, access, policy\)/g)?.length, 2, "the bell and the work center count with one function")
  assert.match(inboxQuery, /prisma\.disposalRequest\.findMany\(\{\n\s+where: pendingDisposalApprovalWhere,/)
  assert.match(inboxQuery, /prisma\.disposalRequest\.count\(\{ where: pendingDisposalApprovalWhere \}\)/)
  assert.match(inboxQuery, /where: pendingFindingApprovalWhere\(user\.id\),\n\s+include:/)
  assert.match(inboxQuery, /prisma\.auditFinding\.count\(\{ where: pendingFindingApprovalWhere\(user\.id\) \}\)/)
})
