# Audit Round Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auditable cancellation workflow for audit rounds that preserves already-recorded audit work and master asset changes.

**Architecture:** Introduce `cancelled` as a first-class `AuditRound.status` with cancellation metadata on `audit_rounds`. Centralize round lifecycle helpers so route guards, list queries, detail actions, dashboard queues, notifications, and approval inbox all exclude cancelled rounds from operational work while keeping historical detail readable.

**Tech Stack:** Next.js 16 App Router route handlers and server components, Prisma 7 SQL Server schema/manual migrations, Node built-in test runner, next-intl JSON messages.

---

## File Structure

- Create `src/lib/audit-round-status.ts`: lifecycle constants and helpers for read-only/operational round checks.
- Modify `src/lib/validations/audit.ts`: accept `cancelled` status and add `auditRoundCancelSchema`.
- Modify `prisma/schema.prisma`: add nullable cancellation metadata to `AuditRound`.
- Create `prisma/manual-migrations/2026-06-26-add-audit-round-cancellation.sql`: idempotent SQL Server migration for cancellation metadata and status index compatibility.
- Modify `src/app/api/audit-rounds/[id]/route.ts`: add `PATCH { action: "cancel" }`, preserve data, log impact counts, reject cancelled close.
- Modify audit mutation routes: scan, scan-lookup, mark-not-found, finding review, exports as needed to reject cancelled rounds.
- Modify audit operational pages/helpers: rounds list, round detail, scan page, pending page, findings filters, dashboard/work-center/notification/approval inbox queues.
- Create `src/components/audit/audit-round-cancel-button.tsx`: cancel dialog with impact counts and reason.
- Modify `messages/th.json` and `messages/en.json`: cancelled labels, dialog copy, read-only warning.
- Modify docs: `DEVELOPER_HANDOFF.md`, `docs/06_WORKFLOWS.md`, `docs/07_UAT_CHECKLIST.md`, `docs/99_CHANGELOG.md`, `docs/11_FEATURE_LIST.md`.
- Add tests: `tests/audit-round-cancellation.test.ts` plus focused updates to existing audit/notification/approval tests where they already assert these flows.

## Task 1: RED Tests For Lifecycle Model

**Files:**
- Create: `tests/audit-round-cancellation.test.ts`
- Modify later: `src/lib/audit-round-status.ts`
- Modify later: `src/lib/validations/audit.ts`
- Modify later: `prisma/schema.prisma`
- Modify later: `prisma/manual-migrations/2026-06-26-add-audit-round-cancellation.sql`

- [ ] **Step 1: Write failing lifecycle/schema tests**

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import {
  auditRoundReadOnlyStatuses,
  auditRoundOperationalWhere,
  isAuditRoundOperationalStatus,
  isAuditRoundReadOnlyStatus,
} from "../src/lib/audit-round-status.ts"
import { auditRoundCancelSchema, auditRoundSchema } from "../src/lib/validations/audit.ts"

test("audit round cancellation status is first-class but read-only", () => {
  assert.equal(isAuditRoundOperationalStatus("open"), true)
  assert.equal(isAuditRoundOperationalStatus("draft"), true)
  assert.equal(isAuditRoundOperationalStatus("closed"), false)
  assert.equal(isAuditRoundOperationalStatus("cancelled"), false)
  assert.equal(isAuditRoundReadOnlyStatus("closed"), true)
  assert.equal(isAuditRoundReadOnlyStatus("cancelled"), true)
  assert.deepEqual(auditRoundReadOnlyStatuses, ["closed", "cancelled"])
  assert.deepEqual(auditRoundOperationalWhere, { notIn: ["closed", "cancelled"] })
})

test("audit validation accepts cancelled status and requires cancel reason", () => {
  const parsed = auditRoundSchema.parse({
    name: "Test round",
    auditYear: 2026,
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    status: "cancelled",
  })
  assert.equal(parsed.status, "cancelled")
  assert.equal(auditRoundCancelSchema.parse({ reason: "Created for UAT by mistake" }).reason, "Created for UAT by mistake")
  assert.throws(() => auditRoundCancelSchema.parse({ reason: " " }))
})

test("audit round cancellation metadata is represented in Prisma schema and migration", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const migrationPath = "prisma/manual-migrations/2026-06-26-add-audit-round-cancellation.sql"
  assert.equal(existsSync(migrationPath), true, "missing manual migration")
  const migration = readFileSync(migrationPath, "utf8")

  assert.match(schema, /cancelledAt\s+DateTime\?/)
  assert.match(schema, /cancelledBy\s+String\?\s+@db\.NVarChar\(100\)/)
  assert.match(schema, /cancelReason\s+String\?\s+@db\.NVarChar\(Max\)/)
  assert.match(migration, /IF\s+COL_LENGTH\('dbo\.audit_rounds',\s*'cancelledAt'\)\s+IS\s+NULL/i)
  assert.match(migration, /ALTER\s+TABLE\s+\[dbo\]\.\[audit_rounds\]\s+ADD\s+\[cancelledAt\]\s+DATETIME2\s+NULL/i)
  assert.match(migration, /cancelReason\]\s+NVARCHAR\(MAX\)\s+NULL/i)
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/audit-round-cancellation.test.ts`

Expected: FAIL because `src/lib/audit-round-status.ts`, `auditRoundCancelSchema`, schema fields, and migration do not exist yet.

- [ ] **Step 3: Implement minimal lifecycle/schema code**

Create `src/lib/audit-round-status.ts`:

```ts
export const auditRoundReadOnlyStatuses = ["closed", "cancelled"] as const
export type AuditRoundReadOnlyStatus = (typeof auditRoundReadOnlyStatuses)[number]

export const auditRoundOperationalWhere = { notIn: [...auditRoundReadOnlyStatuses] } as const

export function isAuditRoundReadOnlyStatus(status: string | null | undefined) {
  return auditRoundReadOnlyStatuses.includes(status as AuditRoundReadOnlyStatus)
}

export function isAuditRoundOperationalStatus(status: string | null | undefined) {
  return !isAuditRoundReadOnlyStatus(status)
}

export function getAuditRoundReadOnlyError(status: string | null | undefined) {
  if (status === "cancelled") return "Audit round is cancelled"
  if (status === "closed") return "Audit round is closed"
  return null
}
```

In `src/lib/validations/audit.ts`, change:

```ts
const auditStatuses = ["draft", "open", "closed", "cancelled"] as const
```

Add near `auditRoundSchema`:

```ts
export const auditRoundCancelSchema = z.object({
  reason: z.string().trim().min(1).max(4000),
})
```

Add type:

```ts
export type AuditRoundCancelInput = z.infer<typeof auditRoundCancelSchema>
```

In `prisma/schema.prisma` under `AuditRound.status`, add:

```prisma
  cancelledAt       DateTime?
  cancelledBy       String?         @db.NVarChar(100)
  cancelReason      String?         @db.NVarChar(Max)
```

Create `prisma/manual-migrations/2026-06-26-add-audit-round-cancellation.sql`:

```sql
IF COL_LENGTH('dbo.audit_rounds', 'cancelledAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[audit_rounds] ADD [cancelledAt] DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.audit_rounds', 'cancelledBy') IS NULL
BEGIN
  ALTER TABLE [dbo].[audit_rounds] ADD [cancelledBy] NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.audit_rounds', 'cancelReason') IS NULL
BEGIN
  ALTER TABLE [dbo].[audit_rounds] ADD [cancelReason] NVARCHAR(MAX) NULL;
END;
```

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `node --test tests/audit-round-cancellation.test.ts`

Expected: PASS.

## Task 2: RED Tests For API Guards

**Files:**
- Modify: `tests/audit-round-cancellation.test.ts`
- Modify later: `src/app/api/audit-rounds/[id]/route.ts`
- Modify later: scan, scan-lookup, mark-not-found, review, export routes

- [ ] **Step 1: Add failing source-level API tests**

Append:

```ts
test("audit round patch route supports cancel with required reason and no item rollback", () => {
  const route = readFileSync("src/app/api/audit-rounds/[id]/route.ts", "utf8")

  assert.match(route, /auditRoundCancelSchema/)
  assert.match(route, /action === "cancel"/)
  assert.match(route, /status:\s*"cancelled"/)
  assert.match(route, /cancelledAt:/)
  assert.match(route, /cancelledBy:\s*user\.id/)
  assert.match(route, /cancelReason:\s*input\.reason/)
  assert.match(route, /getCancellationImpact/)
  assert.match(route, /action:\s*"cancel"/)
  assert.doesNotMatch(route, /auditItem\.deleteMany/)
  assert.doesNotMatch(route, /auditFinding\.deleteMany/)
  assert.doesNotMatch(route, /assetMovement\.deleteMany/)
})

test("audit mutation routes reject cancelled rounds as read-only", () => {
  const guardedRoutes = [
    "src/app/api/audit-rounds/[id]/route.ts",
    "src/app/api/audit-rounds/[id]/scan/route.ts",
    "src/app/api/audit-rounds/[id]/scan-lookup/route.ts",
    "src/app/api/audit-items/[id]/mark-not-found/route.ts",
    "src/app/api/audit-findings/[id]/review/route.ts",
    "src/app/api/audit-rounds/[id]/export/route.ts",
    "src/app/api/audit-rounds/[id]/export-pdf/route.ts",
    "src/app/api/audit-rounds/[id]/variance-export/route.ts",
  ]

  for (const filePath of guardedRoutes) {
    const source = readFileSync(filePath, "utf8")
    assert.match(source, /getAuditRoundReadOnlyError|isAuditRoundReadOnlyStatus|status:\s*\{\s*notIn:\s*\[\s*"closed",\s*"cancelled"\s*\]/, `${filePath} should guard cancelled rounds`)
  }
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/audit-round-cancellation.test.ts`

Expected: FAIL because route guards and cancel implementation are missing.

- [ ] **Step 3: Implement API cancellation and guards**

In `src/app/api/audit-rounds/[id]/route.ts`, import:

```ts
import { getAuditRoundReadOnlyError, isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { auditRoundCancelSchema } from "@/lib/validations/audit"
```

Branch `PATCH`:

```ts
if (action !== "close" && action !== "cancel") {
  return NextResponse.json({ error: "Unsupported audit round action" }, { status: 400 })
}
```

For cancel:

```ts
if (action === "cancel") {
  if (isAuditRoundReadOnlyStatus(round.status)) {
    return NextResponse.json({ error: getAuditRoundReadOnlyError(round.status) }, { status: 400 })
  }
  const input = auditRoundCancelSchema.parse(body)
  const impact = await getCancellationImpact(id)
  const cancelledAt = new Date()
  const updatedRound = await prisma.auditRound.update({
    where: { id },
    data: {
      status: "cancelled",
      cancelledAt,
      cancelledBy: user.id,
      cancelReason: input.reason,
      updatedBy: user.id,
    },
  })
  await logAudit({
    userId: user.id,
    action: "cancel",
    module: "audit",
    recordId: id,
    oldValue: { status: round.status },
    newValue: { status: updatedRound.status, cancelledAt, impact },
    remark: input.reason,
  })
  return NextResponse.json({ ...updatedRound, impact })
}
```

Add helper:

```ts
async function getCancellationImpact(auditRoundId: string) {
  const [pendingItems, processedItems, pendingFindings, approvedFindings, openActions, scanHistoryRows] = await Promise.all([
    prisma.auditItem.count({ where: { auditRoundId, auditStatus: "pending" } }),
    prisma.auditItem.count({ where: { auditRoundId, auditStatus: { not: "pending" } } }),
    prisma.auditFinding.count({ where: { auditRoundId, reviewStatus: "pending" } }),
    prisma.auditFinding.count({ where: { auditRoundId, reviewStatus: "approved" } }),
    prisma.auditFinding.count({ where: { auditRoundId, actionStatus: { in: ["planned", "in_progress", "done"] } } }),
    prisma.auditScanHistory.count({ where: { auditRoundId } }),
  ])
  return { pendingItems, processedItems, pendingFindings, approvedFindings, openActions, scanHistoryRows }
}
```

For close and other mutation routes, use `getAuditRoundReadOnlyError(status)` and reject when non-null. Export routes should reject cancelled rounds with `400` and keep closed exports allowed.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `node --test tests/audit-round-cancellation.test.ts tests/rbac-route-matrix.test.ts`

Expected: PASS.

## Task 3: RED Tests For Operational Queues And UI

**Files:**
- Modify: `tests/audit-round-cancellation.test.ts`
- Create: `src/components/audit/audit-round-cancel-button.tsx`
- Modify: audit rounds list/detail/scan/pending pages, finding filters, dashboard, work-center, notification, approval inbox, messages

- [ ] **Step 1: Add failing UI/queue tests**

Append:

```ts
test("audit rounds UI exposes cancellation and cancelled read-only state", () => {
  const detail = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const list = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/page.tsx", "utf8")
  const cancelButton = readFileSync("src/components/audit/audit-round-cancel-button.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(detail, /AuditRoundCancelButton/)
  assert.match(detail, /isAuditRoundReadOnlyStatus\(round\.status\)/)
  assert.match(detail, /cancelReason/)
  assert.match(detail, /cancelledAt/)
  assert.match(detail, /cancelledReadOnlyNotice/)
  assert.match(detail, /!isRoundReadOnly/)
  assert.match(list, /"cancelled"/)
  assert.match(list, /viewCancelled/)
  assert.match(list, /isAuditRoundOperationalStatus/)
  assert.match(cancelButton, /role="dialog"/)
  assert.match(cancelButton, /JSON\.stringify\(\{ action: "cancel", reason:/)
  assert.match(cancelButton, /impact\.processedItems/)
  assert.match(cancelButton, /impact\.approvedFindings/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.statusCancelled, "string")
    assert.equal(typeof messages.auditRound.viewCancelled, "string")
    assert.equal(typeof messages.auditRound.cancelRound, "string")
    assert.equal(typeof messages.auditRound.cancelReason, "string")
    assert.equal(typeof messages.auditRound.cancelImpactProcessed, "string")
    assert.equal(typeof messages.auditRound.cancelledReadOnlyNotice, "string")
  }
})

test("operational audit queues exclude cancelled rounds by default", () => {
  const files = [
    "src/app/[locale]/(dashboard)/audit/rounds/page.tsx",
    "src/lib/audit-finding-filters.ts",
    "src/lib/approval-inbox-query.ts",
    "src/lib/notification-summary.ts",
    "src/app/[locale]/(dashboard)/work-center/page.tsx",
    "src/app/[locale]/(dashboard)/dashboard/page.tsx",
  ]

  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8")
    assert.match(source, /auditRoundOperationalWhere|isAuditRoundOperationalStatus|notIn:\s*\[\s*"closed",\s*"cancelled"\s*\]/, `${filePath} should exclude cancelled operational audit work`)
  }
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/audit-round-cancellation.test.ts`

Expected: FAIL because UI and queue exclusions are missing.

- [ ] **Step 3: Implement UI and queue exclusions**

Use `auditRoundOperationalWhere` in Prisma query filters:

```ts
auditRound: { isActive: true, status: auditRoundOperationalWhere }
```

Use `isAuditRoundOperationalStatus(round.status)` instead of `round.status !== "closed"` in list/detail helpers.

Add `cancelled` to list filters:

```ts
const auditRoundViewValues = ["all", "open", "pending", "review", "mismatch", "readyToClose", "cancelled"] as const
```

Add `AuditRoundCancelButton` with modal reason field and impact counts. The component submits:

```ts
await fetch(`/api/audit-rounds/${roundId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "cancel", reason: reason.trim() }),
})
```

In detail page, define:

```ts
const isRoundReadOnly = isAuditRoundReadOnlyStatus(round.status)
```

Hide scan/pending/mobile action links and close button when `isRoundReadOnly`; show a read-only cancellation notice with `cancelledAt`, `cancelledBy`, and `cancelReason`.

In scan and pending pages, call `notFound()` or render a read-only empty state when `round.status` is cancelled. Prefer notFound for scan mutation entry, and readable pending page warning if needed.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `node --test tests/audit-round-cancellation.test.ts tests/audit-rounds-ux.test.ts tests/audit-finding-resolution.test.ts tests/approval-inbox.test.ts tests/notification-summary.test.ts tests/work-center-metrics.test.ts`

Expected: PASS.

## Task 4: Docs And Verification

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/99_CHANGELOG.md`
- Modify: `docs/11_FEATURE_LIST.md`

- [ ] **Step 1: Add failing docs test**

Append to `tests/audit-round-cancellation.test.ts`:

```ts
test("audit cancellation workflow is documented in handoff docs", () => {
  const files = [
    "DEVELOPER_HANDOFF.md",
    "docs/06_WORKFLOWS.md",
    "docs/07_UAT_CHECKLIST.md",
    "docs/99_CHANGELOG.md",
    "docs/11_FEATURE_LIST.md",
  ]
  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8")
    assert.match(source, /cancelled|ยกเลิก|cancellation/i, `${filePath} should mention audit round cancellation`)
    assert.match(source, /preserve|ไม่ rollback|ไม่ย้อนกลับ|historical/i, `${filePath} should document that prior audit work is preserved`)
  }
})
```

- [ ] **Step 2: Run docs test and confirm RED**

Run: `node --test tests/audit-round-cancellation.test.ts`

Expected: FAIL until docs are updated.

- [ ] **Step 3: Update docs**

Add concise notes stating:

```md
- Audit rounds can be cancelled with a required reason. Cancellation keeps `isActive = true`, preserves audit items, scan history, findings, evidence, system logs, and any approved/immediate master asset corrections, and makes the round read-only. Cancelled rounds are excluded from current coverage, operational queues, approval inbox close readiness, scan/save/review actions, and active result exports.
```

- [ ] **Step 4: Run final verification**

Run:

```powershell
node --test tests/audit-round-cancellation.test.ts tests/audit-rounds-ux.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-finding-resolution.test.ts tests/audit-scan-lookup.test.ts tests/audit-not-found-dialog.test.ts tests/rbac-route-matrix.test.ts tests/approval-inbox.test.ts tests/notification-summary.test.ts tests/work-center-metrics.test.ts
npx prisma generate
npx tsc --noEmit --pretty false
npm run lint
git diff --check
```

Expected: all commands exit `0`.

## Self-Review

- Spec coverage: Tasks 1-2 cover status, metadata, cancel action, route guards, and no rollback; Task 3 covers UI/read-only/list/queues; Task 4 covers required handoff docs.
- Placeholder scan: no TODO/TBD placeholders remain; each code step names concrete files and snippets.
- Type consistency: status string is `cancelled`, metadata fields are `cancelledAt`, `cancelledBy`, and `cancelReason`, matching the approved spec and planned Prisma schema.
