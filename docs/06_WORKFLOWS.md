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

## Asset Custody

- Check-out records who receives the asset and captures handover evidence.
- Check-in records return and receiving parties and can route the asset to Ready, Pending Repair, or Pending Disposal.
- Transfer records location/custodian/department movement.
- Checkout and transfer are the normal workflows for custody changes after registration; the asset owner company/branch remains the tag, reporting, and accounting scope unless the asset master data is intentionally edited.
- Asset Detail shows a unified activity/custody timeline.

## Audit Counting

- Create audit rounds from filtered asset candidates.
- Preview candidates before creating a round.
- Scan QR/barcode or manually enter asset identifiers.
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

- Brand / Model master data exposes Create Brand and Create Model actions at the top of the page, with the Create Model action repeated in the model list section for users already reviewing models.
- Supplier master data treats the supplier code field as `Tax ID / Supplier Code`; Thai labels emphasize `เลขประจำตัวผู้เสียภาษี / รหัสผู้ขาย` while still allowing legacy supplier codes.
- Category master data uses soft delete with unique codes: recreating a deleted category reactivates the inactive row, referenced categories cannot be deleted or deactivated, and custom-field templates can be edited while the category remains active.
- Manage users, roles, permissions, workflow policy, notifications, LDAP settings, scheduler settings, readiness checks, storage governance, and system logs.
- System logs present readable record labels and before/after summaries where available.
