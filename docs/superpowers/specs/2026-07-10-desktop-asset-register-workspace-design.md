# Desktop Asset Register Workspace Design

**Date:** 2026-07-10

## Goal

Make the Asset Register behave like a reliable desktop workspace without changing asset workflows, API contracts, or permissions.

## Approved scope

- Remember the current browser's Asset Register filters, sort, page size, and column visibility.
- Restore the list scroll position only after opening an asset detail from the register and returning through its existing `returnTo` link.
- Keep bulk controls hidden until one or more rows are selected.
- Establish one reusable visual treatment for empty, error, and permission-denied states. Apply the first baseline to the Asset Register, dashboard access-denied route, and dashboard error boundary.

## Behaviour

1. The URL remains authoritative. A register URL with query parameters renders exactly as written and updates the saved browser preference.
2. A direct visit to a bare `/{locale}/assets` restores the last saved filter, sort, and page-size preference for that locale. Page number is deliberately not restored.
3. Browser preferences are local only. They are not written to the database and are not shared between users or browsers.
4. Existing column visibility persistence remains browser-local and is retained.
5. Returning from an asset detail restores the saved scroll position for that exact register URL after the list has rendered. Direct visits, filter changes, and pagination do not restore stale scroll positions.
6. Empty, error, and denied screens use Lucide icons, semantic color tokens, clear copy, and optional actions. They do not alter business permissions or server errors.

## Non-goals

- No new asset workflow or data model.
- No server-side user preference storage.
- No change to audit, check-out, check-in, import, export, or bulk mutation logic.
- No redesign of desktop navigation.

## Acceptance criteria

- A returning user sees their previous filter/sort/page-size view after opening the bare Asset Register URL.
- The current view is retained when they open an asset detail and return.
- The register scrolls back to the previous position only after this return path.
- Bulk actions render only with a non-empty selection.
- Asset Register empty, dashboard error, and access-denied views share a reusable state component and remain accessible.
