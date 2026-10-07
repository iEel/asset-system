# บันทึกการซ่อมแบบฟอร์มเดียว — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนโมดูลซ่อมบำรุงจาก workflow 8 สถานะเป็น "บันทึกการซ่อม" ฟอร์มเดียว (ยังไม่เสร็จ / เสร็จแล้ว / ยกเลิก) และเปลี่ยนแผน PM เป็นตัวเตือนที่บันทึกด้วยฟอร์มเดียวกัน

**Architecture:** ใช้ตาราง `maintenance_tickets` / `maintenance_plans` เดิม + คอลัมน์ใหม่ `outcome` · กฎสถานะเป็นฟังก์ชัน pure ใน `src/lib/repair-record-policy.ts` · การเขียนอยู่ใน `src/lib/repair-record-service.ts` (รับ `db` เป็น parameter เพื่อทดสอบด้วย fake) · route บางลงเหลือ parse → service → audit log · UI ใหม่ 3 หน้า (`/maintenance`, `/maintenance/new`, `/maintenance/[id]`) และลบ workflow เดิมทั้งหมด

**Tech Stack:** Next.js 16.2.4 App Router · React 19 · TypeScript · Prisma 7.8 (SQL Server) · zod 4 · next-intl · Tailwind 4 · `node --test` (type stripping)

**Spec:** `docs/superpowers/specs/2026-10-07-simple-repair-records-design.md`

## Global Constraints

- อ่าน `AGENTS.md` ก่อน: Next.js รุ่นนี้มี breaking changes — ดู `node_modules/next/dist/docs/` ก่อนแก้ route/page
- `.env` ต้องชี้ `asset_management_dev` และ `DB_USER=asset_dev` — ตรวจด้วย `npm run migration:status` (บรรทัดแรกต้องเป็น `Database: asset_management_dev`) ก่อนรันอะไรที่แตะ DB · ห้ามแตะ `asset_management` (Production)
- test ของ lib ใช้ relative import ที่ลงท้าย `.ts` (`../src/lib/x.ts`) · lib ที่ test import ตรงต้องไม่มี runtime import แบบ `@/` (type import ได้)
- route test ใช้ pattern `registerHooks` mock module + map `@/` → `src/` (ดู `tests/asset-custody-route-claims.test.ts` เป็นแบบ)
- zod 4: ฟิลด์ที่ไม่บังคับและใช้ `z.preprocess` ต้องห่อ `.optional()` ด้านนอก ไม่งั้น key ที่ไม่ส่งมาจะ error `nonoptional`
- วันที่เริ่มต้นในฟอร์มใช้ `toLocalDateInputValue()` จาก `src/lib/local-date.ts` (ไม่ใช้ `toISOString().slice(0,10)`)
- "สถานะตามผู้ถือครอง" = `"In Use"` เมื่อมี checkout ที่ยัง active มิฉะนั้น `getMaintenanceOperationalTarget({ ownershipType, custodianId })`
- ข้อความ UI ภาษาไทยเป็นหลัก (th) และมี en ครบทุก key · namespace ใหม่ `repairRecord` · error code แปลที่ `maintenancePage.errors.<CODE>`
- ไม่ลบคอลัมน์/ตารางใน DB · ไม่ลบแถวเก่าใน `system_settings`
- commit ทีละ task · ท้าย commit message: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- ตรวจก่อนจบทุก task: test ของ task ผ่าน + `npx tsc --noEmit -p tsconfig.json` ผ่าน · Task 15 รัน `npm test` ทั้งชุด
- ระหว่าง Task 5–9 หน้าจอเก่าบางปุ่มจะเรียก API ที่เปลี่ยนไปแล้ว (เป็นสภาพชั่วคราวใน branch) — ห้ามแก้ปุ่มเก่าให้ทำงาน ให้ทำตามลำดับ task

## Review Focus

1. **ทรัพย์สินที่ถูกยืมแบบ permanent (In Use + checkout active) แล้วส่งซ่อม** → ซ่อมเสร็จต้องกลับเป็น `In Use` ไม่ใช่ `Ready` (ไม่งั้นคืนของไม่ได้) — test ใน Task 2 และ Task 4
2. **กดบันทึกซ้ำ / สองคนบันทึกชิ้นเดียวกันพร้อมกัน** → ได้บันทึกที่ยังไม่เสร็จได้แค่ใบเดียว · ใบที่สองได้ `MAINTENANCE_OPEN_RECORD_EXISTS` หรือ `MAINTENANCE_CONFLICT` — test ใน Task 4
3. **บันทึก PM ที่ผูกแผน** → `nextDueDate` เลื่อนจากวันที่ในบันทึก ไม่ใช่จาก `nextDueDate` เดิม และวันสิ้นเดือนไม่เลยไปเดือนถัดไป — test ใน Task 3 และ Task 4
4. **ใบซ่อมเดิมสถานะเก่า (`open`, `reported`, `waiting_parts`, `completed` ...)** → แสดงเป็น "ยังซ่อมไม่เสร็จ" และกด "ซ่อมเสร็จ"/"ยกเลิก" ได้ — test ใน Task 2 และ Task 4
5. **ผู้ใช้ที่มีสิทธิ์ `maintenance:create` แต่ไม่มี `maintenance:edit`** → บันทึกพร้อมแนบไฟล์ในบันทึกที่ตัวเองสร้างได้ (upload ไม่โดน 403) แต่แนบในบันทึกของคนอื่นไม่ได้ — test ใน Task 5

---

## File Map

| ไฟล์ | หน้าที่ | Task |
|---|---|---|
| `prisma/manual-migrations/2026-10-07-add-maintenance-outcome.sql` (ใหม่) | เพิ่ม `outcome` | 1 |
| `prisma/schema.prisma` | `outcome String? @db.NVarChar(20)` | 1 |
| `src/lib/repair-record-policy.ts` (ใหม่) | สถานะ · open filter · ผลต่อสถานะทรัพย์สิน · สิทธิ์แนบไฟล์ | 2 |
| `src/lib/preventive-maintenance.ts` | วันครบกำหนด (clamp สิ้นเดือน) · ช่วงเตือน PM | 3 |
| `src/lib/repair-record-service.ts` (ใหม่) + `src/lib/validations/maintenance.ts` + `src/lib/maintenance-api-errors.ts` | create / complete / cancel / update details | 4 |
| `src/app/api/maintenance-tickets/**`, `src/app/api/attachments/[id]/route.ts`, `src/lib/maintenance-options.ts` | route ใช้ service ใหม่ · ลบ service เก่า | 5 |
| `src/components/maintenance/repair-record-form.tsx` (ใหม่) + `maintenance/new/page.tsx` | ฟอร์มบันทึกซ่อม | 6 |
| `src/components/maintenance/repair-record-actions.tsx` (ใหม่) + `maintenance/[id]/page.tsx` + print page | หน้ารายละเอียด · ซ่อมเสร็จ / ยกเลิก / แก้ไข | 7 |
| `maintenance/pm/page.tsx` (ใหม่) + plan form/schema/service/routes + `disposal-execution-service.ts` | หน้าแผน PM · เลิกผู้รับผิดชอบ · จบแผนเมื่อจำหน่าย | 8 |
| `maintenance/page.tsx` + `maintenance-query.ts` + `maintenance-status.ts` + export route | รายการ · PM ถึงกำหนด · ทรัพย์สินค้าง | 9 |
| PM generation routes/lib/scripts · settings · readiness · RBAC matrix · deployment doc | เลิกสร้างใบ PM อัตโนมัติ | 10 |
| check-in route/form + `asset-status-flow.ts` | คืนของแบบ "ส่งซ่อม" | 11 |
| dashboard · work center · notifications · approvals · workflow settings · sidebar | งานค้าง / แจ้งเตือน / เลิกอนุมัติปิดงานซ่อม | 12 |
| state review · legacy checkout · operation options · assets list · asset detail/form · employee/supplier · search · movement labels | ใช้ open filter กลาง · ปุ่ม "บันทึกซ่อม" | 13 |
| โค้ด/test ที่ไม่ใช้แล้ว | ลบ · รัน test ทั้งชุด | 14 |
| docs + wiki + ตรวจบน dev | เอกสาร · ตรวจหน้าจริง | 15 |

---

### Task 1: คอลัมน์ `outcome`

**Files:**
- Create: `prisma/manual-migrations/2026-10-07-add-maintenance-outcome.sql`
- Modify: `prisma/schema.prisma` (model `MaintenanceTicket`)

**Interfaces:**
- Produces: `MaintenanceTicket.outcome: string | null` ใน Prisma client

- [ ] **Step 1: เขียน migration**

```sql
-- Repair record outcome: usable | beyond_repair. NULL = recorded before 2026-10 (unknown).
-- Run only after a verified SQL Server backup and explicit approval.

IF COL_LENGTH('dbo.maintenance_tickets', 'outcome') IS NULL
BEGIN
  ALTER TABLE [dbo].[maintenance_tickets] ADD [outcome] NVARCHAR(20) NULL;
END;
```

- [ ] **Step 2: เพิ่มฟิลด์ใน schema** — ใน `model MaintenanceTicket` ต่อจากบรรทัด `repairStatus ...`

```prisma
  outcome           String?          @db.NVarChar(20)
```

- [ ] **Step 3: generate client และตรวจ type**

Run: `npx prisma generate && npx tsc --noEmit -p tsconfig.json`
Expected: generate สำเร็จ · tsc exit 0

- [ ] **Step 4: apply บน DB dev**

Run: `npm run migration:status` → ต้องเห็น `Database: asset_management_dev` และไฟล์ใหม่เป็น `pending`
Run: `npm run migration:apply -- 2026-10-07-add-maintenance-outcome.sql --backup-confirmed --reason "Repair records: outcome column (dev database)"`
Expected: `Applied migration: 2026-10-07-add-maintenance-outcome.sql`

- [ ] **Step 5: Commit**

```bash
git add prisma/manual-migrations/2026-10-07-add-maintenance-outcome.sql prisma/schema.prisma
git commit -m "feat(maintenance): add repair outcome column" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: กฎสถานะของบันทึกซ่อม (pure)

**Files:**
- Create: `src/lib/repair-record-policy.ts`
- Test: `tests/repair-record-policy.test.ts`

**Interfaces:**
- Consumes: `getMaintenanceOperationalTarget`, `normalizeAssetStateName` จาก `src/lib/asset-lifecycle-policy.ts`
- Produces:
  - `repairRecordStatuses = ["in_progress","closed","cancelled"]`, `type RepairRecordStatus`
  - `repairOutcomes = ["usable","beyond_repair"]`, `type RepairOutcome`
  - `isOpenRepairStatus(status: string): boolean`
  - `toRepairRecordStatus(status: string): RepairRecordStatus`
  - `openRepairRecordWhere: { isActive: true; repairStatus: { notIn: string[] } }` (ค่า `["closed","cancelled"]` · spread เข้า Prisma where ได้)
  - `type RepairAssetContext = { statusName: string; ownershipType?: string | null; custodianId?: string | null; hasActiveCheckout: boolean; hasOpenRecord: boolean }`
  - `type RepairRecordErrorCode = "MAINTENANCE_ASSET_WRITTEN_OFF" | "MAINTENANCE_ASSET_ON_LOAN" | "MAINTENANCE_OPEN_RECORD_EXISTS" | "MAINTENANCE_ASSET_INELIGIBLE"`
  - `type RepairAssetEffect = { error: RepairRecordErrorCode; nextStatusName?: undefined } | { error: null; nextStatusName: string | null }` (`null` = ไม่เปลี่ยนสถานะ)
  - `getRepairRestoreStatusName(asset): "In Use" | "Ready"`
  - `getRepairRecordCreateEffect(asset, input: { done: boolean; outcome: RepairOutcome }): RepairAssetEffect`
  - `getRepairRecordCompleteEffect(asset, outcome: RepairOutcome): RepairAssetEffect`
  - `getRepairRecordCancelEffect(asset): { error: null; nextStatusName: string | null }`
  - `getRepairRecordStatusTone(status: string): "warning" | "success" | "muted"`
  - `canAttachToRepairRecord(user: { userId: string; canEdit: boolean; canCreate: boolean }, record: { createdBy: string }): boolean`

- [ ] **Step 1: Write the failing test**

```typescript
import assert from "node:assert/strict"
import test from "node:test"

import {
  canAttachToRepairRecord,
  getRepairRecordCancelEffect,
  getRepairRecordCompleteEffect,
  getRepairRecordCreateEffect,
  getRepairRecordStatusTone,
  isOpenRepairStatus,
  toRepairRecordStatus,
  type RepairAssetContext,
} from "../src/lib/repair-record-policy.ts"

function asset(overrides: Partial<RepairAssetContext>): RepairAssetContext {
  return { statusName: "Ready", ownershipType: "shared", custodianId: null, hasActiveCheckout: false, hasOpenRecord: false, ...overrides }
}

const done = { done: true, outcome: "usable" as const }
const beyondRepair = { done: true, outcome: "beyond_repair" as const }
const notDone = { done: false, outcome: "usable" as const }

test("legacy workflow statuses are treated as not finished", () => {
  for (const status of ["open", "reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"]) {
    assert.equal(isOpenRepairStatus(status), true, status)
    assert.equal(toRepairRecordStatus(status), "in_progress", status)
  }
  assert.equal(isOpenRepairStatus("closed"), false)
  assert.equal(isOpenRepairStatus("cancelled"), false)
  assert.equal(toRepairRecordStatus("closed"), "closed")
  assert.equal(toRepairRecordStatus("cancelled"), "cancelled")
})

test("a finished usable repair leaves an operational asset untouched", () => {
  assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName: "Ready" }), done), { error: null, nextStatusName: null })
  assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName: "Checked Out", hasActiveCheckout: true }), done), { error: null, nextStatusName: null })
})

test("a finished usable repair releases an asset stuck in a repair status", () => {
  assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName: "Pending Repair" }), done), { error: null, nextStatusName: "Ready" })
  assert.deepEqual(
    getRepairRecordCreateEffect(asset({ statusName: "Under Maintenance", ownershipType: "personal", custodianId: "emp-1" }), done),
    { error: null, nextStatusName: "In Use" },
  )
})

test("an unfinished repair moves an operational asset to Under Maintenance", () => {
  for (const statusName of ["Ready", "In Use", "Pending Repair"]) {
    assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName }), notDone), { error: null, nextStatusName: "Under Maintenance" }, statusName)
  }
})

test("a loaned asset must be returned before it is sent for repair", () => {
  assert.equal(getRepairRecordCreateEffect(asset({ statusName: "Checked Out", hasActiveCheckout: true }), notDone).error, "MAINTENANCE_ASSET_ON_LOAN")
})

test("other statuses cannot start an unfinished repair", () => {
  for (const statusName of ["Reserved", "In Transit", "Under Inspection", "Draft", "Pending Disposal", "Lost", "Missing"]) {
    assert.equal(getRepairRecordCreateEffect(asset({ statusName }), notDone).error, "MAINTENANCE_ASSET_INELIGIBLE", statusName)
  }
})

test("written-off assets cannot get repair records", () => {
  for (const statusName of ["Disposed", "Retired"]) {
    assert.equal(getRepairRecordCreateEffect(asset({ statusName }), done).error, "MAINTENANCE_ASSET_WRITTEN_OFF", statusName)
  }
})

test("only one unfinished record per asset", () => {
  assert.equal(getRepairRecordCreateEffect(asset({ hasOpenRecord: true }), done).error, "MAINTENANCE_OPEN_RECORD_EXISTS")
  assert.equal(getRepairRecordCreateEffect(asset({ hasOpenRecord: true }), notDone).error, "MAINTENANCE_OPEN_RECORD_EXISTS")
})

test("beyond repair proposes disposal unless the asset is on loan", () => {
  assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName: "In Use" }), beyondRepair), { error: null, nextStatusName: "Pending Disposal" })
  assert.equal(getRepairRecordCreateEffect(asset({ statusName: "In Use", hasActiveCheckout: true }), beyondRepair).error, "MAINTENANCE_ASSET_ON_LOAN")
})

test("finishing a repair restores the custody-derived status", () => {
  assert.deepEqual(getRepairRecordCompleteEffect(asset({ statusName: "Under Maintenance" }), "usable"), { error: null, nextStatusName: "Ready" })
  assert.deepEqual(
    getRepairRecordCompleteEffect(asset({ statusName: "Under Maintenance", ownershipType: "personal", custodianId: "emp-1" }), "usable"),
    { error: null, nextStatusName: "In Use" },
  )
})

test("a permanently assigned asset returns to In Use after repair even when it is not personal property", () => {
  const assigned = asset({ statusName: "Under Maintenance", ownershipType: "shared", custodianId: "emp-1", hasActiveCheckout: true })
  assert.deepEqual(getRepairRecordCompleteEffect(assigned, "usable"), { error: null, nextStatusName: "In Use" })
  assert.equal(getRepairRecordCompleteEffect(assigned, "beyond_repair").error, "MAINTENANCE_ASSET_ON_LOAN")
})

test("cancelling an unfinished record releases only repair statuses", () => {
  assert.deepEqual(getRepairRecordCancelEffect(asset({ statusName: "Under Maintenance" })), { error: null, nextStatusName: "Ready" })
  assert.deepEqual(getRepairRecordCancelEffect(asset({ statusName: "In Use" })), { error: null, nextStatusName: null })
})

test("status tones follow the three record states", () => {
  assert.equal(getRepairRecordStatusTone("waiting_parts"), "warning")
  assert.equal(getRepairRecordStatusTone("closed"), "success")
  assert.equal(getRepairRecordStatusTone("cancelled"), "muted")
})

test("recorders can attach files to their own records; editors to any record", () => {
  const mine = { createdBy: "user-1" }
  const theirs = { createdBy: "user-2" }
  assert.equal(canAttachToRepairRecord({ userId: "user-1", canEdit: false, canCreate: true }, mine), true)
  assert.equal(canAttachToRepairRecord({ userId: "user-1", canEdit: false, canCreate: true }, theirs), false)
  assert.equal(canAttachToRepairRecord({ userId: "user-1", canEdit: true, canCreate: false }, theirs), true)
  assert.equal(canAttachToRepairRecord({ userId: "user-1", canEdit: false, canCreate: false }, mine), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/repair-record-policy.test.ts`
Expected: FAIL — `Cannot find module '.../src/lib/repair-record-policy.ts'`

- [ ] **Step 3: Write minimal implementation** — `src/lib/repair-record-policy.ts`

```typescript
import { getMaintenanceOperationalTarget, normalizeAssetStateName } from "./asset-lifecycle-policy.ts"

export const repairRecordStatuses = ["in_progress", "closed", "cancelled"] as const
export type RepairRecordStatus = (typeof repairRecordStatuses)[number]

export const repairOutcomes = ["usable", "beyond_repair"] as const
export type RepairOutcome = (typeof repairOutcomes)[number]

// Tickets written by the old workflow (open, reported, accepted, waiting_*, completed) count as
// unfinished repairs; only closed and cancelled are final. Typed with a mutable array (not
// `as const`) so it can be spread into Prisma where-clauses.
export const openRepairRecordWhere: { isActive: true; repairStatus: { notIn: string[] } } = {
  isActive: true,
  repairStatus: { notIn: ["closed", "cancelled"] },
}

export function isOpenRepairStatus(status: string) {
  return status !== "closed" && status !== "cancelled"
}

export function toRepairRecordStatus(status: string): RepairRecordStatus {
  return isOpenRepairStatus(status) ? "in_progress" : (status as RepairRecordStatus)
}

export type RepairAssetContext = {
  statusName: string
  ownershipType?: string | null
  custodianId?: string | null
  hasActiveCheckout: boolean
  hasOpenRecord: boolean
}

export type RepairRecordErrorCode =
  | "MAINTENANCE_ASSET_WRITTEN_OFF"
  | "MAINTENANCE_ASSET_ON_LOAN"
  | "MAINTENANCE_OPEN_RECORD_EXISTS"
  | "MAINTENANCE_ASSET_INELIGIBLE"

export type RepairAssetEffect =
  | { error: RepairRecordErrorCode; nextStatusName?: undefined }
  | { error: null; nextStatusName: string | null }

const writtenOffStatuses = new Set(["disposed", "retired"])
const repairStatuses = new Set(["pending repair", "under maintenance"])
const unfinishedRepairSources = new Set(["ready", "in use", "pending repair"])

// A permanent assignment keeps an active checkout while the asset is In Use, and check-in expects
// In Use again, so an open checkout always restores In Use.
export function getRepairRestoreStatusName(asset: RepairAssetContext): "In Use" | "Ready" {
  return asset.hasActiveCheckout ? "In Use" : getMaintenanceOperationalTarget(asset)
}

export function getRepairRecordCreateEffect(
  asset: RepairAssetContext,
  input: { done: boolean; outcome: RepairOutcome },
): RepairAssetEffect {
  const status = normalizeAssetStateName(asset.statusName)
  if (writtenOffStatuses.has(status)) return { error: "MAINTENANCE_ASSET_WRITTEN_OFF" }
  if (asset.hasOpenRecord) return { error: "MAINTENANCE_OPEN_RECORD_EXISTS" }

  if (!input.done) {
    if (status === "checked out") return { error: "MAINTENANCE_ASSET_ON_LOAN" }
    if (!unfinishedRepairSources.has(status)) return { error: "MAINTENANCE_ASSET_INELIGIBLE" }
    return { error: null, nextStatusName: "Under Maintenance" }
  }

  if (input.outcome === "beyond_repair") {
    if (asset.hasActiveCheckout) return { error: "MAINTENANCE_ASSET_ON_LOAN" }
    return { error: null, nextStatusName: "Pending Disposal" }
  }

  return { error: null, nextStatusName: repairStatuses.has(status) ? getRepairRestoreStatusName(asset) : null }
}

export function getRepairRecordCompleteEffect(asset: RepairAssetContext, outcome: RepairOutcome): RepairAssetEffect {
  if (outcome === "beyond_repair") {
    if (asset.hasActiveCheckout) return { error: "MAINTENANCE_ASSET_ON_LOAN" }
    return { error: null, nextStatusName: "Pending Disposal" }
  }
  return { error: null, nextStatusName: getRepairRestoreStatusName(asset) }
}

export function getRepairRecordCancelEffect(asset: RepairAssetContext): { error: null; nextStatusName: string | null } {
  const status = normalizeAssetStateName(asset.statusName)
  return { error: null, nextStatusName: repairStatuses.has(status) ? getRepairRestoreStatusName(asset) : null }
}

export function getRepairRecordStatusTone(status: string): "warning" | "success" | "muted" {
  const recordStatus = toRepairRecordStatus(status)
  if (recordStatus === "in_progress") return "warning"
  return recordStatus === "closed" ? "success" : "muted"
}

// Recording a repair (maintenance:create) includes attaching its photos and receipts, but only
// on records that user created; maintenance:edit may attach to any record.
export function canAttachToRepairRecord(
  user: { userId: string; canEdit: boolean; canCreate: boolean },
  record: { createdBy: string },
) {
  return user.canEdit || (user.canCreate && record.createdBy === user.userId)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/repair-record-policy.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repair-record-policy.ts tests/repair-record-policy.test.ts
git commit -m "feat(maintenance): repair record status rules" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: วันครบกำหนด PM และช่วงเตือน

**Files:**
- Modify: `src/lib/preventive-maintenance.ts` (`calculateNextMaintenanceDueDate` + ฟังก์ชันใหม่ · ลบ `buildPreventiveMaintenanceTicketPrefix`, `buildPreventiveMaintenanceDuplicateTicketWhere`, `buildPreventiveMaintenanceTicketProblem`, `buildPreventiveMaintenanceTicketDraft`, `isPreventiveMaintenancePlanDue`, `PreventiveMaintenanceTicketPlan`, `PreventiveMaintenanceGenerationPlanInput`, `PreventiveMaintenanceDuplicatePlanInput` ใน Task 10 พร้อมผู้ใช้)
- Test: `tests/pm-due-dates.test.ts`

**Interfaces:**
- Produces:
  - `calculateNextMaintenanceDueDate(fromDate, frequency, intervalDays?)` — เดือน/ไตรมาส/ปี clamp วันสิ้นเดือน
  - `pmReminderWindowDays = 7`
  - `getBangkokDateKey(date: Date): string` (`YYYY-MM-DD` ตามเวลาไทย)
  - `buildDuePmPlanWhere(now: Date): Prisma.MaintenancePlanWhereInput` (type import เท่านั้น)

- [ ] **Step 1: Write the failing test**

```typescript
import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDuePmPlanWhere,
  calculateNextMaintenanceDueDate,
  getBangkokDateKey,
} from "../src/lib/preventive-maintenance.ts"

const iso = (date: Date) => date.toISOString().slice(0, 10)

test("monthly plans stay in the following month at month end", () => {
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2026-01-31T00:00:00Z"), "monthly")), "2026-02-28")
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2028-01-31T00:00:00Z"), "monthly")), "2028-02-29")
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2026-03-15T00:00:00Z"), "monthly")), "2026-04-15")
})

test("quarterly and yearly plans clamp the same way", () => {
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2026-11-30T00:00:00Z"), "quarterly")), "2027-02-28")
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2028-02-29T00:00:00Z"), "yearly")), "2029-02-28")
})

test("custom plans add the interval in days", () => {
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2026-10-07T00:00:00Z"), "custom", 45)), "2026-11-21")
})

test("the Bangkok date rolls over at 17:00 UTC", () => {
  assert.equal(getBangkokDateKey(new Date("2026-10-06T16:59:00Z")), "2026-10-06")
  assert.equal(getBangkokDateKey(new Date("2026-10-06T17:00:00Z")), "2026-10-07")
})

test("due PM plans are active, not written off, and due within seven Bangkok days", () => {
  const where = buildDuePmPlanWhere(new Date("2026-10-06T17:30:00Z"))

  assert.deepEqual(where, {
    isActive: true,
    planState: "active",
    nextDueDate: { lte: new Date("2026-10-14T16:59:59.999Z") },
    asset: { isActive: true, status: { name: { notIn: ["Disposed", "Retired"] } } },
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/pm-due-dates.test.ts`
Expected: FAIL — `does not provide an export named 'buildDuePmPlanWhere'` (และ monthly 2026-01-31 ได้ 2026-03-03)

- [ ] **Step 3: Write minimal implementation** — ใน `src/lib/preventive-maintenance.ts`

เพิ่มบนสุด: `import type { Prisma } from "@prisma/client"`

แทนที่ `calculateNextMaintenanceDueDate` ทั้งฟังก์ชันด้วย:

```typescript
export function calculateNextMaintenanceDueDate(
  fromDate: Date | string,
  frequency: MaintenancePlanFrequency,
  intervalDays?: number | null
) {
  const from = new Date(fromDate)
  if (Number.isNaN(from.getTime())) return new Date(fromDate)

  if (frequency === "monthly") return addMonthsClamped(from, 1)
  if (frequency === "quarterly") return addMonthsClamped(from, 3)
  if (frequency === "yearly") return addMonthsClamped(from, 12)

  const next = new Date(from)
  next.setUTCDate(next.getUTCDate() + getMaintenancePlanIntervalDays(frequency, intervalDays))
  return next
}

// 31 Jan + 1 month must be 28/29 Feb, not 3 Mar; the plan then keeps its original day when possible.
function addMonthsClamped(from: Date, months: number) {
  const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, 1,
    from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds(), from.getUTCMilliseconds()))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(from.getUTCDate(), lastDay))
  return target
}

export const pmReminderWindowDays = 7

const bangkokOffsetMs = 7 * 60 * 60 * 1000

export function getBangkokDateKey(date: Date) {
  return new Date(date.getTime() + bangkokOffsetMs).toISOString().slice(0, 10)
}

export function buildDuePmPlanWhere(now: Date): Prisma.MaintenancePlanWhereInput {
  const windowEnd = new Date(`${getBangkokDateKey(now)}T23:59:59.999+07:00`)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + pmReminderWindowDays)
  return {
    isActive: true,
    planState: "active",
    nextDueDate: { lte: windowEnd },
    asset: { isActive: true, status: { name: { notIn: ["Disposed", "Retired"] } } },
  }
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/pm-due-dates.test.ts tests/preventive-maintenance.test.ts`
Expected: `pm-due-dates` PASS · ถ้า `preventive-maintenance.test.ts` มี assertion วันสิ้นเดือนแบบเดิม (เช่นคาด 3 มี.ค.) ให้แก้ค่าคาดหวังเป็นแบบ clamp เพราะเป็นพฤติกรรมที่ตั้งใจเปลี่ยน แล้วรันซ้ำจนผ่าน

- [ ] **Step 5: Commit**

```bash
git add src/lib/preventive-maintenance.ts tests/pm-due-dates.test.ts tests/preventive-maintenance.test.ts
git commit -m "feat(maintenance): clamp PM month ends and add due window" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: service บันทึกซ่อม + validation + error codes

**Files:**
- Create: `src/lib/repair-record-service.ts`
- Modify: `src/lib/validations/maintenance.ts` (เพิ่ม schema ใหม่ต่อท้าย · schema เก่าลบใน Task 14)
- Modify: `src/lib/maintenance-api-errors.ts`
- Test: `tests/repair-record-service.test.ts`, `tests/repair-record-validation.test.ts`

**Interfaces:**
- Consumes: Task 2 (`getRepairRecordCreateEffect`, `getRepairRecordCompleteEffect`, `getRepairRecordCancelEffect`, `isOpenRepairStatus`, `openRepairRecordWhere`, `repairOutcomes`), Task 3 (`calculateNextMaintenanceDueDate`), `withPrismaUniqueRetry` (`src/lib/prisma-unique-retry.ts`)
- Produces:
  - `repairRecordCreateSchema` → `RepairRecordCreateInput = { assetId; maintenancePlanId?: string|null; problem; reportedDate: Date; done: boolean; outcome: RepairOutcome; reportedById?: string|null; vendorId?: string|null; repairCost?: number|null; invoiceNo?: string|null; remark?: string|null }`
  - `repairRecordActionSchema` (discriminated `action`): `complete` `{ expectedUpdatedAt: Date; returnDate: Date; outcome; repairCost?; invoiceNo?; remark?; vendorId? }` · `cancel` `{ expectedUpdatedAt; reason?: string|null }` · `update` `{ expectedUpdatedAt; reportedDate; problem; vendorId?; repairCost?; invoiceNo?; remark? }`
  - `type RepairServiceUser = { id: string; employeeId?: string | null }`
  - `createRepairRecord(db, input, user)` → ticket (include `repairRecordInclude`)
  - `completeRepairRecord(db, id, input, user)` → `{ ticket, previous }`
  - `cancelRepairRecord(db, id, input, user)` → `{ ticket, previous }`
  - `updateRepairRecordDetails(db, id, input, user)` → `{ ticket, previous }`
  - `repairRecordInclude` (asset tag/name, reportedBy code/name, vendor code/name, maintenancePlan planNo/title)
  - `generateRepairNo(tx: Prisma.TransactionClient, now: Date): Promise<string>` (`MT-YYYYMMDD-NNNN`, ใช้ซ้ำใน check-in Task 11)
  - error codes เพิ่ม: `MAINTENANCE_ASSET_WRITTEN_OFF`, `MAINTENANCE_ASSET_ON_LOAN`, `MAINTENANCE_OPEN_RECORD_EXISTS`, `MAINTENANCE_REPORTER_REQUIRED` (code เก่าลบใน Task 14 หลังเลิกใช้ครบ)

- [ ] **Step 1: Write the failing validation test** — `tests/repair-record-validation.test.ts`

```typescript
import assert from "node:assert/strict"
import test from "node:test"

import { repairRecordActionSchema, repairRecordCreateSchema } from "../src/lib/validations/maintenance.ts"

test("a repair can be recorded with only asset, date and what was done", () => {
  const input = repairRecordCreateSchema.parse({ assetId: "asset-1", reportedDate: "2026-10-07", problem: "เปลี่ยนแบตเตอรี่", done: true })

  assert.equal(input.outcome, "usable")
  assert.equal(input.repairCost, null)
  assert.equal(input.vendorId, null)
})

test("the problem text is required", () => {
  assert.throws(() => repairRecordCreateSchema.parse({ assetId: "asset-1", reportedDate: "2026-10-07", problem: "  ", done: true }))
})

test("completing needs the return date and outcome", () => {
  const input = repairRecordActionSchema.parse({
    action: "complete",
    expectedUpdatedAt: "2026-10-07T03:00:00.000Z",
    returnDate: "2026-10-08",
    outcome: "beyond_repair",
  })
  assert.equal(input.action, "complete")
  assert.throws(() => repairRecordActionSchema.parse({ action: "complete", expectedUpdatedAt: "2026-10-07T03:00:00.000Z" }))
})

test("cancelling does not require a reason", () => {
  assert.equal(repairRecordActionSchema.parse({ action: "cancel", expectedUpdatedAt: "2026-10-07T03:00:00.000Z" }).action, "cancel")
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/repair-record-validation.test.ts`
Expected: FAIL — `does not provide an export named 'repairRecordActionSchema'`

- [ ] **Step 3: Implement the schemas** — ใน `src/lib/validations/maintenance.ts` เพิ่ม import `import { repairOutcomes } from "../repair-record-policy.ts"` และต่อท้ายไฟล์:

```typescript
const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().nullable(),
).optional().transform((value) => value ?? null)

const optionalNote = (max: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().max(max).nullable(),
).optional().transform((value) => value ?? null)

const optionalAmount = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.coerce.number().nonnegative().nullable(),
).optional().transform((value) => value ?? null)

export const repairRecordCreateSchema = z.object({
  assetId: z.string().trim().min(1),
  maintenancePlanId: optionalId,
  problem: z.string().trim().min(1).max(4000),
  reportedDate: z.coerce.date(),
  // JSON boolean only: z.coerce.boolean() would turn the string "false" into true.
  done: z.boolean(),
  outcome: z.enum(repairOutcomes).default("usable"),
  reportedById: optionalId,
  vendorId: optionalId,
  repairCost: optionalAmount,
  invoiceNo: optionalNote(100),
  remark: optionalNote(4000),
})

export type RepairRecordCreateInput = z.infer<typeof repairRecordCreateSchema>

export const repairRecordActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    expectedUpdatedAt: z.coerce.date(),
    returnDate: z.coerce.date(),
    outcome: z.enum(repairOutcomes),
    vendorId: optionalId,
    repairCost: optionalAmount,
    invoiceNo: optionalNote(100),
    remark: optionalNote(4000),
  }),
  z.object({
    action: z.literal("cancel"),
    expectedUpdatedAt: z.coerce.date(),
    reason: optionalNote(1000),
  }),
  z.object({
    action: z.literal("update"),
    expectedUpdatedAt: z.coerce.date(),
    reportedDate: z.coerce.date(),
    problem: z.string().trim().min(1).max(4000),
    vendorId: optionalId,
    repairCost: optionalAmount,
    invoiceNo: optionalNote(100),
    remark: optionalNote(4000),
  }),
])

export type RepairRecordActionInput = z.infer<typeof repairRecordActionSchema>
export type RepairRecordCompleteInput = Extract<RepairRecordActionInput, { action: "complete" }>
export type RepairRecordCancelInput = Extract<RepairRecordActionInput, { action: "cancel" }>
export type RepairRecordUpdateInput = Extract<RepairRecordActionInput, { action: "update" }>
```

- [ ] **Step 4: Run validation test**

Run: `node --test tests/repair-record-validation.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Error codes** — ใน `src/lib/maintenance-api-errors.ts` เพิ่ม 4 code ต่อท้าย `maintenanceErrorCodes` (code เดิมคงไว้ก่อน เพราะยังมีผู้ใช้จนถึง Task 14):

```typescript
  "MAINTENANCE_PLAN_INVALID_TRANSITION",
  "MAINTENANCE_ASSET_WRITTEN_OFF",
  "MAINTENANCE_ASSET_ON_LOAN",
  "MAINTENANCE_OPEN_RECORD_EXISTS",
  "MAINTENANCE_REPORTER_REQUIRED",
] as const
```

และใน `messages/th.json` / `messages/en.json` ใต้ `maintenancePage.errors` เพิ่ม/แก้ข้อความตามตารางนี้ (key อื่นคงไว้):

| key | th | en |
|---|---|---|
| `MAINTENANCE_ASSET_INELIGIBLE` | สถานะทรัพย์สินนี้ส่งซ่อมไม่ได้ | This asset status cannot be sent for repair |
| `MAINTENANCE_ASSET_WRITTEN_OFF` | ทรัพย์สินนี้ออกจากทะเบียนแล้ว บันทึกซ่อมไม่ได้ | This asset has been written off and cannot get repair records |
| `MAINTENANCE_ASSET_ON_LOAN` | ทรัพย์สินนี้ถูกยืมอยู่ กรุณาบันทึกคืนก่อน | This asset is on loan. Record the return first |
| `MAINTENANCE_OPEN_RECORD_EXISTS` | ทรัพย์สินนี้มีงานซ่อมที่ยังไม่เสร็จ กด "ซ่อมเสร็จ" ที่บันทึกนั้นแทน | This asset already has an unfinished repair. Use "Repair finished" on that record |
| `MAINTENANCE_REPORTER_REQUIRED` | กรุณาเลือกผู้บันทึก | Select who is recording this repair |
| `MAINTENANCE_INVALID_TRANSITION` | บันทึกนี้เสร็จหรือถูกยกเลิกไปแล้ว | This record is already finished or cancelled |
| `MAINTENANCE_CONFLICT` | ข้อมูลทรัพย์สินเพิ่งถูกเปลี่ยน กรุณาโหลดใหม่แล้วลองอีกครั้ง | The asset changed just now. Reload and try again |
| `MAINTENANCE_PLAN_INVALID_TRANSITION` | เปลี่ยนสถานะแผน PM นี้ไม่ได้ | This PM plan cannot change to that state |

- [ ] **Step 6: Write the failing service test** — `tests/repair-record-service.test.ts`

```typescript
import assert from "node:assert/strict"
import test from "node:test"

import { MaintenanceApiError } from "../src/lib/maintenance-api-errors.ts"
import {
  cancelRepairRecord,
  completeRepairRecord,
  createRepairRecord,
} from "../src/lib/repair-record-service.ts"

type Call = { call: string; args: Record<string, unknown> }

type FakeConfig = {
  statusName?: string
  ownershipType?: string
  custodianId?: string | null
  activeCheckouts?: number
  openRecords?: number
  claimRows?: number
  ticket?: Record<string, unknown> | null
  ticketUpdateRows?: number
  plan?: Record<string, unknown> | null
}

function fakeDb(config: FakeConfig = {}) {
  const calls: Call[] = []
  const asset = {
    id: "asset-1",
    statusId: `status:${config.statusName ?? "Ready"}`,
    ownershipType: config.ownershipType ?? "shared",
    custodianId: config.custodianId ?? null,
    status: { name: config.statusName ?? "Ready" },
  }
  const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
    "asset.findFirst": () => asset,
    "asset.updateMany": () => ({ count: config.claimRows ?? 1 }),
    "assetCheckout.count": () => config.activeCheckouts ?? 0,
    "maintenanceTicket.count": (args) => ((args.where as Record<string, unknown>).createdAt ? 0 : config.openRecords ?? 0),
    "maintenanceTicket.create": (args) => ({ id: "ticket-1", ...(args.data as object) }),
    "maintenanceTicket.findFirst": () => config.ticket ?? null,
    "maintenanceTicket.updateMany": () => ({ count: config.ticketUpdateRows ?? 1 }),
    "maintenanceTicket.findUnique": () => ({ id: "ticket-1" }),
    "assetStatus.findFirst": (args) => ({ id: `status:${(args.where as { name: string }).name}` }),
    "employee.findFirst": () => ({ id: "emp-1" }),
    "supplier.findFirst": () => ({ id: "vendor-1" }),
    "assetMovement.create": () => ({ id: "movement-1" }),
    "maintenancePlan.findFirst": () => config.plan ?? null,
    "maintenancePlan.update": (args) => ({ id: "plan-1", ...(args.data as object) }),
  }
  const tx = new Proxy({}, {
    get(_target, model: string) {
      return new Proxy({}, {
        get(_inner, method: string) {
          return async (args: Record<string, unknown> = {}) => {
            const call = `${model}.${method}`
            calls.push({ call, args })
            const handler = handlers[call]
            if (!handler) throw new Error(`Unexpected call ${call}`)
            return handler(args)
          }
        },
      })
    },
  })
  return { calls, db: { $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(tx) } }
}

const user = { id: "user-1", employeeId: "emp-1" }
const baseInput = {
  assetId: "asset-1",
  maintenancePlanId: null,
  problem: "เปลี่ยนแบตเตอรี่",
  reportedDate: new Date("2026-10-07T00:00:00Z"),
  done: true,
  outcome: "usable" as const,
  reportedById: null,
  vendorId: null,
  repairCost: null,
  invoiceNo: null,
  remark: null,
}

const find = (calls: Call[], name: string) => calls.find(({ call }) => call === name)
const statusWrites = (calls: Call[]) =>
  calls.filter(({ call, args }) => call === "asset.updateMany" && (args.data as Record<string, unknown>).statusId !== undefined)

test("a finished repair is saved as closed without touching an operational asset", async () => {
  const { db, calls } = fakeDb()

  await createRepairRecord(db as never, baseInput, user)

  const data = find(calls, "maintenanceTicket.create")!.args.data as Record<string, unknown>
  assert.equal(data.repairStatus, "closed")
  assert.equal(data.outcome, "usable")
  assert.equal(data.reportedById, "emp-1")
  assert.equal(data.repairType, "internal")
  assert.deepEqual(statusWrites(calls), [])
})

test("an unfinished repair claims the asset and moves it to Under Maintenance", async () => {
  const { db, calls } = fakeDb()

  await createRepairRecord(db as never, { ...baseInput, done: false }, user)

  const data = find(calls, "maintenanceTicket.create")!.args.data as Record<string, unknown>
  assert.equal(data.repairStatus, "in_progress")
  assert.equal(data.outcome, null)
  assert.deepEqual(statusWrites(calls)[0].args, {
    where: { id: "asset-1", isActive: true, statusId: "status:Ready" },
    data: { statusId: "status:Under Maintenance", updatedBy: "user-1" },
  })
})

test("the open-record check runs after the asset row is claimed", async () => {
  const { db, calls } = fakeDb({ openRecords: 1 })

  await assert.rejects(
    createRepairRecord(db as never, baseInput, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_OPEN_RECORD_EXISTS",
  )
  const order = calls.map(({ call }) => call)
  assert.ok(order.includes("asset.updateMany"))
  assert.ok(order.indexOf("asset.updateMany") < order.lastIndexOf("maintenanceTicket.count"))
  assert.equal(order.includes("maintenanceTicket.create"), false)
})

test("a concurrent change to the asset is reported as a conflict", async () => {
  const { db, calls } = fakeDb({ claimRows: 0 })

  await assert.rejects(
    createRepairRecord(db as never, baseInput, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_CONFLICT" && error.status === 409,
  )
  assert.equal(calls.some(({ call }) => call === "maintenanceTicket.create"), false)
})

test("an account without an employee link must choose the reporter", async () => {
  const { db } = fakeDb()

  await assert.rejects(
    createRepairRecord(db as never, baseInput, { id: "admin" }),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_REPORTER_REQUIRED",
  )
})

test("recording a PM moves the plan's next due date from the recorded date", async () => {
  const { db, calls } = fakeDb({
    plan: { id: "plan-1", assetId: "asset-1", frequency: "monthly", intervalDays: 30, planState: "active", nextDueDate: new Date("2026-09-30T00:00:00Z") },
  })

  await createRepairRecord(db as never, { ...baseInput, maintenancePlanId: "plan-1", reportedDate: new Date("2026-10-31T00:00:00Z") }, user)

  const update = find(calls, "maintenancePlan.update")!.args as { data: { nextDueDate: Date } }
  assert.equal(update.data.nextDueDate.toISOString().slice(0, 10), "2026-11-30")
})

test("finishing a permanently assigned asset's repair restores In Use", async () => {
  const ticket = {
    id: "ticket-1",
    repairStatus: "in_progress",
    updatedAt: new Date("2026-10-07T03:00:00Z"),
    assetId: "asset-1",
    asset: { id: "asset-1", statusId: "status:Under Maintenance", ownershipType: "shared", custodianId: "emp-9", status: { name: "Under Maintenance" } },
  }
  const { db, calls } = fakeDb({ ticket, activeCheckouts: 1 })

  await completeRepairRecord(db as never, "ticket-1", {
    action: "complete",
    expectedUpdatedAt: ticket.updatedAt,
    returnDate: new Date("2026-10-08T00:00:00Z"),
    outcome: "usable",
    vendorId: null,
    repairCost: 1200,
    invoiceNo: null,
    remark: null,
  }, user)

  assert.equal((statusWrites(calls)[0].args.data as Record<string, unknown>).statusId, "status:In Use")
  const ticketUpdate = find(calls, "maintenanceTicket.updateMany")!.args as { where: Record<string, unknown>; data: Record<string, unknown> }
  assert.deepEqual(ticketUpdate.where, { id: "ticket-1", isActive: true, updatedAt: ticket.updatedAt, repairStatus: "in_progress" })
  assert.equal(ticketUpdate.data.repairStatus, "closed")
  assert.equal(ticketUpdate.data.outcome, "usable")
})

test("legacy unfinished tickets can be finished", async () => {
  const ticket = {
    id: "ticket-1",
    repairStatus: "waiting_parts",
    updatedAt: new Date("2026-10-07T03:00:00Z"),
    assetId: "asset-1",
    asset: { id: "asset-1", statusId: "status:Under Maintenance", ownershipType: "shared", custodianId: null, status: { name: "Under Maintenance" } },
  }
  const { db, calls } = fakeDb({ ticket })

  await completeRepairRecord(db as never, "ticket-1", {
    action: "complete", expectedUpdatedAt: ticket.updatedAt, returnDate: new Date("2026-10-08T00:00:00Z"),
    outcome: "usable", vendorId: null, repairCost: null, invoiceNo: null, remark: null,
  }, user)

  assert.equal((find(calls, "maintenanceTicket.updateMany")!.args.where as Record<string, unknown>).repairStatus, "waiting_parts")
})

test("finished or cancelled records cannot be cancelled", async () => {
  const ticket = {
    id: "ticket-1", repairStatus: "closed", updatedAt: new Date("2026-10-07T03:00:00Z"), assetId: "asset-1",
    asset: { id: "asset-1", statusId: "status:Ready", ownershipType: "shared", custodianId: null, status: { name: "Ready" } },
  }
  const { db } = fakeDb({ ticket })

  await assert.rejects(
    cancelRepairRecord(db as never, "ticket-1", { action: "cancel", expectedUpdatedAt: ticket.updatedAt, reason: null }, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_INVALID_TRANSITION",
  )
})

test("a stale edit is rejected as a conflict", async () => {
  const ticket = {
    id: "ticket-1", repairStatus: "in_progress", updatedAt: new Date("2026-10-07T03:00:00Z"), assetId: "asset-1",
    asset: { id: "asset-1", statusId: "status:Under Maintenance", ownershipType: "shared", custodianId: null, status: { name: "Under Maintenance" } },
  }
  const { db } = fakeDb({ ticket, ticketUpdateRows: 0 })

  await assert.rejects(
    cancelRepairRecord(db as never, "ticket-1", { action: "cancel", expectedUpdatedAt: new Date("2026-10-07T02:00:00Z"), reason: null }, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_CONFLICT",
  )
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `node --test tests/repair-record-service.test.ts`
Expected: FAIL — `Cannot find module '.../src/lib/repair-record-service.ts'`

- [ ] **Step 8: Implement the service** — `src/lib/repair-record-service.ts`

```typescript
import type { Prisma, PrismaClient } from "@prisma/client"
import { MaintenanceApiError } from "./maintenance-api-errors.ts"
import { calculateNextMaintenanceDueDate, type MaintenancePlanFrequency } from "./preventive-maintenance.ts"
import { withPrismaUniqueRetry } from "./prisma-unique-retry.ts"
import {
  getRepairRecordCancelEffect,
  getRepairRecordCompleteEffect,
  getRepairRecordCreateEffect,
  isOpenRepairStatus,
  openRepairRecordWhere,
  type RepairAssetContext,
  type RepairAssetEffect,
} from "./repair-record-policy.ts"
import type {
  RepairRecordCancelInput,
  RepairRecordCompleteInput,
  RepairRecordCreateInput,
  RepairRecordUpdateInput,
} from "./validations/maintenance.ts"

export type RepairServiceDb = Pick<PrismaClient, "$transaction">
export type RepairServiceUser = { id: string; employeeId?: string | null }

export const repairRecordInclude = {
  asset: { select: { assetTag: true, name: true } },
  reportedBy: { select: { code: true, fullNameTh: true } },
  vendor: { select: { code: true, name: true } },
  maintenancePlan: { select: { planNo: true, title: true } },
} satisfies Prisma.MaintenanceTicketInclude

const assetContextSelect = {
  id: true,
  statusId: true,
  ownershipType: true,
  custodianId: true,
  status: { select: { name: true } },
} as const

type AssetRow = { id: string; statusId: string; ownershipType: string | null; custodianId: string | null; status: { name: string } }

export async function createRepairRecord(db: RepairServiceDb, input: RepairRecordCreateInput, user: RepairServiceUser) {
  const reportedById = input.reportedById ?? user.employeeId ?? null
  if (!reportedById) {
    throw new MaintenanceApiError("MAINTENANCE_REPORTER_REQUIRED", "Select who is recording this repair")
  }

  return withPrismaUniqueRetry(() => db.$transaction(async (tx) => {
    const asset = await tx.asset.findFirst({ where: { id: input.assetId, isActive: true }, select: assetContextSelect })
    if (!asset) throw new Error("Asset not found or inactive")

    // Lock the asset row first so a concurrent record for the same asset waits here and then
    // sees either the changed status or the committed open record.
    await claimAsset(tx, asset, null, user)
    const effect = getRepairRecordCreateEffect(await loadAssetContext(tx, asset), input)
    throwIfRepairError(effect)

    await requireActiveEmployee(tx, reportedById)
    if (input.vendorId) await requireActiveSupplier(tx, input.vendorId)

    const nextStatusId = await applyAssetStatus(tx, asset, effect.nextStatusName, user)
    const ticket = await tx.maintenanceTicket.create({
      data: {
        repairNo: await generateRepairNo(tx, new Date()),
        assetId: asset.id,
        maintenancePlanId: input.maintenancePlanId,
        problem: input.problem,
        reportedById,
        reportedDate: input.reportedDate,
        repairType: input.vendorId ? "vendor" : "internal",
        vendorId: input.vendorId,
        repairStatus: input.done ? "closed" : "in_progress",
        outcome: input.done ? input.outcome : null,
        repairCost: input.repairCost,
        invoiceNo: input.invoiceNo,
        resolution: input.remark,
        returnDate: input.done ? input.reportedDate : null,
        createdBy: user.id,
        updatedBy: user.id,
      },
      include: repairRecordInclude,
    })

    await tx.assetMovement.create({
      data: {
        assetId: asset.id,
        movementType: "maintenance_create",
        fromValue: asset.statusId,
        toValue: nextStatusId ?? asset.statusId,
        reason: input.problem,
        referenceType: "maintenance",
        referenceId: ticket.id,
        performedBy: user.id,
      },
    })

    if (input.maintenancePlanId) await advancePlan(tx, input.maintenancePlanId, asset.id, input.reportedDate, user)
    return ticket
  }))
}

export async function completeRepairRecord(db: RepairServiceDb, id: string, input: RepairRecordCompleteInput, user: RepairServiceUser) {
  return db.$transaction(async (tx) => {
    const previous = await getOpenTicket(tx, id)
    const effect = getRepairRecordCompleteEffect(await loadAssetContext(tx, previous.asset, { ignoreRecordId: id }), input.outcome)
    throwIfRepairError(effect)
    if (input.vendorId) await requireActiveSupplier(tx, input.vendorId)

    await updateTicket(tx, previous, {
      repairStatus: "closed",
      outcome: input.outcome,
      returnDate: input.returnDate,
      ...(input.vendorId ? { vendorId: input.vendorId, repairType: "vendor" } : {}),
      ...(input.repairCost !== null ? { repairCost: input.repairCost } : {}),
      ...(input.invoiceNo ? { invoiceNo: input.invoiceNo } : {}),
      ...(input.remark ? { resolution: input.remark } : {}),
    }, input.expectedUpdatedAt, user)
    const nextStatusId = await applyAssetStatus(tx, previous.asset, effect.nextStatusName, user)
    await recordMovement(tx, previous, "maintenance_close", nextStatusId, input.remark, user)
    return { ticket: await reloadTicket(tx, id), previous }
  })
}

export async function cancelRepairRecord(db: RepairServiceDb, id: string, input: RepairRecordCancelInput, user: RepairServiceUser) {
  return db.$transaction(async (tx) => {
    const previous = await getOpenTicket(tx, id)
    const effect = getRepairRecordCancelEffect(await loadAssetContext(tx, previous.asset, { ignoreRecordId: id }))

    await updateTicket(tx, previous, { repairStatus: "cancelled" }, input.expectedUpdatedAt, user)
    const nextStatusId = await applyAssetStatus(tx, previous.asset, effect.nextStatusName, user)
    await recordMovement(tx, previous, "maintenance_cancel", nextStatusId, input.reason, user)
    return { ticket: await reloadTicket(tx, id), previous }
  })
}

export async function updateRepairRecordDetails(db: RepairServiceDb, id: string, input: RepairRecordUpdateInput, user: RepairServiceUser) {
  return db.$transaction(async (tx) => {
    const previous = await getTicket(tx, id)
    if (input.vendorId) await requireActiveSupplier(tx, input.vendorId)
    await updateTicket(tx, previous, {
      reportedDate: input.reportedDate,
      problem: input.problem,
      vendorId: input.vendorId,
      repairType: input.vendorId ? "vendor" : "internal",
      repairCost: input.repairCost,
      invoiceNo: input.invoiceNo,
      resolution: input.remark,
    }, input.expectedUpdatedAt, user)
    return { ticket: await reloadTicket(tx, id), previous }
  })
}

// The detail fields come back as `previous` so routes can write old values to the System Log.
type TicketRow = {
  id: string
  repairStatus: string
  updatedAt: Date
  assetId: string
  asset: AssetRow
  reportedDate?: Date
  problem?: string
  vendorId?: string | null
  repairCost?: unknown
  invoiceNo?: string | null
  resolution?: string | null
}

async function getTicket(tx: Prisma.TransactionClient, id: string): Promise<TicketRow> {
  const ticket = await tx.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      repairStatus: true,
      updatedAt: true,
      assetId: true,
      reportedDate: true,
      problem: true,
      vendorId: true,
      repairCost: true,
      invoiceNo: true,
      resolution: true,
      asset: { select: assetContextSelect },
    },
  })
  if (!ticket) throw new Error("Repair record not found")
  return ticket as TicketRow
}

async function getOpenTicket(tx: Prisma.TransactionClient, id: string) {
  const ticket = await getTicket(tx, id)
  if (!isOpenRepairStatus(ticket.repairStatus)) {
    throw new MaintenanceApiError("MAINTENANCE_INVALID_TRANSITION", "This record is already finished or cancelled", 409)
  }
  return ticket
}

async function updateTicket(
  tx: Prisma.TransactionClient,
  previous: TicketRow,
  data: Prisma.MaintenanceTicketUncheckedUpdateManyInput,
  expectedUpdatedAt: Date,
  user: RepairServiceUser,
) {
  const result = await tx.maintenanceTicket.updateMany({
    where: { id: previous.id, isActive: true, updatedAt: expectedUpdatedAt, repairStatus: previous.repairStatus },
    data: { ...data, updatedBy: user.id },
  })
  if (result.count === 0) throw conflictError()
}

async function reloadTicket(tx: Prisma.TransactionClient, id: string) {
  const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: repairRecordInclude })
  if (!ticket) throw conflictError()
  return ticket
}

async function loadAssetContext(
  tx: Prisma.TransactionClient,
  asset: AssetRow,
  options: { ignoreRecordId?: string } = {},
): Promise<RepairAssetContext> {
  const [activeCheckouts, openRecords] = await Promise.all([
    tx.assetCheckout.count({ where: { assetId: asset.id, isReturned: false, transactionStatus: "active" } }),
    tx.maintenanceTicket.count({
      where: { ...openRepairRecordWhere, assetId: asset.id, ...(options.ignoreRecordId ? { id: { not: options.ignoreRecordId } } : {}) },
    }),
  ])
  return {
    statusName: asset.status.name,
    ownershipType: asset.ownershipType,
    custodianId: asset.custodianId,
    hasActiveCheckout: activeCheckouts > 0,
    hasOpenRecord: openRecords > 0,
  }
}

async function claimAsset(tx: Prisma.TransactionClient, asset: AssetRow, statusId: string | null, user: RepairServiceUser) {
  const result = await tx.asset.updateMany({
    where: { id: asset.id, isActive: true, statusId: asset.statusId },
    data: statusId ? { statusId, updatedBy: user.id } : { updatedBy: user.id },
  })
  if (result.count !== 1) throw conflictError()
}

async function applyAssetStatus(tx: Prisma.TransactionClient, asset: AssetRow, nextStatusName: string | null, user: RepairServiceUser) {
  if (!nextStatusName || nextStatusName === asset.status.name) return null
  const status = await tx.assetStatus.findFirst({ where: { isActive: true, name: nextStatusName }, select: { id: true } })
  if (!status) throw new Error(`${nextStatusName} asset status is not configured`)
  await claimAsset(tx, asset, status.id, user)
  return status.id
}

async function recordMovement(
  tx: Prisma.TransactionClient,
  ticket: TicketRow,
  movementType: "maintenance_close" | "maintenance_cancel",
  nextStatusId: string | null,
  reason: string | null,
  user: RepairServiceUser,
) {
  await tx.assetMovement.create({
    data: {
      assetId: ticket.assetId,
      movementType,
      fromValue: ticket.asset.statusId,
      toValue: nextStatusId ?? ticket.asset.statusId,
      reason,
      referenceType: "maintenance",
      referenceId: ticket.id,
      performedBy: user.id,
    },
  })
}

async function advancePlan(tx: Prisma.TransactionClient, planId: string, assetId: string, recordedDate: Date, user: RepairServiceUser) {
  const plan = await tx.maintenancePlan.findFirst({
    where: { id: planId, assetId, planState: "active", isActive: true },
    select: { id: true, frequency: true, intervalDays: true },
  })
  if (!plan) throw new MaintenanceApiError("MAINTENANCE_PLAN_INVALID_TRANSITION", "The PM plan is not active for this asset", 409)
  await tx.maintenancePlan.update({
    where: { id: plan.id },
    data: {
      nextDueDate: calculateNextMaintenanceDueDate(recordedDate, plan.frequency as MaintenancePlanFrequency, plan.intervalDays),
      updatedBy: user.id,
    },
  })
}

async function requireActiveEmployee(tx: Prisma.TransactionClient, id: string) {
  const record = await tx.employee.findFirst({ where: { id, isActive: true }, select: { id: true } })
  if (!record) throw new Error("Reporter not found or inactive")
}

async function requireActiveSupplier(tx: Prisma.TransactionClient, id: string) {
  const record = await tx.supplier.findFirst({ where: { id, isActive: true }, select: { id: true } })
  if (!record) throw new Error("Vendor not found or inactive")
}

export async function generateRepairNo(tx: Prisma.TransactionClient, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const count = await tx.maintenanceTicket.count({ where: { createdAt: { gte: start, lt: end } } })
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  return `MT-${datePart}-${String(count + 1).padStart(4, "0")}`
}

function throwIfRepairError(effect: RepairAssetEffect): asserts effect is { error: null; nextStatusName: string | null } {
  if (effect.error) {
    throw new MaintenanceApiError(effect.error, effect.error, effect.error === "MAINTENANCE_OPEN_RECORD_EXISTS" ? 409 : 400)
  }
}

function conflictError() {
  return new MaintenanceApiError("MAINTENANCE_CONFLICT", "The asset or record changed just now; reload and try again", 409)
}
```

หมายเหตุ: ใน create ตอน claim ครั้งแรกส่ง `statusId: null` (ล็อกอย่างเดียว) และ `applyAssetStatus` claim ซ้ำด้วย `statusId` เดิมของ row ที่อ่านมา — ใน transaction เดียวกัน row ยังเป็นสถานะเดิม จึงได้ count 1

- [ ] **Step 9: Run the tests**

Run: `node --test tests/repair-record-service.test.ts tests/repair-record-validation.test.ts tests/repair-record-policy.test.ts`
Expected: PASS ทั้งหมด

- [ ] **Step 10: tsc + commit**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0
Run: `node --test tests/maintenance-i18n.test.ts tests/maintenance-api-errors.test.ts`
Expected: PASS (ทุก error code มีข้อความทั้ง th/en)

```bash
git add src/lib/repair-record-service.ts src/lib/validations/maintenance.ts src/lib/maintenance-api-errors.ts messages/th.json messages/en.json tests/repair-record-service.test.ts tests/repair-record-validation.test.ts
git commit -m "feat(maintenance): repair record service and validation" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: API บันทึกซ่อม (สร้าง · ซ่อมเสร็จ · ยกเลิก · แก้ไข · แนบไฟล์)

**Files:**
- Modify: `src/app/api/maintenance-tickets/route.ts`
- Modify: `src/app/api/maintenance-tickets/[id]/route.ts`
- Modify: `src/app/api/maintenance-tickets/[id]/attachments/route.ts`
- Modify: `src/app/api/attachments/[id]/route.ts` (เลิกล็อกไฟล์ของบันทึกที่ปิดแล้ว)
- Modify: `src/lib/maintenance-options.ts` + `tests/maintenance-options.test.ts`
- Delete: `src/lib/maintenance-ticket-service.ts`, `tests/maintenance-ticket-service.test.ts`, `tests/maintenance-create-claim.test.ts`, `tests/maintenance-ticket-routes.test.ts`, `tests/maintenance-create-routes.test.ts`, `tests/maintenance-cancellation-route-ui.test.ts`, `tests/maintenance-evidence-policy.test.ts`
- Test: `tests/repair-record-routes.test.ts`

**Interfaces:**
- Consumes: Task 4 (`createRepairRecord`, `completeRepairRecord`, `cancelRepairRecord`, `updateRepairRecordDetails`, `repairRecordInclude`, `repairRecordCreateSchema`, `repairRecordActionSchema`), Task 2 (`canAttachToRepairRecord`, `isOpenRepairStatus`, `openRepairRecordWhere`)
- Produces (HTTP):
  - `POST /api/maintenance-tickets` body = `RepairRecordCreateInput` (JSON) → 201 ticket · error → `{ code, error }` ตาม `MaintenanceApiError.status`
  - `PATCH /api/maintenance-tickets/:id` body = `{ action: "complete" | "cancel" | "update", expectedUpdatedAt, ... }` (ต้องมี `maintenance:edit`) → 200 ticket
  - `POST /api/maintenance-tickets/:id/attachments` (formData `file`, `attachmentType`) — ผ่านเมื่อ `canAttachToRepairRecord` เป็นจริง
  - `GET /api/maintenance-options?type=asset` — ปิดเลือกเฉพาะทรัพย์สินที่ออกจากทะเบียน (`MAINTENANCE_ASSET_WRITTEN_OFF`) หรือมีบันทึกยังไม่เสร็จ (`MAINTENANCE_OPEN_RECORD_EXISTS`)

- [ ] **Step 1: Write the failing route test** — `tests/repair-record-routes.test.ts`

```typescript
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

import { MaintenanceApiError } from "../src/lib/maintenance-api-errors.ts"

type RouteState = {
  user: { id: string; name: string; roles: string[]; permissions: string[]; employeeId: string | null }
  calls: Array<{ fn: string; args: unknown[] }>
  error: unknown
}
const state: RouteState = {
  user: { id: "user-1", name: "User", roles: [], permissions: [], employeeId: "emp-1" },
  calls: [],
  error: null,
}
Object.assign(globalThis, { __repairRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const s = () => globalThis.__repairRouteState
    export async function requireAuth() { return s().user }
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
    export function requirePermission(user, module, action) {
      if (!hasPermission(user, module, action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `
    export async function logAudit(entry) { globalThis.__repairRouteState.calls.push({ fn: "logAudit", args: [entry] }) }
  `],
  ["@/lib/db", `export const prisma = {}`],
  ["@/lib/repair-record-service", `
    const s = () => globalThis.__repairRouteState
    const previous = { repairStatus: "in_progress", asset: { statusId: "status-under-maintenance" } }
    function record(fn, result) {
      return async (_db, ...args) => {
        s().calls.push({ fn, args })
        if (s().error) throw s().error
        return result
      }
    }
    export const repairRecordInclude = {}
    export const createRepairRecord = record("createRepairRecord", { id: "ticket-1", repairNo: "MT-20261007-0001", repairStatus: "closed" })
    export const completeRepairRecord = record("completeRepairRecord", { ticket: { id: "ticket-1" }, previous })
    export const cancelRepairRecord = record("cancelRepairRecord", { ticket: { id: "ticket-1" }, previous })
    export const updateRepairRecordDetails = record("updateRepairRecordDetails", { ticket: { id: "ticket-1" }, previous })
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

const createRoute = await import(pathToFileURL("src/app/api/maintenance-tickets/route.ts").href) as {
  POST(request: Request): Promise<Response>
}
const recordRoute = await import(pathToFileURL("src/app/api/maintenance-tickets/[id]/route.ts").href) as {
  PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function reset(permissions = ["maintenance:create", "maintenance:edit"]) {
  state.calls = []
  state.error = null
  state.user = { ...state.user, permissions }
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
}

const context = { params: Promise.resolve({ id: "ticket-1" }) }

test("recording a repair passes the signed-in employee to the service and writes the system log", async () => {
  reset()
  const response = await createRoute.POST(jsonRequest("http://localhost/api/maintenance-tickets", "POST", {
    assetId: "asset-1",
    reportedDate: "2026-10-07",
    problem: "เปลี่ยนแบตเตอรี่",
    done: true,
  }))

  assert.equal(response.status, 201, await response.clone().text())
  const call = state.calls.find(({ fn }) => fn === "createRepairRecord")
  assert.ok(call)
  assert.equal((call.args[0] as { outcome: string }).outcome, "usable")
  assert.deepEqual(call.args[1], { id: "user-1", employeeId: "emp-1" })
  assert.equal(state.calls.some(({ fn }) => fn === "logAudit"), true)
})

test("repair rule errors reach the client as stable codes", async () => {
  reset()
  state.error = new MaintenanceApiError("MAINTENANCE_ASSET_ON_LOAN", "MAINTENANCE_ASSET_ON_LOAN")
  const response = await createRoute.POST(jsonRequest("http://localhost/api/maintenance-tickets", "POST", {
    assetId: "asset-1",
    reportedDate: "2026-10-07",
    problem: "ส่งซ่อม",
    done: false,
  }))

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, "MAINTENANCE_ASSET_ON_LOAN")
})

test("finishing a repair goes through the complete action", async () => {
  reset()
  const response = await recordRoute.PATCH(jsonRequest("http://localhost/api/maintenance-tickets/ticket-1", "PATCH", {
    action: "complete",
    expectedUpdatedAt: "2026-10-07T03:00:00.000Z",
    returnDate: "2026-10-08",
    outcome: "usable",
  }), context)

  assert.equal(response.status, 200, await response.clone().text())
  const call = state.calls.find(({ fn }) => fn === "completeRepairRecord")
  assert.ok(call)
  assert.equal(call.args[0], "ticket-1")
  assert.equal((call.args[1] as { outcome: string }).outcome, "usable")
})

test("users who can only record repairs cannot finish, edit or cancel them", async () => {
  reset(["maintenance:create"])
  const response = await recordRoute.PATCH(jsonRequest("http://localhost/api/maintenance-tickets/ticket-1", "PATCH", {
    action: "cancel",
    expectedUpdatedAt: "2026-10-07T03:00:00.000Z",
  }), context)

  assert.equal(response.status, 403)
  assert.equal(state.calls.some(({ fn }) => fn === "cancelRepairRecord"), false)
})

test("old workflow actions are rejected", async () => {
  reset()
  const response = await recordRoute.PATCH(jsonRequest("http://localhost/api/maintenance-tickets/ticket-1", "PATCH", {
    action: "status",
    expectedUpdatedAt: "2026-10-07T03:00:00.000Z",
    status: "accepted",
  }), context)

  assert.equal(response.status, 400)
})

test("attachment upload uses the recorder-or-editor rule", () => {
  const source = readFileSync("src/app/api/maintenance-tickets/[id]/attachments/route.ts", "utf8")
  assert.match(source, /canAttachToRepairRecord\(/)
  assert.doesNotMatch(source, /requirePermission\(user, "maintenance", "edit"\)/)
})

test("files on finished records can still be removed by editors", () => {
  const source = readFileSync("src/app/api/attachments/[id]/route.ts", "utf8")
  assert.doesNotMatch(source, /MAINTENANCE_EVIDENCE_LOCKED/)
  assert.doesNotMatch(source, /canDeleteMaintenanceEvidence/)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/repair-record-routes.test.ts`
Expected: FAIL — route ยัง import `@/lib/maintenance-ticket-service` / test แรกได้ 400 จาก schema เก่า

- [ ] **Step 3: แทนที่ `src/app/api/maintenance-tickets/route.ts` ทั้งไฟล์**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getMaintenanceErrorPayload } from "@/lib/maintenance-api-errors"
import { createRepairRecord, repairRecordInclude } from "@/lib/repair-record-service"
import { repairRecordCreateSchema } from "@/lib/validations/maintenance"
import { buildMaintenanceWhere, parseMaintenanceListParams } from "@/lib/maintenance-query"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "view")

    const filters = parseMaintenanceListParams(request.nextUrl.searchParams)
    const where = buildMaintenanceWhere(filters)
    const [tickets, total] = await Promise.all([
      prisma.maintenanceTicket.findMany({
        where,
        include: repairRecordInclude,
        orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.maintenanceTicket.count({ where }),
    ])

    return NextResponse.json({ data: tickets, total, page: filters.page, pageSize: filters.pageSize })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "create")

    const input = repairRecordCreateSchema.parse(await request.json())
    const ticket = await createRepairRecord(prisma, input, { id: user.id, employeeId: user.employeeId })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "maintenance",
      recordId: ticket.id,
      newValue: { ...input, repairNo: ticket.repairNo, repairStatus: ticket.repairStatus },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    const payload = getMaintenanceErrorPayload(error)
    if (payload) return NextResponse.json(payload.body, { status: payload.status })
    return errorResponse(error, 400)
  }
}
```

หมายเหตุ: `buildMaintenanceWhere(filters)` ยังรับ argument ที่ 2 (evidence) ได้จนถึง Task 9 — เรียกแบบไม่ส่งได้เพราะเป็น optional

- [ ] **Step 4: แทนที่ `src/app/api/maintenance-tickets/[id]/route.ts` ทั้งไฟล์**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getMaintenanceErrorPayload } from "@/lib/maintenance-api-errors"
import {
  cancelRepairRecord,
  completeRepairRecord,
  updateRepairRecordDetails,
} from "@/lib/repair-record-service"
import { repairRecordActionSchema } from "@/lib/validations/maintenance"

type RepairRecordContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RepairRecordContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "edit")

    const { id } = await context.params
    const input = repairRecordActionSchema.parse(await request.json())
    const serviceUser = { id: user.id, employeeId: user.employeeId }

    if (input.action === "complete") {
      const result = await completeRepairRecord(prisma, id, input, serviceUser)
      await logAudit({
        userId: user.id,
        action: "complete",
        module: "maintenance",
        recordId: id,
        oldValue: { repairStatus: result.previous.repairStatus, assetStatusId: result.previous.asset.statusId },
        newValue: {
          repairStatus: "closed",
          outcome: input.outcome,
          returnDate: input.returnDate,
          vendorId: input.vendorId,
          repairCost: input.repairCost,
          invoiceNo: input.invoiceNo,
          remark: input.remark,
        },
      })
      return NextResponse.json(result.ticket)
    }

    if (input.action === "cancel") {
      const result = await cancelRepairRecord(prisma, id, input, serviceUser)
      await logAudit({
        userId: user.id,
        action: "cancel",
        module: "maintenance",
        recordId: id,
        oldValue: { repairStatus: result.previous.repairStatus, assetStatusId: result.previous.asset.statusId },
        newValue: { repairStatus: "cancelled", reason: input.reason },
        remark: input.reason ?? undefined,
      })
      return NextResponse.json(result.ticket)
    }

    const result = await updateRepairRecordDetails(prisma, id, input, serviceUser)
    await logAudit({
      userId: user.id,
      action: "update",
      module: "maintenance",
      recordId: id,
      oldValue: {
        reportedDate: result.previous.reportedDate,
        problem: result.previous.problem,
        vendorId: result.previous.vendorId,
        repairCost: result.previous.repairCost,
        invoiceNo: result.previous.invoiceNo,
        remark: result.previous.resolution,
      },
      newValue: {
        reportedDate: input.reportedDate,
        problem: input.problem,
        vendorId: input.vendorId,
        repairCost: input.repairCost,
        invoiceNo: input.invoiceNo,
        remark: input.remark,
      },
    })
    return NextResponse.json(result.ticket)
  } catch (error) {
    const payload = getMaintenanceErrorPayload(error)
    if (payload) return NextResponse.json(payload.body, { status: payload.status })
    return errorResponse(error, 400)
  }
}
```

ถ้า `logAudit` ไม่รับ `remark: undefined` ให้เปิด `src/lib/audit-log.ts` ดู type แล้วส่งเฉพาะเมื่อมีค่า (`...(input.reason ? { remark: input.reason } : {})`)

- [ ] **Step 5: แนบไฟล์ — `src/app/api/maintenance-tickets/[id]/attachments/route.ts`**

แก้ import: ลบ `import { isMaintenanceTerminalStatus } from "@/lib/maintenance-policy"` · เปลี่ยน `import { requireAuth, requirePermission } from "@/lib/auth-utils"` เป็น `import { hasPermission, requireAuth } from "@/lib/auth-utils"` · เพิ่ม `import { canAttachToRepairRecord, isOpenRepairStatus } from "@/lib/repair-record-policy"`

แทนที่ช่วงตั้งแต่ `const user = await requireAuth()` ถึงบรรทัด `if (!ticket) return NextResponse.json(...)` ด้วย:

```typescript
    const user = await requireAuth()
    const canEdit = hasPermission(user, "maintenance", "edit")
    const canCreate = hasPermission(user, "maintenance", "create")
    if (!canEdit && !canCreate) throw new Error("Forbidden: insufficient permissions")

    const { id } = await context.params
    const ticket = await prisma.maintenanceTicket.findFirst({
      where: { id, isActive: true },
      select: { id: true, repairNo: true, assetId: true, repairStatus: true, createdBy: true },
    })
    if (!ticket) return NextResponse.json({ error: "Maintenance ticket not found" }, { status: 404 })
    if (!canAttachToRepairRecord({ userId: user.id, canEdit, canCreate }, ticket)) {
      throw new Error("Forbidden: insufficient permissions")
    }
```

และใน `logAudit` ของไฟล์นี้ เปลี่ยน `postCloseAddendum: isMaintenanceTerminalStatus(ticket.repairStatus),` เป็น `recordFinished: !isOpenRepairStatus(ticket.repairStatus),`

- [ ] **Step 6: ลบไฟล์ — `src/app/api/attachments/[id]/route.ts`**

ลบบรรทัด import `getMaintenanceErrorPayload, MaintenanceApiError` และ `canDeleteMaintenanceEvidence` · ลบบล็อก `if (existing.module === "maintenance") { ... }` ทั้งบล็อกใน `DELETE` · ใน `catch` ของ `DELETE` ลบสองบรรทัด `const payload = getMaintenanceErrorPayload(error)` / `if (payload) return ...` ให้เหลือ `return errorResponse(error)`

- [ ] **Step 7: ตัวเลือกทรัพย์สิน — `src/lib/maintenance-options.ts`**

เปลี่ยน import บรรทัดแรกเป็น `import { openRepairRecordWhere } from "./repair-record-policy.ts"` · เพิ่มใต้ type `MaintenanceOption`:

```typescript
const writtenOffStatusNames = new Set(["disposed", "retired"])
```

แทนที่ช่วง `const activeTickets = ...` ถึงท้าย `return assets.map(...)` ของ asset ด้วย:

```typescript
  const openRecords = assets.length
    ? await db.maintenanceTicket.findMany({
        where: { ...openRepairRecordWhere, assetId: { in: assets.map((asset) => asset.id) } },
        select: { assetId: true },
      }) as Array<{ assetId: string }>
    : []
  const openRecordAssetIds = new Set(openRecords.map((record) => record.assetId))

  // Only block what can never succeed: written-off assets and assets that already have an
  // unfinished record. Loan and status rules depend on "done / not done" and are explained by the API.
  return assets.map((asset) => {
    const reason = writtenOffStatusNames.has(asset.status.name.trim().toLowerCase())
      ? "MAINTENANCE_ASSET_WRITTEN_OFF"
      : openRecordAssetIds.has(asset.id)
        ? "MAINTENANCE_OPEN_RECORD_EXISTS"
        : null
    return {
      id: asset.id,
      label: `${asset.assetTag} - ${asset.name} (${asset.status.nameTh})`,
      ...(reason ? { disabled: true, reason } : {}),
    }
  })
```

ใน `tests/maintenance-options.test.ts` แทนที่ test `"asset options explain lifecycle conflicts instead of hiding records"` ด้วย:

```typescript
test("asset options block only written-off assets and assets with an unfinished record", async () => {
  const disposed = await searchMaintenanceOptions(fakeDb({ assetStatus: "Disposed" }), { type: "asset", q: "UP" })
  assert.equal(disposed[0]?.reason, "MAINTENANCE_ASSET_WRITTEN_OFF")

  const loaned = await searchMaintenanceOptions(fakeDb({ assetStatus: "Checked Out" }), { type: "asset", q: "UP" })
  assert.equal(loaned[0]?.disabled, undefined)

  const open = await searchMaintenanceOptions(fakeDb({ openRecordAssetIds: ["asset-1"] }), { type: "asset", q: "UP" })
  assert.equal(open[0]?.reason, "MAINTENANCE_OPEN_RECORD_EXISTS")
})
```

และใน `fakeDb` เพิ่ม `openRecordAssetIds?: string[]` ใน type ของ `config` แล้วเปลี่ยน `maintenanceTicket: { findMany: async () => [] },` เป็น:

```typescript
    maintenanceTicket: { findMany: async () => (config.openRecordAssetIds ?? []).map((assetId) => ({ assetId })) },
```

- [ ] **Step 8: ลบ service และ test ของ workflow เดิม**

```bash
git rm src/lib/maintenance-ticket-service.ts tests/maintenance-ticket-service.test.ts tests/maintenance-create-claim.test.ts tests/maintenance-ticket-routes.test.ts tests/maintenance-create-routes.test.ts tests/maintenance-cancellation-route-ui.test.ts tests/maintenance-evidence-policy.test.ts
```

ใน `tests/asset-operation-status-policy.test.ts` test `"lifecycle mutation layers call exception policy helpers"` เปลี่ยนแถว `["src/lib/maintenance-ticket-service.ts", /getMaintenanceOperationalTarget/],` เป็น `["src/lib/repair-record-policy.ts", /getMaintenanceOperationalTarget/],`

ตรวจว่าไม่มีใครอ้างไฟล์ที่ลบ: `git grep -n "maintenance-ticket-service" -- src tests` → ต้องไม่มีผล

- [ ] **Step 9: Run tests + tsc**

Run: `node --test tests/repair-record-routes.test.ts tests/maintenance-options.test.ts tests/rbac-route-matrix.test.ts tests/asset-operation-status-policy.test.ts`
Expected: PASS
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0 (ปุ่มเก่าในหน้าจอยังเรียก action เดิมได้ไม่สำเร็จ — หน้าจอถูกแทนใน Task 6–8)

- [ ] **Step 10: Commit**

```bash
git add -A src/app/api/maintenance-tickets src/app/api/attachments src/lib/maintenance-options.ts src/lib/maintenance-ticket-service.ts tests
git commit -m "feat(maintenance): repair record API" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ฟอร์ม "บันทึกซ่อม"

**Files:**
- Create: `src/components/maintenance/repair-record-form.tsx`
- Create: `src/components/maintenance/repair-record-upload.ts`
- Modify: `src/components/maintenance/maintenance-option-select.tsx` (prop `formatReason`)
- Modify: `src/app/[locale]/(dashboard)/maintenance/new/page.tsx`
- Modify: `messages/th.json`, `messages/en.json` (namespace ใหม่ `repairRecord`)
- Modify: `tests/maintenance-i18n.test.ts` (รายชื่อไฟล์)
- Delete: `src/components/maintenance/maintenance-ticket-form.tsx`
- Test: `tests/repair-record-ui.test.ts`

**Interfaces:**
- Consumes: Task 5 HTTP API · `MaintenanceOptionSelect` · `getMaintenanceErrorMessage(code, t, fallback)` · `toLocalDateInputValue()` · `appendOperationalReturnTo(href, returnTo)` / `normalizeOperationalReturnTo(locale, "maintenance", value)`
- Produces:
  - `RepairRecordForm({ locale, returnTo, initialAsset?, plan?, needsReporter })` โดย `plan = { id; label; title; vendor: { id; label } | null }`
  - `uploadRepairFiles(recordId: string, files: File[], imageType: "before_repair" | "after_repair"): Promise<number>` (คืนจำนวนไฟล์ที่ล้มเหลว)
  - หน้า `/[locale]/maintenance/new?assetId=…&planId=…&returnTo=…`
  - `MaintenanceOptionSelect` รับ `formatReason?: (reason: string) => string`

- [ ] **Step 1: Write the failing test** — `tests/repair-record-ui.test.ts`

```typescript
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort()
}

test("Thai and English repair record copy has matching keys", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.ok(th.repairRecord, "messages/th.json needs a repairRecord namespace")
  assert.deepEqual(leafKeys(th.repairRecord), leafKeys(en.repairRecord))
})

test("the repair form sends one record with a done flag and a local default date", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(source, /fetch\("\/api\/maintenance-tickets"/)
  assert.match(source, /done: values\.done/)
  assert.match(source, /toLocalDateInputValue\(\)/)
  assert.doesNotMatch(source, /toISOString\(\)\.slice\(0, 10\)/)
  assert.doesNotMatch(source, /assignedToId|dueDate|laborCost|partsCost|warrantyClaim/)
})

test("the repair form localizes API error codes and links to an unfinished record", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(source, /getMaintenanceErrorMessage\(payload\?\.code, tMaintenance/)
  assert.match(source, /MAINTENANCE_OPEN_RECORD_EXISTS/)
  assert.match(source, /status=in_progress/)
})

test("files picked in the form upload after the record is saved", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  const upload = readFileSync("src/components/maintenance/repair-record-upload.ts", "utf8")
  assert.match(source, /uploadRepairFiles\(payload\.id, files/)
  assert.match(upload, /\/api\/maintenance-tickets\/\$\{recordId\}\/attachments/)
})

test("the reporter picker appears only for accounts without an employee", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/new/page.tsx", "utf8")
  const form = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(page, /needsReporter=\{!user\.employeeId\}/)
  assert.match(form, /needsReporter \?/)
})

test("recording PM from a plan pre-fills the plan and its asset", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/new/page.tsx", "utf8")
  assert.match(page, /planId/)
  assert.match(page, /planState: "active"/)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/repair-record-ui.test.ts`
Expected: FAIL — `messages/th.json needs a repairRecord namespace`

- [ ] **Step 3: เพิ่ม namespace `repairRecord`** — เพิ่ม key ระดับบนสุด `"repairRecord"` ใน `messages/th.json` และ `messages/en.json` (วางต่อจาก `"maintenancePage"`) ตามนี้ · Task 7 และ 8 จะเพิ่ม key ในก้อนเดียวกันนี้

`messages/th.json`:

```json
"repairRecord": {
  "title": "ซ่อมบำรุง",
  "createTitle": "บันทึกซ่อม",
  "createSubtitle": "บันทึกว่าซ่อมอะไร เมื่อไหร่ และผลเป็นอย่างไร",
  "pmCreateSubtitle": "บันทึกว่าทำ PM ตามแผนแล้ว ระบบจะเลื่อนกำหนดครั้งถัดไปให้",
  "planLabel": "แผน PM",
  "asset": "ทรัพย์สิน",
  "selectAsset": "ค้นหารหัสหรือชื่อทรัพย์สิน",
  "date": "วันที่",
  "problem": "อาการ / สิ่งที่ซ่อม",
  "problemPlaceholder": "เช่น จอไม่ติด เปลี่ยนสายแพรจอ",
  "doneQuestion": "ซ่อมเสร็จหรือยัง",
  "doneYes": "ซ่อมเสร็จแล้ว",
  "doneNo": "ยังซ่อมไม่เสร็จ (ส่งซ่อม / รออะไหล่)",
  "outcomeQuestion": "ผลการซ่อม",
  "outcome": {
    "usable": "ใช้งานได้",
    "beyond_repair": "ซ่อมไม่ได้ เสนอจำหน่าย",
    "unknown": "ไม่ระบุ"
  },
  "assetStatusEffect": {
    "toMaintenance": "ทรัพย์สินจะเปลี่ยนเป็น \"อยู่ระหว่างซ่อม\" จนกว่าจะกดซ่อมเสร็จ",
    "toDisposal": "ทรัพย์สินจะเปลี่ยนเป็น \"รอตัดจำหน่าย\""
  },
  "openExistingRecord": "เปิดบันทึกที่ยังไม่เสร็จ",
  "reporter": "ผู้บันทึก",
  "selectReporter": "เลือกพนักงานผู้บันทึก",
  "reporterHelp": "บัญชีนี้ไม่ได้ผูกกับพนักงาน จึงต้องเลือกผู้บันทึก",
  "moreDetails": "รายละเอียดเพิ่มเติม (ไม่บังคับ)",
  "vendor": "ร้าน / ผู้ซ่อมภายนอก",
  "vendorPlaceholder": "ช่างภายใน (ไม่เลือกร้าน)",
  "internal": "ช่างภายใน",
  "cost": "ค่าใช้จ่ายรวม (บาท)",
  "invoiceNo": "เลขใบเสร็จ / ใบกำกับภาษี",
  "files": "รูปหรือใบเสร็จ",
  "filesHelp": "เลือกได้หลายไฟล์ ระบบจะอัปโหลดหลังบันทึก",
  "remark": "หมายเหตุ",
  "save": "บันทึก",
  "saved": "บันทึกการซ่อมแล้ว",
  "uploadFailed": "บันทึกแล้ว แต่แนบไฟล์ไม่สำเร็จ {count} ไฟล์ แนบใหม่ได้ที่หน้ารายละเอียด"
}
```

`messages/en.json`:

```json
"repairRecord": {
  "title": "Maintenance",
  "createTitle": "Record a repair",
  "createSubtitle": "Record what was repaired, when, and the result",
  "pmCreateSubtitle": "Record that the planned PM was done; the next due date moves forward automatically",
  "planLabel": "PM plan",
  "asset": "Asset",
  "selectAsset": "Search asset tag or name",
  "date": "Date",
  "problem": "Problem / work done",
  "problemPlaceholder": "e.g. Screen blank, replaced display cable",
  "doneQuestion": "Is the repair finished?",
  "doneYes": "Finished",
  "doneNo": "Not finished (sent out / waiting for parts)",
  "outcomeQuestion": "Result",
  "outcome": {
    "usable": "Usable",
    "beyond_repair": "Beyond repair, propose disposal",
    "unknown": "Not recorded"
  },
  "assetStatusEffect": {
    "toMaintenance": "The asset will be \"Under Maintenance\" until the repair is marked finished",
    "toDisposal": "The asset will change to \"Pending Disposal\""
  },
  "openExistingRecord": "Open the unfinished record",
  "reporter": "Recorded by",
  "selectReporter": "Select the employee recording this",
  "reporterHelp": "This account is not linked to an employee, so choose who is recording",
  "moreDetails": "More details (optional)",
  "vendor": "Repair shop / vendor",
  "vendorPlaceholder": "In-house (no vendor)",
  "internal": "In-house",
  "cost": "Total cost (THB)",
  "invoiceNo": "Receipt / tax invoice no.",
  "files": "Photos or receipts",
  "filesHelp": "You can pick several files; they upload after saving",
  "remark": "Remark",
  "save": "Save",
  "saved": "Repair recorded",
  "uploadFailed": "Saved, but {count} file(s) failed to upload. Attach them again on the detail page"
}
```

- [ ] **Step 4: `formatReason` ใน `src/components/maintenance/maintenance-option-select.tsx`**

เพิ่ม prop ในทั้ง destructuring และ type: `formatReason,` / `formatReason?: (reason: string) => string` · ใน `useMemo` ของ `displayOptions` เปลี่ยนบรรทัด label เป็น:

```typescript
      label: option.reason ? `${option.label} — ${formatReason ? formatReason(option.reason) : option.reason}` : option.label,
```

และเพิ่ม `formatReason` ใน dependency array ของ `useMemo` นั้น

- [ ] **Step 5: `src/components/maintenance/repair-record-upload.ts`**

```typescript
// Uploads one file at a time and returns how many failed, so a saved record is never lost
// because of a bad file and the user can attach the failed ones again.
export async function uploadRepairFiles(
  recordId: string,
  files: File[],
  imageType: "before_repair" | "after_repair",
) {
  let failed = 0
  for (const file of files) {
    const body = new FormData()
    body.append("file", file)
    body.append("attachmentType", file.type.startsWith("image/") ? imageType : "invoice")
    try {
      const response = await fetch(`/api/maintenance-tickets/${recordId}/attachments`, { method: "POST", body })
      if (!response.ok) failed += 1
    } catch {
      failed += 1
    }
  }
  return failed
}
```

- [ ] **Step 6: `src/components/maintenance/repair-record-form.tsx`**

```tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ChevronDown, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"

const inputClass = "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const textareaClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"

export function RepairRecordForm({
  locale,
  returnTo,
  initialAsset,
  plan,
  needsReporter,
}: {
  locale: string
  returnTo: string
  initialAsset?: Option
  plan?: { id: string; label: string; title: string; vendor: Option | null }
  needsReporter: boolean
}) {
  const router = useRouter()
  const t = useTranslations("repairRecord")
  const tMaintenance = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const [openRecordAssetId, setOpenRecordAssetId] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(Boolean(plan?.vendor))
  const [files, setFiles] = useState<File[]>([])
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
    reportedDate: toLocalDateInputValue(),
    problem: plan?.title ?? "",
    done: true,
    outcome: "usable" as Outcome,
    reportedById: "",
    vendorId: plan?.vendor?.id ?? "",
    repairCost: "",
    invoiceNo: "",
    remark: "",
  })
  const effectKey = !values.done ? "toMaintenance" : values.outcome === "beyond_repair" ? "toDisposal" : null

  function setField<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setOpenRecordAssetId(null)
    try {
      const response = await fetch("/api/maintenance-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: values.assetId,
          maintenancePlanId: plan?.id ?? null,
          problem: values.problem,
          reportedDate: values.reportedDate,
          done: values.done,
          outcome: values.outcome,
          reportedById: needsReporter ? values.reportedById || null : null,
          vendorId: values.vendorId || null,
          repairCost: values.repairCost || null,
          invoiceNo: values.invoiceNo || null,
          remark: values.remark || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        if (payload?.code === "MAINTENANCE_OPEN_RECORD_EXISTS") setOpenRecordAssetId(values.assetId)
        throw new Error(getMaintenanceErrorMessage(payload?.code, tMaintenance, tCommon("error")))
      }
      const failed = await uploadRepairFiles(payload.id, files, values.done ? "after_repair" : "before_repair")
      if (failed > 0) toast.warning(t("uploadFailed", { count: failed }))
      else toast.success(t("saved"))
      router.push(appendOperationalReturnTo(`/${locale}/maintenance/${payload.id}`, returnTo))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {plan ? <FormContextBanner label={t("planLabel")} value={plan.label} /> : null}
        <MaintenanceOptionSelect
          type="asset"
          label={t("asset")}
          value={values.assetId}
          required
          disabled={Boolean(plan)}
          initialOption={initialAsset}
          placeholder={t("selectAsset")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          loadingLabel={tCommon("loading")}
          formatReason={(code) => getMaintenanceErrorMessage(code, tMaintenance, code)}
          onChange={(value) => setField("assetId", value)}
        />
        {openRecordAssetId ? (
          <p role="alert" className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning-foreground">
            {tMaintenance("errors.MAINTENANCE_OPEN_RECORD_EXISTS")}{" "}
            <Link
              href={`/${locale}/maintenance?assetId=${encodeURIComponent(openRecordAssetId)}&status=in_progress`}
              className="font-medium underline underline-offset-2"
            >
              {t("openExistingRecord")}
            </Link>
          </p>
        ) : null}
        <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_1fr]">
          <Field label={t("date")} required>
            <input type="date" required value={values.reportedDate} onChange={(event) => setField("reportedDate", event.target.value)} className={inputClass} />
          </Field>
          <Field label={t("problem")} required>
            <textarea
              required
              rows={3}
              maxLength={4000}
              value={values.problem}
              placeholder={t("problemPlaceholder")}
              onChange={(event) => setField("problem", event.target.value)}
              className={`min-h-24 ${textareaClass}`}
            />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">
            {t("doneQuestion")}<span className="ml-1 text-danger">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice name="done" checked={values.done} label={t("doneYes")} onSelect={() => setField("done", true)} />
            <Choice name="done" checked={!values.done} label={t("doneNo")} onSelect={() => setField("done", false)} />
          </div>
        </fieldset>
        {values.done ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">
              {t("outcomeQuestion")}<span className="ml-1 text-danger">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice name="outcome" checked={values.outcome === "usable"} label={t("outcome.usable")} onSelect={() => setField("outcome", "usable")} />
              <Choice name="outcome" checked={values.outcome === "beyond_repair"} label={t("outcome.beyond_repair")} onSelect={() => setField("outcome", "beyond_repair")} />
            </div>
          </fieldset>
        ) : null}
        {effectKey ? (
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning-foreground">
            {t(`assetStatusEffect.${effectKey}`)}
          </p>
        ) : null}
        {needsReporter ? (
          <div>
            <MaintenanceOptionSelect
              type="employee"
              label={t("reporter")}
              value={values.reportedById}
              required
              placeholder={t("selectReporter")}
              searchPlaceholder={tCommon("searchSelectPlaceholder")}
              emptyLabel={tCommon("searchSelectNoResults")}
              loadingLabel={tCommon("loading")}
              onChange={(value) => setField("reportedById", value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("reporterHelp")}</p>
          </div>
        ) : null}
        <div className="rounded-md border border-border">
          <button
            type="button"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("moreDetails")}
            <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails ? (
            <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
              <MaintenanceOptionSelect
                type="supplier"
                label={t("vendor")}
                value={values.vendorId}
                initialOption={plan?.vendor ?? undefined}
                placeholder={t("vendorPlaceholder")}
                searchPlaceholder={tCommon("searchSelectPlaceholder")}
                emptyLabel={tCommon("searchSelectNoResults")}
                loadingLabel={tCommon("loading")}
                onChange={(value) => setField("vendorId", value)}
              />
              <Field label={t("cost")}>
                <input type="number" min="0" step="0.01" inputMode="decimal" value={values.repairCost} onChange={(event) => setField("repairCost", event.target.value)} className={inputClass} />
              </Field>
              <Field label={t("invoiceNo")}>
                <input maxLength={100} value={values.invoiceNo} onChange={(event) => setField("invoiceNo", event.target.value)} className={inputClass} />
              </Field>
              <Field label={t("files")}>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                  className="block min-h-11 w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:text-sm"
                />
                <span className="mt-1 block text-xs text-muted-foreground">{t("filesHelp")}</span>
              </Field>
              <div className="md:col-span-2">
                <Field label={t("remark")}>
                  <textarea rows={2} maxLength={4000} value={values.remark} onChange={(event) => setField("remark", event.target.value)} className={textareaClass} />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("save")}
          </button>
        </div>
      </form>
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function Choice({ name, checked, label, onSelect }: { name: string; checked: boolean; label: string; onSelect: () => void }) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
        checked ? "border-primary bg-primary/5 font-medium text-foreground" : "border-border text-muted-foreground hover:bg-accent"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="h-4 w-4 accent-primary" />
      {label}
    </label>
  )
}
```

- [ ] **Step 7: แทนที่ `src/app/[locale]/(dashboard)/maintenance/new/page.tsx` ทั้งไฟล์**

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { RepairRecordForm } from "@/components/maintenance/repair-record-form"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { prisma } from "@/lib/db"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { requirePagePermission } from "@/lib/page-auth"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ assetId?: string; planId?: string; returnTo?: string | string[] }>
}

export default async function NewRepairRecordPage({ params, searchParams }: Props) {
  const { locale } = await params
  const query = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "create")
  const t = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const returnTo = normalizeOperationalReturnTo(locale, "maintenance", query.returnTo)
  const plan = query.planId
    ? await prisma.maintenancePlan.findFirst({
        where: { id: query.planId, isActive: true, planState: "active" },
        select: { id: true, planNo: true, title: true, assetId: true, vendor: { select: { id: true, code: true, name: true } } },
      })
    : null
  const assetId = plan?.assetId ?? query.assetId
  const asset = assetId
    ? await prisma.asset.findFirst({
        where: { id: assetId, isActive: true },
        select: { id: true, assetTag: true, name: true, status: { select: { nameTh: true } } },
      })
    : null
  const initialAsset = asset ? { id: asset.id, label: `${asset.assetTag} - ${asset.name} (${asset.status.nameTh})` } : undefined
  const planOption = plan
    ? {
        id: plan.id,
        label: `${plan.planNo} - ${plan.title}`,
        title: plan.title,
        vendor: plan.vendor ? { id: plan.vendor.id, label: `${plan.vendor.code} - ${plan.vendor.name}` } : null,
      }
    : undefined

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("title"), href: returnTo }, { label: t("createTitle") }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{plan ? t("pmCreateSubtitle") : t("createSubtitle")}</p>
        </div>
        <Link href={returnTo} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
          {tCommon("cancel")}
        </Link>
      </div>
      <RepairRecordForm
        locale={locale}
        returnTo={returnTo}
        initialAsset={initialAsset}
        plan={planOption}
        needsReporter={!user.employeeId}
      />
    </div>
  )
}
```

- [ ] **Step 8: ลบฟอร์มเดิมและแก้รายชื่อไฟล์ใน `tests/maintenance-i18n.test.ts`**

```bash
git rm src/components/maintenance/maintenance-ticket-form.tsx
```

ใน `tests/maintenance-i18n.test.ts` test `"maintenance clients localize stable error codes instead of exposing raw API text"` แทนบรรทัด `"src/components/maintenance/maintenance-ticket-form.tsx",` ด้วย `"src/components/maintenance/repair-record-form.tsx",`

ใน `tests/maintenance-option-select.test.ts` test `"maintenance forms use bounded option selects instead of embedded option arrays"` แทน `readFileSync("src/components/maintenance/maintenance-ticket-form.tsx", "utf8"),` ด้วย `readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8"),`

- [ ] **Step 9: Run tests + tsc**

Run: `node --test tests/repair-record-ui.test.ts tests/maintenance-i18n.test.ts tests/maintenance-option-select.test.ts`
Expected: PASS
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0

- [ ] **Step 10: Commit**

```bash
git add -A src/components/maintenance "src/app/[locale]/(dashboard)/maintenance/new/page.tsx" messages/th.json messages/en.json tests/repair-record-ui.test.ts tests/maintenance-i18n.test.ts tests/maintenance-option-select.test.ts
git commit -m "feat(maintenance): one-form repair record page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: หน้ารายละเอียด · ซ่อมเสร็จ / ยกเลิก / แก้ไข · หน้าพิมพ์

**Files:**
- Create: `src/components/maintenance/repair-record-actions.tsx`
- Modify (เขียนใหม่ทั้งไฟล์): `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- Modify (เขียนใหม่ทั้งไฟล์): `src/app/[locale]/(print)/maintenance/[id]/print/page.tsx`
- Modify: `messages/th.json`, `messages/en.json` (เพิ่ม key ใน `repairRecord`)
- Modify: `tests/maintenance-attachments-ui.test.ts`
- Test: `tests/repair-record-detail-ui.test.ts`

**Interfaces:**
- Consumes: Task 5 PATCH (`complete` / `cancel` / `update`) · Task 6 `uploadRepairFiles` · Task 2 `getRepairRecordStatusTone`, `toRepairRecordStatus`, `isOpenRepairStatus`, `canAttachToRepairRecord` · `MaintenanceAttachments({ ticketId, attachments, canEdit, canDelete })` · `AccessibleDialog`
- Produces: `RepairRecordActions({ recordId, repairNo, expectedUpdatedAt, isOpen, details })` โดย `details = { reportedDate: string /* YYYY-MM-DD */; problem: string; vendor: { id: string; label: string } | null; repairCost: string; invoiceNo: string; remark: string }`

- [ ] **Step 1: Write the failing test** — `tests/repair-record-detail-ui.test.ts`

```typescript
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const detailPath = "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx"
const actionsPath = "src/components/maintenance/repair-record-actions.tsx"
const printPath = "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx"

test("an unfinished record offers one finish action and a confirmed cancel", () => {
  const source = readFileSync(actionsPath, "utf8")
  assert.match(source, /action: "complete"/)
  assert.match(source, /action: "cancel"/)
  assert.match(source, /AccessibleDialog/)
  assert.match(source, /expectedUpdatedAt/)
  assert.match(source, /toLocalDateInputValue\(\)/)
  assert.match(source, /isOpen \?/)
})

test("editing changes details only, never status or result", () => {
  const source = readFileSync(actionsPath, "utf8")
  const updateBody = source.slice(source.indexOf('action: "update"'), source.indexOf('action: "update"') + 400)
  assert.doesNotMatch(updateBody, /outcome|repairStatus/)
})

test("the detail page drops the old workflow controls", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /RepairRecordActions/)
  assert.doesNotMatch(source, /MaintenanceTicket(Close|Status|Planning|Cancel)Button/)
  assert.doesNotMatch(source, /closeChecklist|isMaintenanceOverdue/)
  assert.match(source, /getRepairRecordStatusTone/)
})

test("old workflow values stay visible on old records only", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /hasLegacyDetails/)
  assert.match(source, /legacyFields/)
})

test("recorders can attach files to their own records from the detail page", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /canAttachToRepairRecord\(/)
  assert.match(source, /canEdit=\{canAttach\}/)
})

test("the printout uses the repair record fields", () => {
  const source = readFileSync(printPath, "utf8")
  assert.match(source, /tRecord\("outcomeQuestion"\)/)
  assert.doesNotMatch(source, /assignedTo|dueDate|laborCost|inspectedBy/)
})

test("old workflow buttons are gone", () => {
  for (const file of ["maintenance-ticket-close-button", "maintenance-ticket-status-button", "maintenance-ticket-planning-button", "maintenance-ticket-cancel-button"]) {
    assert.equal(existsSync(`src/components/maintenance/${file}.tsx`), false, file)
  }
})
```

หมายเหตุ: test สุดท้ายจะผ่านหลัง Task 9 ลบปุ่ม (ปุ่มยังถูกหน้ารายการเดิมใช้อยู่) — ใน task นี้ให้ใส่ `{ skip: "removed with the list page in Task 9" }` เป็น argument ที่สองของ `test(...)` นั้น แล้ว Task 9 Step 9 เอา skip ออก

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/repair-record-detail-ui.test.ts`
Expected: FAIL — `ENOENT ... repair-record-actions.tsx`

- [ ] **Step 3: เพิ่ม key ใน `repairRecord`** (ทั้งสองไฟล์ ต่อท้าย object เดิม)

`messages/th.json`:

```json
"status": {
  "in_progress": "ยังซ่อมไม่เสร็จ",
  "closed": "ซ่อมเสร็จแล้ว",
  "cancelled": "ยกเลิก"
},
"repairNo": "เลขที่บันทึก",
"statusLabel": "สถานะ",
"detailTitle": "รายละเอียดการซ่อม",
"returnDate": "วันที่ซ่อมเสร็จ",
"remarkTitle": "หมายเหตุ",
"complete": "ซ่อมเสร็จ",
"completeTitle": "บันทึกว่าซ่อมเสร็จ",
"completeHelp": "ทรัพย์สินจะกลับเป็นสถานะตามผู้ถือครอง หรือรอตัดจำหน่ายถ้าซ่อมไม่ได้",
"completed": "บันทึกว่าซ่อมเสร็จแล้ว",
"cancel": "ยกเลิกบันทึก",
"cancelTitle": "ยกเลิกบันทึกนี้?",
"cancelHelp": "ใช้เมื่อบันทึกผิด ประวัติยังเก็บไว้ และทรัพย์สินจะกลับเป็นสถานะตามผู้ถือครอง",
"cancelReason": "เหตุผล (ไม่บังคับ)",
"confirmCancel": "ยืนยันยกเลิก",
"keep": "ไม่ยกเลิก",
"cancelled": "ยกเลิกบันทึกแล้ว",
"edit": "แก้ไขรายละเอียด",
"editTitle": "แก้ไขรายละเอียดการซ่อม",
"editHelp": "เปลี่ยนสถานะหรือผลการซ่อมที่นี่ไม่ได้ ถ้าผลผิด ให้แก้สถานะทรัพย์สินด้วย Status Correction แล้วระบุในหมายเหตุ",
"updated": "แก้ไขรายละเอียดแล้ว",
"legacyTitle": "ข้อมูลจากขั้นตอนเดิม",
"legacyFields": {
  "assignedTo": "ผู้รับผิดชอบ",
  "dueDate": "กำหนดเสร็จ",
  "laborCost": "ค่าแรง",
  "partsCost": "ค่าอะไหล่",
  "quotationNo": "เลขใบเสนอราคา",
  "warrantyClaim": "เคลมประกัน",
  "rootCause": "สาเหตุ",
  "inspectedBy": "ผู้ตรวจรับ"
},
"history": "ประวัติ",
"historyEmpty": "ยังไม่มีประวัติ",
"movement": {
  "create": "บันทึกซ่อม",
  "statusUpdate": "เปลี่ยนสถานะ (ขั้นตอนเดิม)",
  "close": "ซ่อมเสร็จ",
  "cancel": "ยกเลิกบันทึก",
  "pmCreate": "สร้างจากแผน PM (ขั้นตอนเดิม)",
  "fallback": "รายการอื่น"
},
"fromValue": "จาก",
"toValue": "เป็น",
"assetSection": "ทรัพย์สิน",
"currentStatus": "สถานะปัจจุบัน",
"custodian": "ผู้ถือครอง",
"location": "ที่ตั้ง",
"openAsset": "เปิดหน้าทรัพย์สิน",
"print": "พิมพ์",
"printTitle": "บันทึกการซ่อม",
"signatureRecorder": "ผู้บันทึก",
"signatureReceiver": "ผู้รับคืน",
"signatureDate": "วันที่ ____/____/______",
"disposalReviewTitle": "ควรพิจารณาจำหน่าย",
"disposalReviewCount": "ซ่อมแล้ว {count} ครั้ง",
"disposalReviewCost": "ค่าซ่อมรวม {cost}",
"disposalReviewRatio": "คิดเป็น {percent}% ของราคาซื้อ",
"openDisposalRequest": "ขอจำหน่าย"
```

`messages/en.json`:

```json
"status": {
  "in_progress": "In progress",
  "closed": "Finished",
  "cancelled": "Cancelled"
},
"repairNo": "Record no.",
"statusLabel": "Status",
"detailTitle": "Repair details",
"returnDate": "Finished on",
"remarkTitle": "Remark",
"complete": "Repair finished",
"completeTitle": "Mark the repair as finished",
"completeHelp": "The asset returns to its custody status, or Pending Disposal if it is beyond repair",
"completed": "Marked as finished",
"cancel": "Cancel record",
"cancelTitle": "Cancel this record?",
"cancelHelp": "Use this for a record made by mistake. History is kept and the asset returns to its custody status",
"cancelReason": "Reason (optional)",
"confirmCancel": "Cancel record",
"keep": "Keep record",
"cancelled": "Record cancelled",
"edit": "Edit details",
"editTitle": "Edit repair details",
"editHelp": "Status and result can't be changed here. If the result was wrong, fix the asset status with Status Correction and note it in the remark",
"updated": "Details updated",
"legacyTitle": "From the previous workflow",
"legacyFields": {
  "assignedTo": "Assignee",
  "dueDate": "Due date",
  "laborCost": "Labor cost",
  "partsCost": "Parts cost",
  "quotationNo": "Quotation no.",
  "warrantyClaim": "Warranty claim",
  "rootCause": "Root cause",
  "inspectedBy": "Inspected by"
},
"history": "History",
"historyEmpty": "No history yet",
"movement": {
  "create": "Repair recorded",
  "statusUpdate": "Status changed (previous workflow)",
  "close": "Repair finished",
  "cancel": "Record cancelled",
  "pmCreate": "Created from PM plan (previous workflow)",
  "fallback": "Other activity"
},
"fromValue": "From",
"toValue": "To",
"assetSection": "Asset",
"currentStatus": "Current status",
"custodian": "Custodian",
"location": "Location",
"openAsset": "Open asset",
"print": "Print",
"printTitle": "Repair record",
"signatureRecorder": "Recorded by",
"signatureReceiver": "Received by",
"signatureDate": "Date ____/____/______",
"disposalReviewTitle": "Consider disposal",
"disposalReviewCount": "Repaired {count} times",
"disposalReviewCost": "Total repair cost {cost}",
"disposalReviewRatio": "{percent}% of the purchase price",
"openDisposalRequest": "Request disposal"
```

- [ ] **Step 4: `src/components/maintenance/repair-record-actions.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, Pencil, XCircle } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { MaintenanceOptionSelect } from "@/components/maintenance/maintenance-option-select"
import { uploadRepairFiles } from "@/components/maintenance/repair-record-upload"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import { toLocalDateInputValue } from "@/lib/local-date"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"
type Dialog = "complete" | "cancel" | "edit" | null

const inputClass = "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const textareaClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"

export function RepairRecordActions({
  recordId,
  repairNo,
  expectedUpdatedAt,
  isOpen,
  details,
}: {
  recordId: string
  repairNo: string
  expectedUpdatedAt: string
  isOpen: boolean
  details: { reportedDate: string; problem: string; vendor: Option | null; repairCost: string; invoiceNo: string; remark: string }
}) {
  const router = useRouter()
  const t = useTranslations("repairRecord")
  const tMaintenance = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [dialog, setDialog] = useState<Dialog>(null)
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [complete, setComplete] = useState({
    returnDate: toLocalDateInputValue(),
    outcome: "usable" as Outcome,
    vendorId: details.vendor?.id ?? "",
    repairCost: details.repairCost,
    invoiceNo: details.invoiceNo,
    remark: "",
  })
  const [reason, setReason] = useState("")
  const [edit, setEdit] = useState({
    reportedDate: details.reportedDate,
    problem: details.problem,
    vendorId: details.vendor?.id ?? "",
    repairCost: details.repairCost,
    invoiceNo: details.invoiceNo,
    remark: details.remark,
  })

  function close() {
    if (saving) return
    setDialog(null)
    setFiles([])
  }

  async function send(body: Record<string, unknown>, successKey: "completed" | "cancelled" | "updated") {
    setSaving(true)
    try {
      const response = await fetch(`/api/maintenance-tickets/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, expectedUpdatedAt }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, tMaintenance, tCommon("error")))
      const failed = files.length > 0 ? await uploadRepairFiles(recordId, files, "after_repair") : 0
      if (failed > 0) toast.warning(t("uploadFailed", { count: failed }))
      else toast.success(t(successKey))
      setDialog(null)
      setFiles([])
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {isOpen ? (
        <>
          <button type="button" onClick={() => setDialog("complete")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <CheckCircle2 className="h-4 w-4" />{t("complete")}
          </button>
          <button type="button" onClick={() => setDialog("cancel")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger/40 bg-surface px-4 text-sm font-medium text-danger hover:bg-danger/10">
            <XCircle className="h-4 w-4" />{t("cancel")}
          </button>
        </>
      ) : null}
      <button type="button" onClick={() => setDialog("edit")} className={secondaryButton}>
        <Pencil className="h-4 w-4" />{t("edit")}
      </button>

      <AccessibleDialog open={dialog === "complete"} title={t("completeTitle")} description={repairNo} busy={saving} onClose={close}>
        <form
          className="space-y-4 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void send({
              action: "complete",
              returnDate: complete.returnDate,
              outcome: complete.outcome,
              vendorId: complete.vendorId || null,
              repairCost: complete.repairCost || null,
              invoiceNo: complete.invoiceNo || null,
              remark: complete.remark || null,
            }, "completed")
          }}
        >
          <p className="text-sm text-muted-foreground">{t("completeHelp")}</p>
          <Field label={t("returnDate")} required>
            <input type="date" required value={complete.returnDate} onChange={(event) => setComplete((v) => ({ ...v, returnDate: event.target.value }))} className={inputClass} />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">{t("outcomeQuestion")}<span className="ml-1 text-danger">*</span></legend>
            <div className="grid gap-2">
              {(["usable", "beyond_repair"] as const).map((outcome) => (
                <label key={outcome} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm ${complete.outcome === outcome ? "border-primary bg-primary/5 font-medium" : "border-border text-muted-foreground"}`}>
                  <input type="radio" name="outcome" checked={complete.outcome === outcome} onChange={() => setComplete((v) => ({ ...v, outcome }))} className="h-4 w-4 accent-primary" />
                  {t(`outcome.${outcome}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <MaintenanceOptionSelect type="supplier" label={t("vendor")} value={complete.vendorId} initialOption={details.vendor ?? undefined} placeholder={t("vendorPlaceholder")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setComplete((v) => ({ ...v, vendorId: value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("cost")}>
              <input type="number" min="0" step="0.01" inputMode="decimal" value={complete.repairCost} onChange={(event) => setComplete((v) => ({ ...v, repairCost: event.target.value }))} className={inputClass} />
            </Field>
            <Field label={t("invoiceNo")}>
              <input maxLength={100} value={complete.invoiceNo} onChange={(event) => setComplete((v) => ({ ...v, invoiceNo: event.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label={t("files")}>
            <input type="file" multiple accept="image/*,application/pdf" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="block min-h-11 w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:text-sm" />
          </Field>
          <Field label={t("remark")}>
            <textarea rows={2} maxLength={4000} value={complete.remark} onChange={(event) => setComplete((v) => ({ ...v, remark: event.target.value }))} className={textareaClass} />
          </Field>
          <DialogButtons saving={saving} onBack={close} backLabel={tCommon("back")} submitLabel={t("complete")} />
        </form>
      </AccessibleDialog>

      <AccessibleDialog open={dialog === "cancel"} title={t("cancelTitle")} description={repairNo} busy={saving} onClose={close}>
        <form
          className="space-y-4 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void send({ action: "cancel", reason: reason.trim() || null }, "cancelled")
          }}
        >
          <p className="text-sm text-muted-foreground">{t("cancelHelp")}</p>
          <Field label={t("cancelReason")}>
            <textarea rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className={textareaClass} />
          </Field>
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button type="button" onClick={close} disabled={saving} className={secondaryButton}>{t("keep")}</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}{t("confirmCancel")}
            </button>
          </div>
        </form>
      </AccessibleDialog>

      <AccessibleDialog open={dialog === "edit"} title={t("editTitle")} description={repairNo} busy={saving} onClose={close}>
        <form
          className="space-y-4 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void send({
              action: "update",
              reportedDate: edit.reportedDate,
              problem: edit.problem,
              vendorId: edit.vendorId || null,
              repairCost: edit.repairCost || null,
              invoiceNo: edit.invoiceNo || null,
              remark: edit.remark || null,
            }, "updated")
          }}
        >
          <p className="text-sm text-muted-foreground">{t("editHelp")}</p>
          <Field label={t("date")} required>
            <input type="date" required value={edit.reportedDate} onChange={(event) => setEdit((v) => ({ ...v, reportedDate: event.target.value }))} className={inputClass} />
          </Field>
          <Field label={t("problem")} required>
            <textarea required rows={3} maxLength={4000} value={edit.problem} onChange={(event) => setEdit((v) => ({ ...v, problem: event.target.value }))} className={textareaClass} />
          </Field>
          <MaintenanceOptionSelect type="supplier" label={t("vendor")} value={edit.vendorId} initialOption={details.vendor ?? undefined} placeholder={t("vendorPlaceholder")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setEdit((v) => ({ ...v, vendorId: value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("cost")}>
              <input type="number" min="0" step="0.01" inputMode="decimal" value={edit.repairCost} onChange={(event) => setEdit((v) => ({ ...v, repairCost: event.target.value }))} className={inputClass} />
            </Field>
            <Field label={t("invoiceNo")}>
              <input maxLength={100} value={edit.invoiceNo} onChange={(event) => setEdit((v) => ({ ...v, invoiceNo: event.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label={t("remark")}>
            <textarea rows={2} maxLength={4000} value={edit.remark} onChange={(event) => setEdit((v) => ({ ...v, remark: event.target.value }))} className={textareaClass} />
          </Field>
          <DialogButtons saving={saving} onBack={close} backLabel={tCommon("back")} submitLabel={tCommon("save")} />
        </form>
      </AccessibleDialog>
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function DialogButtons({ saving, onBack, backLabel, submitLabel }: { saving: boolean; onBack: () => void; backLabel: string; submitLabel: string }) {
  return (
    <div className="flex flex-col justify-end gap-2 sm:flex-row">
      <button type="button" onClick={onBack} disabled={saving} className={secondaryButton}>{backLabel}</button>
      <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{submitLabel}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: เขียน `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx` ใหม่ทั้งไฟล์**

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, FileText, History, Printer, Trash2, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { toLocalDateInputValue } from "@/lib/local-date"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { RepairRecordActions } from "@/components/maintenance/repair-record-actions"
import { getMaintenanceMovementLabel, getMovementDisplayLabels } from "@/lib/movement-labels"
import { canAttachToRepairRecord, getRepairRecordStatusTone, isOpenRepairStatus, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"

type RepairRecordPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function RepairRecordPage({ params, searchParams }: RepairRecordPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canCreateDisposal = hasPermission(user, "disposal", "create")
  const t = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")

  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          purchasePrice: true,
          status: { select: { nameTh: true } },
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
        },
      },
      reportedBy: { select: { code: true, fullNameTh: true } },
      assignedTo: { select: { code: true, fullNameTh: true } },
      inspectedBy: { select: { code: true, fullNameTh: true } },
      vendor: { select: { id: true, code: true, name: true } },
      maintenancePlan: { select: { planNo: true, title: true } },
    },
  })
  if (!ticket) notFound()

  const [attachments, movements, assetRepairSummary] = await Promise.all([
    prisma.attachment.findMany({
      where: { module: "maintenance", referenceId: ticket.id, isActive: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.assetMovement.findMany({
      where: { referenceType: "maintenance", referenceId: ticket.id },
      orderBy: { performedAt: "desc" },
    }),
    prisma.maintenanceTicket.aggregate({
      where: { assetId: ticket.asset.id, isActive: true, repairStatus: { not: "cancelled" } },
      _count: { _all: true },
      _sum: { repairCost: true },
    }),
  ])
  const movementLabels = await getMovementDisplayLabels(movements)
  const recordStatus = toRepairRecordStatus(ticket.repairStatus)
  const isOpen = isOpenRepairStatus(ticket.repairStatus)
  const canAttach = canAttachToRepairRecord({ userId: user.id, canEdit, canCreate }, ticket)
  const outcomeLabel = ticket.outcome === "usable" || ticket.outcome === "beyond_repair"
    ? t(`outcome.${ticket.outcome}`)
    : recordStatus === "closed" ? t("outcome.unknown") : null
  const legacyFields = [
    { label: t("legacyFields.assignedTo"), value: ticket.assignedTo ? `${ticket.assignedTo.code} - ${ticket.assignedTo.fullNameTh}` : null },
    { label: t("legacyFields.dueDate"), value: ticket.dueDate ? formatDate(ticket.dueDate) : null },
    { label: t("legacyFields.laborCost"), value: ticket.laborCost == null ? null : formatCurrency(Number(ticket.laborCost)) },
    { label: t("legacyFields.partsCost"), value: ticket.partsCost == null ? null : formatCurrency(Number(ticket.partsCost)) },
    { label: t("legacyFields.quotationNo"), value: ticket.quotationNo },
    { label: t("legacyFields.warrantyClaim"), value: ticket.warrantyClaim ? tCommon("yes") : null },
    { label: t("legacyFields.rootCause"), value: ticket.rootCause },
    { label: t("legacyFields.inspectedBy"), value: ticket.inspectedBy ? `${ticket.inspectedBy.code} - ${ticket.inspectedBy.fullNameTh}` : null },
  ].filter((field) => Boolean(field.value))
  const hasLegacyDetails = legacyFields.length > 0
  const totalRepairCount = assetRepairSummary._count._all
  const totalRepairCost = Number(assetRepairSummary._sum.repairCost ?? 0)
  const purchasePrice = Number(ticket.asset.purchasePrice ?? 0)
  const repairCostRatio = purchasePrice > 0 ? totalRepairCost / purchasePrice : 0
  const shouldReviewDisposal = totalRepairCount >= 3 || repairCostRatio >= 0.5
  const returnToHref = normalizeOperationalReturnTo(locale, "maintenance", rawSearchParams.returnTo)
  const printHref = appendOperationalReturnTo(`/${locale}/maintenance/${ticket.id}/print`, returnToHref)
  const disposalReason = `${ticket.asset.assetTag} / ${ticket.repairNo}: ${t("disposalReviewCount", { count: totalRepairCount })}, ${t("disposalReviewCost", { cost: formatCurrency(totalRepairCost) })}`
  const disposalRequestHref = appendOperationalReturnTo(
    `/${locale}/disposal/new?assetId=${ticket.asset.id}&reason=${encodeURIComponent(disposalReason)}&sourceType=maintenance&sourceId=${ticket.id}`,
    returnToHref,
  )

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs items={[{ label: t("title"), href: returnToHref }, { label: ticket.repairNo }]} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{ticket.repairNo}</h1>
            <StatusBadge label={t(`status.${recordStatus}`)} tone={getRepairRecordStatusTone(ticket.repairStatus)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.asset.assetTag} - {ticket.asset.name}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {canEdit ? (
            <RepairRecordActions
              recordId={ticket.id}
              repairNo={ticket.repairNo}
              expectedUpdatedAt={ticket.updatedAt.toISOString()}
              isOpen={isOpen}
              details={{
                reportedDate: toLocalDateInputValue(ticket.reportedDate),
                problem: ticket.problem,
                vendor: ticket.vendor ? { id: ticket.vendor.id, label: `${ticket.vendor.code} - ${ticket.vendor.name}` } : null,
                repairCost: ticket.repairCost?.toString() ?? "",
                invoiceNo: ticket.invoiceNo ?? "",
                remark: ticket.resolution ?? "",
              }}
            />
          ) : null}
          <Link href={printHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
            <Printer className="h-4 w-4" />{t("print")}
          </Link>
          <Link href={returnToHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
            <Wrench className="h-4 w-4" />{tCommon("back")}
          </Link>
        </div>
      </div>
      <MobileActionBar
        actions={[
          { href: `/${locale}/assets/${ticket.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" />, primary: true },
          { href: printHref, label: t("print"), icon: <Printer className="h-4 w-4" /> },
          { href: "#history", label: t("history"), icon: <History className="h-4 w-4" /> },
          { href: returnToHref, label: tCommon("back"), icon: <Wrench className="h-4 w-4" /> },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-foreground">{t("detailTitle")}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("date")} value={formatDate(ticket.reportedDate)} />
              <Info label={t("outcomeQuestion")} value={outcomeLabel} tone={ticket.outcome === "usable" ? "success" : ticket.outcome === "beyond_repair" ? "warning" : undefined} />
              <Info label={t("returnDate")} value={ticket.returnDate ? formatDate(ticket.returnDate) : null} />
              <Info label={t("vendor")} value={ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : t("internal")} />
              <Info label={t("cost")} value={ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost))} />
              <Info label={t("invoiceNo")} value={ticket.invoiceNo} />
              <Info label={t("reporter")} value={`${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`} />
              {ticket.maintenancePlan ? <Info label={t("planLabel")} value={`${ticket.maintenancePlan.planNo} - ${ticket.maintenancePlan.title}`} /> : null}
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <TextBlock label={t("problem")} value={ticket.problem} />
              <TextBlock label={t("remarkTitle")} value={ticket.resolution} />
            </div>
          </section>

          {hasLegacyDetails ? (
            <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">{t("legacyTitle")}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {legacyFields.map((field) => <Info key={field.label} label={field.label} value={field.value} />)}
              </div>
            </section>
          ) : null}

          <section id="history" className="scroll-mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <History className="h-5 w-5 text-primary" />{t("history")}
            </h2>
            {movements.length === 0 ? (
              <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("historyEmpty")} />
            ) : (
              <ol className="space-y-4">
                {movements.map((movement) => (
                  <li key={movement.id} className="relative border-l border-border pl-4">
                    <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="rounded-md bg-background p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="font-medium text-foreground">{getMaintenanceMovementLabel(movement.movementType, {
                          create: t("movement.create"),
                          statusUpdate: t("movement.statusUpdate"),
                          close: t("movement.close"),
                          cancel: t("movement.cancel"),
                          pmCreate: t("movement.pmCreate"),
                          fallback: t("movement.fallback"),
                        })}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(movement.performedAt)}</div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                        <Info label={t("fromValue")} value={movementLabels.get(movement.id)?.from} />
                        <Info label={t("toValue")} value={movementLabels.get(movement.id)?.to} />
                      </div>
                      {movement.reason ? <p className="mt-2 text-sm text-muted-foreground">{movement.reason}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-foreground">{t("assetSection")}</h2>
            <div className="space-y-4">
              <Info label={t("asset")} value={`${ticket.asset.assetTag} - ${ticket.asset.name}`} />
              <Info label={t("currentStatus")} value={ticket.asset.status.nameTh} />
              <Info label={t("location")} value={`${ticket.asset.currentLocation.code} - ${ticket.asset.currentLocation.name}`} />
              <Info label={t("custodian")} value={ticket.asset.custodian ? `${ticket.asset.custodian.code} - ${ticket.asset.custodian.fullNameTh}` : null} />
              <Link href={`/${locale}/assets/${ticket.asset.id}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
                {t("openAsset")}
              </Link>
            </div>
          </section>

          {shouldReviewDisposal && canCreateDisposal ? (
            <section className="rounded-lg border border-warning/40 bg-warning/5 p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-warning-foreground" />{t("disposalReviewTitle")}
              </h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>{t("disposalReviewCount", { count: totalRepairCount })}</div>
                <div>{t("disposalReviewCost", { cost: formatCurrency(totalRepairCost) })}</div>
                {purchasePrice > 0 ? <div>{t("disposalReviewRatio", { percent: Math.round(repairCostRatio * 100) })}</div> : null}
              </div>
              <Link href={disposalRequestHref} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-warning/40 bg-surface px-3 text-sm font-medium text-warning-foreground hover:bg-warning/10">
                <Trash2 className="h-4 w-4" />{t("openDisposalRequest")}
              </Link>
            </section>
          ) : null}

          <div id="attachments" className="scroll-mt-6">
            <MaintenanceAttachments ticketId={ticket.id} attachments={attachments} canEdit={canAttach} canDelete={canEdit} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Info({ label, value, tone }: { label: string; value?: string | number | null; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success-foreground" : tone === "warning" ? "text-warning-foreground" : "text-foreground"
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-medium ${toneClass}`}>{value || "-"}</div>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-20 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : "-"}
      </div>
    </div>
  )
}
```

ถ้า `ActionEmptyState` บังคับ prop `description` ให้ส่ง `description={t("historyEmpty")}` เพิ่ม (ดู type ที่ `src/components/ui/action-empty-state.tsx`)

- [ ] **Step 6: เขียน `src/app/[locale]/(print)/maintenance/[id]/print/page.tsx` ใหม่ทั้งไฟล์**

```tsx
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toRepairRecordStatus } from "@/lib/repair-record-policy"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"

type RepairRecordPrintPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function RepairRecordPrintPage({ params }: RepairRecordPrintPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "maintenance", "view")
  const tRecord = await getTranslations("repairRecord")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    include: {
      asset: {
        select: {
          assetTag: true,
          name: true,
          serialNumber: true,
          fixedAssetCode: true,
          status: { select: { nameTh: true } },
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
          company: { select: { code: true, nameTh: true } },
          branch: { select: { code: true, name: true } },
          category: { select: { code: true, name: true } },
        },
      },
      reportedBy: { select: { code: true, fullNameTh: true } },
      vendor: { select: { code: true, name: true } },
      maintenancePlan: { select: { planNo: true, title: true } },
    },
  })
  if (!ticket) notFound()

  const outcome = ticket.outcome === "usable" || ticket.outcome === "beyond_repair" ? tRecord(`outcome.${ticket.outcome}`) : null

  return (
    <OperationDocumentPrint
      title={tRecord("printTitle")}
      subtitle={`${ticket.repairNo} · ${ticket.asset.assetTag} - ${ticket.asset.name}`}
      backHref={`/${locale}/maintenance/${ticket.id}`}
      backLabel={tCommon("back")}
      printLabel={tRecord("print")}
      sections={[
        {
          title: tRecord("detailTitle"),
          fields: [
            { label: tRecord("repairNo"), value: ticket.repairNo },
            { label: tRecord("statusLabel"), value: tRecord(`status.${toRepairRecordStatus(ticket.repairStatus)}`) },
            { label: tRecord("outcomeQuestion"), value: outcome },
            { label: tRecord("date"), value: formatDate(ticket.reportedDate) },
            { label: tRecord("returnDate"), value: ticket.returnDate ? formatDate(ticket.returnDate) : null },
            { label: tRecord("vendor"), value: ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : tRecord("internal") },
            { label: tRecord("cost"), value: ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost)) },
            { label: tRecord("invoiceNo"), value: ticket.invoiceNo },
            { label: tRecord("reporter"), value: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}` },
            { label: tRecord("planLabel"), value: ticket.maintenancePlan ? `${ticket.maintenancePlan.planNo} - ${ticket.maintenancePlan.title}` : null },
          ],
        },
        {
          title: tRecord("assetSection"),
          fields: [
            { label: tRecord("asset"), value: `${ticket.asset.assetTag} - ${ticket.asset.name}` },
            { label: tAsset("serialNumber"), value: ticket.asset.serialNumber },
            { label: tAsset("fixedAssetCode"), value: ticket.asset.fixedAssetCode },
            { label: tAsset("category"), value: `${ticket.asset.category.code} - ${ticket.asset.category.name}` },
            { label: tAsset("company"), value: `${ticket.asset.company.code} - ${ticket.asset.company.nameTh}` },
            { label: tAsset("branch"), value: `${ticket.asset.branch.code} - ${ticket.asset.branch.name}` },
            { label: tRecord("location"), value: `${ticket.asset.currentLocation.code} - ${ticket.asset.currentLocation.name}` },
            { label: tRecord("custodian"), value: ticket.asset.custodian ? `${ticket.asset.custodian.code} - ${ticket.asset.custodian.fullNameTh}` : null },
            { label: tRecord("currentStatus"), value: ticket.asset.status.nameTh },
          ],
        },
        { title: tRecord("problem"), fields: [{ label: tRecord("problem"), value: ticket.problem }] },
        { title: tRecord("remarkTitle"), fields: [{ label: tRecord("remark"), value: ticket.resolution }] },
      ]}
      signatures={[
        { title: tRecord("signatureRecorder"), helper: tRecord("signatureDate") },
        { title: tRecord("signatureReceiver"), helper: tRecord("signatureDate") },
      ]}
    />
  )
}
```

- [ ] **Step 7: แก้ `tests/maintenance-attachments-ui.test.ts`** — แทน test ที่สองทั้งก้อนด้วย:

```typescript
test("maintenance detail lets recorders attach and editors delete", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "utf8")
  assert.match(source, /canEdit=\{canAttach\}/)
  assert.match(source, /canDelete=\{canEdit\}/)
})
```

- [ ] **Step 8: Run tests + tsc**

Run: `node --test tests/repair-record-detail-ui.test.ts tests/repair-record-ui.test.ts tests/maintenance-attachments-ui.test.ts tests/maintenance-contrast.test.ts tests/maintenance-history-labels.test.ts`
Expected: PASS (1 skipped)
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0

- [ ] **Step 9: Commit**

```bash
git add -A src/components/maintenance/repair-record-actions.tsx "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx" "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx" messages/th.json messages/en.json tests/repair-record-detail-ui.test.ts tests/maintenance-attachments-ui.test.ts
git commit -m "feat(maintenance): repair record detail with finish, cancel and edit" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: หน้าแผน PM · เลิกผู้รับผิดชอบ · จบแผนเมื่อจำหน่าย

**Files:**
- Create: `src/app/[locale]/(dashboard)/maintenance/pm/page.tsx`
- Modify: `src/components/maintenance/maintenance-plan-form.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx`, `src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx`
- Modify: `src/lib/validations/maintenance.ts` (plan schema), `src/lib/maintenance-plan-service.ts`, `src/app/api/maintenance-plans/route.ts`
- Modify: `src/lib/disposal-execution-service.ts`
- Modify: `messages/th.json`, `messages/en.json` (`repairRecord.pmRecordDone`)
- Test: `tests/disposal-execution-service.test.ts`, `tests/maintenance-plan-routes.test.ts`, `tests/pm-plans-ui.test.ts`

**Interfaces:**
- Consumes: `MaintenancePlanStateActions({ planId, state })`, `getMaintenancePlanDueState(nextDueDate, now)`, Task 6 หน้า `/maintenance/new?planId=`
- Produces: หน้า `/[locale]/maintenance/pm` (รายการแผนทั้งหมด) · plan API/schema ไม่มี `assignedToId` · `executeDisposalRequest` จบแผน PM ของทรัพย์สินใน transaction เดียวกัน

- [ ] **Step 1: Write the failing tests**

`tests/pm-plans-ui.test.ts`:

```typescript
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("the PM plan page lists plans with edit, state and record-done actions", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/maintenance/pm/page.tsx", "utf8")
  assert.match(source, /MaintenancePlanStateActions/)
  assert.match(source, /\/maintenance\/pm\/\$\{plan\.id\}\/edit/)
  assert.match(source, /\/maintenance\/new\?planId=\$\{plan\.id\}/)
})

test("PM plans no longer ask for an internal assignee", () => {
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8")
  const route = readFileSync("src/app/api/maintenance-plans/route.ts", "utf8")
  const service = readFileSync("src/lib/maintenance-plan-service.ts", "utf8")
  for (const source of [form, route, service]) assert.doesNotMatch(source, /assignedToId|assignedTo:/)
  assert.match(form, /router\.push\(`\/\$\{locale\}\/maintenance\/pm`\)/)
})
```

ใน `tests/disposal-execution-service.test.ts`:
- เพิ่ม `endedPlans: Array<Record<string, unknown>>` ใน `type FakeState` และ `endedPlans: [],` ใน `makeState`
- ใน `makeTransaction` เพิ่ม model:

```typescript
    maintenancePlan: {
      async updateMany(args: Record<string, unknown>) {
        state.endedPlans.push(args)
        return { count: 1 }
      },
    },
```

- เพิ่ม test:

```typescript
test("executing a disposal ends the asset's PM plans in the same transaction", async () => {
  const state = makeState()
  const database = makeDatabase(state)

  await executeDisposalRequest(baseCommand, { database, batchSchemaReadiness: "absent" })

  assert.deepEqual(state.endedPlans, [{
    where: { assetId: "asset-1", planState: { not: "ended" } },
    data: { planState: "ended", isActive: false, updatedBy: "user-executor" },
  }])
})
```

ใน `tests/maintenance-plan-routes.test.ts` test `"PM plans persist distinct active, paused, and ended states"` เปลี่ยน path ของ `page` เป็น `"src/app/[locale]/(dashboard)/maintenance/pm/page.tsx"`

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/pm-plans-ui.test.ts tests/disposal-execution-service.test.ts tests/maintenance-plan-routes.test.ts`
Expected: FAIL — ไม่พบ `maintenance/pm/page.tsx` · `endedPlans` ว่าง

- [ ] **Step 3: จบแผน PM ตอน execute จำหน่าย** — ใน `src/lib/disposal-execution-service.ts` ต่อจากบล็อก `if (assetUpdate.count !== 1) { throw ... }` (ก่อน `transaction.assetMovement.create`):

```typescript
      // A disposed or retired asset needs no more PM reminders.
      await transaction.maintenancePlan.updateMany({
        where: { assetId: candidate.assetId, planState: { not: "ended" } },
        data: { planState: "ended", isActive: false, updatedBy: command.actor.userId },
      })
```

ถ้า type ของ `transaction` ในไฟล์นี้เป็น `Pick<...>` ที่ไม่มี `maintenancePlan` ให้เพิ่ม `"maintenancePlan"` ใน type นั้น

- [ ] **Step 4: เลิก `assignedToId` ในแผน PM**

`src/lib/validations/maintenance.ts`: ลบบรรทัด `assignedToId: optionalText,` ใน `maintenancePlanSchema` และ `maintenancePlanUpdateSchema`

`src/lib/maintenance-plan-service.ts`: ลบบรรทัด `const assignedToId = ...`, ลบบล็อก `if (assignedToId) { ... }` และบรรทัด `assignedToId: input.assignedToId,` ใน data ของ `update`

`src/app/api/maintenance-plans/route.ts`: ลบ `assignedTo: { select: ... },` จาก `planInclude`, ลบบล็อก `if (input.assignedToId) { ... }` และบรรทัด `assignedToId: input.assignedToId,` ใน `create`

`src/components/maintenance/maintenance-plan-form.tsx`: ลบ `assignedToId` จาก type ของ `initialValues`, จาก state, จาก body ของ fetch และลบบรรทัด `<MaintenanceOptionSelect type="employee" label={t("pmInternalResponsible")} ... />` · เปลี่ยน `router.push(\`/${locale}/maintenance?view=pm\`)` เป็น `router.push(\`/${locale}/maintenance/pm\`)`

`src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx`: ลบบรรทัด `assignedToId: plan.assignedToId ?? "",` · ลบ import `normalizeOperationalReturnTo` และเปลี่ยน `const returnTo = normalizeOperationalReturnTo(...)` เป็น `const returnTo = \`/${locale}/maintenance/pm\`` · breadcrumb แรกเป็น `{ label: t("pmTitle"), href: returnTo }`

`src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx`: แบบเดียวกัน — `const returnTo = \`/${locale}/maintenance/pm\`` · breadcrumb แรก `{ label: t("pmTitle"), href: returnTo }` · ลบ `returnTo` ออกจาก type ของ `searchParams`

ถ้า test ใดส่ง `assignedToId` ให้ schema/service แผน PM (`git grep -n "assignedToId" -- tests/maintenance-plan*`) ให้ลบ property นั้นออกจาก fixture

- [ ] **Step 5: เพิ่ม key** — `repairRecord.pmRecordDone`: th `"บันทึกว่าทำแล้ว"` / en `"Record as done"`

- [ ] **Step 6: สร้าง `src/app/[locale]/(dashboard)/maintenance/pm/page.tsx`**

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { CalendarClock, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDate } from "@/lib/utils"
import { getMaintenancePlanDueState } from "@/lib/preventive-maintenance"
import type { MaintenancePlanState } from "@/lib/maintenance-plan-service"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { MaintenancePlanStateActions } from "@/components/maintenance/maintenance-plan-state-actions"

type Props = { params: Promise<{ locale: string }> }

const planStateOrder: Record<string, number> = { active: 0, paused: 1, ended: 2 }

export default async function MaintenancePlansPage({ params }: Props) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tRecord = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const now = new Date()
  const plans = (await prisma.maintenancePlan.findMany({
    include: {
      asset: { select: { assetTag: true, name: true } },
      vendor: { select: { code: true, name: true } },
    },
    orderBy: { nextDueDate: "asc" },
    take: 500,
  })).sort((left, right) => (planStateOrder[left.planState] ?? 3) - (planStateOrder[right.planState] ?? 3))

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: tRecord("title"), href: `/${locale}/maintenance` }, { label: t("pmTitle") }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <CalendarClock className="h-6 w-6 text-primary" />{t("pmTitle")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("pmSubtitle")}</p>
        </div>
        {canCreate ? (
          <Link href={`/${locale}/maintenance/pm/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />{t("pmCreateTitle")}
          </Link>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {plans.length === 0 ? (
          <div className="p-4">
            <ActionEmptyState title={t("pmEmptyTitle")} description={t("pmEmptyHelp")} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {plans.map((plan) => {
              const isActivePlan = plan.planState === "active"
              const dueState = getMaintenancePlanDueState(plan.nextDueDate, now)
              const dueTone = dueState === "overdue" ? "danger" : dueState === "due_soon" ? "warning" : "primary"
              return (
                <li key={plan.id} className="grid min-w-0 gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_minmax(200px,260px)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{plan.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{plan.planNo} · {plan.asset.assetTag} - {plan.asset.name}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{t("pmNextDueDate")}: {formatDate(plan.nextDueDate)}</div>
                    <div className="mt-1">{t("pmExternalProvider")}: {plan.vendor ? `${plan.vendor.code} - ${plan.vendor.name}` : t("pmNoExternalProvider")}</div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                    {isActivePlan ? <StatusBadge label={t(`pmDueState.${dueState}`)} tone={dueTone} size="xs" /> : null}
                    <StatusBadge label={t(`pmFrequencies.${plan.frequency}`)} tone="muted" size="xs" />
                    <StatusBadge label={t(`pmPlanStates.${plan.planState}`)} tone={isActivePlan ? "success" : plan.planState === "paused" ? "warning" : "muted"} size="xs" />
                    {canCreate && isActivePlan ? (
                      <Link href={`/${locale}/maintenance/new?planId=${plan.id}`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                        {tRecord("pmRecordDone")}
                      </Link>
                    ) : null}
                    {canEdit && plan.planState !== "ended" ? (
                      <Link href={`/${locale}/maintenance/pm/${plan.id}/edit`} className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-accent">
                        {tCommon("edit")}
                      </Link>
                    ) : null}
                    {canEdit ? <MaintenancePlanStateActions planId={plan.id} state={plan.planState as MaintenancePlanState} /> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 7: Run tests + tsc**

Run: `node --test tests/pm-plans-ui.test.ts tests/disposal-execution-service.test.ts tests/maintenance-plan-routes.test.ts tests/maintenance-plan-service.test.ts tests/disposal-bulk-execution.test.ts tests/repair-record-ui.test.ts`
Expected: PASS (ไฟล์ที่ไม่มีอยู่ให้ตัดออกจากคำสั่ง)
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0

- [ ] **Step 8: Commit**

```bash
git add -A "src/app/[locale]/(dashboard)/maintenance/pm" src/components/maintenance/maintenance-plan-form.tsx src/lib/validations/maintenance.ts src/lib/maintenance-plan-service.ts src/app/api/maintenance-plans/route.ts src/lib/disposal-execution-service.ts messages/th.json messages/en.json tests
git commit -m "feat(maintenance): PM plan page; end plans when an asset is disposed" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: หน้ารายการ · PM ถึงกำหนด · ทรัพย์สินค้าง · export

**Files:**
- Modify (เขียนใหม่ทั้งไฟล์): `src/lib/maintenance-query.ts`, `tests/maintenance-query.test.ts`
- Modify (เขียนใหม่ทั้งไฟล์): `src/lib/maintenance-status.ts`
- Modify (เขียนใหม่ทั้งไฟล์): `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Modify: `src/app/api/maintenance-tickets/export/route.ts`
- Modify: `src/lib/maintenance-view.ts`, `src/lib/maintenance-list.ts` และ test ของสองไฟล์
- Modify: `messages/th.json`, `messages/en.json` (`repairRecord` + `maintenancePage.statuses`)
- Modify: `tests/maintenance-i18n.test.ts`, `tests/repair-record-detail-ui.test.ts` (เอา skip ออก)
- Delete: `src/components/maintenance/maintenance-ticket-actions.tsx`, `maintenance-ticket-close-button.tsx`, `maintenance-ticket-cancel-button.tsx`, `maintenance-ticket-planning-button.tsx`, `maintenance-ticket-status-button.tsx`, `src/lib/maintenance-planning-draft.ts`, `tests/maintenance-planning-draft.test.ts`, `tests/maintenance-action-controller.test.ts`, `tests/maintenance-queue-ux.test.ts`
- Test: `tests/maintenance-query.test.ts`, `tests/repair-record-list-ui.test.ts`

**Interfaces:**
- Consumes: Task 2 (`openRepairRecordWhere`, `getRepairRecordStatusTone`, `toRepairRecordStatus`, `repairRecordStatuses`), Task 3 (`buildDuePmPlanWhere`, `getBangkokDateKey`)
- Produces:
  - `parseMaintenanceListParams(input)` → `{ search; status: "" | RepairRecordStatus; assetId; dateFrom; dateTo; page; pageSize }`
  - `buildMaintenanceWhere(filters): Prisma.MaintenanceTicketWhereInput`
  - `buildMaintenanceQueryString(filters, overrides?)` ลำดับ `search, status, assetId, dateFrom, dateTo, page, pageSize`
  - `maintenanceStatusFilters = repairRecordStatuses`
  - `maintenance-status.ts`: `maintenanceStatuses` (3 ค่า), `isMaintenanceClosed`, `getMaintenanceStatusTone`, `getMaintenanceStatusLabel(status, labels)` — label ของสถานะเดิมแปลงเป็น 3 สถานะใหม่
  - หน้า `/maintenance?status=in_progress&assetId=…` · anchor `#pm-due`, `#stuck`

- [ ] **Step 1: Write the failing tests**

แทนที่ `tests/maintenance-query.test.ts` ทั้งไฟล์:

```typescript
import assert from "node:assert/strict"
import test from "node:test"

import {
  buildMaintenanceQueryString,
  buildMaintenanceWhere,
  parseMaintenanceListParams,
} from "../src/lib/maintenance-query.ts"

test("the unfinished filter includes tickets from the old workflow", () => {
  const where = buildMaintenanceWhere(parseMaintenanceListParams({ status: "in_progress" }))
  assert.deepEqual(where.repairStatus, { notIn: ["closed", "cancelled"] })
})

test("finished and cancelled filters match exactly", () => {
  assert.equal(buildMaintenanceWhere(parseMaintenanceListParams({ status: "closed" })).repairStatus, "closed")
  assert.equal(buildMaintenanceWhere(parseMaintenanceListParams({ status: "cancelled" })).repairStatus, "cancelled")
})

test("old workflow statuses in a bookmarked URL are ignored", () => {
  assert.equal(parseMaintenanceListParams({ status: "waiting_parts" }).status, "")
})

test("the asset filter from the asset page narrows the list", () => {
  assert.equal(buildMaintenanceWhere(parseMaintenanceListParams({ assetId: "asset-1" })).assetId, "asset-1")
})

test("query strings keep the asset filter and drop empty values", () => {
  const filters = parseMaintenanceListParams({ assetId: "asset-1", status: "closed" })
  assert.equal(buildMaintenanceQueryString(filters), "status=closed&assetId=asset-1&page=1&pageSize=25")
})

test("an inverted date range is not applied", () => {
  const where = buildMaintenanceWhere(parseMaintenanceListParams({ dateFrom: "2026-10-08", dateTo: "2026-10-01" }))
  assert.equal(where.reportedDate, undefined)
})

test("search covers record number, asset, problem, remark, invoice, reporter and vendor", () => {
  const where = buildMaintenanceWhere(parseMaintenanceListParams({ search: "UPS" }))
  assert.equal(Array.isArray(where.OR), true)
  assert.deepEqual(where.OR?.slice(0, 2), [{ repairNo: { contains: "UPS" } }, { problem: { contains: "UPS" } }])
  assert.equal(where.OR?.length, 9)
})
```

สร้าง `tests/repair-record-list-ui.test.ts`:

```typescript
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "../src/lib/maintenance-status.ts"

const pagePath = "src/app/[locale]/(dashboard)/maintenance/page.tsx"

test("history screens show old workflow tickets with the new three statuses", () => {
  const labels = { in_progress: "ยังซ่อมไม่เสร็จ", closed: "ซ่อมเสร็จแล้ว", cancelled: "ยกเลิก" }
  assert.deepEqual([...maintenanceStatuses], ["in_progress", "closed", "cancelled"])
  assert.equal(getMaintenanceStatusLabel("waiting_vendor", labels), "ยังซ่อมไม่เสร็จ")
  assert.equal(getMaintenanceStatusTone("reported"), "warning")
})

test("the maintenance page lists records with PM due and stuck assets", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /buildDuePmPlanWhere\(/)
  assert.match(source, /id="pm-due"/)
  assert.match(source, /id="stuck"/)
  assert.match(source, /maintenanceTickets: \{ none: openRepairRecordWhere \}/)
  assert.match(source, /planId=/)
})

test("the board view, SLA and evidence filters are gone", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.doesNotMatch(source, /Kanban|layout=board|overdue=yes|evidence|assignedTo/)
})

test("the export uses the repair record columns", () => {
  const source = readFileSync("src/app/api/maintenance-tickets/export/route.ts", "utf8")
  assert.match(source, /key: "outcome"/)
  assert.doesNotMatch(source, /assignedTo|dueDate|laborCost|partsCost|inspectedBy/)
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/maintenance-query.test.ts tests/repair-record-list-ui.test.ts`
Expected: FAIL — status `in_progress` ยังเป็นค่าตรงตัว, `maintenanceStatuses` ยังมี 9 ค่า

- [ ] **Step 3: แทนที่ `src/lib/maintenance-query.ts` ทั้งไฟล์**

```typescript
import type { Prisma } from "@prisma/client"
import { openRepairRecordWhere, repairRecordStatuses } from "./repair-record-policy.ts"

type QueryValue = string | string[] | number | undefined

export type MaintenanceListParams = {
  search?: string
  status?: string
  assetId?: string
  dateFrom?: string
  dateTo?: string
  page?: QueryValue
  pageSize?: QueryValue
}

export const maintenanceStatusFilters = repairRecordStatuses
export const maintenancePageSizes = [25, 50, 100] as const

export type ParsedMaintenanceListParams = ReturnType<typeof parseMaintenanceListParams>

export function parseMaintenanceListParams(input: URLSearchParams | MaintenanceListParams) {
  const getValue = (key: keyof MaintenanceListParams) => {
    const rawValue = input instanceof URLSearchParams ? input.get(key) ?? undefined : input[key]
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
    return value === undefined ? undefined : String(value).trim()
  }

  return {
    search: getValue("search") ?? "",
    status: normalizeOption(getValue("status"), maintenanceStatusFilters),
    assetId: getValue("assetId") ?? "",
    dateFrom: normalizeDate(getValue("dateFrom")),
    dateTo: normalizeDate(getValue("dateTo")),
    page: normalizePositiveInteger(getValue("page"), 1),
    pageSize: normalizePageSize(getValue("pageSize")),
  }
}

export function getMaintenanceDateRangeError(filters: ParsedMaintenanceListParams) {
  return filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
    ? "invalid_order" as const
    : null
}

export function buildMaintenanceWhere(filters: ParsedMaintenanceListParams): Prisma.MaintenanceTicketWhereInput {
  return {
    isActive: true,
    ...(filters.status === "in_progress" ? { repairStatus: openRepairRecordWhere.repairStatus } : {}),
    ...(filters.status === "closed" || filters.status === "cancelled" ? { repairStatus: filters.status } : {}),
    ...(filters.assetId ? { assetId: filters.assetId } : {}),
    ...(!getMaintenanceDateRangeError(filters) && (filters.dateFrom || filters.dateTo)
      ? {
          reportedDate: {
            ...(filters.dateFrom ? { gte: startOfDay(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lt: nextDay(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { repairNo: { contains: filters.search } },
            { problem: { contains: filters.search } },
            { resolution: { contains: filters.search } },
            { invoiceNo: { contains: filters.search } },
            { asset: { assetTag: { contains: filters.search } } },
            { asset: { name: { contains: filters.search } } },
            { reportedBy: { code: { contains: filters.search } } },
            { reportedBy: { fullNameTh: { contains: filters.search } } },
            { vendor: { name: { contains: filters.search } } },
          ],
        }
      : {}),
  }
}

export function buildMaintenanceQueryString(
  filters: ParsedMaintenanceListParams,
  overrides: Partial<ParsedMaintenanceListParams> = {},
) {
  const values = { ...filters, ...overrides }
  const params = new URLSearchParams()
  if (values.search) params.set("search", values.search)
  if (values.status) params.set("status", values.status)
  if (values.assetId) params.set("assetId", values.assetId)
  if (values.dateFrom) params.set("dateFrom", values.dateFrom)
  if (values.dateTo) params.set("dateTo", values.dateTo)
  params.set("page", String(values.page))
  params.set("pageSize", String(values.pageSize))
  return params.toString()
}

function normalizeOption<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] | "" {
  return value && allowed.includes(value) ? value : ""
}

function normalizeDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const date = new Date(`${value}T00:00:00.000`)
  return Number.isNaN(date.getTime()) || toDateKey(date) !== value ? "" : value
}

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function normalizePageSize(value: string | undefined): (typeof maintenancePageSizes)[number] {
  const parsed = Number(value)
  return maintenancePageSizes.includes(parsed as (typeof maintenancePageSizes)[number])
    ? parsed as (typeof maintenancePageSizes)[number]
    : 25
}

function toDateKey(date: Date) {
  const year = String(date.getFullYear()).padStart(4, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000`)
}

function nextDay(value: string) {
  const date = startOfDay(value)
  date.setDate(date.getDate() + 1)
  return date
}
```

แก้ `src/app/api/maintenance-tickets/route.ts` (GET) ให้เรียก `buildMaintenanceWhere(filters)` (ทำไว้แล้วใน Task 5 — ตรวจว่าไม่มี argument ที่ 2)

- [ ] **Step 4: แทนที่ `src/lib/maintenance-status.ts` ทั้งไฟล์**

```typescript
import {
  getRepairRecordStatusTone,
  isOpenRepairStatus,
  repairRecordStatuses,
  toRepairRecordStatus,
} from "./repair-record-policy.ts"

// Screens outside the maintenance module (employee, supplier, asset history) show old workflow
// tickets with the same three repair record statuses as new ones.
export const maintenanceStatuses = repairRecordStatuses

export function isMaintenanceClosed(status: string) {
  return !isOpenRepairStatus(status)
}

export function getMaintenanceStatusTone(status: string) {
  return getRepairRecordStatusTone(status)
}

export function getMaintenanceStatusLabel(status: string, labels: Record<string, string>) {
  return labels[toRepairRecordStatus(status)] ?? status
}
```

ใน `messages/th.json` แก้ `maintenancePage.statuses.in_progress` = `"ยังซ่อมไม่เสร็จ"`, `closed` = `"ซ่อมเสร็จแล้ว"`, `cancelled` = `"ยกเลิก"` · `messages/en.json` = `"In progress"`, `"Finished"`, `"Cancelled"` (key อื่นใน `statuses` คงไว้)

- [ ] **Step 5: เพิ่ม key ใน `repairRecord`** (ต่อท้าย object เดิม)

`messages/th.json`:

```json
"subtitle": "ประวัติการซ่อมของทรัพย์สินทุกชิ้น",
"listTitle": "บันทึกการซ่อม",
"resultCount": "{count} รายการ",
"searchPlaceholder": "ค้นหาเลขที่ รหัสทรัพย์สิน อาการ เลขใบเสร็จ หรือร้าน",
"filterStatus": "สถานะ",
"dateFrom": "ตั้งแต่วันที่",
"dateTo": "ถึงวันที่",
"filter": "กรอง",
"clearFilters": "ล้างตัวกรอง",
"invalidDateRange": "วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด",
"assetFilter": "เฉพาะทรัพย์สินนี้",
"export": "ส่งออก Excel",
"emptyTitle": "ยังไม่มีบันทึกการซ่อม",
"emptyHelp": "กด \"บันทึกซ่อม\" เพื่อเริ่มบันทึก หรือล้างตัวกรอง",
"pmDueTitle": "PM ถึงกำหนด (7 วัน)",
"pmDueHelp": "แผน PM ที่ถึงกำหนดภายใน 7 วัน เรียงจากที่เลยกำหนดก่อน",
"pmOverdue": "เลยกำหนด",
"pmDueOn": "ครบกำหนด {date}",
"pmManage": "จัดการแผน PM",
"stuckTitle": "ทรัพย์สินค้างสถานะซ่อมแต่ไม่มีบันทึก",
"stuckHelp": "บันทึกการซ่อมให้ชิ้นเหล่านี้ เพื่อให้สถานะกับประวัติตรงกัน",
"stuckMore": "และอีก {count} ชิ้น"
```

`messages/en.json`:

```json
"subtitle": "Repair history for every asset",
"listTitle": "Repair records",
"resultCount": "{count} records",
"searchPlaceholder": "Search record no., asset, problem, receipt or vendor",
"filterStatus": "Status",
"dateFrom": "From",
"dateTo": "To",
"filter": "Filter",
"clearFilters": "Clear filters",
"invalidDateRange": "The start date must not be after the end date",
"assetFilter": "This asset only",
"export": "Export Excel",
"emptyTitle": "No repair records",
"emptyHelp": "Press \"Record a repair\" to add one, or clear the filters",
"pmDueTitle": "PM due (next 7 days)",
"pmDueHelp": "PM plans due within 7 days, overdue first",
"pmOverdue": "Overdue",
"pmDueOn": "Due {date}",
"pmManage": "Manage PM plans",
"stuckTitle": "Assets in a repair status without a record",
"stuckHelp": "Record the repair for these assets so status and history match",
"stuckMore": "and {count} more"
```

- [ ] **Step 6: เขียน `src/app/[locale]/(dashboard)/maintenance/page.tsx` ใหม่ทั้งไฟล์**

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CalendarClock, Download, Plus, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildMaintenanceQueryString,
  buildMaintenanceWhere,
  getMaintenanceDateRangeError,
  maintenanceStatusFilters,
  parseMaintenanceListParams,
} from "@/lib/maintenance-query"
import { buildDuePmPlanWhere, getBangkokDateKey } from "@/lib/preventive-maintenance"
import { getRepairRecordStatusTone, openRepairRecordWhere, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { MaintenancePagination } from "@/components/maintenance/maintenance-pagination"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"

type MaintenancePageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; assetId?: string; dateFrom?: string; dateTo?: string; page?: string; pageSize?: string }>
}

const stuckAssetWhere = {
  isActive: true,
  status: { name: { in: ["Pending Repair", "Under Maintenance"] } },
  maintenanceTickets: { none: openRepairRecordWhere },
}

export default async function MaintenancePage({ params, searchParams }: MaintenancePageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canExport = hasPermission(user, "maintenance", "export")
  const t = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const filters = parseMaintenanceListParams(await searchParams)
  const where = buildMaintenanceWhere(filters)
  const listQuery = buildMaintenanceQueryString(filters)
  const returnHref = `/${locale}/maintenance?${listQuery}`
  const now = new Date()
  const todayKey = getBangkokDateKey(now)

  const [records, total, duePlans, stuckAssets, stuckTotal] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where,
      include: {
        asset: { select: { assetTag: true, name: true } },
        reportedBy: { select: { code: true, fullNameTh: true } },
        vendor: { select: { name: true } },
      },
      orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.maintenanceTicket.count({ where }),
    prisma.maintenancePlan.findMany({
      where: buildDuePmPlanWhere(now),
      select: {
        id: true,
        planNo: true,
        title: true,
        nextDueDate: true,
        asset: { select: { assetTag: true, name: true } },
        vendor: { select: { name: true } },
      },
      orderBy: { nextDueDate: "asc" },
      take: 20,
    }),
    prisma.asset.findMany({
      where: stuckAssetWhere,
      select: { id: true, assetTag: true, name: true, status: { select: { nameTh: true } } },
      orderBy: { assetTag: "asc" },
      take: 20,
    }),
    prisma.asset.count({ where: stuckAssetWhere }),
  ])
  const recordHref = (id: string) => appendOperationalReturnTo(`/${locale}/maintenance/${id}`, returnHref)
  const outcomeLabel = (outcome: string | null, status: string) =>
    outcome === "usable" || outcome === "beyond_repair"
      ? t(`outcome.${outcome}`)
      : toRepairRecordStatus(status) === "closed" ? t("outcome.unknown") : "-"
  const clearHref = filters.assetId ? `/${locale}/maintenance?assetId=${encodeURIComponent(filters.assetId)}` : `/${locale}/maintenance`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canCreate ? (
          <Link
            href={appendOperationalReturnTo(`/${locale}/maintenance/new${filters.assetId ? `?assetId=${encodeURIComponent(filters.assetId)}` : ""}`, returnHref)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />{t("createTitle")}
          </Link>
        ) : null}
      </div>

      {stuckTotal > 0 ? (
        <section id="stuck" className="rounded-lg border border-warning/40 bg-warning/5 p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-warning-foreground" />{t("stuckTitle")} ({stuckTotal})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("stuckHelp")}</p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {stuckAssets.map((asset) => (
              <li key={asset.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                <Link href={`/${locale}/assets/${asset.id}`} className="min-w-0 truncate text-sm font-medium text-foreground hover:text-primary">
                  {asset.assetTag} - {asset.name} <span className="text-xs text-muted-foreground">({asset.status.nameTh})</span>
                </Link>
                {canCreate ? (
                  <Link href={appendOperationalReturnTo(`/${locale}/maintenance/new?assetId=${asset.id}`, returnHref)} className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-accent">
                    {t("createTitle")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
          {stuckTotal > stuckAssets.length ? <p className="mt-2 text-xs text-muted-foreground">{t("stuckMore", { count: stuckTotal - stuckAssets.length })}</p> : null}
        </section>
      ) : null}

      <section id="pm-due" className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CalendarClock className="h-5 w-5 text-primary" />{t("pmDueTitle")} ({duePlans.length})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("pmDueHelp")}</p>
          </div>
          <Link href={`/${locale}/maintenance/pm`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
            {t("pmManage")}
          </Link>
        </div>
        {duePlans.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {duePlans.map((plan) => {
              const overdue = getBangkokDateKey(plan.nextDueDate) < todayKey
              return (
                <li key={plan.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{plan.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {plan.planNo} · {plan.asset.assetTag} - {plan.asset.name}{plan.vendor ? ` · ${plan.vendor.name}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={overdue ? t("pmOverdue") : t("pmDueOn", { date: formatDate(plan.nextDueDate) })} tone={overdue ? "danger" : "warning"} size="xs" />
                    {canCreate ? (
                      <Link href={appendOperationalReturnTo(`/${locale}/maintenance/new?planId=${plan.id}`, returnHref)} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                        {t("pmRecordDone")}
                      </Link>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,180px))_auto]" action={`/${locale}/maintenance`}>
          {filters.assetId ? <input type="hidden" name="assetId" value={filters.assetId} /> : null}
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input type="search" name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("filterStatus")}</span>
            <select name="status" defaultValue={filters.status} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">{tCommon("all")}</option>
              {maintenanceStatusFilters.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span>
            <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span>
            <input type="date" name="dateTo" defaultValue={filters.dateTo} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <div className="flex flex-col gap-2 self-end sm:flex-row">
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("filter")}</button>
            <Link href={clearHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">{t("clearFilters")}</Link>
          </div>
        </form>
        {filters.assetId ? <p className="mt-3 text-xs text-muted-foreground">{t("assetFilter")} · <Link href={`/${locale}/maintenance`} className="text-primary hover:underline">{t("clearFilters")}</Link></p> : null}
        {getMaintenanceDateRangeError(filters) ? (
          <p role="alert" className="mt-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning-foreground">{t("invalidDateRange")}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("listTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("resultCount", { count: total })}</p>
          </div>
          {canExport ? (
            <a href={`/api/maintenance-tickets/export?${listQuery}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
              <Download className="h-4 w-4" />{t("export")}
            </a>
          ) : null}
        </div>
        {records.length === 0 ? (
          <div className="p-4">
            <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyTitle")} description={t("emptyHelp")} actionHref={clearHref} actionLabel={t("clearFilters")} />
          </div>
        ) : (
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {records.map((record) => (
                <Link key={record.id} href={recordHref(record.id)} className="block min-w-0 rounded-md border border-border bg-background p-3 hover:bg-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{record.asset.assetTag}</div>
                      <div className="truncate text-xs text-muted-foreground">{record.asset.name}</div>
                    </div>
                    <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} size="xs" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{record.problem}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDate(record.reportedDate)} · {record.vendor?.name ?? t("internal")}
                    {record.repairCost == null ? "" : ` · ${formatCurrency(Number(record.repairCost))}`}
                  </div>
                </Link>
              ))}
            </div>
            <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <ColumnHeader>{t("date")}</ColumnHeader>
                    <ColumnHeader>{t("asset")}</ColumnHeader>
                    <ColumnHeader>{t("problem")}</ColumnHeader>
                    <ColumnHeader>{t("statusLabel")}</ColumnHeader>
                    <ColumnHeader>{t("outcomeQuestion")}</ColumnHeader>
                    <ColumnHeader>{t("vendor")}</ColumnHeader>
                    <ColumnHeader>{t("cost")}</ColumnHeader>
                    <ColumnHeader>{t("reporter")}</ColumnHeader>
                    <ColumnHeader>{t("repairNo")}</ColumnHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((record) => (
                    <ClickableTableRow key={record.id} href={recordHref(record.id)} label={`${tCommon("view")}: ${record.repairNo}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(record.reportedDate)}</td>
                      <td className="min-w-48 px-4 py-3">
                        <div className="font-medium text-foreground">{record.asset.assetTag}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{record.asset.name}</div>
                      </td>
                      <td className="min-w-72 px-4 py-3 text-foreground">{record.problem}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} size="xs" />
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 ${record.outcome === "beyond_repair" ? "text-warning-foreground" : record.outcome === "usable" ? "text-success-foreground" : "text-muted-foreground"}`}>
                        {outcomeLabel(record.outcome, record.repairStatus)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.vendor?.name ?? t("internal")}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.repairCost == null ? "-" : formatCurrency(Number(record.repairCost))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.reportedBy.fullNameTh}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{record.repairNo}</td>
                    </ClickableTableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <MaintenancePagination
          locale={locale}
          currentQuery={listQuery}
          page={filters.page}
          pageSize={filters.pageSize}
          total={total}
          labels={{ rowsPerPage: tCommon("rowsPerPage"), page: tCommon("page"), of: tCommon("of"), previous: tCommon("previous"), next: tCommon("next") }}
        />
      </section>
    </div>
  )
}
```

- [ ] **Step 7: Export — `src/app/api/maintenance-tickets/export/route.ts`**

แทน `maintenanceExportColumns` และส่วนสร้างแถว:

```typescript
import { toRepairRecordStatus } from "@/lib/repair-record-policy"

const statusText: Record<string, string> = { in_progress: "ยังซ่อมไม่เสร็จ", closed: "ซ่อมเสร็จแล้ว", cancelled: "ยกเลิก" }
const outcomeText: Record<string, string> = { usable: "ใช้งานได้", beyond_repair: "ซ่อมไม่ได้ เสนอจำหน่าย" }

const maintenanceExportColumns = [
  { header: "Record No.", key: "repairNo", width: 20 },
  { header: "Date", key: "reportedDate", width: 14 },
  { header: "Asset Tag", key: "assetTag", width: 22 },
  { header: "Asset Name", key: "assetName", width: 32 },
  { header: "Problem / Work Done", key: "problem", width: 48 },
  { header: "Status", key: "status", width: 18 },
  { header: "Result", key: "outcome", width: 22 },
  { header: "Vendor", key: "vendor", width: 28 },
  { header: "Cost", key: "repairCost", width: 14 },
  { header: "Invoice No.", key: "invoiceNo", width: 20 },
  { header: "Finished On", key: "returnDate", width: 14 },
  { header: "Recorded By", key: "reportedBy", width: 28 },
  { header: "PM Plan", key: "plan", width: 24 },
  { header: "Remark", key: "remark", width: 36 },
  { header: "Attachment Count", key: "attachmentCount", width: 18 },
]
```

query ใน `GET`:

```typescript
    const filters = parseMaintenanceListParams(request.nextUrl.searchParams)
    const tickets = await prisma.maintenanceTicket.findMany({
      where: buildMaintenanceWhere(filters),
      include: {
        asset: { select: { assetTag: true, name: true } },
        reportedBy: { select: { code: true, fullNameTh: true } },
        vendor: { select: { code: true, name: true } },
        maintenancePlan: { select: { planNo: true } },
      },
      orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
      take: 5000,
    })
```

แถว:

```typescript
      tickets.map((ticket) => ({
        repairNo: ticket.repairNo,
        reportedDate: toExcelDate(ticket.reportedDate),
        assetTag: ticket.asset.assetTag,
        assetName: ticket.asset.name,
        problem: ticket.problem,
        status: statusText[toRepairRecordStatus(ticket.repairStatus)],
        outcome: ticket.outcome ? outcomeText[ticket.outcome] ?? ticket.outcome : "",
        vendor: ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : "ช่างภายใน",
        repairCost: ticket.repairCost == null ? "" : Number(ticket.repairCost),
        invoiceNo: ticket.invoiceNo ?? "",
        returnDate: toExcelDate(ticket.returnDate),
        reportedBy: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`,
        plan: ticket.maintenancePlan?.planNo ?? "",
        remark: ticket.resolution ?? "",
        attachmentCount: attachmentCounts.get(ticket.id) ?? 0,
      }))
```

numFmt เหลือบรรทัดเดียว `worksheet.getColumn("repairCost").numFmt = "#,##0.00"` · worksheet ชื่อ `"Repair Records"` · ชื่อไฟล์ `repair-records-${new Date().toISOString().slice(0, 10)}.xlsx` · ลบฟังก์ชัน `getMaintenanceAttachmentTicketIds` (ไม่ใช้แล้ว)

- [ ] **Step 8: ตัด board ออกจาก `maintenance-view.ts` / `maintenance-list.ts`**

`src/lib/maintenance-view.ts` เหลือเฉพาะ:

```typescript
export function buildMaintenancePageHref(
  locale: string,
  currentQuery: string,
  overrides: { page?: number; pageSize?: number },
) {
  const params = new URLSearchParams(currentQuery)
  if (overrides.page !== undefined) params.set("page", String(overrides.page))
  if (overrides.pageSize !== undefined) params.set("pageSize", String(overrides.pageSize))
  return `/${locale}/maintenance?${params.toString()}`
}
```

`src/lib/maintenance-list.ts` ลบ `MaintenanceBoardCompatibility`, `tableOnlyStatuses`, `getMaintenanceBoardCompatibility` (เหลือ `buildMaintenancePagination`)

ใน `tests/maintenance-view.test.ts` และ `tests/maintenance-list.test.ts` ลบ test และ import ของฟังก์ชันที่ลบ (เหลือ test ของ `buildMaintenancePageHref` / `buildMaintenancePagination`) — ถ้าไฟล์ test เหลือ 0 test ให้ลบทั้งไฟล์

- [ ] **Step 9: ลบปุ่ม/ไฟล์ workflow เดิม และเอา skip ออก**

```bash
git rm src/components/maintenance/maintenance-ticket-actions.tsx src/components/maintenance/maintenance-ticket-close-button.tsx src/components/maintenance/maintenance-ticket-cancel-button.tsx src/components/maintenance/maintenance-ticket-planning-button.tsx src/components/maintenance/maintenance-ticket-status-button.tsx src/lib/maintenance-planning-draft.ts tests/maintenance-planning-draft.test.ts tests/maintenance-action-controller.test.ts tests/maintenance-queue-ux.test.ts
```

ใน `tests/repair-record-detail-ui.test.ts` เอา `{ skip: ... }` ของ test `"old workflow buttons are gone"` ออก

ใน `tests/maintenance-i18n.test.ts`:
- test `"maintenance clients localize stable error codes..."` — ลบ 3 บรรทัด `maintenance-ticket-status-button.tsx`, `maintenance-ticket-planning-button.tsx`, `maintenance-ticket-close-button.tsx` ออกจาก `files` และเพิ่ม `"src/components/maintenance/repair-record-actions.tsx",`
- test `"maintenance option selectors use the shared loading message namespace"` — เปลี่ยน `files` เป็น `["src/components/maintenance/repair-record-form.tsx", "src/components/maintenance/repair-record-actions.tsx"]` และเปลี่ยนบรรทัดสุดท้ายเป็น `assert.ok((source.match(/loadingLabel=\{tCommon\("loading"\)\}/g)?.length ?? 0) >= files.length)`

ตรวจว่าไม่มีใครอ้างไฟล์ที่ลบ: `git grep -nE "maintenance-ticket-(actions|close-button|cancel-button|planning-button|status-button)|maintenance-planning-draft|getMaintenanceBoardCompatibility|normalizeMaintenancePageView" -- src tests` → ต้องไม่มีผล

test อื่นที่อ่านหน้ารายการเดิม — แก้ตามนี้:
- `tests/operational-return-navigation.test.ts` test `"maintenance list and detail preserve filtered list context"`: แทน 4 บรรทัด `assert.match(listSource, ...)` ด้วย

```typescript
  assert.match(listSource, /const returnHref = `\/\$\{locale\}\/maintenance\?\$\{listQuery\}`/)
  assert.match(listSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{id\}`, returnHref\)/)
  assert.match(listSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/new\?planId=\$\{plan\.id\}`, returnHref\)/)
```
- `tests/maintenance-pagination-ui.test.ts` test `"maintenance list renders pagination and explains board incompatibility"`: เปลี่ยนชื่อเป็น `"maintenance list renders pagination"` และลบสอง assertion `getMaintenanceBoardCompatibility` / `boardTableRequired`
- `tests/notification-maintenance-query.test.ts`: ลบบรรทัด `const maintenancePage = readFileSync(...)` และ `assert.match(maintenancePage, ...)` (test ทั้งไฟล์ถูกเขียนใหม่ใน Task 12)

- [ ] **Step 10: Run tests + tsc**

Run: `node --test tests/maintenance-query.test.ts tests/repair-record-list-ui.test.ts tests/repair-record-detail-ui.test.ts tests/maintenance-i18n.test.ts tests/maintenance-view.test.ts tests/maintenance-list.test.ts tests/maintenance-pagination-ui.test.ts tests/maintenance-contrast.test.ts tests/operational-return-navigation.test.ts tests/notification-maintenance-query.test.ts tests/employee-detail.test.ts tests/supplier-detail.test.ts`
Expected: PASS (ไฟล์ที่ไม่มีอยู่ให้ตัดออกจากคำสั่ง)
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0

- [ ] **Step 11: Commit**

```bash
git add -A src/lib/maintenance-query.ts src/lib/maintenance-status.ts src/lib/maintenance-view.ts src/lib/maintenance-list.ts "src/app/[locale]/(dashboard)/maintenance/page.tsx" src/app/api/maintenance-tickets/export/route.ts src/components/maintenance messages/th.json messages/en.json tests
git commit -m "feat(maintenance): repair record list with PM due and stuck assets" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: เลิกสร้างใบงาน PM อัตโนมัติ

**Files:**
- Delete: `src/app/api/maintenance-plans/generate-due/route.ts`, `src/app/api/maintenance-plans/[id]/generate-ticket/route.ts`, `src/lib/preventive-maintenance-ticket-generator.ts`, `src/components/maintenance/maintenance-plan-generate-button.tsx`, `src/lib/pm-automation-settings.ts`, `scripts/generate-due-pm.mjs`, `tests/preventive-maintenance-generation.test.ts`, `tests/pm-automation-settings.test.ts`
- Modify: `src/lib/preventive-maintenance.ts` (ลบ helper ของการสร้างใบงาน)
- Modify: `scripts/run-scheduled-jobs.mjs`, `package.json`
- Create: `src/lib/retired-system-settings.ts`
- Modify: `src/lib/system-setting-defaults.ts`, `src/lib/validations/system-settings.ts`, `src/lib/settings-search.ts`, `src/components/admin/system-settings-form.tsx`, `src/app/[locale]/(dashboard)/admin/settings/page.tsx`
- Modify: `src/lib/production-readiness.ts`, `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`
- Modify: `src/lib/rbac-route-matrix.ts`
- Modify: `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`
- Modify: `messages/th.json`, `messages/en.json` (ลบ `systemSettingsPage.pmAutoGeneration*`)
- Test: `tests/pm-generation-removed.test.ts`, `tests/package-scripts.test.ts`, `tests/production-readiness.test.ts`, `tests/maintenance-plan-routes.test.ts`, `tests/maintenance-i18n.test.ts`

**Interfaces:**
- Produces: `retiredSystemSettingKeys: ReadonlySet<string>` ใน `src/lib/retired-system-settings.ts` (ไฟล์ไม่มี import เพื่อให้ test import ตรงได้ — `system-setting-defaults.ts` มี runtime import แบบ `@/` · คือแถวเก่าใน DB ที่ไม่แสดงในหน้าตั้งค่า) · scheduler heartbeat เหลือ job `ldap_sync` · readiness นับ scheduler token 2 ตัว (`LDAP_SYNC_TOKEN`, `NOTIFICATION_DIGEST_TOKEN`)

- [ ] **Step 1: Write the failing tests**

`tests/pm-generation-removed.test.ts`:

```typescript
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { retiredSystemSettingKeys } from "../src/lib/retired-system-settings.ts"

test("PM reminders replace automatic PM work orders", () => {
  for (const file of [
    "src/app/api/maintenance-plans/generate-due/route.ts",
    "src/app/api/maintenance-plans/[id]/generate-ticket/route.ts",
    "src/lib/preventive-maintenance-ticket-generator.ts",
    "src/components/maintenance/maintenance-plan-generate-button.tsx",
    "src/lib/pm-automation-settings.ts",
    "scripts/generate-due-pm.mjs",
  ]) {
    assert.equal(existsSync(file), false, file)
  }
  assert.doesNotMatch(readFileSync("scripts/run-scheduled-jobs.mjs", "utf8"), /pm_generate_due|MAINTENANCE_PM_GENERATION_TOKEN/)
  assert.doesNotMatch(readFileSync("src/components/admin/system-settings-form.tsx", "utf8"), /pmAutoGeneration/)
})

test("old PM and maintenance-approval setting rows stay hidden in the settings screen", () => {
  for (const key of ["pm_auto_generation_enabled", "pm_auto_generation_mode", "pm_auto_generation_schedule", "pm_auto_generation_last_run_at", "pm_auto_generation_last_status", "pm_auto_generation_last_error", "workflow_approval_maintenance_close_required"]) {
    assert.equal(retiredSystemSettingKeys.has(key), true, key)
  }
  assert.match(readFileSync("src/components/admin/system-settings-form.tsx", "utf8"), /retiredSystemSettingKeys\.has\(setting\.key\)/)
})
```

`tests/package-scripts.test.ts`: แทนบรรทัด `assert.equal(packageJson.scripts["pm:generate-due:scheduled"], ...)` ด้วย

```typescript
  assert.equal(packageJson.scripts["pm:generate-due"], undefined)
  assert.equal(packageJson.scripts["pm:generate-due:scheduled"], undefined)
```

`tests/production-readiness.test.ts`: ลบทุกบรรทัด `maintenancePmGenerationToken: ...,` และ `{ name: "pm_generate_due", status: ... },` ในทุก fixture · ใน test แรก (`"marks core production readiness checks as pass..."`) เพิ่ม

```typescript
  assert.equal(checks.find((check) => check.key === "schedulerTokens")?.value, "2/2 configured")
```

`tests/maintenance-plan-routes.test.ts`: ลบ test `"due generation uses a larger bounded candidate window"`

`tests/maintenance-i18n.test.ts`: ลบบรรทัด `"src/components/maintenance/maintenance-plan-generate-button.tsx",` จาก `files`

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/pm-generation-removed.test.ts tests/package-scripts.test.ts tests/production-readiness.test.ts`
Expected: FAIL — `retiredSystemSettingKeys` ยังไม่มี · script `pm:generate-due:scheduled` ยังอยู่ · `3/3 configured`

- [ ] **Step 3: ลบไฟล์**

```bash
git rm src/app/api/maintenance-plans/generate-due/route.ts "src/app/api/maintenance-plans/[id]/generate-ticket/route.ts" src/lib/preventive-maintenance-ticket-generator.ts src/components/maintenance/maintenance-plan-generate-button.tsx src/lib/pm-automation-settings.ts scripts/generate-due-pm.mjs tests/preventive-maintenance-generation.test.ts tests/pm-automation-settings.test.ts
```

- [ ] **Step 4: `src/lib/preventive-maintenance.ts`** — ลบ `PreventiveMaintenanceTicketPlan`, `PreventiveMaintenanceGenerationPlanInput`, `PreventiveMaintenanceDuplicatePlanInput`, `isPreventiveMaintenancePlanDue`, `buildPreventiveMaintenanceTicketPrefix`, `buildPreventiveMaintenanceDuplicateTicketWhere`, `buildPreventiveMaintenanceTicketProblem`, `buildPreventiveMaintenanceTicketDraft` และ `normalizeMaintenancePlanFrequency` (ถ้าไม่มีใครใช้แล้ว) · ตรวจ: `git grep -nE "buildPreventiveMaintenance|isPreventiveMaintenancePlanDue|PreventiveMaintenance(TicketPlan|GenerationPlanInput|DuplicatePlanInput)" -- src tests` → ต้องไม่มีผล

- [ ] **Step 5: scheduler** — `scripts/run-scheduled-jobs.mjs` ลบ object `{ name: "pm_generate_due", ... }` ออกจาก `jobs` (เหลือ `ldap_sync`) · `package.json` ลบ `"pm:generate-due"` และ `"pm:generate-due:scheduled"`

- [ ] **Step 6: ค่าตั้ง**

`src/lib/system-setting-defaults.ts`:
- ลบ export `pmAutoGeneration*` ทั้งหมด (ทั้ง key เดี่ยว, `pmAutoGenerationSettingKeys`, `pmAutoGenerationStatusSettingKeys`) และ 3 แถวใน default list ที่ใช้ key เหล่านั้น

สร้าง `src/lib/retired-system-settings.ts`:

```typescript
// Rows written by features removed in 2026-10 (PM auto-generation and the maintenance close
// approval). Existing databases keep them; the settings screen hides them.
export const retiredSystemSettingKeys: ReadonlySet<string> = new Set([
  "pm_auto_generation_enabled",
  "pm_auto_generation_mode",
  "pm_auto_generation_schedule",
  "pm_auto_generation_last_run_at",
  "pm_auto_generation_last_status",
  "pm_auto_generation_last_error",
  "workflow_approval_maintenance_close_required",
])
```

`src/lib/validations/system-settings.ts`: ลบ import `pmAutoGeneration*` · `schedulerModeKeys = new Set<string>(["ldap_sync_mode"])` · `schedulerScheduleKeys = new Set<string>(["ldap_sync_schedule"])` · ลบบล็อก `if (setting.key === pmAutoGenerationEnabledKey && ...) { ... }`

`src/lib/settings-search.ts`: `if (key.startsWith("pm_") || key.startsWith("notification_digest_")) return "automation"` → `if (key.startsWith("notification_digest_")) return "automation"`

`src/components/admin/system-settings-form.tsx`:
- ลบ import `pmAutoGeneration*` และ import จาก `@/lib/pm-automation-settings` · เพิ่ม `import { retiredSystemSettingKeys } from "@/lib/retired-system-settings"`
- ลบ `...pmAutoGenerationSettingKeys,` และ `...pmAutoGenerationStatusSettingKeys,` ใน `friendlySettingKeys`
- ลบ `pmSchedulePresets`, state `customPmScheduleSelected`, ฟังก์ชัน `setPmAutomationUiMode`, ตัวแปร `pmSchedule`, `pmAutomationUiMode`, `showPmAutomationSchedule`, `selectedPmSchedulePreset`, `selectedPmSchedulePresetItem`, `selectedPmScheduleLabel`, `pmAutomationOptions`
- `const hasInvalidSchedulerSchedule = !isSupportedCronExpression(syncSchedule)`
- ใน overview cards ลบ object ที่ `label: labels.overviewAutomation`
- ในแท็บ `automation` ลบ `<div className="rounded-md border border-border bg-background p-4">` ก้อน PM ทั้งก้อน (ตั้งแต่ `<h3 ...>{labels.pmAutoGeneration}</h3>` จนปิด div) · คง `schedulerHeartbeatNote` และ `ValidationMessage`
- ใน type ของ `labels` ลบ key `pmAutoGeneration*` ทั้ง 17 ตัว
- `const generalSettings = settings.filter((setting) => !friendlySettingKeys.has(setting.key) && !retiredSystemSettingKeys.has(setting.key))`

`src/app/[locale]/(dashboard)/admin/settings/page.tsx`: ลบ 17 บรรทัด `pmAutoGeneration...: t("pmAutoGeneration...")`

messages: ลบ key `systemSettingsPage.pmAutoGeneration*` ทั้งหมดจากทั้งสองไฟล์ (ใช้ node ตรวจว่าเหลือ 0: `node -e "for (const f of ['th','en']) { const s = require('./messages/' + f + '.json').systemSettingsPage; console.log(f, Object.keys(s).filter((k) => k.startsWith('pmAutoGeneration')).length) }"` → `th 0`, `en 0`)

- [ ] **Step 7: readiness**

`src/lib/production-readiness.ts`: ลบ `maintenancePmGenerationToken?: string` จาก type · ใน `getSchedulerTokensStatus` และ `getSchedulerTokensValue` ลบ `deployment?.maintenancePmGenerationToken,` และเปลี่ยน value เป็น:

```typescript
function getSchedulerTokensValue(deployment?: ProductionReadinessDeploymentInput) {
  const tokens = [deployment?.ldapSyncToken, deployment?.notificationDigestToken]
  const configured = tokens.filter((token) => isConfiguredSecret(token)).length
  return `${configured}/${tokens.length} configured`
}
```

`src/app/[locale]/(dashboard)/admin/readiness/page.tsx`: ลบบรรทัด `maintenancePmGenerationToken: process.env.MAINTENANCE_PM_GENERATION_TOKEN,` · ลบ `{ name: "pm_generate_due", status: settings.get(pmAutoGenerationLastStatusKey) },` · ลบ `pmAutoGenerationLastStatusKey` จาก import (และจาก list ของ key ที่ query settings ถ้ามี)

- [ ] **Step 8: RBAC matrix** — `src/lib/rbac-route-matrix.ts` ลบสอง entry ที่ `filePath` เป็น `src/app/api/maintenance-plans/[id]/generate-ticket/route.ts` และ `src/app/api/maintenance-plans/generate-due/route.ts` · ถ้ามีรายการ custom-auth/scheduler ที่อ้าง `generate-due` ในไฟล์เดียวกันให้ลบด้วย

- [ ] **Step 9: เอกสาร deploy** — `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`: ลบบรรทัด/หัวข้อที่อ้าง `MAINTENANCE_PM_GENERATION_TOKEN`, `pm:generate-due`, `generate-due-pm`, `pm_generate_due` (ใช้ `git grep -n "PM_GENERATION\|pm:generate\|generate-due\|pm_generate" DEPLOYMENT_UBUNTU_CLOUDFLARE.md` หาจุด) และเพิ่มย่อหน้าเดียวในหัวข้อ scheduler:

```markdown
> ตั้งแต่ 2026-10 ระบบไม่สร้างใบงาน PM อัตโนมัติแล้ว แผน PM เป็นตัวเตือน ("PM ถึงกำหนด" ในหน้าซ่อมบำรุง) ไม่ต้องตั้ง `MAINTENANCE_PM_GENERATION_TOKEN` และให้ลบ systemd timer ของ `pm:generate-due` ถ้าเคยตั้งไว้
```

- [ ] **Step 10: Run tests + tsc**

Run: `node --test tests/pm-generation-removed.test.ts tests/package-scripts.test.ts tests/production-readiness.test.ts tests/maintenance-plan-routes.test.ts tests/maintenance-i18n.test.ts tests/rbac-route-matrix.test.ts tests/preventive-maintenance.test.ts tests/pm-due-dates.test.ts tests/system-settings*.test.ts tests/settings-search.test.ts`
Expected: PASS (glob ที่ไม่มีไฟล์ให้ตัดออก)
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0

- [ ] **Step 11: Commit**

```bash
git add -A src scripts package.json DEPLOYMENT_UBUNTU_CLOUDFLARE.md messages tests
git commit -m "feat(maintenance): retire automatic PM work orders" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: คืนของแบบ "ส่งซ่อม"

**Files:**
- Modify: `src/lib/asset-status-flow.ts`
- Modify: `src/lib/validations/asset-operations.ts`
- Modify: `src/app/api/assets/[id]/checkin/route.ts`
- Modify: `src/components/asset-operations/checkin-form.tsx`
- Modify: `messages/th.json`, `messages/en.json` (`checkin.sendToRepair*`)
- Test: `tests/checkin-maintenance-ticket-route.test.ts` (เขียนใหม่), `tests/checkin-send-to-repair-ui.test.ts`

**Interfaces:**
- Consumes: Task 4 `generateRepairNo(tx, now)`, Task 2 `openRepairRecordWhere`
- Produces: `checkinReturnStatusNames = ["Ready", "Under Maintenance", "Pending Disposal"]` · คืนของด้วยสถานะ `Under Maintenance` → สร้างบันทึก `in_progress` (ถ้ายังไม่มีบันทึกที่ยังไม่เสร็จ) · ผู้บันทึก = พนักงานของบัญชี → ผู้รับคืน → `maintenanceReportedById` · ไม่มีเลย → 400 `MAINTENANCE_REPORTER_REQUIRED`

- [ ] **Step 1: เขียน test ใหม่แทน `tests/checkin-maintenance-ticket-route.test.ts`**

คงส่วนบนของไฟล์เดิม (imports, `mockedModuleSources`, `registerHooks`, `const route = await import(...)`) แล้วแก้ดังนี้:
- type ของ state: `type CheckinState = { calls: Array<{ call: string; args: Record<string, unknown> }>; openRecords: number }` และ `const state: CheckinState = { calls: [], openRecords: 0 }`
- ใน mock `@/lib/db` แทนบรรทัด `if (name === "assetStatus") return { id: "status:Pending Repair", name: "Pending Repair" }` ด้วย

```javascript
            if (name === "assetStatus") {
              const id = args?.where?.id ?? "status:Ready"
              return { id, name: String(id).replace("status:", "") }
            }
            if (name === "maintenanceTicket" && method === "count") return state().openRecords
```

  (วางก่อนบรรทัด `if (method === "count") return 0`)

แทน test เดิมทั้งหมดด้วย:

```typescript
function checkinRequest(nextStatusId: string, extra: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/assets/asset-1/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      checkoutId: "co-1",
      returnDate: "2026-10-07",
      returnBy: "สมชาย",
      receiveBy: "สมหญิง",
      conditionAfter: "condition-damaged",
      damageNote: "จอแตก",
      nextStatusId,
      nextLocationId: "loc-1",
      ...extra,
    }),
  })
}

const context = { params: Promise.resolve({ id: "asset-1" }) }

test("returning an asset as 'send for repair' opens an unfinished repair record", async () => {
  state.calls = []
  state.openRecords = 0
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)

  assert.equal(response.status, 201, await response.clone().text())
  const ticket = state.calls.find(({ call }) => call === "maintenanceTicket.create")?.args.data as Record<string, unknown>
  assert.equal(ticket.repairStatus, "in_progress")
  assert.equal(ticket.reportedById, "emp-1")
  assert.match(String(ticket.problem), /จอแตก/)
})

test("an asset that already has an unfinished record does not get a second one", async () => {
  state.calls = []
  state.openRecords = 1
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)

  assert.equal(response.status, 201, await response.clone().text())
  assert.equal(state.calls.some(({ call }) => call === "maintenanceTicket.create"), false)
  state.openRecords = 0
})

test("returning to Ready does not create a repair record", async () => {
  state.calls = []
  const response = await route.POST(checkinRequest("status:Ready"), context)

  assert.equal(response.status, 201, await response.clone().text())
  assert.equal(state.calls.some(({ call }) => call === "maintenanceTicket.create"), false)
})
```

`tests/checkin-send-to-repair-ui.test.ts`:

```typescript
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("check-in offers send-for-repair instead of a separate repair checkbox", () => {
  const form = readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
  assert.doesNotMatch(form, /createMaintenance/)
  assert.match(form, /"Under Maintenance"/)
  assert.match(form, /toLocalDateInputValue\(\)/)
  assert.doesNotMatch(form, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/)
})

test("check-in return statuses send damaged assets to repair, not to Pending Repair", () => {
  const flow = readFileSync("src/lib/asset-status-flow.ts", "utf8")
  assert.match(flow, /\["Ready", "Under Maintenance", "Pending Disposal"\]/)
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/checkin-maintenance-ticket-route.test.ts tests/checkin-send-to-repair-ui.test.ts`
Expected: FAIL — ไม่มี `maintenanceTicket.create` เมื่อเลือก Under Maintenance · form ยังมี `createMaintenance`

- [ ] **Step 3: `src/lib/asset-status-flow.ts`**

```typescript
export const checkinReturnStatusNames = ["Ready", "Under Maintenance", "Pending Disposal"] as const
```

- [ ] **Step 4: `src/lib/validations/asset-operations.ts`** — ใน `assetCheckinSchema` ลบ `createMaintenance: optionalBoolean,` และลบ `.superRefine(...)` ท้าย schema ทั้งก้อน (คง `maintenanceReportedById: optionalText,` และ `maintenanceProblem: optionalText,`) · ถ้า `optionalBoolean` ไม่มีใครใช้แล้วในไฟล์ ให้ลบ import/นิยามด้วย

- [ ] **Step 5: check-in route — `src/app/api/assets/[id]/checkin/route.ts`**

เพิ่ม import:

```typescript
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import { generateRepairNo } from "@/lib/repair-record-service"
```

ลบ `import type { Prisma } from "@prisma/client"` ถ้าไม่มีใครใช้แล้ว (เดิมใช้กับ `generateRepairNo` ท้ายไฟล์)

แทนบล็อก `if (input.createMaintenance) { ... }` ที่อยู่ก่อน `prisma.$transaction` ด้วย:

```typescript
    // "Send for repair" is the Under Maintenance return status; it opens the repair record
    // in the same transaction so the asset never sits in a repair status without one.
    const sendsToRepair = returnStatus?.name === "Under Maintenance"
    const repairReporterId = sendsToRepair
      ? user.employeeId ?? input.receiveByEmployeeId ?? input.maintenanceReportedById ?? null
      : null
    if (sendsToRepair) {
      requirePermission(user, "maintenance", "create")
      if (!repairReporterId) {
        return NextResponse.json({ code: "MAINTENANCE_REPORTER_REQUIRED", error: "Select who is recording this repair" }, { status: 400 })
      }
    }
```

แทนบล็อก `if (input.createMaintenance) { ... }` ภายใน transaction ด้วย:

```typescript
      if (sendsToRepair && repairReporterId) {
        const openRecords = await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } })
        if (openRecords === 0) {
          const problem = input.maintenanceProblem ?? buildMaintenanceProblem(input)
          const ticket = await tx.maintenanceTicket.create({
            data: {
              repairNo: await generateRepairNo(tx, new Date()),
              assetId: id,
              problem,
              reportedById: repairReporterId,
              reportedDate: input.returnDate,
              repairType: "internal",
              repairStatus: "in_progress",
              createdBy: user.id,
              updatedBy: user.id,
            },
            select: { id: true },
          })

          await tx.assetMovement.create({
            data: {
              assetId: id,
              movementType: "maintenance_create",
              fromValue: beforeAsset.statusId,
              toValue: input.nextStatusId,
              reason: problem,
              referenceType: "maintenance",
              referenceId: ticket.id,
              performedBy: user.id,
              remark: "created_from_checkin",
            },
          })
        }
      }
```

ใน `parseCheckinRequest` ลบบรรทัด `createMaintenance: requiredFormText(formData, "createMaintenance"),`

แทน `buildMaintenanceProblem` ด้วยข้อความไทย และลบฟังก์ชัน `generateRepairNo` ท้ายไฟล์:

```typescript
function buildMaintenanceProblem(input: {
  damageNote?: string | null
  missingAccessories?: string | null
  remark?: string | null
}) {
  return [
    input.damageNote ? `ความเสียหาย: ${input.damageNote}` : null,
    input.missingAccessories ? `อุปกรณ์ไม่ครบ: ${input.missingAccessories}` : null,
    input.remark ? `หมายเหตุตอนรับคืน: ${input.remark}` : null,
  ].filter(Boolean).join("\n") || "ส่งซ่อมตอนรับคืน"
}
```

- [ ] **Step 6: check-in form — `src/components/asset-operations/checkin-form.tsx`**

- เพิ่ม `import { toLocalDateInputValue } from "@/lib/local-date"` · `returnDate: new Date().toISOString().slice(0, 10),` → `returnDate: toLocalDateInputValue(),`
- ลบ state `createMaintenance` และฟังก์ชัน `handleCreateMaintenanceChange` · ลบ `maintenanceReportedById: "",` จาก `values`
- `const pendingRepairStatus = statuses.find((status) => status.name === "Pending Repair")` → `const repairStatus = statuses.find((status) => status.name === "Under Maintenance")` · `const canCreateMaintenance = ...` → `const sendsToRepair = selectedStatus?.name === "Under Maintenance"`
- ใน `setField` ลบบล็อก `if (field === "nextStatusId") { ... setCreateMaintenance(false) }`
- ใน `handleDamageNoteChange` เปลี่ยน `pendingRepairStatus` เป็น `repairStatus`
- ในขั้นตรวจก่อน review ลบบล็อก `if (createMaintenance && canCreateMaintenance && !values.maintenanceReportedById) { ... }`
- ใน `submitCheckin` ลบบรรทัด `body.set("createMaintenance", ...)`
- ใน `<Select label={t("nextStatus")} ...>` เปลี่ยน option เป็น `{status.name === "Under Maintenance" ? t("sendToRepairOption") : status.label}`
- แทนกล่อง checkbox สร้างใบซ่อมทั้งก้อน (`<div className="md:col-span-2 rounded-md border border-border bg-background p-4"> ... </div>` ที่มี `checked={createMaintenance}`) ด้วย:

```tsx
          {sendsToRepair ? (
            <div className="md:col-span-2 rounded-md border border-warning/30 bg-warning/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wrench className="h-4 w-4" />
                {t("sendToRepairTitle")}
              </p>
              <p className="mt-1 text-xs text-warning-foreground">{t("sendToRepairHelp")}</p>
              <div className="mt-3">
                <Field label={t("maintenanceProblem")}>
                  <textarea value={values.maintenanceProblem} onChange={(event) => setField("maintenanceProblem", event.target.value)} rows={3} className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder={t("maintenanceProblemPlaceholder")} />
                </Field>
              </div>
            </div>
          ) : null}
```

ตรวจ: `git grep -n "createMaintenance\|canCreateMaintenance\|pendingRepairStatus" -- src/components/asset-operations/checkin-form.tsx` → ต้องไม่มีผล

- [ ] **Step 7: messages** — เพิ่มใน namespace `checkin` (ทั้งสองไฟล์):

| key | th | en |
|---|---|---|
| `sendToRepairOption` | ส่งซ่อม | Send for repair |
| `sendToRepairTitle` | ส่งซ่อม | Send for repair |
| `sendToRepairHelp` | ระบบจะสร้างบันทึกซ่อม (ยังซ่อมไม่เสร็จ) ให้อัตโนมัติ เมื่อซ่อมเสร็จให้กด "ซ่อมเสร็จ" ที่บันทึกนั้น | A repair record (not finished) is created automatically. Press "Repair finished" on it when the repair is done |

- [ ] **Step 8: Run tests + tsc**

Run: `node --test tests/checkin-maintenance-ticket-route.test.ts tests/checkin-send-to-repair-ui.test.ts tests/asset-operation-options.test.ts tests/legacy-checkin-flow.test.ts`
Expected: PASS (ไฟล์ที่ไม่มีอยู่ให้ตัดออก)
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0

- [ ] **Step 9: Commit**

```bash
git add src/lib/asset-status-flow.ts src/lib/validations/asset-operations.ts "src/app/api/assets/[id]/checkin/route.ts" src/components/asset-operations/checkin-form.tsx messages/th.json messages/en.json tests/checkin-maintenance-ticket-route.test.ts tests/checkin-send-to-repair-ui.test.ts
git commit -m "feat(checkin): send damaged returns straight to repair" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: เลิกขั้นตอนอนุมัติปิดงานซ่อม

**Files:**
- Modify: `src/lib/workflow-approval.ts`, `src/lib/system-setting-defaults.ts`, `src/components/admin/system-settings-form.tsx`, `src/app/[locale]/(dashboard)/admin/settings/page.tsx`
- Modify: `src/lib/approval-inbox.ts`, `src/lib/approval-inbox-query.ts`, `src/lib/approval-inbox-filter.ts`, `src/lib/approval-permission-matrix.ts`
- Modify: `src/app/[locale]/(dashboard)/admin/approvals/page.tsx`, `src/components/layout/sidebar.tsx`
- Modify: `src/lib/dashboard-action-cards.ts`, `src/lib/work-center-metrics.ts` (เฉพาะ type `maintenance` ของ approval counts), `src/app/[locale]/(dashboard)/dashboard/page.tsx`, `src/app/[locale]/(dashboard)/work-center/page.tsx` (เฉพาะ default counts)
- Test: `tests/approval-inbox.test.ts`, `tests/approval-inbox-filter.test.ts`, `tests/approval-permission-matrix.test.ts`, `tests/workflow-approval.test.ts`, `tests/dashboard-action-cards.test.ts`, `tests/work-center-metrics.test.ts`

**Interfaces:**
- Produces:
  - `WorkflowApprovalPolicy = { disposalRequired; auditCloseRequired; minApprovers; segregationRequired; slaDays }`
  - `ApprovalInboxKind = "disposal_review" | "audit_finding_review" | "audit_round_close"` · `ApprovalInboxItem.module: "disposal" | "audit"`
  - `ApprovalInboxAccess = { canApproveDisposal; canApproveAudit; canAnyApproval }` · `ApprovalInboxCounts = { total; disposal; audit }`
  - `approvalInboxFilters = ["all", "disposal", "audit"]` · `ApprovalWorkflowKey = "disposal" | "audit"`
  - `summarizeApprovalInbox(items) → { total; disposal; audit }`
- ประวัติการตัดสินใจเดิม (`approval-decision-log.ts`) ไม่แก้ — log ปิดงานซ่อมเก่ายังค้นได้

- [ ] **Step 1: Update the tests first**

- `tests/workflow-approval.test.ts`: ลบ `maintenanceCloseRequired` ออกจาก object ที่คาดหวังทุกจุด และเพิ่ม test:

```typescript
test("the maintenance close approval setting no longer exists", () => {
  const policy = parseWorkflowApprovalPolicy([{ key: "workflow_approval_maintenance_close_required", value: "true" }])
  assert.equal("maintenanceCloseRequired" in policy, false)
})
```

  (import `parseWorkflowApprovalPolicy` ถ้ายังไม่มี)
- `tests/approval-inbox.test.ts`: ลบ `maintenanceCloseRequired` จาก policy fixture, ลบ `maintenanceTickets: [...]` จาก source fixture, ลบแถว `["maintenance_close", ...]` จากผลที่คาดหวัง และลบ `maintenance` จาก summary ที่คาดหวัง
- `tests/approval-inbox-filter.test.ts`: `parseApprovalInboxFilter("maintenance")` ต้องได้ `"all"` · ลบ item `module: "maintenance"` จาก fixture และผลที่คาดหวัง
- `tests/approval-permission-matrix.test.ts`: เปลี่ยน assertion ของ workflow `maintenance` เป็น `assert.equal(matrix.find((item) => item.key === ("maintenance" as never)), undefined)` และจำนวน workflow ที่คาดหวังเหลือ 2
- `tests/dashboard-action-cards.test.ts`, `tests/work-center-metrics.test.ts`: ลบ `maintenance: n,` ออกจาก `approvalInbox` ใน fixture ทุกจุด · ใน `work-center-metrics.test.ts` test แรก เพิ่ม `"completedMaintenance",` ต่อจาก `"waitingMaintenance",` ในผลที่คาดหวัง (key ชุดนี้ถูกแทนทั้งหมดใน Task 13)

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/workflow-approval.test.ts tests/approval-inbox.test.ts tests/approval-inbox-filter.test.ts tests/approval-permission-matrix.test.ts`
Expected: FAIL — policy ยังมี `maintenanceCloseRequired` · filter ยังรับ `"maintenance"`

- [ ] **Step 3: `src/lib/workflow-approval.ts`** — ลบ `workflowApprovalMaintenanceCloseRequiredKey` (export และใน `workflowApprovalSettingKeys`), ลบ `maintenanceCloseRequired` จาก type, defaults และ `parseWorkflowApprovalPolicy`

`src/lib/system-setting-defaults.ts`: ลบ import และแถว default `{ key: workflowApprovalMaintenanceCloseRequiredKey, ... }` (key นี้อยู่ใน `retiredSystemSettingKeys` ของ `src/lib/retired-system-settings.ts` แล้วจาก Task 10)

`src/components/admin/system-settings-form.tsx`: ลบ import `workflowApprovalMaintenanceCloseRequiredKey`, ลบ `<ToggleField label={labels.workflowApprovalMaintenanceCloseRequired} ... />` และ key `workflowApprovalMaintenanceCloseRequired` จาก type ของ `labels` · `src/app/[locale]/(dashboard)/admin/settings/page.tsx` ลบบรรทัด `workflowApprovalMaintenanceCloseRequired: t(...)`

- [ ] **Step 4: approval inbox**

`src/lib/approval-inbox.ts`: ลบ `"maintenance_close"` จาก `ApprovalInboxKind`, `module` เหลือ `"disposal" | "audit"`, ลบ `maintenanceTickets` จาก `ApprovalInboxSource`, ลบบล็อก `if (source.policy.maintenanceCloseRequired) { ... }`, ลบ `maintenance:` จาก `summarizeApprovalInbox`, ลบ `maintenanceReady` / `maintenanceAction` ทั้งสองภาษา

`src/lib/approval-inbox-query.ts`:
- `ApprovalInboxAccess` ลบ `canCloseMaintenance` · `ApprovalInboxCounts` ลบ `maintenance`
- ใน `getApprovalInboxSnapshot` ลบ query `maintenanceTickets` (เหลือ `[disposalRequests, auditFindings, auditRoundsReadyToClose]`) และลบ `maintenanceTickets: ...` ที่ส่งให้ `buildApprovalInboxItems`
- ใน `getApprovalInboxCounts` คืน `{ total: 0, disposal: 0, audit: 0 }` เมื่อไม่มีสิทธิ์ · ลบ query count ของซ่อม · `total: disposal + audit`
- `getApprovalInboxAccess`:

```typescript
export function getApprovalInboxAccess(user: SessionUser): ApprovalInboxAccess {
  const canApproveDisposal = hasPermission(user, "disposal", "approve")
  const canApproveAudit = hasPermission(user, "audit", "approve")

  return {
    canApproveDisposal,
    canApproveAudit,
    canAnyApproval: canApproveDisposal || canApproveAudit,
  }
}
```

`src/lib/approval-inbox-filter.ts`: `export const approvalInboxFilters = ["all", "disposal", "audit"] as const`

`src/lib/approval-permission-matrix.ts`: `ApprovalWorkflowKey = "disposal" | "audit"` · ลบแถว `{ key: "maintenance", module: "maintenance", action: "edit" }` · ถ้ามี label ของ key `maintenance` ในหน้า readiness/approvals (`git grep -n "approvalMatrix\|workflowKey" -- src`) ให้ลบด้วย

`src/app/[locale]/(dashboard)/admin/approvals/page.tsx`: ลบ `<SummaryCard label={t("maintenance")} ... />` และเปลี่ยน grid เป็น `md:grid-cols-3` · ลบ `<PolicyBadge label={t("policyMaintenance")} ... />` · ลบบรรทัด `if (kind === "maintenance_close") return <Wrench ... />` (และ import `Wrench` ถ้าไม่ใช้แล้ว) · `moduleLabel` ลบ `maintenance` ทั้งสองภาษา

`src/components/layout/sidebar.tsx`: ลบ `{ module: "maintenance", action: "edit" },` จาก `anyPermissions` ของ `approvalInbox`

`src/lib/dashboard-action-cards.ts` และ `src/lib/work-center-metrics.ts`: ลบ `maintenance: number` จาก type ของ approval inbox counts · ใน `work-center-metrics.ts` ลบเงื่อนไข `approvalInbox.maintenance === 0` (ให้ push `"completedMaintenance"` ตรง ๆ ไปก่อน — key นี้ถูกแทนใน Task 13)

`dashboard/page.tsx`: `emptyApprovalInboxCounts` เป็น `{ total: 0, disposal: 0, audit: 0 }` · `work-center/page.tsx`: `approvalInboxSnapshot?.summary ?? { total: 0, disposal: 0, audit: 0 }` และ `visibleMaintenanceItems` เป็น `maintenanceItems` (ไม่กรองตาม approval แล้ว)

- [ ] **Step 5: Run tests + tsc**

Run: `node --test tests/workflow-approval.test.ts tests/approval-inbox.test.ts tests/approval-inbox-filter.test.ts tests/approval-permission-matrix.test.ts tests/approval-decision-log.test.ts tests/dashboard-action-cards.test.ts tests/work-center-metrics.test.ts tests/system-settings*.test.ts`
Expected: PASS
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0 — ถ้ายังมีจุดที่อ้าง `canCloseMaintenance`, `maintenanceCloseRequired` หรือ `.maintenance` ของ approval counts ให้ลบตาม error

- [ ] **Step 6: Commit**

```bash
git add -A src messages tests
git commit -m "feat(approvals): drop the maintenance close approval" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Dashboard · ศูนย์งานค้าง · แจ้งเตือน

**Files:**
- Modify: `src/lib/dashboard-action-cards.ts`, `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- Modify: `src/lib/work-center-metrics.ts`, `src/lib/work-center-view.ts`, `src/app/[locale]/(dashboard)/work-center/page.tsx`
- Modify: `src/lib/notification-summary-items.ts`, `src/lib/notification-summary.ts`, `src/lib/notification-digest-format.ts`
- Modify: `messages/th.json`, `messages/en.json` (`dashboard`, `workCenter`, `notifications`)
- Test: `tests/dashboard-action-cards.test.ts`, `tests/work-center-metrics.test.ts`, `tests/work-center-view.test.ts`, `tests/notification-summary.test.ts`, `tests/notification-digest.test.ts`, `tests/notification-maintenance-query.test.ts` (เขียนใหม่)

**Interfaces:**
- Consumes: Task 2 `openRepairRecordWhere`, Task 3 `buildDuePmPlanWhere(now)`
- Produces:
  - `DashboardActionCardKey`: `"approvalInbox" | "openRepairs" | "pendingAuditFindings" | "pendingDisposals" | "approvedDisposals"` · counts มี `openRepairs: number`
  - `WorkCenterMetricKey`: แทน `overdueMaintenance | waitingMaintenance | completedMaintenance` ด้วย `openRepairs | duePm` · `WorkCenterUrgentCountInput` ไม่มี field ของซ่อม (งานซ่อมไม่นับเป็นงานด่วนเพราะไม่มี SLA แล้ว)
  - `NotificationSummaryCounts`: แทน `overdueMaintenance`, `completedMaintenanceAwaitingClose` ด้วย `duePm` · item `{ key: "duePm", href: "/{locale}/maintenance#pm-due", tone: "warning" }`

- [ ] **Step 1: Update the tests first**

`tests/dashboard-action-cards.test.ts`: ใน fixture ทั้งสอง test แทน `overdueMaintenance: 3,` ด้วย `openRepairs: 3,` และแทน `"overdueMaintenance"` ในผลที่คาดหวังด้วย `"openRepairs"`

`tests/work-center-metrics.test.ts`:
- test แรกคาดหวัง `["approvalInbox", "missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "duePm", "openAuditActions", "pendingAuditItems", "approvedDisposals"]`
- test ที่สองคาดหวัง `["missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "pendingAuditItems", "pendingDisposals", "approvedDisposals"]`
- test urgent count: ลบ `overdueMaintenance: 3,` จาก input และค่าที่คาดหวังเป็น `12`

`tests/work-center-view.test.ts`: ในรายการ key ของ overview / maintenance แทน `"overdueMaintenance", "waitingMaintenance", "completedMaintenance"` ด้วย `"openRepairs", "duePm"`

`tests/notification-summary.test.ts`: ใน fixture แทน `overdueMaintenance` และ `completedMaintenanceAwaitingClose` ด้วย `duePm` (ค่าเดียว) · ปรับผลที่คาดหวังตามนั้น · แทน test `"separates completed maintenance awaiting closure from overdue maintenance"` ด้วย:

```typescript
test("PM due within the reminder window links to the maintenance page", () => {
  const items = buildNotificationSummaryItems("th", { ...emptyCounts(), duePm: 2 })
  assert.deepEqual(items.map((item) => [item.key, item.href, item.tone]), [["duePm", "/th/maintenance#pm-due", "warning"]])
})
```

  (ถ้าไฟล์ยังไม่มี helper `emptyCounts()` ให้สร้างในไฟล์ test ที่คืน counts ทุก key เป็น 0)

`tests/notification-digest.test.ts`: แทน item fixture `overdueMaintenance` / `completedMaintenanceAwaitingClose` ด้วย `{ key: "duePm", count: 2, href: "/th/maintenance#pm-due", tone: "warning" }` และถ้ามีการตรวจข้อความ ให้คาดหวัง `"PM ถึงกำหนด"`

`tests/notification-maintenance-query.test.ts` แทนทั้งไฟล์:

```typescript
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("maintenance notifications remind about due PM instead of SLA or closure", () => {
  const source = readFileSync("src/lib/notification-summary.ts", "utf8")
  assert.match(source, /buildDuePmPlanWhere\(/)
  assert.doesNotMatch(source, /dueDate|completedMaintenanceAwaitingClose|overdueMaintenance/)
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/dashboard-action-cards.test.ts tests/work-center-metrics.test.ts tests/work-center-view.test.ts tests/notification-summary.test.ts tests/notification-digest.test.ts tests/notification-maintenance-query.test.ts`
Expected: FAIL — key เดิมยังเป็น `overdueMaintenance`

- [ ] **Step 3: Dashboard**

`src/lib/dashboard-action-cards.ts`: `"overdueMaintenance"` → `"openRepairs"` ใน `DashboardActionCardKey`, ใน `DashboardActionCardCounts` (`openRepairs: number`) และ `keys.push("openRepairs")`

`dashboard/page.tsx`:
- import `openRepairRecordWhere` จาก `@/lib/repair-record-policy`
- ใน `"dashboard.urgent-work"` แทน count แรกด้วย `prisma.maintenanceTicket.count({ where: openRepairRecordWhere })` และเปลี่ยนชื่อตัวแปร destructure `overdueMaintenance` → `openRepairs` (ทุกจุดในไฟล์)
- card:

```tsx
    openRepairs: {
      label: t("openRepairs"),
      value: openRepairs,
      detail: t("openRepairsDetail"),
      href: `/${locale}/maintenance?status=in_progress`,
      icon: <Wrench className="h-5 w-5" />,
      tone: openRepairs > 0 ? "warning" : "primary",
    },
```

messages `dashboard`: `openRepairs` = th `"ยังซ่อมไม่เสร็จ"` / en `"Repairs in progress"` · `openRepairsDetail` = th `"บันทึกซ่อมที่รอกด \"ซ่อมเสร็จ\""` / en `"Repair records waiting to be marked finished"`

- [ ] **Step 4: ศูนย์งานค้าง**

`src/lib/work-center-metrics.ts`:

```typescript
export type WorkCenterMetricKey =
  | "approvalInbox"
  | "missingCustodian"
  | "missingSerial"
  | "missingPhoto"
  | "openRepairs"
  | "duePm"
  | "pendingAuditFindings"
  | "openAuditActions"
  | "pendingAuditItems"
  | "pendingDisposals"
  | "approvedDisposals"
```

ใน `buildWorkCenterMetricKeys` ให้ push `"missingCustodian", "missingSerial", "missingPhoto", "openRepairs", "duePm"` แล้วต่อด้วยเงื่อนไข audit/disposal เดิม · `WorkCenterUrgentCountInput` ลบ `overdueMaintenance` · `calculateWorkCenterUrgentCount` คืน `approvalCount + auditCount + disposalCount + input.approvedDisposals`

`src/lib/work-center-view.ts`: ใน `metricKeysByFocusPanel` — overview ใช้ `"openRepairs", "duePm"` แทนสาม key เดิม · `maintenance: ["openRepairs", "duePm"]`

`work-center/page.tsx`:
- import `openRepairRecordWhere` จาก `@/lib/repair-record-policy` และ `buildDuePmPlanWhere` จาก `@/lib/preventive-maintenance` · ลบ `openMaintenanceStatuses`, `waitingMaintenanceStatuses`
- แทน 4 where เดิม (`overdueMaintenanceWhere`, `waitingMaintenanceWhere`, `completedMaintenanceWhere`, `maintenanceItemWhere`) ด้วย:

```typescript
  const openRepairWhere = applyMaintenanceWorkCenterScope({ ...openRepairRecordWhere }, isMineView, userScope)
  const duePmWhere = applyPlanWorkCenterScope(buildDuePmPlanWhere(new Date()), isMineView, userScope)
```

- ใน `Promise.all` แทน 3 count เดิมด้วย `prisma.maintenanceTicket.count({ where: openRepairWhere })`, `prisma.maintenancePlan.count({ where: duePmWhere })` (ตัวแปร `openRepairs`, `duePm`) และ query รายการซ่อมเป็น:

```typescript
    isPanelFocused("maintenance") ? prisma.maintenanceTicket.findMany({
      where: openRepairWhere,
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: [{ reportedDate: "asc" }, { createdAt: "asc" }],
      take: maintenanceItemLimit,
    }) : Promise.resolve([]),
```

- `metricMap`: ลบ `overdueMaintenance`, `waitingMaintenance`, `completedMaintenance` แล้วเพิ่ม:

```tsx
    openRepairs: {
      key: "openRepairs",
      label: t("openRepairs"),
      value: openRepairs,
      detail: t("openRepairsDetail"),
      href: `/${locale}/maintenance?status=in_progress`,
      tone: openRepairs > 0 ? "warning" : "muted",
      icon: <Wrench className="h-5 w-5" />,
    },
    duePm: {
      key: "duePm",
      label: t("duePm"),
      value: duePm,
      detail: t("duePmDetail"),
      href: `/${locale}/maintenance#pm-due`,
      tone: duePm > 0 ? "warning" : "muted",
      icon: <Clock className="h-5 w-5" />,
    },
```

- `calculateWorkCenterUrgentCount({...})` ลบ `overdueMaintenance,`
- FollowUpPanel ของ maintenance: `href={\`/${locale}/maintenance?status=in_progress\`}` · item:

```tsx
              <FollowUpItem
                key={ticket.id}
                href={`/${locale}/maintenance/${ticket.id}`}
                title={`${ticket.repairNo} - ${ticket.asset.assetTag}`}
                meta={`${ticket.asset.name} · ${t("repairSince", { date: formatDate(ticket.reportedDate) })}`}
                tone="warning"
              />
```

  (import `formatDate` จาก `@/lib/utils` ถ้ายังไม่มี)
- เพิ่มฟังก์ชันท้ายไฟล์ (ถัดจาก `applyMaintenanceWorkCenterScope`):

```typescript
function applyPlanWorkCenterScope(
  where: Prisma.MaintenancePlanWhereInput,
  active: boolean,
  scope: WorkCenterUserScope,
): Prisma.MaintenancePlanWhereInput {
  const scopeWhere = getScopedWhere<Prisma.MaintenancePlanWhereInput>(scope, ({ employeeId, departmentId }) => ({
    OR: [
      ...(employeeId ? [{ asset: { custodianId: employeeId } }] : []),
      ...(departmentId ? [{ asset: { departmentId } }] : []),
    ],
  }))
  return applyWorkCenterScope(where, active, scopeWhere)
}
```

messages `workCenter`: `openRepairs` = th `"ยังซ่อมไม่เสร็จ"` / en `"Repairs in progress"` · `openRepairsDetail` = th `"บันทึกซ่อมที่รอกด \"ซ่อมเสร็จ\""` / en `"Repair records waiting to be marked finished"` · `duePm` = th `"PM ถึงกำหนด"` / en `"PM due"` · `duePmDetail` = th `"แผน PM ที่ถึงกำหนดภายใน 7 วัน"` / en `"PM plans due within 7 days"` · `repairSince` = th `"ส่งซ่อมเมื่อ {date}"` / en `"In repair since {date}"`

- [ ] **Step 5: แจ้งเตือน**

`src/lib/notification-summary-items.ts`: ใน `NotificationSummaryCounts` แทน `overdueMaintenance` และ `completedMaintenanceAwaitingClose` ด้วย `duePm: number` · แทนสอง item เดิมด้วย:

```typescript
    {
      key: "duePm",
      count: counts.duePm,
      href: `/${locale}/maintenance#pm-due`,
      tone: "warning",
    },
```

`src/lib/notification-summary.ts`: import `buildDuePmPlanWhere` จาก `@/lib/preventive-maintenance` · แทนสอง query ของซ่อมด้วยตัวเดียว:

```typescript
    canMaintenance
      ? prisma.maintenancePlan.count({ where: buildDuePmPlanWhere(new Date()) })
      : Promise.resolve(0),
```

และปรับ destructure (`duePm`) กับ object ที่ส่งให้ `buildNotificationSummaryItems`

`src/lib/notification-digest-format.ts`: ใน `digestLabel` แทนสอง label เดิมด้วย `duePm: "PM ถึงกำหนด"` (th) / `duePm: "PM due"` (en)

messages `notifications`: ลบ `overdueMaintenance`, `overdueMaintenanceDetail`, `completedMaintenanceAwaitingClose`, `completedMaintenanceAwaitingCloseDetail` · เพิ่ม `duePm` = th `"PM ถึงกำหนด"` / en `"PM due"` · `duePmDetail` = th `"แผน PM ที่ถึงกำหนดภายใน 7 วัน กดบันทึกว่าทำแล้วที่หน้าซ่อมบำรุง"` / en `"PM plans due within 7 days. Record them as done on the maintenance page"`

messages `dashboard` / `workCenter`: ลบ `overdueMaintenance`, `overdueMaintenanceDetail`, `waitingMaintenance*`, `completedMaintenance*`, `maintenanceStatus_*` ที่ไม่มีใครใช้แล้ว (ตรวจด้วย `git grep -n "overdueMaintenance\|waitingMaintenance\|completedMaintenance\|maintenanceStatus_" -- src` → ต้องไม่มีผล)

- [ ] **Step 6: Run tests + tsc**

Run: `node --test tests/dashboard-action-cards.test.ts tests/work-center-metrics.test.ts tests/work-center-view.test.ts tests/notification-summary.test.ts tests/notification-digest.test.ts tests/notification-maintenance-query.test.ts tests/dashboard-asset-status.test.ts`
Expected: PASS
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0

- [ ] **Step 7: Commit**

```bash
git add -A src messages tests
git commit -m "feat(maintenance): open repairs and PM due on dashboard, work center and notifications" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: โมดูลอื่นที่อ้างงานซ่อม

**Files:**
- Modify: `src/lib/asset-state-review-detector.ts`, `src/lib/asset-state-review-service.ts`
- Modify: `src/app/api/assets/[id]/legacy-checkout/route.ts`, `src/lib/asset-operation-options.ts`, `src/app/[locale]/(dashboard)/assets/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`, `src/components/assets/asset-form.tsx`
- Modify: `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx`, `src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx`
- Modify: `src/app/api/search/route.ts`
- Modify: `messages/th.json`, `messages/en.json` (`asset.quickMaintenance`, `asset.openRepairWorkflow`, `asset.noMaintenanceHelp`)
- Test: `tests/asset-state-review-detector.test.ts`, `tests/asset-operation-status-policy.test.ts`, `tests/open-repair-filter.test.ts`

**Interfaces:**
- Consumes: Task 2 `openRepairRecordWhere`, `toRepairRecordStatus`
- Produces: ทุกที่ที่ถามว่า "ทรัพย์สินมีงานซ่อมที่ยังไม่เสร็จไหม" ใช้ `openRepairRecordWhere` (รวมบันทึกที่ผูกแผน PM) · ไม่มีโค้ดตรวจข้อความ `[PM] ` แล้ว

- [ ] **Step 1: Write the failing tests**

`tests/open-repair-filter.test.ts`:

```typescript
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const users = [
  "src/app/api/assets/[id]/legacy-checkout/route.ts",
  "src/lib/asset-operation-options.ts",
  "src/app/[locale]/(dashboard)/assets/page.tsx",
  "src/lib/asset-state-review-service.ts",
]

test("open repair checks use the shared filter and ignore the old [PM] prefix", () => {
  for (const file of users) {
    const source = readFileSync(file, "utf8")
    assert.match(source, /openRepairRecordWhere/, file)
    assert.doesNotMatch(source, /startsWith: "\[PM\] "/, file)
  }
})

test("asset pages send people to the repair form", () => {
  const detail = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  assert.match(detail, /const maintenanceHref = `\/\$\{locale\}\/maintenance\/new\?assetId=\$\{encodedAssetId\}`/)
  assert.doesNotMatch(detail, /function isPreventiveMaintenanceTicket/)
  assert.match(detail, /maintenancePlanId/)
})

test("search shows repair record statuses instead of raw workflow codes", () => {
  const source = readFileSync("src/app/api/search/route.ts", "utf8")
  assert.match(source, /toRepairRecordStatus\(ticket\.repairStatus\)/)
})
```

`tests/asset-state-review-detector.test.ts` เพิ่ม:

```typescript
test("an unfinished repair record suggests Under Maintenance for its asset", () => {
  const [issue] = detectAssetStateIssues(snapshot({ statusName: "Ready", activeCorrectiveTickets: 1, activeCorrectiveStatusNames: ["reported"] }))
  assert.equal(issue?.issueType, "active_repair_ticket_status_mismatch")
  assert.equal(issue?.suggestedStatusName, "Under Maintenance")
})
```

`tests/asset-operation-status-policy.test.ts` test `"asset edit form guides protected lifecycle changes to the right workflow"`: แทน assertion `/\/\$\{locale\}\/maintenance\?assetId=\$\{encodeURIComponent\(asset\.id\)\}/` ด้วย `/\/\$\{locale\}\/maintenance\/new\?assetId=\$\{encodeURIComponent\(asset\.id\)\}/`

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/open-repair-filter.test.ts tests/asset-state-review-detector.test.ts tests/asset-operation-status-policy.test.ts`
Expected: FAIL

- [ ] **Step 3: Asset State Review**

`src/lib/asset-state-review-detector.ts` ในบล็อก `active_repair_ticket_status_mismatch` ลบตัวแปร `workStarted` และใช้ `suggestedStatusName: "Under Maintenance",`

`src/lib/asset-state-review-service.ts`: import `openRepairRecordWhere` จาก `./repair-record-policy.ts` · query `correctiveTickets` เป็น `where: { ...openRepairRecordWhere, assetId: { in: assetIds } }` · ใน `allowedStatusTargets` คง `active_repair_ticket_status_mismatch: ["Pending Repair", "Under Maintenance"]` ไว้ (รายการตรวจเดิมที่แนะนำ Pending Repair ยังแก้ได้)

- [ ] **Step 4: ตัวกรองบันทึกที่ยังไม่เสร็จ**

`src/app/api/assets/[id]/legacy-checkout/route.ts`: import `openRepairRecordWhere` จาก `@/lib/repair-record-policy` · `where: { ...openRepairRecordWhere, assetId: id }` · ข้อความ error เป็น `"Finish or cancel the unfinished repair record before creating a legacy return"`

`src/lib/asset-operation-options.ts`: `prisma.maintenanceTicket.findMany({ where: openRepairRecordWhere, select: { assetId: true } })` (import จาก `@/lib/repair-record-policy`)

`src/app/[locale]/(dashboard)/assets/page.tsx`: `where: { ...openRepairRecordWhere, assetId: { in: assetIds } }` (import จาก `@/lib/repair-record-policy`)

- [ ] **Step 5: หน้าทรัพย์สิน — `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`**

- `const maintenanceHref = \`/${locale}/maintenance/new?assetId=${encodedAssetId}\``
- import `toRepairRecordStatus` จาก `@/lib/repair-record-policy`
- ในตารางประวัติซ่อม: `isPreventiveMaintenanceTicket(ticket.problem)` → `Boolean(ticket.maintenancePlanId)` · ช่องสถานะเป็น `{tMaintenance(\`statuses.${toRepairRecordStatus(ticket.repairStatus)}\`)}`
- `buildMaintenanceTimelineItems`: เพิ่ม `maintenancePlanId: string | null` ใน type ของ ticket และพารามิเตอร์ท้าย `statusLabel: (status: string) => string` · `title: ticket.maintenancePlanId ? t("timelinePmTicket") : t("timelineMaintenanceTicket")` · `{ label: t("repairStatus"), value: statusLabel(ticket.repairStatus) }` · จุดที่เรียกส่ง `(status) => tMaintenance(\`statuses.${toRepairRecordStatus(status)}\`)`
- ลบฟังก์ชัน `isPreventiveMaintenanceTicket` ท้ายไฟล์

`src/components/assets/asset-form.tsx`:
- `const repairWorkflowHref = asset?.id ? \`/${locale}/maintenance/new?assetId=${encodeURIComponent(asset.id)}\` : ""`
- `const isSelectedPendingRepair = selectedStatusName === "pending repair"` → `const isSelectedRepairStatus = selectedStatusName === "pending repair" || selectedStatusName === "under maintenance"` และแทนทุกจุดที่ใช้ชื่อเดิม

messages `asset`: `quickMaintenance` = th `"บันทึกซ่อม"` / en `"Record repair"` · `openRepairWorkflow` = th `"บันทึกซ่อมแทนการเปลี่ยนสถานะเอง"` / en `"Record a repair instead of changing the status"` · `noMaintenanceHelp` = th `"ยังไม่เคยซ่อม กด \"บันทึกซ่อม\" เมื่อมีการซ่อม"` / en `"No repairs yet. Press \"Record repair\" when one happens"`

- [ ] **Step 6: หน้าพนักงาน / ผู้ขาย / ค้นหา**

`master-data/employees/[id]/page.tsx`: ใน select ของ `maintenanceTickets` ลบ `dueDate: true,` · ในตาราง แทน `<ColumnHeader>{tMaintenance("dueDate")}</ColumnHeader>` ด้วย `<ColumnHeader>{tMaintenance("problem")}</ColumnHeader>` และ cell `formatDate(ticket.dueDate)` ด้วย `<td className="min-w-56 px-4 py-3 text-muted-foreground"><span className="line-clamp-2">{ticket.problem}</span></td>`

`master-data/suppliers/[id]/page.tsx`: ลบ `dueDate: true,` จาก select และลบ `<span>{t("dueDate")}: {formatDate(ticket.dueDate)}</span>`

`src/app/api/search/route.ts`: import `toRepairRecordStatus` จาก `@/lib/repair-record-policy` · ลบ `{ quotationNo: { contains: query } },` · แทน `badge: { label: ticket.repairStatus, colorCode: null },` ด้วย `badge: { label: repairStatusLabel(toRepairRecordStatus(ticket.repairStatus), locale), colorCode: null },` และเพิ่มท้ายไฟล์:

```typescript
function repairStatusLabel(status: "in_progress" | "closed" | "cancelled", locale: string) {
  const labels = {
    th: { in_progress: "ยังซ่อมไม่เสร็จ", closed: "ซ่อมเสร็จแล้ว", cancelled: "ยกเลิก" },
    en: { in_progress: "In progress", closed: "Finished", cancelled: "Cancelled" },
  }
  return (locale === "en" ? labels.en : labels.th)[status]
}
```

- [ ] **Step 7: Run tests + tsc**

Run: `node --test tests/open-repair-filter.test.ts tests/asset-state-review-detector.test.ts tests/asset-state-review-scan-service.test.ts tests/asset-operation-status-policy.test.ts tests/asset-operation-options.test.ts tests/employee-detail.test.ts tests/supplier-detail.test.ts tests/asset-detail-ux.test.ts tests/global-search*.test.ts`
Expected: PASS (glob ที่ไม่มีไฟล์ให้ตัดออก)
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0

- [ ] **Step 8: Commit**

```bash
git add -A src messages tests
git commit -m "feat(maintenance): one open-repair rule across modules; record repairs from the asset page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: ลบโค้ดที่ไม่ใช้แล้ว · รัน test ทั้งชุด

**Files:**
- Delete: `src/lib/maintenance-policy.ts`, `tests/maintenance-policy.test.ts`, `tests/maintenance-validation.test.ts`
- Modify: `src/lib/validations/maintenance.ts` (ลบ schema workflow เดิม)
- Modify: `src/lib/maintenance-api-errors.ts`, `tests/maintenance-api-errors.test.ts`, messages (`maintenancePage.errors`)
- Modify: `src/lib/asset-lifecycle-exception-policy.ts`, `src/lib/asset-lifecycle-policy.ts`, `tests/asset-operation-status-policy.test.ts` (ถ้า helper ของการปิดงานซ่อมไม่มีใครใช้แล้ว)

**Interfaces:**
- Produces: `maintenanceErrorCodes = ["MAINTENANCE_ASSET_INELIGIBLE", "MAINTENANCE_INVALID_TRANSITION", "MAINTENANCE_CONFLICT", "MAINTENANCE_PLAN_INVALID_TRANSITION", "MAINTENANCE_ASSET_WRITTEN_OFF", "MAINTENANCE_ASSET_ON_LOAN", "MAINTENANCE_OPEN_RECORD_EXISTS", "MAINTENANCE_REPORTER_REQUIRED"]`

- [ ] **Step 1: ตรวจว่าไม่มีผู้ใช้เหลือ**

Run: `git grep -nE "maintenance-policy|maintenanceTicketSchema|maintenanceTicketCloseSchema|maintenanceTicketStatusSchema|maintenanceTicketPlanningSchema|maintenanceTicketCancelSchema|MAINTENANCE_(ACTIVE_TICKET_EXISTS|WAITING_REMARK_REQUIRED|CANCEL_REASON_REQUIRED|EVIDENCE_REQUIRED|INVALID_CLOSE_STATUS|EVIDENCE_LOCKED|PM_REPORTER_REQUIRED)|getMaintenanceCloseStatusError|getMaintenanceCloseStatusNames" -- src`
Expected: เหลือเฉพาะบรรทัดที่นิยามสิ่งเหล่านี้เอง (ไฟล์ที่จะแก้ใน Step 2–4) — ถ้ามีผู้ใช้อื่น ให้หยุดและรายงาน

- [ ] **Step 2: ลบ**

```bash
git rm src/lib/maintenance-policy.ts tests/maintenance-policy.test.ts tests/maintenance-validation.test.ts
```

`src/lib/validations/maintenance.ts`: ลบ `optionalDate`, `optionalDecimal`, `repairTypes`, `maintenanceTicketSchema`, `MaintenanceTicketInput`, `maintenanceTicketCloseSchema`, `MaintenanceTicketCloseInput`, `maintenanceTicketStatusSchema`, `MaintenanceTicketStatusInput`, `maintenanceTicketPlanningSchema`, `MaintenanceTicketPlanningInput`, `maintenanceTicketCancelSchema` และ type ของมัน (คง plan schemas และ repair record schemas)

`src/lib/maintenance-api-errors.ts`: `maintenanceErrorCodes` เป็นรายการใน Interfaces ข้างบน · `tests/maintenance-api-errors.test.ts` ลบ test `"exports a stable error code for waiting statuses without a remark"` และแก้ test ที่ใช้ code ที่ลบไป ให้ใช้ `MAINTENANCE_CONFLICT` แทน · ลบ key ของ code ที่ลบออกจาก `maintenancePage.errors` ทั้งสองภาษา

`src/lib/asset-lifecycle-exception-policy.ts`: ลบ `maintenanceCloseNextStatuses` และ `getMaintenanceCloseStatusError` · `src/lib/asset-lifecycle-policy.ts`: ลบ `getMaintenanceCloseStatusNames` · `tests/asset-operation-status-policy.test.ts`: ลบ test `"restricts maintenance close to ready or pending disposal asset states"` และ import ที่ไม่ใช้แล้ว

- [ ] **Step 3: tsc + lint + test ทั้งชุด**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0
Run: `npx eslint $(git diff --name-only master...HEAD -- "*.ts" "*.tsx" | tr '\n' ' ')`
Expected: ไม่มี error (warning เดิมของไฟล์ที่ไม่ได้แตะ ไม่ต้องแก้)
Run: `npm test`
Expected: ทุก test ผ่าน · จดจำนวน pass/fail จริงไว้ในรายงาน (จำนวนรวมน้อยกว่า 1320 ได้ เพราะ test ของ workflow เดิมถูกลบ)

ถ้ามี test อื่นพังเพราะยังอ้าง workflow เดิม (เช่นอ่านไฟล์ที่ลบไป หรือคาดหวัง `statuses.reported`) ให้แก้ test นั้นให้ตรงกับพฤติกรรมใหม่ตาม spec แล้วระบุชื่อไฟล์ในรายงาน — ห้ามแก้ test ให้ผ่านด้วยการลบ assertion ที่ยังมีความหมาย

- [ ] **Step 4: Commit**

```bash
git add -A src tests messages
git commit -m "refactor(maintenance): remove the old repair workflow code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: เอกสาร · wiki · ตรวจบนแอปจริง (dev)

**Files:**
- Create: `docs/17_REPAIR_RECORD_GUIDE_TH.md`
- Modify: `DEVELOPER_HANDOFF.md`, `docs/05_ASSET_LIFECYCLE.md`, `docs/06_WORKFLOWS.md`, `docs/15_ASSET_STATUS_USER_GUIDE_TH.md`, `docs/16_ASSET_STATUS_WORKFLOW_TH.md`, `docs/99_CHANGELOG.md`, `README.md`, `docs/02_ARCHITECTURE.md`, `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`
- Modify (vault): `D:\Obsidian\Eltross\AssetSystem\ams-status.md`, `ams-log.md`, `ams-open-questions.md`, `analyses/ams-full-review-20261007.md`, `ams-index.md`
- Modify: `docs/superpowers/specs/2026-10-07-simple-repair-records-design.md` (สถานะ: implemented)

- [ ] **Step 1: คู่มือพนักงาน 1 หน้า — `docs/17_REPAIR_RECORD_GUIDE_TH.md`**

```markdown
# บันทึกซ่อมทำยังไง

ใช้เมื่อทรัพย์สินเสีย ส่งซ่อม หรือทำ PM ตามรอบ — บันทึกครั้งเดียวจบ

## ซ่อมเสร็จแล้ว (ส่วนใหญ่เป็นแบบนี้)

1. สแกน QR ที่ตัวทรัพย์สิน หรือเปิดหน้าทรัพย์สิน แล้วกด **บันทึกซ่อม**
2. ใส่วันที่ (ค่าเริ่มต้นคือวันนี้) และ **อาการ / สิ่งที่ซ่อม** เช่น "จอไม่ติด เปลี่ยนสายแพรจอ"
3. เลือก **ซ่อมเสร็จแล้ว** และผลการซ่อม **ใช้งานได้**
4. ถ้ามีร้าน ค่าใช้จ่าย เลขใบเสร็จ หรือรูป ให้เปิด **รายละเอียดเพิ่มเติม** แล้วกรอก (ไม่บังคับ)
5. กด **บันทึก**

## ส่งซ่อมแล้วยังไม่เสร็จ

1. ทำข้อ 1–2 เหมือนข้างบน แล้วเลือก **ยังซ่อมไม่เสร็จ** → ทรัพย์สินเปลี่ยนเป็น "อยู่ระหว่างซ่อม"
2. เมื่อได้ของคืน เปิดบันทึกนั้น (หน้าซ่อมบำรุง → ตัวกรอง "ยังซ่อมไม่เสร็จ") แล้วกด **ซ่อมเสร็จ**
3. ใส่วันที่รับคืน ผลการซ่อม และค่าใช้จ่าย (ถ้ามี) แล้วกด **ซ่อมเสร็จ**

ถ้าคืนของจากผู้ยืมแล้วต้องส่งซ่อมเลย ให้เลือกสถานะหลังคืน **ส่งซ่อม** ในหน้าคืนของ ระบบสร้างบันทึกให้เอง

## ซ่อมไม่ได้

เลือกผลการซ่อม **ซ่อมไม่ได้ เสนอจำหน่าย** → ทรัพย์สินเปลี่ยนเป็น "รอตัดจำหน่าย" แล้วทำเรื่องจำหน่ายต่อ (ของที่ถูกยืมอยู่ต้องบันทึกคืนก่อน)

## PM ตามรอบ

หน้าซ่อมบำรุงมีกล่อง **PM ถึงกำหนด** (ภายใน 7 วัน) กด **บันทึกว่าทำแล้ว** ระบบเติมข้อมูลให้ กดบันทึก แล้วกำหนดครั้งถัดไปจะเลื่อนเอง

## บันทึกผิด

- รายละเอียดผิด (วันที่ อาการ ร้าน ค่าใช้จ่าย): เปิดบันทึก → **แก้ไขรายละเอียด**
- บันทึกที่ยังไม่เสร็จแต่ไม่ควรมี: **ยกเลิกบันทึก**
- ผลการซ่อมผิดจนสถานะทรัพย์สินผิด: ให้ผู้ดูแลแก้สถานะด้วย Status Correction แล้วเขียนเหตุผลในหมายเหตุของบันทึก
```

- [ ] **Step 2: เอกสาร repo**

แก้ทุกไฟล์ใน Files ให้ตรงกับระบบใหม่ — หาจุดด้วย `git grep -n -i "แจ้งซ่อม\|ใบงานซ่อม\|waiting_parts\|pm:generate\|MAINTENANCE_PM_GENERATION_TOKEN\|maintenance_close\|ปิดงานซ่อม" -- README.md DEVELOPER_HANDOFF.md docs ':!docs/superpowers'`:
- อธิบายสถานะ 3 แบบ (`in_progress` / `closed` / `cancelled`) และ `outcome`
- migration ใหม่ `2026-10-07-add-maintenance-outcome.sql` (dev applied · Production รอ backup + อนุมัติ)
- PM เป็นตัวเตือน ไม่สร้างใบงานอัตโนมัติ · ไม่มีอนุมัติปิดงานซ่อม
- `docs/99_CHANGELOG.md` เพิ่มหัวข้อ 2026-10-07 "บันทึกการซ่อมแบบฟอร์มเดียว"

- [ ] **Step 3: ตรวจบนแอปจริงกับ DB dev**

Run: `npm run migration:status` → บรรทัดแรก `Database: asset_management_dev` และไม่มี migration ค้าง
เปิด `http://localhost:3000` (dev server ที่รันอยู่) ทั้ง desktop และความกว้าง 375px แล้วทำตามลำดับ:
1. หน้าทรัพย์สินชิ้นที่สถานะ Ready → **บันทึกซ่อม** → ซ่อมเสร็จ/ใช้งานได้ → สถานะทรัพย์สินไม่เปลี่ยน · มีประวัติในหน้าทรัพย์สิน
2. ชิ้น Ready อีกชิ้น → ยังซ่อมไม่เสร็จ → สถานะเป็น Under Maintenance → เปิดบันทึก → **ซ่อมเสร็จ** → กลับเป็น Ready
3. บันทึกยังไม่เสร็จอีกใบ → **ยกเลิกบันทึก** → ทรัพย์สินกลับสถานะเดิมตามผู้ถือครอง
4. สร้างแผน PM ที่ครบกำหนดวันนี้ → เห็นใน "PM ถึงกำหนด" → **บันทึกว่าทำแล้ว** → กำหนดครั้งถัดไปเลื่อน
5. กล่อง "ทรัพย์สินค้างสถานะซ่อมแต่ไม่มีบันทึก" แสดงทรัพย์สินที่ค้าง (DB dev มี 10 ชิ้น) → บันทึกให้ 1 ชิ้นแบบซ่อมเสร็จ → ชิ้นนั้นหายจากกล่อง
6. คืนของที่ถูกยืม → เลือก **ส่งซ่อม** → มีบันทึกยังไม่เสร็จ และทรัพย์สินเป็น Under Maintenance
7. ตรวจปุ่มทุกปุ่มสูงอย่างน้อย 44px ที่ 375px และไม่มี horizontal scroll

ถ้าพบปัญหา ให้แก้ (พร้อม test) ก่อนไปต่อ แล้วจดสิ่งที่ตรวจไว้ในรายงาน

- [ ] **Step 4: wiki (vault `D:\Obsidian\Eltross`)**

- `AssetSystem/ams-status.md`: งานซ่อมเป็น "บันทึกการซ่อม" แล้ว (branch `feat/simple-repair-records`) · migration outcome: dev applied, Production pending
- `AssetSystem/ams-log.md`: เพิ่มรายการ 2026-10-07 "บันทึกการซ่อมแบบฟอร์มเดียว" (สรุปสิ่งที่เปลี่ยน + จำนวน test)
- `AssetSystem/ams-open-questions.md`: เพิ่มคำถาม "apply `2026-10-07-add-maintenance-outcome.sql` บน Production" และ "ลบ systemd timer `pm:generate-due` บน server ถ้ามี"
- `AssetSystem/analyses/ams-full-review-20261007.md`: แถว B (ตรวจนับ/ซ่อม/จำหน่าย) ระบุว่า B5 (PM prefix) และ B9 (วันสิ้นเดือน) แก้แล้วใน branch นี้
- รัน lint: `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` (cwd `D:\Obsidian\Eltross\Shared`) → ไม่มี error
- commit ใน vault: `git -C D:/Obsidian/Eltross add AssetSystem && git -C D:/Obsidian/Eltross commit -m "ingest: AssetSystem simple repair records"`

- [ ] **Step 5: Commit (repo)**

```bash
git add -A docs README.md DEVELOPER_HANDOFF.md
git commit -m "docs: simple repair records guide and handoff" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-Review (ผู้เขียนแผนตรวจแล้ว)

**ครอบคลุม spec:**

| spec | Task |
|---|---|
| 3.1 สถานะ 3 แบบ + ข้อมูลเดิมถือเป็นยังไม่เสร็จ | 2, 9 (`maintenance-status.ts`), 14 |
| 3.2 `outcome` | 1, 4 |
| 3.3 ผลต่อสถานะทรัพย์สิน ทุกแถว + conditional claim + movement + log | 2, 4, 5 |
| 3.4 PM: เตือน 7 วัน, บันทึกว่าทำแล้ว, เลื่อนกำหนดแบบ clamp, จบแผนตอนจำหน่าย, เลิก assignee/auto | 3, 4, 6, 8, 9, 10 |
| 3.5 แก้ไขเฉพาะรายละเอียด + optimistic concurrency + log | 4, 5, 7 |
| 4.1 ฟอร์ม (ช่องบังคับ/พับเก็บ/ผู้บันทึกอัตโนมัติ) | 6 |
| 4.2 จุดที่บันทึกได้ (หน้าทรัพย์สิน, หน้าซ่อม, check-in, ซ่อมเสร็จ dialog, มือถือ 44px) | 6, 7, 9, 11, 14, 16 |
| 4.3 สิ่งที่เอาออก (board, planning, SLA, checklist, อนุมัติ, PM job) | 7, 9, 10, 12, 13, 15 |
| 5 ผลกระทบโมดูลอื่น | 12, 13, 14 (การจำหน่าย readiness ใช้ `notIn closed/cancelled` อยู่แล้ว ไม่ต้องแก้) |
| 6 ข้อความผิดพลาดไทย | 4 |
| 7 ฐานข้อมูล | 1, 16 |
| 8 การทดสอบ + ตรวจบนแอปจริง | ทุก task, 15, 16 |
| 9 เอกสาร | 16 |

**ส่วนที่ต่างจาก spec (แก้ spec แล้ว):** "สถานะตามผู้ถือครอง" เป็น `In Use` เมื่อมี checkout ที่ยัง active ด้วย (ไม่งั้นของที่ส่งมอบถาวรคืนไม่ได้หลังซ่อม) · `repairType` ใช้ `vendor` ตามค่าเดิมในระบบ

**ชื่อที่ใช้ข้าม task:** `openRepairRecordWhere`, `toRepairRecordStatus`, `getRepairRecordStatusTone`, `canAttachToRepairRecord`, `buildDuePmPlanWhere`, `getBangkokDateKey`, `generateRepairNo`, `uploadRepairFiles`, `RepairRecordForm`, `RepairRecordActions`, `retiredSystemSettingKeys` — ตรวจแล้วว่าสะกดตรงกันทุกที่
