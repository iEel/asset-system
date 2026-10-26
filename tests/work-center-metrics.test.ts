import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { WAITING_WORK_KEYS, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"
import {
  buildWorkCenterMetricKeys,
  calculateWorkCenterUrgentCount,
  isWorkCenterSharedKey,
  WORK_CENTER_SHARED_KEYS,
} from "../src/lib/work-center-metrics.ts"

const everyKind: readonly WaitingWorkKey[] = WAITING_WORK_KEYS
const page = () => readFileSync("src/app/[locale]/(dashboard)/work-center/page.tsx", "utf8").replace(/\r\n/g, "\n")

test("the work center shares nine waiting-work kinds, in the source's order (spec §6.3)", () => {
  assert.deepEqual(WORK_CENTER_SHARED_KEYS, [
    "approvalInbox", "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings",
    "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals",
  ])
  assert.deepEqual(
    WAITING_WORK_KEYS.filter((key) => (WORK_CENTER_SHARED_KEYS as readonly string[]).includes(key)),
    [...WORK_CENTER_SHARED_KEYS],
  )
  assert.equal(isWorkCenterSharedKey("stuckRepairs"), true)
  assert.equal(isWorkCenterSharedKey("missingPhoto"), false)
})

test("every kind the source shows gets its cell, the own kinds keep their places, and a queue the inbox holds stays hidden (R8)", () => {
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: everyKind }), [
    "approvalInbox", "missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "stuckRepairs", "duePm",
    "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingAuditItems", "pendingDisposals", "approvedDisposals",
  ])
  // The source leaves the two covered queues out of an approver's visibleKeys; the work center adds nothing back.
  const approverWithBothKinds = everyKind.filter((key) => key !== "pendingAuditFindings" && key !== "pendingDisposals")
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: approverWithBothKinds }), [
    "approvalInbox", "missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "stuckRepairs", "duePm",
    "openAuditActions", "auditActionsDueSoon", "pendingAuditItems", "approvedDisposals",
  ])
})

test("a kind the person may not see has no cell, and returns, warranty and licence expiry stay off the work center (spec §6.3, R12)", () => {
  const withoutMaintenance = everyKind.filter((key) => !["approvalInbox", "openRepairs", "stuckRepairs", "duePm"].includes(key))
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: withoutMaintenance }), [
    "missingCustodian", "missingSerial", "missingPhoto", "pendingAuditFindings", "openAuditActions",
    "auditActionsDueSoon", "pendingAuditItems", "pendingDisposals", "approvedDisposals",
  ])
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"] }), [
    "missingCustodian", "missingSerial", "missingPhoto", "pendingAuditItems",
  ])
  assert.deepEqual(buildWorkCenterMetricKeys({ visibleKeys: [] }), [
    "missingCustodian", "missingSerial", "missingPhoto", "pendingAuditItems",
  ])
})

test("work center urgent count uses approval inbox instead of covered detail counts", () => {
  const count = calculateWorkCenterUrgentCount({
    approvalInbox: { visible: true, total: 7, disposal: 2, audit: 4 },
    pendingAuditFindings: 4,
    pendingDisposals: 2,
    approvedDisposals: 5,
  })
  assert.equal(count, 12)
})

test("the page takes each shared kind's count, title, link and gate from the waiting-work source (spec §6.3)", () => {
  const source = page()
  assert.match(source, /getWaitingWork\(user, now\)/)
  assert.match(source, /const today = startOfBangkokDay\(now\)/)
  assert.match(source, /buildWorkCenterMetricKeys\(\{ visibleKeys: waitingWork\.visibleKeys \}\)/, "the source decides which shared kinds show (R8)")
  assert.match(source, /label: tNotifications\(key\),/)
  assert.match(source, /detail: tNotifications\(`\$\{key\}Detail`\),/)
  assert.match(source, /href: buildWaitingWorkHref\(locale, key\),/)
  assert.match(source, /waitingWork\.counts\[key\]/, "งานทั้งหมด shows the source's number")
  assert.match(source, /openAuditActionsWhere\(today, waitingWork\.rules\)/, "งานของฉัน counts open actions without the due-soon ones")
  assert.match(source, /auditActionsDueSoonWhere\(today, waitingWork\.rules\)/)
  assert.match(source, /applyPlanWorkCenterScope\(duePmWhere\(today\), true, userScope\)/)
  assert.match(source, /applyAssetWorkCenterScope\(stuckRepairsWhere, true, userScope\)/)
  assert.match(source, /applyMaintenanceWorkCenterScope\(\{ \.\.\.openRepairsWhere \}, isMineView, userScope\)/, "the repair panel lists the same kind it counts")
  assert.match(source, /approvalInboxAccess\.canAnyApproval && isPanelFocused\("approvals"\) \? getApprovalInboxSnapshot\(user, locale\) : Promise\.resolve\(null\)/)
  assert.doesNotMatch(source, /openRepairRecordWhere|buildDuePmPlanWhere|getNotificationCenter|recordCountDrops/)
  assert.doesNotMatch(source, /t\("(?:approvalInboxDetail|(?:openRepairs|duePm|pendingAuditFindings|openAuditActions|pendingDisposals|approvedDisposals)(?:Detail)?)"\)/)
})

test("the work center's copies of the source's titles are gone; its own words stay (spec §6.3)", () => {
  for (const locale of ["th", "en"]) {
    const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const key of ["openRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "pendingDisposals", "approvedDisposals"]) {
      assert.equal(m.workCenter[key], undefined, `${locale}: workCenter.${key}`)
      assert.equal(m.workCenter[`${key}Detail`], undefined, `${locale}: workCenter.${key}Detail`)
    }
    assert.equal(m.workCenter.approvalInboxDetail, undefined, `${locale}: workCenter.approvalInboxDetail`)
    assert.equal(typeof m.workCenter.approvalInbox, "string", "the approvals tab keeps its name")
    for (const key of WORK_CENTER_SHARED_KEYS) {
      assert.equal(typeof m.notifications[key], "string", `${locale}: notifications.${key}`)
      assert.equal(typeof m.notifications[`${key}Detail`], "string", `${locale}: notifications.${key}Detail`)
    }
  }
})
