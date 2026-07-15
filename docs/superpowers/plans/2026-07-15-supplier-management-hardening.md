# Supplier Management Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make supplier update/delete behavior safe, replace the mobile desktop-table experience with an adaptive supplier workspace, and harden validation, accessibility, performance, and handoff coverage.

**Architecture:** Keep supplier reads and list composition in App Router Server Components, extract pure policy and summary helpers for deterministic tests, and keep browser-only form safeguards in the existing focused Client Component. Desktop retains the sortable table while mobile receives a separately rendered operational card list; both consume the same paginated supplier data and URL state.

**Tech Stack:** Next.js 16.2.4 App Router, React 19, TypeScript 5, Tailwind CSS 4, next-intl, Prisma 7 with SQL Server, Zod, Lucide React, Node test runner.

## Global Constraints

- Preserve existing supplier URLs, RBAC permissions, soft-delete semantics, audit logs, return navigation, database schema, and the combined 20-character `Tax ID / Supplier Code` compatibility contract.
- Active supplier profile fields remain editable even when linked records exist.
- Delete or active-to-inactive transition is blocked by active assets, maintenance tickets, maintenance plans, or purchase documents.
- Desktop uses the dense sortable table at `md+`; mobile uses cards below `md` and never requires horizontal table scrolling.
- Mobile interactive targets are at least 44px with visible focus and explicit accessible names.
- Keep pages and database reads server-rendered; isolate browser APIs inside the supplier form Client Component.
- Use semantic design tokens and existing shared UI patterns; add no dependency, gradient, raw palette, or decorative animation.
- Keep Thai and English message keys equivalent and do not hardcode new user-facing copy.
- Every behavior change begins with a focused failing test and completes with focused passing tests before broader verification.
- Follow `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `05-server-and-client-components.md`: route methods remain uncached request-time handlers, page database work stays server-side, and browser lifecycle work stays inside a Client Component.

---

### Task 1: Correct supplier update, deactivation, and delete policy

**Files:**
- Create: `src/lib/supplier-lifecycle-policy.ts`
- Modify: `src/app/api/suppliers/[id]/route.ts`
- Modify: `src/lib/organization-master-query.ts`
- Create: `tests/supplier-lifecycle-policy.test.ts`
- Modify: `tests/organization-master-query.test.ts`

**Interfaces:**
- Produces: `SupplierRelationshipCounts`, `hasProtectedSupplierRelationships(counts)`, and `shouldBlockSupplierLifecycleChange({ currentIsActive, nextIsActive, operation, counts })`.
- Extends: `getSupplierDeleteBlockReason` with `maintenancePlans`.
- Routes consume the pure policy after loading active relationship counts.

- [ ] **Step 1: Write failing policy tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { shouldBlockSupplierLifecycleChange } from "../src/lib/supplier-lifecycle-policy.ts"

const linked = { assets: 1, maintenanceTickets: 1, maintenancePlans: 1, purchaseDocuments: 1 }

test("allows profile updates when an active supplier has linked records", () => {
  assert.equal(shouldBlockSupplierLifecycleChange({ currentIsActive: true, nextIsActive: true, operation: "update", counts: linked }), false)
})

test("blocks deactivation and delete when protected links remain", () => {
  assert.equal(shouldBlockSupplierLifecycleChange({ currentIsActive: true, nextIsActive: false, operation: "update", counts: linked }), true)
  assert.equal(shouldBlockSupplierLifecycleChange({ currentIsActive: true, nextIsActive: false, operation: "delete", counts: linked }), true)
})

test("allows delete when no protected links remain", () => {
  assert.equal(shouldBlockSupplierLifecycleChange({ currentIsActive: true, nextIsActive: false, operation: "delete", counts: { assets: 0, maintenanceTickets: 0, maintenancePlans: 0, purchaseDocuments: 0 } }), false)
})
```

- [ ] **Step 2: Run the policy test and verify RED**

Run: `node --test tests/supplier-lifecycle-policy.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/supplier-lifecycle-policy.ts`.

- [ ] **Step 3: Implement the minimal pure policy**

```ts
export type SupplierRelationshipCounts = {
  assets: number
  maintenanceTickets: number
  maintenancePlans: number
  purchaseDocuments: number
}

export function hasProtectedSupplierRelationships(counts: SupplierRelationshipCounts) {
  return Object.values(counts).some((count) => count > 0)
}

export function shouldBlockSupplierLifecycleChange(input: {
  currentIsActive: boolean
  nextIsActive: boolean
  operation: "update" | "delete"
  counts: SupplierRelationshipCounts
}) {
  const removesFromActiveUse = input.operation === "delete" || (input.currentIsActive && !input.nextIsActive)
  return removesFromActiveUse && hasProtectedSupplierRelationships(input.counts)
}
```

- [ ] **Step 4: Extend the Thai relationship reason test first**

Add an assertion that `getSupplierDeleteBlockReason({ assets: 0, maintenanceTickets: 0, maintenancePlans: 2, purchaseDocuments: 0 })` includes `แผน PM 2 รายการ`; run `node --test tests/organization-master-query.test.ts` and verify the type/assertion fails before changing the helper.

- [ ] **Step 5: Integrate the policy into PUT and DELETE**

Load `_count.maintenancePlans` with active relationship counts in both handlers. `PUT` invokes the policy only for an active-to-inactive transition; normal profile edits proceed. `DELETE` loads the same counts, returns 409 with `getSupplierDeleteBlockReason` when blocked, and soft-deletes only when allowed. Preserve successful audit records.

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test tests/supplier-lifecycle-policy.test.ts tests/organization-master-query.test.ts`

Expected: PASS.

```powershell
git add src/lib/supplier-lifecycle-policy.ts src/lib/organization-master-query.ts "src/app/api/suppliers/[id]/route.ts" tests/supplier-lifecycle-policy.test.ts tests/organization-master-query.test.ts
git commit -m "fix(suppliers): protect lifecycle changes"
```

---

### Task 2: Harden supplier validation and form error behavior

**Files:**
- Modify: `src/lib/validations/supplier.ts`
- Create: `src/lib/supplier-form-errors.ts`
- Modify: `src/components/master-data/supplier-form.tsx`
- Create: `tests/supplier-validation.test.ts`
- Create: `tests/supplier-form-ui.test.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: field-specific optional text schemas with database-aligned limits.
- Produces: `SupplierFormField` and `parseSupplierFormError(payload)` returning `{ message?: string; fieldErrors: Partial<Record<SupplierFormField, string>> }`.
- Form associates field errors using `aria-invalid` and `aria-describedby`.

- [ ] **Step 1: Write failing validation tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { supplierSchema } from "../src/lib/validations/supplier.ts"

test("normalizes optional supplier fields to null", () => {
  const result = supplierSchema.parse({ code: "SUP-1", name: "Vendor", contactPerson: " ", phone: "", email: "", address: "", isActive: true })
  assert.equal(result.contactPerson, null)
  assert.equal(result.phone, null)
  assert.equal(result.email, null)
  assert.equal(result.address, null)
})

test("enforces supplier database field lengths", () => {
  assert.equal(supplierSchema.safeParse({ code: "SUP-1", name: "Vendor", contactPerson: "x".repeat(201), isActive: true }).success, false)
  assert.equal(supplierSchema.safeParse({ code: "SUP-1", name: "Vendor", phone: "x".repeat(51), isActive: true }).success, false)
  assert.equal(supplierSchema.safeParse({ code: "SUP-1", name: "Vendor", address: "x".repeat(501), isActive: true }).success, false)
})
```

- [ ] **Step 2: Run validation tests and verify RED**

Run: `node --test tests/supplier-validation.test.ts`

Expected: FAIL because optional values are not length-constrained.

- [ ] **Step 3: Add database-aligned optional schemas**

Define a local `optionalLimitedText(max)` preprocessor/schema and use limits 200, 50, and 500. Keep email preprocessing and the existing code/name limits.

- [ ] **Step 4: Write the failing form source contract test**

Assert `supplier-form.tsx` contains `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`, `autoComplete="email"`, `aria-invalid`, `aria-describedby`, `beforeunload`, mobile `min-h-11`, and localized inline error rendering. Verify RED before editing the form.

- [ ] **Step 5: Implement inline errors and unsaved-change protection**

Track initial values, dirty state, and `fieldErrors`. Register `beforeunload` only while dirty. Back and cancel links call a confirmation-aware navigation handler. Clear a field error when its field changes. Render an error paragraph under each field and retain a generic toast for unexpected failures. Add localized `unsavedChangesConfirm`, `duplicateCode`, and field validation copy.

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test tests/supplier-validation.test.ts tests/supplier-form-ui.test.ts tests/master-data-brand-supplier-ui.test.ts`

Expected: PASS.

```powershell
git add src/lib/validations/supplier.ts src/lib/supplier-form-errors.ts src/components/master-data/supplier-form.tsx messages/th.json messages/en.json tests/supplier-validation.test.ts tests/supplier-form-ui.test.ts tests/master-data-brand-supplier-ui.test.ts
git commit -m "feat(suppliers): harden supplier form validation"
```

---

### Task 3: Build the adaptive supplier list and efficient summary

**Files:**
- Create: `src/components/master-data/supplier-list-view.tsx`
- Modify: `src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx`
- Modify: `src/components/master-data/master-data-layout.tsx`
- Modify: `src/components/master-data/master-data-delete-button.tsx`
- Create: `tests/supplier-adaptive-ui.test.ts`
- Modify: `tests/organization-master-query.test.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: `SupplierListItem` display type and `<SupplierListView>` with mutually exclusive desktop table/mobile cards.
- Uses four explicit page-level Prisma `count` queries for total active, with assets, without assets, and without purchase documents; no additional summary abstraction is introduced.
- Removes the constant active-status column from the active-only list.

- [ ] **Step 1: Write failing adaptive source tests**

Assert the new component exposes `data-supplier-desktop-table` with `hidden md:block`, `data-supplier-mobile-list` with `md:hidden`, mobile cards include code/name/contact/phone/counts/actions, and no active status column is rendered. Assert primary mobile action classes include `min-h-11 min-w-11`.

- [ ] **Step 2: Run the adaptive test and verify RED**

Run: `node --test tests/supplier-adaptive-ui.test.ts`

Expected: FAIL because `supplier-list-view.tsx` does not exist.

- [ ] **Step 3: Implement the shared desktop/mobile list component**

Pass already localized labels, paginated supplier rows, `locale`, and `supplierReturnHref`. Desktop keeps sortable headers, clickable rows, drilldowns, edit, and delete. Mobile renders one semantic article per supplier with a linked title, contact actions, compact relationship counts, and 44px edit/delete/drilldown actions.

- [ ] **Step 4: Replace unbounded summary loading with count queries**

Replace `summarySuppliers = prisma.supplier.findMany(...)` with parallel counts for total active, with assets, without assets, and without purchase documents. Keep list rows and filtered total paginated. Add a source assertion that the page no longer passes an unbounded `findMany` result to `buildSupplierSummary`.

- [ ] **Step 5: Add adaptive summary, filters, and actionable empty states**

Render summary links in a mobile horizontal strip with bounded card width and in the existing desktop grid at `md+`. Use a mobile `<details>` filter disclosure and retain the desktop filter grid. When no rows exist, render create action if no active filters; otherwise render active filter context and a clear-filter action. Preserve every current query parameter and return link.

- [ ] **Step 6: Add sort semantics and pagination safety**

Set `aria-sort="ascending"|"descending"` on the active sortable `<th>`, leave inactive headers without it, add visible focus rings, and render unavailable previous/next as non-link disabled controls. Mobile pagination targets are at least 44px.

- [ ] **Step 7: Run focused tests and commit**

Run: `node --test tests/supplier-adaptive-ui.test.ts tests/organization-master-query.test.ts tests/master-data-workspace.test.ts tests/master-data-return-navigation.test.ts`

Expected: PASS.

```powershell
git add "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx" src/components/master-data/supplier-list-view.tsx src/components/master-data/master-data-layout.tsx src/components/master-data/master-data-delete-button.tsx messages/th.json messages/en.json tests/supplier-adaptive-ui.test.ts tests/organization-master-query.test.ts
git commit -m "feat(suppliers): add adaptive supplier list"
```

---

### Task 4: Adapt supplier detail for mobile operations

**Files:**
- Create: `src/components/master-data/supplier-purchase-documents.tsx`
- Modify: `src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx`
- Create: `tests/supplier-detail-ui.test.ts`
- Modify: `tests/supplier-detail.test.ts`

**Interfaces:**
- Produces: `<SupplierPurchaseDocuments documents labels>` as a Server Component with desktop table and mobile list.
- Detail header, metric strip, linked assets, and section actions use 44px mobile targets and visible focus.

- [ ] **Step 1: Write failing detail UI tests**

Assert `supplier-purchase-documents.tsx` has `data-supplier-documents-desktop`, `data-supplier-documents-mobile`, mutually exclusive responsive classes, semantic table headers, and mobile `<dl>` labels. Assert detail action classes include `min-h-11` and metric links include focus-visible styling.

- [ ] **Step 2: Run the detail test and verify RED**

Run: `node --test tests/supplier-detail-ui.test.ts`

Expected: FAIL because the adaptive document component does not exist.

- [ ] **Step 3: Implement adaptive purchase documents and compact metrics**

Move purchase-document display into the focused Server Component. Keep the desktop table at `md+`; render mobile document cards below `md`. Change metrics to a horizontally scrollable strip below `md` and retain the five-column desktop grid at `xl`, ensuring content after metrics is reachable without excessive stacking.

- [ ] **Step 4: Harden detail links and actions**

Add 44px mobile targets, explicit focus-visible rings, decorative icon `aria-hidden`, and safe wrapping for long supplier/contact/asset text. Keep all existing follow-up calculations and drilldown URLs.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test tests/supplier-detail-ui.test.ts tests/supplier-detail.test.ts`

Expected: PASS.

```powershell
git add "src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx" src/components/master-data/supplier-purchase-documents.tsx tests/supplier-detail-ui.test.ts tests/supplier-detail.test.ts
git commit -m "feat(suppliers): adapt supplier detail for mobile"
```

---

### Task 5: Align documentation and complete verification

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/11_FEATURE_LIST.md`
- Modify: `docs/99_CHANGELOG.md`

**Interfaces:**
- Documents lifecycle safety, adaptive list/detail/form behavior, retained combined code contract, and UAT evidence.

- [ ] **Step 1: Run all focused supplier tests**

```powershell
node --test tests/supplier-lifecycle-policy.test.ts tests/supplier-validation.test.ts tests/supplier-form-ui.test.ts tests/supplier-adaptive-ui.test.ts tests/supplier-detail-ui.test.ts tests/supplier-detail.test.ts tests/organization-master-query.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/master-data-return-navigation.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run static and full verification**

```powershell
npx eslint "src/app/api/suppliers/[id]/route.ts" "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx" "src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx" src/components/master-data/supplier-form.tsx src/components/master-data/supplier-list-view.tsx src/components/master-data/supplier-purchase-documents.tsx src/lib/supplier-lifecycle-policy.ts src/lib/supplier-form-errors.ts src/lib/validations/supplier.ts
npx tsc --noEmit
npm test
npm run build
git diff --check
```

Expected: ESLint, TypeScript, complete tests, production build, and whitespace check exit 0.

- [ ] **Step 3: Run authenticated Chrome QA**

Verify supplier list, first supplier detail, create, and edit at 375, 390, 768, 1280, and 1600px:

- no body horizontal overflow and no desktop supplier table visible below `md`;
- summary metrics do not delay the first supplier list excessively;
- filters, clear action, create, edit, delete, relationship counts, pagination, form controls, and detail actions are at least 44px on mobile;
- desktop table remains sortable and active sort is exposed through `aria-sort`;
- mobile cards expose the essential fields and actions without horizontal scrolling;
- create/edit form shows field errors, metadata, and unsaved-change confirmation;
- detail purchase documents use cards on mobile and table on desktop;
- console contains no missing-message, hydration, key, or runtime errors.

Do not perform destructive delete QA against retained business data. Verify relationship blocking through automated tests and, if needed, disposable seeded records only.

- [ ] **Step 4: Run the Impeccable detector**

Run:

```powershell
node .agents/skills/impeccable/scripts/detect.mjs --json "src/app/[locale]/(dashboard)/master-data/suppliers" src/components/master-data/supplier-form.tsx src/components/master-data/supplier-list-view.tsx src/components/master-data/supplier-purchase-documents.tsx
```

Expected: valid JSON with no new changed-file findings.

- [ ] **Step 5: Update handoff and release documentation**

Document the corrected lifecycle policy in workflows, adaptive desktop/mobile behavior in feature list, specific supplier UAT cases in the checklist, implementation/verification evidence in handoff, and one dated changelog entry. Do not mark real-device or realistic-data UAT complete unless it was actually executed.

- [ ] **Step 6: Commit documentation after verification**

```powershell
git add DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/99_CHANGELOG.md
git commit -m "docs(suppliers): hand off hardened supplier workspace"
```
