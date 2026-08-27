# Asset State Governance Design

**Date:** 2026-08-27

**Status:** Approved in chat; written review pending

**Scope:** Asset lifecycle status, physical condition, workflow guards, data-quality review, and safe reconciliation

## Goal

Make Asset Status and Asset Condition reliable operational controls rather than freely editable labels. Every lifecycle change must come from one explicit workflow or a controlled review decision, while inconsistent historical data is surfaced for human review and is never corrected automatically.

## Current Problems

The current database contains 1,748 active assets, 14 active status master rows, and 8 active condition master rows. The review found these concrete consistency gaps:

- 10 assets are `Pending Repair` or `Under Maintenance` without an active corrective maintenance ticket.
- 2 of 3 `Checked Out` assets do not have an open checkout.
- 7 `Ready` personal assets still have a custodian.
- 82 `In Use` personal assets do not have a custodian.
- 191 assets are `Under Inspection`; 189 of those asset records had not been updated for more than 30 days at the time of review.
- All Asset Status and Asset Condition master descriptions are empty.
- `Good` is used by 1,553 assets, about 89% of active assets, while the current condition scale contains overlapping values such as `Excellent`/`Good` and `Poor`/`Damaged`.

The policies are distributed across asset edit, checkout, transfer, check-in, maintenance, disposal, and status-correction code. The checkout blocklist currently permits states such as `Pending Repair`, while transfer can move repair, lost, or missing assets and can then force them to `In Use`.

## Design Principles

1. Status describes the asset's lifecycle and availability; condition describes its physical state.
2. A workflow owns every operational status transition.
3. Application code uses allowlists of valid source and target states, not incomplete blocklists.
4. The Asset Register cannot bypass checkout, maintenance, disposal, loss, or reconciliation workflows.
5. Existing inconsistent assets are never changed by a scanner or migration without a human decision.
6. Every approved correction records an Asset Movement and System Audit Log.
7. Historical master values remain readable even when they are no longer selectable.

## Canonical Lifecycle Model

### Registration and availability

| Status | Intended use | Owner |
|---|---|---|
| `Draft` | Incomplete registration that is not operationally available | Asset Create/Edit |
| `Ready` | Available for assignment or temporary checkout | Asset lifecycle |
| `In Use` | Long-term assignment to a person or responsible unit | Transfer/assignment |
| `Checked Out` | Temporary issue with an open checkout transaction | Checkout/Check-in |

### Repair and exception handling

| Status | Intended use | Owner |
|---|---|---|
| `Pending Repair` | Corrective repair has been reported but work has not started | Corrective maintenance |
| `Under Maintenance` | Corrective repair work is in progress or waiting for parts/vendor | Corrective maintenance |
| `Missing` | Temporarily not found and still under investigation | Future loss workflow / controlled review |
| `Lost` | Confirmed lost with approval/evidence | Future loss workflow / controlled review |

### Disposal

| Status | Intended use | Owner |
|---|---|---|
| `Pending Disposal` | Disposal request is active | Disposal request |
| `Disposed` | Ownership has left the organization or the item was destroyed | Disposal execution |
| `Retired` | Decommissioned but retained for historical/physical control | Disposal execution |

### Controlled legacy statuses

`Reserved`, `In Transit`, and `Under Inspection` remain readable for historical records but are not selectable from generic Create/Edit or transaction forms. They must not be used for new transitions until a dedicated reservation, shipment acceptance, or inspection workflow exists. Existing assets in these states appear in the review queue.

## Transition Policy

Create `src/lib/asset-lifecycle-policy.ts` as the single pure policy module. It exposes named operations and returns either an allowed target set or a stable error code.

| Operation | Allowed source | Result/allowed target |
|---|---|---|
| Create | none | `Draft`, `Ready` |
| Activate draft | `Draft` | `Ready` |
| Temporary checkout | `Ready` | `Checked Out` |
| Check-in | `Checked Out` with open checkout | `Ready`, `Pending Repair`, `Pending Disposal` |
| Assign/transfer to custodian | `Ready`, `In Use` | `In Use` |
| Move location/department only | any non-terminal status permitted by policy | preserve current status |
| Open corrective repair | `Ready`, `In Use`, `Checked Out` only after valid return handling | `Pending Repair` |
| Start/continue corrective work | `Pending Repair` | `Under Maintenance` |
| Close corrective work | `Under Maintenance`/completed ticket | `In Use` when a personal custodian remains, otherwise `Ready`; or `Pending Disposal` |
| Open disposal request | allowed operational source | `Pending Disposal`, while storing the prior status |
| Reject/cancel disposal | `Pending Disposal` | restore validated prior status |
| Execute disposal | `Pending Disposal` | `Disposed`, `Retired` |
| Confirm missing | approved review/workflow | `Missing` |
| Confirm lost | `Missing` | `Lost` |
| Found asset | `Missing`, `Lost` | `In Use` if a valid personal custodian remains, otherwise `Ready` |
| Controlled correction | review issue | only issue-specific allowed targets |

The generic Asset Register can change `Draft` to `Ready` and update a condition, but cannot directly select workflow-owned lifecycle states. Server APIs enforce the same policy independently of the UI.

## Context-Preserving Restoration

### Maintenance close

Corrective maintenance close computes a recommended operational target:

- `In Use` when ownership is `personal` and a valid custodian remains.
- `Ready` when no personal custodian remains.
- `Pending Disposal` when repair outcome requires disposal.

The API validates the submitted target against that context. It never silently accepts `Ready` for a personal asset that still has a custodian.

### Disposal rejection or cancellation

Add nullable `previousAssetStatusId` to `DisposalRequest`. When a request first claims the asset as `Pending Disposal`, it snapshots the prior status. Rejection or cancellation restores only that recorded status after checking it remains valid. Legacy requests without a snapshot create a review issue instead of assuming `Ready`.

### Status correction

Generic “return everything to Ready” correction is replaced by issue-specific reconciliation. The review record stores the observed state and the administrator explicitly selects one of the valid proposed targets. Resolution is rejected if the asset changed after the issue was detected.

## Physical Condition Model

The selectable condition scale becomes:

| Condition | Thai label | Meaning |
|---|---|---|
| `Not Assessed` | ยังไม่ประเมิน | Legacy/imported record whose physical condition has not been verified |
| `New` | ใหม่ | Never used or accepted as new stock |
| `Good` | ดี | Fully functional in normal use |
| `Fair` | พอใช้ | Functional with visible wear or reduced quality |
| `Damaged` | ชำรุด | Partially functional or physically damaged; inspection/repair required |
| `Non-functional` | ใช้งานไม่ได้ | Cannot perform its intended function |
| `Salvage` | ซาก/อะไหล่ | Retained only for parts or disposal handling |

`Excellent` and `Poor` become non-selectable legacy values. Existing assets using them are not migrated automatically; the scanner creates condition-normalization review issues with suggested targets `Good` and `Damaged`. `Not Assessed` is added as a new active master value and becomes the explicit option for unknown imported data.

Compatibility rules are warnings or review findings, not blind condition changes:

- `Ready`/`In Use` with `Damaged`, `Non-functional`, or `Salvage` is inconsistent.
- `Pending Repair`/`Under Maintenance` may use `Good` only with an explicit review because the reported issue may be non-physical.
- `Disposed`/`Retired` may legitimately retain `New`, `Good`, or `Fair`; disposal does not imply damage.

Master descriptions are populated in Thai-facing operational language and returned to forms so users can see selection criteria.

## Review Queue Data Model

Add `AssetStateReview` mapped to `asset_state_reviews`:

- `id`
- `assetId`
- `issueType`
- `reviewStatus`: `pending`, `resolved`, `dismissed`
- `severity`: `critical`, `warning`, `info`
- observed `statusId`, `conditionId`, `custodianId`, and `assetUpdatedAt`
- `suggestedStatusId` and `suggestedConditionId`, nullable
- `metadataJson` for bounded supporting references and counts
- `detectedAt`, `lastDetectedAt`
- `resolvedAt`, `resolvedBy`, `resolutionReason`
- applied `resolvedStatusId` and `resolvedConditionId`, nullable
- timestamps

Use a filtered unique SQL Server index for one pending issue per `(assetId, issueType)`. A repeat scan updates `lastDetectedAt` and the observed snapshot rather than creating duplicates. Resolved and dismissed history remains immutable.

Initial issue types:

- `repair_status_without_active_ticket`
- `active_repair_ticket_status_mismatch`
- `checked_out_without_open_checkout`
- `open_checkout_status_mismatch`
- `personal_in_use_without_custodian`
- `personal_ready_with_custodian`
- `incompatible_status_condition`
- `legacy_condition_value`
- `controlled_legacy_status`
- `legacy_disposal_missing_previous_status`

## Detection and Resolution Flow

### Detection

`src/lib/asset-state-review-service.ts` contains bounded queries and issue builders. Detection runs through an administrator-only API action and can also be invoked by a scheduled/readiness job later. The first implementation does not run mutation-producing scans on ordinary page render.

The scanner only creates or refreshes review rows. It never updates an asset, creates a checkout, creates a maintenance ticket, or fabricates historical evidence.

### Admin UI

Extend `/{locale}/admin/data-quality` with an “Asset status and condition” section containing:

- pending count by severity and issue type
- filters for issue, status, condition, company, and branch
- asset identifier, current status/condition, responsibility, supporting evidence, detection time, and suggested action
- direct links to Asset Detail and the applicable checkout, maintenance, or disposal workflow
- a scan/refresh action for authorized administrators
- resolve and dismiss dialogs requiring a reason

Batch resolution is allowed only when every selected issue has the same issue type and valid target set. The server revalidates each asset independently and reports partial results; it does not guess targets.

### Resolution safety

Resolution uses a serializable transaction where practical and rejects stale decisions when `Asset.updatedAt`, observed status, condition, or custody no longer matches the review snapshot. A successful state change creates:

- an `AssetMovement` with `movementType=state_review_resolution`
- a System Audit Log containing the issue, before/after state, reason, and actor
- a resolved immutable review row

Dismissal changes only the review row and writes an audit log. A later scan may create a new pending issue if the inconsistency still exists and the dismissal is no longer applicable; the first implementation uses the observed asset timestamp to decide this.

## API and Permission Model

Use existing admin/data-quality page authorization plus explicit server permission checks. New endpoints:

- `POST /api/admin/asset-state-reviews/scan`
- `GET /api/admin/asset-state-reviews`
- `POST /api/admin/asset-state-reviews/{id}/resolve`
- `POST /api/admin/asset-state-reviews/{id}/dismiss`
- optional batch resolve endpoint only if the single-resolution flow is stable and fully tested

No public integration API contract changes. Existing status and condition reference endpoints continue returning historical active master data; selectable application options are filtered by policy rather than inferred only from `isActive`.

## Database and Deployment

Add an idempotent manual SQL Server migration that:

1. Adds `asset_state_reviews` and its indexes/foreign keys.
2. Adds nullable `previousAssetStatusId` to `disposal_requests` with a foreign key to `asset_statuses`.
3. Inserts or updates `Not Assessed` without changing any asset's `conditionId`.
4. Populates status and condition descriptions.

The migration must not alter any existing asset status, condition, custodian, checkout, maintenance ticket, or disposal decision. `Excellent` and `Poor` remain readable; application policy makes them non-selectable after deployment. Production deployment order is backup, apply migration, generate Prisma Client, build, restart, run the review scan, then let administrators reconcile the queue.

## Error Handling

Lifecycle policy functions return stable error codes that route handlers translate to localized messages. Expected conflicts use HTTP 409, validation errors use 400, missing records use 404, and permission failures retain existing authorization behavior. Stale review resolution returns a conflict and refreshes the issue snapshot on the next scan.

Missing required master statuses fail closed with an actionable configuration error. A workflow never falls back to the first status option.

## Testing Strategy

Use test-driven development for each slice:

1. Pure transition matrix tests covering every allowed and rejected source/operation pair.
2. Checkout and transfer route/service tests proving repair, loss, inspection, and terminal statuses cannot bypass lifecycle controls.
3. Create/edit option and API tests proving workflow-owned states cannot be selected directly.
4. Maintenance close tests for custodian-aware `In Use`, no-custodian `Ready`, and `Pending Disposal`.
5. Disposal tests proving the prior status is snapshotted and restored, while legacy missing snapshots create reviews.
6. Condition policy tests for selectable values and compatibility findings.
7. Review detector tests for every issue type, idempotent refresh, and no automatic asset mutation.
8. Review resolution tests for stale snapshots, allowed targets, movement/audit creation, dismissal, and safe batch behavior if included.
9. UI source/behavior tests for filters, evidence, required reasons, links, and localized messages.
10. Full lint, test, Prisma generation, TypeScript, production build, and migration syntax verification.

## Documentation and Handoff

Update the lifecycle guide, workflow guide, Thai user status guide, UAT checklist, production readiness notes, developer handoff, and changelog. Documentation must distinguish Asset Status counts from transaction counts and state clearly that historical inconsistencies require review rather than automatic repair.

## Out of Scope

- A configurable database-driven workflow engine.
- Automatic creation of historical checkout or maintenance transactions.
- Automatic reassignment of custodians.
- Automatic migration of existing asset status or condition values.
- Full reservation, shipping/acceptance, or loss-claim modules. Until those workflows exist, their controlled statuses remain non-selectable except through review resolution where explicitly allowed.

## Acceptance Criteria

- No checkout or personal transfer can bypass the central transition policy.
- Generic Create/Edit cannot assign workflow-owned statuses or deprecated conditions.
- Maintenance and disposal restore the correct operational context.
- Every detected historical inconsistency appears as a review item without changing the asset.
- Every resolved state change is concurrency-safe, reasoned, and audited.
- Existing historical values remain readable.
- No migration changes an existing asset row automatically.
- Focused and full repository verification pass before handoff.
