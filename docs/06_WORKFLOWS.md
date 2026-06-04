# Workflows

## Asset Registration

- Add a single asset from `/assets/new`.
- Add a batch of assets from the same page using shared purchase/master data plus row-level serial/manual asset tag/custodian/remark data.
- Single and batch create auto-select the model when the selected category and brand uniquely match one active model; users can still choose a specific model when more than one exists.
- Import legacy assets from Excel through the import/export tools.
- Asset tags may be manually entered for legacy assets or auto-generated when left blank.
- Company and branch on the asset form are the asset owner/tag scope; they drive generated asset tags and reporting/accounting scope.
- Custodian defaults to the selected owner company/branch/department scope, but the form can opt in to cross-company custodians for cases where the asset owner and current holder are different organizations.
- Cross-company custodian selections show an explicit warning and are recorded in the creation audit trail. Batch create follows the same model for shared owner/tag scope plus common or row-level custodian values.

## Asset Scan And Labels

- Print Asset Label QR codes from the label workflows, using the configured Public QR Base URL when printing for production.
- Use `/asset-management/scan` for field lookup of printed Asset Labels. This page is QR-first, recognizes `/q/a/{assetId}` resolver URLs, stops the camera after a successful read, and opens the asset detail automatically.
- On mobile, the Asset Label scanner uses an undistorted 4:3 camera preview with a smaller square QR guidance frame. It defaults to the generic environment-facing rear camera when multiple devices are reported, requests 1280x960/30fps with continuous focus/exposure where supported, and applies best-effort zoom where available so users can hold the label slightly farther away while keeping the QR large. Asset QR decoding uses a shared direct `getUserMedia` stream plus ZXing `BrowserQRCodeReader.decode(video)` so it reads the native-resolution video frame rather than the CSS-pixel hidden canvas used by `html5-qrcode`; this avoids mobile native detector gaps and mirror-flip retries. Users should center only the QR code in the frame and adjust distance until the QR modules are sharp. Reusable Serial Number scanner inputs use the same native-resolution camera path with ZXing `BrowserMultiFormatReader`, QR plus common 1D/2D barcode formats, a 16:9 preview, and a wide barcode guide for manufacturer labels; users should center only the code and keep the barcode lines sharp.

## Asset Custody

- Check-out records who receives the asset and captures handover evidence.
- Check-in records return and receiving parties and can route the asset to Ready, Pending Repair, or Pending Disposal.
- Transfer records location/custodian/department movement.
- Checkout and transfer are the normal workflows for custody changes after registration; the asset owner company/branch remains the tag, reporting, and accounting scope unless the asset master data is intentionally edited.
- Asset Detail shows a unified activity/custody timeline.

## Audit Counting

- Create audit rounds from filtered asset candidates.
- Preview candidates before creating a round.
- Scan printed Asset Label QR codes or manually enter asset identifiers. The Audit Scan camera uses the same native-resolution Asset QR decoder as `/asset-management/scan`, but keeps continuous scan behavior for counting multiple labels in one session.
- Record found, mismatch, not-found, out-of-scope, and correction cases.
- Review findings and close rounds with segregation-of-duties protection.

## Maintenance And PM

- Create repair tickets from the maintenance page or asset quick actions.
- Track status, SLA, evidence, costs, assignee/vendor, close checklist, and inspector.
- Create Preventive Maintenance plans.
- Scheduled PM generation uses the scheduler heartbeat and web-configured schedule.
- PM history is visible from related asset detail flows.

## Disposal

- Create disposal requests from disposal module, maintenance, audit findings, or asset quick actions.
- Duplicate open requests are guarded.
- Approval and actual execution are separated.
- Execution captures evidence, recipient/buyer/destination, document number, actual value, and completion date.

## Reports And Export

- Asset register export and report exports use current filters where supported.
- Audit, disposal, maintenance, and asset overview exports support operational review.
- PDF output uses bundled Thai fonts unless production overrides are configured.

## Admin Operations

- Brand / Model master data uses a compact brand navigator beside the model workspace. Users choose a brand on the left, then search/filter/edit models on the right without scrolling through a separate brand table; the navigator is intentionally narrow on desktop so the model table keeps more usable width and avoids unnecessary horizontal scrolling. The visible brand counts use active model and active asset group counts, matching the model table and avoiding soft-deleted model mismatches.
- Supplier master data treats the supplier code field as `Tax ID / Supplier Code`; Thai labels emphasize `เลขประจำตัวผู้เสียภาษี / รหัสผู้ขาย` while still allowing legacy supplier codes.
- Category master data uses soft delete with unique codes: recreating a deleted category reactivates the inactive row, referenced categories cannot be deleted or deactivated, and custom-field templates can be edited while the category remains active.
- Manage users, roles, permissions, workflow policy, notifications, LDAP settings, scheduler settings, readiness checks, storage governance, and system logs.
- Asset Tag Prefix settings are managed as prefix groups: enter one Prefix, search/select available categories on the left, move selected categories to the right, then save. The UI writes the existing `categoryId -> prefix` setting format, filters stale/inactive category ids out of visible group counts, and categories still use the configured prefix during generated asset tags while falling back to category code when unassigned.
- Depreciation policy is configured in Settings as a policy builder: admins set straight-line defaults, assign active categories to policy groups, preview monthly depreciation and net book value, and can inspect the generated JSON in advanced mode. Reports still use purchase date as the depreciation start date.
- Storage Governance dry-run actions show an action column for archive/review decisions. Only orphan file actions expose the archive button, and translation coverage tests guard every storage page message key in Thai and English.
- System logs present readable record labels and before/after summaries where available.
