# Maintenance Status Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate deliberate repair-status transitions from assignee/due-date planning updates so operators cannot advance a ticket accidentally.

**Architecture:** Keep the complete lifecycle graph in `maintenance-policy.ts`, and expose a second helper that returns only interactive non-closure targets. Add a dedicated optimistic `planning` mutation that updates only `assignedToId` and `dueDate`; client dialogs remain small, accessible, and explicit about their effects.

**Tech Stack:** Next.js 16.2.4 App Router, React Client Components, next-intl, Zod 4, Prisma 7.8 with SQL Server adapter, Node test runner, Tailwind CSS.

## Global Constraints

- Corrective tickets retain `Pending Repair -> Under Maintenance -> Ready/Pending Disposal` lifecycle behavior.
- PM-generated work orders never mutate asset lifecycle status.
- `closed` is never an interactive status target; closure must use the existing evidence/checklist action.
- Status choice has no default selection.
- Waiting for parts/vendor requires a meaningful remark.
- Planning updates preserve `repairStatus`, asset status, PM plan state, close evidence, RBAC, and scheduler behavior.
- Preserve optimistic concurrency through `expectedUpdatedAt`.
- Preserve Thai/English key parity, WCAG 2.1 AA focus behavior, 44px mobile touch targets, and existing design tokens.
- No database schema migration and no new runtime dependency.

---

### Task 1: Centralize interactive transitions and validation

**Files:**
- Modify: `src/lib/maintenance-policy.ts`
- Modify: `src/lib/validations/maintenance.ts`
- Modify: `src/lib/maintenance-api-errors.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/maintenance-policy.test.ts`
- Modify: `tests/maintenance-validation.test.ts`
- Modify: `tests/maintenance-api-errors.test.ts`

**Interfaces:**
- Produces: `getMaintenanceStatusUpdateTargets(status: string): readonly MaintenanceStatus[]`
- Produces: `maintenanceTicketPlanningSchema` and `MaintenanceTicketPlanningInput`
- Produces: stable code `MAINTENANCE_WAITING_REMARK_REQUIRED`
- Preserves: `getAllowedMaintenanceTransitions()` as the backend lifecycle source, including closure transitions.

- [ ] **Step 1: Write failing policy and validation tests**

Add policy assertions:

```ts
import { getMaintenanceStatusUpdateTargets } from "../src/lib/maintenance-policy.ts"

test("interactive status updates never expose closure transitions", () => {
  assert.deepEqual(getMaintenanceStatusUpdateTargets("reported"), ["accepted"])
  assert.deepEqual(getMaintenanceStatusUpdateTargets("in_progress"), ["waiting_parts", "waiting_vendor", "completed"])
  assert.deepEqual(getMaintenanceStatusUpdateTargets("completed"), [])
  assert.deepEqual(getMaintenanceStatusUpdateTargets("open"), [])
})
```

Extend validation tests with real schemas:

```ts
import {
  maintenanceTicketPlanningSchema,
  maintenanceTicketStatusSchema,
} from "../src/lib/validations/maintenance.ts"

test("waiting status requires a meaningful remark", () => {
  const input = { expectedUpdatedAt: "2026-07-14T03:00:00.000Z", repairStatus: "waiting_parts", remark: "" }
  assert.equal(maintenanceTicketStatusSchema.safeParse(input).success, false)
  assert.equal(maintenanceTicketStatusSchema.safeParse({ ...input, remark: "Waiting for battery shipment" }).success, true)
})

test("planning input accepts cleared assignee and due date", () => {
  const parsed = maintenanceTicketPlanningSchema.parse({
    action: "planning",
    expectedUpdatedAt: "2026-07-14T03:00:00.000Z",
    assignedToId: "",
    dueDate: "",
  })
  assert.equal(parsed.assignedToId, undefined)
  assert.equal(parsed.dueDate, undefined)
})
```

Extend API error tests to require `MAINTENANCE_WAITING_REMARK_REQUIRED` in the exported code list.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test --experimental-strip-types tests/maintenance-policy.test.ts tests/maintenance-validation.test.ts tests/maintenance-api-errors.test.ts
```

Expected: FAIL because the interactive helper, planning schema, and stable error code do not exist and waiting remarks are optional.

- [ ] **Step 3: Implement the policy helper and schemas**

Add the policy helper without changing the complete transition graph:

```ts
export function getMaintenanceStatusUpdateTargets(status: string): readonly MaintenanceStatus[] {
  return getAllowedMaintenanceTransitions(status).filter((target) => target !== "closed")
}
```

Refine the status schema and add planning validation:

```ts
const waitingStatuses = new Set(["waiting_parts", "waiting_vendor"])

export const maintenanceTicketStatusSchema = z.object({
  action: z.literal("status").optional(),
  expectedUpdatedAt: z.coerce.date(),
  repairStatus: z.enum(["reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"]),
  remark: optionalText,
}).superRefine((input, context) => {
  if (waitingStatuses.has(input.repairStatus) && !input.remark) {
    context.addIssue({ code: "custom", path: ["remark"], message: "Remark is required for a waiting status" })
  }
})

export const maintenanceTicketPlanningSchema = z.object({
  action: z.literal("planning"),
  expectedUpdatedAt: z.coerce.date(),
  assignedToId: optionalText,
  dueDate: optionalDate,
})

export type MaintenanceTicketPlanningInput = z.infer<typeof maintenanceTicketPlanningSchema>
```

Add `MAINTENANCE_WAITING_REMARK_REQUIRED` to `maintenanceErrorCodes`, with matching copy:

```json
"MAINTENANCE_WAITING_REMARK_REQUIRED": "กรุณาระบุเหตุผลหรือรายละเอียดเมื่อตั้งสถานะเป็นรออะไหล่หรือรอผู้ขาย"
```

```json
"MAINTENANCE_WAITING_REMARK_REQUIRED": "Add a reason or update before moving this ticket to a waiting status."
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all focused tests pass.

- [ ] **Step 5: Commit the policy boundary**

```powershell
git add src/lib/maintenance-policy.ts src/lib/validations/maintenance.ts src/lib/maintenance-api-errors.ts messages/th.json messages/en.json tests/maintenance-policy.test.ts tests/maintenance-validation.test.ts tests/maintenance-api-errors.test.ts
git commit -m "feat(maintenance): separate interactive status policy"
```

---

### Task 2: Add transactional planning mutation

**Files:**
- Modify: `src/lib/maintenance-ticket-service.ts`
- Modify: `src/app/api/maintenance-tickets/[id]/route.ts`
- Modify: `tests/maintenance-ticket-service.test.ts`
- Modify: `tests/maintenance-ticket-routes.test.ts`

**Interfaces:**
- Consumes: `MaintenanceTicketPlanningInput`, `maintenanceTicketPlanningSchema`.
- Produces: `updateMaintenanceTicketPlanning(db, id, input, user)` returning `{ ticket, previous }`.
- Audit action: `update_planning` with old/new `assignedToId` and `dueDate`.

- [ ] **Step 1: Write failing service tests**

Import `updateMaintenanceTicketPlanning` and add:

```ts
test("planning update changes only assignee and due date", async () => {
  const db = fakeDb({ ticketStatus: "in_progress" })

  await updateMaintenanceTicketPlanning(
    db,
    "ticket-1",
    {
      action: "planning",
      expectedUpdatedAt,
      assignedToId: "employee-1",
      dueDate: new Date("2026-07-20T00:00:00.000Z"),
    },
    { id: "user-1" },
  )

  assert.deepEqual(db.events, ["planning:employee-1:2026-07-20"])
  assert.equal(db.events.some((event) => event.startsWith("asset:")), false)
  assert.equal(db.events.some((event) => event.startsWith("movement:")), false)
})

test("planning update rejects closed and stale tickets", async () => {
  await assert.rejects(
    () => updateMaintenanceTicketPlanning(fakeDb({ ticketStatus: "closed" }), "ticket-1", planningInput, { id: "user-1" }),
    hasMaintenanceCode("MAINTENANCE_INVALID_TRANSITION"),
  )
  await assert.rejects(
    () => updateMaintenanceTicketPlanning(fakeDb({ conditionalUpdateCount: 0 }), "ticket-1", planningInput, { id: "user-1" }),
    hasMaintenanceCode("MAINTENANCE_CONFLICT"),
  )
})
```

Adjust the fake `updateMany` implementation to record planning data when `data.repairStatus` is absent, without fabricating an asset movement.

Add a route source test requiring `maintenanceTicketPlanningSchema`, `updateMaintenanceTicketPlanning`, and `action === "planning"`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test --experimental-strip-types tests/maintenance-ticket-service.test.ts tests/maintenance-ticket-routes.test.ts
```

Expected: FAIL because planning service and routing do not exist.

- [ ] **Step 3: Implement the planning transaction**

Add the type import and service:

```ts
export async function updateMaintenanceTicketPlanning(
  db: MaintenanceServiceDb,
  id: string,
  input: MaintenanceTicketPlanningInput,
  user: MaintenanceServiceUser,
) {
  return db.$transaction(async (tx) => {
    const ticket = await getActiveTicket(tx, id)
    if (ticket.repairStatus === "closed") {
      throw new MaintenanceApiError("MAINTENANCE_INVALID_TRANSITION", "Closed tickets cannot be replanned")
    }
    if (input.assignedToId) await requireActiveEmployee(tx, input.assignedToId, "Assignee")

    const updateResult = await tx.maintenanceTicket.updateMany({
      where: { id, isActive: true, updatedAt: input.expectedUpdatedAt, repairStatus: ticket.repairStatus },
      data: { assignedToId: input.assignedToId ?? null, dueDate: input.dueDate ?? null, updatedBy: user.id },
    })
    if (updateResult.count === 0) throw conflictError()

    const updatedTicket = await tx.maintenanceTicket.findUnique({ where: { id }, include: maintenanceTicketInclude })
    if (!updatedTicket) throw conflictError()
    return { ticket: updatedTicket, previous: ticket }
  })
}
```

Defend waiting remarks in `transitionMaintenanceTicket` before mutation:

```ts
if (["waiting_parts", "waiting_vendor"].includes(input.repairStatus) && !input.remark?.trim()) {
  throw new MaintenanceApiError("MAINTENANCE_WAITING_REMARK_REQUIRED", "Waiting status requires a remark")
}
```

Remove `assignedToId` and `dueDate` from the status transition update data. Add route handling before close parsing:

```ts
if (action === "planning") {
  const input = maintenanceTicketPlanningSchema.parse(body)
  const result = await updateMaintenanceTicketPlanning(prisma, id, input, user)
  await logAudit({
    userId: user.id,
    action: "update_planning",
    module: "maintenance",
    recordId: id,
    oldValue: { assignedToId: result.previous.assignedToId, dueDate: result.previous.dueDate },
    newValue: { assignedToId: input.assignedToId ?? null, dueDate: input.dueDate ?? null },
  })
  return NextResponse.json(result.ticket)
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all focused tests pass, including no asset or movement write for planning.

- [ ] **Step 5: Commit the planning mutation**

```powershell
git add src/lib/maintenance-ticket-service.ts 'src/app/api/maintenance-tickets/[id]/route.ts' tests/maintenance-ticket-service.test.ts tests/maintenance-ticket-routes.test.ts
git commit -m "feat(maintenance): add independent ticket planning"
```

---

### Task 3: Build deliberate status and planning dialogs

**Files:**
- Create: `src/components/maintenance/maintenance-ticket-planning-button.tsx`
- Modify: `src/components/maintenance/maintenance-ticket-status-button.tsx`
- Modify: `src/components/maintenance/maintenance-ticket-actions.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/maintenance-action-controller.test.ts`
- Modify: `tests/maintenance-queue-ux.test.ts`
- Modify: `tests/maintenance-i18n.test.ts`

**Interfaces:**
- Consumes: `getMaintenanceStatusUpdateTargets`, `MaintenanceOptionSelect`, `AccessibleDialog`.
- Produces: `MaintenanceTicketPlanningButton` with ticket ID, current status, assignee, due date, and optimistic timestamp.
- Extends: shared controller action union to `"status" | "planning" | "close"`.

- [ ] **Step 1: Write failing UI source tests**

Extend controller tests:

```ts
test("maintenance actions separate planning from status transitions", () => {
  const controller = readFileSync("src/components/maintenance/maintenance-ticket-actions.tsx", "utf8")
  const statusDialog = readFileSync("src/components/maintenance/maintenance-ticket-status-button.tsx", "utf8")
  const planningDialog = readFileSync("src/components/maintenance/maintenance-ticket-planning-button.tsx", "utf8")

  assert.match(controller, /action: "status" \| "planning" \| "close"/)
  assert.match(controller, /MaintenanceTicketPlanningButton/)
  assert.match(statusDialog, /getMaintenanceStatusUpdateTargets/)
  assert.match(statusDialog, /type="radio"/)
  assert.match(statusDialog, /repairStatus:\s*""/)
  assert.doesNotMatch(statusDialog, /assignedToId|dueDate/)
  assert.match(planningDialog, /action:\s*"planning"/)
  assert.doesNotMatch(planningDialog, /repairStatus:/)
})
```

Extend queue UX tests to require `data-maintenance-action="planning"` in desktop and mobile action areas. Extend i18n tests by relying on the existing Thai/English Maintenance key parity assertion.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test --experimental-strip-types tests/maintenance-action-controller.test.ts tests/maintenance-queue-ux.test.ts tests/maintenance-i18n.test.ts
```

Expected: FAIL because the planning component/action and deliberate status controls do not exist.

- [ ] **Step 3: Refactor the status dialog**

Initialize no target and derive options from policy:

```ts
const [repairStatus, setRepairStatus] = useState("")
const targets = getMaintenanceStatusUpdateTargets(currentStatus)
const waitingForExternalInput = repairStatus === "waiting_parts" || repairStatus === "waiting_vendor"
```

Pass `isPreventive` from both list controller and detail page. Render current status and native radio rows:

```tsx
<div className="rounded-md border border-border bg-muted/40 p-3">
  <span className="text-xs font-medium text-muted-foreground">{t("currentRepairStatus")}</span>
  <p className="mt-1 text-sm font-semibold text-foreground">{t(`statuses.${currentStatus}`)}</p>
</div>
<fieldset className="space-y-2">
  <legend className="text-sm font-medium text-foreground">{t("changeStatusTo")}</legend>
  {targets.map((status) => (
    <label key={status} className="flex min-h-11 cursor-pointer gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <input type="radio" name="repairStatus" value={status} checked={repairStatus === status} onChange={() => setRepairStatus(status)} />
      <span><span className="block text-sm font-medium">{t(`statuses.${status}`)}</span><span className="mt-1 block text-xs text-muted-foreground">{getConsequence(status, isPreventive, t)}</span></span>
    </label>
  ))}
</fieldset>
```

Make remark required only for waiting targets, send only `{ action: "status", expectedUpdatedAt, repairStatus, remark }`, and disable submit while saving or no target is selected.

- [ ] **Step 4: Create the planning dialog**

Implement a Client Component using existing controls:

```tsx
const [assignedToId, setAssignedToId] = useState(initialAssignedToId ?? "")
const [dueDate, setDueDate] = useState(initialDueDate ? toLocalDateInputValue(new Date(initialDueDate)) : "")
const changed = assignedToId !== (initialAssignedToId ?? "") || dueDate !== initialDueDateValue

await fetch(`/api/maintenance-tickets/${ticketId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "planning", expectedUpdatedAt, assignedToId: assignedToId || null, dueDate: dueDate || null }),
})
```

The dialog renders the read-only current status, bounded employee search, due-date input, Cancel, and Save. Disable Save while unchanged or saving, localize stable API errors, close on success, and call `router.refresh()`.

- [ ] **Step 5: Integrate all action surfaces and copy**

Add `planning` to the shared click controller and render `MaintenanceTicketPlanningButton`. Add planning triggers for every editable non-closed ticket in both desktop/mobile list layouts and the ticket detail header. Keep close visible for `open`/`completed`; keep status visible only when `getMaintenanceStatusUpdateTargets(status).length > 0`.

Add matching Thai/English keys:

```json
"currentRepairStatus": "สถานะปัจจุบัน",
"changeStatusTo": "เปลี่ยนสถานะเป็น",
"editPlanning": "แก้ไขผู้รับผิดชอบและกำหนดเสร็จ",
"editPlanningTitle": "แก้ไขการมอบหมายงาน",
"planningUpdateSuccess": "อัปเดตผู้รับผิดชอบและกำหนดเสร็จแล้ว",
"statusConsequences": {
  "accepted": "รับเรื่องและเตรียมดำเนินการ",
  "in_progress_corrective": "เริ่มซ่อมและเปลี่ยนทรัพย์สินเป็นอยู่ระหว่างซ่อม",
  "in_progress_pm": "เริ่มงานตรวจสอบโดยไม่เปลี่ยนสถานะทรัพย์สิน",
  "waiting_parts": "หยุดรออะไหล่และต้องระบุเหตุผล",
  "waiting_vendor": "หยุดรอผู้ขายและต้องระบุเหตุผล",
  "completed": "งานซ่อมเสร็จแล้ว แต่ยังต้องตรวจรับและปิดใบงาน"
}
```

Add equivalent English copy and retain the automated key-parity test.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all focused tests pass.

- [ ] **Step 7: Run the Impeccable detector**

Run:

```powershell
node .agents/skills/impeccable/scripts/detect.mjs --json 'src/components/maintenance/maintenance-ticket-status-button.tsx' 'src/components/maintenance/maintenance-ticket-planning-button.tsx' 'src/components/maintenance/maintenance-ticket-actions.tsx'
```

Expected: no unresolved high-confidence findings. Correct any finding in the changed UI files and rerun the focused tests.

- [ ] **Step 8: Commit the UI workflow**

```powershell
git add src/components/maintenance/maintenance-ticket-planning-button.tsx src/components/maintenance/maintenance-ticket-status-button.tsx src/components/maintenance/maintenance-ticket-actions.tsx 'src/app/[locale]/(dashboard)/maintenance/page.tsx' 'src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx' messages/th.json messages/en.json tests/maintenance-action-controller.test.ts tests/maintenance-queue-ux.test.ts tests/maintenance-i18n.test.ts
git commit -m "feat(maintenance): make status changes deliberate"
```

---

### Task 4: Documentation and release verification

**Files:**
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `DEVELOPER_HANDOFF.md`

**Interfaces:**
- Documents: distinct status/planning actions, waiting remark rule, and close-only closure boundary.
- Verifies: repository tests, Prisma schema, production build, live dev response, and runtime error log.

- [ ] **Step 1: Update workflow and UAT documentation**

Document that assignment/due-date edits preserve workflow status, status targets have no automatic default, waiting states require remarks, and closure remains checklist-only. Add UAT cases for keyboard radio selection, unchanged planning submit, cleared planning fields, stale-update conflict, PM no-lifecycle behavior, and 390px layout.

- [ ] **Step 2: Run complete verification**

Run:

```powershell
npm test
npx prisma validate
npm run build
node .agents/skills/impeccable/scripts/detect.mjs --json 'src/components/maintenance' 'src/app/[locale]/(dashboard)/maintenance'
git diff --check
```

Expected: all tests pass, Prisma schema is valid, Next.js 16.2.4 compiles with TypeScript and generates all static pages, the detector has no unresolved finding, and diff check is clean.

- [ ] **Step 3: Verify the live dev server**

Confirm port 3000 is listening. Restart `npm run dev` if it is not, then load `/th/maintenance?view=tickets` in the authenticated session. Verify both dialogs open, status has no default radio, planning Save starts disabled, and the dev stderr log receives no new `MISSING_MESSAGE`, hydration, or runtime exception.

- [ ] **Step 4: Commit documentation**

```powershell
git add docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md DEVELOPER_HANDOFF.md
git commit -m "docs(maintenance): hand off deliberate status workflow"
```

- [ ] **Step 5: Push verified commits**

```powershell
git fetch origin
git rev-list --left-right --count master...origin/master
git push origin master
```

Expected: push succeeds without force and local `master` matches `origin/master`.

