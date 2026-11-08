# Page group 12, plan 1: denied page and readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the denied page (`AD-Denied`) and the readiness page (`AD-Readiness`) from their boards.
- The denied page names the blocked page and shows the permission in Thai, the viewer's roles, the IT Helpdesk contact
  and a back button.
- The approvals pages redirect to the denied page instead of returning 404.
- Readiness groups its checks, adds filter chips, a "ขั้นถัดไป" card, Thai values and where-to-fix lines.

**Architecture:**
- `src/lib/access-denied.ts` builds a safe `from` path and an `approval` permission value.
- `src/lib/page-auth.ts` passes `from` on every permission redirect.
- The denied page reads the page name from the login page's route table (`getLoginDestinationKey`), extended with the
  admin sub-pages.
- A pure readiness presenter (`src/lib/readiness-presenter.ts`) groups and sorts the checks. Each check gets a
  structured `display` value for Thai text.
- Two new settings keys (`it_helpdesk_phone`, `it_helpdesk_email`) live on the settings Organization tab.
- No migration.

**Tech Stack:** Next.js 16, Prisma 7, next-intl, Tailwind, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md`: §3, §6, §9, §12, §15 items 7–8. Recon:
`docs/superpowers/specs/2026-11-08-page-group-12-admin-recon.md` §6, §8 (kept features).

**Boards:**
- `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g13-boards\project\AD-Denied.dc.html`
- `AD-Readiness.dc.html` in the same folder

## Global Constraints

**Kept:**
- The denied page's home button goes to `getDefaultHomeHref`.
- The work-center button shows only with `dashboard:view`.
- `requirePagePermission`'s signature and its login redirect for signed-out users stay as they are.
- The readiness gate stays `setting:view`. All 16 checks stay, with their fix text or links. The scope notice stays.
- No secret value is ever shown: `AUTH_SECRET`, DB password and tokens show only as set or not set.

**`from` is display-only:**
- It is the request path without its query.
- It must start with `/<locale>/` and contain no `//`, no `\` and no `:`.
- It is never used as a redirect or link target.
- Anything else is dropped.

**Thai text:**
- Thai first, using the words in `docs/19_THAI_GLOSSARY.md`.
- Change messages only through `node scripts/messages-edit.mjs`, in both th and en.
- English uses ICU plurals. Thai uses `{x, number}`.

**Look and layout:**
- Tokens only, and both themes.
- Tap targets are at least 44px below `md`.
- No horizontal page scroll at 390, and none at 1024.

**Tests:**
- Source pins must pass with CRLF line endings.
- If you break an existing pin, update it so it still protects the same thing: `tests/asset-register-ux.test.ts`,
  `tests/e2e-cross-cutting.test.ts`, `tests/list-pages-ui.test.ts`, and any readiness pin (`grep -l readiness tests`).

**E2E:**
- Only the controller runs E2E.
- Run it on the dev DB.
- Never save settings, never test or sync LDAP, never call `/api/notifications/digest`, and never send DELETE.

## Review Focus

1. **A `from` like `/th//evil.com`, `https://x`, `/en/...` on a `th` page, or a path with a query.**
   - Expected: the page shows "หน้านี้" and the query never appears.
   - Task 1 test: `from is a safe internal path or nothing`.
2. **A viewer with several roles, some of them inactive.**
   - Expected: only the active role names show, joined by " · ".
   - Task 1 test: `roles line lists active roles only`.
3. **An unknown module or action in the URL (an old link).**
   - Expected: the raw code shows in the permission line as a fallback, and the page does not crash.
   - Task 1 test: `unknown permission words fall back to the code`.
4. **Helpdesk email saved as junk text.**
   - Expected: PUT refuses it with a field error. An empty value is allowed and hides the box.
   - Task 2 test: `helpdesk email must be an email or empty`.
5. **Readiness when every check passes.**
   - Expected: no "ขั้นถัดไป" card, the ต้องแก้ chip shows 0, and groups still list their checks.
   - Task 3 test: `all pass shows no next-steps card`.

---

### Task 1: Denied page core (`from`, Thai words, roles, back, approvals redirect)

**Files:**
- Modify: `src/lib/access-denied.ts`
- Modify: `src/lib/page-auth.ts`
- Modify: `src/lib/login-page.ts`, to extend `destinationRoutes` with the admin sub-pages
- Modify: `src/app/[locale]/(dashboard)/access-denied/page.tsx`
- Create: `src/components/ui/history-back-button.tsx` (client), unless one already exists (grep `history.back`)
- Modify: `src/app/[locale]/(dashboard)/admin/approvals/page.tsx` and `.../admin/approvals/history/page.tsx`
- Modify: messages through the script
- Test: `tests/access-denied.test.ts`

**Interfaces:**

Produces:

```ts
// src/lib/access-denied.ts
export const APPROVAL_PERMISSION = "approval" // module value meaning "disposal:approve OR audit:approve"
export function sanitizeDeniedFrom(locale: string, rawPath: string | null | undefined): string | null
export function buildAccessDeniedHref(input: { locale: string; module: string; action: string; from?: string | null }): string
// from is sanitized; omitted when null
export function permissionWordKeys(module: string, action: string): { action: string | null; module: string | null } // message keys under adminRolesPage, or null when unknown
```

**Routes to add to `destinationRoutes`** in `login-page.ts`, before the `["admin"]` catch-all. Each maps to an existing
`nav.*` key:

| route | key |
|---|---|
| `admin/users` | `nav.userManagement` |
| `admin/roles` | `nav.rolePermission` |
| `admin/settings` | `nav.systemSetting` |
| `admin/logs` | `nav.systemLog` |
| `admin/data-quality` | `nav.dataQuality` |
| `admin/integrations` | `nav.integrationApi` |
| `admin/storage` | `nav.fileStorage` |
| `admin/readiness` | `nav.productionReadiness` |
| `master-data/companies` | `nav.company` |
| `master-data/branches` | `nav.branch` |
| `master-data/departments` | `nav.department` |
| `master-data/employees` | `nav.employee` |
| `master-data/locations` | `nav.location` |
| `master-data/categories` | `nav.category` |
| `master-data/brands` | `nav.brandModel` (check the real route names with `ls`) |
| `master-data/suppliers` | `nav.supplier` |
| `audit` | `nav.audit` |

**Messages** (`accessDeniedPage.*`, Thai; you write the English):

| key | Thai |
|---|---|
| `titleNamed` | ไม่มีสิทธิ์เปิดหน้า {page} |
| `thisPage` | หน้านี้ |
| `needs` | สิทธิ์ที่ต้องใช้: {permission} |
| `permissionWords` | {action} · {module} |
| `approvalWords` | อนุมัติ · ตัดจำหน่าย หรือ อนุมัติ · ตรวจนับ |
| `yourRoles` | บทบาทของคุณ: {roles} |
| `noRoles` | บทบาทของคุณ: ยังไม่มีบทบาท |
| `reassure` | ไม่มีข้อมูลใดหายหรือถูกบันทึก ถ้าคุณต้องใช้หน้านี้ ให้ขอสิทธิ์จากผู้ดูแลระบบ |
| `goBack` | กลับหน้าก่อน |
| `yourHome` | หน้าแรกของคุณ: {home} |

**Rules:**
- `requirePagePermission` reads the request-path header (`requestPathHeader`). It passes it as `from` to
  `buildAccessDeniedHref`, which sanitizes it.
- `buildAccessDeniedHref` keeps the existing `module` and `action` params, unchanged.
- **The approvals inbox and approval history:** when `!canAnyApproval`, redirect to
  `buildAccessDeniedHref({ locale, module: APPROVAL_PERMISSION, action: "approve", from })` instead of calling
  `notFound()`.
- **The page shows:**
  - The title `titleNamed`, where `{page}` comes from `t(getLoginDestinationKey(locale, from))`. A null or fallback key
    gives `thisPage`.
  - The permission line:
    - `approvalWords` for `approval`.
    - Otherwise `permissionWords`, built from `adminRolesPage.actions.*` and `adminRolesPage.modules.*`.
    - Unknown words fall back to the raw `module:action`.
  - The roles of the signed-in user: active roles only, `displayNameTh || displayName`, joined by " · ".
  - `reassure`.
  - The buttons: home (primary), back (outline, client `history.back()`), and the work center when allowed.
  - `yourHome`, where the home name is `nav.myAssets` or `nav.dashboard`, matching `getDefaultHomeHref`.

- [ ] **Step 1: Write the failing tests** in `tests/access-denied.test.ts`:
  - **`from is a safe internal path or nothing`:**
    - `sanitizeDeniedFrom("th", "/th/admin/settings?tab=x")` returns `"/th/admin/settings"`.
    - These all return `null`: `"/th//evil.com"`, `"https://evil.com"`, `"/en/admin"` with locale `th`, `"/th\\x"`,
      `null`.
  - **`the denied href carries from only when safe`:**
    - `buildAccessDeniedHref({ locale:"th", module:"setting", action:"view", from:"/th/admin/settings?tab=ldap" })`
      contains `from=%2Fth%2Fadmin%2Fsettings`.
    - The result never contains `tab=ldap`.
  - **`admin sub-pages get their own name`:** `getLoginDestinationKey("th","/th/admin/settings")` returns
    `"nav.systemSetting"`.
  - **`unknown permission words fall back to the code`:** `permissionWordKeys("foo","bar")` returns
    `{ action:null, module:null }`.
  - **`roles line lists active roles only`:**
    - Pin the page source: it filters `role.isActive` and joins with `" · "`.
    - Or test a helper, if you extract one.
  - **`approvals pages redirect to the denied page`:** pin that both approval pages call `buildAccessDeniedHref` with
    `APPROVAL_PERMISSION` and no longer call `notFound()` for access.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `node --test tests/access-denied.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement.** Find the login-page tests (`grep -l getLoginDestinationKey tests`) and keep them passing.

- [ ] **Step 4: Run the tests.**
  - Run the test file, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. List every pin you changed.

- [ ] **Step 5: Commit.**
  - Message: `feat(access): the denied page names the page, the permission in Thai and your roles, with a back button; approvals pages redirect there (group 12 plan 1 task 1)`

### Task 2: IT Helpdesk contact — REMOVED (user decision 2026-11-08: "ไม่จำเป็นต้องมี"; no helpdesk keys, no settings fields, no box on the denied page; Review Focus item 4 is void)

**Files:**
- Modify: `src/lib/system-setting-defaults.ts`, adding two keys
- Modify: the settings PUT validation (find where per-key rules live: `grep -n "company_name\|fieldErrors" src/app/api/admin/settings/route.ts src/lib/system-setting*.ts`)
- Modify: `src/components/admin/system-settings-form.tsx` (Organization tab, two fields)
- Modify: `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, for labels if needed
- Modify: `src/app/[locale]/(dashboard)/access-denied/page.tsx`
- Modify: messages
- Test: `tests/it-helpdesk-settings.test.ts`

**Interfaces:**

Produces:

```ts
export const itHelpdeskPhoneKey = "it_helpdesk_phone" // default "", description "เบอร์โทร IT Helpdesk ที่แสดงในหน้าไม่มีสิทธิ์"
export const itHelpdeskEmailKey = "it_helpdesk_email" // default "", description "อีเมล IT Helpdesk ที่แสดงในหน้าไม่มีสิทธิ์"
```

**Validation:**
- **Phone:** empty, or up to 50 characters of digits, spaces and `+-()`.
- **Email:** empty, or a valid email of up to 200 characters.
- A bad value gives a field error with the existing settings field-error shape. Thai messages:
  - `phone`: "ใส่เบอร์โทรให้ถูกรูปแบบ"
  - `email`: "ใส่อีเมลให้ถูกรูปแบบ"

**Organization tab:**
- Two fields after the currency field:
  - "เบอร์โทร IT Helpdesk"
  - "อีเมล IT Helpdesk"
- One hint: "แสดงในหน้าไม่มีสิทธิ์ ปล่อยว่างถ้ายังไม่ต้องการแสดง".
- The fields use the form's existing `getValue` and `setValue` and its field errors. They join the overview, search and
  review table the same way `company_name` does.

**Denied-page box** (`accessDeniedPage.helpdesk*`):
- The title is "ติดต่อ IT Helpdesk".
- The phone is a `tel:` link and the email a `mailto:` link.
- The box is hidden when both values are empty.

- [ ] **Step 1: Write the failing tests:**
  - `helpdesk keys exist with empty defaults`
  - `helpdesk email must be an email or empty`
  - `helpdesk phone allows digits, spaces and +-()`
  - `the denied page hides the helpdesk box when both are empty` (source pin)
  - `the organization tab has both fields` (source pin)

- [ ] **Step 2: Run the tests and watch them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests.**
  - Run the test file, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(access): IT Helpdesk phone and email in settings, shown on the denied page (group 12 plan 1 task 2)`

### Task 3: Readiness page (`AD-Readiness`)

**Files:**
- Modify: `src/lib/production-readiness.ts`. Each check gains `display` and `fixEnv`. The scheduler tokens are reported
  per token.
- Create: `src/lib/readiness-presenter.ts` (pure)
- Modify: `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`
- Modify: messages
- Test: `tests/readiness-presenter.test.ts`, plus updates to the existing readiness pins

**Interfaces:**

Produces:

```ts
// production-readiness.ts — added to ProductionReadinessCheck (value: string stays for compatibility)
display: { key: string; values?: Record<string, string | number> } // message key under readinessPage.values.*
fixEnv: string[] // env var names to set on the server ([] when fixed in-app via href)
// ProductionReadinessDeploymentInput gains per-token booleans; schedulerTokens display names the missing ones

// readiness-presenter.ts
export type ReadinessGroupKey = "access" | "backupJobs" | "workflowData" | "filesApp"
export const READINESS_GROUPS: readonly { key: ReadinessGroupKey; checks: readonly ProductionReadinessCheckKey[] }[]
// access: adminCoverage, authSecret, appBaseUrl, databaseConfig
// backupJobs: backupStatus, backupRestoreDrill, schedulerTokens, schedulerRuns, retentionPolicy
// workflowData: publicQrBaseUrl, workflowApprovers, notificationRules, masterData
// filesApp: uploadDir, uploadScanner, pwaAssets
export type ReadinessFilter = "all" | "fail" | "warning" | "pass"
export function parseReadinessFilter(value: string | string[] | undefined): ReadinessFilter
export function groupReadiness(checks: readonly ProductionReadinessCheck[], filter: ReadinessFilter): { key: ReadinessGroupKey; counts: Record<"fail"|"warning"|"pass", number>; checks: ProductionReadinessCheck[] }[] // sorted fail→warning→pass; empty groups dropped under a filter
export function nextSteps(checks: readonly ProductionReadinessCheck[]): ProductionReadinessCheck[] // fail only
```

**Page (from the board):**

- **Header:**
  - The title and subtitle as today.
  - A "ตรวจเมื่อ {time}" line, where the time is `formatDateTime(new Date())` at render.
- **"ขั้นถัดไป" card:**
  - Shown only when `nextSteps` is not empty.
  - One line per fail, with its fix: the env names plus "แล้วรีสตาร์ตแอป", or a link.
  - The note "ต้องให้ผู้ดูแลเซิร์ฟเวอร์ตั้งค่าและรีสตาร์ตแอป" appears when any of them has `fixEnv`.
- **Filter chips** (`filter=`):
  - ทั้งหมด, ต้องแก้, ควรตรวจ, พร้อม, each with its count, as link chips with `aria-current`.
  - A sum line under them.
- **Groups:**
  - The 4 groups, each with a heading, its counts, and a table:
    - **สถานะ:** a badge.
    - **รายการตรวจ:** the title, plus a Thai sentence on why it matters (the existing description).
    - **ค่าที่ตรวจพบ:** `t("values." + display.key, display.values)`.
    - **แก้ที่ไหน:** the env names in mono, plus "แล้วรีสตาร์ตแอป", or the link with its existing label.
  - **Phone:** a card per check.
- **Master data** links to `/master-data` (today it links to data-quality).
- **Kept:** the scope notice.
- **Removed:** the StatStrip. The chips carry the counts.

**Messages:**
- `readinessPage.values.*`: Thai values, for example:
  - `configured` "ตั้งแล้ว"
  - `notConfigured` "ยังไม่ได้ตั้ง"
  - `configuredOf` "ตั้งแล้ว {have, number} จาก {total, number} ค่า"
  - `secretHidden` "ระบบไม่แสดงค่าคีย์"
  - `tokensMissing` "ยังไม่ได้ตั้ง: {names}"
  - `noRunsYet` "ยังไม่เคยทำงาน"
- Plus the group, chip and next-step words. Every display key a check can produce must exist; a test checks this.

- [ ] **Step 1: Write the failing tests:**
  - **`the four groups cover the 16 checks once`**
  - **`groups sort fail, warning, pass`**
  - **`a filter keeps only matching checks and drops empty groups`**
  - **`all pass shows no next-steps card`:** `nextSteps(allPass)` returns `[]`, and the page pins the condition.
  - **`every display key has a Thai message`:** build checks from a few inputs, then assert that each `display.key`
    exists in `messages/th.json` under `readinessPage.values`.
  - **`scheduler tokens name the missing one`**
  - **`no check display carries a secret value`:** with input secrets set to `"s3cret"`, no `display.values` contains
    `"s3cret"`.

- [ ] **Step 2: Run the tests and watch them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests.**
  - Run the test file, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. List every pin you changed.

- [ ] **Step 5: Commit.**
  - Message: `feat(readiness): readiness to board AD-Readiness: groups, filter chips, next steps, Thai values and where to fix (group 12 plan 1 task 3)`

### Task 4: E2E

**Files:**
- Create: `e2e/admin/denied-readiness.spec.ts`
- Create: `e2e/admin/denied-readiness-words.ts`
- Modify: specs under `e2e/approvals/` that expect a 404 for a viewer without approval access. Grep for them; they
  should now expect the denied page.

**Tests:**

1. **`a run user without a permission sees the page named and the permission in Thai`**
   - User: the run viewer, which has no `setting:view`. Check this in `e2e/support/run-plan.ts`; if the viewer has it,
     pick another run user who lacks it.
   - Open `/th/admin/settings`. The URL becomes `/th/access-denied?...&from=%2Fth%2Fadmin%2Fsettings`.
   - The title names the settings page.
   - The permission line is "ดู · ตั้งค่าระบบ" or the real Thai module word.
   - The roles line shows the run role.
   - The back button exists.
   - Runs in desktop and phone.
2. **`approvals pages send a non-approver to the denied page`**
   - User: a run user without approval rights.
   - Open `/th/admin/approvals`. The page lands on the denied page with `approvalWords`.
3. **`readiness shows groups, chips and filters`**
   - User: the seed admin.
   - The four group headings show, and the chip counts add up to the total.
   - Choosing ต้องแก้ shows only fail rows, or the empty text.
   - Do not assert individual statuses; they depend on the dev server env.

**Writes:** none.

- [ ] **Step 1: Write the spec, and update the approvals specs.**

- [ ] **Step 2: Run the checks.**
  - Run `npm test` and `npx tsc --noEmit`.
  - Expected: PASS. Do not run Playwright.

- [ ] **Step 3: Commit.**
  - Message: `test(access): E2E for the denied page, the approvals redirect and readiness (group 12 plan 1 task 4)`
