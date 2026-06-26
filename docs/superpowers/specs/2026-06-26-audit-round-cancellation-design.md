# Audit Round Cancellation Design

## Context

Audit rounds currently support `draft`, `open`, and `closed` statuses. The API already has `DELETE /api/audit-rounds/{id}`, but that route soft-deletes the round by setting `isActive = false`; it does not represent an auditable business cancellation. The UI does not expose a cancel action.

The requested behavior is a medium-term cancellation workflow for test or invalid audit rounds. The important business rule is that cancellation stops the audit round from being used as official audit coverage, but it must not silently roll back work that has already happened.

## Decision

Add a first-class `cancelled` audit round status. Cancelling a round preserves audit items, scan history, findings, attachments, system logs, and any master asset changes already made by approved findings or immediate scan correction. The cancelled round remains visible for traceability but becomes read-only for field and review workflows.

A cancelled round is not counted as current-year audit coverage, not included in open/pending work queues, and cannot be scanned, marked not found, reviewed, closed, or exported as an active operational result. It can still be opened from the audit rounds list/detail for history and evidence review.

## Data Model

Extend `AuditRound` with nullable cancellation metadata:

- `cancelledAt DateTime?`
- `cancelledBy String? @db.NVarChar(100)`
- `cancelReason String? @db.NVarChar(Max)`

Keep `isActive = true` when a round is cancelled. Soft delete remains a separate administrative delete path for maintenance-only cleanup, but the user-facing audit workflow uses `status = "cancelled"`.

## API Behavior

Extend `PATCH /api/audit-rounds/{id}` to support `action: "cancel"` with a required non-empty reason.

Cancellation rules:

- Requires `audit:approve`, matching the existing close-round authority model.
- Rejects already closed rounds.
- Rejects already cancelled rounds.
- Writes `status = "cancelled"`, `cancelledAt`, `cancelledBy`, `cancelReason`, and `updatedBy`.
- Writes system log action `cancel` with a snapshot of counts for scanned/reviewed items, pending items, pending findings, approved findings, and scan history rows.

Do not mutate `audit_items`, `audit_findings`, `audit_scan_history`, asset master records, asset movements, or attachments during cancellation.

Routes that must reject cancelled rounds:

- `POST /api/audit-rounds/{id}/scan`
- `POST /api/audit-rounds/{id}/scan-lookup`
- `POST /api/audit-items/{id}/mark-not-found` when the item belongs to a cancelled round
- `POST /api/audit-findings/{id}/review` for findings in a cancelled round
- `PATCH /api/audit-rounds/{id}` close action

## UI Behavior

Add a cancel action on audit round detail, visible to users who can cancel and only when the round is not closed/cancelled. The dialog must show impact counts before submit:

- inspected/processed items
- pending items
- pending findings
- approved findings
- scan history rows

The dialog requires a cancellation reason and states clearly that cancellation will not roll back master asset data or movement logs that were already applied.

Cancelled round detail:

- Shows a cancelled status badge and cancellation reason metadata.
- Hides or disables scan, pending/not-found, close, and review actions.
- Keeps result summary, scan history-derived out-of-scope rows, and evidence/history views readable.

Audit rounds list:

- Adds cancelled to supported status display and quick filters.
- Excludes cancelled rounds from current-year coverage and next-action cards.
- Keeps cancelled rounds in the all list so test rounds are explainable.

Audit findings:

- Excludes cancelled-round findings from default pending/open queues.
- Allows an explicit all/history view to show them if the existing `all` filter is used.

## Handling Already-Inspected Assets

Cancellation records that the audit round is no longer official. It does not undo already-inspected item rows. The saved rows stay as historical evidence that the test round happened.

If a scan result or approved finding already changed a master asset, the system leaves that change intact. Reverting a master data change must happen through a separate explicit correction workflow because automatic rollback cannot know whether the new master value is now the correct real-world state.

## Tests

Add regression tests that fail before implementation and pass after:

- Audit round validation accepts `cancelled` and cancellation schema requires a reason.
- Cancel route supports `action: "cancel"`, sets status and cancellation metadata, logs counts, and does not delete the round.
- Scan, scan lookup, mark-not-found, finding review, and close paths reject cancelled rounds.
- Audit rounds coverage/next-action queries exclude cancelled rounds from coverage and open-work counts.
- Audit round UI exposes cancel dialog copy, impact counts, and cancelled read-only state.
- Thai and English messages include cancellation labels, warnings, confirmations, and errors.

## Documentation

Update workflow, UAT checklist, handout, and changelog after implementation. Documentation must state that cancelled rounds keep historical audit data and do not roll back master asset corrections.
