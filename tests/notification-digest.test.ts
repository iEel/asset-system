import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

import {
  buildDailyDigestMessage,
  buildDailyDigestReferenceId,
  resolveDigestTone,
} from "../src/lib/notification-digest-format.ts"

test("builds stable daily digest reference id", () => {
  assert.equal(buildDailyDigestReferenceId(new Date("2026-05-20T11:30:00.000Z")), "notification-digest:2026-05-20")
})

test("builds localized digest message from notification items", () => {
  const message = buildDailyDigestMessage("th", [
    { key: "duePm", count: 2, href: "/th/maintenance#pm-due", tone: "warning" },
    { key: "returnsDueSoon", count: 3, href: "/th/asset-management/checkin", tone: "warning" },
  ])

  assert.match(message, /วันนี้มีงานที่ควรติดตาม 5 รายการ/)
  assert.match(message, /PM ครบกำหนดใน 7 วัน: 2/)
  assert.match(buildDailyDigestMessage("en", [{ key: "duePm", count: 2, href: "/en/maintenance#pm-due", tone: "warning" }]), /PM due within 7 days: 2/)
  assert.match(message, /รายการยืมใช้ชั่วคราวใกล้ครบกำหนดคืน: 3/)
})

test("the digest names the two repair kinds (group 1 dashboard task 1)", () => {
  const items = [
    { key: "openRepairs", count: 2, href: "/th/maintenance?status=in_progress", tone: "warning" as const },
    { key: "stuckRepairs", count: 1, href: "/th/maintenance#stuck", tone: "warning" as const },
  ]
  assert.match(buildDailyDigestMessage("th", items), /- ซ่อมยังไม่เสร็จ: 2\n- รอซ่อมแต่ยังไม่มีบันทึกซ่อม: 1/)
  assert.match(buildDailyDigestMessage("en", items), /- Repairs in progress: 2\n- Awaiting repair without a repair record: 1/)
})

test("uses highest severity tone in digest", () => {
  assert.equal(resolveDigestTone([{ key: "returnsDueSoon", count: 1, href: "/th", tone: "warning" }]), "warning")
  assert.equal(
    resolveDigestTone([
      { key: "returnsDueSoon", count: 1, href: "/th", tone: "warning" },
      { key: "approvalInbox", count: 1, href: "/th", tone: "danger" },
    ]),
    "danger"
  )
})

test("notification digest route records scheduler run state", () => {
  const source = readFileSync("src/app/api/notifications/digest/route.ts", "utf8")

  assert.match(source, /updateScheduledJobRunState/)
  assert.match(source, /notificationDigestLastRunAtKey/)
  assert.match(source, /notificationDigestLastStatusKey/)
  assert.match(source, /notificationDigestLastErrorKey/)
  assert.match(source, /status:\s*"success"/)
  assert.match(source, /status:\s*"failed"/)
})

// deliverDailyNotificationDigest imports the database and the summaries, which node --test cannot load, so a resolve
// hook serves stand-ins (as in tests/work-center-row-data.test.ts); they log every write to globalThis.__digest.
type DigestStub = {
  calls: Array<[string, ...unknown[]]>
  centerItems: Array<{ key: string; count: number; href: string; tone: string; isRead: boolean; isSnoozed: boolean; isSuppressed: boolean }>
  work: { counts: Record<string, number>; visibleKeys: string[] }
}
const stub: DigestStub = { calls: [], centerItems: [], work: { counts: {}, visibleKeys: [] } }
;(globalThis as unknown as { __digest: DigestStub }).__digest = stub

const mockedModuleSources = new Map<string, string>([
  ["@/lib/db", `
    const log = (...call) => globalThis.__digest.calls.push(call)
    export const prisma = {
      user: { async findMany() { return [{ id: "user-1", displayName: "ทดสอบ", email: null, employeeId: null, userRoles: [] }] } },
      notification: {
        async findFirst() { return null },
        async create(args) { log("notification.create", args.data.referenceId); return {} },
      },
    }
  `],
  ["@/lib/notification-summary", `
    export async function getNotificationCenter(user, locale, options) {
      globalThis.__digest.calls.push(["center", options])
      return { items: globalThis.__digest.centerItems }
    }
  `],
  ["@/lib/waiting-work", `
    export async function getWaitingWork() { return globalThis.__digest.work }
  `],
  ["@/lib/notification-delivery", `
    export function resolveNotificationDeliveryConfig() { return { enabled: false, webhookUrl: null } }
    export function buildNotificationWebhookPayload() { throw new Error("no webhook in this test") }
    export async function deliverNotificationWebhook() { throw new Error("no webhook in this test") }
  `],
  ["@/lib/notification-daily-counts", `
    const log = (...call) => globalThis.__digest.calls.push(call)
    export async function recordDailyCounts(userId, counts, now) { log("record", userId, counts, now) }
    export async function markDigestCounts(userId, counts, now) { log("mark", userId, counts, now) }
    export async function pruneDailyCounts(now) { log("prune", now); return 0 }
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

const digest = (await import(pathToFileURL("src/lib/notification-digest.ts").href)) as typeof import("../src/lib/notification-digest.ts")

const centerItem = (key: string, count: number, state: { isRead?: boolean; isSnoozed?: boolean } = {}) => ({
  key,
  count,
  href: "/th",
  tone: "warning",
  isRead: state.isRead ?? false,
  isSnoozed: state.isSnoozed ?? false,
  isSuppressed: Boolean(state.isRead || state.isSnoozed),
})

function resetStub() {
  stub.calls.length = 0
  stub.centerItems = [centerItem("duePm", 4), centerItem("openRepairs", 2, { isRead: true }), centerItem("approvalInbox", 1, { isSnoozed: true })]
  stub.work = { counts: { duePm: 4, openRepairs: 2, approvalInbox: 1, pendingDisposals: 0 }, visibleKeys: ["duePm", "openRepairs", "approvalInbox", "pendingDisposals"] }
}

test("digest reference id is the Bangkok day", () => {
  assert.equal(buildDailyDigestReferenceId(new Date("2026-11-06T18:30:00.000Z")), "notification-digest:2026-11-07")
  assert.equal(buildDailyDigestReferenceId(new Date("2026-11-06T16:59:00.000Z")), "notification-digest:2026-11-06")
})

test("a dry digest writes no daily counts", async () => {
  resetStub()
  const result = await digest.deliverDailyNotificationDigest({ dryRun: true, referenceDate: new Date("2026-11-07T00:30:00.000Z") })
  assert.equal(result.delivered, 1)
  assert.deepEqual(stub.calls.map((call) => call[0]), ["center"])
})

test("a digest records every visible key, marks the unread topics it sends and prunes once", async () => {
  resetStub()
  const now = new Date("2026-11-07T00:30:00.000Z")
  const result = await digest.deliverDailyNotificationDigest({ referenceDate: now })
  assert.equal(result.referenceId, "notification-digest:2026-11-07")
  assert.deepEqual(stub.calls, [
    ["center", { recordCountDrops: true }],
    ["record", "user-1", { duePm: 4, openRepairs: 2, approvalInbox: 1, pendingDisposals: 0 }, now],
    ["notification.create", "notification-digest:2026-11-07"],
    ["mark", "user-1", { duePm: 4 }, now],
    ["prune", now],
  ])
})

test("a digest records the counts of a user with nothing unread but sends nothing", async () => {
  resetStub()
  stub.centerItems = [centerItem("duePm", 4, { isRead: true })]
  const now = new Date("2026-11-07T00:30:00.000Z")
  const result = await digest.deliverDailyNotificationDigest({ referenceDate: now })
  assert.equal(result.skippedEmpty, 1)
  assert.deepEqual(stub.calls.map((call) => call[0]), ["center", "record", "prune"])
})
