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

test("the digest names pending findings รายการไม่ตรงทะเบียนรอพิจารณา (inspection-confirm plan 1)", () => {
  const items = [{ key: "pendingAuditFindings", count: 4, href: "/th/audit/findings", tone: "warning" as const }]
  assert.match(buildDailyDigestMessage("th", items), /- รายการไม่ตรงทะเบียนรอพิจารณา: 4/)
})

test("the digest names low consumables (consumables plan 4 task 1)", () => {
  const items = [{ key: "consumablesLow", count: 2, href: "/th/consumables?state=low", tone: "warning" as const }]
  assert.match(buildDailyDigestMessage("th", items), /- ของใช้สิ้นเปลืองต้องซื้อเพิ่ม: 2/)
  assert.match(buildDailyDigestMessage("en", items), /- Consumables to restock: 2/)
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
  users: string[]
  failRecordFor: string | null
  failMarkFor: string | null
  /** notification_digest_structured_since as stored; null while missing. */
  structuredSince: string | null
  /** The create of that setting fails with this code (P2002 = another run wrote it first). */
  failSettingCreate: string | null
}
const stub: DigestStub = {
  calls: [],
  centerItems: [],
  work: { counts: {}, visibleKeys: [] },
  users: ["user-1"],
  failRecordFor: null,
  failMarkFor: null,
  structuredSince: null,
  failSettingCreate: null,
}
;(globalThis as unknown as { __digest: DigestStub }).__digest = stub

const mockedModuleSources = new Map<string, string>([
  ["@/lib/db", `
    const log = (...call) => globalThis.__digest.calls.push(call)
    export const prisma = {
      user: { async findMany() { return globalThis.__digest.users.map((id) => ({ id, displayName: id, email: null, employeeId: null, userRoles: [] })) } },
      notification: {
        async findFirst() { return null },
        async create(args) { log("notification.create", args.data.userId, args.data.referenceId); return {} },
      },
      systemSetting: {
        async findUnique(args) {
          log("setting.find", args.where.key)
          const value = globalThis.__digest.structuredSince
          return value === null ? null : { key: args.where.key, value }
        },
        async create(args) {
          log("setting.create", args.data.key, args.data.value)
          const code = globalThis.__digest.failSettingCreate
          if (code) throw Object.assign(new Error("create failed"), { code })
          globalThis.__digest.structuredSince = args.data.value
          return args.data
        },
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
    export async function recordDailyCounts(userId, counts, now) {
      log("record", userId, counts, now)
      if (globalThis.__digest.failRecordFor === userId) throw new Error("record failed for " + userId)
    }
    export async function markDigestCounts(userId, counts, now) {
      log("mark", userId, counts, now)
      if (globalThis.__digest.failMarkFor === userId) throw new Error("mark failed for " + userId)
    }
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
  stub.users = ["user-1"]
  stub.failRecordFor = null
  stub.failMarkFor = null
  stub.structuredSince = null
  stub.failSettingCreate = null
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
    ["notification.create", "user-1", "notification-digest:2026-11-07"],
    ["mark", "user-1", { duePm: 4 }, now],
    ["setting.find", "notification_digest_structured_since"],
    ["setting.create", "notification_digest_structured_since", "2026-11-07"],
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

test("one user's failed daily counts are logged and the digest goes on to the next user (final review F3)", async (t) => {
  resetStub()
  stub.users = ["user-1", "user-2", "user-3"]
  stub.failRecordFor = "user-1"
  stub.failMarkFor = "user-2"
  const errors: unknown[][] = []
  t.mock.method(console, "error", (...args: unknown[]) => { errors.push(args) })
  const now = new Date("2026-11-07T00:30:00.000Z")
  const result = await digest.deliverDailyNotificationDigest({ referenceDate: now })
  assert.equal(result.delivered, 3, "every user still gets the digest")
  assert.deepEqual(
    stub.calls.filter((call) => call[0] !== "center").map((call) => call.slice(0, 2)),
    [
      ["record", "user-1"], ["notification.create", "user-1"], ["mark", "user-1"],
      ["setting.find", "notification_digest_structured_since"], ["setting.create", "notification_digest_structured_since"],
      ["record", "user-2"], ["notification.create", "user-2"], ["mark", "user-2"],
      ["record", "user-3"], ["notification.create", "user-3"], ["mark", "user-3"],
      ["prune", now],
    ],
  )
  assert.equal(errors.length, 2)
  assert.match(String(errors[0][0]), /user-1/)
  assert.match(String(errors[1][0]), /user-2/)
  assert.ok(errors.every((args) => args.every((arg) => !String(arg).includes("duePm"))), "the log names the user, not the counts")
})

// Final review (group 9 plan 3): the legacy digest cutoff is the first day the digest stored its topics, kept in a
// system setting that pruning cannot move. Written once, Bangkok date, only while missing.
test("the first digest that marks counts stores the first structured day, Bangkok date, once per run", async () => {
  resetStub()
  stub.users = ["user-1", "user-2"]
  // 2026-11-06 18:30 UTC is 2026-11-07 01:30 in Bangkok.
  const now = new Date("2026-11-06T18:30:00.000Z")
  await digest.deliverDailyNotificationDigest({ referenceDate: now })
  const settingCalls = stub.calls.filter((call) => String(call[0]).startsWith("setting."))
  assert.deepEqual(settingCalls, [
    ["setting.find", "notification_digest_structured_since"],
    ["setting.create", "notification_digest_structured_since", "2026-11-07"],
  ])
  assert.equal(stub.structuredSince, "2026-11-07")
})

test("a stored first structured day is never overwritten", async () => {
  resetStub()
  stub.structuredSince = "2026-11-01"
  await digest.deliverDailyNotificationDigest({ referenceDate: new Date("2026-12-20T00:30:00.000Z") })
  assert.deepEqual(stub.calls.filter((call) => String(call[0]).startsWith("setting.")), [["setting.find", "notification_digest_structured_since"]])
  assert.equal(stub.structuredSince, "2026-11-01")
})

test("a dry run, or a run whose marking fails, stores no first structured day", async (t) => {
  resetStub()
  await digest.deliverDailyNotificationDigest({ dryRun: true, referenceDate: new Date("2026-11-07T00:30:00.000Z") })
  assert.equal(stub.calls.some((call) => String(call[0]).startsWith("setting.")), false)

  resetStub()
  stub.failMarkFor = "user-1"
  t.mock.method(console, "error", () => {})
  await digest.deliverDailyNotificationDigest({ referenceDate: new Date("2026-11-07T00:30:00.000Z") })
  assert.equal(stub.calls.some((call) => String(call[0]).startsWith("setting.")), false)
  assert.equal(stub.structuredSince, null)
})

test("another run writing the first structured day first (P2002) is fine; any other failure is logged and the digest goes on", async (t) => {
  resetStub()
  stub.failSettingCreate = "P2002"
  const errors: unknown[][] = []
  t.mock.method(console, "error", (...args: unknown[]) => { errors.push(args) })
  const now = new Date("2026-11-07T00:30:00.000Z")
  const result = await digest.deliverDailyNotificationDigest({ referenceDate: now })
  assert.equal(result.delivered, 1)
  assert.equal(errors.length, 0)

  resetStub()
  stub.users = ["user-1", "user-2"]
  stub.failSettingCreate = "P1001"
  const second = await digest.deliverDailyNotificationDigest({ referenceDate: now })
  assert.equal(second.delivered, 2)
  assert.equal(errors.length, 1)
  assert.match(String(errors[0][0]), /structured/)
  assert.equal(stub.calls.at(-1)?.[0], "prune")
})

test("Admin > Settings never lists the first structured digest day", () => {
  const defaults = readFileSync("src/lib/system-setting-defaults.ts", "utf8")
  assert.match(defaults, /export const notificationDigestStructuredSinceKey = "notification_digest_structured_since"/)
  assert.match(defaults, /export const hiddenSystemSettingKeys: ReadonlySet<string> = new Set\(\[notificationDigestStructuredSinceKey\]\)/)
  const page = readFileSync("src/app/[locale]/(dashboard)/admin/settings/page.tsx", "utf8")
  assert.match(page, /savedSettings\.filter\(\(setting\) => !defaultKeys\.has\(setting\.key\) && !hiddenSystemSettingKeys\.has\(setting\.key\)\)/)
})
