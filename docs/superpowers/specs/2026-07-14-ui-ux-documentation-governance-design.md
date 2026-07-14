# UI/UX Documentation Governance Design

## Goal

Make the repository's UI/UX guidance easy to discover and maintain without duplicating the design system across several documents.

## Decision

`DESIGN.md` is the canonical source of truth for visual identity, design tokens, component vocabulary, accessibility principles, and the Desktop Management versus Mobile Field Operation model.

`docs/14_UI_UX_DESIGN_SYSTEM.md` will be the operational index for developers. It will explain how the canonical rules apply across major surfaces, link to route-specific designs and implementation plans, and provide a concise verification checklist. It will reference `DESIGN.md` instead of copying its full token tables.

## Document Ownership

### `DESIGN.md`

Owns:

- Brand Navy, Action Blue, Electric Blue, neutral, and semantic color roles.
- Typography, spacing, radius, elevation, and icon rules.
- Shared component vocabulary and interaction states.
- Accessibility and responsive design principles.
- The Adaptive UI contract: Desktop is for management and review; Mobile is for field operation.
- The rule that UI differences must reuse the same URL, API, business workflow, RBAC, validation, audit trail, and data model.

It must not become a feature changelog or contain implementation history for individual routes.

### `docs/14_UI_UX_DESIGN_SYSTEM.md`

Owns:

- A quick-start path for developers working on UI.
- A Desktop/Mobile behavior matrix.
- Mobile Field Navigation and contextual action-bar collision rules.
- A route-pattern index for Asset Register, Asset Detail, Audit Scan, Maintenance, Disposal, Reports, Login, and shared states.
- Links to focused design specifications and implementation plans.
- UI review and real-device QA checklists.
- Documentation precedence and update responsibilities.

It must not duplicate complete token definitions from `DESIGN.md`.

### Supporting Documents

- `Enterprise Web UI UX Requirements.md` remains the original enterprise baseline. `DESIGN.md` supersedes it when visual guidance conflicts.
- `docs/superpowers/specs/` records approved route or feature design decisions.
- `docs/superpowers/plans/` records implementation sequencing and verification steps.
- `DEVELOPER_HANDOFF.md` records the current implemented state, operational limitations, and remaining manual QA.
- `docs/99_CHANGELOG.md` records historical delivery notes rather than design policy.

## Documentation Precedence

Use this order when guidance conflicts:

1. Business workflow, RBAC, SOD, lifecycle, and security requirements.
2. `DESIGN.md` for current design-system policy.
3. The latest approved focused specification for a route or workflow.
4. `docs/14_UI_UX_DESIGN_SYSTEM.md` for implementation navigation and shared behavior.
5. Older plans, handoff history, and the original enterprise UI/UX baseline.

Runtime components and CSS remain the implemented behavior. A mismatch between runtime tokens and `DESIGN.md` is design-system drift to reconcile, not a reason to silently change the documentation.

## Adaptive UI Contract

- Desktop and Mobile may use different information hierarchy and interaction patterns.
- Desktop prioritizes comparison, bulk work, reports, administration, and review.
- Mobile prioritizes QR scanning, evidence capture, quick lookup, custody actions, and walking audits.
- Adaptive layouts must reuse the same workflow records and permission checks.
- A global Mobile Field Navigation bar and a page-owned contextual action bar must never render together.
- Scanner, edit, transaction, and other focus-task routes hide global field navigation while their contextual action surface is active.
- Mobile controls remain at least 44px, respect safe-area insets, avoid body-level horizontal overflow, and do not depend on hover.

## Planned Repository Changes

1. Add a document-governance and Adaptive UI section to `DESIGN.md`.
2. Create `docs/14_UI_UX_DESIGN_SYSTEM.md` as the developer-facing index and QA contract.
3. Add the new UI/UX entry point to `README.md`.
4. Add the new document to the reading order in `DEVELOPER_HANDOFF.md`.
5. Mark `Enterprise Web UI UX Requirements.md` as the historical baseline and point current work to `DESIGN.md`.

## Non-goals

- No UI component, CSS, route, API, database, RBAC, or business-workflow changes.
- No rewrite of existing focused specifications or implementation plans.
- No removal of historical UI/UX delivery notes.
- No copying of every route-specific decision into `DESIGN.md`.

## Acceptance Criteria

- A new developer can find the canonical design rules from both `README.md` and `DEVELOPER_HANDOFF.md`.
- `DESIGN.md` clearly states its ownership and relationship to business requirements and runtime code.
- The operational index clearly explains Desktop versus Mobile behavior and bottom-bar collision rules.
- Existing Adaptive Asset Register, Asset Detail, Audit Scan, Mobile Field Navigation, Login, Maintenance, Disposal, Reports, and shared-state documents are linked rather than duplicated.
- The documents contain no unfinished markers, conflicting precedence rules, or claims that visual policy may override business logic.
