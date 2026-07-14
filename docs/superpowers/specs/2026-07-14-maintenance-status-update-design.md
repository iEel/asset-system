# Maintenance Status Update UX Design

## Goal

Make repair-ticket status changes deliberate and auditable while allowing operators to update the assignee and due date without accidentally advancing the repair workflow.

## Approved Direction

The Maintenance workspace will expose two distinct actions:

1. **Change status** — advances a ticket through one explicitly selected workflow transition.
2. **Edit assignment and due date** — changes operational planning fields while preserving the current ticket and asset lifecycle statuses.

This separation applies to corrective Repair Tickets and PM-generated work orders. PM work orders continue to avoid all asset lifecycle mutation.

## Alternatives Considered

### A. Keep one combined dialog

This is the smallest code change, but it preserves the current risk: changing only the assignee or due date can silently submit the first available next status. It also mixes workflow authority with routine planning data.

### B. One dialog with two tabs

This reduces accidental submission but still hides two different business actions behind one trigger and adds unnecessary modal navigation.

### C. Separate status and planning actions — selected

This makes intent explicit, keeps each form short, and allows the backend and audit trail to distinguish workflow transitions from planning updates.

## Status Action

- The dialog title remains “Update repair status”.
- A read-only current-status row appears first.
- The target field is labelled “Change status to”, not the ambiguous “Status”.
- No target is selected by default. Submit stays disabled until the operator selects one.
- Available targets come from a shared policy helper, not a transition map duplicated inside the client component.
- The interactive helper excludes `closed`. Closure remains available only through the existing close action so evidence, root cause, resolution, inspector, return date, and final corrective asset status cannot be bypassed.
- Target choices use bordered radio rows/cards because each workflow state has meaning beyond a short label. Each choice includes a concise consequence description.
- For a single possible target, the operator still confirms the radio choice; the system never advances status merely by opening the dialog.
- `waiting_parts` and `waiting_vendor` require an update remark in both UI validation and API validation.
- Selecting `completed` explains that the repair is complete but the ticket is not closed; the operator must still use the close action.
- For corrective work, selecting `in_progress` explains that the asset becomes `Under Maintenance`. PM copy explicitly states that the asset lifecycle is unchanged.
- Status submission sends only transition data, optimistic `expectedUpdatedAt`, and the remark. It does not send assignment or due-date fields.

## Planning Action

- A separate action is labelled “Edit assignee and due date”.
- The dialog shows the current ticket status for context but cannot change it.
- It contains the bounded employee search and due-date input already used by Maintenance.
- Either field may be cleared.
- Submit is disabled until at least one value differs from the loaded value.
- The API receives a dedicated `planning` action with `expectedUpdatedAt`, `assignedToId`, and `dueDate`.
- The service updates only planning fields, writes an audit record containing before/after values, and does not mutate `repairStatus`, `AssetStatus`, or PM plan state.
- Optimistic conflicts use the existing localized `MAINTENANCE_CONFLICT` recovery message.
- Planning changes are unavailable after a ticket is `closed`; closed work remains append-only except for the existing audited evidence addendum behavior.

## Workflow Policy Boundary

`src/lib/maintenance-policy.ts` remains the source of truth for lifecycle transitions. It will export an additional client-safe helper for interactive status updates that filters closure transitions. Backend transition enforcement continues to use the complete transition map.

This deliberately preserves the distinction between:

- `completed`: repair work is finished and ready for inspection/closure.
- `closed`: the close checklist and final lifecycle decision have been recorded.

## UI and Accessibility

- Reuse `AccessibleDialog`, existing button vocabulary, form tokens, and focus styles.
- Radio choices use native inputs with full-row labels, visible checked/focus states, and status text; color is supplemental only.
- Dialogs remain one column on narrow screens and use the existing 44px minimum touch target.
- Helper copy uses readable foreground/muted tokens and works in Thai and English.
- Saving states prevent duplicate submission and preserve Escape/focus-return behavior supplied by `AccessibleDialog`.

## Error Handling

- Missing target status is blocked client-side and by validation.
- Waiting states without a meaningful remark are rejected with a stable localized error code.
- Invalid or stale transitions continue to return `MAINTENANCE_INVALID_TRANSITION` or `MAINTENANCE_CONFLICT`.
- Invalid assignee IDs and dates use schema validation; planning updates never partially mutate the ticket.

## Testing

- Policy tests cover interactive targets and prove that `closed` is excluded.
- Validation tests cover the dedicated planning payload and required waiting-state remarks.
- Service tests prove planning updates preserve ticket and asset lifecycle status and use optimistic concurrency.
- UI source tests prove there is no default target, radio choices include consequence copy, planning has a separate action, and status submission omits planning fields.
- Thai/English i18n tests continue to require matching Maintenance keys.
- Full tests, Prisma validation, production build, and the Impeccable detector run before completion.
- The live dev server is checked for successful Maintenance page responses and new runtime message errors after HMR/restart.

## Out of Scope

- No new repair statuses.
- No change to the corrective or PM lifecycle definitions.
- No schema migration.
- No change to close checklist, evidence, disposal follow-up, RBAC, or scheduler behavior.

