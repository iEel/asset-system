# ของใช้สิ้นเปลือง plan 4 of 4: the low-stock warning on the bell and in the work center

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When any active kind is at or below its minimum, IT sees "ของใช้สิ้นเปลืองต้องซื้อเพิ่ม n ชนิด" on the
notification bell and among the work center's advance warnings (เตือนล่วงหน้า). One click opens the consumables list
filtered to the low kinds.

**Architecture:**
- **Waiting-work item:** one new key, `consumablesLow`, in the existing waiting-work system, treated like the advance
  keys (`ADVANCE_WARNING_KEYS`). It is counted apart and never added to งานค้างทั้งหมด.
- **Gate:** `consumable:view`.
- **The list page** gains a `?state=low` filter.

**Tech Stack:** Next 16, Prisma 7, next-intl, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-consumables-design.md` §4.

**Rulings carried over from the builder check:**
- The item is an advance warning: not in the backlog total, not in งานของฉัน, and not on the dashboard. The user named
  the bell and the work center.

## Global Constraints

**The key and its count:**
- Add `consumablesLow` to `WAITING_WORK_KEYS` and to `ADVANCE_WARNING_KEYS` (`src/lib/work-queues.ts`).
- **Count:** active kinds with `minQuantity > 0 AND onHand <= minQuantity`, a kind with 0 on hand included. This is the
  number of kinds, not units: `consumable_items` count with that where, as `isConsumableLow` defines it.
- **Age kind:** a new `"state"` age kind, or reuse a kind that shows no date. Read `waitingWorkAgeKinds` and its
  renderer, and pick the least invasive option that shows no age. The oldest is `null`.

**Access and visibility:**
- `WaitingWorkAccess` gains `consumable: hasPermission(user, "consumable", "view")`.
- `waitingWorkVisibleKeys` shows the key only with it.

**Where it appears:**
- **Href:** `/${locale}/consumables?state=low`.
- **Tone:** `warning` in `notification-summary-items.ts`.
- **Digest labels** in `notification-digest-format.ts`: th "ของใช้สิ้นเปลืองต้องซื้อเพิ่ม", en "Consumables to restock".
- **Messages** for the bell and work center labels: follow how `licenseExpiringSoon` gets its Thai label and add the
  same keys. th label "ของใช้สิ้นเปลืองต้องซื้อเพิ่ม {count, number} ชนิด", or the house pattern if the count sits
  apart.
- **Dashboard:** `src/app/[locale]/(dashboard)/dashboard/page.tsx` must not show `consumablesLow`. Find where the
  dashboard lists waiting work and filter the key out there, with a comment citing this plan. The bell and the work
  center keep it.

**Work center:** the advance-warnings group shows it with the other advance keys. Follow `licenseExpiringSoon`
everywhere it appears in `src/lib/work-queues.ts`, `work-center-page-data.ts` and `work-center-row-data.ts`, and give
it the same treatment unless it needs per-record rows.
- **Rows:** the work center may expect per-record rows for advance keys. Read `work-center-row-data.ts`. If it does,
  give `consumablesLow` one row per low kind: the kind's name, "เหลือ n {unit} · ขั้นต่ำ m", and a link to
  `/consumables/<id>`.

**The list filter:**
- `?state=low` on `/consumables` keeps only kinds whose state is `low` or `out`.
- A removable chip "เฉพาะที่ต้องซื้อเพิ่ม".
- The banner stays.

**Copy and process:**
- Messages only through `node scripts/messages-edit.mjs`. ICU plural English, Thai `{x, number}`. Update
  `tests/i18n-plural-count.test.ts`.
- CRLF-safe pins.
- Never touch `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`,
  `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- No Playwright, build or DB by implementers.
- **Notification daily counts** store keys as strings (`notification_daily_counts.key`), so no migration is needed.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A user without `consumable:view`** (most staff). They never see the item, and the counter query does not run for
   them. Task 1 pins the gate.
2. **Kinds with `minQuantity` 0.** They are never low, even at 0 on hand: "0 means no warning" (spec §2). Task 1 tests
   it.
3. **The backlog total and yesterday's comparison** do not change when kinds go low. Task 1 pins that
   `consumablesLow` is in `ADVANCE_WARNING_KEYS`, and that the backlog sum excludes it.
4. **The dashboard** does not show the item. Task 2 pins it.
5. **A deactivated low kind.** It drops out of the count. Task 1 tests it.

---

### Task 1: The waiting-work key

**Files:**
- Modify: `src/lib/waiting-work-rules.ts`, `src/lib/waiting-work.ts`, `src/lib/work-queues.ts`,
  `src/lib/notification-summary-items.ts`, `src/lib/notification-digest-format.ts`
- Modify: the work-center readers if they list advance records (see Global Constraints)
- Modify: `messages/*.json`
- Modify: `src/lib/consumable-rules.ts`. Export `consumableLowWhere`, the Prisma where for "active and low", so the
  counter and the list filter share one definition.
- Test: extend the waiting-work, work-queues, notification-summary and digest tests (grep `tests/` for
  `licenseExpiringSoon`)

- [ ] **Step 1: Write the failing tests:**
  - **Visibility:**
    - visible only with `access.consumable`;
    - in `ADVANCE_WARNING_KEYS`;
    - the backlog total ignores it.
  - **Counting:**
    - the counter source pin uses `consumableLowWhere`;
    - `consumableLowWhere` deep-equals `{ isActive: true, minQuantity: { gt: 0 }, onHand: { lte: <field ref> } }`.
      Prisma cannot compare two columns in a where, so read the note below and pin whichever way you choose.
  - **Links and labels:**
    - the href is `/th/consumables?state=low`;
    - the tone is `warning`;
    - the digest labels are as given.
  - **Every map** keyed by `WaitingWorkKey` has the new key; the type checker enforces this.

> **Note: column-to-column compare.** Prisma 7 on SQL Server can compare fields through `prisma.consumableItem.fields`
> (`onHand: { lte: prisma.consumableItem.fields.minQuantity }`). Check the generated client supports field
> references. If it does not, count with `$queryRaw` (`SELECT COUNT(*) FROM consumable_items WHERE isActive = 1 AND minQuantity > 0 AND onHand <= minQuantity`)
> in one small function. Pin whichever you choose.

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(consumables): the low-stock waiting item on the bell and in the work center's advance
  warnings (consumables plan 4 task 1)`.

---

### Task 2: The dashboard exclusion and the list's low filter

**Files:**
- Modify: `src/app/[locale]/(dashboard)/dashboard/page.tsx` (or the dashboard data module it reads)
- Modify: `src/app/[locale]/(dashboard)/consumables/page.tsx` and `src/components/consumables/consumables-workspace.tsx`
- Modify: `messages/*.json`: `consumablesPage.filterLow` "เฉพาะที่ต้องซื้อเพิ่ม"
- Test: extend `tests/consumables-page-ui.test.ts` and the dashboard tests

- [ ] **Step 1: Write the failing pins:**
  - the dashboard drops `consumablesLow` from what it shows;
  - `?state=low` keeps only low and out kinds;
  - the chip removes `state` only;
  - the list without the filter is unchanged.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(consumables): the list's low filter; the dashboard leaves the restock warning to the bell
  and the work center (consumables plan 4 task 2)`.

---

### Task 3: E2E `e2e/consumables/consumables-warning.spec.ts`

**Story** (desktop-light and phone-light; seed admin; run-marked kinds, names per project):
- **Setup:** create a run kind with min 2, receive 1 → it is low.
- **Bell:** opening the bell's panel shows "ของใช้สิ้นเปลืองต้องซื้อเพิ่ม …" with a count of at least 1. Other kinds
  may be low too, since dev data is shared, so check the label and that the count is at least 1.
  - The link opens `/th/consumables?state=low`, where the run kind is listed with ต้องซื้อเพิ่ม and the chip shows.
- **Work center:** the advance-warnings group lists the item. If there are per-kind rows, the run kind's row is listed.
- **Clearing:** receive 5 more, then on the filtered list the run kind is gone.
  - Do not assert the bell count drops to 0, because other dev kinds may be low.
- **Without permission:** IT staff without `consumable:view` see no such item on the bell.
- **Data:** run-marked only. Deactivate the run kind at the end, so later runs do not inherit a low kind.

- [ ] **Step 1: Write the spec and words**, copying the words from `messages/th.json`, and add the pins.
- [ ] **Step 2: Run** `npm test`.
- [ ] **Step 3: Commit:** `test(consumables): E2E for the low-stock warning (consumables plan 4 task 3)`.

---

## Controller steps (not for implementers)

- **Build and probe:** `(npx next build || npx next build)`, then probe the DB.
- **Targeted E2E:** `npx playwright test e2e/consumables e2e/notifications e2e/work-center e2e/dashboard --reporter=line`.
- **Look step:**
  - the bell with the item;
  - the work center's advance group;
  - the filtered list.
- **Final review:** 3 lenses, then one fix wave.
- **Docs:** changelog, handoff, wiki and memory.
- **Then the whole suite** (user's request, 2026-11-10): `npx playwright test --reporter=line`, all four projects
  (desktop/phone × light/dark), with the VPN probe and keep-awake.
