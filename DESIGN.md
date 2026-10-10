---
name: Asset Management System
description: Enterprise asset operations UI for Thai corporate asset registration, custody, audit, maintenance, disposal, reporting, and administration.
colors:
  brand-navy: "#083161"
  brand-accent: "#18A0A8"
  primary: "#1E4F94"
  primary-hover: "#173E76"
  primary-soft: "#E9EFF8"
  primary-border: "#BACBE4"
  primary-slate-ink: "#0B1D35"
  canvas: "#EEF1F6"
  soft-system-background: "#F6F8FB"
  surface: "#FFFFFF"
  muted-surface: "#E9EEF5"
  muted-slate: "#3C4F6B"
  accent: "#EBF0F7"
  border: "#D7DEE8"
  input: "#7C8BA0"
  ring: "#10858D"
  success: "#1D7A35"
  success-soft: "#ECF7EF"
  success-border: "#B3DCBF"
  success-hover: "#17652C"
  warning: "#A14A05"
  warning-soft: "#FDF4E4"
  warning-border: "#EDCB93"
  warning-hover: "#843C04"
  danger: "#B3261E"
  danger-soft: "#FCEFEE"
  danger-border: "#F1BEB9"
  danger-hover: "#931F18"
  info: "#0A6E75"
  info-soft: "#E5F4F5"
  info-border: "#A3D8DB"
  info-hover: "#085A60"
  sidebar: "#FFFFFF"
  sidebar-foreground: "#1F3657"
  sidebar-muted: "#586A84"
  sidebar-hover: "#EBF0F7"
  sidebar-active: "#083161"
  sidebar-active-foreground: "#FFFFFF"
  sidebar-active-icon: "#18A0A8"
  sidebar-border: "#D7DEE8"
typography:
  display:
    fontFamily: "IBM Plex Sans, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0"
  headline:
    fontFamily: "IBM Plex Sans, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0"
  title:
    fontFamily: "IBM Plex Sans, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
  body:
    fontFamily: "IBM Plex Sans, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5714
    letterSpacing: "0"
  label:
    fontFamily: "IBM Plex Sans, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5714
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
    backgroundColor: "{colors.primary}"
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
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-slate}"
    rounded: "{rounded.md}"
    padding: "4px 0"
  badge-status-attention:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  nav-item-active:
    backgroundColor: "{colors.sidebar-active}"
    textColor: "{colors.sidebar-active-foreground}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
---

# Design System: Asset Management System

## 1. Overview

**Creative North Star: "The Corporate Asset Ledger"**

This visual system should feel like a trusted enterprise record system for asset ownership, custody, audit, maintenance, disposal, reporting, and administration. It is structured, accountable, and operationally reliable. The interface serves real Thai corporate operations, so the design language is calm, corporate, data-driven, and practical.

The secondary lens is "The Audit Console" for audit rounds, QR scanning, findings, review, readiness, and compliance-heavy pages. Dashboard and work-center surfaces may borrow lightly from "The Operations Control Room" when users need fast operational awareness, but the product must never turn into a marketing dashboard or playful SaaS app.

Use the existing design-system helpers, Tailwind tokens, RBAC-aware layouts, locale routing, and workflow conventions as the source of truth. Do not redesign business workflows to chase visual novelty. The UI should preserve dense tables, clear forms, readable Thai and English text, touch-safe field controls, and unambiguous status states.

The current visual foundation is UI round 4 phase 1, the "light shell" (spec `docs/superpowers/specs/2026-10-10-ui-foundation-design.md`, 2026-10-10): colors taken from the app icon (navy `#083161` and teal `#18A0A8`), a white sidebar and topbar, flat panels on a blue-grey canvas, IBM Plex type, and two-tier status badges.

**Key Characteristics:**

- Corporate, restrained, and audit-friendly.
- Dense enough for enterprise scanning, never cramped.
- Bordered and tonal by default; only floating layers are lifted.
- Status-rich, permission-aware, and readable in Thai and English.
- Built for desktop administration and mobile field audit work.

## 2. Colors

The palette comes from the app icon. Most of the screen is neutral: a white sidebar and topbar with thin borders, a blue-grey canvas, white panels, and ink-colored text (KPI numbers included). Strong color appears in only a few places, so it keeps its meaning. Tokens live in the first `:root` block of `src/app/globals.css` (6-digit hex, shadcn names); `tests/design-tokens-contrast.test.ts` checks every pair.

### Primary

- **Brand Navy** (`--brand-navy` #083161): The identity color. It appears only in the logo and the selected menu row (`--sidebar-active`).
- **Primary** (`--primary` #1E4F94, hover #173E76, soft #E9EFF8, border #BACBE4): Actions and links. White-text primary buttons use this fill; `primary-soft` with `primary-border` marks selected chips, tabs and options.
- **Brand Accent / Teal** (`--brand-accent` #18A0A8): The icon's teal. Used for the selected menu icon only; it reaches only 3.17:1 on white, so it is never text.

### Secondary

- **Secondary / Muted Surface** (#E9EEF5 + Ink): Secondary buttons, quiet chips and grouped backgrounds (shadcn `secondary` and `muted`).
- **Muted Slate** (`--muted-foreground` #3C4F6B): Readable support text, helper copy, table metadata and calm status labels. It is deliberately dark (8.32:1 on white) because thin Thai strokes need it.
- **Accent** (`--accent` #EBF0F7): The shared hover surface. Never teal.

### Tertiary

- **Info Teal** (`--info` #0A6E75, soft #E5F4F5, border #A3D8DB, hover #085A60): Informational status (open, planned, reported). It is now separate from Primary, so an info badge no longer looks like a button.
- **Success Green** (#1D7A35), **Warning Orange** (#A14A05) and **Danger Red** (#B3261E), each with `-soft`, `-border` and `-hover`: workflow state. They appear only inside status badges (and in destructive buttons for Danger), always with a text label and a marker shape.

### Neutral

- **Canvas** (`--canvas` #EEF1F6): The page background inside the app shell (`bg-canvas` on the `dashboard-shell.tsx` wrapper and on sticky mobile bars that blend with it). `<body>` stays `bg-background` so print pages and login are unaffected.
- **Soft System Background** (`--background` #F6F8FB): Field fills, dialog bodies and empty boxes.
- **Surface White** (`--card`, `--popover` #FFFFFF): Panels, forms, popovers, tables, topbar and sidebar.
- **Ink** (`--foreground` #0B1D35): Main text and data values.
- **Border** (`--border` #D7DEE8): Dividers, table shells and panel boundaries. A base rule sets it as the default border color.
- **Input** (`--input` #7C8BA0): Field borders. It passes 3:1 (WCAG 1.4.11) on card, background and canvas.
- **Ring** (`--ring` #10858D): The only focus color.

### Sidebar

`--sidebar` #FFFFFF · `--sidebar-foreground` #1F3657 · `--sidebar-muted` #586A84 (icons, section headings) · `--sidebar-hover` #EBF0F7 · `--sidebar-active` #083161 · `--sidebar-active-foreground` #FFFFFF · `--sidebar-active-icon` #18A0A8 · `--sidebar-border` #D7DEE8. The name `--sidebar-accent` is not used, because shadcn uses it for the menu hover color.

### Non-color values

These live in the plain `@theme` block, not in `:root`: `--color-scrim: rgb(8 49 97 / 0.45)` (class `bg-scrim`) and `--shadow-overlay` (class `shadow-overlay`, see §4).

### Named Rules

**The Where Color Lives Rule.** Navy #083161 lives only in the logo and the selected menu row. Actions and links use Primary #1E4F94. Teal is for info status, the focus ring and the selected menu icon. Green, orange and red appear only inside status badges. Everything else is neutral. Do not use these colors as decorative fill across inactive cards or marketing-style sections.

Known exception: until phase 2, info notices, role chips and a few info icons also use the `info` tokens and so appear teal.

**The Status With Evidence Rule.** Status cues must never rely on color alone. Pair semantic color with readable labels, marker shapes, consistent tone mapping, and visible workflow context.

**The No Decorative Gradient Rule.** Decorative gradients are prohibited. The product should feel like an enterprise operations system, not a landing page.

**The Token Contrast Rule.** Status text uses the status ink (`text-success`, `text-warning`, `text-danger`, `text-info`) on white, the page background, canvas, muted, accent, or its own soft surface (`bg-{tone}-soft`). Never tint with opacity (`bg-warning/10`, `bg-primary/10`) and never lighten solid fills on hover (`/90`): use `bg-{tone}-soft` and `hover:bg-{tone}-hover`. `{tone}-foreground` means text on the solid fill. `tests/design-tokens-contrast.test.ts` enforces every text pair at 4.5:1 and the ring, input and selected-menu-icon pairs at 3:1.

**The Light Only Rule.** The app is light only: `:root { color-scheme: only light }` blocks Chrome Auto Dark and Samsung Internet dark mode. There is no `.dark` block, no `@custom-variant dark` and no `dark:` class (`tests/ui-overlay-guards.test.ts`, `tests/visual-foundation-guards.test.ts`).

## 3. Typography

**Fonts:** IBM Plex Sans (Latin and digits) before IBM Plex Sans Thai (Thai), then system-ui. IBM Plex Mono for codes. All three load with `next/font/google` in `src/app/layout.tsx` only (`--font-plex-sans`, `--font-plex-thai`, `--font-plex-mono`); `font-sans` and `font-mono` resolve to them in `@theme inline`.

- Plex Sans comes first because its digits are tabular; Plex Sans Thai digits are not. Thai letters fall through to Plex Sans Thai.
- Plex Sans Thai loads weights 400-700. Plex Mono loads 400-600, is not preloaded, and has no Arial size-adjusted fallback, so the system monospace shows while it loads.
- Plex Sans Thai is about 4.7% wider than Noto Sans Thai, so Thai text truncates slightly earlier.

**Character:** One sans-serif stack keeps Thai and English interface text consistent across dashboards, forms, tables, admin settings, and mobile field workflows. The hierarchy is compact and fixed, not fluid or editorial.

### Hierarchy

Font sizes are Tailwind's defaults. Line heights are ratios, so a child with an arbitrary size (`text-[11px]`) inherits a ratio, not a fixed pixel value.

- **Display** (700, 1.5rem / `text-2xl`, 32px; 36px on Thai pages): Page titles, dashboard headings, and high-level report titles. Keep fixed and compact.
- **Headline** (700, 1.25rem / `text-xl`, 28px; 30px on Thai pages): Section-leading headings, modal titles, and important form groups.
- **Title** (600, 1rem / `text-base`, 24px): Panel titles, table group labels, card titles, and dense workflow headings.
- **Body** (400, 0.875rem / `text-sm`, 22px in every language): Primary interface copy, table cells, descriptions, form helper text, and workflow content. Long prose should stay around 65-75ch.
- **Label** (500, 0.875rem, 22px, 0 letter spacing): Field labels, button text, filter labels, navigation labels, and compact UI controls. Avoid all-caps labels except very short badges where the existing system already uses them.
- **Small** (`text-xs`, 16px; 18px on Thai pages): Badges, section headings in the sidebar, the mobile bottom bar labels.

### Utilities

- `num` (`font-variant-numeric: tabular-nums lining-nums`): numbers that must line up, such as MetricCard values. Every `table` gets `tabular-nums` from a base rule.
- `tag` (Plex Mono, `calc(1em - 1px)`, `nowrap`): asset tags and document numbers. Defined now; the 119 asset-tag call sites move to it in phase 2.
- Toasts use the app font through an unlayered `:root [data-sonner-toaster]` rule (Sonner's own CSS is unlayered).

### Named Rules

**The No Display Labels Rule.** Never use display fonts, fluid hero type, or oversized marketing typography for labels, buttons, data, navigation, or form controls.

**The Thai Line-Height Rule.** Thai stacked vowels and tone marks need at least about 1.44 times the font size. `text-sm` is 22/14 in every language; on Thai pages (`html:lang(th)`, in `@layer base`) `text-xs`, `text-xl`, `text-2xl` and `text-3xl` get 18/12, 30/20, 36/24 and 44/30. An explicit `leading-*` still wins, so do not add `leading-tight` or `leading-none` to Thai text.

**The A4 Print Exception.** A4 operation documents (check-out, check-in and transfer forms) keep `text-sm` at 20/14 through `[--text-sm--line-height:calc(20/14)]` on `.operation-print-page`, so the signature row stays on page 1. Print text is denser than screen text on purpose.

**The Thai Readability Rule.** Thai and English labels must remain readable at operational density. Do not shrink helper text or placeholders below accessible contrast or touch usability.

**The Print Fonts Rule.** PDFs (`src/lib/pdf-font.ts`, `audit-pdf.tsx`) keep the embedded Noto Sans Thai. Thermal asset labels use the app font; Plex Sans Thai stops at 700, so labels render at 700 instead of 900. Test-print on the thermal printer before deploying; if labels are hard to read, load Noto Sans Thai 900 on the label print page only.

**The Thai Copy Rule.** Thai is the primary language. Thai pages use the shared glossary in `docs/19_THAI_GLOSSARY.md` (ที่ตั้ง · รายการไม่ตรง · พิจารณา · ยืมใช้ชั่วคราว / ถูกยืม · รหัสทรัพย์สิน …) and Buddhist-era years (`src/lib/display-year.ts`). English stays only for kept terms (Serial, License, QR, LDAP, API …) and admin-only technical names. Status codes from the database always go through a label; an unknown code shows as-is rather than disappearing. Server errors show Thai first with the original text as a small muted second line (`useApiError` / `ApiErrorText`); unexpected errors show only "Unexpected error · ref xxxxxxxx", which matches the server log.

## 4. Elevation

This system is flat. Panels, metric cards, the topbar, the register toolbar and the mobile bottom bars (except the round scan button) have no shadow: they separate from the canvas by surface color and a border (`getPanelClasses()` has no shadow, and a guard test keeps it that way). Only layers that float above the page are lifted. Heavy shadows, blurred glass, floating marketing cards, and decorative depth are forbidden.

### Shadow Vocabulary

- **Overlay** (`shadow-overlay`: `0 12px 32px -8px rgb(8 49 97 / 0.18), 0 2px 6px -2px rgb(8 49 97 / 0.1)`): dialogs (`AccessibleDialog`, `Dialog`, `AlertDialog`), sheets, popovers and dropdown menus. Nothing else.
- **Scrim** (`bg-scrim`: `rgb(8 49 97 / 0.45)`): the backdrop behind dialogs, alert dialogs and sheets. The camera scanner keeps its own darker backdrop.

### Motion

Sheets open in 250ms and close in 200ms with ease-out. Scrims and dialog, alert-dialog and sheet content use `motion-reduce:animate-none!` (the `!` beats the `data-[state]:animate-*` classes), so reduced motion turns the animation off.

### Named Rules

**The Border First Rule.** Use a border and tonal surface for grouping. Do not add `shadow-sm` to panels or cards; only floating layers use `shadow-overlay`. (Some dashboard and admin page-level cards still carry `shadow-sm`; phase 2 and 3 remove them.)

**The No Floating Marketing Cards Rule.** Panels must not become decorative cards arranged for landing-page drama.

## 5. Components

Components should feel consistent, restrained, and task-first. The system already uses shared helpers for panels, action buttons, fields, tables, mobile cards, empty states, and touch icon buttons; preserve those helpers when building new surfaces.

### Buttons

- **Shape:** Gently curved rectangles (8px radius).
- **Primary:** Primary #1E4F94 background with white text, medium weight, 40px desktop height, and 44px minimum touch height on mobile.
- **Hover / Focus:** Solid buttons darken on hover with the hover token (`hover:bg-primary-hover`, `hover:bg-danger-hover`) — never fade with opacity. Focus uses the teal ring `#10858D` (`ring-ring`) with offset. Disabled states reduce opacity and block pointer actions. Build buttons with `Button` / `buttonVariants` from `src/components/ui/` (shadcn); `getActionButtonClasses` maps legacy variants onto the same classes.
- **Secondary / Ghost / Tertiary:** Secondary buttons use Surface White, Border, and Ink. Ghost buttons use no border at rest and an Accent hover. Danger buttons use Danger Red only for destructive actions.

### Focus

- One focus color everywhere: `--ring` #10858D. Focus classes use `ring-ring` / `border-ring`; `(focus|focus-visible|focus-within):(ring|border)-(primary|brand-accent)` is blocked by `tests/visual-foundation-guards.test.ts`.
- A base rule gives every `:focus-visible` element without its own ring a `2px solid var(--ring)` outline with a 2px offset. Elements focused by code (`tabIndex={-1}`) and the sheet, alert-dialog and dropdown containers use `outline-none`.
- Windows high-contrast mode: an unlayered `@media (forced-colors: active)` rule draws a `CanvasText` outline, because box-shadow rings disappear there.
- On the selected menu row the ring sits outside the row on white (`ring-offset-2 ring-offset-sidebar`, 4.41:1), because an inset ring on navy reaches only 2.94:1.

### Status Badges

- **Style:** One `StatusBadge` (`src/components/ui/status-badge.tsx`, variants in `badge-variants.ts`) in two tiers, each with a marker whose shape carries the meaning, so color-blind users can tell states apart.
  - **Calm tier** (no fill, no side padding, so it lines up with other text in a column; muted-foreground text): `info` = hollow ring in info teal (open, planned, reported, and unknown asset states) · `success` = solid dot in success green (including Ready and In Use) · `primary` = solid dot in primary (approved, done, received) · `neutral` / `muted` = short bar in muted-foreground.
  - **Attention tier** (soft fill, border and tone ink text): `warning` = triangle · `danger` = diamond.
- **Database colors are not shown.** Status colors stored in the database (`asset_statuses.colorCode`, `asset_conditions.colorCode`) are no longer used on badges; the `color` prop and `getStatusDotColor` were removed. The data itself is unchanged.
- **State:** Every badge carries a text label. Tones follow workflow meaning (`getStatusTone`, `getAssetStateTone`). Markers use `forced-color-adjust-none` so they stay visible in high-contrast mode.

### Dialogs, Menus and Confirmation

- **Primitives:** Overlays use shadcn/ui on Radix (`src/components/ui/`): `AccessibleDialog` for forms and reviews, `Sheet` for side drawers and mobile navigation, `DropdownMenu` for action menus, `Popover` for help and pickers, `AttachmentPreviewDialog` for image/PDF preview. Every overlay closes with Escape, traps focus, returns focus to its trigger, locks page scroll, and renders in a portal. Dialogs opened without a Radix Trigger restore focus to their opener themselves (`returnFocusRef` / `fallbackFocusRef` on `AccessibleDialog`, `returnFocusRef` on `confirm()`).
- **Busy dialogs:** Pass `busy` while saving; the dialog then ignores Escape, outside clicks and the close button.
- **Confirmation:** Never use `window.confirm`. Call `await confirm({ title, confirmLabel, tone })` from `useConfirm()`; destructive actions use `tone: "destructive"` and report the actual result ("ลบแล้ว", not "บันทึกสำเร็จ").
- **Menus never contain dialogs.** A menu item only opens a dialog or drawer that is rendered outside the menu, and that dialog returns focus to the menu trigger.

### Cards / Containers

- **Corner Style:** 12px for main content panels and metric cards, 8px for compact tables and nested control surfaces.
- **Background:** Surface White on Canvas, with Soft System Background or Muted Surface used for quiet groupings or empty states.
- **Shadow Strategy:** None. Panels and metric cards are flat bordered surfaces (see §4).
- **Border:** Border is the default structural line. MetricCard tones use `border-{tone}-border`. Avoid colored side stripes and decorative borders.
- **Internal Padding:** 16px on mobile and compact panels, 20px where dashboard or form grouping needs more breathing room.

### Inputs / Fields

- **Style:** 8px radius, `border-input` (#7C8BA0, 3:1 on every surface), Soft System Background fill, 40px desktop height, and 44px mobile minimum touch height (`getFieldControlClasses()`). About 384 hand-written field class lists still use `border-border` and move to a shared Input in phase 2.
- **Focus:** Border and a 1px ring switch to the teal ring color #10858D (`focus:border-ring focus:ring-ring`). Focus must be visible on keyboard navigation.
- **Error / Disabled:** Errors use Danger Red with text explanation. Disabled fields use Muted Surface and Muted Slate, and must still communicate why interaction is unavailable when context matters.
- Native checkboxes and radios use the primary color (`accent-color: var(--primary)`); text selection uses `primary-border` behind ink.

### Navigation

The app uses a fixed dashboard shell with a white sidebar and a white topbar on the canvas.

- **Sidebar** (`src/components/layout/sidebar.tsx`): white with a right `border-sidebar-border`. The brand mark is the app icon (32px, rounded) with the name "ระบบบริหารทรัพย์สิน" / "Asset Management System" (`nav.brandName`); when collapsed only the icon shows and the name is `sr-only`.
- **Three sections with headings:** งานประจำวัน / Daily work (dashboard, work center, my assets) · ทรัพย์สิน / Assets (asset management, audit, maintenance, disposal) · ภาพรวมและระบบ / Reports and system (reports, master data, settings). A section with no permitted item is hidden (`filterNavigationSectionsByPermission` in `src/lib/navigation-permissions.ts`); when the sidebar is collapsed, headings become divider lines.
- **Rows:** inset (`mx-2 rounded-md px-3`), 36px on desktop and 44px in the mobile drawer, icons in `sidebar-muted`, hover `sidebar-hover`.
- **Active row:** solid navy `sidebar-active` with white text (weight 500), a teal `sidebar-active-icon` and `aria-current="page"`; the parent group of the active row is semibold with no fill. The active row is the longest matching href (`getActiveNavigationHref` in `src/lib/navigation-active.ts`, so `/th/assets/new` selects "add asset", not the register), and its group opens by itself. No colored side stripe.
- **Topbar:** white, `border-b`, no shadow.
- **Mobile:** a slide-in sidebar `Sheet` with 44px targets and the scrim; the bottom field bar is solid `bg-surface` with `border-t`, no blur or bar shadow (the round scan button keeps its own), and `text-xs` labels. The PWA `themeColor` / manifest `theme_color` is #FFFFFF and `background_color` is #EEF1F6.

### Data Tables

Tables are core product surfaces. Use bordered shells, readable row spacing, clear sortable/filterable headers, stable status badges, and responsive fallback cards below medium breakpoints where needed. Prioritize scanning, comparison, and bulk operations over decorative presentation.

**List page pattern (asset register, 2026-10-07).** New list pages follow the register (`/[locale]/assets`):

- **Search bar card:** a search field that searches while typing (400ms pause, 2+ characters, not during IME composition, Enter searches at once, × clears) plus the two or three scope selects a person uses most. Below `md` the bar holds only search and ⚙, and it sticks to the top while the list scrolls.
- **Status tabs with live counts** for the handful of states people switch between; any other state lives in the filter sheet. The tab nav scrolls horizontally on phones and uses `md:overflow-visible` from `md` up, so the active tab's underline is not clipped.
- **⚙ filter Sheet** (right on desktop, bottom on phones) for everything else. Changes apply at once, the sheet stays open, and its footer reads "ล้าง" and "แสดง N รายการ" with the real result count.
- **Removable chips** for every active filter that is not visible on screen, plus "ล้างทั้งหมด".
- **Filters live in the URL.** Changes go through `router.replace` with an optimistic state (`AssetRegisterNavigationProvider`), so the back button leaves the page in one step and controls never bounce back.
- **Rows:** one next-step button chosen by status (for example "ส่งมอบ" / "รับคืน") plus a ⋯ menu that holds every action, with disabled items explaining why. The ⋯ menu is a `DropdownMenu` on desktop and a bottom `Sheet` on phones. Clicking a row opens the detail page.
- **Desktop table:** `table-fixed` with a `<colgroup>`, only the key column and the actions column pinned, one-line truncated cells with a `title`. The default column set must fit 1440px without horizontal scroll, and the scroll hint appears only when the table really overflows.
- **Phone rows:** about 80px each — 44px thumbnail, tag, name, then location and a status badge on one line, and ⋯. A "เลือก" mode turns rows into checkboxes, and its bulk bar floats above the bottom navigation.
- **Thumbnails:** list images come from `/api/attachments/{id}/thumbnail` (96px WebP, cached); never load original files in a list.

### Field Audit / QR Workflows

Scanner and field workflows need touch-safe controls, square or contained camera preview areas, visible fallback text input, readable status, and clear evidence upload states. Audit pages may lean into the Audit Console lens, but must remain calm and workflow-driven.

Field-work page pattern (audit scan, 2026-10-07): **room → list or typed search → check sheet → one save button.**
- **Context first:** a room button sets where the person is standing; it filters the list and becomes the default "actual" location. It is remembered per round.
- **Search is the primary input** (QR labels are optional): a sticky field at the top of the scroll area (`-top-4 sm:-top-6` to sit flush over `main`'s padding), `text-base` so iOS does not zoom, IME-safe, 2+ characters, Enter opens the first result, camera button inside the field.
- **Check sheet:** bottom `Sheet` below 1024px, an inline sticky panel beside the list at ≥1024px (the open row is marked with `aria-current`). Each field shows the value that will be saved; a mismatch gets the warning tone (`bg-warning-soft`, `border-warning-border`) with an "ในระบบ: …" line.
- **One save button whose label states the result** ("บันทึก · ตรงทุกข้อ" / "ไม่ตรง N ข้อ (…)"); warning variant when anything differs; disabled with the reason shown when required evidence is missing.
- **After saving:** update rows in place (no `router.refresh()`), a `role="status"` banner with an "แก้" link, and focus back to the search field (from search) or to the row now in the same position (from the list).
- **Offline:** saves queue on the device, rows show "รอส่ง", a bar shows the count, and the queue sends itself when the connection returns.

## 6. Do's and Don'ts

### Do:

- **Do** preserve existing tokens and design-system helpers such as panel, action button, field control, table shell, mobile card list, empty state, and touch icon button classes.
- **Do** keep navy #083161 for the logo and the selected menu row, Primary #1E4F94 for actions and links, and teal for info status, focus and the selected menu icon.
- **Do** use borders and tonal layers as the grouping mechanism; use `shadow-overlay` only for dialogs, sheets, popovers and menus, and `bg-scrim` behind them.
- **Do** keep tables and forms dense enough for enterprise scanning, but not cramped.
- **Do** pair status colors with readable labels, marker shapes, icons, or explicit workflow context so status does not rely on color alone.
- **Do** write new Thai copy with the glossary words and edit messages through `node scripts/messages-edit.mjs`; `tests/thai-glossary.test.ts` blocks retired words.
- **Do** support Thai and English text, keyboard navigation, visible focus states, reduced motion, touch-safe mobile/tablet controls, and clear empty, loading, error, permission-denied, and validation states.
- **Do** preserve business workflows, RBAC, locale routing, audit trail expectations, Prisma/SQL Server behavior, and production readiness assumptions.

### Don't:

- **Don't** use consumer-app styling, bright playful colors, heavy animation, marketing-style hero layouts, gamified UI, casual startup dashboards, decorative gradients, or anything that makes the system feel like a landing page instead of an enterprise operations tool.
- **Don't** use glassmorphism, heavy shadows, decorative gradients, floating marketing cards, or playful surfaces.
- **Don't** bring back a dark navy sidebar, a second focus color, or green, orange and red outside status badges.
- **Don't** show database status colors on badges, or use teal `brand-accent` as text.
- **Don't** redesign business workflows for visual effect.
- **Don't** invent inconsistent button, input, modal, badge, or navigation vocabularies across screens.
- **Don't** rely on color alone for status, permission, validation, audit, or lifecycle state.
- **Don't** use display fonts, fluid hero typography, gradient text, oversized cards, or landing-page composition inside product workflows.
- **Don't** use colored side-stripe borders as a decorative accent. Use full borders, status badges, text labels, and icons instead.

## 7. Documentation Governance and Adaptive UI Contract

`DESIGN.md` is the canonical source for visual identity, design tokens, component vocabulary, accessibility principles, and Adaptive UI policy. It is not a feature changelog.

Business workflow, RBAC, SOD, lifecycle, and security requirements always take precedence over visual guidance. Runtime components and CSS are the implemented behavior; drift between runtime and this document must be reviewed and reconciled explicitly.

**Warning:** Do not run `npx shadcn add`: it writes oklch tokens and a `.dark` block into `src/app/globals.css`. Copy the component by hand and review the diff.

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
