# Audit Component Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add parent-led component asset support to audit round creation, audit scanning, and parent asset master-data sync while keeping every component asset auditable as its own `audit_item`.

**Architecture:** Add small server-side helpers for audit component grouping and parent-to-component sync, then wire those helpers into existing App Router route handlers. Keep UI changes inside the existing `AuditRoundForm` and `AuditScanForm` client components, with all database reads staying in route handlers or server pages. Preserve the current audit scan behavior for normal assets, out-of-scope assets, camera scanning, offline queue, and finding review.

**Tech Stack:** Next.js 16 App Router route handlers, React 19 client components, Prisma SQL Server models, Zod validation, next-intl JSON messages, Node `node:test` source/unit tests, existing Tailwind utility styling.

---

## Scope Check

This plan implements one feature across several existing workflow surfaces:

- Audit round preview and creation.
- Audit scan lookup, direct scan, and component confirmation.
- Parent asset master-data sync for installed components.
- User-facing labels and documentation.

The work is split into independently testable tasks. Each task should be implemented, tested, and committed before the next task starts.

## File Structure

- Create `src/lib/audit-component-round.ts`: pure helper for grouping parent assets with installed components before sampling.
- Modify `src/lib/audit-round.ts`: load installed component links from Prisma and expose one round-selection helper used by preview and create routes.
- Modify `src/app/api/audit-rounds/preview/route.ts`: return component-aware preview counts.
- Modify `src/app/api/audit-rounds/route.ts`: create `audit_items` from component-aware selected assets.
- Modify `src/components/audit/audit-round-form.tsx`: show the `componentItems` preview metric and component expansion note.
- Create `src/lib/asset-component-sync.ts`: transaction-safe helper that syncs supported fields from parent assets to installed component assets and writes component movement rows.
- Modify parent update/operation routes:
  - `src/app/api/assets/[id]/route.ts`
  - `src/app/api/assets/[id]/transfer/route.ts`
  - `src/app/api/assets/[id]/checkout/route.ts`
  - `src/app/api/assets/[id]/checkin/route.ts`
  - `src/app/api/assets/bulk-move/route.ts`
  - `src/app/api/assets/bulk-update/route.ts`
- Modify audit correction routes:
  - `src/app/api/audit-rounds/[id]/scan/route.ts`
  - `src/app/api/audit-findings/[id]/review/route.ts`
- Modify `src/app/api/audit-rounds/[id]/scan-lookup/route.ts`: return installed component context.
- Modify `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx`: pass component context to the client form.
- Modify `src/components/audit/audit-scan-form.tsx`: render component panel and add confirm-with-parent actions.
- Modify `src/lib/validations/audit.ts`: extend scan payload for component confirmation.
- Modify `messages/th.json` and `messages/en.json`: add audit round and scan labels.
- Modify docs after implementation:
  - `DEVELOPER_HANDOFF.md`
  - `docs/03_DATABASE.md`
  - `docs/06_WORKFLOWS.md`
  - `docs/07_UAT_CHECKLIST.md`
  - `docs/11_FEATURE_LIST.md`
  - `docs/99_CHANGELOG.md`

## Task 1: Component-Aware Audit Round Selection Helper

**Files:**
- Create: `tests/audit-component-round-selection.test.ts`
- Create: `src/lib/audit-component-round.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/audit-component-round-selection.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAuditComponentCandidateGroups,
  selectAuditComponentCandidates,
  type AuditComponentCandidateAsset,
  type AuditComponentLink,
} from "../src/lib/audit-component-round.ts"

function asset(id: string, assetTag = id): AuditComponentCandidateAsset {
  return {
    id,
    assetTag,
    name: `Asset ${assetTag}`,
    companyId: "company-1",
    branchId: "branch-1",
    departmentId: null,
    currentLocationId: "loc-1",
    custodianId: null,
    conditionId: "condition-1",
  }
}

test("component candidate groups keep installed components with their parent", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const groups = buildAuditComponentCandidateGroups([parent], [
    { parentAssetId: parent.id, componentAsset: component },
  ])

  assert.equal(groups.length, 1)
  assert.equal(groups[0].rootAsset.id, parent.id)
  assert.deepEqual(groups[0].assets.map((item) => item.id), [parent.id, component.id])
  assert.deepEqual(Array.from(groups[0].componentAssetIds), [component.id])
})

test("component candidate selection deduplicates direct and parent-expanded components", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const directOnly = asset("direct-1", "DIRECT-1")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: component },
  ]

  const selection = selectAuditComponentCandidates([parent, component, directOnly], links, 100)

  assert.equal(selection.matchedAssets, 3)
  assert.equal(selection.componentItems, 0)
  assert.deepEqual(selection.selectedAssets.map((item) => item.id), [parent.id, component.id, directOnly.id])
  assert.equal(selection.selectedItems.find((item) => item.asset.id === component.id)?.includedVia, "direct")
})

test("component candidate selection counts components added only through selected parents", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: component },
  ]

  const selection = selectAuditComponentCandidates([parent], links, 100)

  assert.equal(selection.matchedAssets, 1)
  assert.equal(selection.componentItems, 1)
  assert.deepEqual(selection.selectedAssets.map((item) => item.id), [parent.id, component.id])
  assert.deepEqual(
    selection.selectedItems.map((item) => ({
      id: item.asset.id,
      includedVia: item.includedVia,
      parentAssetId: item.parentAssetId ?? null,
    })),
    [
      { id: parent.id, includedVia: "direct", parentAssetId: null },
      { id: component.id, includedVia: "component", parentAssetId: parent.id },
    ]
  )
})

test("component candidate sampling samples parent groups before flattening components", () => {
  const parent = asset("parent-1", "PARENT-1")
  const component = asset("component-1", "COMP-1")
  const directOnly = asset("direct-1", "DIRECT-1")
  const links: AuditComponentLink<AuditComponentCandidateAsset>[] = [
    { parentAssetId: parent.id, componentAsset: component },
  ]

  const selection = selectAuditComponentCandidates([parent, directOnly], links, 50, (groups) => [groups[0]])

  assert.equal(selection.matchedAssets, 2)
  assert.equal(selection.componentItems, 1)
  assert.deepEqual(selection.selectedAssets.map((item) => item.id), [parent.id, component.id])
})
```

- [ ] **Step 2: Run the helper tests and verify they fail**

Run:

```powershell
node --test tests\audit-component-round-selection.test.ts
```

Expected: FAIL because `src/lib/audit-component-round.ts` does not exist.

- [ ] **Step 3: Create the audit component round helper**

Create `src/lib/audit-component-round.ts`:

```ts
import { selectAuditSample } from "@/lib/audit-round-scope"

export type AuditComponentCandidateAsset = {
  id: string
  assetTag: string
  name: string
  companyId: string
  branchId: string
  departmentId: string | null
  currentLocationId: string
  custodianId: string | null
  conditionId: string | null
}

export type AuditComponentLink<TAsset extends AuditComponentCandidateAsset> = {
  parentAssetId: string
  componentAsset: TAsset
}

export type AuditComponentCandidateGroup<TAsset extends AuditComponentCandidateAsset> = {
  id: string
  rootAsset: TAsset
  assets: TAsset[]
  componentAssetIds: Set<string>
}

export type AuditComponentSelectedItem<TAsset extends AuditComponentCandidateAsset> = {
  asset: TAsset
  includedVia: "direct" | "component"
  parentAssetId?: string
  parentAssetTag?: string
}

export type AuditComponentSelection<TAsset extends AuditComponentCandidateAsset> = {
  matchedAssets: number
  selectedItems: AuditComponentSelectedItem<TAsset>[]
  selectedAssets: TAsset[]
  componentItems: number
  groups: AuditComponentCandidateGroup<TAsset>[]
}

export function buildAuditComponentCandidateGroups<TAsset extends AuditComponentCandidateAsset>(
  candidateAssets: TAsset[],
  componentLinks: Array<AuditComponentLink<TAsset>>
): Array<AuditComponentCandidateGroup<TAsset>> {
  const componentsByParent = new Map<string, TAsset[]>()
  for (const link of componentLinks) {
    const current = componentsByParent.get(link.parentAssetId) ?? []
    current.push(link.componentAsset)
    componentsByParent.set(link.parentAssetId, current)
  }

  return candidateAssets.map((asset) => {
    const componentAssets = dedupeAssetsById(componentsByParent.get(asset.id) ?? [])
    return {
      id: asset.id,
      rootAsset: asset,
      assets: [asset, ...componentAssets],
      componentAssetIds: new Set(componentAssets.map((component) => component.id)),
    }
  })
}

export function selectAuditComponentCandidates<TAsset extends AuditComponentCandidateAsset>(
  candidateAssets: TAsset[],
  componentLinks: Array<AuditComponentLink<TAsset>>,
  sampleRate: number,
  sampleGroups: <TGroup extends { id: string }>(groups: TGroup[], sampleRate: number) => TGroup[] = selectAuditSample
): AuditComponentSelection<TAsset> {
  const groups = buildAuditComponentCandidateGroups(candidateAssets, componentLinks)
  const selectedGroups = sampleGroups(groups, sampleRate)
  const directCandidateIds = new Set(candidateAssets.map((asset) => asset.id))
  const selectedById = new Map<string, AuditComponentSelectedItem<TAsset>>()

  for (const group of selectedGroups) {
    for (const asset of group.assets) {
      const existing = selectedById.get(asset.id)
      if (existing?.includedVia === "direct") continue

      if (directCandidateIds.has(asset.id)) {
        selectedById.set(asset.id, { asset, includedVia: "direct" })
        continue
      }

      selectedById.set(asset.id, {
        asset,
        includedVia: "component",
        parentAssetId: group.rootAsset.id,
        parentAssetTag: group.rootAsset.assetTag,
      })
    }
  }

  const selectedItems = Array.from(selectedById.values())
  return {
    matchedAssets: candidateAssets.length,
    selectedItems,
    selectedAssets: selectedItems.map((item) => item.asset),
    componentItems: selectedItems.filter((item) => item.includedVia === "component").length,
    groups,
  }
}

function dedupeAssetsById<TAsset extends AuditComponentCandidateAsset>(assets: TAsset[]) {
  const byId = new Map<string, TAsset>()
  for (const asset of assets) {
    if (!byId.has(asset.id)) byId.set(asset.id, asset)
  }
  return Array.from(byId.values()).sort((left, right) => left.assetTag.localeCompare(right.assetTag, "th-TH"))
}
```

- [ ] **Step 4: Run the helper tests and verify they pass**

Run:

```powershell
node --test tests\audit-component-round-selection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- src/lib/audit-component-round.ts tests/audit-component-round-selection.test.ts
git commit -m "Add audit component round selection helper"
```

## Task 2: Wire Component-Aware Selection Into Audit Round Preview And Create

**Files:**
- Create: `tests/audit-component-round-routes.test.ts`
- Modify: `src/lib/audit-round.ts`
- Modify: `src/app/api/audit-rounds/preview/route.ts`
- Modify: `src/app/api/audit-rounds/route.ts`
- Modify: `src/components/audit/audit-round-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Write route and UI source tests**

Create `tests/audit-component-round-routes.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit round helper loads installed components and exposes component-aware selection", () => {
  const source = readFileSync("src/lib/audit-round.ts", "utf8")

  assert.match(source, /selectAuditComponentCandidates/)
  assert.match(source, /export async function getAuditRoundSelection/)
  assert.match(source, /prisma\.assetComponent\.findMany/)
  assert.match(source, /parentAssetId:\s*\{\s*in:\s*candidateAssets\.map/)
  assert.match(source, /status:\s*"installed"/)
  assert.match(source, /removedAt:\s*null/)
  assert.match(source, /componentAsset:\s*\{\s*isActive:\s*true/)
})

test("audit round preview and create routes use the same component selection helper", () => {
  const previewRoute = readFileSync("src/app/api/audit-rounds/preview/route.ts", "utf8")
  const createRoute = readFileSync("src/app/api/audit-rounds/route.ts", "utf8")

  for (const route of [previewRoute, createRoute]) {
    assert.match(route, /getAuditRoundSelection/)
    assert.match(route, /selection\.matchedAssets/)
    assert.match(route, /selection\.componentItems/)
  }
  assert.match(previewRoute, /sampledAssets:\s*selection\.selectedAssets\.length/)
  assert.match(createRoute, /generatedItems:\s*selection\.selectedAssets\.length/)
  assert.match(createRoute, /selection\.selectedAssets\.map/)
})

test("audit round form displays component expansion counts from preview", () => {
  const form = readFileSync("src/components/audit/audit-round-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /componentItems:\s*number/)
  assert.match(form, /previewComponentItems/)
  assert.match(form, /componentItems > 0/)
  assert.match(form, /previewComponentHelp/)

  assert.equal(typeof th.auditRound.previewComponentItems, "string")
  assert.equal(typeof th.auditRound.previewComponentHelp, "string")
  assert.equal(typeof en.auditRound.previewComponentItems, "string")
  assert.equal(typeof en.auditRound.previewComponentHelp, "string")
})
```

- [ ] **Step 2: Run the route/UI tests and verify they fail**

Run:

```powershell
node --test tests\audit-component-round-routes.test.ts
```

Expected: FAIL because the routes and form still use flat audit candidates.

- [ ] **Step 3: Add component-aware round selection to `src/lib/audit-round.ts`**

Modify `src/lib/audit-round.ts` so the imports include the helper:

```ts
import { selectAuditComponentCandidates } from "@/lib/audit-component-round"
```

Add this function below `getAuditRoundCandidateAssets`:

```ts
export async function getAuditRoundSelection(input: AuditRoundInput) {
  const candidateAssets = await getAuditRoundCandidateAssets(input)
  const componentLinks = candidateAssets.length
    ? await prisma.assetComponent.findMany({
        where: {
          parentAssetId: { in: candidateAssets.map((asset) => asset.id) },
          status: "installed",
          removedAt: null,
          componentAsset: { isActive: true },
        },
        select: {
          parentAssetId: true,
          componentAsset: { select: auditRoundAssetSelect },
        },
      })
    : []

  return selectAuditComponentCandidates(candidateAssets, componentLinks, input.sampleRate)
}
```

- [ ] **Step 4: Update the preview route**

In `src/app/api/audit-rounds/preview/route.ts`, replace the `getAuditRoundCandidateAssets` / `selectAuditSample` flow with:

```ts
import { getAuditRoundSelection } from "@/lib/audit-round"
```

Inside `POST`, after parsing `input`, use:

```ts
    const selection = await getAuditRoundSelection(input)

    return NextResponse.json({
      matchedAssets: selection.matchedAssets,
      sampledAssets: selection.selectedAssets.length,
      componentItems: selection.componentItems,
      sampleRate: input.sampleRate,
      riskPreset: input.riskPreset,
      previewAssets: selection.selectedItems.slice(0, 8).map((item) => ({
        id: item.asset.id,
        assetTag: item.asset.assetTag,
        name: item.asset.name,
        includedVia: item.includedVia,
        parentAssetTag: item.parentAssetTag ?? null,
      })),
    })
```

Remove the unused `getAuditRoundCandidateAssets` and `selectAuditSample` imports.

- [ ] **Step 5: Update the create route**

In `src/app/api/audit-rounds/route.ts`, replace the helper import:

```ts
import { generateAuditNo, getAuditRoundSelection } from "@/lib/audit-round"
```

Inside `POST`, replace candidate/sample setup with:

```ts
    const selection = await getAuditRoundSelection(input)
    const assets = selection.selectedAssets
    if (assets.length === 0) {
      return NextResponse.json({ error: "No assets found in audit scope" }, { status: 400 })
    }
```

In `logAudit`, use:

```ts
      newValue: {
        ...input,
        auditNo,
        matchedAssets: selection.matchedAssets,
        generatedItems: assets.length,
        componentItems: selection.componentItems,
      },
```

In the response, use:

```ts
    return NextResponse.json(
      {
        ...round,
        matchedAssets: selection.matchedAssets,
        generatedItems: assets.length,
        componentItems: selection.componentItems,
      },
      { status: 201 }
    )
```

- [ ] **Step 6: Update the audit round form preview type and metrics**

In `src/components/audit/audit-round-form.tsx`, change `AuditRoundPreview` to:

```ts
type AuditRoundPreview = {
  matchedAssets: number
  sampledAssets: number
  componentItems: number
  sampleRate: number
  riskPreset: string
  previewAssets: Array<{
    id: string
    assetTag: string
    name: string
    includedVia?: "direct" | "component"
    parentAssetTag?: string | null
  }>
}
```

Change the preview metric grid from `lg:grid-cols-4` to:

```tsx
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
```

Add the component metric after `previewSampled`:

```tsx
<PreviewMetric label={t("previewComponentItems")} value={String(preview.componentItems)} />
```

Inside the `preview ? (` block, after the metric grid, add:

```tsx
{preview.componentItems > 0 ? (
  <p className="mt-3 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
    {t("previewComponentHelp", { count: preview.componentItems })}
  </p>
) : null}
```

Inside `preview.previewAssets.map`, below the asset name, add:

```tsx
{asset.includedVia === "component" && asset.parentAssetTag ? (
  <div className="mt-1 text-xs font-medium text-info">
    {t("previewComponentFromParent", { assetTag: asset.parentAssetTag })}
  </div>
) : null}
```

- [ ] **Step 7: Add audit round messages**

Add these keys under `auditRound` in `messages/th.json`:

```json
"previewComponentItems": "ส่วนควบที่เพิ่มเข้ารอบ",
"previewComponentHelp": "ระบบจะเพิ่มส่วนควบที่ติดตั้งอยู่ {count} รายการเข้ารอบตรวจนับโดยอัตโนมัติ",
"previewComponentFromParent": "เข้ารอบเพราะติดตั้งอยู่กับ {assetTag}"
```

Add these keys under `auditRound` in `messages/en.json`:

```json
"previewComponentItems": "Component items",
"previewComponentHelp": "The system will automatically add {count} installed component items to this audit round.",
"previewComponentFromParent": "Included because it is installed under {assetTag}"
```

- [ ] **Step 8: Run targeted tests**

Run:

```powershell
node --test tests\audit-component-round-selection.test.ts tests\audit-component-round-routes.test.ts tests\audit-round.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```powershell
git add -- src/lib/audit-round.ts src/app/api/audit-rounds/preview/route.ts src/app/api/audit-rounds/route.ts src/components/audit/audit-round-form.tsx messages/th.json messages/en.json tests/audit-component-round-routes.test.ts
git commit -m "Include installed components in audit rounds"
```

## Task 3: Parent-To-Component Sync Helper

**Files:**
- Create: `tests/asset-component-sync.test.ts`
- Create: `src/lib/asset-component-sync.ts`

- [ ] **Step 1: Write helper tests**

Create `tests/asset-component-sync.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  buildComponentSyncUpdate,
  normalizeComponentSyncChanges,
  type ComponentSyncSnapshot,
} from "../src/lib/asset-component-sync.ts"

const snapshot: ComponentSyncSnapshot = {
  id: "component-1",
  branchId: "branch-old",
  currentLocationId: "loc-old",
  departmentId: null,
  custodianId: "emp-old",
}

test("normalizes component sync changes by removing undefined fields", () => {
  assert.deepEqual(
    normalizeComponentSyncChanges({
      branchId: "branch-new",
      currentLocationId: undefined,
      departmentId: null,
      custodianId: "emp-new",
    }),
    {
      branchId: "branch-new",
      departmentId: null,
      custodianId: "emp-new",
    }
  )
})

test("builds component sync update only for changed supported fields", () => {
  const update = buildComponentSyncUpdate(snapshot, {
    branchId: "branch-old",
    currentLocationId: "loc-new",
    departmentId: null,
    custodianId: "emp-new",
  })

  assert.deepEqual(update, {
    data: {
      currentLocationId: "loc-new",
      custodianId: "emp-new",
    },
    fromValue: {
      currentLocationId: "loc-old",
      custodianId: "emp-old",
    },
    toValue: {
      currentLocationId: "loc-new",
      custodianId: "emp-new",
    },
  })
})

test("returns null when component sync fields are unchanged", () => {
  assert.equal(
    buildComponentSyncUpdate(snapshot, {
      branchId: "branch-old",
      currentLocationId: "loc-old",
      departmentId: null,
      custodianId: "emp-old",
    }),
    null
  )
})
```

- [ ] **Step 2: Run helper tests and verify they fail**

Run:

```powershell
node --test tests\asset-component-sync.test.ts
```

Expected: FAIL because `src/lib/asset-component-sync.ts` does not exist.

- [ ] **Step 3: Create the component sync helper**

Create `src/lib/asset-component-sync.ts`:

```ts
import type { Prisma } from "@prisma/client"

export const componentSyncFields = ["branchId", "currentLocationId", "departmentId", "custodianId"] as const

export type ComponentSyncField = (typeof componentSyncFields)[number]
export type ComponentSyncChanges = Partial<Record<ComponentSyncField, string | null | undefined>>
export type NormalizedComponentSyncChanges = Partial<Record<ComponentSyncField, string | null>>

export type ComponentSyncSnapshot = {
  id: string
  branchId: string
  currentLocationId: string
  departmentId: string | null
  custodianId: string | null
}

export type ComponentSyncUpdate = {
  data: NormalizedComponentSyncChanges
  fromValue: NormalizedComponentSyncChanges
  toValue: NormalizedComponentSyncChanges
}

export type ParentComponentSyncInput = {
  parentAssetId: string
  changes: ComponentSyncChanges
  movementType: string
  referenceType: string
  referenceId: string
  performedBy: string
  reason: string
  remark?: string | null
  restrictToAssetIds?: string[]
}

export type ParentComponentSyncResult = {
  updated: number
  skipped: number
  movements: number
}

export function normalizeComponentSyncChanges(changes: ComponentSyncChanges): NormalizedComponentSyncChanges {
  return Object.fromEntries(
    componentSyncFields.flatMap((field) => (
      changes[field] === undefined ? [] : [[field, changes[field] ?? null]]
    ))
  ) as NormalizedComponentSyncChanges
}

export function buildComponentSyncUpdate(
  snapshot: ComponentSyncSnapshot,
  changes: NormalizedComponentSyncChanges
): ComponentSyncUpdate | null {
  const data: NormalizedComponentSyncChanges = {}
  const fromValue: NormalizedComponentSyncChanges = {}
  const toValue: NormalizedComponentSyncChanges = {}

  for (const field of componentSyncFields) {
    if (!(field in changes)) continue
    const nextValue = changes[field] ?? null
    const currentValue = snapshot[field] ?? null
    if (currentValue === nextValue) continue
    data[field] = nextValue
    fromValue[field] = currentValue
    toValue[field] = nextValue
  }

  return Object.keys(data).length > 0 ? { data, fromValue, toValue } : null
}

export async function syncInstalledComponentsWithParent(
  tx: Prisma.TransactionClient,
  input: ParentComponentSyncInput
): Promise<ParentComponentSyncResult> {
  const changes = normalizeComponentSyncChanges(input.changes)
  if (Object.keys(changes).length === 0) return { updated: 0, skipped: 0, movements: 0 }

  const restrictToAssetIds = input.restrictToAssetIds ? Array.from(new Set(input.restrictToAssetIds)) : null
  const links = await tx.assetComponent.findMany({
    where: {
      parentAssetId: input.parentAssetId,
      status: "installed",
      removedAt: null,
      ...(restrictToAssetIds ? { componentAssetId: { in: restrictToAssetIds } } : {}),
      componentAsset: { isActive: true },
    },
    select: {
      componentAssetId: true,
      componentAsset: {
        select: {
          id: true,
          branchId: true,
          currentLocationId: true,
          departmentId: true,
          custodianId: true,
        },
      },
    },
  })

  const componentIds = links.map((link) => link.componentAssetId)
  const activeCheckouts = componentIds.length
    ? await tx.assetCheckout.findMany({
        where: { assetId: { in: componentIds }, isReturned: false },
        select: { assetId: true },
      })
    : []
  const checkedOutAssetIds = new Set(activeCheckouts.map((checkout) => checkout.assetId))
  const movementRows: Prisma.AssetMovementCreateManyInput[] = []
  let updated = 0
  let skipped = 0

  for (const link of links) {
    if (checkedOutAssetIds.has(link.componentAssetId)) {
      skipped += 1
      continue
    }

    const update = buildComponentSyncUpdate(link.componentAsset, changes)
    if (!update) continue

    await tx.asset.update({
      where: { id: link.componentAssetId },
      data: update.data,
    })
    updated += 1
    movementRows.push({
      assetId: link.componentAssetId,
      movementType: input.movementType,
      fromValue: JSON.stringify(update.fromValue),
      toValue: JSON.stringify(update.toValue),
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      performedBy: input.performedBy,
      remark: input.remark,
    })
  }

  if (movementRows.length > 0) {
    await tx.assetMovement.createMany({ data: movementRows })
  }

  return { updated, skipped, movements: movementRows.length }
}
```

- [ ] **Step 4: Run helper tests and verify they pass**

Run:

```powershell
node --test tests\asset-component-sync.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- src/lib/asset-component-sync.ts tests/asset-component-sync.test.ts
git commit -m "Add installed component sync helper"
```

## Task 4: Wire Component Sync Into Parent Asset Operations

**Files:**
- Create: `tests/asset-component-sync-routes.test.ts`
- Modify: `src/app/api/assets/[id]/route.ts`
- Modify: `src/app/api/assets/[id]/transfer/route.ts`
- Modify: `src/app/api/assets/[id]/checkout/route.ts`
- Modify: `src/app/api/assets/[id]/checkin/route.ts`
- Modify: `src/app/api/assets/bulk-move/route.ts`
- Modify: `src/app/api/assets/bulk-update/route.ts`

- [ ] **Step 1: Write source tests for route integration**

Create `tests/asset-component-sync-routes.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const routePaths = [
  "src/app/api/assets/[id]/route.ts",
  "src/app/api/assets/[id]/transfer/route.ts",
  "src/app/api/assets/[id]/checkout/route.ts",
  "src/app/api/assets/[id]/checkin/route.ts",
  "src/app/api/assets/bulk-move/route.ts",
  "src/app/api/assets/bulk-update/route.ts",
]

test("parent asset operation routes import installed component sync helper", () => {
  for (const path of routePaths) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /syncInstalledComponentsWithParent/, `${path} should sync installed components`)
  }
})

test("parent asset routes use workflow-specific component movement types", () => {
  assert.match(readFileSync("src/app/api/assets/[id]/route.ts", "utf8"), /parent_register_update_sync/)
  assert.match(readFileSync("src/app/api/assets/[id]/transfer/route.ts", "utf8"), /parent_transfer_sync/)
  assert.match(readFileSync("src/app/api/assets/[id]/checkout/route.ts", "utf8"), /parent_checkout_sync/)
  assert.match(readFileSync("src/app/api/assets/[id]/checkin/route.ts", "utf8"), /parent_checkin_sync/)
  assert.match(readFileSync("src/app/api/assets/bulk-move/route.ts", "utf8"), /parent_bulk_move_sync/)
  assert.match(readFileSync("src/app/api/assets/bulk-update/route.ts", "utf8"), /parent_bulk_update_sync/)
})

test("parent asset sync routes include component sync counts in logs or responses", () => {
  for (const path of routePaths) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /componentSync/, `${path} should keep component sync result`)
  }
})
```

- [ ] **Step 2: Run source tests and verify they fail**

Run:

```powershell
node --test tests\asset-component-sync-routes.test.ts
```

Expected: FAIL because parent routes do not import or call `syncInstalledComponentsWithParent`.

- [ ] **Step 3: Wire asset register update**

In `src/app/api/assets/[id]/route.ts`, add imports:

```ts
import type { Prisma } from "@prisma/client"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
```

Replace the direct `prisma.asset.update` and `await logAssetMovements(...)` block in `PUT` with:

```ts
    const { asset, componentSync } = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...input,
          assetTag: input.assetTag ?? existing.assetTag,
          updatedBy: user.id,
        },
        include: assetInclude,
      })

      await createAssetMovementRows(tx, {
        userId: user.id,
        assetId: asset.id,
        existing,
        input,
      })

      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: asset.id,
        changes: {
          branchId: input.branchId,
          currentLocationId: input.currentLocationId,
          departmentId: input.departmentId ?? null,
          custodianId: input.custodianId ?? null,
        },
        movementType: "parent_register_update_sync",
        referenceType: "asset",
        referenceId: asset.id,
        performedBy: user.id,
        reason: "Parent asset register update",
      })

      return { asset, componentSync }
    })
```

Rename `logAssetMovements` to `createAssetMovementRows`, add a first `tx` parameter, and change the create call:

```ts
async function createAssetMovementRows(
  tx: Pick<Prisma.TransactionClient, "assetMovement">,
  {
    userId,
    assetId,
    existing,
    input,
  }: {
    userId: string
    assetId: string
    existing: {
      ownershipType: string
      licenseTotalSeats: number | null
      licenseUsedSeats: number | null
      licenseAssignedAssetId: string | null
      currentLocationId: string
      custodianId: string | null
      departmentId: string | null
      statusId: string
      conditionId: string
    }
    input: {
      ownershipType: string
      licenseTotalSeats?: number | null
      licenseUsedSeats?: number | null
      licenseAssignedAssetId?: string | null
      currentLocationId: string
      custodianId?: string | null
      departmentId?: string | null
      statusId: string
      conditionId: string
    }
  }
) {
  const candidates = [
    ["ownership_type_change", existing.ownershipType, input.ownershipType],
    ["license_total_seats_change", existing.licenseTotalSeats == null ? null : String(existing.licenseTotalSeats), input.licenseTotalSeats == null ? null : String(input.licenseTotalSeats)],
    ["license_used_seats_change", existing.licenseUsedSeats == null ? null : String(existing.licenseUsedSeats), input.licenseUsedSeats == null ? null : String(input.licenseUsedSeats)],
    ["license_assigned_asset_change", existing.licenseAssignedAssetId, input.licenseAssignedAssetId ?? null],
    ["location_change", existing.currentLocationId, input.currentLocationId],
    ["custodian_change", existing.custodianId, input.custodianId ?? null],
    ["department_change", existing.departmentId, input.departmentId ?? null],
    ["status_change", existing.statusId, input.statusId],
    ["condition_change", existing.conditionId, input.conditionId],
  ] as const

  const data = candidates
    .filter(([, fromValue, toValue]) => fromValue !== toValue)
    .map(([movementType, fromValue, toValue]) => ({
      assetId,
      movementType,
      fromValue,
      toValue,
      reason: "Asset register update",
      referenceType: "asset",
      referenceId: assetId,
      performedBy: userId,
    }))

  if (data.length > 0) {
    await tx.assetMovement.createMany({ data })
  }
}
```

In the `logAudit` payload, include:

```ts
      newValue: { ...input, componentSync },
```

- [ ] **Step 4: Wire transfer route**

In `src/app/api/assets/[id]/transfer/route.ts`, import:

```ts
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
```

Inside the transaction, after the parent `assetMovement.create`, add:

```ts
      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: id,
        changes: {
          currentLocationId: toSnapshot.locationId,
          custodianId: toSnapshot.custodianId,
          departmentId: toSnapshot.departmentId,
        },
        movementType: "parent_transfer_sync",
        referenceType: "transfer",
        referenceId: id,
        performedBy: user.id,
        reason: input.reason,
        remark: input.remark,
      })

      return { record, componentSync }
```

Change the transaction result variable to:

```ts
    const { record: updatedAsset, componentSync } = await prisma.$transaction(async (tx) => {
```

In `logAudit`, include `componentSync` in `newValue`:

```ts
      newValue: { ...toSnapshot, reason: input.reason, remark: input.remark, componentSync },
```

- [ ] **Step 5: Wire checkout route**

In `src/app/api/assets/[id]/checkout/route.ts`, import:

```ts
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
```

Inside the transaction, after the parent `assetMovement.create`, add:

```ts
      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: id,
        changes: {
          currentLocationId: nextLocationId,
          custodianId: nextCustodianId,
          departmentId: nextDepartmentId,
        },
        movementType: "parent_checkout_sync",
        referenceType: "checkout",
        referenceId: record.id,
        performedBy: user.id,
        reason: "Parent asset checkout",
        remark: input.remark,
      })

      return { record, componentSync }
```

Change the transaction result variable to:

```ts
    const { record: checkout, componentSync } = await prisma.$transaction(async (tx) => {
```

In `logAudit`, include `componentSync` in `newValue`:

```ts
      newValue: { ...input, checkoutId: checkout.id, componentSync },
```

- [ ] **Step 6: Wire checkin route**

In `src/app/api/assets/[id]/checkin/route.ts`, import:

```ts
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
```

Inside the transaction, after the parent `assetMovement.create`, add:

```ts
      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: id,
        changes: {
          currentLocationId: input.nextLocationId,
          custodianId: null,
        },
        movementType: "parent_checkin_sync",
        referenceType: "checkin",
        referenceId: record.id,
        performedBy: user.id,
        reason: "Parent asset checkin",
        remark: input.remark,
      })
```

Return both values at the end of the transaction:

```ts
      return { record, componentSync }
```

Change the transaction result variable to:

```ts
    const { record: checkin, componentSync } = await prisma.$transaction(async (tx) => {
```

In `logAudit`, include `componentSync` in `newValue`:

```ts
      newValue: { ...input, checkinId: checkin.id, componentSync },
```

- [ ] **Step 7: Wire bulk move route**

In `src/app/api/assets/bulk-move/route.ts`, import:

```ts
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
```

Inside the transaction, after the parent movement rows are created, add:

```ts
      const componentSync = { updated: 0, skipped: 0, movements: 0 }
      for (const asset of assets) {
        const result = await syncInstalledComponentsWithParent(tx, {
          parentAssetId: asset.id,
          changes: { currentLocationId: input.toLocationId },
          movementType: "parent_bulk_move_sync",
          referenceType: "bulk_move",
          referenceId: "bulk_move",
          performedBy: user.id,
          reason: input.reason,
          remark: input.remark,
        })
        componentSync.updated += result.updated
        componentSync.skipped += result.skipped
        componentSync.movements += result.movements
      }
```

Change the transaction return to:

```ts
      return { updated: assets.length, componentSync }
```

- [ ] **Step 8: Wire bulk update route**

In `src/app/api/assets/bulk-update/route.ts`, import:

```ts
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
```

Inside the transaction, after parent movement rows are created, add:

```ts
      const componentSync = { updated: 0, skipped: 0, movements: 0 }
      for (const asset of assets) {
        const result = await syncInstalledComponentsWithParent(tx, {
          parentAssetId: asset.id,
          changes: {
            currentLocationId: input.toLocationId,
            custodianId: input.toCustodianId,
          },
          movementType: "parent_bulk_update_sync",
          referenceType: "bulk_update",
          referenceId: "bulk_update",
          performedBy: user.id,
          reason: input.reason,
          remark: input.remark,
        })
        componentSync.updated += result.updated
        componentSync.skipped += result.skipped
        componentSync.movements += result.movements
      }
```

Change the transaction return to:

```ts
      return { updated: assets.length, movements: movementRows.length, componentSync }
```

- [ ] **Step 9: Run targeted tests**

Run:

```powershell
node --test tests\asset-component-sync.test.ts tests\asset-component-sync-routes.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit Task 4**

```powershell
git add -- src/app/api/assets/[id]/route.ts src/app/api/assets/[id]/transfer/route.ts src/app/api/assets/[id]/checkout/route.ts src/app/api/assets/[id]/checkin/route.ts src/app/api/assets/bulk-move/route.ts src/app/api/assets/bulk-update/route.ts tests/asset-component-sync-routes.test.ts
git commit -m "Sync installed components from parent operations"
```

## Task 5: Audit Scan API Component Context And Confirmation

**Files:**
- Create: `tests/audit-component-scan-api.test.ts`
- Modify: `src/lib/validations/audit.ts`
- Modify: `src/app/api/audit-rounds/[id]/scan-lookup/route.ts`
- Modify: `src/app/api/audit-rounds/[id]/scan/route.ts`
- Modify: `src/app/api/audit-findings/[id]/review/route.ts`

- [ ] **Step 1: Write API source tests**

Create `tests/audit-component-scan-api.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit scan validation accepts component confirmation fields", () => {
  const validation = readFileSync("src/lib/validations/audit.ts", "utf8")

  assert.match(validation, /confirmedWithParentAssetId:\s*optionalText/)
  assert.match(validation, /componentConfirmationReason:\s*optionalText/)
})

test("audit scan lookup returns parent and component relationship context", () => {
  const route = readFileSync("src/app/api/audit-rounds/[id]/scan-lookup/route.ts", "utf8")

  assert.match(route, /parentComponents/)
  assert.match(route, /installedInLinks/)
  assert.match(route, /buildAuditComponentLookupContext/)
  assert.match(route, /relatedAuditItems/)
  assert.match(route, /components:/)
  assert.match(route, /installedIn:/)
})

test("audit scan route confirms components with parent context", () => {
  const route = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")

  assert.match(route, /confirmedWithParentAssetId/)
  assert.match(route, /assertComponentInstalledUnderParent/)
  assert.match(route, /confirmed_with_parent/)
  assert.match(route, /componentConfirmationReason/)
  assert.match(route, /parentAssetTag/)
})

test("audit scan and finding review sync only supported audit fields to confirmed components", () => {
  const scanRoute = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")
  const reviewRoute = readFileSync("src/app/api/audit-findings/[id]/review/route.ts", "utf8")

  assert.match(scanRoute, /syncInstalledComponentsWithParent/)
  assert.match(scanRoute, /parent_audit_confirmation_sync/)
  assert.match(scanRoute, /restrictToAssetIds/)
  assert.match(reviewRoute, /syncInstalledComponentsWithParent/)
  assert.match(reviewRoute, /parent_audit_finding_sync/)
  assert.doesNotMatch(scanRoute, /branchId:\s*actual/)
  assert.doesNotMatch(reviewRoute, /conditionId:\s*finding\.actualValue[\s\S]*syncInstalledComponentsWithParent/)
})
```

- [ ] **Step 2: Run API tests and verify they fail**

Run:

```powershell
node --test tests\audit-component-scan-api.test.ts
```

Expected: FAIL because scan validation and API routes do not include component context.

- [ ] **Step 3: Extend audit scan validation**

In `src/lib/validations/audit.ts`, add these fields to `auditScanSchema`:

```ts
  confirmedWithParentAssetId: optionalText,
  componentConfirmationReason: optionalText,
```

- [ ] **Step 4: Add relationship context to scan lookup**

In `src/app/api/audit-rounds/[id]/scan-lookup/route.ts`, extend the `asset.findFirst` select with:

```ts
        parentComponents: {
          where: { status: "installed", removedAt: null },
          select: {
            componentRole: true,
            slotNo: true,
            componentAsset: { select: { id: true, assetTag: true, name: true } },
          },
        },
        installedInLinks: {
          where: { status: "installed", removedAt: null },
          select: {
            componentRole: true,
            slotNo: true,
            parentAsset: { select: { id: true, assetTag: true, name: true } },
          },
        },
```

After loading `item`, add:

```ts
    const relatedAssetIds = [
      ...asset.parentComponents.map((component) => component.componentAsset.id),
      ...asset.installedInLinks.map((link) => link.parentAsset.id),
    ]
    const relatedAuditItems = relatedAssetIds.length
      ? await prisma.auditItem.findMany({
          where: { auditRoundId: id, assetId: { in: relatedAssetIds } },
          select: { id: true, assetId: true, auditStatus: true, auditResult: true },
        })
      : []
```

Change the payload asset builder call to:

```ts
      asset: buildAuditScanLookupAsset(asset, relatedAuditItems),
```

Change `buildAuditScanLookupAsset` to accept related items and include context:

```ts
function buildAuditScanLookupAsset(
  asset: AuditScanLookupAsset,
  relatedAuditItems: Array<{ id: string; assetId: string; auditStatus: string; auditResult: string | null }>
) {
  const location = `${asset.currentLocation.code} - ${asset.currentLocation.name}`
  const category = `${asset.category.code} - ${asset.category.name}`
  const custodian = asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null
  const auditItemByAssetId = new Map(relatedAuditItems.map((item) => [item.assetId, item]))

  return {
    id: asset.id,
    assetTag: asset.assetTag,
    title: asset.assetTag,
    subtitle: asset.name,
    serialNumber: asset.serialNumber,
    fixedAssetCode: asset.fixedAssetCode,
    currentLocationId: asset.currentLocationId,
    custodianId: asset.custodianId,
    departmentId: asset.departmentId,
    conditionId: asset.conditionId,
    ownershipType: asset.ownershipType,
    status: {
      label: asset.status.nameTh,
      colorCode: asset.status.colorCode,
    },
    meta: { custodian, location, category },
    components: buildAuditComponentLookupContext(asset.parentComponents, auditItemByAssetId),
    installedIn: asset.installedInLinks.map((link) => ({
      parentAssetId: link.parentAsset.id,
      assetTag: link.parentAsset.assetTag,
      name: link.parentAsset.name,
      componentRole: link.componentRole,
      slotNo: link.slotNo,
      auditItem: auditItemByAssetId.get(link.parentAsset.id) ?? null,
    })),
  }
}

function buildAuditComponentLookupContext(
  components: AuditScanLookupAsset["parentComponents"],
  auditItemByAssetId: Map<string, { id: string; assetId: string; auditStatus: string; auditResult: string | null }>
) {
  return components.map((component) => ({
    assetId: component.componentAsset.id,
    assetTag: component.componentAsset.assetTag,
    name: component.componentAsset.name,
    componentRole: component.componentRole,
    slotNo: component.slotNo,
    auditItem: auditItemByAssetId.get(component.componentAsset.id) ?? null,
  }))
}
```

Update the local `AuditScanLookupAsset` type to include `parentComponents` and `installedInLinks` with the selected shapes.

- [ ] **Step 5: Add component confirmation branch to scan route**

In `src/app/api/audit-rounds/[id]/scan/route.ts`, import:

```ts
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
```

After the `item` lookup and before the normal `const actual = { ... }` block, add:

```ts
    if (input.confirmedWithParentAssetId) {
      const componentLink = await assertComponentInstalledUnderParent(input.confirmedWithParentAssetId, item.assetId)
      const actual = {
        departmentId: optionalActualValue(input.actualDepartmentId, item.expectedDepartmentId),
        locationId: input.actualLocationId ?? item.expectedLocationId,
        custodianId: optionalActualValue(input.actualCustodianId, item.expectedCustodianId),
        conditionId: optionalActualValue(input.actualConditionId, item.expectedConditionId),
      }
      const mismatches = getMismatches(item, actual, item.asset.ownershipType)
      const scannedAt = new Date()

      const result = await prisma.$transaction(async (tx) => {
        const updatedItem = await tx.auditItem.update({
          where: { id: item.id },
          data: {
            actualDepartmentId: actual.departmentId,
            actualLocationId: actual.locationId,
            actualCustodianId: actual.custodianId,
            actualConditionId: actual.conditionId,
            auditStatus: "scanned",
            auditResult: "confirmed_with_parent",
            findingRequired: mismatches.length > 0,
            reconcileStatus: mismatches.length > 0 ? "pending" : null,
            scannedAt: item.scannedAt ?? scannedAt,
            scannedBy: item.scannedBy ?? user.id,
            lastScanAt: scannedAt,
            scanCount: { increment: 1 },
            remark: input.componentConfirmationReason ?? input.remark,
          },
        })

        await tx.auditScanHistory.create({
          data: {
            auditRoundId: id,
            auditItemId: item.id,
            assetId: item.assetId,
            scannedBy: user.id,
            scannedAt,
            scanLocationId: actual.locationId,
            scanSource: input.scanSource,
            rawPayload: JSON.stringify({
              ...input,
              actual,
              confirmedWithParent: true,
              parentAssetId: componentLink.parentAssetId,
              parentAssetTag: componentLink.parentAsset.assetTag,
            }),
            remark: input.componentConfirmationReason ?? input.remark,
          },
        })

        for (const mismatch of mismatches) {
          await tx.auditFinding.create({
            data: {
              auditRoundId: id,
              auditItemId: item.id,
              assetId: item.assetId,
              findingType: mismatch.type,
              expectedValue: mismatch.expectedValue,
              actualValue: mismatch.actualValue,
              remark: input.componentConfirmationReason ?? input.remark,
              reportedBy: user.id,
              reviewStatus: "pending",
              actionTaken: "component_confirmed_with_parent_mismatch",
            },
          })
        }

        return updatedItem
      })

      await logAudit({
        userId: user.id,
        action: "component_confirmed_with_parent",
        module: "audit",
        recordId: item.id,
        newValue: {
          auditRoundId: id,
          assetId: item.assetId,
          parentAssetId: componentLink.parentAssetId,
          parentAssetTag: componentLink.parentAsset.assetTag,
          mismatches,
        },
        remark: input.componentConfirmationReason ?? input.remark ?? undefined,
      })

      return NextResponse.json({
        item: result,
        auditResult: "confirmed_with_parent",
        mismatches,
        appliedCorrections: [],
        resolvedNotFoundFinding: false,
      })
    }
```

Add this helper near the bottom of the file:

```ts
async function assertComponentInstalledUnderParent(parentAssetId: string, componentAssetId: string) {
  const componentLink = await prisma.assetComponent.findFirst({
    where: {
      parentAssetId,
      componentAssetId,
      status: "installed",
      removedAt: null,
    },
    select: {
      parentAssetId: true,
      parentAsset: { select: { assetTag: true, name: true } },
    },
  })
  if (!componentLink) {
    throw new Error("Component is no longer installed under the selected parent asset")
  }
  return componentLink
}
```

- [ ] **Step 6: Sync confirmed components when parent audit correction applies**

In the normal scan branch, after `await tx.asset.update({ where: { id: item.assetId }, ... })`, add:

```ts
          const confirmedComponentIds = await getConfirmedComponentAssetIds(tx, id, item.assetId)
          if (confirmedComponentIds.length > 0) {
            await syncInstalledComponentsWithParent(tx, {
              parentAssetId: item.assetId,
              changes: {
                currentLocationId: assetUpdateData.currentLocationId,
                custodianId: assetUpdateData.custodianId,
              },
              movementType: "parent_audit_confirmation_sync",
              referenceType: "audit_scan",
              referenceId: item.id,
              performedBy: user.id,
              reason: "Parent audit scan correction",
              remark: input.remark,
              restrictToAssetIds: confirmedComponentIds,
            })
          }
```

Add this helper near the bottom of the scan route:

```ts
async function getConfirmedComponentAssetIds(
  tx: { assetComponent: Prisma.TransactionClient["assetComponent"]; auditItem: Prisma.TransactionClient["auditItem"] },
  auditRoundId: string,
  parentAssetId: string
) {
  const links = await tx.assetComponent.findMany({
    where: { parentAssetId, status: "installed", removedAt: null },
    select: { componentAssetId: true },
  })
  const componentAssetIds = links.map((link) => link.componentAssetId)
  if (componentAssetIds.length === 0) return []

  const confirmedItems = await tx.auditItem.findMany({
    where: {
      auditRoundId,
      assetId: { in: componentAssetIds },
      auditStatus: { in: ["scanned", "reconciled"] },
      auditResult: { in: ["found", "confirmed_with_parent"] },
    },
    select: { assetId: true },
  })

  return confirmedItems.map((item) => item.assetId)
}
```

Also import `type { Prisma } from "@prisma/client"` at the top of the scan route.

- [ ] **Step 7: Sync confirmed components when audit finding approval updates parent master data**

In `src/app/api/audit-findings/[id]/review/route.ts`, import:

```ts
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
```

After the existing `await tx.assetMovement.create({ ... })` for approved field findings, add:

```ts
        if (fieldName !== "conditionId") {
          const confirmedComponentIds = await getConfirmedComponentAssetIds(tx, finding.auditRoundId, finding.assetId)
          if (confirmedComponentIds.length > 0) {
            await syncInstalledComponentsWithParent(tx, {
              parentAssetId: finding.assetId,
              changes: {
                currentLocationId: fieldName === "currentLocationId" ? finding.actualValue : undefined,
                custodianId: fieldName === "custodianId" ? finding.actualValue : undefined,
                departmentId: fieldName === "departmentId" ? finding.actualValue : undefined,
              },
              movementType: "parent_audit_finding_sync",
              referenceType: "audit_finding",
              referenceId: finding.id,
              performedBy: user.id,
              reason: "Parent audit finding approved",
              remark: input.reviewRemark,
              restrictToAssetIds: confirmedComponentIds,
            })
          }
        }
```

Add the same `getConfirmedComponentAssetIds` helper to this file near `updateAuditItemReviewState`, using the local `ReviewTransaction` type:

```ts
async function getConfirmedComponentAssetIds(tx: ReviewTransaction, auditRoundId: string, parentAssetId: string) {
  const links = await tx.assetComponent.findMany({
    where: { parentAssetId, status: "installed", removedAt: null },
    select: { componentAssetId: true },
  })
  const componentAssetIds = links.map((link) => link.componentAssetId)
  if (componentAssetIds.length === 0) return []

  const confirmedItems = await tx.auditItem.findMany({
    where: {
      auditRoundId,
      assetId: { in: componentAssetIds },
      auditStatus: { in: ["scanned", "reconciled"] },
      auditResult: { in: ["found", "confirmed_with_parent"] },
    },
    select: { assetId: true },
  })

  return confirmedItems.map((item) => item.assetId)
}
```

- [ ] **Step 8: Run targeted API tests**

Run:

```powershell
node --test tests\audit-component-scan-api.test.ts tests\audit-scan-lookup.test.ts tests\audit-out-of-scope-actual-field.test.ts tests\audit-finding-resolution.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 5**

```powershell
git add -- src/lib/validations/audit.ts src/app/api/audit-rounds/[id]/scan-lookup/route.ts src/app/api/audit-rounds/[id]/scan/route.ts src/app/api/audit-findings/[id]/review/route.ts tests/audit-component-scan-api.test.ts
git commit -m "Add audit component scan API support"
```

## Task 6: Audit Scan UI Component Panel

**Files:**
- Create: `tests/audit-component-scan-ui.test.ts`
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx`
- Modify: `src/components/audit/audit-scan-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Write UI source tests**

Create `tests/audit-component-scan-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit scan page passes component relationships to the client form", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx", "utf8")

  assert.match(page, /parentComponents/)
  assert.match(page, /installedInLinks/)
  assert.match(page, /buildAuditScanComponentRows/)
  assert.match(page, /components:/)
  assert.match(page, /installedIn:/)
})

test("audit scan form renders installed component panel and confirmation actions", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /type AuditScanComponent/)
  assert.match(form, /function AuditComponentPanel/)
  assert.match(form, /confirmComponentWithParent/)
  assert.match(form, /markComponentMissing/)
  assert.match(form, /confirmedWithParentAssetId/)
  assert.match(form, /componentConfirmationReason/)
  assert.match(form, /mark-not-found/)
  assert.match(form, /componentStatusConfirmedWithParent/)
})

test("audit scan component UI copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.componentsPanelTitle, "string")
    assert.equal(typeof messages.auditScan.componentsPanelHelp, "string")
    assert.equal(typeof messages.auditScan.componentStatusPending, "string")
    assert.equal(typeof messages.auditScan.componentStatusScanned, "string")
    assert.equal(typeof messages.auditScan.componentStatusConfirmedWithParent, "string")
    assert.equal(typeof messages.auditScan.componentConfirmWithParent, "string")
    assert.equal(typeof messages.auditScan.componentScanQr, "string")
    assert.equal(typeof messages.auditScan.componentMissing, "string")
    assert.equal(typeof messages.auditScan.componentMissingRemark, "string")
    assert.equal(typeof messages.auditScan.componentMissingDefaultRemark, "string")
    assert.equal(typeof messages.auditScan.componentMissingSaved, "string")
    assert.equal(typeof messages.auditScan.installedInParentNotice, "string")
  }
})
```

- [ ] **Step 2: Run UI tests and verify they fail**

Run:

```powershell
node --test tests\audit-component-scan-ui.test.ts
```

Expected: FAIL because the scan page and form do not pass/render components.

- [ ] **Step 3: Load relationships in the audit scan server page**

In `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx`, extend `asset.select` inside `round.items` with:

```ts
                  parentComponents: {
                    where: { status: "installed", removedAt: null },
                    select: {
                      componentRole: true,
                      slotNo: true,
                      componentAsset: { select: { id: true, assetTag: true, name: true } },
                    },
                  },
                  installedInLinks: {
                    where: { status: "installed", removedAt: null },
                    select: {
                      componentRole: true,
                      slotNo: true,
                      parentAsset: { select: { id: true, assetTag: true, name: true } },
                    },
                  },
```

Before `return (`, add:

```ts
  const auditItemByAssetId = new Map(round.items.map((item) => [item.assetId, item]))
```

In each mapped item, add:

```ts
        components: buildAuditScanComponentRows(item.asset.parentComponents, auditItemByAssetId),
        installedIn: item.asset.installedInLinks.map((link) => ({
          parentAssetId: link.parentAsset.id,
          assetTag: link.parentAsset.assetTag,
          name: link.parentAsset.name,
          componentRole: link.componentRole,
          slotNo: link.slotNo,
        })),
```

Add this helper below the page component:

```ts
function buildAuditScanComponentRows(
  components: Array<{
    componentRole: string
    slotNo: string | null
    componentAsset: { id: string; assetTag: string; name: string }
  }>,
  auditItemByAssetId: Map<string, { id: string; assetId: string; auditStatus: string; auditResult: string | null }>
) {
  return components.map((component) => {
    const auditItem = auditItemByAssetId.get(component.componentAsset.id)
    return {
      assetId: component.componentAsset.id,
      assetTag: component.componentAsset.assetTag,
      name: component.componentAsset.name,
      componentRole: component.componentRole,
      slotNo: component.slotNo,
      auditItemId: auditItem?.id ?? null,
      auditStatus: auditItem?.auditStatus ?? "out_of_round",
      auditResult: auditItem?.auditResult ?? null,
    }
  })
}
```

- [ ] **Step 4: Add component types to the client form**

In `src/components/audit/audit-scan-form.tsx`, add types near `AuditScanItem`:

```ts
type AuditScanComponent = {
  assetId: string
  assetTag: string
  name: string
  componentRole: string
  slotNo: string | null
  auditItemId: string | null
  auditStatus: string
  auditResult: string | null
}

type AuditInstalledInParent = {
  parentAssetId: string
  assetTag: string
  name: string
  componentRole: string
  slotNo: string | null
}
```

Add these fields to `AuditScanItem`:

```ts
  components: AuditScanComponent[]
  installedIn: AuditInstalledInParent[]
```

- [ ] **Step 5: Add component confirmation and missing actions**

Inside `AuditScanForm`, add these functions near `submitAuditScan`:

```ts
  async function confirmComponentWithParent(component: AuditScanComponent) {
    if (!selectedItem) return
    if (!component.auditItemId) {
      toast.error(t("componentOutOfRound"))
      return
    }

    setSaving(true)
    try {
      const actualValues = getActualValues(values, selectedItem)
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: component.assetId,
          actualLocationId: actualValues.actualLocationId,
          actualCustodianId: actualValues.actualCustodianId,
          actualDepartmentId: actualValues.actualDepartmentId,
          actualConditionId: actualValues.actualConditionId,
          scanSource: "manual",
          confirmedWithParentAssetId: selectedItem.assetId,
          componentConfirmationReason: values.remark || t("componentConfirmedWithParentReason", { assetTag: selectedItem.assetTag }),
          remark: values.remark,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("componentConfirmedWithParentSuccess"))
      showScanFeedback({
        status: "saved",
        title: t("componentConfirmedWithParentSuccess"),
        description: `${component.assetTag} - ${component.name}`,
      })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function markComponentMissing(component: AuditScanComponent) {
    if (!selectedItem) return
    if (!component.auditItemId) {
      toast.error(t("componentOutOfRound"))
      return
    }

    const promptValue = window.prompt(t("componentMissingRemark"))
    if (promptValue === null) return

    const remark = promptValue.trim() || t("componentMissingDefaultRemark", { assetTag: selectedItem.assetTag })

    setSaving(true)
    try {
      const response = await fetch(`/api/audit-items/${component.auditItemId}/mark-not-found`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("componentMissingSaved"))
      showScanFeedback({
        status: "mismatch",
        title: t("componentMissingSaved"),
        description: `${component.assetTag} - ${component.name}`,
      })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }
```

- [ ] **Step 6: Render installed-in notice and component panel**

Below the selected target system data card, add:

```tsx
{selectedItem.installedIn.length > 0 ? (
  <div className="md:col-span-2 rounded-md border border-info/30 bg-info/10 p-3 text-sm text-info">
    {t("installedInParentNotice", {
      assetTag: selectedItem.installedIn[0].assetTag,
      role: selectedItem.installedIn[0].componentRole,
    })}
  </div>
) : null}

{selectedItem.components.length > 0 ? (
  <AuditComponentPanel
    components={selectedItem.components}
    saving={saving}
    onConfirmWithParent={confirmComponentWithParent}
    onMarkMissing={markComponentMissing}
    onScanComponent={(component) => {
      setScanText(component.assetTag)
      void selectScannedAsset(component.assetTag, "manual")
    }}
    t={t}
  />
) : null}
```

Add this component near `PendingQueuePanel`:

```tsx
function AuditComponentPanel({
  components,
  saving,
  onConfirmWithParent,
  onMarkMissing,
  onScanComponent,
  t,
}: {
  components: AuditScanComponent[]
  saving: boolean
  onConfirmWithParent: (component: AuditScanComponent) => void
  onMarkMissing: (component: AuditScanComponent) => void
  onScanComponent: (component: AuditScanComponent) => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const checkedCount = components.filter((component) => component.auditStatus !== "pending").length

  return (
    <div className="md:col-span-2 rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{t("componentsPanelTitle")}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("componentsPanelHelp")}</div>
        </div>
        <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          {t("componentsCheckedCount", { checked: checkedCount, total: components.length })}
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {components.map((component) => (
          <div key={component.assetId} className="rounded-md border border-border bg-surface p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="break-words text-sm font-semibold text-foreground">
                  {component.assetTag} - {component.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {component.componentRole}
                  {component.slotNo ? ` · ${component.slotNo}` : ""}
                </div>
                <div className="mt-2 text-xs font-medium text-primary">
                  {getComponentAuditStatusLabel(component, t)}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:w-[28rem]">
                <button
                  type="button"
                  onClick={() => onScanComponent(component)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  {t("componentScanQr")}
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmWithParent(component)}
                  disabled={saving || !component.auditItemId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("componentConfirmWithParent")}
                </button>
                <button
                  type="button"
                  onClick={() => onMarkMissing(component)}
                  disabled={saving || !component.auditItemId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 text-xs font-medium text-warning transition-colors hover:bg-warning/20 disabled:opacity-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("componentMissing")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getComponentAuditStatusLabel(component: AuditScanComponent, t: (key: string) => string) {
  if (component.auditResult === "confirmed_with_parent") return t("componentStatusConfirmedWithParent")
  if (component.auditStatus === "pending") return t("componentStatusPending")
  if (component.auditStatus === "out_of_round") return t("componentStatusOutOfRound")
  if (component.auditResult === "found" || component.auditStatus === "scanned" || component.auditStatus === "reconciled") {
    return t("componentStatusScanned")
  }
  return t("componentStatusMismatch")
}
```

The `componentMissing` action must reuse the existing `POST /api/audit-items/:id/mark-not-found` workflow so component rows create the same `not_found` finding and investigation status as the pending list.

- [ ] **Step 7: Add audit scan messages**

Add these keys under `auditScan` in `messages/th.json`:

```json
"componentsPanelTitle": "ส่วนควบของทรัพย์สินนี้",
"componentsPanelHelp": "ตรวจส่วนควบที่ติดตั้งอยู่กับทรัพย์สินหลัก รายการส่วนควบยังมีสถานะตรวจนับของตัวเอง",
"componentsCheckedCount": "ตรวจแล้ว {checked}/{total}",
"componentStatusPending": "ยังไม่ตรวจ",
"componentStatusScanned": "สแกนพบ",
"componentStatusConfirmedWithParent": "ยืนยันกับทรัพย์สินหลัก",
"componentStatusOutOfRound": "อยู่นอกรอบตรวจนี้",
"componentStatusMismatch": "ข้อมูลไม่ตรง",
"componentConfirmWithParent": "ยืนยันกับตัวหลัก",
"componentScanQr": "สแกน QR ส่วนควบ",
"componentMissing": "ไม่พบ",
"componentMissingRemark": "ระบุเหตุผลที่ไม่พบส่วนควบนี้",
"componentMissingDefaultRemark": "ไม่พบส่วนควบระหว่างตรวจทรัพย์สินหลัก {assetTag}",
"componentMissingSaved": "บันทึกว่าไม่พบส่วนควบแล้ว",
"componentOutOfRound": "ส่วนควบนี้ไม่มีรายการตรวจในรอบนี้",
"componentConfirmedWithParentReason": "ยืนยันส่วนควบพร้อมทรัพย์สินหลัก {assetTag}",
"componentConfirmedWithParentSuccess": "ยืนยันส่วนควบกับทรัพย์สินหลักแล้ว",
"installedInParentNotice": "ทรัพย์สินนี้เป็นส่วนควบของ {assetTag} ({role})"
```

Add these keys under `auditScan` in `messages/en.json`:

```json
"componentsPanelTitle": "Installed components",
"componentsPanelHelp": "Check components installed under this parent asset. Each component keeps its own audit status.",
"componentsCheckedCount": "Checked {checked}/{total}",
"componentStatusPending": "Pending",
"componentStatusScanned": "Scanned",
"componentStatusConfirmedWithParent": "Confirmed with parent",
"componentStatusOutOfRound": "Out of this round",
"componentStatusMismatch": "Mismatch",
"componentConfirmWithParent": "Confirm with parent",
"componentScanQr": "Scan component QR",
"componentMissing": "Missing",
"componentMissingRemark": "Enter the reason this component was not found",
"componentMissingDefaultRemark": "Component was not found while auditing parent asset {assetTag}",
"componentMissingSaved": "Component marked as missing",
"componentOutOfRound": "This component has no audit item in this round.",
"componentConfirmedWithParentReason": "Confirmed component with parent asset {assetTag}",
"componentConfirmedWithParentSuccess": "Component confirmed with parent asset",
"installedInParentNotice": "This asset is installed under {assetTag} ({role})"
```

- [ ] **Step 8: Run targeted UI tests**

Run:

```powershell
node --test tests\audit-component-scan-ui.test.ts tests\audit-scan-field-mode-ux.test.ts tests\audit-scan-result-semantics.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 6**

```powershell
git add -- src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx src/components/audit/audit-scan-form.tsx messages/th.json messages/en.json tests/audit-component-scan-ui.test.ts
git commit -m "Show audit component assets during scan"
```

## Task 7: Documentation And Handoff Updates

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/03_DATABASE.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/11_FEATURE_LIST.md`
- Modify: `docs/99_CHANGELOG.md`

- [ ] **Step 1: Update handoff**

Add a bullet near the audit and Asset Detail relationship bullets in `DEVELOPER_HANDOFF.md`:

```md
- Audit component asset support is implemented for parent-led counting. Audit round preview/create expands selected parent assets with active installed `AssetComponent` children before creating `audit_items`, while preserving one audit item per asset. Audit Scan shows installed components under the selected parent, supports direct component scans, and supports explicit `confirmed_with_parent` component confirmation for components that cannot be scanned directly. Parent asset register/transfer/checkout/checkin/bulk updates and approved audit corrections sync supported location/custodian/department/branch fields to active installed components through `syncInstalledComponentsWithParent`, with component movement rows for every changed component. Audit scan does not add branch correction and never syncs condition/status automatically.
```

- [ ] **Step 2: Update database docs**

In `docs/03_DATABASE.md`, add this note near the `AssetComponent` section:

```md
- Audit rounds treat installed component assets as first-class `AuditItem` rows. `AssetComponent` remains the relationship source; no audit-specific component relationship table is added.
- Parent-to-component master-data sync updates only supported ownership/location fields and records `AssetMovement` rows on each component asset.
```

- [ ] **Step 3: Update workflow docs**

In `docs/06_WORKFLOWS.md`, add this under Audit:

```md
- When an in-scope parent asset has installed components, audit preview/create includes those active installed component assets automatically. Components remain separate audit items, but the scan page shows them under the parent so field auditors can scan the component QR, confirm it with the parent when the label is inaccessible, or handle missing components through the pending/not-found workflow.
- Parent asset operations that move or reassign the physical package sync supported fields to installed components with movement logs. Audit correction sync is limited to fields the audit workflow updates today: location/custodian from scan correction and location/custodian/department from approved findings. Branch does not change through audit scan, and condition/status remain per asset.
```

- [ ] **Step 4: Update UAT checklist**

In `docs/07_UAT_CHECKLIST.md`, add these auditor checks:

```md
- [ ] Create an audit round where a selected parent asset has installed components; confirm preview shows the component count and the created round has separate audit items for the parent and components.
- [ ] Scan the parent asset and confirm the scan page shows installed components with their own statuses. Confirming a component with parent should update only the component audit item and show `ยืนยันกับทรัพย์สินหลัก`.
- [ ] Move or transfer a parent asset with installed components and confirm active installed components receive supported field updates plus component movement rows.
```

- [ ] **Step 5: Update feature list**

In `docs/11_FEATURE_LIST.md`, add this Audit feature row:

```md
| Component asset audit | Audit round preview/create automatically includes active installed component assets for selected parents; Audit Scan shows component status under the parent and supports explicit confirmed-with-parent component verification |
```

- [ ] **Step 6: Update changelog**

Add a dated entry near the top of `docs/99_CHANGELOG.md`:

```md
## 2026-06-22

- Added audit component asset workflow: audit rounds include active installed components for selected parent assets, Audit Scan shows component status under the parent, and component confirmations update the component's own audit item.
- Added parent-to-component master-data sync for supported movement fields with component movement logs, while keeping condition/status and audit branch changes out of automatic sync.
```

- [ ] **Step 7: Commit Task 7**

```powershell
git add -- DEVELOPER_HANDOFF.md docs/03_DATABASE.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/99_CHANGELOG.md
git commit -m "Document audit component asset workflow"
```

## Task 8: Final Verification

**Files:**
- No planned file edits.

- [ ] **Step 1: Run component feature tests**

Run:

```powershell
node --test tests\audit-component-round-selection.test.ts tests\audit-component-round-routes.test.ts tests\asset-component-sync.test.ts tests\asset-component-sync-routes.test.ts tests\audit-component-scan-api.test.ts tests\audit-component-scan-ui.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run related audit and operation tests**

Run:

```powershell
node --test tests\audit-round.test.ts tests\audit-scan-lookup.test.ts tests\audit-out-of-scope-actual-field.test.ts tests\audit-scan-field-mode-ux.test.ts tests\audit-scan-result-semantics.test.ts tests\audit-finding-resolution.test.ts tests\asset-operation-status-policy.test.ts tests\legacy-checkin-flow.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 4: Run lint**

Run:

```powershell
npm run lint -- src/lib/audit-component-round.ts src/lib/audit-round.ts src/lib/asset-component-sync.ts src/app/api/audit-rounds/preview/route.ts src/app/api/audit-rounds/route.ts src/app/api/audit-rounds/[id]/scan-lookup/route.ts src/app/api/audit-rounds/[id]/scan/route.ts src/app/api/audit-findings/[id]/review/route.ts src/app/api/assets/[id]/route.ts src/app/api/assets/[id]/transfer/route.ts src/app/api/assets/[id]/checkout/route.ts src/app/api/assets/[id]/checkin/route.ts src/app/api/assets/bulk-move/route.ts src/app/api/assets/bulk-update/route.ts src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx src/components/audit/audit-round-form.tsx src/components/audit/audit-scan-form.tsx
```

Expected: PASS.

- [ ] **Step 5: Run TypeScript check**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS, or fail only on known unrelated pre-existing test type errors. If it fails, record exact diagnostics before final handoff.

- [ ] **Step 6: Inspect final git diff**

Run:

```powershell
git status --short
git diff --stat HEAD
```

Expected: only files from this plan are modified, plus any pre-existing unrelated dirty files that were already present before implementation.

- [ ] **Step 7: Final implementation commit**

If Task 7 was the last code/doc commit and no verification-only changes were made, skip this commit. If verification required small fixes, commit them:

```powershell
git add -- src lib tests messages docs DEVELOPER_HANDOFF.md
git commit -m "Polish audit component asset workflow"
```

Expected: commit succeeds or is skipped because there are no new changes.

## Self-Review Notes

- Spec coverage: this plan maps round expansion to Tasks 1-2, parent sync to Tasks 3-4, scan lookup/save to Task 5, scan UI to Task 6, documentation to Task 7, and verification to Task 8.
- Type consistency: `confirmedWithParentAssetId`, `componentConfirmationReason`, `confirmed_with_parent`, `componentItems`, `syncInstalledComponentsWithParent`, and `selectAuditComponentCandidates` are introduced before downstream tasks use them.
- Scope boundary: the plan does not add audit branch correction, automatic component condition sync, automatic component status sync, or a replacement relationship model.
