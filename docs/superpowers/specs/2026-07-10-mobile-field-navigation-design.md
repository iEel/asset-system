# Mobile Field Navigation Design

## Goal

Add a permission-aware mobile field navigation bar without changing asset, audit, scan, RBAC, SOD, offline queue, or API behavior.

## Approved Interaction Model

The mobile shell has two mutually exclusive modes:

1. **Navigation Mode** shows `หน้าหลัก / ทรัพย์สิน / สแกน / ตรวจนับ / เพิ่มเติม` on browsing and queue pages.
2. **Focus Task Mode** hides field navigation and leaves the existing contextual action bar in control on Audit Scan, edit, transaction, and detail pages that already own the bottom action area.

The two bottom bars must never render together. Page content receives safe-area bottom padding only when field navigation is visible.

## Navigation Destinations

- `หน้าหลัก` opens `/{locale}/dashboard` and requires `dashboard:view`.
- `ทรัพย์สิน` opens `/{locale}/assets` when the user has `asset:view`; employee-only users fall back to `/{locale}/my-assets`.
- `สแกน` opens the general asset lookup at `/{locale}/asset-management/scan` and requires `asset:view`.
- `ตรวจนับ` opens `/{locale}/audit/rounds` and requires `audit:view`.
- `เพิ่มเติม` opens the existing permission-filtered mobile sidebar.

The general Scan destination never guesses an audit round. Audit scanning continues to start from an existing Audit Round and keeps its original `auditRoundId`.

General Asset Scan remains in Navigation Mode because its camera controls are inline rather than a fixed contextual bottom action bar. This keeps the selected Scan destination visible without stacking two bottom surfaces.

## Focus Task Routes

Field navigation is hidden on:

- Audit Round Scan.
- Asset create, edit, detail, and label detail routes that use task-specific controls.
- Asset checkout, check-in, transfer, and bulk move.
- Audit Round create and round detail routes.
- Maintenance and disposal detail routes with existing `MobileActionBar` controls.

Audit Pending remains in Navigation Mode because `Mark Not Found` belongs to that queue and the page does not use the scanner action bar.

## Shell Behavior

- The existing topbar mobile menu button is hidden in Navigation Mode because `เพิ่มเติม` opens the same sidebar.
- The topbar global scan shortcut is hidden in Navigation Mode because Scan is already the center field-navigation action.
- Focus Task Mode keeps the topbar menu available as an escape route.
- Field navigation hides while the virtual keyboard is open by observing `window.visualViewport`.
- The navigation uses Lucide icons, 44px minimum touch targets, readable text labels, Electric Blue for active navigation, and semantic colors only for workflow status.

## Accessibility

- Render the bar as a labelled `<nav>`.
- Use `aria-current="page"` for the active destination.
- Keep icon and visible text together; do not communicate state by color alone.
- Include `env(safe-area-inset-bottom)` in both bar padding and page spacing.
- Preserve keyboard focus rings and reduced-motion behavior.

## Testing

- Unit-test locale removal, active destination selection, focus-route policy, and keyboard visibility threshold.
- Source-contract test the five Lucide destinations, RBAC filtering, shell padding, and topbar/sidebar integration.
- Run the full test suite, lint, and production build.
- Browser-test General Asset Scan at 375px and 390px in Navigation Mode plus Audit Scan in Focus Task Mode, checking that only one bottom bar is visible and body horizontal overflow is absent.

## Out Of Scope

- No API, schema, audit workflow, scan result, offline queue, or permission model changes.
- No new Audit Round or Scan Session concept.
- No replacement of manual Asset Tag or Serial Number entry.
- No bottom-sheet redesign of the full sidebar in this iteration.
