# Page Group 2 (Audit) Plan 4: The Findings Page and the Export Codes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the findings page (AU-Findings) to the approved group 2 design — six tabs with counts, a two-pane table and review panel with `?finding=`, a required reject reason enforced by the API, a desktop selection bar whose batch reports successes and failures, Thai field-name search, and "ส่วนควบของ <parent>" — and put words instead of raw codes in every audit export.

**Architecture:** The review route stays the one place a decision happens; it gains a discriminated schema (reject needs a reason) and a claim inside its transaction so a decision applies once (Task 1). Pure rules own the tabs, the where, the panel's consequence sentence and the batch classifier; a server module loads the page in one go (Task 2). The UI tasks (3-5) render those rules; the batch is a client loop over the single route. The exports translate codes by the request's locale (Task 6). No schema change and no migration.

**Tech Stack:** Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next code), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, Tailwind 4 tokens, shadcn/Radix parts, ExcelJS/PDF export helpers, `node --test`, Playwright E2E (4 projects; the phone on WebKit).

**Spec:** `docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md` (§5, §10, §13 bugs 17-19, §15 findings calls, §16 findings items, Appendix A §10; decision 5). Plans 1-3 (merged, master `704f2b26`) and their rulings stand unless one here replaces it.

**Base:** master `704f2b26`. **Branch:** `feat/group2-audit-findings`. **Dry run:** none (no migration; the audit E2E reviews findings on both sizes).

**Execution:** subagent-driven. Implementers are the `opus-medium-implementer` agent type; the main session reviews each task itself. Tasks run in order 1 → 7; line numbers are master's, and a task names each block by content where an earlier task moved it.

**E2E (the user's cadence):** after Task 7, the targeted set `e2e/audit e2e/smoke e2e/dashboard e2e/cross-cutting/roles.spec.ts e2e/cross-cutting/reports.spec.ts` from a clean build; then the WHOLE suite once, which closes page group 2.

## Global Constraints

- Words follow `docs/19_THAI_GLOSSARY.md` ("รายการไม่ตรง", "ไม่ตรง", "พบตรง", "ผู้พิจารณา", "หมวดหมู่"). Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together; change files live in the session scratchpad. No raw code reaches the screen.
- Shared parts and tokens only (DESIGN.md): no hex or rgba in tsx, no `dark:`, no `/NN` tints; both themes. A new shared part gets its DESIGN.md section, its docs/14 row and its place in the shared-name guards.
- Permissions: `audit:view` reads; reviewing, planning and closing need `audit:approve` (the route's rule); nobody reviews their own finding (API 403; the UI offers no control and says why); the reject reason is required, single and batch, in the API.
- **One decision per finding:** a second press, a second tab or a batch never applies a finding twice.
- **Counts equal lists** for every tab and sub-chip, within the other filters (round, type, search).
- Exports: no raw code in a cell or a label; headers and sheet names stay English (E2E and users' sheets read them).
- SQL Server takes about 2,100 parameters: id lists that grow are chunked or bounded.
- No schema change and no migration. Pure rules files use relative `.ts` imports and `import type` only.
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` before its commit. A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Secrets: never read or print `.env`, `.env.prod-admin` or `.env.e2e`. Nothing writes to Production; E2E runs on the dev DB only and never runs LDAP sync, the settings save, Excel import, a failed login or a delete.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Two decisions at once** (a double press, the panel and a batch, two reviewers): a finding is decided once and the second answers "already decided"; the register changes once. Task 1's route test and the classifier pin it.
2. **A batch with failures in it** (a 409, an already-decided finding, the viewer's own finding, a missing reason): every other finding is still decided, the bar reports each failure with its reason, the page refreshes and the selection clears. Task 5's batch tests and Task 7's E2E step pin it.
3. **Links from other pages** (the bell's `pending` / `action_not_due` / `action_due_soon`, the dashboard, the round page's step 2 and "แผนแก้ไขค้าง", a shared `?finding=` link off the current page): each lands on its tab and sub-chip with the same count, and the panel opens the finding wherever it is. Task 2's parse tests and Task 7 pin it.
4. **The panel's next finding** when the decided one was the last on the page, or the viewer cannot decide the next one: it moves to the next finding the viewer may decide, never skips one, and says the tab is done when none is left (P4-R18). Task 2 computes and pins it on the server; Task 4's panel only follows its link.
5. **A Thai search on the exports** (a room or a field name in Thai): every export downloads (no 500 from the file name) and every cell reads words. Task 6 pins it.

---

### Task 1: The review API: reject needs a reason, one decision per finding, and a batch result classifier

The review route (`src/app/api/audit-findings/[id]/review/route.ts`) is the only writer of a finding's decision, so it holds three rules:

1. **Reject needs a reason** (decision 5, spec §2 and §10's reason rule, P4-R5). The review schema becomes a discriminated union on `action`. Reject's `reviewRemark` is required (trimmed, 1-4000). Approve's stays optional, now capped at 4000 like the client (`audit-finding-review-actions.tsx:69`). A missing, `null` or blank reason answers 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } }` through today's `errorResponse` (`src/lib/api-response.ts:7-8`, `src/lib/field-errors.ts:53-61`). The batch is a loop over this one route (P4-R4), so the same schema enforces the shared reason for every finding of a batch.
2. **One decision per finding** (P4-R6). Today the pending check (`:114-116`) runs before the transaction and the final write (`:247-256`) is an unconditional `update`. Two presses, two tabs, or the panel beside a batch can both pass the check, both update the master and both write a movement. The transaction now opens with a claim: `updateMany({ where: { id, reviewStatus: "pending" } })`. It throws the catalogued "Audit finding has already been reviewed" unless exactly one row was claimed. It runs before every branch: out-of-scope, not-found, the exception branch and the field update. The pre-check at `:114` stays, so every check keeps its order and answer: 404, read-only round 400, schema 400, already decided 400, own finding 403, conflict 409. Under SQL Server the second claim waits on the first transaction's row lock. It then reads the committed status and claims nothing.
3. **A pure classifier for the batch** (P4-R4). It turns each response into `{ ok: true }` or one of seven reasons, keyed by status plus the catalogued error key or code. It never matches English text in a component (RA §6). It also folds a batch's results into `{ succeeded, failed }`. Task 4 (the panel's 409) and Task 5 (the bar) read it.

No page, component, message or E2E step changes in this task.

**Files:**
- Modify: `src/lib/validations/audit.ts:72-76` (the review schema becomes a discriminated union).
- Modify: `src/app/api/audit-findings/[id]/review/route.ts`:
  - before `:146`: one `reviewedAt` for the claim and the decision;
  - after `:146` (`const reviewedFinding = await prisma.$transaction(async (tx) => {`): the claim;
  - `:154`, `:169`, `:186`, `:252`: each `reviewedAt: new Date()` becomes `reviewedAt`.
- Create: `src/lib/audit-finding-review-results.ts` (pure, client-safe: relative `.ts` imports only).
- Test:
  - `tests/audit-finding-review-results.test.ts` (new, by value: the schema, the classifier, the fold);
  - `tests/audit-finding-review-route.test.ts` (new). It imports the route behind module mocks, with the harness of `tests/audit-scan-edit-findings.test.ts:1-97`.

**Interfaces:**
- Consumes:
  - `issuesToFieldErrors(issues, keyFor?)` (`src/lib/field-errors.ts:81-91`);
  - `getApiErrorKey(raw: string): string | null` (`src/lib/api-error-catalog.ts:284-286`; catalog keys `findingAlreadyDecided` :51, `findingReviewerIsReporter` :52, `findingNotFound` :53, `auditRoundCancelled` :55, `auditRoundClosed` :56);
  - `AUDIT_FINDING_CONFLICT_CODE = "asset_updated_after_finding"` (`src/lib/audit-finding-conflict.ts:1`; no imports, client-safe);
  - `errorResponse(error, 400)` (`src/lib/api-response.ts:6-24`). A plain `Error` keeps its message and the fallback status 400.
- Produces, in `src/lib/validations/audit.ts`:
  - `auditFindingReviewSchema`: a `z.discriminatedUnion("action", [approve, reject])`. Its output type is `{ action: "approve"; reviewRemark?: string | null; confirmConflict: boolean } | { action: "reject"; reviewRemark: string; confirmConflict: boolean }`. `AuditFindingReviewInput` (`:103`) keeps its name.
  - Answers, probed against the repo's zod 4.4.1:

    | Body | Result | fieldErrors |
    |---|---|---|
    | `{ action: "reject" }`, `{ action: "reject", reviewRemark: null }` | `invalid_type` at `reviewRemark` | `{ reviewRemark: "required" }` |
    | `{ action: "reject", reviewRemark: "   " }` | `too_small`, string, minimum 1 | `{ reviewRemark: "required" }` |
    | `{ action: "reject", reviewRemark: "  ซ้ำ  " }` | OK, `reviewRemark: "ซ้ำ"` | none |
    | reject or approve with 4,001 characters | `too_big` | `{ reviewRemark: "tooLong" }` |
    | `{ action: "approve" }` / `reviewRemark: ""` / `null` | OK; `undefined` / `null` / `null` | none |
    | `{}` | `invalid_union` at `action` | `{ action: "invalidChoice" }` (today `"required"`; no caller sends it) |
- Produces, in `src/lib/audit-finding-review-results.ts`:
  - `export const auditFindingReviewFailureReasons = ["assetChanged", "alreadyDecided", "ownFinding", "reasonRequired", "roundReadOnly", "notFound", "failed"] as const`
  - `export type AuditFindingReviewFailureReason = (typeof auditFindingReviewFailureReasons)[number]`
  - `export type AuditFindingReviewOutcome = { ok: true } | { ok: false; reason: AuditFindingReviewFailureReason }`
  - `export type AuditFindingBatchResult = { succeeded: string[]; failed: { id: string; reason: AuditFindingReviewFailureReason }[] }`
  - `classifyAuditFindingReviewResponse(status: number, body: unknown): AuditFindingReviewOutcome`:
    - 2xx → ok;
    - 409 with `code: "asset_updated_after_finding"` → `assetChanged`;
    - 400 `VALIDATION_FAILED` with `fieldErrors.reviewRemark === "required"` → `reasonRequired` (any other validation refusal → `failed`);
    - 400 `findingAlreadyDecided` → `alreadyDecided`;
    - 403 `findingReviewerIsReporter` → `ownFinding`;
    - 400 `auditRoundClosed` / `auditRoundCancelled` → `roundReadOnly`;
    - 404 `findingNotFound` → `notFound`;
    - anything else → `failed`: a 5xx "Unexpected error · ref …", a 401, a permission 403, a body that is not JSON, or a 409 with no conflict code.
  - `foldAuditFindingBatchResults(results: readonly { id: string; outcome: AuditFindingReviewOutcome }[]): AuditFindingBatchResult`, in input order. A network error is the caller's `{ ok: false, reason: "failed" }`.
- Produces, the route's answers. Each is unchanged except two:
  - reject without a reason gives the 400 above;
  - a decision that lost its claim gives 400 `{ error: "Audit finding has already been reviewed" }`, the pre-check's own body, so the client cannot tell the two apart and does not need to.
- For later tasks:
  - Task 4 (panel): send `{ action, reviewRemark, confirmConflict }`. On a 409 the classifier gives `assetChanged`. The panel then reads the body as `AuditFindingConflictPayload` (`audit-finding-conflict.ts:3-11`) for its warning, and the second press sends `confirmConflict: true`. A `reasonRequired` answer puts the error under the reason box. The client check comes first, so this is only a stale tab.
  - Task 5 (bar): loop the ids one by one. Call `classifyAuditFindingReviewResponse(response.status, await response.json().catch(() => null))`, and turn a thrown fetch into `{ ok: false, reason: "failed" }`. Fold the results, never send `confirmConflict`, and report from `succeeded.length` / `failed`. An `assetChanged` failure says to decide it in the panel.
  - The UI pins on today's review dialog and batch belong to the task that removes that UI (P4-R22), not to this one:
    - Task 4 (it removes the decision dialog): `tests/v-track2-u.test.ts:134-170` (the decision dialog's `validate` covers only maxLength), `tests/validation-guards.test.ts:34` (the review actions file's V_SCOPE row) and `:111` (its V_FORMS row), `tests/form-migration-guards.test.ts:94`, and the stale comment at `audit-finding-review-actions.tsx:299-300`, which says the server cannot refuse the remark.
    - Task 5 (it rewrites the batch): `tests/v-track2-u.test.ts:172-196` (the batch's `validate()` returns `{}`) and the stale comment at `audit-findings-batch-actions.tsx:20-22`. `tests/validation-guards.test.ts:35`, `:68` and `:112` hold there, because the batch file keeps its path and stays `ConfirmTextDialog`'s caller.
    - This task leaves the UI as it is, so none of these breaks here (P4-R22).

- [ ] **Step 1: Write the failing tests (pure)**

`tests/audit-finding-review-results.test.ts` (new):

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  classifyAuditFindingReviewResponse,
  foldAuditFindingBatchResults,
  type AuditFindingReviewOutcome,
} from "../src/lib/audit-finding-review-results.ts"
import { issuesToFieldErrors } from "../src/lib/field-errors.ts"
import { auditFindingReviewSchema } from "../src/lib/validations/audit.ts"

function refused(body: unknown) {
  const result = auditFindingReviewSchema.safeParse(body)
  if (result.success) assert.fail(`accepted ${JSON.stringify(body)}`)
  return issuesToFieldErrors(result.error.issues)
}

test("a reject needs a reason, trimmed, at most 4000; approving needs none (decision 5, P4-R5)", () => {
  for (const body of [{ action: "reject" }, { action: "reject", reviewRemark: null }, { action: "reject", reviewRemark: "   " }]) {
    assert.deepEqual(refused(body), { reviewRemark: "required" }, JSON.stringify(body))
  }
  assert.deepEqual(auditFindingReviewSchema.parse({ action: "reject", reviewRemark: "  ตรวจซ้ำแล้ว สภาพยังดี  " }), { action: "reject", reviewRemark: "ตรวจซ้ำแล้ว สภาพยังดี", confirmConflict: false })
  assert.deepEqual(refused({ action: "reject", reviewRemark: "x".repeat(4001) }), { reviewRemark: "tooLong" })
  const longest = auditFindingReviewSchema.parse({ action: "reject", reviewRemark: "x".repeat(4000) })
  assert.equal(longest.action === "reject" ? longest.reviewRemark.length : 0, 4000)

  assert.deepEqual(auditFindingReviewSchema.parse({ action: "approve" }), { action: "approve", confirmConflict: false })
  assert.deepEqual(auditFindingReviewSchema.parse({ action: "approve", reviewRemark: "" }), { action: "approve", reviewRemark: null, confirmConflict: false })
  assert.deepEqual(auditFindingReviewSchema.parse({ action: "approve", reviewRemark: null }), { action: "approve", reviewRemark: null, confirmConflict: false })
  assert.deepEqual(auditFindingReviewSchema.parse({ action: "approve", reviewRemark: " ย้ายตามที่พบ ", confirmConflict: true }), { action: "approve", reviewRemark: "ย้ายตามที่พบ", confirmConflict: true })
  assert.deepEqual(refused({ action: "approve", reviewRemark: "x".repeat(4001) }), { reviewRemark: "tooLong" }, "the client's cap, now the server's too")
  assert.deepEqual(refused({}), { action: "invalidChoice" })
  assert.deepEqual(refused({ action: "plan" }), { action: "invalidChoice" }, "the route branches out before it parses plan and close")
})

const answer = (status: number, body: unknown) => classifyAuditFindingReviewResponse(status, body)

test("each answer of the review route names one reason; anything else is failed (P4-R4, RA §6)", () => {
  assert.deepEqual(answer(200, { id: "finding-1", reviewStatus: "approved" }), { ok: true })
  assert.deepEqual(answer(200, null), { ok: true })
  assert.deepEqual(
    answer(409, { code: "asset_updated_after_finding", error: "Asset data changed after this audit finding was reported", assetUpdatedAt: "", findingReportedAt: "", currentValue: "loc-9", expectedValue: "loc-1", actualValue: "loc-2" }),
    { ok: false, reason: "assetChanged" },
  )
  assert.deepEqual(answer(400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } }), { ok: false, reason: "reasonRequired" })
  assert.deepEqual(answer(400, { error: "Audit finding has already been reviewed" }), { ok: false, reason: "alreadyDecided" })
  assert.deepEqual(answer(403, { error: "Audit finding must be reviewed by a different user than the reporter" }), { ok: false, reason: "ownFinding" })
  assert.deepEqual(answer(400, { error: "Audit round is closed" }), { ok: false, reason: "roundReadOnly" })
  assert.deepEqual(answer(400, { error: "Audit round is cancelled" }), { ok: false, reason: "roundReadOnly" })
  assert.deepEqual(answer(404, { error: "Audit finding not found" }), { ok: false, reason: "notFound" })

  const failed = { ok: false, reason: "failed" }
  assert.deepEqual(answer(409, { error: "Conflict" }), failed, "a 409 without the conflict code")
  assert.deepEqual(answer(400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "tooLong" } }), failed)
  assert.deepEqual(answer(400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { action: "invalidChoice" } }), failed)
  assert.deepEqual(answer(403, { error: "Forbidden: insufficient permissions" }), failed)
  assert.deepEqual(answer(401, { error: "Unauthorized" }), failed)
  assert.deepEqual(answer(500, { error: "Unexpected error · ref 0a1b2c3d" }), failed)
  assert.deepEqual(answer(500, null), failed, "a body that was not JSON")
  assert.deepEqual(answer(404, "<html>"), failed, "a 404 that is not the route's")
  assert.deepEqual(answer(403, { error: "Audit finding has already been reviewed" }), failed, "a key only counts with its own status")
})

test("a batch folds every result in order: the ones that took effect and each failure with its reason (bugs 17-18)", () => {
  const ok: AuditFindingReviewOutcome = { ok: true }
  assert.deepEqual(
    foldAuditFindingBatchResults([
      { id: "f-1", outcome: ok },
      { id: "f-2", outcome: { ok: false, reason: "assetChanged" } },
      { id: "f-3", outcome: ok },
      { id: "f-4", outcome: { ok: false, reason: "alreadyDecided" } },
      { id: "f-5", outcome: { ok: false, reason: "failed" } },
    ]),
    { succeeded: ["f-1", "f-3"], failed: [{ id: "f-2", reason: "assetChanged" }, { id: "f-4", reason: "alreadyDecided" }, { id: "f-5", reason: "failed" }] },
  )
  assert.deepEqual(foldAuditFindingBatchResults([]), { succeeded: [], failed: [] })
})
```

- [ ] **Step 2: Write the failing route test**

`tests/audit-finding-review-route.test.ts` (new). The harness is the one in `tests/audit-scan-edit-findings.test.ts:1-97`. The Prisma stand-in's `updateMany` lets one claim through while `state.pending` holds. `findUnique` keeps answering the snapshot the test sets, as two presses or two tabs that both read the finding while it was pending.

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import { classifyAuditFindingReviewResponse } from "../src/lib/audit-finding-review-results.ts"

type Call = { call: string; args: Record<string, unknown> }
const state: { finding: Record<string, unknown> | null; pending: boolean; calls: Call[] } = { finding: null, pending: true, calls: [] }
Object.assign(globalThis, { __reviewRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "reviewer-1", roles: ["it_head"], permissions: ["audit:view", "audit:approve"], employeeId: "emp-9" } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() {
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__reviewRouteState
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "auditFinding" && method === "findUnique") return state().finding
            // The claim (P4-R6): one write finds the finding still pending, every later one finds none.
            if (name === "auditFinding" && method === "updateMany") {
              if (args?.where?.reviewStatus === "pending" && state().pending) {
                state().pending = false
                return { count: 1 }
              }
              return { count: 0 }
            }
            if (name === "auditFinding" && method === "update") return { ...state().finding, ...(args?.data ?? {}) }
            if (name === "auditFinding" && method === "findMany") return [{ findingType: state().finding.findingType, reviewStatus: "approved" }]
            if (method === "findMany") return []
            if (method === "count") return 0
            if (method === "findFirst" || method === "findUnique") return null
            return { id: name + "-new", ...(args?.data ?? {}) }
          }
        },
      })
    }
    const client = new Proxy({}, {
      get(_target, key) {
        if (key === "$transaction") return async (callback) => callback(client)
        return model(String(key))
      },
    })
    export const prisma = client
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

const route = await import(pathToFileURL("src/app/api/audit-findings/[id]/review/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

const reportedAt = new Date("2026-10-07T01:00:00.000Z")
function finding(overrides: Record<string, unknown> = {}) {
  return {
    id: "finding-1", auditRoundId: "round-1", auditItemId: "item-1", assetId: "asset-1",
    findingType: "wrong_location", expectedValue: "loc-1", actualValue: "loc-2",
    reportedBy: "auditor-1", reportedAt, reviewStatus: "pending",
    actionPlan: null, actionOwnerId: null, actionDueDate: null, actionStatus: "not_required", closedAt: null,
    auditItem: { id: "item-1" },
    auditRound: { status: "open" },
    // Untouched since the report: no 409.
    asset: { id: "asset-1", currentLocationId: "loc-1", custodianId: null, departmentId: "dept-1", conditionId: "cond-good", updatedAt: new Date("2026-10-06T01:00:00.000Z") },
    ...overrides,
  }
}

async function post(body: unknown) {
  const response = await route.POST(
    new Request("http://localhost/api/audit-findings/finding-1/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: "finding-1" }) },
  )
  const payload = await response.json()
  return { status: response.status, payload, outcome: classifyAuditFindingReviewResponse(response.status, payload) }
}

const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const writes = () => state.calls.filter((entry) => /\.(update|updateMany|create|createMany)$/.test(entry.call)).map((entry) => entry.call)
const dataOf = (args: Record<string, unknown>) => args.data as Record<string, unknown>

beforeEach(() => {
  state.finding = finding()
  state.pending = true
  state.calls = []
})

test("a reject without a reason is refused under its field before anything is written (decision 5, P4-R5)", async () => {
  for (const body of [{ action: "reject" }, { action: "reject", reviewRemark: "   " }, { action: "reject", reviewRemark: null }]) {
    state.calls = []
    const refused = await post(body)
    assert.equal(refused.status, 400, JSON.stringify(body))
    assert.deepEqual(refused.payload, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } })
    assert.deepEqual(refused.outcome, { ok: false, reason: "reasonRequired" })
    assert.deepEqual(writes(), [])
  }
})

test("a reject with a reason claims the pending finding, then decides it once with one review time; the master is untouched", async () => {
  const rejected = await post({ action: "reject", reviewRemark: "  ตรวจซ้ำแล้ว สภาพยังดี " })
  assert.equal(rejected.status, 200)
  assert.deepEqual(rejected.outcome, { ok: true })
  const [claim] = callsTo("auditFinding.updateMany")
  assert.deepEqual(claim.where, { id: "finding-1", reviewStatus: "pending" })
  assert.equal(dataOf(claim).reviewedBy, "reviewer-1")
  assert.ok(dataOf(claim).reviewedAt instanceof Date)
  const [decision] = callsTo("auditFinding.update")
  assert.deepEqual(decision.where, { id: "finding-1" })
  assert.equal(dataOf(decision).reviewStatus, "rejected")
  assert.equal(dataOf(decision).reviewRemark, "ตรวจซ้ำแล้ว สภาพยังดี")
  assert.equal(dataOf(decision).actionTaken, "finding_rejected")
  assert.equal(dataOf(decision).reviewedAt, dataOf(claim).reviewedAt, "the claim and the decision share one review time")
  assert.deepEqual(callsTo("asset.update"), [])
  assert.deepEqual(callsTo("assetMovement.create"), [])
})

test("an approve needs no reason and applies the found value once", async () => {
  const approved = await post({ action: "approve" })
  assert.equal(approved.status, 200)
  assert.deepEqual(callsTo("asset.update").map((args) => args.data), [{ currentLocationId: "loc-2", updatedBy: "reviewer-1" }])
  assert.equal(callsTo("assetMovement.create").length, 1)
  assert.equal(dataOf(callsTo("auditFinding.update")[0]).actionTaken, "master_asset_updated")
  const order = state.calls.map((entry) => entry.call)
  assert.ok(order.indexOf("auditFinding.updateMany") < order.indexOf("asset.update"), "the claim comes before any master change")
})

test("a second press, a second tab or a batch beside the panel applies nothing: one decision per finding (P4-R6)", async () => {
  // Both presses read the finding while it was pending, so the pre-check passes twice; only the claim can stop one.
  const first = await post({ action: "approve" })
  assert.equal(first.status, 200)
  const second = await post({ action: "approve", reviewRemark: "จากอีกแท็บ" })
  assert.equal(second.status, 400)
  assert.deepEqual(second.payload, { error: "Audit finding has already been reviewed" })
  assert.deepEqual(second.outcome, { ok: false, reason: "alreadyDecided" })
  assert.equal(callsTo("auditFinding.updateMany").length, 2)
  assert.equal(callsTo("asset.update").length, 1, "the master changes once")
  assert.equal(callsTo("assetMovement.create").length, 1, "one movement")
  assert.equal(callsTo("auditFinding.update").length, 1, "one decision")
  assert.equal(callsTo("auditItem.update").length, 1, "one item state")

  // The branches that touch no master are claimed too: a not-found finding approved, then rejected from a batch.
  state.finding = finding({ findingType: "not_found", expectedValue: "{\"assetTag\":\"GRL-COM-26-0036\"}", actualValue: null })
  state.pending = true
  state.calls = []
  assert.equal((await post({ action: "approve" })).status, 200)
  assert.deepEqual((await post({ action: "reject", reviewRemark: "เจอแล้ว" })).outcome, { ok: false, reason: "alreadyDecided" })
  assert.deepEqual(callsTo("auditFinding.update").map((args) => dataOf(args).actionTaken), ["not_found_confirmed_no_master_update"])
})

test("every check keeps its order and its answer: 404, read-only round, schema, already decided, own finding, conflict", async () => {
  state.finding = null
  assert.deepEqual(await post({ action: "approve" }), { status: 404, payload: { error: "Audit finding not found" }, outcome: { ok: false, reason: "notFound" } })

  for (const status of ["closed", "cancelled"]) {
    state.finding = finding({ auditRound: { status } })
    const readOnly = await post({ action: "reject" })
    assert.equal(readOnly.status, 400, "the round is checked before the body")
    assert.deepEqual(readOnly.payload, { error: `Audit round is ${status}` })
    assert.deepEqual(readOnly.outcome, { ok: false, reason: "roundReadOnly" })
  }

  state.finding = finding({ reviewStatus: "approved" })
  assert.equal((await post({ action: "reject" })).payload.code, "VALIDATION_FAILED", "the schema before the pending check, as today")
  assert.deepEqual((await post({ action: "reject", reviewRemark: "ซ้ำ" })).payload, { error: "Audit finding has already been reviewed" })

  state.finding = finding({ reportedBy: "reviewer-1" })
  const own = await post({ action: "approve" })
  assert.equal(own.status, 403)
  assert.deepEqual(own.outcome, { ok: false, reason: "ownFinding" })

  // The asset's room changed after the report, to neither value: approve asks for a second press.
  state.finding = finding({ asset: { id: "asset-1", currentLocationId: "loc-9", custodianId: null, departmentId: "dept-1", conditionId: "cond-good", updatedAt: new Date("2026-10-08T01:00:00.000Z") } })
  const conflict = await post({ action: "approve" })
  assert.equal(conflict.status, 409)
  assert.equal(conflict.payload.code, "asset_updated_after_finding")
  assert.equal(conflict.payload.currentValue, "loc-9")
  assert.deepEqual(conflict.outcome, { ok: false, reason: "assetChanged" })

  assert.deepEqual(callsTo("auditFinding.updateMany"), [], "no refusal above reaches the claim")
  assert.equal((await post({ action: "approve", confirmConflict: true })).status, 200, "the second press confirms it")
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/audit-finding-review-results.test.ts tests/audit-finding-review-route.test.ts`

Expected: FAIL. `src/lib/audit-finding-review-results.ts` does not exist (ERR_MODULE_NOT_FOUND). Once it is created, the route test fails on:
- the reject without a reason (200 today);
- the claim (no `updateMany` call today);
- the second press (200 today, with two `asset.update` calls).

- [ ] **Step 4: Implement**

`src/lib/validations/audit.ts:72-76` becomes:

```ts
// The review's two answers (decision 5, group 2 spec §2, §10): a reason is required to reject, and the batch sends one
// review per finding, so this one schema holds for one finding and for several at once. Approving needs none. Both
// remarks stop at 4000, as the client does (plan 4 Task 1, P4-R5).
const reviewConfirmConflict = z.boolean().optional().default(false)

export const auditFindingReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    reviewRemark: z.string().trim().max(4000).transform((value) => value || null).nullable().optional(),
    confirmConflict: reviewConfirmConflict,
  }),
  z.object({
    action: z.literal("reject"),
    reviewRemark: z.string().trim().min(1).max(4000),
    confirmConflict: reviewConfirmConflict,
  }),
])
```

The route reads `input.action`, `input.reviewRemark` and `input.confirmConflict` (`:122`, `:155`, `:170`, `:187`, `:220`, `:239`, `:250-254`, `:263`, `:275-277`). All three exist on both arms. `reviewRemark` is `string | null | undefined` on approve and `string` on reject, so every use type-checks unchanged.

In `src/app/api/audit-findings/[id]/review/route.ts`, the line before `:146` and the first lines of the transaction become:

```ts
    const reviewedAt = new Date()
    const reviewedFinding = await prisma.$transaction(async (tx) => {
      // One decision per finding (P4-R6): the pending check above runs before the transaction, so two presses, two tabs
      // or a batch beside the panel can all pass it. Only one claim finds the finding still pending; any other is
      // refused with the same words before a master change, a movement or a component sync.
      const claimed = await tx.auditFinding.updateMany({
        where: { id, reviewStatus: "pending" },
        data: { reviewedBy: user.id, reviewedAt },
      })
      if (claimed.count !== 1) throw new Error("Audit finding has already been reviewed")

      if (input.action === "approve") {
```

`reviewedAt: new Date()` at `:154`, `:169`, `:186` and `:252` becomes `reviewedAt`. The catch at `:281-283` turns the thrown `Error` into 400 `{ error: "Audit finding has already been reviewed" }` (`api-response.ts:15-23`), the pre-check's body. No other line of the route changes.

`src/lib/audit-finding-review-results.ts` (new):

```ts
// What a review answer means for the client (group 2 plan 4, P4-R4): the panel's 409 and the selection bar's batch
// read one classifier, keyed by status and the api-error catalog key or code, never by English text in a component.
// Pure and client-safe: relative .ts imports only, and both modules import nothing.
import { getApiErrorKey } from "./api-error-catalog.ts"
import { AUDIT_FINDING_CONFLICT_CODE } from "./audit-finding-conflict.ts"

export const auditFindingReviewFailureReasons = ["assetChanged", "alreadyDecided", "ownFinding", "reasonRequired", "roundReadOnly", "notFound", "failed"] as const

export type AuditFindingReviewFailureReason = (typeof auditFindingReviewFailureReasons)[number]

export type AuditFindingReviewOutcome = { ok: true } | { ok: false; reason: AuditFindingReviewFailureReason }

export type AuditFindingBatchResult = { succeeded: string[]; failed: { id: string; reason: AuditFindingReviewFailureReason }[] }

// The review route's refusals (route.ts:48-52, :114-119; the catalog keys of their words). A key counts only with its
// own status.
const failureByStatusAndKey: ReadonlyArray<readonly [number, string, AuditFindingReviewFailureReason]> = [
  [400, "findingAlreadyDecided", "alreadyDecided"],
  [403, "findingReviewerIsReporter", "ownFinding"],
  [400, "auditRoundClosed", "roundReadOnly"],
  [400, "auditRoundCancelled", "roundReadOnly"],
  [404, "findingNotFound", "notFound"],
]

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
}

export function classifyAuditFindingReviewResponse(status: number, body: unknown): AuditFindingReviewOutcome {
  if (status >= 200 && status < 300) return { ok: true }
  const payload = asRecord(body)
  // The asset changed after the report (route.ts:121-144): the panel asks for a second press; a batch skips it.
  if (status === 409 && payload.code === AUDIT_FINDING_CONFLICT_CODE) return { ok: false, reason: "assetChanged" }
  if (status === 400 && payload.code === "VALIDATION_FAILED") {
    return { ok: false, reason: asRecord(payload.fieldErrors).reviewRemark === "required" ? "reasonRequired" : "failed" }
  }
  const key = typeof payload.error === "string" ? getApiErrorKey(payload.error) : null
  const match = failureByStatusAndKey.find(([knownStatus, knownKey]) => knownStatus === status && knownKey === key)
  return { ok: false, reason: match ? match[2] : "failed" }
}

/** A batch's results, in the order sent: the ids that took effect, and each failure with its reason (bugs 17-18). */
export function foldAuditFindingBatchResults(results: readonly { id: string; outcome: AuditFindingReviewOutcome }[]): AuditFindingBatchResult {
  const folded: AuditFindingBatchResult = { succeeded: [], failed: [] }
  for (const { id, outcome } of results) {
    if (outcome.ok) folded.succeeded.push(id)
    else folded.failed.push({ id, reason: outcome.reason })
  }
  return folded
}
```

**No change:**
- the plan and close branches (`:54-111`);
- the conflict check and its payload (`:121-144`);
- every branch's writes after the claim;
- `logAudit` (`:261-278`);
- the client components;
- the refusal matrix row (`e2e/cross-cutting/support/refusals.ts:71`: `{}` without the permission is still 403 before the body is read).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-finding-review-results.test.ts tests/audit-finding-review-route.test.ts tests/audit-finding-resolution.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-item-review-state.test.ts tests/audit-component-scan-api.test.ts tests/asset-movement-labels.test.ts tests/api-error-catalog.test.ts tests/audit-round-cancellation.test.ts tests/audit-round-preview.test.ts tests/v-track2-u.test.ts tests/validation-guards.test.ts && npx tsc --noEmit`

Expected: PASS. These pins hold untouched (checked against master):
- `tests/audit-finding-resolution.test.ts:48-50`: `hasAuditFindingConflict`, `buildAuditFindingConflictPayload` and `status: 409` are still in the route.
- `tests/audit-out-of-scope-actual-field.test.ts:100-112`: the claim sits before `finding.findingType === "out_of_scope"`, so the out-of-scope block still holds no `tx.asset.update` / `tx.assetMovement.create`.
- `tests/audit-item-review-state.test.ts:16-23`: the import of `updateAuditItemReviewState` is kept; the route still exports only `POST`.
- `tests/audit-component-scan-api.test.ts:43-54`: the component sync is unchanged.
- `tests/asset-movement-labels.test.ts:42`: no new movement type.
- `tests/api-error-catalog.test.ts:68-79`: the thrown text is already a catalog entry (`api-error-catalog.ts:51`).
- `tests/audit-round-cancellation.test.ts:24-29`: no `status: z.enum`; the cancel schema line is unchanged. `:66-82`: `getAuditRoundReadOnlyError` is still in the route.
- `tests/audit-round-preview.test.ts:23`: no `.strict()`.
- `tests/v-track2-u.test.ts:134-196` and `tests/validation-guards.test.ts:34`, `:35`, `:68`, `:111`, `:112`: they read the dialog and batch components, which this task does not touch (Task 4 rewrites the decision's pins, Task 5 the batch's, P4-R22).

Then run: `npm test && npm run lint`

Expected: PASS. A pin that fails outside this list is rewritten in this commit and named in the report.

E2E is not run in this task. No step breaks:
- `e2e/audit/field-audit.spec.ts:600` and `:727` send `{ action: "approve" }`, still valid;
- the IT head's reject (`:626`, `:637`) fills a remark before it presses.

Until Tasks 4-5, a reject with an empty remark in today's dialog or batch is refused by the server. The dialog shows it as its error toast (`audit-finding-review-actions.tsx:149-151`), and the batch stops as it does today. That is the interim state, and no E2E step meets it.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/audit.ts "src/app/api/audit-findings/[id]/review/route.ts" src/lib/audit-finding-review-results.ts tests/audit-finding-review-results.test.ts tests/audit-finding-review-route.test.ts
git commit -m "fix(audit-findings): the review route refuses a reject without a reason under its field (one schema for one finding and for a batch, decision 5), caps both remarks at 4000, and claims the still-pending finding inside its transaction, so a second press, a second tab or a batch never applies a finding twice; a pure classifier names each review answer and folds a batch's results (group 2 plan 4 task 1, P4-R4, P4-R5, P4-R6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Findings filter rules and page data (pure + server)

The findings page builds its where in `src/lib/audit-finding-filters.ts`. It reads every row, count and evidence file inline (`page.tsx:59-260`). Spec §10 replaces the eight quick filters with six tabs, gives ต้องติดตาม three sub-chips, and opens a finding in a panel by `?finding=`. Today's rules cannot carry that:

- **The union.** A union tab cannot use a top-level `OR`, because the search's `where.OR = …` (`audit-finding-filters.ts:121-123`) would overwrite it (FP §1, §2). The two arms also need their own round scopes:
  - `action_open` is operational (`:114-115`);
  - `exception` is coverage (`:116-117`).
- **Bug 19.** The search matches `findingType` as a raw code (`:61`), so "ที่ตั้ง" never finds a location finding.
- **No way back, no panel.** The page reads neither `returnTo` nor `finding` (`page.tsx:49`). The back link is fixed to the rounds list (`:269`).
- **Raw owner id.** The owner label comes from an employee list read only with `audit:edit` (`:116-122`, `:175-176`), so a viewer sees the raw `actionOwnerId` (`:381`, `:529`).

This task writes the rules (pure) and the page's data (one server module), and wires the page to them with its UI kept: the StatStrip, the eight quick filters, the table and the cards read the new data. Task 3 then draws the tabs, sub-chips, filter row and table, and Task 4 draws the panel, all from this data.

1. **Statuses (P4-R3).**
   - Tabs: `pending | approved | rejected | followUp | closed | all`. ต้องติดตาม's URL value is `follow_up`.
   - Sub-chips: `action_open | overdue | exception`.
   - A findings URL keeps one `status` param, and its value is a tab, a sub-chip or a bell kind. So every old link (`action_open`, `overdue`, `closed`, `exception`, `action_not_due`, `action_due_soon`) keeps its where. It opens its tab (and sub-chip) through `auditFindingStatusView`. The exports read the same `status`.
   - `follow_up` = `action_open` (operational) OR `exception` (coverage), one OR with each arm's own scope; `overdue` is inside `action_open`. With `roundId` both arms lose the scope, as every status does today (`:112-113`).
   - `done` stays open (`openAuditFindingActionStatuses`, `:29`), as the close rule counts it.
2. **One AND list (FP §1).**
   - Plain conditions stay keys: status, scope, round, type.
   - Each OR group (ต้องติดตาม's union, the search) is one entry of `AND`, so none overwrites another.
   - With no OR group the where has no `AND`. So `status=pending&roundId=` still equals the round page's step-2 count (`tests/audit-round-page-rules.test.ts:47`, P2-R26), and `status=pending` the bell's `pendingAuditFindingsWhere` (`tests/waiting-work-links.test.ts:66`) (P4-R19).
3. **Type and search (bug 19, P4-R5b).**
   - `findingType` ("เรื่อง:") is checked against the six types; an unknown value is ignored, never shown.
   - The search matches the asset tag and name and the round number and name, as today, plus the types whose words contain the text. The words are each type's short and long labels in both languages: "ที่ตั้ง" finds `wrong_location`, "ทรัพย์สิน" finds ไม่พบ and นอกขอบเขต. A code no longer matches.
   - The page and both exports pass the same words, so a search exports the rows it shows.
4. **Links (P4-R12).**
   - One href writer keeps `returnTo` on every link (tabs, chips, filters, pager, rows, next finding). It writes `finding` only when asked.
   - `returnTo` is accepted only for the rounds list or a round page.
   - The way back is `returnTo`, else the round (with `roundId`), else the rounds list, with its target ("round" or "rounds") for the link's words.
5. **Page data.** One server load (`getAuditFindingsPageData`), so every count and the rows it opens come from one builder. Its names are the contract of Tasks 3-5 (P4-R20):
   - the nine counts (six tabs, three sub-chips), each within the round, type and search, and the list's total;
   - `reviewableTotal`: how many findings of the list the viewer may decide (approvers only), so the empty panel can say the tab is done (P4-R18);
   - the rows (page and page size, `id` tiebreak), each with its component parent (installed link), its owner's name (`ownerLabel`), its two values in words (`expectedLabel`, `actualLabel`), `reportedByViewer`, `reviewable` and its evidence;
   - the chosen finding (`?finding=`), loaded even off the page or outside the filters, with its item's four compared fields, who checked it (`reporterLabel`, `scannedByLabel`), the value `labels`, its asset's other pending findings in the round (`siblings`), and the review `queue`:
     - "k จาก N" among the findings the viewer may decide within the list;
     - the next finding (P4-R18), computed here, on the server: the first finding the viewer may decide after the chosen one in the list's order, else the first such finding before it, else none (the panel then says the tab is done). Its `nextHref` carries `finding` and no page. A second href, `nextHrefAfterSiblings`, skips the siblings too, for after "อนุมัติทุกช่องของทรัพย์สินนี้".
   - A link with a finding and no page opens the page that holds it (P4-R18).
   - `roundOptions` for "รอบ:", `filterRound`, the plan dialog's owner list for `audit:approve` (P4-R21), the value labels, `back` and `loadedAt` (the freshness banner).
6. **The words of the filter in use** (`auditFindingFilterLabelKeys`): the tab, then its sub-chip or the bell's chip, as message keys. The findings PDF's title reads them (Task 6).

**Files:**
- Modify: `src/lib/audit-finding-filters.ts`:
  - `:1-9` (imports: `list-pagination.ts` and `operational-return-navigation.ts`, both relative);
  - `:11-27` (`auditFindingResolutionStatuses` kept for the page's quick filters until Task 3; new tabs, sub-chips, counted statuses, status views, types);
  - `:37-43` (`resolveAuditFindingStatus` accepts `follow_up`);
  - `:49-51` (`isOperationalAuditFindingStatus` goes: each status names its scope);
  - `:59-67` (the search conditions);
  - `:69-126` (`buildAuditFindingWhere`: one AND list, type checked, `typeSearchLabels`);
  - after `:126`: the type words, the list's order, the reviewable where, before/after wheres, the next finding's pick, the list filters' parse, the href writer, the way back, the page from a finding, the filter's label keys.
- Modify: `src/lib/operational-return-navigation.ts`: `normalizeAuditFindingsReturnTo` after `:42`.
- Create: `src/lib/audit-finding-search-labels.ts` (server: next-intl).
- Create: `src/lib/audit-findings-page-data.ts` (server).
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx`:
  - imports `:5`, `:11`, `:29-37`, `:42`, plus four new ones (below);
  - the props type `:47-50`;
  - the local `AuditFindingEvidenceAttachment` type `:52-58` goes (imported from the data module);
  - the data block `:60-177` (`batchReviewFindings` `:178-184` stays as it is);
  - the `tabFollowUp` label in `resolutionFilterLabels` `:185-196`;
  - the strip counts `:204-233` (values only);
  - the two drill-down chips' hrefs `:245-246`;
  - the search's hidden inputs `:309`;
  - the owner's name `:381`, `:529`;
  - `SUMMARY_STATUSES` `:611-612` goes;
  - `buildAuditFindingsHref` `:753-768` goes.
- Modify: `src/app/api/audit-findings/export/route.ts:7`, `:20-22` and `src/app/api/audit-findings/export-pdf/route.ts:6`, `:23-25` (the type words).
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`).
- Test:
  - `tests/audit-finding-tabs.test.ts` (new, the rules by value, plus the label helper's source pin);
  - `tests/audit-findings-page-data.test.ts` (new, runtime with a Prisma stand-in, the harness of `tests/audit-round-page-data.test.ts:1-50`);
  - `tests/audit-finding-resolution.test.ts:110-129`, `:142-147`, `:166-184`, `:186-195` (rewritten);
  - `tests/list-pages-ui.test.ts:301`, `:310-323` (rewritten);
  - `tests/audit-mobile-flow-completion.test.ts:39-49` (rewritten);
  - `tests/operational-return-navigation.test.ts:80-89` (rewritten);
  - `tests/performance-route-instrumentation.test.ts:47-50` (a new entry after it).

**Interfaces:**
- Consumes:
  - `parseListPage`, `listPageWindow`, `appendListPage`, `type ListPageState`, `type ListPageParam` (`src/lib/list-pagination.ts:27-56`; pure, no imports);
  - `auditRoundOperationalWhere`, `auditRoundCoverageWhere`, `isAuditRoundReadOnlyStatus` (`src/lib/audit-round-status.ts:4-5`, `:7`);
  - `openAuditActionsWhere`, `auditActionsDueSoonWhere`, `startOfBangkokDay`, `DEFAULT_WAITING_WORK_RULES`, `type WaitingWorkRules` (`src/lib/waiting-work-rules.ts`, unchanged bell rules);
  - `buildFindingValueLabels(findings)`, `buildAuditReferenceLabels(ids)` (`src/lib/audit-finding-labels.ts:10`, `:25`; chunked) and `formatFindingValue(findingType, value, labels)` (`:44-49`; called only for a set value, so its `"-"` never reaches a row);
  - `formatAuditUserLabel(user, fallbackId)` (`src/lib/audit-round-page-rules.ts:53-56`), called with a `null` fallback so a missing user reads as nothing, never an id;
  - `isSameAuditActor` (`src/lib/audit-segregation.ts:6-8`);
  - `withPerformanceTiming(label, operation, meta)` (`src/lib/performance-timing.ts:25`);
  - `routing.locales` (`src/i18n/routing.ts:3-6`: `["th", "en"]`).
- Produces, in `src/lib/audit-finding-filters.ts` (pure, client-safe: `import type` and relative `.ts` only):
  - Kept: `auditFindingResolutionStatuses` (the eight quick filters, read by the page's TabNav until Task 3 replaces it), `auditFindingWaitingStatuses`, `openAuditFindingActionStatuses`, `isAuditFindingWaitingStatus`, `isOpenAuditFindingActionStatus`, `getAuditFindingToday`.
  - `export type AuditFindingWaitingStatus = (typeof auditFindingWaitingStatuses)[number]`
  - `export const auditFindingTabs = ["pending", "approved", "rejected", "followUp", "closed", "all"] as const`; `type AuditFindingTab`
  - `export const auditFindingFollowUpChips = ["action_open", "overdue", "exception"] as const`; `type AuditFindingFollowUpChip`
  - `export const auditFindingCountedStatuses = ["pending", "approved", "rejected", "follow_up", "closed", "all", "action_open", "overdue", "exception"] as const`; `type AuditFindingCountedStatus`; `type AuditFindingCounts = Readonly<Record<AuditFindingCountedStatus, number>>`
  - `export type AuditFindingStatus = AuditFindingCountedStatus | AuditFindingWaitingStatus`, plus `export type AuditFindingResolutionStatus = AuditFindingStatus` (the page's name, kept).
  - `export const auditFindingTabStatus: Readonly<Record<AuditFindingTab, AuditFindingCountedStatus>>` (`followUp → "follow_up"`, each other tab its own name).
  - `export type AuditFindingStatusView = { tab: AuditFindingTab; chip: AuditFindingFollowUpChip | null; waiting: AuditFindingWaitingStatus | null }`; `auditFindingStatusView(status: AuditFindingStatus): AuditFindingStatusView`:
    - a sub-chip value → `followUp` and that chip;
    - a bell kind → `followUp`, no chip, `waiting` set;
    - `follow_up` → `followUp`;
    - each other value → its tab.
  - `resolveAuditFindingStatus(status?: string | null): AuditFindingStatus` (an unknown value → `"pending"`, as today).
  - `export const auditFindingTypes = ["wrong_custodian", "wrong_location", "wrong_department", "wrong_condition", "not_found", "out_of_scope"] as const` (spec §10's column order); `type AuditFindingType`; `resolveAuditFindingType(value?: string | null): AuditFindingType | null`.
  - `export const auditFindingTypeShortLabelKeys: Readonly<Record<AuditFindingType, string>>`: the `auditRound` keys of the short words: `differenceField_custodian`, `differenceField_location`, `differenceField_department`, `differenceField_condition`, `notFound`, `outOfScope` (ผู้ถือครอง / ที่ตั้ง / แผนก / สภาพ / ไม่พบ / นอกขอบเขต).
  - `export type AuditFindingTypeSearchLabels = Readonly<Partial<Record<AuditFindingType, readonly string[]>>>`; `export type AuditFindingTypeTranslators = { finding: (key: string) => string; round: (key: string) => string }`; `buildAuditFindingTypeSearchLabels(translators: readonly AuditFindingTypeTranslators[]): AuditFindingTypeSearchLabels` (per type: the short word and `auditFinding.type_<type>` of each translator, de-duplicated).
  - `auditFindingTypesMatchingSearch(search: string, labels?: AuditFindingTypeSearchLabels): AuditFindingType[]`: case-insensitive "a label contains the text", in `auditFindingTypes` order.
  - `buildAuditFindingWhere({ status, search, roundId, findingType, now, rules, typeSearchLabels }: { status?: string | null; search?: string | null; roundId?: string | null; findingType?: string | null; now?: Date; rules?: WaitingWorkRules; typeSearchLabels?: AuditFindingTypeSearchLabels }): Prisma.AuditFindingWhereInput`. The bell branch's shape is unchanged, and it narrows with the checked type and the new search.
  - `export const auditFindingsListOrderBy: Prisma.AuditFindingOrderByWithRelationInput[] = [{ reportedAt: "desc" }, { id: "asc" }]`
  - `auditFindingReviewableWhere(userId: string): Prisma.AuditFindingWhereInput` = `{ reviewStatus: "pending", reportedBy: { not: userId }, auditRound: { status: auditRoundOperationalWhere } }`. This is the review route's own refusals: decided, own finding (403), read-only round (400).
  - `auditFindingsBeforeWhere(finding: { id: string; reportedAt: Date })` and `auditFindingsAfterWhere(finding)`: the rows before or after it in the list's order.
  - `pickAuditFindingNextReviewId(after: readonly string[], before: readonly string[], skip: ReadonlySet<string>): string | null` (P4-R18): the first id after the decided one that is not skipped, else the first such id before it, else `null`. `after` and `before` are in the list's order.
  - `export type AuditFindingsListFilters = { status: AuditFindingStatus; search: string; roundId: string | null; findingType: AuditFindingType | null; findingId: string | null; returnTo: string | null; listPage: ListPageState; pageGiven: boolean }`
  - `parseAuditFindingsListFilters(locale: string, params: Readonly<Record<string, string | string[] | undefined>>): AuditFindingsListFilters` (params `status`, `search`, `roundId`, `findingType`, `finding`, `returnTo`, `page`, `pageSize`).
  - `export type AuditFindingsHrefFilters = Pick<AuditFindingsListFilters, "status" | "search" | "roundId" | "findingType" | "returnTo">`; `export type AuditFindingsHrefOverrides = Partial<Pick<AuditFindingsListFilters, "status" | "search" | "roundId" | "findingType">> & { page?: number; pageSize?: number; finding?: string | null }`.
  - `buildAuditFindingsHref(locale: string, filters: AuditFindingsHrefFilters, overrides?: AuditFindingsHrefOverrides): string`. The param order is today's: status, search, roundId, findingType, page, pageSize, then `finding` and `returnTo`. An override of `null` or `""` clears its filter.
  - `auditFindingsHrefQuery(href: string): URLSearchParams` (the search form's hidden inputs read it, as `auditRoundHrefQuery` does for the round page).
  - `export type AuditFindingsBack = { href: string; target: "round" | "rounds" }`; `auditFindingsBack(locale: string, filters: Pick<AuditFindingsListFilters, "returnTo" | "roundId">): AuditFindingsBack` (P4-R12). `target` picks the link's words: "round" for a round page (from `returnTo` or `roundId`), "rounds" for the rounds list.
  - `resolveAuditFindingsListPage(listPage: ListPageState, { pageGiven, findingIndex }: { pageGiven: boolean; findingIndex: number | null }): ListPageState`.
  - `auditFindingFilterLabelKeys(status: AuditFindingStatus): string[]`: the full message keys of the filter in use, in display order: the tab's (`auditFinding.status_pending`, `auditFinding.tabFollowUp`, …), then the sub-chip's (`auditFinding.filterActionOpen`, `auditFinding.filterOverdue`, `auditFinding.status_exception`) or the bell's chip (`notifications.openAuditActions`, `notifications.auditActionsDueSoon`). Task 6's findings PDF title reads it.
- Produces, in `src/lib/operational-return-navigation.ts`: `normalizeAuditFindingsReturnTo(locale: string, value: string | string[] | undefined): string | null`. It accepts the rounds list (any query) or one round's page (not the create page `new`), and gives `null` for anything else.
- Produces, in `src/lib/audit-finding-search-labels.ts` (server): `getAuditFindingTypeSearchLabels(): Promise<AuditFindingTypeSearchLabels>`, both locales' words.
- Produces, in `src/lib/audit-findings-page-data.ts` (server):
  - `export type AuditFindingEvidenceAttachment = { id: string; originalName: string; fileType: string; fileSize: number; uploadedAt: Date }` (moved from the page)
  - `export type AuditFindingParent = { id: string; assetTag: string; name: string }`
  - `export type AuditFindingsPageDataInput = { locale: string; filters: AuditFindingsListFilters; user: { id: string }; canApprove: boolean; typeSearchLabels: AuditFindingTypeSearchLabels; rules: WaitingWorkRules; now: Date }`
  - `getAuditFindingsPageData(input)` returns:
    - `counts: AuditFindingCounts`;
    - `total: number`: the status's count, or a bell kind's own count;
    - `reviewableTotal: number | null`: the findings of the list the viewer may decide; `null` without `canApprove`;
    - `listPage: ListPageState` (resolved);
    - `rows`: each finding (every scalar column: `id`, `findingType`, `reviewStatus`, `reportedBy`, `reportedAt`, `actionStatus`, `actionPlan`, `actionOwnerId`, `actionDueDate`, `expectedValue`, `actualValue`, `remark`, `reviewRemark`, …) with:
      - `auditRound { id, auditNo, name, status }`;
      - `auditItem { auditStatus, reconcileStatus }`;
      - `asset { id, assetTag, name, installedInLinks } | null`;
      - `actionOwner { code, fullNameTh } | null`;
      - `parent: AuditFindingParent | null`;
      - `ownerLabel: string | null` ("<code> - <name>", never an id, P4-R11);
      - `expectedLabel: string | null` and `actualLabel: string | null`: the values in words (`formatFindingValue`), `null` when empty, never a typed `"-"`;
      - `reportedByViewer: boolean`;
      - `reviewable: boolean`;
      - `evidence: AuditFindingEvidenceAttachment[]`.
    - `valueLabels: Map<string, string>`: the rows', the chosen finding's, its siblings' and its item's eight compared ids;
    - `employees: { id: string; label: string }[]`: only with `canApprove` (P4-R21);
    - `filterRound: { id, auditNo, name } | null`;
    - `roundOptions: { id, auditNo, name }[]`;
    - `panel: AuditFindingsPanel | null`:
      - `finding`: the row's fields and extras, plus `auditItem { auditStatus, reconcileStatus, expected*/actual* ×4, scannedAt, scannedBy, remark }`;
      - `inList: boolean`;
      - `readOnly: boolean`;
      - `reporterLabel: string | null`;
      - `scannedByLabel: string | null`;
      - `labels: ReadonlyMap<string, string>`: the same map as `valueLabels`, so the panel reads one object;
      - `siblings: { id, findingType, assetId, expectedValue, actualValue, reviewStatus, reportedBy, reportedByViewer }[]`: the asset's other pending findings in the round;
      - `queue: { position: number | null; total: number; nextHref: string | null; nextHrefAfterSiblings: string | null } | null`: null without `canApprove`. `position` is `null` when the chosen finding is not one the viewer may decide; `total` is `reviewableTotal`.
    - `back: AuditFindingsBack`;
    - `loadedAt: Date`.
  - `export type AuditFindingsPageData`, `AuditFindingsPageRow`, `AuditFindingsPanel`.
- For later tasks (P4-R20: these are the only names; no task adds a second loader):
  - **Task 3 (shell):**
    - The tabs are `auditFindingTabs`, each with `href: buildAuditFindingsHref(locale, filters, { status: auditFindingTabStatus[tab], pageSize: listPage.pageSize })` and `count: formatCount(data.counts[auditFindingTabStatus[tab]])`. `current` is `auditFindingStatusView(filters.status).tab`.
    - The tab labels are `status_pending`, `status_approved`, `status_rejected`, `tabFollowUp` (new here), `filterClosed` and `status_all`.
    - The sub-chips are `auditFindingFollowUpChips`, labelled `filterActionOpen`, `filterOverdue` and `status_exception`, with `data.counts[chip]`.
    - A bell kind keeps today's removable chip (`page.tsx:244`).
    - "รอบ:" reads `data.roundOptions`, and `filterRound` when the round is not among them (the stale-id word is Task 3's). "เรื่อง:" reads `auditFindingTypes` with `auditFindingTypeShortLabelKeys` (namespace `auditRound`); an unknown type is already `null` in `filters.findingType`. Both submit `roundId` / `findingType`, so the hidden inputs leave them out: `auditFindingsHrefQuery(buildAuditFindingsHref(locale, filters, { search: "", roundId: null, findingType: null, pageSize: listPage.pageSize }))`.
    - The back link is `data.back` (`href`, and `target` for its words). A row opens `buildAuditFindingsHref(locale, filters, { page: listPage.page, pageSize: listPage.pageSize, finding: row.id })`.
    - The parent line reads `row.parent`, the values `row.expectedLabel` / `row.actualLabel`, and the owner `row.ownerLabel`. The open finding is `data.panel?.finding`, and the plan dialog's owners are `data.employees`.
    - It deletes `auditFindingResolutionStatuses`, `resolutionSummaryItems`, `ResolutionMetric` and their pins (`tests/audit-finding-resolution.test.ts:23-25`, `:163`, `:194`; `tests/list-pages-ui.test.ts:293`, `:298-299`).
  - **Task 4 (panel):** it reads `data.panel` (`AuditFindingsPanel`):
    - `finding.auditItem` for the four-field comparison, through `panel.labels`;
    - `reporterLabel` and `finding.reportedAt` / `finding.auditItem.actualLocationId` for "ตรวจโดย … · เวลา · ห้อง";
    - `finding.parent`, `finding.ownerLabel`, `finding.evidence` and `finding.remark`;
    - `finding.reportedByViewer` and `readOnly` for who may do what (P4-R10);
    - `siblings` for "อนุมัติทุกช่องของทรัพย์สินนี้" (send only those with `!reportedByViewer`);
    - `queue.position` / `queue.total` for "k จาก N", then `router.replace(queue.nextHref)` after a decision (`queue.nextHrefAfterSiblings` after approve-all), or the list without `finding` when it is `null`, where the empty panel says the tab is done (`data.reviewableTotal === 0` on the pending and all tabs only; other tabs keep "choose", P4-R32);
    - `data.employees` for the plan dialog and `data.loadedAt` for the banner.
  - **Task 5 (bar):** it ticks `row.reviewable` rows only (the review route's own rule, `auditFindingReviewableWhere`). The header tick is every `reviewable` row of the page. It names a failed one by `row.asset?.assetTag ?? row.auditRound.auditNo`.
  - **Task 6 (exports):** both findings exports already pass `typeSearchLabels`. Their `status` may now be `follow_up`, which `resolveAuditFindingStatus` accepts. Task 6 adds `locale` for the cell words, and reads `auditFindingFilterLabelKeys(status)` for the findings PDF's title.

- [ ] **Step 1: Write the failing tests (rules)**

`tests/audit-finding-tabs.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  auditFindingCountedStatuses,
  auditFindingFollowUpChips,
  auditFindingReviewableWhere,
  auditFindingStatusView,
  auditFindingTabStatus,
  auditFindingTabs,
  auditFindingTypes,
  auditFindingTypesMatchingSearch,
  auditFindingFilterLabelKeys,
  auditFindingsAfterWhere,
  auditFindingsBack,
  auditFindingsBeforeWhere,
  auditFindingsHrefQuery,
  auditFindingsListOrderBy,
  buildAuditFindingTypeSearchLabels,
  buildAuditFindingWhere,
  buildAuditFindingsHref,
  getAuditFindingToday,
  parseAuditFindingsListFilters,
  pickAuditFindingNextReviewId,
  resolveAuditFindingStatus,
  resolveAuditFindingsListPage,
  resolveAuditFindingType,
} from "../src/lib/audit-finding-filters.ts"
import { normalizeAuditFindingsReturnTo } from "../src/lib/operational-return-navigation.ts"
import { DEFAULT_WAITING_WORK_RULES, openAuditActionsWhere, startOfBangkokDay } from "../src/lib/waiting-work-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const th = JSON.parse(read("messages/th.json"))
const en = JSON.parse(read("messages/en.json"))
const translators = [th, en].map((messages) => ({ finding: (key: string) => messages.auditFinding[key], round: (key: string) => messages.auditRound[key] }))
const typeSearchLabels = buildAuditFindingTypeSearchLabels(translators)
const now = new Date("2026-10-28T03:00:00.000Z")
const today = getAuditFindingToday(now)
const operational = { isActive: true, status: { notIn: ["closed", "cancelled"] } }
const coverage = { isActive: true, status: { not: "cancelled" } }
const open = { in: ["planned", "in_progress", "done"] }
const where = (input: Parameters<typeof buildAuditFindingWhere>[0]) => buildAuditFindingWhere({ now, typeSearchLabels, ...input })

test("six tabs and ต้องติดตาม's three sub-chips; every old link lands on its tab and sub-chip (spec §10, P4-R3)", () => {
  assert.deepEqual(auditFindingTabs.map((tab) => auditFindingTabStatus[tab]), ["pending", "approved", "rejected", "follow_up", "closed", "all"])
  assert.deepEqual([...auditFindingCountedStatuses], ["pending", "approved", "rejected", "follow_up", "closed", "all", ...auditFindingFollowUpChips])
  const view = (status: string) => auditFindingStatusView(resolveAuditFindingStatus(status))
  assert.deepEqual(view("follow_up"), { tab: "followUp", chip: null, waiting: null })
  assert.deepEqual(view("action_open"), { tab: "followUp", chip: "action_open", waiting: null })
  assert.deepEqual(view("overdue"), { tab: "followUp", chip: "overdue", waiting: null })
  assert.deepEqual(view("exception"), { tab: "followUp", chip: "exception", waiting: null })
  assert.deepEqual(view("action_not_due"), { tab: "followUp", chip: null, waiting: "action_not_due" }, "the bell's kinds keep their chip")
  assert.deepEqual(view("action_due_soon"), { tab: "followUp", chip: null, waiting: "action_due_soon" })
  for (const tab of ["pending", "approved", "rejected", "closed", "all"]) assert.deepEqual(view(tab), { tab, chip: null, waiting: null })
  assert.equal(resolveAuditFindingStatus("followUp"), "pending", "the URL value is follow_up")
  assert.equal(resolveAuditFindingStatus(""), "pending")
  assert.equal(resolveAuditFindingStatus(null), "pending")
})

test("each status keeps today's round scope; ต้องติดตาม is one OR of its two arms, each with its own scope (P4-R3)", () => {
  assert.deepEqual(where({ status: "pending" }), { reviewStatus: "pending", auditRound: operational })
  assert.deepEqual(where({ status: "action_open" }), { actionStatus: open, auditRound: operational })
  assert.deepEqual(where({ status: "overdue" }), { actionStatus: open, actionDueDate: { lt: today }, auditRound: operational })
  assert.deepEqual(where({ status: "exception" }), { reviewStatus: "exception", auditRound: coverage })
  assert.deepEqual(where({ status: "approved" }), { reviewStatus: "approved", auditRound: coverage })
  assert.deepEqual(where({ status: "rejected" }), { reviewStatus: "rejected", auditRound: coverage })
  assert.deepEqual(where({ status: "closed" }), { actionStatus: "closed", auditRound: coverage })
  assert.deepEqual(where({ status: "all" }), { auditRound: coverage })
  // One count over the OR, not a sum: an exception can also hold an open plan.
  assert.deepEqual(where({ status: "follow_up" }), {
    AND: [{ OR: [{ actionStatus: open, auditRound: operational }, { reviewStatus: "exception", auditRound: coverage }] }],
  })
  // A round drops the scope, as every status does today (audit-finding-filters.ts:112-113).
  assert.deepEqual(where({ status: "follow_up", roundId: "round-1" }), { auditRoundId: "round-1", AND: [{ OR: [{ actionStatus: open }, { reviewStatus: "exception" }] }] })
  assert.deepEqual(where({ status: "pending", roundId: "round-1" }), { reviewStatus: "pending", auditRoundId: "round-1" }, "still the round page's step-2 count (P2-R26)")
})

test("every OR goes in one AND list: the search never overwrites ต้องติดตาม's union (FP §1)", () => {
  const search = [
    { asset: { assetTag: { contains: "ที่ตั้ง" } } },
    { asset: { name: { contains: "ที่ตั้ง" } } },
    { auditRound: { auditNo: { contains: "ที่ตั้ง" } } },
    { auditRound: { name: { contains: "ที่ตั้ง" } } },
    { findingType: { in: ["wrong_location"] } },
  ]
  assert.deepEqual(where({ status: "follow_up", search: " ที่ตั้ง ", findingType: "wrong_location" }), {
    findingType: "wrong_location",
    AND: [{ OR: [{ actionStatus: open, auditRound: operational }, { reviewStatus: "exception", auditRound: coverage }] }, { OR: search }],
  })
  assert.deepEqual(where({ status: "pending", search: "ที่ตั้ง" }), { reviewStatus: "pending", auditRound: operational, AND: [{ OR: search }] })
})

test("เรื่อง: takes only a known type; the search reads the types' words in Thai and English, never a code (bug 19, P4-R5b)", () => {
  assert.equal(resolveAuditFindingType(" wrong_custodian "), "wrong_custodian")
  assert.equal(resolveAuditFindingType("wrong_branch"), null)
  assert.deepEqual(where({ status: "all", findingType: "wrong_branch" }), { auditRound: coverage }, "an unknown type is ignored, never shown")
  assert.deepEqual([...auditFindingTypes], ["wrong_custodian", "wrong_location", "wrong_department", "wrong_condition", "not_found", "out_of_scope"])
  assert.deepEqual(typeSearchLabels.wrong_custodian, ["ผู้ถือครอง", "ผู้ถือครองไม่ตรง", "Custodian", "Wrong Custodian"])
  assert.deepEqual(typeSearchLabels.not_found, ["ไม่พบ", "ไม่พบทรัพย์สิน", "Not Found"], "one word once")
  assert.deepEqual(typeSearchLabels.out_of_scope, ["นอกขอบเขต", "ทรัพย์สินนอกขอบเขต", "Out of Scope"])
  const match = (text: string) => auditFindingTypesMatchingSearch(text, typeSearchLabels)
  assert.deepEqual(match("ที่ตั้ง"), ["wrong_location"])
  assert.deepEqual(match("ผู้ถือครอง"), ["wrong_custodian"])
  assert.deepEqual(match("สภาพ"), ["wrong_condition"])
  assert.deepEqual(match("ไม่ตรง"), ["wrong_custodian", "wrong_location", "wrong_department", "wrong_condition"])
  assert.deepEqual(match("ทรัพย์สิน"), ["not_found", "out_of_scope"])
  assert.deepEqual(match("LOCATION"), ["wrong_location"])
  assert.deepEqual(match("wrong_location"), [], "a code is not a word")
  assert.deepEqual(match("GRL-COM"), [])
  assert.deepEqual(auditFindingTypesMatchingSearch("ที่ตั้ง"), [], "no words given: no type")
  assert.doesNotMatch(JSON.stringify(where({ status: "pending", search: "wrong_location" })), /"findingType":\{"contains"/)
})

test("a bell kind keeps its own where, narrowed by the round, the checked type and the new search", () => {
  const base = openAuditActionsWhere(startOfBangkokDay(now), DEFAULT_WAITING_WORK_RULES)
  assert.deepEqual(where({ status: "action_not_due" }), base)
  assert.deepEqual(where({ status: "action_not_due", roundId: "round-1", findingType: "wrong_branch", search: "SNI" }), {
    AND: [
      base,
      { auditRoundId: "round-1" },
      { OR: [{ asset: { assetTag: { contains: "SNI" } } }, { asset: { name: { contains: "SNI" } } }, { auditRound: { auditNo: { contains: "SNI" } } }, { auditRound: { name: { contains: "SNI" } } }] },
    ],
  })
})

test("the queue's findings are the ones the review route lets the viewer decide; before and after follow the list's order", () => {
  assert.deepEqual(auditFindingsListOrderBy, [{ reportedAt: "desc" }, { id: "asc" }])
  assert.deepEqual(auditFindingReviewableWhere("user-head"), { reviewStatus: "pending", reportedBy: { not: "user-head" }, auditRound: { status: { notIn: ["closed", "cancelled"] } } })
  const reportedAt = new Date("2026-10-20T03:00:00.000Z")
  assert.deepEqual(auditFindingsBeforeWhere({ id: "f-7", reportedAt }), { OR: [{ reportedAt: { gt: reportedAt } }, { reportedAt, id: { lt: "f-7" } }] })
  assert.deepEqual(auditFindingsAfterWhere({ id: "f-7", reportedAt }), { OR: [{ reportedAt: { lt: reportedAt } }, { reportedAt, id: { gt: "f-7" } }] })
  // The next finding (P4-R18): the first after the decided one, else the first before it, never a skipped one.
  assert.equal(pickAuditFindingNextReviewId(["f-8", "f-9"], ["f-1"], new Set()), "f-8")
  assert.equal(pickAuditFindingNextReviewId(["f-8", "f-9"], ["f-1"], new Set(["f-8"])), "f-9", "approve-all decided f-8 as well")
  assert.equal(pickAuditFindingNextReviewId([], ["f-1", "f-2"], new Set()), "f-1", "none after it: the first before it")
  assert.equal(pickAuditFindingNextReviewId(["f-8"], ["f-1"], new Set(["f-8", "f-1"])), null, "none left: the tab is done")
  assert.equal(pickAuditFindingNextReviewId([], [], new Set()), null)
  // A link with the finding and no page opens the page that holds it; a page in the link wins.
  assert.deepEqual(resolveAuditFindingsListPage({ page: 1, pageSize: 25 }, { pageGiven: false, findingIndex: 27 }), { page: 2, pageSize: 25 })
  assert.deepEqual(resolveAuditFindingsListPage({ page: 1, pageSize: 25 }, { pageGiven: false, findingIndex: 24 }), { page: 1, pageSize: 25 })
  assert.deepEqual(resolveAuditFindingsListPage({ page: 3, pageSize: 25 }, { pageGiven: true, findingIndex: 0 }), { page: 3, pageSize: 25 })
  assert.deepEqual(resolveAuditFindingsListPage({ page: 1, pageSize: 50 }, { pageGiven: false, findingIndex: null }), { page: 1, pageSize: 50 })
})

test("the list's params: the status, the checked type, the finding, the way back and whether a page was asked for", () => {
  assert.deepEqual(parseAuditFindingsListFilters("th", {}), {
    status: "pending", search: "", roundId: null, findingType: null, findingId: null, returnTo: null, listPage: { page: 1, pageSize: 25 }, pageGiven: false,
  })
  assert.deepEqual(
    parseAuditFindingsListFilters("th", { status: "overdue", search: "  SNI ", roundId: " round-1 ", findingType: "wrong_branch", finding: "f-7", page: "2", pageSize: "50", returnTo: "/th/audit/rounds?status=open" }),
    { status: "overdue", search: "SNI", roundId: "round-1", findingType: null, findingId: "f-7", returnTo: "/th/audit/rounds?status=open", listPage: { page: 2, pageSize: 50 }, pageGiven: true },
  )
})

test("one href writer keeps returnTo on every link and writes the finding only when asked (P4-R12, P4-R18)", () => {
  const filters = parseAuditFindingsListFilters("th", { status: "action_open", search: "ที่ตั้ง", roundId: "round-1", findingType: "wrong_location", returnTo: "/th/audit/rounds?status=open" })
  const query = (href: string) => [...auditFindingsHrefQuery(href)]
  assert.equal(buildAuditFindingsHref("th", parseAuditFindingsListFilters("th", {})), "/th/audit/findings?status=pending")
  assert.deepEqual(query(buildAuditFindingsHref("th", filters)), [["status", "action_open"], ["search", "ที่ตั้ง"], ["roundId", "round-1"], ["findingType", "wrong_location"], ["returnTo", "/th/audit/rounds?status=open"]])
  assert.deepEqual(
    query(buildAuditFindingsHref("th", filters, { status: "follow_up", roundId: null, findingType: null, page: 3, pageSize: 50, finding: "f-7" })),
    [["status", "follow_up"], ["search", "ที่ตั้ง"], ["page", "3"], ["pageSize", "50"], ["finding", "f-7"], ["returnTo", "/th/audit/rounds?status=open"]],
  )
  assert.deepEqual(query(buildAuditFindingsHref("th", filters, { search: "", page: 1, pageSize: 25 })), [["status", "action_open"], ["roundId", "round-1"], ["findingType", "wrong_location"], ["returnTo", "/th/audit/rounds?status=open"]], "the search form's hidden inputs")
  assert.ok(buildAuditFindingsHref("th", filters).startsWith("/th/audit/findings?"))
})

test("the way back: the rounds list or a round page from returnTo, else the round, else the rounds list (P4-R12)", () => {
  assert.equal(normalizeAuditFindingsReturnTo("th", "/th/audit/rounds?status=open&page=2"), "/th/audit/rounds?status=open&page=2")
  assert.equal(normalizeAuditFindingsReturnTo("th", "/th/audit/rounds/round-1"), "/th/audit/rounds/round-1")
  assert.equal(normalizeAuditFindingsReturnTo("th", ["/th/audit/rounds", "/th/assets"]), "/th/audit/rounds")
  for (const value of [undefined, "", "/th/audit/rounds/round-1/scan", "/th/audit/rounds/", "/th/audit/rounds/new", "/en/audit/rounds", "/th/assets", "https://evil.example/th/audit/rounds", "//evil.example/th/audit/rounds"]) {
    assert.equal(normalizeAuditFindingsReturnTo("th", value), null, String(value))
  }
  assert.deepEqual(auditFindingsBack("th", { returnTo: "/th/audit/rounds?status=open", roundId: "round-1" }), { href: "/th/audit/rounds?status=open", target: "rounds" })
  assert.deepEqual(auditFindingsBack("th", { returnTo: "/th/audit/rounds/round-9", roundId: "round-1" }), { href: "/th/audit/rounds/round-9", target: "round" })
  assert.deepEqual(auditFindingsBack("th", { returnTo: null, roundId: "round-1" }), { href: "/th/audit/rounds/round-1", target: "round" })
  assert.deepEqual(auditFindingsBack("en", { returnTo: null, roundId: "a b" }), { href: "/en/audit/rounds/a%20b", target: "round" })
  assert.deepEqual(auditFindingsBack("th", { returnTo: null, roundId: null }), { href: "/th/audit/rounds", target: "rounds" })
})

test("the filter in use, in words: the tab, then its sub-chip or the bell's chip (Task 6's findings PDF title)", () => {
  assert.deepEqual(auditFindingFilterLabelKeys("pending"), ["auditFinding.status_pending"])
  assert.deepEqual(auditFindingFilterLabelKeys("follow_up"), ["auditFinding.tabFollowUp"])
  assert.deepEqual(auditFindingFilterLabelKeys("overdue"), ["auditFinding.tabFollowUp", "auditFinding.filterOverdue"])
  assert.deepEqual(auditFindingFilterLabelKeys("exception"), ["auditFinding.tabFollowUp", "auditFinding.status_exception"])
  assert.deepEqual(auditFindingFilterLabelKeys("action_due_soon"), ["auditFinding.tabFollowUp", "notifications.auditActionsDueSoon"])
  assert.deepEqual(auditFindingFilterLabelKeys("closed"), ["auditFinding.filterClosed"])
  for (const key of auditFindingCountedStatuses.flatMap((status) => auditFindingFilterLabelKeys(status))) {
    const [namespace, name] = key.split(".")
    assert.equal(typeof th[namespace][name], "string", key)
    assert.equal(typeof en[namespace][name], "string", key)
  }
})

test("the page and both exports read the type words of both languages through one helper (bug 19)", () => {
  const helper = read("src/lib/audit-finding-search-labels.ts")
  assert.match(helper, /routing\.locales\.map\(/)
  assert.match(helper, /getTranslations\(\{ locale, namespace: "auditFinding" \}\)/)
  assert.match(helper, /getTranslations\(\{ locale, namespace: "auditRound" \}\)/)
  assert.match(helper, /return buildAuditFindingTypeSearchLabels\(translators\)/)
  for (const path of ["src/app/[locale]/(dashboard)/audit/findings/page.tsx", "src/app/api/audit-findings/export/route.ts", "src/app/api/audit-findings/export-pdf/route.ts"]) {
    assert.match(read(path), /const typeSearchLabels = await getAuditFindingTypeSearchLabels\(\)/, path)
  }
})
```

- [ ] **Step 2: Write the failing data test**

`tests/audit-findings-page-data.test.ts` (new). The stand-in and the resolve hook are `tests/audit-round-page-data.test.ts:1-46`, with the global renamed `__findingsPageData`. Only `@/lib/db` is stubbed. The data module imports nothing else that reads a session or next-intl (the page passes the rules and the type words).

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

import {
  auditFindingCountedStatuses,
  auditFindingReviewableWhere,
  auditFindingsAfterWhere,
  auditFindingsBeforeWhere,
  auditFindingsListOrderBy,
  buildAuditFindingWhere,
  parseAuditFindingsListFilters,
  type AuditFindingStatus,
} from "../src/lib/audit-finding-filters.ts"
import { DEFAULT_WAITING_WORK_RULES, openAuditActionsWhere, startOfBangkokDay } from "../src/lib/waiting-work-rules.ts"

type Args = { where?: unknown; include?: unknown; select?: unknown; orderBy?: unknown; skip?: number; take?: number }
type Call = { call: string; args: Args }
const state: { calls: Call[]; respond: (call: string, args: Args) => unknown } = { calls: [], respond: () => undefined }
Object.assign(globalThis, { __findingsPageData: state })

const stubs = new Map<string, string>([
  ["@/lib/db", `
    const state = () => globalThis.__findingsPageData
    const model = (name) => new Proxy({}, {
      get: (_, method) => async (args) => {
        const call = name + "." + String(method)
        state().calls.push({ call, args: args ?? {} })
        const value = state().respond(call, args ?? {})
        if (value !== undefined) return value
        if (method === "count") return 0
        if (method === "findMany" || method === "groupBy") return []
        return null
      },
    })
    export const prisma = new Proxy({}, { get: (_, key) => model(String(key)) })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const { getAuditFindingsPageData } = await import(pathToFileURL("src/lib/audit-findings-page-data.ts").href) as typeof import("../src/lib/audit-findings-page-data.ts")

const now = new Date("2026-10-28T03:00:00.000Z")
const typeSearchLabels = { wrong_location: ["ที่ตั้ง", "ที่ตั้งไม่ตรง"] }
const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
// The list's own read is the findMany that pages; the next finding's candidates select the id alone.
const listCalls = () => callsTo("auditFinding.findMany").filter((args) => args.skip !== undefined)
const nextCandidateCalls = () => callsTo("auditFinding.findMany").filter((args) => isDeepStrictEqual(args.select, { id: true }))
const load = (params: Record<string, string> = {}, options: { canApprove?: boolean; userId?: string } = {}) => {
  const filters = parseAuditFindingsListFilters("th", params)
  return getAuditFindingsPageData({ locale: "th", filters, user: { id: options.userId ?? "user-head" }, canApprove: options.canApprove ?? true, typeSearchLabels, rules: DEFAULT_WAITING_WORK_RULES, now })
}
const whereFor = (params: Record<string, string>, status: AuditFindingStatus) => {
  const filters = parseAuditFindingsListFilters("th", params)
  return buildAuditFindingWhere({ status, search: filters.search, roundId: filters.roundId, findingType: filters.findingType, now, rules: DEFAULT_WAITING_WORK_RULES, typeSearchLabels })
}
const parent = { id: "asset-pc", assetTag: "GRL-COM-26-0001", name: "คอมพิวเตอร์ตั้งโต๊ะ" }
const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, auditRoundId: "round-1", assetId: `asset-${id}`, findingType: "wrong_location", expectedValue: "loc-1", actualValue: "loc-2",
  reportedBy: "user-auditor", reportedAt: new Date("2026-10-20T03:00:00.000Z"), reviewStatus: "pending", actionStatus: "not_required",
  actionOwnerId: null, actionDueDate: null, actionPlan: null,
  auditRound: { id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT", status: "open" },
  auditItem: { auditStatus: "reviewed", reconcileStatus: "pending" },
  asset: { id: `asset-${id}`, assetTag: `GRL-${id}`, name: `เครื่อง ${id}`, installedInLinks: [] },
  actionOwner: null,
  ...overrides,
})

beforeEach(() => {
  state.calls = []
  state.respond = () => undefined
})

test("each tab and sub-chip counts with the list's own where, within the round, the type and the search; the list's total is its status's count (spec §5)", async () => {
  const params = { status: "action_open", roundId: "round-1", findingType: "wrong_location", search: "ที่ตั้ง" }
  state.respond = (call, args) => {
    if (call !== "auditFinding.count") return undefined
    const index = auditFindingCountedStatuses.findIndex((status) => isDeepStrictEqual(args.where, whereFor(params, status)))
    return index === -1 ? undefined : 10 + index
  }
  const data = await load(params)
  assert.deepEqual(data.counts, { pending: 10, approved: 11, rejected: 12, follow_up: 13, closed: 14, all: 15, action_open: 16, overdue: 17, exception: 18 })
  assert.equal(data.total, data.counts.action_open)
  const [list] = listCalls()
  assert.deepEqual(list.where, whereFor(params, "action_open"))
  assert.deepEqual(list.orderBy, auditFindingsListOrderBy)
  assert.deepEqual([list.skip, list.take], [0, 25])
  // One count per tab and sub-chip, and the viewer's decidable count (P4-R18): no other.
  assert.equal(callsTo("auditFinding.count").length, auditFindingCountedStatuses.length + 1)
  assert.ok(callsTo("auditFinding.count").some((args) => isDeepStrictEqual(args.where, { AND: [whereFor(params, "action_open"), auditFindingReviewableWhere("user-head")] })))
  assert.equal(data.reviewableTotal, 0)
  assert.equal(callsTo("employee.findMany").filter((args) => isDeepStrictEqual(args.where, { isActive: true })).length, 1, "the plan dialog's owners for audit:approve (P4-R21)")
  assert.equal(data.loadedAt, now)
  assert.deepEqual(data.back, { href: "/th/audit/rounds/round-1", target: "round" })
  assert.equal(data.panel, null)
})

test("a bell kind's list counts itself; the tab and sub-chip counts stay the page's", async () => {
  const bell = openAuditActionsWhere(startOfBangkokDay(now), DEFAULT_WAITING_WORK_RULES)
  state.respond = (call, args) => (call === "auditFinding.count" && isDeepStrictEqual(args.where, bell) ? 4 : undefined)
  const data = await load({ status: "action_not_due" })
  assert.equal(data.total, 4)
  assert.deepEqual(listCalls()[0].where, bell)
  assert.equal(callsTo("auditFinding.count").length, auditFindingCountedStatuses.length + 2, "the bell's own count and the decidable count")
})

test("rows carry the component's parent, the owner's name (never the id), the values in words, who reported them, whether the viewer may decide them, and their evidence (decision 6, P4-R11, P4-R20)", async () => {
  const uploadedAt = new Date("2026-10-21T03:00:00.000Z")
  state.respond = (call) => {
    if (call === "auditFinding.findMany") {
      return [
        row("f-1", { asset: { id: "asset-f-1", assetTag: "GRL-RAM-01", name: "แรม 16GB", installedInLinks: [{ parentAsset: parent }] }, actionOwnerId: "emp-5", actionOwner: { code: "E005", fullNameTh: "สมชาย ใจดี" } }),
        row("f-2", { reportedBy: "user-head", actualValue: null }),
        row("f-3", { auditRound: { id: "round-9", auditNo: "AUD-2026-0001", name: "ปิดแล้ว", status: "closed" } }),
      ]
    }
    if (call === "attachment.findMany") return [{ id: "att-1", referenceId: "f-1", originalName: "photo.jpg", fileType: "image/jpeg", fileSize: 1024, uploadedAt }]
    if (call === "location.findMany") return [{ id: "loc-1", code: "A01", name: "ห้อง IT" }, { id: "loc-2", code: "B01", name: "บัญชี" }]
    return undefined
  }
  const data = await load({ status: "all" })
  assert.deepEqual(data.rows.map((entry) => [entry.expectedLabel, entry.actualLabel]), [["A01 - ห้อง IT", "B01 - บัญชี"], ["A01 - ห้อง IT", null], ["A01 - ห้อง IT", "B01 - บัญชี"]], "words, and null for an empty value, never a typed dash")
  const [list] = listCalls()
  assert.deepEqual(list.include, {
    auditRound: { select: { id: true, auditNo: true, name: true, status: true } },
    auditItem: { select: { auditStatus: true, reconcileStatus: true } },
    asset: {
      select: {
        id: true, assetTag: true, name: true,
        installedInLinks: { where: { status: "installed", removedAt: null }, select: { parentAsset: { select: { id: true, assetTag: true, name: true } } } },
      },
    },
    actionOwner: { select: { code: true, fullNameTh: true } },
  })
  assert.deepEqual(data.rows.map((entry) => [entry.id, entry.parent, entry.ownerLabel, entry.reportedByViewer, entry.reviewable]), [
    ["f-1", parent, "E005 - สมชาย ใจดี", false, true],
    ["f-2", null, null, true, false],
    ["f-3", null, null, false, false],
  ])
  assert.deepEqual(data.rows[0].evidence, [{ id: "att-1", originalName: "photo.jpg", fileType: "image/jpeg", fileSize: 1024, uploadedAt }])
  assert.deepEqual(data.rows[1].evidence, [])
  const [attachments] = callsTo("attachment.findMany")
  assert.deepEqual(attachments.where, { module: "audit_finding", referenceId: { in: ["f-1", "f-2", "f-3"] }, isActive: true })
  assert.deepEqual(attachments.orderBy, { uploadedAt: "desc" })
})

const chosen = {
  ...row("f-7", { assetId: "asset-1", asset: { id: "asset-1", assetTag: "GRL-COM-26-0036", name: "Laptop", installedInLinks: [] } }),
  auditItem: {
    auditStatus: "reviewed", reconcileStatus: "pending",
    expectedLocationId: "loc-1", expectedCustodianId: "emp-1", expectedDepartmentId: "dept-1", expectedConditionId: "cond-good",
    actualLocationId: "loc-2", actualCustodianId: "emp-1", actualDepartmentId: "dept-1", actualConditionId: "cond-good",
    scannedAt: new Date("2026-10-20T02:00:00.000Z"), scannedBy: "user-auditor", remark: "อยู่ห้องบัญชี",
  },
}

test("the chosen finding loads off the page; a link with it and no page opens the page that holds it; k จาก N and the next finding count what the viewer may decide (P4-R18, P4-R20)", async () => {
  const params = { status: "pending", roundId: "round-1", finding: "f-7" }
  const list = whereFor(params, "pending")
  const reviewable = { AND: [list, auditFindingReviewableWhere("user-head")] }
  const siblingRows = [
    { id: "f-9", findingType: "wrong_department", assetId: "asset-1", expectedValue: "dept-1", actualValue: "dept-2", reviewStatus: "pending", reportedBy: "user-auditor" },
    { id: "f-10", findingType: "wrong_condition", assetId: "asset-1", expectedValue: "cond-good", actualValue: "cond-fair", reviewStatus: "pending", reportedBy: "user-head" },
  ]
  state.respond = (call, args) => {
    if (call === "auditFinding.findUnique") return chosen
    if (call === "location.findMany") return [{ id: "loc-2", code: "B01", name: "บัญชี" }]
    if (call === "user.findMany") return [{ id: "user-auditor", username: "somsri", displayName: "สมศรี" }]
    if (call === "auditFinding.findMany" && (args.where as { assetId?: string }).assetId === "asset-1") return siblingRows
    // The candidates after f-7: its sibling f-9 first, then f-8; nothing before it is asked for once one is found.
    if (call === "auditFinding.findMany" && isDeepStrictEqual(args.where, { AND: [reviewable, auditFindingsAfterWhere(chosen)] })) return [{ id: "f-9" }, { id: "f-8" }]
    if (call === "auditFinding.findMany" && isDeepStrictEqual(args.where, { AND: [reviewable, auditFindingsBeforeWhere(chosen)] })) return [{ id: "f-1" }]
    if (call !== "auditFinding.count") return undefined
    if (isDeepStrictEqual(args.where, { AND: [list, { id: "f-7" }] })) return 1
    if (isDeepStrictEqual(args.where, { AND: [list, auditFindingsBeforeWhere(chosen)] })) return 27
    if (isDeepStrictEqual(args.where, reviewable)) return 14
    if (isDeepStrictEqual(args.where, { AND: [reviewable, { id: "f-7" }] })) return 1
    if (isDeepStrictEqual(args.where, { AND: [reviewable, auditFindingsBeforeWhere(chosen)] })) return 2
    return undefined
  }
  const data = await load(params)
  assert.deepEqual(callsTo("auditFinding.findUnique")[0].where, { id: "f-7" })
  assert.deepEqual(data.listPage, { page: 2, pageSize: 25 }, "the 28th row of the list is on page 2")
  assert.equal(listCalls()[0].skip, 25)
  assert.ok(data.panel)
  assert.equal(data.panel.inList, true)
  assert.equal(data.panel.readOnly, false)
  assert.equal(data.reviewableTotal, 14)
  // The next finding is the server's (P4-R18): its link carries the finding and no page.
  assert.deepEqual(data.panel.queue, {
    position: 3,
    total: 14,
    nextHref: "/th/audit/findings?status=pending&roundId=round-1&finding=f-9",
    nextHrefAfterSiblings: "/th/audit/findings?status=pending&roundId=round-1&finding=f-8",
  })
  // Enough candidates to step over every sibling the viewer may approve with it (one here), in the list's order.
  assert.deepEqual(nextCandidateCalls().map((args) => [args.orderBy, args.take]), [[auditFindingsListOrderBy, 2], [auditFindingsListOrderBy, 2]])
  // The asset's other pending findings in this round, the viewer's own marked.
  assert.deepEqual(callsTo("auditFinding.findMany").find((args) => (args.where as { assetId?: string }).assetId)?.where, { auditRoundId: "round-1", assetId: "asset-1", reviewStatus: "pending", id: { not: "f-7" } })
  assert.deepEqual(data.panel.siblings, [{ ...siblingRows[0], reportedByViewer: false }, { ...siblingRows[1], reportedByViewer: true }])
  assert.equal(data.panel.reporterLabel, "สมศรี (somsri)")
  assert.equal(data.panel.scannedByLabel, "สมศรี (somsri)")
  assert.equal(data.panel.finding.auditItem.remark, "อยู่ห้องบัญชี")
  // The panel's finding carries the row's extras under the rows' names (P4-R20): Task 4 reads them, never a second loader.
  assert.deepEqual(
    [data.panel.finding.parent, data.panel.finding.ownerLabel, data.panel.finding.evidence, data.panel.finding.reportedByViewer, data.panel.finding.reviewable, data.panel.finding.actualLabel],
    [null, null, [], false, true, "B01 - บัญชี"],
  )
  assert.equal(data.valueLabels.get("loc-2"), "B01 - บัญชี")
  assert.equal(data.panel.labels, data.valueLabels, "the panel reads the same labels")
})

test("the next finding wraps to the first before the decided one, and none left means the tab is done (P4-R18)", async () => {
  const params = { status: "pending", finding: "f-7" }
  const reviewable = { AND: [whereFor(params, "pending"), auditFindingReviewableWhere("user-head")] }
  let before: { id: string }[] = [{ id: "f-1" }]
  state.respond = (call, args) => {
    if (call === "auditFinding.findUnique") return chosen
    if (call === "auditFinding.findMany" && isDeepStrictEqual(args.where, { AND: [reviewable, auditFindingsBeforeWhere(chosen)] })) return before
    return undefined
  }
  assert.equal((await load(params)).panel?.queue?.nextHref, "/th/audit/findings?status=pending&finding=f-1")
  before = []
  const done = await load(params)
  assert.equal(done.panel?.queue?.nextHref, null)
  assert.equal(done.panel?.queue?.nextHrefAfterSiblings, null)
})

test("a page in the link wins; a finding outside the list still opens, with no place in the queue; no reviewer, no queue and no owner list", async () => {
  state.respond = (call) => (call === "auditFinding.findUnique" ? { ...chosen, reportedBy: "user-head", auditItem: { ...chosen.auditItem, scannedBy: "user-gone" } } : undefined)
  const outside = await load({ status: "approved", finding: "f-7", page: "3" })
  assert.deepEqual(outside.listPage, { page: 3, pageSize: 25 })
  assert.ok(outside.panel)
  assert.equal(outside.panel.inList, false)
  assert.equal(outside.panel.queue?.position, null)
  assert.equal(outside.panel.scannedByLabel, null, "a user who is gone reads as nothing, never an id")
  assert.equal(outside.panel.finding.reportedByViewer, true)

  state.calls = []
  const viewer = await load({ finding: "f-7" }, { canApprove: false })
  assert.equal(viewer.panel?.queue, null)
  assert.equal(viewer.reviewableTotal, null)
  assert.equal(nextCandidateCalls().length, 0)
  // The value labels still read employees by id; only the owner list (where isActive) follows audit:approve (P4-R21).
  assert.equal(callsTo("employee.findMany").filter((args) => isDeepStrictEqual(args.where, { isActive: true })).length, 0, "no owner list without audit:approve (P4-R21)")
  assert.deepEqual(viewer.employees, [])

  state.respond = () => undefined
  state.calls = []
  assert.equal((await load({ finding: "f-gone" })).panel, null)
})

test("รอบ: lists every active round that is not cancelled; a chosen round is named; returnTo is the way back", async () => {
  state.respond = (call) => {
    if (call === "auditRound.findMany") return [{ id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT" }]
    if (call === "auditRound.findUnique") return { id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT" }
    return undefined
  }
  const data = await load({ roundId: "round-1", returnTo: "/th/audit/rounds?status=open" })
  assert.deepEqual(callsTo("auditRound.findMany")[0], { where: { isActive: true, status: { not: "cancelled" } }, select: { id: true, auditNo: true, name: true }, orderBy: [{ startDate: "desc" }, { id: "asc" }] })
  assert.deepEqual(callsTo("auditRound.findUnique")[0], { where: { id: "round-1" }, select: { id: true, auditNo: true, name: true } })
  assert.deepEqual(data.filterRound, { id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT" })
  assert.equal(data.roundOptions.length, 1)
  assert.deepEqual(data.back, { href: "/th/audit/rounds?status=open", target: "rounds" })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/audit-finding-tabs.test.ts tests/audit-findings-page-data.test.ts`

Expected: FAIL. The new exports are missing (`auditFindingTabs` is not exported), and `src/lib/audit-findings-page-data.ts` does not exist (ERR_MODULE_NOT_FOUND).

- [ ] **Step 4: Implement the rules**

`src/lib/audit-finding-filters.ts`. The imports `:1-9` become:

```ts
// The findings page's rules (group 2 spec §5, §10; plan 4 Task 2): its statuses, one where per status in one AND list,
// the type words of the search, the list's order, the review queue's where and the one link writer. Pure and
// client-safe: `import type` and relative .ts imports only, so node --test and client parts import it.
import type { Prisma } from "@prisma/client"
import { appendListPage, parseListPage, type ListPageState } from "./list-pagination.ts"
import { normalizeAuditFindingsReturnTo } from "./operational-return-navigation.ts"
import { auditRoundCoverageWhere, auditRoundOperationalWhere } from "./audit-round-status.ts"
import {
  DEFAULT_WAITING_WORK_RULES,
  auditActionsDueSoonWhere,
  openAuditActionsWhere,
  startOfBangkokDay,
  type WaitingWorkRules,
} from "./waiting-work-rules.ts"
```

`:11-51` become:

```ts
// The page's eight quick filters until Task 3 draws the six tabs (plan 4 Task 3 removes this list).
export const auditFindingResolutionStatuses = [
  "pending",
  "action_open",
  "overdue",
  "closed",
  "approved",
  "rejected",
  "exception",
  "all",
] as const

// The bell's two action kinds (group 1 spec §6.3): reached by a link only, never a tab.
export const auditFindingWaitingStatuses = ["action_not_due", "action_due_soon"] as const

export type AuditFindingWaitingStatus = (typeof auditFindingWaitingStatuses)[number]

// The six tabs (spec §10). ต้องติดตาม is the union of today's open follow-ups; its sub-chips are ต้องแก้ไข, เกินกำหนด (part of
// ต้องแก้ไข) and ต้องตรวจสอบพิเศษ (P4-R3).
export const auditFindingTabs = ["pending", "approved", "rejected", "followUp", "closed", "all"] as const

export type AuditFindingTab = (typeof auditFindingTabs)[number]

export const auditFindingFollowUpChips = ["action_open", "overdue", "exception"] as const

export type AuditFindingFollowUpChip = (typeof auditFindingFollowUpChips)[number]

// What the page counts: each tab, then each sub-chip. A bell kind's list counts itself.
export const auditFindingCountedStatuses = ["pending", "approved", "rejected", "follow_up", "closed", "all", "action_open", "overdue", "exception"] as const

export type AuditFindingCountedStatus = (typeof auditFindingCountedStatuses)[number]

export type AuditFindingCounts = Readonly<Record<AuditFindingCountedStatus, number>>

// Every value a findings URL's status carries: a tab, a sub-chip or a bell kind. The old values are sub-chips or the
// closed tab, so the bell's, the round page's and the rounds list's links keep their where (P4-R3).
export type AuditFindingStatus = AuditFindingCountedStatus | AuditFindingWaitingStatus

export type AuditFindingResolutionStatus = AuditFindingStatus

export const auditFindingTabStatus: Readonly<Record<AuditFindingTab, AuditFindingCountedStatus>> = Object.freeze({
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  followUp: "follow_up",
  closed: "closed",
  all: "all",
})

export type AuditFindingStatusView = { tab: AuditFindingTab; chip: AuditFindingFollowUpChip | null; waiting: AuditFindingWaitingStatus | null }

const statusViews: Readonly<Record<AuditFindingStatus, AuditFindingStatusView>> = Object.freeze({
  pending: { tab: "pending", chip: null, waiting: null },
  approved: { tab: "approved", chip: null, waiting: null },
  rejected: { tab: "rejected", chip: null, waiting: null },
  follow_up: { tab: "followUp", chip: null, waiting: null },
  closed: { tab: "closed", chip: null, waiting: null },
  all: { tab: "all", chip: null, waiting: null },
  action_open: { tab: "followUp", chip: "action_open", waiting: null },
  overdue: { tab: "followUp", chip: "overdue", waiting: null },
  exception: { tab: "followUp", chip: "exception", waiting: null },
  action_not_due: { tab: "followUp", chip: null, waiting: "action_not_due" },
  action_due_soon: { tab: "followUp", chip: null, waiting: "action_due_soon" },
})

export function auditFindingStatusView(status: AuditFindingStatus): AuditFindingStatusView {
  return statusViews[status]
}

export const openAuditFindingActionStatuses = ["planned", "in_progress", "done"] as const

export function isAuditFindingWaitingStatus(status: string): status is AuditFindingWaitingStatus {
  return auditFindingWaitingStatuses.includes(status as AuditFindingWaitingStatus)
}

export function resolveAuditFindingStatus(status?: string | null): AuditFindingStatus {
  return status && Object.hasOwn(statusViews, status) ? (status as AuditFindingStatus) : "pending"
}

export function isOpenAuditFindingActionStatus(status: string | null | undefined) {
  return openAuditFindingActionStatuses.includes(status as (typeof openAuditFindingActionStatuses)[number])
}
```

`getAuditFindingToday` (`:53-57`) stays. `:59-126` become:

```ts
// The six finding types, in the เรื่อง column's order (spec §10), and the round page's short word of each (auditRound
// namespace): ผู้ถือครอง / ที่ตั้ง / แผนก / สภาพ / ไม่พบ / นอกขอบเขต.
export const auditFindingTypes = ["wrong_custodian", "wrong_location", "wrong_department", "wrong_condition", "not_found", "out_of_scope"] as const

export type AuditFindingType = (typeof auditFindingTypes)[number]

export const auditFindingTypeShortLabelKeys: Readonly<Record<AuditFindingType, string>> = Object.freeze({
  wrong_custodian: "differenceField_custodian",
  wrong_location: "differenceField_location",
  wrong_department: "differenceField_department",
  wrong_condition: "differenceField_condition",
  not_found: "notFound",
  out_of_scope: "outOfScope",
})

/** เรื่อง: a known type, else none: an unknown value never filters and never reaches the screen. */
export function resolveAuditFindingType(value?: string | null): AuditFindingType | null {
  const type = value?.trim()
  return type && (auditFindingTypes as readonly string[]).includes(type) ? (type as AuditFindingType) : null
}

export type AuditFindingTypeSearchLabels = Readonly<Partial<Record<AuditFindingType, readonly string[]>>>

export type AuditFindingTypeTranslators = { finding: (key: string) => string; round: (key: string) => string }

// Each type's words in every language given: its short word and its long label (auditFinding.type_*), once each.
export function buildAuditFindingTypeSearchLabels(translators: readonly AuditFindingTypeTranslators[]): AuditFindingTypeSearchLabels {
  return Object.fromEntries(
    auditFindingTypes.map((type) => [type, [...new Set(translators.flatMap((t) => [t.round(auditFindingTypeShortLabelKeys[type]), t.finding(`type_${type}`)]))]]),
  )
}

// Bug 19: a field's name finds its findings ("ที่ตั้ง" finds ที่ตั้งไม่ตรง); a code is not a word, so it finds none.
export function auditFindingTypesMatchingSearch(search: string, labels: AuditFindingTypeSearchLabels = {}): AuditFindingType[] {
  const text = search.trim().toLocaleLowerCase()
  if (!text) return []
  return auditFindingTypes.filter((type) => (labels[type] ?? []).some((label) => label.toLocaleLowerCase().includes(text)))
}

function auditFindingSearchConditions(searchText: string, typeSearchLabels?: AuditFindingTypeSearchLabels): Prisma.AuditFindingWhereInput[] {
  const types = auditFindingTypesMatchingSearch(searchText, typeSearchLabels)
  return [
    { asset: { assetTag: { contains: searchText } } },
    { asset: { name: { contains: searchText } } },
    { auditRound: { auditNo: { contains: searchText } } },
    { auditRound: { name: { contains: searchText } } },
    ...(types.length > 0 ? [{ findingType: { in: types } }] : []),
  ]
}

type AuditFindingSingleStatus = Exclude<AuditFindingCountedStatus, "follow_up">
type AuditFindingStatusPart = { where: Prisma.AuditFindingWhereInput; scope: "operational" | "coverage" }

// Each status's own condition and today's round scope (audit-finding-filters.ts:101-118 at 704f2b26): the work still to
// do counts open rounds only; what was decided or closed counts every round but a cancelled one.
function auditFindingStatusPart(status: AuditFindingSingleStatus, now: Date): AuditFindingStatusPart {
  switch (status) {
    case "pending":
      return { where: { reviewStatus: "pending" }, scope: "operational" }
    case "action_open":
      return { where: { actionStatus: { in: [...openAuditFindingActionStatuses] } }, scope: "operational" }
    case "overdue":
      return { where: { actionStatus: { in: [...openAuditFindingActionStatuses] }, actionDueDate: { lt: getAuditFindingToday(now) } }, scope: "operational" }
    case "closed":
      return { where: { actionStatus: "closed" }, scope: "coverage" }
    case "approved":
    case "rejected":
    case "exception":
      return { where: { reviewStatus: status }, scope: "coverage" }
    case "all":
      return { where: {}, scope: "coverage" }
  }
}

// A round drops the scope, as every status does today: the round's own findings, whatever its status.
function scopedAuditFindingWhere(part: AuditFindingStatusPart, roundId: string | null | undefined): Prisma.AuditFindingWhereInput {
  if (roundId) return { ...part.where }
  return { ...part.where, auditRound: { isActive: true, status: part.scope === "operational" ? auditRoundOperationalWhere : auditRoundCoverageWhere } }
}

export function buildAuditFindingWhere({
  status,
  search,
  roundId,
  findingType,
  now = new Date(),
  rules = DEFAULT_WAITING_WORK_RULES,
  typeSearchLabels,
}: {
  status?: string | null
  search?: string | null
  roundId?: string | null
  findingType?: string | null
  now?: Date
  rules?: WaitingWorkRules
  typeSearchLabels?: AuditFindingTypeSearchLabels
}): Prisma.AuditFindingWhereInput {
  const resolvedStatus = resolveAuditFindingStatus(status)
  const searchText = search?.trim()
  const type = resolveAuditFindingType(findingType)
  const searchGroups: Prisma.AuditFindingWhereInput[] = searchText ? [{ OR: auditFindingSearchConditions(searchText, typeSearchLabels) }] : []

  // The bell's own where, narrowed under AND so a search never overwrites the OR the rule holds.
  if (isAuditFindingWaitingStatus(resolvedStatus)) {
    const today = startOfBangkokDay(now)
    const base = resolvedStatus === "action_not_due" ? openAuditActionsWhere(today, rules) : auditActionsDueSoonWhere(today, rules)
    const narrowing: Prisma.AuditFindingWhereInput[] = [
      ...(roundId ? [{ auditRoundId: roundId }] : []),
      ...(type ? [{ findingType: type }] : []),
      ...searchGroups,
    ]
    return narrowing.length ? { AND: [base, ...narrowing] } : base
  }

  // Plain conditions are keys of their own; each OR (ต้องติดตาม's union, the search) is one entry of AND, so none
  // overwrites another (FP §1). With no OR the where has no AND, as the round page's and the bell's own wheres.
  const groups: Prisma.AuditFindingWhereInput[] = []
  let where: Prisma.AuditFindingWhereInput
  if (resolvedStatus === "follow_up") {
    groups.push({ OR: [scopedAuditFindingWhere(auditFindingStatusPart("action_open", now), roundId), scopedAuditFindingWhere(auditFindingStatusPart("exception", now), roundId)] })
    where = {}
  } else {
    where = scopedAuditFindingWhere(auditFindingStatusPart(resolvedStatus, now), roundId)
  }
  if (roundId) where.auditRoundId = roundId
  if (type) where.findingType = type
  groups.push(...searchGroups)
  return groups.length > 0 ? { ...where, AND: groups } : where
}

// The list's order: newest report first, the id breaking ties, so no finding shows on two pages.
export const auditFindingsListOrderBy: Prisma.AuditFindingOrderByWithRelationInput[] = [{ reportedAt: "desc" }, { id: "asc" }]

// The findings the viewer may decide: the review route's own refusals (route.ts:49-52, :114-119) as a where. The
// panel's "k จาก N" and its next finding count these within the list (P4-R18).
export function auditFindingReviewableWhere(userId: string): Prisma.AuditFindingWhereInput {
  return { reviewStatus: "pending", reportedBy: { not: userId }, auditRound: { status: auditRoundOperationalWhere } }
}

/** The rows before a finding in the list's order. */
export function auditFindingsBeforeWhere(finding: { id: string; reportedAt: Date }): Prisma.AuditFindingWhereInput {
  return { OR: [{ reportedAt: { gt: finding.reportedAt } }, { reportedAt: finding.reportedAt, id: { lt: finding.id } }] }
}

/** The rows after a finding in the list's order. */
export function auditFindingsAfterWhere(finding: { id: string; reportedAt: Date }): Prisma.AuditFindingWhereInput {
  return { OR: [{ reportedAt: { lt: finding.reportedAt } }, { reportedAt: finding.reportedAt, id: { gt: finding.id } }] }
}

// The next finding after a decision (P4-R18): the first the viewer may decide after the decided one in the list's
// order, else the first such one before it; none means the tab is done. skip holds what the same press decided too
// (the siblings of "อนุมัติทุกช่องของทรัพย์สินนี้").
export function pickAuditFindingNextReviewId(after: readonly string[], before: readonly string[], skip: ReadonlySet<string>): string | null {
  return after.find((id) => !skip.has(id)) ?? before.find((id) => !skip.has(id)) ?? null
}

export type AuditFindingsListFilters = {
  status: AuditFindingStatus
  search: string
  roundId: string | null
  findingType: AuditFindingType | null
  /** ?finding=: the finding the panel shows (spec §10). */
  findingId: string | null
  /** The way back, or null (P4-R12). */
  returnTo: string | null
  listPage: ListPageState
  /** Whether the link asked for a page: without one, a link with a finding opens the page that holds it (P4-R18). */
  pageGiven: boolean
}

export type AuditFindingsListParams = Readonly<Record<string, string | string[] | undefined>>

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function parseAuditFindingsListFilters(locale: string, params: AuditFindingsListParams): AuditFindingsListFilters {
  const text = (key: string) => firstValue(params[key])?.trim() ?? ""
  return {
    status: resolveAuditFindingStatus(text("status")),
    search: text("search"),
    roundId: text("roundId") || null,
    findingType: resolveAuditFindingType(text("findingType")),
    findingId: text("finding") || null,
    returnTo: normalizeAuditFindingsReturnTo(locale, params.returnTo),
    listPage: parseListPage({ page: params.page, pageSize: params.pageSize }),
    pageGiven: firstValue(params.page) !== undefined,
  }
}

export function resolveAuditFindingsListPage(listPage: ListPageState, { pageGiven, findingIndex }: { pageGiven: boolean; findingIndex: number | null }): ListPageState {
  if (pageGiven || findingIndex === null) return listPage
  return { ...listPage, page: Math.floor(findingIndex / listPage.pageSize) + 1 }
}

export type AuditFindingsHrefFilters = Pick<AuditFindingsListFilters, "status" | "search" | "roundId" | "findingType" | "returnTo">

export type AuditFindingsHrefOverrides = Partial<Pick<AuditFindingsListFilters, "status" | "search" | "roundId" | "findingType">> & {
  page?: number
  pageSize?: number
  finding?: string | null
}

// The one writer of a findings link: the page's tabs, chips, filters, pager, rows and next finding (P4-R12, P4-R18).
// returnTo rides on every link; the finding only where a caller asks for it.
export function buildAuditFindingsHref(locale: string, filters: AuditFindingsHrefFilters, overrides: AuditFindingsHrefOverrides = {}): string {
  const status = overrides.status ?? filters.status
  const search = overrides.search !== undefined ? overrides.search : filters.search
  const roundId = overrides.roundId !== undefined ? overrides.roundId : filters.roundId
  const findingType = overrides.findingType !== undefined ? overrides.findingType : filters.findingType
  const params = new URLSearchParams()
  params.set("status", status)
  if (search) params.set("search", search)
  if (roundId) params.set("roundId", roundId)
  if (findingType) params.set("findingType", findingType)
  // page only above 1 and pageSize only when it is not 25, so every default link stays as it was (spec 2B B4).
  appendListPage(params, { page: overrides.page, pageSize: overrides.pageSize })
  if (overrides.finding) params.set("finding", overrides.finding)
  if (filters.returnTo) params.set("returnTo", filters.returnTo)
  return `/${locale}/audit/findings?${params.toString()}`
}

// The query of a findings link: the search form's hidden inputs read it, so the one writer decides every name.
export function auditFindingsHrefQuery(href: string): URLSearchParams {
  return new URLSearchParams(href.split("#")[0].split("?")[1] ?? "")
}

export type AuditFindingsBack = { href: string; target: "round" | "rounds" }

// The back link (P4-R12): where the user came from, else the round the list is narrowed to, else the rounds list. The
// target picks its words: "กลับไปหน้ารอบ" for a round page, "กลับไปรอบตรวจนับ" for the rounds list (Task 3).
export function auditFindingsBack(locale: string, filters: Pick<AuditFindingsListFilters, "returnTo" | "roundId">): AuditFindingsBack {
  const rounds = `/${locale}/audit/rounds`
  // normalizeAuditFindingsReturnTo accepted only the rounds list or one round's page.
  if (filters.returnTo) return { href: filters.returnTo, target: filters.returnTo.split(/[?#]/)[0] === rounds ? "rounds" : "round" }
  return filters.roundId ? { href: `${rounds}/${encodeURIComponent(filters.roundId)}`, target: "round" } : { href: rounds, target: "rounds" }
}

// The filter in use as message keys, in display order: the tab, then its sub-chip or the bell's chip. The findings
// PDF's title reads them (Task 6), so the file names the filter as the page does, never by its URL value.
const auditFindingTabLabelKeys: Readonly<Record<AuditFindingTab, string>> = Object.freeze({
  pending: "auditFinding.status_pending",
  approved: "auditFinding.status_approved",
  rejected: "auditFinding.status_rejected",
  followUp: "auditFinding.tabFollowUp",
  closed: "auditFinding.filterClosed",
  all: "auditFinding.status_all",
})
const auditFindingChipLabelKeys: Readonly<Record<AuditFindingFollowUpChip | AuditFindingWaitingStatus, string>> = Object.freeze({
  action_open: "auditFinding.filterActionOpen",
  overdue: "auditFinding.filterOverdue",
  exception: "auditFinding.status_exception",
  action_not_due: "notifications.openAuditActions",
  action_due_soon: "notifications.auditActionsDueSoon",
})

export function auditFindingFilterLabelKeys(status: AuditFindingStatus): string[] {
  const view = auditFindingStatusView(status)
  const chip = view.chip ?? view.waiting
  return [auditFindingTabLabelKeys[view.tab], ...(chip ? [auditFindingChipLabelKeys[chip]] : [])]
}
```

`src/lib/operational-return-navigation.ts`, after `normalizeDisposalBatchReturnTo` (`:38-42`):

```ts
// The findings page's way back (group 2 plan 4, P4-R12): the rounds list with its filters, or one round's page, the pages
// that link here (not the create page). Anything else is no way back (null), and the page falls back to the round or
// the rounds list.
export function normalizeAuditFindingsReturnTo(locale: string, value: ReturnToParam): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null

  try {
    const url = new URL(raw, "http://asset.local")
    const rounds = `/${locale}/audit/rounds`
    const roundId = url.pathname.startsWith(`${rounds}/`) ? url.pathname.slice(rounds.length + 1) : ""
    const roundPage = roundId.length > 0 && !roundId.includes("/") && roundId !== "new"
    if (url.origin !== "http://asset.local" || (url.pathname !== rounds && !roundPage)) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
```

`src/lib/audit-finding-search-labels.ts` (new):

```ts
// The finding types' words in every language the app has, for the findings search (bug 19, P4-R5b). The page and both
// findings exports read this one helper, so a Thai or English field name finds the same rows on screen and in the file.
import { getTranslations } from "next-intl/server"
import { routing } from "@/i18n/routing"
import { buildAuditFindingTypeSearchLabels, type AuditFindingTypeSearchLabels } from "@/lib/audit-finding-filters"

export async function getAuditFindingTypeSearchLabels(): Promise<AuditFindingTypeSearchLabels> {
  const translators = await Promise.all(
    routing.locales.map(async (locale) => {
      const [finding, round] = await Promise.all([getTranslations({ locale, namespace: "auditFinding" }), getTranslations({ locale, namespace: "auditRound" })])
      return { finding: (key: string) => finding(key), round: (key: string) => round(key) }
    }),
  )
  return buildAuditFindingTypeSearchLabels(translators)
}
```

- [ ] **Step 5: Implement the page data**

`src/lib/audit-findings-page-data.ts` (new):

```ts
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { buildAuditReferenceLabels, buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import {
  auditFindingCountedStatuses,
  auditFindingReviewableWhere,
  auditFindingsAfterWhere,
  auditFindingsBack,
  auditFindingsBeforeWhere,
  auditFindingsListOrderBy,
  buildAuditFindingWhere,
  buildAuditFindingsHref,
  isAuditFindingWaitingStatus,
  pickAuditFindingNextReviewId,
  resolveAuditFindingsListPage,
  type AuditFindingCounts,
  type AuditFindingStatus,
  type AuditFindingTypeSearchLabels,
  type AuditFindingsListFilters,
} from "@/lib/audit-finding-filters"
import { formatAuditUserLabel } from "@/lib/audit-round-page-rules"
import { auditRoundCoverageWhere, isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { isSameAuditActor } from "@/lib/audit-segregation"
import { listPageWindow } from "@/lib/list-pagination"
import type { WaitingWorkRules } from "@/lib/waiting-work-rules"

// The findings page's data (group 2 spec §5, §10; plan 4 Task 2): one server load, so every tab and sub-chip count, the
// rows they open and the panel come from one builder. It never writes.

export type AuditFindingEvidenceAttachment = { id: string; originalName: string; fileType: string; fileSize: number; uploadedAt: Date }

export type AuditFindingParent = { id: string; assetTag: string; name: string }

const rowInclude = {
  auditRound: { select: { id: true, auditNo: true, name: true, status: true } },
  auditItem: { select: { auditStatus: true, reconcileStatus: true } },
  asset: {
    select: {
      id: true,
      assetTag: true,
      name: true,
      // "ส่วนควบของ <parent code> <parent name>": the component's installed link, read as the round page reads it
      // (audit-round-page-data.ts:60-63; decision 6).
      installedInLinks: { where: { status: "installed", removedAt: null }, select: { parentAsset: { select: { id: true, assetTag: true, name: true } } } },
    },
  },
  // The owner's name through the relation, for every viewer: never an employee id (P4-R11).
  actionOwner: { select: { code: true, fullNameTh: true } },
} satisfies Prisma.AuditFindingInclude

// The panel's finding (spec §10): the row's include and the item's four compared fields, who checked it, when, its remark.
const panelInclude = {
  ...rowInclude,
  auditItem: {
    select: {
      auditStatus: true,
      reconcileStatus: true,
      expectedLocationId: true,
      expectedCustodianId: true,
      expectedDepartmentId: true,
      expectedConditionId: true,
      actualLocationId: true,
      actualCustodianId: true,
      actualDepartmentId: true,
      actualConditionId: true,
      scannedAt: true,
      scannedBy: true,
      remark: true,
    },
  },
} satisfies Prisma.AuditFindingInclude

type FindingExtrasInput = {
  id: string
  findingType: string
  expectedValue: string | null
  actualValue: string | null
  reportedBy: string
  reviewStatus: string
  auditRound: { status: string }
  asset: { installedInLinks: ReadonlyArray<{ parentAsset: AuditFindingParent }> } | null
  actionOwner: { code: string; fullNameTh: string } | null
}

type ReviewQueueInput = { total: number; chosenReviewable: number; before: number; after: readonly { id: string }[]; earlier: readonly { id: string }[] }

// "k จาก N" and the next finding (P4-R18) from the queue's counts and its candidates in the list's order: one href for
// a single decision, one past the siblings for "อนุมัติทุกช่องของทรัพย์สินนี้". Neither carries a page.
function toReviewQueue(queue: ReviewQueueInput, siblingIds: ReadonlySet<string>, nextHref: (id: string) => string) {
  const afterIds = queue.after.map((entry) => entry.id)
  const earlierIds = queue.earlier.map((entry) => entry.id)
  const next = pickAuditFindingNextReviewId(afterIds, earlierIds, new Set())
  const nextAfterSiblings = pickAuditFindingNextReviewId(afterIds, earlierIds, siblingIds)
  return {
    position: queue.chosenReviewable > 0 ? queue.before + 1 : null,
    total: queue.total,
    nextHref: next ? nextHref(next) : null,
    nextHrefAfterSiblings: nextAfterSiblings ? nextHref(nextAfterSiblings) : null,
  }
}

export type AuditFindingsPageDataInput = {
  locale: string
  filters: AuditFindingsListFilters
  user: { id: string }
  /** audit:approve: the review queue and the plan dialog's owners are read for a reviewer only. */
  canApprove: boolean
  typeSearchLabels: AuditFindingTypeSearchLabels
  rules: WaitingWorkRules
  now: Date
}

export async function getAuditFindingsPageData({ locale, filters, user, canApprove, typeSearchLabels, rules, now }: AuditFindingsPageDataInput) {
  const base = { search: filters.search, roundId: filters.roundId, findingType: filters.findingType, now, rules, typeSearchLabels }
  const whereFor = (status: AuditFindingStatus) => buildAuditFindingWhere({ ...base, status })
  const listWhere = whereFor(filters.status)

  // A. The chosen finding (?finding=) loads wherever it is: on another page or outside the filters. A link with the
  // finding and no page opens the page that holds it, so the next finding after a decision opens where it now stands
  // (P4-R18).
  const chosen = filters.findingId ? await prisma.auditFinding.findUnique({ where: { id: filters.findingId }, include: panelInclude }) : null
  const chosenInList = chosen ? (await prisma.auditFinding.count({ where: { AND: [listWhere, { id: chosen.id }] } })) > 0 : false
  const findingIndex = chosen && chosenInList && !filters.pageGiven
    ? await prisma.auditFinding.count({ where: { AND: [listWhere, auditFindingsBeforeWhere(chosen)] } })
    : null
  const listPage = resolveAuditFindingsListPage(filters.listPage, { pageGiven: filters.pageGiven, findingIndex })
  const { skip, take } = listPageWindow(listPage)
  // "อนุมัติทุกช่องของทรัพย์สินนี้": the asset's other pending findings in the same round (spec §10). They come first,
  // because the next finding after approve-all steps over the ones the viewer may approve with it.
  const siblings = chosen?.assetId
    ? (
        await prisma.auditFinding.findMany({
          where: { auditRoundId: chosen.auditRoundId, assetId: chosen.assetId, reviewStatus: "pending", id: { not: chosen.id } },
          select: { id: true, findingType: true, assetId: true, expectedValue: true, actualValue: true, reviewStatus: true, reportedBy: true },
          orderBy: [{ reportedAt: "asc" }, { id: "asc" }],
        })
      ).map((sibling) => ({ ...sibling, reportedByViewer: isSameAuditActor(user.id, sibling.reportedBy) }))
    : []
  const siblingIds = new Set(siblings.filter((sibling) => !sibling.reportedByViewer).map((sibling) => sibling.id))
  // The findings the viewer may decide, within the list: the panel's "k จาก N", its next finding and the empty panel's
  // "the tab is done" (P4-R18).
  const reviewableWhere: Prisma.AuditFindingWhereInput = { AND: [listWhere, auditFindingReviewableWhere(user.id)] }
  // The next finding's candidates: enough to step over every sibling, in the list's order, after and before the chosen one.
  const candidates = (where: Prisma.AuditFindingWhereInput) =>
    prisma.auditFinding.findMany({ where: { AND: [reviewableWhere, where] }, orderBy: auditFindingsListOrderBy, take: siblingIds.size + 1, select: { id: true } })

  // B. The rows and every count, in parallel. Each tab and sub-chip counts with the list's own builder, within the
  // round, the type and the search (spec §5 "counts equal lists"); a bell kind's list counts itself.
  const [rows, statusCounts, waitingTotal, reviewableTotal, employees, filterRound, roundOptions, queue] = await Promise.all([
    prisma.auditFinding.findMany({ where: listWhere, include: rowInclude, orderBy: auditFindingsListOrderBy, skip, take }),
    Promise.all(auditFindingCountedStatuses.map((status) => prisma.auditFinding.count({ where: whereFor(status) }))),
    isAuditFindingWaitingStatus(filters.status) ? prisma.auditFinding.count({ where: listWhere }) : Promise.resolve(null),
    canApprove ? prisma.auditFinding.count({ where: reviewableWhere }) : Promise.resolve(null),
    // The plan dialog's owners: the plan is an approver's action (route.ts:35), so a reviewer without audit:edit gets them
    // too (P4-R21).
    canApprove
      ? prisma.employee.findMany({ where: { isActive: true }, select: { id: true, code: true, fullNameTh: true }, orderBy: { code: "asc" } })
      : Promise.resolve([]),
    filters.roundId ? prisma.auditRound.findUnique({ where: { id: filters.roundId }, select: { id: true, auditNo: true, name: true } }) : Promise.resolve(null),
    // "รอบ:" lists every round the list shows without a round: active and not cancelled (the coverage scope).
    prisma.auditRound.findMany({ where: { isActive: true, status: auditRoundCoverageWhere }, select: { id: true, auditNo: true, name: true }, orderBy: [{ startDate: "desc" }, { id: "asc" }] }),
    chosen && canApprove
      ? Promise.all([
          prisma.auditFinding.count({ where: { AND: [reviewableWhere, { id: chosen.id }] } }),
          prisma.auditFinding.count({ where: { AND: [reviewableWhere, auditFindingsBeforeWhere(chosen)] } }),
          candidates(auditFindingsAfterWhere(chosen)),
          candidates(auditFindingsBeforeWhere(chosen)),
        ])
      : Promise.resolve(null),
  ])

  // C. The labels, the evidence and the people of the rows and the panel (a page holds at most 100 rows, under the
  // 2,100 parameters SQL Server takes).
  const evidenceFindingIds = [...new Set([...rows.map((finding) => finding.id), ...(chosen ? [chosen.id] : [])])]
  const userIds = chosen ? [...new Set([chosen.reportedBy, chosen.auditItem.scannedBy].filter((id): id is string => Boolean(id)))] : []
  const comparedIds = chosen
    ? [
        chosen.auditItem.expectedLocationId, chosen.auditItem.expectedCustodianId, chosen.auditItem.expectedDepartmentId, chosen.auditItem.expectedConditionId,
        chosen.auditItem.actualLocationId, chosen.auditItem.actualCustodianId, chosen.auditItem.actualDepartmentId, chosen.auditItem.actualConditionId,
      ]
    : []
  const [findingLabels, comparedLabels, attachments, users] = await Promise.all([
    buildFindingValueLabels([...rows, ...(chosen ? [chosen] : []), ...siblings]),
    comparedIds.length > 0 ? buildAuditReferenceLabels(comparedIds) : Promise.resolve(new Map<string, string>()),
    evidenceFindingIds.length > 0
      ? prisma.attachment.findMany({
          where: { module: "audit_finding", referenceId: { in: evidenceFindingIds }, isActive: true },
          select: { id: true, referenceId: true, originalName: true, fileType: true, fileSize: true, uploadedAt: true },
          orderBy: { uploadedAt: "desc" },
        })
      : Promise.resolve([]),
    userIds.length > 0 ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, displayName: true } }) : Promise.resolve([]),
  ])

  const evidenceByFindingId = new Map<string, AuditFindingEvidenceAttachment[]>()
  for (const { referenceId, ...attachment } of attachments) {
    evidenceByFindingId.set(referenceId, [...(evidenceByFindingId.get(referenceId) ?? []), attachment])
  }
  const usersById = new Map(users.map((entry) => [entry.id, entry]))
  const valueLabels = new Map([...findingLabels, ...comparedLabels])
  // A person's name, or nothing when the user is gone: never the id (spec §5).
  const userLabel = (id: string | null) => (id ? formatAuditUserLabel(usersById.get(id), null) : null)
  // A value in words, or null when empty: the page shows Nil, never a typed "-".
  const valueLabel = (findingType: string, value: string | null) => (value ? formatFindingValue(findingType, value, valueLabels) : null)
  const extras = (finding: FindingExtrasInput) => {
    const reportedByViewer = isSameAuditActor(user.id, finding.reportedBy)
    return {
      parent: finding.asset?.installedInLinks[0]?.parentAsset ?? null,
      ownerLabel: finding.actionOwner ? `${finding.actionOwner.code} - ${finding.actionOwner.fullNameTh}` : null,
      expectedLabel: valueLabel(finding.findingType, finding.expectedValue),
      actualLabel: valueLabel(finding.findingType, finding.actualValue),
      reportedByViewer,
      // The review route's own rule (auditFindingReviewableWhere): only these can be ticked or decided.
      reviewable: finding.reviewStatus === "pending" && !reportedByViewer && !isAuditRoundReadOnlyStatus(finding.auditRound.status),
      evidence: evidenceByFindingId.get(finding.id) ?? [],
    }
  }
  const counts = Object.fromEntries(auditFindingCountedStatuses.map((status, index) => [status, statusCounts[index]])) as AuditFindingCounts
  const total = isAuditFindingWaitingStatus(filters.status) ? (waitingTotal ?? 0) : counts[filters.status]

  return {
    counts,
    total,
    reviewableTotal,
    listPage,
    rows: rows.map((finding) => ({ ...finding, ...extras(finding) })),
    valueLabels,
    employees: employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` })),
    filterRound,
    roundOptions,
    panel: chosen
      ? {
          finding: { ...chosen, ...extras(chosen) },
          inList: chosenInList,
          readOnly: isAuditRoundReadOnlyStatus(chosen.auditRound.status),
          reporterLabel: userLabel(chosen.reportedBy),
          scannedByLabel: userLabel(chosen.auditItem.scannedBy),
          labels: valueLabels,
          siblings,
          // No page in the next href: after this decision the list opens at the page that holds the next one (P4-R18).
          queue:
            queue && reviewableTotal !== null
              ? toReviewQueue(
                  { total: reviewableTotal, chosenReviewable: queue[0], before: queue[1], after: queue[2], earlier: queue[3] },
                  siblingIds,
                  (id) => buildAuditFindingsHref(locale, filters, { pageSize: listPage.pageSize, finding: id }),
                )
              : null,
        }
      : null,
    back: auditFindingsBack(locale, filters),
    loadedAt: now,
  }
}

export type AuditFindingsPageData = Awaited<ReturnType<typeof getAuditFindingsPageData>>
export type AuditFindingsPageRow = AuditFindingsPageData["rows"][number]
export type AuditFindingsPanel = NonNullable<AuditFindingsPageData["panel"]>
```

- [ ] **Step 6: Wire the page and the exports (UI kept)**

`src/app/[locale]/(dashboard)/audit/findings/page.tsx`:

- Imports:
  - `:5` (`prisma`), `:11` (`buildFindingValueLabels` goes; `formatFindingValue` stays) and `:42` (`appendListPage`, `listPageWindow`, `parseListPage` go; `LIST_PAGE_SIZES` and `lastListPage` stay) are trimmed.
  - `:29-37` becomes `auditFindingResolutionStatuses, auditFindingsHrefQuery, buildAuditFindingsHref, getAuditFindingToday, isAuditFindingWaitingStatus, isOpenAuditFindingActionStatus, parseAuditFindingsListFilters, type AuditFindingResolutionStatus, type AuditFindingsHrefOverrides`.
  - New: `import { getAuditFindingsPageData, type AuditFindingEvidenceAttachment } from "@/lib/audit-findings-page-data"`, `import { getAuditFindingTypeSearchLabels } from "@/lib/audit-finding-search-labels"`, `import { withPerformanceTiming } from "@/lib/performance-timing"`.
- `:47-50` (props): `searchParams: Promise<{ search?: string; status?: string; roundId?: string; findingType?: string; finding?: string; returnTo?: string; page?: string | string[]; pageSize?: string | string[] }>`.
- `:52-58`: the local `AuditFindingEvidenceAttachment` goes.
- `:60-177` (the data block) becomes the code below. `:178-184` (`batchReviewFindings`) is kept verbatim after it:

```tsx
export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
  const { locale } = await params
  const filters = parseAuditFindingsListFilters(locale, await searchParams)
  const { status, search: searchText, roundId, findingType } = filters
  const user = await requirePagePermission(locale, "audit", "view")
  // canEdit (:64) goes: its only use was the owner list, which now follows audit:approve (P4-R21).
  const canApprove = hasPermission(user, "audit", "approve")
  // The exports' routes need audit:export (spec §6.5: a role without it does not see them; the E2E suite's AU1, M1).
  const canExport = hasPermission(user, "audit", "export")
  const canCreateDisposal = hasPermission(user, "disposal", "create")

  // …t, tCommon, tAsset, tNotifications, formatAuditItemStatus, formatReconcileStatus: unchanged (:70-81)…
  const pageLoadedAt = new Date()
  // The bell's two action kinds read its own day count; other statuses read no setting.
  const waitingRules = isAuditFindingWaitingStatus(status) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES
  const today = getAuditFindingToday()
  const typeSearchLabels = await getAuditFindingTypeSearchLabels()
  const data = await withPerformanceTiming(
    "audit-findings.page-data",
    () => getAuditFindingsPageData({ locale, filters, user, canApprove, typeSearchLabels, rules: waitingRules, now: pageLoadedAt }),
    { route: "/audit/findings", locale, status, hasSearch: Boolean(searchText), hasFinding: Boolean(filters.findingId) }
  )
  const { rows: findings, total, listPage, valueLabels, employees: employeeOptions, filterRound } = data
  const { pending: pendingReviewCount, action_open: openActionCount, overdue: overdueCount, closed: closedCount } = data.counts
  const auditFindingsReturnHref = buildAuditFindingsHref(locale, filters, { page: listPage.page, pageSize: listPage.pageSize, finding: filters.findingId })
  // This list at another page or page size, with the same filters.
  const pageHref = (next: { page?: number; pageSize?: number }) => buildAuditFindingsHref(locale, filters, next)
  // A filter link goes back to page 1 and keeps the page size (spec 2B §5.9.1).
  const filterHref = (nextStatus: AuditFindingResolutionStatus, next: Pick<AuditFindingsHrefOverrides, "roundId" | "findingType"> = {}) =>
    buildAuditFindingsHref(locale, filters, { ...next, status: nextStatus, pageSize: listPage.pageSize })
  const exportParams = new URLSearchParams()
  if (searchText) exportParams.set("search", searchText)
  if (roundId) exportParams.set("roundId", roundId)
  if (findingType) exportParams.set("findingType", findingType)
  exportParams.set("status", status)
  // A page past the last one (an old link, or the last finding of the last page decided) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (findings.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(pageHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  const attachmentsByFindingId = new Map<string, AuditFindingEvidenceAttachment[]>(findings.map((finding) => [finding.id, finding.evidence]))
  const attachmentCountByFindingId = new Map(
    Array.from(attachmentsByFindingId, ([findingId, attachments]) => [findingId, attachments.length])
  )
  // …batchReviewFindings (:178-184): unchanged…
```

- `resolutionFilterLabels` (`:185-196`) gains `follow_up: t("tabFollowUp"),` after `pending`. The type now holds `follow_up`. Task 3 draws the tab.
- `:204-233`: the strip reads `pendingReviewCount` / `openActionCount` / `overdueCount` / `closedCount`, now from `data.counts`. No markup changes.
- `:245`: `href: filterHref(status, { roundId: null })`. `:246`: `href: filterHref(status, { findingType: null })`. Each chip still removes only itself.
- `:309`: `hiddenInputs={Object.fromEntries(auditFindingsHrefQuery(buildAuditFindingsHref(locale, filters, { search: "", pageSize: listPage.pageSize })))}`. This carries `status`, `roundId`, `findingType`, `pageSize` and `returnTo`.
- `:381`: `value: finding.ownerLabel,`. The `nilLabel` stays.
- `:529`: `<div>{finding.ownerLabel ? finding.ownerLabel : <Nil label={t("noActionOwner")} />}</div>`. This keeps the pin `tests/list-pages-ui.test.ts:537`.
- `:611-612` (`SUMMARY_STATUSES`) and `:753-768` (the local `buildAuditFindingsHref`) go.

No other line changes:
- the back link (`:269`, Task 3);
- the StatStrip, TabNav and FilterChipList markup;
- the batch panel, the cards and the table.

In both export routes, `:7` / `:6` gain `import { getAuditFindingTypeSearchLabels } from "@/lib/audit-finding-search-labels"`. Then, after the `const rules = …` line (`export/route.ts:20`, `export-pdf/route.ts:23`):

```ts
    // The search reads the type words as the page does (bug 19), so the file holds the rows the page shows.
    const typeSearchLabels = await getAuditFindingTypeSearchLabels()
```

and the where becomes `buildAuditFindingWhere({ status, search, roundId, findingType, rules, typeSearchLabels })`.

- [ ] **Step 7: Messages**

Write the change file in the session scratchpad (for example `<scratchpad>/g2p4-task2-messages.json`, an absolute path), run `node scripts/messages-edit.mjs <file>` from the repo root, then delete it. Namespace `auditFinding`:

| Key | th | en |
|---|---|---|
| `tabFollowUp` (new) | ต้องติดตาม | Follow-up |

```json
{ "set": { "th": { "auditFinding.tabFollowUp": "ต้องติดตาม" }, "en": { "auditFinding.tabFollowUp": "Follow-up" } } }
```

The sub-chips and the other tabs reuse existing keys:
- `filterActionOpen` "ต้องแก้ไข", `filterOverdue` "เกินกำหนด", `status_exception` "ต้องตรวจสอบพิเศษ";
- `status_pending`, `status_approved`, `status_rejected`, `filterClosed`, `status_all`.

The short type words are the round page's (`auditRound.differenceField_*`, `notFound`, `outOfScope`). The glossary words used are ที่ตั้ง, ผู้ถือครอง, นอกขอบเขต and พิจารณา (`docs/19_THAI_GLOSSARY.md:9`, `:11`, `:17`, `:20`).

- [ ] **Step 8: Rewrite the pins this task breaks**

- `tests/audit-finding-resolution.test.ts:110-129`: the pending + search + round + type where becomes:

  ```ts
    {
      reviewStatus: "pending",
      auditRoundId: "round-1",
      findingType: "wrong_custodian",
      // The search is one entry of AND (plan 4 P4-R3, FP §1), and a code is no longer searched (bug 19).
      AND: [{
        OR: [
          { asset: { assetTag: { contains: "SNI-EQU" } } },
          { asset: { name: { contains: "SNI-EQU" } } },
          { auditRound: { auditNo: { contains: "SNI-EQU" } } },
          { auditRound: { name: { contains: "SNI-EQU" } } },
        ],
      }],
    }
  ```
- `:142-147`: the loop keeps `:143-145`. `:146` becomes `assert.match(route, /buildAuditFindingWhere\(\{ status, search, roundId, findingType, rules, typeSearchLabels \}\)/)`, plus `assert.match(route, /const typeSearchLabels = await getAuditFindingTypeSearchLabels\(\)/)`.
- `:166-184`: the inner `OR` becomes the four asset / round conditions above, with `"SNI"`.
- `:186-195`:
  - `:188`, `:190`, `:192`, `:193` and `:194` hold.
  - `:189` becomes two pins:
    - `assert.match(page, /getAuditFindingsPageData\(\{ locale, filters, user, canApprove, typeSearchLabels, rules: waitingRules, now: pageLoadedAt \}\)/)`;
    - on `read("src/lib/audit-findings-page-data.ts")`: `assert.match(data, /const whereFor = \(status: AuditFindingStatus\) => buildAuditFindingWhere\(\{ \.\.\.base, status \}\)/)`, `assert.match(data, /const base = \{ search: filters\.search, roundId: filters\.roundId, findingType: filters\.findingType, now, rules, typeSearchLabels \}/)` and `assert.doesNotMatch(data, /now: today/)`.
- `tests/list-pages-ui.test.ts:301` becomes, on `read("src/lib/audit-findings-page-data.ts")`: `assert.match(data, /filters\.roundId \? prisma\.auditRound\.findUnique\(\{ where: \{ id: filters\.roundId \}, select: \{ id: true, auditNo: true, name: true \} \}\)/, "the round chip names its round (I24)")`.
- `tests/list-pages-ui.test.ts:310-323` (the server-paging test). `source` stays the page. Add `const data = read("src/lib/audit-findings-page-data.ts")` and `const rules = read("src/lib/audit-finding-filters.ts")`:
  - `:312` → `assert.match(rules, /listPage: parseListPage\(\{ page: params\.page, pageSize: params\.pageSize \}\)/)`;
  - `:313` → `assert.match(data, /const \{ skip, take \} = listPageWindow\(listPage\)/)`;
  - `:314` → `assert.match(data, /orderBy: auditFindingsListOrderBy, skip, take/)` and `assert.match(rules, /export const auditFindingsListOrderBy: Prisma\.AuditFindingOrderByWithRelationInput\[\] = \[\{ reportedAt: "desc" \}, \{ id: "asc" \}\]/, "the old order plus id, so no finding shows on two pages")`;
  - `:315` holds, and adds `assert.doesNotMatch(data, /\btake: \d+/)`;
  - `:316` → `assert.match(data, /isAuditFindingWaitingStatus\(filters\.status\) \? prisma\.auditFinding\.count\(\{ where: listWhere \}\) : Promise\.resolve\(null\)/, "one more count only for a bell kind, which no tab counts")`;
  - `:317` → `assert.match(data, /const total = isAuditFindingWaitingStatus\(filters\.status\) \? \(waitingTotal \?\? 0\) : counts\[filters\.status\]/)`;
  - `:318`, `:319` and `:322` hold;
  - `:320` → `assert.match(rules, /appendListPage\(params, \{ page: overrides\.page, pageSize: overrides\.pageSize \}\)/, "buildAuditFindingsHref writes page above 1 and pageSize other than 25 only")`;
  - `:321` → `assert.match(source, /buildAuditFindingsHref\(locale, filters, \{ \.\.\.next, status: nextStatus, pageSize: listPage\.pageSize \}\)/, "a filter link goes back to page 1 and keeps the page size")`.
- `tests/audit-mobile-flow-completion.test.ts:39-49`:
  - `:42-44` move to `const data = readFileSync("src/lib/audit-findings-page-data.ts", "utf8")`: `assert.match(data, /const evidenceByFindingId = new Map<string, AuditFindingEvidenceAttachment\[\]>\(\)/)`, `assert.match(data, /prisma\.attachment\.findMany\(\{[\s\S]*where: \{ module: "audit_finding"/)`, `assert.match(data, /orderBy: \{ uploadedAt: "desc" \}/)`;
  - `:45-48` hold on the page.
- `tests/operational-return-navigation.test.ts:80-89`:
  - `:83` → `assert.match(source, /const auditFindingsReturnHref = buildAuditFindingsHref\(locale, filters, \{ page: listPage\.page, pageSize: listPage\.pageSize, finding: filters\.findingId \}\)/)`;
  - `:84` → `assert.match(source, /const filters = parseAuditFindingsListFilters\(locale, await searchParams\)/)`;
  - `:85` → `assert.match(source, /hiddenInputs=\{Object\.fromEntries\(auditFindingsHrefQuery\(buildAuditFindingsHref\(locale, filters, \{ search: "", pageSize: listPage\.pageSize \}\)\)\)\}/)`;
  - `:86-87` hold.
- `tests/performance-route-instrumentation.test.ts`, after `:47-50`:

  ```ts
    {
      file: "src/app/[locale]/(dashboard)/audit/findings/page.tsx",
      labels: ["audit-findings.page-data"],
    },
  ```

These pins hold (checked):
- `tests/audit-finding-resolution.test.ts:19-28` (the strip's names stay until Task 3), `:30-38`, `:137-140` (`roundId?: string` in the props; the `exportParams.set` lines) and `:153-164` (the bell rules; the eight quick filters are kept);
- `tests/audit-round-page-rules.test.ts:47`;
- `tests/waiting-work-links.test.ts:65-68` (no OR group, no `AND`);
- `tests/audit-round-cancellation.test.ts:125-141` (`auditRoundOperationalWhere` is still in the filters);
- `tests/list-pages-ui.test.ts:292-309` (but `:301`), `:510-540` (the table is unchanged; `: <Nil label={t("noActionOwner")} />` kept);
- `tests/e2e-fixes.test.ts:66-75`, `:250-259`;
- `tests/phase2d-final-ui.test.ts:132-134`;
- `tests/disposal-route-structure.test.ts:37-45`;
- `tests/audit-item-status-labels.test.ts:47-55`;
- `tests/audit-pages-sweep-ui.test.ts:69-80`;
- `tests/feedback-states-ui.test.ts:205`.

- [ ] **Step 9: Run everything**

Run: `node --test tests/audit-finding-tabs.test.ts tests/audit-findings-page-data.test.ts tests/audit-finding-resolution.test.ts tests/list-pages-ui.test.ts tests/audit-mobile-flow-completion.test.ts tests/operational-return-navigation.test.ts tests/performance-route-instrumentation.test.ts tests/audit-round-page-rules.test.ts tests/waiting-work-links.test.ts tests/audit-round-cancellation.test.ts tests/e2e-fixes.test.ts tests/phase2d-final-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/thai-glossary.test.ts tests/api-error-catalog.test.ts`

Expected: PASS.

Then run: `npm test && npx tsc --noEmit && npm run lint`

Expected: PASS. A pin that fails outside the lists above is rewritten in this commit and named in the report.

E2E is not run in this task. No step changes:
- the page's markup is the same;
- every old status link keeps its where;
- `returnTo` only adds a param to the page's own links;
- the exports' search adds type matches only.

- [ ] **Step 10: Commit**

```bash
git add src/lib/audit-finding-filters.ts src/lib/operational-return-navigation.ts src/lib/audit-finding-search-labels.ts src/lib/audit-findings-page-data.ts "src/app/[locale]/(dashboard)/audit/findings/page.tsx" src/app/api/audit-findings/export/route.ts src/app/api/audit-findings/export-pdf/route.ts messages/th.json messages/en.json tests/audit-finding-tabs.test.ts tests/audit-findings-page-data.test.ts tests/audit-finding-resolution.test.ts tests/list-pages-ui.test.ts tests/audit-mobile-flow-completion.test.ts tests/operational-return-navigation.test.ts tests/performance-route-instrumentation.test.ts
git commit -m "feat(audit-findings): the findings page's rules and data: six tabs with ต้องติดตาม as one OR of open actions and exceptions (each with its round scope) and its three sub-chips, every old status link landing on its tab and sub-chip, every OR in one AND list, a checked เรื่อง filter and a search that reads the types' words in Thai and English instead of codes (bug 19) on the page and both exports, returnTo kept on every link with the back link's fallback, and one server load: each tab and sub-chip counted by the list's own where, rows with the component's parent and the owner's name, the chosen finding off the page with its asset's other pending findings, k จาก N and the next finding computed on the server; the plan dialog's owners for audit:approve; the page wired to it with its UI kept (group 2 plan 4 task 2, P4-R3, P4-R5b, P4-R11, P4-R12, P4-R18 to P4-R21)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The findings page shell (§10 without the panel's decide flow): the way back and "ส่งออก ▾", six tabs with counts and the sub-chips of ต้องติดตาม, "รอบ:" and "เรื่อง:" before the search, two panes from xl with a four-column table, and phone cards that open the panel full screen

The findings page (AU-Findings) is rebuilt to spec §10 on Task 2's data. Task 2 already reads every list, count, round option and the chosen finding (`getAuditFindingsPageData`), parses the URL (`parseAuditFindingsListFilters`) and owns every link (`buildAuditFindingsHref`, the six tabs, the sub-chips, the old values, the way back); this task only renders them and rewrites the page file whole. Task 4 replaces the panel, and Task 5 adds the tick column and the selection bar.

1. **Header.** `PageHeader` keeps the title and the subtitle. Its back link honours `returnTo` (P4-R12) through Task 2's `data.back`. A rounds-list target reads "กลับไปรอบตรวจนับ" and a round page reads "กลับไปหน้ารอบ". Without a usable `returnTo`, the round of `roundId` is used, else the rounds list. The one action is "ส่งออก ▾" (`AuditFindingsExportMenu`), which holds the Excel and the PDF of the list as filtered, with `locale` (P4-R7). It shows for `audit:export` only, as today.
2. **Tabs.** `TabNav` shows รอพิจารณา / อนุมัติแล้ว / ปฏิเสธแล้ว / ต้องติดตาม / ปิดแล้ว / ทั้งหมด with Task 2's counts. Under ต้องติดตาม a second `TabNav` shows the sub-chips ต้องแก้ไข / เกินกำหนด / ต้องตรวจสอบพิเศษ with counts. The tab link itself is the way back to the whole tab. A bell value (`action_not_due`, `action_due_soon`) opens ต้องติดตาม with its removable chip, and removing it opens the whole tab. The StatStrip and its two section headings go (P4-R1).
3. **Filter row.** `MasterDataSearch` takes a new `leading` slot: "รอบ" and "เรื่อง" as the house `FilterSelect hideLabel fieldSize="md"` (its sr-only label, and the first option names the filter: "ทุกรอบ" / "ทุกเรื่อง", P4-R28), then the search, then "ค้นหา". The search therefore comes last, as spec §10 asks, and the visual order is the DOM order. A round that the options do not hold still shows, by its round number or as "ไม่อยู่ในรายการ"; an unknown type never reaches the page (Task 2's `filters.findingType` is `null`). The round and type chips go, because the selects show both (DESIGN.md: chips only for filters not on screen). The search's hidden inputs leave `roundId` and `findingType` out, since the selects submit them.
4. **Two panes from `xl`.** The list pane (`data-audit-findings-list`) comes first: the tabs, the filter row, the chips, today's batch panel (until Task 5) and the list frame. The panel pane (`data-audit-finding-pane`, 420px) follows. From `xl` it sticks under the top of the dashboard scroll area and scrolls inside itself (`xl:sticky xl:top-4 xl:max-h-[calc(100dvh_-_var(--shell-top)_-_3rem)] xl:overflow-y-auto`, the cap of `audit-scan-check-panel.tsx:46`), so a row opened far down the list (rows open with `scroll={false}`) and Task 4's move to the next finding keep the panel in view; no ancestor between it and `main` sets `overflow` (P4-R31). It holds `AuditFindingPaneTop` (below), the phone's way back and one slot, the `panel` expression:
   - with a finding open, `<div data-audit-finding-panel data-finding-id="<id>">` around a `ContentPanel` titled "พิจารณารายการไม่ตรง" (Task 4 replaces the expression with its own panel, under the same two hooks);
   - with none, `<div data-audit-finding-panel-empty>` around a `ContentPanel` of the same title that reads "เลือกรายการทางซ้ายเพื่อพิจารณา", or "ไม่พบรายการไม่ตรงที่เลือก" for an unknown `?finding=`.
   - The pane is hidden below `xl` while no finding is open.
   - Below `xl` the open finding replaces the list. Rows (and Task 4's next finding) still open with `scroll={false}`, which only the list beside the panel from `xl` needs. So the pane's first child, `{chosen ? <AuditFindingPaneTop key={chosen.id} /> : null}` (a client leaf, `src/components/audit/audit-finding-pane-top.tsx`), runs once per finding: below `xl` it scrolls `#main` (`dashboard-shell.tsx:171`) to the top, so the panel opens at its top with "กลับไปรายการไม่ตรง" in view; from `xl` it scrolls the sticky pane to its top and leaves the list where it was (P4-R31).
5. **Table** (from `md`). It has four columns (P4-R2); Task 5 adds the tick column first:
   - เรื่อง: a `Chip` (`data-audit-finding-subject`) with the short word ผู้ถือครอง / ที่ตั้ง / แผนก / สภาพ / ไม่พบ / นอกขอบเขต, the round page's own words (`auditRound.differenceField_*`, `notFound`, `outOfScope` through Task 2's `auditFindingTypeShortLabelKeys`);
   - ทรัพย์สิน: the code as the row's open link (`data-audit-finding-open`), the name, and "ส่วนควบของ <parent code> <parent name>" under a component;
   - ตามระบบ → ที่พบ: the values, with the plan's line "<plan state> · <owner name or ยังไม่ระบุผู้รับผิดชอบ> · กำหนด <date>" under them when the finding has a plan (Appendix A §10, P4-R11);
   - รอบ: the round code over its name.

   A row is a `ClickableTableRow` whose href is this list with `?finding=<id>`, and whose `<tr>` carries `data-audit-finding-row="<id>"` and `data-finding-type="<code>"` (its new `rowData` prop). It opens with `scroll={false}`, so from `xl` the list beside the panel stays where it was. Below `xl`, where the panel replaces the list, `AuditFindingPaneTop` (item 4) brings the page to its top. The open row takes `current`: `aria-current="true"` and the `primary-soft` fill (DESIGN.md:245 already allows faint text on it "for a hovered or selected row"), so no new token is needed. The table has no action cell, no badges and no evidence; they are the panel's.
6. **Phone cards** (below `md`). Each card is an `article` with `data-audit-finding-card="<id>"` and `data-finding-type="<code>"`, and is one stretched link (`data-audit-finding-open`) to `?finding=<id>`, with the default scroll, so the panel opens at the top. A card shows the code and name, the parent line, the resolution badge, the topic `Chip` (`data-audit-finding-subject`) with the round code, the values and the plan's line. Below `xl` an open finding hides the list pane and shows the panel full screen in the content area, under "กลับไปรายการไม่ตรง" (P4-R13). This is not an overlay: there is no hand-made `fixed inset-0` (ui-overlay-guards).
7. **Interim panel body** (`data-audit-finding-panel-body`; Task 4 replaces the whole `panel` expression). It holds today's card body for the open finding, moved whole, so nothing in Appendix A §10 is missing between commits:
   - the status badges (resolution, review, plan, item, reconcile);
   - a `KeyValueList` with เรื่อง, ทรัพย์สิน (+ parent), รอบตรวจ (a link), ค่าในระบบ, ค่าที่พบจริง, ผู้รับผิดชอบ (a name or Nil) and กำหนดเสร็จ;
   - the evidence list;
   - "เปิดหน้าทรัพย์สิน" and "เปิดคำขอตัดจำหน่าย" (one `disposalHrefFor(finding)` helper, which Task 4's panel reuses);
   - for `audit:approve` only, today's `AuditFindingReviewActions` (non-compact), so approve / reject (with today's dialog), plan and close keep working until Task 4.
8. **Empty states.** After a search: "ไม่พบรายการไม่ตรงที่ตรงกับคำค้น" with "ล้างคำค้น" (spec §5). Otherwise today's title and help, with the page's way back.

What stays (Appendix A §10, as a checklist):
- [ ] the plan and close dialogs, opened from the panel through `AuditFindingReviewActions` (Task 4 moves them into its own panel);
- [ ] the owner and due date (the list's plan line and the panel) and the five status badges (the panel);
- [ ] the disposal-request link (the panel);
- [ ] the evidence list (the panel);
- [ ] the freshness banner (top of the page; Task 4 moves it into the panel);
- [ ] the back link and the empty states with the way back;
- [ ] the phone cards;
- [ ] the page sizes 25 / 50 / 100 and the "จาก N รายการ" range (`e2e/dashboard` reads it);
- [ ] the self-review note (in `AuditFindingReviewActions` until Task 4);
- [ ] the batch panel (`AuditFindingsBatchActions`, until Task 5).

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx`. The whole file is rewritten. Master has 768 lines, and Task 2 has replaced its queries with `getAuditFindingsPageData` (its data block is kept as Task 2 wrote it). Kept from master:
  - `formatAuditItemStatus` / `formatReconcileStatus` (`:74-81`);
  - `resolveFindingState` (`:704-719`);
  - `RESOLUTION_STATE_TONES` (`:721-727`);
  - `FindingStatusBadges` (`:729-751`), now a wrapping row (until Task 4, whose panel draws the badges itself);
  - `FindingValueChange` (`:614-636`), which gains `className`;
  - `AuditFindingEvidenceList` (`:638-702`), without its `compact` branch.
- Create: `src/components/audit/audit-findings-export-menu.tsx`.
- Create: `src/components/audit/audit-finding-pane-top.tsx` (client: `AuditFindingPaneTop`, each open finding at its top, P4-R31).
- Modify: `src/components/ui/clickable-table-row.tsx:12-24` (the props `scroll`, `current`, `rowData`), `:40` (`router.push`), `:43-60` (the `tr`).
- Modify: `src/components/master-data/master-data-layout.tsx:5-20` (the `leading` prop), `:29` (`{leading}` before `SearchField`).
- Modify: `src/lib/audit-finding-filters.ts`: Task 2's `auditFindingResolutionStatuses` and its comment go (the eight quick filters are now the six tabs).
- Modify: `DESIGN.md`:
  - `:513` (`MasterDataSearch leading`);
  - `:608` (the Rows bullet: `ClickableTableRow current`, `scroll` and `rowData`);
  - `:620` and `:622` (the findings list counts on its tabs, not a strip);
  - `:628` (the findings table has no action cell).
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`).
- Test:
  - `tests/audit-findings-page-ui.test.ts` (new): source pins and the messages by value. The way back, the links and the tab words are Task 2's, by value in `tests/audit-finding-tabs.test.ts`.
  - Pins rewritten:
    - `tests/audit-finding-resolution.test.ts:6` (the import), `:19-28`, `:69-94`, `:163`, `:186-195`;
    - `tests/list-pages-ui.test.ts:292-308`, `:310-323`, `:510-570`;
    - `tests/audit-pages-sweep-ui.test.ts:69-81`;
    - `tests/e2e-fixes.test.ts:68-69`, `:250-256`;
    - `tests/phase2d-final-ui.test.ts:131-134`;
    - `tests/operational-return-navigation.test.ts:85` (Task 2's form of it);
    - `tests/list-primitives-ui.test.ts:125`, `:309`, `:313-315`.

**Interfaces:**
- Consumes:
  - **Task 2, `src/lib/audit-finding-filters.ts`** (pure; P4-R20: Task 2's names, no second builder):
    - `auditFindingTabs` (`"pending" | "approved" | "rejected" | "followUp" | "closed" | "all"`), `type AuditFindingTab`, and `auditFindingTabStatus[tab]`, the URL value of each tab (`followUp → "follow_up"`).
    - `auditFindingFollowUpChips` (`"action_open" | "overdue" | "exception"`), `type AuditFindingFollowUpChip`.
    - `auditFindingStatusView(status): { tab: AuditFindingTab; chip: AuditFindingFollowUpChip | null; waiting: AuditFindingWaitingStatus | null }`.
    - `isAuditFindingWaitingStatus(status): status is AuditFindingWaitingStatus`, `getAuditFindingToday(now?)`, `isOpenAuditFindingActionStatus(status)`.
    - `auditFindingTypes` (the "เรื่อง:" options in spec §10's order), `auditFindingTypeShortLabelKeys[type]` (`auditRound` keys: `differenceField_custodian` … `notFound`, `outOfScope`) and `resolveAuditFindingType(value): AuditFindingType | null`.
    - `parseAuditFindingsListFilters(locale, params): AuditFindingsListFilters` (`status`, `search`, `roundId`, `findingType`, `findingId`, `returnTo`, `listPage`, `pageGiven`).
    - `buildAuditFindingsHref(locale, filters, overrides?: AuditFindingsHrefOverrides): string` (`status`, `search`, `roundId`, `findingType`, `page`, `pageSize`, `finding`; `null` or `""` clears a filter; `returnTo` always rides along) and `auditFindingsHrefQuery(href): URLSearchParams`.
  - **Task 2, `src/lib/audit-findings-page-data.ts`** (server):
    - `getAuditFindingsPageData({ locale, filters, user, canApprove, typeSearchLabels, rules, now })`, wired by Task 2 through `withPerformanceTiming("audit-findings.page-data", …)`, with `getAuditFindingTypeSearchLabels()` and the bell's rules (`getWaitingWorkRules()` for a bell kind, else `DEFAULT_WAITING_WORK_RULES`). This task keeps Task 2's data block as it is.
    - Its result: `counts` (`AuditFindingCounts`, keyed by `auditFindingCountedStatuses`), `total`, `reviewableTotal`, `listPage` (resolved), `rows: AuditFindingsPageRow[]`, `employees`, `filterRound`, `roundOptions`, `panel: AuditFindingsPanel | null`, `back: { href; target: "round" | "rounds" }` and `loadedAt`.
    - `AuditFindingsPageRow`: every scalar column plus `auditRound { id, auditNo, name, status }`, `auditItem { auditStatus, reconcileStatus }`, `asset { id, assetTag, name, installedInLinks } | null`, `parent`, `ownerLabel` (a name or `null`, never an id, P4-R11), `expectedLabel` / `actualLabel` (words or `null`, never a typed `"-"`), `reportedByViewer`, `reviewable` and `evidence: AuditFindingEvidenceAttachment[]`.
    - The open finding is `data.panel?.finding` (the row's fields and extras, plus the item's compared fields). This task reads only the row's fields of it; Task 4 reads the rest.
  - Shared parts, with their real props:
    - `TabNav({ "aria-label", items: { key, label, href, count?: string }[], current, scroll? })` (`src/components/ui/tab-nav.tsx:5-31`; the count is already formatted; the current link gets `aria-current="page"`);
    - `FilterSelect({ label, options?: readonly { value; label }[], allLabel?, fieldSize?, hideLabel?, className?, ...select props })` (`filter-select.tsx:6-41`);
    - `MasterDataSearch({ action, defaultValue, placeholder, submitLabel, hiddenInputs?, children? })` (`master-data-layout.tsx:5-20`), which gains `leading?`;
    - `ContentPanel({ title?, description?, actions?, children, className?, divided?, flush? })` (`content-panel.tsx:5-17`). It is a `section`, not an `aside` (`tests/audit-pages-sweep-ui.test.ts:41-42`: an aside inside main fails axe);
    - `Chip({ className?, children, ...span })` (`chip.tsx:9-19`): a name, not a state (DESIGN.md:437);
    - `PageHeader({ title, meta?, actions?, back? })` and `PageBackLink({ href, label, className? })` (`page-header.tsx:8-67`). PageBackLink is used outside the header too (`asset-label-print.tsx:248`);
    - `ClickableTableRow({ href, label, className?, onNavigate?, children })` (`clickable-table-row.tsx:12-24`), which gains `scroll?`, `current?` and `rowData?`;
    - `DataTable` / `DataTableHead` / `DataTableCell` / `TableEmptyRow` / `DataTableFoot` (`data-table.tsx`);
    - `KeyValueList({ items: { key?, label, value, nilLabel? }[], className? })`;
    - `StatusBadge({ label, status?, tone?, className? })`;
    - `EmptyNote`, `ActionEmptyState`, `FilterChipList`, `Pagination`, `DataFreshnessBanner` (unchanged props);
    - `DropdownMenu*` (as `audit-round-header-menus.tsx:30-70`);
    - `AuditFindingReviewActions` (`audit-finding-review-actions.tsx:81-121`), unchanged; non-compact here;
    - `AuditFindingsBatchActions({ findings: { id; label; detail }[] })`, unchanged.
- Produces:
  - `src/components/audit/audit-findings-export-menu.tsx`: `AuditFindingsExportMenu({ excelHref, pdfHref }: { excelHref: string; pdfHref: string })` (client).
  - `src/components/audit/audit-finding-pane-top.tsx`: `AuditFindingPaneTop()` (client, renders nothing). The pane mounts it once per finding (`key={chosen.id}`); it brings `#main` to the top below `xl` and the pane to its top from `xl` (P4-R31).
  - `ClickableTableRow` gains three props:
    - `scroll?: boolean` (default `true`, through `router.push(href, { scroll })`);
    - `current?: boolean` (default `false`): `aria-current="true"` and `clickableTableRowCurrentClasses`;
    - `rowData?: Readonly<Record<`data-${string}`, string>>`: spread on the `<tr>`, for the hooks a test reads.
  - `MasterDataSearch` gains `leading?: ReactNode`, rendered after the hidden inputs and before `SearchField`.
  - **For Task 4** (the panel). The page defines:
    - `chosen` (`data.panel?.finding ?? null`) and `data.panel`;
    - `closeHref` (the list without `finding`, page kept);
    - `findingHref(id)` (the list with that finding, page kept);
    - `auditFindingsReturnHref` (this list with the open finding, for the disposal link's `returnTo`);
    - `disposalHrefFor(finding)` (the disposal request of a finding, or `null` without `disposal:create` or an asset);
    - `today`, `canApprove`, `canCreateDisposal`, `data.employees`, `data.reviewableTotal`, `data.loadedAt`;
    - `AuditFindingEvidenceList`, `findingStatusBadges(finding, state)`, `resolveFindingState`, `FindingStatusBadges`;
    - the words `auditFinding.componentOfParent` ("ส่วนควบของ {assetTag} {name}"), `openAsset`, `panelTitle`, `panelEmpty` and `panelNotFound`.

    Task 4 replaces the `const panel = …` expression whole (both branches), and moves the `DataFreshnessBanner` above the panes into its panel. It keeps the pane `<div data-audit-finding-pane …>` (sticky from `xl`), its `AuditFindingPaneTop` and the phone `PageBackLink` in it, and the two hooks: `data-audit-finding-panel` with `data-finding-id`, and `data-audit-finding-panel-empty`.
  - **For Task 5** (ticks and the bar). Task 5 adds the tick column first, for `canApprove` only:
    - `{canApprove ? <col className="w-11" /> : null}` before `<col className="w-24" />`;
    - a first `DataTableHead` and a first `DataTableCell` per row, each for `canApprove` only;
    - `minWidth={520}` stays for both roles: the tick's 44px comes out of the auto ทรัพย์สิน column, so the table still fits beside the 420px panel at 1280 (P4-R36);
    - `TableEmptyRow colSpan={4}` becomes `{canApprove ? 5 : 4}`.

    It also reads `topicLabel(findingType)` (the เรื่อง word), `findingHref(id)`, `selectionKey` (page, page size, status, search, round and type; never `finding`) and `row.reviewable`. `{canApprove ? <AuditFindingsBatchActions key={selectionKey} findings={batchReviewFindings} /> : null}` in the list pane is the line the bar replaces.
  - **The markup Task 7's E2E reads** (th):
    - **Header:**
      - the back link: `getByRole("link", { name: "กลับไปหน้ารอบ" })` after a round page link (which carries `roundId`), or "กลับไปรอบตรวจนับ" from the rounds list or with no round;
      - export: `main.getByRole("button", { name: "ส่งออก" })` (only for `audit:export`), then two `menuitem`s, each an `<a download>`: the Excel, whose name starts with "ส่งออกรายการไม่ตรง" (`auditFinding.exportFindings`, then "ตามตัวกรองที่เลือก"), and the PDF, whose name starts with "ส่งออก PDF" (`exportFindingsPdf`). The hrefs are `/api/audit-findings/export?…&status=<status>&locale=th` and `/api/audit-findings/export-pdf?…`. Without `audit:export` there is no button, and `main a[href^="/api/audit-findings/export"]` still counts 0 (`reports.spec.ts:65`).
    - **Tabs** `getByRole("navigation", { name: "ตัวกรองงาน" })`: six links named `^รอพิจารณา\s*N$`, `^อนุมัติแล้ว\s*N$`, `^ปฏิเสธแล้ว\s*N$`, `^ต้องติดตาม\s*N$`, `^ปิดแล้ว\s*N$`, `^ทั้งหมด\s*N$`. The current one has `aria-current="page"`.
    - **Sub-chips** (tab ต้องติดตาม only), in another nav, `getByRole("navigation", { name: "งานที่ต้องติดตาม" })`: `^ต้องแก้ไข\s*N$`, `^เกินกำหนด\s*N$`, `^ต้องตรวจสอบพิเศษ\s*N$`. `?status=action_open` marks ต้องแก้ไข current.
    - **Bell filter chip** (`?status=action_not_due` / `action_due_soon`): the `FilterChipList` link `ล้างตัวกรองนี้: <bell label>` (the removeLabel is `asset.clearDrilldownFilter` "ล้างตัวกรองนี้"; the label is `notifications.openAuditActions` / `auditActionsDueSoon`, so the link reads "ล้างตัวกรองนี้: แผนแก้ไขยังเปิด" or "ล้างตัวกรองนี้: แผนแก้ไขใกล้ครบกำหนด"), inside the group named "ตัวกรองที่ใช้อยู่" (`auditFinding.activeFilters`), with ต้องติดตาม current; its href is `filterHref({ status: "follow_up" })`.
    - **Filter row** `main.getByRole("search")`:
      - `getByRole("combobox", { name: "รอบ" })` (first option "ทุกรอบ", options "<auditNo> · <name>");
      - `getByRole("combobox", { name: "เรื่อง" })` (options "ทุกเรื่อง", ผู้ถือครอง, ที่ตั้ง, แผนก, สภาพ, ไม่พบ, นอกขอบเขต);
      - the search box named "ค้นหา";
      - the button "ค้นหา".

      Choosing in a select needs the button: it is a GET form.
    - **Panes**: `[data-audit-findings-list]` and `[data-audit-finding-pane]`.
    - **Rows** (from `md`): `tbody tr[data-audit-finding-row="<id>"][data-finding-type="<code>"]`, one per finding, in the page's order:
      - cells in order: the topic `Chip` (`[data-audit-finding-subject]`, the short word), the code plus name plus parent line, the values plus plan line, then the round code plus name;
      - the code is the row's one link, `[data-audit-finding-open]`;
      - the open row has `aria-current="true"`;
      - a click anywhere in the row but its link (the `[data-audit-finding-subject]` chip, for example) opens the same URL without scrolling.
    - **Cards** (below `md`): `article[data-audit-finding-card="<id>"][data-finding-type="<code>"]`, with the `[data-audit-finding-subject]` chip inside; a click on the card opens the panel through its stretched link (`[data-audit-finding-open]`).
    - **Component line**: the text `ส่วนควบของ <parent tag> <parent name>` under the asset, in the row or card and in the panel body.
    - **Panel** (one slot, rendered once; Task 4 keeps the hooks):
      - with a finding open, `[data-audit-finding-panel][data-finding-id="<id>"]`; the URL holds `finding=<id>`, after `findingType`, `page` and `pageSize`, and before `returnTo`;
      - with no finding (from `xl` only), `[data-audit-finding-panel-empty]` reads "เลือกรายการทางซ้ายเพื่อพิจารณา";
      - below `xl`, with a finding open, `[data-audit-findings-list]` is hidden and the pane shows `getByRole("link", { name: "กลับไปรายการไม่ตรง" })` (an icon button below `md`; the name stays);
      - until Task 4, the heading `getByRole("heading", { name: "พิจารณารายการไม่ตรง" })` inside the panel.
    - **Empty**: "ไม่พบรายการไม่ตรงตามตัวกรอง" with no search (`roles.spec.ts:129` keeps it); "ไม่พบรายการไม่ตรงที่ตรงกับคำค้น" and the link "ล้างคำค้น" after a search.
    - **Pagination**: `จาก N รายการ` in main, N equal to the count of the tab or sub-chip in use (`e2e/dashboard`).
    - **Until Task 4**, the body holds today's `AuditFindingReviewActions` (the buttons "อนุมัติ" / "ปฏิเสธ" / "แผนแก้ไข" / "ปิดรายการไม่ตรง" and today's dialogs) for `audit:approve` only. Task 7 writes against Task 4's panel, not this.

- [ ] **Step 1: Write the failing test**

`tests/audit-findings-page-ui.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 4 Task 3 (spec §10, Appendix A §10, P4-R1 to P4-R3, P4-R7, P4-R11 to P4-R13, P4-R28): the findings page
// shell on Task 2's data. Task 2's rules (the tabs, the links, the way back) are tested by value in its own tests; these
// pin the wiring and the markup Task 7's E2E reads. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/audit/findings/page.tsx"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditFinding

test("the header: Task 2's way back, and one ส่งออก ▾ for audit:export whose links carry the filters and the locale, never the open finding or the page (P4-R7, P4-R12)", () => {
  const page = read(PAGE)
  assert.match(page, /const \{ rows, total, listPage, counts, back \} = data/)
  assert.match(page, /const backLabel = back\.target === "round" \? t\("backToRound"\) : t\("backToRounds"\)/)
  assert.match(page, /back=\{<PageBackLink href=\{back\.href\} label=\{backLabel\} \/>\}/)
  assert.match(page, /actions=\{canExport \? <AuditFindingsExportMenu excelHref=\{`\/api\/audit-findings\/export\?\$\{exportParams\.toString\(\)\}`\} pdfHref=\{`\/api\/audit-findings\/export-pdf\?\$\{exportParams\.toString\(\)\}`\} \/> : null\}/)
  assert.match(page, /exportParams\.set\("status", status\)\n\s+exportParams\.set\("locale", locale\)/)
  assert.doesNotMatch(page, /exportParams\.set\("(?:finding|page|pageSize|returnTo)"/, "an export is the whole filtered list")
  const menu = read("src/components/audit/audit-findings-export-menu.tsx")
  assert.match(menu, /^"use client"$/m)
  assert.match(menu, /^export function AuditFindingsExportMenu\(\{ excelHref, pdfHref \}: \{ excelHref: string; pdfHref: string \}\) \{$/m)
  assert.match(menu, /<DropdownMenu modal=\{false\}>/)
  assert.match(menu, /<Button variant="outline" size="md">\s*<Download aria-hidden="true" \/>\s*\{tCommon\("export"\)\}\s*<ChevronDown aria-hidden="true" \/>\s*<\/Button>/)
  assert.match(menu, /<a href=\{excelHref\} download>[\s\S]*?\{t\("exportFindings"\)\}\s*<DropdownMenuItemDescription>\{t\("exportFilteredHint"\)\}<\/DropdownMenuItemDescription>/)
  assert.match(menu, /<a href=\{pdfHref\} download>[\s\S]*?\{t\("exportFindingsPdf"\)\}\s*<DropdownMenuItemDescription>\{t\("exportFilteredHint"\)\}<\/DropdownMenuItemDescription>/)
})

test("six tabs with Task 2's counts, the sub-chips of ต้องติดตาม under them, a bell filter as its one chip, and no StatStrip (spec §10, P4-R1, P4-R3)", () => {
  const page = read(PAGE)
  assert.match(page, /const view = auditFindingStatusView\(status\)/)
  assert.match(page, /pending: t\("status_pending"\),\n\s+approved: t\("status_approved"\),\n\s+rejected: t\("status_rejected"\),\n\s+followUp: t\("tabFollowUp"\),\n\s+closed: t\("filterClosed"\),\n\s+all: t\("status_all"\),/)
  assert.match(page, /action_open: t\("filterActionOpen"\),\n\s+overdue: t\("filterOverdue"\),\n\s+exception: t\("status_exception"\),/)
  assert.match(page, /const resolutionFilters = auditFindingTabs\.map\(\(tab\) => \(\{ key: tab, label: tabLabels\[tab\], count: formatCount\(counts\[auditFindingTabStatus\[tab\]\]\), href: filterHref\(\{ status: auditFindingTabStatus\[tab\] \}\) \}\)\)/)
  assert.match(page, /const followUpChips = auditFindingFollowUpChips\.map\(\(chip\) => \(\{ key: chip, label: chipLabels\[chip\], count: formatCount\(counts\[chip\]\), href: filterHref\(\{ status: chip \}\) \}\)\)/)
  assert.match(page, /<TabNav aria-label=\{t\("quickFilters"\)\} items=\{resolutionFilters\} current=\{view\.tab\} scroll=\{false\} \/>\n\s+\{view\.tab === "followUp" \? <TabNav aria-label=\{t\("followUpChipsLabel"\)\} items=\{followUpChips\} current=\{view\.chip \?\? ""\} scroll=\{false\} \/> : null\}/)
  const chips = page.slice(page.indexOf("const filterChips"), page.indexOf("\n  ]\n", page.indexOf("const filterChips")))
  assert.match(chips, /\.\.\.\(isAuditFindingWaitingStatus\(status\) \? \[\{ key: "status", label: waitingLabels\[status\], href: filterHref\(\{ status: "follow_up" \}\) \}\] : \[\]\),/)
  assert.doesNotMatch(chips, /roundId|findingType/, "the selects show the round and the topic, so neither is a chip")
  assert.doesNotMatch(page, /<StatStrip\b|resolutionSummaryItems|ResolutionMetric|SUMMARY_STATUSES|summaryPendingReview|resolutionTitle|quickFiltersHelp|auditFindingResolutionStatuses/)
})

test("the filter row: รอบ and เรื่อง before the search, a round outside the options still named, the search keeping the status and the way back (spec §10, bug 19, P4-R28)", () => {
  const page = read(PAGE)
  const search = page.slice(page.indexOf("<MasterDataSearch"), page.indexOf("<FilterChipList"))
  assert.match(search, /hiddenInputs=\{Object\.fromEntries\(auditFindingsHrefQuery\(buildAuditFindingsHref\(locale, filters, \{ search: "", roundId: null, findingType: null, pageSize: listPage\.pageSize \}\)\)\)\}/)
  assert.match(search, /leading=\{\n\s+<>\n\s+<FilterSelect label=\{t\("roundShort"\)\} name="roundId" defaultValue=\{roundId \?\? ""\} allLabel=\{t\("roundFilterAll"\)\} options=\{roundOptions\} hideLabel fieldSize="md" className="sm:w-56" \/>\n\s+<FilterSelect label=\{t\("findingTopic"\)\} name="findingType" defaultValue=\{findingType \?\? ""\} allLabel=\{t\("topicFilterAll"\)\} options=\{topicOptions\} hideLabel fieldSize="md" className="sm:w-40" \/>\n\s+<\/>\n\s+\}/)
  assert.match(page, /const roundOptions: FilterSelectOption\[\] = data\.roundOptions\.map\(\(round\) => \(\{ value: round\.id, label: `\$\{round\.auditNo\} · \$\{round\.name\}` \}\)\)/)
  assert.match(page, /if \(roundId && !roundOptions\.some\(\(option\) => option\.value === roundId\)\) \{\n\s+roundOptions\.push\(\{ value: roundId, label: data\.filterRound \? `\$\{data\.filterRound\.auditNo\} · \$\{data\.filterRound\.name\}` : t\("filterNotListed"\) \}\)\n\s+\}/)
  // The topic is the round page's own short word (Task 2's auditFindingTypeShortLabelKeys); an unknown stored type reads
  // ไม่อยู่ในรายการ, never its code.
  assert.match(page, /const topicLabel = \(type: string\) => \{\n\s+const known = resolveAuditFindingType\(type\)\n\s+return known \? tRound\(auditFindingTypeShortLabelKeys\[known\]\) : t\("filterNotListed"\)\n\s+\}/)
  assert.match(page, /const topicOptions: FilterSelectOption\[\] = auditFindingTypes\.map\(\(type\) => \(\{ value: type, label: topicLabel\(type\) \}\)\)/)
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.match(layout, /^  hiddenInputs = \{\},\n  leading,\n  children,\n\}: \{$/m)
  assert.match(layout, /  leading\?: ReactNode\n/)
  assert.ok(layout.indexOf("{leading}") > layout.indexOf('type="hidden"') && layout.indexOf("{leading}") < layout.indexOf("<SearchField"), "leading sits after the hidden inputs and before the search")
})

test("the list's links are Task 2's one writer: a row keeps the page and opens its finding, a tab, sub-chip or filter goes to page 1 with no finding open, the pager goes to its page with no finding open while a page past the end goes to the last page with its finding kept (P4-R30), and every link keeps the way back (spec 2B §5.9.1; spec §10)", () => {
  const page = read(PAGE)
  assert.match(page, /const filters = parseAuditFindingsListFilters\(locale, await searchParams\)/)
  assert.match(page, /getAuditFindingsPageData\(\{ locale, filters, user, canApprove, typeSearchLabels, rules: waitingRules, now: pageLoadedAt \}\)/)
  assert.match(page, /const auditFindingsReturnHref = buildAuditFindingsHref\(locale, filters, \{ page: listPage\.page, pageSize: listPage\.pageSize, finding: filters\.findingId \}\)/)
  assert.match(page, /const pageHref = \(next: \{ page\?: number; pageSize\?: number \}\) => buildAuditFindingsHref\(locale, filters, next\)/, "the pager closes the panel, as a filter does (P4-R30)")
  assert.match(page, /redirect\(buildAuditFindingsHref\(locale, filters, \{ page: lastPage, pageSize: listPage\.pageSize, finding: filters\.findingId \}\)\)/, "the redirect past the end keeps the open finding (P4-R30)")
  assert.doesNotMatch(page, /redirect\(pageHref\(/, "not through the pager's href, which drops the finding")
  assert.match(page, /const filterHref = \(next: Pick<AuditFindingsHrefOverrides, "status" \| "search" \| "roundId" \| "findingType">\) => buildAuditFindingsHref\(locale, filters, \{ \.\.\.next, pageSize: listPage\.pageSize \}\)/)
  assert.match(page, /const findingHref = \(id: string\) => buildAuditFindingsHref\(locale, filters, \{ page: listPage\.page, pageSize: listPage\.pageSize, finding: id \}\)/)
  assert.match(page, /const closeHref = buildAuditFindingsHref\(locale, filters, \{ page: listPage\.page, pageSize: listPage\.pageSize \}\)/)
  assert.match(page, /const disposalHrefFor = \(finding: \{ id: string; findingType: string; asset: \{ id: string \} \| null; auditRound: \{ auditNo: string \} \}\) =>\n\s+canCreateDisposal && finding\.asset\n\s+\? appendOperationalReturnTo\(/)
  assert.doesNotMatch(page, /function buildAuditFindingsHref|new URLSearchParams\(\)\n\s+params\.set\("status"/, "the builder is Task 2's, in audit-finding-filters.ts")
})

test("two panes from xl: the list, then the 420px pane with its one panel slot, sticky from xl and opening each finding at its top; below xl an open finding takes the page behind กลับไปรายการไม่ตรง (spec §10, P4-R13, P4-R31)", () => {
  const page = read(PAGE)
  assert.match(page, /const chosen = data\.panel\?\.finding \?\? null/)
  assert.match(page, /<div data-audit-findings-panes className="grid min-w-0 gap-6 xl:grid-cols-\[minmax\(0,1fr\)_420px\] xl:items-start xl:gap-4">/)
  assert.match(page, /<div data-audit-findings-list className=\{cn\("min-w-0 space-y-4", chosen && "max-xl:hidden"\)\}>/)
  assert.match(page, /<div data-audit-finding-pane className=\{cn\("min-w-0 xl:sticky xl:top-4 xl:max-h-\[calc\(100dvh_-_var\(--shell-top\)_-_3rem\)\] xl:overflow-y-auto", !chosen && "max-xl:hidden"\)\}>\n\s+\{chosen \? <AuditFindingPaneTop key=\{chosen\.id\} \/> : null\}\n\s+\{chosen \? <PageBackLink href=\{closeHref\} label=\{t\("backToList"\)\} className="mb-3 xl:hidden" \/> : null\}\n\s+\{panel\}\n\s+<\/div>/)
  assert.match(read("src/components/audit/audit-finding-pane-top.tsx"), /if \(window\.matchMedia\("\(min-width: 1280px\)"\)\.matches\) document\.querySelector\("\[data-audit-finding-pane\]"\)\?\.scrollTo\(\{ top: 0 \}\)\n\s+else document\.getElementById\("main"\)\?\.scrollTo\(\{ top: 0 \}\)/, "each finding opens at its top: the page below xl, the pane from xl (P4-R31)")
  assert.ok(page.indexOf("<div data-audit-findings-list") < page.indexOf("<div data-audit-finding-pane "), "the list comes first")
  assert.doesNotMatch(page, /<aside\b|fixed inset-0/, "a section, not a landmark aside; full screen is the content area, not an overlay")
})

test("the table: เรื่อง as a Chip, the asset with its parent, ตามระบบ → ที่พบ with the plan's line, รอบ; a row opens the panel in place, carries its hooks and the open one is marked (spec §10, P4-R2, P4-R11)", () => {
  const page = read(PAGE)
  const table = page.slice(page.indexOf("<DataTable framed={false}"), page.indexOf("</DataTable>"))
  assert.deepEqual([...table.matchAll(/<DataTableHead\b[^>]*>(.*?)<\/DataTableHead>/g)].map((match) => match[1]), ['{t("findingTopic")}', '{t("asset")}', '{t("comparisonColumn")}', '{t("roundShort")}'])
  assert.match(table, /^<DataTable framed=\{false\} layout="fixed" minWidth=\{520\} className="hidden md:block" caption=\{t\("title"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(table, /<colgroup>\s*<col className="w-24" \/>\s*<col \/>\s*<col className="w-44" \/>\s*<col className="w-28" \/>\s*<\/colgroup>/)
  assert.match(table, /<TableEmptyRow colSpan=\{4\} emptyState=\{\{ icon: <FileText \/>, \.\.\.empty, actionVariant: "secondary" \}\} \/>/)
  assert.match(table, /<ClickableTableRow\n\s+key=\{row\.id\}\n\s+href=\{findingHref\(row\.id\)\}\n\s+scroll=\{false\}\n\s+current=\{row\.id === chosen\?\.id\}\n\s+rowData=\{\{ "data-audit-finding-row": row\.id, "data-finding-type": row\.findingType \}\}\n\s+label=\{`\$\{tCommon\("view"\)\}: \$\{code\} · \$\{topic\}`\}\n\s+>/)
  assert.match(table, /<DataTableCell><Chip data-audit-finding-subject>\{topic\}<\/Chip><\/DataTableCell>/)
  assert.match(table, /<Link href=\{findingHref\(row\.id\)\} scroll=\{false\} data-audit-finding-open className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "break-all"\)\}>\s*<span className="tag">\{code\}<\/span>\s*<\/Link>/)
  assert.match(table, /\{row\.parent \? <div className="break-words text-meta text-muted-foreground">\{t\("componentOfParent", \{ assetTag: row\.parent\.assetTag, name: row\.parent\.name \}\)\}<\/div> : null\}/)
  assert.match(table, /\{line \? <div className="mt-1 text-meta text-muted-foreground">\{line\}<\/div> : null\}/)
  assert.match(page, /const followUpLine = \(row: AuditFindingsPageRow\) =>\n\s+row\.actionStatus === "not_required"\n\s+\? null\n\s+: \[t\(`actionStatus_\$\{row\.actionStatus\}`\), row\.ownerLabel \?\? t\("noActionOwner"\), \.\.\.\(row\.actionDueDate \? \[t\("dueOn", \{ date: formatDateTime\(row\.actionDueDate\) \}\)\] : \[\]\)\]\.join\(" · "\)/)
  assert.doesNotMatch(table, /<StatusBadge\b|<AuditFindingReviewActions\b|<RowActions\b|sticky=|AuditFindingEvidenceList|buttonVariants\(/, "the decision, the plan, the badges and the evidence are the panel's")
  assert.doesNotMatch(page, /actionOwnerId \?|employeeLabelById/, "the owner is a name or Nil, never an id (P4-R11)")
})

test("phone cards stay, each one link that opens the panel full screen at the top through ?finding=, with the row's hooks (P4-R13)", () => {
  const page = read(PAGE)
  const cards = page.slice(page.indexOf('<div className="grid gap-3 p-3 md:hidden">'), page.indexOf("<DataTable framed={false}"))
  assert.match(cards, /<ActionEmptyState icon=\{<FileText \/>\} \{\.\.\.empty\} actionVariant="secondary" \/>/)
  assert.match(cards, /<article\n\s+key=\{row\.id\}\n\s+data-audit-finding-card=\{row\.id\}\n\s+data-finding-type=\{row\.findingType\}\n\s+className="relative min-w-0 rounded-md border border-border bg-background p-4 transition-colors hover:bg-row-hover"\n\s+>/)
  assert.match(cards, /<Link\n\s+href=\{findingHref\(row\.id\)\}\n\s+data-audit-finding-open\n\s+className="block break-words font-semibold text-foreground before:absolute before:inset-0 before:rounded-md before:content-\[''\] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"\n\s+>/)
  assert.match(cards, /<StatusBadge className="shrink-0" label=\{resolutionStateLabels\[resolutionState\]\} tone=\{RESOLUTION_STATE_TONES\[resolutionState\]\} \/>/)
  assert.match(cards, /<Chip data-audit-finding-subject>\{topicLabel\(row\.findingType\)\}<\/Chip>/)
  assert.match(cards, /\{row\.parent \? <p className="mt-1 break-words text-meta text-muted-foreground">\{t\("componentOfParent", \{ assetTag: row\.parent\.assetTag, name: row\.parent\.name \}\)\}<\/p> : null\}/)
  assert.doesNotMatch(cards, /scroll=\{false\}|<button\b|<Button\b|buttonVariants|<AuditFindingReviewActions\b/, "one link per card, opening at the top; the actions are in the panel")
})

test("the empty states: ล้างคำค้น after a search, else the way back (spec §5, Appendix A §10)", () => {
  const page = read(PAGE)
  assert.match(page, /const clearSearchHref = filterHref\(\{ search: "" \}\)/)
  assert.match(page, /const empty = searchText\n\s+\? \{ title: t\("emptySearchTitle"\), description: t\("emptySearchHelp"\), actionHref: clearSearchHref, actionLabel: t\("clearSearch"\) \}\n\s+: \{ title: t\("emptyTitle"\), description: t\("emptyHelp"\), actionHref: back\.href, actionLabel: backLabel \}/)
})

// Task 4 deletes this test with the interim body: its panel has its own tests, under the same two hooks.
test("until Task 4 the panel slot holds today's facts, badges, evidence, the asset and disposal links, and the review actions for audit:approve alone (Appendix A §10, M4)", () => {
  const page = read(PAGE)
  const panel = page.slice(page.indexOf("const panel = chosen ? ("), page.indexOf("return (\n    <div className=\"space-y-6\">"))
  assert.match(panel, /<div data-audit-finding-panel data-finding-id=\{chosen\.id\} className="min-w-0">\n\s+<ContentPanel divided title=\{t\("panelTitle"\)\}>\n\s+<div data-audit-finding-panel-body className="space-y-4">/)
  assert.match(panel, /<div data-audit-finding-panel-empty className="min-w-0">\n\s+<ContentPanel title=\{t\("panelTitle"\)\}>\n\s+<EmptyNote>\{findingId \? t\("panelNotFound"\) : t\("panelEmpty"\)\}<\/EmptyNote>/)
  assert.match(panel, /<FindingStatusBadges items=\{findingStatusBadges\(chosen, resolveFindingState\(chosen, today\)\)\} \/>/)
  assert.match(panel, /\{ key: "systemValue", label: t\("systemValue"\), value: chosen\.expectedLabel \}/)
  assert.match(panel, /\{ key: "actionOwner", label: t\("actionOwner"\), value: chosen\.ownerLabel, nilLabel: t\("noActionOwner"\) \}/)
  assert.match(panel, /<span className="tag font-medium">\{chosen\.asset\.assetTag\}<\/span> - \{chosen\.asset\.name\}/)
  assert.match(panel, /<Link href=\{`\/\$\{locale\}\/audit\/rounds\/\$\{chosen\.auditRound\.id\}`\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(panel, /<AuditFindingEvidenceList\n\s+attachments=\{chosen\.evidence\}/)
  assert.match(panel, /\{chosen\.asset \? <Link href=\{`\/\$\{locale\}\/assets\/\$\{chosen\.asset\.id\}`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\{t\("openAsset"\)\}<\/Link> : null\}/)
  assert.match(panel, /\{chosenDisposalHref \? \(\n\s+<Link href=\{chosenDisposalHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(panel, /\{canApprove \? \(\n\s+<AuditFindingReviewActions\n\s+key=\{chosen\.id\}\n\s+findingId=\{chosen\.id\}/)
  assert.match(panel, /employees=\{data\.employees\}/)
  assert.match(panel, /reviewBlocked=\{chosen\.reportedByViewer\}/)
  assert.match(page, /<StatusBadge label=\{item\.label\} status=\{item\.status\} tone=\{item\.tone\} \/>/, "the panel's badges, one list")
  assert.match(page, /<ul className="flex flex-wrap items-start gap-2">/, "the panel's badges wrap in a row")
})

test("ClickableTableRow: scroll={false} keeps the list where it is, current marks the open record with aria-current and primary-soft, hovered or not, and rowData puts a test's hooks on the row (DESIGN.md Data Tables)", async () => {
  const source = read("src/components/ui/clickable-table-row.tsx")
  assert.match(source, /^  scroll = true,\n  current = false,\n  rowData,\n  children,\n\}: \{$/m)
  assert.match(source, /  rowData\?: Readonly<Record<`data-\$\{string\}`, string>>\n/)
  assert.match(source, /<tr\n\s+\{\.\.\.rowData\}\n\s+ref=\{rowRef\}/)
  assert.match(source, /router\.push\(href, \{ scroll \}\)/)
  assert.match(source, /aria-current=\{current \? "true" : undefined\}/)
  assert.match(source, /^const clickableTableRowCurrentClasses = "bg-primary-soft hover:bg-primary-soft focus-within:bg-primary-soft has-\[\[aria-expanded=true\]\]:bg-primary-soft"$/m)
  assert.match(source, /className=\{cn\(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", current && clickableTableRowCurrentClasses, className\)\}/)
  // The fill wins over the shared hover, focus and open-menu fills (tailwind-merge drops them).
  const { cn } = await import("../src/lib/utils.ts")
  const merged = cn("group/row transition-colors hover:bg-row-hover hover:duration-0 focus-within:bg-row-hover focus-within:duration-0 has-[[aria-expanded=true]]:bg-row-hover", "bg-primary-soft hover:bg-primary-soft focus-within:bg-primary-soft has-[[aria-expanded=true]]:bg-primary-soft").split(" ")
  for (const gone of ["hover:bg-row-hover", "focus-within:bg-row-hover", "has-[[aria-expanded=true]]:bg-row-hover"]) assert.ok(!merged.includes(gone), gone)
  assert.ok(merged.includes("hover:bg-primary-soft"))
  const design = read("DESIGN.md")
  assert.ok(design.includes("`ClickableTableRow current` marks the record open beside the list"))
  assert.ok(design.includes("`MasterDataSearch leading`"))
})

test("the words of the findings page shell, in th and en (glossary: รายการไม่ตรง, ผู้ถือครอง, ที่ตั้ง, นอกขอบเขต, ส่วนควบ)", () => {
  const th = messages("th")
  const en = messages("en")
  const expected: Record<string, [string, string]> = {
    backToRound: ["กลับไปหน้ารอบ", "Back to the round"],
    backToList: ["กลับไปรายการไม่ตรง", "Back to the discrepancies"],
    followUpChipsLabel: ["งานที่ต้องติดตาม", "Follow-up work"],
    findingTopic: ["เรื่อง", "Issue"],
    roundShort: ["รอบ", "Round"],
    roundFilterAll: ["ทุกรอบ", "All rounds"],
    topicFilterAll: ["ทุกเรื่อง", "All issues"],
    filterNotListed: ["ไม่อยู่ในรายการ", "Not in the list"],
    componentOfParent: ["ส่วนควบของ {assetTag} {name}", "Component of {assetTag} {name}"],
    comparisonColumn: ["ตามระบบ → ที่พบ", "System → found"],
    panelTitle: ["พิจารณารายการไม่ตรง", "Review the discrepancy"],
    panelEmpty: ["เลือกรายการทางซ้ายเพื่อพิจารณา", "Choose a row on the left to review it"],
    panelNotFound: ["ไม่พบรายการไม่ตรงที่เลือก", "The chosen discrepancy was not found"],
    openAsset: ["เปิดหน้าทรัพย์สิน", "Open the asset"],
    exportFilteredHint: ["ตามตัวกรองที่เลือก", "With the filters in use"],
    emptySearchTitle: ["ไม่พบรายการไม่ตรงที่ตรงกับคำค้น", "No discrepancy matches the search"],
    emptySearchHelp: ["ลองคำค้นอื่น หรือล้างคำค้นเพื่อดูทุกรายการในแท็บนี้", "Try other words, or clear the search to see every row of this tab"],
    clearSearch: ["ล้างคำค้น", "Clear search"],
  }
  for (const [key, [thText, enText]] of Object.entries(expected)) {
    assert.equal(th[key], thText, `th ${key}`)
    assert.equal(en[key], enText, `en ${key}`)
  }
  // The tab and sub-chip words are today's keys, unchanged, and Task 2's tabFollowUp.
  for (const [key, text] of Object.entries({ status_pending: "รอพิจารณา", status_approved: "อนุมัติแล้ว", status_rejected: "ปฏิเสธแล้ว", tabFollowUp: "ต้องติดตาม", filterClosed: "ปิดแล้ว", status_all: "ทั้งหมด", filterActionOpen: "ต้องแก้ไข", filterOverdue: "เกินกำหนด", status_exception: "ต้องตรวจสอบพิเศษ", exportFindings: "ส่งออกรายการไม่ตรง", exportFindingsPdf: "ส่งออก PDF", quickFilters: "ตัวกรองงาน" })) {
    assert.equal(th[key], text, key)
  }
  for (const gone of ["resolutionTitle", "resolutionHelp", "quickFiltersHelp", "summaryPendingReview", "summaryPendingReviewHelp", "summaryOpenActions", "summaryOpenActionsHelp", "summaryOverdue", "summaryOverdueHelp", "summaryClosed", "summaryClosedHelp"]) {
    assert.equal(th[gone], undefined, `th ${gone}`)
    assert.equal(en[gone], undefined, `en ${gone}`)
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/audit-findings-page-ui.test.ts`
Expected: FAIL in every test:
- the page still has Task 2's interim wiring: the StatStrip, the eight quick filters, the two `<a download>` and the `compact` row actions;
- `audit-findings-export-menu.tsx` and `audit-finding-pane-top.tsx` do not exist (ENOENT);
- `MasterDataSearch` has no `leading`;
- `ClickableTableRow` has no `scroll`, `current` or `rowData`;
- `panelTitle`, `componentOfParent` and `openAsset` are undefined, and `comparisonColumn` is "ในระบบ → พบ".

- [ ] **Step 3: Add and change the words**

Write the change file in the session scratchpad (for example `<scratchpad>/g2p4-task3-messages.json`, an absolute path), run `node scripts/messages-edit.mjs <file>` from the repo root, then delete it. All keys are in the `auditFinding` namespace:

| Key | th | en |
|---|---|---|
| `backToRound` (new) | กลับไปหน้ารอบ | Back to the round |
| `backToList` (new) | กลับไปรายการไม่ตรง | Back to the discrepancies |
| `followUpChipsLabel` (new) | งานที่ต้องติดตาม | Follow-up work |
| `findingTopic` (new) | เรื่อง | Issue |
| `roundShort` (new) | รอบ | Round |
| `roundFilterAll` (new) | ทุกรอบ | All rounds |
| `topicFilterAll` (new) | ทุกเรื่อง | All issues |
| `filterNotListed` (new) | ไม่อยู่ในรายการ | Not in the list |
| `componentOfParent` (new) | ส่วนควบของ {assetTag} {name} | Component of {assetTag} {name} |
| `comparisonColumn` (changed th) | ตามระบบ → ที่พบ | System → found (unchanged) |
| `panelTitle` (new) | พิจารณารายการไม่ตรง | Review the discrepancy |
| `panelEmpty` (new) | เลือกรายการทางซ้ายเพื่อพิจารณา | Choose a row on the left to review it |
| `panelNotFound` (new) | ไม่พบรายการไม่ตรงที่เลือก | The chosen discrepancy was not found |
| `openAsset` (new) | เปิดหน้าทรัพย์สิน | Open the asset |
| `exportFilteredHint` (new) | ตามตัวกรองที่เลือก | With the filters in use |
| `emptySearchTitle` (new) | ไม่พบรายการไม่ตรงที่ตรงกับคำค้น | No discrepancy matches the search |
| `emptySearchHelp` (new) | ลองคำค้นอื่น หรือล้างคำค้นเพื่อดูทุกรายการในแท็บนี้ | Try other words, or clear the search to see every row of this tab |
| `clearSearch` (new) | ล้างคำค้น | Clear search |

The tab ต้องติดตาม is Task 2's `tabFollowUp`, and the เรื่อง short words are the round page's (`auditRound.differenceField_*`, `auditRound.notFound`, `auditRound.outOfScope`, through Task 2's `auditFindingTypeShortLabelKeys`): this task adds no second key for either. Task 4 reuses `componentOfParent`, `openAsset`, `panelTitle`, `panelEmpty` and `panelNotFound`.

Delete these 11 keys. Nothing reads them after this task: `rg -n 'summaryPendingReview|summaryOpenActions|summaryOverdue|summaryClosed|resolutionTitle|resolutionHelp|quickFiltersHelp' src` prints nothing once Step 4 is in (on master it matches only `src/app/[locale]/(dashboard)/audit/findings/page.tsx:207-229`, `:286-287` and `:316`, all replaced by Step 4; the bare `summary` prefix is not searched, because other pages such as `audit-round-form.tsx` and the master-data pages read their own `summary*` keys). The `asset.quickFiltersHelp` that `tests/asset-register-ux.test.ts:227` reads is another namespace and stays.
- `auditFinding.resolutionTitle`
- `auditFinding.resolutionHelp`
- `auditFinding.quickFiltersHelp`
- `auditFinding.summaryPendingReview`
- `auditFinding.summaryPendingReviewHelp`
- `auditFinding.summaryOpenActions`
- `auditFinding.summaryOpenActionsHelp`
- `auditFinding.summaryOverdue`
- `auditFinding.summaryOverdueHelp`
- `auditFinding.summaryClosed`
- `auditFinding.summaryClosedHelp`

Kept and reused:
- `title`, `subtitle`, `backToRounds`, `quickFilters` "ตัวกรองงาน" (the tabs' name), `tabFollowUp` (Task 2);
- `status_pending` / `_approved` / `_rejected` / `_all`, `filterClosed`, `filterActionOpen`, `filterOverdue`, `status_exception` (the tab and sub-chip words, spec §10);
- `activeFilters`, `asset`, `auditRound`, `systemValue`, `foundValue`, `actionOwner`, `noActionOwner`, `actionDueDate`, `dueOn`;
- `actionStatus_*`, `type_*`, `resolutionState*`;
- `evidenceAttachments`, `evidenceAttachmentCount`, `openEvidenceAttachment`, `openDisposalRequest`, `disposalFromFindingReason`, `segregationReviewBlocked`;
- `exportFindings`, `exportFindingsPdf`, `emptyTitle`, `emptyHelp`;
- `freshness*`, `reportedAt` (Task 4's "ตรวจโดย … · เวลา");
- `common.export` "ส่งออก" (the menu's trigger), `common.view`, `notifications.openAuditActions` / `auditActionsDueSoon` (the bell chip);
- `auditRound.differenceField_*`, `auditRound.notFound`, `auditRound.outOfScope` (the เรื่อง words, read with `tRound`).

Glossary (`docs/19_THAI_GLOSSARY.md`):
- "รายการไม่ตรง" (2.1 row 2) in the panel title, the empty titles and "กลับไปรายการไม่ตรง";
- "พิจารณา" (row 3);
- "ผู้ถือครอง" (row 12), not ผู้ครอบครอง;
- "ที่ตั้ง" (row 1);
- "นอกขอบเขต" (row 9);
- "ตัวกรอง" (2.2);
- "ส่วนควบ" as the scan screen and `assetDetail.componentOf` already write it.

ICU: `componentOfParent` has two placeholders in th and en (`tests/messages-parity.test.ts`). The arrow "→" is a plain character. No apostrophe is used.

- [ ] **Step 4: Implement**

Line numbers are master `704f2b26`. Task 2 has already rewired the page's data, so the page is written whole here, on Task 2's names (P4-R20). The way back is Task 2's `data.back`; no return-to helper is added here.

- **`src/components/ui/clickable-table-row.tsx`**:
  - `:12-24` (the props) become:

    ```tsx
    // The record that is open beside the list (the findings review panel): the primary-soft fill, hovered, focused or with
    // its menu open, so the open row never looks like a hovered one (DESIGN.md Data Tables; faint text stays AA on it).
    const clickableTableRowCurrentClasses = "bg-primary-soft hover:bg-primary-soft focus-within:bg-primary-soft has-[[aria-expanded=true]]:bg-primary-soft"

    export function ClickableTableRow({
      href,
      label,
      className,
      onNavigate,
      scroll = true,
      current = false,
      rowData,
      children,
    }: {
      href: string
      label: string
      className?: string
      onNavigate?: () => boolean | void
      /** false keeps the scroll position: the row opens its record in a panel of the same page (the findings list). */
      scroll?: boolean
      /** The record open beside the list: aria-current="true" and the primary-soft fill. */
      current?: boolean
      /** data-* hooks on the <tr>, for the tests that read a row (the findings list: its finding id and type). */
      rowData?: Readonly<Record<`data-${string}`, string>>
      children: React.ReactNode
    }) {
    ```
  - `:40` becomes `router.push(href, { scroll })`.
  - The `<tr>` (`:44-60`) opens with `{...rowData}` before `ref={rowRef}`, so the row's own props win. After `aria-label={label}` comes `aria-current={current ? "true" : undefined}`. The `className` becomes `className={cn(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", current && clickableTableRowCurrentClasses, className)}`.
  - Nothing else changes: the ignore list `a,button,input,select,textarea,[data-no-row-click]`, the before-navigate event and `onNavigate`. Every other caller passes none of the three props, so it keeps `{ scroll: true }`, which is `router.push`'s default.

- **`src/components/master-data/master-data-layout.tsx`**:
  - `:10-11` become `hiddenInputs = {},\n  leading,\n  children,`.
  - After `hiddenInputs?: Record<string, string | number>` (`:17`) comes:

    ```tsx
      // Toolbar fields before the search (a FilterSelect with hideLabel and fieldSize="md"): the findings page's รอบ and
      // เรื่อง, whose search comes last (group 2 spec §10). The visual order is the DOM order.
      leading?: ReactNode
    ```
  - After the hidden inputs (`:26-28`), before `<SearchField` (`:29`), comes `{leading}`.
  - `children` stays between the field and the button (`tests/list-primitives-ui.test.ts:317`).

- **`src/components/audit/audit-findings-export-menu.tsx`** (new):

  ```tsx
  "use client"

  import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react"
  import { useTranslations } from "next-intl"
  import { Button } from "@/components/ui/button"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuItemDescription,
    DropdownMenuItemText,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"

  // The findings page's "ส่งออก ▾" (group 2 spec §10, P4-R7): the Excel and the PDF of the list as filtered, each an
  // <a download> (spec 2D M31), as the round page's menu (audit-round-header-menus.tsx). The page builds the hrefs, with
  // its filters and locale, and renders the menu only for audit:export (E2E AU1, M1).
  export function AuditFindingsExportMenu({ excelHref, pdfHref }: { excelHref: string; pdfHref: string }) {
    const t = useTranslations("auditFinding")
    const tCommon = useTranslations("common")

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="md">
            <Download aria-hidden="true" />
            {tCommon("export")}
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem asChild>
            <a href={excelHref} download>
              <FileSpreadsheet aria-hidden="true" />
              <DropdownMenuItemText>
                {t("exportFindings")}
                <DropdownMenuItemDescription>{t("exportFilteredHint")}</DropdownMenuItemDescription>
              </DropdownMenuItemText>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={pdfHref} download>
              <FileText aria-hidden="true" />
              <DropdownMenuItemText>
                {t("exportFindingsPdf")}
                <DropdownMenuItemDescription>{t("exportFilteredHint")}</DropdownMenuItemDescription>
              </DropdownMenuItemText>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
  ```

- **`src/components/audit/audit-finding-pane-top.tsx`** (new):

  ```tsx
  "use client"

  import { useEffect } from "react"

  // Each open finding starts at its top (P4-R13, P4-R31). Rows and Task 4's next finding open with scroll={false}, which
  // the list beside the panel needs from xl. The pane mounts this once per finding (its key): below xl, where the panel
  // takes the page in place of the list, it brings the dashboard's scroll area (#main) to the top; from xl, where the
  // pane sticks and scrolls on its own, it brings the pane to its top and leaves the list where it was.
  export function AuditFindingPaneTop() {
    useEffect(() => {
      if (window.matchMedia("(min-width: 1280px)").matches) document.querySelector("[data-audit-finding-pane]")?.scrollTo({ top: 0 })
      else document.getElementById("main")?.scrollTo({ top: 0 })
    }, [])
    return null
  }
  ```

- **`src/lib/audit-finding-filters.ts`**: Task 2's `auditFindingResolutionStatuses` and its comment ("The page's eight quick filters until Task 3 draws the six tabs") go. Nothing else in the file changes.

- **`src/app/[locale]/(dashboard)/audit/findings/page.tsx`** (whole file):

  ```tsx
  import Link from "next/link"
  import { redirect } from "next/navigation"
  import { getTranslations } from "next-intl/server"
  import { ArrowRight, FileText } from "lucide-react"
  import { hasPermission } from "@/lib/auth-utils"
  import { requirePagePermission } from "@/lib/page-auth"
  import { MasterDataSearch } from "@/components/master-data/master-data-layout"
  import { AuditFindingReviewActions } from "@/components/audit/audit-finding-review-actions"
  import { AuditFindingsBatchActions } from "@/components/audit/audit-findings-batch-actions"
  import { AuditFindingsExportMenu } from "@/components/audit/audit-findings-export-menu"
  import { AuditFindingPaneTop } from "@/components/audit/audit-finding-pane-top"
  import { cn, formatDateTime } from "@/lib/utils"
  import { formatFileSize } from "@/lib/uploads"
  import { ClickableTableRow } from "@/components/ui/clickable-table-row"
  import { ActionEmptyState } from "@/components/ui/action-empty-state"
  import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
  import { Chip } from "@/components/ui/chip"
  import { ContentPanel } from "@/components/ui/content-panel"
  import { DataFreshnessBanner } from "@/components/ui/data-freshness-banner"
  import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
  import { EmptyNote } from "@/components/ui/empty-note"
  import { FilterChipList, type FilterChipItem } from "@/components/ui/filter-chips"
  import { FilterSelect, type FilterSelectOption } from "@/components/ui/filter-select"
  import { KeyValueList } from "@/components/ui/key-value-list"
  import { orNil } from "@/components/ui/nil"
  import { PageBackLink, PageHeader } from "@/components/ui/page-header"
  import { Pagination } from "@/components/ui/pagination"
  import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
  import { TabNav } from "@/components/ui/tab-nav"
  import {
    auditFindingFollowUpChips,
    auditFindingStatusView,
    auditFindingTabStatus,
    auditFindingTabs,
    auditFindingTypeShortLabelKeys,
    auditFindingTypes,
    auditFindingsHrefQuery,
    buildAuditFindingsHref,
    getAuditFindingToday,
    isAuditFindingWaitingStatus,
    isOpenAuditFindingActionStatus,
    parseAuditFindingsListFilters,
    resolveAuditFindingType,
    type AuditFindingFollowUpChip,
    type AuditFindingTab,
    type AuditFindingsHrefOverrides,
  } from "@/lib/audit-finding-filters"
  import { getAuditFindingTypeSearchLabels } from "@/lib/audit-finding-search-labels"
  import { getAuditFindingsPageData, type AuditFindingEvidenceAttachment, type AuditFindingsPageRow } from "@/lib/audit-findings-page-data"
  import { getWaitingWorkRules } from "@/lib/waiting-work"
  import { DEFAULT_WAITING_WORK_RULES } from "@/lib/waiting-work-rules"
  import { getPanelClasses } from "@/lib/design-system"
  import { formatCount } from "@/lib/display-format"
  import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
  import { paginationRange } from "@/lib/master-data-query"
  import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
  import { withPerformanceTiming } from "@/lib/performance-timing"
  import { getAuditItemReconcileStatusLabelKey, getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"

  type AuditFindingsPageProps = {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ search?: string; status?: string; roundId?: string; findingType?: string; finding?: string; returnTo?: string; page?: string | string[]; pageSize?: string | string[] }>
  }

  export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
    const { locale } = await params
    const filters = parseAuditFindingsListFilters(locale, await searchParams)
    const { status, search: searchText, roundId, findingType, findingId } = filters
    const user = await requirePagePermission(locale, "audit", "view")
    const canApprove = hasPermission(user, "audit", "approve")
    // The exports' routes need audit:export (spec §6.5: a role without it does not see them; the E2E suite's AU1, M1).
    const canExport = hasPermission(user, "audit", "export")
    const canCreateDisposal = hasPermission(user, "disposal", "create")

    const t = await getTranslations("auditFinding")
    const tRound = await getTranslations("auditRound")
    const tCommon = await getTranslations("common")
    const tAsset = await getTranslations("asset")
    const tNotifications = await getTranslations("notifications")
    const formatAuditItemStatus = (status: string) => {
      const key = getAuditItemStatusLabelKey(status)
      return key ? t(key) : status
    }
    const formatReconcileStatus = (status: string) => {
      const key = getAuditItemReconcileStatusLabelKey(status)
      return key ? t(key) : status
    }

    // Task 2's one load, as Task 2 wired it: every count, the rows and the open finding come from one builder.
    const pageLoadedAt = new Date()
    // The bell's two action kinds read its own day count; other statuses read no setting.
    const waitingRules = isAuditFindingWaitingStatus(status) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES
    const typeSearchLabels = await getAuditFindingTypeSearchLabels()
    const data = await withPerformanceTiming(
      "audit-findings.page-data",
      () => getAuditFindingsPageData({ locale, filters, user, canApprove, typeSearchLabels, rules: waitingRules, now: pageLoadedAt }),
      { route: "/audit/findings", locale, status, hasSearch: Boolean(searchText), hasFinding: Boolean(findingId) }
    )
    const { rows, total, listPage, counts, back } = data
    // The finding open in the panel (?finding=), wherever it is in the list (Task 2).
    const chosen = data.panel?.finding ?? null
    const today = getAuditFindingToday(pageLoadedAt)
    // ต้องติดตาม and its sub-chips (P4-R3): an old value opens its tab and sub-chip; a bell value opens ต้องติดตาม with its chip.
    const view = auditFindingStatusView(status)
    // The way back (P4-R12): Task 2's returnTo, else the round of roundId, else the rounds list.
    const backLabel = back.target === "round" ? t("backToRound") : t("backToRounds")

    // Every link is Task 2's one writer, so returnTo rides on each (spec 2B §5.9.2 row 3; spec §10).
    const auditFindingsReturnHref = buildAuditFindingsHref(locale, filters, { page: listPage.page, pageSize: listPage.pageSize, finding: filters.findingId })
    // This list at another page or page size, with the same filters and no finding open, as a filter does (P4-R30). A link
    // with a finding and no page opens the page that holds it (P4-R18), so a pager link to page 1 that kept the finding
    // would land back on the finding's page.
    const pageHref = (next: { page?: number; pageSize?: number }) => buildAuditFindingsHref(locale, filters, next)
    // Another tab, sub-chip or filter: page 1 with the page size kept (spec 2B §5.9.1), and no finding open.
    const filterHref = (next: Pick<AuditFindingsHrefOverrides, "status" | "search" | "roundId" | "findingType">) => buildAuditFindingsHref(locale, filters, { ...next, pageSize: listPage.pageSize })
    // A row or a card: this list with that finding open in the panel (?finding=, spec §10).
    const findingHref = (id: string) => buildAuditFindingsHref(locale, filters, { page: listPage.page, pageSize: listPage.pageSize, finding: id })
    const closeHref = buildAuditFindingsHref(locale, filters, { page: listPage.page, pageSize: listPage.pageSize })
    const clearSearchHref = filterHref({ search: "" })
    // The disposal request from a finding, back to this list and its finding (Appendix A §10 bullet 4). Task 4's panel
    // takes it too.
    const disposalHrefFor = (finding: { id: string; findingType: string; asset: { id: string } | null; auditRound: { auditNo: string } }) =>
      canCreateDisposal && finding.asset
        ? appendOperationalReturnTo(`/${locale}/disposal/new?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`, auditFindingsReturnHref)
        : null

    // A page past the last one (an old link, or the last finding of the last page decided) shows the last page (spec 2B I21).
    // It keeps the open finding, unlike the pager (P4-R30): the panel stays on the finding it showed.
    const lastPage = lastListPage(total, listPage.pageSize)
    if (rows.length === 0 && total > 0 && listPage.page > lastPage) {
      redirect(buildAuditFindingsHref(locale, filters, { page: lastPage, pageSize: listPage.pageSize, finding: filters.findingId }))
    }
    const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)

    // The whole filtered list, in the reader's language (P4-R7); never the open finding or the page.
    const exportParams = new URLSearchParams()
    if (searchText) exportParams.set("search", searchText)
    if (roundId) exportParams.set("roundId", roundId)
    if (findingType) exportParams.set("findingType", findingType)
    exportParams.set("status", status)
    exportParams.set("locale", locale)

    const tabLabels: Record<AuditFindingTab, string> = {
      pending: t("status_pending"),
      approved: t("status_approved"),
      rejected: t("status_rejected"),
      followUp: t("tabFollowUp"),
      closed: t("filterClosed"),
      all: t("status_all"),
    }
    const chipLabels: Record<AuditFindingFollowUpChip, string> = {
      action_open: t("filterActionOpen"),
      overdue: t("filterOverdue"),
      exception: t("status_exception"),
    }
    const waitingLabels = {
      action_not_due: tNotifications("openAuditActions"),
      action_due_soon: tNotifications("auditActionsDueSoon"),
    }
    // The tab and sub-chip counts replace the strip (P4-R1); each is built from the where of the rows it opens (spec §5).
    const resolutionFilters = auditFindingTabs.map((tab) => ({ key: tab, label: tabLabels[tab], count: formatCount(counts[auditFindingTabStatus[tab]]), href: filterHref({ status: auditFindingTabStatus[tab] }) }))
    const followUpChips = auditFindingFollowUpChips.map((chip) => ({ key: chip, label: chipLabels[chip], count: formatCount(counts[chip]), href: filterHref({ status: chip }) }))
    // A bell link's filter is narrower than ต้องติดตาม and has no sub-chip, so it shows as a chip; removing it opens the tab.
    const filterChips: FilterChipItem[] = [
      ...(isAuditFindingWaitingStatus(status) ? [{ key: "status", label: waitingLabels[status], href: filterHref({ status: "follow_up" }) }] : []),
    ]
    // "รอบ:" and "เรื่อง:" (spec §10, bug 19, P4-R28): a round the options do not hold still shows, by its number or as
    // ไม่อยู่ในรายการ; an unknown type is null already (Task 2), so it never reaches the select.
    const roundOptions: FilterSelectOption[] = data.roundOptions.map((round) => ({ value: round.id, label: `${round.auditNo} · ${round.name}` }))
    if (roundId && !roundOptions.some((option) => option.value === roundId)) {
      roundOptions.push({ value: roundId, label: data.filterRound ? `${data.filterRound.auditNo} · ${data.filterRound.name}` : t("filterNotListed") })
    }
    // เรื่อง names the field in the round page's one short word (P4-R2): a Chip, since it names something and is not a
    // state. A stored type the app does not know reads ไม่อยู่ในรายการ, never its code.
    const topicLabel = (type: string) => {
      const known = resolveAuditFindingType(type)
      return known ? tRound(auditFindingTypeShortLabelKeys[known]) : t("filterNotListed")
    }
    const topicOptions: FilterSelectOption[] = auditFindingTypes.map((type) => ({ value: type, label: topicLabel(type) }))

    const resolutionStateLabels: Record<ResolutionState, string> = {
      pending_review: t("resolutionStatePendingReview"),
      open_action: t("resolutionStateOpenAction"),
      overdue: t("resolutionStateOverdue"),
      closed: t("resolutionStateClosed"),
      resolved: t("resolutionStateResolved"),
    }
    // The plan of a finding that has one, under its values (Appendix A §10 keeps owner and due date on the list): its
    // state, the owner's name (never an id, P4-R11) and the due date.
    const followUpLine = (row: AuditFindingsPageRow) =>
      row.actionStatus === "not_required"
        ? null
        : [t(`actionStatus_${row.actionStatus}`), row.ownerLabel ?? t("noActionOwner"), ...(row.actionDueDate ? [t("dueOn", { date: formatDateTime(row.actionDueDate) })] : [])].join(" · ")
    // A search with no rows offers "ล้างคำค้น" (spec §5); otherwise the way back.
    const empty = searchText
      ? { title: t("emptySearchTitle"), description: t("emptySearchHelp"), actionHref: clearSearchHref, actionLabel: t("clearSearch") }
      : { title: t("emptyTitle"), description: t("emptyHelp"), actionHref: back.href, actionLabel: backLabel }
    // The batch (until Task 5): the page's findings the viewer may decide (Task 2's reviewable, the route's own rule).
    const batchReviewFindings = rows
      .filter((row) => row.reviewable)
      .map((row) => ({
        id: row.id,
        label: row.asset ? `${row.asset.assetTag} - ${row.asset.name}` : row.auditRound.auditNo,
        detail: `${row.auditRound.auditNo} · ${t(`type_${row.findingType}`)}`,
      }))
    // The batch selection belongs to one page of one filter: another page or filter starts with nothing selected. The open
    // finding is not part of it, so opening a row keeps the selection.
    const selectionKey = `${listPage.page}:${listPage.pageSize}:${status}:${searchText}:${roundId ?? ""}:${findingType ?? ""}`
    // The five statuses of a finding (audit mobile fix D8): the resolution state always, the others only when they add
    // something to it. Each keeps the tone it had in its own column. Shown in the panel since group 2 plan 4.
    const findingStatusBadges = (finding: AuditFindingsPageRow, resolutionState: ResolutionState): FindingStatusBadgeItem[] => [
      { key: "resolutionState", title: t("resolutionState"), label: resolutionStateLabels[resolutionState], tone: RESOLUTION_STATE_TONES[resolutionState] },
      // "รอพิจารณา" already says the review is pending.
      ...(resolutionState === "pending_review" ? [] : [{ key: "reviewStatus", title: t("reviewStatus"), label: t(`status_${finding.reviewStatus}`), status: finding.reviewStatus }]),
      // No plan is needed, or the finding is closed and the state says so.
      ...(finding.actionStatus === "not_required" || resolutionState === "closed" ? [] : [{ key: "actionStatus", title: t("actionStatus"), label: t(`actionStatus_${finding.actionStatus}`), status: finding.actionStatus }]),
      // Every finding comes from a checked item: "ตรวจแล้ว" (scanned or reviewed) tells nothing new.
      ...(finding.auditItem.auditStatus === "scanned" || finding.auditItem.auditStatus === "reviewed" ? [] : [{ key: "itemStatus", title: t("itemStatus"), label: formatAuditItemStatus(finding.auditItem.auditStatus), status: finding.auditItem.auditStatus }]),
      // Nothing reconciled yet: no badge.
      ...(!finding.auditItem.reconcileStatus || finding.auditItem.reconcileStatus === "pending" ? [] : [{ key: "reconcileStatus", title: t("reconcileStatus"), label: formatReconcileStatus(finding.auditItem.reconcileStatus), status: finding.auditItem.reconcileStatus }]),
    ]
    const chosenDisposalHref = chosen ? disposalHrefFor(chosen) : null

    // The review panel's slot (spec §10): the open finding, or the empty panel, rendered once. Task 4 replaces this
    // expression with its own panel under the same two hooks; until then the body is today's card for the open finding,
    // so plan, close and the decision keep working between the two commits (Appendix A §10).
    const panel = chosen ? (
      <div data-audit-finding-panel data-finding-id={chosen.id} className="min-w-0">
        <ContentPanel divided title={t("panelTitle")}>
          <div data-audit-finding-panel-body className="space-y-4">
            <FindingStatusBadges items={findingStatusBadges(chosen, resolveFindingState(chosen, today))} />
            <KeyValueList
              items={[
                { key: "findingType", label: t("findingTopic"), value: t(`type_${chosen.findingType}`) },
                {
                  key: "asset",
                  label: t("asset"),
                  value: chosen.asset ? (
                    <>
                      <span className="tag font-medium">{chosen.asset.assetTag}</span> - {chosen.asset.name}
                      {chosen.parent ? <span className="mt-0.5 block text-meta text-muted-foreground">{t("componentOfParent", { assetTag: chosen.parent.assetTag, name: chosen.parent.name })}</span> : null}
                    </>
                  ) : null,
                },
                {
                  key: "auditRound",
                  label: t("auditRound"),
                  value: (
                    <Link href={`/${locale}/audit/rounds/${chosen.auditRound.id}`} className={linkVariants({ size: "inherit" })}>
                      <span className="tag">{chosen.auditRound.auditNo}</span> · {chosen.auditRound.name}
                    </Link>
                  ),
                },
                { key: "systemValue", label: t("systemValue"), value: chosen.expectedLabel },
                { key: "foundValue", label: t("foundValue"), value: chosen.actualLabel ? <span className="font-medium">{chosen.actualLabel}</span> : null },
                { key: "actionOwner", label: t("actionOwner"), value: chosen.ownerLabel, nilLabel: t("noActionOwner") },
                { key: "actionDueDate", label: t("actionDueDate"), value: chosen.actionDueDate ? formatDateTime(chosen.actionDueDate) : null },
              ]}
            />
            <AuditFindingEvidenceList
              attachments={chosen.evidence}
              labels={{
                title: t("evidenceAttachments"),
                count: t("evidenceAttachmentCount", { count: chosen.evidence.length }),
                open: t("openEvidenceAttachment"),
              }}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {chosen.asset ? <Link href={`/${locale}/assets/${chosen.asset.id}`} className={buttonVariants({ variant: "outline", size: "md" })}>{t("openAsset")}</Link> : null}
              {chosenDisposalHref ? (
                <Link href={chosenDisposalHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                  {t("openDisposalRequest")}
                </Link>
              ) : null}
            </div>
            {canApprove ? (
              <AuditFindingReviewActions
                key={chosen.id}
                findingId={chosen.id}
                assetLabel={chosen.asset ? `${chosen.asset.assetTag} - ${chosen.asset.name}` : chosen.auditRound.auditNo}
                findingTypeLabel={t(`type_${chosen.findingType}`)}
                expectedValue={chosen.expectedLabel}
                actualValue={chosen.actualLabel}
                reviewStatus={chosen.reviewStatus}
                actionStatus={chosen.actionStatus}
                actionPlan={chosen.actionPlan}
                actionOwnerId={chosen.actionOwnerId}
                actionDueDate={chosen.actionDueDate}
                evidenceCount={chosen.evidence.length}
                employees={data.employees}
                reviewBlocked={chosen.reportedByViewer}
                reviewBlockedReason={t("segregationReviewBlocked")}
              />
            ) : null}
          </div>
        </ContentPanel>
      </div>
    ) : (
      <div data-audit-finding-panel-empty className="min-w-0">
        <ContentPanel title={t("panelTitle")}>
          <EmptyNote>{findingId ? t("panelNotFound") : t("panelEmpty")}</EmptyNote>
        </ContentPanel>
      </div>
    )

    return (
      <div className="space-y-6">
        <PageHeader
          title={t("title")}
          meta={t("subtitle")}
          back={<PageBackLink href={back.href} label={backLabel} />}
          actions={canExport ? <AuditFindingsExportMenu excelHref={`/api/audit-findings/export?${exportParams.toString()}`} pdfHref={`/api/audit-findings/export-pdf?${exportParams.toString()}`} /> : null}
        />

        <DataFreshnessBanner
          loadedAtIso={data.loadedAt.toISOString()}
          loadedAtLabel={formatDateTime(data.loadedAt)}
          labels={{
            freshTitle: t("freshnessFreshTitle"),
            freshHelp: t("freshnessFreshHelp"),
            staleTitle: t("freshnessStaleTitle"),
            staleHelp: t("freshnessStaleHelp"),
            refresh: t("freshnessRefresh"),
          }}
        />

        {/* Two panes from xl (spec §10): the list, then the review pane (420px, sticky from xl and scrolling on its own,
            P4-R31). Below xl an open finding takes the page and the list waits behind "กลับไปรายการไม่ตรง" (P4-R13); with
            none open the pane is not shown there. AuditFindingPaneTop opens each finding at its top. */}
        <div data-audit-findings-panes className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start xl:gap-4">
          <div data-audit-findings-list className={cn("min-w-0 space-y-4", chosen && "max-xl:hidden")}>
            <div>
              <TabNav aria-label={t("quickFilters")} items={resolutionFilters} current={view.tab} scroll={false} />
              {view.tab === "followUp" ? <TabNav aria-label={t("followUpChipsLabel")} items={followUpChips} current={view.chip ?? ""} scroll={false} /> : null}
            </div>

            <MasterDataSearch
              action={`/${locale}/audit/findings`}
              defaultValue={searchText}
              placeholder={tCommon("search")}
              submitLabel={tCommon("search")}
              hiddenInputs={Object.fromEntries(auditFindingsHrefQuery(buildAuditFindingsHref(locale, filters, { search: "", roundId: null, findingType: null, pageSize: listPage.pageSize })))}
              leading={
                <>
                  <FilterSelect label={t("roundShort")} name="roundId" defaultValue={roundId ?? ""} allLabel={t("roundFilterAll")} options={roundOptions} hideLabel fieldSize="md" className="sm:w-56" />
                  <FilterSelect label={t("findingTopic")} name="findingType" defaultValue={findingType ?? ""} allLabel={t("topicFilterAll")} options={topicOptions} hideLabel fieldSize="md" className="sm:w-40" />
                </>
              }
            />
            <FilterChipList chips={filterChips} label={t("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")} />

            {canApprove ? <AuditFindingsBatchActions key={selectionKey} findings={batchReviewFindings} /> : null}

            <div className={cn(getPanelClasses(), "overflow-hidden")}>
              <div className="grid gap-3 p-3 md:hidden">
                {rows.length === 0 ? (
                  <ActionEmptyState icon={<FileText />} {...empty} actionVariant="secondary" />
                ) : (
                  rows.map((row) => {
                    const resolutionState = resolveFindingState(row, today)
                    const code = row.asset?.assetTag ?? row.auditRound.auditNo
                    const line = followUpLine(row)

                    return (
                      <article
                        key={row.id}
                        data-audit-finding-card={row.id}
                        data-finding-type={row.findingType}
                        className="relative min-w-0 rounded-md border border-border bg-background p-4 transition-colors hover:bg-row-hover"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {/* The whole card is this link (the register's stretched-link row): a tap opens the panel full
                                screen at the top of the page, so the default scroll stays (P4-R13). */}
                            <Link
                              href={findingHref(row.id)}
                              data-audit-finding-open
                              className="block break-words font-semibold text-foreground before:absolute before:inset-0 before:rounded-md before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"
                            >
                              <span className="tag font-medium">{code}</span>
                              {row.asset ? <> - {row.asset.name}</> : null}
                            </Link>
                            {row.parent ? <p className="mt-1 break-words text-meta text-muted-foreground">{t("componentOfParent", { assetTag: row.parent.assetTag, name: row.parent.name })}</p> : null}
                          </div>
                          <StatusBadge className="shrink-0" label={resolutionStateLabels[resolutionState]} tone={RESOLUTION_STATE_TONES[resolutionState]} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                          <Chip data-audit-finding-subject>{topicLabel(row.findingType)}</Chip>
                          <span className="tag">{row.auditRound.auditNo}</span>
                        </div>
                        <FindingValueChange className="mt-2" expectedLabel={t("systemValue")} actualLabel={t("foundValue")} expectedValue={row.expectedLabel} actualValue={row.actualLabel} />
                        {line ? <p className="mt-1 text-meta text-muted-foreground">{line}</p> : null}
                      </article>
                    )
                  })
                )}
              </div>
              <DataTable framed={false} layout="fixed" minWidth={520} className="hidden md:block" caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
                {/* Four columns (spec §10): เรื่อง, ทรัพย์สิน, ตามระบบ → ที่พบ, รอบ; the asset takes what is left. 520px fits
                    the list pane beside the 420px panel at 1280 (527px) and 1440 (685px). Task 5 adds the tick column first. */}
                <colgroup>
                  <col className="w-24" />
                  <col />
                  <col className="w-44" />
                  <col className="w-28" />
                </colgroup>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("findingTopic")}</DataTableHead>
                    <DataTableHead>{t("asset")}</DataTableHead>
                    <DataTableHead className="whitespace-normal">{t("comparisonColumn")}</DataTableHead>
                    <DataTableHead>{t("roundShort")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {rows.length === 0 ? (
                    <TableEmptyRow colSpan={4} emptyState={{ icon: <FileText />, ...empty, actionVariant: "secondary" }} />
                  ) : (
                    rows.map((row) => {
                      const code = row.asset?.assetTag ?? row.auditRound.auditNo
                      const topic = topicLabel(row.findingType)
                      const line = followUpLine(row)

                      return (
                        <ClickableTableRow
                          key={row.id}
                          href={findingHref(row.id)}
                          scroll={false}
                          current={row.id === chosen?.id}
                          rowData={{ "data-audit-finding-row": row.id, "data-finding-type": row.findingType }}
                          label={`${tCommon("view")}: ${code} · ${topic}`}
                        >
                          <DataTableCell><Chip data-audit-finding-subject>{topic}</Chip></DataTableCell>
                          <DataTableCell>
                            <Link href={findingHref(row.id)} scroll={false} data-audit-finding-open className={cn(linkVariants({ size: "inherit" }), "break-all")}>
                              <span className="tag">{code}</span>
                            </Link>
                            {row.asset ? <div className="break-words text-meta text-muted-foreground">{row.asset.name}</div> : null}
                            {row.parent ? <div className="break-words text-meta text-muted-foreground">{t("componentOfParent", { assetTag: row.parent.assetTag, name: row.parent.name })}</div> : null}
                          </DataTableCell>
                          <DataTableCell>
                            <FindingValueChange expectedLabel={t("systemValue")} actualLabel={t("foundValue")} expectedValue={row.expectedLabel} actualValue={row.actualLabel} />
                            {line ? <div className="mt-1 text-meta text-muted-foreground">{line}</div> : null}
                          </DataTableCell>
                          <DataTableCell className="text-muted-foreground">
                            <span className="tag">{row.auditRound.auditNo}</span>
                            <div className="break-words text-meta">{row.auditRound.name}</div>
                          </DataTableCell>
                        </ClickableTableRow>
                      )
                    })
                  )}
                </DataTableBody>
              </DataTable>
              {total > 0 ? (
                <DataTableFoot>
                  <Pagination
                    page={listPage.page}
                    totalPages={totalPages}
                    previousHref={pageHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
                    nextHref={pageHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
                    pageSize={listPage.pageSize}
                    pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: pageHref({ pageSize: value }) }))}
                    labels={{
                      navigation: tCommon("pagination"),
                      previous: tCommon("previous"),
                      next: tCommon("next"),
                      pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
                      range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                      pageSizeGroup: tCommon("pageSizeLabel"),
                      rowsPerPage: tCommon("rowsPerPage"),
                    }}
                  />
                </DataTableFoot>
              ) : null}
            </div>
          </div>

          <div data-audit-finding-pane className={cn("min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100dvh_-_var(--shell-top)_-_3rem)] xl:overflow-y-auto", !chosen && "max-xl:hidden")}>
            {chosen ? <AuditFindingPaneTop key={chosen.id} /> : null}
            {chosen ? <PageBackLink href={closeHref} label={t("backToList")} className="mb-3 xl:hidden" /> : null}
            {panel}
          </div>
        </div>
      </div>
    )
  }

  type ResolutionState = "pending_review" | "open_action" | "overdue" | "closed" | "resolved"

  type FindingResolutionSnapshot = {
    reviewStatus: string
    actionStatus: string
    actionDueDate: Date | string | null
  }

  // System value → found value as text that wraps, no box of its own (audit mobile fix D8). The labels are for screen
  // readers; the column header says it to everyone else.
  function FindingValueChange({
    expectedLabel,
    actualLabel,
    expectedValue,
    actualValue,
    className,
  }: {
    expectedLabel: string
    actualLabel: string
    expectedValue?: string | null
    actualValue?: string | null
    className?: string
  }) {
    return (
      <div className={cn("break-words text-sm text-muted-foreground", className)}>
        <span className="sr-only">{expectedLabel}: </span>
        <span>{orNil(expectedValue)}</span>
        <ArrowRight aria-hidden="true" className="mx-1 inline size-3.5 align-middle text-faint-foreground" />
        <span className="sr-only">{actualLabel}: </span>
        <span className="font-medium text-foreground">{orNil(actualValue)}</span>
      </div>
    )
  }
  ```

  Then come the rest of the file's helpers:
  - `AuditFindingEvidenceList` is master `:638-702` without the `compact` prop, its doc comment and the `if (compact) { … }` branch (`:645-671`). Its signature becomes `function AuditFindingEvidenceList({ attachments, labels }: { attachments: AuditFindingEvidenceAttachment[]; labels: { title: string; count: string; open: string } })`.
  - `resolveFindingState` (`:704-719`) and `RESOLUTION_STATE_TONES` (`:721-727`) are unchanged.
  - `type FindingStatusBadgeItem` (`:729-736`) is unchanged.
  - `FindingStatusBadges` (`:738-751`) is unchanged except its comment and the list's classes. The comment becomes "The status badges of one finding in the review panel, in a row that wraps." The `<ul className="flex w-25 flex-col items-start gap-1">` becomes `<ul className="flex flex-wrap items-start gap-2">`.
  - The master `type ResolutionMetric` (`:601-609`), `SUMMARY_STATUSES` (`:611-612`) and the local `buildAuditFindingsHref` (`:753-768`) are deleted (Task 2 already removed the last two).

  `isOpenAuditFindingActionStatus` stays imported for `resolveFindingState`, and `formatFileSize` for the evidence list. `chosen` is the panel's finding, a row plus the item's compared fields, so `findingStatusBadges(chosen, …)` and `resolveFindingState(chosen, …)` type-check with the row's type.

- **`DESIGN.md`**:
  - `:513`: after "its selects are `FilterSelect hideLabel`." add: "`MasterDataSearch leading` puts selects before the search, and `children` puts them after it: the findings page reads รอบ, เรื่อง, then the search (group 2 plan 4)."
  - `:608` (Rows): after "while a menu it opened is open." add: "`ClickableTableRow current` marks the record open beside the list (the findings review panel, group 2 plan 4): `aria-current="true"` and the `primary-soft` fill, hovered or not. Its `scroll={false}` keeps the list's scroll position when the row opens a panel on the same page, and `rowData` puts a list's `data-*` hooks on the `<tr>`."
  - `:620`: replace ", and on the findings list the pager's total equals that cell's count" with ". The findings list has no strip since group 2 plan 4: its counts are on its tabs and on the sub-chips of ต้องติดตาม, and the pager's total equals the count of the tab, sub-chip or bell filter in use".
  - `:622`: replace "the findings list takes its total from the strip count when the queue is one the strip counts" with "the findings list takes its total from the count of its tab, sub-chip or bell filter in use (group 2 plan 4)".
  - `:628`: replace the clause from "unless its owner mounts it from its own state: the findings table (audit fix, 2026-10-16) keeps only the review decision in the cell …" to "… through `returnFocusRef`." with ". The findings table has no action cell since group 2 plan 4: a row opens its finding in the review panel beside the list, which holds the decision, the plan, the close and the disposal-request link."

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/audit-findings-page-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/form-migration-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/clickable-table-row-navigation.test.ts tests/audit-item-status-labels.test.ts tests/disposal-route-structure.test.ts tests/feedback-states-ui.test.ts && npx tsc --noEmit`

Expected: the new file passes. These pins hold:
- `tests/list-filters-ui.test.ts:68-80`: the findings search form is still `role="search"` and holds only `SearchField`, `FilterSelect` and hidden inputs.
- `tests/list-frame-guards.test.ts`:
  - LB1: no new `<ArrowLeft` (`PageBackLink` owns the arrow);
  - LN1: `aria-current="true"` is not "page";
  - LT3: `TableEmptyRow` only;
  - LS1 / LK1 / LN2: no new local function name.
- `tests/ui-overlay-guards.test.ts:64`: no `fixed inset-0`.
- `tests/clickable-table-row-navigation.test.ts:12-18`: `onNavigate?: () => boolean | void` and the cancel guard are unchanged.
- `tests/audit-item-status-labels.test.ts:47-55`: `label: formatAuditItemStatus(finding.auditItem.auditStatus)` and `label: formatReconcileStatus(finding.auditItem.reconcileStatus)` are still in `findingStatusBadges`.
- `tests/disposal-route-structure.test.ts:37-45`: the disposal link line in `disposalHrefFor` and `appendOperationalReturnTo(`.
- `tests/feedback-states-ui.test.ts:205`: no `freshnessRefreshing`.
- `tests/audit-finding-resolution.test.ts:132-140`: `roundId?: string`, `findingType?: string`, and `exportParams.set("roundId", roundId)` / `("findingType", findingType)` hold.
- Task 2's pins on the page: `tests/performance-route-instrumentation.test.ts` (the label `audit-findings.page-data`), `tests/audit-finding-tabs.test.ts` (`const typeSearchLabels = await getAuditFindingTypeSearchLabels()`) and `tests/operational-return-navigation.test.ts:83-84`, `:86-87`: the page keeps Task 2's data block and `auditFindingsReturnHref` word for word.

The other pins on the page fail until Step 6.

- [ ] **Step 6: Rewrite the pins this task breaks**

Each pin below reads the page. Where Task 2 has already rewritten one (its data wiring), the text below is the final form and replaces Task 2's. Pins on the interim panel body live only in `tests/audit-findings-page-ui.test.ts` (Task 4 deletes that one test), and the pins below on the table's width and empty row read any number, so Task 5's tick column changes none of them.

- **`tests/audit-finding-resolution.test.ts`:**
  - `:6`: the import drops `auditFindingResolutionStatuses` (Task 3 deletes it).
  - `:19-28` becomes:

    ```ts
    test("audit findings page exposes the findings workflow", () => {
      const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")

      assert.match(page, /DataFreshnessBanner/)
      assert.match(page, /resolutionFilters/)
      assert.match(page, /followUpChips/)
      assert.match(page, /FindingValueChange/)
      assert.match(page, /resolveFindingState/)
      assert.doesNotMatch(page, /resolutionSummaryItems|ResolutionMetric|<StatStrip\b/, "the tab and sub-chip counts replace the strip (group 2 plan 4, P4-R1)")
    })
    ```
  - `:69-94` keeps its title and the lines for `filterActionOpen`, `filterOverdue`, `filterClosed`, `comparison` (undefined), `systemValue`, `foundValue`, `comparisonColumn`, `dueOn`, `ownerDueColumn` (undefined) and the four `resolutionState*`. `:74-79` (the six `resolutionTitle` / `resolutionHelp` / `summary*` lines) become:

    ```ts
        for (const gone of ["resolutionTitle", "resolutionHelp", "summaryPendingReview", "summaryOpenActions", "summaryOverdue", "summaryClosed"]) {
          assert.equal(messages.auditFinding[gone], undefined, `${gone}: the StatStrip went in group 2 plan 4`)
        }
    ```
  - `:163` (the eight quick filters' list) goes: the six tabs are pinned by value in Task 2's `tests/audit-finding-tabs.test.ts`. The rest of `:153-164` (the bell's two kinds) stays.
  - `:186-195` becomes:

    ```ts
    test("the findings page reads its lists through Task 2's page data, with the bell's rules for its two kinds, and a bell filter opens ต้องติดตาม with its chip (group 1 spec §6.5; group 2 spec §10, P4-R3)", () => {
      const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8").replace(/\r\n/g, "\n")
      const data = readFileSync("src/lib/audit-findings-page-data.ts", "utf8").replace(/\r\n/g, "\n")
      assert.match(page, /const waitingRules = isAuditFindingWaitingStatus\(status\) \? await getWaitingWorkRules\(\) : DEFAULT_WAITING_WORK_RULES/)
      assert.match(page, /getAuditFindingsPageData\(\{ locale, filters, user, canApprove, typeSearchLabels, rules: waitingRules, now: pageLoadedAt \}\)/)
      assert.doesNotMatch(page, /buildAuditFindingWhere|prisma\./, "the wheres and the counts live in the page data (Task 2)")
      assert.match(data, /const whereFor = \(status: AuditFindingStatus\) => buildAuditFindingWhere\(\{ \.\.\.base, status \}\)/)
      assert.match(data, /const base = \{ search: filters\.search, roundId: filters\.roundId, findingType: filters\.findingType, now, rules, typeSearchLabels \}/)
      assert.doesNotMatch(data, /now: today/)
      assert.match(page, /const tNotifications = await getTranslations\("notifications"\)/)
      assert.match(page, /action_not_due: tNotifications\("openAuditActions"\),\n\s+action_due_soon: tNotifications\("auditActionsDueSoon"\),/)
      assert.match(page, /\.\.\.\(isAuditFindingWaitingStatus\(status\) \? \[\{ key: "status", label: waitingLabels\[status\], href: filterHref\(\{ status: "follow_up" \}\) \}\] : \[\]\),/)
      assert.match(page, /const resolutionFilters = auditFindingTabs\.map\(/, "the tabs come from the six tabs only")
    })
    ```
  - `:30-38`, `:40-51`, `:53-67`, `:96-130`, `:132-148`, `:150-162`, `:164` and `:166-184` stay as Task 2 left them (Task 4 then rewrites `:22`, `:40-51` and `:53-67`).
- **`tests/list-pages-ui.test.ts`:**
  - `:292-308` becomes:

    ```ts
    test("findings: PageHeader with the way back and ส่งออก ▾, TabNav with counts, the list on DataTable, the review pane beside it, and the shared Pagination (spec 2B §5.4, I24; group 2 spec §10)", () => {
      const source = read(FINDINGS_PAGE)
      for (const part of ["<PageHeader", "<PageBackLink", "<AuditFindingsExportMenu", "<TabNav", "<FilterChipList", "<FilterSelect", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<DataTableFoot>", "<Pagination", "data-audit-finding-pane"]) {
        assert.ok(source.includes(part), `no ${part}`)
      }
      assert.match(source, /<div className="space-y-6">/)
      assert.match(source, /back=\{<PageBackLink href=\{back\.href\} label=\{backLabel\} \/>\}/, "the way back has the left arrow (spec 2B §5.10 row 2) and honours returnTo (P4-R12)")
      assert.match(source, /<TabNav aria-label=\{t\("quickFilters"\)\} items=\{resolutionFilters\} current=\{view\.tab\} scroll=\{false\} \/>/)
      assert.match(source, /<FilterChipList chips=\{filterChips\} label=\{t\("activeFilters"\)\} removeLabel=\{tAsset\("clearDrilldownFilter"\)\} \/>/)
      assert.match(source, /<AuditFindingsBatchActions key=\{selectionKey\} findings=\{batchReviewFindings\} \/>/, "another page or filter starts the batch selection empty")
      assert.match(source, /<TableEmptyRow colSpan=\{[^}]+\} emptyState=\{\{ icon: <FileText \/>, \.\.\.empty, actionVariant: "secondary" \}\} \/>/)
      // Task 2's pin, kept: the round select names a round that is not among its options (I24).
      assert.match(read("src/lib/audit-findings-page-data.ts"), /filters\.roundId \? prisma\.auditRound\.findUnique\(\{ where: \{ id: filters\.roundId \}, select: \{ id: true, auditNo: true, name: true \} \}\)/, "the round select names its round (I24)")
      assert.doesNotMatch(source, /<StatStrip\b|<MasterDataHeader\b|<ColumnHeader\b|toLocaleString\(|sticky="right"/)
    })
    ```
    Task 5 rewrites only the `AuditFindingsBatchActions` line (`:303`).
  - `:310-323` becomes:

    ```ts
    test("findings page on the server: Task 2's page data pages and counts the list, a page past the end goes to the last, and the page sizes link (spec 2B §5.9.2 row 3; group 2 plan 4)", () => {
      const source = read(FINDINGS_PAGE)
      const data = read("src/lib/audit-findings-page-data.ts")
      const rules = read("src/lib/audit-finding-filters.ts")
      assert.match(source, /const \{ rows, total, listPage, counts, back \} = data/)
      assert.match(rules, /listPage: parseListPage\(\{ page: params\.page, pageSize: params\.pageSize \}\)/)
      assert.match(data, /const \{ skip, take \} = listPageWindow\(listPage\)/)
      assert.match(data, /orderBy: auditFindingsListOrderBy, skip, take/)
      assert.match(rules, /export const auditFindingsListOrderBy: Prisma\.AuditFindingOrderByWithRelationInput\[\] = \[\{ reportedAt: "desc" \}, \{ id: "asc" \}\]/, "the old order plus id, so no finding shows on two pages")
      assert.doesNotMatch(source, /\btake: \d+/, "no fixed number of rows")
      assert.doesNotMatch(data, /\btake: \d+/)
      assert.match(data, /isAuditFindingWaitingStatus\(filters\.status\) \? prisma\.auditFinding\.count\(\{ where: listWhere \}\) : Promise\.resolve\(null\)/, "one more count only for a bell kind, which no tab counts")
      assert.match(data, /const total = isAuditFindingWaitingStatus\(filters\.status\) \? \(waitingTotal \?\? 0\) : counts\[filters\.status\]/)
      assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
      assert.match(source, /const lastPage = lastListPage\(\w+, [\w.]+\)\n\s+if \(\w+\.length === 0 && \w+ > 0 && [\w.]+ > lastPage\) \{\n\s+redirect\(/)
      assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: pageHref\(\{ pageSize: value \}\) \}\)\)\}/)
      assert.match(rules, /appendListPage\(params, \{ page: overrides\.page, pageSize: overrides\.pageSize \}\)/, "buildAuditFindingsHref writes page above 1 and pageSize other than 25 only")
      assert.match(source, /buildAuditFindingsHref\(locale, filters, \{ \.\.\.next, pageSize: listPage\.pageSize \}\)/, "a filter link goes back to page 1 and keeps the page size")
    })
    ```
    This keeps Task 2's pins on the data module and the builder; the page's lines are the final form.
  - `:510-570` (the comment and the test) become:

    ```ts
    // Group 2 plan 4 Task 3 (spec §10) replaces audit mobile fix D8's 8 columns: the decision, the plan, the badges and the
    // evidence are in the review panel beside the list, so the table has four columns (after Task 5's tick column for an
    // approver) and no pinned action column.
    test("the findings desktop table has the four columns of spec §10 and no action column; the comparison keeps the D8 look", () => {
      const source = read(`${D}audit/findings/page.tsx`)
      const table = source.slice(source.indexOf("<DataTable framed={false}"), source.indexOf("</DataTable>"))
      const heads = [...table.matchAll(/<DataTableHead\b[^>]*>(.*?)<\/DataTableHead>/g)].map((match) => match[1])
      assert.deepEqual(heads.slice(-4), [`{t("findingTopic")}`, `{t("asset")}`, `{t("comparisonColumn")}`, `{t("roundShort")}`])
      assert.ok(heads.length <= 5, "at most the tick column before them")
      assert.match(table, /scrollHint=\{tCommon\("tableScrollHint"\)\}/, "the shared hint still shows while the table overflows")
      assert.match(table, /^<DataTable framed=\{false\} layout="fixed" minWidth=\{[^}]+\} /)
      assert.doesNotMatch(table, /sticky=|<RowActions\b|<AuditFindingReviewActions\b|buttonVariants\(|<FindingComparison\b/, "no action cell, no button-styled link and no inner box in a row")
      assert.doesNotMatch(table, /<DataTableCell[^>]*\b(?:min-)?w-\d+/, "the widths live in the colgroup only")

      const change = source.slice(source.indexOf("function FindingValueChange"), source.indexOf("function AuditFindingEvidenceList"))
      assert.doesNotMatch(change, /\bborder\b|\brounded/, "the comparison has no box of its own")
      assert.match(change, /<ArrowRight aria-hidden="true"/)
      assert.match(change, /<span className="font-medium text-foreground">\{orNil\(actualValue\)\}<\/span>/, "the found value in medium weight")
      assert.doesNotMatch(source.slice(source.indexOf("function AuditFindingEvidenceList"), source.indexOf("function resolveFindingState")), /compact/, "one evidence list, the panel's")

      const badges = source.slice(source.indexOf("const findingStatusBadges"), source.indexOf("return (\n    <div className=\"space-y-6\">"))
      assert.match(badges, /resolutionState === "pending_review" \? \[\]/, "the review badge only when the state does not say it already")
      assert.match(badges, /finding\.actionStatus === "not_required" \|\| resolutionState === "closed" \? \[\]/)
      assert.match(badges, /tone: RESOLUTION_STATE_TONES\[resolutionState\]/, "the resolution badge keeps its tones")
      assert.match(badges, /status: finding\.reviewStatus/)
      assert.match(badges, /status: finding\.actionStatus/)
    })
    ```
  - `:246-255` (the batch panel) and `:261-287` (the row triggers) stay: both files are unchanged in this task.
- **`tests/audit-pages-sweep-ui.test.ts:69-81`** becomes:

  ```ts
  test("findings page: the list frame on the panel classes, the phone card one link with the resolution badge and a Chip, the evidence as text links, text-meta sub-lines (spec 2D D9, D19, M22, M29, M33; group 2 spec §10)", () => {
    const source = read(`${D}audit/findings/page.tsx`)
    assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
    assert.match(source, /<StatusBadge className="shrink-0" label=\{resolutionStateLabels\[resolutionState\]\} tone=\{RESOLUTION_STATE_TONES\[resolutionState\]\} \/>/)
    assert.equal(source.match(/className=\{cn\(linkVariants\(/g)?.length, 2, "the evidence links and the table row's open link")
    assert.match(source, /<DataTable framed=\{false\} layout="fixed" minWidth=\{[^}]+\} /)
    assert.match(source, /<Chip data-audit-finding-subject>\{topic\}<\/Chip>/, "เรื่อง names the field: a Chip, not a status (DESIGN.md Chip, P4-R2)")
    assert.doesNotMatch(source, /function (?:FindingComparison|ResolutionStateBadge|ReviewStatusBadge|ActionStatusBadge)\b|info-soft|info-border|text-info|hover:underline|hover:bg-accent|text-primary|\btext-xs\b|rounded-lg border/)
  })
  ```
  `:45-57` and `:59-65` stay (those files are unchanged).
- **`tests/e2e-fixes.test.ts`:**
  - `:69` becomes `assert.match(findings, /actions=\{canExport \? <AuditFindingsExportMenu excelHref=\{`\/api\/audit-findings\/export\?/)`. `:68` and `:70-73` stay.
  - `:252-255` become:

    ```ts
      // The panel renders AuditFindingReviewActions for canApprove alone, as the review route checks (group 2 plan 4 Task 3;
      // Task 4 replaces it with the panel's own decision under the same gate).
      const reviewActions = findings.match(/\{canApprove \? \(\n\s*<AuditFindingReviewActions\b/g) ?? []
      assert.equal(reviewActions.length, 1)
      assert.equal((findings.match(/<AuditFindingReviewActions\b/g) ?? []).length, 1)
    ```
    `:256-257` stay.
- **`tests/phase2d-final-ui.test.ts:131-134`**: the comment and the three `findings` lines become:

  ```ts
    // The other export screens (open issue CF-c, the user 2026-10-17); the findings page's two are in its "ส่งออก ▾" since group 2 plan 4.
    const findingsMenu = read(`${C}audit/audit-findings-export-menu.tsx`)
    assert.match(findingsMenu, /<a href=\{excelHref\} download>/)
    assert.match(findingsMenu, /<a href=\{pdfHref\} download>/)
  ```
- **`tests/operational-return-navigation.test.ts:80-89`** (as Task 2 left it): `:85` becomes `assert.match(source, /hiddenInputs=\{Object\.fromEntries\(auditFindingsHrefQuery\(buildAuditFindingsHref\(locale, filters, \{ search: "", roundId: null, findingType: null, pageSize: listPage\.pageSize \}\)\)\)\}/)`, since the selects now submit the round and the type. The title gains ", the open finding and the way back". `:83-84` (Task 2's) and `:86-87` (master's, through `disposalHrefFor`, which keeps `${finding.asset.id}`) hold.
- **`tests/list-primitives-ui.test.ts`:**
  - `:125` becomes `assert.match(source, /className=\{cn\(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", current && clickableTableRowCurrentClasses, className\)\}/)`. `:124`, `:126-127` stay.
  - `:313-315` become:

    ```ts
      // Two optional slots (critique 2026-10-20 E1; group 2 plan 4): leading before the field (the findings page's รอบ and
      // เรื่อง), children between the field and the button (the departments status filter).
      assert.match(search, /^export function MasterDataSearch\(\{\n  action,\n  defaultValue,\n  placeholder,\n  submitLabel,\n  hiddenInputs = \{\},\n  leading,\n  children,\n\}: \{/)
      assert.ok(search.indexOf("{leading}") > search.indexOf('type="hidden"') && search.indexOf("{leading}") < search.indexOf("<SearchField"), "leading sits before the field")
      assert.ok(search.indexOf("{children}") > search.indexOf("<SearchField") && search.indexOf("{children}") < search.indexOf("<Button"), "children sit between the field and the button")
    ```
    `:316-327` stay. The props are no longer "unchanged", so the title at `:309` becomes "MasterDataSearch is a frameless search toolbar on SearchField and Button, with two optional slots (2B §6.3.5, I8; group 2 plan 4)".
- **`tests/audit-mobile-flow-completion.test.ts:39-50`**:
  - `:45-49` hold against this page: `function AuditFindingEvidenceList`, the inline href, `target="_blank"`, `t("evidenceAttachments")` and `t("evidenceAttachmentCount"`.
  - `:42-44` (the attachment read) are Task 2's: they moved to the data module.

No `e2e/` file changes in this task. These steps break until Task 7 rewrites them:
- `e2e/audit/review-steps.ts:7-10` (`findingEntry`): the card is now `article[data-audit-finding-card="<id>"]`, not `div.grid.md\:hidden > div`. The row shows the short word "แผนก", not "แผนกไม่ตรง". Task 7 reads `tbody tr[data-audit-finding-row]` / `[data-audit-finding-card]` with `data-finding-type`.
- `e2e/audit/field-audit.spec.ts`:
  - `:631-646`: "อนุมัติ" count 5 and the row buttons; the decision is in the panel of the open finding;
  - `:723-725`: the own-finding note now shows in the panel once the finding is opened;
  - `:774-775` and `:789`: the export links are now items of "ส่งออก ▾".
- These still hold:
  - `:541` (the round page's link regex);
  - `:590-596` (the h1, and no buttons for IT staff);
  - `e2e/cross-cutting/roles.spec.ts:124-132` (M4: `canApprove` gates the panel's actions);
  - `reports.spec.ts:65`;
  - `e2e/dashboard` ("จาก N รายการ").

- [ ] **Step 7: Run everything**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. A pin that fails outside the lists above is rewritten in this commit and named in the report.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/findings/page.tsx" src/components/audit/audit-findings-export-menu.tsx src/components/audit/audit-finding-pane-top.tsx src/components/ui/clickable-table-row.tsx src/components/master-data/master-data-layout.tsx src/lib/audit-finding-filters.ts DESIGN.md messages/th.json messages/en.json tests/audit-findings-page-ui.test.ts tests/audit-finding-resolution.test.ts tests/list-pages-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/e2e-fixes.test.ts tests/phase2d-final-ui.test.ts tests/operational-return-navigation.test.ts tests/list-primitives-ui.test.ts
git commit -m "feat(audit-findings): the findings page in two panes on Task 2's data: the way back honours returnTo, one ส่งออก ▾ holds the Excel and the PDF with the locale, six tabs with counts and the sub-chips of ต้องติดตาม replace the strip, รอบ and เรื่อง come before the search, the table reads เรื่อง (a Chip in the round page's short word) / ทรัพย์สิน with ส่วนควบของ its parent / ตามระบบ → ที่พบ with the plan's line / รอบ, a row opens the finding in the panel in place and stays marked, a phone card opens the panel full screen, and rows, cards and the panel carry the hooks the E2E reads (group 2 plan 4 task 3, P4-R20, P4-R28)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The review panel and deciding (§10 panel): the comparison, the consequence sentence, the reason box, approve / reject with "k จาก N" and the next finding, the 409 second press, "อนุมัติทุกช่องของทรัพย์สินนี้", the follow-up section, and who may do what

The panel of AU-Findings is built to spec §10. Task 3 put the slot beside the table (full screen on the phone); this task fills it. What a decision does on the server does not change here: the review route (Task 1's version) stays the only judge, and the panel reads what approve will do from one pure helper that follows the route's own branches. Every fact it shows comes from Task 2's `data.panel` under Task 2's names (P4-R20), and the next finding after a decision is Task 2's, computed on the server (P4-R18).

1. **One panel, a server component** (`src/components/audit/audit-finding-review-panel.tsx`). It is a `ContentPanel divided` titled with the asset ("<code> - <name>"). Under the title it shows "ส่วนควบของ <parent code> <parent name>" for a component (decision 6, Task 3's `componentOfParent`). Its action is the outline sm link "เปิดหน้าทรัพย์สิน" (Task 3's `openAsset`), where the table row's old asset link moved (§10 Layout). The body, top to bottom:
   - **The badges row:** the type as a `Chip` with the long word (`type_*`, P4-R2), the page's state badges (`findingStatusBadges`, Appendix A §10 bullet 2), and "รอบตรวจ <auditNo> · <round name>" with the code a link to the round.
   - **The four-field comparison:** ผู้ถือครอง / แผนก / ที่ตั้ง / สภาพ as one `KeyValueList`, from the item's expected and found ids. A field that differs strikes the expected value, shows "→ found" and carries a warning `StatusBadge` "ไม่ตรง". An empty value is `Nil`, and an id the lookups do not know reads "ไม่อยู่ในรายการ", never the raw id (§5). A ไม่พบ finding has nothing to compare, so the list is absent.
   - **The photo and the remark:** the check's own photo, which is the oldest image in the finding's evidence (`finding.evidence`): Task 2 loads the list newest first, and files uploaded through "ปิดรายการไม่ตรง" are always newer than the photo saved at the scan or at ไม่พบ. Show it through `AssetPhotoFrame`, keyed by the photo (P4-R33), then "หมายเหตุจากการตรวจ".
   - **Who and where:** the line "ตรวจโดย <reporter> · <time> · ห้อง <room>" ("บันทึกว่าไม่พบโดย <reporter> · <time>" for ไม่พบ), from Task 2's `reporterLabel`.
   - **The consequence sentence** (an info `Notice`, pending findings only), from `auditFindingApprovalEffect` and its word, `auditFindingApprovalEffectKey` (P4-R24):
     - a field finding reads "ถ้าอนุมัติ ทะเบียนจะเปลี่ยน<field> จาก <from> เป็น <to>";
     - นอกขอบเขต reads "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย";
     - ไม่พบ reads "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน" alone (moving an asset nobody found reads oddly);
     - a location or condition with nothing found, or no asset, reads the ต้องตรวจสอบพิเศษ sentence (the route's `exception` branch).
   - **The decided finding:** "เหตุผลการพิจารณา" with its `reviewRemark`.
   - **The freshness banner:** `DataFreshnessBanner` moves from above Task 3's panes into the panel, right above the decision (§10 lists it in the panel). The page no longer renders it.
   - **The decision:** see 2.
   - **The follow-up section "การติดตาม":** see 5.
2. **Deciding** (`src/components/audit/audit-finding-decision.tsx`, client, formless):
   - **The reason box:** "เหตุผล (ต้องกรอกเมื่อปฏิเสธ)", a `Textarea` (id `audit-review-reason`) with `maxLength={4000}`.
   - **The buttons:** the primary "อนุมัติ" and the danger "ปฏิเสธ", then "k จาก N" (Task 2's `queue.position` / `queue.total`).
   - **A reject without a reason** shows "กรุณาระบุเหตุผลการปฏิเสธ" (`auditFinding.reviewReasonRequired`, P4-R27) under the box and moves focus there. Nothing is sent. The API refuses the same (Task 1), and a refusal that names `reviewRemark` lands under the box with the same words through `applyServer`.
   - **No confirm dialog** (P4-R25: only the bar's batch asks). A decision that went through toasts and `router.replace`s, with `scroll: false`, to Task 2's `queue.nextHref` (P4-R18): the next finding the viewer may decide after this one in the tab's order, else the first such finding before it. The link carries `finding` and no page, so the list opens at the page that holds it. `scroll: false` keeps the list's place beside the panel from `xl`; Task 3's `AuditFindingPaneTop`, mounted once per finding, then opens the next finding at its top: the page below `xl`, where the panel is the whole page (P4-R13), and the pane from `xl` (P4-R31). With none, it goes to Task 3's `closeHref`, where the empty panel says the tab is done (`data.reviewableTotal === 0` on รอพิจารณา or ทั้งหมด, `view.tab` `pending` / `all`). On อนุมัติแล้ว, ปฏิเสธแล้ว, ต้องติดตาม (the bell's links included) and ปิดแล้ว the panel with no finding open keeps Task 3's "เลือกรายการทางซ้ายเพื่อพิจารณา", because their work is to open a row for the plan or the close. ต้องติดตาม and ปิดแล้ว filter on the plan (`actionStatus`), not the review, so a finding whose plan was saved before its review can still be pending there; they keep "choose" all the same (P4-R32).
   - **A 409** (`assetChanged`) shows the warning `Notice` (`role="alert"`) with the two dates in the panel. "อนุมัติ" then reads "ยืนยันและดำเนินการต่อ", and that second press sends `confirmConflict: true`. Reject never sends it.
   - **A finding decided elsewhere** (`alreadyDecided`, Task 1's guard) refreshes and toasts the catalog's "รายการไม่ตรงนี้พิจารณาแล้ว".
   - **Busy states:** the pressed button stays busy until the next finding opens, so a double press cannot send twice. Task 1's in-transaction guard backs this up (P4-R6).
3. **"อนุมัติทุกช่องของทรัพย์สินนี้":**
   - The asset's other pending findings in the round (Task 2's `siblings`) that the viewer did not report (`!reportedByViewer`) are listed as `Chip` + their own consequence sentence.
   - The button sends one approve per finding, the current one first, in turn. It never sends `confirmConflict` and folds the answers with Task 1's classifier.
   - All through: a toast "สำเร็จ X · ไม่สำเร็จ 0" and Task 2's `queue.nextHrefAfterSiblings` (the next finding past the siblings), else `closeHref`.
   - Any failure: the panel stays, refreshes, and shows "สำเร็จ X · ไม่สำเร็จ Y" in a `role="status"` warning `Notice` in the panel, never a warning toast (P4-R23: the V-form guard allows a toast only in a catch). The Notice lists each failed finding with its reason; a 409 says to decide it in the panel. Rows stay one per finding (§15).
4. **Who sees what** (`auditFindingPanelGate`, from Task 2's `finding.reportedByViewer` and `readOnly`):
   - Without `audit:approve`: no decision, no approve-all, no plan or close (roles M4, the route checks the same).
   - A closed or cancelled round: none of them, and the sentence "รอบตรวจนับนี้ปิดหรือยกเลิกแล้ว จึงพิจารณาหรือบันทึกแผนแก้ไขไม่ได้" (P4-R10).
   - A pending finding the viewer reported: no decision, and the warning `Notice` "ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้" says why (Appendix A §10 last bullet).
   - A decided finding: no decision; the follow-up stays.
5. **The follow-up section** keeps everything the row's ⋯ held (Appendix A §10 bullets 1, 4, 5):
   - the plan, the owner by name (`finding.ownerLabel`, `nilLabel` "ยังไม่ระบุผู้รับผิดชอบ", never an id, P4-R11) and the due date;
   - "แผนแก้ไข" and "ปิดรายการไม่ตรง" (unless closed), outline md Buttons in `AuditFindingFollowUpActions` that mount today's `ActionPlanModal` and `CloseFindingModal` unchanged (AccessibleDialog gives focus back to the button), with Task 2's `data.employees` (P4-R21);
   - the page's `AuditFindingEvidenceList` (passed in as a slot, so its pins stay on the page);
   - "เปิดคำขอตัดจำหน่าย" for `disposal:create`, through Task 3's `disposalHrefFor`.
6. **`audit-finding-review-actions.tsx` keeps only the follow-up:**
   - `AuditFindingReviewActions` (the row and card triggers, the compact ⋯ branch, `stopPortalClick`) and `ReviewDecisionModal` go, with their ten message keys.
   - The two dialogs lose their unused `returnFocusRef`.
   - The UI pins on today's decision dialog move with it (P4-R22): this task rewrites them, not Task 1.

What stays (Appendix A §10, as a checklist for this task):
- [ ] the plan (owner, due date, status) and close with evidence dialogs;
- [ ] the owner and due date;
- [ ] the state badges;
- [ ] the disposal-request link;
- [ ] the evidence list;
- [ ] the freshness banner (now in the panel);
- [ ] the self-review sentence instead of the buttons;
- [ ] the 409 second press;
- [ ] the permission gate (approve for decide, plan and close).

**Files:**
- Create: `src/lib/audit-finding-review-panel-rules.ts` (pure, no imports: the approval effect and its word, the comparison rows, the gate, the approve-all siblings)
- Create: `src/components/audit/audit-finding-review-panel.tsx` (server component: `AuditFindingReviewPanel`, `AuditFindingReviewPanelEmpty`)
- Create: `src/components/audit/audit-finding-decision.tsx` (client: `AuditFindingDecision`)
- Modify: `src/components/audit/audit-finding-review-actions.tsx` (master `:1-365` rewritten: imports, the two dialogs' field tables, `validate`, `AuditFindingFollowUpActions` replaces `AuditFindingReviewActions` and `ReviewDecisionModal`, and the stale comment at `:299-300` goes with them; `:367-493` `ActionPlanModal` and `:495-613` `CloseFindingModal` lose `returnFocusRef` only)
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx` (after Task 3; blocks named by content):
  - the imports;
  - the `<DataFreshnessBanner` block above the panes goes;
  - Task 3's `const panel = …` expression (both branches) and `chosenDisposalHref`;
  - Task 3's interim `FindingStatusBadges` component goes (the panel draws the badges); `findingStatusBadges`, `FindingStatusBadgeItem`, `resolveFindingState` and `disposalHrefFor` stay.
- Modify: `DESIGN.md:628` (the findings clause of the RowActions dialog bullet) and a new bullet after `DESIGN.md:658` (Field Audit: the findings review panel)
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Test:
  - `tests/audit-finding-review-panel-rules.test.ts` (new, by value; one source cross-check against the review route)
  - `tests/audit-finding-review-panel-ui.test.ts` (new, source and messages)
  - pins rewritten:
    - `tests/audit-findings-page-ui.test.ts` (Task 3's): the "until Task 4 …" test goes;
    - `tests/list-pages-ui.test.ts:257-287`;
    - `tests/audit-pages-sweep-ui.test.ts:45-57`;
    - `tests/audit-finding-resolution.test.ts:22`, `:40-51` (the test "audit finding review uses a decision modal with conflict guard"), `:53-67` (the test "audit finding freshness and review modal copy is translated"); master lines, each one line earlier after Task 3 drops `:6`;
    - `tests/v-track2-u.test.ts:134-170` (P4-R22);
    - `tests/validation-guards.test.ts:34`, `:111` (P4-R22);
    - `tests/form-migration-guards.test.ts:94`;
    - `tests/e2e-fixes.test.ts:250-258` (master; `:250-259` in Task 3's form, through its closing `})`: the whole test "the findings page offers the review controls only to a role with audit:approve (e2e decision DX3 (ก): M4)").

**Interfaces:**
- Consumes:
  - **Task 1** (`src/lib/audit-finding-review-results.ts`, pure so a client file imports it):
    - `classifyAuditFindingReviewResponse(status: number, body: unknown): AuditFindingReviewOutcome` (`{ ok: true } | { ok: false; reason: AuditFindingReviewFailureReason }`, the reasons `"assetChanged" | "alreadyDecided" | "ownFinding" | "reasonRequired" | "roundReadOnly" | "notFound" | "failed"`);
    - `foldAuditFindingBatchResults(results): AuditFindingBatchResult` (`{ succeeded: string[]; failed: { id; reason }[] }`).
    - The review schema: reject without a reason is 400 `VALIDATION_FAILED` with `fieldErrors.reviewRemark = "required"`; approve's remark stays optional (`""` reads null, max 4000).
    - The review route keeps the lines the cross-check reads: `fieldByFindingType`, the `out_of_scope` and `not_found` branches, `canApplyNullableValue` and the `exception` condition (master `:18-23`, `:148`, `:163`, `:178-180`).
  - **Task 2** (`src/lib/audit-findings-page-data.ts`; P4-R20: these names only, no second loader): `type AuditFindingsPanel`, the page data's `panel`, or `null`:
    - `finding`: the row's fields and extras (`id`, `findingType`, `assetId`, `expectedValue`, `actualValue`, `remark`, `reportedBy`, `reportedAt`, `reviewStatus`, `reviewRemark`, `actionStatus`, `actionPlan`, `actionOwnerId`, `actionDueDate`, `auditRound { id, auditNo, name, status }`, `asset { id, assetTag, name } | null`, `parent`, `ownerLabel`, `evidence`, `reportedByViewer`, `reviewable`) plus `auditItem { auditStatus, reconcileStatus, expected*/actual* ×4, scannedAt, scannedBy, remark }`;
    - `readOnly` (the round is closed or cancelled, P4-R10), `reporterLabel` (a name, or `null`, never an id), `labels` (`ReadonlyMap<string, string>`: the rows', the finding's, its siblings' and the item's eight compared ids);
    - `siblings: { id, findingType, assetId, expectedValue, actualValue, reviewStatus, reportedBy, reportedByViewer }[]`: the asset's other pending findings in the round;
    - `queue: { position: number | null; total: number; nextHref: string | null; nextHrefAfterSiblings: string | null } | null` (`null` without `canApprove`; `nextHref` carries `finding` and no page, P4-R18).
    - Beside it: `data.employees` (the plan dialog's owners, read for `audit:approve`, P4-R21), `data.reviewableTotal` (for "the tab is done") and `data.loadedAt`.
  - **Task 3** (the page):
    - the pane `[data-audit-finding-pane]` (sticky from `xl`, scrolling on its own) with `AuditFindingPaneTop` and the phone `PageBackLink`, and one slot expression, `const panel = …`, rendered **once**: beside the table from `xl`, full screen below (P4-R13). This task replaces the expression, both branches, and keeps the two hooks: `data-audit-finding-panel` with `data-finding-id`, and `data-audit-finding-panel-empty`. The slot draws no `aside` (`landmark-complementary-is-top-level`).
    - `closeHref` (the list without `finding`, page kept), `disposalHrefFor(finding)`, `auditFindingsReturnHref`, `today`, `findingStatusBadges(finding, state)`, `resolveFindingState`, `AuditFindingEvidenceList`.
    - The words `auditFinding.componentOfParent` ("ส่วนควบของ {assetTag} {name}"), `openAsset` ("เปิดหน้าทรัพย์สิน"), `panelTitle`, `panelEmpty` and `panelNotFound`: reused here, never added twice.
    - After Task 3 the table and the cards have no review action; the panel holds the only one.
  - Shared parts, with their real props:
    - `ContentPanel({ title?: string, description?: string, actions?, children, className?, divided: true, flush? })` (`src/components/ui/content-panel.tsx:5-53`): a `section`, the title an `h2`;
    - `KeyValueList({ items: { key?, label, value, nilLabel? }[], className? })` (`key-value-list.tsx:10-21`; an empty value shows `Nil`);
    - `Notice({ tone, title?, action?, icon?, className, children, ...div props })` (`notice.tsx:7-56`; warning and danger are boxes, info and neutral inline);
    - `Chip(span props)` (`chip.tsx:9-19`);
    - `StatusBadge({ label, status?, tone?, className? })` (`status-badge.tsx:9-28`);
    - `Nil({ label?, className? })` (`nil.tsx:9-17`);
    - `EmptyNote({ tone?: "empty" | "clear", icon?, padded?, ...p props })` (`empty-note.tsx:5-35`);
    - `DataFreshnessBanner({ loadedAtIso, loadedAtLabel, staleAfterMs?, labels })` (client, `data-freshness-banner.tsx:17-30`);
    - `AssetPhotoFrame({ attachmentId, alt, label?, canUpload, uploadHref?, previewable? = true, className? })` (client, `src/components/assets/asset-photo-frame.tsx:18`; the caller sizes the box);
    - `Field({ label, id?, error?, … children })` (`field.tsx:14-70`; the error's id is `<id>-error`) with `Textarea`;
    - `Button({ variant, size, busy?, … })` (`button.tsx`; busy keeps focus and the label);
    - `useFieldErrors` returns `{ errors, setErrors, applyServer, clear, message, focusFirst }` (`use-field-errors.ts:123`);
    - `useApiError().toast(error)` (`use-api-error.ts:10-29`);
    - `required` / `maxLength` (`src/lib/validation-rules.ts:24-41`);
    - `isThumbnailable` (`src/lib/attachment-thumbnail.ts:12`);
    - `formatCount` (`src/lib/display-format.ts:15-17`);
    - `formatDateTime` (`src/lib/utils.ts:31`).
- Produces, in `src/lib/audit-finding-review-panel-rules.ts`:
  - `AUDIT_FINDING_COMPARISON_FIELDS = ["custodian", "department", "location", "condition"] as const`, `type AuditFindingComparisonField`
  - `AUDIT_FINDING_FIELD_BY_TYPE: Readonly<Record<string, AuditFindingComparisonField>>`
  - `type AuditFindingApprovalEffect = { kind: "change"; field: AuditFindingComparisonField; from: string | null; to: string | null } | { kind: "noChange"; reason: "not_found" | "out_of_scope" } | { kind: "manualReview" }`
  - `auditFindingApprovalEffect(finding: { findingType: string; assetId: string | null; expectedValue: string | null; actualValue: string | null }): AuditFindingApprovalEffect`
  - `type AuditFindingApprovalEffectKey = "effectChange" | "effectNoChangeNotFound" | "effectNoChangeOutOfScope" | "effectManualReview"`; `auditFindingApprovalEffectKey(effect): AuditFindingApprovalEffectKey` (P4-R24)
  - `type AuditFindingComparisonItem` (the item's eight expected / actual ids), `type AuditFindingComparisonRow = { field; expectedId: string | null; foundId: string | null; mismatch: boolean; thisFinding: boolean }`
  - `auditFindingComparisonRows(findingType: string, item: AuditFindingComparisonItem): AuditFindingComparisonRow[]`
  - `type AuditFindingDecideState = "open" | "ownFinding" | "decided" | "roundReadOnly" | "noPermission"`, `type AuditFindingPanelGate = { decide: AuditFindingDecideState; followUp: boolean }`
  - `auditFindingPanelGate(input: { canApprove: boolean; reviewStatus: string; reportedByViewer: boolean; readOnly: boolean }): AuditFindingPanelGate`
  - `auditFindingApproveAllSiblings<T extends { reviewStatus: string; reportedByViewer: boolean }>(siblings: readonly T[]): T[]`
  - No next-finding helper: the next finding is Task 2's `queue` (P4-R18).
- Produces, in components:
  - `AuditFindingReviewPanel({ locale, data, canApprove, employees, statusBadges, evidence, disposalHref, loadedAtIso, loadedAtLabel, closeHref })` (async server component; `data: AuditFindingsPanel`), with `type AuditFindingStatusBadge = { key: string; title: string; label: string; status?: string; tone?: StatusTone }`;
  - `AuditFindingReviewPanelEmpty({ state }: { state: "choose" | "notFound" | "done" })`;
  - `AuditFindingDecision({ findingId, typeLabel, decidable, effectKind, position, total, siblings, nextHref, nextHrefAfterSiblings, closeHref })` (client);
  - `AuditFindingFollowUpActions({ findingId, actionStatus, actionPlan?, actionOwnerId?, actionDueDate?, evidenceCount, employees })` (client, in `audit-finding-review-actions.tsx`).
- Produces, for Task 5 (one set of words for one finding and for several, so a batch says what the panel says): `auditFinding.reviewResultSummary` ("สำเร็จ {succeeded} · ไม่สำเร็จ {failed}"), `auditFinding.reviewFailureLine` ("{type} · {reason}"), `auditFinding.reviewFailure_<reason>` for all seven reasons, and `auditFinding.reviewReasonRequired` ("กรุณาระบุเหตุผลการปฏิเสธ", P4-R27). A 409 in a batch says the same "ให้พิจารณารายการนี้ในแผงพิจารณา".
- Produces (the markup Task 7's E2E stands on; th words; the same markup on every project, because the panel renders once):
  - **The panel:**
    - `[data-audit-finding-panel][data-finding-id="<finding id>"]` (equal to the URL's `finding`). It holds the `h2` "<assetTag> - <assetName>" (`getByRole("heading", { level: 2, name: … })`).
    - For a component, the panel holds the text "ส่วนควบของ <parent tag> <parent name>". On the walk data that is C2 (`assets.component2`) → "ส่วนควบของ ${assets.parent.tag} ${assets.parent.name}".
    - The link "เปิดหน้าทรัพย์สิน" goes to `/th/assets/<id>`; call `settlePageRequests` before clicking it.
  - **Badges:** `[data-audit-finding-badges]` holds the `Chip` with the long type word ("แผนกไม่ตรง", "สภาพไม่ตรง", "ไม่พบทรัพย์สิน", "ทรัพย์สินนอกขอบเขต", …) and the state badges.
  - **Comparison:**
    - `[data-audit-finding-comparison]` holds `[data-audit-finding-field="custodian" | "department" | "location" | "condition"]`. Each has `data-mismatch="true"` when it differs, and then holds the badge "ไม่ตรง".
    - The comparison is absent for ไม่พบ.
  - **Effect:** `[data-audit-finding-effect]` (pending only) reads exactly, for example, "ถ้าอนุมัติ ทะเบียนจะเปลี่ยนแผนก จาก <expected dept> เป็น <found dept>"; "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย" for นอกขอบเขต; "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน" for ไม่พบ (P4-R24).
  - **Who and where:** `[data-audit-finding-inspected]` "ตรวจโดย … · <time> · ห้อง <code - name>".
  - **Deciding** (`[data-audit-finding-decision]`, approvers only):
    - **The reason box:** `getByLabel("เหตุผล (ต้องกรอกเมื่อปฏิเสธ)")`, a textarea with id `audit-review-reason`.
    - **The buttons:** `getByRole("button", { name: "อนุมัติ", exact: true })` and `{ name: "ปฏิเสธ", exact: true }`. Use `exact: true`, because "อนุมัติทุกช่องของทรัพย์สินนี้" contains "อนุมัติ".
    - **The position:** `[data-audit-finding-position]` reads "<k> จาก <N>", k among the findings the viewer may decide in the tab's order (Task 2's queue).
    - **Reject with an empty box:** no request is sent. `#audit-review-reason-error` (`[data-slot="field-error"]`) reads "กรุณาระบุเหตุผลการปฏิเสธ", and `#audit-review-reason` is focused with `aria-invalid="true"`.
    - **A decision that went through:** the toast reads "อนุมัติรายการไม่ตรงและปรับข้อมูลทรัพย์สินสำเร็จ" (a field change), "อนุมัติรายการไม่ตรงสำเร็จ ทะเบียนไม่เปลี่ยน" (ไม่พบ, นอกขอบเขต, ต้องตรวจสอบพิเศษ) or "ปฏิเสธรายการไม่ตรงสำเร็จ". The URL's `finding` then changes to the next finding to decide (P4-R18), or `finding` leaves the URL and, from `xl` on รอพิจารณา (or ทั้งหมด), `[data-audit-finding-panel-empty]` reads "ไม่มีรายการรอพิจารณาในตัวกรองนี้แล้ว". On อนุมัติแล้ว, ปฏิเสธแล้ว, ต้องติดตาม and ปิดแล้ว, an approver with no finding open reads "เลือกรายการทางซ้ายเพื่อพิจารณา" (P4-R32).
    - **A 409:** `getByRole("alert")` titled "ข้อมูลทรัพย์สินเปลี่ยนไปหลังรายงานรายการไม่ตรงนี้", and the approve button is named "ยืนยันและดำเนินการต่อ" (no E2E for it, P4-R17).
    - **Approve-all:** `[data-audit-finding-siblings]` lists the other pending fields (Chip + sentence) with the button "อนุมัติทุกช่องของทรัพย์สินนี้". A failure leaves `getByRole("status")` titled "สำเร็จ X · ไม่สำเร็จ Y" in the panel.
  - **Own finding:** the panel shows "ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้" and has no "อนุมัติ" (exact) button and no `#audit-review-reason`. Block 7's `findingEntry(…).getByText(segregation)` moves to the panel, and the row's note is gone (Task 3 / Task 5 own the row).
  - **Follow-up:**
    - `[data-audit-finding-follow-up]` holds the buttons "แผนแก้ไข" and "ปิดรายการไม่ตรง". They open `dialog "บันทึกแผนแก้ไขรายการไม่ตรง"` and `dialog "ปิดแผนแก้ไขรายการไม่ตรง"`, unchanged.
    - It also holds the evidence list and, with `disposal:create`, the link "เปิดคำขอตัดจำหน่าย".
  - **Roles:** IT staff and the viewer see none of "อนุมัติ", "ปฏิเสธ", "แผนแก้ไข" or "ปิดรายการไม่ตรง" anywhere in main, and no reason box (roles M4, M5 hold). The panel's freshness banner shows for every role. When fresh, it reads "โหลดเมื่อ <time>" with a small button "รีเฟรชข้อมูล". After 5 minutes (`staleAfterMs`) it becomes the warning Notice titled "หน้านี้เปิดค้างไว้นานแล้ว", with the same button (`data-freshness-banner.tsx:59-90`, unchanged). "รีเฟรชข้อมูล" is not a review control: it is not in `REVIEW_BUTTON_NAMES` (`e2e/cross-cutting/support/refusals.ts:107`), and roles M4/M5 do not count it. Task 7 asserts nothing about it.
  - **For Task 7, the steps this breaks:**
    - The dialog loop `e2e/audit/field-audit.spec.ts:631-646` (the dialogs "ยืนยันการอนุมัติรายการไม่ตรง" / "ยืนยันการปฏิเสธรายการไม่ตรง", the fields "หมายเหตุการอนุมัติ" / "หมายเหตุการปฏิเสธ", the submits "อนุมัติรายการไม่ตรง" / "ปฏิเสธรายการไม่ตรง") becomes the panel's flow: open the row, fill the reason (required on the reject), press, and wait for the URL to move.
    - The row-scoped checks at `:595-596`, `:723-725`.
    - The literal toast at `:646`.
  - E2E is not run in this task. Block 6 breaks at the dialogs until Task 7.

- [ ] **Step 1: Write the failing tests**

`tests/audit-finding-review-panel-rules.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_FINDING_COMPARISON_FIELDS,
  auditFindingApprovalEffect,
  auditFindingApprovalEffectKey,
  auditFindingApproveAllSiblings,
  auditFindingComparisonRows,
  auditFindingPanelGate,
} from "../src/lib/audit-finding-review-panel-rules.ts"

// The review panel's rules (group 2 spec §10, plan 4 Task 4), by value. Sources are read with LF.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const finding = (findingType: string, expectedValue: string | null, actualValue: string | null, assetId: string | null = "A1") => ({ findingType, assetId, expectedValue, actualValue })

test("approving a field finding changes that register field from the expected value to the found one; a custodian or a department may be cleared (group 2 spec §10; the review route)", () => {
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_location", "L1", "L2")), { kind: "change", field: "location", from: "L1", to: "L2" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_custodian", "E1", "E2")), { kind: "change", field: "custodian", from: "E1", to: "E2" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_department", "D1", null)), { kind: "change", field: "department", from: "D1", to: null })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_custodian", null, null)), { kind: "change", field: "custodian", from: null, to: null })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_condition", "C1", "C2")), { kind: "change", field: "condition", from: "C1", to: "C2" })
})

test("ไม่พบ and นอกขอบเขต never change the register; a location or condition with nothing found, no asset or an unknown type goes to ต้องตรวจสอบพิเศษ", () => {
  assert.deepEqual(auditFindingApprovalEffect(finding("not_found", "{\"assetTag\":\"A\"}", null)), { kind: "noChange", reason: "not_found" })
  assert.deepEqual(auditFindingApprovalEffect(finding("out_of_scope", null, "{}")), { kind: "noChange", reason: "out_of_scope" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_location", "L1", null)), { kind: "manualReview" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_condition", "C1", null)), { kind: "manualReview" })
  assert.deepEqual(auditFindingApprovalEffect(finding("wrong_location", "L1", "L2", null)), { kind: "manualReview" })
  assert.deepEqual(auditFindingApprovalEffect(finding("need_review", "x", "y")), { kind: "manualReview" })
})

test("the consequence sentence's word: a field change, ไม่พบ alone, นอกขอบเขต with the transfer, or ต้องตรวจสอบพิเศษ (P4-R24)", () => {
  const key = (findingType: string, expectedValue: string | null, actualValue: string | null) => auditFindingApprovalEffectKey(auditFindingApprovalEffect(finding(findingType, expectedValue, actualValue)))
  assert.equal(key("wrong_location", "L1", "L2"), "effectChange")
  assert.equal(key("not_found", "{}", null), "effectNoChangeNotFound")
  assert.equal(key("out_of_scope", null, "{}"), "effectNoChangeOutOfScope")
  assert.equal(key("wrong_condition", "C1", null), "effectManualReview")
  const th = JSON.parse(read("messages/th.json")).auditFinding as Record<string, string>
  assert.equal(th.effectNoChangeNotFound, "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน", "moving an asset nobody found reads oddly")
  assert.equal(th.effectNoChangeOutOfScope, "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย")
})

test("the effect follows the review route's own branches, so the sentence cannot drift from what approve does", () => {
  const route = read("src/app/api/audit-findings/[id]/review/route.ts")
  assert.match(route, /wrong_location: "currentLocationId",\n  wrong_custodian: "custodianId",\n  wrong_department: "departmentId",\n  wrong_condition: "conditionId",/)
  assert.match(route, /if \(finding\.findingType === "out_of_scope"\) \{/)
  assert.match(route, /if \(finding\.findingType === "not_found"\) \{/)
  assert.match(route, /const canApplyNullableValue = fieldName === "custodianId" \|\| fieldName === "departmentId"/)
  assert.match(route, /if \(!fieldName \|\| !finding\.assetId \|\| \(finding\.actualValue === null && !canApplyNullableValue\)\) \{/)
})

const item = {
  expectedLocationId: "L1",
  expectedCustodianId: "E1",
  expectedDepartmentId: "D1",
  expectedConditionId: null,
  actualLocationId: "L2",
  actualCustodianId: "E1",
  actualDepartmentId: "D1",
  actualConditionId: "",
}

test("the four-field comparison: ผู้ถือครอง / แผนก / ที่ตั้ง / สภาพ, expected beside found, the different ones marked and the finding's own field named; ไม่พบ has nothing to compare (group 2 spec §10)", () => {
  assert.deepEqual(AUDIT_FINDING_COMPARISON_FIELDS, ["custodian", "department", "location", "condition"])
  assert.deepEqual(auditFindingComparisonRows("wrong_location", item), [
    { field: "custodian", expectedId: "E1", foundId: "E1", mismatch: false, thisFinding: false },
    { field: "department", expectedId: "D1", foundId: "D1", mismatch: false, thisFinding: false },
    { field: "location", expectedId: "L1", foundId: "L2", mismatch: true, thisFinding: true },
    // A blank id is no value, as the conflict check reads it (audit-finding-conflict.ts:38-41).
    { field: "condition", expectedId: null, foundId: null, mismatch: false, thisFinding: false },
  ])
  assert.deepEqual(auditFindingComparisonRows("out_of_scope", item).map((row) => row.thisFinding), [false, false, false, false])
  assert.deepEqual(auditFindingComparisonRows("not_found", item), [])
})

test("the panel's controls: none without audit:approve, none on a closed or cancelled round, no decision on a decided or own finding (roles M4, P4-R10, Appendix A §10)", () => {
  // Task 2's panel data: reportedByViewer and readOnly (the round is closed or cancelled; an old draft is open, spec §14).
  const base = { canApprove: true, reviewStatus: "pending", reportedByViewer: false, readOnly: false }
  assert.deepEqual(auditFindingPanelGate(base), { decide: "open", followUp: true })
  assert.deepEqual(auditFindingPanelGate({ ...base, reportedByViewer: true }), { decide: "ownFinding", followUp: true })
  assert.deepEqual(auditFindingPanelGate({ ...base, reviewStatus: "approved" }), { decide: "decided", followUp: true })
  assert.deepEqual(auditFindingPanelGate({ ...base, reviewStatus: "exception", reportedByViewer: true }), { decide: "decided", followUp: true })
  assert.deepEqual(auditFindingPanelGate({ ...base, readOnly: true }), { decide: "roundReadOnly", followUp: false })
  assert.deepEqual(auditFindingPanelGate({ ...base, readOnly: true, reviewStatus: "approved" }), { decide: "roundReadOnly", followUp: false })
  assert.deepEqual(auditFindingPanelGate({ ...base, canApprove: false }), { decide: "noPermission", followUp: false })
  assert.deepEqual(auditFindingPanelGate({ ...base, canApprove: false, readOnly: true }), { decide: "noPermission", followUp: false })
})

test("อนุมัติทุกช่องของทรัพย์สินนี้ takes the asset's other pending findings that the viewer did not report (group 2 spec §10, §15; Task 2's siblings)", () => {
  const siblings = [
    { id: "F2", reviewStatus: "pending", reportedByViewer: false },
    { id: "F3", reviewStatus: "pending", reportedByViewer: true },
    { id: "F4", reviewStatus: "approved", reportedByViewer: false },
  ]
  assert.deepEqual(auditFindingApproveAllSiblings(siblings).map((sibling) => sibling.id), ["F2"])
  assert.deepEqual(auditFindingApproveAllSiblings([]), [])
})
```

The next finding after a decision is Task 2's (`pickAuditFindingNextReviewId` and the queue's `nextHref`, tested by value in `tests/audit-finding-tabs.test.ts` and `tests/audit-findings-page-data.test.ts`, P4-R18): this task adds no second rule for it.

`tests/audit-finding-review-panel-ui.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The findings review panel (group 2 spec §10, plan 4 Task 4): the server panel, the client decision, the page's slot
// and the words. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PANEL = "src/components/audit/audit-finding-review-panel.tsx"
const DECISION = "src/components/audit/audit-finding-decision.tsx"
const PAGE = "src/app/[locale]/(dashboard)/audit/findings/page.tsx"

test("the panel: a divided ContentPanel titled with the asset, ส่วนควบของ under it, เปิดหน้าทรัพย์สิน, the type Chip, the state badges and the round, under Task 3's two hooks (group 2 spec §10, decision 6, P4-R2)", () => {
  const source = read(PANEL)
  assert.doesNotMatch(source, /^"use client"/m, "a server component: the page hands it the finding")
  assert.match(source, /data: AuditFindingsPanel\n/)
  assert.match(source, /<div data-audit-finding-panel data-finding-id=\{finding\.id\} className="min-w-0">\n\s+<ContentPanel\n\s+divided\n\s+title=\{assetLabel\}\n\s+description=\{finding\.parent \? t\("componentOfParent", \{ assetTag: finding\.parent\.assetTag, name: finding\.parent\.name \}\) : undefined\}/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/assets\/\$\{finding\.asset\.id\}`\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}>\n\s+\{t\("openAsset"\)\}/)
  assert.match(source, /<li>\n\s+<Chip>\{t\(`type_\$\{finding\.findingType\}`\)\}<\/Chip>\n\s+<\/li>/)
  assert.match(source, /<StatusBadge label=\{badge\.label\} status=\{badge\.status\} tone=\{badge\.tone\} \/>/)
  assert.match(source, /<span className="tag">\{finding\.auditRound\.auditNo\}<\/span>/)
})

test("the four-field comparison: one KeyValueList; a different field strikes the expected value and carries ไม่ตรง; an empty value is Nil and an unknown id reads ไม่อยู่ในรายการ (group 2 spec §5, §10)", () => {
  const source = read(PANEL)
  assert.match(source, /const comparison = auditFindingComparisonRows\(finding\.findingType, finding\.auditItem\)\.map\(\(row\) => \(\{/)
  assert.match(source, /<span data-audit-finding-field=\{row\.field\} data-mismatch=\{row\.mismatch \? "true" : undefined\} className="inline-flex flex-wrap items-center gap-x-1\.5 gap-y-1">/)
  assert.match(source, /<span className="text-muted-foreground line-through">\{valueText\(row\.expectedId\) \?\? <Nil \/>\}<\/span>/)
  assert.match(source, /<StatusBadge label=\{tScan\("fieldMismatch"\)\} tone="warning" \/>/)
  assert.match(source, /const valueText = \(id: string \| null\) => \(id \? \(labels\.get\(id\) \?\? tScan\("valueNotInList"\)\) : null\)/)
  assert.match(source, /\{comparison\.length > 0 \? \(\n\s+<div data-audit-finding-comparison>\n\s+<KeyValueList items=\{comparison\} \/>/)
  assert.doesNotMatch(source, /function (?:Info|InfoRow|DetailItem|FindingComparison|ReviewItem|ReviewValue|ReviewPreviewField)\b|"-"|\btext-xs\b|\bdark:/)
})

test("the photo, the remark, ตรวจโดย … · time · ห้อง, and for a pending finding the consequence sentence from the approval effect and its word (group 2 spec §10, P4-R24)", () => {
  const source = read(PANEL)
  assert.match(source, /const photo = finding\.evidence\.filter\(\(attachment\) => isThumbnailable\(attachment\.fileType\)\)\.at\(-1\) \?\? null/, "the check's own photo: the oldest image, since closure files come later (P4-R33)")
  assert.match(source, /<AssetPhotoFrame key=\{photo\.id\} attachmentId=\{photo\.id\} alt=\{photo\.originalName\} canUpload=\{false\} className="h-56" \/>/, "a new photo never inherits the last one's failed load (P4-R33)")
  assert.match(source, /\{ key: "scanRemark", label: t\("scanRemark"\), value: finding\.remark \}/)
  assert.match(source, /const reporter = data\.reporterLabel \?\? tCommon\("noValue"\)/)
  assert.match(source, /finding\.findingType === "not_found" \? t\("reportedNotFoundBy", \{ name: reporter \}\) : t\("inspectedBy", \{ name: reporter \}\)/)
  assert.match(source, /<p data-audit-finding-inspected className="text-meta text-muted-foreground">\{inspected\}<\/p>/)
  assert.match(source, /\{finding\.reviewStatus === "pending" \? \(\n\s+<Notice tone="info" data-audit-finding-effect>\n\s+\{effectText\(effect\)\}\n\s+<\/Notice>\n\s+\) : \(\n\s+<KeyValueList items=\{\[\{ key: "decisionRemark", label: t\("decisionRemark"\), value: finding\.reviewRemark \}\]\} \/>/)
  assert.match(source, /\? t\("effectChange", \{ field: fieldLabel\(effect\.field\), from: valueText\(effect\.from\) \?\? t\("effectNoValue"\), to: valueText\(effect\.to\) \?\? t\("effectNoValue"\) \}\)\n\s+: t\(auditFindingApprovalEffectKey\(effect\)\)/)
})

test("the gate: the decision for an approver (kept mounted for the approve-all result), the own-finding and closed-round sentences, the follow-up only where it can be saved, the freshness banner above the decision (roles M4, P4-R10, Appendix A §10)", () => {
  const source = read(PANEL)
  assert.match(source, /const gate = auditFindingPanelGate\(\{ canApprove, reviewStatus: finding\.reviewStatus, reportedByViewer: finding\.reportedByViewer, readOnly: data\.readOnly \}\)/)
  assert.match(source, /\{gate\.decide === "ownFinding" \? <Notice tone="warning">\{t\("segregationReviewBlocked"\)\}<\/Notice> : null\}/)
  assert.match(source, /\{gate\.decide === "roundReadOnly" \? <Notice tone="neutral">\{t\("roundReadOnlyReview"\)\}<\/Notice> : null\}/)
  assert.match(source, /<AuditFindingDecision\n\s+key=\{finding\.id\}\n\s+findingId=\{finding\.id\}\n\s+typeLabel=\{t\(`type_\$\{finding\.findingType\}`\)\}\n\s+decidable=\{gate\.decide === "open"\}\n\s+effectKind=\{effect\.kind\}\n\s+position=\{data\.queue\?\.position \?\? null\}\n\s+total=\{data\.queue\?\.total \?\? 0\}/)
  assert.match(source, /nextHref=\{data\.queue\?\.nextHref \?\? null\}\n\s+nextHrefAfterSiblings=\{data\.queue\?\.nextHrefAfterSiblings \?\? null\}\n\s+closeHref=\{closeHref\}/)
  assert.match(source, /<DataFreshnessBanner\n\s+loadedAtIso=\{loadedAtIso\}\n\s+loadedAtLabel=\{loadedAtLabel\}/)
  assert.match(source, /const siblings = auditFindingApproveAllSiblings\(data\.siblings\)\.map\(\(sibling\) => \(\{/)
  assert.doesNotMatch(source, /isSameAuditActor|viewerId/, "who reported it is Task 2's reportedByViewer (P4-R20)")
})

test("the follow-up section: plan, owner by name and due date, แผนแก้ไข / ปิดรายการไม่ตรง, the evidence list and the disposal request (Appendix A §10, P4-R11)", () => {
  const source = read(PANEL)
  assert.match(source, /<section aria-labelledby=\{`audit-finding-follow-up-\$\{finding\.id\}`\} data-audit-finding-follow-up className="grid gap-3 border-t border-border-soft pt-5">/)
  assert.match(source, /\{ key: "actionOwner", label: t\("actionOwner"\), value: finding\.ownerLabel, nilLabel: t\("noActionOwner"\) \}/)
  assert.match(source, /\{gate\.followUp \? \(\n\s+<AuditFindingFollowUpActions\n\s+findingId=\{finding\.id\}\n\s+actionStatus=\{finding\.actionStatus\}/)
  assert.match(source, /evidenceCount=\{finding\.evidence\.length\}/)
  assert.match(source, /\n\s+\{evidence\}\n/)
  assert.match(source, /\{disposalHref \? \(\n\s+<Link href=\{disposalHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /actionOwnerId \?\?|employeeLabelById/, "the owner is a name or Nil, never an id (P4-R11)")
})

test("no finding open: the empty panel says to choose one, that the chosen one was not found, or that nothing is left to decide (P4-R18)", () => {
  const source = read(PANEL)
  assert.match(source, /export async function AuditFindingReviewPanelEmpty\(\{ state \}: \{ state: "choose" \| "notFound" \| "done" \}\)/)
  assert.match(source, /<div data-audit-finding-panel-empty className="min-w-0">\n\s+<ContentPanel title=\{t\("panelTitle"\)\}>/)
  assert.match(source, /<EmptyNote tone=\{state === "done" \? "clear" : "empty"\} role="status">\n\s+\{state === "done" \? t\("panelEmptyDone"\) : state === "notFound" \? t\("panelNotFound"\) : t\("panelEmpty"\)\}/)
})

test("deciding: the reason box, approve primary and reject danger with k จาก N, no confirm dialog, then Task 2's next finding (group 2 spec §10, decision 5, P4-R18, P4-R25, P4-R27)", () => {
  const source = read(DECISION)
  assert.match(source, /^"use client"/)
  assert.match(source, /<Field label=\{t\("reviewReasonLabel"\)\} id=\{FIELD_IDS\.reviewRemark\} error=\{fieldErrors\.errors\.reviewRemark === "required" \? t\("reviewReasonRequired"\) : fieldErrors\.message\("reviewRemark"\)\}>/)
  assert.match(source, /<Button onClick=\{\(\) => decide\("approve"\)\} busy=\{phase === "approve"\} disabled=\{phase !== null && phase !== "approve"\}>\n\s+<Check aria-hidden="true" \/>\n\s+\{conflict \? t\("reviewConfirmConflict"\) : t\("approve"\)\}/)
  assert.match(source, /<Button variant="danger" onClick=\{\(\) => decide\("reject"\)\} busy=\{phase === "reject"\} disabled=\{phase !== null && phase !== "reject"\}>\n\s+<X aria-hidden="true" \/>\n\s+\{t\("reject"\)\}/)
  assert.match(source, /\{position !== null \? \(\n\s+<span data-audit-finding-position className="num text-meta text-muted-foreground">\n\s+\{t\("positionOf", \{ index: formatCount\(position\), total: formatCount\(total\) \}\)\}/)
  assert.match(source, /body: JSON\.stringify\(\{ action, reviewRemark: reviewRemark\.trim\(\), confirmConflict \}\)/)
  assert.match(source, /const \{ payload, outcome \} = await send\(findingId, action, action === "approve" && conflict !== null\)/)
  assert.match(source, /function moveOn\(href: string \| null\) \{\n\s+router\.replace\(href \?\? closeHref, \{ scroll: false \}\)\n\s+\}/)
  assert.match(source, /toast\.success\(action === "reject" \? t\("rejectedSuccess"\) : effectKind === "change" \? t\("approvedSuccess"\) : t\("approvedSuccessNoRegisterChange"\)\)\n\s+moveOn\(nextHref\)/)
  assert.doesNotMatch(source, /AccessibleDialog|ConfirmTextDialog|window\.(?:confirm|prompt)|<form\b|<button\b|toast\.(?:error|warning)\(|nextAuditFindingHref|nextPageHref/)
})

test("a refusal: a 409 warns in the panel and the next approve confirms it, a reason the server refuses lands under the box, a finding decided elsewhere refreshes (group 2 spec §10, P4-R6)", () => {
  const source = read(DECISION)
  assert.match(source, /if \(outcome\.reason === "assetChanged"\) \{\n\s+setConflict\(payload as ReviewConflictPayload\)\n\s+return\n\s+\}/)
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/)
  assert.match(source, /if \(outcome\.reason === "alreadyDecided"\) router\.refresh\(\)/)
  assert.match(source, /<Notice tone="warning" role="alert" title=\{t\("reviewConflictTitle"\)\}>\{t\("reviewConflictHelp"\)\}<\/Notice>/)
})

test("อนุมัติทุกช่องของทรัพย์สินนี้: one review per finding in turn, never confirming a conflict, folded by the shared classifier; a failure stays on the panel as สำเร็จ X · ไม่สำเร็จ Y in a Notice, never a warning toast (group 2 spec §10, §15, P4-R23)", () => {
  const source = read(DECISION)
  assert.match(source, /for \(const id of \[findingId, \.\.\.siblings\.map\(\(sibling\) => sibling\.id\)\]\) \{/)
  assert.match(source, /results\.push\(\{ id, outcome: \(await send\(id, "approve", false\)\)\.outcome \}\)/)
  assert.match(source, /results\.push\(\{ id, outcome: \{ ok: false, reason: "failed" \} \}\)/)
  assert.match(source, /const \{ succeeded, failed \} = foldAuditFindingBatchResults\(results\)/)
  assert.match(source, /moveOn\(nextHrefAfterSiblings\)/)
  assert.match(source, /<Notice tone="warning" role="status" title=\{t\("reviewResultSummary", \{ succeeded: formatCount\(result\.succeeded\), failed: formatCount\(result\.failed\.length\) \}\)\}>/)
  assert.match(source, /reason: t\(`reviewFailure_\$\{failure\.reason\}`\)/)
  assert.match(source, /failed: failed\.map\(\(failure\) => \(\{ \.\.\.failure, label: labelById\.get\(failure\.id\) \?\? typeLabel \}\)\)/, "each failure keeps its label: the refresh drops a sibling decided elsewhere")
  assert.match(source, /type: failure\.label,/)
  assert.match(source, /if \(!decidable && !result\) return null/)
})

test("the page fills Task 3's slot with the panel or the empty panel, passes Task 2's data and the freshness to it, and keeps no review trigger, badge list or banner of its own (group 2 spec §10, P4-R18, P4-R20)", () => {
  const page = read(PAGE)
  assert.match(page, /const panel = data\.panel \? \(\n\s+<AuditFindingReviewPanel\n\s+locale=\{locale\}\n\s+data=\{data\.panel\}\n\s+canApprove=\{canApprove\}\n\s+employees=\{data\.employees\}\n/)
  assert.match(page, /evidence=\{\n\s+<AuditFindingEvidenceList\n\s+attachments=\{data\.panel\.finding\.evidence\}/)
  assert.match(page, /disposalHref=\{disposalHrefFor\(data\.panel\.finding\)\}/)
  assert.match(page, /loadedAtIso=\{data\.loadedAt\.toISOString\(\)\}/)
  assert.match(page, /closeHref=\{closeHref\}/)
  assert.match(page, /<AuditFindingReviewPanelEmpty state=\{findingId \? "notFound" : data\.reviewableTotal === 0 && \(view\.tab === "pending" \|\| view\.tab === "all"\) \? "done" : "choose"\} \/>/, "done only on รอพิจารณา and ทั้งหมด, the tabs whose work is deciding (P4-R32)")
  assert.match(page, /\{chosen \? <AuditFindingPaneTop key=\{chosen\.id\} \/> : null\}\n\s+\{chosen \? <PageBackLink href=\{closeHref\} label=\{t\("backToList"\)\} className="mb-3 xl:hidden" \/> : null\}\n\s+\{panel\}/, "the next finding opens at its top (P4-R13, P4-R31)")
  assert.doesNotMatch(page, /<DataFreshnessBanner\b|<AuditFindingReviewActions\b|import \{ DataFreshnessBanner \}|function FindingStatusBadges|data-audit-finding-panel-body|chosenDisposalHref/)
})

test("the panel's words in th and en (glossary: รายการไม่ตรง, พิจารณา, ผู้ถือครอง, ที่ตั้ง); Task 3's words are reused; the decision dialog's words are gone", () => {
  const th = JSON.parse(read("messages/th.json")).auditFinding as Record<string, string | undefined>
  const en = JSON.parse(read("messages/en.json")).auditFinding as Record<string, string | undefined>
  const words: Record<string, [string, string]> = {
    effectChange: ["ถ้าอนุมัติ ทะเบียนจะเปลี่ยน{field} จาก {from} เป็น {to}", "If approved, the register's {field} changes from {from} to {to}"],
    effectNoChangeOutOfScope: ["อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย", "Approving leaves the register as it is. To move the asset, make a transfer."],
    effectNoChangeNotFound: ["อนุมัติแล้วทะเบียนจะไม่เปลี่ยน", "Approving leaves the register as it is."],
    reviewReasonLabel: ["เหตุผล (ต้องกรอกเมื่อปฏิเสธ)", "Reason (required to reject)"],
    reviewReasonRequired: ["กรุณาระบุเหตุผลการปฏิเสธ", "Enter a reason to reject."],
    positionOf: ["{index} จาก {total}", "{index} of {total}"],
    approveAllFields: ["อนุมัติทุกช่องของทรัพย์สินนี้", "Approve every field of this asset"],
    reviewResultSummary: ["สำเร็จ {succeeded} · ไม่สำเร็จ {failed}", "{succeeded} done · {failed} not done"],
    reviewFailure_assetChanged: ["ข้อมูลทรัพย์สินเปลี่ยนหลังรายงาน ให้พิจารณารายการนี้ในแผงพิจารณา", "The asset changed after the report; decide this one in the review panel"],
    reviewFailure_alreadyDecided: ["มีการพิจารณารายการนี้แล้ว", "Already decided"],
    roundReadOnlyReview: ["รอบตรวจนับนี้ปิดหรือยกเลิกแล้ว จึงพิจารณาหรือบันทึกแผนแก้ไขไม่ได้", "This audit round is closed or cancelled, so its discrepancies cannot be decided or planned."],
    panelEmptyDone: ["ไม่มีรายการรอพิจารณาในตัวกรองนี้แล้ว", "Nothing is left to decide in these filters"],
    // Task 3's, reused.
    componentOfParent: ["ส่วนควบของ {assetTag} {name}", "Component of {assetTag} {name}"],
    openAsset: ["เปิดหน้าทรัพย์สิน", "Open the asset"],
  }
  for (const [key, [thText, enText]] of Object.entries(words)) {
    assert.equal(th[key], thText, key)
    assert.equal(en[key], enText, key)
  }
  for (const reason of ["assetChanged", "alreadyDecided", "ownFinding", "reasonRequired", "roundReadOnly", "notFound", "failed"]) {
    assert.equal(typeof th[`reviewFailure_${reason}`], "string", reason)
    assert.equal(typeof en[`reviewFailure_${reason}`], "string", reason)
  }
  for (const gone of ["reviewDecisionTitle_approve", "reviewDecisionTitle_reject", "reviewDecisionImpactTitle_approve", "reviewDecisionImpactTitle_reject", "reviewDecisionHelp_approve", "reviewDecisionHelp_reject", "reviewRemarkLabel_approve", "reviewRemarkLabel_reject", "reviewSubmit_approve", "reviewSubmit_reject", "effectNoChange", "openAssetPage", "panelEmptyChoose"]) {
    assert.equal(th[gone], undefined, gone)
    assert.equal(en[gone], undefined, gone)
  }
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/audit-finding-review-panel-rules.test.ts tests/audit-finding-review-panel-ui.test.ts`
Expected: FAIL.
- `audit-finding-review-panel-rules.test.ts`: `src/lib/audit-finding-review-panel-rules.ts` does not exist (import error).
- `audit-finding-review-panel-ui.test.ts`:
  - the panel and decision files do not exist (ENOENT on the first read of each test);
  - the page still holds Task 3's interim panel body and `<DataFreshnessBanner`;
  - `auditFinding.reviewReasonRequired` and `effectNoChangeNotFound` are undefined and `reviewDecisionTitle_approve` is still there.

- [ ] **Step 3: Implement**

Line numbers are master `704f2b26`. Task 1 edits the review route (the pending guard in its transaction) and adds `src/lib/audit-finding-review-results.ts`. Task 2 adds `src/lib/audit-findings-page-data.ts` (the panel's data and the next finding) and wires the page to it. Task 3 rewrites the page's frame, table, cards and the `panel` slot. So the page's blocks are named here by content. `audit-finding-review-actions.tsx` is untouched before this task.

- **`src/lib/audit-finding-review-panel-rules.ts`** (new):

  ```ts
  // The findings review panel's rules (group 2 spec §10, plan 4 Task 4): what approve does to the register and the word of
  // its sentence, the four-field comparison, who may decide, plan and close, and which findings "อนุมัติทุกช่องของทรัพย์สินนี้"
  // sends. The next finding after a decision is Task 2's (P4-R18). Pure, no imports: node --test and client code import it.

  export const AUDIT_FINDING_COMPARISON_FIELDS = ["custodian", "department", "location", "condition"] as const
  export type AuditFindingComparisonField = (typeof AUDIT_FINDING_COMPARISON_FIELDS)[number]

  // The finding types the review route applies to the register, by the field each changes (its fieldByFindingType).
  export const AUDIT_FINDING_FIELD_BY_TYPE: Readonly<Record<string, AuditFindingComparisonField>> = {
    wrong_location: "location",
    wrong_custodian: "custodian",
    wrong_department: "department",
    wrong_condition: "condition",
  }

  export type AuditFindingApprovalEffect =
    | { kind: "change"; field: AuditFindingComparisonField; from: string | null; to: string | null }
    | { kind: "noChange"; reason: "not_found" | "out_of_scope" }
    | { kind: "manualReview" }

  // The review route's own branches, in its order: นอกขอบเขต and ไม่พบ confirm without touching the register; a field
  // finding applies the found value, which may clear a custodian or a department; anything else (no field, no asset, a
  // location or condition with nothing found) becomes ต้องตรวจสอบพิเศษ. A source test keeps the two in step.
  export function auditFindingApprovalEffect(finding: { findingType: string; assetId: string | null; expectedValue: string | null; actualValue: string | null }): AuditFindingApprovalEffect {
    if (finding.findingType === "out_of_scope") return { kind: "noChange", reason: "out_of_scope" }
    if (finding.findingType === "not_found") return { kind: "noChange", reason: "not_found" }
    const field = AUDIT_FINDING_FIELD_BY_TYPE[finding.findingType]
    const nullable = field === "custodian" || field === "department"
    if (!field || !finding.assetId || (finding.actualValue === null && !nullable)) return { kind: "manualReview" }
    return { kind: "change", field, from: finding.expectedValue, to: finding.actualValue }
  }

  export type AuditFindingApprovalEffectKey = "effectChange" | "effectNoChangeNotFound" | "effectNoChangeOutOfScope" | "effectManualReview"

  // The consequence sentence's word (P4-R24): นอกขอบเขต says how to move the asset; ไม่พบ only that the register stays, since
  // moving an asset nobody found reads oddly.
  export function auditFindingApprovalEffectKey(effect: AuditFindingApprovalEffect): AuditFindingApprovalEffectKey {
    if (effect.kind === "change") return "effectChange"
    if (effect.kind === "manualReview") return "effectManualReview"
    return effect.reason === "not_found" ? "effectNoChangeNotFound" : "effectNoChangeOutOfScope"
  }

  export type AuditFindingComparisonItem = {
    expectedLocationId: string | null
    expectedCustodianId: string | null
    expectedDepartmentId: string | null
    expectedConditionId: string | null
    actualLocationId: string | null
    actualCustodianId: string | null
    actualDepartmentId: string | null
    actualConditionId: string | null
  }
  export type AuditFindingComparisonRow = { field: AuditFindingComparisonField; expectedId: string | null; foundId: string | null; mismatch: boolean; thisFinding: boolean }

  const COMPARISON_KEYS: Readonly<Record<AuditFindingComparisonField, readonly [keyof AuditFindingComparisonItem, keyof AuditFindingComparisonItem]>> = {
    custodian: ["expectedCustodianId", "actualCustodianId"],
    department: ["expectedDepartmentId", "actualDepartmentId"],
    location: ["expectedLocationId", "actualLocationId"],
    condition: ["expectedConditionId", "actualConditionId"],
  }

  // A blank id is no value, as the conflict check reads it.
  const idOrNull = (value: string | null) => (value && value.trim() !== "" ? value : null)

  // ผู้ถือครอง / แผนก / ที่ตั้ง / สภาพ as the item recorded them (spec §10). The scan fills every found field (the expected
  // value where nothing differs), so a difference here is one the checker saw. ไม่พบ was never seen: nothing to compare.
  export function auditFindingComparisonRows(findingType: string, item: AuditFindingComparisonItem): AuditFindingComparisonRow[] {
    if (findingType === "not_found") return []
    return AUDIT_FINDING_COMPARISON_FIELDS.map((field) => {
      const [expectedKey, foundKey] = COMPARISON_KEYS[field]
      const expectedId = idOrNull(item[expectedKey])
      const foundId = idOrNull(item[foundKey])
      return { field, expectedId, foundId, mismatch: expectedId !== foundId, thisFinding: AUDIT_FINDING_FIELD_BY_TYPE[findingType] === field }
    })
  }

  export type AuditFindingDecideState = "open" | "ownFinding" | "decided" | "roundReadOnly" | "noPermission"
  export type AuditFindingPanelGate = { decide: AuditFindingDecideState; followUp: boolean }

  // Who may do what in the panel, in the review route's order: audit:approve for every action (roles M4), a round that is
  // neither closed nor cancelled (Task 2's readOnly, P4-R10), then a pending finding someone else reported (Task 2's
  // reportedByViewer, Appendix A §10).
  export function auditFindingPanelGate(input: { canApprove: boolean; reviewStatus: string; reportedByViewer: boolean; readOnly: boolean }): AuditFindingPanelGate {
    if (!input.canApprove) return { decide: "noPermission", followUp: false }
    if (input.readOnly) return { decide: "roundReadOnly", followUp: false }
    if (input.reviewStatus !== "pending") return { decide: "decided", followUp: true }
    if (input.reportedByViewer) return { decide: "ownFinding", followUp: true }
    return { decide: "open", followUp: true }
  }

  // The asset's other findings that "อนุมัติทุกช่องของทรัพย์สินนี้" sends with this one: still pending and not the viewer's
  // own (the route refuses those with 403). The same set Task 2's nextHrefAfterSiblings steps over.
  export function auditFindingApproveAllSiblings<T extends { reviewStatus: string; reportedByViewer: boolean }>(siblings: readonly T[]): T[] {
    return siblings.filter((sibling) => sibling.reviewStatus === "pending" && !sibling.reportedByViewer)
  }
  ```

- **`src/components/audit/audit-finding-decision.tsx`** (new):

  ```tsx
  "use client"

  import { useState } from "react"
  import { useTranslations } from "next-intl"
  import { useRouter } from "next/navigation"
  import { Check, CheckCheck, X } from "lucide-react"
  import { toast } from "sonner"
  import { Button } from "@/components/ui/button"
  import { Chip } from "@/components/ui/chip"
  import { Field } from "@/components/ui/field"
  import { KeyValueList } from "@/components/ui/key-value-list"
  import { Notice } from "@/components/ui/notice"
  import { Textarea } from "@/components/ui/textarea"
  import { useApiError } from "@/components/ui/use-api-error"
  import { useFieldErrors } from "@/components/ui/use-field-errors"
  import { classifyAuditFindingReviewResponse, foldAuditFindingBatchResults, type AuditFindingReviewFailureReason, type AuditFindingReviewOutcome } from "@/lib/audit-finding-review-results"
  import type { AuditFindingApprovalEffect } from "@/lib/audit-finding-review-panel-rules"
  import { formatCount } from "@/lib/display-format"
  import { formatDateTime } from "@/lib/utils"
  import { maxLength, required } from "@/lib/validation-rules"

  type ReviewAction = "approve" | "reject"
  // The press in flight. It stays set after a decision that went through, so the buttons stay busy or off until the next
  // finding's panel replaces this one and nothing is sent twice.
  type Phase = ReviewAction | "approveAll" | null
  type ReviewConflictPayload = { code?: string; assetUpdatedAt?: string; findingReportedAt?: string }

  // The reason box, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
  const FIELD_IDS = {
    reviewRemark: "audit-review-reason",
  } as const
  type DecisionField = keyof typeof FIELD_IDS
  const FIELD_ORDER = Object.keys(FIELD_IDS) as DecisionField[]

  // No form element: two commands share one box. This restates the box's rules for the command pressed.
  function validate(values: { action: ReviewAction; reviewRemark: string }): Partial<Record<DecisionField, string>> {
    const errors: Partial<Record<DecisionField, string>> = {}
    const check = (key: DecisionField, code: string | null) => {
      if (code) errors[key] = code
    }
    // Decision 5: a reason is required to reject, never to approve; the review API refuses the same (group 2 spec §10).
    check("reviewRemark", (values.action === "reject" ? required(values.reviewRemark) : null) ?? maxLength(values.reviewRemark, 4000))
    return errors
  }

  function errorText(payload: unknown): string | null {
    const error = payload && typeof payload === "object" ? (payload as { error?: unknown }).error : null
    return typeof error === "string" ? error : null
  }

  // Deciding in the review panel (group 2 spec §10 "Deciding", plan 4 Task 4): approve or reject take effect at once and the
  // panel moves on to Task 2's next finding (P4-R18); a 409 warns here and the next approve confirms it;
  // "อนุมัติทุกช่องของทรัพย์สินนี้" sends one review per finding. Mounted for every approver (key = the finding), so the
  // approve-all result survives the refresh after it.
  export function AuditFindingDecision({
    findingId,
    typeLabel,
    decidable,
    effectKind,
    position,
    total,
    siblings,
    nextHref,
    nextHrefAfterSiblings,
    closeHref,
  }: {
    findingId: string
    typeLabel: string
    /** Pending, someone else's, on an open round (auditFindingPanelGate "open"). */
    decidable: boolean
    effectKind: AuditFindingApprovalEffect["kind"]
    /** "k จาก N" (Task 2's queue): k is null when this finding is not one the viewer may decide. */
    position: number | null
    total: number
    /** The asset's other pending findings the viewer may decide, each with its own consequence sentence. */
    siblings: readonly { id: string; typeLabel: string; effectText: string }[]
    /** Task 2's next finding after this one, and after this one with its siblings; null when none is left. */
    nextHref: string | null
    nextHrefAfterSiblings: string | null
    /** The list without a finding: the empty panel says the tab is done. */
    closeHref: string
  }) {
    const t = useTranslations("auditFinding")
    const tCommon = useTranslations("common")
    const router = useRouter()
    const apiError = useApiError()
    const fieldErrors = useFieldErrors<DecisionField>()
    const [reviewRemark, setReviewRemark] = useState("")
    const [phase, setPhase] = useState<Phase>(null)
    const [conflict, setConflict] = useState<ReviewConflictPayload | null>(null)
    const [result, setResult] = useState<{ succeeded: number; failed: { id: string; reason: AuditFindingReviewFailureReason; label: string }[] } | null>(null)
    const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
    const labelById = new Map<string, string>([[findingId, typeLabel], ...siblings.map((sibling): [string, string] => [sibling.id, sibling.typeLabel])])

    async function send(id: string, action: ReviewAction, confirmConflict: boolean) {
      const response = await fetch(`/api/audit-findings/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewRemark: reviewRemark.trim(), confirmConflict }),
      })
      const payload: unknown = await response.json().catch(() => null)
      return { payload, outcome: classifyAuditFindingReviewResponse(response.status, payload) }
    }

    // The next finding is the server's (P4-R18): its link carries the finding and no page; none left opens the list.
    // scroll: false keeps the list's place beside the panel from xl; the page's AuditFindingPaneTop (keyed by the finding)
    // opens the next one at its top, the page below xl and the pane from xl (P4-R13, P4-R31).
    function moveOn(href: string | null) {
      router.replace(href ?? closeHref, { scroll: false })
    }

    async function decide(action: ReviewAction) {
      fieldErrors.setErrors(validate({ action, reviewRemark }))
      if (focusFirstError()) return
      setPhase(action)
      setResult(null)
      try {
        // The second press after the warning confirms it; the route asks it of an approve only.
        const { payload, outcome } = await send(findingId, action, action === "approve" && conflict !== null)
        if (outcome.ok) {
          toast.success(action === "reject" ? t("rejectedSuccess") : effectKind === "change" ? t("approvedSuccess") : t("approvedSuccessNoRegisterChange"))
          moveOn(nextHref)
          return
        }
        setPhase(null)
        if (outcome.reason === "assetChanged") {
          setConflict(payload as ReviewConflictPayload)
          return
        }
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        // Decided in another tab or by someone else: the panel shows it as it is now, and the toast says why.
        if (outcome.reason === "alreadyDecided") router.refresh()
        throw new Error(errorText(payload) ?? tCommon("error"))
      } catch (error) {
        setPhase(null)
        apiError.toast(error)
      }
    }

    async function approveAll() {
      fieldErrors.setErrors(validate({ action: "approve", reviewRemark }))
      if (focusFirstError()) return
      setPhase("approveAll")
      setResult(null)
      const results: { id: string; outcome: AuditFindingReviewOutcome }[] = []
      // One review per finding, in turn, so rows, counts and exports stay one per finding; a conflict is never confirmed
      // here: that finding is left to be decided on its own in the panel (group 2 spec §10, §15).
      for (const id of [findingId, ...siblings.map((sibling) => sibling.id)]) {
        try {
          results.push({ id, outcome: (await send(id, "approve", false)).outcome })
        } catch {
          results.push({ id, outcome: { ok: false, reason: "failed" } })
        }
      }
      const { succeeded, failed } = foldAuditFindingBatchResults(results)
      if (failed.length === 0) {
        toast.success(t("reviewResultSummary", { succeeded: formatCount(succeeded.length), failed: formatCount(0) }))
        moveOn(nextHrefAfterSiblings)
        return
      }
      // A failure stays in the panel as a Notice, never a warning toast (P4-R23).
      setPhase(null)
      // Each failure line keeps the label it had when pressed: the refresh drops a sibling decided elsewhere from siblings.
      setResult({ succeeded: succeeded.length, failed: failed.map((failure) => ({ ...failure, label: labelById.get(failure.id) ?? typeLabel })) })
      router.refresh()
    }

    if (!decidable && !result) return null

    return (
      <section aria-labelledby={`audit-finding-decision-${findingId}`} data-audit-finding-decision className="grid gap-4">
        <h3 id={`audit-finding-decision-${findingId}`} className="text-sm font-semibold text-foreground">{t("decisionTitle")}</h3>
        {result ? (
          <Notice tone="warning" role="status" title={t("reviewResultSummary", { succeeded: formatCount(result.succeeded), failed: formatCount(result.failed.length) })}>
            <ul className="grid gap-1">
              {result.failed.map((failure) => (
                <li key={failure.id}>
                  {t("reviewFailureLine", {
                    type: failure.label,
                    reason: t(`reviewFailure_${failure.reason}`),
                  })}
                </li>
              ))}
            </ul>
          </Notice>
        ) : null}
        {decidable ? (
          <>
            {conflict ? (
              <>
                <Notice tone="warning" role="alert" title={t("reviewConflictTitle")}>{t("reviewConflictHelp")}</Notice>
                <KeyValueList
                  items={[
                    { key: "findingReportedAt", label: t("reviewConflictFindingAt"), value: conflict.findingReportedAt ? formatDateTime(conflict.findingReportedAt) : null },
                    { key: "assetUpdatedAt", label: t("reviewConflictAssetUpdatedAt"), value: conflict.assetUpdatedAt ? formatDateTime(conflict.assetUpdatedAt) : null },
                  ]}
                />
              </>
            ) : null}
            {/* A reject without a reason reads "กรุณาระบุเหตุผลการปฏิเสธ" (P4-R27), the client's check and the server's alike. */}
            <Field label={t("reviewReasonLabel")} id={FIELD_IDS.reviewRemark} error={fieldErrors.errors.reviewRemark === "required" ? t("reviewReasonRequired") : fieldErrors.message("reviewRemark")}>
              <Textarea
                value={reviewRemark}
                rows={3}
                maxLength={4000}
                onChange={(event) => {
                  setReviewRemark(event.target.value)
                  fieldErrors.clear("reviewRemark")
                }}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => decide("approve")} busy={phase === "approve"} disabled={phase !== null && phase !== "approve"}>
                <Check aria-hidden="true" />
                {conflict ? t("reviewConfirmConflict") : t("approve")}
              </Button>
              <Button variant="danger" onClick={() => decide("reject")} busy={phase === "reject"} disabled={phase !== null && phase !== "reject"}>
                <X aria-hidden="true" />
                {t("reject")}
              </Button>
              {position !== null ? (
                <span data-audit-finding-position className="num text-meta text-muted-foreground">
                  {t("positionOf", { index: formatCount(position), total: formatCount(total) })}
                </span>
              ) : null}
            </div>
            {siblings.length > 0 ? (
              <div data-audit-finding-siblings className="grid gap-2 border-t border-border-soft pt-4">
                <p className="text-sm font-medium text-foreground">{t("otherPendingFields")}</p>
                <ul className="grid gap-2">
                  {siblings.map((sibling) => (
                    <li key={sibling.id} className="grid gap-1">
                      <Chip className="justify-self-start">{sibling.typeLabel}</Chip>
                      <span className="text-sm text-muted-foreground">{sibling.effectText}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="justify-self-start" onClick={approveAll} busy={phase === "approveAll"} disabled={phase !== null && phase !== "approveAll"}>
                  <CheckCheck aria-hidden="true" />
                  {t("approveAllFields")}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    )
  }
  ```

  Notes for the implementer:
  - GB4 holds: `disabled={phase !== null && phase !== "approve"}` never contains `phase === "approve"`.
  - The outcome and reason types are Task 1's (`AuditFindingReviewOutcome`, `AuditFindingReviewFailureReason`).
  - The client imports Task 1's file, so that file must stay pure (relative imports only, no `@/lib/db`).
  - `useFieldErrors().message("required")` reads `common.validation.required`; the box reads the panel's own sentence instead (P4-R27), and every other code (`tooLong`) keeps the shared message.
  - Write no `<form` or `<button` anywhere in this file, comments included: the panel-ui test's `doesNotMatch` (Step 1, "deciding: …") reads the raw source.

- **`src/components/audit/audit-finding-review-panel.tsx`** (new):

  ```tsx
  import Link from "next/link"
  import type { ReactNode } from "react"
  import { getTranslations } from "next-intl/server"
  import { Archive, ArrowRight } from "lucide-react"
  import { AssetPhotoFrame } from "@/components/assets/asset-photo-frame"
  import { AuditFindingDecision } from "@/components/audit/audit-finding-decision"
  import { AuditFindingFollowUpActions } from "@/components/audit/audit-finding-review-actions"
  import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
  import { Chip } from "@/components/ui/chip"
  import { ContentPanel } from "@/components/ui/content-panel"
  import { DataFreshnessBanner } from "@/components/ui/data-freshness-banner"
  import { EmptyNote } from "@/components/ui/empty-note"
  import { KeyValueList } from "@/components/ui/key-value-list"
  import { Nil } from "@/components/ui/nil"
  import { Notice } from "@/components/ui/notice"
  import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
  import { isThumbnailable } from "@/lib/attachment-thumbnail"
  import {
    auditFindingApprovalEffect,
    auditFindingApprovalEffectKey,
    auditFindingApproveAllSiblings,
    auditFindingComparisonRows,
    auditFindingPanelGate,
    type AuditFindingApprovalEffect,
    type AuditFindingComparisonField,
  } from "@/lib/audit-finding-review-panel-rules"
  import type { AuditFindingsPanel } from "@/lib/audit-findings-page-data"
  import { formatDateTime } from "@/lib/utils"

  // The page's state badges of a finding (its findingStatusBadges).
  export type AuditFindingStatusBadge = { key: string; title: string; label: string; status?: string; tone?: StatusTone }

  // The review panel of the findings page (group 2 spec §10, plan 4 Task 4): the chosen finding (?finding=) beside the
  // table, and full screen on the phone (Task 3's slot). A server component: the page hands it Task 2's panel data
  // (P4-R20). What approve does is read from auditFindingApprovalEffect, which follows the review route's own branches;
  // deciding is the client AuditFindingDecision, the follow-up dialogs AuditFindingFollowUpActions.
  export async function AuditFindingReviewPanel({
    locale,
    data,
    canApprove,
    employees,
    statusBadges,
    evidence,
    disposalHref,
    loadedAtIso,
    loadedAtLabel,
    closeHref,
  }: {
    locale: string
    data: AuditFindingsPanel
    canApprove: boolean
    employees: { id: string; label: string }[]
    statusBadges: readonly AuditFindingStatusBadge[]
    /** The page's AuditFindingEvidenceList of this finding. */
    evidence: ReactNode
    disposalHref: string | null
    loadedAtIso: string
    loadedAtLabel: string
    /** The list without a finding: where the panel goes when nothing is left to decide. */
    closeHref: string
  }) {
    const t = await getTranslations("auditFinding")
    const tRound = await getTranslations("auditRound")
    const tScan = await getTranslations("auditScan")
    const tCommon = await getTranslations("common")
    const { finding, labels } = data
    const fieldLabel = (field: AuditFindingComparisonField) => tRound(`differenceField_${field}`)
    // An id the lookups do not know reads ไม่อยู่ในรายการ, never the raw id (group 2 spec §5).
    const valueText = (id: string | null) => (id ? (labels.get(id) ?? tScan("valueNotInList")) : null)
    // The consequence sentence (P4-R24): a field change in words, else the word of its kind.
    const effectText = (effect: AuditFindingApprovalEffect) =>
      effect.kind === "change"
        ? t("effectChange", { field: fieldLabel(effect.field), from: valueText(effect.from) ?? t("effectNoValue"), to: valueText(effect.to) ?? t("effectNoValue") })
        : t(auditFindingApprovalEffectKey(effect))
    const effect = auditFindingApprovalEffect(finding)
    const gate = auditFindingPanelGate({ canApprove, reviewStatus: finding.reviewStatus, reportedByViewer: finding.reportedByViewer, readOnly: data.readOnly })
    const siblings = auditFindingApproveAllSiblings(data.siblings).map((sibling) => ({
      id: sibling.id,
      typeLabel: t(`type_${sibling.findingType}`),
      effectText: effectText(auditFindingApprovalEffect(sibling)),
    }))
    const assetLabel = finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo
    // finding.evidence is newest first (Task 2). Closure files from ปิดรายการไม่ตรง are newer than the check's own photo,
    // so the check's photo is the oldest image (P4-R33).
    const photo = finding.evidence.filter((attachment) => isThumbnailable(attachment.fileType)).at(-1) ?? null
    const reporter = data.reporterLabel ?? tCommon("noValue")
    const room = valueText(finding.auditItem.actualLocationId)
    const inspected = [
      finding.findingType === "not_found" ? t("reportedNotFoundBy", { name: reporter }) : t("inspectedBy", { name: reporter }),
      formatDateTime(finding.reportedAt),
      finding.findingType !== "not_found" && room ? t("roomLabel", { room }) : null,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" · ")
    const comparison = auditFindingComparisonRows(finding.findingType, finding.auditItem).map((row) => ({
      key: row.field,
      label: fieldLabel(row.field),
      value: (
        <span data-audit-finding-field={row.field} data-mismatch={row.mismatch ? "true" : undefined} className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {row.mismatch ? (
            <>
              <span className="sr-only">{t("systemValue")}: </span>
              <span className="text-muted-foreground line-through">{valueText(row.expectedId) ?? <Nil />}</span>
              <ArrowRight aria-hidden="true" className="size-3.5 text-faint-foreground" />
              <span className="sr-only">{t("foundValue")}: </span>
              <span className="font-medium">{valueText(row.foundId) ?? <Nil />}</span>
              <StatusBadge label={tScan("fieldMismatch")} tone="warning" />
            </>
          ) : (
            (valueText(row.expectedId) ?? <Nil />)
          )}
        </span>
      ),
    }))

    return (
      <div data-audit-finding-panel data-finding-id={finding.id} className="min-w-0">
        <ContentPanel
          divided
          title={assetLabel}
          description={finding.parent ? t("componentOfParent", { assetTag: finding.parent.assetTag, name: finding.parent.name }) : undefined}
          actions={
            finding.asset ? (
              <Link href={`/${locale}/assets/${finding.asset.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t("openAsset")}
              </Link>
            ) : undefined
          }
        >
          <div className="grid gap-5">
            <div className="grid gap-2">
              <ul data-audit-finding-badges className="flex flex-wrap items-center gap-2">
                <li>
                  <Chip>{t(`type_${finding.findingType}`)}</Chip>
                </li>
                {statusBadges.map((badge) => (
                  <li key={badge.key} title={`${badge.title}: ${badge.label}`}>
                    <span className="sr-only">{badge.title}: </span>
                    <StatusBadge label={badge.label} status={badge.status} tone={badge.tone} />
                  </li>
                ))}
              </ul>
              <p className="text-meta text-muted-foreground">
                {t("auditRound")}{" "}
                <Link href={`/${locale}/audit/rounds/${finding.auditRound.id}`} className={linkVariants({ size: "inherit" })}>
                  <span className="tag">{finding.auditRound.auditNo}</span>
                </Link>
                {" · "}
                {finding.auditRound.name}
              </p>
            </div>

            {comparison.length > 0 ? (
              <div data-audit-finding-comparison>
                <KeyValueList items={comparison} />
              </div>
            ) : null}

            {photo || finding.remark ? (
              <div className="grid gap-3">
                {photo ? <AssetPhotoFrame key={photo.id} attachmentId={photo.id} alt={photo.originalName} canUpload={false} className="h-56" /> : null}
                {finding.remark ? <KeyValueList items={[{ key: "scanRemark", label: t("scanRemark"), value: finding.remark }]} /> : null}
              </div>
            ) : null}
            <p data-audit-finding-inspected className="text-meta text-muted-foreground">{inspected}</p>

            {finding.reviewStatus === "pending" ? (
              <Notice tone="info" data-audit-finding-effect>
                {effectText(effect)}
              </Notice>
            ) : (
              <KeyValueList items={[{ key: "decisionRemark", label: t("decisionRemark"), value: finding.reviewRemark }]} />
            )}

            <DataFreshnessBanner
              loadedAtIso={loadedAtIso}
              loadedAtLabel={loadedAtLabel}
              labels={{
                freshTitle: t("freshnessFreshTitle"),
                freshHelp: t("freshnessFreshHelp"),
                staleTitle: t("freshnessStaleTitle"),
                staleHelp: t("freshnessStaleHelp"),
                refresh: t("freshnessRefresh"),
              }}
            />
            {gate.decide === "ownFinding" ? <Notice tone="warning">{t("segregationReviewBlocked")}</Notice> : null}
            {gate.decide === "roundReadOnly" ? <Notice tone="neutral">{t("roundReadOnlyReview")}</Notice> : null}
            {gate.decide === "noPermission" ? null : (
              <AuditFindingDecision
                key={finding.id}
                findingId={finding.id}
                typeLabel={t(`type_${finding.findingType}`)}
                decidable={gate.decide === "open"}
                effectKind={effect.kind}
                position={data.queue?.position ?? null}
                total={data.queue?.total ?? 0}
                siblings={siblings}
                nextHref={data.queue?.nextHref ?? null}
                nextHrefAfterSiblings={data.queue?.nextHrefAfterSiblings ?? null}
                closeHref={closeHref}
              />
            )}

            <section aria-labelledby={`audit-finding-follow-up-${finding.id}`} data-audit-finding-follow-up className="grid gap-3 border-t border-border-soft pt-5">
              <h3 id={`audit-finding-follow-up-${finding.id}`} className="text-sm font-semibold text-foreground">{t("followUpTitle")}</h3>
              <KeyValueList
                items={[
                  { key: "actionPlan", label: t("actionPlan"), value: finding.actionPlan },
                  { key: "actionOwner", label: t("actionOwner"), value: finding.ownerLabel, nilLabel: t("noActionOwner") },
                  { key: "actionDueDate", label: t("actionDueDate"), value: finding.actionDueDate ? formatDateTime(finding.actionDueDate) : null },
                ]}
              />
              {gate.followUp ? (
                <AuditFindingFollowUpActions
                  findingId={finding.id}
                  actionStatus={finding.actionStatus}
                  actionPlan={finding.actionPlan}
                  actionOwnerId={finding.actionOwnerId}
                  actionDueDate={finding.actionDueDate}
                  evidenceCount={finding.evidence.length}
                  employees={employees}
                />
              ) : null}
              {evidence}
              {disposalHref ? (
                <Link href={disposalHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                  <Archive aria-hidden="true" />
                  {t("openDisposalRequest")}
                </Link>
              ) : null}
            </section>
          </div>
        </ContentPanel>
      </div>
    )
  }

  // The slot with no finding open (P4-R18): what to do, an unknown ?finding=, or that the filters hold nothing left to
  // decide. Task 3's words, and the same hook as Task 3's empty slot.
  export async function AuditFindingReviewPanelEmpty({ state }: { state: "choose" | "notFound" | "done" }) {
    const t = await getTranslations("auditFinding")
    return (
      <div data-audit-finding-panel-empty className="min-w-0">
        <ContentPanel title={t("panelTitle")}>
          <EmptyNote tone={state === "done" ? "clear" : "empty"} role="status">
            {state === "done" ? t("panelEmptyDone") : state === "notFound" ? t("panelNotFound") : t("panelEmpty")}
          </EmptyNote>
        </ContentPanel>
      </div>
    )
  }
  ```

  Notes for the implementer:
  - `AuditFindingsPanel` is Task 2's (P4-R20). Its `finding` carries `parent`, `ownerLabel`, `evidence` and `reportedByViewer` under the rows' names; this task reads them and never adds a second loader.
  - `formatDateTime` returns `"-"` for an empty date. Both calls here pass a set date, so no `"-"` reaches the screen (LV2 counts `|| "-"` / `?? "-"` / `: "-"` only).
  - The finding is rendered by a server component, so `labels` (a `Map`) never crosses to the client. The client island gets strings only.
  - The photo frame is keyed by `photo.id`, and the decision by `finding.id`. Moving between findings changes only `?finding=`, and in the App Router a change to search params keeps client state (`node_modules/next/dist/client/components/layout-router.js:361-365`). Without the key, a failed thumbnail's `failed` state would carry over to the next finding's photo (P4-R33).

- **`src/components/audit/audit-finding-review-actions.tsx`:**
  - master `:1-365` become the block below;
  - `ActionPlanModal` (`:367-493`) and `CloseFindingModal` (`:495-613`) keep their bodies with two edits each:
    - the `returnFocusRef,` parameter and its `returnFocusRef?: RefObject<HTMLElement | null>` prop line go (`:374`, `:383`, `:498`, `:503`);
    - ` returnFocusRef={returnFocusRef}` leaves their `<AccessibleDialog …>` (`:439`, `:570`).

  ```tsx
  "use client"

  import { useState } from "react"
  import { useTranslations } from "next-intl"
  import { useRouter } from "next/navigation"
  import { CalendarClock, Check, FileUp } from "lucide-react"
  import { toast } from "sonner"
  import {
    AccessibleDialog,
    AccessibleDialogBody,
    AccessibleDialogCancel,
    AccessibleDialogFooter,
    accessibleDialogFormClasses,
  } from "@/components/ui/accessible-dialog"
  import { Button } from "@/components/ui/button"
  import { Field } from "@/components/ui/field"
  import { FileDropzone } from "@/components/ui/file-dropzone"
  import { Input } from "@/components/ui/input"
  import { NativeSelect } from "@/components/ui/native-select"
  import { SearchableSelect } from "@/components/ui/searchable-select"
  import { Textarea } from "@/components/ui/textarea"
  import { useApiError } from "@/components/ui/use-api-error"
  import { useFieldErrors } from "@/components/ui/use-field-errors"
  import { maxLength, required } from "@/lib/validation-rules"

  type EmployeeOption = { id: string; label: string }

  // The fields of the two follow-up dialogs in visual order, keyed like the server's fieldErrors, with the id focus moves
  // to (v-track M-R1). The owner select is optional and the server never refuses it, so it stays out. The review decision
  // and its reason box are in the review panel (audit-finding-decision.tsx, group 2 plan 4).
  const PLAN_FIELD_IDS = {
    actionPlan: "audit-plan-action-plan",
    actionDueDate: "audit-plan-due-date",
    actionStatus: "audit-plan-status",
  } as const
  type PlanField = keyof typeof PLAN_FIELD_IDS
  const PLAN_FIELD_ORDER = Object.keys(PLAN_FIELD_IDS) as PlanField[]
  const CLOSE_FIELD_IDS = {
    closureRemark: "audit-close-remark",
  } as const
  type CloseField = keyof typeof CLOSE_FIELD_IDS
  const CLOSE_FIELD_ORDER = Object.keys(CLOSE_FIELD_IDS) as CloseField[]
  type FindingField = PlanField | CloseField

  // noValidate turns the browser's check off, so this restates the controls' required and maxLength. Each dialog passes
  // only its own fields (v-track M-R2, U-R8).
  function validate(values: { actionPlan?: string; closureRemark?: string }): Partial<Record<FindingField, string>> {
    const errors: Partial<Record<FindingField, string>> = {}
    const check = (key: FindingField, code: string | null) => {
      if (code) errors[key] = code
    }
    if (values.actionPlan !== undefined) check("actionPlan", required(values.actionPlan) ?? maxLength(values.actionPlan, 4000))
    if (values.closureRemark !== undefined) check("closureRemark", maxLength(values.closureRemark, 4000))
    return errors
  }

  // The follow-up of a finding in the review panel (group 2 spec §10, Appendix A §10): "แผนแก้ไข" and, until it is closed,
  // "ปิดรายการไม่ตรง". Each sets the state that mounts its dialog; AccessibleDialog gives focus back to the button pressed.
  export function AuditFindingFollowUpActions({
    findingId,
    actionStatus,
    actionPlan,
    actionOwnerId,
    actionDueDate,
    evidenceCount,
    employees,
  }: {
    findingId: string
    actionStatus: string
    actionPlan?: string | null
    actionOwnerId?: string | null
    actionDueDate?: Date | string | null
    evidenceCount: number
    employees: EmployeeOption[]
  }) {
    const t = useTranslations("auditFinding")
    const [planOpen, setPlanOpen] = useState(false)
    const [closeOpen, setCloseOpen] = useState(false)

    return (
      <div data-audit-finding-follow-up-actions className="flex flex-wrap gap-2">
        <Button variant="outline" size="md" onClick={() => setPlanOpen(true)}>
          <CalendarClock aria-hidden="true" />
          {t("actionPlan")}
        </Button>
        {actionStatus !== "closed" ? (
          <Button variant="outline" size="md" onClick={() => setCloseOpen(true)}>
            <FileUp aria-hidden="true" />
            {t("closeFinding")}
          </Button>
        ) : null}
        {planOpen ? (
          <ActionPlanModal
            findingId={findingId}
            employees={employees}
            actionPlan={actionPlan}
            actionOwnerId={actionOwnerId}
            actionDueDate={actionDueDate}
            actionStatus={actionStatus}
            onClose={() => setPlanOpen(false)}
          />
        ) : null}
        {closeOpen ? <CloseFindingModal findingId={findingId} evidenceCount={evidenceCount} onClose={() => setCloseOpen(false)} /> : null}
      </div>
    )
  }
  ```

  After the edit: `rg -n "RefObject|returnFocusRef|stopPortalClick|ReviewDecisionModal|compact|AlertTriangle|KeyValueList|Notice|RowActions|formatDateTime" src/components/audit/audit-finding-review-actions.tsx` prints nothing.

- **The page** (`src/app/[locale]/(dashboard)/audit/findings/page.tsx`, after Task 3):
  - Imports:
    - add `import { AuditFindingReviewPanel, AuditFindingReviewPanelEmpty } from "@/components/audit/audit-finding-review-panel"`;
    - remove what only Task 3's interim body read: `AuditFindingReviewActions`, `DataFreshnessBanner`, `ContentPanel`, `EmptyNote`, `KeyValueList`, and `buttonVariants` (keep `linkVariants`).
  - The `<DataFreshnessBanner …/>` block above the panes goes: the banner is in the panel now. `pageLoadedAt` stays (Task 2's `now`), and the panel reads `data.loadedAt`.
  - `findingStatusBadges` stays as Task 3 wrote it: the panel's finding is a row plus the item's compared fields, so `findingStatusBadges(data.panel.finding, …)` type-checks with the row's type.
  - Task 3's `FindingStatusBadges` component and `chosenDisposalHref` go: the panel draws the badges itself (`AuditFindingStatusBadge` is the same shape as `FindingStatusBadgeItem`), and takes `disposalHrefFor(data.panel.finding)`.
  - Task 3's `const panel = …` expression (both branches) becomes the block below. `closeHref`, `disposalHrefFor`, `today`, `view`, `findingStatusBadges`, `resolveFindingState` and `AuditFindingEvidenceList` are Task 3's names; `data` is Task 2's page data.

    ```tsx
    // The review panel (group 2 spec §10): the open finding, or the empty panel, in Task 3's slot. It renders once; the pane
    // places it beside the table from xl and full screen below. After the last decision on รอพิจารณา or ทั้งหมด, the tabs
    // whose work is deciding, the empty panel says the tab is done (P4-R18). The other four keep
    // "เลือกรายการทางซ้ายเพื่อพิจารณา" (P4-R32): อนุมัติแล้ว and ปฏิเสธแล้ว hold no pending finding; ต้องติดตาม and ปิดแล้ว
    // filter on the plan (actionStatus), not the review, so a finding whose plan was saved before its review can sit
    // there still pending, but their work is the plan and the close. view is Task 3's auditFindingStatusView(status).
    const panel = data.panel ? (
      <AuditFindingReviewPanel
        locale={locale}
        data={data.panel}
        canApprove={canApprove}
        employees={data.employees}
        statusBadges={findingStatusBadges(data.panel.finding, resolveFindingState(data.panel.finding, today))}
        evidence={
          <AuditFindingEvidenceList
            attachments={data.panel.finding.evidence}
            labels={{
              title: t("evidenceAttachments"),
              count: t("evidenceAttachmentCount", { count: data.panel.finding.evidence.length }),
              open: t("openEvidenceAttachment"),
            }}
          />
        }
        disposalHref={disposalHrefFor(data.panel.finding)}
        loadedAtIso={data.loadedAt.toISOString()}
        loadedAtLabel={formatDateTime(data.loadedAt)}
        closeHref={closeHref}
      />
    ) : (
      <AuditFindingReviewPanelEmpty state={findingId ? "notFound" : data.reviewableTotal === 0 && (view.tab === "pending" || view.tab === "all") ? "done" : "choose"} />
    )
    ```

  - The pane (`<div data-audit-finding-pane …>`, sticky from `xl`), its `AuditFindingPaneTop`, its phone `PageBackLink` and `{panel}` stay as Task 3 wrote them. The table and the cards hold no review action (Task 3), so nothing else on the page changes.

- **`DESIGN.md`:**
  - In `:628` (the RowActions bullet "A 2C dialog never sits in the menu…"), Task 3 replaced the findings clause. After its sentence "… which holds the decision, the plan, the close and the disposal-request link." add: "The panel's "แผนแก้ไข" and "ปิดรายการไม่ตรง" (group 2 plan 4) set their dialog's open state, and the dialog gives focus back to the button that opened it."
  - After `:658` (the **Offline** bullet of Field Audit / QR Workflows), add:

    "- **Findings review panel (group 2 plan 4):** the chosen finding (`?finding=`) is a `ContentPanel divided` beside the table, full screen on the phone.
      - Its head: the title is the asset's code and name, "ส่วนควบของ <code> <name>" is under it for a component, and "เปิดหน้าทรัพย์สิน" is the panel's action.
      - Its body: the type `Chip` and the state badges; the four-field comparison (ผู้ถือครอง / แผนก / ที่ตั้ง / สภาพ) as a `KeyValueList`, where a field that differs strikes the expected value and carries a warning `StatusBadge` "ไม่ตรง"; the photo and remark; "ตรวจโดย … · time · ห้อง …"; and, for a pending finding, the consequence sentence as an info `Notice`, read from `auditFindingApprovalEffect` (the review route's own branches). ไม่พบ reads only that the register stays; นอกขอบเขต adds how to move the asset.
      - Deciding: "เหตุผล (ต้องกรอกเมื่อปฏิเสธ)", then the primary "อนุมัติ" and the danger "ปฏิเสธ" with "k จาก N". There is no confirm dialog. A reject without a reason is "กรุณาระบุเหตุผลการปฏิเสธ" under the box, and the API refuses it too. A decision that goes through moves the panel to the next finding the viewer may decide, which the server works out (the page data's `queue.nextHref`).
      - A 409 shows the warning `Notice` (`role="alert"`), and "อนุมัติ" reads "ยืนยันและดำเนินการต่อ" for the second press.
      - "อนุมัติทุกช่องของทรัพย์สินนี้" sends one review per finding. When one fails, it reports "สำเร็จ X · ไม่สำเร็จ Y" in a `role="status"` Notice in the panel, never a warning toast.
      - The follow-up section holds the plan, the owner and the due date, "แผนแก้ไข" / "ปิดรายการไม่ตรง" (their dialogs), the evidence list and the disposal-request link.
      - Who sees what: without `audit:approve` nothing in the panel decides, plans or closes; a finding the viewer reported says why in place of the buttons; a closed or cancelled round offers none of them."

- [ ] **Step 4: Add, change and delete the words**

Write the change file in the session scratchpad (an absolute path, for example `<scratchpad>/g2p4-task4-messages.json`). Run `node scripts/messages-edit.mjs <file>` from the repo root, then delete the file. Namespace `auditFinding`. Task 3's `componentOfParent` ("ส่วนควบของ {assetTag} {name}"), `openAsset`, `panelTitle`, `panelEmpty` and `panelNotFound` are reused, not set again:

| Key | th | en |
|---|---|---|
| `scanRemark` (new) | หมายเหตุจากการตรวจ | Remark from the check |
| `inspectedBy` (new) | ตรวจโดย {name} | Checked by {name} |
| `reportedNotFoundBy` (new) | บันทึกว่าไม่พบโดย {name} | Recorded as not found by {name} |
| `roomLabel` (new) | ห้อง {room} | Room {room} |
| `effectChange` (new) | ถ้าอนุมัติ ทะเบียนจะเปลี่ยน{field} จาก {from} เป็น {to} | If approved, the register's {field} changes from {from} to {to} |
| `effectNoValue` (new) | ไม่ระบุ | none |
| `effectNoChangeOutOfScope` (new, P4-R24) | อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย | Approving leaves the register as it is. To move the asset, make a transfer. |
| `effectNoChangeNotFound` (new, P4-R24) | อนุมัติแล้วทะเบียนจะไม่เปลี่ยน | Approving leaves the register as it is. |
| `effectManualReview` (new) | อนุมัติแล้วทะเบียนจะไม่เปลี่ยน เพราะไม่มีค่าที่พบ รายการนี้จะไปอยู่ที่ต้องตรวจสอบพิเศษ | Approving leaves the register as it is because nothing was found to apply; the discrepancy moves to Exception. |
| `decisionTitle` (new) | การพิจารณา | Decision |
| `reviewReasonLabel` (new) | เหตุผล (ต้องกรอกเมื่อปฏิเสธ) | Reason (required to reject) |
| `reviewReasonRequired` (new, P4-R27) | กรุณาระบุเหตุผลการปฏิเสธ | Enter a reason to reject. |
| `positionOf` (new) | {index} จาก {total} | {index} of {total} |
| `otherPendingFields` (new) | เรื่องอื่นของทรัพย์สินนี้ที่รอพิจารณา | Other pending fields of this asset |
| `approveAllFields` (new) | อนุมัติทุกช่องของทรัพย์สินนี้ | Approve every field of this asset |
| `approvedSuccessNoRegisterChange` (new) | อนุมัติรายการไม่ตรงสำเร็จ ทะเบียนไม่เปลี่ยน | Discrepancy approved; the register is unchanged |
| `reviewResultSummary` (new) | สำเร็จ {succeeded} · ไม่สำเร็จ {failed} | {succeeded} done · {failed} not done |
| `reviewFailureLine` (new) | {type} · {reason} | {type} · {reason} |
| `reviewFailure_assetChanged` (new) | ข้อมูลทรัพย์สินเปลี่ยนหลังรายงาน ให้พิจารณารายการนี้ในแผงพิจารณา | The asset changed after the report; decide this one in the review panel |
| `reviewFailure_alreadyDecided` (new) | มีการพิจารณารายการนี้แล้ว | Already decided |
| `reviewFailure_ownFinding` (new) | คุณเป็นผู้รายงานรายการนี้เอง จึงพิจารณาไม่ได้ | You reported this discrepancy, so you cannot decide it |
| `reviewFailure_reasonRequired` (new) | ต้องกรอกเหตุผลเมื่อปฏิเสธ | A reason is required to reject |
| `reviewFailure_roundReadOnly` (new) | รอบตรวจนับนี้ปิดหรือยกเลิกแล้ว | The audit round is closed or cancelled |
| `reviewFailure_notFound` (new) | ไม่พบรายการไม่ตรงนี้ | Discrepancy not found |
| `reviewFailure_failed` (new) | ส่งไม่สำเร็จ ลองอีกครั้ง | Not sent; try again |
| `roundReadOnlyReview` (new) | รอบตรวจนับนี้ปิดหรือยกเลิกแล้ว จึงพิจารณาหรือบันทึกแผนแก้ไขไม่ได้ | This audit round is closed or cancelled, so its discrepancies cannot be decided or planned. |
| `followUpTitle` (new) | การติดตาม | Follow-up |
| `decisionRemark` (new) | เหตุผลการพิจารณา | Decision reason |
| `panelEmptyDone` (new) | ไม่มีรายการรอพิจารณาในตัวกรองนี้แล้ว | Nothing is left to decide in these filters |

Task 5's bar reads `reviewResultSummary`, `reviewFailure_<reason>` and `reviewReasonRequired` as they are: it adds no second key for them.

Delete (no code reads them after this task): `auditFinding.reviewDecisionTitle_approve`, `reviewDecisionTitle_reject`, `reviewDecisionImpactTitle_approve`, `reviewDecisionImpactTitle_reject`, `reviewDecisionHelp_approve`, `reviewDecisionHelp_reject`, `reviewRemarkLabel_approve`, `reviewRemarkLabel_reject`, `reviewSubmit_approve`, `reviewSubmit_reject`. Check first: `rg -n 'reviewDecision(Title|ImpactTitle|Help)_|reviewRemarkLabel_|reviewSubmit_' src` prints nothing.

The change file:

```json
{
  "set": {
    "th": {
      "auditFinding.scanRemark": "หมายเหตุจากการตรวจ",
      "auditFinding.inspectedBy": "ตรวจโดย {name}",
      "auditFinding.reportedNotFoundBy": "บันทึกว่าไม่พบโดย {name}",
      "auditFinding.roomLabel": "ห้อง {room}",
      "auditFinding.effectChange": "ถ้าอนุมัติ ทะเบียนจะเปลี่ยน{field} จาก {from} เป็น {to}",
      "auditFinding.effectNoValue": "ไม่ระบุ",
      "auditFinding.effectNoChangeOutOfScope": "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย",
      "auditFinding.effectNoChangeNotFound": "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน",
      "auditFinding.effectManualReview": "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน เพราะไม่มีค่าที่พบ รายการนี้จะไปอยู่ที่ต้องตรวจสอบพิเศษ",
      "auditFinding.decisionTitle": "การพิจารณา",
      "auditFinding.reviewReasonLabel": "เหตุผล (ต้องกรอกเมื่อปฏิเสธ)",
      "auditFinding.reviewReasonRequired": "กรุณาระบุเหตุผลการปฏิเสธ",
      "auditFinding.positionOf": "{index} จาก {total}",
      "auditFinding.otherPendingFields": "เรื่องอื่นของทรัพย์สินนี้ที่รอพิจารณา",
      "auditFinding.approveAllFields": "อนุมัติทุกช่องของทรัพย์สินนี้",
      "auditFinding.approvedSuccessNoRegisterChange": "อนุมัติรายการไม่ตรงสำเร็จ ทะเบียนไม่เปลี่ยน",
      "auditFinding.reviewResultSummary": "สำเร็จ {succeeded} · ไม่สำเร็จ {failed}",
      "auditFinding.reviewFailureLine": "{type} · {reason}",
      "auditFinding.reviewFailure_assetChanged": "ข้อมูลทรัพย์สินเปลี่ยนหลังรายงาน ให้พิจารณารายการนี้ในแผงพิจารณา",
      "auditFinding.reviewFailure_alreadyDecided": "มีการพิจารณารายการนี้แล้ว",
      "auditFinding.reviewFailure_ownFinding": "คุณเป็นผู้รายงานรายการนี้เอง จึงพิจารณาไม่ได้",
      "auditFinding.reviewFailure_reasonRequired": "ต้องกรอกเหตุผลเมื่อปฏิเสธ",
      "auditFinding.reviewFailure_roundReadOnly": "รอบตรวจนับนี้ปิดหรือยกเลิกแล้ว",
      "auditFinding.reviewFailure_notFound": "ไม่พบรายการไม่ตรงนี้",
      "auditFinding.reviewFailure_failed": "ส่งไม่สำเร็จ ลองอีกครั้ง",
      "auditFinding.roundReadOnlyReview": "รอบตรวจนับนี้ปิดหรือยกเลิกแล้ว จึงพิจารณาหรือบันทึกแผนแก้ไขไม่ได้",
      "auditFinding.followUpTitle": "การติดตาม",
      "auditFinding.decisionRemark": "เหตุผลการพิจารณา",
      "auditFinding.panelEmptyDone": "ไม่มีรายการรอพิจารณาในตัวกรองนี้แล้ว"
    },
    "en": {
      "auditFinding.scanRemark": "Remark from the check",
      "auditFinding.inspectedBy": "Checked by {name}",
      "auditFinding.reportedNotFoundBy": "Recorded as not found by {name}",
      "auditFinding.roomLabel": "Room {room}",
      "auditFinding.effectChange": "If approved, the register's {field} changes from {from} to {to}",
      "auditFinding.effectNoValue": "none",
      "auditFinding.effectNoChangeOutOfScope": "Approving leaves the register as it is. To move the asset, make a transfer.",
      "auditFinding.effectNoChangeNotFound": "Approving leaves the register as it is.",
      "auditFinding.effectManualReview": "Approving leaves the register as it is because nothing was found to apply; the discrepancy moves to Exception.",
      "auditFinding.decisionTitle": "Decision",
      "auditFinding.reviewReasonLabel": "Reason (required to reject)",
      "auditFinding.reviewReasonRequired": "Enter a reason to reject.",
      "auditFinding.positionOf": "{index} of {total}",
      "auditFinding.otherPendingFields": "Other pending fields of this asset",
      "auditFinding.approveAllFields": "Approve every field of this asset",
      "auditFinding.approvedSuccessNoRegisterChange": "Discrepancy approved; the register is unchanged",
      "auditFinding.reviewResultSummary": "{succeeded} done · {failed} not done",
      "auditFinding.reviewFailureLine": "{type} · {reason}",
      "auditFinding.reviewFailure_assetChanged": "The asset changed after the report; decide this one in the review panel",
      "auditFinding.reviewFailure_alreadyDecided": "Already decided",
      "auditFinding.reviewFailure_ownFinding": "You reported this discrepancy, so you cannot decide it",
      "auditFinding.reviewFailure_reasonRequired": "A reason is required to reject",
      "auditFinding.reviewFailure_roundReadOnly": "The audit round is closed or cancelled",
      "auditFinding.reviewFailure_notFound": "Discrepancy not found",
      "auditFinding.reviewFailure_failed": "Not sent; try again",
      "auditFinding.roundReadOnlyReview": "This audit round is closed or cancelled, so its discrepancies cannot be decided or planned.",
      "auditFinding.followUpTitle": "Follow-up",
      "auditFinding.decisionRemark": "Decision reason",
      "auditFinding.panelEmptyDone": "Nothing is left to decide in these filters"
    }
  },
  "delete": [
    "auditFinding.reviewDecisionTitle_approve",
    "auditFinding.reviewDecisionTitle_reject",
    "auditFinding.reviewDecisionImpactTitle_approve",
    "auditFinding.reviewDecisionImpactTitle_reject",
    "auditFinding.reviewDecisionHelp_approve",
    "auditFinding.reviewDecisionHelp_reject",
    "auditFinding.reviewRemarkLabel_approve",
    "auditFinding.reviewRemarkLabel_reject",
    "auditFinding.reviewSubmit_approve",
    "auditFinding.reviewSubmit_reject"
  ]
}
```

Glossary (`docs/19_THAI_GLOSSARY.md`):
- "รายการไม่ตรง" in sentences, "ไม่ตรง" on the badge (reused `auditScan.fieldMismatch`), "พิจารณา" for review, "ตรวจนับ" for the round, "ผู้ถือครอง" / "ที่ตั้ง" / "แผนก" / "สภาพ" (reused `auditRound.differenceField_*` in the sentence).
- "ทะเบียน" is the register's word, as "ทะเบียนทรัพย์สิน" and "ดูทั้งหมดในทะเบียน".
- "ทำรายการโอนย้าย" follows the app's "โอนย้าย".
- en keeps Discrepancy / Decision (§2.3).
- No Thai text holds a retired word (`tests/thai-glossary.test.ts`).

Kept and reused:
- `auditFinding`:
  - `approve`, `reject` (the roles' `REVIEW_BUTTON_NAMES`), `actionPlan`, `closeFinding`, the dialogs' keys;
  - `segregationReviewBlocked`, `approvedSuccess`, `rejectedSuccess`;
  - `reviewConflictTitle`, `reviewConflictHelp`, `reviewConflictFindingAt`, `reviewConflictAssetUpdatedAt`, `reviewConfirmConflict`;
  - `freshness*`, `systemValue`, `foundValue`, `auditRound`, `actionOwner`, `noActionOwner`, `actionDueDate`, `openDisposalRequest`, `type_*`;
  - Task 3's `componentOfParent`, `openAsset`, `panelTitle`, `panelEmpty`, `panelNotFound`.
- Other namespaces:
  - `auditScan.fieldMismatch`, `auditScan.valueNotInList`;
  - `auditRound.differenceField_*`;
  - `common.noValue`, `common.error`; `common.validation.tooLong` (the box's length error).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-finding-review-panel-rules.test.ts tests/audit-finding-review-panel-ui.test.ts tests/audit-findings-page-data.test.ts tests/disposal-route-structure.test.ts tests/operational-return-navigation.test.ts tests/audit-mobile-flow-completion.test.ts tests/feedback-states-ui.test.ts tests/ui-overlay-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/thai-glossary.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-audit.test.ts && npx tsc --noEmit`
Expected: PASS.
- **`disposal-route-structure.test.ts:42-44` and `operational-return-navigation.test.ts:86-87`:** Task 3's `disposalHrefFor` stays on the page and keeps `/disposal/new?assetId=${finding.asset.id}&reason=` … `sourceType=audit_finding&sourceId=` and `auditFindingsReturnHref)`.
- **`audit-mobile-flow-completion.test.ts:39-50`:** `AuditFindingEvidenceList` stays on the page (`:45-49`); the attachment read is in Task 2's data module, where Task 2 moved its pins (`:42-44`).
- **`tests/audit-findings-page-ui.test.ts`** (Task 3's) fails only in its interim-body test until Step 6 deletes it; the panes test still finds `{panel}` in the pane, and the links test `disposalHrefFor`.
- **`feedback-states-ui.test.ts:197-206`:** the page has no `freshnessRefreshing`.
- **`ui-overlay-guards.test.ts:58-62`:** the actions file keeps `<AccessibleDialog` (the two dialogs) and no `fixed inset-0`. The panel and the decision open no overlay of their own (`AssetPhotoFrame`'s preview is the shared `AttachmentPreviewDialog`).
- **`list-frame-guards.test.ts`:**
  - LK1 and LS1: no local `Info` / `DetailItem` / `FindingComparison` / `Metric`;
  - LN2: no shared name;
  - LV2: no `"-"`;
  - LT5: no opacity.
- **`visual-foundation-guards.test.ts`:** R2 (no shadow), N3 (Buttons only), N4, N5.
- **`e2e-cross-cutting.test.ts:155`:** `REVIEW_BUTTON_NAMES` still equal th `approve` / `reject` / `actionPlan` / `closeFinding`.
- **`e2e-audit.test.ts:206-214`:** the spec text still holds `segregationReviewBlocked`. The walk itself is rewritten in Task 7.

- [ ] **Step 6: Rewrite these pins**

- **`tests/list-pages-ui.test.ts:257-287`** (the comment, `FINDING_REVIEW` and "the finding row triggers…") become:

  ```ts
  // Group 2 plan 4 (spec §10, Appendix A §10): the review decision moved into the review panel (audit-finding-decision.tsx);
  // this file keeps a finding's follow-up: "แผนแก้ไข" and "ปิดรายการไม่ตรง" as outline Buttons that mount their dialogs.
  const FINDING_FOLLOW_UP = `${C}audit/audit-finding-review-actions.tsx`

  test("the finding follow-up: แผนแก้ไข and ปิดรายการไม่ตรง are outline Buttons that mount their two dialogs; the review decision is no longer here (group 2 spec §10, Appendix A §10)", () => {
    const source = read(FINDING_FOLLOW_UP)
    assert.match(source, /export function AuditFindingFollowUpActions\(/)
    assert.match(source, /<Button variant="outline" size="md" onClick=\{\(\) => setPlanOpen\(true\)\}>\n\s+<CalendarClock aria-hidden="true" \/>\n\s+\{t\("actionPlan"\)\}/)
    assert.match(source, /\{actionStatus !== "closed" \? \(\n\s+<Button variant="outline" size="md" onClick=\{\(\) => setCloseOpen\(true\)\}>\n\s+<FileUp aria-hidden="true" \/>\n\s+\{t\("closeFinding"\)\}/)
    assert.equal(source.match(/<AccessibleDialog open title=\{t\("(?:actionPlanTitle|closeFindingTitle)"\)\} busy=\{saving\} size="md" onClose=\{onClose\}>/g)?.length, 2)
    assert.equal(source.match(/<AccessibleDialog\b/g)?.length, 2, "the action-plan and close dialogs stay; the decision has no dialog (group 2 spec §10)")
    assert.doesNotMatch(source, /ReviewDecisionModal|AuditFindingReviewActions|\bcompact\b|RowActions|stopPortalClick|returnFocusRef|segregationReviewBlocked/)
    assert.doesNotMatch(source, /<button\b|<Loader2\b|\btext-success\b|disabled:opacity-50/, "no hand-written trigger, spinner or green text is left")
  })
  ```

- **`tests/audit-pages-sweep-ui.test.ts:45-57`** becomes:

  ```ts
  test("finding follow-up and decision: the close count a muted line, the conflict a warning Notice with its dates in a KeyValueList, no typed dash (spec 2D D7, D19, LV2; group 2 spec §10)", () => {
    const actions = read(`${C}audit/audit-finding-review-actions.tsx`)
    assert.match(actions, /<p className="text-sm text-muted-foreground">\{t\("closureEvidenceCount", \{ count: uploadedCount \}\)\}<\/p>/)
    const decision = read(`${C}audit/audit-finding-decision.tsx`)
    assert.match(decision, /<Notice tone="warning" role="alert" title=\{t\("reviewConflictTitle"\)\}>\{t\("reviewConflictHelp"\)\}<\/Notice>/)
    assert.match(decision, /value: conflict\.findingReportedAt \? formatDateTime\(conflict\.findingReportedAt\) : null/)
    for (const source of [actions, decision]) {
      assert.doesNotMatch(source, /"-"|function (?:ReviewPreviewField|formatClientDateTime)\b|rounded-lg|border-warning-border|border-danger-border|bg-danger-soft|\btext-xs\b/)
    }
  })
  ```

- **`tests/audit-finding-resolution.test.ts`:**
  - `:22` → `assert.match(readFileSync("src/components/audit/audit-finding-review-panel.tsx", "utf8"), /<DataFreshnessBanner\b/)`. In Task 3's form of `:19-28` this is the test's first `assert.match(page, /DataFreshnessBanner/)`. The banner is in the panel now.
  - `:40-51` (master; `:39-50` after Task 3 drops `:6`): the whole test "audit finding review uses a decision modal with conflict guard", through its `})`, becomes:

    ```ts
    test("audit finding review decides in the panel with the conflict guard: a 409 warns and the next approve confirms it (group 2 spec §10)", () => {
      const decision = readFileSync("src/components/audit/audit-finding-decision.tsx", "utf8")
      const route = readFileSync("src/app/api/audit-findings/[id]/review/route.ts", "utf8")

      assert.match(decision, /reviewConflictTitle/)
      assert.match(decision, /action === "approve" && conflict !== null/)
      assert.match(decision, /confirmConflict/)
      assert.doesNotMatch(decision, /window\.prompt|AccessibleDialog/)
      assert.match(route, /hasAuditFindingConflict/)
      assert.match(route, /buildAuditFindingConflictPayload/)
      assert.match(route, /status: 409/)
    })
    ```

  - `:53-67` (master; `:52-66` after Task 3): the whole test "audit finding freshness and review modal copy is translated", through its `})`, becomes:

    ```ts
    test("audit finding freshness and review panel copy is translated; the decision dialog's words are gone (group 2 spec §10)", () => {
      const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
      const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

      for (const messages of [th, en]) {
        assert.equal(typeof messages.auditFinding.freshnessFreshTitle, "string")
        assert.equal(typeof messages.auditFinding.freshnessStaleTitle, "string")
        assert.equal(typeof messages.auditFinding.freshnessRefresh, "string")
        assert.equal(typeof messages.auditFinding.reviewConflictTitle, "string")
        assert.equal(typeof messages.auditFinding.reviewConfirmConflict, "string")
        assert.equal(typeof messages.auditFinding.reviewReasonLabel, "string")
        assert.equal(typeof messages.auditFinding.effectChange, "string")
        assert.equal(messages.auditFinding.reviewDecisionTitle_approve, undefined)
        assert.equal(messages.auditFinding.reviewDecisionHelp_approve, undefined)
      }
    })
    ```

- **`tests/v-track2-u.test.ts:134-170`** become:

  ```ts
  test("finding dialogs: action plan and close are forms that validate themselves, close waits for evidence with its reason beside the button, and the panel's reason box is required to reject (v-track U4; group 2 spec §10, decision 5)", () => {
    const source = read(`${C}audit-finding-review-actions.tsx`)
    // Two dialogs, two tables; the decision moved to the review panel.
    assertMigratedForm(source, {
      ids: { actionPlan: "audit-plan-action-plan", actionDueDate: "audit-plan-due-date", actionStatus: "audit-plan-status" },
      table: "PLAN_FIELD_IDS",
    })
    assertMigratedForm(source, { ids: { closureRemark: "audit-close-remark" }, table: "CLOSE_FIELD_IDS" })
    assert.equal(source.match(/<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/g)?.length, 2)
    const rules = validateBody(source)
    for (const rule of [
      'if (values.actionPlan !== undefined) check("actionPlan", required(values.actionPlan) ?? maxLength(values.actionPlan, 4000))',
      'if (values.closureRemark !== undefined) check("closureRemark", maxLength(values.closureRemark, 4000))',
    ]) assert.ok(rules.includes(rule), rule)
    assert.doesNotMatch(rules, /reviewRemark/)
    for (const call of ["validate({ actionPlan: values.actionPlan })", "validate({ closureRemark })"]) {
      assert.ok(source.includes(`fieldErrors.setErrors(${call})`), call)
    }
    assert.doesNotMatch(source, /onClick=\{\(\) => submit\(|onClick=\{closeFinding\}/)
    // The plan's fields clear their own error when they change.
    assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+if \(field in PLAN_FIELD_IDS\) fieldErrors\.clear\(field as PlanField\)/)
    // Close: the evidence is a prerequisite (spec §4.4): the gate returns first, the button stays focusable with its reason.
    assert.match(source, /const needsEvidence = uploadedCount === 0/)
    assert.match(source, /event\.preventDefault\(\)\n\s+if \(needsEvidence\) return\n\s+fieldErrors\.setErrors\(validate\(\{ closureRemark \}\)\)/)
    // The reason is the body's last line, right above the footer, which holds only buttons (FMG GD3).
    assert.match(source, /\{needsEvidence \? <p id="audit-close-reason" className="text-meta text-muted-foreground">\{t\("closeNeedsEvidence"\)\}<\/p> : null\}\n\s+<\/AccessibleDialogBody>/)
    assert.match(source, /<Button\n\s+type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{needsEvidence \|\| undefined\}\n\s+aria-describedby=\{needsEvidence \? "audit-close-reason" : undefined\}\n\s+>/)
    assert.doesNotMatch(source, /disabled=\{uploadedCount === 0\}/)
    // The panel's decision: no <form> (two commands share one box), its own validate() with the reject rule (decision 5),
    // the server's fieldErrors under the box, focus on the box.
    const decision = read(`${C}audit-finding-decision.tsx`)
    // messages: [] — a reject's "required" shows the panel's own sentence (P4-R27), so the box has no plain
    // fieldErrors.message("reviewRemark"); its error is checked on its own below, as round cancel's is (U2).
    assertMigratedForm(decision, { ids: { reviewRemark: "audit-review-reason" }, formless: true, messages: [] })
    assert.ok(validateBody(decision).includes('check("reviewRemark", (values.action === "reject" ? required(values.reviewRemark) : null) ?? maxLength(values.reviewRemark, 4000))'))
    assert.ok(decision.includes("fieldErrors.setErrors(validate({ action, reviewRemark }))"))
    assert.ok(decision.includes('fieldErrors.setErrors(validate({ action: "approve", reviewRemark }))'))
    assert.ok(decision.includes('error={fieldErrors.errors.reviewRemark === "required" ? t("reviewReasonRequired") : fieldErrors.message("reviewRemark")}'), "the reject's own sentence under the box (P4-R27)")
    const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
    const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
    assert.equal(th.auditFinding.closeNeedsEvidence, "ยังไม่มีหลักฐานปิดงาน ต้องแนบหลักฐานอย่างน้อย 1 ไฟล์ก่อนจึงจะปิดรายการไม่ตรงได้")
    assert.equal(en.auditFinding.closeNeedsEvidence, "No closure evidence yet. Attach at least one file before you close this discrepancy.")
  })
  ```

- **`tests/validation-guards.test.ts`:**
  - `:34` → `[`${C}audit/audit-finding-review-actions.tsx`]: 2,`, with a new row right after it: `[`${C}audit/audit-finding-decision.tsx`]: 1,`. The sum stays 51 (`:186`): the decision moved from one file to the other.
  - In `V_FORMS`, after `:111` (`${C}audit/audit-finding-review-actions.tsx`), add `` `${C}audit/audit-finding-decision.tsx`, ``.
- **`tests/form-migration-guards.test.ts:94`** → `[`${C}audit/audit-finding-review-actions.tsx`]: [1, 2, 0],`, with a new row right after it: `[`${C}audit/audit-finding-decision.tsx`]: [0, 1, 0],`. The review remark's `maxLength` moved with its box, so it never disappears quietly (GF5).
- **`tests/e2e-fixes.test.ts:250-258`** (master; `:250-259` in Task 3's form): the whole test "the findings page offers the review controls only to a role with audit:approve (e2e decision DX3 (ก): M4)", from its `test(` line through its closing `})`, becomes:

  ```ts
  test("the findings panel offers the review controls only to a role with audit:approve (e2e decision DX3 (ก): M4; group 2 plan 4)", () => {
    const rules = read("src/lib/audit-finding-review-panel-rules.ts")
    const panel = read("src/components/audit/audit-finding-review-panel.tsx")
    const page = read("src/app/[locale]/(dashboard)/audit/findings/page.tsx")
    // The gate reads audit:approve first, as the review route checks it before anything else; plan and close follow it.
    assert.match(rules, /if \(!input\.canApprove\) return \{ decide: "noPermission", followUp: false \}/)
    assert.match(panel, /\{gate\.decide === "noPermission" \? null : \(\n\s*<AuditFindingDecision\b/)
    assert.match(panel, /\{gate\.followUp \? \(\n\s*<AuditFindingFollowUpActions\b/)
    assert.match(page, /canApprove=\{canApprove\}/)
    assert.doesNotMatch(page, /<AuditFindingReviewActions\b|canEdit \|\| canApprove/)
    assert.ok(!read("e2e/cross-cutting/roles.spec.ts").includes(`test.fail(true, "M4: `))
  })
  ```

- **`tests/audit-findings-page-ui.test.ts`** (Task 3's): the test "until Task 4 the panel slot holds today's facts, badges, evidence, the asset and disposal links, and the review actions for audit:approve alone" goes whole, with the comment above it. Its other tests hold: the pane still renders `{panel}`, and `disposalHrefFor` stays on the page. Task 3's `tests/list-pages-ui.test.ts` and `tests/audit-pages-sweep-ui.test.ts` forms read no interim line, so they hold too.

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. A pin that fails outside the lists above is rewritten in this commit and named in the report.

- [ ] **Step 8: Commit**

```bash
git add src/lib/audit-finding-review-panel-rules.ts src/components/audit/audit-finding-review-panel.tsx src/components/audit/audit-finding-decision.tsx src/components/audit/audit-finding-review-actions.tsx "src/app/[locale]/(dashboard)/audit/findings/page.tsx" DESIGN.md messages/th.json messages/en.json tests/audit-finding-review-panel-rules.test.ts tests/audit-finding-review-panel-ui.test.ts tests/audit-findings-page-ui.test.ts tests/list-pages-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-finding-resolution.test.ts tests/v-track2-u.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/e2e-fixes.test.ts
git commit -m "feat(audit-findings): the review panel shows the chosen finding from the page data with its asset (ส่วนควบของ <parent> for a component), the four-field comparison with the different fields marked, the photo, remark and who checked it where, and what approve does to the register (ไม่พบ only that the register stays); approve and reject take effect at once with k จาก N and move to the server's next finding, a reject needs a reason (กรุณาระบุเหตุผลการปฏิเสธ under the box), a 409 warns in the panel until the second press, อนุมัติทุกช่องของทรัพย์สินนี้ sends one review per finding and reports what failed in the panel, and the follow-up section keeps the plan, close, evidence and disposal request, all behind audit:approve, the reporter rule and an open round; the decision dialog's pins move with it (group 2 plan 4 task 4, P4-R18, P4-R20, P4-R22 to P4-R24, P4-R27)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `DesktopSelectionBar` and deciding several at once (ticks, one shared reason, a result report, bugs 17-18)

This task replaces today's batch panel (`AuditFindingsBatchActions`, a `ContentPanel` of checkbox `ChoiceCard`s above the table) with ticks in the table and a sticky bar:

1. **`DesktopSelectionBar`** is a new shared part (P4-R15). It reads "N รายการที่เลือก · ล้าง · <actions>".
   - It is sticky, never `fixed`, and flat: a top line on the canvas, no shadow. Below `lg` it sits above the Mobile Field Navigation, which a list page keeps (P4-R35).
   - It is desktop only (P4-R26): it shows from `md`, with the table, because the phone list is cards and cards take no ticks. The phone decides one finding at a time in the full-screen panel (Task 4).
   - It always renders a polite status line, so a batch's progress and its result are each read once.
   - It gets a DESIGN.md section and a docs/14 row, and it joins the guard lists `UI_NAME` and `OWNERS.LN2`.
2. **Ticks** (a new first column of Task 3's table, for `audit:approve` only).
   - Each row the viewer may decide has a tick: Task 2's `row.reviewable` (pending, not reported by the viewer, on a round that is not closed or cancelled: the review route's own refusals, P4-R20).
   - The header tick takes every such row on the page, and shows the mixed state while only some are ticked.
   - A row the viewer reported has no tick. The panel says why (Task 4).
   - The selection lives in a client provider that the page mounts with `key={selectionKey}` (Task 3's), so another page or filter starts empty (DESIGN.md:622).
   - Opening a row in the panel (`?finding=`) keeps the ticks, because `finding` is not part of `selectionKey`.
3. **Deciding several.**
   - Two buttons: "ปฏิเสธที่เลือก" and "อนุมัติที่เลือก N รายการ".
   - Each opens the shared `ConfirmTextDialog` once before anything is sent (P4-R25: a batch changes many register fields). Reject asks for one shared reason, which is **required** (decision 5): an empty reason shows "กรุณาระบุเหตุผลการปฏิเสธ" (Task 4's `reviewReasonRequired`, P4-R27) under the field and focus moves to it. Approve takes an optional remark, as today's batch does. The panel's own approve / reject has no dialog (Task 4).
   - The dialog closes, and the batch runs the reviews one at a time through Task 1's classifier, using the pure runner `runAuditFindingBatchReview`:
     - it never stops at a failure (bug 17);
     - it never sends `confirmConflict`, so a 409 is skipped and reported as "decide it in the panel" (bug 18);
     - a network error fails only that finding.
   - The bar shows progress, then "สำเร็จ X · ไม่สำเร็จ Y" with one line per failure and its reason, in Task 4's words (`reviewResultSummary`, `reviewFailure_<reason>`), so the bar and the panel say the same. An `assetChanged` failure links to that finding in the panel.
   - Then the selection clears and the page refreshes, whatever answered.
   - The result survives that refresh. When a batch empties the last page past page 1, Task 3's redirect sends the page to the last page, and Next's `RedirectBoundary` unmounts everything page.tsx renders. So the report lives in `AuditFindingsBatchReportProvider`, which a new `audit/findings/layout.tsx` mounts above the page, and the bar shows it for its own tab and filter only (`filterKey`, P4-R34).
   - Opening another tab or filter forgets it, so coming back shows none. It takes focus once, when it first shows; another page of the filter or the redirect takes it again only when the remount dropped focus to the body (P4-R34).
   - There is no toast.
4. **`ConfirmTextDialog`** gains `required`, `error`, `inputId` and `onValueChange`. The batch keeps the shared dialog, so the V-track lists stay true as they are: `V_SCOPE` still counts the batch file's one form, and `NOT_IN_SCOPE` still names it as the dialog's caller (`tests/validation-guards.test.ts:35`, `:68`, `:112`). The batch's own UI pins (`tests/v-track2-u.test.ts:172-196`) are this task's to rewrite (P4-R22).

**Files:**
- Create:
  - `src/components/ui/desktop-selection-bar.tsx` (the shared bar, server-safe);
  - `src/lib/audit-finding-batch-review.ts` (pure: the runner and the selection helpers);
  - `src/app/[locale]/(dashboard)/audit/findings/layout.tsx` (a server file that mounts the client `AuditFindingsBatchReportProvider` above the page, P4-R34).
- Rewrite: `src/components/audit/audit-findings-batch-actions.tsx`. It keeps its path (V_SCOPE, NOT_IN_SCOPE, V_FORMS) and now holds the provider, the two ticks, the bar and its dialog; the stale comment at master `:20-22` goes with it.
- Modify: `src/components/ui/confirm-text-dialog.tsx`:
  - `:17-31` (the props);
  - `:54-91` (the form: `Field` with `required` and `error`, the textarea's `id`, `required` and `onChange`).
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx`. Blocks by content (after Tasks 2-4):
  - the `AuditFindingsBatchActions` import;
  - Task 3's `batchReviewFindings`;
  - Task 3's batch panel mount `{canApprove ? <AuditFindingsBatchActions key={selectionKey} … /> : null}` in the list pane;
  - the list pane's content (the provider and the bar);
  - Task 3's table: the tick column (its `col`, head cell and row cell) and the empty row's `colSpan` (`minWidth` stays 520, P4-R36).
- Modify: `DESIGN.md`:
  - `:622` (the last sentence: who takes `selectionKey`);
  - a new **`DesktopSelectionBar`** block before `:630` (**Asset register pattern**).
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md`: a new row after `:98` (`StickyFormFooter`).
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`).
- Test:
  - new:
    - `tests/audit-finding-batch-review.test.ts` (pure, by value);
    - `tests/desktop-selection-bar.test.ts` (the part, its docs, the guard lists);
    - `tests/audit-findings-selection-ui.test.ts` (the client file, the page wiring, the words by value);
  - pins rewritten:
    - `tests/list-frame-guards.test.ts:67`, `:130-132`;
    - `tests/visual-foundation-guards.test.ts:102`;
    - `tests/list-pages-ui.test.ts:246-255`, and `:303` in Task 3's form;
    - `tests/audit-findings-page-ui.test.ts` (Task 3's table test: the heads, the `colgroup` and the empty row's `colSpan`);
    - `tests/audit-pages-sweep-ui.test.ts:59-66`;
    - `tests/confirm-text-dialog-ui.test.ts:30`, `:36-40`;
    - `tests/v-track2-u.test.ts:172-196` (P4-R22);
    - `tests/form-migration-guards.test.ts`: a `CONSTRAINT_FLOORS` row for the shared confirm dialog (GF5).

**Interfaces:**
- Consumes:
  - **Task 1** (`src/lib/audit-finding-review-results.ts`, pure):
    - `classifyAuditFindingReviewResponse(status: number, body: unknown): AuditFindingReviewOutcome`, where `AuditFindingReviewOutcome = { ok: true } | { ok: false; reason: AuditFindingReviewFailureReason }`;
    - `AuditFindingReviewFailureReason = "assetChanged" | "alreadyDecided" | "ownFinding" | "reasonRequired" | "roundReadOnly" | "notFound" | "failed"` (the list `auditFindingReviewFailureReasons`);
    - `foldAuditFindingBatchResults(results: readonly { id: string; outcome: AuditFindingReviewOutcome }[]): AuditFindingBatchResult` (`{ succeeded: string[]; failed: { id: string; reason: AuditFindingReviewFailureReason }[] }`).
    - The classifier maps the route's real bodies:
      - `409` + `code: "asset_updated_after_finding"` → `assetChanged`;
      - `400` "Audit finding has already been reviewed" → `alreadyDecided` (Task 1's `updateMany` guard answers the same);
      - `403` `findingReviewerIsReporter` → `ownFinding`;
      - `400` `VALIDATION_FAILED` with `fieldErrors.reviewRemark: "required"` → `reasonRequired`.
  - **Task 1's schema:** reject's `reviewRemark` is `z.string().trim().min(1).max(4000)`, and approve's is optional, at most 4,000 characters. The dialog's `validate()` restates both.
  - **Task 2** (page data, P4-R20): `data.rows: AuditFindingsPageRow[]`, each with `id`, `findingType`, `reviewable` (the review route's own rule, `auditFindingReviewableWhere`), `asset?.assetTag` and `auditRound.auditNo`.
  - **Task 3** (the page):
    - the two-pane layout. The list pane (`[data-audit-findings-list]`) holds the table panel and its `Pagination`, and sets no `overflow` (an `overflow-*` ancestor would stop the bar sticking to `main`);
    - the table, to which this task adds the tick column first, for `canApprove` only: `{canApprove ? <col className="w-11" /> : null}`, a first `DataTableHead` and a first `DataTableCell` per row, and `TableEmptyRow colSpan={canApprove ? 5 : 4}`; `minWidth={520}` stays (P4-R36);
    - `topicLabel(findingType)`: the เรื่อง short word (P4-R2);
    - `findingHref(id)`: the row's panel href (`?finding=<id>` with the filters and page kept);
    - `selectionKey`, which keeps the page, page size, status, search, round and type, **and not `finding`**.
  - **Task 4** (words, one set for one finding and for several): `auditFinding.reviewReasonRequired` ("กรุณาระบุเหตุผลการปฏิเสธ", P4-R27), `auditFinding.reviewResultSummary` ("สำเร็จ {succeeded} · ไม่สำเร็จ {failed}") and `auditFinding.reviewFailure_<reason>` for the seven reasons. This task adds none of them again.
  - `required`, `maxLength` (`src/lib/validation-rules.ts:23`, `:36`);
  - `useFieldErrors` (`src/components/ui/use-field-errors.ts:51`);
  - `checkboxVariants()` (`src/components/ui/field-variants.ts:54`);
  - `Button` (`busy`, `ref` as a prop in React 19, `src/components/ui/button.tsx:33-64`);
  - `linkVariants({ size: "inherit" })` (`src/components/ui/button-variants.ts:51`);
  - `formatCount` (`src/lib/display-format.ts:15`).
- Produces:
  - `src/components/ui/desktop-selection-bar.tsx`:

    ```ts
    export type DesktopSelectionBarProps = {
      label: string
      countLabel: string | null
      clearLabel: string
      onClear: () => void
      clearDisabled?: boolean
      actions?: React.ReactNode
      status?: React.ReactNode
      className?: string
      children?: React.ReactNode
    }
    export function DesktopSelectionBar(props: DesktopSelectionBarProps): React.JSX.Element
    ```
  - `src/lib/audit-finding-batch-review.ts`:

    ```ts
    export type AuditFindingBatchReviewBody = { action: "approve" | "reject"; reviewRemark: string }
    export type AuditFindingReviewSend = (findingId: string, body: AuditFindingBatchReviewBody) => Promise<{ status: number; body: unknown }>
    export function runAuditFindingBatchReview(findingIds: readonly string[], body: AuditFindingBatchReviewBody, send: AuditFindingReviewSend, onProgress?: (done: number) => void): Promise<AuditFindingBatchResult>
    export type AuditFindingSelectAllState = "none" | "some" | "all"
    export function auditFindingSelectAllState(selectedIds: readonly string[], tickableIds: readonly string[]): AuditFindingSelectAllState
    export function toggleAuditFindingSelection(selected: ReadonlySet<string>, id: string): Set<string>
    export function toggleAllAuditFindings(selected: ReadonlySet<string>, tickableIds: readonly string[]): Set<string>
    ```
    Which rows take a tick is Task 2's `row.reviewable`; this file adds no second rule for it.
  - `src/components/audit/audit-findings-batch-actions.tsx` ("use client"):
    - `export type AuditFindingSelectable = { id: string; code: string; topic: string; panelHref: string }`;
    - `AuditFindingsBatchReportProvider({ children })` (the layout's: the last batch result, above the page, P4-R34);
    - `AuditFindingsSelectionProvider({ filterKey, findings, children })`;
    - `AuditFindingSelectAllTick()`;
    - `AuditFindingSelectTick({ findingId })`;
    - `AuditFindingsSelectionBar()`.
    - `AuditFindingsBatchActions` is gone.
  - `ConfirmTextDialog` gains four optional props: `required?: boolean`, `error?: ReactNode`, `inputId?: string` and `onValueChange?: (value: string) => void`.
  - The markup Task 7's E2E stands on (th, the desktop project only, since the phone shows no ticks, P4-R26):
    - the row tick is `getByRole("checkbox", { name: "เลือก <asset tag> <เรื่อง word>" })`, for example "เลือก RUN-DL-A2 แผนก", inside `tbody tr[data-audit-finding-row]`;
    - the header tick is `getByRole("checkbox", { name: "เลือกทุกรายการที่พิจารณาได้ในหน้านี้" })` (`auditFinding.selectAllOnPage`), in the table head;
    - the bar is `[data-slot="desktop-selection-bar"]`, `getByRole("group", { name: "รายการที่เลือก" })`. It is not rendered while nothing is ticked and no result shows. It holds:
      - "2 รายการที่เลือก";
      - the buttons "ล้าง", "ปฏิเสธที่เลือก" and "อนุมัติที่เลือก 2 รายการ";
    - the reject dialog:
      - its title is "ปฏิเสธ 2 รายการที่เลือก";
      - its field is "เหตุผล", required;
      - its submit is "ปฏิเสธ 2 รายการ";
      - an empty reason shows "กรุณาระบุเหตุผลการปฏิเสธ" under the field, and focus moves into it;
    - the approve dialog (P4-R25):
      - its title is "อนุมัติ 2 รายการที่เลือก";
      - its field is "หมายเหตุ (ไม่บังคับ)";
      - its submit is "อนุมัติ 2 รายการ";
    - after the batch, the bar's `getByRole("status")` reads "สำเร็จ 1 · ไม่สำเร็จ 1" (Task 4's `reviewResultSummary`);
    - each failure is one list item of the bar, for example "<tag> <เรื่อง word>: มีการพิจารณารายการนี้แล้ว" (Task 4's `reviewFailure_alreadyDecided`);
    - an `assetChanged` item adds the link "เปิดในแผงพิจารณา";
    - the bar's last control is "ปิดผลการพิจารณา", which takes focus once, when the result first shows; pressing it hides the bar once nothing is ticked.
  - M4 and M5 still hold: none of these controls renders without `audit:approve` (the page mounts no tick column and no bar for that role). Their names are not in `REVIEW_BUTTON_NAMES` (`e2e/cross-cutting/support/refusals.ts:107`) in any case.
- E2E is not run in this task.

- [ ] **Step 1: Write the failing tests**

`tests/audit-finding-batch-review.test.ts` (new):

```ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  auditFindingSelectAllState,
  runAuditFindingBatchReview,
  toggleAllAuditFindings,
  toggleAuditFindingSelection,
  type AuditFindingBatchReviewBody,
} from "../src/lib/audit-finding-batch-review.ts"

// Group 2 plan 4 Task 5 (spec §10 "Batch results", bugs 17-18, decision 5, P4-R4): the batch is a client loop over the
// one review route. It goes past every failure, sends one review at a time, never confirms a conflict, and reports each
// finding through Task 1's classifier. The answers below are the review route's own bodies (review/route.ts:115, :118,
// :133-142).
const OK = { status: 200, body: { id: "x", reviewStatus: "approved" } }
const ALREADY_DECIDED = { status: 400, body: { error: "Audit finding has already been reviewed" } }
const ASSET_CHANGED = { status: 409, body: { code: "asset_updated_after_finding", error: "Asset data changed after this audit finding was reported" } }

function fakeSend(answers: Record<string, { status: number; body: unknown } | Error>) {
  const sent: Array<{ id: string; body: AuditFindingBatchReviewBody }> = []
  let inFlight = 0
  let maxInFlight = 0
  const send = async (id: string, body: AuditFindingBatchReviewBody) => {
    sent.push({ id, body })
    inFlight += 1
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 1))
    inFlight -= 1
    const answer = answers[id] ?? OK
    if (answer instanceof Error) throw answer
    return answer
  }
  return { send, sent, maxInFlight: () => maxInFlight }
}

test("bug 17: the batch goes past a failure, in page order and one at a time, and reports each finding", async () => {
  const fake = fakeSend({ b: ALREADY_DECIDED })
  const result = await runAuditFindingBatchReview(["a", "b", "c"], { action: "approve", reviewRemark: "" }, fake.send)
  assert.deepEqual(result, { succeeded: ["a", "c"], failed: [{ id: "b", reason: "alreadyDecided" }] })
  assert.deepEqual(fake.sent.map((entry) => entry.id), ["a", "b", "c"])
  assert.equal(fake.maxInFlight(), 1, "one review at a time")
})

test("bug 18: a 409 skips that finding for the panel and the rest still run; a batch never confirms a conflict", async () => {
  const fake = fakeSend({ b: ASSET_CHANGED })
  const result = await runAuditFindingBatchReview(["a", "b", "c"], { action: "reject", reviewRemark: "ตรวจซ้ำแล้วถูกต้อง" }, fake.send)
  assert.deepEqual(result, { succeeded: ["a", "c"], failed: [{ id: "b", reason: "assetChanged" }] })
  for (const entry of fake.sent) {
    assert.deepEqual(entry.body, { action: "reject", reviewRemark: "ตรวจซ้ำแล้วถูกต้อง" }, "one shared reason, as typed")
    assert.equal(Object.hasOwn(entry.body, "confirmConflict"), false)
  }
})

test("a network error fails that finding only; progress counts each answer once", async () => {
  const progress: number[] = []
  const fake = fakeSend({ a: new TypeError("Failed to fetch") })
  const result = await runAuditFindingBatchReview(["a", "b"], { action: "approve", reviewRemark: "" }, fake.send, (done) => progress.push(done))
  assert.deepEqual(result, { succeeded: ["b"], failed: [{ id: "a", reason: "failed" }] })
  assert.deepEqual(progress, [1, 2])
  assert.deepEqual(await runAuditFindingBatchReview([], { action: "approve", reviewRemark: "" }, fake.send), { succeeded: [], failed: [] })
})

// Which rows take a tick is Task 2's row.reviewable (the review route's own refusals), tested by value in
// tests/audit-findings-page-data.test.ts: a pending finding the viewer did not report, on a round still open.

test("the header tick reads none, some or all of the page's tickable rows, and ticks them all or clears them", () => {
  assert.equal(auditFindingSelectAllState([], ["a", "b"]), "none")
  assert.equal(auditFindingSelectAllState(["a"], ["a", "b"]), "some")
  assert.equal(auditFindingSelectAllState(["a", "b"], ["a", "b"]), "all")
  assert.equal(auditFindingSelectAllState([], []), "none")
  assert.deepEqual([...toggleAllAuditFindings(new Set(["a"]), ["a", "b"])], ["a", "b"])
  assert.deepEqual([...toggleAllAuditFindings(new Set(["a", "b"]), ["a", "b"])], [])
  assert.deepEqual([...toggleAllAuditFindings(new Set(), [])], [])
  assert.deepEqual([...toggleAuditFindingSelection(new Set(["a"]), "b")], ["a", "b"])
  assert.deepEqual([...toggleAuditFindingSelection(new Set(["a", "b"]), "a")], ["b"])
  const before = new Set(["a"])
  toggleAuditFindingSelection(before, "b")
  assert.deepEqual([...before], ["a"], "a new set; the state is never changed in place")
})
```

`tests/desktop-selection-bar.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 4 Task 5 (spec §10, P4-R15): DesktopSelectionBar, the bar of a desktop list whose rows take ticks.
// Server-safe (no directive, no hook): its client caller passes the handlers. Sources read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PART = "src/components/ui/desktop-selection-bar.tsx"

test("DesktopSelectionBar: one flat sticky bar from md, never fixed and never lifted (P4-R15)", () => {
  const source = read(PART)
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|LayoutEffect|Context|Ref)\b/)
  assert.match(source, /role="group"\n\s+aria-label=\{label\}\n\s+data-slot="desktop-selection-bar"\n\s+className=\{cn\("sticky bottom-\[calc\(3\.75rem\+env\(safe-area-inset-bottom\)\)\] z-30 hidden min-w-0 flex-col gap-2 border-t border-border bg-canvas py-3 md:flex lg:-bottom-6", className\)\}/)
  assert.doesNotMatch(source, /\bfixed\b|\bshadow-|backdrop-blur|bg-canvas\/|bg-surface\/|\bdark:|<button\b/)
})

test("DesktopSelectionBar: the count, ล้าง, then the actions with the primary last; a status line that is always there", () => {
  const source = read(PART)
  assert.match(source, /\{countLabel \? \(\n\s+<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">\n\s+<span className="text-sm font-medium text-foreground">\{countLabel\}<\/span>\n\s+<Button variant="ghost" size="md" onClick=\{onClear\} disabled=\{clearDisabled\}>\n\s+\{clearLabel\}\n\s+<\/Button>\n\s+\{actions \? <div className="ml-auto flex flex-wrap items-center justify-end gap-2">\{actions\}<\/div> : null\}/)
  // A live region added together with its text is not read: the line is always rendered, hidden while it is empty.
  assert.match(source, /<p role="status" className=\{cn\("text-meta text-muted-foreground", !status && "sr-only"\)\}>\{status\}<\/p>\n\s+\{children\}/)
  assert.match(source, /^export type DesktopSelectionBarProps = \{\n  label: string\n  countLabel: string \| null\n  clearLabel: string\n  onClear: \(\) => void\n  clearDisabled\?: boolean\n  actions\?: React\.ReactNode\n  status\?: React\.ReactNode\n  className\?: string\n  children\?: React\.ReactNode\n\}$/m)
})

test("DESIGN.md and docs/14 describe DesktopSelectionBar, and the guards know it as a shared part (P4-R15)", () => {
  const design = read("DESIGN.md")
  const block = design.slice(design.indexOf("**`DesktopSelectionBar`**"), design.indexOf("**Asset register pattern (2026-10-07).**"))
  assert.ok(block.length > 0 && design.indexOf("**`DesktopSelectionBar`**") > design.indexOf("- **`RowActions`**"), "a Data Tables block after RowActions")
  for (const phrase of [
    "`src/components/ui/desktop-selection-bar.tsx`",
    "`lg:-bottom-6`",
    "above the Mobile Field Navigation",
    "never `fixed`",
    "`hidden md:flex`",
    "a `border-t` on `bg-canvas`, no shadow",
    "`role=\"status\"`",
    "`checkboxVariants()`",
    "`data-no-row-click`",
    "takes `selectionKey` as its `key`",
  ]) assert.ok(block.includes(phrase), phrase)
  assert.ok(design.includes("(the disposal providers take `selectionKey`, the findings selection provider takes it as its `key`)."), "DESIGN.md:622")
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = index.slice(index.indexOf("\n| The ticked rows of a desktop list and what to do with them | `DesktopSelectionBar` |"), index.indexOf("\n| A phone action bar on a detail page |"))
  assert.ok(row.length > 0 && index.indexOf("`DesktopSelectionBar`") > index.indexOf("| A save bar for a long form |"), "docs/14: the row follows StickyFormFooter")
  for (const phrase of ["from `md` only", "never `fixed`", "the primary last", "`status`"]) assert.ok(row.includes(phrase), phrase)
  const guards = read("tests/list-frame-guards.test.ts")
  assert.match(guards, /const UI_NAME = \/\\bfunction \(\?:[^/]*\|DesktopSelectionBar\)\\b\/g/)
  assert.match(guards, /"desktop-selection-bar", "empty-note"/)
  assert.match(read("tests/visual-foundation-guards.test.ts"), /for \(const path of \["src\/components\/ui\/action-bar\.tsx", "src\/components\/ui\/desktop-selection-bar\.tsx"\]\)/)
})
```

`tests/audit-findings-selection-ui.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 4 Task 5 (spec §10 "Several at once", decision 5, bugs 17-18): ticks in the findings table, one shared
// reason to reject, a result report in the bar, a refresh after every batch. Sources read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const BATCH = "src/components/audit/audit-findings-batch-actions.tsx"
const PAGE = "src/app/[locale]/(dashboard)/audit/findings/page.tsx"

test("the selection: a provider of the page's tickable rows; only rows still tickable count; nothing changes while a batch runs; the last result is its own tab and filter's, and another tab or filter forgets it (P4-R34)", () => {
  const source = read(BATCH)
  assert.match(source, /^"use client"$/m)
  assert.match(source, /^export function AuditFindingsSelectionProvider\(\{ filterKey, findings, children \}: \{ filterKey: string; findings: readonly AuditFindingSelectable\[\]; children: ReactNode \}\) \{$/m)
  assert.match(source, /^type StoredBatchReport = \{ filterKey: string; report: BatchReport; focused: boolean \}$/m)
  assert.match(source, /const stored = reportStore\.stored\?\.filterKey === filterKey \? reportStore\.stored : null\n\s+const report = stored\?\.report \?\? null/, "the result is kept above the page, for its own tab and filter (P4-R34)")
  assert.match(source, /const setReport = \(next: BatchReport \| null\) => setStored\(next \? \{ filterKey, report: next, focused: false \} : null\)/)
  assert.match(source, /useEffect\(\(\) => \{\n\s+setStored\(\(current\) => \(current && current\.filterKey !== filterKey \? null : current\)\)\n\s+\}, \[setStored, filterKey\]\)/, "another tab or filter forgets the result, so coming back shows none; the same filterKey keeps it through the redirect to the last page (P4-R34)")
  assert.match(source, /const selectedIds = useMemo\(\(\) => tickableIds\.filter\(\(id\) => selected\.has\(id\)\), \[tickableIds, selected\]\)/)
  assert.match(source, /function toggle\(id: string\) \{\n\s+if \(runningRef\.current\) return\n\s+setReport\(null\)\n\s+setSelected\(\(current\) => toggleAuditFindingSelection\(current, id\)\)/)
  assert.match(source, /function toggleAll\(\) \{\n\s+if \(runningRef\.current\) return\n\s+setReport\(null\)\n\s+setSelected\(\(current\) => toggleAllAuditFindings\(current, tickableIds\)\)/)
  assert.doesNotMatch(source, /AuditFindingsBatchActions|<ChoiceCard|<ContentPanel|selectAllPending|batchNeedsSelection/, "today's batch panel is gone")
})

test("ticks: native checkboxes in a 44px label that the row's click ignores; the header tick shows the mixed state and owns its input; no ref travels in the context", () => {
  const source = read(BATCH)
  assert.match(source, /<label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center">\n\s+<input\n\s+type="checkbox"\n\s+checked=\{selection\.isSelected\(findingId\)\}\n\s+onChange=\{\(\) => selection\.toggle\(findingId\)\}\n\s+disabled=\{selection\.running !== null\}\n\s+aria-label=\{t\("selectFinding", \{ name: `\$\{finding\.code\} \$\{finding\.topic\}` \}\)\}\n\s+className=\{checkboxVariants\(\)\}/)
  // react-hooks/refs (npm run lint): a ref in the context makes every read of it a ref read during render.
  const context = source.slice(source.indexOf("type SelectionContextValue = {"), source.indexOf("const AuditFindingsSelectionContext"))
  assert.ok(context.length > 0)
  assert.doesNotMatch(context, /RefObject|Ref\??:/, "no ref travels in the context: each component owns its element")
  assert.match(source, /const ref = useRef<HTMLInputElement \| null>\(null\)\n\s+useEffect\(\(\) => \{\n\s+if \(ref\.current\) ref\.current\.indeterminate = state === "some"\n\s+\}, \[state\]\)/, "the header tick owns its input")
  assert.match(source, /useEffect\(\(\) => \{\n\s+if \(selectAllFocusRequest > 0\) ref\.current\?\.focus\(\)\n\s+\}, \[selectAllFocusRequest\]\)/)
  assert.match(source, /function dismissReport\(\) \{\n\s+setReport\(null\)\n\s+if \(tickableIds\.length > 0\) setSelectAllFocusRequest\(\(count\) => count \+ 1\)\n\s+else document\.getElementById\("main"\)\?\.focus\(\)\n\s+\}/, "closing the result asks the header tick for focus as state, or focuses main when no row is left to tick")
  assert.match(source, /checked=\{state === "all"\}\n\s+onChange=\{selection\.toggleAll\}/)
  assert.match(source, /aria-label=\{t\("selectAllOnPage"\)\}/)
  assert.match(source, /if \(selection\.tickableIds\.length === 0\) return <span className="sr-only">\{t\("selectColumn"\)\}<\/span>/, "the head cell never stays empty")
})

test("decision 5: one shared reason, required to reject and checked before any request, in Task 4's words; approving takes an optional remark in the same one dialog (P4-R25, P4-R27)", () => {
  const source = read(BATCH)
  assert.match(source, /const FIELD_IDS = \{\n  reviewRemark: "audit-batch-review-remark",\n\} as const/)
  assert.match(source, /check\("reviewRemark", values\.action === "reject" \? \(required\(values\.reviewRemark\) \?\? maxLength\(values\.reviewRemark, 4000\)\) : maxLength\(values\.reviewRemark, 4000\)\)/)
  assert.match(source, /function confirm\(action: BatchAction, reviewRemark: string\) \{\n\s+fieldErrors\.setErrors\(validate\(\{ action, reviewRemark \}\)\)\n\s+if \(focusFirstError\(\)\) return\n\s+setDialogAction\(null\)\n\s+void selection\.run\(action, reviewRemark\)/)
  assert.match(source, /inputId=\{FIELD_IDS\.reviewRemark\}\n\s+required=\{dialogAction === "reject"\}\n\s+error=\{fieldErrors\.errors\.reviewRemark === "required" \? t\("reviewReasonRequired"\) : fieldErrors\.message\("reviewRemark"\)\}\n\s+onValueChange=\{\(\) => fieldErrors\.clear\("reviewRemark"\)\}/)
  assert.doesNotMatch(source, /\btoast\b|useApiError/, "the bar reports the result; no toast")
})

test("bugs 17-18: the runner over every ticked finding, one guard against a second run, a refresh whatever answered", () => {
  const source = read(BATCH)
  assert.match(source, /const result = await runAuditFindingBatchReview\(ids, \{ action, reviewRemark \}, sendReview, setProgress\)/)
  assert.match(source, /if \(runningRef\.current \|\| selectedIds\.length === 0\) return\n\s+runningRef\.current = true/)
  assert.match(source, /\} finally \{\n\s+runningRef\.current = false\n\s+setRunning\(null\)\n\s+\/\/ [^\n]*\n\s+router\.refresh\(\)\n\s+\}/)
  assert.match(source, /body: JSON\.stringify\(body\),/)
  assert.doesNotMatch(source, /confirmConflict/, "a batch never confirms a conflict (spec §10)")
})

test("the bar: the count, ล้าง, reject then approve N; progress then the result in Task 4's words; each failure with its reason and the panel link for a 409; the result takes focus once", () => {
  const source = read(BATCH)
  assert.match(source, /<DesktopSelectionBar\n\s+label=\{t\("selectionBarLabel"\)\}\n\s+countLabel=\{count > 0 \? t\("selectedCount", \{ count: countText \}\) : null\}\n\s+clearLabel=\{t\("clearSelection"\)\}\n\s+onClear=\{selection\.clear\}\n\s+clearDisabled=\{selection\.running !== null\}/)
  assert.ok(source.indexOf('{t("rejectSelected")}') < source.indexOf('{t("approveSelected", { count: countText })}'), "the primary last")
  assert.match(source, /\? t\("batchRunning", \{ done: formatCount\(selection\.progress\), total: countText \}\)/)
  assert.match(source, /t\("reviewResultSummary", \{ succeeded: formatCount\(selection\.report\.succeeded\), failed: formatCount\(selection\.report\.failed\.length\) \}\)/)
  assert.match(source, /<span className="tag">\{failure\.code\}<\/span> \{failure\.topic\}: \{t\(`reviewFailure_\$\{failure\.reason\}`\)\}/)
  assert.match(source, /\{failure\.reason === "assetChanged" \? \([\s\S]*?<Link href=\{failure\.panelHref\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\{t\("batchOpenInPanel"\)\}<\/Link>/)
  assert.match(source, /const dismissRef = useRef<HTMLButtonElement \| null>\(null\)\n\s+useEffect\(\(\) => \{\n\s+if \(!reportNeedsFocus && document\.activeElement !== document\.body\) return\n\s+dismissRef\.current\?\.focus\(\)\n\s+reportFocused\(\)\n\s+\}, \[reportNeedsFocus, reportFocused\]\)/, "the result takes focus once, when it first shows: the buttons it came from are gone; a later mount (another page, the redirect) takes it again only when focus fell to the body (P4-R34)")
  assert.match(source, /reportNeedsFocus: stored !== null && !stored\.focused,/)
  assert.match(source, /<Button ref=\{dismissRef\} variant="outline" size="sm" onClick=\{dismissReport\}>/)
})

test("the page: one provider per selectionKey around the list pane, the ticks in a first column for audit:approve, the bar under the table (P4-R20, P4-R26)", () => {
  const page = read(PAGE)
  assert.match(page, /^import \{\n  AuditFindingSelectAllTick,\n  AuditFindingSelectTick,\n  AuditFindingsSelectionBar,\n  AuditFindingsSelectionProvider,\n  type AuditFindingSelectable,\n\} from "@\/components\/audit\/audit-findings-batch-actions"$/m)
  assert.match(page, /const selectableFindings: AuditFindingSelectable\[\] = canApprove\n\s+\? rows\n\s+\.filter\(\(row\) => row\.reviewable\)\n\s+\.map\(\(row\) => \(\{ id: row\.id, code: row\.asset\?\.assetTag \?\? row\.auditRound\.auditNo, topic: topicLabel\(row\.findingType\), panelHref: findingHref\(row\.id\) \}\)\)\n\s+: \[\]/)
  assert.match(page, /<AuditFindingsSelectionProvider key=\{selectionKey\} filterKey=\{filterKey\} findings=\{selectableFindings\}>/)
  assert.match(page, /const filterKey = `\$\{status\}:\$\{searchText\}:\$\{roundId \?\? ""\}:\$\{findingType \?\? ""\}`/)
  assert.match(read("src/app/[locale]/(dashboard)/audit/findings/layout.tsx"), /<AuditFindingsBatchReportProvider>\{children\}<\/AuditFindingsBatchReportProvider>/, "the result survives the redirect to the last page (P4-R34)")
  const table = page.slice(page.indexOf("<DataTable framed={false}"), page.indexOf("</DataTable>"))
  assert.match(table, /^<DataTable framed=\{false\} layout="fixed" minWidth=\{520\} /, "the tick comes out of the auto column: the table still fits beside the panel at 1280 (P4-R36)")
  assert.match(table, /<colgroup>\s*\{canApprove \? <col className="w-11" \/> : null\}\s*<col className="w-24" \/>/)
  assert.match(table, /\{canApprove \? \(\n\s+<DataTableHead className="p-0 first:pl-0 md:first:pl-0">\n\s+<AuditFindingSelectAllTick \/>\n\s+<\/DataTableHead>\n\s+\) : null\}/)
  assert.match(table, /\{canApprove \? \(\n\s+<DataTableCell className="p-0 first:pl-0 md:first:pl-0">\n\s+<AuditFindingSelectTick findingId=\{row\.id\} \/>\n\s+<\/DataTableCell>\n\s+\) : null\}/, "the first column's gutter cleared, so the 44px label fills its column (P4-R36)")
  assert.match(table, /<TableEmptyRow colSpan=\{canApprove \? 5 : 4\} /)
  assert.equal(page.match(/<AuditFindingSelectAllTick \/>/g)?.length, 1)
  assert.equal(page.match(/<AuditFindingSelectTick findingId=\{row\.id\} \/>/g)?.length, 1, "the desktop row only: the phone cards take no ticks (P4-R26)")
  assert.match(page, /\{canApprove \? <AuditFindingsSelectionBar \/> : null\}/)
  assert.ok(page.indexOf("<AuditFindingsSelectionBar />") > page.indexOf("<Pagination"), "under the table and its pager")
  assert.doesNotMatch(page, /AuditFindingsBatchActions|batchReviewFindings|canTickAuditFinding/)
  assert.doesNotMatch(page.match(/const selectionKey = [^\n]+/)?.[0] ?? "", /finding\b(?!Type)/, "opening a row in the panel keeps the ticks")
})

test("the bar's words, Thai and English (glossary: รายการไม่ตรง, พิจารณา); the result and the reasons are Task 4's", () => {
  const th = JSON.parse(read("messages/th.json")).auditFinding
  const en = JSON.parse(read("messages/en.json")).auditFinding
  const words: Record<string, [string, string]> = {
    selectedCount: ["{count} รายการที่เลือก", "{count} selected"],
    clearSelection: ["ล้าง", "Clear"],
    selectionBarLabel: ["รายการที่เลือก", "Selected discrepancies"],
    selectAllOnPage: ["เลือกทุกรายการที่พิจารณาได้ในหน้านี้", "Select every discrepancy you can decide on this page"],
    rejectSelected: ["ปฏิเสธที่เลือก", "Reject Selected"],
    approveSelected: ["อนุมัติที่เลือก {count} รายการ", "Approve {count} selected"],
    batchApproveTitle: ["อนุมัติ {count} รายการที่เลือก", "Approve {count} selected discrepancies"],
    batchApproveConfirm: ["อนุมัติ {count} รายการ", "Approve {count}"],
    batchRejectReason: ["เหตุผล", "Reason"],
    batchApproveRemark: ["หมายเหตุ (ไม่บังคับ)", "Remark (optional)"],
    batchResultDismiss: ["ปิดผลการพิจารณา", "Close the result"],
    // Task 4's, read as they are.
    reviewResultSummary: ["สำเร็จ {succeeded} · ไม่สำเร็จ {failed}", "{succeeded} done · {failed} not done"],
    reviewFailure_alreadyDecided: ["มีการพิจารณารายการนี้แล้ว", "Already decided"],
    reviewReasonRequired: ["กรุณาระบุเหตุผลการปฏิเสธ", "Enter a reason to reject."],
  }
  for (const [key, [thai, english]] of Object.entries(words)) {
    assert.equal(th[key], thai, key)
    assert.equal(en[key], english, key)
  }
  for (const reason of ["assetChanged", "alreadyDecided", "ownFinding", "reasonRequired", "roundReadOnly", "notFound", "failed"]) {
    assert.equal(typeof th[`reviewFailure_${reason}`], "string", reason)
    assert.equal(th[`batchFailed_${reason}`], undefined, `one word per reason: Task 4's (${reason})`)
  }
  assert.equal(th.batchResult, undefined, "one result line: Task 4's reviewResultSummary")
  for (const gone of ["batchReview", "batchReviewHelp", "selectAllPending", "batchReviewRemark", "batchReviewSuccess", "batchNeedsSelection"]) {
    assert.equal(th[gone], undefined, gone)
    assert.equal(en[gone], undefined, gone)
  }
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/audit-finding-batch-review.test.ts tests/desktop-selection-bar.test.ts tests/audit-findings-selection-ui.test.ts`
Expected: FAIL:
- `src/lib/audit-finding-batch-review.ts` and `src/components/ui/desktop-selection-bar.tsx` do not exist, so the import fails and so does the `read`;
- the batch file still holds `AuditFindingsBatchActions` and `ChoiceCard`;
- the page still mounts `<AuditFindingsBatchActions`;
- the words are master's (`selectedCount` "เลือกแล้ว {count} รายการ", `selectAllPending` "เลือกทั้งหมด"), and `selectAllOnPage` is undefined.

- [ ] **Step 3: The words**

The change file goes in the session scratchpad, is run with `node scripts/messages-edit.mjs <file>`, then deleted. Namespace `auditFinding`:

| Key | th | en |
|---|---|---|
| `selectedCount` (changed) | {count} รายการที่เลือก | {count} selected |
| `approveSelected` (changed) | อนุมัติที่เลือก {count} รายการ | Approve {count} selected |
| `clearSelection` (new) | ล้าง | Clear |
| `selectionBarLabel` (new) | รายการที่เลือก | Selected discrepancies |
| `selectColumn` (new) | เลือก | Select |
| `selectAllOnPage` (new) | เลือกทุกรายการที่พิจารณาได้ในหน้านี้ | Select every discrepancy you can decide on this page |
| `selectFinding` (new) | เลือก {name} | Select {name} |
| `batchApproveTitle` (new) | อนุมัติ {count} รายการที่เลือก | Approve {count} selected discrepancies |
| `batchRejectTitle` (new) | ปฏิเสธ {count} รายการที่เลือก | Reject {count} selected discrepancies |
| `batchApproveHelp` (new) | ทะเบียนทรัพย์สินจะเปลี่ยนตามค่าที่พบของแต่ละรายการ รายการที่ข้อมูลทรัพย์สินเปลี่ยนหลังรายงานจะถูกข้ามไว้ให้พิจารณาในแผงทีละรายการ | The register takes each found value. A discrepancy whose asset changed after the report is skipped, to decide in the panel. |
| `batchRejectHelp` (new) | ทะเบียนทรัพย์สินไม่เปลี่ยน เหตุผลเดียวกันจะบันทึกกับทุกรายการที่เลือก | The register does not change. The same reason is saved on every selected discrepancy. |
| `batchApproveRemark` (new) | หมายเหตุ (ไม่บังคับ) | Remark (optional) |
| `batchRejectReason` (new) | เหตุผล | Reason |
| `batchApproveConfirm` (new) | อนุมัติ {count} รายการ | Approve {count} |
| `batchRejectConfirm` (new) | ปฏิเสธ {count} รายการ | Reject {count} |
| `batchRunning` (new) | กำลังพิจารณา {done} จาก {total} รายการ | Deciding {done} of {total} |
| `batchOpenInPanel` (new) | เปิดในแผงพิจารณา | Open in the panel |
| `batchResultDismiss` (new) | ปิดผลการพิจารณา | Close the result |

- The result line, the seven reasons and the reject's required sentence are Task 4's (`reviewResultSummary`, `reviewFailure_<reason>`, `reviewReasonRequired` "กรุณาระบุเหตุผลการปฏิเสธ", P4-R27): this task reads them and adds no second key, so a batch and the panel say the same words.
- `"delete"`:
  - `auditFinding.batchReview`;
  - `auditFinding.batchReviewHelp`;
  - `auditFinding.selectAllPending`;
  - `auditFinding.batchReviewRemark`;
  - `auditFinding.batchReviewSuccess`;
  - `auditFinding.batchNeedsSelection`.
- Only the batch file reads these keys (grep). `disposal.batchReview` and `disposal.batchReviewHelp` are other namespaces and stay.
- Kept: `rejectSelected` "ปฏิเสธที่เลือก" / "Reject Selected".
- Glossary:
  - "รายการไม่ตรง" (row 2);
  - "พิจารณา" (row 3, and en "Decision"/"decide");
  - "ตรวจนับ" (row 10, so "รอบตรวจนับ");
  - en "discrepancy", not "finding" (§2.3).
- No English word stands in a th string (`tests/thai-glossary.test.ts`).

- [ ] **Step 4: Implement the pure part**

`src/lib/audit-finding-batch-review.ts` (new):

```ts
// Deciding several findings at once (group 2 spec §10 "Several at once", bugs 17-18, P4-R4): a client loop over the one
// review route, one request at a time, past every failure, never confirming a conflict; and the header tick's rules.
// Which rows take a tick is Task 2's row.reviewable (P4-R20). Pure and client-safe: relative .ts imports only, so
// node --test imports it.
import { classifyAuditFindingReviewResponse, foldAuditFindingBatchResults, type AuditFindingBatchResult, type AuditFindingReviewOutcome } from "./audit-finding-review-results.ts"

/** One review of the batch. Never `confirmConflict`: a 409 is decided in the panel (spec §10). */
export type AuditFindingBatchReviewBody = { action: "approve" | "reject"; reviewRemark: string }

export type AuditFindingReviewSend = (findingId: string, body: AuditFindingBatchReviewBody) => Promise<{ status: number; body: unknown }>

/**
 * Sends one review per finding, in the order given and one at a time, and reports each through Task 1's classifier.
 * A failure never stops the rest (bug 17), a 409 is one more failure (bug 18), and a network error fails that finding
 * only. onProgress gets the number answered so far.
 */
export async function runAuditFindingBatchReview(
  findingIds: readonly string[],
  body: AuditFindingBatchReviewBody,
  send: AuditFindingReviewSend,
  onProgress?: (done: number) => void,
): Promise<AuditFindingBatchResult> {
  const results: Array<{ id: string; outcome: AuditFindingReviewOutcome }> = []
  for (const id of findingIds) {
    let outcome: AuditFindingReviewOutcome
    try {
      const response = await send(id, { action: body.action, reviewRemark: body.reviewRemark })
      outcome = classifyAuditFindingReviewResponse(response.status, response.body)
    } catch {
      outcome = { ok: false, reason: "failed" }
    }
    results.push({ id, outcome })
    onProgress?.(results.length)
  }
  return foldAuditFindingBatchResults(results)
}

export type AuditFindingSelectAllState = "none" | "some" | "all"

/** The header tick: every tickable row of the page, some of them, or none. */
export function auditFindingSelectAllState(selectedIds: readonly string[], tickableIds: readonly string[]): AuditFindingSelectAllState {
  if (selectedIds.length === 0 || tickableIds.length === 0) return "none"
  const selected = new Set(selectedIds)
  return tickableIds.every((id) => selected.has(id)) ? "all" : "some"
}

export function toggleAuditFindingSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** The header tick's press: all tickable rows, or none once they all are. */
export function toggleAllAuditFindings(selected: ReadonlySet<string>, tickableIds: readonly string[]): Set<string> {
  return tickableIds.length > 0 && tickableIds.every((id) => selected.has(id)) ? new Set() : new Set(tickableIds)
}
```
- `runAuditFindingBatchReview` rebuilds the body from its two fields, so no other key can ever reach the route.
- Task 1's classifier module imports only relative `.ts` files (`api-error-catalog.ts`, `audit-finding-conflict.ts`), so this file stays pure.

- [ ] **Step 5: The shared bar**

`src/components/ui/desktop-selection-bar.tsx` (new):

```tsx
import type React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DesktopSelectionBarProps = {
  label: string
  countLabel: string | null
  clearLabel: string
  onClear: () => void
  clearDisabled?: boolean
  actions?: React.ReactNode
  status?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/**
 * The bar of a desktop list whose rows take ticks (group 2 spec §10, P4-R15). Render it as the last child of the list's
 * column, after the table and its pager: it sticks to the bottom of the dashboard scroll area (main, py-6 from sm) and
 * rests under the pager once the user scrolls there; below lg it sits above the Mobile Field Navigation, because a list
 * page is a navigation route. It sticks inside the list's column and is never pinned to the window, so it never covers
 * the page's other column; from md only, because a list with ticks shows cards below md. Flat like the other sticky
 * bars: a top line and the canvas fill.
 * - label names the bar (a group); countLabel ("3 รายการที่เลือก") shows the count, "ล้าง" and the actions (the primary
 *   last), or null while only a result is on screen.
 * - status is one line, a batch's progress or result. The region is always rendered, so each line is read once.
 * - children go under it: the result's details and their own buttons.
 * Server-safe, with no hook: its client caller passes the handlers and mounts it while a row is ticked or a result shows.
 */
export function DesktopSelectionBar({ label, countLabel, clearLabel, onClear, clearDisabled = false, actions, status, className, children }: DesktopSelectionBarProps) {
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="desktop-selection-bar"
      className={cn("sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 hidden min-w-0 flex-col gap-2 border-t border-border bg-canvas py-3 md:flex lg:-bottom-6", className)}
    >
      {countLabel ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm font-medium text-foreground">{countLabel}</span>
          <Button variant="ghost" size="md" onClick={onClear} disabled={clearDisabled}>
            {clearLabel}
          </Button>
          {actions ? <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <p role="status" className={cn("text-meta text-muted-foreground", !status && "sr-only")}>{status}</p>
      {children}
    </div>
  )
}
```
- `z-30`: the bar sits over the table's pinned cells (`z-20`/`z-30`, `data-table.tsx:26-31`) while it is stuck. It comes later in the DOM, so it paints over a `z-30` pinned header.
- `bottom-[calc(3.75rem+env(safe-area-inset-bottom))]` below `lg`: /audit/findings is a navigation route (`getMobileShellMode`, `src/lib/mobile-field-navigation.ts:16-32`). So from `md` to `lg` the fixed Mobile Field Navigation (`mobile-field-navigation.tsx:53`, `z-20 … lg:hidden`) covers main's bottom strip, and a flush bar would paint over it. 3.75rem plus main's `sm:py-6` (1.5rem) is the shell's 5.25rem reserve (`dashboard-shell.tsx:175`), the same as the asset register's phone bar (`asset-register-table.tsx:528`).
- `lg:-bottom-6`: from `lg` there is no field navigation, so the bar sits flush over main's `sm:py-6` (`dashboard-shell.tsx:171`), the offset `StickyFormFooter` uses (`sticky-form-footer.tsx:23`) (P4-R35).

- [ ] **Step 6: `ConfirmTextDialog` takes a required field and its error**

`src/components/ui/confirm-text-dialog.tsx`:
- `:17-31`: after `defaultValue?: string` (`:26`), add the four props:

  ```ts
    defaultValue?: string
    /** A star and aria-required; the caller's validate() checks it, since the form is noValidate (v-track §4.5). */
    required?: boolean
    /** The caller's error for the field, under it (useFieldErrors). */
    error?: ReactNode
    /** The textarea's id, for the caller's focusFirst. */
    inputId?: string
    /** Each change, so the caller clears its error. */
    onValueChange?: (value: string) => void
    busy?: boolean
  ```
  Keep the `\n  description?: ReactNode\n` and `\n  closeLabel?: string\n` lines as they are (`tests/accessible-dialog.test.ts:72-73`).
- `ConfirmTextForm` (`:54-91`):
  - its destructuring gains `required = false, error, inputId, onValueChange`;
  - its `Pick<…>` gains `"required" | "error" | "inputId" | "onValueChange"`;
  - the body:

    ```tsx
    const generatedId = useId()
    const fieldId = inputId ?? generatedId
    const [value, setValue] = useState(defaultValue)
    // …handleSubmit as master :71-74
    return (
      <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
        <AccessibleDialogBody>
          <Field label={fieldLabel} required={required} error={error}>
            <Textarea
              ref={inputRef}
              id={fieldId}
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                onValueChange?.(event.target.value)
              }}
              disabled={busy}
              required={required}
              rows={4}
              placeholder={placeholder}
              className="min-h-28"
            />
          </Field>
        </AccessibleDialogBody>
        {/* the footer as master :93-96 */}
      </form>
    )
    ```
  - `required` stays on the control, as docs/14's `Field` row asks. With `noValidate` it never blocks the submit.

- [ ] **Step 7: The selection, the ticks and the bar**

`src/components/audit/audit-findings-batch-actions.tsx` (rewritten whole):

```tsx
"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ConfirmTextDialog } from "@/components/ui/confirm-text-dialog"
import { DesktopSelectionBar } from "@/components/ui/desktop-selection-bar"
import { checkboxVariants } from "@/components/ui/field-variants"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import {
  auditFindingSelectAllState,
  runAuditFindingBatchReview,
  toggleAllAuditFindings,
  toggleAuditFindingSelection,
  type AuditFindingBatchReviewBody,
} from "@/lib/audit-finding-batch-review"
import type { AuditFindingReviewFailureReason } from "@/lib/audit-finding-review-results"
import { formatCount } from "@/lib/display-format"
import { maxLength, required } from "@/lib/validation-rules"

/** A finding on the page that can be ticked (Task 2's row.reviewable), and what the result names it by. */
export type AuditFindingSelectable = {
  id: string
  /** The asset tag, or the round number of a finding with no asset. */
  code: string
  /** The table's เรื่อง word (P4-R2). */
  topic: string
  /** This page with the finding open in the panel (?finding=), filters and page kept. */
  panelHref: string
}

type BatchAction = "approve" | "reject"

type BatchReport = {
  succeeded: number
  failed: Array<AuditFindingSelectable & { reason: AuditFindingReviewFailureReason }>
}

// The dialog's one field, keyed like the request body, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  reviewRemark: "audit-batch-review-remark",
} as const
type BatchField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as BatchField[]
// The limit for its message: the textarea has no maxLength, so a long text can be typed (v-track U-R7).
const FIELD_PARAMS = { reviewRemark: { max: 4000 } }

// ConfirmTextDialog's form is noValidate, so this restates the review schema (Task 1): rejecting needs one shared
// reason for every ticked finding (decision 5), approving takes an optional remark, both at most 4,000 characters.
function validate(values: { action: BatchAction; reviewRemark: string }): Partial<Record<BatchField, string>> {
  const errors: Partial<Record<BatchField, string>> = {}
  const check = (key: BatchField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reviewRemark", values.action === "reject" ? (required(values.reviewRemark) ?? maxLength(values.reviewRemark, 4000)) : maxLength(values.reviewRemark, 4000))
  return errors
}

async function sendReview(findingId: string, body: AuditFindingBatchReviewBody) {
  const response = await fetch(`/api/audit-findings/${findingId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json().catch(() => null) }
}

// No ref travels in the context (react-hooks/refs): the header tick and the result each own their element, and a
// request for focus from one to the other is state that the owner's effect acts on.
type SelectionContextValue = {
  tickableIds: readonly string[]
  findingById: ReadonlyMap<string, AuditFindingSelectable>
  selectedIds: readonly string[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  toggleAll: () => void
  clear: () => void
  running: BatchAction | null
  progress: number
  report: BatchReport | null
  /** The result has not taken focus yet: it does once, when it first shows. */
  reportNeedsFocus: boolean
  reportFocused: () => void
  run: (action: BatchAction, reviewRemark: string) => Promise<void>
  dismissReport: () => void
  /** Counts the requests for the header tick to take focus (closing the result). */
  selectAllFocusRequest: number
}

const AuditFindingsSelectionContext = createContext<SelectionContextValue | null>(null)

function useAuditFindingsSelection() {
  const context = useContext(AuditFindingsSelectionContext)
  if (!context) throw new Error("Audit finding ticks and the selection bar must be rendered within AuditFindingsSelectionProvider")
  return context
}

// The last result, for the tab and filter it ran on. focused: it has taken focus, so a later mount (another page of
// the filter, the refresh's redirect to the last page) takes it again only when focus fell to the body.
type StoredBatchReport = { filterKey: string; report: BatchReport; focused: boolean }
const AuditFindingsBatchReportContext = createContext<{ stored: StoredBatchReport | null; setStored: Dispatch<SetStateAction<StoredBatchReport | null>> } | null>(null)

// The last batch's result, held by findings/layout.tsx above the page segment (P4-R34): a batch that empties the last
// page past page 1 makes the refresh redirect (Task 3), and the redirect boundary unmounts all the page renders.
export function AuditFindingsBatchReportProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredBatchReport | null>(null)
  return <AuditFindingsBatchReportContext.Provider value={{ stored, setStored }}>{children}</AuditFindingsBatchReportContext.Provider>
}

// The ticks of one page of one filter: the page mounts this with key={selectionKey}, so another page or filter starts
// empty (DESIGN.md Data Tables). A refresh keeps the ticks; only rows still tickable count, so a finding decided in the
// panel or in another tab leaves the selection with the refresh. The result is kept above the page
// (AuditFindingsBatchReportProvider), for this tab and filter only (filterKey: the selection key without the page).
export function AuditFindingsSelectionProvider({ filterKey, findings, children }: { filterKey: string; findings: readonly AuditFindingSelectable[]; children: ReactNode }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [running, setRunning] = useState<BatchAction | null>(null)
  const [progress, setProgress] = useState(0)
  const [selectAllFocusRequest, setSelectAllFocusRequest] = useState(0)
  const reportStore = useContext(AuditFindingsBatchReportContext)
  if (!reportStore) throw new Error("The findings selection must be rendered within AuditFindingsBatchReportProvider")
  const { setStored } = reportStore
  // Only this tab and filter's result: another tab or filter starts without one.
  const stored = reportStore.stored?.filterKey === filterKey ? reportStore.stored : null
  const report = stored?.report ?? null
  const setReport = (next: BatchReport | null) => setStored(next ? { filterKey, report: next, focused: false } : null)
  // A second submit before the next render must not start a second run (spec: one decision per finding).
  const runningRef = useRef(false)
  const tickableIds = useMemo(() => findings.map((finding) => finding.id), [findings])
  const findingById = useMemo(() => new Map(findings.map((finding) => [finding.id, finding])), [findings])
  const selectedIds = useMemo(() => tickableIds.filter((id) => selected.has(id)), [tickableIds, selected])

  // Another tab or filter forgets the last result, so coming back to the one it ran on shows none. A mount with the same
  // filterKey (another page of it, or the refresh's redirect to the last page after a batch) keeps it (P4-R34).
  useEffect(() => {
    setStored((current) => (current && current.filterKey !== filterKey ? null : current))
  }, [setStored, filterKey])

  function reportFocused() {
    setStored((current) => (current && current.filterKey === filterKey && !current.focused ? { ...current, focused: true } : current))
  }

  function toggle(id: string) {
    if (runningRef.current) return
    setReport(null)
    setSelected((current) => toggleAuditFindingSelection(current, id))
  }

  function toggleAll() {
    if (runningRef.current) return
    setReport(null)
    setSelected((current) => toggleAllAuditFindings(current, tickableIds))
  }

  function clear() {
    if (runningRef.current) return
    setSelected(new Set())
  }

  async function run(action: BatchAction, reviewRemark: string) {
    if (runningRef.current || selectedIds.length === 0) return
    runningRef.current = true
    const ids = selectedIds
    setRunning(action)
    setProgress(0)
    setReport(null)
    try {
      const result = await runAuditFindingBatchReview(ids, { action, reviewRemark }, sendReview, setProgress)
      setReport({
        succeeded: result.succeeded.length,
        failed: result.failed.flatMap((failure) => {
          const finding = findingById.get(failure.id)
          return finding ? [{ ...finding, reason: failure.reason }] : []
        }),
      })
      setSelected(new Set())
    } finally {
      runningRef.current = false
      setRunning(null)
      // Bugs 17-18: the page shows what was decided, whatever answered.
      router.refresh()
    }
  }

  // Closing the result leaves focus on the header tick, or on main when no row is left to tick. The header tick owns
  // its input, so the request goes to it as a count that its effect acts on.
  function dismissReport() {
    setReport(null)
    if (tickableIds.length > 0) setSelectAllFocusRequest((count) => count + 1)
    else document.getElementById("main")?.focus()
  }

  const value: SelectionContextValue = {
    tickableIds,
    findingById,
    selectedIds,
    isSelected: (id) => selected.has(id),
    toggle,
    toggleAll,
    clear,
    running,
    progress,
    report,
    reportNeedsFocus: stored !== null && !stored.focused,
    reportFocused,
    run,
    dismissReport,
    selectAllFocusRequest,
  }
  return <AuditFindingsSelectionContext.Provider value={value}>{children}</AuditFindingsSelectionContext.Provider>
}

/** The header tick: every row of the page that can be ticked, with the mixed state while some are (spec §10). */
export function AuditFindingSelectAllTick() {
  const t = useTranslations("auditFinding")
  const selection = useAuditFindingsSelection()
  const state = auditFindingSelectAllState(selection.selectedIds, selection.tickableIds)
  const { selectAllFocusRequest } = selection
  // The input is this component's own: the mixed state is a DOM property, and closing the result asks it for focus.
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some"
  }, [state])
  useEffect(() => {
    if (selectAllFocusRequest > 0) ref.current?.focus()
  }, [selectAllFocusRequest])
  if (selection.tickableIds.length === 0) return <span className="sr-only">{t("selectColumn")}</span>
  return (
    // The label fills the 44px column (O1, K16); the box draws its own focus outline.
    <label className="flex min-h-11 w-11 cursor-pointer items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={state === "all"}
        onChange={selection.toggleAll}
        disabled={selection.running !== null}
        aria-label={t("selectAllOnPage")}
        className={checkboxVariants()}
      />
    </label>
  )
}

/** A row's tick, or nothing for a row that cannot be ticked (its own finding, a decided one, a read-only round). */
export function AuditFindingSelectTick({ findingId }: { findingId: string }) {
  const t = useTranslations("auditFinding")
  const selection = useAuditFindingsSelection()
  const finding = selection.findingById.get(findingId)
  if (!finding) return null
  return (
    // ClickableTableRow skips clicks on the input but not on its label: data-no-row-click keeps a click beside the box
    // from opening the panel (spec 2B §7.8.3).
    <label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={selection.isSelected(findingId)}
        onChange={() => selection.toggle(findingId)}
        disabled={selection.running !== null}
        aria-label={t("selectFinding", { name: `${finding.code} ${finding.topic}` })}
        className={checkboxVariants()}
      />
    </label>
  )
}

/** The last batch's details under the bar: each failure and its reason, then "ปิดผลการพิจารณา". */
function AuditFindingsBatchResult({ report }: { report: BatchReport }) {
  const t = useTranslations("auditFinding")
  const { reportNeedsFocus, reportFocused, dismissReport } = useAuditFindingsSelection()
  // The button is this component's own. The result takes focus once, when it first shows: the buttons that started the
  // batch are gone with the selection. A later mount (another page of the filter, the redirect) takes it again only when
  // the remount dropped focus to the body; a tab or filter link outside the provider keeps it.
  const dismissRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!reportNeedsFocus && document.activeElement !== document.body) return
    dismissRef.current?.focus()
    reportFocused()
  }, [reportNeedsFocus, reportFocused])
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      {report.failed.length > 0 ? (
        <ul className="space-y-1 text-sm text-foreground">
          {report.failed.map((failure) => (
            <li key={failure.id}>
              <span className="tag">{failure.code}</span> {failure.topic}: {t(`reviewFailure_${failure.reason}`)}
              {failure.reason === "assetChanged" ? (
                <>
                  {" "}
                  <Link href={failure.panelHref} className={linkVariants({ size: "inherit" })}>{t("batchOpenInPanel")}</Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <Button ref={dismissRef} variant="outline" size="sm" onClick={dismissReport}>
        {t("batchResultDismiss")}
      </Button>
    </div>
  )
}

/** The bar under the table (spec §10): "N รายการที่เลือก · ล้าง · ปฏิเสธที่เลือก · อนุมัติที่เลือก N รายการ", then the result. */
export function AuditFindingsSelectionBar() {
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const selection = useAuditFindingsSelection()
  const [dialogAction, setDialogAction] = useState<BatchAction | null>(null)
  const fieldErrors = useFieldErrors<BatchField>({ params: FIELD_PARAMS })
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
  const count = selection.selectedIds.length
  const countText = formatCount(count)

  function openDialog(action: BatchAction) {
    fieldErrors.setErrors({})
    setDialogAction(action)
  }

  // The next opening starts with no errors.
  function closeDialog() {
    setDialogAction(null)
    fieldErrors.setErrors({})
  }

  // The dialog closes before the run: the bar shows the progress, and focus goes back to the button that opened it.
  function confirm(action: BatchAction, reviewRemark: string) {
    fieldErrors.setErrors(validate({ action, reviewRemark }))
    if (focusFirstError()) return
    setDialogAction(null)
    void selection.run(action, reviewRemark)
  }

  if (count === 0 && !selection.report && !selection.running) return null
  const status = selection.running
    ? t("batchRunning", { done: formatCount(selection.progress), total: countText })
    : selection.report
      ? t("reviewResultSummary", { succeeded: formatCount(selection.report.succeeded), failed: formatCount(selection.report.failed.length) })
      : null

  return (
    <>
      <DesktopSelectionBar
        label={t("selectionBarLabel")}
        countLabel={count > 0 ? t("selectedCount", { count: countText }) : null}
        clearLabel={t("clearSelection")}
        onClear={selection.clear}
        clearDisabled={selection.running !== null}
        actions={
          <>
            <Button variant="danger" size="md" onClick={() => openDialog("reject")} busy={selection.running === "reject"} disabled={selection.running === "approve"}>
              <X aria-hidden="true" />
              {t("rejectSelected")}
            </Button>
            <Button size="md" onClick={() => openDialog("approve")} busy={selection.running === "approve"} disabled={selection.running === "reject"}>
              <Check aria-hidden="true" />
              {t("approveSelected", { count: countText })}
            </Button>
          </>
        }
        status={status}
      >
        {selection.report ? <AuditFindingsBatchResult report={selection.report} /> : null}
      </DesktopSelectionBar>
      <ConfirmTextDialog
        open={dialogAction !== null}
        title={dialogAction === "reject" ? t("batchRejectTitle", { count: countText }) : t("batchApproveTitle", { count: countText })}
        description={dialogAction === "reject" ? t("batchRejectHelp") : t("batchApproveHelp")}
        fieldLabel={dialogAction === "reject" ? t("batchRejectReason") : t("batchApproveRemark")}
        inputId={FIELD_IDS.reviewRemark}
        required={dialogAction === "reject"}
        error={fieldErrors.errors.reviewRemark === "required" ? t("reviewReasonRequired") : fieldErrors.message("reviewRemark")}
        onValueChange={() => fieldErrors.clear("reviewRemark")}
        confirmLabel={dialogAction === "reject" ? t("batchRejectConfirm", { count: countText }) : t("batchApproveConfirm", { count: countText })}
        cancelLabel={tCommon("cancel")}
        tone={dialogAction === "reject" ? "danger" : "default"}
        onClose={closeDialog}
        onConfirm={(reviewRemark) => {
          if (dialogAction) confirm(dialogAction, reviewRemark)
        }}
      />
    </>
  )
}
```
- `.Provider` is the repo's form (`disposal-bulk-approval.tsx:424`, `asset-register-navigation.tsx:51`).
- No ref travels in the context and none is read during render: `npm run lint` runs `react-hooks/refs` (eslint-plugin-react-hooks 7.1.1 through eslint-config-next), which fails a ref in a context value and every read of that context's values in render. The header tick and `AuditFindingsBatchResult` each own their element (`useRef` in the component). Closing the result asks the header tick for focus with a count (`selectAllFocusRequest`) that its effect acts on; with no row left to tick, `dismissReport` focuses `main` itself.
- The result takes focus once (`StoredBatchReport.focused`, set by `reportFocused` after the focus), so another page of the filter, whose provider mounts again with the result, or the redirect to the last page takes focus again only when the remount dropped it to the body (`document.activeElement === document.body`); a tab or filter link outside the provider keeps focus (P4-R34).
- A provider that mounts for another tab or filter forgets the stored result in its first effect, so coming back to the tab it ran on shows none; a mount with the same `filterKey` keeps it, which is what carries it through the redirect (P4-R34). Its first render already hides another filter's result, so it never flashes.
- Run `t(\`reviewFailure_${failure.reason}\`)` only on Task 1's reasons. Each one has Task 4's key, and the words test pins all seven.
- `reviewReasonRequired` is Task 4's sentence (P4-R27): the dialog's empty reason reads what the panel's box reads.
- `ConfirmTextDialog`'s `busy` stays at its default `false`. The dialog closes before the run, so nothing waits inside it.

- [ ] **Step 8: Wire the page**

`src/app/[locale]/(dashboard)/audit/findings/page.tsx`. Blocks by content (Tasks 2-4 have edited the file; the names are Task 2's and Task 3's):
- **Imports:** the `AuditFindingsBatchActions` import becomes:

  ```ts
  import {
    AuditFindingSelectAllTick,
    AuditFindingSelectTick,
    AuditFindingsSelectionBar,
    AuditFindingsSelectionProvider,
    type AuditFindingSelectable,
  } from "@/components/audit/audit-findings-batch-actions"
  ```
- **`batchReviewFindings`** (Task 3's) becomes:

  ```ts
  // The rows the viewer may tick (spec §10): Task 2's reviewable, the review route's own rule (P4-R20). A finding they
  // reported has none; the panel says why.
  const selectableFindings: AuditFindingSelectable[] = canApprove
    ? rows
        .filter((row) => row.reviewable)
        .map((row) => ({ id: row.id, code: row.asset?.assetTag ?? row.auditRound.auditNo, topic: topicLabel(row.findingType), panelHref: findingHref(row.id) }))
    : []
  ```
- **The old mount:** delete the batch panel `{canApprove ? <AuditFindingsBatchActions key={selectionKey} findings={batchReviewFindings} /> : null}` in the list pane.
- **`selectionKey`** (Task 3's) stays a key of one page of one filter. It does not read `finding`, so opening a row in the panel keeps the ticks. Right after it, add the same key without the page and its size, which names whose result the bar shows (P4-R34):

  ```ts
  const filterKey = `${status}:${searchText}:${roundId ?? ""}:${findingType ?? ""}`
  ```
- **The list pane** (`<div data-audit-findings-list …>`): wrap the table panel (the cards, the table and its `Pagination`) in `<AuditFindingsSelectionProvider key={selectionKey} filterKey={filterKey} findings={selectableFindings}>`. As the provider's last child, after the table panel, put `{canApprove ? <AuditFindingsSelectionBar /> : null}`, so the bar is the last child of the list pane, which sets no `overflow`. The provider renders for every viewer. It holds no row for a viewer without `audit:approve`, and no tick or bar renders for one. The pane (`data-audit-finding-pane`) stays outside it.
- **The tick column** (desktop only, P4-R26; `canApprove` only). In Task 3's table:
  - `minWidth={520}` stays: the tick column comes out of the auto ทรัพย์สิน column, so the table still fits the list frame beside the 420px panel at 1280 (P4-R36);
  - the table's first column takes a 16/20px gutter through `first:` / `md:first:`, which `p-0` does not remove (`data-table.tsx:11-16`). The tick cells clear it, so the 44px label fills its 44px column, as the register's tick does (`asset-register-table.tsx:603`, `:661`);
  - the `colgroup` gains `{canApprove ? <col className="w-11" /> : null}` before `<col className="w-24" />`;
  - the head row gains, first:

    ```tsx
    {canApprove ? (
      <DataTableHead className="p-0 first:pl-0 md:first:pl-0">
        <AuditFindingSelectAllTick />
      </DataTableHead>
    ) : null}
    ```
  - each `ClickableTableRow` gains, as its first cell:

    ```tsx
    {canApprove ? (
      <DataTableCell className="p-0 first:pl-0 md:first:pl-0">
        <AuditFindingSelectTick findingId={row.id} />
      </DataTableCell>
    ) : null}
    ```
  - `<TableEmptyRow colSpan={4} …` becomes `<TableEmptyRow colSpan={canApprove ? 5 : 4} …`.
  - The phone cards take no tick.
- The header tick renders the sr-only word "เลือก" (`selectColumn`) when no row of the page can be ticked, so the head cell is never empty.

`src/app/[locale]/(dashboard)/audit/findings/layout.tsx` (new; P4-R34):

```tsx
import type { ReactNode } from "react"
import { AuditFindingsBatchReportProvider } from "@/components/audit/audit-findings-batch-actions"

// The findings selection bar's last result lives here, above the page segment (group 2 plan 4 Task 5, P4-R34): a batch
// that empties the last page past page 1 makes the refresh redirect (Task 3), and Next's redirect boundary unmounts all
// the page renders, the selection provider with it.
export default function AuditFindingsLayout({ children }: { children: ReactNode }) {
  return <AuditFindingsBatchReportProvider>{children}</AuditFindingsBatchReportProvider>
}
```

- [ ] **Step 9: The docs**

- **`DESIGN.md:622`:** the last sentence becomes "A selection belongs to the page on screen: changing the page, its size or a filter clears it (the disposal providers take `selectionKey`, the findings selection provider takes it as its `key`)."
- **A new block** in **Data Tables**, after the `RowActions` list (`:624-628`) and before **Asset register pattern (2026-10-07).** (`:630`):

  ```md
  **`DesktopSelectionBar`** (`src/components/ui/desktop-selection-bar.tsx`, server-safe, no hook; group 2 plan 4) is the bar of a desktop list whose rows take ticks (the findings list):

  - **Placement:** the last child of the list's column, after the table and its pager. It sticks to the bottom of the dashboard scroll area (`sticky`; from `lg` flush over `main`'s padding with `lg:-bottom-6`; below `lg` it sits above the Mobile Field Navigation (`bottom-[calc(3.75rem+env(safe-area-inset-bottom))]`), because a list page keeps the field navigation) and rests under the pager once you scroll there. It is never `fixed`, so it never covers the page's other column, and it shows from `md` only (`hidden md:flex`): below `md` the list is its cards, which take no ticks. No ancestor between it and `main` may set `overflow`.
  - **Look:** flat, a `border-t` on `bg-canvas`, no shadow, blur or see-through fill, as `StickyFormFooter`.
  - **Content:** one row — the count ("3 รายการที่เลือก", 14/500 ink), a `ghost` `md` "ล้าง", then the actions on the right, `md` buttons with the primary last; under it the `status` line, a `role="status"` region the bar always renders, so a batch's progress and its result are each read once; then `children`, the result's details with their own buttons. The bar is a group named by `label`.
  - **The caller** mounts it while a row is ticked or a result is on screen, and moves focus into the result once, when it first shows and the buttons that started it are gone. Ticks are native checkboxes in a 44px `label` with `checkboxVariants()` and `data-no-row-click`; the header tick takes every row on the page that can be ticked and shows the mixed state. The provider that holds the ticks takes `selectionKey` as its `key`.
  - **The findings list** ticks a pending finding the viewer did not report, on a round that is not closed or cancelled. "ปฏิเสธที่เลือก" asks one shared reason, required; "อนุมัติที่เลือก N รายการ" an optional remark. The reviews go one at a time, past any failure and never confirming a conflict; the bar then reads "สำเร็จ X · ไม่สำเร็จ Y" with each failure and its reason (a 409 links to the finding in the panel), the selection clears and the page refreshes. The result is held above the page (the findings layout's `AuditFindingsBatchReportProvider`), so it survives the refresh's move to the last page when a batch empties the page it ran on; opening another tab or filter forgets it.
  ```
- **`docs/14_UI_UX_DESIGN_SYSTEM.md`:** a new row after `:98`:

  ```md
  | The ticked rows of a desktop list and what to do with them | `DesktopSelectionBar` | from `md` only (a list with ticks shows cards below `md`); the last child of the list's column, `sticky`, never `fixed`; below `lg` it sits above the Mobile Field Navigation (`bottom-[calc(3.75rem+env(safe-area-inset-bottom))]`), flush from `lg`; flat, no shadow; the count, "ล้าง", then the actions with the primary last; a batch's progress and result in `status` (a polite region the bar always renders), its details in `children`; mounted while a row is ticked or a result shows |
  ```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `node --test tests/audit-finding-batch-review.test.ts tests/desktop-selection-bar.test.ts tests/audit-findings-selection-ui.test.ts tests/validation-guards.test.ts tests/accessible-dialog.test.ts && npx tsc --noEmit`
Expected:
- the three new files PASS, except the parts that read the guard lists, which pass after Step 11;
- `tests/validation-guards.test.ts` PASSES unchanged:
  - V1: the batch file holds no `<form>`, and `V_SCOPE` still counts it as 1;
  - V2: `validate(` is there;
  - V3: no toast;
  - `NOT_IN_SCOPE` still names the batch file as `ConfirmTextDialog`'s caller;
- `tests/accessible-dialog.test.ts:70-77` PASSES, because the `description` and `closeLabel` prop lines are unchanged.

- [ ] **Step 11: Rewrite the pins this task breaks**

- **`tests/list-frame-guards.test.ts:67`:** `UI_NAME` becomes `/\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|FactStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil|DesktopSelectionBar)\b/g`.
- **`:130-132`:**
  - the comment's list (`:130-131`) gains "DesktopSelectionBar";
  - `OWNERS.LN2` becomes `["data-table", "desktop-selection-bar", "empty-note", "fact-strip", "key-value-list", "nil", "page-header", "pagination", "row-actions", "stat-strip", "status-badge", "tab-nav"].map(…)`.
- **`tests/visual-foundation-guards.test.ts:102`:** `for (const path of ["src/components/ui/action-bar.tsx", "src/components/ui/desktop-selection-bar.tsx"]) {`. The title of `:94` stays "panels and bottom action bars are flat".
- **`tests/list-pages-ui.test.ts:246-255`** (the test only; `:244`'s `const FINDINGS_BATCH` stays because the new test reads it, and the comment at `:242-243` may stay or be dropped in favour of the block's own comment): the test becomes:

  ```ts
  // Group 2 plan 4 Task 5 (spec §10): the findings batch is ticks in the table and DesktopSelectionBar under it.
  test("the findings batch: ticks in a 44px label, the shared bar with ล้าง, reject as danger and approve in the primary color, busy while it runs (spec §10, P4-R15)", () => {
    const source = read(FINDINGS_BATCH)
    assert.match(source, /<DesktopSelectionBar\n/)
    assert.match(source, /<Button variant="danger" size="md" onClick=\{\(\) => openDialog\("reject"\)\} busy=\{selection\.running === "reject"\} disabled=\{selection\.running === "approve"\}>/)
    assert.match(source, /<Button size="md" onClick=\{\(\) => openDialog\("approve"\)\} busy=\{selection\.running === "approve"\} disabled=\{selection\.running === "reject"\}>/)
    assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2, "the header tick and the row tick")
    assert.doesNotMatch(source, /<button\b|<Loader2\b|\bbg-success\b|\bbg-danger\b|opacity-50|h-4 w-4 rounded|<ChoiceCard/, "no hand-written button, spinner, green fill, old checkbox or card list")
    assert.match(source, /<ConfirmTextDialog\n/, "the shared reason stays the shared dialog")
  })
  ```
- **`tests/list-pages-ui.test.ts:303`** (Task 3's form: the `AuditFindingsBatchActions` line of the findings frame test) becomes `assert.match(source, /<AuditFindingsSelectionProvider key=\{selectionKey\} filterKey=\{filterKey\} findings=\{selectableFindings\}>/, "another page or filter starts the ticks empty")`. Task 3's other findings pins in this file read any `minWidth` and `colSpan`, and the last four heads, so they hold.
- **`tests/audit-findings-page-ui.test.ts`** (Task 3's table test): the tick column is in.
  - `minWidth=\{520\}` stays (P4-R36);
  - the `colgroup` regex becomes `/<colgroup>\s*\{canApprove \? <col className="w-11" \/> : null\}\s*<col className="w-24" \/>\s*<col \/>\s*<col className="w-44" \/>\s*<col className="w-28" \/>\s*<\/colgroup>/`;
  - `<TableEmptyRow colSpan=\{4\}` becomes `<TableEmptyRow colSpan=\{canApprove \? 5 : 4\}`;
  - the heads' list stays the four words: the tick's head cell spans lines, so the one-line head regex does not read it (Step 1's page test pins it).
- **`tests/audit-pages-sweep-ui.test.ts:59-66`:** the test becomes:

  ```ts
  test("findings batch: the shared bar and native ticks in a 44px label, no card list and no panel of its own (group 2 spec §10, P4-R15)", () => {
    const source = read(`${C}audit/audit-findings-batch-actions.tsx`)
    assert.match(source, /import \{ DesktopSelectionBar \} from "@\/components\/ui\/desktop-selection-bar"/)
    assert.equal(source.match(/<label (?:data-no-row-click )?className="flex min-h-11 w-11 cursor-pointer items-center justify-center">/g)?.length, 2)
    assert.doesNotMatch(source, /<ContentPanel\b|<ChoiceCard\b|<section\b|hover:bg-accent|rounded-lg|\bmb-4\b|\btext-xs\b|\bshadow-/)
  })
  ```
- **`tests/confirm-text-dialog-ui.test.ts:30`:** `assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody>\n\s+<Field label=\{fieldLabel\} required=\{required\} error=\{error\}>\n\s+<Textarea\n\s+ref=\{inputRef\}\n\s+id=\{fieldId\}/)`.
  - Add after it: `assert.match(source, /const fieldId = inputId \?\? generatedId/)` and `assert.match(source, /onValueChange\?\.\(event\.target\.value\)/)`.
  - Its title gains ", a caller's required field and its error (group 2 plan 4)".
- **`tests/confirm-text-dialog-ui.test.ts:36-40`:**
  - the title becomes "the findings batch dialog takes its X name from the dialog, not from its caller, and closes before the batch runs (2C batch 3, spec §5.3; group 2 plan 4)";
  - `:38` becomes `assert.match(source, /cancelLabel=\{tCommon\("cancel"\)\}\n\s+tone=\{dialogAction === "reject" \? "danger" : "default"\}/)`;
  - add `assert.doesNotMatch(source, /<ConfirmTextDialog[^>]*\bbusy=/)`.
  - `:39` (no `closeLabel=`) stays.
- **`tests/v-track2-u.test.ts:172-196`:** the test becomes:

  ```ts
  test("batch review: one shared reason, required to reject, checked by validate() under the field before any request; the actions exist only while a row is ticked (v-track U5; group 2 plan 4 decision 5)", () => {
    const source = read(`${C}audit-findings-batch-actions.tsx`)
    // The form is ConfirmTextDialog's (a shared part, NOT_IN_SCOPE); it takes noValidate for its caller (spec §4.5).
    assert.match(read("src/components/ui/confirm-text-dialog.tsx"), /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
    assert.match(source, /^import \{ useFieldErrors \} from "@\/components\/ui\/use-field-errors"$/m)
    const rules = validateBody(source)
    assert.ok(rules.includes('check("reviewRemark", values.action === "reject" ? (required(values.reviewRemark) ?? maxLength(values.reviewRemark, 4000)) : maxLength(values.reviewRemark, 4000))'))
    assert.match(source, /fieldErrors\.setErrors\(validate\(\{ action, reviewRemark \}\)\)\n\s+if \(focusFirstError\(\)\) return/)
    assert.match(source, /const focusFirstError = \(\) => fieldErrors\.focusFirst\(FIELD_ORDER, \{ idFor: \(key\) => FIELD_IDS\[key\] \}\)/)
    assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/)
    // No prerequisite gate is left: the buttons render only while a row is ticked (the bar's countLabel).
    assert.match(source, /countLabel=\{count > 0 \? t\("selectedCount", \{ count: countText \}\) : null\}/)
    assert.doesNotMatch(source, /aria-describedby=\{noSelection|batchNeedsSelection|function openReviewDialog/)
    const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
    const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
    assert.equal(th.auditFinding.batchRejectReason, "เหตุผล")
    assert.equal(en.auditFinding.batchRejectReason, "Reason")
    assert.equal(th.auditFinding.batchNeedsSelection, undefined)
  })
  ```
- **`tests/form-migration-guards.test.ts`**: inside `CONSTRAINT_FLOORS`, right after the `` [`${C}ui/scanner-text-input.tsx`]: [0, 1, 0], `` row (master `:122`, `:123` after Task 4's row), add

  ```ts
    // Group 2 plan 4 Task 5: the shared confirm dialog passes its caller's required to its Textarea.
    [`${C}ui/confirm-text-dialog.tsx`]: [1, 0, 0],
  ```
  Step 6 puts `required={required}` on the Textarea, and GF5 fails a file that has a constraint but no row.
- These stay as they are:
  - `tests/validation-guards.test.ts:35`, `:68`, `:112`;
  - `tests/confirm-text-dialog-ui.test.ts:5-24`, `:31-33`, `:39`;
  - `tests/accessible-dialog.test.ts:70-77`;
  - `tests/form-migration-guards.test.ts:94`: the review actions file is not touched here.

- [ ] **Step 12: Run everything**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.
- A pin that fails outside the lists above is rewritten in this commit and named in the report.
- Expected passes: GL1 (`sticky`, not `fixed bottom-`), R2 (no surface shadow), N3 (no raw `<button>`), LT5 (no faded disabled), GB3 and GB4 (the busy buttons keep their labels, and `disabled` reads the other action), GF5 (the confirm dialog's new row, `[1, 0, 0]`).
- `npm run lint` passes the batch file with no `react-hooks/refs` error: no ref in the selection context, none read in render (Step 7).

- [ ] **Step 13: Commit**

```bash
git add src/components/ui/desktop-selection-bar.tsx src/lib/audit-finding-batch-review.ts src/components/audit/audit-findings-batch-actions.tsx src/components/ui/confirm-text-dialog.tsx "src/app/[locale]/(dashboard)/audit/findings/page.tsx" "src/app/[locale]/(dashboard)/audit/findings/layout.tsx" tests/form-migration-guards.test.ts DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md messages/th.json messages/en.json tests/audit-finding-batch-review.test.ts tests/desktop-selection-bar.test.ts tests/audit-findings-selection-ui.test.ts tests/audit-findings-page-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-pages-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/confirm-text-dialog-ui.test.ts tests/v-track2-u.test.ts
git commit -m "feat(audit-findings): decide several at once from ticks in the table and the new shared DesktopSelectionBar (sticky, flat, desktop only from md): the ticks are the page data's reviewable rows and the header tick takes them all, rejecting asks one shared reason that is required (decision 5) and approving asks once with an optional remark, the reviews go one at a time past any failure and never confirm a conflict, and the bar reports สำเร็จ X · ไม่สำเร็จ Y with each reason in the panel's words (a 409 links to the panel), clears the ticks and refreshes (bugs 17-18; group 2 plan 4 task 5, P4-R20, P4-R22, P4-R25 to P4-R27)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Export codes in words (the carry-over from plan 2), `actionTaken` labels, ASCII-safe file names

The round Excel, the round PDF, the variance report, the findings Excel and the findings PDF write stored codes today: `auditStatus`, `auditResult`, `reconcileStatus`, `findingType`, `reviewStatus`, `actionStatus` and `actionTaken`. Their PDF titles, summary labels and filter line are English, and the filter line is made of codes. A Thai search, which the room search invites, makes the three round exports answer 500: `Content-Disposition` cannot carry Thai (`recon-exports.md` §4, checked in node 24: `TypeError: Cannot convert argument to a ByteString`). This task:

1. **Each export takes `locale`.**
   - The routes read it with `resolveAuditExportLocale(request.nextUrl.searchParams.get("locale"))`, which defaults to `th`, as the asset history export does (`assets/[id]/history/export/route.ts:22`).
   - They call `getTranslations({ locale })` (root keys), after `requirePermission` (`tests/e2e-cross-cutting.test.ts:44-47`).
   - The round page's links add `locale` through `buildAuditRoundExportHref(locale, …)`. The reports page's three findings links add it too. The findings page's links come with Task 3's "ส่งออก ▾".
2. **Every code cell reads the page's words,** through one pure map, `src/lib/audit-export-labels.ts`:
   - an item's check status reads as the findings page's item badge does;
   - an item's result reads as the round page's ผล column (`auditRoundResultBadge`: a checked item with no result reads ไม่ตรง, P2-R2);
   - reconcile, finding type, review status and action status read as the findings page does;
   - a code that has no word yet shows as stored (docs/19 "รหัสที่ยังไม่มีคำแปลแสดงตามจริง ไม่ซ่อน"), which a drift test keeps from ever happening for a code the app writes.
3. **`actionTaken` gets words** for its 13 system codes (P4-R8), in new `auditFinding.actionTaken_*` keys. A code without a key reads as the export's empty cell (blank in Excel, the PDF's one empty mark), never the code (P4-R29).
4. **Words for the PDF titles, the summary labels, the variance summary rows and the PDF filter line.** The round PDF's filter line reads as the round page's chips ("ไม่ตรง · หมวดหมู่: NB · ค้นหา: ห้อง 3"). The findings PDF's title and filter line read as the findings page's tab and chips. The en values of the new keys are today's English strings, so an English export reads as it does today.
5. **What stays English (P4-R7):**
   - the column headers (`audit-excel.ts`, `audit-pdf.tsx`, the variance columns);
   - the sheet names ("Audit Results" / "Results - <code label>", "Variance Summary", "Variance Details", "Audit Findings"); the sheet-name suffix keeps its ASCII filter code (P4-R29);
   - the code label in the file name;
   - the PDF footer and document author.
   - E2E and users' sheets read the headers and sheet names (`e2e/audit/field-audit.spec.ts:799-801`, `:855`; `e2e/cross-cutting/reports.spec.ts:133`).
6. **ASCII-safe file names (P4-R9).** `workbookResponse` and `pdfResponse` write `attachment; filename="<ASCII>"; filename*=UTF-8''<the whole name>` through one pure helper. That fixes every Excel export of the app, not only audit. The Thai name still reaches the browser through `filename*`.
7. **An owner the export cannot name reads blank,** never the employee id (P4-R11 in the exports: findings Excel `:55`, PDF `:61`).

**Files:**
- Create:
  - `src/lib/audit-export-labels.ts` (pure: the locale, the code-to-key maps, the two filter-word builders);
  - `src/lib/download-filename.ts` (pure: `attachmentContentDisposition`).
- Modify:
  - `src/app/api/audit-rounds/[id]/export/route.ts`: `:1-15` imports, `:32-34` row type, `:41-50` locale and t, `:91-93` cells, `:135` result;
  - `src/app/api/audit-rounds/[id]/export-pdf/route.ts`: `:1-16` imports, `:41-48`, `:57`, `:62-82`;
  - `src/app/api/audit-rounds/[id]/variance-export/route.ts`: `:1-10`, `:39-46`, `:81-95`, `:108-113`;
  - `src/app/api/audit-findings/export/route.ts`: `:1-9`, the locale and t after `:14`, `:50-60`;
  - `src/app/api/audit-findings/export-pdf/route.ts`: `:1-10`, the locale, t and round number after `:17`, `:43-63`;
  - `src/lib/audit-round-result-filters.ts`:
    - `:257` (export the `AuditExportFilterLabelInput` type);
    - `:373-376` (`buildAuditRoundExportHref` takes the locale);
  - `src/lib/asset-excel.ts:93-101` (`workbookResponse`);
  - `src/lib/audit-pdf.tsx:170-178` (`pdfResponse`);
  - `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx:112-114`;
  - `src/app/[locale]/(dashboard)/reports/page.tsx:616`, `:658`, `:659`;
  - `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`).
- Test:
  - new: `tests/audit-export-labels.test.ts` (by value, plus the route and link pins);
  - pins rewritten:
    - `tests/audit-round-exports.test.ts:91-92`, `:105-112`, `:128-130`;
    - `tests/audit-round-result-drilldown.test.ts:96-97`, `:146-152`;
    - `tests/audit-round-list-filters.test.ts:161-166`;
    - `tests/audit-round-page-rules.test.ts:197-202`;
    - `tests/audit-round-page-ui.test.ts:46-48`.

**Interfaces:**
- Consumes:
  - `getAuditItemStatusLabelKey`, `getAuditItemReconcileStatusLabelKey` (`src/lib/audit-item-status-labels.ts:20-32`; unknown → `null`).
  - `auditRoundResultBadge(auditStatus, auditResult): { labelKey: AuditRoundResultBadgeKey; tone }` (`src/lib/audit-round-page-rules.ts:226-233`; keys in `auditRound`).
  - `AUDIT_ROUND_OTHER_CATEGORY`, `AuditRoundResultFilter`, `AuditFindingField` (`src/lib/audit-round-result-filters.ts:9-31`).
  - `getTranslations` from `next-intl/server`, as the history export uses it (`assets/[id]/history/export/route.ts:3`, `:25`).
  - **Task 2** (the findings export routes): the filter the routes parse, as Task 2 rewrote those lines. This task changes none of them: `status` (`resolveAuditFindingStatus`, which takes `follow_up`), `search`, `roundId`, `findingType`, the bell rules, `typeSearchLabels`, the `where`, the file name (`tests/audit-finding-resolution.test.ts:30-38`, `:132-148`). From Task 2's `src/lib/audit-finding-filters.ts` (pure) it reads:
    - `auditFindingFilterLabelKeys(status: AuditFindingStatus): string[]`, the full message keys of the filter in use in display order: the tab first (`auditFinding.status_pending` … `auditFinding.tabFollowUp`), then its sub-chip or the bell's chip (`notifications.openAuditActions` / `notifications.auditActionsDueSoon`). Task 2 tests every key of it in th and en.
    - `auditFindingTypes`, the six type codes: the exports' type list is this one, not a second one.
  - **Task 3:** the findings page's "ส่งออก ▾" links already carry `locale` (`exportParams.set("locale", locale)`, pinned in `tests/audit-findings-page-ui.test.ts`). This task changes nothing on that page.
- Produces:
  - `src/lib/audit-export-labels.ts`:

    ```ts
    export type AuditExportLocale = "th" | "en"
    export function resolveAuditExportLocale(value: string | null | undefined): AuditExportLocale
    export type AuditExportTranslate = (key: string, values?: Record<string, string>) => string
    // The type codes are Task 2's auditFindingTypes (audit-finding-filters.ts); this file adds no second list.
    export const auditFindingReviewStatusCodes: readonly ["pending", "approved", "rejected", "exception"]
    export const auditFindingActionStatusCodes: readonly ["not_required", "planned", "in_progress", "done", "closed"]
    export const auditFindingActionTakenCodes: readonly [/* the 13 codes, Step 4 */]
    export function auditExportItemStatusKey(code: string | null | undefined): string | null
    export function auditExportItemResultKey(auditStatus: string, auditResult: string | null): string
    export function auditExportReconcileStatusKey(code: string | null | undefined): string | null
    export function auditExportFindingTypeKey(code: string | null | undefined): string | null
    export function auditExportReviewStatusKey(code: string | null | undefined): string | null
    export function auditExportActionStatusKey(code: string | null | undefined): string | null
    export function auditExportActionTakenKey(code: string | null | undefined): string | null
    export function auditExportWord(t: (key: string) => string, key: string | null, code: string | null | undefined): string
    export function auditExportActionTaken(t: (key: string) => string, code: string | null | undefined): string
    export type AuditExportFilterWords = { /* Step 4 */ }
    export function auditExportFilterWords(t: AuditExportTranslate): AuditExportFilterWords
    export function buildAuditExportFilterWords(input: AuditExportFilterLabelInput, words: AuditExportFilterWords): string
    export function buildAuditFindingExportFilterWords(input: { roundNo: string | null; findingType: string | null; search: string | null }, t: AuditExportTranslate): string
    ```
  - `src/lib/download-filename.ts`: `export function attachmentContentDisposition(filename: string): string`.
  - `buildAuditRoundExportHref(locale: string, roundId: string, endpoint: AuditRoundExportEndpoint, filters: AuditRoundListHrefFilters): string`. The query is the list's filters, then `locale`.
  - Message keys, root paths:
    - `auditRound.exportPdfTitle`, `auditRound.exportPdfFilter`;
    - `auditRound.exportFilterComponentsMissing`, `auditRound.exportFilterSearch`;
    - `auditRound.exportSummary_*` (5);
    - `auditRound.varianceMetric_*` (13);
    - `auditFinding.exportPdfTitle`;
    - `auditFinding.exportSummary_*` (4);
    - `auditFinding.actionTaken_*` (13).
  - For Task 7 (optional E2E), in the findings Excel the IT head downloads at `field-audit.spec.ts:787-807`:
    - the "Finding Type" cell of C2's row reads "ไม่พบทรัพย์สิน";
    - its "Review Status" cell reads "รอพิจารณา" before the review, or "อนุมัติแล้ว" after it;
    - the header row and the sheet name are unchanged.
- E2E is not run in this task.

- [ ] **Step 1: Write the failing test**

`tests/audit-export-labels.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  auditExportActionStatusKey,
  auditExportActionTaken,
  auditExportActionTakenKey,
  auditExportFilterWords,
  auditExportFindingTypeKey,
  auditExportItemResultKey,
  auditExportItemStatusKey,
  auditExportReconcileStatusKey,
  auditExportReviewStatusKey,
  auditExportWord,
  auditFindingActionStatusCodes,
  auditFindingActionTakenCodes,
  auditFindingReviewStatusCodes,
  buildAuditExportFilterWords,
  buildAuditFindingExportFilterWords,
  resolveAuditExportLocale,
} from "../src/lib/audit-export-labels.ts"
import { auditFindingTypes } from "../src/lib/audit-finding-filters.ts"
import { attachmentContentDisposition } from "../src/lib/download-filename.ts"
import { workbookResponse } from "../src/lib/asset-excel.ts"
import { readSourceFiles } from "./helpers/source-files.ts"

// Group 2 plan 4 Task 6 (spec §5 "No raw code ever reaches the screen", P4-R7 to P4-R9; the plan 2 carry-over): the
// five audit exports write the page's words in the request's language, keep their English headers and sheet names, and
// a Thai file name no longer breaks the download. Sources read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = { th: JSON.parse(read("messages/th.json")), en: JSON.parse(read("messages/en.json")) }
// A small stand-in for next-intl's t: the key's text with its {name} arguments filled.
const translator = (locale: "th" | "en") => (key: string, values?: Record<string, string>) => {
  const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale])
  assert.equal(typeof text, "string", `${locale} ${key}`)
  return (text as string).replace(/\{(\w+)\}/g, (_, name: string) => values?.[name] ?? `{${name}}`)
}
const th = translator("th")
const en = translator("en")
const ROUTES = {
  roundExcel: "src/app/api/audit-rounds/[id]/export/route.ts",
  roundPdf: "src/app/api/audit-rounds/[id]/export-pdf/route.ts",
  variance: "src/app/api/audit-rounds/[id]/variance-export/route.ts",
  findingsExcel: "src/app/api/audit-findings/export/route.ts",
  findingsPdf: "src/app/api/audit-findings/export-pdf/route.ts",
}

test("the language is the request's: en when asked, th otherwise (P4-R7)", () => {
  assert.equal(resolveAuditExportLocale("en"), "en")
  for (const value of ["th", null, undefined, "", "fr", "EN"]) assert.equal(resolveAuditExportLocale(value), "th", String(value))
})

test("every stored code reads the page's word in both languages; a blank stays blank", () => {
  assert.equal(auditExportWord(th, auditExportItemStatusKey("pending"), "pending"), "รอตรวจ")
  assert.equal(auditExportWord(th, auditExportItemStatusKey("reconciled"), "reconciled"), "ปรับปรุงข้อมูลแล้ว")
  assert.equal(auditExportWord(th, auditExportReconcileStatusKey("pending_investigation"), "pending_investigation"), "รอติดตามหาทรัพย์สิน")
  assert.equal(auditExportWord(th, auditExportReconcileStatusKey(""), ""), "", "no reconcile status, an empty cell")
  // The round page's ผล column (P2-R2): wrong_* and need_review read ไม่ตรง, a checked item with no result too.
  assert.equal(th(auditExportItemResultKey("reviewed", "wrong_location")), "ไม่ตรง")
  assert.equal(th(auditExportItemResultKey("reviewed", "need_review")), "ไม่ตรง")
  assert.equal(th(auditExportItemResultKey("reviewed", null)), "ไม่ตรง")
  assert.equal(th(auditExportItemResultKey("scanned", "confirmed_with_parent")), "ยืนยันกับทรัพย์สินหลัก")
  assert.equal(th(auditExportItemResultKey("reviewed", "out_of_scope")), "นอกขอบเขต")
  assert.equal(th(auditExportItemResultKey("pending", null)), "รอตรวจ")
  assert.equal(en(auditExportItemResultKey("scanned", "found")), "Matched")
  assert.equal(auditExportWord(th, auditExportFindingTypeKey("not_found"), "not_found"), "ไม่พบทรัพย์สิน")
  assert.equal(auditExportWord(en, auditExportFindingTypeKey("wrong_custodian"), "wrong_custodian"), "Wrong Custodian")
  assert.equal(auditExportWord(th, auditExportReviewStatusKey("exception"), "exception"), "ต้องตรวจสอบพิเศษ")
  assert.equal(auditExportWord(th, auditExportActionStatusKey("not_required"), "not_required"), "ยังไม่ต้องทำ")
  for (const [codes, key] of [
    [auditFindingTypes, auditExportFindingTypeKey],
    [auditFindingReviewStatusCodes, auditExportReviewStatusKey],
    [auditFindingActionStatusCodes, auditExportActionStatusKey],
    [auditFindingActionTakenCodes, auditExportActionTakenKey],
  ] as const) {
    for (const code of codes) {
      const path = key(code)
      assert.ok(path, code)
      th(path)
      en(path)
    }
  }
  // docs/19: a code with no word yet shows as stored, never hidden; actionTaken reads blank instead, never the code
  // (P4-R8, P4-R29).
  assert.equal(auditExportWord(th, auditExportFindingTypeKey("wrong_colour"), "wrong_colour"), "wrong_colour")
  assert.equal(auditExportActionTaken(th, "some_future_code"), "")
  assert.equal(auditExportActionTaken(th, null), "")
  assert.equal(auditExportActionTaken(th, "master_asset_updated"), "แก้ข้อมูลทรัพย์สินตามผลตรวจแล้ว")
  assert.equal(auditExportActionTaken(en, "found_later_by_audit_scan"), "Found later by a check scan")
})

test("P4-R8, P4-R29: every actionTaken and findingType code the routes write has its words (no code reaches an export)", () => {
  const written = new Set<string>()
  const types = new Set<string>()
  for (const file of readSourceFiles("src/app/api")) {
    // A comparison inside a ternary (review/route.ts:254 `input.action === "approve"`) is not a code, and an orderBy
    // direction (variance-export/route.ts:69 `findingType: "asc"`) is not a type.
    for (const match of file.source.matchAll(/actionTaken:\s*([^,\n}]+)/g)) for (const code of match[1].replace(/[\w.]+\s*[!=]==\s*"[a-z_]+"/g, "").matchAll(/"([a-z_]+)"/g)) written.add(code[1])
    for (const match of file.source.matchAll(/findingType:\s*"([a-z_]+)"/g)) if (match[1] !== "asc" && match[1] !== "desc") types.add(match[1])
  }
  assert.ok(written.size >= 13, `found ${written.size} actionTaken codes`)
  assert.deepEqual([...written].filter((code) => !auditFindingActionTakenCodes.includes(code as never)), [])
  assert.deepEqual([...types].filter((code) => !auditFindingTypes.includes(code as never)), [])
})

test("the round PDF's filter line reads as the round page's chips, in one order; none reads ทั้งหมด", () => {
  const sni = { code: "SNI" }
  const input = { result: "mismatch", search: " ห้อง 3 ", company: sni, branch: { code: "HQ", company: sni }, category: { code: "NB" }, field: "location", components: "missing" } as const
  assert.equal(buildAuditExportFilterWords(input, auditExportFilterWords(th)), "ไม่ตรง · บริษัท: SNI · สาขา: HQ · หมวดหมู่: NB · ที่ตั้งไม่ตรง · ส่วนควบไม่ครบ · ค้นหา: ห้อง 3")
  assert.equal(buildAuditExportFilterWords({ result: "all", search: "", branch: { code: "HQ", company: sni } }, auditExportFilterWords(th)), "สาขา: SNI-HQ", "a branch without its company names the company")
  assert.equal(buildAuditExportFilterWords({ result: "all", search: "", category: { code: "other" } }, auditExportFilterWords(th)), "หมวดหมู่: อื่น ๆ")
  assert.equal(buildAuditExportFilterWords({ result: "all", search: "" }, auditExportFilterWords(th)), "ทั้งหมด")
  assert.equal(buildAuditExportFilterWords({ result: "not_found", search: "" }, auditExportFilterWords(en)), "Not Found")
})

test("the findings PDF's filter line: the round, the topic and the search; an unknown topic is left out, never its code", () => {
  assert.equal(buildAuditFindingExportFilterWords({ roundNo: "AUD-2026-0003", findingType: "wrong_department", search: "PC" }, th), "รอบตรวจ: AUD-2026-0003 · แผนกไม่ตรง · ค้นหา: PC")
  assert.equal(buildAuditFindingExportFilterWords({ roundNo: null, findingType: "wrong_colour", search: null }, th), "ทั้งหมด")
})

test("P4-R9: a Thai file name keeps an ASCII filename and the whole name in filename*", () => {
  const name = "audit-result-AUD-2026-0003-search-ห้อง-2026-10-28.xlsx"
  const value = attachmentContentDisposition(name)
  assert.equal(value, "attachment; filename=\"audit-result-AUD-2026-0003-search-2026-10-28.xlsx\"; filename*=UTF-8''audit-result-AUD-2026-0003-search-%E0%B8%AB%E0%B9%89%E0%B8%AD%E0%B8%87-2026-10-28.xlsx")
  assert.equal(new Response("x", { headers: { "Content-Disposition": value } }).headers.get("content-disposition"), value, "a ByteString: the 500 is gone")
  assert.equal(attachmentContentDisposition("it's (a) \"q\";.pdf"), "attachment; filename=\"it's (a) -q-.pdf\"; filename*=UTF-8''it%27s%20%28a%29%20%22q%22%3B.pdf")
  assert.equal(attachmentContentDisposition("audit-findings-pending-2026-10-28.xlsx"), "attachment; filename=\"audit-findings-pending-2026-10-28.xlsx\"; filename*=UTF-8''audit-findings-pending-2026-10-28.xlsx")
  assert.equal(workbookResponse(new ArrayBuffer(1), name).headers.get("content-disposition"), value, "every Excel export")
  assert.match(read("src/lib/audit-pdf.tsx"), /"Content-Disposition": attachmentContentDisposition\(filename\),/)
  assert.doesNotMatch(read("src/lib/audit-pdf.tsx") + read("src/lib/asset-excel.ts"), /filename="\$\{filename\}"/)
})

test("each export reads ?locale= after the permission and writes its codes through the map; headers and sheet names stay English (P4-R7)", () => {
  for (const [name, path] of Object.entries(ROUTES)) {
    const route = read(path)
    assert.match(route, /^import \{ getTranslations \} from "next-intl\/server"$/m, name)
    assert.match(route, /const locale = resolveAuditExportLocale\(request\.nextUrl\.searchParams\.get\("locale"\)\)/, name)
    assert.match(route, /getTranslations\(\{ locale \}\)/, name)
    assert.ok(route.indexOf("requirePermission(user, \"audit\", \"export\")") < route.indexOf("getTranslations({ locale })"), `${name}: the permission first`)
    assert.doesNotMatch(route, /(?:auditStatus|reconcileStatus|findingType|reviewStatus|actionStatus): (?:row|finding)\.(?:auditStatus|reconcileStatus|findingType|reviewStatus|actionStatus)(?:\s*\?\?\s*"")?,\n|actionTaken: finding\.actionTaken \?\? ""/, `${name}: no stored code in a cell (the round routes' item-to-row builders keep the codes on purpose)`)
  }
  const roundExcel = read(ROUTES.roundExcel)
  assert.match(roundExcel, /auditResult: t\(auditExportItemResultKey\(row\.auditStatus, row\.auditResult\)\),/)
  assert.match(roundExcel, /worksheet\.columns = auditResultColumns/)
  const roundPdf = read(ROUTES.roundPdf)
  assert.match(roundPdf, /title: t\("auditRound\.exportPdfTitle", \{ auditNo: round\.auditNo \}\),/)
  assert.match(roundPdf, /const filterWords = buildAuditExportFilterWords\(labelInput, auditExportFilterWords\(t\)\)/)
  const variance = read(ROUTES.variance)
  assert.match(variance, /workbook\.addWorksheet\("Variance Summary"\)/)
  assert.match(variance, /workbook\.addWorksheet\("Variance Details"\)/)
  assert.match(variance, /\{ header: "Finding Type", key: "findingType", width: 24 \}/)
  const findingsExcel = read(ROUTES.findingsExcel)
  assert.match(findingsExcel, /workbook\.addWorksheet\("Audit Findings"\)/)
  assert.match(findingsExcel, /actionTaken: auditExportActionTaken\(t, finding\.actionTaken\),/)
  assert.match(findingsExcel, /actionOwner: finding\.actionOwnerId \? \(ownerLabelById\.get\(finding\.actionOwnerId\) \?\? ""\) : "",/, "never an employee id (P4-R11)")
  const findingsPdf = read(ROUTES.findingsPdf)
  assert.match(findingsPdf, /title: t\("auditFinding\.exportPdfTitle", \{ filter: auditFindingFilterLabelKeys\(status\)\.map\(\(key\) => t\(key\)\)\.join\(" · "\) \}\),/)
  assert.match(findingsPdf, /actionOwner: finding\.actionOwnerId \? \(ownerCodeById\.get\(finding\.actionOwnerId\) \?\? ""\) : "",/)
  // The English the E2E steps and the users' sheets read stays.
  const excel = read("src/lib/audit-excel.ts")
  for (const header of ['{ header: "Asset Tag", key: "assetTag", width: 22 }', '{ header: "Audit Status", key: "auditStatus", width: 18 }', '{ header: "Action Taken", key: "actionTaken", width: 26 }']) assert.ok(excel.includes(header), header)
})

test("the links carry the page's language: the round page through its one builder, the reports page's three findings links", () => {
  const roundPage = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
  for (const [name, endpoint] of [["auditRoundExportHref", "export"], ["auditRoundExportPdfHref", "export-pdf"], ["auditRoundVarianceHref", "variance-export"]]) {
    assert.match(roundPage, new RegExp(`const ${name} = buildAuditRoundExportHref\\(locale, round\\.id, "${endpoint}", filters\\)`), name)
  }
  const reports = read("src/app/[locale]/(dashboard)/reports/page.tsx")
  assert.ok(reports.includes("href: `/api/audit-findings/export?status=pending&locale=${locale}`"))
  assert.ok(reports.includes("exportHref: `/api/audit-findings/export?status=all&locale=${locale}`"))
  assert.ok(reports.includes("exportHref: `/api/audit-findings/export-pdf?status=all&locale=${locale}`"))
})

test("the new words, Thai and English; English reads as today's export (glossary: รหัสทรัพย์สิน, รายการไม่ตรง, ตรวจนับ)", () => {
  assert.equal(th("auditRound.exportPdfTitle", { auditNo: "AUD-1" }), "ผลตรวจนับ AUD-1")
  assert.equal(en("auditRound.exportPdfTitle", { auditNo: "AUD-1" }), "Audit Result - AUD-1")
  assert.equal(th("auditRound.exportPdfFilter", { filter: "ทั้งหมด" }), "ตัวกรอง: ทั้งหมด")
  assert.equal(en("auditRound.exportSummary_mismatchOrNotFound"), "Mismatch/Not Found")
  assert.equal(th("auditRound.varianceMetric_totalExpected"), "ทรัพย์สินในรอบ")
  assert.equal(en("auditRound.varianceMetric_outOfScopeFindings"), "Out-of-scope Findings")
  assert.equal(th("auditFinding.exportPdfTitle", { filter: "รอพิจารณา" }), "รายการไม่ตรง · รอพิจารณา")
  assert.equal(en("auditFinding.exportSummary_rejectedOrException"), "Rejected/Exception")
  assert.equal(Object.keys(messages.th.auditRound).filter((key) => key.startsWith("varianceMetric_")).length, 13)
  assert.equal(Object.keys(messages.th.auditFinding).filter((key) => key.startsWith("actionTaken_")).length, auditFindingActionTakenCodes.length)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/audit-export-labels.test.ts`
Expected: FAIL:
- `src/lib/audit-export-labels.ts` and `src/lib/download-filename.ts` do not exist (the import fails);
- once they exist, the routes still write `row.auditStatus` and the rest, `workbookResponse` still writes `filename="${filename}"`, the round page calls `buildAuditRoundExportHref(round.id, …)`, and the words are undefined.

- [ ] **Step 3: The words**

The change file goes in the session scratchpad, is run with `node scripts/messages-edit.mjs <file>`, then deleted.

The en value of every summary and title key is the English string the export writes today. So an English export reads the same, and only its codes become words.

Namespace `auditRound`:

| Key | th | en |
|---|---|---|
| `exportPdfTitle` | ผลตรวจนับ {auditNo} | Audit Result - {auditNo} |
| `exportPdfFilter` | ตัวกรอง: {filter} | Filter: {filter} |
| `exportFilterComponentsMissing` | ส่วนควบไม่ครบ | Missing components |
| `exportFilterSearch` | ค้นหา: {search} | Search: {search} |
| `exportSummary_exported` | รายการที่ส่งออก | Exported Rows |
| `exportSummary_pending` | รอตรวจ | Pending |
| `exportSummary_checked` | ตรวจแล้ว | Checked |
| `exportSummary_mismatchOrNotFound` | ไม่ตรงหรือไม่พบ | Mismatch/Not Found |
| `exportSummary_outOfScope` | นอกขอบเขต | Out of Scope |
| `varianceMetric_totalExpected` | ทรัพย์สินในรอบ | Total Expected Assets |
| `varianceMetric_matched` | ทรัพย์สินพบตรง | Matched Assets |
| `varianceMetric_mismatched` | ทรัพย์สินไม่ตรง | Mismatched Assets |
| `varianceMetric_pending` | ทรัพย์สินรอตรวจ | Pending Assets |
| `varianceMetric_notFound` | ทรัพย์สินไม่พบ | Not Found Assets |
| `varianceMetric_wrongLocation` | รายการไม่ตรงเรื่องที่ตั้ง | Wrong Location Findings |
| `varianceMetric_wrongCustodian` | รายการไม่ตรงเรื่องผู้ถือครอง | Wrong Custodian Findings |
| `varianceMetric_wrongDepartment` | รายการไม่ตรงเรื่องแผนก | Wrong Department Findings |
| `varianceMetric_wrongCondition` | รายการไม่ตรงเรื่องสภาพ | Wrong Condition Findings |
| `varianceMetric_outOfScopeFindings` | รายการไม่ตรงนอกขอบเขต | Out-of-scope Findings |
| `varianceMetric_outOfScopeAssets` | ทรัพย์สินนอกขอบเขต | Out-of-scope Assets |
| `varianceMetric_pendingReview` | รายการไม่ตรงรอพิจารณา | Pending Review Findings |
| `varianceMetric_openActions` | แผนแก้ไขที่ยังเปิดอยู่ | Open Action Plans |

Namespace `auditFinding`. The six `actionTaken` words the system log already uses are copied from `systemLogPage.value_actionTaken_*` (th/en `:3780-3785`); the other seven are new.

| Key | th | en |
|---|---|---|
| `exportPdfTitle` | รายการไม่ตรง · {filter} | Audit Findings - {filter} |
| `exportSummary_total` | รายการไม่ตรงทั้งหมด | Total Findings |
| `exportSummary_pending` | รอพิจารณา | Pending |
| `exportSummary_approved` | อนุมัติแล้ว | Approved |
| `exportSummary_rejectedOrException` | ปฏิเสธหรือต้องตรวจสอบพิเศษ | Rejected/Exception |
| `actionTaken_master_asset_updated` | แก้ข้อมูลทรัพย์สินตามผลตรวจแล้ว | Asset register updated |
| `actionTaken_master_asset_updated_from_audit_scan` | แก้ข้อมูลทรัพย์สินจากหน้าตรวจนับแล้ว | Asset register updated from the check |
| `actionTaken_finding_rejected` | ปฏิเสธรายการไม่ตรง | Discrepancy rejected |
| `actionTaken_out_of_scope_confirmed_no_master_update` | ยืนยันนอกขอบเขต ไม่แก้ข้อมูลทรัพย์สิน | Out of scope confirmed, register unchanged |
| `actionTaken_not_found_confirmed_no_master_update` | ยืนยันไม่พบทรัพย์สิน ไม่แก้ข้อมูลทรัพย์สิน | Not found confirmed, register unchanged |
| `actionTaken_manual_review_required` | ต้องพิจารณาเอง | Needs a manual decision |
| `actionTaken_pending_investigation` | รอติดตามหาทรัพย์สิน | Pending investigation |
| `actionTaken_out_of_scope_detected_by_audit_scan` | พบนอกขอบเขตระหว่างตรวจนับ | Found out of scope during the check |
| `actionTaken_out_of_scope_actual_field_reported` | บันทึกค่าที่พบของทรัพย์สินนอกขอบเขต | Found value of an out-of-scope asset recorded |
| `actionTaken_component_confirmed_with_parent_mismatch` | ยืนยันส่วนควบพร้อมทรัพย์สินหลัก แต่ข้อมูลไม่ตรง | Component confirmed with its parent, data differs |
| `actionTaken_component_confirmed_with_parent_mismatch_resolved` | ยืนยันส่วนควบอีกครั้ง ข้อมูลตรงแล้ว | Component confirmed again, data matches |
| `actionTaken_found_later_by_component_confirmation` | พบภายหลังเมื่อยืนยันส่วนควบพร้อมทรัพย์สินหลัก | Found later, confirmed with its parent |
| `actionTaken_found_later_by_audit_scan` | พบภายหลังจากการสแกนตรวจนับ | Found later by a check scan |

- Glossary:
  - "ที่ตั้ง", "ผู้ถือครอง" and "หมวดหมู่" (rows 1, 12, 13);
  - "รายการไม่ตรง" and "พิจารณา";
  - "ตรวจนับ" (row 10);
  - "ขอบเขต" and "นอกขอบเขต" (row 9);
  - "แผนแก้ไข" (§2.2).
- No th value holds "Asset", "Audit", "Review", "Finding" or "Location" (`tests/thai-glossary.test.ts`).
- The meanings come from the writers: `review/route.ts:156`, `:171`, `:188`, `:254`; `mark-not-found/route.ts:99`; `scan/route.ts:206`, `:223`, `:526`, `:556`, `:572`, `:679`, `:749`.

- [ ] **Step 4: Implement the pure parts**

`src/lib/download-filename.ts` (new):

```ts
// A download's Content-Disposition (group 2 plan 4 P4-R9). A header holds bytes only: a Thai name, for example a round
// export filtered by a room search, threw "Cannot convert argument to a ByteString" and the export answered 500. The
// quoted filename keeps the printable ASCII (each run of other characters, a quote, a backslash or a semicolon becomes
// one "-"); filename* carries the whole name in UTF-8 (RFC 6266, RFC 5987), which browsers prefer. Pure, no imports.
export function attachmentContentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]+/g, "-").replace(/["\\;]/g, "-").replace(/-{2,}/g, "-")
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}
```
The exact values are pinned in Step 1. They were checked in node 24, and `new Response` accepts them.

`src/lib/audit-round-result-filters.ts:257`: `type AuditExportFilterLabelInput = {` becomes `export type AuditExportFilterLabelInput = {`.

`src/lib/audit-export-labels.ts` (new):

```ts
// The audit exports in words (group 2 spec §5, plan 4 Task 6, P4-R7, P4-R8): each stored code a cell holds maps to the
// full message key of the word its page shows, read with getTranslations({ locale }) (root keys). Headers and sheet
// names stay English. Pure and client-safe: `import type` and relative .ts imports only, so node --test imports it.
import { auditFindingTypes } from "./audit-finding-filters.ts"
import { getAuditItemReconcileStatusLabelKey, getAuditItemStatusLabelKey } from "./audit-item-status-labels.ts"
import { auditRoundResultBadge } from "./audit-round-page-rules.ts"
import { AUDIT_ROUND_OTHER_CATEGORY, type AuditExportFilterLabelInput, type AuditFindingField, type AuditRoundResultFilter } from "./audit-round-result-filters.ts"

export type AuditExportLocale = "th" | "en"

/** The request's language (?locale=), Thai unless English is asked, as the asset history export (R15). */
export function resolveAuditExportLocale(value: string | null | undefined): AuditExportLocale {
  return value === "en" ? "en" : "th"
}

export type AuditExportTranslate = (key: string, values?: Record<string, string>) => string

// The codes each column holds, as their writers store them (prisma/schema.prisma defaults, the review, scan and
// mark-not-found routes). The six type codes are Task 2's auditFindingTypes. tests/audit-export-labels.test.ts checks
// that the routes write no other actionTaken or type.
export const auditFindingReviewStatusCodes = ["pending", "approved", "rejected", "exception"] as const
export const auditFindingActionStatusCodes = ["not_required", "planned", "in_progress", "done", "closed"] as const
export const auditFindingActionTakenCodes = [
  "master_asset_updated",
  "master_asset_updated_from_audit_scan",
  "finding_rejected",
  "out_of_scope_confirmed_no_master_update",
  "not_found_confirmed_no_master_update",
  "manual_review_required",
  "pending_investigation",
  "out_of_scope_detected_by_audit_scan",
  "out_of_scope_actual_field_reported",
  "component_confirmed_with_parent_mismatch",
  "component_confirmed_with_parent_mismatch_resolved",
  "found_later_by_component_confirmation",
  "found_later_by_audit_scan",
] as const

function keyIn(codes: readonly string[], prefix: string, code: string | null | undefined): string | null {
  return code && codes.includes(code) ? `${prefix}${code}` : null
}

/** An item's check status, as the findings page's item badge (auditFinding.itemStatus_*). */
export function auditExportItemStatusKey(code: string | null | undefined): string | null {
  const key = getAuditItemStatusLabelKey(code)
  return key ? `auditFinding.${key}` : null
}

/** An item's result, as the round page's ผล column (P2-R2): always a word, a checked item with no result reads ไม่ตรง. */
export function auditExportItemResultKey(auditStatus: string, auditResult: string | null): string {
  return `auditRound.${auditRoundResultBadge(auditStatus, auditResult).labelKey}`
}

export function auditExportReconcileStatusKey(code: string | null | undefined): string | null {
  const key = getAuditItemReconcileStatusLabelKey(code)
  return key ? `auditFinding.${key}` : null
}

export function auditExportFindingTypeKey(code: string | null | undefined): string | null {
  return keyIn(auditFindingTypes, "auditFinding.type_", code)
}

export function auditExportReviewStatusKey(code: string | null | undefined): string | null {
  return keyIn(auditFindingReviewStatusCodes, "auditFinding.status_", code)
}

export function auditExportActionStatusKey(code: string | null | undefined): string | null {
  return keyIn(auditFindingActionStatusCodes, "auditFinding.actionStatus_", code)
}

export function auditExportActionTakenKey(code: string | null | undefined): string | null {
  return keyIn(auditFindingActionTakenCodes, "auditFinding.actionTaken_", code)
}

/** A code in words: a blank stays blank; a code with no word yet shows as stored, never hidden (docs/19). */
export function auditExportWord(t: (key: string) => string, key: string | null, code: string | null | undefined): string {
  if (!code) return ""
  return key ? t(key) : code
}

/** actionTaken in words; a code with no word reads as the export's empty cell, never the code (P4-R8, P4-R29). */
export function auditExportActionTaken(t: (key: string) => string, code: string | null | undefined): string {
  const key = auditExportActionTakenKey(code)
  return key ? t(key) : ""
}

export type AuditExportFilterWords = {
  result: Readonly<Record<AuditRoundResultFilter, string>>
  field: Readonly<Record<AuditFindingField, string>>
  company: (code: string) => string
  branch: (code: string) => string
  category: (code: string) => string
  categoryOther: string
  componentsMissing: string
  search: (text: string) => string
  none: string
}

/** The round page's chip words (rounds/[id]/page.tsx resultFilterLabels and resultFilterChips). */
export function auditExportFilterWords(t: AuditExportTranslate): AuditExportFilterWords {
  return {
    result: {
      all: t("auditRound.viewAll"),
      pending: t("auditRound.pending"),
      found: t("auditRound.found"),
      mismatch: t("auditRound.mismatchShort"),
      not_found: t("auditRound.notFound"),
      out_of_scope: t("auditRound.outOfScope"),
      pending_review: t("auditRound.pendingReview"),
    },
    field: {
      location: t("auditFinding.type_wrong_location"),
      department: t("auditFinding.type_wrong_department"),
      custodian: t("auditFinding.type_wrong_custodian"),
      condition: t("auditFinding.type_wrong_condition"),
    },
    company: (code) => t("auditRound.companyFilterChip", { company: code }),
    branch: (code) => t("auditRound.branchFilterChip", { branch: code }),
    category: (code) => t("auditRound.categoryFilterChip", { category: code }),
    categoryOther: t("auditRound.categoryFilterChip", { category: t("auditRound.categoryOther") }),
    componentsMissing: t("auditRound.exportFilterComponentsMissing"),
    search: (text) => t("auditRound.exportFilterSearch", { search: text }),
    none: t("auditRound.viewAll"),
  }
}

/** The round PDF's filter line: buildAuditExportFilterLabel's parts in its order, in words, joined by " · ". */
export function buildAuditExportFilterWords(input: AuditExportFilterLabelInput, words: AuditExportFilterWords): string {
  const parts: string[] = []
  if (input.result !== "all") parts.push(words.result[input.result])
  if (input.company) parts.push(words.company(input.company.code))
  if (input.branch) parts.push(words.branch(input.company ? input.branch.code : `${input.branch.company.code}-${input.branch.code}`))
  if (input.category) parts.push(input.category.code === AUDIT_ROUND_OTHER_CATEGORY ? words.categoryOther : words.category(input.category.code))
  if (input.field) parts.push(words.field[input.field])
  if (input.components) parts.push(words.componentsMissing)
  const searchText = input.search ? input.search.trim() : ""
  if (searchText) parts.push(words.search(searchText))
  return parts.length > 0 ? parts.join(" · ") : words.none
}

/** The findings PDF's filter line: the round, the topic and the search; a topic with no word is left out. */
export function buildAuditFindingExportFilterWords(input: { roundNo: string | null; findingType: string | null; search: string | null }, t: AuditExportTranslate): string {
  const typeKey = auditExportFindingTypeKey(input.findingType)
  const searchText = input.search?.trim() ?? ""
  const parts = [
    ...(input.roundNo ? [`${t("auditFinding.auditRound")}: ${input.roundNo}`] : []),
    ...(typeKey ? [t(typeKey)] : []),
    ...(searchText ? [t("auditRound.exportFilterSearch", { search: searchText })] : []),
  ]
  return parts.length > 0 ? parts.join(" · ") : t("auditFinding.status_all")
}
```
- `audit-round-page-rules.ts`, `audit-round-result-filters.ts` and Task 2's `audit-finding-filters.ts` are pure, with relative imports and `import type` for Prisma, so node imports this file.
- `audit-round-page-rules.ts` imports `audit-round-result-filters.ts`, which imports nothing back from either, and `audit-finding-filters.ts` imports none of them, so there is no cycle.

- [ ] **Step 5: The two response helpers**

- **`src/lib/asset-excel.ts`:**
  - add `import { attachmentContentDisposition } from "./download-filename.ts"` under `:1`;
  - in `workbookResponse` (`:93-101`), `:97` becomes `"Content-Disposition": attachmentContentDisposition(filename),`.
  - The relative `.ts` import keeps the file loadable by node tests (`tests/asset-cross-scope-export.test.ts:4`, `tests/asset-import-field-labels.test.ts:5`).
- **`src/lib/audit-pdf.tsx`:**
  - add `import { attachmentContentDisposition } from "@/lib/download-filename"` after `:3`;
  - in `pdfResponse` (`:170-178`), `:174` becomes `"Content-Disposition": attachmentContentDisposition(filename),`.
- Every caller of the two is unchanged. That is 14 routes (grep `workbookResponse|pdfResponse`), and each sends an ASCII name today, which comes out byte for byte the same in `filename` and is added as `filename*`.

- [ ] **Step 6: The round exports**

- **`src/app/api/audit-rounds/[id]/export/route.ts`:**
  - Imports (`:1-15`):
    - add `import { getTranslations } from "next-intl/server"` after `:1`;
    - add `import { auditExportItemResultKey, auditExportItemStatusKey, auditExportReconcileStatusKey, auditExportWord, resolveAuditExportLocale } from "@/lib/audit-export-labels"` after `:6`;
    - keep the `import {\n  auditRoundItemListOrderBy,` block as it is (`tests/audit-round-exports.test.ts:84`).
  - `:33`: `auditResult: string` becomes `auditResult: string | null`.
  - `:46-50`:

    ```ts
    const { id } = await context.params
    const locale = resolveAuditExportLocale(request.nextUrl.searchParams.get("locale"))
    const [round, exportFilters, t] = await Promise.all([
      prisma.auditRound.findFirst({ where: { id, isActive: true }, select: { id: true, auditNo: true, name: true, status: true } }),
      resolveAuditRoundExportFilters(id, request.nextUrl.searchParams),
      getTranslations({ locale }),
    ])
    ```
  - `:91-93`:

    ```ts
    auditStatus: auditExportWord(t, auditExportItemStatusKey(row.auditStatus), row.auditStatus),
    auditResult: t(auditExportItemResultKey(row.auditStatus, row.auditResult)),
    reconcileStatus: auditExportWord(t, auditExportReconcileStatusKey(row.reconcileStatus), row.reconcileStatus),
    ```
  - `:135`: `auditResult: item.auditResult ?? "",` becomes `auditResult: item.auditResult,`.
  - The builder's `auditStatus: item.auditStatus,` (`:134`) and `reconcileStatus: item.reconcileStatus ?? "",` (`:136`) stay, and so do export-pdf's `:110` and `:112`: the cells translate them, and the test's no-code guard reads only `row.` and `finding.` cells.
  - Unchanged:
    - the sheet name `buildAuditExportWorksheetName(filterLabel)` (`:75`, the code label, English, `tests/audit-round-result-drilldown.test.ts:151`);
    - `auditResultColumns` (`:76`);
    - the file name (`:103`);
    - the cancelled guard (`:52`).
- **`src/app/api/audit-rounds/[id]/export-pdf/route.ts`:**
  - Imports:
    - add `import { getTranslations } from "next-intl/server"` after `:1`;
    - add `import { auditExportFilterWords, auditExportItemResultKey, auditExportItemStatusKey, auditExportReconcileStatusKey, auditExportWord, buildAuditExportFilterWords, resolveAuditExportLocale } from "@/lib/audit-export-labels"` after `:7`;
    - drop `buildAuditExportFilterLabel,` from the `:9-16` block. Its first line `  auditRoundItemListOrderBy,` stays.
  - `:41-48`: the locale and `t`, as the Excel route above. `t` is the third element of the `Promise.all`.
  - `:57`: `const filterLabel = buildAuditExportFilterLabel(labelInput)` becomes `const filterWords = buildAuditExportFilterWords(labelInput, auditExportFilterWords(t))`.
  - `:62-82`:

    ```ts
    const buffer = await renderAuditResultPdf({
      title: t("auditRound.exportPdfTitle", { auditNo: round.auditNo }),
      subtitle: `${round.name} | ${formatDate(round.startDate)} - ${formatDate(round.endDate)} | ${t("auditRound.exportPdfFilter", { filter: filterWords })}`,
      summary: [
        { label: t("auditRound.exportSummary_exported"), value: summary.exported },
        { label: t("auditRound.exportSummary_pending"), value: summary.pending },
        { label: t("auditRound.exportSummary_checked"), value: summary.checked },
        { label: t("auditRound.exportSummary_mismatchOrNotFound"), value: summary.mismatchOrNotFound },
        { label: t("auditRound.exportSummary_outOfScope"), value: summary.outOfScope },
      ],
      rows: rows.map((row) => ({
        assetTag: row.assetTag,
        assetName: row.assetName,
        expectedLocation: labelOrBlank(labels, row.expectedLocationId),
        actualLocation: labelOrBlank(labels, row.actualLocationId),
        auditStatus: auditExportWord(t, auditExportItemStatusKey(row.auditStatus), row.auditStatus),
        auditResult: t(auditExportItemResultKey(row.auditStatus, row.auditResult)),
        reconcileStatus: auditExportWord(t, auditExportReconcileStatusKey(row.reconcileStatus), row.reconcileStatus),
        scanCount: String(row.scanCount),
        lastScanAt: formatDateTime(row.lastScanAt),
      })),
    })
    ```
  - The file name (`:85`) is unchanged and still comes from `labelInput`.
  - If `tsc` refuses next-intl's `t` as `AuditExportTranslate`, pass `(key, values) => t(key, values)`.
- **`src/app/api/audit-rounds/[id]/variance-export/route.ts`:**
  - Imports:
    - add `import { getTranslations } from "next-intl/server"` after `:1`;
    - add `import { auditExportActionStatusKey, auditExportFindingTypeKey, auditExportReconcileStatusKey, auditExportReviewStatusKey, auditExportWord, resolveAuditExportLocale } from "@/lib/audit-export-labels"` after `:9`.
  - `:39-46`: the locale and `t` as above, with `t` as the third element of the `Promise.all`.
  - `:81-95`:

    ```ts
    summarySheet.addRows([
      { metric: t("auditRound.varianceMetric_totalExpected"), count: counts.all },
      { metric: t("auditRound.varianceMetric_matched"), count: counts.found },
      { metric: t("auditRound.varianceMetric_mismatched"), count: counts.mismatch },
      { metric: t("auditRound.varianceMetric_pending"), count: counts.pending },
      { metric: t("auditRound.varianceMetric_notFound"), count: counts.notFound },
      { metric: t("auditRound.varianceMetric_wrongLocation"), count: countFinding(findings, "wrong_location") },
      { metric: t("auditRound.varianceMetric_wrongCustodian"), count: countFinding(findings, "wrong_custodian") },
      { metric: t("auditRound.varianceMetric_wrongDepartment"), count: countFinding(findings, "wrong_department") },
      { metric: t("auditRound.varianceMetric_wrongCondition"), count: countFinding(findings, "wrong_condition") },
      { metric: t("auditRound.varianceMetric_outOfScopeFindings"), count: countFinding(findings, "out_of_scope") },
      { metric: t("auditRound.varianceMetric_outOfScopeAssets"), count: counts.outOfScope },
      { metric: t("auditRound.varianceMetric_pendingReview"), count: pendingReview },
      { metric: t("auditRound.varianceMetric_openActions"), count: findings.filter((finding) => isOpenAuditFindingActionStatus(finding.actionStatus)).length },
    ])
    ```
  - `:108-113`:

    ```ts
    findingType: auditExportWord(t, auditExportFindingTypeKey(finding.findingType), finding.findingType),
    // :109-110 unchanged
    reviewStatus: auditExportWord(t, auditExportReviewStatusKey(finding.reviewStatus), finding.reviewStatus),
    reconcileStatus: auditExportWord(t, auditExportReconcileStatusKey(finding.auditItem.reconcileStatus), finding.auditItem.reconcileStatus),
    actionStatus: auditExportWord(t, auditExportActionStatusKey(finding.actionStatus), finding.actionStatus),
    ```
  - Unchanged: the "Metric" / "Count" headers (`:77-78`), the sheet names (`:75`, `:99`), `varianceColumns` (`:16-32`) and the file name (`:125`).

- [ ] **Step 7: The findings exports**

Task 2 has rewritten how both routes read the filter. Keep its lines. Only these blocks change, named by content.

- **`src/app/api/audit-findings/export/route.ts`:**
  - Imports:
    - add `import { getTranslations } from "next-intl/server"` after `:1`;
    - add `import { auditExportActionStatusKey, auditExportActionTaken, auditExportFindingTypeKey, auditExportReviewStatusKey, auditExportWord, resolveAuditExportLocale } from "@/lib/audit-export-labels"`.
  - After `requirePermission(user, "audit", "export")` (`:14`):

    ```ts
    const locale = resolveAuditExportLocale(request.nextUrl.searchParams.get("locale"))
    const t = await getTranslations({ locale })
    ```
    `getTranslations` comes before the first `prisma.`, which is allowed: `tests/e2e-cross-cutting.test.ts:46` checks only that the permission comes first.
  - The cells (master `:50-60`):

    ```ts
    findingType: auditExportWord(t, auditExportFindingTypeKey(finding.findingType), finding.findingType),
    // expectedValue / actualValue unchanged
    reviewStatus: auditExportWord(t, auditExportReviewStatusKey(finding.reviewStatus), finding.reviewStatus),
    actionStatus: auditExportWord(t, auditExportActionStatusKey(finding.actionStatus), finding.actionStatus),
    actionOwner: finding.actionOwnerId ? (ownerLabelById.get(finding.actionOwnerId) ?? "") : "",
    // actionDueDate … reviewedAt unchanged
    actionTaken: auditExportActionTaken(t, finding.actionTaken),
    ```
  - Unchanged: the sheet "Audit Findings" (`:41`; `e2e/audit/field-audit.spec.ts:799`, `reports.spec.ts:133`), `auditFindingColumns` and the file name.
- **`src/app/api/audit-findings/export-pdf/route.ts`:**
  - Imports:
    - add `import { getTranslations } from "next-intl/server"`;
    - add `import { auditExportActionStatusKey, auditExportActionTaken, auditExportFindingTypeKey, auditExportReviewStatusKey, auditExportWord, buildAuditFindingExportFilterWords, resolveAuditExportLocale } from "@/lib/audit-export-labels"`;
    - add Task 2's `auditFindingFilterLabelKeys` to its existing `@/lib/audit-finding-filters` import.
  - After `requirePermission(…)` (`:17`), the locale and `t` as in the Excel route.
  - Beside the `findings` read, the round's number for the filter line (the page's round chip reads it the same way, `page.tsx:129-130`):

    ```ts
    const filterRound = roundId ? await prisma.auditRound.findUnique({ where: { id: roundId }, select: { auditNo: true } }) : null
    ```
  - `:43-63`:

    ```ts
    const buffer = await renderAuditFindingPdf({
      // The tab in use and its chip in the page's words (Task 2, P4-R3), never the URL value.
      title: t("auditFinding.exportPdfTitle", { filter: auditFindingFilterLabelKeys(status).map((key) => t(key)).join(" · ") }),
      subtitle: t("auditRound.exportPdfFilter", { filter: buildAuditFindingExportFilterWords({ roundNo: filterRound?.auditNo ?? null, findingType: findingType ?? null, search: search ?? null }, t) }),
      summary: [
        { label: t("auditFinding.exportSummary_total"), value: findings.length },
        { label: t("auditFinding.exportSummary_pending"), value: findings.filter((finding) => finding.reviewStatus === "pending").length },
        { label: t("auditFinding.exportSummary_approved"), value: findings.filter((finding) => finding.reviewStatus === "approved").length },
        { label: t("auditFinding.exportSummary_rejectedOrException"), value: findings.filter((finding) => finding.reviewStatus === "rejected" || finding.reviewStatus === "exception").length },
      ],
      rows: findings.map((finding) => ({
        reportedAt: formatDateTime(finding.reportedAt),
        auditNo: finding.auditRound.auditNo,
        assetTag: finding.asset?.assetTag ?? "",
        findingType: auditExportWord(t, auditExportFindingTypeKey(finding.findingType), finding.findingType),
        expectedValue: formatFindingValue(finding.findingType, finding.expectedValue, valueLabels),
        actualValue: formatFindingValue(finding.findingType, finding.actualValue, valueLabels),
        reviewStatus: auditExportWord(t, auditExportReviewStatusKey(finding.reviewStatus), finding.reviewStatus),
        actionStatus: auditExportWord(t, auditExportActionStatusKey(finding.actionStatus), finding.actionStatus),
        actionOwner: finding.actionOwnerId ? (ownerCodeById.get(finding.actionOwnerId) ?? "") : "",
        actionTaken: auditExportActionTaken(t, finding.actionTaken),
      })),
    })
    ```
    `status` (already `resolveAuditFindingStatus`'s), `roundId`, `findingType` and `search` are the route's names, which Task 2 keeps (`export-pdf/route.ts:19-22`). The filter line reads the raw `findingType`; `buildAuditFindingExportFilterWords` leaves an unknown one out.

- [ ] **Step 8: The links carry the language**

- **`src/lib/audit-round-result-filters.ts:373-376`:**

  ```ts
  /** The round's exports: the list's own filter params, with no page, returnTo or hash, then the page's language for the
   *  file's words (P4-R7). */
  export function buildAuditRoundExportHref(locale: string, roundId: string, endpoint: AuditRoundExportEndpoint, filters: AuditRoundListHrefFilters): string {
    const params = writeAuditRoundListParams(filters)
    params.set("locale", locale)
    return `/api/audit-rounds/${roundId}/${endpoint}?${params.toString()}`
  }
  ```
  - The route ignores `locale` when it parses the filters: `parseAuditRoundListFilters` reads only its named params (`:91-103`).
- **`src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx:112-114`:** `buildAuditRoundExportHref(locale, round.id, "export", filters)`, and the same for `"export-pdf"` and `"variance-export"`.
- **`src/app/[locale]/(dashboard)/reports/page.tsx`:**
  - `:616`: ``href: `/api/audit-findings/export?status=pending&locale=${locale}` ``;
  - `:658`: ``exportHref: `/api/audit-findings/export?status=all&locale=${locale}` ``;
  - `:659`: ``exportHref: `/api/audit-findings/export-pdf?status=all&locale=${locale}` ``.
  - `locale` is the page's own (`:658` already reads it for `viewHref`).
  - `e2e/cross-cutting/reports.spec.ts:66` reads `a[href^="/api/audit-findings/export"]`, a prefix, so it still matches.
- **The findings page** is Task 3's: its "ส่งออก ▾" hrefs already carry `locale=` (Interfaces). Nothing changes there.

- [ ] **Step 9: Run the test to verify it passes**

Run: `node --test tests/audit-export-labels.test.ts tests/audit-item-status-labels.test.ts tests/audit-round-cancellation.test.ts tests/e2e-cross-cutting.test.ts tests/asset-cross-scope-export.test.ts tests/asset-import-field-labels.test.ts tests/asset-history.test.ts tests/audit-excel.test.ts && npx tsc --noEmit`
Expected: PASS. These pins hold:
- `tests/audit-round-cancellation.test.ts:65-85`: `round.status === "cancelled"` is still in the three round routes.
- `tests/e2e-cross-cutting.test.ts:44-47`: `requirePermission(user, "audit", "export")` is still before `prisma.` in the findings Excel route.
- `tests/e2e-cross-cutting.test.ts:96-100`: the reports spec's two GETs are unchanged. They send no locale, so they get Thai cells, the English sheet name and the English headers.
- `tests/asset-history.test.ts:75`: `workbookResponse(buffer, buildAssetHistoryExportFilename(…))`.
- `tests/audit-excel.test.ts:5-12`.
- `tests/list-frame-guards.test.ts:179`: `audit-pdf.tsx` keeps its one `|| "-"`. No new `?? "-"` or `|| "-"` is written; the routes write `""`.

- [ ] **Step 10: Rewrite the pins this task breaks**

- **`tests/audit-round-exports.test.ts:91-92`:**
  - `assert.match(pdf, /\{ label: t\("auditRound\.exportSummary_checked"\), value: summary\.checked \}/)`;
  - `assert.match(pdf, /\{ label: t\("auditRound\.exportSummary_outOfScope"\), value: summary\.outOfScope \}/)`.
- **`tests/audit-round-exports.test.ts:105-112`:** the six rows become:

  ```ts
  for (const row of [
    /\{ metric: t\("auditRound\.varianceMetric_totalExpected"\), count: counts\.all \}/,
    /\{ metric: t\("auditRound\.varianceMetric_matched"\), count: counts\.found \}/,
    /\{ metric: t\("auditRound\.varianceMetric_mismatched"\), count: counts\.mismatch \}/,
    /\{ metric: t\("auditRound\.varianceMetric_pending"\), count: counts\.pending \}/,
    /\{ metric: t\("auditRound\.varianceMetric_notFound"\), count: counts\.notFound \}/,
    /\{ metric: t\("auditRound\.varianceMetric_outOfScopeAssets"\), count: counts\.outOfScope \}/,
  ]) assert.match(route, row)
  ```
  `:116` (`doesNotMatch … Out-of-scope Scan Events`) stays true.
- **`tests/audit-round-exports.test.ts:128-130`:** `buildAuditRoundExportHref\(locale, round\.id, "export", filters\)`, and the same for `"export-pdf"` and `"variance-export"`.
- **`tests/audit-round-result-drilldown.test.ts:96-97`:** the same `locale, ` insertion.
- **`tests/audit-round-result-drilldown.test.ts:146-152`:**
  - the loop over both routes keeps `buildAuditExportFilename` only;
  - the Excel route keeps `buildAuditExportFilterLabel` and `filterLabel`;
  - `:152` becomes:

    ```ts
    assert.match(excelRoute, /buildAuditExportFilterLabel/)
    assert.match(excelRoute, /filterLabel/)
    assert.match(excelRoute, /workbook\.addWorksheet\(buildAuditExportWorksheetName\(filterLabel\)\)/)
    // The PDF's filter line is in words (group 2 plan 4 P4-R7); the file name keeps the code label.
    assert.match(pdfRoute, /const filterWords = buildAuditExportFilterWords\(labelInput, auditExportFilterWords\(t\)\)/)
    assert.match(pdfRoute, /subtitle: `\$\{round\.name\} \| \$\{formatDate\(round\.startDate\)\} - \$\{formatDate\(round\.endDate\)\} \| \$\{t\("auditRound\.exportPdfFilter", \{ filter: filterWords \}\)\}`/)
    ```
- **`tests/audit-round-list-filters.test.ts:161-166`:**

  ```ts
  assert.equal(
    buildAuditRoundExportHref("th", "round-1", "export", full),
    "/api/audit-rounds/round-1/export?result=mismatch&search=PC+1&companyId=c-1&branchId=b-1&categoryId=other&field=location&components=missing&locale=th",
  )
  assert.equal(buildAuditRoundExportHref("en", "round-1", "variance-export", none), "/api/audit-rounds/round-1/variance-export?locale=en")
  assert.equal(buildAuditRoundExportHref("th", "round-1", "export-pdf", { ...none, field: "department" }), "/api/audit-rounds/round-1/export-pdf?field=department&locale=th")
  ```
- **`tests/audit-round-page-rules.test.ts:197-202`:**
  - `:197` becomes `const exported = new URL(buildAuditRoundExportHref("th", "round-1", "export-pdf", filters), "http://local")`;
  - before `:202`'s comparison:

    ```ts
    assert.equal(exported.searchParams.get("locale"), "th", "the page's language for the file's words (P4-R7)")
    exported.searchParams.delete("locale")
    ```
  - the title gains "and the page's language".
- **`tests/audit-round-page-ui.test.ts:47`:** ``new RegExp(`const ${name} = buildAuditRoundExportHref\\(locale, round\\.id, "${endpoint}", filters\\)`)``.
- These stay as they are:
  - `tests/audit-round-exports.test.ts:17-35` (the code label and the file names), `:81-87`, `:113-115`;
  - `tests/audit-finding-resolution.test.ts:30-38` and `:132-148` (as Task 2 left them);
  - `tests/audit-round-result-drilldown.test.ts:102-113`, `:265-276`.

- [ ] **Step 11: Run everything**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. A pin that fails outside the lists above is rewritten in this commit and named in the report.

- [ ] **Step 12: Commit**

```bash
git add src/lib/audit-export-labels.ts src/lib/download-filename.ts src/lib/audit-round-result-filters.ts src/lib/asset-excel.ts src/lib/audit-pdf.tsx "src/app/api/audit-rounds/[id]/export/route.ts" "src/app/api/audit-rounds/[id]/export-pdf/route.ts" "src/app/api/audit-rounds/[id]/variance-export/route.ts" src/app/api/audit-findings/export/route.ts src/app/api/audit-findings/export-pdf/route.ts "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" "src/app/[locale]/(dashboard)/reports/page.tsx" messages/th.json messages/en.json tests/audit-export-labels.test.ts tests/audit-round-exports.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-list-filters.test.ts tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts
git commit -m "fix(audit-exports): the round Excel, PDF and variance report and the findings Excel and PDF write the page's words in the request's language (?locale=, Thai by default; the round page and the reports page send it): every status, result, type, decision and action-plan code and the 13 actionTaken codes (one without words reads blank, never the code), the PDF titles, summaries, filter lines and the variance summary rows; headers and sheet names stay English; an owner the export cannot name reads blank; and a Thai file name no longer breaks the download (filename* with an ASCII filename for every Excel and audit PDF export) (group 2 plan 4 task 6, the plan 2 carry-over, P4-R7 to P4-R9, P4-R29)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: E2E steps on the findings page, the guard tests, the docs, and the whole suite

The audit E2E steps follow the new findings page (§10), and the steps of spec §16 are added. Plan 4 adds no record to the E2E data: every step decides the walk's own five findings.
- **IT staff (block 5).** On the round's findings they get:
  - no tick and no selection bar;
  - a panel, opened from C2's row, that reads the finding with "ส่วนควบของ <P1>" and offers no decision, no plan, no close and no reason box;
  - the 403 refusals, as today.
- **The IT head (block 6).** The pending tab and its counts: รอพิจารณา 5 of the six tabs. Each row has its เรื่อง chip in the short word (P4-R2), and the desktop rows can be ticked.
  - **Component:** C2's row reads "ส่วนควบของ <P1 tag> <P1 name>" (spec §16).
  - **Opening a row:** a click on C2's row opens the panel with `?finding=`, and a reload reopens it. The panel holds:
    - the parent line;
    - "เปิดหน้าทรัพย์สิน";
    - the ไม่พบ sentence, "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน" alone (P4-R24).
  - **Every decision in the panel** is one POST that answers 200, sent without a confirm dialog. The panel then moves to the next finding the IT head may decide, in the tab's order after the decided one, else the first before it (Task 2's next finding, P4-R18), and its "k จาก N" counts those findings.
  - **The department:** the comparison marks แผนก and สภาพ; the sentence reads "ถ้าอนุมัติ ทะเบียนจะเปลี่ยนแผนก จาก … เป็น …"; "อนุมัติทุกช่องของทรัพย์สินนี้" is offered and not pressed.
  - **The condition**, rejected:
    - A reject with an empty reason sends nothing, shows "กรุณาระบุเหตุผลการปฏิเสธ" under the box (P4-R27) and moves focus there.
    - The API answers 400 `VALIDATION_FAILED`, `fieldErrors.reviewRemark: "required"`, for a missing reason and for a blank one.
    - Then it is rejected with a reason.
  - **X1's panel** reads the นอกขอบเขต sentence, with "ถ้าจะย้ายให้ทำรายการโอนย้าย" (P4-R24).
  - **On the desktop, A4 and X1 together** (P4-R26: the phone has no ticks):
    - the header tick ticks both, and the bar reads "2 รายการที่เลือก";
    - "ล้าง" clears them, and both are ticked again;
    - X1 is decided through the API first (P4-R16);
    - "อนุมัติที่เลือก 2 รายการ" opens its one dialog with the optional remark (P4-R25); its "อนุมัติ 2 รายการ" sends both: A4 answers 200 and X1 400;
    - the bar reads "สำเร็จ 1 · ไม่สำเร็จ 1" with X1's line ("มีการพิจารณารายการนี้แล้ว"), the rows leave, and "ปิดผลการพิจารณา" closes the result.
  - **On the phone** (no ticks), A4 and X1 are decided in the panel.
  - **At the end:** the tabs read รอพิจารณา 0 / อนุมัติแล้ว 4 / ปฏิเสธแล้ว 1, with the empty state. The asset check and the close follow, as today.
- **The IT head's own round (block 7):** their own finding's row has no tick. Its panel says why ("ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้") and offers no decision or reason box. The 403 stays.
- **The exports (block 8):**
  - IT staff get no "ส่งออก" button on the findings page.
  - The IT head opens "ส่งออก ▾": two items, the Excel ("ส่งออกรายการไม่ตรง …") and the PDF ("ส่งออก PDF …"), whose hrefs carry `status=all`, the round and `locale=th`. The Excel keeps the sheet "Audit Findings" and the English headers (P4-R7). Its "Finding Type" cells are the Thai words, and no cell of the four code columns holds a raw code (P4-R7, P4-R8).
  - The round's Excel by category: its menu hrefs carry `locale=th`, and its status columns hold no raw code.
- **Roles M4 (`e2e/cross-cutting/roles.spec.ts`):** IT staff get no tick on the global findings page. The panel the first row opens offers none of the four review buttons and no reason box.
- **Dashboard (`e2e/dashboard/dashboard.spec.ts`):** each findings link of งานที่รอคุณ still shows "จาก N รายการ" equal to the bell. It now also lands on its tab: `pending` on รอพิจารณา, and the bell's `action_not_due` / `action_due_soon` on ต้องติดตาม (P4-R3).
- **Not in E2E:**
  - the 409 (P4-R17);
  - the move to the next page (one page of five, and page sizes start at 25);
  - "ปฏิเสธที่เลือก"'s shared reason dialog.

  The unit tests of Tasks 1, 2 and 5 cover them, and the UAT checklist lists them.

The docs record the plan. The controller then runs the targeted set, and after it the whole suite once, which closes page group 2.

**Files:**
- Create:
  - `e2e/audit/review-words.ts`: plain data, no imports. The words the findings steps read, each a `messages/th.json` value.
- Modify. Line numbers are master `704f2b26`. Tasks 1-6 change none of these files, except where a note below says so; re-check each line before editing.
  - `e2e/audit/review-steps.ts`: the whole file, 22 lines.
  - `e2e/audit/field-audit.spec.ts`. Edit from the bottom up, so the numbers hold.
    - `:18-23`: the header list, items 5-8.
    - One import after `:40`.
    - Block 5 (`:587-611`): the signature at `:587`; lines added after `:597`; one settle before `:604`.
    - Block 6 (`:616-648`): rewritten whole. `:650-653` stay as they are; one settle before `:657`.
    - Block 7: `:721-728` (`:726-728` stay); one settle before `:733`.
    - Block 8:
      - `:769-779`: the IT staff test;
      - `:785-808`: the IT head's findings export;
      - lines added after `:842` and after `:861`.
  - `e2e/cross-cutting/roles.spec.ts`: two imports after `:11`; the M4 test at `:126-132`.
  - `e2e/dashboard/dashboard-steps.ts`: one import after `:8`; `FINDING_TABS` after `:65`.
  - `e2e/dashboard/dashboard.spec.ts`: the import at `:16` gains `FINDING_TABS`; one import after `:16`; two lines after `:69`.
  - `tests/e2e-audit.test.ts`: `:253` and `:286`, and one new test after `:385`.
  - `tests/e2e-cross-cutting.test.ts`: one new test after `:270`.
  - `tests/e2e-dashboard.test.ts`: one new test after `:40`.
  - `docs/99_CHANGELOG.md`: a new `## 2026-10-28` heading with its entry, above `## 2026-10-27` (`:7`). If the commit date is later, use that date.
  - `docs/07_UAT_CHECKLIST.md`. Edit from the bottom up.
    - `:154` and `:157` rewritten (`:153`, `:155`, `:156` stay);
    - `:302`, `:304`, `:306`, `:307` rewritten;
    - a new `## Audit Findings B UAT (2026-10-28)` section between `:484` and `## Sign-Off` (`:486`).
  - `DEVELOPER_HANDOFF.md`: one bullet after `:69`; `:71` rewritten; one bullet after `:1245`. Edit from the bottom up.
  - `docs/06_WORKFLOWS.md`: `:159` rewritten.
  - `docs/11_FEATURE_LIST.md`: in `:199`, `:204` and `:248`, the second cell.
- Unchanged and still passing:
  - `tests/e2e-audit.test.ts`:
    - `:206-232` (EA4), whole. Block 5 keeps its note line, both 403 `expectRefusal` lines and both "Forbidden" bodies word for word.
    - Block 6's decision table keeps `type: "<auditFinding.type_*>"` for the four types, `action: "approve", remark` four times and `action: "reject", remark` once. It also keeps `expect(mismatch.department?.code, "the approved department").toBe(runDepartment)`, the close words and the next-step lines.
    - `review-steps.ts` still exports `function findingEntry(` (not async) and `async function browserFetch(`.
    - `:234-252`, `:254-262` (EA5, apart from `:253`): the own-round lines stay. The round page's export menu lines and the `W.exportMenu` lines stay; one more copy is added on the findings page.
    - `:264-287` (apart from the `:286` comment), `:289-385`.
  - `tests/e2e-fixes.test.ts:359-363`: block 5 keeps `await expect(page.getByText("ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้").filter({ visible: true })).toHaveCount(0)` word for word, and no `.first()).toBeVisible()` on it.
  - `tests/e2e-audit-rounds.test.ts:136-145`: the round-page block (`:504-582`) is untouched.
  - `tests/e2e-cross-cutting.test.ts`:
    - `:96-100`: `reports.spec.ts` is unchanged. Its GETs keep `status=all&search=${runId}`, and the sheet stays "Audit Findings" (P4-R7).
    - `:127-137`: no new route (P4-R4).
    - `:155`: `REVIEW_BUTTON_NAMES`.
    - `:185-188`: M4 is not `test.fail`.
  - `tests/e2e-dashboard.test.ts:11-40`.
  - `tests/e2e-review.test.ts:88-112`: no hazard and no DELETE in the new or changed files.
  - `tests/e2e-suite.test.ts`: the specs take `test` from `../support/fixtures.ts`.
  - The docs pins: `tests/e2e-docs.test.ts`, `tests/shell-docs.test.ts`.
- No message changes. Every word the steps read is a `messages/th.json` value that Tasks 3-5 put there, or that exists already. Step 1's guard test checks each one. Tasks 3-5 own the keys; the words they must give are listed under Consumes.

**Interfaces:**
- Consumes. This is the contract of Tasks 1-6 that the steps stand on. A reviewer checks each landed task against it.
  - **The findings page `/th/audit/findings`, Tasks 2-5 (spec §10).** Each line names the task that produces it; the hooks and words are those tasks' own (their "markup Task 7's E2E reads" lists):
    - **Title:** the h1 stays "รายการไม่ตรงจากการตรวจนับ" (`auditFinding.title`).
    - **Tabs (Task 3, counts Task 2):**
      - A `TabNav` named exactly "ตัวกรองงาน" (`auditFinding.quickFilters`, kept), with six links in this order: รอพิจารณา / อนุมัติแล้ว / ปฏิเสธแล้ว / ต้องติดตาม / ปิดแล้ว / ทั้งหมด (`status_pending`, `status_approved`, `status_rejected`, Task 2's `tabFollowUp`, `filterClosed`, `status_all`).
      - Each link's text is its label, then its count in TabNav's count span, "0" included.
      - The current tab has `aria-current="page"`.
      - Each count is the number of rows its tab lists within the round, type and search filters (spec §5, P4-R1).
      - The sub-chips sit in another nav ("งานที่ต้องติดตาม"), not in that one.
    - **Old URL values (P4-R3, Task 2):**
      - `pending` opens รอพิจารณา;
      - `action_open`, `overdue` and `exception` open ต้องติดตาม;
      - `closed` opens ปิดแล้ว;
      - `action_not_due` and `action_due_soon` open ต้องติดตาม as the current tab, and list the bell's where, so the pager line "{from}–{to} จาก {total} รายการ" (`common.showingRange`, kept) totals the bell's count.
    - **Rows (Task 3):**
      - Desktop: `tbody tr[data-audit-finding-row="<finding id>"][data-finding-type="<findingType code>"]` (the row's `rowData`).
      - Phone: `article[data-audit-finding-card="<finding id>"][data-finding-type="<code>"]`.
      - One per finding on the page, in the page's order (`reportedAt` desc, `id` asc).
    - **Inside each row or card (Task 3):**
      - `[data-audit-finding-subject]`: the เรื่อง `Chip`, whose text is exactly the short word: `wrong_location` ที่ตั้ง, `wrong_custodian` ผู้ถือครอง, `wrong_department` แผนก, `wrong_condition` สภาพ, `not_found` ไม่พบ, `out_of_scope` นอกขอบเขต (P4-R2). The words are the values of `auditRound.differenceField_*`, `auditRound.notFound` and `auditRound.outOfScope`, read through Task 2's `auditFindingTypeShortLabelKeys`.
      - The asset's tag.
      - For a component with an installed parent, the text "ส่วนควบของ {parent tag} {parent name}" (`auditFinding.componentOfParent`, "ส่วนควบของ {assetTag} {name}").
    - **Choosing a finding (Task 3):**
      - Desktop: a click on the row's `[data-audit-finding-subject]` (a part of the row that is no control) goes to the same URL with `finding=<id>` added (after `page` / `pageSize`, before `returnTo`). The other params stay.
      - Phone: a click on the card opens it through its stretched link.
      - Desktop: the row of `?finding=` has `aria-current="true"`, and no other row has it.
    - **Ticks (Task 5; desktop only, P4-R26):**
      - A user with `audit:approve` gets exactly one checkbox per row Task 2 marks `reviewable` (a pending finding they did not report, on an open round). No other row has one, and no phone card shows one.
      - The table head holds a checkbox named exactly "เลือกทุกรายการที่พิจารณาได้ในหน้านี้" (`auditFinding.selectAllOnPage`). Checking it ticks every tickable row of the page.
      - Without `audit:approve` there is no checkbox in `main`.
    - **Selection bar** (`DesktopSelectionBar`, Task 5): its root has `data-slot="desktop-selection-bar"`.
      - With nothing ticked and no result on screen, it is not rendered.
      - With N ticked, it holds:
        - "{count} รายการที่เลือก";
        - a button named exactly "ล้าง", which unticks all and hides the bar;
        - a button named exactly "ปฏิเสธที่เลือก";
        - a button named exactly "อนุมัติที่เลือก {count} รายการ".
    - **"อนุมัติที่เลือก N รายการ" (Task 5, P4-R25):**
      - It opens one dialog named "อนุมัติ {count} รายการที่เลือก" (`batchApproveTitle`) with the optional field "หมายเหตุ (ไม่บังคับ)" and the submit "อนุมัติ {count} รายการ" (`batchApproveConfirm`). Nothing is sent before that submit.
      - The submit sends one `POST /api/audit-findings/<id>/review` `{ action: "approve", reviewRemark }` per ticked finding, one by one. It never sends `confirmConflict`, and it goes past a failure.
      - After the last answer:
        - the bar's `role="status"` reads "สำเร็จ {succeeded} · ไม่สำเร็จ {failed}" (Task 4's `reviewResultSummary`) until "ปิดผลการพิจารณา" (`batchResultDismiss`) closes it;
        - each failure is one list item of the bar, "<tag> <เรื่อง word>: <reason>", the reason in Task 4's words (`reviewFailure_alreadyDecided` "มีการพิจารณารายการนี้แล้ว");
        - the ticks clear;
        - the page refreshes, so decided rows leave the pending tab.
    - **Panel (Tasks 3-4):** with `?finding=<id>`, exactly one visible `[data-audit-finding-panel]` with `data-finding-id="<id>"`. On the desktop it is the right pane; on the phone it is full screen. It holds:
      - the finding's long type label (`auditFinding.type_*`);
      - the asset's tag;
      - a link named exactly "เปิดหน้าทรัพย์สิน" (`auditFinding.openAsset`), whose href path is `/th/assets/<asset id>` (a query may follow);
      - for a component, "ส่วนควบของ {parent tag} {parent name}";
      - the comparison: one `[data-audit-finding-field="<location|custodian|department|condition>"]` per field. The fields where the item's expected and found values differ have `data-mismatch="true"`. For A2 these are `department` and `condition`; `location` is present and not marked;
      - the consequence sentence, `[data-audit-finding-effect]` (pending only), exactly:
        - for a field type, "ถ้าอนุมัติ ทะเบียนจะเปลี่ยน{field} จาก {from} เป็น {to}" filled. `{field}` is the short word. `{from}` and `{to}` are the value labels: "<code> - <name>" for a department, `nameTh` for a condition;
        - for `out_of_scope`, "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย" (`effectNoChangeOutOfScope`);
        - for `not_found`, "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน" alone (`effectNoChangeNotFound`, P4-R24).
    - **In the panel, for a user with `audit:approve`, on a pending finding they did not report (Task 4):**
      - the textarea `#audit-review-reason`, with the visible label text "เหตุผล (ต้องกรอกเมื่อปฏิเสธ)";
      - buttons named exactly "อนุมัติ" and "ปฏิเสธ" (`auditFinding.approve` / `reject`, kept: `WRITE_BUTTON_NAMES`);
      - `[data-audit-finding-position]` "{position} จาก {total}" (`positionOf`): the position is the finding's 1-based place among the findings the viewer may decide in the tab's order, the total their count (Task 2's `queue`). In the walk every pending finding is one the IT head may decide, so it is the place in the page's order and the tab's count;
      - a button named exactly "อนุมัติทุกช่องของทรัพย์สินนี้" when the asset has another pending finding the viewer may decide, and none otherwise.
    - **"ปฏิเสธ" with an empty or blank box (Task 4, P4-R27):**
      - sends no request;
      - `#audit-review-reason-error` reads exactly "กรุณาระบุเหตุผลการปฏิเสธ" (`auditFinding.reviewReasonRequired`);
      - the textarea has `aria-invalid="true"` and the focus.
    - **"อนุมัติ", or "ปฏิเสธ" with a reason:**
      - sends one POST, with no dialog in between, and it answers 200;
      - then the URL's `finding` and the panel move to the next finding.
    - **The next finding (P4-R18, Task 2):** the first finding the viewer may decide after the decided one in the tab's order; with none after it, the first such one before it; with none at all, `finding` leaves the URL and the panel has no "อนุมัติ". Its link carries no page, so the list opens at the page that holds it.
    - **Without the decide controls:**
      - **Own finding:** an approver who reported it gets no "อนุมัติ" / "ปฏิเสธ" and no `#audit-review-reason`. The panel holds "ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้" (`auditFinding.segregationReviewBlocked`, kept).
      - **Without `audit:approve`:** no visible button in `main` named "อนุมัติ", "ปฏิเสธ", "แผนแก้ไข" or "ปิดรายการไม่ตรง" (`auditFinding.actionPlan` / `closeFinding`, kept), whether in the panel or the list. There is also no `#audit-review-reason`, no checkbox, no selection bar and no segregation note.
    - **Reload:** a reload with `?finding=` reopens the same panel.
    - **Export (Task 3):**
      - With `audit:export`, a button in `main` named exactly "ส่งออก" (`common.export`) opens a menu of exactly two `menuitem`s, each an `<a … download>`:
        - one whose text starts with "ส่งออกรายการไม่ตรง" (`auditFinding.exportFindings`), href `/api/audit-findings/export?…`;
        - one whose text starts with "ส่งออก PDF" (`auditFinding.exportFindingsPdf`), href `/api/audit-findings/export-pdf?…`.
        - Each query carries `status`, `roundId` (when set) and `locale=<the page's locale>`.
      - Without `audit:export`, there is no such button and no `a[href^="/api/audit-findings/export"]` in `main`.
    - **Empty state:** a tab with no rows shows one visible "ไม่พบรายการไม่ตรงตามตัวกรอง" (`auditFinding.emptyTitle`, kept).
  - **The review API, Task 1:**
    - **A reject with no reason:** on a pending finding of an open round, from an approver who is not the reporter, `{ action: "reject" }` and `{ action: "reject", reviewRemark: "   " }` each answer 400 with exactly `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } }`. The schema runs after the read-only check and before the already-decided check.
    - A decision on a finding already decided answers 400 (`R:115`, kept) and changes nothing (P4-R6).
    - `{ action: "approve", reviewRemark }` on a pending finding answers 200.
    - The 403 for a missing permission comes before the body is read. The own-finding 403 body is unchanged.
  - **Exports, Task 6 (P4-R7, P4-R8):**
    - **Findings Excel:** the sheet stays "Audit Findings", and the headers stay English: "Asset Tag", "Finding Type", "Review Status", "Action Status", "Action Taken".
      - "Finding Type" reads `auditFinding.type_*` in Thai for `locale=th`.
      - No cell of the four code columns matches `/^[a-z]+(?:_[a-z]+)*$/`.
    - **The round's Excel:** the first sheet's headers stay English ("Asset Tag", "Audit Status", "Audit Result", "Reconcile Status"), and no cell of the three status columns matches that pattern.
    - The round page's three export menu hrefs carry `locale=th` (Task 6 adds `locale` to `buildAuditRoundExportHref`).
  - **Unchanged:**
    - The round page's "รอ 5" links keep `^/th/audit/findings\?status=pending&roundId=<id>(?:&|$)` (block 4).
    - `pending.markNotFound` returns the finding id.
    - `reports.spec.ts` M1 and its GETs.
  - **Existing helpers:**
    - `recordSettled` (`e2e/audit/settle.ts`);
    - `settlePageRequests` (`e2e/audit/round-page-steps.ts:69`);
    - `fillTemplate` (`e2e/shell/shell-words.ts:24`);
    - `escapeRegExp` (`e2e/audit/scan-steps.ts`);
    - `runRecords(runId).department` (`{ code; name }`, `e2e/support/run-plan.ts:83`);
    - the chain's `records.department` (`{ code; name }`), `assets.<key>` (`{ id; tag; name }`) and `notFoundFindingId`;
    - `ROUND_PAGE_WORDS.exportMenu` ("ส่งออก").
- Produces:
  - `e2e/audit/review-words.ts`: `REVIEW_WORDS` (below).
  - `e2e/audit/review-steps.ts`:
    - `type AuditFindingTypeCode = "wrong_location" | "wrong_custodian" | "wrong_department" | "wrong_condition" | "not_found" | "out_of_scope"`;
    - `findingRows(page: Page, device: E2eDevice): Locator`;
    - `findingEntry(page: Page, device: E2eDevice, tag: string, type: AuditFindingTypeCode): Locator` (was `(page, device, tag, typeLabel: string)`);
    - `findingId(entry: Locator, device: E2eDevice): Promise<string>`;
    - `readFindingOrder(page: Page, device: E2eDevice): Promise<string[]>`;
    - `openFinding(page: Page, entry: Locator, id: string): Promise<void>`;
    - `findingPanel(page: Page): Locator`;
    - `findingTabs(page: Page): Locator`;
    - `currentFindingTab(page: Page): Locator`;
    - `expectTabs(page: Page, expected: readonly (readonly [string, number])[], current: string): Promise<void>`;
    - `selectionBar(page: Page): Locator`;
    - `nextPendingAfter(order: readonly string[], id: string): string | null`;
    - `reviewResponse(page: Page, findingId: string): Promise<Response>`;
    - `watchReviewPosts(page: Page, findingId: string): { posts: string[]; stop: () => void }`;
    - `rawCodeCells(sheet: Worksheet, headers: readonly string[]): string[]`;
    - `browserFetch` (kept, unchanged).
  - `e2e/dashboard/dashboard-steps.ts`: `FINDING_TABS: Readonly<Record<string, string>>`.

- [ ] **Step 1: Write the words file and the guard tests, so they fail**

`e2e/audit/review-words.ts`:

```ts
// The words the findings steps read (group 2 spec §10, §16), each a value of messages/th.json (tests/e2e-audit.test.ts
// checks them). Plain data, no imports, so the node test can load it. The placeholders are the steps' own names; the
// test compares the texts with every placeholder alike.
export const REVIEW_WORDS = {
  // The page.
  title: "รายการไม่ตรงจากการตรวจนับ",
  emptyTitle: "ไม่พบรายการไม่ตรงตามตัวกรอง",
  // The six tabs, in order, and their nav's name (P4-R1, P4-R3).
  tabsLabel: "ตัวกรองงาน",
  tabPending: "รอพิจารณา",
  tabApproved: "อนุมัติแล้ว",
  tabRejected: "ปฏิเสธแล้ว",
  tabFollowUp: "ต้องติดตาม",
  tabClosed: "ปิดแล้ว",
  tabAll: "ทั้งหมด",
  // The เรื่อง chip's short words (P4-R2).
  subjectLocation: "ที่ตั้ง",
  subjectCustodian: "ผู้ถือครอง",
  subjectDepartment: "แผนก",
  subjectCondition: "สภาพ",
  subjectNotFound: "ไม่พบ",
  subjectOutOfScope: "นอกขอบเขต",
  // A component's machine, in the row and in the panel (spec §10, decision 6).
  componentOf: "ส่วนควบของ {parentTag} {parentName}",
  // The panel (spec §10); ไม่พบ's sentence stops before the transfer (P4-R24).
  openAsset: "เปิดหน้าทรัพย์สิน",
  approveChanges: "ถ้าอนุมัติ ทะเบียนจะเปลี่ยน{field} จาก {from} เป็น {to}",
  approveNoChangeOutOfScope: "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย",
  approveNoChangeNotFound: "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน",
  reasonLabel: "เหตุผล (ต้องกรอกเมื่อปฏิเสธ)",
  rejectReasonRequired: "กรุณาระบุเหตุผลการปฏิเสธ",
  approve: "อนุมัติ",
  reject: "ปฏิเสธ",
  position: "{position} จาก {total}",
  approveAllFields: "อนุมัติทุกช่องของทรัพย์สินนี้",
  ownFinding: "ไม่สามารถพิจารณารายการไม่ตรงที่คุณเป็นผู้รายงานเองได้",
  // The follow-up controls, which need audit:approve (finding M4).
  actionPlan: "แผนแก้ไข",
  closeFinding: "ปิดรายการไม่ตรง",
  // The ticks, the selection bar and its one dialog (spec §10, bugs 17-18, P4-R25).
  selectAll: "เลือกทุกรายการที่พิจารณาได้ในหน้านี้",
  selectedCount: "{count} รายการที่เลือก",
  clearSelection: "ล้าง",
  rejectSelected: "ปฏิเสธที่เลือก",
  approveSelected: "อนุมัติที่เลือก {count} รายการ",
  batchApproveTitle: "อนุมัติ {count} รายการที่เลือก",
  batchApproveConfirm: "อนุมัติ {count} รายการ",
  batchResult: "สำเร็จ {succeeded} · ไม่สำเร็จ {failed}",
  batchFailedAlreadyDecided: "มีการพิจารณารายการนี้แล้ว",
  batchResultDismiss: "ปิดผลการพิจารณา",
  // "ส่งออก ▾" (spec §10) and its two items.
  exportMenu: "ส่งออก",
  exportExcel: "ส่งออกรายการไม่ตรง",
  exportPdf: "ส่งออก PDF",
} as const
```

`tests/e2e-audit.test.ts`:
- `:253` becomes:

```ts
  // Group 2 plan 4 (spec §10): the findings export sits in "ส่งออก ▾", no longer a link of its own.
  assert.ok(!exports.includes(`{ name: "ส่งออกรายการไม่ตรง" }`), "no findings export link")
```

- `:286` becomes:

```ts
  // "ส่วนควบของ <parent>" on the findings page is block 6's step (group 2 plan 4, spec §16).
```

- After `:385`, a new test:

```ts
test("the findings page in the walk: a row opens the panel with ?finding=, a decision moves to the next, a reject without a reason is refused, a component names its machine, a batch reports one failure on purpose, and the export sits in ส่งออก ▾ (group 2 plan 4 task 7)", async () => {
  const { REVIEW_WORDS: R } = await import("../e2e/audit/review-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(R)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  // The words that stay, by their keys (the review buttons are refusals.ts's WRITE_BUTTON_NAMES too).
  const finding = th.auditFinding as Record<string, string>
  for (const [name, key] of [
    ["title", "title"], ["emptyTitle", "emptyTitle"], ["tabsLabel", "quickFilters"], ["tabPending", "status_pending"], ["tabApproved", "status_approved"], ["tabRejected", "status_rejected"], ["tabFollowUp", "tabFollowUp"], ["tabClosed", "filterClosed"], ["tabAll", "status_all"],
    ["approve", "approve"], ["reject", "reject"], ["actionPlan", "actionPlan"], ["closeFinding", "closeFinding"], ["ownFinding", "segregationReviewBlocked"], ["openAsset", "openAsset"], ["reasonLabel", "reviewReasonLabel"], ["rejectReasonRequired", "reviewReasonRequired"],
    ["approveNoChangeOutOfScope", "effectNoChangeOutOfScope"], ["approveNoChangeNotFound", "effectNoChangeNotFound"], ["approveAllFields", "approveAllFields"],
    ["selectAll", "selectAllOnPage"], ["clearSelection", "clearSelection"], ["rejectSelected", "rejectSelected"], ["batchApproveTitle", "batchApproveTitle"], ["batchApproveConfirm", "batchApproveConfirm"], ["batchResult", "reviewResultSummary"], ["batchFailedAlreadyDecided", "reviewFailure_alreadyDecided"], ["batchResultDismiss", "batchResultDismiss"],
    ["exportExcel", "exportFindings"], ["exportPdf", "exportFindingsPdf"],
  ] as const) {
    assert.equal(R[name], finding[key], name)
  }
  // The เรื่อง chip reads the round page's short words (P4-R2).
  const round = th.auditRound as Record<string, string>
  for (const [name, key] of [["subjectLocation", "differenceField_location"], ["subjectCustodian", "differenceField_custodian"], ["subjectDepartment", "differenceField_department"], ["subjectCondition", "differenceField_condition"], ["subjectNotFound", "notFound"], ["subjectOutOfScope", "outOfScope"]] as const) {
    assert.equal(R[name], round[key], name)
  }
  assert.equal(R.exportMenu, th.common.export)

  // The steps, and the next finding on one page (P4-R18): the one after, else the first before it (the page's first);
  // none when it was the last.
  const steps = await import("../e2e/audit/review-steps.ts")
  assert.equal(steps.nextPendingAfter(["a", "b", "c"], "b"), "c")
  assert.equal(steps.nextPendingAfter(["a", "b", "c"], "c"), "a")
  assert.equal(steps.nextPendingAfter(["a"], "a"), null)
  assert.throws(() => steps.nextPendingAfter(["a"], "z"), /not in the page's order/)
  const source = read("e2e/audit/review-steps.ts")
  for (const name of ["findingRows", "findingEntry", "findingId", "readFindingOrder", "openFinding", "findingPanel", "findingTabs", "currentFindingTab", "expectTabs", "selectionBar", "nextPendingAfter", "reviewResponse", "watchReviewPosts", "rawCodeCells", "browserFetch"]) {
    assert.match(source, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  assert.ok(source.includes('return page.locator("[data-audit-finding-panel]").filter({ visible: true })'))
  assert.ok(source.includes('await (card ? entry : entry.locator("[data-audit-finding-subject]")).click()'), "a row opens the panel by a click on its chip, not its link; a card by its stretched link")
  // The markup the steps read (Tasks 3-5).
  const findingsDir = "src/app/[locale]/(dashboard)/audit/findings"
  const sources = [
    ...readdirSync(findingsDir).filter((file) => file.endsWith(".tsx")).map((file) => read(`${findingsDir}/${file}`)),
    ...readdirSync("src/components/audit").map((file) => read(`src/components/audit/${file}`)),
    read("src/components/ui/desktop-selection-bar.tsx"),
  ].join("\n")
  for (const hook of ["data-audit-finding-row", "data-audit-finding-card", "data-finding-type", "data-audit-finding-subject", "data-audit-finding-panel", "data-audit-finding-panel-empty", "data-finding-id", "data-audit-finding-field", "data-audit-finding-effect", 'data-slot="desktop-selection-bar"', '"audit-review-reason"']) {
    assert.ok(sources.includes(hook), hook)
  }

  const spec = read(SPEC)
  // Block 5: IT staff get no tick, and the panel a row opens decides nothing (decision DX3, spec §10).
  const refused = block(spec, "IT staff are refused the review and the close")
  assert.ok(refused.includes(`await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)`))
  assert.match(refused, /await roundPage\.settlePageRequests\(page\)\n\s*await review\.openFinding\(page, component, componentId\)/)
  assert.ok(refused.includes("for (const name of [R.approve, R.reject, R.actionPlan, R.closeFinding]) await expect(panel.getByRole(\"button\", { name, exact: true })).toHaveCount(0)"))
  assert.ok(refused.includes(`await expect(page.locator("#audit-review-reason")).toHaveCount(0)`))

  // Block 6: the panel, the next finding, the refused reject, the component's machine, the batch.
  const head = block(spec, "The IT head reviews and closes")
  assert.ok(head.includes("await review.expectTabs(page, [[R.tabPending, 5], [R.tabApproved, 0], [R.tabRejected, 0], [R.tabFollowUp, 0], [R.tabClosed, 0], [R.tabAll, 5]], R.tabPending)"))
  assert.ok(head.includes("await review.expectTabs(page, [[R.tabPending, 0], [R.tabApproved, 4], [R.tabRejected, 1], [R.tabFollowUp, 0], [R.tabClosed, 0], [R.tabAll, 5]], R.tabPending)"))
  assert.ok(head.includes(`expect(ids.notFound, "the not-found save's finding").toBe(chain.notFoundFindingId)`))
  assert.ok(head.includes("const parentLine = fillTemplate(R.componentOf, { parentTag: assets.parent.tag, parentName: assets.parent.name })"))
  assert.ok(head.includes("await expect(component).toContainText(parentLine)") && head.includes("await expect(panel).toContainText(parentLine)"))
  assert.match(head, /await roundPage\.settlePageRequests\(page\)\n\s*await page\.reload\(\)/)
  assert.ok(head.includes(`expect((await reviewed).status(), "the decision is taken at once").toBe(200)`))
  assert.ok(head.includes(`await page.waitForURL((url) => url.searchParams.get("finding") === next)`))
  assert.ok(head.includes("fillTemplate(R.position, { position: order.indexOf(id) + 1, total: order.length })"))
  assert.ok(head.includes(`await expect(page.locator("#audit-review-reason-error")).toHaveText(R.rejectReasonRequired)`), "the reject's own sentence (P4-R27)")
  assert.ok(head.includes(`expect(posts.posts, "a reject without a reason sends nothing").toEqual([])`))
  assert.ok(head.includes(`toEqual({ status: 400, body: { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } } })`))
  // The consequence sentence per type (P4-R24): ไม่พบ alone, นอกขอบเขต with the transfer.
  assert.ok(head.includes("await expect(effect).toHaveText(R.approveNoChangeNotFound)") && head.includes("await expect(effect).toHaveText(R.approveNoChangeOutOfScope)"))
  assert.equal((head.match(/measure\.expectRefusal\(\{ method: "POST", url: new RegExp\(`\/api\/audit-findings\/\$\{ids\.(?:condition|outOfScope)\}\/review\$`\), status: 400, /g) ?? []).length, 2)
  assert.ok(head.includes(`expect(earlier.status, "X1 decided through the API before the batch (P4-R16)").toBe(200)`))
  assert.ok(head.includes("fillTemplate(R.approveSelected, { count: 2 })") && head.includes("fillTemplate(R.batchResult, { succeeded: 1, failed: 1 })"))
  assert.ok(head.includes(`expect(outOfScope.status(), "X1 was decided already: one failure, and the batch goes on").toBe(400)`))
  // The panel decides with no dialog (spec §10); the bar's batch asks once in its own (P4-R25).
  assert.ok(!head.includes("ยืนยันการอนุมัติรายการไม่ตรง"), "no decision dialog in the panel (spec §10)")
  assert.equal((head.match(/getByRole\("dialog"/g) ?? []).length, 1, "one dialog: the batch's")
  assert.ok(head.includes('page.getByRole("dialog", { name: fillTemplate(R.batchApproveTitle, { count: 2 }) })'))
  // Every navigation of the block waits for the page's requests first (E2E-1027B/C).
  const gotos = head.match(/await page\.(?:goto|reload)\(/g) ?? []
  assert.equal((head.match(/await roundPage\.settlePageRequests\(page\)\n\s*await page\.(?:goto|reload)\(/g) ?? []).length, gotos.length)

  // Block 7: the own finding has no tick, and the panel says why (spec §10, Appendix A §10).
  const own = block(spec, "The IT head's own round")
  assert.ok(own.includes(`await expect(entry.getByRole("checkbox")).toHaveCount(0)`))
  assert.ok(own.includes("await expect(panel.getByText(R.ownFinding)).toBeVisible()"))

  // Block 8: the findings export in "ส่งออก ▾" with the round and the locale; the files speak words (P4-R7, P4-R8).
  const exports = block(spec, "The audit exports by permission")
  assert.ok(exports.includes(`await expect(page.locator('main a[href^="/api/audit-findings/export"]')).toHaveCount(0)`))
  assert.ok(exports.includes('for (const param of ["status=all", `roundId=${chain.roundId}`, "locale=th"])'))
  assert.ok(exports.includes(`expect(review.rawCodeCells(sheet, ["Finding Type", "Review Status", "Action Status", "Action Taken"]), "no raw code in a cell (P4-R7, P4-R8)").toEqual([])`))
  assert.ok(exports.includes(`expect(review.rawCodeCells(sheet, ["Audit Status", "Audit Result", "Reconcile Status"]), "no raw code in a cell (P4-R7)").toEqual([])`))
})
```

`tests/e2e-cross-cutting.test.ts`: after `:270`, a new test:

```ts
test("finding M4 holds in the findings panel: IT staff get no tick, and a finding they open offers no review control or reason box (group 2 plan 4 task 7)", () => {
  const spec = read("e2e/cross-cutting/roles.spec.ts")
  const m4 = spec.slice(spec.indexOf('test("the findings page offers IT staff no review control'), spec.indexOf('test.describe("the employee"'))
  assert.ok(m4.includes(`await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)`), "no tick, so no selection bar")
  assert.match(m4, /await settlePageRequests\(page\)\n\s*await openFinding\(page, first, id\)/)
  assert.ok(m4.includes(`for (const name of REVIEW_BUTTON_NAMES) await expect(findingPanel(page).getByRole("button", { name, exact: true })).toHaveCount(0)`))
  assert.ok(m4.includes(`await expect(page.locator("#audit-review-reason")).toHaveCount(0)`))
  assert.ok(spec.includes(`from "../audit/review-steps.ts"`) && spec.includes(`from "../audit/round-page-steps.ts"`))
})
```

`tests/e2e-dashboard.test.ts`: after `:40`, a new test:

```ts
test("each findings link of งานที่รอคุณ lands on its tab: pending on รอพิจารณา, the bell's open and due-soon actions on ต้องติดตาม (group 2 plan 4 task 7, P4-R3)", () => {
  const steps = read("e2e/dashboard/dashboard-steps.ts")
  assert.ok(steps.includes(`import { REVIEW_WORDS } from "../audit/review-words.ts"`))
  for (const line of ["pendingAuditFindings: REVIEW_WORDS.tabPending,", "openAuditActions: REVIEW_WORDS.tabFollowUp,", "auditActionsDueSoon: REVIEW_WORDS.tabFollowUp,"]) assert.ok(steps.includes(line), line)
  const spec = read("e2e/dashboard/dashboard.spec.ts")
  assert.ok(spec.includes("const tab = FINDING_TABS[list.key]"))
  assert.ok(spec.includes("if (tab) await expect(currentFindingTab(page), list.key).toHaveText(new RegExp(`^${escapeRegExp(tab)}`))"))
})
```

- [ ] **Step 2: Run the guard tests to see them fail**

Run: `node --test tests/e2e-audit.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-dashboard.test.ts tests/e2e-fixes.test.ts tests/e2e-audit-rounds.test.ts`
Expected: FAIL. In detail:
- `e2e-audit`:
  - EA5 fails at the new `:253`: block 8 still has `{ name: "ส่งออกรายการไม่ตรง" }`;
  - the new test fails: `review-steps.ts` exports none of the new helpers, and the spec has none of the new steps;
  - if Tasks 3-5 have landed, the words and the markup hooks pass;
  - EA1-EA4 and the plan 2 and plan 3 tests pass.
- `e2e-cross-cutting` and `e2e-dashboard`: each new test fails, and the others pass.
- `e2e-fixes` and `e2e-audit-rounds` pass.

- [ ] **Step 3: Rewrite the review helpers**

`e2e/audit/review-steps.ts`. The whole file becomes:

```ts
// The findings page (/th/audit/findings, messages/th.json auditFinding, group 2 spec §10) and the refusals the UI never
// sends: the six tabs, the rows and their ids, the panel a row opens with ?finding=, the next finding after a decision,
// the desktop selection bar, the export's cells, and a request sent from the page as the person's browser would.
import type { Locator, Page, Response } from "@playwright/test"
import type { Worksheet } from "exceljs"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { escapeRegExp } from "./scan-steps.ts"
import { REVIEW_WORDS } from "./review-words.ts"

export type AuditFindingTypeCode = "wrong_location" | "wrong_custodian" | "wrong_department" | "wrong_condition" | "not_found" | "out_of_scope"

// A row holds its finding's id: the desktop table's row, or the phone's card (both are in the page; one is hidden).
const idAttribute = (device: E2eDevice) => (device === "phone" ? "data-audit-finding-card" : "data-audit-finding-row")

// The findings of the page, in its order.
export function findingRows(page: Page, device: E2eDevice): Locator {
  return device === "phone" ? page.locator("[data-audit-finding-card]") : page.locator("tbody tr[data-audit-finding-row]")
}

// One finding, by its asset's tag and its type's code (the row carries the code; the screen shows the short word).
export function findingEntry(page: Page, device: E2eDevice, tag: string, type: AuditFindingTypeCode): Locator {
  const row = device === "phone" ? "" : "tbody tr"
  return page.locator(`${row}[${idAttribute(device)}][data-finding-type="${type}"]`).filter({ hasText: tag })
}

export async function findingId(entry: Locator, device: E2eDevice): Promise<string> {
  const id = await entry.getAttribute(idAttribute(device))
  if (!id) throw new Error("the finding's row carries no id")
  return id
}

// The ids of the page's findings, in the page's order (reported last first, then id).
export async function readFindingOrder(page: Page, device: E2eDevice): Promise<string[]> {
  return findingRows(page, device).evaluateAll((nodes, attribute) => nodes.map((node) => node.getAttribute(attribute) ?? ""), idAttribute(device))
}

// The panel of the chosen finding: the right pane on the desktop, the whole screen on the phone (spec §10, P4-R13).
export function findingPanel(page: Page): Locator {
  return page.locator("[data-audit-finding-panel]").filter({ visible: true })
}

// A click on the finding as a person makes it: on the desktop the row's เรื่อง chip (no control, so the row's own click,
// not its link); on the phone the card, which is one stretched link (P4-R13). The URL gains ?finding= and the panel
// holds it.
export async function openFinding(page: Page, entry: Locator, id: string): Promise<void> {
  const card = await entry.evaluate((node) => node.hasAttribute("data-audit-finding-card"))
  await (card ? entry : entry.locator("[data-audit-finding-subject]")).click()
  await page.waitForURL((url) => url.searchParams.get("finding") === id)
  await expect(findingPanel(page)).toHaveAttribute("data-finding-id", id)
}

// The six tabs (P4-R1): each label with its count, in order, and the current one.
export function findingTabs(page: Page): Locator {
  return page.getByRole("main").getByRole("navigation", { name: REVIEW_WORDS.tabsLabel, exact: true })
}
export function currentFindingTab(page: Page): Locator {
  return findingTabs(page).locator('a[aria-current="page"]')
}
export async function expectTabs(page: Page, expected: readonly (readonly [string, number])[], current: string): Promise<void> {
  await expect(findingTabs(page).getByRole("link")).toHaveText(expected.map(([label, count]) => new RegExp(`^${escapeRegExp(label)}\\s*${count}$`)))
  await expect(currentFindingTab(page)).toHaveText(new RegExp(`^${escapeRegExp(current)}\\s*\\d`))
}

// The desktop selection bar (spec §10, P4-R15).
export function selectionBar(page: Page): Locator {
  return page.locator('[data-slot="desktop-selection-bar"]')
}

// The finding the panel moves to after a decision on the pending tab (P4-R18), on one page where the IT head may decide
// every finding: the one after it in the page's order, else the first before it (the page's first); none when it was
// the last one left.
export function nextPendingAfter(order: readonly string[], id: string): string | null {
  const at = order.indexOf(id)
  if (at < 0) throw new Error(`${id} is not in the page's order`)
  return [...order.slice(at + 1), ...order.slice(0, at)][0] ?? null
}

// The next answer of a finding's review route (a decision in the panel, or one of the bar's).
export function reviewResponse(page: Page, findingId: string): Promise<Response> {
  return page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/audit-findings/${findingId}/review`)
}

// Every review request the page sends for one finding while the watch is on.
export function watchReviewPosts(page: Page, findingId: string): { posts: string[]; stop: () => void } {
  const posts: string[] = []
  const watch = (request: { url(): string; method(): string }) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === `/api/audit-findings/${findingId}/review`) posts.push(request.url())
  }
  page.on("request", watch)
  return { posts, stop: () => page.off("request", watch) }
}

// The cells of the named columns that hold a raw code (lower-case ASCII words joined by "_", such as
// "wrong_department"), as "<header> row <n>: <value>"; a missing column is named too. The exports write words
// (P4-R7, P4-R8), so this is empty.
export function rawCodeCells(sheet: Worksheet, headers: readonly string[]): string[] {
  const header = (sheet.getRow(1).values ?? []) as unknown[]
  const found: string[] = []
  for (const name of headers) {
    const column = header.indexOf(name)
    if (column <= 0) {
      found.push(`${name}: no such column`)
      continue
    }
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const value = String(row.getCell(column).value ?? "")
      if (/^[a-z]+(?:_[a-z]+)*$/.test(value)) found.push(`${name} row ${rowNumber}: ${value}`)
    })
  }
  return found
}

// A request from the page itself (the same session and cookies), for a refusal the UI never sends: the button is not
// offered, so the route's own answer is read this way.
export async function browserFetch(page: Page, url: string, method: string, body: unknown): Promise<{ status: number; body: unknown }> {
  return page.evaluate(
    async ({ url, method, body }) => {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      return { status: response.status, body: (await response.json().catch(() => null)) as unknown }
    },
    { url, method, body },
  )
}
```

Check before writing: `exceljs` types export `Worksheet`, since `field-audit.spec.ts` uses `workbook.getWorksheet(...)` / `worksheets[0]`. Run `npx tsc --noEmit` after Step 4. If the named type import fails, use `import type ExcelJS from "exceljs"` and `ExcelJS.Worksheet`.

- [ ] **Step 4: Rewrite the findings steps in the field audit**

`e2e/audit/field-audit.spec.ts`. Edit from the bottom up.

**Block 8, the round's Excel (`:834-861`).**
- After `:842` (`await recordSettled(page, measure, "the round's export menu (IT head)")`), add:

```ts
      // Group 2 plan 4 (P4-R7): each export speaks the page's language.
      for (const item of await items.all()) await expect(item).toHaveAttribute("href", /[?&]locale=th(?:&|$)/)
```

- After `:861` (`expect(tags.sort(), "the category's items only")…`), add:

```ts
      // The status columns hold words, never a code; the headers stay English (P4-R7).
      expect(review.rawCodeCells(sheet, ["Audit Status", "Audit Result", "Reconcile Status"]), "no raw code in a cell (P4-R7)").toEqual([])
```

**Block 8, the IT head's findings export.** `:785-808` (the test, whole) becomes:

```ts
    test("the findings export downloads the round's findings from ส่งออก ▾, in words (decision U1, group 2 spec §10)", async ({ page, measure }, testInfo) => {
      const chain = readChain(testInfo.project.name)
      await measure.visit(`/th/audit/findings?status=all&roundId=${chain.roundId}`, "findings of the round, all (IT head)")
      // "ส่งออก ▾" (spec §10, P4-R7): Excel and PDF, each of the page's filters and its language.
      await page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true }).click()
      const items = page.getByRole("menuitem")
      await expect(items).toHaveCount(2)
      // Task 3's two items, by their names: "ส่งออกรายการไม่ตรง …" (Excel) and "ส่งออก PDF …".
      const excel = items.filter({ hasText: R.exportExcel })
      for (const [item, route] of [[excel, "export"], [items.filter({ hasText: R.exportPdf }), "export-pdf"]] as const) {
        await expect(item).toHaveAttribute("href", new RegExp(`^/api/audit-findings/${route}\\?`))
        for (const param of ["status=all", `roundId=${chain.roundId}`, "locale=th"]) await expect(item).toHaveAttribute("href", new RegExp(`[?&]${scan.escapeRegExp(param)}(?:&|$)`))
      }
      await recordSettled(page, measure, "the findings export menu (IT head)")
      const downloading = page.waitForEvent("download")
      await excel.click()
      const download = await downloading
      // The file as downloaded, kept in the report.
      const file = await download.path().catch(() => null)
      if (file) await testInfo.attach(`download ${download.suggestedFilename()}`, { path: file, contentType: "application/octet-stream" })
      expect(download.suggestedFilename(), "an Excel file").toMatch(/\.xlsx$/)
      expect(file, "the download completed").not.toBeNull()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(file ?? "")
      // The sheet and its headers stay English (P4-R7): the "Asset Tag" column, found by its header.
      const sheet = workbook.getWorksheet("Audit Findings")
      if (!sheet) throw new Error("no Audit Findings sheet")
      const header = (sheet.getRow(1).values ?? []) as unknown[]
      const tagColumn = header.indexOf("Asset Tag")
      const typeColumn = header.indexOf("Finding Type")
      expect(tagColumn, "the Asset Tag column").toBeGreaterThan(0)
      expect(typeColumn, "the Finding Type column").toBeGreaterThan(0)
      const types = new Map<string, string[]>()
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const tag = String(row.getCell(tagColumn).value ?? "")
        types.set(tag, [...(types.get(tag) ?? []), String(row.getCell(typeColumn).value ?? "")])
      })
      for (const asset of [chain.assets.mismatch, chain.assets.component2, chain.assets.notFound, chain.assets.outOfScope]) {
        expect(types.has(asset.tag), `${asset.tag} is in the export`).toBe(true)
      }
      // The codes read as the page's words (P4-R7, P4-R8).
      expect(types.get(chain.assets.mismatch.tag)?.sort(), "A2's two findings, by their words").toEqual(["แผนกไม่ตรง", "สภาพไม่ตรง"].sort())
      expect(types.get(chain.assets.outOfScope.tag), "X1's finding, by its word").toEqual(["ทรัพย์สินนอกขอบเขต"])
      expect(review.rawCodeCells(sheet, ["Finding Type", "Review Status", "Action Status", "Action Taken"]), "no raw code in a cell (P4-R7, P4-R8)").toEqual([])
    })
```

**Block 8, IT staff.** `:774-775` (the two link checks) become:

```ts
      // The findings export sits in "ส่งออก ▾" (spec §10), which needs audit:export: no menu and no export link.
      await expect(page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true })).toHaveCount(0)
      await expect(page.locator('main a[href^="/api/audit-findings/export"]')).toHaveCount(0)
```

**Block 7, the own finding.**
- Before `:733` (`await measure.visit(`/th/audit/rounds/${own.id}`, "the IT head's round")`), add `await roundPage.settlePageRequests(page)`.
- `:721-725` become (`:726-728`, the refusal, stay):

```ts
    // Their own finding (spec §10, Appendix A §10): the row has no tick, and the panel says why instead of the buttons;
    // the review route refuses it (segregation of duties).
    await roundPage.settlePageRequests(page)
    await measure.visit(`/th/audit/findings?status=pending&roundId=${own.id}`, "findings of the IT head's round")
    const entry = review.findingEntry(page, e2eDevice, assets.notFound.tag, "not_found")
    await expect(entry).toHaveCount(1)
    await expect(entry.getByRole("checkbox")).toHaveCount(0)
    await roundPage.settlePageRequests(page)
    await review.openFinding(page, entry, findingId)
    const panel = review.findingPanel(page)
    await expect(panel.getByText(R.ownFinding)).toBeVisible()
    await expect(panel.getByRole("button", { name: R.approve, exact: true })).toHaveCount(0)
    await expect(panel.getByRole("button", { name: R.reject, exact: true })).toHaveCount(0)
    await expect(page.locator("#audit-review-reason")).toHaveCount(0)
    await recordSettled(page, measure, "the panel of the IT head's own finding")
```

**Block 6 (`:616-648`).** Rewritten whole. `:650-653` (the asset's GET) stay. Before `:657` (`await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page (IT head)")`), add `await roundPage.settlePageRequests(page)`. The test, from its line to the asset's GET:

```ts
  test("the IT head reviews every finding of the round in the panel, one batch on the desktop with a failure on purpose, and closes it", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(300_000)
    const chain = readChain(testInfo.project.name)
    const { assets } = chain
    const runDept = runRecords(readRunState().runId).department
    const runDepartment = runDept.code
    const listHref = `/th/audit/findings?status=pending&roundId=${chain.roundId}`
    await measure.visit(listHref, "findings of the round (IT head)")

    // The six tabs count within the round (P4-R1, P4-R3, spec §5): the walk's five findings wait, none is decided yet.
    await review.expectTabs(page, [[R.tabPending, 5], [R.tabApproved, 0], [R.tabRejected, 0], [R.tabFollowUp, 0], [R.tabClosed, 0], [R.tabAll, 5]], R.tabPending)
    const rows = review.findingRows(page, e2eDevice)
    await expect(rows).toHaveCount(5)

    // Each finding of the walk, by its asset and its type: the word of its เรื่อง chip (P4-R2) and the decision.
    type Decision = { key: "component" | "department" | "condition" | "notFound" | "outOfScope"; asset: { id: string; tag: string; name: string }; code: review.AuditFindingTypeCode; subject: string; type: string; action: "approve" | "reject"; remark: string }
    const decisions: Decision[] = [
      { key: "component", asset: assets.component2, code: "not_found", subject: R.subjectNotFound, type: "ไม่พบทรัพย์สิน", action: "approve", remark: "ยืนยันไม่พบส่วนควบ" },
      { key: "department", asset: assets.mismatch, code: "wrong_department", subject: R.subjectDepartment, type: "แผนกไม่ตรง", action: "approve", remark: `ย้ายไปแผนก ${runDepartment} ตามที่พบ` },
      { key: "condition", asset: assets.mismatch, code: "wrong_condition", subject: R.subjectCondition, type: "สภาพไม่ตรง", action: "reject", remark: "ตรวจซ้ำแล้ว สภาพยังดี" },
      { key: "notFound", asset: assets.notFound, code: "not_found", subject: R.subjectNotFound, type: "ไม่พบทรัพย์สิน", action: "approve", remark: "ยืนยันไม่พบ" },
      { key: "outOfScope", asset: assets.outOfScope, code: "out_of_scope", subject: R.subjectOutOfScope, type: "ทรัพย์สินนอกขอบเขต", action: "approve", remark: "อยู่นอกขอบเขตรอบนี้จริง" },
    ]
    const ids = {} as Record<Decision["key"], string>
    for (const decision of decisions) {
      const entry = review.findingEntry(page, e2eDevice, decision.asset.tag, decision.code)
      await expect(entry, `${decision.type} ${decision.asset.tag}`).toHaveCount(1)
      await expect(entry.locator("[data-audit-finding-subject]")).toHaveText(decision.subject)
      ids[decision.key] = await review.findingId(entry, e2eDevice)
    }
    expect(ids.notFound, "the not-found save's finding").toBe(chain.notFoundFindingId)
    // The page's order of its pending findings, for "k จาก N" and the next one (P4-R18).
    let order = await review.readFindingOrder(page, e2eDevice)
    expect([...order].sort(), "the five rows are the walk's findings").toEqual(Object.values(ids).sort())
    // On the desktop each can be ticked: none is the IT head's own (spec §10).
    if (e2eDevice === "desktop") await expect(rows.getByRole("checkbox")).toHaveCount(5)

    // A component's finding names its machine, in the row and in the panel (spec §10, §16, decision 6); the other
    // not-found is no component.
    const parentLine = fillTemplate(R.componentOf, { parentTag: assets.parent.tag, parentName: assets.parent.name })
    const component = review.findingEntry(page, e2eDevice, assets.component2.tag, "not_found")
    await expect(component).toContainText(parentLine)
    await expect(review.findingEntry(page, e2eDevice, assets.notFound.tag, "not_found")).not.toContainText(assets.parent.tag)

    // Choosing a row opens it in the panel with ?finding= (spec §10, §16), and a reload reopens it.
    const panel = review.findingPanel(page)
    await roundPage.settlePageRequests(page)
    await review.openFinding(page, component, ids.component)
    await roundPage.settlePageRequests(page)
    await page.reload()
    await expect(panel).toHaveAttribute("data-finding-id", ids.component)
    if (e2eDevice === "desktop") await expect(component).toHaveAttribute("aria-current", "true")
    await expect(panel).toContainText(parentLine)
    // ไม่พบ: approving leaves the register, with no word of a transfer (P4-R24).
    const effect = panel.locator("[data-audit-finding-effect]")
    await expect(effect).toHaveText(R.approveNoChangeNotFound)
    await expect(panel.getByRole("link", { name: R.openAsset, exact: true })).toHaveAttribute("href", new RegExp(`^/th/assets/${assets.component2.id}(?:[?#]|$)`))
    await expect(panel.getByRole("button", { name: R.approveAllFields, exact: true })).toHaveCount(0)
    await recordSettled(page, measure, "the findings panel, a component not found (IT head)")

    // A finding in the panel: as it is, or opened by its own link (?finding=, a shared link reopens it).
    const show = async (id: string) => {
      if (new URL(page.url()).searchParams.get("finding") === id) return
      await roundPage.settlePageRequests(page)
      await page.goto(`${listHref}&finding=${id}`)
      await expect(panel).toHaveAttribute("data-finding-id", id)
    }
    // Approve or reject in the panel: one review at once, no confirm dialog, then the panel holds the next finding the IT
    // head may decide (spec §10, P4-R18), its "k จาก N" counting those findings in the tab's order (all five here).
    const decide = async (decision: Decision) => {
      const id = ids[decision.key]
      await show(id)
      await expect(panel).toContainText(decision.type)
      await expect(panel).toContainText(fillTemplate(R.position, { position: order.indexOf(id) + 1, total: order.length }))
      await page.locator("#audit-review-reason").fill(decision.remark)
      const next = review.nextPendingAfter(order, id)
      const reviewed = review.reviewResponse(page, id)
      await measure.timed(`${decision.action} ${decision.type} ${decision.asset.tag}`, async () => {
        await panel.getByRole("button", { name: decision.action === "approve" ? R.approve : R.reject, exact: true }).click()
        expect((await reviewed).status(), "the decision is taken at once").toBe(200)
      })
      order = order.filter((other) => other !== id)
      if (next) {
        await page.waitForURL((url) => url.searchParams.get("finding") === next)
        await expect(panel).toHaveAttribute("data-finding-id", next)
        await expect(panel).toContainText(fillTemplate(R.position, { position: order.indexOf(next) + 1, total: order.length }))
      } else {
        await expect(panel.getByRole("button", { name: R.approve, exact: true }), "none left on the tab").toHaveCount(0)
      }
    }
    await decide(decisions[0])

    // The department: the comparison marks the two fields the item differs in, the sentence says what approving
    // changes, and the asset's other pending field is offered with "อนุมัติทุกช่องของทรัพย์สินนี้", not pressed: the
    // condition is rejected below.
    await show(ids.department)
    for (const field of ["department", "condition"]) await expect(panel.locator(`[data-audit-finding-field="${field}"]`)).toHaveAttribute("data-mismatch", "true")
    await expect(panel.locator('[data-audit-finding-field="location"]')).toHaveCount(1)
    await expect(panel.locator('[data-audit-finding-field="location"]')).not.toHaveAttribute("data-mismatch", "true")
    await expect(panel).toContainText(fillTemplate(R.approveChanges, { field: R.subjectDepartment, from: `${chain.records.department.code} - ${chain.records.department.name}`, to: `${runDept.code} - ${runDept.name}` }))
    await expect(panel.getByRole("button", { name: R.approveAllFields, exact: true })).toBeVisible()
    await recordSettled(page, measure, "the findings panel, a department to change (IT head)")
    await decide(decisions[1])

    // The condition, rejected: first without a reason, which the panel refuses with nothing sent and the review API
    // refuses too, missing or blank (decision 5, spec §16); then with its reason.
    await show(ids.condition)
    await expect(panel).toContainText(fillTemplate(R.approveChanges, { field: R.subjectCondition, from: "ดี", to: "พอใช้" }))
    const remark = page.locator("#audit-review-reason")
    await remark.fill("")
    const posts = review.watchReviewPosts(page, ids.condition)
    await panel.getByRole("button", { name: R.reject, exact: true }).click()
    await expect(page.locator("#audit-review-reason-error")).toHaveText(R.rejectReasonRequired)
    await expect(remark).toBeFocused()
    await expect(remark).toHaveAttribute("aria-invalid", "true")
    posts.stop()
    expect(posts.posts, "a reject without a reason sends nothing").toEqual([])
    await recordSettled(page, measure, "the findings panel, a reject without a reason (IT head)")
    measure.expectRefusal({ method: "POST", url: new RegExp(`/api/audit-findings/${ids.condition}/review$`), status: 400, reason: "a reject without a reason: the review schema refuses it (decision 5)" })
    for (const body of [{ action: "reject" }, { action: "reject", reviewRemark: "   " }]) {
      expect(await review.browserFetch(page, `/api/audit-findings/${ids.condition}/review`, "POST", body), JSON.stringify(body)).toEqual({ status: 400, body: { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } } })
    }
    await decide(decisions[2])

    // นอกขอบเขต: approving leaves the register, and says how to move the asset (P4-R24).
    await show(ids.outOfScope)
    await expect(effect).toHaveText(R.approveNoChangeOutOfScope)

    if (e2eDevice === "desktop") {
      // Several at once (spec §10, bugs 17-18): the header tick, the bar and its clear. X1 is decided through the API
      // first, as another tab would (P4-R16), so the bar's batch has one success and one failure, goes past the
      // failure, says so, and refreshes.
      await roundPage.settlePageRequests(page)
      await page.goto(listHref)
      await review.expectTabs(page, [[R.tabPending, 2], [R.tabApproved, 2], [R.tabRejected, 1], [R.tabFollowUp, 0], [R.tabClosed, 0], [R.tabAll, 5]], R.tabPending)
      await expect(rows).toHaveCount(2)
      const bar = review.selectionBar(page)
      const ticks = rows.getByRole("checkbox")
      const all = page.getByRole("main").getByRole("checkbox", { name: R.selectAll, exact: true })
      await expect(bar).toBeHidden()
      await all.check()
      for (const tick of await ticks.all()) await expect(tick).toBeChecked()
      await expect(bar).toContainText(fillTemplate(R.selectedCount, { count: 2 }))
      await bar.getByRole("button", { name: R.clearSelection, exact: true }).click()
      await expect(bar).toBeHidden()
      for (const tick of await ticks.all()) await expect(tick).not.toBeChecked()
      await all.check()
      await expect(bar.getByRole("button", { name: R.rejectSelected, exact: true })).toBeVisible()
      await recordSettled(page, measure, "the selection bar, two findings ticked (IT head)")
      const earlier = await review.browserFetch(page, `/api/audit-findings/${ids.outOfScope}/review`, "POST", { action: "approve", reviewRemark: decisions[4].remark })
      expect(earlier.status, "X1 decided through the API before the batch (P4-R16)").toBe(200)
      measure.expectRefusal({ method: "POST", url: new RegExp(`/api/audit-findings/${ids.outOfScope}/review$`), status: 400, reason: "decided through the API before the bar's batch (P4-R16): the batch reports it as a failure" })
      // "อนุมัติที่เลือก 2 รายการ" asks once, with an optional remark, before a batch changes the register (P4-R25).
      await bar.getByRole("button", { name: fillTemplate(R.approveSelected, { count: 2 }), exact: true }).click()
      const dialog = page.getByRole("dialog", { name: fillTemplate(R.batchApproveTitle, { count: 2 }) })
      await expect(dialog).toBeVisible()
      await recordSettled(page, measure, "the batch's approve dialog (IT head)")
      const answers = [review.reviewResponse(page, ids.notFound), review.reviewResponse(page, ids.outOfScope)] as const
      await measure.timed("approve the two ticked from the bar", async () => {
        await dialog.getByRole("button", { name: fillTemplate(R.batchApproveConfirm, { count: 2 }), exact: true }).click()
        const [notFound, outOfScope] = await Promise.all(answers)
        expect(notFound.status(), "A4 is approved").toBe(200)
        expect(outOfScope.status(), "X1 was decided already: one failure, and the batch goes on").toBe(400)
      })
      // The result stays in the bar, in the panel's words, until it is closed (bugs 17-18).
      await expect(bar.getByRole("status")).toHaveText(fillTemplate(R.batchResult, { succeeded: 1, failed: 1 }))
      await expect(bar.getByRole("listitem")).toHaveCount(1)
      await expect(bar.getByRole("listitem")).toContainText(`${assets.outOfScope.tag} ${R.subjectOutOfScope}: ${R.batchFailedAlreadyDecided}`)
      await expect(rows).toHaveCount(0)
      await recordSettled(page, measure, "the batch's result (IT head)")
      await bar.getByRole("button", { name: R.batchResultDismiss, exact: true }).click()
      await expect(bar).toBeHidden()
    } else {
      // The phone keeps its cards and has no ticks (spec §10): the last two are decided in the panel, the last leaving
      // none on the tab.
      await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)
      await decide(decisions[3])
      await decide(decisions[4])
    }

    // Every finding is decided: the tabs count four approved and one rejected, and the pending tab is empty.
    await roundPage.settlePageRequests(page)
    await page.goto(listHref)
    await review.expectTabs(page, [[R.tabPending, 0], [R.tabApproved, 4], [R.tabRejected, 1], [R.tabFollowUp, 0], [R.tabClosed, 0], [R.tabAll, 5]], R.tabPending)
    await expect(page.getByRole("main").getByText(R.emptyTitle, { exact: true }).filter({ visible: true })).toHaveCount(1)
    await recordSettled(page, measure, "findings of the round, all reviewed")
```

The decision table keeps `type: "<auditFinding.type_*>"` for the four types, `action: "approve", remark` four times and `action: "reject", remark` once. So `tests/e2e-audit.test.ts:220-222` hold without an edit. `runDepartment` stays the code, so `:223` holds.

**Block 5.**
- `:587`: the signature becomes `async ({ page, measure, e2eDevice }, testInfo) => {`.
- After `:596` (`await expect(page.getByRole("button", { name: "ปฏิเสธ", exact: true })).toHaveCount(0)`), add:

```ts
    // Group 2 plan 4 (spec §10): no tick and no selection bar; the panel a row opens reads the finding, its machine
    // included, and decides nothing: no decision, no plan, no close, no reason box.
    await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)
    await expect(review.selectionBar(page)).toBeHidden()
    const component = review.findingEntry(page, e2eDevice, chain.assets.component2.tag, "not_found")
    const componentId = await review.findingId(component, e2eDevice)
    await roundPage.settlePageRequests(page)
    await review.openFinding(page, component, componentId)
    const panel = review.findingPanel(page)
    await expect(panel).toContainText(fillTemplate(R.componentOf, { parentTag: chain.assets.parent.tag, parentName: chain.assets.parent.name }))
    for (const name of [R.approve, R.reject, R.actionPlan, R.closeFinding]) await expect(panel.getByRole("button", { name, exact: true })).toHaveCount(0)
    await expect(page.locator("#audit-review-reason")).toHaveCount(0)
    await expect(page.getByText(R.ownFinding).filter({ visible: true })).toHaveCount(0)
    await recordSettled(page, measure, "a finding's panel (IT staff, read only)")
```

- Before `:604` (`await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page (IT staff)")`), add `await roundPage.settlePageRequests(page)`.
- `:590-596` stay word for word: `tests/e2e-fixes.test.ts:359-363` and EA4 read them.

**The imports and the header.**
- After `:40` (`import { SCAN_WORDS as S } from "./scan-words.ts"`), add:

```ts
import { REVIEW_WORDS as R } from "./review-words.ts"
```

- `:18-23` (items 5-8 of the header list) become:

```ts
// 5. IT staff are refused the review of their own findings and the close of the round they opened; the findings page
//    gives them no tick and a panel that decides nothing (spec §6.2.4, group 2 spec §10);
// 6. the IT head reviews every finding in the panel: a row opens it with ?finding=, each decision moves to the next,
//    a reject without a reason is refused by the panel and the API, the component names its machine, and on the
//    desktop a batch from the selection bar reports one failure made on purpose; then the close from the next-step
//    card (spec §6.2.4, group 2 spec §8, §10, §16);
// 7. the IT head's own round: the room chips, their own finding (no tick, and the panel says why) and their own close
//    are refused, the card says why, and the round is cancelled from "อื่น ๆ";
// 8. the audit exports by permission (spec §6.2.5, §6.5): hidden from IT staff (finding AU1, fixed; the round page's
//    menu too), downloaded by the IT head from "ส่งออก ▾" in words with English headers (decision U1, DX6 (ก), group 2
//    spec §10), the round's Excel by a category (group 2 spec §16).
```

- [ ] **Step 5: Rewrite M4 and add the dashboard's tab check**

`e2e/cross-cutting/roles.spec.ts`:
- After `:11`, add:

```ts
import { findingId, findingPanel, findingRows, openFinding } from "../audit/review-steps.ts"
import { settlePageRequests } from "../audit/round-page-steps.ts"
```

- `:126-132` (the M4 test) become:

```ts
  test("the findings page offers IT staff no review control without audit:approve (finding M4)", async ({ page, measure, e2eDevice }) => {
    await measure.visit("/th/audit/findings", "audit findings (IT staff)")
    // The queue's empty state (auditFinding.emptyTitle) shows when there is no pending finding to look at.
    const empty = await page.getByRole("main").getByText("ไม่พบรายการไม่ตรงตามตัวกรอง", { exact: true }).filter({ visible: true }).count()
    test.skip(empty > 0, "no pending finding in the dev database to look at")
    for (const name of REVIEW_BUTTON_NAMES) await expect(page.getByRole("main").getByRole("button", { name, exact: true }).filter({ visible: true })).toHaveCount(0)
    // Group 2 plan 4 (spec §10): no tick, so no selection bar, and the panel a row opens offers none of them either,
    // nor the reason box. Only absences are read on this global page (spec §16).
    await expect(page.getByRole("main").getByRole("checkbox")).toHaveCount(0)
    const first = findingRows(page, e2eDevice).first()
    const id = await findingId(first, e2eDevice)
    await settlePageRequests(page)
    await openFinding(page, first, id)
    for (const name of REVIEW_BUTTON_NAMES) await expect(findingPanel(page).getByRole("button", { name, exact: true })).toHaveCount(0)
    await expect(page.locator("#audit-review-reason")).toHaveCount(0)
    await measure.recordPage("audit findings, a finding's panel (IT staff)")
  })
```

`e2e/dashboard/dashboard-steps.ts`:
- After `:8`, add `import { REVIEW_WORDS } from "../audit/review-words.ts"`.
- After `:65` (the end of `LIST_TOTAL`), add:

```ts

// The tab a findings link lands on (group 2 plan 4, P4-R3): pending on รอพิจารณา, and the bell's open and due-soon
// actions on ต้องติดตาม, each listing the bell's own where.
export const FINDING_TABS: Readonly<Record<string, string>> = {
  pendingAuditFindings: REVIEW_WORDS.tabPending,
  openAuditActions: REVIEW_WORDS.tabFollowUp,
  auditActionsDueSoon: REVIEW_WORDS.tabFollowUp,
}
```

`e2e/dashboard/dashboard.spec.ts`:
- `:16` (the import from `./dashboard-steps.ts`) gains `FINDING_TABS` among its names.
- One import after `:16`:

```ts
import { currentFindingTab } from "../audit/review-steps.ts"
```

  (`escapeRegExp` is already imported at `:9`, from `../disposal/disposal-support.ts`.)
- After `:69` (`await expect(page.getByRole("main"), list.key).toContainText(`จาก ${list.count} รายการ`)`), inside the `else` block, add:

```ts
        // Group 2 plan 4 (P4-R3): a findings link lands on its tab.
        const tab = FINDING_TABS[list.key]
        if (tab) await expect(currentFindingTab(page), list.key).toHaveText(new RegExp(`^${escapeRegExp(tab)}`))
```

- [ ] **Step 6: Run the guard tests to see them pass**

Run: `node --test tests/e2e-audit.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-dashboard.test.ts tests/e2e-fixes.test.ts tests/e2e-audit-rounds.test.ts`
Expected: PASS. This holds once Tasks 3-5 have landed their words and hooks.

Run: `npx tsc --noEmit`
Expected: no errors. tsconfig `include` covers `e2e/` and `tests/`. `review.AuditFindingTypeCode` is read through the namespace import, and the chain's `assets` has the five keys used.

- [ ] **Step 7: Rewrite these pins**

Each is written in Step 1. These are the rewritten ones; the rest are additions:
- `tests/e2e-audit.test.ts`:
  - `:253`: the findings export is no link of its own;
  - `:286`: the comment points at block 6.

Not rewritten, because they hold as they are:
- `tests/e2e-audit.test.ts:206-232` and `:234-262` (apart from `:253`);
- `tests/e2e-fixes.test.ts:359-363`;
- `tests/e2e-cross-cutting.test.ts:96-100`, `:155` and `:185-188`.

Other tasks must keep these keys and values, which the E2E pins read:
- Tasks 3-4 keep `auditFinding.approve` / `reject` / `actionPlan` / `closeFinding` (`tests/e2e-cross-cutting.test.ts:145-155`), `segregationReviewBlocked` (`tests/e2e-audit.test.ts:210`), the `type_*` labels (`:220`), `emptyTitle` and `quickFilters`.
- Task 3 keeps `auditFinding.exportFindings` (its Excel item); the new `:253` uses the literal in any case.

No `messages/*.json` change and no change file for `node scripts/messages-edit.mjs`. Tasks 3-5 add every word the steps read, and the Step 1 test checks them.

- [ ] **Step 8: Write the docs**

`docs/99_CHANGELOG.md`: above `## 2026-10-27` (`:7`), add:

```md
## 2026-10-28

### รายการไม่ตรง: แผงพิจารณา ตัดสินหลายรายการ และคำในไฟล์ส่งออก (กลุ่มหน้า 2 แผน 4)

Branch `feat/group2-audit-findings` (จาก `master` `704f2b26`) · spec `docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md` (§5, §10, §13 ข้อ 17-19, §15, §16) · plan `docs/superpowers/plans/2026-10-28-group2-audit-findings.md`

- **หน้ารายการไม่ตรง:**
  - แท็บ รอพิจารณา / อนุมัติแล้ว / ปฏิเสธแล้ว / ต้องติดตาม / ปิดแล้ว / ทั้งหมด พร้อมจำนวน
    - จำนวนนับตามรอบ เรื่อง และคำค้นที่เลือก
    - ต้องติดตาม = ต้องแก้ไข + ต้องตรวจสอบพิเศษ มีชิป ต้องแก้ไข / เกินกำหนด / ต้องตรวจสอบพิเศษ
    - ลิงก์เดิม (`action_open`, `overdue`, `closed`, `exception`, และ `action_not_due` / `action_due_soon` จากกระดิ่ง) เปิดแท็บและชิปของตัวเอง
  - แถบตัวเลขสรุป 4 ช่องเลิกใช้ ตัวเลขย้ายไปอยู่ที่แท็บ (P4-R1)
  - ตัวกรอง "รอบ:" และ "เรื่อง:" ช่องค้นหาอยู่ท้าย และค้นชื่อเรื่องภาษาไทย เช่น "แผนก" ได้ (ข้อ 19)
  - ตาราง: ติ๊ก / เรื่อง (ชิปคำสั้น ผู้ถือครอง ที่ตั้ง แผนก สภาพ ไม่พบ นอกขอบเขต) / ทรัพย์สิน / ตามระบบ → ที่พบ / รอบ
    - ส่วนควบมีบรรทัด "ส่วนควบของ <รหัส> <ชื่อ>" ของเครื่องที่ติดตั้งอยู่
    - รายการที่ผู้ใช้รายงานเองติ๊กไม่ได้
  - "ส่งออก ▾" รวม Excel และ PDF ตามตัวกรองและภาษาของหน้า
  - ปุ่มกลับใช้ `returnTo` ถ้ามี ไม่มีก็กลับไปหน้ารอบ หรือรายการรอบ
  - ผู้รับผิดชอบแสดงชื่อเสมอ ไม่แสดงรหัสพนักงาน
- **แผงพิจารณา:**
  - กดแถวแล้วเปิดในแผงด้านขวา ที่อยู่หน้าเว็บมี `?finding=` กดย้อนกลับ รีเฟรช หรือส่งลิงก์ ก็เปิดรายการเดิม
  - บนมือถือ กดการ์ดแล้วเปิดแผงเต็มจอ
  - แผงมีป้ายเรื่อง รอบ ทรัพย์สินพร้อม "เปิดหน้าทรัพย์สิน" และเทียบสี่เรื่อง (ผู้ถือครอง / แผนก / ที่ตั้ง / สภาพ) โดยทำเครื่องหมายเรื่องที่ไม่ตรง
  - มีรูป หมายเหตุ และ "ตรวจโดย … · เวลา · ห้อง"
  - บอกผลก่อนกด: "ถ้าอนุมัติ ทะเบียนจะเปลี่ยน… จาก … เป็น …" สำหรับนอกขอบเขต: "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย" สำหรับไม่พบ: "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน" อย่างเดียว (P4-R24)
  - "อนุมัติ" / "ปฏิเสธ" มีผลทันทีโดยไม่มีหน้าต่างยืนยัน แล้วแผงไปรายการถัดไปที่ผู้ใช้พิจารณาได้ ถัดจากรายการที่เพิ่งตัดสินตามลำดับของแท็บ ถ้าไม่มีก็รายการแรกก่อนหน้า (เซิร์ฟเวอร์เป็นผู้หา P4-R18) พร้อมบอก "k จาก N"
  - ปฏิเสธต้องกรอกเหตุผล ทั้งในแผงและที่ API (คำตัดสินข้อ 5) ช่องว่างขึ้น "กรุณาระบุเหตุผลการปฏิเสธ" (P4-R27)
  - ทรัพย์สินที่ไม่ตรงหลายเรื่องมี "อนุมัติทุกช่องของทรัพย์สินนี้" ซึ่งส่งการพิจารณาทีละรายการ
  - ข้อมูลทรัพย์สินเปลี่ยนหลังรายงาน (409): แผงเตือน และต้องกดยืนยันอีกครั้ง
  - แผนแก้ไขและการปิดพร้อมหลักฐานอยู่ในแผง แต่ไม่แสดงในรอบที่ปิดหรือยกเลิกแล้ว (P4-R10)
  - รายการที่ตัวเองรายงาน แผงบอกเหตุผลแทนปุ่ม ผู้ไม่มีสิทธิ์อนุมัติไม่เห็นปุ่มพิจารณา แผน หรือปิด
- **ตัดสินหลายรายการ:**
  - ติ๊กหัวตารางหรือทีละแถว แล้วใช้แถบ `DesktopSelectionBar` (ส่วนประกอบกลางใหม่ ติดอยู่ในหน้า ไม่มีเงา): "N รายการที่เลือก · ล้าง · ปฏิเสธที่เลือก · อนุมัติที่เลือก N รายการ"
  - ติ๊กได้เฉพาะบนคอม (มือถือตัดสินทีละรายการในแผงเต็มจอ P4-R26)
  - ปฏิเสธหลายรายการถามเหตุผลเดียว และต้องกรอก อนุมัติหลายรายการถามยืนยันครั้งเดียว ใส่หมายเหตุได้ (P4-R25)
  - ส่งทีละรายการจนครบแม้บางรายการไม่สำเร็จ แล้วบอก "สำเร็จ X · ไม่สำเร็จ Y" พร้อมเหตุผล ล้างที่ติ๊ก และโหลดใหม่ (ข้อ 17)
  - รายการที่ข้อมูลทรัพย์สินเปลี่ยน (409) ถูกข้าม และบอกให้ตัดสินในแผง (ข้อ 18)
- **API พิจารณา:**
  - ปฏิเสธโดยไม่มีเหตุผลตอบ 400 `VALIDATION_FAILED` `fieldErrors.reviewRemark: "required"`
  - ตรวจสถานะรอพิจารณาใน transaction เดียวกับการบันทึก กดซ้ำ สองแท็บ หรือส่งหลายรายการ ก็ตัดสินได้ครั้งเดียว (P4-R6)
- **ไฟล์ส่งออก:**
  - Excel / PDF ของรอบ รายงานผลต่าง และ Excel / PDF ของรายการไม่ตรง แสดงสถานะ ผล เรื่อง การพิจารณา แผนแก้ไข และผลการพิจารณาเป็นคำตามภาษาของหน้า (`?locale=` ค่าเริ่มต้น `th`) ไม่มีรหัสดิบ
  - หัวคอลัมน์และชื่อชีตยังเป็นภาษาอังกฤษ (P4-R7)
  - ผลการพิจารณา (`actionTaken`) ที่ยังไม่มีคำแปลเป็นช่องว่าง ไม่แสดงรหัส (P4-R29)
  - ชื่อไฟล์เมื่อค้นด้วยคำไทยไม่ทำให้ดาวน์โหลดล้มอีก (`filename*`)
- **E2E:**
  - `e2e/audit/review-steps.ts` เขียนใหม่ตามหน้าใหม่ คำอยู่ใน `e2e/audit/review-words.ts`
  - `e2e/audit/field-audit.spec.ts`:
    - เจ้าหน้าที่ IT ไม่มีที่ติ๊ก แผงที่เปิดจากแถวไม่มีปุ่มพิจารณา
    - หัวหน้า IT:
      - กดแถวแล้วแผงเปิดพร้อม `?finding=` รีเฟรชแล้วยังเปิดอยู่
      - ทุกการตัดสินไปรายการถัดไปพร้อม "k จาก N"
      - ส่วนควบขึ้น "ส่วนควบของ <เครื่อง>"
      - ปฏิเสธไม่มีเหตุผล แผงไม่ส่งและบอกใต้ช่อง API ตอบ 400
      - แผงของไม่พบและนอกขอบเขตบอกผลตามประเภท (P4-R24)
      - บนคอม ติ๊ก A4 และ X1 ตัดสิน X1 ผ่าน API ก่อน แล้วกด "อนุมัติที่เลือก 2 รายการ" ยืนยันในหน้าต่าง ได้ "สำเร็จ 1 · ไม่สำเร็จ 1" พร้อมเหตุผลของ X1 (P4-R16, P4-R25)
    - รอบของหัวหน้าเอง: รายการของตัวเองติ๊กไม่ได้ แผงบอกเหตุผล
    - ส่งออกผ่าน "ส่งออก ▾" ตรวจว่าเซลล์เป็นคำ หัวคอลัมน์เป็นภาษาอังกฤษ
  - M4 (`roles.spec.ts`) เปิดแผงด้วย · แดชบอร์ดตรวจว่าลิงก์รายการไม่ตรงเปิดแท็บถูก
  - ไม่เพิ่มข้อมูลใน dev
- **เรื่องที่ผู้ใช้ควรตรวจ (แผน 4):**
  - P4-R1: แถบตัวเลขสรุป 4 ช่องเลิกใช้ (spec §10) แม้ Appendix A §10 เขียนว่าคงไว้ ตัวเลขทั้งสี่ยังอยู่ที่แท็บและชิป
  - P4-R2: คอลัมน์เรื่องใช้ชิปชื่อ (DESIGN.md: ชื่อไม่ใช่สถานะ) ไม่ใช่ป้ายสถานะตามที่ spec เขียน
  - P4-R3: ต้องติดตามนับแผนที่ "แก้ไขแล้ว" ยังเปิดอยู่ ตามกฎการปิดรอบ
  - P4-R7: หัวคอลัมน์และชื่อชีตในไฟล์ยังเป็นภาษาอังกฤษ
  - P4-R18: แผงไปรายการถัดไปที่ผู้ใช้พิจารณาได้ ถัดจากรายการที่ตัดสินตามลำดับของแท็บ (ข้ามหน้าได้ เปิดหน้าที่มีรายการนั้น) ถ้าไม่มีถัดไปก็รายการแรกก่อนหน้า ถ้าไม่เหลือแผงบอกว่าแท็บนี้ไม่มีรายการรอพิจารณาแล้ว
  - P4-R24: ไม่พบบอกแค่ "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน" ไม่บอกให้ทำรายการโอนย้าย (spec เขียนให้ไม่พบใช้ประโยคเดียวกับนอกขอบเขต)
  - P4-R25: "อนุมัติที่เลือก N รายการ" ถามยืนยันครั้งเดียวพร้อมหมายเหตุ (ไม่บังคับ) ส่วนอนุมัติในแผงไม่มีหน้าต่างยืนยัน
  - P4-R17: 409 ไม่มีใน E2E (ไม่มีข้อมูลที่ทำซ้ำได้) ทดสอบด้วย unit test และ UAT
- **deploy:**
  - ยังไม่ deploy · ไม่มี migration
```

`docs/07_UAT_CHECKLIST.md`. Edit from the bottom up.

A new section between `:484` and `## Sign-Off` (`:486`):

```md
## Audit Findings B UAT (2026-10-28)

The automated suite covers the findings page in all four projects, the phone on WebKit (`e2e/audit/field-audit.spec.ts`), and finding M4 (`e2e/cross-cutting/roles.spec.ts`). It checks:
- the six tabs and their counts within the round;
- the เรื่อง chips;
- a row opening the panel with `?finding=`, and a reload reopening it;
- each decision moving to the next finding with "k จาก N";
- a reject without a reason refused by the panel and by the API;
- "ส่วนควบของ <parent>" in the row and in the panel;
- the comparison and the sentence of what approving changes;
- on the desktop, the ticks, the bar, "ล้าง", and a batch with one failure made on purpose ("สำเร็จ 1 · ไม่สำเร็จ 1");
- the own finding with no tick and the panel's reason;
- IT staff with no review control in the list or in the panel;
- "ส่งออก ▾" with the round and the locale, and the Excel's cells in words with English headers;
- the dashboard's findings links landing on รอพิจารณา and ต้องติดตาม.

A person still checks:

- [ ] At 1280 and 1440, in both themes: the two panes (the panel about 420px) and the chosen row's fill. The sticky bar covers no row. The panel scrolls on its own on a long finding, and stays in view when a row far down the list is opened (P4-R31).
- [ ] At 768 and 1024, in both themes, with a row ticked: at 768 the selection bar sits above the bottom navigation and every nav button can be pressed; at 1024 the bar is flush at the bottom and there is no field navigation (P4-R35).
- [ ] At 1024, 768 and 390: scroll the list and open a finding near its bottom. The panel opens at its top with "กลับไปรายการไม่ตรง" in view. Decide it, and the next finding also opens at its title (P4-R31).
- [ ] With more pending findings than one page (page size 25), decide the last finding of page 1: the panel opens the first of page 2. Decide the last pending finding of the tab: the panel says the tab is done.
- [ ] A 409: edit an asset's department through the asset form after its finding was reported, then approve that finding:
  - the warning shows in the panel, and a second press applies it;
  - inside a batch, the finding is skipped, and the result says to decide it in the panel.
- [ ] "ปฏิเสธที่เลือก" asks one reason, refuses an empty one under the box, and rejects each ticked finding with it.
- [ ] "อนุมัติทุกช่องของทรัพย์สินนี้" on an asset with two pending fields applies both, and the rows stay one per finding.
- [ ] Two tabs on one finding: decide it in one, then press อนุมัติ in the other. It is refused as already decided, and nothing is applied twice.
- [ ] The follow-up in the panel:
  - "แผนแก้ไข" saves the owner, the due date and the status, and the owner reads as a name for a role without `audit:edit`;
  - "ปิดรายการไม่ตรง" needs one evidence file;
  - the evidence list, "เปิดคำขอตัดจำหน่าย" (it returns to the same finding) and the freshness banner work;
  - on a closed or cancelled round, the panel offers no plan or close.
- [ ] On iPhone Safari and Android Chrome: tapping a card opens the panel full screen, and its back returns to the list at the same place.
- [ ] Old links land: the round page's "แผนแก้ไขค้าง" opens ต้องติดตาม › ต้องแก้ไข; the bell's open and due-soon actions open ต้องติดตาม with the bell's count; an `?status=overdue` link opens เกินกำหนด.
- [ ] Each sub-chip's count equals its rows.
- [ ] Search "แผนก" or "ที่ตั้ง": the findings of that field come up (bug 19). "เรื่อง:" narrows to one field.
- [ ] Open the PDF exports (round, findings) and the variance Excel: the statuses, results and actions read as words, and an `actionTaken` code with no word yet is an empty cell, never the code (P4-R29).
- [ ] A round export with a Thai search downloads, with the Thai name kept.
- [ ] NVDA and VoiceOver:
  - the tabs read their counts;
  - a tick reads its finding;
  - the bar reads its count;
  - the reason error is read as focus moves to the box.
- [ ] An English pass of the new messages and of the exports with `locale=en`.
```

In "List Pages UAT":
- `:307` becomes:

```md
- [ ] Selections stay on one page: on `/th/audit/findings` (approver, desktop), tick findings, then go to the next page or another tab and confirm the ticks are cleared; the bar reads "N รายการที่เลือก · ล้าง · ปฏิเสธที่เลือก · อนุมัติที่เลือก N รายการ", with "อนุมัติที่เลือก N รายการ" the primary button. On `/th/disposal`, "เลือกหน้านี้" selects only rows of the page on screen.
```

- `:306`: its first clause becomes `on /th/audit/findings opened from a round or a report, the "รอบ:" and "เรื่อง:" filters show the round and the field, and changing one keeps the other, the tab and the search;`. The rest of the line stays.
- `:304`: its first clause becomes `the pager total of /th/audit/findings equals the count of the tab in use (and of the sub-chip under ต้องติดตาม);`. The rest stays.
- `:302` becomes:

```md
- [ ] On page 3 of `/th/audit/findings` (or the last page of a tab with more than 50 findings), open a finding, press "เปิดหน้าทรัพย์สิน" in the panel and use the browser Back button: the findings list returns on page 3 with the same tab, filters, search, page size and the same finding open.
```

In "audit_reviewer":
- `:157` becomes:

```md
- [ ] Approve or reject a finding in the panel (`/th/audit/findings?finding=…`): it takes effect at once and the panel moves to the next pending finding; a reject asks for a reason.
```

- `:154` becomes:

```md
- [ ] Open `/th/audit/findings` and confirm the six tabs and their counts, the "รอบ:" / "เรื่อง:" filters, the panel's system-vs-found comparison and its sentence, the evidence links, and "ส่งออก ▾" (Excel and PDF) follow the same tab and filters.
```

- `:153`, `:155` and `:156` stay (`:156`, the conflict warning and its second press, still holds in the panel).

`DEVELOPER_HANDOFF.md`. Edit from the bottom up.
- After `:1245` (the last line of the plan 3 entry), add:

```md
- Page group 2, plan 4: the findings page and the export codes.
  - 2026-10-28, branch `feat/group2-audit-findings`. Not deployed, no migration. Plan `docs/superpowers/plans/2026-10-28-group2-audit-findings.md`.
  - Canvas B for `/audit/findings` (spec §10; bugs 17-19), and the codes in words in the five audit exports (the plan 2 carry-over).
  - **Review API:** a reject needs a reason (a discriminated union in `auditFindingReviewSchema`). The pending check sits inside the transaction (`updateMany` + count), so a decision applies once.
  - **Filters and data:** the six tabs, the sub-chips and the old URL values in `src/lib/audit-finding-filters.ts`; the page's data, the panel's finding and the next one in `src/lib/audit-findings-page-data.ts`.
  - **Batch:** a client loop over the review route through `classifyAuditFindingReviewResponse` / `foldAuditFindingBatchResults` (`src/lib/audit-finding-review-results.ts`). The new shared bar is `src/components/ui/desktop-selection-bar.tsx`, with its DESIGN.md section.
  - **Exports:** each takes `?locale=` (default `th`) and writes words. The headers and sheet names stay English. `actionTaken` has its own labels, and filenames add `filename*`.
  - **E2E:**
    - `e2e/audit/review-steps.ts` and `e2e/audit/review-words.ts`;
    - blocks 5-8 of `e2e/audit/field-audit.spec.ts`;
    - finding M4 opens a panel (`e2e/cross-cutting/roles.spec.ts`);
    - the dashboard's findings links land on their tab.
  - **Calls for the user to check:** P4-R1 (the StatStrip goes), P4-R2 (a Chip for เรื่อง), P4-R3 (`done` counts as open), P4-R7 (English headers), P4-R17 (no 409 in E2E), P4-R18 (the next finding, worked out on the server: after the decided one in the tab's order, else the first before it), P4-R24 (ไม่พบ's sentence without the transfer), P4-R25 (one dialog for the batch's approve).
```

- `:71` (the old "Audit Findings at `/th/audit/findings` … Summary cards still show …" bullet) becomes:

```md
- Audit Findings at `/th/audit/findings` (page group 2 plan 4) is the `รายการไม่ตรง` review page. It has six tabs with counts (รอพิจารณา / อนุมัติแล้ว / ปฏิเสธแล้ว / ต้องติดตาม / ปิดแล้ว / ทั้งหมด; old `status` values still land), the "รอบ:" / "เรื่อง:" filters and a table with ticks. A row opens the review panel through `?finding=<id>`, full screen on the phone. The panel holds:
  - the four-field comparison and the sentence of what approving changes;
  - approve / reject with no confirm dialog, a reason required to reject, and a move to the next pending finding;
  - the 409 second press;
  - the action plan, the close with evidence, the evidence list and the disposal link.

  `DesktopSelectionBar` decides several at once and reports "สำเร็จ X · ไม่สำเร็จ Y". "ส่งออก ▾" holds Excel and PDF, in the page's language. SOD, the close rules and the conflict check are unchanged.
```

- After `:69` (the last line of the plan 3 bullet), add:

```md
- Audit findings (page group 2 plan 4):
  - The tabs, the sub-chips and the old URL values: `src/lib/audit-finding-filters.ts`, with every filter in one `AND` list. Each count is its tab's rows within the round, type and search filters.
  - The page's data and the panel's finding, with the next pending one: `src/lib/audit-findings-page-data.ts`.
  - The review route refuses a reject without a reason and applies a decision once. The batch is a client loop over it, through `src/lib/audit-finding-review-results.ts`.
  - The five audit exports write words for codes by `?locale=`; the headers stay English.
```

`docs/06_WORKFLOWS.md`: `:159` becomes:

```md
- Use `/audit/findings` (page group 2 plan 4) as the `รายการไม่ตรง` follow-up after field scanning.
  - **Tabs:** รอพิจารณา / อนุมัติแล้ว / ปฏิเสธแล้ว / ต้องติดตาม (ต้องแก้ไข / เกินกำหนด / ต้องตรวจสอบพิเศษ) / ปิดแล้ว / ทั้งหมด, each with its count within the "รอบ:" / "เรื่อง:" filters and the search. Old `status` links open their tab.
  - **The panel:** a row (a card on the phone) opens the finding in it, with `?finding=`. It shows the four fields with the mismatched ones marked, the photo, the remark, who checked it, and what approving changes in the register.
  - **Deciding:** approve or reject there takes effect at once and moves to the next pending finding; a reject needs a reason, also in the API. An asset changed after the report needs a second press.
  - **Several at once:** on the desktop, ticks and the selection bar. The bar goes on past a failure, reports "สำเร็จ X · ไม่สำเร็จ Y", and skips a changed asset to the panel.
  - **Who:** the reporter cannot decide their own finding, and the panel says why. Without `audit:approve` nobody sees a decide, plan or close control.
  - **Follow-up:** the action plan and the close with evidence stay in the panel, for open rounds.
  - **Exports:** "ส่งออก ▾" exports Excel and PDF with the same filters, in the page's language.
```

`docs/11_FEATURE_LIST.md`:
- `:199`: the second cell becomes the following text, on one line (it is a table row: no line break, list or blank line inside the cell; keep the row's leading `| Audit Findings workflow | ` and trailing ` |`):

  `/audit/findings` (page group 2 plan 4): six tabs with counts (ต้องติดตาม with its sub-chips; old links land), the "รอบ:" / "เรื่อง:" filters and a Thai field-name search, a table with the เรื่อง chip and the component's parent, and a review panel by `?finding=` (full screen on the phone) that holds the four-field comparison and what approving changes; approve / reject at once with the next finding, and a required reject reason; the 409 second press; and the action plan and the close with evidence, the evidence list and the disposal link. It also has `DesktopSelectionBar` batches that report successes and failures, "ส่งออก ▾" Excel/PDF in the page's language, 25/50/100 per page, and the pager total equal to the tab's count.
- `:204` and `:248`: add "with statuses and results in words (`?locale=`), English headers" after the export names.

- [ ] **Step 9: Run the whole unit suite, the types and the lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. This includes:
- the guard files `tests/e2e-audit.test.ts`, `tests/e2e-cross-cutting.test.ts`, `tests/e2e-dashboard.test.ts`, `tests/e2e-fixes.test.ts` and `tests/e2e-audit-rounds.test.ts`;
- the docs pins: no template marker, and each changelog entry under its date heading;
- `tests/e2e-review.test.ts`: no DELETE and no hazard in the new or changed e2e files;
- `tests/e2e-suite.test.ts`: the specs take `test` from `../support/fixtures.ts`;
- `tests/thai-glossary.test.ts`. No message changed here.

- [ ] **Step 10: Commit**

```bash
git add e2e/audit/review-words.ts e2e/audit/review-steps.ts e2e/audit/field-audit.spec.ts e2e/cross-cutting/roles.spec.ts e2e/dashboard/dashboard-steps.ts e2e/dashboard/dashboard.spec.ts tests/e2e-audit.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-dashboard.test.ts docs/99_CHANGELOG.md docs/07_UAT_CHECKLIST.md DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/11_FEATURE_LIST.md
git commit -m "test(e2e): the audit review reads the new findings page (a row opens the panel with ?finding= and a reload reopens it, each decision moves to the next with k จาก N, a reject without a reason refused by the panel and the API, the component's ส่วนควบของ <parent> in the row and the panel, the desktop bar's batch with one failure on purpose, the own finding with no tick, the export in ส่งออก ▾ in words), finding M4 opens a panel, the dashboard's findings links land on their tab, and the docs record the plan (group 2 plan 4 task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 11 (the controller, not the implementer): the targeted E2E run, then the whole suite**

Each run needs:
- the VPN;
- `scratchpad/stay-awake.ps1`;
- a database probe first (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`);
- a clean build: `rm -rf .next && npm run build`.

**The targeted run:**

Run: `npx playwright test e2e/audit e2e/smoke e2e/dashboard e2e/cross-cutting/roles.spec.ts e2e/cross-cutting/reports.spec.ts`

Expected: every test passes in all four projects (the setup project runs first). Why each one is in the run:
- `e2e/audit`: the walk, the round page after it, the findings blocks 5-8 and the walk's "แสดงเพิ่ม".
- `e2e/smoke`: the cadence.
- `e2e/dashboard`: the three findings links' "จาก N รายการ" and their tabs.
- `roles`: M4's panel and the viewer's findings list (M5).
- `reports`: M1, and the findings exports' GETs ("Audit Findings" stays the sheet name).

**Then the whole suite, once** (spec §16, §17: it closes page group 2):

Run: `npx playwright test`

Expected: every test passes, about 360 tests in about an hour. The dev data grows about 230 assets.

Afterwards, in one commit on `feat/group2-audit-findings`, the controller adds:
- the "ผล E2E" bullet to the changelog entry: both run ids, and passed / failed / skipped per project;
- the run ids to the handoff bullet.

It then updates the AssetSystem wiki (`ams-status`, `ams-log`, and `ams-open-questions` for the calls above): page group 2 is built, pending the deploy. On deploy day, `AUD-2026-0002` is cancelled in the app.

---

## Appendix: Rulings

Rulings bind the tasks. Where a task and a ruling disagree, the ruling wins; where a ruling and the spec disagree, the spec wins and the controller rules again. Plans 1-3's rulings stand unless replaced here.

- P4-R1: The four-cell StatStrip goes; its numbers live on as the tab and sub-chip counts (keeps Appendix A §10's content).
- P4-R2: The เรื่อง column uses a `Chip` with the short word (DESIGN.md:437: a name is a Chip, not a status), not a StatusBadge. This departs on purpose from spec §10 (`2026-10-26-page-group-2-audit-design.md:213`, "a short-word `StatusBadge`") and binds the tasks over the "spec wins" line above (as P3-R17 did). It is a controller call for the user to check: the changelog entry and the handoff list it.
- P4-R3: ต้องติดตาม = action_open OR exception; overdue is its sub-chip; old URL values open their tab and sub-chip; each keeps today's round scope; `done` counts as open (as the close rule).
- P4-R4: The batch is a client loop over the single review route with a pure classifier; no new server route.
- P4-R5: Reject's reason is required in the schema (discriminated union); approve's stays optional. P4-R5b: the search matches Thai field names through the type list, and "เรื่อง:" filters by type.
- P4-R6: The review route guards the pending state inside its transaction, so a decision applies once.
- P4-R7: Exports translate codes and labels by the request's `locale` (default th); headers and sheet names stay English.
- P4-R8: `actionTaken` codes get words; an unknown one reads the nil mark.
- P4-R9: Export filenames are ASCII-safe with `filename*` for the full name.
- P4-R10: Plan and close are not offered on a closed or cancelled round.
- P4-R11: The owner column shows the owner's name (or nil), never an employee id.
- P4-R12: The back link honours `returnTo`, else the round with `roundId`, else the rounds list.
- P4-R13: Phone: tapping a card opens the panel full screen (`?finding=`), with a back to the list.
- P4-R14: After a decision the panel moves to the next pending finding on the page, else the first of the next page; none left → the panel says the tab is done.
- P4-R15: `DesktopSelectionBar` is sticky, shadowless, a registered shared part with its DESIGN.md section.
- P4-R16: The E2E batch step makes one failure on purpose by deciding a ticked finding through the API before pressing the bar.
- P4-R17: No E2E for the 409 (no reliable data); the classifier and the route test cover it.
- P4-R18: After a decision the panel opens the next finding the viewer may decide in the tab's order after the decided one; with none after it, the first such finding before it; with none at all, the panel says the tab is done. The server computes it (Task 2); its link carries `finding` and no page number, and a link with a finding but no page opens the page that holds it. Replaces P4-R14's "next page" wording.
- P4-R19: In the findings where, plain conditions stay as keys and only OR groups go into the `AND` list, so the bell's pending count and the round page's step-2 count stay equal (pins `waiting-work-links.test.ts:66`, `audit-round-page-rules.test.ts:47`).
- P4-R20: Task 2's data names are the contract: every field Task 3, Task 4 and Task 5 read (the panel data `queue`, `nextHref`, `siblings`, `reporterLabel`, labels; the rows' `parent`, `reportedByViewer`, owner label) is produced by Task 2 under one name.
- P4-R21: The plan dialog's owner list loads for `audit:approve` (the people who plan), not `audit:edit`.
- P4-R22: The UI pins on today's review dialog (`validation-guards.test.ts`, `v-track2-u.test.ts`) are rewritten by the task that removes that UI (Tasks 4-5), not Task 1.
- P4-R23: "อนุมัติทุกช่องของทรัพย์สินนี้" reports a failure in a notice in the panel (the V-form guard forbids a warning toast outside a catch).
- P4-R24: The consequence sentence: out_of_scope reads "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย"; not_found reads "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน" alone (moving a lost asset reads oddly). This departs on purpose from spec §10 (`2026-10-26-page-group-2-audit-design.md:227`, one sentence for both) and binds the tasks over the "spec wins" line above (as P3-R17 did). It is a controller call for the user to check: the changelog entry and the handoff list it. If the user asks for the spec's sentence, `auditFindingApprovalEffectKey` returns `effectNoChangeOutOfScope` for both reasons, and `effectNoChangeNotFound` leaves Task 4's change file, pins and markup line and Task 7's words.
- P4-R25: "อนุมัติที่เลือก N รายการ" asks once in a dialog with an optional remark before it sends (a batch changes many register fields); "ปฏิเสธที่เลือก" asks one shared reason (required). The panel's own approve / reject has no dialog (spec §10).
- P4-R26: The selection bar and ticks are desktop only (spec: `DesktopSelectionBar`); the phone decides one finding at a time in the full-screen panel.
- P4-R27: The reject error under the reason reads "กรุณาระบุเหตุผลการปฏิเสธ".
- P4-R28: "รอบ:" and "เรื่อง:" follow the house `FilterSelect` (its own label rule), with "ทุกรอบ" / "ทุกเรื่อง" as the empty choice.
- P4-R29: A not-yet-known `actionTaken` code reads as an empty cell in an export, never the code; the export sheet-name suffix may keep its ASCII filter code.
- P4-R30: The pager and the page-size links close the panel, as a tab or filter does (Task 3's `pageHref` passes no `finding`): a link with a finding and no page opens the finding's page (P4-R18), so a pager link to page 1 that kept the finding would land back on its page. Task 2's builder is unchanged. The redirect past the last page is not a pager link and keeps the open finding: `redirect(buildAuditFindingsHref(locale, filters, { page: lastPage, pageSize: listPage.pageSize, finding: filters.findingId }))`, so an old link or a batch that empties the last page leaves the panel on its finding.
- P4-R31: From `xl` the review pane sticks under the top of the scroll area and scrolls on its own (`xl:sticky xl:top-4 xl:max-h-[calc(100dvh_-_var(--shell-top)_-_3rem)] xl:overflow-y-auto`); rows and Task 4's next finding keep `scroll={false}`, and `AuditFindingPaneTop` (mounted per finding) opens each finding at its top: `#main` below `xl`, the pane from `xl`.
- P4-R32: The empty panel says the tab is done only on รอพิจารณา and ทั้งหมด (the tabs whose work is deciding); อนุมัติแล้ว, ปฏิเสธแล้ว, ต้องติดตาม and ปิดแล้ว keep "เลือกรายการทางซ้ายเพื่อพิจารณา". อนุมัติแล้ว and ปฏิเสธแล้ว hold no pending finding. ต้องติดตาม and ปิดแล้ว filter on the plan (`actionStatus`), not the review, so a finding whose plan was saved before its review can be pending there; their work is still the plan and the close.
- P4-R33: The panel's photo is the check's own, the oldest image in the finding's evidence (closure files are newer), and its `AssetPhotoFrame` is keyed by the photo, so a failed thumbnail never carries over to the next finding.
- P4-R34: The selection bar's last result is held by `audit/findings/layout.tsx` (`AuditFindingsBatchReportProvider`) above the page segment, for its own tab and filter (`filterKey`), so it survives the refresh's redirect to the last page. A selection provider that mounts for another tab or filter forgets it, so coming back shows none. It takes focus once, when it first shows (`StoredBatchReport.focused`); a later mount (another page of the filter, the redirect) takes it again only when the remount dropped focus to the body. No ref travels in the selection context (`react-hooks/refs`): the header tick and the result own their elements, and closing the result asks the header tick for focus through state (`selectAllFocusRequest`).
- P4-R35: Below `lg` the selection bar sits above the Mobile Field Navigation (`bottom-[calc(3.75rem+env(safe-area-inset-bottom))]`; the findings list is a navigation route); from `lg` it is flush (`lg:-bottom-6`).
- P4-R36: The tick column clears the table's first-column gutter (`p-0 first:pl-0 md:first:pl-0`), and `minWidth` stays 520 for both roles: the 44px comes out of the auto ทรัพย์สิน column, so the table fits beside the panel at 1280.
- P4-R37: ต้องตรวจสอบพิเศษ (the exception arm of ต้องติดตาม and its sub-chip) counts work still open: open rounds only (the operational scope) and not once its plan is closed (it reads under ปิดแล้ว). This departs from spec §10 ("each keeps the round scope it has today"), by the user's choice (2026-10-28, final review M-3).
