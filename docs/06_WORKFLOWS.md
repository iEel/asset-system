# Workflows

## Asset Registration

- Add a single asset from `/assets/new`.
- Clone an existing asset from Asset Register or Asset Detail when adding another similar asset. The clone flow opens `/assets/new?cloneFrom={assetId}`, copies shared master, ownership, location, purchase, warranty, custom-field, and linked purchase-document data, but leaves Asset Tag, Serial Number, and FA/accounting code blank for the new record.
- Add a batch of assets from the same page using shared purchase/master data plus row-level serial/manual asset tag/custodian/remark data.
- Single and batch create auto-select the model when the selected category and brand uniquely match one active model; users can still choose a specific model when more than one exists.
- Import legacy assets from Excel through the import/export tools.
- Asset tags may be manually entered for legacy assets or auto-generated when left blank.
- Use the Asset Register quick filters for common operational queues such as missing Serial, missing photo, purchase-info gaps, warranty expiring, missing responsibility, Ready, Pending Repair, and Under Maintenance. Quick filters update the URL and preserve the current search/company/branch/category context.
- Asset Register accepts drilldowns from master data counts: category asset counts open the register with `categoryId`, brand asset counts open it with `brandId`, and model asset counts open it with `modelId`. Active Brand/Model drilldowns appear as removable chips above the register filters and stay preserved when applying additional filters.
- The Asset Register filter panel is laid out as a balanced desktop grid: search spans two columns, context filters fill the first row, and status, condition, ownership type, rows-per-page, and the filter action fill the second row. Status and condition stay grouped together with compact help icons.
- The Asset Register search box can find assets by Asset Tag, name, Serial, Fixed Asset Code, master-data codes, custodian name, and the current custodian's employee code. It intentionally searches only the current holder's `Employee.code`, not repair reporters, repair assignees, or other employees related through history.
- The register Import Wizard starts collapsed so daily list work is not pushed down by the import flow; open it only when importing Excel. Table column presets let users switch between All, Operations, Accounting, and Audit views, and the selected columns are remembered in that browser.
- Opening asset detail, edit, or clone from the register preserves the current register URL through a sanitized `returnTo` value. Back, cancel, and save actions return to the same page, filters, sort, and search state instead of resetting the operator to the first page.
- Company and branch on the asset form are the asset owner/tag scope; they drive generated asset tags and reporting/accounting scope.
- Custodian defaults to the selected owner company/branch/department scope, but the form can opt in to cross-company custodians for cases where the asset owner and current holder are different organizations.
- When editing an existing asset, a saved custodian outside the owner company/branch/department scope automatically opens the cross-company custodian mode so the current holder remains visible and can be reviewed before saving.
- Cross-company custodian selections show an explicit warning and are recorded in the creation audit trail. Batch create follows the same model for shared owner/tag scope plus common or row-level custodian values.
- Home/current location defaults to the selected owner branch, but single and batch create can opt in to cross-branch locations when the physical site differs from the branch used for Asset Tag ownership. Cross-branch mode warns the operator and appends each location's branch label in the dropdown to avoid ambiguous repeated location codes.
- Clone sessions show a warning banner reminding users to review custodian, location, purchasing data, and linked documents before saving. Batch mode is hidden during a clone session so the prefilled single-asset draft is not lost by switching modes.

## Asset Scan And Labels

- Print Asset Label QR codes from the label workflows, using the configured Public QR Base URL when printing for production.
- Use `/asset-management/labels` for high-volume label preparation. The unprinted/printed/recent queue can be filtered by company, branch, category, location, and created date; branch/location choices include hierarchy context so repeated branch or location names stay distinguishable. Selected labels can be sorted by selection order, Asset Tag, location, or category before printing.
- Label queue titles use the asset name first and only append brand/model text when it adds new information, avoiding repeated strings when the asset name already contains the brand or model. The Brother tape guidance on print pages keeps a dynamic tape-size placeholder so changing the print profile still updates the instruction text safely.
- Use `/asset-management/scan` for field lookup of printed Asset Labels. This page is QR-first, recognizes `/q/a/{assetId}` resolver URLs, stops the camera after a successful read, and opens the asset detail automatically.
- On mobile, the Asset Label scanner uses an undistorted 4:3 camera preview with a smaller square QR guidance frame. It defaults to the generic environment-facing rear camera when multiple devices are reported, requests 1280x960/30fps with continuous focus/exposure where supported, and applies best-effort zoom where available so users can hold the label slightly farther away while keeping the QR large. Asset QR decoding uses a shared direct `getUserMedia` stream plus ZXing `BrowserQRCodeReader.decode(video)` so it reads the native-resolution video frame rather than the CSS-pixel hidden canvas used by `html5-qrcode`; this avoids mobile native detector gaps and mirror-flip retries. Users should center only the QR code in the frame and adjust distance until the QR modules are sharp. Reusable Serial Number scanner inputs use the same native-resolution camera path with ZXing `BrowserMultiFormatReader`, optional browser `BarcodeDetector`, focused scan-band crops that decode crop `ImageData` directly through ZXing `RGBLuminanceSource`/`BinaryBitmap` before full-frame fallback, QR plus common 1D/2D barcode formats, a 16:9 preview, and a narrow barcode guide with scan line for manufacturer labels; users should center the barcode band on the line, make the bars fill most of the frame, and keep the barcode lines sharp.

## Asset Custody

- Check-out records who receives the asset and captures handover evidence.
- Check-in records return and receiving parties and can route the asset to Ready, Pending Repair, or Pending Disposal.
- Transfer records location/custodian/department movement.
- Checkout and transfer are the normal workflows for custody changes after registration; the asset owner company/branch remains the tag, reporting, and accounting scope unless the asset master data is intentionally edited.
- Asset Detail shows a unified activity/custody timeline.
- Asset Detail relationship map shows parent/component structure as a three-lane read-only map: what the current item is installed under, the current item, and any components installed under it. The status summary states whether the current item is a parent asset, component, both, or standalone. Relationship cards prioritize the full Asset Tag, then asset name, then role/category metadata so users can identify records without relying on truncated labels.

## Audit Counting

- Create audit rounds from filtered asset candidates.
- Preview candidates before creating a round.
- The audit rounds list is action-first for large counting workloads: the page summarizes next actions for continuing scans, reviewing mismatches, and closing ready rounds, and exposes quick filters for all/open/pending/review/mismatch/ready-to-close rounds. Switching quick filters updates the URL-backed view without jumping the dashboard scroll position back to the top.
- Opening audit round detail, pending list, or scan from `/audit/rounds` preserves the current rounds view/search through a sanitized `returnTo` value. The scan and pending pages return to the round detail, and the round detail returns to the originating rounds list context.
- Scan printed Asset Label QR codes or manually enter asset identifiers. The Audit Scan camera uses the same native-resolution Asset QR decoder as `/asset-management/scan`, but keeps continuous scan behavior for counting multiple labels in one session.
- After an asset is selected, the scan page shows the system data that auditors need for field comparison: current location, custodian, department, and condition.
- In fast walking mode, auditors choose `ข้อมูลตรง` to save a matched result immediately, or `ข้อมูลไม่ตรง` to open the detailed actual-value fields. When actual field data differs from expected data, the scan result must include at least one evidence photo before it can be saved.
- Audit photo evidence is free-form and optional for matched results. Auditors can add multiple photos and optionally tag them as general evidence, checklist labels, Serial Number, or Asset Tag for easier review.
- Record found, mismatch, not-found, out-of-scope, and correction cases.
- Review findings and close rounds with segregation-of-duties protection.
- Use `/audit/findings` as the Findings Resolution Center after field scanning. The page groups existing audit findings into pending review, open action, overdue, and closed queues, shows system-vs-found values together, keeps review/action/closure controls in place, and exports Excel/PDF with the same active filters.
- Disposal follow-up links opened from `/audit/findings` carry the current findings queue/search as a sanitized return context so reviewers can return to the same resolution queue after the disposal workflow.

## Maintenance And PM

- Create repair tickets from the maintenance page or asset quick actions.
- Opening a repair ticket sets the asset to `Pending Repair` when that active status exists. The create-ticket form/API should not require `returnDate`; `returnDate` is collected when the repair is closed.
- Opening maintenance ticket detail or print from a filtered maintenance list preserves the current tab, status, search, and asset filter through a sanitized `returnTo` value. Ticket detail exposes a Back action to that originating list context.
- Track status, SLA, evidence, costs, assignee/vendor, close checklist, and inspector.
- Close maintenance by choosing whether the asset returns to `Ready` or should move to `Pending Disposal`. Do not use the generic asset edit form for protected repair/disposal status changes.
- Create Preventive Maintenance plans.
- Scheduled PM generation uses the scheduler heartbeat and web-configured schedule.
- PM history is visible from related asset detail flows.

## Disposal

- Create disposal requests from disposal module, maintenance, audit findings, or asset quick actions.
- Opening disposal request detail or print from a filtered disposal list preserves the current status/search filter through a sanitized `returnTo` value. Request detail exposes a Back action to that originating list context.
- Duplicate open requests are guarded.
- Approval and actual execution are separated.
- Execution captures evidence, recipient/buyer/destination, document number, actual value, and completion date.

## Reports And Export

- Asset register export and report exports use current filters where supported.
- Audit, disposal, maintenance, and asset overview exports support operational review.
- PDF output uses bundled Thai fonts unless production overrides are configured.

## Admin Operations

- Brand / Model master data uses a compact brand navigator beside the model workspace. Users choose a brand on the left, then search/filter/edit models on the right without scrolling through a separate brand table; the navigator is intentionally narrow on desktop so the model table keeps more usable width and avoids unnecessary horizontal scrolling. The visible brand counts use active model and active asset group counts, matching the model table and avoiding soft-deleted model mismatches. Count links support drilldown: model counts select/open the matching model workspace, brand asset counts open Asset Register filtered by brand, and model asset counts open Asset Register filtered by model.
- Supplier master data treats the supplier code field as `Tax ID / Supplier Code`; Thai labels emphasize `เลขประจำตัวผู้เสียภาษี / รหัสผู้ขาย` while still allowing legacy supplier codes.
- Category master data uses soft delete with unique codes: recreating a deleted category reactivates the inactive row, referenced categories cannot be deleted or deactivated, and custom-field templates can be edited while the category remains active. New category creation uses a create-only custom-field template payload, while updates/reactivations use template replacement, so categories can be added even when the template list is empty. Category model and asset counts drill into the filtered Brand/Model workspace or Asset Register instead of being passive numbers.
- Manage users, roles, permissions, workflow policy, notifications, LDAP settings, scheduler settings, readiness checks, storage governance, and system logs.
- Asset Tag Prefix settings are managed as prefix groups: enter one Prefix, search/select available categories on the left, move selected categories to the right, then save. The UI writes the existing `categoryId -> prefix` setting format, filters stale/inactive category ids out of visible group counts, and categories still use the configured prefix during generated asset tags while falling back to category code when unassigned.
- Depreciation policy is configured in Settings as a policy builder: admins set straight-line defaults, assign active categories to policy groups, preview monthly depreciation and net book value, and can inspect the generated JSON in advanced mode. Reports still use purchase date as the depreciation start date.
- Storage Governance dry-run actions show an action column for archive/review decisions. Only orphan file actions expose the archive button, and translation coverage tests guard every storage page message key in Thai and English.
- System logs present readable record labels and before/after summaries where available.
