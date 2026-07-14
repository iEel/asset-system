# Notification Read-State Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make opened notifications disappear from the active bell immediately, keep the Topbar synchronized after Notification Center mutations, and describe completed maintenance tickets as awaiting closure instead of overdue repair work.

**Architecture:** Keep the existing per-user notification-state API and add a client-safe synchronization helper shared by the Topbar and Notification Center actions. Split maintenance summary counts on the server so overdue work excludes `completed`, while a new localized notification key counts every active completed ticket awaiting the existing close flow.

**Tech Stack:** Next.js 16.2.4 App Router, React 19 Client Components, TypeScript, next-intl, Prisma 7.8/SQL Server, Node test runner.

## Global Constraints

- Do not change the database schema or add runtime dependencies.
- Opening an active bell item marks only that key and its current count as read; it never closes or mutates the underlying work item.
- Successful read, unread, snooze, and assign actions must refresh the Topbar badge immediately.
- Failed read persistence must retain the badge and must not block navigation to operational work.
- Completed maintenance counts every active `completed` ticket and links to `/{locale}/maintenance?queue=completed`.
- Overdue maintenance excludes both `completed` and `closed`.
- Existing count-change reactivation, RBAC-derived counts, close evidence, snooze, and assignment behavior remain unchanged.
- Preserve Thai/English parity, existing design tokens, semantic links, keyboard behavior, and 44px Topbar touch targets.

---

### Task 1: Separate Completed Maintenance Notification Semantics

**Files:**
- Modify: `src/lib/notification-summary-items.ts`
- Modify: `src/lib/notification-summary.ts`
- Modify: `src/lib/notification-digest-format.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/notification-summary.test.ts`
- Modify: `tests/notification-digest.test.ts`
- Create: `tests/notification-maintenance-query.test.ts`

**Interfaces:**
- Produces: `NotificationSummaryCounts.completedMaintenanceAwaitingClose: number`.
- Produces: notification item key `completedMaintenanceAwaitingClose` with warning tone and `/{locale}/maintenance?queue=completed` href.
- Preserves: `getNotificationSummary(user, locale)` response structure and per-user state merging.

- [ ] **Step 1: Write failing summary and digest tests**

Add a completed count to every `NotificationSummaryCounts` fixture and assert the new item:

```ts
const items = buildNotificationSummaryItems("th", {
  approvalInbox: 0,
  overdueMaintenance: 1,
  completedMaintenanceAwaitingClose: 2,
  pendingAuditFindings: 0,
  openAuditActions: 0,
  auditActionsDueSoon: 0,
  pendingDisposals: 0,
  approvedDisposals: 0,
  returnsDueSoon: 0,
  warrantyExpiringSoon: 0,
  licenseExpiringSoon: 0,
})

assert.deepEqual(items.map((item) => [item.key, item.count, item.href]), [
  ["overdueMaintenance", 1, "/th/maintenance?overdue=yes"],
  ["completedMaintenanceAwaitingClose", 2, "/th/maintenance?queue=completed"],
])
```

Extend the digest test with:

```ts
{ key: "completedMaintenanceAwaitingClose", count: 1, href: "/th/maintenance?queue=completed", tone: "warning" }
```

and assert `/งานซ่อมเสร็จแล้วรอปิดงาน: 1/`.

- [ ] **Step 2: Write a failing maintenance-query regression test**

Create `tests/notification-maintenance-query.test.ts` to read `src/lib/notification-summary.ts` and assert that:

```ts
assert.match(source, /repairStatus:\s*\{\s*notIn:\s*\["completed",\s*"closed"\]\s*\}/)
assert.match(source, /repairStatus:\s*"completed"/)
assert.match(source, /completedMaintenanceAwaitingClose/)
```

- [ ] **Step 3: Run RED tests**

Run:

```powershell
node --test tests/notification-summary.test.ts tests/notification-digest.test.ts tests/notification-maintenance-query.test.ts
```

Expected: FAIL because `completedMaintenanceAwaitingClose` does not exist and `completed` is still in the overdue status list.

- [ ] **Step 4: Implement the minimal server and item changes**

Extend the count type and item list:

```ts
export type NotificationSummaryCounts = {
  approvalInbox: number
  overdueMaintenance: number
  completedMaintenanceAwaitingClose: number
  // existing fields unchanged
}

{
  key: "completedMaintenanceAwaitingClose",
  count: counts.completedMaintenanceAwaitingClose,
  href: `/${locale}/maintenance?queue=completed`,
  tone: "warning",
}
```

In `getNotificationCenter`, add the completed count to the `Promise.all` result and use these independent Prisma filters:

```ts
prisma.maintenanceTicket.count({
  where: {
    isActive: true,
    dueDate: { lt: today },
    repairStatus: { notIn: ["completed", "closed"] },
  },
})

prisma.maintenanceTicket.count({
  where: { isActive: true, repairStatus: "completed" },
})
```

Both queries remain gated by `canMaintenance`.

- [ ] **Step 5: Add localized copy and digest labels**

Add under the `notifications` namespace:

```json
"completedMaintenanceAwaitingClose": "งานซ่อมเสร็จแล้วรอปิดงาน",
"completedMaintenanceAwaitingCloseDetail": "ตรวจหลักฐานและปิดใบงานเพื่อจบกระบวนการ"
```

and English:

```json
"completedMaintenanceAwaitingClose": "Repairs awaiting closure",
"completedMaintenanceAwaitingCloseDetail": "Review evidence and close the ticket to finish the workflow"
```

Add digest labels `งานซ่อมเสร็จแล้วรอปิดงาน` and `Maintenance awaiting closure`.

- [ ] **Step 6: Run GREEN tests and parity checks**

Run:

```powershell
node --test tests/notification-summary.test.ts tests/notification-digest.test.ts tests/notification-maintenance-query.test.ts tests/notification-center.test.ts
node --test tests/maintenance-i18n.test.ts
```

Expected: all tests PASS.

- [ ] **Step 7: Commit Task 1**

```powershell
git add src/lib/notification-summary-items.ts src/lib/notification-summary.ts src/lib/notification-digest-format.ts messages/th.json messages/en.json tests/notification-summary.test.ts tests/notification-digest.test.ts tests/notification-maintenance-query.test.ts
git commit -m "fix(notifications): distinguish maintenance awaiting closure"
```

---

### Task 2: Synchronize Read State Across Notification Surfaces

**Files:**
- Create: `src/lib/notification-client-sync.ts`
- Modify: `src/components/layout/topbar.tsx`
- Modify: `src/components/notifications/notification-center-actions.tsx`
- Create: `tests/notification-client-sync.test.ts`
- Create: `tests/notification-topbar-behavior.test.ts`

**Interfaces:**
- Produces: `notificationSummaryChangedEvent = "asset-system:notification-summary-changed"`.
- Produces: `notifyNotificationSummaryChanged(): void`.
- Produces: `removeNotificationSummaryItem(summary, key): NotificationSummary` as a pure helper.
- Consumes: existing `PATCH /api/notifications` contract `{ key, count, action: "read" }`.

- [ ] **Step 1: Write failing pure-helper tests**

Create `tests/notification-client-sync.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { removeNotificationSummaryItem } from "../src/lib/notification-client-sync.ts"

test("removes a read notification and decrements the active total", () => {
  const result = removeNotificationSummaryItem({
    total: 4,
    items: [
      { key: "overdueMaintenance", count: 1, href: "/th/maintenance", tone: "danger" },
      { key: "returnsDueSoon", count: 3, href: "/th/checkin", tone: "primary" },
    ],
  }, "overdueMaintenance")

  assert.equal(result.total, 3)
  assert.deepEqual(result.items.map((item) => item.key), ["returnsDueSoon"])
})

test("leaves an unknown notification unchanged and never creates a negative total", () => {
  const summary = { total: 0, items: [] }
  assert.deepEqual(removeNotificationSummaryItem(summary, "missing"), summary)
})
```

- [ ] **Step 2: Write failing Topbar and action integration tests**

Create `tests/notification-topbar-behavior.test.ts` that reads both client components and asserts:

```ts
assert.match(topbar, /method:\s*"PATCH"/)
assert.match(topbar, /action:\s*"read"/)
assert.match(topbar, /removeNotificationSummaryItem/)
assert.match(topbar, /notificationSummaryChangedEvent/)
assert.match(actions, /notifyNotificationSummaryChanged\(\)/)
assert.match(actions, /notifyNotificationSummaryChanged\(\)[\s\S]*router\.refresh\(\)/)
```

- [ ] **Step 3: Run RED tests**

Run:

```powershell
node --test tests/notification-client-sync.test.ts tests/notification-topbar-behavior.test.ts
```

Expected: FAIL because the helper and synchronization behavior do not exist.

- [ ] **Step 4: Implement the client-safe synchronization helper**

Create `src/lib/notification-client-sync.ts` without server imports:

```ts
export const notificationSummaryChangedEvent = "asset-system:notification-summary-changed"

export type ClientNotificationSummaryItem = {
  key: string
  count: number
  href: string
  tone: "danger" | "warning" | "primary"
}

export type ClientNotificationSummary = {
  total: number
  items: ClientNotificationSummaryItem[]
}

export function notifyNotificationSummaryChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(notificationSummaryChangedEvent))
}

export function removeNotificationSummaryItem(summary: ClientNotificationSummary, key: string) {
  const item = summary.items.find((candidate) => candidate.key === key)
  if (!item) return summary
  return {
    total: Math.max(0, summary.total - item.count),
    items: summary.items.filter((candidate) => candidate.key !== key),
  }
}
```

- [ ] **Step 5: Refactor Topbar loading and subscribe to successful mutations**

Use `useCallback` for the authoritative loader, retaining the last known summary on failure:

```ts
const loadNotificationSummary = useCallback(async () => {
  const response = await fetch(`/api/notifications?locale=${locale}`)
  if (!response.ok) return
  setNotificationSummary(await response.json())
}, [locale])

useEffect(() => {
  void loadNotificationSummary()
  const refresh = () => void loadNotificationSummary()
  window.addEventListener(notificationSummaryChangedEvent, refresh)
  return () => window.removeEventListener(notificationSummaryChangedEvent, refresh)
}, [loadNotificationSummary])
```

Implement bell-link click handling. Do not intercept modified clicks (`metaKey`, `ctrlKey`, `shiftKey`, `altKey`, or non-left button). For a normal click, prevent default, PATCH read state, remove locally and dispatch only on success, then always `router.push(item.href)`.

- [ ] **Step 6: Dispatch synchronization after Notification Center mutations**

After a successful PATCH and before `router.refresh()`:

```ts
toast.success(labels.saved)
notifyNotificationSummaryChanged()
router.refresh()
```

- [ ] **Step 7: Run GREEN and existing notification tests**

Run:

```powershell
node --test tests/notification-client-sync.test.ts tests/notification-topbar-behavior.test.ts tests/notification-center.test.ts tests/notification-summary.test.ts tests/notification-digest.test.ts tests/notification-maintenance-query.test.ts
```

Expected: all tests PASS.

- [ ] **Step 8: Run quality checks**

Run:

```powershell
npx eslint src/components/layout/topbar.tsx src/components/notifications/notification-center-actions.tsx src/lib/notification-client-sync.ts src/lib/notification-summary.ts src/lib/notification-summary-items.ts src/lib/notification-digest-format.ts tests/notification-client-sync.test.ts tests/notification-topbar-behavior.test.ts tests/notification-maintenance-query.test.ts
npx tsc --noEmit
npm test
node .agents/skills/impeccable/scripts/detect.mjs --json src/components/layout/topbar.tsx src/components/notifications/notification-center-actions.tsx
```

Expected: ESLint has 0 errors, TypeScript passes, full suite passes, detector returns `[]`.

- [ ] **Step 9: Build and inspect runtime state**

Run the production build with the existing environment-loading pattern and confirm all pages generate. Verify port 3000 remains available; if browser control is still blocked by plugin runtime, record authenticated UI smoke as unavailable rather than claiming it passed.

- [ ] **Step 10: Commit Task 2**

```powershell
git add src/lib/notification-client-sync.ts src/components/layout/topbar.tsx src/components/notifications/notification-center-actions.tsx tests/notification-client-sync.test.ts tests/notification-topbar-behavior.test.ts
git commit -m "fix(notifications): synchronize read state across surfaces"
```
