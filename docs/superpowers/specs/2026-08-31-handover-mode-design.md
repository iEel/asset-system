# Permanent Assignment And Temporary Loan Design

## Status

Approved in conversation on 2026-08-31. This document defines the design only. It does not authorize applying the production migration without a fresh verified backup and explicit operator approval.

## Problem

The current Check-out workflow always moves an asset to `Checked Out / ถูกเบิก`, even when the business intent is a long-term assignment to an employee. An optional expected-return date cannot safely express that intent: an empty date might mean a permanent assignment or an operator omission.

The production database currently has two active user Check-outs without expected-return dates. The operator confirmed both are permanent assignments:

| Asset Tag | Document No. | Confirmed meaning |
|---|---|---|
| `GRL-COM-06-0001` | `HO-202606-0002` | Permanent assignment |
| `SNI-EQU-19-0336` | `HO-202608-0003` | Permanent assignment |

## Goals

- Make the operator explicitly choose between permanent assignment and temporary loan.
- Keep one Check-out/Check-in document workflow, evidence model, movement history, and cancellation mechanism.
- Represent permanent employee custody as `In Use` and temporary open borrowing as `Checked Out`.
- Backfill the two confirmed active records safely and audibly.
- Prevent missing dates, status drift, and ambiguous active Check-outs from being silently accepted.

## Non-Goals

- Do not create a separate Assignment subsystem or a second return page.
- Do not infer handover intent only from whether `expectedReturnDate` is present.
- Do not rewrite completed historical Check-outs whose intent is unknown.
- Do not allow generic Asset Edit or direct status selection to bypass the workflow.
- Do not change Transfer, maintenance, disposal, audit, or transaction-cancellation ownership rules except where they consume the new handover mode.

## Domain Model

Add nullable `handoverMode` to `AssetCheckout`. Supported non-null values are:

- `permanent_assignment`
- `temporary_loan`

The column remains nullable so completed legacy documents can stay historically accurate rather than receiving a guessed classification. Every newly created Check-out must have a valid non-null mode.

### Permanent Assignment

- Allowed only when `checkoutType = user`.
- Requires `custodianId`.
- Does not use `expectedReturnDate`; the API rejects a supplied expected-return date for this mode rather than silently discarding it.
- Creates the existing Check-out document, attachments, signature, snapshots, movements, and audit history.
- Sets the asset lifecycle status to `In Use`.
- Keeps the Check-out active until it is returned or cancelled.

### Temporary Loan

- Supports the existing `user`, `department`, `location`, and `asset` Check-out destinations.
- Requires `expectedReturnDate`.
- Requires the expected-return date to be on or after the Check-out date.
- Sets the asset lifecycle status to `Checked Out`.
- Participates in due-soon and overdue-return notifications.

## Lifecycle And Data-Quality Policy

Check-in eligibility becomes mode-aware:

- An active `temporary_loan` is returnable only while its asset is `Checked Out`.
- An active `permanent_assignment` is returnable only while its asset is `In Use`.
- A completed legacy Check-out with `handoverMode = NULL` remains readable. An active null-mode Check-out is inconsistent and must be surfaced for review rather than guessed.

The Asset State Review detector must compare active Check-out modes, not just the total open Check-out count:

- Active temporary loan + status other than `Checked Out` is critical.
- Active permanent assignment + status other than `In Use` is critical.
- Active Check-out with null/unknown mode is critical.
- `Checked Out` without an active temporary loan is critical.
- `In Use` with personal ownership but no custodian remains a warning.

The detector snapshot and resolution policy must carry separate permanent, temporary, and unknown active counts. Resolution may suggest the mode-authoritative status but must retain the current stale-snapshot and reasoned-review guards.

Check-in completion continues to permit only `Ready`, `Pending Repair`, or `Pending Disposal`. Cancelling a Check-in reopens the related Check-out and restores the authoritative before snapshot, returning a permanent assignment to `In Use` and a temporary loan to `Checked Out`.

Check-out cancellation continues to restore its before snapshot. Existing snapshot concurrency, downstream-work, installed-component, latest-transaction, permission, VOID-document, and blocked-review rules remain unchanged.

## API And Validation

The Check-out request adds required `handoverMode`.

Server-side validation must reject:

- missing or unknown handover mode;
- permanent assignment to anything other than a user;
- permanent assignment without a custodian;
- permanent assignment with an expected-return date;
- temporary loan without an expected-return date;
- expected-return date earlier than the Check-out date.

The server derives the target lifecycle status exclusively from the validated mode. The client cannot submit a target status.

Check-in candidate queries and Check-in POST validation must load the active Check-out mode and validate the matching current lifecycle state. Transaction shortcuts continue to block a second Check-out or Transfer while either mode has an active Check-out and route the operator to Return instead.

## User Experience

### Check-out

When `ส่งมอบให้บุคคล / To user` is selected, show a required, initially unselected `ลักษณะการส่งมอบ / Handover mode` choice:

- `มอบหมายใช้งานประจำ / Permanent assignment`
  - Helper: continuous employee use with no planned return date.
  - Result preview: `ใช้งานอยู่ / In Use`.
  - Hide the expected-return field.
- `เบิกใช้งานชั่วคราว / Temporary loan`
  - Helper: borrowed use that must be returned by a specified date.
  - Result preview: `ถูกเบิก / Checked Out`.
  - Show and require the expected-return field.

For department, location, or asset destinations, use `temporary_loan`, show the mode as read-only context, and require the expected-return date. Do not show an unavailable permanent-assignment choice.

The review dialog must display Asset, destination, handover mode, resulting lifecycle status, condition, expected return when applicable, and evidence summary. The primary action remains `ส่งมอบทรัพย์สิน / Check out asset`; no new navigation item or Asset Register row action is added.

### Check-in

Reuse the existing Check-in page. Show a read-only `ข้อมูลการถือครองปัจจุบัน / Current custody` summary:

- source document number;
- `ลักษณะการถือครอง / Custody type`, displayed as the short label `ใช้งานประจำ / Permanent` or `เบิกชั่วคราว / Temporary`;
- current holder/destination;
- start date;
- expected return only for temporary loans;
- current lifecycle status.

Do not present the handover mode as an editable return decision. A legacy null mode is displayed as `ข้อมูลเดิม — ไม่ได้ระบุลักษณะการส่งมอบ / Legacy record — handover mode not recorded`.

### Detail, Timeline, And Print

Asset Detail operation history, Check-out detail, Check-in context, and printed handover/return documents display the same localized mode labels. VOID presentation and cancellation metadata remain authoritative.

All controls follow the existing Operate-mode design system: readable Thai/English labels, visible focus, 44px mobile targets, semantic status labels that do not rely on color, and no additional persistent action clutter.

## Notifications, Dashboard, And Reporting

- Due-soon and overdue-return queries include only active `temporary_loan` records.
- `Checked Out` dashboard and Asset Register counts naturally represent temporary loans through lifecycle status.
- Permanent assignments appear under `In Use`.
- Operational exports that include Check-out data add a localized handover-mode column where applicable.
- Completed legacy rows remain reportable as unspecified rather than being classified from their dates.

## Migration And Approved Backfill

Create an idempotent SQL Server manual migration under `prisma/manual-migrations/`. It must run under one database transaction and:

1. Add nullable `handoverMode NVARCHAR(30)` if absent.
2. Add an allowed-value constraint for `permanent_assignment`, `temporary_loan`, or `NULL` if absent.
3. Lock and verify that the only active, non-returned, null-mode Check-outs are the following exact Asset Tag/document pairs:
   - `GRL-COM-06-0001` / `HO-202606-0002`
   - `SNI-EQU-19-0336` / `HO-202608-0003`
4. Verify both remain `checkoutType = user`, have a custodian, have no expected-return date, and currently use `Checked Out`.
5. Abort and roll back the entire migration if the exact set or any invariant differs.
6. Backfill both Check-outs to `permanent_assignment`.
7. Change both assets to the active `In Use` master status.
8. Insert explicit Asset Movement and System Log records describing the approved semantic backfill, with old/new status, mode, Asset Tag, document number, and a stable migration actor identifier.
9. For any confirmed record with a complete authoritative after snapshot, update only the after-snapshot status to the `In Use` status ID so future cancellation compares against the approved migrated state. Preserve the original after-snapshot JSON in the System Log old value. Do not invent missing snapshots for legacy records.
10. Re-verify that both assets are `In Use`, both Check-outs are active permanent assignments, and no active null-mode Check-out remains before commit.

The migration file may be committed with the implementation, but it must not be applied until the operator confirms a fresh verified database backup and explicitly approves the apply command. Rollback after production application is database restore, not a reverse migration that erases audit records.

## Error Handling And Concurrency

- Check-out and Check-in retain serializable/transactional writes and current duplicate-active-transaction guards.
- The current asset status, active Check-out, handover mode, and expected update snapshot must be re-read inside the write transaction.
- A mode/status mismatch returns a stable localized conflict response and performs no partial document, asset, attachment, movement, or audit write.
- Migration set mismatch fails before changing either record.
- UI error copy explains the recovery action, including selecting a mode, entering a valid date, returning the existing active handover, or refreshing stale data.

## Testing And Acceptance

### Automated

- Validation tests for both modes and every invalid mode/date/destination combination.
- Lifecycle-policy tests for mode-derived target status and mode-aware Check-in eligibility.
- Data-quality detector and resolution tests for permanent, temporary, unknown, and mismatched combinations.
- API tests for permissions, atomicity, active-transaction conflicts, status derivation, Check-in, and cancellation snapshot restoration.
- Transaction-shortcut tests showing Return for both active modes and blocking duplicate Check-out/Transfer.
- Notification tests proving permanent assignments are excluded from due-soon/overdue counts.
- Migration contract tests for exact-set success, set mismatch rollback, invariant mismatch rollback, idempotent schema creation, audit writes, and after-snapshot alignment.

### Browser And Document QA

- Check-out mode selection, conditional date field, review dialog, validation recovery, and successful routing.
- Check-in current-custody summary for both modes and a legacy null-mode history record.
- Asset Detail timeline, active handover action, Check-out/Check-in detail, and print output.
- Thai and English at desktop and mobile widths, keyboard navigation, focus behavior, and no body overflow.

### Production UAT

- Confirm both backfilled assets show `In Use` and retain their confirmed open documents.
- Return one permanent-assignment test asset through the normal Check-in flow and verify the selected next status, evidence, movement, and audit history.
- Create and return one new temporary loan with a due date.
- Cancel one new permanent assignment and one new temporary loan; verify exact snapshot restoration and VOID documents.
- Run Asset State Review and confirm no mode/status inconsistency for valid records.
- Confirm dashboard counts and return notifications separate permanent assignments from temporary loans.

## Documentation

Update the developer handoff, database model, RBAC notes if required, lifecycle, workflows, UAT checklist, production readiness, feature list, handout, Thai user guide, Thai workflow, and changelog. Document the migration as pending until it is actually applied; after application, record the accepted checksum and verification evidence without rewriting historical plans/specifications.
