# Disposal Bulk Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-authoritative bulk approval for up to 50 pending disposal requests selected from the current queue page, with preflight visibility, partial success, SOD enforcement, item-level auditability, and adaptive desktop/mobile selection.

**Architecture:** Keep `/[locale]/disposal` as a Server Component and add a small client selection provider around its existing mobile cards and desktop table. Extract the authoritative approve mutation into a transactional service used by both the existing single-request route and a new bulk route; preview and commit share the same pure eligibility policy, and commit revalidates every item immediately before mutation.

**Tech Stack:** Next.js 16.2 App Router Route Handlers, React 19, TypeScript, Prisma 7 with SQL Server adapter, Zod, next-intl, Tailwind CSS, Lucide React, Node test runner.

## Global Constraints

- Bulk approval accepts 1-50 unique disposal request IDs from the currently loaded queue page.
- Only approval is bulk-enabled; rejection and execution remain item-level operations.
- Bulk approval never changes disposal type, estimated sale value, salvage value, evidence, recipient, document, or execution data.
- One optional shared approval remark, capped at 4,000 characters, is copied only to successfully approved requests.
- Every item retains independent RBAC, SOD, Pending Disposal lifecycle validation, transaction, movement, audit log, and batch status derivation.
- Preflight is advisory; commit repeats every server-side check and may return partial success.
- Selection controls render only for `disposal:approve`; the API independently enforces the same permission.
- Selection is page-scoped and resets when filters, stage, page, or page size changes.
- Mobile selection uses the content header and never adds a bottom bar that collides with Mobile Field Navigation.
- Reuse Navy/White/Action Blue tokens, Lucide icons, 8px control radius, 44px mobile touch targets, and the existing accessible dialog behavior.
- Add no new runtime dependency and no database migration.

---

## File Map

- Create `src/lib/disposal-bulk-approval.ts`: stable item outcomes, block codes, pure eligibility evaluation, and summary calculation.
- Modify `src/lib/validations/disposal.ts`: discriminated preview/commit request schema with ID count, UUID, duplicate, and remark validation.
- Create `src/lib/disposal-approval-service.ts`: candidate loading and one-request transactional approval shared by single and bulk routes.
- Modify `src/lib/audit-log.ts`: expose a transaction-aware audit writer while preserving the existing best-effort `logAudit` API.
- Modify `src/app/api/disposal-requests/[id]/route.ts`: delegate approval to the shared service; retain rejection and execution behavior.
- Create `src/app/api/disposal-requests/bulk-decision/route.ts`: permission guard, preflight, sequential commit, and item-level response.
- Modify `src/lib/rbac-route-matrix.ts`: classify the new route as `disposal:approve`.
- Create `src/components/disposal/disposal-bulk-approval.tsx`: page-scoped selection context, toolbar, controls, preflight/result dialog, and refresh behavior.
- Modify `src/app/[locale]/(dashboard)/disposal/page.tsx`: supply selection metadata and place controls in mobile cards and desktop rows.
- Modify `messages/th.json` and `messages/en.json`: selection, preview, result, and stable block-code copy.
- Create `tests/disposal-bulk-approval.test.ts`: pure policy, summary, source-contract, and UI-structure coverage.
- Modify `tests/disposal-validation.test.ts`, `tests/disposal-route-structure.test.ts`, and `tests/disposal-queue-ux.test.ts`: validation, route sharing, RBAC, and responsive queue expectations.
- Modify `DEVELOPER_HANDOFF.md`, `docs/06_WORKFLOWS.md`, and `docs/07_UAT_CHECKLIST.md`: operational behavior and UAT scenarios.

---

### Task 1: Bulk Contracts And Input Validation

**Files:**
- Create: `src/lib/disposal-bulk-approval.ts`
- Modify: `src/lib/validations/disposal.ts`
- Create: `tests/disposal-bulk-approval.test.ts`
- Modify: `tests/disposal-validation.test.ts`

**Interfaces:**
- Produces: `DisposalBulkApprovalCode`, `DisposalBulkApprovalItem`, `DisposalBulkApprovalSummary`, `getDisposalBulkApprovalBlockCode()`, `summarizeDisposalBulkApproval()`, `disposalBulkDecisionSchema`, and `DisposalBulkDecisionInput`.
- Consumes: `getDisposalSegregationError()` and `getDisposalApprovalAssetStatusError()` from `src/lib/disposal-policy.ts`.

- [ ] **Step 1: Write failing pure-policy and summary tests**

Create `tests/disposal-bulk-approval.test.ts` with these cases:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  getDisposalBulkApprovalBlockCode,
  summarizeDisposalBulkApproval,
  type DisposalBulkApprovalItem,
} from "../src/lib/disposal-bulk-approval.ts"

const candidate = {
  id: "request-1",
  disposalNo: "DP-20260713-0001",
  isActive: true,
  requestStatus: "pending",
  requestedById: "employee-requester",
  createdBy: "user-requester",
  asset: {
    assetTag: "IT-001",
    status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" },
  },
}

const actor = { userId: "user-approver", employeeId: "employee-approver" }

test("allows a pending request whose asset remains pending disposal", () => {
  assert.equal(getDisposalBulkApprovalBlockCode(candidate, actor, true), null)
})

test("blocks stale stage, SOD conflicts, and invalid asset lifecycle", () => {
  assert.equal(getDisposalBulkApprovalBlockCode({ ...candidate, requestStatus: "approved" }, actor, true), "DISPOSAL_INVALID_STAGE")
  assert.equal(getDisposalBulkApprovalBlockCode(candidate, { ...actor, employeeId: candidate.requestedById }, true), "DISPOSAL_SOD_CONFLICT")
  assert.equal(getDisposalBulkApprovalBlockCode({ ...candidate, asset: { ...candidate.asset, status: { name: "Ready" } } }, actor, true), "DISPOSAL_ASSET_INELIGIBLE")
})

test("summarizes preview and commit outcomes without hiding blocked items", () => {
  const items: DisposalBulkApprovalItem[] = [
    { requestId: "1", disposalNo: "DP-1", assetTag: "IT-1", outcome: "approved", code: null },
    { requestId: "2", disposalNo: "DP-2", assetTag: "IT-2", outcome: "blocked", code: "DISPOSAL_SOD_CONFLICT" },
    { requestId: "3", disposalNo: "DP-3", assetTag: "IT-3", outcome: "failed", code: "DISPOSAL_APPROVAL_FAILED" },
  ]
  assert.deepEqual(summarizeDisposalBulkApproval(items), {
    selected: 3,
    eligible: 0,
    blocked: 1,
    approved: 1,
    failed: 1,
  })
})
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `node --test tests/disposal-bulk-approval.test.ts`

Expected: FAIL because `src/lib/disposal-bulk-approval.ts` does not exist.

- [ ] **Step 3: Implement stable contracts and the pure evaluator**

Create `src/lib/disposal-bulk-approval.ts` with this public shape:

```ts
import {
  getDisposalApprovalAssetStatusError,
  getDisposalSegregationError,
  type DisposalLifecycleStatus,
} from "./disposal-policy.ts"

export const disposalBulkApprovalCodes = [
  "DISPOSAL_REQUEST_NOT_FOUND",
  "DISPOSAL_INVALID_STAGE",
  "DISPOSAL_SOD_CONFLICT",
  "DISPOSAL_ASSET_INELIGIBLE",
  "DISPOSAL_CONCURRENT_UPDATE",
  "DISPOSAL_APPROVAL_FAILED",
] as const

export type DisposalBulkApprovalCode = (typeof disposalBulkApprovalCodes)[number]
export type DisposalBulkApprovalOutcome = "eligible" | "blocked" | "approved" | "failed"
export type DisposalBulkApprovalActor = { userId: string; employeeId?: string | null }
export type DisposalBulkApprovalCandidate = {
  id: string
  disposalNo: string
  isActive: boolean
  requestStatus: string
  requestedById: string
  createdBy: string
  asset: { assetTag: string; status: DisposalLifecycleStatus | null }
}
export type DisposalBulkApprovalItem = {
  requestId: string
  disposalNo: string
  assetTag: string
  outcome: DisposalBulkApprovalOutcome
  code: DisposalBulkApprovalCode | null
}
export type DisposalBulkApprovalSummary = {
  selected: number
  eligible: number
  blocked: number
  approved: number
  failed: number
}

export function getDisposalBulkApprovalBlockCode(
  candidate: DisposalBulkApprovalCandidate,
  actor: DisposalBulkApprovalActor,
  segregationRequired: boolean,
): DisposalBulkApprovalCode | null {
  if (!candidate.isActive) return "DISPOSAL_REQUEST_NOT_FOUND"
  if (candidate.requestStatus !== "pending") return "DISPOSAL_INVALID_STAGE"
  if (getDisposalSegregationError({
    action: "approve",
    segregationRequired,
    actorEmployeeId: actor.employeeId,
    actorUserId: actor.userId,
    requestedById: candidate.requestedById,
    createdByUserId: candidate.createdBy,
  })) return "DISPOSAL_SOD_CONFLICT"
  if (getDisposalApprovalAssetStatusError(candidate.asset.status)) return "DISPOSAL_ASSET_INELIGIBLE"
  return null
}

export function summarizeDisposalBulkApproval(items: DisposalBulkApprovalItem[]): DisposalBulkApprovalSummary {
  return items.reduce((summary, item) => {
    summary.selected += 1
    summary[item.outcome] += 1
    return summary
  }, { selected: 0, eligible: 0, blocked: 0, approved: 0, failed: 0 })
}
```

- [ ] **Step 4: Write failing validation tests**

Append to `tests/disposal-validation.test.ts`:

```ts
import { disposalBulkDecisionSchema } from "../src/lib/validations/disposal.ts"

test("accepts preview and commit bulk approval packets", () => {
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: ["11111111-1111-4111-8111-111111111111"] }).success, true)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "commit", requestIds: ["11111111-1111-4111-8111-111111111111"], approvalRemark: "Reviewed together" }).success, true)
})

test("rejects empty, duplicate, oversized, and malformed bulk approval IDs", () => {
  const id = "11111111-1111-4111-8111-111111111111"
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: [] }).success, false)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: [id, id] }).success, false)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: Array.from({ length: 51 }, (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`) }).success, false)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: ["not-a-uuid"] }).success, false)
})
```

- [ ] **Step 5: Implement the discriminated validation schema**

Add to `src/lib/validations/disposal.ts`:

```ts
const disposalBulkRequestIds = z.array(z.string().uuid()).min(1).max(50)

export const disposalBulkDecisionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("preview"), requestIds: disposalBulkRequestIds }).strict(),
  z.object({
    mode: z.literal("commit"),
    requestIds: disposalBulkRequestIds,
    approvalRemark: z.string().trim().max(4000).transform((value) => value || null).nullable().optional(),
  }).strict(),
]).superRefine((input, context) => {
  if (new Set(input.requestIds).size !== input.requestIds.length) {
    context.addIssue({ code: "custom", path: ["requestIds"], message: "Disposal request IDs must be unique" })
  }
})

export type DisposalBulkDecisionInput = z.infer<typeof disposalBulkDecisionSchema>
```

- [ ] **Step 6: Run focused tests**

Run: `node --test tests/disposal-bulk-approval.test.ts tests/disposal-validation.test.ts tests/disposal-policy.test.ts`

Expected: PASS with no failed tests.

- [ ] **Step 7: Commit the domain contract**

```bash
git add src/lib/disposal-bulk-approval.ts src/lib/validations/disposal.ts tests/disposal-bulk-approval.test.ts tests/disposal-validation.test.ts
git commit -m "feat: define disposal bulk approval contract"
```

---

### Task 2: Transactional Shared Approval Service

**Files:**
- Create: `src/lib/disposal-approval-service.ts`
- Modify: `src/lib/audit-log.ts`
- Modify: `src/app/api/disposal-requests/[id]/route.ts`
- Modify: `tests/disposal-route-structure.test.ts`
- Modify: `tests/disposal-bulk-approval.test.ts`

**Interfaces:**
- Consumes: `DisposalBulkApprovalActor`, `DisposalBulkApprovalItem`, `getDisposalBulkApprovalBlockCode()` from Task 1.
- Produces: `inspectDisposalApprovalRequests()` and `approveDisposalRequest()` for Task 3.

- [ ] **Step 1: Write failing service-structure tests**

Append tests that assert the shared mutation is not duplicated:

```ts
import { readFileSync } from "node:fs"

test("single and bulk approval share one transactional approval service", () => {
  const service = readFileSync("src/lib/disposal-approval-service.ts", "utf8")
  const singleRoute = readFileSync("src/app/api/disposal-requests/[id]/route.ts", "utf8")
  assert.match(service, /tx\.disposalRequest\.updateMany/)
  assert.match(service, /requestStatus:\s*"pending"/)
  assert.match(service, /tx\.assetMovement\.create/)
  assert.match(service, /writeAuditLog\(tx/)
  assert.match(service, /deriveDisposalBatchStatus/)
  assert.match(singleRoute, /approveDisposalRequest\(/)
})
```

- [ ] **Step 2: Run the structure test and verify it fails**

Run: `node --test tests/disposal-route-structure.test.ts tests/disposal-bulk-approval.test.ts`

Expected: FAIL because the shared service and transaction audit writer do not exist.

- [ ] **Step 3: Add a transaction-aware audit writer**

Modify `src/lib/audit-log.ts` without changing callers of `logAudit()`:

```ts
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

export type AuditLogParams = {
  userId?: string
  action: string
  module: string
  recordId?: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string
  userAgent?: string
  remark?: string
}

export async function writeAuditLog(db: Pick<Prisma.TransactionClient, "systemLog">, params: AuditLogParams) {
  return db.systemLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      module: params.module,
      recordId: params.recordId,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      remark: params.remark,
    },
  })
}

export async function logAudit(params: AuditLogParams) {
  try {
    await writeAuditLog(prisma, params)
  } catch (error) {
    console.error("Failed to write audit log:", error)
  }
}
```

- [ ] **Step 4: Implement candidate inspection and one-item approval**

Create `src/lib/disposal-approval-service.ts` with these exact exports:

```ts
export type DisposalApprovalCommand = {
  requestId: string
  actor: DisposalBulkApprovalActor
  segregationRequired: boolean
  approvalRemark?: string | null
  saleValue?: number | null
  salvageValue?: number | null
}

export class DisposalApprovalServiceError extends Error {
  constructor(
    public readonly code: DisposalBulkApprovalCode,
    public readonly item: { requestId: string; disposalNo: string; assetTag: string },
  ) {
    super(code)
    this.name = "DisposalApprovalServiceError"
  }
}

async function loadApprovedRequest(tx: Prisma.TransactionClient, requestId: string) {
  return tx.disposalRequest.findUniqueOrThrow({
    where: { id: requestId },
    omit: { batchId: true },
  })
}

export async function inspectDisposalApprovalRequests(input: {
  requestIds: string[]
  actor: DisposalBulkApprovalActor
  segregationRequired: boolean
}): Promise<DisposalBulkApprovalItem[]>

export async function approveDisposalRequest(command: DisposalApprovalCommand): Promise<{
  request: Awaited<ReturnType<typeof loadApprovedRequest>>
  batchId: string | null
  assetTag: string
}>
```

Implementation requirements:

```ts
const update = await tx.disposalRequest.updateMany({
  where: { id: candidate.id, isActive: true, requestStatus: "pending" },
  data: {
    requestStatus: "approved",
    approvalRemark: command.approvalRemark ?? null,
    approverId: command.actor.employeeId ?? candidate.approverId,
    approvedAt,
    updatedBy: command.actor.userId,
    ...(command.saleValue !== undefined ? { saleValue: command.saleValue } : {}),
    ...(command.salvageValue !== undefined ? { salvageValue: command.salvageValue } : {}),
  },
})
if (update.count !== 1) {
  throw new DisposalApprovalServiceError("DISPOSAL_CONCURRENT_UPDATE", {
    requestId: candidate.id,
    disposalNo: candidate.disposalNo,
    assetTag: candidate.asset.assetTag,
  })
}
```

Within the same `prisma.$transaction`:

1. Create `assetMovement` with `movementType: "disposal_approve"`, unchanged asset status IDs, the shared/item remark fallback, and `referenceId` equal to the request ID.
2. Call `writeAuditLog(tx, ...)` with old/new request status and financial values.
3. If `batchId` exists, load active child statuses and update the parent using `deriveDisposalBatchStatus()`.
4. Load and return the updated request.

Before opening the transaction, re-read the request and call `getDisposalBulkApprovalBlockCode()`. Every `DisposalApprovalServiceError` carries request display metadata; a missing record uses the request ID as `disposalNo` and `"-"` as `assetTag`. Do not catch database errors as success.

`inspectDisposalApprovalRequests()` must use one `findMany` query, restore input order with a `Map`, and produce a blocked item for every missing ID.

- [ ] **Step 5: Delegate the existing approve branch to the service**

In `src/app/api/disposal-requests/[id]/route.ts`, keep execution and rejection logic unchanged. For `input.decision === "approve"`:

```ts
const result = await approveDisposalRequest({
  requestId: id,
  actor: { userId: user.id, employeeId: user.employeeId },
  segregationRequired: workflowPolicy.segregationRequired,
  approvalRemark: input.approvalRemark,
  saleValue: input.saleValue,
  salvageValue: input.salvageValue,
})
return NextResponse.json(result.request)
```

Map `DisposalApprovalServiceError.code` through `disposalApiError()` with `409` for `DISPOSAL_CONCURRENT_UPDATE`, `403` for `DISPOSAL_SOD_CONFLICT`, `404` for `DISPOSAL_REQUEST_NOT_FOUND`, and `400` for lifecycle/stage failures.

- [ ] **Step 6: Run focused tests and type checking**

Run: `node --test tests/disposal-policy.test.ts tests/disposal-route-structure.test.ts tests/disposal-bulk-approval.test.ts`

Run: `npx tsc --noEmit`

Expected: both commands PASS.

- [ ] **Step 7: Commit the shared service**

```bash
git add src/lib/audit-log.ts src/lib/disposal-approval-service.ts src/app/api/disposal-requests/[id]/route.ts tests/disposal-route-structure.test.ts tests/disposal-bulk-approval.test.ts
git commit -m "refactor: share transactional disposal approval"
```

---

### Task 3: Bulk Preview And Commit Route

**Files:**
- Create: `src/app/api/disposal-requests/bulk-decision/route.ts`
- Modify: `src/lib/disposal-api-errors.ts`
- Modify: `src/lib/disposal-error-message.ts`
- Modify: `src/lib/rbac-route-matrix.ts`
- Modify: `tests/disposal-route-structure.test.ts`
- Modify: `tests/disposal-bulk-approval.test.ts`

**Interfaces:**
- Consumes: `disposalBulkDecisionSchema`, `inspectDisposalApprovalRequests()`, `approveDisposalRequest()`, `summarizeDisposalBulkApproval()`.
- Produces: `POST /api/disposal-requests/bulk-decision` returning `{ summary, items }`.

- [ ] **Step 1: Write failing route and RBAC inventory tests**

Add assertions:

```ts
test("bulk approval route guards permission and revalidates each request", () => {
  const source = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")
  const matrix = readFileSync("src/lib/rbac-route-matrix.ts", "utf8")
  assert.match(source, /requireAuth\(\)/)
  assert.match(source, /requirePermission\(user, "disposal", "approve"\)/)
  assert.match(source, /disposalBulkDecisionSchema\.parse/)
  assert.match(source, /inspectDisposalApprovalRequests/)
  assert.match(source, /for \(const requestId of input\.requestIds\)/)
  assert.match(source, /approveDisposalRequest/)
  assert.match(matrix, /disposal-requests\/bulk-decision\/route\.ts/)
})
```

- [ ] **Step 2: Run and verify the test fails**

Run: `node --test tests/disposal-route-structure.test.ts tests/disposal-bulk-approval.test.ts`

Expected: FAIL because the route is absent.

- [ ] **Step 3: Implement the non-cached POST route**

Create `src/app/api/disposal-requests/bulk-decision/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { prisma } from "@/lib/db"
import { approveDisposalRequest, DisposalApprovalServiceError, inspectDisposalApprovalRequests } from "@/lib/disposal-approval-service"
import { summarizeDisposalBulkApproval, type DisposalBulkApprovalItem } from "@/lib/disposal-bulk-approval"
import { disposalBulkDecisionSchema } from "@/lib/validations/disposal"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "approve")
    const input = disposalBulkDecisionSchema.parse(await request.json())
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    })
    const segregationRequired = parseWorkflowApprovalPolicy(settings).segregationRequired
    const actor = { userId: user.id, employeeId: user.employeeId }

    const inspected = await inspectDisposalApprovalRequests({ requestIds: input.requestIds, actor, segregationRequired })
    if (input.mode === "preview") return NextResponse.json({ summary: summarizeDisposalBulkApproval(inspected), items: inspected })

    const items: DisposalBulkApprovalItem[] = []
    const inspectedById = new Map(inspected.map((item) => [item.requestId, item]))
    for (const requestId of input.requestIds) {
      const previewItem = inspectedById.get(requestId)!
      if (previewItem.outcome === "blocked") {
        items.push(previewItem)
        continue
      }
      try {
        const result = await approveDisposalRequest({
          requestId,
          actor,
          segregationRequired,
          approvalRemark: input.approvalRemark,
        })
        items.push({ requestId, disposalNo: result.request.disposalNo, assetTag: result.assetTag, outcome: "approved", code: null })
      } catch (error) {
        const code = error instanceof DisposalApprovalServiceError ? error.code : "DISPOSAL_APPROVAL_FAILED"
        const display = error instanceof DisposalApprovalServiceError ? error.item : previewItem
        items.push({ requestId, disposalNo: display.disposalNo, assetTag: display.assetTag, outcome: code === "DISPOSAL_APPROVAL_FAILED" ? "failed" : "blocked", code })
      }
    }
    return NextResponse.json({ summary: summarizeDisposalBulkApproval(items), items })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
```

- [ ] **Step 4: Register stable errors and RBAC classification**

Add `DISPOSAL_CONCURRENT_UPDATE` and `DISPOSAL_APPROVAL_FAILED` to `disposalApiErrorCodes` and the localized set. Add this matrix entry:

```ts
{
  filePath: "src/app/api/disposal-requests/bulk-decision/route.ts",
  label: "Disposal bulk approval",
  checks: [{ module: "disposal", action: "approve" }],
},
```

- [ ] **Step 5: Run route, RBAC, and type tests**

Run: `node --test tests/disposal-bulk-approval.test.ts tests/disposal-route-structure.test.ts tests/rbac-route-matrix.test.ts`

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit the API route**

```bash
git add src/app/api/disposal-requests/bulk-decision/route.ts src/lib/disposal-api-errors.ts src/lib/disposal-error-message.ts src/lib/rbac-route-matrix.ts tests/disposal-route-structure.test.ts tests/disposal-bulk-approval.test.ts
git commit -m "feat: add disposal bulk approval API"
```

---

### Task 4: Client Selection And Preflight Workspace

**Files:**
- Create: `src/components/disposal/disposal-bulk-approval.tsx`
- Modify: `tests/disposal-bulk-approval.test.ts`

**Interfaces:**
- Consumes: the Task 3 `{ summary, items }` response and `DisposalBulkApprovalCode` types.
- Produces: `DisposalBulkApprovalProvider`, `DisposalBulkSelectionToggle`, `DisposalBulkApprovalToolbar`, and `DisposalBulkApprovalCheckbox` for Task 5.

- [ ] **Step 1: Write failing component-contract tests**

```ts
test("bulk approval UI keeps selection page-scoped and uses server preflight", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8")
  assert.match(source, /export function DisposalBulkApprovalProvider/)
  assert.match(source, /export function DisposalBulkSelectionToggle/)
  assert.match(source, /export function DisposalBulkApprovalToolbar/)
  assert.match(source, /export function DisposalBulkApprovalCheckbox/)
  assert.match(source, /mode:\s*"preview"/)
  assert.match(source, /mode:\s*"commit"/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /MAX_DISPOSAL_BULK_APPROVAL_ITEMS/)
  assert.doesNotMatch(source, /fixed\s+bottom-0/)
})
```

- [ ] **Step 2: Run and verify the test fails**

Run: `node --test tests/disposal-bulk-approval.test.ts`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the selection context**

Create a client component with these props and exports:

```ts
export type DisposalBulkSelectableItem = {
  requestId: string
  disposalNo: string
  assetTag: string
  selectable: boolean
  blockedCode: DisposalBulkApprovalCode | null
}

export function DisposalBulkApprovalProvider({
  items,
  selectionKey,
  children,
}: {
  items: DisposalBulkSelectableItem[]
  selectionKey: string
  children: React.ReactNode
})

export function DisposalBulkSelectionToggle()

export function DisposalBulkApprovalToolbar()

export function DisposalBulkApprovalCheckbox({
  requestId,
  variant,
}: {
  requestId: string
  variant: "desktop" | "mobile"
})
```

Provider state:

```ts
const [selected, setSelected] = useState<Set<string>>(new Set())
const [dialogState, setDialogState] = useState<"closed" | "previewing" | "preview" | "committing" | "result">("closed")
const [approvalRemark, setApprovalRemark] = useState("")
const [response, setResponse] = useState<DisposalBulkApprovalResponse | null>(null)
const [mobileSelectionMode, setMobileSelectionMode] = useState(false)
const MAX_DISPOSAL_BULK_APPROVAL_ITEMS = 50

useEffect(() => {
  setSelected(new Set())
  setDialogState("closed")
  setResponse(null)
  setMobileSelectionMode(false)
}, [selectionKey])
```

The provider owns `preview()` and `commit()` fetch calls. `preview()` sends all selected IDs. `commit()` sends only IDs whose preview outcome is `eligible`, and the server still revalidates them. After commit:

```ts
const unresolved = payload.items
  .filter((item) => item.outcome === "blocked" || item.outcome === "failed")
  .map((item) => item.requestId)
setSelected(new Set(unresolved))
```

Call `router.refresh()` only after a commit with at least one approved item. Disable close and submission while a request is active.

Selection enforcement is client-visible as well as server-authoritative: an unchecked control becomes disabled when 50 items are selected, while selected controls remain enabled so users can remove them. `Select page` takes only the first 50 selectable items in queue order and shows localized `bulkSelectionLimit` copy instead of submitting an oversized packet.

The provider root uses `onClickCapture` for links and `onSubmitCapture` for filter forms. When selection is non-empty, confirm with localized `bulkDiscardSelection`; cancel prevents navigation/submission, while confirm clears selection and allows it. Do not show this confirmation after a successful commit refresh.

- [ ] **Step 4: Implement adaptive controls and dialog behavior**

Toolbar requirements:

- return `null` when `selected.size === 0`;
- show selected count, Select page, Clear, and `ตรวจสอบและอนุมัติ`;
- remain in normal document flow with `md:flex` responsive layout;
- include `<span className="sr-only" aria-live="polite">...</span>`.

`DisposalBulkSelectionToggle` is mobile-only. It enters selection mode with `เลือกหลายรายการ`, changes to `ยกเลิกการเลือก`, and exits only after clearing the current selection. Desktop keeps its checkbox column visible. `DisposalBulkApprovalCheckbox` returns `null` for the mobile variant until mobile selection mode is active.

Checkbox requirements:

```tsx
<input
  type="checkbox"
  checked={selected.has(item.requestId)}
  disabled={!item.selectable || busy}
  onChange={() => toggle(item.requestId)}
  aria-label={t("bulkSelectItem", { disposalNo: item.disposalNo, assetTag: item.assetTag })}
  title={item.blockedCode ? t(`bulkErrors.${item.blockedCode}`) : undefined}
  className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
/>
```

Dialog requirements:

- reuse the existing focus trap, Escape, backdrop, focus restore, and `92dvh` sheet/dialog layout from disposal decision dialogs;
- show selected/eligible/blocked totals during preview;
- group blocked items by translated code in expandable `<details>` sections;
- provide one `maxLength={4000}` optional approval remark;
- disable confirm when `eligible === 0`;
- show approved/blocked/failed totals and item details after commit;
- use Lucide `CheckSquare2`, `ListChecks`, `ShieldAlert`, `Loader2`, and `X` as applicable;
- never rely on color alone.

- [ ] **Step 5: Run component tests and type checking**

Run: `node --test tests/disposal-bulk-approval.test.ts`

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit the client workspace**

```bash
git add src/components/disposal/disposal-bulk-approval.tsx tests/disposal-bulk-approval.test.ts
git commit -m "feat: add disposal bulk approval workspace"
```

---

### Task 5: Queue Integration And Localized UX

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/disposal-queue-ux.test.ts`
- Modify: `tests/disposal-bulk-approval.test.ts`

**Interfaces:**
- Consumes: Task 4 provider, toolbar, checkbox, and the Task 1 eligibility evaluator.
- Produces: selectable desktop rows and mobile cards without changing existing per-item actions.

- [ ] **Step 1: Write failing queue integration and locale tests**

Add assertions:

```ts
test("disposal queue exposes bulk approval only through the approval workspace", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/disposal/page.tsx", "utf8")
  assert.match(page, /<DisposalBulkApprovalProvider/)
  assert.match(page, /<DisposalBulkApprovalToolbar/)
  assert.match(page, /<DisposalBulkApprovalCheckbox/)
  assert.match(page, /canApprove/)
  assert.match(page, /asset:\s*\{\s*select:.*status:/s)
})

test("bulk approval copy exists in Thai and English", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    for (const key of ["bulkSelectedCount", "bulkReviewAndApprove", "bulkPreviewTitle", "bulkResultTitle", "bulkSelectPage", "bulkClearSelection"]) {
      assert.equal(typeof messages[key], "string", `${locale}:${key}`)
    }
    assert.equal(typeof messages.bulkErrors.DISPOSAL_SOD_CONFLICT, "string")
    assert.equal(typeof messages.bulkErrors.DISPOSAL_CONCURRENT_UPDATE, "string")
  }
})
```

- [ ] **Step 2: Run and verify integration tests fail**

Run: `node --test tests/disposal-queue-ux.test.ts tests/disposal-bulk-approval.test.ts`

Expected: FAIL because the page and locale messages are not wired.

- [ ] **Step 3: Add server-side selection metadata**

Extend the existing asset select to include status:

```ts
asset: {
  select: {
    assetTag: true,
    name: true,
    status: { select: { name: true, nameTh: true } },
  },
},
```

Build serialized selection items only when `canApprove`:

```ts
const bulkItems = canApprove ? requests.map((request) => {
  const candidate = {
    id: request.id,
    disposalNo: request.disposalNo,
    isActive: request.isActive,
    requestStatus: request.requestStatus,
    requestedById: request.requestedById,
    createdBy: request.createdBy,
    asset: { assetTag: request.asset.assetTag, status: request.asset.status },
  }
  const blockedCode = getDisposalBulkApprovalBlockCode(
    candidate,
    { userId: user.id, employeeId: user.employeeId },
    workflowPolicy.segregationRequired,
  )
  return {
    requestId: request.id,
    disposalNo: request.disposalNo,
    assetTag: request.asset.assetTag,
    selectable: blockedCode === null,
    blockedCode,
  }
}) : []
```

Ensure the Prisma query selects `isActive`, `requestedById`, and `createdBy` if those fields are not already present in the inferred result.

- [ ] **Step 4: Wire provider, toolbar, cards, and table**

Wrap only the result section:

```tsx
<DisposalBulkApprovalProvider
  items={bulkItems}
  selectionKey={`${filters.page}:${filters.pageSize}:${query}`}
>
  <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
    {/* existing queue header */}
    {canApprove ? <DisposalBulkApprovalToolbar /> : null}
    {/* existing stage tabs, cards, table, pagination */}
  </section>
</DisposalBulkApprovalProvider>
```

Mobile card placement:

```tsx
{canApprove ? (
  <div className="flex min-h-11 items-center justify-end" data-no-row-click>
    <DisposalBulkApprovalCheckbox requestId={request.id} variant="mobile" />
  </div>
) : null}
```

Desktop placement:

```tsx
{canApprove ? <th className="w-12 px-4 py-3"><span className="sr-only">{t("bulkSelection")}</span></th> : null}
```

```tsx
{canApprove ? <td className="w-12 px-4 py-3" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="desktop" /></td> : null}
```

Update empty-row `colSpan` to include the optional selection column. Keep `DisposalNextAction` intact so users can still review one request in depth.

- [ ] **Step 5: Add concise Thai and English copy**

Under `disposalPage`, add matching keys for:

- selection mode and count;
- 50-item selection limit;
- Select page, Clear, Review and approve;
- preview loading/title/help and selected/eligible/blocked labels;
- optional shared remark and 4,000-character limit;
- exact confirmation count;
- committing/result titles;
- approved/blocked/failed labels;
- Retry, Close, and zero-eligible copy;
- every stable `bulkErrors` code from Task 1.

Thai terminology must use `คำขอตัดจำหน่าย`, `ตรวจสอบก่อนอนุมัติ`, `อนุมัติได้`, `ติดข้อจำกัด`, and `หมายเหตุร่วม`. English copy must distinguish `blocked` from `failed`.

- [ ] **Step 6: Run queue, locale, and type tests**

Run: `node --test tests/disposal-queue-ux.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-route-structure.test.ts`

Run: `node -e "for (const f of ['messages/th.json','messages/en.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('messages ok')"`

Run: `npx tsc --noEmit`

Expected: all commands PASS.

- [ ] **Step 7: Commit queue integration**

```bash
git add src/app/[locale]/\(dashboard\)/disposal/page.tsx src/components/disposal/disposal-bulk-approval.tsx messages/th.json messages/en.json tests/disposal-queue-ux.test.ts tests/disposal-bulk-approval.test.ts
git commit -m "feat: add disposal queue bulk approval UX"
```

---

### Task 6: Operational Documentation And End-To-End Verification

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`

**Interfaces:**
- Consumes: completed bulk approval behavior from Tasks 1-5.
- Produces: production-facing workflow documentation and a verified release candidate.

- [ ] **Step 1: Document the final workflow contract**

Add these points to the existing Disposal sections:

```md
- Approvers may select up to 50 pending requests from the current queue page.
- Server preflight separates eligible and blocked requests before confirmation.
- Bulk approval preserves item-specific financial and evidence data and accepts only one optional shared remark.
- Commit revalidates every item; successful items remain committed when another item is blocked or fails.
- Every approved item keeps its own approver, timestamp, movement, audit log, and derived parent batch status.
- Bulk rejection and bulk execution are intentionally unavailable.
```

- [ ] **Step 2: Add role-based UAT cases**

Add explicit cases to `docs/07_UAT_CHECKLIST.md`:

```md
- [ ] Approver selects pending requests from independent and batch sources on one page.
- [ ] Select page includes only selectable pending requests and never crosses pagination.
- [ ] Preview shows eligible and SOD-blocked items with reasons before mutation.
- [ ] Approver confirms eligible items while blocked items remain unchanged.
- [ ] A request approved by another user after preview is skipped during commit without duplicate movement/audit records.
- [ ] Shared remark appears only on successfully approved requests; sale/salvage values remain unchanged.
- [ ] Mobile selection controls do not overlap Mobile Field Navigation at 375px, 390px, and 414px.
- [ ] Keyboard focus enters, remains inside, and returns from the bulk dialog.
- [ ] Users without disposal:approve cannot see controls and receive 403 from the bulk endpoint.
```

- [ ] **Step 3: Run focused and full automated verification**

Run:

```bash
node --test tests/disposal-bulk-approval.test.ts tests/disposal-validation.test.ts tests/disposal-policy.test.ts tests/disposal-route-structure.test.ts tests/disposal-queue-ux.test.ts
npm test
npm run verify
npm run build
```

Expected: focused tests PASS, full suite reports zero failures, verify completes successfully, and the production build lists `/[locale]/disposal` plus `/api/disposal-requests/bulk-decision` without errors.

- [ ] **Step 4: Perform authenticated browser QA**

At `http://localhost:3000/th/disposal`:

1. Desktop 1440x900: select mixed pending requests, open preview, inspect grouped blockers, commit eligible items, and confirm queue counts refresh without horizontal body overflow.
2. Mobile 390x844: enter selection mode, select cards, open the full-height sheet, verify 44px targets and no collision with Mobile Field Navigation.
3. Keyboard: Tab through checkbox, toolbar, dialog, expandable reasons, remark, and confirm; press Escape and verify focus restoration.
4. Console: confirm zero errors and zero missing-message warnings.
5. Concurrency: open the same pending request in a second session, approve it after the first session previews, then confirm the first session reports it as blocked/skipped during commit.

- [ ] **Step 5: Review the final diff and commit documentation**

```bash
git diff --check
git status --short
git add DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md
git commit -m "docs: document disposal bulk approval"
```

Do not stage unrelated `.agents`, `.gemini`, `.codex`, `.impeccable`, or other pre-existing worktree changes.
