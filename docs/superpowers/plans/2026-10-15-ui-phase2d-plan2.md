# UI Round 4 · Phase 2D Sweep and Guard Lock · Plan 2 (admin, reports, dashboard and shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Dry run:** scratch clone `p2d2-sim` of `da8388d`. Every code task (1a–18) was carried out there in order; `npx tsc --noEmit`, `npx eslint src tests` and `npm test` were green after the last one (2051 tests, 2050 pass, 1 skipped). Every replacement below was taken from those commits by a script that checked two things: each old snippet occurs exactly once where it is applied, and applying the snippets in order gives the committed file. The "watch them fail" lists were taken by running each task's tests against the commit before it. Tasks 0, 19, 20 and 21 were not run.

**Goal:** Sweep the admin screens, the reports, the dashboard, the work center, the notification center and the shell onto the shared parts (spec 2D §3.2):
- Panels are `ContentPanel` (or `getPanelClasses()` where the element cannot be one), tables `DataTable`, numbers `StatStrip`, label and value pairs `KeyValueList`.
- Messages are `Notice` by meaning, states `StatusBadge`, names the new shared `Chip`, empty states `EmptyNote` / `ActionEmptyState`, empty values `Nil`.
- Buttons and button-shaped links are `Button` / `buttonVariants`, text links `linkVariants`, record codes `tag`.
- The D18 items of this plan land: the close X of every dialog and sheet comes first in the Tab order while focus still opens on the first control, the settings tab row fits at 1440, and the topbar search no longer runs under the bell at 200% zoom.
- The 2D-1 hand-ons land: the unread `scanning` key, the `lg` buttons outside field rows, `system-settings-form.tsx:1027`, `IntegrationClientManager.tsx:844` and `reports-accounting-view.tsx:74`.

Workflows, data, validation, permissions (one exception the spec approved, D11), the API and the database stay the same.

**Architecture:**
- **One file is one commit**, with every sweep category of that file and its guard rows in the same commit (spec §3, §5.6). Shared primitives come first (Task 1), then the shell, then the files by area. The order keeps `npx tsc --noEmit`, `npm test` and `npm run lint` green after every commit.
- **Branch:** `feat/ui-phase2d-plan2` in the main checkout `D:/Antigravity/asset-system`. No worktree: one plan at a time (D15).
- **Tests:** three new UI test files collect the sweep pins, one test per file commit, appended in order:
  - `tests/shell-sweep-ui.test.ts` (Task 2)
  - `tests/admin-sweep-ui.test.ts` (Tasks 3–13)
  - `tests/reports-dashboard-sweep-ui.test.ts` (Tasks 15–18)
  - plus `tests/dialog-close-order.test.ts` (Task 1a), `tests/shared-chip-ui.test.ts` (1b) and `tests/stat-strip-rows.test.ts` (1c).
  - Existing pins that lock what changes are edited in the same commit. Each new or edited assertion fails before its change, unless the task says it only moves.
- **Controller tasks:** Task 0 (branch, baseline, before screenshots, measurements, ids), Task 19 (verify, production build, dev-app check), Task 21 (verify numbers, wiki, memory, finishing). **Task 20** writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui (`@radix-ui/react-focus-scope` 1.2.0, `@radix-ui/react-dialog` 1.2.0) · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md`.
- **What this plan covers:** §3.2 and every M row whose plan column names 2D-2 (M13, M14, M17 for these files, M20–M22, M25, M27 for `IntegrationClientManager` and `role-permission-form`, M29 and M30 for these files, M33 for these files), D18 (dialog X order, settings tab row, topbar search), D19 (work-center links), and the hand-ons of plan 2D-1 (its Rulings R3–R6 and the DH section "UI Round 4 Phase 2D Plan 1").
- **Line numbers** in this plan are from `da8388d` (master after 2D-1) unless a step says otherwise.
- **Prior art for the format:** `docs/superpowers/plans/2026-10-15-ui-phase2d-plan1.md`.

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/ui-phase2d-plan2`, which holds `master` `da8388d` and this plan's commit.
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`.
  - Commit only the files your task names. Use `git add <paths>` (quote paths with brackets or parentheses) and never `git add -A` or `git add .`.
  - The checkout has untracked folders that are not yours: `.codex/`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`. Leave them alone.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before you use an API you have not seen in this repo. The only Next.js API this plan adds to a file is `Link onNavigate` in Task 3, used the way `src/components/ui/tab-nav.tsx` already uses it (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`).
- **Line endings:**
  - `git config core.autocrlf` is `true` (system level). Every source file this plan edits is CRLF (`i/lf w/crlf`), and so are `messages/*.json`, `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` and every edited test except `tests/settings-ldap-role-ui.test.ts` (LF).
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files, so do not use it as a check.
  - Edit with exact-string replacement (the Edit tool keeps the file's line endings), never a formatter, and never normalize a file.
  - New files are LF: `src/components/ui/dialog-focus.ts`, `src/components/ui/chip.tsx`, `src/lib/stat-strip-rows.ts` and the six new test files. Appending a block to one of the new LF test files needs nothing more.
  - Check line endings with `node <temp>/eol.mjs <file>…`. A CRLF file prints the same number twice; an LF file prints 0 and then the line count:

```js
// eol.mjs: node <temp>/eol.mjs <file>…   prints "<file> <CRLF count> <LF count>".
import { readFileSync } from "node:fs"
for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, "utf8")
  console.log(file, (source.match(/\r\n/g) ?? []).length, (source.match(/\n/g) ?? []).length)
}
```

  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes, except where a step says the test reads the file raw.
- **How to read a replacement step:** "(n) Replace … with …" shows the old text exactly as it is in the file (LF shown; the file has CRLF) and the new text. Apply the replacements of a file in the order given; each old text occurs exactly once at the moment you apply it. Indentation is the file's own. A replacement may start or end in the middle of a JSX element: it is a text replacement, not a node.
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}`. Run one file with `node --test tests/<file>.test.ts`.
  - `tsconfig.json` includes `**/*.ts`, so **tests are type-checked**.
  - Modules that tests import use relative `.ts` imports (no `@/`). Tests cannot import `.tsx`; they read `.tsx` source text instead.
- **Baseline at `da8388d`** (checked while writing this plan; Task 0 checks it again):
  - `npm test`: 2020 tests, 2019 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean. `npm run lint`: 0 errors (the warnings are under `.agents/`; Task 0 records their number).
  - **After this plan:** 2051 tests, 2050 pass, 1 skipped. Each task states its own count.
- **Every task ends with all of these green:** `npm test` with 0 fail and the task's count; `npx tsc --noEmit`; `npm run lint` with 0 errors and no new warning in `src/` or `tests/`. Report any failure by name.
- **Messages:**
  - Change `messages/th.json` and `messages/en.json` only with `node scripts/messages-edit.mjs <change-file>`, run from the repo root, with the JSON in your temp folder. The script keeps CRLF.
  - Two tasks change messages: Task 3 sets one value in both languages (`systemSettingsPage.tabDocuments`), Task 10b deletes one key (`dataQualityPage.assetStateReviews.scanning`). No key is added. Thai copy follows `docs/19_THAI_GLOSSARY.md`.
- **No new tokens (2A I21).** No custom property in `:root`, `@theme inline` or `@theme`, no edit to `tests/design-tokens-contrast.test.ts`, never `rounded-[…]`. The new `Chip` is a component built from existing tokens (R2).
- **No migration, no DB write, no schema change, no API change.**
- **Guards only go down.** Never raise a number in `tests/visual-foundation-guards.test.ts` (VFG), `tests/form-migration-guards.test.ts` (FMG) or `tests/list-frame-guards.test.ts` (LFG), and never add a row. LFG L9 holds `BUDGETS` equal to `KEEP` and L10 holds every `KEEP` row equal to its live count, so the commit that moves a site lowers (or deletes at 0) its row in `BUDGETS` and `KEEP` together.
- **No validation change.** Keep every `required`, `maxLength`, `minLength`, `pattern`, `toast.error` and `disabled` gate. FMG `CONSTRAINT_FLOORS` must still hold.
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 19.
  - Do not run skill helper scripts; they make network calls.
  - Keep helper scripts and change files in your temp folder (`<temp>`), outside the repo.
  - Shell heredocs and `node -e` may drop backslashes. Write regex-bearing text with a file-writing tool.
- **Deploy:** none. One deploy after 2D and the V track (D17).

## Rulings of this plan

- **R1, D18 dialog X order (2D-1 R4, open issue 1):**
  - The close X of `DialogContent` (`c/ui/dialog.tsx`) and `SheetContent` (`c/ui/sheet.tsx`) moves before `{children}`. It is `absolute`, so the layout does not change; the Tab order becomes X → content → footer, and Shift+Tab from the first field reaches the X.
  - Radix starts a dialog on its first tabbable element and skips only links (`@radix-ui/react-focus-scope` 1.2.0), so after the move it would start on the X in 15 `AccessibleDialog` call sites without `initialFocusRef` (11 files), in the 5 sheets without their own `onOpenAutoFocus` and in `AttachmentPreviewDialog`.
  - The guard lives in the two primitives, not in `accessible-dialog.tsx` as 2D-1 R4 suggested: there it would miss the sheets and the preview dialog. A new `c/ui/dialog-focus.ts` applies Radix's own rule to the elements after the X (`focusFirstContentControl`), and both primitives call it from `onOpenAutoFocus` after the caller's handler, unless that handler already moved focus (`AccessibleDialog` `initialFocusRef`, `audit-scan-room-picker`). `accessible-dialog.tsx` does not change. First focus therefore stays where it was in every dialog and sheet; Task 19 checks that in the app.
- **R2, the shared chip (D7, M22):** no shared static chip existed (`ChoiceChip` is an input, `FilterChipList` a removable link). Task 1b adds `Chip` (`c/ui/chip.tsx`): a neutral 22px name chip (`bg-muted`, `text-neutral-ink` 8.48:1, `rounded-control`, a transparent border like `StatusBadge`), with no marker, no tone and no control. It is for names: roles, role kinds, scopes, approvers, modules and report cadences. A state stays a `StatusBadge`; a count is plain `num` text or a `StatusBadge` where the count already carried a tone (the notification counts). `ActiveBadge` (M7) stays for 2D-3; this plan only replaces its callers on the roles and users pages.
- **R3, M33 `tag` scope:** `tag` is `nowrap`. It goes on short record codes: setting keys, prefixes, template tokens, client ids, token previews, scope and module keys, role names, asset tags, employee codes, document numbers. Strings that must wrap keep `font-mono` with a wrapping class: the asset-tag template example and the category preview of the prefix dialog, the public QR URL, the one-time integration token, API routes. The editable `Input className="font-mono"` fields keep `font-mono` (a field is not a displayed code).
- **R4, panels (D9):**
  - A page-level panel is `ContentPanel` (plain, or `divided` with `flush` for a table).
  - An element that cannot be `ContentPanel` (a `<form>`, a `<details>`, a card in a page-level grid, the settings scroll target that needs an `id`) takes `cn(getPanelClasses(), "p-4 sm:p-5")`, the same frame and spacing.
  - A quiet grouping inside a panel stays `rounded-md border border-border bg-background` (DESIGN.md §5 Cards). A frame inside a frame goes: the depreciation builder's outer box, the report preset box, the LDAP sync history box and preview box, and the operations report's inner `ReportTable` panels (now quiet groupings with an `h3`).
- **R5, `Notice` by meaning (D7):**
  - `info`: the workflow approval foundation note (settings), the readiness scope note.
  - `neutral`: the scheduler heartbeat note, the retention days help, the LDAP sync recommendation (settings), the system-role guard (role form), the required permission (access denied).
  - `warning`: the missing default role (settings LDAP), the advanced settings warning, the LDAP sync blockers and deactivation impact, the depreciation legacy rules, the one-time token warning, the "my work" unavailable sentence of the work center.
  - `danger`: `ValidationMessage` of the settings form, the LDAP sync error (`role="alert"`), the integration page error (`role="alert"`), the report preset message (`role="alert"`: it follows the user's save).
  - `success`: the LDAP sync "applied" title and the copy results.
  - Faint text never sits inside a warning or danger box: the LDAP deactivation list and its `EmptyNote` come after the Notice, not inside it.
- **R6, status tones:** readiness pass/warning/fail → success/warning/danger; approver matrix ready/thin/missing → success/warning/danger; an overdue approval → danger, otherwise muted; decisions approve/reject/execute/close → success/danger/primary/neutral (close was warning-tinted; nothing needs action); data-quality rule cards → the rule's severity only while it is on and finds something, otherwise muted; integration client and policy switches → success/muted; report permissions → success/muted; "not allowed" → muted; notification counts keep their item tone (danger, warning, primary; primary shows calm); LDAP history blockers → warning.
- **R7, dashboard numbers (M30):** the KPI cards, the action cards, the cross-scope cards and the trend cards become `StatStrip` cells, as the work center did in 2B-5 (R-d): no tone fill, no icon, a count that needs action above 0 gets the warning foot line. The trend's colored arrow pill becomes the foot "เดือนนี้ · เดือนก่อน: N · +x%". `splitStatRows` moves from the work center to `src/lib/stat-strip-rows.ts` (Task 1c) so both pages share it; the 7 KPIs read 4 + 3. The status overview rows are `StatusBadge` + count. `DashboardPageSkeleton` is not changed (open issue 6).
- **R8, create buttons (M13, D11):** the floating create links of roles and users move into `PageHeader actions` as `buttonVariants({ size: "md" })`, last. The users page did not check `user:create` before (the button showed to every viewer, and `/admin/users/new` refused); it now shows only with `hasPermission(currentUser, "user", "create")`, as D11 asks.
- **R9, D18 settings tab row:** measured with the built Plex fonts at 14px with a 22px gap (first tab at weight 600): Thai 992px, English 1140px, against about 1121px of content at 1440 (1440 − 256 sidebar − 48 padding − about 15 scrollbar). Task 3 shortens `systemSettingsPage.tabDocuments`: th "เอกสารส่งมอบ-รับคืน" → "เลขเอกสาร" (the overview's own label), en "Handover / Return Docs" → "Documents". The rows become 932px and 1062px. `TabNav` itself does not change (pins `list-primitives-ui`, VFG, `settings-tab-persistence-ui`). Task 0 measures the live row before and Task 19 after.
- **R10, D18 topbar search:** the overlap is not visible at 720×450 (the search is `hidden lg:block`); it shows at CSS widths of about 1024–1180 with the sidebar open (200% zoom of a 2048–2360px screen), where the input keeps a fixed `w-[min(28rem,36vw)]` and the right group shrinks and pushes the user button off the edge. Task 2a gives the right group `shrink-0` and moves the width from the input to its anchor in `c/layout/global-search.tsx` (`w-full` on the input), so the search narrows. `global-search.tsx` is phase 3 (D2); D18 takes only these two width classes, and its raw input, clear button and spinners stay for phase 3.
- **R11, shell buttons:** the topbar's menu, sidebar toggle and bell are `Button variant="ghost" size="icon"` (36px from md, 44px below), with their 20px icons kept by `className="size-5"`; the language and user triggers are ghost `md`; the scan link is outline `md`. Ghost ink is `muted-foreground` at rest and ink on hover (the user name keeps ink). The bell badge keeps its exact class string (VFG pin). The sidebar drawer's close X is a ghost icon `Button`. Raw `<button>`s that stay: the sidebar group row and the mobile navigation "More" item (nav primitives) and the global search clear button (phase 3); 2D-5 lists them as `OWNERS`/`EXEMPT`.
- **R12, integration client manager (M27):** the one-time token panel is a `ContentPanel divided` with a warning `Notice`, not a warning box around controls, so a copy error (a danger box) never sits in a box. The summary is a `StatStrip`; the 7-day cell reads "การใช้งาน" with "7 วัน" as its foot (the label "7 วัน" alone said nothing). The row's rotate button is `Button busy={busy}`: `busy` is the row's, so it spins during any action of that client, as before. The errors count above 0 and the latest error are danger `StatusBadge`s. Scopes are `Chip`s with the code as a `tag`.
- **R13, `c/admin/depreciation-policy-builder.tsx`** renders inside the settings organization tab and is in FMG batch "1f" with the settings form; spec §3.2 did not name it, so this plan owns it (Task 4).
- **R14, not taken (open issues for the user):** the four label props the settings page passes and the form never reads (`generalSettings`, `selectCategory`, `accountingDepreciationPolicy`, `ldapSyncSchedulePreset`); the English literals of the LDAP sync mode options ("Preview/Manual/Scheduled") and of the builder's legacy rules ("months"); the English "d" (days) in the settings overview; the advanced tab rendering nothing when there are no general settings; the LDAP history `Link` that skips the unsaved-changes guard; `DashboardPageSkeleton`. None is a 2D sweep category.
- **R15, messages:** one value changes (R9), one key is deleted (2D-1 R6: `dataQualityPage.assetStateReviews.scanning`, passed at `D/admin/data-quality/page.tsx:81` and never read), none is added.
- **R16, guard rows this plan moves (all down):**
  - LFG `system-settings-form.tsx`: LV2 8 → 1 (the separator default of the tag preview stays, R-n), LS1 1 → deleted, LB1 stays 1 with its comment on the new line.
  - LFG `IntegrationClientManager.tsx`: LS1 2 → deleted, LN2 1 → deleted (with the `KEEP.LN2` key; `BUDGETS.LN2` is `{}`).
  - FMG `LOADER2` `IntegrationClientManager.tsx` 2 → 1 (the list's loading status stays, I27).
  - VFG R2 rows of `admin/roles/page.tsx` and `admin/users/page.tsx` deleted (the floating buttons go).
- **R17, 2D-1 hand-ons:** D18 dialog X order (Task 1a); the `scanning` key (Task 10b); `access-denied` `lg` → `md` (Task 14); `asset-state-review-workspace.tsx:144` `lg` → `md` (Task 10a); `system-settings-form.tsx:1027` `md:min-h-10` → `md:min-h-9` (Task 3); `IntegrationClientManager.tsx:844` (the row's raw 44px buttons are default `Button`s, Task 5); `reports-accounting-view.tsx:74` `?? "—"` dropped (Task 16e). 2D-1 R5 (f) `buildSystemLogFilterHref` stays: not a bug.

## Review Focus

1. **Every dialog and sheet opens where it did, and the X is now first in the Tab order.** Pinned by `tests/dialog-close-order.test.ts` (the X before `{children}`, the composed handler, the focus rule on plain objects); proved in the app in Task 19 Step 5 against the Task 0 baseline (`document.activeElement` on open, then Shift+Tab to the X), for every dialog and sheet the dev data can open without writing.
2. **The settings page saves exactly what it saved before.** Only markup moved: the same fields, ids, `required`/`maxLength` (FMG floors), `StickyFormFooter` as the form's last child, the prefix dialog inside the form (GD5). The change-review key link switches tabs in place like `TabNav` (and Ctrl+click opens the tab's URL). Task 19 opens all 11 tabs and the prefix dialog with 0 writes.
3. **Color only where it means something.** Green, orange and red appear only in `StatusBadge`s, `Notice` icons and boxes and the danger button; no tone fills on cards, pills or icons. Pinned per file by the sweep tests; checked on the before/after screenshots.
4. **The users page shows "เพิ่มผู้ใช้" only to who may create users** (R8). Pinned by `tests/list-pages-ui.test.ts`; Task 19 checks with the seed admin (visible) and reads the code path for a view-only account.
5. **The dashboard and the work center show the same numbers and open the same lists.** Pinned by the `formatCount(` count (12) and the dashboard tests; Task 19 compares each number and link before and after.
6. **The topbar at 1024–1180px CSS width** no longer overlaps or pushes the user menu off screen (R10); measured in Task 0 and Task 19.

## File structure

| File | What changes | Task |
|---|---|---|
| `c/ui/dialog.tsx`, `c/ui/sheet.tsx`, `c/ui/dialog-focus.ts` (new) | X before `{children}`; first-focus rule | 1a |
| `c/ui/chip.tsx` (new) | the shared neutral chip | 1b |
| `src/lib/stat-strip-rows.ts` (new) | `splitStatRows` | 1c |
| `c/layout/topbar.tsx`, `c/layout/global-search.tsx` | Button icon buttons and triggers, StatusBadge counts, EmptyNote; D18 width | 2a |
| `c/layout/sidebar.tsx` | drawer close Button | 2b |
| `c/admin/system-settings-form.tsx`, `messages/*.json` | the whole sweep; tab label | 3 |
| `c/admin/depreciation-policy-builder.tsx` | frame, KeyValueList, Notice, EmptyNote | 4 |
| `c/admin/IntegrationClientManager.tsx` | the whole sweep (M27) | 5 |
| `c/admin/role-permission-form.tsx` | ContentPanel, Notice, DataTable, tag | 6 |
| `D/admin/roles/page.tsx` | create in the header (M13), Chip, StatusBadge | 7 |
| `D/admin/users/page.tsx` · `c/admin/admin-user-form.tsx` | create in the header (M13, D11), Chip, StatusBadge · panel classes, tag | 8a · 8b |
| `c/admin/storage-archive-button.tsx` · `D/admin/storage/page.tsx` | Button busy (M14) · ContentPanel | 9a · 9b |
| `c/admin/asset-state-review-workspace.tsx` · `D/admin/data-quality/page.tsx`, `messages/*.json` · `c/admin/data-quality-rule-form.tsx` | ContentPanel, md scan, markers, tag link · rule cards, unread key · ContentPanel | 10a · 10b · 10c |
| `D/admin/readiness/page.tsx` | ContentPanel, StatusBadge, Notice | 11 |
| `D/admin/approvals/page.tsx` · `D/admin/approvals/history/page.tsx` | KeyValueList, StatusBadge, Chip · ContentPanel, DataTable | 12a · 12b |
| `D/admin/logs/page.tsx` | text links, DataTable | 13 |
| `D/access-denied/page.tsx` | md buttons, Notice | 14 |
| `c/notifications/notification-center-actions.tsx` · `D/notifications/page.tsx` | Button (M29) · panel classes, StatusBadge | 15a · 15b |
| `c/reports/report-preset-controls.tsx`, `reports-catalog-view.tsx`, `reports-operations-view.tsx`, `reports-overview-view.tsx`, `reports-accounting-view.tsx` | one commit each | 16a–16e |
| `D/dashboard/page.tsx` | StatStrip, ContentPanel, StatusBadge, EmptyNote (M30) | 17 |
| `D/work-center/page.tsx` | ContentPanel, D19 links, EmptyNote, markers, Notice | 18 |
| `tests/*` | six new files; pins edited with their file | 1a–18 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 2D-2 docs | 20 |

`D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/`.

---

### Task 0: Branch, baseline, measurements and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` in the main checkout (only while a server runs; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan2/before/` and `.superpowers/sdd/ui-phase2d-plan2/task-0-baseline.md` (git-ignored)

**Interfaces:**
- Consumes: `feat/ui-phase2d-plan2` at the plan commit (on `da8388d`).
- Produces: the baseline numbers, the ids, the before images, the tab-row and topbar measurements and the dialog first-focus table, which Task 19 compares against.

- [ ] **Step 1: Branch and base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2d-plan2`

Run: `git merge-base --is-ancestor da8388d HEAD && git diff --quiet da8388d HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`. The branch holds only this plan on top of `master`.

Run: `git status --short`
Expected: only the untracked folders that the Global Constraints name.

- [ ] **Step 2: Baseline.**
  - Run `npm test`. Expected: 2020 tests, 2019 pass, 0 fail, 1 skipped.
  - Run `npx tsc --noEmit` (clean) and `npm run lint` (0 errors; record the number of warnings and check they are all under `.agents/`).
  - Record the numbers in `task-0-baseline.md`.

- [ ] **Step 3: Temp scripts.** Save `eol.mjs` (Global Constraints) in `<temp>`. Hand its path to every implementer.

- [ ] **Step 4: Dev server.**
  - Create `.claude/launch.json` with one configuration: `name: "asset-2d2-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false`.
  - Start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Log in with the seed admin of `prisma/seed.ts`; do not echo the password.
  - Use your own browser tab. Do not reuse a tab another session left open (a page with unsaved changes asks before it navigates; answer "stay").

- [ ] **Step 5: Ids.** Record these, and note any the dev data lacks:
  - an integration client (`/th/admin/integrations` shows one row or the empty state)
  - an asset with an image or PDF attachment (`/th/assets/<id>`, for the preview dialog)
  - an open repair ticket (`/th/maintenance/<id>`: complete, cancel and edit dialogs)
  - an active PM plan (`/th/maintenance/pm`: pause and end dialogs)
  - an audit round with a pending finding (`/th/audit/findings`: the review dialogs) and the round itself (cancel dialog)

- [ ] **Step 6: Measurements.** Run each with inline Playwright code (`browser_run_code_unsafe`) and write the results into `task-0-baseline.md`.
  - **Settings tab row (R9):** on `/th/admin/settings` and `/en/admin/settings` at 1440×900, `nav[data-slot="tab-nav"]` `scrollWidth` and `clientWidth`, and the right edge of the last tab against the nav's right edge.
  - **Topbar (R10):** at 1024×450, 1100×450, 1180×450 and 1440×900 on `/th/dashboard` with the sidebar open: the bounding boxes of the search input, the scan link, the bell, the language and user triggers, and `document.documentElement.clientWidth`. Note any overlap and any element past the right edge.
  - **Dialog first focus (R1):** for each dialog and sheet below that the data allows, open it, wait 300ms, record `document.activeElement` (tag, `id`, `name`, `aria-label`, text), then press Shift+Tab once and record the new active element; close it with Esc or ยกเลิก. Write nothing.
    - `/th/admin/settings?tab=asset-numbering` → "เพิ่มกลุ่ม" (prefix dialog; expected today: the prefix input, its text selected)
    - `/th/admin/integrations` → "แก้ไขสิทธิ์" on a client (expected: the display-name input)
    - `/th/assets` → select mode, select one row, the bulk update dialog
    - `/th/assets` at 375 → the filter sheet; a row's ⋯ (the row-actions sheet)
    - `/th/assets/<id>` → the evidence drawer; the activity drawer if shown; an attachment preview
    - `/th/maintenance/<id>` → complete, cancel and edit dialogs
    - `/th/maintenance/pm` → pause and end dialogs
    - `/th/audit/findings` → a review dialog; `/th/audit/rounds/<id>` → cancel dialog
    - `/th/dashboard` at 375 → the sidebar drawer (its own `onOpenAutoFocus`)
    - the scan page of an open audit round at 375 → the room picker (its own `onOpenAutoFocus`), and the check panel only if it opens without recording a scan; otherwise note it for a person

- [ ] **Step 7: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2d-plan2/before/<view>-<width>.png` at 1440, 768 and 375:
  - `/th/admin/settings` with each of the 11 tabs at 1440 (`?tab=asset-numbering`, `label-template`, `documents`, `organization`, `notifications`, `workflow-approval`, `automation`, `governance`, `ldap-login`, `ldap-sync`, `advanced`), and the default tab at 768 and 375
  - `/th/admin/integrations`, `/th/admin/roles`, `/th/admin/roles/new`, `/th/admin/users`, `/th/admin/users/new`, `/th/admin/storage`, `/th/admin/data-quality`, `/th/admin/readiness`, `/th/admin/approvals`, `/th/admin/approvals/history`, `/th/admin/logs` (open one "ดูรายละเอียด")
  - `/th/access-denied?module=asset&action=view`, `/th/notifications`
  - `/th/reports` with each view (`?view=overview`, `catalog`, `operations`, `accounting`)
  - `/th/dashboard`, `/th/work-center`, `/th/work-center?panel=assets`
  - the topbar with the notification popover open, and with the user menu open (1440 and 375)
  - Write nothing.

- [ ] **Step 8: Clean up.** Stop the server and delete `.claude/launch.json`. `git status --short` shows what Step 1 showed. No commit in this task.

---

### Task 1: Shared primitives first: the dialog X order (D18), the shared `Chip`, `splitStatRows`

Spec D18, D7, M22, R1, R2, R7. Three commits: 1a, 1b, 1c. Nothing outside `c/ui/` and `src/lib/` changes here, so no page looks different except for the dialog Tab order.

**Files:**
- 1a: Modify `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `tests/accessible-dialog.test.ts` (comment) · Create `src/components/ui/dialog-focus.ts`, `tests/dialog-close-order.test.ts` (both LF)
- 1b: Create `src/components/ui/chip.tsx`, `tests/shared-chip-ui.test.ts` (LF)
- 1c: Create `src/lib/stat-strip-rows.ts`, `tests/stat-strip-rows.test.ts` (LF)

**Interfaces:**
- Produces: `focusFirstContentControl(event: Event)`, `initialFocusVerdict(node)`, `dialogCloseSelector` and `type FocusCandidate` from `@/components/ui/dialog-focus`; `Chip` (`React.ComponentProps<"span">`) from `@/components/ui/chip`; `splitStatRows<T>(items: readonly T[], most = 4): T[][]` from `@/lib/stat-strip-rows`.

#### 1a: The X comes first, focus still opens on the first control

- [ ] **Step 1: The failing test.** Create `tests/dialog-close-order.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { dialogCloseSelector, initialFocusVerdict, type FocusCandidate } from "../src/components/ui/dialog-focus.ts"

// Plan 2D-2 (spec 2D D18): the close X of every dialog and sheet comes first in the Tab order, before the content, and
// focus still starts on the first control of the content. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("dialog and sheet render the X before their content and pass their own focus rule after the caller's (spec 2D D18)", () => {
  for (const [path, part] of [["src/components/ui/dialog.tsx", "DialogPrimitive"], ["src/components/ui/sheet.tsx", "SheetPrimitive"]] as const) {
    const source = read(path)
    const content = source.slice(source.indexOf(`<${part}.Content`), source.indexOf(`</${part}.Content>`))
    const close = content.indexOf(`<${part}.Close`)
    assert.ok(close !== -1 && close < content.indexOf("{children}"), `${path}: the X comes before {children}`)
    assert.match(source, /^import \{ focusFirstContentControl \} from "@\/components\/ui\/dialog-focus"$/m, path)
    assert.match(content, /\{\.\.\.props\}\n[^\n]*\n\s+onOpenAutoFocus=\{\(event\) => \{\n\s+onOpenAutoFocus\?\.\(event\)\n\s+if \(!event\.defaultPrevented\) focusFirstContentControl\(event\)\n\s+\}\}/, path)
  }
})

test("the first focus skips the X, links, disabled and hidden elements, and accepts the first tabbable control (spec 2D D18)", () => {
  const node = (tagName: string, extra: Partial<FocusCandidate> = {}): FocusCandidate => ({ tagName, tabIndex: 0, hidden: false, matches: () => false, ...extra })
  assert.equal(initialFocusVerdict(node("BUTTON", { matches: (selector) => selector === dialogCloseSelector })), "reject")
  assert.equal(initialFocusVerdict(node("A")), "skip")
  assert.equal(initialFocusVerdict(node("BUTTON", { disabled: true })), "skip")
  assert.equal(initialFocusVerdict(node("INPUT", { type: "hidden" })), "skip")
  assert.equal(initialFocusVerdict(node("DIV", { hidden: true })), "skip")
  assert.equal(initialFocusVerdict(node("DIV", { tabIndex: -1 })), "skip")
  assert.equal(initialFocusVerdict(node("INPUT", { type: "text" })), "accept")
  assert.equal(initialFocusVerdict(node("TEXTAREA")), "accept")
  assert.equal(initialFocusVerdict(node("BUTTON", { tabIndex: 0, disabled: false })), "accept")
  assert.equal(dialogCloseSelector, '[data-slot="dialog-close"], [data-slot="sheet-close"]')
})
```

Run: `node --test tests/dialog-close-order.test.ts`
Expected: the file fails to load (`Cannot find module …/src/components/ui/dialog-focus.ts`), so both tests fail.

- [ ] **Step 2: The focus rule.** Create `src/components/ui/dialog-focus.ts` (LF):

```ts
// Where a dialog or sheet puts focus when it opens (spec 2D D18). The close X now comes first in the DOM, so it is
// first in the Tab order, and Radix would focus it on open: Radix starts on the first tabbable element and skips only
// links (@radix-ui/react-focus-scope 1.2.0: getTabbableCandidates, removeLinks, focusFirst). DialogContent and
// SheetContent call focusFirstContentControl from onOpenAutoFocus, after the caller's own handler, unless that handler
// already moved focus (AccessibleDialog initialFocusRef, the scan room picker). It applies Radix's rule to everything
// after the X, so the first focus stays where it was before the X moved. No hooks and no React: tests import it.

// The X of DialogContent and of SheetContent. Radix Close merges its data-slot over Button's own.
export const dialogCloseSelector = '[data-slot="dialog-close"], [data-slot="sheet-close"]'

// The parts of an element the rule reads, so a test can pass a plain object.
export type FocusCandidate = {
  tagName: string
  tabIndex: number
  hidden: boolean
  disabled?: boolean
  type?: string
  matches: (selector: string) => boolean
}

// "reject" leaves out the X and everything inside it; "skip" leaves out the element but still looks inside it.
export function initialFocusVerdict(node: FocusCandidate): "accept" | "skip" | "reject" {
  if (node.matches(dialogCloseSelector)) return "reject"
  if (node.disabled || node.hidden || (node.tagName === "INPUT" && node.type === "hidden")) return "skip"
  if (node.tagName === "A") return "skip"
  return node.tabIndex >= 0 ? "accept" : "skip"
}

// Focuses the first control after the X, as Radix would: no scroll, an input's text selected, the next candidate when
// focus did not move. When nothing qualifies, Radix keeps its default (the X, or the dialog itself).
export function focusFirstContentControl(event: Event) {
  const container = event.target
  if (!(container instanceof HTMLElement)) return
  const previous = document.activeElement
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const verdict = initialFocusVerdict(node as HTMLElement)
      if (verdict === "accept") return NodeFilter.FILTER_ACCEPT
      return verdict === "reject" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP
    },
  })
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node as HTMLElement
    element.focus({ preventScroll: true })
    if (document.activeElement === previous) continue
    if (element instanceof HTMLInputElement) element.select()
    event.preventDefault()
    return
  }
}
```

The rule copies Radix focus-scope 1.2.0 (`getTabbableCandidates`, `removeLinks`, `focusFirst`: skip disabled, hidden and `input[type=hidden]`, skip links, focus with `preventScroll`, select an input's text, try the next candidate when focus did not move) and adds one thing: it rejects the X and everything inside it. When no candidate takes focus it does not call `preventDefault`, so Radix keeps its own default (the X, or the dialog itself).

- [ ] **Step 3: `DialogContent`.** In `src/components/ui/dialog.tsx` (CRLF):

(1) Replace

```tsx
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"

function Dialog({
  ...props
```

with

```tsx
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { focusFirstContentControl } from "@/components/ui/dialog-focus"

function Dialog({
  ...props
```

(2) Replace

```tsx
  showCloseButton = true,
  closeLabel: closeLabelProp,
  closeDisabled = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
```

with

```tsx
  showCloseButton = true,
  closeLabel: closeLabelProp,
  closeDisabled = false,
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
```

(3) Replace

```tsx
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" size="icon" disabled={closeDisabled} aria-label={closeLabel} title={closeLabel} className="absolute top-3 right-3 disabled:border-transparent disabled:bg-transparent">
```

with

```tsx
          className,
        )}
        {...props}
        // The X comes first in the Tab order (spec 2D D18), yet the dialog still opens on its first control.
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event)
          if (!event.defaultPrevented) focusFirstContentControl(event)
        }}
      >
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" size="icon" disabled={closeDisabled} aria-label={closeLabel} title={closeLabel} className="absolute top-3 right-3 disabled:border-transparent disabled:bg-transparent">
```

(4) Replace

```tsx
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
```

with

```tsx
            </Button>
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
```

- [ ] **Step 4: `SheetContent`.** In `src/components/ui/sheet.tsx` (CRLF):

(1) Replace

```tsx
import { Dialog as SheetPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
```

with

```tsx
import { Dialog as SheetPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { focusFirstContentControl } from "@/components/ui/dialog-focus"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
```

(2) Replace

```tsx
  side = "right",
  showCloseButton = true,
  closeLabel: closeLabelProp,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
```

with

```tsx
  side = "right",
  showCloseButton = true,
  closeLabel: closeLabelProp,
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
```

(3) Replace

```tsx
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" size="icon" aria-label={closeLabel} title={closeLabel} className="absolute top-3 right-3">
```

with

```tsx
          className
        )}
        {...props}
        // The X comes first in the Tab order (spec 2D D18), yet the sheet still opens on its first control.
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event)
          if (!event.defaultPrevented) focusFirstContentControl(event)
        }}
      >
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" size="icon" aria-label={closeLabel} title={closeLabel} className="absolute top-3 right-3">
```

(4) Replace

```tsx
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
```

with

```tsx
            </Button>
          </SheetPrimitive.Close>
        )}
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
```

- [ ] **Step 5: The stale comment (M34).** In `tests/accessible-dialog.test.ts` (CRLF):

Replace

```ts
  assert.doesNotMatch(source, /"Close"|>\s*Close\s*</, "the X reads ปิด, and no button says Close")
  assert.match(source, /aria-label=\{closeLabel\}/)
  assert.match(source, /disabled=\{closeDisabled\}/)
  // Button size icon is 44px below md and 40px from md, so the X needs no size classes of its own.
  assert.match(source, /<DialogPrimitive\.Close[^>]*asChild>\s*<Button variant="ghost" size="icon"/)
  // A ghost X has no box, so it gets none while the dialog is busy either; only its ink goes faint.
  assert.match(source, /className="absolute top-3 right-3 disabled:border-transparent disabled:bg-transparent">/)
```

with

```ts
  assert.doesNotMatch(source, /"Close"|>\s*Close\s*</, "the X reads ปิด, and no button says Close")
  assert.match(source, /aria-label=\{closeLabel\}/)
  assert.match(source, /disabled=\{closeDisabled\}/)
  // Button size icon is 44px below md and 36px from md (plan 2D-1), so the X needs no size classes of its own.
  assert.match(source, /<DialogPrimitive\.Close[^>]*asChild>\s*<Button variant="ghost" size="icon"/)
  // A ghost X has no box, so it gets none while the dialog is busy either; only its ink goes faint.
  assert.match(source, /className="absolute top-3 right-3 disabled:border-transparent disabled:bg-transparent">/)
```

- [ ] **Step 6: Check.**
  - Run `node --test tests/dialog-close-order.test.ts tests/accessible-dialog.test.ts tests/sheet-drawers-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (88 tests).
  - Run `node <temp>/eol.mjs src/components/ui/dialog-focus.ts src/components/ui/dialog.tsx src/components/ui/sheet.tsx tests/accessible-dialog.test.ts tests/dialog-close-order.test.ts`. Expected: equal numbers for `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `tests/accessible-dialog.test.ts`; `0 <n>` for `src/components/ui/dialog-focus.ts`, `tests/dialog-close-order.test.ts` (LF).
  - Run `npm test` (2022 tests, 2021 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 7: Commit.**

```bash
git add src/components/ui/dialog.tsx src/components/ui/sheet.tsx src/components/ui/dialog-focus.ts tests/accessible-dialog.test.ts tests/dialog-close-order.test.ts
git commit -m "fix(ui): the dialog and sheet close X comes first in the Tab order and focus still opens on the first control (2D-2 task 1a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 1b: The shared `Chip`

- [ ] **Step 8: The failing test.** Create `tests/shared-chip-ui.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D D7, M22): the shared chip names a role, a scope, a person or a module. It is neutral (muted fill,
// neutral-ink text), the 22px box of StatusBadge, server-safe, and has no marker, tone, link or button of its own.
test("Chip is the neutral 22px name chip, with no tone, marker or control (spec 2D D7)", () => {
  const source = readFileSync("src/components/ui/chip.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /^export function Chip\(\{ className, children, \.\.\.props \}: React\.ComponentProps<"span">\) \{$/m)
  assert.match(source, /data-slot="chip"/)
  assert.match(source, /"inline-flex h-5\.5 max-w-full min-w-0 items-center rounded-control border border-transparent bg-muted px-2 text-meta font-medium whitespace-nowrap text-neutral-ink"/)
  assert.match(source, /<span className="truncate">\{children\}<\/span>/)
  assert.doesNotMatch(source, /"use client"|useState|tone=|statusMarkerVariants|<button|<Link|onClick|-soft\b/)
})
```

Run: `node --test tests/shared-chip-ui.test.ts`
Expected: 1 failure (`ENOENT … src/components/ui/chip.tsx`).

- [ ] **Step 9: The chip.** Create `src/components/ui/chip.tsx` (LF):

```tsx
import type React from "react"
import { cn } from "@/lib/utils"

// The shared chip (spec 2D D7, the neutral-ink text that 2A §8.1.4 kept for it): a role, a scope, a person or a module
// named beside a record. It names something and is not a state, so it has no marker and no tone: the muted fill,
// neutral-ink text (8.48:1 on muted), 6px corners and the 22px box of StatusBadge (a transparent border, so both line
// up). Long names are cut with an ellipsis: pass title when the whole name matters. Not a control: a removable filter
// is FilterChipList and an option is ChoiceChip. Server-safe.
export function Chip({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chip"
      className={cn("inline-flex h-5.5 max-w-full min-w-0 items-center rounded-control border border-transparent bg-muted px-2 text-meta font-medium whitespace-nowrap text-neutral-ink", className)}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}
```

- [ ] **Step 10: Check.**
  - Run `node --test tests/shared-chip-ui.test.ts`. Expected: all pass (1 tests).
  - Run `node <temp>/eol.mjs src/components/ui/chip.tsx tests/shared-chip-ui.test.ts`. Expected: `0 <n>` for `src/components/ui/chip.tsx`, `tests/shared-chip-ui.test.ts` (LF).
  - Run `npm test` (2023 tests, 2022 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`. The chip has no caller yet; Tasks 5, 7, 8a, 12a, 12b and 16b use it.

- [ ] **Step 11: Commit.**

```bash
git add src/components/ui/chip.tsx tests/shared-chip-ui.test.ts
git commit -m "feat(ui): shared neutral Chip for role, scope, person and module names (2D-2 task 1b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 1c: `splitStatRows` in `src/lib`

- [ ] **Step 12: The failing test.** Create `tests/stat-strip-rows.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { splitStatRows } from "../src/lib/stat-strip-rows.ts"

// Plan 2D-2: the work center and the dashboard split their StatStrip cells with one shared helper.
test("splitStatRows makes rows of at most four cells, as even as they split", () => {
  const sizes = (count: number, most?: number) => splitStatRows(Array.from({ length: count }, (_, index) => index), most).map((row) => row.length)
  assert.deepEqual(sizes(8), [4, 4])
  assert.deepEqual(sizes(7), [4, 3])
  assert.deepEqual(sizes(6), [3, 3])
  assert.deepEqual(sizes(5), [3, 2])
  assert.deepEqual(sizes(4), [4])
  assert.deepEqual(sizes(2), [2])
  assert.deepEqual(sizes(0), [])
  assert.deepEqual(sizes(5, 3), [3, 2])
  assert.deepEqual(splitStatRows(["a", "b", "c", "d", "e"]), [["a", "b", "c"], ["d", "e"]])
})
```

Run: `node --test tests/stat-strip-rows.test.ts`
Expected: the file fails to load (`Cannot find module …/src/lib/stat-strip-rows.ts`).

- [ ] **Step 13: The helper.** Create `src/lib/stat-strip-rows.ts` (LF). It is the work center's local function (`D/work-center/page.tsx:565-570`) unchanged; the work center imports it in Task 18 and the dashboard in Task 17, and until then the local copy stays.

```ts
// Rows of at most `most` StatStrip cells, as even as they split: 8 → 4 + 4, 7 → 4 + 3, 6 → 3 + 3, 5 → 3 + 2, none → no
// row. StatStrip is one row from lg, so more numbers than four go in rows (the work center, the dashboard).
export function splitStatRows<T>(items: readonly T[], most = 4): T[][] {
  const rowCount = Math.ceil(items.length / most)
  const perRow = Math.ceil(items.length / rowCount)
  return Array.from({ length: rowCount }, (_, index) => items.slice(index * perRow, (index + 1) * perRow))
}
```

- [ ] **Step 14: Check.**
  - Run `node --test tests/stat-strip-rows.test.ts`. Expected: all pass (1 tests).
  - Run `node <temp>/eol.mjs src/lib/stat-strip-rows.ts tests/stat-strip-rows.test.ts`. Expected: `0 <n>` for `src/lib/stat-strip-rows.ts`, `tests/stat-strip-rows.test.ts` (LF).
  - Run `npm test` (2024 tests, 2023 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 15: Commit.**

```bash
git add src/lib/stat-strip-rows.ts tests/stat-strip-rows.test.ts
git commit -m "refactor(ui): splitStatRows moves to src/lib for the work center and the dashboard (2D-2 task 1c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The shell: topbar and sidebar buttons, and the search under the bell (D18, R10, R11)

Spec D2, D18, M29. Two commits.

**Files:**
- 2a: Modify `src/components/layout/topbar.tsx`, `src/components/layout/global-search.tsx` · Create `tests/shell-sweep-ui.test.ts` (LF)
- 2b: Modify `src/components/layout/sidebar.tsx`, `tests/shell-sweep-ui.test.ts`

Pins that must stay green and need no edit: `tests/dropdown-menus-ui.test.ts` (the two `aria-label`s, the radio group, the popover), `tests/mobile-field-navigation-ui.test.ts` (`mobileNavigationMode && "hidden"`, `hidden … lg:inline-flex`), `tests/dashboard-shell-theme.test.ts` (sidebar tokens live in `rowClasses`), VFG `:300` (the bell badge string), `tests/notification-topbar-behavior.test.ts`, `tests/global-search-ui.test.ts`.

#### 2a: Topbar and search

- [ ] **Step 1: The failing test.** Create `tests/shell-sweep-ui.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D §3.2, D2, D18, M29): the topbar and sidebar buttons are the shared Button (ghost icon buttons,
// 36px from md and 44px below), and the topbar's right group keeps its width so the search narrows instead of running
// under the bell at 200% zoom. The search field itself is phase 3 (D2): only its width moved to its anchor.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("the topbar uses Button for its icon buttons and menu triggers, and its right group keeps its width (spec 2D D18, M29)", () => {
  const source = read(`${C}layout/topbar.tsx`)
  assert.doesNotMatch(source, /<button\b|border-dashed|rounded-full px-2 py-0\.5|sm:h-9|sm:min-h-0|size=\{\d+\}|bg-primary text-sm font-medium text-white/)
  assert.equal(source.match(/<Button\s+variant="ghost"\s+size="icon"/g)?.length, 3, "menu, sidebar toggle and bell")
  assert.equal(source.match(/<Button variant="ghost" size="md"/g)?.length, 2, "the language and user menu triggers")
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "md" \}\), "hidden lg:inline-flex"\)\}/)
  assert.match(source, /<div className="flex shrink-0 items-center gap-1 sm:gap-2">/)
  assert.match(source, /<StatusBadge label=\{formatCount\(item\.count\)\} tone=\{item\.tone\} \/>/)
  assert.match(source, /<EmptyNote className="px-3 py-3">\{tNotifications\("empty"\)\}<\/EmptyNote>/)
  assert.match(source, /<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">/)
  const search = read(`${C}layout/global-search.tsx`)
  assert.match(search, /<div ref=\{anchorRef\} className="relative hidden w-\[min\(28rem,36vw\)\] min-w-0 max-w-full lg:block">/)
  assert.match(search, /className="h-9 w-full min-w-0 rounded-md /)
})
```

Run: `node --test tests/shell-sweep-ui.test.ts`
Expected: 1 failure, "the topbar uses Button for its icon buttons…" (the topbar still has `<button`).

- [ ] **Step 2: The topbar.** In `src/components/layout/topbar.tsx` (CRLF):

(1) Replace

```tsx
} from "lucide-react"
import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react"
import { cn } from "@/lib/utils"
import { GlobalSearch } from "@/components/layout/global-search"
import {
  DropdownMenu,
  DropdownMenuContent,
```

with

```tsx
} from "lucide-react"
import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react"
import { cn } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { GlobalSearch } from "@/components/layout/global-search"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
```

(2) Replace

```tsx
      {/* Left side */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden",
            mobileNavigationMode && "hidden",
          )}
          aria-label={tNav("openMenu")}
        >
          <Menu size={20} />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:inline-flex"
          title={tNav("toggleSidebar")}
          aria-label={tNav("toggleSidebar")}
        >
          <PanelLeftClose size={20} />
        </button>

        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link
          href={`/${locale}/asset-management/scan`}
          className="hidden min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9 sm:min-h-0 sm:min-w-0 sm:px-3 lg:inline-flex"
          title={tAssetTools("globalScanShortcut")}
          aria-label={tAssetTools("globalScanShortcut")}
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden xl:inline">{tAssetTools("globalScanShortcut")}</span>
        </Link>

```

with

```tsx
      {/* Left side */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuToggle}
          className={cn("lg:hidden", mobileNavigationMode && "hidden")}
          aria-label={tNav("openMenu")}
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden lg:inline-flex"
          title={tNav("toggleSidebar")}
          aria-label={tNav("toggleSidebar")}
        >
          <PanelLeftClose aria-hidden="true" className="size-5" />
        </Button>

        <GlobalSearch />
      </div>

      {/* Right side: it keeps its width, so at 200% zoom the search narrows instead of running under the bell (D18). */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href={`/${locale}/asset-management/scan`}
          className={cn(buttonVariants({ variant: "outline", size: "md" }), "hidden lg:inline-flex")}
          title={tAssetTools("globalScanShortcut")}
          aria-label={tAssetTools("globalScanShortcut")}
        >
          <ScanLine aria-hidden="true" />
          <span className="hidden xl:inline">{tAssetTools("globalScanShortcut")}</span>
        </Link>

```

(3) Replace

```tsx
        <div className="relative shrink-0">
          <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={tNotifications("title")}
                title={tNotifications("title")}
              >
                <Bell size={20} />
                {notificationSummary.total > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-white">
                    {notificationSummary.total > 99 ? "99+" : notificationSummary.total}
                  </span>
                ) : null}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-[20rem] p-0">
              <div className="border-b border-border px-4 py-3">
```

with

```tsx
        <div className="relative shrink-0">
          <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={tNotifications("title")}
                title={tNotifications("title")}
              >
                <Bell aria-hidden="true" className="size-5" />
                {notificationSummary.total > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-white">
                    {notificationSummary.total > 99 ? "99+" : notificationSummary.total}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-[20rem] p-0">
              <div className="border-b border-border px-4 py-3">
```

(4) Replace

```tsx
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notificationSummary.items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    {tNotifications("empty")}
                  </div>
                ) : (
                  notificationSummary.items.map((item) => (
                    <Link
```

with

```tsx
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notificationSummary.items.length === 0 ? (
                  <EmptyNote className="px-3 py-3">{tNotifications("empty")}</EmptyNote>
                ) : (
                  notificationSummary.items.map((item) => (
                    <Link
```

(5) Replace

```tsx
                        <p className="font-medium text-foreground">{tNotifications(item.key)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{tNotifications(`${item.key}Detail`)}</p>
                      </div>
                      <span className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                        item.tone === "danger" && "bg-danger-soft text-danger",
                        item.tone === "warning" && "bg-warning-soft text-warning",
                        item.tone === "primary" && "bg-primary-soft text-primary"
                      )}>
                        {item.count}
                      </span>
                    </Link>
                  ))
                )}
              </div>
              <div className="border-t border-border p-2">
                <Link
                  href={`/${locale}/notifications`}
                  onClick={() => setNotificationOpen(false)}
                  className="block rounded-md px-3 py-2 text-center text-sm font-medium text-primary hover:bg-accent"
                >
                  {tNotifications("openNotificationCenter")}
                </Link>
                <Link
                  href={`/${locale}/work-center`}
                  onClick={() => setNotificationOpen(false)}
                  className="block rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  {tNotifications("openWorkCenter")}
                </Link>
```

with

```tsx
                        <p className="font-medium text-foreground">{tNotifications(item.key)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{tNotifications(`${item.key}Detail`)}</p>
                      </div>
                      <StatusBadge label={formatCount(item.count)} tone={item.tone} />
                    </Link>
                  ))
                )}
              </div>
              <div className="grid gap-1 border-t border-border p-2">
                <Link
                  href={`/${locale}/notifications`}
                  onClick={() => setNotificationOpen(false)}
                  className={cn(buttonVariants({ variant: "outline", size: "md" }), "w-full")}
                >
                  {tNotifications("openNotificationCenter")}
                </Link>
                <Link
                  href={`/${locale}/work-center`}
                  onClick={() => setNotificationOpen(false)}
                  className={cn(buttonVariants({ variant: "ghost", size: "md" }), "w-full")}
                >
                  {tNotifications("openWorkCenter")}
                </Link>
```

(6) Replace

```tsx
        <div className="relative shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={tNav("languageMenu", { code: localeCode })}
              >
                <Globe size={18} />
                <span className="hidden sm:inline">{localeCode}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={locale} onValueChange={(next) => {
```

with

```tsx
        <div className="relative shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="md" aria-label={tNav("languageMenu", { code: localeCode })}>
                <Globe aria-hidden="true" />
                <span className="hidden sm:inline">{localeCode}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={locale} onValueChange={(next) => {
```

(7) Replace

```tsx
        <div className="relative shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3"
                aria-label={tNav("userMenu", { name: userDisplayLabel })}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  {getUserInitial(user)}
                </div>
                <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{userDisplayLabel}</span>
                <ChevronDown size={16} className="hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-[16rem]">
              <DropdownMenuLabel className="py-1.5 text-sm font-normal text-foreground">
```

with

```tsx
        <div className="relative shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="md" className="gap-2 text-foreground" aria-label={tNav("userMenu", { name: userDisplayLabel })}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {getUserInitial(user)}
                </span>
                <span className="hidden max-w-36 truncate sm:inline">{userDisplayLabel}</span>
                <ChevronDown aria-hidden="true" className="hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-[16rem]">
              <DropdownMenuLabel className="py-1.5 text-sm font-normal text-foreground">
```

- [ ] **Step 3: The search width (R10).** In `src/components/layout/global-search.tsx` (CRLF), only these two class strings:

(1) Replace

```tsx
      }}
    >
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative hidden min-w-0 max-w-full lg:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
```

with

```tsx
      }}
    >
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative hidden w-[min(28rem,36vw)] min-w-0 max-w-full lg:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
```

(2) Replace

```tsx
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="h-9 w-[min(28rem,36vw)] min-w-0 rounded-md border border-border bg-background pl-10 pr-10 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            role="combobox"
            aria-label={t("label")}
            aria-expanded={showPanel}
```

with

```tsx
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="h-9 w-full min-w-0 rounded-md border border-border bg-background pl-10 pr-10 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            role="combobox"
            aria-label={t("label")}
            aria-expanded={showPanel}
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/shell-sweep-ui.test.ts tests/dropdown-menus-ui.test.ts tests/mobile-field-navigation-ui.test.ts tests/dashboard-shell-theme.test.ts tests/notification-topbar-behavior.test.ts tests/pwa-install-prompt.test.ts tests/global-search-ui.test.ts tests/spinner-motion-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (52 tests).
  - Run `node <temp>/eol.mjs src/components/layout/global-search.tsx src/components/layout/topbar.tsx tests/shell-sweep-ui.test.ts`. Expected: equal numbers for `src/components/layout/global-search.tsx`, `src/components/layout/topbar.tsx`; `0 <n>` for `tests/shell-sweep-ui.test.ts` (LF).
  - Run `npm test` (2025 tests, 2024 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/layout/topbar.tsx src/components/layout/global-search.tsx tests/shell-sweep-ui.test.ts
git commit -m "refactor(ui): topbar buttons on Button, the notification list on StatusBadge and EmptyNote, and the search narrows instead of running under the bell (2D-2 task 2a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 2b: The sidebar drawer's close button

- [ ] **Step 6: The failing test.** Append to `tests/shell-sweep-ui.test.ts`:

```ts

test("the sidebar drawer's close button is a ghost icon Button; the group row stays the sidebar's own button (spec 2D M29)", () => {
  const source = read(`${C}layout/sidebar.tsx`)
  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /<Button variant="ghost" size="icon" onClick=\{onMobileClose\} className="ml-auto" aria-label=\{t\("closeMenu"\)\}>\n\s+<X aria-hidden="true" \/>\n\s+<\/Button>/)
  assert.equal(source.match(/<button\b/g)?.length, 1, "only the group disclosure row, a nav row of its own")
})
```

Run: `node --test tests/shell-sweep-ui.test.ts`
Expected: 1 failure, "the sidebar drawer's close button is a ghost icon Button…".

- [ ] **Step 7: The sidebar.** In `src/components/layout/sidebar.tsx` (CRLF):

(1) Replace

```tsx
} from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  filterNavigationSectionsByPermission,
```

with

```tsx
} from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  filterNavigationSectionsByPermission,
```

(2) Replace

```tsx
            {t("brandName")}
          </span>
          {mobile ? (
            <button
              type="button"
              onClick={onMobileClose}
              className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              aria-label={t("closeMenu")}
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

```

with

```tsx
            {t("brandName")}
          </span>
          {mobile ? (
            <Button variant="ghost" size="icon" onClick={onMobileClose} className="ml-auto" aria-label={t("closeMenu")}>
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>

```

The close X loses its sidebar-hover fill and takes the ghost Button's (`background`), which is the same white surface; `hover:bg-sidebar-hover` and `focus-visible:ring-offset-sidebar` stay in `rowClasses` (pinned by `tests/dashboard-shell-theme.test.ts`).

- [ ] **Step 8: Check.**
  - Run `node --test tests/shell-sweep-ui.test.ts tests/dashboard-shell-theme.test.ts tests/dropdown-menus-ui.test.ts tests/mobile-field-navigation-ui.test.ts tests/my-assets-route-ui.test.ts tests/sheet-drawers-ui.test.ts tests/sidebar-menu-structure.test.ts tests/integration-api-client-admin.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (71 tests).
  - Run `node <temp>/eol.mjs src/components/layout/sidebar.tsx tests/shell-sweep-ui.test.ts`. Expected: equal numbers for `src/components/layout/sidebar.tsx`; `0 <n>` for `tests/shell-sweep-ui.test.ts` (LF).
  - Run `npm test` (2026 tests, 2025 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 9: Commit.**

```bash
git add src/components/layout/sidebar.tsx tests/shell-sweep-ui.test.ts
git commit -m "refactor(ui): the sidebar drawer close is a ghost icon Button (2D-2 task 2b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The settings form (`c/admin/system-settings-form.tsx`) and the documents tab label (D18, R9)

Spec §3.2, D7, D9, D18, M17, M20, M21, M25, M33; 2D-1 R3 (`:1027`). One commit. The biggest file of the plan (2,6xx lines): 38 replacements, all markup. Fields, ids, `name`s, `required`/`maxLength`, the `StickyFormFooter` and the prefix dialog stay where they are.

**What changes:**
- **Imports:** `Fragment`, `ContentPanel`, the `DataTable` parts, `EmptyNote`, `KeyValueList` and `KeyValueItem`, `Nil` and `orNil`, `Notice`, `StatStrip`, `StatusBadge` and `formatCount` come in; the `History` icon goes. `tCommon` is read for the table scroll hints.
- **Overview:** the 10 facts are two `KeyValueList`s; the governance values show `Nil` when empty, and the LDAP states are `StatusBadge`s. `formatReviewValue` returns `normalized || null`, so an empty value is `Nil` and not a typed "-" (LFG LV2 8 → 1).
- **Settings search:** results are a list of outline `Button`s with the key as `tag`; "no result" is an `EmptyNote` with `role="status"`.
- **Panels (R4):** `<div id="settings-workspace">` (the scroll target) wraps the tab panels; the 16 hand-made panels are `ContentPanel`s, `divided` where they had a head row. `SectionHeader`, `Head`, `StatusCard`, `Metric` (LFG LS1), `MiniMetric`, `EmptyTransferState` and `formatHistoryNumber` are deleted.
- **Buttons:** the format presets are `md:min-h-9` (2D-1 R3); the prefix table's header action is `Button size="md"`.
- **Labels and codes:** the uppercase eyebrows are `fieldLabelClasses`; keys, tokens and prefixes are `tag`; the template example and the QR URL keep `font-mono` (R3). The document number examples are a `KeyValueList`.
- **Tables:** the prefix, advanced and change-review tables are `DataTable framed={false}` inside their panels (the prefix table with `scrollHint`); the unassigned-categories line moves into the count block; the empty transfer states are `EmptyNote`s.
- **Notices (R5):** the workflow note (info); the scheduler, retention and LDAP sync notes (neutral); the missing default role (warning); the sync error (danger, `role="alert"`); `ValidationMessage` is `<Notice tone="danger" className="my-2">`.
- **Advanced tab:** a `ContentPanel` with a warning `Notice`; the details toggle is a text link (`linkVariants({ size: "inherit" })` plus `list-item`, which keeps the disclosure marker); its table is a `DataTable` with `orNil`.
- **Change review:** a `ContentPanel divided flush` with a `DataTable`; the key is a `Link` whose `onNavigate` switches the tab in place (`openSettingGroup`), as `TabNav` does, so the unsaved values stay.
- **LDAP:** the sync history is a section under a top line (no box in the box), with `EmptyNote`, `dt`/`dd` counts and a warning `StatusBadge` for blockers. The sync preview's counts are two `StatStrip`s (preview, applied); its blockers and deactivation impact are warning `Notice`s, with the deactivation list after the box (R5).
- **Label preview:** the paper uses tokens (`border-control-border bg-surface text-foreground`, `text-muted-foreground`) and keeps `shadow-sm` (VFG R2 paper preview).
- **Messages (R9):** `systemSettingsPage.tabDocuments` th "เลขเอกสาร", en "Documents".

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx`, `messages/th.json`, `messages/en.json` (through the script)
- Modify (pins): `tests/form-frames-ui.test.ts`, `tests/settings-ldap-role-ui.test.ts` (LF), `tests/steps-ui.test.ts`, `tests/asset-label-print-ui.test.ts`
- Modify (guards): `tests/list-frame-guards.test.ts`
- Create: `tests/admin-sweep-ui.test.ts` (LF)

- [ ] **Step 1: The failing tests.** Create `tests/admin-sweep-ui.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D §3.2, D7, D9, M13, M14, M20–M22, M25, M27, M29, M30, M33): the admin screens on the shared parts.
// Panels are ContentPanel, tables DataTable, messages Notice by meaning, states StatusBadge, names the shared Chip,
// empty states EmptyNote or ActionEmptyState, codes tag, empty values Nil. Each test pins one file (or one tight pair)
// and fails before that file's commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("settings: panels are ContentPanel, notes are Notice, tables DataTable, no raw colors, and the tab row fits at 1440 (spec 2D §3.2, D18)", () => {
  const source = read(`${C}admin/system-settings-form.tsx`)
  assert.doesNotMatch(source, /function (?:SectionHeader|Head|StatusCard|Metric|MiniMetric|EmptyTransferState)\b|<button\b|<table\b|border-dashed|rounded-full|\b(?:bg|text|border)-(?:slate|amber|blue|emerald|rose)-\d|bg-white|uppercase tracking-normal|opacity-80|md:min-h-10|role="list"/)
  assert.doesNotMatch(source, /className="(?:overflow-(?:hidden|visible) )?rounded-lg border/, "every panel is ContentPanel")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 16)
  assert.match(source, /<div id="settings-workspace">\n\s+<ContentPanel divided title=\{labels\.settingsOverview\} description=\{labels\.settingsOverviewDescription\}>/)
  assert.equal(source.match(/<KeyValueList items=\{overviewItems\.slice\((?:0, 5|5)\)\} \/>/g)?.length, 2)
  for (const [tone, text] of [["info", "labels.workflowApprovalFoundationNote"], ["neutral", "labels.schedulerHeartbeatNote"], ["neutral", "labels.retentionDaysHelp"], ["neutral", "labels.ldapSyncRecommendation"]]) {
    assert.ok(source.includes(`<Notice tone="${tone}">{${text}}</Notice>`), `${text} is a ${tone} Notice`)
  }
  assert.match(source, /<Notice tone="warning">\{labels\.ldapDefaultRoleMissing\.replace\("\{role\}", getValue\("ldap_default_role"\)\)\}<\/Notice>/)
  assert.match(source, /<Notice tone="danger" role="alert">\n\s+<ApiErrorText error=\{syncError\} \/>\n\s+<\/Notice>/)
  assert.match(source, /function ValidationMessage\(\{ message \}: \{ message: string \}\) \{\n\s+return \(\n\s+<Notice tone="danger" className="my-2">/)
  assert.match(source, /className="h-auto justify-start whitespace-normal py-2 text-left md:h-auto md:min-h-9"/, "R3 hand-on: the presets are 36px from md")
  assert.match(source, /<span className="tag">\{result\.key\}<\/span>/)
  assert.match(source, /<span className="tag font-medium text-foreground">\{group\.prefix\}<\/span>/)
  assert.match(source, /<span className="tag font-medium text-foreground">\{setting\.key\}<\/span>/)
  assert.match(source, /\{orNil\(formatReviewValue\(setting\.key, initialValues\[setting\.key\]\)\)\}/)
  assert.match(source, /return normalized \|\| null\n/)
  assert.match(source, /onNavigate=\{\(event\) => \{\n\s+event\.preventDefault\(\)\n\s+openSettingGroup\(tab\)\n\s+\}\}/)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the preview counts and the applied counts")
  assert.match(source, /className="overflow-hidden rounded border border-control-border bg-surface text-foreground shadow-sm"/, "the label paper uses tokens and keeps its paper shadow")
  for (const locale of ["th", "en"] as const) {
    assert.equal(messages(locale).systemSettingsPage.tabDocuments, locale === "th" ? "เลขเอกสาร" : "Documents", `${locale}: the shorter tab label keeps the row inside 1440 (D18)`)
  }
})
```

In `tests/form-frames-ui.test.ts` (CRLF), the settings tables test now pins `DataTable`:

Replace

```ts
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})

test("the three settings tables have the white 13/500 header in sentence case (2B-1 task 24, R-e)", () => {
  const source = read(`${C}admin/system-settings-form.tsx`)
  assert.equal(source.match(/<thead>/g)?.length, 3, "the prefix, advanced and change-review tables")
  assert.match(
    source,
    /function Head\(\{ children \}: \{ children: React\.ReactNode \}\) \{\n  return <th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">\{children\}<\/th>\n\}/,
  )
  assert.doesNotMatch(source, /<thead className=|\bbg-muted\//)
})

test("the asset batch form: PageHeader and the white table header on its three tables (2B-1 task 24, I13, R-e)", () => {
```

with

```ts
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})

// Plan 2D-2 moved the three settings tables from the local Head onto the shared DataTable, inside their panels.
test("the three settings tables are the shared DataTable with its white 13/500 header (2B-1 task 24, R-e; plan 2D-2)", () => {
  const source = read(`${C}admin/system-settings-form.tsx`)
  assert.equal(source.match(/<DataTableHeader>/g)?.length, 3, "the prefix, advanced and change-review tables")
  assert.equal(source.match(/<DataTable framed=\{false\}/g)?.length, 3, "each sits in its panel, so it has no frame of its own")
  assert.doesNotMatch(source, /<thead\b|<th\b|function Head\b|\bbg-muted\//)
})

test("the asset batch form: PageHeader and the white table header on its three tables (2B-1 task 24, I13, R-e)", () => {
```

In `tests/settings-ldap-role-ui.test.ts` (LF):

Replace

```ts
  const ldapSectionStart = settingsForm.indexOf('{activeTab === "ldap-login" ? (')
  assert.notEqual(ldapSectionStart, -1)
  const ldapSectionOpening = settingsForm.slice(ldapSectionStart, ldapSectionStart + 240)
  assert.match(ldapSectionOpening, /overflow-visible rounded-lg border border-border bg-surface"/)
  assert.doesNotMatch(ldapSectionOpening, /overflow-hidden rounded-lg border border-border bg-surface/)
})
```

with

```ts
  const ldapSectionStart = settingsForm.indexOf('{activeTab === "ldap-login" ? (')
  assert.notEqual(ldapSectionStart, -1)
  const ldapSectionOpening = settingsForm.slice(ldapSectionStart, ldapSectionStart + 240)
  // ContentPanel does not clip (no overflow-hidden), and the role picker's list opens in a portal (plan 2D-2).
  assert.match(ldapSectionOpening, /<ContentPanel divided title=\{labels\.ldapSettings\} description=\{labels\.ldapSettingsDescription\}>/)
  assert.doesNotMatch(ldapSectionOpening, /overflow-hidden/)
})
```

In `tests/steps-ui.test.ts` (CRLF):

Replace

```ts
  assert.deepEqual(sections, ["1 ldapStepConnection", "2 ldapStepLoginMapping", "3 ldapStepProvisioning", "1 ldapStepSyncStrategy", "2 ldapStepOrgMapping", "3 ldapStepSchedule", "4 ldapStepPreviewApply"])
  assert.equal(source.match(/<\/FormSection>/g)?.length, 7)
  assert.doesNotMatch(source, /WizardStep/)
  // Without the step cards, 24px separates the sections on both LDAP tabs (spec 2C section 7.3).
  assert.equal(source.match(/<div className="space-y-6 px-4 py-4">/g)?.length, 2)
})

test("the import panel shows its five steps on the shared rail, and the current-step label is gone (S5, batch 4)", () => {
```

with

```ts
  assert.deepEqual(sections, ["1 ldapStepConnection", "2 ldapStepLoginMapping", "3 ldapStepProvisioning", "1 ldapStepSyncStrategy", "2 ldapStepOrgMapping", "3 ldapStepSchedule", "4 ldapStepPreviewApply"])
  assert.equal(source.match(/<\/FormSection>/g)?.length, 7)
  assert.doesNotMatch(source, /WizardStep/)
  // Without the step cards, 24px separates the sections on both LDAP tabs (spec 2C section 7.3), inside their
  // ContentPanel, which brings the padding since plan 2D-2.
  assert.equal(source.match(/<ContentPanel divided title=\{labels\.(?:ldapSettings|ldapSyncStrategy)\} description=\{labels\.\w+\}>\n\s+<div className="space-y-6">/g)?.length, 2)
})

test("the import panel shows its five steps on the shared rail, and the current-step label is gone (S5, batch 4)", () => {
```

In `tests/asset-label-print-ui.test.ts` (CRLF), the focus ring pin moves to `Segmented`, which draws it (the form loses its last hand-made focus classes in Step 2). This assertion passes before and after.

Replace

```ts
  assert.match(form, /<Segmented aria-label=\{label\}[\s\S]*?showCheck/)
  assert.match(form, /Check/)
  assert.match(readFileSync("src/components/ui/segmented.tsx", "utf8"), /"bg-primary-soft font-semibold text-primary-hover"/)
  assert.match(form, /focus-visible:ring-2 focus-visible:ring-ring/)
  assert.doesNotMatch(form, /role="switch"/)
  assert.doesNotMatch(form, /<InlineToggleField[\s\S]*label=\{labels\.compactLabelAssetName\}/)
  assert.doesNotMatch(form, /<ToggleField[\s\S]*label=\{labels\.compactLabelAssetName\}/)
```

with

```ts
  assert.match(form, /<Segmented aria-label=\{label\}[\s\S]*?showCheck/)
  assert.match(form, /Check/)
  assert.match(readFileSync("src/components/ui/segmented.tsx", "utf8"), /"bg-primary-soft font-semibold text-primary-hover"/)
  // The asset name choice shows the focus ring of Segmented itself (the form has no hand-made focus classes since 2D-2).
  assert.match(readFileSync("src/components/ui/segmented.tsx", "utf8"), /focus-visible:ring-2 focus-visible:ring-ring/)
  assert.doesNotMatch(form, /role="switch"/)
  assert.doesNotMatch(form, /<InlineToggleField[\s\S]*label=\{labels\.compactLabelAssetName\}/)
  assert.doesNotMatch(form, /<ToggleField[\s\S]*label=\{labels\.compactLabelAssetName\}/)
```

Run: `node --test tests/admin-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/settings-ldap-role-ui.test.ts tests/steps-ui.test.ts tests/asset-label-print-ui.test.ts`
Expected: 4 failures:
- "settings: panels are ContentPanel, notes are Notice, tables DataTable, no raw colors, and the tab row fits at 1440 (spec 2D §3.2, D18)"
- "the three settings tables are the shared DataTable with its white 13/500 header (2B-1 task 24, R-e; plan 2D-2)"
- "LDAP default role setting uses real active roles instead of free text"
- "the LDAP settings steps are quiet numbered sections, not a third layer of cards (K18, 1f)"

- [ ] **Step 2: The form.** In `src/components/admin/system-settings-form.tsx` (CRLF), in this order:

(1) Replace

```tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight, ExternalLink, History, Pencil, PlugZap, Plus, Save, Trash2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { DepreciationPolicyBuilder } from "@/components/admin/depreciation-policy-builder"
```

with

```tsx
"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight, ExternalLink, Pencil, PlugZap, Plus, Save, Trash2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { DepreciationPolicyBuilder } from "@/components/admin/depreciation-policy-builder"
```

(2) Replace

```tsx
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Field, FieldHint } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { SearchField } from "@/components/ui/search-field"
import { Segmented } from "@/components/ui/segmented"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { TabNav } from "@/components/ui/tab-nav"
import { cn } from "@/lib/utils"
import {
  assetLabelLayouts,
```

with

```tsx
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldHint } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { KeyValueList, type KeyValueItem } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { SearchField } from "@/components/ui/search-field"
import { Segmented } from "@/components/ui/segmented"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { TabNav } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import {
  assetLabelLayouts,
```

(3) Replace

```tsx
  return value ?? ""
}

function formatReviewValue(key: string, value: string | undefined) {
  const normalized = normalizeSettingValue(key, value)
  if (key.toLowerCase().includes("password") && normalized) return "********"
  return normalized || "-"
}

export function SystemSettingsForm({
```

with

```tsx
  return value ?? ""
}

// null when the setting is empty: the review table shows Nil for it.
function formatReviewValue(key: string, value: string | undefined) {
  const normalized = normalizeSettingValue(key, value)
  if (key.toLowerCase().includes("password") && normalized) return "********"
  return normalized || null
}

export function SystemSettingsForm({
```

(4) Replace

```tsx
  const searchParams = useSearchParams()
  // The tab row's name: the page passes no label for it, so the form reads the page title.
  const tPage = useTranslations("systemSettingsPage")
  const params = useParams<{ locale?: string }>()
  const locale = typeof params.locale === "string" ? params.locale : "th"
  const initialValues = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
```

with

```tsx
  const searchParams = useSearchParams()
  // The tab row's name: the page passes no label for it, so the form reads the page title.
  const tPage = useTranslations("systemSettingsPage")
  const tCommon = useTranslations("common")
  const params = useParams<{ locale?: string }>()
  const locale = typeof params.locale === "string" ? params.locale : "th"
  const initialValues = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
```

(5) Replace

```tsx
    setSettingsSearch("")
    window.requestAnimationFrame(() => document.getElementById("settings-workspace")?.scrollIntoView({ block: "start" }))
  }
  const overviewCards = [
    {
      label: labels.overviewAssetTag,
      value: formatTemplate,
      tone: "blue",
    },
    {
      label: labels.overviewLabel,
      value: assetLabelPresets[labelTemplates.defaultTapeSize].label,
      tone: "green",
    },
    {
      label: labels.overviewDocuments,
      value: `${renderOperationDocumentTemplate(checkoutDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)} / ${renderOperationDocumentTemplate(
        checkinDocumentTemplate,
```

with

```tsx
    setSettingsSearch("")
    window.requestAnimationFrame(() => document.getElementById("settings-workspace")?.scrollIntoView({ block: "start" }))
  }
  // The overview is two label and value lists (DESIGN KeyValueList): no tone fills, an empty value is Nil, and the two
  // LDAP switches are status badges.
  const ldapLoginEnabled = getValue("ldap_enabled") === "true"
  const ldapSyncEnabled = getValue("ldap_sync_enabled") === "true"
  const overviewItems: KeyValueItem[] = [
    { key: "assetTag", label: labels.overviewAssetTag, value: <span className="[overflow-wrap:anywhere]">{formatTemplate}</span> },
    { key: "label", label: labels.overviewLabel, value: assetLabelPresets[labelTemplates.defaultTapeSize].label },
    {
      key: "documents",
      label: labels.overviewDocuments,
      value: `${renderOperationDocumentTemplate(checkoutDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)} / ${renderOperationDocumentTemplate(
        checkinDocumentTemplate,
```

(6) Replace

```tsx
        1,
        operationDocumentExampleDigits
      )}`,
      tone: "amber",
    },
    {
      label: labels.overviewOrganization,
      value: getValue("company_name") || "-",
      tone: "slate",
    },
    {
      label: labels.overviewNotifications,
      value: `${getValue(notificationReturnDueSoonDaysKey) || "3"}d / ${getValue(notificationWarrantyExpiryDaysKey) || "30"}d`,
      tone: "blue",
    },
    {
      label: labels.overviewApproval,
      value: `${workflowApprovalPolicy.minApprovers} / SLA ${workflowApprovalPolicy.slaDays}d / ${workflowApprovalPolicy.segregationRequired ? labels.workflowApprovalSodOn : labels.workflowApprovalSodOff}`,
      tone: "amber",
    },
    {
      label: labels.overviewGovernance,
      value: `${getValue(retentionAttachmentDaysKey) || "-"}d / ${getValue(retentionAuditLogDaysKey) || "-"}d / ${getValue(retentionOrphanFileDaysKey) || "-"}d`,
      tone: hasInvalidRetentionPolicy ? "rose" : "green",
    },
    {
      label: labels.overviewLdapLogin,
      value: getValue("ldap_enabled") === "true" ? labels.enabled : labels.disabled,
      tone: getValue("ldap_enabled") === "true" ? "green" : "slate",
    },
    {
      label: labels.overviewLdapSync,
      value: getValue("ldap_sync_enabled") === "true" ? `${labels.enabled} (${getValue("ldap_sync_mode") || "preview"})` : labels.disabled,
      tone: getValue("ldap_sync_enabled") === "true" ? "green" : "slate",
    },
    {
      label: labels.overviewAdvanced,
      value: labels.advancedSettingCount.replace("{count}", String(generalSettings.length)),
      tone: "rose",
    },
  ] as const

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
```

with

```tsx
        1,
        operationDocumentExampleDigits
      )}`,
    },
    { key: "organization", label: labels.overviewOrganization, value: getValue("company_name") || null },
    {
      key: "notifications",
      label: labels.overviewNotifications,
      value: `${getValue(notificationReturnDueSoonDaysKey) || "3"}d / ${getValue(notificationWarrantyExpiryDaysKey) || "30"}d`,
    },
    {
      key: "approval",
      label: labels.overviewApproval,
      value: `${workflowApprovalPolicy.minApprovers} / SLA ${workflowApprovalPolicy.slaDays}d / ${workflowApprovalPolicy.segregationRequired ? labels.workflowApprovalSodOn : labels.workflowApprovalSodOff}`,
    },
    {
      key: "governance",
      label: labels.overviewGovernance,
      value: (
        <>
          {[retentionAttachmentDaysKey, retentionAuditLogDaysKey, retentionOrphanFileDaysKey].map((key, index) => (
            <Fragment key={key}>
              {index > 0 ? " / " : null}
              {getValue(key) ? `${getValue(key)}d` : <Nil />}
            </Fragment>
          ))}
        </>
      ),
    },
    {
      key: "ldapLogin",
      label: labels.overviewLdapLogin,
      value: <StatusBadge label={ldapLoginEnabled ? labels.enabled : labels.disabled} tone={ldapLoginEnabled ? "success" : "muted"} />,
    },
    {
      key: "ldapSync",
      label: labels.overviewLdapSync,
      value: (
        <StatusBadge
          label={ldapSyncEnabled ? `${labels.enabled} (${getValue("ldap_sync_mode") || "preview"})` : labels.disabled}
          tone={ldapSyncEnabled ? "success" : "muted"}
        />
      ),
    },
    { key: "advanced", label: labels.overviewAdvanced, value: labels.advancedSettingCount.replace("{count}", formatCount(generalSettings.length)) },
  ]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
```

(7) Replace

```tsx
        }}
      />

      <div className="rounded-lg border border-border bg-surface p-4">
        <Field label={labels.searchSettings}>
          <SearchField value={settingsSearch} onChange={(event) => setSettingsSearch(event.target.value)} placeholder={labels.searchSettingsHelp} />
        </Field>
        {settingsSearch.trim() ? (
          settingsSearchResults.length > 0 ? (
            <div className="mt-3 grid gap-2" role="list">
              {settingsSearchResults.map((result) => (
                <button
                  key={result.key}
                  type="button"
                  onClick={() => openSettingGroup(result.tab)}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs font-medium text-foreground">{result.key}</span>
                    {result.description ? <span className="mt-1 block line-clamp-1 text-xs text-muted-foreground">{result.description}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-primary">{result.tabLabel}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{labels.noSettingsSearchResults}</p>
          )
        ) : null}
      </div>

      <div id="settings-workspace" className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.settingsOverview} description={labels.settingsOverviewDescription} />
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <StatusCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
          ))}
        </div>
      </div>

      {activeTab === "asset-numbering" ? (
      <>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.assetTagFormat} description={labels.assetTagFormatDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              <Field label={labels.assetTagTemplate}>
```

with

```tsx
        }}
      />

      <ContentPanel>
        <Field label={labels.searchSettings}>
          <SearchField value={settingsSearch} onChange={(event) => setSettingsSearch(event.target.value)} placeholder={labels.searchSettingsHelp} />
        </Field>
        {settingsSearch.trim() ? (
          settingsSearchResults.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {settingsSearchResults.map((result) => (
                <li key={result.key}>
                  <Button
                    variant="outline"
                    onClick={() => openSettingGroup(result.tab)}
                    className="h-auto w-full justify-between gap-3 whitespace-normal py-2 text-left md:h-auto md:min-h-9"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground"><span className="tag">{result.key}</span></span>
                      {result.description ? <span className="mt-1 block line-clamp-1 text-xs font-normal text-muted-foreground">{result.description}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-primary">{result.tabLabel}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote role="status" className="mt-3">{labels.noSettingsSearchResults}</EmptyNote>
          )
        ) : null}
      </ContentPanel>

      {/* openSettingGroup scrolls to this id; ContentPanel takes no id of its own. */}
      <div id="settings-workspace">
        <ContentPanel divided title={labels.settingsOverview} description={labels.settingsOverviewDescription}>
          <div className="grid gap-x-8 gap-y-2 lg:grid-cols-2">
            <KeyValueList items={overviewItems.slice(0, 5)} />
            <KeyValueList items={overviewItems.slice(5)} />
          </div>
        </ContentPanel>
      </div>

      {activeTab === "asset-numbering" ? (
      <>
      <ContentPanel divided title={labels.assetTagFormat} description={labels.assetTagFormatDescription}>
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              <Field label={labels.assetTagTemplate}>
```

(8) Replace

```tsx
                    key={preset.value}
                    variant="outline"
                    onClick={() => setValue(assetTagFormatTemplateKey, preset.value)}
                    className="h-auto justify-start whitespace-normal py-2 text-left md:h-auto md:min-h-10"
                  >
                    {labels[preset.labelKey]}
                  </Button>
```

with

```tsx
                    key={preset.value}
                    variant="outline"
                    onClick={() => setValue(assetTagFormatTemplateKey, preset.value)}
                    className="h-auto justify-start whitespace-normal py-2 text-left md:h-auto md:min-h-9"
                  >
                    {labels[preset.labelKey]}
                  </Button>
```

(9) Replace

```tsx
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.availableTokens}</div>
            <div className="flex flex-wrap gap-2">
              {assetTagFormatTokens.map((token) => (
                <Button
```

with

```tsx
            </div>
          </div>
          <div className="space-y-2">
            <div className={fieldLabelClasses}>{labels.availableTokens}</div>
            <div className="flex flex-wrap gap-2">
              {assetTagFormatTokens.map((token) => (
                <Button
```

(10) Replace

```tsx
                    }))
                  }
                >
                  <span className="font-mono">{`{${token}}`}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
            {labels.exampleFormat}: {"{assetCompanyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}"}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.numberingOptions} />
        <div className="grid gap-4 px-4 py-4 md:grid-cols-3">
          <Field label={labels.runningDigits}>
            <Input
              id="asset-tag-running-digits"
```

with

```tsx
                    }))
                  }
                >
                  <span className="tag">{`{${token}}`}</span>
                </Button>
              ))}
            </div>
          </div>
          {/* A template string wraps, so it keeps font-mono and is not a tag (R3). */}
          <p className="text-meta text-muted-foreground [overflow-wrap:anywhere]">
            {labels.exampleFormat}: <span className="font-mono">{"{assetCompanyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}"}</span>
          </p>
        </div>
      </ContentPanel>

      <ContentPanel divided title={labels.numberingOptions}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={labels.runningDigits}>
            <Input
              id="asset-tag-running-digits"
```

(11) Replace

```tsx
            />
          </Field>
        </div>
      </div>
      </>
      ) : null}

      {activeTab === "label-template" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.labelPrintTemplate} description={labels.labelPrintTemplateDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-4 rounded-md border border-border bg-background p-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
            <div className="space-y-2">
              <Field label={labels.publicQrBaseUrl}>
                <Input
```

with

```tsx
            />
          </Field>
        </div>
      </ContentPanel>
      </>
      ) : null}

      {activeTab === "label-template" ? (
      <ContentPanel divided title={labels.labelPrintTemplate} description={labels.labelPrintTemplateDescription}>
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
            <div className="space-y-2">
              <Field label={labels.publicQrBaseUrl}>
                <Input
```

(12) Replace

```tsx
              <p className="text-sm text-muted-foreground">{labels.publicQrBaseUrlDescription}</p>
              {hasInvalidPublicQrBaseUrl ? <ValidationMessage message={labels.invalidPublicQrBaseUrl} /> : null}
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.publicQrPreview}</div>
              <div className="mt-2 break-all font-mono text-xs text-foreground">{publicQrPreviewValue}</div>
              <div className="mt-2 text-xs text-muted-foreground">{labels.publicQrResolverPath}: /q/a/{"{assetId}"}</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(220px,330px)_minmax(300px,420px)] md:items-start">
```

with

```tsx
              <p className="text-sm text-muted-foreground">{labels.publicQrBaseUrlDescription}</p>
              {hasInvalidPublicQrBaseUrl ? <ValidationMessage message={labels.invalidPublicQrBaseUrl} /> : null}
            </div>
            <div className="space-y-1">
              <div className={fieldLabelClasses}>{labels.publicQrPreview}</div>
              {/* A URL wraps anywhere, so it keeps font-mono and is not a tag (R3). */}
              <p className="break-all font-mono text-xs text-foreground">{publicQrPreviewValue}</p>
              <p className="text-meta text-muted-foreground">{labels.publicQrResolverPath}: <span className="tag">/q/a/{"{assetId}"}</span></p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(220px,330px)_minmax(300px,420px)] md:items-start">
```

(13) Replace

```tsx
          {hasInvalidLabelSize ? <ValidationMessage message={labels.invalidLabelSize} /> : null}
          <LabelPreviewPanel labels={labels} templates={labelTemplates} qrValue={publicQrPreviewValue} />
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.labelTemplateTokens}</div>
            <div className="flex flex-wrap gap-2">
              {assetLabelTemplateTokens.map((token) => (
                <span key={token} className="inline-flex h-8 items-center rounded-md border border-border px-2 font-mono text-xs text-foreground">
                  {`{${token}}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {activeTab === "documents" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.operationDocumentNumbers} description={labels.operationDocumentNumbersDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={labels.checkoutDocumentTemplate}>
```

with

```tsx
          {hasInvalidLabelSize ? <ValidationMessage message={labels.invalidLabelSize} /> : null}
          <LabelPreviewPanel labels={labels} templates={labelTemplates} qrValue={publicQrPreviewValue} />
          <div className="space-y-2">
            <div className={fieldLabelClasses}>{labels.labelTemplateTokens}</div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground">
              {assetLabelTemplateTokens.map((token) => (
                <li key={token}>
                  <span className="tag">{`{${token}}`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "documents" ? (
      <ContentPanel divided title={labels.operationDocumentNumbers} description={labels.operationDocumentNumbersDescription}>
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={labels.checkoutDocumentTemplate}>
```

(14) Replace

```tsx
                />
              </Field>
            </div>
            <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{labels.exampleFormat}</div>
              <div className="mt-2 space-y-1 font-mono">
                <div>{labels.checkoutDocumentExample}: {renderOperationDocumentTemplate(checkoutDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)}</div>
                <div>{labels.checkinDocumentExample}: {renderOperationDocumentTemplate(checkinDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)}</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{labels.operationDocumentTemplateHelp}</p>
          {hasInvalidOperationDocumentTemplate ? <ValidationMessage message={labels.invalidOperationDocumentTemplate} /> : null}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.operationDocumentTokens}</div>
            <div className="flex flex-wrap gap-2">
              {operationDocumentTemplateTokens.map((token) => (
                <span key={token} className="inline-flex h-8 items-center rounded-md border border-border px-2 font-mono text-xs text-foreground">
                  {`{${token}}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {activeTab === "asset-numbering" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.categoryPrefixes} description={labels.categoryPrefixesDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {formatTemplateText(labels.prefixGroupCount, { count: String(prefixGroups.length) })}
              </div>
              <div>
                {formatTemplateText(labels.assignedCategoryCount, {
                  assigned: String(categories.length - unassignedCategoryCount),
                  total: String(categories.length),
                })}
              </div>
            </div>
            <Button onClick={() => openPrefixEditor()}>
              <Plus />
              {labels.addPrefix}
            </Button>
          </div>

          {prefixGroups.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
              {labels.noCategoryPrefixes}
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr>
                    <Head>{labels.prefix}</Head>
                    <Head>{labels.category}</Head>
                    <Head>{labels.categoryPrefixPreview}</Head>
                    <Head>
                      <span className="sr-only">{labels.editPrefix}</span>
                    </Head>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {prefixGroups.map((group) => (
                    <tr key={group.prefix} className="hover:bg-row-hover">
                      <td className="px-4 py-3">
                        <span className="inline-flex min-h-8 items-center rounded-md border border-border bg-background px-3 font-mono text-sm font-semibold text-foreground">
                          {group.prefix}
                        </span>
                      </td>
                      <td className="min-w-72 px-4 py-3">
                        <div className="font-medium text-foreground">
                          {formatTemplateText(labels.categoryCount, { count: String(group.categoryIds.length) })}
                        </div>
```

with

```tsx
                />
              </Field>
            </div>
            <div className="space-y-2">
              <div className={fieldLabelClasses}>{labels.exampleFormat}</div>
              <KeyValueList
                items={[
                  { key: "checkout", label: labels.checkoutDocumentExample, value: <span className="tag">{renderOperationDocumentTemplate(checkoutDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)}</span> },
                  { key: "checkin", label: labels.checkinDocumentExample, value: <span className="tag">{renderOperationDocumentTemplate(checkinDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)}</span> },
                ]}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{labels.operationDocumentTemplateHelp}</p>
          {hasInvalidOperationDocumentTemplate ? <ValidationMessage message={labels.invalidOperationDocumentTemplate} /> : null}
          <div className="space-y-2">
            <div className={fieldLabelClasses}>{labels.operationDocumentTokens}</div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground">
              {operationDocumentTemplateTokens.map((token) => (
                <li key={token}>
                  <span className="tag">{`{${token}}`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "asset-numbering" ? (
      <ContentPanel
        divided
        title={labels.categoryPrefixes}
        description={labels.categoryPrefixesDescription}
        actions={
          <Button size="md" onClick={() => openPrefixEditor()}>
            <Plus />
            {labels.addPrefix}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">
              {formatTemplateText(labels.prefixGroupCount, { count: String(prefixGroups.length) })}
            </div>
            <div>
              {formatTemplateText(labels.assignedCategoryCount, {
                assigned: String(categories.length - unassignedCategoryCount),
                total: String(categories.length),
              })}
            </div>
            <div>{formatTemplateText(labels.unassignedCategoryCount, { count: String(unassignedCategoryCount) })}</div>
          </div>

          {prefixGroups.length === 0 ? (
            <EmptyNote>{labels.noCategoryPrefixes}</EmptyNote>
          ) : (
            <DataTable framed={false} caption={labels.categoryPrefixes} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{labels.prefix}</DataTableHead>
                  <DataTableHead>{labels.category}</DataTableHead>
                  <DataTableHead>{labels.categoryPrefixPreview}</DataTableHead>
                  <DataTableHead align="right" hideLabel>{labels.editPrefix}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                  {prefixGroups.map((group) => (
                    <DataTableRow key={group.prefix}>
                      <DataTableCell>
                        <span className="tag font-medium text-foreground">{group.prefix}</span>
                      </DataTableCell>
                      <DataTableCell className="min-w-72">
                        <div className="font-medium text-foreground">
                          {formatTemplateText(labels.categoryCount, { count: String(group.categoryIds.length) })}
                        </div>
```

(15) Replace

```tsx
                            .map((category) => `${category?.code} - ${category?.name}`)
                            .join(", ")}
                        </div>
                      </td>
                      <td className="min-w-56 px-4 py-3 font-mono text-xs text-muted-foreground">
                        {renderAssetTagPreview(formatTemplate, group.prefix, getValue("asset_tag_separator"))}
                      </td>
                      <td className="w-32 px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
```

with

```tsx
                            .map((category) => `${category?.code} - ${category?.name}`)
                            .join(", ")}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="min-w-56 text-muted-foreground">
                        <span className="tag">{renderAssetTagPreview(formatTemplate, group.prefix, getValue("asset_tag_separator"))}</span>
                      </DataTableCell>
                      <DataTableCell align="right" className="w-32">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
```

(16) Replace

```tsx
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {formatTemplateText(labels.unassignedCategoryCount, { count: String(unassignedCategoryCount) })}
          </div>
          {hasDuplicateCategory ? <ValidationMessage message={labels.duplicateCategory} /> : null}
          {hasInvalidPrefix ? <ValidationMessage message={labels.invalidPrefix} /> : null}
        </div>
```

with

```tsx
                            <Trash2 />
                          </Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
              </DataTableBody>
            </DataTable>
          )}

          {hasDuplicateCategory ? <ValidationMessage message={labels.duplicateCategory} /> : null}
          {hasInvalidPrefix ? <ValidationMessage message={labels.invalidPrefix} /> : null}
        </div>
```

(17) Replace

```tsx
                      className="font-mono uppercase"
                    />
                  </Field>
                  <div className="rounded-md border border-border bg-background px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      {labels.categoryPrefixPreview}
                    </div>
                    <div className="mt-1 font-mono text-sm text-foreground">
                      {renderAssetTagPreview(formatTemplate, normalizedPrefixDraft || "COM", getValue("asset_tag_separator"))}
                    </div>
                  </div>
                </div>
```

with

```tsx
                      className="font-mono uppercase"
                    />
                  </Field>
                  <div className="space-y-1">
                    <div className={fieldLabelClasses}>{labels.categoryPrefixPreview}</div>
                    <div className="flex min-h-10 items-center text-sm text-foreground [overflow-wrap:anywhere]">
                      <span className="font-mono">{renderAssetTagPreview(formatTemplate, normalizedPrefixDraft || "COM", getValue("asset_tag_separator"))}</span>
                    </div>
                  </div>
                </div>
```

(18) Replace

```tsx
                    onSearchChange={setAvailableCategorySearch}
                  >
                    {filteredAvailableCategories.length === 0 ? (
                      <EmptyTransferState label={labels.noMatchingCategories} />
                    ) : (
                      filteredAvailableCategories.map((category) => {
                        const assignedPrefix = assignedPrefixByCategoryId.get(category.id)
```

with

```tsx
                    onSearchChange={setAvailableCategorySearch}
                  >
                    {filteredAvailableCategories.length === 0 ? (
                      <EmptyNote className="min-h-64 justify-center px-4 text-center">{labels.noMatchingCategories}</EmptyNote>
                    ) : (
                      filteredAvailableCategories.map((category) => {
                        const assignedPrefix = assignedPrefixByCategoryId.get(category.id)
```

(19) Replace

```tsx
                    onSearchChange={setSelectedCategorySearch}
                  >
                    {prefixEditor.categoryIds.length === 0 ? (
                      <EmptyTransferState label={labels.noSelectedCategories} />
                    ) : filteredSelectedCategories.length === 0 ? (
                      <EmptyTransferState label={labels.noMatchingCategories} />
                    ) : (
                      filteredSelectedCategories.map((category) => {
                        const isChecked = checkedSelectedCategoryIds.includes(category.id)
```

with

```tsx
                    onSearchChange={setSelectedCategorySearch}
                  >
                    {prefixEditor.categoryIds.length === 0 ? (
                      <EmptyNote className="min-h-64 justify-center px-4 text-center">{labels.noSelectedCategories}</EmptyNote>
                    ) : filteredSelectedCategories.length === 0 ? (
                      <EmptyNote className="min-h-64 justify-center px-4 text-center">{labels.noMatchingCategories}</EmptyNote>
                    ) : (
                      filteredSelectedCategories.map((category) => {
                        const isChecked = checkedSelectedCategoryIds.includes(category.id)
```

(20) Replace

```tsx
            </>
          ) : null}
        </AccessibleDialog>
      </div>
      ) : null}

      {activeTab === "organization" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.organizationDefaults} description={labels.organizationDefaultsDescription} />
        <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
          <Field label={labels.companyName}>
            <Input
              id="company-name"
```

with

```tsx
            </>
          ) : null}
        </AccessibleDialog>
      </ContentPanel>
      ) : null}

      {activeTab === "organization" ? (
      <ContentPanel divided title={labels.organizationDefaults} description={labels.organizationDefaultsDescription}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={labels.companyName}>
            <Input
              id="company-name"
```

(21) Replace

```tsx
            {hasInvalidDepreciationPolicy ? <ValidationMessage message={labels.invalidAccountingDepreciationPolicy} /> : null}
          </div>
        </div>
      </div>
      ) : null}

      {activeTab === "notifications" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.notificationRules} description={labels.notificationRulesDescription} />
        <div className="grid gap-4 px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label={labels.returnDueSoonDays}>
            <Input
              id="notification-return-due-days"
```

with

```tsx
            {hasInvalidDepreciationPolicy ? <ValidationMessage message={labels.invalidAccountingDepreciationPolicy} /> : null}
          </div>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "notifications" ? (
      <ContentPanel divided title={labels.notificationRules} description={labels.notificationRulesDescription}>
        <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label={labels.returnDueSoonDays}>
            <Input
              id="notification-return-due-days"
```

(22) Replace

```tsx
            />
          </Field>
        </div>
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">{labels.notificationDaysHelp}</p>
          {hasInvalidNotificationRule ? <ValidationMessage message={labels.invalidNotificationRule} /> : null}
        </div>
      </div>
      ) : null}

      {activeTab === "workflow-approval" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.workflowApprovalPolicy} description={labels.workflowApprovalPolicyDescription} />
        <div className="space-y-4 px-4 py-4">
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {labels.workflowApprovalFoundationNote}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <ToggleField
              label={labels.workflowApprovalDisposalRequired}
```

with

```tsx
            />
          </Field>
        </div>
        <p className="text-sm text-muted-foreground">{labels.notificationDaysHelp}</p>
        {hasInvalidNotificationRule ? <ValidationMessage message={labels.invalidNotificationRule} /> : null}
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "workflow-approval" ? (
      <ContentPanel divided title={labels.workflowApprovalPolicy} description={labels.workflowApprovalPolicyDescription}>
        <div className="space-y-4">
          <Notice tone="info">{labels.workflowApprovalFoundationNote}</Notice>
          <div className="grid gap-4 lg:grid-cols-2">
            <ToggleField
              label={labels.workflowApprovalDisposalRequired}
```

(23) Replace

```tsx
          <p className="text-sm text-muted-foreground">{labels.workflowApprovalSlaDaysHelp}</p>
          {hasInvalidWorkflowApproval ? <ValidationMessage message={labels.invalidWorkflowApproval} /> : null}
        </div>
      </div>
      ) : null}

      {activeTab === "automation" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.schedulerSettings} description={labels.schedulerSettingsDescription} />
        <div className="space-y-4 px-4 py-4">
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {labels.schedulerHeartbeatNote}
          </p>
          {hasInvalidSchedulerSchedule ? <ValidationMessage message={labels.invalidSchedulerSchedule} /> : null}
        </div>
      </div>
      ) : null}

      {activeTab === "governance" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.governanceSettings} description={labels.governanceSettingsDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">{labels.retentionPolicy}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{labels.retentionPolicyDescription}</p>
            </div>
            <a href={`/${locale}/admin/storage`} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-fit")}>
              {labels.openStorageGovernance}
            </a>
          </div>
```

with

```tsx
          <p className="text-sm text-muted-foreground">{labels.workflowApprovalSlaDaysHelp}</p>
          {hasInvalidWorkflowApproval ? <ValidationMessage message={labels.invalidWorkflowApproval} /> : null}
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "automation" ? (
      <ContentPanel divided title={labels.schedulerSettings} description={labels.schedulerSettingsDescription}>
        <div className="space-y-4">
          <Notice tone="neutral">{labels.schedulerHeartbeatNote}</Notice>
          {hasInvalidSchedulerSchedule ? <ValidationMessage message={labels.invalidSchedulerSchedule} /> : null}
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "governance" ? (
      <ContentPanel divided title={labels.governanceSettings} description={labels.governanceSettingsDescription}>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">{labels.retentionPolicy}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{labels.retentionPolicyDescription}</p>
            </div>
            <a href={`/${locale}/admin/storage`} className={cn(buttonVariants({ variant: "outline", size: "md" }), "w-full sm:w-fit")}>
              {labels.openStorageGovernance}
            </a>
          </div>
```

(24) Replace

```tsx
              />
            </Field>
          </div>
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {labels.retentionDaysHelp}
          </p>
          {hasInvalidRetentionPolicy ? <ValidationMessage message={labels.invalidRetentionPolicy} /> : null}
        </div>
      </div>
      ) : null}

      {activeTab === "ldap-login" ? (
      <div className="overflow-visible rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.ldapSettings} description={labels.ldapSettingsDescription} />
        <div className="space-y-6 px-4 py-4">
          <FormSection as="h3" number={1} title={labels.ldapStepConnection}>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <ToggleField
```

with

```tsx
              />
            </Field>
          </div>
          <Notice tone="neutral">{labels.retentionDaysHelp}</Notice>
          {hasInvalidRetentionPolicy ? <ValidationMessage message={labels.invalidRetentionPolicy} /> : null}
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "ldap-login" ? (
      <ContentPanel divided title={labels.ldapSettings} description={labels.ldapSettingsDescription}>
        <div className="space-y-6">
          <FormSection as="h3" number={1} title={labels.ldapStepConnection}>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <ToggleField
```

(25) Replace

```tsx
                />
                <p className="text-xs leading-relaxed text-muted-foreground">{labels.ldapDefaultRoleHelp}</p>
                {getValue("ldap_default_role") && !defaultRoleOptions.some((option) => option.id === getValue("ldap_default_role")) ? (
                  <p className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
                    {labels.ldapDefaultRoleMissing.replace("{role}", getValue("ldap_default_role"))}
                  </p>
                ) : null}
              </div>
            </div>
          </FormSection>
        </div>
      </div>
      ) : null}

      {activeTab === "ldap-sync" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SectionHeader title={labels.ldapSyncStrategy} description={labels.ldapSyncStrategyDescription} />
        <div className="space-y-6 px-4 py-4">
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {labels.ldapSyncRecommendation}
          </p>
          <FormSection as="h3" number={1} title={labels.ldapStepSyncStrategy}>
            <div className="grid gap-4 lg:grid-cols-2">
              <ToggleField
```

with

```tsx
                />
                <p className="text-xs leading-relaxed text-muted-foreground">{labels.ldapDefaultRoleHelp}</p>
                {getValue("ldap_default_role") && !defaultRoleOptions.some((option) => option.id === getValue("ldap_default_role")) ? (
                  <Notice tone="warning">{labels.ldapDefaultRoleMissing.replace("{role}", getValue("ldap_default_role"))}</Notice>
                ) : null}
              </div>
            </div>
          </FormSection>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "ldap-sync" ? (
      <ContentPanel divided title={labels.ldapSyncStrategy} description={labels.ldapSyncStrategyDescription}>
        <div className="space-y-6">
          <Notice tone="neutral">{labels.ldapSyncRecommendation}</Notice>
          <FormSection as="h3" number={1} title={labels.ldapStepSyncStrategy}>
            <div className="grid gap-4 lg:grid-cols-2">
              <ToggleField
```

(26) Replace

```tsx
            </Button>
          </div>
          {syncError ? (
            <div className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">
              <ApiErrorText error={syncError} />
            </div>
          ) : null}
          <SyncPreviewPanel labels={labels} preview={syncPreview} locale={locale} />
          </FormSection>
          <LdapSyncHistoryPanel labels={labels} history={ldapSyncHistory} locale={locale} />
        </div>
      </div>
      ) : null}

      {activeTab === "advanced" && generalSettings.length > 0 ? (
        <details className="overflow-hidden rounded-lg border border-warning-border bg-surface">
          <summary className="cursor-pointer list-none border-b border-warning-border bg-warning-soft px-4 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">{labels.advancedWarningTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{labels.advancedWarningDescription}</p>
              </div>
              <span className="text-sm font-medium text-warning">{labels.showAdvancedSettings}</span>
            </div>
          </summary>
          <SectionHeader title={labels.advancedSettings} description={labels.advancedSettingsDescription} />
          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr>
                  <Head>{labels.key}</Head>
                  <Head>{labels.value}</Head>
                  <Head>{labels.description}</Head>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {generalSettings.map((setting) => (
                  <tr key={setting.key} className="hover:bg-row-hover">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{setting.key}</td>
                    <td className="min-w-80 px-4 py-3">
                      <Field label={setting.key} hideLabel>
                        <Input
                          value={values[setting.key] ?? ""}
                          onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))}
                        />
                      </Field>
                    </td>
                    <td className="min-w-80 px-4 py-3 text-muted-foreground">{setting.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {changedCount > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <SectionHeader title={labels.changeReview} description={labels.changeReviewDescription} />
          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr>
                  <Head>{labels.key}</Head>
                  <Head>{labels.beforeValue}</Head>
                  <Head>{labels.afterValue}</Head>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {changedSettings.map((setting) => (
                  <tr key={setting.key} className="hover:bg-row-hover">
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openSettingGroup(getSystemSettingsTabForKey(setting.key))}
                        className={linkVariants({ size: "inherit" })}
                      >
                        {setting.key}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{labels.openSettingGroup}</span>
                      </button>
                    </td>
                    <td className="max-w-md break-words px-4 py-3 text-muted-foreground">
                      {formatReviewValue(setting.key, initialValues[setting.key])}
                    </td>
                    <td className="max-w-md break-words px-4 py-3 font-medium text-foreground">
                      {formatReviewValue(setting.key, effectiveValues[setting.key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <StickyFormFooter
```

with

```tsx
            </Button>
          </div>
          {syncError ? (
            <Notice tone="danger" role="alert">
              <ApiErrorText error={syncError} />
            </Notice>
          ) : null}
          <SyncPreviewPanel labels={labels} preview={syncPreview} locale={locale} />
          </FormSection>
          <LdapSyncHistoryPanel labels={labels} history={ldapSyncHistory} locale={locale} />
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "advanced" && generalSettings.length > 0 ? (
        <ContentPanel divided title={labels.advancedSettings} description={labels.advancedSettingsDescription}>
          <Notice tone="warning" title={labels.advancedWarningTitle}>
            {labels.advancedWarningDescription}
          </Notice>
          <details className="mt-4">
            <summary className={cn(linkVariants({ size: "inherit" }), "list-item cursor-pointer text-sm")}>{labels.showAdvancedSettings}</summary>
            <DataTable framed={false} className="mt-4" caption={labels.advancedSettings} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{labels.key}</DataTableHead>
                  <DataTableHead>{labels.value}</DataTableHead>
                  <DataTableHead>{labels.description}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {generalSettings.map((setting) => (
                  <DataTableRow key={setting.key}>
                    <DataTableCell className="whitespace-nowrap">
                      <span className="tag font-medium text-foreground">{setting.key}</span>
                    </DataTableCell>
                    <DataTableCell className="min-w-80">
                      <Field label={setting.key} hideLabel>
                        <Input
                          value={values[setting.key] ?? ""}
                          onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))}
                        />
                      </Field>
                    </DataTableCell>
                    <DataTableCell className="min-w-80 text-muted-foreground">{orNil(setting.description)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </details>
        </ContentPanel>
      ) : null}

      {changedCount > 0 ? (
        <ContentPanel divided flush className="overflow-hidden" title={labels.changeReview} description={labels.changeReviewDescription}>
          <DataTable framed={false} caption={labels.changeReview} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.key}</DataTableHead>
                <DataTableHead>{labels.beforeValue}</DataTableHead>
                <DataTableHead>{labels.afterValue}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {changedSettings.map((setting) => {
                const tab = getSystemSettingsTabForKey(setting.key)
                return (
                  <DataTableRow key={setting.key}>
                    <DataTableCell className="whitespace-nowrap">
                      {/* A link to the tab (Ctrl+click opens it); a plain click switches in place, like TabNav. */}
                      <Link
                        href={buildSystemSettingsTabHref(pathname, searchParams.toString(), tab)}
                        onNavigate={(event) => {
                          event.preventDefault()
                          openSettingGroup(tab)
                        }}
                        className={linkVariants({ size: "inherit" })}
                      >
                        <span className="tag">{setting.key}</span>
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{labels.openSettingGroup}</span>
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="max-w-md break-words text-muted-foreground">
                      {orNil(formatReviewValue(setting.key, initialValues[setting.key]))}
                    </DataTableCell>
                    <DataTableCell className="max-w-md break-words font-medium text-foreground">
                      {orNil(formatReviewValue(setting.key, effectiveValues[setting.key]))}
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>
        </ContentPanel>
      ) : null}

      <StickyFormFooter
```

(27) Replace

```tsx
  history: LdapSyncHistoryItem[]
  locale: string
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{labels.ldapSyncHistoryTitle}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{labels.ldapSyncHistoryDescription}</p>
        </div>
        <Link href={buildSystemLogFilterHref(locale, "ldap_sync")} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          <ExternalLink />
          {labels.ldapSyncHistoryViewAll}
        </Link>
      </div>

      {history.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
          {labels.ldapSyncHistoryEmpty}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {history.map((item) => (
            <article key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
```

with

```tsx
  history: LdapSyncHistoryItem[]
  locale: string
}) {
  // A quiet section under the numbered steps, not a box in the panel: a line above it, the runs as rows.
  return (
    <section aria-labelledby="ldap-sync-history-title" className="border-t border-border pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id="ldap-sync-history-title" className="text-sm font-semibold text-foreground">{labels.ldapSyncHistoryTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.ldapSyncHistoryDescription}</p>
        </div>
        <Link href={buildSystemLogFilterHref(locale, "ldap_sync")} className={cn(buttonVariants({ variant: "outline", size: "md" }), "w-full sm:w-auto")}>
          <ExternalLink />
          {labels.ldapSyncHistoryViewAll}
        </Link>
      </div>

      {history.length === 0 ? (
        <EmptyNote className="mt-4">{labels.ldapSyncHistoryEmpty}</EmptyNote>
      ) : (
        <ul className="mt-4 divide-y divide-border-soft">
          {history.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
```

(28) Replace

```tsx
                  <div className="mt-1 text-xs text-muted-foreground">
                    {labels.ldapSyncHistoryRunBy}: {item.actorLabel}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:w-[34rem]">
                  <MiniMetric label={labels.ldapSyncTotal} value={item.total} locale={locale} />
                  <MiniMetric label={labels.ldapSyncAppliedCreated} value={item.created} locale={locale} />
                  <MiniMetric label={labels.ldapSyncAppliedUpdated} value={item.updated} locale={locale} />
                  <MiniMetric label={labels.ldapSyncAppliedDeactivated} value={item.deactivated} locale={locale} />
                  <MiniMetric label={labels.ldapSyncAppliedUsersDeactivated} value={item.deactivatedUsers} locale={locale} />
                </div>
              </div>
              {item.blockerCount > 0 ? (
                <div className="mt-2 text-xs font-medium text-warning">
                  {labels.ldapSyncHistoryBlockers}: {formatHistoryNumber(item.blockerCount, locale)}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniMetric({ label, value, locale }: { label: string; value: number; locale: string }) {
  return (
    <div className="rounded-md border border-border px-2 py-2">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{formatHistoryNumber(value, locale)}</div>
    </div>
  )
}
```

with

```tsx
                  <div className="mt-1 text-xs text-muted-foreground">
                    {labels.ldapSyncHistoryRunBy}: {item.actorLabel}
                  </div>
                  {item.blockerCount > 0 ? (
                    <StatusBadge tone="warning" className="mt-2" label={`${labels.ldapSyncHistoryBlockers}: ${formatCount(item.blockerCount)}`} />
                  ) : null}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5 lg:w-[34rem]">
                  <HistoryCount label={labels.ldapSyncTotal} value={item.total} />
                  <HistoryCount label={labels.ldapSyncAppliedCreated} value={item.created} />
                  <HistoryCount label={labels.ldapSyncAppliedUpdated} value={item.updated} />
                  <HistoryCount label={labels.ldapSyncAppliedDeactivated} value={item.deactivated} />
                  <HistoryCount label={labels.ldapSyncAppliedUsersDeactivated} value={item.deactivatedUsers} />
                </dl>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// One count of a sync run: a label and a number, no frame (the run is a row of the list).
function HistoryCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-meta text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-foreground num">{formatCount(value)}</dd>
    </div>
  )
}
```

(29) Replace

```tsx
  }).format(new Date(value))
}

function formatHistoryNumber(value: number, locale: string) {
  return value.toLocaleString(getIntlLocale(locale))
}

function getIntlLocale(locale: string) {
  return locale === "en" ? "en-US" : "th-TH"
}
```

with

```tsx
  }).format(new Date(value))
}

function getIntlLocale(locale: string) {
  return locale === "en" ? "en-US" : "th-TH"
}
```

(30) Replace

```tsx
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{count}</span>
      </div>
      <div className="border-b border-border p-3">
        <SearchField aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={searchValue} onChange={(event) => onSearchChange(event.target.value)} />
```

with

```tsx
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <span className="text-meta text-muted-foreground num">{formatCount(count)}</span>
      </div>
      <div className="border-b border-border p-3">
        <SearchField aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={searchValue} onChange={(event) => onSearchChange(event.target.value)} />
```

(31) Replace

```tsx
        <span className="block truncate font-medium text-foreground">{category.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{category.code}</span>
      </span>
      {badge ? (
        <span className="shrink-0 rounded-full border border-warning-border bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
          {badge}
        </span>
      ) : null}
    </label>
  )
}

function EmptyTransferState({ label }: { label: string }) {
  return <div className="flex min-h-64 items-center justify-center px-4 text-center text-sm text-muted-foreground">{label}</div>
}

function ValidationMessage({ message }: { message: string }) {
  return (
    <p className="my-2 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
      {message}
    </p>
  )
}

```

with

```tsx
        <span className="block truncate font-medium text-foreground">{category.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{category.code}</span>
      </span>
      {badge ? <StatusBadge tone="warning" label={badge} /> : null}
    </label>
  )
}

// A rule the current values break, under the fields of its group (D7: an error is a danger Notice). No live region: it
// shows while the user types, and the save toast says the same.
function ValidationMessage({ message }: { message: string }) {
  return (
    <Notice tone="danger" className="my-2">
      {message}
    </Notice>
  )
}

```

(32) Replace

```tsx
  locale: string
}) {
  if (!preview) {
    return <p className="text-sm text-muted-foreground">{labels.ldapSyncNoPreview}</p>
  }
  const deactivationImpacts = (preview.deactivationImpacts ?? []).filter(
    (impact) => impact.activeAssetCount > 0 || impact.activeUserCount > 0
  )

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">{labels.ldapSyncPreviewTitle}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Metric label={labels.ldapSyncTotal} value={preview.total} />
        <Metric label={labels.ldapSyncCreates} value={preview.creates.length} />
        <Metric label={labels.ldapSyncUpdates} value={preview.updates.length} />
        <Metric label={labels.ldapSyncDeactivates} value={preview.deactivates.length} />
      </div>
      {preview.applied ? (
        <div className="mt-3 rounded-md border border-primary-border bg-primary-soft px-3 py-3">
          <div className="text-sm font-medium text-foreground">{labels.ldapSyncAppliedTitle}</div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
          <Metric label={labels.ldapSyncAppliedCreated} value={preview.applied.created} />
          <Metric label={labels.ldapSyncAppliedUpdated} value={preview.applied.updated} />
          <Metric label={labels.ldapSyncAppliedDeactivated} value={preview.applied.deactivated} />
          <Metric label={labels.ldapSyncAppliedUsersDeactivated} value={preview.applied.deactivatedUsers ?? 0} />
        </div>
      </div>
      ) : null}
      {preview.blockers.length > 0 ? (
        <div className="mt-3 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
          <div className="font-medium">{labels.ldapSyncBlockers}</div>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {preview.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.deactivates.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
          <div className="text-sm font-semibold text-amber-950">{labels.ldapSyncDeactivateImpactTitle}</div>
          <p className="mt-1 text-sm text-amber-900">{labels.ldapSyncDeactivateImpactDescription}</p>
          {deactivationImpacts.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {deactivationImpacts.map((impact) => (
                <div key={impact.employeeId} className="rounded-md border border-amber-200 bg-white px-3 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {impact.code} - {impact.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{impact.email ?? "-"}</div>
                    </div>
                    <a
                      href={`/${locale}/assets?custodianId=${encodeURIComponent(impact.employeeId)}&page=1`}
```

with

```tsx
  locale: string
}) {
  if (!preview) {
    return <EmptyNote>{labels.ldapSyncNoPreview}</EmptyNote>
  }
  const deactivationImpacts = (preview.deactivationImpacts ?? []).filter(
    (impact) => impact.activeAssetCount > 0 || impact.activeUserCount > 0
  )

  // The counts are StatStrips (no tone fill); what the user must deal with is a warning Notice; the impact list sits
  // after it, never inside it, because faint text never sits on a status fill.
  return (
    <div className="space-y-4">
      <section aria-labelledby="ldap-sync-preview-title" className="space-y-3">
        <h4 id="ldap-sync-preview-title" className="text-sm font-semibold text-foreground">{labels.ldapSyncPreviewTitle}</h4>
        <StatStrip
          items={[
            { key: "total", label: labels.ldapSyncTotal, value: formatCount(preview.total) },
            { key: "creates", label: labels.ldapSyncCreates, value: formatCount(preview.creates.length) },
            { key: "updates", label: labels.ldapSyncUpdates, value: formatCount(preview.updates.length) },
            { key: "deactivates", label: labels.ldapSyncDeactivates, value: formatCount(preview.deactivates.length) },
          ]}
        />
      </section>
      {preview.applied ? (
        <div className="space-y-3">
          <Notice tone="success" role="status" title={labels.ldapSyncAppliedTitle} />
          <StatStrip
            items={[
              { key: "created", label: labels.ldapSyncAppliedCreated, value: formatCount(preview.applied.created) },
              { key: "updated", label: labels.ldapSyncAppliedUpdated, value: formatCount(preview.applied.updated) },
              { key: "deactivated", label: labels.ldapSyncAppliedDeactivated, value: formatCount(preview.applied.deactivated) },
              { key: "deactivatedUsers", label: labels.ldapSyncAppliedUsersDeactivated, value: formatCount(preview.applied.deactivatedUsers ?? 0) },
            ]}
          />
        </div>
      ) : null}
      {preview.blockers.length > 0 ? (
        <Notice tone="warning" title={labels.ldapSyncBlockers}>
          <ul className="list-disc space-y-1 pl-5">
            {preview.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      {preview.deactivates.length > 0 ? (
        <div className="space-y-3">
          <Notice tone="warning" title={labels.ldapSyncDeactivateImpactTitle}>
            {labels.ldapSyncDeactivateImpactDescription}
          </Notice>
          {deactivationImpacts.length > 0 ? (
            <ul className="divide-y divide-border-soft">
              {deactivationImpacts.map((impact) => (
                <li key={impact.employeeId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        <span className="tag">{impact.code}</span> - {impact.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{orNil(impact.email)}</div>
                    </div>
                    <a
                      href={`/${locale}/assets?custodianId=${encodeURIComponent(impact.employeeId)}&page=1`}
```

(33) Replace

```tsx
                      {labels.ldapSyncOpenAssets}
                    </a>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Metric label={labels.ldapSyncDeactivateImpactAssets} value={impact.activeAssetCount} />
                    <Metric label={labels.ldapSyncDeactivateImpactUsers} value={impact.activeUserCount} />
                  </div>
                  {impact.assets.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {impact.assets.slice(0, 5).map((asset) => (
                        <span key={asset.id} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
                          {asset.assetTag} - {asset.name}
                        </span>
                      ))}
                      {impact.assets.length > 5 ? (
                        <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                          +{impact.assets.length - 5}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-amber-900">{labels.ldapSyncNoDeactivateImpact}</p>
          )}
        </div>
      ) : null}
```

with

```tsx
                      {labels.ldapSyncOpenAssets}
                    </a>
                  </div>
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "assets", label: labels.ldapSyncDeactivateImpactAssets, value: formatCount(impact.activeAssetCount) },
                      { key: "users", label: labels.ldapSyncDeactivateImpactUsers, value: formatCount(impact.activeUserCount) },
                    ]}
                  />
                  {impact.assets.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground">
                      {impact.assets.slice(0, 5).map((asset) => (
                        <li key={asset.id}>
                          <span className="tag">{asset.assetTag}</span> - {asset.name}
                        </li>
                      ))}
                      {impact.assets.length > 5 ? <li className="text-muted-foreground">+{formatCount(impact.assets.length - 5)}</li> : null}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote tone="clear">{labels.ldapSyncNoDeactivateImpact}</EmptyNote>
          )}
        </div>
      ) : null}
```

(34) Replace

```tsx
  )
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "blue" | "green" | "amber" | "slate" | "rose"
}) {
  const toneClass = {
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
  }[tone]

  return (
    <div className={`min-h-24 rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold leading-6">{value}</div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function LabelAssetNameModeField({
  label,
  description,
```

with

```tsx
  )
}

function LabelAssetNameModeField({
  label,
  description,
```

(35) Replace

```tsx
  const marginPx = config.marginMm * 4
  const gapPx = config.gapMm * 4
  const qr = (
    <div className="shrink-0 rounded-sm border border-slate-300 bg-white p-1">
      <QRCodeSVG value={qrValue} size={Math.min(config.qrSize, Math.max(28, heightPx - marginPx * 2 - 6))} level="M" includeMargin={false} />
    </div>
  )
```

with

```tsx
  const marginPx = config.marginMm * 4
  const gapPx = config.gapMm * 4
  const qr = (
    <div className="shrink-0 rounded-sm border border-control-border bg-surface p-1">
      <QRCodeSVG value={qrValue} size={Math.min(config.qrSize, Math.max(28, heightPx - marginPx * 2 - 6))} level="M" includeMargin={false} />
    </div>
  )
```

(36) Replace

```tsx
    <div className="min-w-0">
      <div className="truncate text-sm font-bold leading-tight">{lines[0] || values.assetTag}</div>
      {lines.slice(1).map((line) => (
        <div key={line} className="mt-1 truncate text-xs leading-tight text-slate-700">
          {line}
        </div>
      ))}
```

with

```tsx
    <div className="min-w-0">
      <div className="truncate text-sm font-bold leading-tight">{lines[0] || values.assetTag}</div>
      {lines.slice(1).map((line) => (
        <div key={line} className="mt-1 truncate text-xs leading-tight text-muted-foreground">
          {line}
        </div>
      ))}
```

(37) Replace

```tsx
      <div className="text-sm font-semibold text-foreground">{labels.labelPreview}</div>
      <div className="mt-3 w-full max-w-full overflow-x-auto overscroll-x-contain">
        <div
          className="overflow-hidden rounded border border-slate-300 bg-white text-slate-950 shadow-sm"
          style={{ width: widthPx, height: heightPx, padding: marginPx }}
        >
          <div
```

with

```tsx
      <div className="text-sm font-semibold text-foreground">{labels.labelPreview}</div>
      <div className="mt-3 w-full max-w-full overflow-x-auto overscroll-x-contain">
        <div
          className="overflow-hidden rounded border border-control-border bg-surface text-foreground shadow-sm"
          style={{ width: widthPx, height: heightPx, padding: marginPx }}
        >
          <div
```

(38) Replace

```tsx
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border px-4 py-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}

// The white 13/500 header of the shared DataTable (spec 2B §3.4, R-e), on this file's own px-4 cells.
function Head({ children }: { children: React.ReactNode }) {
  return <th className="bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground">{children}</th>
}
```

with

```tsx
    </div>
  )
}
```

- [ ] **Step 3: The tab label (R9).** Save `<temp>/p2d2-tab-documents.json`:

```json
{ "set": { "th": { "systemSettingsPage.tabDocuments": "เลขเอกสาร" }, "en": { "systemSettingsPage.tabDocuments": "Documents" } } }
```

Run: `node scripts/messages-edit.mjs <temp>/p2d2-tab-documents.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`. The overview label `systemSettingsPage.overviewDocuments` already reads "เลขเอกสาร" and does not change.

- [ ] **Step 4: The guard rows (R16).** In `tests/list-frame-guards.test.ts` (CRLF): LB1 keeps 1 with the new line in its comment, LV2 goes 8 → 1 (the separator default of the tag preview stays, R-n), and the LS1 row is deleted, in `BUDGETS` and `KEEP` alike:

(1) Replace

```ts
  },
  LB1: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the move-out button :1407, not a page back
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :496 for ArrowLeft
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
```

with

```ts
  },
  LB1: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the move-out button :1413, not a page back
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :496 for ArrowLeft
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
```

(2) Replace

```ts
  },
  LV2: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
```

with

```ts
  },
  LV2: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
```

(3) Replace

```ts
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // → 1 (KEEP): print page, 2D (A/08:305)
  },
  LS1: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): Metric :2408 (2D)
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :598 in the dialog (2C plan 3)
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
```

with

```ts
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // → 1 (KEEP): print page, 2D (A/08:305)
  },
  LS1: {
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :598 in the dialog (2C plan 3)
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
```

(4) Replace

```ts
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header, its own variant
  },
  LB1: {
    [`${C}admin/system-settings-form.tsx`]: 1, // the move-out button :1407, not a page back
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // back to editing in the review step :93 (2C)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}assets/asset-label-print.tsx`]: 1, // print page
```

with

```ts
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header, its own variant
  },
  LB1: {
    [`${C}admin/system-settings-form.tsx`]: 1, // the move-out button :1413, not a page back
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // back to editing in the review step :93 (2C)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}assets/asset-label-print.tsx`]: 1, // print page
```

(5) Replace

```ts
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1204, :1206 and the history sentence :2454 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 8, // 2C form (2D)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
```

with

```ts
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1204, :1206 and the history sentence :2454 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
```

(6) Replace

```ts
  LS1: {
    [`${C}admin/IntegrationClientManager.tsx`]: 2, // OperationMetric :759, SummaryCard :778 (2C plan 4)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :407 (2C plan 4)
    [`${C}admin/system-settings-form.tsx`]: 1, // Metric :2408 (2D)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
  LK1: {
```

with

```ts
  LS1: {
    [`${C}admin/IntegrationClientManager.tsx`]: 2, // OperationMetric :759, SummaryCard :778 (2C plan 4)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :407 (2C plan 4)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
  LK1: {
```

- [ ] **Step 5: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/accessible-dialog.test.ts tests/asset-label-print-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/field-primitives.test.ts tests/form-frames-ui.test.ts tests/pm-generation-removed.test.ts tests/settings-depreciation-policy-ui.test.ts tests/settings-ldap-role-ui.test.ts tests/settings-tab-persistence-ui.test.ts tests/steps-ui.test.ts tests/sticky-form-footer-ui.test.ts tests/system-log-history.test.ts tests/thai-glossary.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (155 tests).
  - Run `node <temp>/eol.mjs src/components/admin/system-settings-form.tsx messages/th.json messages/en.json tests/admin-sweep-ui.test.ts tests/asset-label-print-ui.test.ts tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/settings-ldap-role-ui.test.ts tests/steps-ui.test.ts`. Expected: equal numbers for `src/components/admin/system-settings-form.tsx`, `messages/th.json`, `messages/en.json`, `tests/asset-label-print-ui.test.ts`, `tests/form-frames-ui.test.ts`, `tests/list-frame-guards.test.ts`, `tests/steps-ui.test.ts`; `0 <n>` for `tests/admin-sweep-ui.test.ts`, `tests/settings-ldap-role-ui.test.ts` (LF).
  - Run `npm test` (2027 tests, 2026 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.
  - Run `git diff --stat`. `messages/*.json` show 1 line each.

- [ ] **Step 6: Commit.**

```bash
git add src/components/admin/system-settings-form.tsx messages/th.json messages/en.json tests/admin-sweep-ui.test.ts tests/asset-label-print-ui.test.ts tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/settings-ldap-role-ui.test.ts tests/steps-ui.test.ts
git commit -m "refactor(ui): the settings form on ContentPanel, Notice, DataTable, KeyValueList, StatStrip and tag, and a shorter documents tab so the tab row fits at 1440 (2D-2 task 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The depreciation policy builder (`c/admin/depreciation-policy-builder.tsx`, R13)

Spec D7, D9, M21. One commit. The builder sits inside the settings organization panel, so its own frame goes (a frame in a frame, R4): it keeps a top line and 20px above. Its method and start-basis facts and its 4-number preview are `KeyValueList`s (the local `ReadonlyFact` and `PreviewMetric` are deleted); "no groups" and the empty picker are `EmptyNote`s; the legacy rules note is a warning `Notice` with a title.

**Files:**
- Modify: `src/components/admin/depreciation-policy-builder.tsx`
- Modify (pins): `tests/choice-controls-ui.test.ts`, `tests/form-frames-ui.test.ts`
- Modify: `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing tests.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("the depreciation builder has no frame of its own in the settings panel, and its facts and preview are KeyValueLists (spec 2D D7, D9)", () => {
  const source = read(`${C}admin/depreciation-policy-builder.tsx`)
  assert.match(source, /<div className="space-y-5 border-t border-border pt-5">/)
  assert.doesNotMatch(source, /function (?:ReadonlyFact|PreviewMetric)\b|space-y-5 rounded-md|bg-warning-soft|min-h-\[66px\]|<p className="px-2 py-3/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the method facts and the preview")
  assert.match(source, /<Notice tone="warning" title=\{labels\.depreciationLegacyRules\}>/)
  assert.match(source, /<EmptyNote className="px-2 py-3">\{emptyLabel\}<\/EmptyNote>/)
})
```

In `tests/choice-controls-ui.test.ts` (CRLF):

Replace

```ts
test("the depreciation groups are radio chips in a group named by its heading (T6, 1f)", () => {
  const source = read("src/components/admin/depreciation-policy-builder.tsx")
  assert.match(source, /<h3 id=\{groupsHeadingId\} className="text-base font-semibold text-foreground">\{labels\.depreciationPolicyGroups\}<\/h3>/)
  // The "no groups" line sits outside the radio group, so an empty group never gets a role.
  assert.match(source, /state\.groups\.length === 0 \? \(\s*<p className="text-sm text-muted-foreground">\{labels\.depreciationNoGroups\}<\/p>\s*\) : \(\s*<div role="radiogroup" aria-labelledby=\{groupsHeadingId\} className="flex flex-wrap gap-2">/)
  assert.match(
    source,
    /<ChoiceChip\s+key=\{group\.id\}\s+type="radio"\s+name=\{groupRadioName\}\s+checked=\{activeGroup\?\.id === group\.id\}\s+disabled=\{!isPolicyJsonValid\}\s+onChange=\{\(\) => setActiveGroupId\(group\.id\)\}\s+label=\{group\.name\}\s+detail=\{<span className="num">\{group\.categoryIds\.length\} \/ \{categories\.length\}<\/span>\}\s+\/>/,
```

with

```ts
test("the depreciation groups are radio chips in a group named by its heading (T6, 1f)", () => {
  const source = read("src/components/admin/depreciation-policy-builder.tsx")
  assert.match(source, /<h3 id=\{groupsHeadingId\} className="text-base font-semibold text-foreground">\{labels\.depreciationPolicyGroups\}<\/h3>/)
  // The "no groups" line (the shared EmptyNote since plan 2D-2) sits outside the radio group, so an empty group never gets a role.
  assert.match(source, /state\.groups\.length === 0 \? \(\s*<EmptyNote>\{labels\.depreciationNoGroups\}<\/EmptyNote>\s*\) : \(\s*<div role="radiogroup" aria-labelledby=\{groupsHeadingId\} className="flex flex-wrap gap-2">/)
  assert.match(
    source,
    /<ChoiceChip\s+key=\{group\.id\}\s+type="radio"\s+name=\{groupRadioName\}\s+checked=\{activeGroup\?\.id === group\.id\}\s+disabled=\{!isPolicyJsonValid\}\s+onChange=\{\(\) => setActiveGroupId\(group\.id\)\}\s+label=\{group\.name\}\s+detail=\{<span className="num">\{group\.categoryIds\.length\} \/ \{categories\.length\}<\/span>\}\s+\/>/,
```

In `tests/form-frames-ui.test.ts` (CRLF), the preview values are `KeyValueList` items now:

Replace

```ts
test("the depreciation builder formats its preview with the shared th-TH helpers (2B-1 task 24, R-f)", () => {
  const source = read(`${C}admin/depreciation-policy-builder.tsx`)
  assert.ok(source.includes('import { formatCount, formatMoney } from "@/lib/display-format"'), "depreciation-policy-builder.tsx imports the shared helpers")
  assert.match(source, /value=\{formatCount\(preview\.ageMonths\)\}/)
  assert.equal(source.match(/value=\{formatMoney\(preview\.\w+\)\}/g)?.length, 3)
  assert.doesNotMatch(source, /function formatMoney\b|toLocaleString/, "no local formatter is left")
})
```

with

```ts
test("the depreciation builder formats its preview with the shared th-TH helpers (2B-1 task 24, R-f)", () => {
  const source = read(`${C}admin/depreciation-policy-builder.tsx`)
  assert.ok(source.includes('import { formatCount, formatMoney } from "@/lib/display-format"'), "depreciation-policy-builder.tsx imports the shared helpers")
  // The preview is a KeyValueList since plan 2D-2, so the values are item fields.
  assert.match(source, /value: formatCount\(preview\.ageMonths\) \}/)
  assert.equal(source.match(/value: formatMoney\(preview\.\w+\) \}/g)?.length, 3)
  assert.doesNotMatch(source, /function formatMoney\b|toLocaleString/, "no local formatter is left")
})
```

Run: `node --test tests/admin-sweep-ui.test.ts tests/choice-controls-ui.test.ts tests/form-frames-ui.test.ts`
Expected: 3 failures:
- "the depreciation builder has no frame of its own in the settings panel, and its facts and preview are KeyValueLists (spec 2D D7, D9)"
- "the depreciation builder formats its preview with the shared th-TH helpers (2B-1 task 24, R-f)"
- "the depreciation groups are radio chips in a group named by its heading (T6, 1f)"

- [ ] **Step 2: The builder.** In `src/components/admin/depreciation-policy-builder.tsx` (CRLF):

(1) Replace

```tsx
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-card"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { SearchField } from "@/components/ui/search-field"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
```

with

```tsx
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { SearchField } from "@/components/ui/search-field"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
```

(2) Replace

```tsx
    setSelectedAssignedIds([])
  }

  return (
    <div className="space-y-5 rounded-md border border-border bg-surface p-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPolicyBuilderTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPolicyBuilderDescription}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ReadonlyFact label={labels.depreciationMethod} value={labels.depreciationMethodStraightLine} />
        <ReadonlyFact label={labels.depreciationStartBasis} value={labels.depreciationStartBasisPurchaseDate} />
        <Field label={labels.depreciationDefaultUsefulLifeMonths}>
          <Input
            type="number"
```

with

```tsx
    setSelectedAssignedIds([])
  }

  // The builder sits in the organization panel: a line above it instead of a frame in the frame (D9).
  return (
    <div className="space-y-5 border-t border-border pt-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPolicyBuilderTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPolicyBuilderDescription}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <KeyValueList
          className="md:col-span-2"
          items={[
            { key: "method", label: labels.depreciationMethod, value: labels.depreciationMethodStraightLine },
            { key: "startBasis", label: labels.depreciationStartBasis, value: labels.depreciationStartBasisPurchaseDate },
          ]}
        />
        <Field label={labels.depreciationDefaultUsefulLifeMonths}>
          <Input
            type="number"
```

(3) Replace

```tsx
          </Button>
        </div>
        {state.groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.depreciationNoGroups}</p>
        ) : (
          <div role="radiogroup" aria-labelledby={groupsHeadingId} className="flex flex-wrap gap-2">
            {state.groups.map((group) => (
```

with

```tsx
          </Button>
        </div>
        {state.groups.length === 0 ? (
          <EmptyNote>{labels.depreciationNoGroups}</EmptyNote>
        ) : (
          <div role="radiogroup" aria-labelledby={groupsHeadingId} className="flex flex-wrap gap-2">
            {state.groups.map((group) => (
```

(4) Replace

```tsx
      <div className="rounded-md border border-border bg-background p-4">
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPreviewTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPreviewDescription}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label={labels.depreciationPreviewPurchasePrice}>
            <Input fieldSize="md" type="text" inputMode="decimal" value={formatPurchasePriceInput(previewPurchasePrice)} onChange={(event) => setPreviewPurchasePrice(sanitizePurchasePriceInput(event.target.value))} />
          </Field>
          <Field label={labels.depreciationPreviewPurchaseDate}>
            <Input fieldSize="md" type="date" value={previewPurchaseDate} onChange={(event) => setPreviewPurchaseDate(event.target.value)} />
          </Field>
          <PreviewMetric label={labels.depreciationPreviewMonthly} value={formatMoney(preview.monthlyDepreciation)} />
          <PreviewMetric label={labels.depreciationPreviewNetBook} value={formatMoney(preview.netBookValue)} />
          <PreviewMetric label={labels.depreciationPreviewAccumulated} value={formatMoney(preview.accumulatedDepreciation)} />
          <PreviewMetric label={labels.depreciationPreviewAgeMonths} value={formatCount(preview.ageMonths)} />
        </div>
      </div>

      {state.legacyRules.length > 0 ? (
        <div className="rounded-md border border-warning-border bg-warning-soft p-3">
          <h3 className="text-sm font-semibold text-foreground">{labels.depreciationLegacyRules}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationLegacyRulesHelp}</p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {state.legacyRules.map((rule) => (
              <li key={`${rule.match}-${rule.usefulLifeMonths}`}>{rule.match}: {rule.usefulLifeMonths} months</li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="rounded-md border border-border bg-background p-4">
```

with

```tsx
      <div className="rounded-md border border-border bg-background p-4">
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPreviewTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPreviewDescription}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label={labels.depreciationPreviewPurchasePrice}>
            <Input fieldSize="md" type="text" inputMode="decimal" value={formatPurchasePriceInput(previewPurchasePrice)} onChange={(event) => setPreviewPurchasePrice(sanitizePurchasePriceInput(event.target.value))} />
          </Field>
          <Field label={labels.depreciationPreviewPurchaseDate}>
            <Input fieldSize="md" type="date" value={previewPurchaseDate} onChange={(event) => setPreviewPurchaseDate(event.target.value)} />
          </Field>
        </div>
        <KeyValueList
          className="mt-4"
          items={[
            { key: "monthly", label: labels.depreciationPreviewMonthly, value: formatMoney(preview.monthlyDepreciation) },
            { key: "netBook", label: labels.depreciationPreviewNetBook, value: formatMoney(preview.netBookValue) },
            { key: "accumulated", label: labels.depreciationPreviewAccumulated, value: formatMoney(preview.accumulatedDepreciation) },
            { key: "ageMonths", label: labels.depreciationPreviewAgeMonths, value: formatCount(preview.ageMonths) },
          ]}
        />
      </div>

      {state.legacyRules.length > 0 ? (
        <Notice tone="warning" title={labels.depreciationLegacyRules}>
          <p>{labels.depreciationLegacyRulesHelp}</p>
          <ul className="mt-2 list-inside list-disc">
            {state.legacyRules.map((rule) => (
              <li key={`${rule.match}-${rule.usefulLifeMonths}`}>{rule.match}: {rule.usefulLifeMonths} months</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <details className="rounded-md border border-border bg-background p-4">
```

(5) Replace

```tsx
  )
}

function ReadonlyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[66px] rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  )
}

function CategoryPicker({
  title,
  categories,
```

with

```tsx
  )
}

function CategoryPicker({
  title,
  categories,
```

(6) Replace

```tsx
        </div>
      ) : null}
      <div className="max-h-72 space-y-1 overflow-y-auto p-2">
        {categories.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p> : null}
        {categories.map((category) => {
          const isSelected = selectedIds.includes(category.id)
          const isConflict = assignedByOtherGroup.has(category.id)
```

with

```tsx
        </div>
      ) : null}
      <div className="max-h-72 space-y-1 overflow-y-auto p-2">
        {categories.length === 0 ? <EmptyNote className="px-2 py-3">{emptyLabel}</EmptyNote> : null}
        {categories.map((category) => {
          const isSelected = selectedIds.includes(category.id)
          const isConflict = assignedByOtherGroup.has(category.id)
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/choice-controls-ui.test.ts tests/form-frames-ui.test.ts tests/settings-depreciation-policy-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (106 tests).
  - Run `node <temp>/eol.mjs src/components/admin/depreciation-policy-builder.tsx tests/admin-sweep-ui.test.ts tests/choice-controls-ui.test.ts tests/form-frames-ui.test.ts`. Expected: equal numbers for `src/components/admin/depreciation-policy-builder.tsx`, `tests/choice-controls-ui.test.ts`, `tests/form-frames-ui.test.ts`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2028 tests, 2027 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/admin/depreciation-policy-builder.tsx tests/admin-sweep-ui.test.ts tests/choice-controls-ui.test.ts tests/form-frames-ui.test.ts
git commit -m "refactor(ui): the depreciation builder has no frame of its own and shows its facts and preview as KeyValueLists (2D-2 task 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The integration client manager (`c/admin/IntegrationClientManager.tsx`, M27, R12)

Spec D7, D9, M14, M22, M27, M29, M33; 2D-1 R3 (`:844`). One commit.

**What changes:**
- **Summary:** `OperationMetric` and `SummaryCard` (LFG LS1) become one `StatStrip`; the 7-day cell is labelled "การใช้งาน" with "7 วัน" as its foot (R12).
- **Token panel:** a `ContentPanel divided` with a warning `Notice`. The token stays `font-mono break-all` (R3), the copy button is an outline `Button`, and the copy results are success/danger `Notice`s with `role="status"`. The acknowledgement label is unchanged, and "close" is a `Button` disabled until acknowledged.
- **Page error:** `Notice tone="danger" role="alert"`.
- **Create form and list:** each is a `ContentPanel divided` (the list `flush`). The list's loading state is a spinner span with `role="status"` and an `sr-only` label (FMG LOADER2 keeps this one). The example feedback is a `Notice`, the empty list an `ActionEmptyState`, and the table a `DataTable` (min width 1040px).
- **Row:** the client id is a `tag`; the local `StatusBadge` (LFG LN2) is the shared one (success/muted); the error count above 0 and the latest error are danger `StatusBadge`s, and the route keeps `font-mono` (R3). The scopes are `Chip`s with a `tag` inside. "Copy PowerShell" is an outline `sm` `Button`.
- **Row buttons:** the edit, rotate and enable/disable buttons are default `Button`s (36px from md, 44px below; 2D-1 R3 hand-on). Rotate is `busy={busy}` (FMG LOADER2 2 → 1), and disable is `danger`.
- `formatCount(` count: 7.

**Files:**
- Modify: `src/components/admin/IntegrationClientManager.tsx`
- Modify (pins): `tests/integration-api-client-admin.test.ts`
- Modify (guards): `tests/list-frame-guards.test.ts`, `tests/form-migration-guards.test.ts`
- Modify: `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing tests.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("the integration client manager: StatStrip, ContentPanel, DataTable, shared badges and chips, and default Buttons in the row (spec 2D M27)", () => {
  const source = read(`${C}admin/IntegrationClientManager.tsx`)
  assert.doesNotMatch(source, /<button\b|disabled:opacity|text-white|rounded-full|border-dashed|<table\b|<thead\b|function (?:SummaryCard|OperationMetric|StatusBadge)\b|bg-(?:success|danger|warning)-soft|h-10 min-h-11/)
  assert.match(source, /<StatStrip\n\s+items=\{\[/)
  assert.match(source, /<ContentPanel divided title=\{labels\.tokenPanelTitle\}>\n\s+<div className="space-y-4">\n\s+<Notice tone="warning">\{labels\.tokenPanelWarning\}<\/Notice>/)
  assert.match(source, /<Notice tone=\{copyFeedback\.tone === "success" \? "success" : "danger"\} role="status">/)
  assert.match(source, /<ContentPanel divided title=\{labels\.createTitle\}>/)
  assert.match(source, /<ActionEmptyState title=\{labels\.emptyTitle\} description=\{labels\.emptyDescription\} \/>/)
  assert.match(source, /<StatusBadge label=\{enabled \? labels\.active : labels\.disabled\} tone=\{enabled \? "success" : "muted"\} \/>/)
  assert.match(source, /<Chip>\n\s+<span className="tag">\{scope\}<\/span>\n\s+<\/Chip>/)
  assert.equal(source.match(/<span className="tag">\{client\.(?:clientId|tokenPreview)\}<\/span>/g)?.length, 4, "the id and the token preview in the row and the phone card")
  assert.match(source, /<Button variant="outline" busy=\{busy\} onClick=\{onRotate\}>/, "R3 hand-on: the rotate button is the shared busy Button")
  assert.match(source, /<Button variant="danger" onClick=\{onDisable\} disabled=\{busy\}>/)
  assert.match(source, /<Button onClick=\{dismissToken\} disabled=\{!tokenAcknowledgement\}>/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{\(\) => onCopyPowerShell\(example\)\} className="w-fit">/)
  assert.equal(source.match(/<Loader2\b/g)?.length, 1, "only the loading status of the list head (I27)")
})
```

In `tests/integration-api-client-admin.test.ts` (CRLF):

(1) Replace

```ts

// Phase 2C batch 4 (spec 2C §8.9, §5.5 row 2, K10, §4.3, §4.12, §6.4.1; 2B spec R-e, R-f): the edit dialog on the dialog
// parts with the X named "ปิด", its save error shown inside it, the fields on Field, and the edit trigger on Button.
// The one-time token panel is pinned by the tests above and does not change.
test("integration client manager: the edit dialog uses the dialog parts and shows its own error, and the fields use Field (2C batch 4)", () => {
  const source = readRequiredFile("src/components/admin/IntegrationClientManager.tsx").replace(/\r\n/g, "\n")

  assert.doesNotMatch(source, /closeLabel=|flex-col-reverse|<select|<textarea|mb-2 text-sm font-medium|rounded border-border|font-normal|toLocaleString\(|bg-muted\//)
  assert.match(source, /description=\{editingClient \? <span className="tag">\{editingClient\.clientId\}<\/span> : undefined\}/)
  assert.match(source, /<form onSubmit=\{updateEditingClient\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="grid gap-4">\n\s+\{error \? \(\n\s+<Notice tone="danger" role="alert">\n\s+\{labels\.error\}: \{error\}\n\s+<\/Notice>/)
  assert.match(source, /\{error && !editingClient \? \(\n\s+<div className="rounded-md border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="alert">/, "the page box waits until the dialog is closed")
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{updatingClient\} disabled=\{editScopes\.length === 0\}>\n\s+<Pencil aria-hidden="true" \/>\n\s+\{labels\.saveScopes\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.equal(source.match(/<Field label=\{labels\.(?:clientId|displayName)\} required>\n\s+<Input\n/g)?.length, 3)
  assert.match(source, /required\n\s+minLength=\{3\}\n\s+maxLength=\{100\}\n\s+pattern="\[A-Za-z0-9\._:-\]\+"\n/, "the client id keeps every browser check")
```

with

```ts

// Phase 2C batch 4 (spec 2C §8.9, §5.5 row 2, K10, §4.3, §4.12, §6.4.1; 2B spec R-e, R-f): the edit dialog on the dialog
// parts with the X named "ปิด", its save error shown inside it, the fields on Field, and the edit trigger on Button.
// Plan 2D-2 moved the rest onto the shared parts: the page error is a danger Notice, the client list a DataTable and the
// copy button a Button (tests/admin-sweep-ui.test.ts pins the rest of that sweep).
test("integration client manager: the edit dialog uses the dialog parts and shows its own error, and the fields use Field (2C batch 4)", () => {
  const source = readRequiredFile("src/components/admin/IntegrationClientManager.tsx").replace(/\r\n/g, "\n")

  assert.doesNotMatch(source, /closeLabel=|flex-col-reverse|<select|<textarea|mb-2 text-sm font-medium|rounded border-border|font-normal|toLocaleString\(|bg-muted\//)
  assert.match(source, /description=\{editingClient \? <span className="tag">\{editingClient\.clientId\}<\/span> : undefined\}/)
  assert.match(source, /<form onSubmit=\{updateEditingClient\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="grid gap-4">\n\s+\{error \? \(\n\s+<Notice tone="danger" role="alert">\n\s+\{labels\.error\}: \{error\}\n\s+<\/Notice>/)
  assert.match(source, /\{error && !editingClient \? \(\n\s+<Notice tone="danger" role="alert">/, "the page box waits until the dialog is closed")
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{updatingClient\} disabled=\{editScopes\.length === 0\}>\n\s+<Pencil aria-hidden="true" \/>\n\s+\{labels\.saveScopes\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.equal(source.match(/<Field label=\{labels\.(?:clientId|displayName)\} required>\n\s+<Input\n/g)?.length, 3)
  assert.match(source, /required\n\s+minLength=\{3\}\n\s+maxLength=\{100\}\n\s+pattern="\[A-Za-z0-9\._:-\]\+"\n/, "the client id keeps every browser check")
```

(2) Replace

```ts
  assert.match(source, /<Button type="submit" busy=\{saving\} className="w-fit">\n\s+<Plus aria-hidden="true" \/>\n\s+\{labels\.createClient\}/)
  assert.match(source, /<Button variant="outline" onClick=\{onEdit\} disabled=\{busy\}>\n\s+<Pencil aria-hidden="true" \/>\n\s+\{labels\.editScopes\}/)
  assert.match(source, /<Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" \/>/)
  assert.match(source, /<thead className="border-b border-border bg-surface text-meta text-faint-foreground">/)
  assert.equal(source.match(/formatCount\(/g)?.length, 3)
  assert.match(source, /<button\n\s+type="button"\n\s+onClick=\{copyToken\}\n/, "the one-time token keeps its copy button")
})
```

with

```ts
  assert.match(source, /<Button type="submit" busy=\{saving\} className="w-fit">\n\s+<Plus aria-hidden="true" \/>\n\s+\{labels\.createClient\}/)
  assert.match(source, /<Button variant="outline" onClick=\{onEdit\} disabled=\{busy\}>\n\s+<Pencil aria-hidden="true" \/>\n\s+\{labels\.editScopes\}/)
  assert.match(source, /<Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" \/>/)
  assert.match(source, /<DataTable framed=\{false\} caption=\{labels\.clientsTitle\} minWidth=\{1040\} className="hidden md:block">/)
  assert.equal(source.match(/formatCount\(/g)?.length, 7, "the four summary cells, the row's three counts (twice for errors) and the top endpoint")
  assert.match(source, /<Button variant="outline" onClick=\{copyToken\}>\n\s+<Copy aria-hidden="true" \/>\n\s+\{labels\.copyToken\}/, "the one-time token keeps its copy button")
})
```

Run: `node --test tests/admin-sweep-ui.test.ts tests/integration-api-client-admin.test.ts`
Expected: 2 failures:
- "the integration client manager: StatStrip, ContentPanel, DataTable, shared badges and chips, and default Buttons in the row (spec 2D M27)"
- "integration client manager: the edit dialog uses the dialog parts and shows its own error, and the fields use Field (2C batch 4)"

- [ ] **Step 2: The manager.** In `src/components/admin/IntegrationClientManager.tsx` (CRLF):

(1) Replace

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Copy, KeyRound, Loader2, Pencil, Plus, RotateCw, ShieldOff } from "lucide-react"
import {
  buildIntegrationPowerShellExamples,
  type IntegrationClientOperationSummary,
```

with

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Loader2, Pencil, Plus, RotateCw } from "lucide-react"
import {
  buildIntegrationPowerShellExamples,
  type IntegrationClientOperationSummary,
```

(2) Replace

```tsx
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

```

with

```tsx
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

```

(3) Replace

```tsx

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label={labels.summaryActive} value={summary.active} tone="success" />
        <SummaryCard icon={<ShieldOff className="h-5 w-5" />} label={labels.summaryDisabled} value={summary.disabled} tone="muted" />
        <SummaryCard icon={<KeyRound className="h-5 w-5" />} label={labels.summaryLastUsed} value={summary.lastUsed} tone="primary" />
        <SummaryCard icon={<Copy className="h-5 w-5" />} label={labels.requests7d} value={summary.requests7d} tone="primary" />
      </section>

      {oneTimeToken ? (
        <section className="rounded-lg border border-warning-border bg-warning-soft p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h2 className="font-semibold text-foreground">{labels.tokenPanelTitle}</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{labels.tokenPanelWarning}</p>
              <div className="mt-3 rounded-md border border-border bg-surface p-3 font-mono text-sm text-foreground">
                <div className="text-xs font-sans text-muted-foreground">{oneTimeToken.clientId}</div>
                <div className="mt-1 break-all">{oneTimeToken.token}</div>
              </div>
            </div>
            <div className="flex w-fit flex-col gap-2">
              <button
                type="button"
                onClick={copyToken}
                className="inline-flex h-10 min-h-11 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Copy className="h-4 w-4" />
                {labels.copyToken}
              </button>
              {copyFeedback ? (
                <div
                  role="status"
                  className={`rounded-md px-3 py-2 text-sm ${
                    copyFeedback.tone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                  }`}
                >
                  {copyFeedback.message}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-warning-border pt-4 md:flex-row md:items-center md:justify-between">
            <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={tokenAcknowledgement}
                onChange={(event) => setTokenAcknowledgement(event.target.checked)}
                className={cn(checkboxVariants(), "mt-0.5")}
              />
              <span>{labels.tokenAcknowledgement}</span>
            </label>
            <button
              type="button"
              onClick={dismissToken}
              disabled={!tokenAcknowledgement}
              className="inline-flex h-10 min-h-11 w-fit items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.dismissToken}
            </button>
          </div>
        </section>
      ) : null}

      {error && !editingClient ? (
        <div className="rounded-md border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="alert">
          {labels.error}: {error}
        </div>
      ) : null}

      <AccessibleDialog
```

with

```tsx

  return (
    <div className="space-y-4">
      {/* The 7-day count reads "การใช้งาน" with "7 วัน" as its foot: "7 วัน" alone would not say what is counted. */}
      <StatStrip
        items={[
          { key: "active", label: labels.summaryActive, value: formatCount(summary.active) },
          { key: "disabled", label: labels.summaryDisabled, value: formatCount(summary.disabled) },
          { key: "lastUsed", label: labels.summaryLastUsed, value: formatCount(summary.lastUsed) },
          { key: "requests7d", label: labels.operations, value: formatCount(summary.requests7d), foot: labels.requests7d },
        ]}
      />

      {/* The token panel (R15): a panel with a warning Notice, not a warning box around controls, so the copy result
          (success inline, an error as its own box) never sits in a box in a box. */}
      {oneTimeToken ? (
        <ContentPanel divided title={labels.tokenPanelTitle}>
          <div className="space-y-4">
            <Notice tone="warning">{labels.tokenPanelWarning}</Notice>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground"><span className="tag">{oneTimeToken.clientId}</span></div>
              {/* The token is long and must wrap, so it keeps font-mono and is not a tag (R3). */}
              <div className="mt-1 break-all font-mono text-sm text-foreground">{oneTimeToken.token}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={copyToken}>
                <Copy aria-hidden="true" />
                {labels.copyToken}
              </Button>
              {copyFeedback ? (
                <Notice tone={copyFeedback.tone === "success" ? "success" : "danger"} role="status">
                  {copyFeedback.message}
                </Notice>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 border-t border-border-soft pt-4 md:flex-row md:items-center md:justify-between">
              <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={tokenAcknowledgement}
                  onChange={(event) => setTokenAcknowledgement(event.target.checked)}
                  className={cn(checkboxVariants(), "mt-0.5")}
                />
                <span>{labels.tokenAcknowledgement}</span>
              </label>
              <Button onClick={dismissToken} disabled={!tokenAcknowledgement}>
                {labels.dismissToken}
              </Button>
            </div>
          </div>
        </ContentPanel>
      ) : null}

      {error && !editingClient ? (
        <Notice tone="danger" role="alert">
          {labels.error}: {error}
        </Notice>
      ) : null}

      <AccessibleDialog
```

(4) Replace

```tsx
        ) : null}
      </AccessibleDialog>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">{labels.createTitle}</h2>
        </div>
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onSubmit={createClient}>
          <Field label={labels.clientId} required>
            <Input
```

with

```tsx
        ) : null}
      </AccessibleDialog>

      <ContentPanel divided title={labels.createTitle}>
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onSubmit={createClient}>
          <Field label={labels.clientId} required>
            <Input
```

(5) Replace

```tsx
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground">{labels.clientsTitle}</h2>
            {exampleCopyFeedback ? (
              <div
                role="status"
                className={`mt-1 text-sm ${
                  exampleCopyFeedback.tone === "success" ? "text-success" : "text-danger"
                }`}
              >
                {exampleCopyFeedback.message}
              </div>
            ) : null}
          </div>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" /> : null}
        </div>
        {loading ? (
          <div className="grid gap-2 p-4">
            {[0, 1, 2].map((item) => (
```

with

```tsx
            </Button>
          </div>
        </form>
      </ContentPanel>

      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={labels.clientsTitle}
        actions={
          loading ? (
            <span role="status" className="inline-flex">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" />
              <span className="sr-only">{labels.loading}</span>
            </span>
          ) : null
        }
      >
        {exampleCopyFeedback ? (
          <Notice tone={exampleCopyFeedback.tone === "success" ? "success" : "danger"} role="status" className="mx-4 mt-3 md:mx-5">
            {exampleCopyFeedback.message}
          </Notice>
        ) : null}
        {loading ? (
          <div className="grid gap-2 p-4">
            {[0, 1, 2].map((item) => (
```

(6) Replace

```tsx
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-6">
            <div className="rounded-md border border-dashed border-border bg-background p-4">
              <h3 className="font-medium text-foreground">{labels.emptyTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{labels.emptyDescription}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-border bg-surface text-meta text-faint-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{labels.clientId}</th>
                    <th className="px-4 py-3 font-medium">{labels.status}</th>
                    <th className="px-4 py-3 font-medium">{labels.scopes}</th>
                    <th className="px-4 py-3 font-medium">{labels.tokenPreview}</th>
                    <th className="px-4 py-3 font-medium">{labels.lastUsed}</th>
                    <th className="px-4 py-3 font-medium">{labels.operations}</th>
                    <th className="px-4 py-3 text-right font-medium">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map((client) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      labels={labels}
                      busy={mutatingId === client.id}
                      onEdit={() => openEditClient(client)}
                      onRotate={() => rotateClient(client)}
                      onEnable={() => setClientEnabled(client, true)}
                      onDisable={() => setClientEnabled(client, false)}
                      onCopyPowerShell={copyPowerShellExample}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {clients.map((client) => (
                <ClientCard
```

with

```tsx
            ))}
          </div>
        ) : clients.length === 0 ? (
          <ActionEmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
        ) : (
          <>
            <DataTable framed={false} caption={labels.clientsTitle} minWidth={1040} className="hidden md:block">
              <DataTableHeader>
                <tr>
                  <DataTableHead>{labels.clientId}</DataTableHead>
                  <DataTableHead>{labels.status}</DataTableHead>
                  <DataTableHead>{labels.scopes}</DataTableHead>
                  <DataTableHead>{labels.tokenPreview}</DataTableHead>
                  <DataTableHead>{labels.lastUsed}</DataTableHead>
                  <DataTableHead>{labels.operations}</DataTableHead>
                  <DataTableHead align="right">{labels.actions}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {clients.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    labels={labels}
                    busy={mutatingId === client.id}
                    onEdit={() => openEditClient(client)}
                    onRotate={() => rotateClient(client)}
                    onEnable={() => setClientEnabled(client, true)}
                    onDisable={() => setClientEnabled(client, false)}
                    onCopyPowerShell={copyPowerShellExample}
                  />
                ))}
              </DataTableBody>
            </DataTable>
            <div className="grid gap-3 p-4 md:hidden">
              {clients.map((client) => (
                <ClientCard
```

(7) Replace

```tsx
            </div>
          </>
        )}
      </section>
    </div>
  )
}
```

with

```tsx
            </div>
          </>
        )}
      </ContentPanel>
    </div>
  )
}
```

(8) Replace

```tsx
  onCopyPowerShell: (example: IntegrationPowerShellExample) => void
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{client.clientId}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{client.displayName}</div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge enabled={client.enabled} labels={labels} />
      </td>
      <td className="px-4 py-3">
        <ScopeList scopes={client.scopes} />
      </td>
      <td className="px-4 py-3 font-mono text-xs text-foreground">{client.tokenPreview}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(client.lastUsedAt, labels.noLastUsed)}</td>
      <td className="px-4 py-3">
        <OperationsPanel client={client} labels={labels} onCopyPowerShell={onCopyPowerShell} />
      </td>
      <td className="px-4 py-3">
        <ActionButtons
          client={client}
          labels={labels}
```

with

```tsx
  onCopyPowerShell: (example: IntegrationPowerShellExample) => void
}) {
  return (
    <DataTableRow>
      <DataTableCell>
        <div className="font-medium text-foreground"><span className="tag">{client.clientId}</span></div>
        <div className="mt-0.5 text-xs text-muted-foreground">{client.displayName}</div>
      </DataTableCell>
      <DataTableCell>
        <ClientStatus enabled={client.enabled} labels={labels} />
      </DataTableCell>
      <DataTableCell>
        <ScopeList scopes={client.scopes} />
      </DataTableCell>
      <DataTableCell className="text-xs text-foreground"><span className="tag">{client.tokenPreview}</span></DataTableCell>
      <DataTableCell className="text-muted-foreground">{formatDate(client.lastUsedAt, labels.noLastUsed)}</DataTableCell>
      <DataTableCell>
        <OperationsPanel client={client} labels={labels} onCopyPowerShell={onCopyPowerShell} />
      </DataTableCell>
      <DataTableCell align="right">
        <ActionButtons
          client={client}
          labels={labels}
```

(9) Replace

```tsx
          onDisable={onDisable}
          alignEnd
        />
      </td>
    </tr>
  )
}

```

with

```tsx
          onDisable={onDisable}
          alignEnd
        />
      </DataTableCell>
    </DataTableRow>
  )
}

```

(10) Replace

```tsx
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{client.clientId}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{client.displayName}</div>
        </div>
        <StatusBadge enabled={client.enabled} labels={labels} />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div>
```

with

```tsx
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground"><span className="tag">{client.clientId}</span></div>
          <div className="mt-0.5 text-sm text-muted-foreground">{client.displayName}</div>
        </div>
        <ClientStatus enabled={client.enabled} labels={labels} />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div>
```

(11) Replace

```tsx
        </div>
        <div>
          <span className="text-muted-foreground">{labels.tokenPreview}: </span>
          <span className="font-mono text-xs text-foreground">{client.tokenPreview}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{labels.lastUsed}: </span>
```

with

```tsx
        </div>
        <div>
          <span className="text-muted-foreground">{labels.tokenPreview}: </span>
          <span className="text-foreground"><span className="tag">{client.tokenPreview}</span></span>
        </div>
        <div>
          <span className="text-muted-foreground">{labels.lastUsed}: </span>
```

(12) Replace

```tsx
  const example = getPrimaryPowerShellExample(client)
  const hasOperationalData = operations.requestCountTotal > 0

  return (
    <div className="grid min-w-[220px] gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        <OperationMetric label={labels.requests24h} value={operations.requestCount24h} />
        <OperationMetric label={labels.requests7d} value={operations.requestCount7d} />
        <OperationMetric label={labels.errors7d} value={operations.errorCount7d} tone={operations.errorCount7d > 0 ? "danger" : "muted"} />
      </div>

      {hasOperationalData && operations.topEndpoint ? (
        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{labels.topEndpoint}: </span>
          <span className="break-all font-mono" title={operations.topEndpoint.route}>
            {operations.topEndpoint.route}
          </span>
```

with

```tsx
  const example = getPrimaryPowerShellExample(client)
  const hasOperationalData = operations.requestCountTotal > 0

  // The three counts are a small label and number list, not tiles. Red lives only in a badge: errors above 0 are a
  // danger StatusBadge, and so is the latest error, followed by its route (no red box in the cell).
  const counts = [
    { key: "24h", label: labels.requests24h, value: operations.requestCount24h, danger: false },
    { key: "7d", label: labels.requests7d, value: operations.requestCount7d, danger: false },
    { key: "errors7d", label: labels.errors7d, value: operations.errorCount7d, danger: operations.errorCount7d > 0 },
  ]

  return (
    <div className="grid min-w-[220px] gap-2">
      <dl className="grid grid-cols-3 gap-x-3 gap-y-0.5">
        {counts.map((count) => (
          <div key={count.key} className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{count.label}</dt>
            <dd className="text-sm font-semibold text-foreground num">
              {count.danger ? <StatusBadge tone="danger" label={formatCount(count.value)} /> : formatCount(count.value)}
            </dd>
          </div>
        ))}
      </dl>

      {hasOperationalData && operations.topEndpoint ? (
        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{labels.topEndpoint}: </span>
          {/* An API route is long and must wrap, so it keeps font-mono and is not a tag (R3). */}
          <span className="break-all font-mono" title={operations.topEndpoint.route}>
            {operations.topEndpoint.route}
          </span>
```

(13) Replace

```tsx
      )}

      {operations.latestError ? (
        <div className="rounded-md border border-danger-border bg-danger-soft px-2 py-1 text-xs text-danger">
          <span className="font-medium">{labels.latestError}: </span>
          <span className="font-mono">
            {operations.latestError.status} {operations.latestError.route}
          </span>
        </div>
      ) : null}

      {example ? (
        <button
          type="button"
          onClick={() => onCopyPowerShell(example)}
          className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Copy className="h-3.5 w-3.5" />
          {labels.copyPowerShell}
        </button>
      ) : null}
    </div>
  )
}

function OperationMetric({
  label,
  value,
  tone = "muted",
}: {
  label: string
  value: number
  tone?: "muted" | "danger"
}) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${tone === "danger" ? "text-danger" : "text-foreground"}`}>
        {formatCount(value)}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "primary" | "success" | "muted" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-muted-foreground"
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{formatCount(value)}</p>
        </div>
        <div className={toneClass}>{icon}</div>
      </div>
    </div>
  )
}

function StatusBadge({ enabled, labels }: { enabled: boolean; labels: Labels }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        enabled ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      {enabled ? labels.active : labels.disabled}
    </span>
  )
}

function ScopeList({ scopes }: { scopes: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((scope) => (
        <span key={scope} className="rounded-full bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
          {scope}
        </span>
      ))}
    </div>
  )
}

```

with

```tsx
      )}

      {operations.latestError ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <StatusBadge tone="danger" label={`${labels.latestError}: ${operations.latestError.status}`} />
          <span className="break-all font-mono">{operations.latestError.route}</span>
        </div>
      ) : null}

      {example ? (
        <Button variant="outline" size="sm" onClick={() => onCopyPowerShell(example)} className="w-fit">
          <Copy aria-hidden="true" />
          {labels.copyPowerShell}
        </Button>
      ) : null}
    </div>
  )
}

function ClientStatus({ enabled, labels }: { enabled: boolean; labels: Labels }) {
  return <StatusBadge label={enabled ? labels.active : labels.disabled} tone={enabled ? "success" : "muted"} />
}

// Scope codes are names, not states: the shared Chip with the code as a tag (R2, R3).
function ScopeList({ scopes }: { scopes: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {scopes.map((scope) => (
        <li key={scope}>
          <Chip>
            <span className="tag">{scope}</span>
          </Chip>
        </li>
      ))}
    </ul>
  )
}

```

(14) Replace

```tsx
  onDisable: () => void
  alignEnd?: boolean
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${alignEnd ? "justify-end" : ""}`}>
      <Button variant="outline" onClick={onEdit} disabled={busy}>
        <Pencil aria-hidden="true" />
        {labels.editScopes}
      </Button>
      <button
        type="button"
        onClick={onRotate}
        disabled={busy}
        className="inline-flex h-10 min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
        {labels.rotate}
      </button>
      {client.enabled ? (
        <button
          type="button"
          onClick={onDisable}
          disabled={busy}
          className="inline-flex h-10 min-h-11 items-center justify-center rounded-md border border-danger-border bg-danger-soft px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.disable}
        </button>
      ) : (
        <button
          type="button"
          onClick={onEnable}
          disabled={busy}
          className="inline-flex h-10 min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.enable}
        </button>
      )}
    </div>
  )
```

with

```tsx
  onDisable: () => void
  alignEnd?: boolean
}) {
  // One row of default Buttons (36px from md, 44px below). busy is the row's: the rotate button shows the spinner
  // while any action of this client runs, as before, and keeps focus (FMG GB4: no disabled with the same condition).
  return (
    <div className={cn("flex flex-wrap gap-2", alignEnd && "justify-end")}>
      <Button variant="outline" onClick={onEdit} disabled={busy}>
        <Pencil aria-hidden="true" />
        {labels.editScopes}
      </Button>
      <Button variant="outline" busy={busy} onClick={onRotate}>
        <RotateCw aria-hidden="true" />
        {labels.rotate}
      </Button>
      {client.enabled ? (
        <Button variant="danger" onClick={onDisable} disabled={busy}>
          {labels.disable}
        </Button>
      ) : (
        <Button variant="outline" onClick={onEnable} disabled={busy}>
          {labels.enable}
        </Button>
      )}
    </div>
  )
```

- [ ] **Step 3: The guard rows (R16).** In `tests/list-frame-guards.test.ts` (CRLF), the LS1 row goes in `BUDGETS` and `KEEP`; the LN2 row goes from `BUDGETS` (which keeps the empty `LN2: {}`) and the `LN2` key goes from `KEEP`:

(1) Replace

```ts
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :598 in the dialog (2C plan 3)
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}admin/IntegrationClientManager.tsx`]: 2, // → 2 (KEEP): OperationMetric :759, SummaryCard :778 (2C plan 4)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // → 1 (KEEP): SummaryPill :407 (2C plan 4)
  },
  LS2: {
```

with

```ts
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :598 in the dialog (2C plan 3)
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // → 1 (KEEP): SummaryPill :407 (2C plan 4)
  },
  LS2: {
```

(2) Replace

```ts
    [`${D}master-data/brands/page.tsx`]: 2, // → 2 (KEEP): the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
  LN2: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}admin/IntegrationClientManager.tsx`]: 1, // → 1 (KEEP): local StatusBadge :793 (2C plan 4)
  },
  LR1: {
  },
```

with

```ts
    [`${D}master-data/brands/page.tsx`]: 2, // → 2 (KEEP): the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
  LN2: {
  },
  LR1: {
  },
```

(3) Replace

```ts
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // print page, 2D (A/08:305)
  },
  LS1: {
    [`${C}admin/IntegrationClientManager.tsx`]: 2, // OperationMetric :759, SummaryCard :778 (2C plan 4)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :407 (2C plan 4)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
```

with

```ts
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // print page, 2D (A/08:305)
  },
  LS1: {
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :407 (2C plan 4)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
```

(4) Replace

```ts
  LN1: {
    [`${D}master-data/brands/page.tsx`]: 2, // the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
  LN2: {
    [`${C}admin/IntegrationClientManager.tsx`]: 1, // local StatusBadge :793 (2C plan 4)
  },
}

test("the list-frame counters read JSX and lines as intended", () => {
```

with

```ts
  LN1: {
    [`${D}master-data/brands/page.tsx`]: 2, // the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
}

test("the list-frame counters read JSX and lines as intended", () => {
```

In `tests/form-migration-guards.test.ts` (CRLF), `LOADER2` 2 → 1:

Replace

```ts
  [`${C}disposal/disposal-bulk-approval.tsx`]: 2, // the status lines :560, :561 in the dialog body (I27)
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1, // BusyLabel :967 (its spinner :970), the status line in the dialog body (I27)
  // 4
  [`${C}admin/IntegrationClientManager.tsx`]: 2, // the status line :524 and the rotate button of the row :854 (2D, I27)
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // the status lines :311, :446 (I27)
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // the status line :141 (I27)
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // the loading line :134 in the dialog body (I27)
```

with

```ts
  [`${C}disposal/disposal-bulk-approval.tsx`]: 2, // the status lines :560, :561 in the dialog body (I27)
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1, // BusyLabel :967 (its spinner :970), the status line in the dialog body (I27)
  // 4
  [`${C}admin/IntegrationClientManager.tsx`]: 1, // the loading status in the client list head :505 (I27); the rotate button is Button busy since 2D-2
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // the status lines :311, :446 (I27)
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // the status line :141 (I27)
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // the loading line :134 in the dialog body (I27)
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/confirm-dialog-ui.test.ts tests/integration-api-client-admin.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (145 tests).
  - Run `node <temp>/eol.mjs src/components/admin/IntegrationClientManager.tsx tests/admin-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/integration-api-client-admin.test.ts tests/list-frame-guards.test.ts`. Expected: equal numbers for `src/components/admin/IntegrationClientManager.tsx`, `tests/form-migration-guards.test.ts`, `tests/integration-api-client-admin.test.ts`, `tests/list-frame-guards.test.ts`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2029 tests, 2028 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/admin/IntegrationClientManager.tsx tests/admin-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/integration-api-client-admin.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the integration client manager on StatStrip, ContentPanel, Notice, DataTable, StatusBadge, Chip and Button (2D-2 task 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The role permission form (`c/admin/role-permission-form.tsx`)

Spec D7, D9, M27, M33. One commit. The metadata block is a `ContentPanel divided`, and the system-role guard above it is a neutral `Notice` (`mb-5`). The permission matrix is a `ContentPanel divided flush` holding a `DataTable`, with the module key as a `tag`. The `Info` icon import goes. The checkboxes, their `aria-label`s, `busy` save and the locked rows do not change.

**Files:**
- Modify: `src/components/admin/role-permission-form.tsx`
- Modify (pins): `tests/role-permission-form-ui.test.ts`
- Modify: `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing tests.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("the role permission form: two ContentPanels, the system-role guard as a neutral Notice, DataTable and the module key as a tag (spec 2D D7, M27)", () => {
  const source = read(`${C}admin/role-permission-form.tsx`)
  assert.match(source, /<ContentPanel divided title=\{t\("roleMetadata"\)\} description=\{t\("metadataSubtitle"\)\}>/)
  assert.match(source, /\{isSystemRole \? <Notice tone="neutral" className="mb-5">\{permissionsLocked \? t\("systemAdminGuard"\) : t\("systemRoleGuard"\)\}<\/Notice> : null\}/)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{t\("permissionSelection"\)\}/)
  assert.match(source, /<DataTable framed=\{false\} caption=\{t\("permissionSelection"\)\}>/)
  assert.match(source, /<span className="tag">\{moduleName\}<\/span>/)
  assert.doesNotMatch(source, /rounded-lg border|font-mono|bg-info-soft|text-info\b|\bInfo\b/)
})
```

In `tests/role-permission-form-ui.test.ts` (CRLF):

Replace

```ts
  assert.match(source, /<label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled/)
  assert.match(source, /<label className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground has-disabled/)
  assert.match(source, /<span className="text-sm">\{t\(`actions\.\$\{permission\.action\}`\)\}<\/span>/)
  assert.match(source, /<thead>\n\s+<tr>\n\s+<th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">\n\s+\{t\("module"\)\}/)
  assert.equal(source.match(/<th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">/g)?.length, 2)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}\n\s+<\/Link>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{t\("savePermissions"\)\}\n\s+<\/Button>/)
})
```

with

```ts
  assert.match(source, /<label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled/)
  assert.match(source, /<label className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground has-disabled/)
  assert.match(source, /<span className="text-sm">\{t\(`actions\.\$\{permission\.action\}`\)\}<\/span>/)
  // Plan 2D-2: the shared DataTable (its white 13/500 header) in a flush panel, instead of the copied header classes.
  assert.match(source, /<DataTableHeader>\n\s+<tr>\n\s+<DataTableHead>\{t\("module"\)\}<\/DataTableHead>\n\s+<DataTableHead>\{t\("permissions"\)\}<\/DataTableHead>/)
  assert.doesNotMatch(source, /<table\b|<thead\b|<th\b/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}\n\s+<\/Link>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{t\("savePermissions"\)\}\n\s+<\/Button>/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts tests/role-permission-form-ui.test.ts`
Expected: 2 failures:
- "the role permission form: two ContentPanels, the system-role guard as a neutral Notice, DataTable and the module key as a tag (spec 2D D7, M27)"
- "the role permission form uses the shared fields, 16px checkboxes in rows that read as locked, and a busy save button (2C batch 4)"

- [ ] **Step 2: The form.** In `src/components/admin/role-permission-form.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Info, Save } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
```

with

```tsx
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) Replace

```tsx
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("roleMetadata")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("metadataSubtitle")}</p>
            </div>
            {isSystemRole ? (
              <div className="inline-flex max-w-md items-start gap-2 rounded-md border border-info-border bg-info-soft px-3 py-2 text-sm text-info">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{permissionsLocked ? t("systemAdminGuard") : t("systemRoleGuard")}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("roleKey")} required>
              <Input
                value={meta.name}
```

with

```tsx
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <ContentPanel divided title={t("roleMetadata")} description={t("metadataSubtitle")}>
          {/* D7: a condition before acting is a neutral Notice (it was a teal info box). */}
          {isSystemRole ? <Notice tone="neutral" className="mb-5">{permissionsLocked ? t("systemAdminGuard") : t("systemRoleGuard")}</Notice> : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("roleKey")} required>
              <Input
                value={meta.name}
```

(3) Replace

```tsx
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-foreground">{t("permissionSelection")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {permissionsLocked ? t("permissionLockedSubtitle") : t("formSubtitle")}
          </p>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr>
                  <th className="bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground">
                    {t("module")}
                  </th>
                  <th className="bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground">
                    {t("permissions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groupedPermissions.map(([moduleName, modulePermissions]) => (
                  <tr key={moduleName} className="hover:bg-row-hover">
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{moduleName}</div>
                      <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
                        <input
                          type="checkbox"
```

with

```tsx
              </Field>
            </div>
          </div>
        </ContentPanel>

        <ContentPanel
          divided
          flush
          className="overflow-hidden"
          title={t("permissionSelection")}
          description={permissionsLocked ? t("permissionLockedSubtitle") : t("formSubtitle")}
        >
          <DataTable framed={false} caption={t("permissionSelection")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("module")}</DataTableHead>
                <DataTableHead>{t("permissions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
                {groupedPermissions.map(([moduleName, modulePermissions]) => (
                  <DataTableRow key={moduleName}>
                    <DataTableCell className="whitespace-nowrap">
                      <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                      <div className="mt-1 text-xs text-muted-foreground"><span className="tag">{moduleName}</span></div>
                      <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
                        <input
                          type="checkbox"
```

(4) Replace

```tsx
                        />
                        {t("selectModule")}
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                        {modulePermissions.map((permission) => (
                          <label
```

with

```tsx
                        />
                        {t("selectModule")}
                      </label>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                        {modulePermissions.map((permission) => (
                          <label
```

(5) Replace

```tsx
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
```

with

```tsx
                          </label>
                        ))}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
            </DataTableBody>
          </DataTable>
        </ContentPanel>

        <div className="flex justify-end gap-3">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/role-permission-form-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (89 tests).
  - Run `node <temp>/eol.mjs src/components/admin/role-permission-form.tsx tests/admin-sweep-ui.test.ts tests/role-permission-form-ui.test.ts`. Expected: equal numbers for `src/components/admin/role-permission-form.tsx`, `tests/role-permission-form-ui.test.ts`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2030 tests, 2029 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/admin/role-permission-form.tsx tests/admin-sweep-ui.test.ts tests/role-permission-form-ui.test.ts
git commit -m "refactor(ui): the role permission form on ContentPanel, Notice and DataTable, with the module key as a tag (2D-2 task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The roles page (`D/admin/roles/page.tsx`, M13)

Spec D7, D11, M13, M22. One commit. The floating create link (`shadow-lg`, VFG R2) goes; create is the last `PageHeader` action, `buttonVariants({ size: "md" })`, after the export link (already outline `md`). Each shows only with its permission, as before. The role kind, the protected mark and the roles in the matrix are `Chip`s (R2); the status is a `StatusBadge`. The `Check`, `ShieldCheck` and `ActiveBadge` imports go.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/roles/page.tsx`
- Modify (pins): `tests/list-pages-ui.test.ts`
- Modify (guards): `tests/visual-foundation-guards.test.ts`
- Modify: `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing tests.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("roles: create is a header button, the role kinds and the matrix roles are Chips, and the status is a StatusBadge (spec 2D M13, D7, D11)", () => {
  const source = read(`${D}admin/roles/page.tsx`)
  assert.match(source, /actions=\{\n\s+canExport \|\| canCreate \? \(\n\s+<>\n\s+\{canExport \? \(/)
  assert.ok(source.indexOf("/api/admin/roles/export") < source.indexOf("/admin/roles/new"), "the primary create comes last")
  assert.match(source, /<Chip>\{role\.isSystem \? t\("systemRole"\) : t\("customRole"\)\}<\/Chip>/)
  assert.match(source, /<Chip key=\{role\.id\} title=\{role\.displayName\}>/)
  assert.match(source, /<StatusBadge label=\{role\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{role\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /rounded-full|ActiveBadge|bg-(?:info|warning|success)-soft|text-white|\bfixed\b/)
})
```

In `tests/list-pages-ui.test.ts` (CRLF):

(1) Replace

```ts
})

// Plan 2B-5 Task 1 (spec 2B §5.6 row admin/roles, §4.4.6, R-d, R-q): the role list and the permission matrix on the
// list primitives. Edit is the row's only command, so RowActions draws no ⋯; the floating create button stays for 2D.
test("roles: PageHeader, one StatStrip, and the role list and permission matrix on DataTable, with edit through RowActions (spec 2B §5.6)", () => {
  const source = read(`${D}admin/roles/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow colSpan={7}>", "<ClickableTableRow", "<DataTableRow", "<RowActions"]) {
```

with

```ts
})

// Plan 2B-5 Task 1 (spec 2B §5.6 row admin/roles, §4.4.6, R-d, R-q): the role list and the permission matrix on the
// list primitives. Edit is the row's only command, so RowActions draws no ⋯. Plan 2D-2 (M13, D11) moved the floating
// create button into the header, after the export (the primary action last).
test("roles: PageHeader, one StatStrip, and the role list and permission matrix on DataTable, with edit through RowActions (spec 2B §5.6)", () => {
  const source = read(`${D}admin/roles/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow colSpan={7}>", "<ClickableTableRow", "<DataTableRow", "<RowActions"]) {
```

(2) Replace

```ts
  assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: role\.name \}\)\}/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /attention: inactiveRolesWithUsers\.length > 0,/, "inactive roles that still have users need action (R-d)")
  assert.match(source, /className="fixed bottom-6 right-6 [^"]*shadow-lg/, "R-q: phase 2D moves the floating create button")
  assert.doesNotMatch(source, /\bColumnHeader\b|function RoleAuditCard\b|<thead\b|<th\b|toLocaleString\(|font-mono|"-"|>-</)
})

// Plan 2B-5 Task 2 (spec 2B §5.6 row admin/logs, §5.9.2 row 1, §6.5 row 9, B4): the system log pages for real (it
```

with

```ts
  assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: role\.name \}\)\}/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /attention: inactiveRolesWithUsers\.length > 0,/, "inactive roles that still have users need action (R-d)")
  assert.match(source, /\{canCreate \? \(\n\s+<Link href=\{`\/\$\{locale\}\/admin\/roles\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/, "M13: create is the header's primary md button")
  assert.doesNotMatch(source, /\bfixed bottom-|shadow-lg|\bColumnHeader\b|function RoleAuditCard\b|<thead\b|<th\b|toLocaleString\(|font-mono|"-"|>-</)
})

// Plan 2B-5 Task 2 (spec 2B §5.6 row admin/logs, §5.9.2 row 1, §6.5 row 9, B4): the system log pages for real (it
```

Run: `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts`
Expected: 2 failures:
- "roles: create is a header button, the role kinds and the matrix roles are Chips, and the status is a StatusBadge (spec 2D M13, D7, D11)"
- "roles: PageHeader, one StatStrip, and the role list and permission matrix on DataTable, with edit through RowActions (spec 2B §5.6)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/admin/roles/page.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { Check, Download, Pencil, Plus, ShieldCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount } from "@/lib/display-format"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
```

with

```tsx
import Link from "next/link"
import { Download, Pencil, Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount } from "@/lib/display-format"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
```

(2) Replace

```tsx
import { PageHeader } from "@/components/ui/page-header"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"

type RolesPageProps = {
  params: Promise<{ locale: string }>
```

with

```tsx
import { PageHeader } from "@/components/ui/page-header"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type RolesPageProps = {
  params: Promise<{ locale: string }>
```

(3) Replace

```tsx
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canExport ? (
            <a href="/api/admin/roles/export" download className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("exportAudit")}
            </a>
          ) : undefined
        }
      />
```

with

```tsx
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canExport || canCreate ? (
            <>
              {canExport ? (
                <a href="/api/admin/roles/export" download className={buttonVariants({ variant: "outline", size: "md" })}>
                  <Download aria-hidden="true" />
                  {t("exportAudit")}
                </a>
              ) : null}
              {canCreate ? (
                <Link href={`/${locale}/admin/roles/new`} className={buttonVariants({ size: "md" })}>
                  <Plus aria-hidden="true" />
                  {t("createTitle")}
                </Link>
              ) : null}
            </>
          ) : undefined
        }
      />
```

(4) Replace

```tsx
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(role._count.userRoles)}</DataTableCell>
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(role._count.rolePermissions)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${role.isSystem ? "bg-info-soft text-info" : "bg-muted text-muted-foreground"}`}>
                        {role.isSystem ? t("systemRole") : t("customRole")}
                      </span>
                      {role.name === "system_admin" ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
                          <ShieldCheck className="h-3 w-3" />
                          {t("protectedRole")}
                        </span>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {role.isActive ? (
                        <ActiveBadge label={tCommon("active")} />
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {tCommon("inactive")}
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
```

with

```tsx
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(role._count.userRoles)}</DataTableCell>
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(role._count.rolePermissions)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {/* The kind of role is a name, not a state (R2): the shared Chip, neutral. */}
                      <div className="flex flex-wrap gap-1.5">
                        <Chip>{role.isSystem ? t("systemRole") : t("customRole")}</Chip>
                        {role.name === "system_admin" ? <Chip>{t("protectedRole")}</Chip> : null}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={role.isActive ? tCommon("active") : tCommon("inactive")} tone={role.isActive ? "success" : "muted"} />
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
```

(5) Replace

```tsx
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedRoles.map((role) => (
                            <span
                              key={role.id}
                              className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success"
                              title={role.displayName}
                            >
                              <Check className="h-3 w-3" />
                              {role.displayNameTh || role.displayName}
                            </span>
                          ))}
                        </div>
                      )}
```

with

```tsx
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedRoles.map((role) => (
                            <Chip key={role.id} title={role.displayName}>
                              {role.displayNameTh || role.displayName}
                            </Chip>
                          ))}
                        </div>
                      )}
```

(6) Replace

```tsx
          </DataTableBody>
        </DataTable>
      </ContentPanel>

      {canCreate ? (
        <Link
          href={`/${locale}/admin/roles/new`}
          className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {t("createTitle")}
        </Link>
      ) : null}
    </div>
  )
}
```

with

```tsx
          </DataTableBody>
        </DataTable>
      </ContentPanel>
    </div>
  )
}
```

- [ ] **Step 3: The guard row (R16).** In `tests/visual-foundation-guards.test.ts` (CRLF), the R2 row of the roles page goes:

Replace

```ts
    "src/components/asset-operations/operation-document-print.tsx": 1, // A4 page preview
    "src/components/admin/system-settings-form.tsx": 1, // label preview
    "src/components/layout/mobile-field-navigation.tsx": 1, // round scan button shadow-md, kept since phase 1
    "src/app/[locale]/(dashboard)/admin/roles/page.tsx": 1, // floating add button shadow-lg (2D)
    "src/app/[locale]/(dashboard)/admin/users/page.tsx": 1, // floating add button shadow-lg (2D)
    "src/components/assets/asset-register-table.tsx": 1, // mobile bulk-action bar shadow-lg (phase 3, R-q)
  })
```

with

```ts
    "src/components/asset-operations/operation-document-print.tsx": 1, // A4 page preview
    "src/components/admin/system-settings-form.tsx": 1, // label preview
    "src/components/layout/mobile-field-navigation.tsx": 1, // round scan button shadow-md, kept since phase 1
    "src/app/[locale]/(dashboard)/admin/users/page.tsx": 1, // floating add button shadow-lg (2D)
    "src/components/assets/asset-register-table.tsx": 1, // mobile bulk-action bar shadow-lg (phase 3, R-q)
  })
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (124 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/admin/roles/page.tsx" tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/admin/roles/page.tsx`, `tests/list-pages-ui.test.ts`, `tests/visual-foundation-guards.test.ts`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2031 tests, 2030 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/roles/page.tsx" tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts
git commit -m "refactor(ui): roles create moves into the page header, role kinds are Chips and the status a StatusBadge (2D-2 task 7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The users page and the admin user form

Spec D7, D9, D11, M13, M22, M33. Two commits.

#### 8a: `D/admin/users/page.tsx` (M13, D11, R8)

The page keeps the user that `requirePagePermission` returns and computes `canCreate = hasPermission(currentUser, "user", "create")`. The floating create link goes; create is the last `PageHeader` action (`size: "md"`), shown only with `canCreate`. Before this commit the floating link showed to every viewer and `/admin/users/new` refused those without `user:create`. Role names are `Chip`s, and the status is a `StatusBadge`.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/users/page.tsx`
- Modify (pins): `tests/list-pages-ui.test.ts`
- Modify (guards): `tests/visual-foundation-guards.test.ts`
- Modify: `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing tests.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("users: role chips are the shared Chip and the status is a StatusBadge (spec 2D D7, M22)", () => {
  const source = read(`${D}admin/users/page.tsx`)
  assert.match(source, /<Chip key=\{userRole\.role\.name\}>\{userRole\.role\.displayNameTh \|\| userRole\.role\.displayName\}<\/Chip>/)
  assert.match(source, /<StatusBadge label=\{user\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{user\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /ActiveBadge|bg-info-soft|text-white/)
})
```

In `tests/list-pages-ui.test.ts` (CRLF), the users test is renamed and pins the header button:

Replace

```ts
  assert.equal(existsSync(`${C}master-data/supplier-delete-button.tsx`), false, "the wrapper has no caller left (I5)")
})

test("users: edit is the row's only command, so RowActions draws no ⋯, and the floating create button stays (spec 2B §5.3, R-q)", () => {
  const source = read(`${D}admin/users/page.tsx`)
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/)
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
  assert.match(source, /className="fixed bottom-6 right-6 [^"]*shadow-lg/, "R-q: phase 2D moves the floating button")
  assert.match(source, /hiddenInputs=\{\{ pageSize: listState\.pageSize, sort: listState\.sort, direction: listState\.direction \}\}/)
})

```

with

```ts
  assert.equal(existsSync(`${C}master-data/supplier-delete-button.tsx`), false, "the wrapper has no caller left (I5)")
})

test("users: edit is the row's only command, so RowActions draws no ⋯, and create is a header button for who may create (spec 2B §5.3; 2D M13, D11)", () => {
  const source = read(`${D}admin/users/page.tsx`)
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/)
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /const canCreate = hasPermission\(currentUser, "user", "create"\)/)
  assert.match(source, /<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}\n\s+actions=\{\n\s+canCreate \? \(\n\s+<Link href=\{`\$\{basePath\}\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /\bfixed bottom-|shadow-lg|rounded-full/)
  assert.match(source, /hiddenInputs=\{\{ pageSize: listState\.pageSize, sort: listState\.sort, direction: listState\.direction \}\}/)
})

```

Run: `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts`
Expected: 2 failures:
- "users: role chips are the shared Chip and the status is a StatusBadge (spec 2D D7, M22)"
- "users: edit is the row's only command, so RowActions draws no ⋯, and create is a header button for who may create (spec 2B §5.3; 2D M13, D11)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/admin/users/page.tsx` (CRLF):

(1) Replace

```tsx
import { getTranslations } from "next-intl/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  ActiveBadge,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { formatDateTime } from "@/lib/utils"
```

with

```tsx
import { getTranslations } from "next-intl/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { formatDateTime } from "@/lib/utils"
```

(2) Replace

```tsx
export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "user", "view")

  const t = await getTranslations("adminUsersPage")
  const tCommon = await getTranslations("common")
```

with

```tsx
export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  // Named currentUser: the rows below call each listed account `user`.
  const currentUser = await requirePagePermission(locale, "user", "view")
  const canCreate = hasPermission(currentUser, "user", "create")

  const t = await getTranslations("adminUsersPage")
  const tCommon = await getTranslations("common")
```

(3) Replace

```tsx

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <MasterDataSearch
        action={basePath}
```

with

```tsx

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canCreate ? (
            <Link href={`${basePath}/new`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createTitle")}
            </Link>
          ) : undefined
        }
      />

      <MasterDataSearch
        action={basePath}
```

(4) Replace

```tsx
                        <Nil />
                      ) : (
                        user.userRoles.map((userRole) => (
                          <span key={userRole.role.name} className="inline-flex rounded-full bg-info-soft px-2 py-1 text-xs font-medium text-info">
                            {userRole.role.displayNameTh || userRole.role.displayName}
                          </span>
                        ))
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    {user.isActive ? (
                      <ActiveBadge label={tCommon("active")} />
                    ) : (
                      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {tCommon("inactive")}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : <Nil />}
```

with

```tsx
                        <Nil />
                      ) : (
                        user.userRoles.map((userRole) => (
                          <Chip key={userRole.role.name}>{userRole.role.displayNameTh || userRole.role.displayName}</Chip>
                        ))
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={user.isActive ? tCommon("active") : tCommon("inactive")} tone={user.isActive ? "success" : "muted"} />
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : <Nil />}
```

(5) Replace

```tsx
          )}
        </DataTableBody>
      </DataTable>

      <Link
        href={`${basePath}/new`}
        className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" />
        {t("createTitle")}
      </Link>
    </div>
  )
}
```

with

```tsx
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
```

- [ ] **Step 3: The guard row (R16).** In `tests/visual-foundation-guards.test.ts` (CRLF), the R2 row of the users page goes; the budget now holds 8 shadows:

Replace

```ts
    "src/components/asset-operations/operation-document-print.tsx": 1, // A4 page preview
    "src/components/admin/system-settings-form.tsx": 1, // label preview
    "src/components/layout/mobile-field-navigation.tsx": 1, // round scan button shadow-md, kept since phase 1
    "src/app/[locale]/(dashboard)/admin/users/page.tsx": 1, // floating add button shadow-lg (2D)
    "src/components/assets/asset-register-table.tsx": 1, // mobile bulk-action bar shadow-lg (phase 3, R-q)
  })
})
```

with

```ts
    "src/components/asset-operations/operation-document-print.tsx": 1, // A4 page preview
    "src/components/admin/system-settings-form.tsx": 1, // label preview
    "src/components/layout/mobile-field-navigation.tsx": 1, // round scan button shadow-md, kept since phase 1
    "src/components/assets/asset-register-table.tsx": 1, // mobile bulk-action bar shadow-lg (phase 3, R-q)
  })
})
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (125 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/admin/users/page.tsx" tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/admin/users/page.tsx`, `tests/list-pages-ui.test.ts`, `tests/visual-foundation-guards.test.ts`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2032 tests, 2031 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/users/page.tsx" tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts
git commit -m "refactor(ui): users create moves into the page header for who may create users, roles are Chips and the status a StatusBadge (2D-2 task 8a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 8b: `c/admin/admin-user-form.tsx`

The form is a `<form>`, so it takes the panel classes (R4): `cn(getPanelClasses(), "p-4 sm:p-5")`. The role names in the role list are `tag`s.

**Files:** Modify `src/components/admin/admin-user-form.tsx`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 6: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("the admin user form is a panel with the shared panel classes and shows role keys as tags (spec 2D D9, M33)", () => {
  const source = read(`${C}admin/admin-user-form.tsx`)
  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<span className="mt-1 block text-xs text-muted-foreground"><span className="tag">\{role\.name\}<\/span><\/span>/)
  assert.doesNotMatch(source, /rounded-lg border|font-mono/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts`
Expected: 1 failure, "the admin user form is a panel with the shared panel classes and shows role keys as tags (spec 2D D9, M33)".

- [ ] **Step 7: The form.** In `src/components/admin/admin-user-form.tsx` (CRLF):

(1) Replace

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { cn } from "@/lib/utils"

type RoleOption = {
```

with

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type RoleOption = {
```

(2) Replace

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("username")} required>
            <Input
```

with

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      {/* The form is the panel (D9): the panel classes and ContentPanel's own padding, since a <form> cannot be ContentPanel. */}
      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("username")} required>
            <Input
```

(3) Replace

```tsx
                />
                <span>
                  <span className="block font-medium text-foreground">{role.displayNameTh || role.displayName}</span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">{role.name}</span>
                </span>
              </label>
            ))}
```

with

```tsx
                />
                <span>
                  <span className="block font-medium text-foreground">{role.displayNameTh || role.displayName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground"><span className="tag">{role.name}</span></span>
                </span>
              </label>
            ))}
```

- [ ] **Step 8: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/admin-user-form-ui.test.ts tests/form-frames-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (92 tests).
  - Run `node <temp>/eol.mjs src/components/admin/admin-user-form.tsx tests/admin-sweep-ui.test.ts`. Expected: equal numbers for `src/components/admin/admin-user-form.tsx`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2033 tests, 2032 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 9: Commit.**

```bash
git add src/components/admin/admin-user-form.tsx tests/admin-sweep-ui.test.ts
git commit -m "refactor(ui): the admin user form uses the shared panel classes and shows role names as tags (2D-2 task 8b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Storage (M14)

Spec D9, M14. Two commits.

#### 9a: `c/admin/storage-archive-button.tsx`

The archive button is `<Button variant="outline" size="sm" busy={archiving}>` with its `Archive` icon: it keeps focus while it works and shows the shared spinner (M14).

**Files:** Modify `src/components/admin/storage-archive-button.tsx`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("the storage archive button is an outline sm Button that stays busy while it archives (spec 2D M14)", () => {
  const source = read(`${C}admin/storage-archive-button.tsx`)
  assert.match(source, /<Button variant="outline" size="sm" busy=\{archiving\} onClick=\{handleClick\}>\n\s+<Archive aria-hidden="true" \/>\n\s+\{t\("archiveOrphanFile"\)\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /<button\b|Loader2|disabled=|opacity-|bg-warning-soft|sm:h-8/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts`
Expected: 1 failure, "the storage archive button is an outline sm Button that stays busy while it archives (spec 2D M14)".

- [ ] **Step 2: The button.** In `src/components/admin/storage-archive-button.tsx` (CRLF):

(1) Replace

```tsx
"use client"

import { useState } from "react"
import { Archive, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useApiError } from "@/components/ui/use-api-error"

```

with

```tsx
"use client"

import { useState } from "react"
import { Archive } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useApiError } from "@/components/ui/use-api-error"

```

(2) Replace

```tsx
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={archiving}
      className="inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-warning-border bg-warning-soft px-3 text-xs font-medium text-warning transition-colors hover:bg-warning-soft disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:min-h-0"
    >
      {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
      {t("archiveOrphanFile")}
    </button>
  )
}
```

with

```tsx
    }
  }

  // M14: a row button is outline sm (DESIGN: green, orange and red live only in badges); busy keeps focus and the
  // label while the request runs, and blocks a second click.
  return (
    <Button variant="outline" size="sm" busy={archiving} onClick={handleClick}>
      <Archive aria-hidden="true" />
      {t("archiveOrphanFile")}
    </Button>
  )
}
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/storage-archive-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (83 tests).
  - Run `node <temp>/eol.mjs src/components/admin/storage-archive-button.tsx tests/admin-sweep-ui.test.ts`. Expected: equal numbers for `src/components/admin/storage-archive-button.tsx`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2034 tests, 2033 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/admin/storage-archive-button.tsx tests/admin-sweep-ui.test.ts
git commit -m "refactor(ui): the storage archive button is an outline Button that stays busy while it archives (2D-2 task 9a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 9b: `D/admin/storage/page.tsx`

The four panels are `ContentPanel`s; the icon box in the first head goes, with `getPanelClasses` and `FolderOpen`.

**Files:** Modify `src/app/[locale]/(dashboard)/admin/storage/page.tsx`, `tests/list-pages-ui.test.ts`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 5: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("storage: its four panels are ContentPanel, with no icon box (spec 2D D9)", () => {
  const source = read(`${D}admin/storage/page.tsx`)
  assert.equal(source.match(/<ContentPanel title=\{(?:t\("(?:filesystemDryRun|moduleBreakdown)"\)|title)\} description=\{(?:t\("(?:filesystemDryRunHelp|moduleBreakdownHelp)"\)|description)\}>/g)?.length, 4)
  assert.doesNotMatch(source, /getPanelClasses|FolderOpen|bg-primary-soft|<section className=\{`/)
})
```

In `tests/list-pages-ui.test.ts` (CRLF), the storage pin allows the `ContentPanel`'s margin class. It passes before and after.

Replace

```ts
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the summary and the dry-run counts")
  assert.equal(source.match(/<DataTable framed=\{false\} className="mt-4" caption=\{(?:t\("(?:filesystemDryRun|moduleBreakdown)"\)|title)\} scrollHint=\{(?:tCommon\("tableScrollHint"\)|scrollHint)\}>/g)?.length, 3, "three tables in padded panels, flush, with the scroll hint (B6)")
  assert.match(source, /attention: reviewNeededCount > 0,/)
  assert.match(source, /\{moduleLabel\(item\.module, t\)\} · <span className="tag">\{item\.referenceId\}<\/span>/, "bug §5.10 #10: the review list names the module, not its code")
  assert.match(source, /\{orNil\(item\.filePath\)\}/)
```

with

```ts
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the summary and the dry-run counts")
  // The panels are ContentPanel since plan 2D-2: only the dry-run table, under its StatStrip, keeps a top margin.
  assert.equal(source.match(/<DataTable framed=\{false\}(?: className="mt-4")? caption=\{(?:t\("(?:filesystemDryRun|moduleBreakdown)"\)|title)\} scrollHint=\{(?:tCommon\("tableScrollHint"\)|scrollHint)\}>/g)?.length, 3, "three tables in padded panels, flush, with the scroll hint (B6)")
  assert.match(source, /attention: reviewNeededCount > 0,/)
  assert.match(source, /\{moduleLabel\(item\.module, t\)\} · <span className="tag">\{item\.referenceId\}<\/span>/, "bug §5.10 #10: the review list names the module, not its code")
  assert.match(source, /\{orNil\(item\.filePath\)\}/)
```

Run: `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts`
Expected: 1 failure, "storage: its four panels are ContentPanel, with no icon box (spec 2D D9)".

- [ ] **Step 6: The page.** In `src/app/[locale]/(dashboard)/admin/storage/page.tsx` (CRLF):

(1) Replace

```tsx
import { FolderOpen } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { getPanelClasses } from "@/lib/design-system"
import {
  buildStorageGovernanceDryRun,
  formatStorageSize,
```

with

```tsx
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import {
  buildStorageGovernanceDryRun,
  formatStorageSize,
```

(2) Replace

```tsx
} from "@/lib/storage-governance"
import { getUploadRoot } from "@/lib/uploads"
import { StorageArchiveButton } from "@/components/admin/storage-archive-button"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
```

with

```tsx
} from "@/lib/storage-governance"
import { getUploadRoot } from "@/lib/uploads"
import { StorageArchiveButton } from "@/components/admin/storage-archive-button"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
```

(3) Replace

```tsx
        ]}
      />

      <section className={`${getPanelClasses()} p-5`}>
        <h2 className="font-semibold text-foreground">{t("filesystemDryRun")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("filesystemDryRunHelp")}</p>
        <StatStrip
          className="mt-4"
          items={[
            { key: "matchedFiles", label: t("matchedFiles"), value: formatCount(dryRun.matchedFiles.length) },
            { key: "orphanFiles", label: t("orphanFiles"), value: formatCount(dryRun.orphanFiles.length) },
```

with

```tsx
        ]}
      />

      <ContentPanel title={t("filesystemDryRun")} description={t("filesystemDryRunHelp")}>
        <StatStrip
          items={[
            { key: "matchedFiles", label: t("matchedFiles"), value: formatCount(dryRun.matchedFiles.length) },
            { key: "orphanFiles", label: t("orphanFiles"), value: formatCount(dryRun.orphanFiles.length) },
```

(4) Replace

```tsx
            )}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${getPanelClasses()} p-5`}>
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-primary-border bg-primary-soft p-2 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("moduleBreakdown")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("moduleBreakdownHelp")}</p>
            </div>
          </div>
          <DataTable framed={false} className="mt-4" caption={t("moduleBreakdown")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("module")}</DataTableHead>
```

with

```tsx
            )}
          </DataTableBody>
        </DataTable>
      </ContentPanel>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContentPanel title={t("moduleBreakdown")} description={t("moduleBreakdownHelp")}>
          <DataTable framed={false} caption={t("moduleBreakdown")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("module")}</DataTableHead>
```

(5) Replace

```tsx
              )}
            </DataTableBody>
          </DataTable>
        </div>

        <StorageReviewList
          title={t("reviewList")}
```

with

```tsx
              )}
            </DataTableBody>
          </DataTable>
        </ContentPanel>

        <StorageReviewList
          title={t("reviewList")}
```

(6) Replace

```tsx
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <div className={`${getPanelClasses()} p-5`}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <EmptyNote>{t("emptyReview")}</EmptyNote>
        ) : (
```

with

```tsx
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <ContentPanel title={title} description={description}>
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyNote>{t("emptyReview")}</EmptyNote>
        ) : (
```

(7) Replace

```tsx
          })
        )}
      </div>
    </div>
  )
}

```

with

```tsx
          })
        )}
      </div>
    </ContentPanel>
  )
}

```

(8) Replace

```tsx
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <section className={`${getPanelClasses()} p-5`}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <DataTable framed={false} className="mt-4" caption={title} scrollHint={scrollHint}>
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("file")}</DataTableHead>
```

with

```tsx
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <ContentPanel title={title} description={description}>
      <DataTable framed={false} caption={title} scrollHint={scrollHint}>
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("file")}</DataTableHead>
```

(9) Replace

```tsx
          )}
        </DataTableBody>
      </DataTable>
    </section>
  )
}

```

with

```tsx
          )}
        </DataTableBody>
      </DataTable>
    </ContentPanel>
  )
}

```

- [ ] **Step 7: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/storage-archive-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (132 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/admin/storage/page.tsx" tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/admin/storage/page.tsx`, `tests/list-pages-ui.test.ts`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2035 tests, 2034 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 8: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/storage/page.tsx" tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts
git commit -m "refactor(ui): the storage page panels are ContentPanels (2D-2 task 9b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Data quality

Spec D7, D9, M21, M29; 2D-1 R3 (`:144`) and R6 (the `scanning` key). Three commits.

#### 10a: `c/admin/asset-state-review-workspace.tsx`

The review queue is a `ContentPanel divided flush`; the scan button is `size="md"` (2D-1 R3 hand-on); the summary row moves into the body; the summary dots are `statusMarkerVariants` with a typed tone. The asset tag is a `tag` inside a `linkVariants` link (`min-h-11` below md). The loading line is a `div` with `role="status"`. `AlertTriangle` and `ShieldAlert` go.

**Files:** Modify `src/components/admin/asset-state-review-workspace.tsx`, `tests/list-pages-ui.test.ts`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing tests.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("the state review queue is a divided ContentPanel with an md scan button, shape markers and the asset tag as a tag link (spec 2D D9, R3 hand-on)", () => {
  const source = read(`${C}admin/asset-state-review-workspace.tsx`)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{labels\.title\}\n\s+description=\{labels\.description\}/)
  assert.match(source, /<span aria-hidden="true" className=\{statusMarkerVariants\(\{ tone \}\)\} \/>/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}><span className="tag font-medium">\{row\.asset\.assetTag\}<\/span><\/Link>/)
  assert.match(source, /<div className="space-y-3 p-4" role="status" aria-label=\{labels\.loading\}>/)
  assert.doesNotMatch(source, /rounded-full|hover:underline|ShieldAlert|AlertTriangle|text-lg font-semibold|size="lg"/)
})
```

In `tests/list-pages-ui.test.ts` (CRLF), the scan button pin is `md`:

Replace

```ts
  }
  assert.match(source, /<nav aria-label=\{labels\.pagination\} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">\n\s+<p aria-live="polite" className="text-meta text-muted-foreground num">/)
  assert.equal(source.match(/<Button variant="outline" size="sm" disabled=\{loading \|\| result\.page (?:<= 1|>= totalPages)\}/g)?.length, 2, "previous and next")
  assert.match(source, /<Button size="lg" busy=\{scanning\} onClick=\{\(\) => void scan\(\)\}>\n\s+<ScanSearch aria-hidden="true" \/>\n\s+\{labels\.scan\}\n/, "the scan button keeps its label while busy (K13)")
  assert.match(source, /<ActionEmptyState title=\{labels\.emptyTitle\} description=\{labels\.emptyDescription\} \/>/)
  assert.doesNotMatch(source, /\bActionButton\b|<table\b|<select\b|toLocaleString\(/)
})
```

with

```ts
  }
  assert.match(source, /<nav aria-label=\{labels\.pagination\} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">\n\s+<p aria-live="polite" className="text-meta text-muted-foreground num">/)
  assert.equal(source.match(/<Button variant="outline" size="sm" disabled=\{loading \|\| result\.page (?:<= 1|>= totalPages)\}/g)?.length, 2, "previous and next")
  assert.match(source, /<Button size="md" busy=\{scanning\} onClick=\{\(\) => void scan\(\)\}>\n\s+<ScanSearch aria-hidden="true" \/>\n\s+\{labels\.scan\}\n/, "the scan button keeps its label while busy (K13); md in the panel head (2D-2, D6)")
  assert.match(source, /<ActionEmptyState title=\{labels\.emptyTitle\} description=\{labels\.emptyDescription\} \/>/)
  assert.doesNotMatch(source, /\bActionButton\b|<table\b|<select\b|toLocaleString\(/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts`
Expected: 2 failures:
- "the state review queue is a divided ContentPanel with an md scan button, shape markers and the asset tag as a tag link (spec 2D D9, R3 hand-on)"
- "data quality review queue: FilterSelect, DataTable and a client page bar of outline sm buttons (spec 2B §5.4, §6.5 O3, I12)"

- [ ] **Step 2: The workspace.** In `src/components/admin/asset-state-review-workspace.tsx` (CRLF):

(1) Replace

```tsx
"use client"

import Link from "next/link"
import { AlertTriangle, ScanSearch, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AssetStateReviewDialog, type ReviewTarget } from "@/components/admin/asset-state-review-dialog"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { FilterSelect } from "@/components/ui/filter-select"
import { useApiError } from "@/components/ui/use-api-error"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"

type ReviewRow = {
  id: string
```

with

```tsx
"use client"

import Link from "next/link"
import { ScanSearch } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AssetStateReviewDialog, type ReviewTarget } from "@/components/admin/asset-state-review-dialog"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { FilterSelect } from "@/components/ui/filter-select"
import { useApiError } from "@/components/ui/use-api-error"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type ReviewRow = {
  id: string
```

(2) Replace

```tsx

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">{labels.title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Summary label={labels.critical} value={result.summary.bySeverity.critical ?? 0} tone="danger" />
            <Summary label={labels.warning} value={result.summary.bySeverity.warning ?? 0} tone="warning" />
            <Summary label={labels.info} value={result.summary.bySeverity.info ?? 0} tone="info" />
          </div>
        </div>
        {canEdit ? (
          <Button size="lg" busy={scanning} onClick={() => void scan()}>
            <ScanSearch aria-hidden="true" />
            {labels.scan}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 border-b border-border bg-background p-4 sm:grid-cols-3">
```

with

```tsx

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))

  // D9: the shared divided panel; the head holds the title, the description and the scan button (md, R3 hand-on),
  // and the per-severity counts open the body.
  return (
    <ContentPanel
      divided
      flush
      className="overflow-hidden"
      title={labels.title}
      description={labels.description}
      actions={
        canEdit ? (
          <Button size="md" busy={scanning} onClick={() => void scan()}>
            <ScanSearch aria-hidden="true" />
            {labels.scan}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border px-4 py-3 text-sm md:px-5">
        <Summary label={labels.critical} value={result.summary.bySeverity.critical ?? 0} tone="danger" />
        <Summary label={labels.warning} value={result.summary.bySeverity.warning ?? 0} tone="warning" />
        <Summary label={labels.info} value={result.summary.bySeverity.info ?? 0} tone="info" />
      </div>

      <div className="grid gap-3 border-b border-border bg-background p-4 sm:grid-cols-3">
```

(3) Replace

```tsx
      </div>

      {loading ? (
        <div className="space-y-3 p-4" aria-label={labels.loading}>
          {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />)}
        </div>
      ) : result.data.length === 0 ? (
```

with

```tsx
      </div>

      {loading ? (
        <div className="space-y-3 p-4" role="status" aria-label={labels.loading}>
          {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />)}
        </div>
      ) : result.data.length === 0 ? (
```

(4) Replace

```tsx
        onClose={() => setDialog(null)}
        onSubmit={submitDialog}
      /> : null}
    </section>
  )
}

```

with

```tsx
        onClose={() => setDialog(null)}
        onSubmit={submitDialog}
      /> : null}
    </ContentPanel>
  )
}

```

(5) Replace

```tsx
type RowProps = { row: ReviewRow; locale: string; labels: Labels; issueTypes: Record<string, string>; canEdit: boolean; onAction: (mode: "resolve" | "dismiss") => void }

function AssetIdentity({ row, locale, labels }: Pick<RowProps, "row" | "locale" | "labels">) {
  return <div><Link href={`/${locale}/assets/${row.asset.id}`} className="font-semibold text-primary hover:underline">{row.asset.assetTag}</Link><p className="mt-0.5 max-w-xs text-foreground">{row.asset.name}</p><p className="mt-1 text-xs text-muted-foreground">{labels.custodian}: {row.asset.custodian?.fullNameTh ?? labels.unassigned}</p></div>
}

function StateSummary({ row, locale, labels }: Pick<RowProps, "row" | "locale" | "labels">) {
```

with

```tsx
type RowProps = { row: ReviewRow; locale: string; labels: Labels; issueTypes: Record<string, string>; canEdit: boolean; onAction: (mode: "resolve" | "dismiss") => void }

function AssetIdentity({ row, locale, labels }: Pick<RowProps, "row" | "locale" | "labels">) {
  return <div><Link href={`/${locale}/assets/${row.asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}><span className="tag font-medium">{row.asset.assetTag}</span></Link><p className="mt-0.5 max-w-xs text-foreground">{row.asset.name}</p><p className="mt-1 text-xs text-muted-foreground">{labels.custodian}: {row.asset.custodian?.fullNameTh ?? labels.unassigned}</p></div>
}

function StateSummary({ row, locale, labels }: Pick<RowProps, "row" | "locale" | "labels">) {
```

(6) Replace

```tsx
}

function IssueSummary({ row, labels, issueTypes }: Pick<RowProps, "row" | "labels" | "issueTypes">) {
  return <div className="flex items-start gap-2"><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${row.severity === "critical" ? "text-danger" : row.severity === "warning" ? "text-warning" : "text-info"}`} /><div><p className="font-medium text-foreground">{issueTypes[row.issueType] ?? row.issueType}</p><StatusBadge label={severityLabel(row.severity, labels)} tone={severityTone(row.severity)} /></div></div>
}

function ReviewActions({ row, canEdit, labels, onAction }: Pick<RowProps, "row" | "canEdit" | "labels" | "onAction">) {
```

with

```tsx
}

function IssueSummary({ row, labels, issueTypes }: Pick<RowProps, "row" | "labels" | "issueTypes">) {
  // The severity is the badge; the colored icon beside it said the same thing in color only, so it is gone.
  return <div><p className="font-medium text-foreground">{issueTypes[row.issueType] ?? row.issueType}</p><StatusBadge label={severityLabel(row.severity, labels)} tone={severityTone(row.severity)} /></div>
}

function ReviewActions({ row, canEdit, labels, onAction }: Pick<RowProps, "row" | "canEdit" | "labels" | "onAction">) {
```

(7) Replace

```tsx
  return <div className="flex flex-wrap justify-end gap-2">{canResolve ? <Button size="sm" onClick={() => onAction("resolve")}>{labels.resolve}</Button> : <span className="self-center text-xs text-muted-foreground">{labels.workflowRequired}</span>}<Button variant="outline" size="sm" onClick={() => onAction("dismiss")}>{labels.dismiss}</Button></div>
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-info"}`} /><span className="text-muted-foreground">{label}</span><strong className="text-foreground">{formatCount(value)}</strong></span>
}

function masterLabel(target: ReviewTarget, locale: string) { return locale === "th" ? target.nameTh || target.name : target.name }
```

with

```tsx
  return <div className="flex flex-wrap justify-end gap-2">{canResolve ? <Button size="sm" onClick={() => onAction("resolve")}>{labels.resolve}</Button> : <span className="self-center text-xs text-muted-foreground">{labels.workflowRequired}</span>}<Button variant="outline" size="sm" onClick={() => onAction("dismiss")}>{labels.dismiss}</Button></div>
}

// The status marker of StatusBadge carries the severity by shape (diamond, triangle, ring), not by color alone.
function Summary({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "info" }) {
  return <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={statusMarkerVariants({ tone })} /><span className="text-muted-foreground">{label}</span><strong className="text-foreground num">{formatCount(value)}</strong></span>
}

function masterLabel(target: ReviewTarget, locale: string) { return locale === "th" ? target.nameTh || target.name : target.name }
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/asset-state-review-ui.test.ts tests/list-filters-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (140 tests).
  - Run `node <temp>/eol.mjs src/components/admin/asset-state-review-workspace.tsx tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts`. Expected: equal numbers for `src/components/admin/asset-state-review-workspace.tsx`, `tests/list-pages-ui.test.ts`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2036 tests, 2035 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/admin/asset-state-review-workspace.tsx tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts
git commit -m "refactor(ui): the state review queue is a ContentPanel with an md scan button, shape markers and a tag link (2D-2 task 10a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 10b: `D/admin/data-quality/page.tsx` and the unread key

The rule cards take the panel classes (a card in a page grid, R4). Each shows a `StatusBadge`: the rule's severity while it is on and finds something, otherwise `muted` (R6), with the state label as its text. The count is `text-count num`, and the view link is a `linkVariants` link named by its `aria-label`. `severityClass` and its lucide import go. The `scanning:` pass line goes, and so does its key (2D-1 R6, R15).

**Files:** Modify `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx`, `messages/th.json`, `messages/en.json` (through the script), `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 5: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("data quality: rule cards are panels with a severity badge and a named view link, and the unread scanning label is gone (spec 2D D9, 2D-1 R6)", () => {
  const source = read(`${D}admin/data-quality/page.tsx`)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<StatusBadge className="mt-2" label=\{stateLabel\} tone=\{rule\.enabled && count > 0 \? rule\.severity : "muted"\} \/>/)
  assert.match(source, /<div className="text-count num text-foreground">\{formatCount\(count\)\}<\/div>/)
  assert.match(source, /<Link href=\{href\} aria-label=\{`\$\{viewLabel\}: \$\{label\}`\} className=\{cn\(linkVariants\(\), "mt-1 inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.doesNotMatch(source, /function severityClass\b|bg-(?:danger|warning)-soft|text-2xl font-bold|hover:underline|scanning: t\(/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(messages(locale).dataQualityPage.assetStateReviews.scanning, undefined, `${locale}: the key no code reads is deleted`)
  }
})
```

Run: `node --test tests/admin-sweep-ui.test.ts`
Expected: 1 failure, "data quality: rule cards are panels with a severity badge and a named view link, and the unread scanning label is gone (spec 2D D9, 2D-1 R6)".

- [ ] **Step 6: The page.** In `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { CheckCircle2, FileWarning } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
```

with

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
```

(2) Replace

```tsx
import { assetMissingResponsibilityWhere } from "@/lib/asset-ownership"
import { assetDataQualityRulesKey, parseAssetDataQualityRules, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { buildDataQualityRuleHref } from "@/lib/data-quality-drilldown"
import { formatCount } from "@/lib/display-format"
import { DataQualityRuleForm } from "@/components/admin/data-quality-rule-form"
import { AssetStateReviewWorkspace, type AssetStateReviewResponse } from "@/components/admin/asset-state-review-workspace"
import { buttonVariants } from "@/components/ui/button-variants"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"

type DataQualityPageProps = {
  params: Promise<{ locale: string }>
```

with

```tsx
import { assetMissingResponsibilityWhere } from "@/lib/asset-ownership"
import { assetDataQualityRulesKey, parseAssetDataQualityRules, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { buildDataQualityRuleHref } from "@/lib/data-quality-drilldown"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { DataQualityRuleForm } from "@/components/admin/data-quality-rule-form"
import { AssetStateReviewWorkspace, type AssetStateReviewResponse } from "@/components/admin/asset-state-review-workspace"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type DataQualityPageProps = {
  params: Promise<{ locale: string }>
```

(3) Replace

```tsx
            count={counts[rule.key] ?? 0}
            label={t(`rules.${rule.key}.label`)}
            description={t(`rules.${rule.key}.description`)}
            viewLabel={tCommon("view")}
            href={buildDataQualityRuleHref(locale, rule.key)}
          />
```

with

```tsx
            count={counts[rule.key] ?? 0}
            label={t(`rules.${rule.key}.label`)}
            description={t(`rules.${rule.key}.description`)}
            stateLabel={rule.enabled ? (rule.severity === "danger" ? t("danger") : t("warning")) : tCommon("inactive")}
            viewLabel={tCommon("view")}
            href={buildDataQualityRuleHref(locale, rule.key)}
          />
```

(4) Replace

```tsx
          title: t("assetStateReviews.title"),
          description: t("assetStateReviews.description"),
          scan: t("assetStateReviews.scan"),
          scanning: t("assetStateReviews.scanning"),
          scanSuccess: t.raw("assetStateReviews.scanSuccess"),
          scanError: t("assetStateReviews.scanError"),
          loadError: t("assetStateReviews.loadError"),
```

with

```tsx
          title: t("assetStateReviews.title"),
          description: t("assetStateReviews.description"),
          scan: t("assetStateReviews.scan"),
          scanSuccess: t.raw("assetStateReviews.scanSuccess"),
          scanError: t("assetStateReviews.scanError"),
          loadError: t("assetStateReviews.loadError"),
```

(5) Replace

```tsx
  return { missingCustodian, missingSerial, missingPhoto, missingDepartment, missingPurchaseInfo, warrantyExpiring }
}

function RuleStatusCard({
  rule,
  count,
  label,
  description,
  viewLabel,
  href,
}: {
```

with

```tsx
  return { missingCustodian, missingSerial, missingPhoto, missingDepartment, missingPurchaseInfo, warrantyExpiring }
}

// A rule card is a panel (D9) with no tone fill: the severity is a status badge, filled only while the rule is on and
// finds something; an off rule reads "ไม่ใช้งาน". "ดู" is the same on every card, so its name says which rule it opens.
function RuleStatusCard({
  rule,
  count,
  label,
  description,
  stateLabel,
  viewLabel,
  href,
}: {
```

(6) Replace

```tsx
  count: number
  label: string
  description: string
  viewLabel: string
  href: string
}) {
  return (
    <div className={`rounded-lg border p-4 ${rule.enabled ? severityClass(rule.severity) : "border-border bg-surface text-muted-foreground"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {rule.enabled ? <FileWarning className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <h2 className="font-semibold text-foreground">{label}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{formatCount(count)}</div>
          <Link href={href} className="mt-1 inline-flex text-xs font-medium text-primary hover:underline">
            {viewLabel}
          </Link>
        </div>
```

with

```tsx
  count: number
  label: string
  description: string
  stateLabel: string
  viewLabel: string
  href: string
}) {
  return (
    <div className={cn(getPanelClasses(), "p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">{label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <StatusBadge className="mt-2" label={stateLabel} tone={rule.enabled && count > 0 ? rule.severity : "muted"} />
        </div>
        <div className="text-right">
          <div className="text-count num text-foreground">{formatCount(count)}</div>
          <Link href={href} aria-label={`${viewLabel}: ${label}`} className={cn(linkVariants(), "mt-1 inline-flex min-h-11 items-center md:min-h-0")}>
            {viewLabel}
          </Link>
        </div>
```

(7) Replace

```tsx
    </div>
  )
}

function severityClass(severity: AssetDataQualityRule["severity"]) {
  return severity === "danger" ? "border-danger-border bg-danger-soft text-danger" : "border-warning-border bg-warning-soft text-warning"
}
```

with

```tsx
    </div>
  )
}
```

- [ ] **Step 7: The key.** Run `grep -rn "assetStateReviews.scanning" src tests`. Expected: one line, the new test in `tests/admin-sweep-ui.test.ts`. Save `<temp>/p2d2-scanning-key.json`:

```json
{ "delete": ["dataQualityPage.assetStateReviews.scanning"] }
```

Run: `node scripts/messages-edit.mjs <temp>/p2d2-scanning-key.json`
Expected: `messages updated: 0 th, 0 en, 1 deleted`.

- [ ] **Step 8: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/asset-state-review-ui.test.ts tests/data-quality-rule-form-ui.test.ts tests/dead-code-cleanup.test.ts tests/list-pages-ui.test.ts tests/thai-glossary.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (146 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" messages/th.json messages/en.json tests/admin-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx`, `messages/th.json`, `messages/en.json`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2037 tests, 2036 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 9: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" messages/th.json messages/en.json tests/admin-sweep-ui.test.ts
git commit -m "refactor(ui): data quality rule cards on the panel classes and StatusBadge, and the unread scanning label goes (2D-2 task 10b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 10c: `c/admin/data-quality-rule-form.tsx`

The rule form is a `ContentPanel` titled `${labels.enabled}: ${formatCount(enabledCount)}`, with the save `Button` as its action.

**Files:** Modify `src/components/admin/data-quality-rule-form.tsx`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 10: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("the data-quality rule form is a ContentPanel whose count goes through formatCount (spec 2D D9; 2B R-f)", () => {
  const source = read(`${C}admin/data-quality-rule-form.tsx`)
  assert.match(source, /<ContentPanel\n\s+title=\{`\$\{labels\.enabled\}: \$\{formatCount\(enabledCount\)\}`\}\n\s+actions=\{/)
  assert.doesNotMatch(source, /toLocaleString|<section className="rounded-lg/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts`
Expected: 1 failure, "the data-quality rule form is a ContentPanel whose count goes through formatCount (spec 2D D9; 2B R-f)".

- [ ] **Step 11: The form.** In `src/components/admin/data-quality-rule-form.tsx` (CRLF):

(1) Replace

```tsx
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { NativeSelect } from "@/components/ui/native-select"
import { assetDataQualityRulesKey, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { cn } from "@/lib/utils"

type DataQualityRuleFormProps = {
```

with

```tsx
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { NativeSelect } from "@/components/ui/native-select"
import { assetDataQualityRulesKey, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type DataQualityRuleFormProps = {
```

(2) Replace

```tsx
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">{labels.enabled}: {enabledCount.toLocaleString("th-TH")}</h2>
        </div>
        <Button busy={saving} onClick={save} className="w-fit">
          <Save aria-hidden="true" />
          {labels.save}
        </Button>
      </div>
      <div className="grid gap-3">
        {items.map((rule) => (
          <div key={rule.key} className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
```

with

```tsx
  }

  return (
    <ContentPanel
      title={`${labels.enabled}: ${formatCount(enabledCount)}`}
      actions={
        <Button busy={saving} onClick={save} className="w-fit">
          <Save aria-hidden="true" />
          {labels.save}
        </Button>
      }
    >
      <div className="grid gap-3">
        {items.map((rule) => (
          <div key={rule.key} className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
```

(3) Replace

```tsx
          </div>
        ))}
      </div>
    </section>
  )
}
```

with

```tsx
          </div>
        ))}
      </div>
    </ContentPanel>
  )
}
```

- [ ] **Step 12: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/data-quality-rule-form-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (84 tests).
  - Run `node <temp>/eol.mjs src/components/admin/data-quality-rule-form.tsx tests/admin-sweep-ui.test.ts`. Expected: equal numbers for `src/components/admin/data-quality-rule-form.tsx`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2038 tests, 2037 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 13: Commit.**

```bash
git add src/components/admin/data-quality-rule-form.tsx tests/admin-sweep-ui.test.ts
git commit -m "refactor(ui): the data quality rule form is a ContentPanel (2D-2 task 10c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Readiness (`D/admin/readiness/page.tsx`)

Spec D7, D9, M30. One commit. The checklist is a `ContentPanel`; the scope note is an info `Notice`; each check is a neutral card (`rounded-md border border-border bg-background`, no tone fill) with a `StatusBadge` from `checkTone` (pass/warning/fail → success/warning/danger, R6). The 2D-1 outline `md` link of each check stays. The local tone-class helpers are deleted.

**Files:** Modify `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("readiness: the checklist is a ContentPanel of neutral cards with a status badge, and the scope note is an info Notice (spec 2D D7, D9)", () => {
  const source = read(`${D}admin/readiness/page.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("checklistTitle"\)\} description=\{t\("checklistDescription"\)\}>/)
  assert.match(source, /<Notice tone="info" title=\{t\("scopeTitle"\)\}>/)
  assert.match(source, /<article className="min-w-0 rounded-md border border-border bg-background p-4">/)
  assert.match(source, /<StatusBadge label=\{labels\.status\} tone=\{checkTone\(check\.status\)\} \/>/)
  assert.doesNotMatch(source, /rounded-full|rounded-lg border|bg-(?:success|warning|danger|primary)-soft|function (?:checkCardClass|statusPillClass|statusIcon)\b/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts`
Expected: 1 failure, "readiness: the checklist is a ContentPanel of neutral cards with a status badge, and the scope note is an info Notice (spec 2D D7, D9)".

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/admin/readiness/page.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { AlertTriangle, ArrowRight, CheckCircle2, Database, ShieldCheck, XCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { buildApprovalPermissionMatrix } from "@/lib/approval-permission-matrix"
```

with

```tsx
import Link from "next/link"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { buildApprovalPermissionMatrix } from "@/lib/approval-permission-matrix"
```

(2) Replace

```tsx
  systemSettingDefaults,
} from "@/lib/system-setting-defaults"
import { parseWorkflowApprovalPolicy } from "@/lib/workflow-approval"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"

type ProductionReadinessPageProps = {
  params: Promise<{ locale: string }>
```

with

```tsx
  systemSettingDefaults,
} from "@/lib/system-setting-defaults"
import { parseWorkflowApprovalPolicy } from "@/lib/workflow-approval"
import { ContentPanel } from "@/components/ui/content-panel"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"

type ProductionReadinessPageProps = {
  params: Promise<{ locale: string }>
```

(3) Replace

```tsx
        ]}
      />

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-primary-border bg-primary-soft p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("checklistTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("checklistDescription")}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {checks.map((check) => (
            <ReadinessCheckCard
              key={check.key}
```

with

```tsx
        ]}
      />

      <ContentPanel title={t("checklistTitle")} description={t("checklistDescription")}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {checks.map((check) => (
            <ReadinessCheckCard
              key={check.key}
```

(4) Replace

```tsx
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-border bg-background p-2 text-muted-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("scopeTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("scopeDescription")}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
```

with

```tsx
            />
          ))}
        </div>
      </ContentPanel>

      {/* D7: what the checks cover is information, an info Notice with no box. */}
      <Notice tone="info" title={t("scopeTitle")}>
        {t("scopeDescription")}
      </Notice>
    </div>
  )
}
```

(5) Replace

```tsx
  }
}) {
  return (
    <article className={`min-w-0 rounded-lg border p-4 ${checkCardClass(check.status)}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
        </div>
        <span className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${statusPillClass(check.status)}`}>
          {statusIcon(check.status)}
          {labels.status}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
```

with

```tsx
  }
}) {
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
        </div>
        <StatusBadge label={labels.status} tone={checkTone(check.status)} />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
```

(6) Replace

```tsx
  }
}

function statusIcon(status: ProductionReadinessCheck["status"]) {
  if (status === "pass") return <CheckCircle2 className="h-3 w-3" />
  if (status === "warning") return <AlertTriangle className="h-3 w-3" />
  return <XCircle className="h-3 w-3" />
}

function checkCardClass(status: ProductionReadinessCheck["status"]) {
  if (status === "pass") return "border-success-border bg-success-soft"
  if (status === "warning") return "border-warning-border bg-warning-soft"
  return "border-danger-border bg-danger-soft"
}

function statusPillClass(status: ProductionReadinessCheck["status"]) {
  if (status === "pass") return "bg-success-soft text-success"
  if (status === "warning") return "bg-warning-soft text-warning"
  return "bg-danger-soft text-danger"
}
```

with

```tsx
  }
}

// The check's state is its badge (no tinted card): pass is calm, warning and fail need action.
function checkTone(status: ProductionReadinessCheck["status"]): StatusTone {
  if (status === "pass") return "success"
  if (status === "warning") return "warning"
  return "danger"
}
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/dead-code-cleanup.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (139 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/admin/readiness/page.tsx" tests/admin-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2039 tests, 2038 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/readiness/page.tsx" tests/admin-sweep-ui.test.ts
git commit -m "refactor(ui): readiness checks are neutral cards with a StatusBadge and the scope note an info Notice (2D-2 task 11)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Approvals

Spec D7, D9, M22, M30. Two commits.

#### 12a: `D/admin/approvals/page.tsx`

- **Policy:** a `KeyValueList` whose two switches are `StatusBadge`s (`disposalPolicyOn`, `auditPolicyOn`: success/muted).
- **Approver matrix:** a `ContentPanel` with its roles link as the action. The matrix cards are neutral, with a `StatusBadge` from `matrixTone` (ready/thin/missing → success/warning/danger, R6); the modules and approvers are `Chip`s.
- **Inbox rows:** the age is a `StatusBadge` (overdue → danger, otherwise muted); hover is `hover:bg-row-hover`. The module names come from `t("disposal")`/`t("audit")` through `labels.modules`. `ApprovalInboxRow` loses its unused `locale` prop.

**Files:** Modify `src/app/[locale]/(dashboard)/admin/approvals/page.tsx`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("approval inbox: the policy is a KeyValueList with status badges, matrix cards are neutral, modules and approvers are Chips (spec 2D D7, D9, M30)", () => {
  const source = read(`${D}admin/approvals/page.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("policyTitle"\)\} description=\{t\("policyDescription"\)\}>\n\s+<KeyValueList/)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("approverMatrixTitle"\)\}/)
  assert.match(source, /modules: \{ disposal: t\("disposal"\), audit: t\("audit"\) \},/)
  assert.match(source, /<Chip>\{labels\.modules\[item\.module\]\}<\/Chip>/)
  assert.match(source, /tone=\{ageStatus\.isOverdue \? "danger" : "muted"\}/)
  assert.match(source, /<StatusBadge label=\{labels\.status\} tone=\{matrixTone\(item\.status\)\} \/>/)
  assert.match(source, /<Chip key=\{approver\}>\{approver\}<\/Chip>/)
  assert.doesNotMatch(source, /rounded-full|rounded-lg border|bg-(?:success|warning|danger|primary)-soft|text-danger|function (?:PolicyBadge|moduleLabel|toneClass|pillClass|matrixCardClass|matrixStatusClass|matrixStatusIcon)\b|hover:bg-accent|"ตัดจำหน่าย"/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts`
Expected: 1 failure, "approval inbox: the policy is a KeyValueList with status badges, matrix cards are neutral, modules and approvers are Chips (spec 2D D7, D9, M30)".

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/admin/approvals/page.tsx` (CRLF):

(1) Replace

```tsx
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, History, ShieldCheck, Trash2, Users } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalAgeStatus, sortApprovalInboxItemsByAge } from "@/lib/approval-aging"
```

with

```tsx
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ChevronRight, ClipboardCheck, FileCheck2, History, ShieldCheck, Trash2, Users } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalAgeStatus, sortApprovalInboxItemsByAge } from "@/lib/approval-aging"
```

(2) Replace

```tsx
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalInboxPageProps = {
```

with

```tsx
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalInboxPageProps = {
```

(3) Replace

```tsx
    label: t(`filter_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))

  return (
    <div className="space-y-6">
```

with

```tsx
    label: t(`filter_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))
  const disposalPolicyOn = policy.disposalRequired && access.canApproveDisposal
  const auditPolicyOn = policy.auditCloseRequired && access.canApproveAudit

  return (
    <div className="space-y-6">
```

(4) Replace

```tsx
        ]}
      />

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("policyTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("policyDescription")}</p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <PolicyBadge label={t("policyDisposal")} enabled={policy.disposalRequired && access.canApproveDisposal} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <PolicyBadge label={t("policyAuditClose")} enabled={policy.auditCloseRequired && access.canApproveAudit} enabledLabel={t("enabled")} disabledLabel={t("disabled")} />
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("minApprovers")}</div>
              <div className="font-semibold text-foreground">
                {policy.minApprovers} / {policy.segregationRequired ? t("sodOn") : t("sodOff")}
              </div>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">{t("approvalSla")}</div>
              <div className="font-semibold text-foreground">{t("slaDays", { days: policy.slaDays })}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("approverMatrixTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("approverMatrixDescription", { min: policy.minApprovers })}</p>
          </div>
          <Link href={`/${locale}/admin/roles`} className={buttonVariants({ variant: "outline", size: "md" })}>
            <Users aria-hidden="true" />
            {t("manageRoles")}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {approverMatrix.map((item) => (
            <ApproverMatrixCard
              key={item.key}
```

with

```tsx
        ]}
      />

      {/* The policy in effect: facts as label and value pairs, on and off as status badges (no tinted boxes). */}
      <ContentPanel title={t("policyTitle")} description={t("policyDescription")}>
        <KeyValueList
          items={[
            { key: "disposal", label: t("policyDisposal"), value: <StatusBadge label={disposalPolicyOn ? t("enabled") : t("disabled")} tone={disposalPolicyOn ? "success" : "muted"} /> },
            { key: "auditClose", label: t("policyAuditClose"), value: <StatusBadge label={auditPolicyOn ? t("enabled") : t("disabled")} tone={auditPolicyOn ? "success" : "muted"} /> },
            { key: "minApprovers", label: t("minApprovers"), value: `${formatCount(policy.minApprovers)} / ${policy.segregationRequired ? t("sodOn") : t("sodOff")}` },
            { key: "sla", label: t("approvalSla"), value: t("slaDays", { days: policy.slaDays }) },
          ]}
        />
      </ContentPanel>

      <ContentPanel
        title={t("approverMatrixTitle")}
        description={t("approverMatrixDescription", { min: policy.minApprovers })}
        actions={
          <Link href={`/${locale}/admin/roles`} className={buttonVariants({ variant: "outline", size: "md" })}>
            <Users aria-hidden="true" />
            {t("manageRoles")}
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {approverMatrix.map((item) => (
            <ApproverMatrixCard
              key={item.key}
```

(5) Replace

```tsx
            />
          ))}
        </div>
      </section>

      <ContentPanel
        divided
```

with

```tsx
            />
          ))}
        </div>
      </ContentPanel>

      <ContentPanel
        divided
```

(6) Replace

```tsx
              <ApprovalInboxRow
                key={item.id}
                item={item}
                locale={locale}
                slaDays={policy.slaDays}
                labels={{
                  requestedBy: t("requestedBy"),
                  requestedAt: t("requestedAt"),
                  waitingDays: (days) => t("waitingDays", { days }),
```

with

```tsx
              <ApprovalInboxRow
                key={item.id}
                item={item}
                slaDays={policy.slaDays}
                labels={{
                  modules: { disposal: t("disposal"), audit: t("audit") },
                  requestedBy: t("requestedBy"),
                  requestedAt: t("requestedAt"),
                  waitingDays: (days) => t("waitingDays", { days }),
```

(7) Replace

```tsx
  )
}

function ApprovalInboxRow({
  item,
  locale,
  slaDays,
  labels,
}: {
  item: ApprovalInboxItem
  locale: string
  slaDays: number
  labels: {
    requestedBy: string
    requestedAt: string
    waitingDays: (days: number) => string
```

with

```tsx
  )
}

// A row is one link (2B bug §5.10 #3). The module is a name, so a Chip; only an overdue request is a danger badge.
function ApprovalInboxRow({
  item,
  slaDays,
  labels,
}: {
  item: ApprovalInboxItem
  slaDays: number
  labels: {
    modules: Record<ApprovalInboxItem["module"], string>
    requestedBy: string
    requestedAt: string
    waitingDays: (days: number) => string
```

(8) Replace

```tsx
}) {
  const ageStatus = getApprovalAgeStatus(item.requestedAt, new Date(), slaDays)
  return (
    <Link href={item.href} className="block p-5 transition-colors hover:bg-accent">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-1 rounded-md border p-2 ${toneClass(item.tone)}`}>{kindIcon(item.kind)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pillClass(item.tone)}`}>{moduleLabel(item.module, locale)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ageStatus.isOverdue ? "bg-danger-soft text-danger" : "bg-muted text-muted-foreground"}`}>
                {ageStatus.isOverdue ? labels.overdueDays(ageStatus.daysOverdue) : labels.waitingDays(ageStatus.ageDays)}
              </span>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
```

with

```tsx
}) {
  const ageStatus = getApprovalAgeStatus(item.requestedAt, new Date(), slaDays)
  return (
    <Link href={item.href} className="block p-5 transition-colors hover:bg-row-hover">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div aria-hidden="true" className="mt-1 text-muted-foreground">{kindIcon(item.kind)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{labels.modules[item.module]}</Chip>
              <StatusBadge
                label={ageStatus.isOverdue ? labels.overdueDays(ageStatus.daysOverdue) : labels.waitingDays(ageStatus.ageDays)}
                tone={ageStatus.isOverdue ? "danger" : "muted"}
              />
              <h3 className="font-semibold text-foreground">{item.title}</h3>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
```

(9) Replace

```tsx
  )
}

function PolicyBadge({
  label,
  enabled,
  enabledLabel,
  disabledLabel,
}: {
  label: string
  enabled: boolean
  enabledLabel: string
  disabledLabel: string
}) {
  return (
    <div className={`rounded-md border px-3 py-2 ${enabled ? "border-success-border bg-success-soft" : "border-border bg-background"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${enabled ? "text-success" : "text-muted-foreground"}`}>
        {enabled ? enabledLabel : disabledLabel}
      </div>
    </div>
  )
}

function ApproverMatrixCard({
  item,
  labels,
```

with

```tsx
  )
}

function ApproverMatrixCard({
  item,
  labels,
```

(10) Replace

```tsx
  const visibleApprovers = item.approverLabels.slice(0, 4)
  const hiddenApproverCount = item.approverLabels.length - visibleApprovers.length

  return (
    <div className={`rounded-lg border p-4 ${matrixCardClass(item.status)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{labels.workflow}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.approverCount(item.approverCount)}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${matrixStatusClass(item.status)}`}>
          {matrixStatusIcon(item.status)}
          {labels.status}
        </span>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
```

with

```tsx
  const visibleApprovers = item.approverLabels.slice(0, 4)
  const hiddenApproverCount = item.approverLabels.length - visibleApprovers.length

  // A neutral card in the panel; the coverage is its status badge (ready, thin, missing).
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{labels.workflow}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.approverCount(item.approverCount)}</p>
        </div>
        <StatusBadge label={labels.status} tone={matrixTone(item.status)} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
```

(11) Replace

```tsx
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.approvers}</div>
          {visibleApprovers.length === 0 ? (
            <div className="mt-1 text-danger">{labels.noApprovers}</div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleApprovers.map((approver) => (
                <span key={approver} className="rounded-full bg-background px-2 py-1 text-xs font-medium text-foreground">
                  {approver}
                </span>
              ))}
              {hiddenApproverCount > 0 ? (
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  {labels.moreApprovers(hiddenApproverCount)}
                </span>
              ) : null}
            </div>
          )}
```

with

```tsx
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.approvers}</div>
          {visibleApprovers.length === 0 ? (
            <div className="mt-1 text-muted-foreground">{labels.noApprovers}</div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {visibleApprovers.map((approver) => (
                <Chip key={approver}>{approver}</Chip>
              ))}
              {hiddenApproverCount > 0 ? (
                <span className="text-meta text-muted-foreground">{labels.moreApprovers(hiddenApproverCount)}</span>
              ) : null}
            </div>
          )}
```

(12) Replace

```tsx
  return <ClipboardCheck className="h-4 w-4" />
}

function moduleLabel(module: ApprovalInboxItem["module"], locale: string) {
  const labels = {
    th: { disposal: "ตัดจำหน่าย", audit: "ตรวจนับ" },
    en: { disposal: "Disposal", audit: "Audit" },
  }
  return (locale === "th" ? labels.th : labels.en)[module]
}

function toneClass(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return "border-danger-border bg-danger-soft text-danger"
  if (tone === "warning") return "border-warning-border bg-warning-soft text-warning"
  return "border-primary-border bg-primary-soft text-primary"
}

function pillClass(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return "bg-danger-soft text-danger"
  if (tone === "warning") return "bg-warning-soft text-warning"
  return "bg-primary-soft text-primary"
}

function matrixCardClass(status: ApprovalPermissionMatrixItem["status"]) {
  if (status === "missing") return "border-danger-border bg-danger-soft"
  if (status === "thin") return "border-warning-border bg-warning-soft"
  return "border-success-border bg-success-soft"
}

function matrixStatusClass(status: ApprovalPermissionMatrixItem["status"]) {
  if (status === "missing") return "bg-danger-soft text-danger"
  if (status === "thin") return "bg-warning-soft text-warning"
  return "bg-success-soft text-success"
}

function matrixStatusIcon(status: ApprovalPermissionMatrixItem["status"]) {
  if (status === "ready") return <CheckCircle2 className="h-3 w-3" />
  return <AlertTriangle className="h-3 w-3" />
}
```

with

```tsx
  return <ClipboardCheck className="h-4 w-4" />
}

function matrixTone(status: ApprovalPermissionMatrixItem["status"]): StatusTone {
  if (status === "missing") return "danger"
  if (status === "thin") return "warning"
  return "success"
}
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (133 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/admin/approvals/page.tsx" tests/admin-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/admin/approvals/page.tsx`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2040 tests, 2039 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/approvals/page.tsx" tests/admin-sweep-ui.test.ts
git commit -m "refactor(ui): the approval inbox policy is a KeyValueList, matrix cards are neutral and names are Chips (2D-2 task 12a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 12b: `D/admin/approvals/history/page.tsx`

- The filter panel is a `ContentPanel`.
- A row shows its module as a `Chip` and the decision as a `StatusBadge` from `decisionTone`: approve/reject/execute/close → success/danger/primary/neutral (close is no longer warning-tinted, R6).
- The record link and the details toggle are text links (the `summary` keeps `list-item`), and the changes inside a row are a `DataTable`.

**Files:** Modify `src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 5: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("approval history: the filter panel is a ContentPanel, a row shows a module Chip and a decision badge, and its changes are a DataTable (spec 2D D7, D9)", () => {
  const source = read(`${D}admin/approvals/history/page.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("filterTitle"\)\} description=\{t\("filterDescription"\)\}>/)
  assert.match(source, /<Chip>\{item\.moduleLabel\}<\/Chip>/)
  assert.match(source, /<StatusBadge label=\{item\.actionLabel\} tone=\{decisionTone\(item\.decision\)\} \/>/)
  assert.match(source, /<summary className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "list-item cursor-pointer text-sm"\)\}>/)
  assert.match(source, /<DataTable caption=\{labels\.viewDetails\}>/)
  assert.doesNotMatch(source, /<table\b|<thead\b|<th\b|rounded-full|hover:underline|rounded-lg border|function (?:decisionClass|decisionPillClass)\b|bg-(?:success|warning|danger|primary)-soft/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts`
Expected: 1 failure, "approval history: the filter panel is a ContentPanel, a row shows a module Chip and a decision badge, and its changes are a DataTable (spec 2D D7, D9)".

- [ ] **Step 6: The page.** In `src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx` (CRLF):

(1) Replace

```tsx
import { paginationRange } from "@/lib/master-data-query"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTableFoot } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalHistoryPageProps = {
```

with

```tsx
import { paginationRange } from "@/lib/master-data-query"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { cn, formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalHistoryPageProps = {
```

(2) Replace

```tsx
        ]}
      />

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-foreground">{t("filterTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("filterDescription")}</p>
          </div>
          <FilterGroup
            label={t("moduleFilter")}
            options={moduleOptions}
```

with

```tsx
        ]}
      />

      <ContentPanel title={t("filterTitle")} description={t("filterDescription")}>
        <div className="flex flex-col gap-4">
          <FilterGroup
            label={t("moduleFilter")}
            options={moduleOptions}
```

(3) Replace

```tsx
            pageSize={listPage.pageSize}
          />
        </div>
      </section>

      <ContentPanel
        divided
```

with

```tsx
            pageSize={listPage.pageSize}
          />
        </div>
      </ContentPanel>

      <ContentPanel
        divided
```

(4) Replace

```tsx
    <article className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-1 rounded-md border p-2 ${decisionClass(item.decision)}`}>{decisionIcon(item.decision)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{item.moduleLabel}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${decisionPillClass(item.decision)}`}>{item.actionLabel}</span>
              {item.href ? (
                <Link href={item.href} className="font-semibold text-primary hover:underline">
                  {item.recordLabel}
                </Link>
              ) : (
```

with

```tsx
    <article className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div aria-hidden="true" className="mt-1 text-muted-foreground">{decisionIcon(item.decision)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{item.moduleLabel}</Chip>
              <StatusBadge label={item.actionLabel} tone={decisionTone(item.decision)} />
              {item.href ? (
                <Link href={item.href} className={cn(linkVariants({ size: "inherit" }), "font-semibold")}>
                  {item.recordLabel}
                </Link>
              ) : (
```

(5) Replace

```tsx

        {(item.changes.length > 0 || item.remark) ? (
          <details className="shrink-0 lg:w-[28rem]">
            <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">{labels.viewDetails}</summary>
            <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3">
              {item.changes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="pb-1 pr-3 text-left font-medium">{labels.field}</th>
                        <th className="pb-1 pr-3 text-left font-medium">{labels.before}</th>
                        <th className="pb-1 text-left font-medium">{labels.after}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {item.changes.map((change, index) => (
                        <tr key={`${item.id}-${change.field}-${index}`}>
                          <td className="py-1.5 pr-3 text-foreground">{change.field}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{change.before}</td>
                          <td className="py-1.5 text-foreground">{change.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {item.remark ? (
                <p className="text-xs">
                  <span className="font-medium text-foreground">{labels.remark}:</span> {item.remark}
                </p>
              ) : null}
```

with

```tsx

        {(item.changes.length > 0 || item.remark) ? (
          <details className="shrink-0 lg:w-[28rem]">
            {/* list-item keeps the disclosure triangle that linkVariants' inline display would hide. */}
            <summary className={cn(linkVariants({ size: "inherit" }), "list-item cursor-pointer text-sm")}>{labels.viewDetails}</summary>
            <div className="mt-2 space-y-2">
              {item.changes.length > 0 ? (
                <DataTable caption={labels.viewDetails}>
                  <DataTableHeader>
                    <tr>
                      <DataTableHead>{labels.field}</DataTableHead>
                      <DataTableHead>{labels.before}</DataTableHead>
                      <DataTableHead>{labels.after}</DataTableHead>
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {item.changes.map((change, index) => (
                      <DataTableRow key={`${item.id}-${change.field}-${index}`}>
                        <DataTableCell className="text-foreground">{change.field}</DataTableCell>
                        <DataTableCell className="text-muted-foreground">{change.before}</DataTableCell>
                        <DataTableCell className="text-foreground">{change.after}</DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              ) : null}
              {item.remark ? (
                <p className="text-meta">
                  <span className="font-medium text-foreground">{labels.remark}:</span> {item.remark}
                </p>
              ) : null}
```

(6) Replace

```tsx
  return <ClipboardList className="h-4 w-4" />
}

function decisionClass(decision: ApprovalDecision) {
  if (decision === "approve") return "border-success-border bg-success-soft text-success"
  if (decision === "reject") return "border-danger-border bg-danger-soft text-danger"
  if (decision === "execute") return "border-primary-border bg-primary-soft text-primary"
  return "border-warning-border bg-warning-soft text-warning"
}

function decisionPillClass(decision: ApprovalDecision) {
  if (decision === "approve") return "bg-success-soft text-success"
  if (decision === "reject") return "bg-danger-soft text-danger"
  if (decision === "execute") return "bg-primary-soft text-primary"
  return "bg-warning-soft text-warning"
}
```

with

```tsx
  return <ClipboardList className="h-4 w-4" />
}

// A decision is a past state: calm badges, red only for a rejection; closing a round is neutral (not a warning).
function decisionTone(decision: ApprovalDecision): StatusTone {
  if (decision === "approve") return "success"
  if (decision === "reject") return "danger"
  if (decision === "execute") return "primary"
  return "neutral"
}
```

- [ ] **Step 7: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (134 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx" tests/admin-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2041 tests, 2040 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 8: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx" tests/admin-sweep-ui.test.ts
git commit -m "refactor(ui): approval history on ContentPanel, Chip, StatusBadge and DataTable (2D-2 task 12b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The system log (`D/admin/logs/page.tsx`)

Spec M29, D7. One commit. The record link is a `linkVariants` link, the details toggle a `summary` with `cn(linkVariants(), "list-item cursor-pointer")`, and the changes inside a row a `DataTable`. The filters and `buildSystemLogFilterHref` do not change (2D-1 R5 f).

**Files:** Modify `src/app/[locale]/(dashboard)/admin/logs/page.tsx`, `tests/admin-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/admin-sweep-ui.test.ts`:

```ts

test("system log: the record link and the details toggle are text links, and the changes inside a row are a DataTable (spec 2D M29)", () => {
  const source = read(`${D}admin/logs/page.tsx`)
  assert.match(source, /<Link href=\{log\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /<summary className=\{cn\(linkVariants\(\), "list-item cursor-pointer"\)\}>/)
  assert.match(source, /<DataTable caption=\{t\("viewDetails"\)\}>/)
  assert.doesNotMatch(source, /<table\b|<thead\b|<th\b|hover:underline|rounded-md border border-border bg-background p-3/)
})
```

Run: `node --test tests/admin-sweep-ui.test.ts`
Expected: 1 failure, "system log: the record link and the details toggle are text links, and the changes inside a row are a DataTable (spec 2D M29)".

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/admin/logs/page.tsx` (CRLF):

(1) Replace

```tsx
} from "@/lib/system-log-history"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation } from "@/lib/system-log-presenter"
import { formatDateTime } from "@/lib/utils"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
```

with

```tsx
} from "@/lib/system-log-history"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation } from "@/lib/system-log-presenter"
import { cn, formatDateTime } from "@/lib/utils"
import { linkVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
```

(2) Replace

```tsx
                <DataTableCell className="whitespace-nowrap text-foreground">{log.actionLabel}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">
                  {log.href ? (
                    <Link href={log.href} className="font-medium text-primary hover:underline">
                      {log.recordLabel}
                    </Link>
                  ) : (
```

with

```tsx
                <DataTableCell className="whitespace-nowrap text-foreground">{log.actionLabel}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">
                  {log.href ? (
                    <Link href={log.href} className={linkVariants({ size: "inherit" })}>
                      {log.recordLabel}
                    </Link>
                  ) : (
```

(3) Replace

```tsx
                    <p className="font-medium text-foreground">{log.summary}</p>
                    {(log.changes.length > 0 || log.remark) ? (
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                          {t("viewDetails")}
                        </summary>
                        <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3">
                          {log.changes.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="pb-1 pr-3 text-left font-medium">{t("field")}</th>
                                    <th className="pb-1 pr-3 text-left font-medium">{t("before")}</th>
                                    <th className="pb-1 text-left font-medium">{t("after")}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {log.changes.map((change, index) => (
                                    <tr key={`${log.id}-${change.field}-${index}`}>
                                      <td className="py-1.5 pr-3 text-foreground">{change.field}</td>
                                      <td className="py-1.5 pr-3">{change.before}</td>
                                      <td className="py-1.5 text-foreground">{change.after}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : null}
                          {log.remark ? (
                            <p className="text-xs">
                              <span className="font-medium text-foreground">{t("remark")}:</span> {log.remark}
                            </p>
                          ) : null}
```

with

```tsx
                    <p className="font-medium text-foreground">{log.summary}</p>
                    {(log.changes.length > 0 || log.remark) ? (
                      <details className="group">
                        {/* list-item keeps the disclosure triangle that linkVariants' inline display would hide. */}
                        <summary className={cn(linkVariants(), "list-item cursor-pointer")}>
                          {t("viewDetails")}
                        </summary>
                        <div className="mt-2 space-y-2">
                          {log.changes.length > 0 ? (
                            <DataTable caption={t("viewDetails")}>
                              <DataTableHeader>
                                <tr>
                                  <DataTableHead>{t("field")}</DataTableHead>
                                  <DataTableHead>{t("before")}</DataTableHead>
                                  <DataTableHead>{t("after")}</DataTableHead>
                                </tr>
                              </DataTableHeader>
                              <DataTableBody>
                                {log.changes.map((change, index) => (
                                  <DataTableRow key={`${log.id}-${change.field}-${index}`}>
                                    <DataTableCell className="text-foreground">{change.field}</DataTableCell>
                                    <DataTableCell>{change.before}</DataTableCell>
                                    <DataTableCell className="text-foreground">{change.after}</DataTableCell>
                                  </DataTableRow>
                                ))}
                              </DataTableBody>
                            </DataTable>
                          ) : null}
                          {log.remark ? (
                            <p className="text-meta">
                              <span className="font-medium text-foreground">{t("remark")}:</span> {log.remark}
                            </p>
                          ) : null}
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/admin-sweep-ui.test.ts tests/list-filters-ui.test.ts tests/list-pages-ui.test.ts tests/system-log-history.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (144 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/admin/logs/page.tsx" tests/admin-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/admin/logs/page.tsx`; `0 <n>` for `tests/admin-sweep-ui.test.ts` (LF).
  - Run `npm test` (2042 tests, 2041 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/logs/page.tsx" tests/admin-sweep-ui.test.ts
git commit -m "refactor(ui): system log links are text links and a row's changes a DataTable (2D-2 task 13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Access denied (`D/access-denied/page.tsx`, 2D-1 R3)

Spec D7, M29; 2D-1 R3 hand-on. One commit, no new test (the existing access-denied test in `tests/list-pages-ui.test.ts` pins the change). The required permission is a neutral `Notice` (`justify-center`), and the two links are `buttonVariants` `size: "md"` (were `lg`).

**Files:** Modify `src/app/[locale]/(dashboard)/access-denied/page.tsx`, `tests/list-pages-ui.test.ts`

- [ ] **Step 1: The failing test.** In `tests/list-pages-ui.test.ts` (CRLF):

Replace

```ts
test("access denied: the permission empty state with its two links on the shared button look (spec 2B §4.4.7)", () => {
  const source = read(`${D}access-denied/page.tsx`)
  assert.match(source, /<ActionEmptyState\n\s+tone="permission"/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/dashboard`\} className=\{buttonVariants\(\{ size: "lg" \}\)\}>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center`\} className=\{buttonVariants\(\{ variant: "outline", size: "lg" \}\)\}>/)
  assert.doesNotMatch(source, /font-mono|\bbg-primary\b|hover:bg-accent|<h1\b/)
})

// Plan 2B-5 Task 7 (spec 2B §5.6 row notifications, bug §5.10 #1, R-d, O17): the notification center. A delivered
```

with

```ts
test("access denied: the permission empty state with its two links on the shared button look (spec 2B §4.4.7)", () => {
  const source = read(`${D}access-denied/page.tsx`)
  assert.match(source, /<ActionEmptyState\n\s+tone="permission"/)
  // md since plan 2D-2 (D6: lg only beside a 40px field); the required permission is a neutral Notice (D7).
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/dashboard`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<Notice tone="neutral" className="justify-center">/)
  assert.doesNotMatch(source, /font-mono|\bbg-primary\b|hover:bg-accent|<h1\b|rounded-md border|size: "lg"/)
})

// Plan 2B-5 Task 7 (spec 2B §5.6 row notifications, bug §5.10 #1, R-d, O17): the notification center. A delivered
```

Run: `node --test tests/list-pages-ui.test.ts`
Expected: 1 failure, "access denied: the permission empty state with its two links on the shared button look (spec 2B §4.4.7)".

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/access-denied/page.tsx` (CRLF):

(1) Replace

```tsx
import { getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"

type AccessDeniedPageProps = {
  params: Promise<{ locale: string }>
```

with

```tsx
import { getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"

type AccessDeniedPageProps = {
  params: Promise<{ locale: string }>
```

(2) Replace

```tsx
          title={t("title")}
          description={t("description")}
          details={permission ? (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              {t("requestedPermission", { permission })}
            </p>
          ) : null}
          action={(
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Link href={`/${locale}/dashboard`} className={buttonVariants({ size: "lg" })}>
                {t("backDashboard")}
              </Link>
              <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                {t("openWorkCenter")}
              </Link>
            </div>
```

with

```tsx
          title={t("title")}
          description={t("description")}
          details={permission ? (
            // D7: what the user needs before acting is a neutral Notice, centred under the description.
            <Notice tone="neutral" className="justify-center">
              {t("requestedPermission", { permission })}
            </Notice>
          ) : null}
          action={(
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Link href={`/${locale}/dashboard`} className={buttonVariants({ size: "md" })}>
                {t("backDashboard")}
              </Link>
              <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "md" })}>
                {t("openWorkCenter")}
              </Link>
            </div>
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/asset-register-ux.test.ts tests/list-pages-ui.test.ts tests/system-state-views.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (140 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/access-denied/page.tsx" tests/list-pages-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/access-denied/page.tsx`, `tests/list-pages-ui.test.ts`.
  - Run `npm test` (2042 tests, 2041 pass, 1 skipped; no new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/access-denied/page.tsx" tests/list-pages-ui.test.ts
git commit -m "refactor(ui): access denied links are md and the required permission a neutral Notice (2D-2 task 14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: The notification center

Spec D9, M29, M30. Two commits.

#### 15a: `c/notifications/notification-center-actions.tsx`

The open link is `buttonVariants({ variant: "outline", size: "md" })`, and the two commands are outline `md` `Button`s that keep `disabled={isPending}`: `md`, beside the `md` assignee select. One transition drives both buttons and the select, so they show the shared disabled look and no spinner (2C O17).

**Files:** Modify `src/components/notifications/notification-center-actions.tsx` · Create `tests/reports-dashboard-sweep-ui.test.ts` (LF)

- [ ] **Step 1: The failing test.** Create `tests/reports-dashboard-sweep-ui.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D §3.2, D7, D9, D19, M21, M22, M29, M30, M31, R5 hand-on): notifications, reports, the dashboard and
// the work center on the shared parts. Panels are ContentPanel, numbers StatStrip, states StatusBadge, names Chip,
// buttons and button-shaped links Button or buttonVariants, text links linkVariants, empty states EmptyNote, and an
// /api download a plain <a>. Each test pins one file and fails before its commit. Sources are read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"

test("notification center actions: the open link and the two commands are outline md, with the shared disabled look (spec 2D M29)", () => {
  const source = read(`${C}notifications/notification-center-actions.tsx`)
  assert.match(source, /className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}/)
  assert.equal(source.match(/<Button\s+variant="outline"\s+size="md"/g)?.length, 2)
  assert.equal(source.match(/disabled=\{isPending\}/g)?.length, 3, "the two buttons and the assignee select")
  assert.doesNotMatch(source, /<button\b|disabled:opacity|\bh-9\b|hover:bg-accent/)
})
```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts`
Expected: 1 failure, "notification center actions: the open link and the two commands are outline md, with the shared disabled look (spec 2D M29)".

- [ ] **Step 2: The actions.** In `src/components/notifications/notification-center-actions.tsx` (CRLF):

(1) Replace

```tsx
import { useRouter } from "next/navigation"
import { Check, Clock3, ExternalLink, RotateCcw, UserRound } from "lucide-react"
import { toast } from "sonner"
import { NativeSelect } from "@/components/ui/native-select"
import {
  isPlainPrimaryClick,
```

with

```tsx
import { useRouter } from "next/navigation"
import { Check, Clock3, ExternalLink, RotateCcw, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import {
  isPlainPrimaryClick,
```

(2) Replace

```tsx
  return (
    <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        <Link
          href={item.href}
          onClick={(event) => void openItem(event)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
        >
          <ExternalLink className="h-4 w-4" />
          {labels.openItem}
        </Link>
        <button
          type="button"
          onClick={() => mutate({ action: item.isRead ? "unread" : "read" })}
          disabled={isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          {item.isRead ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {item.isRead ? labels.markUnread : labels.markRead}
        </button>
        <button
          type="button"
          onClick={() => mutate({ action: "snooze", snoozeHours: 24 })}
          disabled={isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          <Clock3 className="h-4 w-4" />
          {labels.snoozeOneDay}
        </button>
      </div>

      <label className="flex min-w-0 items-center gap-2 text-sm">
```

with

```tsx
  return (
    <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        {/* md, beside the md assignee select (36px from md, 44px below). One transition drives both buttons and the
            select, so they keep the shared disabled look instead of a spinner (2C O17). */}
        <Link
          href={item.href}
          onClick={(event) => void openItem(event)}
          className={buttonVariants({ variant: "outline", size: "md" })}
        >
          <ExternalLink aria-hidden="true" />
          {labels.openItem}
        </Link>
        <Button
          variant="outline"
          size="md"
          onClick={() => mutate({ action: item.isRead ? "unread" : "read" })}
          disabled={isPending}
        >
          {item.isRead ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}
          {item.isRead ? labels.markUnread : labels.markRead}
        </Button>
        <Button variant="outline" size="md" onClick={() => mutate({ action: "snooze", snoozeHours: 24 })} disabled={isPending}>
          <Clock3 aria-hidden="true" />
          {labels.snoozeOneDay}
        </Button>
      </div>

      <label className="flex min-w-0 items-center gap-2 text-sm">
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/notification-topbar-behavior.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (125 tests).
  - Run `node <temp>/eol.mjs src/components/notifications/notification-center-actions.tsx tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/components/notifications/notification-center-actions.tsx`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `npm test` (2043 tests, 2042 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/notifications/notification-center-actions.tsx tests/reports-dashboard-sweep-ui.test.ts
git commit -m "refactor(ui): notification center actions on Button (2D-2 task 15a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 15b: `D/notifications/page.tsx`

The notification cards take the panel classes (a card in a page grid, R4); the count is a `StatusBadge` with the item's tone (R6); `toneClass` goes.

**Files:** Modify `src/app/[locale]/(dashboard)/notifications/page.tsx`, `tests/reports-dashboard-sweep-ui.test.ts` (append)

- [ ] **Step 5: The failing test.** Append to `tests/reports-dashboard-sweep-ui.test.ts`:

```ts

test("notifications: the cards use the panel classes and the count is a StatusBadge (spec 2D D9, M30)", () => {
  const source = read(`${D}notifications/page.tsx`)
  assert.equal(source.match(/className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}/g)?.length, 2)
  assert.match(source, /<StatusBadge label=\{formatCount\(item\.count\)\} tone=\{item\.tone\} \/>/)
  assert.doesNotMatch(source, /function toneClass\b|rounded-full|rounded-lg border/)
})
```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts`
Expected: 1 failure, "notifications: the cards use the panel classes and the count is a StatusBadge (spec 2D D9, M30)".

- [ ] **Step 6: The page.** In `src/app/[locale]/(dashboard)/notifications/page.tsx` (CRLF):

(1) Replace

```tsx
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { getNotificationCenter } from "@/lib/notification-summary"
import { NotificationCenterActions } from "@/components/notifications/notification-center-actions"
import { buttonVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
```

with

```tsx
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { getNotificationCenter } from "@/lib/notification-summary"
import { cn } from "@/lib/utils"
import { NotificationCenterActions } from "@/components/notifications/notification-center-actions"
import { buttonVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
```

(2) Replace

```tsx
          <EmptyNote padded>{t("empty")}</EmptyNote>
        ) : (
          center.items.map((item) => (
            <article key={item.key} className="rounded-lg border bg-surface p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={item.isSuppressed ? "font-semibold text-muted-foreground" : "font-semibold text-foreground"}>{t(item.key)}</h2>
                    <span className={toneClass(item.tone)}>{formatCount(item.count)}</span>
                    {item.isRead ? <StatusBadge label={t("read")} tone="muted" /> : null}
                    {item.isSnoozed ? <StatusBadge label={t("snoozed")} tone="muted" /> : null}
                  </div>
```

with

```tsx
          <EmptyNote padded>{t("empty")}</EmptyNote>
        ) : (
          center.items.map((item) => (
            <article key={item.key} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={item.isSuppressed ? "font-semibold text-muted-foreground" : "font-semibold text-foreground"}>{t(item.key)}</h2>
                    <StatusBadge label={formatCount(item.count)} tone={item.tone} />
                    {item.isRead ? <StatusBadge label={t("read")} tone="muted" /> : null}
                    {item.isSnoozed ? <StatusBadge label={t("snoozed")} tone="muted" /> : null}
                  </div>
```

(3) Replace

```tsx
          <EmptyNote padded>{t("deliveredDigestEmpty")}</EmptyNote>
        ) : (
          deliveredNotifications.map((notification) => (
            <article key={notification.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
```

with

```tsx
          <EmptyNote padded>{t("deliveredDigestEmpty")}</EmptyNote>
        ) : (
          deliveredNotifications.map((notification) => (
            <article key={notification.id} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
```

(4) Replace

```tsx
  )
}

function toneClass(tone: "danger" | "warning" | "primary") {
  if (tone === "danger") return "rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger"
  if (tone === "warning") return "rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning"
  return "rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary"
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
```

with

```tsx
  )
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
```

- [ ] **Step 7: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (121 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/notifications/page.tsx" tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/notifications/page.tsx`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `npm test` (2044 tests, 2043 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 8: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/notifications/page.tsx" tests/reports-dashboard-sweep-ui.test.ts
git commit -m "refactor(ui): notification cards use the panel classes and their counts are StatusBadges (2D-2 task 15b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The reports

Spec D5, D7, D9, M29, M30, M31; 2D-1 R5 (`:74`). Five commits, one per file.

#### 16a: `c/reports/report-preset-controls.tsx`

The outer frame goes: the controls render inside the catalog's preset `ContentPanel` (Task 16b). The save button is `lg` beside its 40px name field (D5). The message is a danger `Notice` with `role="alert"`. A preset row's link is a `linkVariants` link, delete is an outline `icon-sm` `Button`, and "no presets" is an `EmptyNote`.

**Files:** Modify `src/components/reports/report-preset-controls.tsx`, `tests/reports-dashboard-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/reports-dashboard-sweep-ui.test.ts`:

```ts

test("report presets: lg save beside the 40px field, an outline icon-sm delete, a text-link row, an error Notice and EmptyNote (spec 2D M29, D5, D7)", () => {
  const source = read(`${C}reports/report-preset-controls.tsx`)
  assert.match(source, /<Button size="lg" onClick=\{savePreset\}>\n\s+<BookmarkPlus aria-hidden="true" \/>/)
  assert.match(source, /<Button variant="outline" size="icon-sm" onClick=\{\(\) => deletePreset\(preset\.id\)\} aria-label=\{`\$\{labels\.deletePreset\}: \$\{preset\.name\}`\}>/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "flex min-h-11 min-w-0 flex-1 items-center px-2 text-sm md:min-h-0 md:py-1"\)\}>\n\s+<span className="truncate">\{preset\.name\}<\/span>/)
  assert.match(source, /\{message \? <Notice tone="danger" role="alert" className="mt-2">\{message\}<\/Notice> : null\}/)
  assert.match(source, /<EmptyNote className="mt-4">\{labels\.savedPresetsEmpty\}<\/EmptyNote>/)
  assert.doesNotMatch(source, /<button\b|text-white|sm:h-|sm:w-8|sm:min-h-0|text-danger|hover:bg-danger-soft|rounded-md border border-border bg-background p-4/)
})
```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts`
Expected: 1 failure, "report presets: lg save beside the 40px field, an outline icon-sm delete, a text-link row, an error Notice and EmptyNote (spec 2D M29, D5, D7)".

- [ ] **Step 2: The controls.** In `src/components/reports/report-preset-controls.tsx` (CRLF):

(1) Replace

```tsx
import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { BookmarkPlus, Trash2 } from "lucide-react"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  buildReportPreset,
  buildReportPresetHref,
```

with

```tsx
import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { BookmarkPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { cn } from "@/lib/utils"
import {
  buildReportPreset,
  buildReportPresetHref,
```

(2) Replace

```tsx
    if (persist(presets.filter((preset) => preset.id !== id))) setMessage("")
  }

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label={labels.presetName} className="min-w-0 flex-1">
          <Input
```

with

```tsx
    if (persist(presets.filter((preset) => preset.id !== id))) setMessage("")
  }

  // It sits in the catalog's ContentPanel, so it has no frame of its own (D9). The save button shares a row with the
  // 40px name field, so it is lg (D3, D5); a preset row's delete icon is neutral at rest (K22).
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label={labels.presetName} className="min-w-0 flex-1">
          <Input
```

(3) Replace

```tsx
            maxLength={60}
          />
        </Field>
        <button
          type="button"
          onClick={savePreset}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:h-10 sm:min-h-0"
        >
          <BookmarkPlus className="h-4 w-4" />
          {labels.saveCurrentPreset}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{labels.savedPresetsDeviceOnly}</p>
      {message ? <p className="mt-2 text-sm text-danger" role="status">{message}</p> : null}

      {presets.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {presets.map((preset) => (
            <div key={preset.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-surface p-2">
              <Link href={buildReportPresetHref(locale, preset.query)} className="min-w-0 flex-1 truncate px-2 py-1 text-sm font-medium text-foreground hover:text-primary">
                {preset.name}
              </Link>
              <button
                type="button"
                onClick={() => deletePreset(preset.id)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-8 sm:w-8"
                aria-label={`${labels.deletePreset}: ${preset.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{labels.savedPresetsEmpty}</p>
      )}
    </div>
  )
```

with

```tsx
            maxLength={60}
          />
        </Field>
        <Button size="lg" onClick={savePreset}>
          <BookmarkPlus aria-hidden="true" />
          {labels.saveCurrentPreset}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{labels.savedPresetsDeviceOnly}</p>
      {message ? <Notice tone="danger" role="alert" className="mt-2">{message}</Notice> : null}

      {presets.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {presets.map((preset) => (
            <div key={preset.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-surface p-2">
              <Link href={buildReportPresetHref(locale, preset.query)} className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 min-w-0 flex-1 items-center px-2 text-sm md:min-h-0 md:py-1")}>
                <span className="truncate">{preset.name}</span>
              </Link>
              <Button variant="outline" size="icon-sm" onClick={() => deletePreset(preset.id)} aria-label={`${labels.deletePreset}: ${preset.name}`}>
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyNote className="mt-4">{labels.savedPresetsEmpty}</EmptyNote>
      )}
    </div>
  )
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/report-presets.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (83 tests).
  - Run `node <temp>/eol.mjs src/components/reports/report-preset-controls.tsx tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/components/reports/report-preset-controls.tsx`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `npm test` (2045 tests, 2044 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/reports/report-preset-controls.tsx tests/reports-dashboard-sweep-ui.test.ts
git commit -m "refactor(ui): report presets on Button, Notice, text links and EmptyNote, with no frame of their own (2D-2 task 16a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16b: `c/reports/reports-catalog-view.tsx`

Three `ContentPanel`s. The `/api` report and export links are plain `<a href download>` (M31). The cadence is a `Chip`; "not allowed" and the permission lines are `StatusBadge`s (muted, success/muted, R6). The empty list is an `EmptyNote`, and the details block takes the panel classes.

**Files:** Modify `src/components/reports/reports-catalog-view.tsx`, `tests/reports-dashboard-sweep-ui.test.ts` (append)

- [ ] **Step 5: The failing test.** Append to `tests/reports-dashboard-sweep-ui.test.ts`:

```ts

test("report catalog: three ContentPanels, /api downloads as plain <a>, the cadence a Chip and permissions as status badges (spec 2D D9, M29, M31)", () => {
  const source = read(`${C}reports/reports-catalog-view.tsx`)
  assert.equal(source.match(/<ContentPanel title=\{labels\.\w+\} description=\{labels\.\w+\}>/g)?.length, 3)
  assert.match(source, /<a href=\{report\.href\} download className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "mt-4 w-full sm:w-auto"\)\}>/)
  assert.match(source, /<a href=\{report\.exportHref\} download className=\{buttonVariants\(\{ size: "sm" \}\)\}>/)
  assert.match(source, /<Link href=\{report\.viewHref\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}>/)
  assert.match(source, /<Chip>\{report\.cadence\}<\/Chip>/)
  assert.match(source, /<EmptyNote>\{emptyLabel\}<\/EmptyNote>/)
  assert.match(source, /tone=\{permission\.allowed \? "success" : "muted"\}/)
  assert.doesNotMatch(source, /<Link href=\{report\.(?:href|exportHref)\}|border-dashed|rounded-full|function PermissionPill\b|text-white|sm:h-8|bg-(?:info|primary|success)-soft|rounded-lg border/)
})
```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts`
Expected: 1 failure, "report catalog: three ContentPanels, /api downloads as plain <a>, the cadence a Chip and permissions as status badges (spec 2D D9, M29, M31)".

- [ ] **Step 6: The view.** In `src/components/reports/reports-catalog-view.tsx` (CRLF):

(1) Replace

```tsx
import type React from "react"
import { Download } from "lucide-react"
import { ReportPresetControls } from "@/components/reports/report-preset-controls"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"

export type ReportRecurringExport = {
  key: string
```

with

```tsx
import type React from "react"
import { Download } from "lucide-react"
import { ReportPresetControls } from "@/components/reports/report-preset-controls"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

export type ReportRecurringExport = {
  key: string
```

(2) Replace

```tsx
    <div className="space-y-5">
      <StatStrip className="sm:max-w-sm" items={[{ key: "catalogItems", label: labels.catalogItems, value: formatCount(reportCount) }]} />

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{labels.assetPresetScopeTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.assetPresetScopeHelp}</p>
        </div>
        <ReportPresetControls
          locale={locale}
          currentQuery={currentQuery}
```

with

```tsx
    <div className="space-y-5">
      <StatStrip className="sm:max-w-sm" items={[{ key: "catalogItems", label: labels.catalogItems, value: formatCount(reportCount) }]} />

      <ContentPanel title={labels.assetPresetScopeTitle} description={labels.assetPresetScopeHelp}>
        <ReportPresetControls
          locale={locale}
          currentQuery={currentQuery}
```

(3) Replace

```tsx
            presetStorageFailed: labels.presetStorageFailed,
          }}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{labels.moduleExportScopeTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.moduleExportScopeHelp}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {recurringReports.map((report) => (
            <div key={report.key} className="rounded-md border border-border bg-background p-4">
```

with

```tsx
            presetStorageFailed: labels.presetStorageFailed,
          }}
        />
      </ContentPanel>

      <ContentPanel title={labels.moduleExportScopeTitle} description={labels.moduleExportScopeHelp}>
        <div className="grid gap-3 md:grid-cols-2">
          {recurringReports.map((report) => (
            <div key={report.key} className="rounded-md border border-border bg-background p-4">
```

(4) Replace

```tsx
                  <div className="text-sm font-semibold text-foreground">{report.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{report.owner}</div>
                </div>
                <span className="rounded-full bg-info-soft px-2 py-1 text-xs font-medium text-info">{report.cadence}</span>
              </div>
              {report.allowed ? (
                <Link href={report.href} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0 sm:w-auto">
                  <Download aria-hidden="true" className="h-3.5 w-3.5" />
                  {labels.runNow}
                </Link>
              ) : (
                <span className="mt-4 inline-flex h-8 items-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground">
                  {labels.notAllowed}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-foreground">{labels.reportCatalog}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.reportCatalogHelp}</p>
        </div>
        {categories.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {categories.map((category) => (
              <div key={category.key} className="rounded-md border border-border bg-background p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-md bg-primary-soft p-2 text-primary">{category.icon}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{category.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    <p className="mt-2 text-xs font-medium text-primary">{category.audience}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {category.reports.map((report) => (
                    <div key={report.key} className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-foreground">{report.label}</span>
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Link href={report.viewHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">
                          {labels.openReport}
                        </Link>
                        {report.exportHref && report.exportAllowed ? (
                          <Link href={report.exportHref} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary-hover sm:h-8 sm:min-h-0">
                            <Download aria-hidden="true" className="h-3.5 w-3.5" />
                            {report.exportLabel}
                          </Link>
                        ) : report.exportHref ? (
                          <span className="inline-flex h-8 items-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground">
                            {labels.notAllowed}
                          </span>
                        ) : null}
                      </div>
                    </div>
```

with

```tsx
                  <div className="text-sm font-semibold text-foreground">{report.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{report.owner}</div>
                </div>
                <Chip>{report.cadence}</Chip>
              </div>
              {/* An /api download is a plain <a> (M31): no prefetch and no client routing. */}
              {report.allowed ? (
                <a href={report.href} download className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full sm:w-auto")}>
                  <Download aria-hidden="true" />
                  {labels.runNow}
                </a>
              ) : (
                <StatusBadge label={labels.notAllowed} tone="muted" className="mt-4" />
              )}
            </div>
          ))}
        </div>
      </ContentPanel>

      <ContentPanel title={labels.reportCatalog} description={labels.reportCatalogHelp}>
        {categories.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {categories.map((category) => (
              <div key={category.key} className="rounded-md border border-border bg-background p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div aria-hidden="true" className="text-muted-foreground">{category.icon}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{category.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">{category.audience}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {category.reports.map((report) => (
                    <div key={report.key} className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-foreground">{report.label}</span>
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <Link href={report.viewHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          {labels.openReport}
                        </Link>
                        {report.exportHref && report.exportAllowed ? (
                          <a href={report.exportHref} download className={buttonVariants({ size: "sm" })}>
                            <Download aria-hidden="true" />
                            {report.exportLabel}
                          </a>
                        ) : report.exportHref ? (
                          <StatusBadge label={labels.notAllowed} tone="muted" />
                        ) : null}
                      </div>
                    </div>
```

(5) Replace

```tsx
            ))}
          </div>
        )}
      </section>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-base font-semibold text-foreground">{labels.permissionTitle}</summary>
        <p className="mt-2 text-sm text-muted-foreground">{labels.permissionHelp}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {permissions.map((permission) => (
            <PermissionPill
              key={permission.key}
              label={permission.label}
              allowed={permission.allowed}
              allowedLabel={labels.allowed}
              deniedLabel={labels.notAllowed}
            />
          ))}
        </div>
```

with

```tsx
            ))}
          </div>
        )}
      </ContentPanel>

      <details className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <summary className="cursor-pointer text-base font-semibold text-foreground">{labels.permissionTitle}</summary>
        <p className="mt-2 text-sm text-muted-foreground">{labels.permissionHelp}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {permissions.map((permission) => (
            <StatusBadge
              key={permission.key}
              label={`${permission.label}: ${permission.allowed ? labels.allowed : labels.notAllowed}`}
              tone={permission.allowed ? "success" : "muted"}
            />
          ))}
        </div>
```

(6) Replace

```tsx
    </div>
  )
}

function PermissionPill({
  label,
  allowed,
  allowedLabel,
  deniedLabel,
}: {
  label: string
  allowed: boolean
  allowedLabel: string
  deniedLabel: string
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${allowed ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>
      {label}: {allowed ? allowedLabel : deniedLabel}
    </span>
  )
}
```

with

```tsx
    </div>
  )
}
```

- [ ] **Step 7: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/reports-adaptive-ui.test.ts tests/reports-localization.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (99 tests).
  - Run `node <temp>/eol.mjs src/components/reports/reports-catalog-view.tsx tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/components/reports/reports-catalog-view.tsx`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `npm test` (2046 tests, 2045 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 8: Commit.**

```bash
git add src/components/reports/reports-catalog-view.tsx tests/reports-dashboard-sweep-ui.test.ts
git commit -m "refactor(ui): the report catalog on ContentPanel, plain download links, Chip and StatusBadge (2D-2 task 16b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16c: `c/reports/reports-operations-view.tsx`

- Four `ContentPanel`s; the cross-scope export is a plain `<a download>` (M31); empty lists are `EmptyNote`s.
- The asset and fix links are `linkVariants` text links that keep their 44px mobile target. The issue links are text links, and the remaining buttons are `sm`.
- The idle box is a neutral grouping.
- The inner `ReportTable` panels are quiet groupings with an `h3` (R4).
- The flags are warning `StatusBadge`s.

**Files:** Modify `src/components/reports/reports-operations-view.tsx`, `tests/reports-adaptive-ui.test.ts`, `tests/reports-dashboard-sweep-ui.test.ts` (append)

- [ ] **Step 9: The failing tests.** Append to `tests/reports-dashboard-sweep-ui.test.ts`:

```ts

test("report operations: ContentPanels, the cross-scope export as a plain <a>, text links for the fixes and warning badges for the flags (spec 2D D9, M29, M30, M31)", () => {
  const source = read(`${C}reports/reports-operations-view.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 4)
  assert.match(source, /<a href=\{crossScope\.exportHref\} download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<Link key=\{issue\.key\} href=\{issue\.href\} className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.match(source, /<StatusBadge key=\{label\} label=\{label\} tone="warning" \/>/)
  assert.match(source, /<Link href=\{asset\.primaryFixHref\} className=\{buttonVariants\(\{ size: "sm" \}\)\}>/)
  assert.match(source, /<h3 className="mb-3 text-sm font-semibold text-foreground">\{title\}<\/h3>/)
  assert.doesNotMatch(source, /border-dashed|rounded-full|bg-warning-soft|text-white|sm:h-|hover:underline|<Link\s+href=\{crossScope\.exportHref\}|rounded-lg border/)
})
```

In `tests/reports-adaptive-ui.test.ts` (CRLF), the two 44px pins read the `cn(linkVariants…)` class:

(1) Replace

```ts

  assert.match(
    crossScopePreview,
    /className="flex min-h-11 w-full[^"]*md:inline-flex[^"]*md:min-h-0[^"]*md:w-auto"/,
  )
})

```

with

```ts

  assert.match(
    crossScopePreview,
    /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "flex min-h-11 w-full items-center md:inline-flex md:min-h-0 md:w-auto"\)\}/,
  )
})

```

(2) Replace

```ts

  assert.match(
    dataQualityPreview,
    /<Link href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}`\} className="inline-flex min-h-11 items-center font-semibold[^"]*md:min-h-0">/,
  )
})

```

with

```ts

  assert.match(
    dataQualityPreview,
    /<Link href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}`\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/,
  )
})

```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts tests/reports-adaptive-ui.test.ts`
Expected: 3 failures:
- "report operations: ContentPanels, the cross-scope export as a plain <a>, text links for the fixes and warning badges for the flags (spec 2D D9, M29, M30, M31)"
- "operations cross-scope mobile asset links keep a 44px touch target"
- "operations data-quality asset tags keep a 44px mobile touch target"

- [ ] **Step 10: The view.** In `src/components/reports/reports-operations-view.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { Download } from "lucide-react"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatStrip } from "@/components/ui/stat-strip"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import type { parseAssetListParams } from "@/lib/asset-list-query"
import type { AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
```

with

```tsx
import Link from "next/link"
import { Download } from "lucide-react"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import type { parseAssetListParams } from "@/lib/asset-list-query"
import type { AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
```

(2) Replace

```tsx

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">{labels.dataQuality}</h2>
        <StatStrip items={dataQualityCards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: card.href }))} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{labels.crossScopeTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.crossScopeHelp}</p>
          </div>
          {crossScope.exportHref ? (
            <Link
              href={crossScope.exportHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {labels.exportCrossScopeAssets}
            </Link>
          ) : null}
        </div>
        <StatStrip items={crossScope.cards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: card.href }))} />
        <CrossScopePreviewTable rows={crossScope.rows} locale={locale} emptyLabel={crossScopeEmpty} labels={labels} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{labels.dataQualityActionTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.dataQualityActionHelp}</p>
          </div>
          <Link href={`/${locale}/admin/data-quality`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit">
            {labels.openDataQualityRules}
          </Link>
        </div>
        <div className="grid gap-3">
          {dataQuality.rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {dataQualityEmpty}
            </div>
          ) : (
            dataQuality.rows.map((asset) => (
              <div key={asset.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/${locale}/assets/${asset.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline md:min-h-0">
                        <span className="tag font-medium">{asset.assetTag}</span>
                      </Link>
                      <span className="text-sm text-foreground">{asset.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{asset.context}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {asset.issues.map((issue) => (
                        <Link key={issue.key} href={issue.href} className="inline-flex min-h-11 items-center rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0">
                          {issue.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link href={`/${locale}/assets/${asset.id}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">
                      {labels.openAsset}
                    </Link>
                    <Link href={asset.primaryFixHref} className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary-hover sm:h-8 sm:min-h-0">
                      {labels.fixData}
                    </Link>
                  </div>
```

with

```tsx

  return (
    <div className="space-y-5">
      <ContentPanel title={labels.dataQuality}>
        <StatStrip items={dataQualityCards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: card.href }))} />
      </ContentPanel>

      <ContentPanel
        title={labels.crossScopeTitle}
        description={labels.crossScopeHelp}
        actions={
          crossScope.exportHref ? (
            // An /api download is a plain <a> (M31).
            <a href={crossScope.exportHref} download className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {labels.exportCrossScopeAssets}
            </a>
          ) : undefined
        }
      >
        <StatStrip items={crossScope.cards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: card.href }))} />
        <CrossScopePreviewTable rows={crossScope.rows} locale={locale} emptyLabel={crossScopeEmpty} labels={labels} />
      </ContentPanel>

      <ContentPanel
        title={labels.dataQualityActionTitle}
        description={labels.dataQualityActionHelp}
        actions={
          <Link href={`/${locale}/admin/data-quality`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {labels.openDataQualityRules}
          </Link>
        }
      >
        <div className="grid gap-3">
          {dataQuality.rows.length === 0 ? (
            <EmptyNote>{dataQualityEmpty}</EmptyNote>
          ) : (
            dataQuality.rows.map((asset) => (
              <div key={asset.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/${locale}/assets/${asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                        <span className="tag font-medium">{asset.assetTag}</span>
                      </Link>
                      <span className="text-sm text-foreground">{asset.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{asset.context}</div>
                    {/* Each issue opens its fix: a text link (no orange pill; color lives in badges). */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {asset.issues.map((issue) => (
                        <Link key={issue.key} href={issue.href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                          {issue.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link href={`/${locale}/assets/${asset.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {labels.openAsset}
                    </Link>
                    <Link href={asset.primaryFixHref} className={buttonVariants({ size: "sm" })}>
                      {labels.fixData}
                    </Link>
                  </div>
```

(3) Replace

```tsx
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{labels.operationInsightsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.operationInsightsHelp}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ReportTable title={labels.byCustodian} rows={insights.custodians} emptyLabel={insightsEmpty} />
          <ReportTable title={labels.byLocation} rows={insights.locations} emptyLabel={insightsEmpty} />
          <ReportTable title={labels.frequentRepairAssets} rows={insights.repairs} emptyLabel={insightsEmpty} />
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">{labels.idleAssets}</h2>
            <Link href={idleAssetsHref} className="block min-h-11 rounded-md border border-warning-border bg-warning-soft p-4 transition-colors hover:bg-warning-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <div className="text-sm text-muted-foreground">{labels.idleAssetsHelp}</div>
              <div className="mt-2 text-metric num text-foreground">{formatCount(insights.idleAssetsCount)}</div>
            </Link>
          </section>
        </div>
      </section>
    </div>
  )
}
```

with

```tsx
            ))
          )}
        </div>
      </ContentPanel>

      <ContentPanel title={labels.operationInsightsTitle} description={labels.operationInsightsHelp}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ReportTable title={labels.byCustodian} rows={insights.custodians} emptyLabel={insightsEmpty} />
          <ReportTable title={labels.byLocation} rows={insights.locations} emptyLabel={insightsEmpty} />
          <ReportTable title={labels.frequentRepairAssets} rows={insights.repairs} emptyLabel={insightsEmpty} />
          <section className="rounded-md border border-border bg-background p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{labels.idleAssets}</h3>
            <Link href={idleAssetsHref} className="block min-h-11 rounded-md border border-border bg-surface p-4 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <div className="text-sm text-muted-foreground">{labels.idleAssetsHelp}</div>
              <div className="mt-2 text-metric num text-foreground">{formatCount(insights.idleAssetsCount)}</div>
            </Link>
          </section>
        </div>
      </ContentPanel>
    </div>
  )
}
```

(4) Replace

```tsx
              <>
                <Link
                  href={`/${locale}/assets/${asset.id}`}
                  className="flex min-h-11 w-full items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:inline-flex md:min-h-0 md:w-auto"
                >
                  <span className="tag font-medium">{asset.assetTag}</span>
                </Link>
```

with

```tsx
              <>
                <Link
                  href={`/${locale}/assets/${asset.id}`}
                  className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 w-full items-center md:inline-flex md:min-h-0 md:w-auto")}
                >
                  <span className="tag font-medium">{asset.assetTag}</span>
                </Link>
```

(5) Replace

```tsx
            render: (asset) => (
              <div className="flex flex-wrap gap-1.5">
                {getCrossScopeFlagLabels(asset, labels).map((label) => (
                  <span key={label} className="rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
                    {label}
                  </span>
                ))}
              </div>
            ),
```

with

```tsx
            render: (asset) => (
              <div className="flex flex-wrap gap-1.5">
                {getCrossScopeFlagLabels(asset, labels).map((label) => (
                  <StatusBadge key={label} label={label} tone="warning" />
                ))}
              </div>
            ),
```

(6) Replace

```tsx
  })
}

function ReportTable({ title, rows, emptyLabel }: { title: string; rows: ReportInsightRow[]; emptyLabel: string }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
```

with

```tsx
  })
}

// One breakdown inside the insights panel: a quiet grouping with an h3, not a panel in the panel (D9).
function ReportTable({ title, rows, emptyLabel }: { title: string; rows: ReportInsightRow[]; emptyLabel: string }) {
  return (
    <section className="rounded-md border border-border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
```

- [ ] **Step 11: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/reports-adaptive-ui.test.ts tests/report-idle-activity.test.ts tests/report-table-key.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (103 tests).
  - Run `node <temp>/eol.mjs src/components/reports/reports-operations-view.tsx tests/reports-adaptive-ui.test.ts tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/components/reports/reports-operations-view.tsx`, `tests/reports-adaptive-ui.test.ts`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `npm test` (2047 tests, 2046 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 12: Commit.**

```bash
git add src/components/reports/reports-operations-view.tsx tests/reports-adaptive-ui.test.ts tests/reports-dashboard-sweep-ui.test.ts
git commit -m "refactor(ui): the operations report on ContentPanel, plain download links, text links and warning badges (2D-2 task 16c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16d: `c/reports/reports-overview-view.tsx`

The preview is a `ContentPanel divided flush`, the breakdowns are `ContentPanel`s around `ReportTable`, and the asset link is a `linkVariants` link.

**Files:** Modify `src/components/reports/reports-overview-view.tsx`, `tests/reports-dashboard-sweep-ui.test.ts` (append)

- [ ] **Step 13: The failing test.** Append to `tests/reports-dashboard-sweep-ui.test.ts`:

```ts

test("report overview: the preview is a divided flush ContentPanel, the breakdowns ContentPanels, and the asset link a text link (spec 2D D9, M29)", () => {
  const source = read(`${C}reports/reports-overview-view.tsx`)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n\s+className="overflow-hidden"\n\s+title=\{labels\.previewTitle\}/)
  assert.match(source, /<ContentPanel title=\{title\}>/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/)
  assert.doesNotMatch(source, /rounded-lg border|hover:underline|<section\b/)
})
```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts`
Expected: 1 failure, "report overview: the preview is a divided flush ContentPanel, the breakdowns ContentPanels, and the asset link a text link (spec 2D D9, M29)".

- [ ] **Step 14: The view.** In `src/components/reports/reports-overview-view.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { EmptyNote } from "@/components/ui/empty-note"
import { formatCount } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"

export type ReportCountRow = {
  key: string
```

with

```tsx
import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { formatCount } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
import { cn } from "@/lib/utils"

export type ReportCountRow = {
  key: string
```

(2) Replace

```tsx

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{labels.previewTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.previewHelp}</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{labels.previewCount}</span>
        </div>
        <ResponsiveReportList
          rows={previewRows}
          rowKey={(asset) => asset.id}
```

with

```tsx

  return (
    <div className="space-y-5">
      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={labels.previewTitle}
        description={labels.previewHelp}
        actions={<span className="text-meta text-muted-foreground">{labels.previewCount}</span>}
      >
        <ResponsiveReportList
          rows={previewRows}
          rowKey={(asset) => asset.id}
```

(3) Replace

```tsx
              render: (asset) => (
                <Link
                  href={`/${locale}/assets/${asset.id}`}
                  className="inline-flex min-h-11 items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
                >
                  <span className="tag font-medium">{asset.assetTag}</span>
                </Link>
```

with

```tsx
              render: (asset) => (
                <Link
                  href={`/${locale}/assets/${asset.id}`}
                  className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                >
                  <span className="tag font-medium">{asset.assetTag}</span>
                </Link>
```

(4) Replace

```tsx
            { key: "status", label: labels.status, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.status },
          ]}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportTable title={labels.byStatus} rows={breakdowns.status} emptyLabel={emptyLabel} />
```

with

```tsx
            { key: "status", label: labels.status, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.status },
          ]}
        />
      </ContentPanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportTable title={labels.byStatus} rows={breakdowns.status} emptyLabel={emptyLabel} />
```

(5) Replace

```tsx

function ReportTable({ title, rows, emptyLabel }: { title: string; rows: ReportCountRow[]; emptyLabel: string }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
```

with

```tsx

function ReportTable({ title, rows, emptyLabel }: { title: string; rows: ReportCountRow[]; emptyLabel: string }) {
  return (
    <ContentPanel title={title}>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
```

(6) Replace

```tsx
          ))
        )}
      </div>
    </section>
  )
}
```

with

```tsx
          ))
        )}
      </div>
    </ContentPanel>
  )
}
```

- [ ] **Step 15: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (102 tests).
  - Run `node <temp>/eol.mjs src/components/reports/reports-overview-view.tsx tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/components/reports/reports-overview-view.tsx`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `npm test` (2048 tests, 2047 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 16: Commit.**

```bash
git add src/components/reports/reports-overview-view.tsx tests/reports-dashboard-sweep-ui.test.ts
git commit -m "refactor(ui): the overview report on ContentPanel with a text asset link (2D-2 task 16d)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16e: `c/reports/reports-accounting-view.tsx` (2D-1 R5 hand-on)

The repair ratio passes `formatPercent(...)`, which is `null` when there is no ratio, without the typed `?? "—"`, so `StatStrip` shows `Nil` (2D-1 Task 9a); both asset links are `cn(linkVariants…)`.

**Files:** Modify `src/components/reports/reports-accounting-view.tsx`, `tests/reports-dashboard-sweep-ui.test.ts` (append)

- [ ] **Step 17: The failing test.** Append to `tests/reports-dashboard-sweep-ui.test.ts`:

```ts

test("report accounting: an empty ratio is Nil through StatStrip, and the asset links are text links (2D-1 R5 hand-on, M29)", () => {
  const source = read(`${C}reports/reports-accounting-view.tsx`)
  assert.match(source, /\{ key: "repairRatio", label: labels\.repairRatio, value: formatPercent\(costInsights\.repairToPurchaseRatio\) \},/)
  assert.equal(source.match(/className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g)?.length, 2)
  assert.doesNotMatch(source, /"—"|hover:underline/)
})
```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts`
Expected: 1 failure, "report accounting: an empty ratio is Nil through StatStrip, and the asset links are text links (2D-1 R5 hand-on, M29)".

- [ ] **Step 18: The view.** In `src/components/reports/reports-accounting-view.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { ContentPanel } from "@/components/ui/content-panel"
import { orNil } from "@/components/ui/nil"
import { StatStrip } from "@/components/ui/stat-strip"
import type { DepreciationSummary, DepreciableAsset } from "@/lib/asset-depreciation"
import type { CostExposureAsset, CostInsightSummary } from "@/lib/cost-insights"
import { formatCount, formatMoney } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"

export type ReportsAccountingLabels = {
  costTitle: string
  costHelp: string
  totalRepair: string
  repairRatio: string
  missingPrice: string
  highValueAssets: string
```

with

```tsx
import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { orNil } from "@/components/ui/nil"
import { StatStrip } from "@/components/ui/stat-strip"
import type { DepreciationSummary, DepreciableAsset } from "@/lib/asset-depreciation"
import type { CostExposureAsset, CostInsightSummary } from "@/lib/cost-insights"
import { formatCount, formatMoney } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
import { cn } from "@/lib/utils"

export type ReportsAccountingLabels = {
  costTitle: string
  costHelp: string
  totalRepair: string
  repairRatio: string
  missingPrice: string
  highValueAssets: string
```

(2) Replace

```tsx
}: ReportsAccountingViewProps) {
  return (
    <div className="space-y-5">
      <ContentPanel title={labels.costTitle} description={labels.costHelp}>
        <StatStrip
          className={moneyStripClasses}
          items={[
            { key: "totalRepair", label: labels.totalRepair, value: formatMoney(costInsights.totalRepairCost), unit: labels.baht },
            // No purchase value to compare with: the ratio has no value. A tile takes text, so the dash is written out.
            { key: "repairRatio", label: labels.repairRatio, value: formatPercent(costInsights.repairToPurchaseRatio) ?? "—" },
            { key: "missingPrice", label: labels.missingPrice, value: formatCount(costInsights.missingPurchasePriceCount) },
            { key: "highValueAssets", label: labels.highValueAssets, value: formatCount(costInsights.highValueAssetCount) },
          ]}
        />
        <CostExposureTable
          title={labels.highRepairRisk}
          rows={costInsights.highRepairExposureAssets}
          locale={locale}
```

with

```tsx
}: ReportsAccountingViewProps) {
  return (
    <div className="space-y-5">
      <ContentPanel title={labels.costTitle} description={labels.costHelp}>
        <StatStrip
          className={moneyStripClasses}
          items={[
            { key: "totalRepair", label: labels.totalRepair, value: formatMoney(costInsights.totalRepairCost), unit: labels.baht },
            // No purchase value to compare with: the ratio has no value, and StatStrip shows Nil for null (2D-1 M32 d).
            { key: "repairRatio", label: labels.repairRatio, value: formatPercent(costInsights.repairToPurchaseRatio) },
            { key: "missingPrice", label: labels.missingPrice, value: formatCount(costInsights.missingPurchasePriceCount) },
            { key: "highValueAssets", label: labels.highValueAssets, value: formatCount(costInsights.highValueAssetCount) },
          ]}
        />
        <CostExposureTable
          title={labels.highRepairRisk}
          rows={costInsights.highRepairExposureAssets}
          locale={locale}
```

(3) Replace

```tsx
          {
            key: "asset",
            label: labels.asset,
            className: "min-w-64 font-medium text-foreground",
            mobileClassName: "col-span-2",
            render: (asset) => (
              <Link
                href={`/${locale}/assets/${asset.id}`}
                className="inline-flex min-h-11 items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
              >
                {asset.label}
              </Link>
            ),
          },
          { key: "repairCost", label: labels.repairCost, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.repairCost) },
          { key: "purchasePrice", label: labels.purchasePrice, numeric: true, className: "text-muted-foreground", render: (asset) => orNil(formatMoney(asset.purchasePrice)) },
          { key: "ratio", label: labels.ratio, numeric: true, className: "text-muted-foreground", render: (asset) => orNil(formatPercent(asset.repairToPurchaseRatio)) },
```

with

```tsx
          {
            key: "asset",
            label: labels.asset,
            className: "min-w-64 font-medium text-foreground",
            mobileClassName: "col-span-2",
            render: (asset) => (
              <Link
                href={`/${locale}/assets/${asset.id}`}
                className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
              >
                {asset.label}
              </Link>
            ),
          },
          { key: "repairCost", label: labels.repairCost, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.repairCost) },
          { key: "purchasePrice", label: labels.purchasePrice, numeric: true, className: "text-muted-foreground", render: (asset) => orNil(formatMoney(asset.purchasePrice)) },
          { key: "ratio", label: labels.ratio, numeric: true, className: "text-muted-foreground", render: (asset) => orNil(formatPercent(asset.repairToPurchaseRatio)) },
```

(4) Replace

```tsx
          {
            key: "asset",
            label: labels.asset,
            className: "min-w-64 font-medium text-foreground",
            mobileClassName: "col-span-2",
            render: (asset) => (
              <Link
                href={`/${locale}/assets/${asset.id}`}
                className="inline-flex min-h-11 items-center text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
              >
                {asset.label}
              </Link>
            ),
          },
          { key: "bookValue", label: labels.bookValue, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.netBookValue) },
          { key: "accumulated", label: labels.accumulated, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.accumulatedDepreciation) },
          { key: "ratio", label: labels.ratio, numeric: true, className: "text-muted-foreground", render: (asset) => formatPercent(asset.depreciatedRatio) },
```

with

```tsx
          {
            key: "asset",
            label: labels.asset,
            className: "min-w-64 font-medium text-foreground",
            mobileClassName: "col-span-2",
            render: (asset) => (
              <Link
                href={`/${locale}/assets/${asset.id}`}
                className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
              >
                {asset.label}
              </Link>
            ),
          },
          { key: "bookValue", label: labels.bookValue, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.netBookValue) },
          { key: "accumulated", label: labels.accumulated, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.accumulatedDepreciation) },
          { key: "ratio", label: labels.ratio, numeric: true, className: "text-muted-foreground", render: (asset) => formatPercent(asset.depreciatedRatio) },
```

- [ ] **Step 19: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (103 tests).
  - Run `node <temp>/eol.mjs src/components/reports/reports-accounting-view.tsx tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/components/reports/reports-accounting-view.tsx`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `npm test` (2049 tests, 2048 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 20: Commit.**

```bash
git add src/components/reports/reports-accounting-view.tsx tests/reports-dashboard-sweep-ui.test.ts
git commit -m "fix(ui): the accounting report's empty ratio is Nil and its asset links are text links (2D-2 task 16e)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: The dashboard (`D/dashboard/page.tsx`, M30, R7)

Spec D7, D9, M21, M30; 2B R-d. One commit.

**What changes:**
- **Numbers (R7):** `kpiItems` (7, in rows of 4 + 3 through `splitStatRows`), `actionItems` (a count above 0 gets `attention`) and `trendItems` are `StatStrip`s. The trend foot is "เดือนนี้ · เดือนก่อน: N · +x%" through the new local `formatTrendDelta`; `TrendCard` and its colored arrow pill are deleted.
- **Status overview:** rows of `StatusBadge` + count with `hover:bg-row-hover`.
- **Panels:** five `ContentPanel`s.
- **Cross-scope preview:** a padded `EmptyNote` when empty, the asset tag as a `tag`, a warning `StatusBadge` for the flag.
- **Recent log:** the rows hover with `hover:bg-row-hover` (was `hover:bg-primary-soft`).
- **Imports:** only `ArrowRight` stays from lucide. The `formatCount(` count stays 12, and every link keeps its `href`.

**Files:** Modify `src/app/[locale]/(dashboard)/dashboard/page.tsx`, `tests/reports-dashboard-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/reports-dashboard-sweep-ui.test.ts`:

```ts

test("the dashboard: StatStrips in rows of at most four, ContentPanels, StatusBadge rows and no tone fills (spec 2D D9, M30; 2B R-d)", () => {
  const source = read(`${D}dashboard/page.tsx`)
  assert.match(source, /^import \{ splitStatRows \} from "@\/lib\/stat-strip-rows"$/m)
  assert.equal(source.match(/splitStatRows\((?:kpiItems|actionItems)\)\.map\(\(row\) => \(\n\s+<StatStrip key=\{row\[0\]\.key\} items=\{row\} \/>/g)?.length, 2)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 5)
  assert.match(source, /attention: card\.value > 0 && \(card\.tone === "warning" \|\| card\.tone === "danger"\),/)
  assert.match(source, /<StatusBadge label=\{item\.label\} tone=\{item\.tone\} \/>/)
  assert.match(source, /function formatTrendDelta\(current: number, previous: number\) \{/)
  assert.match(source, /<EmptyNote>\{t\("noRecentActivity"\)\}<\/EmptyNote>/)
  assert.match(source, /<div className="font-medium text-foreground"><span className="tag">\{row\.assetTag\}<\/span><\/div>/)
  assert.doesNotMatch(source, /bg-(?:primary|success|warning|danger|info)-soft|rounded-full|rounded-lg border|text-3xl|text-2xl|function TrendCard\b|actionCardToneClass|actionCardIconClass|hover:underline/)
})
```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts`
Expected: 1 failure, "the dashboard: StatStrips in rows of at most four, ContentPanels, StatusBadge rows and no tone fills (spec 2D D9, M30; 2B R-d)".

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/dashboard/page.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import {
  Package,
  Monitor,
  Wrench,
  AlertTriangle,
  Shield,
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import { getApprovalInboxAccess, getApprovalInboxCounts, type ApprovalInboxCounts } from "@/lib/approval-inbox-query"
import {
```

with

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import { getApprovalInboxAccess, getApprovalInboxCounts, type ApprovalInboxCounts } from "@/lib/approval-inbox-query"
import {
```

(2) Replace

```tsx
import { cn, formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { PageHeader } from "@/components/ui/page-header"

type DashboardPageProps = {
  params: Promise<{ locale: string }>
```

with

```tsx
import { cn, formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { splitStatRows } from "@/lib/stat-strip-rows"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type DashboardPageProps = {
  params: Promise<{ locale: string }>
```

(3) Replace

```tsx

type DashboardActionTone = "primary" | "warning" | "danger"

type DashboardActionCard = {
  label: string
  value: number
  detail: string
  href: string
  icon: ReactNode
  tone: DashboardActionTone
}

const actionCardToneClass: Record<DashboardActionTone, string> = {
  primary: "border-primary-border bg-primary-soft",
  warning: "border-warning-border bg-warning-soft",
  danger: "border-danger-border bg-danger-soft",
}

const actionCardIconClass: Record<DashboardActionTone, string> = {
  primary: "text-primary",
  warning: "text-warning",
  danger: "text-danger",
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const user = await getSessionUser()
```

with

```tsx

type DashboardActionTone = "primary" | "warning" | "danger"

// tone says whether a count above 0 needs action (warning, danger); it is never a fill (R-d).
type DashboardActionCard = {
  label: string
  value: number
  detail: string
  href: string
  tone: DashboardActionTone
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const user = await getSessionUser()
```

(4) Replace

```tsx
  )
  const pendingRepair = repairStatusMetrics.pendingRepair.count
  const underMaintenance = repairStatusMetrics.underMaintenance.count
  const kpiCards = [
    { label: t("totalAssets"), value: formatCount(totalAssets), icon: <Package size={24} />, color: "text-primary", href: `/${locale}/assets` },
    { label: t("inUse"), value: formatCount(inUse), icon: <Monitor size={24} />, color: "text-success", href: `/${locale}/assets` },
    { label: t("readyToDeploy"), value: formatCount(ready), icon: <Shield size={24} />, color: "text-info", href: `/${locale}/assets` },
    { label: t("pendingRepair"), value: formatCount(pendingRepair), icon: <Wrench size={24} />, color: "text-warning", href: repairStatusMetrics.pendingRepair.href },
    { label: t("underMaintenance"), value: formatCount(underMaintenance), icon: <Wrench size={24} />, color: "text-danger", href: repairStatusMetrics.underMaintenance.href },
    { label: t("warrantyExpiring"), value: formatCount(warrantyExpiring), icon: <AlertTriangle size={24} />, color: "text-danger", href: `/${locale}/assets` },
    { label: t("crossScopeAssets"), value: formatCount(crossScopeTotal), icon: <AlertTriangle size={24} />, color: "text-warning", href: crossScopeAssetsHref },
  ]

  const actionCardMap: Record<DashboardActionCardKey, DashboardActionCard> = {
```

with

```tsx
  )
  const pendingRepair = repairStatusMetrics.pendingRepair.count
  const underMaintenance = repairStatusMetrics.underMaintenance.count
  // The seven totals are StatStrip cells, each opening its list (no icons and no tone colors).
  const kpiItems: StatStripItem[] = [
    { key: "totalAssets", label: t("totalAssets"), value: formatCount(totalAssets), href: `/${locale}/assets` },
    { key: "inUse", label: t("inUse"), value: formatCount(inUse), href: `/${locale}/assets` },
    { key: "readyToDeploy", label: t("readyToDeploy"), value: formatCount(ready), href: `/${locale}/assets` },
    { key: "pendingRepair", label: t("pendingRepair"), value: formatCount(pendingRepair), href: repairStatusMetrics.pendingRepair.href },
    { key: "underMaintenance", label: t("underMaintenance"), value: formatCount(underMaintenance), href: repairStatusMetrics.underMaintenance.href },
    { key: "warrantyExpiring", label: t("warrantyExpiring"), value: formatCount(warrantyExpiring), href: `/${locale}/assets` },
    { key: "crossScopeAssets", label: t("crossScopeAssets"), value: formatCount(crossScopeTotal), href: crossScopeAssetsHref },
  ]

  const actionCardMap: Record<DashboardActionCardKey, DashboardActionCard> = {
```

(5) Replace

```tsx
      value: approvalInboxCounts.total,
      detail: t("approvalInboxDetail"),
      href: `/${locale}/admin/approvals`,
      icon: <FileCheck2 className="h-5 w-5" />,
      tone: approvalInboxCounts.total > 0 ? "danger" : "primary",
    },
    openRepairs: {
```

with

```tsx
      value: approvalInboxCounts.total,
      detail: t("approvalInboxDetail"),
      href: `/${locale}/admin/approvals`,
      tone: approvalInboxCounts.total > 0 ? "danger" : "primary",
    },
    openRepairs: {
```

(6) Replace

```tsx
      value: openRepairs,
      detail: t("openRepairsDetail"),
      href: `/${locale}/maintenance?status=in_progress`,
      icon: <Wrench className="h-5 w-5" />,
      tone: openRepairs > 0 ? "warning" : "primary",
    },
    pendingAuditFindings: {
```

with

```tsx
      value: openRepairs,
      detail: t("openRepairsDetail"),
      href: `/${locale}/maintenance?status=in_progress`,
      tone: openRepairs > 0 ? "warning" : "primary",
    },
    pendingAuditFindings: {
```

(7) Replace

```tsx
      value: pendingAuditFindings,
      detail: t("pendingAuditFindingsDetail"),
      href: `/${locale}/audit/findings?status=pending`,
      icon: <ClipboardCheck className="h-5 w-5" />,
      tone: "warning",
    },
    pendingDisposals: {
```

with

```tsx
      value: pendingAuditFindings,
      detail: t("pendingAuditFindingsDetail"),
      href: `/${locale}/audit/findings?status=pending`,
      tone: "warning",
    },
    pendingDisposals: {
```

(8) Replace

```tsx
      value: pendingDisposals,
      detail: t("pendingDisposalsDetail"),
      href: `/${locale}/disposal?status=pending`,
      icon: <Trash2 className="h-5 w-5" />,
      tone: "danger",
    },
    approvedDisposals: {
```

with

```tsx
      value: pendingDisposals,
      detail: t("pendingDisposalsDetail"),
      href: `/${locale}/disposal?status=pending`,
      tone: "danger",
    },
    approvedDisposals: {
```

(9) Replace

```tsx
      value: approvedDisposals,
      detail: t("approvedDisposalsDetail"),
      href: `/${locale}/disposal?status=approved`,
      icon: <Trash2 className="h-5 w-5" />,
      tone: "warning",
    },
  }
```

with

```tsx
      value: approvedDisposals,
      detail: t("approvedDisposalsDetail"),
      href: `/${locale}/disposal?status=approved`,
      tone: "warning",
    },
  }
```

(10) Replace

```tsx
    value: crossScopeSummary.custodianCompany,
    detail: t("crossScopeActionDetail"),
    href: buildDashboardCrossScopeHref(locale, "custodian_company"),
    icon: <AlertTriangle className="h-5 w-5" />,
    tone: "warning",
  }
  const actionCards = [
```

with

```tsx
    value: crossScopeSummary.custodianCompany,
    detail: t("crossScopeActionDetail"),
    href: buildDashboardCrossScopeHref(locale, "custodian_company"),
    tone: "warning",
  }
  const actionCards = [
```

(11) Replace

```tsx
      href: `/${locale}/assets`,
      current: currentMonthAssets,
      previous: previousMonthAssets,
      tone: "primary" as const,
    },
    {
      label: t("trendMaintenanceOpened"),
      href: `/${locale}/maintenance`,
      current: currentMonthMaintenance,
      previous: previousMonthMaintenance,
      tone: "warning" as const,
    },
    {
      label: t("trendAuditFindings"),
      href: `/${locale}/audit/findings?status=all`,
      current: currentMonthAuditFindings,
      previous: previousMonthAuditFindings,
      tone: "info" as const,
    },
    {
      label: t("trendDisposalsRequested"),
      href: `/${locale}/disposal`,
      current: currentMonthDisposals,
      previous: previousMonthDisposals,
      tone: "danger" as const,
    },
  ]
  const recentLogLabels = await buildSystemLogRecordLabels(recentLogs)
  const readableLogs = recentLogs.map((log) => formatDashboardLog(buildSystemLogPresentation(log, recentLogLabels, locale, translateSystemLog), t))

```

with

```tsx
      href: `/${locale}/assets`,
      current: currentMonthAssets,
      previous: previousMonthAssets,
    },
    {
      label: t("trendMaintenanceOpened"),
      href: `/${locale}/maintenance`,
      current: currentMonthMaintenance,
      previous: previousMonthMaintenance,
    },
    {
      label: t("trendAuditFindings"),
      href: `/${locale}/audit/findings?status=all`,
      current: currentMonthAuditFindings,
      previous: previousMonthAuditFindings,
    },
    {
      label: t("trendDisposalsRequested"),
      href: `/${locale}/disposal`,
      current: currentMonthDisposals,
      previous: previousMonthDisposals,
    },
  ]
  // Like the work center (2B R-d): no tone fill; a count that needs action and is above 0 gets the warning foot line.
  const actionItems = actionCards.map((card): StatStripItem => ({
    key: card.label,
    label: card.label,
    value: formatCount(card.value),
    href: card.href,
    foot: card.detail,
    footTitle: card.detail,
    attention: card.value > 0 && (card.tone === "warning" || card.tone === "danger"),
  }))
  // This month's count, with last month and the change in the foot line (it was a colored arrow pill).
  const trendItems = trendCards.map((card): StatStripItem => ({
    key: card.label,
    label: card.label,
    value: formatCount(card.current),
    href: card.href,
    foot: `${t("thisMonth")} · ${t("previousMonth")}: ${formatCount(card.previous)} · ${formatTrendDelta(card.current, card.previous)}`,
  }))
  const statusItems = [
    { key: "inUse", label: t("inUse"), value: inUse, href: `/${locale}/assets`, tone: "success" as const },
    { key: "readyToDeploy", label: t("readyToDeploy"), value: ready, href: `/${locale}/assets`, tone: "info" as const },
    { key: "pendingRepair", label: t("pendingRepair"), value: pendingRepair, href: repairStatusMetrics.pendingRepair.href, tone: "warning" as const },
    { key: "underMaintenance", label: t("underMaintenance"), value: underMaintenance, href: repairStatusMetrics.underMaintenance.href, tone: "danger" as const },
  ]
  const recentLogLabels = await buildSystemLogRecordLabels(recentLogs)
  const readableLogs = recentLogs.map((log) => formatDashboardLog(buildSystemLogPresentation(log, recentLogLabels, locale, translateSystemLog), t))

```

(12) Replace

```tsx
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            className="rounded-lg border border-border bg-surface p-5 transition-colors hover:bg-background"
            href={card.href}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="num mt-1 text-3xl font-bold text-foreground">
                  {card.value}
                </p>
              </div>
              <div className={card.color}>{card.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("actionableTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("actionableSubtitle")}</p>
          </div>
          <Link href={`/${locale}/work-center?panel=overview`} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("openWorkCenter")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2", actionCards.length >= 6 ? "xl:grid-cols-3 2xl:grid-cols-6" : actionCards.length >= 5 ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
          {actionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={cn("rounded-md border p-4 transition-colors hover:bg-accent", actionCardToneClass[card.tone])}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{card.label}</p>
                  <p className="num mt-2 text-3xl font-bold text-foreground">{formatCount(card.value)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                </div>
                <div className={actionCardIconClass[card.tone]}>{card.icon}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("crossScopePanelTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("crossScopePanelSubtitle")}</p>
          </div>
          <Link href={crossScopeAssetsHref} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("crossScopeViewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {crossScopeCards.map((card) => (
            <Link
              key={card.key}
              href={buildDashboardCrossScopeHref(locale, card.crossScope)}
              className="rounded-md border border-border bg-background p-4 transition-colors hover:bg-accent"
            >
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="num mt-2 text-2xl font-bold text-foreground">{formatCount(card.value)}</div>
            </Link>
          ))}
        </div>
        <DashboardCrossScopePreview
          rows={crossScopePreviewRows}
          locale={locale}
```

with

```tsx
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <div className="space-y-3">
        {splitStatRows(kpiItems).map((row) => (
          <StatStrip key={row[0].key} items={row} />
        ))}
      </div>

      <ContentPanel
        title={t("actionableTitle")}
        description={t("actionableSubtitle")}
        actions={
          <Link href={`/${locale}/work-center?panel=overview`} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
            {t("openWorkCenter")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      >
        <div className="space-y-3">
          {splitStatRows(actionItems).map((row) => (
            <StatStrip key={row[0].key} items={row} />
          ))}
        </div>
      </ContentPanel>

      <ContentPanel
        title={t("crossScopePanelTitle")}
        description={t("crossScopePanelSubtitle")}
        actions={
          <Link href={crossScopeAssetsHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
            {t("crossScopeViewAll")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      >
        <StatStrip
          items={crossScopeCards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: buildDashboardCrossScopeHref(locale, card.crossScope) }))}
        />
        <DashboardCrossScopePreview
          rows={crossScopePreviewRows}
          locale={locale}
```

(13) Replace

```tsx
            locationBranch: t("crossScopeLocationBranch"),
          }}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t("monthlyTrendTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("monthlyTrendSubtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {trendCards.map((card) => (
            <TrendCard
              key={card.label}
              href={card.href}
              label={card.label}
              current={card.current}
              previous={card.previous}
              currentLabel={t("thisMonth")}
              previousLabel={t("previousMonth")}
              tone={card.tone}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("statusOverview")}</h2>
          <div className="grid gap-3">
            {[
              { label: t("inUse"), value: inUse, href: `/${locale}/assets`, tone: "border-success-border bg-success-soft" },
              { label: t("readyToDeploy"), value: ready, href: `/${locale}/assets`, tone: "border-info-border bg-info-soft" },
              { label: t("pendingRepair"), value: pendingRepair, href: repairStatusMetrics.pendingRepair.href, tone: "border-warning-border bg-warning-soft" },
              { label: t("underMaintenance"), value: underMaintenance, href: repairStatusMetrics.underMaintenance.href, tone: "border-danger-border bg-danger-soft" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className={`flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent ${item.tone}`}>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="num text-lg font-bold text-foreground">{formatCount(item.value)}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("recentActivity")}</h2>
          {recentLogs.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">{t("noRecentActivity")}</div>
          ) : (
            <div className="space-y-3">
              {readableLogs.map((log) =>
                log.href ? (
                  <Link key={log.id} href={log.href} className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:border-primary-border hover:bg-primary-soft">
                    <ActivityLogContent log={log} />
                  </Link>
                ) : (
```

with

```tsx
            locationBranch: t("crossScopeLocationBranch"),
          }}
        />
      </ContentPanel>

      <ContentPanel title={t("monthlyTrendTitle")} description={t("monthlyTrendSubtitle")}>
        <StatStrip items={trendItems} />
      </ContentPanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContentPanel title={t("statusOverview")}>
          <div className="grid gap-1">
            {statusItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-sm transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0 md:py-1.5"
              >
                <StatusBadge label={item.label} tone={item.tone} />
                <span className="num font-semibold text-foreground">{formatCount(item.value)}</span>
              </Link>
            ))}
          </div>
        </ContentPanel>
        <ContentPanel title={t("recentActivity")}>
          {recentLogs.length === 0 ? (
            <EmptyNote>{t("noRecentActivity")}</EmptyNote>
          ) : (
            <div className="space-y-3">
              {readableLogs.map((log) =>
                log.href ? (
                  <Link key={log.id} href={log.href} className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-row-hover">
                    <ActivityLogContent log={log} />
                  </Link>
                ) : (
```

(14) Replace

```tsx
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
```

with

```tsx
              )}
            </div>
          )}
        </ContentPanel>
      </div>
    </div>
  )
```

(15) Replace

```tsx
  (key: string, values: Record<string, string | number | Date>): string
}

function TrendCard({
  href,
  label,
  current,
  previous,
  currentLabel,
  previousLabel,
  tone,
}: {
  href: string
  label: string
  current: number
  previous: number
  currentLabel: string
  previousLabel: string
  tone: "primary" | "warning" | "info" | "danger"
}) {
  const delta = current - previous
  const percent = previous > 0 ? Math.round((delta / previous) * 100) : current > 0 ? 100 : 0
  const trendClass = delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted-foreground"
  const toneClass =
    tone === "danger"
      ? "border-danger-border bg-danger-soft"
      : tone === "warning"
        ? "border-warning-border bg-warning-soft"
        : tone === "info"
          ? "border-info-border bg-info-soft"
          : "border-primary-border bg-primary-soft"

  return (
    <Link href={href} className={cn("rounded-md border p-4 transition-colors hover:bg-accent", toneClass)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="num mt-2 text-3xl font-bold text-foreground">{formatCount(current)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentLabel} · {previousLabel}: {formatCount(previous)}
          </p>
        </div>
        <div className={cn("inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-xs font-medium", trendClass)}>
          {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          {delta === 0 ? "0%" : `${delta > 0 ? "+" : ""}${percent}%`}
        </div>
      </div>
    </Link>
  )
}

function ActivityLogContent({ log }: { log: ReadableDashboardLog }) {
```

with

```tsx
  (key: string, values: Record<string, string | number | Date>): string
}

// The change against last month in whole percent, as the old trend pill showed it: "+20%", "-5%" or "0%"; with no
// previous month, any count is "+100%".
function formatTrendDelta(current: number, previous: number) {
  const delta = current - previous
  if (delta === 0) return "0%"
  const percent = previous > 0 ? Math.round((delta / previous) * 100) : 100
  return `${delta > 0 ? "+" : ""}${percent}%`
}

function ActivityLogContent({ log }: { log: ReadableDashboardLog }) {
```

(16) Replace

```tsx
    <div className="mt-4 rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{labels.title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{labels.empty}</div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => {
```

with

```tsx
    <div className="mt-4 rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{labels.title}</div>
      {rows.length === 0 ? (
        <EmptyNote padded>{labels.empty}</EmptyNote>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => {
```

(17) Replace

```tsx
              <Link key={row.id} href={`/${locale}/assets/${row.id}`} className="block px-4 py-3 transition-colors hover:bg-accent">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{row.assetTag}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{row.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.ownerBranch}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:max-w-md md:justify-end">
                    {flagLabels.map((label) => (
                      <span key={label} className="rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
```

with

```tsx
              <Link key={row.id} href={`/${locale}/assets/${row.id}`} className="block px-4 py-3 transition-colors hover:bg-accent">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground"><span className="tag">{row.assetTag}</span></div>
                    <div className="mt-1 text-sm text-muted-foreground">{row.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.ownerBranch}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:max-w-md md:justify-end">
                    {flagLabels.map((label) => (
                      <StatusBadge key={label} label={label} tone="warning" />
                    ))}
                  </div>
                </div>
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/audit-round-cancellation.test.ts tests/dashboard-cross-scope.test.ts tests/list-pages-ui.test.ts tests/performance-route-instrumentation.test.ts tests/permission-aware-navigation.test.ts tests/stat-strip-rows.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (146 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/dashboard/page.tsx" tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/dashboard/page.tsx`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `npm test` (2050 tests, 2049 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/dashboard/page.tsx" tests/reports-dashboard-sweep-ui.test.ts
git commit -m "refactor(ui): the dashboard on StatStrip, ContentPanel, StatusBadge and EmptyNote, with no tone fills (2D-2 task 17)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: The work center (`D/work-center/page.tsx`, D19)

Spec D7, D9, D19, M21. One commit.

**What changes:**
- **Imports:** `statusMarkerVariants`, `linkVariants`, `ContentPanel`, `EmptyNote`, `Notice`, `cn` and `splitStatRows` (now from `@/lib/stat-strip-rows`) come in.
- **Notice and empty queues:** the "my work" unavailable sentence is a warning `Notice`; the five empty queues are `EmptyNote tone="clear"`.
- **Follow-up panels:** `FollowUpPanel` is a `ContentPanel` whose "open the list" links are `linkVariants` text links (D19). The groups lose their dashed frame; the count is plain `num` text, and the group links are text links (D19). `FollowUpItem` dots are `statusMarkerVariants`.
- **Deleted:** the local `splitStatRows`, `EmptyState` and `followUpDotClass`.

**Files:** Modify `src/app/[locale]/(dashboard)/work-center/page.tsx`, `tests/list-pages-ui.test.ts`, `tests/reports-dashboard-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing tests.** Append to `tests/reports-dashboard-sweep-ui.test.ts`:

```ts

test("the work center: follow-up panels are ContentPanels with text links (D19), empty queues are EmptyNote, and the dots are shape markers (spec 2D D9, D19, M21)", () => {
  const source = read(`${D}work-center/page.tsx`)
  assert.match(source, /<ContentPanel\n\s+title=\{title\}\n\s+description=\{subtitle\}\n\s+className=\{isExpanded \? "border-primary-border" : undefined\}/)
  assert.ok((source.match(/className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center(?: gap-1)? md:min-h-0"\)\}/g)?.length ?? 0) >= 4, "the four D19 links")
  assert.equal(source.match(/<EmptyNote tone="clear">\{t\("no\w+Issues"\)\}<\/EmptyNote>/g)?.length, 5)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone \}\), "mt-2"\)\} \/>/)
  assert.doesNotMatch(source, /function (?:EmptyState|followUpDotClass|splitStatRows)\b|border-dashed|rounded-full|sm:min-h-0|sm:border-0|hover:underline|text-xs text-warning/)
})
```

In `tests/list-pages-ui.test.ts` (CRLF), the work center pin reads the shared `splitStatRows` and the warning `Notice`:

Replace

```ts
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("viewNavigation"\)\}\n\s+current=\{workCenterParams\.view\}/)
  assert.match(source, /\{ key: "all", label: t\("allWork"\), href: buildWorkCenterHref\(locale, workCenterParams, \{ view: "all", panel: workCenterParams\.panel \}\) \}/)
  assert.match(source, /\{ key: "mine", label: t\("myWork"\), href: buildWorkCenterHref\(locale, workCenterParams, \{ view: "mine", panel: workCenterParams\.panel \}\) \}/)
  assert.match(source, /<p className="text-xs text-warning">\{t\("myWorkUnavailable"\)\}<\/p>/, "the sentence under the switch stays (I10)")
  assert.match(source, /<p className="text-xs text-muted-foreground">\{isMineView \? t\("myWorkDetail"\) : t\("allWorkDetail"\)\}<\/p>/)
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("focusNavigation"\)\}\n\s+current=\{workCenterParams\.panel\}/)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the summary strip and the metric rows")
  assert.match(source, /attention: metric\.value > 0 && \(metric\.tone === "danger" \|\| metric\.tone === "warning"\)/)
  assert.match(source, /function splitStatRows<T>\(items: readonly T\[\], most = 4\): T\[\]\[\] \{/)
  assert.match(source, /status: auditRoundOperationalWhere/)
  assert.doesNotMatch(source, /function (?:MetricCard|SummaryPill|WorkCenterViewLink|WorkCenterFocusLink|toneClass)\b|<h1\b|aria-current=|toLocaleString\(|<Segmented\b|"use client"/)
  for (const locale of ["th", "en"] as const) {
```

with

```ts
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("viewNavigation"\)\}\n\s+current=\{workCenterParams\.view\}/)
  assert.match(source, /\{ key: "all", label: t\("allWork"\), href: buildWorkCenterHref\(locale, workCenterParams, \{ view: "all", panel: workCenterParams\.panel \}\) \}/)
  assert.match(source, /\{ key: "mine", label: t\("myWork"\), href: buildWorkCenterHref\(locale, workCenterParams, \{ view: "mine", panel: workCenterParams\.panel \}\) \}/)
  assert.match(source, /<Notice tone="warning">\{t\("myWorkUnavailable"\)\}<\/Notice>/, "the sentence under the switch stays (I10), as a warning Notice since 2D-2 (D7)")
  assert.match(source, /<p className="text-xs text-muted-foreground">\{isMineView \? t\("myWorkDetail"\) : t\("allWorkDetail"\)\}<\/p>/)
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("focusNavigation"\)\}\n\s+current=\{workCenterParams\.panel\}/)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the summary strip and the metric rows")
  assert.match(source, /attention: metric\.value > 0 && \(metric\.tone === "danger" \|\| metric\.tone === "warning"\)/)
  assert.match(source, /^import \{ splitStatRows \} from "@\/lib\/stat-strip-rows"$/m, "the row split is shared with the dashboard since 2D-2")
  assert.match(source, /status: auditRoundOperationalWhere/)
  assert.doesNotMatch(source, /function (?:MetricCard|SummaryPill|WorkCenterViewLink|WorkCenterFocusLink|toneClass)\b|<h1\b|aria-current=|toLocaleString\(|<Segmented\b|"use client"/)
  for (const locale of ["th", "en"] as const) {
```

Run: `node --test tests/reports-dashboard-sweep-ui.test.ts tests/list-pages-ui.test.ts`
Expected: 2 failures:
- "the work center: follow-up panels are ContentPanels with text links (D19), empty queues are EmptyNote, and the dots are shape markers (spec 2D D9, D19, M21)"
- "the work center: PageHeader, a summary StatStrip, the view switch and the queues on TabNav, metric rows of at most four (spec 2B I10, §5.6)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/work-center/page.tsx` (CRLF):

(1) Replace

```tsx
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { assetMissingResponsibilityWhere, hasAssetResponsibility } from "@/lib/asset-ownership"
```

with

```tsx
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
import { splitStatRows } from "@/lib/stat-strip-rows"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { assetMissingResponsibilityWhere, hasAssetResponsibility } from "@/lib/asset-ownership"
```

(2) Replace

```tsx
  type WorkCenterParams,
  type WorkCenterUserScope,
} from "@/lib/work-center-view"
import { formatDate, formatDateTime } from "@/lib/utils"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import { buildDuePmPlanWhere } from "@/lib/preventive-maintenance"
```

with

```tsx
  type WorkCenterParams,
  type WorkCenterUserScope,
} from "@/lib/work-center-view"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"
import { buildDuePmPlanWhere } from "@/lib/preventive-maintenance"
```

(3) Replace

```tsx
          ]}
        />
        {isMineView && !userScope.enabled ? (
          <p className="text-xs text-warning">{t("myWorkUnavailable")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{isMineView ? t("myWorkDetail") : t("allWorkDetail")}</p>
        )}
```

with

```tsx
          ]}
        />
        {isMineView && !userScope.enabled ? (
          <Notice tone="warning">{t("myWorkUnavailable")}</Notice>
        ) : (
          <p className="text-xs text-muted-foreground">{isMineView ? t("myWorkDetail") : t("allWorkDetail")}</p>
        )}
```

(4) Replace

```tsx
            collapseLabel={t("collapseList")}
          >
            {!approvalInboxSnapshot || approvalInboxSnapshot.items.length === 0 ? (
              <EmptyState label={t("noApprovalInboxIssues")} />
            ) : (
              approvalInboxSnapshot.items.slice(0, approvalItemLimit).map((item) => (
                <ApprovalFollowUpItem key={item.id} item={item} />
```

with

```tsx
            collapseLabel={t("collapseList")}
          >
            {!approvalInboxSnapshot || approvalInboxSnapshot.items.length === 0 ? (
              <EmptyNote tone="clear">{t("noApprovalInboxIssues")}</EmptyNote>
            ) : (
              approvalInboxSnapshot.items.slice(0, approvalItemLimit).map((item) => (
                <ApprovalFollowUpItem key={item.id} item={item} />
```

(5) Replace

```tsx
            }}
          />
          {assetIssues.length === 0 ? (
            <EmptyState label={t("noAssetDataIssues")} />
          ) : (
            assetIssues.map((asset) => {
              const issues = [
```

with

```tsx
            }}
          />
          {assetIssues.length === 0 ? (
            <EmptyNote tone="clear">{t("noAssetDataIssues")}</EmptyNote>
          ) : (
            assetIssues.map((asset) => {
              const issues = [
```

(6) Replace

```tsx
          collapseLabel={t("collapseList")}
        >
          {maintenanceItems.length === 0 ? (
            <EmptyState label={t("noMaintenanceIssues")} />
          ) : (
            maintenanceItems.map((ticket) => (
              <FollowUpItem
```

with

```tsx
          collapseLabel={t("collapseList")}
        >
          {maintenanceItems.length === 0 ? (
            <EmptyNote tone="clear">{t("noMaintenanceIssues")}</EmptyNote>
          ) : (
            maintenanceItems.map((ticket) => (
              <FollowUpItem
```

(7) Replace

```tsx
          collapseLabel={t("collapseList")}
        >
          {visibleAuditItems.length === 0 ? (
            <EmptyState label={t("noAuditIssues")} />
          ) : (
            visibleAuditItems.map((finding) => (
              <FollowUpItem
```

with

```tsx
          collapseLabel={t("collapseList")}
        >
          {visibleAuditItems.length === 0 ? (
            <EmptyNote tone="clear">{t("noAuditIssues")}</EmptyNote>
          ) : (
            visibleAuditItems.map((finding) => (
              <FollowUpItem
```

(8) Replace

```tsx
          collapseLabel={t("collapseList")}
        >
          {visibleDisposalItems.length === 0 ? (
            <EmptyState label={t("noDisposalIssues")} />
          ) : (
            visibleDisposalItems.map((request) => (
              <FollowUpItem
```

with

```tsx
          collapseLabel={t("collapseList")}
        >
          {visibleDisposalItems.length === 0 ? (
            <EmptyNote tone="clear">{t("noDisposalIssues")}</EmptyNote>
          ) : (
            visibleDisposalItems.map((request) => (
              <FollowUpItem
```

(9) Replace

```tsx
  )
}

// Rows of at most `most` cells, as even as they split: 8 → 4 + 4, 7 → 4 + 3, 6 → 3 + 3, 5 → 3 + 2.
function splitStatRows<T>(items: readonly T[], most = 4): T[][] {
  const rowCount = Math.ceil(items.length / most)
  const perRow = Math.ceil(items.length / rowCount)
  return Array.from({ length: rowCount }, (_, index) => items.slice(index * perRow, (index + 1) * perRow))
}

function FollowUpPanel({
  title,
  subtitle,
```

with

```tsx
  )
}

function FollowUpPanel({
  title,
  subtitle,
```

(10) Replace

```tsx
  collapseLabel: string
  children: React.ReactNode
}) {
  const isExpanded = currentParams.panel === panel
  return (
    <section className={`min-w-0 rounded-lg border bg-surface p-4 ${isExpanded ? "border-primary-border" : "border-border"}`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center">
          <Link
            href={buildWorkCenterHref(locale, currentParams, { panel: isExpanded ? "overview" : panel })}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-primary-border px-3 text-xs font-medium text-primary hover:bg-primary-soft sm:min-h-0 sm:border-0 sm:px-0 sm:hover:bg-transparent sm:hover:underline"
          >
            {isExpanded ? collapseLabel : showMoreLabel}
          </Link>
          <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground hover:text-primary sm:min-h-0 sm:border-0 sm:px-0 sm:hover:underline">
            {viewAllLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

```

with

```tsx
  collapseLabel: string
  children: React.ReactNode
}) {
  // D9 and D19: the shared panel (its border turns primary while the list is the focused one) with two text links,
  // 44px tall on phones and the same text link at every width (no shape change at sm).
  const isExpanded = currentParams.panel === panel
  return (
    <ContentPanel
      title={title}
      description={subtitle}
      className={isExpanded ? "border-primary-border" : undefined}
      actions={
        <>
          <Link
            href={buildWorkCenterHref(locale, currentParams, { panel: isExpanded ? "overview" : panel })}
            className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}
          >
            {isExpanded ? collapseLabel : showMoreLabel}
          </Link>
          <Link href={href} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
            {viewAllLabel}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </>
      }
    >
      <div className="space-y-2">{children}</div>
    </ContentPanel>
  )
}

```

(11) Replace

```tsx
  if (groups.length === 0) return null

  return (
    <div className="mb-3 rounded-md border border-dashed border-border bg-background p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-foreground">{labels.title}</div>
        <div className="text-xs text-muted-foreground">{labels.subtitle}</div>
```

with

```tsx
  if (groups.length === 0) return null

  return (
    <div className="mb-3 rounded-md border border-border bg-background p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-foreground">{labels.title}</div>
        <div className="text-xs text-muted-foreground">{labels.subtitle}</div>
```

(12) Replace

```tsx
                <p className="text-sm font-medium text-foreground">{labels.issueLabels[group.key]}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{labels.issueDetails[group.key]}</p>
              </div>
              <span className="num rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                {formatCount(group.count)}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={group.assetsHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary-border px-3 text-center text-xs font-medium text-primary hover:bg-primary-soft sm:min-h-0 sm:border-0 sm:px-0 sm:hover:bg-transparent sm:hover:underline">
                {labels.openFilteredAssets}
              </Link>
              <Link href={group.workCenterHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-center text-xs font-medium text-muted-foreground hover:text-primary sm:min-h-0 sm:border-0 sm:px-0 sm:hover:underline">
                {labels.showInWorkCenter}
              </Link>
            </div>
```

with

```tsx
                <p className="text-sm font-medium text-foreground">{labels.issueLabels[group.key]}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{labels.issueDetails[group.key]}</p>
              </div>
              <span className="num shrink-0 text-sm font-semibold text-foreground">{formatCount(group.count)}</span>
            </div>
            {/* D19: text links at every width, 44px tall on phones. */}
            <div className="mt-3 flex flex-col gap-x-4 gap-y-1 sm:flex-row sm:flex-wrap">
              <Link href={group.assetsHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                {labels.openFilteredAssets}
              </Link>
              <Link href={group.workCenterHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                {labels.showInWorkCenter}
              </Link>
            </div>
```

(13) Replace

```tsx
  )
}

function FollowUpItem({ href, title, meta, tone }: { href: string; title: string; meta: string; tone: "danger" | "warning" | "primary" }) {
  return (
    <Link href={href} className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:border-primary-border hover:bg-accent">
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${followUpDotClass(tone)}`} />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta}</p>
```

with

```tsx
  )
}

// The status marker carries the urgency by shape (diamond, triangle, dot), not by color alone.
function FollowUpItem({ href, title, meta, tone }: { href: string; title: string; meta: string; tone: "danger" | "warning" | "primary" }) {
  return (
    <Link href={href} className="block rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-row-hover">
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className={cn(statusMarkerVariants({ tone }), "mt-2")} />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta}</p>
```

(14) Replace

```tsx
  )
}

function followUpDotClass(tone: "danger" | "warning" | "primary") {
  if (tone === "danger") return "bg-danger"
  if (tone === "primary") return "bg-primary"
  return "bg-warning"
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function applyAssetWorkCenterScope(
  where: Prisma.AssetWhereInput,
  active: boolean,
```

with

```tsx
  )
}

function applyAssetWorkCenterScope(
  where: Prisma.AssetWhereInput,
  active: boolean,
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/reports-dashboard-sweep-ui.test.ts tests/audit-round-cancellation.test.ts tests/list-pages-ui.test.ts tests/stat-strip-rows.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass (138 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/work-center/page.tsx" tests/list-pages-ui.test.ts tests/reports-dashboard-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/work-center/page.tsx`, `tests/list-pages-ui.test.ts`; `0 <n>` for `tests/reports-dashboard-sweep-ui.test.ts` (LF).
  - Run `grep -rn "function splitStatRows" src`. Expected: only `src/lib/stat-strip-rows.ts`.
  - Run `npm test` (2051 tests, 2050 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/work-center/page.tsx" tests/list-pages-ui.test.ts tests/reports-dashboard-sweep-ui.test.ts
git commit -m "refactor(ui): work center follow-up panels are ContentPanels with text links, empty queues EmptyNote and dots shape markers (2D-2 task 18)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan2/after/` and `.superpowers/sdd/ui-phase2d-plan2/task-19-findings.md` (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–18 committed; the Task 0 baseline, ids, measurements, first-focus table and before images.
- Produces: `task-19-findings.md`, which Task 20 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count (expected 2051, 2050 pass, 1 skipped) and the build page count (60/60 at `da8388d`; this plan adds no route).

- [ ] **Step 2: Production server.**
  - Create `.claude/launch.json` with `name: "asset-2d2-start-3101"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3101"]`, `port: 3101`, `autoPort: false`.
  - Start it with `preview_start` and log in with the seed admin; do not echo the password.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`.
  - Playwright code runs inline (`browser_run_code_unsafe`). A file you must create goes under `.playwright-mcp/` and is deleted right after the run.

- [ ] **Step 3: Write nothing.**
  - Open every dialog and sheet to its first screen and close it with ยกเลิก, the X or Esc.
  - Never press save, archive, scan, rotate, enable/disable, copy-token acknowledge, mark read, snooze, save preset, delete, export or a confirm. The settings form is opened, tabbed through and left without saving (answer "stay" or "leave without saving" in the browser's own prompt only when you navigate away).
  - Count POST, PUT, PATCH and DELETE requests while you work. Expected: 0. List by path any read-only lookup a page already sends.

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/`. Compare with `before/`. Check in Thai at 1440, 768 and 375, plus one English pass at 1440 (settings, integrations, dashboard, work center, reports catalog):
  - **No wrapping, truncation or overlap** that was not there before; no horizontal page scroll at 375.
  - **Color only where it means something** (Review Focus 3): no tone fills on cards, pills or icons. Green, orange and red appear only in `StatusBadge`s, `Notice` icons and boxes, `StatStrip` attention feet and danger buttons.
  - **Settings (Review Focus 2):** open all 11 tabs. Each panel is a white `ContentPanel` with its head row; no box sits in a box. Open the prefix dialog ("เพิ่มกลุ่ม") and close it. In the change review (change one field, do not save), the key link switches the tab in place and the changed value stays; Ctrl+click opens `?tab=…` in a new tab. The label preview keeps its paper look. Then leave without saving.
  - **Tab row (R9):** at 1440×900, on `/th/admin/settings` and `/en/admin/settings`, `nav[data-slot="tab-nav"]` has `scrollWidth <= clientWidth` and the last tab's right edge is inside the nav. Record the numbers against Task 0.
  - **Topbar (R10, R11):** at 1024×450, 1100×450, 1180×450 and 1440×900 with the sidebar open, the search input, scan link, bell, language and user triggers do not overlap, and none passes `document.documentElement.clientWidth`. Record the boxes against Task 0. The icon buttons are 36px from 768, 44px below; the bell badge looks as before.
  - **Users (Review Focus 4):** the seed admin sees "เพิ่มผู้ใช้" as the last header button on `/th/admin/users`, and "เพิ่มบทบาท" on `/th/admin/roles`; no floating button on either page. For a view-only account, read the code path (`canCreate`) and note it; do not create an account.
  - **Dashboard and work center (Review Focus 5):** every number on `/th/dashboard` and `/th/work-center` equals its before value, and every link opens the same URL as before (compare `href`s from the before DOM). The KPI strip is 4 + 3 at 1440.
  - **Integrations:** the summary `StatStrip`, the client row (badges, scope chips, 36px row buttons from 768), the empty state if there is no client. Do not rotate, disable or create.
  - **Reports:** the catalog's two `/api` links are `<a href download>` (DOM only; do not click). The accounting ratio shows its value, or "—" read as "ไม่มีข้อมูล" when there is none.
  - **Access denied, notifications, storage, data quality, readiness, approvals, history, logs:** as before, with the shared parts.

- [ ] **Step 5: Dialog focus (R1, Review Focus 1).** Repeat the Task 0 Step 6 first-focus table on the same dialogs and sheets. Expected for each:
  - `document.activeElement` after opening is the same element as in Task 0 (the first field or control, or the `initialFocusRef` target);
  - one Shift+Tab moves focus to the close X ("ปิด"), and one more Tab from the X returns to the first control;
  - Tab from the last footer button wraps to the X (Radix focus trap);
  - the busy X (where you can see it without saving) is still disabled.
  Note any dialog the dev data cannot open.

- [ ] **Step 6: Keyboard.** On settings, integrations and the topbar: Tab order follows the visual order; every focus ring shows (teal 2px). The details toggles of the advanced tab, approval history and system log open with Enter and keep their disclosure marker.

- [ ] **Step 7: axe.**
  - Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })`.
  - Run `axe.run(document.querySelector("main"), { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "link-name", "nested-interactive", "target-size", "list", "listitem"] })` on `/th/admin/settings` (overview, ldap-sync, advanced), `/th/admin/integrations`, `/th/admin/roles`, `/th/admin/users`, `/th/admin/approvals`, `/th/reports?view=catalog`, `/th/dashboard` and `/th/work-center` at 1440 and 375. Run it once on the topbar (`header`) with the notification popover open.
  - Expected: 0 violations.

- [ ] **Step 8: Forced colors, reduced motion and zoom.**
  - Forced colors (`emulateMedia`): the `Chip` border, the `StatusBadge` markers, the `ContentPanel` lines and the focus rings stay visible on roles, integrations and the dashboard.
  - Reduced motion: the integration list's loading spinner and the busy buttons do not spin.
  - 200% zoom (a 720×450 viewport) on settings, integrations and the dashboard: nothing is clipped.

- [ ] **Step 9: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done:
  - opening a dialog reads its title and the first field, and Shift+Tab reads "ปิด, ปุ่ม"
  - a `Chip` reads as plain text; a scope chip reads its code
  - the dashboard and work-center `StatStrip` cells read label, value and foot
  - on a real iPhone and iPad: the topbar buttons are 44px, the sidebar drawer closes with its X
  Add them to the open manual checks.

- [ ] **Step 10: Findings report.** Write `.superpowers/sdd/ui-phase2d-plan2/task-19-findings.md` with these parts:
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, at which widths, with results; the tab-row and topbar numbers before → after; the first-focus table.
  - **Found but not caused by plan 2D-2.**
  - **Accepted mixes:** R11 raw buttons, R14 items, and any new ones.
  - **Still needs a person:** the Step 9 list.

- [ ] **Step 11: Clean up.** Stop the server, delete `.claude/launch.json` and every helper you put under the repo. `git status --short` shows only the untracked folders of the Global Constraints.

---

### Task 20: Repo documentation for plan 2D-2 (repo docs only; the controller adds the verify numbers and the wiki in Task 21)

Spec §6 ("every plan: DH section, changelog, wiki") and §3.2. What 2D-2 changes in the canonical docs:
- the dialog close X order and first focus (D18);
- the shared `Chip`;
- the panel classes for elements that cannot be `ContentPanel`;
- the dashboard on `StatStrip` and `splitStatRows`;
- the topbar buttons and the search width;
- the shadow budget (10 → 8) and the `tag` scope.

`.impeccable/design.json` waits for 2D-5. `docs/11_FEATURE_LIST.md` and `docs/07_UAT_CHECKLIST.md` do not change: no feature changes what it does (the users create button follows the permission the page already enforced).

All four files are CRLF. Edit with exact-string replacement, keep the endings, and never run a formatter. Each old text below occurs exactly once at `da8388d`.

**Files:**
- Modify `DESIGN.md` (12 replacements)
- Modify `docs/14_UI_UX_DESIGN_SYSTEM.md` (4 replacements)
- Modify `DEVELOPER_HANDOFF.md` (1 replacement): a new section before `## Open Go-Live Decisions`
- Modify `docs/99_CHANGELOG.md` (1 or 2 replacements): the entry on top
- Not changed: `.impeccable/design.json`, `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`, `src/`, `tests/`, `messages/`

**Interfaces:**
- Consumes: Tasks 1–19 committed; `task-19-findings.md`.
- Produces:
  - the section `## UI Round 4 Phase 2D Plan 2 Admin, Reports, Dashboard and Shell (<today>)` with a `- Dev-app check (Task 19):` bullet;
  - the changelog entry `### หน้าผู้ดูแลระบบ รายงาน แดชบอร์ด และกรอบหน้า (UI รอบ 4 เฟส 2D plan 2)` with a `- **ตรวจบนแอป (Task 19):**` bullet.

  Task 21 adds the verify bullet directly above each.

- [ ] **Step 1: Check the base.**
  - Run `git diff --quiet da8388d HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md && echo DOCS-UNCHANGED`. Expected: `DOCS-UNCHANGED`.
  - Run `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`. Expected: `i/lf w/crlf` for all four.
  - Read `task-19-findings.md`.

- [ ] **Step 2: `DESIGN.md` color and shadow rules (3 replacements).**

(1) §2 Named Rules, the known exception (`:260`): replace

```
Known exception: until phase 2D, info notices, role chips and a few info icons also use the `info` tokens and so appear teal. Phase 2A changed only their borders (`border-info/30` → `border-info-border`); the `Notice` sweep in 2D moves them to neutral.
```

with

```
Known exception: until phase 2D ends, info notices, chips and a few info icons in the files that plans 2D-3 to 2D-5 own still use the `info` tokens and so appear teal (phase 2A changed only their borders, `border-info/30` → `border-info-border`). Plan 2D-2 moved the admin pages, the reports, the dashboard, the work center and the shell: names are the neutral `Chip`, states `StatusBadge` and notes `Notice` by meaning.
```

(2) §4 The Border First Rule (`:335`): replace

```
Four larger shadows wait for their owners: the 2 floating add buttons (2D), the mobile bulk-action bar of the register (phase 3, with QR label printing; plan 2B-3 kept its place, frame and shadow) and the round scan button (kept since phase 1).
```

with

```
Two larger shadows stay: the mobile bulk-action bar of the register (phase 3, with QR label printing; plan 2B-3 kept its place, frame and shadow) and the round scan button (kept since phase 1). Plan 2D-2 moved the 2 floating add buttons of the roles and users pages into their page headers.
```

(3) The same paragraph: replace

```
holds these 10 in a per-file budget that may only go down.
```

with

```
holds these 8 in a per-file budget that may only go down.
```

- [ ] **Step 3: `DESIGN.md` typography and buttons (2 replacements).**

(4) §3 Typography, the `tag` bullet (`:301`): replace

```
Codes still in `font-mono` (forms and settings, the component parts of the asset pages, the integration manager and the label print page) and codes inside a translated sentence or a string a page builds (`assetTag - name`) wait for phase 2D.
```

with

```
Plan 2D-2 moved the codes of the settings form, the integration manager and the admin pages to `tag`. A code that must wrap (the asset-tag template example, the public QR URL, the one-time integration token, an API route) keeps `font-mono`, with `break-all` where it can be long, and an editable `Input` keeps `font-mono`. Codes still in `font-mono` (the other forms, the component parts of the asset pages and the label print page) and codes inside a translated sentence or a string a page builds (`assetTag - name`) wait for plans 2D-3 and 2D-4.
```

(5) §5 Buttons, **Hand-written buttons** (`:376`): replace

```
(phase 2B moved the header, filter, row and pager buttons of every page it moved; the action links of the report cards, the readiness checks and the work-center panels, the storage archive button and the two floating create buttons are 2D's)
```

with

```
(phase 2B moved the header, filter, row and pager buttons of every page it moved; plan 2D-1 the readiness links; plan 2D-2 the topbar and sidebar buttons, the report and work-center links, the storage archive button and the two floating create buttons, which are `PageHeader` actions now)
```

- [ ] **Step 4: `DESIGN.md` badges, dialogs and containers (5 replacements).**

(6) §5 Status Badges, after the **State** bullet: replace

```
so they also show on dark high-contrast themes.
```

with

```
so they also show on dark high-contrast themes.
- **`Chip`** (`src/components/ui/chip.tsx`, server-safe, since plan 2D-2): a name, not a state. A neutral 22px chip (`h-5.5`, `bg-muted`, `text-neutral-ink`, `text-meta` at weight 500, `rounded-control`, a transparent border that forced colors draw) with no marker, no tone and no control; a long name truncates. Use it for roles, role kinds, scopes, approvers, modules and report cadences; a code inside it is a `tag`. A state is a `StatusBadge`, a count plain `num` text, a choice `ChoiceChip`, a removable filter `FilterChipList`.
```

(7) §5 Dialogs, **Close X** (`:409`): replace

```
While the dialog is busy, the X is disabled and has no box.
```

with

```
While the dialog is busy, the X is disabled and has no box. The X comes first in the DOM and the Tab order (it is `absolute`, so nothing moves), and focus still opens on the first control of the content: `DialogContent` and `SheetContent` call `focusFirstContentControl` (`src/components/ui/dialog-focus.ts`) from `onOpenAutoFocus` after the caller's own handler, unless that handler already moved focus (`initialFocusRef`, the scan room picker). When nothing in the content can take focus, Radix's default (the X) applies. Shift+Tab from the first field reaches the X (plan 2D-2, spec 2D D18).
```

(8) §5 Cards, **Border** (`:437`): replace

```
Tinted boxes (the dashboard's action cards and the callouts phase 2D moves) use `border-{tone}-border`; `MetricCard` and its tone fills are gone since plan 2B-5.
```

with

```
Tinted boxes (`Notice` warning and danger, and the callouts plans 2D-3 to 2D-5 still move) use `border-{tone}-border`; `MetricCard` and its tone fills are gone since plan 2B-5, and the dashboard's tinted action cards since plan 2D-2 (they are `StatStrip` cells).
```

(9) §5 Cards, **`ContentPanel divided`**: replace

```
Without `divided` the panel is the plain one.
```

with

```
Without `divided` the panel is the plain one. An element that cannot be a `ContentPanel` (a `<form>`, a `<details>`, a card in a page grid, a scroll target that needs an `id`) takes `cn(getPanelClasses(), "p-4 sm:p-5")`, the same frame and spacing; a frame inside a panel becomes a quiet grouping or goes (plan 2D-2).
```

(10) §5 Cards, **`StatStrip`** (`:441`): replace

```
Since plan 2B-5 it is the one number tile of the lists, the detail pages, the reports and the work center (`MetricCard` is deleted; guard LS2 is empty): a strip of money is one tile a row below `sm` (`max-sm:grid-cols-1`; the accounting strips keep two a row from `lg`), and more than four numbers split into strips of at most four (the work center), so a 28px value is never cut.
```

with

```
Since plan 2B-5 it is the one number tile of the lists, the detail pages, the reports and the work center, and since plan 2D-2 of the dashboard and the integration clients (`MetricCard` is deleted; guard LS2 is empty): a strip of money is one tile a row below `sm` (`max-sm:grid-cols-1`; the accounting strips keep two a row from `lg`), and more than four numbers split into strips of at most four (`splitStatRows` in `src/lib/stat-strip-rows.ts`: the work center and the dashboard's 4 + 3 KPIs), so a 28px value is never cut.
```

- [ ] **Step 5: `DESIGN.md` navigation and the do list (2 replacements).**

(11) Navigation, **Topbar** (`:504`): replace

```
- **Topbar:** white, `border-b`, no shadow. Its icon buttons are named from messages (see Dialogs, Menus and Confirmation).
```

with

```
- **Topbar:** white, `border-b`, no shadow. Its icon buttons are named from messages (see Dialogs, Menus and Confirmation). Since plan 2D-2 they are ghost `icon` `Button`s (36px from `md`, 44px below, 20px icons), the language and user menus open from ghost `md` triggers and the scan link is outline `md`. The right group keeps its width (`shrink-0`) and the search box takes what is left (`w-[min(28rem,36vw)]` on its anchor), so at 1024–1180px CSS width (200% zoom) the search narrows instead of running under the bell (spec 2D D18).
```

(12) Do's and Don'ts (`:582`): replace

```
`ChoiceCard` and `ChoiceChip`, `Steps`,
```

with

```
`ChoiceCard` and `ChoiceChip`, `Chip`, `Steps`,
```

- [ ] **Step 6: `docs/14_UI_UX_DESIGN_SYSTEM.md` (4 replacements).**

(1) Replace

```
| A status | `StatusBadge` | one size; there is no `size` prop |
```

with

```
| A status | `StatusBadge` | one size; there is no `size` prop |
| A name: a role, a scope, an approver, a module | `Chip` | neutral, no tone and no marker; a state is a `StatusBadge`; a code inside is a `tag` |
```

(2) Replace

```
money one tile a row below `sm`, and more than four numbers in strips of at most four |
```

with

```
money one tile a row below `sm`, and more than four numbers in strips of at most four (`splitStatRows`) |
```

(3) Replace

```
| A panel with a head row | `ContentPanel divided`, with `flush` for a table or a `ContentPanelRows` list | without `divided` it is the plain panel |
```

with

```
| A panel with a head row | `ContentPanel divided`, with `flush` for a table or a `ContentPanelRows` list | without `divided` it is the plain panel; a `<form>`, `<details>` or grid card that cannot be one takes `cn(getPanelClasses(), "p-4 sm:p-5")`; no frame inside a frame |
```

(4) Replace

```
`Notice tone="danger" role="alert"`, not on the page behind it |
```

with

```
`Notice tone="danger" role="alert"`, not on the page behind it; the X comes first in the Tab order and focus opens on the first control (`focusFirstContentControl`) |
```

- [ ] **Step 7: `DEVELOPER_HANDOFF.md` (1 replacement).** Replace the line `## Open Go-Live Decisions` (the only one) with the block below, which ends with that same line.
  - Replace `<today>` with today's date.
  - Write the two `<from task-19-findings.md>` markers from the findings: what was checked and where, the tab-row and topbar numbers, the first-focus result, fixes or "none", accepted mixes, issues not caused by this plan, and what still needs a person.
  - When "Still open" has more than two items, write nested bullets as the 2C plan 5 section does.

```
## UI Round 4 Phase 2D Plan 2 Admin, Reports, Dashboard and Shell (<today>)

- Branch `feat/ui-phase2d-plan2` in the main checkout (from `master` `da8388d`: phase 1, 2A, 2B plans 1–5, 2C plans 1–5 and 2D plan 1 merged, not deployed). Spec `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` §3.2 · plan `docs/superpowers/plans/2026-10-15-ui-phase2d-plan2.md` · canonical values in `DESIGN.md`. The second of five 2D plans, one at a time (D15).
- No new workflow, page, schema, migration, dependency, token or API change. Validation is unchanged. One visible permission change the spec asked for (D11): the users page shows its create button only with `user:create` (the page `/admin/users/new` already refused others).
- **Shared parts (Task 1):** the close X of `DialogContent` (`c/ui/dialog.tsx`) and `SheetContent` (`c/ui/sheet.tsx`) comes before the content, so the Tab order is X → content → footer and Shift+Tab from the first field reaches the X (D18). `focusFirstContentControl` (`c/ui/dialog-focus.ts`, Radix's own first-focus rule minus the X) runs from `onOpenAutoFocus` after the caller's handler, so focus still opens on the first control; `c/ui/accessible-dialog.tsx` did not change (R1). New `Chip` (`c/ui/chip.tsx`): the neutral 22px name chip (R2). `splitStatRows` moved to `src/lib/stat-strip-rows.ts` (R7).
- **Shell (Task 2, R10, R11):** the topbar menu, sidebar toggle and bell are ghost icon `Button`s (36px from `md`, were 44px at every width), the language and user triggers ghost `md`, the scan link outline `md`; the notification list shows its counts as `StatusBadge`s and "nothing new" as `EmptyNote`. The right group is `shrink-0` and the search width moved to its anchor in `c/layout/global-search.tsx` (two classes; the rest of that file is phase 3), so at 1024–1180px CSS width the search narrows instead of running under the bell (D18). The sidebar drawer's close is a ghost icon `Button`.
- **Admin (Tasks 3–14):** the settings form on 16 `ContentPanel`s, `Notice` by meaning (R5), three `DataTable`s, `KeyValueList`s for the overview and the document examples, two `StatStrip`s in the LDAP sync preview, keys, prefixes and tokens as `tag` (R3), the change-review key link switching tabs in place (`Link onNavigate`), the label preview on tokens, and the presets `md:min-h-9` (2D-1 R3). The depreciation builder lost its own frame (R13). The integration client manager (M27, R12): `StatStrip`, the token panel with a warning `Notice`, `DataTable`, the shared `StatusBadge`, scope `Chip`s, default `Button`s in the row with rotate `busy`. The role permission form; roles and users with create in `PageHeader` (M13, R8), `Chip`s and `StatusBadge`; the admin user form; storage (archive `Button busy`, M14); data quality (the review queue with an `md` scan button, rule cards with a severity `StatusBadge`, the rule form); readiness, approvals and history (R6 tones); the system log; access denied (`md`, 2D-1 R3).
- **Reports, notifications, dashboard, work center (Tasks 15–18):** notification actions on `Button`, cards on the panel classes with `StatusBadge` counts; the report presets, catalog (`<a download>`, cadence `Chip`), operations, overview and accounting (an empty ratio is `Nil`, 2D-1 R5) on `ContentPanel` and text links. The dashboard numbers are `StatStrip`s (7 KPIs as 4 + 3, the actions with `attention`, the trends with a "this month · last month: N · ±x%" foot), the status overview is `StatusBadge` rows, and no card has a tone fill (M30). The work center's follow-up panels are `ContentPanel`s with text links (D19), empty queues are `EmptyNote`s, and the dots are shape markers.
- **Messages:** `systemSettingsPage.tabDocuments` th "เอกสารส่งมอบ-รับคืน" → "เลขเอกสาร", en "Handover / Return Docs" → "Documents", so the 11 settings tabs fit at 1440 (R9); deleted `dataQualityPage.assetStateReviews.scanning` (2D-1 R6); none added; through `scripts/messages-edit.mjs`.
- **Guards:** LFG `system-settings-form.tsx` LV2 8 → 1 and LS1 deleted (LB1 stays 1); `IntegrationClientManager.tsx` LS1 and LN2 deleted (`BUDGETS.LN2` is `{}`); FMG `LOADER2` `IntegrationClientManager.tsx` 2 → 1; VFG R2 lost the rows of the two floating create buttons (10 → 8 shadows). No number went up.
- **Tests:** new files `tests/dialog-close-order.test.ts` (2), `tests/shared-chip-ui.test.ts` (1), `tests/stat-strip-rows.test.ts` (1), `tests/shell-sweep-ui.test.ts` (2), `tests/admin-sweep-ui.test.ts` (16), `tests/reports-dashboard-sweep-ui.test.ts` (9); pins edited with their file in 10 test files, guard rows in 3. 2020 → 2051 tests.
- **Rulings of this plan:** R1 (the X guard in the primitives), R2 (`Chip`), R3 (`tag` scope), R4 (panels), R5 (`Notice` by meaning), R6 (tones), R7 (dashboard numbers), R8 (create buttons), R9 (tab label), R10 (topbar width), R11 (shell buttons), R12 (integration manager), R13 (the depreciation builder), R14 (not taken), R15–R17.
- **Accepted until their plan:** the raw `<button>`s of the sidebar group row and the mobile "More" item (navigation primitives) and the global search clear button (phase 3) wait for 2D-5's `OWNERS`/`EXEMPT` lists; `ActiveBadge` (M7) stays for 2D-3; `DashboardPageSkeleton` keeps its old shape (open issue).
- **Not taken (R14, open issues for the user):** the four label props the settings page passes and the form never reads; the English literals of the LDAP sync modes, the builder's legacy rules ("months") and the overview's "d"; the advanced tab that renders nothing without general settings; the LDAP history link that skips the unsaved-changes guard.
- **Handed on:** 2D-3: `ActiveBadge` (M7) and the rest of 2D-1's hand-ons. 2D-5: the raw shell buttons for `OWNERS`/`EXEMPT`, `.impeccable/design.json`. Phase 3: `c/layout/global-search.tsx`.
- Dev-app check (Task 19): <from task-19-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2d-plan2/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy after 2D and V: <from task-19-findings.md>, together with the open checks of the sections above.
- Next: merge this branch; then plan 2D-3 (its plan first).

## Open Go-Live Decisions
```

- [ ] **Step 8: `docs/99_CHANGELOG.md`.**

The newest date at `da8388d` is `## 2026-10-15`.
  - If `<today>` is 2026-10-15, put the entry directly under that heading, above the 2D plan 1 entry.
  - Otherwise, first replace the line `## 2026-10-15` with:

```
## <today>

---

## 2026-10-15
```

Then replace the heading line `## <today>` (the newest, the only line with that date) with the block below. Write the marker from the findings in Thai, in the shape of the 2D plan 1 entry's bullet.

```
## <today>

### หน้าผู้ดูแลระบบ รายงาน แดชบอร์ด และกรอบหน้า (UI รอบ 4 เฟส 2D plan 2)

Branch `feat/ui-phase2d-plan2` (จาก `master` `da8388d`) · design `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` ข้อ 3.2 · plan `docs/superpowers/plans/2026-10-15-ui-phase2d-plan2.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md` · plan ที่ 2 จาก 5 ของ 2D

- **ขอบเขต:** หน้าผู้ดูแลระบบ รายงาน แดชบอร์ด ศูนย์งาน การแจ้งเตือน และแถบด้านบน/เมนูข้าง ใช้ชิ้นส่วนกลางชุดเดียวกับหน้าอื่น · ไม่มีขั้นตอนงานใหม่ ไม่แตะฐานข้อมูล ไม่แก้ API ไม่เพิ่ม token · การตรวจกรอกไม่เปลี่ยน
- **dialog:** ปุ่มปิด (X) อยู่ลำดับแรกเมื่อกด Tab (Shift+Tab จากช่องแรกไปถึงปุ่มปิด) แต่โฟกัสยังเริ่มที่ช่องแรกเหมือนเดิม · ใช้กับ dialog และแผงด้านข้างทุกตัว
- **กรอบหน้า:** ปุ่มไอคอนบนแถบด้านบน (เมนู ย่อเมนูข้าง กระดิ่ง) และปุ่มปิดเมนูข้างบนมือถือเป็นปุ่มกลาง 36px ตั้งแต่ 768px (เดิม 44 ทุกขนาดจอ มือถือยัง 44) · จำนวนในรายการแจ้งเตือนเป็นป้ายสถานะ · จอกว้าง 1024–1180px (ซูม 200%) ช่องค้นหาแคบลงแทนการซ้อนใต้กระดิ่ง
- **ตั้งค่าระบบ:** ทุกส่วนเป็นกรอบเนื้อหาแบบกลาง (ไม่มีกรอบซ้อนกรอบ) · ข้อความแนะนำและคำเตือนเป็น `Notice` ตามความหมาย · ตาราง 3 ตารางเป็นตารางกลาง · รหัสและคำนำหน้ารหัสเป็นตัวอักษรรหัส · ลิงก์ในรายการที่เปลี่ยนแปลงสลับแท็บโดยค่าที่ยังไม่บันทึกอยู่ครบ · แท็บ "เอกสารส่งมอบ-รับคืน" เปลี่ยนชื่อเป็น "เลขเอกสาร" (อังกฤษ "Documents") ให้ 11 แท็บพอดีจอ 1440px
- **Integration API:** ตัวเลขสรุปเป็นแถบตัวเลขกลาง · กล่อง Token ใช้ครั้งเดียวมีคำเตือนแบบกลาง · สถานะ client และจำนวน error เป็นป้ายสถานะ · สิทธิ์เป็นชิปชื่อ · ปุ่มในแถว 36px ตั้งแต่ 768px และปุ่มเปลี่ยน Token หมุนระหว่างทำงาน
- **บทบาทและผู้ใช้:** ปุ่มเพิ่มย้ายจากปุ่มลอยมุมล่างไปหัวหน้า · หน้าผู้ใช้แสดงปุ่มเพิ่มเฉพาะผู้มีสิทธิ์เพิ่มผู้ใช้ (เดิมแสดงทุกคนแล้วถูกปฏิเสธที่หน้าเพิ่ม) · ชื่อบทบาทเป็นชิปชื่อสีกลาง · สถานะเป็นป้ายสถานะ
- **หน้าอื่นของผู้ดูแลระบบ:** ไฟล์ (ปุ่มย้ายไป .archive หมุนระหว่างทำงาน) · คุณภาพข้อมูล (ปุ่มสแกน 36px ป้ายความรุนแรงเฉพาะกฎที่เปิดและพบรายการ) · ความพร้อมใช้งาน (การ์ดสีกลางพร้อมป้ายสถานะ) · การอนุมัติและประวัติ (นโยบายเป็นรายการค่า ชื่อโมดูลและผู้อนุมัติเป็นชิปชื่อ ผลพิจารณา "ปิด" เป็นสีกลาง) · บันทึกระบบ (ลิงก์ข้อความ) · ไม่มีสิทธิ์เข้าถึง (ปุ่ม 36px)
- **รายงาน การแจ้งเตือน แดชบอร์ด ศูนย์งาน:** ปุ่มของการแจ้งเตือนเป็นปุ่มกลาง · รายงานเป็นกรอบเนื้อหาแบบกลาง ลิงก์ดาวน์โหลดเป็นลิงก์ธรรมดา อัตราส่วนที่ไม่มีค่าแสดง "—" · แดชบอร์ด: ตัวเลขทุกชุดเป็นแถบตัวเลข (KPI 4 + 3) ไม่มีการ์ดพื้นสี แนวโน้มแสดง "เดือนนี้ · เดือนก่อน: N · ±x%" · ศูนย์งาน: ลิงก์ "ดูทั้งหมด" เป็นลิงก์ข้อความ คิวว่างเป็นบรรทัดเดียว
- **ข้อความ:** แก้ `systemSettingsPage.tabDocuments` · ลบ `dataQualityPage.assetStateReviews.scanning` ที่ไม่มีใครอ่าน · ไม่เพิ่ม key
- **guard:** `list-frame-guards` ลดแถวของหน้าตั้งค่าและ Integration API · `form-migration-guards` ไอคอนหมุนที่เขียนเอง 2 → 1 · เงาของปุ่มลอย 2 ปุ่มหายจากงบ (10 → 8) · ไม่มีตัวเลขเพิ่ม
- **test:** ไฟล์ใหม่ 6 ไฟล์ · test 2020 → 2051
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลัง 2D และงาน V
- **ตรวจบนแอป (Task 19):** <จาก task-19-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2d-plan2/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วเริ่ม 2D-3 (เขียน plan ก่อน)
```

Replace every `<today>` and the marker; none may stay. Check the Thai wording against `docs/19_THAI_GLOSSARY.md`.

- [ ] **Step 9: Check.**
  - Run `grep -n "<from task-19\|<จาก task-19\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md`. Expected: nothing.
  - Run `grep -n "Four larger shadows\|holds these 10\|role chips and a few info icons\|the dashboard's action cards and the callouts" DESIGN.md`. Expected: nothing.
  - Run `git diff --numstat`. Expected: exactly the four files. A file that shows every line changed was normalized; restore its line endings.
  - Run `node <temp>/eol.mjs DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`. Expected: equal numbers on every line.
  - Run `npm test` (2051 tests, 2050 pass, 1 skipped; `tests/audit-round-cancellation.test.ts` reads the handoff and the changelog), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 10: Commit.**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2D plan 2 admin, reports, dashboard and shell in DESIGN.md, design-system index, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - Add `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) `` to the 2D plan 2 changelog entry, directly above its "ตรวจบนแอป (Task 19)" bullet.
  - Add ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above "Dev-app check (Task 19)".
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again, then commit both files with `docs(ui): record phase 2D plan 2 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: 2D plan 2 is built on `feat/ui-phase2d-plan2` with the verify numbers, not merged, not deployed; the next step is 2D-3. Fix any sentence the row now contradicts (the D18 owner, the `scanning` key).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`:
    - the plan 2D-2 checks for a person (Task 19 Step 9): one new numbered item, also added to the list in item 27;
    - close the 2D-1 open issues this plan settled (D18 owner, the `scanning` key);
    - the open issues of this plan below, if the user has not ruled on them.

  Then:
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Never stage other sessions' changes in the vault.

- [ ] **Step 3: Memory.** Update `review-2026-10-priorities.md`: 2D plan 2 is built on `feat/ui-phase2d-plan2`, not merged, not deployed. Next: the merge choice, then the 2D-3 plan.

- [ ] **Step 4:** Use superpowers:finishing-a-development-branch. A local merge fast-forwards `master` (`git merge --ff-only feat/ui-phase2d-plan2` from `master`) and runs the tests on the merged result. Push only if the user asks.

---

## Open issues (for the user before or during execution)

1. **Plan size.** 22 tasks (0–21) and 31 code commits, with every replacement written out; Task 3 alone has 38 replacements in one 2,6xx-line file. It stays one plan because spec §3.2 is one plan and every commit is one file. If a session runs short, stop after any commit (the tree is green after each) and resume at the next task; Tasks 15–18 do not depend on Tasks 3–14.
2. **`DashboardPageSkeleton`** (`c/ui/page-skeleton.tsx`) keeps its old shape (a 5-tile grid and a box of 4 cards) while the page now shows a 4 + 3 KPI strip, an action strip and a trend strip. DESIGN.md says "a plan that reshapes a page reshapes its skeleton in the same commit". Proposal: a follow-up commit after Task 17 in this plan (`MetricGridSkeleton` → two `StatStrip` frames), or 2D-5. Not in the dry run.
3. **Four label props the settings page passes and the form never reads** (`generalSettings`, `selectCategory`, `accountingDepreciationPolicy`, `ldapSyncSchedulePreset`, R14). Delete them and their keys (2D-5 dead-code pass), or keep?
4. **English literals on Thai screens** (R14): the LDAP sync mode options ("Preview", "Manual", "Scheduled"), the depreciation builder's legacy rules ("months") and the "d" day suffix in the settings overview. Fixing them adds message keys, which this plan does not do. Which plan takes them?
5. **The advanced settings tab renders nothing when there are no general settings**, and **the LDAP history link skips the unsaved-changes guard** (R14). Behaviour, not sweep; for a later plan or the V track?
6. **Visible changes to confirm:** the topbar icon buttons are 36px from 768 (were 44 at every width) with muted ink at rest; the users create button disappears for viewers without `user:create` (D11); the "close" decision on approval history is neutral, no longer warning-tinted; the settings documents tab is renamed "เลขเอกสาร".
7. **The tab row at 1440** fits by measurement (Thai 932px, English 1062px of about 1121px). 2C plan 5 saw the row cut in both languages at 1440 although the old Thai row also measured under the width (992px), so Task 0 and Task 19 measure the live row; if it still scrolls, the next step is a smaller gap in `TabNav` for this row only, which needs a ruling.
8. **First focus in dialogs** is pinned by unit tests on plain objects only (no DOM test library); the proof is the Task 19 Step 5 table against Task 0. Dialogs the dev data cannot open are listed for a person.
