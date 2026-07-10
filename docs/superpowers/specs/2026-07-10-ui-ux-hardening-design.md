# UI/UX Hardening Design

## Goal

Improve field reliability, shared accessibility, employee self-service, and high-traffic page usability without changing asset, audit, RBAC, or lifecycle business rules.

## Decisions Confirmed

- Keep the Navy, White, and Electric Blue design system and Lucide icon set.
- Preserve the existing split: desktop is a management/review workspace; mobile is an adaptive field workspace.
- Keep Audit Scan inside the existing `auditRoundId`, including raw QR traceability, offline queue behavior, SOD, and permission checks.
- Implement in small, independently verifiable commits on one feature branch.

## Sequence 1: Field Scan Reliability

- Clear a prior Audit Scan feedback result whenever an auditor selects a different in-round target from the pending queue or picker.
- Keep a safe return path from General Asset Scan to the asset detail and back to the same scanner route.
- Give mobile Asset Detail a `scan next` action only when the user arrived through General Asset Scan.
- Announce changing scan results and offline-state changes to assistive technology without adding visual noise.

## Sequence 2: Shared Interaction Accessibility

- Make `SearchableSelect` a keyboard-complete combobox: accessible labels, active option, Arrow Up/Down, Home/End, Escape, and a keyboard-accessible clear button.
- Introduce a reusable confirmation/reason dialog surface with focus handling, Escape, labelled semantics, and mobile-safe action layout.
- Replace the highest-risk browser prompts first: batch audit review and component removal.
- Preserve existing Thai and English copy through `next-intl` keys.

## Sequence 3: Employee Self-Service

- Add an employee-scoped detail route under `/my-assets/{id}`.
- Query by both asset id and the signed-in employee's `custodianId`; never expose purchase, supplier, accounting, or unrestricted asset history fields.
- Link My Assets desktop rows and mobile cards to the scoped detail view.
- Keep the detail lightweight and navigation-oriented rather than duplicating the full privileged Asset Detail dashboard.

## Sequence 4: Settings And High-Traffic Pages

- Make System Settings tab selection URL-backed and preserve the selected section on refresh or shared internal links.
- Warn before browser unload when settings are dirty; preserve the existing sticky save summary.
- Add focused loading boundaries for Asset Detail and Reports before attempting query-model refactors.
- Defer expensive data refactors until route timing evidence identifies the slowest query groups; do not cap or silently omit report data.

## Sequence 5: Visual Consistency

- Use semantic status tones instead of arbitrary database color text where shared components need guaranteed contrast.
- Align PWA browser chrome colors with the documented Navy token.
- Use a Thai-capable product font consistently across Thai and English UI.
- Ensure reusable empty-state actions retain the 44px mobile target.

## Validation

- Every behavior change starts with a focused failing automated test.
- Run affected test files after each task, then `npm run lint` and the complete test suite before the final commit.
- Keep real-device Android Chrome and iPhone Safari camera, torch, zoom, keyboard, rotation, and safe-area checks as explicit manual UAT gate items.
