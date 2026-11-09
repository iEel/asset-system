# ของใช้สิ้นเปลือง plan 1 of 4: data, migration, permissions and server rules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the two consumables tables, the `consumable` permission module, and the server routes that create kinds and
record receive, issue and adjust. Every stock change is one transaction with its movement.

**Architecture:**
- **Data:** Prisma models plus an idempotent manual migration. The migration also inserts the permission rows and
  grants them to `system_admin` only.
- **Rules:** a pure rules module (validation, the low-stock test, the "changed often" test), then a service that
  writes, then thin routes.
- No UI in this plan.

**Tech Stack:** Prisma 7 on SQL Server, zod, Next 16 route handlers, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-09-consumables-design.md` §2, §4 (the low-stock test), §6.

**Branch:** a new `feat/consumables`.
- Started from master `c9da7ce5` after `feat/inspection-confirm` merged (2026-11-09).
- Otherwise stack it on `feat/inspection-confirm` (spec §7).
- Its first commit adds the spec and these plans.

## Global Constraints

**Tables** (spec §2; Prisma names in camelCase, SQL in snake_case):

`ConsumableItem` → `consumable_items`:
- `id` String uuid;
- `name` NVarChar(100);
- `unit` NVarChar(20), default `"ชิ้น"`;
- `minQuantity` Int, default 0;
- `onHand` Int, default 0;
- `isActive` Boolean, default true;
- `createdBy` and `updatedBy?` NVarChar(100);
- `createdAt`, `updatedAt`.
- **Unique name:** a filtered unique index `UX_consumable_items_name_active` on `name` WHERE `isActive = 1`. The
  migration owns the filter; Prisma keeps a plain `@@index` with the same `map`, as
  `2026-10-20-users-employee-filtered-unique.sql` does for users.
- The name check in code is case-insensitive (compare `LOWER(name)` / `name.toLowerCase()`). The database collation is
  case-insensitive already; verify with `SELECT SERVERPROPERTY('Collation')` on dev, read-only, and note it in the report.

`ConsumableMovement` → `consumable_movements`:
- `id`, `itemId` (FK to items);
- `type` NVarChar(20): `receive`, `issue` or `adjust`;
- `quantityChange` Int, never 0;
- `onHandAfter` Int;
- `assetId?` (FK to assets, required for issue);
- `receivedDate?` Date;
- `reason?` and `note?` NVarChar(500);
- `performedBy` NVarChar(100);
- `performedAt` default now.
- **Indexes:** `IX_consumable_movements_item_performedAt` (`itemId`, `performedAt`) and
  `IX_consumable_movements_asset_performedAt` (`assetId`, `performedAt`).

**Migration** `prisma/manual-migrations/2026-11-10-add-consumables.sql`:
- Same style as `2026-11-05-add-disposal-rounds.sql`: header, `sys.*`/`COL_LENGTH` guards, and a rollback comment.
- **Permission rows:** inserts `permissions` rows for module `consumable` with the seed's six actions (`view`, `create`,
  `edit`, `delete`, `export`, `approve`) where missing.
- **Grants:** grants all six to the role named `system_admin` only, where missing. No other role (user, option ก).
- **Applying it:** the controller applies it to `asset_management_dev`; implementers never run it. Production gets it
  on deploy day with approval.

**Seed and groups:**
- `prisma/seed.ts` adds `"consumable"` to `modules`.
- `src/lib/permission-groups.ts` adds it to `operations`.
- Add the roles-page Thai labels for the module: find the message map for module names and add
  `consumable: "ของใช้สิ้นเปลือง"`.

**Rules:**
- **Quantities:** integers; issue and receive take 1–9999.
- **Adjust:** a count of 0–99999. A count equal to `onHand` is refused (`noChange`).
- **Receive date:** a Bangkok day, not in the future.
- **Low stock:** `minQuantity > 0 && onHand <= minQuantity`.
- **Out of stock:** `onHand === 0`.
- **Changed often:** the same `itemId` issued to the same `assetId` 2 or more times within 90 days.
- **Issue targets:** an active asset whose status name is not `Disposed`, `Retired`, `Lost`, `Missing` or
  `Pending Disposal`.

**Writes:**
- Each write is one Serializable transaction (`{ isolationLevel: "Serializable", maxWait: 10_000, timeout: 30_000 }`).
- **Issue:** `updateMany({ where: { id, isActive: true, onHand: { gte: qty } }, data: { onHand: { decrement: qty } } })`.
  A count of 0 means a stock shortage, and answers 409 with the current `onHand`.
- After the transaction, `logAudit({ module: "consumable", action, recordId: itemId })`, with action `receive`,
  `issue`, `adjust`, `create`, `update` or `deactivate`.

**Permissions per route:**

| Route | Permission |
|---|---|
| `GET` | `consumable:view` |
| `POST` items, receive, issue | `consumable:create` |
| `PATCH` item, adjust, deactivate | `consumable:edit` |

**Process:**
- Add messages only through `node scripts/messages-edit.mjs` (`apiErrors.*` for new error texts).
- CRLF-safe source pins.
- Never touch the untracked paths listed in earlier plans.
- No Playwright, build, or DB writes by implementers. A read-only `SELECT` on dev for the collation is allowed.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Two people issue the last unit at once.** One wins, and the other gets 409 with the current count. Task 3 pins the
   conditional update.
2. **An adjust to the same count.** Refused with `noChange`. Task 2 tests it.
3. **Deactivating a kind with stock.** Allowed. The confirm is the UI's job, in plan 2. History stays, and a
   deactivated kind refuses receive and issue. Task 3 tests it.
4. **Issuing to a disposed or missing asset.** Refused with a field error on `assetId`. Task 2 tests every listed status.
5. **A duplicate name with different case** ("Mouse" vs "mouse"). Refused while the other is active. A deactivated
   kind's name can be reused. Task 2/3 test it.

---

### Task 1: Prisma models, the migration, seed and permission groups

**Files:**
- Modify: `prisma/schema.prisma`. Add both models and the back-relations `Asset.consumableMovements`.
- Create: `prisma/manual-migrations/2026-11-10-add-consumables.sql`
- Modify: `prisma/seed.ts`, `src/lib/permission-groups.ts`, the module-name messages
- Modify: `docs/03_DATABASE.md`. Add the migration line and append it as step 5 of the deploy-day order.
- Test: `tests/consumables-migration.test.ts`

- [ ] **Step 1: Write the failing tests:**
  - **The SQL file:** it creates both tables with the guards; it has the filtered unique index `WHERE [isActive] = 1`;
    it inserts `consumable` permissions for the six actions; and it grants only through `WHERE r.name = 'system_admin'`.
    Assert that no other role name appears in an INSERT into `role_permissions`.
  - **The schema:** it has `@@map("consumable_items")` and `@@map("consumable_movements")`, and the index maps match the
    SQL names.
  - **The rest:** `permissionGroupOf("consumable") === "operations"`, and the seed's modules include `"consumable"`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
  - Run `npx prisma generate`. It touches no database; note it in the report.
  - Run `npx prisma validate`.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(consumables): tables, migration with the consumable permission for system_admin, seed
  and groups (consumables plan 1 task 1)`.

---

### Task 2: Pure rules `src/lib/consumable-rules.ts`

**Interfaces — Produces:**

```ts
export const CONSUMABLE_ISSUE_MAX = 9999
export const CONSUMABLE_ADJUST_MAX = 99999
export const CONSUMABLE_OFTEN_DAYS = 90
export const CONSUMABLE_OFTEN_COUNT = 2
export const consumableBlockedIssueStatusNames: readonly string[] // ["Disposed","Retired","Lost","Missing","Pending Disposal"]
export type ConsumableStockState = "ok" | "low" | "out"
export function consumableStockState(item: { onHand: number; minQuantity: number }): ConsumableStockState // out first, then low
export function isConsumableLow(item: { onHand: number; minQuantity: number }): boolean
export function consumableAdjustError(onHand: number, counted: number): "noChange" | "range" | null
export function consumableIssueAssetError(asset: { isActive: boolean; statusName: string } | null): "assetNotFound" | "assetStatus" | null
export function consumableOftenChanged(issues: ReadonlyArray<{ itemId: string; performedAt: Date }>, now: Date): Array<{ itemId: string; count: number }>
// per item, issues within CONSUMABLE_OFTEN_DAYS of now, kept when count >= CONSUMABLE_OFTEN_COUNT
```

Zod schemas live in `src/lib/validations/consumables.ts`:
- `consumableItemSchema` (`name` trimmed 1–100, `unit` 1–20 with default `"ชิ้น"`, `minQuantity` 0–99999);
- `consumableReceiveSchema` (`itemId`, `quantity` 1–9999, `receivedDate` as `yyyy-mm-dd` not after today in Bangkok,
  `note?`);
- `consumableIssueSchema` (`itemId`, `quantity` 1–9999, `assetId`, `note?`);
- `consumableAdjustSchema` (`itemId`, `counted` 0–99999, `reason` trimmed 3–500).

- [ ] **Step 1: Write the failing tests:**
  - **Stock state:** `{onHand:0,min:0}` → `out`; `{1,2}` → `low`; `{2,2}` → `low`; `{3,2}` → `ok`; `{5,0}` → `ok`.
  - **Adjust:** `(5,5)` → `noChange`; `(5,-1)` → `range`; `(5,6)` → `null`.
  - **Issue asset:** each blocked status → `assetStatus`; inactive → `assetStatus`; `null` → `assetNotFound`; Ready →
    `null`.
  - **Changed often:** two issues 10 days and 80 days ago → `[{count:2}]`; one at 100 days → excluded.
  - **Schemas:**
    - a receive date of tomorrow is refused;
    - `quantity: 0` is refused;
    - the default unit is `"ชิ้น"`;
    - a reason of 2 characters is refused.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(consumables): rules and request schemas (consumables plan 1 task 2)`.

---

### Task 3: Service and routes

**Files:**
- Create: `src/lib/consumable-service.ts`
- Create: `src/app/api/consumables/route.ts` (GET list, POST create)
- Create: `src/app/api/consumables/[id]/route.ts` (GET one with recent movements; PATCH name/unit/min or
  `{ isActive: false }`)
- Create: `src/app/api/consumables/receive/route.ts`, `issue/route.ts`, `adjust/route.ts`
- Create: `src/app/api/consumables/movements/route.ts`. GET filtered by `itemId` or `assetId`, paged 50, newest first.
- Modify: `src/lib/api-error-catalog.ts`, `messages/*.json`
- Test: `tests/consumable-service.test.ts`

**Errors** (field errors where a field is named; English text, catalog key, Thai):

| English | Key | Thai |
|---|---|---|
| `"Not enough in stock"` (409, with `onHand`) | `consumableShort` | `ของในตู้ไม่พอ เหลือ {onHand} {unit}` |
| `"No change to the count"` (field `counted`) | `consumableNoChange` | `จำนวนเท่าเดิม ไม่มีการเปลี่ยนแปลง` |
| `"This asset cannot take consumables"` (field `assetId`) | `consumableAssetStatus` | `เครื่องนี้อยู่ในสถานะที่เบิกของให้ไม่ได้` |
| `"Consumable name already exists"` (field `name`) | `consumableNameExists` | `มีชนิดนี้อยู่แล้ว` |
| `"Consumable kind is inactive"` | `consumableInactive` | `ชนิดนี้ปิดใช้งานแล้ว` |

`{onHand}` and `{unit}` come from the 409 body. If the catalog cannot interpolate, show the shorter text
`ของในตู้ไม่พอ`, and the UI (plan 2) adds the count.

- [ ] **Step 1: Write the failing tests** (pure parts plus source pins):
  - **Issue:**
    - the service runs a Serializable transaction;
    - the conditional `onHand: { gte:` update;
    - a movement with `quantityChange: -quantity` and `onHandAfter`;
    - `assetId` required.
  - **Receive:** `+quantity`, `receivedDate`.
  - **Adjust:** `quantityChange = counted - onHand`, and `reason`.
  - **Every write:** `logAudit(` after the transaction, with `module: "consumable"`.
  - **Routes:** each route's permission per the table.
  - **Movements:** the GET pages by 50.
  - **Create:** checks the name case-insensitively among active kinds.
  - **Deactivate:** sets `isActive: false` only, and keeps `onHand`.
  - **Inactive kind:** receive and issue refuse it.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(consumables): service and routes for kinds, receive, issue, adjust and history
  (consumables plan 1 task 3)`.

---

## Controller steps after Task 3 (not for implementers)

- **Migration on dev:** probe the dev DB, then apply the migration with
  `npm run migration:apply -- 2026-11-10-add-consumables.sql --backup-confirmed --reason "consumables plan 1 (dev)"`.
  Use the dev `.env`, never `--db-env .env.prod-admin`. Record the checksum in `docs/03_DATABASE.md`.
- **Build and E2E:** there is no UI yet. Build, then run `e2e/admin/roles.spec.ts`, because the roles page lists the new
  module, and `e2e/cross-cutting`.
- **Final review:** 3 lenses (security-correctness, data/migration, API contract), then one fix wave.
- **Docs:** changelog, handoff, wiki and memory.

## Later plans (written after this one runs)

1. Plan 2: the list page, dialogs (receive, issue, adjust, kind) and item history.
2. Plan 3: the asset-detail section, the issue entry from a machine, and the "เครื่องที่เปลี่ยนของบ่อย" report.
3. Plan 4: the low-stock waiting-work item (bell, work center advance warnings) and the full E2E story.
