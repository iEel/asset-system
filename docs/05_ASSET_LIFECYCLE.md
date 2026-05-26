# Asset Lifecycle

This document describes the intended asset status lifecycle and the validation points that should be kept aligned with API behavior.

## Main Statuses

Seed data currently includes these operational statuses:

- Draft
- Ready
- In Use
- Reserved
- Checked Out
- In Transit
- Under Maintenance
- Pending Repair
- Under Inspection
- Lost
- Missing
- Pending Disposal
- Disposed
- Retired

## Allowed Transitions

| From | To | Trigger |
|---|---|---|
| Draft | Ready | Asset registration completed |
| Ready | Checked Out | Check-out / handover |
| Checked Out | Ready | Check-in / return with normal result |
| Checked Out | Pending Repair | Check-in / return with repair needed |
| Checked Out | Pending Disposal | Check-in / return with disposal recommendation |
| Ready | Under Maintenance | Maintenance job starts or asset is taken for service |
| Pending Repair | Under Maintenance | Repair ticket is accepted / in progress |
| Under Maintenance | Ready | Maintenance job closed and asset is usable |
| Under Maintenance | Pending Disposal | Maintenance result recommends disposal |
| Ready | Pending Disposal | Disposal request opened |
| Pending Disposal | Disposed | Disposal execution completed |
| Pending Disposal | Retired | Retirement completed |
| Ready | Lost / Missing | Audit or operational investigation marks unresolved loss |
| Lost / Missing | Ready | Finding resolved and asset is confirmed usable |

## Current Code Enforcement

- Check-out requires `asset:edit`, loads active assets only, and blocks an asset that already has an active checkout.
- Check-out sets asset status to `Checked Out` using `getRequiredAssetStatusId("Checked Out")`.
- Check-in requires `asset:edit`, requires an active checkout, and only accepts return statuses from `Ready`, `Pending Repair`, and `Pending Disposal`.
- Check-in can create a maintenance ticket only when the return status is `Pending Repair` and the user has `maintenance:create`.
- Transfer requires `asset:edit` and blocks assets that already have an active checkout.
- Default audit-round target selection excludes `Disposed` and `Retired` unless the user explicitly includes closed assets.
- Audit status dropdowns hide closed statuses by default to avoid confusing “all assets” with disposed/retired assets.

## API Validation Rules To Preserve

- An asset with an active checkout must not be checked out again.
- An asset with an active checkout must not be transferred through the normal transfer flow.
- Check-in must be tied to an active checkout.
- Check-in next status must be one of `Ready`, `Pending Repair`, or `Pending Disposal`.
- Maintenance ticket creation from check-in must require `Pending Repair`.
- Default audit target selection must exclude `Disposed` and `Retired`.

## Validation Recommendations

These are recommended hardening items for future work. They should be implemented with tests before changing production workflow behavior.

- Disposed assets should not be checked out.
- Retired assets should not be checked out.
- Pending Disposal assets should not be transferred without an explicit privileged workflow.
- Under Maintenance assets should not be checked out unless the workflow explicitly returns them to service first.
- Lost or Missing assets should require a review/resolve workflow before check-out.
- Disposal execution should be the only normal workflow that moves an asset to `Disposed`.
- Maintenance close should document whether the asset returns to `Ready` or moves to `Pending Disposal`.

## Audit Behavior

When creating an audit round with “all assets”, the system should mean all active, countable assets. Closed statuses are handled separately:

- `Disposed` and `Retired` are excluded from default audit targets.
- The UI should not show closed statuses in the normal status dropdown unless the user explicitly includes closed assets.
- `Lost` and `Missing` are not the same as closed statuses; they can still be operationally relevant and should be reviewed according to audit policy.
