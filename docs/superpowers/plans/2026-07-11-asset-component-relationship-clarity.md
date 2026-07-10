# Asset Component Relationship Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Asset Detail component relationships easier to find, read, and navigate back from without changing business workflows.

**Architecture:** Asset Detail remains the source of counts and safe return URLs. Extend the existing tab and relationship-summary components with presentational props, and keep URL validation in the asset return-navigation helper.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, next-intl, Lucide, Node test runner.

## Global Constraints

- Preserve component installation, removal, RBAC, audit logging, ownership, lifecycle, and API rules.
- Use the existing Navy/White/Blue tokens and Lucide icons only.
- Keep Thai and English messages aligned.
- Render missing-serial state with an icon and accessible text, not color alone.
- Do not add a database field, route, or new API request.

---

### Task 1: Permit Safe Asset Detail Return Targets

**Files:**
- Modify: `src/lib/asset-return-navigation.ts`
- Modify: `tests/asset-return-navigation.test.ts`

**Interfaces:**
- Consumes: `normalizeAssetReturnTo(locale, value)` and its Asset Register / Scan allow-list.
- Produces: `normalizeAssetReturnTo` accepts one same-locale route shaped as `/{locale}/assets/{assetId}` with optional query string and hash.

- [x] **Step 1: Write the failing test**

```ts
test("asset return navigation accepts a same-locale component detail target only", () => {
  assert.equal(
    normalizeAssetReturnTo("th", "/th/assets/component%20asset?view=custody#components"),
    "/th/assets/component%20asset?view=custody#components",
  )
  assert.equal(normalizeAssetReturnTo("th", "/th/assets/component%20asset/edit"), "/th/assets")
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/asset-return-navigation.test.ts`

Expected: FAIL because Asset Detail paths are currently rejected.

- [x] **Step 3: Write minimal implementation**

```ts
const assetDetailPrefix = `${fallback}/`
const assetDetailId = url.pathname.startsWith(assetDetailPrefix) ? url.pathname.slice(assetDetailPrefix.length) : ""
const isAssetDetailPath = assetDetailId.length > 0 && !assetDetailId.includes("/")

if (!safeTargets.has(url.pathname) && !isAssetDetailPath) return fallback
```

Keep the same-origin check and preserve pathname, query string, and hash.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/asset-return-navigation.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/asset-return-navigation.ts tests/asset-return-navigation.test.ts
git commit -m "feat: preserve asset detail relationship return links"
```

### Task 2: Add Custody Relationship Indicators To Detail Tabs

**Files:**
- Modify: `src/components/assets/asset-detail-tabs.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `tests/asset-detail-ux.test.ts`

**Interfaces:**
- Consumes: `currentComponentsForPanel`, `installedInLinksForPanel`, and `componentAsset.serialNumber`.
- Produces: `AssetDetailTabs` accepts optional per-view `count` and `hasWarning` values and a warning label.

- [x] **Step 1: Write the failing test**

```ts
test("asset detail marks the custody tab with component count and missing serial warning", () => {
  const pageSource = assetDetailSource()
  const tabsSource = readFileSync("src/components/assets/asset-detail-tabs.tsx", "utf8")

  assert.match(pageSource, /const componentRelationshipCount = currentComponentsForPanel\.length \+ installedInLinksForPanel\.length/)
  assert.match(pageSource, /indicators=\{\{ custody: \{ count: componentRelationshipCount, hasWarning: componentMissingSerialCount > 0 \} \}\}/)
  assert.match(tabsSource, /AlertTriangle/)
  assert.match(tabsSource, /indicator\?\.count/)
  assert.match(tabsSource, /warningLabel/)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/asset-detail-ux.test.ts`

Expected: FAIL because the tab component has no indicator interface or warning icon.

- [x] **Step 3: Write minimal implementation**

```tsx
type AssetDetailTabIndicator = { count?: number; hasWarning?: boolean }

{indicator?.count ? <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">{indicator.count}</span> : null}
{indicator?.hasWarning ? (
  <span className="inline-flex text-warning">
    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
    <span className="sr-only">{warningLabel}</span>
  </span>
) : null}
```

In Asset Detail, pass the combined active relationship count to the `custody` indicator and set `hasWarning` when a current child component has no serial number.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/asset-detail-ux.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/assets/asset-detail-tabs.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" tests/asset-detail-ux.test.ts
git commit -m "feat: signal component relationships in detail tabs"
```

### Task 3: Preserve Parent Context And Label Relationship Metadata

**Files:**
- Modify: `src/components/assets/asset-component-context-banner.tsx`
- Modify: `src/components/assets/asset-components-summary.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `tests/asset-detail-ux.test.ts`

**Interfaces:**
- Consumes: `appendReturnTo`, `buildAssetDetailViewHref`, and `installedInLinksForPanel`.
- Produces: every parent relationship link uses `parentHref`; compact relationship copy receives `roleLabel` and `slotLabel`.

- [x] **Step 1: Write the failing test**

```ts
test("asset component parent links preserve context and label role metadata", () => {
  const pageSource = assetDetailSource()
  const bannerSource = readFileSync("src/components/assets/asset-component-context-banner.tsx", "utf8")
  const summarySource = readFileSync("src/components/assets/asset-components-summary.tsx", "utf8")

  assert.match(pageSource, /const currentAssetDetailHref = buildAssetDetailViewHref\(locale, asset\.id, assetDetailView, returnToHref\)/)
  assert.match(pageSource, /parentHref: appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{component\.parentAsset\.id\}`, currentAssetDetailHref\)/)
  assert.match(pageSource, /href: link\.parentHref/)
  assert.match(bannerSource, /roleLabel: string/)
  assert.match(summarySource, /slotLabel: string/)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/asset-detail-ux.test.ts`

Expected: FAIL because parent links are constructed independently and metadata is dot-separated.

- [x] **Step 3: Write minimal implementation**

```ts
const currentAssetDetailHref = buildAssetDetailViewHref(locale, asset.id, assetDetailView, returnToHref)

const installedInLinksForPanel = asset.installedInLinks.map((component) => ({
  ...component,
  parentHref: appendReturnTo(`/${locale}/assets/${component.parentAsset.id}`, currentAssetDetailHref),
}))
```

Use `link.parentHref` in the banner, summary, and parent relationship-map lane. Replace unlabelled role and slot text with independently wrapping labelled spans that use `componentRole` and `slotNo` translations.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/asset-detail-ux.test.ts tests/asset-return-navigation.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/assets/asset-component-context-banner.tsx src/components/assets/asset-components-summary.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" tests/asset-detail-ux.test.ts
git commit -m "feat: clarify asset component relationship context"
```

### Task 4: Verify The Integrated Detail Experience

**Files:**
- Verify: `tests/asset-detail-ux.test.ts`
- Verify: `tests/asset-return-navigation.test.ts`
- Verify: `tests/asset-relationship-map-ui.test.ts`
- Verify: `tests/asset-component-manager.test.ts`

**Interfaces:**
- Consumes: completed work from Tasks 1-3.
- Produces: regression evidence for relationship presentation and navigation.

- [x] **Step 1: Run focused behavior tests**

Run: `node --test tests/asset-detail-ux.test.ts tests/asset-return-navigation.test.ts tests/asset-relationship-map-ui.test.ts tests/asset-component-manager.test.ts`

Expected: PASS.

- [x] **Step 2: Run static verification**

Run: `npx tsc --noEmit`

Expected: PASS.

- [x] **Step 3: Run lint**

Run: `npm run lint`

Expected: exit code 0; existing warnings from copied tooling directories may remain.

- [x] **Step 4: Run project verification when database configuration is available**

Run: `npm run verify`

Expected: PASS. If the isolated worktree has no SQL Server environment, record the limitation without modifying environment files.

Result: compilation and TypeScript completed; page-data collection stopped because this isolated worktree has no SQL Server connection settings.

- [x] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-11-asset-component-relationship-clarity.md
git commit -m "docs: plan asset component relationship clarity"
```
