# Group 12 recon: 8 admin pages vs canvas boards

Read-only recon on master (5240aeb0), 2026-11-08. Boards were read as untrusted data (text extracted with board-text.py).
Board assumptions: `.impeccable/critique/2026-10-20-canvas-assumptions.md` sections "ผู้ดูแลระบบที่เหลือ" (l.389-418),
"ตั้งค่าระบบและ Integration API" (l.420-449), "ทรัพย์สินของฉันและหน้าไม่มีสิทธิ์" (l.300-325).
Paths below are relative to `D:\Antigravity\asset-system`; `[pages]` = `src/app/[locale]/(dashboard)`.

## Cross-cutting facts (read first)

- Permission gates: settings, data-quality, storage, integrations, readiness = `setting:view` page gate; every write API
  under `/api/admin/{settings,storage,integration-clients,asset-state-reviews}` = `setting:edit`. Logs = `system:view`.
  Approval history = `getApprovalInboxAccess(user).canAnyApproval`, else `notFound()` (404, NOT the denied page).
- LDAP extra gates (`src/lib/system-setting-secrets.ts`): changing any `ldap_*` key (except `ldap_sync_last_*`) needs role
  `system_admin` (403 otherwise); `/ldap-test` needs `system_admin`; `/ldap-sync` apply needs `system_admin`, preview
  needs `setting:edit`.
- E2E hazards (`e2e/support/hazards.ts`, enforced by fixtures + `tests/e2e-review.test.ts` source guard):
  `/api/admin/settings/ldap-(sync|test)` all methods; `/api/admin/settings` PUT/POST/PATCH/DELETE; `/api/notifications/digest`;
  `/api/(integrations|admin/integration-clients)` ALL methods (incl. GET); `/api/admin/storage/*` all; any DELETE.
  Consequences: data-quality "save rules" (PUT /api/admin/settings) cannot run in E2E; the Integrations page cannot even
  load its list in E2E (client-side GET is a hazard); storage archive cannot be clicked. `/api/admin/asset-state-reviews`
  (scan/resolve/dismiss) is NOT a hazard but writes to the dev DB.
- Existing reusable UI: `sheet.tsx` (side panel), `row-actions.tsx` (⋯ menu), `segmented.tsx`, `distribution-bar.tsx`,
  `form-changed-field.tsx` ("แก้แล้ว · เดิม …"), `sticky-form-footer.tsx`, `filter-select.tsx`,
  `components/maintenance/repair-date-range-chip.tsx` (date range), `confirm-dialog.tsx` / `useConfirm`.
- Thai copy: new keys via `node scripts/messages-edit.mjs`; glossary `docs/19_THAI_GLOSSARY.md`, `tests/thai-glossary.test.ts`.
- No board needs a Prisma migration EXCEPT optionally: persisted "last LDAP test result" (Settings) and IT Helpdesk
  contact (Denied) — both fit as new `system_settings` keys (row data, no schema change; but writing them = settings save).

---

## 1. AD-Settings -> /admin/settings

1. Route `[pages]/admin/settings/page.tsx` (358 lines; server, passes ~280 labels). Form
   `src/components/admin/system-settings-form.tsx` (2,612 lines, client) + `depreciation-policy-builder.tsx` (426).
   APIs: `api/admin/settings/route.ts` (146: GET setting:view, PUT setting:edit), `settings/ldap-test` (40), `settings/ldap-sync` (109).
   Gate: page `setting:view`; edits `setting:edit`; LDAP keys `system_admin`.
2. Current features (keep all):
   - TabNav with 11 tabs, each a URL (`?tab=`; Ctrl+click opens new tab; plain click switches in place, keeps edits):
     asset-numbering, label-template, documents, organization, notifications, workflow-approval, automation, governance,
     ldap-login, ldap-sync, advanced.
   - Settings search (top 6 results, each opens its tab and scrolls to `#settings-workspace`).
   - Overview KeyValueList (asset tag, label, documents, org, notifications, approval, governance, LDAP login/sync badges, advanced count).
   - Asset numbering: format template + presets (3) + tokens + example; running digits; separator; global prefix;
     category prefix groups (add/edit/remove; transfer-list editor with search both sides, check/move, live prefix rule, preview).
   - Label template: compact name short/full; Public QR base URL + preview + resolver path; default tape size 12/18/24/custom;
     per-preset width/height/QR size/margin/gap/layout (qr-left/qr-top/text-only/qr-only); 3 text lines; live preview; tokens.
   - Documents: checkout/checkin number templates, running digits, examples, tokens.
   - Organization: company name, default currency, check-in department code (server validates active dept), depreciation
     policy builder (method, start basis, default life/residual, groups with category transfer, legacy rules, preview, advanced JSON).
   - Notifications: return-due-soon, audit-action-due-soon, warranty-expiry, license-expiry days.
   - Workflow approval: disposal approval required, audit close required, SOD, min approvers, SLA days, foundation note.
   - Automation: heartbeat notice only. Governance: 3 retention days + link to /admin/storage.
   - LDAP login: 3 numbered sections — (1) enable, StartTLS, reject-unauthorized toggles; URL, Base DN, Bind DN, Bind password
     (`type=password` holding `__STORED_SECRET__` placeholder); "Test LDAP connection" (uses on-screen values, toast result);
     (2) user filter, UPN domain, domain, user DN template; (3) auto-provision checkbox, default role SearchableSelect + "role missing" warning.
   - LDAP sync: recommendation notice; (1) sync enabled, deactivate missing, mode preview/manual/scheduled, max scheduled
     deactivations, sync base DN; (2) default company/branch/department codes (uppercased); (3) schedule presets + custom cron,
     sync filter; (4) Preview (POST action=preview) and Apply (POST action=apply; waits for a preview; NO confirm dialog today),
     preview panel (totals, creates/updates/deactivates, blockers, deactivation impact with asset links), error notice;
     history panel (last 5 `employee/ldap_sync` logs) + "view all" link to /admin/logs quick filter.
   - Advanced: warning notice + `<details>` table of every other key (key / value input / description).
   - Change review table (key → before → after; key links to its tab) shown when anything changed.
   - Field-level errors (live rules + server fieldErrors, focus first error, opens its tab); beforeunload warning;
     StickyFormFooter with "N changes" status and Save (aria-disabled when nothing changed); `router.refresh()` after save.
3. Board changes:
   - Left sub-nav replaces TabNav: same 11 tabs grouped into 4 headings (ทรัพย์สินและเอกสาร / องค์กรและการทำงาน /
     การเข้าสู่ระบบ / อื่น ๆ), each item with a one-line summary (moved from the overview panel, which is removed) and an
     unsaved-count badge per group.
   - "แก้แล้ว · เดิม …" under each changed field; LDAP sections show "แก้ N ค่า".
   - Bind password: read-only "•••••••• บันทึกไว้แล้ว" box + "เปลี่ยนรหัสผ่าน" button; inline (Thai) error under the field
     when URL/Bind DN changed and a new password is needed before testing (today an English toast).
   - Last test result next to the button ("ทดสอบไม่ผ่าน 10:41 น.").
   - Review table: Thai setting name first, key small mono, booleans as เปิดใช้งาน/ปิดใช้งาน, "ไม่พบบทบาท" tag on the old role.
   - Note that sync preview/apply use SAVED values and wait until LDAP edits are saved (behaviour change: buttons disabled
     or warned while LDAP keys are dirty).
   - Footer: "เปลี่ยน 3 ค่า ยังไม่บันทึก", new "ยกเลิกการแก้ไข" (reset), button "บันทึก 3 ค่า".
   - Approval summary fixed spacing ("ผู้อนุมัติ 1 · SLA 3 วัน · SOD เปิด" — current string has "/SOD").
   - Header description text; sync tab, search results and other tabs not drawn (keep current content).
4. Not in code: grouping metadata + summaries per tab (UI only); per-group dirty counts; Thai names for every key in the
   review table and search results (need a key→label map; advanced keys only have descriptions); reset action;
   secret "replace" mode; last-test-result state (session only, or a new setting key if it must persist); sync-dirty gating.
   No migration, no new API.
5. Risks: the page holds the LDAP bind password (copied from Production) — never render it, never put it in the review
   table/log (already `[REDACTED]`), keep `__STORED_SECRET__` round-trip semantics (`resolveSubmittedSecretSettings`); the
   replace-mode must not send an empty string that wipes the stored password by accident. LDAP test/sync reach the company
   AD; E2E may only open the page, switch groups, edit fields, check the review table and reset — never Save, Test, Preview
   or Apply (all hazards). Apply has no confirm today; board does not draw one. 2,612-line client file: a restyle touching
   every tab is the largest regression surface in the group.
6. Product-owner questions:
   - Keep 11 tabs as separate screens under the 4 headings, or merge each heading into one scrolling page? (scope: nav only vs. re-layout of every tab).
   - Should the last LDAP test result persist across reloads/users (new setting key, written by the test API) or only for this visit?
   - Should "ซิงก์ทันที" (Apply) get a confirm dialog naming the counts (creates/updates/deactivates)? Destructive (deactivates employees/users).
   - Bind password "เปลี่ยนรหัสผ่าน": is clearing the password ever needed (LDAP off), or only replacing?

## 2. AD-Logs -> /admin/logs

1. Route `[pages]/admin/logs/page.tsx` (250; server). Helpers `src/lib/system-log-presenter.ts` (480),
   `system-log-record-labels.ts` (105), `system-log-history.ts` (quick filters, `buildSystemLogFilterHref`, `buildSystemLogRecordHref`).
   Gate `system:view`. No API (server query). Model `SystemLog` has indexes on createdAt, (module, action, createdAt),
   recordId, (userId, createdAt).
2. Current features:
   - Quick-filter TabNav: ทั้งหมด, ซิงก์ LDAP, ตั้งค่าระบบ, นำเข้าทรัพย์สิน, สร้างทรัพย์สินแบบชุด, สรุปแจ้งเตือน, Integration API
     (keeps pageSize and recordId).
   - GET filter form: free-text `module`, `action` inputs; hidden pageSize/recordId; FilterFormActions (filter/clear).
   - `recordId` filter (linked from user/role pages) shown as a removable chip with the record's label.
   - Table: date, user, module, action, record (link when `href`), detail (summary + `<details>` before/after table + remark).
   - Real pagination 25/50/100, out-of-range page redirects to last page; empty vs. empty-filtered text; perf timing wrapper.
3. Board changes:
   - Header link "ประวัติการตัดสินใจอนุมัติ" (to /admin/approvals/history).
   - Module and action become Thai-labelled selects; NEW user select (incl. "ระบบ (งานตามเวลา)"), date range, text search.
   - 5 columns: เวลา · ผู้ใช้ · เหตุการณ์ (one sentence: action + record + summary, asset name before tag) · โมดูล · expand
     arrow; before/after table opens in an expanded row with "เปิดหน้าทรัพย์สิน" link; header line "range · N รายการ · ใหม่สุดก่อน".
   - Null user shows "ระบบ งานตามเวลา" instead of "-".
   - Summary sentences fixed (spacing, no raw field names/English values; ISO dates via formatDateTime; new field labels
     e.g. reviewStatus, findingType, pending/approved).
4. Not in code: user filter, date-range filter, text search (no column suited — remark/oldValue/newValue are NVarChar(Max),
   LIKE scans an ever-growing table; recordId is indexed but holds ids, not tags); option lists from `module_*` (20) and
   `action_*` (41) keys; `storage` module has no Thai label; buildSummary rewrite per action. No migration needed for
   user/date (indexes exist). Text search may need a design decision (see questions).
5. Risks: performance of count + search on system_logs (shared prod SQL server); "ประวัติการตัดสินใจ" link must only show
   to users with approval access (else 404); summary rewrite also feeds approval history (shared presenter) — change both
   together with tests. Read-only page: E2E-safe.
6. Questions:
   - Default date range: all time (today) or last 7 days (board shows a week)? Changes counts, speed, and every existing link.
   - Text search: what should it match — asset tag/record label only (resolve tag→id, indexed) or free text in remarks/values (slow)?
   - User filter list: all active users, or only users who appear in the log?

## 3. AD-DataQuality -> /admin/data-quality

1. Route `[pages]/admin/data-quality/page.tsx` (237; server). `src/components/admin/data-quality-rule-form.tsx` (122),
   `asset-state-review-workspace.tsx` (252), `asset-state-review-dialog.tsx` (156). APIs: rules saved via PUT
   `/api/admin/settings` (key `asset_data_quality_rules`); `/api/admin/asset-state-reviews` GET (setting:view), `scan`,
   `[id]/resolve`, `[id]/dismiss` (setting:edit). Gate page `setting:view`; edit controls when `setting:edit`.
2. Current features:
   - Header "เปิดรายงาน" link (/reports). StatStrip: enabled rules, total issues (enabled rules only), rules configured.
   - 6 rule cards (warrantyExpiring, missingPhoto, missingSerial, missingCustodian, missingDepartment, missingPurchaseInfo):
     label, description, severity/inactive badge, count (counted even when the rule is off), "ดู" link to the filtered register
     (`buildDataQualityRuleHref`).
   - Asset state review workspace: scan button (edit only), filters review status (pending/resolved/dismissed/all),
     severity, issue type (11 types); table (asset, current state, issue, last detected, actions) + mobile cards;
     resolve dialog (next status/condition/reason) or "workflow required"; dismiss dialog (reason); read-only text for
     viewers; pager prev/next; stale/load/save errors.
   - Rule form: checkbox enable + severity select per rule, field errors, Save (toast; no page refresh, counts stay stale).
3. Board changes: two tabs with own numbers ("ข้อมูลไม่ครบ 1,214" / "สถานะไม่สอดคล้อง รอตรวจสอบ 37"); StatStrip replaced by a
   distribution bar (per-rule counts that sum to the total); one card per rule with switch + segmented severity
   (เตือน/เร่งด่วน) inside; off rules dim with no count; newly-enabled-unsaved rule says "นับหลังบันทึก"; count is the
   link "ดูทรัพย์สิน N รายการ"; bottom form removed; sticky save bar "ปิด → เปิด · กฎที่เปิด 4 → 5", cancel + "บันทึกกฎ".
   Second tab content not drawn (keep workspace as-is).
4. Not in code: tab split (URL param), sticky bar dirty summary, refresh after save, skipping counts for disabled rules
   (or just hiding them). No migration, no new API.
5. Risks: saving rules = settings PUT (hazard) → only unit tests; scan/resolve/dismiss write to dev DB (resolve changes asset
   status) — E2E should not press them or must use dedicated fixture assets. Rule counts are 6 COUNT queries over assets
   on every load (unchanged).
6. Questions: should the pending-review count show on the tab even for viewers without `setting:edit`? Should the brief's
   "ข้อมูลซ้ำ" (duplicate detection) be a future feature, or is "สถานะไม่สอดคล้อง" the final second tab?

## 4. AD-Storage -> /admin/storage

1. Route `[pages]/admin/storage/page.tsx` (295; server). `src/components/admin/storage-archive-button.tsx` (47),
   `src/lib/storage-governance.ts`, API `api/admin/storage/archive-orphan/route.ts` (81, setting:edit; refuses 409 if an
   active attachment points at the path; moves file to `.archive/<date>/…`; audit log `storage_archive_orphan_file`).
   Gate page `setting:view`; archive button only with `setting:edit`.
2. Current features: StatStrip (active files + inactive foot, total size, large files ≥10 MB, review-needed with attention);
   dry-run panel with matched/orphan/missing counts and an actions table (first 10, silently cut) — orphan row has
   "Archive" button with confirm dialog naming the file, missing row badge only; module breakdown table (count, size);
   review list (duplicate path / empty path, first 20, shows module + raw referenceId + path); largest files table (top 10).
   Page loads ALL attachments and scans the whole upload dir on every view.
3. Board changes: header shows the upload folder; 4 stat tiles with breakdown "หลุด 24 · หาย 4 · path ซ้ำ 2 · path ว่าง 1";
   equation line "2,864 = 2,840 + 24"; filter chips ทั้งหมด/ไฟล์หาย/ไฟล์หลุด with counts; missing files first; one-line
   ellipsis filename + folder; "ที่มา" column with Thai folder/module names; missing rows: asset name + tag + "เปิดทรัพย์สิน",
   "ตรวจสอบเท่านั้น"; orphan rows: outline "ย้ายไปที่เก็บถาวร"; expand row → path relative to upload root, copy-path button,
   archive destination preview, "ไม่มีรายการใดอ้างถึง"; "แสดง 8 จาก 28 · ดูทั้งหมด"; module table with share bars + total
   row and Thai labels for signature/photo modules; duplicate/empty path list shows asset name + tag (and "ชี้ไฟล์เดียวกับรายการบน");
   largest files show module · asset · date. Thai words replace Dry-run/flag/Archive.
4. Not in code: Thai `moduleLabel` for checkout_receiver_signature, checkin_*_signature, checkout_photo_before,
   checkin_photo_after, disposal_batch (returns raw code today); resolving attachment referenceId → asset (per module:
   checkout/checkin ids → asset) for names/links; archive destination preview (compute same rule as server, may differ if
   name collision adds suffix); show-all (URL param or client expand); filter chips; copy button. No migration, no new API.
5. Risks: archive moves real files on the server — keep confirm dialog, server 409 check, setting:edit gate; E2E cannot
   call `/api/admin/storage/*` (hazard) — UI checks only up to the confirm dialog, cancel. Board text says "ย้ายกลับได้"
   but there is NO restore in the app (manual on the server) — copy must not promise an in-app undo. Showing the absolute
   upload root in the header exposes a server path (readiness already shows UPLOAD_DIR to the same gate). Full-table load
   + directory scan per view gets slower as files grow (show-all makes rendering bigger).
6. Questions: OK to show the server upload folder path on the page? Should "ย้ายกลับได้" stay (needs an in-app restore = new
   API + audit) or be reworded to "ผู้ดูแลเซิร์ฟเวอร์ย้ายกลับได้"? Show-all: paginate or render all?

## 5. AD-Integrations -> /admin/integrations

1. Route `[pages]/admin/integrations/page.tsx` (79; server shell). `src/components/admin/IntegrationClientManager.tsx`
   (840, client; loads via GET `/api/admin/integration-clients`). APIs: list/create (60), `[id]` PATCH (53), `[id]/rotate`,
   `enable`, `disable` (41 each), all `setting:edit` except GET (`setting:view`). Model `IntegrationApiClient`
   (createdBy/updatedBy are plain id strings, no relation; lastRotatedAt, lastUsedAt/Ip exist). Usage from last 5,000
   `integration_api` system logs (`src/lib/integration-client-operations.ts`).
2. Current features: summary (active, disabled, last used); create form panel above the list (client ID, display name,
   3 scopes asset:read / reference:read / integration:read, validation + field errors); one-time token panel (warning, copy
   token, acknowledgement checkbox gates "dismiss"); client list (table + mobile cards): name, status, scopes, token preview,
   last used, operations panel (24h, 7d, errors 7d, top endpoint, latest error, Copy PowerShell example); row actions:
   Edit (dialog: display name + scopes; confirm on scope expansion), Rotate (destructive confirm), Disable (destructive
   confirm) / Enable (confirm); empty state; load/action errors. No delete/revoke (disable is the revoke).
3. Board changes: header actions "ประวัติการเรียกใช้" (→ logs filtered integration_api) and "สร้าง client" (opens side panel);
   4 tiles incl. "Client ที่เคยถูกใช้" and "การใช้งาน · 7 วัน N ครั้ง · Error N"; status filter chips with counts; row:
   display name first + client ID mono + created date + creator; "ใหม่" highlight after create; Thai scope badges; token
   preview masked "ams_••••…••••"; last used + 7-day count + error badge; one row button "แก้ไข", ⋯ menu with Copy
   PowerShell, เปลี่ยน token…, ปิดใช้งาน… (red, separated; confirms kept); "เปลี่ยน dd/mm" (lastRotatedAt) under token;
   hash note under table; side panel after create collapses step 1 to a summary and shows the one-time token with copy +
   acknowledgement gate. 24h, top endpoint, latest error not drawn (assumption: move to row detail or logs).
4. Not in code: creator display name (needs user lookup by `createdBy` id), "used ever" count (derive from lastUsedAt),
   7-day totals in summary (sum existing operations), status chips, per-client history link (`buildSystemLogRecordHref`
   with recordId = clientId works). No migration, no new API (optional: include creator name in the GET DTO).
5. Risks: one-time token must stay in memory only, never logged or re-shown; rotate/disable kill live integrations — keep
   confirms. E2E: the whole client GET is a hazard → page shows a load error under E2E; only static parts testable unless
   the suite fulfils the GET with fake data (needs a hazard-policy decision). Dropping 24h/top endpoint/latest error from
   the row loses existing info — must land somewhere (keep-existing-features rule).
6. Questions: where do 24h count, top endpoint and latest error go (row expand vs. logs only)? Mask the token preview fully
   (board) or keep the real first/last-4 preview (helps match a token on the other system)? May E2E fulfil the clients GET
   with fake data, or stay untested in the browser?

## 6. AD-Readiness -> /admin/readiness

1. Route `[pages]/admin/readiness/page.tsx` (211; server). `src/lib/production-readiness.ts` (408; 16 checks with
   status pass/warning/fail, value, optional href). Gate `setting:view`. Reads env (AUTH_*, DB_*, UPLOAD_*, tokens,
   BACKUP_*), settings, approver matrix, master-data counts, PWA files.
2. Current features: StatStrip total/pass/warning/fail; 16 cards (title, description, status badge, value in a tag, fix text
   or action link to settings tab / approvals / users / data-quality); scope info notice.
3. Board changes: "ตรวจเมื่อ" timestamp; "ขั้นถัดไป" card listing the fail items with what to do and that they need a server
   admin + restart; filter chips ต้องแก้/ควรตรวจ/พร้อม with sum line; 4 groups (การเข้าระบบและผู้ดูแลระบบ · สำรองข้อมูลและ
   งานตามเวลา · ป้าย QR ขั้นตอนงาน และข้อมูลหลัก · ไฟล์และการติดตั้งแอป) each with its counts, sorted fail→warning→pass;
   table columns สถานะ / รายการตรวจ (+ Thai impact sentence) / ค่าที่ตรวจพบ (Thai, e.g. "ตั้งแล้ว 4 จาก 4 ค่า",
   "ระบบไม่แสดงค่าคีย์") / แก้ที่ไหน (env var names + "แล้วรีสตาร์ตแอป", or link to the matching settings tab);
   master data links to master data (today data-quality); scheduler-token row names WHICH token is missing; scheduler runs
   per job in Thai; upload scanner "ตั้งแล้ว · หมดเวลา 30 วินาที"; backup row cites docs/09_BACKUP_RESTORE_RUNBOOK.md (exists).
4. Not in code: group mapping, ordering, chips (UI only); structured values instead of English strings ("configured",
   "needs review", "no runs yet", "x/y assets"); per-token configured flags (booleans only); env-var names per check. No
   migration, no API.
5. Risks: must never print secret values (AUTH_SECRET, DB_PASSWORD, tokens) — only configured/not; AUTH_URL values are
   shown today (not secret). Read-only page: E2E-safe, but results depend on the dev server env (assert structure, not statuses).
6. Questions: none blocking. Optional: should the "ขั้นถัดไป" card also list ควรตรวจ items or only ต้องแก้?

## 7. AD-ApprovalHistory -> /admin/approvals/history

1. Route `[pages]/admin/approvals/history/page.tsx` (337; server) — the right existing page (the inbox
   `[pages]/admin/approvals/page.tsx`, 553 lines, is out of scope; it keeps its own history link). Helper
   `src/lib/approval-decision-log.ts` (190). Gate: signed in + `canAnyApproval`, else 404; repair-close history only with
   `maintenance:edit`. Data = SystemLog decisions (shares `system-log-record-labels` and logs translations).
2. Current features: back link to inbox; StatStrip total/approved/rejected/closed(close+execute); module tabs
   (ทั้งหมด/ตัดจำหน่าย/ซ่อมบำรุง/ตรวจนับ) and decision tabs (ทั้งหมด/อนุมัติ/ปฏิเสธ/ปิดงาน/ดำเนินการ) with counts over
   everything the viewer may see; timeline rows (icon, module chip, decision badge by `decisionTone`, record link, summary,
   actor, time, `<details>` before/after + remark); filtered count; pagination 25/50/100; empty state; last-page redirect.
3. Board changes: StatStrip removed (chips carry the numbers); module order ตัดจำหน่าย/ตรวจนับ/ซ่อมบำรุง; NEW actor filter
   (ผู้ตัดสินใจ) and date range; rows grouped under day headings (วันนี้ / เมื่อวาน / date); record line shows doc number +
   asset name before tag; decision label + time on the row; expanded detail with Thai field names/values and an "open
   record" link (เปิดรายการไม่ตรง); breadcrumb งานรออนุมัติ › ประวัติการตัดสินใจ; "กลับไปงานรออนุมัติ" button.
4. Not in code: actor and date filters (where clause + counts must respect them or not — decide), day grouping (UI),
   Thai field labels (reviewStatus, findingType, values) shared with logs presenter. No migration, no API.
5. Risks: counts semantics change if chips follow the actor/date filters; denial is 404 not the denied page (see §8).
   Read-only: E2E-safe (existing `e2e/approvals/approvals-inbox.spec.ts` area).
6. Questions: should chip counts follow the actor/date filters (board shows totals = list count)? Actor list: everyone who
   ever decided, or current approvers only?

## 8. AD-Denied -> /access-denied (+ requirePagePermission)

1. Page `[pages]/access-denied/page.tsx` (56; server). `src/lib/page-auth.ts` `requirePagePermission(locale, module, action)`
   redirects to `buildAccessDeniedHref` (`src/lib/access-denied.ts`) → `/access-denied?module=&action=`. Used by 83 page
   files. Approvals inbox/history use `notFound()` instead. `src/proxy.ts` stamps the request path header (`requestPathHeader`).
   Tests touching it: `tests/asset-register-ux.test.ts`, `tests/e2e-cross-cutting.test.ts`, `tests/list-pages-ui.test.ts`.
2. Current features: ActionEmptyState tone permission, title, description, neutral notice "สิทธิ์ที่ต้องใช้: module:action"
   (raw code), primary "กลับหน้าแรก" → `getDefaultHomeHref` (my-assets for employee-home users, else dashboard),
   outline "เปิดศูนย์งานค้าง" only with `dashboard:view`.
3. Board changes: names the blocked page (ศูนย์งานค้าง); permission in Thai ("ดู · แดชบอร์ด"); "บทบาทของคุณ: พนักงาน";
   reassurance copy (nothing lost, nothing saved); IT Helpdesk contact box (phone + email); secondary "กลับหน้าก่อน"
   (history back); line "หน้าแรกของคุณ: ทรัพย์สินของฉัน"; work-center button only when allowed (kept); employee shell shows
   only allowed menus (sidebar already filters; topbar search/bell hidden for no-asset users is a separate shell item).
4. Not in code: blocked-page identity — `requirePagePermission` must add e.g. `from=<path>` (read from the proxy header)
   and the denied page maps path → menu title; Thai permission words from `adminRolesPage` actions/modules; role display
   names (Role.displayNameTh lookup); IT Helpdesk phone/email = NEW `system_settings` keys + a settings field (none exist);
   client "back" button. No migration.
5. Risks: `from` is display-only — validate it is an internal path, never use it as a redirect target (open redirect);
   central change to all 83 gated pages (one file) — run the full suite. Helpdesk keys need a settings save to fill (E2E
   cannot save settings; seed/dev value by hand). Board is desktop only.
6. Questions: what are the real IT Helpdesk phone/email (or leave the box out until set)? Should approvals inbox/history
   (404 today) also use the denied page? Show the user's role names when they hold several roles — all or primary?

---

## Suggested split into plans

Order by risk (security/secrets first per project priorities), each plan small enough for one review:

1. **Plan 1 — Denied page + readiness** (small, low risk, read-only, E2E-safe): `from` param in `requirePagePermission`,
   Thai permission/role/page names, back button, helpdesk keys (+ field on settings organization tab, only if PO gives
   values); readiness regroup/sort/chips/Thai values/env-var names. Needs PO answer on helpdesk.
2. **Plan 2 — Logs + approval history** (medium; shared presenter): Thai selects, user + date filters, record search
   (as decided), 5-column table with expand rows, null-user label, buildSummary/field-label fixes, day grouping and actor/
   date filters on history, StatStrip removal, link between the two. Needs PO answers on default range and search scope.
3. **Plan 3 — Data quality + storage** (medium; storage touches a destructive action): DQ tabs, rule cards with switch +
   segmented severity, sticky save bar, refresh after save; storage chips, show-all, expand rows, copy path, referenceId →
   asset resolution, Thai module labels, distribution bars. Archive API untouched.
4. **Plan 4 — Integrations** (medium; secret token handling): side-panel create flow, ⋯ menu, chips, creator name, tiles,
   history links; decide where 24h/top endpoint/latest error live. E2E limited by the GET hazard.
5. **Plan 5 — Settings** (largest, highest risk; LDAP bind password): left grouped nav with summaries and dirty badges,
   changed-field markers, secret replace-mode, Thai review table, reset, counted save button, LDAP sync gating while dirty
   (+ optional apply confirm / persisted test result). Do it last or as its own plan with a full dry run; consider
   splitting nav/summary (5a) from LDAP secret + sync behaviour (5b).

## Restyle vs. real feature work

- Mostly restyle (UI-only, data already there): **Readiness**, **Data quality**, **Integrations** (plus a small DTO
  addition for creator name), **Approval history** layout.
- Restyle + modest logic: **Storage** (referenceId → asset resolution, archive-path preview, show-all), **Denied page**
  (`from` param, Thai mapping, new helpdesk setting keys).
- Real feature work: **Logs** (user/date/search filters, summary rewrite, query performance), **Approval history**
  actor/date filters (shared with logs), **Settings** (2,612-line form re-layout, secret replace flow, sync gating,
  optional persisted test result / apply confirm).
- No Prisma migration is required by any board; only new `system_settings` keys (helpdesk; optional LDAP last-test).
