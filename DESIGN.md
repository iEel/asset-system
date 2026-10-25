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
  faint-foreground: "#56677F"
  neutral-ink: "#2A4468"
  accent: "#EBF0F7"
  row-hover: "#F3F6FB"
  border: "#D7DEE8"
  border-soft: "#E7EBF1"
  control-border: "#C3CDDA"
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
  chrome: "#FFFFFF"
  chrome-border: "#D7DEE8"
  sidebar: "#082A54"
  sidebar-foreground: "#DCE6F2"
  sidebar-muted: "#9FB3D1"
  sidebar-hover: "#1C3B62"
  sidebar-active: "#1E4F94"
  sidebar-active-foreground: "#FFFFFF"
  sidebar-active-icon: "#5FD6DD"
  sidebar-active-bar: "#18A0A8"
  sidebar-ring: "#5FD6DD"
  sidebar-dot: "#F0A94D"
  sidebar-border: "#213F65"
  image-stage: "#E9EEF5"
  app-icon-frame: "#FFFFFF"
typography:
  display:
    fontFamily: "IBM Plex Sans, Noto Sans Thai Looped, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
  headline:
    fontFamily: "IBM Plex Sans, Noto Sans Thai Looped, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0"
  title:
    fontFamily: "IBM Plex Sans, Noto Sans Thai Looped, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
  body:
    fontFamily: "IBM Plex Sans, Noto Sans Thai Looped, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5714
    letterSpacing: "0"
  label:
    fontFamily: "IBM Plex Sans, Noto Sans Thai Looped, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5714
    letterSpacing: "0"
  meta:
    fontFamily: "IBM Plex Sans, Noto Sans Thai Looped, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5385
    letterSpacing: "0"
  metric:
    fontFamily: "IBM Plex Sans, Noto Sans Thai Looped, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.1429
    letterSpacing: "-0.02em"
  count:
    fontFamily: "IBM Plex Sans, Noto Sans Thai Looped, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
rounded:
  sm: "4px"
  control: "6px"
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
    padding: "0 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  choice-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  choice-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "32px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-slate-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  dialog-footer:
    backgroundColor: "{colors.soft-system-background}"
    textColor: "{colors.primary-slate-ink}"
    padding: "12px 16px"
  badge-status:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate}"
    rounded: "{rounded.control}"
    padding: "0"
    height: "22px"
  badge-status-attention:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "22px"
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

The current visual foundation is UI round 4 phase 1, the "light shell" (spec `docs/superpowers/specs/2026-10-10-ui-foundation-design.md`, 2026-10-10): colors taken from the app icon (navy `#083161` and teal `#18A0A8`), a sidebar and topbar in white and flat panels on a blue-grey canvas (the light theme), IBM Plex type, and two-tier status badges. Phase 2A (spec `docs/superpowers/specs/2026-10-11-ui-phase2a-design.md`, 2026-10-11) adds the tokens phase 2 needs and restyles the shared components: buttons, fields, menus, toasts, notices, empty states, status badges and breadcrumbs. Phase 2B (spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`) moved the list pages and page frames onto `PageHeader`, `DataTable`, the filter parts, `RowActions`, `TabNav`, `StatStrip`, `KeyValueList` and `ContentPanel` in five plans, and phase 2C (spec `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md`) the forms and dialogs in five batches, with `Segmented`, the dialog parts, `StickyFormFooter`, `Steps`, `FormSection`, `ChoiceCard`/`ChoiceChip`, `FileQueueList` and `ActionBar`. Phase 2D (spec `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md`, five plans) moved what was left in `src` onto the same parts, added `Chip` and the `icon-lg` size, made the default button 36px and locked the guards: they read all of `src`, and each rule allows only the shared parts that own its pattern (`OWNERS`) and the sites of its `EXEMPT` list, each with its exact count, its reason, its ruling and its kind, `permanent` or `phase 3`. Five new guards cover raw colors, dashed borders, raw `<button>`s, faded disabled controls and button heights at `sm:`. The `phase 3` rows are the three places phase 3 reworks: the register's bulk selection bar, the login page frame and the topbar search. Dark Mode (spec `docs/superpowers/specs/2026-10-17-dark-mode-design.md`) adds a second token set, direction A "navy dark": the page follows the OS until the person picks light or dark with the toggle in the topbar, and paper and print stay light (The Two-Theme Rule in §2). The V track (spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md`, four plans) moved every form onto errors under the field: a form checks itself on save, shows each error in Thai under its field, takes the person to the first wrong field and reads the server's refusals the same way (**Forms: Errors Under the Field** in §5). Menu B (spec `docs/superpowers/specs/2026-10-21-menu-b-shell-design.md`, 2026-10-21) makes the sidebar navy in both themes with color only on the open page, keeps the topbar, panels and phone on the chrome and panel colors, and adds the person at the menu's foot, the bell's box, grouped search, one banner region and a session that follows real work (**App Shell** in §5).

**Key Characteristics:**

- Corporate, restrained, and audit-friendly.
- Dense enough for enterprise scanning, never cramped.
- Bordered and tonal by default; only floating layers are lifted.
- Status-rich, permission-aware, and readable in Thai and English.
- Built for desktop administration and mobile field audit work.

## 2. Colors

The palette comes from the app icon. Most of the screen is neutral: the topbar and the phone bottom bar on the chrome color with thin borders, the navy menu beside them (§2 Sidebar), panels one step lighter than the canvas, and ink-colored text (KPI numbers included). Strong color appears in only a few places, so it keeps its meaning. Two themes share the token names (The Two-Theme Rule below): the light set lives in the first `:root` block of `src/app/globals.css` and the dark set in `:root[data-theme="dark"]` and its copy for a dark OS (6-digit hex, shadcn names). A value in this document that names no theme is the light one (white chrome and panels on a blue-grey canvas); Dark Theme below lists the dark ones. `tests/design-tokens-contrast.test.ts` checks every pair in both sets. Screens use only these tokens: a guard (spec 2D §5.4) fails a raw palette class (`text-gray-*`, `bg-blue-*`, `slate`, `zinc` …) or a hex color in a class anywhere in `src`; what keeps its own colors is an `EXEMPT` row with its reason, such as the print paper and the camera imagery (plan 2D-4 R17).

### Primary

- **Brand Navy** (`--brand-navy` #083161): The identity color. It appears only in the logo and as the pressed fill of the primary button (`active:bg-brand-navy`); the menu's navy is its own token, `--sidebar` (§2 Sidebar).
- **Primary** (`--primary` #1E4F94, hover #173E76, soft #E9EFF8, border #BACBE4): Actions and links. Primary buttons use this fill with `primary-foreground` text (white in light, the dark ink #08172C in dark); `primary-soft` with `primary-border` marks selected chips, tabs and options.
- **Brand Accent / Teal** (`--brand-accent` #18A0A8): The icon's teal. It marks the open menu row with its bar (`--sidebar-active-bar` equals it in both themes) and colors a few icons; it reaches only 3.17:1 on the light panel, so it is never text in either theme.

### Secondary

- **Secondary / Muted Surface** (#E9EEF5 + Ink): The pressed fill of outline and ghost buttons and of menu items, quiet chips and grouped backgrounds (shadcn `secondary` and `muted`). Do not place a field on it: the field border reaches only 2.97:1 there.
- **Muted Slate** (`--muted-foreground` #3C4F6B): Readable support text, helper copy, table metadata and calm status labels. It is deliberately dark (8.32:1 on the panel in both themes) because thin Thai strokes need it.
- **Accent** (`--accent` #EBF0F7): The shared hover surface. Never teal.

### Tertiary

- **Info Teal** (`--info` #0A6E75, soft #E5F4F5, border #A3D8DB, hover #085A60): Informational status (open, planned, reported). It is now separate from Primary, so an info badge no longer looks like a button.
- **Success Green** (#1D7A35), **Warning Orange** (#A14A05) and **Danger Red** (#B3261E), each with `-soft`, `-border` and `-hover`: workflow state. They appear only inside status badges (and in destructive buttons for Danger), always with a text label and a marker shape.

### Neutral

- **Canvas** (`--canvas` #EEF1F6): The page background inside the app shell (`bg-canvas` on the `dashboard-shell.tsx` wrapper and on the full-bleed sticky bars that blend with it: the sticky mobile bars and `StickyFormFooter`). `<body>` stays `bg-background` so print pages and login are unaffected.
- **Soft System Background** (`--background` #F6F8FB): Dialog footers (`AccessibleDialogFooter`, and `AlertDialogFooter` of the confirm dialog since phase 2C plan 5); quiet wells inside panels (the solid replacement for `bg-muted/20` to `/50`); the hover fill of outline and ghost buttons and of link cards; and the disabled and read-only look of buttons and fields. Dialog and sheet bodies take the panel color.
- **Surface** (`--card`, `--popover` #FFFFFF): Panels, forms, fields, dialog and sheet bodies, popovers, menus, toasts and tables.
- **Chrome** (`--chrome` #FFFFFF, `--chrome-border` #D7DEE8; #0D182A and #22344F in dark): the topbar and the phone bottom bar with their line. They hold the old `--sidebar` values, and `THEME_COLORS` (`src/lib/theme.ts`) follows `--chrome`. `--chrome-border` equals `--border` but belongs to the chrome; do not swap them.
- **Row Hover** (`--row-hover` #F3F6FB, `bg-row-hover`): The solid hover and focus fill of table and list rows. It is opaque, so sticky cells stay solid while a table scrolls sideways under them.
- **Ink** (`--foreground` #0B1D35): Main text and data values.
- **Faint** (`--faint-foreground` #56677F, `text-faint-foreground`): The third text level: placeholders, hints under fields, table headers, breadcrumbs, sub-lines, stat footers, tab counts, menu trails and reasons, units, the `Nil` dash, disabled text, field icons and the select arrow. AA on every neutral surface (4.95:1 on muted to 5.77:1 on the panel; 4.99:1 to 5.91:1 in dark), and allowed on `primary-soft` for a hovered or selected row or menu item (4.99:1, spec ruling I14). Never on a status soft fill (`bg-{success,warning,danger,info}-soft`; use the tone ink or `muted-foreground`), never for a main data value, and never as the only text that says what a control is. `--sidebar-muted` (#9FB3D1) is the menu's muted ink, only on the navy; never use faint on the menu.
- **Neutral Ink** (`--neutral-ink` #2A4468, `bg-neutral-ink`): The bar marker of neutral and muted status badges. AA on every surface a badge sits on (8.48:1 on muted to 9.88:1 on the panel; 8.25:1 to 9.79:1 in dark), so later phases may use it for text.
- **Border** (`--border` #D7DEE8): Dividers, table shells and panel boundaries. A base rule sets it as the default border color.
- **Border Soft** (`--border-soft` #E7EBF1, `border-border-soft`, or `bg-border-soft` for a 1px line): Inner dividers such as menu separators and row dividers. A line color, not a fill.
- **Control Border** (`--control-border` #C3CDDA, `border-control-border`): The border of outline buttons. It is decorative (1.61:1 on the panel, 1.86:1 in dark; the label or icon says it is a button), so it is never the only border of a field, checkbox, toggle or drop zone.
- **Input** (`--input` #7C8BA0): Field, checkbox and drop-zone borders, and breadcrumb separators. It passes 3:1 (WCAG 1.4.11) on card, background and canvas. On the panel the lines go border-soft 1.20 < border 1.35 < control-border 1.61 < input 3.47:1 (dark: 1.17 < 1.35 < 1.86 < 4.05:1) (`tests/design-tokens-contrast.test.ts`).
- **Ring** (`--ring` #10858D): The only focus color.

### Sidebar

The navy menu of menu B (spec `docs/superpowers/specs/2026-10-21-menu-b-shell-design.md` §6.1), navy in both themes (light values; Dark Theme has the dark ones): `--sidebar` #082A54 (the menu) · `--sidebar-foreground` #DCE6F2 (row text) · `--sidebar-muted` #9FB3D1 (section labels, icons, the role line) · `--sidebar-hover` #1C3B62 (a hovered row: a white 8% veil, flattened) · `--sidebar-active` #1E4F94 (the open row, the value of `--primary`) · `--sidebar-active-foreground` #FFFFFF (its text, the open group's title) · `--sidebar-active-icon` #5FD6DD (its icon) · `--sidebar-active-bar` #18A0A8 (the 3px bar on its left edge, the value of `--brand-accent`) · `--sidebar-ring` #5FD6DD (focus in the menu) · `--sidebar-dot` #F0A94D (the work dot, The One Count Rule) · `--sidebar-border` #213F65 (the lines under the brand row and above the person, the open group's guide line). On the menu: row text 11.33:1 (8.99:1 hovered), muted 6.70:1 (5.32:1 hovered), the open row's text 8.07:1, its icon 8.27:1 (4.67:1 on the row), the ring 8.27:1, the bar 4.51:1, the dot 7.14:1. `--sidebar-accent` is not used (shadcn's menu hover name). Navy again (the user, 2026-10-21, reversing the light menu of 2026-10-10): the old dark menu was Tailwind slate #0F172A and competed with the content; menu B is the icon's navy with muted labels and teal only on the open page.

### Dark Theme

Direction A, "navy dark" (spec `docs/superpowers/specs/2026-10-17-dark-mode-design.md` §5): the light set's names in `:root[data-theme="dark"]` and its identical copy under `@media (prefers-color-scheme: dark)`, each a 6-digit hex (the aliases `--surface`, `--destructive` and `--destructive-foreground` stay aliases). Navy-tinted darks, a light-blue primary, the icon's teal and lighter status inks on deep tinted fills.

- **Surfaces, darkest first:** `--canvas` #0A1424 · `--chrome` #0D182A (the topbar and the phone bottom bar) · `--background` #0D192C (wells and dialog footers) · `--card` #101D31 (panels) · `--popover` #15243A (menus and popovers). Fills on a panel: `--muted` #1A2B44 and `--secondary` #1A2B44 (pressed), `--accent` #182A43 (hover), `--row-hover` #162741.
- **Inks:** `--foreground` #E4EBF5, `--card-foreground` #E4EBF5, `--popover-foreground` #E4EBF5, `--secondary-foreground` #E4EBF5, `--accent-foreground` #E4EBF5 · `--muted-foreground` #A9B7CC · `--faint-foreground` #8A9AB2 · `--neutral-ink` #BAC6D8.
- **Lines:** `--border-soft` #1A2A42 < `--border` #22344F < `--control-border` #34496A < `--input` #687DA0 · `--ring` #2FA9B1 · `--chrome-border` #22344F (the chrome's line, the value of `--border`).
- **Brand and primary:** `--brand-navy` #5D93DE · `--brand-accent` #3CC6CE · `--primary` #6FA3EA · `--primary-hover` #8DB7F0 · `--primary-soft` #16294A · `--primary-border` #2F4F7E · `--primary-foreground` #08172C.
- **Status:** `--success` #5CCB7B, `--success-hover` #7DD796, `--success-soft` #10291B, `--success-border` #235C36, `--success-foreground` #08172C · `--warning` #F0A94D, `--warning-hover` #F4BF78, `--warning-soft` #2E2110, `--warning-border` #6B4A1C, `--warning-foreground` #08172C · `--danger` #F08A80, `--danger-hover` #F4A69E, `--danger-soft` #33171A, `--danger-border` #6E2E2B, `--danger-foreground` #08172C · `--info` #4FCBD3, `--info-hover` #7AD8DE, `--info-soft` #0E2A2E, `--info-border` #1F5B60, `--info-foreground` #08172C.
- **Sidebar (the navy menu, beside the elevation order):** `--sidebar` #0E2445 · `--sidebar-foreground` #DCE6F2 · `--sidebar-muted` #9FB3D1 · `--sidebar-hover` #213554 · `--sidebar-active` #24508F · `--sidebar-active-foreground` #FFFFFF · `--sidebar-active-icon` #5FD6DD · `--sidebar-active-bar` #3CC6CE · `--sidebar-ring` #5FD6DD · `--sidebar-dot` #F0A94D · `--sidebar-border` #263A58. Only the fills, the bar and the line differ from light. In dark: row text 12.27:1 (9.78:1 hovered), muted 7.25:1 (5.78:1), the open row's text 8.02:1, its icon 8.95:1 (4.64:1 on the row), the ring 8.95:1, the bar 7.49:1, the dot 7.73:1.
- **Images:** `--image-stage` #E9EEF5, the same in both themes: the fixed light stage under every uploaded photo, logo and attachment image (`bg-image-stage` on the image element, not on its frame, so see-through pixels and the side bands of a tall photo stay light while a placeholder icon follows the theme; in light it equals `--muted`, the old thumbnail fill). `--app-icon-frame` #34496A (light #FFFFFF): the 1px `ring-app-icon-frame` around the app icon in the sidebar and on the login page, a hairline that shows only in dark.

The rules of the dark set (spec §5.2):

- **Elevation by lightness:** canvas, then the chrome, the wells, the panels and the menus, each a step lighter; the overlay shadow is a deeper black (§4). The navy menu (`--sidebar`) stands beside this order, not in it.
- **Solid fills take the dark ink:** primary and the status inks are lighter in dark, so their `-foreground` is #08172C, and `-hover` is lighter than the rest fill.
- **Brand navy is a fill only:** the pressed primary button (`active:bg-brand-navy`). It is never text in either theme; the login headings use `text-foreground`. The menu is navy in both themes (`--sidebar`); its open row is the action blue (`--sidebar-active`: #1E4F94 in light, the value of `--primary`; #24508F in dark) with white text, the light teal icon and the teal bar (`--sidebar-active-bar`, the value of `--brand-accent` in both themes).
- **Tests:** `tests/design-tokens-contrast.test.ts` runs every rule of the light set on the dark set (test names start with `dark: `; a check against white uses the dark `--card`), and `tests/dark-mode-t.test.ts` checks that the two dark copies are identical, that every light token has a dark value and the reverse, and the elevation order.

### Non-color values

These live in the plain `@theme` block, not in `:root`, with their light values. The dark blocks re-declare the five that change with the theme (`--color-scrim`, `--elevation-overlay`, `--halo-field-focus`, `--halo-field-error` and `--select-chevron-image`), and the forced-light scope and the print reset re-declare them with the light values:

- `--color-scrim: rgb(8 49 97 / 0.45)` (class `bg-scrim`) and `--shadow-overlay: var(--elevation-overlay)` (class `shadow-overlay`, see §4). A Tailwind shadow class writes its theme value into the class, so a shadow that changes with the theme reads a variable.
- `--radius-control: 6px` (class `rounded-control`; §5 Cards / Containers lists which controls use it).
- `--shadow-field-focus: var(--halo-field-focus)` and `--shadow-field-error: var(--halo-field-error)`: the field halos, `0 0 0 4px rgb(16 133 141 / 0.16)` and `0 0 0 4px rgb(179 38 30 / 0.14)` in light, `0 0 0 4px rgb(47 169 177 / 0.28)` and `0 0 0 4px rgb(240 138 128 / 0.24)` in dark, written as the rgb of each theme's `--ring` and `--danger`. Keep `rgb(… / α)`: with `color-mix()` Tailwind adds a solid 4px fallback ring for older browsers.
- The type sizes `--text-meta`, `--text-metric` and `--text-count` (see §3).

The `select-chevron` utility reads `--select-chevron-image`, an SVG data URI with the faint ink written out, because a data URI cannot read `var()`: stroke #56677F in `@theme` and #8A9AB2 in the dark blocks. `tests/design-tokens-contrast.test.ts` checks, in each theme, that the chevron stroke and both halo colors still equal their tokens.

### Named Rules

**The Where Color Lives Rule.** Navy #083161 lives only in the logo and the pressed primary fill; the menu has its own navy (`--sidebar`) with color only on its open row. Actions and links use Primary #1E4F94, also the open row's fill. Teal is for info status, the focus ring and the open row's icon and bar. Green, orange and red appear only inside status badges, as the icon of a toast, a `Notice` or an `ActionEmptyState` (error = danger, permission = warning), on destructive buttons and menu items (danger), as the bell's count (danger) and as the menu's work dot (`--sidebar-dot`, orange). Of these, only warning and danger toasts and `Notice` boxes get a soft fill: tint only what the user must deal with. Everything else is neutral. Do not use these colors as decorative fill across inactive cards or marketing-style sections. Number strips (`StatStrip`) have no tone fill either: a cell that needs action gets a warning foot line with its icon, and the cell of the filter in use gets `primary-soft` with a 2px primary line. Approve is not green either: "อนุมัติที่เลือก" is the primary button, the "อนุมัติ" of a table row is `outline` with its check icon, and "ปฏิเสธ" and "ปฏิเสธที่เลือก" are `danger` (plan 2B-2 took the findings buttons off `bg-success` and the solid `bg-danger`).

Known exception (closed by plan 2D-4): info notices, chips and a few info icons used the `info` tokens and so appeared teal before phase 2D moved them (phase 2A changed only their borders, `border-info/30` → `border-info-border`). Plan 2D-2 moved the admin pages, the reports, the dashboard, the work center and the shell, plan 2D-3 the asset pages, the asset tools and the master data, and plan 2D-4 the audit, disposal, maintenance and transaction screens: names are the neutral `Chip`, states `StatusBadge` and notes `Notice` by meaning. Outside the shared parts (the `info` status ring and the info `Notice` icon) no screen uses the `info` tokens.

**The Status With Evidence Rule.** Status cues must never rely on color alone. Pair semantic color with readable labels, marker shapes, consistent tone mapping, and visible workflow context.

**The No Decorative Gradient Rule.** Decorative gradients are prohibited. The product should feel like an enterprise operations system, not a landing page.

**The Token Contrast Rule.** Status text uses the status ink (`text-success`, `text-warning`, `text-danger`, `text-info`) on the panel, the page background, canvas, muted, accent, row hover, or its own soft surface (`bg-{tone}-soft`). Never tint with opacity (`bg-warning/10`, `bg-primary/10`) and never lighten solid fills on hover (`/90`): use `bg-{tone}-soft` and `hover:bg-{tone}-hover`. `{tone}-foreground` means text on the solid fill (white in light, the dark ink #08172C in dark); outside `src/components/ui/` only the bell's unread count uses one, `text-danger-foreground` on `bg-danger`. Tone borders use `border-{tone}-border`, never `border-{tone}/NN`; neutral fills are solid tokens (`bg-background`, `bg-row-hover`, `border-border-soft`), never `bg-muted/NN` or `bg-accent/NN`, table headers included. Faint text is AA on every neutral surface and on `primary-soft`, never on a status soft fill. Button outlines (`control-border`, `danger-border`, `primary-border`) are decorative and need no 3:1; fields, checkboxes and drop zones keep `input` at 3:1. `tests/design-tokens-contrast.test.ts` enforces, in both themes, every text pair at 4.5:1 and the ring, input and menu pairs (the open row's icon, `--sidebar-ring`, the open row's bar and `--sidebar-dot` on the navy) at 3:1; the guards `R1 tone colors never fade with opacity` and `R7 neutral fills are opaque tokens, table headers included` in `tests/visual-foundation-guards.test.ts` block new tints.

**The Two-Theme Rule.** The app has a light and a dark theme from one set of token names (spec `docs/superpowers/specs/2026-10-17-dark-mode-design.md`). The page follows the OS (`prefers-color-scheme`) until the person chooses: the toggle beside the language button in the topbar switches at once and writes the `theme` cookie (`light` or `dark`, one year, `Path=/`, `SameSite=Lax`, per browser; logging out keeps it), and the root layout renders the choice as `data-theme` on `<html>` (no attribute: follow the OS), so the first paint is right without a script. `src/lib/theme.ts` reads and writes the cookie and holds `THEME_COLORS`, the chrome color of each theme for `theme-color`, equal to `--chrome` (the navy menu has its own `--sidebar`). The theme lives only in `src/app/globals.css`: the light `:root` block first, then `:root[data-theme="dark"]` and its identical copy under `@media (prefers-color-scheme: dark)`, one forced-light scope `[data-theme="light"]` (it re-declares the light set and the light effects) and one `@media print` reset that makes every page light. Components use tokens only and never learn which theme is on: there is no `.dark` block, no `@custom-variant dark` and no `dark:` class (`tests/ui-overlay-guards.test.ts`, `tests/visual-foundation-guards.test.ts`). `color-scheme` is `light dark` on a root with no choice, `dark` for a dark choice and `only light` in the forced-light scope and in print, so native controls and scrollbars follow the theme and Chrome Auto Dark and Samsung Internet dark mode stay off; `accent-color` is `--primary`. Paper keeps its colors in both themes: the A4 documents with their VOID banner, the label sheet, its sample in Admin › Settings and the signature canvas carry `data-theme="light"` (exactly these four, `tests/dark-mode-p.test.ts`), the asset QR stays black on its white tile, the camera keeps its own colors (its N1 `EXEMPT` rows) and the attachment preview its black stage. Uploaded images sit on `--image-stage` and the app icon gets its `--app-icon-frame` hairline (Dark Theme above). The app's own 404 page (`src/app/not-found.tsx`) follows the theme, the offline page (`public/offline.html`) follows the OS, and the manifest splash and the iOS status bar stay light. `tests/design-tokens-contrast.test.ts` runs every contrast rule on both sets. Windows contrast themes (forced colors) override both themes: the forced-light scope sets no `forced-color-adjust`.

## 3. Typography

**Fonts:** IBM Plex Sans (Latin and digits) before Noto Sans Thai Looped (Thai), then system-ui. IBM Plex Mono for codes. All three load with `next/font/google` in `src/app/layout.tsx` only (`--font-plex-sans`, `--font-thai`, `--font-plex-mono`); `font-sans` and `font-mono` resolve to them in `@theme inline`.

- Plex Sans comes first because its digits are tabular. Thai letters fall through to Noto Sans Thai Looped, and Plex Sans sets the baseline.
- Thai is looped (with heads) since 2026-10-16. The loopless IBM Plex Sans Thai was hard to read at 12-14px: ด/ต, บ/ป and ภ/ถ looked alike. The user picked Noto Sans Thai Looped from a side-by-side of four faces (Plex Sans Thai, Plex Sans Thai Looped, Sarabun, Noto Sans Thai Looped).
- Noto Sans Thai Looped loads weights 400-700 (Google serves one 29.8 KB variable file for all four). Plex Mono loads 400 and 500 only (plan 2D-1 dropped 600), is not preloaded, and has no Arial size-adjusted fallback, so the system monospace shows while it loads.
- Noto Sans Thai Looped is about 2% narrower than Plex Sans Thai, so Thai text truncates no earlier than before. On the Plex Sans baseline its stacked marks fit the Thai line heights to within 0.3px (Plex Sans Thai overhung by up to 0.5px at 12/18).

**Character:** One sans-serif stack keeps Thai and English interface text consistent across dashboards, forms, tables, admin settings, and mobile field workflows. The hierarchy is compact and fixed, not fluid or editorial.

### Hierarchy

Font sizes are Tailwind's defaults plus three sizes from the mockup, `text-meta`, `text-metric` and `text-count` (plain `@theme` block). Line heights are ratios, so a child with an arbitrary size inherits a ratio, not a fixed pixel value. Nothing is smaller than 12px (`text-xs`) except the thermal asset label (guard `R3 no text smaller than 12px outside the thermal label`).

- **Display** (600, 1.5rem / `text-2xl`, 32px; 36px on Thai pages): Page titles, built only by `PageHeader` (the compact register title is `text-xl` below `md`). Keep fixed and compact. Since phase 2B every page title of the dashboard shell is built this way; four `h1` stay outside it on purpose (guard LH1 `EXEMPT`): the login page (phase 3, with its frame), the two print pages (700) and the field scan header (`AuditScanHeader`).
- **Headline** (700, 1.25rem / `text-xl`, 28px; 30px on Thai pages): Section-leading headings, modal titles, and important form groups.
- **Title** (600, 1rem / `text-base`, 24px): Panel titles, table group labels, card titles, and dense workflow headings.
- **Body** (400, 0.875rem / `text-sm`, 22px in every language): Primary interface copy, table cells, descriptions, form helper text, and workflow content. Long prose should stay around 65-75ch.
- **Label** (500, 0.875rem, 22px, 0 letter spacing): Button text, filter labels, navigation labels, and compact UI controls. Field labels from `FieldLabel`, and group legends through `fieldLabelClasses`, use Meta at weight 500 instead; 2C plan 4 moved the last old label spans and red stars of 2C onto them (guard GF7 `OLD_MARKUP` is empty). Avoid all-caps labels except very short badges where the existing system already uses them.
- **Small** (`text-xs`, 16px; 18px on Thai pages): Section headings in the sidebar and in menus, the mobile bottom bar labels, `Kbd` keys.
- **Meta** (inherits its weight, 0.8125rem / `text-meta`, 20px in every language): Secondary text: breadcrumbs, meta lines under page titles, table headers, sub-lines in rows, field labels, hints and errors under fields, status badge text, `sm` buttons, chips, tab counts, menu trails and reasons, stat labels and footers, one-line empty notes.
- **Metric** (500, 1.75rem / `text-metric`, 32px, −0.02em): The value in a `StatStrip` cell. Numbers only.
- **Count** (600, 1.25rem / `text-count`, 24px, −0.01em): Counts in rows and compact stats. Numbers only.

`text-metric` and `text-count` carry their own weight and tracking; `font-semibold` or `tracking-normal` on the same element still wins. A class string with either one must also contain `num` (guard), and a Thai unit beside the number goes in an inner `text-base` span, never on its own line in the metric size. Do not write `text-[13px]` or `text-[28px]`; use the tokens (guard).

**Three text levels:** Ink (`text-foreground`) for data values, names, titles, button text and field labels · Secondary (`text-muted-foreground`) for meta lines under titles, stat labels, calm badge text and ghost buttons · Faint (`text-faint-foreground`) for the uses listed under Neutral in §2.

### Utilities

- `num` (`font-variant-numeric: tabular-nums lining-nums`): numbers that must line up, such as `StatStrip` values. Every `table` gets `tabular-nums` from a base rule.
- `tag` (Plex Mono, `calc(1em - 1px)`, weight 400, `nowrap`, normal numerals, `user-select: all`): asset tags, document numbers and serials. One click or tap selects the whole code; inside `a`, `button`, `label` and `summary` selection is normal. Never bold (Plex Mono loads 400 and 500 only, so a bold weight is synthesized; phase 2D moved the last `font-mono font-semibold` codes to `tag`; the row's own id is `tag font-medium text-foreground`) and never resized on the same element: put `tag` on an inner `<span>` and size the wrapper (guard). First user: breadcrumb codes (`code: true`). Phase 2B put the codes of the pages it moved in `tag` (lists, detail pages, reports and the admin pages). Plan 2D-2 moved the codes of the settings form, the integration manager and the admin pages to `tag`. A code that must wrap (the asset-tag template example, the public QR URL, the one-time integration token, an API route) keeps `font-mono`, with `break-all` where it can be long, and an editable `Input` keeps `font-mono`. Plan 2D-3 moved the codes of the asset pages, the asset forms, the import, label and scan tools and the master data to `tag` (a row's own id at `font-medium`); the import batch id, the QR print target and the relationship card's asset tag must wrap and keep `font-mono`. Plan 2D-4 moved the codes of the audit, disposal, maintenance and transaction screens to `tag` (a row's own id at `font-medium`; the scan check sheet's serial through its `ReactNode` description). Codes inside a translated sentence and codes in a label string that a page builds and hands on as a string (`assetTag - name` in dialog titles, ⋯ menus, combobox options and labels the server builds) stay plain text: styling them needs a markup tag in the messages, which waits for phase 3 (the user, 2026-10-16).
- `select-chevron`: the arrow of a native `<select>` (a 16px faint chevron 10px from the right edge; the select adds its own `pr-9`). Forced-colors mode shows the system arrow. Never put it in `getFieldControlClasses()`, which also styles inputs.
- Toasts use the app font through an unlayered `:root [data-sonner-toaster]` rule (Sonner's own CSS is unlayered). The quiet toast look is a separate set of unlayered `:root [data-sonner-…]` rules (see §5 Feedback); keep them out of the font rule, which a test reads as is.

### Named Rules

**The No Display Labels Rule.** Never use display fonts, fluid hero type, or oversized marketing typography for labels, buttons, data, navigation, or form controls.

**The Thai Line-Height Rule.** Thai stacked vowels and tone marks need at least about 1.44 times the font size. `text-sm` is 22/14 in every language; on Thai pages (`html:lang(th)`, in `@layer base`) `text-xs`, `text-xl`, `text-2xl` and `text-3xl` get 18/12, 30/20, 36/24 and 44/30. An explicit `leading-*` still wins, so do not add `leading-tight`, `leading-none` or `leading-4` to Thai text. `text-meta` (20/13 = 1.54) needs no Thai override. `text-metric` (1.14) and `text-count` (1.20) are below 1.44, so they hold numbers only (the `num` guard).

**The A4 Print Exception.** A4 operation documents (check-out, check-in and transfer forms) keep `text-sm` at 20/14 through `[--text-sm--line-height:calc(20/14)]` on `.operation-print-page`, so the signature row stays on page 1. Print text is denser than screen text on purpose.

**The Thai Readability Rule.** Thai and English labels must remain readable at operational density. Do not shrink helper text or placeholders below accessible contrast or touch usability.

**The Print Fonts Rule.** PDFs (`src/lib/pdf-font.ts`, `audit-pdf.tsx`) keep the embedded Noto Sans Thai. Thermal asset labels use the app font; the app loads Thai up to 700, so labels render at 700 instead of 900. Test-print on the thermal printer before deploying; if labels are hard to read, load Noto Sans Thai Looped 900 on the label print page only.

**The Thai Copy Rule.** Thai is the primary language. Thai pages use the shared glossary in `docs/19_THAI_GLOSSARY.md` (ที่ตั้ง · รายการไม่ตรง · พิจารณา · ยืมใช้ชั่วคราว / ถูกยืม · รหัสทรัพย์สิน …) and Buddhist-era years (`src/lib/display-year.ts`). English stays only for kept terms (Serial, License, QR, LDAP, API …) and admin-only technical names. Status codes from the database always go through a label; an unknown code shows as-is rather than disappearing. Server errors show Thai first with the original text as a small muted second line (`useApiError` / `ApiErrorText`); unexpected errors show only "Unexpected error · ref xxxxxxxx", which matches the server log. A request that fails server validation (a `ZodError`) answers status 400 with `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }` (`validationFailedBody` in `src/lib/api-error-exposure.ts`): `fieldErrors` names each failing field by its dotted path (`name`, `rows.3.serialNumber`, `settings.<key>`; `_form` for none) with one code of `src/lib/field-errors.ts` (V track plan 1), and the form shows each in Thai under its field (`common.validation.*`, then the `apiErrors` catalog). A refusal that names no field the form shows falls back to "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง ตรวจสอบแล้วลองอีกครั้ง" (`apiErrors.validationFailed`); never the JSON of the zod issues.

## 4. Elevation

This system is flat. Panels, metric cards, the topbar, the register toolbar and the mobile bottom bars (except the round scan button) have no shadow: they separate from the canvas by surface color and a border (`getPanelClasses()` has no shadow, and a guard test keeps it that way). Only layers that float above the page are lifted. Heavy shadows, blurred glass, floating marketing cards, and decorative depth are forbidden.

### Shadow Vocabulary

- **Overlay** (`shadow-overlay`: `0 12px 32px -8px rgb(8 49 97 / 0.18), 0 2px 6px -2px rgb(8 49 97 / 0.1)` in light, `0 16px 40px -8px rgb(0 0 0 / 0.6), 0 2px 8px -2px rgb(0 0 0 / 0.45)` in dark): dialogs (`AccessibleDialog`, `Dialog`, `AlertDialog`), sheets, popovers, dropdown menus and toasts. Nothing else.
- **Field halos** (`shadow-field-focus`, `shadow-field-error`): the 4px rings around a focused or invalid field (§5 Inputs). They mark state, not elevation.
- **Scrim** (`bg-scrim`: `rgb(8 49 97 / 0.45)` in light, `rgb(3 8 18 / 0.72)` in dark): the backdrop behind dialogs, alert dialogs and sheets. The camera scanner keeps its own darker backdrop.

### Motion

Sheets open in 250ms and close in 200ms with ease-out. Dropdown menus, submenus and popovers fade in with a 4px slide over 160ms (ease-out) and fade out in 100ms, with no zoom. Scrims, dialog, alert-dialog and sheet content, menus and popovers use `motion-reduce:animate-none!` (the `!` beats the `data-[state]:animate-*` classes), so reduced motion turns the animation off. A menu item's highlight appears at once and fades out in 150ms. Toasts follow sonner's own reduced-motion rule. The spinners of `Button busy` and `SearchField` use `animate-spin motion-reduce:animate-none`.

### Named Rules

**The Border First Rule.** Use a border and tonal surface for grouping. Do not add `shadow-sm` to panels or cards; only floating layers use `shadow-overlay`. Phase 2A removed `shadow-sm` from every panel, card and section. Six stay on purpose: 3 controls that float over a camera image or a photo (`scanner-text-input.tsx` ×2, `audit-scan-check-form.tsx`) and 3 paper previews (`asset-label-print.tsx`, `operation-document-print.tsx`, the label sample in `system-settings-form.tsx`). Two larger shadows stay: the mobile bulk-action bar of the register (phase 3, with QR label printing; plan 2B-3 kept its place, frame and shadow) and the round scan button (kept since phase 1). Plan 2D-2 moved the 2 floating add buttons of the roles and users pages into their page headers. Phase 2C replaced the 2 sticky save bars with the flat `StickyFormFooter`. The guard `R2 only floating layers, camera controls and paper previews cast a shadow` (`tests/visual-foundation-guards.test.ts`) holds exactly these 8 in its `EXEMPT` list (spec 2D §5.1): 7 `permanent` and the register's bulk-action bar `phase 3`. Any other shadow fails, and so does a row whose shadow is gone.

**The No Floating Marketing Cards Rule.** Panels must not become decorative cards arranged for landing-page drama.

## 5. Components

Components should feel consistent, restrained, and task-first. Shared primitives and helpers live in `src/components/ui/` and `src/lib/design-system.ts`: buttons, fields, menus, toasts, notices, empty states, panels, tables and mobile cards. Build new surfaces from them; do not copy their class strings into pages.

### Buttons

- **Build them with** `Button` / `buttonVariants` (`src/components/ui/button.tsx`, `button-variants.ts`). A `<Link>` or `<a>` takes `className={cn(buttonVariants({ variant, size }), …)}` (server or client) or `<Button asChild>` (client). Keep only layout classes (`w-full sm:w-auto`, `flex-1`, `self-end`, `min-w-0`) in `className`.
- **Shape:** Gently curved rectangles: 8px (`rounded-md`) for `md`, `lg`, `default`, `icon` and `icon-lg`, the same as fields; 6px (`rounded-control`) for the small `sm` and `icon-sm`. Every variant has a 1px border, so all variants have the same box. Icon and label sit 6px apart (`gap-1.5`); the cursor is a pointer.
- **Sizes** (height from `md` up; below `md` every size is at least 44px tall, `min-h-11`):

| Size | Height | Side padding | Text |
|---|---|---|---|
| `sm` | 32px | 10px | `text-meta` 13/20 |
| `md` | 36px | 14px | `text-sm`; every `PageHeader` button |
| `lg` | 40px | 16px | `text-sm`; only a text button in the same row as a 40px field (the label print toolbar) |
| `default` | 36px, the same as `md` (since plan 2D-1) | 14px | `text-sm`; dialog footers follow it |
| `icon-sm` | 32 × 32px | — | — |
| `icon` | 36 × 36px (since plan 2D-1) | — | — |
| `icon-lg` | 40 × 40px | — | only an icon button in the same row as a 40px field (the remove, move and copy buttons of the repeating field rows); a cva size, not a token (spec 2D D5) |

- **Variants** (every text pair passes AA; `tests/design-system.test.ts` pins the classes):

| Variant | At rest | Hover | Pressed | Use |
|---|---|---|---|---|
| `default` | Primary #1E4F94 fill, `primary-foreground` text | `primary-hover` #173E76 | `brand-navy` #083161 | The main action |
| `outline` | Panel fill (`bg-surface`), `control-border` #C3CDDA border, ink text | `background` fill, `input` border | `muted` fill | Secondary actions |
| `ghost` | No fill or border, `muted-foreground` text | `background` fill, ink text | `muted` fill | Quiet and icon-only actions. Not on a `bg-background` footer, where its hover fill is invisible: use `outline` there |
| `danger` | Panel fill, `danger-border` border, `danger` text | `danger-soft` fill | `danger` border | A destructive action placed in a page |
| `destructive` | Solid danger fill, `danger-foreground` text | `danger-hover` | — | Only the confirm button of a destructive dialog |
| `warning` | Solid warning fill, `warning-foreground` text | `warning-hover` | — | Saving an audit check that differs, the 2 audit "not found" confirms (mark an asset not found, report a missing component), and `ConfirmTextDialog` with tone warning |

- There is no `secondary`, `link` or `success` variant: use `outline`, `linkVariants` and `default`.
- **Disabled:** never faded with opacity (a guard allows no `disabled:opacity-*` in `src`, spec 2D §5.4). Every variant turns to the `background` fill, `border` border and faint text with a not-allowed cursor (`disabled:` and `aria-disabled:`); the disabled look wins over every hover and pressed state. `aria-disabled` also blocks pointer events, for `asChild` links, busy buttons and the prerequisite gates of **Forms: Errors Under the Field**, which stay focusable and point at their reason.
- **Busy:** pass `busy` while the action runs. The button gets `aria-busy` and `aria-disabled`, shows a spinner (`Loader2`, stopped under reduced motion) in place of its leading icon or in front of its label, and ignores clicks, Enter, Space and implicit form submission, but keeps keyboard focus. `disabled` may hold another condition, such as another action of the form running, but never the busy one, never a rule about what the person typed (that is an error under the field) and never a prerequisite the person can meet (that is `aria-disabled` with its reason, **Forms: Errors Under the Field**): write `busy={saving} disabled={x}`, never `disabled={saving || x}`, or focus drops to `<body>` (guard GB4 in `tests/form-migration-guards.test.ts`). `busy` cannot be combined with `asChild` (type error), and it must come from client state: a server file cannot pass it. The label does not change while busy (no "กำลังบันทึก…", phase 2C ruling K13, guard GB3): the spinner, `aria-busy` and the disabled look say that it is working.
- **Focus:** `focus-visible:ring-2 ring-ring ring-offset-2`, teal #10858D on every variant, danger included.
- **Text links:** `linkVariants({ size })`: primary text whose underline appears on hover and keyboard focus. `size: "meta"` (13px, no wrap, the default) for a stand-alone command link such as "ล้างทั้งหมด"; `size: "inherit"` for a link inside a sentence. It has no 44px box; a stand-alone link on mobile adds `inline-flex min-h-11 items-center md:min-h-0`. A count that opens a filtered list (a drill-down) is such a link: `cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")` in a table cell (13px `linkVariants()` in the brand picker), and a zero is plain `formatCount(0)` (plan 2D-3, the master-data lists).
- **Legacy:** none left. Plan 2D-1 moved the retry button of `src/app/[locale]/(dashboard)/error.tsx` to `Button` and deleted `ActionButton`, `getActionButtonClasses`, `getSafeActionLinkClasses` and `getResponsiveActionRowClasses` (the readiness and import-export links are `buttonVariants({ variant: "outline", size: "md" })`), together with the other helpers of `src/lib/design-system.ts` that had no caller. `getTouchIconButtonClasses` was removed earlier: use `Button size="icon"`.
- **Hand-written buttons:** phases 2B, 2C and 2D moved them onto `Button` and `buttonVariants`. Phase 2B moved the header, filter, row and pager buttons of every page it moved and phase 2C the form and dialog buttons of its files (batch 5 turned the repair attachment delete dialog into `useConfirm`); plan 2D-1 the readiness links; plan 2D-2 the topbar and sidebar buttons, the report and work-center links, the storage archive button and the two floating create buttons, now `PageHeader` actions; plan 2D-3 the asset page's quick actions (one the asset cannot take is a disabled `Button`), the attachment, purchase-document and import buttons and the master-data drill-down links; plan 2D-4 the field audit scanner's commands (the camera toggle sits in `SearchField`'s `trailing` slot), the round close button and the disposal, repair and print-document buttons. A raw `<button>` stays only in a shared part that owns it (the guard's `OWNERS`, spec 2D §5.2) or at a site of the guard's `EXEMPT` list (spec 2D §5.1), such as a row, option or thumbnail that is itself the control, or a control drawn over the camera image. To move one, pick the size from its desktop height: `h-8` → `sm`, `h-9` or any `h-10` that is not beside a 40px field → no size (`default`, 36px since plan 2D-1), `h-10` beside 40px fields → `lg` (or `icon-lg` for an icon button). A button that is 44px tall on desktop (`min-h-11` only, dialog footers included) also takes no size and is 36px (phase 2C ruling K7, spec 2D D3).
- **Order (K8):** the primary action comes last in the DOM, so the visual order and the Tab order agree. In a form's button row, a dialog footer and `StickyFormFooter`, the secondary action (Cancel) comes first. Phones stack the buttons full width with Cancel on top and the primary action at the bottom (`flex-col`, never `flex-col-reverse`); from `sm` they form a right-aligned row. Guard GD4 allows no `flex-col-reverse` in `src` (none is left).
- **Delete icons:** an icon button that removes a row and is neutral at rest uses `outline`, with no red on hover (phase 2C ruling K22); one that is red at rest stays `danger`. Taking a file out of an upload queue is the `outline` `icon-sm` button of `FileQueueList`.
- **`Segmented`** (`src/components/ui/segmented.tsx`, server-safe): a row of toggle buttons where exactly one is on (`aria-pressed`), named by its required `aria-label`. A panel-colored frame (`bg-surface`) with a `border` line, 8px corners and 2px padding and gap; options use `rounded-control` and `text-sm`. The chosen option is `primary-soft` with `primary-hover` text at weight 600; the others are weight 500 `muted-foreground` with a `background` hover. `size` `sm` is 32px from `md` (the default) and `md` 36px; below `md` both are 44px. `fill` stretches the frame and shares it equally, and `showCheck` puts a check before the chosen label so the choice does not rely on color. Values are strings, and every option is its own Tab stop. The focus ring has no offset, because the options are only 2px apart.

### Focus

- One focus color on every light and panel surface, danger and destructive controls included: `--ring` #10858D; inside the navy menu the rows take `--sidebar-ring` #5FD6DD. Focus classes use `ring-ring` / `border-ring` (`ring-sidebar-ring` in the menu); `(focus|focus-visible|focus-within):(ring|border)-(primary|brand-accent|danger|success|warning|info|destructive)` and see-through `focus-visible:ring-*/NN` rings are blocked by `tests/visual-foundation-guards.test.ts`.
- A base rule gives every `:focus-visible` element without its own ring a `2px solid var(--ring)` outline with a 2px offset. Elements focused by code (`tabIndex={-1}`) and the sheet, alert-dialog and dropdown containers use `outline-none`.
- Windows high-contrast mode: an unlayered `@media (forced-colors: active)` rule draws a `CanvasText` outline, because box-shadow rings disappear there.
- Menu rows draw `ring-sidebar-ring` outside the row on the menu color (`ring-offset-2 ring-offset-sidebar`; 8.27:1 in light, 8.95:1 in dark), never relying on the open row's fill (4.67:1 and 4.64:1). Anything in the menu without its own ring keeps the base `--ring` outline, 3.24:1 on the menu (5.48:1 in dark).
- Every other `ring-offset-2` gap takes the panel color: a base rule sets `--tw-ring-offset-color: var(--card)` (Tailwind's white in light), so no white gap shows in dark, and the ring reaches 3:1 on the panel in both themes.
- Dropdown menu items take the base outline inside the row (`focus-visible:-outline-offset-2`), because rows touch the panel edge (the ring reaches 3.82:1 on `primary-soft` and 3.93:1 on `danger-soft`).
- Fields use `focus:border-ring focus:ring-1 focus:ring-ring` plus the 4px `shadow-field-focus` halo; a field with `aria-invalid` turns back to teal while focused. Never write `focus:border-danger`.
- Toasts and their close button use `outline: 2px solid var(--ring)`, which stays visible in forced-colors mode.
- `FileDropzone` hides its file input with `sr-only`, which clips an outline, so its label draws the outline instead (`has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring`).
- `ChoiceCard` and `ChoiceChip` show the outline of their own input, which stays visible (never `sr-only`).

### Status Badges

- **Style:** One `StatusBadge` (`src/components/ui/status-badge.tsx`, variants in `badge-variants.ts`) in one size and two tiers, each with a marker whose shape carries the meaning, so color-blind users can tell states apart.
  - **Size:** 22px tall in every language (`h-5.5`, the table line), `text-meta` 13/20 at weight 500, 6px corners (`rounded-control`), no vertical padding. There is no `size` prop any more.
  - **Calm tier** (no fill, no side padding, so it lines up with other text in a column; muted-foreground text): `info` = hollow ring in info teal (open, planned, reported, and unknown asset states) · `success` = solid dot in success green (including Ready and In Use) · `primary` = solid dot in primary (approved, done, received) · `neutral` / `muted` = short bar in `neutral-ink` #2A4468.
  - **Attention tier** (soft fill, border, 8px side padding and tone ink text): `warning` = triangle · `danger` = diamond.
- **Database colors are not shown.** Status colors stored in the database (`asset_statuses.colorCode`, `asset_conditions.colorCode`) are no longer used on badges; the `color` prop and `getStatusDotColor` were removed. The data itself is unchanged. Since plan 2D-3 the label tool and the scan search also take the tone from `status.name` (`getAssetStateTone`, spec 2D D8, M23), so no screen shows a database color. An active master-data record is `StatusBadge` `tone="success"` with `tCommon("active")` (the old `ActiveBadge` pill is gone), and the activity drawer and the movement timeline mark their items with the same marker shapes (`statusMarkerVariants`).
- **State:** Every badge carries a text label. Tones follow workflow meaning (`getStatusTone`, `getAssetStateTone`). Markers use `forced-color-adjust-none` so they stay visible in high-contrast mode, and there they use the system text color (`forced-colors:bg-[CanvasText]`, the info ring `forced-colors:border-[CanvasText]`) so they also show on dark high-contrast themes.
- **`Chip`** (`src/components/ui/chip.tsx`, server-safe, since plan 2D-2): a name, not a state. A neutral 22px chip (`h-5.5`, `bg-muted`, `text-neutral-ink`, `text-meta` at weight 500, `rounded-control`, a transparent border that forced colors draw) with no marker, no tone and no control; a long name truncates. Use it for roles, role kinds, scopes, approvers, modules and report cadences; a code inside it is a `tag`. A state is a `StatusBadge`, a count plain `num` text, a choice `ChoiceChip`, a removable filter `FilterChipList`.

### Dialogs, Menus and Confirmation

- **Primitives:** Overlays use shadcn/ui on Radix (`src/components/ui/`): `AccessibleDialog` for forms and reviews, `AlertDialog` (only through `useConfirm()`) for a yes-or-no question, `Sheet` for side drawers and mobile navigation, `DropdownMenu` for action menus, `Popover` for help and pickers, `AttachmentPreviewDialog` for image/PDF preview. Every overlay closes with Escape, traps focus, returns focus to its trigger, locks page scroll, and renders in a portal. Dialogs opened without a Radix Trigger restore focus to their opener themselves (`returnFocusRef` / `fallbackFocusRef` on `AccessibleDialog`, `returnFocusRef` on `confirm()`).
- **`AccessibleDialog` parts** (`src/components/ui/accessible-dialog.tsx`): the header holds the 16px semibold title and an optional `description` (a `ReactNode`: a record code in it is wrapped in `tag`, and a name after the code follows " · "). Below it the content slot scrolls. A dialog with fields or buttons uses `AccessibleDialogBody` (the panel color, `px-4 py-4 sm:px-5`, scrolls on its own, no gap of its own) and `AccessibleDialogFooter` (outside the scroll area, so it is always visible; `background` fill, a `border-soft` top line, `px-4 py-3 sm:px-5`, buttons only). A `<form onSubmit>` wraps both and takes `className={accessibleDialogFormClasses}`; without it the whole form scrolls and the footer can scroll away (guard GD6). Every `AccessibleDialog` in `src` has its footer part (guard GD2); none waits for the parts any more.
- **Footer buttons (K8):** `AccessibleDialogCancel` first (an `outline` button, "ยกเลิก" by default, that closes the dialog), any other secondary action next, the primary action last, so the visual order is the DOM and Tab order. Phones stack them full width with Cancel on top; from `sm` they form a right-aligned row that may wrap. The footer holds only `Button` and `AccessibleDialogCancel`, with no `className`, no `size=`, no hand-written `<button>`, no `Loader2` and no `flex-col-reverse` (guard GD3). The primary action is `default`; `destructive` only confirms a destructive action; `warning` is for the 2 audit "not found" confirms. Footer labels stay under 40 characters; a sentence goes into the body as a `Notice`.
- **Busy dialogs:** Pass `busy` while saving; the dialog then ignores Escape, outside clicks and the close button, `AccessibleDialogCancel` is disabled, and the button that started the work stays where it is with `busy`, so focus stays on it.
- **Errors:** a field's error in an open dialog shows under that field, and the dialog's save focuses it (**Forms: Errors Under the Field**). An error from the dialog's action that names no field it shows (a conflict, a network failure, a refusal of the whole action) shows inside the dialog, as the first thing in its body: `<Notice tone="danger" role="alert">`. A modal hides the page behind it from sight and from screen readers, so a message there is lost; the page shows its own error box only while no dialog is open (the integration client edit dialog, 2C plan 4). A review dialog whose form the server refuses on a field closes first, and then the field takes focus (`reveal` with `waitForDialogToClose` in `src/lib/field-focus.ts`).
- **Close X:** a `ghost` `icon` `Button` in the top-right corner of every dialog and sheet, named "ปิด" (`common.close`). Pass `closeLabel` only when the name really differs. While the dialog is busy, the X is disabled and has no box. The X comes first in the DOM and the Tab order (it is `absolute`, so nothing moves), and focus still opens on the first control of the content: `DialogContent` and `SheetContent` call `focusFirstContentControl` (`src/components/ui/dialog-focus.ts`) from `onOpenAutoFocus` after the caller's own handler, unless that handler already moved focus (`initialFocusRef`, the scan room picker). When nothing in the content can take focus, Radix's default (the X) applies. Shift+Tab from the first field reaches the X (plan 2D-2, spec 2D D18).
- **Phones:** the dialog box sits at least 12px above the bottom edge and clear of the iPhone home bar (`bottom-[max(0.75rem,env(safe-area-inset-bottom))]` on the box); the footer adds no padding for it. Bottom sheets pad the home bar (`pb-[env(safe-area-inset-bottom)]`).
- **A dialog rendered inside another `<form>`** (the asset-number prefix dialog of the settings page) has no `<form>` of its own and no `type="submit"`. React sends `submit` up the component tree, through the portal, so a nested form would save the whole settings page (guard GD5). If Enter should ever act there, use an `onKeyDown` handler.
- **Sheets:** the panel color (`bg-surface`, like dialog bodies). `SheetHeader` has a bottom line and is 56px tall (`py-4 pr-16`, room for the X), and `SheetTitle` is 16px semibold. Callers do not restyle a sheet: no fill, header or title classes, and no `closeLabel` unless the name differs. A line under the title is `SheetDescription` (14px `muted-foreground`), which Radix reads as the sheet's description; a sheet without one passes `aria-describedby={undefined}`. An empty list inside a sheet is an `EmptyNote`, not a dashed box (2C plan 4, O14).
- **Confirmation:** Never use `window.confirm`. Call `await confirm({ title, confirmLabel, tone })` from `useConfirm()`; destructive actions use `tone: "destructive"` and report the actual result ("ลบแล้ว", not "บันทึกสำเร็จ"). `confirmLabel` names the action with a verb ("ลบ", "เพิ่มสิทธิ์", "ละทิ้งรายการที่เลือก", "ออกโดยไม่บันทึก"), never the "ยืนยัน" it falls back to: since phase 2C plan 5 every call passes one, and `tests/confirm-dialog-ui.test.ts` fails on a call without it. The confirm dialog (`AlertDialog`) has the dialog look (phase 2C ruling K12): a panel-colored box with 12px corners and `shadow-overlay`, 12px above the bottom edge and the iPhone home bar on phones, centered and at most 512px wide from `sm`; a header with the 16px semibold title, left-aligned, the 14px `muted-foreground` description and a bottom line; then the footer band (`background`) with Cancel first, stacked full width on phones and a right-aligned row from `sm`. It has no body and no X: Cancel and Escape close it, focus starts on Cancel and returns to the button that asked.
- **Menus never contain dialogs.** A menu item only opens a dialog or drawer that is rendered outside the menu, and that dialog returns focus to the menu trigger.
- **Menu panels** (`DropdownMenuContent`, `PopoverContent`, `Command`): 12px corners (`rounded-lg`), the popover color (`bg-popover`: white in light, a step above the panels in dark), `border`, `shadow-overlay`. Dropdown panels are at least 240px wide (`min-w-60`, so callers do not set narrower widths), with `p-1.5` and 1px between items; the popover keeps `w-72 p-4`.
- **Menu items:** 36px from `md` up and 44px below, 6px corners, `text-sm` ink, 16px icons in `muted-foreground`. Hover and arrow keys highlight with `primary-soft`; pressing shows `muted`; `variant="destructive"` is danger text with a `danger-soft` highlight. Group labels are 12px medium `muted-foreground`, separators are `border-soft` lines, and `DropdownMenuShortcut` is the faint 13px trail at the end.
- **An item that cannot run now keeps its reason readable and reachable:** use `<DropdownMenuItem unavailable>` with `<DropdownMenuItemText>{title}<DropdownMenuItemDescription>{reason}</DropdownMenuItemDescription></DropdownMenuItemText>`. It sets `aria-disabled` without Radix `disabled`, so arrow keys and type-ahead still reach it and a screen reader reads the reason; Enter or a click neither closes the menu nor runs the action. Faint text, no fill, no opacity. `unavailable` cannot be combined with `asChild` (type error: the link would navigate first). Radix `disabled` stays for short states whose reason is on screen (while deleting, the last visible column).
- **Checkbox and radio items:** a checkbox item draws a 16px box in front of its label (`input` border; checked = primary fill with a `primary-foreground` check); a radio item shows a primary check at the end; the chosen item is `font-medium`. No leading dots.
- **Command lists** (`SearchableSelect`): the search box is a box inside the panel (6px corners, `background` fill, focus halo, `text-base md:text-sm` so iOS does not zoom), the highlighted option is `primary-soft`, and only the chosen option shows a check, at the end. Its trigger is a button and takes no `aria-invalid`: with `error` it shows the field error look through `data-invalid` (`triggerInvalidClasses`, teal again while focused or open), shows the error under itself tied by `aria-describedby`, and takes a stable `id` so a save can focus it; `MaintenanceOptionSelect` and `AuditScanCheckField` pass `id` and `error` on. Global search rows use the same highlight and a footer of `Kbd` hints (↑↓ เลือก · Enter เปิด · Esc ปิด).
- **`Kbd`** (`src/components/ui/kbd.tsx`): a 20px key cap with 4px corners, `font-sans` (preflight makes `kbd` monospace) and `text-xs` on a 16px line, which is safe because keys hold only Latin letters and symbols.
- **Language menu:** a radio group; each language is written in its own language with a `lang` attribute ("ภาษาไทย", "English"); no flags. No emoji anywhere in `src` or `messages` (guard). Screen-reader names in the topbar come from messages (`nav.openMenu`, `nav.toggleSidebar`, `nav.languageMenu`, `nav.userMenu`, `nav.closeMenu`).

### Feedback: Toasts, Notices and Empty States

- **Toasts** (`AppToaster` in `src/components/ui/app-toaster.tsx`, mounted once in `src/app/[locale]/layout.tsx`; call sites keep `toast.*` and `useApiError().toast`): quiet. A card in the panel color (`--card`) with a `border`, 12px corners and `shadow-overlay`, 380px wide, 8px under `--shell-top` (the 56px top bar plus the banner region), right 16px, the same on phones, shown for 6 seconds. The tone is the icon (`toneIcons`: success `CircleCheck`, info `Info`, warning `TriangleAlert`, error `OctagonAlert`); only warning and error toasts get a soft fill and a tone border. The title is 14/22 at weight 500 in ink, the description 13/20 `muted-foreground`. Every toast has a 24px close button ("ปิด", `common.close`), and the region is named "การแจ้งเตือน" (`notifications.title`); Alt+T then Tab reaches them. Toasts are hidden in print. No `richColors` and no `theme` prop: toasts follow the theme through the tokens. The CSS is a set of unlayered `:root [data-sonner-…]` rules in `src/app/globals.css` tied to sonner 2's data attributes; check them in the browser again after a sonner upgrade. A toast never says what is wrong with a field (guard V3 in `tests/validation-guards.test.ts`): it is for what no field can show, a network failure, 401 or 403, a 409 conflict, a 5xx or a step after a save that did not finish (an upload).
- **`Notice`** (`src/components/ui/notice.tsx`, `tone` required): `warning` and `danger` are boxes (soft fill, tone border, 8px corners, 18px icon) for something the user must deal with now; `info`, `neutral` and `success` are inline lines with a 16px icon and no box. With a `title`, the body is 13/20 `muted-foreground`; without one, the body is 14/22 ink. `action` holds a `Button size="md"`. Never faint text, `/NN` tints or a tone-colored paragraph inside.
- **`ActionEmptyState`** (`src/components/ui/action-empty-state.tsx`): empty, error and permission states of a page or table that have a title, a description or an action. No box, border or fill (centered, `py-10`); a 24px icon without a circle (empty faint, error danger, permission warning); a 16px semibold title; the default action is `buttonVariants({ size: "md" })`, and `actionVariant="secondary"` makes it an outline button (use it for "ล้างตัวกรอง", shown only while a filter is active).
- **`EmptyNote`** (`src/components/ui/empty-note.tsx`): one quiet 13/20 faint line for lists, panel sections and empty table rows. `tone="clear"` adds a check in the text color (not green) for "nothing to do"; `padded` adds `px-5 py-4` when the container has no padding: `TableEmptyRow` uses it, and so does an empty `ContentPanel divided flush`.
- **Which one:** one line of text → `EmptyNote`; a title, a description or a button → `ActionEmptyState`.
- **Live-region roles are written at the call site, never derived from the tone:** `role="alert"` for a form-level failure after the user acted (a login failed, a dialog's `Notice` for a refusal that names no field), never for a field's error, which focus reads once (**Forms: Errors Under the Field**); `role="status"` or `aria-live="polite"` for a result that appears by itself (saved, queued offline, copied); nothing for text that is there when the page loads.

### Cards / Containers

- **Corner Style:** 12px (`rounded-lg`) for main content panels, `DataTable` frames, `StatStrip`, metric cards, dialogs, menus, popovers, the command panel and toasts; 8px (`rounded-md`) for compact tables, filter chips (`FilterChipList`), the page-size frame of `Pagination`, nested control surfaces, `Notice` boxes, `ChoiceCard`, `md`/`lg`/`default`/`icon` buttons and every field (inputs, selects, textareas, `SearchField`, the `SearchableSelect` trigger, `FileDropzone`); 6px (`rounded-control`) only for small controls: `sm` and `icon-sm` buttons, the options of `Segmented`, chips (`ChoiceChip`), status badges, menu items and the search box inside a menu. `rounded-sm` stays 4px (checkbox boxes, `Kbd`). Never write `rounded-[6px]` (guard).
- **Background:** Surface on Canvas. Quiet groupings inside a panel use Soft System Background, a solid token (never `bg-muted/NN` or `bg-accent/NN`). Empty states have no box of their own (see Feedback), and only the shared parts that draw one have a dashed border (`FileDropzone`, the `SignaturePad` canvas; guard, spec 2D §5.4).
- **Shadow Strategy:** None. Panels and metric cards are flat bordered surfaces (see §4).
- **Border:** Border is the default structural line; inner dividers use `border-soft`. Tinted boxes (`Notice` warning and danger, and the mismatch box of a field audit check field, see Field Audit / QR Workflows) use `border-{tone}-border`; `MetricCard` and its tone fills are gone since plan 2B-5, and the dashboard's tinted action cards since plan 2D-2 (they are `StatStrip` cells). Avoid colored side stripes and decorative borders.
- **Internal Padding:** 16px on mobile and compact panels, 20px where dashboard or form grouping needs more breathing room.
- **`ContentPanel divided`** (`src/components/ui/content-panel.tsx`): a panel with a head row at least 56px tall and a line under it (a 16/600 `h2`, a 13/20 description, the actions in one wrapping row) over a body padded 16px (20px at the sides from `md`). With `flush` the body has no padding and holds a table or a full-width list (`ContentPanelRows`: `border-soft` lines, `px-4 py-3 md:px-5` rows), so a frame never sits in a frame. Without `divided` the panel is the plain one. An element that cannot be a `ContentPanel` (a `<form>`, a `<details>`, a card in a page grid, a scroll target that needs an `id`) takes `cn(getPanelClasses(), "p-4 sm:p-5")`, the same frame and spacing; a frame inside a panel becomes a quiet grouping or goes (plan 2D-2).
- **`KeyValueList`** (`src/components/ui/key-value-list.tsx`, server-safe): the label and value pairs of a detail page, a 13px faint label in a 120px column and the values in ink; below `sm` one column, each label above its value. Use one list per group of facts. Empty values show `Nil`, and `nilLabel` names an empty value that needs more than "ไม่มีข้อมูล" (an empty custodian reads "ไม่มีผู้ถือครอง"); 0 and `false` show as values. Pass `null` for a missing date, never the "-" a date formatter prints. A code with its name reads `<span className="tag">CODE</span> - name`, and money carries its unit (`formatMoney(x, { unit })`) unless its label already ends in "(บาท)". Guard LK1 allows no local label-and-value helper anywhere in `src`: `Info`, `InfoRow`, `DetailItem` and every look-alike a later plan removed are named in its `LOCAL_KEY_VALUE`, and none is left.
- **`StatStrip`** (`src/components/ui/stat-strip.tsx`, server-safe): the numbers above a list, in one 12px frame with 1px lines between the cells and no fill. A cell is a 13/500 label, the value in Metric with `num` (already formatted) and an optional faint foot of at most two lines (longer text ends in an ellipsis and `footTitle` gives the whole of it; plan 2D-5); two columns below `lg`, one row from `lg`. A cell with `href` is one stretched link named by its label; the cell of the filter in use has `primary-soft`, a 2px primary line and `aria-current="page"`; a cell that needs action has a warning foot line with its icon (guards LS1, LS2). Since plan 2B-5 it is the one number tile of the lists, the detail pages, the reports and the work center, and since plan 2D-2 of the dashboard and the integration clients (`MetricCard` is deleted; guard LS2 is empty): a strip of money is one tile a row below `sm` (`max-sm:grid-cols-1`; the accounting strips keep two a row from `lg`), and more than four numbers split into strips of at most four (`splitStatRows` in `src/lib/stat-strip-rows.ts`: the work center and the dashboard's 4 + 3 KPIs), so a 28px value is never cut; five counts of at most two digits may share one strip (the disposal batch page and the two bulk disposal dialogs, plan 2D-4). A cell links where the old tile linked (the report drill-downs, the work-center queues).
- **Detail pages** (since plan 2B-4; their header follows **Page header** in Navigation): the facts are `KeyValueList`s, one per group, inside the panel or section they belong to. A record's counts are a `StatStrip`: each value is a number or a short yes/no, the sentence that explains it goes in the foot line, and a count that needs action takes `attention` instead of a tone fill. A money total needs a wide cell: the supplier page puts its two totals in a second strip that is one column below `lg` (`className="max-lg:grid-cols-1"`), because a 28px amount with "บาท" does not fit a fifth of a 1024px strip or half a phone screen. A history table inside a padded section is `DataTable framed={false}` with a `caption` (the section's title) and `scrollHint`; a table on its own keeps its frame (the supplier's purchase documents). The asset page's view tabs are `TabNav`, rendered by the client wrapper `AssetDetailTabs`, which keeps the sideways scroll and the snap (`linkClassName="snap-start"`), brings the current tab into view and shows the edge cue.

### Inputs / Fields

- **Primitives** (`src/components/ui/`, no `"use client"`, so server pages can use them): `Input`, `NativeSelect` (a native `<select>`; the name `Select` is taken by local helpers and kept free for a Radix select), `Textarea`, `Field` (label, hint, error and their ids), `SearchField` (icon, clear button, spinner) and `checkboxVariants`. Their classes come from `fieldControlVariants({ fieldSize })` in `field-variants.ts`; `getFieldControlClasses(options?)` (`src/lib/design-system.ts`) returns the same classes for controls that cannot use a primitive, such as the `SearchableSelect` trigger. The size prop is `fieldSize`, never `size` (`size` is a numeric HTML attribute of `<input>` and `<select>`).
- **Style:** 8px corners (`rounded-md`), `border-input` #7C8BA0, panel fill (`bg-surface`), 12px side padding. The border reaches 3:1 on card, background and canvas; never place a field on `bg-muted`, where it reaches only 2.97:1. `control-border` is for buttons only.
- **Sizes:** `fieldSize` `md` 36px, `lg` 40px (the default) and `xl` 48px from `md` up. Below `md` every size is 44px tall (`xl` 48px) with 16px text, so iOS does not zoom; from `md` up the text is 14px (`xl` keeps 16px).
- **Focus:** `focus:border-ring focus:ring-1 focus:ring-ring` plus a 4px halo (`shadow-field-focus`, the ring at 16%). An open `SearchableSelect` (`aria-expanded`) looks focused.
- **Error:** set `aria-invalid` (`Field` does it when `error` is set): a `danger` border, 1px ring and 4px halo (`shadow-field-error`, danger at 14%). While focused the field turns back to teal, and the error text under it stays. Never write `focus:border-danger` or `aria-invalid:focus:ring-danger` (one focus color).
- **Disabled:** `background` fill, `border` border, faint text, not-allowed cursor, no opacity. **Read-only** (`Input` and `Textarea` only): `background` fill and `border` border with normal text, still focusable and copyable.
- **Placeholder:** the faint ink from one base rule (`::placeholder`, 5.77:1 on the panel, 5.91:1 in dark); never add `placeholder:text-*` (guard).
- **`Field`:** the label (13/20, weight 500, ink: `fieldLabelClasses`) sits above the control; the hint (13/20 faint) and the error (13/20 `text-danger`, under the hint, no alert role) sit below it, and `aria-describedby` reads the error first. Write `label=` as its first prop. `required` shows the warning-colored `*` (`FieldRequiredMark`, `aria-hidden`) and sets `aria-required`; it does not add the native `required`. Keep the native `required`, `maxLength` and `minLength` on the control inside `Field` (phase 2C ruling K4): they bring the phone keyboard and the screen reader's "required", the form's `validate()` restates them because the form has `noValidate`, and guard GF5 keeps their count per file from dropping. `Field required` and the control's `required` go together (guard GF4), except in a form that checks itself (`noValidate` and `validate()`), where the star may stand alone because `validate()` checks the field; `STAR_ONLY` is empty. `labelAction` puts one icon button with its own name, such as the status help popover, beside the label and outside the `<label>`, so clicking it does not move focus to the field. Do not wrap `SearchableSelect` in `Field` (it has its own label), and never put `Field` inside a `<label>`. Every form shows its errors under its fields (**Forms: Errors Under the Field**): `error` comes from the form's `useFieldErrors`, and `liveError` takes only the text of a check that runs while typing. A field never sits on a status soft fill: it follows the warning `Notice` that explains it, outside the fill, so its hint stays the faint `FieldHint` (the historical exception reason of the bulk execution dialog since plan 2D-4); faint ink never sits on a soft fill (§2, Neutral). A field repeated in every card of a list keeps the same visible label and adds `aria-describedby` with the id of its card's name, which `Field` reads before its own error and hint, so a screen reader says which card the field sets (the severity of each data-quality rule, phase 2C ruling K20).
- **Groups of checkboxes or radios:** `<fieldset className="min-w-0">` with `<legend className={cn(fieldLabelClasses, "mb-1.5")}>` and `<FieldRequiredMark />` for a required group. `min-w-0` stops a fieldset (`min-inline-size: min-content` by default) from pushing a phone page sideways. A group with a rule is `FieldGroup` (`src/components/ui/field-group.tsx`): that fieldset and legend with a hint and one error under the group, tied by `aria-describedby`; a save focuses its checked radio or first control.
- **Fields without a visible label** use `Field hideLabel` (the label is `sr-only`; id, hint and error still work), for example in table cells. Only a `SearchField` or `ScannerTextInput` with no hint takes `aria-label` instead; `ScannerTextInput` passes `aria-label` and `disabled` on to its text field.
- **Money fields:** the unit is part of the label ("ราคาซื้อ (บาท)", the `…Baht` message keys), and the control has `inputMode="decimal"` next to `step="0.01"` (guard GF6). Read-only displays keep their own keys, whose values already show ฿.
- **Native select arrow:** `select-chevron` (§3 Utilities); forced-colors mode shows the system arrow.
- **Checkboxes and radios** stay native: the primary color comes from `accent-color: var(--primary)`, focus from the base outline, and `checkboxVariants` sets the size; the 44px target is the row's `<label>`. Never `accent-primary` or a hand-drawn box (guard GF7). A hand-written checkbox row inside a form adds `onKeyDown={preventEnterSubmit}`.
- **`ChoiceCard` / `ChoiceChip`** (`src/components/ui/choice-card.tsx`, a client component): radio and checkbox options drawn on the browser's own input inside a `<label>`. The input stays visible, so the choice never relies on color, browsers without `:has()` still show it, and focus is the input's own outline. Pass `type="radio"` or `"checkbox"` and the usual input props (`name`, `checked`, `onChange`, `required`, `disabled`).
  - `ChoiceCard` is a full-width card: 8px corners, at least 44px tall, a `control-border` line, an optional `description`. The chosen card has a `primary` border on the `primary-soft` fill.
  - `ChoiceChip` is a small inline option: 6px corners, 32px from `md` and 44px below, an optional faint `detail` such as a count. The chosen chip has a `primary-border` line, the `primary-soft` fill and `primary-hover` text.
  - A disabled option keeps its fill when it is chosen. Enter on them never submits the form (`preventEnterSubmit`); Space picks.
- **`FileDropzone`:** a dashed `border-input` box with 8px corners on the panel color, `background` on hover, the focus outline on its label, `border` + `background` when disabled (no opacity) and a `danger` border with `aria-invalid`. `description` is always shown under the status line and says what to choose before anything is chosen; the field is named by its label and title, and the description is read after them. Inside `Field` it takes the `Field` label; help text goes in `description`, never in `Field`'s `hint`.
- **`FileQueueList`** (`src/components/ui/file-queue-list.tsx`): the files chosen but not uploaded yet, under a `FileDropzone multiple`. Each row shows the file name and an optional detail, with an `outline` `icon-sm` button named "นำ {name} ออก" (`common.removeFile`). The list is named "ไฟล์ที่เลือก" (`common.selectedFiles`), and `emptyLabel` shows an `EmptyNote` while it is empty. Removing a row deletes nothing that is saved.
- **Migration:** phase 2C batch 1 (plan 1) moved the 179 hand-written fields of 26 form and dialog files onto the primitives. These include the 16 forms that showed both kinds after 2A, so no form mixes them any more. Phase 2C plan 2 moved the 46 fields of the 8 master-data forms (batch 2) the same way, and plan 3 the 15 fields of batch 3 (the audit round form, the bulk disposal, round cancel and text confirm dialogs, and the room picker). Plan 4 moved the 30 fields of batch 4 (the admin, login, report and notification forms, the label batch tool, the status correction, and the bulk update and transaction cancel dialogs) and ends the field work of 2C. The hand-written fields left stay on purpose as the rows of GF2's `EXEMPT` list: the 2 boxed fields of the label-print toolbar (the box, not the control, takes the field border, the panel fill, 16px text below `md` and the field's focus look through `focus-within:`, phase 2C ruling K21) and the room search of the audit room picker (O20), all `permanent`, and the topbar search (`phase 3`). List-page filters belong to 2B: plan 2B-1 moved the filter forms of the master-data lists and the user list, plan 2B-2 those of the disposal queue and the repair list and the three filters of the data-quality review queue (see **List filters** below), plan 2B-3 the asset register's toolbar and filter sheet, and plan 2B-5 the system log and the report filters. Since plan 2D-5 `tests/list-filters-ui.test.ts` holds every filter form in `src` to the shared fields (spec 2B I34, 2D M19; its list of 13 files is gone), and `tests/form-migration-guards.test.ts` counts every old pattern over all of `src` (GF2 counts hand-written fields; spec 2D M18): outside a rule's `OWNERS`, a file keeps only the sites of its `EXEMPT` list, exactly.
- **List filters** (`FilterSelect` in `src/components/ui/filter-select.tsx`, `FilterFormActions` in `filter-panel.tsx`, `FilterChipList` in `filter-chips.tsx`; all server-safe):
  - A filter panel with visible labels (`FilterPanel`) uses `FilterSelect` and `Field` + `Input` at `fieldSize="lg"` (40px; 44px with 16px text below `md`) and ends with `FilterFormActions`: the primary `lg` submit button, then an outline `lg` "ล้างตัวกรอง" link that shows only while a filter is active.
  - A search toolbar without visible labels (`MasterDataSearch`, and the asset register from plan 2B-3) has no frame and uses `fieldSize="md"`: 36px from `md`, 44px below. Its search is `SearchField` named by `aria-label`; its selects are `FilterSelect hideLabel`.
  - The forms are GET forms with `role="search"`. A button or Enter submits; hidden inputs keep `pageSize`, `sort` and `direction`; a changed filter goes back to page 1 with the same page size.
  - `FilterChipList` shows one removable chip for each active filter that is not visible on screen. The whole chip is one link named "<remove label>: <filter>" (8px corners, `primary-soft`, 36px from `md`, 44px below), and "ล้างทั้งหมด" is a text link after the chips.
  - A page has one filter form. Where phones fold it into a `<details>`, the same component renders twice (in the `<details>` and in `FilterPanel className="hidden md:block"`), its field ids come from `useId`, and the `<summary>` says how many filters are on ("ใช้ตัวกรอง N รายการ" in `text-meta num`), never a command it cannot run (the disposal queue). A client list that filters without a form (the data-quality review queue) uses controlled `FilterSelect`s that reload page 1.
- Text selection uses `primary-border` behind ink.

### Forms: Save Bar, Steps, Sections and Signature

- **`StickyFormFooter`** (`src/components/ui/sticky-form-footer.tsx`, server-safe): the save bar of a long form (asset new and edit, settings).
  - Placement: it is the last child of the `<form>`, so `type="submit"`, Enter in a field and the busy guard keep working. It sticks to the bottom of the dashboard scroll area (`sticky -bottom-4 sm:-bottom-6`, flush over `main`'s padding; `-mx-4 sm:-mx-6` for a full-width line) and rests at the end of the form once you scroll there. It never measures the sidebar.
  - Look: flat, a `border-t` on `bg-canvas`, with no shadow, blur or see-through fill. It clears the iPhone home bar.
  - Content: an optional `status` line (above the buttons on phones, on the left from `sm`), then the buttons in K8 order: a full-width column on phones, a right-aligned row from `sm`.
  - Use it only on focus-task routes, where the mobile bottom navigation is hidden (guard GL1).
- **`Steps`** (`src/components/ui/steps.tsx`, states from `getLinearStepStates(count, currentIndex, outcome)` in `src/lib/step-states.ts`): progress through a real multi-step flow.
  - Markup: an `<ol>` named by `label`, with 22px markers joined by a line.
  - The state shows by shape (number, check, X) and by a hidden word read before each label: "เสร็จแล้ว", "ขั้นตอนปัจจุบัน", "ยังไม่ถึง", "ปฏิเสธแล้ว". The current step has `aria-current="step"`.
  - Below `md` the labels are hidden and one line reads "ขั้นที่ 2 จาก 3 · ระบุรายละเอียด".
  - Users: the component install flow (batch 1), the import wizard (batch 4, where a finished import shows every step done) and the disposal request (batch 5, "ยื่นคำขอ", "พิจารณา", "ตัดจำหน่ายจริง": a request that can be opened has been filed, so a pending one is at the decision, an approved one at the disposal, a rejected one stops at the decision with an X, and a disposed one shows every step done). `DisposalWorkflowStepper` is the adapter that turns the request's stage into these states.
  - Numbered sections that are not steps use `FormSection`.
- **`FormSection`** (`src/components/ui/form-section.tsx`, server-safe): a numbered or plain section heading.
  - The number sits in a quiet outlined 22px circle; it is decoration, never the "current step" look.
  - The title is `h2` (16px) or `as="h3"` (14px), with a `border-soft` line under the row.
  - Without children it returns the heading row alone. With children it wraps them in a plain `div`, so a long page does not get one landmark region per section.
- **`FormContextBanner`** (`src/components/ui/form-context-banner.tsx`, server-safe): the record a form is about, as one quiet `<dl>` row. A faint 13px label, then the value in 14px medium ink that wraps. No tinted box, no capitals, no truncation. `code` shows a record code as `tag`.
- **`SignaturePad`** (`src/components/asset-operations/signature-pad.tsx`): a named group, with the label and helper above at full width.
  - The canvas is a white sheet with a dashed `border-input` line in both themes: it carries `data-theme="light"` (the forced-light scope, The Two-Theme Rule), so in dark its line is the light `--input`, while the group, label, helper and clear button follow the theme. The signature prints, so the canvas and stroke colors stay.
  - A `ghost` `sm` "ล้างลายเซ็น" button sits under the canvas on the right.

### Forms: Errors Under the Field

**The Error Under the Field Rule.** A form that refuses to save says what is wrong under the field that is wrong, in Thai, and takes the person to it; a refusal of the server looks the same (the V track: spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md`, plans 1 to 3 and the final plan).

- **The form checks itself:** `<form onSubmit={handleSubmit} noValidate …>`, with `noValidate` straight after `onSubmit` so the browser's own bubble never hides our errors, and a module-level `validate()` that restates every constraint of its controls through the helpers of `src/lib/validation-rules.ts` (`required`, `minLength`, `maxLength`, `range`, `wholeNumber`, `decimals`, `step`, `email`, `pattern`, `notBefore`, `atLeastOne`), which return codes, not text. The controls keep `required`, `maxLength`, `min`, `max` and `step` for the phone keyboard, the screen reader's "required" and guard GF5. A dialog inside another form has no `<form>` (guard GD5) and calls its own `validate…()` from its save. Guard V2 (`tests/validation-guards.test.ts`) holds every form of `V_SCOPE` to this.
- **Errors under the field, after save:** `useFieldErrors` (`src/components/ui/use-field-errors.ts`) holds the codes, and `Field error={fieldErrors.message(key)}` shows each under its field with the field's error look. A group shows one error under the group (`FieldGroup`); a `SearchableSelect` takes `id` and `error`. A field's error clears when that field changes (a pair or a group clears together, such as an end date with its start date), and a new save checks everything again. Nothing new shows while the person types: only the checks that were live before the V track stay live, and each shows its error in the same place, under its field, never in a box of its own (below).
- **The first wrong field takes focus:** the hook's `focusFirst(order, { idFor, reveal })` takes the form's visual order and focuses the first wrong field, scrolled clear of the topbar and the save bar (`focusField` in `src/lib/field-focus.ts`, which also opens a closed `<details>` around it). `reveal` first brings the field on screen: it switches the settings tab, closes a review dialog (`waitForDialogToClose`) or goes back to the step that holds the field.
- **The server's refusals land on the same fields:** a 400 `VALIDATION_FAILED` (and a 409 duplicate or another field refusal, `src/lib/field-error-response.ts`) carries `fieldErrors` keyed like the form's fields, and the form runs `if (fieldErrors.applyServer(payload) && focusFirstError()) return`. A refusal that names no field the form shows keeps the form's own message, the dialog `Notice` or the toast it used before, so nothing fails silently.
- **Messages:** a code reads `common.validation.<code>` (with `{min}` and `{max}` when the form passes them), then the `apiErrors` catalog for a server rule of its own, then `common.validation.invalid` (`src/lib/field-error-client.ts`). A fraction in a whole-number field reads "กรุณากรอกเป็นจำนวนเต็ม" (`notWholeNumber`), more than two decimals of money "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง" (`tooManyDecimals`).
- **No validation toast:** a toast never says what is wrong with a field. Guard V3 allows a form of `V_FORMS` no `toast.error` or `toast.warning` outside a `catch` but the after-save results of `NON_VALIDATION_TOASTS` (files that did not upload, the asset's follow-up steps).
- **A rule is not a gate:** a rule about what the person typed (empty, too long, out of range, an end before its start) leaves the save enabled and answers with an error under the field. A prerequisite that is not a field (nothing selected, nothing changed, no preview yet, a photo not taken) keeps its gate as `aria-disabled`, with `aria-describedby` pointing at a visible line that says why; the button stays focusable and looks disabled, and its handler returns first, because Enter and Space still reach it. Never a `disabled` button with no reason on screen.
- **One announcement per save:** `FieldError` has no alert role; focus reads the first wrong field with its error (`aria-describedby` reads the error before the hint). A check that runs while typing (the duplicate asset tag and serial, the batch's duplicate rows, the settings rules that showed a box, the prefix editor's prefix, the depreciation JSON) passes its own text as `Field liveError`, `null` while it finds nothing: a polite region that is always there reads each new text once. An error that a save or the server set never goes into that region, so focus reads it once (v-track final task 3).
- **Both themes and forced colors:** the error look is the field's own (`danger` border, `shadow-field-error`, teal again while focused) and the error text is `text-danger`; the words say what is wrong, so nothing relies on color.

### Navigation

The app uses a fixed dashboard shell over the canvas: the navy menu (`bg-sidebar`, §2 Sidebar) beside the topbar on the chrome color (`bg-chrome`: #FFFFFF in light, #0D182A in dark). **App Shell** below sets out menu B.

- **Sidebar** (`src/components/layout/sidebar.tsx`): `bg-sidebar` with a right `border-sidebar-border`. The brand mark is the app icon (32px, rounded, with the 1px `ring-app-icon-frame` hairline that shows only in dark) with the name "ระบบบริหารทรัพย์สิน" / "Asset Management System" (`nav.brandName`, in `sidebar-foreground`); when collapsed only the icon shows and the name is `sr-only`.
- **Three sections with headings:** งานประจำวัน / Daily work (dashboard, work center, my assets) · ทรัพย์สิน / Assets (the asset register first, then the groups จัดการทรัพย์สิน / Asset Management and ธุรกรรม / Transactions, then audit, maintenance and disposal) · ภาพรวมและระบบ / Reports and system (reports, master data, settings). A section with no permitted item is hidden (`filterNavigationSectionsByPermission` in `src/lib/navigation-permissions.ts`); when the sidebar is collapsed, headings become divider lines. Each section is a `role="group"` labelled by its heading (`aria-labelledby`; drawer ids are prefixed `mobile-` because the body renders twice). The menu is at most two levels deep: a section holds rows and groups, a group holds rows only. Every row and group has its own icon, because the collapsed rail shows icons only (`tests/sidebar-menu-structure.test.ts`).
- **Rows:** full width inside the nav's `px-2` gutter (`rounded-md px-3`), 36px on desktop and 44px in the mobile drawer, icons in `sidebar-muted`, hover `sidebar-hover`.
- **Active row:** the action blue `sidebar-active` with white text (weight 500), the light teal `sidebar-active-icon`, the 3px teal `sidebar-active-bar` on its left edge (the one stripe the app draws: a state mark beside the fill, the icon and `aria-current`, its outer edge on the menu color), and an outline in Windows high-contrast mode (`forced-colors:outline`), where the fill is dropped. `aria-current="page"` is set only when the page is the entry itself (`isExactNavigationMatch`); on a detail page under an entry (for example `/th/assets/123`) that entry gets `aria-current="true"`. The parent group of the active row is semibold with no fill. The active row is the longest matching href (`getActiveNavigationHref` in `src/lib/navigation-active.ts`, so `/th/assets/new` selects "add asset", not the register), and its group opens by itself.
- **Topbar:** `bg-chrome` with a `border-chrome-border` line under it, no shadow; it no longer shares the menu's color. Its icon buttons are named from messages (see Dialogs, Menus and Confirmation). Since plan 2D-2 they are ghost `icon` `Button`s (36px from `md`, 44px below, 20px icons), the language and user menus open from ghost `md` triggers and the scan link is outline `md`. The theme toggle (`ThemeToggle`, `src/components/layout/theme-toggle.tsx`, a ghost `icon` `Button`) sits right after the language menu: a moon while the page is light and a sun while it is dark, named by what a press does (`common.switchToDark` "เปลี่ยนเป็นโหมดมืด", `common.switchToLight` "เปลี่ยนเป็นโหมดสว่าง"). Both faces render and CSS shows the one of the theme on screen (`data-when-theme`), so nothing changes after hydration; it has no `title` tooltip. The login page has no toggle. The right group keeps its width (`shrink-0`) and the search box takes what is left (`w-[min(28rem,36vw)]` on its anchor), so at 1024–1180px CSS width (200% zoom) the search narrows instead of running under the bell (spec 2D D18).
- **Breadcrumbs** (`src/components/ui/breadcrumbs.tsx`, a server component): `items: { label, href?, code? }[]`. 13/20 faint text; links turn ink and underline on hover; the last item is `aria-current="page"`, weight 500 ink; `code: true` shows the item as `tag`. 12px chevron separators in `--input`, hidden from screen readers. Long trails wrap instead of truncating. The `<nav>` is named "เส้นทางหน้า" (`common.breadcrumb`). No outer margin: `PageHeader` puts it 4px (`mb-1`) above the title.
- **Page header** (`PageHeader`, `src/components/ui/page-header.tsx`, server-safe and without hooks, so client forms use it too): the one place that draws a page title.
  - Breadcrumbs (`breadcrumbs={[…]}`, written as an array literal) sit 4px above the `h1`. The `h1` is Display at weight 600 in ink, balanced and wrapping. A status badge never sits next to it.
  - The meta row under it is 13/20 secondary text with `gap-x-3 gap-y-1`, at most 48rem wide, one fact per element and no separators: the code (`tag`), then the status badge, then facts, then what the page is for.
  - When the last crumb is a code, the title is the record's own name (or the asset's name for a repair or disposal document), never the same code.
  - Detail pages follow these rules since plan 2B-4 (the asset, repair record, disposal request, employee, supplier and my-asset pages): the trail ends on the code, the `h1` is the name, and the meta row holds the code, the status badges (with their help buttons on the asset page) and the facts a person checks first, such as the asset's location and custodian or an employee's position and e-mail. The my-asset page has no trail, so its title stays the page's name. On the asset page "แก้ไข" is hidden below `md` (`hidden md:inline-flex`; phones reach it in ⋯), and on the disposal page print and the next step sit in a `hidden md:flex` group (phones reach them in the page's own action bar); the back button shows at every width.
  - The buttons are `md`, in this order: back, ⋯, secondary, primary. Below `md` the title and the buttons stack; from `md` they share the row, and the buttons wrap when the title is long.
  - `compactOnMobile` is for the asset register only: below `md` a 20px title and its button share one row, and the meta row is hidden.
  - The header has no outer margin: a page root uses `space-y-6`, and a form or tool passes `className="mb-6"`. `AuditScanHeader` stays the field-scan exception.
  - The old headers are gone since plan 2B-5: `MasterDataHeader`, `ReportHeader` and the local `PageHeader` of the my-assets page (guard LH2 is empty). A header button that downloads a file from an API route is a plain `<a href>` with `buttonVariants` (the two exports of the reports page, the outline one first, K8).
- **Back button** (`PageBackLink`, passed as `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}`): `outline` `md` with a left arrow and the page's own words. Below `md` it is a 44px icon button whose words stay in `max-md:sr-only`, so its name is the visible text. `href` is the expression the page already computed, `returnTo` included; the supplier form passes `onClick={confirmNavigation}`. Pages that had a back button keep it, and forms that had none get none. An `ActionBar` has a back item only where the header has no back button (`/audit/rounds/[id]`), with the same left arrow (guard LB1: no hand-placed `ArrowLeft`); the bar of `/maintenance/[id]` dropped its back item in 2C plan 5.
- **Link tabs** (`TabNav`, `src/components/ui/tab-nav.tsx`, server-safe): a `<nav>` of links with `aria-current="page"` for views that change the URL. One underline at every width (an inset line under the row, a 2px primary line under the current tab; forced-colors mode, which drops the shadow line, shows a 2px `CanvasText` border under the current tab instead), 40px from `md` and 44px below, counts in `text-meta num` after the label, and the row scrolls sideways when it does not fit. `scroll`, `ref`, `style`, `onScroll` and `data-*` pass through; `onSelect` (client callers only) can cancel a navigation: the 11 tabs of the settings page call `event.preventDefault()` and switch in place through `history.replaceState`, so unsaved edits stay, and Ctrl+click still opens a tab's own URL (2C plan 5). State that does not change the URL uses `Segmented` instead. Since plan 2B-5 every row of view or filter links on the pages 2B moved is a `TabNav`: the report views (inside the client wrapper `ReportViewTabs`, which keeps the scroll and the snap, I9), the work center's all / mine switch (named "มุมมองงาน", `workCenter.viewNavigation`; links, so Ctrl+click and no JavaScript still work, I10) and its queue row, the quick filters of the system log, and the module and decision rows of the approval pages, each row named by its label.
- **Mobile:** a slide-in sidebar `Sheet` with 44px targets and the scrim; the bottom field bar is solid `bg-chrome` with a `border-chrome-border` top line, no blur or bar shadow (the round scan button keeps its own), and `text-xs` labels. `theme-color` is the chrome color of the theme on screen: one tag for a choice (#FFFFFF or #0D182A, `THEME_COLORS` in `src/lib/theme.ts`, equal to `--chrome`) and a `media` pair while the page follows the OS; the toggle updates it. The manifest stays light (`theme_color` #FFFFFF, `background_color` #EEF1F6), and so does the iOS status bar.

### App Shell

Menu B (spec `docs/superpowers/specs/2026-10-21-menu-b-shell-design.md`): what every page under the dashboard layout shares, in both themes.

**The One Count Rule.** In the shell, a number for waiting work appears on the bell only. The menu marks "ศูนย์งานค้าง" with the orange `--sidebar-dot` and a hidden sentence ("มีงานรอคุณ N รายการ", `nav.workCenterWaiting`) while the bell's "รอคุณตัดสิน" group holds unread work; no menu row, tab or bar repeats the number. Pages keep their own counts as page content.

**The One Banner Rule.** A message of the shell (the session ending, offline) appears in one region under the topbar (`ShellBanner`): full width, `bg-warning-soft` with the warning ink, `role="status"`, always mounted outside `<main>`, one message at a time (offline wins while offline, then the session; on the audit scan page the page's own line takes the offline message's second clause, because saves there queue on the device). No page draws its own banner for these; the scan page's queue tools and failed saves stay page content. The region's height joins `--shell-top`.

- **Frame:** the skip link "ข้ามไปเนื้อหาหลัก" first, the menu, the 56px topbar (`h-14`, `bg-chrome`, `border-chrome-border`), the banner region, then `<main id="main" tabIndex={-1}>`. `--shell-top` (topbar plus banner) places the toasts and the viewport-height panels; only `<main>` scrolls, below the bar and the banner, so nothing scrolls under them; `scroll-padding-bottom` on `<main>` clears the phone bottom menu.
- **Menu (desktop):** a 56px brand row over a `sidebar-border` line; an open group's pages on a guide line under a white, bold title. The menu scrolls between the brand row and the person pinned at the foot (`SidebarAccount`: initial, name, role, chevron, each line truncated; its menu holds the name, the e-mail and "ออกจากระบบ").
- **Collapsed rail (64px):** icons only, the open row and the dot kept, a tooltip on hover and focus, the person as the initial; a group icon expands the menu and opens its group. The topbar toggle has `aria-expanded` and reads "ย่อเมนู" or "ขยายเมนู". The choice lives in the `sidebar` cookie (`collapsed` or `expanded`, one year, `Path=/`, `SameSite=Lax`), read on the server.
- **Topbar:** left, the menu toggle (desktop) or the hamburger (phone task pages) and the search; right, the scan button (icon, desktop), the bell, the language menu and the theme toggle (desktop). No user menu on desktop.
- **Bell:** named "การแจ้งเตือน N รายการ" while work is unread, "การแจ้งเตือน" when every listed row is read, "ไม่มีงานค้าง" when the box is empty; the count is `bg-danger` with `text-danger-foreground`, 99+ at most. The box: the title, the update time and "อ่านแล้วทั้งหมด" ("อ่านครบแล้ว" when nothing is unread); "รอคุณตัดสิน" (`approvalInbox`), then "ควรติดตาม"; read rows dimmed with "อ่านแล้ว"; the empty state "ไม่มีงานค้าง". Read clears the badge, not the work; a row returns when its count rises. The summary refreshes every 2 minutes while visible, on return to the tab and on a change; a rise is announced once in a polite `role="status"` sentence, never on the first load.
- **Search:** `/` opens it when focus is not in a field. Groups in order: ทรัพย์สิน, งานซ่อม, รอบตรวจนับ, ตัดจำหน่าย, พนักงาน, ที่ตั้ง, ผู้ขาย, บริษัท, สาขา. The match is a `<mark>` on `bg-warning-soft`; the asset group links "ดูทั้งหมดในทะเบียน (N)". An empty box shows up to 5 recent results with "ล้าง"; no result offers ways forward. On the phone a search icon opens it full width.
- **Phone:** the top bar and the bottom menu stay on the chrome color. The top bar shows the open page's title (the brand name as the fallback), the search icon and, on pages with the bottom menu, the bell; the open tab's icon sits on a `bg-primary-soft` tile. "เพิ่มเติม" and the focus pages' hamburger open one bottom sheet (`MobileMoreSheet`): the person (initial, name, role, department), the full permission-filtered menu, language and theme, and "ออกจากระบบ" in the danger ink.
- **Session:** a sign-in ends after 60 minutes without use or 12 hours after it began; the banner warns 5 minutes ahead ("อยู่ในระบบต่อ" for the idle rule). At the deadline, or on an API 401, the shell opens the login with `reason=session-expired` and the page as `callbackUrl`. Nothing signs out while offline.
- **States:** the five loading skeletons render inside the shell; `prefers-reduced-motion` stops the sheet, the popovers and the skeleton pulse.

### Data Tables

Tables are core product surfaces. Use bordered shells, readable row spacing, clear sortable/filterable headers, stable status badges, and responsive fallback cards below medium breakpoints where needed. Prioritize scanning, comparison, and bulk operations over decorative presentation. Hovered and focused rows use the solid `bg-row-hover`, sticky cells included. Table headers take the panel color with no fill and no capitals (B3). Since plan 2B-5, guard R7 checks every line, table headers included, against `TABLE_HEADER_FILLS`, which is `{}` since plan 2D-3 moved the import preview table onto `DataTable`. The budget was 44 at the start of 2B, 29 after plan 2B-1, 17 after plans 2B-2 and 2B-3, 11 after plan 2B-4, 9 after 2C plan 4, which took the role permission and integration client tables onto the plain 13/500 header (R-e), and 1 after plan 2B-5.

**`DataTable`** (`src/components/ui/data-table.tsx`, server-safe; its scroll hint `DataTableScrollArea` in `data-table-scroll.tsx` is the one client part) is the table of every list page except the asset register:

- **Frame:** 12px corners, `border`, the panel color. The header has the panel color too, with 13/500 faint text in sentence case and a `border` line under it: no fill and no capitals (guards LT1, R7). Rows are `p-3`, about 46px, with `border-soft` lines. There is one density only: the asset register keeps its compact `px-3 py-2` rows in `asset-register-table.tsx` until phase 3 (spec 2B I3).
- **Gutters:** the first and last columns get 16px, 20px from `md` (`first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5`). A plain class on a cell cannot change them; a table that needs another gutter writes its own variant.
- **Rows:** `DataTableRow`, or `ClickableTableRow` when the whole row opens the record. Both carry `group/row`: the row stays lit while it is hovered, while focus is anywhere inside it, and while a menu it opened is open. A pinned column (`sticky="left" | "right"`) draws a line on its inner edge and no shadow.
- **Sorting:** `DataTableHead sort={{ href, direction }}` makes the label a link (44px on phones) and sets `aria-sort` and an arrow on the sorted column only (guard LT2: no hand-written sort header).
- **Empty:** `TableEmptyRow` is the one empty row: an `EmptyNote padded` line, or an `ActionEmptyState` when there is a title, a description or a button (guard LT3: no hand-written `<td colSpan>`).
- **Foot:** `DataTable footer={<Pagination … />}` puts `Pagination` in `DataTableFoot`: the range and "หน้า x จาก y" on the left in one `aria-live="polite"` line, then the page sizes 25/50/100 as links that look like `Segmented` (the current one `aria-current="true"` at weight 600), then words-only outline `sm` previous and next buttons. A disabled one is a `span` with `aria-disabled` and the shared disabled look (guards LT4, LT5).
- **Scroll:** `scrollHint={tCommon("tableScrollHint")}` puts the table in `DataTableScrollArea`, a named `role="region"` scroller that takes Tab and shows its hint line only while the table really overflows (B6).
- **Values:** counts and money through `formatCount` and `formatMoney` in `num` cells (`DataTableCell numeric`), empty values through `Nil`, and the row's own code as `tag font-medium text-foreground` (guards LV1–LV3).
- `dataTableHeadClasses`, `dataTableCellClasses` and `dataTableRowClasses` are exported for tables that cannot move whole yet.

**Every list page (phase 2B, spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`):**

- **Header and filters:** `PageHeader` with the create button as the primary `md` action, last. A filter panel with visible labels or a frameless search toolbar (see **List filters** in Inputs / Fields), and `FilterChipList` for active filters that are not visible on screen.
- **Numbers:** `StatStrip` above the table for the counts a person scans; the counts cover the whole filtered list, never the rows of one page. A cell that filters the list is a link (`href`, plus `scroll: false` where the page keeps its scroll position); the cell of the filter in use takes `current` and reads as `aria-current="page"`, and on the findings list the pager's total equals that cell's count. A count that needs action takes `attention` (see Cards / Containers).
- **Rows (ช1):** one next-step button ("แก้ไข" on the master-data lists) and a ⋯ menu that holds every other action (`RowActions`, below). Delete sits last in ⋯ and asks the same confirm as before. Clicking the row still opens its edit page.
- **Pages on the server:** `page` and `pageSize` (25, 50 or 100; 25 by default) live in the URL and are read with `parseListPage` (`src/lib/list-pagination.ts`). The query takes `listPageWindow` and counts the total in the same `Promise.all`, with the old `orderBy` plus `{ id: "asc" }`. A page past the end redirects to the last page (`lastListPage`), and links keep the page and its size (`appendListPage`), so `returnTo` brings a person back to the same page. A main list never caps its rows with a fixed `take`. Where one `count` cannot give the total, the list keeps the rule its own way: the audit rounds list reads every round (its view tabs count them all) and shows a slice of the filtered rounds, with a page past the end clamped to the last page instead of a redirect; the PM list counts its plans per state with `groupBy` and reads one window per state (`planStatePageSlices`, `src/lib/preventive-maintenance.ts`), so active, paused and ended plans keep their order across pages; the findings list takes its total from the strip count when the queue is one the strip counts. Since plan 2B-5 all nine lists of spec B4 page on the server: the system log (it stopped at the newest 100), the approval history (the newest 150) and my assets (no pages at all) were the last. The approval history filters in the database (`buildApprovalDecisionLogWhere`, `src/lib/approval-decision-log.ts`) and counts its strip and its tabs with one read-only `groupBy` over every decision the user may see; my assets reads a light list of the person's assets for its four totals. Both admin lists time their queries (`admin-logs.list-data`, `approval-history.list-data`, logged with `PERFORMANCE_TIMING=1`). A selection belongs to the page on screen: changing the page, its size or a filter clears it (the disposal providers take `selectionKey`, the findings panel takes it as its `key`).
- **Phones:** a table without a phone layout keeps horizontal scrolling with `DataTableScrollArea`; phone layouts for these tables come in phase 3.
- **`RowActions`** (`src/components/ui/row-actions.tsx`, a client component with data-only props, so server pages can pass them):
  - The next-step button is 120px wide (32px tall from `md`, 44px below), 13px medium primary text with a 16px icon. It fills with `primary-soft` while its row is hovered, holds focus or has its menu open, and it is named "<label> <code>".
  - ⋯ is a `ghost` `icon-sm` button named "การดำเนินการของ <code>" (`common.moreActionsFor`). From `md` it opens a `DropdownMenu`; below `md` a bottom `Sheet` titled with the code in `tag`, with 44px rows. An item that cannot run now uses `unavailable` with its reason.
  - `deleteAction` adds "ลบ" last, after a separator. It asks the shared delete confirm and returns focus to ⋯. The trigger and the menu carry `data-no-row-click`, so a click in them never opens the row (guard LR1: no `…DeleteButton` in a row).
  - A 2C dialog never sits in the menu. When the next step or a ⋯ item opens one ("พิจารณาคำขอ", "บันทึกตัดจำหน่าย", "บันทึกไม่พบ"), a small client wrapper (`src/components/disposal/disposal-row-actions.tsx`, `src/components/audit/audit-pending-row-actions.tsx`) renders the dialog's own button outside the menu with `hideTrigger` and a ref, calls its `open()` from `onSelect`, and passes `returnFocusRef={openerRef}`: `RowActions` points `openerRef` at the button that was used, so closing the dialog returns focus there. The wrapper stops the events of the dialog portal before they reach the row, so a click in the dialog never opens the record. A dialog without an `open()` handle keeps its button in the cell (the PM plan state actions), unless its owner mounts it from its own state: the findings table (audit fix, 2026-10-16) keeps only the review decision in the cell (approve and reject, or the self-review note) and puts "แผนแก้ไข", "ปิดรายการไม่ตรง" and the disposal-request link in ⋯; each item sets the dialog's open state, and the dialog returns focus to ⋯ through `returnFocusRef`.

**Asset register pattern (2026-10-07).** The register (`/[locale]/assets`) adds these to the rules above; plan 2B-3 moved it onto the shared parts. Its frame (search bar, status tabs, filter sheet, chips, filters in the URL, ช1 rows) is the model for list pages, but its dense rows are its own exception until phase 3 (spec 2B B3(3), I3); every other table uses the `DataTable` rows.

- **Search bar:** a search field that searches while typing (400ms pause, 2+ characters, not during IME composition, Enter searches at once, × clears) plus the two or three scope selects a person uses most. From `md` up the bar has no frame; the search field, the scope selects and the ⚙ button are 36px (`SearchField` and `FilterSelect hideLabel` at `fieldSize="md"`, `Button variant="outline" size="md"`). Below `md` the bar holds only search and ⚙ at 44px, and it sticks to the top while the list scrolls.
- **Status tabs with live counts** (`TabNav`, through `asset-register-status-tabs.tsx`) for the handful of states people switch between; any other state lives in the filter sheet. The tab nav keeps `overflow-x-auto` at every width, so the row scrolls when the tabs do not fit; below `md` it runs to the screen edges and its targets are 44px. At every width the list draws the baseline as an inset shadow (`w-max min-w-full shadow-[inset_0_-1px_0_var(--border)]`), and the current tab draws its 2px primary line as an inset shadow over it, so the underline scrolls with the tabs and is never clipped. Do not use `overflow-visible` or a `-mb-px` overlap on a scrolling tab row.
- **⚙ filter Sheet** (right on desktop, bottom on phones) for everything else. Its fields are `FilterSelect` (`Field` + `NativeSelect`); status and condition carry their 24px help button in `labelAction` (44px to tap below `md`, plan 2D-5). Changes apply at once, the sheet stays open, and its footer reads "ล้าง" and "แสดง N รายการ" with the real result count; "แสดง N รายการ" is `busy` while the count loads.
- **Removable chips** (`FilterChipList`) for every active filter that is not visible on screen, plus "ล้างทั้งหมด".
- **Filters live in the URL.** Changes go through `router.replace` with an optimistic state (`AssetRegisterNavigationProvider`), so the back button leaves the page in one step and controls never bounce back.
- **Rows:** `RowActions` (owner choice ช1) through `AssetRegisterRowActions`: a fixed 120px next-step button chosen by status (for example "ส่งมอบ" / "รับคืน"), or an empty slot when nothing is next, then ⋯ in a fixed slot that holds every action, with unavailable items explaining why; "ลบ" comes last and only with delete permission. The ⋯ menu is a `DropdownMenu` on desktop and a bottom `Sheet` titled with the asset tag on phones. Clicking a row opens the detail page.
- **Desktop table:** `table-fixed` with a `<colgroup>`, only the key column and the actions column pinned (each with a line on its inner edge, no shadow), one-line truncated cells with a `title`. It is built from the `DataTable` parts (`DataTableBody`, `ClickableTableRow`, `DataTableHead sort`, `TableEmptyRow`, `DataTableFoot` with `Pagination`) with the register's own classes (`headerClasses`, `cellClasses` in `asset-register-table.tsx`): rows stay dense (`px-3 py-2`, 56px with the 40px thumbnail) until phase 3. The actions column is 172px (`pl-1.5 pr-2`, room for the 120px next step and ⋯), and the operations preset (the default) and the accounting preset are 1,116px, within the 1,117px a 1440px screen leaves (`src/lib/asset-register-columns.ts`). The default column set must fit 1440px without horizontal scroll, and the scroll hint appears only when the table really overflows.
- **Phone rows:** about 80px each — 44px thumbnail, tag, name, then location and a status badge on one line, and ⋯. A "เลือก" mode turns rows into checkboxes (`checkboxVariants({ size: "lg" })`), and its bulk bar floats above the bottom navigation until phase 3 reworks it with QR label printing.
- **Thumbnails:** list images come from `/api/attachments/{id}/thumbnail` (96px WebP, cached); never load original files in a list.

### Empty Values and Numbers

- **Empty values:** `Nil` / `orNil(value, label?)` (`src/components/ui/nil.tsx`) show a faint em dash (—) that screen readers skip, plus `sr-only` text: "ไม่มีข้อมูล" (`common.noValue`) or a label for the context, such as "ไม่มีผู้ถือครอง". Blank means `null`, `undefined` or an empty or whitespace-only string; `0` and `false` are values and must show (`|| "-"` hides a zero). Faint ink, so never on a status soft fill.
- **Numbers:** `formatCount` and `formatMoney` (`src/lib/display-format.ts`) always format in `th-TH` (Arabic digits, comma groups), never in the machine's locale; `null` and `undefined` return `null`, so a caller writes `formatMoney(x) ?? <Nil />`. Money always has 2 decimals. Outside tables pass the unit, `formatMoney(x, { unit })` with `common.baht` ("บาท" / "THB"), to get "64,900.00 บาท" with a non-breaking space; in tables the unit sits in the column header ("มูลค่า (บาท)") and the cells hold only the number. Line digits up with `num`.
- Phase 2A only adds these helpers; 2B uses them on screens (156 `"-"` fallbacks, 44 `toLocaleString()` calls without a locale). After plan 2B-5 (the lock), guard LV2 counts 68 typed `"-"`, LV1 5 bare `toLocaleString()` calls and LV3 6 `formatCurrency(` calls, every one kept by phase 2B for phase 2D (73, 15 and 16 after plan 2B-4; 97, 19 and 35 after plan 2B-3; 98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1). LV2 was 61 after plan 2D-2; plan 2D-3 took it to 44 and LV1 to 0 (the import panel and the label tool count with `formatCount`), and plan 2D-4 took LV2 to 29 and LV3 to 0: the two print pages show money through `formatMoney` as the screen does (spec 2D D10) and `formatCurrency` is deleted. Print pages, PDFs, label data and the arguments of translated sentences keep `"-"` (2B R-n); every typed `"-"` that stays is a `permanent` row of LV2's `EXEMPT` list (plan 2D-5).

### Field Audit / QR Workflows

Scanner and field workflows need touch-safe controls, square or contained camera preview areas, visible fallback text input, readable status, and clear evidence upload states. Audit pages may lean into the Audit Console lens, but must remain calm and workflow-driven.

Field-work page pattern (audit scan, 2026-10-07): **room → list or typed search → check sheet → one save button.**
- **Context first:** a room button sets where the person is standing; it filters the list and becomes the default "actual" location. It is remembered per round.
- **Search is the primary input** (QR labels are optional): a sticky field at the top of the scroll area (`-top-4 sm:-top-6` to sit flush over `main`'s padding), `text-base` so iOS does not zoom, IME-safe, 2+ characters, Enter opens the first result; the shared `SearchField` (`fieldSize="xl"`) with its clear button and the camera toggle in its `trailing` slot (a ghost `icon` `Button` with `aria-pressed`).
- **Check sheet:** bottom `Sheet` below 1024px, an inline sticky panel beside the list at ≥1024px (the open row is marked with `aria-current`). Each field shows the value that will be saved; a mismatch gets the warning tone (`bg-warning-soft`, `border-warning-border`) with an "ในระบบ: …" line; a field that matches has no box. The save and "ไม่ใช่ชิ้นนี้" buttons sit in an action bar outside the scrolling body (`data-audit-check-actions`, `shrink-0 border-t`, at the bottom of the sheet and of the side panel), so save never needs a scroll. Components are one row each (tag, `StatusBadge`, "พบ", ⋯) under a heading with "พบครบทุกชิ้น", and saving the parent while some are pending asks first (audit fix, 2026-10-16). When the phone keyboard opens after a field takes focus, the form scrolls that field back into the body above the bar (`revealFocusInScrollArea` on a `visualViewport` resize, plan 2D-4).
- **One save button whose label states the result** ("บันทึก · ตรงทุกข้อ" / "ไม่ตรง N ข้อ (…)"); warning variant when anything differs; while a required photo is missing it is `aria-disabled` with its reason tied by `aria-describedby` (`audit-check-photo-reason`), and Enter or Space on it opens the note and photo section.
- **After saving:** update rows in place (no `router.refresh()`), a `role="status"` `Notice` whose tone follows the result (kept on the device `info`, saved with a mismatch `warning`, saved `success`) with an outline "แก้" button, and focus back to the search field (from search) or to the row now in the same position (from the list).
- **Offline:** saves queue on the device, rows show "รอส่ง", a warning `Notice` shows the count with a busy "ส่งตอนนี้" button, and the queue sends itself when the connection returns.

## 6. Do's and Don'ts

### Do:

- **Do** preserve existing tokens and shared primitives such as `Button`, `Segmented`, the field primitives (`Input`, `NativeSelect`, `Textarea`, `Field`, `SearchField`), the dialog parts (`AccessibleDialogBody`, `AccessibleDialogFooter`, `AccessibleDialogCancel`) and `useConfirm`, `StickyFormFooter` and `ActionBar`, `ChoiceCard` and `ChoiceChip`, `Chip`, `Steps`, `FormSection`, `FileQueueList`, `Notice`, `EmptyNote`, `ActionEmptyState`, `PageHeader` and `PageBackLink`, `DataTable` with `TableEmptyRow` and `Pagination`, `FilterSelect`, `FilterFormActions` and `FilterChipList`, `RowActions`, `TabNav`, `StatStrip`, `KeyValueList`, `ContentPanel divided`, `Nil`, `formatCount` and `formatMoney`, the loading skeletons of `page-skeleton.tsx`, and the panel and mobile card list helpers.
- **Do** keep the menu navy (`--sidebar` #082A54, #0E2445 in dark) with color only on its open row (the action blue fill, the light teal icon and the teal bar), navy #083161 for the logo and the pressed primary fill, Primary #1E4F94 for actions and links, and teal for info status and focus.
- **Do** keep a count of waiting work on the bell only and every shell message in the one banner region (The One Count Rule and The One Banner Rule in §5 App Shell).
- **Do** use borders and tonal layers as the grouping mechanism; use `shadow-overlay` only for dialogs, sheets, popovers and menus, and `bg-scrim` behind them.
- **Do** keep tables and forms dense enough for enterprise scanning, but not cramped.
- **Do** pair status colors with readable labels, marker shapes, icons, or explicit workflow context so status does not rely on color alone.
- **Do** write new Thai copy with the glossary words and edit messages through `node scripts/messages-edit.mjs`; `tests/thai-glossary.test.ts` blocks retired words.
- **Do** support Thai and English text, keyboard navigation, visible focus states, reduced motion, touch-safe mobile/tablet controls, and clear empty, loading, error, permission-denied, and validation states.
- **Do** check a form on save (`noValidate` and `validate()`), show each error under its field, take the person to the first wrong field and land the server's `fieldErrors` on the same fields (**Forms: Errors Under the Field**).
- **Do** preserve business workflows, RBAC, locale routing, audit trail expectations, Prisma/SQL Server behavior, and production readiness assumptions.

### Don't:

- **Don't** use consumer-app styling, bright playful colors, heavy animation, marketing-style hero layouts, gamified UI, casual startup dashboards, decorative gradients, or anything that makes the system feel like a landing page instead of an enterprise operations tool.
- **Don't** use glassmorphism, heavy shadows, decorative gradients, floating marketing cards, or playful surfaces.
- **Don't** bring back the old slate sidebar (Tailwind #0F172A, which competed with the content) or color the menu beyond its open row and the work dot; no focus color beyond `--ring` and, inside the navy menu, `--sidebar-ring`; no green, orange or red outside status badges, the bell's count and the menu's work dot.
- **Don't** write a `dark:` class, a color for one theme or a component that reads the theme: both themes come from the tokens in `src/app/globals.css`, and paper that must stay light takes `data-theme="light"` (a new one adds its file to `LIGHT_SCOPES` in `tests/dark-mode-p.test.ts` with a ruling).
- **Don't** show database status colors on badges, or use teal `brand-accent` as text.
- **Don't** redesign business workflows for visual effect.
- **Don't** invent inconsistent button, input, modal, badge, or navigation vocabularies across screens.
- **Don't** rely on color alone for status, permission, validation, audit, or lifecycle state.
- **Don't** use display fonts, fluid hero typography, gradient text, oversized cards, or landing-page composition inside product workflows.
- **Don't** use colored side-stripe borders as a decorative accent. Use full borders, status badges, text labels, and icons instead. The open menu row's 3px `sidebar-active-bar` is a state mark beside its fill, its icon and `aria-current`, not decoration, and the only stripe.
- **Don't** fade a disabled control with opacity, put faint text on a status soft fill, or tint a fill or border with `/NN`; use the disabled look, the tone ink and the solid tokens.
- **Don't** change a button's label while it is busy, put the primary action first in the DOM (`flex-col-reverse`), drop `required` or `maxLength` from a control when it moves into `Field`, or give a dialog its own `<form>` when it renders inside another form.
- **Don't** show a field's error in a toast or the browser's bubble, announce it as an alert, or keep a rule behind a `disabled` button with no reason on screen.
- **Don't** write a page title, table head, sort header, empty row, pager, filter select, number box or label and value helper of your own, or bring back `MetricCard`, `ReportHeader` or `MasterDataHeader`: the list-frame guards (`tests/list-frame-guards.test.ts`, LH1 to LR1) allow only their shared parts (`OWNERS`) and the sites of their `EXEMPT` lists (since plan 2D-5).

## 7. Documentation Governance and Adaptive UI Contract

`DESIGN.md` is the canonical source for visual identity, design tokens, component vocabulary, accessibility principles, and Adaptive UI policy. It is not a feature changelog.

Business workflow, RBAC, SOD, lifecycle, and security requirements always take precedence over visual guidance. Runtime components and CSS are the implemented behavior; drift between runtime and this document must be reviewed and reconciled explicitly.

**Warning:** Do not run `npx shadcn add`: it writes oklch tokens and a `.dark` block into `src/app/globals.css` (our dark set is written by hand in `:root[data-theme="dark"]` and its copy, §2 Dark Theme), and `npx shadcn add input|textarea|native-select|field|button|dropdown-menu|command|popover|dialog|sheet|alert-dialog` overwrites our own files of the same names, whose classes differ from shadcn's. Copy the component by hand and review the diff.

### Adaptive UI Contract

- Desktop is the management and review workspace for comparison, bulk work, reports, administration, and approvals.
- Mobile is the field-operation workspace for scanning, evidence capture, quick lookup, custody actions, and walking audits.
- Desktop and Mobile may present different hierarchy and controls while reusing the same URL, API, workflow records, permissions, validation, audit trail, and data model.
- Global Mobile Field Navigation and a page-owned contextual action bar must never render together.
- Focus-task routes hide global field navigation while their contextual action surface is active: the scanner and transaction flows, the asset, audit, maintenance and disposal work pages, the settings page and every `new` and `[id]/edit` form (`focusTaskRoutes` in `src/lib/mobile-field-navigation.ts`). Phase 2C added the settings page and 24 form routes, and returned the PM and disposal-batch lists to navigation. List pages keep the bottom navigation. A page that shows `StickyFormFooter` must be a focus-task route (guard GL1).
- Mobile controls remain at least 44px, respect safe-area insets, avoid body-level horizontal overflow, and do not depend on hover. Shared buttons, fields and menu items switch to their desktop height at `md` (768px), not `sm`, and no button or button-like link sets a height of its own at `sm:` (guard, spec 2D §5.4).
- Two smaller targets are accepted under WCAG 2.5.8 (at least 24px, or enough spacing): the 24px toast close button (a toast can also be swiped away) and the 20px-tall breadcrumb links (one link per trail, and the page keeps its back button). Links inside a sentence are exempt as well.
- **`ActionBar`** (`src/components/ui/action-bar.tsx`, server-safe, phase 2C ruling K23): the page-owned action bar of the four detail pages below `md`. It is fixed to the bottom of the screen on `bg-surface` with a `border-t` and the home-bar padding (`pb-[max(0.75rem,env(safe-area-inset-bottom))]`), its row centered and at most 512px wide, and it is a `role="group"` named by its required `label` (`tCommon("actions")`, "การดำเนินการ"). It holds up to four links in one row, or three under a full-width `primaryAction` (the next step of a disposal request). On a short screen (`max-height: 32rem`: a 200% zoom of a 1440 × 900 window, a phone on its side) the links stay 44px, the padding above and below them is 6px instead of 12px, and a `primaryAction` sits beside the three links (1fr : 2fr, up to 768px wide), so the bar is one row (spec 2D D18, plan 2D-4). Each link is `buttonVariants({ size: "sm" })`, so 44px with 13/20 text: `outline`, or `default` when the link sets `primary`. An item that cannot run now is `<a role="link" aria-disabled="true">` without `href`, in the disabled look, so a screen reader reads an unavailable link. The ⋯ layout of the mockup waits for phase 3.
- **Bottom space:** the dashboard shell leaves room for Mobile Field Navigation while it shows (`pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0` in `src/components/layout/dashboard-shell.tsx`), so a page in navigation mode adds no bottom padding of its own. Only a page with its own `ActionBar` pads its root, with `actionBarPagePadding` from the same file and in the same commit as the bar: `.single` (`pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0`) on `/assets/[id]`, `/audit/rounds/[id]` and `/maintenance/[id]`, and `.withPrimary` (9rem) on `/disposal/[id]`, whose bar puts the next step above its links. The room is the bar's height plus the iPhone home bar; until 2C plan 5 it was `pb-24` / `pb-36`, which left the home bar out. Guard LP1 keeps `pb-24` and `pb-36` off the pages under the shell (none is left); plans 2B-2 and 2B-4 took the doubled padding off the disposal batch, employee, supplier and my-asset pages.
- **Two breakpoints:** a page's own frame switches at `md` (768px): the `PageHeader` row, the words of `PageBackLink`, the header buttons hidden below `md`, and the page's own action bar (`ActionBar` is `md:hidden`). The shell switches at `lg` (1024px): the sidebar, Mobile Field Navigation and the shell's bottom space. From 768 to 1023px a navigation page shows the row header above the field navigation, so check every changed page at 768 and at 1024.
- **Page width and rhythm:** list and detail pages fill the content area, with no `max-w-*` on their root; forms and tools keep their own width (`max-w-2xl` to `max-w-7xl`), and their header sits inside it. A page root is `space-y-6` (24px between blocks); a page that cannot change its root line (`/audit/rounds/[id]`, whose root holds the O11 padding) passes `className="mb-6"` to `PageHeader`, and the asset register keeps its bare root and `PageHeader className="mb-4 md:mb-6"` until phase 3. The padding of `<main>` (`px-4 py-4 sm:px-6 sm:py-6`) stays, because full-bleed bars rely on it.
- **Loading skeletons** (`src/components/ui/page-skeleton.tsx`, server-safe; each `loading.tsx` renders one of its five exports and nothing else) take the shape of their page at full width: the `PageHeader` rows (crumbs and two badges on the asset page, the compact row on the register, a title alone on the dashboard), one `StatStrip` frame for numbers (two columns below `lg`, a lone last cell filling its row), the `DataTable` frame with a plain header row (`dense` rows on the register) and underline `TabNav` rows. The frame has `aria-busy="true"`, and the blocks pulse only with `motion-safe:animate-pulse`. A route without a boundary of its own shows `PageSkeleton`, a header over a table. A plan that reshapes a page reshapes its skeleton in the same commit.

### Supporting Documents

- `docs/14_UI_UX_DESIGN_SYSTEM.md` is the developer-facing operational index.
- Focused decisions live in `docs/superpowers/specs/`.
- Implementation sequencing and verification live in `docs/superpowers/plans/`.
- Current implementation status and manual QA live in `DEVELOPER_HANDOFF.md`.
- Historical delivery notes live in `docs/99_CHANGELOG.md`.
