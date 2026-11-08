# Page group 12: admin pages (ผู้ดูแลระบบ)

Boards: `AD-Settings`, `AD-Logs`, `AD-DataQuality`, `AD-Storage`, `AD-Integrations`, `AD-Readiness`,
`AD-ApprovalHistory`, `AD-Denied` in the canvas (https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p).

**Inputs:**
- Assumptions: `.impeccable/critique/2026-10-20-canvas-assumptions.md`, sections "ผู้ดูแลระบบที่เหลือ", "ตั้งค่าระบบและ
  Integration API" and "ทรัพย์สินของฉันและหน้าไม่มีสิทธิ์".
- Recon of the current pages: 2026-11-08 (§13; that inventory is the kept-features checklist). Every feature they have is kept.
- Calls marked **(my call)** are mine, played back to the user in chat and accepted ("โอเค ครบแล้ว").

**User decisions 2026-11-08:**
- **Who uses the pages:** the IT team uses these pages. **Settings and system history are used most.**
- **System history** is used to find **who changed which asset, and when**. The IT team **knows the asset tag first**.
- **Settings, LDAP bind password** (the shared account the system uses to read AD):
  - It is never shown.
  - The page shows "บันทึกไว้แล้ว" with a small "เปลี่ยน" link, for the day IT changes that account's password.
  - Clearing it is not offered.
  - The user first read this as staff passwords. They agreed once it was explained that it is the bind account.
- **LDAP "ซิงก์ทันที" (apply)** gets a confirm dialog naming the counts (เพิ่ม · แก้ · ปิด) before it runs.

## 1. Why

**Settings:**
- It is one 2,600-line form with 11 tabs in a row.
- It has an overview panel that repeats the tabs.
- It does not show what each changed value was before.
- It shows the LDAP bind password as a password box with a placeholder.
- "ซิงก์ทันที" can deactivate employees and users with no confirm.

**System history:**
- It filters only by free-text module and action codes.
- It cannot answer "who changed asset X, and when" without the record id.

**Other pages:**
- Most show English words ("Dry-run", "Archive", "configured") or raw codes.
- Some lose information on narrow screens.
- The denied page shows a raw "module:action" code and does not say which page was blocked.

## 2. Goals, non-goals, anti-goals

**Goals:**
- Find an asset's change history by its tag, filtered by user and date.
- A settings page grouped in a left menu that shows what changed against the saved value. The bind password is never
  shown, and AD sync is confirmed.
- Thai words everywhere these pages show English or codes today.
- A denied page that names the page, the permission, the user's roles and whom to contact.

**Non-goals:**
- New database tables or columns. No migration.
- An in-app restore of archived files.
- Duplicate-data detection on the data-quality page. That is future work.
- Changing what any setting does.
- Changing the LDAP sync rules.
- The approvals inbox page (`/admin/approvals`), apart from its denial behaviour (§9).

**Anti-goals:**
- Any secret value rendered, logged or sent back to the browser (bind password, tokens, env secrets).
- An AD sync that runs without the person seeing the counts first.
- Losing any setting, filter, link, export, gate or piece of information the pages show today.
- A search that scans the whole log table on every keystroke.

## 3. Shared

**Copy and messages:**
- Thai first, using the words in `docs/19_THAI_GLOSSARY.md`.
- Messages change only through `node scripts/messages-edit.mjs`.

**Gates stay as today:**
- `setting:view` and `setting:edit` for settings, data quality, storage, integrations and readiness.
- `system:view` for logs.
- Approval access for approval history.
- The extra LDAP rules in `src/lib/system-setting-secrets.ts` stay: LDAP keys, the test and apply all need
  `system_admin`.

**E2E (§12)** never saves settings, never tests or syncs LDAP, never calls `/api/admin/storage/*` or
`/api/notifications/digest`, and never sends DELETE.

## 4. System history (`AD-Logs`, `/admin/logs`)

**Header:**
- "ประวัติระบบ".
- A link "ประวัติการตัดสินใจอนุมัติ" to `/admin/approvals/history`. It shows only to viewers with approval access.

**Filters (GET form, all in the URL):**
- **ค้นหารหัสทรัพย์สิน** (`tag=`):
  - The main search.
  - It looks up assets whose tag matches exactly or starts with the text.
  - It filters logs to those assets' ids through the indexed `recordId`, plus the module.
  - If no asset matches, it says "ไม่พบทรัพย์สินรหัสนี้".
  - It never runs a LIKE over the log values **(user decision: tag first; my call: exact or prefix, up to 50 assets)**.
- **ผู้ใช้** (`userId=`):
  - A searchable picker of all users.
  - It has an extra option "ระบบ (งานตามเวลา)" for logs with no user **(my call)**.
- **ช่วงวันที่** (`from=`, `to=`):
  - The default is **ทั้งหมด**, so every existing link behaves as today.
  - Quick chips: วันนี้ · 7 วัน · 30 วัน, plus a custom range.
  - Reuse the repair list's date-range chip **(my call)**.
- **โมดูล** and **การกระทำ** become Thai-labelled selects, using the `systemLogPage.module_*` and `action_*` labels.
  The URL values stay the same codes.
- The quick-filter tabs and the `recordId` chip stay.
  - Every filter keeps the others.
  - Pagination stays at 25, 50 or 100 per page, with the last-page redirect.

**Table:**
- **Columns:**
  - **เวลา**
  - **ผู้ใช้:** a log with no user shows "ระบบ · งานตามเวลา".
  - **เหตุการณ์:** one Thai sentence made of the action, the record (asset name before its tag, linked when there is an
    href) and the summary.
  - **โมดูล**
  - **An expand button:** opens a row with the before/after table and the remark. The table uses Thai field names and
    values.
  - Assets get a "เปิดหน้าทรัพย์สิน" link.
- **Header line:** "{range} · {n} รายการ · ใหม่สุดก่อน".

**Summary fixes:**
- Use Thai field labels and Thai values, with no raw field names or English values.
- Format ISO dates with `formatDateTime`.
- Add labels for fields that have none, such as reviewStatus and findingType.
- These live in the shared presenter (`system-log-presenter.ts`), so approval history gets them too.

## 5. Approval history (`AD-ApprovalHistory`, `/admin/approvals/history`)

**Navigation:**
- A breadcrumb "งานรออนุมัติ › ประวัติการตัดสินใจ".
- A "กลับไปงานรออนุมัติ" button.

**Chips and filters:**
- The StatStrip goes away. The chips carry the numbers.
- The module chips are in this order: ทั้งหมด · ตัดจำหน่าย · ตรวจนับ · ซ่อมบำรุง.
- The decision chips are as today.
- New filters:
  - **ผู้ตัดสินใจ:** a searchable list of everyone who has a decision log row the viewer may see **(my call)**.
  - **ช่วงวันที่:** the same control as in §4.
- The chip counts follow the actor and date filters **(my call)**.

**Rows:**
- Rows are grouped under day headings: วันนี้ / เมื่อวาน / the date.
- Each row shows the document number, then the asset name before its tag, then the decision label and the time.
- The expanded detail uses Thai field names and values (§4) and an "open record" link.

**Kept:**
- The repair-close history gate (`maintenance:edit`).
- Pagination and the empty state.

## 6. Readiness (`AD-Readiness`, `/admin/readiness`)

**Header:** a "ตรวจเมื่อ {time}" line.

**"ขั้นถัดไป" card:**
- It lists the ต้องแก้ items.
- For each one it says what to do and that a server admin and an app restart are needed.

**Chips:**
- ต้องแก้ · ควรตรวจ · พร้อม, with counts and a sum line.

**Groups:**
- The 16 checks fall into 4 groups:
  - การเข้าระบบและผู้ดูแลระบบ
  - สำรองข้อมูลและงานตามเวลา
  - ป้าย QR ขั้นตอนงาน และข้อมูลหลัก
  - ไฟล์และการติดตั้งแอป
- Each group shows its counts.
- Items sort fail, then warning, then pass.

**Table columns:**
- **สถานะ**
- **รายการตรวจ**, with a Thai sentence on why it matters.
- **ค่าที่ตรวจพบ:**
  - A Thai value, for example "ตั้งแล้ว 4 จาก 4 ค่า" or "ระบบไม่แสดงค่าคีย์".
  - The scheduler-token row names which token is missing.
- **แก้ที่ไหน:** the env var names and "แล้วรีสตาร์ตแอป", or a link to the matching settings tab. Master data links to
  master data.

**Never show a secret value.** Show only whether it is set.

## 7. Data quality (`AD-DataQuality`, `/admin/data-quality`)

**Tabs** (`tab=`), each with its number:
- **ข้อมูลไม่ครบ {n}:** the rules.
- **สถานะไม่สอดคล้อง รอตรวจสอบ {n}:** the review workspace, kept as it is.
- The pending count shows to every viewer of the page **(my call)**.

**Rules tab:**
- A distribution bar of the issue counts per rule, summing to the total.
- One card per rule:
  - A switch, and a segmented severity control: เตือน / เร่งด่วน.
  - An off rule is dimmed and shows no count.
  - A rule switched on but not yet saved says "นับหลังบันทึก".
  - The count is a link "ดูทรัพย์สิน {n} รายการ" to the filtered register, as today.
- Viewers without `setting:edit` see the cards read-only.

**Saving:**
- The bottom form becomes a sticky save bar.
  - It shows "ปิด → เปิด · กฎที่เปิด {before} → {after}".
  - It has ยกเลิก and บันทึกกฎ.
- After saving, the page refreshes so the counts update.
  - Today they stay stale.

**"ข้อมูลซ้ำ"** (duplicate detection) is future work and not built **(my call)**.

## 8. Storage (`AD-Storage`, `/admin/storage`)

**Header:**
- It shows the upload folder.
- The same gate already sees it on the readiness page.

**Tiles and filters:**
- 4 stat tiles, with a breakdown line "หลุด {n} · หาย {n} · path ซ้ำ {n} · path ว่าง {n}".
- An equation line "{total} = {in use} + {orphans}".
- Filter chips: ทั้งหมด / ไฟล์หาย / ไฟล์หลุด, with counts. Missing files come first.

**Rows:**
- The filename on one line with an ellipsis, plus its folder.
- A "ที่มา" column with Thai module names. Add the missing labels for the signature, photo and disposal-batch modules.
- **Missing rows:**
  - The asset name and tag, with "เปิดทรัพย์สิน".
  - Resolve the attachment's `referenceId` to its asset for each module.
  - Show "ตรวจสอบเท่านั้น".
- **Orphan rows:**
  - An outline button "ย้ายไปที่เก็บถาวร".
  - The confirm dialog is kept, and so are the server 409 check and the `setting:edit` gate.
- **Expanding a row** shows:
  - the path relative to the upload root, with a copy button;
  - the archive destination;
  - "ไม่มีรายการใดอ้างถึง".

**Other sections:**
- The list shows "แสดง 8 จาก {n} · ดูทั้งหมด". Show-all is a URL param that renders the full list **(my call)**.
- The module table shows share bars, a total row and Thai labels.
- The duplicate/empty path list shows the asset name and tag.
- The largest files show the module, the asset and the date.

**Wording:**
- Thai words replace "Dry-run", "flag" and "Archive".
- The board's "ย้ายกลับได้" becomes "ผู้ดูแลเซิร์ฟเวอร์ย้ายกลับได้" **(my call)**, because there is no in-app restore.

## 9. Denied page (`AD-Denied`, `/access-denied`)

**Passing the blocked page:**
- `requirePagePermission` adds `from=<path>` to the redirect. It reads the path from the proxy's request-path header.
- `from` is for display only:
  - It must be an internal path (start with `/<locale>/`, with no protocol and no `//`).
  - It is never used as a redirect target.

**The page shows:**
- The blocked page's menu title, mapped from the path, or "หน้านี้" if it is unknown.
- The permission in Thai, for example "ดู · แดชบอร์ด", using the `adminRolesPage` words.
- "บทบาทของคุณ: {all active role names}".
- Reassurance that nothing was lost or saved.
- **IT Helpdesk box:**
  - It shows phone and email from two new settings keys, `it_helpdesk_phone` and `it_helpdesk_email`.
  - The keys go on the settings Organization tab.
  - The box hides when both are empty.
- **Buttons:**
  - "กลับหน้าแรก" (kept).
  - A new secondary "กลับหน้าก่อน" (history back).
  - "เปิดศูนย์งานค้าง", only with `dashboard:view` (kept).
- The line "หน้าแรกของคุณ: {home name}".

**Approvals pages:** the approvals inbox and approval history now redirect here instead of returning 404 when the
viewer has no approval access **(my call)**.

## 10. Integration API (`AD-Integrations`, `/admin/integrations`)

**Header:**
- A "ประวัติการเรียกใช้" link to the logs filtered to `integration_api`.
- A "สร้าง client" button that opens a side panel (`Sheet`).
- Creating keeps the one-time token flow:
  - copy;
  - the acknowledgement checkbox gates closing;
  - after create, step 1 collapses to a summary.

**Tiles and chips:**
- 4 tiles:
  - active
  - disabled
  - clients that have been used
  - "การใช้งาน · 7 วัน {n} ครั้ง · Error {n}"
- Status filter chips with counts.

**Rows:**
- The display name first, then the client ID (mono), the created date and the creator (look up the user by
  `createdBy`).
- A "ใหม่" highlight after create.
- Thai scope badges.
- The token preview keeps the real first and last 4 characters, as today **(my call: helps match a token)**.
- "เปลี่ยน {date}" from `lastRotatedAt`.
- The last-used time, the 7-day count, and an error badge.
- **Row expand (my call):** the 24-hour count, the top endpoint and the latest error move into an expandable detail,
  so none are lost.
- **Buttons:**
  - One row button, "แก้ไข". Its dialog and the confirm on widened scopes are kept.
  - A ⋯ menu:
    - Copy PowerShell
    - เปลี่ยน token… (destructive confirm kept)
    - ปิดใช้งาน… or เปิดใช้งาน…, red and separated, with their confirms kept
  - A per-client history link through `buildSystemLogRecordHref`.

**Rules:**
- The token is held in memory only. It is never logged or shown again.

## 11. Settings (`AD-Settings`, `/admin/settings`)

**Left menu:**
- The 11 tabs stay, with the same `?tab=` URLs and the same in-place switch that keeps edits.
- They move into a left menu under 4 headings:
  - ทรัพย์สินและเอกสาร
  - องค์กรและการทำงาน
  - การเข้าสู่ระบบ
  - อื่น ๆ
- Each item has a one-line summary, taken from today's overview panel, which goes away.
- Each heading has a badge counting its unsaved values.
- Below `lg` the menu becomes a select or a stacked list **(my call)**.
- The settings search stays at the top of the menu.

**Changed values:**
- Each changed field shows "แก้แล้ว · เดิม {old}" through the shared `form-changed-field`.
- The LDAP sections say "แก้ {n} ค่า".
- The change review table stays:
  - The Thai setting name comes first, with the key small in mono.
  - Booleans read เปิดใช้งาน or ปิดใช้งาน.
  - A removed role is tagged "ไม่พบบทบาท".
  - Every key needs a Thai label map.
- **Footer:**
  - "เปลี่ยน {n} ค่า ยังไม่บันทึก".
  - **ยกเลิกการแก้ไข**: resets everything to the saved values, after a confirm.
  - **บันทึก {n} ค่า**.
  - The beforeunload warning stays.

**LDAP bind password (user decision):**
- The field is never rendered.
- A read-only box says "•••••••• บันทึกไว้แล้ว", or "ยังไม่ได้ตั้ง".
- A small "เปลี่ยน" link opens a password input.
  - Cancelling it returns to the stored state.
- An empty input never clears the stored password.
- Keep the `__STORED_SECRET__` round trip in `resolveSubmittedSecretSettings`.
- A changed URL or Bind DN needs a new password before testing. The error shows in Thai under the field, not as an
  English toast.

**LDAP test:**
- The button keeps testing the on-screen values.
- The latest result shows next to it, for example "ทดสอบไม่ผ่าน 10:41 น.".
- The result is for this visit only, and not stored **(my call)**.

**LDAP sync:**
- Preview and apply use the saved values. While LDAP keys are unsaved, both buttons are disabled with
  "บันทึกค่า LDAP ก่อน".
- **Apply (user decision):** a confirm dialog shows the preview counts, "เพิ่ม {n} · แก้ {n} · ปิด {n}". It names the
  deactivations in danger tone and needs an explicit confirm.
- Apply still requires a preview first, and `system_admin`.

**Approval summary:** "ผู้อนุมัติ {n} · SLA {n} วัน · SOD เปิด" fixes today's "/SOD" string.

**IT Helpdesk:** two new fields on the Organization tab, phone and email (§9). They are ordinary settings keys.

**Kept:** every setting group and control listed in the recon (§13). The sync tab, search results, the advanced table
and the history panel keep their content and only get restyled.

## 12. E2E

**Run where:** on the dev DB, with run-marked data, signed in with the seed admin session.

**Pages with real coverage:**
- **Logs:** a run asset's tag finds its logs; the user and date filters work.
- **Approval history**
- **Readiness:** assert structure, not statuses.
- **Denied page:** a run user without a permission opens a gated page and sees its name and Thai permission.
- **Data quality:** tabs and cards. No save, no scan, no resolve.
- **Storage:** chips, expanding a row, and the archive confirm opened then cancelled.

**Settings:**
- Allowed: open the page, switch groups, edit a field to see "แก้แล้ว · เดิม", open the review table, and reset.
- Never: save, test, preview or apply. Check the apply confirm through a source pin, not the browser.

**Integrations** **(my call)**:
- The spec fulfils `GET /api/admin/integration-clients` with fake data through `page.route` in that spec only, so the
  server is never called.
- The hazard guard allows a fulfilled (never sent) request there, with a pin that names the one spec.
- No create, rotate, enable or disable.

## 13. Recon notes (2026-11-08)

The full inventory (the kept-features checklist for every page) is in `docs/superpowers/specs/2026-11-08-page-group-12-admin-recon.md`.

**Settings:**
- Page 358 lines, form 2,612 lines.
- 11 tabs.
- Search, the overview panel, a change review table, field errors, beforeunload, and a sticky footer.
- LDAP test, plus sync preview and apply (no confirm).

**Logs:**
- Quick filters, module and action text inputs, `recordId`.
- 25/50/100 paging.
- `SystemLog` has indexes on createdAt, (module, action, createdAt), recordId, and (userId, createdAt).

**Data quality:** 6 rule counts, the review workspace (scan, resolve, dismiss), and the rule form saving through
settings PUT.

**Storage:** 4 stats, a dry-run panel (orphan archive with confirm), a module table, a review list, and the largest files.

**Integrations:** the client manager (create, one-time token, edit, rotate, enable, disable, operations panel, PowerShell
example).

**Readiness:** 16 checks with fix text or links.

**Approval history:** module and decision tabs over the decision logs, and a 404 when the viewer is denied.

**Denied page:** a raw "module:action" notice, home, and the work center.

## 14. Plans

1. **Denied page + readiness:**
   - the `from` parameter;
   - Thai permission, role and page names;
   - the helpdesk keys, plus their two Organization fields as a small, separate settings change;
   - back button;
   - approvals redirect;
   - readiness groups, chips, Thai values and env names.
2. **System history + approval history:**
   - tag search, user and date filters, Thai selects;
   - the 5-column table with expand rows;
   - the presenter's Thai labels;
   - day groups and the actor/date filters on history.
3. **Data quality + storage:**
   - tabs, rule cards and the sticky save bar with refresh;
   - storage chips, show-all, expand rows, copy path, asset resolution and Thai labels.
4. **Integration API:** side-panel create, tiles, chips, the row expand, the ⋯ menu, creator names, history links,
   and E2E with fake data.
5. **Settings:** the left menu, changed-value markers, reset, bind-password mode, the LDAP test result, sync gating and
   the apply confirm, and the review table's Thai labels. Split in two if the form diff is too big.

No migration in any plan.
