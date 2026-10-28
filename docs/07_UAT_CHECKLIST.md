# UAT Checklist

Use this checklist with realistic master data and at least one asset in each important ownership/status case. Record test evidence, tester, date, and issue links outside this file according to the organization's UAT process.

## system_admin

- [ ] Open `/{locale}/admin/data-quality`, run **Scan now**, and confirm the queue shows current status, condition, custodian, issue label, severity, and last-detected time without changing any asset automatically.
- [ ] Resolve a `personal_ready_with_custodian` review to `In Use` with a reason of at least 10 characters; confirm Asset Detail, Asset Movement (`state_review_resolution`), System Log (`asset_state_review_resolve`), and the resolved queue agree.
- [ ] Open a pending review in two sessions, change the asset in one session, then resolve from the older session; confirm the API returns the stale-review conflict and no partial movement/audit/review update is committed.
- [ ] Dismiss a confirmed false positive with a reason, confirm the asset is unchanged, and verify a later scan suppresses the same dismissed snapshot but reopens the issue after the asset snapshot changes and the inconsistency still exists.
- [ ] At 390px and desktop width, confirm the review queue uses mobile cards/desktop table, has no body-level horizontal overflow, keeps controls at least 44px on mobile, traps/restores dialog focus, and exposes Thai/English labels without relying on color alone.

- [ ] Login successfully.
- [ ] On Login at 390px and desktop, in both themes, confirm the navy backdrop (navy in light and dark alike), the card on the surface tokens with its accent line on top and no shadow, and the real application icon in the brand header, with no horizontal overflow at 390px or on desktop.
- [ ] Confirm the hint under the title reads "ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับที่เข้าเครื่องคอมพิวเตอร์ของบริษัท" and that the page has no IT Helpdesk block.
- [ ] On desktop, turn Caps Lock on while the password has focus and confirm "Caps Lock เปิดอยู่" shows under the password; it goes when Caps Lock is off or the password loses focus.
- [ ] Let a session expire on a page (or open Login with `?reason=session-expired&callbackUrl=/th/assets`) and confirm the line "เข้าแล้วจะไปที่ …" names that page; sign in and confirm you land there.
- [ ] Use the language links (ภาษาไทย / English): the page switches language, keeps the destination, and the current language is not a link.
- [ ] Confirm the "ระบบทดสอบ" pill shows on UAT/dev (a database other than `asset_management`) and that Production shows none.
- [ ] Confirm Username and Password have associated accessible labels, password-manager autocomplete values (`username` / `current-password`), 44px mobile targets, and 16px mobile input text. Toggle Eye/EyeOff and confirm the password remains focused and the value does not change.
- [ ] Submit invalid credentials and confirm the username remains, password clears, focus returns to Password, the generic error is announced, and editing either field clears the stale error. Confirm loading copy and `aria-busy` are present while authentication is pending.
- [ ] Open Login with `?reason=session-expired` and confirm the localized session-expired status appears. After a valid login with a same-locale `callbackUrl`, confirm navigation returns there; external, protocol-relative, backslash, cross-locale, and malformed callback values must fall back to the role-aware locale home.
- [ ] Open Admin Settings.
- [ ] Switch between System Settings tabs, refresh the page, and confirm the selected tab is restored from the `tab` URL query without losing other query values. Change a safe setting, then attempt to close/refresh the browser and confirm the standard leave warning appears only while unsaved changes exist.
- [ ] Search System Settings by a known key, description keyword, and section name. Open a result and confirm it returns to the matching existing tab without discarding unsaved form values. Change a safe setting, use its link in `ตรวจทานก่อนบันทึก`, and confirm the same tab navigation works.
- [ ] Open Company, Branch, Location, Employee, and Supplier lists and confirm page content does not repeat a partial master-data tab strip. Navigate between modules through the Sidebar on desktop and the More menu on mobile, while each list retains its own URL-backed filter/pagination behavior.
- [ ] Open Supplier at 375px and desktop. Confirm mobile shows supplier cards and compact horizontally scrollable summaries with no page-level horizontal overflow, while `md+` shows the sortable semantic table with visible keyboard focus and no permanently active status column.
- [ ] Search Supplier for a value with no matches and confirm the filtered empty state offers clearing the filters; open an unfiltered empty state and confirm it offers creating a supplier when permitted.
- [ ] Create/edit a supplier with invalid email and overlong contact, phone, or address values. Confirm inline localized errors are announced, controls remain at least 44px high, duplicate code returns a field-level message, and leaving a dirty form asks for confirmation.
- [ ] Edit a supplier that already has linked records and confirm a routine contact/address change succeeds. Then confirm deactivation and deletion are blocked while any active asset, maintenance ticket, PM plan, or purchase document references it, with a readable relationship summary.
- [ ] Open Supplier detail at 375px and desktop. Confirm metrics use a mobile horizontal strip, purchase documents use labelled mobile cards below `md` and a table at `md+`, Back/Edit/linked-record actions are keyboard visible and at least 44px, and returning preserves the originating Supplier list URL.
- [ ] Update a safe non-secret setting and confirm audit log entry.
- [ ] Review system logs and readable before/after details.
- [ ] Review readiness checks.
- [ ] Review storage governance summary.
- [ ] Create or edit a role permission set.
- [ ] Confirm a user without admin permission cannot access admin menus.
- [ ] Confirm AD/LDAP Login default role selector shows active roles and warns if the saved role key is missing.
- [ ] Confirm topbar avatar/name match the signed-in admin user.

## asset_admin / IT Staff

- [ ] After applying `2026-08-27-add-reversible-asset-transactions.sql`, create one Check-out, one Check-in, and one Transfer. Confirm each document stores an active transaction and its print page shows **ยกเลิกรายการ** only to a user with `asset:edit`.
- [ ] From Asset Detail > "อื่น ๆ" (on the phone "การดำเนินการอื่น" in the bottom bar), cancel the latest transaction with a reason of at least 5 characters. Confirm preview values, restored status/location/custodian/department/condition/component state, `VOID` document banner/watermark, compensating Asset Movement, and System Log all agree.
- [ ] Cancel a latest Check-in and confirm its related Check-out becomes open again; then complete a corrected Check-in and confirm the VOID Check-in remains readable while only one active Check-in exists.
- [ ] Attempt cancellation after changing the asset, changing an installed component, or creating a newer/downstream transaction. Confirm no partial asset/component/document changes occur and a pending `transaction_cancellation_blocked` review appears in Admin > Data Quality.
- [ ] Open a legacy Check-out/Check-in created before snapshot support and confirm automatic cancellation is blocked as `unsupported_snapshot`; resolve it through controlled review instead of editing lifecycle state directly.
- [ ] With an `asset:view` user who lacks `asset:edit`, confirm VOID documents remain readable/printable but cancellation actions and APIs are unavailable.
- [ ] Add a single asset.
- [ ] On single asset create/edit, scroll through the long form and confirm Save/Cancel remain visible in the fixed bottom action bar without covering the final fields.
- [ ] Clone an existing asset from Asset Register or Asset Detail, confirm the create form shows the clone banner, copies shared details, and leaves Asset Tag, Serial Number, and FA/accounting code blank before saving.
- [ ] From General Asset Scan, open a recognized QR/manual result, then use Asset Detail Back and confirm it returns to the same scanner rather than resetting to Asset Register. Confirm an externally supplied `returnTo` cannot send the user outside the approved asset/scan routes.
- [ ] Add assets by batch with shared values only, then repeat with optional row columns enabled for custodian, department, current location, home location, and remark; confirm blank row overrides use the shared values while filled row overrides save per asset.
- [ ] On single and batch asset create/edit, enable cross-branch location mode, choose a home/current location under a different branch, confirm the warning appears, branch labels distinguish repeated location codes, and the generated Asset Tag still follows the owner company/branch.
- [ ] Create a new asset category with no custom-field template and confirm it saves without a Prisma nested-write error.
- [ ] Enter a manual asset tag for a legacy asset.
- [ ] Leave asset tag blank and confirm auto-generation.
- [ ] Import assets from Excel.
- [ ] Export asset register.
- [ ] On Asset Register, confirm quick filters are grouped by data quality, ownership/custody scope, and lifecycle status; the lifecycle group includes Ready, In Use, Checked Out, Pending Repair, and Under Maintenance, and each filter updates the list while preserving existing search/company/branch/category context.
- [ ] On Asset Register, apply cross-scope quick filters for all cross-scope, custodian different company, custodian different branch, and current location different branch; confirm the list and Asset Register export show matching cross-scope flags and owner/custodian/location branch context.
- [ ] On Dashboard, confirm the number of assets outside the owner's scope appears once, under the status table ("นอกขอบเขตเจ้าของรหัส N รายการ"), and opens Asset Register with `crossScope=all` and the same count; the four cross-scope quick filters stay on Asset Register.
- [ ] On Asset Register desktop width, confirm search/company/branch/category remain visible as primary filters and status/condition/ownership/rows are hidden under the advanced filter section by default, reopening automatically when active.
- [ ] On Asset Register mobile width, confirm quick-filter groups scroll horizontally without page overflow, advanced filters stay collapsed by default, desktop column/export/template utility buttons are hidden, and the first asset cards appear before the import helper.
- [x] Controller `system_admin` QA at 375, 390, and 414 pixels: mobile card list only with 25 sample cards; no body/list/card horizontal overflow; readable text status and field-lookup hierarchy; company/branch and purchase price omitted; secondary disclosure opens with a full-width 44px summary; filtered-empty state shows `ไม่พบข้อมูล` without overflow.
- [x] Controller `system_admin` QA at 768, 1280, and 1440 pixels: dense desktop table only with no body overflow.
- [x] Controller `system_admin` QA: mobile search form appears before quick filters (top 249 versus 568 at 375), while desktop quick filters remain before the form (top 185 versus 447 at 1280).
- [ ] On Asset Register with a permission-limited role, confirm card/table actions and empty states retain the appropriate operational visual vocabulary.
- [ ] On Asset Register, verify loading/navigation states directly at mobile and desktop breakpoints.
- [ ] From Category, Brand, and Brand/Model master data counts, click model/asset counts and confirm the destination opens the expected Brand/Model workspace or Asset Register drilldown with a removable active filter chip where applicable.
- [ ] Search Asset Register by the current custodian's employee code and confirm only assets held by that employee are returned; do not expect matches from repair reporter/assignee history.
- [ ] Confirm Asset Register starts with the Operations table preset before browser preferences are saved, then column presets switch between All, Operations, Accounting, and Audit views and persist after page reload in the same browser.
- [ ] Confirm the Asset Register import helper appears after the table/card list, starts collapsed, and opens only after clicking the import helper button.
- [ ] Print QR labels.
- [ ] Scan QR and open asset detail.
- [ ] On Asset Detail, open old links: `#photos` and `#purchase` from reports land on the ไฟล์ tab and on "ข้อมูลทรัพย์สิน"; `?view=custody`, `?view=operations` and `?view=audit` land on the ส่วนควบ tab, the ประวัติ tab, and the ประวัติ tab with the ตรวจนับ chip chosen.
- [ ] On Asset Detail, switch between ภาพรวม, ประวัติ, ส่วนควบ, ไฟล์ and ซ่อม / PM; confirm one tab row, each tab's count with 0 shown (history events, components plus parent, files, active repair records), and that the URL keeps `?view=` and `returnTo` with no `#` anchor. Run checkout, check-in, and transfer once each and confirm a review dialog shows the asset, destination/counterpart, resulting status, and evidence summary before the existing save request is sent.
- [ ] On Asset Detail mobile, confirm the sticky bottom bar on every tab, for every person, holds exactly the primary action (wide), "บันทึกซ่อม" when the repair rule allows it, and "การดำเนินการอื่น", whose bottom sheet lists the "อื่น ๆ" items, each unavailable one with its reason, and ends with "แก้ไข" and "พิมพ์ป้าย"; from the scan page the bar holds "สแกนรายการถัดไป" (wide), the primary, then "การดำเนินการอื่น" ("บันทึกซ่อม" moves into the sheet); a viewer's bar holds only "การดำเนินการอื่น", with "พิมพ์ป้าย".
- [ ] On Asset Detail at 390px, confirm the first viewport shows the back link, the tag (with "k / N" and the next link when opened from the register), the status badge, the name and the tabs, then the fact strip and the รูป card first. Confirm the icon-only Back action has an accessible name and the bottom bar's items fill it without an empty column.
- [ ] On Asset Detail mobile, switch all five tabs and confirm the active tab scrolls into view, tabs snap cleanly, and the right-edge cue disappears after reaching the final tab. Confirm there is no body-level horizontal scrolling at 390px and 768px.
- [ ] On Asset Detail Overview, confirm the follow-up panel and the data-health checklist are gone and each signal has its place: an open handover is the primary "รับคืน", an open repair the ซ่อม / PM count and the primary "ดูงานซ่อม", the warranty the ประกัน cell, the last count the ตรวจนับล่าสุด cell, a missing photo and missing purchase data their prompts (editors only). Confirm the audit result is a status badge in the round page's words ("พบตรง", "รายการไม่ตรง", "ไม่พบ"), never a raw value such as `pending`.
- [ ] On the Asset Detail ส่วนควบ tab, verify the relationship map retains parent, current asset, and child-component meaning. The current card reads "ผู้ถือครอง : …". Desktop should use three lanes; mobile should use a vertical flow with directional connectors. Confirm each relationship card is keyboard/click accessible, Asset Tags remain fully readable, the first five child rows are visible, and `ดูอีก N รายการ` reveals every remaining component.
- [ ] Switch Asset Detail between its five tabs and confirm each loads its own data only. On the ไฟล์ tab, confirm "หลักฐานจากงานอื่น" lists the handover signatures and photos, the component install and remove photos, and the repair, finding and disposal evidence, each linked to its document; the activity and evidence drawers are gone.
- [ ] From the Asset Detail ส่วนควบ tab, open `จัดการส่วนควบ`, scan a component label or search at least two characters, select a candidate, enter role/details/evidence, review, and install it. Confirm success identifies the installed Asset Tag and offers `เพิ่มส่วนควบอีกชิ้น`; returning goes to the same asset's ส่วนควบ tab (`?view=components`). Confirm a shorter search makes no candidate request, history initially shows a bounded list with `แสดงประวัติเพิ่มเติม`, and removal opens one in-app dialog with optional reason/evidence. With a view-only role, confirm install/remove controls are absent while relationship/history inspection remains available.
- [ ] On a mobile device, confirm `/th/asset-management/scan` defaults to the generic rear camera option, shows an undistorted 4:3 camera preview and smaller square QR guidance frame; center only the QR code in the frame, adjust distance until the QR is sharp, and confirm the scanned asset detail opens. On supported devices, confirm flashlight plus 1x/2x/3x zoom controls appear inside the existing preview, 1x returns to unzoomed without closing the camera, and unsupported devices hide unavailable controls. Asset QR mode should decode from the native-resolution video frame through ZXing without native `BarcodeDetector`, `html5-qrcode` CSS-pixel canvas downsampling, or mirror-flip retries.
- [ ] Confirm Serial Number scanner inputs scan manufacturer QR/barcode labels with the 16:9 scan-line guide, native-resolution ZXing multi-format decoder, optional browser `BarcodeDetector` fallback, focused internal scan-band crops, and direct crop `ImageData` ZXing fallback; center the barcode band on the line, make the bars fill most of the frame, and adjust distance until the lines are sharp.
- [ ] Check-out an asset.
- [ ] Check-in an asset.
- [ ] For a legacy/imported `Ready` or `In Use` asset that has a current custodian but no open checkout or unfinished repair record, type its Asset Tag or the holder's name in the Check-in asset field, pick its `ข้อมูลเก่า (ไม่มีใบส่งมอบ)` row, confirm "สร้างใบส่งมอบย้อนหลังแล้วรับคืน" once, and complete the normal return form; confirm the activity/audit history includes `legacy_return_backfill`.
- [ ] Record an unfinished repair ("ยังซ่อมไม่เสร็จ") by mistake on an `In Use` personal asset, then press "ยกเลิกบันทึก". Confirm the record becomes `cancelled`, the asset returns to `In Use`, the "ยังซ่อมไม่เสร็จ" counts exclude it, and the asset shows as a takeable ข้อมูลเก่า row in the Check-in asset picker. Confirm a finished record offers no cancel action.
- [ ] Transfer a `Ready` asset to a destination custodian and confirm the review shows `ใช้งานอยู่ / In Use`, the save does not ask the operator to select a status, Asset Detail shows `In Use`, and movement/audit history contains the before/after status. Repeat with a location-only or department-only transfer and confirm the existing status is preserved.
- [ ] On Maintenance, filter by status (ยังซ่อมไม่เสร็จ / ซ่อมเสร็จแล้ว / ยกเลิก), date range, and search; confirm invalid date ranges show feedback, legacy statuses (`reported`, `waiting_parts`, `completed`, ...) appear under ยังซ่อมไม่เสร็จ, and opening a record then Back returns to the same filters.
- [ ] Using keyboard only, open the "ซ่อมเสร็จ", "ยกเลิกบันทึก", "แก้ไขรายละเอียด", attachment-delete, and PM state dialogs; verify initial focus, Tab containment, Escape dismissal when not saving, focus restoration, visible focus rings, and 375px mobile layout with 44px buttons and no body overflow.
- [ ] Open "แก้ไขรายละเอียด" on a record, change date/problem/vendor/cost/invoice/remark, and confirm the record status, outcome, and asset status do not change. Submit a stale edit after another operator changed the record and confirm the localized conflict message (`MAINTENANCE_CONFLICT`) appears without a partial update.
- [ ] Try to record a repair on an asset that already has an unfinished record and confirm the message links to that record (`MAINTENANCE_OPEN_RECORD_EXISTS`). Try a `Checked Out` asset with "ยังซ่อมไม่เสร็จ" and confirm "กรุณาบันทึกคืนก่อน" (`MAINTENANCE_ASSET_ON_LOAN`). Try a Disposed asset and confirm `MAINTENANCE_ASSET_WRITTEN_OFF`.
- [ ] On Disposal, verify pending requests offer only the review action to approvers, approved requests offer only actual-execution action to permitted operators, and completed/rejected requests offer a detail link. Confirm this does not bypass the existing approval or execution forms.
- [ ] As a normal permitted executor without `system_admin`, attempt to execute an approved historical request with no evidence. Confirm the normal evidence requirement blocks execution and the historical-evidence exception cannot be authorized.
- [ ] As `system_admin`, execute an approved historical request with no item or shared batch evidence using a reason of at least 20 characters and the acknowledgement. Confirm the request still observes approval, execution permission, SOD, disposal-type fields, and the final Disposed/Retired status rule.
- [ ] For a request with item evidence and for a batch child with shared batch evidence, attempt the historical-evidence exception. Confirm both attempts are rejected and ordinary evidence-backed execution remains available.
- [ ] After a successful historical-evidence exception, open the completed disposal detail and its print view. Confirm both show the historical-evidence exception, reason, granting user, and grant time.
- [ ] Inspect the disposal audit log for the successful exception. Confirm it records the distinct historical-without-evidence execution action, effective evidence count, reason, granting user, and grant time.
- [ ] Upload and preview asset evidence.
- [ ] On Asset Detail, confirm the รูป card shows the asset's main photo (the newest image the thumbnail route can render) at card size from the thumbnail route (else the model photo labelled "รูปประจำรุ่น", else "ยังไม่มีรูป รูปช่วยให้หาเจอตอนเดินตรวจนับ"), a click opens the preview of the original, and a missing file shows "โหลดรูปไม่ได้"; for editors only, the card links to the ไฟล์ tab as "อัปโหลดรูป" (on the phone "ถ่ายรูป"). On the ไฟล์ tab, preview, download, and delete of photos and documents (editors, through the confirm) stay available.
- [ ] On Asset Detail, confirm "อื่น ๆ" holds no activity or evidence drawer: the ประวัติ tab is the place for event history and the ไฟล์ tab for files.

## auditor

- [ ] Create or open an assigned audit round.
- [ ] On `/th/audit/rounds/new`, add conditions as chips through "+ เพิ่มเงื่อนไข" and confirm the summary panel "ขอบเขตนี้ได้" counts by itself (no "ดูตัวอย่าง" button), with "ตรงเงื่อนไข X · สุ่มได้ Y" below 100%, the components note, the largest categories, the overlap warning and "ดูตัวอย่างรายการ", before "สร้างรอบ".
- [ ] Create an audit round where a selected parent asset has installed components; confirm the summary panel shows the components pulled in and the created round has separate audit items for the parent and components.
- [ ] Scan the parent asset and confirm the scan page shows installed components with their own statuses. Confirming a component with parent should save immediately without requiring a note, update only the component audit item, and show `ยืนยันกับทรัพย์สินหลัก`. For a component that cannot be scanned, tap `ไม่พบ` and confirm an in-app dialog opens, allows saving without a remark, optionally accepts an evidence photo, and creates/updates the component not-found finding for review.
- [ ] Move or transfer a parent asset with installed components and confirm active installed components receive supported field updates plus component movement rows.
- [ ] Scan an expected asset.
- [ ] On a mobile device, confirm `/th/audit/rounds/{id}/scan` can scan the same printed Asset Label QR, pauses the camera after the QR read, locks the selected audit item with the `ล็อกเป้าหมายแล้ว` badge, keeps the raw QR URL only in the latest-decoded panel, and does not navigate away from the audit workflow.
- [ ] After selecting an audit asset, confirm the sheet is titled with the asset's name (wrapping on a long name) with "รหัส · Serial …" under it, and shows one row per compared field with the system's value and ตรง / ไม่ตรง: ที่ตั้ง (none for a software licence), ผู้ถือครอง (personal assets only), แผนก and สภาพ.
- [ ] On a mobile device, confirm the sticky progress header is the only progress summary, shows the full compact progress bar before selecting an asset, collapses to a shorter checked/total + pending + photo strip after selecting an asset, and that the old metric-card row is not repeated below it.
- [ ] Before selecting an item, choose a Location and Department work area. Confirm the pending quick queue, initial manual picker, and progress count use that work area, the selection returns after browser reload for the same audit round, clearing it restores round-wide counts, and direct QR/manual lookup still resolves items from the full current round.
- [ ] Before scanning or selecting an asset, confirm the scan/manual entry panel is the most prominent area and includes short helper copy for starting the audit scan.
- [ ] Tap `คิวรอตรวจ {count}` from the sticky header and confirm a collapsible inline pending queue preview opens from the same audit round. Confirm each pending card shows expected location plus custodian/department where applicable. Collapse and reopen the queue, then select an item and confirm it loads for review while marking not found still happens from the full pending list/zone queue. Open the full pending list and confirm `กลับ` returns to the scan page that launched it. On mobile, confirm the full pending list can search by Asset Tag/name/location/custodian and each card has clear actions to scan that item, view the asset, or mark not found.
- [ ] Without scanning, type at least two characters such as part of an Asset Tag into the manual scan input and confirm suggestion cards appear from the current round by Asset Tag/name/location/custodian/department. If multiple cards match, the manual action should ask the user to choose one; QR scan behavior must still resolve only exact QR/Asset Tag values.
- [ ] Open the manual item picker and confirm it is collapsed by default, searchable by Asset Tag/name/location/custodian/department, and does not show the old long native asset dropdown.
- [ ] Confirm the Audit Scan camera section does not show normal `สถานะกล้อง` / `พร้อมเปิดกล้อง` text or camera selector controls before scanning; camera utilities should appear only while scanning, after a decoded QR reference exists, or when a camera issue is shown.
- [ ] On a supported mobile device, start the Audit Scan camera in a low-light area and confirm the flashlight button appears, can toggle on/off, and turns off after closing the scanner or switching cameras. On unsupported devices, confirm the flashlight control is hidden instead of disabled noise.
- [ ] On a supported mobile device, start the Audit Scan camera and confirm 1x, 2x, and 3x zoom buttons appear inside the existing scanner preview. Tap 2x/3x to enlarge the QR, then tap 1x and confirm the preview returns to unzoomed without closing the camera or exposing a separate scan mode. On unsupported devices, confirm the zoom controls are hidden instead of disabled noise.
- [ ] Confirm Fast Scan Mode and Continuous Scan are not shown as field-user switches in the normal walking UI; the page should behave as scan-first with target lock after a QR read and should not repeat the old large blue help blocks on mobile.
- [ ] Confirm the post-scan bottom action bar appears only after an asset is selected or scanned, with `บันทึกพบตรง` spanning the first row and `บันทึกข้อมูลไม่ตรง / Finding` plus `เปลี่ยน / สแกนใหม่` grouped below it. There should be no separate evidence-scroll shortcut in the bottom bar.
- [x] Controller browser QA observed one primary and one supporting region with no body overflow at 375/390/414/768/1280/1440. At 375, the Recent Scans header was readable at 284px by 86px; at 1280, the same nodes formed a two-column form grid.
- [x] Controller browser QA observed no mobile action region in the initial state. With a selected in-round item, exactly one action region was visible at 375/390/414 with matched, mismatch/Finding, and change/rescan text only; it was hidden at 768px and above. Mobile content reserved 156px, desktop reserved 0, and safe-area action padding computed to 12px in that environment.
- [ ] Controller browser camera permission created exactly one `#audit-qr-reader` but did not provide a video stream. Validate camera, torch, and zoom on real Android and iPhone hardware.
- [ ] On Android Chrome and iPhone Safari, verify the mobile scan sequence is sticky progress, scan/manual input, locked target with system data, then decision, followed by supporting evidence/components/recent/pending/offline panels. Confirm exactly one `audit-qr-reader` camera stream is active, preview controls stay with the preview, and the action bar appears only for an in-round target without a not-found action.
- [ ] With the Audit Scan keyboard open and after device rotation, confirm the scan/manual input can be scrolled into view and the fixed action bar clears the browser safe area without covering fields, toasts, dialogs, or evidence controls. Repeat while offline with queued photos, then reconnect and retry the existing queue.
- [ ] Scan or manually enter several audit items and confirm the current `ผลสแกน` card stays focused on the current result, while the separate compact `สแกนล่าสุด` panel shows `แสดง X รายการล่าสุด` instead of `X/8`, opens the full recent-read list, and collapses to hide every recent row/edit action with readable matched/mismatch/out-of-scope/unknown/found-later/offline-queued labels when expanded.
- [ ] Record found/matched result.
- [ ] In fast walking mode, choose `บันทึกพบตรง` and confirm the result saves without requiring a photo.
- [ ] Choose `บันทึกข้อมูลไม่ตรง / Finding`, change at least one actual field, and confirm the inline evidence section appears in the mismatch flow, shows the required-photo counter, shows queued photo thumbnails with filename/tag and `จะถูกแนบกับ Finding นี้`, and blocks saving until at least one evidence photo is queued.
- [ ] Scan an asset that exists in the system but is outside the round and confirm it is shown as Out-of-scope, not as Not Found.
- [ ] Scan a printed Asset Label QR whose value is `/q/a/{assetId}` for an active asset outside the round and confirm the scan lookup resolves the asset by ID, shows the out-of-scope action card, and does not show `ไม่พบทรัพย์สินในระบบ`.
- [ ] Confirm the out-of-scope lookup itself does not create audit history/finding rows until the user confirms the out-of-scope save action.
- [ ] Scan an asset outside the audit round that has installed components, such as `SNI-EQU-20-0290` in a seeded/test environment, and confirm the out-of-scope action card shows the component panel with each component row. Component QR scan buttons should remain available, while `ยืนยันกับตัวหลัก` and `ไม่พบ` stay disabled for components that have no audit item in the current round.
- [ ] Scan an asset outside the audit round, change its actual location or custodian, attach evidence, and confirm the save creates an out-of-scope record plus reviewable field mismatch findings.
- [ ] Confirm the asset master data does not change immediately after the out-of-scope scan save.
- [ ] Scan the same out-of-scope asset again (and open it from the round page's "แก้ไขผลตรวจ"): confirm the out-of-scope sheet opens with "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้", the save keeps it out of scope (the round page's นอกขอบเขต number is unchanged and ทั้งหมด does not grow), a field changed in this save asks for a photo and creates or updates its finding, a remark-only edit saves with no new photo, and the asset's master data does not change.
- [ ] Approve the field mismatch finding as an audit reviewer and confirm the master asset data and movement log update only after approval.
- [ ] Scan or enter an unknown QR/asset code and confirm it is shown as an unknown asset/not found in system, not as a not-found audit item.
- [ ] Record not-found result from the pending list or zone queue for an expected item that cannot be physically located. On mobile, confirm the action opens an in-app dialog instead of a browser prompt, allows saving without a remark, optionally accepts an evidence photo, and creates the pending not-found Finding for review.
- [ ] If an item previously marked not found is later scanned, confirm the found-later recovery flow resolves it through the existing audit scan behavior.
- [ ] Attach multiple free-form audit evidence photos, confirm the optional tag selector includes general evidence plus checklist labels, and confirm all queued photos remain listed before saving.
- [ ] Retry offline/resume queue if available in the test device.
- [ ] Real-device follow-up: validate Android/iPhone camera permission, torch/zoom, offline-photo retry, keyboard opening, rotation, and safe-area clearance. The controller browser check is not a substitute for these scenarios.

## audit_reviewer

- [ ] Review audit findings.
- [ ] Open `/th/audit/findings` and confirm the six tabs and their counts, the "รอบ:" / "เรื่อง:" filters, the panel's system-vs-found comparison and its sentence, the evidence links, and "ส่งออก ▾" (Excel and PDF) follow the same tab and filters.
- [ ] Confirm `/th/audit/findings` shows only compact loaded-at metadata during normal use and switches to a stale-data warning after the configured stale period.
- [ ] If master asset data changes after a finding is reported, approving a correctable finding shows a conflict warning and requires explicit confirmation before applying the correction.
- [ ] Approve or reject a finding in the panel (`/th/audit/findings?finding=…`): it takes effect at once and the panel moves to the next pending finding; a reject asks for a reason.
- [ ] Confirm segregation-of-duties guard blocks self-review where applicable.
- [ ] Review round progress.
- [ ] From `/th/audit/rounds`, choose a status tab or a work-view chip and search, open round detail, open Scan and Pending from that round, then use Back and confirm the browser returns to the same round detail and filtered rounds list context.
- [ ] Close an audit round.
- [ ] Cancel a test audit round from the round detail page, enter a reason, and confirm the round shows `ยกเลิก`/read-only state. Confirm cancellation time/user/reason are visible, scan, pending, edit result, review/close actions, operational queues, and active exports no longer include that cancelled round, while historical audit items, scan history, findings, evidence, and already-applied corrections are preserved and not rolled back.

## accounting

- [ ] Review asset cost/accounting fields.
- [ ] Open `/{locale}/reports?view=accounting`, review the filtered cost/repair and depreciation/book-value metrics and rows, and confirm changing the asset filters changes the displayed accounting scope without changing formulas.
- [ ] Export only the reports permitted for this role and confirm unauthorized export/admin actions remain unavailable through both the UI and direct requests.
- [ ] On Reports, apply a filter, save it with a name, reload the page, and reopen the named preset. Confirm it is available only in the same browser/device, does not appear in another browser profile, and does not change export permissions.
- [ ] On Reports, confirm branch breakdown rows show company/branch labels clearly when branch names repeat across companies and no duplicate-key console warning appears.
- [ ] On Reports, confirm the cross-scope asset panel shows counts and preview rows for custodian/company, custodian/branch, and location/branch mismatches; open each drilldown and export Asset Overview to verify the Cross Scope sheet.
- [ ] Review disposal request financial details.
- [ ] Confirm accounting-only user cannot perform unrelated admin actions.

## department_manager

- [ ] View department assets.
- [ ] Review assets held by team members.
- [ ] Open employee profile asset summary.
- [ ] Confirm restricted maintenance/disposal/admin actions are hidden or blocked.

## employee

- [ ] Login with an employee self-service account and confirm the first page is My Assets, not the admin/global dashboard.
- [ ] View own assigned assets.
- [ ] Open My Assets and confirm only assets held by the signed-in employee appear.
- [ ] Confirm My Assets does not show purchase price, supplier, accounting, disposal, audit, or admin-only fields.
- [ ] Confirm My Assets thumbnails load for assets held by the signed-in employee even when the user does not have broad `asset:view`.
- [ ] Open `/th/dashboard` directly and confirm it redirects back to My Assets for an employee without overview permissions.
- [ ] Open an assigned asset detail and confirm the direct URL only resolves assets assigned to the signed-in employee, then returns to My Assets. Confirm the detail omits purchase price, supplier, accounting, disposal, audit, and admin-only data.
- [ ] Confirm write actions are not available.
- [ ] Confirm admin menus are hidden and direct admin URLs show the access denied page.
- [ ] Confirm an employee without `asset:view` still cannot open the full Asset Register menu.

## viewer

- [ ] Search and view permitted asset data.
- [ ] Export only if permission allows it.
- [ ] Confirm create/edit/delete actions are not available.

## Cross-Workflow Scenarios

- [ ] Add asset, print QR label, scan QR, then check-out.
- [ ] Check-out asset, check-in with `Ready`, and confirm status/timeline.
- [ ] Check-out asset, check-in with "ส่งซ่อม", and confirm the asset is `Under Maintenance` with one unfinished repair record created from the damage note.
- [ ] From Asset Detail (or by scanning the asset QR) press "บันทึกซ่อม" on a `Ready` asset, save "ซ่อมเสร็จแล้ว / ใช้งานได้", and confirm the asset status is unchanged and the record appears in the asset's repair history. Print the record and confirm the print page shows the new fields.
- [ ] Record "ยังซ่อมไม่เสร็จ" for (a) an asset with valid personal custody or an active permanent assignment and (b) an asset without custody. Confirm both become `Under Maintenance`; press "ซ่อมเสร็จ" and confirm (a) returns to `In Use` and (b) to `Ready`. Repeat with outcome "ซ่อมไม่ได้ เสนอจำหน่าย" and confirm `Pending Disposal` (refused while an active checkout exists).
- [ ] On "ทรัพย์สินค้างสถานะซ่อมแต่ไม่มีบันทึก", record a finished/usable repair for one listed asset and confirm it leaves the box and returns to its custody-derived status.
- [ ] Create a PM plan due today and confirm it shows in "PM ถึงกำหนด" on Maintenance, Work Center, and notifications. Press "บันทึกว่าทำแล้ว", confirm the form is prefilled (asset, problem = plan title, vendor, finished/usable), save, and confirm `nextDueDate` became the record date plus one interval (a monthly plan recorded on 31 January gives 28/29 February) and the asset status did not change.
- [ ] Pause a PM plan and confirm it leaves "PM ถึงกำหนด"; resume it and confirm it returns; end another plan and confirm it remains visible but cannot be resumed or edited. Execute a disposal for an asset with an active plan and confirm the plan becomes `ended`.
- [ ] Confirm there is no maintenance close approval in the approval inbox or approval settings, and no PM automation section in Settings.
- [ ] In repair/PM create and edit forms, type fewer than two characters in asset/employee/vendor search and confirm no full master-data list is loaded; then search and confirm the result remains bounded.
- [ ] Create disposal request, open it from a filtered disposal list, print/open detail, then confirm Back returns to the same list filter before approving/executing disposal and confirming the asset is no longer counted in default audit target selection.
- [ ] Confirm `/disposal` shows a paginated queue (25/50/100), stage counts, one stage badge, and no embedded create form. Create one request at `/disposal/new`, then verify source prefill and `returnTo` from Maintenance and Audit Finding.
- [ ] On single and batch disposal creation, confirm asset search remains empty below two characters, returns no more than 50 eligible results, preserves selected assets while searching again, and does not render or transfer the full Asset Register. Verify mobile 390px has no body-level horizontal overflow.
- [ ] With separate requester, approver, and executor accounts, verify requester/creator cannot self-approve and the recorded approver cannot execute when SOD is enabled. Confirm direct API calls are blocked as well as hidden UI actions.
- [ ] Select a requester and confirm the same employee is removed from assigned-approver choices. Confirm inactive/missing requester, approver, or executor IDs are rejected by direct API calls.
- [ ] Exercise sell, donate, destroy, lost, and dispose execution. Verify each type asks only for relevant values and rejects missing recipient/document/actual sale value/incident detail as applicable. Confirm every execution requires evidence and only Disposed/Retired targets are offered.
- [ ] Force one evidence upload to fail after request creation. Confirm the request remains created, detail opens with an upload warning, and a create/approve/edit permitted user can retry the attachment without creating a duplicate request.
- [ ] Create a batch with 2 assets and another with 100 assets. Verify duplicate IDs, 1/101 items, ineligible lifecycle states, and assets with open requests are rejected atomically. Confirm every successful child has Pending Disposal status, movement/audit traceability, shared evidence, and normal independent approval/execution.
- [ ] In disposal asset search, verify assets with an open checkout, active maintenance, operational audit/finding, installed component relationship, or active license assignment remain visible but disabled with the correct blocker text. Confirm the API rejects the same asset if submitted directly.
- [ ] Open `/disposal/batches` and a batch workspace. Confirm total/pending/approved/disposed/rejected progress matches child requests, shared evidence is stored once and visible from each child, and each child still requires its own approval/execution/evidence policy.
- [ ] Verify sell, donate, destroy, lost, and general-disposal dialogs show only relevant fields. Reject a request without a reason and confirm both browser and API validation block it.
- [ ] At 390px, confirm request detail shows review/execute as the primary bottom action with asset/print/history secondary actions, while the desktop Back/Print/action toolbar is not duplicated. Confirm the action bar does not cover the last content.
- [ ] Enter a From date after the To date in the disposal queue and confirm the page explains the invalid range instead of presenting a misleading empty result. Verify unfiltered empty state offers Create, filtered empty state offers Clear filters, and desktop action cells remain visible at the right edge.
- [ ] Desktop 1440x900: with an approver account, select pending independent requests and batch children from one current queue page. Confirm Select page includes only selectable pending rows, never crosses pagination, and enforces the 50-item maximum.
- [ ] Desktop 1440x900: open bulk preview with eligible and SOD-blocked selections. Confirm the preflight shows selected/eligible/blocked totals and grouped item-level reasons before mutation; confirm only eligible rows are approved and blocked rows remain unchanged.
- [ ] Desktop 1440x900: enter one optional shared approval remark, commit, and confirm the remark appears only on successful requests while each request preserves its sale/salvage values, evidence, disposal type, own approver/timestamp, movement, audit record, and parent batch status. Confirm there is no bulk reject action.
- [ ] Desktop concurrency/partial result: preview two pending requests, approve one in a second approver session, then commit the first session. Confirm the changed request is skipped/blocked after commit revalidation without a duplicate movement/audit record, the unchanged request succeeds, queue counts refresh, and retry does not approve the changed request twice.
- [ ] Mobile 375x812, 390x844, and 414x896: enter disposal selection mode, select pending cards, and open the full-height preview/result sheet. Confirm 44px selection targets, readable wrapped blocker reasons, no body-level horizontal overflow, and no overlap with Mobile Field Navigation; selection controls must remain in the list flow rather than creating a second fixed bottom bar.
- [ ] Keyboard: Tab through disposal selection, the contextual toolbar, dialog close control, grouped blocker reasons, shared remark, and confirm action. Confirm focus remains inside the dialog, Escape dismisses it when not committing, and focus returns to the review-and-approve trigger.
- [ ] With a user lacking `disposal:approve`, confirm queue selection/bulk controls are absent and both preview and commit calls to `/api/disposal-requests/bulk-decision` return 403. With SOD enabled, confirm requester/creator rows cannot be selected or approved by that same user.
- [ ] In the approved queue at 1440x900, enter execution selection mode and select 1-20 requests of one disposal type. Confirm a 21st row and a different disposal type are blocked, selection never crosses pagination, and controls are absent outside the approved queue or without `disposal:edit`.
- [ ] Review bulk execution and confirm the shared execution date, executor, and final Disposed/Retired status are shown together with each request's read-only recipient, document number, sale/salvage value, and execution detail. Change a shared value before preview, then confirm commit uses the exact successful preview snapshot.
- [ ] Preview-only shared-recipient fallback: at `/th/disposal?status=approved&page=1&pageSize=25`, enable bulk execution selection mode and select two approved `donate` requests with blank recipients. Open the review, confirm the shared recipient field and its existing-values-preserved help text are visible, then enter `ปลายทางทดสอบสำหรับ Preview` plus the required shared execution/evidence-exception values. Submit Preview only; both rows must be eligible with that effective recipient and the `ใช้ค่าร่วม` source label. Close the dialog without permanent Commit.
- [ ] Preview a mixed eligible/blocked set, commit, and confirm successful requests record independent movement/audit rows while preview-blocked and concurrently changed requests remain in the final result. Retry and confirm only stable deduplicated blocked/failed IDs are checked again without re-executing successful rows.
- [ ] As `system_admin`, select only approved requests with zero item and inherited batch evidence and verify the historical exception requires a 20-2,000 character reason plus acknowledgement. Add any effective evidence to one selected request and confirm the bulk exception control disappears and direct API use is rejected.
- [ ] At 375x812, 390x844, and 414x896, confirm bulk execution selection and review stay in normal document flow, use 44px controls, do not overlap Mobile Field Navigation, and have no body-level horizontal overflow. With keyboard only, verify dialog focus containment, Escape/preflight cancellation, commit lock, and focus restoration.
- [ ] Submit two disposal requests for the same asset concurrently and create overlapping batches concurrently. Confirm only one transaction claims each asset, no duplicate open request remains, and document-number conflicts are retried without a partial batch.
- [ ] Populate more than 100 disposal requests and verify stage filters, page links, page-size changes, export filters, desktop table, mobile cards, and Back navigation remain stable without body-level horizontal overflow.
- [ ] Create audit round, scan assets, review findings, close round, and export results.
- [ ] Import legacy assets, verify manual tags, and export asset register.

## RBAC Negative Tests

- [ ] A user without `maintenance:create` cannot record repairs, and a user without `maintenance:edit` cannot finish, cancel, or edit repair records.
- [ ] A user without disposal permission cannot approve disposal.
- [ ] A user without audit permission cannot close audit rounds.
- [ ] A user without admin permission does not see admin menus and sees the access denied page for direct system settings/log URLs.
- [ ] Direct API access returns unauthorized or forbidden for restricted actions.
- [ ] A user cannot review an audit finding they reported if segregation-of-duties rules apply.

## Shell Presentation UAT

Superseded by the menu B shell (see Menu B Shell UAT); kept as history.

- [x] At 375x812, the mobile sidebar was closed off-canvas by default; its drawer opened and closed correctly, long Thai labels fit, and the body did not overflow.
- [x] At 768x1024, the mobile/tablet shell fit with the sidebar off-canvas and no body overflow.
- [x] At 1280x800 and 1440x900, the desktop sidebar measured 256px and aligned with the topbar/main; when collapsed it measured 64px, the topbar/main shifted correctly, the nested Asset menu expanded, and the body did not overflow.
- [x] Visual theme verification: Navy `#0F172A` sidebar, white topbar, blue active state, and readable text. Screenshots are retained as ignored evidence under `.superpowers/sdd/screenshots/task-3`.

## Reports Adaptive UI UAT

- [x] With an authenticated `system_admin`, open `overview`, `accounting`, `operations`, and `catalog` at 375, 390, 414, 768, 1280, and 1440 pixels. Confirm the dashboard `<main>` is the only vertical scroll owner and body/list/card horizontal overflow is absent.
- [x] At 375px, confirm Overview reaches its long breakdown content within approximately four to six visible viewport heights rather than recreating the previous roughly fourteen-height page.
- [x] Switch views with company, branch, status, and another supported filter active. Confirm every tab retains the compatible URL filters, the current tab is visible and identified without color alone, filters precede metrics, individual chips are removable, and removing Company also removes Branch.
- [x] Below `md`, confirm wide datasets render labelled cards only, permission-aware header exports become full-width where needed, and every action target is at least 44px. At `md` and above, confirm the same datasets render semantic tables only with contained horizontal scrolling where needed.
- [ ] In Operations, open each data-quality card and confirm the Asset Register receives the exact `dataQuality` filter plus compatible asset filters. Apply an asset filter before reviewing frequent repairs and confirm the values obey that scope. Open Idle Assets and confirm `activity=idle_180d` is present and the destination count uses the same latest-180-day no-movement semantics.
- [ ] Save and reopen a named preset from Catalog. Confirm it restores the saved view and asset-filter context in the same browser only, is absent in a separate browser profile/device, and does not broaden permissions.
- [x] Confirm Catalog states that Maintenance, Disposal, and Audit recurring exports use their own module filters and do not inherit the asset filters above, while Asset Overview uses the current supported asset filter query.
- [x] With `PERFORMANCE_TIMING=1` or `PERFORMANCE_LOGGING=1`, request each view once and confirm every request emits `reports.shared-data` plus only its matching `reports.<view>-data` label. Disable the timing flag immediately after this check.
- [ ] Repeat a Reports smoke test with `accounting` or another permission-limited role. Confirm unrelated admin actions and unauthorized exports are hidden and blocked, while allowed views and exports remain available.
- [ ] Use production-like data with repeated branch names and cross-scope assets. Confirm branch labels retain company context and Operations counts/drilldowns agree with Asset Overview export, including the Cross Scope sheet. Keep the Production Readiness realistic-data Reports/export gate open until this is actually executed.
- [ ] On target real phones/tablets, repeat the mobile/tablet layout, tab visibility, touch-target, overflow, and long Thai/English content checks; viewport emulation alone is not a real-device pass.
- [x] Across the matrix, confirm the console and server output contain no missing-message, hydration, duplicate-key, or runtime errors.

Controller evidence on 2026-07-15 used the authenticated Chrome `system_admin` session against 1,748 local assets. All 24 view/width combinations had one `HTML` scroll owner, no nested vertical scroller, no body/main/card horizontal overflow, one active view, and an active tab with both `aria-current` and a visible icon. The first Overview breakdown began at 5.9 viewport heights on 375x812 after mobile cards were compacted without hiding fields. Mobile actions measured at least 44px; `md+` showed only semantic tables. A direct 375px load of `view=catalog` scrolled the mandatory snap strip to the active Catalog tab. Company, Branch, Status, and Data Quality filters survived every tab URL, removing Company also removed Branch, and the Apply form retained supported URL-only Data Quality/Cross-scope/Activity scopes; automated tests cover the corresponding Brand/Model/Custodian/Supplier fields. Active Data Quality and Cross-scope chips rendered localized Thai values. A temporary Catalog preset stored `view=catalog` plus the Company filter and was deleted after inspection; blocked-storage write handling is regression-tested without inspecting browser storage. Generated Operations quality/idle hrefs preserved compatible filters and used exact `dataQuality` or `activity=idle_180d` values, but automated destination navigation was blocked by the browser safety policy, so the end-to-end drilldown/export reconciliation item above remains open. Timing logs showed `reports.shared-data` plus exactly one matching view label for each request; the flag was disabled and the dev server restarted afterward. No console error or warning was recorded after the QA start time.

## Mobile Field Navigation UAT

Superseded by the menu B shell (see Menu B Shell UAT); kept as history.

- [x] At 375x812 and 390x844, Asset Register showed one Mobile Field Navigation dock, no contextual Audit action bar, no body overflow, and all five visible targets measured at least 44px high.
- [x] At 768x1024 the field dock remained visible while the desktop Sidebar was still off-canvas; at 1024x800 the field dock was hidden and the 256px desktop Sidebar was visible. Confirm there is no navigation gap across the `lg` breakpoint.
- [x] Confirm `หน้าหลัก`, `ทรัพย์สิน`, `สแกน`, and `ตรวจนับ` use existing routes and `เพิ่มเติม` opens the existing RBAC-filtered Sidebar.
- [x] Confirm General Asset Scan keeps Mobile Field Navigation visible with `สแกน` selected because its camera controls are inline, while `/th/audit/rounds/{id}/scan` hides the dock in Focus Task Mode.
- [x] Select an in-round Audit item without saving and confirm exactly one Audit action bar appears while Mobile Field Navigation remains absent. Browser QA measured matched/mismatch/change-target actions at 56px/48px/48px with no body overflow.
- [x] Confirm opening the More drawer or hiding the dock for the virtual keyboard does not make the Topbar hamburger reappear or shift Navigation Mode content.
- [x] Confirm More identifies and exposes the existing permission-filtered Sidebar with `aria-expanded` and `aria-controls`.
- [x] Automated regression coverage confirms More transfers focus to the Sidebar close button, restores it after close-button/overlay/Escape dismissal, and does not restore it when a drawer link starts navigation.
- [x] Confirm Audit Scan still exposes QR scan and manual Asset Tag/Serial/QR entry, and that selecting a manual suggestion stays inside the existing `auditRoundId` workflow.
- [x] Confirm Audit Pending remains in Navigation Mode and `Mark Not Found` is not added to the post-scan action bar.
- [x] Confirm Asset create/edit/detail, checkout, check-in, transfer, bulk move, Audit Round create/detail, and maintenance/disposal detail routes use Focus Task Mode so their existing bottom actions do not collide with field navigation.
- [ ] On Android Chrome and iPhone Safari, open and close the software keyboard and confirm the field dock hides while typing, returns after dismissal, and leaves no blank/covered content after rotation.
- [ ] On a notched iPhone, verify the field dock and Audit action bar both respect the bottom safe area without stacking or clipping.
- [ ] With an employee-only account, confirm `ทรัพย์สิน` opens My Assets and Scan/Audit destinations are omitted when the corresponding permission is absent.
- [ ] With a keyboard and screen reader, open More, verify focus moves to the close button, then close with the close button, overlay, and Escape to confirm focus returns to More. Confirm choosing a drawer link moves to the new page without returning focus to the old trigger.

## List Pages UAT (UI round 4 phase 2B)

- [ ] Return to the same page: on page 2 or 3 of `/th/audit/rounds`, `/th/disposal/batches`, `/th/maintenance/pm`, `/th/disposal`, `/th/maintenance` and `/th/master-data/departments` (with the page size set to 50 on one of them), open a record (round detail, batch, PM edit, request, repair record, department edit) and go back with the page's "กลับ" button or its crumb. Confirm the list opens on the same page with the same page size and filters. On a phone the round detail's bottom-bar "กลับ" (left arrow) does the same, and a saved PM plan returns to that page too.
- [ ] On page 3 of `/th/audit/findings` (or the last page of a tab with more than 50 findings), open a finding, press "เปิดหน้าทรัพย์สิน" in the panel and use the browser Back button: the findings list returns on page 3 with the same tab, filters, search, page size and the same finding open.
- [ ] Last row of the last page: on `/th/audit/rounds/<id>/pending`, mark the only item of the last page with the row's "บันทึกไม่พบ" and confirm the list lands on the new last page and the title "รายการรอตรวจ N รายการ" drops by one; on `/th/audit/findings?status=pending`, decide the only finding of the last page and confirm the queue lands on its new last page; on `/th/master-data/departments`, delete the only row of the last page through ⋯ → "ลบ" → confirm, and confirm the list lands on the new last page. Opening `?page=99` on each paged list opens its last page (`/th/audit/rounds` shows the last page and keeps the URL).
- [ ] Totals: the pager total of `/th/audit/findings` equals the count of the tab in use (and of the sub-chip under ต้องติดตาม); the title of `/th/audit/rounds/<id>/pending` counts every pending item of the round (more than 200 when the round has more), and "ทุกห้อง N" equals the pager total; `/th/disposal/batches` reaches batches older than the newest 100; `/th/maintenance/pm` reaches plans past the first 500, in the same order (active, paused, ended, then the next due date).
- [ ] Dialogs opened from a row: on `/th/disposal` at desktop width, open "พิจารณาคำขอ" or "บันทึกตัดจำหน่าย" from a row, cancel it, and confirm focus returns to that button and the request page did not open; on `/th/audit/rounds/<id>/pending`, do the same with the row's "บันทึกไม่พบ" (focus returns to it). On every master-data list, ⋯ → "ลบ" asks the same confirmation as before and Cancel returns focus to ⋯.
- [ ] Filters and chips: on `/th/audit/findings` opened from a round or a report, the "รอบ:" and "เรื่อง:" filters show the round and the field, and changing one keeps the other, the tab and the search; on `/th/maintenance?assetId=<id>`, the "เฉพาะทรัพย์สินนี้" chip removes only the asset filter and keeps the search, status, dates and page size, and "กรอง" keeps the chosen page size; on `/th/disposal` at 375px the folded filter panel reads "ใช้ตัวกรอง N รายการ".
- [ ] Selections stay on one page: on `/th/audit/findings` (approver, desktop), tick findings, then go to the next page or another tab and confirm the ticks are cleared; the bar reads "N รายการที่เลือก · ล้าง · ปฏิเสธที่เลือก · อนุมัติที่เลือก N รายการ", with "อนุมัติที่เลือก N รายการ" the primary button. On `/th/disposal`, "เลือกหน้านี้" selects only rows of the page on screen.

## Adaptive UI Release Gate

- [x] Accessibility follow-up passed TDD: RED was 24/30 with the expected semantic-contrast/token-usage/44px-target failures; GREEN was 30/30. Success, warning, danger, and info badge text now measures 6.396:1, 6.560:1, 7.112:1, and 7.572:1 against the actual 10% tints; muted measures 6.917:1. The mobile checkbox remains visibly 20px inside a centered 44px semantic label with a focus-within ring and unchanged aria/selection behavior.
- [x] Accessibility follow-up gates passed: scoped ESLint exited 0 without output, standalone `npx tsc --noEmit` exited 0, and `npm run verify` completed with 663/663 tests, zero lint errors (256 existing bundled-tool warnings), Prisma 7.8.0 generation, Next.js 16.2.4 compilation/TypeScript, and 54/54 static pages.
- [x] Controller browser recheck passed after a clean dev-server restart at `http://localhost:3001`, 375x812: the success badge class included `text-success-foreground`, computed foreground was `rgb(22, 101, 52)` from `#166534`, the visible checkbox measured 20x20 inside a semantic 44x44 label target, and `bodyOverflow` / `cardOverflow` were both false. Ignored evidence: `.superpowers/sdd/screenshots/task-6/asset-register-accessibility-final-375.png`.
- [x] Task 6 focused command passed 94/94 tests, including dashboard shell/layout, asset query/return navigation, and all planned Audit Scan coverage.
- [x] Repository gates passed on 2026-07-10: lint exited 0 with 0 errors and 256 bundled skill-tool warnings; full tests passed 656/656; production build completed Prisma 7.8.0 generation, Next.js 16.2.4 compilation/TypeScript, and 54/54 static pages; `npm run verify` completed; standalone `npx tsc --noEmit` completed; the pre-documentation `git diff --check` and `git status --short` were clean.
- [x] Visual consistency follow-up uses the agreed Navy `#0F172A`, White, and Electric Blue `#3B82F6` accent tokens for the PWA/app shell, while accessible white-text actions stay on Action Blue `#2563EB`. Asset Detail and My Assets use the shared `StatusPill`; fixed workflow badges use semantic success/info/warning/danger tones while database-configured status/condition colors remain available. Empty-state link CTAs meet the 44px mobile touch-target baseline.
- [x] App Shell browser evidence covers 375/768/1280/1440; Asset Register covers 375/390/414/768/1280/1440 plus filtered-empty and disclosure; Audit Scan layout covers 375/390/414/768/1280/1440 plus selected-action and safe-area states.
- [ ] Validate Android/iPhone camera permission, torch/zoom, offline-photo retry, keyboard, rotation, and safe-area behavior on real devices. The in-app browser did not receive a video stream, so camera/torch/zoom are not passed.
- [ ] Validate Asset Register actions and empty states with a permission-limited role.
- [ ] Review the previously reported 13 dependency vulnerabilities (1 low, 8 moderate, 4 high) in a separate security/dependency change; do not force dependency updates during UI UAT.
- [x] The inherited raw Asset Detail handover colors were replaced with shared semantic `StatusPill` tones. Audit Scan now clears stale `scanFeedback` when the target changes or clears.

## E2E Suite Follow-up (2026-10-21)

The automated suite (`npm run test:e2e`, plan `docs/superpowers/plans/2026-10-20-e2e-suite.md`) passed every workflow on desktop and phone in both themes. A person still checks:

- [ ] VoiceOver (iOS) and TalkBack (Android) on real phones: the field audit, a handover, the searchable select.
- [ ] NVDA on a computer: the asset QR Code's name, a dialog's scrolling body, the searchable select (not modal since DX4), a save read once.
- [ ] iOS Safari and Android Chrome: the keyboard does not cover the form; the receiver signs with a finger at the desk; a tap right after choosing an option does not land on another option.
- [ ] The field audit on a slow real phone and network (the suite only delays 150 ms).
- [ ] The camera on real QR labels (the labels are not printed yet: typed search meanwhile), and label printing.
- [ ] Field use: low light, one hand, a weak network.
- [ ] HO-, RT- and TR- documents print on one A4 page each.
- [ ] An English pass of the new messages, and the standalone server on the production build.

## Menu B Shell UAT (2026-10-25)

The automated suite covers the shell in all four projects (`e2e/shell/`). A person still checks:

- [ ] NVDA: the bell reads "การแจ้งเตือน N รายการ"; new work is read once ("งานรออนุมัติ เพิ่ม 1 รายการ"), never on the first load; each collapsed menu icon is read on focus; the skip link is the first stop.
- [ ] VoiceOver (iOS) and TalkBack (Android): "เพิ่มเติม" opens the sheet, focus stays inside, a swipe down closes it and focus returns to the tab; its motion stops with reduced motion.
- [ ] The work center's orange dot and "มีงานรอคุณ N รายการ" for a person with `dashboard:view` and approval work; it goes after "อ่านแล้วทั้งหมด".
- [ ] In real time: a person filling a long form for more than 60 minutes is not signed out; 60 minutes without use warns 5 minutes ahead and lands on the login with "เซสชันหมดอายุ", then returns to the page; near 12 hours the warning has no "อยู่ในระบบต่อ".
- [ ] The field audit offline for over an hour: the scan page stays; after reconnecting a lapsed session goes to the login, the queue waits in IndexedDB and is sent after the same person signs in; another person's sign-in does not send it, the scan page says whose it is, and nobody can remove it (open question).
- [ ] Two tabs: activity in one keeps the other open.
- [ ] The navy menu and the light top bar on a real monitor in both themes; the phone's white bars in bright light.
- [ ] An English pass of the new messages.

## Dashboard B UAT (2026-10-26)

The automated suite covers the dashboard in all four projects (`e2e/dashboard/`). A person still checks:

- [ ] An approver sees "งานรออนุมัติ" first, IT staff their repair, PM and discrepancy rows first, and a view-only person ทรัพย์สินทั้งหมด and ตามสถานะ first.
- [ ] Each row of งานที่รอคุณ equals the bell's row and opens a list with the same count; ค้างนานสุด turns warning ink with an icon when overdue; the zero line names the kinds at zero; "เปิดศูนย์งานค้าง" shows only with `dashboard:view`.
- [ ] NVDA reads each KPI's filter note as its description, and skips the status bar: the table under it reads every status, count and link (the bar's segments are links for the mouse only).
- [ ] On the desktop, a click on a status bar segment opens the register for that status with the same count as its table row, and hovering it names the status, its count and the filter.
- [ ] Choosing a company changes the totals, ตามสถานะ, the cross-scope line and the round; งานที่รอคุณ and ล่าสุด say "ทุกบริษัท"; the register opened from a number shows the company chip on desktop and the same count.
- [ ] The "ควรถึงวันนี้" mark sits at the share of the round's days gone; a branch behind it says "ช้ากว่าที่ควร"; a branch row opens the round's item list filtered to that branch with the same count; with a company chosen, the round KPI opens the round's item list filtered to that company, its count equal to the KPI's "ตรวจแล้ว … / N"; with no round due, the KPI and the section say "ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้" and "ดูรอบที่กำลังตรวจทั้งหมด" opens the rounds list's "กำลังตรวจ" tab.
- [ ] ล่าสุด shows a document number only to a person who may open that document (a repair, disposal or round page needs its own view permission).
- [ ] The bar fills and swatches are told apart in both themes on a real monitor.
- [ ] On the phone: the KPIs in 2×2, rows of งานที่รอคุณ at least 56px tall, no ล่าสุด.
- [ ] An English pass of the new messages.

## Asset Detail B UAT (2026-10-26)

The automated suite covers the asset detail in all four projects (`e2e/asset-detail/`, with the transaction, licence, repair and roles steps). A person still checks:

- [ ] The primary action and the top of "อื่น ๆ" equal the register row's next button and the top of its ⋯ (on the phone the ⋯ leads with the primary, as the row has no next button) for one asset of each kind: a Ready personal asset (ส่งมอบ), a Ready asset still held by a legacy custodian (รับคืน), stock (เบิกจากคลัง), shared (ย้ายจุดติดตั้ง), a component (จัดการส่วนควบ), a licence (ผูก License), Pending Repair with and without a repair record (ดูงานซ่อม, บันทึกซ่อม), Pending Disposal with an open request (ดูคำขอตัดจำหน่าย), Pending Disposal without one (no primary; "ขอตัดจำหน่าย" in "อื่น ๆ"), and Lost or Disposed (no primary). The primary never repeats in the list. Each unavailable item reads its reason ("ขอตัดจำหน่าย" the first readiness blocker); each available one opens a form whose save the API accepts (a stock asset in Pending Repair can move; a personal one cannot be handed to a custodian). The pinned "บันทึกซ่อม" shows whenever the repair form could save a record, except when the primary already is "บันทึกซ่อม".
- [ ] With `employee:view`, the custodian's name opens the employee page (no E2E role holds it; without it the name opens the register by custodian); an asset with no custodian reads "ไม่มีผู้ถือครอง"; ที่ตั้ง opens the register with the chip "ที่ตั้ง: …" at every width, whatever view the register remembered; ตรวจนับล่าสุด shows a status badge "พบตรง", "รายการไม่ตรง" or "ไม่พบ" with the date and the round, "รอตรวจในรอบ AUD-…" with the round's code a link, or "ยังไม่เคยตรวจนับ"; ประกัน reads "ถึง …", "หมดแล้วเมื่อ …" or "ไม่ทราบ", and "บันทึกข้อมูลการซื้อ" (editors) lands on the purchase section of the edit form; dates read in the Buddhist era with a short Thai month.
- [ ] Previous / next over a long search (24 results or more, across register pages) and after filters without a search (the crumb reads "ผลการกรอง"); none from the scan page or a direct link.
- [ ] The history of a long-lived asset copied from Production: every type in Thai, the chip counts add up to ทั้งหมด, month rows, "12 เดือนล่าสุด", "แสดงเพิ่ม (เหลือ N รายการ)", and "ส่งออก Excel" opens in Excel with every event and its type.
- [ ] A photo whose file is missing shows "โหลดรูปไม่ได้" and, for an editor, the link "อัปโหลดรูป" ("ถ่ายรูป" on the phone) to the ไฟล์ tab (the suite cannot force a missing file); an asset with no photo of its own shows its model's labelled "รูปประจำรุ่น".
- [ ] As an editor, an asset with a gap (for example no Serial Number, no photo, or a checklist photo still missing) shows the line "ข้อมูลยังไม่ครบ N รายการ:" at the top of ภาพรวม (R59). Each item is a link: the Serial Number opens the edit form at its field, a photo item the ไฟล์ tab, เอกสารจัดซื้อ the files tab's เอกสารจัดซื้อ, and the department or custodian their field. A complete asset shows no line, and a viewer never sees it.
- [ ] The ไฟล์ tab: photos as tiles under their checklist labels, several files in one upload ("อัปโหลด N ไฟล์"), "ถ่ายรูป" on a real phone, a HEIC or SVG file listed as a document, delete of a photo or a document through the confirm (the suite never deletes), เอกสารจัดซื้อ as before, หลักฐานจากงานอื่น linking each file to its document and showing only what the person may view.
- [ ] The ซ่อม / PM tab: the three numbers against the asset's repair records ("ซ่อมมาแล้ว N ครั้ง" leaves out cancelled and PM records and its foot says so; the tab's count holds every active record), the replacement notice at 3 repairs or half the price, the repair number a link only with `maintenance:view`, the asset's PM plans in every state, "ตั้งรอบ PM" only with `maintenance:create` and never on a Disposed or Retired asset.
- [ ] NVDA and VoiceOver: each "อื่น ๆ" item reads its reason; the phone sheet keeps focus inside and returns it to "การดำเนินการอื่น"; the tabs read their counts; the fact strip reads as terms and values.
- [ ] Both themes on a real monitor and phone; the bottom bar clears the home indicator.
- [ ] An English pass of the new messages.

## Audit Rounds B UAT (2026-10-26)

The automated suite covers the rounds list and the create form in all four projects (`e2e/audit/`, `e2e/cross-cutting/field-errors.spec.ts`). A person still checks:

- [ ] On a copy of Production data: the tab counts follow the search, "งานที่ต้องทำต่อ" stays round-wide while searching, the scope column names every condition, a search by a scope's category or department name finds the round, and "เหลือ / เลยกำหนด N วัน" shows on open rounds only.
- [ ] A fully scanned round with pending findings reads "รอพิจารณา"; "พร้อมปิดรอบ" shows only where the close goes through (no action plan planned, in progress or done); "พิจารณา" opens a list of the same count, and "แผนแก้ไขค้าง" opens the open action plans.
- [ ] The coverage line folded and open: bar, %, "ครอบคลุม X จาก Y · ยังไม่อยู่ในรอบใด Z", the four numbers, pending items and pending review apart, the breakdown by category and department, the year in Buddhist years.
- [ ] The create form: the end date a month after the start, every condition type through "+ เพิ่มเงื่อนไข", custodian search, a disposed status only with "รวมที่ตัดจำหน่ายแล้ว" ticked and gone when it is unticked, the advanced options' folded line, the live count while typing fast (no focus jump, no error under a half-typed date), the daily load, the overlap warning with its link, and 0 items said before "สร้างรอบ".
- [ ] An old draft round (on a copy of Production, `AUD-2026-0002` before it is cancelled) reads "เปิดตรวจ" on the list, the round page, the dashboard, the employee page and the global search, with no "ร่าง" anywhere.
- [ ] NVDA: the tabs read their counts, the chip reads "ล้างตัวกรองนี้: …", the next step reads in full.
- [ ] Both themes on a real monitor and phone; on the phone the summary panel sits under the form and the round cards show the next step.
- [ ] An English pass of the new messages.

## Audit Round B UAT (2026-10-27)

The automated suite covers the round page and the pending list in all four projects (`e2e/audit/`): the chips against their rows, the field bars, "ส่วนควบไม่ครบ", the close inside the next-step card, the opener's sentence, the cancel in "อื่น ๆ", the room chips, the not-found dialog, the viewer's controls and the Excel export of a category. A person still checks:

- [ ] On a copy of Production data, open `AUD-2026-0002` (1,509 items) before it is cancelled. Confirm:
  - the round page opens;
  - the result card's four numbers add up to the round's items, with "พบเพิ่มนอกขอบเขต N" apart;
  - "รูปหลักฐาน: มี x จาก y ที่ตรวจแล้ว" counts only checked items;
  - Excel ผลตรวจ, PDF and รายงานผลต่าง download with a category, a company and a search chosen, each with the same rows as the page.
- [ ] The next-step card at each step of a real round:
  - the detail lines;
  - "แผนแก้ไขค้าง x" opening the open action plans;
  - "ปิดรอบตรวจ" inside the card at 1280 and 1440 with the sidebar open and closed;
  - a closed round reads complete;
  - a cancelled round shows its cancel details (time, by whom, reason) and no card.
- [ ] From the dashboard's company and branch links, the company and branch chips stay beside the category chip, and each result chip's count equals its rows.
- [ ] On a round with more than six categories, "อื่น ๆ" lists the rest, and a chosen category outside the six stays as its own chip.
- [ ] Old links: `?result=wrong_location`, `wrong_custodian` and `wrong_condition` open the matching field filter.
- [ ] Search by a room's code and by its name, on ทั้งหมด and on นอกขอบเขต.
- [ ] "ส่วนควบไม่ครบ" on real parents (for example a notebook with a missing adapter): the parent listed once, every missing component named, and each code opening that component's row.
- [ ] Pending list:
  - more than six rooms ("อื่น ๆ" opens the rest);
  - the chosen room kept at 0 after its last item;
  - `?locationId=<unknown>` goes back to all rooms and never shows a raw id;
  - after a move during the round, a search by the expected room and by the expected custodian finds the item;
  - the not-found dialog on a phone;
  - an asset found in place in an earlier round shows that scan's date and time under ตรวจล่าสุด, the same as its asset page, and an asset never checked reads "ยังไม่เคยตรวจ";
  - a viewer sees no scan, not-found or "เดินตรวจต่อ".
- [ ] NVDA:
  - the chips read their counts;
  - the filter chips read "ล้างตัวกรองนี้: …";
  - the steps read their state;
  - "ส่งออก" and "อื่น ๆ" open their menus and focus comes back after the cancel dialog.
- [ ] Both themes on a real monitor and phone.
- [ ] An English pass of the new messages.

## Audit Phone Walk B UAT (2026-10-27)

The automated suite covers the phone walk and the record sheet in all four projects, the phone on WebKit (`e2e/audit/field-audit.spec.ts`), and "แสดงเพิ่ม" past ten on the phone projects (`e2e/audit/walk-search.spec.ts`). It checks:
- the switch's counts and its third tab;
- the category chips within the room and the tab, cleared on a room change;
- the room-first search, and ten results with "แสดงเพิ่ม" on a round of eleven;
- the recorded out-of-scope find listed apart on the ตรวจแล้ว tab with its "นอกขอบเขต" badge;
- the header and the room button counting the round's own items;
- a personal asset's custodian and department;
- a wrong room, and "ไม่ตรง" without a value;
- the components' "พบ" / "ไม่พบ";
- a second scan of an out-of-scope find.

A person still checks:

- [ ] On iPhone Safari and Android Chrome, one-handed, in both themes:
  - the sticky search;
  - the switch, and the chip row scrolling sideways inside itself, while the page never scrolls sideways;
  - ตรง / ไม่ตรง at 44px;
  - the sheet's title wrapping on a long asset name;
  - line 2 "รหัส · Serial …" on a long tag.
- [ ] A round where a search matches more than ten items:
  - the line counts every match, "ในห้องนี้ N · ห้องอื่น M";
  - ten show;
  - "แสดงเพิ่ม" adds ten more, the room's items first (a tag, serial or fixed asset code typed whole comes before them, wherever its room is).
- [ ] A room with several departments:
  - "ห้องนี้ตรวจแล้ว x / y · เหลือ z" follows the chosen department;
  - the footer "ของในห้องนี้ที่ยังหาไม่เจอ N รายการ →" equals the pending list it opens for that room.
- [ ] The category names:
  - a round whose category was made inactive after it opened shows that chip by its name, never an id;
  - a find another person records in a category the page did not load reads "หมวดหมู่อื่น".
- [ ] Tap "เจอของที่ไม่อยู่ในรายการ? บันทึกนอกขอบเขต":
  - the search takes focus, with "พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน";
  - the find is recorded through "ค้นในทะเบียนทั้งหมด".
- [ ] A software licence has no ที่ตั้ง row, and a shared asset has no ผู้ถือครอง row. Neither save creates a finding for those fields.
- [ ] Editing a saved result opens each field as it was saved: a field saved ไม่ตรง opens ไม่ตรง with its saved value.
- [ ] The found badge reads "พบตรง" in the list and in the search results, and the first category chip reads "ทุกหมวดหมู่".
- [ ] Custodian:
  - "ไม่มี / ไม่ระบุ" can be chosen (on แผนก and สภาพ too, never on ที่ตั้ง);
  - each person's department shows after the name;
  - choosing a person moves แผนก with "ตามแผนกของผู้ถือครองที่พบ";
  - setting แผนก first keeps it.
- [ ] On the ตรวจแล้ว tab, "บันทึกนอกขอบเขตแล้ว N" lists the room's recorded out-of-scope finds (the round's with no room) with the "นอกขอบเขต" badge, the tab counts do not include them, and a tap opens the find's out-of-scope sheet.
- [ ] An out-of-scope find opened from the round page's ⋯ "แก้ไขผลตรวจ" opens its out-of-scope sheet. Change its condition (the save asks for a photo) and save. Confirm:
  - the round page still counts it under นอกขอบเขต;
  - the condition finding waits for review;
  - the register is unchanged.
- [ ] Offline:
  - a check saved offline is kept while the room changes and is sent when back;
  - an out-of-scope save offline is refused with "ค้นนอกรอบต้องใช้อินเทอร์เน็ต".
- [ ] At 1280 and 1440, the list and the side panel: the chips, and the ตรง / ไม่ตรง rows in the panel.
- [ ] NVDA and VoiceOver:
  - the switch and the chips read their counts and their pressed state;
  - each field's ตรง / ไม่ตรง reads with the field's name;
  - "เลือกค่าที่พบ" is read as focus moves to the field.
- [ ] An English pass of the new messages.

## Audit Findings B UAT (2026-10-28)

The automated suite covers the findings page in all four projects, the phone on WebKit (`e2e/audit/field-audit.spec.ts`), and finding M4 (`e2e/cross-cutting/roles.spec.ts`). It checks:
- the six tabs and their counts within the round;
- the เรื่อง chips;
- a row opening the panel with `?finding=`, and a reload reopening it;
- each decision moving to the next finding with "k จาก N";
- a reject without a reason refused by the panel and by the API;
- "ส่วนควบของ <parent>" in the row and in the panel;
- the comparison and the sentence of what approving changes;
- on the desktop, the ticks, the bar, "ล้าง", and a batch with one failure made on purpose ("สำเร็จ 1 · ไม่สำเร็จ 1");
- the own finding with no tick and the panel's reason;
- IT staff with no review control in the list or in the panel;
- "ส่งออก ▾" with the round and the locale, and the Excel's cells in words with English headers;
- the dashboard's findings links landing on รอพิจารณา and ต้องติดตาม.

A person still checks:

- [ ] At 1280 and 1440, in both themes: the two panes (the panel about 420px) and the chosen row's fill. The sticky bar covers no row. The panel scrolls on its own on a long finding, and stays in view when a row far down the list is opened (P4-R31).
- [ ] At 768 and 1024, in both themes, with a row ticked: at 768 the selection bar sits above the bottom navigation and every nav button can be pressed; at 1024 the bar is flush at the bottom and there is no field navigation (P4-R35).
- [ ] At 1024, 768 and 390: scroll the list and open a finding near its bottom. The panel opens at its top with "กลับไปรายการไม่ตรง" in view. Decide it, and the next finding also opens at its title (P4-R31).
- [ ] With more pending findings than one page (page size 25), decide the last finding of page 1: the panel opens the first of page 2. Decide the last pending finding of the tab: the panel says the tab is done.
- [ ] A 409: edit an asset's department through the asset form after its finding was reported, then approve that finding:
  - the warning shows in the panel, and a second press applies it;
  - inside a batch, the finding is skipped, and the result says to decide it in the panel.
- [ ] "ปฏิเสธที่เลือก" asks one reason, refuses an empty one under the box, and rejects each ticked finding with it.
- [ ] "อนุมัติทุกช่องของทรัพย์สินนี้" on an asset with two pending fields applies both, and the rows stay one per finding.
- [ ] Two tabs on one finding: decide it in one, then press อนุมัติ in the other. It is refused as already decided, and nothing is applied twice.
- [ ] The follow-up in the panel:
  - "แผนแก้ไข" saves the owner, the due date and the status, and the owner reads as a name for a role without `audit:edit`;
  - "ปิดรายการไม่ตรง" needs one evidence file;
  - the evidence list, "เปิดคำขอตัดจำหน่าย" (it returns to the same finding) and the freshness banner work;
  - on a closed or cancelled round, the panel offers no plan or close.
- [ ] On iPhone Safari and Android Chrome: tapping a card opens the panel full screen, and its back returns to the list at the same place.
- [ ] Old links land: the round page's "แผนแก้ไขค้าง" opens ต้องติดตาม › ต้องแก้ไข; the bell's open and due-soon actions open ต้องติดตาม with the bell's count; an `?status=overdue` link opens เกินกำหนด.
- [ ] Each sub-chip's count equals its rows.
- [ ] Search "แผนก" or "ที่ตั้ง": the findings of that field come up (bug 19). "เรื่อง:" narrows to one field.
- [ ] Open the PDF exports (round, findings) and the variance Excel: the statuses, results and actions read as words, and an `actionTaken` code with no word yet is an empty cell, never the code (P4-R29).
- [ ] A round export with a Thai search downloads, with the Thai name kept.
- [ ] NVDA and VoiceOver:
  - the tabs read their counts;
  - a tick reads its finding;
  - the bar reads its count;
  - the reason error is read as focus moves to the box.
- [ ] An English pass of the new messages and of the exports with `locale=en`.

## Transaction Asset Search UAT (2026-10-28)

The automated suite covers the shared asset picker of ส่งมอบ, รับคืน, โอนย้าย and ย้ายที่ตั้งหลายรายการ in all four projects (`e2e/transactions/*.spec.ts`, `e2e/cross-cutting/field-errors.spec.ts`, `e2e/cross-cutting/roles.spec.ts`). It checks:
- each page's asset found by typing and picked from the answer to that text;
- a handed-over asset opened from its page chosen but blocked, with its reason under the field, and listed faint with the same reason on an empty form, where a click chooses nothing;
- รับคืน: a holder's name giving one group, theirs, with "ถืออยู่ N ชิ้น"; return-by starting as the holder; the transferred asset read as a ข้อมูลเก่า row under its holder (never picked, so no backfill);
- ย้ายที่ตั้งหลายรายการ: three tags typed and picked one at a time, "ที่เลือกแล้ว 3 รายการ", and "เลือกแล้ว" on the chosen rows of a later answer;
- the viewer refused the search (`GET /api/asset-operations/search`, 403) and the four pages.

A person still checks:

- [ ] Each page answers a typed code within about 1 s on Production-size data over the VPN (spec §4: an index if over 1 s).
- [ ] ส่งมอบ lists a ส่วนควบ, a License, an In Use asset and an open handover, each with its reason.
- [ ] รับคืน: a person's name lists their assets under them; a ข้อมูลเก่า row backfills and returns; a held computer's components read "ส่วนควบรับคืนพร้อมเครื่องหลัก" and come back with it.
- [ ] โอนย้าย: a custodian chosen after an asset that no longer fits clears it, with the reason under the field.
- [ ] โอนย้าย: a บุคคล asset in อยู่ระหว่างตรวจสอบ is takeable with no custodian and is cleared with its reason when a custodian is chosen; the asset page shows โอนย้าย disabled for it (S-R40).
- [ ] ย้ายที่ตั้งหลายรายการ: remove a chosen row; a failed search keeps the chosen list.
- [ ] A VPN drop shows "ค้นหาไม่สำเร็จ ลองอีกครั้ง", and the retry works.
- [ ] NVDA and VoiceOver:
  - the active row is read;
  - blocked rows are skipped;
  - the count is read politely.
- [ ] An English pass of the new messages.

## Sign-Off

| Role | Tester | Date | Result | Notes |
|---|---|---|---|---|
| system_admin |  |  |  |  |
| asset_admin / IT staff |  |  |  |  |
| auditor |  |  |  |  |
| audit_reviewer |  |  |  |  |
| accounting |  |  |  |  |
| department_manager |  |  |  |  |
| employee |  |  |  |  |
| viewer |  |  |  |  |

## Handover Mode UAT (pending)

- [ ] User Checkout initially shows no selected mode in Thai/English on desktop and mobile.
- [ ] Permanent assignment requires employee/custodian, hides due date, previews and saves `In Use`.
- [ ] Temporary loan requires a non-past due date, previews and saves `Checked Out`; non-user destination forces temporary mode.
- [ ] Check-in shows read-only current custody and accepts permanent from `In Use` and temporary from `Checked Out` only.
- [ ] Mode/status mismatch and active null mode are blocked with recovery guidance and appear in Asset State Review.
- [ ] Check-in cancellation restores `In Use` or `Checked Out` according to mode; Checkout cancellation restores the original snapshot and retains VOID history.
- [ ] Due notifications include temporary loans only; Asset Detail, Timeline, Checkout print, and Check-in print show the same mode.
- [ ] Completed legacy null-mode history displays as unspecified without guessing from the due date.
- [ ] After approved migration apply, verify `GRL-COM-06-0001 / HO-202606-0002` and `SNI-EQU-19-0336 / HO-202608-0003` are permanent assignments in `In Use` with movement/log evidence.
