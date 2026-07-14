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
| Navigation | Navy sidebar and light topbar | Field navigation on navigation routes; hidden in focus-task routes |
| Asset Register | Dense table, presets, columns, bulk actions | Search-first cards, compact filters, touch-safe row actions |
| Asset Detail | Comparison, history, documents, review actions | Compact identity, collapsible sections, contextual quick actions |
| Audit | Round setup, pending review, findings, close readiness | Scanner-first counting, evidence, pending queue, recent scans |
| Maintenance and Disposal | Queue management, approvals, bulk processing | Cards, explicit selection mode, focused dialogs |
| Reports | Dense filters, preview, export | Summary-first filters and contained tables |

Both presentations reuse the same URL, API, business records, workflow records, permission checks, validation, audit trail, and data model; only hierarchy and interaction may change.

## Navigation and Action Surfaces

- Navigation routes show Mobile Field Navigation.
- Scanner, edit, transaction, and detail routes with page-owned bottom actions use Focus Task Mode.
- Only one fixed bottom region may exist at a time.
- Reserve safe-area-aware content spacing only for the active bar.
- `Mark Not Found` belongs to Audit Pending, not successful scan results.
- Manual Asset Tag/Serial entry remains available beside QR scanning.

## Shared Visual and Interaction Reminders

Follow [`DESIGN.md`](../DESIGN.md) rather than copying token tables: use Navy identity, Action Blue primary fills, and Electric Blue for focus or emphasis. Use semantic statuses with readable text, plus icons or shapes where useful; use Lucide icons, an 8px control radius, and a 12px panel ceiling. Favor borders and tonal hierarchy. Do not introduce decorative gradients, glass effects, or heavy motion. Implement standard component states and consistent skeleton, empty, error, and denied patterns.

## Route-Pattern Index

- [`docs/superpowers/plans/2026-07-10-modern-enterprise-adaptive-ui.md`](superpowers/plans/2026-07-10-modern-enterprise-adaptive-ui.md) defines the enterprise adaptive UI direction across management and field-operation surfaces.
- [`docs/superpowers/specs/2026-07-10-mobile-field-navigation-design.md`](superpowers/specs/2026-07-10-mobile-field-navigation-design.md) owns the focused design decisions for Mobile Field Navigation.
- [`docs/superpowers/plans/2026-07-10-mobile-field-navigation.md`](superpowers/plans/2026-07-10-mobile-field-navigation.md) sequences implementation and verification for Mobile Field Navigation.
- [`docs/superpowers/plans/2026-07-10-desktop-asset-register-workspace.md`](superpowers/plans/2026-07-10-desktop-asset-register-workspace.md) defines the Desktop Asset Register workspace approach.
- [`docs/superpowers/plans/2026-07-10-asset-detail-components-ux-implementation.md`](superpowers/plans/2026-07-10-asset-detail-components-ux-implementation.md) defines Asset Detail component and UX implementation work.
- [`docs/superpowers/plans/2026-07-11-asset-detail-ux-polish.md`](superpowers/plans/2026-07-11-asset-detail-ux-polish.md) records Asset Detail polish and review work.
- [`docs/superpowers/specs/2026-07-11-login-ux-design.md`](superpowers/specs/2026-07-11-login-ux-design.md) owns the Login route UX design decisions.
- [`docs/superpowers/specs/2026-07-13-disposal-production-readiness-design.md`](superpowers/specs/2026-07-13-disposal-production-readiness-design.md) owns disposal workflow production-readiness design decisions.
- [`docs/superpowers/specs/2026-07-14-maintenance-production-hardening-design.md`](superpowers/specs/2026-07-14-maintenance-production-hardening-design.md) owns maintenance workflow production-hardening design decisions.
- [`docs/superpowers/plans/2026-07-10-module-ux-roadmap.md`](superpowers/plans/2026-07-10-module-ux-roadmap.md) maps UX sequencing across product modules.
- [`docs/superpowers/specs/2026-07-10-ui-ux-hardening-design.md`](superpowers/specs/2026-07-10-ui-ux-hardening-design.md) owns cross-cutting UI/UX hardening decisions.

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

Update [`DESIGN.md`](../DESIGN.md) for shared policy, a focused specification for route behavior, the Handoff for implemented state and manual QA, and the changelog for delivery history.
