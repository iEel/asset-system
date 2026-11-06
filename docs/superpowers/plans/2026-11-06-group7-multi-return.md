# Page group 7, plan 4: returning several assets of one person in one form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an employee leaves, IT takes everything they hold back in one form: every machine listed and ticked, each with its condition (default ปกติ) and optional photos, one signature of the person returning and one of the receiver, one RT- document listing every machine; all or nothing.

**Architecture:**
- **Server:** the per-asset write of today's return (`src/app/api/assets/[id]/checkin/route.ts`) is extracted into `src/lib/checkin-write.ts` (`writeCheckinInTransaction`), used unchanged by the single route and by a new `POST /api/asset-checkins/batch`. The batch claims every handover in id order inside one transaction (`withDeadlockRetry`, Serializable, 120 s), backfills an HO- for a held asset with no handover (today's legacy path, extracted too), generates **one** RT- number and writes one `AssetCheckin` per machine with that number. **No migration**: the rows of one document share `documentNo`.
- **Document:** the RT- page (`/asset-management/checkins/[id]`) lists every active and voided return of the same document (same `documentNo`, return date, returner and receiver — a defensive match against an old duplicate number).
- **Form:** `/asset-management/checkin/batch?employeeId=&returnTo=`, opened from the employee page's "รับคืนหลายรายการ" and from the return page's holder group.

**Tech Stack:** Next.js 16, Prisma 7 on SQL Server, next-intl, `node --test`, Playwright (4 projects).

**Spec:** `docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md` §5.3 (user decision 2026-11-05 "แบบ ข": one form, one signature, one RT-). No canvas board exists for it; it follows the return form's look (TX-Checkin) and the bulk-move table.

## Global Constraints

- Thai first; glossary; messages via `node scripts/messages-edit.mjs` (dotted keys); errors under fields; source pins CRLF-safe.
- Permissions: `asset:edit` (as the single return).
- Each machine still gets its own return record, movement, status change, history line and cancel, exactly as a single return writes them.
- All or nothing: one refused machine refuses the save; the response names every blocked machine (the bulk-move 409 shape `{ code, error, blocked: [{ assetId, assetTag, code }] }`).
- No change to the single return form's behaviour or its E2E.
- E2E: dev DB only; run-marked employees, assets and handovers only; no DELETE.

## Plan rulings

- **G7P4-R1** No migration: the machines of one multi-return share `documentNo`; the RT- page groups by (`documentNo`, `returnDate`, `returnBy`, `receiveBy`). The RT- number is generated once, inside the Serializable batch transaction.
- **G7P4-R2** The multi-return covers ordinary returns only. A machine that needs a repair (an open repair, or "ส่งซ่อม" as its next status) or has a component left out is not in the multi-return: its row reads "รับคืนทีละรายการ" with a link to the single form. Components that travel with a machine come back with it (no unticking here).
- **G7P4-R3** At most 50 machines per multi-return (`MAX_BATCH_CHECKIN_ITEMS = 50`).
- **G7P4-R4** One next location for all, changeable per row; one return date; next status per row from the same options the single form offers for that machine, minus the repair status.
- **G7P4-R5** The two signature images are stored once and attached to every return record of the document (one `Attachment` row per record pointing at the same stored file), so each record and the RT- page read them as today.
- **G7P4-R6** A held asset with no handover is included: the batch backfills its HO- (today's legacy-checkout logic, extracted) inside the same transaction.

## Review Focus

1. Two machines, one refused because its handover was returned elsewhere a moment ago: nothing is saved; the response names that machine; the form marks its row and keeps everything typed.
2. A machine with an open repair: unticked and disabled with "รับคืนทีละรายการ" and its link; ticking is impossible; a crafted request with it is refused.
3. The RT- page of a multi-return lists every machine; after cancelling one line (single cancel, as today) the page shows that line voided and the others active.
4. Signatures missing: refused under the signature field before any file is saved.
5. A held asset with no handover in the batch: its HO- is backfilled and returned in the same save; if the save is refused, no HO- remains.

---

### Task 1: Extract the per-asset return write

**Files:** create `src/lib/checkin-write.ts` (`writeCheckinInTransaction(tx, input, ctx)` returning the created checkin, missing components and repair) and `src/lib/legacy-checkout-write.ts` (`backfillLegacyCheckoutInTransaction(tx, assetId, actor)`); modify `src/app/api/assets/[id]/checkin/route.ts` and `src/app/api/assets/[id]/legacy-checkout/route.ts` to use them; tests.
- [ ] Pure refactor: every existing return/legacy test and source pin stays green (update pins to the new locations, CRLF-safe); add unit tests for the extracted functions with a fake tx (the rows they write, the claim's `count === 1` refusal) → `npm test`, `tsc`, eslint → commit `refactor(transactions): the return and legacy-backfill writes as in-transaction helpers (group 7 plan 4)`.

### Task 2: The batch API

**Files:** create `src/lib/validations/batch-checkin.ts`, `src/lib/batch-checkin-service.ts`, `src/app/api/asset-checkins/batch/route.ts`; messages; tests.
- Input (multipart): `employeeId` (the holder), `returnDate`, `returnBy`/`returnByEmployeeId`, `receiveBy`/`receiveByEmployeeId`, `nextLocationId`, `returnSignatureFile`, `receiveSignatureFile`, `items` (JSON: `[{ assetId, checkoutId | null, conditionAfter, nextStatusId, nextLocationId?, damageNote?, remark? }]`), per-item photos `photoAfterFiles[<assetId>]`.
- Pre-checks per item (the single route's, reused) + G7P4-R2 refusals (`BATCH_CHECKIN_NEEDS_SINGLE`), holder match (every asset held by `employeeId`), 1–50 items (G7P4-R3); 409 with `blocked[]`; files saved only after all pass, cleaned up on refusal.
- Transaction (G7P4-R1, R5, R6): `withDeadlockRetry`, Serializable, `{ maxWait: 10_000, timeout: 120_000 }`; backfill legacy HO-s; claim handovers in asset-id order; one RT-; `writeCheckinInTransaction` per item with that `documentNo`; signature attachments per record; audit after commit. Response 201 `{ documentNo, checkinIds: string[], firstCheckinId }`.
- [ ] Failing tests for Review Focus 1, 2, 4, 5 and the 50 limit (service with a fake tx + route pins) → implement → commit.

### Task 3: The RT- page lists the document

**Files:** `src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx`, `src/lib/checkin-document-lines.ts` (or a new `checkin-document-group.ts`); messages; tests.
- Reads the group (G7P4-R1 match), shows one row per machine (tag, name, condition, next status/location, its HO-), a voided row struck with "ยกเลิกแล้ว"; the single-asset layout stays for a one-machine document; cancel stays per record (each row links its own cancel).
- [ ] Failing tests (group reader with a fake db: same number + other returner is NOT grouped; voided line kept) → implement → commit.

### Task 4: The multi-return form and its entry points

**Files:** create `src/app/[locale]/(dashboard)/asset-management/checkin/batch/page.tsx`, `src/components/asset-operations/batch-checkin-form.tsx`, `src/lib/batch-checkin-form-rules.ts`; modify the employee page header (plan 2 left a place for "รับคืนหลายรายการ") and the return page's holder group (a "รับคืนทั้งหมดของ {holder}" link when the holder has 2+ machines); messages; tests.
- **Copy (th):** title `รับคืนหลายรายการ`; header line `{holder} · ถือครอง {n} รายการ`; row disabled `รับคืนทีละรายการ`; next location for all `ที่ตั้งหลังรับคืน (ทุกรายการ)`; per-row override `เปลี่ยนเฉพาะรายการนี้`; footer `รับคืน {n} รายการ`; review dialog `ตรวจสอบก่อนรับคืน {n} รายการ`; blocked banner `รับคืนไม่ได้ {n} รายการ` + `นำรายการที่รับคืนไม่ได้ออก`.
- Rows: tick (default on), photo thumb, name/tag, HO- or ข้อมูลเก่า, condition (`AssetConditionChoice`, default the "ปกติ" condition), next status, optional photos, damage note. One returner (preset the holder), one receiver (preset the signed-in user's employee), return date, two `SignaturePad`s, summary "หลังรับคืน". Review dialog then POST; on 201 go to the RT- page (`firstCheckinId`) with `returnTo`; on 409 mark blocked rows.
- Phone: rows as cards; signatures full width.
- [ ] Failing tests (pure rules: default ticks, disabled rows by G7P4-R2, counts, payload builder; pins) → implement → commit.

### Task 5: E2E

- [ ] `e2e/transactions/multi-return.spec.ts`: a run-marked employee holding three run assets (two handed over, one legacy) and a fourth with an open repair: the employee page's "รับคืนหลายรายการ" opens the form with three ticked and the repair one disabled with its link; one condition changed to ชำรุด; both signatures; save → one RT- listing three machines; each asset is Ready (or the chosen status) with no custodian; the legacy one got its backfilled HO-; the employee page shows only the repair asset held. Then cancel one line from the RT- page (as the single cancel does) and the page shows it voided. Phone variant; axe via recordSettled.

### Task 6 (controller)

- [ ] E2E `e2e/transactions`, `e2e/master-data`, four projects (the single return must stay green); look step; final review Workflow 3×2; docs, wiki, memory.
