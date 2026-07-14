# Maintenance Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make corrective repair tickets and preventive maintenance plans lifecycle-safe, scalable, accessible, localized, permission-aware, and auditable while ensuring PM work never changes asset lifecycle.

**Architecture:** Add an explicit nullable PM-plan relation to maintenance tickets and centralize lifecycle, transition, evidence, and error policies in focused library modules. Keep list and detail pages as Server Components, move bounded option lookup and mutations to authenticated Route Handlers, and hydrate only shared interactive forms/dialog controllers. Use Prisma transactions and conditional updates for authoritative ticket/asset/movement changes.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2.4, TypeScript, Prisma 7.8 with SQL Server, next-intl 4.11, Tailwind CSS 4, Node test runner, Zod 4.4.

## Global Constraints

- PM work orders never change `Asset.statusId` when created, transitioned, completed, or closed.
- Corrective tickets move eligible assets through `Pending Repair`, `Under Maintenance`, then `Ready` or `Pending Disposal`.
- Closed maintenance evidence is append-only: authorized users may add an addendum but may not delete existing evidence.
- Read-only users must not see upload, delete, status, close, PM mutation, or create affordances.
- Maintenance lists use exact totals and server pagination with page sizes 25, 50, and 100.
- Bounded option search requires at least two trimmed characters and returns at most 50 active records.
- Follow the relevant Next.js 16.2.4 guides in `node_modules/next/dist/docs/`; do not use APIs from older Next.js versions.
- Preserve locale routing, sanitized `returnTo`, existing RBAC module/action names, SQL Server compatibility, and existing user changes outside the maintenance scope.
- Every behavior change follows RED-GREEN-REFACTOR and every task ends with focused verification before broader verification.

---

## File Structure

### New files

- `src/lib/maintenance-policy.ts`: ticket classification, lifecycle eligibility, transition, close, and evidence rules.
- `src/lib/maintenance-api-errors.ts`: stable error codes, typed API errors, response serialization, and client message-key mapping.
- `src/lib/local-date.ts`: local calendar date formatting for date inputs without UTC truncation.
- `src/lib/maintenance-list.ts`: pagination metadata and active-filter presentation helpers.
- `src/components/ui/accessible-dialog.tsx`: reusable focus-contained dialog shell for maintenance forms and previews.
- `src/components/maintenance/maintenance-option-select.tsx`: bounded async searchable selector that preserves the selected option.
- `src/components/maintenance/maintenance-ticket-actions.tsx`: one shared action controller/dialog owner for a rendered ticket list.
- `src/app/api/maintenance-options/route.ts`: authenticated bounded asset, employee, and supplier lookup.
- `src/app/[locale]/(dashboard)/maintenance/new/page.tsx`: corrective ticket creation page.
- `src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx`: PM plan creation page.
- `src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx`: PM plan edit page.
- `src/app/api/maintenance-plans/[id]/route.ts`: PM update, pause, resume, and end mutations.
- `prisma/manual-migrations/2026-07-14-add-maintenance-plan-ticket-link.sql`: idempotent SQL Server migration.
- Focused tests named in each task below.

### Main modified files

- `prisma/schema.prisma`
- `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- `src/app/api/maintenance-tickets/route.ts`
- `src/app/api/maintenance-tickets/[id]/route.ts`
- `src/app/api/maintenance-tickets/[id]/attachments/route.ts`
- `src/app/api/attachments/[id]/route.ts`
- `src/app/api/maintenance-plans/route.ts`
- `src/app/api/maintenance-plans/[id]/generate-ticket/route.ts`
- `src/lib/preventive-maintenance-ticket-generator.ts`
- `src/lib/maintenance-query.ts`
- `src/lib/validations/maintenance.ts`
- `src/components/maintenance/*.tsx`
- `messages/th.json`, `messages/en.json`
- `docs/06_WORKFLOWS.md`, `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `DEVELOPER_HANDOFF.md`

---

### Task 1: Maintenance domain policy, explicit PM relation, and local date helper

**Files:**
- Create: `src/lib/maintenance-policy.ts`
- Create: `src/lib/maintenance-api-errors.ts`
- Create: `src/lib/local-date.ts`
- Modify: `prisma/schema.prisma:692-756`
- Create: `prisma/manual-migrations/2026-07-14-add-maintenance-plan-ticket-link.sql`
- Test: `tests/maintenance-policy.test.ts`
- Test: `tests/maintenance-api-errors.test.ts`
- Test: `tests/local-date.test.ts`
- Test: `tests/maintenance-schema.test.ts`

**Interfaces:**
- Produces: `isPreventiveMaintenanceTicket(ticket)`, `getCorrectiveAssetEligibilityError(statusName, activeCorrectiveCount)`, `getAllowedMaintenanceTransitions(status)`, `getCorrectiveLifecycleTarget(status)`, `canCloseMaintenanceTicket(ticket)`, `canDeleteMaintenanceEvidence(ticketStatus)`, `MaintenanceApiError`, `maintenanceErrorResponse(error)`, `toLocalDateInputValue(date)`.
- Consumes: existing maintenance status names, `[PM]` legacy prefix, Prisma ticket and plan models.

- [ ] **Step 1: Write failing policy, schema, error, and date tests**

```ts
test("classifies an explicitly linked ticket as PM without reading problem text", () => {
  assert.equal(isPreventiveMaintenanceTicket({ maintenancePlanId: "plan-1", problem: "Battery check" }), true)
})

test("uses the legacy PM prefix only when the explicit relation is absent", () => {
  assert.equal(isPreventiveMaintenanceTicket({ maintenancePlanId: null, problem: "[PM] PM-1 - UPS" }), true)
  assert.equal(isPreventiveMaintenanceTicket({ maintenancePlanId: null, problem: "UPS failure" }), false)
})

test("rejects terminal and conflicting corrective assets", () => {
  assert.equal(getCorrectiveAssetEligibilityError("Disposed", 0), "MAINTENANCE_ASSET_INELIGIBLE")
  assert.equal(getCorrectiveAssetEligibilityError("Ready", 1), "MAINTENANCE_ACTIVE_TICKET_EXISTS")
  assert.equal(getCorrectiveAssetEligibilityError("Ready", 0), null)
})

test("maps corrective in-progress to Under Maintenance and PM to no lifecycle target", () => {
  assert.equal(getCorrectiveLifecycleTarget("in_progress"), "Under Maintenance")
  assert.equal(getCorrectiveLifecycleTarget("waiting_parts"), null)
})

test("formats a Bangkok local date without UTC rollback", () => {
  assert.equal(toLocalDateInputValue(new Date("2026-07-14T00:30:00+07:00")), "2026-07-14")
})

test("schema links PM plans to generated tickets", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8")
  assert.match(schema, /maintenancePlanId\s+String\?/)
  assert.match(schema, /@@index\(\[maintenancePlanId\]/)
})
```

- [ ] **Step 2: Run the new tests and verify RED**

Run: `node --test tests/maintenance-policy.test.ts tests/maintenance-api-errors.test.ts tests/local-date.test.ts tests/maintenance-schema.test.ts`

Expected: FAIL because the new modules, Prisma fields, and migration do not exist.

- [ ] **Step 3: Implement the minimal domain interfaces**

```ts
export type MaintenanceTicketKindInput = { maintenancePlanId?: string | null; problem?: string | null }

export function isPreventiveMaintenanceTicket(ticket: MaintenanceTicketKindInput) {
  return Boolean(ticket.maintenancePlanId) || /^\[PM\]\s+[^\s]+\s+-/.test(ticket.problem?.trim() ?? "")
}

const correctiveBlockedStatuses = new Set([
  "pending disposal", "disposed", "retired", "lost", "missing", "under maintenance", "pending repair",
])

export function getCorrectiveAssetEligibilityError(statusName: string, activeCorrectiveCount: number) {
  if (correctiveBlockedStatuses.has(statusName.trim().toLowerCase())) return "MAINTENANCE_ASSET_INELIGIBLE" as const
  if (activeCorrectiveCount > 0) return "MAINTENANCE_ACTIVE_TICKET_EXISTS" as const
  return null
}

export function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
```

Add `maintenancePlanId String?`, the named relation on `MaintenanceTicket`, the reverse `tickets MaintenanceTicket[]` relation on `MaintenancePlan`, and `@@index([maintenancePlanId], map: "IX_maintenance_tickets_maintenancePlanId")`. The SQL migration must guard `COL_LENGTH`, create the foreign key only when absent, and create the index only when absent.

- [ ] **Step 4: Run focused tests and Prisma validation**

Run: `node --test tests/maintenance-policy.test.ts tests/maintenance-api-errors.test.ts tests/local-date.test.ts tests/maintenance-schema.test.ts && npm run prisma:generate`

Expected: all focused tests PASS and Prisma Client generation succeeds.

- [ ] **Step 5: Commit the domain foundation**

```bash
git add src/lib/maintenance-policy.ts src/lib/maintenance-api-errors.ts src/lib/local-date.ts prisma/schema.prisma prisma/manual-migrations/2026-07-14-add-maintenance-plan-ticket-link.sql tests/maintenance-policy.test.ts tests/maintenance-api-errors.test.ts tests/local-date.test.ts tests/maintenance-schema.test.ts
git commit -m "feat(maintenance): add workflow policy foundation"
```

### Task 2: Truthful maintenance query state and pagination

**Files:**
- Modify: `src/lib/maintenance-query.ts`
- Create: `src/lib/maintenance-list.ts`
- Modify: `src/lib/maintenance-view.ts`
- Test: `tests/maintenance-query.test.ts`
- Modify: `tests/maintenance-view.test.ts`
- Create: `tests/maintenance-list.test.ts`

**Interfaces:**
- Consumes: maintenance status, repair type, evidence, overdue, date, page, and page-size query fields.
- Produces: `parseMaintenanceListParams`, `getMaintenanceDateRangeError`, `buildMaintenanceQueryString`, `buildMaintenancePagination`, `getMaintenanceBoardCompatibility`.

- [ ] **Step 1: Write failing pagination, date-range, and board tests**

```ts
test("normalizes maintenance pagination to 25, 50, or 100", () => {
  assert.equal(parseMaintenanceListParams({ page: "3", pageSize: "50" }).page, 3)
  assert.equal(parseMaintenanceListParams({ page: "0", pageSize: "10" }).pageSize, 25)
})

test("reports an inverted date range without querying a misleading range", () => {
  const filters = parseMaintenanceListParams({ dateFrom: "2026-07-20", dateTo: "2026-07-14" })
  assert.equal(getMaintenanceDateRangeError(filters), "invalid_order")
  assert.deepEqual(buildMaintenanceWhere(filters), { isActive: true })
})

test("closed and legacy open status filters require table layout", () => {
  assert.equal(getMaintenanceBoardCompatibility("closed"), "table_required")
  assert.equal(getMaintenanceBoardCompatibility("open"), "table_required")
  assert.equal(getMaintenanceBoardCompatibility("waiting_parts"), "compatible")
})
```

- [ ] **Step 2: Run the focused query tests and verify RED**

Run: `node --test tests/maintenance-query.test.ts tests/maintenance-view.test.ts tests/maintenance-list.test.ts`

Expected: FAIL because page/pageSize, date-range validation, and board compatibility are missing.

- [ ] **Step 3: Implement normalized list state and URL preservation**

Extend `MaintenanceListParams` with `page?: string | string[] | number` and `pageSize?: string | string[] | number`. Return `page` and `pageSize`, include both in query strings, reset page to 1 when filters or layout change, and omit date predicates when `dateFrom > dateTo`.

```ts
export function buildMaintenancePagination(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  return { page: safePage, pageSize, total, totalPages, start: total ? (safePage - 1) * pageSize + 1 : 0, end: Math.min(safePage * pageSize, total) }
}
```

- [ ] **Step 4: Run focused query tests**

Run: `node --test tests/maintenance-query.test.ts tests/maintenance-view.test.ts tests/maintenance-list.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit truthful list-state helpers**

```bash
git add src/lib/maintenance-query.ts src/lib/maintenance-list.ts src/lib/maintenance-view.ts tests/maintenance-query.test.ts tests/maintenance-view.test.ts tests/maintenance-list.test.ts
git commit -m "feat(maintenance): add truthful pagination state"
```

### Task 3: Corrective ticket transactional lifecycle and conflict handling

**Files:**
- Create: `src/lib/maintenance-ticket-service.ts`
- Modify: `src/app/api/maintenance-tickets/route.ts`
- Modify: `src/app/api/maintenance-tickets/[id]/route.ts`
- Modify: `src/lib/validations/maintenance.ts`
- Test: `tests/maintenance-ticket-service.test.ts`
- Create: `tests/maintenance-ticket-routes.test.ts`

**Interfaces:**
- Consumes: Task 1 policy and API errors, Prisma transaction client, current user id.
- Produces: `createCorrectiveMaintenanceTicket`, `transitionMaintenanceTicket`, `closeMaintenanceTicket`.

- [ ] **Step 1: Write failing service tests with an injected transaction adapter**

```ts
test("corrective creation rejects a second active corrective ticket", async () => {
  await assert.rejects(
    () => createCorrectiveMaintenanceTicket(fakeDb({ activeCorrectiveCount: 1 }), input, user),
    (error: unknown) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_ACTIVE_TICKET_EXISTS",
  )
})

test("corrective in-progress updates ticket, asset, and movement atomically", async () => {
  const db = fakeDb({ ticketKind: "corrective", ticketStatus: "accepted", assetStatus: "Pending Repair" })
  await transitionMaintenanceTicket(db, "ticket-1", { repairStatus: "in_progress", expectedUpdatedAt }, user)
  assert.deepEqual(db.events, ["ticket:in_progress", "asset:Under Maintenance", "movement:maintenance_status_update"])
})

test("stale transition returns a typed conflict", async () => {
  await assert.rejects(
    () => transitionMaintenanceTicket(fakeDb({ conditionalUpdateCount: 0 }), "ticket-1", statusInput, user),
    hasMaintenanceCode("MAINTENANCE_CONFLICT"),
  )
})
```

- [ ] **Step 2: Run service and route tests and verify RED**

Run: `node --test tests/maintenance-ticket-service.test.ts tests/maintenance-ticket-routes.test.ts`

Expected: FAIL because the service and expected concurrency field do not exist.

- [ ] **Step 3: Implement transactional corrective behavior**

Move business mutations out of Route Handlers into `maintenance-ticket-service.ts`. Validate active referenced records. Use one `$transaction` for ticket, asset, and movement mutations. Add `expectedUpdatedAt` to status/close schemas and use `updateMany({ where: { id, updatedAt: expectedUpdatedAt, repairStatus: currentStatus } })`; throw `MAINTENANCE_CONFLICT` when count is zero.

Wrap repair-number generation and transaction creation in `withPrismaUniqueRetry`. The retry callback regenerates the daily candidate number on every attempt.

Route Handlers retain `requireAuth()` and `requirePermission()` and serialize `MaintenanceApiError` with the stable code and correct 400/409 status.

- [ ] **Step 4: Run focused service, route, lifecycle, and validation tests**

Run: `node --test tests/maintenance-ticket-service.test.ts tests/maintenance-ticket-routes.test.ts tests/maintenance-validation.test.ts tests/maintenance-policy.test.ts tests/prisma-unique-retry.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit corrective lifecycle hardening**

```bash
git add src/lib/maintenance-ticket-service.ts src/app/api/maintenance-tickets/route.ts src/app/api/maintenance-tickets/[id]/route.ts src/lib/validations/maintenance.ts tests/maintenance-ticket-service.test.ts tests/maintenance-ticket-routes.test.ts
git commit -m "fix(maintenance): enforce corrective lifecycle"
```

### Task 4: Explicit PM work orders and manageable PM plans

**Files:**
- Modify: `src/lib/preventive-maintenance-ticket-generator.ts`
- Modify: `src/app/api/maintenance-plans/route.ts`
- Create: `src/app/api/maintenance-plans/[id]/route.ts`
- Modify: `src/app/api/maintenance-plans/[id]/generate-ticket/route.ts`
- Modify: `src/app/api/maintenance-plans/generate-due/route.ts`
- Modify: `src/lib/validations/maintenance.ts`
- Test: `tests/preventive-maintenance-generation.test.ts`
- Create: `tests/maintenance-plan-service.test.ts`
- Create: `tests/maintenance-plan-routes.test.ts`

**Interfaces:**
- Consumes: explicit `maintenancePlanId`, plan `isActive`, bounded generation limit, active employee and asset validation.
- Produces: PM tickets linked to plans; update/pause/resume/end plan mutations; starvation-safe due generation.

- [ ] **Step 1: Write failing PM relation, lifecycle-isolation, and plan-state tests**

```ts
test("generated PM ticket stores its source plan", async () => {
  const result = await generatePreventiveMaintenanceTicketForPlan({ plan, generatedByUserId: "user-1", prismaClient: fakePrisma })
  assert.equal(result.status, "created")
  assert.equal(fakePrisma.createdTicket.maintenancePlanId, plan.id)
})

test("closing a PM ticket does not write an asset update", async () => {
  const db = fakeDb({ ticketKind: "pm", ticketStatus: "completed" })
  await closeMaintenanceTicket(db, "ticket-1", pmCloseInput, user)
  assert.equal(db.events.includes("asset:update"), false)
})

test("paused and ended plans are excluded from generation", async () => {
  assert.deepEqual(await selectDuePlans(fakePlanDb([{ isActive: false }, { isActive: true }])), [activePlan])
})
```

- [ ] **Step 2: Run PM tests and verify RED**

Run: `node --test tests/preventive-maintenance-generation.test.ts tests/maintenance-plan-service.test.ts tests/maintenance-plan-routes.test.ts tests/maintenance-ticket-service.test.ts`

Expected: FAIL because PM tickets do not store `maintenancePlanId` and plan mutation routes do not exist.

- [ ] **Step 3: Implement PM isolation and plan mutations**

Set `maintenancePlanId: plan.id` in generated tickets. PM status and close service paths update only ticket and movement, never asset. Split close validation so PM payload omits `nextStatusId` while corrective payload requires it.

Implement `PATCH /api/maintenance-plans/[id]` with actions:

```ts
type MaintenancePlanAction =
  | { action: "update"; title: string; frequency: MaintenancePlanFrequency; intervalDays?: number; nextDueDate: string; assignedToId?: string | null; vendorId?: string | null; notes?: string | null }
  | { action: "pause" }
  | { action: "resume" }
  | { action: "end" }
```

`pause` and `end` set `isActive=false`; `resume` sets `isActive=true` after asset and employee revalidation. Record distinct audit actions. Make due generation skip missing reporters without allowing the first 50 duplicate due plans to starve later eligible plans: fetch a bounded larger candidate window, classify duplicates, and continue until the requested eligible processing limit is reached.

- [ ] **Step 4: Run focused PM and ticket tests**

Run: `node --test tests/preventive-maintenance.test.ts tests/preventive-maintenance-generation.test.ts tests/maintenance-plan-service.test.ts tests/maintenance-plan-routes.test.ts tests/maintenance-ticket-service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit explicit PM behavior**

```bash
git add src/lib/preventive-maintenance-ticket-generator.ts src/app/api/maintenance-plans/route.ts src/app/api/maintenance-plans/[id]/route.ts src/app/api/maintenance-plans/[id]/generate-ticket/route.ts src/app/api/maintenance-plans/generate-due/route.ts src/lib/validations/maintenance.ts tests/preventive-maintenance-generation.test.ts tests/maintenance-plan-service.test.ts tests/maintenance-plan-routes.test.ts
git commit -m "feat(maintenance): separate preventive work orders"
```

### Task 5: Append-only closed evidence and permission-aware UI contract

**Files:**
- Modify: `src/app/api/maintenance-tickets/[id]/attachments/route.ts`
- Modify: `src/app/api/attachments/[id]/route.ts`
- Modify: `src/components/maintenance/maintenance-attachments.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- Create: `tests/maintenance-evidence-policy.test.ts`
- Create: `tests/maintenance-attachments-ui.test.ts`

**Interfaces:**
- Consumes: `canDeleteMaintenanceEvidence`, `canEdit`, ticket closed state.
- Produces: read-only attachment rendering, post-close addendum uploads, API-level delete lock.

- [ ] **Step 1: Write failing policy, API source, and UI contract tests**

```ts
test("closed maintenance evidence is append-only", () => {
  assert.equal(canDeleteMaintenanceEvidence("closed"), false)
  assert.equal(canDeleteMaintenanceEvidence("in_progress"), true)
})

test("read-only attachment UI omits mutation controls", async () => {
  const source = await readFile("src/components/maintenance/maintenance-attachments.tsx", "utf8")
  assert.match(source, /canEdit: boolean/)
  assert.match(source, /canDelete: boolean/)
  assert.match(source, /canEdit \? .*FileDropzone/s)
})

test("generic attachment delete consults maintenance ticket state", async () => {
  const source = await readFile("src/app/api/attachments/[id]/route.ts", "utf8")
  assert.match(source, /MAINTENANCE_EVIDENCE_LOCKED/)
})
```

- [ ] **Step 2: Run evidence tests and verify RED**

Run: `node --test tests/maintenance-evidence-policy.test.ts tests/maintenance-attachments-ui.test.ts`

Expected: FAIL because closed-state and permission props are absent.

- [ ] **Step 3: Implement append-only evidence**

Select `repairStatus` in the upload route and include `{ postCloseAddendum: ticket.repairStatus === "closed" }` in the upload audit payload. In generic DELETE, when `module === "maintenance"`, load the referenced ticket and reject closed records with `MAINTENANCE_EVIDENCE_LOCKED` before soft deletion.

Pass `canEdit` and `isClosed` from detail page. Render upload only for `canEdit`, delete only for `canEdit && !isClosed`, and keep preview/download for viewers. Replace `window.confirm` with the accessible confirmation dialog introduced in Task 7; until Task 7 lands, expose a controlled confirmation state without browser prompts.

- [ ] **Step 4: Run evidence and upload security tests**

Run: `node --test tests/maintenance-evidence-policy.test.ts tests/maintenance-attachments-ui.test.ts tests/upload-validation.test.ts tests/my-assets-attachment-permission.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit evidence hardening**

```bash
git add src/app/api/maintenance-tickets/[id]/attachments/route.ts src/app/api/attachments/[id]/route.ts src/components/maintenance/maintenance-attachments.tsx src/app/[locale]/\(dashboard\)/maintenance/[id]/page.tsx tests/maintenance-evidence-policy.test.ts tests/maintenance-attachments-ui.test.ts
git commit -m "fix(maintenance): make closed evidence append only"
```

### Task 6: Bounded maintenance option search and queue-first create routes

**Files:**
- Create: `src/app/api/maintenance-options/route.ts`
- Refactor: `src/lib/maintenance-options.ts`
- Create: `src/components/maintenance/maintenance-option-select.tsx`
- Modify: `src/components/maintenance/maintenance-ticket-form.tsx`
- Modify: `src/components/maintenance/maintenance-plan-form.tsx`
- Create: `src/app/[locale]/(dashboard)/maintenance/new/page.tsx`
- Create: `src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx`
- Create: `src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx`
- Test: `tests/maintenance-options.test.ts`
- Create: `tests/maintenance-create-routes.test.ts`
- Create: `tests/maintenance-option-select.test.ts`

**Interfaces:**
- Consumes: authenticated query `{ type: "asset"|"employee"|"supplier", q: string, id?: string }`.
- Produces: `{ data: Array<{ id: string; label: string; disabled?: boolean; reason?: string }> }`, max 50.

- [ ] **Step 1: Write failing bounded-search and route-structure tests**

```ts
test("maintenance option search returns no broad result below two characters", async () => {
  assert.deepEqual(await searchMaintenanceOptions(fakeDb, { type: "asset", q: "a" }), [])
})

test("maintenance option search caps active results at fifty", async () => {
  await searchMaintenanceOptions(fakeDb, { type: "employee", q: "สม" })
  assert.equal(fakeDb.lastTake, 50)
})

test("maintenance list no longer embeds create forms", async () => {
  const page = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.doesNotMatch(page, /<MaintenanceTicketForm/)
  assert.doesNotMatch(page, /<MaintenancePlanForm/)
})
```

- [ ] **Step 2: Run option and create-route tests and verify RED**

Run: `node --test tests/maintenance-options.test.ts tests/maintenance-create-routes.test.ts tests/maintenance-option-select.test.ts`

Expected: FAIL because bounded maintenance options and create routes do not exist.

- [ ] **Step 3: Implement authenticated bounded option lookup and dedicated forms**

The API requires `maintenance:view` for lookup and the page/action still requires `maintenance:create` or `maintenance:edit`. Asset options include lifecycle eligibility metadata instead of silently hiding blocked assets. `id` lookup may return the current selected record even when the search query is blank.

`MaintenanceOptionSelect` debounces by 250ms, aborts superseded requests, announces loading/no-results, preserves the selected option, and uses the existing searchable-select keyboard semantics.

Move ticket form to `/maintenance/new`, PM create to `/maintenance/pm/new`, and PM edit to `/maintenance/pm/[id]/edit`. Each page has Breadcrumbs, a unique h1 for Next route announcements, Back/Cancel preserving sanitized maintenance `returnTo`, and permission enforcement before data queries.

- [ ] **Step 4: Run focused options, form, navigation, and accessibility tests**

Run: `node --test tests/maintenance-options.test.ts tests/maintenance-create-routes.test.ts tests/maintenance-option-select.test.ts tests/searchable-select-accessibility.test.ts tests/searchable-select-navigation.test.ts tests/operational-return-navigation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit bounded forms and routes**

```bash
git add src/app/api/maintenance-options/route.ts src/lib/maintenance-options.ts src/components/maintenance/maintenance-option-select.tsx src/components/maintenance/maintenance-ticket-form.tsx src/components/maintenance/maintenance-plan-form.tsx src/app/[locale]/\(dashboard\)/maintenance/new/page.tsx src/app/[locale]/\(dashboard\)/maintenance/pm/new/page.tsx src/app/[locale]/\(dashboard\)/maintenance/pm/[id]/edit/page.tsx tests/maintenance-options.test.ts tests/maintenance-create-routes.test.ts tests/maintenance-option-select.test.ts
git commit -m "feat(maintenance): add bounded create workflows"
```

### Task 7: Accessible dialogs and single list action controller

**Files:**
- Create: `src/components/ui/accessible-dialog.tsx`
- Create: `src/components/maintenance/maintenance-ticket-actions.tsx`
- Modify: `src/components/maintenance/maintenance-ticket-status-button.tsx`
- Modify: `src/components/maintenance/maintenance-ticket-close-button.tsx`
- Modify: `src/components/maintenance/maintenance-attachments.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- Create: `tests/accessible-dialog.test.ts`
- Create: `tests/maintenance-action-controller.test.ts`

**Interfaces:**
- Produces: `AccessibleDialog({ open, title, description, busy, initialFocusRef, onClose, children })`; `MaintenanceTicketActions({ tickets, employeesEndpoint, statusLabels })`.
- Consumes: selected ticket id and action type from row/card buttons; Task 3 expected timestamp and Task 4 ticket kind.

- [ ] **Step 1: Write failing dialog and controller structure tests**

```ts
test("accessible dialog defines modal semantics, escape, focus trap, and restoration", async () => {
  const source = await readFile("src/components/ui/accessible-dialog.tsx", "utf8")
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /event\.key === "Escape"/)
  assert.match(source, /restoreFocusRef/)
})

test("maintenance list owns one shared action controller", async () => {
  const page = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.equal((page.match(/<MaintenanceTicketActions/g) ?? []).length, 1)
  assert.doesNotMatch(page, /tickets\.map[\s\S]*<MaintenanceTicketCloseButton/)
})
```

- [ ] **Step 2: Run dialog and action tests and verify RED**

Run: `node --test tests/accessible-dialog.test.ts tests/maintenance-action-controller.test.ts tests/maintenance-attachments-ui.test.ts`

Expected: FAIL because the shared dialog and controller do not exist.

- [ ] **Step 3: Implement the dialog primitive and central action state**

Adapt the established focus-containment pattern from `ConfirmTextDialog`, including dynamic focusable elements, busy-state Escape protection, backdrop dismissal, and trigger focus restoration. Add visible focus rings to all dialog buttons.

Rows and cards emit data attributes or call one lightweight controller callback with `{ ticketId, action }`. The controller renders one status dialog and one close dialog for the selected ticket. Corrective close renders only Ready/Pending Disposal; PM close renders no asset status. Missing evidence renders a disabled close action with an evidence anchor explanation.

- [ ] **Step 4: Run dialog, action, mobile, and visual-consistency tests**

Run: `node --test tests/accessible-dialog.test.ts tests/maintenance-action-controller.test.ts tests/maintenance-attachments-ui.test.ts tests/confirm-text-dialog-ui.test.ts tests/mobile-action-bar.test.ts tests/visual-consistency-ui.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit accessible maintenance actions**

```bash
git add src/components/ui/accessible-dialog.tsx src/components/maintenance/maintenance-ticket-actions.tsx src/components/maintenance/maintenance-ticket-status-button.tsx src/components/maintenance/maintenance-ticket-close-button.tsx src/components/maintenance/maintenance-attachments.tsx src/app/[locale]/\(dashboard\)/maintenance/page.tsx src/app/[locale]/\(dashboard\)/maintenance/[id]/page.tsx tests/accessible-dialog.test.ts tests/maintenance-action-controller.test.ts
git commit -m "fix(maintenance): make ticket actions accessible"
```

### Task 8: Paginated queue-first tickets and PM workspace

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Create: `src/components/maintenance/maintenance-pagination.tsx`
- Modify: `src/lib/maintenance-view.ts`
- Modify: `src/app/api/maintenance-tickets/route.ts`
- Modify: `src/app/api/maintenance-plans/route.ts`
- Create: `tests/maintenance-queue-ux.test.ts`
- Create: `tests/maintenance-pagination-ui.test.ts`
- Modify: `tests/maintenance-view.test.ts`

**Interfaces:**
- Consumes: Task 2 filters/pagination, Task 6 create routes, Task 7 action controller.
- Produces: exact ticket/plan totals, tab-specific queries, KPI drilldowns, active-filter summary, paginated table/cards, operational board.

- [ ] **Step 1: Write failing queue structure and query-efficiency tests**

```ts
test("ticket query uses exact count plus requested page", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /prisma\.maintenanceTicket\.count/)
  assert.match(source, /skip: \(listFilters\.page - 1\) \* listFilters\.pageSize/)
  assert.match(source, /take: listFilters\.pageSize/)
})

test("PM summary uses aggregates rather than a truncated preview", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /getMaintenancePlanSummary/)
  assert.doesNotMatch(source, /summarizeMaintenancePlans\(maintenancePlans/)
})

test("evidence IDs load only for evidence filters", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /listFilters\.evidence \? getMaintenanceAttachmentTicketIds\(\)/)
})
```

- [ ] **Step 2: Run queue and pagination tests and verify RED**

Run: `node --test tests/maintenance-queue-ux.test.ts tests/maintenance-pagination-ui.test.ts tests/maintenance-view.test.ts tests/maintenance-list.test.ts`

Expected: FAIL because the page still uses fixed takes and unconditional cross-tab queries.

- [ ] **Step 3: Implement tab-specific server queries and queue-first layout**

For `view=tickets`, fetch ticket count, requested page, four summary counts, and evidence IDs only when requested. For `view=pm`, fetch PM aggregate counts and requested plan page without fetching ticket rows. Fetch no full master-data options on the list page.

Header primary action is tab-specific: `/maintenance/new` for tickets and `/maintenance/pm/new` for PM. KPI cards are links that preserve compatible filters and reset page. Render active-filter chips and invalid-date message. Add pagination range, previous/next, exact total, and 25/50/100 controls.

Board remains an open-work view using the current bounded result and displays a clear table-mode action for incompatible status filters. Do not silently omit closed or legacy open results.

- [ ] **Step 4: Run queue, view, return-navigation, and responsive tests**

Run: `node --test tests/maintenance-queue-ux.test.ts tests/maintenance-pagination-ui.test.ts tests/maintenance-view.test.ts tests/maintenance-list.test.ts tests/operational-return-navigation.test.ts tests/mobile-field-navigation.test.ts tests/design-system.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the queue-first workspace**

```bash
git add src/app/[locale]/\(dashboard\)/maintenance/page.tsx src/components/maintenance/maintenance-pagination.tsx src/lib/maintenance-view.ts src/app/api/maintenance-tickets/route.ts src/app/api/maintenance-plans/route.ts tests/maintenance-queue-ux.test.ts tests/maintenance-pagination-ui.test.ts tests/maintenance-view.test.ts
git commit -m "feat(maintenance): build paginated workspaces"
```

### Task 9: Localization, contrast, history labels, and production copy

**Files:**
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- Modify: `src/components/maintenance/*.tsx`
- Modify: `src/lib/movement-labels.ts`
- Create: `tests/maintenance-i18n.test.ts`
- Create: `tests/maintenance-contrast.test.ts`
- Create: `tests/maintenance-history-labels.test.ts`

**Interfaces:**
- Consumes: stable error codes and ticket kind.
- Produces: complete Thai/English message parity, localized maintenance movement labels, AA semantic foreground classes, local-date defaults.

- [ ] **Step 1: Write failing message parity, error-code, contrast, and history tests**

```ts
test("Thai and English define every maintenance error code", async () => {
  for (const code of maintenanceErrorCodes) {
    assert.equal(typeof th.maintenancePage.errors[code], "string")
    assert.equal(typeof en.maintenancePage.errors[code], "string")
  }
})

test("maintenance warning and success copy uses foreground tokens", async () => {
  const source = await readMaintenanceSources()
  assert.doesNotMatch(source, /text-warning(?:\s|\")/)
  assert.doesNotMatch(source, /text-success(?:\s|\")/)
  assert.match(source, /text-warning-foreground/)
  assert.match(source, /text-success-foreground/)
})

test("maintenance movement types have localized labels", () => {
  assert.equal(getMaintenanceMovementLabel("maintenance_status_update", labels), labels.statusUpdate)
})
```

- [ ] **Step 2: Run i18n, contrast, and history tests and verify RED**

Run: `node --test tests/maintenance-i18n.test.ts tests/maintenance-contrast.test.ts tests/maintenance-history-labels.test.ts tests/local-date.test.ts`

Expected: FAIL because stable error messages and localized movement labels are missing and base semantic colors are still used as text.

- [ ] **Step 3: Add production copy and semantic presentation**

Add tab-specific actions, PM/corrective labels, automation-blocked help, append-only evidence help, pagination/range copy, invalid date copy, concurrency recovery copy, and every stable API error in Thai and English. Replace raw API message display with `getMaintenanceErrorMessage(payload?.code, t)`.

Use `text-warning-foreground` and `text-success-foreground` for small text. Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to interactive maintenance controls. Replace raw movement `replaceAll` display with localized labels. Replace every `toISOString().slice(0, 10)` default in maintenance components with `toLocalDateInputValue`.

- [ ] **Step 4: Run localization, visual, and maintenance tests**

Run: `node --test tests/maintenance-i18n.test.ts tests/maintenance-contrast.test.ts tests/maintenance-history-labels.test.ts tests/local-date.test.ts tests/visual-consistency-ui.test.ts tests/maintenance-validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit localization and visual hardening**

```bash
git add messages/th.json messages/en.json src/app/[locale]/\(dashboard\)/maintenance/page.tsx src/app/[locale]/\(dashboard\)/maintenance/[id]/page.tsx src/components/maintenance src/lib/movement-labels.ts tests/maintenance-i18n.test.ts tests/maintenance-contrast.test.ts tests/maintenance-history-labels.test.ts
git commit -m "fix(maintenance): localize resilient workflows"
```

### Task 10: Documentation, migration verification, and complete release checks

**Files:**
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/11_FEATURE_LIST.md`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `DEPLOYMENT_UBUNTU_CLOUDFLARE.md` if migration application steps are catalogued there.
- Test: all maintenance and repository tests.

**Interfaces:**
- Consumes: every completed task.
- Produces: deployable migration instructions, updated workflow truth, UAT coverage, verified production build.

- [ ] **Step 1: Update docs to match implemented behavior exactly**

Document:

- Corrective versus PM semantics.
- PM never changing asset lifecycle.
- New ticket-to-plan migration and deployment order.
- Corrective lifecycle transitions and conflict response.
- Append-only closed evidence.
- PM edit/pause/resume/end and automation-blocked state.
- Queue pagination and bounded option search.
- Keyboard dialog and mobile UAT.

- [ ] **Step 2: Run focused maintenance verification**

Run:

```powershell
node --test tests/maintenance-*.test.ts tests/preventive-maintenance*.test.ts tests/local-date.test.ts tests/accessible-dialog.test.ts
```

Expected: all focused tests PASS with zero failures.

- [ ] **Step 3: Run static design and lint checks**

Run:

```powershell
node .agents/skills/impeccable/scripts/detect.mjs --json "src/app/[locale]/(dashboard)/maintenance" "src/components/maintenance"
npm run lint
```

Expected: detector returns no actionable anti-patterns and ESLint exits 0.

- [ ] **Step 4: Run repository verification**

Run: `npm run verify`

Expected: full tests, Prisma generation, and TypeScript checks exit 0.

- [ ] **Step 5: Run the Next.js production build**

Run: `npm run build`

Expected: Next.js 16.2.4 production build completes successfully with no route, type, or prerender errors.

- [ ] **Step 6: Review the final diff and migration safety**

Run:

```powershell
git diff --check
git status --short
git diff --stat HEAD~1
```

Expected: no whitespace errors; only maintenance, tests, migration, messages, and approved documentation files are part of the implementation commits. Existing unrelated skill/worktree changes remain untouched.

- [ ] **Step 7: Commit documentation and verification evidence**

```bash
git add docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md
git commit -m "docs(maintenance): document hardened workflows"
```

## Plan Self-Review

- Every approved design requirement maps to at least one task.
- PM lifecycle isolation is enforced in schema, policy, service, UI, and tests.
- Corrective lifecycle integrity is enforced before mutation and during concurrent transitions.
- Evidence append-only behavior is enforced in both UI and API.
- Queue-first layout, pagination, bounded search, accessibility, localization, contrast, and performance each have focused tests.
- Function and field names are consistent across task interfaces.
- No task requires changes outside the approved maintenance scope except shared dialog/error helpers and documentation consumers.
