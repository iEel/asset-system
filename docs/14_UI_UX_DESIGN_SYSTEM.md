# UI/UX Design System and Adaptive Interface Guide

This is the developer-facing index for applying the Asset Management System design across Desktop and Mobile. It links to canonical policy and focused route decisions without duplicating their full contents. [`DESIGN.md`](../DESIGN.md) owns the canonical visual identity, tokens, component vocabulary, accessibility principles, and Adaptive UI policy.

## Source of Truth

1. Business workflow, RBAC, SOD, lifecycle, and security requirements.
2. [`DESIGN.md`](../DESIGN.md) for current visual and Adaptive UI policy.
3. The latest approved focused specification for a route or workflow.
4. This operational index for implementation navigation and shared behavior.
5. Older plans, Handoff history, and the original enterprise UI/UX baseline.

## Quick Start

Before editing UI, read:

- [`PRODUCT.md`](../PRODUCT.md) for users, product purpose, and operating context.
- [`DESIGN.md`](../DESIGN.md) for canonical policy.
- This guide for shared Desktop/Mobile behavior and verification.
- The latest focused route specification for the workflow being changed.
- Existing helpers and components before creating a new pattern.
- Relevant Handoff notes for implemented state and manual QA context.

## Adaptive Presentation

| Concern | Desktop Management / Review | Mobile Field Operation |
|---|---|---|
| Navigation | White sidebar with sections and a light topbar | Field navigation on navigation routes; hidden in focus-task routes |
| Asset Register | Dense table, presets, columns, bulk actions | Search-first cards, compact filters, touch-safe row actions |
| Asset Detail | Comparison, history, documents, review actions | Compact identity, collapsible sections, contextual quick actions |
| Audit | Round setup, pending review, findings, close readiness | Scanner-first counting, evidence, pending queue, recent scans |
| Maintenance and Disposal | Queue management, approvals, bulk processing | Cards, explicit selection mode, focused dialogs |
| Reports | Dense filters, preview, export | Summary-first filters and contained tables |

Both presentations reuse the same URL, API, business records, workflow records, permission checks, validation, audit trail, and data model; only hierarchy and interaction may change.

## Navigation and Action Surfaces

- Navigation routes show Mobile Field Navigation.
- Scanner, edit, transaction, and detail routes with page-owned bottom actions use Focus Task Mode, and so do the settings page and every `new` and `[id]/edit` form (phase 2C). List pages keep Mobile Field Navigation.
- Only one fixed bottom region may exist at a time.
- Reserve safe-area-aware content spacing only for the active bar.
- `Mark Not Found` belongs to Audit Pending, not successful scan results.
- Manual Asset Tag/Serial entry remains available beside QR scanning.

## Shared Visual and Interaction Reminders

Follow the canonical [`Colors`](../DESIGN.md#2-colors), [`Typography`](../DESIGN.md#3-typography), and [`Components`](../DESIGN.md#5-components) sections of [`DESIGN.md`](../DESIGN.md); do not copy mutable token values into route documentation. Use semantic statuses with readable text plus icons, shapes, or clear workflow context where useful. Reuse Lucide icons and existing component helpers, favor borders and tonal hierarchy, and avoid decorative gradients, glass effects, and heavy motion. Implement consistent loading, empty, error, and denied states.

## Shared Components

Build screens from the shared primitives in `src/components/ui/`. Their look and rules live in [`DESIGN.md` §5](../DESIGN.md#5-components); do not copy their class strings into pages.

| Need | Use | Remember |
| --- | --- | --- |
| A button, or a link that looks like one | `Button`, or `buttonVariants({ variant, size })` on a `Link` | `danger` for a destructive action in a page, `destructive` only to confirm it in a dialog; `busy={x}` while working, never with `x` in `disabled` and never with `asChild`; the label stays the same while busy; the primary action comes last |
| A choice of 2 to 4 options shown as buttons | `Segmented` | `aria-label` names the group; values are strings |
| A text link | `linkVariants({ size })` | `meta` when it stands alone, `inherit` inside a sentence |
| A text field, select or textarea | `Input`, `NativeSelect`, `Textarea` with `fieldSize` | `getFieldControlClasses()` for a control that cannot use them |
| A label with hint and error | `Field` | sets `id`, `aria-describedby`, `aria-invalid` and `aria-required`; keep `required`, `maxLength` and `minLength` on the control; `labelAction` for one icon button beside the label; never around `SearchableSelect`, never inside a `<label>` |
| A label for a group of checkboxes or radios | `<fieldset className="min-w-0">` with `<legend className={cn(fieldLabelClasses, "mb-1.5")}>` | `<FieldRequiredMark />` for a required group |
| A radio or checkbox option | `ChoiceCard` (full-width card) or `ChoiceChip` (inline chip) | the input stays visible; Enter never submits the form |
| A file picker | `FileDropzone`, plus `FileQueueList` for files that wait to upload | help text goes in `description`, not in `Field`'s `hint` |
| A search box | `SearchField` | `onClear` and `clearLabel` only from a client component |
| A searchable picker | `SearchableSelect` | has its own label, hint and error |
| An action menu | `DropdownMenu` | an item that cannot run now uses `unavailable` with `DropdownMenuItemDescription` for the reason |
| A keyboard hint | `Kbd` | Latin keys and symbols only |
| A status | `StatusBadge` | one size; there is no `size` prop |
| A breadcrumb trail | `Breadcrumbs` | `code: true` for an asset tag or document number |
| A page title, its facts and its buttons | `PageHeader` | the only `h1`; a status badge only in `meta`; `md` buttons, back first and primary last; no outer margin (a `space-y-6` root, or `className="mb-6"` in a form) |
| A back button in a header | `PageBackLink` through `PageHeader back` | `href` is the page's own expression, `returnTo` included; `label` is the page's own words; an icon button below `md` |
| Tabs that change the URL | `TabNav` | `aria-label` names the row; counts through `formatCount`; state that does not change the URL uses `Segmented` |
| A list table | `DataTable` with `DataTableHeader`, `DataTableHead`, `DataTableBody`, `DataTableRow` (or `ClickableTableRow`) and `DataTableCell` | one density; the first and last columns keep 16/20px; `sort` on `DataTableHead` sets `aria-sort`; `scrollHint` when the table can overflow on phones |
| An empty table | `TableEmptyRow` | one line through `children`, or `emptyState` for a title, a description or a button |
| Page links under a table | `Pagination` in `DataTable footer`, with `parseListPage`, `listPageWindow`, `lastListPage` and `appendListPage` (`src/lib/list-pagination.ts`) | 25/50/100; a page past the end redirects to `lastListPage` (a list cut in memory clamps instead); links keep `page` and `pageSize`, and so does the `returnTo` of each record link; counts above the list cover every page |
| A filter select | `FilterSelect` | `fieldSize="lg"` in a filter panel, `md` with `hideLabel` in a toolbar; `allLabel` for the "all" option |
| The buttons of a filter form | `FilterFormActions` | pass `clear` only while a filter is active |
| The active filters | `FilterChipList` | chips only for filters that are not visible on screen; `removeLabel` starts each chip's name |
| A next step and more actions in a table row | `RowActions` | data-only props; delete through `deleteAction`, never a delete button in the row; `menuLabel={tCommon("moreActionsFor", { code })}`; to open a 2C dialog, a small client wrapper renders the dialog's button outside the menu with `hideTrigger`, calls its `open()` handle and passes `returnFocusRef={openerRef}`; a dialog without a handle keeps its button in the cell |
| Counts above a list | `StatStrip` | values already formatted and counted over the whole filtered list; no tone fill; a cell that filters takes `href`, the cell of the filter in use `current`, and a count that needs action `attention` |
| Label and value pairs | `KeyValueList` | empty values become `Nil` by themselves |
| A panel with a head row | `ContentPanel divided`, with `flush` for a table or a `ContentPanelRows` list | without `divided` it is the plain panel |
| An empty value | `Nil`, `orNil` | `0` is a value, not blank |
| A count or an amount of money | `formatCount`, `formatMoney` (`src/lib/display-format.ts`) | always th-TH and 2 decimals for money; the unit (`common.baht`) goes after the number, or in the column header of a table |
| A toast | `toast.*` or `useApiError().toast` | `AppToaster` styles every toast; do not pass `richColors` |
| A message box | `Notice` with `tone` | write `role` or `aria-live` at the call site |
| An empty state | `EmptyNote` for one line, `ActionEmptyState` for a title, description or action | |
| A dialog | `AccessibleDialog` with `AccessibleDialogBody`, `AccessibleDialogFooter` and `AccessibleDialogCancel` | a `<form className={accessibleDialogFormClasses}>` wraps body and footer; secondary first, primary last; no `<form>` in a dialog that renders inside another form |
| A confirmation | `useConfirm()` | `confirmLabel` is a verb |
| A save bar for a long form | `StickyFormFooter` | the last child of the `<form>`; on focus-task routes only |
| Progress through a multi-step flow | `Steps`, with `getLinearStepStates` (`src/lib/step-states.ts`) | numbered sections that are not steps use `FormSection` |
| A numbered form section | `FormSection` | `as="h3"` under a page that already has an `h2` |
| The record a form is about | `FormContextBanner` | `code` shows a record code as `tag` |

Phase 2A built the first set, phase 2C plan 1 added the form and dialog pieces, and phase 2B plan 1 added the list and page-frame pieces; phases 2B to 2D move the hand-written controls onto them. The ratchet guards in `tests/visual-foundation-guards.test.ts`, for forms and dialogs `tests/form-migration-guards.test.ts`, and for list pages and page frames `tests/list-frame-guards.test.ts` let their per-file budgets go down, never up.

## Current-Surface Registry

A focused design record is current and approved for repository work only when this registry lists it in the **Current design record** column. When no focused record is listed, [`DESIGN.md`](../DESIGN.md) and this guide govern; create and register a focused specification before making material route-behavior changes. Plans record implementation sequencing and verification only; they do not supersede a current design record.

When a focused specification is added, replaced, or retired, update this registry in the same commit. For a replacement, retain the former record in history and mark it `Superseded by <replacement>` so the authority change is auditable.

| Current surface | Current design record | Implementation and supporting records |
| --- | --- | --- |
| Mobile Field Navigation | [`2026-07-10-mobile-field-navigation-design.md`](superpowers/specs/2026-07-10-mobile-field-navigation-design.md) | [`2026-07-10-mobile-field-navigation.md`](superpowers/plans/2026-07-10-mobile-field-navigation.md) sequences implementation and verification. |
| Asset Register | [`2026-07-10-desktop-asset-register-workspace-design.md`](superpowers/specs/2026-07-10-desktop-asset-register-workspace-design.md) | [`2026-07-10-desktop-asset-register-workspace.md`](superpowers/plans/2026-07-10-desktop-asset-register-workspace.md) is the implementation and sequencing record. |
| Asset Detail and components | [`2026-07-10-asset-detail-components-ux-design.md`](superpowers/specs/2026-07-10-asset-detail-components-ux-design.md) | [`2026-07-10-asset-detail-components-ux-implementation.md`](superpowers/plans/2026-07-10-asset-detail-components-ux-implementation.md) and [`2026-07-11-asset-detail-ux-polish.md`](superpowers/plans/2026-07-11-asset-detail-ux-polish.md) record implementation, sequencing, and polish history. |
| Audit Scan | No dedicated scan specification; the current cross-cutting record is [`2026-07-10-ui-ux-hardening-design.md`](superpowers/specs/2026-07-10-ui-ux-hardening-design.md). | [`2026-07-10-modern-enterprise-adaptive-ui.md`](superpowers/plans/2026-07-10-modern-enterprise-adaptive-ui.md) is implementation direction only. |
| Reports | No focused current specification; [`DESIGN.md`](../DESIGN.md) and this guide govern. A focused specification is required before material route-behavior changes. | [`2026-07-10-module-ux-roadmap.md`](superpowers/plans/2026-07-10-module-ux-roadmap.md) provides supporting implementation guidance. |
| Login | [`2026-07-11-login-ux-design.md`](superpowers/specs/2026-07-11-login-ux-design.md) | [`2026-07-11-login-ux.md`](superpowers/plans/2026-07-11-login-ux.md) sequences implementation and verification. |
| Disposal | [`2026-07-13-disposal-production-readiness-design.md`](superpowers/specs/2026-07-13-disposal-production-readiness-design.md) | [`2026-07-13-disposal-production-readiness.md`](superpowers/plans/2026-07-13-disposal-production-readiness.md) sequences implementation and verification. |
| Maintenance | [`2026-10-07-simple-repair-records-design.md`](superpowers/specs/2026-10-07-simple-repair-records-design.md) (one-form repair records; supersedes [`2026-07-14-maintenance-production-hardening-design.md`](superpowers/specs/2026-07-14-maintenance-production-hardening-design.md)) | [`2026-10-07-simple-repair-records.md`](superpowers/plans/2026-10-07-simple-repair-records.md) sequences implementation and verification. |
| App shell and visual foundation | [`2026-10-10-ui-foundation-design.md`](superpowers/specs/2026-10-10-ui-foundation-design.md) (UI round 4 phase 1: light-shell color tokens, single focus ring, IBM Plex fonts and Thai line heights, flat panels, two-tier status badge, white sidebar with sections, topbar, mobile bottom bar, PWA theme color) | [`2026-10-10-ui-foundation.md`](superpowers/plans/2026-10-10-ui-foundation.md) sequences implementation and verification. |
| Shared components | [`2026-10-11-ui-phase2a-design.md`](superpowers/specs/2026-10-11-ui-phase2a-design.md) (UI round 4 phase 2A: the tokens phase 2 needs, buttons, fields, menus and popovers, toasts, notices and empty states, one status badge size, breadcrumbs, empty-value and number helpers, four codemods with ratchet guards; its §10 overrides the section files in [`2026-10-11-ui-phase2a/`](superpowers/specs/2026-10-11-ui-phase2a/)) | [`2026-10-11-ui-phase2a.md`](superpowers/plans/2026-10-11-ui-phase2a.md) sequences implementation and verification. |
| Forms and dialogs | [`2026-10-11-ui-phase2c-design.md`](superpowers/specs/2026-10-11-ui-phase2c-design.md) (UI round 4 phase 2C: forms and dialogs on the 2A primitives in five batches; `Segmented`, `Field labelAction`, the dialog parts, `StickyFormFooter`, `Steps`, `FormSection`, `ChoiceCard`/`ChoiceChip`, `FileQueueList`; the bottom navigation hidden on form routes; one readable validation error; its §10 rulings I1–I36 override the section files in [`2026-10-11-ui-phase2c/`](superpowers/specs/2026-10-11-ui-phase2c/)) | [`2026-10-11-ui-phase2c-plan1.md`](superpowers/plans/2026-10-11-ui-phase2c-plan1.md) sequences plan 1 (P0, the 2C-0 primitives, the ZodError fix and batch 1); [`2026-10-12-ui-phase2c-plan2.md`](superpowers/plans/2026-10-12-ui-phase2c-plan2.md) sequences plan 2 (batch 2, the master-data forms); plans 3–5 follow, one per batch. |
| List pages and page frames | [`2026-10-12-ui-phase2b-design.md`](superpowers/specs/2026-10-12-ui-phase2b-design.md) (UI round 4 phase 2B: `PageHeader` and `PageBackLink`, `DataTable` with `TableEmptyRow` and `Pagination`, the filter parts, `RowActions`, `TabNav`, `StatStrip`, `KeyValueList`, `ContentPanel divided`; the sidebar with the asset register first; server pagination of 9 lists; its §10 rulings I1–I34 override the section files in [`2026-10-12-ui-phase2b/`](superpowers/specs/2026-10-12-ui-phase2b/)) | [`2026-10-12-ui-phase2b-plan1.md`](superpowers/plans/2026-10-12-ui-phase2b-plan1.md) sequences plan 2B-1 (the primitives, the master-data lists and users, the sidebar and the form headers); [`2026-10-13-ui-phase2b-plan2.md`](superpowers/plans/2026-10-13-ui-phase2b-plan2.md) sequences plan 2B-2 (the disposal, audit, maintenance, data-quality and integration lists, five of them with real pages); plans 2B-3 to 2B-5 follow (spec §10.3). |
| Cross-cutting UI hardening | [`2026-07-10-ui-ux-hardening-design.md`](superpowers/specs/2026-07-10-ui-ux-hardening-design.md) | [`2026-07-10-ui-ux-hardening.md`](superpowers/plans/2026-07-10-ui-ux-hardening.md) sequences implementation and verification; [`2026-07-10-module-ux-roadmap.md`](superpowers/plans/2026-07-10-module-ux-roadmap.md) provides module-level sequencing. |

## UI QA Checklist

- Verify 375px, 390px, 414px, 768px, and desktop viewports.
- Confirm no body-level horizontal overflow.
- Confirm exactly one bottom navigation or action region is active.
- Confirm 44px mobile targets and safe-area padding for the active fixed region.
- Test keyboard focus, Escape behavior, focus restoration, and accessible names.
- Check Thai/English parity and wrapping for long Thai text.
- Confirm every status combines text with semantic color, icon, or shape.
- Test loading, empty, error, denied, offline, and partial-failure states.
- Where applicable, complete real Android/iPhone UAT for camera access, torch/zoom, rotation, offline queue, evidence upload, and the Brother print dialog.

## Change Maintenance

Update [`DESIGN.md`](../DESIGN.md) for shared policy, a focused specification for route behavior, the Handoff for implemented state and manual QA, and the changelog for delivery history. Update the Current-Surface Registry in the same commit whenever a focused specification changes status, including when it is added, replaced, retired, or marked superseded.
