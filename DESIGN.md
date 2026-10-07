---
name: Asset Management System
description: Enterprise asset operations UI for Thai corporate asset registration, custody, audit, maintenance, disposal, reporting, and administration.
colors:
  brand-navy: "#0F172A"
  brand-accent: "#3B82F6"
  action-blue: "#2563EB"
  primary-slate-ink: "#0F172A"
  soft-system-background: "#F8FAFC"
  surface: "#FFFFFF"
  muted-surface: "#F1F5F9"
  muted-slate: "#475569"
  border: "#E2E8F0"
  success: "#15803D"
  warning: "#B45309"
  danger: "#B91C1C"
  info: "#2563EB"
  primary-soft: "#EFF6FF"
  primary-hover: "#1D4ED8"
  success-soft: "#F0FDF4"
  warning-soft: "#FFFBEB"
  danger-soft: "#FEF2F2"
  info-soft: "#EFF6FF"
typography:
  display:
    fontFamily: "Inter, Noto Sans Thai, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  headline:
    fontFamily: "Inter, Noto Sans Thai, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
  title:
    fontFamily: "Inter, Noto Sans Thai, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
  body:
    fontFamily: "Inter, Noto Sans Thai, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Inter, Noto Sans Thai, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.soft-system-background}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-status:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.muted-slate}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: Asset Management System

## 1. Overview

**Creative North Star: "The Corporate Asset Ledger"**

This visual system should feel like a trusted enterprise record system for asset ownership, custody, audit, maintenance, disposal, reporting, and administration. It is structured, accountable, and operationally reliable. The interface serves real Thai corporate operations, so the design language is calm, corporate, data-driven, and practical.

The secondary lens is "The Audit Console" for audit rounds, QR scanning, findings, review, readiness, and compliance-heavy pages. Dashboard and work-center surfaces may borrow lightly from "The Operations Control Room" when users need fast operational awareness, but the product must never turn into a marketing dashboard or playful SaaS app.

Use the existing design-system helpers, Tailwind tokens, RBAC-aware layouts, locale routing, and workflow conventions as the source of truth. Do not redesign business workflows to chase visual novelty. The UI should preserve dense tables, clear forms, readable Thai and English text, touch-safe field controls, and unambiguous status states.

**Key Characteristics:**

- Corporate, restrained, and audit-friendly.
- Dense enough for enterprise scanning, never cramped.
- Bordered and tonal by default, lightly lifted only where grouping matters.
- Status-rich, permission-aware, and readable in Thai and English.
- Built for desktop administration and mobile field audit work.

## 2. Colors

The palette is a restrained corporate system: Brand Navy anchors the desktop sidebar and identity, Action Blue provides accessible primary actions, Electric Blue marks focus and emphasis, Soft System Background keeps long work sessions calm, and semantic colors communicate workflow status.

### Primary

- **Brand Navy**: The primary identity color. Use for the desktop sidebar and system identity marks.
- **Action Blue**: The accessible fill for normal white-text primary actions.
- **Electric Blue**: The accent for focus, icons, links, and selected emphasis. Do not use it as the normal white-text button fill.

### Secondary

- **Secondary Surface** (#F1F5F9 + Primary Slate Ink): Secondary button and quiet chip background (shadcn `secondary`).
- **Muted Slate**: Muted but readable body support text, helper copy, empty-state descriptions, and table metadata.

### Tertiary

- **Info Blue**: Informational status, planned/open workflow states, references, and neutral system links when Brand Navy would overstate priority.
- **Success Green**, **Warning Amber**, and **Danger Red**: Workflow state colors for completion, review/exception states, and destructive or failed conditions. These colors must be paired with text labels and, where useful, icons or shapes.

### Neutral

- **Soft System Background**: The app canvas for dashboard and operational pages.
- **Surface White**: Panels, forms, popovers, tables, topbar, and modals.
- **Primary Slate Ink**: Main text and data values.
- **Muted Surface**: Subtle grouped backgrounds, hover states, inactive badges, and empty-state panels.
- **Border Slate**: Dividers, table shells, input borders, panel boundaries, and structural separation.

### Named Rules

**The Brand and Action Rule.** Brand Navy is for the desktop sidebar and identity. Action Blue is for normal white-text primary actions. Electric Blue is for focus, icons, links, and selected emphasis. Do not use these colors as decorative fill across inactive cards or marketing-style sections.

Brand Navy #0F172A anchors the desktop sidebar and identity.
Action Blue #2563EB is the accessible fill for normal white-text primary actions.
Electric Blue #3B82F6 is the accent for focus, icons, links, and selected emphasis.
The topbar and working canvas remain light to preserve operational readability.

**The Status With Evidence Rule.** Status cues must never rely on color alone. Pair semantic color with readable labels, consistent tone mapping, and visible workflow context.

**The No Decorative Gradient Rule.** Decorative gradients are prohibited. The product should feel like an enterprise operations system, not a landing page.

**The Token Contrast Rule.** Status text uses the status ink (`text-success`, `text-warning`, `text-danger`, `text-info`) on white, the page background, muted, or its own soft surface (`bg-{tone}-soft`). Never tint with opacity (`bg-warning/10`, `bg-primary/10`) and never lighten solid fills on hover (`/90`): use `bg-{tone}-soft` and `hover:bg-{tone}-hover`. `{tone}-foreground` means text on the solid fill. `tests/design-tokens-contrast.test.ts` enforces every pair at 4.5:1.

## 3. Typography

**Display Font:** Inter for Latin letters and numbers, Noto Sans Thai for Thai (both variable, loaded with `next/font/google` in `src/app/layout.tsx`, system-ui fallback)
**Body Font:** Inter + Noto Sans Thai (same stack as display)
**Label/Mono Font:** Inter for labels; use system monospace only for codes, IDs, logs, or technical values when needed.

**Character:** One sans-serif stack (Inter + Noto Sans Thai) keeps Thai and English interface text consistent across dashboards, forms, tables, admin settings, and mobile field workflows. The hierarchy is compact and fixed, not fluid or editorial.

### Hierarchy

- **Display** (700, 1.5rem, 1.2): Page titles, dashboard headings, and high-level report titles. Keep fixed and compact.
- **Headline** (700, 1.25rem, 1.25): Section-leading headings, modal titles, and important form groups.
- **Title** (600, 1rem, 1.5): Panel titles, table group labels, card titles, and dense workflow headings.
- **Body** (400, 0.875rem, 1.5): Primary interface copy, table cells, descriptions, form helper text, and workflow content. Long prose should stay around 65-75ch.
- **Label** (500, 0.875rem, 0 letter spacing): Field labels, button text, filter labels, navigation labels, and compact UI controls. Avoid all-caps labels except very short badges where the existing system already uses them.

### Named Rules

**The No Display Labels Rule.** Never use display fonts, fluid hero type, or oversized marketing typography for labels, buttons, data, navigation, or form controls.

**The Thai Readability Rule.** Thai and English labels must remain readable at operational density. Do not shrink helper text or placeholders below accessible contrast or touch usability.

## 4. Elevation

This system is lightly lifted. Borders and tonal layers do most of the work; `shadow-sm` is reserved for important panels, metric cards, grouped sections, topbar structure, and stable operational containers. Popovers and dropdowns may use stronger shadows so they clearly escape the page layer. Heavy shadows, blurred glass, floating marketing cards, and decorative depth are forbidden.

### Shadow Vocabulary

- **Structured Panel** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Default lift for content panels, metric cards, grouped dashboard modules, and stable operational cards.
- **Floating Overlay** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)`): Dropdowns, popovers, command-style menus, and overlays that must sit above dense content.

### Named Rules

**The Border First Rule.** Use a border and tonal surface before adding elevation. Add `shadow-sm` only when grouping or layer separation improves task clarity.

**The No Floating Marketing Cards Rule.** Panels may be lightly lifted for structure, but they must not become decorative cards arranged for landing-page drama.

## 5. Components

Components should feel consistent, restrained, and task-first. The system already uses shared helpers for panels, action buttons, fields, tables, mobile cards, empty states, and touch icon buttons; preserve those helpers when building new surfaces.

### Buttons

- **Shape:** Gently curved rectangles (8px radius).
- **Primary:** Action Blue background with white text, medium weight, 40px desktop height, and 44px minimum touch height on mobile.
- **Hover / Focus:** Solid buttons darken on hover with the hover token (`hover:bg-primary-hover`, `hover:bg-danger-hover`) — never fade with opacity. Focus uses a visible Electric Blue ring with offset. Disabled states reduce opacity and block pointer actions. Build buttons with `Button` / `buttonVariants` from `src/components/ui/` (shadcn); `getActionButtonClasses` maps legacy variants onto the same classes.
- **Secondary / Ghost / Tertiary:** Secondary buttons use Surface White, Border Slate, and Primary Slate Ink. Ghost buttons use no border at rest and a Muted Surface hover. Danger buttons use Danger Red only for destructive actions.

### Status Badges

- **Style:** One `StatusBadge` (`src/components/ui/status-badge.tsx`): 8px radius (`rounded-md`), a status dot, the tone's soft background (`bg-{tone}-soft`), its border (`border-{tone}-border`) and AA ink text (`text-{tone}`). The dot keeps status readable without relying on hue alone.
- **Custom colors:** A status color stored in the database colors the dot only, and only when it is a valid hex value. Badge text is always the tone ink.
- **State:** Every badge carries a text label. Warning, danger, success, info, and primary tones follow workflow meaning (`getStatusTone`, `getAssetStateTone`).

### Dialogs, Menus and Confirmation

- **Primitives:** Overlays use shadcn/ui on Radix (`src/components/ui/`): `AccessibleDialog` for forms and reviews, `Sheet` for side drawers and mobile navigation, `DropdownMenu` for action menus, `Popover` for help and pickers, `AttachmentPreviewDialog` for image/PDF preview. Every overlay closes with Escape, traps focus, returns focus to its trigger, locks page scroll, and renders in a portal. Dialogs opened without a Radix Trigger restore focus to their opener themselves (`returnFocusRef` / `fallbackFocusRef` on `AccessibleDialog`, `returnFocusRef` on `confirm()`).
- **Busy dialogs:** Pass `busy` while saving; the dialog then ignores Escape, outside clicks and the close button.
- **Confirmation:** Never use `window.confirm`. Call `await confirm({ title, confirmLabel, tone })` from `useConfirm()`; destructive actions use `tone: "destructive"` and report the actual result ("ลบแล้ว", not "บันทึกสำเร็จ").
- **Menus never contain dialogs.** A menu item only opens a dialog or drawer that is rendered outside the menu, and that dialog returns focus to the menu trigger.

### Cards / Containers

- **Corner Style:** 12px for main content panels and metric cards, 8px for compact tables and nested control surfaces.
- **Background:** Surface White on Soft System Background, with Muted Surface used for quiet groupings or empty states.
- **Shadow Strategy:** Use `shadow-sm` for content panels and metric cards where grouping matters. Use flat bordered surfaces for tables, forms, filter panels, and dense admin settings unless lift clarifies hierarchy.
- **Border:** Border Slate is the default structural line. Avoid colored side stripes and decorative borders.
- **Internal Padding:** 16px on mobile and compact panels, 20px where dashboard or form grouping needs more breathing room.

### Inputs / Fields

- **Style:** 8px radius, Border Slate stroke, Soft System Background fill, 40px desktop height, and 44px mobile minimum touch height.
- **Focus:** Border shifts to Electric Blue with a 1px ring. Focus must be visible on keyboard navigation.
- **Error / Disabled:** Errors use Danger Red with text explanation. Disabled fields use Muted Surface and Muted Slate, and must still communicate why interaction is unavailable when context matters.

### Navigation

The app uses a fixed dashboard shell with a Brand Navy sidebar and light topbar. Navigation items use Lucide icons, medium-weight labels, Sidebar Hover and Sidebar Active states, and Sidebar Foreground for readable labels. The topbar and working canvas remain light to preserve operational readability. Mobile navigation uses a slide-in sidebar with 44px touch targets and an overlay.

### Data Tables

Tables are core product surfaces. Use bordered shells, readable row spacing, clear sortable/filterable headers, stable status badges, and responsive fallback cards below medium breakpoints where needed. Prioritize scanning, comparison, and bulk operations over decorative presentation.

**List page pattern (asset register, 2026-10-07).** New list pages follow the register (`/[locale]/assets`):

- **Search bar card:** a search field that searches while typing (400ms pause, 2+ characters, not during IME composition, Enter searches at once, × clears) plus the two or three scope selects a person uses most. Below `md` the bar holds only search and ⚙, and it sticks to the top while the list scrolls.
- **Status tabs with live counts** for the handful of states people switch between; any other state lives in the filter sheet.
- **⚙ filter Sheet** (right on desktop, bottom on phones) for everything else. Changes apply at once, the sheet stays open, and its footer reads "ล้าง" and "แสดง N รายการ" with the real result count.
- **Removable chips** for every active filter that is not visible on screen, plus "ล้างทั้งหมด".
- **Filters live in the URL.** Changes go through `router.replace` with an optimistic state (`AssetRegisterNavigationProvider`), so the back button leaves the page in one step and controls never bounce back.
- **Rows:** one next-step button chosen by status (for example "ส่งมอบ" / "รับคืน") plus a ⋯ menu that holds every action, with disabled items explaining why. The ⋯ menu is a `DropdownMenu` on desktop and a bottom `Sheet` on phones. Clicking a row opens the detail page.
- **Desktop table:** `table-fixed` with a `<colgroup>`, only the key column and the actions column pinned, one-line truncated cells with a `title`. The default column set must fit 1440px without horizontal scroll, and the scroll hint appears only when the table really overflows.
- **Phone rows:** about 80px each — 44px thumbnail, tag, name, then location and a status badge on one line, and ⋯. A "เลือก" mode turns rows into checkboxes, and its bulk bar floats above the bottom navigation.
- **Thumbnails:** list images come from `/api/attachments/{id}/thumbnail` (96px WebP, cached); never load original files in a list.

### Field Audit / QR Workflows

Scanner and field workflows need touch-safe controls, square or contained camera preview areas, visible fallback text input, readable status, and clear evidence upload states. Audit pages may lean into the Audit Console lens, but must remain calm and workflow-driven.

## 6. Do's and Don'ts

### Do:

- **Do** preserve existing tokens and design-system helpers such as panel, action button, field control, table shell, mobile card list, empty state, and touch icon button classes.
- **Do** use Brand Navy for sidebar identity, Action Blue for normal white-text primary actions, and Electric Blue for focus, icons, links, and selected emphasis.
- **Do** use borders and tonal layers as the default grouping mechanism, with `shadow-sm` only for important panels, cards, modals, and grouped sections.
- **Do** keep tables and forms dense enough for enterprise scanning, but not cramped.
- **Do** pair status colors with readable labels, icons, shapes, or explicit workflow context so status does not rely on color alone.
- **Do** support Thai and English text, keyboard navigation, visible focus states, reduced motion, touch-safe mobile/tablet controls, and clear empty, loading, error, permission-denied, and validation states.
- **Do** preserve business workflows, RBAC, locale routing, audit trail expectations, Prisma/SQL Server behavior, and production readiness assumptions.

### Don't:

- **Don't** use consumer-app styling, bright playful colors, heavy animation, marketing-style hero layouts, gamified UI, casual startup dashboards, decorative gradients, or anything that makes the system feel like a landing page instead of an enterprise operations tool.
- **Don't** use glassmorphism, heavy shadows, decorative gradients, floating marketing cards, or playful surfaces.
- **Don't** redesign business workflows for visual effect.
- **Don't** invent inconsistent button, input, modal, badge, or navigation vocabularies across screens.
- **Don't** rely on color alone for status, permission, validation, audit, or lifecycle state.
- **Don't** use display fonts, fluid hero typography, gradient text, oversized cards, or landing-page composition inside product workflows.
- **Don't** use colored side-stripe borders as a decorative accent. Use full borders, status badges, text labels, and icons instead.

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
