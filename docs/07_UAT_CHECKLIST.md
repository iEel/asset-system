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
- [ ] Clone an existing asset from Asset Register or Asset Detail, confirm the create form shows the clone banner, copies shared details, and leaves Asset Tag, Serial Number, and FA/accounting code blank before saving.
- [ ] Add assets by batch.
- [ ] Create a new asset category with no custom-field template and confirm it saves without a Prisma nested-write error.
- [ ] Enter a manual asset tag for a legacy asset.
- [ ] Leave asset tag blank and confirm auto-generation.
- [ ] Import assets from Excel.
- [ ] Export asset register.
- [ ] On Asset Register, confirm quick filters for data-quality gaps and lifecycle statuses update the list while preserving existing search/company/branch/category context.
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
- [ ] Transfer an asset.
- [ ] Upload and preview asset evidence.

## auditor

- [ ] Create or open an assigned audit round.
- [ ] Preview audit-round candidates before creation.
- [ ] Scan an expected asset.
- [ ] On a mobile device, confirm `/th/audit/rounds/{id}/scan` can scan the same printed Asset Label QR in continuous mode, selects the audit item, keeps the raw QR URL only in the latest-decoded panel, and does not navigate away from the audit workflow.
- [ ] After selecting an audit asset, confirm the scan page shows system data for comparison: current location, custodian, department, and condition.
- [ ] Record found/matched result.
- [ ] In fast walking mode, choose `ข้อมูลตรง` and confirm the result saves without requiring a photo.
- [ ] Choose `ข้อมูลไม่ตรง`, change at least one actual field, and confirm the page requires at least one evidence photo before saving.
- [ ] Record not-found result.
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
