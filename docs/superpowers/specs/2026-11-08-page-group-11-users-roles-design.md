# Page group 11: users and roles (ผู้ใช้และสิทธิ์)

Boards: `US-Users`, `US-User-Edit`, `US-Users-Phone`, `US-Roles`, `US-Role-Edit` in the canvas
(https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p). Assumptions: `.impeccable/critique/2026-10-20-canvas-assumptions.md`
§ ผู้ใช้และบทบาท. Recon of the current pages: 2026-11-08 (§10). Calls marked **(my call)** are mine; everything else is
from the boards or from the user. Every feature the current pages have is kept (§9).

User decisions 2026-11-08:
- Most accounts are created by the first AD login, not on this page. Department heads ask for extra access by email or
  phone, and an administrator adds roles by hand.
- Roles are given **per person** this round. Mapping roles to AD groups is separate later work (it stays in the wiki's
  open questions).
- When a linked employee leaves, the system **only warns**. An administrator closes the account by hand; nothing is
  closed automatically.
- Login names are AD login names such as `veerapon.l`. The user confirmed this is how the system already works (§10).
- The roles part as played back is complete ("ครบแล้ว").

## 1. Why

**What is wrong today:**
- The user list has no status or role filters, so there is no way to find people who logged in through AD and still
  have only the default role. It also does not show accounts whose employee has left.
- The edit form lists every role as a flat checkbox grid. It does not say what the person will be able to do after
  saving.
- The edit form forces a password on a new account, even for people who sign in with AD, and an unused password is a
  weak spot.
- It lets you edit the display name and email of AD accounts, but AD overwrites both at the next login.
- Closing an account is a checkbox in the form.
- The roles page is about 47,000px tall because every role is a chip in every matrix cell.
- Each role edit row only has a "select whole module" control.
- No page shows who is in a role, or adds several people to a role at once.

## 2. Goals, non-goals, anti-goals

**Goals:**
- Find and fix accounts fast: status chips, a role filter, a "มีแค่บทบาทเริ่มต้น" chip and a "ควรตรวจ" warning for
  accounts whose employee has left, with the assets those employees still hold.
- An edit form that shows the role change and its effect before saving.
- Create an account ahead of the first AD login, with roles ready and no password.
- A short roles list with the matrix on its own tab.
- A role editor with row and column selection, marks on changed cells, a change summary and a segregation warning.
- On the role page, the people in the role, and adding several of them at once.
- A note on each save that says who asked.

**Non-goals:**
- AD group to role mapping.
- Searching AD live from this page (the employee list, which is synced from AD, is the source).
- Deleting users or roles (neither exists today).
- Automatic account closing.
- A per-account "source" column in the database (§5.4).

**Anti-goals:**
- Losing any rule that stops privilege escalation or stops the last system administrator from being removed.
- A save that changes access without the change being visible first.
- A form field that is silently overwritten (AD name and email).
- Losing any filter, sort, export, gate or link that works today.

## 3. Shared

**Pages and routes stay where they are:**
- `/admin/users`, `/admin/users/new`, `/admin/users/[id]/edit`
- `/admin/roles`, `/admin/roles/new`, `/admin/roles/[id]/edit`

**Permission gates stay as today:**
- `user:view`, `user:create` and `user:edit` on the user pages.
- `role:view`, `role:create`, `role:edit` and `role:export` on the role pages.

**Saving:**
- Both edit forms save with the shared `StickyFormFooter`. It says how many things changed, and has ยกเลิก and บันทึก.
- **หมายเหตุ (ไม่บังคับ)** **(my call, agreed in chat as "ช่องหมายเหตุ"):** one text field in the footer area of both
  forms, up to 500 characters, with the placeholder "เช่น หัวหน้าฝ่ายบัญชีขอทางอีเมล 8 พ.ย.".
  - It is stored in the existing `SystemLog` row the save already writes (`newValue.note`).
  - No migration.
- "มีผลทันทีหลังบันทึก ผู้ใช้ไม่ต้องออกจากระบบ" stays true. User saves already call `invalidateUserAccess`, and role
  saves call `invalidateAllAccess`.

**Account history:**
- "ดูประวัติการแก้ไขของบัญชี" (user) and "ดูประวัติของบทบาท" (role) open `/admin/logs` filtered to that record.
- The logs page gains a `recordId` URL filter beside the existing `module` and `action` filters, with a chip that
  removes it **(my call)**.
- The logs page is gated by `system:view` today, which in practice means system administrators only. The gate does not
  change; the history items show only to viewers who pass the same check **(my call)**.

## 4. User list (`US-Users`, `US-Users-Phone`)

**Header:**
- จัดการผู้ใช้ + "ตรวจสอบบัญชีผู้ใช้ บทบาท สถานะ และการเข้าสู่ระบบล่าสุด".
- **เพิ่มผู้ใช้** (with `user:create`, as today).

### 4.1 Warning bar

**When it shows:**
- Only when there is at least one active account whose linked employee has left, meaning `employee.isActive = false`
  or `employmentStatus = 'resigned'` **(my call: either one counts)**.

**Wording:**
- "ควรตรวจ {n} บัญชี · บัญชียังใช้งานอยู่ แต่พนักงานที่ผูกไว้ลาออกแล้ว ควรปิดใช้งานหรือผูกพนักงานใหม่".
- A link "ดู {n} บัญชีนี้ →" opens the list with `status=review`.

**In the review filter, each row shows:**
- A "พนักงานลาออกแล้ว" badge in the employee column.
- When the employee still holds assets, a link "ยังถือครองทรัพย์สิน {n} รายการ". It opens the register with
  `custodianId=<employeeId>`, and the count is assets with that custodian.
  - It is a link only with `asset:view`, plain text otherwise.
  - The register names its custodian chip from active employees only today. It must look the named custodian up by id
    whatever their status, so the chip names a resigned employee **(my call)**.

**Never automatic:** the system never closes these accounts; the administrator closes them from the edit page (§5.3).

### 4.2 Filters

**Status chips** (`status=`), one choice, with counts. The counts follow the search and the role filter:
- ทั้งหมด
- ใช้งาน (`active`)
- ไม่ใช้งาน (`inactive`)
- ไม่เคยเข้าสู่ระบบ (`never`: `lastLoginAt` is null)
- **มีแค่บทบาทเริ่มต้น** (`defaultOnly`): active accounts whose only role is the LDAP default role.
  - The default role is the `ldap_default_role` setting, with the same fallback as `getLdapConfig`.
  - If that role does not exist, the chip is hidden **(my call)**.
- `review` (§4.1) is reached from the warning bar and shows as its own chip while it is chosen.

**Role filter:**
- "บทบาท: ทุกบทบาท" (`role=<roleId>`).
- A searchable menu of every role, active and inactive (the dev DB has more than 1,000 test roles).

**Search box:**
- "ค้นหาชื่อ ชื่อผู้ใช้ อีเมล".
- It still matches role names too, as today.

**Links:** every filter link keeps the search, the sort and the page size, and resets the page to 1.

### 4.3 Table

**Columns** (no sticky right column, no horizontal scroll at 1440):

1. **ผู้ใช้:**
   - The display name, with a "คุณ" badge on the viewer's own account.
   - Under it, the login name (mono) and the email.
   - Header sort by display name.
2. **พนักงานที่ผูก:**
   - The employee name, then the department and branch on a small line.
   - "ไม่ผูกพนักงาน" when there is none.
3. **บทบาท:**
   - Two chips, then a "+N" chip that shows the rest.
   - The "+N" chip is a disclosure listing the other roles, and its aria-label names them.
4. **สถานะ:** ใช้งาน or ไม่ใช้งาน.
5. **เข้าสู่ระบบล่าสุด:**
   - Header sort.
   - "ยังไม่เคยเข้าสู่ระบบ" in the warning colour when the account has never logged in.
6. **การดำเนินการ:** แก้ไข.

**Rows** stay clickable to the edit page, as today.

**Sorts:**
- The existing sort values stay valid in the URL: `username`, `displayName`, `email`, `lastLoginAt`, and the default
  `createdAt`.
- Only ผู้ใช้ and เข้าสู่ระบบล่าสุด have header buttons.

**Paging:**
- 25, 50 or 100 rows per page, with "รายชื่อผู้ใช้ {from}–{to} จาก {total}".
- The redirect from a page past the end stays as today.

### 4.4 Phone

**Top bar:** the title, a + (เพิ่มผู้ใช้) and the bell.

**Body, in order:**
1. A search field.
2. A scrolling chip row: the role chip with a clear ×, then the status chips.
3. The warning as one tappable line.
4. "พบ {n} จาก {total} บัญชี".
5. Cards.

**Each card shows:**
- The name, the "คุณ" badge and the status.
- The login name, the department and the branch.
- The role chips, with +N.
- เข้าสู่ระบบล่าสุด, and "แก้ไข ›".

All targets are at least 44px.

## 5. Create and edit user (`US-User-Edit`)

**Layout:** two columns on desktop, one on the phone.

**Header (edit):**
- "แก้ไขผู้ใช้ · {name}".
- Badges for the status and the login name.
- "เข้าสู่ระบบล่าสุด …" and "สร้างเมื่อ …".
- An **อื่น ๆ** menu with:
  - ดูประวัติการแก้ไขของบัญชี
  - ปิดใช้งานบัญชี or เปิดใช้งานบัญชี

### 5.1 Account (บัญชีเข้าสู่ระบบ)

**Fields:**
- ชื่อผู้ใช้ *
- ชื่อแสดง *
- อีเมล
- รหัสผ่าน

**On create, a choice comes first** (two option cards):
- **เข้าระบบด้วย AD (แนะนำ)** is the default.
  - It has no password field.
  - The server stores a random password hash, exactly like the AD auto-create path.
  - The hint says the person signs in with the AD login name and password, and that the account is matched by login
    name, email or the linked employee.
- **บัญชีของระบบ:** the password is required, at least 8 characters, with the show/hide button. It is for accounts
  that are not in AD, such as contractors.

**On edit:**
- The password field is "รหัสผ่านใหม่", left empty to keep the current one, with the hint "เว้นว่างไว้ถ้าไม่เปลี่ยน
  รหัสผ่าน · อย่างน้อย 8 ตัวอักษร · ใช้กับบัญชีที่ไม่ได้เข้าระบบด้วย AD".
- Under ชื่อแสดง and อีเมล: "ถ้าเป็นบัญชี AD ระบบจะอัปเดตค่านี้จาก AD ทุกครั้งที่เข้าสู่ระบบ" **(my call: text, not a
  lock, because the system cannot tell an AD account from a local one, §5.4)**.

### 5.2 Linked employee (พนักงานที่ผูก, ไม่บังคับ)

**Choosing an employee:**
- A searchable picker that shows the name before the code, with the department and branch under it.
- It only offers employees who are still active and have no account.
- The employee already linked to this account is always loaded, even when they have left. Today's query drops them,
  because its `isActive` condition covers the linked case too. They show as a card with a "พนักงานลาออกแล้ว" badge.
  A resigned employee is never offered for a new link.
- Once chosen, the employee shows as a card with เปลี่ยน and เลิกผูก.

**On create, choosing an employee fills in the empty fields** **(my call)**:
- ชื่อแสดง comes from the employee's Thai name.
- อีเมล comes from the employee's email.
- ชื่อผู้ใช้ is a suggestion: the part of the employee's email before `@`. The hint asks the administrator to check it
  against the AD login name, such as `veerapon.l`.
- Fields the administrator has already typed in are never overwritten.

**Holding note:** "ทรัพย์สินที่พนักงานคนนี้ถือครอง {n} รายการ" when the count is more than 0.

### 5.3 Roles (บทบาท *)

**Chosen roles:**
- They show as chips at the top: "เลือกไว้ {n} บทบาท".
- A role added in this session is marked "ใหม่".
- A role removed in this session stays as a struck chip marked "เอาออก", with เลิกทำ.
- Each chip has a remove button with an aria-label.

**Picking roles:**
- A search box ("ค้นหาบทบาท") over two groups:
  - **บทบาทระบบ**
  - **บทบาททั่วไป**
- Each role shows its permission count. Inactive roles are not listed, as today, with a note and a link
  "ดูสิทธิ์ของแต่ละบทบาท" to `/admin/roles?view=matrix`.

**Inactive roles the user already holds (my call; fixes a current bug):**
- Today the edit page sends them, and the server refuses the whole save ("Invalid role selection"). Such a user cannot
  be saved, closed, or added to another role.
- New rule: a role the user already holds may be kept while inactive. It grants nothing, because `session-access.ts`
  drops inactive roles. It still cannot be newly granted.
- The form shows it as a chip marked "ปิดใช้งาน", with a remove button.
- `getUserAccessChangeError` takes the target's current role ids and refuses only inactive roles that are new. Unit
  tests cover keep, remove and new grant.

**Roles the viewer cannot grant are disabled, with the reason, before saving:**
- ผู้ดูแลระบบ for a non-system-admin: "ให้ได้เฉพาะผู้ดูแลระบบ".
- A role holding permissions the viewer lacks: "มีสิทธิ์ที่คุณไม่มี".

The server check stays the authority (§9).

**"หลังบันทึก ผู้ใช้นี้จะทำอะไรได้":**
- Shows "สิทธิ์รวม {before} → {after}".
- A table by module group, with columns งาน · ตอนนี้ · หลังบันทึก. Each cell lists the actions, with gained ones marked
  "+".
- The module groups are the same five as the role editor (§7.2).
- A rights-free group shows "ไม่มี", and an unchanged group shows "เหมือนเดิม".

**Notes under the table:**
- When the change adds `delete`, `approve` or `export` anywhere: "ได้สิทธิ์ … ซึ่งเป็นสิทธิ์สูง".
- When a removed role loses nothing because another role covers it: "เอา{role}ออกแล้วไม่เสียสิทธิ์ใด เพราะ…".

**Close or reopen the account (อื่น ๆ menu):**
- It opens a confirm dialog that names the account and says the person cannot sign in until it is reopened. The dialog
  has an optional หมายเหตุ.
- It calls a new route, `PATCH /api/admin/users/[id]/status` `{ isActive, note }` **(my call)**:
  - It saves only `isActive`, and runs `getUserAccessChangeError` with the roles stored in the database, not the form.
  - It writes a `SystemLog` row (`action: update`, old and new `isActive`, `note`) and calls `invalidateUserAccess`.
- While the form has unsaved edits, the menu item is disabled with "บันทึกหรือยกเลิกการแก้ไขก่อน" **(my call)**. After it
  succeeds, the page refreshes.
- The "ใช้งาน" checkbox leaves the form.
- Closing the last active system administrator is refused, as today.

**Closing your own account** **(my call):** the menu item is disabled on your own account, with "ปิดบัญชีของตัวเองไม่ได้".

### 5.4 No source column (my call)

**Why there is no source flag:**
- The database cannot tell an AD account from a local one: AD accounts get a random password hash.
- Adding a source flag would need a migration and could only be right for accounts created after it.

**Instead:** the form explains with text (§5.1).

## 6. Role list (`US-Roles`)

**Header:**
- สิทธิ์การใช้งาน + "ตรวจสอบบทบาทผู้ใช้และสิทธิ์การเข้าถึงแต่ละโมดูล".
- **ส่งออกรายงานตรวจสอบสิทธิ์** (with `role:export`; same file as today).
- **เพิ่มบทบาท** (with `role:create`).

**Tabs** (`view=`): **บทบาท** {n} (default) · **ตารางสิทธิ์ตามโมดูล** (`matrix`).

**Warning bar** (replaces the StatStrip's "inactive role with users"):
- "บทบาทปิดใช้งานแต่ยังมีผู้ใช้ {n} บทบาท · {names} ยังผูกกับผู้ใช้ {users} คน ควรย้ายผู้ใช้ออกจากบทบาทนี้".
- A link to the user list with `role=<id>`. When there are several such roles, it links to the first one, and the
  names list all of them **(my call)**.

**Chips:**
- **ประเภท:** ทั้งหมด · บทบาทระบบ · บทบาททั่วไป (`type=`).
- **ควรตรวจ:** สิทธิ์สูง · ไม่มีผู้ใช้ · ไม่ใช้งาน (`check=`).
- Both rows have counts. สิทธิ์สูง keeps today's rule: any `delete`, `approve` or `export` permission.

**Search:** a search box over the role key, the display names and the description.

**Table, one row per role:**
- **บทบาท:** the Thai name, with the key in mono under it.
- **รายละเอียด**
- **ผู้ใช้:**
  - The count links to the user list with `role=`.
  - "ไม่มี" when 0.
- **สิทธิ์:** "{n} / {total}", with a thin bar and a "สิทธิ์สูง" badge.
- **ประเภท:** บทบาทระบบ or บทบาททั่วไป, plus "ป้องกัน" for `system_admin`.
- **สถานะ:** ใช้งาน or ไม่ใช้งาน, with "ยังมีผู้ใช้ {n} คน" when the role is inactive and has users.
- **แก้ไข**

**Ordering and paging:**
- The order stays as today: system roles first, then by key.
- Paging: 25, 50 or 100 rows **(my call: the dev DB has 1,000+ test roles)**.
- Footnote: "สิทธิ์สูง = มีสิทธิ์ลบ อนุมัติ หรือส่งออก อย่างน้อยหนึ่งโมดูล · ผู้ใช้หนึ่งคนมีได้หลายบทบาท".

**Matrix tab:**
- Today's module × action table, kept as it is (role chips in each cell), with the same captions.
- It only renders on its own tab.

**Phone (no board):**
- **(my call)** The role list shows as cards: name, key, users, permissions, status and แก้ไข.
- The matrix tab scrolls sideways inside its table.

## 7. Create and edit role (`US-Role-Edit`)

**Header:**
- "แก้ไขสิทธิ์บทบาท · {name}".
- Badges for the status and the type, and the key in mono.
- "ผู้ใช้ในบทบาทนี้ {n} คน" jumps to §7.3.
- An อื่น ๆ menu with "ดูประวัติของบทบาท".

### 7.1 Role details (ข้อมูลบทบาท)

**Fields, as today:**
- รหัสบทบาท *
- ชื่อแสดง *
- ชื่อแสดงภาษาไทย
- รายละเอียด
- ใช้งาน

**System roles:**
- On a system role the key and the status stay disabled, with today's notices.
- `system_admin` permissions stay locked.

### 7.2 Permission matrix (เลือกสิทธิ์)

**Columns:**
- The order is fixed: ดู → เพิ่ม → แก้ไข → ส่งออก → อนุมัติ → ลบ.
- ลบ is last, in the warning colour.
- There is one header row for the whole table, with "{selected}/{rows}" per column and a select-whole-column checkbox.

**Rows:**
- Each row is one module: the Thai name, the key in mono, a select-whole-row checkbox and "{n}/6".
- The checkbox targets are 40–44px.

**Module groups, foldable, each with "{modules} โมดูล · เลือก {n} จาก {total}":**
- **ทรัพย์สิน:** dashboard, asset
- **ธุรกรรม:** checkout, checkin, transfer
- **งานตรวจและดูแล:** audit, maintenance, disposal, report
- **ข้อมูลหลัก:** company, branch, department, employee, location, category, brand, supplier, status, condition
- **ผู้ใช้และระบบ:** user, role, setting, import, export, log

**How groups open:**
- A group starts open if it holds a change or if it has six modules or fewer.
- ข้อมูลหลัก and ผู้ใช้และระบบ start folded, and their folded summary shows per-action counts and the module names
  **(my call, from the board)**.

**Changed cells:**
- An added permission is green with "+", and a removed one is red with "−".
- The aria-label says "(เพิ่มใหม่)" or "(เอาออก)".
- A changed row shows a dot.

**Locked cells:** cells are disabled where the viewer cannot grant the permission (`getRolePermissionChangeError`),
with a title that says why.

**Change summary card:**
- "การเปลี่ยนแปลง {before} → {after}", then one line per change ("เพิ่ม อนุมัติ · ตรวจนับ").
- "มีผลทันทีกับผู้ใช้ {n} คนในบทบาทนี้: {first names}…". The names show only with `user:view`; otherwise the line has
  the count alone **(my call)**.

**Segregation warning:**
- It shows when the role ends up holding both `create` and `approve` on `disposal` or on `audit`.
- The wording follows the real rules:
  - **ตัดจำหน่าย:** "ระบบกันไม่ให้อนุมัติคำขอของตัวเอง เมื่อเปิด 'บังคับแยกผู้ทำรายการ/ผู้อนุมัติ'". Read the current
    value of that setting, and say whether it is on.
  - **ตรวจนับ:** "ระบบกันไม่ให้ปิดรอบที่ตัวเองสร้าง และพิจารณารายการไม่ตรงที่ตัวเองรายงานเสมอ" (`audit-segregation.ts`).
- It ends with "ถ้าไม่ตั้งใจ ให้เอาสิทธิ์อนุมัติออก หรือแยกเป็นบทบาทผู้พิจารณาอีกบทบาท".
- It is a warning only. Saving is not blocked.

**Footer:** "เลือก {n} จาก {total} สิทธิ์ · เพิ่ม {a} · เอาออก {r} · มีผลกับผู้ใช้ {u} คน", with ยกเลิก and บันทึกสิทธิ์.

### 7.3 People in this role (ผู้ใช้ในบทบาทนี้) — new, agreed in chat

**Placement:** a section on the edit page. It is not on create. It shows only with `user:view`; without it, the page
says "ผู้ใช้ในบทบาทนี้ {n} คน" only **(my call)**.

**List:**
- The people in the role: name, login name, status and last login. Each name links to their edit page when the viewer
  has `user:edit`.
- 10 rows at a time with "ดูทั้งหมดในหน้าจัดการผู้ใช้" (the user list with `role=`) **(my call)**.

**เพิ่มผู้ใช้เข้าบทบาทนี้** (needs `user:edit`; the role must be active):
1. A dialog with a search over active accounts not in the role.
2. Tick several names (up to 50 at once **(my call)**).
3. An optional หมายเหตุ field.
4. Confirm.

**New route `POST /api/admin/roles/[id]/users` `{ userIds, note }`:**
- Each user is checked with `getUserAccessChangeError`, using today's roles plus this one.
- Each one is saved in its own transaction, with a `SystemLog` row (`module: user`, `action: update`, `oldValue.roleIds`,
  `newValue.roleIds`, `newValue.note`).
- It returns `{ added: [...], refused: [{ userId, reason }] }`.
- Refused names are shown in the dialog in Thai; the others are saved.
- It calls `invalidateUserAccess` per user.
- It also writes one `SystemLog` row on the role (`module: role`, `recordId: roleId`, `action: update`,
  `newValue: { addedUserIds, note }`), so the role's history shows the batch **(my call)**.
- Users who hold an inactive role can be added; the inactive-role rule in §5.3 applies.

**Removing someone from a role** stays on that user's edit page **(my call: removal must keep at least one role per
user, and the form already enforces that)**.

## 8. Messages and words

**Editing messages:** all copy goes through `node scripts/messages-edit.mjs`, with Thai first and English beside it.

**Plurals:**
- English uses ICU plurals.
- Thai uses `{n, number}`.

**Wording:**
- Words follow `docs/19_THAI_GLOSSARY.md`.
- The module and action names reuse `adminRolesPage.modules.*` and `adminRolesPage.actions.*`.

## 9. What the boards omit and we keep

**Server rules, unchanged except the inactive-role keep rule in §5.3, and still the authority:**
- No escalation: you cannot grant a role or permission you do not hold.
- You cannot change a user who has more access than you.
- Only a system administrator can grant `system_admin`.
- The last active system administrator cannot be removed or closed.
- Login names are unique.
- One employee has at most one account.
- At least one role per user.
- Passwords are 8–100 characters.
- Inactive roles cannot be granted.
- System role keys and statuses are fixed, and `system_admin` permissions are protected.
- `invalidateUserAccess` and `invalidateAllAccess` run after saves.
- `SystemLog` rows are written for every user and role save.

**Pages and lists:**
- Search including role names.
- Every sort value.
- Page sizes and the redirect from a page past the end.
- Clickable rows.
- `RowActions` labels.

**Gates, routes and forms:**
- The create gates and the export gate.
- The roles export route and its two sheets.
- The role-key field rules.
- Field errors under each field, with focus moving to the first error.
- The new-user page and the new-role page.

**Other:** the `GET /api/admin/users` route.

## 10. Recon notes (2026-11-08)

**Accounts from AD:**
- AD login (`authenticateCredentials`) tries the local password first, then AD.
- The AD search uses `sAMAccountName={username}`, and `normalizeLoginName` strips `@domain`.
- An existing account is matched by login name, email, or the employee found by AD `mail` or `employeeID`.
- The display name and email are overwritten at each login.
- A new account is created only when `ldap_auto_provision` is on and an active employee matches. It gets the
  `ldap_default_role` role (dev: `employee`) and a random password hash.

**Data:**
- Asset holders are employees (`Asset.custodianId`), not users, so closing an account does not touch holdings.
- `User` has no source column, and `Employee` does not store the AD login name.

**Dev DB:**
- 6 real users, 5 of them system administrators.
- 11 seed roles and 1,033 E2E test roles.

**Current pages:**
- The roles page renders the full matrix with chips in every cell.
- The user form is a flat checkbox grid with an "ใช้งาน" checkbox.
- The logs page filters by `module` and `action` only.

## 10a. E2E

**Where:**
- Desktop and phone specs live under `e2e/admin/`. Use run-marked users and roles on the dev DB only.

**Allowed:**
- Creating and editing run-marked users and roles.
- Adding run-marked users to a run-marked role.

**Not allowed:**
- Touching `system_admin` or seed roles' permissions.
- LDAP sync.
- Saving settings.
- Failed logins.
- DELETE requests.

## 11. Plans

1. **User list and shared parts:**
   - status, role, default-only and review filters with counts;
   - the warning with holdings;
   - the new columns and the phone cards;
   - the logs `recordId` filter;
   - E2E for the list.
2. **User create and edit:**
   - the AD or local choice;
   - the employee picker with auto-fill;
   - role chips and grant locks;
   - the before → after table;
   - close or reopen in the menu with a confirm;
   - หมายเหตุ in the log;
   - the sticky footer;
   - E2E.
3. **Roles:**
   - list tabs, chips, warning, paging and phone cards;
   - the matrix editor with groups, row and column select, change marks, summary and segregation warning;
   - people in the role and bulk add (new route);
   - หมายเหตุ;
   - E2E.

No migration in any plan.
