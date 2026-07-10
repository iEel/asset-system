# Modern Enterprise Adaptive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับ visual language ของระบบเป็น Navy + White + Electric Blue และทำให้ Asset Register กับ Audit Scan ใช้ Adaptive UI ที่เหมาะกับ Desktop Management และ Mobile Field Operation โดยไม่สร้าง workflow หรือ business logic ซ้ำ

**Architecture:** ใช้ semantic CSS variables ใน `globals.css` เป็น source of truth แล้วให้ shared helpers และ app shell อ้างอิง token เหล่านั้น หน้า Server Component ยังคงโหลดข้อมูลบน server ส่วน interaction ที่มีอยู่ใน Client Components ยังคงอยู่ใน boundary เดิม การปรับ Asset Register และ Audit Scan เป็นการจัด hierarchy, layout และ states ของข้อมูลเดิม ไม่เพิ่ม API, schema, audit status หรือ camera runtime ใหม่

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Tailwind CSS 4, next-intl, Lucide React, Node test runner, existing shared design-system helpers

## Global Constraints

- Theme identity: Navy `#0F172A`, White `#FFFFFF`, Electric Blue accent `#3B82F6`.
- Use accessible action blue `#2563EB` behind normal-size white button text; `#3B82F6` is for focus, icons, links, and accents because white on `#3B82F6` is only about `3.68:1`.
- Keep semantic colors unchanged: success `#16A34A`, warning `#F59E0B`, danger `#DC2626`, neutral `#64748B`.
- Same URL, API, RBAC, permission, SOD, validation, audit trail, and data model on Desktop and Mobile.
- Desktop is the management/review workspace; Mobile is the field-operation workspace.
- Do not add a new Audit Round, scan mode, zone model, offline queue, recent-scan store, or camera instance.
- Reuse existing Asset Register mobile cards, desktop table, Audit Scan sticky progress, pending queue, recent scans, offline queue, torch, zoom, evidence, and bottom action bar.
- Use `lucide-react`; do not add another icon library, emoji icons, or custom SVG icons when Lucide has an equivalent.
- Keep cards at 8-12px radius, use borders/tonal surfaces before shadows, and do not add gradients, glass effects, decorative blobs, or nested cards.
- Preserve Thai and English translations. User-facing copy must not be hardcoded in components.
- Mobile touch targets must remain at least 44px. Status must use text plus icon/shape and never color alone.
- Do not render a second camera/scanner subtree for a different breakpoint. The `audit-qr-reader` id must occur once.
- Do not add dependencies or change Prisma/API contracts for this UI rollout.
- Update `DEVELOPER_HANDOFF.md`, `docs/07_UAT_CHECKLIST.md`, and `docs/99_CHANGELOG.md` at the end of every completed implementation milestone.
- Read `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` and `11-css.md` before implementation; keep Server/Client boundaries as documented there.

---

## Existing Capabilities To Preserve

- `src/lib/design-system.ts` already supplies shared panels, actions, fields, desktop tables, mobile card lists, touch icon buttons, and bottom padding.
- `src/components/assets/asset-register-table.tsx` already renders mobile cards below `md` and a desktop table at `md` and above.
- `src/components/audit/audit-scan-form.tsx` already implements sticky progress, one-tap matched save, mismatch details, evidence, pending queue, recent scans, offline queue, target locking, torch, 1x/2x/3x zoom, and found-later/out-of-scope/unknown semantics.
- Existing static regression tests are intentional guardrails. Update them only when the accepted presentation contract changes; do not weaken workflow assertions.

## Milestone 0: Baseline And Scope Lock

### Task 0: Capture Current Behavior Before Styling

**Files:**
- Inspect: `PRODUCT.md`
- Inspect: `DESIGN.md`
- Inspect: `src/app/globals.css`
- Inspect: `src/lib/design-system.ts`
- Inspect: `src/components/layout/sidebar.tsx`
- Inspect: `src/components/layout/topbar.tsx`
- Inspect: `src/app/[locale]/(dashboard)/assets/page.tsx`
- Inspect: `src/components/assets/asset-register-table.tsx`
- Inspect: `src/components/audit/audit-scan-form.tsx`
- Create during implementation QA: `.impeccable/critique/modern-enterprise-baseline/` screenshots only if that directory is already ignored; otherwise keep screenshots outside Git.

**Interfaces:**
- Consumes: Existing authenticated routes and real UAT data.
- Produces: A baseline screenshot matrix and a written list of visual gaps; no application behavior changes.

- [ ] **Step 1: Confirm the tree does not contain overlapping application changes**

Run:

```powershell
git status --short
```

Expected: unrelated `.agents`, `.gemini`, `.codex`, `.impeccable`, or backup files may exist and must not be staged; application files in this plan must be reviewed before editing if already modified.

- [ ] **Step 2: Start the existing development server without replacing an occupied port**

Run:

```powershell
npm run dev
```

Expected: Next.js starts and prints a local URL. If the configured port is occupied, use the repository's existing port override mechanism rather than killing the other process.

- [ ] **Step 3: Capture authenticated baseline screenshots**

Capture these routes at `375`, `390`, `414`, `768`, `1280`, and `1440` pixels:

```text
/th/assets
/th/audit/rounds/{activeRoundId}/scan
/th/dashboard
```

Capture shell states: sidebar expanded, sidebar collapsed, mobile drawer open, active nested menu, topbar popovers closed.

Expected: screenshots show the current layout before theme changes and identify actual gaps rather than assumptions from the old brief.

- [ ] **Step 4: Record baseline browser assertions**

Run in each mobile route:

```js
({
  noBodyOverflow: document.documentElement.scrollWidth <= window.innerWidth,
  scannerCount: document.querySelectorAll("#audit-qr-reader").length,
  viewport: [window.innerWidth, window.innerHeight],
})
```

Expected: `noBodyOverflow` is `true`; Audit Scan has `scannerCount: 1`; Asset Register has `scannerCount: 0`.

- [ ] **Step 5: Commit no code for this task**

This is a baseline/review gate. Proceed only when the screenshots and gap list agree with the requirements below.

---

## Milestone 1: Theme Tokens And Application Shell

### Task 1: Define Accessible Modern Enterprise Tokens

**Files:**
- Create: `tests/modern-enterprise-theme.test.ts`
- Modify: `src/app/globals.css`
- Modify: `DESIGN.md`
- Test: `tests/modern-enterprise-theme.test.ts`
- Test: `tests/design-system.test.ts`

**Interfaces:**
- Consumes: Existing Tailwind 4 `@theme inline` mapping and semantic class names such as `bg-primary` and `text-muted-foreground`.
- Produces: Stable tokens `brand-navy`, `brand-accent`, `sidebar-foreground`, `sidebar-muted`, `sidebar-hover`, and `sidebar-active`; `primary` changes to accessible action blue.

- [ ] **Step 1: Write the failing token and contrast test**

Create `tests/modern-enterprise-theme.test.ts` with:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const css = () => readFileSync("src/app/globals.css", "utf8")

function channel(value: number) {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const value = hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map((index) => channel(Number.parseInt(value.slice(index, index + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

test("modern enterprise tokens keep brand, action, and navigation roles separate", () => {
  const source = css()
  assert.match(source, /--brand-navy:\s*#0F172A;/)
  assert.match(source, /--brand-accent:\s*#3B82F6;/)
  assert.match(source, /--primary:\s*#2563EB;/)
  assert.match(source, /--sidebar:\s*#0F172A;/)
  assert.match(source, /--sidebar-foreground:\s*#CBD5E1;/)
  assert.match(source, /--sidebar-active:\s*#1E3A8A;/)
})

test("normal white action text meets WCAG AA contrast", () => {
  assert.ok(contrast("#FFFFFF", "#2563EB") >= 4.5)
  assert.ok(contrast("#FFFFFF", "#0F172A") >= 4.5)
  assert.ok(contrast("#FFFFFF", "#3B82F6") < 4.5, "electric blue must remain an accent, not the normal white-text button fill")
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests/modern-enterprise-theme.test.ts
```

Expected: FAIL because the new brand/navigation tokens and accessible action-blue mapping do not exist yet.

- [ ] **Step 3: Add semantic tokens and Tailwind mappings**

Update the `:root` and `@theme inline` sections in `src/app/globals.css` to include:

```css
:root {
  --brand-navy: #0F172A;
  --brand-accent: #3B82F6;
  --background: #F8FAFC;
  --foreground: #0F172A;
  --surface: #FFFFFF;
  --primary: #2563EB;
  --primary-foreground: #FFFFFF;
  --ring: #3B82F6;
  --sidebar: #0F172A;
  --sidebar-foreground: #CBD5E1;
  --sidebar-muted: #94A3B8;
  --sidebar-hover: #1E293B;
  --sidebar-active: #1E3A8A;
}

@theme inline {
  --color-brand-navy: var(--brand-navy);
  --color-brand-accent: var(--brand-accent);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-muted: var(--sidebar-muted);
  --color-sidebar-hover: var(--sidebar-hover);
  --color-sidebar-active: var(--sidebar-active);
}
```

Keep the existing background, surface, border, text, and semantic status variables. Do not replace success/warning/danger/info with blue variants.

- [ ] **Step 4: Align the committed design documentation**

Update `DESIGN.md` so the color registry and navigation section state:

```text
Brand Navy #0F172A anchors the desktop sidebar and identity.
Action Blue #2563EB is the accessible fill for normal white-text primary actions.
Electric Blue #3B82F6 is the accent for focus, icons, links, and selected emphasis.
The topbar and working canvas remain light to preserve operational readability.
```

Remove the conflicting statement that the sidebar is white. Keep the existing rules against gradients, decorative cards, status-by-color-only, and workflow redesign.

- [ ] **Step 5: Run targeted tests**

Run:

```powershell
node --test tests/modern-enterprise-theme.test.ts tests/design-system.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the token contract**

```powershell
git add src/app/globals.css DESIGN.md tests/modern-enterprise-theme.test.ts
git commit -m "Define modern enterprise theme tokens"
```

Expected: commit contains only tokens, design documentation, and token tests.

### Task 2: Refresh Sidebar And Topbar Without Changing Navigation

**Files:**
- Create: `tests/dashboard-shell-theme.test.ts`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/topbar.tsx`
- Modify if required: `src/components/layout/dashboard-shell.tsx`
- Test: `tests/dashboard-shell-theme.test.ts`
- Test: `tests/dashboard-layout-scroll.test.ts`

**Interfaces:**
- Consumes: Theme tokens from Task 1 and the existing permission-filtered menu tree.
- Produces: Dark Navy desktop/mobile drawer, accessible active navigation, light topbar, unchanged hrefs and RBAC filtering.

- [ ] **Step 1: Write the failing shell appearance test**

Create `tests/dashboard-shell-theme.test.ts` with:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const sidebar = () => readFileSync("src/components/layout/sidebar.tsx", "utf8")
const topbar = () => readFileSync("src/components/layout/topbar.tsx", "utf8")

test("sidebar uses the committed dark navigation tokens", () => {
  const source = sidebar()
  assert.match(source, /bg-sidebar/)
  assert.match(source, /text-sidebar-foreground/)
  assert.match(source, /bg-sidebar-active/)
  assert.match(source, /hover:bg-sidebar-hover/)
  assert.doesNotMatch(source, /border-r-2 border-primary/)
})

test("topbar stays a light operational surface", () => {
  const source = topbar()
  assert.match(source, /bg-surface/)
  assert.match(source, /border-border/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests/dashboard-shell-theme.test.ts
```

Expected: FAIL because the existing sidebar still uses light-surface text and a primary right border.

- [ ] **Step 3: Apply the dark navigation vocabulary**

In `sidebar.tsx`:

- Set the aside text to `text-sidebar-foreground`.
- Use `border-white/10` for the shell/logo/group dividers.
- Use `hover:bg-sidebar-hover hover:text-white` for inactive items.
- Use `bg-sidebar-active font-medium text-white` for the active item.
- Use `text-brand-accent` for active parent/icons only where contrast is sufficient.
- Keep all existing menu labels, icons, nesting, hrefs, collapse behavior, mobile close behavior, and permission filtering.
- Remove the colored right-side stripe; active state is communicated by full-row background, text, and icon.

In `topbar.tsx`:

- Keep `bg-surface`, `border-border`, foreground text, and existing responsive controls.
- Use `focus-visible:ring-brand-accent` for focus emphasis where the current `ring-primary` would make the shell feel too heavy.
- Do not make the topbar Navy; the content workspace must remain light.

- [ ] **Step 4: Verify navigation behavior**

Run:

```powershell
node --test tests/dashboard-shell-theme.test.ts tests/dashboard-layout-scroll.test.ts
npx eslint src/components/layout/sidebar.tsx src/components/layout/topbar.tsx src/components/layout/dashboard-shell.tsx tests/dashboard-shell-theme.test.ts
```

Expected: tests and lint pass. Sidebar collapse, nested menus, RBAC visibility, mobile overlay, language, notifications, and user menu still work.

- [ ] **Step 5: Perform shell visual QA**

At `375`, `768`, `1280`, and `1440` pixels verify:

- Active menu is readable without relying on a side stripe.
- Long Thai menu labels truncate rather than overlap.
- Mobile drawer occupies at most 85vw and can scroll vertically.
- Topbar controls do not overlap.
- Focus rings are visible on Navy and White surfaces.
- Navy occupies navigation only; content remains predominantly White/Light Slate.

- [ ] **Step 6: Update milestone documentation**

Add a short entry to `DEVELOPER_HANDOFF.md`, `docs/07_UAT_CHECKLIST.md`, and `docs/99_CHANGELOG.md` describing the token roles, accessible action blue, dark navigation, light topbar, and shell viewport checks.

- [ ] **Step 7: Commit the shell milestone**

```powershell
git add src/components/layout/sidebar.tsx src/components/layout/topbar.tsx src/components/layout/dashboard-shell.tsx tests/dashboard-shell-theme.test.ts tests/dashboard-layout-scroll.test.ts DEVELOPER_HANDOFF.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md
git commit -m "Refresh enterprise navigation shell"
```

Expected: Milestone 1 can be released or rolled back independently.

---

## Milestone 2: Adaptive Asset Register

### Task 3: Refine Asset Register Hierarchy Instead Of Rebuilding It

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx`
- Modify: `src/components/assets/asset-register-table.tsx`
- Modify if useful: `src/lib/design-system.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/asset-register-ux.test.ts`
- Test: `tests/design-system.test.ts`

**Interfaces:**
- Consumes: Existing `AssetRegisterRow`, URL-backed filters, mobile cards, desktop table, column presets, return navigation, bulk selection, and permissions.
- Produces: Desktop operational workspace and mobile field-lookup card hierarchy using the same data and query state.

- [ ] **Step 1: Extend the Asset Register regression test before changing markup**

Add these assertions to `tests/asset-register-ux.test.ts`:

```ts
test("asset register keeps adaptive desktop and mobile responsibilities explicit", () => {
  const source = registerTableSource()
  assert.match(source, /data-asset-mobile-list/)
  assert.match(source, /data-asset-mobile-card/)
  assert.match(source, /data-asset-desktop-table/)
  assert.match(source, /getMobileCardListClasses\(\)/)
  assert.match(source, /getDesktopTableOnlyClasses\(\)/)
})

test("mobile asset cards prioritize field lookup context", () => {
  const source = registerTableSource()
  const start = source.indexOf('data-asset-mobile-card')
  const end = source.indexOf('</article>', start)
  assert.ok(start > -1 && end > start)
  const card = source.slice(start, end)
  assert.match(card, /asset\.assetTag/)
  assert.match(card, /asset\.name/)
  assert.match(card, /asset\.status/)
  assert.match(card, /asset\.currentLocation/)
  assert.match(card, /asset\.custodian/)
})
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run:

```powershell
node --test tests/asset-register-ux.test.ts
```

Expected: FAIL because the adaptive data hooks are not yet present.

- [ ] **Step 3: Preserve the Desktop management workspace**

In `assets/page.tsx` and the desktop section of `asset-register-table.tsx`:

- Keep search/company/branch/category as primary filters.
- Keep advanced filters collapsed unless active.
- Keep grouped quick filters, active-filter summary, column presets, bulk actions, sticky Asset Tag/name/actions, pagination, import position, and export behavior.
- Use the new theme tokens through semantic classes; do not place raw hex values in page/components.
- Do not add a new KPI card row in this milestone. Existing quick filters are more actionable than decorative totals.
- Add `data-asset-desktop-table` to the desktop table wrapper for regression and browser inspection.

- [ ] **Step 4: Reorder the existing Mobile card for field lookup**

Keep one mobile card implementation below `md` and add `data-asset-mobile-list` and `data-asset-mobile-card`. Use this order:

```text
Asset Tag + semantic status
Asset name
Serial/category as quiet metadata
Current location
Custodian
Condition/ownership warnings only when they help field action
Detail and permitted edit actions
```

Move company/branch and purchase price out of the default mobile card body; they remain available in Asset Detail and Desktop table presets. Preserve selection and existing actions, but avoid showing clone/delete as equal-weight primary actions on every mobile card. If retained, place secondary/destructive actions in the existing expandable/secondary action area without adding a new modal.

- [ ] **Step 5: Keep mobile controls field-oriented**

- Search remains the first control.
- Quick-filter groups remain horizontally contained without body overflow.
- Filter details remain inline/collapsible; do not add a new filter library or client-side duplicate query state.
- Scan, add, and filter actions use Lucide icons and translated labels.
- Card links retain `returnTo` context.

- [ ] **Step 6: Run Asset Register tests and lint**

Run:

```powershell
node --test tests/asset-register-ux.test.ts tests/asset-list-query.test.ts tests/asset-return-navigation.test.ts tests/design-system.test.ts
npx eslint "src/app/[locale]/(dashboard)/assets/page.tsx" src/components/assets/asset-register-table.tsx src/lib/design-system.ts tests/asset-register-ux.test.ts
```

Expected: PASS. Filtering, sorting, pagination, presets, bulk selection, export, and return navigation remain unchanged.

- [ ] **Step 7: Perform Asset Register visual QA**

At `375`, `390`, `414`, `768`, `1280`, and `1440` pixels verify:

- Mobile shows cards only; Desktop shows the table only.
- No body-level horizontal overflow.
- Long Asset Tags, serials, Thai names, custodian names, and locations do not overlap.
- Card status is readable without color alone.
- Desktop table remains dense enough for comparison.
- Empty, filtered-empty, loading/navigation, and permission-limited states use the same visual vocabulary.

- [ ] **Step 8: Update milestone documentation and commit**

Update `DEVELOPER_HANDOFF.md`, `docs/07_UAT_CHECKLIST.md`, and `docs/99_CHANGELOG.md`, then run:

```powershell
git add "src/app/[locale]/(dashboard)/assets/page.tsx" src/components/assets/asset-register-table.tsx src/lib/design-system.ts messages/th.json messages/en.json tests/asset-register-ux.test.ts tests/design-system.test.ts DEVELOPER_HANDOFF.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md
git commit -m "Refine adaptive asset register"
```

Expected: Milestone 2 is independently testable and does not depend on Audit Scan changes.

---

## Milestone 3: Mobile Audit Scan Visual Consolidation

### Task 4: Clarify The Existing Field Workflow Without Adding Another Mode

**Files:**
- Modify: `src/components/audit/audit-scan-form.tsx`
- Modify if required: `src/components/ui/mobile-action-bar.tsx`
- Modify if required: `src/lib/design-system.ts`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Test: `tests/audit-scan-field-mode-ux.test.ts`
- Test: `tests/audit-scan-offline-ux.test.ts`
- Test: `tests/audit-mobile-flow-completion.test.ts`
- Test: `tests/audit-pending-mobile-ux.test.ts`
- Test: `tests/audit-scan-result-semantics.test.ts`

**Interfaces:**
- Consumes: Existing `AuditScanForm` state, `startNativeAssetQrScanner`, scan lookup API, current round items, recent scans, offline queue, evidence queue, pending queue, and correction flow.
- Produces: A clearer scanner-first mobile hierarchy and management-oriented desktop layout with exactly the same submit payloads and workflow states.

- [ ] **Step 1: Add regression assertions for one scanner and adaptive hierarchy**

Append to `tests/audit-scan-field-mode-ux.test.ts`:

```ts
test("audit scan keeps one camera instance and explicit adaptive regions", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  assert.equal((form.match(/id="audit-qr-reader"/g) ?? []).length, 1)
  assert.match(form, /data-audit-scan-primary/)
  assert.match(form, /data-audit-scan-supporting/)
  assert.match(form, /data-audit-mobile-actions/)
})

test("successful scan decisions do not expose not-found as a post-scan action", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const start = form.indexOf('data-audit-mobile-actions')
  const end = form.indexOf('</div>', start)
  assert.ok(start > -1 && end > start)
  const actions = form.slice(start, end)
  assert.doesNotMatch(actions, /markNotFound|notFound/)
})
```

- [ ] **Step 2: Run tests to verify the new structural assertions fail**

Run:

```powershell
node --test tests/audit-scan-field-mode-ux.test.ts tests/audit-scan-result-semantics.test.ts
```

Expected: FAIL only for the new data-region assertions; existing workflow tests remain green.

- [ ] **Step 3: Establish the mobile field hierarchy**

Within the existing `AuditScanForm` tree, add semantic data hooks and preserve one camera subtree:

```text
Sticky round progress
Primary region: camera/manual input -> locked target/result -> system data -> decision
Supporting region: evidence when required -> component context -> recent scans -> pending preview -> offline details
Fixed mobile actions only after a target exists
```

Use `data-audit-scan-primary`, `data-audit-scan-supporting`, and `data-audit-mobile-actions`. Do not introduce a new `fastMode`, `walkMode`, `zoneSession`, or duplicate `AuditScanMobile` component.

- [ ] **Step 4: Keep camera controls inside the preview**

- Keep rear camera preference, target frame, torch, 1x/2x/3x zoom, camera switch, and stop controls in or immediately adjacent to the camera preview.
- Unsupported controls remain hidden.
- Keep `stopAfterSuccess: true` and the locked-target behavior.
- Do not change decoder, camera constraints, lookup rules, scan payloads, or offline storage in this visual milestone.

- [ ] **Step 5: Preserve exact decision semantics**

After an in-round QR succeeds, mobile primary actions remain:

```text
บันทึกพบตรง
บันทึกข้อมูลไม่ตรง / Finding
เปลี่ยน / สแกนใหม่
```

Do not add `ไม่พบ` here. Not-found stays in Pending List/Zone Queue. Keep out-of-scope, unknown asset, found-later, correction, component confirmation, and component missing behavior unchanged.

- [ ] **Step 6: Make the bottom bar safe for real phones**

Update the shared bottom padding/action bar only if the current implementation does not account for `env(safe-area-inset-bottom)`. The final contract must provide:

```css
padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
```

and page content must reserve the action-bar height plus safe area. Keyboard opening must not permanently cover the scan/manual input; scrolling to input remains supported.

- [ ] **Step 7: Keep Desktop as a review workspace**

At `md` and above, use available width for primary scan/decision content and supporting pending/recent/offline context. Do not render separate copies of stateful sections merely to place them in another column; use CSS grid placement on the same nodes.

- [ ] **Step 8: Run the complete Audit Scan regression set**

Run:

```powershell
node --test tests/audit-scan-field-mode-ux.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-mobile-flow-completion.test.ts tests/audit-pending-mobile-ux.test.ts tests/audit-scan-result-semantics.test.ts tests/audit-scan-readable-result.test.ts tests/audit-component-scan-ui.test.ts
npx eslint src/components/audit/audit-scan-form.tsx src/components/ui/mobile-action-bar.tsx src/lib/design-system.ts tests/audit-scan-field-mode-ux.test.ts
```

Expected: PASS. No changes to API, SOD, evidence requirement, component workflow, offline payload, recent-scan edit, target lock, or result semantics.

- [ ] **Step 9: Perform real-device Audit Scan UAT**

On Android Chrome and iPhone Safari where available:

- Open an active round and scan at least 30 assets continuously.
- Test 1x/2x/3x and returning to 1x without closing camera.
- Test torch in low light.
- Test long Thai asset/location/custodian values.
- Test matched, mismatch with required evidence, out-of-scope, unknown, duplicate/recent edit, found-later, and component confirmation.
- Go offline for five scans, attach at least one photo, reconnect, and retry.
- Open/close the keyboard and rotate the phone.
- Verify no action bar overlaps fields, toasts, dialogs, or the browser safe area.
- Confirm exactly one camera stream is active.

- [ ] **Step 10: Update milestone documentation and commit**

Update `DEVELOPER_HANDOFF.md`, `docs/06_WORKFLOWS.md`, `docs/07_UAT_CHECKLIST.md`, and `docs/99_CHANGELOG.md`, then run:

```powershell
git add src/components/audit/audit-scan-form.tsx src/components/ui/mobile-action-bar.tsx src/lib/design-system.ts messages/th.json messages/en.json tests/audit-scan-field-mode-ux.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-mobile-flow-completion.test.ts tests/audit-pending-mobile-ux.test.ts tests/audit-scan-result-semantics.test.ts DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md
git commit -m "Polish adaptive audit scan workspace"
```

Expected: Milestone 3 is visual/interaction consolidation only; audit business logic remains unchanged.

---

## Milestone 4: Cross-Surface Quality Gate

### Task 5: Accessibility, Visual Regression, Documentation, And Release Gate

**Files:**
- Modify only if defects are found: files changed in Tasks 1-4
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/99_CHANGELOG.md`
- Test: all targeted tests from Tasks 1-4

**Interfaces:**
- Consumes: Completed theme, shell, Asset Register, and Audit Scan milestones.
- Produces: Verified release candidate and documented manual-device gaps.

- [ ] **Step 1: Scan changed UI files for raw palette drift**

Run:

```powershell
rg -n "#0F172A|#3B82F6|#2563EB|#16A34A|#F59E0B|#DC2626" src --glob "*.tsx" --glob "*.ts"
```

Expected: no component contains these raw palette values; application components use semantic Tailwind token classes. Raw values belong in `globals.css`, tests, and design documentation only.

- [ ] **Step 2: Run focused tests**

```powershell
node --test tests/modern-enterprise-theme.test.ts tests/dashboard-shell-theme.test.ts tests/design-system.test.ts tests/dashboard-layout-scroll.test.ts tests/asset-register-ux.test.ts tests/asset-list-query.test.ts tests/asset-return-navigation.test.ts tests/audit-scan-field-mode-ux.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-mobile-flow-completion.test.ts tests/audit-pending-mobile-ux.test.ts tests/audit-scan-result-semantics.test.ts tests/audit-scan-readable-result.test.ts tests/audit-component-scan-ui.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 3: Run full repository verification**

```powershell
npm run lint
npm test
npm run build
npm run verify
git diff --check
```

Expected: every command exits `0`; build uses the repository's Next.js 16 and Prisma generation path.

- [ ] **Step 4: Capture after screenshots using the baseline matrix**

Repeat the Milestone 0 screenshots and compare:

- Sidebar hierarchy, active/hover/focus/disabled states.
- Asset Register mobile cards and desktop table density.
- Audit Scan before target, camera active, target locked, mismatch details, evidence queued, offline queue, and recent scan expanded/collapsed.
- Thai and English routes.
- Empty, error, loading, permission-denied, and destructive confirmation states.

Expected: no overlap, no blank camera region, no body overflow, no text clipping, and no status communicated by color alone.

- [ ] **Step 5: Record implementation results and remaining manual gaps**

In the handoff/changelog, record:

- The final token values and color-role rationale.
- Routes and viewport sizes tested.
- Real devices/browsers tested.
- Camera, offline, keyboard, safe-area, and evidence outcomes.
- Any browser/device limitations still open.
- Confirmation that API, schema, RBAC, SOD, audit workflow, and print behavior were not changed.

- [ ] **Step 6: Commit the release-quality pass**

```powershell
git diff --name-only
git add DEVELOPER_HANDOFF.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md
git add DESIGN.md src/app/globals.css src/lib/design-system.ts
git add src/components/layout/sidebar.tsx src/components/layout/topbar.tsx src/components/layout/dashboard-shell.tsx
git add "src/app/[locale]/(dashboard)/assets/page.tsx" src/components/assets/asset-register-table.tsx
git add src/components/audit/audit-scan-form.tsx src/components/ui/mobile-action-bar.tsx
git add messages/th.json messages/en.json
git add tests/modern-enterprise-theme.test.ts tests/dashboard-shell-theme.test.ts tests/design-system.test.ts tests/dashboard-layout-scroll.test.ts tests/asset-register-ux.test.ts tests/audit-scan-field-mode-ux.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-mobile-flow-completion.test.ts tests/audit-pending-mobile-ux.test.ts tests/audit-scan-result-semantics.test.ts
git commit -m "Complete adaptive UI quality gate"
```

Expected: compare `git diff --name-only` with the explicit staging list first, omit unchanged paths, and never stage unrelated skill/cache/backup files.

## Final Acceptance Criteria

- Desktop and Mobile share URL, data, API, RBAC, validation, and workflow logic.
- Desktop provides dense management/review layouts; Mobile provides field-oriented hierarchy and touch controls.
- Navigation uses Navy while the working canvas remains White/Light Slate.
- White text on action fills meets WCAG AA; Electric Blue remains accent/focus rather than the normal white-text button fill.
- Asset Register uses one desktop table and one existing mobile card list without duplicating query state.
- Audit Scan has one camera instance and retains all existing scan/offline/evidence/component behavior.
- `ไม่พบ` is not a post-success scan action; it remains in Pending List/Zone Queue.
- No audited route has body-level horizontal overflow at `375px`.
- All normal mobile touch controls are at least 44px.
- Thai and English text fit without overlap at every target viewport.
- Lucide remains the only general UI icon system.
- Full lint, test, build, verify, and `git diff --check` pass.
- Handoff, workflow/UAT documentation, and changelog are updated after every completed milestone.

## Recommended Execution Order

1. Milestone 0 baseline and scope lock.
2. Milestone 1 token contract, then shell.
3. Review/approve screenshots before changing page surfaces.
4. Milestone 2 Asset Register.
5. Review/approve Desktop and Mobile Asset Register screenshots.
6. Milestone 3 Audit Scan.
7. Complete real-device Audit UAT before calling the mobile experience finished.
8. Milestone 4 full quality gate and documentation.

## Execution Checkpoints

- After Task 2: approve the global shell before it propagates to every route.
- After Task 3: approve Asset Register hierarchy before using it as the mobile-list pattern elsewhere.
- After Task 4: approve real-device Audit Scan behavior before extending Adaptive UI to checkout/checkin/transfer.
- Do not include Asset Detail redesign in this implementation. Plan it after these three foundations are proven, using the accepted shell and mobile hierarchy as constraints.
