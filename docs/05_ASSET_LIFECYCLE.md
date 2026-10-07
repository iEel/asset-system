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
- Inconsistent combinations should be treated as follow-up work. For example, `Ready` + damaged condition should usually get a repair record; `Under Maintenance` + good condition should usually have its unfinished repair record finished ("ซ่อมเสร็จ") so the asset returns to its custody-derived status; `Disposed` + good condition remains closed until a privileged business decision changes it.

The application shows this guidance inline through help icons beside status and condition fields on Asset Create/Edit, Asset Detail, Asset Register filters, and Asset Register table headers. Keep these popovers aligned with the workflow rules in this document whenever lifecycle behavior changes.

Selectable physical conditions are `Not Assessed`, `New`, `Good`, `Fair`, `Damaged`, `Non-functional`, and `Salvage`. Legacy `Excellent` and `Poor` values remain readable for historical records but are not selectable for new changes.

## Review-First State Governance

`asset_state_reviews` stores detected inconsistencies as a review queue. A scan records the observed asset status, condition, custodian, and `updatedAt` snapshot; it does **not** automatically change existing asset status or condition. The detector covers repair-record mismatches (a `Pending Repair`/`Under Maintenance` asset with no unfinished repair record, suggested target `Under Maintenance`), checkout mismatches, personal-custody inconsistencies, incompatible status/condition combinations, legacy status/condition values, and disposal rows that cannot restore a prior status.

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
| In Use / Checked Out | Under Maintenance | Check-in / return with result "ส่งซ่อม" (send for repair); an unfinished repair record is opened in the same transaction |
| In Use / Checked Out | Pending Disposal | Check-in / return with disposal recommendation |
| Ready / In Use / Pending Repair (legacy) | Under Maintenance | Repair record saved as unfinished (`in_progress`) |
| Ready / In Use | (unchanged) | Repair record saved as finished with outcome `usable` |
| Pending Repair / Under Maintenance (no unfinished record) | In Use / Ready | Repair record saved as finished with outcome `usable` for an asset stuck in a repair status |
| Ready / In Use / Pending Repair / Under Maintenance | Pending Disposal | Repair record saved as finished with outcome `beyond_repair` (no active checkout) |
| Under Maintenance | In Use / Ready | Unfinished repair record finished ("ซ่อมเสร็จ") with outcome `usable`, or cancelled; `In Use` when an active checkout or personal custody remains, otherwise `Ready` |
| Under Maintenance | Pending Disposal | Unfinished repair record finished with outcome `beyond_repair` (no active checkout) |
| Ready / In Use | Pending Disposal | Disposal request opened and the prior status is captured for rejection restoration |
| Pending Disposal (no open request) | Pending Disposal | Disposal request opened for an asset a repair or return already moved to Pending Disposal; rejection restores the custody-derived `In Use` or `Ready` |
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
| Checked Out | Asset is temporarily loaned to a person, location, department, or another asset. | Check-in to `Ready`, `Under Maintenance` ("ส่งซ่อม", opens a repair record), or `Pending Disposal`. |
| In Transit | Legacy or logistics movement status. | Confirm arrival through the relevant movement workflow and return to an active status. |
| Under Inspection | Asset is being reviewed because data, location, custody, condition, or master data needs confirmation. | The currently enforced exit is controlled correction to `Ready`. After that correction, use personal transfer, maintenance, or disposal workflow as required. Recording an audit item as not found creates a finding but does not change the asset to `Missing` or `Lost`. |
| Pending Repair | Legacy status from the old repair workflow. New work no longer sets it; the value stays in master data for history. | Record the repair ("บันทึกซ่อม"): finished moves the asset to its custody-derived status or `Pending Disposal`; unfinished moves it to `Under Maintenance`. The Maintenance page lists these assets under "ทรัพย์สินค้างสถานะซ่อมแต่ไม่มีบันทึก". |
| Under Maintenance | Asset is out for repair and should have one unfinished repair record. | Press "ซ่อมเสร็จ" on that record: `usable` returns `In Use` when an active checkout or personal custody remains, otherwise `Ready`; `beyond_repair` moves it to `Pending Disposal`. Cancelling a wrong unfinished record also restores the custody-derived status. |
| Pending Disposal | Asset is approved/recommended for disposal and should not be used in normal operations. | Execute disposal as `Disposed`/`Retired`; rejection restores the status captured when the request was created. |
| Lost | Asset is reported lost. | Investigate and correct back to `Ready` only when found and usable. |
| Missing | Asset was not found during audit or operation. | Investigate and correct back to `Ready` only when found and usable. |
| Disposed | Asset has been disposed. | Closed lifecycle status. Do not use normal checkout/transfer. |
| Retired | Asset has been retired. | Closed lifecycle status. Do not use normal checkout/transfer. |

The status diagram used for operator handoff is stored as `docs/asset-lifecycle-flow.png`; edit `docs/asset-lifecycle-flow.svg` if the flow changes.

## Current Code Enforcement

- Check-out requires `asset:edit`, loads active assets only, blocks an asset that already has an active checkout, and accepts only `Ready`; `Under Inspection` therefore remains blocked.
- Check-out requires an explicit custody mode for user destinations. `permanent_assignment` requires an employee custodian, forbids a due date, and sets `In Use`; `temporary_loan` requires a valid due date and sets `Checked Out`. Non-user destinations are always temporary loans. The server derives the status rather than accepting a user-selected lifecycle value.
- Check-in requires `asset:edit` and an active checkout, verifies `permanent_assignment` from `In Use` or `temporary_loan` from `Checked Out`, and only accepts return results `Ready`, `Under Maintenance` (shown as "ส่งซ่อม"), or `Pending Disposal`.
- The `Under Maintenance` return result also requires `maintenance:create` and a recorder employee, and opens an `in_progress` repair record from the damage note in the same transaction (skipped when the asset already has an unfinished record), so the asset never sits in a repair status without a record.
- Transfer requires `asset:edit`, blocks assets that already have an active checkout, and accepts personal custody assignment only from `Ready` or `In Use`; `Under Inspection` therefore remains blocked. A transfer with `toCustodianId` resolves the required `In Use` status server-side and updates it atomically with the new custodian; location-only or department-only transfers preserve the current status.
- Repair records follow `src/lib/repair-record-policy.ts`. The custody-derived status ("สถานะตามผู้ถือครอง") is `In Use` when the asset has an active checkout, otherwise `getMaintenanceOperationalTarget` (`In Use` for valid personal custody, else `Ready`). Outcome `beyond_repair` moves the asset to `Pending Disposal` and is refused while an active checkout exists. Every asset status change is a conditional update on `statusId` inside the transaction and writes an `AssetMovement` plus System Log. Records created from a PM plan follow the same rules; the plan link is `maintenancePlanId`, not a `[PM] ` text prefix.
- Disposal execution only allows final asset status `Disposed` or `Retired`.
- Generic asset edit cannot change protected lifecycle statuses such as `Pending Disposal`, `Disposed`, `Retired`, `Lost`, `Missing`, `Under Maintenance`, `Pending Repair`, or `Under Inspection`; use status correction or the proper workflow.
- Asset create/edit loads canonical status names with the localized labels and blocks direct protected status changes in the form before submit. Operators should not rely on the generic edit page to move assets into repair, disposal, lost/missing, maintenance, or closed statuses.
- Status correction can restore accidental `Pending Disposal`, `Disposed`, `Retired`, `Lost`, `Missing`, `Under Maintenance`, `Pending Repair`, or completed `Under Inspection` statuses back to `Ready` with a required reason, asset movement, and audit log. Because an unfinished repair record accepts only `Ready`/`In Use`/`Pending Repair`, an inspected asset that needs repair or disposal must first complete the controlled inspection correction to `Ready`, then enter the appropriate workflow. If a repair record was saved with the wrong outcome, correct the asset status here and note the reason in the record's remark; the record's outcome itself cannot be changed.
- Rejecting a current disposal request does not assume `Ready`; it restores the active `previousAssetStatusId` captured when the request claimed the asset. A legacy request without a valid captured status is sent to the review queue instead of being guessed.
- Marking an audit item as not found creates a pending investigation finding and does not automatically change `Asset.statusId` to `Missing` or `Lost`. There is not yet a dedicated normal loss-confirmation transition.
- Repair record creation never moves an asset to `Pending Repair`. A finished record stores the record date as `returnDate`; an unfinished record leaves `returnDate` empty until "ซ่อมเสร็จ" supplies the return date.
- Default audit-round target selection excludes `Disposed` and `Retired` unless the user explicitly includes closed assets.
- Audit status dropdowns hide closed statuses by default to avoid confusing “all assets” with disposed/retired assets.

## API Validation Rules To Preserve

- An asset with an active checkout must not be checked out again.
- An asset with an active checkout must not be transferred through the normal transfer flow.
- A personal transfer must set the asset status to `In Use` without requiring a client-supplied status; a location-only or department-only transfer must preserve the current status.
- Check-in must be tied to an active checkout whose mode and source status agree: permanent assignment from `In Use`, temporary loan from `Checked Out`.
- Check-in next status must be one of `Ready`, `Under Maintenance`, or `Pending Disposal`; `Under Maintenance` must open the repair record in the same transaction.
- A repair record cannot be created for `Disposed`/`Retired` assets (`MAINTENANCE_ASSET_WRITTEN_OFF`) or while the asset already has an unfinished record (`MAINTENANCE_OPEN_RECORD_EXISTS`). An unfinished record or a `beyond_repair` outcome is refused for an asset on loan (`MAINTENANCE_ASSET_ON_LOAN`).
- Finishing a repair record must set the custody-derived status (`usable`) or `Pending Disposal` (`beyond_repair`); cancelling an unfinished record must restore the custody-derived status; a finished or cancelled record cannot be finished or cancelled again.
- Disposal execution next status must be `Disposed` or `Retired`.
- Status correction must only return protected lifecycle statuses, including `Under Inspection`, to `Ready` and must require a reason.
- "ซ่อมเสร็จ" (`action: "complete"`) must require a real `returnDate` and an `outcome`; detail edits must not change status or outcome; every change must carry `expectedUpdatedAt`.
- Default audit target selection must exclude `Disposed` and `Retired`.

## Validation Recommendations

These are recommended hardening items for future work. They should be implemented with tests before changing production workflow behavior.

- If the organization needs to move `Pending Disposal` assets before final execution, add a privileged transfer workflow with separate approval/audit evidence instead of using normal transfer.
- If the organization needs richer return-to-service steps than status correction, add a dedicated workflow with inspection evidence before checkout.
- Disposal execution should remain the only normal workflow that moves an asset to `Disposed` or `Retired`.
- Repair records should keep documenting whether the asset returns to custody-derived `In Use`/`Ready` or moves to `Pending Disposal` (`outcome`).
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
