# Asset Lifecycle

This document describes the intended asset status lifecycle and the validation points that should be kept aligned with API behavior.

## Main Statuses

Canonical operational statuses are:

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

`Reserved` and `In Transit` remain legacy/controlled values for existing records. `Under Inspection` is an active controlled operational status for assets whose location, custody, condition, or master data still needs confirmation. None of these values is offered in normal create/edit selectors; use the relevant custody, maintenance, audit, disposal, or controlled correction workflow.

## Status Versus Condition

Asset status and asset condition are related but not the same field.

- `AssetStatus` controls workflow and permissions: whether the asset can be checked out, transferred, repaired, disposed, audited, or corrected.
- `AssetCondition` records the physical state observed by users, auditors, or repair staff.
- A damaged condition does not by itself move the asset through the lifecycle. The user still needs to choose the correct workflow, usually maintenance, disposal, audit follow-up, or a controlled status correction.
- Inconsistent combinations should be treated as follow-up work. For example, `Ready` + damaged condition should usually open a maintenance ticket; `Under Maintenance` + good condition should usually be closed back to `Ready`; `Disposed` + good condition remains closed until a privileged business decision changes it.

The application shows this guidance inline through help icons beside status and condition fields on Asset Create/Edit, Asset Detail, Asset Register filters, and Asset Register table headers. Keep these popovers aligned with the workflow rules in this document whenever lifecycle behavior changes.

Selectable physical conditions are `Not Assessed`, `New`, `Good`, `Fair`, `Damaged`, `Non-functional`, and `Salvage`. Legacy `Excellent` and `Poor` values remain readable for historical records but are not selectable for new changes.

## Review-First State Governance

`asset_state_reviews` stores detected inconsistencies as a review queue. A scan records the observed asset status, condition, custodian, and `updatedAt` snapshot; it does **not** automatically change existing asset status or condition. The detector covers repair-ticket mismatches, checkout mismatches, personal-custody inconsistencies, incompatible status/condition combinations, legacy status/condition values, and disposal rows that cannot restore a prior status.

- `setting:view` can view and filter the queue at `/{locale}/admin/data-quality`.
- `setting:edit` can run a scan, resolve an allowed correction, or dismiss a finding with a reason.
- Resolution requires a reason of at least 10 characters, an active allowed master value, a matching observed snapshot, an optimistic asset update, an `AssetMovement` row, and a System Log audit entry.
- Dismissal changes only the review record and audit trail; it never changes the asset.
- Re-running the scan refreshes persistent findings, suppresses an unchanged dismissed snapshot, and closes pending findings that are no longer detected.

## Allowed Transitions

| From | To | Trigger |
|---|---|---|
| Draft | Ready | Asset registration completed |
| Ready | In Use | Permanent assignment to an employee, or transfer custody to a person |
| Ready | Checked Out | Temporary loan to an employee, department, location, or another asset |
| In Use / Checked Out | Ready | Check-in / return with normal result |
| In Use / Checked Out | Pending Repair | Check-in / return with repair needed |
| In Use / Checked Out | Pending Disposal | Check-in / return with disposal recommendation |
| Ready / In Use | Pending Repair | Corrective maintenance ticket opened |
| Pending Repair | Under Maintenance | Repair ticket is accepted / in progress |
| Under Maintenance | Ready / In Use | Maintenance job closed and asset is usable; personal custody returns to `In Use`, otherwise `Ready` |
| Under Maintenance | Pending Disposal | Maintenance result recommends disposal |
| Ready / In Use | Pending Disposal | Disposal request opened and the prior status is captured for rejection restoration |
| Pending Disposal | Previous captured status | Disposal request rejected |
| Pending Disposal | Disposed | Disposal execution completed |
| Pending Disposal | Retired | Retirement completed |
| Reserved / In Transit | Ready / In Use / Missing / Lost | Controlled legacy-status resolution from the Data Quality review queue |
| Under Inspection | Ready | Inspection confirms the asset is usable and available |
| Lost / Missing | Ready | Finding resolved and asset is confirmed usable |

## Transaction Cancellation And Snapshot Restoration

Cancelling a Check-out, Check-in, or Transfer is a compensating transaction, not a normal lifecycle transition and not a Status Correction. The system restores the authoritative before-snapshot captured by the original transaction instead of selecting or inferring a replacement status.

- Cancellation requires `asset:edit`, an active document, a reason of at least 5 characters, and a matching optimistic `expectedUpdatedAt` value.
- Only the latest asset transaction can be cancelled automatically. The current asset and installed-component state must still match the transaction's after-snapshot, and no downstream workflow may depend on it.
- A successful cancellation marks the source document `void`, records cancellation metadata, restores the asset and component snapshot atomically, and writes a compensating `AssetMovement` plus System Log entry.
- Cancelling a Check-in also reopens its related Check-out. A later corrected Check-in is allowed, while the VOID Check-in remains immutable historical evidence. The filtered database index permits no more than one active Check-in per Check-out.
- Cancelling a Check-out or Transfer restores its captured pre-transaction status, condition, location, custody, department, branch, and installed-component state as applicable.
- If the document is not latest, state has changed, components have changed, downstream work exists, or the document predates snapshot capture, the system makes no partial restoration and upserts a pending `transaction_cancellation_blocked` Asset State Review.
- Legacy Check-out and Check-in rows intentionally retain null snapshots. They remain readable but cannot be auto-cancelled; an authorized reviewer must investigate and use the appropriate controlled workflow.

## Operational Meaning And Next Actions

| Status | Meaning | Normal next action |
|---|---|---|
| Draft | Asset record is being prepared. | Complete required master data and set to `Ready`. |
| Ready | Asset is usable and available for normal operations. | Check-out, transfer, maintenance, disposal request, audit, or stay Ready. |
| In Use | Asset is permanently assigned to an employee, assigned through personal transfer, or represents an imported active-use record. | Continue custody transfer as needed, or return an active permanent assignment through Check-in. |
| Reserved | Legacy or planning status for an asset held for a future use. | Move to Ready or a controlled custody workflow when released. |
| Checked Out | Asset is temporarily loaned to a person, location, department, or another asset. | Check-in to `Ready`, `Pending Repair`, or `Pending Disposal`. |
| In Transit | Legacy or logistics movement status. | Confirm arrival through the relevant movement workflow and return to an active status. |
| Under Inspection | Asset is being reviewed because data, location, custody, condition, or master data needs confirmation. | The currently enforced exit is controlled correction to `Ready`. After that correction, use personal transfer, maintenance, or disposal workflow as required. Recording an audit item as not found creates a finding but does not change the asset to `Missing` or `Lost`. |
| Pending Repair | Repair is needed but work has not started. | Accept/start the maintenance work and move to `Under Maintenance`. |
| Under Maintenance | Asset is under repair or service. | Close maintenance to `In Use` when valid personal custody remains, otherwise `Ready`; or choose `Pending Disposal`. |
| Pending Disposal | Asset is approved/recommended for disposal and should not be used in normal operations. | Execute disposal as `Disposed`/`Retired`; rejection restores the status captured when the request was created. |
| Lost | Asset is reported lost. | Investigate and correct back to `Ready` only when found and usable. |
| Missing | Asset was not found during audit or operation. | Investigate and correct back to `Ready` only when found and usable. |
| Disposed | Asset has been disposed. | Closed lifecycle status. Do not use normal checkout/transfer. |
| Retired | Asset has been retired. | Closed lifecycle status. Do not use normal checkout/transfer. |

The status diagram used for operator handoff is stored as `docs/asset-lifecycle-flow.png`; edit `docs/asset-lifecycle-flow.svg` if the flow changes.

## Current Code Enforcement

- Check-out requires `asset:edit`, loads active assets only, blocks an asset that already has an active checkout, and accepts only `Ready`; `Under Inspection` therefore remains blocked.
- Check-out requires an explicit custody mode for user destinations. `permanent_assignment` requires an employee custodian, forbids a due date, and sets `In Use`; `temporary_loan` requires a valid due date and sets `Checked Out`. Non-user destinations are always temporary loans. The server derives the status rather than accepting a user-selected lifecycle value.
- Check-in requires `asset:edit` and an active checkout, verifies `permanent_assignment` from `In Use` or `temporary_loan` from `Checked Out`, and only accepts return results `Ready`, `Pending Repair`, or `Pending Disposal`.
- Check-in can create a maintenance ticket only when the return status is `Pending Repair` and the user has `maintenance:create`.
- Transfer requires `asset:edit`, blocks assets that already have an active checkout, and accepts personal custody assignment only from `Ready` or `In Use`; `Under Inspection` therefore remains blocked. A transfer with `toCustodianId` resolves the required `In Use` status server-side and updates it atomically with the new custodian; location-only or department-only transfers preserve the current status.
- Corrective maintenance close computes the operational target from custody: `In Use` when the asset still has valid personal custody, otherwise `Ready`; `Pending Disposal` is the other allowed result. PM ticket closure does not change asset lifecycle.
- Disposal execution only allows final asset status `Disposed` or `Retired`.
- Generic asset edit cannot change protected lifecycle statuses such as `Pending Disposal`, `Disposed`, `Retired`, `Lost`, `Missing`, `Under Maintenance`, `Pending Repair`, or `Under Inspection`; use status correction or the proper workflow.
- Asset create/edit loads canonical status names with the localized labels and blocks direct protected status changes in the form before submit. Operators should not rely on the generic edit page to move assets into repair, disposal, lost/missing, maintenance, or closed statuses.
- Status correction can restore accidental `Pending Disposal`, `Disposed`, `Retired`, `Lost`, `Missing`, `Under Maintenance`, `Pending Repair`, or completed `Under Inspection` statuses back to `Ready` with a required reason, asset movement, and audit log. Because corrective maintenance creation currently accepts only `Ready`/`In Use`, an inspected asset that needs repair or disposal must first complete the controlled inspection correction to `Ready`, then enter the appropriate workflow.
- Rejecting a current disposal request does not assume `Ready`; it restores the active `previousAssetStatusId` captured when the request claimed the asset. A legacy request without a valid captured status is sent to the review queue instead of being guessed.
- Marking an audit item as not found creates a pending investigation finding and does not automatically change `Asset.statusId` to `Missing` or `Lost`. There is not yet a dedicated normal loss-confirmation transition.
- Maintenance ticket creation moves the asset to `Pending Repair` when that status exists. Creating a ticket does not require `returnDate`; `returnDate` is required only when closing the repair ticket.
- Default audit-round target selection excludes `Disposed` and `Retired` unless the user explicitly includes closed assets.
- Audit status dropdowns hide closed statuses by default to avoid confusing “all assets” with disposed/retired assets.

## API Validation Rules To Preserve

- An asset with an active checkout must not be checked out again.
- An asset with an active checkout must not be transferred through the normal transfer flow.
- A personal transfer must set the asset status to `In Use` without requiring a client-supplied status; a location-only or department-only transfer must preserve the current status.
- Check-in must be tied to an active checkout whose mode and source status agree: permanent assignment from `In Use`, temporary loan from `Checked Out`.
- Check-in next status must be one of `Ready`, `Pending Repair`, or `Pending Disposal`.
- Maintenance ticket creation from check-in must require `Pending Repair`.
- Corrective maintenance close next status must be the custody-derived operational target (`In Use` for valid personal custody, otherwise `Ready`) or `Pending Disposal`; PM close must preserve asset status.
- Disposal execution next status must be `Disposed` or `Retired`.
- Status correction must only return protected lifecycle statuses, including `Under Inspection`, to `Ready` and must require a reason.
- Maintenance create validation must allow omitted, blank, or null `returnDate`; close-ticket validation must still require a real `returnDate`.
- Default audit target selection must exclude `Disposed` and `Retired`.

## Validation Recommendations

These are recommended hardening items for future work. They should be implemented with tests before changing production workflow behavior.

- If the organization needs to move `Pending Disposal` assets before final execution, add a privileged transfer workflow with separate approval/audit evidence instead of using normal transfer.
- If the organization needs richer return-to-service steps than status correction, add a dedicated workflow with inspection evidence before checkout.
- Disposal execution should remain the only normal workflow that moves an asset to `Disposed` or `Retired`.
- Maintenance close should keep documenting whether the asset returns to custody-derived `In Use`/`Ready` or moves to `Pending Disposal`.
- Keep `Under Inspection` controlled: do not expose it in generic create/edit and do not allow normal checkout/transfer while it is active. Until a dedicated inspection-resolution workflow exists, complete it through reasoned correction to `Ready` before personal transfer, maintenance, or disposal.
- Add a dedicated, evidence-backed loss workflow before allowing normal transitions into `Missing` or `Lost`; the existing audit not-found action intentionally creates a finding without changing asset lifecycle.
- Align disposal-request route eligibility with the central lifecycle policy so only supported operational sources (`Ready` and `In Use`) can start a request. Broader route acceptance must not be treated as a supported transition.

## Checkout custody modes

| Mode | Valid destination | Due date | Status while held | Check-in source |
|---|---|---|---|---|
| `permanent_assignment` | Employee with custodian | Not allowed | `In Use` | `In Use` |
| `temporary_loan` | Employee, department, location, or another asset | Required | `Checked Out` | `Checked Out` |

The mode is explicit and server-derived; users do not choose the resulting lifecycle status. An active Checkout with a missing/unknown mode or a status mismatch creates a critical Asset State Review. Unknown mode has no automatic status target. Completed legacy Checkouts may remain null and display as unspecified.

## Audit Behavior

When creating an audit round with “all assets”, the system should mean all active, countable assets. Closed statuses are handled separately:

- `Disposed` and `Retired` are excluded from default audit targets.
- The UI should not show closed statuses in the normal status dropdown unless the user explicitly includes closed assets.
- `Lost` and `Missing` are not the same as closed statuses; they can still be operationally relevant and should be reviewed according to audit policy.
