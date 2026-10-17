# Dark Mode Design (UI Round 4, after Phase 2D)

Date: 2026-10-17 · Base: `master` `c0ad2aa` (phase 2D merged, not deployed) · Order: Dark Mode → V track → E2E (desktop and phone, both themes) → one deploy (wiki item 27).

## 1. Intent

People in the office work in the system on a computer all day, and they want a dark screen that is easier on the eyes (the user, 2026-10-17). The app has been light-only by rule (`DESIGN.md` "Light Only Rule", `globals.css` `color-scheme: only light`, guards that ban `dark:`). After phase 2D, every page draws its colors from the shared tokens and parts, so Dark Mode is a second token set, a switch, and the few surfaces that must not follow it. It is not a page-by-page restyle.

Success means a person who picks dark sees every screen dark, readable and calm, with no white flash, no leftover white boxes, and nothing that changes on paper.

## 2. Decided by the user

| # | Decision | Said |
|---|---|---|
| U1 | Purpose: all-day work on a computer. Phones are not the target, but nothing may break there. | "ใช้ทำงานบนคอม" |
| U2 | Default follows the OS / browser setting (light or dark) until the person chooses. The choice is **one toggle button that switches light ⇄ dark** (no three-way menu, no "follow system" item), on the **topbar beside the TH language button**, and the choice is remembered. | "ตรง" · "เป็นปุ่มสลับ สว่าง / มืด" · "บนแถบบนข้างปุ่ม TH" |
| U3 | Look: direction **A, navy dark**: a dark blue canvas continuing the brand navy, the active menu row still navy with the teal icon. Chosen over a neutral graphite and a softer, lower-contrast dim slate (mockups in `.superpowers/brainstorm/66645-1792224649/content/dark-direction.html`). | "เลือก A" |
| U4 | Print pages, A4 documents, labels, QR codes, the signature canvas and the camera image keep their colors in every theme. | "ส่วนที่เดาไว้ถูกแล้ว" |
| U5 | The choice is remembered per browser (a cookie), not per account. No database change, no migration. | "จำในเครื่องตามที่แนะนำ" |

## 3. Goals, non-goals, anti-goals

**Goals**
- G1. A complete dark token set (direction A) that passes the same contrast rules as the light set, checked by tests for both sets.
- G2. Before any choice the page follows the OS; one toggle switches light ⇄ dark and the choice sticks. The page renders in the right theme on the first paint.
- G3. Every screen inside the app shell, the login page, toasts, dialogs, sheets, menus, native form controls, scrollbars and the app's own 404 follow the theme.
- G4. Paper, labels, QR, signature and camera surfaces never change (U4), and printing from any page in dark prints light.
- G5. Windows contrast themes (forced colors) keep working in both themes.
- G6. The docs and guards describe two themes; components never learn which theme is on.

**Non-goals**
- Sync of the choice across devices or accounts (U5). A per-account setting is a later change with a migration.
- Dark PDFs, dark printouts, dark label sheets, a dark camera UI.
- Dark PWA splash, dark iOS standalone status bar, dark app icons: the web manifest and `appleWebApp` are static and stay light.
- A redesign of anything else. Spacing, type, layout, wording and behavior stay as phase 2D left them.

**Anti-goals (would be failure even if it "works")**
- A white flash before a dark page appears, or a dark flash before a light one.
- Text or controls that fall below the contrast floors in either theme.
- White or light boxes left inside dark screens because a part used a raw color or the wrong token.
- Paper (A4, labels, signature, QR) that looks different from today, on screen or on paper.
- `dark:` classes spread through components. The theme lives in tokens only.

## 4. Behavior

### 4.1 The toggle
- Place: the topbar (`src/components/layout/topbar.tsx`), directly beside the language button (TH/EN globe), on desktop and on phones. One icon button in the topbar's icon-button size (36px from `md`, 44px below, as the other topbar buttons).
- It shows what a press does: a moon while the page is light ("switch to dark"), a sun while it is dark ("switch to light"). Its accessible name names the action (th / en, through `scripts/messages-edit.mjs`, words per `docs/19_THAI_GLOSSARY.md`): "เปลี่ยนเป็นโหมดมืด" / "Switch to dark mode" and "เปลี่ยนเป็นโหมดสว่าง" / "Switch to light mode". *(My call on the wording; the user may rename.)*
- Before the first press the page follows the OS, and the button reflects the theme actually on screen (when the OS is dark, it shows the sun). The icon and name must be right on the first paint too, with no flip after hydration (for example both icons rendered and the theme's CSS showing one). *(The mechanism is the builder's.)*
- A press switches at once (no reload, no flash) and writes the cookie. From then on that browser keeps the chosen theme even if the OS changes. There is no way back to "follow the OS" in the UI (the user's choice; clearing the cookie does it).
- The login page has no toggle (its page has no topbar). It renders by the cookie if this browser has one, else by the OS. *(My call.)*
- Logging out does not clear the choice; it belongs to the browser, not the person (U5).

### 4.2 The cookie
- One cookie, name `theme`, values `light` | `dark`; `Path=/`, `Max-Age` one year, `SameSite=Lax`, not `HttpOnly` (the client writes it), no `Secure` requirement beyond what the site already serves. A missing or unknown value means "follow the OS". *(My call on name and lifetime.)*
- The root layout (`src/app/layout.tsx`, the only `<html>`) reads it on the server (`cookies()`; the layout already renders per request through `getLocale()`) and renders the explicit choice on `<html>` so the first paint is right.

### 4.3 How "system" works without a flash
- `light` and `dark` are rendered by the server as an attribute on `<html>` (for example `data-theme`).
- No cookie (or an unknown value) renders no attribute; CSS applies the dark tokens under `@media (prefers-color-scheme: dark)` for a root that is not forced light. The browser resolves this before the first paint. No inline script is needed. *(The mechanism is the builder's, provided there is no flash and no inline script that would need CSP changes.)*
- `color-scheme`: the default root says `light dark`; an explicit light choice and every forced-light scope keep `only light` (it is what keeps Chrome Auto Dark and Samsung Internet dark mode off today); an explicit dark choice says `dark`.
- `<meta name="theme-color">` follows: one color for an explicit choice, the per-scheme pair (`media` attribute) when following the OS. The values are the dark and light top-bar surfaces.

### 4.4 Surfaces that stay light or keep their own colors (U4)
A single shared way to force the light tokens on a subtree (for example a `data-theme="light"` scope that re-declares the light tokens and `color-scheme: only light`) is used wherever paper sits inside a themed page. It is applied to:
- the A4 operation documents, including the **VOID banner**, which today uses theme tokens inside the white paper (`src/components/asset-operations/void-document-banner.tsx`) and would turn into a dark box on white paper;
- the label sheet and the **label preview in Admin › Settings** (`system-settings-form.tsx`, the QR box and label body use `bg-surface` / `text-foreground` today);
- the signature pad's canvas area (the canvas already paints white with a dark stroke; the PNG it exports must not change);
- QR tiles stay as they are (`qrcode.react` draws black on white with its own quiet zone);
- the camera image and its controls and scan frames keep their own colors (they are `permanent` N1 rows today);
- the attachment preview stage keeps black around a photo and white under a PDF page.

The toolbars, notices and titles around paper follow the theme (a white paper on a navy page is the intended look).

**Print.** A global `@media print` rule restores the light tokens and `color-scheme: only light`, out-ranking any dark selector, so Ctrl+P from any page in dark prints exactly what light prints today. Server PDFs (`src/lib/audit-pdf.tsx`) are unaffected.

**Photos with see-through backgrounds.** Thumbnails, model photos, brand logos and attachment tiles sit on a fixed light "image stage" in both themes, so dark ink in a transparent PNG stays visible. *(My call over flattening on the server, which would only cover the 96px thumbnail.)*

**App icon.** The opaque near-white icon tile in the sidebar and on the login page stays; in dark it gets a hairline frame so it does not read as a hole. *(My call; no new icon files.)*

### 4.5 Pages outside the shell
- **404.** There is no app `not-found.tsx` today; Next's built-in fallback follows the OS and ignores the cookie. Add an app-owned 404 built from the tokens and shared parts so it follows the choice. *(My call. A `global-error.tsx` follows only if it can use the tokens without the root layout.)*
- **Offline page** (`public/offline.html`, served by the service worker): it cannot read the cookie without script, so it follows the OS with its own `prefers-color-scheme` block using the same values; bump the service worker cache name so installed apps fetch it. *(My call.)*
- **Manifest, iOS status bar:** stay as today (non-goal).

## 5. The dark look (direction A)

### 5.1 Starting values
These are the mockup values the user chose. They are a starting point, not final: the builder tunes each one until every contrast rule of §6.1 passes, staying in the same direction (navy-tinted darks, light-blue primary, teal accent, saturated-but-lighter status inks on deep tinted fills).

| Role | Light today | Dark start |
|---|---|---|
| canvas (page behind panels) | `#EEF1F6` | `#0A1424` |
| surface / card (panels, table frame) | `#FFFFFF` | `#101D31` |
| sidebar, topbar and phone bottom bar | `#FFFFFF` | `#0D182A` |
| foreground | `#0B1D35` | `#E4EBF5` |
| muted-foreground | `#3C4F6B` | `#A9B7CC` |
| faint-foreground | `#56677F` | `#8A9AB2` |
| border / border-soft / control-border | `#D7DEE8` / `#E7EBF1` / `#C3CDDA` | `#22344F` / `#1A2A42` / `#34496A` |
| table head, row hover | `#F3F6FB` | `#14243B`, `#162741` |
| primary / primary-foreground | `#1E4F94` / `#FFFFFF` | `#6FA3EA` / `#08172C` |
| sidebar-active / its foreground / active icon | `#083161` / `#FFFFFF` / `#18A0A8` | `#1C3A66` / `#FFFFFF` / `#3CC6CE` |
| success ink / soft / border | `#1D7A35` / `#ECF7EF` / `#B3DCBF` | `#5CCB7B` / `#10291B` / `#235C36` |
| warning ink / soft / border | `#A14A05` / `#FDF4E4` / `#EDCB93` | `#F0A94D` / `#2E2110` / `#6B4A1C` |
| danger ink / soft / border | `#B3261E` / `#FCEFEE` / `#F1BEB9` | `#F08A80` / `#33171A` / `#6E2E2B` |
| info ink / soft / border | `#0A6E75` / `#E5F4F5` / `#A3D8DB` | `#4FCBD3` / `#0E2A2E` / `#1F5B60` |

The builder derives the remaining tokens (`background`, `popover`, `secondary`, `muted`, `accent`, `neutral-ink`, `input`, `ring`, every `-hover`, every `-foreground` on a solid status fill, `sidebar-hover`, `sidebar-muted`, `sidebar-border`, `brand-navy`, `brand-accent`) under these rules:

### 5.2 Rules for the dark set
- **Elevation.** Canvas is the darkest; panels (`surface`/`card`) are lighter than canvas; menus, popovers and dialogs are a step lighter than panels; the in-panel wells that use `background` (60+ sites, e.g. the asset page's field groups, dashboard tiles, settings sub-boxes) stay **darker than the panel they sit in**, as they are lighter-than-canvas but darker-than-card in light. Skeleton blocks (`muted`) stay visible on panels.
- **Solid fills with white text** (primary pressed, sidebar active, status solids, the bell's count dot): the ink on them keeps 4.5:1; where a dark status solid gets lighter, its `-foreground` becomes dark ink. The bell's count dot moves from `text-white` to the danger foreground token if the N1/overlay guard rules allow it, else its row is re-ruled. *(Builder's call within the guards.)*
- **Brand navy.** `--brand-navy` stays the brand fill. Text that uses it today (the two login headings) moves to `text-foreground` in both themes (visually the same in light: `#083161` vs `#0B1D35`). The primary button's pressed state (`active:bg-brand-navy` with `text-primary-foreground` in `button-variants.ts`) keeps a pressed look in dark with 4.5:1 ink: dark `brand-navy` gets a value that passes with the dark `primary-foreground`, or the pressed state moves to a pressed token (the contrast rule "primary-foreground on brand-navy" applies in both sets). *(My call; the builder picks which.)*
- **Shadows and scrim.** The navy-tinted overlay shadow and scrim (`--shadow-overlay`, `--color-scrim`) get dark values that still separate a dialog from the page (a darker, more opaque scrim; a black-based shadow plus the existing border). The field halos (`--shadow-field-focus`, `--shadow-field-error`) follow the dark `ring` and `danger`. Tailwind default shadows on the four non-paper sites (`asset-register-table.tsx` bulk bar, `mobile-field-navigation.tsx` scan button, `audit-scan-check-form.tsx`, the settings label sample) stay visible or rely on their border in dark.
- **Focus.** The focus ring keeps 3:1 against every surface it can sit on in both themes. No white ring gap in dark: Tailwind's default `ring-offset` color is white, so the offset follows the surface (one base rule or per-site tokens, builder's call). The sidebar's ring offset rule (`sidebar.tsx`) keeps its reason.
- **Native controls.** Date pickers, checkboxes, radios and selects render dark through `color-scheme`; `accent-color` follows the dark primary; the custom select chevron (a data-URI stroke today, which cannot read a variable) gets a dark version or moves to a `currentColor` mask.
- **Toasts.** Sonner keeps its light mode and the toast rules keep reading the tokens, so the toasts flip with the tokens; no `theme` prop. *(My call: smallest change, keeps `tests/feedback-states-ui.test.ts`.)*
- **Top bars.** The topbar (`topbar.tsx`) and the phone bottom bar (`mobile-field-navigation.tsx`) use `bg-surface` today; they move to the sidebar token so they share the chrome color of §5.1 (identical in light, both `#FFFFFF`), and the dark `theme-color` follows that chrome color. *(My call.)*
- **Not in the dark set:** Tailwind's default palette and raw colors stay banned outside the N1 `EXEMPT` rows, as today.

## 6. Constraints

### 6.1 Contrast (both themes, tested)
- The dark set passes every rule `tests/design-tokens-contrast.test.ts` applies to the light set today: text and inks 4.5:1 (`AA`) on every surface they can sit on, non-text (borders of controls, `input`, `ring`, the sidebar active icon) 3:1, the ordering rules (`border-soft` < `border` < `control-border` < `input`; `faint` < `muted-foreground` < `foreground` by contrast on card), and the "values that must differ" rules. Checks that use a literal white today (status inks "on white") use the dark card in the dark run.
- Dark values are 6-digit hex, like the light ones (the shared reader `src/lib/color-contrast.ts` parses `#RRGGBB` only), and every dark token has a light counterpart and the reverse.
- The token reader that today reads only the first `:root` block learns to read the dark block too; the light block stays first.

### 6.2 Guards and rules
- The `dark:` variant stays banned in components (`tests/ui-overlay-guards.test.ts` and the others that ban it). The theme is expressed only in `src/app/globals.css` (the token blocks, the forced-light scope, the print reset). `@custom-variant dark` is not needed and stays banned unless the builder shows it is.
- The guards and pins that encode light-only (`color-scheme: only light` pin, the exact `<html …>` string, theme-color equals the white card, manifest pins, the offline page pin) are rewritten to encode the two-theme rules, in the same commits that change what they pin.
- The N1 `EXEMPT` list gains rows only where paper must keep raw colors (for example the VOID banner or the label preview, if the builder makes them raw instead of using the forced-light scope), each with its `why` and ruling, like phase 2D.
- Forced colors: the existing `forced-colors` rules keep working in both themes, and the forced-light scope must not override system colors in forced-colors mode.

### 6.3 Project rules that apply
- No migration, no database write, no new dependency (no `next-themes`), no API change. Next.js 16.4: read `node_modules/next/dist/docs/` for `cookies()`, `generateViewport` and `viewport.themeColor` before writing them.
- Messages only through `scripts/messages-edit.mjs`; Thai words per `docs/19_THAI_GLOSSARY.md`.
- One commit per task, tests with each, the tree green after every commit; executors are subagents (Opus medium) and the main session reviews every task; dev-app check on a production build at 1440, 768 and 375 in both themes before merge; no writes to the database during checks.
- Docs: `DESIGN.md` replaces the "Light Only Rule" with a two-theme rule (tokens only, paper stays light, print stays light), scopes "Don't bring back a dark navy sidebar" to the light theme, and records the dark set; the "white" wording that describes surfaces says "panel"/"surface" or names the theme; `docs/14_UI_UX_DESIGN_SYSTEM.md` and `.impeccable/design.json` follow; a handoff section and a changelog entry as usual; the wiki (`ams-` pages) after the round.

## 7. Checks the build must pass
- Tests: both contrast sets; the rewritten guards; one test per behavior (cookie read and validation, the attribute on `<html>`, the toggle's icon, name and cookie write, the forced-light scope on each paper surface, the print reset, the 404 page).
- Dev-app check on `next start` in dark and light (and with no cookie, the OS emulated both ways) at 1440, 768 and 375, every page group: shell, dashboard, register and asset page, forms and dialogs, audit scan, disposal, maintenance, reports, admin, master data, login, 404, a print page and print preview; no white flash on reload (record a throttled load); axe color-contrast at 0 in both themes; forced colors in both themes; the PDF and label printouts unchanged.
- The E2E track that follows runs every workflow in both themes (wiki item 27).

## 8. Left to the builder
- Exact dark hex values (within §5), the attribute name and selector structure, how "follow the OS" is expressed in CSS, the ring-offset approach, the chevron approach, the image-stage token's name and value, how the app icon frame is drawn, the `generateViewport` details, the split of the work into tasks.

## 9. Calls I made (for the user to check)
1. The toggle's names: "เปลี่ยนเป็นโหมดมืด" / "เปลี่ยนเป็นโหมดสว่าง" (moon while light, sun while dark).
2. No toggle on the login page; it follows the cookie or the OS.
3. Cookie `theme`, one year, survives logout.
4. Toasts flip through the tokens (no `theme` prop).
5. Photos and logos sit on a fixed light backing in dark.
6. The app icon keeps its light tile with a thin frame in dark.
7. The login headings use the foreground color instead of brand navy (looks the same in light).
8. An app-owned 404 page that follows the theme; the offline page follows the OS.
9. Manifest splash and iOS status bar stay light.
10. The topbar and the phone bottom bar take the sidebar color (same in light, darker than panels in dark).
