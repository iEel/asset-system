import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import {
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  DEFAULT_WAITING_WORK_RULES,
  duePmWhere,
  licenseExpiringSoonWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  returnsDueSoonAssetWhere,
  startOfBangkokDay,
  stuckRepairsWhere,
  WAITING_WORK_KEYS,
  warrantyExpiringSoonWhere,
} from "../src/lib/waiting-work-rules.ts"

// src/lib/waiting-work.ts imports "@/…" and the database, which node --test cannot load, so a resolve hook serves
// stand-ins (as in tests/notification-read-rules-route.test.ts). The database is a stub that records every call.
type Call = { call: string; args: Record<string, unknown> }
const state = {
  inbox: { total: 0, audit: 0, disposal: 0 },
  settings: [] as Array<{ key: string; value: string }>,
  counts: {} as Record<string, number>,
  calls: [] as Call[],
}
Object.assign(globalThis, { __waitingWork: state })

const mockedModuleSources = new Map<string, string>([
  ["@/lib/auth-utils", `
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
  `],
  ["@/lib/approval-inbox-query", `
    export function getApprovalInboxAccess(user) {
      const can = (permission) => user.roles.includes("system_admin") || user.permissions.includes(permission)
      const canApproveDisposal = can("disposal:approve")
      const canApproveAudit = can("audit:approve")
      return { canApproveDisposal, canApproveAudit, canAnyApproval: canApproveDisposal || canApproveAudit }
    }
    export async function getApprovalInboxCounts() { return globalThis.__waitingWork.inbox }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__waitingWork
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args })
            if (method === "count") return state().counts[name] ?? 0
            if (name === "systemSetting" && method === "findMany") return state().settings
            return null
          }
        },
      })
    }
    export const prisma = new Proxy({}, { get(_target, key) { return model(String(key)) } })
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const source = (await import(pathToFileURL("src/lib/waiting-work.ts").href)) as typeof import("../src/lib/waiting-work.ts")
const user = (permissions: string[], roles: string[] = []) => ({ id: "user-1", name: "ทดสอบ", roles, permissions, employeeId: null })
const now = new Date("2026-10-26T05:00:00Z")
const today = startOfBangkokDay(now)
const wheres = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args.where)

beforeEach(() => {
  state.inbox = { total: 0, audit: 0, disposal: 0 }
  state.settings = []
  state.counts = {}
  state.calls = []
})

test("every count uses its kind's where, with the days the settings hold, and nothing is written (group 1 dashboard task 1)", async () => {
  state.settings = [
    { key: "notification_return_due_soon_days", value: "5" },
    { key: "notification_audit_action_due_soon_days", value: "abc" },
    { key: "notification_warranty_expiry_days", value: "45" },
    { key: "notification_license_expiry_days", value: "400" },
  ]
  state.counts = { maintenanceTicket: 4, maintenancePlan: 2, asset: 1 }
  state.inbox = { total: 6, audit: 0, disposal: 0 }
  const rules = { returnDueSoonDays: 5, auditActionDueSoonDays: 7, warrantyExpiryDays: 45, licenseExpiryDays: 30 }
  const work = await source.getWaitingWork(user([], ["system_admin"]), now)
  assert.deepEqual(work.rules, rules)
  assert.deepEqual(await source.getWaitingWorkRules(), rules)
  assert.deepEqual(work.visibleKeys, [...WAITING_WORK_KEYS])
  assert.deepEqual(wheres("maintenanceTicket.count"), [openRepairsWhere])
  assert.deepEqual(wheres("maintenancePlan.count"), [duePmWhere(today)])
  assert.deepEqual(wheres("auditFinding.count"), [pendingAuditFindingsWhere, openAuditActionsWhere(today, rules), auditActionsDueSoonWhere(today, rules)])
  assert.deepEqual(wheres("disposalRequest.count"), [pendingDisposalsWhere, approvedDisposalsWhere])
  assert.deepEqual(wheres("assetCheckout.count"), [], "returns count assets, not loans")
  assert.deepEqual(wheres("asset.count"), [
    stuckRepairsWhere,
    returnsDueSoonAssetWhere(today, rules),
    warrantyExpiringSoonWhere(today, rules),
    licenseExpiringSoonWhere(today, rules),
  ])
  assert.deepEqual(Object.keys(work.counts), [...WAITING_WORK_KEYS])
  assert.deepEqual([work.counts.approvalInbox, work.counts.openRepairs, work.counts.duePm, work.counts.returnsDueSoon], [6, 4, 2, 1])
  assert.equal(state.calls.some((entry) => /\.(?:update|upsert|create|delete)/.test(entry.call)), false, "the source never writes")
})

test("permissions decide what a person sees, and the inbox hides the queues it already holds (group 1 dashboard task 1)", async () => {
  state.inbox = { total: 3, audit: 2, disposal: 1 }
  let work = await source.getWaitingWork(user(["disposal:approve", "audit:approve", "audit:view", "disposal:view"]), now)
  assert.deepEqual(work.visibleKeys, ["approvalInbox", "openAuditActions", "auditActionsDueSoon", "approvedDisposals"])
  assert.deepEqual(work.approvalInbox, { total: 3, audit: 2, disposal: 1 })
  assert.deepEqual([work.counts.approvalInbox, work.counts.pendingAuditFindings, work.counts.pendingDisposals], [3, 0, 0])
  assert.deepEqual(wheres("auditFinding.count"), [
    openAuditActionsWhere(today, DEFAULT_WAITING_WORK_RULES),
    auditActionsDueSoonWhere(today, DEFAULT_WAITING_WORK_RULES),
  ])
  assert.deepEqual(wheres("disposalRequest.count"), [approvedDisposalsWhere])

  state.calls = []
  state.inbox = { total: 0, audit: 0, disposal: 0 }
  state.counts = { maintenanceTicket: 2, asset: 1 }
  work = await source.getWaitingWork(user(["maintenance:view"]), now)
  assert.deepEqual(work.visibleKeys, ["openRepairs", "stuckRepairs", "duePm"])
  assert.deepEqual(
    state.calls.map((entry) => entry.call).filter((call) => !call.startsWith("systemSetting.")),
    ["maintenanceTicket.count", "asset.count", "maintenancePlan.count"],
  )
  assert.deepEqual([work.counts.openRepairs, work.counts.stuckRepairs, work.counts.warrantyExpiringSoon], [2, 1, 0])

  work = await source.getWaitingWork(user(["asset:view"]), now)
  assert.deepEqual(work.visibleKeys, ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"])
  work = await source.getWaitingWork(user(["checkout:view"]), now)
  assert.deepEqual(work.visibleKeys, [], "checkout:view alone no longer sees returns: they count assets")
  work = await source.getWaitingWork(user([]), now)
  assert.deepEqual(work.visibleKeys, [])
  assert.ok(Object.values(work.counts).every((count) => count === 0))
})
