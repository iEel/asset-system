# General Asset Scan Mobile UX Design

## Goal

Make `/{locale}/asset-management/scan` feel like a stable mobile field-navigation destination while keeping camera scanning, manual lookup, permissions, routes, and asset-only search behavior unchanged.

## Confirmed Problems

- The General Asset Scan route is both the `scan` navigation destination and a Focus Task route, so selecting Scan removes the dock that owns its active state.
- The page-owned input class can collapse below the 44px mobile touch-control requirement inside the shared component's column layout.
- The mobile scan toggle hides its visible label and can show only a camera icon or loading spinner.
- Scanner-open state exposes two stop controls.
- A wrapping `<label>` contains the input, buttons, help text, and camera panel, causing the textbox accessible name to absorb unrelated scanner content.
- The placeholder comes from Global Search even though the request is sent with `scope=asset`.

## Approved Interaction Model

### Mobile navigation

General Asset Scan remains in Navigation Mode. The Mobile Field Navigation dock stays visible and marks `สแกน` / `Scan` as the current destination. Audit Scan and routes with page-owned contextual bottom action bars remain in Focus Task Mode.

This does not violate the Adaptive UI rule against stacking global navigation with a contextual action bar because General Asset Scan owns no fixed contextual bottom action bar; its camera controls remain inline and scroll with the page.

### Search and scanner controls

- The asset search input stays at least 44px high and fills the mobile width.
- The scan toggle shows a visible label on mobile in idle, loading, and active states.
- The toggle is the single start/stop control. The duplicate panel-close button is removed.
- The camera preview, torch, zoom, exact QR routing, and manual search behavior remain unchanged.

### Semantics and copy

- The field label uses an explicit `htmlFor`/`id` association instead of wrapping the composite scanner component.
- `ScannerTextInput` accepts an optional `id` and applies it to its native input.
- The page uses an asset-specific placeholder:
  - Thai: `ค้นหาด้วย Asset Tag, Serial Number, ผู้ถือครอง หรือสถานที่`
  - English: `Search by Asset Tag, Serial Number, custodian, or location`
- The helper copy remains the existing localized minimum-character message.

## Compatibility Constraints

- No API, schema, RBAC, SOD, audit workflow, scan routing, camera runtime, or dependency changes.
- Existing `ScannerTextInput` consumers keep working because the new `id` prop is optional.
- Touch controls remain at least 44px on mobile and retain existing desktop density at `sm` and above.
- Thai and English remain behaviorally equivalent.

## Verification

- Unit/source regression tests cover route mode, input semantics, visible toggle labels, one stop control, and localized asset-only placeholder copy.
- Focused tests must fail before implementation and pass afterward.
- Run scoped ESLint, TypeScript, the full test suite, and production verification.
- Browser QA at 390x844 confirms one visible dock with Scan active, a 44px input, visible button text, one stop control, no horizontal overflow, and no console errors.
