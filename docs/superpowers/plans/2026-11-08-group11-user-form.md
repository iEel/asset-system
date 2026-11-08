# Page group 11, plan 2: create and edit user Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/users/new` and `/admin/users/[id]/edit` to board `US-User-Edit`:
- an AD/local choice on create;
- an employee picker that fills the form, and a card for a resigned linked employee;
- role chips with new/removed marks, a role search in groups, and grant locks;
- a "before → after" access table;
- closing and reopening from a menu with a confirm;
- a note on every save;
- a sticky footer.

Two server rules change with it:
- an inactive role that the user already holds may be kept;
- a new status route.

**Architecture:**
- Server rules: `src/lib/admin-access-policy.ts` and `src/lib/admin-access-data.ts`, plus the routes under
  `src/app/api/admin/users/`.
- Pure form logic goes in `src/lib/admin-user-form-model.ts`. The page data goes in `src/lib/admin-user-form-data.ts`.
- The UI is split into `src/components/admin/user-form/*`.
- The module groups live in `src/lib/permission-groups.ts`, which plan 3 reuses.
- No migration.

**Tech Stack:** Next.js 16, Prisma 7, zod, next-intl, Tailwind, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-page-group-11-users-roles-design.md`. This plan covers:
- §3: the note, and the account history link;
- §5;
- §9 for the user routes and form;
- §10a.

**Board:** `C:\Users\Eltross\AppData\Local\Temp\claude\68d1dc0003761e7e\f250ea8d-3040-422b-ad7a-15dd9aed94b9\scratchpad\g12-boards\project\US-User-Edit.dc.html`.

**From plan 1 (on this branch):**
- `buildSystemLogRecordHref(locale, module, recordId)` in `src/lib/system-log-history.ts`.
- `employeeHasLeft` and `EMPLOYEE_LEFT_WHERE` in `src/lib/admin-users-list.ts`.
- `buildExactAssetRegisterHref` in `src/lib/asset-register-view-memory.ts`.

## Global Constraints

**Server rules stay the authority (spec §9):**
- No escalation.
- A user who holds more access than you cannot be changed by you.
- Only `system_admin` grants `system_admin`.
- The last active system administrator cannot be removed or closed.
- Login names are unique (`FieldRefusalError` with `username: "duplicate"`).
- One account per employee (`employeeId: "employeeHasUser"`).
- At least one role.
- Password length 8–100.
- `invalidateUserAccess(id)` runs after every user save.
- A `SystemLog` row is written on every save.

**Only one server rule changes:** the inactive-role keep rule (Task 1).

**Keep the existing contracts:**
- `POST /api/admin/users` with `password` and no `authMode` keeps working as a local account. The E2E setup
  (`e2e/setup/run-data.setup.ts`) uses it.
- `GET /api/admin/users` is unchanged.

**Thai first:**
- Use the words from `docs/19_THAI_GLOSSARY.md`.
- Change messages only through `node scripts/messages-edit.mjs`, in both th and en.
- English uses ICU plurals. Thai uses `{x, number}`.

**Look and behaviour:**
- Tokens only.
- Both themes.
- 44px targets below `md`.
- No horizontal page scroll at 390.
- Field errors appear under their field, and focus moves to the first one (keep `useFieldErrors` and `FIELD_IDS`).

**Tests:**
- Source pins accept CRLF.
- If you break an existing pin, update it so it still protects the same thing. Existing pins on the form:
  - `tests/admin-user-routes.test.ts`
  - `tests/admin-sweep-ui.test.ts`
  - `tests/v-track-*.test.ts`
  - `grep -l admin-user-form tests`

**E2E:**
- Only the controller runs it.
- Use the dev DB and run-marked data only.
- Never: DELETE, LDAP sync, saving settings, a failed login, or editing seed roles or `system_admin`.

## Review Focus

1. **Edit a user who holds a role that was later switched off.**
   - Expected: the save succeeds when the role is kept or removed, and the chip shows "ปิดใช้งาน".
   - Task 1 test: `a held inactive role can be kept or removed`.
   - Task 4 pin: `held inactive roles show as chips`.
2. **A non-admin editor opens a user whose only extra role is a switched-off high role.**
   - Expected: they are not refused with "more access", because inactive roles grant nothing.
   - Task 1 test: `inactive roles do not count as the target's access`.
3. **Close the account while the form has unsaved role changes.**
   - Expected: the menu item is disabled with the reason, and nothing unsaved is sent.
   - Task 4 pin: `closing waits for unsaved edits`.
4. **On create, pick an employee after typing your own display name.**
   - Expected: the typed name stays, and only empty fields fill.
   - Task 3 test: `auto-fill never overwrites typed fields`.
5. **The employee's email has no `@`, or there is no email.**
   - Expected: no username suggestion, and the field stays empty.
   - Task 3 test: `no suggestion without an email`.

---

### Task 1: Access rules and the module groups

**Files:**
- Create: `src/lib/permission-groups.ts`
- Modify: `src/lib/admin-access-policy.ts`
- Modify: `src/lib/admin-access-data.ts`
- Modify: every caller of `getUserAccessChangeError` or `toExistingUserAccess`. Find them with `grep -rn`.
- Test: `tests/permission-groups.test.ts`
- Test: `tests/admin-access-policy.test.ts`. Extend it if it exists; otherwise create it.

**Interfaces:**

Produces:

```ts
// src/lib/permission-groups.ts
export const PERMISSION_ACTION_ORDER = ["view", "create", "edit", "export", "approve", "delete"] as const
export type PermissionGroupKey = "assets" | "transactions" | "operations" | "masterData" | "system"
export const PERMISSION_GROUPS: readonly { key: PermissionGroupKey; modules: readonly string[] }[]
// assets: dashboard, asset · transactions: checkout, checkin, transfer · operations: audit, maintenance, disposal, report
// masterData: company, branch, department, employee, location, category, brand, supplier, status, condition
// system: user, role, setting, import, export, log
export const HIGH_RISK_ACTIONS: readonly string[] // ["delete", "approve", "export"]
export function permissionGroupOf(module: string): PermissionGroupKey | null

// src/lib/admin-access-policy.ts
export type UserAccessChangeInput = {
  actor: AccessActor
  target: ExistingUserAccess | null
  requestedRoleIds: string[]
  requestedRoles: GrantableRole[]
  currentRoleIds: string[] // the target's stored role ids; [] on create
  nextIsActive: boolean
  otherActiveSystemAdminCount: number
}

// src/lib/admin-access-data.ts
// toExistingUserAccess: permissionKeys come from active roles only.
// userAccessInclude.role.select gains id and isActive.
```

**The rule change (spec §5.3):**
- A requested role that is inactive is valid only if it is in `currentRoleIds`.
- An inactive kept role adds no permission keys to the "ungranted" check.
- The target's access in the "more access" check counts active roles only.
- Everything else stays the same.

- [ ] **Step 1: Write the failing tests.**

`permission-groups`:
- **`the five groups cover the 25 modules once`:** the union of `modules` equals the 25 modules in
  `src/app/[locale]/(dashboard)/admin/roles/page.tsx`'s `permissionModules`, and no module appears twice.
- **`action order`:** `PERMISSION_ACTION_ORDER` deep-equals `["view","create","edit","export","approve","delete"]`.

`admin-access-policy`:
- **`a held inactive role can be kept or removed`:**
  - With `currentRoleIds: ["old"]`, requesting `["old","r1"]` where `old` is inactive returns `null`.
  - Requesting `["r1"]` returns `null`.
- **`a new inactive role is still refused`:** with `currentRoleIds: []`, requesting inactive `old` returns
  `"Invalid role selection"`.
- **`inactive roles do not count as the target's access`:**
  - Setup: a non-admin actor with `["asset:view"]`, and a target whose only role is an inactive role holding
    `"asset:delete"`, passed through `toExistingUserAccess`.
  - The actor keeps the role and adds an active role with `asset:view`.
  - Expected: `null`.
- **`last system admin rule unchanged`:** the existing case still returns
  `"Cannot remove or deactivate the last active system administrator"`.

- [ ] **Step 2: Run the tests and see them fail.**
  - Run: `node --test tests/permission-groups.test.ts tests/admin-access-policy.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement the change, and pass `currentRoleIds` from every caller.**
  - The `PUT` passes `existing.userRoles.map(r => r.roleId)`.
  - `POST` passes `[]`.

- [ ] **Step 4: Run the checks.**
  - Run the two tests, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(users): a held inactive role can be kept, inactive roles grant nothing in the access checks, and the permission groups (group 11 plan 2 task 1)`

### Task 2: User routes (AD/local create, note, status route)

**Files:**
- Modify: `src/lib/validations/admin-user.ts`
- Modify: `src/app/api/admin/users/route.ts`
- Modify: `src/app/api/admin/users/[id]/route.ts`
- Create: `src/app/api/admin/users/[id]/status/route.ts`
- Modify: `src/lib/api-error-catalog.ts`
- Modify: messages, through the script
- Test: `tests/admin-user-routes.test.ts`. Extend it, following its mock style.

**Interfaces:**

Produces:

```ts
// validations/admin-user.ts
adminUserSchema gains: authMode: z.enum(["ad", "local"]).optional(), note: z.string().trim().max(500).nullable().optional()
export const adminUserStatusSchema = z.object({ isActive: z.boolean(), note: z.string().trim().max(500).nullable().optional() })
// PATCH /api/admin/users/[id]/status  body { isActive, note } → 200 toAdminUserResponse(updated)
```

**Rules:**

- **`POST`:**
  - With `authMode: "ad"`, ignore `password` and store `bcrypt.hash(randomUUID(), 12)`, as `src/lib/auth.ts` does.
  - With any other `authMode`, or none, the password is required, exactly as today.
  - The log's `newValue` gets `authMode` and `note`, and never the password.
- **`PUT`:**
  - It passes `currentRoleIds`.
  - It logs `note` in `newValue.note`.
- **`PATCH status`:**
  - Permission is `user:edit`.
  - A missing user gives 404.
  - It refuses the actor's own id with `"Cannot change the status of your own account"`, status 400. Add catalog key
    `ownAccountStatus` and the Thai message "เปลี่ยนสถานะบัญชีของตัวเองไม่ได้".
  - It runs `getUserAccessChangeError` with the stored role ids as both `requestedRoleIds` and `currentRoleIds`, and
    `nextIsActive` from the body.
  - It updates only `isActive`.
  - It writes a `logAudit` row: `action: "update"`, `module: "user"`, `oldValue { isActive }`,
    `newValue { isActive, note }`.
  - It calls `invalidateUserAccess(id)`.

- [ ] **Step 1: Write the failing route tests.**
  - **`create with authMode ad needs no password and stores a random hash`:**
    - Status 201, and the hash comes from bcrypt.
    - The log has no password and has `authMode: "ad"`.
  - **`create without authMode still needs a password`:** 400 with `fieldErrors.password === "required"`.
  - **`update logs the note`**
  - **`status route closes and reopens, logging old and new`**
  - **`status route refuses your own account`:** 400, with the catalog key.
  - **`status route keeps the last-admin rule`:** 409 when closing the only active system admin.
  - **`status route needs user:edit`:** 403.

- [ ] **Step 2: Run the tests and see them fail.**
  - Run: `node --test tests/admin-user-routes.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement the routes.**

- [ ] **Step 4: Run the checks.**
  - Run: `node --test tests/admin-user-routes.test.ts`, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(users): create an AD account without a password, a note on every save, and the status route (group 11 plan 2 task 2)`

### Task 3: Form model and page data

**Files:**
- Create: `src/lib/admin-user-form-model.ts` (pure)
- Create: `src/lib/admin-user-form-data.ts` (queries)
- Test: `tests/admin-user-form-model.test.ts`

**Interfaces:**

Consumes, from Task 1:
- `PERMISSION_GROUPS`
- `PERMISSION_ACTION_ORDER`
- `HIGH_RISK_ACTIONS`

Produces:

```ts
// admin-user-form-model.ts
export type FormRole = { id: string; name: string; label: string; isSystem: boolean; isActive: boolean; permissionKeys: string[]; lockReason: "systemAdminOnly" | "missingPermissions" | null }
export function roleChangeMarks(initialIds: readonly string[], currentIds: readonly string[]): { added: string[]; removed: string[] }
export type AccessGroupRow = { group: PermissionGroupKey; before: string[]; after: string[]; gained: string[]; lost: string[] } // actions in PERMISSION_ACTION_ORDER
export function accessPreview(roles: readonly FormRole[], beforeIds: readonly string[], afterIds: readonly string[]): { beforeCount: number; afterCount: number; rows: AccessGroupRow[]; highRiskGained: string[]; coveredRemovals: string[] }
// counts are distinct permission keys of ACTIVE roles; highRiskGained = gained keys whose action is high risk
// coveredRemovals = labels of removed roles whose every active permission is still held after the change
export function grantLockReason(role: { name: string; permissionKeys: string[] }, actor: { roles: string[]; permissions: string[] }): FormRole["lockReason"]
export function suggestUsername(email: string | null | undefined): string | null // the part before "@", trimmed; null without "@" or empty
export function fillFromEmployee(values: { displayName: string; email: string; username: string }, employee: { fullNameTh: string; email: string | null }): { displayName: string; email: string; username: string } // fills empty fields only

// admin-user-form-data.ts
export type UserFormEmployee = { id: string; code: string; fullNameTh: string; email: string | null; departmentName: string; branchName: string; hasLeft: boolean; heldAssetCount: number }
export type UserFormData = {
  roles: FormRole[] // all active roles + inactive roles the user holds, system roles first, then by name
  employees: UserFormEmployee[] // active employees with no account (create), plus this user's linked one (edit, even if left)
  user: null | { id: string; username: string; displayName: string; email: string | null; employeeId: string | null; roleIds: string[]; isActive: boolean; lastLoginAt: Date | null; createdAt: Date; isSelf: boolean }
  canViewLogs: boolean // hasPermission(actor, "system", "view")
}
export async function loadUserFormData(input: { userId: string | null; actor: SessionUser }): Promise<UserFormData>
```

**Approach:** `heldAssetCount` uses the plan 1 rule: active assets only (`isActive: true`) for that custodian.

- [ ] **Step 1: Write the failing tests:**
  - **`marks added and removed roles`:** `roleChangeMarks(["a","b"],["b","c"])` returns `{ added:["c"], removed:["a"] }`.
  - **`preview counts active permissions before and after`:**
    - Setup: two active roles (`asset:view`, `asset:edit`) and (`asset:view`, `disposal:approve`), plus one inactive
      role (`asset:delete`).
    - With before `[r1, inactive]` and after `[r1, r2]`: `beforeCount 2`, `afterCount 3`.
    - The `operations` row has `gained ["approve"]`.
    - `highRiskGained` is `["disposal:approve"]`.
  - **`a removed role covered by another loses nothing`:** with before `[r1, r3]` and after `[r1]`, where r3 ⊂ r1,
    `coveredRemovals` is `[r3.label]`.
  - **`system_admin locks for non-admins`:** `grantLockReason({name:"system_admin",...}, {roles:["it"], permissions:[...]})`
    returns `"systemAdminOnly"`.
  - **`a role with permissions the actor lacks is locked`:** returns `"missingPermissions"`. A system admin actor gets
    `null`.
  - **`auto-fill never overwrites typed fields`:** `fillFromEmployee({displayName:"ชื่อเอง", email:"", username:""}, {fullNameTh:"สมชาย", email:"somchai.k@x.com"})`
    returns `{ displayName:"ชื่อเอง", email:"somchai.k@x.com", username:"somchai.k" }`.
  - **`no suggestion without an email`:** `suggestUsername(null)`, `suggestUsername("abc")` and `suggestUsername("@x")`
    all return `null`.

- [ ] **Step 2: Run the tests and see them fail.**
  - Run: `node --test tests/admin-user-form-model.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement both modules.**
  - Edit mode loads the employee options with
    `OR: [{ isActive: true, employmentStatus: { not: "resigned" }, user: null }, { user: { id: userId } }]`.
  - Create mode uses the first branch only.

- [ ] **Step 4: Run the checks.**
  - Run: the test, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Message: `feat(users): user form model (role marks, access preview, grant locks, auto-fill) and page data (group 11 plan 2 task 3)`

### Task 4: The form UI (`US-User-Edit`)

**Files:**
- Modify (rewrite into parts): `src/components/admin/admin-user-form.tsx`, which keeps the export `AdminUserForm`.
- Create: `src/components/admin/user-form/user-form-header.tsx`
- Create: `src/components/admin/user-form/user-account-section.tsx`
- Create: `src/components/admin/user-form/user-employee-section.tsx`
- Create: `src/components/admin/user-form/user-roles-section.tsx`
- Create: `src/components/admin/user-form/user-access-preview.tsx`
- Create: `src/components/admin/user-form/user-status-dialog.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/users/new/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/users/[id]/edit/page.tsx`
- Modify: messages, through the script
- Test: `tests/admin-user-form-board.test.ts` (pins), plus updates to the existing pins

**Interfaces:**

Consumes:
- From Task 3: `UserFormData`, `FormRole`, `roleChangeMarks`, `accessPreview`, `suggestUsername`, `fillFromEmployee`.
- From Task 2: the routes.
- From plan 1: `buildSystemLogRecordHref`, `buildExactAssetRegisterHref`.

**Layout, from the board:**
- Two columns from `lg`:
  - Left column: account, then linked employee.
  - Right column: roles, then the preview.
- One column below `lg`.

**Messages** (`adminUsersPage.form.*`). Thai below; write the English yourself:

| key | Thai |
|---|---|
| `accountSection` | บัญชีเข้าสู่ระบบ |
| `authMode` | วิธีเข้าสู่ระบบ |
| `authAd` | เข้าระบบด้วย AD (แนะนำ) |
| `authAdHint` | ผู้ใช้เข้าระบบด้วยชื่อและรหัสผ่าน AD ระบบจับคู่บัญชีจากชื่อผู้ใช้ อีเมล หรือพนักงานที่ผูก |
| `authLocal` | บัญชีของระบบ |
| `authLocalHint` | ตั้งรหัสผ่านเอง สำหรับบัญชีที่ไม่มีใน AD เช่น ผู้รับเหมา |
| `passwordEditHint` | เว้นว่างไว้ถ้าไม่เปลี่ยนรหัสผ่าน · อย่างน้อย 8 ตัวอักษร · ใช้กับบัญชีที่ไม่ได้เข้าระบบด้วย AD |
| `adSyncedHint` | ถ้าเป็นบัญชี AD ระบบจะอัปเดตค่านี้จาก AD ทุกครั้งที่เข้าสู่ระบบ |
| `usernameSuggested` | เดาจากอีเมลพนักงาน ตรวจให้ตรงกับชื่อเข้าระบบ AD เช่น veerapon.l |
| `employeeSection` | พนักงานที่ผูก |
| `optional` | ไม่บังคับ |
| `employeeSearch` | ค้นหาชื่อหรือรหัสพนักงาน |
| `employeeHint` | ค้นหาได้เฉพาะพนักงานที่ยังทำงานอยู่และยังไม่มีบัญชีผู้ใช้ |
| `change` | เปลี่ยน |
| `unlink` | เลิกผูก |
| `heldAssets` | ทรัพย์สินที่พนักงานคนนี้ถือครอง {count} รายการ |
| `rolesSection` | บทบาท |
| `rolesChosen` | เลือกไว้ {count} บทบาท |
| `roleNew` | ใหม่ |
| `roleRemoved` | เอาออก |
| `roleInactive` | ปิดใช้งาน |
| `undo` | เลิกทำ |
| `removeRole` | เอาบทบาท{name}ออก |
| `roleSearch` | ค้นหาบทบาท |
| `systemRoles` | บทบาทระบบ |
| `customRoles` | บทบาททั่วไป |
| `permissionCount` | {count} สิทธิ์ |
| `lockSystemAdmin` | ให้ได้เฉพาะผู้ดูแลระบบ |
| `lockMissing` | มีสิทธิ์ที่คุณไม่มี |
| `inactiveRolesNote` | บทบาทที่ปิดใช้งานไม่แสดงในรายการนี้ |
| `viewRolePermissions` | ดูสิทธิ์ของแต่ละบทบาท |
| `previewTitle` | หลังบันทึก ผู้ใช้นี้จะทำอะไรได้ |
| `previewTotal` | สิทธิ์รวม {before} → {after} |
| `previewTask` | งาน |
| `previewNow` | ตอนนี้ |
| `previewAfter` | หลังบันทึก |
| `previewNone` | ไม่มี |
| `previewSame` | เหมือนเดิม |
| `highRiskGained` | ได้สิทธิ์ {list} ซึ่งเป็นสิทธิ์สูง |
| `coveredRemoval` | เอา{role}ออกแล้วไม่เสียสิทธิ์ใด เพราะบทบาทอื่นมีสิทธิ์เหล่านี้ครบ |
| `appliesNow` | มีผลทันทีหลังบันทึก ผู้ใช้ไม่ต้องออกจากระบบ |
| `group.assets` | ทรัพย์สิน |
| `group.transactions` | ธุรกรรม |
| `group.operations` | งานตรวจและดูแล |
| `group.masterData` | ข้อมูลหลัก |
| `group.system` | ผู้ใช้และระบบ |
| `more` | อื่น ๆ |
| `history` | ดูประวัติการแก้ไขของบัญชี |
| `closeAccount` | ปิดใช้งานบัญชี |
| `reopenAccount` | เปิดใช้งานบัญชี |
| `closeSelf` | ปิดบัญชีของตัวเองไม่ได้ |
| `saveFirst` | บันทึกหรือยกเลิกการแก้ไขก่อน |
| `closeTitle` | ปิดใช้งานบัญชี {name} |
| `closeBody` | ผู้ใช้จะเข้าระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง ทรัพย์สินที่พนักงานถือครองไม่เปลี่ยน |
| `reopenTitle` | เปิดใช้งานบัญชี {name} |
| `reopenBody` | ผู้ใช้จะเข้าระบบได้อีกครั้งด้วยบทบาทเดิม |
| `note` | หมายเหตุ |
| `notePlaceholder` | เช่น หัวหน้าฝ่ายบัญชีขอทางอีเมล 8 พ.ย. |
| `changes` | เปลี่ยน {count} อย่าง |
| `noChanges` | ยังไม่มีการเปลี่ยนแปลง |
| `lastLogin` | เข้าสู่ระบบล่าสุด {time} |
| `createdAt` | สร้างเมื่อ {date} |
| `employeeLeft` | reuse `adminUsersPage.employeeLeft` |

**Behaviour:**

- **Header (edit):**
  - "แก้ไขผู้ใช้ · {name}".
  - The status badge and the login name tag.
  - `lastLogin` (or `adminUsersPage.neverLoggedIn`) and `createdAt`.
  - The **อื่น ๆ** `DropdownMenu`:
    - **history:** shown only when `canViewLogs`. It links to
      `buildSystemLogRecordHref(locale, "user", id)`.
    - **close or reopen:** opens `UserStatusDialog`. It is disabled with `closeSelf` on your own account, and with
      `saveFirst` while the form is dirty.

- **Create:**
  - The page title stays "เพิ่มผู้ใช้".
  - `authMode` is a radio group of two `ChoiceCard`s (`src/components/ui/choice-card.tsx`), with `ad` as the default.
    `local` reveals the password field (required).

- **Employee section:**
  - The picker is a `SearchableSelect` over `employees`. Each option label is `fullNameTh`, with
    `code · departmentName · branchName` as its detail if the component supports a second line; otherwise put them in
    one label.
  - The chosen employee shows as a card: the name, the code line, `employeeLeft` when `hasLeft`, and the `heldAssets`
    line linking to `buildExactAssetRegisterHref(locale, { custodianId })` (only with `asset:view`, otherwise plain
    text). The card has เปลี่ยน and เลิกผูก.
  - On create, choosing an employee runs `fillFromEmployee`. A suggested username shows `usernameSuggested` under the
    field.

- **Roles section:**
  - Chips come from the current ids plus the removed ones, with `roleChangeMarks` labels.
  - Removed chips are struck through, with `undo`.
  - An inactive held role shows `roleInactive`.
  - Then a search box and two groups. Locked roles are disabled, with their reason as visible text.
  - The `roleIds` field error shows under the section, and focus goes to the first checkbox, as today.

- **Preview:** `accessPreview(roles, initialIds, currentIds)`, shown as a table:
  - Columns: งาน, ตอนนี้, หลังบันทึก.
  - Actions are listed with `adminRolesPage.actions.*` names. Gained actions get a "+" in the success tone. Lost
    actions get a struck "−" in the danger tone **(my call)**.
  - Rows with no actions say `previewNone`. Unchanged rows say `previewSame` in the after column.
  - Then the notes and `appliesNow`.

- **Footer:** `StickyFormFooter`.
  - `status` shows `changes` or `noChanges`. The count is the changed fields plus the added and removed roles.
  - It holds the `note` textarea (one line that grows, max 500), ยกเลิก, and บันทึก.
  - The save sends `note`, and `authMode` on create.

- **Status dialog:** an accessible dialog (reuse the app's `Dialog` parts) with the title, the body, the optional
  `note`, ยกเลิก, and confirm. It calls `PATCH .../status`, shows the error through `useApiError`, then runs
  `router.refresh()` and a toast.

- **The "ใช้งาน" checkbox is removed from the form.** On create, `isActive` is always `true`.

- [ ] **Step 1: Write the failing pins** in `tests/admin-user-form-board.test.ts`:
  - **`create offers AD first and local reveals the password`**
  - **`the employee card links holdings exactly and shows a left badge`**
  - **`role chips mark new and removed with undo`**
  - **`held inactive roles show as chips`:** the page data includes them, and the chip uses `roleInactive`.
  - **`locked roles are disabled with their reason`**
  - **`the preview table uses accessPreview`**
  - **`closing waits for unsaved edits`:** the menu item is `disabled` when dirty, with `saveFirst`.
  - **`own account cannot be closed`**
  - **`history shows only with canViewLogs`**
  - **`the footer carries the note and the change count`**
  - **`no isActive checkbox in the form`**
  - **`kept: field errors focus the first field`:** `FIELD_ORDER`, `focusFirst`.

- [ ] **Step 2: Run the pins and see them fail.**
  - Run: `node --test tests/admin-user-form-board.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement the UI and wire both pages to `loadUserFormData`.**

- [ ] **Step 4: Run the checks.**
  - Run: the pins, then `npm test`, then `npx tsc --noEmit`.
  - Expected: PASS. List every existing pin you changed, and why.

- [ ] **Step 5: Commit.**
  - Message: `feat(users): user form to board US-User-Edit: AD or local, employee picker with auto-fill, role chips with marks, access preview, close and reopen in a menu, note and sticky footer (group 11 plan 2 task 4)`

### Task 5: E2E

**Files:**
- Create: `e2e/admin/user-form.spec.ts`
- Modify: `e2e/admin/users-words.ts`, adding the form's words
- Modify: `e2e/support/allow-list.ts`, only if required. Read it first.

**Tests (use the seed-admin session like `e2e/admin/users-list.spec.ts`, and run data from `readRunData()`):**

1. **Desktop: `an AD account is created from an employee with roles ready`.**
   1. Create a run-marked active employee with an email, via `POST /api/employees` in that spec's style.
   2. Open `/th/admin/users/new`.
   3. AD is chosen by default, and there is no password field.
   4. Pick the employee. The display name and email fill in, and the username is suggested.
   5. Tick the run viewer role.
   6. The preview shows "+".
   7. Fill หมายเหตุ and save.
   8. The list (search the username) shows the account with that role.
2. **Desktop: `edit adds a role, then the account is closed and reopened`.**
   1. Open the account from test 1, add the run employee role, and save.
   2. From อื่น ๆ, close the account with a note. The status becomes ไม่ใช้งาน.
   3. Reopen it. The status becomes ใช้งาน.
   4. Use a separate account per project, so desktop-light and desktop-dark do not collide.
3. **Phone: `the form fits the phone`.**
   1. Open the edit page of a run user.
   2. There is no horizontal scroll.
   3. The footer's บันทึก is visible.
   4. The อื่น ๆ menu opens.

**Writes:** only the employee POSTs, user create/edit, and the status PATCH. No DELETE.

- [ ] **Step 1: Write the spec.**

- [ ] **Step 2: Run the checks.**
  - Run: `npm test` and `npx tsc --noEmit`.
  - Expected: PASS.
  - Do not run Playwright.

- [ ] **Step 3: Commit.**
  - Message: `test(users): E2E for the user form: AD create from an employee, edit, close and reopen (group 11 plan 2 task 5)`
