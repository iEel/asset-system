# Asset Workflow Safety and Follow-up Design

**Date:** 2026-08-27

**Status:** Approved design, pending implementation plan

**Scope:** Transaction cancellation, Missing/Lost cases, next-action guidance, notifications, escalation, Work Center integration

## Objective

Make operational mistakes and exceptional asset events recoverable without direct database edits, while preserving immutable evidence, custody accountability, lifecycle consistency, and clear next steps for users working with production data.

The work ships as four independently deployable phases:

1. Self-service cancellation for Checkout, Check-in, and Transfer.
2. Missing/Lost investigation and recovery cases.
3. A shared next-action policy surfaced in Asset Detail, Asset Register, mobile actions, and Work Center.
4. Queue and event notifications with configurable SLA escalation.

## Approved Product Decisions

- Users with `asset:edit` may cancel eligible transactions created by themselves or another user. No second approver is required.
- Cancellation always requires a reason, preserves the original document, and creates compensating history. It never deletes history.
- Automatic cancellation is allowed only for the latest transaction when the current asset and affected component state still match the transaction's after-snapshot and no downstream workflow exists.
- A blocked cancellation creates a deduplicated pending review item instead of partially reversing data.
- `Missing` means an asset is under investigation. `Lost` means the investigation concluded that the asset cannot be recovered.
- Reporting Missing requires the last-seen date, last-seen place, and an assigned investigator.
- Confirming Lost requires at least one evidence attachment or a mandatory evidence-exception reason.
- A user with `asset:edit` can execute Missing/Lost actions without a second approver.
- A Missing/Lost asset found later enters `Under Inspection` before returning to an operational or repair workflow.
- An open Checkout remains open while its asset is Missing/Lost. Recovery restores `Checked Out` after inspection when that Checkout is still open; a physical return must use the normal Check-in workflow.
- In-app notifications and Work Center are primary. Routine events use Email Digest. Confirmed Lost and severe overdue SLA events may send immediate email.
- Read and Snooze affect only notification presentation; they never close the underlying work.

## Architecture Choice

Use domain-specific records and services rather than a generic workflow engine.

- Extend Checkout and Check-in with reversible transaction metadata.
- Introduce a real `AssetTransfer` document instead of treating a transfer movement as the document.
- Introduce `AssetLossCase` for investigation state, assignment, SLA, evidence, and recovery.
- Reuse `AssetMovement`, `SystemLog`, `Attachment`, `AssetStateReview`, the notification center, digest scheduler, and Work Center.
- Add pure policy modules for cancellation eligibility, loss transitions, and next actions so UI and APIs use the same rules.

This approach follows existing maintenance cancellation, audit cancellation, asset state governance, operation evidence, document-number, and Work Center patterns without introducing a general-purpose workflow framework.

## Phase 1: Transaction Cancellation

### Data model

Add the following fields to `AssetCheckout` and `AssetCheckin`:

- `transactionStatus`: `active` or `void`, default `active`.
- `beforeSnapshotJson`: complete reversible asset state.
- `afterSnapshotJson`: complete expected state after the operation.
- `componentSnapshotJson`: affected installed component before/after states.
- `voidedAt`, `voidedBy`, `voidReason`.
- `updatedAt` for optimistic concurrency.

Create `AssetTransfer` with:

- `id`, `documentNo`, `assetId`.
- `reason`, `remark`.
- `beforeSnapshotJson`, `afterSnapshotJson`, `componentSnapshotJson`.
- `transactionStatus`, `voidedAt`, `voidedBy`, `voidReason`.
- `createdBy`, `createdAt`, `updatedAt`.

New transfer movements use `referenceType=transfer` and the `AssetTransfer.id` as `referenceId`. Existing historical transfer movements that reference only the Asset ID remain readable but are not automatically reversible.

### Snapshot contract

An asset transaction snapshot contains at least:

- `assetId`, `assetUpdatedAt`.
- `statusId`, `conditionId`.
- `currentLocationId`, `custodianId`, `departmentId`.
- Active Checkout identity and returned state when relevant.
- A bounded list of affected installed components with their state and relationship identity.

Snapshots are serialized through one versioned helper. Cancellation rejects unsupported or incomplete snapshot versions.

### Eligibility

Cancellation requires all of the following:

- The user has `asset:edit`.
- The document exists and is `active`.
- A nonblank reason passes validation.
- The submitted document version matches the database version.
- The document is the latest effective asset transaction.
- The current asset state equals the transaction after-snapshot.
- Every affected installed component still equals its after-snapshot and remains in the expected relationship.
- No later Checkout, Check-in, Transfer, Maintenance, Disposal, status correction, Loss Case action, or other state-changing movement exists.

### Cancellation effects

Cancellation runs in one database transaction.

- Checkout cancellation restores its before-snapshot and marks the Checkout `void`.
- Check-in cancellation marks the Check-in `void`, restores its before-snapshot, and reopens the linked Checkout by setting `isReturned=false`.
- Transfer cancellation restores its before-snapshot and marks the Transfer `void`.
- Component changes are restored with the parent or the whole operation fails.
- A compensating movement is created with `checkout_cancel`, `checkin_cancel`, or `transfer_cancel`.
- A System Log stores the document, reason, user, and before/after cancellation result.
- Attachments and signatures stay active and linked to the original document.

The endpoint is idempotent for an already-void document: it returns the current void state without applying another reversal.

### Blocked cancellation

If eligibility changes between preview and commit, no partial writes occur. The system creates or refreshes one pending `AssetStateReview` with issue type `transaction_cancellation_blocked`, keyed by asset, transaction type, and transaction ID. Metadata records the requested reason, blockers, current snapshot, expected snapshot, requester, and request time.

Historical transactions without complete snapshots always use this review path.

### APIs and UI

APIs:

- `GET /api/asset-checkouts/{id}/cancel-preview`
- `POST /api/asset-checkouts/{id}/cancel`
- `GET /api/asset-checkins/{id}/cancel-preview`
- `POST /api/asset-checkins/{id}/cancel`
- `GET /api/asset-transfers/{id}/cancel-preview`
- `POST /api/asset-transfers/{id}/cancel`

The document and Asset Detail surfaces expose cancellation only for active documents. The confirmation dialog shows the original operator, current values, restore values, component impact, blockers, and a required reason. Void documents display a persistent `VOID / ยกเลิกแล้ว` banner, cancellation metadata, and a print watermark.

## Phase 2: Missing/Lost Cases

### Data model

Create `AssetLossCase` with:

- `id`, unique `caseNo`, `assetId`.
- `caseStatus`: `investigating`, `recovered_inspection`, `closed_recovered`, or `lost`.
- `lastSeenAt`, optional master `lastSeenLocationId`, and required human-readable `lastSeenPlace`.
- Captured `custodianId`, assigned `investigatorId`, `dueDate`.
- `sourceType` and `sourceId` for manual or Audit Finding origin.
- `beforeSnapshotJson` and `openCheckoutId`.
- `reportedAt`, `reportedBy`, `updatedAt`, `updatedBy`.
- `lostAt`, `lostBy`, `lostReason`, `evidenceExceptionReason`.
- `recoveredAt`, `recoveredBy`, `recoveryNote`.
- `inspectionCompletedAt`, `inspectionCompletedBy`, `inspectionResult`, `inspectionRemark`.

Add indexes for case status, due date, assigned investigator, asset history, and source reference. Enforce one active case per asset through a guarded database transaction and an idempotent SQL Server filtered unique index covering `investigating` and `recovered_inspection`.

Attachments use `module=asset_loss_case` and the case ID.

### State machine

- Report Missing: create `investigating`, capture current state, preserve any open Checkout, set Asset status to `Missing`, and create movement/log history.
- Confirm Lost: require case `investigating`, evidence or exception reason, set case `lost`, set Asset status `Lost`, and retain any open Checkout.
- Recover: allow from `investigating` or `lost`, set case `recovered_inspection`, set Asset status `Under Inspection`, and retain custody/Checkout accountability.
- Complete inspection with open Checkout: restore `Checked Out`. A later physical return uses Check-in.
- Complete inspection without open Checkout: resolve to custody-derived `In Use` or `Ready`.
- Complete inspection with damage and no open Checkout: require Maintenance creation and resolve to `Pending Repair` atomically.
- Complete inspection with an open Checkout: restore `Checked Out` even when damage is observed; the later physical return records condition and starts repair through the normal Check-in workflow.
- Successful inspection completion sets `closed_recovered`.

Data Quality treats an open Checkout combined with Missing/Lost as valid only when it is linked to the current active/lost case. Unexplained status/Checkout combinations remain findings.

### Audit integration

Audit Mark Not Found continues to create a reviewable Finding without changing Asset status. After the Finding is approved, the reviewer may open a prefilled Missing case. Opening the case remains an explicit confirmation and links the case to the Finding and existing evidence.

### APIs and UI

APIs:

- `POST /api/assets/{id}/loss-cases`
- `POST /api/asset-loss-cases/{id}/assign`
- `POST /api/asset-loss-cases/{id}/follow-up`
- `POST /api/asset-loss-cases/{id}/confirm-lost`
- `POST /api/asset-loss-cases/{id}/recover`
- `POST /api/asset-loss-cases/{id}/complete-inspection`
- `POST /api/asset-loss-cases/{id}/attachments`

Add `/asset-management/loss-cases` with status, SLA, assignee, company, branch, and search filters. The case detail shows one timeline containing assignment, follow-up, evidence, lifecycle changes, recovery, inspection, movements, and audit events.

Asset Detail exposes contextual actions: Report Missing, Record Recovery, Confirm Lost, and Complete Inspection. All mutations require `asset:edit` and revalidate case state and asset version server-side.

## Phase 3: Shared Next-action Guidance

Create a pure `asset-next-action-policy` that accepts:

- Asset status, condition, ownership, and custody.
- Open Checkout, Maintenance, Disposal, Loss Case, and pending review state.
- Relevant due dates and SLA state.
- User permissions.

It returns:

- One primary action.
- Up to three secondary actions.
- Blockers with actionable reasons.
- Due/overdue metadata.
- Stable action keys and safe href inputs.

Consumers must not reproduce lifecycle conditions locally.

- Asset Detail upgrades the existing Activity Summary into a compact next-action surface below the identity/status header.
- Asset Register transaction menus consume the same policy.
- Mobile exposes the primary action in the existing bottom action bar and secondary actions through progressive disclosure.
- Work Center consumes the same action keys and blockers.
- Read-only users can see the required next step but receive a permission explanation instead of a write action.
- When no action is required, the UI uses quiet completion copy rather than a warning card.

The interaction must support keyboard focus, Escape dismissal, focus restoration, screen readers, 44px mobile targets, and text/icon meaning independent of color.

## Phase 4: Notifications and Escalation

### Queue notifications

Extend computed Notification Center and Work Center metrics with separate keys for:

- Returns due soon.
- Returns overdue.
- Missing cases due soon.
- Missing cases overdue.
- Recovered assets awaiting inspection.
- Under Inspection cases overdue.
- Blocked cancellation reviews.
- Newly confirmed Lost assets.

Queue items are derived from current workflow state. They disappear only when their source work is resolved.

### Event notifications

Persist direct notifications for assignment, cancellation, confirmed Lost, recovery, and severe escalation. Add a unique `dedupeKey` to Notification so scheduler retries do not create duplicates. Event notifications retain their historical record even after source work closes.

Recipients:

- Return reminders go to the Checkout custodian's linked active user when available.
- Loss reminders go to the assigned investigator's linked active user.
- Cancellation-blocked events go to the requester and configured escalation recipients.
- Fallback and escalation recipients are selected explicitly in System Settings; the system does not notify every user with `asset:edit`.

### Channels

- Due soon: in-app and Work Center.
- Overdue: in-app and Email Digest.
- Severe overdue: in-app, Work Center, and immediate email.
- Confirmed Lost: immediate in-app and email.

Read and Snooze affect only the current user's notification presentation. Assignment and source workflow state remain unchanged.

### Settings

Add validated settings for:

- Return due-soon days, retaining the existing setting.
- Return severe-overdue days.
- Default Missing case SLA days.
- Under Inspection SLA days.
- Explicit escalation user or role IDs.

Digest and immediate delivery use stable dedupe keys based on notification type, source ID, escalation stage, and recipient.

## Authorization and Audit

- All mutation routes require authenticated users and `asset:edit` unless a stricter existing route permission already applies.
- Users may cancel transactions created by other users.
- Server checks are authoritative; hidden or disabled UI is never the permission boundary.
- Every state mutation writes Asset Movement and System Log data in the same logical operation.
- File evidence uses existing upload validation, signature checking, storage governance, and attachment authorization.
- Cancellation and loss actions never hard-delete documents, attachments, movements, cases, or logs.

## Migration and Existing Data

Implementation requires an idempotent manual SQL Server migration plus Prisma schema changes.

- Existing Checkout/Check-in rows default to `active` but have no reversible snapshot unless the migration can establish one without inference.
- The system must not synthesize missing historical snapshots from incomplete movements or logs.
- Existing transfer movements remain historical movement entries and are not backfilled as reversible `AssetTransfer` documents.
- Automatic cancellation is enabled only for documents created with a supported complete snapshot.
- Existing Missing/Lost assets are not assigned synthetic cases automatically. A review scan creates follow-up review items so operators can open cases with verified facts.
- Existing notification settings and user read/snooze state remain intact.
- Production migration execution requires a verified backup and explicit approval in a later step. Creating and testing the migration file does not authorize applying it.

## Error Handling and Concurrency

- Use optimistic concurrency on transaction documents, loss cases, and Asset `updatedAt` snapshots.
- Return stable error codes for not found, permission denied, invalid transition, stale data, downstream dependency, missing evidence, and unsupported historical snapshot.
- UI preserves entered reasons and notes after recoverable errors.
- Duplicate POST retries return the existing successful state when the idempotency identity matches.
- No operation may partially restore an Asset without its linked Checkout and affected components.

## Testing Strategy

Each phase follows RED/GREEN TDD with pure policy tests before service and route implementation.

- Cancellation eligibility and reversal snapshot tests for all transaction types.
- Component rollback, stale version, downstream dependency, idempotency, and historical-record tests.
- Loss-case state machine tests, including open Checkout, Lost recovery, evidence exception, maintenance creation, and duplicate active case prevention.
- Asset State Review detector tests for valid and invalid Missing/Lost + Checkout combinations.
- Next-action policy matrix across lifecycle, permissions, blockers, and SLA.
- Notification count, recipient, dedupe, suppression, digest, and resolution tests.
- Route permission and validation tests.
- Desktop/mobile source and browser interaction tests for dialogs, focus, disabled reasons, timeline, and return navigation.
- Full repository test, ESLint, TypeScript, Prisma generation, production build, and diff checks before completion.

Production UAT with current real data is read-only until a designated test asset or staging environment exists. End-to-end mutation UAT must not use operational assets without explicit business authorization.

## Documentation

Update:

- `docs/06_WORKFLOWS.md`
- `docs/07_UAT.md`
- `docs/12_HANDOUT.md`
- `docs/15_ASSET_STATUS_USER_GUIDE_TH.md`
- `docs/16_ASSET_STATUS_WORKFLOW_TH.md`
- `docs/99_CHANGELOG.md`
- `DEVELOPER_HANDOFF.md`

Document migration filename, backup gate, rollout order, rollback limitations, permissions, scheduler settings, and the distinction between Missing, Lost, Under Inspection, and Audit Mark Not Found.

## Non-goals

- No generic workflow engine.
- No hard deletion or in-place rewriting of historical transactions.
- No automatic inference of reversible snapshots for legacy transactions.
- No automatic conversion of Audit Mark Not Found directly to Missing/Lost.
- No second-person approval workflow for cancellation or loss actions.
- No broadcast notification to every asset editor.
- No production migration execution without a later backup confirmation and explicit approval.
