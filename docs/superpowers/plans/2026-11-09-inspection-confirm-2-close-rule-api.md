# ยืนยันผลตรวจ plan 2 of 5: rules, close rule, round card step and confirm API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- A round cannot close while any of its assets is `Under Inspection`.
- The round page shows a 4th step, ยืนยันผลตรวจ.
- One server route releases the assets in bulk, with the history the status correction writes. It handles three
  outcomes: confirm, damaged (one asset) and missing.

**Architecture:**
- One pure module classifies each round item into a tab and computes its target status. The page (plan 3), the route
  and the counts all read it.
- One data module reads the rows from Prisma.
- The close checklist gains a count, and the steps builder gains a step.
- The route re-reads the rows inside a serializable transaction. It writes all or nothing and answers 409 with the
  refused assets.

**Tech Stack:** Next 16 route handlers, Prisma 7 on SQL Server, zod, next-intl, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-09-inspection-confirm-design.md` §3, §5, §6 (missing outcome), §6a (damaged
outcome), §9, §10.

## Global Constraints

**Statuses** (English `name`, as seeded in `prisma/seed.ts`; never compare `nameTh`):
- the stuck status is `Under Inspection`;
- target statuses are `In Use`, `Ready`, `Checked Out` and `Missing`.

**Target status rule** (spec §4, builder check):
1. An open handover with an unknown mode, or both modes open at once → no target. The asset is blocked with reason
   `handoverUnclear`.
2. Else an open permanent assignment → `In Use`.
3. Else an open temporary loan → `Checked Out`.
4. Else `getMaintenanceOperationalTarget({ ownershipType, custodianId })` from `src/lib/asset-lifecycle-policy.ts`:
   personal with a holder → `In Use`, otherwise `Ready`.
5. For the `missing` outcome the target is always `Missing`.
- **Open handovers:** `assetCheckout` rows with `isReturned: false, transactionStatus: "active"`, counted by
  `handoverMode` (`permanent_assignment`, `temporary_loan`, else unknown). This is the same read as
  `src/lib/asset-state-review-service.ts` around line 441.

**Tabs** (spec §4), in this order: `ready` · `awaitingReview` · `damaged` · `notFound` · `notScanned`. A row is in
exactly one tab:
- `notScanned`: `auditStatus === "pending"`.
- `awaitingReview`: else, any finding of the item has `reviewStatus === "pending"`.
- `notFound`: else, `auditResult === "not_found"` and a `not_found` finding has `reviewStatus === "approved"`.
- `damaged`: else, `getCheckoutConditionBlock(conditionName)` is non-null (เสียหาย, ใช้งานไม่ได้, ซาก).
- `ready`: everything else. A rejected or `exception` not-found lands here.

**Rows of a round:**
- An audit item of the round whose asset is active and whose current status name is `Under Inspection`.
- Out-of-scope items (`auditResult: "out_of_scope"`) count too. Cancelled rounds have no rows.

**Route:**
- **Path:** `POST /api/audit-rounds/[id]/confirm-results`.
- **Permission:** `requirePermission(user, "asset", "edit")`.
- **Body:** `{ assetIds: string[], reason: string, outcome?: "confirm" | "damaged" | "missing" }`.
  - `outcome` defaults to `"confirm"`.
  - `assetIds`: 1–500, no duplicates.
  - `reason`: trimmed, 3–500 characters.
  - The `damaged` outcome takes exactly 1 id.
- **Outcome ↔ tab:** `confirm` needs `ready`, `damaged` needs `damaged`, `missing` needs `notFound`.

**History per asset** (mirror `src/app/api/assets/[id]/status-correction/route.ts`):
- `asset.statusId` and `updatedBy`.
- An `assetMovement`:
  - `movementType "status_correction"`, `fromValue`/`toValue` status ids, `reason`;
  - `referenceType "audit_round"`, `referenceId <round id>`;
  - `remark "Audit result confirmed (<auditNo>)"`.
- After the transaction, one `logAudit({ action: "correct_status", module: "asset", recordId: assetId })` per asset.
  `newValue` includes `statusName`, `reason`, `auditRoundId` and `auditNo`.

**Transaction:**
- Options: `{ isolationLevel: "Serializable", maxWait: 10_000, timeout: 120_000 }` (`batchCheckinTransactionOptions`
  shape).
- A Prisma `P2034` (`isPrismaWriteConflict`) answers 409 like a refusal.

**409 shape:** the bulk-move shape,
`{ code: "INSPECTION_CONFIRM_CHANGED", error: "Some assets changed before the audit results were confirmed", blocked: [{ assetId, assetTag, code }] }`.
- `code` is one of `notInRound`, `notUnderInspection`, `notScanned`, `awaitingReview`, `wrongTab`, `handoverUnclear`.

**Thai copy** (glossary `docs/19_THAI_GLOSSARY.md`):
- Add messages only through `node scripts/messages-edit.mjs`.
- English values use ICU plurals where a count is a number argument; Thai uses `{x, number}`.
- Where a neighbour key receives an already formatted string (`{count}`), mirror that neighbour exactly.
- Update `tests/i18n-plural-count.test.ts` when the plural key count changes.

**Process:**
- Source pins must be CRLF-safe.
- Never touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`,
  `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- No Playwright, no `next build`, no database commands.
- Read `node_modules/next/dist/docs/` for route handler params before writing the route.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A finding is approved or a scan is saved between the page load and the confirm.** The server re-classifies and
   refuses the whole request with 409. Task 3 pins `findInspectionConfirmRefusals` with a stale-tab case.
2. **The close button and the close API disagree.** Both read `getAuditRoundCloseChecklist`. Task 2 pins that the page
   and the PATCH read the same function, and that `canClose` needs `unconfirmedAssets === 0`.
3. **An asset is in two rounds.** Once one round releases it, the other round no longer counts it, because the count
   filters on the current status. Task 2 pins the where clause by status name.
4. **A handover in an unclear state.** The asset can never be confirmed, so the round cannot close until IT fixes the
   handover. Task 1 classifies it, and Task 3 refuses it with `handoverUnclear`. The page (plan 3) explains it.
5. **The request is too big, has duplicates, or is damaged with several ids.** zod refuses with 400 before any read.
   Task 3 tests the schema.

---

### Task 1: Pure rules `src/lib/inspection-confirm-rules.ts`

**Files:**
- Create: `src/lib/inspection-confirm-rules.ts` (pure; `import type` only from Prisma; client-safe like
  `audit-round-counts-rules.ts`)
- Test: `tests/inspection-confirm-rules.test.ts`

**Interfaces — Produces:**

```ts
export const INSPECTION_STATUS_NAME = "Under Inspection"
export const INSPECTION_CONFIRM_MAX_ASSETS = 500
export const inspectionConfirmTabs = ["ready", "awaitingReview", "damaged", "notFound", "notScanned"] as const
export type InspectionConfirmTab = (typeof inspectionConfirmTabs)[number]
export const inspectionConfirmOutcomes = ["confirm", "damaged", "missing"] as const
export type InspectionConfirmOutcome = (typeof inspectionConfirmOutcomes)[number]
export const inspectionOutcomeTab: Readonly<Record<InspectionConfirmOutcome, InspectionConfirmTab>> // confirm→ready, damaged→damaged, missing→notFound
export type InspectionTargetStatusName = "In Use" | "Ready" | "Checked Out" | "Missing"
export type InspectionHandoverCounts = { permanent: number; temporary: number; unknown: number }
export type InspectionItemInput = {
  auditStatus: string
  auditResult: string | null
  findings: ReadonlyArray<{ findingType: string; reviewStatus: string }>
  conditionName: string | null
}
export function classifyInspectionItem(item: InspectionItemInput): InspectionConfirmTab
export function inspectionTargetStatusName(
  input: { ownershipType: string | null; custodianId: string | null; handovers: InspectionHandoverCounts },
  outcome: InspectionConfirmOutcome,
): InspectionTargetStatusName | null // null = handoverUnclear (never null for "missing")
```

- [ ] **Step 1: Write the failing tests**, each a named `test(...)`:
  - **"each tab has one rule, checked in order"**:
    - pending → `notScanned`, even with a pending finding;
    - checked with a pending finding → `awaitingReview`, even when `not_found` and damaged;
    - `not_found` with an approved `not_found` finding → `notFound`;
    - `not_found` with a rejected `not_found` finding and condition `"Good"` → `ready`;
    - the same with `exception` → `ready`;
    - `found` with condition `"Damaged"` → `damaged`;
    - `out_of_scope` with only decided findings and condition `"Good"` → `ready`.
    - Use the condition English names that `getCheckoutConditionBlock` recognises; read its map in
      `asset-lifecycle-policy.ts`.
  - **"the target follows the open handovers first, then the ownership rule"**:
    - `{ permanent: 1 }` → `"In Use"`;
    - `{ temporary: 1 }` → `"Checked Out"`;
    - `{ unknown: 1 }` → `null`;
    - `{ permanent: 1, temporary: 1 }` → `null`;
    - no handovers: personal with holder → `"In Use"`; personal without holder → `"Ready"`; shared with holder →
      `"Ready"`; stock with holder → `"Ready"`.
  - **"missing always targets Missing"**: `{ unknown: 1 }` with `"missing"` → `"Missing"`.
  - **"outcomes map to their tab"**: `inspectionOutcomeTab` deep-equals
    `{ confirm: "ready", damaged: "damaged", missing: "notFound" }`.
- [ ] **Step 2: Run, expect failure** — `node --test tests/inspection-confirm-rules.test.ts` → module not found.
- [ ] **Step 3: Implement** the exports above. Reuse `getMaintenanceOperationalTarget` and `getCheckoutConditionBlock`;
  do not copy their tables.
- [ ] **Step 4: Run, expect pass**; then `npx tsc --noEmit`.
- [ ] **Step 5: Commit** —
  `feat(audit): inspection-confirm rules — tabs, target status (inspection-confirm plan 2 task 1)`.

---

### Task 2: Data reads and the close rule

**Files:**
- Create: `src/lib/inspection-confirm-data.ts` (server-only, Prisma)
- Modify: `src/lib/audit-round-close.ts`
- Modify: `src/lib/audit-round-page-rules.ts` (`auditRoundPageStepKeys`, `buildAuditRoundPageSteps`,
  `AuditRoundPageMainAction`, `buildAuditRoundPageMainAction`)
- Test: `tests/inspection-confirm-data.test.ts`; update `tests/audit-round-page-rules.test.ts` and any test pinning
  the three step keys. Grep for `auditRoundPageStepKeys` and `buildAuditRoundPageSteps` in `tests/`.

**Interfaces:**
- Consumes Task 1:
  - `INSPECTION_STATUS_NAME`;
  - `classifyInspectionItem`, `inspectionTargetStatusName`;
  - the types `InspectionConfirmTab`, `InspectionConfirmOutcome`, `InspectionTargetStatusName`,
    `InspectionHandoverCounts`.
- Produces:

```ts
// inspection-confirm-data.ts
export type InspectionRow = {
  auditItemId: string; assetId: string; assetTag: string; assetName: string
  auditStatus: string; auditResult: string | null; scannedAt: Date | null
  conditionName: string | null; conditionNameTh: string | null
  ownershipType: string | null; custodianId: string | null; custodianName: string | null
  locationName: string | null
  tab: InspectionConfirmTab
  handovers: InspectionHandoverCounts
  pendingFindingIds: string[]
  targetStatusName: InspectionTargetStatusName | null   // for outcome "confirm"/"damaged"; Missing is implied for notFound
}
export const inspectionUnderReviewAssetWhere: Prisma.AssetWhereInput   // { isActive: true, status: { name: INSPECTION_STATUS_NAME } }
export function roundInspectionItemWhere(auditRoundId: string, assetIds?: readonly string[]): Prisma.AuditItemWhereInput
export async function loadRoundInspectionRows(db: Prisma.TransactionClient | PrismaClient, auditRoundId: string, assetIds?: readonly string[]): Promise<InspectionRow[]>
export async function countRoundUnconfirmedAssets(db: Prisma.TransactionClient | PrismaClient, auditRoundId: string): Promise<number>
```

```ts
// audit-round-close.ts
export type AuditRoundCloseChecklist = { pendingItems: number; pendingFindings: number; openActions: number; unconfirmedAssets: number; canClose: boolean }
// canClose = all four are 0
```

```ts
// audit-round-page-rules.ts
export const auditRoundPageStepKeys = ["walk", "review", "confirm", "close"] as const
export function buildAuditRoundPageSteps(input: { status: string; pendingItems: number; pendingFindings: number; unconfirmedAssets: number }): AuditRoundPageSteps | null
// the current step is: walk while items are pending; else review while findings are pending; else confirm while
// assets are unconfirmed; else close
export type AuditRoundPageMainAction = ... | { kind: "confirm"; count: number; act: boolean }
// buildAuditRoundPageMainAction gains `unconfirmedAssets: number` and `canConfirm: boolean`
```

- [ ] **Step 1: Write the failing tests**
  - **In `tests/audit-round-page-rules.test.ts`:**
    - **steps:** `buildAuditRoundPageSteps({ status: "open", pendingItems: 0, pendingFindings: 0, unconfirmedAssets: 3 })`
      has `current === "confirm"`, and the states read complete, complete, current, upcoming. Use the existing
      `getLinearStepStates` values the file already asserts.
    - **steps, nothing left:** with `unconfirmedAssets: 0` → `current === "close"`.
    - **steps, closed round:** a closed round has all 4 steps complete.
    - **main action:** at the confirm step, `buildAuditRoundPageMainAction` returns
      `{ kind: "confirm", count: 3, act: true }` for `canConfirm: true`, and `act: false` otherwise.
  - **In `tests/inspection-confirm-data.test.ts`:**
    - **where clauses:** `roundInspectionItemWhere("r1")` deep-equals
      `{ auditRoundId: "r1", asset: { isActive: true, status: { name: "Under Inspection" } } }`.
    - **asset filter:** with `["a1"]`, it adds `assetId: { in: ["a1"] }`.
    - **source pin, close:** `src/lib/audit-round-close.ts` calls `countRoundUnconfirmedAssets(`, and its `canClose`
      requires `unconfirmedAssets === 0`.
    - **source pin, one function:** the PATCH route `src/app/api/audit-rounds/[id]/route.ts` and the round page both
      still call `getAuditRoundCloseChecklist(`. The page reads it through its page data; pin wherever the page data
      calls it.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement**
  - `loadRoundInspectionRows` makes one `auditItem.findMany` with the where above. It selects:
    - the item fields and its `findings` (`findingType`, `reviewStatus`, `id`);
    - the asset (`id`, `assetTag`, `name`, `ownershipType`, `custodianId`, `custodian` name, `currentLocation` name,
      `condition` `name`/`nameTh`).
  - Then it reads open checkouts for those asset ids with the Global Constraints read, chunked by
    `AUDIT_ID_CHUNK_SIZE` from `audit-round-counts-rules.ts`.
  - It fills `tab`, `handovers`, `pendingFindingIds`, and `targetStatusName` (outcome `"confirm"`) for every row.
  - Order rows by `assetTag`.
  - Read the schema for the exact relation names (`custodian`, `currentLocation`). Do not guess.
  - `countRoundUnconfirmedAssets` is `auditItem.count` on the same where.
  - `getAuditRoundCloseChecklist` adds it to its `Promise.all`.
- [ ] **Step 4: Fix every caller** of the changed signatures, and every test that pins three steps.
  - Run `npm test` and `npx tsc --noEmit`.
  - The round page (`page.tsx`) passes `unconfirmedAssets` now. Its UI changes are Task 4; here it only compiles.
- [ ] **Step 5: Commit** — `feat(audit): rounds cannot close while their assets are Under Inspection; the steps gain
  ยืนยันผลตรวจ (inspection-confirm plan 2 task 2)`.

---

### Task 3: Route `POST /api/audit-rounds/[id]/confirm-results`

**Files:**
- Create: `src/app/api/audit-rounds/[id]/confirm-results/route.ts`
- Create: `src/lib/validations/inspection-confirm.ts`. Put the zod schema there; look at
  `src/lib/validations/batch-checkin.ts` for the house style.
- Create: `src/lib/inspection-confirm-service.ts`, holding the transaction (route stays thin, like
  `batch-checkin-service.ts`).
- Modify: `src/lib/api-error-catalog.ts`; `messages/*.json` (through the script)
- Test: `tests/inspection-confirm-service.test.ts`

**Interfaces:**
- Consumes:
  - Task 1: outcomes, `inspectionOutcomeTab`, `inspectionTargetStatusName`;
  - Task 2: `loadRoundInspectionRows`, `InspectionRow`.
- Produces:

```ts
// validations/inspection-confirm.ts
export const inspectionConfirmSchema // z.object({ assetIds, reason, outcome }) with the Global Constraints limits; superRefine: damaged ⇒ exactly 1 id; duplicate ids refused
export type InspectionConfirmInput = z.infer<typeof inspectionConfirmSchema>
// inspection-confirm-service.ts
export type InspectionConfirmBlockedCode = "notInRound" | "notUnderInspection" | "notScanned" | "awaitingReview" | "wrongTab" | "handoverUnclear"
export type InspectionConfirmBlocked = { assetId: string; assetTag: string | null; code: InspectionConfirmBlockedCode }
export function findInspectionConfirmRefusals(rows: readonly InspectionRow[], assetIds: readonly string[], outcome: InspectionConfirmOutcome): InspectionConfirmBlocked[]
export class InspectionConfirmChangedError extends Error { readonly blocked: InspectionConfirmBlocked[] }
export type InspectionConfirmResult = { confirmed: number; byStatus: Partial<Record<InspectionTargetStatusName, number>> }
export async function confirmInspectionResults(input: InspectionConfirmInput & { auditRoundId: string; userId: string }): Promise<InspectionConfirmResult>
```

**Refusal codes**, per requested id:
- `notInRound`: no row and no item of the round.
- `notUnderInspection`: the asset has an item in the round but is no longer `Under Inspection`. The service reads
  that with a second small query, only when rows are missing.
- `notScanned` / `awaitingReview`: those tabs.
- `wrongTab`: any other tab mismatch.
- `handoverUnclear`: the target is null.

- [ ] **Step 1: Write the failing tests**
  - **schema, accepted:** 1 id with a 3-character reason.
  - **schema, refused:**
    - 0 ids;
    - 501 ids;
    - a duplicate id;
    - a reason of 2 characters after trim;
    - `damaged` with 2 ids;
    - an unknown `outcome`.
  - **schema, default:** `outcome` defaults to `"confirm"`.
  - **refusals:** use hand-made `InspectionRow`s with these assets:

    | Asset | Row |
    |---|---|
    | A | `ready`, target `In Use` |
    | B | `awaitingReview` |
    | C | `ready`, target `null` |
    | D | `notFound` |
    | E | none (absent) |

    - `findInspectionConfirmRefusals(rows, [A], "confirm")` → `[]`.
    - `[B]` → `awaitingReview`.
    - `[C]` → `handoverUnclear`.
    - `[D]` with `"confirm"` → `wrongTab`; with `"missing"` → `[]`.
    - `[E]` → `notInRound`. Here the pure function cannot tell `notUnderInspection`; the service upgrades the code.
  - **source pins on the service:**
    - it runs `prisma.$transaction(` with `isolationLevel: "Serializable"`;
    - it re-reads the rows with `loadRoundInspectionRows(tx,`;
    - it writes `movementType: "status_correction"` with `referenceType: "audit_round"`;
    - it calls `logAudit(` with `action: "correct_status"` after the transaction.
  - **source pins on the route:**
    - `requirePermission(user, "asset", "edit")`;
    - a cancelled round answers 400;
    - `InspectionConfirmChangedError` and `isPrismaWriteConflict` map to 409 with
      `code: "INSPECTION_CONFIRM_CHANGED"` and `blocked`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement the schema, the service and the route.**
  - **Service steps:**
    1. Read the round: active, with `auditNo` and `status`.
    2. Read the status ids for the target names once, by `name` and `isActive`. A missing status throws
       `"Asset status not found"`, which is already in the catalog.
    3. In the transaction: re-read the rows, refuse if any id is refused, then write per asset.
    4. After the transaction: `logAudit` per asset.
  - **Route:**
    - `requireAuth`;
    - `requirePermission(user, "asset", "edit")`;
    - parse with the schema (a zod error goes through `errorResponse` as the other routes do);
    - 404 for an unknown round, 400 `"Audit round is cancelled"` for a cancelled one;
    - call the service.
  - **Error catalog:**
    - `"Some assets changed before the audit results were confirmed"` → key `inspectionConfirmChanged`;
    - `"Audit round is cancelled"` → key `auditRoundCancelled`. Reuse an existing key if the catalog already has this
      text; grep first.
  - **Messages `apiErrors.*`:**
    - `inspectionConfirmChanged`: th `"บางชิ้นเปลี่ยนไปแล้ว โหลดใหม่และลองอีกครั้ง"`, en
      `"Some assets changed. Reload and try again."`;
    - `auditRoundCancelled`: th `"รอบตรวจนับนี้ถูกยกเลิกแล้ว"`, en `"This audit round was cancelled."` (only if new).
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(audit): confirm-results route releases Under Inspection assets in bulk, all or nothing
  (inspection-confirm plan 2 task 3)`.

---

### Task 4: Round page card: the ยืนยันผลตรวจ step and the close line

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx` (around lines 125–160)
- Modify: `messages/*.json` (through the script)
- Modify: the E2E word files and specs that pin the three steps or the close conditions. Grep `e2e/` for `stepClose`,
  `ปิดรอบ`, `closeNoOpenActions` and the step labels. **Do not run Playwright.**
- Test: `tests/audit-round-page-ui.test.ts` (extend)

**Interfaces:**
- Consumes Task 2: the 4 step keys, `checklist.unconfirmedAssets`, and main action kind `"confirm"`.
- Produces: the link target `/${locale}/audit/rounds/${round.id}/confirm`. Plan 3 builds that page; until then the
  link 404s on this branch, which is expected.

**Messages** (th / en):

| Key | th | en |
|---|---|---|
| `auditRound.stepConfirm` | `ยืนยันผลตรวจ` | `Confirm results` |
| `auditRound.closeNoUnconfirmed` | `ยืนยันผลตรวจครบแล้ว` | `All audit results confirmed` |
| `auditRound.closeUnconfirmedCount` | `ยังมี {count} ชิ้นค้างสถานะอยู่ระหว่างตรวจสอบ` | `{count} still under inspection` |
| `auditRound.nextStepConfirm` | `ยืนยันผลตรวจ {count} ชิ้น` | `Confirm results ({count})` |
| `auditRound.nextStepViewConfirm` | `ดูชิ้นที่รอยืนยันผล ({count})` | `View assets awaiting confirmation ({count})` |

- `{count}` receives `formatCount(...)`, as `closePendingFindingsCount` does. Mirror that key's argument style in both
  languages.
- **The existing step labels stay:** เดินตรวจ · หัวหน้า IT พิจารณา · ปิดรอบ. The new step sits between the last two.

**Page behaviour:**
- **Step items:** 4, labelled with `stepConfirm`.
- **Main link at the confirm step:** `canConfirm = hasPermission(user, "asset", "edit")`.
  - `act: true` → primary link `nextStepConfirm`.
  - Otherwise → a neutral link `nextStepViewConfirm` to the same href.
  - Icon: `ClipboardCheck` from lucide (already in the icon set; check it is exported).
- **Close conditions, open round:** add one condition after `openActions` and before `opener`:
  - key `unconfirmed`;
  - `ok: checklist.unconfirmedAssets === 0`;
  - label `closeNoUnconfirmed` / `closeUnconfirmedCount`;
  - `href`: the confirm page.
- **Close conditions, closed round:** it keeps its one "closed" line. When `checklist.unconfirmedAssets > 0`, add the
  same `unconfirmed` line with its href (spec §3, closed rounds).
- **Cancelled rounds:** unchanged.

- [ ] **Step 1: Write failing source pins in `tests/audit-round-page-ui.test.ts`**
  - The page builds `` `/${locale}/audit/rounds/${round.id}/confirm` ``.
  - It has a condition with `key: "unconfirmed"`.
  - It reads `checklist.unconfirmedAssets`.
  - Its step labels include `stepConfirm: t("stepConfirm")`, or the record form the file uses.
  - The closed branch adds the `unconfirmed` line when the count is above 0.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement, and add the messages** through `scripts/messages-edit.mjs`.
- [ ] **Step 4: Update the E2E words and specs** that count or name the steps or the conditions, so they expect 4
  steps. Copy the Thai from `messages/th.json`.
- [ ] **Step 5: Run** `npm test` (glossary and i18n-plural-count included) and `npx tsc --noEmit`.
- [ ] **Step 6: Commit** — `feat(audit): round card shows the ยืนยันผลตรวจ step and the unconfirmed line
  (inspection-confirm plan 2 task 4)`.

---

## Controller steps after Task 4 (not for implementers)

- **Build first:** `(npx next build || npx next build)`. E2E serves the existing `.next` build.
- **DB check:** probe the dev DB.
- **E2E:** run `npx playwright test e2e/audit e2e/approvals e2e/cross-cutting --reporter=line`. Rounds created by the
  suite hold Ready assets, so the close must still work. The new close refusal is covered by plan 3's E2E, which seeds
  `Under Inspection` assets.
- **Look step:** the round page card at 1440 light/dark and 390 light/dark: the 4 steps and the new line. Never run
  the look server while E2E runs.
- **Final review:** the 3-lens workflow, then one fix wave.
- **Docs:** changelog, handoff, wiki and memory.
