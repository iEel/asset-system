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

## Status Versus Condition

Asset status and asset condition are related but not the same field.

- `AssetStatus` controls workflow and permissions: whether the asset can be checked out, transferred, repaired, disposed, audited, or corrected.
- `AssetCondition` records the physical state observed by users, auditors, or repair staff.
- A damaged condition does not by itself move the asset through the lifecycle. The user still needs to choose the correct workflow, usually maintenance, disposal, audit follow-up, or a controlled status correction.
- Inconsistent combinations should be treated as follow-up work. For example, `Ready` + damaged condition should usually open a maintenance ticket; `Under Maintenance` + good condition should usually be closed back to `Ready`; `Disposed` + good condition remains closed until a privileged business decision changes it.

The application shows this guidance inline through help icons beside status and condition fields on Asset Create/Edit, Asset Detail, Asset Register filters, and Asset Register table headers. Keep these popovers aligned with the workflow rules in this document whenever lifecycle behavior changes.

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

## Operational Meaning And Next Actions

| Status | Meaning | Normal next action |
|---|---|---|
| Draft | Asset record is being prepared. | Complete required master data and set to `Ready`. |
| Ready | Asset is usable and available for normal operations. | Check-out, transfer, maintenance, disposal request, audit, or stay Ready. |
| In Use | Legacy or imported active-use status. | Prefer controlled checkout/custody workflows for new movements. |
| Reserved | Legacy or planning status for an asset held for a future use. | Move to Ready or a controlled custody workflow when released. |
| Checked Out | Asset is currently issued to a person/location/department. | Check-in to `Ready`, `Pending Repair`, or `Pending Disposal`. |
| In Transit | Legacy or logistics movement status. | Confirm arrival through the relevant movement workflow and return to an active status. |
| Under Inspection | Asset is being reviewed because data, location, custody, or condition needs confirmation. | If usable, resolve to `Ready`; if damaged, open a maintenance ticket so the asset becomes `Pending Repair`; if disposal is recommended, use disposal/maintenance close workflow; if unresolved, follow lost/missing policy. |
| Pending Repair | Repair is needed but work has not started. | Accept/start the maintenance work and move to `Under Maintenance`. |
| Under Maintenance | Asset is under repair or service. | Close maintenance to `Ready` or `Pending Disposal`. |
| Pending Disposal | Asset is approved/recommended for disposal and should not be used in normal operations. | Execute disposal as `Disposed` or retire as `Retired`. |
| Lost | Asset is reported lost. | Investigate and correct back to `Ready` only when found and usable. |
| Missing | Asset was not found during audit or operation. | Investigate and correct back to `Ready` only when found and usable. |
| Disposed | Asset has been disposed. | Closed lifecycle status. Do not use normal checkout/transfer. |
| Retired | Asset has been retired. | Closed lifecycle status. Do not use normal checkout/transfer. |

The status diagram used for operator handoff is stored as `docs/asset-lifecycle-flow.png`; edit `docs/asset-lifecycle-flow.svg` if the flow changes.

## Current Code Enforcement

- Check-out requires `asset:edit`, loads active assets only, blocks an asset that already has an active checkout, and blocks assets in `Disposed`, `Retired`, `Pending Disposal`, `Under Maintenance`, `Lost`, or `Missing`.
- Check-out sets asset status to `Checked Out` using `getRequiredAssetStatusId("Checked Out")`.
- Check-in requires `asset:edit`, requires an active checkout, and only accepts return statuses from `Ready`, `Pending Repair`, and `Pending Disposal`.
- Check-in can create a maintenance ticket only when the return status is `Pending Repair` and the user has `maintenance:create`.
- Transfer requires `asset:edit`, blocks assets that already have an active checkout, and blocks normal transfer for `Disposed`, `Retired`, and `Pending Disposal`.
- Maintenance close only allows next asset status `Ready` or `Pending Disposal`.
- Disposal execution only allows final asset status `Disposed` or `Retired`.
- Generic asset edit cannot change protected lifecycle statuses such as `Pending Disposal`, `Disposed`, `Retired`, `Lost`, `Missing`, `Under Maintenance`, or `Pending Repair`; use status correction or the proper workflow.
- Asset create/edit loads canonical status names with the localized labels and blocks direct protected status changes in the form before submit. Operators should not rely on the generic edit page to move assets into repair, disposal, lost/missing, maintenance, or closed statuses.
- Status correction can restore accidental `Pending Disposal`, `Disposed`, `Retired`, `Lost`, `Missing`, `Under Maintenance`, or `Pending Repair` statuses back to `Ready` with a required reason, asset movement, and audit log.
- Maintenance ticket creation moves the asset to `Pending Repair` when that status exists. Creating a ticket does not require `returnDate`; `returnDate` is required only when closing the repair ticket.
- Default audit-round target selection excludes `Disposed` and `Retired` unless the user explicitly includes closed assets.
- Audit status dropdowns hide closed statuses by default to avoid confusing “all assets” with disposed/retired assets.

## API Validation Rules To Preserve

- An asset with an active checkout must not be checked out again.
- An asset with an active checkout must not be transferred through the normal transfer flow.
- Check-in must be tied to an active checkout.
- Check-in next status must be one of `Ready`, `Pending Repair`, or `Pending Disposal`.
- Maintenance ticket creation from check-in must require `Pending Repair`.
- Maintenance close next status must be `Ready` or `Pending Disposal`.
- Disposal execution next status must be `Disposed` or `Retired`.
- Status correction must only return protected lifecycle statuses to `Ready` and must require a reason.
- Maintenance create validation must allow omitted, blank, or null `returnDate`; close-ticket validation must still require a real `returnDate`.
- Default audit target selection must exclude `Disposed` and `Retired`.

## Validation Recommendations

These are recommended hardening items for future work. They should be implemented with tests before changing production workflow behavior.

- If the organization needs to move `Pending Disposal` assets before final execution, add a privileged transfer workflow with separate approval/audit evidence instead of using normal transfer.
- If the organization needs richer return-to-service steps than status correction, add a dedicated workflow with inspection evidence before checkout.
- Disposal execution should remain the only normal workflow that moves an asset to `Disposed` or `Retired`.
- Maintenance close should keep documenting whether the asset returns to `Ready` or moves to `Pending Disposal`.
- Consider adding a dedicated inspection workflow if `Under Inspection` becomes a common operational state. Until then, use audit findings, maintenance tickets, disposal requests, or status correction depending on the confirmed physical condition and business decision.

## Audit Behavior

When creating an audit round with “all assets”, the system should mean all active, countable assets. Closed statuses are handled separately:

- `Disposed` and `Retired` are excluded from default audit targets.
- The UI should not show closed statuses in the normal status dropdown unless the user explicitly includes closed assets.
- `Lost` and `Missing` are not the same as closed statuses; they can still be operationally relevant and should be reviewed according to audit policy.
