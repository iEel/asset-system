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
- [ ] Add assets by batch.
- [ ] Enter a manual asset tag for a legacy asset.
- [ ] Leave asset tag blank and confirm auto-generation.
- [ ] Import assets from Excel.
- [ ] Export asset register.
- [ ] Print QR labels.
- [ ] Scan QR and open asset detail.
- [ ] On a mobile device, confirm `/th/asset-management/scan` shows an undistorted 4:3 camera preview and smaller square QR guidance frame; center only the QR code in the frame, move close enough for the QR to be sharp, and confirm the scanned asset detail opens.
- [ ] Confirm Serial Number scanner inputs still scan manufacturer QR/barcode labels with the wider barcode-friendly preview.
- [ ] Check-out an asset.
- [ ] Check-in an asset.
- [ ] Transfer an asset.
- [ ] Upload and preview asset evidence.

## auditor

- [ ] Create or open an assigned audit round.
- [ ] Preview audit-round candidates before creation.
- [ ] Scan an expected asset.
- [ ] Record found/matched result.
- [ ] Record mismatch result.
- [ ] Record not-found result.
- [ ] Attach photo evidence if required.
- [ ] Retry offline/resume queue if available in the test device.

## audit_reviewer

- [ ] Review audit findings.
- [ ] Approve or resolve a finding.
- [ ] Confirm segregation-of-duties guard blocks self-review where applicable.
- [ ] Review round progress.
- [ ] Close an audit round.

## accounting

- [ ] Review asset cost/accounting fields.
- [ ] Review depreciation/book-value report.
- [ ] Export reports.
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
- [ ] Create maintenance ticket, close ticket, and verify asset detail maintenance history.
- [ ] Create PM plan, generate due PM ticket, and verify no duplicate ticket is created for the same due occurrence.
- [ ] Create disposal request, approve it, execute disposal, and confirm asset is no longer counted in default audit target selection.
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
