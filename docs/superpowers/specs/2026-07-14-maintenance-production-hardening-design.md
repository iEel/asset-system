# Maintenance Production Hardening Design

**Date:** 2026-07-14

**Status:** Approved for implementation planning

## Goal

Harden the Maintenance module so corrective repair tickets and preventive maintenance plans are operationally distinct, lifecycle-safe, permission-aware, scalable to the documented 2,000-5,000 asset range, accessible, localized, and auditable under concurrent use.

## Product Model

The Maintenance module has two related but distinct workflows.

### Corrective repair tickets

Corrective repair tickets represent equipment that is already damaged or has a confirmed problem. Their ticket workflow is:

`reported -> accepted -> in_progress -> waiting_parts|waiting_vendor -> completed -> closed`

Corrective tickets control asset lifecycle state:

- Opening a ticket moves an eligible asset to `Pending Repair`.
- Moving the ticket to `in_progress` moves the asset to `Under Maintenance`.
- Closing the ticket moves the asset to either `Ready` or `Pending Disposal`.
- An asset in a terminal or conflicting lifecycle state cannot receive a corrective ticket.
- An asset cannot have more than one active corrective repair ticket.

### Preventive maintenance plans and PM work orders

A PM plan defines scheduled inspection and preventive maintenance for an asset. It stores the frequency, next due date, internal owner, optional external provider, and instructions. When the plan becomes due, the system creates a PM work order linked to that plan.

PM work orders use ticket statuses for execution tracking but never change the asset lifecycle status. This applies when the PM work order is created, started, completed, or closed.

The system will add nullable `MaintenanceTicket.maintenancePlanId` as the authoritative distinction between corrective and PM work. Existing legacy PM tickets may fall back to the established `[PM] <planNo> -` problem prefix for display and compatibility, but new behavior must not depend on editable problem text.

## Architecture

### Domain policy

Create a focused maintenance policy module responsible for:

- Classifying corrective and PM tickets.
- Checking corrective-ticket asset eligibility.
- Detecting conflicting active corrective work.
- Defining allowed ticket status transitions.
- Determining when corrective transitions change asset lifecycle.
- Restricting corrective close targets to `Ready` and `Pending Disposal`.
- Ensuring PM transitions never mutate asset lifecycle.
- Determining whether evidence can be uploaded or deleted.

Route handlers and UI helpers must consume this policy instead of duplicating status rules.

### Persistence

Add a nullable maintenance-plan relation to `MaintenanceTicket`, an index for plan history lookup, and an idempotent SQL Server manual migration. PM generation writes this relation when creating a work order.

Ticket, asset, and movement mutations that represent one business event must execute in one transaction. Mutations use a conditional update or equivalent revalidation so concurrent stale actions return `409 MAINTENANCE_CONFLICT` instead of creating duplicate transitions or movements.

Document-number creation uses the existing bounded unique-retry pattern rather than relying only on a daily row count.

Audit logging remains supplemental to the transactional movement record, while every successful maintenance state mutation must create its authoritative movement in the same transaction.

### API errors

Maintenance APIs return stable error codes with an English diagnostic message. Client surfaces map known codes through `next-intl` and use a localized generic message for unknown failures. Required codes include:

- `MAINTENANCE_ASSET_INELIGIBLE`
- `MAINTENANCE_ACTIVE_TICKET_EXISTS`
- `MAINTENANCE_INVALID_TRANSITION`
- `MAINTENANCE_EVIDENCE_REQUIRED`
- `MAINTENANCE_INVALID_CLOSE_STATUS`
- `MAINTENANCE_EVIDENCE_LOCKED`
- `MAINTENANCE_CONFLICT`
- `MAINTENANCE_PM_REPORTER_REQUIRED`

## Corrective Ticket Behavior

The create API validates asset lifecycle and active-ticket conflicts before any mutation. Only eligible operational assets may enter corrective repair. The selected asset, reporter, assignee, and vendor must be active records.

The status API exposes only valid next states. Moving a corrective ticket to `in_progress` changes the asset to `Under Maintenance` in the same transaction. Waiting and completed ticket states retain the current maintenance lifecycle state.

The close action is available only for a closeable ticket. The close form offers only `Ready` and `Pending Disposal`. It requires root cause, resolution, return date, inspector, and at least one active repair-evidence attachment.

## PM Behavior

PM plans support create, edit, pause, resume, and end operations. Paused and ended plans do not participate in scheduled generation. Plan changes are audited.

An internal responsible employee remains optional for draft plan creation, but a plan without one is visibly marked `Automation blocked` and scheduled generation skips it with an actionable reason. Manual generation may use the current linked employee only when the endpoint explicitly supports that fallback.

New PM work orders store `maintenancePlanId`. Their status and close flows omit asset lifecycle fields and never update `Asset.statusId`.

PM plans cannot target terminal inactive-use assets such as Disposed or Retired assets. Plan eligibility is validated server-side and communicated in bounded asset search results.

## Evidence Policy

Users with `maintenance:view` can preview and download evidence. Mutation controls are absent for read-only users.

Users with `maintenance:edit` can upload evidence while a ticket is open. After closure, they may upload additional evidence as a post-close addendum. The upload audit entry records that the ticket was already closed.

Evidence attached to a closed ticket cannot be deleted through the maintenance UI or direct API. Open-ticket deletion continues to require `maintenance:edit` and an explicit accessible confirmation dialog.

## Queue-First Maintenance Workspace

The `/maintenance` page remains the entry point and contains two URL-backed tabs.

### Repair Tickets tab

- The primary header action is `Open Repair Ticket` and links to `/maintenance/new`.
- Summary metrics are drilldown links for open, overdue, waiting, and completed work.
- Filters include an active-filter summary, removable filters, clear-all, and validated date ranges.
- The server provides exact total count and pagination with page sizes 25, 50, and 100.
- Desktop table and mobile cards share one server result set. Row mutation dialogs are owned by a single action controller rather than one client-state instance per row and per responsive representation.
- Table mode supports every status filter.
- Board mode is explicitly an operational open-work view. Incompatible `open` legacy or `closed` filters must switch to table mode or present a clear route to the matching table instead of silently hiding results.

### PM Plans tab

- The primary header action is `Add PM Plan` and links to `/maintenance/pm/new`.
- Summary values come from exact aggregate counts, not a truncated plan preview.
- The plan list is paginated and provides Edit, Pause/Resume, End, and Generate PM Work Order actions according to permission and plan state.
- Plans missing an internal responsible employee show an `Automation blocked` status with remediation guidance.
- Generated PM work orders display a PM badge and link back to their source plan.

### Searchable master data

Asset, employee, and supplier selection uses server-bounded search. Queries shorter than two trimmed characters return no broad result set, and each response returns at most 50 active options. Existing selected values remain visible while searching.

## Ticket Detail

The detail header identifies the record as either a corrective repair ticket or PM work order. It shows only actions allowed by current permission and workflow state.

The close action is disabled with an explanation and evidence-section link when required evidence is missing. Corrective close includes asset outcome; PM close does not.

History uses localized movement labels rather than raw database movement codes. API failures are localized from stable error codes. Date-only defaults use a local-calendar helper and must not derive Thai local dates from UTC ISO slicing.

## Accessibility And Visual System

All maintenance dialogs use the shared accessible dialog primitive or native-equivalent behavior with:

- `role="dialog"` and `aria-modal="true"`.
- An accessible title and description.
- Focus containment.
- Escape dismissal when no mutation is committing.
- Focus restoration to the trigger.
- A 44px minimum touch target on mobile.

All interactive controls have visible `focus-visible` treatment. Warning and success text use their foreground tokens rather than the lower-contrast base semantic colors. Status continues to use text and icons in addition to color.

## Loading And Performance

The page queries only the active tab's required data. Evidence attachment IDs are queried only when an evidence filter requires them. Create and action forms do not serialize the complete active Asset, Employee, or Supplier tables into the page.

Pagination and bounded search are server-side. The maintenance route gets a shape-matching loading state when navigation latency warrants it. Responsive presentation must not duplicate hundreds of client modal instances.

## Validation And Test Strategy

Implementation follows test-driven development. Each behavior begins with a focused failing test, followed by the minimal implementation and regression verification.

Required automated coverage:

1. Corrective asset eligibility and active-ticket conflict rejection.
2. Corrective lifecycle changes at creation, start, and close.
3. PM create, status, and close paths never changing asset lifecycle.
4. Corrective and PM close payload differences.
5. Evidence permission visibility and post-close append-only behavior.
6. Conditional concurrent transition handling and transactional movement creation.
7. Bounded document-number conflict retries.
8. Exact pagination totals and accepted page sizes.
9. Board compatibility behavior for legacy open and closed filters.
10. PM plan edit, pause, resume, end, automation-blocked state, and bounded generation.
11. Two-character, 50-result bounded master-data search.
12. Dialog semantics, Escape behavior, focus containment, and focus restoration.
13. Semantic foreground token usage.
14. Asia/Bangkok local date defaults.
15. Thai and English maintenance error-code mapping.

Final verification runs focused tests after every task, followed by repository lint, full tests, Prisma generation, TypeScript validation, and the Next.js 16.2.4 production build. Manual UAT covers corrective repair, PM generation, post-close addendum upload, read-only RBAC, keyboard-only dialogs, 390px mobile layout, and concurrent stale submissions.

## Out Of Scope

- A cross-module generic workflow engine.
- Changing PM work orders to affect asset lifecycle.
- Deleting or rewriting historical closed-ticket evidence.
- Reworking disposal, audit, checkout, or transfer workflows beyond consuming corrected maintenance lifecycle state.
- Adding a new external notification channel for PM schedules.

## Success Criteria

- Corrective and PM workflows are visually and behaviorally distinct.
- No maintenance operation can silently place an asset into an invalid lifecycle state.
- PM work never changes asset lifecycle.
- Closed evidence is append-only.
- Read-only users see no mutation affordances.
- All list totals and pagination are truthful.
- The module remains usable at the documented production scale without shipping complete master-data tables to the browser.
- Keyboard, contrast, localization, and mobile behavior meet the project's WCAG 2.1 AA and enterprise design expectations.
