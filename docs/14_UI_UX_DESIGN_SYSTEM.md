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

Follow the canonical [`Colors`](../DESIGN.md#2-colors), [`Typography`](../DESIGN.md#3-typography), and [`Components`](../DESIGN.md#5-components) sections of [`DESIGN.md`](../DESIGN.md); do not copy mutable token values into route documentation. Use semantic statuses with readable text plus icons, shapes, or clear workflow context where useful. Reuse Lucide icons and existing component helpers, favor borders and tonal hierarchy, and avoid decorative gradients, glass effects, and heavy motion. Implement consistent loading, empty, error, and denied states.

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
| Maintenance | [`2026-07-14-maintenance-production-hardening-design.md`](superpowers/specs/2026-07-14-maintenance-production-hardening-design.md) | [`2026-07-14-maintenance-production-hardening.md`](superpowers/plans/2026-07-14-maintenance-production-hardening.md) sequences implementation and verification. |
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
