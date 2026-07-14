# UI/UX Documentation Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `DESIGN.md` the canonical UI/UX source of truth and add a developer-facing operational index without duplicating design tokens or route history.

**Architecture:** Keep design policy, implementation navigation, focused decisions, and delivery history in separate documents with explicit precedence. `DESIGN.md` owns the design system; `docs/14_UI_UX_DESIGN_SYSTEM.md` maps those rules to Desktop and Mobile surfaces and links to existing focused specifications and plans.

**Tech Stack:** Markdown documentation, Git, PowerShell link/content checks

## Global Constraints

- Business workflow, RBAC, SOD, lifecycle, and security requirements always outrank visual policy.
- `DESIGN.md` is canonical for current visual identity, tokens, component vocabulary, accessibility, and Adaptive UI policy.
- Do not duplicate full token tables in `docs/14_UI_UX_DESIGN_SYSTEM.md`.
- Desktop and Mobile may differ in hierarchy and interaction but must reuse the same URL, API, workflow records, permission checks, validation, audit trail, and data model.
- Global Mobile Field Navigation and a page-owned contextual bottom action bar must never render together.
- This plan changes documentation only; it does not modify UI code, CSS, APIs, schema, RBAC, or business logic.
- Preserve all existing focused specifications, plans, Handoff history, and changelog entries.
- Stage and commit only the files named by each task; unrelated dirty Impeccable files remain untouched.

---

### Task 1: Establish Canonical Document Ownership

**Files:**
- Modify: `DESIGN.md`
- Modify: `Enterprise Web UI UX Requirements.md`

**Interfaces:**
- Consumes: The approved precedence model in `docs/superpowers/specs/2026-07-14-ui-ux-documentation-governance-design.md`.
- Produces: A canonical ownership statement that the operational index and onboarding documents can reference.

- [ ] **Step 1: Add document governance to `DESIGN.md`**

Insert a `## 7. Documentation Governance and Adaptive UI Contract` section after the existing Do's and Don'ts. Include these exact responsibilities:

```markdown
## 7. Documentation Governance and Adaptive UI Contract

`DESIGN.md` is the canonical source for visual identity, design tokens, component vocabulary, accessibility principles, and Adaptive UI policy. It is not a feature changelog.

Business workflow, RBAC, SOD, lifecycle, and security requirements always take precedence over visual guidance. Runtime components and CSS are the implemented behavior; drift between runtime and this document must be reviewed and reconciled explicitly.

### Adaptive UI Contract

- Desktop is the management and review workspace for comparison, bulk work, reports, administration, and approvals.
- Mobile is the field-operation workspace for scanning, evidence capture, quick lookup, custody actions, and walking audits.
- Desktop and Mobile may present different hierarchy and controls while reusing the same URL, API, workflow records, permissions, validation, audit trail, and data model.
- Global Mobile Field Navigation and a page-owned contextual action bar must never render together.
- Focus-task routes such as scanner, edit, and transaction flows hide global field navigation while their contextual action surface is active.
- Mobile controls remain at least 44px, respect safe-area insets, avoid body-level horizontal overflow, and do not depend on hover.

### Supporting Documents

- `docs/14_UI_UX_DESIGN_SYSTEM.md` is the developer-facing operational index.
- Focused decisions live in `docs/superpowers/specs/`.
- Implementation sequencing and verification live in `docs/superpowers/plans/`.
- Current implementation status and manual QA live in `DEVELOPER_HANDOFF.md`.
- Historical delivery notes live in `docs/99_CHANGELOG.md`.
```

- [ ] **Step 2: Mark the original requirements as a baseline**

Add this note immediately below the title in `Enterprise Web UI UX Requirements.md`:

```markdown
> Historical baseline: this document preserves the original enterprise UI/UX requirements. Use `DESIGN.md` as the current source of truth for design tokens, component vocabulary, accessibility, and Adaptive UI policy. Business workflow, RBAC, SOD, lifecycle, and security requirements continue to take precedence over visual guidance.
```

- [ ] **Step 3: Verify the ownership language**

Run:

```powershell
rg -n "canonical source|Adaptive UI Contract|Historical baseline|Business workflow" DESIGN.md "Enterprise Web UI UX Requirements.md"
git diff --check -- DESIGN.md "Enterprise Web UI UX Requirements.md"
```

Expected: both documents contain the ownership language and `git diff --check` prints no errors.

- [ ] **Step 4: Commit the ownership decision**

```powershell
git add -- DESIGN.md "Enterprise Web UI UX Requirements.md"
git commit -m "docs(ui): establish canonical design ownership"
```

Expected: the commit contains only the two named files.

---

### Task 2: Create the Developer-Facing UI/UX Index

**Files:**
- Create: `docs/14_UI_UX_DESIGN_SYSTEM.md`

**Interfaces:**
- Consumes: Canonical policy from `DESIGN.md` and existing focused documents under `docs/superpowers/`.
- Produces: One discoverable operational index for developers and reviewers.

- [ ] **Step 1: Create the document header and precedence section**

Start the document with:

```markdown
# UI/UX Design System and Adaptive Interface Guide

This is the developer-facing index for applying the Asset Management System design across Desktop and Mobile. It links to canonical policy and focused route decisions without duplicating their full contents.

## Source of Truth

1. Business workflow, RBAC, SOD, lifecycle, and security requirements.
2. `DESIGN.md` for current visual and Adaptive UI policy.
3. The latest approved focused specification for a route or workflow.
4. This document for implementation navigation and shared behavior.
5. Older implementation plans, Handoff history, and the original enterprise UI/UX baseline.
```

- [ ] **Step 2: Add the Desktop/Mobile behavior matrix**

Add a table covering these rows:

| Concern | Desktop Management / Review | Mobile Field Operation |
|---|---|---|
| Navigation | Navy sidebar and light topbar | Field navigation on navigation routes; hidden in focus-task routes |
| Asset Register | Dense table, presets, columns, bulk actions | Search-first cards, compact filters, touch-safe row actions |
| Asset Detail | Comparison, history, documents, review actions | Compact identity, collapsible sections, contextual quick actions |
| Audit | Round setup, pending review, findings, close readiness | Scanner-first counting, evidence, pending queue, recent scans |
| Maintenance and Disposal | Queue management, approvals, bulk processing | Cards, explicit selection mode, focused dialogs |
| Reports | Dense filters, preview, export | Summary-first filters and contained tables |

State below the table that all presentations reuse the same business records and permission checks.

- [ ] **Step 3: Add navigation and action-surface rules**

Document:

- Navigation routes show Mobile Field Navigation.
- Scanner, edit, transaction, and detail routes with page-owned bottom actions enter Focus Task Mode.
- Only one fixed bottom action region may exist at a time.
- Content reserves safe-area-aware bottom space only for the active bar.
- `Mark Not Found` belongs to the Audit Pending queue, not a successful scan result.
- Manual Asset Tag/Serial entry remains available beside QR scanning.

- [ ] **Step 4: Add route-pattern references**

Link these existing documents with one-sentence ownership descriptions:

- `docs/superpowers/plans/2026-07-10-modern-enterprise-adaptive-ui.md`
- `docs/superpowers/specs/2026-07-10-mobile-field-navigation-design.md`
- `docs/superpowers/plans/2026-07-10-mobile-field-navigation.md`
- `docs/superpowers/plans/2026-07-10-desktop-asset-register-workspace.md`
- `docs/superpowers/plans/2026-07-10-asset-detail-components-ux-implementation.md`
- `docs/superpowers/plans/2026-07-11-asset-detail-ux-polish.md`
- `docs/superpowers/specs/2026-07-11-login-ux-design.md`
- `docs/superpowers/specs/2026-07-13-disposal-production-readiness-design.md`
- `docs/superpowers/specs/2026-07-14-maintenance-production-hardening-design.md`
- `docs/superpowers/plans/2026-07-10-module-ux-roadmap.md`
- `docs/superpowers/specs/2026-07-10-ui-ux-hardening-design.md`

- [ ] **Step 5: Add the QA checklist**

Include checks for:

- 375px, 390px, 414px, 768px, and desktop viewports.
- No body-level horizontal overflow.
- Exactly one bottom navigation/action region.
- 44px mobile touch targets and safe-area padding.
- Keyboard focus, Escape behavior, focus restoration, and accessible names.
- Thai/English copy parity and long Thai text wrapping.
- Status represented by text plus semantic color/icon/shape.
- Loading, empty, error, denied, offline, and partial-failure states.
- Real Android/iPhone camera, torch/zoom, rotation, offline queue, evidence upload, and Brother print-dialog UAT where applicable.

- [ ] **Step 6: Verify every linked path exists**

Run:

```powershell
$paths = Select-String -LiteralPath "docs/14_UI_UX_DESIGN_SYSTEM.md" -Pattern '`([^`]+\.md)`' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$missing = $paths | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing) { $missing; exit 1 } else { "All linked Markdown paths exist" }
git diff --check -- docs/14_UI_UX_DESIGN_SYSTEM.md
```

Expected: `All linked Markdown paths exist` and no diff errors.

- [ ] **Step 7: Commit the operational index**

```powershell
git add -- docs/14_UI_UX_DESIGN_SYSTEM.md
git commit -m "docs(ui): add adaptive design system index"
```

Expected: the commit creates only `docs/14_UI_UX_DESIGN_SYSTEM.md`.

---

### Task 3: Connect Onboarding and Handoff

**Files:**
- Modify: `README.md`
- Modify: `DEVELOPER_HANDOFF.md`

**Interfaces:**
- Consumes: `DESIGN.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md` from Tasks 1 and 2.
- Produces: Discoverable entry points for new developers and maintainers.

- [ ] **Step 1: Update the README Quick Links**

Add these rows after `AGENTS.md`:

```markdown
| `DESIGN.md` | Canonical design tokens, component vocabulary, accessibility, and Adaptive UI policy |
| `docs/14_UI_UX_DESIGN_SYSTEM.md` | Developer-facing Desktop/Mobile behavior guide, route references, and UI QA checklist |
```

Change the `Enterprise Web UI UX Requirements.md` purpose to `Original enterprise UI/UX baseline; current policy lives in DESIGN.md`.

- [ ] **Step 2: Update the Handoff reading order**

Insert `DESIGN.md` after `README.md`, insert `docs/14_UI_UX_DESIGN_SYSTEM.md` after `docs/06_WORKFLOWS.md`, and renumber the list through deployment documentation.

- [ ] **Step 3: Update the Handoff Key Documents table**

Add:

```markdown
| `DESIGN.md` | Canonical visual system, components, accessibility, and Adaptive UI policy |
| `docs/14_UI_UX_DESIGN_SYSTEM.md` | Developer-facing Desktop/Mobile implementation index and UI QA contract |
```

- [ ] **Step 4: Verify onboarding references**

Run:

```powershell
rg -n "DESIGN.md|14_UI_UX_DESIGN_SYSTEM|original enterprise UI/UX baseline" README.md DEVELOPER_HANDOFF.md
git diff --check -- README.md DEVELOPER_HANDOFF.md
```

Expected: both entry documents link to the canonical and operational documents and contain no diff errors.

- [ ] **Step 5: Commit onboarding updates**

```powershell
git add -- README.md DEVELOPER_HANDOFF.md
git commit -m "docs(ui): link adaptive design guidance"
```

Expected: the commit contains only `README.md` and `DEVELOPER_HANDOFF.md`.

---

### Task 4: Validate Documentation Integrity

**Files:**
- Verify: `DESIGN.md`
- Verify: `Enterprise Web UI UX Requirements.md`
- Verify: `docs/14_UI_UX_DESIGN_SYSTEM.md`
- Verify: `README.md`
- Verify: `DEVELOPER_HANDOFF.md`

**Interfaces:**
- Consumes: All documentation changes from Tasks 1 through 3.
- Produces: A clean documentation-only delivery with traceable precedence and no broken local references.

- [ ] **Step 1: Run the unfinished-marker scan**

```powershell
$unfinishedPatterns = @(('T' + 'BD'), ('T' + 'ODO'), ('PLACE' + 'HOLDER'), ('to be ' + 'decided'))
$matches = Select-String -LiteralPath DESIGN.md, "Enterprise Web UI UX Requirements.md", docs/14_UI_UX_DESIGN_SYSTEM.md, README.md, DEVELOPER_HANDOFF.md -Pattern $unfinishedPatterns
if ($matches) { $matches; exit 1 } else { "No unfinished markers found" }
```

Expected: `No unfinished markers found`.

- [ ] **Step 2: Re-run the local Markdown-path check**

```powershell
$documents = @("README.md", "DEVELOPER_HANDOFF.md", "docs/14_UI_UX_DESIGN_SYSTEM.md")
$paths = Select-String -LiteralPath $documents -Pattern '`([^`]+\.md)`' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '[*{}]' } | Sort-Object -Unique
$missing = $paths | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing) { $missing; exit 1 } else { "All documented Markdown paths exist" }
```

Expected: `All documented Markdown paths exist`.

- [ ] **Step 3: Check formatting and scope**

```powershell
git diff --check HEAD~3..HEAD
git show --stat --oneline HEAD~3..HEAD
git status --short --branch
```

Expected: no whitespace errors; the three implementation commits touch only the five planned documentation files. Existing unrelated dirty Impeccable files may remain visible and must not be staged or reverted.

- [ ] **Step 4: Review consistency manually**

Confirm:

- `DESIGN.md` owns policy rather than implementation history.
- `docs/14_UI_UX_DESIGN_SYSTEM.md` links instead of copying full token tables.
- Business and permission requirements outrank visual policy everywhere.
- Desktop/Mobile differences preserve the same workflows and records.
- Mobile Field Navigation and contextual action bars are explicitly mutually exclusive.

Expected: all five statements are true without contradictory language.
