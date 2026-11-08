# Page group 12, plan 4: Integration API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/integrations` to board `AD-Integrations`:
- creating a client in a side panel;
- tiles and status chips;
- rows that show the creator, the rotation date and usage, with an expandable detail that keeps the 24-hour count, the
  top endpoint and the latest error;
- a ⋯ menu for the rest.

The E2E for this page uses fake client data, served by the browser itself.

**Architecture:**
- A pure page model: `src/lib/integration-clients-page-model.ts`.
- The GET DTO gains `createdByName`.
- `src/components/admin/IntegrationClientManager.tsx` is split into parts under `src/components/admin/integrations/`.
- Every API route keeps its behaviour.
- No migration and no new API.

**Tech Stack:** Next.js 16, Prisma 7, next-intl, Tailwind, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md` §10, §12, §15 item 11.
Recon of kept features: `docs/superpowers/specs/2026-11-08-page-group-12-admin-recon.md` §5.

**Board:** `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g13-boards\project\AD-Integrations.dc.html`.

## Global Constraints

**Keep everything in recon §5:**
- The create form:
  - client ID;
  - display name;
  - the three scopes;
  - validation and field errors.
- The one-time token panel:
  - the warning;
  - copy;
  - the acknowledgement checkbox, which gates dismiss.
- Each row shows:
  - status;
  - scopes;
  - the token preview, with its real first and last 4 characters (spec §10, my call);
  - last used.
- The operations data:
  - 24-hour count;
  - 7-day count;
  - 7-day errors;
  - top endpoint;
  - latest error;
  - the PowerShell example.
- The actions:
  - Edit (a dialog, with a confirm when scopes widen);
  - Rotate (destructive confirm);
  - Disable (destructive confirm) and Enable (confirm).
- The empty state, and the load and action errors.

**Gates:**
- The page needs `setting:view`.
- Writes need `setting:edit`.
- Without `setting:edit`, the create button and the write actions are hidden, as today.

**Token handling:**
- The plain token is held in memory only.
- It is never logged, never put in the URL, and never shown again after dismiss.

**Messages and copy:**
- Thai first; use `docs/19_THAI_GLOSSARY.md`.
- Change messages only through `node scripts/messages-edit.mjs`, in both th and en.
- English uses ICU plurals. Thai uses `{x, number}`.

**Look:**
- Tokens only.
- Both themes.
- 44px targets below `md`.
- No horizontal page scroll at 390 or 1024.

**Tests:**
- Source pins must be CRLF-safe.
- If you break an existing pin, update it so it still protects the same thing. Find the pins with
  `grep -l "IntegrationClientManager\|integration" tests`.

**E2E (spec §15 item 11):**
- Only `e2e/admin/integrations.spec.ts` may name `integration-clients`.
- It may only `fulfill` the GET, and `fallback` anything that is not a GET.
- It must never call `continue` or `fetch` on that route.
- The `tests/e2e-review.test.ts` source guard gets one named exception for that file.
- No create, rotate, enable or disable is ever sent.

## Review Focus

1. **A client that has never been used.**
   - Expected: last used shows "ยังไม่เคยใช้", there is no error badge, and the expand shows "ยังไม่มีการเรียกใช้".
   - Task 1 test: `unused client shows never used and zero counts`.
2. **The creator account was deleted, or `createdBy` holds an id that matches no user.**
   - Expected: the creator line shows "ไม่ทราบผู้สร้าง". It never shows the raw id.
   - Task 1 test: `unknown creator falls back to a neutral label`.
3. **The page is closed or reloaded before the token is acknowledged.**
   - Expected: the token is gone. The list shows the client with its preview only.
   - Task 2 pin: `the token lives in component state only`.
4. **A viewer without `setting:edit`.**
   - Expected: no create button and no ⋯ write items. Copy PowerShell and the history link remain.
   - Task 2 pin: `read-only viewers keep copy and history only`.
5. **The E2E fake data has more than one client, and one is disabled.**
   - Expected: the chips count correctly and the disabled filter shows only it.
   - Task 3 test.

---

### Task 1: Page model and creator names

**Files:**
- Create: `src/lib/integration-clients-page-model.ts`
- Modify: `src/lib/integration-client-store.ts` — `IntegrationClientDto` gains `createdByName: string | null`.
- Modify: `src/app/api/admin/integration-clients/route.ts` — the GET looks up creator names in one query, by the user ids
  in `createdBy`.
- Test: `tests/integration-clients-page-model.test.ts`. Extend the route tests if they exist
  (`grep -l integration-clients tests`).

**Interfaces:**

Produces:

```ts
export type IntegrationStatusFilter = "all" | "active" | "disabled"
export function integrationSummary(clients: readonly IntegrationClientDto[]): { active: number; disabled: number; usedEver: number; calls7d: number; errors7d: number }
export function filterClients(clients: readonly IntegrationClientDto[], filter: IntegrationStatusFilter): IntegrationClientDto[]
export function statusCounts(clients: readonly IntegrationClientDto[]): Record<IntegrationStatusFilter, number>
export function creatorLabel(client: Pick<IntegrationClientDto, "createdByName">): { kind: "name"; name: string } | { kind: "unknown" }
export function clientUsage(client: IntegrationClientDto): { lastUsedAt: Date | string | null; calls7d: number; errors7d: number; hasErrors: boolean; neverUsed: boolean }
```

`usedEver` counts the clients whose `lastUsedAt` is set.

- [ ] **Step 1: Write the failing tests:**
  - `summary counts active, disabled, used ever and 7-day totals`
  - `status counts and filter`
  - `unused client shows never used and zero counts`
  - `unknown creator falls back to a neutral label`
  - `the GET returns createdByName and never the token hash`: a route test. Assert that the DTO keys do not include any
    hash or plain token field.

- [ ] **Step 2: Run the tests and see them fail.**

- [ ] **Step 3: Implement.**
  - Use relative imports in the model.
  - In the GET, look up `prisma.user.findMany({ where: { id: { in: ids } }, select: { id, displayName } })`. Ignore any
    id that is not a user id.

- [ ] **Step 4: Run the checks.**
  - Run: the tests, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(integrations): page model and creator names in the client list (group 12 plan 4 task 1)`

### Task 2: The Integration API page (`AD-Integrations`)

**Files:**
- Modify: `src/components/admin/IntegrationClientManager.tsx`. Keep the export; it becomes the composer.
- Create: `src/components/admin/integrations/client-create-sheet.tsx`, which uses `src/components/ui/sheet.tsx`.
- Create: `src/components/admin/integrations/client-row.tsx`, the row with its expand and ⋯ menu.
- Create: `src/components/admin/integrations/client-tiles.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/integrations/page.tsx`
- Modify: the messages
- Test: `tests/integrations-board.test.ts` (pins), plus updates to existing pins

**Interfaces:**
- Consumes from Task 1: everything listed there.
- Also uses `buildSystemLogFilterHref(locale, "integration")` (check the quick-filter key name) and
  `buildSystemLogRecordHref(locale, "integration_api", clientId)`.

**Header:**
- The title.
- **ประวัติการเรียกใช้:** a link to the logs page, filtered to the Integration API quick filter.
- **สร้าง client:** opens the side panel. Only with `setting:edit`.

**Side panel (create):**
- **Step 1:** the existing form fields and validation.
- **After create, step 1 collapses to a summary** (client ID, name, scopes), and step 2 shows:
  - the one-time token;
  - copy;
  - the warning;
  - the acknowledgement checkbox.
- The panel can only close once the checkbox is ticked.
- The new row gets a "ใหม่" highlight until the page reloads.

**Tiles:**
- เปิดใช้
- ปิดใช้
- เคยถูกใช้
- การใช้งาน · 7 วัน {n} ครั้ง · Error {n}

**Chips** (client state, no URL): ทั้งหมด / เปิดใช้ / ปิดใช้, each with its count.

**Row:**
- The display name, then the client ID in mono under it.
- "สร้าง {date} · {creator or ไม่ทราบผู้สร้าง}".
- Thai scope badges.
- The token preview, with "เปลี่ยน {date}" when `lastRotatedAt` is set.
- **Last used:** "ยังไม่เคยใช้", or the date.
- "7 วัน {n} ครั้ง".
- An error badge when `errors7d` > 0.
- **Buttons:**
  - **แก้ไข:** the existing dialog.
  - **⋯ menu:**
    - Copy PowerShell
    - ดูประวัติ (the per-client logs link)
    - เปลี่ยน token… (the existing destructive confirm)
    - A separator
    - ปิดใช้งาน… in red, or เปิดใช้งาน… (the existing confirms)
  - Write items show only with `setting:edit`.
- **Expand (`aria-expanded`):**
  - "24 ชม. {n} ครั้ง"
  - the top endpoint (method, path, count)
  - the latest error (time, status, path)
  - or "ยังไม่มีการเรียกใช้"
- **Under the table:** the note "ระบบเก็บเฉพาะค่า hash ของ token".

**Phone:** a card per client, with the same parts.

- [ ] **Step 1: Write the failing pins:**
  - `create opens a side panel and the token gate stays`
  - `the token lives in component state only`: no `localStorage`, `sessionStorage`, URL or logging of it.
  - `rows show creator, rotation date, usage and error badge`
  - `the expand keeps 24h, top endpoint and latest error`
  - `the ⋯ menu keeps rotate and disable confirms`
  - `read-only viewers keep copy and history only`
  - `kept: edit dialog with widening confirm, empty state, load and action errors`

- [ ] **Step 2: Run the pins and see them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the checks.**
  - Run: the pins, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. List every pin you changed.

- [ ] **Step 5: Commit.**
  - Message: `feat(integrations): Integration API to board AD-Integrations: create in a side panel, tiles, chips, creator and usage per row, expand with 24h, top endpoint and latest error, ⋯ menu (group 12 plan 4 task 2)`

### Task 3: E2E with fake data

**Files:**
- Create: `e2e/admin/integrations.spec.ts`
- Create: `e2e/admin/integrations-words.ts`
- Modify: `tests/e2e-review.test.ts`
  - Add one named exception: only `e2e/admin/integrations.spec.ts` may name `integration-clients`.
  - Pin that the file calls `route.fulfill` for the GET and `route.fallback()` for anything else.
  - Pin that it never calls `route.continue` or `route.fetch`.

**Tests** (seed-admin session; each test sets `page.route("**/api/admin/integration-clients", …)` before navigating):

1. **Desktop: `tiles, chips and rows from fake data`**
   - Fake data: three clients — two enabled and one disabled.
   - One client has never been used, one has errors, and one has an unknown creator.
   - The tiles and chip counts match the fake data.
   - The disabled chip shows one row.
   - Expanding the client with errors shows its latest error.
2. **Desktop: `the side panel opens and closes without creating`**
   - Open สร้าง client.
   - Fill nothing and press the panel's cancel. The panel closes.
   - Nothing is posted: a non-GET would fall back to the hazard abort, and the test checks that no such request was
     attempted.
3. **Phone: `cards fit the phone`**
   - No horizontal scroll.
   - The ⋯ menu opens.

**Writes:** none.

- [ ] **Step 1: Write the spec and the guard change.**

- [ ] **Step 2: Run the checks.**
  - Run: `npm test` and `npx tsc --noEmit`.
  - Expected: PASS. Do not run Playwright.

- [ ] **Step 3: Commit.**
  - Message: `test(integrations): E2E with fake client data and its guard exception (group 12 plan 4 task 3)`
