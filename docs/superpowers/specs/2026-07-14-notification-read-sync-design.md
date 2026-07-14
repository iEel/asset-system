# Notification Read-State Synchronization Design

## Problem

The notification bell can continue to show an active count after a user opens the linked work item. The current bell item is a plain link and does not persist read state. The Notification Center can persist read state, but its `router.refresh()` does not refresh the Topbar's client-owned summary because the Topbar fetches only when locale changes.

Maintenance notifications also group `completed` tickets into overdue work. Operationally, `completed` means repair work is finished but the ticket still requires the dedicated close/evidence step, so the current wording is misleading.

## Approved Outcome

1. Opening an active notification from the bell marks that notification key and its current count as read before navigation.
2. Any successful Notification Center mutation (read, unread, snooze, or assign) notifies the Topbar to fetch a fresh summary immediately.
3. Completed maintenance tickets are removed from the overdue-maintenance count and surfaced as a separate `completedMaintenanceAwaitingClose` notification.
4. The completed-awaiting-close notification counts every active ticket in `completed`, not only tickets whose due date has passed, and links to the existing completed maintenance queue.
5. Closing the ticket remains the business action that resolves the underlying condition. Read state suppresses only the current count; if the count changes, the existing policy makes the notification active again.

## Design

### Shared client synchronization

Add a small client-safe notification synchronization helper containing:

- a stable browser event name;
- a function that dispatches the event after successful notification state mutations;
- a pure helper for removing one read item from the locally displayed summary without producing a negative count.

The Topbar owns a reusable summary loader. It loads on locale changes and subscribes to the shared event. The listener performs an authoritative refetch. This keeps the badge correct after Notification Center actions without introducing a new global state library.

### Bell item navigation

Replace passive bell-item navigation with an async click flow:

1. prevent the default navigation;
2. PATCH `/api/notifications` with `action: "read"`, the notification key, and its displayed count;
3. on success, update the Topbar summary immediately and dispatch the synchronization event;
4. navigate to the item's existing localized destination;
5. on failure, retain the badge and still navigate so notification infrastructure cannot block operational work.

The item remains a semantic link with its normal href, keyboard behavior, focus treatment, and open-in-new-tab fallback.

### Maintenance notification semantics

The server summary queries two independent counts:

- `overdueMaintenance`: active tickets with an overdue due date whose status is not `completed` or `closed`;
- `completedMaintenanceAwaitingClose`: every active ticket with status `completed`.

The new key uses localized Thai/English title and detail copy and links to `/{locale}/maintenance?queue=completed`. Digest formatting receives the same key so daily summaries do not fall back to an internal identifier.

## Error Handling

- Failed read PATCH: do not optimistically hide the badge; continue navigation.
- Failed summary refetch: retain the last known summary instead of replacing it with zero.
- Successful mutations are the only operations that dispatch the synchronization event.
- Existing authentication, RBAC-derived counts, per-user state, snooze, assignment, and count-change reactivation rules remain unchanged.

## Tests

- Notification summary items include the new completed-awaiting-close key, copy path, tone, and completed queue href.
- Server query source or extracted policy proves `completed` is excluded from overdue and counted independently.
- Pure client-summary helper removes only the selected item/count and clamps total safely.
- Topbar source/behavior test proves bell opening PATCHes read state and subscribes to synchronization.
- Notification Center action test proves successful mutations dispatch synchronization before refresh.
- Thai/English notification keys and digest labels remain in parity.
- Focused notification tests, TypeScript, lint for touched files, full tests, production build, and Impeccable detector pass.

## Out of Scope

- Database schema or migration changes.
- Automatically closing maintenance tickets.
- Changing close evidence/checklist requirements.
- Replacing the existing notification state model or adding a client state library.
