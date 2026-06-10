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
- [ ] Add assets by batch.
- [ ] On single and batch asset create/edit, enable cross-branch location mode, choose a home/current location under a different branch, confirm the warning appears, branch labels distinguish repeated location codes, and the generated Asset Tag still follows the owner company/branch.
- [ ] Create a new asset category with no custom-field template and confirm it saves without a Prisma nested-write error.
- [ ] Enter a manual asset tag for a legacy asset.
- [ ] Leave asset tag blank and confirm auto-generation.
- [ ] Import assets from Excel.
- [ ] Export asset register.
- [ ] On Asset Register, confirm quick filters for data-quality gaps and lifecycle statuses update the list while preserving existing search/company/branch/category context.
- [ ] On Asset Register, apply cross-scope quick filters for all cross-scope, custodian different company, custodian different branch, and current location different branch; confirm the list and Asset Register export show matching cross-scope flags and owner/custodian/location branch context.
- [ ] On Dashboard, confirm the cross-scope KPI, urgent-work card, and review panel show active assets held or located outside the owner/tag scope, and confirm each drilldown opens Asset Register with the expected `crossScope` filter.
- [ ] On Asset Register desktop width, confirm the filter panel fills the right side without an empty final column: first row shows search/company/branch/category and second row shows status/condition/ownership/rows/filter action.
- [ ] From Category, Brand, and Brand/Model master data counts, click model/asset counts and confirm the destination opens the expected Brand/Model workspace or Asset Register drilldown with a removable active filter chip where applicable.
- [ ] Search Asset Register by the current custodian's employee code and confirm only assets held by that employee are returned; do not expect matches from repair reporter/assignee history.
- [ ] Confirm Asset Register column presets switch between All, Operations, Accounting, and Audit views and persist after page reload in the same browser.
- [ ] Confirm the Asset Register import helper starts collapsed and opens only after clicking the import helper button.
- [ ] Print QR labels.
- [ ] Scan QR and open asset detail.
- [ ] On a mobile device, confirm `/th/asset-management/scan` defaults to the generic rear camera option, shows an undistorted 4:3 camera preview and smaller square QR guidance frame; center only the QR code in the frame, adjust distance until the QR is sharp, and confirm the scanned asset detail opens. Asset QR mode should decode from the native-resolution video frame through ZXing without native `BarcodeDetector`, `html5-qrcode` CSS-pixel canvas downsampling, or mirror-flip retries.
- [ ] Confirm Serial Number scanner inputs scan manufacturer QR/barcode labels with the 16:9 scan-line guide, native-resolution ZXing multi-format decoder, optional browser `BarcodeDetector` fallback, focused internal scan-band crops, and direct crop `ImageData` ZXing fallback; center the barcode band on the line, make the bars fill most of the frame, and adjust distance until the lines are sharp.
- [ ] Check-out an asset.
- [ ] Check-in an asset.
- [ ] For a legacy/imported asset that has a current custodian but no open checkout, search the Check-in `ข้อมูลเก่า` panel by Asset Tag/holder/location, create the backfilled handover, and complete the normal return form; confirm the activity/audit history includes `legacy_return_backfill`.
- [ ] Transfer an asset.
- [ ] Upload and preview asset evidence.

## auditor

- [ ] Create or open an assigned audit round.
- [ ] Preview audit-round candidates before creation.
- [ ] Scan an expected asset.
- [ ] On a mobile device, confirm `/th/audit/rounds/{id}/scan` can scan the same printed Asset Label QR in continuous mode, selects the audit item, keeps the raw QR URL only in the latest-decoded panel, and does not navigate away from the audit workflow.
- [ ] After selecting an audit asset, confirm the scan page shows system data for comparison: current location, custodian, department, and condition.
- [ ] On a mobile device, confirm the sticky progress header is the only progress summary, shows checked/pending counts plus the photo-queue badge, and that the old metric-card row is not repeated below it.
- [ ] Confirm the Audit Scan camera section does not show normal `สถานะกล้อง` / `พร้อมเปิดกล้อง` text before scanning; camera utilities should appear only while scanning, after a decoded QR reference exists, when multiple cameras can be selected, or when a camera issue is shown.
- [ ] On a supported mobile device, start the Audit Scan camera in a low-light area and confirm the flashlight button appears, can toggle on/off, and turns off after closing the scanner or switching cameras. On unsupported devices, confirm the flashlight control is hidden instead of disabled noise.
- [ ] Confirm the post-scan bottom action bar appears only after an asset is selected or scanned.
- [ ] Scan or manually enter several audit items and confirm the recent-scan list shows the latest outcomes with readable matched/mismatch/out-of-scope/unknown/found-later/offline-queued labels without replacing the saved audit history.
- [ ] Record found/matched result.
- [ ] In fast walking mode, choose `บันทึกพบตรง` and confirm the result saves without requiring a photo.
- [ ] Choose `บันทึกข้อมูลไม่ตรง / Finding`, change at least one actual field, and confirm the page requires at least one evidence photo before saving.
- [ ] Scan an asset that exists in the system but is outside the round and confirm it is shown as Out-of-scope, not as Not Found.
- [ ] Scan or enter an unknown QR/asset code and confirm it is shown as an unknown asset/not found in system, not as a not-found audit item.
- [ ] Record not-found result from the pending list or zone queue for an expected item that cannot be physically located.
- [ ] If an item previously marked not found is later scanned, confirm the found-later recovery flow resolves it through the existing audit scan behavior.
- [ ] Attach multiple free-form audit evidence photos, confirm the optional tag selector includes general evidence plus checklist labels, and confirm all queued photos remain listed before saving.
- [ ] Retry offline/resume queue if available in the test device.

## audit_reviewer

- [ ] Review audit findings.
- [ ] Open `/th/audit/findings` and confirm the resolution summary cards, quick filters, system-vs-found comparison, and Excel/PDF exports use the same selected queue.
- [ ] Approve or resolve a finding.
- [ ] Confirm segregation-of-duties guard blocks self-review where applicable.
- [ ] Review round progress.
- [ ] From `/th/audit/rounds`, apply a quick filter/search, open round detail, open Scan and Pending from that round, then use Back and confirm the browser returns to the same round detail and filtered rounds list context.
- [ ] Close an audit round.

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
