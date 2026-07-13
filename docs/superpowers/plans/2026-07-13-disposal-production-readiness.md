# Disposal Production Readiness Implementation Plan

**Status (2026-07-13):** Implemented. Focused disposal tests, full verification, build, and browser/device UAT results should be recorded before release sign-off.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-ready disposal queue, request, approval, execution, evidence, and batch workflow.

**Architecture:** Centralize disposal policy in pure helpers shared by API validation and UI option filtering. Keep existing single-request records authoritative and add a lightweight batch wrapper for shared metadata and evidence. Use server-rendered URL state for queue filters/pagination and existing accessible dialog patterns for mutations.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7 + SQL Server manual migrations, Zod 4, next-intl, Lucide, Node test runner.

## Global Constraints

- Preserve existing RBAC, audit logging, asset movement, locale routing, and `returnTo` behavior.
- Approval uses `disposal:approve`; execution uses `disposal:edit`.
- Use test-first changes and run each focused test red then green.
- Use existing design tokens and accessible dialog components.
- Do not include unrelated `.agents`, `.gemini`, `.codex`, `.impeccable`, or `.superpowers` changes in commits.

---

### Task 1: Central Disposal Policy And Permissions

**Files:**
- Create: `src/lib/disposal-policy.ts`
- Modify: `src/app/api/disposal-requests/route.ts`
- Modify: `src/app/api/disposal-requests/[id]/route.ts`
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`
- Test: `tests/disposal-policy.test.ts`

- [ ] Write failing tests for eligible source statuses, approve/reject/execute status targets, requester/creator self-approval, approver execution separation, and action permissions.
- [ ] Run `npm test -- tests/disposal-policy.test.ts` and confirm the policy module is missing.
- [ ] Implement pure policy helpers and apply them in both APIs before mutations.
- [ ] Run the focused test and existing disposal stage/lifecycle tests.

### Task 2: Type-Aware Validation And Upload Recovery

**Files:**
- Modify: `src/lib/validations/disposal.ts`
- Modify: `src/components/disposal/disposal-request-form.tsx`
- Modify: `src/components/disposal/disposal-execution-button.tsx`
- Modify: `src/app/api/disposal-requests/[id]/route.ts`
- Test: `tests/disposal-validation.test.ts`
- Test: `tests/disposal-upload-recovery.test.ts`

- [ ] Write failing tests for required fields by disposal type and request-created/upload-failed recovery state.
- [ ] Run focused tests and confirm expected failures.
- [ ] Add discriminated execution validation, type-adaptive fields, stable error codes, and redirect/retry behavior after record creation.
- [ ] Run focused tests and upload validation regression tests.

### Task 3: Queue-First List, Create Route, And Pagination

**Files:**
- Create: `src/app/[locale]/(dashboard)/disposal/new/page.tsx`
- Create: `src/components/disposal/disposal-pagination.tsx`
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`
- Modify: `src/lib/disposal-query.ts`
- Modify: `src/lib/mobile-field-navigation.ts`
- Test: `tests/disposal-query.test.ts`
- Test: `tests/disposal-route-structure.test.ts`

- [ ] Write failing tests for parsed page/pageSize, stable query strings, route separation, and preserved source-prefill parameters.
- [ ] Run focused tests and confirm failures.
- [ ] Move request form to `/new`, add stage counts, server pagination, total range, page-size control, and mobile queue-first cards.
- [ ] Run focused tests and operational return/mobile navigation regressions.

### Task 4: Stage-Aware Detail Workspace

**Files:**
- Create: `src/components/disposal/disposal-workflow-stepper.tsx`
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`
- Modify: `src/components/disposal/disposal-decision-button.tsx`
- Modify: `src/components/disposal/disposal-execution-button.tsx`
- Modify: `src/components/disposal/disposal-attachments.tsx`
- Test: `tests/disposal-detail-workspace.test.ts`

- [ ] Write failing source-contract tests for detail next actions, progressive stage disclosure, ArrowLeft back icon, mutation-aware evidence, translated movement labels, and accessible dialog primitives.
- [ ] Run the focused test and confirm failures.
- [ ] Build the workflow header/stepper and reuse the existing accessible dialog focus contract for decision/execution.
- [ ] Run focused tests and relevant accessibility tests.

### Task 5: Batch Disposal Packet

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/manual-migrations/2026-07-13-add-disposal-batches.sql`
- Create: `src/lib/disposal-batch.ts`
- Create: `src/app/[locale]/(dashboard)/disposal/batch/new/page.tsx`
- Create: `src/components/disposal/disposal-batch-form.tsx`
- Create: `src/app/api/disposal-batches/route.ts`
- Create: `src/app/api/disposal-batches/[id]/route.ts`
- Test: `tests/disposal-batch.test.ts`

- [ ] Write failing tests for 2-100 item limits, duplicate IDs, one type per packet, shared metadata, item eligibility, and permission/SOD reuse.
- [ ] Run the focused test and confirm failures.
- [ ] Add schema/migration, pure batch preparation helpers, create API, batch actions, and focused UI.
- [ ] Run Prisma generation, focused tests, and schema/index tests.

### Task 6: Documentation And Release Verification

**Files:**
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/08_PRODUCTION_READINESS.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] Document queue/create/detail/batch behavior, permissions, SOD, type-specific evidence, migration, and rollback.
- [ ] Add UAT for every type, 100+ list rows, partial upload retry, role separation, invalid lifecycle source, and 2-100 batch items.
- [ ] Run focused disposal tests, `npm test`, `npm run verify`, and `npm run build`.
- [ ] Browser-test desktop and 390px mobile queue/create/detail/batch routes and confirm no body overflow or conflicting bottom navigation.
