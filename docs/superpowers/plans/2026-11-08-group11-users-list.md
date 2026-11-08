# Page group 11, plan 1: the user list Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/users` to boards `US-Users` and `US-Users-Phone`, and add two shared parts the next plans
need:
- the user list: status, role, default-only and review filters with counts, the warning with holdings, new columns, and
  phone cards;
- a `recordId` filter on the logs page;
- a register custodian chip that names a resigned employee.

**Architecture:**
- Pure rules go in `src/lib/admin-users-list.ts`. They are unit-tested.
- The queries go in `src/lib/admin-users-page-data.ts`.
- The page in `src/app/[locale]/(dashboard)/admin/users/page.tsx` renders components from `src/components/admin/users/`.
- No migration.

**Tech Stack:** Next.js 16, Prisma 7 (SQL Server), next-intl, Tailwind, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-page-group-11-users-roles-design.md`. This plan covers §3 (account history:
the logs `recordId` filter only), §4, the §4.1 register note, §9 for the list, and §10a.

**Boards:** `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g12-boards\project\US-Users.dc.html`
and `US-Users-Phone.dc.html`.

## Global Constraints

**Keep every current feature of the list (spec §9):**
- The search keeps matching login name, display name, email and role names (`displayName`, `displayNameTh`, `name`).
- Every sort value stays valid: `createdAt` (the default), `username`, `displayName`, `email`, `lastLoginAt`.
- Page sizes come from `LIST_PAGE_SIZES`.
- A page past the end redirects to the last page.
- Rows stay clickable to `/admin/users/[id]/edit`.
- `RowActions` keeps its "แก้ไข" next step and its `moreActionsFor` label.
- The เพิ่มผู้ใช้ button keeps its `user:create` gate.
- The page keeps its `user:view` gate.
- `GET /api/admin/users` is unchanged. E2E global setup reads it.

**Words and messages:**
- Thai first, using the words in `docs/19_THAI_GLOSSARY.md`.
- Edit messages only through `node scripts/messages-edit.mjs`, in both th and en.
  - English uses ICU plurals.
  - Thai uses `{count, number}`.

**Look:**
- Design tokens only.
- Both themes.
- 44px targets below `md`.
- No horizontal page scroll at 390.
- No sticky right column on the user table, and no horizontal scroll at 1440.

**Tests:**
- Source-pin tests accept CRLF.
- Update existing pins that this plan breaks, keeping what they protect: `tests/list-pages-ui.test.ts`,
  `tests/admin-sweep-ui.test.ts`, `tests/v-track-s.test.ts`, `tests/mobile-field-navigation.test.ts`,
  `tests/e2e-review.test.ts`, `tests/production-readiness.test.ts`.
- Only the controller runs E2E.
- E2E runs on the dev DB with run-marked data only.
- E2E never does any of these: DELETE requests, LDAP sync, saving settings, failed logins, or editing seed roles or
  `system_admin`.

## Review Focus

1. **A `role=` id that does not exist, or a garbage value:**
   - It is ignored: the chip reads "บทบาท: ทุกบทบาท", and the page does not crash.
   - Task 1 test: `an unknown role id is ignored`.
2. **`status=defaultOnly` when the default role is missing from the database:**
   - The chip is hidden, and the status falls back to `all`.
   - Task 1 test: `defaultOnly falls back when the default role is missing`.
3. **A legacy user with no roles:**
   - "มีแค่บทบาทเริ่มต้น" never matches them, because the where needs `some` as well as `every`.
   - Task 1 test: `defaultOnly needs at least one role`.
4. **An employee who is `suspended` but `isActive: true`:**
   - They have not left, so there is no warning and no badge.
   - Task 1 test: `only resigned or inactive employees have left`.
5. **A phone at 390 with a long Thai name and five roles:**
   - The card wraps, shows 2 chips and "+3", and does not scroll sideways.
   - Task 4 pin: `user cards wrap and cap role chips`.

---

### Task 1: List rules (`src/lib/admin-users-list.ts`)

**Files:**
- Create: `src/lib/admin-users-list.ts`
- Test: `tests/admin-users-list.test.ts`

**Interfaces:**

Produces:

```ts
export const USER_STATUS_FILTERS = ["all", "active", "inactive", "never", "defaultOnly", "review"] as const
export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]
export type UserListFilters = { status: UserStatusFilter; roleId: string | null }
export function parseUserListFilters(input: { status?: string | string[]; role?: string | string[] }): UserListFilters
// Drops a roleId not in knownRoleIds, and a defaultOnly status when defaultRoleId is null.
export function resolveUserListFilters(filters: UserListFilters, knownRoleIds: ReadonlySet<string>, defaultRoleId: string | null): UserListFilters
export function userStatusWhere(status: UserStatusFilter, defaultRoleId: string | null): Prisma.UserWhereInput
export function userRoleWhere(roleId: string | null): Prisma.UserWhereInput
export const EMPLOYEE_LEFT_WHERE: Prisma.EmployeeWhereInput // { OR: [{ isActive: false }, { employmentStatus: "resigned" }] }
export function employeeHasLeft(employee: { isActive: boolean; employmentStatus: string } | null): boolean
export function splitRoleChips<T>(roles: readonly T[], visible?: number): { shown: T[]; rest: T[] } // visible defaults to 2
// Keeps search, sort, direction and pageSize from MasterDataListState, and adds status (omitted when "all") and role.
export function buildUserListQuery(state: MasterDataListState<string>, filters: UserListFilters, next?: Partial<MasterDataListState<string> & UserListFilters>): string
```

`userStatusWhere` rules (spec §4.1 and §4.2):

| status | where |
|---|---|
| `all` | `{}` |
| `active` | `isActive: true` |
| `inactive` | `isActive: false` |
| `never` | `lastLoginAt: null` |
| `defaultOnly` | `isActive: true`, `userRoles: { some: {}, every: { roleId } }` |
| `review` | `isActive: true`, `employee: EMPLOYEE_LEFT_WHERE` |

- [ ] **Step 1: Write the failing tests** in `tests/admin-users-list.test.ts`:
  - `parses status and role, defaulting to all`:
    - `{}` gives `{ status: "all", roleId: null }`.
    - `{ status: "never", role: "r1" }` gives `{ status: "never", roleId: "r1" }`.
    - `{ status: "junk" }` gives status `"all"`.
    - An array takes its first value.
  - `an unknown role id is ignored`: `resolveUserListFilters({status:"all", roleId:"x"}, new Set(["r1"]), null).roleId === null`.
  - `defaultOnly falls back when the default role is missing`: `resolveUserListFilters({status:"defaultOnly", roleId:null}, new Set(), null).status === "all"`.
  - `defaultOnly needs at least one role`: `userStatusWhere("defaultOnly", "d1")` deep-equals
    `{ isActive: true, userRoles: { some: {}, every: { roleId: "d1" } } }`.
  - `review matches active accounts whose employee has left`: deep-equal to the table row.
  - `only resigned or inactive employees have left`:
    - `employeeHasLeft({isActive:true, employmentStatus:"suspended"}) === false`
    - `({isActive:false, employmentStatus:"active"})` gives `true`
    - `({isActive:true, employmentStatus:"resigned"})` gives `true`
    - `null` gives `false`
  - `splits role chips after two`: 5 roles give 2 shown and 3 rest; 2 roles give 2 and 0.
  - `the query keeps search, sort, page size and filters`:
    - `buildUserListQuery({search:"ab", page:3, pageSize:50, sort:"lastLoginAt", direction:"desc"}, {status:"review", roleId:"r1"}, {page:1})`
      contains `search=ab`, `page=1`, `pageSize=50`, `sort=lastLoginAt`, `direction=desc`, `status=review` and `role=r1`.
    - With status `all`, it has no `status=`.

- [ ] **Step 2: Run them and see them fail.**
  - Run: `node --test tests/admin-users-list.test.ts`
  - Expected: FAIL, because the module does not exist yet.

- [ ] **Step 3: Implement the module.**
  - Base `buildUserListQuery` on `buildMasterDataQueryString` from `src/lib/master-data-query.ts`.
  - Do not change that helper.

- [ ] **Step 4: Run the tests.**
  - Run: `node --test tests/admin-users-list.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(users): list rules: status, role, default-only and review filters (group 11 plan 1 task 1)`

### Task 2: The desktop list (`US-Users`)

**Files:**
- Create: `src/lib/admin-users-page-data.ts`
- Create: `src/components/admin/users/user-status-chips.tsx`
- Create: `src/components/admin/users/user-role-filter-chip.tsx` (`"use client"`)
- Create: `src/components/admin/users/user-review-warning.tsx`
- Create: `src/components/admin/users/user-roles-cell.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/users/page.tsx`
- Modify: `messages/th.json` and `messages/en.json`, through the script
- Test: `tests/admin-users-board.test.ts` (source pins), plus updates to the existing pins listed in Global Constraints

**Interfaces:**

Consumes, from Task 1: `parseUserListFilters`, `resolveUserListFilters`, `userStatusWhere`, `userRoleWhere`,
`EMPLOYEE_LEFT_WHERE`, `employeeHasLeft`, `splitRoleChips`, `buildUserListQuery`.

Produces, for Task 4:

```ts
export type UserListRow = {
  id: string; username: string; displayName: string; email: string | null; isActive: boolean; lastLoginAt: Date | null
  isSelf: boolean
  employee: { id: string; code: string; fullNameTh: string; departmentName: string; branchName: string; hasLeft: boolean; heldAssetCount: number } | null
  roles: { id: string; label: string }[] // label = displayNameTh || displayName, ordered by role name
}
export type UsersPageData = {
  rows: UserListRow[]; total: number; grandTotal: number
  statusCounts: Record<UserStatusFilter, number> // follow search + role filter; defaultOnly absent when defaultRoleId is null
  reviewTotal: number // global (no search, no role filter)
  roleOptions: { value: string; label: string }[] // every role, active and inactive; label "ชื่อไทย · key"
  defaultRoleId: string | null
  filters: UserListFilters // already resolved
}
export async function loadUsersPageData(input: { listState: MasterDataListState<UserSort>; filters: UserListFilters; viewerId: string }): Promise<UsersPageData>
```

**What `loadUsersPageData` does:**
- **Default role:** reads the `ldap_default_role` system setting and passes it through `getLdapConfig({ ldap_default_role })`
  from `src/lib/ldap-auth.ts`. Then it looks the role up by name. The id is `null` when that role does not exist.
- **Holdings:** `heldAssetCount` comes from one
  `asset.groupBy({ by: ["custodianId"], where: { custodianId: { in: employeeIdsOnThisPage } }, _count: true })`.
- **Counts:** `statusCounts` is one `count` per status, run in parallel. Each count uses the search where AND the role
  where AND that status's where.

- [ ] **Step 1: Add messages under `adminUsersPage`** with `node scripts/messages-edit.mjs`, in Thai and English. In the
  Thai, `{count}` and `{shown}` appear as `{x, number}`.

| key | Thai |
|---|---|
| `status.label` | กรองตามสถานะ |
| `status.all` | ทั้งหมด |
| `status.active` | ใช้งาน |
| `status.inactive` | ไม่ใช้งาน |
| `status.never` | ไม่เคยเข้าสู่ระบบ |
| `status.defaultOnly` | มีแค่บทบาทเริ่มต้น |
| `status.review` | ควรตรวจ |
| `roleFilter` | บทบาท |
| `roleFilterAll` | ทุกบทบาท |
| `roleFilterSearch` | ค้นหาบทบาท |
| `roleFilterEmpty` | ไม่พบบทบาท |
| `searchPlaceholder` | ค้นหาชื่อ ชื่อผู้ใช้ อีเมล |
| `reviewTitle` | ควรตรวจ {count} บัญชี |
| `reviewDetail` | บัญชียังใช้งานอยู่ แต่พนักงานที่ผูกไว้ลาออกแล้ว ควรปิดใช้งานหรือผูกพนักงานใหม่ |
| `reviewShort` | พนักงานที่ผูกไว้ลาออกแล้ว |
| `reviewLink` | ดู {count} บัญชีนี้ |
| `columnUser` | ผู้ใช้ |
| `columnEmployee` | พนักงานที่ผูก |
| `noEmployeeLinked` | ไม่ผูกพนักงาน |
| `employeeLeft` | พนักงานลาออกแล้ว |
| `heldAssets` | ยังถือครองทรัพย์สิน {count} รายการ |
| `you` | คุณ |
| `moreRoles` | +{count} |
| `moreRolesLabel` | ดูบทบาทอีก {count} บทบาท: {names} |
| `neverLoggedIn` | ยังไม่เคยเข้าสู่ระบบ |
| `listRange` | รายชื่อผู้ใช้ {from}–{to} จาก {total} |
| `foundCount` | พบ {shown} จาก {total} บัญชี |
| `lastLoginShort` | เข้าสู่ระบบล่าสุด {time} |
| `editUserLabel` | แก้ไขผู้ใช้ {name} |

- [ ] **Step 2: Write the failing pins** in `tests/admin-users-board.test.ts`. They read the page and component
  sources with CRLF normalised:
  - **`the list has the board's filters`:**
    - The page renders `UserStatusChips` and `UserRoleFilterChip`.
    - The search placeholder is `searchPlaceholder`.
    - The page passes `hiddenInputs` with `status` and `role`.
  - **`status chips are links with counts and aria-current`:**
    - `user-status-chips.tsx` renders `<Link` with `aria-current`.
    - It hides `defaultOnly` when the count is missing.
    - It renders `review` only when it is the chosen status.
  - **`the role chip is a searchable filter that resets the page`:**
    - `user-role-filter-chip.tsx` uses `FilterMenuChip` with `searchable`.
    - On change it calls `router.push` with `buildUserListQuery(..., { roleId, page: 1 })`.
  - **`the warning links to the review filter`:** `user-review-warning.tsx` renders nothing when `count === 0` and
    links with `status: "review"`.
  - **`the table has the board's columns and no sticky column`:**
    - The headers are `columnUser`, `columnEmployee`, `roles`, `status`, `lastLoginAt` and the actions column.
    - There is no `sticky="right"` in the users page.
    - `sortBy("displayName")` is on the user column, and `sortBy("lastLoginAt")` is on the last-login column.
  - **`rows show you, left employees and holdings`:**
    - The page renders the `you` badge when `row.isSelf`.
    - It renders the `employeeLeft` badge when `employee.hasLeft`.
    - It renders the `heldAssets` link to `/assets?custodianId=` only when `hasPermission(currentUser, "asset", "view")`,
      and plain text otherwise.
  - **`role chips cap at two with a +N disclosure`:**
    - `user-roles-cell.tsx` uses `splitRoleChips` and a `<details>` whose summary has `aria-label` from `moreRolesLabel`.
    - The `<details>` carries `data-no-row-click`.
  - **`kept: search by role names, every sort, page sizes, redirect past the end, create gate`:** the old where
    (`userRoles` with `displayName`, `displayNameTh` and `name`), `userSorts`, `LIST_PAGE_SIZES`, `redirect(` and
    `hasPermission(currentUser, "user", "create")`.

- [ ] **Step 3: Run the pins and see them fail.**
  - Run: `node --test tests/admin-users-board.test.ts`
  - Expected: FAIL.

- [ ] **Step 4: Build `loadUsersPageData` and the components, and rewrite the page body to the board's layout.**

  **Page layout, top to bottom:**
  1. The header, with the new subtitle (the existing `subtitle` key).
  2. The warning (`reviewTotal`).
  3. A toolbar row: status chips, the role chip, and the search on the right.
  4. The table, with `listRange` in the pagination range label.

  **Each cell:**
  - **User:** `displayName` in medium weight, plus the `you` badge. Under it, the `username` in a mono `tag` and the
    email, in meta size.
  - **Employee:** `fullNameTh`. Under it, `code · departmentName · branchName`. Then the `employeeLeft` badge and the
    `heldAssets` text or link. It shows `noEmployeeLinked` when there is no employee.
  - **Roles:** `UserRolesCell`.
  - **Status:** today's `StatusBadge`.
  - **Last login:** `formatDateTime`, or `neverLoggedIn` in the warning tone.
  - **Actions:** `RowActions` as today, in a plain column (not sticky).

  **Desktop only:** wrap the toolbar and table in `hidden md:block`. Task 4 adds the phone list.

  **Tidy-up:** remove message keys that are no longer used only if no other file uses them, checked with `grep`.

- [ ] **Step 5: Run the checks.**
  - Run: `node --test tests/admin-users-board.test.ts tests/admin-users-list.test.ts`, then `npm test`, then `npx tsc --noEmit`.
  - Expected: all PASS. Update any existing pin the rewrite breaks, keeping what it protects. List each one in the report.

- [ ] **Step 6: Commit.**
  - Message: `feat(users): user list to board US-Users: status, role, default-only and review filters with counts, warning with holdings, new columns (group 11 plan 1 task 2)`

### Task 3: Logs `recordId` filter and the register's resigned custodian chip

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/logs/page.tsx`
- Modify: `src/lib/system-log-history.ts` (add one helper)
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx`, around lines 151 and 307–321
- Modify: messages, through the script
- Test: `tests/system-log-record-filter.test.ts`, `tests/register-custodian-chip.test.ts`

**Interfaces:**

Produces, for plans 2 and 3:

```ts
// src/lib/system-log-history.ts
export function buildSystemLogRecordHref(locale: string, module: string, recordId: string): string // `/${locale}/admin/logs?module=${module}&recordId=${recordId}` (URL-encoded)
```

**Who can open these links:** the logs page gate stays `requirePagePermission(locale, "system", "view")`. Plans 2 and 3
show history links only when `hasPermission(user, "system", "view")`.

- [ ] **Step 1: Add the message.**
  - Key: `systemLogPage.recordFilterChip`, Thai "รายการที่เลือก: {label}".
  - `{label}` is the record label from `buildSystemLogRecordLabels`, or the id when there is no label.

- [ ] **Step 2: Write the failing tests:**
  - **`buildSystemLogRecordHref encodes module and record`:** `("th","user","a b")` gives `/th/admin/logs?module=user&recordId=a+b`.
  - **`the logs page filters by recordId and keeps it`** (pins):
    - The `searchParams` type has `recordId`.
    - The `where` adds `recordId` when it is set.
    - `listHref` and the quick-filter hrefs keep `recordId`.
    - The filter form has a hidden `recordId` input.
    - A `FilterChipList` chip removes it.
    - `hasFilters` counts it.
  - **`the register names a custodian who is not active`** (pin on `assets/page.tsx`): when `filters.custodianId` is
    not among the active `employees`, the page loads it with
    `prisma.employee.findUnique({ where: { id: filters.custodianId }, select: { code: true, fullNameTh: true } })`, and
    the chip label uses it.

- [ ] **Step 3: Run the tests and see them fail.**
  - Run: `node --test tests/system-log-record-filter.test.ts tests/register-custodian-chip.test.ts`
  - Expected: FAIL.

- [ ] **Step 4: Implement.**
  - Leave the register's employee option lists (active only) unchanged.
  - Only the chip label lookup changes.

- [ ] **Step 5: Run the checks.**
  - Run: the two tests, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 6: Commit.**
  - Message: `feat(logs): recordId filter with a chip, and the register names a resigned custodian (group 11 plan 1 task 3)`

### Task 4: Phone cards (`US-Users-Phone`) and E2E

**Files:**
- Create: `src/components/admin/users/user-list-cards.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/users/page.tsx`
- Create: `e2e/admin/users-list.spec.ts` and `e2e/admin/users-words.ts`
- Modify: `e2e/support/allow-list.ts`, only if the new spec's writes need entries there (read it first)
- Test: `tests/admin-users-board.test.ts` (add pins), and `tests/e2e-*.test.ts` pins if they list spec folders

**Interfaces:** consumes `UsersPageData` and `UserListRow` from Task 2.

**The phone page (`md:hidden`), top to bottom:**
1. The search field, 44px tall with a 16px font.
2. A scrolling chip row (`overflow-x-auto`): the role chip first, then the status chips.
3. The warning as one tappable line (`reviewShort`).
4. `foundCount`, where `shown` is `total` and `total` is `grandTotal`.
5. Cards.
6. Pagination as on desktop.

**Each card is one `<a>` to the edit page,** with `aria-label` from `editUserLabel` plus " (คุณ)" for the viewer's own
account. It shows:
- The name, the `you` badge and the status badge.
- The login name (mono), the department and the branch.
- The role chips, through `splitRoleChips`. On the phone the "+N" is plain text, because the card itself is the link.
- `lastLoginShort`, or `neverLoggedIn`.
- A "แก้ไข ›" hint.

On the phone, the header's เพิ่มผู้ใช้ button keeps its label (the shell's top bar stays as it is) **(ruling: no new top
bar)**.

- [ ] **Step 1: Write the failing pin `user cards wrap and cap role chips`:**
  - `user-list-cards.tsx` uses `splitRoleChips`, `flex-wrap`, `min-w-0` and `break-words`.
  - The cards have no fixed width.
  - The page renders it inside `md:hidden`.
  - Each card is a link with `aria-label`.

- [ ] **Step 2: Run the pin and see it fail.**
  - Run: `node --test tests/admin-users-board.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement the cards.**

- [ ] **Step 4: Write `e2e/admin/users-list.spec.ts`.** Use the seed-admin storage state like other admin specs, and run
  data from `readRunData()`. Put the Thai strings in `users-words.ts`.

  **Desktop project:**
  - **`run users are found and filtered by role`:**
    - Search the run id.
    - Pick the run viewer role in the role chip.
    - Rows narrow to that role's user.
    - The status chip counts read from the page add up: `ใช้งาน + ไม่ใช้งาน = ทั้งหมด`.
  - **`never logged in shows the unlinked run user`:**
    - Search `e2e.unlinked-` plus the run suffix, then choose ไม่เคยเข้าสู่ระบบ.
    - That user is listed.
  - **`a resigned employee's account is flagged and the holdings link opens the register`:**
    1. Create a run-marked employee with `POST /api/employees`, coded like the run's other employees, active.
    2. Create a user linked to it with `POST /api/admin/users`, using the run viewer role and a random password.
    3. Set the employee to `employmentStatus: "resigned"` with `PUT /api/employees/[id]`.
    4. Open `/th/admin/users?status=review&search=<that username>`.
    5. The row shows พนักงานลาออกแล้ว.
    6. The warning shows on the unfiltered page.

  **Phone project:**
  - **`cards on the phone`:**
    - Search the run id.
    - Cards show the run users' names.
    - The page has no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`).

  **Writes:** none besides the three requests above. No DELETE.

- [ ] **Step 5: Run the checks.**
  - Run: `npm test` and `npx tsc --noEmit`.
  - Expected: PASS.
  - Do not run Playwright; the controller runs E2E.

- [ ] **Step 6: Commit.**
  - Message: `feat(users): phone cards (board US-Users-Phone) and E2E for the user list (group 11 plan 1 task 4)`
