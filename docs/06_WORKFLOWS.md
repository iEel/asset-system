# Workflows

## Asset Registration

- Add a single asset from `/assets/new`.
- Add a batch of assets from the same page using shared purchase/master data plus row-level serial/manual asset tag/custodian/remark data.
- Import legacy assets from Excel through the import/export tools.
- Asset tags may be manually entered for legacy assets or auto-generated when left blank.

## Asset Custody

- Check-out records who receives the asset and captures handover evidence.
- Check-in records return and receiving parties and can route the asset to Ready, Pending Repair, or Pending Disposal.
- Transfer records location/custodian/department movement.
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

- Manage users, roles, permissions, workflow policy, notifications, LDAP settings, scheduler settings, readiness checks, storage governance, and system logs.
- System logs present readable record labels and before/after summaries where available.
