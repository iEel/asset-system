# Asset Detail And Component Manager UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Asset Detail a focused, permission-aware record view and move component installation/removal to a dedicated, scan-first Component Manager.

**Architecture:** Keep the current `view=overview|custody|operations|audit` URL contract, but make it select the only visible content group. Extract small pure policies for tab sections, action visibility, component return paths, and candidate query thresholds so page rendering and client behavior are testable without changing API contracts. The Component Manager reuses existing component installation/removal API routes, audit logging, evidence storage, and validation.

**Tech Stack:** Next.js 16.2.4 App Router, React 19, TypeScript, next-intl, Prisma 7 / SQL Server, Tailwind CSS 4, lucide-react, Node test runner.

## Global Constraints

- Read the relevant Next.js 16 App Router documentation under `node_modules/next/dist/docs/` before modifying route or page code.
- Retain Navy `#0F172A`, White `#FFFFFF`, Action Blue `#2563EB`, Electric Blue `#3B82F6` focus/navigation, semantic status colors, and Lucide icons.
- Do not modify component installation/removal API contracts, SQL schema, lifecycle transitions, RBAC enforcement, SOD, audit logging, evidence validation, or parent-component sync behavior.
- Use `hasPermission` with the server-page user to hide mutation controls; API permission checks remain authoritative.
- Use `view=overview|custody|operations|audit` as the URL-backed Asset Detail tab state.
- Mobile controls require a minimum 44px touch target, must not create page-level horizontal overflow, and may show only one contextual fixed action bar.
- Use `apply_patch` for all source and documentation edits. Keep all unrelated root-worktree changes untouched.
- Run focused Node tests after each task; run `npm test`, `npm run lint`, `npm run build`, and `npm run verify` before the final push.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/asset-detail-view.ts` | Typed Asset Detail tabs, section membership, and URL builders. |
| `src/lib/asset-return-navigation.ts` | Strictly normalizes Component Manager return paths. |
| `src/components/assets/asset-detail-tabs.tsx` | Single accessible Asset Detail tab bar. |
| `src/components/assets/asset-detail-action-menu.tsx` | Desktop overflow menu and mobile More menu with permission-filtered actions. |
| `src/components/assets/asset-components-summary.tsx` | Read-only relationship and component summary for the custody tab. |
| `src/components/assets/asset-component-manager.tsx` | Client scan/search, review, installation, removal, and bounded history workspace. |
| `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` | Leaner tab-selected Asset Detail read model and layout composition. |
| `src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx` | Server page for the Component Manager and its permission-aware read model. |
| `src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx` | Removes the duplicate inline component editor. |
| `src/app/api/assets/component-candidates/route.ts` | Requires a two-character lookup term before querying candidates. |
| `messages/th.json`, `messages/en.json` | Thai and English copy for tabs, menus, manager, review, and empty/error states. |
| `tests/asset-detail-view.test.ts` | Tab grouping and href behavior. |
| `tests/asset-detail-ux.test.ts` | Source-level regression checks for the one-tab layout and action limits. |
| `tests/asset-component-manager.test.ts` | Manager route, candidate threshold, review, removal, and permission UI checks. |
| `tests/asset-return-navigation.test.ts` | Safe Component Manager return path checks. |

---

### Task 1: Add Testable Detail Tab Policies

**Files:**
- Modify: `src/lib/asset-detail-view.ts`
- Modify: `tests/asset-detail-view.test.ts`

**Interfaces:**
- Consumes: normalized ownership values from `src/lib/asset-ownership.ts` and current tab values from `src/lib/asset-detail-view.ts`.
- Produces: `isAssetDetailSectionVisible` for page and component consumers.

- [x] **Step 1: Write failing tab policy tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { isAssetDetailSectionVisible } from "../src/lib/asset-detail-view.ts"

test("shows only sections belonging to the selected detail tab", () => {
  assert.equal(isAssetDetailSectionVisible("custody", "components"), true)
  assert.equal(isAssetDetailSectionVisible("custody", "overview"), false)
})
```

- [x] **Step 2: Run the tests to verify failure**

Run: `node --test tests/asset-detail-view.test.ts`

Expected: FAIL because `isAssetDetailSectionVisible` does not exist.

- [x] **Step 3: Add the smallest pure policies**

In `asset-detail-view.ts`, export the section id union and add:

```ts
export function isAssetDetailSectionVisible(view: AssetDetailView, sectionId: AssetDetailSectionId) {
  return sectionIdsByAssetDetailView[view].includes(sectionId)
}
```

- [x] **Step 4: Run focused tests**

Run: `node --test tests/asset-detail-view.test.ts`

Expected: PASS.

- [x] **Step 5: Commit the policy foundation**

```bash
git add src/lib/asset-detail-view.ts tests/asset-detail-view.test.ts
git commit -m "refactor: add asset detail tab policies"
```

### Task 2: Convert Asset Detail To One Tab System And A Single Action Hierarchy

**Files:**
- Create: `src/components/assets/asset-detail-tabs.tsx`
- Create: `src/components/assets/asset-detail-action-menu.tsx`
- Create: `tests/asset-detail-ux.test.ts`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/asset-detail-anchor-layout.test.ts`
- Modify: `tests/asset-relationship-map-ui.test.ts`

**Interfaces:**
- Consumes: `AssetDetailView`, `buildAssetDetailViewHref`, and `isAssetDetailSectionVisible` from Task 1; `SessionUser` and `hasPermission` from `src/lib/auth-utils.ts`.
- Produces: URL-backed tab content, an accessible More menu, and a maximum of three mobile fixed actions.

- [x] **Step 1: Write failing layout tests**

```ts
test("asset detail renders one tab navigation and selected content only", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  assert.match(source, /AssetDetailTabs/)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "overview"\)/)
  assert.doesNotMatch(source, /sectionLinks\.map/)
})

test("asset detail caps mobile actions at three and keeps secondary actions in More", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  assert.match(source, /mobileActions\.slice\(0, 3\)/)
  assert.match(source, /AssetDetailActionMenu/)
})
```

Update the anchor and relationship-map tests so they assert the custody tab owns `ownership` and `components`, rather than relying on the removed peer section navigator.

- [x] **Step 2: Run the tests to verify failure**

Run: `node --test tests/asset-detail-ux.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-relationship-map-ui.test.ts`

Expected: FAIL because the extracted components and view guard are absent.

- [x] **Step 3: Implement the one-tab layout**

Implement `AssetDetailTabs` as a `nav` with `aria-current="page"` on the selected tab, using the existing `buildAssetDetailViewHref` contract. In `page.tsx`, wrap every content section with the exact guard below and remove the sticky `sectionLinks` navigation:

```tsx
{isAssetDetailSectionVisible(assetDetailView, "overview") ? (
  <section id="overview" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
    {/* existing overview content */}
  </section>
) : null}
```

Render `ownership`, `components`, and `handover` only for `custody`; `movement` and `maintenance` only for `operations`; and `audit` only for `audit`.

Build `AssetDetailActionMenu` from an array of `{ label, href, icon, visible }` entries. Desktop shows Back, Edit only when `hasPermission(user, "asset", "edit")`, and More for Activity, Evidence, Print Label, and Clone. Mobile shows Back and More in the header and sends only three stable lifecycle actions to `MobileActionBar`.

- [x] **Step 4: Add concise bilingual copy**

Add translation keys for `asset.detailMoreActions`, `asset.manageComponents`, `asset.notSpecified`, `asset.componentManagerTitle`, and `common.back`. Keep current keys intact where they are already used elsewhere.

- [x] **Step 5: Run focused tests**

Run: `node --test tests/asset-detail-view.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-relationship-map-ui.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the Asset Detail navigation change**

```bash
git add src/app/[locale]/(dashboard)/assets/[id]/page.tsx src/components/assets/asset-detail-tabs.tsx src/components/assets/asset-detail-action-menu.tsx messages/th.json messages/en.json tests/asset-detail-view.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-relationship-map-ui.test.ts
git commit -m "feat: simplify asset detail navigation"
```

### Task 3: Create The Read-Only Components Summary And Remove Inline Editors

**Files:**
- Create: `src/components/assets/asset-components-summary.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx`
- Modify: `tests/asset-relationship-map-ui.test.ts`
- Modify: `tests/asset-detail-ux.test.ts`

**Interfaces:**
- Consumes: existing `parentComponents`, `installedInLinks`, component evidence counts, `canEditAssets`, and a Component Manager href.
- Produces: a compact, read-only custody summary and `จัดการส่วนควบ` navigation without initial candidate loading.

- [x] **Step 1: Write failing summary and regression tests**

```ts
test("asset detail exposes a read-only component summary and manager link", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  assert.match(source, /AssetComponentsSummary/)
  assert.match(source, /assets\/\$\{asset\.id\}\/components/)
  assert.doesNotMatch(source, /<AssetComponentsPanel/)
})

test("asset edit does not mount a second component installation editor", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx", "utf8")
  assert.doesNotMatch(source, /AssetComponentsPanel/)
  assert.doesNotMatch(source, /availableComponentAssets/)
})
```

- [x] **Step 2: Run the tests to verify failure**

Run: `node --test tests/asset-detail-ux.test.ts tests/asset-relationship-map-ui.test.ts`

Expected: FAIL because both pages still import and render `AssetComponentsPanel`.

- [x] **Step 3: Implement the read-only component summary**

Use `AssetComponentsSummary` in the custody tab. It must render parent context, installed count, a maximum of five current child rows, missing-serial warning count, and a `จัดการส่วนควบ` Link only when `canEditAssets` is true. Keep `AssetRelationshipMap` only when the asset has a parent or at least one installed child; otherwise render one compact standalone relationship state.

Remove `AssetComponentsPanel`, global installed-component id lookup, and `availableComponentAssets` from both the Asset Detail and Edit page queries. Keep current installed links and component history only where the selected detail tab or manager needs them.

- [x] **Step 4: Run focused tests**

Run: `node --test tests/asset-detail-ux.test.ts tests/asset-relationship-map-ui.test.ts tests/asset-return-navigation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the read-only summary**

```bash
git add src/components/assets/asset-components-summary.tsx src/app/[locale]/(dashboard)/assets/[id]/page.tsx src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx tests/asset-detail-ux.test.ts tests/asset-relationship-map-ui.test.ts
git commit -m "feat: move asset components out of detail editor"
```

### Task 4: Build The Permission-Aware Component Manager

**Files:**
- Create: `src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx`
- Create: `src/components/assets/asset-component-manager.tsx`
- Modify: `src/lib/asset-return-navigation.ts`
- Modify: `src/app/api/assets/component-candidates/route.ts`
- Create: `tests/asset-component-manager.test.ts`
- Modify: `tests/asset-return-navigation.test.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes: existing `POST /api/assets/[id]/components`, `DELETE /api/assets/[id]/components/[componentId]`, `GET /api/assets/component-candidates`, `ScannerTextInput`, `FileDropzone`, and `ConfirmTextDialog`.
- Produces: `AssetComponentManager` props `{ assetId, parentAsset, currentComponents, componentHistory, canEdit, returnToHref, labels }`.

- [ ] **Step 1: Write failing manager tests**

```ts
test("component manager accepts only safe returns to the current asset detail", () => {
  assert.equal(
    normalizeAssetComponentManagerReturnTo("th", "asset-1", "/th/assets/asset-1?view=custody"),
    "/th/assets/asset-1?view=custody",
  )
  assert.equal(
    normalizeAssetComponentManagerReturnTo("th", "asset-1", "https://example.com"),
    "/th/assets/asset-1?view=custody",
  )
})

test("component candidate route avoids a database lookup below two characters", () => {
  const route = readFileSync("src/app/api/assets/component-candidates/route.ts", "utf8")
  assert.match(route, /if \(search\.length < 2\) return NextResponse\.json\(\{ data: \[\] \}\)/)
})
```

Add source checks that the manager imports `ScannerTextInput`, keeps selected candidates in review state before POST, keeps `FileDropzone` inside the removal dialog flow, hides install/remove for `canEdit === false`, and uses the existing component endpoints.

- [ ] **Step 2: Run the tests to verify failure**

Run: `node --test tests/asset-component-manager.test.ts tests/asset-return-navigation.test.ts`

Expected: FAIL because the route, manager, and safe return helper do not exist.

- [ ] **Step 3: Implement safe navigation and bounded candidate lookup**

Add this strict helper to `asset-return-navigation.ts`:

```ts
export function normalizeAssetComponentManagerReturnTo(locale: string, assetId: string, value: ReturnToParam) {
  const fallback = `/${locale}/assets/${encodeURIComponent(assetId)}?view=custody`
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback
  try {
    const url = new URL(raw, "http://asset.local")
    const allowedPath = `/${locale}/assets/${encodeURIComponent(assetId)}`
    return url.origin === "http://asset.local" && url.pathname === allowedPath ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}
```

In the candidate route, return an empty result before Prisma when `search.length < 2`. Preserve existing auth, `asset:view`, active-only, currently-uninstalled, ordering, and `take: 20` restrictions.

- [ ] **Step 4: Implement the server page and client workspace**

The page calls `const user = await requirePagePermission(locale, "asset", "view")`, selects only the parent identity and bounded component records, calculates `const canEdit = hasPermission(user, "asset", "edit")`, normalizes `returnTo`, and passes the result to `AssetComponentManager`.

The client manager uses a state machine:

```ts
type InstallStep = "identify" | "details" | "review"
const [installStep, setInstallStep] = useState<InstallStep>("identify")
const canSearchCandidates = componentSearch.trim().length >= 2
```

Use `ScannerTextInput` with `scanMode="asset-qr"`; its `onScanSuccess` sets the full query and fetches candidates. Do not issue search requests while `canSearchCandidates` is false. Use a `datalist` for the non-enforcing roles `RAM`, `SSD`, `HDD`, `Power Supply`, `Network Card`, `Monitor`, `Adapter`, and `Other`. Only display the review surface after a candidate and role are present; the review submit uses the existing FormData names unchanged.

For removal, open a focus-managed dialog that renders the selected component, a reason textarea, and `FileDropzone` using `removeEvidence`; submit to the existing DELETE endpoint. Do not render one FileDropzone per list row.

- [ ] **Step 5: Run manager and navigation tests**

Run: `node --test tests/asset-component-manager.test.ts tests/asset-return-navigation.test.ts tests/asset-component-sync.test.ts tests/asset-component-sync-routes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the Component Manager**

```bash
git add src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx src/components/assets/asset-component-manager.tsx src/lib/asset-return-navigation.ts src/app/api/assets/component-candidates/route.ts messages/th.json messages/en.json tests/asset-component-manager.test.ts tests/asset-return-navigation.test.ts
git commit -m "feat: add asset component manager"
```

### Task 5: Defer Nonessential Reads And Verify The Full Workflow

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `src/components/assets/asset-component-manager.tsx`
- Modify: `tests/asset-detail-ux.test.ts`
- Modify: `tests/asset-component-manager.test.ts`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/99_CHANGELOG.md`

**Interfaces:**
- Consumes: tab visibility policy, manager route, existing evidence center, and existing component API routes.
- Produces: a bounded Asset Detail first render, updated field workflow documentation, and regression-tested UI behavior.

- [ ] **Step 1: Write failing performance/read-path source tests**

```ts
test("asset detail does not preload component candidate inventory", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  assert.doesNotMatch(source, /installedComponentAssetIds/)
  assert.doesNotMatch(source, /availableComponentAssets/)
  assert.doesNotMatch(source, /take: 300/)
})

test("asset detail bounds checkout and attachment previews", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  assert.match(source, /checkouts:[\s\S]*take: 10/)
  assert.match(source, /attachments:[\s\S]*take: 20/)
})
```

Add manager tests for keeping the parent tag visible in mobile review/removal surfaces and for three-or-fewer fixed mobile actions on Asset Detail.

- [ ] **Step 2: Run the tests to verify failure**

Run: `node --test tests/asset-detail-ux.test.ts tests/asset-component-manager.test.ts`

Expected: FAIL because Asset Detail still requests unbounded checkout/attachment previews.

- [ ] **Step 3: Bound reads and preserve full evidence access**

Change the Asset Detail initial include to `take: 10` for checkouts and `take: 20` for attachments. Keep the existing Evidence Center link available through the More menu for complete evidence access. Remove data queries that only support hidden tabs from a selected-tab render path; retain only the compact summary data required before tabs.

Update the docs with the exact workflow: open custody tab, select `จัดการส่วนควบ`, scan or search a component, review, confirm, return to the same asset custody tab. Record that view-only users can inspect relationships but cannot install or remove components.

- [ ] **Step 4: Run targeted, then full verification**

Run in order:

```bash
node --test tests/asset-detail-view.test.ts tests/asset-detail-ux.test.ts tests/asset-component-manager.test.ts tests/asset-relationship-map-ui.test.ts tests/asset-return-navigation.test.ts tests/asset-component-sync.test.ts tests/asset-component-sync-routes.test.ts
npm test
npm run lint
npm run build
npm run verify
```

Expected: every command exits with code `0`.

- [ ] **Step 5: Perform browser QA using a desktop and mobile viewport**

Verify at `390px` and desktop:

1. Asset identity appears before secondary actions.
2. Only one tab row is visible, and each tab hides unrelated sections.
3. Shared, stock, component, and personal examples show the correct responsibility fallback.
4. A view-only account has no edit, component install, or component removal control.
5. Component Manager scan/search, review, evidence, installation, removal, history, and return navigation work without a horizontal page scroll.

- [ ] **Step 6: Commit documentation and final verification**

```bash
git add src/app/[locale]/(dashboard)/assets/[id]/page.tsx src/components/assets/asset-component-manager.tsx tests/asset-detail-ux.test.ts tests/asset-component-manager.test.ts DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md
git commit -m "docs: record asset detail component workflow"
git push
```

## Plan Self-Review

- Spec coverage: Task 1 addresses tab section consistency; Task 2 covers one tab system, desktop/mobile action hierarchy, and permission-aware controls; Task 3 makes the detail relationship view read-only; Task 4 implements scan/search/review/install/remove/history and safe returns; Task 5 removes eager component candidate reads, bounds preview queries, documents the workflow, and verifies browser behavior.
- Placeholder scan: The plan contains concrete file paths, interfaces, test snippets, commands, and commit commands; it contains no deferred implementation markers.
- Type consistency: `AssetDetailView`, `isAssetDetailSectionVisible`, `normalizeAssetComponentManagerReturnTo`, `AssetComponentsSummary`, and `AssetComponentManager` use the same names throughout the task sequence.
