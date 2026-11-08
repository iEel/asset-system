# Page group 12, plan 5: settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/settings` to board `AD-Settings`.
- The 11 tabs stay, in a left menu grouped under 4 headings, with summaries and unsaved counts.
- Changed fields show "แก้แล้ว · เดิม …", and the footer gains reset.
- The bind password is never shown: the page shows "บันทึกไว้แล้ว" with a small "เปลี่ยน" link.
- The LDAP test result shows for this visit.
- Sync stays locked while LDAP edits are unsaved, and apply asks for a confirm with counts.
- New server guards:
  - an empty bind password never clears the stored one;
  - a new URL or Bind DN needs a new password;
  - apply refuses when the live deactivation count differs from the confirmed preview.

**Architecture:**
- Server guards live in:
  - `src/lib/system-setting-secrets.ts`
  - `src/app/api/admin/settings/route.ts`
  - `src/lib/ldap-sync.ts`
  - `src/app/api/admin/settings/ldap-sync/route.ts`
- A pure navigation and review model: `src/lib/settings-page-model.ts`.
- The 2,612-line `src/components/admin/system-settings-form.tsx` keeps its tab contents. It gains a shell (menu, footer,
  review) and an LDAP part, which move into `src/components/admin/settings/`.
- No migration.

**Tech Stack:** Next.js 16, Prisma 7, next-intl, Tailwind, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md`:
- §11
- §12
- §15 items 1–4
- item 13: no IT Helpdesk fields

Recon (every control on the page is a kept feature): `docs/superpowers/specs/2026-11-08-page-group-12-admin-recon.md` §1.

**Board:** `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g13-boards\project\AD-Settings.dc.html`.

## Global Constraints

**Keep everything in recon §1.** That includes:
- all 11 tabs and their `?tab=` URLs;
- in-place switching that keeps edits;
- the settings search;
- every field and control on every tab;
- the depreciation builder;
- the category prefix editor;
- the label preview;
- the LDAP test (on-screen values) and the sync preview/apply panel;
- the history panel;
- the advanced table;
- field errors with focus and tab opening;
- beforeunload;
- `router.refresh()` after save;
- the gates: `setting:view`, `setting:edit`, `system_admin` for LDAP keys, test and apply.

**Secrets:**
- The bind password value never reaches the browser. The GET masks it as `__STORED_SECRET__`, and the page never
  renders that placeholder as a value.
- It never appears in the review table or in logs (`[REDACTED]`, as today).

**Messages and copy:**
- Thai first; use the terms in `docs/19_THAI_GLOSSARY.md`.
- Change messages only through `node scripts/messages-edit.mjs`, in both th and en.
- English uses ICU plurals. Thai uses `{x, number}`.

**Look:**
- Tokens only.
- Both themes.
- 44px targets below `md`.
- No horizontal page scroll at 390 or 1024.

**Tests:**
- Source pins must be CRLF-safe.
- If you break an existing pin, update it and keep what it protects. Many pins cover this form; find them with
  `grep -l "system-settings-form\|admin/settings" tests`.

**E2E:**
- Never save settings.
- Never test LDAP, never preview, never apply.
- No digest call. No DELETE.

## Review Focus

1. **A save where the admin opened "เปลี่ยน" on the bind password and left it empty.**
   - Expected: the stored password is kept. The client sends the placeholder, and the server ignores `""`.
   - Task 1 test: `empty bind password never clears`.
2. **A changed LDAP URL with the placeholder password.**
   - Expected: the save is refused, with a Thai field error on the password.
   - Task 1 test: `new URL needs a new password to save`.
3. **Apply after AD changed since the preview (one more user would be deactivated).**
   - Expected: 409 "ผลซิงก์เปลี่ยนไปจากตัวอย่าง…", and nothing changes.
   - Task 1 test: `apply refuses a changed deactivation count`.
4. **Reset while edits exist on three tabs.**
   - Expected: everything returns to the saved values, the badges clear, and the bind-password box returns to
     "บันทึกไว้แล้ว".
   - Task 3 pin: `reset restores saved values everywhere`.
5. **The browser's password manager on the "เปลี่ยน" input.**
   - Expected: no autofill (`autocomplete="new-password"`, its own name).
   - Task 4 pin: `bind password input refuses autofill`.

---

### Task 1: Server guards (bind password, apply count)

**Files:**
- Modify: `src/lib/system-setting-secrets.ts`
- Modify: `src/app/api/admin/settings/route.ts` (PUT)
- Modify: `src/lib/ldap-sync.ts` — `applyLdapSync` gains an `expectedDeactivations` option
- Modify: `src/app/api/admin/settings/ldap-sync/route.ts`
- Modify: `src/lib/api-error-catalog.ts`
- Modify: messages
- Test: `tests/settings-secret-guards.test.ts`, plus extensions to the existing settings and ldap-sync route tests
  (find them with grep)

**Interfaces:**

Produces:

```ts
// system-setting-secrets.ts
export function dropEmptySecretSettings<T extends { key: string; value: string }>(settings: T[]): T[] // removes secret keys whose value is "" (never clears)
export function ldapEndpointChangeNeedsPassword(input: { changed: Record<string, string>; stored: Record<string, string> }): boolean // true when ldap_url or ldap_bind_dn differs from stored and ldap_bind_password is the placeholder or absent
// ldap-sync.ts
applyLdapSync(userId?, settings?, options: { source?: LdapSyncSource; expectedDeactivations?: number })
// when expectedDeactivations is a number and the fresh preview's deactivation count differs → throw LdapSyncChangedError (no writes)
```

**Route rules:**
- **PUT `/api/admin/settings`:**
  - Runs `dropEmptySecretSettings` before `resolveSubmittedSecretSettings`.
  - When `ldapEndpointChangeNeedsPassword` returns true: 400, with `fieldErrors: { ldap_bind_password: "ldapPasswordRequired" }`.
    The Thai message is "เปลี่ยนที่อยู่หรือบัญชี LDAP แล้ว ต้องใส่รหัสผ่านใหม่".
- **POST `ldap-sync` `{ action: "apply", expectedDeactivations }`:**
  - A user apply without a number for `expectedDeactivations` gets 400: "Preview required before apply".
  - Thai text: "ดูตัวอย่างก่อนซิงก์".
  - `LdapSyncChangedError` gives 409: "LDAP sync result changed".
  - Thai text: "ผลซิงก์เปลี่ยนไปจากตัวอย่าง กรุณาดูตัวอย่างอีกครั้ง".
  - Scheduled runs are unchanged.
- **Deactivation count:** count the same thing the preview panel shows as deactivations. Look in `previewLdapSync`'s
  result.

- [ ] **Step 1: Write the failing tests:**
  - `empty bind password never clears`
  - `new URL needs a new password to save`
  - `new Bind DN needs a new password to save`
  - `same URL with the placeholder keeps the stored password`
  - `apply without a confirmed count is refused`
  - `apply refuses a changed deactivation count`, with no writes
  - `apply with the matching count runs`
  - `scheduled apply is unchanged`

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the checks.**
  - Run: the tests, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(settings): server guards: an empty bind password never clears, a new LDAP host needs a new password, apply refuses a changed deactivation count (group 12 plan 5 task 1)`

### Task 2: Settings page model (`src/lib/settings-page-model.ts`)

**Files:**
- Create: `src/lib/settings-page-model.ts`
- Test: `tests/settings-page-model.test.ts`

**Interfaces:**

Produces:

```ts
export type SettingsGroupKey = "assetsDocuments" | "organizationWork" | "signIn" | "other"
export const SETTINGS_GROUPS: readonly { key: SettingsGroupKey; tabs: readonly SettingsTabId[] }[]
// assetsDocuments: asset-numbering, label-template, documents · organizationWork: organization, notifications, workflow-approval, automation
// signIn: ldap-login, ldap-sync · other: governance, advanced  (check the real tab ids in settings-information-architecture.ts)
export function tabOfSettingKey(key: string): SettingsTabId // advanced for unknown keys
export function dirtyCounts(changedKeys: readonly string[]): { byTab: Partial<Record<SettingsTabId, number>>; byGroup: Partial<Record<SettingsGroupKey, number>>; total: number }
export const SETTING_LABEL_KEYS: Record<string, string> // every known setting key → message key (systemSettingsPage.label.*)
export type ReviewValue = { kind: "bool"; on: boolean } | { kind: "secret" } | { kind: "missingRole"; name: string } | { kind: "text"; text: string }
export function reviewValue(key: string, value: string, context: { roleNames: Set<string> }): ReviewValue
export function ldapDirty(changedKeys: readonly string[]): boolean // any ldap_* key except ldap_sync_last_*
```

- [ ] **Step 1: Write the failing tests:**
  - `four groups cover the eleven tabs once`
  - `every known setting key has a Thai label`: iterate over `knownSystemSettingKeys` (from `system-setting-defaults`),
    and require each key to be in `SETTING_LABEL_KEYS` and in `messages/th.json`.
  - `dirty counts by tab and group`
  - `booleans read on or off, secrets never show, a deleted role is flagged`
  - `ldap sync status keys do not count as LDAP edits`

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Implement.** Use relative imports.

- [ ] **Step 4: Run the checks.**
  - Run: the tests, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(settings): page model: groups, dirty counts, Thai labels and review values (group 12 plan 5 task 2)`

### Task 3: The settings shell (menu, changed markers, footer, review)

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/settings/page.tsx`
- Create: `src/components/admin/settings/settings-menu.tsx`
- Create: `src/components/admin/settings/settings-review-table.tsx`
- Modify: messages
- Test: `tests/settings-shell-board.test.ts` (pins), plus updates to existing pins

**Interfaces:** consumes Task 2.

**Left menu (from `lg`):**
- Four headings.
- Each tab item shows:
  - its name;
  - a one-line summary taken from today's overview values;
  - an unsaved badge.
- Each heading shows its unsaved count.
- The settings search sits at the top of the menu.
- The links keep today's `?tab=` behaviour:
  - Ctrl+click opens a new tab;
  - a plain click switches in place and keeps edits.

**Below `lg`:** a stacked list of the same items, with a jump select. **(my call)**

**Overview panel:** removed. Its values now appear as the menu summaries.

**Changed fields:**
- Every changed field shows "แก้แล้ว · เดิม {old}" through `src/components/ui/form-changed-field.tsx`.
- The LDAP sections show "แก้ {n} ค่า".

**Footer (`StickyFormFooter`):**
- Shows "เปลี่ยน {n} ค่า ยังไม่บันทึก", or "ยังไม่มีการเปลี่ยนแปลง".
- **ยกเลิกการแก้ไข:**
  - asks for a confirm first;
  - resets every field to its saved value;
  - closes the bind-password change mode.
- **บันทึก {n} ค่า:** the existing save. It stays aria-disabled when there are no changes.

**Review table:**
- Thai name first, with the key small and in mono.
- Values are formatted with `reviewValue`:
  - เปิดใช้งาน / ปิดใช้งาน for booleans;
  - a secret shows as "เปลี่ยนรหัสผ่าน";
  - a removed role is tagged "ไม่พบบทบาท".
- The key links to its tab.

**Approval summary:** fix it to read "ผู้อนุมัติ {n} · SLA {n} วัน · SOD เปิด/ปิด".

- [ ] **Step 1: Write the failing pins:**
  - `the menu groups the eleven tabs with summaries and unsaved badges`
  - `the overview panel is gone`
  - `changed fields show the saved value`
  - `reset restores saved values everywhere`, behind a confirm
  - `the footer counts changes and keeps aria-disabled save`
  - `the review table uses Thai names and formatted values`
  - `kept: tab URLs and in-place switching, search, field errors open their tab, beforeunload, refresh after save`

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Implement.** Keep every tab's content; change only the shell.

- [ ] **Step 4: Run the checks.**
  - Run: the pins, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. List every pin you changed.

- [ ] **Step 5: Commit.**
  - Message: `feat(settings): settings shell to board AD-Settings: grouped left menu with summaries and unsaved badges, changed markers, reset, Thai review table (group 12 plan 5 task 3)`

### Task 4: The LDAP part (bind password, test result, sync lock, apply confirm)

**Files:**
- Create: `src/components/admin/settings/ldap-bind-password-field.tsx`
- Create: `src/components/admin/settings/ldap-apply-confirm.tsx`
- Modify: `src/components/admin/system-settings-form.tsx`, in the LDAP tabs
- Modify: messages
- Test: `tests/settings-ldap-board.test.ts` (pins)

**Bind password:**
- **Stored state:** a read-only box showing "•••••••• บันทึกไว้แล้ว", or "ยังไม่ได้ตั้ง". Next to it, a small link
  button, "เปลี่ยน".
- **Change mode:**
  - a password input with `autocomplete="new-password"` and `name="ldap-bind-password-new"`;
  - a show/hide toggle;
  - "ยกเลิก", which returns the field to the stored state and sends the placeholder.
- **What is sent:**
  - With an empty input in change mode, the placeholder is sent. The server also drops `""`.
  - With text in the input, that text is sent.
- **Errors:** the server's `ldapPasswordRequired` field error shows in Thai under the field. So does the test's "needs a
  new password" refusal; it no longer shows as an English toast.

**Test result:**
- After a test, show "ทดสอบผ่าน {time}" or "ทดสอบไม่ผ่าน {time} · {reason}" next to the button.
- It is kept in component state only.

**Sync lock:**
- While `ldapDirty(changedKeys)` is true, Preview and Apply are disabled.
- The note reads "บันทึกค่า LDAP ก่อน".

**Apply confirm:**
- Apply is enabled only after a preview. It opens a dialog with:
  - "เพิ่ม {n} · แก้ {n} · ปิด {n}";
  - the deactivations in the danger tone, naming up to 5 people and how many more;
  - an explicit confirm button, "ซิงก์และปิดบัญชี {n} รายการ", or "ซิงก์" when there are 0 deactivations.
- Confirm sends `expectedDeactivations` from the preview.
- A 409 shows the Thai message, keeps the dialog closed, and asks for a new preview: clear the preview state.

- [ ] **Step 1: Write the failing pins:**
  - `the bind password is never rendered and the stored box says saved`
  - `bind password input refuses autofill`
  - `cancel returns to the stored state`
  - `the test result shows next to the button for this visit`
  - `preview and apply lock while LDAP edits are unsaved`
  - `apply opens a confirm with counts and sends expectedDeactivations`
  - `a 409 clears the preview and asks for a new one`

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the checks.**
  - Run: the pins, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(settings): LDAP part: bind password shown as saved with a change link, test result, sync locked while LDAP edits are unsaved, apply confirm with counts (group 12 plan 5 task 4)`

### Task 5: E2E (read-only on the settings page)

**Files:**
- Create: `e2e/admin/settings.spec.ts`
- Create: `e2e/admin/settings-words.ts`
- Modify: `tests/e2e-review.test.ts`:
  - Add one named exception: only `e2e/admin/settings.spec.ts` may name `/th/admin/settings`.
  - Pin that this spec never clicks a button whose name is บันทึก, ทดสอบ, ดูตัวอย่าง or ซิงก์. Use a source pattern on
    the words file and the spec.
  - The context-level abort of `PUT /api/admin/settings` and of `ldap-(sync|test)` stays as the safety net.

**Tests** (seed-admin session):
1. **Desktop: `the menu, a changed field and reset`**
   - Open the page.
   - The four headings show.
   - Switch to the organization tab through the menu.
   - Change the company name field. It shows "แก้แล้ว · เดิม …", and the footer says เปลี่ยน 1 ค่า.
   - Open the review table: the row shows the Thai name.
   - Press ยกเลิกการแก้ไข and confirm. The field returns to its value, and the footer says no change.
2. **Desktop: `the bind password is shown as saved and the sync lock appears`**
   - On the LDAP login tab, the stored box shows. No password value is anywhere in the DOM: assert that the page text
     and the input values contain no `__STORED_SECRET__`.
   - Edit the LDAP URL field. On the sync tab, preview and apply are disabled with "บันทึกค่า LDAP ก่อน".
   - Reset.
3. **Phone: `the settings page fits the phone`**
   - No horizontal scroll.
   - The stacked menu works.

**Writes:** none. Never click save, test, preview or apply.

- [ ] **Step 1: Write the spec and the guard change.**

- [ ] **Step 2: Run the checks.**
  - Run: `npm test` and `npx tsc --noEmit`.
  - Expected: PASS. Do not run Playwright.

- [ ] **Step 3: Commit.**
  - Message: `test(settings): read-only E2E for the settings shell and LDAP part, with its guard exception (group 12 plan 5 task 5)`
