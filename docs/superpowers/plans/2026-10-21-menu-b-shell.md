# Menu B App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the menu B app shell from the approved canvas. It covers:
- the navy menu with the person at its foot, and a collapsed rail;
- one 56px top bar;
- the bell with grouped rows and "อ่านแล้วทั้งหมด";
- search with recent items;
- the phone's bell and the "เพิ่มเติม" sheet;
- one banner region (offline and the session);
- a session that ends after 60 min idle or 12 h;
- the skip link and teal focus on the navy.

**Architecture:**
- **Tokens:** the change starts in `globals.css`. `--sidebar*` turns navy, and a new `--chrome` keeps the white bars.
- **Shell:** `DashboardShell` gains three providers that every part reads: notifications, the banner region, and the session keeper.
- **Server:** the notification read rules and `read_all` live in `notification-center.ts`. The session uses two JWT claims (`loginAt`, `activeAt`) checked in the `jwt` callback.
- **Session routes:** `POST /api/session/keep-alive` and `GET /api/session/status` are route handlers that the client calls. This mechanism was proven by spike `5c5aba21` (report: `.superpowers/sdd/2026-10-21-functional-fix-batch/session-spike-report.md`).

**Tech Stack:** Next.js 16.4 App Router, React 19, Tailwind 4 tokens, next-intl (Thai first), Radix/shadcn, next-auth 5.0.0-beta.32 (JWT), Prisma 7 on SQL Server, `node --test`, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-10-21-menu-b-shell-design.md` (approved 2026-10-21). The canvas is https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p (v61). Where the canvas and the spec differ, the spec wins.

## Global Constraints

**Before coding**
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (AGENTS.md).

**Copy and messages**
- Thai copy follows `docs/19_THAI_GLOSSARY.md`.
- Edit `messages/*.json` only through `node scripts/messages-edit.mjs <changes.json>`. Keep the changes file outside the repo.
- `tests/thai-glossary.test.ts` and `tests/messages-parity.test.ts` stay green.

**Theme**
- Use tokens only. No `dark:` class and no `.dark` block.
- Colors are 6-digit hex.
- `:root[data-theme="dark"]` and its `@media (prefers-color-scheme: dark)` copy keep identical names.
- Leave the forced-light scope and print untouched.

**Guards**
- These guards stay green:
  - `tests/visual-foundation-guards.test.ts`
  - `tests/ui-overlay-guards.test.ts`
  - the 2D guards (raw colors, raw `<button>`, button heights)
  - `tests/design-tokens-contrast.test.ts`
  - `tests/dark-mode-docs.test.ts`
- A new raw `<button>` goes only in a shared part that owns it.

**Data and security**
- No database migration and no schema change.
- No writes to any database beyond what a normal sign-in writes.
- Never read or print `.env*`.
- E2E never runs LDAP sync, the settings save, Excel import, a failed sign-in or deletes.

**Session values**
- Idle: `SESSION_IDLE_SECONDS`, default `3600`.
- Ceiling: `SESSION_CEILING_SECONDS`, default `43200`.
- Keep-alive: at most one per 5 minutes, and only while the tab is visible.
- The banner shows 5 minutes before the deadline.
- The E2E webServer env sets `SESSION_IDLE_SECONDS: "10800"`.

**Polling**
- `NOTIFICATION_POLL_MS = 120_000`, only while `document.visibilityState === "visible"`.

**Every task ends with these, all passing**
- `npm test`
- `npx tsc --noEmit -p .`
- `npm run lint` (0 errors)
- One commit, `<type>(shell): … (menu B shell task N)`, ending with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Before E2E (Task 13B)**
- Run `npm run build` from a clean `.next`, because the folder still holds the spike's build. Never start from a stale Turbopack cache.
- The E2E suite passes in its four projects.
- Keep the PC awake for the run.

## Review Focus

Each of these five cases has its test in the owning task. They are the cases most likely to bite a person, and the spec implies them without naming them.

1. **Two tabs open (Task 12a).**
   - Activity in tab A moves the shared session cookie.
   - When tab B reaches its own warning time, it asks the server, sees the later deadline and stays quiet: no warning and no sign-out.
2. **Offline across the deadline (Task 12a).**
   - While offline, nothing redirects.
   - On reconnect, the first request is the status.
   - Only a 401 then sends the person to the login, once, with the page as `callbackUrl`.
3. **The `/` shortcut (Task 8).**
   - It never fires while focus is in an `input`, `textarea`, `select`, a `contenteditable` element or an open dialog.
   - It works on the Thai keyboard: `code === "Slash"` without Shift, where the key types "ฝ".
4. **Bad session env values (Task 11).**
   - A blank, non-numeric, zero or negative `SESSION_IDLE_SECONDS` or `SESSION_CEILING_SECONDS` falls back to 3600 or 43200.
   - It must never sign everyone out at once.
5. **Long Thai names and roles (Tasks 4 and 9).**
   - In the menu foot and the phone sheet's person row, each line is truncated to one line.
   - The full text stays in the accessible name.
   - The rail shows the initial only.

## Cross-task decisions

These were settled while the plan was written. Each task's **Decisions** block repeats the ones it needs.

**Notifications**
- **Notification reply.** Task 3 widens `GET /api/notifications`: every listed row carries `isRead`, `isSnoozed` and `isSuppressed`, and the summary carries `generatedAt`. Task 7 consumes this.
- **Saving read state.** `markRead` and `markAllRead` return `Promise<boolean>`. On `false`, the bell shows a toast.
- **Bell names.**
  - With unread rows: "การแจ้งเตือน {count} รายการ".
  - With rows but none unread: "การแจ้งเตือน".
  - With an empty box: "ไม่มีงานค้าง".
  - The read pill reuses `notifications.read`.
- **Announcement copy.** "{title} เพิ่ม {count} รายการ". The title comes first, so "PM ถึงกำหนด" reads naturally.

**Banner and session**
- **Banner hooks.** `useShellBannerSlot(line)` carries the page line and `useShellBannerSession(content)` carries the session message. Offline takes priority over both. The region is always mounted, `role="status"`, and sits outside `<main>`.
- **SessionKeeper start.** `SessionKeeper` seeds from the layout's clock and asks `GET /api/session/status` once on mount, to learn the server's clock.

**Layout and the menu**
- **The dashboard layout's final form (Task 12a):** `getShellSession()`, then `getShellAccount` and the sidebar cookie in parallel, then `<DashboardShell user account initialSidebar sessionClock>`.
- **The person's labels.** `ShellAccount = { roleLabel, departmentLabel }` (Task 4) supplies the role and department in the menu foot and in the phone sheet.

**Search and the phone**
- **Search group name.** "รอบตรวจนับ".
- **The asset total.** "ดูทั้งหมดในทะเบียน (N)" uses the register's own matching. The register widens to the global search's 19 fields, so the dropdown, N and the register all find the same assets.
- **Phone top bar.** It shows the open menu row's label as its title, as the spec asks, but only on pages with the bottom menu. Focus task pages keep their own task header.

**How the shell nests (dashboard-shell.tsx)**
- `<ShellBannerProvider>` is outermost (Task 10). `<SessionKeeper>` is its first child (Task 12a). Then come `<ConfirmProvider>`, `<ShellNotificationsProvider>` (Task 3) and the shell `<div ref={shellRef}>`.
- `<MobileMoreSheet>` sits inside that div (Task 9), and `<ShellBanner />` sits right after `<Topbar>` (Task 10).
- Radix tooltips need a provider, so the menu wraps both the desktop aside and the phone drawer in `<TooltipProvider delayDuration={300}>` (Task 5).

**Two departures from the spec's wording** (both listed for the user in 13C)
- **No `scroll-padding-top`.** Only `<main>` scrolls, and it sits below the top bar and the banner, so nothing ever scrolls under them. `--shell-top` only places what the viewport frames: the toasts and the `100dvh` heights (Task 6).
- **Activity means the person's own input.** Pointer, key, touch and wheel count. Background requests (the bell's 2-minute poll, the scan status poll) never extend a session, or an idle tab would never expire (Tasks 11 and 12a).

**Task size**
- Task 12 is split into 12a (the keeper) and 12b (the audit queue's user binding).
- Task 13 is split into 13A (E2E code), 13B (the run) and 13C (docs).

## The user's answers (2026-10-25), already written into the tasks

1. **The work center's dot in E2E: yes.** The E2E IT head gains `dashboard:view`, and Task 13A checks the dot.
2. **Held scans queued by someone else: left for now.** Nobody gets "ลบออกจากคิว" for them (Task 12b).
3. **Register search coverage: widen it.** The register, its export and the reports match the global search's 19 fields through `assetSearchConditions` (Task 8).
4. **The two departures above: accepted.** There is no `scroll-padding-top`, and only the person's own input counts as activity.
5. **The offline line on the audit scan page: the page's line replaces the second clause.** The banner reads "ออฟไลน์อยู่ · การตรวจนับ N รายการรอส่ง จะส่งเองเมื่อออนไลน์". With nothing queued, it reads "ออฟไลน์อยู่ · ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์" (Tasks 10 and 12b).

---

### Task 1: Tokens, the two chromes, DESIGN.md

**Files:**
- Modify: `src/app/globals.css`: `:6` (header comment), `:59-66` (`:root`), `:126-133` (`@theme inline`), `:227-234` (`:root[data-theme="dark"]`), `:297-304` (its `@media (prefers-color-scheme: dark)` copy), `:373-380` (`[data-theme="light"]`), `:446-453` (`@media print`).
- Modify: `src/lib/theme.ts:12` (comment only), `src/components/layout/topbar.tsx:133`, `src/components/layout/mobile-field-navigation.tsx:51`, `src/components/layout/sidebar.tsx:248`
- Modify: `DESIGN.md`, `.impeccable/design.json`, `docs/14_UI_UX_DESIGN_SYSTEM.md:28`
- Test: `tests/design-tokens-contrast.test.ts`, `tests/dark-mode-docs.test.ts`, `tests/dark-mode-t.test.ts`, `tests/dark-mode-s.test.ts`, `tests/dark-mode-p.test.ts`, `tests/modern-enterprise-theme.test.ts`, `tests/visual-consistency-ui.test.ts`, `tests/dashboard-shell-theme.test.ts`, `tests/visual-foundation-guards.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - **CSS variables:** `--chrome`, `--chrome-border`, `--sidebar-active-bar`, `--sidebar-ring` and `--sidebar-dot`, in all five token blocks. `--sidebar*` take the navy values.
  - **Tailwind colors:** `chrome`, `chrome-border`, `sidebar-active-bar`, `sidebar-ring` and `sidebar-dot`. Tasks 4, 5, 6 and 9 use these classes:
    - `bg-chrome`
    - `border-chrome-border`
    - `bg-sidebar-active-bar`
    - `ring-sidebar-ring`
    - `bg-sidebar-dot`
  - **`THEME_COLORS`:** `{ light: "#FFFFFF", dark: "#0D182A" }`. The values do not change, and they equal `--chrome`.
  - **DESIGN.md:** a §5 `### App Shell` section with **The One Count Rule** and **The One Banner Rule**, which tasks 4, 7 and 10 cite.
  - **design.json:** an "App Shell" component.

**Decisions:**
- **Chrome values:** `--chrome` and `--chrome-border` take today's `--sidebar` and `--sidebar-border` values. So `THEME_COLORS`, `theme-color`, `public/offline.html`, the manifest and the theme toggle need no edit.
- **Bar classes:** the bars use `border-border` today and move to `border-chrome-border`, which has the same value. `h-16` stays until Task 6.
- **Brand name:** `sidebar.tsx:248` changes `text-foreground` to `text-sidebar-foreground`. Without it the name is 1.18:1 on the navy, and axe fails desktop-light.
- **Left to Task 4:**
  - The drawer's close X (`sidebar.tsx:252`). Its pins `tests/shell-sweep-ui.test.ts:29` and `tests/sidebar-menu-structure.test.ts:81` stay as they are.
  - The rows' focus ring. They keep `ring-ring`, and `ring` on `sidebar` (3.24 light, 5.48 dark) stays pinned as the menu's base outline.
- **Three pairs fail their floor, so no test pins them:**
  - `sidebar-active-bar` on `sidebar-active`: 2.55 / 3.88. Task 4 puts the bar's outer edge on `--sidebar`.
  - `sidebar-muted` on `sidebar-active`: 3.78 / 3.76. Muted text never sits on the open row.
  - `sidebar-border` on `sidebar`: 1.34 / 1.35. It is a decorative line.
- **Hex only:** every token is a hex value, never `var()`. The dark `--sidebar-active` is #24508F, not the dark `--primary`.
- **Moved pins:** two pins move because the dark `--sidebar` (0.0178) is now lighter than `--card`, and `--sidebar-active-icon` (#5FD6DD) is no longer the brand teal.
  - The elevation pin moves to `--chrome`: 0.0069 < 0.0091 < 0.0121.
  - The brand-teal pin moves to `--sidebar-active-bar`.
- **design.json:**
  - The two shell rules go into the "App Shell" component description and one Do, never into `narrative.rules`, because `tests/v-track-final.test.ts:144-173` allows only the colors, typography and elevation sections.
  - `colorMeta` gets no menu entry.
- **Side stripe:** the 3px bar is a state mark and the only stripe. It amends "No colored side stripe", the side-stripe Don't and `donts[9]`.
- **Focus color:** "One focus color" is amended to allow `--sidebar-ring` inside the menu. The guard at `visual-foundation-guards.test.ts:18` already allows `ring-sidebar-ring`.
- **Docs ahead of code:** the docs describe the target shell before tasks 4–12 build it.
  - Tasks 6, 9 and 13 own the Navigation bullets on the user menus, the drawer, the 64px topbar and the toast offset.
  - docs/14 changes only at line 28.
- **The bell's three names:**
  - "การแจ้งเตือน N รายการ" while anything is unread
  - "การแจ้งเตือน" when every listed row is read
  - "ไม่มีงานค้าง" when the box is empty

  Read rows show the pill "อ่านแล้ว".
- **The banner:**
  - It is always mounted, outside `<main>`.
  - Offline wins while the device is offline, then the session.
  - On the audit scan page, the offline message carries the queue line.
- **Phone:** the top bar's title is the open page's label, falling back to the brand name. The person row in the sheet shows the department.
- **E2E impact:** none. No spec reads a color, a class or `theme-color`, and none opens the drawer.
- **Messages:** none.

- [ ] **Step 1: Write the failing tests**

`tests/design-tokens-contrast.test.ts`: inside `contrastRules`, replace "sidebar pairs are readable" (`:106-113`) with these two tests.
```ts
test(`${prefix}the navy menu: text AA on its fills; the open icon, ring, bar and dot at 3:1 (menu B §6.1)`, () => {
  for (const fill of ["sidebar", "sidebar-hover"]) {
    assertAA("sidebar-foreground", fill, `sidebar-foreground on ${fill}`)
    assertAA("sidebar-muted", fill, `sidebar-muted on ${fill}`)
    assertAA("sidebar-active-foreground", fill, `sidebar-active-foreground on ${fill}`)
  }
  assertAA("sidebar-active-foreground", "sidebar-active", "sidebar-active-foreground on sidebar-active")
  for (const fill of ["sidebar", "sidebar-active"]) assertContrast("sidebar-active-icon", fill, NON_TEXT, `sidebar-active-icon on ${fill}`)
  for (const fill of ["sidebar", "sidebar-hover", "sidebar-active"]) {
    assertContrast("sidebar-ring", fill, NON_TEXT, `sidebar-ring on ${fill}`)
    assertContrast("sidebar-dot", fill, NON_TEXT, `sidebar-dot on ${fill}`)
  }
  assertContrast("sidebar-active-bar", "sidebar", NON_TEXT, "sidebar-active-bar on sidebar")
  assertContrast("ring", "sidebar", NON_TEXT, "ring on sidebar") // the base outline of anything in the menu without its own ring
})
test(`${prefix}the chrome (topbar, phone bottom bar) keeps the page inks AA and the ring and field border at 3:1 (menu B §6.1)`, () => {
  for (const ink of ["foreground", "muted-foreground", "faint-foreground", "primary"]) assertAA(ink, "chrome", `${ink} on chrome`)
  for (const line of ["ring", "input"]) assertContrast(line, "chrome", NON_TEXT, `${line} on chrome`)
})
```
In "roles that must look different stay different" (`:126-132`), add:
```ts
assert.notEqual(value("sidebar"), value("chrome"), "the menu and the topbar no longer share a color")
```

`tests/dark-mode-docs.test.ts`:
```ts
// :32 (replaces the light-theme navy Don't)
assert.match(design, /\n- \*\*Don't\*\* bring back the old slate sidebar \(Tailwind #0F172A, which competed with the content\) /, "menu B: the reason replaces the light-theme navy Don't")
// :104-105
assert.ok(design.narrative.dos.some((entry) => entry.startsWith("Do keep the menu navy (#082A54, #0E2445 in dark) with color only on its open row ")))
assert.ok(design.narrative.donts.some((entry) => entry.startsWith("Don't bring back the old slate sidebar (Tailwind #0F172A, which competed with the content) ")))
// new test at the end
test("menu B: DESIGN.md, .impeccable/design.json and docs/14 record the navy menu, the chrome pair and the two shell rules as globals.css declares them (menu B shell task 1)", () => {
  const design = read("DESIGN.md")
  const light = readRootTokens(globals())
  const shellNames = Object.keys(light).filter((name) => /^(?:chrome|sidebar)/.test(name))
  assert.deepEqual(shellNames, ["chrome", "chrome-border", "sidebar", "sidebar-foreground", "sidebar-muted", "sidebar-hover", "sidebar-active", "sidebar-active-foreground", "sidebar-active-icon", "sidebar-active-bar", "sidebar-ring", "sidebar-dot", "sidebar-border"], "the :root order")
  assert.ok(design.includes(`${shellNames.map((name) => `\n  ${name}: "${light[name]}"`).join("")}\n  image-stage: "${light["image-stage"]}"`), "frontmatter")
  const start = design.indexOf("\n### Sidebar\n")
  const section = design.slice(start, design.indexOf("\n### ", start + 1))
  const recorded = Object.fromEntries([...section.matchAll(/`--([a-z-]+)` (#[0-9A-F]{6})\b/g)].map(([, name, value]) => [name, value]))
  assert.deepEqual(recorded, Object.fromEntries(shellNames.filter((name) => name.startsWith("sidebar")).map((name) => [name, light[name]])))
  assert.ok(section.includes("Tailwind slate #0F172A"), "why the menu is navy again")
  assert.ok(design.includes(`\n- **Chrome** (\`--chrome\` ${light.chrome}, \`--chrome-border\` ${light["chrome-border"]}; `), "§2 Neutral")
  assert.match(design, /holds `THEME_COLORS`, the chrome color of each theme for `theme-color`, equal to `--chrome`/)
  const shell = design.indexOf("\n### App Shell\n")
  assert.ok(shell > design.indexOf("\n### Navigation\n") && shell < design.indexOf("\n### Data Tables\n"), "§5 App Shell follows Navigation")
  const body = design.slice(shell, design.indexOf("\n### Data Tables\n"))
  assert.match(body, /\n\*\*The One Count Rule\.\*\* In the shell, a number for waiting work appears on the bell only\./)
  assert.match(body, /\n\*\*The One Banner Rule\.\*\* A message of the shell \(the session ending, offline\) appears in one region under the topbar/)
  assert.doesNotMatch(design, /No colored side stripe\.|`--sidebar-active` equals `--brand-navy`|selected menu row \(`--sidebar-active`\)|`--sidebar` #0D182A/)
  const json = JSON.parse(read(".impeccable/design.json")) as { components: Array<{ name: string; description: string; css: string }> }
  const nav = json.components.find((entry) => entry.name === "Sidebar Navigation Item")?.css ?? ""
  for (const name of ["sidebar", "sidebar-foreground", "sidebar-muted", "sidebar-hover", "sidebar-active", "sidebar-active-icon", "sidebar-active-bar", "sidebar-ring"]) assert.ok(nav.includes(light[name]), `nav example uses --${name}`)
  assert.match(json.components.find((entry) => entry.name === "App Shell")?.description ?? "", /The One Count Rule: .+ The One Banner Rule: /)
  assert.ok(read("docs/14_UI_UX_DESIGN_SYSTEM.md").includes("\n| Navigation | The navy menu with sections beside the topbar on the chrome color, in the light or the dark theme |"))
})
```

- [ ] **Step 2: Run them and watch them fail**

Run `node --test tests/design-tokens-contrast.test.ts tests/dark-mode-docs.test.ts`.

Expected:
- `resolveToken` throws `missing` for `--sidebar-ring` and `--chrome`, in both the light run and the `dark: ` run.
- The new Don't, Do and docs test fail.

- [ ] **Step 3: Implement the tokens and the class swaps**

`globals.css`: in each of the five blocks, replace the eight `--sidebar*` lines with these thirteen, one declaration per line. Every block uses the same names in the same order.
```css
/* :root, [data-theme="light"], @media print */
--chrome: #FFFFFF; --chrome-border: #D7DEE8; --sidebar: #082A54; --sidebar-foreground: #DCE6F2; --sidebar-muted: #9FB3D1;
--sidebar-hover: #1C3B62; --sidebar-active: #1E4F94; --sidebar-active-foreground: #FFFFFF; --sidebar-active-icon: #5FD6DD;
--sidebar-active-bar: #18A0A8; --sidebar-ring: #5FD6DD; --sidebar-dot: #F0A94D; --sidebar-border: #213F65;
/* :root[data-theme="dark"] and its @media copy */
--chrome: #0D182A; --chrome-border: #22344F; --sidebar: #0E2445; --sidebar-foreground: #DCE6F2; --sidebar-muted: #9FB3D1;
--sidebar-hover: #213554; --sidebar-active: #24508F; --sidebar-active-foreground: #FFFFFF; --sidebar-active-icon: #5FD6DD;
--sidebar-active-bar: #3CC6CE; --sidebar-ring: #5FD6DD; --sidebar-dot: #F0A94D; --sidebar-border: #263A58;
```
- `@theme inline`: add `--color-chrome` and `--color-chrome-border` before `--color-sidebar`. Add `--color-sidebar-active-bar`, `--color-sidebar-ring` and `--color-sidebar-dot` after `--color-sidebar-active-icon`. Each is `var(--…)`.
- The `:6` comment becomes: "UI round 4 palette with the menu B navy menu (spec 2026-10-21 §6.1): `--chrome` is the topbar and the phone bottom bar, `--sidebar*` the menu."
- The `theme.ts:12` comment becomes: `// The chrome color of each theme: its --chrome token (the topbar and the phone bottom bar; the navy menu has its own --sidebar).`
- `topbar.tsx:133` and `mobile-field-navigation.tsx:51`: `border-border bg-sidebar` → `border-chrome-border bg-chrome`.
- `sidebar.tsx:248`: `text-foreground` → `text-sidebar-foreground`.

- [ ] **Step 4: DESIGN.md**

Write the quoted text exactly. Keep every hex value and ratio.

**§1 and §2 colors**
- `:42-49` (frontmatter): write the thirteen `name: "#HEX"` lines in Step 3's order with the light values. `image-stage` and `app-icon-frame` follow them.
- `:197`: append "Menu B (spec `docs/superpowers/specs/2026-10-21-menu-b-shell-design.md`, 2026-10-21) makes the sidebar navy in both themes with color only on the open page, keeps the topbar, panels and phone on the chrome and panel colors, and adds the person at the menu's foot, the bell's box, grouped search, one banner region and a session that follows real work (**App Shell** in §5)."
- `:209`: "the sidebar and topbar on the chrome color with thin borders," → "the topbar and the phone bottom bar on the chrome color with thin borders, the navy menu beside them (§2 Sidebar),"
- `:213`: after "The identity color." the text becomes "It appears only in the logo and as the pressed fill of the primary button (`active:bg-brand-navy`); the menu's navy is its own token, `--sidebar` (§2 Sidebar)."
- `:215`: "Used for the selected menu icon only;" → "It marks the open menu row with its bar (`--sidebar-active-bar` equals it in both themes) and colors a few icons;"
- `:232`:
  - Delete "The sidebar, the topbar and the phone bottom bar take the chrome color `--sidebar`, the same #FFFFFF in light (§2 Sidebar)."
  - Add this bullet after it: "- **Chrome** (`--chrome` #FFFFFF, `--chrome-border` #D7DEE8; #0D182A and #22344F in dark): the topbar and the phone bottom bar with their line. They hold the old `--sidebar` values, and `THEME_COLORS` (`src/lib/theme.ts`) follows `--chrome`. `--chrome-border` equals `--border` but belongs to the chrome; do not swap them."
- `:235`: the last sentence becomes "`--sidebar-muted` (#9FB3D1) is the menu's muted ink, only on the navy; never use faint on the menu."
- `:245`: the paragraph becomes "The navy menu of menu B (spec `docs/superpowers/specs/2026-10-21-menu-b-shell-design.md` §6.1), navy in both themes (light values; Dark Theme has the dark ones): `--sidebar` #082A54 (the menu) · `--sidebar-foreground` #DCE6F2 (row text) · `--sidebar-muted` #9FB3D1 (section labels, icons, the role line) · `--sidebar-hover` #1C3B62 (a hovered row: a white 8% veil, flattened) · `--sidebar-active` #1E4F94 (the open row, the value of `--primary`) · `--sidebar-active-foreground` #FFFFFF (its text, the open group's title) · `--sidebar-active-icon` #5FD6DD (its icon) · `--sidebar-active-bar` #18A0A8 (the 3px bar on its left edge, the value of `--brand-accent`) · `--sidebar-ring` #5FD6DD (focus in the menu) · `--sidebar-dot` #F0A94D (the work dot, The One Count Rule) · `--sidebar-border` #213F65 (the lines under the brand row and above the person, the open group's guide line). On the menu: row text 11.33:1 (8.99:1 hovered), muted 6.70:1 (5.32:1 hovered), the open row's text 8.07:1, its icon 8.27:1 (4.67:1 on the row), the ring 8.27:1, the bar 4.51:1, the dot 7.14:1. `--sidebar-accent` is not used (shadcn's menu hover name). Navy again (the user, 2026-10-21, reversing the light menu of 2026-10-10): the old dark menu was Tailwind slate #0F172A and competed with the content; menu B is the icon's navy with muted labels and teal only on the open page."
- `:251`: "`--sidebar` #0D182A (the chrome: sidebar, topbar and phone bottom bar)" → "`--chrome` #0D182A (the topbar and the phone bottom bar)".
- `:253`: append " · `--chrome-border` #22344F (the chrome's line, the value of `--border`)".
- `:256`: the line becomes "- **Sidebar (the navy menu, beside the elevation order):** `--sidebar` #0E2445 · `--sidebar-foreground` #DCE6F2 · `--sidebar-muted` #9FB3D1 · `--sidebar-hover` #213554 · `--sidebar-active` #24508F · `--sidebar-active-foreground` #FFFFFF · `--sidebar-active-icon` #5FD6DD · `--sidebar-active-bar` #3CC6CE · `--sidebar-ring` #5FD6DD · `--sidebar-dot` #F0A94D · `--sidebar-border` #263A58. Only the fills, the bar and the line differ from light. In dark: row text 12.27:1 (9.78:1 hovered), muted 7.25:1 (5.78:1), the open row's text 8.02:1, its icon 8.95:1 (4.64:1 on the row), the ring 8.95:1, the bar 7.49:1, the dot 7.73:1."
- `:261`: append "The navy menu (`--sidebar`) stands beside this order, not in it."
- `:263`: the last sentence becomes "The menu is navy in both themes (`--sidebar`); its open row is the action blue (`--sidebar-active`: #1E4F94 in light, the value of `--primary`; #24508F in dark) with white text, the light teal icon and the teal bar (`--sidebar-active-bar`, the value of `--brand-accent` in both themes)."

**§2 rules**
- `:279`: replace everything from the start through "(danger)." with the text below. The rest of the paragraph stays.

  "**The Where Color Lives Rule.** Navy #083161 lives only in the logo and the pressed primary fill; the menu has its own navy (`--sidebar`) with color only on its open row. Actions and links use Primary #1E4F94, also the open row's fill. Teal is for info status, the focus ring and the open row's icon and bar. Green, orange and red appear only inside status badges, as the icon of a toast, a `Notice` or an `ActionEmptyState` (error = danger, permission = warning), on destructive buttons and menu items (danger), as the bell's count (danger) and as the menu's work dot (`--sidebar-dot`, orange)."
- `:287`: "and the ring, input and selected-menu-icon pairs at 3:1" → "and the ring, input and menu pairs (the open row's icon, `--sidebar-ring`, the open row's bar and `--sidebar-dot` on the navy) at 3:1".
- `:289`: "equal to `--sidebar`." → "equal to `--chrome` (the navy menu has its own `--sidebar`)."

**Focus**
- `:405`: "One focus color everywhere, danger and destructive controls included: `--ring` #10858D. Focus classes use `ring-ring` / `border-ring`;" → "One focus color on every light and panel surface, danger and destructive controls included: `--ring` #10858D; inside the navy menu the rows take `--sidebar-ring` #5FD6DD. Focus classes use `ring-ring` / `border-ring` (`ring-sidebar-ring` in the menu);"
- `:408`: the line becomes "- Menu rows draw `ring-sidebar-ring` outside the row on the menu color (`ring-offset-2 ring-offset-sidebar`; 8.27:1 in light, 8.95:1 in dark), never relying on the open row's fill (4.67:1 and 4.64:1). Anything in the menu without its own ring keeps the base `--ring` outline, 3.24:1 on the menu (5.48:1 in dark)."

**§5 Navigation**
- `:536`: the line becomes "The app uses a fixed dashboard shell over the canvas: the navy menu (`bg-sidebar`, §2 Sidebar) beside the topbar on the chrome color (`bg-chrome`: #FFFFFF in light, #0D182A in dark). **App Shell** below sets out menu B."
- `:538`: "(`nav.brandName`)" → "(`nav.brandName`, in `sidebar-foreground`)".
- `:541`:
  - "solid navy `sidebar-active` with white text (weight 500), a teal `sidebar-active-icon`, and an outline" → "the action blue `sidebar-active` with white text (weight 500), the light teal `sidebar-active-icon`, the 3px teal `sidebar-active-bar` on its left edge (the one stripe the app draws: a state mark beside the fill, the icon and `aria-current`, its outer edge on the menu color), and an outline".
  - Delete "No colored side stripe."
- `:542`: "`bg-sidebar` like the sidebar, `border-b`, no shadow." → "`bg-chrome` with a `border-chrome-border` line under it, no shadow; it no longer shares the menu's color."
- `:555`:
  - "`bg-sidebar` with `border-t`" → "`bg-chrome` with a `border-chrome-border` top line"
  - "`THEME_COLORS` in `src/lib/theme.ts`)" → "`THEME_COLORS` in `src/lib/theme.ts`, equal to `--chrome`)"

**New §5 section after `:555`, before `### Data Tables`:**
```md
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
```

**Do's and Don'ts**
- `:621`: the line becomes "- **Do** keep the menu navy (`--sidebar` #082A54, #0E2445 in dark) with color only on its open row (the action blue fill, the light teal icon and the teal bar), navy #083161 for the logo and the pressed primary fill, Primary #1E4F94 for actions and links, and teal for info status and focus."
  - Add a new line after it: "- **Do** keep a count of waiting work on the bell only and every shell message in the one banner region (The One Count Rule and The One Banner Rule in §5 App Shell)."
- `:634`: the line becomes "- **Don't** bring back the old slate sidebar (Tailwind #0F172A, which competed with the content) or color the menu beyond its open row and the work dot; no focus color beyond `--ring` and, inside the navy menu, `--sidebar-ring`; no green, orange or red outside status badges, the bell's count and the menu's work dot."
- `:641`: append " The open menu row's 3px `sidebar-active-bar` is a state mark beside its fill, its icon and `aria-current`, not decoration, and the only stripe."

- [ ] **Step 5: `.impeccable/design.json` and docs/14**

**`generatedAt` (`:3`)**
- Becomes `"2026-10-21T00:00:00+07:00"`.

**Sidebar Navigation Item, `description` (`:437`)**
- "in the sidebar" → "in the navy menu"
- "sidebar-muted icon," → "sidebar-foreground text and a sidebar-muted icon on --sidebar,"
- "The active row is solid navy with white text and a teal icon" → "The open row is the action blue (--sidebar-active) with white text, the light teal icon (--sidebar-active-icon) and a 3px teal bar on its left edge (--sidebar-active-bar)"
- "Its focus ring sits outside the row on the sidebar color." → "Its focus ring is --sidebar-ring, outside the row on the menu color."

**Sidebar Navigation Item, `css` (`:439`)**
- `background: #082A54; color: #DCE6F2`
- `svg color: #9FB3D1`
- `:hover background: #1C3B62`
- `:focus-visible outline: 2px solid #5FD6DD`
- the active rule: `position: relative; background: #1E4F94; color: #FFFFFF;`
- the active `svg color: #5FD6DD`
- add `.ds-nav-item-active::before { content: ""; position: absolute; top: 6px; bottom: 6px; left: 0; width: 3px; border-radius: 0 3px 3px 0; background: #18A0A8; }`
- keep the forced-colors rule and the full font stack

**New component after it**
- The entry: `{ "name": "App Shell", "kind": "nav", "refersTo": "app-shell", … }`.
- `description`: plain text, no markdown, in this order:
  1. One sentence on the shell, citing the spec: the navy menu (--sidebar) with the person at its foot; a 56px topbar on --chrome with a --chrome-border line; the banner region; the phone's light bars and More sheet.
  2. "The One Count Rule: …", which adds bg-danger with text-danger-foreground and 99+ at most.
  3. "The One Banner Rule: …", which adds warning-soft with the warning ink, role=status, and offline wins.
- `html`:
  - a `.ds-nav-item` "ศูนย์งานค้าง" with an `aria-hidden` `.ds-nav-dot` and a visually hidden "มีงานรอคุณ 3 รายการ"
  - a 36px `.ds-bell` named "การแจ้งเตือน 3 รายการ" with an `aria-hidden` `.ds-bell-count` "3"
  - a `.ds-shell-banner` `role="status"` reading "ออฟไลน์อยู่ · บันทึกไม่ได้จนกว่าจะกลับมาออนไลน์"
- `css`: the dot is 8px, round, #F0A94D on #082A54. The bell is on #FFFFFF with ink #3C4F6B. Its count is 20px tall, min-width 20px, #B3261E with #FFFFFF, 600 12px. The banner is #FDF4E4 with #A14A05 and padding 8px 16px. Use the full font stack, and set no `height` or `width` of `40px` (`tests/phase2d-docs.test.ts:73`).

**Where Color Lives `body` (`:519`)**
- Everything before "Names are the neutral Chip" becomes DESIGN.md's new rule text without markdown, with these changes:
  - After "--sidebar", add "#082A54, #0E2445 in dark".
  - After "the focus ring", add "(#10858D; #5FD6DD inside the menu)".
  - Write the count and the dot as "(red)" and "(orange)", with no error/permission note.
  - End with "; only warning and danger toasts and Notice boxes get a soft fill."
- The closing sentences stay. `phase2d-docs.test.ts:79` pins "no screen uses the info tokens".

**Token Contrast `body` (`:534`)**
- "and rings, field borders and meaningful icons at 3:1;" → "and rings, field borders and meaningful icons at 3:1, the navy menu's on its own fills;"

**dos (`:570`)**
- dos[1] becomes: "Do keep the menu navy (#082A54, #0E2445 in dark) with color only on its open row (the action blue fill, the light teal icon #5FD6DD and the teal bar), navy #083161 for the logo and the pressed primary fill, Primary #1E4F94 for actions and links, and teal for info status and focus."
- Insert a new Do after it: "Do show a count of waiting work on the bell only and every shell message in the one banner region under the topbar."

**donts**
- donts[2] (`:581`) becomes DESIGN.md's new `:634` Don't without markdown or backticks.
- donts[9] (`:588`): append "; the open menu row's 3px teal bar is a state mark, not decoration, and the only stripe."

**docs/14**
- `docs/14_UI_UX_DESIGN_SYSTEM.md:28`: the cell after `Navigation` becomes "The navy menu with sections beside the topbar on the chrome color, in the light or the dark theme".

- [ ] **Step 6: Update existing pins**

**`tests/dark-mode-t.test.ts`**
- Keep `LIGHT_AT_BASE` (`:21-35`). Add after it:
  ```ts
  const MENU_B_LIGHT: Record<string, string> = { "sidebar": "#082A54", "sidebar-foreground": "#DCE6F2", "sidebar-muted": "#9FB3D1", "sidebar-hover": "#1C3B62", "sidebar-active": "#1E4F94", "sidebar-active-foreground": "#FFFFFF", "sidebar-active-icon": "#5FD6DD", "sidebar-border": "#213F65" }
  ```
- `:52`:
  ```ts
  const added = ["image-stage", "app-icon-frame", "chrome", "chrome-border", "sidebar-active-bar", "sidebar-ring", "sidebar-dot"]
  ```
- `:53`: the expected value becomes `{ ...LIGHT_AT_BASE, ...MENU_B_LIGHT }`.
- `:55`: the comment says "the chrome (topbar, bottom bar)".
- `:61`:
  ```ts
  assert.ok(luminance("canvas") < luminance("chrome") && luminance("chrome") < luminance("card"), "dark chrome sits between the canvas and the panels")
  ```
- `:62-64`: the icon check becomes the line below. `:65` stays.
  ```ts
  for (const tokens of [light, dark]) assert.equal(tokens["sidebar-active-bar"], tokens["brand-accent"], "the open menu row's bar carries the brand teal")
  ```
- `:130`: `resolveToken(tokens, "sidebar")` → `resolveToken(tokens, "chrome")`.
- `:122` stays.

**`tests/dark-mode-s.test.ts`**
- `:21-24`: the comment says `--chrome`, and the two asserts compare `THEME_COLORS.light` / `THEME_COLORS.dark` with `readRootTokens(css).chrome` / `readDarkTokens(css).chrome`.
- `:118-133`:
  - The title becomes "the topbar and the phone bottom bar take the chrome color, the same white as today in light (menu B §6.1)".
  - Both class regexes read `border-chrome-border bg-chrome` in place of `border-border bg-sidebar`. Keep `h-16`.
  - Both bars get `doesNotMatch(/\bbg-surface\b|\bbg-sidebar\b/)`.
  - `const chrome = resolveToken(tokens, "chrome")`, with the message "on chrome".

**`tests/dark-mode-p.test.ts`**
- `:27`:
  ```ts
  assert.equal(light["app-icon-frame"], light.card, "in light the frame is white like the icon tile, so it does not show")
  ```
- `:51` stays: the dark frame is 1.70:1 on the new dark menu.

**`tests/modern-enterprise-theme.test.ts:37-39`** become:
```ts
assert.equal(token(source, "sidebar-active"), token(source, "primary"), "the open menu row carries the action blue")
assert.equal(token(source, "sidebar-active-bar"), token(source, "brand-accent"), "the open menu row's bar carries the logo teal")
assert.equal(token(source, "chrome"), token(source, "card"), "the topbar's chrome is a white surface in light")
assert.notEqual(token(source, "sidebar"), token(source, "chrome"), "the menu is navy beside the light chrome")
```

**`tests/visual-consistency-ui.test.ts`**
- `:9`: the title becomes "app shell uses the menu B visual tokens".
- `:15`: `assert.equal(tokens["sidebar-active"], tokens.primary)`, plus `assert.equal(tokens.chrome, tokens.card)`.

**`tests/dashboard-shell-theme.test.ts`**
- `:5-6`: the helpers add `.replace(/\r/g, "")`.
- `:8`: the title becomes "the menu uses the navy menu tokens and marks the current page".
- `:33-37`: the title becomes "the topbar takes the chrome color", with `assert.match(source, /border-chrome-border bg-chrome\b/)` and `assert.doesNotMatch(source, /\bbg-sidebar\b/)`.

**`tests/visual-foundation-guards.test.ts:140`**
```ts
assert.match(nav, /"fixed inset-x-0 bottom-0 z-20 border-t border-chrome-border bg-chrome px-2 /)
```

**Unchanged:** `tests/dark-mode-docs.test.ts:49`, because `sidebar-border` stays last before `image-stage`.

- [ ] **Step 7: Verify**

1. Run `node --test tests/design-tokens-contrast.test.ts tests/dark-mode-docs.test.ts tests/dark-mode-t.test.ts tests/dark-mode-s.test.ts tests/dark-mode-p.test.ts tests/modern-enterprise-theme.test.ts tests/visual-consistency-ui.test.ts tests/dashboard-shell-theme.test.ts tests/visual-foundation-guards.test.ts`. Everything passes.
2. Run `npm test`. All green, including:
   - thai-glossary
   - phase2d-docs
   - v-track-final (its section still ends at `### Navigation`)
   - sidebar-menu-structure
   - shell-sweep-ui
3. Run `npx tsc --noEmit -p .`. No errors.
4. Run `npm run lint`. 0 errors.

- [ ] **Step 8: Commit**
```
git add src/app/globals.css src/lib/theme.ts src/components/layout/topbar.tsx src/components/layout/mobile-field-navigation.tsx src/components/layout/sidebar.tsx DESIGN.md .impeccable/design.json docs/14_UI_UX_DESIGN_SYSTEM.md tests/design-tokens-contrast.test.ts tests/dark-mode-docs.test.ts tests/dark-mode-t.test.ts tests/dark-mode-s.test.ts tests/dark-mode-p.test.ts tests/modern-enterprise-theme.test.ts tests/visual-consistency-ui.test.ts tests/dashboard-shell-theme.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(shell): a navy menu beside a chrome-colored topbar, with its tokens, contrast pairs and design docs (menu B shell task 1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Notification read rules and `read_all`

**Files:**
- Create: `src/lib/notification-groups.ts`
- Modify: `src/lib/notification-center.ts` (`mergeNotificationItemsWithStates` :28-51; add `getNotificationCountDrops` after it)
- Modify: `src/lib/notification-summary.ts` (imports :1-5, signature :34, counts and state query :119-146)
- Modify: `src/lib/notification-digest.ts:89`; `src/app/api/notifications/route.ts` (GET :9-18, PATCH :20-37)
- Test: `tests/notification-center.test.ts` (modify), `tests/notification-groups.test.ts`, `tests/notification-read-rules-route.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `getNotificationCountDrops(items: { key: string; count: number }[], states: NotificationStateRecord[], now?: Date): { key: string; count: number }[]` (in `items` order) in `src/lib/notification-center.ts`
  - `getNotificationCenter(user: SessionUser, locale: string, options?: { recordCountDrops?: boolean })` (default true)
  - `PATCH /api/notifications?locale=th|en` body `{ action: "read_all" }` → `200 { ok: true, summary }` (`summary` = `getNotificationSummary(user, locale)`; Task 3 sets its shape)
  - `src/lib/notification-groups.ts` (no imports): `DECIDE_NOTIFICATION_KEYS = ["approvalInbox"] as const`; `groupNotificationItems<T extends { key: string }>(items: T[]): { decide: T[]; follow: T[] }`; `countUnreadDecisions(items: { key: string; count: number; isRead?: boolean; isSuppressed?: boolean }[]): number`

**Decisions:**
- A read or snoozed row stays suppressed while `count <= lastCount`; only a rise un-reads or un-snoozes it.
- A drop is recorded only for a row read or snoozed past `now`, when `count < lastCount`, as the lower count; computed over all ten counted keys including zeros (a row that fell to 0 must record it), so the state query always runs over the ten keys, even when nothing is listed.
- Drops are written in one `prisma.$transaction` of `updateMany` guarded by `lastCount: { gt: count }` (idempotent under concurrent summaries); no transaction when there are none.
- The digest's dry run writes nothing; the notifications page keeps the default and records drops.
- `read_all` uses the server's own counts (ignores `key`/`count` in the body), upserts only rows with `!isRead` (a snoozed row becomes read, its snooze cleared) in one `$transaction`, skipped when none, and answers after the writes. The single-key path and the assignee check are unchanged (it still trusts the client's count).
- The GET reply keeps today's shape in this task (Task 3 changes it).
- `notification-summary.ts` must not contain `dueDate`, `overdueMaintenance` or `completedMaintenanceAwaitingClose`, comments included.

- [ ] **Step 1: Write the failing tests**

`tests/notification-center.test.ts`: import `getNotificationCountDrops`; rename the test at :16 to `"suppresses read and snoozed notifications only while the count has not risen"` (assertions unchanged); add:

```ts
test("a read or snoozed row stays suppressed when its count drops and returns when it rises (menu B shell task 2)", () => {
  const now = new Date("2026-10-21T08:00:00.000Z")
  const later = "2026-10-22T08:00:00.000Z"
  const items = mergeNotificationItemsWithStates([
    { key: "approvalInbox", count: 2, href: "/th/admin/approvals", tone: "danger" },
    { key: "duePm", count: 4, href: "/th/maintenance#pm-due", tone: "warning" },
    { key: "returnsDueSoon", count: 1, href: "/th/asset-management/checkin", tone: "primary" },
    { key: "approvedDisposals", count: 6, href: "/th/disposal?status=approved", tone: "warning" },
  ], [
    { key: "approvalInbox", isRead: true, lastCount: 3, snoozedUntil: null, assignedToUserId: null },
    { key: "duePm", isRead: true, lastCount: 3, snoozedUntil: null, assignedToUserId: null },
    { key: "returnsDueSoon", isRead: false, lastCount: 2, snoozedUntil: later, assignedToUserId: null },
    { key: "approvedDisposals", isRead: false, lastCount: 5, snoozedUntil: later, assignedToUserId: null },
  ], now)
  assert.deepEqual(items.map((item) => [item.key, item.isRead, item.isSnoozed, item.isSuppressed]), [
    ["approvalInbox", true, false, true], ["duePm", false, false, false],
    ["returnsDueSoon", false, true, true], ["approvedDisposals", false, false, false],
  ])
  assert.equal(buildActiveNotificationSummary(items).total, 10)
})

test("a drop in a read or snoozed row's count is reported as the lower count to record (menu B shell task 2)", () => {
  const now = new Date("2026-10-21T08:00:00.000Z")
  const state = (key: string, isRead: boolean, lastCount: number, snoozedUntil: string | null = null) =>
    ({ key, isRead, lastCount, snoozedUntil, assignedToUserId: null })
  assert.deepEqual(getNotificationCountDrops([
    { key: "approvalInbox", count: 2 }, { key: "duePm", count: 0 }, { key: "returnsDueSoon", count: 1 },
    { key: "approvedDisposals", count: 1 }, { key: "warrantyExpiringSoon", count: 1 },
    { key: "licenseExpiringSoon", count: 2 }, { key: "openAuditActions", count: 3 },
  ], [
    state("approvalInbox", true, 3), state("duePm", true, 1),
    state("returnsDueSoon", false, 4, "2026-10-22T08:00:00.000Z"),
    state("approvedDisposals", false, 5), state("warrantyExpiringSoon", false, 5, "2026-10-20T08:00:00.000Z"),
    state("licenseExpiringSoon", true, 2), state("openAuditActions", true, 2), state("overdue:asset-1", true, 2),
  ], now), [{ key: "approvalInbox", count: 2 }, { key: "duePm", count: 0 }, { key: "returnsDueSoon", count: 1 }])
})
```

`tests/notification-groups.test.ts`:

```ts
import { DECIDE_NOTIFICATION_KEYS, countUnreadDecisions, groupNotificationItems } from "../src/lib/notification-groups.ts"

test("the decide group holds the approval inbox only; every other item follows in today's order (menu B shell task 2)", () => {
  assert.deepEqual([...DECIDE_NOTIFICATION_KEYS], ["approvalInbox"])
  const items = ["duePm", "approvalInbox", "pendingAuditFindings", "pendingDisposals", "returnsDueSoon"].map((key) => ({ key }))
  const groups = groupNotificationItems(items)
  assert.deepEqual(groups.decide.map((item) => item.key), ["approvalInbox"])
  assert.deepEqual(groups.follow.map((item) => item.key), ["duePm", "pendingAuditFindings", "pendingDisposals", "returnsDueSoon"])
  assert.equal(groups.decide[0], items[1]) // the same objects, not copies
  assert.deepEqual(groupNotificationItems([]), { decide: [], follow: [] })
})

test("unread decisions count the approval inbox while it is neither read nor snoozed (menu B shell task 2)", () => {
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3 }, { key: "duePm", count: 5 }]), 3)
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3, isRead: true }]), 0)
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3, isRead: false, isSuppressed: true }]), 0)
  assert.equal(countUnreadDecisions([{ key: "pendingDisposals", count: 2 }, { key: "pendingAuditFindings", count: 1 }]), 0)
  assert.equal(countUnreadDecisions([]), 0)
})
```

`tests/notification-read-rules-route.test.ts`: copy the resolve-hook `load` harness of `tests/disposal-pending-source-route.test.ts`; `read(path)` = `readFileSync(path, "utf8").replace(/\r/g, "")`; reset `state` before each test.

```ts
const state = { inbox: { total: 2, audit: 0, disposal: 0 }, counts: {} as Record<string, number>, states: [] as Array<Record<string, unknown>>, calls: [] as Array<{ call: string; args: any }> }
Object.assign(globalThis, { __notificationRoute: state })
// "next/server": NextRequest extends Request { get nextUrl() { return new URL(this.url) } }; NextResponse.json → Response.json
// "@/lib/auth-utils": requireAuth() → { id: "user-1", roles: [], permissions: [], employeeId: null }; hasPermission() → true
// "@/lib/approval-inbox-query": getApprovalInboxCounts() → state.inbox
// "@/lib/db": push every call to state.calls; <model>.count → state.counts[model] ?? 0; systemSetting.findMany → [];
//   notificationUserState.findMany(args) → state.states filtered by args.where.key.in; updateMany → { count: 1 };
//   upsert(args) → replace or insert { key, assignedToUserId: null, ...args.update } in state.states and return it;
//   $transaction(array) → Promise.all(array); user.findFirst → null. Other @/ imports resolve to src/ (as in v-track-s)
const calls = (name: string) => state.calls.filter((c) => c.call === name).map((c) => c.args)
const TEN_KEYS = ["approvalInbox", "duePm", "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"]
```

- `"the summary reads every counted key's state and records each drop once, guarded (menu B shell task 2)"`: states approvalInbox read lastCount 3, duePm read lastCount 1, licenseExpiringSoon read lastCount 0; `GET(new NextRequest("http://localhost/api/notifications?locale=th"))` → 200, body `total === 0`; `calls("notificationUserState.findMany")[0].where` deepEquals `{ userId: "user-1", key: { in: TEN_KEYS } }`; `calls("notificationUserState.updateMany")` deepEquals `[{ where: { userId: "user-1", key: "approvalInbox", lastCount: { gt: 2 } }, data: { lastCount: 2 } }, { where: { userId: "user-1", key: "duePm", lastCount: { gt: 0 } }, data: { lastCount: 0 } }]`. Then approvalInbox read lastCount 2 alone → no `updateMany`; no states → `findMany` still called once.
- `"getNotificationCenter records no drop when asked not to, and the digest's dry run asks (menu B shell task 2)"`: state approvalInbox read lastCount 3; `getNotificationCenter(user, "th", { recordCountDrops: false })` from `src/lib/notification-summary.ts` → no `updateMany`; `assert.match(read("src/lib/notification-digest.ts"), /getNotificationCenter\(user, locale, \{ recordCountDrops: !dryRun \}\)/)`.
- `"read_all marks every row not yet read at the server's own count and answers the recomputed summary (menu B shell task 2)"`: `state.counts = { maintenancePlan: 1, assetCheckout: 1 }` (items approvalInbox 2, duePm 1, returnsDueSoon 1); states duePm read lastCount 1, returnsDueSoon lastCount 1 `snoozedUntil: "2099-01-01T00:00:00.000Z"`; `PATCH` on `?locale=th` with `{ action: "read_all", key: "approvalInbox", count: 99 }` → `calls("notificationUserState.upsert")` deepEquals `[{ where: { userId_key: { userId: "user-1", key: "approvalInbox" } }, create: { userId: "user-1", key: "approvalInbox", isRead: true, lastCount: 2, snoozedUntil: null }, update: { isRead: true, lastCount: 2, snoozedUntil: null } }, { where: { userId_key: { userId: "user-1", key: "returnsDueSoon" } }, create: { userId: "user-1", key: "returnsDueSoon", isRead: true, lastCount: 1, snoozedUntil: null }, update: { isRead: true, lastCount: 1, snoozedUntil: null } }]`; body `ok === true`, `summary.total === 0`. With every row already read: no upsert, body `ok === true`.

- [ ] **Step 2: Run them and see them fail**
`node --test tests/notification-center.test.ts tests/notification-groups.test.ts tests/notification-read-rules-route.test.ts` → groups: `ERR_MODULE_NOT_FOUND`; center: SyntaxError, no export `getNotificationCountDrops`; GET: `updateMany` `[]`, `key.in` `["approvalInbox"]`; PATCH: 400 `{ error: "Invalid notification action" }`; digest assertion fails.

- [ ] **Step 3: Implement** (read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` first)
- `notification-center.ts`: replace `sameCount` with `const notRisen = state !== undefined && item.count <= state.lastCount` for `isRead` and `isSnoozed`; `getNotificationCountDrops` reuses `parseDate`.
- `notification-groups.ts`: partition by membership in `DECIDE_NOTIFICATION_KEYS`, order kept; `countUnreadDecisions` sums decide items where `!(item.isSuppressed ?? item.isRead ?? false)`.
- `notification-summary.ts`: `const counts: NotificationSummaryCounts = { approvalInbox: approvalInboxCounts.total, duePm, … }` (today's order) passed to `buildNotificationSummaryItems`; drop the `items.length > 0 ?` guard, query `key: { in: Object.keys(counts) }`; when `options?.recordCountDrops !== false`: `getNotificationCountDrops(Object.entries(counts).map(([key, count]) => ({ key, count })), states)`, and if any, `prisma.$transaction(drops.map((drop) => prisma.notificationUserState.updateMany({ where: { userId: user.id, key: drop.key, lastCount: { gt: drop.count } }, data: { lastCount: drop.count } })))`.
- `notification-digest.ts:89`: `getNotificationCenter(user, locale, { recordCountDrops: !dryRun })`.
- `route.ts`: `function notificationLocale(request: NextRequest) { return request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th" }` used by GET; in PATCH after the body parse, before the key check: `if (body?.action === "read_all")` → `const locale = notificationLocale(request)` inside that branch only (`tests/v-track-s.test.ts:459` sends its `assign` PATCH as a plain `Request` with no `nextUrl`, so reading the locale any earlier turns its 400 into a 500), then `getNotificationCenter(user, locale)`, upsert each `!item.isRead` row (same `where`/`create`/`update` form as the single-key upsert) with `buildNotificationStateUpdate({ action: "read", count: item.count })`, then `return NextResponse.json({ ok: true, summary: await getNotificationSummary(user, locale) })`.

- [ ] **Step 4: Update existing pins**
- `tests/notification-center.test.ts:16` → the new name only.

- [ ] **Step 5: Verify**
`node --test tests/notification-center.test.ts tests/notification-groups.test.ts tests/notification-read-rules-route.test.ts tests/v-track-s.test.ts tests/notification-maintenance-query.test.ts tests/notification-summary.test.ts tests/notification-digest.test.ts` → all pass (v-track-s:459-463 keeps the `assign` 400 `"Invalid assignee"`); then `npm test` (0 failures), `npx tsc --noEmit -p .` (no output), `npm run lint` (0 errors).

- [ ] **Step 6: Commit**
`git add src/lib/notification-center.ts src/lib/notification-groups.ts src/lib/notification-summary.ts src/lib/notification-digest.ts src/app/api/notifications/route.ts tests/notification-center.test.ts tests/notification-groups.test.ts tests/notification-read-rules-route.test.ts`
`git commit -m "feat(shell): read and snoozed notifications return only when their count rises, and read_all marks the person's summary read (menu B shell task 2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

---

### Task 3: Shell notification context, polling, announcement

**Files:**
- Create: `src/components/layout/shell-notifications.tsx`, `src/lib/notification-announcement.ts`
- Modify: `src/lib/notification-client-sync.ts` (types :1-8; `NotificationFetch` and `removeNotificationSummaryItem` :32-45; new functions after `markNotificationRead`)
- Modify (anchor by content; earlier tasks edited them): `src/lib/notification-summary.ts` (`getNotificationSummary`), `src/components/layout/topbar.tsx` (the `react` and notification-client-sync imports, the local `fetchNotificationSummary`, the notification state/effect/click handler, the `{/* Notifications */}` badge and list)
- Modify: `src/components/layout/dashboard-shell.tsx` (imports, the `<ConfirmProvider>` return); `e2e/support/allow-list.ts:40-42`; `messages/th.json`, `messages/en.json`
- Test: modify `tests/notification-client-sync.test.ts`, `tests/notification-topbar-behavior.test.ts`, `tests/e2e-cross-cutting.test.ts`, `tests/notification-read-rules-route.test.ts`; create `tests/notification-announcement.test.ts`, `tests/shell-notifications.test.ts`

**Interfaces:**
- Consumes (Task 2): `GET /api/notifications?locale=`; `PATCH /api/notifications?locale=` `{ action: "read_all" }` → `{ ok: true; summary }`; `getNotificationCenter(user, locale)` `.items: NotificationCenterItem[]`, `.activeTotal`, `.generatedAt`.
- Produces:
  - `src/lib/notification-client-sync.ts`: `type NotificationClientItem = NotificationSummaryItem & { isRead: boolean; isSnoozed: boolean; isSuppressed: boolean }`; `type NotificationClientSummary = { total: number; items: NotificationClientItem[]; generatedAt: string }` (`total` = unread total; `items` = every row, read included); `type NotificationJsonFetch = (input: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>`; `NOTIFICATION_POLL_MS = 120_000`; `fetchNotificationSummary(locale: string, request?: NotificationJsonFetch): Promise<NotificationClientSummary | null>`; `markAllNotificationsRead(locale: string, request?: NotificationJsonFetch): Promise<NotificationClientSummary | null>`; `markNotificationSummaryItemRead(summary: NotificationClientSummary, key: string): NotificationClientSummary`
  - `src/lib/notification-announcement.ts`: `type NotificationIncreaseLabels = { increase: (key: string, count: number) => string }`; `describeNotificationIncrease(previous: NotificationClientSummary | null, next: NotificationClientSummary, labels: NotificationIncreaseLabels): string | null`; `NOTIFICATION_ANNOUNCEMENT_CLEAR_MS = 10_000`
  - `src/components/layout/shell-notifications.tsx`: `type ShellNotificationsValue = { summary: NotificationClientSummary | null; refresh(): Promise<void>; markRead(key: string): Promise<boolean>; markAllRead(): Promise<boolean> }`; `ShellNotificationsProvider({ children }: { children: React.ReactNode })`; `useShellNotifications(): ShellNotificationsValue` (throws outside the provider)
  - `getNotificationSummary(user, locale): Promise<NotificationClientSummary>`; message key `notifications.increaseAnnouncement`

**Decisions:**
- This task owns the GET reply shape: every listed row with `isRead`/`isSnoozed`/`isSuppressed`, plus `generatedAt`; `snoozedUntil` and `assignedToUserId` stay on the server.
- The topbar list keeps a temporary `!item.isSuppressed` filter (Task 7 replaces it).
- `markRead`/`markAllRead` resolve `true` when saved, `false` when the save failed (summary unchanged); `markRead` resolves `true` without a request when the row is missing or already read. No toast here (Task 7 adds `toast.error` on `false`).
- `removeNotificationSummaryItem` is deleted (read rows stay listed); `markNotificationSummaryItemRead` replaces it, and a read clears a snooze.
- Polling continues offline; a failed fetch keeps the last summary (never `setSummary(null)` or a zero summary).
- `previousSummaryRef` holds the last server summary only, never an optimistic state.
- The announcement names only unread rows whose count grew against the previous server summary, sentences joined by one space; `null` on the first load, without a rise of the unread total, or when it rises with no row growing; cleared after 10 s.
- Announcement copy is title first: th `{title} เพิ่ม {count} รายการ`, en `{title}: {count} more`.
- The allow-list id `topbar-notifications-cancelled-by-redirect` stays (pinned at `tests/e2e-cross-cutting.test.ts:157`); only its reason and `reviewed` change.

- [ ] **Step 1: Write the failing tests**

`tests/notification-client-sync.test.ts`: in the import (:4-11) replace `removeNotificationSummaryItem` with `NOTIFICATION_POLL_MS, fetchNotificationSummary, markAllNotificationsRead, markNotificationSummaryItemRead`; replace the tests at :13-33 with:

```ts
const item = (key: string, count: number, read = false) => ({ key, count, href: `/th/${key}`, tone: "warning" as const, isRead: read, isSnoozed: false, isSuppressed: read })
const summary = { total: 5, generatedAt: "2026-10-21T08:00:00.000Z", items: [item("approvalInbox", 2), item("duePm", 3), item("returnsDueSoon", 4, true)] }

test("polls every 2 minutes (menu B shell task 3)", () => assert.equal(NOTIFICATION_POLL_MS, 120_000))

test("marking one row read keeps it listed, marks it read and lowers the badge (menu B shell task 3)", () => {
  const next = markNotificationSummaryItemRead(summary, "approvalInbox")
  assert.equal(next.total, 3)
  assert.deepEqual(next.items.map((i) => [i.key, i.isRead, i.isSnoozed, i.isSuppressed]), [["approvalInbox", true, false, true], ["duePm", false, false, false], ["returnsDueSoon", true, false, true]])
  assert.equal(next.generatedAt, summary.generatedAt)
  assert.equal(markNotificationSummaryItemRead(summary, "returnsDueSoon"), summary)
  assert.equal(markNotificationSummaryItemRead(summary, "missing"), summary)
})

test("fetches the summary for the locale and answers null on any failure (menu B shell task 3)", async () => {
  let input = ""
  assert.deepEqual(await fetchNotificationSummary("en", async (url) => { input = url; return { ok: true, json: async () => summary } }), summary)
  assert.equal(input, "/api/notifications?locale=en")
  assert.equal(await fetchNotificationSummary("th", async () => ({ ok: false, json: async () => ({}) })), null)
  assert.equal(await fetchNotificationSummary("th", async () => { throw new Error("offline") }), null)
})

test("read-all sends the action only, never counts, and returns the server's summary (menu B shell task 3)", async () => {
  let request: { input: string; init?: RequestInit } | undefined
  assert.deepEqual(await markAllNotificationsRead("th", async (input, init) => { request = { input, init }; return { ok: true, json: async () => ({ ok: true, summary }) } }), summary)
  assert.equal(request?.input, "/api/notifications?locale=th")
  assert.equal(request?.init?.method, "PATCH")
  assert.deepEqual(JSON.parse(String(request?.init?.body)), { action: "read_all" })
  assert.equal(await markAllNotificationsRead("th", async () => ({ ok: false, json: async () => ({}) })), null)
  assert.equal(await markAllNotificationsRead("th", async () => { throw new Error("offline") }), null)
})
```

`tests/notification-announcement.test.ts` (with the same `item` helper as above):

```ts
import { NOTIFICATION_ANNOUNCEMENT_CLEAR_MS, describeNotificationIncrease } from "../src/lib/notification-announcement.ts"
const titles: Record<string, string> = { approvalInbox: "งานรออนุมัติ", duePm: "PM ถึงกำหนด" }
const labels = { increase: (key: string, count: number) => `${titles[key]} เพิ่ม ${count} รายการ` }
const summary = (...items: ReturnType<typeof item>[]) => ({ total: items.filter((i) => !i.isSuppressed).reduce((sum, i) => sum + i.count, 0), generatedAt: "2026-10-21T08:00:00.000Z", items })
const announce = (previous: ReturnType<typeof summary> | null, next: ReturnType<typeof summary>) => describeNotificationIncrease(previous, next, labels)

test("names what grew when the unread total rises (menu B shell task 3)", () => {
  assert.equal(announce(summary(item("approvalInbox", 2)), summary(item("approvalInbox", 3))), "งานรออนุมัติ เพิ่ม 1 รายการ")
  assert.equal(announce(summary(item("approvalInbox", 2)), summary(item("approvalInbox", 2), item("duePm", 2))), "PM ถึงกำหนด เพิ่ม 2 รายการ")
  assert.equal(announce(summary(item("approvalInbox", 3, true)), summary(item("approvalInbox", 4))), "งานรออนุมัติ เพิ่ม 1 รายการ") // the growth, not the whole count
  assert.equal(announce(summary(item("approvalInbox", 1), item("duePm", 1)), summary(item("approvalInbox", 2), item("duePm", 3))), "งานรออนุมัติ เพิ่ม 1 รายการ PM ถึงกำหนด เพิ่ม 2 รายการ")
  assert.equal(announce(summary(item("approvalInbox", 3), item("duePm", 1)), summary(item("approvalInbox", 1), item("duePm", 4))), "PM ถึงกำหนด เพิ่ม 3 รายการ")
})

test("says nothing on the first load, without a rise, or when the badge rises with no new work (menu B shell task 3)", () => {
  assert.equal(announce(null, summary(item("approvalInbox", 3))), null)
  assert.equal(announce(summary(item("approvalInbox", 3)), summary(item("approvalInbox", 3))), null)
  assert.equal(announce(summary(item("approvalInbox", 3)), summary(item("approvalInbox", 2))), null)
  assert.equal(announce(summary(item("duePm", 2, true)), summary(item("duePm", 2))), null)
  assert.equal(NOTIFICATION_ANNOUNCEMENT_CLEAR_MS, 10_000)
})
```

`tests/shell-notifications.test.ts` (source-reading, `.replace(/\r/g, "")`; provider = `shell-notifications.tsx`):
- `"the shell keeps one notification summary current: on mount, every 2 minutes while visible, on return to the tab, and on the change event (menu B shell task 3)"` — provider matches `/^"use client"/`, `/export function ShellNotificationsProvider\(\{ children \}: \{ children: React\.ReactNode \}\)/`, `/throw new Error\("useShellNotifications must be used inside <ShellNotificationsProvider>"\)/`, `/if \(document\.visibilityState === "visible"\) void refresh\(\)/`, `/window\.setInterval\(refreshWhenVisible, NOTIFICATION_POLL_MS\)/`, `/window\.clearInterval\(/`, `/document\.addEventListener\("visibilitychange", refreshWhenVisible\)/`, `/document\.removeEventListener\("visibilitychange", refreshWhenVisible\)/`, `/window\.addEventListener\(notificationSummaryChangedEvent, refresh\)/`, `/window\.removeEventListener\(notificationSummaryChangedEvent, refresh\)/`, `/notificationRequestGuard\.begin\(\)/`, `/if \(data && notificationRequestGuard\.isLatest\(requestId\)\) applyServerSummary\(data\)/`, `/fetchNotificationSummary\(locale\)/`; doesNotMatch `/setSummary\(null\)|setSummary\(\{ total: 0/`.
- `"marking read updates the shared summary in place and tells the app; read-all takes the server's summary; both say whether the save landed (menu B shell task 3)"` — matches `/markRead\(key: string\): Promise<boolean>/`, `/markAllRead\(\): Promise<boolean>/`, `/const saved = await markNotificationRead\(item\)\n\s+if \(saved\) \{\n\s+setSummary\(\(current\) => current && markNotificationSummaryItemRead\(current, key\)\)\n\s+notifyNotificationSummaryChanged\(\)\n\s+\}\n\s+return saved/`, `/const next = await markAllNotificationsRead\(locale\)\n\s+if \(!next\) return false/`.
- `"new work is announced once, in one polite status region (menu B shell task 3)"` — `source.match(/role="status"/g)?.length === 1`; matches `/<p role="status" className="sr-only" data-shell-notification-announcement>\{announcement\}<\/p>/`, `/describeNotificationIncrease\(previousSummaryRef\.current, next,/`, `/previousSummaryRef\.current = next/`, `/tNotifications\("increaseAnnouncement", \{ title: tNotifications\(key\), count \}\)/`, `/window\.setTimeout\(\(\) => setAnnouncement\(""\), NOTIFICATION_ANNOUNCEMENT_CLEAR_MS\)/`; th `notifications.increaseAnnouncement === "{title} เพิ่ม {count} รายการ"`, en `=== "{title}: {count} more"`.
- `"the dashboard shell mounts the provider around the menu and the top bar (menu B shell task 3)"` — `dashboard-shell.tsx` matches `/import \{ ShellNotificationsProvider \} from "@\/components\/layout\/shell-notifications"/` and `/<ConfirmProvider>[\s\S]*<ShellNotificationsProvider>[\s\S]*<div ref=\{shellRef\}[\s\S]*<\/ShellNotificationsProvider>[\s\S]*<\/ConfirmProvider>/` (loose on purpose: Task 9's More sheet, Task 10's ShellBannerProvider and Task 12a's SessionKeeper go around or beside the shell div).

`tests/notification-read-rules-route.test.ts`: in the GET drop test, the first answer's `items` deepEqual `[{ key: "approvalInbox", count: 2, href: "/th/admin/approvals", tone: "danger", isRead: true, isSnoozed: false, isSuppressed: true }]` and `typeof body.generatedAt === "string"`; in the `read_all` test, `body.summary.items.every((item) => item.isRead)`.

- [ ] **Step 2: Run them and see them fail**
`node --test tests/notification-client-sync.test.ts tests/notification-announcement.test.ts tests/shell-notifications.test.ts tests/notification-topbar-behavior.test.ts tests/e2e-cross-cutting.test.ts tests/notification-read-rules-route.test.ts` → missing exports (`NOTIFICATION_POLL_MS`, `markNotificationSummaryItemRead`); `ERR_MODULE_NOT_FOUND` (announcement); `ENOENT` (`shell-notifications.tsx`); the topbar still fetches; GET items lack the flags.

- [ ] **Step 3: Messages** — a change file in the scratchpad, then `node scripts/messages-edit.mjs <file>`:

```json
{ "set": { "th": { "notifications.increaseAnnouncement": "{title} เพิ่ม {count} รายการ" },
           "en": { "notifications.increaseAnnouncement": "{title}: {count} more" } } }
```

- [ ] **Step 4: Implement**
- `notification-client-sync.ts`: `fetchNotificationSummary` moves here from `topbar.tsx` and calls `request` with the template literal `/api/notifications?locale=${locale}` (the Step 5 pin matches it); `markAllNotificationsRead` PATCHes the same URL (`Content-Type: application/json`, body `{ action: "read_all" }`) and returns `.summary`, `null` on `!ok` or a throw.
- `notification-summary.ts`: `getNotificationSummary` returns `{ total: center.activeTotal, items: center.items.map(({ key, count, href, tone, isRead, isSnoozed, isSuppressed }) => ({ key, count, href, tone, isRead, isSnoozed, isSuppressed })), generatedAt: center.generatedAt }`.
- `notification-announcement.ts`:

```ts
if (!previous || next.total <= previous.total) return null
const before = new Map(previous.items.map((item) => [item.key, item.count]))
const sentences = next.items
  .filter((item) => !item.isSuppressed)
  .map((item) => ({ key: item.key, increase: item.count - (before.get(item.key) ?? 0) }))
  .filter((item) => item.increase > 0)
  .map((item) => labels.increase(item.key, item.increase))
return sentences.length > 0 ? sentences.join(" ") : null
```

- `shell-notifications.tsx`: `useLocale()`, `useTranslations("notifications")`; summary state starts `null`; guard `useState(createLatestNotificationRequestGuard)`. `applyServerSummary(next)` sets the announcement when `describeNotificationIncrease` returns one, then `previousSummaryRef.current = next`, `setSummary(next)`. One effect: immediate `refresh()`, the interval, both listeners; its cleanup removes them and calls `notificationRequestGuard.begin()` to void in-flight requests. A second effect clears the announcement. `markAllRead`: `begin()`, `markAllNotificationsRead(locale)`, `false` on `null`, else `applyServerSummary` if still latest, `notifyNotificationSummaryChanged()`, `true`. Memoize the value; render `{children}` then the status `<p>`.
- `dashboard-shell.tsx`: wrap the `fixed inset-0` div in `<ShellNotificationsProvider>` inside `<ConfirmProvider>`.
- `topbar.tsx`: drop its fetch, summary state, guard, `loadNotificationSummary`, effect and the `useCallback`/`useEffect` imports; `const { summary: notificationSummary, markRead } = useShellNotifications()`; `const notificationTotal = notificationSummary?.total ?? 0` drives the badge (class string unchanged); the list maps `notificationSummary?.items.filter((item) => !item.isSuppressed) ?? []`; the click becomes `try { await markRead(item.key) } finally { setNotificationOpen(false); router.push(item.href) }`.
- `e2e/support/allow-list.ts:41` reason begins "The shell's notification provider (src/components/layout/shell-notifications.tsx) fetches the notifications as soon as a dashboard page hydrates, every 2 minutes while the page is visible, and when the tab becomes visible again; …" (rest unchanged); `:42` `reviewed: "2026-10-21"`.

- [ ] **Step 5: Update existing pins**
- `tests/notification-topbar-behavior.test.ts:8-16` → `"the bell reads the shell's summary and fetches nothing itself (menu B shell task 3)"`: topbar matches `/const \{ summary: notificationSummary, markRead \} = useShellNotifications\(\)/` and `/\{notificationTotal > 99 \? "99\+" : notificationTotal\}/`, doesNotMatch `/fetch\(|notificationSummaryChangedEvent|createLatestNotificationRequestGuard/` (the `.catch` check at :15 moves to the provider test).
- `tests/notification-topbar-behavior.test.ts:18-27` → keep `isPlainPrimaryClick\(event\)`, `event\.preventDefault\(\)`, `finally\s*\{[\s\S]*router\.push\(item\.href\)`; `markNotificationRead\(item\)` → `await markRead\(item\.key\)`; drop the `removeNotificationSummaryItem` and `notifyNotificationSummaryChanged\(\)` matches.
- `tests/e2e-cross-cutting.test.ts:160` (the topbar `fetch` match) → these two lines (13A later edits :141-159 only):

```ts
assert.match(read("src/lib/notification-client-sync.ts"), /request\(`\/api\/notifications\?locale=\$\{locale\}`\)/)
assert.match(read("src/components/layout/shell-notifications.tsx"), /fetchNotificationSummary\(locale\)/)
```

- [ ] **Step 6: Verify**
The Step 2 command plus `tests/visual-foundation-guards.test.ts tests/dark-mode-p.test.ts tests/ui-overlay-guards.test.ts tests/dropdown-menus-ui.test.ts tests/permission-aware-navigation.test.ts tests/confirm-dialog-ui.test.ts tests/dashboard-layout-scroll.test.ts tests/mobile-field-navigation-ui.test.ts tests/sheet-drawers-ui.test.ts tests/e2e-audit.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts` → all pass unchanged (badge classes, one status ink, Popover, `canOpenWorkCenter`, the allow-list id); then `npm test` (0 failures), `npx tsc --noEmit -p .` (no output), `npm run lint` (0 errors; `react-hooks` 7.1.1: setState only after an `await` or in a timer/listener callback, refs only in callbacks).

- [ ] **Step 7: Commit**
`git add src/components/layout/shell-notifications.tsx src/lib/notification-announcement.ts src/lib/notification-client-sync.ts src/lib/notification-summary.ts src/components/layout/dashboard-shell.tsx src/components/layout/topbar.tsx e2e/support/allow-list.ts messages/th.json messages/en.json tests/shell-notifications.test.ts tests/notification-announcement.test.ts tests/notification-client-sync.test.ts tests/notification-topbar-behavior.test.ts tests/e2e-cross-cutting.test.ts tests/notification-read-rules-route.test.ts`
`git commit -m "feat(shell): one notification summary for the shell, current every 2 minutes and on return to the tab, with new work announced once (menu B shell task 3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

E2E impact: none; the poll matches the allow-list URL regex, and the empty sr-only `role="status"` does not collide with `e2e/transactions/cancel.spec.ts:70` or `e2e/audit/scan-steps.ts:39` (filtered or scoped).

---

### Task 4: The desktop menu (navy rows, the person at the foot, the work center dot)

**Files:**
- Create: `src/lib/shell-account.ts`, `src/components/layout/sidebar-account.tsx`
- Modify:
  - `src/lib/user-display.ts` (append)
  - `src/components/layout/sidebar.tsx`. Anchor by content: Task 1 changed the brand name's class.
  - `src/components/layout/dashboard-shell.tsx`. Anchor by content: Task 3 wrapped the shell in `ShellNotificationsProvider`.
  - `src/app/[locale]/(dashboard)/layout.tsx`
  - `messages/th.json`, `messages/en.json`
- Test: `tests/sidebar-menu-b.test.ts`. Pins: `tests/dashboard-shell-theme.test.ts`, `tests/shell-sweep-ui.test.ts`, `tests/dashboard-layout-scroll.test.ts`

**Interfaces:**
- Consumes:
  - Task 1: the Tailwind colors `sidebar-dot` and `sidebar-ring`, and the CSS var `--sidebar-active-bar`.
  - Task 2: `countUnreadDecisions(items: { key: string; count: number; isRead?: boolean; isSuppressed?: boolean }[]): number` from `@/lib/notification-groups`.
  - Task 3: `useShellNotifications(): { summary: NotificationClientSummary | null; refresh(): Promise<void>; markRead(key: string): Promise<boolean>; markAllRead(): Promise<boolean> }` from `@/components/layout/shell-notifications`. Its provider already wraps `<Sidebar>`.
- Produces:
  - In `src/lib/user-display.ts`:
    - `export type ShellAccount = { roleLabel: string | null; departmentLabel: string | null }` (client-safe; Task 9 reads `account.roleLabel` and `account.departmentLabel`)
    - `export function getUserRoleLabel(roles: ReadonlyArray<{ displayName: string; displayNameTh: string | null }>, locale: string): string | null`
  - In `src/lib/shell-account.ts` (server): `export async function getShellAccount(user: SessionUser, locale: string): Promise<ShellAccount>`
  - `export function SidebarAccount({ user, account, collapsed }: { user: SessionUser; account: ShellAccount; collapsed: boolean })`, which sets `const displayName = getUserDisplayLabel(user)`.
  - `Sidebar` props: `{ collapsed: boolean; mobileOpen: boolean; user: SessionUser; account: ShellAccount; onMobileClose: () => void; onMobileNavigate: () => void }`
  - `DashboardShell({ children, user, account }: { children: React.ReactNode; user: SessionUser; account: ShellAccount })`
  - In `sidebar.tsx`: the module constants `rowClasses` and `activeRowClasses`, and `MenuItem.attention?: string`
  - The message `nav.workCenterWaiting`

**Decisions:**
- The session holds only role codes (`src/lib/session-access.ts:25`), so the dashboard layout makes one Prisma read through `getShellAccount` (prisma from `@/lib/db`). If the read fails, it returns `{ roleLabel: null, departmentLabel: null }` and the shell still renders.
- The role label:
  - uses active roles only, ordered by `role.name`
  - `th` uses `displayNameTh?.trim() || displayName`; every other locale uses `displayName`
  - joins names with `", "`, and returns `null` when there are none
  - `departmentLabel` is the department of the linked employee, or `null`.
- `user-display.ts` stays free of imports, because tests import it.
- The dot and the hidden sentence follow `countUnreadDecisions(summary?.items ?? [])`. The menu shows no number anywhere.
- Declare `useShellNotifications()` and `waitingDecisions` before `const menuSections`. `sidebar-menu-structure` reads the slice of code between `const menuSections` and `const visibleSections`.
- The brand name keeps Task 1's `text-sidebar-foreground`, the ink DESIGN.md names. The brand `Image` and its `ring-app-icon-frame` class stay untouched.
- The account trigger is the shared ghost `Button`, so N3 gets no new row.
  - Expanded: the visible name and role are its accessible name.
  - In the rail: only there does it add `aria-label` `nav.userMenu`.
- Add `scheme-dark` to the desktop aside and to the drawer's `SheetContent`, so Windows draws a dark scrollbar. Recolor the drawer's close X for the navy; the drawer stays until Task 9.
- Rows are 40px on desktop (`lg:min-h-10`). The width stays `lg:w-64`.
- The topbar user menu stays until Task 6 hides it at `lg`.

- [ ] **Step 1: Write the failing tests.** `tests/sidebar-menu-b.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getUserRoleLabel } from "../src/lib/user-display.ts"
const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")

test("the role line reads the role's own name in the page language (spec §6.2)", () => {
  const roles = [{ displayName: "System Administrator", displayNameTh: "ผู้ดูแลระบบ" }, { displayName: "Auditor", displayNameTh: null }]
  assert.equal(getUserRoleLabel(roles, "th"), "ผู้ดูแลระบบ, Auditor")
  assert.equal(getUserRoleLabel(roles, "en"), "System Administrator, Auditor")
  assert.equal(getUserRoleLabel([], "th"), null)
})

test("menu rows are navy rows: 40px, 6px corners, the teal ring on a navy offset, the 3px bar on the open page (spec §6.2)", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.equal(sidebar.match(/const rowClasses =\n\s+"([^"]+)"/)?.[1], "relative flex min-h-11 w-full items-center gap-2.5 rounded-control px-2.5 text-sm text-sidebar-foreground transition-colors motion-reduce:transition-none hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar lg:min-h-10")
  assert.equal(sidebar.match(/const activeRowClasses =\n\s+"([^"]+)"/)?.[1], "bg-sidebar-active font-medium text-sidebar-active-foreground shadow-[inset_3px_0_0_var(--sidebar-active-bar)] hover:bg-sidebar-active forced-colors:outline forced-colors:outline-2 forced-colors:-outline-offset-2")
  assert.match(sidebar, /<div className="flex h-14 min-w-0 shrink-0 items-center gap-2\.5 border-b border-sidebar-border px-4">/)
  assert.match(sidebar, /"min-w-0 truncate text-sm font-semibold text-sidebar-foreground"/)
  assert.doesNotMatch(sidebar, /(?<![\w-])text-foreground\b|focus-visible:ring-ring\b|border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all/)
  assert.match(sidebar, /"relative hidden max-h-dvh flex-col bg-sidebar text-sidebar-foreground scheme-dark transition-all duration-300 motion-reduce:transition-none lg:flex"/)
  assert.match(sidebar, /open && "font-semibold text-sidebar-active-foreground"/) // the open group's title: white, bold
  assert.doesNotMatch(sidebar, /containsActive && "font-semibold"/)
  assert.match(sidebar, /"mt-0\.5 ml-5 space-y-0\.5 border-l border-sidebar-border pl-1"/) // the guide line
})

test("the work center shows a dot and a hidden sentence, never a number (spec §6.2, The One Count Rule)", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.match(sidebar, /const \{ summary \} = useShellNotifications\(\)/)
  assert.match(sidebar, /const waitingDecisions = countUnreadDecisions\(summary\?\.items \?\? \[\]\)/)
  assert.match(sidebar, /labelKey: "workCenter",[\s\S]*?attention: waitingDecisions > 0 \? t\("workCenterWaiting", \{ count: waitingDecisions \}\) : undefined/)
  assert.match(sidebar, /<span aria-hidden="true" className=\{cn\("ml-auto size-2 shrink-0 rounded-full bg-sidebar-dot"/)
  assert.match(sidebar, /<span className="sr-only">\{item\.attention\}<\/span>/)
  assert.doesNotMatch(sidebar, /formatCount|\.total\b|99\+/)
  for (const [locale, text] of [["th", "มีงานรอคุณ {count} รายการ"], ["en", "{count, plural, one {# item waits for you} other {# items wait for you}}"]]) {
    assert.equal(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).nav.workCenterWaiting, text)
  }
})

test("the person sits pinned at the foot of the desktop menu and opens the account menu (spec §6.2)", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.match(sidebar, /<nav aria-label=\{t\("mainNavigation"\)\} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">/)
  assert.match(sidebar, /\{mobile \? null : <SidebarAccount user=\{user\} account=\{account\} collapsed=\{bodyCollapsed\} \/>\}/)
  const account = read("src/components/layout/sidebar-account.tsx")
  assert.match(account, /export function SidebarAccount\(\{ user, account, collapsed \}: \{ user: SessionUser; account: ShellAccount; collapsed: boolean \}\)/)
  assert.match(account, /<DropdownMenuTrigger asChild>\s*<Button\s+variant="ghost"/)
  assert.doesNotMatch(account, /<button\b|text-white|bg-white|(?:aria-label|title)="[A-Z]/)
  assert.match(account, /<div className="flex shrink-0 justify-center border-t border-sidebar-border p-2">/)
  assert.match(account, /getUserInitial\(user\)[\s\S]*account\.roleLabel[\s\S]*<ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-sidebar-muted" \/>/)
  assert.match(account, /aria-label=\{collapsed \? tNav\("userMenu", \{ name: displayName \}\) : undefined\}/)
  assert.match(account, /focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar/)
  assert.match(account, /getUserSecondaryLabel\(user\)/)
  assert.match(account, /<DropdownMenuItem variant="destructive" onSelect=\{\(\) => void signOut\(\{ callbackUrl: `\/\$\{locale\}\/login` \}\)\}>/)
})

test("a long Thai name and role stay on one line each, cut short, the full text still the button's name; the rail shows the initial only (Review Focus F5)", () => {
  const longRole = "ผู้ดูแลระบบทรัพย์สิน".repeat(4)
  assert.ok(longRole.length >= 60)
  assert.equal(getUserRoleLabel([{ displayName: "Asset Admin", displayNameTh: longRole }], "th"), longRole)
  const account = read("src/components/layout/sidebar-account.tsx")
  assert.match(account, /\{collapsed \? null : \(/)
  assert.match(account, /<span className="flex min-w-0 flex-1 flex-col">\s*<span className="truncate text-sm font-medium text-sidebar-active-foreground">\{displayName\}<\/span>/)
  assert.match(account, /\{account\.roleLabel \? <span className="truncate text-xs text-sidebar-muted">\{account\.roleLabel\}<\/span> : null\}/)
  assert.match(account, /"h-auto min-h-12 w-full min-w-0 /)
})

test("the dashboard layout reads the role and department once and hands them to the shell", () => {
  const layout = read("src/app/[locale]/(dashboard)/layout.tsx")
  assert.match(layout, /const account = await getShellAccount\(user, locale\)/)
  assert.match(layout, /<DashboardShell user=\{user\} account=\{account\}>/)
  const server = read("src/lib/shell-account.ts")
  assert.match(server, /displayNameTh: true/)
  assert.match(server, /isActive: true/)
  assert.match(server, /department: \{ select: \{ name: true \} \}/)
  assert.match(server, /getUserRoleLabel\(/)
  assert.match(server, /catch[\s\S]*?roleLabel: null, departmentLabel: null/)
  assert.match(read("src/components/layout/dashboard-shell.tsx"), /<Sidebar[\s\S]*?account=\{account\}/)
})
```
- [ ] **Step 2: Run the tests and see them fail.** Run `node --test tests/sidebar-menu-b.test.ts`. All of them fail on the import, because `getUserRoleLabel` is not exported yet. Once it exists, the source tests fail on their regexes: the old `rowClasses`, no `useShellNotifications`, and no `sidebar-account.tsx`.
- [ ] **Step 3: Add the message.** Pass a change file from your scratchpad to `node scripts/messages-edit.mjs`: `{ "set": { "th": { "nav.workCenterWaiting": "มีงานรอคุณ {count} รายการ" }, "en": { "nav.workCenterWaiting": "{count, plural, one {# item waits for you} other {# items wait for you}}" } } }`
- [ ] **Step 4: Write the data side.**
  - `shell-account.ts`: one try/catch around `prisma.user.findUnique({ where: { id: user.id }, select: { userRoles: { select: { role: { select: { displayName: true, displayNameTh: true, isActive: true } } }, orderBy: { role: { name: "asc" } } }, employee: { select: { department: { select: { name: true } } } } } })`.
  - Layout: after the `!user` redirect, the two pinned lines.
  - Shell: pass `account` through to `<Sidebar>`.
- [ ] **Step 5: Change `sidebar.tsx`.**
  - Use the pinned `rowClasses`, `activeRowClasses`, brand row, aside and nav. Keep the ring-offset comment.
  - `SidebarLink` uses `isActive && activeRowClasses`.
  - The drawer's close `Button` gets `className="ml-auto text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-active-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar"`.
  - The drawer's `SheetContent` gets `"w-[min(18rem,85vw)] gap-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground scheme-dark lg:hidden"`.
  - Section heading: change `px-3` to `px-2.5`.
  - Put `<SidebarAccount …/>` directly after `</nav>`.
  - In the group title, `open && "font-semibold text-sidebar-active-foreground"` replaces `containsActive && "font-semibold"`.
  - In `SidebarLink`, after the label: `{item.attention ? (<><span aria-hidden="true" className={cn("ml-auto size-2 shrink-0 rounded-full bg-sidebar-dot", collapsed && "lg:absolute lg:right-1 lg:top-1 lg:ml-0")} /><span className="sr-only">{item.attention}</span></>) : null}`
- [ ] **Step 6: Write `sidebar-account.tsx`** (`"use client"`).
  - Trigger: `<DropdownMenuTrigger asChild><Button variant="ghost" size={collapsed ? "icon" : "md"} aria-label={…pinned} className={…}>`. The className:
    - expanded: `"h-auto min-h-12 w-full min-w-0 justify-start gap-2.5 px-2.5 py-2 text-left font-normal text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground active:bg-sidebar-hover data-[state=open]:bg-sidebar-hover focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar md:h-auto md:min-h-12"`
    - rail: `"rounded-full p-0 hover:bg-sidebar-hover active:bg-sidebar-hover data-[state=open]:bg-sidebar-hover focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar md:size-10"`
  - Initial: `<span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-sm font-semibold text-sidebar-active-foreground">{getUserInitial(user)}</span>`. Then the pinned `{collapsed ? null : (<>text column, ChevronsUpDown</>)}`.
  - Menu: `<DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} className="w-[calc(100vw-2rem)] max-w-[16rem]">`. Copy the label, the separator and the sign-out item (`LogOut`, `tAuth("logout")`) from the topbar's `{/* User Menu */}` block. The label holds `displayName`, then `getUserSecondaryLabel(user)` when it is non-empty.
- [ ] **Step 7: Update the existing pins.**
  - `tests/dashboard-shell-theme.test.ts`, first test (Task 1 retitled it): add `assert.match(source, /shadow-\[inset_3px_0_0_var\(--sidebar-active-bar\)\]/)` and `assert.match(source, /focus-visible:ring-sidebar-ring/)`.
  - `tests/shell-sweep-ui.test.ts:29` becomes `/<Button variant="ghost" size="icon" onClick=\{onMobileClose\} className="ml-auto text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-active-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar" aria-label=\{t\("closeMenu"\)\}>\n\s+<X aria-hidden="true" \/>\n\s+<\/Button>/`. The `<button\b` count stays 1.
  - `tests/dashboard-layout-scroll.test.ts:9` becomes `/<DashboardShell user=\{user\} account=\{account\}>/`.
  - These need no edit and must stay green: `dark-mode-t:121-122`, `dark-mode-p:143,173` (19 images), `sidebar-menu-structure`, N3 in `visual-foundation-guards` (sidebar count 1), `list-frame-guards:120`, `dropdown-menus-ui:45-66`.
- [ ] **Step 8: Verify.**
  - `node --test tests/sidebar-menu-b.test.ts tests/dashboard-shell-theme.test.ts tests/shell-sweep-ui.test.ts tests/dashboard-layout-scroll.test.ts tests/sidebar-menu-structure.test.ts tests/messages-parity.test.ts`: all pass.
  - Then `npm test` (all green), `npx tsc --noEmit -p .` (no output) and `npm run lint` (0 errors).
  - E2E impact: none, because no spec locates the menu. axe now checks the navy rows' contrast.
- [ ] **Step 9: Commit.**
```
git add src/components/layout/sidebar.tsx src/components/layout/sidebar-account.tsx src/components/layout/dashboard-shell.tsx "src/app/[locale]/(dashboard)/layout.tsx" src/lib/user-display.ts src/lib/shell-account.ts messages/th.json messages/en.json tests/sidebar-menu-b.test.ts tests/dashboard-shell-theme.test.ts tests/shell-sweep-ui.test.ts tests/dashboard-layout-scroll.test.ts
git commit -m "feat(shell): the navy desktop menu, the person at its foot and the work center dot (menu B shell task 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The collapsed rail (sidebar cookie, tooltips, aria-expanded, a group click expands)

**Files:**
- Create: `src/lib/sidebar-preference.ts`, `src/components/ui/tooltip.tsx`
- Modify: `src/app/[locale]/(dashboard)/layout.tsx`, `src/components/layout/dashboard-shell.tsx`, `src/components/layout/topbar.tsx` (the lucide import, the props, the `{/* Desktop sidebar toggle */}` button), `src/components/layout/sidebar.tsx`, `src/components/layout/sidebar-account.tsx`, `messages/th.json`, `messages/en.json`
- Test: `tests/sidebar-rail.test.ts`. Pins: `tests/sidebar-menu-b.test.ts`, `tests/dropdown-menus-ui.test.ts`, `tests/dark-mode-s.test.ts`, `tests/dashboard-layout-scroll.test.ts`

**Interfaces:**
- Consumes (Task 4): `rowClasses`, `activeRowClasses`, `SidebarAccount` (its `displayName`), `DashboardShell({ children, user, account })`, `getShellAccount(user, locale)`.
- Produces:
  - In `src/lib/sidebar-preference.ts`:
    - `export const SIDEBAR_COOKIE = "sidebar"`
    - `export type SidebarPreference = "collapsed" | "expanded"`
    - `export function parseSidebarPreference(value: string | undefined): SidebarPreference`
    - `export function sidebarCookieString(pref: SidebarPreference): string`
  - `DashboardShell({ children, user, account, initialSidebar }: { …; initialSidebar: SidebarPreference })`. Task 12a adds `sessionClock`.
  - `Sidebar` gains `onExpand: () => void`. `Topbar` gains `sidebarCollapsed: boolean`. The aside gets `id="desktop-primary-navigation"`.
  - In `src/components/ui/tooltip.tsx`: `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `LabelTooltip({ label, enabled = true, side = "right", children }: { label: string; enabled?: boolean; side?: "top" | "right" | "bottom" | "left"; children: React.ReactElement })`.
  - The messages `nav.collapseSidebar` and `nav.expandSidebar`; `nav.toggleSidebar` is deleted. Task 6 keeps the toggle's `aria-expanded`, `aria-controls`, icon and label as they are.

**Decisions:**
- Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` first. `cookies()` is async, and the layout is already dynamic through `auth()`.
- The cookie mirrors `theme`. Only an exact `"collapsed"` collapses the menu. The shell writes the cookie on every change, including a click on a rail group.
- `sidebar-preference.ts` mirrors `src/lib/theme.ts`: a header comment, no imports and no browser API.
- The rail never shows a group's children. Clicking a rail group expands the menu and opens that group. In the rail, a group's `aria-expanded` is `false`.
- In the rail, the group that holds the open page takes `activeRowClasses`, and its icon span takes `text-sidebar-active-icon`.
- `LabelTooltip` is always mounted and always controlled. This way a row keeps its element and its focus when the rail expands, and the expanded menu carries no `aria-describedby`.
- The tooltip uses the popover look (not the canvas's dark tooltip): `sideOffset = 8`, no arrow. The sidebar provider waits 300 ms; keyboard focus still opens a tooltip at once.
- `const railRowClasses = "lg:mx-auto lg:size-10 lg:justify-center lg:px-0"` replaces both occurrences of `collapsed && "lg:justify-center lg:px-2"`.
- The toggle stays `<Button variant="ghost" size="icon" … className="hidden lg:inline-flex">`.
- The `cookies()` guard in `dark-mode-s` becomes an allowed list. If Task 11 calls `cookies()`, it adds its own file to that list.

- [ ] **Step 1: Write the failing tests.** `tests/sidebar-rail.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { SIDEBAR_COOKIE, parseSidebarPreference, sidebarCookieString } from "../src/lib/sidebar-preference.ts"
const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")

test("the sidebar cookie holds collapsed or expanded for a year; anything else is expanded (spec §6.2)", () => {
  assert.equal(SIDEBAR_COOKIE, "sidebar")
  assert.equal(parseSidebarPreference("collapsed"), "collapsed")
  for (const value of [undefined, "", "expanded", "Collapsed", " collapsed", "collapsed;", "true"]) assert.equal(parseSidebarPreference(value), "expanded", String(value))
  assert.equal(sidebarCookieString("collapsed"), "sidebar=collapsed; Path=/; Max-Age=31536000; SameSite=Lax")
  assert.equal(sidebarCookieString("expanded"), "sidebar=expanded; Path=/; Max-Age=31536000; SameSite=Lax")
  assert.doesNotMatch(read("src/lib/sidebar-preference.ts"), /from "@\/|"use client"|\bdocument\.|\bwindow\./)
})

test("the server reads the cookie, so the first paint is right, and the shell writes it on each change", () => {
  const layout = read("src/app/[locale]/(dashboard)/layout.tsx")
  assert.match(layout, /^import \{ cookies \} from "next\/headers"$/m)
  assert.match(layout, /\nasync function readSidebarPreference\(\) \{\n  return parseSidebarPreference\(\(await cookies\(\)\)\.get\(SIDEBAR_COOKIE\)\?\.value\)\n\}\n/)
  assert.match(layout, /const \[account, initialSidebar\] = await Promise\.all\(\[getShellAccount\(user, locale\), readSidebarPreference\(\)\]\)/)
  assert.match(layout, /<DashboardShell user=\{user\} account=\{account\} initialSidebar=\{initialSidebar\}>/)
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /const \[sidebarCollapsed, setSidebarCollapsed\] = useState\(initialSidebar === "collapsed"\)/)
  assert.match(shell, /document\.cookie = sidebarCookieString\(next \? "collapsed" : "expanded"\)/)
  assert.match(shell, /sidebarCollapsed=\{sidebarCollapsed\}/)
  assert.match(shell, /onExpand=\{expandSidebar\}/)
})

test("the toggle says what it does and whether the menu is open (spec §6.2)", () => {
  const topbar = read("src/components/layout/topbar.tsx")
  assert.match(topbar, /const sidebarToggleLabel = tNav\(sidebarCollapsed \? "expandSidebar" : "collapseSidebar"\)/)
  assert.match(topbar, /aria-expanded=\{!sidebarCollapsed\}\s+aria-controls="desktop-primary-navigation"\s+title=\{sidebarToggleLabel\}\s+aria-label=\{sidebarToggleLabel\}/)
  assert.match(topbar, /\{sidebarCollapsed \? <PanelLeftOpen aria-hidden="true" className="size-5" \/> : <PanelLeftClose aria-hidden="true" className="size-5" \/>\}/)
  assert.doesNotMatch(topbar, /toggleSidebar/)
  for (const [locale, collapse, expand] of [["th", "ย่อเมนู", "ขยายเมนู"], ["en", "Collapse menu", "Expand menu"]]) {
    const nav = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).nav
    assert.equal(nav.collapseSidebar, collapse); assert.equal(nav.expandSidebar, expand); assert.equal(nav.toggleSidebar, undefined)
  }
})

test("rail icons name themselves on hover and focus; a group icon expands the menu and opens its group (spec §6.2)", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.match(sidebar, /id="desktop-primary-navigation"/)
  assert.match(sidebar, /<TooltipProvider delayDuration=\{300\}>\s*\{renderBody\(false\)\}\s*<\/TooltipProvider>/)
  assert.equal(sidebar.match(/<LabelTooltip label=\{t\(item\.labelKey\)\} enabled=\{collapsed\}>/g)?.length, 2, "the link and the group row")
  assert.match(sidebar, /if \(collapsed\) \{\s*setOpen\(true\)\s*onExpand\(\)\s*\} else setOpen\(!open\)/)
  assert.match(sidebar, /aria-expanded=\{expanded\}/)
  assert.match(sidebar, /const expanded = open && !collapsed/)
  assert.match(sidebar, /\{expanded && \(\s*<div className="mt-0\.5 ml-5 space-y-0\.5 border-l border-sidebar-border pl-1">/)
  assert.match(sidebar, /collapsed && containsActive && activeRowClasses/) // the open page stays marked in the rail
  assert.doesNotMatch(sidebar, /lg:ml-0 lg:border-l-0 lg:pl-0/)
  assert.match(read("src/components/layout/sidebar-account.tsx"), /<LabelTooltip label=\{displayName\} enabled=\{collapsed\}>\s*<DropdownMenuTrigger asChild>/)
  const tooltip = read("src/components/ui/tooltip.tsx")
  assert.match(tooltip, /import \{ Tooltip as TooltipPrimitive \} from "radix-ui"/)
  assert.match(tooltip, /<TooltipPrimitive\.Portal>/)
  assert.match(tooltip, /"z-50 [^"]*rounded-md border border-border bg-popover px-2\.5 py-1\.5 text-meta text-popover-foreground shadow-overlay [^"]*motion-reduce:animate-none!"/)
  assert.match(tooltip, /<Tooltip open=\{enabled && open\} onOpenChange=\{setOpen\}>/)
})
```
- [ ] **Step 2: Run the tests and see them fail.** Run `node --test tests/sidebar-rail.test.ts`. It fails with `Cannot find module '../src/lib/sidebar-preference.ts'`. After that module exists, the tests fail on `useState(false)`, `toggleSidebar` and the missing tooltip.
- [ ] **Step 3: Change the messages.** Pass this change file to `node scripts/messages-edit.mjs`: `{ "set": { "th": { "nav.collapseSidebar": "ย่อเมนู", "nav.expandSidebar": "ขยายเมนู" }, "en": { "nav.collapseSidebar": "Collapse menu", "nav.expandSidebar": "Expand menu" } }, "delete": ["nav.toggleSidebar"] }`
- [ ] **Step 4: Write the cookie module and wire the layout, shell and toggle.**
  - Layout: import `cookies` and the two names from `@/lib/sidebar-preference`. Add the pinned module-level `readSidebarPreference()`, the `Promise.all` and the prop.
  - Shell: add `changeSidebarCollapsed = useCallback((next: boolean) => { setSidebarCollapsed(next); document.cookie = sidebarCookieString(next ? "collapsed" : "expanded") }, [])` and `expandSidebar = useCallback(() => changeSidebarCollapsed(false), [changeSidebarCollapsed])`. Topbar gets `sidebarCollapsed` and `onToggleSidebar={() => changeSidebarCollapsed(!sidebarCollapsed)}`.
  - Topbar: import `PanelLeftOpen`. After `onClick={onToggleSidebar} className="hidden lg:inline-flex"`, add the four pinned attributes in order and the icon switch.
- [ ] **Step 5: Write `tooltip.tsx`** (`"use client"`, `import * as React from "react"`).
  - Use the shadcn shape: `TooltipProvider` (default `delayDuration = 0`), `Tooltip` (a bare Root, with no provider of its own, so the sidebar's `delayDuration={300}` applies), `TooltipTrigger`, and `TooltipContent` (Portal + Content).
  - Content class: `"z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-md border border-border bg-popover px-2.5 py-1.5 text-meta text-popover-foreground shadow-overlay animate-in fade-in-0 duration-160 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100 motion-reduce:animate-none!"`
  - `LabelTooltip`: `const [open, setOpen] = React.useState(false)`, then `<Tooltip open={enabled && open} onOpenChange={setOpen}><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent side={side}>{label}</TooltipContent></Tooltip>`.
- [ ] **Step 6: Change `sidebar.tsx` and `sidebar-account.tsx`.**
  - Aside: add the pinned id and `TooltipProvider`. Wrap the phone drawer's `renderBody(true)` in the same `<TooltipProvider delayDuration={300}>`: a Radix Tooltip Root throws without a provider, and the drawer stays in use until Task 9.
  - `SidebarItemProps` gains `onExpand`. Thread it from `Sidebar` through `SidebarItem` to the children.
  - `SidebarLink`: the pinned `LabelTooltip` around the `Link`, and `collapsed && railRowClasses`.
  - `SidebarGroup`:
    - the pinned `LabelTooltip` around the button
    - `expanded`, `aria-expanded` and the click, as pinned
    - classes: `expanded && "font-semibold text-sidebar-active-foreground"`, `collapsed && railRowClasses`, `collapsed && containsActive && activeRowClasses`
    - children render only when `expanded`, with the plain guide-line class
  - `sidebar-account.tsx`: wrap `DropdownMenuTrigger` in the pinned `LabelTooltip`.
- [ ] **Step 7: Update the existing pins.**
  - `tests/sidebar-menu-b.test.ts` (from Task 4) changes three pins:
    - `/open && "font-semibold text-sidebar-active-foreground"/` becomes `/expanded && "font-semibold text-sidebar-active-foreground"/`.
    - In the layout test, `/const account = await getShellAccount\(user, locale\)/` becomes `/getShellAccount\(user, locale\)/`.
    - Also in the layout test, `/<DashboardShell user=\{user\} account=\{account\}>/` becomes `/<DashboardShell user=\{user\} account=\{account\}[ >]/`. That form also holds after Task 12a.
  - `tests/dropdown-menus-ui.test.ts:61`: the key list becomes `["openMenu", "closeMenu", "collapseSidebar", "expandSidebar", "languageMenu", "userMenu"]`.
  - `tests/dark-mode-s.test.ts:103-110`:
    - Drop `|\bcookies\(\)` from the theme regex. That regex still allows only `themeAware`.
    - Add `// the dashboard layout reads only the sidebar cookie (menu B shell §6.2)` and `assert.deepEqual(findMatches(readSourceFiles("src"), /\bcookies\(\)/g, (path) => [...themeAware, "src/app/[locale]/(dashboard)/layout.tsx"].includes(path)), [])`.
  - `tests/dashboard-layout-scroll.test.ts:9` becomes `/<DashboardShell user=\{user\} account=\{account\} initialSidebar=\{initialSidebar\}>/`. Task 12a sets its final form.
  - These need no edit and must stay green: `shell-sweep-ui:16`, `mobile-field-navigation-ui:55`, `sheet-drawers-ui:52` (`hidden` before `lg:flex`), `sidebar-menu-structure:81`, `ui-overlay-guards`.
- [ ] **Step 8: Verify.**
  - `node --test tests/sidebar-rail.test.ts tests/sidebar-menu-b.test.ts tests/dropdown-menus-ui.test.ts tests/dark-mode-s.test.ts tests/dashboard-layout-scroll.test.ts tests/ui-overlay-guards.test.ts tests/messages-parity.test.ts`: all pass.
  - Then `npm test`, `npx tsc --noEmit -p .` and `npm run lint` (0 errors).
  - E2E impact: no spec sets the `sidebar` cookie, so runs show the expanded menu. Task 13A adds the rail check.
- [ ] **Step 9: Commit.**
```
git add src/lib/sidebar-preference.ts src/components/ui/tooltip.tsx "src/app/[locale]/(dashboard)/layout.tsx" src/components/layout/dashboard-shell.tsx src/components/layout/topbar.tsx src/components/layout/sidebar.tsx src/components/layout/sidebar-account.tsx messages/th.json messages/en.json tests/sidebar-rail.test.ts tests/sidebar-menu-b.test.ts tests/dropdown-menus-ui.test.ts tests/dark-mode-s.test.ts tests/dashboard-layout-scroll.test.ts
git commit -m "feat(shell): the collapsed rail remembers itself in a sidebar cookie, names its icons and expands from a group (menu B shell task 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The 56px top bar, skip link and the shell's top edge

**Files:**
- Modify (tasks 1, 3, 4, 5 edit these first; anchor by content): `src/components/layout/topbar.tsx` (the `<header className="flex h-16 …">`, the scan `<Link>` to `asset-management/scan`, the wrapper under `{/* User Menu */}`), `src/components/layout/dashboard-shell.tsx` (`scrollMainToHash`'s guard, the shell `<div ref={shellRef}>`, `<main ref={mainRef} …>`)
- Modify: `src/app/globals.css` (append at the end of the file), `src/components/ui/app-toaster.tsx`, `src/components/audit/audit-scan-check-panel.tsx:41-43`, `src/app/[locale]/(dashboard)/access-denied/page.tsx:28`, `src/app/[locale]/(dashboard)/error.tsx:23`, `DESIGN.md` (the **Toasts** bullet), `messages/th.json`, `messages/en.json`
- Test: Create `tests/menu-b-shell-topbar.test.ts`; existing pins in Step 4

**Interfaces:**
- Consumes: Task 1's header classes `border-b border-chrome-border bg-chrome`; Task 4's `SidebarAccount` (desktop sign-out); Task 5's toggle (leave as is).
- Produces: on `:root` `--shell-topbar: 3.5rem`, `--shell-banner: 0px` (Task 10's `ShellBanner` overwrites it on `document.documentElement`), `--shell-top: calc(var(--shell-topbar) + var(--shell-banner))`; `<main ref={mainRef} id="main" tabIndex={-1} data-dashboard-main>`; message `nav.skipToContent`; the order-test markers `{/* Notifications */}` and `{/* User Menu */}`.

**Decisions:**
- No `scroll-padding-top`: only `<main>` scrolls (shell `fixed inset-0`) and the bar and banner sit above it. `--shell-top` is for what the viewport frames (toasts, `100dvh` heights); `main` gets only `scroll-padding-bottom` for the phone bottom bar.
- Offsets measured from main's top stay (`sticky top-0`/`-top-4`/`top-4`/`lg:top-4`/`xl:top-20`, `-bottom-4`, `anchorOffset = 96`, `scroll-mt-*`), as do the `5.25rem` bottom-bar paddings, `asset-label-print.tsx:330` and content-size `h-16`/`min-h-16`.
- The shell `:root` block is separate and unlayered: the token tests read the first `:root` as the token list, and `tests/dark-mode-t.test.ts:107` reads the last `@layer base {`.
- The user menu is hidden at `lg` only (`lg:hidden`); Task 9 deletes it with its pins (`tests/dropdown-menus-ui.test.ts:47,55,61-65`, `tests/shell-sweep-ui.test.ts:15,20`, `tests/dark-mode-s.test.ts:99`, the `{/* User Menu */}` marker). Task 7 replaces the `{/* Notifications */}` marker when it moves the bell into `NotificationBell`.
- The scan icon keeps the `outline` variant (`size: "icon"`), an action beside the ghost bell and theme icons.
- The skip link handles its own click: a native hash jump fires `hashchange`, scrolls main up 96px and leaves `#main` in the URL. `scrollMainToHash` also ignores `target === main`.

- [ ] **Step 1: Write the failing tests** in `tests/menu-b-shell-topbar.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readRootTokens } from "../src/lib/color-contrast.ts"
import { findMatches, readSourceFiles } from "./helpers/source-files.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")
const L = "src/components/layout/"

test("the top bar is 56px, the same as --shell-topbar, and --shell-top adds the banner region (menu B shell §6.3, §6.7)", () => {
  assert.match(read(`${L}topbar.tsx`), /<header className="flex h-14 max-w-full shrink-0 items-center justify-between gap-1 border-b border-chrome-border bg-chrome px-3 sm:gap-2 sm:px-4">/)
  const css = read("src/app/globals.css")
  assert.match(css, /\n:root \{\n  --shell-topbar: 3\.5rem;\n  --shell-banner: 0px;\n  --shell-top: calc\(var\(--shell-topbar\) \+ var\(--shell-banner\)\);\n\}\n/)
  assert.equal(readRootTokens(css)["shell-top"], undefined, "a layout value outside the token block")
})

test("the top bar's right side reads scan (an icon), bell, language, theme; the user menu leaves the desktop (§6.3)", () => {
  const topbar = read(`${L}topbar.tsx`)
  assert.match(topbar, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "icon" \}\), "hidden lg:inline-flex"\)\}/)
  assert.match(topbar, /<ScanLine aria-hidden="true" className="size-5" \/>\n\s+<\/Link>/)
  assert.doesNotMatch(topbar, /xl:inline/)
  const at = ["asset-management/scan", "{/* Notifications */}", "<DropdownMenuRadioGroup", "<ThemeToggle />", "{/* User Menu */}"].map((m) => topbar.indexOf(m))
  assert.ok(at.every((v, i) => v > 0 && (i === 0 || v > at[i - 1])), `order ${at}`)
  assert.match(topbar, /\{\/\* User Menu \*\/\}\n\s+<div className="relative shrink-0 lg:hidden">/)
})

test("a skip link comes first in the shell and moves focus to <main id=\"main\"> without changing the URL (§6.9)", () => {
  const shell = read(`${L}dashboard-shell.tsx`)
  assert.ok(shell.indexOf('href="#main"') > 0 && shell.indexOf('href="#main"') < shell.indexOf("<Sidebar"))
  assert.match(shell, /<a\s+href="#main"\s+onClick=\{skipToMain\}\s+className="sr-only focus:not-sr-only focus:fixed [^"]*"\s*>\s*\{tNav\("skipToContent"\)\}\s*<\/a>/)
  assert.match(shell, /event\.preventDefault\(\)\s+mainRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
  assert.match(shell, /<main\s+ref=\{mainRef\}\s+id="main"\s+tabIndex=\{-1\}\s+data-dashboard-main/)
  assert.match(shell, /"min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 outline-none sm:px-6 sm:py-6"/)
  assert.match(shell, /if \(!target \|\| target === main \|\| !main\.contains\(target\)\) return/)
  for (const [locale, text] of [["th", "ข้ามไปเนื้อหาหลัก"], ["en", "Skip to main content"]]) {
    assert.equal(JSON.parse(read(`messages/${locale}.json`)).nav.skipToContent, text, locale)
  }
})

test("main keeps what scrolls into view above the phone bottom bar (§6.9)", () => {
  assert.match(read(`${L}dashboard-shell.tsx`), /mobileFieldNavigationVisible && "scroll-pb-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\] lg:scroll-pb-0"/)
})

test("what is placed against the viewport starts under --shell-top; nothing in src still assumes the 64px bar (§6.3)", () => {
  const toaster = read("src/components/ui/app-toaster.tsx")
  assert.match(toaster, /const toasterTop = "calc\(var\(--shell-top\) \+ 8px\)"/)
  assert.match(toaster, /offset=\{\{ top: toasterTop, right: 16 \}\}/)
  assert.match(toaster, /mobileOffset=\{\{ top: toasterTop \}\}/)
  assert.match(read("src/components/audit/audit-scan-check-panel.tsx"), /"sticky top-4 flex max-h-\[calc\(100dvh_-_var\(--shell-top\)_-_3rem\)\] flex-col self-start"/)
  for (const page of ["src/app/[locale]/(dashboard)/access-denied/page.tsx", "src/app/[locale]/(dashboard)/error.tsx"]) {
    assert.match(read(page), /className="flex min-h-\[calc\(100dvh_-_var\(--shell-top\)_-_4rem\)\] items-center justify-center"/, page)
  }
  assert.deepEqual(findMatches(readSourceFiles("src"), /100dvh-[78]rem|\btop: 72\b|<header className="flex h-16/g), [])
})
```

- [ ] **Step 2: Run them and see them fail.** `node --test tests/menu-b-shell-topbar.test.ts`: all five fail (`h-16`, no shell `:root` block, scan `size: "md"` with an `xl:inline` label, no `href="#main"`, `nav.skipToContent` undefined, the old offsets).

- [ ] **Step 3: Implement**
  - `globals.css`, at the end: `/* The shell's top edge (menu B): the 56px top bar plus the banner region (ShellBanner writes --shell-banner). */` then the `:root { --shell-topbar: 3.5rem; --shell-banner: 0px; --shell-top: calc(var(--shell-topbar) + var(--shell-banner)); }` block, one declaration per line, two-space indent (as the test pins).
  - `topbar.tsx`: header `h-16` → `h-14` only. Scan link: the test's `className`, `title`/`aria-label` `tAssetTools("globalScanShortcut")` kept, the only child `<ScanLine aria-hidden="true" className="size-5" />`. `{/* User Menu */}` stays directly after `<ThemeToggle />`; its wrapper becomes `<div className="relative shrink-0 lg:hidden">`.
  - `dashboard-shell.tsx`: `const tNav = useTranslations("nav")` (`next-intl`); `const skipToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {` with `event.preventDefault()` and `mainRef.current?.focus({ preventScroll: true })` on separate lines, no semicolons. First child of the shell `<div>`, before `<Sidebar`: `<a href="#main" onClick={skipToMain} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-overlay">{tNav("skipToContent")}</a>`. `<main ref={mainRef} id="main" tabIndex={-1} data-dashboard-main className={cn("<the pinned class>", mobileFieldNavigationVisible && "<the pinned scroll-pb>")}>` (`outline-none` per `visual-foundation-guards.test.ts:32`).
  - `app-toaster.tsx`: `toasterTop` as pinned (sonner 2.0.7 passes string offsets through as CSS); doc comment "8px under the shell's top edge (--shell-top)".
  - `audit-scan-check-panel.tsx`, `access-denied/page.tsx`, `error.tsx`: the pinned classes; the panel comment: "--shell-top + sticky gap 1rem + bottom padding 1.5rem, rounded up to 3rem".
  - `DESIGN.md` Toasts bullet: "below the 64px topbar (top 72px, right 16px; phones top 72px)" → "8px under `--shell-top` (the 56px top bar plus the banner region), right 16px, the same on phones".
  - Messages (change file in the scratchpad, `node scripts/messages-edit.mjs <file>`):
    ```json
    { "set": { "th": { "nav.skipToContent": "ข้ามไปเนื้อหาหลัก" }, "en": { "nav.skipToContent": "Skip to main content" } } }
    ```
  - E2E impact: no spec edited; axe in every `measure.visit` covers the skip link and `main#main`; toasts move by position only.

- [ ] **Step 4: Update existing pins**
  - `tests/dark-mode-s.test.ts:120` header pin: `h-16` → `h-14` (with Task 1's `border-chrome-border bg-chrome`).
  - `tests/shell-sweep-ui.test.ts:16`: `size: "md"` → `size: "icon"` (lines 15 and 20 still hold below `lg`).
  - `tests/feedback-states-ui.test.ts:50-51`: `/offset=\{\{ top: toasterTop, right: 16 \}\}/` (message "8px under --shell-top") and `/mobileOffset=\{\{ top: toasterTop \}\}/`.
  - `tests/audit-scan-check-ui.test.ts:71`, `tests/audit-scan-sweep-ui.test.ts:81`: `100dvh-7rem` → `100dvh_-_var\(--shell-top\)_-_3rem`.
  - `tests/dashboard-layout-scroll.test.ts:12` → `/<main[^>]*className=\{cn\("[^"]*overflow-y-auto/`.
  - Still pass unchanged: `dark-mode-s.test.ts:99`, `dropdown-menus-ui.test.ts:45-66`, `mobile-field-navigation-ui.test.ts:51-58`, `dashboard-layout-scroll.test.ts:25`, `v-track-f.test.ts:125`.

- [ ] **Step 5: Verify.** `node --test tests/menu-b-shell-topbar.test.ts tests/dark-mode-s.test.ts tests/dark-mode-t.test.ts tests/shell-sweep-ui.test.ts tests/feedback-states-ui.test.ts tests/audit-scan-check-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/dashboard-layout-scroll.test.ts tests/visual-foundation-guards.test.ts tests/design-tokens-contrast.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`, then `npm test`, `npx tsc --noEmit -p .`, `npm run lint`: all pass, 0 lint errors.

- [ ] **Step 6: Commit**
```
git add src/components/layout/topbar.tsx src/components/layout/dashboard-shell.tsx src/app/globals.css src/components/ui/app-toaster.tsx src/components/audit/audit-scan-check-panel.tsx "src/app/[locale]/(dashboard)/access-denied/page.tsx" "src/app/[locale]/(dashboard)/error.tsx" DESIGN.md messages/th.json messages/en.json tests/menu-b-shell-topbar.test.ts tests/dark-mode-s.test.ts tests/shell-sweep-ui.test.ts tests/feedback-states-ui.test.ts tests/audit-scan-check-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/dashboard-layout-scroll.test.ts
git commit -m "feat(shell): a 56px top bar with the scan icon and no desktop user menu, a skip link to main, and --shell-top for what sits under the bar (menu B shell task 6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The bell box

**Files:**
- Create: `src/components/layout/notification-bell.tsx`, `tests/notification-bell.test.ts`
- Modify: `src/components/layout/topbar.tsx` (Tasks 3 and 6 edit it first: find the `{/* Notifications */}` block and the bell's imports, state, `canOpenWorkCenter` and click handler by name); `src/lib/notification-groups.ts` (Task 2's); `messages/th.json`, `messages/en.json`
- Test: the pins in Step 4

**Interfaces:**
- Consumes: Task 2 `groupNotificationItems<T extends { key: string }>(items: T[]): { decide: T[]; follow: T[] }`. Task 3 `useShellNotifications(): { summary: NotificationClientSummary | null; refresh(): Promise<void>; markRead(key: string): Promise<boolean>; markAllRead(): Promise<boolean> }` (`false` = the save failed, summary unchanged); `NotificationClientSummary = { total: number; items: NotificationClientItem[]; generatedAt: string }` (`total` = unread total, `items` = every row), `NotificationClientItem = NotificationSummaryItem & { isRead: boolean; isSnoozed: boolean; isSuppressed: boolean }` and `isPlainPrimaryClick` in `src/lib/notification-client-sync.ts`. Task 6: the right group and the order markers in `tests/menu-b-shell-topbar.test.ts`.
- Produces: `NotificationBell({ user }: { user: SessionUser }): JSX.Element` (Task 9 reuses it on the phone; Task 13A finds a button and a dialog named "การแจ้งเตือน"). In `notification-groups.ts`: `getNotificationRowState(item: { isRead?: boolean; isSnoozed?: boolean }): "unread" | "read" | "snoozed"`; `getNotificationBellNameKey(summary: { total: number; items: readonly unknown[] } | null): "bellLabel" | "bellEmpty" | "title"`; `getNotificationHeaderAction(summary: { total: number; items: readonly unknown[] } | null): "markAllRead" | "allRead" | null`. Keys `notifications.bellLabel`, `bellEmpty`, `bellEmptyDetail`, `groupDecide`, `groupFollow`, `markAllRead`, `allRead`, `updatedAt`.

**Decisions:**
- No server file or client type changes: the GET shape is Task 3's. The bell lists every row; Task 3's temporary `!item.isSuppressed` filter leaves with the top bar block.
- Read wins over snoozed. Read and snoozed rows dim by ink, never opacity: marker `muted`, title `text-muted-foreground`, detail `text-faint-foreground`, pill = the existing `notifications.read` ("อ่านแล้ว"; no `readPill` key) or `notifications.snoozed`. Unread: marker `item.tone`, title `text-foreground`, detail `text-muted-foreground`.
- Name: unread > 0 → `bellLabel`; rows but none unread, or not loaded → the existing `title` "การแจ้งเตือน"; no rows → `bellEmpty`. Header: unread > 0 → the "อ่านแล้วทั้งหมด" button; rows, none unread → "อ่านครบแล้ว" as `text-meta text-muted-foreground` text; else nothing.
- `markAllRead()` `true` → focus the box title; `false` → `toast.error(tNotifications("saveFailed"))`. A row click marks only an unread row (snoozed stays snoozed); `false` toasts too; navigation runs in `finally`.
- `canOpenWorkCenter = hasNavigationPermission(user, { module: "dashboard", action: "view" })` and the foot links move into the bell; the top bar has no `/work-center` link. `openNotificationCenter` becomes "เปิดศูนย์แจ้งเตือน" (spec §6.4); `notifications.subtitle` is deleted.
- The top bar keeps `<div className="relative shrink-0">` around `<NotificationBell user={user} />` (Task 9 sets its classes); the `{/* Notifications */}` comment goes.

- [ ] **Step 1: Write the failing tests** — `tests/notification-bell.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getNotificationBellNameKey, getNotificationHeaderAction, getNotificationRowState } from "../src/lib/notification-groups.ts"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")

test("a row is unread, read or snoozed; the bell's name and header follow the unread total (menu B shell task 7)", () => {
  assert.equal(getNotificationRowState({}), "unread"); assert.equal(getNotificationRowState({ isRead: true }), "read")
  assert.equal(getNotificationRowState({ isSnoozed: true }), "snoozed"); assert.equal(getNotificationRowState({ isRead: true, isSnoozed: true }), "read")
  assert.equal(getNotificationBellNameKey(null), "title"); assert.equal(getNotificationBellNameKey({ total: 0, items: [] }), "bellEmpty")
  assert.equal(getNotificationBellNameKey({ total: 0, items: [{}] }), "title"); assert.equal(getNotificationBellNameKey({ total: 4, items: [{}] }), "bellLabel")
  assert.equal(getNotificationHeaderAction(null), null); assert.equal(getNotificationHeaderAction({ total: 0, items: [] }), null)
  assert.equal(getNotificationHeaderAction({ total: 0, items: [{}] }), "allRead"); assert.equal(getNotificationHeaderAction({ total: 2, items: [{}] }), "markAllRead")
})

test("the bell reads the shell context, names its count, lists every row in two groups and dims read rows by ink (menu B shell task 7)", () => {
  const bell = read("src/components/layout/notification-bell.tsx")
  assert.match(bell, /const \{ summary, markRead, markAllRead \} = useShellNotifications\(\)/)
  assert.match(bell, /const total = summary\?\.total \?\? 0/); assert.match(bell, /const items = summary\?\.items \?\? \[\]/)
  assert.doesNotMatch(bell, /fetch\(|addEventListener\(|isSuppressed|readPill|\bopacity-/)
  assert.match(bell, /const bellName = tNotifications\(getNotificationBellNameKey\(summary\), \{ count: total \}\)/); assert.match(bell, /aria-label=\{bellName\}/)
  assert.match(bell, /<span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-danger-foreground">/)
  assert.match(bell, /\{total > 99 \? "99\+" : total\}/)
  assert.match(bell, /<PopoverContent align="end" className="w-\[calc\(100vw-2rem\)\] max-w-\[22rem\] p-0" aria-labelledby=\{titleId\}>/)
  assert.match(bell, /tabIndex=\{-1\} className="text-sm font-semibold text-foreground outline-none"/)
  assert.match(bell, /const \{ decide, follow \} = groupNotificationItems\(items\)/); assert.match(bell, /tNotifications\("groupDecide"\)[\s\S]*tNotifications\("groupFollow"\)/)
  assert.match(bell, /statusMarkerVariants\(\{ tone: rowState === "unread" \? item\.tone : "muted" \}\)/)
  assert.match(bell, /<StatusBadge label=\{tNotifications\("read"\)\} tone="muted" \/>/); assert.match(bell, /<StatusBadge label=\{tNotifications\("snoozed"\)\} tone="muted" \/>/)
  assert.match(bell, /<Button variant="ghost" size="sm" busy=\{markingAll\} onClick=\{\(\) => void handleMarkAllRead\(\)\}>\s*\{tNotifications\("markAllRead"\)\}/)
  assert.match(bell, /if \(await markAllRead\(\)\) titleRef\.current\?\.focus\(\)\s*else toast\.error\(tNotifications\("saveFailed"\)\)/)
  assert.match(bell, /tNotifications\("allRead"\)/); assert.match(bell, /tNotifications\("updatedAt", \{ time: /)
  assert.match(bell, /<ActionEmptyState icon=\{<CircleCheck \/>\} title=\{tNotifications\("bellEmpty"\)\} description=\{tNotifications\("bellEmptyDetail"\)\} \/>/)
  assert.match(bell, /if \(getNotificationRowState\(item\) === "unread" && !\(await markRead\(item\.key\)\)\) toast\.error\(tNotifications\("saveFailed"\)\)/)
  assert.match(bell, /finally\s*\{[\s\S]*router\.push\(item\.href\)/)
  const topbar = read("src/components/layout/topbar.tsx")
  assert.match(topbar, /<div className="relative shrink-0">\s*<NotificationBell user=\{user\} \/>\s*<\/div>/)
  assert.doesNotMatch(topbar, /useTranslations\("notifications"\)|PopoverContent|useShellNotifications|\/work-center|\{\/\* Notifications \*\/\}/)
})

test("bell messages (Thai per the glossary) (menu B shell task 7)", () => {
  const CHANGE = /* the Step 3 messages JSON, verbatim */
  for (const locale of ["th", "en"] as const) {
    const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).notifications
    for (const [key, value] of Object.entries(CHANGE.set[locale])) assert.equal(m[key.replace("notifications.", "")], value, `${locale} ${key}`)
    assert.equal(m.read, { th: "อ่านแล้ว", en: "Read" }[locale]); assert.equal(m.title, { th: "การแจ้งเตือน", en: "Notifications" }[locale])
    assert.equal(m.readPill, undefined); assert.equal(m.subtitle, undefined)
  }
})
```

- [ ] **Step 2: Run and see them fail.** `node --test tests/notification-bell.test.ts` → SyntaxError: `notification-groups.ts` has no export `getNotificationBellNameKey`; once the helpers exist, ENOENT for `notification-bell.tsx` and the `bellLabel` message mismatch.

- [ ] **Step 3: Implement.**
  - `notification-groups.ts`: the three helpers (no imports).
  - `notification-bell.tsx` (`"use client"`): `open`, `markingAll`, `titleRef`, `titleId = useId()`; `tCommon` for `common.loading`.
    - `<Popover open={open} onOpenChange={setOpen}>`; trigger `<Button variant="ghost" size="icon" className="relative" aria-label={bellName} title={bellName}>` with `<Bell aria-hidden="true" className="size-5" />` and the badge when `total > 0`.
    - Header `border-b border-border px-4 py-3`: the `h2` (`id={titleId} ref={titleRef}`) "การแจ้งเตือน"; under it, once loaded, `updatedAt` with `time` = `new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date(summary.generatedAt))`; the header action on the right.
    - Body `max-h-96 overflow-y-auto overscroll-contain p-2`: `summary === null` → `<EmptyNote className="px-3 py-3">{tCommon("loading")}</EmptyNote>`; no items → the empty state; else a `section` + `h3` per non-empty group.
    - Row `<Link className="flex items-start gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent">`: marker, title, ``…Detail`` line, right column `formatCount(item.count)` (`num font-semibold`) over the pill. The click keeps today's `isPlainPrimaryClick` → `preventDefault` → `try … finally { setOpen(false); router.push(item.href) }` shape.
    - Foot `grid gap-1 border-t border-border p-2`: today's two links verbatim, each closing the box.
  - `topbar.tsx`: the wrapper and `<NotificationBell user={user} />` replace the block; drop the bell's imports, state and handler, and `formatCount`, `EmptyNote`, `StatusBadge`, `Popover*`, `Bell`, `hasNavigationPermission` when unused.
  - Messages (a change file outside the repo, then `node scripts/messages-edit.mjs <file>`):

```json
{ "set": {
  "th": { "notifications.bellLabel": "การแจ้งเตือน {count} รายการ", "notifications.bellEmpty": "ไม่มีงานค้าง", "notifications.bellEmptyDetail": "งานที่รอคุณตัดสินหรือควรติดตามจะขึ้นที่นี่", "notifications.groupDecide": "รอคุณตัดสิน", "notifications.groupFollow": "ควรติดตาม", "notifications.markAllRead": "อ่านแล้วทั้งหมด", "notifications.allRead": "อ่านครบแล้ว", "notifications.updatedAt": "อัปเดต {time} น.", "notifications.openNotificationCenter": "เปิดศูนย์แจ้งเตือน" },
  "en": { "notifications.bellLabel": "Notifications, {count} waiting", "notifications.bellEmpty": "Nothing waiting", "notifications.bellEmptyDetail": "Work that waits for your decision or needs follow-up shows up here.", "notifications.groupDecide": "Waiting for your decision", "notifications.groupFollow": "Follow up", "notifications.markAllRead": "Mark all read", "notifications.allRead": "All read", "notifications.updatedAt": "Updated {time}", "notifications.openNotificationCenter": "Open Notification Center" } },
  "delete": ["notifications.subtitle"] }
```

- [ ] **Step 4: Update existing pins** (each moves from `topbar.tsx` to `notification-bell.tsx`):
  - `tests/notification-topbar-behavior.test.ts` (Task 3's two topbar tests): the helper reads `notification-bell.tsx`; `/const \{ summary: notificationSummary, markRead \} = useShellNotifications\(\)/` → `/const \{ summary, markRead, markAllRead \} = useShellNotifications\(\)/`; `/\{notificationTotal > 99 \? "99\+" : notificationTotal\}/` → `/\{total > 99 \? "99\+" : total\}/`. The no-fetch check, `isPlainPrimaryClick\(event\)`, `event\.preventDefault\(\)`, `await markRead\(item\.key\)` and `finally…router\.push` stay.
  - `tests/permission-aware-navigation.test.ts:112,122-123`: `topbar: readLf(".../topbar.tsx")` → `bell: readLf("src/components/layout/notification-bell.tsx")`; the `canOpenWorkCenter` and import asserts read `sources.bell`.
  - `tests/shell-sweep-ui.test.ts`: the `topbar.tsx` count of `<Button\s+variant="ghost"\s+size="icon"` 3 → 2 (`"menu and sidebar toggle"`); delete the `StatusBadge label=\{formatCount…` and `EmptyNote … tNotifications\("empty"\)` asserts.
  - `tests/dark-mode-p.test.ts:162-168` and `tests/visual-foundation-guards.test.ts:305`: read `notification-bell.tsx`; matches unchanged (badge class, no `text-white`, one status ink).
  - `tests/ui-overlay-guards.test.ts:20-32`: allowed path and filter prefix → `src/components/layout/notification-bell.tsx`; expected `["src/components/layout/notification-bell.tsx: text-danger-foreground"]`.
  - `tests/dropdown-menus-ui.test.ts:82-86`: read `notification-bell.tsx`; `/<Popover open=\{notificationOpen\} onOpenChange=/` → `/<Popover open=\{open\} onOpenChange=\{setOpen\}>/`; the `align="end"` match stays.
  - `tests/menu-b-shell-topbar.test.ts` (Task 6): marker `"{/* Notifications */}"` → `"<NotificationBell user={user} />"`.

- [ ] **Step 5: Verify.** `node --test tests/notification-bell.test.ts tests/notification-groups.test.ts` plus every Step 4 file, `tests/messages-parity.test.ts`, `tests/thai-glossary.test.ts` → all pass; then `npm test`, `npx tsc --noEmit -p .`, `npm run lint` → green, 0 lint errors.

- [ ] **Step 6: Commit.**

```
git add src/components/layout/notification-bell.tsx src/components/layout/topbar.tsx src/lib/notification-groups.ts messages/th.json messages/en.json tests/notification-bell.test.ts tests/notification-topbar-behavior.test.ts tests/permission-aware-navigation.test.ts tests/shell-sweep-ui.test.ts tests/dark-mode-p.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/dropdown-menus-ui.test.ts tests/menu-b-shell-topbar.test.ts
git commit -m "feat(shell): the bell box groups waiting work, keeps read rows dimmed and marks all read (menu B shell task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Search

**Files:**
- Create: `src/lib/global-search-panel.ts`, `src/lib/global-search-recent.ts`, `src/lib/search-highlight.ts`, `src/components/layout/mobile-search-sheet.tsx`, `tests/global-search-panel.test.ts`, `tests/global-search-recent.test.ts`
- Modify: `src/lib/global-search.ts`; `src/lib/asset-list-query.ts` (after `buildAssetWhere`); `src/app/api/search/route.ts` (`GET`, `label()`); `src/lib/audit-scan-session.ts` (`splitSearchHighlight`); `src/components/layout/global-search.tsx` (whole file); `src/components/layout/topbar.tsx` (Tasks 6-7 edit it first: `<GlobalSearch />` and the right group `<div className="flex shrink-0 items-center gap-1 sm:gap-2">`); `messages/th.json`, `messages/en.json`
- Test: add to `tests/global-search.test.ts`, `tests/asset-list-query.test.ts`, `tests/global-search-ui.test.ts`; pins in Step 4

**Interfaces:**
- Consumes: Task 6's top bar; `buildExactAssetRegisterHref(locale: string, params?: Record<string, string>): string` (`src/lib/asset-register-view-memory.ts`, no imports); `hasNavigationPermission(user, { module, action })`.
- Produces:
  - `assetSearchConditions(search: string): Prisma.AssetWhereInput[]` in `src/lib/asset-list-query.ts`: the 19 `contains` conditions of today's search-route asset query, in its order. `buildAssetWhere` uses `OR: assetSearchConditions(filters.search)`.
  - `buildAssetSearchWhere(search: string): Prisma.AssetWhereInput` = `buildAssetWhere(parseAssetListParams({ search }))`.
  - `global-search.ts`: `globalSearchMinChars = 2`; `globalSearchGroupOrder = ["asset","maintenance","audit","disposal","employee","location","supplier","company","branch"] as const`; `groupGlobalSearchResults<T extends { type: GlobalSearchResultType }>(results: T[]): Array<{ type: GlobalSearchResultType; results: T[] }>`; `type GlobalSearchResponse<T> = { results: T[]; scope: GlobalSearchScope; assetTotal: number | null }`.
  - `search-highlight.ts`: `splitSearchHighlight(value: string, term: string): [string, string, string] | null`.
  - `global-search-recent.ts`: `RECENT_SEARCH_LIMIT = 5`; `type RecentSearchItem = { type: GlobalSearchResultType; title: string; href: string }`; `recentSearchStorageKey(locale: string): string` (`asset-system:recent-search:v1:{locale}`); `parseRecentSearches(raw: string | null, locale: string): RecentSearchItem[]`; `addRecentSearch(list: RecentSearchItem[], item: RecentSearchItem): RecentSearchItem[]`; `readRecentSearches(getStorage: () => Pick<Storage, "getItem">, locale: string): RecentSearchItem[]`; `writeRecentSearches(getStorage: () => Pick<Storage, "setItem" | "removeItem">, locale: string, items: RecentSearchItem[]): boolean`.
  - `global-search-panel.ts`: `type GlobalSearchPanelState = "hint" | "minChars" | "loading" | "error" | "notFound" | "results"`; `getGlobalSearchPanelState(input: { query: string; settledQuery: string | null; resultCount: number; failed: boolean }): GlobalSearchPanelState`; `type GlobalSearchOption<T> = { kind: "result"; key: string; result: T } | { kind: "registerAll"; key: "registerAll"; href: string; count: number } | { kind: "recent"; key: string; item: RecentSearchItem } | { kind: "clearRecent"; key: "clearRecent" } | { kind: "action"; key: "scan" | "registerFilters" | "createAsset"; href: string }`; `type GlobalSearchSection<T> = { id: "recent" | "notFound" | GlobalSearchResultType; options: GlobalSearchOption<T>[] }`; `buildGlobalSearchSections<T extends { id: string; type: GlobalSearchResultType }>(input: { state: GlobalSearchPanelState; query: string; locale: string; results: T[]; assetTotal: number | null; recent: RecentSearchItem[]; canViewAssets: boolean; canCreateAssets: boolean }): GlobalSearchSection<T>[]`; `flattenGlobalSearchOptions<T>(sections: GlobalSearchSection<T>[]): GlobalSearchOption<T>[]`; `getGlobalSearchNotFoundActions(locale: string, access: { canViewAssets: boolean; canCreateAssets: boolean }): GlobalSearchOption<never>[]`; `isGlobalSearchShortcut(event: { key: string; code?: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; isComposing?: boolean; defaultPrevented?: boolean }, target: { tagName?: string; isContentEditable?: boolean; closest?: (selectors: string) => unknown } | null): boolean`.
  - `GlobalSearch({ variant = "bar", canViewAssets, canCreateAssets, onNavigate }: { variant?: "bar" | "sheet"; canViewAssets: boolean; canCreateAssets: boolean; onNavigate?: () => void })`; `MobileSearchSheet({ canViewAssets, canCreateAssets }: { canViewAssets: boolean; canCreateAssets: boolean })` (Task 9 keeps it on every phone page).

**Decisions:**
- The register's search widens to the global search's 19 fields (user decision 2026-10-25). `assetSearchConditions(search)` holds the one list, in the route's order:
  - tag, name, serial, fixed-asset code;
  - category code and name;
  - brand name and model name;
  - company code, `nameTh` and `nameEn`;
  - branch code and name;
  - custodian code, `fullNameTh`, `fullNameEn` and email;
  - location code and name.

  `buildAssetWhere` and the route's asset `findMany` both use it. So "ดูทั้งหมดในทะเบียน (N)", the rows listed, the register, its export and the reports that read `buildAssetWhere` all find the same assets.
- `assetTotal` (`prisma.asset.count` on `buildAssetSearchWhere`) is computed only for `scope=all`, 2+ characters and `asset:view`; otherwise it is `null`. The listed asset rows keep `take: 10` and the caps 8/14.
- `asset.searchPlaceholder` becomes:
  - th "ค้นหา รหัส · ชื่อ · Serial · ยี่ห้อ/รุ่น · ผู้ถือครอง · ที่ตั้ง"
  - en "Search tag, name, serial, brand or model, custodian or location"
- The Thai API label for audit becomes "รอบตรวจนับ" (`label()`); English "Audit" stays.
- `/` matches `key === "/"` or `code === "Slash"` without Shift (Thai layout: "ฝ"); never with Alt/Ctrl/Meta, composing, `defaultPrevented`, focus in INPUT/TEXTAREA/SELECT, contentEditable, or inside `[role="dialog"]`. Bar only; it focuses the input only when `input.getClientRects().length > 0`. Its one `window` keydown listener gets a one-entry allow list in the overlay guard.
- Recents, "ล้าง" and the ways forward are `li role="option"` (arrows + Enter), not buttons; the field stays hand-written (not `SearchField`), so the phase 3 guard rows stay.
- Recents save opened results and opened recents only (not `registerAll` or actions): newest first, once per `href`, max 5. A stored entry survives only with its `type` in `globalSearchGroupOrder`, a non-empty `title` and an `href` starting `/{locale}/`. Every storage call in try/catch; an empty list removes the key. Read in `onFocus` (bar) or a lazy `useState` initializer (sheet, client-only), never in an effect or render.
- A failed request shows `error`, not "ไม่พบ". Ways forward: `scan` → `/{locale}/asset-management/scan` (`actionScan`), `registerFilters` → plain `/{locale}/assets` (`actionRegister`), `createAsset` → `/{locale}/assets/new` (`actionCreateAsset`, needs `canViewAssets` and `canCreateAssets`); none without `canViewAssets`.
- Phone: a full-height top sheet with the `sheet` variant; Escape there is Radix's.
- Ids: panel `useId()`; options `${panelId}-option-${index}` over the flattened options; headings `${panelId}-group-${section.id}` (the not-found title carries `${panelId}-group-notFound`).

- [ ] **Step 1: Write the failing tests.**

`tests/global-search-panel.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { buildGlobalSearchSections, flattenGlobalSearchOptions, getGlobalSearchNotFoundActions, getGlobalSearchPanelState, isGlobalSearchShortcut } from "../src/lib/global-search-panel.ts"
import { splitSearchHighlight } from "../src/lib/search-highlight.ts"
const row = (type: "asset" | "maintenance" | "audit" | "employee" | "branch", id: string) => ({ id, type, title: `${type}-${id}`, subtitle: "", href: `/th/${type}/${id}` })
const base = { state: "results" as const, query: "NB", locale: "th", recent: [], canViewAssets: true, canCreateAssets: true }

test("the panel state covers the empty box, one character, a pending search, an error, nothing found and results (menu B shell task 8)", () => {
  const s = (query: string, settledQuery: string | null, resultCount = 0, failed = false) => getGlobalSearchPanelState({ query, settledQuery, resultCount, failed })
  assert.equal(s("", null), "hint"); assert.equal(s("   ", null), "hint"); assert.equal(s("a", null), "minChars"); assert.equal(s(" ก ", null), "minChars")
  assert.equal(s("ab", null), "loading"); assert.equal(s("abc", "ab"), "loading"); assert.equal(s("ab", "ab"), "notFound"); assert.equal(s("ab", "ab", 0, true), "error")
  assert.equal(s("abc", "ab", 3), "results") // the last answer stays while the next loads
})

test("results group in the shell order, keep their rank, and the asset group ends with the register total (menu B shell task 8)", () => {
  const results = [row("employee", "e1"), row("asset", "a1"), row("branch", "b1"), row("maintenance", "m1"), row("asset", "a2"), row("audit", "r1")]
  const sections = buildGlobalSearchSections({ ...base, results, assetTotal: 37 })
  assert.deepEqual(sections.map((section) => section.id), ["asset", "maintenance", "audit", "employee", "branch"])
  assert.deepEqual(sections[0].options.at(-1), { kind: "registerAll", key: "registerAll", href: "/th/assets?search=NB&exact=1", count: 37 })
  assert.deepEqual(flattenGlobalSearchOptions(sections).map((option) => option.key), ["asset:a1", "asset:a2", "registerAll", "maintenance:m1", "audit:r1", "employee:e1", "branch:b1"])
  for (const assetTotal of [0, null]) assert.ok(!flattenGlobalSearchOptions(buildGlobalSearchSections({ ...base, results, assetTotal })).some((option) => option.kind === "registerAll"))
  const onlyTotal = buildGlobalSearchSections({ ...base, results: [row("employee", "e1")], assetTotal: 4 })
  assert.deepEqual(onlyTotal.map((section) => [section.id, section.options.map((option) => option.kind)]), [["asset", ["registerAll"]], ["employee", ["result"]]])
})

test("an empty box lists the recent items and the clear option; nothing found offers ways forward by permission (menu B shell task 8)", () => {
  const recent = [{ type: "asset" as const, title: "NB-1", href: "/th/assets/1" }]
  assert.deepEqual(buildGlobalSearchSections({ ...base, state: "hint", query: "", results: [], assetTotal: null, recent }).map((section) => [section.id, section.options.map((option) => option.key)]), [["recent", ["recent:/th/assets/1", "clearRecent"]]])
  assert.deepEqual(buildGlobalSearchSections({ ...base, state: "hint", query: "", results: [], assetTotal: null }), [])
  assert.deepEqual(getGlobalSearchNotFoundActions("th", { canViewAssets: true, canCreateAssets: true }), [
    { kind: "action", key: "scan", href: "/th/asset-management/scan" }, { kind: "action", key: "registerFilters", href: "/th/assets" }, { kind: "action", key: "createAsset", href: "/th/assets/new" }])
  assert.deepEqual(getGlobalSearchNotFoundActions("th", { canViewAssets: true, canCreateAssets: false }).map((action) => action.key), ["scan", "registerFilters"])
  assert.deepEqual(getGlobalSearchNotFoundActions("th", { canViewAssets: false, canCreateAssets: true }), [])
  assert.deepEqual(buildGlobalSearchSections({ ...base, state: "notFound", results: [], assetTotal: 0 }).map((section) => section.id), ["notFound"])
})

test("/ opens the search unless focus is in a field or a dialog, also on the Thai layout (menu B shell task 8, Review Focus F3)", () => {
  const key = { key: "/", code: "Slash", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }
  const at = (tagName: string, extra: { isContentEditable?: boolean; inDialog?: boolean } = {}) => ({ tagName, isContentEditable: Boolean(extra.isContentEditable), closest: (selector: string) => (extra.inDialog && selector.includes("dialog") ? {} : null) })
  assert.equal(isGlobalSearchShortcut(key, at("BODY")), true); assert.equal(isGlobalSearchShortcut(key, null), true)
  assert.equal(isGlobalSearchShortcut({ ...key, key: "ฝ" }, at("BODY")), true) // the same key on the Thai layout
  for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) assert.equal(isGlobalSearchShortcut(key, at(tag)), false)
  assert.equal(isGlobalSearchShortcut(key, at("DIV", { isContentEditable: true })), false); assert.equal(isGlobalSearchShortcut(key, at("BUTTON", { inDialog: true })), false)
  for (const change of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true, key: "?" }, { isComposing: true }, { defaultPrevented: true }]) assert.equal(isGlobalSearchShortcut({ ...key, ...change }, at("BODY")), false)
})

test("the highlight marks the first match in any case (menu B shell task 8)", () => {
  assert.deepEqual(splitSearchHighlight("SNI-EQU-26-0001", "equ"), ["SNI-", "EQU", "-26-0001"])
  assert.deepEqual(splitSearchHighlight("เครื่องพิมพ์ ชั้น 2", "พิมพ์"), ["เครื่อง", "พิมพ์", " ชั้น 2"])
  assert.equal(splitSearchHighlight("Printer", "zz"), null); assert.equal(splitSearchHighlight("Printer", "  "), null)
})
```

`tests/global-search-recent.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { RECENT_SEARCH_LIMIT, addRecentSearch, parseRecentSearches, readRecentSearches, recentSearchStorageKey, writeRecentSearches } from "../src/lib/global-search-recent.ts"
const item = (n: number) => ({ type: "asset" as const, title: `NB-${n}`, href: `/th/assets/${n}` })
test("the key is per locale and the list keeps five, newest first, once each (menu B shell task 8)", () => {
  assert.equal(recentSearchStorageKey("th"), "asset-system:recent-search:v1:th"); assert.equal(RECENT_SEARCH_LIMIT, 5)
  const list = [1, 2, 3, 4, 5].map(item)
  assert.deepEqual(addRecentSearch(list, item(3)).map((r) => r.title), ["NB-3", "NB-1", "NB-2", "NB-4", "NB-5"])
  assert.deepEqual(addRecentSearch(list, item(6)).map((r) => r.title), ["NB-6", "NB-1", "NB-2", "NB-3", "NB-4"])
})
test("stored values are read defensively and stay inside the app (menu B shell task 8)", () => {
  for (const raw of [null, "{", '{"a":1}']) assert.deepEqual(parseRecentSearches(raw, "th"), [])
  const raw = JSON.stringify([item(1), { type: "asset", title: "x", href: "https://evil.example/th/" }, { type: "asset", title: "y", href: "//evil.example/th/" }, { type: "planet", title: "z", href: "/th/x" }, { type: "asset", title: "", href: "/th/assets/9" }, { ...item(2), href: "/en/assets/2" }, item(3), item(4), item(5), item(6), item(7)])
  assert.deepEqual(parseRecentSearches(raw, "th").map((r) => r.title), ["NB-1", "NB-3", "NB-4", "NB-5", "NB-6"])
})
test("blocked storage reads empty and a failed write says so; clearing removes the key (menu B shell task 8)", () => {
  const blocked = () => { throw new Error("blocked") }
  assert.deepEqual(readRecentSearches(blocked, "th"), []); assert.equal(writeRecentSearches(blocked, "th", [item(1)]), false)
  const calls: string[] = []
  const storage = { setItem: (k: string, v: string) => void calls.push(`set ${k} ${v}`), removeItem: (k: string) => void calls.push(`remove ${k}`) }
  assert.equal(writeRecentSearches(() => storage, "th", []), true); assert.deepEqual(calls, ["remove asset-system:recent-search:v1:th"])
})
```

`tests/global-search.test.ts` (import `readFileSync`, `globalSearchGroupOrder`, `groupGlobalSearchResults`):

```ts
const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")
test("results group in the shell's type order and keep their rank inside a group (menu B shell task 8)", () => {
  assert.deepEqual([...globalSearchGroupOrder], ["asset", "maintenance", "audit", "disposal", "employee", "location", "supplier", "company", "branch"])
  const r = (type: "asset" | "supplier", id: string) => ({ id, type })
  assert.deepEqual(groupGlobalSearchResults([r("supplier", "s1"), r("asset", "a2"), r("supplier", "s2"), r("asset", "a1")]).map((g) => [g.type, g.results.map((x) => x.id)]), [["asset", ["a2", "a1"]], ["supplier", ["s1", "s2"]]])
})
test("the route counts assets with the register's search only for scope=all and 2+ characters (menu B shell task 8)", () => {
  const route = read("src/app/api/search/route.ts")
  assert.match(route, /if \(query\.length < globalSearchMinChars\) return NextResponse\.json\(\{ results: \[\], scope, assetTotal: null \}\)/)
  assert.match(route, /const canSearchAssets = hasPermission\(user, "asset", "view"\)/)
  assert.match(route, /scope === "all" && canSearchAssets \? prisma\.asset\.count\(\{ where: buildAssetSearchWhere\(query\) \}\) : Promise\.resolve\(null\)/)
  assert.match(route, /results: sortGlobalSearchResults\(results\.flat\(\), query, scope === "asset" \? 8 : 14\),\s*scope,\s*assetTotal,/)
  assert.match(route, /audit: "รอบตรวจนับ",/)
  assert.match(route, /import \{ assetSearchConditions, buildAssetSearchWhere \} from "@\/lib\/asset-list-query"/)
  assert.match(route, /OR: assetSearchConditions\(query\)/)
  assert.doesNotMatch(route, /\{ brand: \{ name: \{ contains: query \} \} \}/, "one list of asset search fields")
})
```

`tests/asset-list-query.test.ts` (import `assetSearchConditions`, `buildAssetSearchWhere`):

```ts
test("the global search counts assets with the register's own search (menu B shell task 8)", () => {
  const where = buildAssetSearchWhere("  NB-01 ")
  assert.deepEqual(where, buildAssetWhere(parseAssetListParams({ search: "NB-01" })))
  assert.deepEqual(Object.keys(where).sort(), ["OR", "isActive"]); assert.equal((where.OR as unknown[]).length, 19)
})
test("the register finds brand, model, company, branch, custodian e-mail and location names (user decision 2026-10-25)", () => {
  const conditions = assetSearchConditions("Dell")
  assert.equal(conditions.length, 19)
  for (const expected of [
    { brand: { name: { contains: "Dell" } } }, { model: { name: { contains: "Dell" } } },
    { company: { nameTh: { contains: "Dell" } } }, { company: { nameEn: { contains: "Dell" } } },
    { branch: { name: { contains: "Dell" } } }, { custodian: { fullNameEn: { contains: "Dell" } } },
    { custodian: { email: { contains: "Dell" } } }, { currentLocation: { name: { contains: "Dell" } } },
  ]) assert.ok(conditions.some((condition) => JSON.stringify(condition) === JSON.stringify(expected)), JSON.stringify(expected))
  assert.deepEqual(buildAssetWhere(parseAssetListParams({ search: "Dell" })).OR, conditions)
})
```

`tests/global-search-ui.test.ts` (add `const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")`):

```ts
test("one search component: grouped options, highlight, / shortcut, recents, the 220 ms debounce (menu B shell task 8)", () => {
  const source = read("src/components/layout/global-search.tsx")
  assert.match(source, /const panelId = useId\(\)/); assert.doesNotMatch(source, /id="global-search-results"/)
  assert.match(source, /window\.addEventListener\("keydown", handleShortcut\)/); assert.match(source, /window\.removeEventListener\("keydown", handleShortcut\)/)
  assert.match(source, /isGlobalSearchShortcut\(event, event\.target instanceof Element \? event\.target : null\)/); assert.match(source, /aria-keyshortcuts="\/"/)
  assert.match(source, /<mark className="rounded-sm bg-warning-soft px-0\.5 text-foreground">/)
  assert.match(source, /role="group"/); assert.match(source, /aria-labelledby=\{`\$\{panelId\}-group-\$\{section\.id\}`\}/)
  assert.match(source, /t\("viewAllInRegister", \{ count: formatCount\(option\.count\) \}\)/)
  assert.match(source, /readRecentSearches\(\(\) => window\.localStorage, locale\)/); assert.match(source, /writeRecentSearches\(\(\) => window\.localStorage, locale,/)
  assert.match(source, /getGlobalSearchPanelState\(\{/); assert.match(source, /\}, 220\)/)
  assert.equal(source.match(/<input\b/g)?.length, 1); assert.equal(source.match(/<Loader2\b/g)?.length, 2)
})
test("the phone opens the same search in a full-height sheet from the top bar (menu B shell task 8)", () => {
  const sheet = read("src/components/layout/mobile-search-sheet.tsx")
  assert.match(sheet, /<Button variant="ghost" size="icon" className="lg:hidden" aria-label=\{t\("label"\)\} title=\{t\("label"\)\}>/)
  assert.match(sheet, /<SheetContent side="top" className="h-dvh gap-0" aria-describedby=\{undefined\}>/); assert.match(sheet, /<SheetTitle>\{t\("label"\)\}<\/SheetTitle>/)
  assert.match(sheet, /<GlobalSearch\s+variant="sheet"[\s\S]*?onNavigate=\{\(\) => setOpen\(false\)\}/)
  const topbar = read("src/components/layout/topbar.tsx")
  assert.match(topbar, /const canViewAssets = hasNavigationPermission\(user, \{ module: "asset", action: "view" \}\)/)
  assert.match(topbar, /const canCreateAssets = hasNavigationPermission\(user, \{ module: "asset", action: "create" \}\)/)
  assert.match(topbar, /<GlobalSearch canViewAssets=\{canViewAssets\} canCreateAssets=\{canCreateAssets\} \/>/)
  assert.match(topbar, /<MobileSearchSheet canViewAssets=\{canViewAssets\} canCreateAssets=\{canCreateAssets\} \/>/)
  assert.ok(topbar.indexOf("<MobileSearchSheet") < topbar.indexOf("asset-management/scan"), "first in the right group")
})
test("search messages (menu B shell task 8)", () => {
  const SET = /* the "set" object of the Step 3 messages JSON, verbatim */
  const kept = { th: { label: "ค้นหาทั่วระบบ", minChars: "พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา", noResults: "ไม่พบข้อมูลที่ตรงกับคำค้น" }, en: { label: "Search globally", minChars: "Type at least 2 characters to search", noResults: "No matching records found" } }
  for (const locale of ["th", "en"] as const) {
    const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).globalSearch
    for (const [key, value] of Object.entries(SET[locale])) assert.equal(m[key.replace("globalSearch.", "")], value, `${locale} ${key}`)
    for (const [key, value] of Object.entries(kept[locale])) assert.equal(m[key], value, `${locale} ${key} unchanged`)
  }
})
```

- [ ] **Step 2: Run and see them fail.** `node --test tests/global-search-panel.test.ts tests/global-search-recent.test.ts tests/global-search.test.ts tests/asset-list-query.test.ts tests/global-search-ui.test.ts` → `ERR_MODULE_NOT_FOUND` for the three new lib modules; SyntaxError: no export `buildAssetSearchWhere` / `globalSearchGroupOrder`; AssertionErrors on the route, component, sheet and message tests.

- [ ] **Step 3: Implement.**
  - **Route `GET`:** the pinned early return (no query runs); `const canSearchAssets = …`; `const [results, assetTotal] = await Promise.all([Promise.all([<today's nine searches, the asset one gated by canSearchAssets>]), <the pinned count>])`; answer `{ results: <pinned>, scope, assetTotal }`. In the asset `findMany`, the inline OR list becomes `OR: assetSearchConditions(query)`, and nothing else in it changes. `label()` Thai map: `audit: "รอบตรวจนับ",`.
  - **`asset-list-query.ts`:** add `assetSearchConditions` (the route's 19 conditions, in its order). `buildAssetWhere`'s search branch becomes `OR: assetSearchConditions(filters.search)`. Then add `buildAssetSearchWhere`.
  - **`search-highlight.ts`:** the function moved verbatim, `term.trim().toLocaleLowerCase()` inline; `audit-scan-session.ts` gets `export { splitSearchHighlight } from "./search-highlight.ts"`.
  - **`global-search-recent.ts`:** imports `globalSearchGroupOrder` from `./global-search.ts`; rules in Decisions.
  - **`global-search-panel.ts`** (relative imports): `getGlobalSearchPanelState` on `q = query.trim()`, first match wins: `"hint"` empty, `"minChars"` below `globalSearchMinChars`, `"results"` when `resultCount > 0`, `"loading"` when `settledQuery !== q`, `"error"` when `failed`, else `"notFound"`. `buildGlobalSearchSections`: `"results"` → `groupGlobalSearchResults` with keys `${type}:${id}`, plus `registerAll` (`buildExactAssetRegisterHref(locale, { search: q })`) at the end of the asset group when `assetTotal > 0` (its own asset group first if none); `"hint"` with recents → `recent` (`recent:${href}`, then `clearRecent`); `"notFound"` with an action → `notFound`; else `[]`.
  - **`GlobalSearch`:**
    - Today's 220 ms debounced, aborting fetch. Success: results, `assetTotal ?? null`, settledQuery, `failed=false`, `selectedIndex = results.length ? 0 : -1`. A non-abort error: results `[]`, settledQuery, `failed=true`.
    - `showPanel = variant === "sheet" || open`. One `<div id={panelId}>` body, in `PopoverContent` (bar, keeping its three focus/outside handlers) or inline under the field (sheet): the state line (`emptyHint`, plus `<Kbd>/</Kbd> {t("keyboardFocus")}` in the bar; `minChars`; the second `<Loader2>` + `loading`; `failed`; `notFound({ query })` + `notFoundHint`), today's listbox `ul` holding `li role="presentation"` sections (heading `group_<type>` or `recentTitle`, none for notFound) each with a `ul role="group"`, and today's Kbd footer when options exist.
    - Rows keep today's class `cn(…)`, `onMouseDown` and `onMouseEnter`. result: icon, highlighted title, today's badge rule, highlighted subtitle, metadata, no type label. registerAll: `PackageSearch` + `viewAllInRegister` in `text-primary`. recent: type icon, title, `group_<type>` right. clearRecent: `recentClear` right, `aria-label={t("recentClearLabel")}`. action: `ScanLine` / `PackageSearch` / `Plus` + label.
    - Keys: ArrowDown `(i + 1) % n`; ArrowUp `i <= 0 ? n - 1 : i - 1`; Enter only when `i >= 0`; Escape closes the bar. Choosing a result or recent saves it; every navigation then clears and closes (bar) or calls `onNavigate()` (sheet); clearRecent writes `[]`, sets `selectedIndex = -1` and keeps focus.
    - Field: one `<input>` with today's attributes plus `aria-controls={panelId}`, `aria-activedescendant` (while `showPanel && selectedIndex >= 0`), `aria-keyshortcuts="/"` and `className={cn("h-9 w-full min-w-0 rounded-md border border-border bg-background pl-10 pr-10 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring", variant === "sheet" && "h-11 text-base")}`, in the anchor `<div ref={anchorRef} className={cn(variant === "bar" ? "relative hidden w-[min(28rem,36vw)] min-w-0 max-w-full lg:block" : "relative w-full")}>`. Right slot: the first `<Loader2>`, else today's clear `<button>`, else `<Kbd aria-hidden="true">/</Kbd>` (bar).
  - **`MobileSearchSheet`:** `<Sheet open={open} onOpenChange={setOpen}>`; `SheetTrigger asChild` on the pinned button (`<Search aria-hidden="true" className="size-5" />`); the pinned `SheetContent`, `SheetHeader` + `SheetTitle`; then `<div className="flex min-h-0 flex-1 flex-col px-4 py-3">` with `<GlobalSearch variant="sheet" canViewAssets={canViewAssets} canCreateAssets={canCreateAssets} onNavigate={() => setOpen(false)} />`.
  - **`topbar.tsx`:** the pinned `const`s (re-import `hasNavigationPermission` if Task 7 dropped it), `<GlobalSearch … />`, and `<MobileSearchSheet … />` first in the right group.
  - **Messages** (`node scripts/messages-edit.mjs <file>`, no deletes):

```json
{ "set": {
  "th": { "globalSearch.group_asset": "ทรัพย์สิน", "globalSearch.group_maintenance": "งานซ่อม", "globalSearch.group_audit": "รอบตรวจนับ", "globalSearch.group_disposal": "ตัดจำหน่าย", "globalSearch.group_employee": "พนักงาน", "globalSearch.group_location": "ที่ตั้ง", "globalSearch.group_supplier": "ผู้ขาย", "globalSearch.group_company": "บริษัท", "globalSearch.group_branch": "สาขา", "globalSearch.viewAllInRegister": "ดูทั้งหมดในทะเบียน ({count})", "globalSearch.emptyHint": "ค้นหาด้วยรหัสทรัพย์สิน Serial ชื่อ เลขที่เอกสาร หรือชื่อพนักงาน", "globalSearch.keyboardFocus": "ค้นหาจากทุกหน้า", "globalSearch.recentTitle": "เปิดล่าสุด", "globalSearch.recentClear": "ล้าง", "globalSearch.recentClearLabel": "ล้างรายการที่เปิดล่าสุด", "globalSearch.notFound": "ไม่พบ \"{query}\"", "globalSearch.notFoundHint": "ลองพิมพ์ให้สั้นลง หรือตรวจตัวสะกด", "globalSearch.actionScan": "สแกน / ค้นหาทรัพย์สิน", "globalSearch.actionRegister": "หาในทะเบียนด้วยตัวกรอง", "globalSearch.actionCreateAsset": "เพิ่มทรัพย์สิน", "globalSearch.failed": "ค้นหาไม่สำเร็จ ลองอีกครั้ง", "asset.searchPlaceholder": "ค้นหา รหัส · ชื่อ · Serial · ยี่ห้อ/รุ่น · ผู้ถือครอง · ที่ตั้ง" },
  "en": { "globalSearch.group_asset": "Assets", "globalSearch.group_maintenance": "Repairs", "globalSearch.group_audit": "Audit rounds", "globalSearch.group_disposal": "Disposals", "globalSearch.group_employee": "Employees", "globalSearch.group_location": "Locations", "globalSearch.group_supplier": "Suppliers", "globalSearch.group_company": "Companies", "globalSearch.group_branch": "Branches", "globalSearch.viewAllInRegister": "View all in the register ({count})", "globalSearch.emptyHint": "Search by asset tag, serial, name, document number or employee name", "globalSearch.keyboardFocus": "search from any page", "globalSearch.recentTitle": "Recently opened", "globalSearch.recentClear": "Clear", "globalSearch.recentClearLabel": "Clear recently opened", "globalSearch.notFound": "No results for \"{query}\"", "globalSearch.notFoundHint": "Try a shorter term or check the spelling", "globalSearch.actionScan": "Scan or look up an asset", "globalSearch.actionRegister": "Find it in the register with filters", "globalSearch.actionCreateAsset": "Add an asset", "globalSearch.failed": "Search failed. Try again.", "asset.searchPlaceholder": "Search tag, name, serial, brand or model, custodian or location" } } }
```

- [ ] **Step 4: Update existing pins.**
  - `tests/asset-list-query.test.ts:43-55`: the 11 literal `contains: "printer"` conditions become `OR: assetSearchConditions("printer")`. Grep `tests/` for `searchPlaceholder` and for any other pin on the 11-field list, and update each to the new placeholder or to the 19 fields.
  - `tests/global-search-ui.test.ts:8`: `/<PopoverContent[\s\S]*?id="global-search-results"/` → `/<PopoverContent[\s\S]*?id=\{panelId\}/`; lines 7, 9-14 and 21-25 stay.
  - `tests/shell-sweep-ui.test.ts` (the two `search` asserts) → `/<div ref=\{anchorRef\} className=\{cn\(variant === "bar" \? "relative hidden w-\[min\(28rem,36vw\)\] min-w-0 max-w-full lg:block" : "relative w-full"\)\}>/` and `/className=\{cn\("h-9 w-full min-w-0 rounded-md [^"]*", variant === "sheet" && "h-11 text-base"\)\}/`.
  - `tests/ui-overlay-guards.test.ts:71-73`: `// the / shortcut opens the search and closes nothing (menu B shell task 8)` + `const GLOBAL_KEY_LISTENERS = ['src/components/layout/global-search.tsx: window.addEventListener("keydown"']`; the test expects `GLOBAL_KEY_LISTENERS` instead of `[]`.
  - Must stay as they are: `tests/form-migration-guards.test.ts:71,76,140,499-502` (GF2 1, GF3 1, GB1 2, phase 3 sum 5) and `tests/visual-foundation-guards.test.ts:383,461` (N3 1, the clear X). If a count changes, update its row and the phase 3 sum in this commit.
  - Green without edits: `tests/audit-scan-session-list.test.ts:11,119-120`, `tests/audit-scan-search-ui.test.ts:31` (re-export); `tests/status-name-api.test.ts:6-12`, `tests/location-type-labels.test.ts:55,86`, `tests/open-repair-filter.test.ts:28` (queries untouched); `tests/rbac-route-matrix.test.ts` (the literal `hasPermission(user, "asset", "view")` stays).
  - E2E impact: none use the search; `globalSearch.label` stays "ค้นหาทั่วระบบ", and the combobox role keeps it apart from `e2e/audit/scan-steps.ts:56` (exact "ค้นหา") and `e2e/transactions/bulk-move.spec.ts:67` (searchbox "ทรัพย์สิน").

- [ ] **Step 5: Verify.** `node --test` on the Step 2 files, every Step 4 file, `tests/messages-parity.test.ts` and `tests/thai-glossary.test.ts` → all pass; then `npm test`, `npx tsc --noEmit -p .`, `npm run lint` → green, 0 lint errors.

- [ ] **Step 6: Commit.**

```
git add src/lib/global-search.ts src/lib/global-search-panel.ts src/lib/global-search-recent.ts src/lib/search-highlight.ts src/lib/audit-scan-session.ts src/lib/asset-list-query.ts src/app/api/search/route.ts src/components/layout/global-search.tsx src/components/layout/mobile-search-sheet.tsx src/components/layout/topbar.tsx messages/th.json messages/en.json tests/global-search-panel.test.ts tests/global-search-recent.test.ts tests/global-search.test.ts tests/global-search-ui.test.ts tests/asset-list-query.test.ts tests/shell-sweep-ui.test.ts tests/ui-overlay-guards.test.ts
git commit -m "feat(shell): search groups by type, highlights the match, opens on / and on the phone, and shows the register total; the register finds brand, model, company, branch and location names (menu B shell task 8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The phone: the เพิ่มเติม sheet, the phone top bar (title, bell), the open tab tile

**Files:** (Tasks 1 and 3–8 edit these files before this task, so anchor every edit by its content)
- Create: `src/components/layout/mobile-more-sheet.tsx`, `src/lib/sheet-swipe.ts`, `src/lib/locale-path.ts`
- Modify:
  - append to `src/lib/user-display.ts` and `src/lib/navigation-active.ts`;
  - `src/components/layout/sidebar.tsx`, `dashboard-shell.tsx`, `mobile-field-navigation.tsx`, `topbar.tsx`, `theme-toggle.tsx`;
  - `messages/th.json` and `messages/en.json` (through `scripts/messages-edit.mjs`);
  - `DESIGN.md` §5 Sidebar.
- Test: `tests/mobile-more-sheet.test.ts` (pure) and `tests/mobile-more-sheet-ui.test.ts` (reads the source); the existing pins are in Step 4.

**Interfaces:**
- Consumes:
  - Task 4:
    - `type ShellAccount = { roleLabel: string | null; departmentLabel: string | null }` in `user-display.ts`.
    - `DashboardShell` already receives `account`.
    - `MenuItem.attention?: string` on the work-center item, set from `useShellNotifications()` + `countUnreadDecisions`.
  - Task 3: `ShellNotificationsProvider` wraps the whole shell.
  - Task 5: the aside's `<TooltipProvider delayDuration={300}>`.
  - Task 6: the `mobileNavigationMode` prop, and the `{/* User Menu */}` block (`lg:hidden`).
  - Task 7: `<NotificationBell user={user} />` in `topbar.tsx`.
  - Task 8: `MobileSearchSheet` is untouched.
- Produces:
  - `MobileMoreSheet({ open, onOpenChange, user, account, returnFocusRef }: { open: boolean; onOpenChange: (open: boolean) => void; user: SessionUser; account: ShellAccount; returnFocusRef: RefObject<HTMLElement | null> }): JSX.Element`. Its `SheetContent` has `id="mobile-more-sheet"`, and the dialog's name is "เพิ่มเติม".
  - In `sidebar.tsx`: `export function useNavigationMenu(user: SessionUser): { sections: MenuSection[]; activeHref: string | null; activeLabel: string | null }`, `export type MenuItem`, `export type MenuSection`.
  - In `navigation-active.ts`: `export type LabeledNavigationNode = { labelKey: string; href?: string; children?: LabeledNavigationNode[] }` and `getActiveNavigationLabelKey(items: readonly LabeledNavigationNode[], activeHref: string | null): string | null`.
  - `export function switchTheme(): void` (`theme-toggle.tsx`, module level).
  - `SHEET_SWIPE_CLOSE_PX = 80` and `isSheetSwipeClose(deltaY: number, elapsedMs: number): boolean`.
  - `switchLocalePath(pathname: string, from: string, to: string): string`.
  - `getAccountDetailLine(parts: ReadonlyArray<string | null | undefined>): string`.
  - Props: `Topbar` gets `onOpenMoreSheet: (trigger: HTMLButtonElement) => void` and `moreSheetOpen: boolean` in place of `onMobileMenuToggle`. `MobileFieldNavigation` gets `moreOpen: boolean` in place of `sidebarOpen`. `Sidebar` loses `mobileOpen`, `onMobileClose` and `onMobileNavigate`.
  - For Task 13A:
    - the dialog "เพิ่มเติม";
    - the button "เพิ่มเติม" (`exact: true`, since "การดำเนินการเพิ่มเติม" also matches);
    - "เปิดเมนู" on focus pages;
    - the groups "ภาษา" ("ภาษาไทย" / "English") and "ธีม" ("สว่าง" / "มืด");
    - "ออกจากระบบ".

**Decisions:**
- The layout is not touched, because Task 4 passes `account`. The person line uses `account.departmentLabel`.
- The sheet's work-center dot comes from `item.attention`, so there is one count source. It is `bg-warning`, because `--sidebar-dot` is below 3:1 on white.
- `useNavigationMenu` stays in `sidebar.tsx`, where the menu tests read it. It takes Task 4's `useShellNotifications()` / `waitingDecisions` lines with it.
- Phone top-bar title (spec §6.6): `activeLabel`, else `nav.brandName`. It is a `<p>`, not a heading, and shows only on phone pages with the bottom menu (`mobileNavigationMode`); focus task pages keep their own task header (spec §6.6).
- The phone top bar keeps the bell only on bottom-menu pages. Language and theme are `lg`-only.
- The user menu goes. `nav.userMenu` stays, because Task 4's rail uses it. `nav.closeMenu` goes.
- The sheet rows are its own light rows: no navy, no rail. A group opens by `SidebarGroup`'s rule: `useState(containsActive)` plus the `seenActiveHref` check.
- The bottom bar stays mounted under the scrim, so focus can return to its tab. More is shown active (`text-primary`, `bg-primary-soft` tile) while the sheet is open; `aria-current` stays route-based.
- Focus:
  - On open, focus goes to the first menu link; `focusFirstContentControl` skips links.
  - On close, focus goes to the opener if it is still shown, else to a shown `[aria-controls="mobile-more-sheet"]`. There is no Radix trigger to return to.
- The theme switch never learns the theme (dark mode G6). The sheet has no `dataset.theme`, no `prefers-color-scheme` and no `@/lib/theme` import.
- E2E impact:
  - No spec uses the drawer or the phone controls.
  - Phone focus pages lose the bell.
  - Task 13A gives the E2E IT head `dashboard:view` and checks the sheet's dot.

- [ ] **Step 1: Write the failing tests** (`assert` from `node:assert/strict`, `test` from `node:test`)

`tests/mobile-more-sheet.test.ts`:
```ts
import { SHEET_SWIPE_CLOSE_PX, isSheetSwipeClose } from "../src/lib/sheet-swipe.ts"
import { switchLocalePath } from "../src/lib/locale-path.ts"
import { getAccountDetailLine } from "../src/lib/user-display.ts"
import { getActiveNavigationLabelKey } from "../src/lib/navigation-active.ts"

test("a drag down of 80px, or a flick of 32px or more at 0.5px/ms or faster, closes the sheet; a drag up never does", () => {
  assert.equal(SHEET_SWIPE_CLOSE_PX, 80)
  assert.equal(isSheetSwipeClose(80, 1000), true); assert.equal(isSheetSwipeClose(79, 1000), false)
  assert.equal(isSheetSwipeClose(40, 60), true)   // 0.67 px/ms
  assert.equal(isSheetSwipeClose(40, 200), false) // 0.2 px/ms
  assert.equal(isSheetSwipeClose(31, 10), false)  // too short for a flick
  assert.equal(isSheetSwipeClose(-120, 100), false); assert.equal(isSheetSwipeClose(50, 0), false)
})
test("switching the language keeps the page: only the first locale segment changes", () => {
  assert.equal(switchLocalePath("/th/assets/abc", "th", "en"), "/en/assets/abc")
  assert.equal(switchLocalePath("/th", "th", "en"), "/en")
  assert.equal(switchLocalePath("/en/audit/rounds/r-1/scan", "en", "th"), "/th/audit/rounds/r-1/scan")
  assert.equal(switchLocalePath("/th/master-data/thai-suppliers", "th", "en"), "/en/master-data/thai-suppliers")
  assert.equal(switchLocalePath("/thx", "th", "en"), "/en/thx")
})
test("the person's second line joins role and department with ' · ', skips empty parts, never shortens (F5)", () => {
  assert.equal(getAccountDetailLine(["หัวหน้า IT", "ฝ่าย IT"]), "หัวหน้า IT · ฝ่าย IT")
  assert.equal(getAccountDetailLine([null, " ฝ่าย IT "]), "ฝ่าย IT")
  assert.equal(getAccountDetailLine([undefined, " "]), "")
  const role = "ผู้จัดการฝ่ายบริหารทรัพย์สินและจัดซื้อจัดจ้าง สำนักงานใหญ่ กรุงเทพมหานคร"
  assert.ok(role.length >= 60); assert.equal(getAccountDetailLine([role, "ฝ่าย IT"]), `${role} · ฝ่าย IT`)
})
test("the phone title is the open menu row's label key, found inside groups; none when no row is open (spec §6.6)", () => {
  const items = [{ labelKey: "dashboard", href: "/th/dashboard" }, { labelKey: "audit", children: [{ labelKey: "auditRound", href: "/th/audit/rounds" }] }]
  assert.equal(getActiveNavigationLabelKey(items, "/th/audit/rounds"), "auditRound")
  assert.equal(getActiveNavigationLabelKey(items, "/th/dashboard"), "dashboard")
  assert.equal(getActiveNavigationLabelKey(items, "/th/reports"), null); assert.equal(getActiveNavigationLabelKey(items, null), null)
})
```

`tests/mobile-more-sheet-ui.test.ts`:
```ts
import { readFileSync } from "node:fs"
const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")
const has = (src: string, ...res: RegExp[]) => res.forEach((re) => assert.match(src, re))
const sheet = () => read("src/components/layout/mobile-more-sheet.tsx")

test("เพิ่มเติม is one bottom sheet: the person, the full menu, language, theme, then sign-out (menu B §6.6)", () => {
  const s = sheet()
  has(s, /^export function MobileMoreSheet\(/m, /<SheetContent[\s\S]*?side="bottom"[\s\S]*?id="mobile-more-sheet"/,
    /className="max-h-\[85dvh\] gap-0 rounded-t-xl"/, /<SheetTitle className="sr-only">\{t\("mobileMore"\)\}<\/SheetTitle>/,
    /getUserInitial\(user\)/, /const detailLine = getAccountDetailLine\(\[account\.roleLabel, account\.departmentLabel\]\)/,
    /signOut\(\{ callbackUrl: `\/\$\{locale\}\/login` \}\)/, /<Button variant="danger" size="lg" className="w-full"/)
  const order = ["data-more-sheet-person", "data-more-sheet-nav", 't("moreLanguage")', 't("moreTheme")', 'tAuth("logout")'].map((m) => s.indexOf(m))
  assert.ok(order.every((i) => i > -1), String(order)); assert.deepEqual([...order].sort((a, b) => a - b), order)
})
test("a long Thai name and role stay one line each, cut by CSS only (Review Focus F5)", () => {
  const s = sheet()
  has(s, /data-more-sheet-person[\s\S]*?<div className="min-w-0 flex-1">\s*<p className="truncate text-base font-semibold text-foreground">\{getUserDisplayLabel\(user\)\}<\/p>/,
    /<p className="truncate text-sm text-muted-foreground">\{detailLine\}<\/p>/)
  assert.doesNotMatch(s, /\.(?:slice|substring)\(0,/)
})
test("the sheet closes by its X, the scrim and a swipe down, scrolls inside, closes at lg, adds no motion of its own", () => {
  const s = sheet()
  assert.doesNotMatch(s, /showCloseButton=\{false\}/)
  has(s, /data-more-sheet-grab[^>]*className="[^"]*\btouch-none\b/, /onPointerDown=/, /isSheetSwipeClose\(/, /overflow-y-auto overscroll-contain/,
    /useMediaQuery\("\(min-width: 64rem\)"\)/, /open=\{open && !isWide\}/)
  assert.doesNotMatch(s, /\banimate-|translate-|duration-|style=\{\{/)
})
test("focus starts on the first menu link and returns to the button that opened the sheet", () => {
  has(sheet(), /onOpenAutoFocus=\{\(event\) => \{\n\s+event\.preventDefault\(\)\n\s+navRef\.current\?\.querySelector<HTMLElement>\("a\[href\]"\)\?\.focus\(\)/,
    /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?returnFocusRef\.current[\s\S]*?isConnected[\s\S]*?\[aria-controls="mobile-more-sheet"\][\s\S]*?event\.preventDefault\(\)[\s\S]*?\.focus\(\)/)
})
test("the sheet holds the permission-filtered menu with its groups; the work center shows a dot, never a number", () => {
  const s = sheet()
  has(s, /import \{ useNavigationMenu[^}]*\} from "@\/components\/layout\/sidebar"/, /useNavigationMenu\(user\)/,
    /role="group" aria-labelledby=\{headingId\}/, /`more-nav-section-\$\{section\.labelKey\}`/, /aria-expanded=\{open\}/, /aria-current=\{ariaCurrent\}/,
    /<span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" \/>/, /<span className="sr-only">\{item\.attention\}<\/span>/)
  assert.doesNotMatch(s, /formatCount|StatusBadge|countUnreadDecisions|useShellNotifications/)
})
test("the theme switch shows the theme on screen without learning it and keeps focus on the switch (dark mode G6)", () => {
  has(sheet(), /import \{ switchTheme \} from "@\/components\/layout\/theme-toggle"/, /data-when-theme=\{shown\}/, /value=\{shown\}/,
    /switchTheme\(\)\n\s+faces\[value\]\.current\?\.querySelector<HTMLElement>\('\[aria-pressed="true"\]'\)\?\.focus\(\)/,
    /<span lang="th">ภาษาไทย<\/span>/, /<span lang="en">English<\/span>/, /router\.push\(switchLocalePath\(pathname, locale, next\)\)/)
  has(read("src/components/layout/theme-toggle.tsx"), /^export function switchTheme\(\) \{$/m)
})
test("the shell opens the sheet from the bottom bar and the focus-page hamburger; the bar stays under it", () => {
  const shell = read("src/components/layout/dashboard-shell.tsx")
  has(shell, /const mobileFieldNavigationVisible = isNavigationMode && !mobileKeyboardVisible\n/, /const moreTriggerRef = useRef<HTMLElement \| null>\(null\)/,
    /<MobileMoreSheet[\s\S]*?open=\{moreSheetOpen\}[\s\S]*?returnFocusRef=\{moreTriggerRef\}/, /onOpenMoreSheet=\{openMoreSheet\}/, /moreOpen=\{moreSheetOpen\}/)
  assert.doesNotMatch(shell, /mobileSidebarOpen|closeMobileSidebar|onMobileNavigate|mobileOpen=/)
  has(read("src/components/layout/mobile-field-navigation.tsx"), /moreOpen: boolean/, /aria-expanded=\{moreOpen\}/, /aria-controls="mobile-more-sheet"/,
    /aria-haspopup="dialog"/, /const moreActive = activeItem === "more" \|\| moreOpen/, /moreActive && "bg-primary-soft"/, /isActive && !destination\.emphasized && "bg-primary-soft"/)
})
test("the phone top bar: the page title and, with the bottom menu, the bell; language, theme and avatar desktop-only or gone", () => {
  const top = read("src/components/layout/topbar.tsx")
  has(top, /onClick=\{\(event\) => onOpenMoreSheet\(event\.currentTarget\)\}/, /aria-expanded=\{moreSheetOpen\}/, /aria-controls="mobile-more-sheet"/,
    /mobileNavigationMode && "hidden"/, /<div className=\{cn\("relative shrink-0", !mobileNavigationMode && "hidden lg:block"\)\}>\s*<NotificationBell user=\{user\} \/>/,
    /<div className="relative hidden shrink-0 lg:block">\n\s+<DropdownMenu>/, /<div className="hidden lg:block">\n\s+<ThemeToggle \/>/,
    /switchLocalePath\(pathname, locale, newLocale\)/, /const \{ activeLabel \} = useNavigationMenu\(user\)/,
    /<p className=\{cn\("min-w-0 truncate text-base font-semibold text-foreground lg:hidden", !mobileNavigationMode && "hidden"\)\}>\{activeLabel \?\? tNav\("brandName"\)\}<\/p>/)
  assert.doesNotMatch(top, /tNav\("userMenu"|getUserInitial|signOut|onMobileMenuToggle|<h[1-6]\b/)
})
test("the sidebar has no phone drawer; its menu is exported for the sheet and the title", () => {
  const side = read("src/components/layout/sidebar.tsx")
  has(side, /^export function useNavigationMenu\(user: SessionUser\)[\s\S]*?const \{ summary \} = useShellNotifications\(\)/m, /^export type MenuItem = /m,
    /^export type MenuSection = /m, /filterNavigationSectionsByPermission\(menuSections, user\)/,
    /getActiveNavigationLabelKey\(visibleSections\.flatMap\(\(section\) => section\.items\), activeHref\)/)
  assert.doesNotMatch(side, /<Sheet\b|mobile-primary-navigation-drawer|onMobileClose|mobileRestoreFocusRef|renderBody/)
})
test("the sheet's labels exist in Thai and English", () => {
  const th = JSON.parse(read("messages/th.json")).nav, en = JSON.parse(read("messages/en.json")).nav
  assert.deepEqual([th.moreLanguage, th.moreTheme, th.themeLight, th.themeDark], ["ภาษา", "ธีม", "สว่าง", "มืด"])
  assert.deepEqual([en.moreLanguage, en.moreTheme, en.themeLight, en.themeDark], ["Language", "Theme", "Light", "Dark"])
  assert.equal(th.closeMenu, undefined); assert.equal(en.closeMenu, undefined)
})
```

- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/mobile-more-sheet.test.ts tests/mobile-more-sheet-ui.test.ts`. Expected:
  - `ERR_MODULE_NOT_FOUND` for `src/lib/sheet-swipe.ts`;
  - `ENOENT` for `mobile-more-sheet.tsx`;
  - the shell, top bar and sidebar asserts fail.

- [ ] **Step 3: Implement.** First read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md` and `use-pathname.md`. This task uses no new Next API.
  - **Pure modules** (no `@/` imports):
    - `isSheetSwipeClose` = `deltaY >= SHEET_SWIPE_CLOSE_PX || (deltaY >= 32 && elapsedMs > 0 && deltaY / elapsedMs >= 0.5)`.
    - `switchLocalePath` replaces the first segment when it is exactly `from`; otherwise it prefixes `/${to}`.
    - `getAccountDetailLine` trims each part, drops the empty ones and joins the rest with `" · "`.
    - `getActiveNavigationLabelKey` returns the `labelKey` of the first item or child whose `href === activeHref`, else `null`.
  - **`theme-toggle.tsx`:** move the body of `const switchTheme` unchanged into the exported module-level function. `ThemeToggle` keeps `onClick={switchTheme}`, with no hooks and no aria-label.
  - **`sidebar.tsx`:**
    - Move everything from Task 4's `useShellNotifications()` through `const activeHref` into `useNavigationMenu`. The hook calls its own `useTranslations("nav")`, `useLocale` and `usePathname`.
    - `activeLabel` is the translated key, or `null`.
    - Export `MenuItem` and `MenuSection`.
    - Render the body once, inline in the aside: `renderBody` goes, `bodyCollapsed` becomes `collapsed`, and heading ids lose `mobile-`.
    - Delete the phone `<Sheet>`, `mobileRestoreFocusRef`, the drawer X, the now-unused `X` / `Sheet*` / `Button` imports, the three mobile props, and `onNavigate` on `SidebarItemProps` / `SidebarLink`.
  - **`mobile-more-sheet.tsx`** (`"use client"`):
    - `<SheetContent side="bottom" id="mobile-more-sheet" aria-describedby={undefined} …>` holds the grab area, then one scroll region: `min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border-soft`.
    - Grab area: `<div data-more-sheet-grab className="shrink-0 touch-none" …>`, with `className` before the handlers. Use React handlers only, because `ui-overlay-guards` rejects global listeners.
      - `onPointerDown` keeps `{ y: event.clientY, t: event.timeStamp }` in a ref and calls `setPointerCapture`.
      - `onPointerUp` closes when `isSheetSwipeClose(event.clientY - y, event.timeStamp - t)`.
      - `onPointerCancel` clears the ref.
    - The grab area holds:
      - the grabber: `aria-hidden`, `mx-auto mt-2 h-1 w-10 rounded-full bg-control-border`;
      - `<div data-more-sheet-person className="flex items-center gap-3 px-4 pb-3 pt-2 pr-16">`. Inside it: the initial (`aria-hidden`, `flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground`), then the F5 column. The detail `<p>` renders only when `detailLine` is not empty.
    - The scroll region holds, in order:
      - the `<nav ref={navRef} data-more-sheet-nav aria-label={t("mainNavigation")}>`;
      - the language row (`flex min-h-14 items-center gap-3 border-t border-border-soft px-4`): `Globe`, then `<span aria-hidden="true">{t("moreLanguage")}</span>`, then `<Segmented aria-label={t("moreLanguage")} value={locale}>`. Choosing another locale closes the sheet and pushes;
      - the theme row: the same shape, with `SunMoon`;
      - `<div className="border-t border-border-soft p-4">` with the danger Button (`LogOut`, `tAuth("logout")`).
    - Section heading: `flex h-8 items-end px-4 pb-1 text-xs font-medium text-muted-foreground`.
    - Link: `flex min-h-12 items-center gap-3 px-4 text-sm text-foreground transition-colors motion-reduce:transition-none hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`, with the icon `text-muted-foreground`.
    - The open link adds `bg-primary-soft font-medium text-primary-hover hover:bg-primary-soft forced-colors:outline forced-colors:outline-2 forced-colors:-outline-offset-2`, with the icon `text-primary`.
    - `ariaCurrent` works as in `SidebarLink`. Every link calls `onOpenChange(false)`.
    - Group: one raw `<button>` with `ChevronDown` / `ChevronRight`. Its title is `font-semibold` while open, and its children sit in `ml-6 border-l border-border pl-1`.
    - Close focus:
      ```tsx
      onCloseAutoFocus={(event) => {
        const opener = returnFocusRef.current
        const shown = (el: HTMLElement | null | undefined): el is HTMLElement => Boolean(el?.isConnected && el.getClientRects().length > 0)
        const target = shown(opener) ? opener : Array.from(document.querySelectorAll<HTMLElement>('[aria-controls="mobile-more-sheet"]')).find(shown)
        if (!target) return
        event.preventDefault()
        target.focus()
      }}
      ```
    - Theme: `const faces = { light: useRef<HTMLDivElement>(null), dark: useRef<HTMLDivElement>(null) }` and `choose = (shown) => (value) => { if (value === shown) return; switchTheme()⏎faces[value]…focus() }` (⏎ is a newline).
      - Render, for each `shown` of `"light"` and `"dark"`: `<div ref={faces[shown]} data-when-theme={shown}><Segmented aria-label={t("moreTheme")} value={shown} options={[{ value: "light", label: t("themeLight") }, { value: "dark", label: t("themeDark") }]} onValueChange={choose(shown)} /></div>`.
  - **`dashboard-shell.tsx`:**
    - `const [moreSheetOpen, setMoreSheetOpen] = useState(false)` replaces `mobileSidebarOpen`.
    - `openMoreSheet = useCallback((trigger: HTMLButtonElement) => { moreTriggerRef.current = trigger; setMoreSheetOpen(true) }, [])`.
    - Drop `closeMobileSidebar` and the Sidebar's mobile props.
    - `Topbar` gets `onOpenMoreSheet={openMoreSheet} moreSheetOpen={moreSheetOpen}`. `MobileFieldNavigation` gets `moreOpen={moreSheetOpen} onOpenMore={openMoreSheet}`.
    - Inside the shell `<div ref={shellRef}>`, after the `MobileFieldNavigation` block and never between `</div>` and `</ShellNotificationsProvider>` (Task 3's pin in `tests/shell-notifications.test.ts` needs `</div>` directly before `</ShellNotificationsProvider>`): `<MobileMoreSheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen} user={user} account={account} returnFocusRef={moreTriggerRef} />`.
  - **`mobile-field-navigation.tsx`:** `moreActive` drives More's `text-primary` and its tile. `text-xs font-medium text-muted-foreground` stays at exactly 2 occurrences.
  - **`topbar.tsx`:**
    - The hamburger stays `<Button variant="ghost" size="icon"` with `tNav("openMenu")`, plus `aria-haspopup="dialog"`.
    - The title `<p>` goes after the desktop toggle, before `<GlobalSearch`. Task 7's bell wrapper may take the new class.
    - Delete the `{/* User Menu */}` block and `tAuth`, plus the imports this leaves unused: `LogOut`, `ChevronDown`, `signOut`, the `user-display` helpers, and `DropdownMenuItem` / `DropdownMenuLabel` / `DropdownMenuSeparator`.
  - **Messages:** write `{ "set": { "th": { "nav.moreLanguage": "ภาษา", "nav.moreTheme": "ธีม", "nav.themeLight": "สว่าง", "nav.themeDark": "มืด" }, "en": { "nav.moreLanguage": "Language", "nav.moreTheme": "Theme", "nav.themeLight": "Light", "nav.themeDark": "Dark" } }, "delete": ["nav.closeMenu"] }` to a scratch file outside the repo, then run `node scripts/messages-edit.mjs <file>`.
  - **`DESIGN.md` §5 Sidebar** (keep the meaning if Task 1 or 4 reworded these sentences):
    - "drawer ids are prefixed `mobile-` because the body renders twice" becomes "the phone's เพิ่มเติม sheet (`MobileMoreSheet`) renders the same permission-filtered sections as light rows, with ids prefixed `more-`".
    - "44px in the mobile drawer" becomes "48px rows in the phone's เพิ่มเติม sheet".

- [ ] **Step 4: Update existing pins** (as Tasks 1–8 leave them)
  - `tests/mobile-field-navigation-ui.test.ts`:
    - `:43`: drop `&& !mobileSidebarOpen`.
    - `:59-69`: the nav pins `moreOpen: boolean`, `aria-expanded={moreOpen}` and `aria-controls="mobile-more-sheet"`; the shell pins `moreOpen={moreSheetOpen}`; `mobile-more-sheet.tsx` pins `id="mobile-more-sheet"`.
    - `:71-81`: the shell pins `returnFocusRef={moreTriggerRef}`, and `<Sheet\b` moves to `mobile-more-sheet.tsx`.
  - `tests/sheet-drawers-ui.test.ts`:
    - `:47-54`: read `mobile-more-sheet.tsx` for `side="bottom"`…`id="mobile-more-sheet"` and `<SheetTitle className="sr-only">`. The sidebar keeps `hidden[^"]*lg:flex`, and the shell keeps its doesNotMatch.
    - `:56-60`: becomes the Step 1 `onCloseAutoFocus` regex, run on `mobile-more-sheet.tsx`.
  - `tests/shell-sweep-ui.test.ts`:
    - `:15`: the `size="md"` count becomes `1, "the language menu trigger"`.
    - `:20`: delete the avatar assert.
    - `:26-31` (Task 4's recoloured X): becomes "the sidebar has no drawer; its one raw button is the group row", with `doesNotMatch(/<Sheet\b|onMobileClose/)` and a `<button\b` count of 1. Drop the `import { Button }` match.
  - `tests/dropdown-menus-ui.test.ts`:
    - `:47`: `<DropdownMenu\b` at least 1.
    - `:55`: delete the `userMenu` aria-label pin.
    - `:56`: add `mobile-more-sheet.tsx` to the loop.
    - `:61`: drop `"closeMenu"`; `userMenu` and its `{name}` check stay.
    - Rename the test "topbar language menu is a Radix dropdown".
  - `tests/dark-mode-s.test.ts:99`: becomes `/<span lang="en">English<\/span>[\s\S]*?<\/DropdownMenu>\n {8}<\/div>\n\n {8}<div className="hidden lg:block">\n {10}<ThemeToggle \/>\n {8}<\/div>\n/`. `<ThemeToggle />` still occurs once.
  - `tests/menu-b-shell-topbar.test.ts` (Task 6):
    - drop `"{/* User Menu */}"` from the order markers; Task 7's bell marker stays;
    - the `User Menu … lg:hidden` match becomes `assert.doesNotMatch(topbar, /User Menu/)`.
  - `tests/notification-bell.test.ts` (Task 7): `/<div className="relative shrink-0">\s*<NotificationBell user=\{user\} \/>\s*<\/div>/` becomes `/<div className=\{cn\("relative shrink-0", !mobileNavigationMode && "hidden lg:block"\)\}>\s*<NotificationBell user=\{user\} \/>\s*<\/div>/`.
  - `tests/sidebar-menu-b.test.ts` (Task 4): the `{mobile ? null : <SidebarAccount …/>}` pin becomes `/<SidebarAccount user=\{user\} account=\{account\} collapsed=\{collapsed\} \/>/`.
  - `tests/sidebar-rail.test.ts` (Task 5): `<TooltipProvider delayDuration=\{300\}>\s*\{renderBody\(false\)\}` becomes `<TooltipProvider delayDuration=\{300\}>\s*\{\/\* Brand \*\/\}`.
  - `tests/visual-foundation-guards.test.ts`:
    - `:384`: the `why` reads "opens the เพิ่มเติม sheet".
    - Add `"src/components/layout/mobile-more-sheet.tsx": { count: 1, kind: "permanent", why: "a menu group row of the เพิ่มเติม sheet that opens and closes its group, styled as the sheet's navigation rows", ruling: "menu B shell task 9" },`.
  - `tests/list-frame-guards.test.ts:120`: add `"layout/mobile-more-sheet.tsx"` to `NAV_PRIMITIVES`.
  - Check that these still pass unchanged:
    - `visual-foundation-guards.test.ts:136-142`
    - `guard-lock-sweep-ui.test.ts:23-27`
    - `dark-mode-t.test.ts:121-127`
    - `form-migration-guards.test.ts:156`
    - `dashboard-shell-theme.test.ts`
    - `sidebar-menu-structure.test.ts`
    - `mobile-field-navigation.test.ts`
    - the `themeAware` guard in `dark-mode-s.test.ts`

- [ ] **Step 5: Verify**
```
node --test tests/mobile-more-sheet.test.ts tests/mobile-more-sheet-ui.test.ts tests/mobile-field-navigation-ui.test.ts tests/sheet-drawers-ui.test.ts tests/shell-sweep-ui.test.ts tests/dropdown-menus-ui.test.ts tests/dark-mode-s.test.ts tests/menu-b-shell-topbar.test.ts tests/sidebar-menu-b.test.ts tests/sidebar-rail.test.ts tests/navigation-active.test.ts tests/notification-bell.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/ui-overlay-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts
npm test
npx tsc --noEmit -p .
npm run lint
```
Expected: every listed file passes, `npm test` is all green, tsc reports 0 errors and lint reports 0 errors.

- [ ] **Step 6: Commit**
```
git add src/components/layout/mobile-more-sheet.tsx src/lib/sheet-swipe.ts src/lib/locale-path.ts src/lib/user-display.ts src/lib/navigation-active.ts src/components/layout/sidebar.tsx src/components/layout/dashboard-shell.tsx src/components/layout/mobile-field-navigation.tsx src/components/layout/topbar.tsx src/components/layout/theme-toggle.tsx messages/th.json messages/en.json DESIGN.md tests/mobile-more-sheet.test.ts tests/mobile-more-sheet-ui.test.ts tests/mobile-field-navigation-ui.test.ts tests/sheet-drawers-ui.test.ts tests/shell-sweep-ui.test.ts tests/dropdown-menus-ui.test.ts tests/dark-mode-s.test.ts tests/menu-b-shell-topbar.test.ts tests/sidebar-menu-b.test.ts tests/sidebar-rail.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/notification-bell.test.ts
git commit -m "feat(shell): the phone's More opens a bottom sheet with the person, the menu, language, theme and sign-out (menu B shell task 9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The banner region and offline

**Files:**
- Create: `src/lib/shell-banner.ts`, `src/lib/use-online-status.ts`, `src/components/layout/shell-banner.tsx`
- Modify: `src/components/layout/dashboard-shell.tsx` (after Task 6; anchor by content), `src/components/audit/audit-scan-workspace.tsx` (`useState(true)` for `online`, `setOnline(navigator.onLine)` in the first `setTimeout` effect, the `handleOnline`/`handleOffline` effect), `src/components/audit/audit-scan-offline-bar.tsx:24-34`
- Modify: `e2e/audit/scan-steps.ts:10`, `e2e/audit/field-audit.spec.ts:262-277`, `DESIGN.md` (the audit scan "**Offline:**" bullet), `docs/18_AUDIT_SCAN_GUIDE_TH.md:49`, `messages/th.json`, `messages/en.json`
- Test: Create `tests/menu-b-shell-banner.test.ts`; existing pins in Step 4

**Interfaces:**
- Consumes: Task 6's `--shell-banner` / `--shell-top` and the shell column (`<Topbar>` then `<main id="main">`); Task 3's `ShellNotificationsProvider` (`<ShellBannerProvider>` goes outside `<ConfirmProvider>`, so Task 3's provider pin still holds; see Step 3).
- Produces:
  - `src/lib/use-online-status.ts`: `useOnlineStatus(): boolean` (`true` in server render and hydration, then `navigator.onLine`); `readOnlineStatus(nav: { onLine: boolean } | undefined): boolean`; `subscribeOnlineStatus(target: Pick<EventTarget, "addEventListener" | "removeEventListener">, onChange: () => void): () => void`.
  - `src/lib/shell-banner.ts`: `type ShellBannerView<S> = { kind: "offline"; pageLine: string | null } | { kind: "session"; session: S } | null`; `pickShellBanner<S>(input: { online: boolean; session: S | null; pageLine: string | null }): ShellBannerView<S>`.
  - `src/components/layout/shell-banner.tsx`: `ShellBannerProvider({ children }: { children: React.ReactNode })`, `ShellBanner()`, `useShellBannerSlot(line: string | null): void` (cleared on unmount), `useShellBannerSession(content: React.ReactNode | null): void` (Task 12a; hidden while offline).
  - `e2e/audit/scan-steps.ts`: `shellBanner(page: Page): Locator`.
  - The bar's guard `if (queue.length === 0 || (!online && failed.length === 0)) return null`, which Task 12b extends.

**Decisions:**
- Priority (spec §6.7): offline → the offline message (with the page's line as its second clause when a page set one); online → the session message; a page line never shows alone online; otherwise empty.
- The region is always mounted (empty when nothing shows), `role="status"`, `data-shell-banner`, directly after `<Topbar>` and outside `<main>` (E2E `roles-ui.ts:29-30` scans `main button`).
- Its height goes into `--shell-banner` via `ResizeObserver` (skipped when undefined), removed on unmount; no `scroll-padding-top` (Task 6).
- Two contexts, stable setters apart from state, so a page calling a slot hook never re-renders on banner changes (a `ReactNode` slot would loop).
- `useShellBannerSession` callers pass a memoized element; ticking digits `aria-hidden`; the screen-reader sentence changes at most once a minute.
- The scan page's line replaces the general second clause (user decision 2026-10-25). Offline, the banner reads `common.offlineBannerWith` "ออฟไลน์อยู่ · {detail}", with the page line as `detail`. The scan page always sets a line: "การตรวจนับ N รายการรอส่ง จะส่งเองเมื่อออนไลน์" when 1+ items are queued, else `auditScan.bannerOfflineSaves` "ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์". Every other page shows `common.offlineBanner` as the spec words it.
- Only the scan page's status line moves: the bar keeps "รอส่ง N รายการ" with the busy "ส่งตอนนี้" online, and the failed list with "ลบออกจากคิว" online or offline (`role="status"`, `data-audit-scan-offline`, `className="mb-2"` kept).
- `useOnlineStatus` stays in `src/lib/` (contract name), `"use client"`, imports only `react` (the Node test imports it), the `use-media-query.ts` pattern; online/offline listeners are outside the `ui-overlay-guards` listener guard (no allow-list entry).
- This task owns the audit E2E edit and the pin `tests/e2e-audit.test.ts:160`, because it deletes `auditScan.offlineBarOffline`; Task 13A does not repeat it.
- `navigator.onLine` checks inside `sendQueue`, `syncNow` and the lookup stay.

- [ ] **Step 1: Write the failing tests** in `tests/menu-b-shell-banner.test.ts`:
```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { pickShellBanner } from "../src/lib/shell-banner.ts"
import { readOnlineStatus, subscribeOnlineStatus } from "../src/lib/use-online-status.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")

test("offline wins the banner and carries the page's line; the session message shows only online (menu B shell §6.7)", () => {
  assert.equal(pickShellBanner({ online: true, session: null, pageLine: null }), null)
  assert.equal(pickShellBanner({ online: true, session: null, pageLine: "q" }), null, "the page line rides on the offline message only")
  assert.deepEqual(pickShellBanner({ online: false, session: null, pageLine: null }), { kind: "offline", pageLine: null })
  assert.deepEqual(pickShellBanner({ online: false, session: "s", pageLine: "q" }), { kind: "offline", pageLine: "q" })
  assert.deepEqual(pickShellBanner({ online: true, session: "s", pageLine: "q" }), { kind: "session", session: "s" })
})

test("useOnlineStatus reads navigator.onLine (true with no navigator) and follows the online and offline events", () => {
  assert.equal(readOnlineStatus(undefined), true)
  assert.equal(readOnlineStatus({ onLine: false }), false)
  const target = new EventTarget(); let calls = 0
  const stop = subscribeOnlineStatus(target, () => { calls += 1 })
  target.dispatchEvent(new Event("offline")); target.dispatchEvent(new Event("online"))
  assert.equal(calls, 2)
  stop(); target.dispatchEvent(new Event("offline"))
  assert.equal(calls, 2)
  assert.match(read("src/lib/use-online-status.ts"), /useSyncExternalStore\(\s*\(onChange\) => subscribeOnlineStatus\(window, onChange\),\s*\(\) => readOnlineStatus\(navigator\),\s*\(\) => true,?\s*\)/)
})

test("the shell has one banner region between the top bar and main: a polite status in the warning fill, its height in --shell-banner (§6.7, The One Banner Rule)", () => {
  const banner = read("src/components/layout/shell-banner.tsx")
  assert.match(banner, /<div\s+ref=\{regionRef\}\s+role="status"\s+data-shell-banner/)
  assert.match(banner, /"flex items-start gap-2 border-b border-warning-border bg-warning-soft px-4 py-2 text-sm text-warning sm:px-6"/)
  assert.match(banner, /const online = useOnlineStatus\(\)/)
  assert.match(banner, /pickShellBanner\(\{ online, session, pageLine \}\)/)
  assert.match(banner, /tCommon\("offlineBanner"\)/)
  assert.match(banner, /view\.pageLine \? tCommon\("offlineBannerWith", \{ detail: view\.pageLine \}\) : tCommon\("offlineBanner"\)/)
  assert.match(banner, /<WifiOff aria-hidden="true"/)
  assert.match(banner, /new ResizeObserver\(/)
  assert.match(banner, /setProperty\("--shell-banner", /)
  assert.match(banner, /removeProperty\("--shell-banner"\)/)
  assert.equal(banner.match(/createContext</g)?.length, 2, "stable setters apart from the state, so a slot never re-renders itself")
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /<ShellBannerProvider>/)
  const at = ["<Topbar", "<ShellBanner />", "<main"].map((m) => shell.indexOf(m))
  assert.ok(at[0] > 0 && at[0] < at[1] && at[1] < at[2], `order ${at}`)
})

test("the audit scan page's offline line moves into the region; its queue tools stay on the page (§6.7 ruling)", () => {
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /const online = useOnlineStatus\(\)/)
  assert.match(workspace, /useShellBannerSlot\(queue\.length > 0 \? t\("bannerQueued", \{ count: queue\.length \}\) : t\("bannerOfflineSaves"\)\)/)
  assert.doesNotMatch(workspace, /setOnline|addEventListener\("offline"/)
  assert.match(workspace, /window\.addEventListener\("online", handleOnline\)/)
  const bar = read("src/components/audit/audit-scan-offline-bar.tsx")
  assert.match(bar, /const failed = queue\.filter\(\(entry\) => entry\.syncStatus === "failed"\)\n\s+if \(queue\.length === 0 \|\| \(!online && failed\.length === 0\)\) return null/)
  assert.match(bar, /title=\{t\("offlineBarPending", \{ count: queue\.length \}\)\}/)
  assert.doesNotMatch(bar, /offlineBarOffline/)
  const copy = {
    th: ["ออฟไลน์อยู่ · บันทึกไม่ได้จนกว่าจะกลับมาออนไลน์", "การตรวจนับ {count} รายการรอส่ง จะส่งเองเมื่อออนไลน์", "ออฟไลน์อยู่ · {detail}", "ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์"],
    en: ["You're offline · Nothing can be saved until you're back online", "{count} audit checks waiting to send · they send by themselves once you're online", "You're offline · {detail}", "Checks are kept on this device and send by themselves once you're online"],
  }
  for (const [locale, [offline, queued, offlineWith, offlineSaves]] of Object.entries(copy)) {
    const messages = JSON.parse(read(`messages/${locale}.json`))
    assert.equal(messages.common.offlineBanner, offline, locale)
    assert.equal(messages.auditScan.bannerQueued, queued, locale)
    assert.equal(messages.common.offlineBannerWith, offlineWith, locale)
    assert.equal(messages.auditScan.bannerOfflineSaves, offlineSaves, locale)
    assert.equal(messages.auditScan.offlineBarOffline, undefined, locale)
  }
})
```

- [ ] **Step 2: Run them and see them fail.** `node --test tests/menu-b-shell-banner.test.ts`: the file fails to load, `ERR_MODULE_NOT_FOUND` for `../src/lib/shell-banner.ts`.

- [ ] **Step 3: Implement**
  - `shell-banner.ts`: the signature above; `session == null` is no session. `use-online-status.ts`: the three exports; the hook is exactly the pinned call `useSyncExternalStore((onChange) => subscribeOnlineStatus(window, onChange), () => readOnlineStatus(navigator), () => true)`. The client snapshot runs only in the browser, so it reads `navigator` directly, and the server snapshot is `true`.
  - `shell-banner.tsx` (`"use client"`):
    ```tsx
    const noop = () => {}
    const SettersContext = createContext<{ setPageLine: (line: string | null) => void; setSession: (content: React.ReactNode | null) => void }>({ setPageLine: noop, setSession: noop })
    const StateContext = createContext<{ pageLine: string | null; session: React.ReactNode | null }>({ pageLine: null, session: null })
    // Provider: two useState; setters memoized once; state memoized on [pageLine, session].
    // useShellBannerSlot(line): useEffect(() => { setPageLine(line); return () => setPageLine(null) }, [line, setPageLine]); useShellBannerSession: the same with setSession.
    ```
    `ShellBanner`: `<div ref={regionRef} role="status" data-shell-banner className={cn("shrink-0", view && "<the pinned class>")}>`. Offline: `<WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />` and `<p className="min-w-0">` with the pinned `view.pageLine ? tCommon("offlineBannerWith", { detail: view.pageLine }) : tCommon("offlineBanner")`. Session: `view.session` as given. A mount-only effect observes the region and writes `document.documentElement.style.setProperty("--shell-banner", `${region.offsetHeight}px`)`; cleanup `disconnect()` and `removeProperty("--shell-banner")`.
  - `dashboard-shell.tsx`: `<ShellBannerProvider>` is the outermost element of the return, around `<ConfirmProvider>`. Leave `<ConfirmProvider>`, `<ShellNotificationsProvider>` and `<div ref={shellRef}>` nested as they are (Task 3's provider pin in `tests/shell-notifications.test.ts` reads them in that order). Task 12a later puts `<SessionKeeper … />` first inside `<ShellBannerProvider>`. Put `<ShellBanner />` directly after `<Topbar … />`.
  - `audit-scan-workspace.tsx`: `const online = useOnlineStatus()` replaces the state; drop `setOnline(navigator.onLine)` and `handleOffline` with its listeners; `handleOnline` keeps `void sendQueue()`; add the pinned `useShellBannerSlot(…)` call.
  - `audit-scan-offline-bar.tsx`: `failed` first, then the pinned guard; title always `offlineBarPending`; the send `Button` stays `online && queue.length > 0`.
  - Messages (change file in the scratchpad, `node scripts/messages-edit.mjs <file>`):
    ```json
    { "set": {
        "th": { "common.offlineBanner": "ออฟไลน์อยู่ · บันทึกไม่ได้จนกว่าจะกลับมาออนไลน์", "auditScan.bannerQueued": "การตรวจนับ {count} รายการรอส่ง จะส่งเองเมื่อออนไลน์", "common.offlineBannerWith": "ออฟไลน์อยู่ · {detail}", "auditScan.bannerOfflineSaves": "ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์" },
        "en": { "common.offlineBanner": "You're offline · Nothing can be saved until you're back online", "auditScan.bannerQueued": "{count} audit checks waiting to send · they send by themselves once you're online", "common.offlineBannerWith": "You're offline · {detail}", "auditScan.bannerOfflineSaves": "Checks are kept on this device and send by themselves once you're online" } },
      "delete": ["auditScan.offlineBarOffline"] }
    ```
  - E2E (the run is Task 13B):
    - `e2e/audit/scan-steps.ts`, after `offlineBar`: `export const shellBanner = (page: Page): Locator => page.locator("[data-shell-banner]")`.
    - `field-audit.spec.ts:263` → `await expect(scan.shellBanner(page)).toContainText("ออฟไลน์อยู่ · ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์")` (nothing queued yet; if the spec has queued an item by then, expect the `bannerQueued` form instead).
    - `field-audit.spec.ts:268` → `await expect(scan.shellBanner(page)).toContainText("ออฟไลน์อยู่ · การตรวจนับ 1 รายการรอส่ง จะส่งเองเมื่อออนไลน์")`.
    - After `:276` (kept): `await expect(scan.shellBanner(page)).not.toContainText("ออฟไลน์อยู่")`.
  - `DESIGN.md` **Offline:** bullet: saves queue on the device and rows show "รอส่ง"; offline, the shell's banner region (The One Banner Rule) shows "ออฟไลน์อยู่ · การตรวจนับ N รายการรอส่ง จะส่งเองเมื่อออนไลน์" (or "ออฟไลน์อยู่ · ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์" with nothing queued); online, the page's warning `Notice` shows "รอส่ง N รายการ" with a busy "ส่งตอนนี้"; failed saves stay listed with "ลบออกจากคิว"; the queue sends itself when the connection returns.
  - `docs/18_AUDIT_SCAN_GUIDE_TH.md:49`: "มีแถบ **ออฟไลน์ · รอส่ง N รายการ**" → "แถบใต้แถบบนขึ้น **ออฟไลน์อยู่ · การตรวจนับ N รายการรอส่ง จะส่งเองเมื่อออนไลน์** (ถ้ายังไม่มีรายการรอส่ง จะขึ้น **ออฟไลน์อยู่ · ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์**)"; keep the "ส่งตอนนี้" / "ลบออกจากคิว" sentence.
  - E2E impact: the empty, always-mounted status region leaves `e2e/transactions/cancel.spec.ts:70` and `e2e/audit/scan-steps.ts:39` unaffected.

- [ ] **Step 4: Update existing pins**
  - `tests/audit-scan-offline-ux.test.ts:12`: `addEventListener("offline"` → `/const online = useOnlineStatus\(\)/`.
  - `tests/audit-scan-offline-ux.test.ts:32`, `tests/audit-scan-workspace-ui.test.ts:119`: in the key lists `"offlineBarOffline"` → `"bannerQueued"`.
  - `tests/audit-scan-feedback-transition.test.ts:26` → `/if \(queue\.length === 0 \|\| \(!online && failed\.length === 0\)\) return null/`.
  - `tests/audit-scan-sweep-ui.test.ts:156`: the title part → `title=\{t\("offlineBarPending", \{ count: queue\.length \}\)\}`.
  - `tests/e2e-audit.test.ts:160` → `assert.ok(room.includes(thai("common").offlineBannerWith.replace("{detail}", words.bannerQueued.replace("{count}", "1"))) && room.includes(thai("common").offlineBannerWith.replace("{detail}", words.bannerOfflineSaves)) && room.includes(words.pendingLink))`.
  - Still pass unchanged: `audit-scan-workspace-ui.test.ts:40`, `audit-scan-offline-ux.test.ts:10,11,15,19-24`, `list-frame-guards.test.ts:171`.

- [ ] **Step 5: Verify.** `node --test tests/menu-b-shell-banner.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-scan-workspace-ui.test.ts tests/audit-scan-feedback-transition.test.ts tests/audit-scan-sweep-ui.test.ts tests/e2e-audit.test.ts tests/list-frame-guards.test.ts tests/ui-overlay-guards.test.ts tests/visual-foundation-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`, then `npm test`, `npx tsc --noEmit -p .`, `npm run lint`: all pass, 0 lint errors.

- [ ] **Step 6: Commit**
```
git add src/lib/shell-banner.ts src/lib/use-online-status.ts src/components/layout/shell-banner.tsx src/components/layout/dashboard-shell.tsx src/components/audit/audit-scan-workspace.tsx src/components/audit/audit-scan-offline-bar.tsx e2e/audit/scan-steps.ts e2e/audit/field-audit.spec.ts DESIGN.md docs/18_AUDIT_SCAN_GUIDE_TH.md messages/th.json messages/en.json tests/menu-b-shell-banner.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-scan-workspace-ui.test.ts tests/audit-scan-feedback-transition.test.ts tests/audit-scan-sweep-ui.test.ts tests/e2e-audit.test.ts
git commit -m "feat(shell): one banner region under the top bar that says when the app is offline, with the audit scan queue line moved into it and its queue tools left on the page (menu B shell task 10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The session on the server

**Files:**
- Create: `src/lib/session-deadline.ts`, `src/app/api/session/status/route.ts`, `src/app/api/session/keep-alive/route.ts`
- Modify: `src/lib/auth.ts` (imports, the `NextAuth(` export line, `session.maxAge`, the `jwt` and `session` callbacks), `src/types/next-auth.d.ts`, `src/lib/auth-utils.ts` (after `requireAuth`), `src/lib/page-auth.ts` (`redirectToLogin`), `src/lib/login-redirect.ts` (`buildLoginHref`), `src/lib/rbac-route-matrix.ts`, `src/lib/api-error-catalog.ts`, `src/lib/session-access-cache.ts:4-5`, `playwright.config.ts` (webServer `env`), `messages/th.json`, `messages/en.json`
- Test: create `tests/session-deadline.test.ts`, `tests/session-server.test.ts`; append to `tests/login-redirect.test.ts`, `tests/rbac-route-matrix.test.ts`, `tests/api-error-catalog.test.ts`; pins in `tests/login-deep-link.test.ts:32`, `tests/e2e-review.test.ts:79`, `tests/dark-mode-s.test.ts`

**Interfaces:**
- Consumes: `refreshSessionToken(token, loadSnapshot)` (`src/lib/session-access.ts:33`, unchanged); `errorResponse(error)` (`src/lib/api-response.ts:6`: `"Unauthorized"` → 401, `"Forbidden…"` → 403); Task 5's `cookies()` allowed list in `tests/dark-mode-s.test.ts`.
- Produces in `src/lib/session-deadline.ts` (pure, no imports, epoch seconds):
  - `DEFAULT_SESSION_IDLE_SECONDS = 3600`, `DEFAULT_SESSION_CEILING_SECONDS = 43200`; `readSessionSeconds(value: string | undefined, fallback: number): number`
  - `sessionDeadlines(token: { loginAt?: number; activeAt?: number }, now: number, idleSeconds: number, ceilingSeconds: number): { idleDeadline: number; ceilingDeadline: number; expired: boolean }`
  - `type SessionClock = { loginAt: string; activeAt: string; idleDeadline: string; ceilingDeadline: string }` (ISO); `type SessionStatusResponse = SessionClock & { serverNow: string }`
  - `sessionClock(token: { loginAt?: number; activeAt?: number }, idleSeconds: number, ceilingSeconds: number): SessionClock | null`
  - `continueSessionToken<T extends { loginAt?: unknown; activeAt?: unknown }>(token: T, options: { trigger?: string; now: number; idleSeconds: number; ceilingSeconds: number; refresh: (token: T) => Promise<T | null> }): Promise<T | null>`
  - `isSessionCookieName(name: string): boolean`; `isSameOriginRequest(request: { origin: string | null; host: string | null; forwardedHost: string | null; allowedOrigins: string[] }): boolean`
- Produces elsewhere:
  - `buildLoginHref(locale: string, requestPath: string | null | undefined, options?: { reason?: "session-expired" }): string`
  - `auth.ts` exports `unstable_update`; `Session.clock?: SessionClock`; `JWT.loginAt?: number`, `JWT.activeAt?: number`.
  - `auth-utils.ts`: `getShellSession(): Promise<{ user: SessionUser; clock: SessionClock | null } | null>`, `requireSessionClock(): Promise<SessionClock>`, `extendSession(): Promise<SessionClock>` (both throw `Error("Unauthorized")`).
  - `GET /api/session/status` → 200 `SessionStatusResponse` | 401 `{ error: "Unauthorized" }`. `POST /api/session/keep-alive` → the same, or 403 `{ error: "Forbidden: cross-site request" }`.
  - `export const sessionAuthApiRouteSnippets = ["requireAuth(", "requireSessionClock(", "extendSession("] as const` (`rbac-route-matrix.ts`); message `apiErrors.crossSiteRequest`.

**Decisions:**
- The idle and ceiling rules are JWT claims `loginAt`/`activeAt` (epoch seconds): no table, no DB write. `maxAge` = the ceiling.
- Only `trigger === "update"` (`unstable_update` in the keep-alive) moves `activeAt`. A read (`auth()`, the status route) never does, so background polls never extend a session. `loginAt` never moves.
- An expired or claimless token returns `null` before the access refresh, so there is no DB read. Tokens signed before this task have no claims: everyone signs in once after the deploy.
- A blank, non-numeric, zero, negative or fractional `SESSION_IDLE_SECONDS`/`SESSION_CEILING_SECONDS` falls back to 3600/43200 and never signs everyone out (Review Focus F4).
- Both endpoints are route handlers, not server actions. They throw and answer through `errorResponse`, so a 401 is `{ error: "Unauthorized" }`, not the spike's `{ expired: true }`.
- The 200 body is wider than the contract's two fields: `activeAt` keeps the keep-alive throttle across reloads, `loginAt` gives `{hours}`, `serverNow` corrects clock skew.
- Keep-alive origin check (production sits behind Nginx and Cloudflare Tunnel, `docs/02_ARCHITECTURE.md:68`):
  - A missing Origin passes (the cookie is `SameSite=Lax`).
  - An unparseable Origin fails, including `"null"`.
  - An Origin passes when it equals the `AUTH_URL`/`NEXTAUTH_URL` origin, or when its `url.host` equals the first `x-forwarded-host` entry or `host`.
  - A refusal throws before `extendSession()`.
- `redirectToLogin` adds `reason=session-expired` when a session cookie exists without a session. This covers a reload or deep link after the client missed the deadline. The proxy never calls `auth()`, so it never rewrites or clears that cookie.
- `page-auth.ts` now calls `cookies()`, so it joins Task 5's allowed list.
- `SESSION_IDLE_SECONDS: "10800"` goes in the E2E webServer env. The suite reuses one sign-in for up to its 90-minute `globalTimeout`, so no spec reaches a warning or an idle sign-out.

- [ ] **Step 1: Write the failing tests**

`tests/session-deadline.test.ts` (imports `assert`, `test` and all exports of `../src/lib/session-deadline.ts`):
```ts
test("the defaults are 60 idle minutes and a 12-hour ceiling", () => {
  assert.equal(DEFAULT_SESSION_IDLE_SECONDS, 3600); assert.equal(DEFAULT_SESSION_CEILING_SECONDS, 43200)
})
test("a bad limit falls back to the default and never signs everyone out (Review Focus F4)", () => {
  for (const fallback of [DEFAULT_SESSION_IDLE_SECONDS, DEFAULT_SESSION_CEILING_SECONDS]) {
    assert.equal(readSessionSeconds(undefined, fallback), fallback)
    for (const bad of ["", " ", "abc", "0", "-5", "90.5", "1e3"]) assert.equal(readSessionSeconds(bad, fallback), fallback, bad)
    assert.equal(readSessionSeconds("7200", fallback), 7200); assert.equal(readSessionSeconds(" 60 ", fallback), 60)
  }
})
test("the idle deadline is the last activity plus the idle limit, capped by the ceiling", () => {
  assert.deepEqual(sessionDeadlines({ loginAt: 1000, activeAt: 2000 }, 2500, 3600, 43200), { idleDeadline: 5600, ceilingDeadline: 44200, expired: false })
  assert.deepEqual(sessionDeadlines({ loginAt: 0, activeAt: 42000 }, 42100, 3600, 43200), { idleDeadline: 43200, ceilingDeadline: 43200, expired: false })
})
test("a session expires after its deadline second, not at it", () => {
  assert.equal(sessionDeadlines({ loginAt: 0, activeAt: 100 }, 3700, 3600, 43200).expired, false)
  assert.equal(sessionDeadlines({ loginAt: 0, activeAt: 100 }, 3701, 3600, 43200).expired, true)
  assert.equal(sessionDeadlines({ loginAt: 0, activeAt: 43000 }, 43201, 3600, 43200).expired, true)
})
test("a token signed before the claims existed counts as expired", () => {
  assert.deepEqual(sessionDeadlines({}, 100, 3600, 43200), { idleDeadline: 0, ceilingDeadline: 0, expired: true })
  assert.equal(sessionDeadlines({ loginAt: 5 }, 100, 3600, 43200).expired, true)
  assert.equal(sessionDeadlines({ loginAt: Number.NaN, activeAt: 5 }, 100, 3600, 43200).expired, true)
})
const limits = { idleSeconds: 3600, ceilingSeconds: 43200 }
test("a read keeps activeAt and only an update moves it; loginAt never moves", async () => {
  let refreshes = 0
  const refresh = async <T,>(token: T) => { refreshes += 1; return token }
  const token = { id: "user-1", loginAt: 0, activeAt: 100 }
  assert.deepEqual(await continueSessionToken(token, { ...limits, now: 200, refresh }), token)
  assert.deepEqual(await continueSessionToken(token, { ...limits, trigger: "update", now: 200, refresh }), { id: "user-1", loginAt: 0, activeAt: 200 })
  assert.equal(refreshes, 2)
})
test("an expired or claimless token ends without a database read, even on an update", async () => {
  let refreshes = 0
  const refresh = async <T,>(token: T) => { refreshes += 1; return token }
  assert.equal(await continueSessionToken({ id: "u", loginAt: 0, activeAt: 100 }, { ...limits, trigger: "update", now: 3701, refresh }), null)
  assert.equal(await continueSessionToken({ id: "u" }, { ...limits, now: 10, refresh }), null)
  assert.equal(refreshes, 0)
})
test("a refresh that ends the session (an inactive user) wins over an update", async () => {
  assert.equal(await continueSessionToken({ id: "u", loginAt: 0, activeAt: 100 }, { ...limits, trigger: "update", now: 200, refresh: async () => null }), null)
})
test("the clock the client gets is ISO time", () => {
  assert.deepEqual(sessionClock({ loginAt: 1_700_000_000, activeAt: 1_700_000_600 }, 3600, 43200), {
    loginAt: "2023-11-14T22:13:20.000Z", activeAt: "2023-11-14T22:23:20.000Z",
    idleDeadline: "2023-11-14T23:23:20.000Z", ceilingDeadline: "2023-11-15T10:13:20.000Z" })
  assert.equal(sessionClock({}, 3600, 43200), null)
})
test("session cookie names, chunked and behind HTTPS", () => {
  for (const name of ["authjs.session-token", "authjs.session-token.0", "__Secure-authjs.session-token.1"]) assert.equal(isSessionCookieName(name), true, name)
  for (const name of ["authjs.csrf-token", "__Host-authjs.csrf-token", "authjs.callback-url", "theme", "authjs.session-token.x"]) assert.equal(isSessionCookieName(name), false, name)
})
test("the keep-alive accepts its own origin behind Nginx and refuses another site", () => {
  const base = { host: "asset.company.test", forwardedHost: null, allowedOrigins: [] as string[] }
  assert.equal(isSameOriginRequest({ ...base, origin: null }), true)
  assert.equal(isSameOriginRequest({ ...base, origin: "https://asset.company.test" }), true)
  assert.equal(isSameOriginRequest({ origin: "https://asset.company.test", host: "localhost:3000", forwardedHost: "asset.company.test", allowedOrigins: [] }), true)
  assert.equal(isSameOriginRequest({ origin: "https://asset.company.test", host: "127.0.0.1:3000", forwardedHost: null, allowedOrigins: ["https://asset.company.test"] }), true)
  assert.equal(isSameOriginRequest({ ...base, origin: "https://evil.test" }), false)
  assert.equal(isSameOriginRequest({ ...base, origin: "null" }), false)
  assert.equal(isSameOriginRequest({ ...base, origin: "not a url" }), false)
})
```

`tests/session-server.test.ts` (source-reading; `const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")`):
```ts
test("auth.ts carries the idle and ceiling claims and slides only on an update", () => {
  const s = read("src/lib/auth.ts")
  assert.match(s, /export const \{ handlers, auth, signIn, signOut, unstable_update \} = NextAuth\(/)
  assert.match(s, /readSessionSeconds\(process\.env\.SESSION_IDLE_SECONDS, DEFAULT_SESSION_IDLE_SECONDS\)/)
  assert.match(s, /readSessionSeconds\(process\.env\.SESSION_CEILING_SECONDS, DEFAULT_SESSION_CEILING_SECONDS\)/)
  assert.match(s, /maxAge: sessionCeilingSeconds/)
  assert.match(s, /async jwt\(\{ token, user, trigger \}\)/)
  assert.match(s, /token\.loginAt = now\n\s+token\.activeAt = now\n\s+return token/)
  assert.match(s, /continueSessionToken\(token, \{/)
  assert.match(s, /refreshSessionToken\(current, getUserAccessSnapshot\)/)
  assert.match(s, /session\.clock = sessionClock\(token, sessionIdleSeconds, sessionCeilingSeconds\)/)
  assert.doesNotMatch(s, /8 \* 60 \* 60/)
})
test("the status route reads, the keep-alive route extends; both are route handlers, not server actions", () => {
  const status = read("src/app/api/session/status/route.ts")
  assert.match(status, /export async function GET\(\)/); assert.match(status, /await requireSessionClock\(\)/)
  assert.match(status, /serverNow: new Date\(\)\.toISOString\(\)/); assert.match(status, /errorResponse\(error\)/)
  assert.doesNotMatch(status, /unstable_update|extendSession/)
  const keep = read("src/app/api/session/keep-alive/route.ts")
  assert.match(keep, /export async function POST\(request: Request\)/); assert.match(keep, /isSameOriginRequest\(\{/)
  assert.match(keep, /throw new Error\("Forbidden: cross-site request"\)/); assert.match(keep, /await extendSession\(\)/)
  for (const s of [status, keep]) assert.doesNotMatch(s, /"use server"/)
  const utils = read("src/lib/auth-utils.ts")
  assert.match(utils, /export async function requireSessionClock\(\): Promise<SessionClock>/)
  assert.match(utils, /export async function extendSession\(\): Promise<SessionClock>/)
  assert.match(utils, /await unstable_update\(\{\}\)/)
  assert.match(utils, /export async function getShellSession\(\)/)
})
test("the proxy never calls auth, so it never re-writes or clears the session cookie", () => {
  assert.doesNotMatch(read("src/proxy.ts"), /lib\/auth["']|\bauth\(/)
})
```

Appends:
```ts
// tests/login-redirect.test.ts
test("an expired session's login link carries the reason before the page", () => {
  assert.equal(buildLoginHref("th", "/th/assets?view=a", { reason: "session-expired" }), "/th/login?reason=session-expired&callbackUrl=%2Fth%2Fassets%3Fview%3Da")
  for (const path of ["/th", null, "//evil.test/th/a"]) assert.equal(buildLoginHref("th", path, { reason: "session-expired" }), "/th/login?reason=session-expired", String(path))
})
// tests/rbac-route-matrix.test.ts
test("the session endpoints count as session-protected routes", () => {
  for (const file of ["src/app/api/session/status/route.ts", "src/app/api/session/keep-alive/route.ts"])
    assert.equal(classifyApiRouteProtection(file, readFileSync(file, "utf8")).status, "protected", file)
})
// tests/api-error-catalog.test.ts
test("a cross-site keep-alive has its own message", () => {
  assert.equal(getApiErrorKey("Forbidden: cross-site request"), "crossSiteRequest")
})
```

- [ ] **Step 2: Run them and see them fail.** `node --test tests/session-deadline.test.ts tests/session-server.test.ts tests/login-redirect.test.ts tests/rbac-route-matrix.test.ts tests/api-error-catalog.test.ts`. Expected failures:
  - `ERR_MODULE_NOT_FOUND` for `session-deadline.ts`, and `ENOENT` for the routes.
  - The reason cases still return `/th/login?callbackUrl=…`.
  - `getApiErrorKey` returns `null`, and the `auth.ts` pins do not match.

- [ ] **Step 3: Implement.** Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` and `…/01-app/02-guides/server-actions.md` first. Then read the spike with `git show 5c5aba21 -- src/lib/auth.ts src/lib/page-auth.ts src/app/api/session` (leave `spike-session/*` behind).
  - `session-deadline.ts`:
    - `readSessionSeconds` accepts `^\d+$` after trim, above 0.
    - `sessionDeadlines`: `ceiling = loginAt + ceilingSeconds`, `idle = min(activeAt + idleSeconds, ceiling)`, `expired = now > idle`. A claim that is not a finite number gives `{ 0, 0, true }`.
    - `continueSessionToken`: expired gives `null`. Otherwise `refreshed = await refresh(token)`, then return `refreshed && trigger === "update" ? { ...refreshed, activeAt: now } : refreshed`.
    - `isSessionCookieName`: `/^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/`.
  - `auth.ts`:
    - Module-level `sessionIdleSeconds` and `sessionCeilingSeconds`, as pinned.
    - `maxAge: sessionCeilingSeconds`, with the comment "the cookie lives up to the ceiling; the idle and ceiling rules are the claims".
    - `jwt` starts with `const now = Math.floor(Date.now() / 1000)`. The sign-in branch ends with the pinned lines.
    - Otherwise `return continueSessionToken(token, { trigger, now, idleSeconds: sessionIdleSeconds, ceilingSeconds: sessionCeilingSeconds, refresh: (current) => refreshSessionToken(current, getUserAccessSnapshot) })`.
    - `session` callback: `session.clock = sessionClock(…) ?? undefined`.
  - `next-auth.d.ts`: `import type { SessionClock } from "@/lib/session-deadline"`.
  - `auth-utils.ts`:
    - `getShellSession` makes one `auth()` call. It returns `{ user: session.user as unknown as SessionUser, clock: session.clock ?? null }`, or `null`.
    - `requireSessionClock` uses `auth()` and `extendSession` uses `unstable_update({})`. Both throw `new Error("Unauthorized")` when there is no `user` or no `clock`.
  - Routes:
    - Both wrap their body in `try { … } catch (error) { return errorResponse(error) }`. The 200 body is `{ ...clock, serverNow: new Date().toISOString() }`.
    - The keep-alive passes `origin`, `host` and `x-forwarded-host` from `request.headers`, with `allowedOrigins: [process.env.AUTH_URL, process.env.NEXTAUTH_URL].filter(Boolean)`.
  - `login-redirect.ts` (stays import-free):
    - `options: { reason?: "session-expired" } = {}`.
    - The query is `new URLSearchParams({ ...(reason ? { reason } : {}), ...(callback ? { callbackUrl: target } : {}) })`. An empty query gives `/${locale}/login`.
  - `page-auth.ts`: `const [headerList, jar] = await Promise.all([headers(), cookies()])`, then the two pinned lines (Step 4), with the comment "the fallback for a reload or deep link after the client missed the deadline".
  - `rbac-route-matrix.ts`: the `if (source.includes("requireAuth("))` check becomes `sessionAuthApiRouteSnippets.some((snippet) => source.includes(snippet))`.
  - `api-error-catalog.ts`: add `"Forbidden: cross-site request": "crossSiteRequest",` before `"Forbidden: insufficient permissions"`.
  - `session-access-cache.ts:4`, the comment: "Sessions end after SESSION_IDLE_SECONDS without use or SESSION_CEILING_SECONDS after sign-in (src/lib/session-deadline.ts); re-reading access at most once a minute…".
  - `playwright.config.ts`: `env: { AUTH_URL: baseURL, NEXTAUTH_URL: baseURL, NOTIFICATION_DIGEST_WEBHOOK_URL: "", SESSION_IDLE_SECONDS: "10800" }`, with the comment "the suite reuses one sign-in for up to 90 minutes, so the idle limit sits above `globalTimeout`".
  - Messages: write this change file in your scratchpad and run `node scripts/messages-edit.mjs <file>`.
```json
{ "set": {
  "th": { "apiErrors.crossSiteRequest": "คำขอนี้ไม่ได้มาจากหน้าของระบบ จึงไม่รับ" },
  "en": { "apiErrors.crossSiteRequest": "This request did not come from the app's own pages, so it was refused" } } }
```

- [ ] **Step 4: Update existing pins**
  - `tests/login-deep-link.test.ts:32` becomes two lines: `assert.match(source, /const expired = jar\.getAll\(\)\.some\(\(cookie\) => isSessionCookieName\(cookie\.name\)\)/)` and `assert.match(source, /buildLoginHref\(locale, headerList\.get\(requestPathHeader\), expired \? \{ reason: "session-expired" \} : undefined\)/)`.
  - `tests/e2e-review.test.ts:79` becomes `/env: \{ AUTH_URL: baseURL, NEXTAUTH_URL: baseURL, NOTIFICATION_DIGEST_WEBHOOK_URL: "", SESSION_IDLE_SECONDS: "10800" \}/`.
  - `tests/dark-mode-s.test.ts`, Task 5's `cookies()` line: the allowed list becomes `[...themeAware, "src/app/[locale]/(dashboard)/layout.tsx", "src/lib/page-auth.ts"]`.
  - These stay green unchanged: `tests/session-access.test.ts`, the classification test in `tests/rbac-route-matrix.test.ts`, and `tests/login-deep-link.test.ts:15-26`.

- [ ] **Step 5: Verify.**
  - Run `node --test tests/session-deadline.test.ts tests/session-server.test.ts tests/login-redirect.test.ts tests/login-deep-link.test.ts tests/rbac-route-matrix.test.ts tests/api-error-catalog.test.ts tests/e2e-review.test.ts tests/session-access.test.ts tests/dark-mode-s.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`. All pass.
  - Then `npm test` (all green), `npx tsc --noEmit -p .` (no output) and `npm run lint` (0 errors).
  - E2E impact: the stored states keep their setup-time `activeAt`, and at 10800 s no spec expires.

- [ ] **Step 6: Commit**
```
git add src/lib/session-deadline.ts src/app/api/session/status/route.ts src/app/api/session/keep-alive/route.ts src/lib/auth.ts src/types/next-auth.d.ts src/lib/auth-utils.ts src/lib/page-auth.ts src/lib/login-redirect.ts src/lib/rbac-route-matrix.ts src/lib/api-error-catalog.ts src/lib/session-access-cache.ts playwright.config.ts messages/th.json messages/en.json tests/session-deadline.test.ts tests/session-server.test.ts tests/login-redirect.test.ts tests/login-deep-link.test.ts tests/rbac-route-matrix.test.ts tests/api-error-catalog.test.ts tests/e2e-review.test.ts tests/dark-mode-s.test.ts
git commit -m "feat(shell): a session ends after 60 idle minutes or 12 hours, with a keep-alive and a status endpoint (menu B shell task 11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12a: The session on the client (SessionKeeper, the 401 redirect)

**Files:**
- Create: `src/lib/session-keeper-plan.ts`, `src/lib/session-expiry.ts`, `src/components/layout/session-keeper.tsx`
- Modify (anchor by content): `src/app/[locale]/(dashboard)/layout.tsx`, `src/components/layout/dashboard-shell.tsx`, `src/components/ui/use-api-error.ts`, `src/components/ui/api-error-text.tsx`, `src/lib/api-error-catalog.ts` (after `getApiErrorKey`), `messages/th.json`, `messages/en.json`
- Test: create `tests/session-keeper-plan.test.ts`, `tests/session-expiry.test.ts`, `tests/session-client.test.ts`; append to `tests/api-error-catalog.test.ts`; pins in `tests/ui-overlay-guards.test.ts`, `tests/sidebar-rail.test.ts`, `tests/sidebar-menu-b.test.ts`, `tests/dashboard-layout-scroll.test.ts:9`

**Interfaces:**
- Consumes:
  - Task 11: `SessionClock`, `buildLoginHref(…, { reason: "session-expired" })`, `getShellSession()`, and the two endpoints.
  - Task 10: `useShellBannerSession(content: React.ReactNode | null): void` (`@/components/layout/shell-banner`, hidden while offline) and `useOnlineStatus(): boolean` (`@/lib/use-online-status`).
  - Task 6: `<main id="main">`.
  - Tasks 4/5: `getShellAccount(user, locale)`, `readSidebarPreference()`, `DashboardShell({ children, user, account, initialSidebar })`.
  - Task 8: `GLOBAL_KEY_LISTENERS`.
- Produces `src/lib/session-keeper-plan.ts` (pure, no imports, epoch ms):
  - `SESSION_WARNING_MS = 300_000`, `SESSION_KEEP_ALIVE_MIN_GAP_MS = 300_000`, `SESSION_EXPIRY_GRACE_MS = 2_000`, `SESSION_ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const`
  - `type SessionTimes = { loginAt: number; activeAt: number; idleDeadline: number; ceilingDeadline: number }` (server clock)
  - `readSessionTimes(value: unknown): SessionTimes | null`; `readServerOffset(value: unknown, receivedAt: number): number`
  - `readSessionAnswer(answer: { status: number; body: unknown }, receivedAt: number): { kind: "expired" } | { kind: "times"; times: SessionTimes; offsetMs: number } | { kind: "ignore" }`
  - `planSessionTimers(times: SessionTimes, offsetMs: number): { kind: "idle" | "ceiling"; deadline: number; warnAt: number }` (client clock)
  - `type SessionStep = { kind: "wait" } | { kind: "check" } | { kind: "quiet" | "warning"; wakeAt: number }`
  - `nextSessionStep(input: { online: boolean; times: SessionTimes | null; offsetMs: number; now: number; lastCheckAt: number | null }): SessionStep`
  - `shouldSendKeepAlive(input: { times: SessionTimes; offsetMs: number; now: number; lastSentAt: number | null }): boolean`; `formatSessionCountdown(ms: number): string`; `ceilingHours(times: SessionTimes): number`
- Produces elsewhere:
  - `src/lib/session-expiry.ts` (imports only `./login-redirect.ts`): `createSessionExpiryRedirect(deps: { navigate(href: string): void; currentPath(): string; isOnline(): boolean }): { expire(locale: string): boolean; hold(): () => void }`, and the browser singletons `redirectToSessionExpiredLogin(locale: string): boolean` and `holdSessionExpiryRedirect(): () => void`.
  - `isUnauthorizedError(error: unknown): boolean` (`api-error-catalog.ts`).
  - `SessionKeeper({ initialClock }: { initialClock: SessionClock | null }): null`. `DashboardShell` gains `sessionClock: SessionClock | null`.
  - Messages `session.*`.

**Decisions:**
- SessionKeeper seeds its times from `initialClock`. `lastCheckAt` starts `null`, so it sends one `GET /api/session/status` on mount to learn `serverNow`. Task 13A's stand-in answers rely on that request.
- Activity is client input only: `SESSION_ACTIVITY_EVENTS` on `window`, while the tab is visible and online. Background polls never extend the session.
- No warning without a fresh answer: when `warnAt` comes, the keeper asks the server first. Activity in another tab moves the shared cookie, so a later deadline keeps this tab quiet (Review Focus F1).
- Offline, nothing is armed and nothing redirects. Going offline resets `lastCheckAt` to `null`, so the status is the first request after reconnect. Only a 401 redirects (Review Focus F2).
- Re-checks never loop tightly. After the deadline plus the grace, the keeper asks again. A 200 with the same deadline re-arms after the grace, and so does a network failure.
- When the tab becomes visible again, the keeper re-evaluates its step, because hidden tabs throttle timers.
- No setState in an effect body: a changed `initialClock` and the switch to offline are adopted during render with the stored-previous-value pattern.
- The banner:
  - SessionKeeper renders `null` and passes a memoized element to `useShellBannerSession`.
  - The idle m:ss is `aria-hidden`. An `sr-only` sentence counts whole minutes, and the 1 s ticker runs only during the warning.
  - "อยู่ในระบบต่อ" is `<Button variant="outline" size="sm" busy={extending}>`. It forces a keep-alive past the throttle. Any failure other than a 401 shows `toast.error(t("stayFailed"))`.
  - If the banner clears while that button holds focus, focus moves to `#main`.
  - The ceiling message uses `useFormatter` (`hour: "2-digit", minute: "2-digit", hourCycle: "h23"`) and has no button.
- The keep-alive POST is `keepalive: true`, and `lastSentAt` is set before the fetch.
- One module-level redirect handles every API 401:
  - It fires once.
  - While offline it never fires and returns `false`, so the toast still shows.
  - It waits while a hold is open (Task 12b's queue send).
  - The bell's poll does not redirect.
- The listener guard cannot see a loop variable, so its regex is widened and the keeper gets its own allowed entry.

- [ ] **Step 1: Write the failing tests**

`tests/session-keeper-plan.test.ts` (imports all exports of `../src/lib/session-keeper-plan.ts`):
```ts
const times = { loginAt: 0, activeAt: 600_000, idleDeadline: 4_200_000, ceilingDeadline: 43_200_000 }
const capped = { loginAt: 0, activeAt: 40_000_000, idleDeadline: 43_200_000, ceilingDeadline: 43_200_000 }
const body = { loginAt: "2026-10-21T01:00:00.000Z", activeAt: "2026-10-21T01:10:00.000Z", idleDeadline: "2026-10-21T02:10:00.000Z", ceilingDeadline: "2026-10-21T13:00:00.000Z", serverNow: "2026-10-21T01:20:10.000Z" }
const on = (now: number, lastCheckAt: number | null, t = times) => nextSessionStep({ online: true, times: t, offsetMs: 0, now, lastCheckAt })
test("the timings the spec pins", () => {
  assert.equal(SESSION_WARNING_MS, 300_000); assert.equal(SESSION_KEEP_ALIVE_MIN_GAP_MS, 300_000); assert.equal(SESSION_EXPIRY_GRACE_MS, 2_000)
  assert.deepEqual([...SESSION_ACTIVITY_EVENTS], ["pointerdown", "keydown", "touchstart", "wheel"])
})
test("the warning comes 5 minutes before the earlier deadline, in the client's clock", () => {
  assert.deepEqual(planSessionTimers(times, 0), { kind: "idle", deadline: 4_200_000, warnAt: 3_900_000 })
  assert.deepEqual(planSessionTimers(times, 10_000), { kind: "idle", deadline: 4_190_000, warnAt: 3_890_000 })
  assert.deepEqual(planSessionTimers(capped, 0), { kind: "ceiling", deadline: 43_200_000, warnAt: 42_900_000 })
})
test("a keep-alive goes at most once per 5 minutes, and never once the ceiling caps the idle deadline", () => {
  assert.equal(shouldSendKeepAlive({ times, offsetMs: 0, now: 899_999, lastSentAt: null }), false)
  assert.equal(shouldSendKeepAlive({ times, offsetMs: 0, now: 900_000, lastSentAt: null }), true)
  assert.equal(shouldSendKeepAlive({ times, offsetMs: 10_000, now: 890_000, lastSentAt: null }), true)
  assert.equal(shouldSendKeepAlive({ times, offsetMs: 0, now: 900_000, lastSentAt: 800_000 }), false)
  assert.equal(shouldSendKeepAlive({ times: capped, offsetMs: 0, now: 41_000_000, lastSentAt: null }), false)
})
test("the countdown reads m:ss and never goes below zero", () => {
  assert.equal(formatSessionCountdown(300_000), "5:00"); assert.equal(formatSessionCountdown(299_000), "4:59")
  assert.equal(formatSessionCountdown(59_400), "1:00"); assert.equal(formatSessionCountdown(5_000), "0:05")
  assert.equal(formatSessionCountdown(0), "0:00"); assert.equal(formatSessionCountdown(-1), "0:00")
})
test("the ceiling copy names its hours; the status reads as ms with the server's offset", () => {
  assert.equal(ceilingHours(times), 12)
  assert.deepEqual(readSessionTimes(body), { loginAt: Date.parse(body.loginAt), activeAt: Date.parse(body.activeAt), idleDeadline: Date.parse(body.idleDeadline), ceilingDeadline: Date.parse(body.ceilingDeadline) })
  for (const bad of [null, {}, { ...body, idleDeadline: "soon" }]) assert.equal(readSessionTimes(bad), null)
  assert.equal(readServerOffset(body, Date.parse("2026-10-21T01:20:00.000Z")), 10_000)
  assert.equal(readServerOffset({}, 5), 0)
})
test("the first step on mount is the status request", () => {
  assert.deepEqual(on(600_000, null), { kind: "check" })
})
test("two tabs: tab B asks the server at its warning time, sees tab A's later deadline and stays quiet (Review Focus F1)", () => {
  assert.deepEqual(on(600_000, 600_000), { kind: "quiet", wakeAt: 3_900_000 })
  assert.deepEqual(on(3_900_000, 600_000), { kind: "check" })
  const later = { ...times, activeAt: 3_000_000, idleDeadline: 6_600_000 }
  assert.deepEqual(on(3_900_100, 3_900_100, later), { kind: "quiet", wakeAt: 6_300_000 })
  assert.deepEqual(on(3_900_100, 3_900_100), { kind: "warning", wakeAt: 4_202_000 })
  assert.deepEqual(on(4_202_000, 3_900_100), { kind: "check" })
  assert.deepEqual(on(4_202_500, 4_202_500), { kind: "warning", wakeAt: 4_204_500 }) // the same deadline again: re-armed after the grace
})
test("offline across the deadline: nothing is armed; on reconnect the status comes first; only a 401 ends the session (Review Focus F2)", () => {
  assert.deepEqual(nextSessionStep({ online: false, times, offsetMs: 0, now: 5_000_000, lastCheckAt: 3_900_100 }), { kind: "wait" })
  assert.deepEqual(nextSessionStep({ online: true, times: null, offsetMs: 0, now: 5_000_000, lastCheckAt: null }), { kind: "wait" })
  assert.deepEqual(on(5_000_000, null), { kind: "check" })
  assert.deepEqual(on(1_000_000, null), { kind: "check" })
  assert.deepEqual(readSessionAnswer({ status: 401, body: { error: "Unauthorized" } }, 0), { kind: "expired" })
  assert.deepEqual(readSessionAnswer({ status: 200, body }, Date.parse("2026-10-21T01:20:00.000Z")), { kind: "times", times: readSessionTimes(body), offsetMs: 10_000 })
  for (const answer of [{ status: 500, body: null }, { status: 403, body: { error: "Forbidden: cross-site request" } }, { status: 200, body: {} }]) assert.deepEqual(readSessionAnswer(answer, 0), { kind: "ignore" })
})
```

`tests/session-expiry.test.ts` (imports `createSessionExpiryRedirect` from `../src/lib/session-expiry.ts`):
```ts
function harness(path = "/th/assets/a1?view=custody") {
  const went: string[] = []; let online = true
  const redirect = createSessionExpiryRedirect({ navigate: (href) => went.push(href), currentPath: () => path, isOnline: () => online })
  return { redirect, went, setOnline: (value: boolean) => { online = value } }
}
test("an expired session goes to the login once, with the reason and the page", () => {
  const { redirect, went } = harness()
  assert.equal(redirect.expire("th"), true); assert.equal(redirect.expire("th"), true)
  assert.deepEqual(went, ["/th/login?reason=session-expired&callbackUrl=%2Fth%2Fassets%2Fa1%3Fview%3Dcustody"])
  const home = harness("/th"); home.redirect.expire("th"); assert.deepEqual(home.went, ["/th/login?reason=session-expired"])
})
test("offline never redirects", () => {
  const { redirect, went, setOnline } = harness(); setOnline(false)
  assert.equal(redirect.expire("th"), false); assert.deepEqual(went, [])
  setOnline(true); redirect.expire("th"); assert.equal(went.length, 1)
})
test("a hold (the audit queue sending) defers the redirect until the last hold is released", () => {
  const { redirect, went } = harness()
  const a = redirect.hold(); const b = redirect.hold()
  assert.equal(redirect.expire("th"), true); assert.deepEqual(went, [])
  a(); a(); assert.deepEqual(went, [])
  b(); assert.equal(went.length, 1)
})
```

`tests/api-error-catalog.test.ts` (append; import `isUnauthorizedError`):
```ts
test("a 401's text is recognised wherever it reaches the screen", () => {
  assert.equal(isUnauthorizedError(new Error("Unauthorized")), true); assert.equal(isUnauthorizedError("Unauthorized"), true)
  for (const other of [new Error("Forbidden: insufficient permissions"), "กรุณาเข้าสู่ระบบใหม่", null, undefined]) assert.equal(isUnauthorizedError(other), false)
})
```

`tests/session-client.test.ts` (source-reading, `\r` stripped):
```ts
test("the layout reads the session once and the shell mounts one SessionKeeper with its clock", () => {
  const layout = read("src/app/[locale]/(dashboard)/layout.tsx")
  assert.match(layout, /const shell = await getShellSession\(\)\n\s+if \(!shell\) return redirectToLogin\(locale\)\n\s+const \{ user \} = shell/)
  assert.match(layout, /<DashboardShell user=\{user\} account=\{account\} initialSidebar=\{initialSidebar\} sessionClock=\{shell\.clock\}>/)
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /sessionClock: SessionClock \| null/)
  assert.equal(shell.match(/<SessionKeeper initialClock=\{sessionClock\} \/>/g)?.length, 1)
})
test("SessionKeeper asks the status on mount, turns input into a throttled keep-alive and asks the server before it warns or signs out", () => {
  const s = read("src/components/layout/session-keeper.tsx")
  assert.match(s, /^"use client"/)
  assert.match(s, /export function SessionKeeper\(\{ initialClock \}: \{ initialClock: SessionClock \| null \}\)/)
  assert.match(s, /const \[lastCheckAt, setLastCheckAt\] = useState<number \| null>\(null\)/)
  assert.match(s, /nextSessionStep\(\{ online, times, offsetMs, now: clientNow, lastCheckAt \}\)/)
  assert.match(s, /readSessionAnswer\(/); assert.match(s, /shouldSendKeepAlive\(/); assert.match(s, /planSessionTimers\(/)
  assert.match(s, /for \(const type of SESSION_ACTIVITY_EVENTS\) window\.addEventListener\(type, onActivity, \{ capture: true, passive: true \}\)/)
  assert.match(s, /fetch\("\/api\/session\/keep-alive", \{ method: "POST", cache: "no-store", keepalive: true \}\)/)
  assert.match(s, /fetch\("\/api\/session\/status", \{ cache: "no-store" \}\)/)
  assert.match(s, /redirectToSessionExpiredLogin\(locale\)/)
  assert.match(s, /const online = useOnlineStatus\(\)/); assert.match(s, /useShellBannerSession\(bannerContent\)/)
  assert.match(s, /document\.addEventListener\("visibilitychange"/); assert.match(s, /t\("stay"\)/); assert.match(s, /t\("ceilingWarning"/)
  assert.match(s, /aria-hidden="true"/); assert.match(s, /t\("idleWarningSr"/)
  assert.doesNotMatch(s, /next-auth\/react|useSession|window\.location|useShellBannerSlot/)
  assert.equal(s.match(/setInterval\(/g)?.length, 1); assert.match(s, /setInterval\(\(\) => setClientNow\(Date\.now\(\)\), 1000\)/)
})
test("an API 401 sends the person to the login with the reason instead of only a toast", () => {
  const hook = read("src/components/ui/use-api-error.ts")
  assert.match(hook, /if \(isUnauthorizedError\(error\) && redirectToSessionExpiredLogin\(locale\)\) return/)
  assert.match(hook, /toast\.error\(message, detail \? \{ description: detail \} : undefined\)/)
  assert.match(read("src/components/ui/api-error-text.tsx"), /if \(isUnauthorizedError\(error\)\) redirectToSessionExpiredLogin\(locale\)/)
  const expiry = read("src/lib/session-expiry.ts")
  assert.match(expiry, /window\.location\.assign\(href\)/); assert.match(expiry, /navigator\.onLine/)
})
test("the session copy is the spec's", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).session
  assert.equal(th.stay, "อยู่ในระบบต่อ")
  assert.equal(th.idleWarning, "จะออกจากระบบใน {time} นาทีเพราะไม่มีการใช้งาน · งานที่กรอกค้างไว้ยังไม่ถูกบันทึก")
  assert.equal(th.ceilingWarning, "จะออกจากระบบเวลา {time} · ครบ {hours} ชั่วโมงของการเข้าระบบ บันทึกงานก่อนแล้วเข้าใหม่")
})
```

- [ ] **Step 2: Run them and see them fail.** `node --test tests/session-keeper-plan.test.ts tests/session-expiry.test.ts tests/session-client.test.ts tests/api-error-catalog.test.ts`. Expected failures:
  - `ERR_MODULE_NOT_FOUND` for the two lib files, and `isUnauthorizedError` is not exported.
  - `ENOENT` for `session-keeper.tsx`.
  - The layout, shell and hook pins do not match, and `session` is undefined in the messages.

- [ ] **Step 3: Implement**
  - `session-keeper-plan.ts`:
    - `planSessionTimers`: `deadline = min(idleDeadline, ceilingDeadline) - offsetMs`, `warnAt = deadline - SESSION_WARNING_MS`. The kind is `"ceiling"` when `idleDeadline >= ceilingDeadline`.
    - `shouldSendKeepAlive` returns `false` for kind `"ceiling"`, and when `lastSentAt !== null && now - lastSentAt < GAP`. Otherwise it returns `now + offsetMs - activeAt >= GAP`.
    - `formatSessionCountdown`: `s = max(0, ceil(ms / 1000))`, then `${floor(s / 60)}:${pad2(s % 60)}`.
    - `ceilingHours`: `round((ceilingDeadline - loginAt) / 3_600_000)`.
    - `readSessionTimes`: every field must `Date.parse` to a finite number.
    - `readSessionAnswer`: a 401 gives `expired`. A 200 with readable times gives `times` plus `readServerOffset(body, receivedAt)`. Anything else gives `ignore`.
    - `nextSessionStep`, first match wins:
      1. `!online || !times` → `wait`
      2. `lastCheckAt === null` → `check`
      3. `now < plan.warnAt` → `quiet`, `wakeAt: plan.warnAt`
      4. `lastCheckAt < plan.warnAt` → `check`
      5. `now < plan.deadline + GRACE` → `warning`, `wakeAt: plan.deadline + GRACE`
      6. `now - lastCheckAt < GRACE` → `warning`, `wakeAt: lastCheckAt + GRACE`
      7. otherwise → `check`
  - `session-expiry.ts`:
    - `expire(locale)`:
      - Already navigated: return `true`.
      - A hold is open: remember the locale and return `true`.
      - `!isOnline()`: return `false`.
      - Otherwise navigate to `buildLoginHref(locale, currentPath(), { reason: "session-expired" })` and return `true`.
    - `hold()` returns an idempotent release. The last release runs the pending `expire`.
    - The singletons use `window.location.pathname + window.location.search` for the path. They touch the browser lazily, so importing them on the server is safe.
  - `isUnauthorizedError`: the raw text (an `Error`'s message, or a string) gives `getApiErrorKey(raw) === "unauthorized"`.
  - `use-api-error.ts`: add `const locale = useLocale()`, and put the pinned line first in `showToast`.
  - `api-error-text.tsx`: the pinned check goes in `useEffect(…, [error, locale])`, never during render.
  - Layout: `const [account, initialSidebar] = await Promise.all([getShellAccount(user, locale), readSidebarPreference()])` goes between the pinned lines and the pinned `<DashboardShell …>`. Drop the `getSessionUser` import.
  - `dashboard-shell.tsx`: render `<SessionKeeper initialClock={sessionClock} />` as the first child inside `<ShellBannerProvider>`.
  - `session-keeper.tsx`:
    - State: `times` (from `readSessionTimes(initialClock)`), `offsetMs` (0), `lastCheckAt`, `clientNow` and `extending`. Refs: `lastSentAt` and `inFlight`.
    - One effect, keyed on `step.kind`, its `wakeAt` and `clientNow`:
      - `check`: send the status request, unless one is `inFlight`.
      - `quiet` or `warning`: one `setTimeout(() => setClientNow(Date.now()), wakeAt - Date.now())`.
    - Every answer, the keep-alive's included, goes through `readSessionAnswer`:
      - `expired` calls `redirectToSessionExpiredLogin(locale)`.
      - `times` sets `times`, `offsetMs`, and `lastCheckAt = receivedAt`.
      - A rejected fetch sets `clientNow` again after `SESSION_EXPIRY_GRACE_MS`.
    - `onActivity` sends only when the tab is visible, `navigator.onLine` is true, nothing is `inFlight` and `shouldSendKeepAlive(…)` passes.
    - `visibilitychange` to visible calls `setClientNow(Date.now())`.
    - `bannerContent` is `null` unless the step is `warning`.
      - Idle: `<p className="min-w-0 flex-1"><span aria-hidden="true">{t("idleWarning", { time: formatSessionCountdown(plan.deadline - clientNow) })}</span><span className="sr-only">{t("idleWarningSr", { minutes: Math.ceil((plan.deadline - clientNow) / 60_000) })}</span></p>`, then the button.
      - Ceiling: `<p className="min-w-0 flex-1">{t("ceilingWarning", { time, hours: ceilingHours(times) })}</p>`.
    - The pinned `setInterval` runs only during `warning`.
  - Messages (`node scripts/messages-edit.mjs <file>`):
```json
{ "set": {
  "th": {
    "session.idleWarning": "จะออกจากระบบใน {time} นาทีเพราะไม่มีการใช้งาน · งานที่กรอกค้างไว้ยังไม่ถูกบันทึก",
    "session.idleWarningSr": "จะออกจากระบบในอีก {minutes} นาทีเพราะไม่มีการใช้งาน งานที่กรอกค้างไว้ยังไม่ถูกบันทึก",
    "session.ceilingWarning": "จะออกจากระบบเวลา {time} · ครบ {hours} ชั่วโมงของการเข้าระบบ บันทึกงานก่อนแล้วเข้าใหม่",
    "session.stay": "อยู่ในระบบต่อ",
    "session.stayFailed": "ต่อเวลาเข้าระบบไม่สำเร็จ ลองอีกครั้ง" },
  "en": {
    "session.idleWarning": "Signing you out in {time} min for inactivity · anything you have typed is not saved yet",
    "session.idleWarningSr": "You will be signed out in {minutes, plural, one {# minute} other {# minutes}} for inactivity. Anything you have typed is not saved yet.",
    "session.ceilingWarning": "Signing you out at {time} · {hours} hours since you signed in. Save your work, then sign in again",
    "session.stay": "Stay signed in",
    "session.stayFailed": "Could not keep you signed in. Try again" } } }
```

- [ ] **Step 4: Update existing pins**
  - `tests/ui-overlay-guards.test.ts`, the test "no global listeners for closing overlays":
    - The regex becomes `/(?:document|window)\.addEventListener\((?:"(?:keydown|mousedown|pointerdown)"|type,)/g`.
    - `GLOBAL_KEY_LISTENERS` gains `"src/components/layout/session-keeper.tsx: window.addEventListener(type,"` after the global-search entry, with the comment "the session's activity listeners extend the session and close nothing (menu B shell task 12a)".
  - `tests/sidebar-rail.test.ts` and `tests/dashboard-layout-scroll.test.ts:9`: the `<DashboardShell …>` regex becomes `/<DashboardShell user=\{user\} account=\{account\} initialSidebar=\{initialSidebar\} sessionClock=\{shell\.clock\}>/`.
  - `tests/sidebar-menu-b.test.ts`, if Task 4's layout pins remain:
    - `/const account = await getShellAccount\(user, locale\)/` becomes `/const \[account, initialSidebar\] = await Promise\.all\(\[getShellAccount\(user, locale\), readSidebarPreference\(\)\]\)/`.
    - The `<DashboardShell …>` pin becomes the regex above.
  - These stay green unchanged: `tests/api-error-ui.test.ts:28`, `tests/login-deep-link.test.ts:15-26` and `tests/dark-mode-s.test.ts`.

- [ ] **Step 5: Verify.**
  - Run `node --test tests/session-keeper-plan.test.ts tests/session-expiry.test.ts tests/session-client.test.ts tests/api-error-catalog.test.ts tests/api-error-ui.test.ts tests/ui-overlay-guards.test.ts tests/sidebar-rail.test.ts tests/sidebar-menu-b.test.ts tests/dashboard-layout-scroll.test.ts tests/login-deep-link.test.ts tests/menu-b-shell-banner.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`. All pass.
  - Then `npm test` (all green), `npx tsc --noEmit -p .` (no output) and `npm run lint` (0 errors).
  - E2E impact: each context sends one `GET /api/session/status` on mount, and one `POST /api/session/keep-alive` on its first input. If the access-denied redirect in `e2e/cross-cutting/roles.spec.ts` cancels the mount request, 13A adds an `e2e/support/allow-list.ts` entry.

- [ ] **Step 6: Commit**
```
git add src/lib/session-keeper-plan.ts src/lib/session-expiry.ts src/components/layout/session-keeper.tsx "src/app/[locale]/(dashboard)/layout.tsx" src/components/layout/dashboard-shell.tsx src/components/ui/use-api-error.ts src/components/ui/api-error-text.tsx src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/session-keeper-plan.test.ts tests/session-expiry.test.ts tests/session-client.test.ts tests/api-error-catalog.test.ts tests/ui-overlay-guards.test.ts tests/sidebar-rail.test.ts tests/sidebar-menu-b.test.ts tests/dashboard-layout-scroll.test.ts
git commit -m "feat(shell): the shell keeps a working session alive, warns 5 minutes ahead and signs out to the login with the reason (menu B shell task 12a)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12b: The audit queue waits for the person who scanned

**Files:**
- Modify (anchor by content): `src/lib/audit-offline-queue.ts` (`QueuedAuditScan`, `upsertQueuedAuditScanAsync`, helpers after `markQueuedAuditScanSyncFailed`), `src/components/audit/audit-scan-workspace.tsx`, `src/components/audit/audit-scan-offline-bar.tsx`, `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx` (`<AuditScanWorkspace`), `messages/th.json`, `messages/en.json`
- Test: append to `tests/audit-offline-queue.test.ts`, `tests/audit-scan-offline-ux.test.ts`; pins in `tests/audit-scan-feedback-transition.test.ts:26`, `tests/menu-b-shell-banner.test.ts`, `tests/audit-scan-sweep-ui.test.ts:156`

**Interfaces:**
- Consumes: Task 12a's `redirectToSessionExpiredLogin(locale: string): boolean` and `holdSessionExpiryRedirect(): () => void` (`@/lib/session-expiry`). From Task 10: the workspace's `useShellBannerSlot(…)` call and the bar guard `if (queue.length === 0 || (!online && failed.length === 0)) return null`.
- Produces:
  - `QueuedAuditScan` gains `userId?: string | null` and `userName?: string | null`.
  - `upsertQueuedAuditScanAsync(storage, roundId, payload, options: { photos?: AuditOfflinePhoto[]; now?: Date; queuedBy?: { id: string; name: string } } = {})`
  - `canSendQueuedAuditScan(entry: Pick<QueuedAuditScan, "userId">, userId: string): boolean`
  - `summarizeHeldAuditScans(queue: QueuedAuditScan[], userId: string): { userId: string; name: string; count: number }[]`
  - Props: `AuditScanWorkspace` gains `currentUser: { id: string; name: string }`, and `AuditScanOfflineBar` gains `held: { userId: string; name: string; count: number }[]`.
  - Message `auditScan.queueHeldForUser`.

**Decisions:**
- A queued check sends only under the session of the person who scanned it. Under anyone else it stays, and the bar says whose it is. Entries queued before this task (no `userId`) send under anyone, as today.
- With `queuedBy`, a newer save replaces only the entry for the same asset whose `userId` is empty or equal, and takes over its photos. The id becomes `${now.getTime()}-${queuedBy.id}-${payload.assetId}`. Without `queuedBy`, nothing changes.
- A 401 from a queue send keeps the item (not marked failed) and stops the loop. The send holds the redirect, which runs once after the queue stops.
- A live save answered 401 queues the check on the device, then goes to the login.
- Nobody gets "ลบออกจากคิว" for another person's held entries. Whether an admin may is open for the user.
- The bar lists held entries even when nothing else waits. "รอส่ง N" shows only with sendable entries. The banner line counts sendable entries only; `queuedAssetIds` keeps the full queue.
- No `"-"` literal: a held entry without a name shows its user id. LV2 in `tests/list-frame-guards.test.ts` counts `src/lib` too.

- [ ] **Step 1: Write the failing tests**

`tests/audit-offline-queue.test.ts` (append; import `canSendQueuedAuditScan`, `summarizeHeldAuditScans` and `upsertQueuedAuditScanAsync`):
```ts
const payload = (assetId: string) => ({ assetId, actualLocationId: null, actualCustodianId: null, actualDepartmentId: null, actualConditionId: null, scanSource: "manual" as const, applyCorrections: false, resultCorrection: false, remark: null })
const photo = (id: string) => ({ id, label: id, fileName: `${id}.jpg`, fileType: "image/jpeg", fileSize: 1, blob: new Blob([id]) })
const somchai = { id: "user-1", name: "สมชาย" }, somying = { id: "user-2", name: "สมหญิง" }
test("a queued check records who scanned it, and only that person's session sends it", async () => {
  const storage = new AsyncMemoryQueueStorage()
  const queued = await upsertQueuedAuditScanAsync(storage, "round-3", payload("asset-1"), { queuedBy: somchai, now: new Date("2026-10-21T01:00:00.000Z") })
  assert.equal(queued.userId, "user-1"); assert.equal(queued.userName, "สมชาย")
  assert.equal(canSendQueuedAuditScan(queued, "user-1"), true); assert.equal(canSendQueuedAuditScan(queued, "user-2"), false)
  assert.equal(canSendQueuedAuditScan({ userId: undefined }, "user-2"), true) // queued before the binding
  assert.equal(canSendQueuedAuditScan({ userId: null }, "user-2"), true)
})
test("a newer save replaces only the same person's entry for that asset", async () => {
  const storage = new AsyncMemoryQueueStorage(); const now = new Date("2026-10-21T01:00:00.000Z")
  await upsertQueuedAuditScanAsync(storage, "round-4", payload("asset-1"), { queuedBy: somchai, photos: [photo("p1")], now })
  await upsertQueuedAuditScanAsync(storage, "round-4", payload("asset-1"), { queuedBy: somying, photos: [photo("p2")], now })
  await upsertQueuedAuditScanAsync(storage, "round-4", payload("asset-1"), { queuedBy: somchai, photos: [photo("p3")], now })
  const queue = await loadQueuedAuditScansAsync(storage, "round-4")
  assert.deepEqual(queue.map((entry) => [entry.userId, entry.photos?.map((p) => p.id)]), [["user-2", ["p2"]], ["user-1", ["p1", "p3"]]])
  assert.equal(new Set(queue.map((entry) => entry.id)).size, 2)
})
test("held checks are counted per person who scanned them, in first-seen order", () => {
  const entry = (assetId: string, userId?: string, userName?: string) => ({ ...payload(assetId), id: assetId, queuedAt: "2026-10-21T01:00:00.000Z", userId, userName })
  const queue = [entry("a1", "user-1", "สมชาย"), entry("a2", "user-2", "สมหญิง"), entry("a3"), entry("a4", "user-3", "มานี"), entry("a5", "user-2", "สมหญิง")]
  assert.deepEqual(summarizeHeldAuditScans(queue, "user-1"), [{ userId: "user-2", name: "สมหญิง", count: 2 }, { userId: "user-3", name: "มานี", count: 1 }])
  assert.deepEqual(summarizeHeldAuditScans(queue, "user-2"), [{ userId: "user-1", name: "สมชาย", count: 1 }, { userId: "user-3", name: "มานี", count: 1 }])
  assert.deepEqual(summarizeHeldAuditScans([entry("a6", "user-9")], "user-1"), [{ userId: "user-9", name: "user-9", count: 1 }])
})
```

`tests/audit-scan-offline-ux.test.ts` (append):
```ts
test("the queue sends only the signed-in person's checks; a 401 keeps the item and signs out once the send stops", () => {
  const w = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(w, /if \(!canSendQueuedAuditScan\(queued, currentUser\.id\)\) continue/)
  assert.match(w, /if \(response\.status === 401\) \{\n\s+sessionLost = true\n\s+break\n\s+\}\n\s+const result = await response\.json\(\)/)
  assert.match(w, /const releaseRedirect = holdSessionExpiryRedirect\(\)/)
  assert.match(w, /releaseRedirect\(\)\n\s+if \(sessionLost\) redirectToSessionExpiredLogin\(locale\)/)
  assert.match(w, /upsertQueuedAuditScanAsync\(getStorage\(\), roundId, payload, \{ photos: photos\.map\(toAuditOfflinePhoto\), queuedBy: currentUser \}\)/)
  assert.match(w, /if \(response\.status === 401\) \{\n\s+await queueOffline\(payload, submission\.photos\)\n\s+finishSave\(\{ \.\.\.notice, queued: true \}, false\)\n\s+setSaving\(false\)\n\s+redirectToSessionExpiredLogin\(locale\)\n\s+return\n\s+\}/)
  assert.match(w, /queue=\{sendableQueue\}/); assert.match(w, /held=\{heldQueue\}/)
  assert.match(read("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx"), /currentUser=\{\{ id: user\.id, name: user\.name \}\}/)
  const bar = read("src/components/audit/audit-scan-offline-bar.tsx")
  assert.match(bar, /t\("queueHeldForUser", \{ name: entry\.name, count: entry\.count \}\)/)
  assert.doesNotMatch(bar, /onRemove\(entry\.userId\)/)
  for (const [locale, text] of [["th", "ผลตรวจของ {name} {count} รายการ จะส่งเมื่อ {name} เข้าสู่ระบบในเครื่องนี้"], ["en", "{count, plural, one {# check} other {# checks}} by {name} will be sent when {name} signs in on this device"]])
    assert.equal(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan.queueHeldForUser, text, locale)
})
```

- [ ] **Step 2: Run them and see them fail.** `node --test tests/audit-offline-queue.test.ts tests/audit-scan-offline-ux.test.ts`. Expected failures:
  - A `SyntaxError`, because `canSendQueuedAuditScan` is not exported.
  - Once it is exported, `userId` is `undefined` and the workspace, page and bar pins do not match.

- [ ] **Step 3: Implement**
  - `audit-offline-queue.ts`:
    - `upsertQueuedAuditScanAsync` with `queuedBy`: `previous` and `others` match the asset plus `!entry.userId || entry.userId === queuedBy.id`. Stamp `userId` and `userName`.
    - `canSendQueuedAuditScan`: `!entry.userId || entry.userId === userId`.
    - `summarizeHeldAuditScans`: group the unsendable entries by `userId`, in first-seen order, with `name: entry.userName || entry.userId`.
  - `audit-scan-workspace.tsx`:
    - Add the prop `currentUser` and `const locale = useLocale()`.
    - Memos: `sendableQueue` (filtered with `canSendQueuedAuditScan`) and `heldQueue` (`summarizeHeldAuditScans(queue, currentUser.id)`).
    - The slot line becomes `useShellBannerSlot(sendableQueue.length > 0 ? t("bannerQueued", { count: sendableQueue.length }) : t("bannerOfflineSaves"))`.
    - `sendQueue`:
      1. Declare `let sessionLost = false`.
      2. Put `releaseRedirect` just before `sendingRef.current = true`.
      3. The `continue` is the loop's first line.
      4. The 401 branch follows the fetch's `catch`.
      5. `finally` ends with the two pinned lines, after `await refreshQueue()`.
      6. Add `currentUser.id` and `locale` to the dependencies.
    - `queueOffline` makes the pinned call. In `submitCheck`, the pinned 401 branch goes right before `const result = await response.json()`.
    - The bar gets `queue={sendableQueue}` and `held={heldQueue}`. The scan page passes the pinned `currentUser`.
  - `audit-scan-offline-bar.tsx`:
    - Add the prop `held`.
    - The guard becomes `if ((queue.length === 0 || (!online && failed.length === 0)) && held.length === 0) return null`.
    - `title={queue.length > 0 ? t("offlineBarPending", { count: queue.length }) : undefined}`.
    - After the failed list: `{held.length > 0 ? <ul className="space-y-1">{held.map((entry) => <li key={entry.userId}>{t("queueHeldForUser", { name: entry.name, count: entry.count })}</li>)}</ul> : null}`.
    - No button, no `"-"` and no other new class.
  - Messages (`node scripts/messages-edit.mjs <file>`):
```json
{ "set": {
  "th": { "auditScan.queueHeldForUser": "ผลตรวจของ {name} {count} รายการ จะส่งเมื่อ {name} เข้าสู่ระบบในเครื่องนี้" },
  "en": { "auditScan.queueHeldForUser": "{count, plural, one {# check} other {# checks}} by {name} will be sent when {name} signs in on this device" } } }
```

- [ ] **Step 4: Update existing pins**
  - `tests/audit-scan-feedback-transition.test.ts:26` (as Task 10 left it) becomes `/if \(\(queue\.length === 0 \|\| \(!online && failed\.length === 0\)\) && held\.length === 0\) return null/`.
  - `tests/menu-b-shell-banner.test.ts` (Task 10):
    - In the bar guard pin, the second line becomes `if \(\(queue\.length === 0 \|\| \(!online && failed\.length === 0\)\) && held\.length === 0\) return null`.
    - `title=\{t\("offlineBarPending", \{ count: queue\.length \}\)\}` becomes `title=\{queue\.length > 0 \? t\("offlineBarPending", \{ count: queue\.length \}\) : undefined\}`.
    - The slot pin becomes `/useShellBannerSlot\(sendableQueue\.length > 0 \? t\("bannerQueued", \{ count: sendableQueue\.length \}\) : t\("bannerOfflineSaves"\)\)/`.
  - `tests/audit-scan-sweep-ui.test.ts:156`: the title part of the `<Notice` regex becomes the same conditional title.
  - These stay green unchanged:
    - `tests/audit-scan-offline-ux.test.ts:13,15,21-24` and `tests/audit-scan-workspace-ui.test.ts:39-41`.
    - `tests/v-track2-u.test.ts:219-220`: the 401 branch sits before `const result`.
    - `tests/audit-scan-session-check.test.ts:136-161`: without `queuedBy`, nothing changes.
    - `tests/audit-scan-sweep-ui.test.ts:155-163` and `tests/list-frame-guards.test.ts:171`: the bar's `"-"` count stays 1.

- [ ] **Step 5: Verify.**
  - Run `node --test tests/audit-offline-queue.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-scan-session-check.test.ts tests/audit-scan-feedback-transition.test.ts tests/menu-b-shell-banner.test.ts tests/audit-scan-sweep-ui.test.ts tests/audit-scan-workspace-ui.test.ts tests/v-track2-u.test.ts tests/list-frame-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`. All pass.
  - Then `npm test` (all green), `npx tsc --noEmit -p .` (no output) and `npm run lint` (0 errors).
  - E2E impact: in `e2e/audit/field-audit.spec.ts`, the queued check carries the IT staff user, and the same session sends it. No spec changes.

- [ ] **Step 6: Commit**
```
git add src/lib/audit-offline-queue.ts src/components/audit/audit-scan-workspace.tsx src/components/audit/audit-scan-offline-bar.tsx "src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx" messages/th.json messages/en.json tests/audit-offline-queue.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-scan-feedback-transition.test.ts tests/menu-b-shell-banner.test.ts tests/audit-scan-sweep-ui.test.ts
git commit -m "feat(shell): a queued audit check waits for the person who scanned it, and a 401 keeps it queued (menu B shell task 12b)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13A: The shell's own E2E checks, and the allow-list follows the shell

**Files:**
- Create: `e2e/shell/shell-words.ts` (plain data, no imports), `e2e/shell/shell-steps.ts`, `e2e/shell/shell.spec.ts`, `e2e/shell/session.spec.ts`, `tests/e2e-shell.test.ts`
- Modify: `e2e/support/allow-list.ts` (the entry `topbar-notifications-cancelled-by-redirect`; Task 3 edited its reason)
- Modify: `e2e/support/run-plan.ts:22` (the IT head's permissions), `tests/e2e-suite.test.ts:153` (its pin), `docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md:198` (the §7 users table)
- Modify: `tests/e2e-cross-cutting.test.ts` (the block from "// The reviewed allow-list entry for the top bar's fetch" to the `unexpectedFailures` assert; Task 3 already replaced the `topbar.tsx` pin after it), `tests/e2e-review.test.ts` (the no-hazard list, `:41-48`)

**Interfaces:**
- Consumes (names the steps use):
  - Task 3: `` `/api/notifications?locale=${locale}` ``, event `asset-system:notification-summary-changed`, `[data-shell-notification-announcement]` (`role="status"`, cleared after 10 s, never on the first load).
  - Tasks 4–6: `SidebarAccount` (a button named by the person, a `menu` with "ออกจากระบบ"); cookie `sidebar`, toggle "ย่อเมนู"/"ขยายเมนู" with `aria-expanded`, rail `lg:w-16`, `LabelTooltip` (`role="tooltip"`); skip link, `<main id="main" tabIndex={-1}>`, `<header className="flex h-14 …">`.
  - Tasks 7–9: `NotificationBell` (button and dialog "การแจ้งเตือน"); `GlobalSearch` (combobox "ค้นหาทั่วระบบ", `ul role="group"` sections labelled by `group_<type>` headings, `li role="option"` rows incl. `viewAllInRegister` → `/{locale}/assets?search=<q>&exact=1`), `MobileSearchSheet`, key `asset-system:recent-search:v1:{locale}`; `MobileMoreSheet` (`id="mobile-more-sheet"`, X "ปิด", `Segmented` groups "ภาษา"/"ธีม").
  - Task 10: `shellBanner(page: Page): Locator` in `e2e/audit/scan-steps.ts`.
  - Task 11: status and keep-alive → 200 `{ loginAt, activeAt, idleDeadline, ceilingDeadline, serverNow }` (ISO) or 401 `{ error: "Unauthorized" }`; `SESSION_IDLE_SECONDS: "10800"` in the webServer env; the stale-cookie fallback.
  - Task 12a: `SessionKeeper` reads the status on mount and again at `warnAt`, redirects on a 401 only, holds offline; `idleDeadline >= ceilingDeadline` → the ceiling message.
- Produces:
  - `shell-words.ts`: `SHELL_WORDS`, `SEARCH_GROUP_ORDER` (both `as const`), `fillTemplate(template: string, values: Record<string, string | number>): string`.
  - `shell-steps.ts`: `topBar`, `bell`, `bellBox`, `shellBanner` (re-export), `skipLink`, `menu`, `menuToggle`, `moreTab`, `moreSheet`, `globalSearchBox`: `(page: Page) => Locator`; `accountButton(page: Page, displayName: string): Locator`; `openSearch(page: Page, device: E2eDevice): Promise<Locator>`; `searchGroups(page: Page): Promise<string[]>`; `itStaffApi(): Promise<APIRequestContext>`; `createPendingDisposal(api: APIRequestContext, choices: AssetChoices, roomId: string, tag: string): Promise<{ assetId: string; requestId: string }>` (`AssetChoices` of `e2e/disposal/disposal-support.ts`); `standInStatus(page: Page, deadlines: { idleInMs: number; ceilingInMs?: number }): Promise<void>`.
  - Allow-list id `shell-requests-cancelled-by-navigation`.

**Decisions:**
- Not here: Task 11 owns the `playwright.config.ts` env and `tests/e2e-review.test.ts:79`; Task 10 owns the field-audit spec, `scan-steps.ts` and `tests/e2e-audit.test.ts:160`.
- The allow-list stays at 5: the existing entry is widened and renamed (search included: `global-search.tsx` aborts its own request); `reviewed` = the commit day.
- Bell names: unread > 0 "การแจ้งเตือน N รายการ" (N may hold a comma); rows, none unread "การแจ้งเตือน"; empty "ไม่มีงานค้าง". The rise sentence is title first: "งานรออนุมัติ เพิ่ม 1 รายการ".
- `standInStatus` unroutes, then answers **every** status request (never `times`: the keeper re-reads at a `warnAt` already past) until replaced or `page.unroute("**/api/session/status")`. Deadlines are fixed at the call; per answer `serverNow` = now, `loginAt` = `ceilingDeadline − 43_200_000`, `activeAt` = the call time, `idleDeadline` = call + min(idle, ceiling), `ceilingDeadline` = call + (`ceilingInMs` ?? 43_200_000); 200 before `idleDeadline`, then 401 `{ error: "Unauthorized" }` as the server answers. Before a 401: `measure.expectRefusal({ method: "GET", url: /\/api\/session\/status$/, status: 401, reason: "the stand-in status answers 401 after its deadline, as the server does" })`.
- The keep-alive is never stood in for. No real-time idle in E2E (a fresh sign-in is a hazard); 13B checks it by hand.
- The IT head gains `dashboard:view` (user decision 2026-10-25), so the work center's dot is checked in E2E. In `run-plan.ts` it is appended after `"disposal:export"`, with the comment `// and the work center (dashboard:view) for the menu B shell's work-center dot (user decision 2026-10-25)`. The `tests/e2e-suite.test.ts` pin and the §7 row ("…; the work center (`dashboard:view`) for the menu dot, user decision 2026-10-25") follow. The landing page stays `/th/dashboard`. Grep `e2e/` for any check that the IT head lacks the work center link (dashboard, my-assets, notifications, access-denied, the bell's foot) and flip it in this task.
- Anchor names (`exact: true` or `^…$`): "เพิ่มเติม" is inside "การดำเนินการเพิ่มเติม", "อ่านแล้ว" inside "อ่านแล้วทั้งหมด".
- Every `SHELL_WORDS` value must be in `messages/th.json`; where a task shipped other copy, take th.json's.
- The bell check writes through the app (two pending disposal requests per project per run, the IT head's read states); nothing is deleted.
- E2E impact: specs rely on one `<main>`, no shell `h1`, `ShellBanner` outside `<main>` (`roles-ui.ts:29-30`), no `.tag` in the top bar `<header>` (`single-request.spec.ts:59`).

- [ ] **Step 1: Write the failing tests.** `tests/e2e-shell.test.ts`:

  ```ts
  const read = (f: string) => readFileSync(f, "utf8").replace(/\r/g, "")
  const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []

  test("the shell specs use the suite's fixtures and users, run the phone on Chromium, and read the app's own words (menu B shell task 13A)", async () => {
    const { SHELL_WORDS, SEARCH_GROUP_ORDER, fillTemplate } = await import("../e2e/shell/shell-words.ts")
    const th = new Set(values(JSON.parse(read("messages/th.json"))))
    for (const [name, text] of Object.entries(SHELL_WORDS)) assert.ok(th.has(text), `${name}: "${text}" is a value of messages/th.json`)
    assert.equal(fillTemplate(SHELL_WORDS.increase, { title: SHELL_WORDS.approvalInbox, count: 1 }), "งานรออนุมัติ เพิ่ม 1 รายการ")
    assert.deepEqual(SEARCH_GROUP_ORDER, ["ทรัพย์สิน", "งานซ่อม", "รอบตรวจนับ", "ตัดจำหน่าย", "พนักงาน", "ที่ตั้ง", "ผู้ขาย", "บริษัท", "สาขา"])
    for (const label of SEARCH_GROUP_ORDER) assert.ok(read("src/app/api/search/route.ts").includes(`"${label}"`) || th.has(label), label)
    for (const file of ["e2e/shell/shell.spec.ts", "e2e/shell/session.spec.ts"]) {
      const spec = read(file)
      assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), file)
      assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), `${file}: the phone on Chromium`)
    }
    const shell = read("e2e/shell/shell.spec.ts")
    assert.ok(shell.includes(`asUser("itHead")`) && shell.includes(`asUser("itStaff")`))
  })

  test("the run's saved sessions outlive the run: the app under test idles after more than the run's 90 minutes, the ceiling keeps its default (menu B shell task 13A)", () => {
    const config = read("playwright.config.ts")
    const idle = Number(config.match(/SESSION_IDLE_SECONDS: "(\d+)"/)?.[1])
    assert.equal(idle, 10800)
    assert.match(config, /globalTimeout: 90 \* 60 \* 1000,/)
    assert.ok(idle * 1000 > 90 * 60 * 1000)
    assert.doesNotMatch(config, /SESSION_CEILING_SECONDS/, "the 12-hour ceiling is the app's default")
    assert.match(read("e2e/shell/session.spec.ts"), /10_800_000/)
  })

  test("the session checks stand in for the status read only, answer 401 after the deadline as the server does, go offline through the measurement, and never sign in (menu B shell task 13A)", () => {
    const session = read("e2e/shell/session.spec.ts") + read("e2e/shell/shell-steps.ts")
    assert.match(session, /page\.route\("\*\*\/api\/session\/status", /)
    assert.match(session, /status: 401, json: \{ error: "Unauthorized" \}/)
    assert.ok(session.includes("measure.expectRefusal({") && session.includes(`page.unroute("**/api/session/status")`))
    assert.doesNotMatch(session, /route\([^)]*keep-alive/, "the keep-alive is the app's own")
    assert.doesNotMatch(session, /\btimes:/, "the stand-in answers every status request")
    assert.ok(session.includes("measure.whileOffline(") && !session.includes("setOffline("))
    assert.ok(session.includes(`name: "authjs.session-token"`) && session.includes("session-expired"))
  })

  test("the bell check makes its own waiting work as IT staff and reads the box as the IT head (menu B shell task 13A)", () => {
    const steps = read("e2e/shell/shell-steps.ts")
    assert.match(steps, /authStateFile\(readRunState\(\)\.runId, "itStaff"\)/)
    assert.match(steps, /\.post\("\/api\/disposal-requests", \{\s*data: \{[^}]*disposalType: "dispose"/)
    assert.ok(read("e2e/shell/shell.spec.ts").includes(`"asset-system:notification-summary-changed"`))
  })
  ```

- [ ] **Step 2: Run them and see them fail.** `node --test tests/e2e-shell.test.ts` → test 1 `Cannot find module '…/e2e/shell/shell-words.ts'`; tests 2–4 `ENOENT` (`session.spec.ts`, `shell-steps.ts`).

- [ ] **Step 3: `e2e/shell/shell-words.ts`.**
  ```ts
  export const SHELL_WORDS = {
    bellLabel: "การแจ้งเตือน {count} รายการ", title: "การแจ้งเตือน", bellEmpty: "ไม่มีงานค้าง",
    groupDecide: "รอคุณตัดสิน", groupFollow: "ควรติดตาม", read: "อ่านแล้ว", markAllRead: "อ่านแล้วทั้งหมด", allRead: "อ่านครบแล้ว",
    approvalInbox: "งานรออนุมัติ", increase: "{title} เพิ่ม {count} รายการ", openWorkCenter: "เปิดศูนย์งานค้าง",
    skipLink: "ข้ามไปเนื้อหาหลัก", collapseMenu: "ย่อเมนู", expandMenu: "ขยายเมนู", userMenu: "เมนูผู้ใช้: {name}", languageMenu: "เปลี่ยนภาษา ({code})",
    switchToDark: "เปลี่ยนเป็นโหมดมืด", switchToLight: "เปลี่ยนเป็นโหมดสว่าง", logout: "ออกจากระบบ",
    more: "เพิ่มเติม", close: "ปิด", openMenu: "เปิดเมนู", moreLanguage: "ภาษา", moreTheme: "ธีม", themeLight: "สว่าง", themeDark: "มืด",
    assetRegister: "ทะเบียนทรัพย์สิน", assetManagement: "จัดการทรัพย์สิน",
    searchLabel: "ค้นหาทั่วระบบ", searchMinChars: "พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา", viewAllInRegister: "ดูทั้งหมดในทะเบียน ({count})",
    registerRange: "{from}–{to} จาก {total} รายการ", recentTitle: "เปิดล่าสุด", recentClearLabel: "ล้างรายการที่เปิดล่าสุด", notFound: "ไม่พบ \"{query}\"",
    actionScan: "สแกน / ค้นหาทรัพย์สิน", actionRegister: "หาในทะเบียนด้วยตัวกรอง", actionCreateAsset: "เพิ่มทรัพย์สิน",
    idleWarning: "จะออกจากระบบใน {time} นาทีเพราะไม่มีการใช้งาน · งานที่กรอกค้างไว้ยังไม่ถูกบันทึก",
    ceilingWarning: "จะออกจากระบบเวลา {time} · ครบ {hours} ชั่วโมงของการเข้าระบบ บันทึกงานก่อนแล้วเข้าใหม่",
    stay: "อยู่ในระบบต่อ", sessionExpired: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", offline: "ออฟไลน์อยู่ · บันทึกไม่ได้จนกว่าจะกลับมาออนไลน์",
  } as const
  export const SEARCH_GROUP_ORDER = ["ทรัพย์สิน", "งานซ่อม", "รอบตรวจนับ", "ตัดจำหน่าย", "พนักงาน", "ที่ตั้ง", "ผู้ขาย", "บริษัท", "สาขา"] as const
  ```

- [ ] **Step 4: `e2e/shell/shell-steps.ts`.**
  - `topBar` = `page.getByRole("banner")`; `bell` = `page.getByRole("button", { name: /^(?:การแจ้งเตือน(?: [\d,]+ รายการ)?|ไม่มีงานค้าง)$/ })`; `bellBox` = `page.getByRole("dialog", { name: "การแจ้งเตือน" })`; `skipLink` = `page.getByRole("link", { name: "ข้ามไปเนื้อหาหลัก", exact: true })`; `menu` = `page.getByRole("complementary")`; `menuToggle` = `topBar(page).getByRole("button", { name: /^(?:ย่อเมนู|ขยายเมนู)$/ })`; `accountButton` = `menu(page).getByRole("button", { name: displayName })`; `moreTab` = `page.locator("[data-mobile-field-navigation]").getByRole("button", { name: "เพิ่มเติม", exact: true })`; `moreSheet` = `page.getByRole("dialog", { name: "เพิ่มเติม", exact: true })`; `globalSearchBox` = `page.getByRole("combobox", { name: "ค้นหาทั่วระบบ", exact: true })`.
  - `openSearch`: desktop presses `/` on the page and returns `globalSearchBox`; phone clicks `topBar(page).getByRole("button", { name: "ค้นหาทั่วระบบ", exact: true })` and returns the combobox inside `page.getByRole("dialog", { name: "ค้นหาทั่วระบบ" })`.
  - `searchGroups`: the heading text named by each `aria-labelledby` of `page.getByRole("listbox").getByRole("group")`, in DOM order.
  - `itStaffApi` = `request.newContext({ baseURL: readRunState().baseURL, storageState: fromRoot(authStateFile(readRunState().runId, "itStaff")) })`.
  - `createPendingDisposal`: `api.post("/api/assets", { data })` with the body of `createAssets` (`e2e/disposal/disposal-support.ts:89-112`, `name: \`${tag} เครื่องทดสอบกระดิ่ง\``), then `api.post("/api/disposal-requests", { data: { assetId, disposalType: "dispose", reason: \`${tag} ทดสอบกระดิ่งแจ้งเตือน รอผู้อนุมัติ\`, requestedById: readRunData().employees.itStaff.id, approverId: null, saleValue: null, salvageValue: null, sourceType: null, sourceId: null } })`; each must answer 201, else throw with the status and 300 characters of the body.
  - `standInStatus` per Decisions: `page.route("**/api/session/status", (route) => route.fulfill(Date.now() < idleDeadline ? { json: body() } : { status: 401, json: { error: "Unauthorized" } }))`.

- [ ] **Step 5: `e2e/support/allow-list.ts`.** Replace the `topbar-notifications-cancelled-by-redirect` entry:
  ```ts
    {
      id: "shell-requests-cancelled-by-navigation",
      kind: "requestfailed",
      url: /\/api\/(?:notifications\?locale=[a-z]{2}|session\/(?:status|keep-alive)|search\?q=[^&]*&locale=[a-z]{2})$/,
      errorText: /^(?:net::ERR_ABORTED|cancelled|Load request cancelled)$/,
      reason:
        "The shell makes its own background requests on every dashboard page: the notification summary as the page hydrates, every 2 minutes and when the tab shows again (src/components/layout/shell-notifications.tsx), the session status as the page hydrates and a keep-alive after input (src/components/layout/session-keeper.tsx), and the search, which aborts its own request when the words change (src/components/layout/global-search.tsx). A redirect that arrives as a client navigation, a page.goto or the search's own abort cancels them (Chromium net::ERR_ABORTED). A cancelled request is the navigation's or the component's doing; any of them answered with an error status is still a failure (a response record).",
      reviewed: "<the commit day>",
    },
  ```

- [ ] **Step 6: `e2e/shell/shell.spec.ts`** (5 tests in `describe` blocks with `asUser("itHead")` / `asUser("itStaff")`; `displayName` = `readRunData().users[key]!.displayName`; pages through `measure.visit`).
  1. **"the bell names its count, groups the work, reads all without hiding it, and a rise brings the row back"** (itHead, four projects).
     - Setup: `readAssetChoices(page, measure)`; `prefix = recordPrefix(testInfo, "BELL")`; `createRoom(\`${prefix}-ROOM\`, \`${prefix} ห้องทดสอบกระดิ่ง\`)`; `createPendingDisposal(staff, …, \`${prefix}-1\`)` with `staff = await itStaffApi()` (disposed after).
     - `/th/dashboard`: `bell` name matches `/^การแจ้งเตือน [1-9][\d,]* รายการ$/`. The work center's dot: the link `/^ศูนย์งานค้าง/` (desktop: in `menu`; phone: in `moreSheet`, opened by `moreTab` and closed with "ปิด" `exact`) contains text matching `/มีงานรอคุณ [1-9][\d,]* รายการ/` (`SHELL_WORDS` takes `nav.workCenterWaiting`). In `bellBox` the `groupDecide` heading holds the link `/^งานรออนุมัติ/`; a `groupFollow` heading, if shown, comes after. `measure.recordPage("IT head: the bell box")`.
     - Click `markAllRead`: `allRead` shows; the approval row stays and contains "อ่านแล้ว"; `bell` is named "การแจ้งเตือน"; the work center link no longer contains "มีงานรอคุณ" (one count: the dot follows the unread decisions).
     - `page.reload()`: the same name; `page.getByRole("status").filter({ hasText: /เพิ่ม [\d,]+ รายการ/ })` count 0.
     - `createPendingDisposal(…, \`${prefix}-2\`)`, then `page.evaluate(() => window.dispatchEvent(new Event("asset-system:notification-summary-changed")))`: the count name returns, the approval row has no "อ่านแล้ว", the work center link contains "มีงานรอคุณ" again, and `page.getByRole("status").filter({ hasText: /^งานรออนุมัติ เพิ่ม [1-9]\d* รายการ$/ })` count 1.
     - `bellBox` has the link "เปิดศูนย์งานค้าง" (the IT head now holds `dashboard:view`). Phone only: on `/th/assets/new`, `bell(page)` count 0.
  2. **The desktop menu** (itStaff; `test.skip(e2eDevice !== "desktop", …)`), `/th/dashboard`:
     - `topBar` has one button `/^เปลี่ยนภาษา/` and none `/^เมนูผู้ใช้:/`.
     - Click `menuToggle`: name "ย่อเมนู" → "ขยายเมนู", `aria-expanded` "true" → "false"; `menu` box width 64; cookie `sidebar` = `"collapsed"`; `(await page.request.get("/th/dashboard")).text()` contains "ขยายเมนู"; after `page.reload()` the width is 64.
     - Hover, then focus, the link "ทะเบียนทรัพย์สิน": `page.getByRole("tooltip", { name: "ทะเบียนทรัพย์สิน" })` shows each time. `recordPage`.
     - Click the group "จัดการทรัพย์สิน": toggle "ย่อเมนู", group `aria-expanded="true"`, cookie `sidebar` = `"expanded"`.
     - `accountButton(page, displayName)` opens a `menu` containing `displayName`. `recordPage`. Menuitem "ออกจากระบบ" → `/th/login`; `page.goto("/th/dashboard")` lands on `/th/login` without `reason=session-expired` and without "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่".
  3. **Search** (itStaff, four projects; `runId = readRunState().runId`), `/th/dashboard`:
     - `openSearch`; `fill("E")` shows "พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา".
     - `fill(runId)`: `searchGroups` equals `SEARCH_GROUP_ORDER.filter((label) => present.includes(label))` and includes "ทรัพย์สิน" and "รอบตรวจนับ"; the first option's `mark` text matches `new RegExp(runId, "i")`. `recordPage`.
     - The option `/^ดูทั้งหมดในทะเบียน \(([\d,]+)\)$/` leads to `/th/assets?search=…&exact=1`, whose `main` contains `จาก ${N} รายการ` (N as shown).
     - Open a result, go back to `/th/dashboard`, open the empty box: the "เปิดล่าสุด" group lists it; the option "ล้างรายการที่เปิดล่าสุด" empties it and `localStorage.getItem("asset-system:recent-search:v1:th")` is `null`.
     - `fill(\`${runId}-ไม่มีจริง\`)`: `ไม่พบ "${runId}-ไม่มีจริง"` and the options "สแกน / ค้นหาทรัพย์สิน", "หาในทะเบียนด้วยตัวกรอง", "เพิ่มทรัพย์สิน".
     - Desktop: `/` typed in the register's own search field (in `main`, `/th/assets`) stays in that field; `globalSearchBox` is not focused.
  4. **The phone sheet** (itStaff; `test.skip(e2eDevice !== "phone", …)`), `/th/dashboard`:
     - `topBar` has no button `/^เปลี่ยนภาษา/`, "เปลี่ยนเป็นโหมดมืด", "เปลี่ยนเป็นโหมดสว่าง" or `/^เมนูผู้ใช้:/`; it has `bell` and the button "ค้นหาทั่วระบบ".
     - `moreTab` opens `moreSheet` with `displayName`, the link "ทะเบียนทรัพย์สิน" and the button "จัดการทรัพย์สิน". `recordPage`.
     - Group "ธีม": the other theme's button flips `html[data-theme]` and the `theme` cookie.
     - "ปิด" (`exact`) closes the sheet; focus returns to `moreTab`.
     - Group "ภาษา": "English" → `/en/dashboard`, `html[lang=en]`; `[data-mobile-field-navigation] [aria-controls="mobile-more-sheet"]` reopens it; "ภาษาไทย" → `/th/dashboard`.
     - `/th/assets/new`: "เปิดเมนู" opens `moreSheet`; "ออกจากระบบ" → `/th/login`.
  5. **The skip link and the top bar** (itStaff, four projects): on `/th/dashboard`, `Tab` focuses `skipLink` inside the viewport; `Enter` focuses `main#main` with no `#main` in the URL; `topBar` box height 56.

- [ ] **Step 7: `e2e/shell/session.spec.ts`** (`asUser("itStaff")`, four projects, 2 tests).
  - (a) **"the status and the keep-alive tell the deadlines; the idle and ceiling warnings show in the banner"**:
    - On `/th/dashboard`, a page `fetch` of the status: 200, ISO fields, `idleDeadline <= ceilingDeadline`, `ceilingDeadline − loginAt === 43_200_000`, `ceilingDeadline` between `Date.parse(readRunState().startedAt) + 43_200_000` and that plus 20 min.
    - A page `fetch` POST of the keep-alive: 200, the same `ceilingDeadline`, `idleDeadline` within ±120 s of `Date.now() + 10_800_000`.
    - `standInStatus(page, { idleInMs: 240_000 })`, visit `/th/dashboard`: `shellBanner` contains `/จะออกจากระบบใน [34]:\d{2} นาทีเพราะไม่มีการใช้งาน · งานที่กรอกค้างไว้ยังไม่ถูกบันทึก/`. `recordPage`. "อยู่ในระบบต่อ" clears it (no "จะออกจากระบบ").
    - `standInStatus(page, { idleInMs: 240_000, ceilingInMs: 240_000 })`, visit: the banner contains `/จะออกจากระบบเวลา \d{2}:\d{2} · ครบ 12 ชั่วโมงของการเข้าระบบ บันทึกงานก่อนแล้วเข้าใหม่/` and no button "อยู่ในระบบต่อ". `page.unroute("**/api/session/status")`.
  - (b) **"offline holds the deadline; the deadline and a stale cookie both land on the login that says why"**:
    - `standInStatus(page, { idleInMs: 15_000 })`, visit `/th/assets`; in `measure.whileOffline`: the banner contains "ออฟไลน์อยู่ · บันทึกไม่ได้จนกว่าจะกลับมาออนไลน์" and not "จะออกจากระบบ"; after `page.waitForTimeout(20_000)` the URL is still `/th/assets`; `page.unroute("**/api/session/status")`. Online again: the offline line goes, the URL stays.
    - `measure.expectRefusal(…)`, `standInStatus(page, { idleInMs: 3_000 })`, visit `/th/assets?search=E2E`: the URL becomes `/th/login?…` with `reason=session-expired` and `callbackUrl` = `/th/assets?search=E2E` (`URL.searchParams`); "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" visible. `recordPage`.
    - `page.context().clearCookies()`, `addCookies([{ name: "authjs.session-token", value: "e2e-stale-session", url: baseURL }, { name: "theme", value: e2eTheme, url: baseURL }])`; `/th/dashboard` lands on the login with `reason=session-expired`.

- [ ] **Step 8: Update existing pins.**
  - `tests/e2e-cross-cutting.test.ts`, the allow-list block becomes (Task 3's two source pins stay after it):
    ```ts
    // The reviewed allow-list entry for the shell's background requests that a navigation or the search's own abort
    // cancels: each cancelled one passes, the same fetch answered 500 still fails, any other cancelled request still fails.
    const page = "http://localhost:3100/th/assets/new"
    const at = (path: string) => `http://localhost:3100${path}`
    const aborted = (method: string, url: string) => ({ method, url, errorText: "net::ERR_ABORTED", resourceType: "fetch", pageUrl: page })
    const shellRequests = [["GET", at("/api/notifications?locale=th")], ["GET", at("/api/session/status")], ["POST", at("/api/session/keep-alive")], ["GET", at("/api/search?q=E2E&locale=th")]]
    const classified = classify(
      { console: [], responses: [{ method: "GET", url: at("/api/notifications?locale=th"), status: 500, resourceType: "fetch", pageUrl: page }],
        failures: [...shellRequests.map(([method, url]) => aborted(method, url)), aborted("GET", at("/api/notifications/summary")), aborted("GET", at("/api/session/other"))] },
      ALLOW_LIST, [],
    )
    assert.deepEqual(classified.allowed, shellRequests.map(([, url]) => ({ id: "shell-requests-cancelled-by-navigation", kind: "requestfailed", url })))
    assert.deepEqual(classified.unexpectedResponses.map((response) => response.status), [500])
    assert.deepEqual(classified.unexpectedFailures.map((failure) => failure.url), [at("/api/notifications/summary"), at("/api/session/other")])
    ```
    After Task 3's pins: `const keeper = read("src/components/layout/session-keeper.tsx")`; `assert.ok(keeper.includes(\`"/api/session/status"\`) && keeper.includes(\`"/api/session/keep-alive"\`))`; `assert.match(read("src/components/layout/global-search.tsx"), /fetch\(`\/api\/search\?q=\$\{encodeURIComponent\([^)]*\)\}&locale=\$\{locale\}`/)`.
  - `tests/e2e-review.test.ts:41-48` (no hazard): add `["GET", "/api/session/status"]`, `["POST", "/api/session/keep-alive"]`, `["PATCH", "/api/notifications"]`, `["POST", "/api/auth/signout"]`.
  - `tests/e2e-suite.test.ts:153`: the IT head's `deepEqual` list ends `…, "disposal:export", "dashboard:view"]`; the comment above it adds "and the work center (user decision 2026-10-25)".
  - Green unedited: `tests/e2e-suite.test.ts:268` (`ALLOW_LIST.length <= 5`), `tests/e2e-review.test.ts:105` (`signInOnce(` callers).

- [ ] **Step 9: Verify.** `node --test tests/e2e-shell.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-review.test.ts tests/e2e-suite.test.ts`: all pass. `npm test`: +4 tests, 0 fail, 1 skipped. `npx tsc --noEmit -p .`: no output. `npm run lint`: 0 errors. `npx playwright test --list`: 7 new tests × 4 projects in 2 more files (314 in 26, from 286 in 24).

- [ ] **Step 10: Commit.**
  ```
  git add e2e/shell/shell-words.ts e2e/shell/shell-steps.ts e2e/shell/shell.spec.ts e2e/shell/session.spec.ts e2e/support/allow-list.ts e2e/support/run-plan.ts docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md tests/e2e-shell.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-review.test.ts tests/e2e-suite.test.ts
  git commit -m "test(shell): E2E checks for the bell, the menu, search, the phone sheet, the skip link and the session; one allow-list entry for the shell's requests (menu B shell task 13A)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

### Task 13B: The full E2E run (controller)

**Files:**
- Modify: only what a failure needs, one commit per fix. Evidence: `.superpowers/sdd/2026-10-21-menu-b-shell/task-13-findings.md` (git-ignored).
- Test: the suite; per test fix a pin in `tests/e2e-shell.test.ts`, per app fix a unit test in the owning task's test file.

**Interfaces:**
- Consumes: Tasks 1–13A on `feat/shell-b`.
- Produces (findings file, for 13C): run id, commit, minutes, per project passed/failed/skipped; pages measured, axe, console errors, hazard stops; allowed counts of `shell-requests-cancelled-by-navigation`, `next-prefetch-cancelled`, `offline-by-the-test`; secret-scan hits; the real-time check.

**Decisions:**
- A clean build is required: `.next` still holds the spike's build.
- The real-time idle and ceiling check runs only here, by hand.
- No retry; never touch `e2e/support/hazards.ts` or the approval settings; no sixth allow-list entry; a changed entry gets a new `reviewed` day.
- A partial rerun is evidence only; green means a whole run.

- [ ] **Step 1: Before the run** (these checks are the test).
  - `npm test`, `npx tsc --noEmit -p .`, `npm run lint` green on HEAD.
  - The AS-R11 SELECT probe (`docs/superpowers/plans/2026-10-20-e2e-suite.md:144`): `query failed: ETIMEOUT` → stop and tell the user.
  - Port 3100 free; `.env.e2e` holds `E2E_SEED_USERNAME` and `E2E_SEED_PASSWORD` (never print it); the PC kept awake.
  - `rm -rf .next/cache/turbopack && npm run build`.
  - Real-time check: DB guard first; `next start -p 3150` with process env `SESSION_IDLE_SECONDS=60 SESSION_CEILING_SECONDS=180 AUTH_URL=NEXTAUTH_URL=http://localhost:3150 NOTIFICATION_DIGEST_WEBHOOK_URL=`, in its own browser profile (localhost cookies cross ports); cases A, B2, C, D, E of `.superpowers/sdd/2026-10-21-functional-fix-batch/session-spike-report.md` against the real `SessionKeeper` and banner (warning, "อยู่ในระบบต่อ", redirect with `reason=session-expired` and the page as `callbackUrl`); record each; stop the server.
- [ ] **Step 2: Run it.** `npm run test:e2e`. Expected (no other new E2E test): setup 2 passed; desktop-light 75 passed, 3 skipped; desktop-dark 74 / 4; phone-light 76 / 2; phone-dark 76 / 2; 303 passed, 0 failed, 11 skipped; about 47 minutes (37 before), so the VPN must hold.
- [ ] **Step 3: The fix loop.** App bug: fix in the owning task's file with its unit test. Test bug: fix in `e2e/shell/` with a pin in `tests/e2e-shell.test.ts`. Then the whole suite again.
- [ ] **Step 4: Verify.** Exit 0, 0 failed, 0 flaky; axe 0 serious/critical on every page; 0 console errors; 0 hazard stops; `node scripts/e2e-scan-secrets.mjs` 0 hits; the port free. Numbers into the findings file.
- [ ] **Step 5: Commit** each fix: `git add <fixed files> <their test>`; `git commit -m "fix(shell): <what> (menu B shell task 13B loop N)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (`test(shell): …` for a test fix). A clean first run has no commit.

### Task 13C: Docs and the wiki

**Files:**
- Modify: `docs/99_CHANGELOG.md` (first under the newest `## ` date, today `:7`); `DEVELOPER_HANDOFF.md` (`:3`, the clause in `:93`, a section between `## E2E Workflow Suite (2026-10-21)` and `## Open Go-Live Decisions`); `docs/07_UAT_CHECKLIST.md` (a section between `## E2E Suite Follow-up (2026-10-21)` and `## Sign-Off`; a note under `## Shell Presentation UAT` and `## Mobile Field Navigation UAT`); `docs/04_AUTH_RBAC.md:22`; `docs/02_ARCHITECTURE.md:21`; `docs/14_UI_UX_DESIGN_SYSTEM.md` (the `| Navigation |` row, a registry row after `| Form errors |`); `DEPLOYMENT_UBUNTU_CLOUDFLARE.md` (after `:148`)
- Modify (vault `D:/Obsidian/Eltross`): `AssetSystem/ams-status.md`, `ams-open-questions.md`, `ams-log.md`
- Test: `tests/shell-docs.test.ts` (new); `tests/e2e-docs.test.ts:24`

**Interfaces:**
- Consumes: Task 13B's findings file; the names of Tasks 1–12. Produces: none for code.

**Decisions:**
- The docs give the E2E idle override as `SESSION_IDLE_SECONDS: "10800"` (Task 11's).
- docs/14's Navigation row keeps Task 1's first cell verbatim (Task 1 pins it); only the phone cell changes; no "light only" or `STALE_2D` phrase.
- The changelog's older "8 hours" lines are history and stay.
- `<plan file>` = the saved plan's file name in `docs/superpowers/plans/`; every marker is filled from the findings file.
- Wiki open questions:
  - Still open: another person's held scans. Nobody gets "ลบออกจากคิว"; the user said to leave it for now (2026-10-25).
  - Answered by the user on 2026-10-25. Record each as decided, not open:
    - The E2E IT head holds `dashboard:view`, and the work center's dot is in E2E.
    - The register search matches the global search's 19 fields, so "(N)" agrees with the rows.
    - There is no `scroll-padding-top`. Only `<main>` scrolls, below the top bar and the banner (spec §6.3, §6.7 and §6.9; Task 6).
    - Activity is the person's own input only; background requests never extend a session (spec §6.8; Tasks 11 and 12a).
    - On the audit scan page, the offline banner reads "ออฟไลน์อยู่ · <the page's line>".
  - Also record the spec §8 calls, if they are still unconfirmed.
  - `ams-index.md` is unchanged.

- [ ] **Step 1: Write the failing test.** `tests/shell-docs.test.ts` (reads strip `\r`):
  ```ts
  test("the handoff, the changelog, the UAT list and the docs record the menu B shell in place, with every marker filled (menu B shell task 13C)", () => {
    const handoff = read("DEVELOPER_HANDOFF.md")
    const section = handoff.indexOf("\n## Menu B App Shell (")
    assert.ok(section > handoff.indexOf("\n## E2E Workflow Suite (") && section < handoff.indexOf("\n## Open Go-Live Decisions"))
    const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
    for (const name of ["`SESSION_IDLE_SECONDS`", "`SESSION_CEILING_SECONDS`", "`POST /api/session/keep-alive`", "`GET /api/session/status`", "`read_all`", "`sidebar`", "`shell-requests-cancelled-by-navigation`", "`e2e/shell/`", "`SESSION_IDLE_SECONDS: \"10800\"`"]) assert.ok(record.includes(name), name)
    assert.match(record, /\n- Whole run: \(Task 13B\) \S/)
    assert.doesNotMatch(handoff, /^> Last updated: 2026-10-19$/m)
    assert.doesNotMatch(handoff, /change the eight-hour session policy/)
    const changelog = read("docs/99_CHANGELOG.md")
    const newest = changelog.indexOf("\n## ")
    const entry = changelog.indexOf("\n### เมนู B และกรอบหน้าใหม่ (งาน shell)\n")
    assert.equal(changelog.indexOf("\n### ", newest), entry, "the shell's entry is the first one under the newest date")
    assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ผลรอบสุดท้าย:\*\* \(Task 13B\) \S/)
    const uat = read("docs/07_UAT_CHECKLIST.md")
    const shellUat = uat.indexOf("\n## Menu B Shell UAT (")
    assert.ok(shellUat > uat.indexOf("\n## E2E Suite Follow-up (") && shellUat < uat.indexOf("\n## Sign-Off"))
    for (const item of ["NVDA", "VoiceOver", "TalkBack", "60 minutes", "12 hours", "dashboard:view", "IndexedDB"]) assert.ok(uat.slice(shellUat, uat.indexOf("\n## Sign-Off")).includes(item), item)
    const authDoc = read("docs/04_AUTH_RBAC.md")
    assert.doesNotMatch(authDoc, /JWT sessions last 8 hours/)
    assert.match(authDoc, /60 minutes without use[\s\S]*12 hours after sign-in/)
    assert.ok(read("docs/02_ARCHITECTURE.md").includes("`SessionKeeper`"))
    const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
    assert.ok(index.includes("\n| App shell, menu B | [`2026-10-21-menu-b-shell-design.md`]"))
    assert.ok(read("DEPLOYMENT_UBUNTU_CLOUDFLARE.md").includes("# SESSION_IDLE_SECONDS=3600\n# SESSION_CEILING_SECONDS=43200"))
    const markers = /<today>|<N>|<run id>|<commit>|<plan file>|<from task-13-findings>|<จาก task-13-findings>/g
    for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog], ["docs/07_UAT_CHECKLIST.md", uat], ["docs/14_UI_UX_DESIGN_SYSTEM.md", index]]) assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  })
  ```
- [ ] **Step 2: Run it and see it fail.** `node --test tests/shell-docs.test.ts tests/e2e-docs.test.ts` → `shell-docs` fails its first `assert.ok` (`section` is -1); `e2e-docs` passes.
- [ ] **Step 3: The changelog**, first under `## <today>` (add the heading if the date is new):
  ```
  ### เมนู B และกรอบหน้าใหม่ (งาน shell)

  Branch `feat/shell-b` (จาก `master` `eb5c2b4e`) · spec `docs/superpowers/specs/2026-10-21-menu-b-shell-design.md` · plan `docs/superpowers/plans/<plan file>`

  - **เมนูและแถบบน:** เมนูข้างสีกรมท่า แถบบนและแถบล่างมือถือยังสว่าง (`--chrome`) · แถบบนสูง 56px ทุกหน้า · ชื่อ บทบาท และออกจากระบบอยู่ท้ายเมนู · ย่อเมนูแล้วจำไว้ในคุกกี้ `sidebar` · ไอคอนบอกชื่อเมื่อชี้หรือโฟกัส · ลิงก์ "ข้ามไปเนื้อหาหลัก"
  - **การแจ้งเตือน:** ตัวเลขอยู่ที่กระดิ่งที่เดียว · กล่องแบ่ง "รอคุณตัดสิน" กับ "ควรติดตาม" · "อ่านแล้วทั้งหมด" · แถวที่อ่านแล้วยังอยู่และกลับมาเมื่อจำนวนเพิ่ม ไม่ใช่เมื่อลด · โหลดใหม่ทุก 2 นาทีขณะเปิดหน้า · บอกงานที่เพิ่มครั้งเดียว · ศูนย์งานค้างมีจุดส้มแทนตัวเลข
  - **ค้นหา:** แบ่งกลุ่มตามประเภท · ไฮไลต์คำ · กด `/` จากทุกหน้า · ที่เปิดล่าสุด 5 รายการ · ทรัพย์สินบอกจำนวนจริงตรงกับทะเบียน · มือถือมีปุ่มค้นหา
  - **มือถือ:** "เพิ่มเติม" เปิดแผ่นด้านล่างที่มีผู้ใช้ เมนูทั้งหมดตามสิทธิ์ ภาษา ธีม และออกจากระบบ · กระดิ่งอยู่บนแถบบนของหน้าที่มีเมนูล่าง
  - **แถบข้อความ:** ที่เดียวใต้แถบบน · ออฟไลน์ทั้งแอป · หน้าสแกนตรวจนับย้ายบรรทัดสถานะมาที่นี่ เครื่องมือคิวยังอยู่ในหน้า
  - **เซสชัน:** ออกจากระบบเมื่อไม่ได้ใช้งาน 60 นาที (`SESSION_IDLE_SECONDS`) และเมื่อครบ 12 ชั่วโมงหลังเข้าระบบ (`SESSION_CEILING_SECONDS`) · คนที่ยังทำงานอยู่ได้ต่อเวลาเอง · เตือนก่อน 5 นาที · ไปหน้า login ที่บอก "เซสชันหมดอายุ" แล้วกลับหน้าเดิม · ขณะออฟไลน์ไม่ออกจากระบบ · คิวตรวจนับส่งเฉพาะคนที่สแกน · ทุกคนต้องเข้าระบบใหม่ 1 ครั้งหลัง deploy
  - **E2E:** spec ใหม่ใน `e2e/shell/` (กระดิ่ง ค้นหา เมนู แผ่นเพิ่มเติม ลิงก์ข้าม เซสชัน) · การตรวจนับออฟไลน์อ่านแถบข้อความ · แอปที่ทดสอบตั้ง `SESSION_IDLE_SECONDS=10800` เพราะ session ของรอบเข้าระบบครั้งเดียวตอนเริ่ม
  - **test:** <N> → <N> (ผ่าน <N> · ข้าม 1) · tsc ผ่าน · lint 0 error · build ผ่าน · ไม่มี migration
  - **ผลรอบสุดท้าย:** (Task 13B) รอบ `<run id>` (<N> นาที): ผ่าน <N> ไม่ผ่าน 0 ข้าม <N> (คอมสว่าง <N>, คอมมืด <N>, มือถือสว่าง <N>, มือถือมืด <N>) · axe 0 ทุกระดับใน <N> หน้า · console error 0 · หยุดสิ่งที่ห้ามแตะ 0 ครั้ง · สแกนรหัสผ่านใน report 0
  - **deploy:** ไม่ deploy · deploy ครั้งเดียวหลังสร้างหน้าตาม canvas, E2E อีกรอบ และ UAT
  ```
- [ ] **Step 4: `DEVELOPER_HANDOFF.md`.** `:3` → `> Last updated: <today>`. In `:93`, "or change the eight-hour session policy" → "or change the session policy (since the menu B shell: 60 minutes idle, 12 hours ceiling; see "Menu B App Shell")". The section:
  ```
  ## Menu B App Shell (<today>)

  - Branch `feat/shell-b` (from `master` `eb5c2b4e`; not deployed). Spec `docs/superpowers/specs/2026-10-21-menu-b-shell-design.md` · plan `docs/superpowers/plans/<plan file>` (Tasks 1–13).
  - What changed: the navy menu (`--sidebar*`) beside the light chrome (`--chrome`, `--chrome-border`; `THEME_COLORS` follows `--chrome`); one 56px top bar; the person at the menu's foot (`SidebarAccount`); the collapsed rail kept in the `sidebar` cookie (`Path=/; Max-Age=31536000; SameSite=Lax`, read on the server); the bell's two groups and `PATCH /api/notifications` `read_all`; read rows return when their count rises; the summary every 2 minutes while visible; grouped search with `/`; the phone's `MobileMoreSheet`; `ShellBanner` (The One Banner Rule); the skip link to `<main id="main">`.
  - The session: `SESSION_IDLE_SECONDS` (default 3600) and `SESSION_CEILING_SECONDS` (default 43200; blank or invalid values fall back) on the JWT claims `loginAt` and `activeAt`; `POST /api/session/keep-alive` (a route handler, not a server action: spike `5c5aba21`); `GET /api/session/status`; `SessionKeeper` on the client; `reason=session-expired` from the client, with the stale-cookie fallback in `redirectToLogin`. A token without `loginAt` counts as expired, so everyone signs in once after the deploy. No migration.
  - E2E: `e2e/shell/` (the bell, search, the menu, the phone sheet, the skip link, the session, with stand-in status answers); the app under test runs with `SESSION_IDLE_SECONDS: "10800"` because the run's saved sessions sign in once at setup; the allow-list entry `shell-requests-cancelled-by-navigation` (was `topbar-notifications-cancelled-by-redirect`). The spike's real-time check (60 s idle, 180 s ceiling) repeated on this build: <from task-13-findings>.
  - Whole run: (Task 13B) `<run id>` on `<commit>`, <N> minutes: setup <N> passed; desktop-light <N> passed, <N> skipped; desktop-dark <N> / <N>; phone-light <N> / <N>; phone-dark <N> / <N>; 0 failed, 0 flaky. <N> pages measured, axe 0, 0 console errors, 0 hazard stops, secret scan 0 hits.
  - Not covered by E2E: the 60-minute default in real time, a 401 from `useApiError`, the offline queue under another person. These are in the UAT list.
  - Left before the deploy: `docs/07_UAT_CHECKLIST.md` "Menu B Shell UAT", the canvas page groups, E2E again, UAT and the one deploy (wiki 27).
  ```
- [ ] **Step 5: `docs/07_UAT_CHECKLIST.md`.** Under `## Shell Presentation UAT` and `## Mobile Field Navigation UAT`: "Superseded by the menu B shell (see Menu B Shell UAT); kept as history." Before `## Sign-Off`:
  ```
  ## Menu B Shell UAT (<today>)

  The automated suite covers the shell in all four projects (`e2e/shell/`). A person still checks:

  - [ ] NVDA: the bell reads "การแจ้งเตือน N รายการ"; new work is read once ("งานรออนุมัติ เพิ่ม 1 รายการ"), never on the first load; each collapsed menu icon is read on focus; the skip link is the first stop.
  - [ ] VoiceOver (iOS) and TalkBack (Android): "เพิ่มเติม" opens the sheet, focus stays inside, a swipe down closes it and focus returns to the tab; its motion stops with reduced motion.
  - [ ] The work center's orange dot and "มีงานรอคุณ N รายการ" for a person with `dashboard:view` and approval work; it goes after "อ่านแล้วทั้งหมด".
  - [ ] In real time: a person filling a long form for more than 60 minutes is not signed out; 60 minutes without use warns 5 minutes ahead and lands on the login with "เซสชันหมดอายุ", then returns to the page; near 12 hours the warning has no "อยู่ในระบบต่อ".
  - [ ] The field audit offline for over an hour: the scan page stays; after reconnecting a lapsed session goes to the login, the queue waits in IndexedDB and is sent after the same person signs in; another person's sign-in does not send it, the scan page says whose it is, and nobody can remove it (open question).
  - [ ] Two tabs: activity in one keeps the other open.
  - [ ] The navy menu and the light top bar on a real monitor in both themes; the phone's white bars in bright light.
  - [ ] An English pass of the new messages.
  ```
- [ ] **Step 6: The other docs.**
  - `docs/04_AUTH_RBAC.md:22` begins "JWT sessions end after 60 minutes without use (`SESSION_IDLE_SECONDS`) or 12 hours after sign-in (`SESSION_CEILING_SECONDS`), whichever comes first; activity extends the idle deadline through `POST /api/session/keep-alive`; the `jwt` callback re-reads…" (the rest kept).
  - `docs/02_ARCHITECTURE.md:21` → "- `DashboardShell` is the client shell for the sidebar, the top bar, the banner region and content state; it takes `user`, `account`, `initialSidebar` and `sessionClock` from the layout, mounts `ShellNotificationsProvider`, the banner region (`ShellBanner`) and `SessionKeeper`, and is fixed to the viewport with `fixed inset-0`."
  - docs/14 Navigation row → "| Navigation | The navy menu with sections beside the topbar on the chrome color, in the light or the dark theme | Field navigation on navigation routes and the เพิ่มเติม sheet (the person, the full menu, language, theme, sign-out); hidden in focus-task routes |".
  - docs/14 registry, after `| Form errors |`: "| App shell, menu B | [`2026-10-21-menu-b-shell-design.md`](superpowers/specs/2026-10-21-menu-b-shell-design.md) (the navy menu beside the light chrome, one top bar, the bell's two groups, grouped search, the phone's more sheet, the banner region, the idle session) | [`<plan file>`](superpowers/plans/<plan file>) sequences implementation and verification. |"
  - `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`, after `NOTIFICATION_DIGEST_WEBHOOK_URL=` (`:148`): a blank line, `# Optional session limits in seconds (defaults: 3600 idle, 43200 ceiling). Leave commented to keep the defaults.`, `# SESSION_IDLE_SECONDS=3600`, `# SESSION_CEILING_SECONDS=43200`.
- [ ] **Step 7: The wiki** (read `AssetSystem/_schema/ams-wiki-schema.md` first).
  - `ams-status.md`: `verified: <today>`; `sources` + the spec, the plan, `src/lib/auth.ts`, `src/components/layout/session-keeper.tsx`, `playwright.config.ts`; a row "เมนู B: กรอบหน้าใหม่ · กระดิ่ง · ค้นหา · เซสชัน · แถบออฟไลน์" with the branch's state (built on `feat/shell-b`, not deployed) and the run's numbers.
  - `ams-open-questions.md`: #27 notes the shell is done and the next step; a new item "เมนู B: ยังไม่ได้ตรวจด้วยคน และเรื่องสำหรับวัน deploy" (the UAT list, the one sign-in for everyone, the optional `SESSION_*` envs, the E2E idle override, the open questions in Decisions).
  - `ams-log.md`: one line on top under `## <today>`.
- [ ] **Step 8: Update existing pins.** `tests/e2e-docs.test.ts:24` → `assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-21\n"), "the entry sits under 2026-10-21 (the menu B shell entry went above it later, menu B shell task 13C)")`. Green unedited: the e2e-docs handoff and UAT slices, `tests/dark-mode-docs.test.ts:61-63`, `tests/phase2d-docs.test.ts:46`, Task 1's Navigation-row pin.
- [ ] **Step 9: Verify.** `node --test tests/shell-docs.test.ts tests/e2e-docs.test.ts tests/dark-mode-docs.test.ts tests/phase2d-docs.test.ts tests/v-track-docs.test.ts tests/audit-round-cancellation.test.ts`: all pass. `npm test`: +1 test, 0 fail, 1 skipped. `npx tsc --noEmit -p .`: no output. `npm run lint`: 0 errors. At `D:\Obsidian\Eltross`, `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-`: no problems.
- [ ] **Step 10: Commit.**
  ```
  git add docs/99_CHANGELOG.md DEVELOPER_HANDOFF.md docs/07_UAT_CHECKLIST.md docs/04_AUTH_RBAC.md docs/02_ARCHITECTURE.md docs/14_UI_UX_DESIGN_SYSTEM.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md tests/shell-docs.test.ts tests/e2e-docs.test.ts
  git commit -m "docs(shell): the changelog, handoff, UAT list and docs record the menu B shell (menu B shell task 13C)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  git -C D:/Obsidian/Eltross add AssetSystem/ams-status.md AssetSystem/ams-open-questions.md AssetSystem/ams-log.md
  git -C D:/Obsidian/Eltross commit -m "ingest: AssetSystem menu B shell built and E2E green (<today>)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```
