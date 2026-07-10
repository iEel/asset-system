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
  slate-secondary: "#64748B"
  muted-surface: "#F1F5F9"
  muted-slate: "#475569"
  border: "#E2E8F0"
  success: "#16A34A"
  warning: "#F59E0B"
  danger: "#DC2626"
  info: "#2563EB"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
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

- **Slate Secondary**: Supporting text, secondary icons, inactive navigation, and explanatory metadata.
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

## 3. Typography

**Display Font:** Inter (with system-ui, sans-serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)
**Label/Mono Font:** Inter for labels; use system monospace only for codes, IDs, logs, or technical values when needed.

**Character:** One well-tuned sans-serif family keeps Thai and English interface text consistent across dashboards, forms, tables, admin settings, and mobile field workflows. The hierarchy is compact and fixed, not fluid or editorial.

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
- **Hover / Focus:** Primary hover darkens through opacity; focus uses a visible Electric Blue ring and offset. Disabled states reduce opacity and block pointer actions.
- **Secondary / Ghost / Tertiary:** Secondary buttons use Surface White, Border Slate, and Primary Slate Ink. Ghost buttons use no border at rest and a Muted Surface hover. Danger buttons use Danger Red only for destructive actions.

### Chips

- **Style:** Rounded-full badges with semantic text and soft background tints. Standard sizes are compact but readable.
- **State:** Selected and status states must include a clear label. Warning, danger, success, info, and primary tones must be used consistently with workflow meaning.

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
