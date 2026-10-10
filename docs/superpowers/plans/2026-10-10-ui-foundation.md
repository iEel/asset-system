# UI Round 4 · Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page of the asset system picks up the approved "light shell" look: the new color tokens, IBM Plex fonts with Thai-safe line heights, flat panels, one focus color, shape-coded status badges, and a white sidebar with sections. All of it lands through tokens and shared helpers, without recomposing pages.

**Architecture:** Colors live as hex tokens in the first `:root` block of `src/app/globals.css` and reach Tailwind through `@theme inline`. Values that are not plain colors (scrim, overlay shadow, line heights) go in a plain `@theme` block. Shared behaviour moves into small `src/lib` helpers with unit tests. Source-text guard tests in `tests/visual-foundation-guards.test.ts` stop old patterns from coming back. Each task leaves `npm test` green and fixes the old-look tests it breaks.

**Tech Stack:** Next.js 16.4 App Router · Tailwind CSS 4.2.4 (`@theme`, `@utility`, `@layer base`) · tw-animate-css 1.4 · tailwind-merge 3.5 · class-variance-authority 0.7.1 · next-intl 4 · `next/font/google` · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-foundation-design.md`. Section 15 overrides earlier sections where they conflict. The approved mockup is in `docs/superpowers/specs/2026-10-10-ui-foundation/`. **Do not copy token values from its `base.css` `:root`**: that block is an earlier draft. Use the values in this plan.

## Global Constraints

- Branch `feat/ui-foundation`. Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`. Commit only the files your task names. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Next.js 16.4 is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:** `git config core.autocrlf` is `true`. Every file this plan edits is CRLF except `src/components/ui/metric-card.tsx`, `public/sw.js` and `public/offline.html`, which are LF (many other repo files are LF too). Edit with exact-string replacement and never split and rejoin lines. Git may print "LF will be replaced by CRLF" for the LF files; ignore it. Tests that read source files must strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes.
- **Tests:** `npm test` runs `node scripts/run-tests.mjs`, which is `node --test` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. A single file runs as `node --test tests/<file>.test.ts`. Modules that tests import (`src/lib/*.ts`, `badge-variants.ts`, `manifest.ts`) use relative `.ts` imports, no `@/`, and erasable TypeScript only (no `enum`, `namespace` or parameter properties). Tests cannot import `.tsx`. `tsconfig.json` includes `tests/`, so test code must type-check too.
- **Baseline before Task 1:** `npm test` gives 1590 tests, 1589 pass, 0 fail, 1 skipped (the Windows symlink test). Lint has 0 errors; its 146 warnings are all under `.agents/`.
- **Every task ends with all of these green:** `npm test` (0 fail), `npx tsc --noEmit` (no errors) and `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database. Do not read or print `.env` or `.env.prod-admin`. Leave the untracked folders `.codex/`, `.impeccable/critique/`, `.playwright-mcp/` and `.superpowers/brainstorm/` alone.
- **Token file rules (`src/app/globals.css`):**
  - `src/lib/color-contrast.ts` `readRootTokens` reads only the **first** `:root {` block, up to its first `}`. The token block must stay the first `:root {` in the file.
  - Every custom property in that block (except `--radius`) needs a matching `--color-<name>: var(--<name>);` line in `@theme inline` (`tests/design-tokens-contrast.test.ts`).
  - Colors in `:root` are 6-digit hex. Non-color values go in the plain `@theme { }` block.
  - No `@custom-variant dark`, no `.dark` block, no `dark:` classes (`tests/ui-overlay-guards.test.ts`).
- **Banned classes** (`tests/ui-overlay-guards.test.ts`): `dark:…`, `bg-(success|warning|danger|info)/NN`, `bg-primary/(5|10|15|20)`. `fixed inset-0` is allowed only in `src/components/ui/` and `dashboard-shell.tsx`.
- **Messages:** edit `messages/th.json` / `messages/en.json` only through `node scripts/messages-edit.mjs <changes.json>`, run from the repo root. Keep the change file in your temp/scratch folder, never in the repo. Thai values must pass `tests/thai-glossary.test.ts`: no bare `หมวด`, and no English `Asset`/`Label`/`Tag` in Thai values.
- **Token values (verbatim, spec §3.1):**

| token | value | | token | value |
|---|---|---|---|---|
| `--brand-navy` | `#083161` | | `--success` / `-soft` / `-border` / `-hover` | `#1D7A35` / `#ECF7EF` / `#B3DCBF` / `#17652C` |
| `--brand-accent` | `#18A0A8` | | `--warning` / `-soft` / `-border` / `-hover` | `#A14A05` / `#FDF4E4` / `#EDCB93` / `#843C04` |
| `--canvas` | `#EEF1F6` | | `--danger` / `-soft` / `-border` / `-hover` | `#B3261E` / `#FCEFEE` / `#F1BEB9` / `#931F18` |
| `--background` | `#F6F8FB` | | `--info` / `-soft` / `-border` / `-hover` | `#0A6E75` / `#E5F4F5` / `#A3D8DB` / `#085A60` |
| `--foreground` and every `*-foreground` that was `#0F172A` | `#0B1D35` | | `--sidebar` | `#FFFFFF` |
| `--card`, `--popover` | `#FFFFFF` | | `--sidebar-foreground` | `#1F3657` |
| `--primary` / `-hover` / `-soft` / `-border` | `#1E4F94` / `#173E76` / `#E9EFF8` / `#BACBE4` | | `--sidebar-muted` | `#586A84` |
| `--secondary`, `--muted` | `#E9EEF5` | | `--sidebar-hover` | `#EBF0F7` |
| `--muted-foreground` | `#3C4F6B` | | `--sidebar-active` | `#083161` |
| `--accent` | `#EBF0F7` | | `--sidebar-active-foreground` | `#FFFFFF` |
| `--border` | `#D7DEE8` | | `--sidebar-active-icon` | `#18A0A8` |
| `--input` | `#7C8BA0` | | `--sidebar-border` | `#D7DEE8` |
| `--ring` | `#10858D` | | white-text foregrounds (`--primary-foreground`, tone `-foreground`) | `#FFFFFF` |

## Review Focus

1. **A page the menu does not list exactly** (`/th/assets/123`, `/th/assets/new`, `/th/assets?page=2`, `/th/assets/`) must highlight the closest menu row and open its group. `/th/assets-archive` must not highlight "ทะเบียน". The matching and the "group contains the active row" check are pinned by `tests/navigation-active.test.ts` (Task 6); the group actually opening is checked on the dev app in Task 8.
2. **A user who sees only part of the menu** must not see an empty section heading or an empty group. Pinned by the section-filter test in `tests/navigation-active.test.ts` (Task 6).
3. **Keyboard users on controls that have no ring of their own** (30 checkboxes) **and Windows high-contrast users** must still see focus. Pinned by the base-outline and forced-colors guards (Task 2).
4. **Thai labels in short or truncated slots** (the mobile bottom bar) must not lose stacked vowels and tone marks. Pinned by the guard that bans `leading-tight` and `text-[11px]` in the bottom bar (Task 7); checked by eye in Task 8.
5. **Users who ask for reduced motion** must get dialogs and drawers without slide or zoom. Pinned by the guard on `motion-reduce:animate-none!` in the three overlay primitives (Task 4).

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/app/globals.css` | tokens, `@theme` values, base rules, line heights, utilities | 1, 2, 3, 4 |
| `tests/design-tokens-contrast.test.ts` | contrast and token-exposure rules | 1, 3 |
| `tests/helpers/source-files.ts` (new) | shared source walker for guard tests | 2 |
| `tests/visual-foundation-guards.test.ts` (new) | guards that keep the old look from returning | 2, 3, 4, 5, 7 |
| `src/app/layout.tsx` | font loading, viewport theme color | 3, 7 |
| `src/lib/design-system.ts` | panel, field and metric helpers | 4 |
| `src/components/ui/{dialog,alert-dialog,sheet,popover,dropdown-menu,accessible-dialog}.tsx` | overlay surfaces | 4 |
| `src/components/ui/badge-variants.ts`, `status-badge.tsx`, `src/lib/status-tone.ts` | status badge | 5 |
| `src/lib/navigation-active.ts` (new), `src/lib/navigation-permissions.ts` | active-row matching, section filtering | 6 |
| `src/components/layout/sidebar.tsx` | white sidebar with sections | 1 (interim colors), 6 (rewrite) |
| `src/components/layout/topbar.tsx`, `mobile-field-navigation.tsx`, `src/app/manifest.ts`, `public/sw.js`, `public/offline.html` | shell edges and PWA | 7 |
| docs (`DESIGN.md`, `.impeccable/design.json`, `docs/…`) | design documentation | 9 |

---

### Task 0: Baseline screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-foundation/before/` (git-ignored by `.superpowers/sdd/.gitignore`)

**Interfaces:**
- Consumes: HEAD before any Task 1 change.
- Produces: the before images Task 8 compares against, named `<view>-<width>.png`.

- [ ] **Step 1:** Read `.env` keys `DATABASE_URL` and `DB_USER` without printing secrets. Confirm the database is `asset_management_dev` and the user is `asset_dev`; otherwise stop.
- [ ] **Step 2:** Create `.claude/launch.json` (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`), run `preview_start`, and log in with the seed admin (`prisma/seed.ts:151-159`) without echoing the password.
- [ ] **Step 3:** At 1440 and 375 px, screenshot `/th/dashboard`, `/th/assets`, the detail of asset `GRL-COM-24-0003`, `/th/assets/new`, `/th/work-center`, round `AUD-2026-0003`, `/th/admin/users`, `/th/admin/roles` and one AccessibleDialog. Also take the collapsed desktop sidebar at 1440 only, the mobile "เพิ่มเติม" drawer at 375 only, and the login page at both widths. Add print previews of one label (`/th/assets/<id>/label`) and of the three A4 documents listed in Task 8 Step 7.
- [ ] **Step 4:** Stop the server, delete `.claude/launch.json`, and confirm `git status --short` shows nothing new. `next dev` can rewrite the AGENTS.md block or `next-env.d.ts`; if it does, report it and do not commit. No commit in this task.

---

### Task 1: Light-shell color tokens

**Files:**
- Modify: `src/app/globals.css` (lines 4-56 token block, lines 58-112 `@theme inline`, new plain `@theme` block)
- Modify: `tests/design-tokens-contrast.test.ts` (whole file)
- Modify: `tests/modern-enterprise-theme.test.ts` (first two tests)
- Modify: `tests/visual-consistency-ui.test.ts` (first test)
- Modify: `src/components/layout/sidebar.tsx` (interim color classes only)
- Modify: `src/components/assets/asset-register-filter-chips.tsx:31`, `src/components/assets/asset-register-filter-sheet.tsx:251`, `src/components/assets/asset-register-row-actions.tsx:261`, `src/components/assets/asset-register-status-tabs.tsx:25`, `src/components/audit/audit-scan-room-picker.tsx:48`

**Interfaces:**
- Consumes: nothing.
- Produces: the Tailwind color utilities `bg-canvas`, `border-primary-border`, `text-sidebar-active-foreground`, `text-sidebar-active-icon`, `border-sidebar-border`, `bg-scrim`, and the `shadow-overlay` utility. Later tasks rely on these names.

- [ ] **Step 1: Replace `tests/design-tokens-contrast.test.ts` with the new rules**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  contrastRatio,
  mixOver,
  parseHexColor,
  readRootTokens,
  resolveToken,
  type Rgb,
} from "../src/lib/color-contrast.ts"

const tokens = readRootTokens(readFileSync("src/app/globals.css", "utf8"))
const color = (name: string) => parseHexColor(resolveToken(tokens, name))
const white = parseHexColor("#FFFFFF")
const AA = 4.5
// WCAG 1.4.11: focus rings, field borders and meaningful icons need 3:1 against what they sit on.
const NON_TEXT = 3

function assertContrast(foreground: string, background: string | Rgb, minimum: number, label: string) {
  const backgroundColor = typeof background === "string" ? color(background) : background
  const ratio = contrastRatio(color(foreground), backgroundColor)
  assert.ok(ratio >= minimum, `${label}: ${ratio.toFixed(3)}:1 < ${minimum}:1`)
}

function assertAA(foreground: string, background: string | Rgb, label: string) {
  assertContrast(foreground, background, AA, label)
}

test("contrast helpers match WCAG reference values", () => {
  assert.equal(contrastRatio(parseHexColor("#000000"), white).toFixed(2), "21.00")
  assert.equal(contrastRatio(parseHexColor("#F59E0B"), white).toFixed(2), "2.15")
  assert.deepEqual(mixOver(parseHexColor("#000000"), 0.5), [127.5, 127.5, 127.5])
  assert.throws(() => parseHexColor("red"), /Unsupported color/)
})

test("resolveToken follows var() aliases and rejects cycles", () => {
  assert.equal(resolveToken({ a: "var(--b)", b: "#123456" }, "a"), "#123456")
  assert.throws(() => resolveToken({ a: "var(--a)" }, "a"), /cycle/)
  assert.throws(() => resolveToken({}, "nope"), /missing/)
})

for (const tone of ["success", "warning", "danger", "info"] as const) {
  test(`${tone} text is AA on every surface it sits on`, () => {
    assertAA(tone, white, `${tone} on white`)
    for (const surface of ["background", "card", "muted", "accent", "canvas", `${tone}-soft`]) {
      assertAA(tone, surface, `${tone} on ${surface}`)
    }
  })

  test(`${tone} solid and hover fills keep their foreground AA`, () => {
    assertAA(`${tone}-foreground`, tone, `${tone}-foreground on ${tone}`)
    assertAA(`${tone}-foreground`, `${tone}-hover`, `${tone}-foreground on ${tone}-hover`)
  })
}

test("primary and destructive pairs are AA", () => {
  assertAA("primary-foreground", "primary", "primary-foreground on primary")
  assertAA("primary-foreground", "primary-hover", "primary-foreground on primary-hover")
  assertAA("primary", "primary-soft", "primary on primary-soft")
  for (const surface of ["background", "muted", "accent", "canvas"]) {
    assertAA("primary", surface, `primary on ${surface}`)
  }
  assertAA("destructive-foreground", "destructive", "destructive-foreground on destructive")
})

test("neutral text pairs are AA", () => {
  for (const surface of ["background", "card", "popover", "muted", "accent", "canvas"]) {
    assertAA("foreground", surface, `foreground on ${surface}`)
    assertAA("muted-foreground", surface, `muted-foreground on ${surface}`)
  }
  assertAA("card-foreground", "card", "card-foreground on card")
  assertAA("popover-foreground", "popover", "popover-foreground on popover")
  assertAA("secondary-foreground", "secondary", "secondary-foreground on secondary")
  assertAA("accent-foreground", "accent", "accent-foreground on accent")
})

test("light sidebar pairs are readable", () => {
  assertAA("sidebar-foreground", "sidebar", "sidebar-foreground on sidebar")
  assertAA("sidebar-foreground", "sidebar-hover", "sidebar-foreground on sidebar-hover")
  assertAA("sidebar-muted", "sidebar", "sidebar-muted on sidebar")
  assertAA("sidebar-active-foreground", "sidebar-active", "sidebar-active-foreground on sidebar-active")
  assertContrast("sidebar-active-icon", "sidebar-active", NON_TEXT, "sidebar-active-icon on sidebar-active")
  assertContrast("ring", "sidebar", NON_TEXT, "ring on sidebar")
})

test("focus ring and field borders reach 3:1 on the surfaces they sit on", () => {
  for (const surface of ["card", "background", "canvas", "muted"]) {
    assertContrast("ring", surface, NON_TEXT, `ring on ${surface}`)
  }
  for (const surface of ["card", "background", "canvas"]) {
    assertContrast("input", surface, NON_TEXT, `input on ${surface}`)
  }
})

test("roles that must look different stay different", () => {
  const value = (name: string) => resolveToken(tokens, name).toUpperCase()
  assert.notEqual(value("info"), value("primary"), "info must not reuse the primary color")
  assert.notEqual(value("canvas"), value("card"), "the page canvas must differ from panels")
  assert.notEqual(value("canvas"), value("background"), "the canvas must differ from field and dialog backgrounds")
})

test("every token is exposed to Tailwind through @theme inline", () => {
  const css = readFileSync("src/app/globals.css", "utf8")
  for (const name of Object.keys(tokens)) {
    if (name === "radius") continue
    assert.match(css, new RegExp(`--color-${name}:\\s*var\\(--${name}\\);`), `--color-${name} missing in @theme inline`)
  }
  assert.match(css, /--font-sans:\s*var\(--font-inter\),\s*var\(--font-thai\)/)
  assert.match(css, /@import "tw-animate-css";/)
  assert.doesNotMatch(css, /@custom-variant dark/)
})
```

(The font regex stays as it is until Task 3.)

- [ ] **Step 2: Rewrite the first two tests of `tests/modern-enterprise-theme.test.ts`**

Replace the two tests `"modern enterprise tokens keep brand, action, and navigation roles separate"` and `"normal white action text meets WCAG AA contrast"` (lines 32-46) with the code below. Keep the helpers above them and the last two tests below them unchanged.

```ts
test("modern enterprise tokens keep brand, action, and navigation roles separate", () => {
  const source = css()
  assert.notEqual(token(source, "primary"), token(source, "brand-navy"), "actions use their own blue, not the logo navy")
  assert.equal(token(source, "sidebar-active"), token(source, "brand-navy"), "the selected menu row carries the logo navy")
  assert.equal(token(source, "sidebar-active-icon"), token(source, "brand-accent"), "the selected menu icon carries the logo teal")
  assert.equal(token(source, "sidebar"), token(source, "card"), "the light-shell sidebar is a white surface")
  assert.notEqual(token(source, "info"), token(source, "primary"), "info has its own teal ink")
})

test("normal white action text meets WCAG AA contrast", () => {
  const source = css()
  assert.ok(contrast("#FFFFFF", token(source, "primary")) >= 4.5)
  assert.ok(contrast("#FFFFFF", token(source, "brand-navy")) >= 4.5)
  assert.ok(
    contrast("#FFFFFF", token(source, "brand-accent")) < 4.5,
    "the teal brand accent is for icons and focus, never a white-text fill",
  )
})
```

- [ ] **Step 3: Rewrite the first test of `tests/visual-consistency-ui.test.ts`**

Add `import { readRootTokens } from "../src/lib/color-contrast.ts"` below the existing imports. Replace the test `"app shell uses the agreed Navy and Electric Blue visual tokens"` (lines 7-18) with the code below. The two theme-color lines stay on the old value until Task 7.

```ts
test("app shell uses the light-shell visual tokens", async () => {
  const globals = readSource("src/app/globals.css")
  const layout = readSource("src/app/layout.tsx")
  const { default: manifest } = await import("../src/app/manifest.ts")
  const tokens = readRootTokens(globals)

  assert.equal(tokens["sidebar-active"], tokens["brand-navy"])
  assert.notEqual(tokens.primary, tokens["brand-navy"])
  assert.notEqual(tokens.canvas, tokens.card)
  assert.match(layout, /themeColor: "#0F172A"/)
  assert.equal(manifest().theme_color, "#0F172A")
})
```

- [ ] **Step 4: Run the three tests and confirm they fail for the right reason**

Run: `node --test tests/design-tokens-contrast.test.ts tests/modern-enterprise-theme.test.ts tests/visual-consistency-ui.test.ts`
Expected: FAIL in 11 tests: `Token --canvas is missing` (tone, primary, neutral and focus/input tests), `Token --sidebar-active-foreground is missing` (sidebar test), `info must not reuse the primary color`, and `'#1E3A8A' !== '#0F172A'` (sidebar-active vs brand-navy) in the two theme tests.

- [ ] **Step 5: Replace the token block in `src/app/globals.css`**

Replace lines 4-56 (the comment line and the whole first `:root { … }` block) with:

```css
/* Enterprise color tokens, UI round 4 "light shell" palette (shadcn/ui naming). Every pair is checked by tests/design-tokens-contrast.test.ts. */
:root {
  --brand-navy: #083161;
  --brand-accent: #18A0A8;
  --canvas: #EEF1F6;
  --background: #F6F8FB;
  --foreground: #0B1D35;
  --card: #FFFFFF;
  --card-foreground: #0B1D35;
  --surface: var(--card);
  --popover: #FFFFFF;
  --popover-foreground: #0B1D35;
  --primary: #1E4F94;
  --primary-foreground: #FFFFFF;
  --primary-soft: #E9EFF8;
  --primary-hover: #173E76;
  --primary-border: #BACBE4;
  --secondary: #E9EEF5;
  --secondary-foreground: #0B1D35;
  --muted: #E9EEF5;
  --muted-foreground: #3C4F6B;
  --accent: #EBF0F7;
  --accent-foreground: #0B1D35;
  --border: #D7DEE8;
  --input: #7C8BA0;
  --ring: #10858D;
  --success: #1D7A35;
  --success-foreground: #FFFFFF;
  --success-soft: #ECF7EF;
  --success-border: #B3DCBF;
  --success-hover: #17652C;
  --warning: #A14A05;
  --warning-foreground: #FFFFFF;
  --warning-soft: #FDF4E4;
  --warning-border: #EDCB93;
  --warning-hover: #843C04;
  --danger: #B3261E;
  --danger-foreground: #FFFFFF;
  --danger-soft: #FCEFEE;
  --danger-border: #F1BEB9;
  --danger-hover: #931F18;
  --destructive: var(--danger);
  --destructive-foreground: var(--danger-foreground);
  --info: #0A6E75;
  --info-foreground: #FFFFFF;
  --info-soft: #E5F4F5;
  --info-border: #A3D8DB;
  --info-hover: #085A60;
  --sidebar: #FFFFFF;
  --sidebar-foreground: #1F3657;
  --sidebar-muted: #586A84;
  --sidebar-hover: #EBF0F7;
  --sidebar-active: #083161;
  --sidebar-active-foreground: #FFFFFF;
  --sidebar-active-icon: #18A0A8;
  --sidebar-border: #D7DEE8;
  --radius: 0.5rem;
}
```

Keep every value a literal hex, even where two tokens share a value (`--muted`/`--secondary`, `--accent`/`--sidebar-hover`). `tests/modern-enterprise-theme.test.ts` reads literal hex.

- [ ] **Step 6: Expose the new tokens and add the plain `@theme` block**

In the `@theme inline { … }` block:
- after `--color-background: var(--background);` add `  --color-canvas: var(--canvas);`
- after `--color-primary-hover: var(--primary-hover);` add `  --color-primary-border: var(--primary-border);`
- after `--color-sidebar-active: var(--sidebar-active);` add:

```css
  --color-sidebar-active-foreground: var(--sidebar-active-foreground);
  --color-sidebar-active-icon: var(--sidebar-active-icon);
  --color-sidebar-border: var(--sidebar-border);
```

Directly after the closing `}` of `@theme inline`, add:

```css

/* Values that are not plain colors live here, not in :root (the token test expects a --color-* mapping for every :root entry). */
@theme {
  --color-scrim: rgb(8 49 97 / 0.45);
  --shadow-overlay: 0 12px 32px -8px rgb(8 49 97 / 0.18), 0 2px 6px -2px rgb(8 49 97 / 0.1);
}
```

- [ ] **Step 7: Keep the dark-styled sidebar readable on the new white sidebar (interim; Task 6 rewrites the file)**

In `src/components/layout/sidebar.tsx`:
- replace every `border-white/10` with `border-sidebar-border` (4 places: lines 197, 235, 267, 314)
- remove every ` hover:text-white` (3 places: lines 206, 302, 337)
- line 199: `text-lg font-semibold text-white` → `text-lg font-semibold text-foreground`
- line 303: `hasActiveChild && "text-brand-accent"` → `hasActiveChild && "font-semibold"`
- line 339: `"bg-sidebar-active font-medium text-white"` → `"bg-sidebar-active font-medium text-sidebar-active-foreground"`

Check: `grep -n "text-white\|border-white" src/components/layout/sidebar.tsx` prints nothing.

- [ ] **Step 8: Give the navy-soft selected chips a navy border**

`border-info-border` is teal now, so the five places that pair it with `bg-primary-soft` change `border-info-border` to `border-primary-border`, and nothing else on the line changes:
- `src/components/assets/asset-register-filter-chips.tsx:31`
- `src/components/assets/asset-register-filter-sheet.tsx:251`
- `src/components/assets/asset-register-row-actions.tsx:261`
- `src/components/assets/asset-register-status-tabs.tsx:25`
- `src/components/audit/audit-scan-room-picker.tsx:48`

Check: `grep -rn "border-info-border bg-primary-soft" src` prints only `src/components/ui/badge-variants.ts` (Task 5 handles it).

- [ ] **Step 9: Run the tests**

Run: `node --test tests/design-tokens-contrast.test.ts tests/modern-enterprise-theme.test.ts tests/visual-consistency-ui.test.ts`
Expected: PASS.
Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 failures, no type errors, 0 lint errors.

- [ ] **Step 10: Commit**

```bash
git add src/app/globals.css tests/design-tokens-contrast.test.ts tests/modern-enterprise-theme.test.ts tests/visual-consistency-ui.test.ts src/components/layout/sidebar.tsx src/components/assets/asset-register-filter-chips.tsx src/components/assets/asset-register-filter-sheet.tsx src/components/assets/asset-register-row-actions.tsx src/components/assets/asset-register-status-tabs.tsx src/components/audit/audit-scan-room-picker.tsx
git commit -m "feat(ui): light-shell color tokens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: One focus color

**Files:**
- Modify: 83 files under `src/` through a one-off codemod (the script stays in your temp folder)
- Modify: `src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx`, `src/components/master-data/supplier-form.tsx`, `src/components/master-data/supplier-list-view.tsx` (drop `/40`)
- Modify: `src/app/globals.css` (base focus outline and forced-colors outline)
- Modify: `src/components/audit/audit-scan-check-panel.tsx:39`, `src/components/disposal/disposal-bulk-approval.tsx:382`, `src/components/disposal/disposal-bulk-execution.tsx:579-580`
- Create: `tests/helpers/source-files.ts`
- Create: `tests/visual-foundation-guards.test.ts`
- Modify: `tests/ui-overlay-guards.test.ts` (lines 1-24), `tests/asset-label-print-ui.test.ts:54`, `tests/design-system.test.ts:33`

**Interfaces:**
- Consumes: `--ring` (`#10858D`) from Task 1.
- Produces:
  - `tests/helpers/source-files.ts` exports `type SourceFile = { path: string; source: string }`, `readSourceFiles(root: string): SourceFile[]` and `findMatches(files: SourceFile[], pattern: RegExp, allow?: (path: string) => boolean): string[]`.
  - `tests/visual-foundation-guards.test.ts` exists. Later tasks append tests to it; each new test reuses the module-level constants `sources`, `read` and `globals` defined here.

- [ ] **Step 1: Create `tests/helpers/source-files.ts`**

```ts
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

export type SourceFile = { path: string; source: string }

// Reads every .ts/.tsx file under root with "/" paths and LF line endings.
export function readSourceFiles(root: string): SourceFile[] {
  const files: SourceFile[] = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) files.push(...readSourceFiles(path))
    else if (/\.(ts|tsx)$/.test(entry)) {
      files.push({ path: path.replace(/\\/g, "/"), source: readFileSync(path, "utf8").replace(/\r\n/g, "\n") })
    }
  }
  return files
}

export function findMatches(files: SourceFile[], pattern: RegExp, allow: (path: string) => boolean = () => false): string[] {
  return files
    .filter((file) => !allow(file.path))
    .flatMap((file) => [...file.source.matchAll(pattern)].map((match) => `${file.path}: ${match[0]}`))
}
```

`scripts/run-tests.mjs` only runs `*.test.*`, so this file is never run as a test.

- [ ] **Step 2: Point `tests/ui-overlay-guards.test.ts` at the helper**

Replace lines 1-24 (the imports, the exported `readSourceFiles`, `const sources` and `function findMatches`) with the code below. Nothing else in the file uses `node:fs` or `node:path`.

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { findMatches as findSourceMatches, readSourceFiles } from "./helpers/source-files.ts"

const sources = readSourceFiles("src")

function findMatches(pattern: RegExp, allow: (path: string) => boolean = () => false) {
  return findSourceMatches(sources, pattern, allow)
}
```

Run `node --test tests/ui-overlay-guards.test.ts`. Expected: PASS, with the same test count as before.

- [ ] **Step 3: Write the failing guard file `tests/visual-foundation-guards.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findMatches, readSourceFiles } from "./helpers/source-files.ts"

const sources = readSourceFiles("src")
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const globals = () => read("src/app/globals.css")

test("focus styles use the single ring token", () => {
  assert.deepEqual(findMatches(sources, /(focus|focus-visible|focus-within):(ring|border)-(primary|brand-accent)(?![\w-])/g), [])
  assert.deepEqual(findMatches(sources, /focus-visible:ring-ring\/40(?![\w-])/g), [], "a see-through ring alone cannot reach 3:1")
})

test("every element gets a visible focus outline, also in Windows high-contrast mode", () => {
  const css = globals()
  assert.match(css, /@layer base \{\s*:focus-visible \{\s*outline: 2px solid var\(--ring\);\s*outline-offset: 2px;\s*\}\s*\}/)
  assert.match(css, /@media \(forced-colors: active\) \{\s*:focus-visible \{\s*outline: 2px solid CanvasText;\s*outline-offset: 2px;\s*\}\s*\}/)
  const forcedColorsAt = css.indexOf("@media (forced-colors: active)")
  const layerOpen = css.lastIndexOf("@layer", forcedColorsAt)
  const layerClose = layerOpen === -1 ? -1 : css.indexOf("\n}", layerOpen)
  assert.ok(layerOpen === -1 || layerClose < forcedColorsAt, "the forced-colors outline must sit outside every @layer so it beats outline-none")
})

test("script-focused containers do not draw an outline around whole forms", () => {
  assert.match(read("src/components/audit/audit-scan-check-panel.tsx"), /tabIndex=\{-1\} className="text-base font-semibold text-foreground outline-none"/)
  assert.match(read("src/components/disposal/disposal-bulk-approval.tsx"), /tabIndex=\{-1\} className=\{cn\("outline-none", className\)\}/)
  assert.match(read("src/components/disposal/disposal-bulk-execution.tsx"), /tabIndex=\{-1\}\s*className=\{cn\("outline-none", className\)\}/)
})
```

Run: `node --test tests/visual-foundation-guards.test.ts`
Expected: FAIL. All three tests fail: the guard lists 647 matches, and the outline rules and `outline-none` are missing.

- [ ] **Step 4: Run the codemod**

Save this as `codemod-focus.mjs` in your temp/scratch folder (not in the repo), then run `node <temp>/codemod-focus.mjs` from the repo root:

```js
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const pattern = /(focus|focus-visible|focus-within):(ring|border)-(primary|brand-accent)(\/\d+)?(?![\w-])/g
let total = 0
const perFile = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(ts|tsx|css)$/.test(entry)) {
      const source = readFileSync(path, "utf8")
      const count = (source.match(pattern) ?? []).length
      if (count === 0) continue
      writeFileSync(path, source.replace(pattern, "$1:$2-ring$4"))
      total += count
      perFile.push(`${path.replace(/\\/g, "/")}: ${count}`)
    }
  }
}

walk("src")
console.log(perFile.join("\n"))
console.log(`total ${total} in ${perFile.length} files`)
```

Expected output ends with `total 647 in 83 files`. If the count differs, stop and report it; do not commit.
Check: `git diff --stat -- src | tail -1` shows `83 files changed` with equal insertions and deletions, and `git diff --ignore-cr-at-eol --stat -- src | tail -1` shows the same. Keep the `-- src`: Step 2 already changed `tests/ui-overlay-guards.test.ts`, which would otherwise make the counts unequal.

- [ ] **Step 5: Drop the see-through ring where it is the only focus mark**

In the three supplier files, replace every `focus-visible:ring-ring/40` with `focus-visible:ring-ring`. There are 15 in total: `suppliers/page.tsx` 4, `supplier-form.tsx` 3, `supplier-list-view.tsx` 8. Leave `focus:ring-ring/30` (2) and `focus:ring-ring/20` (2) alone. Those are halos next to a solid `focus:border-ring`.

Check: `grep -rn "ring-ring/40" src` prints nothing.

- [ ] **Step 6: Add the base outline rules to `src/app/globals.css`**

Append at the end of the file:

```css

/* Focus: one ring color everywhere. Utilities with outline-none keep their own ring; everything else gets this outline. */
@layer base {
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
}

/* Windows high-contrast mode drops box-shadow rings. Unlayered on purpose so it beats outline-none utilities. */
@media (forced-colors: active) {
  :focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }
}
```

- [ ] **Step 7: Keep the outline off containers that are focused by script**

- `src/components/audit/audit-scan-check-panel.tsx:39`: `className="text-base font-semibold text-foreground"` → `className="text-base font-semibold text-foreground outline-none"`
- `src/components/disposal/disposal-bulk-approval.tsx:382`: `tabIndex={-1} className={className}` → `tabIndex={-1} className={cn("outline-none", className)}`, and add `import { cn } from "@/lib/utils"` to the imports (the file has no `cn` import yet)
- `src/components/disposal/disposal-bulk-execution.tsx:580` (the line after `tabIndex={-1}`): `className={className}` → `className={cn("outline-none", className)}`, and add `import { cn } from "@/lib/utils"`

- [ ] **Step 8: Update the two tests that pinned the old focus class**

- `tests/asset-label-print-ui.test.ts:54`: `assert.match(form, /focus-visible:ring-2 focus-visible:ring-primary/)` → `assert.match(form, /focus-visible:ring-2 focus-visible:ring-ring/)`
- `tests/design-system.test.ts:33`: `assert.match(getFieldControlClasses(), /focus:border-primary/)` → `assert.match(getFieldControlClasses(), /focus:border-ring/)`

- [ ] **Step 9: Run the tests**

Run: `node --test tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/asset-label-print-ui.test.ts tests/design-system.test.ts`
Expected: PASS.
Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add src tests/helpers/source-files.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/asset-label-print-ui.test.ts tests/design-system.test.ts
git commit -m "feat(ui): one focus ring color with a base and high-contrast outline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git add src` is safe here because Step 4 only touched tracked files. Run `git status --short src` first and confirm no untracked file appears.)

---

### Task 3: IBM Plex fonts and Thai line heights

**Files:**
- Modify: `src/app/layout.tsx` (lines 2, 7-8, 43)
- Modify: `src/app/globals.css` (`--font-sans` in `@theme inline`, `--font-mono`, plain `@theme`, base rules, utilities, toast font)
- Modify: `src/components/ui/metric-card.tsx:19` (LF file)
- Modify: `tests/design-tokens-contrast.test.ts` (font assertion), `tests/visual-foundation-guards.test.ts` (append)

**Interfaces:**
- Consumes: the plain `@theme { … }` block from Task 1, and the `sources`, `read`, `globals` constants and the `findMatches` import in `tests/visual-foundation-guards.test.ts` from Task 2.
- Produces: the CSS variables `--font-plex-sans`, `--font-plex-thai`, `--font-plex-mono` and the utilities `num` and `tag`. Phase 2 uses `tag`; nothing in this phase uses it.

- [ ] **Step 1: Change the font assertion in `tests/design-tokens-contrast.test.ts`**

In the last test, replace `assert.match(css, /--font-sans:\s*var\(--font-inter\),\s*var\(--font-thai\)/)` with:

```ts
  assert.match(css, /--font-sans:\s*var\(--font-plex-sans\),\s*var\(--font-plex-thai\),/)
  assert.match(css, /--font-mono:\s*var\(--font-plex-mono\),\s*ui-monospace/)
```

- [ ] **Step 2: Append the font guards to `tests/visual-foundation-guards.test.ts`**

```ts
test("fonts load once, in the root layout, with Plex Sans before Plex Sans Thai", () => {
  const fontImports = findMatches(sources, /from "next\/font\/(google|local)"/g)
  assert.deepEqual(fontImports.map((match) => match.split(": ")[0]), ["src/app/layout.tsx"])
  const layout = read("src/app/layout.tsx")
  assert.match(layout, /IBM_Plex_Sans\(\{ subsets: \["latin"\], variable: "--font-plex-sans", display: "swap" \}\)/)
  assert.match(layout, /IBM_Plex_Sans_Thai\(\{[^)]*weight: \["400", "500", "600", "700"\][^)]*variable: "--font-plex-thai"/)
  assert.match(layout, /IBM_Plex_Mono\(\{[^)]*weight: \["400", "500", "600"\][^)]*preload: false[^)]*adjustFontFallback: false/)
  assert.match(layout, /<html lang=\{locale\} suppressHydrationWarning className=\{`\$\{plexSans\.variable\} \$\{plexSansThai\.variable\} \$\{plexMono\.variable\}`\}>/)
})

test("line heights are ratios, and Thai pages get room for stacked marks", () => {
  const css = globals()
  assert.match(css, /--text-sm--line-height: calc\(22 \/ 14\);/)
  assert.match(
    css,
    /html:lang\(th\) \{[^}]*--text-xs--line-height: calc\(18 \/ 12\);[^}]*--text-xl--line-height: calc\(30 \/ 20\);[^}]*--text-2xl--line-height: calc\(36 \/ 24\);[^}]*--text-3xl--line-height: calc\(44 \/ 30\);/,
  )
  assert.doesNotMatch(css, /--text-[a-z0-9]+--line-height: \d+px/, "px line heights would be inherited by text-[11px] children")
  assert.match(css, /@utility num \{\s*font-variant-numeric: tabular-nums lining-nums;\s*\}/)
  assert.match(css, /@utility tag \{/)
  assert.match(css, /:root \[data-sonner-toaster\] \{\s*font-family: var\(--font-sans\);\s*\}/)
  assert.match(read("src/components/ui/metric-card.tsx"), /cn\("num mt-2 font-bold"/)
})
```

Run: `node --test tests/visual-foundation-guards.test.ts tests/design-tokens-contrast.test.ts`
Expected: FAIL in the two new guard tests and in the token-exposure test.

- [ ] **Step 3: Load the fonts in `src/app/layout.tsx`**

Line 2: `import { Inter, Noto_Sans_Thai } from "next/font/google"` → `import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Thai } from "next/font/google"`

Lines 7-8 become:

```tsx
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-plex-sans", display: "swap" })
const plexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
})
// Mono is for asset tags and codes; it is not preloaded, and without the Arial size-adjusted fallback the system monospace shows while it loads.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
})
```

The `<html lang={locale} …>` line (line 43 before this step's edits) becomes:

```tsx
    <html lang={locale} suppressHydrationWarning className={`${plexSans.variable} ${plexSansThai.variable} ${plexMono.variable}`}>
```

`lang={locale}` stays the first attribute (`tests/html-lang-and-years.test.ts`). IBM Plex Sans is a variable font, so it takes no `weight`. Plex Sans Thai and Plex Mono require `weight`.

- [ ] **Step 4: Font stacks, line heights, utilities and toast font in `src/app/globals.css`**

In `@theme inline`, replace `  --font-sans: var(--font-inter), var(--font-thai), ui-sans-serif, system-ui, sans-serif;` with:

```css
  --font-sans: var(--font-plex-sans), var(--font-plex-thai), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

Plex Sans comes first because its digits are tabular and Plex Sans Thai's digits are not. Thai characters fall through to Plex Sans Thai.

In the plain `@theme { … }` block from Task 1, add a last line:

```css
  /* Only text-sm differs from Tailwind's defaults for every language (20px → 22px). Ratios, so children with an arbitrary font size inherit a ratio, not a fixed px value. */
  --text-sm--line-height: calc(22 / 14);
```

Append at the end of the file:

```css

/* Thai stacked vowels and tone marks need at least ~1.44× the font size. Values are ratios. */
@layer base {
  html:lang(th) {
    --text-xs--line-height: calc(18 / 12);
    --text-xl--line-height: calc(30 / 20);
    --text-2xl--line-height: calc(36 / 24);
    --text-3xl--line-height: calc(44 / 30);
  }

  table {
    font-variant-numeric: tabular-nums;
  }
}

@utility num {
  font-variant-numeric: tabular-nums lining-nums;
}

/* Asset tags and document numbers (adopted in phase 2). */
@utility tag {
  font-family: var(--font-mono);
  font-size: calc(1em - 1px);
  white-space: nowrap;
}

/* Sonner injects its own unlayered CSS; this selector is more specific, so toasts use the app font. */
:root [data-sonner-toaster] {
  font-family: var(--font-sans);
}
```

`:root [data-sonner-toaster] {` does not match `readRootTokens`' `/:root\s*\{/`, so the token block stays the first match.

- [ ] **Step 5: Tabular numbers on metric values**

`src/components/ui/metric-card.tsx:19` (LF file): `cn("mt-2 font-bold", compact ? "text-xl" : "text-2xl", toneClasses.value)` → `cn("num mt-2 font-bold", compact ? "text-xl" : "text-2xl", toneClasses.value)`

- [ ] **Step 6: Run the tests**

Run: `node --test tests/visual-foundation-guards.test.ts tests/design-tokens-contrast.test.ts tests/html-lang-and-years.test.ts`
Expected: PASS.
Then run `npm test`, `npx tsc --noEmit` (this catches a wrong `IBM_Plex_*` option type) and `npm run lint`.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/ui/metric-card.tsx tests/design-tokens-contrast.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): IBM Plex fonts with Thai-safe line heights

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Flat surfaces, overlays and base rules

**Files:**
- Modify: `src/app/globals.css` (base surface rules, scrollbar)
- Modify: `src/components/ui/dialog.tsx:42,68`, `alert-dialog.tsx:39,61`, `sheet.tsx:38,64`, `popover.tsx:32`, `dropdown-menu.tsx:44,232`, `accessible-dialog.tsx:77`, `mobile-action-bar.tsx:18`
- Modify: `src/components/disposal/disposal-mobile-action-bar.tsx:21`
- Modify: `src/components/layout/dashboard-shell.tsx:107`, `src/components/assets/asset-register-toolbar.tsx:36`, `src/components/audit/audit-scan-search.tsx:47`, `src/components/assets/asset-detail-tabs.tsx:94`
- Modify: `src/lib/design-system.ts:11-18,49-51,73-75`, `src/components/ui/metric-card.tsx:17`
- Modify: `src/components/assets/asset-import-preview-panel.tsx:428`
- Modify: `tests/design-system.test.ts`, `tests/visual-foundation-guards.test.ts` (append)

**Interfaces:**
- Consumes: `bg-canvas`, `bg-scrim` and `shadow-overlay` from Task 1, and the `focus:border-ring` text from Task 2 (`getFieldControlClasses` already contains it).
- Produces: `getPanelClasses()` has no shadow, and `getFieldControlClasses()` uses `border-input`.

- [ ] **Step 1: Write the failing tests**

In `tests/design-system.test.ts`:
- in `"returns stable metric card classes for each tone"` add:

```ts
  assert.match(getMetricCardToneClasses("warning").container, /border-warning-border/)
  assert.equal(getMetricCardToneClasses("muted").container, "border-border bg-background")
```

- in `"returns shared panel, form control, and action button classes"` add:

```ts
  assert.doesNotMatch(getPanelClasses(), /shadow/)
  assert.match(getFieldControlClasses(), /border-input/)
```

Append to `tests/visual-foundation-guards.test.ts`:

```ts
test("overlays use the navy scrim and the overlay shadow, and respect reduced motion", () => {
  const ui = sources.filter((file) => file.path.startsWith("src/components/ui/"))
  assert.deepEqual(findMatches(ui, /\bbg-black\/\d+/g), [])
  for (const name of ["dialog", "alert-dialog", "sheet"]) {
    const source = read(`src/components/ui/${name}.tsx`)
    assert.match(source, /"fixed inset-0 z-50 bg-scrim [^"]*motion-reduce:animate-none!"/, `${name} scrim`)
    assert.match(source, /shadow-overlay[^"]*motion-reduce:animate-none!/, `${name} content`)
  }
  for (const name of ["popover", "dropdown-menu", "accessible-dialog"]) {
    const source = read(`src/components/ui/${name}.tsx`)
    assert.match(source, /shadow-overlay/, name)
    assert.doesNotMatch(source, /\bshadow-(sm|md|lg|xl)\b/, name)
  }
  assert.match(read("src/components/ui/sheet.tsx"), /ease-out data-\[state=closed\]:animate-out data-\[state=closed\]:duration-200 data-\[state=open\]:animate-in data-\[state=open\]:duration-250/)
})

test("panels and bottom action bars are flat", () => {
  assert.doesNotMatch(read("src/lib/design-system.ts").match(/function getPanelClasses\(\) \{[\s\S]*?\n\}/)?.[0] ?? "", /shadow/)
  assert.match(read("src/components/ui/metric-card.tsx"), /cn\("rounded-lg border p-5", toneClasses\.container, className\)/)
  for (const path of ["src/components/ui/mobile-action-bar.tsx", "src/components/disposal/disposal-mobile-action-bar.tsx"]) {
    assert.doesNotMatch(read(path), /backdrop-blur|bg-surface\/95|shadow-md/, path)
  }
})

test("globals keep a light-only, token-driven base", () => {
  const css = globals()
  assert.ok(css.indexOf(":root {") < css.indexOf("@layer base"), "the token :root block must stay first")
  assert.match(css, /--canvas: #[0-9A-F]{6};/)
  assert.match(css, /--color-scrim: rgb\(/)
  assert.match(css, /--shadow-overlay: /)
  assert.match(css, /:root \{\s*color-scheme: only light;\s*accent-color: var\(--primary\);\s*\}/)
  assert.match(css, /::backdrop \{\s*border-color: var\(--border\);\s*\}/)
  assert.match(css, /::selection \{\s*background-color: var\(--primary-border\);/)
  assert.doesNotMatch(css, /@custom-variant dark|scrollbar-color/)
})

test("full-bleed bars blend into the canvas", () => {
  assert.match(read("src/components/layout/dashboard-shell.tsx"), /className="fixed inset-0 flex max-w-full overflow-hidden bg-canvas"/)
  assert.match(read("src/components/assets/asset-register-toolbar.tsx"), /sticky top-0 z-20 -mx-4 mb-3 bg-canvas /)
  assert.doesNotMatch(read("src/components/assets/asset-register-toolbar.tsx"), /md:shadow-sm/)
  assert.match(read("src/components/audit/audit-scan-search.tsx"), /sticky -top-4 sm:-top-6 z-20 -mx-4 bg-canvas /)
  assert.match(read("src/components/assets/asset-detail-tabs.tsx"), /border-r border-border bg-canvas\/95 /)
})
```

Run: `node --test tests/design-system.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL in the new assertions.

- [ ] **Step 2: Base surface rules and scrollbar in `src/app/globals.css`**

Replace the scrollbar rules (`::-webkit-scrollbar { width: 6px; height: 6px; }` through the `::-webkit-scrollbar-thumb:hover { … }` block) with:

```css
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--border);
  background-clip: padding-box;
  border: 3px solid transparent;
  border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--input);
}
```

Do not add `scrollbar-color` or a global `scrollbar-width`: Chrome 121+ ignores `::-webkit-scrollbar` once either is set. Keep `.scrollbar-none` as it is.

Append at the end of the file:

```css

/* Base surface rules. They must stay below the token :root block, because tests read the first :root block as the token list. */
@layer base {
  :root {
    color-scheme: only light;
    accent-color: var(--primary);
  }

  *,
  ::before,
  ::after,
  ::backdrop {
    border-color: var(--border);
  }

  ::selection {
    background-color: var(--primary-border);
    color: var(--foreground);
  }
}
```

`only light` (not `light`) stops Chrome Auto Dark and Samsung Internet from darkening the page.

- [ ] **Step 3: Keep the one intentional currentColor border**

`src/components/assets/asset-import-preview-panel.tsx:428`: `rounded-full border text-xs font-semibold` → `rounded-full border border-current text-xs font-semibold`. This step circle takes its border color from its text color, which the new base border rule would otherwise override.

- [ ] **Step 4: Overlay primitives**

Make each replacement on the exact line:

- `src/components/ui/dialog.tsx:42`, `src/components/ui/alert-dialog.tsx:39` and `src/components/ui/sheet.tsx:38` (scrims, identical strings):
  `"fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",`
  → `"fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none!",`
- `src/components/ui/dialog.tsx:68`: `p-6 shadow-lg duration-200 outline-none` → `p-6 shadow-overlay duration-200 outline-none`, and `data-[state=open]:zoom-in-95 sm:max-w-lg",` → `data-[state=open]:zoom-in-95 sm:max-w-lg motion-reduce:animate-none!",`
- `src/components/ui/alert-dialog.tsx:61`: `p-6 shadow-lg duration-200 data-[size=sm]:max-w-xs` → `p-6 shadow-overlay duration-200 outline-none data-[size=sm]:max-w-xs`, and `data-[size=default]:sm:max-w-lg",` → `data-[size=default]:sm:max-w-lg motion-reduce:animate-none!",`
- `src/components/ui/sheet.tsx:64`: the whole string becomes
  `"fixed z-50 flex flex-col gap-4 bg-background shadow-overlay outline-none transition ease-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-250 motion-reduce:transition-none motion-reduce:animate-none!",`
- `src/components/ui/popover.tsx:32`: `text-popover-foreground shadow-md outline-hidden` → `text-popover-foreground shadow-overlay outline-hidden`
- `src/components/ui/dropdown-menu.tsx:44`: `text-popover-foreground shadow-md data-[side=bottom]` → `text-popover-foreground shadow-overlay outline-none data-[side=bottom]`
- `src/components/ui/dropdown-menu.tsx:232`: `text-popover-foreground shadow-lg data-[side=bottom]` → `text-popover-foreground shadow-overlay outline-none data-[side=bottom]`
- `src/components/ui/accessible-dialog.tsx:77`: `bg-surface p-0 shadow-xl sm:top-[50%]` → `bg-surface p-0 shadow-overlay sm:top-[50%]`. tailwind-merge does not see `shadow-overlay` and `shadow-xl` as conflicting, so `shadow-xl` would win if it stayed.

Why `motion-reduce:animate-none!`: plain `motion-reduce:animate-none` has lower specificity than `data-[state=open]:animate-in` and loses. `!` makes it important. `command.tsx` has no shadow of its own and needs no change. Do not add `dark:` anywhere. Keep `closeLabel = "Close"`, `aria-label={closeLabel}` and `min-h-11 min-w-11` in dialog and sheet; `tests/accessible-dialog.test.ts` and `tests/sheet-drawers-ui.test.ts` read them.

- [ ] **Step 5: Bottom action bars become solid**

`src/components/ui/mobile-action-bar.tsx:18` and `src/components/disposal/disposal-mobile-action-bar.tsx:21` (identical class strings):
`"fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-md backdrop-blur md:hidden"`
→ `"fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden"`

Do not touch `src/components/assets/asset-form.tsx`: `tests/asset-form-sticky-actions.test.ts` pins its `bg-surface/95 backdrop-blur`.

- [ ] **Step 6: Canvas behind the shell and the bars that blend into it**

- `src/components/layout/dashboard-shell.tsx:107`: `"fixed inset-0 flex max-w-full overflow-hidden bg-background"` → `"fixed inset-0 flex max-w-full overflow-hidden bg-canvas"`
- `src/components/assets/asset-register-toolbar.tsx:36`: `-mx-4 mb-3 bg-background px-4` → `-mx-4 mb-3 bg-canvas px-4`, and remove ` md:shadow-sm` at the end of the string
- `src/components/audit/audit-scan-search.tsx:47`: `-mx-4 bg-background px-4` → `-mx-4 bg-canvas px-4`
- `src/components/assets/asset-detail-tabs.tsx:94`: `bg-background/95` → `bg-canvas/95`

`<body>` in `src/app/layout.tsx` keeps `bg-background`, so the print pages and the login page do not change.

- [ ] **Step 7: Shared helpers**

`src/lib/design-system.ts`:

```ts
const metricToneClasses: Record<UiTone, { container: string; value: string }> = {
  neutral: { container: "border-border bg-surface", value: "text-foreground" },
  info: { container: "border-info-border bg-info-soft", value: "text-info" },
  success: { container: "border-success-border bg-success-soft", value: "text-success" },
  warning: { container: "border-warning-border bg-warning-soft", value: "text-warning" },
  danger: { container: "border-danger-border bg-danger-soft", value: "text-danger" },
  muted: { container: "border-border bg-background", value: "text-foreground" },
}
```

```ts
export function getPanelClasses() {
  return "min-w-0 max-w-full rounded-lg border border-border bg-surface"
}
```

In `getFieldControlClasses()` change `rounded-md border border-border bg-background` to `rounded-md border border-input bg-background`. The rest of the string, including Task 2's `focus:border-ring focus:ring-1 focus:ring-ring`, stays.

`src/components/ui/metric-card.tsx:17` (LF file): `cn("rounded-lg border p-5 shadow-sm", toneClasses.container, className)` → `cn("rounded-lg border p-5", toneClasses.container, className)`

- [ ] **Step 8: Run the tests**

Run: `node --test tests/design-system.test.ts tests/visual-foundation-guards.test.ts tests/accessible-dialog.test.ts tests/sheet-drawers-ui.test.ts tests/ui-overlay-guards.test.ts tests/dashboard-layout-scroll.test.ts tests/asset-register-filter-ui.test.ts tests/audit-scan-search-ui.test.ts`
Expected: PASS.
Then run `npm test`, `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/components/ui/dialog.tsx src/components/ui/alert-dialog.tsx src/components/ui/sheet.tsx src/components/ui/popover.tsx src/components/ui/dropdown-menu.tsx src/components/ui/accessible-dialog.tsx src/components/ui/mobile-action-bar.tsx src/components/disposal/disposal-mobile-action-bar.tsx src/components/layout/dashboard-shell.tsx src/components/assets/asset-register-toolbar.tsx src/components/audit/audit-scan-search.tsx src/components/assets/asset-detail-tabs.tsx src/lib/design-system.ts src/components/ui/metric-card.tsx src/components/assets/asset-import-preview-panel.tsx tests/design-system.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): flat panels, navy scrim, overlay shadow and light-only base

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Two-tier, shape-coded status badge

**Files:**
- Modify: `src/components/ui/badge-variants.ts` (lines 18-53; leave `badgeVariants` lines 3-16 alone)
- Modify: `src/components/ui/status-badge.tsx` (whole file)
- Modify: `src/lib/status-tone.ts` (delete lines 33-37)
- Modify: the 9 `color=` call sites:
  - `src/components/layout/global-search.tsx:215`
  - `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx:89,90`
  - `src/app/[locale]/(dashboard)/my-assets/page.tsx:138,141,239,243`
  - `src/app/[locale]/(dashboard)/assets/[id]/page.tsx:897,901`
- Modify: `tests/status-badge.test.ts` (whole file), `tests/modern-enterprise-theme.test.ts` (last test), `tests/visual-foundation-guards.test.ts` (append)

**Interfaces:**
- Consumes: the `--info`, `--success`, `--primary`, `--warning`, `--danger` token colors.
- Produces: `statusBadgeVariants({ tone, size })` (same signature as before) and the new `statusMarkerVariants({ tone })`, which replaces `statusDotVariants`. `getStatusDotColor` is removed. `StatusBadge` props are `{ label, status?, tone?, size?, className? }`, with no `color`. `status-badge.tsx` still re-exports `getStatusTone` and `type StatusTone`; `asset-register-table.tsx` and `audit-scan-room-list.tsx` import that type from it.

- [ ] **Step 1: Replace `tests/status-badge.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getStatusTone } from "../src/lib/status-tone.ts"
import { statusBadgeVariants, statusMarkerVariants } from "../src/components/ui/badge-variants.ts"

const calmTones = ["success", "info", "primary", "neutral", "muted"] as const
const actionTones = ["warning", "danger"] as const

test("status tones keep the existing workflow mapping", () => {
  assert.equal(getStatusTone("closed"), "success")
  assert.equal(getStatusTone("in_progress"), "warning")
  assert.equal(getStatusTone("cancelled"), "danger")
  assert.equal(getStatusTone("open"), "info")
  assert.equal(getStatusTone("approved"), "primary")
  assert.equal(getStatusTone("unknown_status"), "muted")
  assert.equal(getStatusTone(null), "muted")
})

test("calm statuses have no fill, an invisible border and no side padding", () => {
  for (const tone of calmTones) {
    for (const size of ["xs", "sm"] as const) {
      const classes = statusBadgeVariants({ tone, size })
      assert.match(classes, /\bborder-transparent\b/, `${tone}/${size}`)
      assert.match(classes, /\btext-muted-foreground\b/, `${tone}/${size}`)
      assert.doesNotMatch(classes, /\bbg-|\bpx-/, `${tone}/${size} must not add a fill or side padding`)
    }
  }
})

test("statuses that need action keep the soft fill, tone border and AA ink", () => {
  assert.match(statusBadgeVariants({ tone: "warning", size: "xs" }), /border-warning-border bg-warning-soft text-warning/)
  assert.match(statusBadgeVariants({ tone: "danger" }), /border-danger-border bg-danger-soft text-danger/)
  for (const tone of actionTones) {
    assert.match(statusBadgeVariants({ tone, size: "xs" }), /\bpx-2\b/)
    assert.match(statusBadgeVariants({ tone, size: "sm" }), /\bpx-2\.5\b/)
  }
})

test("each meaning has its own marker shape, kept in high-contrast mode", () => {
  type Tone = (typeof calmTones)[number] | (typeof actionTones)[number]
  const marker = (tone: Tone) => statusMarkerVariants({ tone })
  const shapeOf = (tone: Tone) => marker(tone).replace(/\b(bg|border)-(info|success|primary|warning|danger|muted-foreground)\b/g, "").trim()
  const shapeTones = ["info", "success", "warning", "danger", "neutral"] as const
  assert.match(marker("info"), /rounded-full border-\[1\.5px\] border-info/)
  assert.match(marker("success"), /rounded-full bg-success/)
  assert.match(marker("primary"), /rounded-full bg-primary/)
  assert.match(marker("warning"), /bg-warning \[clip-path:polygon\(50%_0,100%_100%,0_100%\)\]/)
  assert.match(marker("danger"), /rotate-45 rounded-\[1px\] bg-danger/)
  assert.match(marker("neutral"), /h-0\.5 w-\[7px\]/)
  assert.match(marker("muted"), /h-0\.5 w-\[7px\]/)
  assert.equal(new Set(shapeTones.map(shapeOf)).size, shapeTones.length, "ring, dot, triangle, diamond and bar must differ without their color")
  for (const tone of [...calmTones, ...actionTones]) assert.match(marker(tone), /forced-color-adjust-none/)
})

test("StatusBadge takes no database color", () => {
  const source = readFileSync("src/components/ui/status-badge.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /color\?:|getStatusDotColor|style=/)
  assert.match(source, /className=\{statusMarkerVariants\(\{ tone: resolvedTone \}\)\}/)
})
```

In `tests/modern-enterprise-theme.test.ts`, replace the last test (`"semantic soft tokens are exposed to Tailwind and used by status badges"`) with:

```ts
test("semantic soft tokens are exposed to Tailwind; only statuses that need action use them in badges", () => {
  const source = css()
  const badges = readFileSync("src/components/ui/badge-variants.ts", "utf8")

  for (const tone of ["success", "warning", "danger", "info"] as const) {
    assert.match(source, new RegExp(`--color-${tone}-soft:\\s*var\\(--${tone}-soft\\);`))
  }
  for (const tone of ["warning", "danger"] as const) {
    assert.match(badges, new RegExp(`bg-${tone}-soft text-${tone}`))
  }
  assert.match(badges, /border-transparent text-muted-foreground/)
  assert.match(assetRegister(), /<StatusBadge\b/)
})
```

Append to `tests/visual-foundation-guards.test.ts`:

```ts
test("no caller passes a database color to StatusBadge", () => {
  assert.deepEqual(findMatches(sources, /<StatusBadge[^>]*\bcolor=/g), [])
  assert.deepEqual(findMatches(sources, /getStatusDotColor|statusDotVariants/g), [])
})
```

Run: `node --test tests/status-badge.test.ts tests/modern-enterprise-theme.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL. `status-badge.test.ts` fails to load because `statusMarkerVariants` does not exist yet.

- [ ] **Step 2: Rewrite the status variants in `src/components/ui/badge-variants.ts`**

Replace lines 18-53 (`statusBadgeVariants` and `statusDotVariants`) with:

```ts
// Two tiers: calm states read as plain text with a marker; states that need action keep a soft fill and border.
// The border stays (transparent) on calm badges so both tiers have the same height side by side.
export const statusBadgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-md border font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "border-transparent text-muted-foreground",
        info: "border-transparent text-muted-foreground",
        primary: "border-transparent text-muted-foreground",
        neutral: "border-transparent text-muted-foreground",
        muted: "border-transparent text-muted-foreground",
        warning: "border-warning-border bg-warning-soft text-warning",
        danger: "border-danger-border bg-danger-soft text-danger",
      },
      size: {
        xs: "py-0.5 text-xs",
        sm: "py-1 text-sm",
      },
    },
    compoundVariants: [
      { tone: ["warning", "danger"], size: "xs", class: "px-2" },
      { tone: ["warning", "danger"], size: "sm", class: "px-2.5" },
    ],
    defaultVariants: { tone: "muted", size: "sm" },
  },
)

// Shape carries the meaning for color-blind users: ring = open/info, dot = done/fine, triangle = warning, diamond = problem, bar = neutral.
// forced-color-adjust-none keeps the shapes visible in Windows high-contrast mode.
export const statusMarkerVariants = cva("shrink-0 forced-color-adjust-none", {
  variants: {
    tone: {
      info: "size-[7px] rounded-full border-[1.5px] border-info",
      success: "size-1.5 rounded-full bg-success",
      primary: "size-1.5 rounded-full bg-primary",
      neutral: "h-0.5 w-[7px] rounded-[1px] bg-muted-foreground",
      muted: "h-0.5 w-[7px] rounded-[1px] bg-muted-foreground",
      warning: "h-[7px] w-2 bg-warning [clip-path:polygon(50%_0,100%_100%,0_100%)]",
      danger: "size-1.5 rotate-45 rounded-[1px] bg-danger",
    },
  },
  defaultVariants: { tone: "muted" },
})
```

The triangle is drawn with a fill only: `clip-path` also clips borders.

- [ ] **Step 3: Rewrite `src/components/ui/status-badge.tsx`**

```tsx
import { cn } from "@/lib/utils"
import { getStatusTone, type StatusTone } from "@/lib/status-tone"
import { statusBadgeVariants, statusMarkerVariants } from "@/components/ui/badge-variants"

export { getStatusTone, type StatusTone } from "@/lib/status-tone"

const knownTones = new Set<StatusTone>(["neutral", "muted", "primary", "info", "success", "warning", "danger"])

export function StatusBadge({
  label,
  status,
  tone,
  size = "sm",
  className,
}: {
  label: string
  status?: string | null
  tone?: StatusTone | string
  size?: "xs" | "sm"
  className?: string
}) {
  const resolvedTone: StatusTone =
    tone && knownTones.has(tone as StatusTone) ? (tone as StatusTone) : getStatusTone(status)

  return (
    <span data-slot="status-badge" data-tone={resolvedTone} className={cn(statusBadgeVariants({ tone: resolvedTone, size }), className)}>
      <span aria-hidden="true" className={statusMarkerVariants({ tone: resolvedTone })} />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}
```

`src/lib/status-tone.ts`: delete `getStatusDotColor` (lines 33-37) and the blank line before it.

- [ ] **Step 4: Remove `color=` from the 9 call sites**

On each line listed under **Files**, delete only the attribute text ` color={…colorCode}`, for example ` color={asset.status.colorCode}`, ` color={asset.condition.colorCode}` or ` color={result.badge.colorCode}`. Leave the Prisma selects and the `badge.colorCode` type alone: unused selects already exist elsewhere in the repo, and changing the API is out of scope.

Check: `grep -rn "<StatusBadge[^>]*color=" src` prints nothing.

- [ ] **Step 5: Run the tests**

Run: `node --test tests/status-badge.test.ts tests/modern-enterprise-theme.test.ts tests/visual-foundation-guards.test.ts tests/visual-consistency-ui.test.ts tests/asset-detail-ux.test.ts tests/asset-register-table-ui.test.ts tests/global-search-ui.test.ts`
Expected: PASS. If the `px-2` assertions fail, cva is not applying the array `compoundVariants`. Write the four compound entries out one tone at a time instead.
Then run `npm test`, `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/badge-variants.ts src/components/ui/status-badge.tsx src/lib/status-tone.ts src/components/layout/global-search.tsx "src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx" "src/app/[locale]/(dashboard)/my-assets/page.tsx" "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" tests/status-badge.test.ts tests/modern-enterprise-theme.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): two-tier status badge with shape-coded markers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: White sidebar with sections

**Files:**
- Create: `src/lib/navigation-active.ts`
- Modify: `src/lib/navigation-permissions.ts` (append one function and one type)
- Create: `tests/navigation-active.test.ts`
- Modify: `src/components/layout/sidebar.tsx` (whole file)
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Modify: `tests/dashboard-shell-theme.test.ts` (first test)

**Interfaces:**
- Consumes: the sidebar tokens from Task 1 and `focus-visible:ring-ring` from Task 2.
- Produces:
  - `getActiveNavigationHref(pathname: string, hrefs: readonly string[]): string | null`
  - `collectNavigationHrefs(items: readonly NavigationHrefNode[]): string[]`
  - `containsNavigationHref(item: NavigationHrefNode, href: string | null): boolean`
  - `filterNavigationSectionsByPermission<TItem, TKey extends string>(sections: PermissionedNavigationSection<TItem, TKey>[], user: NavigationUser): PermissionedNavigationSection<TItem, TKey>[]`

- [ ] **Step 1: Write `tests/navigation-active.test.ts`**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { collectNavigationHrefs, containsNavigationHref, getActiveNavigationHref } from "../src/lib/navigation-active.ts"
import { filterNavigationSectionsByPermission } from "../src/lib/navigation-permissions.ts"

const hrefs = ["/th/dashboard", "/th/assets", "/th/assets/new", "/th/asset-management/scan", "/th/audit/rounds", "/th/admin/settings"]

test("an exact match selects its row", () => {
  assert.equal(getActiveNavigationHref("/th/assets", hrefs), "/th/assets")
})

test("the longest matching href wins", () => {
  assert.equal(getActiveNavigationHref("/th/assets/new", hrefs), "/th/assets/new")
})

test("a detail page selects the list it belongs to", () => {
  assert.equal(getActiveNavigationHref("/th/assets/123", hrefs), "/th/assets")
  assert.equal(getActiveNavigationHref("/th/audit/rounds/abc/scan", hrefs), "/th/audit/rounds")
})

test("a prefix only counts when it ends at a slash", () => {
  assert.equal(getActiveNavigationHref("/th/assets-archive", hrefs), null)
  assert.equal(getActiveNavigationHref("/th/asset-management", hrefs), null)
})

test("query strings, hashes and trailing slashes are ignored", () => {
  assert.equal(getActiveNavigationHref("/th/assets?page=2", hrefs), "/th/assets")
  assert.equal(getActiveNavigationHref("/th/assets#top", hrefs), "/th/assets")
  assert.equal(getActiveNavigationHref("/th/assets/", hrefs), "/th/assets")
})

test("pages outside the menu select nothing", () => {
  assert.equal(getActiveNavigationHref("/th/profile", hrefs), null)
  assert.equal(getActiveNavigationHref("/th", hrefs), null)
  assert.equal(getActiveNavigationHref("/th/assets", []), null)
})

type Item = { labelKey: string; href?: string; permission?: { module: string; action: string }; children?: Item[] }

const assetGroup: Item = {
  labelKey: "assetManagement",
  children: [
    { labelKey: "assetRegistryGroup", children: [{ labelKey: "assetRegister", href: "/th/assets", permission: { module: "asset", action: "view" } }] },
    { labelKey: "checkout", href: "/th/asset-management/checkout", permission: { module: "asset", action: "edit" } },
  ],
}

test("collectNavigationHrefs walks nested groups", () => {
  assert.deepEqual(collectNavigationHrefs([{ labelKey: "dashboard", href: "/th/dashboard" }, assetGroup]), [
    "/th/dashboard",
    "/th/assets",
    "/th/asset-management/checkout",
  ])
})

test("containsNavigationHref finds the active row at any depth", () => {
  assert.equal(containsNavigationHref(assetGroup, "/th/assets"), true)
  assert.equal(containsNavigationHref(assetGroup, "/th/dashboard"), false)
  assert.equal(containsNavigationHref(assetGroup, null), false)
})

test("sections with no visible row disappear, with their heading", () => {
  const sections: Array<{ labelKey: string; items: Item[] }> = [
    { labelKey: "sectionDaily", items: [{ labelKey: "dashboard", href: "/th/dashboard", permission: { module: "dashboard", action: "view" } }] },
    { labelKey: "sectionAssets", items: [assetGroup] },
  ]
  const viewer = { roles: ["viewer"], permissions: ["dashboard:view"] }
  assert.deepEqual(filterNavigationSectionsByPermission(sections, viewer).map((section) => section.labelKey), ["sectionDaily"])

  const clerk = { roles: ["clerk"], permissions: ["dashboard:view", "asset:view"] }
  const visible = filterNavigationSectionsByPermission(sections, clerk)
  assert.deepEqual(visible.map((section) => section.labelKey), ["sectionDaily", "sectionAssets"])
  assert.deepEqual(collectNavigationHrefs(visible[1].items), ["/th/assets"], "the edit-only row is filtered inside the section")

  const admin = { roles: ["system_admin"], permissions: [] }
  assert.equal(filterNavigationSectionsByPermission(sections, admin).length, 2)
})
```

Run: `node --test tests/navigation-active.test.ts`
Expected: FAIL. The module `navigation-active.ts` is not found.

- [ ] **Step 2: Create `src/lib/navigation-active.ts`**

```ts
// Picks the menu row for the current page: the longest menu href that equals the path or is a prefix ending at "/".
export type NavigationHrefNode = {
  href?: string
  children?: NavigationHrefNode[]
}

function normalizePath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/"
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path
}

export function getActiveNavigationHref(pathname: string, hrefs: readonly string[]): string | null {
  const path = normalizePath(pathname)
  let active: string | null = null
  for (const href of hrefs) {
    const matches = path === href || path.startsWith(`${href}/`)
    if (matches && (active === null || href.length > active.length)) active = href
  }
  return active
}

export function collectNavigationHrefs(items: readonly NavigationHrefNode[]): string[] {
  return items.flatMap((item) => [...(item.href ? [item.href] : []), ...collectNavigationHrefs(item.children ?? [])])
}

export function containsNavigationHref(item: NavigationHrefNode, href: string | null): boolean {
  if (href === null) return false
  if (item.href === href) return true
  return (item.children ?? []).some((child) => containsNavigationHref(child, href))
}
```

- [ ] **Step 3: Append section filtering to `src/lib/navigation-permissions.ts`**

Append at the end of the file. Leave the existing functions unchanged; `tests/permission-aware-navigation.test.ts` deep-equals their output.

```ts

export type PermissionedNavigationSection<TItem, TKey extends string = string> = {
  labelKey: TKey
  items: TItem[]
}

// A section heading shows only when at least one of its rows survives the permission filter.
export function filterNavigationSectionsByPermission<TItem extends PermissionedNavigationItem<TItem>, TKey extends string>(
  sections: PermissionedNavigationSection<TItem, TKey>[],
  user: NavigationUser
): PermissionedNavigationSection<TItem, TKey>[] {
  return sections.flatMap((section) => {
    const items = filterNavigationItemsByPermission(section.items, user)
    return items.length > 0 ? [{ ...section, items }] : []
  })
}
```

Run: `node --test tests/navigation-active.test.ts tests/permission-aware-navigation.test.ts`
Expected: PASS.

- [ ] **Step 4: Add the message keys**

Write this change file to your temp/scratch folder as `nav-sections.json`:

```json
{
  "set": {
    "th": {
      "nav.brandName": "ระบบบริหารทรัพย์สิน",
      "nav.sectionDaily": "งานประจำวัน",
      "nav.sectionAssets": "ทรัพย์สิน",
      "nav.sectionSystem": "ภาพรวมและระบบ"
    },
    "en": {
      "nav.brandName": "Asset Management System",
      "nav.sectionDaily": "Daily work",
      "nav.sectionAssets": "Assets",
      "nav.sectionSystem": "Reports and system"
    }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/nav-sections.json`
Expected: `messages updated: 4 th, 4 en, 0 deleted`.

- [ ] **Step 5: Update the sidebar test (failing first)**

In `tests/dashboard-shell-theme.test.ts`, replace the first test (`"sidebar uses the committed dark navigation tokens"`) with the code below and leave the topbar test unchanged:

```ts
test("sidebar uses the light navigation tokens and marks the current page", () => {
  const source = sidebar()
  assert.match(source, /bg-sidebar\b/)
  assert.match(source, /text-sidebar-foreground/)
  assert.match(source, /bg-sidebar-active/)
  assert.match(source, /text-sidebar-active-foreground/)
  assert.match(source, /text-sidebar-active-icon/)
  assert.match(source, /border-sidebar-border/)
  assert.match(source, /hover:bg-sidebar-hover/)
  assert.match(source, /focus-visible:ring-offset-sidebar/)
  assert.match(source, /aria-current=\{isActive \? "page" : undefined\}/)
  assert.match(source, /getActiveNavigationHref\(/)
  assert.match(source, /filterNavigationSectionsByPermission\(menuSections, user\)/)
  assert.match(source, /t\("brandName"\)/)
  assert.match(source, /src="\/icons\/icon-192\.png"/)
  for (const key of ["sectionDaily", "sectionAssets", "sectionSystem"]) {
    assert.match(source, new RegExp(`labelKey: "${key}"`))
  }
  assert.doesNotMatch(source, /border-white\/|text-white|text-brand-accent|ring-brand-accent|focus-visible:ring-inset/)
  assert.doesNotMatch(source, /border-r-2 border-primary/)
})
```

Run: `node --test tests/dashboard-shell-theme.test.ts`
Expected: FAIL. The new strings are not in the sidebar yet.

- [ ] **Step 6: Rewrite `src/components/layout/sidebar.tsx`**

Replace the whole file with the code below. The menu items, hrefs, permissions and icons are copied unchanged from the current file; only their order and grouping change. Keep these literals exactly as they are, because other tests read them:
- `labelKey: "myAssets"` and ``href: `/${locale}/my-assets` `` behind `user.employeeId`
- `labelKey: "integrationApi"` before its href and permission, plus the `KeyRound` icon
- `<SheetContent` with `side="left"` before `id="mobile-primary-navigation-drawer"`
- `<SheetTitle className="sr-only">`
- the aside class with `hidden` before `lg:flex`
- the two focus handlers, byte for byte

```tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import {
  LayoutDashboard,
  Package,
  PackageCheck,
  ClipboardCheck,
  FileCheck2,
  BarChart3,
  Database,
  Settings,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  ArrowRightLeft,
  FileSpreadsheet,
  LogOut,
  LogIn,
  Printer,
  ScanLine,
  Wrench,
  Trash2,
  Building2,
  GitBranch,
  Users,
  MapPin,
  Tag,
  Layers,
  Truck,
  History,
  Inbox,
  KeyRound,
  Rocket,
  X,
} from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  filterNavigationSectionsByPermission,
  type NavigationPermission,
} from "@/lib/navigation-permissions"
import { collectNavigationHrefs, containsNavigationHref, getActiveNavigationHref } from "@/lib/navigation-active"
import type { SessionUser } from "@/lib/auth-utils"

type MenuItem = {
  labelKey: string
  href?: string
  permission?: NavigationPermission
  anyPermissions?: NavigationPermission[]
  icon: React.ReactNode
  children?: MenuItem[]
}

type MenuSection = {
  labelKey: "sectionDaily" | "sectionAssets" | "sectionSystem"
  items: MenuItem[]
}

// Rows sit inside the nav's px-2 gutter. The focus ring is drawn outside the row on a white offset,
// because a teal ring inside the navy active row is under 3:1.
const rowClasses =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar lg:min-h-9"

export function Sidebar({
  collapsed,
  mobileOpen,
  user,
  onMobileClose,
  onMobileNavigate,
}: {
  collapsed: boolean
  mobileOpen: boolean
  user: SessionUser
  onMobileClose: () => void
  onMobileNavigate: () => void
}) {
  const t = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()
  const mobileRestoreFocusRef = useRef<HTMLElement | null>(null)

  const menuSections: MenuSection[] = [
    {
      labelKey: "sectionDaily",
      items: [
        {
          labelKey: "dashboard",
          href: `/${locale}/dashboard`,
          permission: { module: "dashboard", action: "view" },
          icon: <LayoutDashboard size={20} />,
        },
        {
          labelKey: "workCenter",
          href: `/${locale}/work-center`,
          permission: { module: "dashboard", action: "view" },
          icon: <Inbox size={20} />,
        },
        ...(user.employeeId
          ? [
              {
                labelKey: "myAssets",
                href: `/${locale}/my-assets`,
                icon: <PackageCheck size={20} />,
              },
            ]
          : []),
      ],
    },
    {
      labelKey: "sectionAssets",
      items: [
        {
          labelKey: "assetManagement",
          icon: <Package size={20} />,
          children: [
            {
              labelKey: "assetRegistryGroup",
              icon: <Package size={18} />,
              children: [
                { labelKey: "assetRegister", href: `/${locale}/assets`, permission: { module: "asset", action: "view" }, icon: <Package size={18} /> },
                { labelKey: "addAsset", href: `/${locale}/assets/new`, permission: { module: "asset", action: "create" }, icon: <PackagePlus size={18} /> },
                { labelKey: "scanSearchAsset", href: `/${locale}/asset-management/scan`, permission: { module: "asset", action: "view" }, icon: <ScanLine size={18} /> },
                { labelKey: "printLabels", href: `/${locale}/asset-management/labels`, permission: { module: "asset", action: "view" }, icon: <Printer size={18} /> },
                { labelKey: "importExport", href: `/${locale}/asset-management/import-export`, permission: { module: "asset", action: "view" }, icon: <FileSpreadsheet size={18} /> },
              ],
            },
            {
              labelKey: "assetTransactionsGroup",
              icon: <ArrowRightLeft size={18} />,
              children: [
                { labelKey: "checkout", href: `/${locale}/asset-management/checkout`, permission: { module: "asset", action: "edit" }, icon: <LogOut size={18} /> },
                { labelKey: "checkin", href: `/${locale}/asset-management/checkin`, permission: { module: "asset", action: "edit" }, icon: <LogIn size={18} /> },
                { labelKey: "transfer", href: `/${locale}/asset-management/transfer`, permission: { module: "asset", action: "edit" }, icon: <ArrowRightLeft size={18} /> },
                { labelKey: "bulkMove", href: `/${locale}/asset-management/bulk-move`, permission: { module: "asset", action: "edit" }, icon: <MapPin size={18} /> },
              ],
            },
          ],
        },
        {
          labelKey: "audit",
          icon: <ClipboardCheck size={20} />,
          children: [
            { labelKey: "auditRound", href: `/${locale}/audit/rounds`, permission: { module: "audit", action: "view" }, icon: <ClipboardCheck size={18} /> },
            { labelKey: "auditFinding", href: `/${locale}/audit/findings`, permission: { module: "audit", action: "view" }, icon: <History size={18} /> },
          ],
        },
        {
          labelKey: "maintenance",
          href: `/${locale}/maintenance`,
          permission: { module: "maintenance", action: "view" },
          icon: <Wrench size={20} />,
        },
        {
          labelKey: "disposal",
          href: `/${locale}/disposal`,
          permission: { module: "disposal", action: "view" },
          icon: <Trash2 size={20} />,
        },
      ],
    },
    {
      labelKey: "sectionSystem",
      items: [
        {
          labelKey: "reports",
          href: `/${locale}/reports`,
          permission: { module: "report", action: "view" },
          icon: <BarChart3 size={20} />,
        },
        {
          labelKey: "masterData",
          icon: <Database size={20} />,
          children: [
            { labelKey: "company", href: `/${locale}/master-data/companies`, permission: { module: "company", action: "view" }, icon: <Building2 size={18} /> },
            { labelKey: "branch", href: `/${locale}/master-data/branches`, permission: { module: "branch", action: "view" }, icon: <GitBranch size={18} /> },
            { labelKey: "department", href: `/${locale}/master-data/departments`, permission: { module: "department", action: "view" }, icon: <Users size={18} /> },
            { labelKey: "employee", href: `/${locale}/master-data/employees`, permission: { module: "employee", action: "view" }, icon: <Users size={18} /> },
            { labelKey: "location", href: `/${locale}/master-data/locations`, permission: { module: "location", action: "view" }, icon: <MapPin size={18} /> },
            { labelKey: "category", href: `/${locale}/master-data/categories`, permission: { module: "category", action: "view" }, icon: <Tag size={18} /> },
            { labelKey: "brandModel", href: `/${locale}/master-data/brands`, permission: { module: "brand", action: "view" }, icon: <Layers size={18} /> },
            { labelKey: "supplier", href: `/${locale}/master-data/suppliers`, permission: { module: "supplier", action: "view" }, icon: <Truck size={18} /> },
          ],
        },
        {
          labelKey: "administration",
          icon: <Settings size={20} />,
          children: [
            { labelKey: "userManagement", href: `/${locale}/admin/users`, permission: { module: "user", action: "view" }, icon: <Users size={18} /> },
            { labelKey: "rolePermission", href: `/${locale}/admin/roles`, permission: { module: "role", action: "view" }, icon: <Settings size={18} /> },
            {
              labelKey: "approvalInbox",
              href: `/${locale}/admin/approvals`,
              anyPermissions: [
                { module: "disposal", action: "approve" },
                { module: "audit", action: "approve" },
              ],
              icon: <FileCheck2 size={18} />,
            },
            { labelKey: "dataQuality", href: `/${locale}/admin/data-quality`, permission: { module: "setting", action: "view" }, icon: <ShieldAlert size={18} /> },
            { labelKey: "integrationApi", href: `/${locale}/admin/integrations`, permission: { module: "setting", action: "view" }, icon: <KeyRound size={18} /> },
            { labelKey: "fileStorage", href: `/${locale}/admin/storage`, permission: { module: "setting", action: "view" }, icon: <Database size={18} /> },
            { labelKey: "productionReadiness", href: `/${locale}/admin/readiness`, permission: { module: "setting", action: "view" }, icon: <Rocket size={18} /> },
            { labelKey: "systemLog", href: `/${locale}/admin/logs`, permission: { module: "system", action: "view" }, icon: <History size={18} /> },
            { labelKey: "systemSetting", href: `/${locale}/admin/settings`, permission: { module: "setting", action: "view" }, icon: <Settings size={18} /> },
          ],
        },
      ],
    },
  ]
  const visibleSections = filterNavigationSectionsByPermission(menuSections, user)
  const activeHref = getActiveNavigationHref(
    pathname,
    visibleSections.flatMap((section) => collectNavigationHrefs(section.items)),
  )

  const renderBody = (mobile: boolean) => {
    const bodyCollapsed = mobile ? false : collapsed

    return (
      <>
        {/* Brand */}
        <div className="flex h-16 min-w-0 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
          <Image
            src="/icons/icon-192.png"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            loading="eager"
            className="h-8 w-8 shrink-0 rounded-md"
          />
          <span className={cn("min-w-0 truncate text-sm font-semibold text-foreground", bodyCollapsed && "lg:sr-only")}>
            {t("brandName")}
          </span>
          {mobile ? (
            <button
              type="button"
              onClick={onMobileClose}
              className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        {/* Menu */}
        <nav aria-label={t("mainNavigation")} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {visibleSections.map((section, index) => (
            <div key={section.labelKey} className={cn(index > 0 && "mt-4")}>
              {bodyCollapsed && index > 0 ? (
                <div aria-hidden="true" className="mx-2 mb-3 hidden h-px bg-sidebar-border lg:block" />
              ) : null}
              <p className={cn("flex h-6 items-center px-3 text-xs font-medium text-sidebar-muted", bodyCollapsed && "lg:sr-only")}>
                {t(section.labelKey)}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.labelKey}
                    item={item}
                    collapsed={bodyCollapsed}
                    activeHref={activeHref}
                    t={t}
                    onNavigate={onMobileNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </>
    )
  }

  return (
    <>
      <aside
        className={cn(
          "relative hidden max-h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 motion-reduce:transition-none lg:flex",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {renderBody(false)}
      </aside>

      <Sheet
        open={mobileOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onMobileClose()
        }}
      >
        <SheetContent
          side="left"
          id="mobile-primary-navigation-drawer"
          showCloseButton={false}
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            mobileRestoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            // The bottom "More" button unmounts while the drawer is open, so fall back to its re-rendered copy.
            const opener = mobileRestoreFocusRef.current
            const target =
              opener?.isConnected && opener !== document.body
                ? opener
                : document.querySelector<HTMLElement>('[aria-controls="mobile-primary-navigation-drawer"]')
            if (!target?.isConnected) return
            event.preventDefault()
            target.focus()
          }}
          className="w-[min(18rem,85vw)] gap-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground lg:hidden"
        >
          <SheetTitle className="sr-only">{t("mainNavigation")}</SheetTitle>
          {renderBody(true)}
        </SheetContent>
      </Sheet>
    </>
  )
}

type SidebarItemProps = {
  item: MenuItem
  collapsed: boolean
  activeHref: string | null
  t: (key: string) => string
  onNavigate: () => void
  depth?: number
}

function SidebarItem(props: SidebarItemProps) {
  return props.item.children ? <SidebarGroup {...props} /> : <SidebarLink {...props} />
}

function SidebarGroup({ item, collapsed, activeHref, t, onNavigate, depth = 0 }: SidebarItemProps) {
  const containsActive = containsNavigationHref(item, activeHref)
  const [open, setOpen] = useState(containsActive)
  const [seenActiveHref, setSeenActiveHref] = useState(activeHref)

  // After navigation, open the group that holds the current page. Groups the user opened stay open.
  if (seenActiveHref !== activeHref) {
    setSeenActiveHref(activeHref)
    if (containsActive) setOpen(true)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(rowClasses, "font-medium", containsActive && "font-semibold", collapsed && "lg:justify-center lg:px-2")}
      >
        <span className="shrink-0 text-sidebar-muted">{item.icon}</span>
        <span className={cn("flex-1 truncate text-left", collapsed && "lg:sr-only")}>{t(item.labelKey)}</span>
        <span aria-hidden="true" className={cn("shrink-0 text-sidebar-muted", collapsed && "lg:hidden")}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && (
        <div
          className={cn(
            "mt-0.5 space-y-0.5 border-l border-sidebar-border pl-1",
            depth === 0 ? "ml-5" : "ml-4",
            collapsed && "lg:ml-0 lg:border-l-0 lg:pl-0"
          )}
        >
          {item.children?.map((child) => (
            <SidebarItem
              key={child.labelKey}
              item={child}
              collapsed={collapsed}
              activeHref={activeHref}
              t={t}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarLink({ item, collapsed, activeHref, t, onNavigate }: SidebarItemProps) {
  const isActive = item.href !== undefined && item.href === activeHref

  return (
    <Link
      href={item.href || "#"}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        rowClasses,
        isActive && "bg-sidebar-active font-medium text-sidebar-active-foreground hover:bg-sidebar-active",
        collapsed && "lg:justify-center lg:px-2"
      )}
    >
      <span className={cn("shrink-0 text-sidebar-muted", isActive && "text-sidebar-active-icon")}>{item.icon}</span>
      <span className={cn("truncate", collapsed && "lg:sr-only")}>{t(item.labelKey)}</span>
    </Link>
  )
}
```

Notes:
- Collapsed labels use `lg:sr-only` (not `lg:hidden`), so icon-only rows keep an accessible name.
- The "open the group after navigation" logic uses React's adjust-state-during-render pattern. `react-hooks/set-state-in-effect` forbids doing it in an effect. The `setState` calls are conditional, so `react-hooks/set-state-in-render` stays quiet.

- [ ] **Step 7: Check the literals other tests depend on**

Run from the repo root:

```bash
node -e "const s=require('fs').readFileSync('src/components/layout/sidebar.tsx','utf8');console.log(/labelKey: \"myAssets\"[\s\S]{0,220}permission: \{ module: \"asset\", action: \"view\" \}/.test(s))"
```

Expected: `false`. `tests/my-assets-route-ui.test.ts` requires at least 220 characters between `labelKey: "myAssets"` and the first `asset:view` permission. If it prints `true`, keep the multi-line object formatting shown above.

- [ ] **Step 8: Run the tests**

Run: `node --test tests/dashboard-shell-theme.test.ts tests/navigation-active.test.ts tests/permission-aware-navigation.test.ts tests/sheet-drawers-ui.test.ts tests/mobile-field-navigation-ui.test.ts tests/my-assets-route-ui.test.ts tests/integration-api-client-admin.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS.
Then run `npm test`, `npx tsc --noEmit` and `npm run lint`. Lint must report no `react-hooks/*` error in `sidebar.tsx`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/navigation-active.ts src/lib/navigation-permissions.ts src/components/layout/sidebar.tsx messages/th.json messages/en.json tests/navigation-active.test.ts tests/dashboard-shell-theme.test.ts
git commit -m "feat(ui): white sidebar with sections, brand mark and active-row matching

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Topbar, mobile bottom bar and PWA colors

**Files:**
- Modify: `src/components/layout/topbar.tsx:120`
- Modify: `src/components/layout/mobile-field-navigation.tsx:51,64,92`
- Modify: `src/app/manifest.ts:12-13`, `src/app/layout.tsx:33`
- Modify: `public/sw.js:1` (LF file), `public/offline.html` (whole file)
- Modify: `tests/app-icon.test.ts:26`, `tests/visual-consistency-ui.test.ts` (first test), `tests/visual-foundation-guards.test.ts` (append)

**Interfaces:**
- Consumes: the `card` and `canvas` token values from Task 1, and the post-codemod mobile-nav strings from Task 2 (`focus-visible:ring-ring`).
- Produces: nothing used by later tasks.

- [ ] **Step 1: Write the failing tests**

`tests/app-icon.test.ts`: add `import { readFileSync } from "node:fs"` if the file does not import it yet, and add `import { readRootTokens } from "../src/lib/color-contrast.ts"`. Replace line 26 `assert.equal(result.theme_color, "#0F172A")` with:

```ts
  const tokens = readRootTokens(readFileSync("src/app/globals.css", "utf8"))
  assert.equal(result.theme_color, tokens.card, "the status bar matches the white topbar")
  assert.equal(result.background_color, tokens.canvas, "the splash screen matches the page canvas")
```

`tests/visual-consistency-ui.test.ts`: in the first test, replace the two lines `assert.match(layout, /themeColor: "#0F172A"/)` and `assert.equal(manifest().theme_color, "#0F172A")` with:

```ts
  assert.equal(layout.match(/themeColor: "(#[0-9A-F]{6})"/)?.[1], tokens.card, "the browser bar matches the white topbar")
  assert.equal(manifest().theme_color, tokens.card)
  assert.equal(manifest().background_color, tokens.canvas)
```

Append to `tests/visual-foundation-guards.test.ts`:

```ts
test("the topbar is flat and the bottom bar is solid with Thai-safe labels", () => {
  assert.doesNotMatch(read("src/components/layout/topbar.tsx"), /shadow-sm/)
  const nav = read("src/components/layout/mobile-field-navigation.tsx")
  assert.doesNotMatch(nav, /backdrop-blur|bg-surface\/95|leading-tight|text-\[11px\]/)
  assert.match(nav, /"fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-2 /)
  assert.equal(nav.match(/text-xs font-medium text-muted-foreground/g)?.length, 2)
})

test("the offline page and service worker follow the new palette", () => {
  const offline = read("public/offline.html")
  assert.match(offline, /<meta name="theme-color" content="#FFFFFF" \/>/)
  assert.doesNotMatch(offline, /#1E3A5F|#1e3a5f|Inter,/)
  assert.match(read("public/sw.js"), /const ASSET_SYSTEM_PWA_CACHE = "asset-system-pwa-v2"/)
})
```

Run: `node --test tests/app-icon.test.ts tests/visual-consistency-ui.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL.

- [ ] **Step 2: Topbar and bottom bar**

- `src/components/layout/topbar.tsx:120`: remove ` shadow-sm`, so the string becomes `"flex h-16 max-w-full shrink-0 items-center justify-between gap-1 border-b border-border bg-surface px-3 sm:gap-2 sm:px-4"`
- `src/components/layout/mobile-field-navigation.tsx:51`: the class becomes `"fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 lg:hidden"`
- `src/components/layout/mobile-field-navigation.tsx:64` and `:92`: replace `text-[11px] font-medium leading-tight text-muted-foreground` with `text-xs font-medium text-muted-foreground` (2 places). Removing `leading-tight` lets the Thai line height (18px) apply. Keep the scan button's own `shadow-md` (line 72): it is a raised button.

- [ ] **Step 3: PWA colors**

- `src/app/manifest.ts:12-13`: `background_color: "#F8FAFC",` → `background_color: "#EEF1F6",` and `theme_color: "#0F172A",` → `theme_color: "#FFFFFF",`. Keep `manifest.ts` free of `@/` imports; tests import it in plain Node.
- `src/app/layout.tsx` (`themeColor`, line 33 at HEAD, line 47 after Task 3): `themeColor: "#0F172A",` → `themeColor: "#FFFFFF",`. `appleWebApp.statusBarStyle: "default"` already gives dark text on a light bar.
- `public/sw.js:1` (LF): `const ASSET_SYSTEM_PWA_CACHE = "asset-system-pwa-v1"` → `const ASSET_SYSTEM_PWA_CACHE = "asset-system-pwa-v2"`. The activate handler already deletes the old cache.

- [ ] **Step 4: Offline page**

Replace `public/offline.html` with the content below (same text, new colors, flat card):

```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#FFFFFF" />
    <title>Asset System Offline</title>
    <style>
      :root {
        color-scheme: only light;
        font-family: "IBM Plex Sans", "IBM Plex Sans Thai", system-ui, sans-serif;
        background: #eef1f6;
        color: #0b1d35;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      main {
        width: min(100%, 440px);
        border: 1px solid #d7dee8;
        border-radius: 12px;
        background: #ffffff;
        padding: 24px;
      }

      img {
        width: 64px;
        height: 64px;
        border-radius: 16px;
      }

      h1 {
        margin: 18px 0 8px;
        font-size: 24px;
        line-height: 1.5;
      }

      p {
        margin: 0;
        color: #3c4f6b;
        line-height: 1.6;
      }

      .hint {
        margin-top: 16px;
        border-radius: 8px;
        background: #e9eff8;
        padding: 12px;
        color: #083161;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main>
      <img src="/icons/icon-192.png" alt="Asset System" />
      <h1>ยังเชื่อมต่อระบบไม่ได้</h1>
      <p>ตรวจสอบสัญญาณอินเทอร์เน็ตหรือ VPN แล้วลองเปิดหน้านี้อีกครั้ง</p>
      <p class="hint">หน้าตรวจนับทรัพย์สินจะเก็บคิวสแกนในเครื่องเมื่อส่งข้อมูลไม่สำเร็จ และสามารถกดส่งซ้ำเมื่อกลับมาออนไลน์ได้</p>
    </main>
  </body>
</html>
```

Keep the file's existing line endings: check with `git diff --stat public/offline.html` that only the changed lines differ.

- [ ] **Step 5: Run the tests**

Run: `node --test tests/app-icon.test.ts tests/visual-consistency-ui.test.ts tests/visual-foundation-guards.test.ts tests/dashboard-shell-theme.test.ts tests/mobile-field-navigation-ui.test.ts tests/pwa-service-worker.test.ts tests/pwa-install-prompt.test.ts tests/html-lang-and-years.test.ts`
Expected: PASS.
Then run `npm test`, `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/topbar.tsx src/components/layout/mobile-field-navigation.tsx src/app/manifest.ts src/app/layout.tsx public/sw.js public/offline.html tests/app-icon.test.ts tests/visual-consistency-ui.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): flat topbar, solid bottom bar and white PWA theme color

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Check on the dev app (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-foundation/after/` (git-ignored)
- Modify: only files needed to fix problems found here, each fix in its own small commit with a test where one is possible

**Interfaces:**
- Consumes: Tasks 1-7 committed; the Task 0 before images.
- Produces: the after images and a list of problems found and fixed, which Task 9 records in `DEVELOPER_HANDOFF.md`.

- [ ] **Step 1: Confirm the dev database before starting anything.** Read `.env` keys `DATABASE_URL` and `DB_USER` without printing secrets, and check the database name is `asset_management_dev` and the user is `asset_dev`. If not, stop.
- [ ] **Step 2: Start the dev server.** Create `.claude/launch.json` with one configuration (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`) and start it with `preview_start`. Log in with the seed admin from `prisma/seed.ts:151-159`; do not echo the password.
- [ ] **Step 3: Screens at 1440 px and 375 px.** Take the same views as Task 0 Step 3 and save them under the same names in `.superpowers/sdd/screenshots/ui-foundation/after/`. Compare each one with its Task 0 before image (height growth, new wrapping, earlier truncation) and with the mockup `docs/superpowers/specs/2026-10-10-ui-foundation/index.html` (the intended look). Check that:
  - the sidebar shows 3 section headings, the brand mark, and the solid navy active row with a teal icon
  - the group holding the current page opens by itself, including `/th/assets/new` and an asset detail page
  - panels have no shadow, the canvas is grey-blue behind white panels, and the sticky toolbars blend in
  - badges: "ใช้งานอยู่" and "พร้อมใช้งาน" are calm (dot), "ปิดแล้ว" is a calm dot, warning and danger badges are filled with a triangle or diamond
  - status pills in global search show no database color
  - non-status `info` uses still read well in teal: role chips on `/th/admin/users` and `/th/admin/roles`, the dashboard readyToDeploy KPI icon, the notice banners in the asset form and the audit round form, and the login info banner. Note any that should move to primary or neutral.
- [ ] **Step 4: Thai text.** At 100%, 125% and 200% zoom, check truncated Thai text (register names, badges, nav labels, bottom bar labels) for clipped stacked vowels and tone marks. Compare the widths of "1111" and "0000" in a table cell (tabular digits). Check fixed-height controls (h-8/h-9/h-10 buttons, tabs, table rows, badges, the 64px topbar, the bottom bar) for clipped, overflowing or off-center text now that text-sm is 22px (spec §14).
- [ ] **Step 5: Focus.** Tab through the sidebar, topbar, one form with checkboxes and one dialog: every stop shows the teal ring or outline, and the active nav row shows its ring outside the navy fill. Turn on forced colors (Playwright `browser_emulate_media` `forcedColors: "active"`) and confirm focus is still visible.
- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` into `/th/dashboard`, `/th/assets` and `/th/assets/new`, then run `axe.run({ runOnly: ["color-contrast"] })`. Expect 0 violations. Note any DB-colored chips separately; those are out of scope.
- [ ] **Step 7: Print.** Open the print preview of one label (`/th/assets/<id>/label`) and of the three A4 documents: `/th/asset-management/checkins/<id>`, `/th/asset-management/checkouts/<id>` and `/th/asset-management/transfers/<id>`. For the check-in, pick a record whose damage note, missing-accessories note and remark are filled in: it is the longest document (22 fields, 3 signature boxes). For the checkout, pick a temporary loan. Compare each with its Task 0 before image. Labels are now weight 700. In all three A4 documents the whole signature row must stay on page 1. Ask the user to test-print a label on the thermal printer before deploy.
- [ ] **Step 8: Toasts and reduced motion.** Trigger one toast and check that it uses Plex. With `prefers-reduced-motion: reduce` emulated, open a sheet and a dialog: neither should slide or zoom.
- [ ] **Step 9: Clean up.** Stop the server, delete `.claude/launch.json`, and confirm `git status --short` shows no stray files.

---

### Task 9: Design documentation

**Files:**
- Modify: `DESIGN.md`, `.impeccable/design.json`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/07_UAT_CHECKLIST.md:14`

**Interfaces:**
- Consumes: the finished Tasks 1-8 (read the code; the docs describe what shipped).
- Produces: nothing used by code.

- [ ] **Step 1: `DESIGN.md`**
  - Frontmatter `colors` (lines 5-23): replace the old values with the token table in Global Constraints. Rename `action-blue` to `primary`, add `canvas`, `primary-border`, `sidebar-*`, `ring` and `input`, and keep the key style used today.
  - `typography` (24-54): `fontFamily: "IBM Plex Sans, IBM Plex Sans Thai, system-ui, sans-serif"`. Line heights follow the Task 3 ratios.
  - §2 Colors: navy `#083161` lives only in the logo and the selected menu row; actions use `#1E4F94`; teal is for info status, focus and the selected menu icon; green, orange and red appear only inside status badges. Add the known exception: "Until phase 2, info notices, role chips and a few info icons also use the `info` tokens and so appear teal."
  - §3 Typography: Plex Sans before Plex Sans Thai (tabular digits); Thai line-height rule; `num` and `tag` utilities; PDF keeps Noto Sans Thai; labels render at 700.
  - §4 Elevation: panels and the topbar are flat; only floating layers use `shadow-overlay`; the scrim is `bg-scrim`.
  - §5 Components: the Status Badges section describes the two tiers and the marker shapes, and says database colors are not shown. Buttons and Inputs: focus ring `#10858D`, field border `border-input`. Navigation: white sidebar with three sections, brand mark, solid navy active row.
  - §6: update any Do/Don't that names the navy sidebar or Electric Blue.
  - Add this warning under §7: "Do not run `npx shadcn add`: it writes oklch tokens and a `.dark` block into `src/app/globals.css`. Copy the component by hand and review the diff."
- [ ] **Step 2: `.impeccable/design.json`.** Update `extensions.colorMeta` canonical values, `typographyMeta` font families, `extensions.shadows` (drop `structured-panel`, keep one overlay shadow equal to `--shadow-overlay`) and the hex and font values inside `components[*].html` and `css`, so they match `DESIGN.md`. Set `generatedAt` to `2026-10-10T00:00:00+07:00`.
- [ ] **Step 3: `docs/14_UI_UX_DESIGN_SYSTEM.md`.** Line 28: "Navy sidebar and light topbar" becomes "white sidebar with sections and a light topbar". Add a row for `docs/superpowers/specs/2026-10-10-ui-foundation-design.md` (app shell and visual foundation) to the Current-Surface Registry table.
- [ ] **Step 4: `DEVELOPER_HANDOFF.md`.** Add `## UI Round 4 Phase 1 Foundation (2026-10-10)` before `## Open Go-Live Decisions`, covering branch, spec, plan, the token and font changes, the guard test file, the Task 8 results and where the before/after screenshots live. Fix line 242 (fonts), line 246 (database colors only on the dot: no longer true), and add a "superseded by UI round 4" note to lines 163-166.
- [ ] **Step 5: `docs/99_CHANGELOG.md`.** Add `## 2026-10-10` above `## 2026-10-08` with two Thai `###` entries in the existing style: the `--db-env` flag (commit `014f0eb`) and this phase (branch, spec, plan, the main changes, where the before/after screenshots live, what was deferred). Do not write verify numbers yet; Task 10 adds them. Do not remove existing text; `tests/audit-round-cancellation.test.ts` reads this file and `DEVELOPER_HANDOFF.md`.
- [ ] **Step 6: `docs/07_UAT_CHECKLIST.md:14`.** Change "Action Blue submit button, and Electric Blue focus state" to "navy primary submit button (#1E4F94) and teal focus ring (#10858D)". Leave the checked historical items as they are.
- [ ] **Step 7: Verify and commit**

Run `npm test`. Expected: 0 failures.

```bash
git add DESIGN.md .impeccable/design.json docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/07_UAT_CHECKLIST.md
git commit -m "docs(ui): light-shell foundation in DESIGN.md, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Full verification and wiki (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`

**Interfaces:**
- Consumes: Tasks 1-9 committed.
- Produces: the branch ready for superpowers:finishing-a-development-branch.

- [ ] **Step 1:** Run `npm run verify` (lint, tests, build). Record the test count and the build page count. The build fetches the Plex fonts from Google Fonts. If the fetch fails, report it; do not change the fonts.
- [ ] **Step 1b:** If verify passed, add one bullet to the 2026-10-10 phase entry in `docs/99_CHANGELOG.md` in the existing style (`` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``), and the same numbers to the `## UI Round 4 Phase 1 Foundation (2026-10-10)` section of `DEVELOPER_HANDOFF.md`. Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files), then commit both files with `docs(ui): record phase 1 verify results` and the Co-Authored-By line. If verify failed, fix the failure first and do not record numbers.
- [ ] **Step 2:** In the wiki `D:\Obsidian\Eltross\AssetSystem`:
  - add a row "UI รอบ 4 เฟส 1: รากฐานหน้าตา" (status `local`) to `ams-status.md`, with sources: the spec, the plan, `src/app/globals.css`, `src/components/layout/sidebar.tsx`
  - add a `## 2026-10-10` entry at the top of `ams-log.md`, under `ใหม่อยู่บน`
  - add to `ams-open-questions.md`: the label test-print; the 2 inline DB-color pills (phase 2); and "non-status uses of `info` (about 84 classes in 29 files: role chips, notice banners, attachment icons, a KPI icon, the login banner, the report cadence chip) are teal after phase 1; decide in phase 2 whether to remap them (spec §3.2)"
  - run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`
  - commit only those files with an `ingest:` message
- [ ] **Step 3:** Use superpowers:finishing-a-development-branch.
