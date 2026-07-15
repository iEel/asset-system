# Audit Scan Form Conservative Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `audit-scan-form.tsx` from 3,079 lines to approximately 1,700–2,000 lines without changing Audit Scan behavior, UI, scanner lifecycle, offline behavior, or API contracts.

**Architecture:** Keep `AuditScanForm` as the only runtime/workflow controller. Extract shared types/constants, deterministic helpers, and presentation-only panels into three focused sibling modules, with workflow state and side effects continuing to flow from the form into panels through typed props and callbacks. Existing local disclosure state in `RecentScansPanel` remains local.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2.4, TypeScript strict mode, next-intl, Tailwind CSS, Node test runner.

## Global Constraints

- Do not change `AuditScanForm` props.
- Do not change API routes, request payloads, response interpretation, translation keys, Prisma schema, or dependencies.
- Keep camera/scanner state, effects, callbacks, cleanup, fallback, torch, and zoom behavior in `audit-scan-form.tsx`.
- Keep offline queue orchestration, storage subscriptions, routing, focus, scroll, toast, and error sequencing in `audit-scan-form.tsx`.
- Preserve markup, class names, ARIA attributes, responsive breakpoints, safe-area behavior, and touch targets.
- Preserve Thai and English behavior.
- No new file may exceed 700 lines.
- Work only on the files listed in this plan; preserve unrelated working-tree changes.

## Planned File Ownership

- Create `src/components/audit/audit-scan-types.ts`: shared DTO/view types and `MAX_RECENT_AUDIT_SCANS`.
- Create `src/components/audit/audit-scan-helpers.ts`: deterministic transformations, filters, value builders, and context builders.
- Create `src/components/audit/audit-scan-panels.tsx`: stateless result, recent-scan, component, suggestion, pending-queue, fallback-picker, scanner-overlay, and field presentation.
- Modify `src/components/audit/audit-scan-form.tsx`: import extracted modules and retain all controller responsibilities.
- Create `tests/audit-scan-refactor-boundaries.test.ts`: direct helper behavior and module-ownership regression coverage.
- Modify the existing Audit Scan source-contract tests only where ownership moved; retain their original assertions against the new owner.

---

### Task 1: Extract Shared Types and Pure Helpers

**Files:**

- Create: `src/components/audit/audit-scan-types.ts`
- Create: `src/components/audit/audit-scan-helpers.ts`
- Create: `tests/audit-scan-refactor-boundaries.test.ts`
- Modify: `src/components/audit/audit-scan-form.tsx:29-193,2338-2410,2783-3006`
- Modify: `tests/audit-component-scan-ui.test.ts`
- Modify: `tests/audit-scan-readable-result.test.ts`
- Modify: `tests/audit-scan-result-semantics.test.ts`
- Modify: `tests/audit-out-of-scope-actual-field.test.ts`
- Modify: `tests/audit-scan-lookup.test.ts`

**Interfaces:**

- Produces `MAX_RECENT_AUDIT_SCANS` and exported types `Option`, `AuditScanComponent`, `AuditInstalledInParent`, `AuditScanItem`, `AuditScanOptions`, `OptionLabelMaps`, `PendingQueueContextRow`, `CameraDevice`, `CameraReadiness`, `AuditMismatchPreview`, `ScanFeedback`, `LastAuditResult`, `AuditRecentScan`, `QueuedAuditPhoto`, `AuditLookupAuditItem`, `AuditLookupComponent`, `AuditLookupInstalledInParent`, `OutOfScopeAsset`, `AuditLookupAsset`, and `AuditScanLookupResponse`.
- Produces helpers `normalizeOutOfScopeAuditAsset`, `normalizeAuditLookupComponents`, `normalizeAuditLookupInstalledIn`, `isAuditComponentChecked`, `toAuditOfflinePhoto`, `createInitialAuditScanValues`, `getExpectedAuditValues`, `getEditableAuditValues`, `getActualValues`, `getOutOfScopeActualValues`, `hasOutOfScopeActualMismatch`, `emptyToNull`, `buildAssetLookup`, `buildManualScanSuggestions`, `buildOptionLabelMap`, `buildSystemDataRows`, `buildPendingQueueContext`, `buildAssetPickerSearchText`, `getOptionLabel`, and `getReadableAuditScanValue`.
- Consumes `normalizeAssetOwnershipType` and `requiresCustodian` from `src/lib/asset-ownership.ts` and `AuditOfflinePhoto` from `src/lib/audit-offline-queue.ts`.

- [ ] **Step 1: Write the failing helper and ownership test**

Create `tests/audit-scan-refactor-boundaries.test.ts` with a fixture and assertions that define the new interface before the modules exist:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const item = {
  id: "item-1",
  assetId: "asset-1",
  assetTag: "AST-001",
  label: "AST-001 - Notebook",
  auditStatus: "pending",
  auditResult: null,
  expectedDepartmentId: "dep-1",
  expectedLocationId: "loc-1",
  expectedCustodianId: "emp-1",
  expectedConditionId: "condition-1",
  actualDepartmentId: null,
  actualLocationId: null,
  actualCustodianId: null,
  actualConditionId: null,
  ownershipType: "assigned",
  photoChecklist: [],
  components: [],
  installedIn: [],
}

test("audit scan extracted helpers preserve current value behavior", async () => {
  const helpers = await import("../src/components/audit/audit-scan-helpers.ts").catch(() => null)
  const types = await import("../src/components/audit/audit-scan-types.ts").catch(() => null)
  assert.ok(helpers, "audit-scan-helpers.ts must be importable")
  assert.ok(types, "audit-scan-types.ts must be importable")

  assert.equal(types.MAX_RECENT_AUDIT_SCANS, 8)
  assert.equal(helpers.getReadableAuditScanValue(item), "AST-001")
  assert.deepEqual(helpers.getEditableAuditValues(item), {
    actualLocationId: "loc-1",
    actualCustodianId: "emp-1",
    actualDepartmentId: "dep-1",
    actualConditionId: "condition-1",
  })
  assert.deepEqual(helpers.emptyToNull({ locationId: "", remark: "kept" }), {
    locationId: null,
    remark: "kept",
  })
})

test("audit scan extracted helpers preserve lookup normalization and bounded suggestions", async () => {
  const helpers = await import("../src/components/audit/audit-scan-helpers.ts").catch(() => null)
  assert.ok(helpers, "audit-scan-helpers.ts must be importable")

  assert.deepEqual(
    helpers.normalizeAuditLookupComponents([
      {
        assetId: "component-1",
        assetTag: "CMP-001",
        name: "RAM",
        componentRole: "memory",
        slotNo: "A1",
        auditItem: null,
      },
    ]),
    [
      {
        assetId: "component-1",
        assetTag: "CMP-001",
        name: "RAM",
        componentRole: "memory",
        slotNo: "A1",
        auditItemId: null,
        auditStatus: "out_of_round",
        auditResult: null,
      },
    ]
  )

  const maps = {
    locations: new Map([["loc-1", "Bangkok"]]),
    employees: new Map([["emp-1", "Somchai"]]),
    departments: new Map([["dep-1", "IT"]]),
    conditions: new Map<string, string>(),
  }
  assert.deepEqual(helpers.buildManualScanSuggestions("ast", [item], maps).map((row) => row.id), ["item-1"])
  assert.deepEqual(helpers.buildManualScanSuggestions("a", [item], maps), [])
})

test("audit scan controller imports extracted types and helpers instead of redeclaring them", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  assert.match(form, /from "\.\/audit-scan-types"/)
  assert.match(form, /from "\.\/audit-scan-helpers"/)
  assert.doesNotMatch(form, /^type AuditScanItem =/m)
  assert.doesNotMatch(form, /^function getReadableAuditScanValue/m)
  assert.doesNotMatch(form, /^function normalizeOutOfScopeAuditAsset/m)
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
node --test tests/audit-scan-refactor-boundaries.test.ts
```

Expected: FAIL because `audit-scan-helpers.ts` and `audit-scan-types.ts` do not exist.

- [ ] **Step 3: Create the shared type module**

Move the existing type definitions without changing fields or unions. Use explicit exports and retain the existing public recent-scan type:

```ts
import type { AuditScanContext } from "../../lib/audit-scan-context.ts"

export const MAX_RECENT_AUDIT_SCANS = 8

export type Option = { id: string; label: string }
export type AuditScanComponent = {
  assetId: string
  assetTag: string
  name: string
  componentRole: string
  slotNo: string | null
  auditItemId: string | null
  auditStatus: string
  auditResult: string | null
}
export type AuditInstalledInParent = {
  parentAssetId: string
  assetTag: string
  name: string
  componentRole: string
  slotNo: string | null
}
export type AuditScanItem = {
  id: string
  assetId: string
  assetTag: string
  label: string
  auditStatus: string
  auditResult: string | null
  expectedDepartmentId: string | null
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedConditionId: string | null
  actualDepartmentId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualConditionId: string | null
  ownershipType?: string | null
  photoChecklist: string[]
  components: AuditScanComponent[]
  installedIn: AuditInstalledInParent[]
}
export type AuditScanOptions = {
  locations: Option[]
  departments: Option[]
  employees: Option[]
  conditions: Option[]
}
export type OptionLabelMaps = {
  locations: Map<string, string>
  employees: Map<string, string>
  departments: Map<string, string>
  conditions: Map<string, string>
}
export type PendingQueueContextRow = { label: string; value: string }
export type CameraDevice = { id: string; label: string }
export type CameraReadiness = "checking" | "ready" | "unavailable"
export type AuditMismatchPreview = { type: string; label: string; canApply: boolean }
export type ScanFeedback = {
  status: "found" | "mismatch" | "out_of_scope" | "unknown_asset" | "saved" | "found_later" | "offline_queued"
  title: string
  description: string
  assetId?: string
  assetTag?: string
}
export type LastAuditResult = { status: ScanFeedback["status"]; label: string }
export type AuditRecentScan = ScanFeedback & { id: string; source: "manual" | "qr"; at: number }
export type QueuedAuditPhoto = { id: string; label: string; file: File; previewUrl: string | null }
export type AuditLookupAuditItem = {
  id: string
  assetId: string
  auditStatus: string
  auditResult: string | null
}
export type AuditLookupComponent = {
  assetId: string
  assetTag: string
  name: string
  componentRole: string
  slotNo: string | null
  auditItem: AuditLookupAuditItem | null
}
export type AuditLookupInstalledInParent = AuditInstalledInParent & { auditItem: AuditLookupAuditItem | null }
export type OutOfScopeAsset = {
  id: string
  assetTag: string
  title: string
  subtitle: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  conditionId: string | null
  ownershipType?: string | null
  meta: { location: string; custodian: string | null }
  components: AuditScanComponent[]
  installedIn: AuditInstalledInParent[]
}
export type AuditLookupAsset = Omit<OutOfScopeAsset, "components" | "installedIn"> & {
  components: AuditLookupComponent[]
  installedIn: AuditLookupInstalledInParent[]
}
export type AuditScanLookupResponse =
  | { status: "in_round"; asset: AuditLookupAsset; item?: { assetId: string } }
  | { status: "out_of_scope"; asset: AuditLookupAsset }
  | { status: "unknown_asset"; candidates?: string[] }

export type StoredAuditContextSnapshot = { raw: string | null; value: AuditScanContext }
```

Copy every field and union member verbatim from the approved source; do not rename or broaden types. Keep `auditContextSnapshotCache` as a runtime constant in the controller and type it with `StoredAuditContextSnapshot`.

- [ ] **Step 4: Create the pure helper module**

Move the helper bodies byte-for-byte from commit `4c1238e` of `audit-scan-form.tsx`: normalization/status helpers at lines 2338–2375 and value/search/context helpers at lines 2783–3006. Add `export` to the functions listed below, add the three structural argument types shown below, and use test-compatible relative imports. Do not move `getAuditComponentStatusMeta`; it is presentation-only and belongs to Task 2.

```ts
import { normalizeAssetOwnershipType, requiresCustodian } from "../../lib/asset-ownership.ts"
import type { AuditOfflinePhoto } from "../../lib/audit-offline-queue.ts"
import type {
  AuditInstalledInParent,
  AuditLookupComponent,
  AuditLookupInstalledInParent,
  AuditLookupAsset,
  AuditScanComponent,
  AuditScanItem,
  Option,
  OptionLabelMaps,
  OutOfScopeAsset,
  PendingQueueContextRow,
  QueuedAuditPhoto,
} from "./audit-scan-types.ts"

export type AuditActualValues = {
  actualLocationId: string
  actualCustodianId: string
  actualDepartmentId: string
  actualConditionId: string
}
export type SystemDataLabels = {
  expectedLocation: string
  expectedCustodian: string
  expectedDepartment: string
  expectedCondition: string
  none: string
}
export type PendingQueueLabels = {
  location: string
  custodian: string
  department: string
  none: string
}
```

Export these complete moved declarations: `normalizeOutOfScopeAuditAsset`, `normalizeAuditLookupComponents`, `normalizeAuditLookupInstalledIn`, `isAuditComponentChecked`, `toAuditOfflinePhoto`, `createInitialAuditScanValues`, `getExpectedAuditValues`, `getEditableAuditValues`, `getActualValues`, `getOutOfScopeActualValues`, `hasOutOfScopeActualMismatch`, `emptyToNull`, `buildAssetLookup`, `buildManualScanSuggestions`, `buildOptionLabelMap`, `buildSystemDataRows`, `buildPendingQueueContext`, `buildAssetPickerSearchText`, `getOptionLabel`, and `getReadableAuditScanValue`. Replace the two repeated inline actual-value object types with `AuditActualValues`; replace the two inline label object types with `SystemDataLabels` and `PendingQueueLabels`. No expression inside a moved function may change.

- [ ] **Step 5: Rewire the controller and update moved-owner assertions**

Import the new types/constants/helpers from the sibling modules, remove their old declarations, and keep browser/runtime helpers in the controller:

```ts
import {
  MAX_RECENT_AUDIT_SCANS,
  type AuditRecentScan,
  type AuditScanItem,
  type AuditScanLookupResponse,
  type AuditScanOptions,
  type CameraDevice,
  type CameraReadiness,
  type LastAuditResult,
  type OutOfScopeAsset,
  type QueuedAuditPhoto,
  type ScanFeedback,
  type StoredAuditContextSnapshot,
} from "./audit-scan-types"
import {
  buildAssetLookup,
  buildManualScanSuggestions,
  buildOptionLabelMap,
  buildSystemDataRows,
  createInitialAuditScanValues,
  emptyToNull,
  getActualValues,
  getEditableAuditValues,
  getExpectedAuditValues,
  getOutOfScopeActualValues,
  getReadableAuditScanValue,
  hasOutOfScopeActualMismatch,
  normalizeOutOfScopeAuditAsset,
  toAuditOfflinePhoto,
} from "./audit-scan-helpers"
```

Update source-contract tests to read both the controller and the owning module. For example:

```ts
const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
const helpers = readFileSync("src/components/audit/audit-scan-helpers.ts", "utf8")
const types = readFileSync("src/components/audit/audit-scan-types.ts", "utf8")

assert.match(form, /setScanText\(getReadableAuditScanValue\(matchedItem\)\)/)
assert.match(helpers, /export function getReadableAuditScanValue/)
assert.match(types, /export type ScanFeedback/)
```

Retain every assertion about controller behavior in `form`; move only declaration/implementation ownership assertions to `helpers` or `types`.

- [ ] **Step 6: Verify GREEN for helpers and focused Audit Scan contracts**

Run:

```powershell
node --test tests/audit-scan-refactor-boundaries.test.ts tests/audit-component-scan-ui.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-scan-lookup.test.ts tests/audit-scan-readable-result.test.ts tests/audit-scan-result-semantics.test.ts
npx tsc --noEmit
```

Expected: all selected tests pass and TypeScript exits 0.

- [ ] **Step 7: Commit the type/helper extraction**

```powershell
git add -- src/components/audit/audit-scan-types.ts src/components/audit/audit-scan-helpers.ts src/components/audit/audit-scan-form.tsx tests/audit-scan-refactor-boundaries.test.ts tests/audit-component-scan-ui.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-scan-lookup.test.ts tests/audit-scan-readable-result.test.ts tests/audit-scan-result-semantics.test.ts
git commit -m "refactor(audit): extract scan types and helpers"
```

---

### Task 2: Extract Presentation-Only Panels

**Files:**

- Create: `src/components/audit/audit-scan-panels.tsx`
- Modify: `src/components/audit/audit-scan-form.tsx:2119-2776,3008-3042`
- Modify: `tests/audit-scan-refactor-boundaries.test.ts`
- Modify: `tests/audit-component-scan-ui.test.ts`
- Modify: `tests/audit-mobile-flow-completion.test.ts`
- Modify: `tests/audit-scan-feedback-transition.test.ts`
- Modify: `tests/audit-scan-field-mode-ux.test.ts`
- Modify: `tests/audit-scan-offline-ux.test.ts`
- Modify: `tests/audit-scan-readable-result.test.ts`

**Interfaces:**

- Consumes the exported types and helpers from Task 1.
- Produces `ScanResultPanel`, `RecentScansPanel`, `AuditComponentPanel`, `ManualScanSuggestionList`, `PendingQueuePanel`, `AssetFallbackPicker`, `AuditQrScannerOverlay`, `OptionList`, `Field`, and `Select`.
- Panels receive all workflow data and callbacks as props; they do not access router, fetch, local storage, camera APIs, or toast APIs. `RecentScansPanel` retains its existing local expanded/collapsed state.

- [ ] **Step 1: Extend the boundary test to define panel ownership**

Add this test before creating the panel module:

```ts
test("audit scan presentation panels have a focused owner outside the controller", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  assert.ok(existsSync("src/components/audit/audit-scan-panels.tsx"), "audit-scan-panels.tsx must exist")
  const panels = readFileSync("src/components/audit/audit-scan-panels.tsx", "utf8")

  for (const component of [
    "ScanResultPanel",
    "RecentScansPanel",
    "AuditComponentPanel",
    "ManualScanSuggestionList",
    "PendingQueuePanel",
    "AssetFallbackPicker",
    "AuditQrScannerOverlay",
    "OptionList",
    "Field",
    "Select",
  ]) {
    assert.match(panels, new RegExp(`export function ${component}\\b`))
    assert.doesNotMatch(form, new RegExp(`^function ${component}\\b`, "m"))
  }

  assert.match(form, /from "\.\/audit-scan-panels"/)
  assert.doesNotMatch(panels, /\bfetch\(/)
  assert.doesNotMatch(panels, /localStorage/)
  assert.doesNotMatch(panels, /startNativeAssetQrScanner/)
})
```

- [ ] **Step 2: Run the boundary test and verify RED**

Run:

```powershell
node --test tests/audit-scan-refactor-boundaries.test.ts
```

Expected: FAIL because `audit-scan-panels.tsx` does not exist.

- [ ] **Step 3: Create the panel module by mechanical extraction**

Create the client presentation module by moving commit `4c1238e` source spans 2119–2336, 2377–2776, and 3008–3042. Add `export` only to the ten public components listed below; keep row/chip components and presentation helpers private. Use these dependencies:

```tsx
"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Keyboard,
  ListChecks,
  Loader2,
  ScanLine,
  Search,
  WifiOff,
  X,
} from "lucide-react"
import {
  buildPendingQueueContext,
  isAuditComponentChecked,
} from "./audit-scan-helpers"
import type {
  AuditRecentScan,
  AuditScanComponent,
  AuditScanItem,
  LastAuditResult,
  Option,
  OptionLabelMaps,
  PendingQueueContextRow,
  ScanFeedback,
} from "./audit-scan-types"

export type AuditScanTranslator = {
  (key: string): string
  (key: string, values: Record<string, string | number | Date>): string
}
```

Export `ScanResultPanel`, `RecentScansPanel`, `AuditComponentPanel`, `ManualScanSuggestionList`, `PendingQueuePanel`, `AssetFallbackPicker`, `AuditQrScannerOverlay`, `OptionList`, `Field`, and `Select`. Keep `RecentScanCompactRow`, `PendingQueueItem`, `ContextChipList`, `formatLastAuditResult`, `getScanFeedbackMeta`, `formatRecentScanTime`, and `getAuditComponentStatusMeta` private. Keep every prop object, JSX node, class string, callback expression, localized time option, and status mapping byte-for-byte except for import/export syntax and the `React.ReactNode` to imported `ReactNode` type replacement.

If the extracted module exceeds 700 lines, do not create another file. Remove accidental blank-line/comment expansion and verify that only the approved presentation functions were moved; the current source span is below the limit.

- [ ] **Step 4: Rewire the controller and update owner-specific tests**

Import only exported panels/primitives and remove their old definitions:

```tsx
import {
  AssetFallbackPicker,
  AuditComponentPanel,
  AuditQrScannerOverlay,
  Field,
  ManualScanSuggestionList,
  OptionList,
  PendingQueuePanel,
  RecentScansPanel,
  ScanResultPanel,
  Select,
} from "./audit-scan-panels"
```

Keep controller callbacks such as `confirmComponentWithParent`, `openComponentMissingDialog`, and `submitComponentMissing` in the form. Update source tests so panel markup assertions read `audit-scan-panels.tsx`, while state/effect/callback assertions continue reading `audit-scan-form.tsx`:

```ts
const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
const panels = readFileSync("src/components/audit/audit-scan-panels.tsx", "utf8")

assert.match(panels, /export function AuditComponentPanel/)
assert.match(form, /openComponentMissingDialog/)
assert.match(form, /components=\{selectedItem\.components\}/)
```

Do not weaken or delete responsive, accessibility, supporting-region, feedback-transition, or offline-state assertions.

- [ ] **Step 5: Verify GREEN for panels and focused Audit Scan tests**

Run:

```powershell
node --test tests/audit-scan-refactor-boundaries.test.ts tests/audit-component-scan-ui.test.ts tests/audit-mobile-flow-completion.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-scan-feedback-transition.test.ts tests/audit-scan-field-mode-ux.test.ts tests/audit-scan-lookup.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-scan-readable-result.test.ts tests/audit-scan-result-semantics.test.ts
npx eslint src/components/audit/audit-scan-form.tsx src/components/audit/audit-scan-types.ts src/components/audit/audit-scan-helpers.ts src/components/audit/audit-scan-panels.tsx tests/audit-scan-refactor-boundaries.test.ts
npx tsc --noEmit
```

Expected: all focused tests pass; ESLint and TypeScript exit 0.

- [ ] **Step 6: Check size and dependency boundaries**

Run:

```powershell
Get-ChildItem src/components/audit/audit-scan-form.tsx,src/components/audit/audit-scan-types.ts,src/components/audit/audit-scan-helpers.ts,src/components/audit/audit-scan-panels.tsx | ForEach-Object { [pscustomobject]@{ File=$_.Name; Lines=(Get-Content $_.FullName).Count } }
rg -n "fetch\(|localStorage|startNativeAssetQrScanner|useEffect|useRef" src/components/audit/audit-scan-panels.tsx
```

Expected:

- `audit-scan-form.tsx` is 1,700–2,000 lines.
- Every extracted file is at most 700 lines.
- The dependency search returns no matches from `audit-scan-panels.tsx`.

- [ ] **Step 7: Commit the panel extraction**

```powershell
git add -- src/components/audit/audit-scan-panels.tsx src/components/audit/audit-scan-form.tsx tests/audit-scan-refactor-boundaries.test.ts tests/audit-component-scan-ui.test.ts tests/audit-mobile-flow-completion.test.ts tests/audit-scan-feedback-transition.test.ts tests/audit-scan-field-mode-ux.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-scan-readable-result.test.ts
git commit -m "refactor(audit): extract scan presentation panels"
```

---

### Task 3: Full Regression and Adaptive Browser Verification

**Files:**

- Modify only if a regression test reveals an extraction defect: the four extracted/controller files and directly affected tests.
- Do not modify copy, styling, API contracts, or unrelated modules during verification.

**Interfaces:**

- Consumes the completed controller, helper, type, and panel modules.
- Produces verified evidence that the conservative extraction preserved behavior and presentation.

- [ ] **Step 1: Run the complete automated verification**

Run:

```powershell
npm test
npm run verify
```

Expected:

- At least the existing 1,117 tests plus the new boundary/helper tests pass.
- Prisma generation, lint, TypeScript, and the Next.js production build pass.
- No new warning originates from the changed source files.

- [ ] **Step 2: Verify the diff is extraction-only**

Run:

```powershell
git diff --check HEAD~2..HEAD
git diff --stat HEAD~2..HEAD
git diff --word-diff=porcelain HEAD~2..HEAD -- src/components/audit/audit-scan-form.tsx src/components/audit/audit-scan-helpers.ts src/components/audit/audit-scan-panels.tsx src/components/audit/audit-scan-types.ts
```

Review for changed literals, API paths, translation keys, CSS classes, camera constraints, timeout values, storage keys, and status unions. Expected: only imports/exports, type ownership, and mechanically moved bodies differ.

- [ ] **Step 3: Run authenticated mobile browser smoke test**

At 390×844, open an active Audit Scan route and verify:

- no document or card horizontal overflow;
- manual input, pending queue, fallback picker, and supporting panel render in the same order;
- touch actions remain at least 44px where required;
- selecting/changing a target preserves focus and feedback reset behavior;
- exactly one scanner subtree exists when camera mode is opened;
- closing scanner mode removes/stops the camera subtree;
- no new console error or missing translation appears.

- [ ] **Step 4: Run authenticated desktop browser smoke test**

At 1440×900, verify:

- the same primary/supporting regions remain in the established two-column layout;
- queue, result, component, and recent-scan panels preserve their semantics and callbacks;
- no body overflow or duplicate mobile action region appears;
- no new console error or React hydration warning appears.

- [ ] **Step 5: Record verification evidence and final commit if needed**

If verification required a code correction, first add a failing regression test, confirm RED, make the minimum correction, re-run focused tests, and commit only that correction:

```powershell
git diff --name-only
git add -- tests/audit-scan-refactor-boundaries.test.ts src/components/audit/audit-scan-form.tsx
git commit -m "fix(audit): preserve scan behavior after extraction"
```

Replace the two paths in `git add` with the exact regression test and source file shown by `git diff --name-only` when the defect is in a different approved Audit Scan file; never stage unrelated paths.

If no correction was needed, do not create an empty commit. Report final line counts, automated results, browser viewports, and any camera capability that remained unavailable in the controller environment.

## Plan Self-Review

- Spec coverage: all approved type, helper, panel, controller, error-ownership, adaptive UI, and verification constraints are assigned to a task.
- Scope: only the Audit Scan form extraction is included; hook/controller redesign and other large files remain deferred.
- Type consistency: Task 2 consumes the exact exported types/helpers from Task 1; Task 3 consumes the four completed modules.
- Migration/dependency check: no database migration, package change, API change, or translation change is planned.
