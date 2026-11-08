# Page group 12, plan 2: system history and approval history Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/logs` (board `AD-Logs`) and `/admin/approvals/history` (board `AD-ApprovalHistory`).
- **System history:** find an asset's change history by its tag, filtered by user and date range, in a 5-column table
  with rows that expand.
- **Approval history:** gains actor and date filters, day groups, and Thai detail.

**Architecture:**
- **Pure rules:**
  - `src/lib/system-log-filters.ts`: parses the filters, sets the date presets in Bangkok time, and builds the where.
  - `src/lib/system-log-presenter.ts`: Thai field labels and values. Both pages share it.
  - `src/lib/approval-decision-log.ts`: actor/date filters and day groups.
- **UI:** each page keeps its own file, plus a few components in `src/components/admin/logs/`.
- **Date range:** extend `RepairDateRangeChip` with optional quick presets.
- No migration.

**Tech Stack:** Next.js 16, Prisma 7, next-intl, Tailwind, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md`:
- §4 (system history)
- §5 (approval history)
- §15 items 5 (tag search scope), 6 (rows with no user) and 9 (`dateFrom`/`dateTo`, presets on the repair chip)

Recon (kept features): `docs/superpowers/specs/2026-11-08-page-group-12-admin-recon.md` §2, §7.

**Boards:**
- `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g13-boards\project\AD-Logs.dc.html`
- `AD-ApprovalHistory.dc.html` in the same folder.

## Global Constraints

**Keep (recon §2, §7):**
- **Logs page:**
  - The gate stays `system:view`.
  - The quick-filter tabs keep pageSize and recordId.
  - The `recordId` filter and its chip.
  - Real paging at 25/50/100, and the redirect to the last page.
  - The empty and empty-filtered text.
  - The perf timing wrapper.
  - The record links.
  - The before/after table and the remark.
- **Approval history:**
  - The gate stays: approval access, otherwise the denied page (plan 1).
  - The repair-close history needs `maintenance:edit`.
  - The module and decision filters.
  - Paging and the last-page redirect.
  - The empty state.
  - Record links.
  - The before/after table and the remark.
- **Unchanged URL values:** the `module`, `action`, `recordId`, `page`, `pageSize`, `moduleFilter` and decision params keep
  their current names and values, because other pages link to them.
  - `buildSystemLogFilterHref` and `buildSystemLogRecordHref` keep working.

**Performance:**
- Tag search never runs a LIKE over log values.
- It finds the assets first: `Asset.assetTag` equals the text, or starts with it, up to 50 assets.
- Then it filters `module: "asset"` with `recordId IN (...)`.

**Dates and messages:**
- Dates use Bangkok time. "วันนี้" means the Bangkok calendar day.
- Thai comes first, and terms follow `docs/19_THAI_GLOSSARY.md`.
- Messages change only through `node scripts/messages-edit.mjs` (th + en, ICU plurals in en, `{x, number}` in th).

**Look:**
- Tokens only, both themes.
- 44px targets below `md`.
- No horizontal page scroll at 390 or 1024.

**Tests and E2E:**
- Source pins are CRLF-safe.
- If you break an existing pin, update it so it keeps what it protects. Find them with
  `grep -l "admin/logs\|system-log\|approval-decision\|approvals/history" tests`.
- E2E runs on the dev DB only. No writes beyond what the spec lists.

## Review Focus

1. **A tag that matches nothing.**
   - Expected: the table shows "ไม่พบทรัพย์สินรหัสนี้", and no unfiltered list appears.
   - Task 1 test: `an unknown tag matches no logs`.
2. **`dateFrom` after `dateTo`, or a garbage date in the URL.**
   - Expected: the dates are swapped or ignored, and the page does not crash.
   - Task 1 test: `bad or reversed dates are normalised`.
3. **A tag that is a prefix of more than 50 assets.**
   - Expected: only the first 50 assets are used, and the page says "แสดงเฉพาะ 50 รายการแรกที่ตรง".
   - Task 1 test: `tag prefix caps at 50 assets`.
4. **An `integration_api` log whose client has since been removed or renamed.**
   - Expected: it shows "Integration API · {clientId}".
   - Task 3 pin: `integration rows fall back to the client id`.
5. **Approval history with the actor filter set to someone the viewer may not see (repair-close without
   `maintenance:edit`).**
   - Expected: still no repair-close rows.
   - Task 4 test: `actor filter never widens what the viewer may see`.

---

### Task 1: Log filter rules (`src/lib/system-log-filters.ts`)

**Files:**
- Create: `src/lib/system-log-filters.ts`
- Test: `tests/system-log-filters.test.ts`

**Interfaces:**

Produces:

```ts
export const LOG_USER_SYSTEM = "system" // logs with userId null and module !== "integration_api"
export const LOG_USER_INTEGRATION = "integration" // module === "integration_api"
export type LogDatePreset = "today" | "7d" | "30d"
export type SystemLogFilters = {
  tag: string; userId: string | null; dateFrom: string | null; dateTo: string | null // yyyy-mm-dd, Bangkok
  module: string; action: string; recordId: string
}
export function parseSystemLogFilters(input: Record<string, string | string[] | undefined>): SystemLogFilters // trims; invalid dates → null; reversed dates swapped
export function presetRange(preset: LogDatePreset, now: Date): { dateFrom: string; dateTo: string } // Bangkok calendar days; 7d = today and the 6 days before
export function bangkokDayBounds(dateFrom: string | null, dateTo: string | null): { gte?: Date; lt?: Date } // [from 00:00, to+1 00:00) Bangkok as UTC Dates
export const TAG_MATCH_CAP = 50
export function systemLogWhere(filters: SystemLogFilters, matchedAssetIds: string[] | null): Prisma.SystemLogWhereInput
// matchedAssetIds: null = no tag filter; [] = tag given but nothing matched (where must match nothing)
export function buildSystemLogQuery(filters: SystemLogFilters, page: { page?: number; pageSize?: number }): string // omits empty values and defaults
```

**`systemLogWhere` rules:**
- **Tag:** `module: "asset"` and `recordId: { in: ids }`. When `ids` is `[]`, use `id: { in: [] }`, so the where matches
  nothing.
- **User:**
  - `system` gives `{ userId: null, module: { not: "integration_api" } }`.
  - `integration` gives `{ module: "integration_api" }`.
  - Any other id gives `{ userId: id }`.
- **Dates:** `createdAt` comes from `bangkokDayBounds`.
- `module`, `action` and `recordId` work as today.
- All parts are ANDed together.

- [ ] **Step 1: Write the failing tests:**
  - `parses with empty defaults`
  - `bad or reversed dates are normalised`:
    - `dateFrom=2026-13-40` gives `null`.
    - `dateFrom=2026-11-08&dateTo=2026-11-01` swaps the two dates.
  - `presets use Bangkok days`:
    - With `now = 2026-11-08T18:30:00Z` (01:30 on 9 Nov in Bangkok), `today` is `2026-11-09`.
    - `7d` starts `2026-11-03`.
  - `day bounds are Bangkok midnight`:
    - `bangkokDayBounds("2026-11-08","2026-11-08")` gives `gte 2026-11-07T17:00:00.000Z` and `lt 2026-11-08T17:00:00.000Z`.
  - `an unknown tag matches no logs`:
    - `systemLogWhere({...tag:"X"}, [])` contains `id: { in: [] }`.
  - `tag search filters asset logs by record id`.
  - `system and integration user options`.
  - `tag prefix caps at 50 assets`:
    - `TAG_MATCH_CAP === 50`.
    - Also pin the page query's `take: TAG_MATCH_CAP + 1` in Task 3.
  - `the query keeps filters and omits defaults`.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `node --test tests/system-log-filters.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Use relative imports, so `node --test` can load the file.
  - Use `Asia/Bangkok` with a fixed +07:00 offset (Thailand has no DST).

- [ ] **Step 4: Run the tests.**
  - Run: the test, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(logs): log filter rules: tag, user, Bangkok date range and presets (group 12 plan 2 task 1)`

### Task 2: Thai labels in the shared presenter

**Files:**
- Modify: `src/lib/system-log-presenter.ts`
- Modify: `src/lib/system-log-record-labels.ts`, if needed
- Modify: messages (`systemLogPage.*`)
- Test: `tests/system-log-presenter-thai.test.ts`

**Interfaces:**
- Produces: `buildSystemLogPresentation`, with the same signature as today. Its output changes in these ways:
  - `changes[].label` is always a Thai field label, never the raw field name.
  - `changes[].before` and `after`:
    - Enum values (`pending`, `approved`, `rejected`, `resolved`, `dismissed`, review statuses, finding types, booleans)
      become Thai words.
    - ISO date strings are formatted with `formatDateTime`, or `formatDate` for date-only values.
  - `summary` reads as a Thai sentence, with no raw English words and correct spacing.
  - `storage` gets a module label: "พื้นที่จัดเก็บไฟล์".

**Approach:**
- List every field key that today falls back to the raw name. Find them in the presenter's label map and the fields its
  callers write: `grep -rn "logAudit({" src`.
- Add a `systemLogPage.field_*` label for each key, and a `systemLogPage.value_*` label for each enum value.

- [ ] **Step 1: Write the failing tests:**
  - `audit finding review reads in Thai`:
    - A log with `oldValue {reviewStatus:"pending"}` and `newValue {reviewStatus:"approved"}` gives a change with a Thai
      label and Thai values.
    - The output contains no `reviewStatus`, `pending` or `approved`.
  - `ISO dates are formatted`: `"2026-11-08T03:00:00.000Z"` becomes `formatDateTime(...)`, and `"2026-11-08"` becomes
    `formatDate(...)`.
  - `every known field has a Thai label`: assert that each key the presenter can emit has a `systemLogPage.field_*`
    entry in `messages/th.json`. Iterate over an exported list `KNOWN_LOG_FIELDS`.
  - `storage module has a Thai label`.

- [ ] **Step 2: Run the tests and watch them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests.**
  - Run: the test, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. Approval history uses the same presenter; update its pins if the text changed.

- [ ] **Step 5: Commit.**
  - Message: `feat(logs): Thai field labels, values and dates in the log presenter, shared with approval history (group 12 plan 2 task 2)`

### Task 3: The system history page (`AD-Logs`)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/logs/page.tsx`
- Modify: `src/components/maintenance/repair-date-range-chip.tsx` (optional `presets`; the repair list stays unchanged)
- Create: `src/components/admin/logs/log-filters-bar.tsx`
- Create: `src/components/admin/logs/log-user-filter.tsx` (`"use client"`, a searchable `FilterMenuChip`)
- Create: `src/components/admin/logs/log-event-row.tsx` (an expandable row)
- Modify: messages
- Test: `tests/admin-logs-board.test.ts` (pins), plus updates to existing pins

**Interfaces:**
- Consumes from Task 1:
  - `parseSystemLogFilters`
  - `systemLogWhere`
  - `TAG_MATCH_CAP`
  - `presetRange`
  - `buildSystemLogQuery`
  - `LOG_USER_SYSTEM`
  - `LOG_USER_INTEGRATION`
- Consumes from Task 2: the Thai presenter.
- Produces: `RepairDateRangeChip` gains an optional `presets?: { key: string; label: string; href: string; active: boolean }[]`.
  - The presets render as link chips at the top of its popover.
  - Without them, the chip behaves exactly as today.

**Page:**

- **Header:**
  - "ประวัติระบบ".
  - The link "ประวัติการตัดสินใจอนุมัติ" to `/admin/approvals/history`, shown only when
    `getApprovalInboxAccess(user).canAnyApproval`.

- **Filters (one GET form):**
  - **ค้นหารหัสทรัพย์สิน:** the `tag` input.
  - **ผู้ใช้:** a searchable menu of all users, labelled `displayName · username`. Two fixed options go first:
    - "ระบบ (งานตามเวลา)" (`system`)
    - "Integration API" (`integration`)
  - **ช่วงวันที่:** the extended chip with presets วันนี้ · 7 วัน · 30 วัน. The default is ทั้งหมด (no dates).
  - **โมดูล / การกระทำ:** selects built from the `systemLogPage.module_*` and `action_*` keys. The values stay as codes.
  - The quick-filter tabs and the `recordId` chip stay.

- **Tag lookup:**
  - Query `asset.findMany({ where: { OR: [{ assetTag: tag }, { assetTag: { startsWith: tag } }] }, select: { id, assetTag, name }, take: TAG_MATCH_CAP + 1 })`.
  - If 51 assets come back, use the first 50 and show "แสดงเฉพาะ 50 รายการแรกที่ตรง".
  - If none come back, show "ไม่พบทรัพย์สินรหัสนี้" in the table's empty state.
  - If exactly one asset matches, the header shows "{asset name} · {tag}" and a link "ดูประวัติทุกเรื่องของทรัพย์สินนี้"
    to `buildAssetDetailViewHref(locale, id, "history")`.

- **Header line:** "{range text} · {n} รายการ · ใหม่สุดก่อน". The range text is ทั้งหมด, or the two dates.

- **Table columns:**
  - **เวลา**
  - **ผู้ใช้:**
    - A user: `displayName`.
    - A row with no user: "ระบบ · งานตามเวลา".
    - An `integration_api` row: "Integration API · {client displayName}". Look up `IntegrationApiClient` by the
      `clientId`s on the page in one query. If the client is missing, use the raw `clientId`.
  - **เหตุการณ์:**
    - One sentence: the action label, then the record (asset name before its tag, linked when an href exists), then the
      summary.
  - **โมดูล:** the Thai module label.
  - **Expand:** an expand button (`aria-expanded`) that opens the row with:
    - the before/after table;
    - the remark;
    - for assets, "เปิดหน้าทรัพย์สิน".
- **Phone:** each log is a card with the same parts, and the expand button stays.

- [ ] **Step 1: Write the failing pins:**
  - **`tag lookup caps and links`:**
    - The query uses `take: TAG_MATCH_CAP + 1`.
    - It shows the cap note.
    - A single match links to the asset history.
  - **`integration rows fall back to the client id`**
  - **`the approval link shows only with approval access`**
  - **`five columns with an expand button carrying aria-expanded`**
  - **`the date chip keeps the repair list unchanged`:** the repair list passes no `presets`, and the chip renders none.
  - **`kept: quick tabs, recordId chip, paging, last-page redirect, perf timing`**

- [ ] **Step 2: Run the pins and watch them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests.**
  - Run: the pins, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. List every pin you changed.

- [ ] **Step 5: Commit.**
  - Message: `feat(logs): system history to board AD-Logs: tag search, user and date filters, Thai selects, five columns with expandable rows (group 12 plan 2 task 3)`

### Task 4: The approval history page (`AD-ApprovalHistory`)

**Files:**
- Modify: `src/lib/approval-decision-log.ts`
- Modify: `src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx`
- Modify: messages
- Test: `tests/approval-decision-log.test.ts` (extend it if it exists), plus `tests/approval-history-board.test.ts` (pins)

**Interfaces:**
- Consumes from Task 1: `bangkokDayBounds` and `presetRange`.
- Consumes from Task 3: the extended date chip and the user-filter pattern.
- Produces:

```ts
export type ApprovalHistoryFilters = { module: ApprovalDecisionModuleFilter; decision: ApprovalDecisionFilter; actorId: string | null; dateFrom: string | null; dateTo: string | null }
export function parseApprovalHistoryFilters(input: Record<string, string | string[] | undefined>): ApprovalHistoryFilters
export function groupDecisionsByDay(items: ApprovalDecisionLogItem[], now: Date): { key: "today" | "yesterday" | string; items: ApprovalDecisionLogItem[] }[] // Bangkok days; string = yyyy-mm-dd
```

**Page:**
- **Header:**
  - Breadcrumb "งานรออนุมัติ › ประวัติการตัดสินใจ".
  - Button "กลับไปงานรออนุมัติ".
  - The StatStrip is removed.
- **Chips:**
  - Module chips in the order ทั้งหมด · ตัดจำหน่าย · ตรวจนับ · ซ่อมบำรุง. Decision chips stay as today.
  - The counts on both groups apply the actor and date filters, plus the viewer's permissions, but not the group's own
    selection.
- **Filters:**
  - **ผู้ตัดสินใจ:** a searchable menu of the distinct users who have a decision row the viewer may see.
  - **ช่วงวันที่:** the chip with presets.
- **Rows:**
  - Grouped under วันนี้ / เมื่อวาน / the date.
  - Each row: the document number, the asset name before its tag, the decision label, and the time.
  - Each row expands to show Thai fields (Task 2) and an "open record" link.
- **Kept:** paging, the empty state, and the record links.

- [ ] **Step 1: Write the failing tests:**
  - `parses actor and dates`
  - `groups by Bangkok day with today and yesterday`
  - `actor filter never widens what the viewer may see`: pin that the where keeps the repair-close permission rule when
    an actor is set.
  - `chip counts apply actor and date`
  - `kept: breadcrumb back to inbox, paging, empty state`

- [ ] **Step 2: Run the tests and watch them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests.**
  - Run: the tests, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(approvals): approval history to board AD-ApprovalHistory: actor and date filters, day groups, Thai detail (group 12 plan 2 task 4)`

### Task 5: E2E

**Files:**
- Create: `e2e/admin/logs.spec.ts`
- Create: `e2e/admin/logs-words.ts`
- Modify: the existing approval-history checks under `e2e/approvals`, if any break

**Tests:**
1. **Desktop: `a run asset's tag finds its logs`**
   - Create a run asset the way other specs do (`createTxAsset` in `e2e/transactions/tx-support.ts`). That write is
     allowed.
   - Open `/th/admin/logs?tag=<its tag>`.
   - Its create log shows, with the user column naming the run user who created it.
   - Expanding the row shows the before/after table.
   - Set the user filter to another run user: the list is empty.
2. **Desktop: `an unknown tag shows the not-found text`**
3. **Desktop: `date presets narrow the list`**
   - Choose วันนี้. The URL gets today's Bangkok date, and the header line shows it.
4. **Desktop: `approval history filters and day groups`**
   - Use the run IT head, who has approval rights.
   - The page shows the breadcrumb.
   - The date chip works.
   - When the list has rows, they sit under a day heading.
5. **Phone: `logs cards fit the phone`**
   - No horizontal scroll.
   - The expand button works.

**Writes:** only creating the run asset. No DELETE, no settings, no LDAP calls.

- [ ] **Step 1: Write the spec.**

- [ ] **Step 2: Run the checks.**
  - Run: `npm test` and `npx tsc --noEmit`.
  - Expected: PASS. Do not run Playwright.

- [ ] **Step 3: Commit.**
  - Message: `test(logs): E2E for system history and approval history (group 12 plan 2 task 5)`
