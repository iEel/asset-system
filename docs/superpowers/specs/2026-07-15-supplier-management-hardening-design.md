# Supplier Management Hardening Design

**Date:** 2026-07-15
**Status:** Approved for implementation by the user on 2026-07-15

## Goal

Make Master Data → Suppliers safe for production operations, responsive under the existing Adaptive UI contract, accessible on touch devices, and scalable as supplier volume grows.

## Scope

This change covers the supplier list, supplier detail, create/edit form, supplier API update/delete behavior, summary queries, validation, empty states, accessibility, and regression coverage.

The existing combined `Tax ID / Supplier Code` database column remains unchanged in this iteration. Separating tax ID and supplier code requires a future data migration and is intentionally out of scope.

## Chosen Approach

Use a correctness-first incremental approach:

1. Correct update and delete semantics before changing presentation.
2. Keep the current information-dense table for desktop.
3. Add a purpose-built mobile card list rather than shrinking the desktop table.
4. Retain Server Components for database reads and use small Client Components only for form interaction and destructive confirmation.
5. Preserve current URLs, filters, sorting, permissions, return navigation, and Thai/English localization.

This approach avoids a broad master-data rewrite while fixing the highest-risk behavior and meeting the documented Adaptive UI contract.

## Functional Design

### Update and Delete Safety

- `PUT /api/suppliers/[id]` allows editing active supplier profile fields even when the supplier has linked assets, purchase documents, maintenance tickets, or maintenance plans.
- A transition from active to inactive is treated as deactivation and uses the same relationship guard as delete.
- `DELETE /api/suppliers/[id]` soft-deletes only when the supplier has no active linked assets, purchase documents, maintenance tickets, or maintenance plans.
- Delete/deactivation returns HTTP 409 with a localized, actionable relationship summary when blocked.
- Audit logging remains in place for successful updates and deletions.
- The relationship decision is extracted into a small testable policy helper so route tests do not depend on database mocks.

### Supplier Validation

- API validation mirrors database limits: contact person 200, phone 50, address 500, email 200, code 20, and name 200 characters.
- Empty optional strings continue to normalize to `null`.
- The form exposes field-level errors for validation failures and retains a toast for unexpected/server errors.
- Phone uses `type="tel"`, suitable input mode, and autocomplete metadata. Contact, email, and address also receive appropriate autocomplete attributes.
- The existing combined code field accepts legacy supplier codes. A 13-digit numeric value may receive Thai tax-ID format validation without rejecting non-tax legacy codes.

## Adaptive UI Design

### Supplier List

- Desktop (`md` and above) keeps the sortable table.
- Mobile renders supplier cards containing tax ID/supplier code, name, contact/phone, relationship counts, and actions.
- Mobile actions and pagination have minimum 44×44px targets.
- Summary metrics become a compact horizontally scrollable strip on mobile and retain the four-column grid on large desktop.
- Filters stay inline on desktop and use a compact stacked disclosure on mobile, while preserving query-string behavior.
- Empty states distinguish between an empty supplier registry and zero filtered results. They provide either “Create supplier” or “Clear filters”.
- The redundant Active column is removed from the active-only list. Inactive supplier management remains out of scope.

### Supplier Detail

- Existing relationship and follow-up content remains.
- Header actions and linked-item actions meet 44px mobile touch requirements.
- Purchase documents use a desktop table and a mobile stacked list so they never depend on horizontal scrolling.
- Metrics remain scannable but use a compact horizontal presentation on mobile to reduce distance to profile and linked records.

### Supplier Form

- Mobile controls and action buttons meet the 44px touch requirement.
- Header stacks cleanly on narrow screens.
- Save/cancel actions remain visible and full-width where appropriate on mobile.
- Unsaved changes are protected for browser unload and in-app back/cancel navigation through an explicit confirmation.
- Validation errors are associated with inputs using `aria-invalid` and `aria-describedby`.

## Accessibility Design

- Sortable table headers expose `aria-sort` on the active column.
- Icon-only edit/delete actions have explicit accessible names.
- All interactive controls use visible `focus-visible` rings.
- Disabled pagination remains non-focusable and semantically disabled.
- Mobile target sizes are at least 44px.
- Decorative icons are hidden from assistive technology where their surrounding control already has a name.

## Performance Design

- Replace the unbounded summary supplier read with database `count` queries using relationship filters.
- Keep paginated supplier row loading unchanged.
- Run independent counts in parallel.
- Do not add client-side data fetching or a large client component for the list.

## Error Handling

- Relationship conflicts return 409 and an actionable message.
- Zod validation failures return structured field errors suitable for inline display.
- Unique supplier-code conflicts return a user-facing duplicate message instead of a raw database failure.
- Unexpected errors continue through the shared API error handler and are shown as a generic localized toast.

## Testing Strategy

Follow red-green-refactor for each behavior:

- Policy tests for editing, deactivation, delete blocking, and maintenance-plan relationships.
- Validation tests for each database length limit and optional-null normalization.
- Source/UI tests for desktop table plus mobile cards, empty-state actions, touch sizes, and `aria-sort`.
- Form tests for field metadata, inline errors, and unsaved-change protection.
- Query tests for summary filters and preserved list query parameters.
- Existing supplier detail and master-data workspace tests remain green.
- Final verification runs the complete test suite, lint, production build, and authenticated Chrome checks at 375px and desktop width.

## Documentation

Update developer handoff, workflows, feature list, and UAT checklist only where supplier behavior or responsive acceptance criteria changed. Existing combined Tax ID / Supplier Code compatibility language remains.

## Success Criteria

- A supplier with linked assets can be edited successfully.
- A supplier with any protected active relationship cannot be deleted or deactivated.
- Supplier list operations are usable without horizontal table scrolling at 375px.
- Primary mobile actions meet the 44px target requirement.
- Empty and filtered-empty states provide a next action.
- Summary queries do not load every supplier record into application memory.
- No new console errors occur across list, detail, create, and edit pages.
- Full tests, lint, and production build pass.
