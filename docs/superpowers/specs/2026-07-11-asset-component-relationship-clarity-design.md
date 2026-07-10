# Asset Component Relationship Clarity Design

## Status

Approved direction from the product owner on 2026-07-11. This work improves the Asset Detail presentation and navigation only. It does not change component installation, removal, RBAC, audit logging, ownership, lifecycle, or API rules.

## Goal

Make the custody and component relationship easier to scan without adding another workflow:

1. The `การถือครอง / ส่วนควบ` tab signals active component relationships and missing child serial numbers before it is opened.
2. Opening a parent asset from a component preserves a safe link back to the originating child asset and its active detail view.
3. Role and installation slot are written as labelled fields instead of an ambiguous dot-separated string.

## Interaction Design

### Custody Tab Indicator

The custody tab receives an optional compact relationship count. The count is the number of active links in both directions: components installed under the current asset plus parent assets the current asset is installed under.

When one or more current child components lack a serial number, the tab also shows an `AlertTriangle` icon with visible iconography and a screen-reader label. The warning does not rely on color alone. No count or warning is shown when there is no active relationship or no affected child component.

### Parent Asset Navigation

Each parent-asset link uses a return target for the current Asset Detail URL, including its current `view` and hash anchor. This applies to the persistent relationship banner, the component summary, and the parent lane in the relationship map.

The Asset Detail return-target sanitizer accepts only:

- the existing Asset Register and Asset Scan return paths; and
- one same-locale Asset Detail route with a single encoded asset identifier.

Edit paths, external URLs, nested routes, and malformed paths remain rejected. Query strings and hashes on the accepted Asset Detail path are preserved so the user returns to the original component and tab.

### Relationship Copy

Where a relationship is displayed outside the full map, show the parent asset identity first. Its metadata is expressed as labelled fields:

- `บทบาท/ประเภทส่วนควบ: <role>`
- `ช่อง/ตำแหน่ง: <slot>` only when a slot exists.

The compact row may remain one line on desktop but must wrap safely on mobile. Existing translations for `componentRole` and `slotNo` are reused.

## Boundaries

- Preserve the persistent parent-context banner introduced in the previous change.
- Do not remove the existing component summary or relationship map in this change.
- Do not alter current ownership/custodian data.
- Do not add a new status, database field, route, or API request.
- Keep Lucide icons and the existing Navy/White/Blue token system.

## Verification

Focused tests will prove:

- the custody tab can render a relationship count and accessible missing-serial warning;
- an asset-detail return target is accepted while an asset edit target is rejected;
- every parent relationship presentation receives the generated parent href;
- relationship metadata uses the existing role and slot labels.

Run the focused asset-detail and return-navigation tests, TypeScript, lint, and the existing project verification command where the database environment permits it.
