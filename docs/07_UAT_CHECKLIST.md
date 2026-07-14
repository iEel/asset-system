# UAT Checklist

Use this checklist with realistic master data and at least one asset in each important ownership/status case. Record test evidence, tester, date, and issue links outside this file according to the organization's UAT process.

## system_admin

- [ ] Login successfully.
- [ ] On Login at 390px and desktop, confirm the real application icon, Light Slate background, Navy headings, Surface White form, Action Blue submit button, and Electric Blue focus state match the authenticated shell without horizontal overflow.
- [ ] Confirm Username and Password have associated accessible labels, password-manager autocomplete values (`username` / `current-password`), 44px mobile targets, and 16px mobile input text. Toggle Eye/EyeOff and confirm the password remains focused and the value does not change.
- [ ] Submit invalid credentials and confirm the username remains, password clears, focus returns to Password, the generic error is announced, and editing either field clears the stale error. Confirm loading copy and `aria-busy` are present while authentication is pending.
- [ ] Open Login with `?reason=session-expired` and confirm the localized session-expired status appears. After a valid login with a same-locale `callbackUrl`, confirm navigation returns there; external, protocol-relative, backslash, cross-locale, and malformed callback values must fall back to the role-aware locale home.
- [ ] Open Admin Settings.
- [ ] Switch between System Settings tabs, refresh the page, and confirm the selected tab is restored from the `tab` URL query without losing other query values. Change a safe setting, then attempt to close/refresh the browser and confirm the standard leave warning appears only while unsaved changes exist.
- [ ] Search System Settings by a known key, description keyword, and section name. Open a result and confirm it returns to the matching existing tab without discarding unsaved form values. Change a safe setting, use its link in `ตรวจทานก่อนบันทึก`, and confirm the same tab navigation works.
- [ ] Open Company, Branch, Location, Employee, and Supplier lists and confirm the shared workspace strip marks the current section, keeps its own filter/pagination state per page, and scrolls only the strip rather than the full page on narrow screens.
- [ ] Update a safe non-secret setting and confirm audit log entry.
- [ ] Review system logs and readable before/after details.
- [ ] Review readiness checks.
- [ ] Review storage governance summary.
- [ ] Create or edit a role permission set.
- [ ] Confirm a user without admin permission cannot access admin menus.
- [ ] Confirm AD/LDAP Login default role selector shows active roles and warns if the saved role key is missing.
- [ ] Confirm topbar avatar/name match the signed-in admin user.

## asset_admin / IT Staff

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
- [ ] On Dashboard, confirm the cross-scope KPI, urgent-work card, and review panel show active assets held or located outside the owner/tag scope, and confirm each drilldown opens Asset Register with the expected `crossScope` filter.
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
- [ ] On Asset Detail, click section shortcuts such as `หมายเหตุ` and `ตรวจนับ`; confirm the target section scrolls inside the app content area and no large blank bottom area stays pinned on screen.
- [ ] On Asset Detail, switch between `ภาพรวม`, `การถือครอง`, `การดำเนินการ`, and `ตรวจนับ`; confirm exactly one tab row is visible and each tab shows only its relevant information group without changing asset, custodian/responsibility, or permission-controlled data. Run checkout, check-in, and transfer once each and confirm a review dialog shows the asset, destination/counterpart, resulting status, and evidence summary before the existing save request is sent.
- [ ] On Asset Detail mobile, confirm the header More menu contains secondary actions while the fixed bottom actions show only current lifecycle actions; edit, print, evidence, and navigation controls must not be duplicated in the bottom bar.
- [ ] On Asset Detail at 390px, confirm the first viewport shows Asset Tag/name, status, condition, current location, and current responsibility once without a repeated summary-card strip. Confirm the icon-only Back action has an accessible name and one, two, or three visible lifecycle actions fill the bottom bar without empty fourth-column space.
- [ ] On Asset Detail mobile, switch all four tabs and confirm the active tab scrolls into view, tabs snap cleanly, and the right-edge cue disappears after reaching the final tab. Confirm there is no body-level horizontal scrolling at 390px and 768px.
- [ ] On Asset Detail Overview, confirm `สิ่งที่ต้องติดตาม` is absent for a healthy asset, appears only for actionable exceptions, and exposes the complete data-quality checklist through one expandable detail surface. Confirm audit activity uses translated status/result labels rather than raw values such as `pending`.
- [ ] On Asset Detail `การถือครอง`, verify the relationship map retains parent, current asset, and child-component meaning. Desktop should use three lanes; mobile should use a vertical flow with directional connectors. Confirm each relationship card is keyboard/click accessible, Asset Tags remain fully readable, the first five child rows are visible, and `ดูอีก N รายการ` reveals every remaining component.
- [ ] Switch Asset Detail between Overview, Custody, Operations, and Audit and confirm each view loads and renders its owned history without losing files from the Evidence Center. Open the Evidence Center from every view and verify checkout/check-in, maintenance, audit finding, disposal, purchase, and direct asset evidence remain discoverable where present.
- [ ] From Asset Detail `การถือครอง`, open `จัดการส่วนควบ`, scan a component label or search at least two characters, select a candidate, enter role/details/evidence, review, and install it. Confirm success identifies the installed Asset Tag and offers `เพิ่มส่วนควบอีกชิ้น`; returning goes to the same asset custody tab. Confirm a shorter search makes no candidate request, history initially shows a bounded list with `แสดงประวัติเพิ่มเติม`, and removal opens one in-app dialog with optional reason/evidence. With a view-only role, confirm install/remove controls are absent while relationship/history inspection remains available.
- [ ] On a mobile device, confirm `/th/asset-management/scan` defaults to the generic rear camera option, shows an undistorted 4:3 camera preview and smaller square QR guidance frame; center only the QR code in the frame, adjust distance until the QR is sharp, and confirm the scanned asset detail opens. On supported devices, confirm flashlight plus 1x/2x/3x zoom controls appear inside the existing preview, 1x returns to unzoomed without closing the camera, and unsupported devices hide unavailable controls. Asset QR mode should decode from the native-resolution video frame through ZXing without native `BarcodeDetector`, `html5-qrcode` CSS-pixel canvas downsampling, or mirror-flip retries.
- [ ] Confirm Serial Number scanner inputs scan manufacturer QR/barcode labels with the 16:9 scan-line guide, native-resolution ZXing multi-format decoder, optional browser `BarcodeDetector` fallback, focused internal scan-band crops, and direct crop `ImageData` ZXing fallback; center the barcode band on the line, make the bars fill most of the frame, and adjust distance until the lines are sharp.
- [ ] Check-out an asset.
- [ ] Check-in an asset.
- [ ] For a legacy/imported asset that has a current custodian but no open checkout, search the Check-in `ข้อมูลเก่า` panel by Asset Tag/holder/location, create the backfilled handover, and complete the normal return form; confirm the activity/audit history includes `legacy_return_backfill`.
- [ ] Transfer an asset.
- [ ] On Maintenance, switch between `ตาราง` and `บอร์ด`, confirm the current search/status filters remain in the URL, and verify both layouts show the same ticket set and open the same ticket detail workflow.
- [ ] On Maintenance Repair Tickets, verify exact range/total and 25/50/100 pagination, KPI drilldowns, active filter chips, invalid date feedback, tab-specific `เปิดใบแจ้งซ่อม`, and that `open`/`closed` board filters offer the complete table instead of silently omitting rows.
- [ ] Using keyboard only, open status, planning, close, attachment-delete, and PM state dialogs; verify initial focus, Tab containment, Escape dismissal when not saving, focus restoration, visible focus rings, and 390px mobile layout without body overflow. In the status dialog, confirm no radio is selected initially, Save is disabled, arrow/Space keys select a native radio row, and each choice exposes its consequence text without relying on color alone.
- [ ] Open `แก้ไขผู้รับผิดชอบและกำหนดเสร็จ` on an editable ticket and confirm Save starts disabled. Change only the assignee, then only the due date, and confirm the repair status and asset lifecycle do not change. Reopen it, clear each planning field, save, and confirm the cleared values persist. Submit a stale planning dialog after another operator updates the ticket and confirm a localized conflict message appears without a partial update.
- [ ] Move a repair ticket to `waiting_parts` and `waiting_vendor` without a remark and confirm both the UI and direct API request reject it with localized guidance (`MAINTENANCE_WAITING_REMARK_REQUIRED`) and no status/asset mutation. Add a meaningful remark and confirm the transition succeeds.
- [ ] Move a ticket to `completed` and confirm the status dialog does not offer `closed`; verify closure is available only through the existing close checklist and still requires its evidence/result/return-date/inspector fields.
- [ ] On Disposal, verify pending requests offer only the review action to approvers, approved requests offer only actual-execution action to permitted operators, and completed/rejected requests offer a detail link. Confirm this does not bypass the existing approval or execution forms.
- [ ] As a normal permitted executor without `system_admin`, attempt to execute an approved historical request with no evidence. Confirm the normal evidence requirement blocks execution and the historical-evidence exception cannot be authorized.
- [ ] As `system_admin`, execute an approved historical request with no item or shared batch evidence using a reason of at least 20 characters and the acknowledgement. Confirm the request still observes approval, execution permission, SOD, disposal-type fields, and the final Disposed/Retired status rule.
- [ ] For a request with item evidence and for a batch child with shared batch evidence, attempt the historical-evidence exception. Confirm both attempts are rejected and ordinary evidence-backed execution remains available.
- [ ] After a successful historical-evidence exception, open the completed disposal detail and its print view. Confirm both show the historical-evidence exception, reason, granting user, and grant time.
- [ ] Inspect the disposal audit log for the successful exception. Confirm it records the distinct historical-without-evidence execution action, effective evidence count, reason, granting user, and grant time.
- [ ] Upload and preview asset evidence.
- [ ] On Asset Detail, confirm model/asset preview photos stay compact in the side rail, the `รูปและไฟล์` section initially shows only the preview set, and expanding/collapsing extra photos or files keeps preview, download, and delete actions available.
- [ ] On Asset Detail, open the Evidence Center from the top action row and confirm it works as a drawer-based file index with source filters instead of a duplicate page section; the Timeline remains the place to review event history.

## auditor

- [ ] Create or open an assigned audit round.
- [ ] Preview audit-round candidates before creation.
- [ ] Create an audit round where a selected parent asset has installed components; confirm preview shows the component count and the created round has separate audit items for the parent and components.
- [ ] Scan the parent asset and confirm the scan page shows installed components with their own statuses. Confirming a component with parent should save immediately without requiring a note, update only the component audit item, and show `ยืนยันกับทรัพย์สินหลัก`. For a component that cannot be scanned, tap `ไม่พบ` and confirm an in-app dialog opens, allows saving without a remark, optionally accepts an evidence photo, and creates/updates the component not-found finding for review.
- [ ] Move or transfer a parent asset with installed components and confirm active installed components receive supported field updates plus component movement rows.
- [ ] Scan an expected asset.
- [ ] On a mobile device, confirm `/th/audit/rounds/{id}/scan` can scan the same printed Asset Label QR, pauses the camera after the QR read, locks the selected audit item with the `ล็อกเป้าหมายแล้ว` badge, keeps the raw QR URL only in the latest-decoded panel, and does not navigate away from the audit workflow.
- [ ] After selecting an audit asset, confirm the scan page shows system data for comparison: current location, custodian, department, and condition.
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
- [ ] Approve the field mismatch finding as an audit reviewer and confirm the master asset data and movement log update only after approval.
- [ ] Scan or enter an unknown QR/asset code and confirm it is shown as an unknown asset/not found in system, not as a not-found audit item.
- [ ] Record not-found result from the pending list or zone queue for an expected item that cannot be physically located. On mobile, confirm the action opens an in-app dialog instead of a browser prompt, allows saving without a remark, optionally accepts an evidence photo, and creates the pending not-found Finding for review.
- [ ] If an item previously marked not found is later scanned, confirm the found-later recovery flow resolves it through the existing audit scan behavior.
- [ ] Attach multiple free-form audit evidence photos, confirm the optional tag selector includes general evidence plus checklist labels, and confirm all queued photos remain listed before saving.
- [ ] Retry offline/resume queue if available in the test device.
- [ ] Real-device follow-up: validate Android/iPhone camera permission, torch/zoom, offline-photo retry, keyboard opening, rotation, and safe-area clearance. The controller browser check is not a substitute for these scenarios.

## audit_reviewer

- [ ] Review audit findings.
- [ ] Open `/th/audit/findings` and confirm the resolution summary cards, quick filters, system-vs-found comparison, evidence attachment links, and Excel/PDF exports use the same selected queue.
- [ ] Confirm `/th/audit/findings` shows only compact loaded-at metadata during normal use and switches to a stale-data warning after the configured stale period.
- [ ] If master asset data changes after a finding is reported, approving a correctable finding shows a conflict warning and requires explicit confirmation before applying the correction.
- [ ] Approve or resolve a finding.
- [ ] Confirm segregation-of-duties guard blocks self-review where applicable.
- [ ] Review round progress.
- [ ] From `/th/audit/rounds`, apply a quick filter/search, open round detail, open Scan and Pending from that round, then use Back and confirm the browser returns to the same round detail and filtered rounds list context.
- [ ] Close an audit round.
- [ ] Cancel a test audit round from the round detail page, enter a reason, and confirm the round shows `ยกเลิก`/read-only state. Confirm cancellation time/user/reason are visible, scan, pending, edit result, review/close actions, operational queues, and active exports no longer include that cancelled round, while historical audit items, scan history, findings, evidence, and already-applied corrections are preserved and not rolled back.

## accounting

- [ ] Review asset cost/accounting fields.
- [ ] Review depreciation/book-value report.
- [ ] Export reports.
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
- [ ] Check-out asset, check-in with `Pending Repair`, and create maintenance follow-up.
- [ ] Create maintenance ticket, open it from a filtered maintenance list, print/open detail, then confirm Back returns to the same list tab/filter before closing the ticket and verifying asset detail maintenance history.
- [ ] Create a corrective repair ticket and verify `Pending Repair -> Under Maintenance -> Ready/Pending Disposal`. Attempt a duplicate/concurrent create and a stale status update; verify no partial asset/ticket mutation and a localized recovery message.
- [ ] Close a corrective ticket with evidence, then verify existing evidence cannot be deleted. As a maintenance editor, add a post-close addendum and confirm the audit record identifies it as post-close.
- [ ] Create PM plan, generate due PM ticket, and verify no duplicate ticket is created for the same due occurrence. Move the PM work order through closure and confirm the asset status never changes and no asset-status field is requested.
- [ ] On a PM-generated work order, update status and separately edit/clear assignee and due date. Confirm the PM status consequence states that the asset lifecycle is unchanged, and verify neither action changes the asset status or PM plan state. Repeat both dialogs at 390px and confirm one-column layout, 44px touch targets, readable Thai copy, and no body-level horizontal overflow.
- [ ] Pause a PM plan and confirm generation stops; resume it and confirm it becomes eligible again; end another plan and confirm it remains visible but cannot be resumed or edited. Leave one active plan without an owner and confirm `Automation blocked` is visible and scheduled generation skips it.
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

- [ ] A user without maintenance permission cannot create or close maintenance jobs.
- [ ] A user without disposal permission cannot approve disposal.
- [ ] A user without audit permission cannot close audit rounds.
- [ ] A user without admin permission does not see admin menus and sees the access denied page for direct system settings/log URLs.
- [ ] Direct API access returns unauthorized or forbidden for restricted actions.
- [ ] A user cannot review an audit finding they reported if segregation-of-duties rules apply.

## Shell Presentation UAT

- [x] At 375x812, the mobile sidebar was closed off-canvas by default; its drawer opened and closed correctly, long Thai labels fit, and the body did not overflow.
- [x] At 768x1024, the mobile/tablet shell fit with the sidebar off-canvas and no body overflow.
- [x] At 1280x800 and 1440x900, the desktop sidebar measured 256px and aligned with the topbar/main; when collapsed it measured 64px, the topbar/main shifted correctly, the nested Asset menu expanded, and the body did not overflow.
- [x] Visual theme verification: Navy `#0F172A` sidebar, white topbar, blue active state, and readable text. Screenshots are retained as ignored evidence under `.superpowers/sdd/screenshots/task-3`.

## Mobile Field Navigation UAT

- [x] At 375x812 and 390x844, Asset Register showed one Mobile Field Navigation dock, no contextual Audit action bar, no body overflow, and all five visible targets measured at least 44px high.
- [x] At 768x1024 the field dock remained visible while the desktop Sidebar was still off-canvas; at 1024x800 the field dock was hidden and the 256px desktop Sidebar was visible. Confirm there is no navigation gap across the `lg` breakpoint.
- [x] Confirm `หน้าหลัก`, `ทรัพย์สิน`, `สแกน`, and `ตรวจนับ` use existing routes and `เพิ่มเติม` opens the existing RBAC-filtered Sidebar.
- [x] Confirm General Asset Scan and `/th/audit/rounds/{id}/scan` hide Mobile Field Navigation before any target is selected.
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
