# UAT Checklist

Use this checklist with realistic master data and at least one asset in each important ownership/status case. Record test evidence, tester, date, and issue links outside this file according to the organization's UAT process.

## system_admin

- [ ] Login successfully.
- [ ] Open Admin Settings.
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
- [ ] On a mobile device, confirm `/th/asset-management/scan` defaults to the generic rear camera option, shows an undistorted 4:3 camera preview and smaller square QR guidance frame; center only the QR code in the frame, adjust distance until the QR is sharp, and confirm the scanned asset detail opens. On supported devices, confirm flashlight plus 1x/2x/3x zoom controls appear inside the existing preview, 1x returns to unzoomed without closing the camera, and unsupported devices hide unavailable controls. Asset QR mode should decode from the native-resolution video frame through ZXing without native `BarcodeDetector`, `html5-qrcode` CSS-pixel canvas downsampling, or mirror-flip retries.
- [ ] Confirm Serial Number scanner inputs scan manufacturer QR/barcode labels with the 16:9 scan-line guide, native-resolution ZXing multi-format decoder, optional browser `BarcodeDetector` fallback, focused internal scan-band crops, and direct crop `ImageData` ZXing fallback; center the barcode band on the line, make the bars fill most of the frame, and adjust distance until the lines are sharp.
- [ ] Check-out an asset.
- [ ] Check-in an asset.
- [ ] For a legacy/imported asset that has a current custodian but no open checkout, search the Check-in `ข้อมูลเก่า` panel by Asset Tag/holder/location, create the backfilled handover, and complete the normal return form; confirm the activity/audit history includes `legacy_return_backfill`.
- [ ] Transfer an asset.
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
- [ ] Before scanning or selecting an asset, confirm the scan/manual entry panel is the most prominent area and includes short helper copy for starting the audit scan.
- [ ] Tap `คิวรอตรวจ {count}` from the sticky header and confirm a collapsible inline pending queue preview opens from the same audit round. Confirm each pending card shows expected location plus custodian/department where applicable. Collapse and reopen the queue, then select an item and confirm it loads for review while marking not found still happens from the full pending list/zone queue. Open the full pending list and confirm `กลับ` returns to the scan page that launched it. On mobile, confirm the full pending list can search by Asset Tag/name/location/custodian and each card has clear actions to scan that item, view the asset, or mark not found.
- [ ] Without scanning, type at least two characters such as part of an Asset Tag into the manual scan input and confirm suggestion cards appear from the current round by Asset Tag/name/location/custodian/department. If multiple cards match, the manual action should ask the user to choose one; QR scan behavior must still resolve only exact QR/Asset Tag values.
- [ ] Open the manual item picker and confirm it is collapsed by default, searchable by Asset Tag/name/location/custodian/department, and does not show the old long native asset dropdown.
- [ ] Confirm the Audit Scan camera section does not show normal `สถานะกล้อง` / `พร้อมเปิดกล้อง` text or camera selector controls before scanning; camera utilities should appear only while scanning, after a decoded QR reference exists, or when a camera issue is shown.
- [ ] On a supported mobile device, start the Audit Scan camera in a low-light area and confirm the flashlight button appears, can toggle on/off, and turns off after closing the scanner or switching cameras. On unsupported devices, confirm the flashlight control is hidden instead of disabled noise.
- [ ] On a supported mobile device, start the Audit Scan camera and confirm 1x, 2x, and 3x zoom buttons appear inside the existing scanner preview. Tap 2x/3x to enlarge the QR, then tap 1x and confirm the preview returns to unzoomed without closing the camera or exposing a separate scan mode. On unsupported devices, confirm the zoom controls are hidden instead of disabled noise.
- [ ] Confirm Fast Scan Mode and Continuous Scan are not shown as field-user switches in the normal walking UI; the page should behave as scan-first with target lock after a QR read and should not repeat the old large blue help blocks on mobile.
- [ ] Confirm the post-scan bottom action bar appears only after an asset is selected or scanned, with `บันทึกพบตรง` spanning the first row and `บันทึกข้อมูลไม่ตรง / Finding` plus `เปลี่ยน / สแกนใหม่` grouped below it. There should be no separate evidence-scroll shortcut in the bottom bar.
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
- [ ] Open assigned asset detail if permitted.
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
- [ ] Create PM plan, generate due PM ticket, and verify no duplicate ticket is created for the same due occurrence.
- [ ] Create disposal request, open it from a filtered disposal list, print/open detail, then confirm Back returns to the same list filter before approving/executing disposal and confirming the asset is no longer counted in default audit target selection.
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
