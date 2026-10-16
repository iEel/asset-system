# UI Round 4 · Phase 2D Sweep and Guard Lock · Plan 3 (assets and master data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Dry run:** scratch clone `p2d3-sim` of `2fcfad2`, sim commits 1a `8b34b5b`, 1b `d6fcfc4`, 1c `73450e6`, 1d `fbb112b`, 2 `34af2d3`, 3 `8bc0650`, 4 `a38343d`, 5a `c680665`, 5b `631fc39`, 6 `f0c874d`, 7 `619c4d0`, 8 `acc14ba`, 9 `cc37c9b`, 10 `b6b0c7a`, 11 `0f99fb8`, 12 `cbf46f2`, 13 `7a9e392`, 14a `a6b723d`, 14b `f71810b`, 15 `cdf897b`, 16a `fd751f9`, 16b `8540980`, 16c `ca553df`, 16d `3dc9736`, 16e `8b8d366`, 16f `f690e45`, 16g `3603bc1`, 16h `0deb179`, 17a `90d6a32`, 17b `046e253`, 18 `3d5a292`, 19a `f26c4fd`, 19b `256a1a3`, 19c `1a98cb1`. Tasks 0, 20, 21 and 22 were not run. Every code task (1a–19c) was carried out there in order, one commit each, and after every commit `npx tsc --noEmit`, `eslint` on the changed files and `npm test` were green (final: 2087 tests, 2086 pass, 1 skipped). Every replacement below was taken from those commits by a script that checked two things: each old snippet occurs exactly once where it is applied, and applying the snippets in order gives the committed file. The "watch it fail" lists were taken by running each task's new and edited tests (not the guards) against the commit before it, and the check lists and their counts at each commit.

**Dry run (verification of this plan at `a2d8088`):** scratch clone `p2d3-sim`, sim commits 1a `4372b2d`, 1b `b9c637e`, 1c `1a344cc`, 1d `6dca591`, 2 `c3251ed`, 3 `47cc397`, 4 `60c5019`, 5a `84db1e6`, 5b `49c8b20`, 6 `af8a6a1`, 7 `4dc99c4`, 8 `cdcdaaa`, 9 `42b00cd`, 10 `4486bd2`, 11 `ceaaa41`, 12 `0919557`, 13 `ec96ddc`, 14a `320c6ef`, 14b `45a94d8`, 15 `35d6408`, 16a `e7671de`, 16b `e30d6ea`, 16c `8014612`, 16d `0c71b2e`, 16e `aaf6ac1`, 16f `5ef6494`, 16g `e9d8a21`, 16h `1f88727`, 17a `1c59df3`, 17b `03ba777`, 18 `9989140`, 19a `7c6e8be`, 19b `47acec9`, 19c `9400c35`, 21 (docs) `0b9bc1c`. Tasks 0, 20 and 22 were not run (Task 21's two Task 20 markers read "(dry run: Task 20 not run)"). Every replacement matched exactly once in order, every failing test failed with the listed names, every count matched, and `tsc` and `eslint src tests` were clean after every commit (final: 2087 tests, 2086 pass, 1 skipped). Two fixes came from it: D1, `DESIGN.md` is LF (Global Constraints, Task 21 intro and Steps 1 and 8), and G1, Task 5a replacement (47) for the license seat counts with its `toLocaleString` assertion. Every sim commit of both dry runs predates both fixes. G1 changes two blobs: `D/assets/[id]/page.tsx` and `tests/assets-sweep-ui.test.ts` differ in 5a (`84db1e6`, first run `c680665`) and in every later sim commit's tree. D1 changes only the expected check output, so no blob differs for it.

**Base:** `master` is `bed4f16` (the Thai font fix, one commit after `2fcfad2`). That commit touches none of this plan's source files. Of its test files only `tests/visual-foundation-guards.test.ts` is also in this plan, and its one block here (Task 9, `TABLE_HEADER_FILLS`) is far from the font test it changed. Its `DESIGN.md`, `DEVELOPER_HANDOFF.md` and `docs/99_CHANGELOG.md` changes are the text Task 21 edits. The replacements of Tasks 1a–19c were replayed on a clone of `bed4f16` with the same result. Baseline at `bed4f16`: 2051 tests, 2050 pass, 1 skipped, `tsc` clean.

**Goal:** Sweep the asset screens and the master data onto the shared parts (spec 2D §3.3):
- The asset page (`D/assets/[id]/page.tsx`, M12, its 16 raw colors), its movement timeline, evidence drawer, attachments, purchase documents, components summary and banner, QR code and status correction.
- The asset form, the batch form and the component manager; the import panel (M15) and the import-export page; the label batch tool, the label print toolbar and the scan search (M23 from `status.name`); the register's filter sheet, toolbar, table and phone list; My Assets (M32 c).
- The master-data lists (`ActiveBadge` M7, the 12 drill-down links), the brands page (2D-1 R3 `:425`), the suppliers list and page (M32 a), the employee page and the nine master-data forms.
- Panels are `ContentPanel` (or `getPanelClasses()` where the element cannot be one), messages `Notice` by meaning, states `StatusBadge`, names `Chip`, empty states `EmptyNote` / `ActionEmptyState`, empty values `Nil`, label and value pairs `KeyValueList`, numbers `StatStrip`, buttons `Button` / `buttonVariants`, text links `linkVariants`, record codes `tag` (M33).

Workflows, data, validation, permissions, messages, the API and the database stay the same.

**Architecture:**
- **One file is one commit** (or a tight pair that shares a prop or a type), with every sweep category of that file and its guard rows in the same commit (spec §3, §5.6). Small and shared files come first (Task 1), then the asset page and its parts (2–5), the asset forms (6–8), import, labels and scan (9–13), the register (14), My Assets (15), the master-data lists (16), the suppliers (17), the employee page (18) and the master-data forms (19). The order keeps `npx tsc --noEmit`, `npm test` and `npm run lint` green after every commit.
- **Branch:** `feat/ui-phase2d-plan3` in the main checkout `D:/Antigravity/asset-system`. No worktree: one plan at a time (D15).
- **Tests:** two new UI test files collect the sweep pins, one test per commit, appended in order:
  - `tests/assets-sweep-ui.test.ts` (Tasks 1–15, 21 tests)
  - `tests/master-data-sweep-ui.test.ts` (Tasks 16–19, 13 tests)
  - plus one unit test each in `tests/asset-import-batch.test.ts` (Task 9) and `tests/operational-return-navigation.test.ts` (Task 15).
  - Existing pins that lock what changes are edited in the same commit. Each new or edited assertion fails before its change.
- **Controller tasks:** Task 0 (branch, baseline, ids, before screenshots), Task 20 (verify, production build, dev-app check), Task 22 (verify numbers, wiki, memory, finishing). **Task 21** writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md`.
- **What this plan covers:** §3.3 and every M row whose plan column names 2D-3 or "by file" for these files: M7, M12, M15, M17 (these files' LFG rows), M20–M22, M23 (the badges), M25, M27 (the label batch tool `:731`, the status correction `:64`, the cancel dialog `:143` and the tape box at 1440), M29, M32 a, b and c, M33; D7, D9, D19; and the hand-ons of plans 2D-1 (`brands/page.tsx:425`, M32, `status.name` in the scan search and the label tool) and 2D-2 (`ActiveBadge`).
- **Line numbers** in this plan are from `bed4f16` unless a step says otherwise.
- **Prior art for the format:** `docs/superpowers/plans/2026-10-15-ui-phase2d-plan2.md`; its Rulings R2–R6 apply here unchanged (R1 below).

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/ui-phase2d-plan3`, which holds `master` `bed4f16` and this plan's commit.
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`.
  - Commit only the files your task names. Use `git add <paths>` (quote paths with brackets or parentheses) and never `git add -A` or `git add .`.
  - The checkout has untracked folders and files that are not yours: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`; another session may add `.claude/` while its preview server runs. Leave them alone.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Never create a git worktree whose `node_modules` is a junction to the main checkout's, and never let git remove one: `git worktree remove` follows the junction on Windows and deletes the main `node_modules`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before you use an API you have not seen in this repo. This plan adds no Next.js API; it only uses `Link`, `Image` and `searchParams` the way the files already do.
- **Line endings:**
  - `git config core.autocrlf` is `true` (system level). Most files this plan edits are CRLF in the working tree (`i/lf w/crlf`). These are LF: `src/components/assets/asset-qr-code.tsx`, `src/lib/asset-import-batch.ts`, `tests/asset-batch-form-layout.test.ts`, `tests/asset-import-batch.test.ts` and `tests/dead-code-cleanup.test.ts`, and so are the two new test files. `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md` and `docs/99_CHANGELOG.md` are CRLF; `DESIGN.md` is LF in the working tree (`i/lf w/lf`).
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files, so do not use it as a check.
  - Edit with exact-string replacement (the Edit tool keeps the file's line endings), never a formatter, and never normalize a file.
  - Appending a block to one of the new LF test files needs nothing more.
  - Check line endings with `node <temp>/eol.mjs <file>…`. A CRLF file prints the same number twice; an LF file prints 0 and then the line count:

```js
// eol.mjs: node <temp>/eol.mjs <file>…   prints "<file> <CRLF count> <LF count>".
import { readFileSync } from "node:fs"
for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, "utf8")
  console.log(file, (source.match(/\r\n/g) ?? []).length, (source.match(/\n/g) ?? []).length)
}
```

  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes.
- **How to read a replacement step:** "(n) Replace … with …" shows the old text exactly as it is in the file (LF shown; a CRLF file has CRLF) and the new text. Apply the replacements of a file in the order given; each old text occurs exactly once at the moment you apply it. Indentation is the file's own. A replacement may start or end in the middle of a JSX element: it is a text replacement, not a node. "Append to" adds the block at the end of the file after one blank line; the first line of the block shown empty is that blank line.
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}`. Run one file with `node --test tests/<file>.test.ts`.
  - `tsconfig.json` includes `**/*.ts`, so **tests are type-checked**.
  - Modules that tests import use relative `.ts` imports (no `@/`). Tests cannot import `.tsx`; they read `.tsx` source text instead.
- **Baseline at `bed4f16`** (checked while writing this plan; Task 0 checks it again):
  - `npm test`: 2051 tests, 2050 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean. `npm run lint`: 0 errors (the warnings are under `.agents/`; Task 0 records their number).
  - **After this plan:** 2087 tests, 2086 pass, 1 skipped. Each task states its own count.
- **Every task ends with all of these green:** `npm test` with 0 fail and the task's count; `npx tsc --noEmit`; `npm run lint` with 0 errors and no new warning in `src/` or `tests/`. Report any failure by name.
- **Messages:** none change. No key is added, changed or deleted; every label a step passes already exists. If you think a key is missing, stop and report it.
- **No new tokens (2A I21).** No custom property in `:root`, `@theme inline` or `@theme`, no edit to `tests/design-tokens-contrast.test.ts`, never `rounded-[…]`.
- **No migration, no DB write, no schema change, no API change.** Task 13 reads the `status.name` that plan 2D-1 added to `src/app/api/search/route.ts`.
- **Guards only go down.** Never raise a number in `tests/visual-foundation-guards.test.ts` (VFG), `tests/form-migration-guards.test.ts` (FMG) or `tests/list-frame-guards.test.ts` (LFG), and never add a row. LFG L9 holds `BUDGETS` equal to `KEEP` and L10 holds every `KEEP` row equal to its live count, so the commit that moves a site lowers (or deletes at 0) its row in `BUDGETS` and `KEEP` together. A name added to the `LOCAL_KEY_VALUE` or `LOCAL_STAT_TILE` regex (D19) is added in the commit that removes the last function of that name, so the count stays 0.
- **No validation change.** Keep every `required`, `maxLength`, `minLength`, `pattern`, `toast.error` and `disabled` gate. FMG `CONSTRAINT_FLOORS` must still hold.
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 20.
  - Do not run skill helper scripts; they make network calls.
  - Keep helper scripts in your temp folder (`<temp>`), outside the repo.
  - Shell heredocs and `node -e` may drop backslashes. Write regex-bearing text with a file-writing tool.
- **Deploy:** none. One deploy after 2D and the V track (D17).

## Rulings of this plan

- **R1, the 2D-2 rulings apply** (`docs/superpowers/plans/2026-10-15-ui-phase2d-plan2.md`):
  - R2 `Chip` for names (a count is plain `num` text);
  - R3 `tag` scope: short codes are `tag` (at `font-medium` where the row's own id); a code that must wrap keeps `font-mono` with `break-all` or `[overflow-wrap:anywhere]` (the import batch id, the QR target URL, the relationship card's tag), and an editable `Input`/`Textarea` keeps `font-mono`;
  - R4 panels: a page-level panel is `ContentPanel`; an element that cannot be one (a `<form>`, a `<details>`, an `<aside>`, a section that needs an `id` as a scroll target, a link card) takes `cn(getPanelClasses(), "p-4 sm:p-5")`; a grouping inside a panel is the quiet `rounded-md border border-border bg-background`; no frame inside a frame (a card in a panel drops to a quiet grouping, a table in a panel is `framed={false}`, a box around a dropzone goes);
  - R5 `Notice` by meaning (R4 below lists this plan's).
- **R2, the cancel dialog type (M32 b, cross-plan):** the asset page passes a transaction's missing state snapshot as `null` instead of a typed "-" (M32 b). `c/asset-operations/transaction-cancel-dialog.tsx` belongs to 2D-4, and 2D-1 handed it its "M32 b type" for that reason; this plan widens only `currentState` and `restoreState` to `string | null` and shows `orNil(value)` in the facts list (Task 1d), so the asset page can compile in Task 5a. 2D-4 sweeps the rest of the dialog.
- **R3, markers and tones:**
  - The activity drawer and the movement timeline draw `statusMarkerVariants({ tone })` shapes (the `StatusBadge` markers, so color is never the only cue), not tone-colored dots.
  - Asset states take `getAssetStateTone(status.name)` (M23) everywhere, also where the data had a `colorCode`.
  - Photo checklist done → `success`, pending → `muted`; warranty → its state's tone; data health → `success` when complete, otherwise `warning`; import batch ready / partial / blocked / anything else → `success` / `warning` / `danger` / `muted` (`getAssetImportBatchStatusTone`, Task 9); rollback done → `success`, otherwise `muted`; a label printed at least once → `success`, never → `muted`; components missing a serial → `warning`; active master data → `success`.
- **R4, `Notice` by meaning (D7) in this plan:**
  - `info`: the clone banner and the license seats of the asset form, how the asset's ownership type works (the asset page's quick actions), the component context banner.
  - `neutral`: the status correction description, "no custodian needed" (asset form), the label print guidance, the QR target when it is public, the relationship note of the asset page, "save the model before adding a photo" (model form).
  - `warning`: cross-company and cross-branch assignments (asset and batch forms), the protected status help (asset form), duplicate serials or tags (batch form), the import issues, the QR target when it is local only, the asset page's replacement warning, the supplier and employee follow-ups.
  - `danger` with `role="alert"`: the label print error, the import error.
  - `success`: the component manager's "saved", the import result (`role="status"`), "print recorded" (`role="status"`).
  - The batch form's duplicate check result takes its tone from the result (clean `success`, duplicate `warning`, error `danger`) and no live role (a toast already announces it).
- **R5, raw `<button>`s that stay** (for 2D-5's `OWNERS`/`EXEMPT` lists, each with a comment at the site): the three photo buttons of `asset-attachments.tsx` (an image is the control); the candidate rows of `asset-component-manager.tsx` (a pressed list option with two lines); the result and queue rows of `asset-label-batch-tool.tsx` (two lines that add to the print list); the 24px help trigger of `asset-state-help-popover.tsx` (inside a field label and a table head) and the preview button of `asset-thumbnail.tsx` (an image) are not changed in this plan.
- **R6, master-data lists (M7, §3.3):**
  - The 12 drill-down counts (branches 2, categories 2, companies 2, employees 1, locations 1, brands 3, suppliers 1) are text links: `cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")` in a table cell, `cn(linkVariants(), …)` (13px) in the brand picker. A zero is plain `formatCount(0)`, not a padded span.
  - `<ActiveBadge label={tCommon("active")} />` becomes `<StatusBadge label={tCommon("active")} tone="success" />` on the seven pages; then `ActiveBadge` is deleted from `c/master-data/master-data-layout.tsx` (Task 16h).
- **R7, M23:** the label batch tool and the scan search show the asset state as `StatusBadge` with `getAssetStateTone(status.name)`; their row types take `name?: string | null` (the API sends it since 2D-1), and the label tool's queue mapper copies it. No `colorCode` reaches a badge (DESIGN.md "Database colors are not shown" becomes true everywhere).
- **R8, M32:**
  - a: an empty purchase document total is `null` on the supplier page and shows `Nil` (was `Number(… ?? 0)`, shown 0.00); the money cell is `orNil(formatMoney(total))`.
  - b: the asset page's `getCheckoutDestination` and `formatCancellationSnapshot` return `null` instead of "-"; the cancel dialog takes `null` (R2).
  - c: the My Assets list passes its own page and page size as `returnTo` to the detail page (`buildMyAssetDetailHref(locale, assetId, returnHref)`), and the detail page's back link goes there through `normalizeOperationalReturnTo(locale, "my-assets", …)`, a new section of `src/lib/operational-return-navigation.ts`.
- **R9, M12, the disabled QuickAction:** a quick action the user cannot take is `<Button variant="outline" disabled className={quickActionClasses}>`, a real disabled button that screen readers announce, instead of a `<span>` that looked disabled; an enabled one is the outline `buttonVariants` `Link`.
- **R10, M15 and the table header budget:** the import panel moves its table onto `DataTable` (`framed={false}`, its 320px scroll kept), so VFG's `TABLE_HEADER_FILLS` reaches `{}`, LFG LT1 loses its last row and `SummaryPill`/`SummaryItem` give way to `StatStrip` and `KeyValueList`.
- **R11, M27:** the label batch tool's count is `formatCount` (`:731`); the status correction trigger says whether its panel is open (`aria-expanded`, `aria-controls`, `:64`); the cancel dialog shows `Nil` (`:143`, R2); the label print tape-size box keeps its width at 1440 (`sm:shrink-0`).
- **R12, D19 helpers:** `MovementInfo` (timeline), `ReviewItem` (component manager), `MobileField` (My Assets) and `DocumentFact` (supplier purchase documents) become `KeyValueList`s and join `LOCAL_KEY_VALUE`; `EvidenceStat` (evidence drawer) and `SummaryItem` (batch form, import panel) become `StatStrip`/`KeyValueList` and join `LOCAL_STAT_TILE`, each in the commit that removes its last function.
- **R13, dead code (D12):** after the asset page stops calling them, `getWarrantyIconClass`, `getWarrantyPanelClass`, `getHealthBadgeClass`, `getActivityToneClass` and the `AssetDetailTone` type leave `src/lib/asset-detail-format.ts` (Task 5b); `ActiveBadge` leaves `master-data-layout.tsx` (Task 16h); the asset page's own `getToneDotClass` and the timeline's `formatDateTime` copy go with their files.
- **R14, 2D-1 hand-on:** the brands page's create-model link (`:425`) is `size: "md"` (was `lg`; it is not beside a 40px field).
- **R15, not taken (open issues for the user):** `text-xs` that is not in a sweep category (the register phone row, the help popover, the employee list's position and email line); the asset relationship lists that keep bordered link rows inside a quiet grouping; the My Assets photo box's `rounded-lg`. None is a 2D sweep category.
- **R16, guard rows this plan moves (all down):**
  - LFG LV2 (typed "-"): `asset-purchase-documents.tsx` 1, `asset-movement-timeline.tsx` 2, `asset-form.tsx` 1, `asset-batch-form.tsx` 8, `asset-component-manager.tsx` 3 and `asset-import-preview-panel.tsx` 2 → deleted (61 → 44 typed "-" left); the asset page's row stays 4 with its comment on the new lines.
  - LFG LV1: `asset-import-preview-panel.tsx` 4 and `asset-label-batch-tool.tsx` 1 → deleted (the `KEEP.LV1` key goes; `BUDGETS.LV1` is `{}`). LT1: the import panel 5 → deleted (`KEEP.LT1` goes). LS1: the import panel 1 → deleted. LK1: the timeline 1 → deleted (`KEEP.LK1` goes). LB1: `asset-label-print.tsx` 1 → deleted (it has a `PageBackLink` now).
  - VFG `TABLE_HEADER_FILLS` 1 → `{}`. FMG: only the line numbers in the comments of `LOADER2` and `RAW_FIELDS` change (the numbers stay).

## Review Focus

1. **The asset page keeps every section, link and id.** Nine sections keep their `id` (the page's section links and `scroll-mt-24`) on the panel classes; the quick actions keep their hrefs and the disabled ones are real disabled buttons (M12). Pinned by `tests/assets-sweep-ui.test.ts` and the edited `asset-detail-ux` and `asset-relationship-map-ui` pins; Task 20 opens every section link and quick action at 1440 and 375.
2. **Empty values show `Nil`, never "-" or 0.00,** on the asset page (M32 b), the supplier purchase documents (M32 a), the batch form, the component manager, the import panel and the movement timeline. Pinned per file; Task 20 opens an asset without a checkout destination, a supplier with a document without a total if the data has one.
3. **The register, the label tool and the scan search show the same states as before** in the shared `StatusBadge` from `status.name` (M23): no database color reaches the screen. Task 20 compares the badges with the before screenshots.
4. **The master-data counts still open the same filtered lists** and keep a 44px target on phones (the 12 drill-down links); `aria-current` stays on the brand picker (LN1 2, I11). Task 20 compares each `href` with the before DOM.
5. **The My Assets back link returns to the page the user came from** (M32 c), with its page size, and falls back to the first page for a link without `returnTo`. Pinned by `tests/operational-return-navigation.test.ts`; Task 20 opens page 2 of My Assets if the dev data has one.
6. **Forms save exactly what they saved before.** Only markup moved in the asset, batch, component, model, category and the seven simple forms: the same fields, `required`/`maxLength` (FMG floors), submit buttons and confirm dialogs. Task 20 opens each form and leaves without saving.

## File structure

| File | What changes | Task |
|---|---|---|
| `c/ui/activity-drawer.tsx` | shape markers, no capitals | 1a |
| `c/assets/asset-qr-code.tsx` | no frame of its own, `tag` | 1b |
| `c/assets/asset-status-correction-button.tsx` | `aria-expanded`, quiet panel, neutral `Notice` (M27) | 1c |
| `c/asset-operations/transaction-cancel-dialog.tsx` | `string \| null` states, `Nil` (R2) | 1d |
| `c/assets/asset-purchase-documents.tsx` | `EmptyNote`, `Nil`, `tag`, shared buttons | 2 |
| `c/assets/asset-attachments.tsx` | `ContentPanel`, `StatusBadge`, shared buttons, `EmptyNote` | 3 |
| `c/assets/asset-components-summary.tsx`, `asset-component-context-banner.tsx` | `ContentPanel`, info `Notice`, text links | 4 |
| `D/assets/[id]/page.tsx`, `c/assets/asset-movement-timeline.tsx`, `c/assets/asset-evidence-drawer.tsx` | the whole sweep (M12, M32 b); `ChoiceChip` filters, `KeyValueList`, `StatStrip` | 5a |
| `src/lib/asset-detail-format.ts` | four helpers and a type deleted | 5b |
| `c/assets/asset-form.tsx` · `asset-batch-form.tsx` · `asset-component-manager.tsx` | the form sweeps | 6 · 7 · 8 |
| `c/assets/asset-import-preview-panel.tsx`, `src/lib/asset-import-batch.ts` | M15; `getAssetImportBatchStatusTone` | 9 |
| `D/asset-management/import-export/page.tsx` | link cards, history `ContentPanel`, `StatusBadge` | 10 |
| `c/assets/asset-label-batch-tool.tsx` · `asset-label-print.tsx` · `asset-scan-search-tool.tsx` | M23, M27 | 11 · 12 · 13 |
| `c/assets/asset-register-filter-sheet.tsx`, `asset-register-toolbar.tsx` · `asset-register-table.tsx`, `asset-register-mobile-list.tsx` | `ChoiceChip`, sheet footer · `Chip`, panel frame | 14a · 14b |
| `D/my-assets/page.tsx`, `D/my-assets/[id]/page.tsx`, `src/lib/operational-return-navigation.ts` | M32 c, `KeyValueList` | 15 |
| `D/master-data/{branches,categories,companies,departments,employees,locations}/page.tsx` | drill-down links, `StatusBadge` (M7) | 16a–16f |
| `D/master-data/brands/page.tsx` · `c/master-data/master-data-layout.tsx` | the brands sweep (2D-1 R3) · `ActiveBadge` deleted | 16g · 16h |
| `D/master-data/suppliers/page.tsx`, `c/master-data/supplier-list-view.tsx` · `D/master-data/suppliers/[id]/page.tsx`, `c/master-data/supplier-purchase-documents.tsx` | panel classes, `KeyValueList` · `ContentPanel`, M32 a | 17a · 17b |
| `D/master-data/employees/[id]/page.tsx` | `ContentPanel`, warning `Notice`s, `EmptyNote` | 18 |
| `c/master-data/asset-model-form.tsx` · `category-form.tsx` · the seven simple forms | panel classes, `ContentPanel`, `EmptyNote` | 19a · 19b · 19c |
| `tests/*` | two new files; pins edited with their file | 1a–19c |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 2D-3 docs | 21 |

`D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/`.

---

### Task 0: Branch, baseline, ids and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: a launch configuration for the dev server only while it runs; never committed. If `.claude/launch.json` already holds another session's configuration, do not edit or delete theirs: add your own entry with its own name and port, and remove only that entry afterwards.
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan3/before/` and `.superpowers/sdd/ui-phase2d-plan3/task-0-baseline.md` (git-ignored)

**Interfaces:**
- Consumes: `feat/ui-phase2d-plan3` at the plan commit (on `bed4f16`).
- Produces: the baseline numbers, the ids, the before images and the before `href` lists, which Task 20 compares against.

- [ ] **Step 1: Branch and base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2d-plan3`

Run: `git merge-base --is-ancestor bed4f16 HEAD && git diff --quiet bed4f16 HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`. The branch holds only this plan on top of `master`.

Run: `git status --short`
Expected: only the untracked folders and files that the Global Constraints name.

- [ ] **Step 2: Baseline.**
  - Run `npm test`. Expected: 2051 tests, 2050 pass, 0 fail, 1 skipped.
  - Run `npx tsc --noEmit` (clean) and `npm run lint` (0 errors; record the number of warnings and check they are all under `.agents/`).
  - Record the numbers in `task-0-baseline.md`.

- [ ] **Step 3: Temp scripts.** Save `eol.mjs` (Global Constraints) in `<temp>`. Hand its path to every implementer.

- [ ] **Step 4: Dev server.**
  - Add a launch configuration `name: "asset-2d3-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false` (if another session's server holds 3100, use 3102 and say so in the baseline file).
  - Start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Log in with the seed admin of `prisma/seed.ts`; do not echo the password.
  - Use your own browser tab. Do not reuse a tab another session left open (a page with unsaved changes asks before it navigates; answer "stay").

- [ ] **Step 5: Ids.** Record these, and note any the dev data lacks:
  - an asset with photos, an image attachment, purchase documents, a parent or components, a QR target, a checkout history and a cancelled transaction if there is one (`/th/assets/<id>`)
  - an asset whose quick actions are partly disabled (a disposed or pending-disposal asset)
  - a supplier with purchase documents (one without a total if the data has one), maintenance tickets and follow-ups (`/th/master-data/suppliers/<id>`)
  - an employee with current assets, handovers, repairs, subordinates and audit items (`/th/master-data/employees/<id>`)
  - an asset model with a photo, a category with a custom field template, a brand with models
  - an import batch in the history (`/th/asset-management/import-export`)
  - the seed admin's own assets on `/th/my-assets` (more than one page at the smallest page size if possible)

- [ ] **Step 6: Before `href`s.** With inline Playwright code (`browser_run_code_unsafe`), save every `a[href]` inside `main` (text, `href`) on these pages to `task-0-baseline.md`: `/th/master-data/branches`, `categories`, `companies`, `departments`, `employees`, `locations`, `brands`, `suppliers`, the supplier and employee pages, `/th/assets/<id>`, `/th/my-assets`.

- [ ] **Step 7: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2d-plan3/before/<view>-<width>.png` at 1440, 768 and 375:
  - `/th/assets/<id>` (top, then each section by its link), with the evidence drawer and the activity drawer open, and the status correction panel open (do not submit)
  - `/th/assets/<id>/edit`, `/th/assets/new`, `/th/assets/new?mode=batch` (or the batch page the asset menu opens), `/th/assets/<id>/components`
  - `/th/assets` with the filter sheet open (375) and select mode on (375)
  - `/th/asset-management/import-export`, `/th/asset-management/labels` (with two rows in the queue; do not print), the label print page from it, `/th/asset-management/scan` with a search typed
  - `/th/my-assets`, `/th/my-assets/<id>`
  - the eight master-data lists, `/th/master-data/brands?brand=<id>`, the supplier and employee pages, and the new and edit form of each master-data type (do not save)
  - Write nothing.

- [ ] **Step 8: Clean up.** Stop your server and remove your launch configuration (only yours; delete `.claude/launch.json` only if you created the file). `git status --short` shows what Step 1 showed. No commit in this task.


---

### Task 1: Small and shared files first

Spec D7, D9, M22, M27, M32 b, M33; R2, R3. Four commits. 1a creates `tests/assets-sweep-ui.test.ts`; every later task of Tasks 1–15 appends one test to it.

#### 1a: `c/ui/activity-drawer.tsx`

Each item's dot becomes the `StatusBadge` marker shape, `cn(statusMarkerVariants({ tone: item.tone ?? "neutral" }), "mt-2")` (R3), so color is not the only cue; the labels lose `uppercase` and their tracking (13/500 `muted-foreground`), and the local `getToneDotClass` goes.

**Files:**
- Modify: `src/components/ui/activity-drawer.tsx`
- Create: `tests/assets-sweep-ui.test.ts` (LF)

- [ ] **Step 1: The failing test.** Create `tests/assets-sweep-ui.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-3 (spec 2D §3.3, D7, D9, M12, M15, M22, M23, M25, M27, M29, M32, M33): the asset pages, the asset tools and
// my assets on the shared parts. Panels are ContentPanel (or getPanelClasses where the element cannot be one), tables
// DataTable, numbers StatStrip, label and value pairs KeyValueList, messages Notice by meaning, states StatusBadge, names
// the shared Chip, empty states EmptyNote or ActionEmptyState, codes tag, empty values Nil. Each test pins one file (or
// one tight group) and fails before that commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("activity drawer: each item's marker is a status shape and its label has no capitals (spec 2D M22)", () => {
  const source = read(`${C}ui/activity-drawer.tsx`)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone: item\.tone \?\? "neutral" \}\), "mt-2"\)\} \/>/)
  assert.match(source, /<div className="text-meta font-medium text-muted-foreground">\{item\.label\}<\/div>/)
  assert.doesNotMatch(source, /uppercase|tracking-normal|rounded-full|getToneDotClass|\bbg-info\b|\btext-xs\b/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "activity drawer: each item's marker is a status shape and its label has no capitals (spec 2D M22)"

- [ ] **Step 2: The drawer.** In `src/components/ui/activity-drawer.tsx` (CRLF):

(1) Replace

```tsx
import { useState, type RefObject } from "react"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

with

```tsx
import { useState, type RefObject } from "react"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

(2) Replace

```tsx
              {items.map((item, index) => (
                <li key={`${item.label}-${index}`} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", getToneDotClass(item.tone))} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{item.label}</div>
                      <div className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</div>
                      {item.meta ? <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div> : null}
                    </div>
                  </div>
                </li>
```

with

```tsx
              {items.map((item, index) => (
                <li key={`${item.label}-${index}`} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start gap-3">
                    {/* Spec 2D M22: the tone is a status shape (ring, dot, triangle, diamond, bar), so it does not rely on color. */}
                    <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: item.tone ?? "neutral" }), "mt-2")} />
                    <div className="min-w-0">
                      <div className="text-meta font-medium text-muted-foreground">{item.label}</div>
                      <div className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</div>
                      {item.meta ? <div className="mt-1 text-meta text-muted-foreground">{item.meta}</div> : null}
                    </div>
                  </div>
                </li>
```

(3) Replace

```tsx
    </Sheet>
  )
}

function getToneDotClass(tone: ActivityDrawerItem["tone"]) {
  if (tone === "danger") return "bg-danger"
  if (tone === "warning") return "bg-warning"
  if (tone === "success") return "bg-success"
  if (tone === "info") return "bg-info"
  if (tone === "primary") return "bg-primary"
  return "bg-muted-foreground"
}
```

with

```tsx
    </Sheet>
  )
}
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/sheet-drawers-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (80 tests).
  - Run `node <temp>/eol.mjs src/components/ui/activity-drawer.tsx tests/assets-sweep-ui.test.ts`. Expected: equal numbers for `src/components/ui/activity-drawer.tsx`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2052 tests, 2051 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/ui/activity-drawer.tsx tests/assets-sweep-ui.test.ts
git commit -m "refactor(ui): activity drawer markers are status shapes and its labels lose the capitals (2D-3 task 1a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 1b: `c/assets/asset-qr-code.tsx` (LF)

The QR code sits inside the asset page's QR panel, so it draws no frame of its own (R1: no frame inside a frame): the wrapper is `inline-flex flex-col items-center gap-3`, and the asset tag under the code is a `tag` at `font-medium` in a `max-w-44` line.

**Files:**
- Modify: `src/components/assets/asset-qr-code.tsx` (LF)
- Modify: `tests/assets-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("QR code: no frame of its own inside the QR panel, and the asset tag under it is a tag (spec 2D D9, M33)", () => {
  const source = read(`${C}assets/asset-qr-code.tsx`)
  assert.match(source, /<div className="inline-flex flex-col items-center gap-3">/)
  assert.match(source, /<div className="max-w-44 text-center text-sm text-foreground">\n\s+<span className="tag font-medium">\{label\}<\/span>\n\s+<\/div>/)
  assert.doesNotMatch(source, /bg-white|rounded-lg|border|text-xs/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "QR code: no frame of its own inside the QR panel, and the asset tag under it is a tag (spec 2D D9, M33)"

- [ ] **Step 2: The QR code.** In `src/components/assets/asset-qr-code.tsx` (LF):

Replace

```tsx

import { QRCodeSVG } from "qrcode.react"

export function AssetQrCode({ value, label }: { value: string; label: string }) {
  return (
    <div className="inline-flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-4">
      <QRCodeSVG value={value} size={160} level="M" includeMargin />
      <div className="max-w-44 text-center text-xs font-medium text-foreground">{label}</div>
    </div>
  )
}
```

with

```tsx

import { QRCodeSVG } from "qrcode.react"

// The QR panel of the asset page is the frame (spec 2D D9): no box inside it. includeMargin keeps the white quiet zone
// that a scanner needs, drawn by the SVG itself.
export function AssetQrCode({ value, label }: { value: string; label: string }) {
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <QRCodeSVG value={value} size={160} level="M" includeMargin />
      <div className="max-w-44 text-center text-sm text-foreground">
        <span className="tag font-medium">{label}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (73 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-qr-code.tsx tests/assets-sweep-ui.test.ts`. Expected: `0 <n>` for `src/components/assets/asset-qr-code.tsx`, `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2053 tests, 2052 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/assets/asset-qr-code.tsx tests/assets-sweep-ui.test.ts
git commit -m "refactor(ui): the asset QR code has no frame of its own, and its asset tag is a tag (2D-3 task 1b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 1c: `c/assets/asset-status-correction-button.tsx` (M27 `:64`)

The trigger `Button` says whether its panel is open (`aria-expanded={open}`, `aria-controls` with the panel's `useId` while it is open). The open panel sits inside the asset page's panel, so it is a quiet grouping (`rounded-md border border-border bg-background p-4`), and its description is a neutral `Notice` (R4).

**Files:**
- Modify: `src/components/assets/asset-status-correction-button.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/asset-status-correction-ui.test.ts`

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("status correction: the trigger says whether its panel is open, and the panel is a quiet grouping with a neutral Notice (spec 2D M27, D7)", () => {
  const source = read(`${C}assets/asset-status-correction-button.tsx`)
  assert.match(source, /const panelId = useId\(\)/)
  assert.match(source, /aria-expanded=\{open\}\n\s+aria-controls=\{open \? panelId : undefined\}/, "aria-controls only while the panel exists (axe aria-valid-attr-value)")
  assert.match(source, /<div id=\{panelId\} className="rounded-md border border-border bg-background p-4">/)
  assert.match(source, /<Notice tone="neutral" className="mt-1">\{labels\.description\}<\/Notice>/)
  assert.doesNotMatch(source, /border-warning-border|<p className="mt-1 text-sm text-muted-foreground">/)
})
```

In `tests/asset-status-correction-ui.test.ts` (CRLF):

Replace

```ts
// shows busy instead of turning disabled, so focus stays on it while the correction saves. Its label stays (K13).
test("the status correction uses Button, a shared reason field and a busy submit that keeps its label (2C batch 4)", () => {
  const source = read("src/components/assets/asset-status-correction-button.tsx")
  assert.match(source, /<Button variant="outline" onClick=\{\(\) => setOpen\(\(value\) => !value\)\}>\n\s+<RotateCcw className="text-warning" aria-hidden="true" \/>/)
  assert.match(source, /<Field label=\{labels\.reason\} className="mt-3">\n\s+<Textarea\n\s+id="asset-status-correction-reason"/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+onClick=\{\(\) => \{\n\s+setOpen\(false\)\n\s+setError\(null\)/)
  assert.match(source, /<Button busy=\{isSubmitting\} disabled=\{reason\.trim\(\)\.length < 5\} onClick=\{submitCorrection\}>\n\s+\{labels\.submit\}\n\s+<\/Button>/)
```

with

```ts
// shows busy instead of turning disabled, so focus stays on it while the correction saves. Its label stays (K13).
test("the status correction uses Button, a shared reason field and a busy submit that keeps its label (2C batch 4)", () => {
  const source = read("src/components/assets/asset-status-correction-button.tsx")
  // Plan 2D-3 (M27) added aria-expanded and aria-controls to the trigger.
  assert.match(source, /<Button\n\s+variant="outline"\n\s+aria-expanded=\{open\}\n\s+aria-controls=\{open \? panelId : undefined\}\n\s+onClick=\{\(\) => setOpen\(\(value\) => !value\)\}\n\s+>\n\s+<RotateCcw className="text-warning" aria-hidden="true" \/>/)
  assert.match(source, /<Field label=\{labels\.reason\} className="mt-3">\n\s+<Textarea\n\s+id="asset-status-correction-reason"/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+onClick=\{\(\) => \{\n\s+setOpen\(false\)\n\s+setError\(null\)/)
  assert.match(source, /<Button busy=\{isSubmitting\} disabled=\{reason\.trim\(\)\.length < 5\} onClick=\{submitCorrection\}>\n\s+\{labels\.submit\}\n\s+<\/Button>/)
```

Run: `node --test tests/asset-status-correction-ui.test.ts tests/assets-sweep-ui.test.ts`
Expected: 2 failures:
- "the status correction uses Button, a shared reason field and a busy submit that keeps its label (2C batch 4)"
- "status correction: the trigger says whether its panel is open, and the panel is a quiet grouping with a neutral Notice (spec 2D M27, D7)"

- [ ] **Step 2: The correction button.** In `src/components/assets/asset-status-correction-button.tsx` (CRLF):

(1) Replace

```tsx

import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type AssetStatusCorrectionButtonProps = {
```

with

```tsx

import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"

type AssetStatusCorrectionButtonProps = {
```

(2) Replace

```tsx

export function AssetStatusCorrectionButton({ assetId, readyStatusId, labels }: AssetStatusCorrectionButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
```

with

```tsx

export function AssetStatusCorrectionButton({ assetId, readyStatusId, labels }: AssetStatusCorrectionButtonProps) {
  const router = useRouter()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
```

(3) Replace

```tsx

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={() => setOpen((value) => !value)}>
        <RotateCcw className="text-warning" aria-hidden="true" />
        {labels.button}
      </Button>
      {open ? (
        <div className="rounded-md border border-warning-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
          <Field label={labels.reason} className="mt-3">
            <Textarea
              id="asset-status-correction-reason"
```

with

```tsx

  return (
    <div className="space-y-2">
      {/* Spec 2D M27: the trigger says whether the panel is open; aria-controls only points at a panel that exists. */}
      <Button
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <RotateCcw className="text-warning" aria-hidden="true" />
        {labels.button}
      </Button>
      {open ? (
        // A quiet grouping inside the lifecycle panel: controls never sit in a warning box (spec 2D D7).
        <div id={panelId} className="rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
          <Notice tone="neutral" className="mt-1">{labels.description}</Notice>
          <Field label={labels.reason} className="mt-3">
            <Textarea
              id="asset-status-correction-reason"
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/asset-operation-status-policy.test.ts tests/asset-status-correction-ui.test.ts tests/assets-sweep-ui.test.ts tests/dead-code-cleanup.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (92 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-status-correction-button.tsx tests/asset-status-correction-ui.test.ts tests/assets-sweep-ui.test.ts`. Expected: equal numbers for `src/components/assets/asset-status-correction-button.tsx`, `tests/asset-status-correction-ui.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2054 tests, 2053 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/assets/asset-status-correction-button.tsx tests/asset-status-correction-ui.test.ts tests/assets-sweep-ui.test.ts
git commit -m "fix(a11y): the status correction trigger says whether its panel is open, and the panel is a quiet grouping with a neutral Notice (2D-3 task 1c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 1d: `c/asset-operations/transaction-cancel-dialog.tsx` (R2)

This file is 2D-4's. The asset page (Task 5a) passes a missing state snapshot as `null` (M32 b), so this plan widens only `currentState` and `restoreState` to `string | null` and shows `orNil(value)` in the facts list (`:143`, M27). Nothing else in the dialog changes.

**Files:**
- Modify: `src/components/asset-operations/transaction-cancel-dialog.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)

**Interfaces:**
- Produces: `TransactionCancelDialogProps` with `currentState: string | null` and `restoreState: string | null` (Task 5a passes `null`).

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("transaction cancel dialog: a missing state snapshot is null and shows Nil (spec 2D M32 b; the type the asset page needs, plan 2D-3 R2)", () => {
  const source = read(`${C}asset-operations/transaction-cancel-dialog.tsx`)
  assert.match(source, /export type TransactionCancelDialogProps = \{[\s\S]*?currentState: string \| null\n\s+restoreState: string \| null\n/)
  assert.match(source, /<dd className="break-words text-right font-medium text-foreground">\{orNil\(value\)\}<\/dd>/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "transaction cancel dialog: a missing state snapshot is null and shows Nil (spec 2D M32 b; the type the asset page needs, plan 2D-3 R2)"

- [ ] **Step 2: The dialog props.** In `src/components/asset-operations/transaction-cancel-dialog.tsx` (CRLF):

(1) Replace

```tsx
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type TransactionType = "checkout" | "checkin" | "transfer"
```

with

```tsx
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { orNil } from "@/components/ui/nil"
import { Textarea } from "@/components/ui/textarea"

type TransactionType = "checkout" | "checkin" | "transfer"
```

(2) Replace

```tsx
  transactionId: string
  expectedUpdatedAt: string
  originalOperator: string
  currentState: string
  restoreState: string
  componentCount: number
  labels: TransactionCancellationLabels
}
```

with

```tsx
  transactionId: string
  expectedUpdatedAt: string
  originalOperator: string
  // null when the transaction has no snapshot: the facts list shows Nil (spec 2D M32 b, plan 2D-3 R2).
  currentState: string | null
  restoreState: string | null
  componentCount: number
  labels: TransactionCancellationLabels
}
```

(3) Replace

```tsx
            <>
              <dl className="divide-y divide-border rounded-md border border-border bg-background px-3">
                {[[labels.operator, originalOperator], [labels.currentState, currentState], [labels.restoreState, restoreState], [labels.components, String(componentCount)]].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 py-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-medium text-foreground">{value}</dd></div>
                ))}
              </dl>
              {blockers.length > 0 ? (
```

with

```tsx
            <>
              <dl className="divide-y divide-border rounded-md border border-border bg-background px-3">
                {[[labels.operator, originalOperator], [labels.currentState, currentState], [labels.restoreState, restoreState], [labels.components, String(componentCount)]].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 py-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-medium text-foreground">{orNil(value)}</dd></div>
                ))}
              </dl>
              {blockers.length > 0 ? (
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/asset-transaction-cancellation-ui.test.ts tests/assets-sweep-ui.test.ts tests/dropdown-menus-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (86 tests).
  - Run `node <temp>/eol.mjs src/components/asset-operations/transaction-cancel-dialog.tsx tests/assets-sweep-ui.test.ts`. Expected: equal numbers for `src/components/asset-operations/transaction-cancel-dialog.tsx`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2055 tests, 2054 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/asset-operations/transaction-cancel-dialog.tsx tests/assets-sweep-ui.test.ts
git commit -m "fix(ui): the transaction cancel dialog takes a missing state as null and shows Nil (2D-3 task 1d)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The asset's purchase documents (`c/assets/asset-purchase-documents.tsx`)

Spec M21, M29, M33; R1. One commit. The section heading loses its icon; the empty state is `EmptyNote`; the document number is a `tag` after a middle dot; the reference line is `orNil([...].filter(Boolean).join(" · "))` (no typed "-"); the legacy attachments sit in one quiet grouping and their cards lose their own frame (no box in a box); download is `cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")` and delete a `Button variant="danger" size="icon-sm" busy`.

**Files:**
- Modify: `src/components/assets/asset-purchase-documents.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (guards): `tests/list-frame-guards.test.ts`

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("asset purchase documents: EmptyNote, the number as a tag, Nil for an empty line, no box in a box, and the shared buttons (spec 2D M21, M29, M33)", () => {
  const source = read(`${C}assets/asset-purchase-documents.tsx`)
  assert.match(source, /<h3 className="mb-3 text-sm font-semibold text-foreground">\{t\("purchaseDocuments"\)\}<\/h3>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, / · <span className="tag">\{document\.documentNo\}<\/span>/)
  assert.match(source, /\{orNil\(\n\s+\[document\.supplierName,/)
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/)
  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="icon-sm"\n\s+onClick=\{\(\) => onDelete\(attachment\.id\)\}\n\s+busy=\{deletingId === attachment\.id\}/)
  assert.doesNotMatch(source, /<button\b|Loader2|disabled:opacity|border-dashed|"-"|text-primary|bg-surface|hover:bg-accent|\bh-8\b/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "asset purchase documents: EmptyNote, the number as a tag, Nil for an empty line, no box in a box, and the shared buttons (spec 2D M21, M29, M33)"

- [ ] **Step 2: The purchase documents.** In `src/components/assets/asset-purchase-documents.tsx` (CRLF):

(1) Replace

```tsx
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, FileText, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { formatFileSize } from "@/lib/uploads"
import { useApiError } from "@/components/ui/use-api-error"

type PurchaseDocument = {
```

with

```tsx
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

type PurchaseDocument = {
```

(2) Replace

```tsx

  return (
    <div className="mt-5 border-t border-border pt-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-primary" />
        {t("purchaseDocuments")}
      </h3>
      {!hasDocuments ? (
        <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          {tCommon("noData")}
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-md border border-border bg-background p-3">
              <div className="text-sm font-medium text-foreground">
                {document.documentType ? t(`purchaseDocumentTypes.${document.documentType}`) : t("purchaseDocuments")} · {document.documentNo}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {[document.supplierName, document.poNumber ? `${t("poNumber")}: ${document.poNumber}` : null, document.invoiceNumber ? `${t("invoiceNumber")}: ${document.invoiceNumber}` : null]
                  .filter(Boolean)
                  .join(" · ") || "-"}
              </div>
              {(document.attachments ?? []).length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(document.attachments ?? []).map((attachment) => (
                    <AttachmentCard key={attachment.id} attachment={attachment} deletingId={deletingId} onDelete={handleDelete} />
                  ))}
```

with

```tsx

  return (
    <div className="mt-5 border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t("purchaseDocuments")}</h3>
      {!hasDocuments ? (
        <EmptyNote>{tCommon("noData")}</EmptyNote>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-md border border-border bg-background p-3">
              <div className="text-sm font-medium text-foreground">
                {document.documentType ? t(`purchaseDocumentTypes.${document.documentType}`) : t("purchaseDocuments")} · <span className="tag">{document.documentNo}</span>
              </div>
              <div className="mt-1 text-meta text-muted-foreground">
                {orNil(
                  [document.supplierName, document.poNumber ? `${t("poNumber")}: ${document.poNumber}` : null, document.invoiceNumber ? `${t("invoiceNumber")}: ${document.invoiceNumber}` : null]
                    .filter(Boolean)
                    .join(" · "),
                )}
              </div>
              {(document.attachments ?? []).length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(document.attachments ?? []).map((attachment) => (
                    <AttachmentCard key={attachment.id} attachment={attachment} deletingId={deletingId} onDelete={handleDelete} />
                  ))}
```

(3) Replace

```tsx
              )}
            </div>
          ))}
          {legacyAttachments.map((attachment) => (
            <AttachmentCard key={attachment.id} attachment={attachment} deletingId={deletingId} onDelete={handleDelete} />
          ))}
        </div>
      )}
```

with

```tsx
              )}
            </div>
          ))}
          {/* A file without a document gets the document card's quiet grouping; inside a card a file has no box of its own. */}
          {legacyAttachments.map((attachment) => (
            <div key={attachment.id} className="rounded-md border border-border bg-background p-3">
              <AttachmentCard attachment={attachment} deletingId={deletingId} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}
```

(4) Replace

```tsx
  const tCommon = useTranslations("common")

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {attachment.fileType} · {formatFileSize(attachment.fileSize)}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={`/api/attachments/${attachment.id}`}
          className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-accent"
        >
          <Download className="h-3.5 w-3.5" />
          {t("download")}
        </a>
        <button
          type="button"
          onClick={() => onDelete(attachment.id)}
          disabled={deletingId === attachment.id}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
          aria-label={tCommon("delete")}
          title={tCommon("delete")}
        >
          {deletingId === attachment.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
```

with

```tsx
  const tCommon = useTranslations("common")

  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
      <div className="mt-1 text-meta text-muted-foreground">
        {attachment.fileType} · {formatFileSize(attachment.fileSize)}
      </div>
      {/* The same pair as the asset photos (asset-attachments.tsx): an outline sm download link and a danger icon-sm delete. */}
      <div className="mt-3 flex gap-2">
        <a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
          <Download aria-hidden="true" />
          {t("download")}
        </a>
        <Button
          variant="danger"
          size="icon-sm"
          onClick={() => onDelete(attachment.id)}
          busy={deletingId === attachment.id}
          aria-label={tCommon("delete")}
          title={tCommon("delete")}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
```

- [ ] **Step 3: The guard rows (R16).** LFG: the file's LV2 row (1) goes from `BUDGETS` and `KEEP`.

In `tests/list-frame-guards.test.ts` (CRLF):

(1) Replace

```ts
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // → 2 (KEEP): 2D
    [`${C}assets/asset-purchase-documents.tsx`]: 1, // → 1 (KEEP): 2D
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
```

with

```ts
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // → 2 (KEEP): 2D
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
```

(2) Replace

```ts
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // 2D
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // 2D
    [`${C}assets/asset-purchase-documents.tsx`]: 1, // 2D
  },
  LV3: {
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // print page, 2D (A/08:305)
```

with

```ts
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // 2D
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // 2D
  },
  LV3: {
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // print page, 2D (A/08:305)
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/assets-sweep-ui.test.ts tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (83 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-purchase-documents.tsx tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts`. Expected: equal numbers for `src/components/assets/asset-purchase-documents.tsx`, `tests/list-frame-guards.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2056 tests, 2055 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-purchase-documents.tsx tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): asset purchase documents on EmptyNote, Nil, tag and the shared buttons, with no box in a box (2D-3 task 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The asset photos (`c/assets/asset-attachments.tsx`)

Spec D9, M21, M22, M29; R3, R5. One commit. The photo section is a `ContentPanel` with the photo count as plain text in its actions; the checklist is a block with an `h3` and a `num` count; checklist cards are quiet groupings (`bg-background`) with a `StatusBadge` (done `success`, pending `muted`); downloads are outline `sm` links; the gallery toggle is a `Button variant="outline"` with `aria-expanded`; the empty state is `EmptyNote`. The three image buttons stay raw (R5) with `focus-visible` rings and lose `hover:bg-accent`.

**Files:**
- Modify: `src/components/assets/asset-attachments.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("asset photos: a ContentPanel with a plain count, StatusBadge states, the shared buttons and EmptyNote, and no box in a box (spec 2D D9, M21, M22, M29)", () => {
  const source = read(`${C}assets/asset-attachments.tsx`)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("assetPhotos"\)\}\n\s+description=\{t\("photoGalleryPreviewHelp"\)\}\n\s+actions=\{/)
  assert.match(source, /<span className="text-meta text-muted-foreground">\{t\("photoFileCount", \{ count: attachments\.length \}\)\}<\/span>/)
  assert.match(source, /<h3 className="text-sm font-semibold text-foreground">\{t\("photoChecklist"\)\}<\/h3>/)
  assert.match(source, /<StatusBadge label=\{t\("photoChecklistDone"\)\} tone="success" \/>/)
  assert.match(source, /<StatusBadge label=\{t\("photoChecklistPending"\)\} tone="muted" \/>/)
  assert.equal(source.match(/className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/g)?.length, 2)
  assert.match(source, /<Button variant="outline" aria-expanded=\{expanded\} className="mt-3 w-full sm:w-auto" onClick=\{onClick\}>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  // The three photos that open the preview stay raw buttons: an image is the control (plan 2D-3 R5, for 2D-5's EXEMPT list).
  assert.equal(source.match(/<button\b/g)?.length, 3)
  assert.equal(source.match(/focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/g)?.length, 3)
  assert.doesNotMatch(source, /rounded-full|border-dashed|hover:bg-accent|focus:outline-none|focus:ring|text-primary|text-success|CheckCircle2|\bh-8\b|\bh-9\b|text-xs|rounded-lg|bg-surface/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "asset photos: a ContentPanel with a plain count, StatusBadge states, the shared buttons and EmptyNote, and no box in a box (spec 2D D9, M21, M22, M29)"

- [ ] **Step 2: The photos.** In `src/components/assets/asset-attachments.tsx` (CRLF):

(1) Replace

```tsx
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CheckCircle2, Download, FileText, ImageIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { getAssetPhotoGalleryState } from "@/lib/asset-photo-gallery"
import { formatFileSize } from "@/lib/uploads"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { useApiError } from "@/components/ui/use-api-error"
```

with

```tsx
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetPhotoGalleryState } from "@/lib/asset-photo-gallery"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) Replace

```tsx
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ImageIcon className="h-5 w-5 text-primary" />
            {t("assetPhotos")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("photoGalleryPreviewHelp")}</p>
        </div>
        {attachments.length > 0 ? (
          <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {t("photoFileCount", { count: attachments.length })}
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {primaryModelPhoto && (
          <PhotoPreview title={t("modelPhoto")} attachment={primaryModelPhoto} onPreview={setPreviewPhoto} />
        )}
      </div>

      {photoChecklist.length > 0 && (
        <div className="mb-4 rounded-md border border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">{t("photoChecklist")}</div>
            <div className="text-xs text-muted-foreground">
              {checklistItems.filter((item) => item.attachment).length}/{checklistItems.length}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {checklistGallery.visibleItems.map((item) => {
              const attachment = item.attachment

              return (
              <div key={item.label} className="overflow-hidden rounded-md border border-border bg-surface">
                {attachment ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto({ title: item.label, attachment })}
                      className="relative block aspect-video w-full bg-background text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <Image
                        src={`/api/attachments/${attachment.id}?inline=1`}
```

with

```tsx
  }

  return (
    // The page wraps this panel in <div id="photos">, so it can be a ContentPanel (spec 2D D9). A count is plain text.
    <ContentPanel
      title={t("assetPhotos")}
      description={t("photoGalleryPreviewHelp")}
      actions={
        attachments.length > 0 ? (
          <span className="text-meta text-muted-foreground">{t("photoFileCount", { count: attachments.length })}</span>
        ) : undefined
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {primaryModelPhoto && (
          <PhotoPreview title={t("modelPhoto")} attachment={primaryModelPhoto} onPreview={setPreviewPhoto} />
        )}
      </div>

      {/* The checklist is a block of the panel, not a box: its cards are the quiet groupings (no box in a box). */}
      {photoChecklist.length > 0 && (
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t("photoChecklist")}</h3>
            <span className="text-meta num text-muted-foreground">
              {checklistItems.filter((item) => item.attachment).length}/{checklistItems.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {checklistGallery.visibleItems.map((item) => {
              const attachment = item.attachment

              return (
              <div key={item.label} className="overflow-hidden rounded-md border border-border bg-background">
                {attachment ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto({ title: item.label, attachment })}
                      className="relative block aspect-video w-full bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Image
                        src={`/api/attachments/${attachment.id}?inline=1`}
```

(3) Replace

```tsx
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">{attachment.originalName}</div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          {t("photoChecklistDone")}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <a
                          href={`/api/attachments/${attachment.id}`}
                          className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-accent"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t("download")}
                        </a>
                        <Button
```

with

```tsx
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <div className="mt-1 truncate text-meta text-muted-foreground">{attachment.originalName}</div>
                        </div>
                        <StatusBadge label={t("photoChecklistDone")} tone="success" />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
                          <Download aria-hidden="true" />
                          {t("download")}
                        </a>
                        <Button
```

(4) Replace

```tsx
                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <span className="text-xs text-muted-foreground">{t("photoChecklistPending")}</span>
                    </div>
                    <Field label={item.label} hideLabel>
                      <FileDropzone
```

with

```tsx
                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <StatusBadge label={t("photoChecklistPending")} tone="muted" />
                    </div>
                    <Field label={item.label} hideLabel>
                      <FileDropzone
```

(5) Replace

```tsx
        </div>
      )}

      <div className="mb-4 rounded-md border border-border bg-background p-3">
        {photoChecklist.length > 0 && (
          <Field label={t("photoType")} className="mb-3">
            <NativeSelect value={photoLabel} onChange={(event) => setPhotoLabel(event.target.value)}>
```

with

```tsx
        </div>
      )}

      {/* The drop zone draws its own dashed frame, so no box goes around it. */}
      <div className="mb-4">
        {photoChecklist.length > 0 && (
          <Field label={t("photoType")} className="mb-3">
            <NativeSelect value={photoLabel} onChange={(event) => setPhotoLabel(event.target.value)}>
```

(6) Replace

```tsx
        />
      </div>

      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-primary" />
        {t("otherAttachments")}
      </h3>

      {otherAttachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {tCommon("noData")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
```

with

```tsx
        />
      </div>

      <h3 className="mb-3 text-sm font-semibold text-foreground">{t("otherAttachments")}</h3>

      {otherAttachments.length === 0 ? (
        <EmptyNote>{tCommon("noData")}</EmptyNote>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
```

(7) Replace

```tsx
        downloadHref={previewPhoto ? `/api/attachments/${previewPhoto.attachment.id}` : undefined}
        downloadLabel={t("download")}
      />
    </section>
  )
}

```

with

```tsx
        downloadHref={previewPhoto ? `/api/attachments/${previewPhoto.attachment.id}` : undefined}
        downloadLabel={t("download")}
      />
    </ContentPanel>
  )
}

```

(8) Replace

```tsx
      <button
        type="button"
        onClick={() => onPreview({ title, attachment })}
        className="relative block h-32 w-full bg-background text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Image
          src={`/api/attachments/${attachment.id}?inline=1`}
```

with

```tsx
      <button
        type="button"
        onClick={() => onPreview({ title, attachment })}
        className="relative block h-32 w-full bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Image
          src={`/api/attachments/${attachment.id}?inline=1`}
```

(9) Replace

```tsx
      </button>
      <div className="p-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{attachment.originalName}</div>
      </div>
    </div>
  )
```

with

```tsx
      </button>
      <div className="p-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-meta text-muted-foreground">{attachment.originalName}</div>
      </div>
    </div>
  )
```

(10) Replace

```tsx
        <button
          type="button"
          onClick={onPreview}
          className="relative block h-28 w-full bg-background text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Image
            src={`/api/attachments/${attachment.id}?inline=1`}
```

with

```tsx
        <button
          type="button"
          onClick={onPreview}
          className="relative block h-28 w-full bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src={`/api/attachments/${attachment.id}?inline=1`}
```

(11) Replace

```tsx
          />
        </button>
      ) : (
        <div className="flex h-28 items-center justify-center bg-background p-3 text-center text-xs font-medium text-muted-foreground">
          {attachment.fileType}
        </div>
      )}
      <div className="p-3">
        <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
        <div className="mt-1 text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</div>
        <div className="mt-3 flex gap-2">
          <a
            href={`/api/attachments/${attachment.id}`}
            className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" />
            {downloadLabel}
          </a>
          <Button variant="danger" size="icon-sm" onClick={onDelete} busy={deleting} aria-label={deleteLabel} title={deleteLabel}>
```

with

```tsx
          />
        </button>
      ) : (
        <div className="flex h-28 items-center justify-center bg-background p-3 text-center text-meta font-medium text-muted-foreground">
          {attachment.fileType}
        </div>
      )}
      <div className="p-3">
        <div className="truncate text-sm font-medium text-foreground">{attachment.originalName}</div>
        <div className="mt-1 text-meta text-muted-foreground">{formatFileSize(attachment.fileSize)}</div>
        <div className="mt-3 flex gap-2">
          <a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
            <Download aria-hidden="true" />
            {downloadLabel}
          </a>
          <Button variant="danger" size="icon-sm" onClick={onDelete} busy={deleting} aria-label={deleteLabel} title={deleteLabel}>
```

(12) Replace

```tsx
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:w-auto"
    >
      {expanded ? hideLabel : showMoreLabel(hiddenCount)}
    </button>
  )
}

```

with

```tsx
  onClick: () => void
}) {
  return (
    <Button variant="outline" aria-expanded={expanded} className="mt-3 w-full sm:w-auto" onClick={onClick}>
      {expanded ? hideLabel : showMoreLabel(hiddenCount)}
    </Button>
  )
}

```

- [ ] **Step 3: Check.**
  - Run `node --test tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/confirm-dialog-ui.test.ts tests/file-evidence-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (112 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-attachments.tsx tests/assets-sweep-ui.test.ts`. Expected: equal numbers for `src/components/assets/asset-attachments.tsx`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2057 tests, 2056 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/assets/asset-attachments.tsx tests/assets-sweep-ui.test.ts
git commit -m "refactor(ui): asset photos on ContentPanel, StatusBadge, EmptyNote and the shared buttons, with no box in a box (2D-3 task 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The components summary and the parent banner

Spec D7, D9, M21, M33; R3, R4. One commit for the two small files the asset page and the component page show. The summary is a `ContentPanel` (its manage link `buttonVariants({ size: "md" })`), the missing-serial count a warning `StatusBadge` with `formatCount`, the empty state `EmptyNote`, codes `tag font-medium` and links `linkVariants({ size: "inherit" })`. The banner is a `<section aria-label>` that holds an info `Notice` with text links; the screen-reader prefix of the parent link ends with ": ".

**Files:**
- Modify: `src/components/assets/asset-components-summary.tsx`, `src/components/assets/asset-component-context-banner.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("components summary and context banner: a ContentPanel and an info Notice, codes as tag, text links, a warning StatusBadge and EmptyNote (spec 2D D7, D9, M33)", () => {
  const summary = read(`${C}assets/asset-components-summary.tsx`)
  assert.match(summary, /<ContentPanel\n\s+title=\{labels\.title\}\n\s+description=\{labels\.help\}\n\s+actions=\{/)
  assert.match(summary, /<Link href=\{manageHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(summary, /<StatusBadge tone="warning" label=\{`\$\{labels\.missingSerial\}: \$\{formatCount\(missingSerialCount\)\}`\} \/>/)
  assert.match(summary, /<EmptyNote>\{labels\.noCurrent\}<\/EmptyNote>/)
  assert.match(summary, /<span className="tag font-medium">\{component\.componentAsset\.assetTag\}<\/span>/)
  assert.match(summary, /<span className="tag font-medium">\{link\.parentAsset\.assetTag\}<\/span>/)
  assert.doesNotMatch(summary, /font-mono|uppercase|rounded-full|border-dashed|bg-primary|text-white|primary-soft|hover:bg-accent|sm:h-10|text-xs|text-primary/)
  const banner = read(`${C}assets/asset-component-context-banner.tsx`)
  assert.match(banner, /<section aria-label=\{labels\.title\}>\n\s+<Notice tone="info" title=\{labels\.title\}>/)
  assert.match(banner, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center gap-1\.5 md:min-h-0"\)\}/)
  assert.match(banner, /<span className="tag font-medium">\{link\.parentAsset\.assetTag\}<\/span>/)
  assert.doesNotMatch(banner, /font-mono|primary-soft|primary-border|bg-primary|text-white|translate-x|text-xs/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "components summary and context banner: a ContentPanel and an info Notice, codes as tag, text links, a warning StatusBadge and EmptyNote (spec 2D D7, D9, M33)"

- [ ] **Step 2: The summary.** In `src/components/assets/asset-components-summary.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { Boxes, PackagePlus, Puzzle } from "lucide-react"

type AssetReference = {
  id: string
```

with

```tsx
import Link from "next/link"
import { PackagePlus } from "lucide-react"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type AssetReference = {
  id: string
```

(2) Replace

```tsx
  const missingSerialCount = currentComponents.filter((component) => !component.componentAsset.serialNumber).length
  const visibleComponents = currentComponents.slice(0, 5)

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Boxes className="h-5 w-5 text-primary" />
            {labels.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.help}</p>
        </div>
        {canManage ? (
          <Link
            href={manageHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:h-10 sm:min-h-0"
          >
            <PackagePlus className="h-4 w-4" />
            {labels.manage}
          </Link>
        ) : null}
      </div>

      {installedInLinks.length > 0 ? (
        <div className="mt-4 rounded-md border border-primary-border bg-primary-soft p-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.installedIn}</div>
          <div className="mt-2 grid gap-2">
            {installedInLinks.map((link) => (
              <Link
                key={link.id}
                href={link.parentHref}
                className="text-sm font-medium text-primary hover:underline"
              >
                {link.parentAsset.assetTag} - {link.parentAsset.name}
                <span className="block pt-0.5 text-xs font-normal text-muted-foreground">
                  {labels.roleLabel}: {link.componentRole}
                  {link.slotNo ? ` · ${labels.slotLabel}: ${link.slotNo}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Puzzle className="h-4 w-4 text-primary" />
            {labels.current}
          </div>
          {missingSerialCount > 0 ? (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
              {labels.missingSerial}: {missingSerialCount}
            </span>
          ) : null}
        </div>
        {visibleComponents.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noCurrent}</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {visibleComponents.map((component) => (
              <Link
                key={component.id}
                href={`/${locale}/assets/${component.componentAsset.id}`}
                className="flex min-w-0 items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block break-words font-mono text-sm font-semibold text-foreground">{component.componentAsset.assetTag}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{component.componentAsset.name}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{labels.roleLabel}: {component.componentRole}</span>
                    {component.slotNo ? <span>{labels.slotLabel}: {component.slotNo}</span> : null}
                  </span>
                </span>
                {component.componentAsset.serialNumber ? (
                  <span className="shrink-0 text-xs text-muted-foreground">SN: {component.componentAsset.serialNumber}</span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
```

with

```tsx
  const missingSerialCount = currentComponents.filter((component) => !component.componentAsset.serialNumber).length
  const visibleComponents = currentComponents.slice(0, 5)

  // Spec 2D D9: the page-level panel is ContentPanel; the parent list and the component list are blocks of it, with no
  // tinted box. Codes are tag (M33), the manage link is the md button of a panel head.
  return (
    <ContentPanel
      title={labels.title}
      description={labels.help}
      actions={
        canManage ? (
          <Link href={manageHref} className={buttonVariants({ size: "md" })}>
            <PackagePlus aria-hidden="true" />
            {labels.manage}
          </Link>
        ) : undefined
      }
    >
      {installedInLinks.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.installedIn}</h3>
          <ul className="mt-2 grid gap-2">
            {installedInLinks.map((link) => (
              <li key={link.id} className="min-w-0">
                <Link href={link.parentHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1.5 md:min-h-0")}>
                  <span className="tag font-medium">{link.parentAsset.assetTag}</span>
                  <span className="min-w-0 break-words">{link.parentAsset.name}</span>
                </Link>
                <span className="block text-meta text-muted-foreground">
                  {labels.roleLabel}: {link.componentRole}
                  {link.slotNo ? ` · ${labels.slotLabel}: ${link.slotNo}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{labels.current}</h3>
        {missingSerialCount > 0 ? (
          <StatusBadge tone="warning" label={`${labels.missingSerial}: ${formatCount(missingSerialCount)}`} />
        ) : null}
      </div>
      {visibleComponents.length === 0 ? (
        <EmptyNote>{labels.noCurrent}</EmptyNote>
      ) : (
        <div className="divide-y divide-border-soft rounded-md border border-border">
          {visibleComponents.map((component) => (
            <Link
              key={component.id}
              href={`/${locale}/assets/${component.componentAsset.id}`}
              className="flex min-w-0 items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-row-hover"
            >
              <span className="min-w-0">
                <span className="block text-sm text-foreground">
                  <span className="tag font-medium">{component.componentAsset.assetTag}</span>
                </span>
                <span className="mt-0.5 block truncate text-meta text-muted-foreground">{component.componentAsset.name}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-meta text-muted-foreground">
                  <span>{labels.roleLabel}: {component.componentRole}</span>
                  {component.slotNo ? <span>{labels.slotLabel}: {component.slotNo}</span> : null}
                </span>
              </span>
              {component.componentAsset.serialNumber ? (
                <span className="shrink-0 text-meta text-muted-foreground">SN: {component.componentAsset.serialNumber}</span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </ContentPanel>
  )
}
```

- [ ] **Step 3: The banner.** In `src/components/assets/asset-component-context-banner.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { ArrowRight, Puzzle } from "lucide-react"

type InstalledInLink = {
  id: string
```

with

```tsx
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { linkVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import { cn } from "@/lib/utils"

type InstalledInLink = {
  id: string
```

(2) Replace

```tsx
}) {
  if (installedInLinks.length === 0) return null

  return (
    <section aria-label={labels.title} className="border-y border-primary-border bg-primary-soft px-4 py-3 sm:rounded-lg sm:border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-white">
            <Puzzle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{labels.title}</p>
            <div className="mt-1 grid gap-1">
              {installedInLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.parentHref}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-md py-1 text-sm text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="min-w-0">
                    <span className="block break-words font-mono font-semibold">{link.parentAsset.assetTag}</span>
                    <span className="block truncate text-xs text-muted-foreground">{link.parentAsset.name}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{labels.roleLabel}: {link.componentRole}</span>
                      {link.slotNo ? <span>{labels.slotLabel}: {link.slotNo}</span> : null}
                    </span>
                  </span>
                  <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs font-medium text-primary sm:inline-flex">
                    {labels.openParent}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 sm:hidden" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

with

```tsx
}) {
  if (installedInLinks.length === 0) return null

  // Spec 2D D7: where this asset is installed is information, an inline info Notice (no tinted band, no icon tile).
  // Each parent is a text link with its code as a tag; "open parent" stays in the link's name for screen readers.
  return (
    <section aria-label={labels.title}>
      <Notice tone="info" title={labels.title}>
        <ul className="grid gap-1">
          {installedInLinks.map((link) => (
            <li key={link.id} className="min-w-0">
              <Link href={link.parentHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1.5 md:min-h-0")}>
                <span className="sr-only">{`${labels.openParent}: `}</span>
                <span className="tag font-medium">{link.parentAsset.assetTag}</span>
                <span className="min-w-0 break-words">{link.parentAsset.name}</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
              <span className="block text-meta text-muted-foreground">
                {labels.roleLabel}: {link.componentRole}
                {link.slotNo ? ` · ${labels.slotLabel}: ${link.slotNo}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Notice>
    </section>
  )
}
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-detail-ux.test.ts tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (93 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-component-context-banner.tsx src/components/assets/asset-components-summary.tsx tests/assets-sweep-ui.test.ts`. Expected: equal numbers for `src/components/assets/asset-component-context-banner.tsx`, `src/components/assets/asset-components-summary.tsx`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2058 tests, 2057 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-component-context-banner.tsx src/components/assets/asset-components-summary.tsx tests/assets-sweep-ui.test.ts
git commit -m "refactor(ui): the components summary is a ContentPanel and the parent banner an info Notice, with codes as tag and text links (2D-3 task 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The asset page

Spec §3.3, D7, D9, D19, M12, M21, M22, M29, M32 b, M33; R1, R3, R4, R8, R9, R12, R13. Two commits: the page with the two parts that take its new label (5a), then the helpers nothing calls any more (5b).

#### 5a: `D/assets/[id]/page.tsx`, `c/assets/asset-movement-timeline.tsx`, `c/assets/asset-evidence-drawer.tsx`

One commit, because the page passes a new `filterLabel` (`tCommon("filter")`) to both parts.
- **Timeline:** the filters are `ChoiceChip` radios (`name` from `useId`) in a `fieldset` with an sr-only legend; `EmptyNote`; each movement a `StatusBadge` and a marker shape (R3); its facts and details two `KeyValueList`s, detail links `linkVariants({ size: "inherit" })`; the shared `formatDateTime` from `@/lib/utils`. `MovementInfo`, `Info` and the local date formatter go (R12).
- **Evidence drawer:** a `StatStrip` for the three counts (`EvidenceStat` goes), `ChoiceChip` filters in a fieldset, the group as a `Chip`, `focus-visible` cards.
- **Page:** the nine sections with an `id` keep it on `cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")` (R1); quick actions, follow-up, relationship map, QR and the sidebar photo are `ContentPanel`s; `SectionHeading` is 16px without an icon. `Notice` by meaning (R4); data health and warranty are `StatusBadge`s with their tone (the warranty is the first item of the purchase `KeyValueList`); `Chip`s for the latest transaction, PM and the relationship roles; four outline `sm` links; text links; the disabled quick action is a disabled `Button` (M12, R9); `getCheckoutDestination` and `formatCancellationSnapshot` return `null` (M32 b, R8); the license seat counts go through `formatCount`; the 16 raw amber and emerald colors, the eyebrows and the tone-helper calls go. The relationship card's tag must wrap in a narrow lane, so it keeps `font-mono` at 500 with `[overflow-wrap:anywhere]` (R1).

**Files:**
- Modify: `src/components/assets/asset-movement-timeline.tsx`, `src/components/assets/asset-evidence-drawer.tsx`, `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/asset-detail-ux.test.ts`, `tests/asset-relationship-map-ui.test.ts`
- Modify (guards): `tests/list-frame-guards.test.ts`

**Interfaces:**
- Consumes: Task 1d's `string | null` props of `TransactionCancelDialog`.
- Produces: `filterLabel: string` in the labels of `AssetMovementTimeline` and in `AssetEvidenceDrawerLabels`.

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("movement timeline: ChoiceChip filters, EmptyNote, StatusBadge and shape markers, KeyValueLists with text links, and the shared date format (spec 2D M21, M22, D19)", () => {
  const source = read(`${C}assets/asset-movement-timeline.tsx`)
  assert.match(source, /<fieldset className="min-w-0">\n\s+<legend className="sr-only">\{labels\.filterLabel\}<\/legend>/)
  assert.match(source, /<ChoiceChip\n\s+key=\{filter\}\n\s+type="radio"\n\s+name=\{filterName\}/)
  assert.match(source, /<EmptyNote>\{labels\.noData\}<\/EmptyNote>/)
  assert.match(source, /<StatusBadge label=\{movement\.title\} tone=\{movement\.tone\} \/>/)
  assert.match(source, /statusMarkerVariants\(\{ tone: movement\.tone \}\)/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2)
  assert.match(source, /<a href=\{detail\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /import \{ cn, formatDateTime \} from "@\/lib\/utils"/)
  assert.doesNotMatch(source, /<button\b|function (?:Info|MovementInfo|formatDateTime|getMovementDotClass|getMovementBadgeClass)\b|"-"|uppercase|border-dashed|rounded-full|text-white|bg-surface\/\d|hover:underline|\btext-xs\b/)
})

test("evidence drawer: a StatStrip for the counts, ChoiceChip filters, the group as a Chip and focus-visible cards (spec 2D M22, M27, D19)", () => {
  const source = read(`${C}assets/asset-evidence-drawer.tsx`)
  assert.match(source, /<StatStrip\n\s+items=\{\[/)
  assert.match(source, /<fieldset className="mt-4 min-w-0">\n\s+<legend className="sr-only">\{labels\.filterLabel\}<\/legend>/)
  assert.equal(source.match(/<ChoiceChip\b/g)?.length, 2)
  assert.match(source, /<Chip>\{item\.group\}<\/Chip>/)
  assert.match(source, /focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/)
  assert.doesNotMatch(source, /<button\b|function (?:EvidenceStat|FilterButton)\b|text-white|rounded-full|scale-\[|focus:outline-none|text-xl font-bold|\btext-xs\b/)
})

const D = "src/app/[locale]/(dashboard)/"

test("asset page: panels, notices, chips, text links, the disabled QuickAction (M12) and no typed dash (M32 b) on the shared parts (spec 2D §3.3, D7, D9, M33)", () => {
  const source = read(`${D}assets/[id]/page.tsx`)
  // The nine sections with an id keep it, so they take the panel classes (2D-2 R4); the other panels are ContentPanel.
  assert.equal(source.match(/className=\{cn\(getPanelClasses\(\), "scroll-mt-24 p-4 sm:p-5"\)\}/g)?.length, 9)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 5, "quick actions, follow-up, relationship map, QR, sidebar photo")
  assert.match(source, /<Notice tone="info" title=\{lifecycle\.title\} className="mb-3">\n\s+\{lifecycle\.description\}\n\s+<\/Notice>/)
  assert.match(source, /<Notice tone="warning" className="mb-4">\n\s+\{t\("maintenanceReplacementWarning"\)\}\n\s+<\/Notice>/)
  assert.match(source, /<Notice tone="neutral" className="mt-4">\{noteLabel\}<\/Notice>/)
  assert.match(source, /<StatusBadge label=\{t\("dataHealthProgress", \{ done: dataHealthDone, total: dataHealthItems\.length \}\)\} tone=\{dataHealthTone\} \/>/)
  assert.match(source, /\{ key: "warrantyStatus", label: t\("warrantyStatus"\), value: <StatusBadge label=\{getWarrantyStatusLabel\(warrantyState, t\)\} tone=\{warrantyState\.tone\} \/> \}/)
  assert.match(source, /<Chip>\{t\("latestTransaction"\)\}<\/Chip>/)
  assert.match(source, /<Chip>\{t\("maintenancePmBadge"\)\}<\/Chip>/)
  assert.match(source, /<Chip>\{roleLabel\}<\/Chip>/)
  assert.equal(source.match(/className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/g)?.length, 4)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/maintenance\/\$\{ticket\.id\}`\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /<Button variant="outline" disabled className=\{quickActionClasses\}>/)
  assert.match(source, /return labels\.parentAssets\.get\(checkout\.parentAssetId\) \?\? checkout\.parentAssetId\n\s+return null\n\}/)
  assert.match(source, /if \(!snapshot\) return null\n/)
  assert.equal(source.match(/filterLabel: tCommon\("filter"\),/g)?.length, 2)
  assert.match(source, /<div className="font-mono text-sm font-medium leading-5 text-foreground \[overflow-wrap:anywhere\]">\{relationshipAsset\.assetTag\}<\/div>/, "a tag that must wrap keeps font-mono at 500 (2D-2 R3)")
  assert.doesNotMatch(source, /toLocaleString/)
  assert.doesNotMatch(source, /\b(?:bg|text|border)-(?:amber|emerald)-\d|border-dashed|uppercase|rounded-full (?:bg|px)-|bg-surface\/\d|primary-soft|info-soft|warning-soft|hover:underline|hover:bg-accent|font-semibold leading-5|focus:outline-none|scale-\[|getHealthBadgeClass|getWarrantyPanelClass|getWarrantyIconClass|getActivityToneClass|getRelationship(?:Summary|Badge|Icon)Class|return "-"|\bh-8\b|md:h-10|text-lg|text-info|\btext-xs\b/)
})
```

In `tests/asset-detail-ux.test.ts` (CRLF):

Replace

```ts
test("asset detail header links share the Button look of the More menu trigger", () => {
  const source = assetDetailSource()

  assert.match(source, /import \{ buttonVariants \} from "@\/components\/ui\/button-variants"/)
  assert.match(source, /<PageBackLink href=\{returnToHref\}/)
  assert.match(source, /cn\(buttonVariants\(\{ size: "md" \}\), "hidden md:inline-flex"\)/)
  assert.doesNotMatch(source, /rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground/)
```

with

```ts
test("asset detail header links share the Button look of the More menu trigger", () => {
  const source = assetDetailSource()

  assert.match(source, /import \{ buttonVariants, linkVariants \} from "@\/components\/ui\/button-variants"/)
  assert.match(source, /<PageBackLink href=\{returnToHref\}/)
  assert.match(source, /cn\(buttonVariants\(\{ size: "md" \}\), "hidden md:inline-flex"\)/)
  assert.doesNotMatch(source, /rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground/)
```

In `tests/asset-relationship-map-ui.test.ts` (CRLF):

Replace

```ts

  assert.match(cardSource, /font-mono[\s\S]+\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /\[overflow-wrap:anywhere\][\s\S]+\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /flex flex-wrap items-center gap-2[\s\S]+getRelationshipBadgeClass/)
  assert.doesNotMatch(cardSource, /truncate text-sm font-semibold text-foreground">\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /focus-visible:ring-2/)
})
```

with

```ts

  assert.match(cardSource, /font-mono[\s\S]+\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /\[overflow-wrap:anywhere\][\s\S]+\{relationshipAsset\.assetTag\}/)
  // Plan 2D-3: the role is the shared Chip (a name, 2D-2 R2), not a palette-colored badge.
  assert.match(cardSource, /flex flex-wrap items-center gap-2[\s\S]+<Chip>\{roleLabel\}<\/Chip>/)
  assert.doesNotMatch(cardSource, /truncate text-sm font-semibold text-foreground">\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /focus-visible:ring-2/)
})
```

Run: `node --test tests/asset-detail-ux.test.ts tests/asset-relationship-map-ui.test.ts tests/assets-sweep-ui.test.ts`
Expected: 5 failures:
- "asset detail header links share the Button look of the More menu trigger"
- "relationship asset cards keep asset tags readable before badges and names"
- "movement timeline: ChoiceChip filters, EmptyNote, StatusBadge and shape markers, KeyValueLists with text links, and the shared date format (spec 2D M21, M22, D19)"
- "evidence drawer: a StatStrip for the counts, ChoiceChip filters, the group as a Chip and focus-visible cards (spec 2D M22, M27, D19)"
- "asset page: panels, notices, chips, text links, the disabled QuickAction (M12) and no typed dash (M32 b) on the shared parts (spec 2D §3.3, D7, D9, M33)"

- [ ] **Step 2: The movement timeline.** In `src/components/assets/asset-movement-timeline.tsx` (CRLF):

(1) Replace

```tsx
"use client"

import { useMemo, useState } from "react"

type MovementTone = "neutral" | "success" | "info" | "warning" | "danger"

```

with

```tsx
"use client"

import { useId, useMemo, useState } from "react"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceChip } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn, formatDateTime } from "@/lib/utils"

type MovementTone = "neutral" | "success" | "info" | "warning" | "danger"

```

(2) Replace

```tsx
  items: AssetMovementTimelineItem[]
  labels: {
    all: string
    fromValue: string
    toValue: string
    noData: string
    filters: Record<string, string>
  }
}) {
  const [activeFilter, setActiveFilter] = useState("all")
  const availableFilters = useMemo(() => {
    const categories = Array.from(new Set(items.map((item) => item.category)))
```

with

```tsx
  items: AssetMovementTimelineItem[]
  labels: {
    all: string
    filterLabel: string
    fromValue: string
    toValue: string
    noData: string
    filters: Record<string, string>
  }
}) {
  const filterName = useId()
  const [activeFilter, setActiveFilter] = useState("all")
  const availableFilters = useMemo(() => {
    const categories = Array.from(new Set(items.map((item) => item.category)))
```

(3) Replace

```tsx

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {availableFilters.map((filter) => {
          const active = filter === activeFilter
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={
                active
                  ? "inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-white"
                  : "inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-input hover:text-primary"
              }
            >
              {filter === "all" ? labels.all : labels.filters[filter] ?? filter}
            </button>
          )
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {labels.noData}
        </div>
      ) : (
        <ol className="space-y-4">
          {filteredItems.map((movement) => (
            <li key={movement.id} className="relative border-l border-border pl-4">
              <span className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ${getMovementDotClass(movement.tone)}`} />
              <div className="rounded-md bg-background p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getMovementBadgeClass(movement.tone)}`}>
                        {movement.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(movement.performedAt)}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">{movement.summary}</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <Info label={labels.fromValue} value={movement.from} compact />
                  <Info label={labels.toValue} value={movement.to} compact />
                </div>
                {movement.details.length ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border bg-surface/70 p-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                    {movement.details.map((detail) => (
                      <MovementInfo key={`${movement.id}-${detail.label}`} detail={detail} />
                    ))}
                  </div>
                ) : null}
                {movement.reason && <p className="mt-2 text-sm text-muted-foreground">{movement.reason}</p>}
              </div>
```

with

```tsx

  return (
    <div className="space-y-4">
      {/* Spec 2D D19: one filter is on at a time, so the filters are radio ChoiceChips in a named group; they wrap at 375. */}
      <fieldset className="min-w-0">
        <legend className="sr-only">{labels.filterLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {availableFilters.map((filter) => (
            <ChoiceChip
              key={filter}
              type="radio"
              name={filterName}
              checked={filter === activeFilter}
              onChange={() => setActiveFilter(filter)}
              label={filter === "all" ? labels.all : labels.filters[filter] ?? filter}
            />
          ))}
        </div>
      </fieldset>

      {filteredItems.length === 0 ? (
        <EmptyNote>{labels.noData}</EmptyNote>
      ) : (
        <ol className="space-y-4">
          {filteredItems.map((movement) => (
            <li key={movement.id} className="relative border-l border-border pl-4">
              {/* The tone is a status shape on the line, and the badge says it in words (spec 2D M22). */}
              <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: movement.tone }), "absolute top-2 -left-1")} />
              <div className="rounded-md bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={movement.title} tone={movement.tone} />
                  <span className="text-meta text-muted-foreground">{formatDateTime(movement.performedAt)}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-foreground">{movement.summary}</div>
                <KeyValueList
                  className="mt-3"
                  items={[
                    { key: "from", label: labels.fromValue, value: movement.from },
                    { key: "to", label: labels.toValue, value: movement.to },
                  ]}
                />
                {movement.details.length ? (
                  <KeyValueList
                    className="mt-3 border-t border-border-soft pt-3"
                    items={movement.details.map((detail) => ({
                      key: detail.label,
                      label: detail.label,
                      value:
                        detail.href && detail.value ? (
                          <a href={detail.href} className={linkVariants({ size: "inherit" })}>
                            {detail.value}
                          </a>
                        ) : (
                          detail.value
                        ),
                    }))}
                  />
                ) : null}
                {movement.reason && <p className="mt-2 text-sm text-muted-foreground">{movement.reason}</p>}
              </div>
```

(4) Replace

```tsx
    </div>
  )
}

function MovementInfo({
  detail,
}: {
  detail: {
    label: string
    value?: string | null
    href?: string
  }
}) {
  const value = detail.value || "-"

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{detail.label}</div>
      {detail.href && detail.value ? (
        <a href={detail.href} className="mt-0.5 block text-sm font-medium text-primary hover:underline">
          {value}
        </a>
      ) : (
        <div className="mt-0.5 text-sm text-foreground">{value}</div>
      )}
    </div>
  )
}

function Info({
  label,
  value,
  compact,
}: {
  label: string
  value?: string | number | null
  compact?: boolean
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className={compact ? "mt-0.5 text-sm text-foreground" : "mt-1 text-sm font-medium text-foreground"}>
        {value || "-"}
      </div>
    </div>
  )
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-"
  return new Date(date).toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getMovementDotClass(tone: MovementTone) {
  const map: Record<MovementTone, string> = {
    neutral: "bg-muted-foreground",
    success: "bg-success",
    info: "bg-info",
    warning: "bg-warning",
    danger: "bg-danger",
  }

  return map[tone]
}

function getMovementBadgeClass(tone: MovementTone) {
  const map: Record<MovementTone, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  }

  return map[tone]
}
```

with

```tsx
    </div>
  )
}
```

- [ ] **Step 3: The evidence drawer.** In `src/components/assets/asset-evidence-drawer.tsx` (CRLF):

(1) Replace

```tsx
"use client"

import { useMemo, useState, type RefObject } from "react"
import { FileText, ImageIcon, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export type AssetEvidenceDrawerItem = {
  id: string
```

with

```tsx
"use client"

import { useId, useMemo, useState, type RefObject } from "react"
import { FileText, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ChoiceChip } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"

export type AssetEvidenceDrawerItem = {
  id: string
```

(2) Replace

```tsx
  images: string
  documents: string
  all: string
  openFile: string
}

```

with

```tsx
  images: string
  documents: string
  all: string
  filterLabel: string
  openFile: string
}

```

(3) Replace

```tsx
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const [activeGroup, setActiveGroup] = useState("__all")
  const groups = useMemo(() => Array.from(new Set(items.map((item) => item.group))), [items])
  const filteredItems = activeGroup === "__all" ? items : items.filter((item) => item.group === activeGroup)
```

with

```tsx
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const filterName = useId()
  const [activeGroup, setActiveGroup] = useState("__all")
  const groups = useMemo(() => Array.from(new Set(items.map((item) => item.group))), [items])
  const filteredItems = activeGroup === "__all" ? items : items.filter((item) => item.group === activeGroup)
```

(4) Replace

```tsx
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2">
            <EvidenceStat label={labels.total} value={String(items.length)} />
            <EvidenceStat label={labels.images} value={String(imageCount)} />
            <EvidenceStat label={labels.documents} value={String(documentCount)} />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={activeGroup === "__all"} label={labels.all} onClick={() => setActiveGroup("__all")} />
            {groups.map((group) => (
              <FilterButton key={group} active={activeGroup === group} label={group} onClick={() => setActiveGroup(group)} />
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <EmptyNote className="mt-4">{labels.emptyLabel}</EmptyNote>
```

with

```tsx
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Spec 2D: the counts are the shared number strip, the filters radio ChoiceChips in a named group (D19). */}
          <StatStrip
            items={[
              { key: "total", label: labels.total, value: formatCount(items.length) },
              { key: "images", label: labels.images, value: formatCount(imageCount) },
              { key: "documents", label: labels.documents, value: formatCount(documentCount) },
            ]}
          />

          <fieldset className="mt-4 min-w-0">
            <legend className="sr-only">{labels.filterLabel}</legend>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip type="radio" name={filterName} checked={activeGroup === "__all"} onChange={() => setActiveGroup("__all")} label={labels.all} />
              {groups.map((group) => (
                <ChoiceChip key={group} type="radio" name={filterName} checked={activeGroup === group} onChange={() => setActiveGroup(group)} label={group} />
              ))}
            </div>
          </fieldset>

          {filteredItems.length === 0 ? (
            <EmptyNote className="mt-4">{labels.emptyLabel}</EmptyNote>
```

(5) Replace

```tsx
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-input focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {item.fileType.startsWith("image/") ? (
                    <div className="flex h-28 w-full items-center justify-center bg-background p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${item.href}?inline=1`}
                        alt={item.title}
                        loading="lazy"
                        className="max-h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
                      />
                    </div>
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center bg-background p-3 text-center text-xs font-medium text-muted-foreground">
                      <FileText className="mr-2 h-4 w-4" />
                      {item.fileType}
                    </div>
                  )}
                  <div className="border-t border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-primary">
                        {item.fileType.startsWith("image/") ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {item.group}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.displayDate}</span>
                    </div>
                    <div className="mt-2 truncate text-sm font-medium text-foreground">{item.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</div>
                    <div className="mt-3 text-xs font-medium text-primary">{labels.openFile}</div>
                  </div>
                </a>
              ))}
```

with

```tsx
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.fileType.startsWith("image/") ? (
                    <div className="flex h-28 w-full items-center justify-center bg-background p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${item.href}?inline=1`} alt={item.title} loading="lazy" className="max-h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center gap-2 bg-background p-3 text-center text-meta font-medium text-muted-foreground">
                      <FileText aria-hidden="true" className="size-4" />
                      {item.fileType}
                    </div>
                  )}
                  <div className="border-t border-border p-3">
                    {/* The evidence group is a name, so it is the shared Chip (2D-2 R2). */}
                    <div className="flex items-center justify-between gap-2">
                      <Chip>{item.group}</Chip>
                      <span className="text-meta text-muted-foreground">{item.displayDate}</span>
                    </div>
                    <div className="mt-2 truncate text-sm font-medium text-foreground">{item.title}</div>
                    <div className="mt-1 truncate text-meta text-muted-foreground">{item.detail}</div>
                    <div className="mt-3 text-meta font-medium text-primary">{labels.openFile}</div>
                  </div>
                </a>
              ))}
```

(6) Replace

```tsx
    </Sheet>
  )
}

function EvidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-8 shrink-0 items-center rounded-md bg-primary px-3 text-xs font-medium text-white"
          : "inline-flex h-8 shrink-0 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-input hover:text-primary"
      }
    >
      {label}
    </button>
  )
}
```

with

```tsx
    </Sheet>
  )
}
```

- [ ] **Step 4: The asset page.** In `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (CRLF):

(1) Replace

```tsx
  ArrowRight,
  Building2,
  CheckCircle2,
  Cpu,
  Edit,
  FileText,
  GitBranch,
  History,
  ImageIcon,
  Info as InfoIcon,
  MapPin,
  PackageCheck,
  Puzzle,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
```

with

```tsx
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Edit,
  FileText,
  GitBranch,
  Info as InfoIcon,
  MapPin,
  PackageCheck,
  Puzzle,
  RotateCcw,
  ScanLine,
  ShieldCheck,
```

(2) Replace

```tsx
import { hasPermission } from "@/lib/auth-utils"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { AssetQrCode } from "@/components/assets/asset-qr-code"
```

with

```tsx
import { hasPermission } from "@/lib/auth-utils"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { AssetQrCode } from "@/components/assets/asset-qr-code"
```

(3) Replace

```tsx
import { AssetStatusCorrectionButton } from "@/components/assets/asset-status-correction-button"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import { AssetComponentContextBanner } from "@/components/assets/asset-component-context-banner"
import { AssetComponentsSummary } from "@/components/assets/asset-components-summary"
```

with

```tsx
import { AssetStatusCorrectionButton } from "@/components/assets/asset-status-correction-button"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, getPanelClasses } from "@/lib/design-system"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import { AssetComponentContextBanner } from "@/components/assets/asset-component-context-banner"
import { AssetComponentsSummary } from "@/components/assets/asset-components-summary"
```

(4) Replace

```tsx
  compactMovementDetails,
  createHealthItem,
  formatMovementType,
  getActivityToneClass,
  getHealthBadgeClass,
  getMissingPhotoChecklistLabels,
  getWarrantyIconClass,
  getWarrantyPanelClass,
  getWarrantyState,
  maskLicenseKey,
} from "@/lib/asset-detail-format"
```

with

```tsx
  compactMovementDetails,
  createHealthItem,
  formatMovementType,
  getMissingPhotoChecklistLabels,
  getWarrantyState,
  maskLicenseKey,
} from "@/lib/asset-detail-format"
```

(5) Replace

```tsx
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <span className="truncate">{orNil(currentLocationLabel)}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <PackageCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{orNil(lifecycle.responsibilityValue ?? currentCustodianLabel)}</span>
            </span>
          </>
```

with

```tsx
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-faint-foreground" aria-hidden="true" />
              <span className="truncate">{orNil(currentLocationLabel)}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <PackageCheck className="h-4 w-4 shrink-0 text-faint-foreground" aria-hidden="true" />
              <span className="truncate">{orNil(lifecycle.responsibilityValue ?? currentCustodianLabel)}</span>
            </span>
          </>
```

(6) Replace

```tsx
                  images: t("evidenceImages"),
                  documents: t("evidenceDocuments"),
                  all: t("movementFilters.all"),
                  openFile: t("openEvidenceFile"),
                },
              }}
```

with

```tsx
                  images: t("evidenceImages"),
                  documents: t("evidenceDocuments"),
                  all: t("movementFilters.all"),
                  filterLabel: tCommon("filter"),
                  openFile: t("openEvidenceFile"),
                },
              }}
```

(7) Replace

```tsx
            <details data-testid="asset-data-health-details" className="rounded-md border border-border bg-background">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <span>{t("dataHealthTitle")}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${getHealthBadgeClass(dataHealthTone)}`}>
                  {t("dataHealthProgress", { done: dataHealthDone, total: dataHealthItems.length })}
                </span>
              </summary>
              <div className="grid gap-2 border-t border-border p-2 sm:grid-cols-2">
                {dataHealthItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.done ? item.href : item.fixHref}
                    className="flex min-h-11 items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
```

with

```tsx
            <details data-testid="asset-data-health-details" className="rounded-md border border-border bg-background">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <span>{t("dataHealthTitle")}</span>
                <StatusBadge label={t("dataHealthProgress", { done: dataHealthDone, total: dataHealthItems.length })} tone={dataHealthTone} />
              </summary>
              <div className="grid gap-2 border-t border-border p-2 sm:grid-cols-2">
                {dataHealthItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.done ? item.href : item.fixHref}
                    className="flex min-h-11 items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-sm transition-colors hover:bg-row-hover"
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
```

(8) Replace

```tsx
                      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    )}
                    <span className={item.done ? "text-muted-foreground" : "font-medium text-foreground"}>{item.label}</span>
                    {!item.done ? <span className="ml-auto text-xs font-medium text-primary">{item.actionLabel}</span> : null}
                  </a>
                ))}
              </div>
```

with

```tsx
                      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    )}
                    <span className={item.done ? "text-muted-foreground" : "font-medium text-foreground"}>{item.label}</span>
                    {!item.done ? <span className="ml-auto text-meta font-medium text-primary">{item.actionLabel}</span> : null}
                  </a>
                ))}
              </div>
```

(9) Replace

```tsx
      ) : null}

      {assetDetailView === "overview" && canEditAsset ? (
        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("quickActions")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{lifecycle.help}</p>
            </div>
          </div>
          <div className="mb-3 rounded-md border border-info-border bg-info-soft px-3 py-2">
            <div className="text-sm font-semibold text-foreground">{lifecycle.title}</div>
            <p className="mt-1 text-xs text-muted-foreground">{lifecycle.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {lifecycle.actions.map((action) => (
              <QuickAction key={action.label} {...action} />
```

with

```tsx
      ) : null}

      {assetDetailView === "overview" && canEditAsset ? (
        // Spec 2D D9, D7: a ContentPanel; how this ownership type works is information, an inline info Notice.
        <ContentPanel title={t("quickActions")} description={lifecycle.help}>
          <Notice tone="info" title={lifecycle.title} className="mb-3">
            {lifecycle.description}
          </Notice>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {lifecycle.actions.map((action) => (
              <QuickAction key={action.label} {...action} />
```

(10) Replace

```tsx
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <div className={`grid grid-cols-1 gap-6 ${assetDetailView === "overview" ? "xl:grid-cols-[1fr_280px]" : ""}`}>
        <div className="space-y-6">
          {isAssetDetailSectionVisible(assetDetailView, "overview") ? (
            <section id="overview" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <SectionHeading title={t("detailSections.overview")} subtitle={t("detailSections.overviewSubtitle")} />
            <KeyValueList
              items={[
```

with

```tsx
              />
            </div>
          ) : null}
        </ContentPanel>
      ) : null}

      <div className={`grid grid-cols-1 gap-6 ${assetDetailView === "overview" ? "xl:grid-cols-[1fr_280px]" : ""}`}>
        <div className="space-y-6">
          {isAssetDetailSectionVisible(assetDetailView, "overview") ? (
            <section id="overview" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("detailSections.overview")} subtitle={t("detailSections.overviewSubtitle")} />
            <KeyValueList
              items={[
```

(11) Replace

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "specs") && asset.model && (modelSpecs.items.length > 0 || modelSpecs.notes) ? (
            <section id="specs" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
              <SectionHeading title={tBrandModel("structuredSpecs")} subtitle={t("detailSections.specsSubtitle")} />
              {modelSpecs.items.length > 0 ? (
                <KeyValueList items={modelSpecs.items.map((item) => ({ key: item.id, label: item.label, value: item.value }))} />
```

with

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "specs") && asset.model && (modelSpecs.items.length > 0 || modelSpecs.notes) ? (
            <section id="specs" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
              <SectionHeading title={tBrandModel("structuredSpecs")} subtitle={t("detailSections.specsSubtitle")} />
              {modelSpecs.items.length > 0 ? (
                <KeyValueList items={modelSpecs.items.map((item) => ({ key: item.id, label: item.label, value: item.value }))} />
```

(12) Replace

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "ownership") ? (
            <section id="ownership" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <SectionHeading title={t("ownership")} subtitle={t("detailSections.ownershipSubtitle")} />
            <KeyValueList
              items={[
```

with

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "ownership") ? (
            <section id="ownership" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("ownership")} subtitle={t("detailSections.ownershipSubtitle")} />
            <KeyValueList
              items={[
```

(13) Replace

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "purchase") ? (
            <section id="purchase" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <SectionHeading title={t("purchaseWarranty")} subtitle={t("detailSections.purchaseSubtitle")} />
            <div className={`mb-4 rounded-md border px-4 py-3 ${getWarrantyPanelClass(warrantyState.tone)}`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">{t("warrantyStatus")}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{getWarrantyStatusLabel(warrantyState, t)}</div>
                </div>
                <ShieldCheck className={`h-5 w-5 ${getWarrantyIconClass(warrantyState.tone)}`} />
              </div>
            </div>
            <KeyValueList
              items={[
                { key: "supplier", label: t("supplier"), value: asset.supplier ? <><span className="tag">{asset.supplier.code}</span> - {asset.supplier.name}</> : null },
                { key: "purchaseDate", label: t("purchaseDate"), value: asset.purchaseDate ? formatDate(asset.purchaseDate) : null },
                { key: "warrantyStart", label: t("warrantyStart"), value: asset.warrantyStartDate ? formatDate(asset.warrantyStartDate) : null },
```

with

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "purchase") ? (
            <section id="purchase" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("purchaseWarranty")} subtitle={t("detailSections.purchaseSubtitle")} />
            {/* The warranty state is a state, so it is the first fact as a StatusBadge, not a tinted box (spec 2D M22). */}
            <KeyValueList
              items={[
                { key: "warrantyStatus", label: t("warrantyStatus"), value: <StatusBadge label={getWarrantyStatusLabel(warrantyState, t)} tone={warrantyState.tone} /> },
                { key: "supplier", label: t("supplier"), value: asset.supplier ? <><span className="tag">{asset.supplier.code}</span> - {asset.supplier.name}</> : null },
                { key: "purchaseDate", label: t("purchaseDate"), value: asset.purchaseDate ? formatDate(asset.purchaseDate) : null },
                { key: "warrantyStart", label: t("warrantyStart"), value: asset.warrantyStartDate ? formatDate(asset.warrantyStartDate) : null },
```

(14) Replace

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "handover") ? (
            <section id="handover" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <SectionHeading title={t("detailSections.handover")} subtitle={t("detailSections.handoverSubtitle")} icon={<FileText className="h-5 w-5 text-primary" />} />
            {asset.checkouts.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tCommon("noData")}
              </div>
            ) : (
              <div className="space-y-3">
                {asset.checkouts.map((checkout, index) => {
```

with

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "handover") ? (
            <section id="handover" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("detailSections.handover")} subtitle={t("detailSections.handoverSubtitle")} />
            {asset.checkouts.length === 0 ? (
              <EmptyNote>{tCommon("noData")}</EmptyNote>
            ) : (
              <div className="space-y-3">
                {asset.checkouts.map((checkout, index) => {
```

(15) Replace

```tsx
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-primary">{t("latestTransaction")}</span>
                            <span className="font-semibold text-foreground">{formatDate(checkout.checkoutDate)}</span>
                            <StatusBadge label={checkout.isReturned ? t("handoverReturned") : t("handoverActive")} tone={checkout.isReturned ? "success" : "info"} />
                          </div>
```

with

```tsx
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Chip>{t("latestTransaction")}</Chip>
                            <span className="font-semibold text-foreground">{formatDate(checkout.checkoutDate)}</span>
                            <StatusBadge label={checkout.isReturned ? t("handoverReturned") : t("handoverActive")} tone={checkout.isReturned ? "success" : "info"} />
                          </div>
```

(16) Replace

```tsx
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/${locale}/asset-management/checkouts/${checkout.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
                            {t("openHandoverDocument")}
                          </Link>
                          {checkout.checkin ? (
                            <Link href={`/${locale}/asset-management/checkins/${checkout.checkin.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
                              {t("openReturnDocument")}
                            </Link>
                          ) : null}
```

with

```tsx
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/${locale}/asset-management/checkouts/${checkout.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            {t("openHandoverDocument")}
                          </Link>
                          {checkout.checkin ? (
                            <Link href={`/${locale}/asset-management/checkins/${checkout.checkin.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                              {t("openReturnDocument")}
                            </Link>
                          ) : null}
```

(17) Replace

```tsx
                            ]}
                          />
                        </div>
                        <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors group-open:bg-accent">
                          {t("viewEvidence")}
                        </span>
                      </summary>
                      <div className="border-t border-border px-4 pb-4 pt-3">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Link href={`/${locale}/asset-management/checkouts/${checkout.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
                            {t("openHandoverDocument")}
                          </Link>
                          {checkout.checkin ? (
                            <Link href={`/${locale}/asset-management/checkins/${checkout.checkin.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
                              {t("openReturnDocument")}
                            </Link>
                          ) : null}
```

with

```tsx
                            ]}
                          />
                        </div>
                        {/* The summary is the control: its cue reads as a text link with a turning chevron, not as a second button. */}
                        <span className={cn(linkVariants(), "inline-flex shrink-0 items-center gap-1")}>
                          {t("viewEvidence")}
                          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                        </span>
                      </summary>
                      <div className="border-t border-border px-4 pb-4 pt-3">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Link href={`/${locale}/asset-management/checkouts/${checkout.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            {t("openHandoverDocument")}
                          </Link>
                          {checkout.checkin ? (
                            <Link href={`/${locale}/asset-management/checkins/${checkout.checkin.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                              {t("openReturnDocument")}
                            </Link>
                          ) : null}
```

(18) Replace

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "movement") ? (
            <section id="movement" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <SectionHeading title={t("movementHistory")} subtitle={t("detailSections.movementSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            <div className="mb-5 rounded-md border border-border bg-background p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">{t("movementSnapshot")}</div>
              <KeyValueList
```

with

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "movement") ? (
            <section id="movement" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("movementHistory")} subtitle={t("detailSections.movementSubtitle")} />
            <div className="mb-5 rounded-md border border-border bg-background p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">{t("movementSnapshot")}</div>
              <KeyValueList
```

(19) Replace

```tsx
                ]}
              />
              {latestMovement ? (
                <div className="mt-3 rounded-md bg-surface/80 px-3 py-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t("movementSummary")}: </span>
                  {latestMovement.summary}
                </div>
              ) : null}
            </div>
            <AssetMovementTimeline
              items={movementTimelineItemsForClient}
              labels={{
                all: t("movementFilters.all"),
                fromValue: t("fromValue"),
                toValue: t("toValue"),
                noData: tCommon("noData"),
```

with

```tsx
                ]}
              />
              {latestMovement ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t("movementSummary")}: </span>
                  {latestMovement.summary}
                </p>
              ) : null}
            </div>
            <AssetMovementTimeline
              items={movementTimelineItemsForClient}
              labels={{
                all: t("movementFilters.all"),
                filterLabel: tCommon("filter"),
                fromValue: t("fromValue"),
                toValue: t("toValue"),
                noData: tCommon("noData"),
```

(20) Replace

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "notes") ? (
            <section id="notes" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
              <SectionHeading title={t("remark")} subtitle={t("detailSections.notesSubtitle")} />
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{orNil(asset.remark)}</p>
            </section>
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "maintenance") ? (
            <section id="maintenance" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <SectionHeading title={tMaintenance("maintenanceHistory")} subtitle={t("detailSections.maintenanceSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            <StatStrip
              className="mb-4"
              items={[
```

with

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "notes") ? (
            <section id="notes" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
              <SectionHeading title={t("remark")} subtitle={t("detailSections.notesSubtitle")} />
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{orNil(asset.remark)}</p>
            </section>
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "maintenance") ? (
            <section id="maintenance" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={tMaintenance("maintenanceHistory")} subtitle={t("detailSections.maintenanceSubtitle")} />
            <StatStrip
              className="mb-4"
              items={[
```

(21) Replace

```tsx
              ]}
            />
            {maintenanceReplacementWarning ? (
              <div className="mb-4 rounded-md border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">
                {t("maintenanceReplacementWarning")}
              </div>
            ) : null}
            {asset.maintenanceTickets.length === 0 ? (
              <ActionEmptyState
```

with

```tsx
              ]}
            />
            {maintenanceReplacementWarning ? (
              <Notice tone="warning" className="mb-4">
                {t("maintenanceReplacementWarning")}
              </Notice>
            ) : null}
            {asset.maintenanceTickets.length === 0 ? (
              <ActionEmptyState
```

(22) Replace

```tsx
                      label={`${tCommon("view")}: ${ticket.repairNo}`}
                    >
                      <DataTableCell className="whitespace-nowrap">
                        <Link href={`/${locale}/maintenance/${ticket.id}`} className="font-medium text-primary hover:underline">
                          <span className="tag">{ticket.repairNo}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-72 text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          {Boolean(ticket.maintenancePlanId) ? (
                            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                              {t("maintenancePmBadge")}
                            </span>
                          ) : null}
                          <span>{ticket.problem}</span>
                        </div>
                      </DataTableCell>
```

with

```tsx
                      label={`${tCommon("view")}: ${ticket.repairNo}`}
                    >
                      <DataTableCell className="whitespace-nowrap">
                        <Link href={`/${locale}/maintenance/${ticket.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{ticket.repairNo}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-72 text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          {Boolean(ticket.maintenancePlanId) ? <Chip>{t("maintenancePmBadge")}</Chip> : null}
                          <span>{ticket.problem}</span>
                        </div>
                      </DataTableCell>
```

(23) Replace

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "audit") ? (
            <section id="audit" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <SectionHeading title={t("auditHistory")} subtitle={t("detailSections.auditSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            <StatStrip
              className="mb-4"
              items={[
```

with

```tsx
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "audit") ? (
            <section id="audit" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("auditHistory")} subtitle={t("detailSections.auditSubtitle")} />
            <StatStrip
              className="mb-4"
              items={[
```

(24) Replace

```tsx
                    >
                      <DataTableCell className="min-w-64">
                        <div className="font-medium text-foreground"><span className="tag font-medium">{item.auditRound.auditNo}</span></div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.auditRound.name}</div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatAuditState(item.auditStatus)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{item.auditResult ? formatAuditState(item.auditStatus, item.auditResult) : <Nil />}</DataTableCell>
```

with

```tsx
                    >
                      <DataTableCell className="min-w-64">
                        <div className="font-medium text-foreground"><span className="tag font-medium">{item.auditRound.auditNo}</span></div>
                        <div className="mt-1 text-meta text-muted-foreground">{item.auditRound.name}</div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatAuditState(item.auditStatus)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{item.auditResult ? formatAuditState(item.auditStatus, item.auditResult) : <Nil />}</DataTableCell>
```

(25) Replace

```tsx

        {assetDetailView === "overview" ? (
          <aside className="space-y-6">
          <section id="qr" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 text-center">
            <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
              <QrCode className="h-5 w-5 text-primary" />
              {t("qrCode")}
            </h2>
            <AssetQrCode value={qrValue} label={asset.assetTag} />
          </section>
          <SidebarPhotoCard
            title={t("modelPhoto")}
            caption={asset.model?.name ?? t("modelPhoto")}
```

with

```tsx

        {assetDetailView === "overview" ? (
          <aside className="space-y-6">
          <ContentPanel title={t("qrCode")}>
            <div className="flex justify-center">
              <AssetQrCode value={qrValue} label={asset.assetTag} />
            </div>
          </ContentPanel>
          <SidebarPhotoCard
            title={t("modelPhoto")}
            caption={asset.model?.name ?? t("modelPhoto")}
```

(26) Replace

```tsx
  details?: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">{followUpTitle}</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {followUpItems.map((item) => (
            <ActivitySummaryLink key={item.label} item={item} showAction />
          ))}
        </div>
        {details ? <div className="mt-3">{details}</div> : null}
      </div>
    </section>
  )
}

function ActivitySummaryLink({
  item,
  showAction,
```

with

```tsx
  details?: React.ReactNode
}) {
  return (
    <ContentPanel title={title} description={subtitle}>
      <h3 className="mb-2 text-meta font-medium text-muted-foreground">{followUpTitle}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {followUpItems.map((item) => (
          <ActivitySummaryLink key={item.label} item={item} showAction />
        ))}
      </div>
      {details ? <div className="mt-3">{details}</div> : null}
    </ContentPanel>
  )
}

// The work center's follow-up row (plan 2D-2): no tone fill; the tone is a status shape and the label says the rest.
function ActivitySummaryLink({
  item,
  showAction,
```

(27) Replace

```tsx
  showAction?: boolean
}) {
  return (
    <Link
      href={item.href}
      className={`block rounded-md border px-3 py-2 transition-colors hover:border-primary-border hover:bg-primary-soft ${getActivityToneClass(item.tone)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{item.label}</div>
          <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{orNil(item.value)}</div>
        </div>
        {showAction && item.actionLabel ? (
          <span className="shrink-0 rounded-full bg-surface/80 px-2 py-1 text-xs font-medium text-primary">
            {item.actionLabel}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

function QuickAction({
  href,
  icon,
```

with

```tsx
  showAction?: boolean
}) {
  return (
    <Link href={item.href} className="block rounded-md border border-border bg-background px-3 py-2 transition-colors hover:bg-row-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: item.tone }), "mt-1.5")} />
          <div className="min-w-0">
            <div className="text-meta text-muted-foreground">{item.label}</div>
            <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{orNil(item.value)}</div>
          </div>
        </div>
        {showAction && item.actionLabel ? <span className="shrink-0 text-meta font-medium text-primary">{item.actionLabel}</span> : null}
      </div>
    </Link>
  )
}

// Spec 2D M12: a step that cannot run now is a real disabled button, so a screen reader says it is unavailable. A long
// Thai label may wrap in the 2/3/6-column grid, so the button grows instead of clipping (the settings presets' rule).
const quickActionClasses = "h-auto w-full whitespace-normal py-2 text-center md:h-auto md:min-h-9"

function QuickAction({
  href,
  icon,
```

(28) Replace

```tsx
}) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-center text-sm font-medium leading-tight text-faint-foreground md:h-10 md:min-h-0">
        {icon}
        {label}
      </span>
    )
  }

  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-center text-sm font-medium leading-tight text-foreground transition-colors hover:border-primary-border hover:bg-primary-soft hover:text-primary md:h-10 md:min-h-0">
      {icon}
      {label}
    </Link>
```

with

```tsx
}) {
  if (disabled) {
    return (
      <Button variant="outline" disabled className={quickActionClasses}>
        {icon}
        {label}
      </Button>
    )
  }

  return (
    <Link href={href} className={cn(buttonVariants({ variant: "outline" }), quickActionClasses)}>
      {icon}
      {label}
    </Link>
```

(29) Replace

```tsx
  const childPreview = splitRelationshipPreview(childLinks)

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      <SectionHeading title={title} subtitle={subtitle} icon={<GitBranch className="h-5 w-5 text-primary" />} />

      <div className="mb-5 flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{currentTitle}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{currentRoleLabel}</div>
        </div>
        <RelationshipSummaryBadge label={summaryLabel} state={relationshipState} />
```

with

```tsx
  const childPreview = splitRelationshipPreview(childLinks)

  return (
    <ContentPanel title={title} description={subtitle}>
      <div className="mb-5 flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-meta text-muted-foreground">{currentTitle}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{currentRoleLabel}</div>
        </div>
        <RelationshipSummaryBadge label={summaryLabel} state={relationshipState} />
```

(30) Replace

```tsx
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)_auto_minmax(0,1fr)] md:items-center">
        <RelationshipLane title={parentLaneTitle} icon={<Building2 className="h-4 w-4" />}>
          {parentLinks.length === 0 ? (
            <RelationshipEmptyState title={parentEmptyTitle} help={parentEmptyHelp} icon={<Building2 className="h-8 w-8" />} />
          ) : (
            <div className="space-y-2">
              {parentLinks.map((link) => (
```

with

```tsx
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)_auto_minmax(0,1fr)] md:items-center">
        <RelationshipLane title={parentLaneTitle} icon={<Building2 className="h-4 w-4" />}>
          {parentLinks.length === 0 ? (
            <RelationshipEmptyState title={parentEmptyTitle} help={parentEmptyHelp} icon={<Building2 />} />
          ) : (
            <div className="space-y-2">
              {parentLinks.map((link) => (
```

(31) Replace

```tsx
        <RelationshipConnector direction="left" />

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{currentTitle}</div>
          <RelationshipAssetCard
            assetTag={assetTag}
            assetName={assetName}
```

with

```tsx
        <RelationshipConnector direction="left" />

        <div>
          <div className="mb-2 text-meta font-medium text-muted-foreground">{currentTitle}</div>
          <RelationshipAssetCard
            assetTag={assetTag}
            assetName={assetName}
```

(32) Replace

```tsx

        <RelationshipLane title={componentsTitle} icon={<Puzzle className="h-4 w-4" />} countLabel={componentsCountLabel}>
          {childLinks.length === 0 ? (
            <RelationshipEmptyState title={componentsEmptyTitle} help={componentsEmptyHelp} icon={<Puzzle className="h-8 w-8" />} />
          ) : (
            <div className="space-y-2">
              {childPreview.visible.map((link) => (
```

with

```tsx

        <RelationshipLane title={componentsTitle} icon={<Puzzle className="h-4 w-4" />} countLabel={componentsCountLabel}>
          {childLinks.length === 0 ? (
            <RelationshipEmptyState title={componentsEmptyTitle} help={componentsEmptyHelp} icon={<Puzzle />} />
          ) : (
            <div className="space-y-2">
              {childPreview.visible.map((link) => (
```

(33) Replace

```tsx
        </div>
      ) : null}

      <div className="mt-4 flex items-start gap-2 rounded-md border border-primary-border bg-primary-soft px-3 py-2 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{noteLabel}</span>
      </div>
    </section>
  )
}

```

with

```tsx
        </div>
      ) : null}

      <Notice tone="neutral" className="mt-4">{noteLabel}</Notice>
    </ContentPanel>
  )
}

```

(34) Replace

```tsx
  return (
    <div className="min-h-full rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          <span className="text-primary">{icon}</span>
          <span className="truncate">{title}</span>
        </div>
        {countLabel ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{countLabel}</span> : null}
      </div>
      {children}
    </div>
  )
}

function RelationshipConnector({ direction }: { direction: "left" | "right" }) {
  const Icon = direction === "left" ? ArrowLeft : ArrowRight

  return (
    <div className="flex items-center justify-center md:block">
      <div className="flex flex-col items-center text-primary md:hidden">
        <span className="h-3 border-l border-dashed border-border" />
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-border bg-surface">
          <ArrowDown className="h-4 w-4" />
        </span>
        <span className="h-3 border-l border-dashed border-border" />
      </div>
      <div className="hidden items-center gap-1 text-primary md:flex">
        <span className="h-px w-5 border-t border-dashed border-border" />
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-border bg-surface">
          <Icon className="h-4 w-4" />
        </span>
        <span className="h-px w-5 border-t border-dashed border-border" />
      </div>
    </div>
  )
}

function RelationshipSummaryBadge({
  label,
  state,
```

with

```tsx
  return (
    <div className="min-h-full rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-meta font-medium text-muted-foreground">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {/* A count is plain text (2D-2 R2). */}
        {countLabel ? <span className="shrink-0 text-meta text-muted-foreground">{countLabel}</span> : null}
      </div>
      {children}
    </div>
  )
}

// The lines between the lanes are solid border lines: a dashed border is kept for drop zones and the signature pad
// (spec 2D §5.4 guard 2), and the arrows are decoration, so they take no color.
function RelationshipConnector({ direction }: { direction: "left" | "right" }) {
  const Icon = direction === "left" ? ArrowLeft : ArrowRight

  return (
    <div className="flex items-center justify-center md:block">
      <div aria-hidden="true" className="flex flex-col items-center text-muted-foreground md:hidden">
        <span className="h-3 border-l border-border" />
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface">
          <ArrowDown className="h-4 w-4" />
        </span>
        <span className="h-3 border-l border-border" />
      </div>
      <div aria-hidden="true" className="hidden items-center gap-1 text-muted-foreground md:flex">
        <span className="h-px w-5 border-t border-border" />
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface">
          <Icon className="h-4 w-4" />
        </span>
        <span className="h-px w-5 border-t border-border" />
      </div>
    </div>
  )
}

// The summary is a sentence that may be long, so it is plain text with its icon, not a badge (StatusBadge is nowrap).
function RelationshipSummaryBadge({
  label,
  state,
```

(35) Replace

```tsx
  const Icon = state === "standalone" ? InfoIcon : CheckCircle2

  return (
    <div className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${getRelationshipSummaryClass(state)}`}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  )
}

function RelationshipEmptyState({
  title,
  help,
```

with

```tsx
  const Icon = state === "standalone" ? InfoIcon : CheckCircle2

  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{label}</span>
    </p>
  )
}

// Kept as a wrapper so the lanes read the same; the empty state itself is the shared one (spec 2D M21).
function RelationshipEmptyState({
  title,
  help,
```

(36) Replace

```tsx
  help: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface/60 p-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <div className="mt-3 text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 max-w-56 text-xs text-muted-foreground">{help}</p>
    </div>
  )
}

function RelationshipAssetCard({
```

with

```tsx
  help: string
  icon: React.ReactNode
}) {
  return <ActionEmptyState icon={icon} title={title} description={help} />
}

function RelationshipAssetCard({
```

(37) Replace

```tsx
  const roleLabel = role ?? link?.role
  const iconBoxClassName = current ? "h-10 w-10" : "h-9 w-9"
  const iconClassName = current ? "h-5 w-5" : "h-4 w-4"
  const content = (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className={`flex shrink-0 items-center justify-center rounded-md ${iconBoxClassName} ${getRelationshipIconClass(variant)}`}>
          {variant === "child" || variant === "component" ? <Cpu className={iconClassName} /> : <PackageCheck className={iconClassName} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">{relationshipAsset.assetTag}</div>
          <div className="mt-1 line-clamp-3 text-sm leading-5 text-foreground [overflow-wrap:anywhere]">{relationshipAsset.name}</div>
        </div>
      </div>

      {roleLabel || (metaLabel && metaValue) ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
          {roleLabel ? (
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${getRelationshipBadgeClass(variant)}`}>
              {roleLabel}
            </span>
          ) : null}
          {metaLabel && metaValue ? (
            <span className="text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-foreground">{metaLabel}</span>
              <span className="mx-1">:</span>
              <span>{metaValue}</span>
```

with

```tsx
  const roleLabel = role ?? link?.role
  const iconBoxClassName = current ? "h-10 w-10" : "h-9 w-9"
  const iconClassName = current ? "h-5 w-5" : "h-4 w-4"
  // Spec 2D: no raw palette colors. The role is a name (the shared Chip, 2D-2 R2); the card in view has the primary
  // border, the others the row hover. The tag keeps font-mono because it must wrap in a narrow lane (2D-2 R3), at 500.
  const content = (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ${iconBoxClassName}`}>
          {variant === "child" || variant === "component" ? <Cpu className={iconClassName} /> : <PackageCheck className={iconClassName} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-medium leading-5 text-foreground [overflow-wrap:anywhere]">{relationshipAsset.assetTag}</div>
          <div className="mt-1 line-clamp-3 text-sm leading-5 text-foreground [overflow-wrap:anywhere]">{relationshipAsset.name}</div>
        </div>
      </div>

      {roleLabel || (metaLabel && metaValue) ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
          {roleLabel ? <Chip>{roleLabel}</Chip> : null}
          {metaLabel && metaValue ? (
            <span className="text-meta text-muted-foreground">
              <span className="font-medium text-foreground">{metaLabel}</span>
              <span className="mx-1">:</span>
              <span>{metaValue}</span>
```

(38) Replace

```tsx
      ) : null}
    </div>
  )
  const className = `block rounded-md border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${current ? "min-h-36" : ""} ${getRelationshipCardClass(variant, Boolean(current))}`

  if (link) {
    return (
```

with

```tsx
      ) : null}
    </div>
  )
  const className = `block rounded-md border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${current ? "min-h-36" : ""} ${getRelationshipCardClass(Boolean(current))}`

  if (link) {
    return (
```

(39) Replace

```tsx
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">{title}</div>
      {links.length === 0 ? (
        <div className="text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <Link key={link.id} href={link.href} className="block rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:border-primary-border hover:bg-primary-soft">
              <div className="text-sm font-medium text-primary">{link.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{link.role}</div>
            </Link>
          ))}
        </div>
```

with

```tsx
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <h3 className="mb-2 text-meta font-medium text-muted-foreground">{title}</h3>
      {links.length === 0 ? (
        <EmptyNote>{emptyLabel}</EmptyNote>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <Link key={link.id} href={link.href} className="block rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:bg-row-hover">
              <div className="text-sm font-medium text-primary">{link.label}</div>
              <div className="mt-1 text-meta text-muted-foreground">{link.role}</div>
            </Link>
          ))}
        </div>
```

(40) Replace

```tsx
  }
}

function getRelationshipSummaryClass(state: RelationshipState) {
  if (state === "component" || state === "parentAndComponent") return "border-amber-200 bg-amber-50 text-amber-800"
  if (state === "parent") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  return "border-border bg-muted text-muted-foreground"
}

function getRelationshipCardClass(variant: RelationshipCardVariant, current: boolean) {
  if (current && (variant === "component" || variant === "parentAndComponent")) return "border-amber-300 bg-amber-50/70"
  if (current && variant === "parent") return "border-primary-border bg-primary-soft"
  if (current) return "border-border bg-surface"
  if (variant === "child") return "border-border bg-surface hover:border-primary-border hover:bg-primary-soft"
  if (variant === "parent") return "border-border bg-surface hover:border-primary-border hover:bg-primary-soft"
  return "border-border bg-surface hover:border-primary-border hover:bg-primary-soft"
}

function getRelationshipBadgeClass(variant: RelationshipCardVariant) {
  if (variant === "component" || variant === "parentAndComponent") return "bg-amber-100 text-amber-800"
  if (variant === "parent") return "bg-primary-soft text-primary"
  if (variant === "child") return "bg-emerald-50 text-emerald-700"
  return "bg-muted text-muted-foreground"
}

function getRelationshipIconClass(variant: RelationshipCardVariant) {
  if (variant === "component" || variant === "parentAndComponent") return "bg-amber-100 text-amber-700"
  if (variant === "child") return "bg-emerald-50 text-emerald-700"
  if (variant === "parent") return "bg-primary-soft text-primary"
  return "bg-muted text-muted-foreground"
}

function SidebarPhotoCard({
```

with

```tsx
  }
}

function getRelationshipCardClass(current: boolean) {
  return current ? "border-primary-border bg-surface" : "border-border bg-surface hover:bg-row-hover"
}

function SidebarPhotoCard({
```

(41) Replace

```tsx
  viewLabel: string
}) {
  return (
    <section className="scroll-mt-24 rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ImageIcon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      {attachment ? (
        <a
          href="#photos"
          className="group block overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-input focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <div className="flex h-32 w-full items-center justify-center bg-background p-2">
            {/* Authenticated attachment URLs render more reliably as browser-native images. */}
```

with

```tsx
  viewLabel: string
}) {
  return (
    <ContentPanel title={title}>
      {attachment ? (
        <a
          href="#photos"
          className="group block overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-32 w-full items-center justify-center bg-background p-2">
            {/* Authenticated attachment URLs render more reliably as browser-native images. */}
```

(42) Replace

```tsx
              height={240}
              loading="eager"
              fetchPriority="high"
              className="max-h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
            />
          </div>
          <div className="border-t border-border p-3 text-left">
            <div className="line-clamp-2 text-sm font-medium text-foreground">{caption}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{attachment.originalName}</div>
            <div className="mt-2 text-xs font-medium text-primary">{viewLabel}</div>
          </div>
        </a>
      ) : (
        <a
          href="#photos"
          className="flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-background text-sm text-muted-foreground transition-colors hover:border-input hover:text-primary"
        >
          {emptyLabel}
        </a>
      )}
    </section>
  )
}

```

with

```tsx
              height={240}
              loading="eager"
              fetchPriority="high"
              className="max-h-full w-full object-contain"
            />
          </div>
          <div className="border-t border-border p-3 text-left">
            <div className="line-clamp-2 text-sm font-medium text-foreground">{caption}</div>
            <div className="mt-1 truncate text-meta text-muted-foreground">{attachment.originalName}</div>
            <div className="mt-2 text-meta font-medium text-primary">{viewLabel}</div>
          </div>
        </a>
      ) : (
        // No dashed box (spec 2D M21): one empty line, and the gallery link as a text link.
        <div className="flex h-32 flex-col items-center justify-center gap-1">
          <EmptyNote>{emptyLabel}</EmptyNote>
          <a href="#photos" className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
            {viewLabel}
          </a>
        </div>
      )}
    </ContentPanel>
  )
}

```

(43) Replace

```tsx
  attachments: { id: string; originalName: string; fileType: string }[]
  emptyLabel: string
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{title}</div>
      {attachments.length === 0 ? (
        <div className="mt-2 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="mt-2 grid gap-2">
          {attachments.map((attachment) => (
```

with

```tsx
  attachments: { id: string; originalName: string; fileType: string }[]
  emptyLabel: string
}) {
  // A column of the handover card, not a box of its own (no box in a box, 2D-2 R4); the files keep their link cards.
  return (
    <div className="min-w-0">
      <h3 className="text-meta font-medium text-muted-foreground">{title}</h3>
      {attachments.length === 0 ? (
        <EmptyNote className="mt-2">{emptyLabel}</EmptyNote>
      ) : (
        <div className="mt-2 grid gap-2">
          {attachments.map((attachment) => (
```

(44) Replace

```tsx
              href={`/api/attachments/${attachment.id}?inline=1`}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-input focus:outline-none focus:ring-2 focus:ring-ring"
              title={attachment.originalName}
            >
              {attachment.fileType.startsWith("image/") ? (
                <div className="flex aspect-video w-full items-center justify-center bg-background p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/attachments/${attachment.id}?inline=1`}
                    alt={attachment.originalName}
                    loading="lazy"
                    className="max-h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-background p-3 text-sm font-medium text-muted-foreground">
                  {attachment.fileType}
                </div>
              )}
              <div className="truncate border-t border-border px-2 py-1.5 text-xs font-medium text-foreground">
                {attachment.originalName}
              </div>
            </a>
```

with

```tsx
              href={`/api/attachments/${attachment.id}?inline=1`}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={attachment.originalName}
            >
              {attachment.fileType.startsWith("image/") ? (
                <div className="flex aspect-video w-full items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/attachments/${attachment.id}?inline=1`} alt={attachment.originalName} loading="lazy" className="max-h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center p-3 text-sm font-medium text-muted-foreground">
                  {attachment.fileType}
                </div>
              )}
              <div className="truncate border-t border-border px-2 py-1.5 text-meta font-medium text-foreground">
                {attachment.originalName}
              </div>
            </a>
```

(45) Replace

```tsx
  if (checkout.checkoutType === "department" && checkout.departmentId) return labels.departments.get(checkout.departmentId) ?? checkout.departmentId
  if (checkout.checkoutType === "location" && checkout.locationId) return labels.locations.get(checkout.locationId) ?? checkout.locationId
  if (checkout.checkoutType === "asset" && checkout.parentAssetId) return labels.parentAssets.get(checkout.parentAssetId) ?? checkout.parentAssetId
  return "-"
}

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
```

with

```tsx
  if (checkout.checkoutType === "department" && checkout.departmentId) return labels.departments.get(checkout.departmentId) ?? checkout.departmentId
  if (checkout.checkoutType === "location" && checkout.locationId) return labels.locations.get(checkout.locationId) ?? checkout.locationId
  if (checkout.checkoutType === "asset" && checkout.parentAssetId) return labels.parentAssets.get(checkout.parentAssetId) ?? checkout.parentAssetId
  return null
}

// The head of a section that needs an id (it cannot be ContentPanel): the same 16px title and line as ContentPanel's.
function SectionHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-4">
      <h2 className="break-words text-base font-semibold text-foreground">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
```

(46) Replace

```tsx
  snapshot: ReturnType<typeof parseAssetTransactionSnapshot>,
  labels: Map<string, string>,
) {
  if (!snapshot) return "-"
  return `${labelOrDash(labels, snapshot.statusId)} · ${labelOrDash(labels, snapshot.currentLocationId)}`
}

```

with

```tsx
  snapshot: ReturnType<typeof parseAssetTransactionSnapshot>,
  labels: Map<string, string>,
) {
  if (!snapshot) return null
  return `${labelOrDash(labels, snapshot.statusId)} · ${labelOrDash(labels, snapshot.currentLocationId)}`
}

```

(47) Replace

```tsx
        used: licenseUsedSeats.toLocaleString("th-TH"),
        total: licenseTotalSeats.toLocaleString("th-TH"),
        remaining: licenseRemainingSeats?.toLocaleString("th-TH") ?? "0",
```

with

```tsx
        used: formatCount(licenseUsedSeats),
        total: formatCount(licenseTotalSeats),
        remaining: formatCount(licenseRemainingSeats ?? 0),
```

- [ ] **Step 5: The guard rows (R16).** LFG: the timeline's LV2 row (2) and LK1 row (1) go from `BUDGETS` and `KEEP` (with the `KEEP.LK1` key; `BUDGETS.LK1` stays `{}`); the asset page's LV2 row stays 4 with its comment on the new lines; `MovementInfo` joins `LOCAL_KEY_VALUE` and `EvidenceStat` joins `LOCAL_STAT_TILE` (R12).

In `tests/list-frame-guards.test.ts` (CRLF):

(1) Replace

```ts
const BARE_LOCALE_STRING = /\.toLocaleString\(\)/g
const RAW_DASH = /(?:\|\||\?\?|:)\s*"-"/g
const FORMAT_CURRENCY = /(?<!function )\bformatCurrency\(/g
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
```

with

```ts
const BARE_LOCALE_STRING = /\.toLocaleString\(\)/g
const RAW_DASH = /(?:\|\||\?\?|:)\s*"-"/g
const FORMAT_CURRENCY = /(?<!function )\bformatCurrency\(/g
// Plan 2D-3 (D19) added each name below its own tile's last commit: EvidenceStat (the evidence drawer).
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
```

(2) Replace

```ts
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 4, // → 4 (KEEP): translated-sentence arguments :1204, :1206 and the history sentence :2454 (R-n)
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${D}asset-management/labels/page.tsx`]: 4, // → 4 (KEEP): label data (R-n)
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, // → 2 (KEEP): print page (R-n)
```

with

```ts
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 4, // → 4 (KEEP): translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${D}asset-management/labels/page.tsx`]: 4, // → 4 (KEEP): label data (R-n)
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, // → 2 (KEEP): print page (R-n)
```

(3) Replace

```ts
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // → 3 (KEEP): 2D
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // → 2 (KEEP): 2D
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
```

with

```ts
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // → 3 (KEEP): 2D
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
```

(4) Replace

```ts
  LS2: {
  },
  LK1: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-movement-timeline.tsx`]: 1, // → 1 (KEEP): Info :133, not in a 2B plan (2D)
  },
  LN1: {
    // 2B-1
```

with

```ts
  LS2: {
  },
  LK1: {
  },
  LN1: {
    // 2B-1
```

(5) Replace

```ts
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // R-f, 2C plan 4
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1204, :1206 and the history sentence :2454 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
```

with

```ts
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // R-f, 2C plan 4
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
```

(6) Replace

```ts
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // 2D
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // 2D
  },
  LV3: {
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // print page, 2D (A/08:305)
```

with

```ts
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // 2D
  },
  LV3: {
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // print page, 2D (A/08:305)
```

(7) Replace

```ts
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :407 (2C plan 4)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
  LK1: {
    [`${C}assets/asset-movement-timeline.tsx`]: 1, // Info :133, not in a 2B plan (2D)
  },
  LN1: {
    [`${D}master-data/brands/page.tsx`]: 2, // the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
```

with

```ts
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :407 (2C plan 4)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
  LN1: {
    [`${D}master-data/brands/page.tsx`]: 2, // the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
```

- [ ] **Step 6: Check.**
  - Run `node --test tests/asset-detail-anchor-layout.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-ux.test.ts tests/asset-handover-presentation.test.ts tests/asset-operation-status-policy.test.ts tests/asset-photo-gallery.test.ts tests/asset-relationship-map-ui.test.ts tests/asset-return-navigation.test.ts tests/asset-scan-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/asset-transaction-cancellation-ui.test.ts tests/assets-sweep-ui.test.ts tests/audit-item-status-labels.test.ts tests/breadcrumbs-ui.test.ts tests/dead-code-cleanup.test.ts tests/dropdown-menus-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/my-assets-detail.test.ts tests/open-repair-filter.test.ts tests/performance-route-instrumentation.test.ts tests/sheet-drawers-ui.test.ts tests/visual-consistency-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (229 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" src/components/assets/asset-evidence-drawer.tsx src/components/assets/asset-movement-timeline.tsx tests/asset-detail-ux.test.ts tests/asset-relationship-map-ui.test.ts tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`, `src/components/assets/asset-evidence-drawer.tsx`, `src/components/assets/asset-movement-timeline.tsx`, `tests/asset-detail-ux.test.ts`, `tests/asset-relationship-map-ui.test.ts`, `tests/list-frame-guards.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2061 tests, 2060 pass, 1 skipped; 3 new tests), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 7: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" src/components/assets/asset-evidence-drawer.tsx src/components/assets/asset-movement-timeline.tsx tests/asset-detail-ux.test.ts tests/asset-relationship-map-ui.test.ts tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the asset page, its movement timeline and its evidence drawer on the shared parts: panels, Notice, Chip, StatusBadge, ChoiceChip filters, text links, a disabled QuickAction Button (M12) and no typed dash (M32 b) (2D-3 task 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 5b: `src/lib/asset-detail-format.ts` (R13)

After 5a nothing calls `getWarrantyIconClass`, `getWarrantyPanelClass`, `getHealthBadgeClass`, `getActivityToneClass` or the `AssetDetailTone` type. First run `grep -rn "getWarrantyIconClass\|getWarrantyPanelClass\|getHealthBadgeClass\|getActivityToneClass\|AssetDetailTone" src tests`: expected only `src/lib/asset-detail-format.ts` and the pin in `tests/dead-code-cleanup.test.ts`. They go, and the pin checks that all six old helper names are absent.

**Files:**
- Modify: `src/lib/asset-detail-format.ts`
- Modify (pins and unit tests): `tests/dead-code-cleanup.test.ts` (LF)

- [ ] **Step 1: The failing test.** In `tests/dead-code-cleanup.test.ts` (LF):

Replace

```ts
  assert.match(variants, /export const statusMarkerVariants = cva\(/)
})

test("the old panel helpers of the asset detail page are gone (spec 2D M9)", () => {
  for (const name of ["getHealthPanelClass", "getSummaryToneClass"]) assert.equal(name in assetDetailFormat, false, name)
  assert.equal(typeof assetDetailFormat.getHealthBadgeClass, "function", "the badge helper the page uses stays")
})

test("the busy labels nobody reads are gone from the props and the pages (spec 2D M8)", () => {
```

with

```ts
  assert.match(variants, /export const statusMarkerVariants = cva\(/)
})

test("the old panel helpers of the asset detail page are gone (spec 2D M9, D12)", () => {
  // Plan 2D-3 moved their last callers (the data-health badge, the warranty box, the follow-up cards) to StatusBadge and markers.
  for (const name of ["getHealthPanelClass", "getSummaryToneClass", "getHealthBadgeClass", "getActivityToneClass", "getWarrantyPanelClass", "getWarrantyIconClass"]) {
    assert.equal(name in assetDetailFormat, false, name)
  }
})

test("the busy labels nobody reads are gone from the props and the pages (spec 2D M8)", () => {
```

Run: `node --test tests/dead-code-cleanup.test.ts`
Expected: 1 failure:
- "the old panel helpers of the asset detail page are gone (spec 2D M9, D12)"

- [ ] **Step 2: The helpers.** In `src/lib/asset-detail-format.ts` (CRLF):

(1) Replace

```ts
export type AssetDetailTone = "neutral" | "success" | "info" | "warning" | "danger"

export type MovementDetailLike = {
  label: string
  value?: string | null
```

with

```ts
export type MovementDetailLike = {
  label: string
  value?: string | null
```

(2) Replace

```ts
  )
}

export function getWarrantyIconClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "text-success"
  if (tone === "warning") return "text-warning"
  if (tone === "danger") return "text-danger"
  return "text-muted-foreground"
}

export function getWarrantyPanelClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "border-success-border bg-success-soft"
  if (tone === "warning") return "border-warning-border bg-warning-soft"
  if (tone === "danger") return "border-danger-border bg-danger-soft"
  return "border-border bg-background"
}

export function getHealthBadgeClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "bg-success-soft text-success"
  if (tone === "warning") return "bg-warning-soft text-warning"
  return "bg-danger-soft text-danger"
}

export function getActivityToneClass(tone: AssetDetailTone) {
  if (tone === "success") return "border-success-border bg-success-soft"
  if (tone === "info") return "border-info-border bg-info-soft"
  if (tone === "warning") return "border-warning-border bg-warning-soft"
  if (tone === "danger") return "border-danger-border bg-danger-soft"
  return "border-border bg-background"
}

export function formatMovementType(movementType: string) {
  return movementType
    .replaceAll("_", " ")
```

with

```ts
  )
}

export function formatMovementType(movementType: string) {
  return movementType
    .replaceAll("_", " ")
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/asset-detail-format.test.ts tests/dead-code-cleanup.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (82 tests).
  - Run `node <temp>/eol.mjs src/lib/asset-detail-format.ts tests/dead-code-cleanup.test.ts`. Expected: equal numbers for `src/lib/asset-detail-format.ts`; `0 <n>` for `tests/dead-code-cleanup.test.ts` (LF).
  - Run `npm test` (2061 tests, 2060 pass, 1 skipped; no new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/asset-detail-format.ts tests/dead-code-cleanup.test.ts
git commit -m "refactor: delete the tone helpers of asset-detail-format that the asset page no longer calls (2D-3 task 5b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The asset form (`c/assets/asset-form.tsx`)

Spec D7, D9, M21, M33; R1, R4. One commit. Each section is a `ContentPanel`. The clone banner and the license seats are info `Notice`s (the remaining seats `orNil`, `getRemainingLicenseSeats` returns `null` and counts with `formatCount`); the cross-company and cross-branch warnings and the protected status help are warning `Notice`s; "no custodian needed" is neutral; the suggestion line is plain `text-meta`. The purchase documents are `ChoiceCard` checkboxes (the number a `tag`, the supplier `orNil`). The `h4` eyebrows lose their capitals; four empty states are `EmptyNote`; the photo area loses its nested frames.

**Files:**
- Modify: `src/components/assets/asset-form.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (guards): `tests/list-frame-guards.test.ts`

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("asset form: sections are ContentPanels, notes are Notice by meaning, empty lists EmptyNote, documents ChoiceCards with Nil, and no box in a box (spec 2D D7, D9, M21)", () => {
  const source = read(`${C}assets/asset-form.tsx`)
  assert.match(source, /function Section\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<ContentPanel title=\{title\}>/)
  assert.match(source, /<Notice\n\s+tone="info"\n\s+className="mb-5"\n\s+title=\{t\("cloneBannerTitle", \{ assetTag: cloneSource\.assetTag \}\)\}/)
  assert.equal(source.match(/<Notice tone="warning" className="mt-2">/g)?.length, 2, "the cross-company and cross-branch warnings")
  assert.match(source, /<Notice tone="warning" className="mt-2" title=\{t\("protectedStatusEditBlocked"\)\}>/)
  assert.match(source, /: null\n\s+const assetStatusHelp = \{/, "the blocked sentence is the Notice title, so the help is not the same sentence again")
  assert.match(source, /<Notice tone="neutral" title=\{t\("custodianNotRequired"\)\}>\n\s+\{t\("custodianNotRequiredHelp"\)\}\n\s+<\/Notice>/)
  assert.match(source, /title=\{<>\{t\("licenseRemainingSeats"\)\}: \{orNil\(getRemainingLicenseSeats\(values\.licenseTotalSeats, values\.licenseUsedSeats\)\)\}<\/>\}/)
  assert.match(source, /description=\{<>\{orNil\(document\.supplierName\)\} · \{t\("linkedAssets", \{ count: document\.assetCount \}\)\}<\/>\}/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 4)
  assert.match(source, /return null\n\s+const remainingSeats = [^\n]+\n\s+return formatCount\(remainingSeats\)/)
  assert.doesNotMatch(source, /"-"|border-dashed|uppercase|bg-accent|bg-warning-soft|bg-info-soft|text-warning|text-lg|rounded-lg border|focus:outline-none|\btext-xs\b|toLocaleString|bg-surface p-3/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "asset form: sections are ContentPanels, notes are Notice by meaning, empty lists EmptyNote, documents ChoiceCards with Nil, and no box in a box (spec 2D D7, D9, M21)"

- [ ] **Step 2: The form.** In `src/components/assets/asset-form.tsx` (CRLF):

(1) Replace

```tsx
import { useEffect, useId, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { AlertTriangle, Code2, Copy, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceChip } from "@/components/ui/choice-card"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
```

with

```tsx
import { useEffect, useId, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Code2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceCard, ChoiceChip } from "@/components/ui/choice-card"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
```

(2) Replace

```tsx
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
import { assetOwnershipTypes, defaultAssetOwnershipType, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
```

with

```tsx
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
import { assetOwnershipTypes, defaultAssetOwnershipType, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { formatCount } from "@/lib/display-format"
import { optionMatchesOrganizationScope } from "@/lib/organization-option-filter"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
```

(3) Replace

```tsx
  const isProtectedStatusChange = isStatusChanged && (currentStatusIsProtected || selectedStatusIsProtected)
  const isSelectedRepairStatus = selectedStatusName === "pending repair" || selectedStatusName === "under maintenance"
  const repairWorkflowHref = asset?.id ? `/${locale}/maintenance/new?assetId=${encodeURIComponent(asset.id)}` : ""
  const protectedStatusHelp = currentStatusIsProtected
    ? t("protectedStatusCorrectionHelp")
    : isSelectedRepairStatus
      ? t("protectedStatusEditHelp")
      : t("protectedStatusEditBlocked")
  const assetStatusHelp = {
    title: t("statusHelpTitle"),
    description: t("statusHelpDescription"),
```

with

```tsx
  const isProtectedStatusChange = isStatusChanged && (currentStatusIsProtected || selectedStatusIsProtected)
  const isSelectedRepairStatus = selectedStatusName === "pending repair" || selectedStatusName === "under maintenance"
  const repairWorkflowHref = asset?.id ? `/${locale}/maintenance/new?assetId=${encodeURIComponent(asset.id)}` : ""
  // The warning's title already says "protectedStatusEditBlocked", so the plain case adds no second line.
  const protectedStatusHelp = currentStatusIsProtected
    ? t("protectedStatusCorrectionHelp")
    : isSelectedRepairStatus
      ? t("protectedStatusEditHelp")
      : null
  const assetStatusHelp = {
    title: t("statusHelpTitle"),
    description: t("statusHelpDescription"),
```

(4) Replace

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      {cloneSource ? (
        <div className="mb-5 rounded-md border border-warning-border bg-warning-soft px-4 py-3">
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning">
              <Copy className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="break-words text-sm font-semibold text-foreground">
                {t("cloneBannerTitle", { assetTag: cloneSource.assetTag })}
              </div>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {t("cloneBannerDescription", { assetName: cloneSource.name })}
              </p>
              <p className="mt-2 break-words text-xs font-medium text-warning">
                {t("cloneBannerReview")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
```

with

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      {/* Spec 2D D7: where this new asset comes from is information, an inline info Notice (no warning box, no icon tile). */}
      {cloneSource ? (
        <Notice
          tone="info"
          className="mb-5"
          title={t("cloneBannerTitle", { assetTag: cloneSource.assetTag })}
        >
          <p className="break-words">{t("cloneBannerDescription", { assetName: cloneSource.name })}</p>
          <p className="mt-1 break-words">{t("cloneBannerReview")}</p>
        </Notice>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
```

(5) Replace

```tsx
            </Field>
            {suggestedAssetName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent px-2.5 py-1 text-xs text-muted-foreground">
                  {t("suggestedAssetName")}: <span className="font-medium text-foreground">{suggestedAssetName}</span>
                </span>
                {values.name !== suggestedAssetName && (
```

with

```tsx
            </Field>
            {suggestedAssetName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-meta text-muted-foreground">
                  {t("suggestedAssetName")}: <span className="font-medium text-foreground">{suggestedAssetName}</span>
                </span>
                {values.name !== suggestedAssetName && (
```

(6) Replace

```tsx
                emptyLabel={tCommon("searchSelectNoResults")}
                onChange={(value) => setField("custodianId", value)}
              />
              <label className="mt-2 flex min-h-11 items-start gap-2 py-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allowCrossCompanyCustodian}
```

with

```tsx
                emptyLabel={tCommon("searchSelectNoResults")}
                onChange={(value) => setField("custodianId", value)}
              />
              <label className="mt-2 flex min-h-11 items-start gap-2 py-2 text-meta text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allowCrossCompanyCustodian}
```

(7) Replace

```tsx
                </span>
              </label>
              {hasCrossCompanyCustodian ? (
                <p className="mt-2 text-xs font-medium text-warning">{t("crossCompanyCustodianWarning")}</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{t("custodianNotRequired")}</div>
              <p className="mt-1 text-xs">{t("custodianNotRequiredHelp")}</p>
            </div>
          )}
        </Section>

```

with

```tsx
                </span>
              </label>
              {hasCrossCompanyCustodian ? (
                <Notice tone="warning" className="mt-2">{t("crossCompanyCustodianWarning")}</Notice>
              ) : null}
            </div>
          ) : (
            <Notice tone="neutral" title={t("custodianNotRequired")}>
              {t("custodianNotRequiredHelp")}
            </Notice>
          )}
        </Section>

```

(8) Replace

```tsx
                <option key={parentAsset.id} value={parentAsset.id}>{parentAsset.label}</option>
              ))}
            </SelectField>
            <div className="rounded-md border border-info-border bg-info-soft px-3 py-2 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{t("licenseRemainingSeats")}: {getRemainingLicenseSeats(values.licenseTotalSeats, values.licenseUsedSeats)}</div>
              <p className="mt-1 text-xs">{t("licenseManagementHelp")}</p>
            </div>
          </Section>
        )}

        <Section title={t("locationCustodian")}>
          <div className="md:col-span-2">
            <label className="flex min-h-11 items-start gap-2 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossBranchLocation}
```

with

```tsx
                <option key={parentAsset.id} value={parentAsset.id}>{parentAsset.label}</option>
              ))}
            </SelectField>
            <Notice
              tone="info"
              title={<>{t("licenseRemainingSeats")}: {orNil(getRemainingLicenseSeats(values.licenseTotalSeats, values.licenseUsedSeats))}</>}
            >
              {t("licenseManagementHelp")}
            </Notice>
          </Section>
        )}

        <Section title={t("locationCustodian")}>
          <div className="md:col-span-2">
            <label className="flex min-h-11 items-start gap-2 py-2 text-meta text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossBranchLocation}
```

(9) Replace

```tsx
              </span>
            </label>
            {hasCrossBranchLocation ? (
              <p className="mt-2 text-xs font-medium text-warning">{t("crossBranchLocationWarning")}</p>
            ) : null}
          </div>
          <SelectField label={t("homeLocation")} value={values.homeLocationId ?? ""} onChange={(value) => setField("homeLocationId", value)}>
```

with

```tsx
              </span>
            </label>
            {hasCrossBranchLocation ? (
              <Notice tone="warning" className="mt-2">{t("crossBranchLocationWarning")}</Notice>
            ) : null}
          </div>
          <SelectField label={t("homeLocation")} value={values.homeLocationId ?? ""} onChange={(value) => setField("homeLocationId", value)}>
```

(10) Replace

```tsx
              </NativeSelect>
            </Field>
            {isProtectedStatusChange && (
              <div className="mt-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">{t("protectedStatusEditBlocked")}</p>
                    <p className="mt-1 leading-relaxed">{protectedStatusHelp}</p>
                    {isSelectedRepairStatus && repairWorkflowHref && (
                      <Link href={repairWorkflowHref} className={cn(linkVariants({ size: "inherit" }), "mt-2 inline-flex decoration-current")}>
                        {t("openRepairWorkflow")}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Field
```

with

```tsx
              </NativeSelect>
            </Field>
            {isProtectedStatusChange && (
              <Notice tone="warning" className="mt-2" title={t("protectedStatusEditBlocked")}>
                {protectedStatusHelp ? (
                  <>
                    <p>{protectedStatusHelp}</p>
                    {isSelectedRepairStatus && repairWorkflowHref && (
                      <Link href={repairWorkflowHref} className={cn(linkVariants({ size: "inherit" }), "mt-2 inline-flex decoration-current")}>
                        {t("openRepairWorkflow")}
                      </Link>
                    )}
                  </>
                ) : null}
              </Notice>
            )}
          </div>
          <Field
```

(11) Replace

```tsx
              </div>

              <div className="mb-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("existingPurchaseDocuments")}</div>
                {purchaseDocumentOptions.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                    {t("noPurchaseDocuments")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {purchaseDocumentOptions.map((document) => (
                      <label key={document.id} className="flex cursor-pointer gap-3 rounded-md border border-border bg-surface p-3 text-sm transition-colors hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={selectedPurchaseDocumentIds.includes(document.id)}
                          onChange={() => togglePurchaseDocument(document.id)}
                          className={cn(checkboxVariants(), "mt-0.5")}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {t(`purchaseDocumentTypes.${document.documentType}`)} · {document.documentNo}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {document.supplierName || "-"} · {t("linkedAssets", { count: document.assetCount })}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("createPurchaseDocument")}</div>
                <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label={t("documentType")}>
                    <NativeSelect
```

with

```tsx
              </div>

              <div className="mb-4 space-y-2">
                <h4 className="text-meta font-medium text-muted-foreground">{t("existingPurchaseDocuments")}</h4>
                {purchaseDocumentOptions.length === 0 ? (
                  <EmptyNote>{t("noPurchaseDocuments")}</EmptyNote>
                ) : (
                  // Each document is a shared ChoiceCard (spec 2D D9): Enter in it no longer submits the form.
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {purchaseDocumentOptions.map((document) => (
                      <ChoiceCard
                        key={document.id}
                        type="checkbox"
                        checked={selectedPurchaseDocumentIds.includes(document.id)}
                        onChange={() => togglePurchaseDocument(document.id)}
                        label={<>{t(`purchaseDocumentTypes.${document.documentType}`)} · <span className="tag">{document.documentNo}</span></>}
                        description={<>{orNil(document.supplierName)} · {t("linkedAssets", { count: document.assetCount })}</>}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="mb-3 text-meta font-medium text-muted-foreground">{t("createPurchaseDocument")}</h4>
                <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label={t("documentType")}>
                    <NativeSelect
```

(12) Replace

```tsx
                        <div className="truncate text-sm font-medium text-foreground">
                          {t(`purchaseDocumentTypes.${document.documentType}`)} · {document.documentNo} · {document.file.name}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(document.file.size)}</div>
                      </div>
                      <Button
                        variant="danger"
```

with

```tsx
                        <div className="truncate text-sm font-medium text-foreground">
                          {t(`purchaseDocumentTypes.${document.documentType}`)} · {document.documentNo} · {document.file.name}
                        </div>
                        <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(document.file.size)}</div>
                      </div>
                      <Button
                        variant="danger"
```

(13) Replace

```tsx
            <p className="mb-3 text-sm text-muted-foreground">{t("initialAssetPhotosHelp")}</p>

            {selectedPhotoChecklist.length > 0 ? (
              <div className="mb-3 rounded-md border border-border bg-surface p-3">
                <fieldset className="min-w-0" aria-describedby={photoLabelHintId}>
                  <legend className={fieldLabelClasses}>{t("selectPhotoType")}</legend>
                  <p id={photoLabelHintId} className="mt-1 text-meta text-faint-foreground">
```

with

```tsx
            <p className="mb-3 text-sm text-muted-foreground">{t("initialAssetPhotosHelp")}</p>

            {selectedPhotoChecklist.length > 0 ? (
              <div className="mb-3">
                <fieldset className="min-w-0" aria-describedby={photoLabelHintId}>
                  <legend className={fieldLabelClasses}>{t("selectPhotoType")}</legend>
                  <p id={photoLabelHintId} className="mt-1 text-meta text-faint-foreground">
```

(14) Replace

```tsx
                </fieldset>
              </div>
            ) : (
              <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                {values.categoryId ? t("photoChecklistEmptyForCategory") : t("photoChecklistSelectCategory")}
              </p>
            )}

            <FileDropzone
```

with

```tsx
                </fieldset>
              </div>
            ) : (
              <EmptyNote className="mb-3">
                {values.categoryId ? t("photoChecklistEmptyForCategory") : t("photoChecklistSelectCategory")}
              </EmptyNote>
            )}

            <FileDropzone
```

(15) Replace

```tsx
            />

            {existingAssetPhotos.length > 0 && (
              <div className="mt-4 rounded-md border border-border bg-surface p-3">
                <div className="mb-3 text-sm font-semibold text-foreground">{t("existingAssetPhotos")}</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {existingAssetPhotos.map((photo) => (
                    <a
```

with

```tsx
            />

            {existingAssetPhotos.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">{t("existingAssetPhotos")}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {existingAssetPhotos.map((photo) => (
                    <a
```

(16) Replace

```tsx
                      href={`/api/attachments/${photo.id}?inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-input focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div className="flex aspect-video items-center justify-center bg-background p-2">
                        {/* Authenticated attachment URLs render more reliably as browser-native images. */}
```

with

```tsx
                      href={`/api/attachments/${photo.id}?inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex aspect-video items-center justify-center bg-background p-2">
                        {/* Authenticated attachment URLs render more reliably as browser-native images. */}
```

(17) Replace

```tsx
                        />
                      </div>
                      <div className="border-t border-border p-2">
                        <div className="truncate text-xs font-medium text-foreground">{photo.originalName}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(photo.fileSize)}</div>
                      </div>
                    </a>
                  ))}
```

with

```tsx
                        />
                      </div>
                      <div className="border-t border-border p-2">
                        <div className="truncate text-meta font-medium text-foreground">{photo.originalName}</div>
                        <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(photo.fileSize)}</div>
                      </div>
                    </a>
                  ))}
```

(18) Replace

```tsx
                      <div className="truncate text-sm font-medium text-foreground">
                        {photo.label ? `${photo.label} · ` : ""}{photo.file.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(photo.file.size)}</div>
                    </div>
                    <Button
                      variant="danger"
```

with

```tsx
                      <div className="truncate text-sm font-medium text-foreground">
                        {photo.label ? `${photo.label} · ` : ""}{photo.file.name}
                      </div>
                      <div className="mt-0.5 text-meta text-muted-foreground">{formatFileSize(photo.file.size)}</div>
                    </div>
                    <Button
                      variant="danger"
```

(19) Replace

```tsx
                  onChange={handleTemplateCustomFieldChange}
                />
              ) : (
                <div className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                  {values.categoryId ? t("customFieldsNoTemplate") : t("customFieldsSelectCategory")}
                </div>
              )}

              <div className="space-y-3 border-t border-border pt-4">
```

with

```tsx
                  onChange={handleTemplateCustomFieldChange}
                />
              ) : (
                <EmptyNote>{values.categoryId ? t("customFieldsNoTemplate") : t("customFieldsSelectCategory")}</EmptyNote>
              )}

              <div className="space-y-3 border-t border-border pt-4">
```

(20) Replace

```tsx
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <h2 className="mb-4 break-words text-lg font-semibold text-foreground sm:mb-5">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">{children}</div>
    </section>
  )
}

```

with

```tsx
  )
}

// Spec 2D D9: each form section is a ContentPanel (16px title, 16/20px padding), the frame of every other panel.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ContentPanel title={title}>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">{children}</div>
    </ContentPanel>
  )
}

```

(21) Replace

```tsx
function getRemainingLicenseSeats(total?: string | number | null, used?: string | number | null) {
  const totalSeats = Number(total ?? 0)
  const usedSeats = Number(used ?? 0)
  if (!Number.isFinite(totalSeats) || totalSeats <= 0) return "-"
  const remainingSeats = Math.max(totalSeats - (Number.isFinite(usedSeats) ? usedSeats : 0), 0)
  return remainingSeats.toLocaleString("th-TH")
}

function isProtectedAssetWorkflowStatus(status: Option | null | undefined) {
```

with

```tsx
function getRemainingLicenseSeats(total?: string | number | null, used?: string | number | null) {
  const totalSeats = Number(total ?? 0)
  const usedSeats = Number(used ?? 0)
  if (!Number.isFinite(totalSeats) || totalSeats <= 0) return null
  const remainingSeats = Math.max(totalSeats - (Number.isFinite(usedSeats) ? usedSeats : 0), 0)
  return formatCount(remainingSeats)
}

function isProtectedAssetWorkflowStatus(status: Option | null | undefined) {
```

(22) Replace

```tsx
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          {labels.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
```

with

```tsx
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <EmptyNote>{labels.empty}</EmptyNote>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
```

- [ ] **Step 3: The guard rows (R16).** LFG: the file's LV2 row (1) goes from `BUDGETS` and `KEEP`.

In `tests/list-frame-guards.test.ts` (CRLF):

(1) Replace

```ts
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
    [`${C}assets/asset-form.tsx`]: 1, // → 1 (KEEP): 2C form (2D)
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-4
```

with

```ts
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-4
```

(2) Replace

```ts
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
    [`${C}assets/asset-form.tsx`]: 1, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // 2C batch 4 (2D)
```

with

```ts
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // 2C batch 4 (2D)
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-clone-ui.test.ts tests/asset-custodian-scope-ui.test.ts tests/asset-form-sticky-actions.test.ts tests/asset-forms-ui.test.ts tests/asset-model-selection.test.ts tests/asset-operation-status-policy.test.ts tests/asset-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/assets-sweep-ui.test.ts tests/button-size-switch.test.ts tests/choice-controls-ui.test.ts tests/file-evidence-ui.test.ts tests/form-frames-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/sticky-form-footer-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (175 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-form.tsx tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts`. Expected: equal numbers for `src/components/assets/asset-form.tsx`, `tests/list-frame-guards.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2062 tests, 2061 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-form.tsx tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the asset form on ContentPanel sections, Notice by meaning, EmptyNote, ChoiceCard documents and Nil (2D-3 task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The batch form (`c/assets/asset-batch-form.tsx`)

Spec D7, D9, M21, D19; R1, R4, R12. One commit. `ContentPanel` sections; the three tables are `DataTable`s with `framed={false}` (`minWidth` 760, 1100 and 640; the review table keeps its 320px scroll with `className="mt-4 max-h-80 overflow-y-auto"`); `Notice` by meaning (R4); `ChoiceCard` documents; the review's row count is a `KeyValueList` item; six empty values `orNil`; codes `tag`. `SummaryItem` goes (it joins `LOCAL_STAT_TILE` in Task 9, with the import panel's), and the created block is a `ContentPanel`.

**Files:**
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/asset-batch-form-layout.test.ts` (LF), `tests/form-frames-ui.test.ts`
- Modify (guards): `tests/list-frame-guards.test.ts`

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("asset batch form: ContentPanel sections, three DataTables, Notice by meaning, ChoiceCard documents, a KeyValueList review and Nil (spec 2D D7, D9, M21, D19)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assert.match(source, /function Section\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<ContentPanel title=\{title\}>/)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3, "Section, the review and the created batch")
  assert.equal(source.match(/<Notice tone="warning" className="mt-2">/g)?.length, 2)
  assert.match(source, /<Notice tone="warning" className="md:col-span-2">\n\s+\{t\("duplicateWarning"\)\}/)
  assert.match(source, /<Notice\n\s+tone=\{duplicateCheckStatus === "clean" \? "success" : duplicateCheckStatus === "duplicate" \? "warning" : "danger"\}\n\s+className="md:col-span-2"/)
  assert.match(source, /<EmptyNote className="mt-3">\{t\("noPurchaseDocuments"\)\}<\/EmptyNote>/)
  assert.match(source, /<ChoiceCard\n\s+key=\{document\.id\}\n\s+type="checkbox"/)
  assert.match(source, /\{ key: "count", label: t\("batchRows"\), value: formatCount\(rows\.length\) \}/)
  assert.equal(source.match(/<DataTable framed=\{false\}/g)?.length, 3)
  assert.equal(source.match(/\{orNil\(/g)?.length, 6, "the six review cells that can be empty")
  assert.match(source, /<span className="tag font-medium text-foreground">\{asset\.assetTag\}<\/span>/)
  assert.doesNotMatch(source, /function SummaryItem\b|"-"|<table\b|<thead\b|<th\b|<td\b|border-dashed|bg-accent|bg-(?:primary|success|warning|danger)-soft|text-lg|text-warning|\btext-xs\b|rounded-lg border/)
})
```

In `tests/asset-batch-form-layout.test.ts` (LF):

(1) Replace

```ts
  assertOrdered(
    source,
    [
      '<table className="min-w-[760px] w-full text-sm">',
      '<th className="w-56 px-3 py-2">{t("batchAssetTag")}</th>',
      '<th className="w-56 px-3 py-2">{t("batchSerialNumber")}</th>',
      'showRowCustodian ? <th className="w-64 px-3 py-2">{t("batchCustodian")}</th> : null',
      'showRowDepartment ? <th className="w-64 px-3 py-2">{t("batchDepartment")}</th> : null',
      'showRowCurrentLocation ? <th className="w-72 px-3 py-2">{t("batchCurrentLocation")}</th> : null',
      'showRowHomeLocation ? <th className="w-72 px-3 py-2">{t("batchHomeLocation")}</th> : null',
    ],
    "desktop batch row table"
  )
```

with

```ts
  assertOrdered(
    source,
    [
      // Plan 2D-3: both tables are the shared DataTable.
      '<DataTable framed={false} minWidth={760} caption={t("batchRows")} className="hidden md:col-span-2 md:block">',
      '<DataTableHead className="w-56">{t("batchAssetTag")}</DataTableHead>',
      '<DataTableHead className="w-56">{t("batchSerialNumber")}</DataTableHead>',
      'showRowCustodian ? <DataTableHead className="w-64">{t("batchCustodian")}</DataTableHead> : null',
      'showRowDepartment ? <DataTableHead className="w-64">{t("batchDepartment")}</DataTableHead> : null',
      'showRowCurrentLocation ? <DataTableHead className="w-72">{t("batchCurrentLocation")}</DataTableHead> : null',
      'showRowHomeLocation ? <DataTableHead className="w-72">{t("batchHomeLocation")}</DataTableHead> : null',
    ],
    "desktop batch row table"
  )
```

(2) Replace

```ts
  assertOrdered(
    source,
    [
      '<table className="w-full min-w-[1100px] text-sm">',
      '<th className="px-3 py-2">{t("batchAssetTag")}</th>',
      '<th className="px-3 py-2">{t("batchSerialNumber")}</th>',
      '<th className="px-3 py-2">{t("batchCustodian")}</th>',
      '<th className="px-3 py-2">{t("batchDepartment")}</th>',
      '<th className="px-3 py-2">{t("batchCurrentLocation")}</th>',
      '<th className="px-3 py-2">{t("batchHomeLocation")}</th>',
    ],
    "batch review table"
  )
```

with

```ts
  assertOrdered(
    source,
    [
      '<DataTable framed={false} minWidth={1100} caption={t("batchReviewTitle")} className="mt-4 max-h-80 overflow-y-auto">',
      '<DataTableHead>{t("batchAssetTag")}</DataTableHead>',
      '<DataTableHead>{t("batchSerialNumber")}</DataTableHead>',
      '<DataTableHead>{t("batchCustodian")}</DataTableHead>',
      '<DataTableHead>{t("batchDepartment")}</DataTableHead>',
      '<DataTableHead>{t("batchCurrentLocation")}</DataTableHead>',
      '<DataTableHead>{t("batchHomeLocation")}</DataTableHead>',
    ],
    "batch review table"
  )
```

In `tests/form-frames-ui.test.ts` (CRLF):

Replace

```ts
  assert.doesNotMatch(source, /<thead\b|<th\b|function Head\b|\bbg-muted\//)
})

test("the asset batch form: PageHeader and the white table header on its three tables (2B-1 task 24, I13, R-e)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "asset-batch-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-6xl">\n\s+<PageHeader title=\{t\("batchCreateTitle"\)\} meta=\{t\("batchCreateSubtitle"\)\} className="mb-6" \/>\n/)
  assert.equal(source.match(/<thead className="bg-surface text-left text-meta font-medium text-faint-foreground">/g)?.length, 3)
  assert.doesNotMatch(source, /<h1\b|\bbg-muted\/|text-xs font-semibold text-muted-foreground/)
})

test("the depreciation builder formats its preview with the shared th-TH helpers (2B-1 task 24, R-f)", () => {
```

with

```ts
  assert.doesNotMatch(source, /<thead\b|<th\b|function Head\b|\bbg-muted\//)
})

// Plan 2D-3 moved the three hand tables onto the shared DataTable, without a frame of their own inside their panels.
test("the asset batch form: PageHeader and the shared DataTable for its three tables (2B-1 task 24, I13, R-e; plan 2D-3)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "asset-batch-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-6xl">\n\s+<PageHeader title=\{t\("batchCreateTitle"\)\} meta=\{t\("batchCreateSubtitle"\)\} className="mb-6" \/>\n/)
  assert.equal(source.match(/<DataTableHeader>/g)?.length, 3)
  assert.equal(source.match(/<DataTable framed=\{false\}/g)?.length, 3)
  assert.doesNotMatch(source, /<h1\b|<thead\b|<th\b|\bbg-muted\/|text-xs font-semibold text-muted-foreground/)
})

test("the depreciation builder formats its preview with the shared th-TH helpers (2B-1 task 24, R-f)", () => {
```

Run: `node --test tests/asset-batch-form-layout.test.ts tests/assets-sweep-ui.test.ts tests/form-frames-ui.test.ts`
Expected: 3 failures:
- "batch asset rows show legacy asset tag before serial number in edit and review tables"
- "asset batch form: ContentPanel sections, three DataTables, Notice by meaning, ChoiceCard documents, a KeyValueList review and Nil (spec 2D D7, D9, M21, D19)"
- "the asset batch form: PageHeader and the shared DataTable for its three tables (2B-1 task 24, I13, R-e; plan 2D-3)"

- [ ] **Step 2: The form.** In `src/components/assets/asset-batch-form.tsx` (CRLF):

(1) Replace

```tsx
import { toast } from "sonner"
import { AssetForm } from "@/components/assets/asset-form"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-card"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { cn } from "@/lib/utils"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
```

with

```tsx
import { toast } from "sonner"
import { AssetForm } from "@/components/assets/asset-form"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChoiceCard, ChoiceChip } from "@/components/ui/choice-card"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { buildSuggestedAssetName } from "@/lib/asset-name-suggestion"
import { resolveModelIdForScope } from "@/lib/asset-model-selection"
```

(2) Replace

```tsx
            </Field>
            {suggestedAssetName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent px-2.5 py-1 text-xs text-muted-foreground">
                  {t("suggestedAssetName")}: <span className="font-medium text-foreground">{suggestedAssetName}</span>
                </span>
                {common.name !== suggestedAssetName && (
```

with

```tsx
            </Field>
            {suggestedAssetName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-meta text-muted-foreground">
                  {t("suggestedAssetName")}: <span className="font-medium text-foreground">{suggestedAssetName}</span>
                </span>
                {common.name !== suggestedAssetName && (
```

(3) Replace

```tsx
              emptyLabel={tCommon("searchSelectNoResults")}
              onChange={(value) => setCommonField("custodianId", value)}
            />
            <label className="mt-2 flex min-h-11 items-start gap-2 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossCompanyCustodian}
```

with

```tsx
              emptyLabel={tCommon("searchSelectNoResults")}
              onChange={(value) => setCommonField("custodianId", value)}
            />
            <label className="mt-2 flex min-h-11 items-start gap-2 py-2 text-meta text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossCompanyCustodian}
```

(4) Replace

```tsx
              </span>
            </label>
            {hasCrossCompanyCustodian ? (
              <p className="mt-2 text-xs font-medium text-warning">{t("crossCompanyCustodianWarning")}</p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="flex min-h-11 items-start gap-2 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossBranchLocation}
```

with

```tsx
              </span>
            </label>
            {hasCrossCompanyCustodian ? (
              <Notice tone="warning" className="mt-2">{t("crossCompanyCustodianWarning")}</Notice>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="flex min-h-11 items-start gap-2 py-2 text-meta text-muted-foreground">
              <input
                type="checkbox"
                checked={allowCrossBranchLocation}
```

(5) Replace

```tsx
              </span>
            </label>
            {hasCrossBranchLocation ? (
              <p className="mt-2 text-xs font-medium text-warning">{t("crossBranchLocationWarning")}</p>
            ) : null}
          </div>
          <SelectField label={t("currentLocation")} value={common.currentLocationId} required onChange={(value) => setCommonField("currentLocationId", value)}>
```

with

```tsx
              </span>
            </label>
            {hasCrossBranchLocation ? (
              <Notice tone="warning" className="mt-2">{t("crossBranchLocationWarning")}</Notice>
            ) : null}
          </div>
          <SelectField label={t("currentLocation")} value={common.currentLocationId} required onChange={(value) => setCommonField("currentLocationId", value)}>
```

(6) Replace

```tsx
            <Input value={common.remark} onChange={(event) => setCommonField("remark", event.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-foreground">{t("existingPurchaseDocuments")}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t("purchaseDocumentsHelp")}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {purchaseDocuments.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">{t("noPurchaseDocuments")}</div>
              ) : (
                purchaseDocuments.map((document) => (
                  <label key={document.id} className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-sm">
                    <input type="checkbox" checked={selectedPurchaseDocumentIds.includes(document.id)} onChange={() => togglePurchaseDocument(document.id)} className={cn(checkboxVariants(), "mt-0.5")} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{document.documentNo}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{document.supplierName ?? document.documentType} · {t("linkedAssets", { count: document.assetCount })}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </Section>

```

with

```tsx
            <Input value={common.remark} onChange={(event) => setCommonField("remark", event.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-foreground">{t("existingPurchaseDocuments")}</h3>
            <p className="mt-1 text-meta text-muted-foreground">{t("purchaseDocumentsHelp")}</p>
            {purchaseDocuments.length === 0 ? (
              <EmptyNote className="mt-3">{t("noPurchaseDocuments")}</EmptyNote>
            ) : (
              // Each document is a shared ChoiceCard (spec 2D D9), as in the single asset form.
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {purchaseDocuments.map((document) => (
                  <ChoiceCard
                    key={document.id}
                    type="checkbox"
                    checked={selectedPurchaseDocumentIds.includes(document.id)}
                    onChange={() => togglePurchaseDocument(document.id)}
                    label={<span className="tag">{document.documentNo}</span>}
                    description={<>{document.supplierName ?? document.documentType} · {t("linkedAssets", { count: document.assetCount })}</>}
                  />
                ))}
              </div>
            )}
          </div>
        </Section>

```

(7) Replace

```tsx
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("batchRowHelp")}</p>
            </div>
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleAddRow} disabled={rows.length >= 100}>
              <Plus aria-hidden="true" />
```

with

```tsx
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })}</div>
              <p className="mt-1 text-meta text-muted-foreground">{t("batchRowHelp")}</p>
            </div>
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleAddRow} disabled={rows.length >= 100}>
              <Plus aria-hidden="true" />
```

(8) Replace

```tsx
          </div>

          {hasClientDuplicates ? (
            <div className="md:col-span-2 rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-warning">
              {t("duplicateWarning")}
              {duplicateValues.serialNumbers.length > 0 ? ` Serial: ${duplicateValues.serialNumbers.join(", ")}` : ""}
              {duplicateValues.assetTags.length > 0 ? ` Asset Tag: ${duplicateValues.assetTags.join(", ")}` : ""}
            </div>
          ) : null}

          {duplicateCheckMessage ? (
            <div
              className={`md:col-span-2 rounded-md border p-3 text-sm ${
                duplicateCheckStatus === "clean"
                  ? "border-success-border bg-success-soft text-success"
                  : duplicateCheckStatus === "duplicate"
                    ? "border-warning-border bg-warning-soft text-warning"
                    : "border-danger-border bg-danger-soft text-danger"
              }`}
            >
              {duplicateCheckStatus === "error" ? <ApiErrorText error={duplicateCheckMessage} /> : duplicateCheckMessage}
            </div>
          ) : null}

          <div className="grid gap-3 md:hidden">
```

with

```tsx
          </div>

          {hasClientDuplicates ? (
            <Notice tone="warning" className="md:col-span-2">
              {t("duplicateWarning")}
              {duplicateValues.serialNumbers.length > 0 ? ` Serial: ${duplicateValues.serialNumbers.join(", ")}` : ""}
              {duplicateValues.assetTags.length > 0 ? ` Asset Tag: ${duplicateValues.assetTags.join(", ")}` : ""}
            </Notice>
          ) : null}

          {/* Spec 2D D7: the check result by meaning. A toast already announces it, so the Notice takes no live role. */}
          {duplicateCheckMessage ? (
            <Notice
              tone={duplicateCheckStatus === "clean" ? "success" : duplicateCheckStatus === "duplicate" ? "warning" : "danger"}
              className="md:col-span-2"
            >
              {duplicateCheckStatus === "error" ? <ApiErrorText error={duplicateCheckMessage} /> : duplicateCheckMessage}
            </Notice>
          ) : null}

          <div className="grid gap-3 md:hidden">
```

(9) Replace

```tsx
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-md border border-border md:col-span-2 md:block">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-surface text-left text-meta font-medium text-faint-foreground">
                <tr>
                  <th className="w-16 px-3 py-2">{t("batchRowNo")}</th>
                  <th className="w-56 px-3 py-2">{t("batchAssetTag")}</th>
                  <th className="w-56 px-3 py-2">{t("batchSerialNumber")}</th>
                  {showRowCustodian ? <th className="w-64 px-3 py-2">{t("batchCustodian")}</th> : null}
                  {showRowDepartment ? <th className="w-64 px-3 py-2">{t("batchDepartment")}</th> : null}
                  {showRowCurrentLocation ? <th className="w-72 px-3 py-2">{t("batchCurrentLocation")}</th> : null}
                  {showRowHomeLocation ? <th className="w-72 px-3 py-2">{t("batchHomeLocation")}</th> : null}
                  {showRowRemark ? <th className="w-64 px-3 py-2">{t("batchRemark")}</th> : null}
                  <th className="w-16 px-3 py-2 text-right">
                    <span className="sr-only">{t("batchRowActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.clientId} className="border-t border-border align-top">
                    <td className="px-3 py-3 font-medium text-foreground">{index + 1}</td>
                    <td className="px-3 py-3">
                      <Field label={t("batchAssetTag")} hideLabel hint={t("batchAssetTagHelp")}>
                        <Input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} />
                      </Field>
                    </td>
                    <td className="px-3 py-3">
                      <Field label={t("batchSerialNumber")} hideLabel hint={t("batchPasteSerialHint")}>
                        <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} onPaste={(event) => handleSerialPaste(row.clientId, event)} labels={scannerLabels} maxLength={100} />
                      </Field>
                    </td>
                    {showRowCustodian ? (
                      <td className="px-3 py-3">
                        <SearchableSelect label="" value={row.custodianId} options={getRowEmployeeOptions(row)} placeholder={t("batchUseSharedCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
                      </td>
                    ) : null}
                    {showRowDepartment ? (
                      <td className="px-3 py-3">
                        <SearchableSelect label="" value={row.departmentId} options={filteredDepartments} placeholder={t("batchUseSharedDepartment")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "departmentId", value)} />
                      </td>
                    ) : null}
                    {showRowCurrentLocation ? (
                      <td className="px-3 py-3">
                        <SearchableSelect label="" value={row.currentLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedCurrentLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "currentLocationId", value)} />
                      </td>
                    ) : null}
                    {showRowHomeLocation ? (
                      <td className="px-3 py-3">
                        <SearchableSelect label="" value={row.homeLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedHomeLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "homeLocationId", value)} />
                      </td>
                    ) : null}
                    {showRowRemark ? (
                      <td className="px-3 py-3">
                        <Field label={t("batchRemark")} hideLabel>
                          <Input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} placeholder={t("batchUseSharedRemark")} />
                        </Field>
                      </td>
                    ) : null}
                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="outline"
                        size="icon-lg"
                        onClick={() => handleRemoveRow(row.clientId)}
                        disabled={rows.length <= 2}
                        title={t("batchRemoveRow")}
                      >
                        <Trash2 aria-hidden="true" />
                        <span className="sr-only">{t("batchRemoveRow")}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {reviewing ? (
          <section className="rounded-lg border border-primary-border bg-primary-soft p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{t("batchReviewTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("batchReviewDescription")}</p>
              </div>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setReviewing(false)}>
                {t("batchReviewBack")}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <SummaryItem label={t("batchReviewSharedLocation")} value={locations.find((location) => location.id === common.currentLocationId)?.label ?? "-"} />
              <SummaryItem label={t("batchReviewSharedFixedAssetCode")} value={common.fixedAssetCode || "-"} />
              <SummaryItem label={t("batchCurrentCount", { count: rows.length })} value={String(rows.length)} />
            </div>
            <div className="mt-4 max-h-80 max-w-full overflow-auto rounded-md border border-border bg-background">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-surface text-left text-meta font-medium text-faint-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("batchRowNo")}</th>
                    <th className="px-3 py-2">{t("batchAssetTag")}</th>
                    <th className="px-3 py-2">{t("batchSerialNumber")}</th>
                    <th className="px-3 py-2">{t("batchCustodian")}</th>
                    <th className="px-3 py-2">{t("batchDepartment")}</th>
                    <th className="px-3 py-2">{t("batchCurrentLocation")}</th>
                    <th className="px-3 py-2">{t("batchHomeLocation")}</th>
                    <th className="px-3 py-2">{t("batchRemark")}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.rowNo} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{row.rowNo}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground">{row.assetTag || t("batchReviewAutoAssetTag")}</span>
                        {row.assetTagSource === "manual" ? <span className="ml-2 text-xs text-muted-foreground">{t("batchReviewManualAssetTag")}</span> : null}
                      </td>
                      <td className="px-3 py-2">{row.serialNumber || "-"}</td>
                      <td className="px-3 py-2">{employees.find((employee) => employee.id === (row.custodianId || common.custodianId))?.label ?? "-"}</td>
                      <td className="px-3 py-2">{departments.find((department) => department.id === (row.departmentId || common.departmentId))?.label ?? "-"}</td>
                      <td className="px-3 py-2">{locations.find((location) => location.id === (row.currentLocationId || common.currentLocationId))?.label ?? "-"}</td>
                      <td className="px-3 py-2">{locations.find((location) => location.id === (row.homeLocationId || common.homeLocationId))?.label ?? "-"}</td>
                      <td className="px-3 py-2">{row.remark || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {createdBatch ? (
          <div className="rounded-md border border-success-border bg-success-soft p-4">
            <h2 className="text-lg font-semibold text-foreground">{t("batchCreatedTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("batchCreatedDescription", { count: createdBatch.created })}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={`/${locale}/assets`} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
                {t("batchGoToRegister")}
              </Link>
```

with

```tsx
            ))}
          </div>

          {/* Spec 2D D9: the shared table without a frame of its own inside the section panel; rows are plain (no hover fill on fields). */}
          <DataTable framed={false} minWidth={760} caption={t("batchRows")} className="hidden md:col-span-2 md:block">
            <DataTableHeader>
              <tr>
                <DataTableHead className="w-16">{t("batchRowNo")}</DataTableHead>
                <DataTableHead className="w-56">{t("batchAssetTag")}</DataTableHead>
                <DataTableHead className="w-56">{t("batchSerialNumber")}</DataTableHead>
                {showRowCustodian ? <DataTableHead className="w-64">{t("batchCustodian")}</DataTableHead> : null}
                {showRowDepartment ? <DataTableHead className="w-64">{t("batchDepartment")}</DataTableHead> : null}
                {showRowCurrentLocation ? <DataTableHead className="w-72">{t("batchCurrentLocation")}</DataTableHead> : null}
                {showRowHomeLocation ? <DataTableHead className="w-72">{t("batchHomeLocation")}</DataTableHead> : null}
                {showRowRemark ? <DataTableHead className="w-64">{t("batchRemark")}</DataTableHead> : null}
                <DataTableHead align="right" hideLabel className="w-16">{t("batchRowActions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {rows.map((row, index) => (
                <tr key={row.clientId}>
                  <DataTableCell className="num font-medium text-foreground">{index + 1}</DataTableCell>
                  <DataTableCell>
                    <Field label={t("batchAssetTag")} hideLabel hint={t("batchAssetTagHelp")}>
                      <Input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} />
                    </Field>
                  </DataTableCell>
                  <DataTableCell>
                    <Field label={t("batchSerialNumber")} hideLabel hint={t("batchPasteSerialHint")}>
                      <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} onPaste={(event) => handleSerialPaste(row.clientId, event)} labels={scannerLabels} maxLength={100} />
                    </Field>
                  </DataTableCell>
                  {showRowCustodian ? (
                    <DataTableCell>
                      <SearchableSelect label="" value={row.custodianId} options={getRowEmployeeOptions(row)} placeholder={t("batchUseSharedCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
                    </DataTableCell>
                  ) : null}
                  {showRowDepartment ? (
                    <DataTableCell>
                      <SearchableSelect label="" value={row.departmentId} options={filteredDepartments} placeholder={t("batchUseSharedDepartment")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "departmentId", value)} />
                    </DataTableCell>
                  ) : null}
                  {showRowCurrentLocation ? (
                    <DataTableCell>
                      <SearchableSelect label="" value={row.currentLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedCurrentLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "currentLocationId", value)} />
                    </DataTableCell>
                  ) : null}
                  {showRowHomeLocation ? (
                    <DataTableCell>
                      <SearchableSelect label="" value={row.homeLocationId} options={rowLocationOptions} placeholder={t("batchUseSharedHomeLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "homeLocationId", value)} />
                    </DataTableCell>
                  ) : null}
                  {showRowRemark ? (
                    <DataTableCell>
                      <Field label={t("batchRemark")} hideLabel>
                        <Input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} placeholder={t("batchUseSharedRemark")} />
                      </Field>
                    </DataTableCell>
                  ) : null}
                  <DataTableCell align="right">
                    <Button
                      variant="outline"
                      size="icon-lg"
                      onClick={() => handleRemoveRow(row.clientId)}
                      disabled={rows.length <= 2}
                      title={t("batchRemoveRow")}
                    >
                      <Trash2 aria-hidden="true" />
                      <span className="sr-only">{t("batchRemoveRow")}</span>
                    </Button>
                  </DataTableCell>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        </Section>

        {/* Spec 2D D9: the review and the result are ContentPanels; no primary or success tint (color only where it means something). */}
        {reviewing ? (
          <ContentPanel
            title={t("batchReviewTitle")}
            description={t("batchReviewDescription")}
            actions={
              <Button variant="outline" size="md" className="w-full sm:w-auto" onClick={() => setReviewing(false)}>
                {t("batchReviewBack")}
              </Button>
            }
          >
            <KeyValueList
              items={[
                { key: "location", label: t("batchReviewSharedLocation"), value: locations.find((location) => location.id === common.currentLocationId)?.label },
                { key: "fixedAssetCode", label: t("batchReviewSharedFixedAssetCode"), value: common.fixedAssetCode },
                { key: "count", label: t("batchRows"), value: formatCount(rows.length) },
              ]}
            />
            {/* The review keeps its 320px height cap: the outer frame scrolls down, the table scrolls sideways. */}
            <DataTable framed={false} minWidth={1100} caption={t("batchReviewTitle")} className="mt-4 max-h-80 overflow-y-auto">
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("batchRowNo")}</DataTableHead>
                  <DataTableHead>{t("batchAssetTag")}</DataTableHead>
                  <DataTableHead>{t("batchSerialNumber")}</DataTableHead>
                  <DataTableHead>{t("batchCustodian")}</DataTableHead>
                  <DataTableHead>{t("batchDepartment")}</DataTableHead>
                  <DataTableHead>{t("batchCurrentLocation")}</DataTableHead>
                  <DataTableHead>{t("batchHomeLocation")}</DataTableHead>
                  <DataTableHead>{t("batchRemark")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {previewRows.map((row) => (
                  <tr key={row.rowNo}>
                    <DataTableCell className="num font-medium">{row.rowNo}</DataTableCell>
                    <DataTableCell>
                      {row.assetTag ? (
                        <span className="tag font-medium text-foreground">{row.assetTag}</span>
                      ) : (
                        <span className="font-medium text-foreground">{t("batchReviewAutoAssetTag")}</span>
                      )}
                      {row.assetTagSource === "manual" ? <span className="ml-2 text-meta text-muted-foreground">{t("batchReviewManualAssetTag")}</span> : null}
                    </DataTableCell>
                    <DataTableCell>{orNil(row.serialNumber)}</DataTableCell>
                    <DataTableCell>{orNil(employees.find((employee) => employee.id === (row.custodianId || common.custodianId))?.label)}</DataTableCell>
                    <DataTableCell>{orNil(departments.find((department) => department.id === (row.departmentId || common.departmentId))?.label)}</DataTableCell>
                    <DataTableCell>{orNil(locations.find((location) => location.id === (row.currentLocationId || common.currentLocationId))?.label)}</DataTableCell>
                    <DataTableCell>{orNil(locations.find((location) => location.id === (row.homeLocationId || common.homeLocationId))?.label)}</DataTableCell>
                    <DataTableCell>{orNil(row.remark)}</DataTableCell>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          </ContentPanel>
        ) : null}

        {createdBatch ? (
          <ContentPanel title={t("batchCreatedTitle")} description={t("batchCreatedDescription", { count: createdBatch.created })}>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={`/${locale}/assets`} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
                {t("batchGoToRegister")}
              </Link>
```

(10) Replace

```tsx
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground">{t("batchReceiptAssets")}</h3>
              <div className="mt-2 overflow-auto rounded-md border border-border bg-background">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-surface text-left text-meta font-medium text-faint-foreground">
                    <tr>
                      <th className="px-3 py-2">{t("assetTag")}</th>
                      <th className="px-3 py-2">{t("assetName")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createdBatch.assets.map((asset) => (
                      <tr key={asset.id} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground">{asset.assetTag}</td>
                        <td className="px-3 py-2 text-muted-foreground">{asset.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
```

with

```tsx
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground">{t("batchReceiptAssets")}</h3>
              <DataTable framed={false} minWidth={640} caption={t("batchReceiptAssets")} className="mt-2">
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("assetTag")}</DataTableHead>
                    <DataTableHead>{t("assetName")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {createdBatch.assets.map((asset) => (
                    <tr key={asset.id}>
                      <DataTableCell>
                        <span className="tag font-medium text-foreground">{asset.assetTag}</span>
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">{asset.name}</DataTableCell>
                    </tr>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          </ContentPanel>
        ) : null}

        <div className="flex justify-end">
```

(11) Replace

```tsx
  return Boolean(result && "ok" in result && typeof result.ok === "boolean")
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h2 className="mb-4 break-words text-lg font-semibold text-foreground">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

```

with

```tsx
  return Boolean(result && "ok" in result && typeof result.ok === "boolean")
}

// Spec 2D D9: each form section is a ContentPanel, as in the single asset form.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ContentPanel title={title}>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </ContentPanel>
  )
}

```

- [ ] **Step 3: The guard rows (R16).** LFG: the file's LV2 row (8) goes from `BUDGETS` and `KEEP`.

In `tests/list-frame-guards.test.ts` (CRLF):

(1) Replace

```ts
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
```

with

```ts
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
```

(2) Replace

```ts
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
```

with

```ts
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-batch-form-layout.test.ts tests/asset-custodian-scope-ui.test.ts tests/asset-forms-ui.test.ts tests/asset-model-selection.test.ts tests/assets-sweep-ui.test.ts tests/button-size-switch.test.ts tests/choice-controls-ui.test.ts tests/form-frames-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (132 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-batch-form.tsx tests/asset-batch-form-layout.test.ts tests/assets-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts`. Expected: equal numbers for `src/components/assets/asset-batch-form.tsx`, `tests/form-frames-ui.test.ts`, `tests/list-frame-guards.test.ts`; `0 <n>` for `tests/asset-batch-form-layout.test.ts`, `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2063 tests, 2062 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-batch-form.tsx tests/asset-batch-form-layout.test.ts tests/assets-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the asset batch form on ContentPanel, DataTable, Notice, ChoiceCard, KeyValueList and Nil (2D-3 task 7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The component manager (`c/assets/asset-component-manager.tsx`)

Spec D7, D9, M21, M33, D19; R4, R5, R12. One commit. Three `ContentPanel`s; "saved" is a success `Notice` with its action; four `EmptyNote`s; the review is a quiet grouping with a `KeyValueList` (the install date `formatDateTime` or `null`); the candidate rows stay raw buttons (R5) with `hover:bg-row-hover` and the code as `tag font-medium`; the selected component is a quiet grouping; the component rows' links are `linkVariants` with `text-sm`. `ReviewItem` goes.

**Files:**
- Modify: `src/components/assets/asset-component-manager.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (guards): `tests/form-migration-guards.test.ts`, `tests/list-frame-guards.test.ts`

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("component manager: ContentPanels, a success Notice, EmptyNote, a KeyValueList review, codes as tag and text links (spec 2D D7, D9, M21, M33, D19)", () => {
  const source = read(`${C}assets/asset-component-manager.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3)
  assert.match(source, /<ContentPanel title=\{labels\.scanOrSearch\} description=\{labels\.candidateHelp\}>/)
  assert.match(source, /<Notice\n\s+tone="success"\n\s+action=\{/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 4)
  assert.match(source, /\{ key: "installedAt", label: labels\.installedAt, value: installedAt \? formatDateTime\(installedAt\) : null \}/)
  assert.equal(source.match(/<span className="tag font-medium">/g)?.length, 3, "the candidate, the selected component and the component row")
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-sm md:min-h-0"\)\}/)
  assert.doesNotMatch(source, /function ReviewItem\b|"-"|font-mono|uppercase|border-dashed|bg-(?:success|primary)-soft p|border-(?:success|primary)-border|hover:bg-accent|hover:underline|\btext-xs\b|rounded-lg border/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "component manager: ContentPanels, a success Notice, EmptyNote, a KeyValueList review, codes as tag and text links (spec 2D D7, D9, M21, M33, D19)"

- [ ] **Step 2: The manager.** In `src/components/assets/asset-component-manager.tsx` (CRLF):

(1) Replace

```tsx
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, PackageCheck, PackagePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { Steps } from "@/components/ui/steps"
import { Textarea } from "@/components/ui/textarea"
import { getLinearStepStates } from "@/lib/step-states"
import { formatDateTime } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

type AssetOption = {
```

with

```tsx
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, PackageCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { Steps } from "@/components/ui/steps"
import { Textarea } from "@/components/ui/textarea"
import { getLinearStepStates } from "@/lib/step-states"
import { cn, formatDateTime } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

type AssetOption = {
```

(2) Replace

```tsx
      />

      {canEdit ? (
        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <PackagePlus className="h-5 w-5 text-primary" />
              {labels.scanOrSearch}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.candidateHelp}</p>
          </div>

          <Steps className="mb-4" label={labels.steps.label} steps={installSteps} />

          {installStep === "identify" ? (
            <div className="space-y-3">
              {lastInstalledAssetTag ? (
                <div className="flex flex-col gap-3 rounded-md border border-success-border bg-success-soft p-3 text-sm text-success sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="break-words">{labels.installSuccess}: {lastInstalledAssetTag}</span>
                  </span>
                  <Button variant="outline" size="md" className="shrink-0" onClick={() => setLastInstalledAssetTag(null)}>
                    {labels.addAnother}
                  </Button>
                </div>
              ) : null}
              <ScannerTextInput
                value={componentSearch}
```

with

```tsx
      />

      {canEdit ? (
        <ContentPanel title={labels.scanOrSearch} description={labels.candidateHelp}>
          <Steps className="mb-4" label={labels.steps.label} steps={installSteps} />

          {installStep === "identify" ? (
            <div className="space-y-3">
              {/* Spec 2D D7: a finished install is an inline success Notice; the toast already announced it, so no live role. */}
              {lastInstalledAssetTag ? (
                <Notice
                  tone="success"
                  action={
                    <Button variant="outline" size="md" onClick={() => setLastInstalledAssetTag(null)}>
                      {labels.addAnother}
                    </Button>
                  }
                >
                  {labels.installSuccess}: <span className="tag">{lastInstalledAssetTag}</span>
                </Notice>
              ) : null}
              <ScannerTextInput
                value={componentSearch}
```

(3) Replace

```tsx
                  onSelect={selectComponent}
                />
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.candidateHelp}</p>
              )}
            </div>
          ) : null}
```

with

```tsx
                  onSelect={selectComponent}
                />
              ) : (
                <EmptyNote>{labels.candidateHelp}</EmptyNote>
              )}
            </div>
          ) : null}
```

(4) Replace

```tsx

          {installStep === "review" && selectedComponent ? (
            <div className="space-y-4">
              <div className="rounded-md border border-primary-border bg-primary-soft p-4">
                <h3 className="text-sm font-semibold text-foreground">{labels.reviewTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{labels.reviewHelp}</p>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <ReviewItem label={labels.title} value={`${parentAsset.assetTag} - ${parentAsset.name}`} />
                  <ReviewItem label={labels.selected} value={`${selectedComponent.assetTag} - ${selectedComponent.name}`} />
                  <ReviewItem label={labels.componentRole} value={componentRole} />
                  <ReviewItem label={labels.slot} value={slotNo || "-"} />
                  <ReviewItem label={labels.installedAt} value={installedAt || "-"} />
                  <ReviewItem label={labels.reason} value={reason || "-"} />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" disabled={saving} onClick={() => setInstallStep("details")}>
```

with

```tsx

          {installStep === "review" && selectedComponent ? (
            <div className="space-y-4">
              {/* A quiet grouping with the shared label and value list (spec 2D D19): no tint, empty values are Nil. */}
              <div className="rounded-md border border-border bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">{labels.reviewTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{labels.reviewHelp}</p>
                <KeyValueList
                  className="mt-4"
                  items={[
                    { key: "parent", label: labels.title, value: <><span className="tag">{parentAsset.assetTag}</span> - {parentAsset.name}</> },
                    { key: "component", label: labels.selected, value: <><span className="tag">{selectedComponent.assetTag}</span> - {selectedComponent.name}</> },
                    { key: "role", label: labels.componentRole, value: componentRole },
                    { key: "slot", label: labels.slot, value: slotNo },
                    { key: "installedAt", label: labels.installedAt, value: installedAt ? formatDateTime(installedAt) : null },
                    { key: "reason", label: labels.reason, value: reason },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" disabled={saving} onClick={() => setInstallStep("details")}>
```

(5) Replace

```tsx
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">{labels.current}</h2>
        {currentComponents.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noCurrent}</p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {currentComponents.map((component) => (
              <ComponentRow key={component.id} locale={locale} component={component} labels={labels} onRemove={canEdit ? () => setRemoveTarget(component) : undefined} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">{labels.history}</h2>
        {componentHistory.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noHistory}</p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {visibleHistory.map((component) => <ComponentRow key={component.id} locale={locale} component={component} labels={labels} />)}
          </div>
        )}
```

with

```tsx
              </div>
            </div>
          ) : null}
        </ContentPanel>
      ) : null}

      <ContentPanel title={labels.current}>
        {currentComponents.length === 0 ? (
          <EmptyNote>{labels.noCurrent}</EmptyNote>
        ) : (
          <div className="divide-y divide-border-soft rounded-md border border-border">
            {currentComponents.map((component) => (
              <ComponentRow key={component.id} locale={locale} component={component} labels={labels} onRemove={canEdit ? () => setRemoveTarget(component) : undefined} />
            ))}
          </div>
        )}
      </ContentPanel>

      <ContentPanel title={labels.history}>
        {componentHistory.length === 0 ? (
          <EmptyNote>{labels.noHistory}</EmptyNote>
        ) : (
          <div className="divide-y divide-border-soft rounded-md border border-border">
            {visibleHistory.map((component) => <ComponentRow key={component.id} locale={locale} component={component} labels={labels} />)}
          </div>
        )}
```

(6) Replace

```tsx
            {labels.loadMore}
          </Button>
        ) : null}
      </section>

      <ComponentRemovalDialog
        key={removeTarget?.id ?? "closed"}
```

with

```tsx
            {labels.loadMore}
          </Button>
        ) : null}
      </ContentPanel>

      <ComponentRemovalDialog
        key={removeTarget?.id ?? "closed"}
```

(7) Replace

```tsx
  labels: ManagerLabels
  onSelect: (candidate: AssetOption) => void
}) {
  if (searching) {
    return <p className="flex items-center gap-2 rounded-md border border-border px-3 py-4 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />{labels.searching}</p>
  }

  if (candidates.length === 0) {
    return <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{labels.noCandidates}</p>
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {candidates.map((candidate) => (
        <button
          key={candidate.id}
          type="button"
          onClick={() => onSelect(candidate)}
          aria-pressed={selectedId === candidate.id}
          className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-accent ${selectedId === candidate.id ? "bg-primary-soft" : ""}`}
        >
          <span className="min-w-0">
            <span className="block break-words font-mono text-sm font-semibold text-foreground">{candidate.assetTag}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{candidate.name}</span>
          </span>
          {candidate.serialNumber ? <span className="shrink-0 text-xs text-muted-foreground">SN: {candidate.serialNumber}</span> : null}
        </button>
      ))}
    </div>
```

with

```tsx
  labels: ManagerLabels
  onSelect: (candidate: AssetOption) => void
}) {
  // The searching line keeps its spinner (an I27 status line, FMG LOADER2); it is a line of the panel, not a box.
  if (searching) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />{labels.searching}</p>
  }

  if (candidates.length === 0) {
    return <EmptyNote>{labels.noCandidates}</EmptyNote>
  }

  // The candidate rows stay raw buttons: a pressed list option with two lines, which Button cannot hold (plan 2D-3 R5).
  return (
    <div className="divide-y divide-border-soft rounded-md border border-border">
      {candidates.map((candidate) => (
        <button
          key={candidate.id}
          type="button"
          onClick={() => onSelect(candidate)}
          aria-pressed={selectedId === candidate.id}
          className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-row-hover ${selectedId === candidate.id ? "bg-primary-soft" : ""}`}
        >
          <span className="min-w-0">
            <span className="block text-sm text-foreground">
              <span className="tag font-medium">{candidate.assetTag}</span>
            </span>
            <span className="mt-0.5 block truncate text-meta text-muted-foreground">{candidate.name}</span>
          </span>
          {candidate.serialNumber ? <span className="shrink-0 text-meta text-muted-foreground">SN: {candidate.serialNumber}</span> : null}
        </button>
      ))}
    </div>
```

(8) Replace

```tsx

function SelectedComponent({ component, label, serialLabel }: { component: AssetOption; label: string; serialLabel: string }) {
  return (
    <div className="rounded-md border border-success-border bg-success-soft p-3">
      <div className="text-xs font-semibold uppercase tracking-normal text-success">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{component.assetTag}</div>
      <div className="mt-1 text-sm text-muted-foreground">{component.name}</div>
      {component.serialNumber ? <div className="mt-1 text-xs text-muted-foreground">{serialLabel}: {component.serialNumber}</div> : null}
    </div>
  )
}
```

with

```tsx

function SelectedComponent({ component, label, serialLabel }: { component: AssetOption; label: string; serialLabel: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-meta font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">
        <span className="tag font-medium">{component.assetTag}</span>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{component.name}</div>
      {component.serialNumber ? <div className="mt-1 text-meta text-muted-foreground">{serialLabel}: {component.serialNumber}</div> : null}
    </div>
  )
}
```

(9) Replace

```tsx
  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/${locale}/assets/${component.componentAsset.id}`} className="break-words font-mono text-sm font-semibold text-primary hover:underline">
          {component.componentAsset.assetTag}
        </Link>
        <div className="mt-1 text-sm text-foreground">{component.componentAsset.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {component.componentRole}{component.slotNo ? ` · ${component.slotNo}` : ""} · {formatDateTime(component.installedAt)}
          {component.evidenceCount > 0 ? ` · ${labels.evidence}: ${component.evidenceCount}` : ""}
        </div>
```

with

```tsx
  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/${locale}/assets/${component.componentAsset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm md:min-h-0")}>
          <span className="tag font-medium">{component.componentAsset.assetTag}</span>
        </Link>
        <div className="mt-1 text-sm text-foreground">{component.componentAsset.name}</div>
        <div className="mt-1 text-meta text-muted-foreground">
          {component.componentRole}{component.slotNo ? ` · ${component.slotNo}` : ""} · {formatDateTime(component.installedAt)}
          {component.evidenceCount > 0 ? ` · ${labels.evidence}: ${component.evidenceCount}` : ""}
        </div>
```

(10) Replace

```tsx
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 break-words font-medium text-foreground">{value}</div></div>
}

function ComponentRemovalDialog({
  component,
  busy,
```

with

```tsx
  )
}

function ComponentRemovalDialog({
  component,
  busy,
```

- [ ] **Step 3: The guard rows (R16).** LFG: the file's LV2 row (3) goes and `ReviewItem` joins `LOCAL_KEY_VALUE`. FMG: only the line number in the `LOADER2` comment changes.

In `tests/form-migration-guards.test.ts` (CRLF):

Replace

```ts
  [`${C}audit/audit-scan-check-form.tsx`]: 1, // components header toggle :247 (§6.14)
  // 1g
  // 1e
  [`${C}assets/asset-component-manager.tsx`]: 1, // → 1: the status line :449
  // 1f
  // 2
  // 3
```

with

```ts
  [`${C}audit/audit-scan-check-form.tsx`]: 1, // components header toggle :247 (§6.14)
  // 1g
  // 1e
  [`${C}assets/asset-component-manager.tsx`]: 1, // → 1: the status line :451
  // 1f
  // 2
  // 3
```

In `tests/list-frame-guards.test.ts` (CRLF):

(1) Replace

```ts
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
```

with

```ts
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
```

(2) Replace

```ts
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-4
```

with

```ts
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-4
```

(3) Replace

```ts
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // 2C batch 4 (2D)
```

with

```ts
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // 2C batch 4 (2D)
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-component-manager.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/choice-controls-ui.test.ts tests/confirm-text-dialog-ui.test.ts tests/dead-code-cleanup.test.ts tests/form-frames-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/steps-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (150 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-component-manager.tsx tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: equal numbers for `src/components/assets/asset-component-manager.tsx`, `tests/form-migration-guards.test.ts`, `tests/list-frame-guards.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2064 tests, 2063 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-component-manager.tsx tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the component manager on ContentPanel, Notice, EmptyNote, a KeyValueList review, tag and text links (2D-3 task 8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The import panel (`c/assets/asset-import-preview-panel.tsx`, M15)

Spec D7, D9, M15; R1, R3, R4, R10, R12. One commit. A new `getAssetImportBatchStatusTone` in `src/lib/asset-import-batch.ts` (LF) gives the batch badge its tone, for this panel and Task 10's history. The panel: a `ContentPanel`, the column mappings as `Chip`s, the batch state a `StatusBadge`, the batch facts a `KeyValueList` (the batch id `break-all font-mono`, R1), the counts a `StatStrip`, the issues a warning `Notice` with a list, the result a success `Notice` (`role="status"`) and the error a danger one (`role="alert"`), the preview table a `DataTable` (`framed={false}`, a caption, its 320px scroll), `Nil`/`orNil` and `formatCount` for every value. `SummaryPill` and `SummaryItem` go.

**Files:**
- Modify: `src/lib/asset-import-batch.ts` (LF), `src/components/assets/asset-import-preview-panel.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/asset-import-batch.test.ts` (LF)
- Modify (guards): `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts`

**Interfaces:**
- Produces: `getAssetImportBatchStatusTone(status: string): "success" | "warning" | "danger" | "muted"` from `@/lib/asset-import-batch` (ready, partial, blocked, anything else; Task 10 uses it).

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("import panel (M15): ContentPanels, Chip mappings, a StatusBadge batch state, KeyValueList facts, a StatStrip, Notice by meaning, a DataTable and Nil (spec 2D D7, D9, M15)", () => {
  const source = read(`${C}assets/asset-import-preview-panel.tsx`)
  assert.equal(source.match(/<ContentPanel className="mb-4">/g)?.length, 2, "closed and open")
  assert.match(source, /<Chip\n\s+key=\{column\.key\}/)
  assert.match(source, /<StatusBadge label=\{formatBatchStatus\(preview\.batch\.status, labels\)\} tone=\{getAssetImportBatchStatusTone\(preview\.batch\.status\)\} \/>/)
  assert.match(source, /\{ key: "batchId", label: labels\.importBatchId, value: <span className="break-all font-mono">\{preview\.batch\.batchId\}<\/span> \}/)
  assert.match(source, /<StatStrip\n\s+className="mt-4"/)
  assert.match(source, /<Notice tone="warning" title=\{labels\.issueSummaryTitle\} className="mt-4">/)
  assert.match(source, /<Notice tone="success" role="status" className="mt-4">\n\s+\{success\}\n\s+<\/Notice>/)
  assert.match(source, /<DataTable framed=\{false\} caption=\{labels\.importPreview\} className="mt-4 max-h-80 overflow-y-auto">/)
  assert.match(source, /\{orNil\(row\.values\.name\)\}/)
  assert.match(source, /return `\$\{formatCount\(Math\.max\(1, Math\.round\(size \/ 1024\)\)\)\} KB`/)
  assert.doesNotMatch(source, /function (?:SummaryItem|SummaryPill|getBatchStatusClass)\b|"-"|toLocaleString|<table\b|<th\b|uppercase|bg-muted\/|rounded-full|primary-soft|info-soft|success-soft|warning-soft|\btext-xs\b|text-lg font-bold/)
})
```

In `tests/asset-import-batch.test.ts` (LF):

(1) Replace

```ts
  buildAssetImportBatchId,
  buildAssetImportRollbackPlan,
  createAssetImportBatchSummary,
} from "../src/lib/asset-import-batch.ts"

const createdAt = new Date("2026-05-20T08:30:15.000Z")
```

with

```ts
  buildAssetImportBatchId,
  buildAssetImportRollbackPlan,
  createAssetImportBatchSummary,
  getAssetImportBatchStatusTone,
} from "../src/lib/asset-import-batch.ts"

const createdAt = new Date("2026-05-20T08:30:15.000Z")
```

(2) Replace

```ts
    }
  )
})
```

with

```ts
    }
  )
})

test("a batch status badge takes the tone of what is left to do, and an unknown status is muted (plan 2D-3)", () => {
  assert.deepEqual(
    ["ready", "partial", "blocked", "empty", "unknown"].map(getAssetImportBatchStatusTone),
    ["success", "warning", "danger", "muted", "muted"],
  )
})
```

Run: `node --test tests/asset-import-batch.test.ts tests/assets-sweep-ui.test.ts`
Expected: 2 failures:
- `tests/asset-import-batch.test.ts` itself: the file cannot load, because `getAssetImportBatchStatusTone` is not exported yet
- "import panel (M15): ContentPanels, Chip mappings, a StatusBadge batch state, KeyValueList facts, a StatStrip, Notice by meaning, a DataTable and Nil (spec 2D D7, D9, M15)"

- [ ] **Step 2: The tone helper.** In `src/lib/asset-import-batch.ts` (LF):

Replace

```ts
  }
}

export function buildAssetImportBatchId({ fileName, createdAt }: { fileName: string; createdAt: Date }) {
  const timestamp = createdAt.toISOString().replace(/\D/g, "").slice(0, 14)
  const slug = sanitizeFileSlug(fileName)
```

with

```ts
  }
}

// The tone of a batch status badge (plan 2D-3): the import panel and the import history share it. History rows can
// carry a status this version does not know ("unknown" from an old audit value), which stays muted.
export function getAssetImportBatchStatusTone(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "ready") return "success"
  if (status === "partial") return "warning"
  if (status === "blocked") return "danger"
  return "muted"
}

export function buildAssetImportBatchId({ fileName, createdAt }: { fileName: string; createdAt: Date }) {
  const timestamp = createdAt.toISOString().replace(/\D/g, "").slice(0, 14)
  const slug = sanitizeFileSlug(fileName)
```

- [ ] **Step 3: The panel.** In `src/components/assets/asset-import-preview-panel.tsx` (CRLF):

(1) Replace

```tsx

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, ListChecks, Upload } from "lucide-react"
import {
  assetImportWizardSteps,
  getAssetImportWizardStep,
  summarizeAssetImportPreviewIssues,
  type AssetImportWizardStep,
} from "@/lib/asset-import-wizard"
import { getLinearStepStates } from "@/lib/step-states"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { Steps } from "@/components/ui/steps"
import type { AssetImportBatchStatus, AssetImportBatchSummary } from "@/lib/asset-import-batch"
import type { AssetImportColumnMapping } from "@/lib/asset-import-mapping"

type PreviewRow = {
```

with

```tsx

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, FileSpreadsheet, Upload } from "lucide-react"
import {
  assetImportWizardSteps,
  getAssetImportWizardStep,
  summarizeAssetImportPreviewIssues,
  type AssetImportWizardStep,
} from "@/lib/asset-import-wizard"
import { formatCount } from "@/lib/display-format"
import { getLinearStepStates } from "@/lib/step-states"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { Steps } from "@/components/ui/steps"
import { getAssetImportBatchStatusTone, type AssetImportBatchStatus, type AssetImportBatchSummary } from "@/lib/asset-import-batch"
import type { AssetImportColumnMapping } from "@/lib/asset-import-mapping"

type PreviewRow = {
```

(2) Replace

```tsx
        <p className="mt-1 text-sm text-muted-foreground">{labels.wizardHelp}</p>
        {preview && (
          <p className="mt-1 text-sm text-muted-foreground">
            {preview.summary.totalRows} {labels.previewRows} · {preview.summary.readyRows} {labels.previewReady} ·{" "}
            {preview.summary.errorRows} {labels.previewErrors}
          </p>
        )}
      </div>
```

with

```tsx
        <p className="mt-1 text-sm text-muted-foreground">{labels.wizardHelp}</p>
        {preview && (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCount(preview.summary.totalRows)} {labels.previewRows} · {formatCount(preview.summary.readyRows)} {labels.previewReady} ·{" "}
            {formatCount(preview.summary.errorRows)} {labels.previewErrors}
          </p>
        )}
      </div>
```

(3) Replace

```tsx
    }
  }

  if (!isOpen) {
    return (
      <section className="mb-4 rounded-lg border border-border bg-surface p-4">
        {header}
      </section>
    )
  }

  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-4">
      {header}

      <div className="mt-4 flex justify-end">
```

with

```tsx
    }
  }

  // Spec 2D D9: the wizard is a ContentPanel; its own head row holds the third line and the open/close button.
  if (!isOpen) {
    return <ContentPanel className="mb-4">{header}</ContentPanel>
  }

  return (
    <ContentPanel className="mb-4">
      {header}

      <div className="mt-4 flex justify-end">
```

(4) Replace

```tsx

      {selectedFile ? (
        <div className="mt-4 flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="font-medium text-foreground">{labels.selectedFile}</div>
            <div className="truncate text-muted-foreground">
```

with

```tsx

      {selectedFile ? (
        <div className="mt-4 flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <FileSpreadsheet aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-faint-foreground" />
          <div className="min-w-0">
            <div className="font-medium text-foreground">{labels.selectedFile}</div>
            <div className="truncate text-muted-foreground">
```

(5) Replace

```tsx
        </div>
      ) : null}

      {preview?.mapping ? (
        <div className="mt-4 rounded-md border border-primary-border bg-primary-soft px-3 py-3 text-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold text-foreground">{labels.mappingTitle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{labels.mappingHelp}</div>
            </div>
            <div className="shrink-0 text-xs font-medium text-primary">
              {mappedColumns.length} {labels.mappingMatched} · {missingColumns.length} {labels.mappingMissing}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mappedColumns.slice(0, 12).map((column) => (
              <span
                key={column.key}
                className="rounded-full border border-primary-border bg-surface px-2.5 py-1 text-xs text-foreground"
                title={`${labels.fields[column.key] ?? column.label}: ${column.sourceHeader ?? `${labels.sourceColumn} ${column.sourceColumn}`}`}
              >
                {labels.fields[column.key] ?? column.label}
                {" -> "}
                {column.sourceHeader ?? `${labels.sourceColumn} ${column.sourceColumn}`}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {preview?.batch ? (
        <div className="mt-4 rounded-md border border-info-border bg-info-soft px-3 py-3 text-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold text-foreground">{labels.importBatchTitle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{labels.importBatchHelp}</div>
            </div>
            <span
              className={[
                "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                getBatchStatusClass(preview.batch.status),
              ].join(" ")}
            >
              {formatBatchStatus(preview.batch.status, labels)}
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <SummaryPill label={labels.importBatchId} value={preview.batch.batchId} />
            <SummaryPill label={labels.previewReady} value={preview.batch.readyRows.toLocaleString()} />
            <SummaryPill label={labels.previewErrors} value={preview.batch.errorRows.toLocaleString()} />
            <SummaryPill label={labels.mappingMatched} value={preview.batch.mappedColumns.toLocaleString()} />
          </div>
        </div>
      ) : null}

```

with

```tsx
        </div>
      ) : null}

      {/* The mapping and the batch are quiet groupings of the panel (no tint); mapped columns are name Chips. */}
      {preview?.mapping ? (
        <div className="mt-4 rounded-md border border-border bg-background px-3 py-3 text-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold text-foreground">{labels.mappingTitle}</div>
              <div className="mt-0.5 text-meta text-muted-foreground">{labels.mappingHelp}</div>
            </div>
            <div className="shrink-0 text-meta text-muted-foreground">
              {formatCount(mappedColumns.length)} {labels.mappingMatched} · {formatCount(missingColumns.length)} {labels.mappingMissing}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mappedColumns.slice(0, 12).map((column) => (
              <Chip
                key={column.key}
                title={`${labels.fields[column.key] ?? column.label}: ${column.sourceHeader ?? `${labels.sourceColumn} ${column.sourceColumn}`}`}
              >
                {labels.fields[column.key] ?? column.label}
                {" -> "}
                {column.sourceHeader ?? `${labels.sourceColumn} ${column.sourceColumn}`}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {preview?.batch ? (
        <div className="mt-4 rounded-md border border-border bg-background px-3 py-3 text-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold text-foreground">{labels.importBatchTitle}</div>
              <div className="mt-0.5 text-meta text-muted-foreground">{labels.importBatchHelp}</div>
            </div>
            <StatusBadge label={formatBatchStatus(preview.batch.status, labels)} tone={getAssetImportBatchStatusTone(preview.batch.status)} />
          </div>
          {/* The batch id is long and must wrap, so it keeps font-mono with break-all (2D-2 R3). */}
          <KeyValueList
            className="mt-3"
            items={[
              { key: "batchId", label: labels.importBatchId, value: <span className="break-all font-mono">{preview.batch.batchId}</span> },
              { key: "ready", label: labels.previewReady, value: formatCount(preview.batch.readyRows) },
              { key: "errors", label: labels.previewErrors, value: formatCount(preview.batch.errorRows) },
              { key: "mapped", label: labels.mappingMatched, value: formatCount(preview.batch.mappedColumns) },
            ]}
          />
        </div>
      ) : null}

```

(6) Replace

```tsx
      )}

      {success && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
          <span>{success}</span>
        </div>
      )}

      {preview && (
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-3 divide-x divide-border bg-background text-sm md:grid-cols-6">
            <SummaryItem label={labels.previewRows} value={preview.summary.totalRows} />
            <SummaryItem label={labels.previewReady} value={preview.summary.readyRows} tone="ready" />
            <SummaryItem label={labels.previewErrors} value={preview.summary.errorRows} tone="error" />
          </div>
          {issueSummary.length > 0 ? (
            <div className="border-t border-border bg-warning-soft px-4 py-3">
              <div className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{labels.issueSummaryTitle}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{labels.issueSummaryHelp}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {issueSummary.map((issue) => (
                  <span key={issue.message} className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                    {issue.message} · {issue.count} {labels.affectedRows}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="max-h-80 overflow-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.row}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.status}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.assetTag}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.assetName}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {labels.errors}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rows.slice(0, 100).map((row) => (
                  <tr key={row.rowNumber} className="hover:bg-row-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.rowNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={
                          row.status === "ready"
                            ? "inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success"
                            : "inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-1 text-xs font-medium text-danger"
                        }
                      >
                        {row.status === "ready" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {row.status === "ready" ? labels.previewReady : labels.previewErrors}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">{row.values.assetTag || "-"}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{row.values.name || "-"}</td>
                    <td className="min-w-80 px-4 py-3 text-muted-foreground">
                      {row.errors.length === 0 ? "-" : row.errors.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              {preview.summary.readyRows} {labels.previewReady} · {preview.summary.errorRows} {labels.previewErrors}
            </p>
            <Button busy={isImporting} disabled={preview.summary.readyRows === 0} onClick={() => void confirmImport()}>
              {labels.confirmImport}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

```

with

```tsx
      )}

      {success && (
        <Notice tone="success" role="status" className="mt-4">
          {success}
        </Notice>
      )}

      {preview && (
        <>
          <StatStrip
            className="mt-4"
            items={[
              { key: "rows", label: labels.previewRows, value: formatCount(preview.summary.totalRows) },
              { key: "ready", label: labels.previewReady, value: formatCount(preview.summary.readyRows) },
              { key: "errors", label: labels.previewErrors, value: formatCount(preview.summary.errorRows) },
            ]}
          />
          {issueSummary.length > 0 ? (
            <Notice tone="warning" title={labels.issueSummaryTitle} className="mt-4">
              <p>{labels.issueSummaryHelp}</p>
              <ul className="mt-1 list-disc pl-5">
                {issueSummary.map((issue) => (
                  <li key={issue.message}>
                    {issue.message} · {formatCount(issue.count)} {labels.affectedRows}
                  </li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {/* The shared table without a frame of its own; it keeps its 320px height and scrolls down inside. */}
          <DataTable framed={false} caption={labels.importPreview} className="mt-4 max-h-80 overflow-y-auto">
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.row}</DataTableHead>
                <DataTableHead>{labels.status}</DataTableHead>
                <DataTableHead>{labels.assetTag}</DataTableHead>
                <DataTableHead>{labels.assetName}</DataTableHead>
                <DataTableHead>{labels.errors}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {preview.rows.slice(0, 100).map((row) => (
                <DataTableRow key={row.rowNumber}>
                  <DataTableCell className="whitespace-nowrap num text-muted-foreground">{row.rowNumber}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={row.status === "ready" ? labels.previewReady : labels.previewErrors} tone={row.status === "ready" ? "success" : "danger"} />
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-foreground">
                    {row.values.assetTag ? <span className="tag">{row.values.assetTag}</span> : <Nil />}
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">{orNil(row.values.name)}</DataTableCell>
                  <DataTableCell className="min-w-80 text-muted-foreground">
                    {row.errors.length === 0 ? <Nil /> : row.errors.join(", ")}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              {formatCount(preview.summary.readyRows)} {labels.previewReady} · {formatCount(preview.summary.errorRows)} {labels.previewErrors}
            </p>
            <Button busy={isImporting} disabled={preview.summary.readyRows === 0} onClick={() => void confirmImport()}>
              {labels.confirmImport}
            </Button>
          </div>
        </>
      )}
    </ContentPanel>
  )
}

```

(7) Replace

```tsx
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024)).toLocaleString()} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function SummaryItem({ label, value, tone }: { label: string; value: number; tone?: "ready" | "error" }) {
  const toneClass = tone === "ready" ? "text-success" : tone === "error" ? "text-danger" : "text-foreground"
  return (
    <div className="px-4 py-3">
      <div className={`text-lg font-bold ${toneClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground" title={value}>
        {value}
      </div>
    </div>
  )
}

function getBatchStatusClass(status: AssetImportBatchStatus) {
  if (status === "ready") return "bg-success-soft text-success"
  if (status === "partial") return "bg-warning-soft text-warning"
  if (status === "blocked") return "bg-danger-soft text-danger"
  return "bg-muted text-muted-foreground"
}

function formatBatchStatus(status: AssetImportBatchStatus, labels: AssetImportPreviewPanelProps["labels"]) {
  if (status === "ready") return labels.importBatchStatusReady
  if (status === "partial") return labels.importBatchStatusPartial
```

with

```tsx
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${formatCount(Math.max(1, Math.round(size / 1024)))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatBatchStatus(status: AssetImportBatchStatus, labels: AssetImportPreviewPanelProps["labels"]) {
  if (status === "ready") return labels.importBatchStatusReady
  if (status === "partial") return labels.importBatchStatusPartial
```

- [ ] **Step 4: The guard rows (R16).** LFG: the panel's LT1 (5), LV1 (4), LV2 (2) and LS1 (1) rows go from `BUDGETS` and `KEEP` (with the `KEEP.LT1` key) and `SummaryItem` joins `LOCAL_STAT_TILE`. VFG: `TABLE_HEADER_FILLS` becomes `{}` (R10).

In `tests/list-frame-guards.test.ts` (CRLF):

(1) Replace

```ts
const BARE_LOCALE_STRING = /\.toLocaleString\(\)/g
const RAW_DASH = /(?:\|\||\?\?|:)\s*"-"/g
const FORMAT_CURRENCY = /(?<!function )\bformatCurrency\(/g
// Plan 2D-3 (D19) added each name below its own tile's last commit: EvidenceStat (the evidence drawer).
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager).
```

with

```ts
const BARE_LOCALE_STRING = /\.toLocaleString\(\)/g
const RAW_DASH = /(?:\|\||\?\?|:)\s*"-"/g
const FORMAT_CURRENCY = /(?<!function )\bformatCurrency\(/g
// Plan 2D-3 (D19) added each name below its own tile's last commit: EvidenceStat (the evidence drawer), SummaryItem
// (the batch form and the import panel).
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager).
```

(2) Replace

```ts
  LF1: {
  },
  LT1: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-import-preview-panel.tsx`]: 5, // → 5 (KEEP): 2C batch 4 (R-e, O13)
  },
  LT2: {
  },
```

with

```ts
  LF1: {
  },
  LT1: {
  },
  LT2: {
  },
```

(3) Replace

```ts
  },
  LV1: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-import-preview-panel.tsx`]: 4, // → 4 (KEEP): R-f, 2C plan 4
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // → 1 (KEEP): R-f, 2C plan 4
  },
  LV2: {
```

with

```ts
  },
  LV1: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // → 1 (KEEP): R-f, 2C plan 4
  },
  LV2: {
```

(4) Replace

```ts
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // → 4 (KEEP): print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // → 3 (KEEP): 2D
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
```

with

```ts
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // → 4 (KEEP): print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // → 3 (KEEP): 2D
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
```

(5) Replace

```ts
  LS1: {
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :598 in the dialog (2C plan 3)
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // → 1 (KEEP): SummaryPill :407 (2C plan 4)
  },
  LS2: {
  },
```

with

```ts
  LS1: {
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :598 in the dialog (2C plan 3)
  },
  LS2: {
  },
```

(6) Replace

```ts
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)
  },
  LT1: {
    [`${C}assets/asset-import-preview-panel.tsx`]: 5, // 2C batch 4 (R-e, O13)
  },
  LV1: {
    [`${C}assets/asset-import-preview-panel.tsx`]: 4, // R-f, 2C plan 4
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // R-f, 2C plan 4
  },
  LV2: {
```

with

```ts
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)
  },
  LV1: {
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // R-f, 2C plan 4
  },
  LV2: {
```

(7) Replace

```ts
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // 2C batch 4 (2D)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // 2C form (2D)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // translated sentence (R-n)
```

with

```ts
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // 2C form (2D)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // translated sentence (R-n)
```

(8) Replace

```ts
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // print page, 2D (A/08:305)
  },
  LS1: {
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :407 (2C plan 4)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
  LN1: {
```

with

```ts
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // print page, 2D (A/08:305)
  },
  LS1: {
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
  LN1: {
```

In `tests/visual-foundation-guards.test.ts` (CRLF):

Replace

```ts

// R7, locked by phase 2B plan 5 (spec 2B §9.2.2): every neutral fill is an opaque token, table headers included; the
// <th line filter of plans 2B-1 to 2B-4 is gone. The budget keeps its name, which the guard scripts of the 2B plans
// read, and one row: the header of the import preview table, a 2C batch 4 file that 2D moves (DEVELOPER_HANDOFF.md,
// 2C plan 4); then the budget is {}. Lower a number in the task that removes a site; never raise one.
const TABLE_HEADER_FILLS: Record<string, number> = {
  "src/components/assets/asset-import-preview-panel.tsx": 1, // the import preview table header (2D)
}

test("R7 neutral fills are opaque tokens, table headers included", () => {
  const css = globals()
```

with

```ts

// R7, locked by phase 2B plan 5 (spec 2B §9.2.2): every neutral fill is an opaque token, table headers included; the
// <th line filter of plans 2B-1 to 2B-4 is gone. The budget keeps its name, which the guard scripts of the 2B plans
// read (spec 2D §5.5). Plan 2D-3 moved its last row, the import preview table header, onto DataTable: it is {}.
const TABLE_HEADER_FILLS: Record<string, number> = {}

test("R7 neutral fills are opaque tokens, table headers included", () => {
  const css = globals()
```

- [ ] **Step 5: Check.**
  - Run `node --test tests/asset-import-batch.test.ts tests/asset-import-field-labels.test.ts tests/asset-register-ux.test.ts tests/assets-sweep-ui.test.ts tests/dead-code-cleanup.test.ts tests/file-evidence-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/steps-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (144 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-import-preview-panel.tsx src/lib/asset-import-batch.ts tests/asset-import-batch.test.ts tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: equal numbers for `src/components/assets/asset-import-preview-panel.tsx`, `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts`; `0 <n>` for `src/lib/asset-import-batch.ts`, `tests/asset-import-batch.test.ts`, `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2066 tests, 2065 pass, 1 skipped; 2 new tests), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 6: Commit.**

```bash
git add src/components/assets/asset-import-preview-panel.tsx src/lib/asset-import-batch.ts tests/asset-import-batch.test.ts tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "refactor(ui): the import panel on ContentPanel, Chip, StatusBadge, KeyValueList, StatStrip, Notice and DataTable, and every count through formatCount (2D-3 task 9, M15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The import-export page (`D/asset-management/import-export/page.tsx`)

Spec D9, M22, M29, M31; R1, R3. One commit. `ActionLink` takes a `download` prop: an `/api` export is `<a href download>`, a page a `Link`, both on the link-card classes `cn(getPanelClasses(), "block p-4 transition-colors hover:bg-background … sm:p-5")` (R1). The history is a `ContentPanel` with `EmptyNote`; each batch is a quiet grouping with its id in the `h3` (`break-all font-mono`), its status a `StatusBadge` (`formatImportBatchStatus` with the four status labels the page now passes, `getAssetImportBatchStatusTone`) and its rollback a `StatusBadge` (`success` or `muted`); counts use `formatCount`.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/asset-register-ux.test.ts`, `tests/dead-code-cleanup.test.ts` (LF)

**Interfaces:**
- Consumes: `getAssetImportBatchStatusTone` (Task 9).

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("import-export page: link cards on the panel frame with download for /api, the history a ContentPanel with StatusBadges, EmptyNote and no raw colors (spec 2D D9, M22, M29, M31)", () => {
  const source = read(`${D}asset-management/import-export/page.tsx`)
  assert.equal(source.match(/<ActionLink\n\s+download\n/g)?.length, 2, "the template and the export are files")
  assert.match(source, /<a href=\{href\} download className=\{actionCardClasses\}>/)
  assert.match(source, /<Link href=\{href\} className=\{actionCardClasses\}>/)
  assert.match(source, /const actionCardClasses = cn\(getPanelClasses\(\), "block p-4 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5"\)/)
  assert.match(source, /<ContentPanel title=\{labels\.title\} description=\{labels\.help\}>/)
  assert.match(source, /<EmptyNote>\{labels\.empty\}<\/EmptyNote>/)
  assert.match(source, /<StatusBadge label=\{formatImportBatchStatus\(batch\.status, labels\)\} tone=\{getAssetImportBatchStatusTone\(batch\.status\)\} \/>/)
  assert.match(source, /<StatusBadge\n\s+label=\{batch\.rollbackSummary\.reversible \? labels\.rollbackReady : labels\.rollbackBlocked\}\n\s+tone=\{batch\.rollbackSummary\.reversible \? "success" : "muted"\}/)
  assert.match(source, /<span className="break-all font-mono">\{batch\.batchId\}<\/span>/)
  assert.doesNotMatch(source, /\b(?:bg|text|border)-amber-\d|primary-soft|border-dashed|rounded-full|toLocaleString|text-lg|\btext-xs\b|\{labels\.status\}: \{batch\.status\}/)
})
```

In `tests/asset-register-ux.test.ts` (CRLF):

Replace

```ts

  assert.doesNotMatch(source, /moreAssets:\s*t\("importHistoryMoreAssets"\)/)
  assert.match(source, /moreAssets:\s*\(count: string\) => t\("importHistoryMoreAssets", \{ count \}\)/)
  assert.match(source, /labels\.moreAssets\(batch\.rollbackSummary\.hiddenAssetCount\.toLocaleString\("th-TH"\)\)/)
})

test("asset register reuses the authoritative activity filter type", () => {
```

with

```ts

  assert.doesNotMatch(source, /moreAssets:\s*t\("importHistoryMoreAssets"\)/)
  assert.match(source, /moreAssets:\s*\(count: string\) => t\("importHistoryMoreAssets", \{ count \}\)/)
  assert.match(source, /labels\.moreAssets\(formatCount\(batch\.rollbackSummary\.hiddenAssetCount\)\)/)
})

test("asset register reuses the authoritative activity filter type", () => {
```

In `tests/dead-code-cleanup.test.ts` (LF):

Replace

```ts
  assert.match(importExport, /<div>\n\s+<Link href=\{`\/\$\{locale\}\/assets`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\n\s+\{tCommon\("back"\)\}\n\s+<\/Link>\n\s+<\/div>/)
  for (const source of [readiness, importExport]) {
    assert.match(source, /import \{ buttonVariants \} from "@\/components\/ui\/button-variants"/)
    assert.doesNotMatch(source, /getSafeActionLinkClasses|getResponsiveActionRowClasses|@\/lib\/design-system/)
  }
})

```

with

```ts
  assert.match(importExport, /<div>\n\s+<Link href=\{`\/\$\{locale\}\/assets`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\n\s+\{tCommon\("back"\)\}\n\s+<\/Link>\n\s+<\/div>/)
  for (const source of [readiness, importExport]) {
    assert.match(source, /import \{ buttonVariants \} from "@\/components\/ui\/button-variants"/)
    // Plan 2D-3: import-export takes getPanelClasses for its link cards, so only the deleted helpers are banned.
    assert.doesNotMatch(source, /getSafeActionLinkClasses|getResponsiveActionRowClasses/)
  }
})

```

Run: `node --test tests/asset-register-ux.test.ts tests/assets-sweep-ui.test.ts tests/dead-code-cleanup.test.ts`
Expected: 2 failures:
- "asset import history formats hidden asset count when rendering"
- "import-export page: link cards on the panel frame with download for /api, the history a ContentPanel with StatusBadges, EmptyNote and no raw colors (spec 2D D9, M22, M29, M31)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { Download, FileDown, FileSpreadsheet, History, RotateCcw } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildAssetImportHistory, type AssetImportHistoryItem } from "@/lib/asset-import-history"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageHeader } from "@/components/ui/page-header"
import { buttonVariants } from "@/components/ui/button-variants"
import { formatDateTime } from "@/lib/utils"

type AssetImportExportPageProps = {
  params: Promise<{ locale: string }>
```

with

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { Download, FileDown, FileSpreadsheet } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getAssetImportBatchStatusTone } from "@/lib/asset-import-batch"
import { buildAssetImportHistory, type AssetImportHistoryItem } from "@/lib/asset-import-history"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn, formatDateTime } from "@/lib/utils"

type AssetImportExportPageProps = {
  params: Promise<{ locale: string }>
```

(2) Replace

```tsx

      <section className="grid gap-3 md:grid-cols-3">
        <ActionLink
          href="/api/assets/import-template"
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title={t("downloadTemplate")}
          description={tTools("downloadTemplateDescription")}
        />
        <ActionLink
          href="/api/assets/export"
          icon={<FileDown className="h-5 w-5" />}
          title={t("exportFiltered")}
```

with

```tsx

      <section className="grid gap-3 md:grid-cols-3">
        <ActionLink
          download
          href="/api/assets/import-template"
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title={t("downloadTemplate")}
          description={tTools("downloadTemplateDescription")}
        />
        <ActionLink
          download
          href="/api/assets/export"
          icon={<FileDown className="h-5 w-5" />}
          title={t("exportFiltered")}
```

(3) Replace

```tsx
          rollbackBlocked: t("importHistoryRollbackBlocked"),
          rollbackAssets: t("importHistoryRollbackAssets"),
          moreAssets: (count: string) => t("importHistoryMoreAssets", { count }),
          status: t("status"),
        }}
      />

```

with

```tsx
          rollbackBlocked: t("importHistoryRollbackBlocked"),
          rollbackAssets: t("importHistoryRollbackAssets"),
          moreAssets: (count: string) => t("importHistoryMoreAssets", { count }),
          statusReady: t("importBatchStatusReady"),
          statusPartial: t("importBatchStatusPartial"),
          statusBlocked: t("importBatchStatusBlocked"),
          statusEmpty: t("importBatchStatusEmpty"),
        }}
      />

```

(4) Replace

```tsx
    rollbackBlocked: string
    rollbackAssets: string
    moreAssets: (count: string) => string
    status: string
  }
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">{labels.title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{labels.help}</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">{labels.empty}</div>
      ) : (
        <div className="mt-4 grid gap-3">
          {history.map((batch) => (
            <article key={batch.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{batch.batchId}</h3>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {labels.status}: {batch.status}
                    </span>
                  </div>
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "sourceFile", label: labels.sourceFile, value: `${batch.fileName} (${formatFileSize(batch.fileSize)})` },
                      { key: "imported", label: labels.imported, value: `${batch.imported}/${batch.totalRows}` },
                      { key: "skipped", label: labels.skipped, value: `${batch.skipped}` },
                      { key: "approvedBy", label: labels.approvedBy, value: `${batch.approvedByLabel} · ${formatDateTime(batch.createdAt)}` },
                    ]}
                  />
                </div>

                <div className={batch.rollbackSummary.reversible ? "rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900" : "rounded-lg border border-border bg-surface p-3 text-muted-foreground"}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {batch.rollbackSummary.reversible ? labels.rollbackReady : labels.rollbackBlocked}
                  </div>
                  <p className="mt-1 text-xs">
                    {labels.rollbackAssets}: {batch.rollbackSummary.assetCount.toLocaleString("th-TH")}
                  </p>
                </div>
              </div>

              {batch.rollbackSummary.previewAssets.length > 0 ? (
                <div className="mt-3 rounded-md border border-border bg-surface p-3">
                  <div className="text-xs font-medium text-muted-foreground">{labels.rollbackAssets}</div>
                  <ul className="mt-2 grid gap-1 text-sm text-foreground md:grid-cols-2">
                    {batch.rollbackSummary.previewAssets.map((asset) => (
                      <li key={`${batch.id}-${asset}`} className="truncate">
```

with

```tsx
    rollbackBlocked: string
    rollbackAssets: string
    moreAssets: (count: string) => string
    statusReady: string
    statusPartial: string
    statusBlocked: string
    statusEmpty: string
  }
}) {
  // Spec 2D D9: the history is a ContentPanel; each batch is a quiet grouping, and its state and rollback are StatusBadges.
  return (
    <ContentPanel title={labels.title} description={labels.help}>
      {history.length === 0 ? (
        <EmptyNote>{labels.empty}</EmptyNote>
      ) : (
        <div className="grid gap-3">
          {history.map((batch) => (
            <article key={batch.id} className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* The batch id is long and must wrap, so it keeps font-mono with break-all (2D-2 R3). */}
                    <h3 className="min-w-0 text-sm font-medium text-foreground">
                      <span className="break-all font-mono">{batch.batchId}</span>
                    </h3>
                    <StatusBadge label={formatImportBatchStatus(batch.status, labels)} tone={getAssetImportBatchStatusTone(batch.status)} />
                  </div>
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "sourceFile", label: labels.sourceFile, value: `${batch.fileName} (${formatFileSize(batch.fileSize)})` },
                      { key: "imported", label: labels.imported, value: `${formatCount(batch.imported)}/${formatCount(batch.totalRows)}` },
                      { key: "skipped", label: labels.skipped, value: formatCount(batch.skipped) },
                      { key: "approvedBy", label: labels.approvedBy, value: `${batch.approvedByLabel} · ${formatDateTime(batch.createdAt)}` },
                    ]}
                  />
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1">
                  <StatusBadge
                    label={batch.rollbackSummary.reversible ? labels.rollbackReady : labels.rollbackBlocked}
                    tone={batch.rollbackSummary.reversible ? "success" : "muted"}
                  />
                  <span className="text-meta text-muted-foreground">
                    {labels.rollbackAssets}: {formatCount(batch.rollbackSummary.assetCount)}
                  </span>
                </div>
              </div>

              {batch.rollbackSummary.previewAssets.length > 0 ? (
                <div className="mt-3 border-t border-border-soft pt-3">
                  <div className="text-meta font-medium text-muted-foreground">{labels.rollbackAssets}</div>
                  <ul className="mt-2 grid gap-1 text-sm text-foreground md:grid-cols-2">
                    {batch.rollbackSummary.previewAssets.map((asset) => (
                      <li key={`${batch.id}-${asset}`} className="truncate">
```

(5) Replace

```tsx
                    ))}
                  </ul>
                  {batch.rollbackSummary.hiddenAssetCount > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">{labels.moreAssets(batch.rollbackSummary.hiddenAssetCount.toLocaleString("th-TH"))}</p>
                  ) : null}
                </div>
              ) : null}
```

with

```tsx
                    ))}
                  </ul>
                  {batch.rollbackSummary.hiddenAssetCount > 0 ? (
                    <p className="mt-2 text-meta text-muted-foreground">{labels.moreAssets(formatCount(batch.rollbackSummary.hiddenAssetCount))}</p>
                  ) : null}
                </div>
              ) : null}
```

(6) Replace

```tsx
          ))}
        </div>
      )}
    </section>
  )
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return "-"
  if (bytes < 1024) return `${bytes} B`
```

with

```tsx
          ))}
        </div>
      )}
    </ContentPanel>
  )
}

// A status code from the audit log always goes through a label; an unknown code shows as it is (docs/19 glossary).
function formatImportBatchStatus(status: string, labels: { statusReady: string; statusPartial: string; statusBlocked: string; statusEmpty: string }) {
  if (status === "ready") return labels.statusReady
  if (status === "partial") return labels.statusPartial
  if (status === "blocked") return labels.statusBlocked
  if (status === "empty") return labels.statusEmpty
  return status
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return "-"
  if (bytes < 1024) return `${bytes} B`
```

(7) Replace

```tsx
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function ActionLink({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <a href={href} className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary-border hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary">
        {icon}
      </span>
      <div className="font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </a>
  )
}
```

with

```tsx
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// A link card in a page grid is not a ContentPanel, so it takes the panel frame (2D-2 R4) with the link-card hover.
const actionCardClasses = cn(getPanelClasses(), "block p-4 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5")

function ActionLink({
  href,
  icon,
  title,
  description,
  download = false,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
  /** A file from an /api route: a plain <a download> (spec 2D M31); a page in the app is a Link. */
  download?: boolean
}) {
  const content = (
    <>
      <span aria-hidden="true" className="mb-3 flex text-muted-foreground">
        {icon}
      </span>
      <div className="font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </>
  )

  return download ? (
    <a href={href} download className={actionCardClasses}>
      {content}
    </a>
  ) : (
    <Link href={href} className={actionCardClasses}>
      {content}
    </Link>
  )
}
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/asset-import-field-labels.test.ts tests/asset-register-ux.test.ts tests/assets-sweep-ui.test.ts tests/dead-code-cleanup.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/steps-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (124 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx" tests/asset-register-ux.test.ts tests/assets-sweep-ui.test.ts tests/dead-code-cleanup.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx`, `tests/asset-register-ux.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts`, `tests/dead-code-cleanup.test.ts` (LF).
  - Run `npm test` (2067 tests, 2066 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx" tests/asset-register-ux.test.ts tests/assets-sweep-ui.test.ts tests/dead-code-cleanup.test.ts
git commit -m "refactor(ui): import-export link cards on the panel frame with download, and the import history a ContentPanel with StatusBadges (2D-3 task 10)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The label batch tool (`c/assets/asset-label-batch-tool.tsx`, M23, M27)

Spec D9, M21, M22, M23, M27; R3, R5, R7. One commit. Three `ContentPanel`s; `EmptyNote`s; the scope a `Chip`. The result and queue rows stay raw buttons (R5) with `Check`/`Plus` icons, `hover:bg-row-hover` and a disabled look without opacity (`disabled:cursor-not-allowed disabled:bg-background`). The state is a `StatusBadge` from `getAssetStateTone(asset.status.name)` (M23; `toSearchResult` copies `name`), the print count a `StatusBadge` with `formatCount` (`:731`, M27), codes `tag font-medium`.

**Files:**
- Modify: `src/components/assets/asset-label-batch-tool.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (guards): `tests/form-migration-guards.test.ts`, `tests/list-frame-guards.test.ts`

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("label batch tool: ContentPanels, StatusBadges from status.name (M23), formatCount (M27), a scope Chip, EmptyNote, and list rows without opacity (spec 2D D9, M21, M22)", () => {
  const source = read(`${C}assets/asset-label-batch-tool.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3)
  assert.match(source, /<ContentPanel title=\{labels\.recentQueueTitle\} description=\{labels\.recentQueueHelp\}>/)
  assert.match(source, /<ContentPanel\n\s+title=\{labels\.selectedTitle\}\n\s+description=\{`\$\{formatCount\(selected\.length\)\} \$\{labels\.selectedCount\}`\}\n\s+className="xl:sticky xl:top-20 xl:self-start"/)
  assert.match(source, /<StatusBadge label=\{asset\.status\.label\} tone=\{getAssetStateTone\(asset\.status\.name\)\} \/>/)
  assert.match(source, /<StatusBadge label=\{printBadge\} tone=\{printCount > 0 \? "success" : "muted"\} \/>/)
  assert.match(source, /printLabels\.labelPrintedBadge\.replace\("COUNT", formatCount\(printCount\)\)/)
  assert.match(source, /status: \{\n\s+name: asset\.status\?\.name \?\? null,\n\s+label:/, "the queue rows carry status.name too")
  assert.match(source, /<Chip>\{queueScopeSummary\.label\}<\/Chip>/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 3)
  assert.equal(source.match(/disabled:cursor-not-allowed disabled:bg-background/g)?.length, 2, "an added row keeps the shared disabled look, with a check instead of the plus")
  assert.match(source, /<span className="tag font-medium text-foreground">\{asset\.title\}<\/span>/)
  assert.doesNotMatch(source, /disabled:opacity|toLocaleString|status\.colorCode \?|rounded-full|primary-soft|border-dashed|hover:bg-accent|\btext-xs\b|rounded-lg border/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "label batch tool: ContentPanels, StatusBadges from status.name (M23), formatCount (M27), a scope Chip, EmptyNote, and list rows without opacity (spec 2D D9, M21, M22)"

- [ ] **Step 2: The tool.** In `src/components/assets/asset-label-batch-tool.tsx` (CRLF):

(1) Replace

```tsx

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { ArrowDownAZ, Clock3, Filter, Loader2, MapPin, Plus, Printer, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
import { buildAssetLabelSubtitle } from "@/lib/asset-label-display"

type SelectOption = {
  id: string
```

with

```tsx

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { ArrowDownAZ, Check, Filter, Loader2, MapPin, Plus, Printer, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { buildAssetLabelSubtitle } from "@/lib/asset-label-display"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"

type SelectOption = {
  id: string
```

(2) Replace

```tsx

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
            <Field label={labels.searchLabel} hint={trimmedQuery.length < 2 ? labels.minChars : undefined}>
              <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.searchPlaceholder} />
            </Field>
```

with

```tsx

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-5">
          <ContentPanel>
            <Field label={labels.searchLabel} hint={trimmedQuery.length < 2 ? labels.minChars : undefined}>
              <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.searchPlaceholder} />
            </Field>
```

(3) Replace

```tsx
                    {labels.loading}
                  </div>
                ) : visibleResults.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">{labels.noResults}</div>
                ) : (
                  <div className="divide-y divide-border">
                    {visibleResults.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        disabled={selectedIds.has(asset.id)}
                        onClick={() => addAsset(asset)}
                        className="flex min-h-11 w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                          <Plus className="h-4 w-4" />
                        </span>
                        <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} printLabels={labels} />
                      </button>
```

with

```tsx
                    {labels.loading}
                  </div>
                ) : visibleResults.length === 0 ? (
                  <EmptyNote padded>{labels.noResults}</EmptyNote>
                ) : (
                  // The result and queue rows stay list buttons (plan 2D-3 R5): two lines of text that add to the print list.
                  // An added row keeps the shared disabled look (no opacity) and shows a check instead of the plus.
                  <div className="divide-y divide-border-soft">
                    {visibleResults.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        disabled={selectedIds.has(asset.id)}
                        onClick={() => addAsset(asset)}
                        className="flex min-h-11 w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:bg-background"
                      >
                        <span aria-hidden="true" className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground">
                          {selectedIds.has(asset.id) ? <Check className="size-4" /> : <Plus className="size-4" />}
                        </span>
                        <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} printLabels={labels} />
                      </button>
```

(4) Replace

```tsx
                )}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
                  <Clock3 className="h-4 w-4 text-primary" />
                  {labels.recentQueueTitle}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{labels.recentQueueHelp}</p>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-primary-border bg-primary-soft p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-primary">{labels.queueScopeTitle}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-surface px-2 py-0.5 font-medium text-primary ring-1 ring-primary-border">
                      {queueScopeSummary.label}
                    </span>
                    <span className="min-w-0 break-words text-foreground">{queueScopeSummary.detail}</span>
                  </div>
                  {queueScopeSummary.detail !== labels.queueScopeHelp ? (
                    <p className="mt-1 text-xs text-muted-foreground">{labels.queueScopeHelp}</p>
                  ) : null}
                </div>
                <Button disabled={recentAssets.length === 0} onClick={addRecentAssets} className="w-full shrink-0 sm:w-auto">
```

with

```tsx
                )}
              </div>
            ) : null}
          </ContentPanel>

          <ContentPanel title={labels.recentQueueTitle} description={labels.recentQueueHelp}>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{labels.queueScopeTitle}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <Chip>{queueScopeSummary.label}</Chip>
                    <span className="min-w-0 break-words text-foreground">{queueScopeSummary.detail}</span>
                  </div>
                  {queueScopeSummary.detail !== labels.queueScopeHelp ? (
                    <p className="mt-1 text-meta text-muted-foreground">{labels.queueScopeHelp}</p>
                  ) : null}
                </div>
                <Button disabled={recentAssets.length === 0} onClick={addRecentAssets} className="w-full shrink-0 sm:w-auto">
```

(5) Replace

```tsx
            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Filter className="h-4 w-4 text-primary" />
                  {labels.labelQueueFiltersTitle}
                </div>
                <Button variant="outline" onClick={resetQueueFilters}>
```

with

```tsx
            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Filter aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  {labels.labelQueueFiltersTitle}
                </div>
                <Button variant="outline" onClick={resetQueueFilters}>
```

(6) Replace

```tsx
                  {labels.loading}
                </div>
              ) : recentAssets.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{labels.recentQueueEmpty}</div>
              ) : (
                <div className="max-h-[32rem] divide-y divide-border overflow-y-auto">
                  {recentAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={selectedIds.has(asset.id)}
                      onClick={() => addAsset(asset)}
                      className="flex min-h-11 w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                      <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} printLabels={labels} compact />
                    </button>
                  ))}
```

with

```tsx
                  {labels.loading}
                </div>
              ) : recentAssets.length === 0 ? (
                <EmptyNote padded>{labels.recentQueueEmpty}</EmptyNote>
              ) : (
                <div className="max-h-[32rem] divide-y divide-border-soft overflow-y-auto">
                  {recentAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={selectedIds.has(asset.id)}
                      onClick={() => addAsset(asset)}
                      className="flex min-h-11 w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:bg-background"
                    >
                      {selectedIds.has(asset.id) ? (
                        <Check aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Plus aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <AssetLabelSearchResult asset={asset} serialLabel={labels.serial} printLabels={labels} compact />
                    </button>
                  ))}
```

(7) Replace

```tsx
                {labels.loadMoreQueue}
              </Button>
            ) : null}
          </section>
        </div>

        <section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-5 xl:sticky xl:top-20 xl:self-start">
          <div className="mb-4 flex flex-col gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{labels.selectedTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.length} {labels.selectedCount}</p>
            </div>
            <QueueSelect
              label={labels.selectedSortLabel}
              value={selectedSort}
```

with

```tsx
                {labels.loadMoreQueue}
              </Button>
            ) : null}
          </ContentPanel>
        </div>

        <ContentPanel
          title={labels.selectedTitle}
          description={`${formatCount(selected.length)} ${labels.selectedCount}`}
          className="xl:sticky xl:top-20 xl:self-start"
        >
          <div className="mb-4 flex flex-col gap-3">
            <QueueSelect
              label={labels.selectedSortLabel}
              value={selectedSort}
```

(8) Replace

```tsx
          </div>

          {selectedForPrint.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {labels.noSelected}
            </div>
          ) : (
            <div className="max-h-[44rem] space-y-2 overflow-y-auto pr-1">
              {selectedForPrint.map((asset) => (
```

with

```tsx
          </div>

          {selectedForPrint.length === 0 ? (
            <EmptyNote>{labels.noSelected}</EmptyNote>
          ) : (
            <div className="max-h-[44rem] space-y-2 overflow-y-auto pr-1">
              {selectedForPrint.map((asset) => (
```

(9) Replace

```tsx
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
```

with

```tsx
              ))}
            </div>
          )}
        </ContentPanel>
      </div>
    </div>
  )
```

(10) Replace

```tsx
    createdAt: asset.createdAt ?? null,
    labelPrint: asset.labelPrint,
    status: {
      label: locale === "th" ? asset.status?.nameTh ?? asset.status?.name ?? "-" : asset.status?.name ?? asset.status?.nameTh ?? "-",
      colorCode: asset.status?.colorCode ?? null,
    },
```

with

```tsx
    createdAt: asset.createdAt ?? null,
    labelPrint: asset.labelPrint,
    status: {
      name: asset.status?.name ?? null,
      label: locale === "th" ? asset.status?.nameTh ?? asset.status?.name ?? "-" : asset.status?.name ?? asset.status?.nameTh ?? "-",
      colorCode: asset.status?.colorCode ?? null,
    },
```

(11) Replace

```tsx
}) {
  const printCount = asset.labelPrint ? asset.labelPrint.count : 0
  const printBadge = printCount > 0
    ? printLabels.labelPrintedBadge.replace("COUNT", printCount.toLocaleString())
    : printLabels.labelUnprintedBadge

  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="break-all font-semibold text-foreground">{asset.title}</span>
        {!compact ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={asset.status.colorCode ? { backgroundColor: `${asset.status.colorCode}1A`, color: asset.status.colorCode } : undefined}
          >
            {asset.status.label}
          </span>
        ) : null}
        <span
          className={
            printCount > 0
              ? "rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
              : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {printBadge}
        </span>
      </span>
      <span className="mt-1 block break-words text-sm text-foreground">{asset.subtitle}</span>
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {asset.serialNumber ? <span className="break-all">{serialLabel}: {asset.serialNumber}</span> : null}
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span className="break-words">{asset.meta.location}</span>
        </span>
      </span>
```

with

```tsx
}) {
  const printCount = asset.labelPrint ? asset.labelPrint.count : 0
  const printBadge = printCount > 0
    ? printLabels.labelPrintedBadge.replace("COUNT", formatCount(printCount))
    : printLabels.labelUnprintedBadge

  // Spec 2D M23: the state is the shared StatusBadge toned from status.name; database colors are not shown.
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="tag font-medium text-foreground">{asset.title}</span>
        {!compact ? <StatusBadge label={asset.status.label} tone={getAssetStateTone(asset.status.name)} /> : null}
        <StatusBadge label={printBadge} tone={printCount > 0 ? "success" : "muted"} />
      </span>
      <span className="mt-1 block break-words text-sm text-foreground">{asset.subtitle}</span>
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-meta text-muted-foreground">
        {asset.serialNumber ? <span className="break-all">{serialLabel}: {asset.serialNumber}</span> : null}
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin aria-hidden="true" className="h-3 w-3" />
          <span className="break-words">{asset.meta.location}</span>
        </span>
      </span>
```

- [ ] **Step 3: The guard rows (R16).** LFG: the file's LV1 row (1) goes from `BUDGETS` and `KEEP` (with the `KEEP.LV1` key; `BUDGETS.LV1` is `{}`). FMG: only the line numbers in the `LOADER2` comment change.

In `tests/form-migration-guards.test.ts` (CRLF):

Replace

```ts
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1, // BusyLabel :967 (its spinner :970), the status line in the dialog body (I27)
  // 4
  [`${C}admin/IntegrationClientManager.tsx`]: 1, // the loading status in the client list head :505 (I27); the rotate button is Button busy since 2D-2
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // the status lines :311, :446 (I27)
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // the status line :141 (I27)
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // the loading line :134 in the dialog body (I27)
}
```

with

```ts
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1, // BusyLabel :967 (its spinner :970), the status line in the dialog body (I27)
  // 4
  [`${C}admin/IntegrationClientManager.tsx`]: 1, // the loading status in the client list head :505 (I27); the rotate button is Button busy since 2D-2
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // the status lines :317, :442 (I27)
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // the status line :141 (I27)
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // the loading line :134 in the dialog body (I27)
}
```

In `tests/list-frame-guards.test.ts` (CRLF):

(1) Replace

```ts
  LT5: {
  },
  LV1: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // → 1 (KEEP): R-f, 2C plan 4
  },
  LV2: {
    // 2B-1
```

with

```ts
  LT5: {
  },
  LV1: {
  },
  LV2: {
    // 2B-1
```

(2) Replace

```ts
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)
  },
  LV1: {
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // R-f, 2C plan 4
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
```

with

```ts
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-label-print-ui.test.ts tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/status-name-api.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (103 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-label-batch-tool.tsx tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: equal numbers for `src/components/assets/asset-label-batch-tool.tsx`, `tests/form-migration-guards.test.ts`, `tests/list-frame-guards.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2068 tests, 2067 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-label-batch-tool.tsx tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the label batch tool on ContentPanel, StatusBadge from status.name (M23), formatCount (M27), Chip and EmptyNote, with list rows that never fade (2D-3 task 11)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The label print toolbar (`c/assets/asset-label-print.tsx`, M27)

Spec D7, M27; R1, R4, R11. One commit. The back control is `PageBackLink` (`className="max-md:self-start"`); the tape-size box keeps its width at 1440 (`sm:shrink-0`); the guidance is a neutral `Notice`; the QR target a warning (local only) or neutral `Notice` with the URL in `break-all font-mono` (R1); the error a danger `Notice` (`role="alert"`) and the result a success one (`role="status"`). The print preview keeps its paper look (VFG exemptions unchanged).

**Files:**
- Modify: `src/components/assets/asset-label-print.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (guards): `tests/form-migration-guards.test.ts`, `tests/list-frame-guards.test.ts`

- [ ] **Step 1: The failing test.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("label print toolbar: PageBackLink, a tape box that keeps its width at 1440 (M27), and the guidance and results as Notice (spec 2D D7, M27)", () => {
  const source = read(`${C}assets/asset-label-print.tsx`)
  assert.match(source, /<PageBackLink href=\{backHref\} label=\{translations\.back\} className="max-md:self-start" \/>/)
  assert.match(source, /px-3 text-base sm:w-auto sm:shrink-0 md:h-10/, "the tape-size box no longer shrinks under its value (M27)")
  assert.match(source, /<Notice tone="neutral">\{printerTapeGuidance\}<\/Notice>/)
  assert.match(source, /<Notice tone=\{hasLocalQrTarget \? "warning" : "neutral"\} title=\{translations\.qrPrintTarget\}>/)
  assert.match(source, /<span className="break-all font-mono">\{qrPrintTarget\}<\/span>/, "the public QR URL must wrap, so it keeps font-mono (2D-2 R3)")
  assert.match(source, /<Notice tone="danger" role="alert">\{recordError\}<\/Notice>/)
  assert.match(source, /<Notice tone="success" role="status">\{translations\.printRecorded\}<\/Notice>/)
  assert.doesNotMatch(source, /<ArrowLeft\b|sm:min-h-10|primary-soft|warning-soft|danger-soft|success-soft|text-warning|text-primary/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts`
Expected: 1 failure:
- "label print toolbar: PageBackLink, a tape box that keeps its width at 1440 (M27), and the guidance and results as Notice (spec 2D D7, M27)"

- [ ] **Step 2: The toolbar.** In `src/components/assets/asset-label-print.tsx` (CRLF):

(1) Replace

```tsx
"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Info, Printer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { isLikelyLocalAssetQrValue } from "@/lib/asset-qr"
import {
  assetLabelTapeSizes,
```

with

```tsx
"use client"

import { useMemo, useState } from "react"
import { Printer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { PageBackLink } from "@/components/ui/page-header"
import { isLikelyLocalAssetQrValue } from "@/lib/asset-qr"
import {
  assetLabelTapeSizes,
```

(2) Replace

```tsx

      <div className="asset-label-toolbar border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:min-h-10"
          >
            <ArrowLeft className="h-4 w-4" />
            {translations.back}
          </Link>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-base sm:min-w-[240px] sm:flex-nowrap sm:py-0 md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus">
              <span className="shrink-0 font-medium text-muted-foreground">{translations.printReason}</span>
```

with

```tsx

      <div className="asset-label-toolbar border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          {/* The shared back button (outline md, an icon button below md); self-start keeps it from stretching in the phone column. */}
          <PageBackLink href={backHref} label={translations.back} className="max-md:self-start" />
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-base sm:min-w-[240px] sm:flex-nowrap sm:py-0 md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus">
              <span className="shrink-0 font-medium text-muted-foreground">{translations.printReason}</span>
```

(3) Replace

```tsx
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface px-3 text-base sm:w-auto md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus">
              <span className="shrink-0 font-medium text-muted-foreground">{translations.tapeSize}</span>
              <select
                value={tapeSize}
```

with

```tsx
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            {/* Spec 2D M27: shrink-0 keeps the tape box at its value's width; the reason box beside it takes the shrink. */}
            <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface px-3 text-base sm:w-auto sm:shrink-0 md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus">
              <span className="shrink-0 font-medium text-muted-foreground">{translations.tapeSize}</span>
              <select
                value={tapeSize}
```

(4) Replace

```tsx
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-3 pb-4 sm:px-6">
          <p className="flex items-start gap-2 rounded-md border border-primary-border bg-primary-soft px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{printerTapeGuidance}</span>
          </p>
          <div
            className={
              hasLocalQrTarget
                ? "flex items-start gap-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm"
                : "flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            }
          >
            {hasLocalQrTarget ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <div className="min-w-0">
              <div className="font-medium text-foreground">{translations.qrPrintTarget}</div>
              <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{qrPrintTarget}</div>
              {hasLocalQrTarget ? <div className="mt-1 text-xs font-medium text-warning">{translations.qrLocalWarning}</div> : null}
            </div>
          </div>
        </div>
        {recordError || recordedBatchId ? (
          <div className="mx-auto max-w-5xl px-3 pb-4 text-sm sm:px-6">
            {recordError ? (
              <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-danger">{recordError}</p>
            ) : (
              <p className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-success">{translations.printRecorded}</p>
            )}
          </div>
        ) : null}
```

with

```tsx
            </Button>
          </div>
        </div>
        {/* Spec 2D D7: the tape advice is guidance (neutral); a local QR address is a warning box, the public one neutral. */}
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-3 pb-4 sm:px-6">
          <Notice tone="neutral">{printerTapeGuidance}</Notice>
          <Notice tone={hasLocalQrTarget ? "warning" : "neutral"} title={translations.qrPrintTarget}>
            <span className="break-all font-mono">{qrPrintTarget}</span>
            {hasLocalQrTarget ? <span className="mt-1 block">{translations.qrLocalWarning}</span> : null}
          </Notice>
        </div>
        {recordError || recordedBatchId ? (
          <div className="mx-auto max-w-5xl px-3 pb-4 sm:px-6">
            {recordError ? (
              <Notice tone="danger" role="alert">{recordError}</Notice>
            ) : (
              <Notice tone="success" role="status">{translations.printRecorded}</Notice>
            )}
          </div>
        ) : null}
```

- [ ] **Step 3: The guard rows (R16).** LFG: the file's LB1 row (1) goes from `BUDGETS` and `KEEP`. FMG: only the line numbers in the `RAW_FIELDS` comment change.

In `tests/form-migration-guards.test.ts` (CRLF):

Replace

```ts
  // 3
  [`${C}audit/audit-scan-room-picker.tsx`]: 1, // → 1: the room search :76 stays (O20)
  // 4
  [`${C}assets/asset-label-print.tsx`]: 2, // the print toolbar's boxed fields :225, :236 (K21)
}

// GF3 hand-written field class strings
```

with

```ts
  // 3
  [`${C}audit/audit-scan-room-picker.tsx`]: 1, // → 1: the room search :76 stays (O20)
  // 4
  [`${C}assets/asset-label-print.tsx`]: 2, // the print toolbar's boxed fields :221, :233 (K21)
}

// GF3 hand-written field class strings
```

In `tests/list-frame-guards.test.ts` (CRLF):

(1) Replace

```ts
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :496 for ArrowLeft
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}assets/asset-label-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // → 1 (KEEP): back to editing in the review step :93 (2C)
  },
```

with

```ts
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :496 for ArrowLeft
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // → 1 (KEEP): back to editing in the review step :93 (2C)
  },
```

(2) Replace

```ts
    [`${C}admin/system-settings-form.tsx`]: 1, // the move-out button :1413, not a page back
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // back to editing in the review step :93 (2C)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}assets/asset-label-print.tsx`]: 1, // print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)
  },
```

with

```ts
    [`${C}admin/system-settings-form.tsx`]: 1, // the move-out button :1413, not a page back
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // back to editing in the review step :93 (2C)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)
  },
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-label-print-ui.test.ts tests/assets-sweep-ui.test.ts tests/button-size-switch.test.ts tests/dead-code-cleanup.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (111 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-label-print.tsx tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`. Expected: equal numbers for `src/components/assets/asset-label-print.tsx`, `tests/form-migration-guards.test.ts`, `tests/list-frame-guards.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2069 tests, 2068 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-label-print.tsx tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the label print toolbar on PageBackLink and Notice, and the tape-size box keeps its width (2D-3 task 12, M27)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The scan search (`c/assets/asset-scan-search-tool.tsx`, M23)

Spec D9, M21, M23; R7. One commit. The status type gains `name?: string | null`; the tool is a `ContentPanel` with the minimum-length hint as `EmptyNote`; the results are `Link` rows in a `ContentPanel divided flush` (they were buttons that navigated); the state a `StatusBadge` from `status.name`; the asset tag a `tag`.

**Files:**
- Modify: `src/components/assets/asset-scan-search-tool.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/asset-scan-search-tool.test.ts`
- Modify (guards): `tests/form-migration-guards.test.ts`

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("scan search tool: ContentPanels, links for the result rows, StatusBadge from status.name (M23), a tag and EmptyNote (spec 2D D9, M21, M23)", () => {
  const source = read(`${C}assets/asset-scan-search-tool.tsx`)
  assert.match(source, /status: \{ name\?: string \| null; label: string; colorCode: string \| null \}/)
  assert.match(source, /<StatusBadge label=\{result\.status\.label\} tone=\{getAssetStateTone\(result\.status\.name\)\} \/>/)
  assert.match(source, /<Link\n\s+href=\{appendReturnTo\(result\.href, scanReturnHref\)\}/)
  assert.match(source, /<EmptyNote className="mt-2">\{labels\.minChars\}<\/EmptyNote>/)
  assert.match(source, /<EmptyNote padded>\{labels\.noResults\}<\/EmptyNote>/)
  assert.match(source, /<span className="tag font-medium text-foreground">\{result\.title\}<\/span>/)
  assert.doesNotMatch(source, /<button\b|status\.colorCode \?|rounded-full|primary-soft|border-dashed|hover:bg-accent|\btext-xs\b|rounded-lg border/)
})
```

In `tests/asset-scan-search-tool.test.ts` (CRLF):

Replace

```ts
  assert.match(tool, /<Field label=\{labels\.queryLabel\}>\n\s+<ScannerTextInput\n\s+id="asset-scan-query"[\s\S]*?onScanSuccess=\{handleScannedValue\}\n\s+\/>\n\s+<\/Field>/)
  assert.match(tool, /<Button onClick=\{\(\) => openAsset\(directAssetHref\)\} className="w-full sm:w-auto">\n\s+<PackageSearch aria-hidden="true" \/>\n\s+\{labels\.openAsset\}\n\s+<\/Button>/)
  assert.match(tool, /<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" \/>/)
  assert.equal(tool.match(/<button\b/g)?.length, 1, "only the result rows stay list buttons (2D)")
  assert.doesNotMatch(tool, /<h1\b|<label\b|mb-1\.5 block text-sm font-medium/)
})
```

with

```ts
  assert.match(tool, /<Field label=\{labels\.queryLabel\}>\n\s+<ScannerTextInput\n\s+id="asset-scan-query"[\s\S]*?onScanSuccess=\{handleScannedValue\}\n\s+\/>\n\s+<\/Field>/)
  assert.match(tool, /<Button onClick=\{\(\) => openAsset\(directAssetHref\)\} className="w-full sm:w-auto">\n\s+<PackageSearch aria-hidden="true" \/>\n\s+\{labels\.openAsset\}\n\s+<\/Button>/)
  assert.match(tool, /<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" \/>/)
  assert.doesNotMatch(tool, /<button\b/, "the result rows open the asset, so they are links (plan 2D-3)")
  assert.doesNotMatch(tool, /<h1\b|<label\b|mb-1\.5 block text-sm font-medium/)
})
```

Run: `node --test tests/asset-scan-search-tool.test.ts tests/assets-sweep-ui.test.ts`
Expected: 2 failures:
- "the asset scan tool uses PageHeader, Field and Button (2C batch 4)"
- "scan search tool: ContentPanels, links for the result rows, StatusBadge from status.name (M23), a tag and EmptyNote (spec 2D D9, M21, M23)"

- [ ] **Step 2: The tool.** In `src/components/assets/asset-scan-search-tool.tsx` (CRLF):

(1) Replace

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, PackageSearch, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { buildDirectAssetHrefFromScanValue } from "@/lib/asset-scan-routing"
import { appendReturnTo } from "@/lib/asset-return-navigation"

type SearchResult = {
  id: string
```

with

```tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, PackageSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
import { StatusBadge } from "@/components/ui/status-badge"
import { buildDirectAssetHrefFromScanValue } from "@/lib/asset-scan-routing"
import { appendReturnTo } from "@/lib/asset-return-navigation"
import { getAssetStateTone } from "@/lib/design-system"

type SearchResult = {
  id: string
```

(2) Replace

```tsx
  subtitle: string
  href: string
  serialNumber: string | null
  status: { label: string; colorCode: string | null }
  meta: { custodian: string | null; location: string; category: string }
}

```

with

```tsx
  subtitle: string
  href: string
  serialNumber: string | null
  // name comes from /api/search since plan 2D-1 (D8); it sets the badge tone (M23).
  status: { name?: string | null; label: string; colorCode: string | null }
  meta: { custodian: string | null; location: string; category: string }
}

```

(3) Replace

```tsx
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={labels.title} meta={labels.subtitle} />

      <section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <Field label={labels.queryLabel}>
          <ScannerTextInput
            id="asset-scan-query"
```

with

```tsx
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={labels.title} meta={labels.subtitle} />

      <ContentPanel>
        <Field label={labels.queryLabel}>
          <ScannerTextInput
            id="asset-scan-query"
```

(4) Replace

```tsx
            onScanSuccess={handleScannedValue}
          />
        </Field>
      </section>

      {directAssetHref ? (
        <section className="rounded-lg border border-primary-border bg-primary-soft p-4">
          <Button onClick={() => openAsset(directAssetHref)} className="w-full sm:w-auto">
            <PackageSearch aria-hidden="true" />
            {labels.openAsset}
          </Button>
        </section>
      ) : trimmedQuery.length < 2 ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          {labels.minChars}
        </section>
      ) : loading ? (
        <section className="flex items-center gap-2 rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          {labels.loading}
        </section>
      ) : visibleResults.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          {labels.noResults}
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="divide-y divide-border">
            {visibleResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => openAsset(result.href)}
                className="flex w-full min-w-0 gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Search className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words font-semibold text-foreground">{result.title}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={result.status.colorCode ? { backgroundColor: `${result.status.colorCode}1A`, color: result.status.colorCode } : undefined}
                    >
                      {result.status.label}
                    </span>
                  </span>
                  <span className="mt-1 block break-words text-sm text-foreground">{result.subtitle}</span>
                  <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {result.serialNumber ? <span>{labels.serial}: {result.serialNumber}</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {result.meta.location}
                    </span>
                    {result.meta.custodian ? <span>{labels.custodian}: {result.meta.custodian}</span> : null}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
```

with

```tsx
            onScanSuccess={handleScannedValue}
          />
        </Field>
        {!directAssetHref && trimmedQuery.length < 2 ? <EmptyNote className="mt-2">{labels.minChars}</EmptyNote> : null}
      </ContentPanel>

      {/* Spec 2D D9: a found code is one Button, no tinted box; results are rows of one panel, each a link to the asset. */}
      {directAssetHref ? (
        <div>
          <Button onClick={() => openAsset(directAssetHref)} className="w-full sm:w-auto">
            <PackageSearch aria-hidden="true" />
            {labels.openAsset}
          </Button>
        </div>
      ) : trimmedQuery.length < 2 ? null : (
        <ContentPanel divided flush className="overflow-hidden">
          {loading ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground md:px-5">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              {labels.loading}
            </p>
          ) : visibleResults.length === 0 ? (
            <EmptyNote padded>{labels.noResults}</EmptyNote>
          ) : (
            <ul className="divide-y divide-border-soft">
              {visibleResults.map((result) => (
                <li key={result.id}>
                  <Link
                    href={appendReturnTo(result.href, scanReturnHref)}
                    className="flex min-h-11 w-full min-w-0 gap-3 px-4 py-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="tag font-medium text-foreground">{result.title}</span>
                        <StatusBadge label={result.status.label} tone={getAssetStateTone(result.status.name)} />
                      </span>
                      <span className="mt-1 block break-words text-sm text-foreground">{result.subtitle}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-meta text-muted-foreground">
                        {result.serialNumber ? <span>{labels.serial}: {result.serialNumber}</span> : null}
                        <span className="inline-flex items-center gap-1">
                          <MapPin aria-hidden="true" className="h-3 w-3" />
                          {result.meta.location}
                        </span>
                        {result.meta.custodian ? <span>{labels.custodian}: {result.meta.custodian}</span> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ContentPanel>
      )}
    </div>
  )
```

- [ ] **Step 3: The guard rows (R16).** FMG: only the line number in the `LOADER2` comment changes.

In `tests/form-migration-guards.test.ts` (CRLF):

Replace

```ts
  // 4
  [`${C}admin/IntegrationClientManager.tsx`]: 1, // the loading status in the client list head :505 (I27); the rotate button is Button busy since 2D-2
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // the status lines :317, :442 (I27)
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // the status line :141 (I27)
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // the loading line :134 in the dialog body (I27)
}

```

with

```ts
  // 4
  [`${C}admin/IntegrationClientManager.tsx`]: 1, // the loading status in the client list head :505 (I27); the rotate button is Button busy since 2D-2
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // the status lines :317, :442 (I27)
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // the status line :147 (I27)
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // the loading line :134 in the dialog body (I27)
}

```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-scan-return-navigation.test.ts tests/asset-scan-search-tool.test.ts tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (96 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-scan-search-tool.tsx tests/asset-scan-search-tool.test.ts tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts`. Expected: equal numbers for `src/components/assets/asset-scan-search-tool.tsx`, `tests/asset-scan-search-tool.test.ts`, `tests/form-migration-guards.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2070 tests, 2069 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-scan-search-tool.tsx tests/asset-scan-search-tool.test.ts tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "refactor(ui): the scan search tool on ContentPanel, result links, StatusBadge from status.name (M23), tag and EmptyNote (2D-3 task 13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: The asset register

Spec D9, D19, M22. Two commits: the filter sheet with its toolbar, then the table with its phone list.

#### 14a: `c/assets/asset-register-filter-sheet.tsx`, `c/assets/asset-register-toolbar.tsx`

The sheet's toggles are `ChoiceChip` checkboxes in a `ChipGroup`; the sheet footer takes the dialog footer look (D19); the toolbar's filter count is plain `num` text (`FilterCount`, `formatCount`), not a pill.

**Files:**
- Modify: `src/components/assets/asset-register-filter-sheet.tsx`, `src/components/assets/asset-register-toolbar.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/asset-register-filter-ui.test.ts`

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("register filter sheet and toolbar: ChoiceChip toggles, the dialog-footer look on the sheet footer (D19), and a plain filter count (spec 2D D19, M22)", () => {
  const sheet = read(`${C}assets/asset-register-filter-sheet.tsx`)
  assert.match(sheet, /<ChoiceChip\n\s+key=\{option\.value\}\n\s+type="checkbox"\n\s+checked=\{active\}\n\s+onChange=\{\(\) => onChange\(active \? "" : option\.value\)\}\n\s+label=\{option\.label\}\n\s+\/>/)
  assert.match(sheet, /<SheetFooter className="grid grid-cols-2 gap-2 border-t border-border-soft bg-background px-4 py-3">/)
  assert.doesNotMatch(sheet, /<button\b|aria-pressed|rounded-full|hover:bg-accent/)
  const toolbar = read(`${C}assets/asset-register-toolbar.tsx`)
  assert.match(toolbar, /return <span className=\{cn\("num", className\)\}>\{formatCount\(count\)\}<\/span>/)
  assert.doesNotMatch(toolbar, /rounded-full|bg-primary\b|text-primary-foreground/)
})
```

In `tests/asset-register-filter-ui.test.ts` (CRLF):

Replace

```ts
  assert.match(source, /onClick=\{\(\) => setOpen\(false\)\}/)
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>\}/)
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>\}/)
  assert.match(source, /aria-pressed=\{active\}/)
  assert.match(source, /min-h-11/)
  assert.doesNotMatch(source, /type="submit"/)
})

```

with

```ts
  assert.match(source, /onClick=\{\(\) => setOpen\(false\)\}/)
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>\}/)
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>\}/)
  // Plan 2D-3: the toggle chips are ChoiceChip checkboxes (44px below md, the input shows the state).
  assert.match(source, /<ChoiceChip\n\s+key=\{option\.value\}\n\s+type="checkbox"\n\s+checked=\{active\}/)
  assert.doesNotMatch(source, /type="submit"/)
})

```

Run: `node --test tests/asset-register-filter-ui.test.ts tests/assets-sweep-ui.test.ts`
Expected: 2 failures:
- "the filter sheet applies changes at once, keeps its trigger and shows the real result count"
- "register filter sheet and toolbar: ChoiceChip toggles, the dialog-footer look on the sheet footer (D19), and a plain filter count (spec 2D D19, M22)"

- [ ] **Step 2: The filter sheet.** In `src/components/assets/asset-register-filter-sheet.tsx` (CRLF):

(1) Replace

```tsx
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/ui/filter-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
```

with

```tsx
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-card"
import { FilterSelect } from "@/components/ui/filter-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
```

(2) Replace

```tsx
import { assetOwnershipTypes } from "@/lib/asset-ownership"
import { buildSheetClearOverrides, getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

export type AssetRegisterFilterOptions = {
  companies: { id: string; code: string; nameTh: string }[]
```

with

```tsx
import { assetOwnershipTypes } from "@/lib/asset-ownership"
import { buildSheetClearOverrides, getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { formatCount } from "@/lib/display-format"

export type AssetRegisterFilterOptions = {
  companies: { id: string; code: string; nameTh: string }[]
```

(3) Replace

```tsx
            </FilterSelect>
          </FilterSection>
        </div>
        <SheetFooter className="grid grid-cols-2 gap-2 border-t border-border">
          <Button variant="outline" disabled={activeCount === 0} onClick={() => navigate(buildSheetClearOverrides(filters, scope))}>
            {t("filterSheetClear")}
          </Button>
```

with

```tsx
            </FilterSelect>
          </FilterSection>
        </div>
        {/* Spec 2D D19: the sheet footer takes the dialog-footer look of the room picker (audit-scan-room-picker.tsx). */}
        <SheetFooter className="grid grid-cols-2 gap-2 border-t border-border-soft bg-background px-4 py-3">
          <Button variant="outline" disabled={activeCount === 0} onClick={() => navigate(buildSheetClearOverrides(filters, scope))}>
            {t("filterSheetClear")}
          </Button>
```

(4) Replace

```tsx
  onChange: (value: T | "") => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : option.value)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9",
              active
                ? "border-primary-border bg-primary-soft text-primary"
                : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
```

with

```tsx
  onChange: (value: T | "") => void
}) {
  return (
    // At most one option is on and a second click clears it, as before; the shared ChoiceChip shows the state with its
    // own checkbox, so it does not rely on color (spec 2D M22; the batch form's optional columns use the same chip).
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <ChoiceChip
            key={option.value}
            type="checkbox"
            checked={active}
            onChange={() => onChange(active ? "" : option.value)}
            label={option.label}
          />
        )
      })}
    </div>
```

- [ ] **Step 3: The toolbar.** In `src/components/assets/asset-register-toolbar.tsx` (CRLF):

(1) Replace

```tsx
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/ui/filter-select"
import { getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { cn } from "@/lib/utils"

export function AssetRegisterToolbar({
```

with

```tsx
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/ui/filter-select"
import { getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

export function AssetRegisterToolbar({
```

(2) Replace

```tsx
  )
}

function FilterCount({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null
  return (
    <span className={cn("inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground", className)}>
      {count}
    </span>
  )
}
```

with

```tsx
  )
}

// A count is plain num text in the button's own ink (DESIGN.md §5 Status Badges: "a count plain num text").
function FilterCount({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null
  return <span className={cn("num", className)}>{formatCount(count)}</span>
}
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-register-filter-ui.test.ts tests/asset-status-help-ui.test.ts tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (106 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-register-filter-sheet.tsx src/components/assets/asset-register-toolbar.tsx tests/asset-register-filter-ui.test.ts tests/assets-sweep-ui.test.ts`. Expected: equal numbers for `src/components/assets/asset-register-filter-sheet.tsx`, `src/components/assets/asset-register-toolbar.tsx`, `tests/asset-register-filter-ui.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2071 tests, 2070 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-register-filter-sheet.tsx src/components/assets/asset-register-toolbar.tsx tests/asset-register-filter-ui.test.ts tests/assets-sweep-ui.test.ts
git commit -m "refactor(ui): the register filter sheet chips are ChoiceChips, its footer the dialog footer (D19), and the filter count plain text (2D-3 task 14a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 14b: `c/assets/asset-register-table.tsx`, `c/assets/asset-register-mobile-list.tsx`

The ownership type "shared" is a name `Chip` (R1), the table frame `cn(getPanelClasses(), "overflow-hidden")`, the scroll hint the shared hint line with `MoveHorizontal`, and the bulk description counts with `formatCount`; `ownershipTypeTone` and its `StatusTone` import go. The bulk bar itself is phase 3 (D2) and does not change.

**Files:**
- Modify: `src/components/assets/asset-register-table.tsx`, `src/components/assets/asset-register-mobile-list.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/asset-register-table-ui.test.ts`

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("register table and phone list: the ownership type is a name Chip, the frame takes the panel classes, and the scroll hint is the shared hint line (spec 2D D9, M22)", () => {
  const table = read(`${C}assets/asset-register-table.tsx`)
  assert.match(table, /<Chip title=\{asset\.ownershipType\.label\}>\{asset\.ownershipType\.label\}<\/Chip>/)
  assert.match(table, /<div aria-busy=\{isPending\} className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(table, /<MoveHorizontal aria-hidden="true" \/>\n\s+\{labels\.tableScrollHint\}/)
  assert.match(table, /description=\{`\$\{labels\.bulkUpdateDescription\} \(\$\{formatCount\(selectedAssets\.length\)\} \$\{labels\.selectedCount\}\)`\}/)
  assert.doesNotMatch(table, /function ownershipTypeTone\b|bg-muted px-4|StatusTone/)
  const mobile = read(`${C}assets/asset-register-mobile-list.tsx`)
  assert.match(mobile, /<Chip className="shrink-0">\{asset\.ownershipType\.label\}<\/Chip>/)
  assert.doesNotMatch(mobile, /tone="success"/)
})
```

In `tests/asset-register-table-ui.test.ts` (CRLF):

Replace

```ts
  assert.match(row, /className="mt-0\.5 flex min-w-0 flex-nowrap items-center gap-2 text-xs leading-5"/)
  assert.doesNotMatch(row, /flex-wrap/)
  assert.match(row, /className="relative flex min-h-20 items-center gap-3 px-3 py-2 /)
  assert.equal(row.match(/<StatusBadge [^>]*className="shrink-0"/g)?.length, 3)
  assert.match(source, /data-asset-register-summary className="[^"]*py-0 md:py-2/)
})

```

with

```ts
  assert.match(row, /className="mt-0\.5 flex min-w-0 flex-nowrap items-center gap-2 text-xs leading-5"/)
  assert.doesNotMatch(row, /flex-wrap/)
  assert.match(row, /className="relative flex min-h-20 items-center gap-3 px-3 py-2 /)
  assert.equal(row.match(/<StatusBadge [^>]*className="shrink-0"/g)?.length, 2)
  // Plan 2D-3: "shared" is the ownership type's name, so it is the shared Chip (2D-2 R2).
  assert.match(row, /<Chip className="shrink-0">\{asset\.ownershipType\.label\}<\/Chip>/)
  assert.match(source, /data-asset-register-summary className="[^"]*py-0 md:py-2/)
})

```

Run: `node --test tests/asset-register-table-ui.test.ts tests/assets-sweep-ui.test.ts`
Expected: 2 failures:
- "mobile rows keep line 3 on one line and the summary bar adds no vertical padding on phones"
- "register table and phone list: the ownership type is a name Chip, the frame takes the panel classes, and the scroll hint is the shared hint line (spec 2D D9, M22)"

- [ ] **Step 2: The table.** In `src/components/assets/asset-register-table.tsx` (CRLF):

(1) Replace

```tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Download, Edit, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
```

with

```tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Download, Edit, MoveHorizontal, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
```

(2) Replace

```tsx
import type { AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { Button } from "@/components/ui/button"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTableBody, DataTableFoot, DataTableHead, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Nil, orNil } from "@/components/ui/nil"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"
```

with

```tsx
import type { AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTableBody, DataTableFoot, DataTableHead, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Nil, orNil } from "@/components/ui/nil"
import { StatusBadge } from "@/components/ui/status-badge"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"
```

(3) Replace

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { AssetRegisterTransaction } from "@/lib/asset-operation-policy"
import { getAssetStateTone, getDesktopTableOnlyClasses } from "@/lib/design-system"
import {
  assetRegisterColumnOrder,
  assetRegisterColumnPresets,
```

with

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { AssetRegisterTransaction } from "@/lib/asset-operation-policy"
import { getAssetStateTone, getDesktopTableOnlyClasses, getPanelClasses } from "@/lib/design-system"
import {
  assetRegisterColumnOrder,
  assetRegisterColumnPresets,
```

(4) Replace

```tsx
  }

  return (
    <div aria-busy={isPending} className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface">
      <div data-asset-register-summary className="flex items-center justify-between gap-2 border-b border-border px-3 md:px-4 py-0 md:py-2">
        <p className="text-meta text-muted-foreground num">{rangeLabel}</p>
        <div className="flex items-center gap-2">
```

with

```tsx
  }

  return (
    // The frame carries aria-busy, so it cannot be ContentPanel: it takes the panel classes (spec 2D D9, 2D-2 R4).
    <div aria-busy={isPending} className={cn(getPanelClasses(), "overflow-hidden")}>
      <div data-asset-register-summary className="flex items-center justify-between gap-2 border-b border-border px-3 md:px-4 py-0 md:py-2">
        <p className="text-meta text-muted-foreground num">{rangeLabel}</p>
        <div className="flex items-center gap-2">
```

(5) Replace

```tsx
        />
      )}

      {isOverflowing ? (
        <div
          data-asset-table-scroll-hint
          className={`${getDesktopTableOnlyClasses()} border-b border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground`}
        >
          {labels.tableScrollHint}
        </div>
      ) : null}

      <div
```

with

```tsx
        />
      )}

      {/* The hint line of DataTableScrollArea (data-table-scroll.tsx): no fill, faint 13px text after the scroll icon. */}
      {isOverflowing ? (
        <p
          data-asset-table-scroll-hint
          className="hidden items-center gap-1.5 border-b border-border-soft px-4 py-1.5 text-meta text-faint-foreground md:flex [&>svg]:size-4 [&>svg]:shrink-0"
        >
          <MoveHorizontal aria-hidden="true" />
          {labels.tableScrollHint}
        </p>
      ) : null}

      <div
```

(6) Replace

```tsx
                  {visibleColumns.has("custodian") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.custodian ?? undefined}>{orNil(asset.custodian, t("noCustodian"))}</td>}
                  {visibleColumns.has("ownershipType") && (
                    <td className={cellClasses}>
                      <StatusBadge label={asset.ownershipType.label} tone={ownershipTypeTone(asset.ownershipType.value)} />
                    </td>
                  )}
                  {visibleColumns.has("status") && (
```

with

```tsx
                  {visibleColumns.has("custodian") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.custodian ?? undefined}>{orNil(asset.custodian, t("noCustodian"))}</td>}
                  {visibleColumns.has("ownershipType") && (
                    <td className={cellClasses}>
                      {/* The ownership type is a name, not a state (2D-2 R2): the shared Chip, cut with its title in the 120px column. */}
                      <Chip title={asset.ownershipType.label}>{asset.ownershipType.label}</Chip>
                    </td>
                  )}
                  {visibleColumns.has("status") && (
```

(7) Replace

```tsx
      <AccessibleDialog
        open={bulkUpdateOpen}
        title={labels.bulkUpdateTitle}
        description={`${labels.bulkUpdateDescription} (${selectedAssets.length} ${labels.selectedCount})`}
        busy={bulkSaving}
        size="md"
        onClose={() => setBulkUpdateOpen(false)}
```

with

```tsx
      <AccessibleDialog
        open={bulkUpdateOpen}
        title={labels.bulkUpdateTitle}
        description={`${labels.bulkUpdateDescription} (${formatCount(selectedAssets.length)} ${labels.selectedCount})`}
        busy={bulkSaving}
        size="md"
        onClose={() => setBulkUpdateOpen(false)}
```

(8) Replace

```tsx
  )
}

function ownershipTypeTone(value: string): StatusTone {
  if (value === "software_license") return "info"
  if (value === "stock") return "warning"
  if (value === "shared") return "success"
  if (value === "component") return "primary"
  return "muted"
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}
```

with

```tsx
  )
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}
```

- [ ] **Step 3: The phone list.** In `src/components/assets/asset-register-mobile-list.tsx` (CRLF):

(1) Replace

```tsx
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"
import type { AssetRegisterRow } from "@/components/assets/asset-register-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, normalizeAssetStateValue } from "@/lib/design-system"
```

with

```tsx
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"
import type { AssetRegisterRow } from "@/components/assets/asset-register-table"
import { Chip } from "@/components/ui/chip"
import { checkboxVariants } from "@/components/ui/field-variants"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, normalizeAssetStateValue } from "@/lib/design-system"
```

(2) Replace

```tsx
            <>
              <StatusBadge label={asset.condition.label} tone={getAssetStateTone(asset.condition.value)} className="shrink-0" />
              {asset.ownershipType.value === "shared" ? (
                <StatusBadge label={asset.ownershipType.label} tone="success" className="shrink-0" />
              ) : null}
            </>
          ) : null}
```

with

```tsx
            <>
              <StatusBadge label={asset.condition.label} tone={getAssetStateTone(asset.condition.value)} className="shrink-0" />
              {asset.ownershipType.value === "shared" ? (
                <Chip className="shrink-0">{asset.ownershipType.label}</Chip>
              ) : null}
            </>
          ) : null}
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/asset-clone-ui.test.ts tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/asset-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/assets-sweep-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/modern-enterprise-theme.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (157 tests).
  - Run `node <temp>/eol.mjs src/components/assets/asset-register-mobile-list.tsx src/components/assets/asset-register-table.tsx tests/asset-register-table-ui.test.ts tests/assets-sweep-ui.test.ts`. Expected: equal numbers for `src/components/assets/asset-register-mobile-list.tsx`, `src/components/assets/asset-register-table.tsx`, `tests/asset-register-table-ui.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2072 tests, 2071 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-register-mobile-list.tsx src/components/assets/asset-register-table.tsx tests/asset-register-table-ui.test.ts tests/assets-sweep-ui.test.ts
git commit -m "refactor(ui): the register ownership type is a name Chip, its frame the panel classes and its scroll hint the shared hint line (2D-3 task 14b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: My Assets (M32 c)

Spec D9, D19, M32 c; R8, R12. One commit. `src/lib/operational-return-navigation.ts` gets a `"my-assets"` section. The list builds `returnHref` from its own page and page size and passes it to `buildMyAssetDetailHref(locale, assetId, returnHref)`; the detail page reads `searchParams.returnTo` through `normalizeOperationalReturnTo(locale, "my-assets", …)` for its back link (a link without it falls back to My Assets). The phone card is a quiet grouping whose facts are a `KeyValueList` (`MobileField` goes, and the unused `import type React`).

**Files:**
- Modify: `src/lib/operational-return-navigation.ts`, `src/app/[locale]/(dashboard)/my-assets/page.tsx`, `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx`
- Modify: `tests/assets-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/list-pages-ui.test.ts`, `tests/operational-return-navigation.test.ts`
- Modify (guards): `tests/list-frame-guards.test.ts`

**Interfaces:**
- Produces: `"my-assets"` in `OperationalReturnSection` (`src/lib/operational-return-navigation.ts`).

- [ ] **Step 1: The failing tests.** Append to `tests/assets-sweep-ui.test.ts`:

```ts

test("my assets: the phone card facts are a KeyValueList (D19), the card is a quiet grouping, and the sub-line is text-meta (spec 2D D9, D19)", () => {
  const source = read(`${D}my-assets/page.tsx`)
  assert.match(source, /<article className="min-w-0 rounded-md border border-border bg-background p-3">\n\s+<AssetIdentity asset=\{asset\} href=\{href\} \/>\n\s+<KeyValueList\n\s+className="mt-3"/)
  assert.match(source, /\{ key: "serialNumber", label: labels\.serialNumber, value: asset\.serialNumber \? <span className="tag">\{asset\.serialNumber\}<\/span> : null \}/)
  assert.match(source, /\{ key: "status", label: labels\.status, value: <StatusBadge label=\{asset\.status\.nameTh\} tone=\{getAssetStateTone\(asset\.status\.name\)\} \/> \}/)
  assert.doesNotMatch(source, /function MobileField\b|import type React|\btext-xs\b/)
})
```

In `tests/list-pages-ui.test.ts` (CRLF):

Replace

```ts
// for the bottom bar (tests/mobile-field-navigation.test.ts pins the mode).
test("my asset page: PageHeader with the back link to My Assets, the facts as a KeyValueList, no pb-24 of its own (spec 2B §4.4.5, §4.6.3)", () => {
  const source = read(`${D}my-assets/[id]/page.tsx`)
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n\s+title=\{t\("detailTitle"\)\}\n\s+meta=\{t\("detailHelp"\)\}\n\s+back=\{<PageBackLink href=\{`\/\$\{locale\}\/my-assets`\} label=\{t\("backToList"\)\} \/>\}\n\s+\/>/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /<KeyValueList\n\s+items=\{\[/)
  assert.match(source, /\{ key: "serialNumber", label: t\("serialNumber"\), value: asset\.serialNumber \? <span className="tag">\{asset\.serialNumber\}<\/span> : null \}/, "an empty serial number shows Nil through KeyValueList")
```

with

```ts
// for the bottom bar (tests/mobile-field-navigation.test.ts pins the mode).
test("my asset page: PageHeader with the back link to My Assets, the facts as a KeyValueList, no pb-24 of its own (spec 2B §4.4.5, §4.6.3)", () => {
  const source = read(`${D}my-assets/[id]/page.tsx`)
  // Plan 2D-3 (M32 c): the back link returns to the page of the list it came from (returnTo), not page 1.
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n\s+title=\{t\("detailTitle"\)\}\n\s+meta=\{t\("detailHelp"\)\}\n\s+back=\{<PageBackLink href=\{returnToHref\} label=\{t\("backToList"\)\} \/>\}\n\s+\/>/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /<KeyValueList\n\s+items=\{\[/)
  assert.match(source, /\{ key: "serialNumber", label: t\("serialNumber"\), value: asset\.serialNumber \? <span className="tag">\{asset\.serialNumber\}<\/span> : null \}/, "an empty serial number shows Nil through KeyValueList")
```

Append to `tests/operational-return-navigation.test.ts`:

```ts

// Plan 2D-3 (spec 2D M32 c, spec 2B §5.9.2 row 9): the My Assets detail page goes back to the list page and page size
// it was opened from. The pages are read as text with \r, so no regex below holds \n.
test("my-assets returnTo keeps the list page and page size and falls back to My Assets", async () => {
  const { normalizeOperationalReturnTo } = await import("../src/lib/operational-return-navigation.ts")
  assert.equal(normalizeOperationalReturnTo("th", "my-assets", "/th/my-assets?page=2&pageSize=50"), "/th/my-assets?page=2&pageSize=50")
  assert.equal(normalizeOperationalReturnTo("th", "my-assets", undefined), "/th/my-assets")
  assert.equal(normalizeOperationalReturnTo("th", "my-assets", "/th/assets?page=2"), "/th/my-assets", "the register is another page")
  assert.equal(normalizeOperationalReturnTo("th", "my-assets", "https://example.com/th/my-assets"), "/th/my-assets", "never another site")
  assert.equal(normalizeOperationalReturnTo("en", "my-assets", "/th/my-assets?page=2"), "/en/my-assets", "the locale is part of the path")
  const list = readFileSync("src/app/[locale]/(dashboard)/my-assets/page.tsx", "utf8")
  const detail = readFileSync("src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx", "utf8")
  assert.match(list, /return appendOperationalReturnTo\(`\/\$\{locale\}\/my-assets\/\$\{encodeURIComponent\(assetId\)\}`, returnHref\)/)
  assert.equal(list.match(/buildMyAssetDetailHref\(locale, asset\.id, returnHref\)/g)?.length, 2, "the phone card and the table row")
  assert.match(detail, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(detail, /const returnToHref = normalizeOperationalReturnTo\(locale, "my-assets", rawSearchParams\.returnTo\)/)
})
```

Run: `node --test tests/assets-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts`
Expected: 3 failures:
- "my assets: the phone card facts are a KeyValueList (D19), the card is a quiet grouping, and the sub-line is text-meta (spec 2D D9, D19)"
- "my asset page: PageHeader with the back link to My Assets, the facts as a KeyValueList, no pb-24 of its own (spec 2B §4.4.5, §4.6.3)"
- "my-assets returnTo keeps the list page and page size and falls back to My Assets"

- [ ] **Step 2: The return section.** In `src/lib/operational-return-navigation.ts` (CRLF):

Replace

```ts
  "audit-findings": (locale: string) => `/${locale}/audit/findings`,
  // The PM plan list, whose page and page size the edit page carries back (spec 2B B4, §5.9.2 row 6).
  "maintenance-pm": (locale: string) => `/${locale}/maintenance/pm`,
} as const

export type OperationalReturnSection = keyof typeof operationalReturnPaths
```

with

```ts
  "audit-findings": (locale: string) => `/${locale}/audit/findings`,
  // The PM plan list, whose page and page size the edit page carries back (spec 2B B4, §5.9.2 row 6).
  "maintenance-pm": (locale: string) => `/${locale}/maintenance/pm`,
  // My Assets, whose page and page size the detail page carries back (spec 2B §5.9.2 row 9, 2D M32 c).
  "my-assets": (locale: string) => `/${locale}/my-assets`,
} as const

export type OperationalReturnSection = keyof typeof operationalReturnPaths
```

- [ ] **Step 3: The list.** In `src/app/[locale]/(dashboard)/my-assets/page.tsx` (CRLF):

(1) Replace

```tsx
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type React from "react"
import type { Prisma } from "@prisma/client"
import { PackageCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
```

with

```tsx
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { PackageCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
```

(2) Replace

```tsx
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
```

with

```tsx
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
```

(3) Replace

```tsx
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { buildMyAssetsWhere, summarizeMyAssets } from "@/lib/my-assets"
import { cn, formatDateTime } from "@/lib/utils"

type MyAssetsPageProps = {
```

with

```tsx
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { buildMyAssetsWhere, summarizeMyAssets } from "@/lib/my-assets"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn, formatDateTime } from "@/lib/utils"

type MyAssetsPageProps = {
```

(4) Replace

```tsx
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  const labels = {
    asset: t("asset"),
    serialNumber: t("serialNumber"),
```

with

```tsx
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  // The detail page's back link returns to this page of the list, with its page size (spec 2B §5.9.2 row 9, 2D M32 c).
  const returnHref = listHref({ page: listPage.page, pageSize: listPage.pageSize })
  const labels = {
    asset: t("asset"),
    serialNumber: t("serialNumber"),
```

(5) Replace

```tsx
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {assets.map((asset) => (
                <MobileAssetCard key={asset.id} labels={labels} asset={asset} href={buildMyAssetDetailHref(locale, asset.id)} />
              ))}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("list")} scrollHint={tCommon("tableScrollHint")}>
```

with

```tsx
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {assets.map((asset) => (
                <MobileAssetCard key={asset.id} labels={labels} asset={asset} href={buildMyAssetDetailHref(locale, asset.id, returnHref)} />
              ))}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("list")} scrollHint={tCommon("tableScrollHint")}>
```

(6) Replace

```tsx
              </DataTableHeader>
              <DataTableBody>
                {assets.map((asset) => {
                  const href = buildMyAssetDetailHref(locale, asset.id)
                  return (
                    <ClickableTableRow key={asset.id} href={href} label={`${labels.openDetail}: ${asset.assetTag}`}>
                      <DataTableCell>
```

with

```tsx
              </DataTableHeader>
              <DataTableBody>
                {assets.map((asset) => {
                  const href = buildMyAssetDetailHref(locale, asset.id, returnHref)
                  return (
                    <ClickableTableRow key={asset.id} href={href} label={`${labels.openDetail}: ${asset.assetTag}`}>
                      <DataTableCell>
```

(7) Replace

```tsx
      <div className="min-w-0">
        <div className="text-foreground"><span className="tag font-medium">{asset.assetTag}</span></div>
        <div className="truncate text-sm text-foreground">{asset.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          <span className="tag">{asset.category.code}</span> - {asset.category.name}
        </div>
      </div>
```

with

```tsx
      <div className="min-w-0">
        <div className="text-foreground"><span className="tag font-medium">{asset.assetTag}</span></div>
        <div className="truncate text-sm text-foreground">{asset.name}</div>
        <div className="truncate text-meta text-muted-foreground">
          <span className="tag">{asset.category.code}</span> - {asset.category.name}
        </div>
      </div>
```

(8) Replace

```tsx
  )
}

function MobileAssetCard({ labels, asset, href }: { labels: Record<string, string>; asset: MyAssetRow; href: string }) {
  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <AssetIdentity asset={asset} href={href} />
      <div className="mt-3 grid gap-2 text-sm">
        <MobileField label={labels.serialNumber} value={asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : <Nil />} />
        <MobileField label={labels.category} value={<><span className="tag">{asset.category.code}</span> - {asset.category.name}</>} />
        <MobileField label={labels.location} value={<><span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}</>} />
        <MobileField label={labels.companyBranch} value={<><span className="tag">{asset.company.code}</span> / <span className="tag">{asset.branch.code}</span></>} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{labels.status}</span>
          <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{labels.condition}</span>
          <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} />
        </div>
        <MobileField label={labels.updatedAt} value={formatDateTime(asset.updatedAt)} />
      </div>
      <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}>
        {labels.openDetail}
      </Link>
```

with

```tsx
  )
}

// A card in a panel is a quiet grouping (2D-2 R4); its facts are the shared label and value list (spec 2D D19).
function MobileAssetCard({ labels, asset, href }: { labels: Record<string, string>; asset: MyAssetRow; href: string }) {
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-3">
      <AssetIdentity asset={asset} href={href} />
      <KeyValueList
        className="mt-3"
        items={[
          { key: "serialNumber", label: labels.serialNumber, value: asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : null },
          { key: "category", label: labels.category, value: <><span className="tag">{asset.category.code}</span> - {asset.category.name}</> },
          { key: "location", label: labels.location, value: <><span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}</> },
          { key: "companyBranch", label: labels.companyBranch, value: <><span className="tag">{asset.company.code}</span> / <span className="tag">{asset.branch.code}</span></> },
          { key: "status", label: labels.status, value: <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} /> },
          { key: "condition", label: labels.condition, value: <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} /> },
          { key: "updatedAt", label: labels.updatedAt, value: formatDateTime(asset.updatedAt) },
        ]}
      />
      <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}>
        {labels.openDetail}
      </Link>
```

(9) Replace

```tsx
  )
}

function buildMyAssetDetailHref(locale: string, assetId: string) {
  return `/${locale}/my-assets/${encodeURIComponent(assetId)}`
}

function MobileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
```

with

```tsx
  )
}

function buildMyAssetDetailHref(locale: string, assetId: string, returnHref: string) {
  return appendOperationalReturnTo(`/${locale}/my-assets/${encodeURIComponent(assetId)}`, returnHref)
}
```

- [ ] **Step 4: The detail page.** In `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx` (CRLF):

(1) Replace

```tsx
import { getSessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { buildMyAssetDetailWhere } from "@/lib/my-assets"
import { formatDateTime } from "@/lib/utils"

type MyAssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
}

const myAssetDetailSelect = {
```

with

```tsx
import { getSessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { buildMyAssetDetailWhere } from "@/lib/my-assets"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { formatDateTime } from "@/lib/utils"

type MyAssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

const myAssetDetailSelect = {
```

(2) Replace

```tsx
  },
} satisfies Prisma.AssetSelect

export default async function MyAssetDetailPage({ params }: MyAssetDetailPageProps) {
  const { id, locale } = await params
  const user = await getSessionUser()
  if (!user?.employeeId) notFound()

```

with

```tsx
  },
} satisfies Prisma.AssetSelect

export default async function MyAssetDetailPage({ params, searchParams }: MyAssetDetailPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  // Back to the page of My Assets the person came from (spec 2B §5.9.2 row 9, 2D M32 c).
  const returnToHref = normalizeOperationalReturnTo(locale, "my-assets", rawSearchParams.returnTo)
  const user = await getSessionUser()
  if (!user?.employeeId) notFound()

```

(3) Replace

```tsx
      <PageHeader
        title={t("detailTitle")}
        meta={t("detailHelp")}
        back={<PageBackLink href={`/${locale}/my-assets`} label={t("backToList")} />}
      />

      <ContentPanel>
```

with

```tsx
      <PageHeader
        title={t("detailTitle")}
        meta={t("detailHelp")}
        back={<PageBackLink href={returnToHref} label={t("backToList")} />}
      />

      <ContentPanel>
```

- [ ] **Step 5: The guard rows (R16).** LFG: `MobileField` joins `LOCAL_KEY_VALUE`.

In `tests/list-frame-guards.test.ts` (CRLF):

Replace

```ts
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
```

with

```ts
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager), MobileField (my assets).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem|MobileField)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
```

- [ ] **Step 6: Check.**
  - Run `node --test tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/my-assets-detail.test.ts tests/my-assets-route-ui.test.ts tests/operational-return-navigation.test.ts tests/visual-consistency-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (161 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx" "src/app/[locale]/(dashboard)/my-assets/page.tsx" src/lib/operational-return-navigation.ts tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx`, `src/app/[locale]/(dashboard)/my-assets/page.tsx`, `src/lib/operational-return-navigation.ts`, `tests/list-frame-guards.test.ts`, `tests/list-pages-ui.test.ts`, `tests/operational-return-navigation.test.ts`; `0 <n>` for `tests/assets-sweep-ui.test.ts` (LF).
  - Run `npm test` (2074 tests, 2073 pass, 1 skipped; 2 new tests), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 7: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx" "src/app/[locale]/(dashboard)/my-assets/page.tsx" src/lib/operational-return-navigation.ts tests/assets-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts
git commit -m "fix(ui): my-assets detail goes back to the list page it came from (M32 c), and the phone card facts are a KeyValueList (2D-3 task 15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The master-data lists

Spec §3.3 (the drill-down links), M7, D9; R6, R14. Eight commits. 16a–16f make the same three changes on six list pages: the drill-down counts become text links with a 44px phone target (`cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")`, a zero plain `formatCount(0)`), `ActiveBadge` becomes `<StatusBadge label={tCommon("active")} tone="success" />`, and the imports follow (`linkVariants`, `StatusBadge`, `cn`). 16a creates `tests/master-data-sweep-ui.test.ts`. 16g is the brands page, 16h deletes `ActiveBadge`.

#### 16a: `D/master-data/branches/page.tsx`

Two drill-down links (locations and assets, R6) and the active badge.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/branches/page.tsx`
- Create: `tests/master-data-sweep-ui.test.ts` (LF)

- [ ] **Step 1: The failing test.** Create `tests/master-data-sweep-ui.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-3 (spec 2D §3.3, D7, D9, M7, M21, M22, M25, M29, M32 a, M33): the master-data lists, detail pages and forms
// on the shared parts. The drill-down counts are text links with a 44px phone target, the active state is a
// StatusBadge (M7), panels are ContentPanel (or the panel classes where the element cannot be one). Each test pins one
// file (or one tight pair) and fails before that commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
// The 2D-2 precedent (reports, work center): a stand-alone text link adds the 44px phone target at the call site.
const drilldownLink = /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g

test("branches list: drill-down counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/branches/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "branches list: drill-down counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/master-data/branches/page.tsx` (CRLF):

(1) Replace

```tsx
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

with

```tsx
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

(2) Replace

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(3) Replace

```tsx
                    {branch._count.locations > 0 ? (
                      <Link
                        href={drilldown.locations}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(branch._count.locations)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(branch._count.employees)}</DataTableCell>
```

with

```tsx
                    {branch._count.locations > 0 ? (
                      <Link
                        href={drilldown.locations}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(branch._count.locations)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(branch._count.employees)}</DataTableCell>
```

(4) Replace

```tsx
                    {branch._count.assets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(branch._count.assets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

with

```tsx
                    {branch._count.assets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(branch._count.assets)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={tCommon("active")} tone="success" />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/master-data-workspace.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (127 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/branches/page.tsx" tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/branches/page.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2075 tests, 2074 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/branches/page.tsx" tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): branch list drill-down counts are text links and the active state a StatusBadge (2D-3 task 16a, M7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16b: `D/master-data/categories/page.tsx`

Two drill-down links (models and assets) and the active badge; the brand-supplier pin of the category count cells moves to the text link.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/categories/page.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/master-data-brand-supplier-ui.test.ts`

- [ ] **Step 1: The failing tests.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("categories list: the model and asset counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/categories/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})
```

In `tests/master-data-brand-supplier-ui.test.ts` (CRLF):

Replace

```ts
  assert.match(categorySource, /href=\{drilldown\.models\}/)
  assert.match(categorySource, /category\._count\.assets > 0/)
  assert.match(categorySource, /href=\{drilldown\.assets\}/)
  assert.match(categorySource, /text-xs font-medium text-primary transition-colors hover:bg-primary-soft/)

  assert.match(brandSource, /brand\._count\.assets > 0/)
  assert.match(brandSource, /model\._count\.assets > 0/)
```

with

```ts
  assert.match(categorySource, /href=\{drilldown\.models\}/)
  assert.match(categorySource, /category\._count\.assets > 0/)
  assert.match(categorySource, /href=\{drilldown\.assets\}/)
  // Plan 2D-3: a drill-down count is a text link with a 44px phone target (tests/master-data-sweep-ui.test.ts).
  assert.match(categorySource, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/)

  assert.match(brandSource, /brand\._count\.assets > 0/)
  assert.match(brandSource, /model\._count\.assets > 0/)
```

Run: `node --test tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts`
Expected: 2 failures:
- "category and brand count cells use branch-style drilldown links"
- "categories list: the model and asset counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/master-data/categories/page.tsx` (CRLF):

(1) Replace

```tsx
import { Download, FileSpreadsheet, Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
```

with

```tsx
import { Download, FileSpreadsheet, Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
```

(2) Replace

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"
```

with

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"
```

(3) Replace

```tsx
                      <Link
                        prefetch={false}
                        href={drilldown.models}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(category._count.models)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
```

with

```tsx
                      <Link
                        prefetch={false}
                        href={drilldown.models}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(category._count.models)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
```

(4) Replace

```tsx
                      <Link
                        prefetch={false}
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(category._count.assets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(category._count.customFieldDefs)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

with

```tsx
                      <Link
                        prefetch={false}
                        href={drilldown.assets}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(category._count.assets)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(category._count.customFieldDefs)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={tCommon("active")} tone="success" />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (133 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/categories/page.tsx" tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/categories/page.tsx`, `tests/master-data-brand-supplier-ui.test.ts`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2076 tests, 2075 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/categories/page.tsx" tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): category list drill-down counts are text links and the active state a StatusBadge (2D-3 task 16b, M7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16c: `D/master-data/companies/page.tsx`

Two drill-down links (branches and assets) and the active badge.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/companies/page.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("companies list: the branch and asset counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/companies/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "companies list: the branch and asset counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/master-data/companies/page.tsx` (CRLF):

(1) Replace

```tsx
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

with

```tsx
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

(2) Replace

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(3) Replace

```tsx
                    {company._count.branches > 0 ? (
                      <Link
                        href={drilldown.branches}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(company._count.branches)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(company._count.employees)}</DataTableCell>
```

with

```tsx
                    {company._count.branches > 0 ? (
                      <Link
                        href={drilldown.branches}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(company._count.branches)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(company._count.employees)}</DataTableCell>
```

(4) Replace

```tsx
                    {company._count.assets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(company._count.assets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

with

```tsx
                    {company._count.assets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(company._count.assets)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={tCommon("active")} tone="success" />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/master-data-workspace.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (129 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/companies/page.tsx" tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/companies/page.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2077 tests, 2076 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/companies/page.tsx" tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): company list drill-down counts are text links and the active state a StatusBadge (2D-3 task 16c, M7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16d: `D/master-data/departments/page.tsx`

No drill-down link here: only the active badge, and `ActiveBadge` leaves the multi-line import from `master-data-layout`.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/departments/page.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("departments list: the active state is a StatusBadge (spec 2D M7)", () => {
  const source = read(`${D}master-data/departments/page.tsx`)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "departments list: the active state is a StatusBadge (spec 2D M7)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/master-data/departments/page.tsx` (CRLF):

(1) Replace

```tsx
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  ActiveBadge,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
```

with

```tsx
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
```

(2) Replace

```tsx
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

with

```tsx
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={tCommon("active")} tone="success" />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (123 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/departments/page.tsx" tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/departments/page.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2078 tests, 2077 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/departments/page.tsx" tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): department list active state is a StatusBadge (2D-3 task 16d, M7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16e: `D/master-data/employees/page.tsx`

One drill-down link (assets) and the active badge.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/employees/page.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("employees list: the asset count is a text link with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/employees/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 1)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "employees list: the asset count is a text link with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/master-data/employees/page.tsx` (CRLF):

(1) Replace

```tsx
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

with

```tsx
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

(2) Replace

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(3) Replace

```tsx
                    {employee._count.custodianAssets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(employee._count.custodianAssets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

with

```tsx
                    {employee._count.custodianAssets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(employee._count.custodianAssets)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={tCommon("active")} tone="success" />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/master-data-workspace.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (131 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/employees/page.tsx" tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/employees/page.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2079 tests, 2078 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/employees/page.tsx" tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): employee list drill-down count is a text link and the active state a StatusBadge (2D-3 task 16e, M7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16f: `D/master-data/locations/page.tsx`

One drill-down link (assets) and the active badge.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/locations/page.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("locations list: the asset count is a text link with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/locations/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 1)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "locations list: the asset count is a text link with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/master-data/locations/page.tsx` (CRLF):

(1) Replace

```tsx
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

with

```tsx
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

(2) Replace

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(3) Replace

```tsx
                    {location._count.currentAssets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(location._count.currentAssets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(location._count.children)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

with

```tsx
                    {location._count.currentAssets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(location._count.currentAssets)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(location._count.children)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={tCommon("active")} tone="success" />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/master-data-workspace.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (132 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/locations/page.tsx" tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/locations/page.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2080 tests, 2079 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/locations/page.tsx" tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): location list drill-down count is a text link and the active state a StatusBadge (2D-3 task 16f, M7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16g: `D/master-data/brands/page.tsx` (2D-1 R3 `:425`)

The model table's asset count is a text link (as above) and the picker's model and asset counts are 13px text links (`cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")`). The picker `<aside>` takes the panel classes (R1) with `text-meta` lines and `hover:bg-row-hover`; the model workspace is a `ContentPanel` with the result count in its actions; the duplicates `<details>` takes the panel classes with a 16px warning icon and no tint; the duplicate groups are quiet groupings; "create model" is `size: "md"` (R14); the active state is a `StatusBadge`. The picker keeps its two `aria-current` (LN1 2, I11).

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/brands/page.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/master-data-brand-supplier-ui.test.ts`

- [ ] **Step 1: The failing tests.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("brands page: drill-down text links, the panel frame on the picker and the duplicates, the workspace a ContentPanel, an md create button (2D-1 R3) and a StatusBadge (spec 2D M7, D9)", () => {
  const source = read(`${D}master-data/brands/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 1, "the model table's asset count")
  assert.equal(source.match(/className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g)?.length, 2, "the picker's model and asset counts (13px)")
  assert.match(source, /<aside className=\{cn\(getPanelClasses\(\), "overflow-hidden lg:sticky lg:top-4 lg:self-start"\)\}>/)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("modelWorkspaceTitle"\)\}/)
  assert.match(source, /<details className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<Link href=\{createModelHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.equal(source.match(/aria-current=\{/g)?.length, 2, "LN1 stays 2 (I11)")
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|hover:bg-accent|\bh-[78]\b|className="px-2"|size: "lg"|bg-warning-soft|\btext-xs\b|text-lg|rounded-lg border/)
})
```

In `tests/master-data-brand-supplier-ui.test.ts` (CRLF):

Replace

```ts

  assert.match(brandSource, /brand\._count\.assets > 0/)
  assert.match(brandSource, /model\._count\.assets > 0/)
  assert.match(brandSource, /text-xs font-medium text-primary transition-colors hover:bg-primary-soft/)
})

test("brand model edit flow preserves the selected brand workspace after save", () => {
```

with

```ts

  assert.match(brandSource, /brand\._count\.assets > 0/)
  assert.match(brandSource, /model\._count\.assets > 0/)
  assert.match(brandSource, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/)
})

test("brand model edit flow preserves the selected brand workspace after save", () => {
```

Run: `node --test tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts`
Expected: 2 failures:
- "category and brand count cells use branch-style drilldown links"
- "brands page: drill-down text links, the panel frame on the picker and the duplicates, the workspace a ContentPanel, an md create button (2D-1 R3) and a StatusBadge (spec 2D M7, D9)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/master-data/brands/page.tsx` (CRLF):

(1) Replace

```tsx
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { summarizeModelSpecs } from "@/lib/model-specs"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

with

```tsx
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { summarizeModelSpecs } from "@/lib/model-specs"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
```

(2) Replace

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with

```tsx
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(3) Replace

```tsx
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border border-border bg-surface lg:sticky lg:top-4 lg:self-start">
          <div className="border-b border-border px-3 py-3">
            <h2 className="text-sm font-semibold text-foreground">{t("brandNavigatorTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("brandNavigatorSubtitle")}</p>
          </div>
          <div className="space-y-1 p-2">
            <Link
              href={`${basePath}?${buildBrandModelQueryString(listState, { modelBrandId: "", modelPage: 1 })}`}
              aria-current={!selectedBrand ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors ${
                !selectedBrand ? "border-primary bg-primary-soft text-primary" : "border-transparent text-foreground hover:bg-accent"
              }`}
            >
              <span className="min-w-0 truncate font-medium">{t("allBrandNavigator")}</span>
```

with

```tsx
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
        {/* An aside (the picker) cannot be ContentPanel, so it takes the panel classes (2D-2 R4). */}
        <aside className={cn(getPanelClasses(), "overflow-hidden lg:sticky lg:top-4 lg:self-start")}>
          <div className="border-b border-border px-3 py-3">
            <h2 className="text-sm font-semibold text-foreground">{t("brandNavigatorTitle")}</h2>
            <p className="mt-1 text-meta text-muted-foreground">{t("brandNavigatorSubtitle")}</p>
          </div>
          <div className="space-y-1 p-2">
            <Link
              href={`${basePath}?${buildBrandModelQueryString(listState, { modelBrandId: "", modelPage: 1 })}`}
              aria-current={!selectedBrand ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors ${
                !selectedBrand ? "border-primary bg-primary-soft text-primary" : "border-transparent text-foreground hover:bg-row-hover"
              }`}
            >
              <span className="min-w-0 truncate font-medium">{t("allBrandNavigator")}</span>
```

(4) Replace

```tsx
                  <div
                    key={brand.id}
                    className={`rounded-md border px-2.5 py-2 transition-colors ${
                      isSelected ? "border-primary bg-primary-soft" : "border-transparent hover:bg-accent"
                    }`}
                  >
                    <Link
```

with

```tsx
                  <div
                    key={brand.id}
                    className={`rounded-md border px-2.5 py-2 transition-colors ${
                      isSelected ? "border-primary bg-primary-soft" : "border-transparent hover:bg-row-hover"
                    }`}
                  >
                    <Link
```

(5) Replace

```tsx
                    >
                      {brand.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {brand._count.models > 0 ? (
                        <Link
                          prefetch={false}
                          href={brandModelsHref}
                          className="inline-flex h-7 items-center rounded-md px-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                        >
                          {t("modelCountInline", { count: brand._count.models })}
                        </Link>
```

with

```tsx
                    >
                      {brand.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-meta text-muted-foreground">
                      {brand._count.models > 0 ? (
                        <Link
                          prefetch={false}
                          href={brandModelsHref}
                          className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}
                        >
                          {t("modelCountInline", { count: brand._count.models })}
                        </Link>
```

(6) Replace

```tsx
                        <Link
                          prefetch={false}
                          href={brandDrilldown.assets}
                          className="inline-flex h-7 items-center rounded-md px-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                        >
                          {t("assetCountInline", { count: brand._count.assets })}
                        </Link>
```

with

```tsx
                        <Link
                          prefetch={false}
                          href={brandDrilldown.assets}
                          className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}
                        >
                          {t("assetCountInline", { count: brand._count.assets })}
                        </Link>
```

(7) Replace

```tsx
          </div>
          {selectedBrand ? (
            <div className="border-t border-border p-2.5">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t("selectedBrandActions")}
              </div>
              <RowActions
```

with

```tsx
          </div>
          {selectedBrand ? (
            <div className="border-t border-border p-2.5">
              <div className="mb-2 text-meta font-medium text-muted-foreground">
                {t("selectedBrandActions")}
              </div>
              <RowActions
```

(8) Replace

```tsx
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("modelWorkspaceTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedBrand || selectedCategory
                    ? t("modelsFilteredBy", {
                        brand: selectedBrand?.name ?? t("allBrands"),
                        category: selectedCategory ? `${selectedCategory.code} - ${selectedCategory.name}` : t("allCategories"),
                      })
                    : t("modelWorkspaceSubtitle")}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {t("modelResultSummary", { count: modelTotal })}
              </div>
            </div>
            <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]">
              <input type="hidden" name="brandPage" value="1" />
              <input type="hidden" name="brandPageSize" value={listState.brandPageSize} />
```

with

```tsx
        </aside>

        <section className="min-w-0 space-y-4">
          <ContentPanel
            title={t("modelWorkspaceTitle")}
            description={
              selectedBrand || selectedCategory
                ? t("modelsFilteredBy", {
                    brand: selectedBrand?.name ?? t("allBrands"),
                    category: selectedCategory ? `${selectedCategory.code} - ${selectedCategory.name}` : t("allCategories"),
                  })
                : t("modelWorkspaceSubtitle")
            }
            actions={<span className="text-sm text-muted-foreground">{t("modelResultSummary", { count: modelTotal })}</span>}
          >
            <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]">
              <input type="hidden" name="brandPage" value="1" />
              <input type="hidden" name="brandPageSize" value={listState.brandPageSize} />
```

(9) Replace

```tsx
              />
              <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
            </form>
          </div>

          {totalDuplicateGroups > 0 ? (
            <details className="rounded-lg border border-warning-border bg-warning-soft p-4">
              <summary className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                {t("duplicateReviewCompact", { count: totalDuplicateGroups })}
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
```

with

```tsx
              />
              <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
            </form>
          </ContentPanel>

          {/* A <details> cannot be ContentPanel: the panel classes (2D-2 R4). The warning lives in its icon, not a tint. */}
          {totalDuplicateGroups > 0 ? (
            <details className={cn(getPanelClasses(), "p-4 sm:p-5")}>
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-foreground md:min-h-0">
                <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-warning" />
                {t("duplicateReviewCompact", { count: totalDuplicateGroups })}
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
```

(10) Replace

```tsx
            title={t("modelsTitle")}
            description={t("modelsSubtitle")}
            actions={
              <Link href={createModelHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Plus aria-hidden="true" />
                {t("createModel")}
              </Link>
```

with

```tsx
            title={t("modelsTitle")}
            description={t("modelsSubtitle")}
            actions={
              <Link href={createModelHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                <Plus aria-hidden="true" />
                {t("createModel")}
              </Link>
```

(11) Replace

```tsx
                            <Link
                              prefetch={false}
                              href={modelDrilldown.assets}
                              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                            >
                              {formatCount(model._count.assets)}
                            </Link>
                          ) : (
                            <span className="px-2">{formatCount(0)}</span>
                          )}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <ActiveBadge label={tCommon("active")} />
                        </DataTableCell>
                        <DataTableCell align="right" sticky="right">
                          <RowActions
```

with

```tsx
                            <Link
                              prefetch={false}
                              href={modelDrilldown.assets}
                              className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                            >
                              {formatCount(model._count.assets)}
                            </Link>
                          ) : (
                            formatCount(0)
                          )}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <StatusBadge label={tCommon("active")} tone="success" />
                        </DataTableCell>
                        <DataTableCell align="right" sticky="right">
                          <RowActions
```

(12) Replace

```tsx
  groups: Array<{ displayName: string; items: Array<{ id: string; name: string }> }>
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {groups.length === 0 ? (
        <div className="mt-2 text-sm">
```

with

```tsx
  groups: Array<{ displayName: string; items: Array<{ id: string; name: string }> }>
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {groups.length === 0 ? (
        <div className="mt-2 text-sm">
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (138 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/brands/page.tsx" tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/brands/page.tsx`, `tests/master-data-brand-supplier-ui.test.ts`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2081 tests, 2080 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/brands/page.tsx" tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): brands page drill-down text links, picker and duplicates on the panel classes, the workspace a ContentPanel, an md create button and the active StatusBadge (2D-3 task 16g)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 16h: `c/master-data/master-data-layout.tsx` (M7, R13)

No page calls `ActiveBadge` after 16g. First run `grep -rn "ActiveBadge" src`: expected only its definition in `master-data-layout.tsx`. It goes, and the list-primitives pin expects `MasterDataSearch` as the file's only export.

**Files:**
- Modify: `src/components/master-data/master-data-layout.tsx`
- Modify (pins and unit tests): `tests/list-primitives-ui.test.ts`

- [ ] **Step 1: The failing test.** In `tests/list-primitives-ui.test.ts` (CRLF):

Replace

```ts
})

// Plan 2B-5 Task 16 (spec 2B R-h, §8.9 row 10, §8.13 #6): every caller moved onto PageHeader, DataTableHead and Pagination,
// so the old master-data helpers go. MasterDataSearch (six pages) and ActiveBadge (a pill, 2D) stay.
test("master-data-layout keeps only MasterDataSearch and ActiveBadge: the old header, column headers and pager are gone (R-h)", () => {
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.deepEqual([...layout.matchAll(/^export function (\w+)/gm)].map((match) => match[1]), ["MasterDataSearch", "ActiveBadge"])
  assert.match(layout, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.doesNotMatch(layout, /\bMasterDataHeader\b|\bColumnHeader\b|\bSortableColumnHeader\b|\bMasterDataPagination\b|from "next\/link"|from "lucide-react"|master-data-query|<h1\b|\buppercase\b|\bopacity-50\b/)
})
```

with

```ts
})

// Plan 2B-5 Task 16 (spec 2B R-h, §8.9 row 10, §8.13 #6): every caller moved onto PageHeader, DataTableHead and Pagination,
// so the old master-data helpers go. MasterDataSearch (six pages) stays; ActiveBadge (a pill) went in plan 2D-3 (M7: StatusBadge).
test("master-data-layout keeps only MasterDataSearch: the old header, column headers, pager and active pill are gone (R-h, 2D M7)", () => {
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.deepEqual([...layout.matchAll(/^export function (\w+)/gm)].map((match) => match[1]), ["MasterDataSearch"])
  assert.match(layout, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.doesNotMatch(layout, /\bMasterDataHeader\b|\bColumnHeader\b|\bSortableColumnHeader\b|\bMasterDataPagination\b|from "next\/link"|from "lucide-react"|master-data-query|<h1\b|\buppercase\b|\bopacity-50\b/)
})
```

Run: `node --test tests/list-primitives-ui.test.ts`
Expected: 1 failure:
- "master-data-layout keeps only MasterDataSearch: the old header, column headers, pager and active pill are gone (R-h, 2D M7)"

- [ ] **Step 2: The layout.** In `src/components/master-data/master-data-layout.tsx` (CRLF):

Replace

```tsx
    </form>
  )
}

export function ActiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success">
      {label}
    </span>
  )
}
```

with

```tsx
    </form>
  )
}
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/list-primitives-ui.test.ts tests/master-data-workspace.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (97 tests).
  - Run `node <temp>/eol.mjs src/components/master-data/master-data-layout.tsx tests/list-primitives-ui.test.ts`. Expected: equal numbers for `src/components/master-data/master-data-layout.tsx`, `tests/list-primitives-ui.test.ts`.
  - Run `npm test` (2081 tests, 2080 pass, 1 skipped; no new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/master-data/master-data-layout.tsx tests/list-primitives-ui.test.ts
git commit -m "refactor(ui): master-data-layout drops ActiveBadge, every caller is on StatusBadge (2D-3 task 16h)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: The suppliers

Spec D7, D9, D19, M21, M32 a; R1, R6, R8, R12. Two commits: the list, then the supplier page with its purchase documents.

#### 17a: `D/master-data/suppliers/page.tsx`, `c/master-data/supplier-list-view.tsx`

The phone filter `<details>` takes the panel classes (R1); the empty state sits in a `ContentPanel`; the list frame is `cn(getPanelClasses(), "overflow-hidden")`; the table's asset count is a drill-down text link (R6) and a zero plain `formatCount(0)`; the phone cards are quiet groupings whose contact and phone are a `KeyValueList`; a linked count in a card reads as a link (`text-primary`, `num`); `text-xs` lines are `text-meta`.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx`, `src/components/master-data/supplier-list-view.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("suppliers list: the asset count is a text link with a 44px phone target, frames are the panel classes and the phone cards quiet groupings with a KeyValueList (spec 2D D9, D19, §3.3)", () => {
  const page = read(`${D}master-data/suppliers/page.tsx`)
  const list = read("src/components/master-data/supplier-list-view.tsx")
  assert.match(page, /<details className=\{cn\(getPanelClasses\(\), "md:hidden"\)\} open=\{hasActiveFilters\}>/)
  assert.equal(list.match(drilldownLink)?.length, 1, "the desktop asset count")
  assert.match(list, /<ContentPanel>\n\s+<ActionEmptyState/)
  assert.match(list, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(list, /<article key=\{supplier\.id\} className="min-w-0 rounded-md border border-border bg-background p-3">/)
  assert.equal(list.match(/<KeyValueList\b/g)?.length, 1, "the phone card's contact and phone")
  assert.doesNotMatch(page + list, /rounded-lg border|hover:bg-primary-soft|\btext-xs\b|className="px-2"|<dl\b/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "suppliers list: the asset count is a text link with a 44px phone target, frames are the panel classes and the phone cards quiet groupings with a KeyValueList (spec 2D D9, D19, §3.3)"

- [ ] **Step 2: The list page.** In `src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx` (CRLF):

(1) Replace

```tsx
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
```

with

```tsx
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { prisma } from "@/lib/db"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
```

(2) Replace

```tsx
  type SupplierListState,
} from "@/lib/organization-master-query"
import { requirePagePermission } from "@/lib/page-auth"

type SuppliersPageProps = {
  params: Promise<{ locale: string }>
```

with

```tsx
  type SupplierListState,
} from "@/lib/organization-master-query"
import { requirePagePermission } from "@/lib/page-auth"
import { cn } from "@/lib/utils"

type SuppliersPageProps = {
  params: Promise<{ locale: string }>
```

(3) Replace

```tsx
        />
      </section>

      <details className="rounded-lg border border-border bg-surface md:hidden" open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("filtersTitle")}
```

with

```tsx
        />
      </section>

      {/* A <details> cannot be ContentPanel: the panel classes (2D-2 R4). */}
      <details className={cn(getPanelClasses(), "md:hidden")} open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("filtersTitle")}
```

- [ ] **Step 3: The list view.** In `src/components/master-data/supplier-list-view.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { Pencil } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, type DataTableSort } from "@/components/ui/data-table"
import { orNil } from "@/components/ui/nil"
import { RowActions } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
```

with

```tsx
import Link from "next/link"
import { Pencil } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, type DataTableSort } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { orNil } from "@/components/ui/nil"
import { RowActions } from "@/components/ui/row-actions"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
```

(2) Replace

```tsx
  type SupplierListState,
  type SupplierSort,
} from "@/lib/organization-master-query"

export type SupplierListItem = {
  id: string
```

with

```tsx
  type SupplierListState,
  type SupplierSort,
} from "@/lib/organization-master-query"
import { cn } from "@/lib/utils"

export type SupplierListItem = {
  id: string
```

(3) Replace

```tsx
}) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <ActionEmptyState
          title={hasActiveFilters ? labels.filteredEmptyTitle : labels.emptyTitle}
          description={hasActiveFilters ? labels.filteredEmptyDescription : labels.emptyDescription}
```

with

```tsx
}) {
  if (suppliers.length === 0) {
    return (
      <ContentPanel>
        <ActionEmptyState
          title={hasActiveFilters ? labels.filteredEmptyTitle : labels.emptyTitle}
          description={hasActiveFilters ? labels.filteredEmptyDescription : labels.emptyDescription}
```

(4) Replace

```tsx
          actionLabel={hasActiveFilters ? labels.clearFilters : labels.create}
          actionVariant={hasActiveFilters ? "secondary" : "primary"}
        />
      </div>
    )
  }

```

with

```tsx
          actionLabel={hasActiveFilters ? labels.clearFilters : labels.create}
          actionVariant={hasActiveFilters ? "secondary" : "primary"}
        />
      </ContentPanel>
    )
  }

```

(5) Replace

```tsx
  })

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <DataTable data-supplier-desktop-table framed={false} className="hidden md:block" caption={labels.title} scrollHint={labels.tableScrollHint}>
        <DataTableHeader>
          <tr>
```

with

```tsx
  })

  return (
    <div className={cn(getPanelClasses(), "overflow-hidden")}>
      <DataTable data-supplier-desktop-table framed={false} className="hidden md:block" caption={labels.title} scrollHint={labels.tableScrollHint}>
        <DataTableHeader>
          <tr>
```

(6) Replace

```tsx
                </DataTableCell>
                <DataTableCell className="min-w-56 text-foreground">
                  <div className="font-medium">{supplier.name}</div>
                  {supplier.address ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{supplier.address}</div> : null}
                </DataTableCell>
                <DataTableCell className="min-w-44 text-muted-foreground">{orNil(supplier.contactPerson)}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">{orNil(supplier.phone)}</DataTableCell>
                <DataTableCell className="min-w-56 text-muted-foreground">{orNil(supplier.email)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {supplier._count.assets > 0 ? (
                    <Link href={hrefs.assets} aria-label={`${labels.assets}: ${formatCount(supplier._count.assets)}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {formatCount(supplier._count.assets)}
                    </Link>
                  ) : <span className="px-2">{formatCount(0)}</span>}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(supplier._count.purchaseDocuments)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(supplier._count.maintenanceTickets)}</DataTableCell>
```

with

```tsx
                </DataTableCell>
                <DataTableCell className="min-w-56 text-foreground">
                  <div className="font-medium">{supplier.name}</div>
                  {supplier.address ? <div className="mt-1 line-clamp-2 text-meta text-muted-foreground">{supplier.address}</div> : null}
                </DataTableCell>
                <DataTableCell className="min-w-44 text-muted-foreground">{orNil(supplier.contactPerson)}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">{orNil(supplier.phone)}</DataTableCell>
                <DataTableCell className="min-w-56 text-muted-foreground">{orNil(supplier.email)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {supplier._count.assets > 0 ? (
                    <Link href={hrefs.assets} aria-label={`${labels.assets}: ${formatCount(supplier._count.assets)}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                      {formatCount(supplier._count.assets)}
                    </Link>
                  ) : formatCount(0)}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(supplier._count.purchaseDocuments)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(supplier._count.maintenanceTickets)}</DataTableCell>
```

(7) Replace

```tsx
        </DataTableBody>
      </DataTable>

      <div data-supplier-mobile-list className="grid gap-3 bg-background p-3 md:hidden">
        {suppliers.map((supplier) => {
          const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
          return (
            <article key={supplier.id} className="rounded-lg border border-border bg-surface p-4">
              <Link href={hrefs.detail} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="text-xs text-muted-foreground">
                  <span className="tag font-medium">{supplier.code}</span>
                </div>
                <h2 className="mt-1 break-words text-base font-semibold text-primary">{supplier.name}</h2>
                {supplier.address ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{supplier.address}</p> : null}
              </Link>

              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{labels.contactPerson}</dt>
                  <dd className="break-words text-foreground">{orNil(supplier.contactPerson)}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{labels.phone}</dt>
                  <dd className="break-words text-foreground">{orNil(supplier.phone)}</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
                <RelationshipCount label={labels.assets} value={supplier._count.assets} href={supplier._count.assets > 0 ? hrefs.assets : undefined} />
```

with

```tsx
        </DataTableBody>
      </DataTable>

      {/* A card in a panel is a quiet grouping (2D-2 R4); its facts are the shared label and value list (spec 2D D19). */}
      <div data-supplier-mobile-list className="grid gap-3 p-3 md:hidden">
        {suppliers.map((supplier) => {
          const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
          return (
            <article key={supplier.id} className="min-w-0 rounded-md border border-border bg-background p-3">
              <Link href={hrefs.detail} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="text-meta text-muted-foreground">
                  <span className="tag font-medium">{supplier.code}</span>
                </div>
                <h2 className="mt-1 break-words text-base font-semibold text-primary">{supplier.name}</h2>
                {supplier.address ? <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">{supplier.address}</p> : null}
              </Link>

              <KeyValueList
                className="mt-3"
                items={[
                  { key: "contactPerson", label: labels.contactPerson, value: supplier.contactPerson },
                  { key: "phone", label: labels.phone, value: supplier.phone },
                ]}
              />

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
                <RelationshipCount label={labels.assets} value={supplier._count.assets} href={supplier._count.assets > 0 ? hrefs.assets : undefined} />
```

(8) Replace

```tsx
}

function RelationshipCount({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = <><span className="block text-base font-semibold text-foreground">{formatCount(value)}</span><span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{label}</span></>
  return href ? <Link href={href} aria-label={`${label}: ${formatCount(value)}`} className="min-h-11 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : <div className="min-h-11 px-1 py-1">{content}</div>
}
```

with

```tsx
}

function RelationshipCount({ label, value, href }: { label: string; value: number; href?: string }) {
  // A linked count reads as a link (primary), like the table's drill-down link.
  const content = <><span className={cn("num block text-base font-semibold", href ? "text-primary" : "text-foreground")}>{formatCount(value)}</span><span className="mt-0.5 block line-clamp-2 text-meta text-muted-foreground">{label}</span></>
  return href ? <Link href={href} aria-label={`${label}: ${formatCount(value)}`} className="min-h-11 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : <div className="min-h-11 px-1 py-1">{content}</div>
}
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/form-migration-guards.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-return-navigation.test.ts tests/master-data-sweep-ui.test.ts tests/master-data-workspace.test.ts tests/supplier-adaptive-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (145 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx" src/components/master-data/supplier-list-view.tsx tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx`, `src/components/master-data/supplier-list-view.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2082 tests, 2081 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx" src/components/master-data/supplier-list-view.tsx tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): the supplier list on the panel classes, a drill-down text link, and phone cards as quiet groupings with a KeyValueList (2D-3 task 17a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 17b: `D/master-data/suppliers/[id]/page.tsx`, `c/master-data/supplier-purchase-documents.tsx` (M32 a)

The five sections are `ContentPanel`s (`SectionTitle` goes; the "all assets" link is a text link in the panel's actions). The follow-ups are one warning `Notice` with a list, or a clear `EmptyNote` when there is nothing to do (no tinted rows, R4). The ticket rows are quiet grouping links with `hover:bg-row-hover`. An empty purchase document total stays `null` and shows `Nil` (M32 a, R8). The documents table has no frame of its own inside its panel (`framed={false}`), an empty date or total is `Nil`, and the phone cards are quiet groupings with a `KeyValueList` (`DocumentFact` goes, R12).

**Files:**
- Modify: `src/components/master-data/supplier-purchase-documents.tsx`, `src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)
- Modify (pins and unit tests): `tests/list-pages-ui.test.ts`, `tests/supplier-detail-ui.test.ts`
- Modify (guards): `tests/list-frame-guards.test.ts`

- [ ] **Step 1: The failing tests.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("supplier page: sections are ContentPanels, follow-ups a warning Notice or a clear EmptyNote, rows quiet, and an empty purchase document total is Nil (spec 2D D7, D9, D19, M32 a)", () => {
  const page = read(`${D}master-data/suppliers/[id]/page.tsx`)
  const documents = read("src/components/master-data/supplier-purchase-documents.tsx")
  assert.equal(page.match(/<ContentPanel\b/g)?.length, 5, "profile, follow-up, assets, purchase documents, maintenance")
  assert.match(page, /<EmptyNote tone="clear">\{t\("noFollowUp"\)\}<\/EmptyNote>/)
  assert.match(page, /<Notice tone="warning">\n\s+<ul className="list-disc space-y-1 pl-5">/)
  assert.match(page, /<Link href=\{hrefs\.assets\} className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.match(page, /totalAmount: document\.totalAmount == null \? null : Number\(document\.totalAmount\),/)
  assert.match(documents, /totalAmount: number \| null/)
  assert.match(documents, /<DataTable data-supplier-documents-desktop framed=\{false\} className="hidden md:block">/)
  assert.match(documents, /<article key=\{document\.id\} className="min-w-0 rounded-md border border-border bg-background p-3">/)
  assert.equal(documents.match(/<KeyValueList\b/g)?.length, 1)
  assert.doesNotMatch(page + documents, /function (?:SectionTitle|DocumentFact)\b|rounded-lg border|bg-(?:success|warning)-soft|hover:bg-accent|\btext-xs\b|document\.totalAmount \?\? 0/)
})
```

In `tests/list-pages-ui.test.ts` (CRLF):

Replace

```ts
// the number only.
test("supplier purchase documents: DataTable with right-aligned count and money columns, formatCount, formatMoney and Nil (spec 2B §5.5, §5.7)", () => {
  const source = read(`${C}master-data/supplier-purchase-documents.tsx`)
  assert.match(source, /<DataTable data-supplier-documents-desktop className="mt-4 hidden md:block">/)
  assert.match(source, /<DataTableHead align="right">\{labels\.linkedAssets\}<\/DataTableHead>/)
  assert.match(source, /<DataTableHead align="right">\{labels\.totalAmount\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{formatMoney\(document\.totalAmount\)\}<\/DataTableCell>/)
  assert.equal(source.match(/formatCount\(document\.linkedAssets\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/orNil\(documentReferences\(document\)\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/<span className="tag">\{document\.documentNo\}<\/span>/g)?.length, 2)
```

with

```ts
// the number only.
test("supplier purchase documents: DataTable with right-aligned count and money columns, formatCount, formatMoney and Nil (spec 2B §5.5, §5.7)", () => {
  const source = read(`${C}master-data/supplier-purchase-documents.tsx`)
  // Plan 2D-3: the table sits in the page's ContentPanel with no frame of its own, and an empty total is Nil (M32 a).
  assert.match(source, /<DataTable data-supplier-documents-desktop framed=\{false\} className="hidden md:block">/)
  assert.match(source, /<DataTableHead align="right">\{labels\.linkedAssets\}<\/DataTableHead>/)
  assert.match(source, /<DataTableHead align="right">\{labels\.totalAmount\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{orNil\(formatMoney\(document\.totalAmount\)\)\}<\/DataTableCell>/)
  assert.equal(source.match(/formatCount\(document\.linkedAssets\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/orNil\(documentReferences\(document\)\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/<span className="tag">\{document\.documentNo\}<\/span>/g)?.length, 2)
```

In `tests/supplier-detail-ui.test.ts` (CRLF):

Replace

```ts
  assert.match(documents, /md:hidden/)
  assert.match(documents, /<DataTable\b/)
  assert.match(documents, /<article/)
  assert.match(documents, /<dl/)
})

test("supplier detail uses a compact mobile metric strip", () => {
```

with

```ts
  assert.match(documents, /md:hidden/)
  assert.match(documents, /<DataTable\b/)
  assert.match(documents, /<article/)
  assert.match(documents, /<KeyValueList\b/)
})

test("supplier detail uses a compact mobile metric strip", () => {
```

Run: `node --test tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/supplier-detail-ui.test.ts`
Expected: 3 failures:
- "supplier purchase documents: DataTable with right-aligned count and money columns, formatCount, formatMoney and Nil (spec 2B §5.5, §5.7)"
- "supplier page: sections are ContentPanels, follow-ups a warning Notice or a clear EmptyNote, rows quiet, and an empty purchase document total is Nil (spec 2D D7, D9, D19, M32 a)"
- "purchase documents use adaptive desktop and mobile presentations"

- [ ] **Step 2: The purchase documents.** In `src/components/master-data/supplier-purchase-documents.tsx` (CRLF):

(1) Replace

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { orNil } from "@/components/ui/nil"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"
```

with

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { orNil } from "@/components/ui/nil"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"
```

(2) Replace

```tsx
  poNumber: string | null
  invoiceNumber: string | null
  documentDate: Date | null
  totalAmount: number
  currency: string | null
  linkedAssets: number
}
```

with

```tsx
  poNumber: string | null
  invoiceNumber: string | null
  documentDate: Date | null
  // null when the document has no total (spec 2D M32 a): it shows Nil, never 0.00.
  totalAmount: number | null
  currency: string | null
  linkedAssets: number
}
```

(3) Replace

```tsx

  return (
    <>
      <DataTable data-supplier-documents-desktop className="mt-4 hidden md:block">
        <DataTableHeader>
          <tr>
            <DataTableHead>{labels.documentNo}</DataTableHead>
```

with

```tsx

  return (
    <>
      {/* In the page's ContentPanel: the table has no frame of its own (no frame in a frame, 2D-2 R4). */}
      <DataTable data-supplier-documents-desktop framed={false} className="hidden md:block">
        <DataTableHeader>
          <tr>
            <DataTableHead>{labels.documentNo}</DataTableHead>
```

(4) Replace

```tsx
            <DataTableRow key={document.id}>
              <DataTableCell>
                <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
                <div className="text-xs text-muted-foreground">{orNil(documentReferences(document))}</div>
              </DataTableCell>
              <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(document.documentDate)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{formatCount(document.linkedAssets)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{formatMoney(document.totalAmount)}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <div data-supplier-documents-mobile className="mt-4 grid gap-3 md:hidden">
        {documents.map((document) => (
          <article key={document.id} className="rounded-lg border border-border bg-background p-4">
            <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
            <div className="mt-1 text-xs text-muted-foreground">{orNil(documentReferences(document))}</div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DocumentFact label={labels.documentDate} value={formatDate(document.documentDate)} />
              <DocumentFact label={labels.linkedAssets} value={formatCount(document.linkedAssets)} />
              <DocumentFact
                label={labels.totalAmount}
                value={formatMoney(document.totalAmount)}
                className="col-span-2"
              />
            </dl>
          </article>
        ))}
      </div>
```

with

```tsx
            <DataTableRow key={document.id}>
              <DataTableCell>
                <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
                <div className="text-meta text-muted-foreground">{orNil(documentReferences(document))}</div>
              </DataTableCell>
              <DataTableCell className="whitespace-nowrap text-muted-foreground">{orNil(document.documentDate ? formatDate(document.documentDate) : null)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{formatCount(document.linkedAssets)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{orNil(formatMoney(document.totalAmount))}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* A card in a panel is a quiet grouping (2D-2 R4); its facts are the shared label and value list (spec 2D D19). */}
      <div data-supplier-documents-mobile className="grid gap-3 md:hidden">
        {documents.map((document) => (
          <article key={document.id} className="min-w-0 rounded-md border border-border bg-background p-3">
            <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
            <div className="mt-1 text-meta text-muted-foreground">{orNil(documentReferences(document))}</div>
            <KeyValueList
              className="mt-3"
              items={[
                { key: "documentDate", label: labels.documentDate, value: document.documentDate ? formatDate(document.documentDate) : null },
                { key: "linkedAssets", label: labels.linkedAssets, value: formatCount(document.linkedAssets) },
                { key: "totalAmount", label: labels.totalAmount, value: formatMoney(document.totalAmount) },
              ]}
            />
          </article>
        ))}
      </div>
```

(5) Replace

```tsx
  )
}

function DocumentFact({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  )
}

function documentReferences(document: Pick<SupplierPurchaseDocumentItem, "poNumber" | "invoiceNumber">) {
  return [document.poNumber, document.invoiceNumber].filter(Boolean).join(" / ")
}
```

with

```tsx
  )
}

function documentReferences(document: Pick<SupplierPurchaseDocumentItem, "poNumber" | "invoiceNumber">) {
  return [document.poNumber, document.invoiceNumber].filter(Boolean).join(" / ")
}
```

- [ ] **Step 3: The supplier page.** In `src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx` (CRLF):

(1) Replace

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
```

with

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
```

(2) Replace

```tsx
  type SupplierFollowUpKey,
} from "@/lib/supplier-detail"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
```

with

```tsx
  type SupplierFollowUpKey,
} from "@/lib/supplier-detail"
import { formatCount, formatMoney } from "@/lib/display-format"
import { cn, formatDate } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
```

(3) Replace

```tsx

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("profileTitle")} />
            <KeyValueList
              className="mt-4"
              items={[
                { key: "contactPerson", label: t("contactPerson"), value: supplier.contactPerson },
                { key: "phone", label: t("phone"), value: supplier.phone },
```

with

```tsx

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <ContentPanel title={t("profileTitle")}>
            <KeyValueList
              items={[
                { key: "contactPerson", label: t("contactPerson"), value: supplier.contactPerson },
                { key: "phone", label: t("phone"), value: supplier.phone },
```

(4) Replace

```tsx
                { key: "address", label: t("address"), value: supplier.address },
              ]}
            />
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("followUpTitle")} />
            {followUpItems.length === 0 ? (
              <div className="mt-4 rounded-md border border-success-border bg-success-soft p-3 text-sm text-success">
                {t("noFollowUp")}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {followUpItems.map((item) => (
                  <div key={item} className="flex gap-2 rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-warning">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{followUpText(item, t)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("linkedAssetsTitle")} actionHref={hrefs.assets} actionLabel={t("viewAllAssets")} />
            {assets.length === 0 ? (
              <ActionEmptyState title={t("noAssets")} description={t("noAssetsHelp")} />
            ) : (
              <div className="mt-4 divide-y divide-border">
                {assets.map((asset) => (
                  <Link key={asset.id} href={`/${locale}/assets/${asset.id}`} className="flex min-h-11 flex-col gap-2 py-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="block font-medium text-primary"><span className="tag">{asset.assetTag}</span> - {asset.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        <span className="tag">{asset.category.code}</span> - {asset.category.name} / <span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}
                      </span>
                    </span>
```

with

```tsx
                { key: "address", label: t("address"), value: supplier.address },
              ]}
            />
          </ContentPanel>

          {/* Nothing to follow up is a clear note; what is left is one warning Notice (spec 2D D7), with no tinted rows. */}
          <ContentPanel title={t("followUpTitle")}>
            {followUpItems.length === 0 ? (
              <EmptyNote tone="clear">{t("noFollowUp")}</EmptyNote>
            ) : (
              <Notice tone="warning">
                <ul className="list-disc space-y-1 pl-5">
                  {followUpItems.map((item) => (
                    <li key={item}>{followUpText(item, t)}</li>
                  ))}
                </ul>
              </Notice>
            )}
          </ContentPanel>
        </div>

        <div className="space-y-6">
          <ContentPanel
            title={t("linkedAssetsTitle")}
            actions={
              <Link href={hrefs.assets} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                {t("viewAllAssets")}
              </Link>
            }
          >
            {assets.length === 0 ? (
              <ActionEmptyState title={t("noAssets")} description={t("noAssetsHelp")} />
            ) : (
              <div className="divide-y divide-border">
                {assets.map((asset) => (
                  <Link key={asset.id} href={`/${locale}/assets/${asset.id}`} className="flex min-h-11 flex-col gap-2 py-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="block font-medium text-primary"><span className="tag">{asset.assetTag}</span> - {asset.name}</span>
                      <span className="mt-1 block text-meta text-muted-foreground">
                        <span className="tag">{asset.category.code}</span> - {asset.category.name} / <span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}
                      </span>
                    </span>
```

(5) Replace

```tsx
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("purchaseDocumentsTitle")} />
            <SupplierPurchaseDocuments
              documents={purchaseDocuments.map((document) => ({
                id: document.id,
```

with

```tsx
                ))}
              </div>
            )}
          </ContentPanel>

          <ContentPanel title={t("purchaseDocumentsTitle")}>
            <SupplierPurchaseDocuments
              documents={purchaseDocuments.map((document) => ({
                id: document.id,
```

(6) Replace

```tsx
                poNumber: document.poNumber,
                invoiceNumber: document.invoiceNumber,
                documentDate: document.documentDate,
                totalAmount: Number(document.totalAmount ?? 0),
                currency: document.currency,
                linkedAssets: document._count.assetLinks,
              }))}
```

with

```tsx
                poNumber: document.poNumber,
                invoiceNumber: document.invoiceNumber,
                documentDate: document.documentDate,
                // An empty total stays null and shows Nil, not 0.00 (spec 2D M32 a).
                totalAmount: document.totalAmount == null ? null : Number(document.totalAmount),
                currency: document.currency,
                linkedAssets: document._count.assetLinks,
              }))}
```

(7) Replace

```tsx
                noPurchaseDocumentsHelp: t("noPurchaseDocumentsHelp"),
              }}
            />
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("maintenanceHistoryTitle")} />
            {maintenanceTickets.length === 0 ? (
              <ActionEmptyState title={t("noMaintenance")} description={t("noMaintenanceHelp")} />
            ) : (
              <div className="mt-4 space-y-3">
                {maintenanceTickets.map((ticket) => (
                  <Link key={ticket.id} href={`/${locale}/maintenance/${ticket.id}`} className="block min-h-11 rounded-md border border-border bg-background p-3 transition-colors hover:border-primary-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-primary"><span className="tag">{ticket.repairNo}</span> - <span className="tag">{ticket.asset.assetTag}</span></div>
                        <div className="mt-1 text-sm text-foreground">{ticket.asset.name}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.problem}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                        <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                        <span className="text-xs text-muted-foreground num">{ticket.repairCost == null ? <Nil /> : formatMoney(Number(ticket.repairCost), { unit: tCommon("baht") })}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{t("reportedDate")}: {formatDate(ticket.reportedDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-primary hover:bg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

function followUpText(item: SupplierFollowUpKey, t: (key: string) => string) {
  if (item === "missing_contact") return t("followUpMissingContact")
  if (item === "assets_without_purchase_documents") return t("followUpAssetsWithoutPurchaseDocuments")
```

with

```tsx
                noPurchaseDocumentsHelp: t("noPurchaseDocumentsHelp"),
              }}
            />
          </ContentPanel>

          <ContentPanel title={t("maintenanceHistoryTitle")}>
            {maintenanceTickets.length === 0 ? (
              <ActionEmptyState title={t("noMaintenance")} description={t("noMaintenanceHelp")} />
            ) : (
              <div className="space-y-3">
                {/* Each ticket is a quiet grouping link (2D-2 R4) with the shared row hover. */}
                {maintenanceTickets.map((ticket) => (
                  <Link key={ticket.id} href={`/${locale}/maintenance/${ticket.id}`} className="block min-h-11 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-primary"><span className="tag">{ticket.repairNo}</span> - <span className="tag">{ticket.asset.assetTag}</span></div>
                        <div className="mt-1 text-sm text-foreground">{ticket.asset.name}</div>
                        <div className="mt-1 line-clamp-2 text-meta text-muted-foreground">{ticket.problem}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                        <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                        <span className="text-meta text-muted-foreground num">{ticket.repairCost == null ? <Nil /> : formatMoney(Number(ticket.repairCost), { unit: tCommon("baht") })}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted-foreground">
                      <span>{t("reportedDate")}: {formatDate(ticket.reportedDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ContentPanel>
        </div>
      </div>
    </div>
  )
}

function followUpText(item: SupplierFollowUpKey, t: (key: string) => string) {
  if (item === "missing_contact") return t("followUpMissingContact")
  if (item === "assets_without_purchase_documents") return t("followUpAssetsWithoutPurchaseDocuments")
```

- [ ] **Step 4: The guard rows (R16).** LFG: `DocumentFact` joins `LOCAL_KEY_VALUE`.

In `tests/list-frame-guards.test.ts` (CRLF):

Replace

```ts
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager), MobileField (my assets).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem|MobileField)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
```

with

```ts
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager), MobileField (my assets),
// DocumentFact (a supplier's purchase documents).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem|MobileField|DocumentFact)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
```

- [ ] **Step 5: Check.**
  - Run `node --test tests/breadcrumbs-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/supplier-detail-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (135 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx" src/components/master-data/supplier-purchase-documents.tsx tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/supplier-detail-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx`, `src/components/master-data/supplier-purchase-documents.tsx`, `tests/list-frame-guards.test.ts`, `tests/list-pages-ui.test.ts`, `tests/supplier-detail-ui.test.ts`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2083 tests, 2082 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 6: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx" src/components/master-data/supplier-purchase-documents.tsx tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/supplier-detail-ui.test.ts
git commit -m "fix(ui): the supplier page on ContentPanel, a warning Notice or clear EmptyNote for follow-ups, quiet rows, KeyValueList document facts, and an empty purchase document total as Nil (2D-3 task 17b, M32 a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: The employee page (`D/master-data/employees/[id]/page.tsx`)

Spec D7, D9, M21, M33; R1, R4. One commit. The eight sections are `ContentPanel`s with the heading's title and help (`SectionHeading`, its icons and `import type React` go). Each follow-up is a warning `Notice` with its title and help; "no subordinates" and an empty mini list are `EmptyNote`; the subordinate's code is a `tag`; the four table links are `linkVariants({ size: "inherit" })`; the subordinate and mini-list rows share one quiet grouping link class with `hover:bg-row-hover`; the mini-list title is an `h3`.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("employee page: sections are ContentPanels, follow-ups warning Notices, empties EmptyNote, codes tag, table links text links and quiet row links (spec 2D D7, D9, M21, M33)", () => {
  const source = read(`${D}master-data/employees/[id]/page.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 8)
  assert.match(source, /<Notice key=\{item\} tone="warning" title=\{t\(`followUp\.\$\{item\}\.title`\)\}>/)
  assert.equal(source.match(/<EmptyNote>/g)?.length, 2, "no subordinates, and an empty mini list")
  assert.equal(source.match(/className=\{linkVariants\(\{ size: "inherit" \}\)\}/g)?.length, 4, "the four table links")
  assert.equal(source.match(/className=\{quietRowLinkClasses\}/g)?.length, 2, "the subordinate and mini list rows, on the shared row hover")
  assert.match(source, /<span className="tag">\{subordinate\.code\}<\/span>/)
  assert.doesNotMatch(source, /function SectionHeading\b|rounded-lg border|border-dashed|bg-warning-soft|hover:bg-primary-soft|hover:border-primary-border|hover:underline|\btext-xs\b|\btext-lg\b/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "employee page: sections are ContentPanels, follow-ups warning Notices, empties EmptyNote, codes tag, table links text links and quiet row links (spec 2D D7, D9, M21, M33)"

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx` (CRLF):

(1) Replace

```tsx
import type React from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  Edit,
  History,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  Wrench,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildEmployeeDetailHrefs, buildEmployeeDetailSummary, buildEmployeeFollowUpItems, dedupeEmployeeMaintenanceLinks } from "@/lib/employee-detail"
import { formatDate, formatDateTime } from "@/lib/utils"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
```

with

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Boxes, Edit, History, ShieldCheck, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildEmployeeDetailHrefs, buildEmployeeDetailSummary, buildEmployeeFollowUpItems, dedupeEmployeeMaintenanceLinks } from "@/lib/employee-detail"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
```

(2) Replace

```tsx
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"
import { getAuditRoundItemResultLabelKey } from "@/lib/audit-round-result-filters"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
```

with

```tsx
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"
import { getAuditRoundItemResultLabelKey } from "@/lib/audit-round-result-filters"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
```

(3) Replace

```tsx

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6">
            <SectionHeading icon={<UserRound className="h-5 w-5 text-primary" />} title={t("detailProfileTitle")} subtitle={t("detailProfileHelp")} />
            <KeyValueList
              items={[
                { key: "company", label: t("company"), value: <><span className="tag">{employee.company.code}</span> - {employee.company.nameTh}</> },
```

with

```tsx

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ContentPanel title={t("detailProfileTitle")} description={t("detailProfileHelp")}>
            <KeyValueList
              items={[
                { key: "company", label: t("company"), value: <><span className="tag">{employee.company.code}</span> - {employee.company.nameTh}</> },
```

(4) Replace

```tsx
                { key: "employmentStatus", label: t("employmentStatus"), value: <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employee.employmentStatus === "active" ? "success" : "warning"} /> },
              ]}
            />
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <SectionHeading icon={<Boxes className="h-5 w-5 text-primary" />} title={t("detailCurrentAssets")} subtitle={t("detailCurrentAssetsSectionHelp", { shown: currentAssets.length, total: currentAssetCount })} />
            {currentAssets.length === 0 ? (
              <ActionEmptyState icon={<Boxes className="h-6 w-6" />} title={t("emptyCurrentAssetsTitle")} description={t("emptyCurrentAssetsHelp")} />
            ) : (
```

with

```tsx
                { key: "employmentStatus", label: t("employmentStatus"), value: <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employee.employmentStatus === "active" ? "success" : "warning"} /> },
              ]}
            />
          </ContentPanel>

          <ContentPanel title={t("detailCurrentAssets")} description={t("detailCurrentAssetsSectionHelp", { shown: currentAssets.length, total: currentAssetCount })}>
            {currentAssets.length === 0 ? (
              <ActionEmptyState icon={<Boxes className="h-6 w-6" />} title={t("emptyCurrentAssetsTitle")} description={t("emptyCurrentAssetsHelp")} />
            ) : (
```

(5) Replace

```tsx
                  {currentAssets.map((asset) => (
                    <DataTableRow key={asset.id}>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                          <span className="tag">{asset.assetTag}</span>
                        </Link>
                      </DataTableCell>
```

with

```tsx
                  {currentAssets.map((asset) => (
                    <DataTableRow key={asset.id}>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <Link href={`/${locale}/assets/${asset.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{asset.assetTag}</span>
                        </Link>
                      </DataTableCell>
```

(6) Replace

```tsx
                </Link>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <SectionHeading icon={<History className="h-5 w-5 text-primary" />} title={t("handoverHistoryTitle")} subtitle={t("handoverHistoryHelp")} />
            {checkoutHistory.length === 0 ? (
              <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("emptyHandoverTitle")} description={t("emptyHandoverHelp")} />
            ) : (
```

with

```tsx
                </Link>
              </div>
            ) : null}
          </ContentPanel>

          <ContentPanel title={t("handoverHistoryTitle")} description={t("handoverHistoryHelp")}>
            {checkoutHistory.length === 0 ? (
              <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("emptyHandoverTitle")} description={t("emptyHandoverHelp")} />
            ) : (
```

(7) Replace

```tsx
                    <DataTableRow key={checkout.id}>
                      <DataTableCell className="whitespace-nowrap font-medium text-foreground">{checkout.documentNo ? <span className="tag">{checkout.documentNo}</span> : <Nil />}</DataTableCell>
                      <DataTableCell className="min-w-56">
                        <Link href={`/${locale}/assets/${checkout.asset.id}`} className="text-primary hover:underline">
                          <span className="tag">{checkout.asset.assetTag}</span> - {checkout.asset.name}
                        </Link>
                      </DataTableCell>
```

with

```tsx
                    <DataTableRow key={checkout.id}>
                      <DataTableCell className="whitespace-nowrap font-medium text-foreground">{checkout.documentNo ? <span className="tag">{checkout.documentNo}</span> : <Nil />}</DataTableCell>
                      <DataTableCell className="min-w-56">
                        <Link href={`/${locale}/assets/${checkout.asset.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{checkout.asset.assetTag}</span> - {checkout.asset.name}
                        </Link>
                      </DataTableCell>
```

(8) Replace

```tsx
                </DataTableBody>
              </DataTable>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <SectionHeading icon={<Wrench className="h-5 w-5 text-primary" />} title={t("maintenanceRelatedTitle")} subtitle={t("maintenanceRelatedHelp")} />
            {maintenanceTickets.length === 0 ? (
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyMaintenanceTitle")} description={t("emptyMaintenanceHelp")} />
            ) : (
```

with

```tsx
                </DataTableBody>
              </DataTable>
            )}
          </ContentPanel>

          <ContentPanel title={t("maintenanceRelatedTitle")} description={t("maintenanceRelatedHelp")}>
            {maintenanceTickets.length === 0 ? (
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyMaintenanceTitle")} description={t("emptyMaintenanceHelp")} />
            ) : (
```

(9) Replace

```tsx
                  {maintenanceTickets.map((ticket) => (
                    <DataTableRow key={ticket.id}>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <Link href={`/${locale}/maintenance/${ticket.id}`} className="text-primary hover:underline">
                          <span className="tag">{ticket.repairNo}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-56">
                        <Link href={`/${locale}/assets/${ticket.asset.id}`} className="text-primary hover:underline">
                          <span className="tag">{ticket.asset.assetTag}</span> - {ticket.asset.name}
                        </Link>
                      </DataTableCell>
```

with

```tsx
                  {maintenanceTickets.map((ticket) => (
                    <DataTableRow key={ticket.id}>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <Link href={`/${locale}/maintenance/${ticket.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{ticket.repairNo}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-56">
                        <Link href={`/${locale}/assets/${ticket.asset.id}`} className={linkVariants({ size: "inherit" })}>
                          <span className="tag">{ticket.asset.assetTag}</span> - {ticket.asset.name}
                        </Link>
                      </DataTableCell>
```

(10) Replace

```tsx
                </DataTableBody>
              </DataTable>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6">
            <SectionHeading icon={<AlertTriangle className="h-5 w-5 text-primary" />} title={t("followUpTitle")} subtitle={t("followUpHelp")} />
            {followUpItems.length === 0 ? (
              <ActionEmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t("followUpEmptyTitle")} description={t("followUpEmptyHelp")} />
            ) : (
              <div className="space-y-3">
                {followUpItems.map((item) => (
                  <div key={item} className="rounded-md border border-warning-border bg-warning-soft p-3">
                    <div className="text-sm font-semibold text-foreground">{t(`followUp.${item}.title`)}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t(`followUp.${item}.help`)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <SectionHeading icon={<Users className="h-5 w-5 text-primary" />} title={t("subordinatesTitle")} />
            {employee.subordinates.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("noSubordinates")}</div>
            ) : (
              <div className="space-y-3">
                {employee.subordinates.map((subordinate) => (
                  <Link key={subordinate.id} href={`/${locale}/master-data/employees/${subordinate.id}`} className="block rounded-md border border-border bg-background p-3 transition-colors hover:border-primary-border hover:bg-primary-soft">
                    <div className="text-sm font-semibold text-foreground">{subordinate.code} - {subordinate.fullNameTh}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{orNil(subordinate.position)}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <SectionHeading icon={<ClipboardCheck className="h-5 w-5 text-primary" />} title={t("auditRelatedTitle")} subtitle={t("auditRelatedHelp")} />
            <div className="space-y-4">
              <MiniList
                title={t("auditFindingsTitle")}
```

with

```tsx
                </DataTableBody>
              </DataTable>
            )}
          </ContentPanel>
        </div>

        <aside className="space-y-6">
          <ContentPanel title={t("followUpTitle")} description={t("followUpHelp")}>
            {followUpItems.length === 0 ? (
              <ActionEmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t("followUpEmptyTitle")} description={t("followUpEmptyHelp")} />
            ) : (
              <div className="space-y-3">
                {/* Each item is something to deal with now: a warning Notice, its help as the second line (spec 2D D7). */}
                {followUpItems.map((item) => (
                  <Notice key={item} tone="warning" title={t(`followUp.${item}.title`)}>
                    {t(`followUp.${item}.help`)}
                  </Notice>
                ))}
              </div>
            )}
          </ContentPanel>

          <ContentPanel title={t("subordinatesTitle")}>
            {employee.subordinates.length === 0 ? (
              <EmptyNote>{t("noSubordinates")}</EmptyNote>
            ) : (
              <div className="space-y-3">
                {employee.subordinates.map((subordinate) => (
                  <Link key={subordinate.id} href={`/${locale}/master-data/employees/${subordinate.id}`} className={quietRowLinkClasses}>
                    <div className="text-sm font-semibold text-foreground"><span className="tag">{subordinate.code}</span> - {subordinate.fullNameTh}</div>
                    <div className="mt-1 text-meta text-muted-foreground">{orNil(subordinate.position)}</div>
                  </Link>
                ))}
              </div>
            )}
          </ContentPanel>

          <ContentPanel title={t("auditRelatedTitle")} description={t("auditRelatedHelp")}>
            <div className="space-y-4">
              <MiniList
                title={t("auditFindingsTitle")}
```

(11) Replace

```tsx
                }))}
              />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <SectionHeading icon={<Trash2 className="h-5 w-5 text-primary" />} title={t("disposalRelatedTitle")} subtitle={t("disposalRelatedHelp")} />
            <MiniList
              emptyLabel={t("emptyDisposals")}
              items={disposalRequests.map((request) => ({
```

with

```tsx
                }))}
              />
            </div>
          </ContentPanel>

          <ContentPanel title={t("disposalRelatedTitle")} description={t("disposalRelatedHelp")}>
            <MiniList
              emptyLabel={t("emptyDisposals")}
              items={disposalRequests.map((request) => ({
```

(12) Replace

```tsx
                tone: request.requestStatus === "rejected" ? "danger" : request.requestStatus === "disposed" ? "success" : "warning",
              }))}
            />
          </section>
        </aside>
      </div>
    </div>
  )
}

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
}

function MiniList({
  title,
```

with

```tsx
                tone: request.requestStatus === "rejected" ? "danger" : request.requestStatus === "disposed" ? "success" : "warning",
              }))}
            />
          </ContentPanel>
        </aside>
      </div>
    </div>
  )
}

// A row link in a panel is a quiet grouping (2D-2 R4) with the shared row hover.
const quietRowLinkClasses = cn(
  "block rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
)

function MiniList({
  title,
```

(13) Replace

```tsx
}) {
  return (
    <div>
      {title ? <div className="mb-2 text-sm font-semibold text-foreground">{title}</div> : null}
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="block rounded-md border border-border bg-background p-3 transition-colors hover:border-primary-border hover:bg-primary-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.meta}</div>
                </div>
                {item.badge ? <StatusBadge label={item.badge} tone={item.tone} /> : null}
              </div>
```

with

```tsx
}) {
  return (
    <div>
      {title ? <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3> : null}
      {items.length === 0 ? (
        <EmptyNote>{emptyLabel}</EmptyNote>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className={quietRowLinkClasses}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-meta text-muted-foreground">{item.meta}</div>
                </div>
                {item.badge ? <StatusBadge label={item.badge} tone={item.tone} /> : null}
              </div>
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/audit-item-status-labels.test.ts tests/breadcrumbs-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/master-data-sweep-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (141 tests).
  - Run `node <temp>/eol.mjs "src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx" tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2084 tests, 2083 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx" tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): the employee page on ContentPanel, warning Notices for follow-ups, EmptyNote, tag codes, text links and quiet row links (2D-3 task 18)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: The master-data forms

Spec D9, D7, M21; R1. Three commits. A `<form>` cannot be a `ContentPanel`, so a form that is one panel takes `cn(getPanelClasses(), "p-4 sm:p-5")` (was `rounded-lg border border-border bg-surface p-6`); a form with several panels wraps them in `ContentPanel`s. The active checkbox rows stay quiet groupings with their raw `<input type="checkbox">` (pinned by each form's own test).

#### 19a: `c/master-data/asset-model-form.tsx`

The form takes the panel classes; the photo section is a `ContentPanel` with its title and help (the icon goes); the dropzone loses the box around it; "save the model before adding a photo" is a neutral `Notice` (a condition before acting, R4); "no spec rows" and "no model photo" are `EmptyNote`s; the photo card's small lines are `text-meta`.

**Files:**
- Modify: `src/components/master-data/asset-model-form.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("asset model form: the form on the panel classes, the photo panel a ContentPanel, empties EmptyNote, the save-first note a neutral Notice, and no box around the dropzone (spec 2D D7, D9, M21)", () => {
  const source = read("src/components/master-data/asset-model-form.tsx")
  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<ContentPanel title=\{t\("modelPhoto"\)\} description=\{t\("modelPhotoHelp"\)\}>/)
  assert.match(source, /<Notice tone="neutral" className="mb-4">\{t\("saveModelBeforePhoto"\)\}<\/Notice>/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 2, "no spec rows, no model photo")
  assert.doesNotMatch(source, /rounded-lg border|border-dashed|\btext-xs\b|\btext-lg\b|rounded-md border border-border bg-background p-3/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "asset model form: the form on the panel classes, the photo panel a ContentPanel, empties EmptyNote, the save-first note a neutral Notice, and no box around the dropzone (spec 2D D7, D9, M21)"

- [ ] **Step 2: The form.** In `src/components/master-data/asset-model-form.tsx` (CRLF):

(1) Replace

```tsx
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import Link from "next/link"
import { formatFileSize } from "@/lib/uploads"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import {
```

with

```tsx
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import Link from "next/link"
import { getPanelClasses } from "@/lib/design-system"
import { formatFileSize } from "@/lib/uploads"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import {
```

(2) Replace

```tsx
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("modelName")} required>
            <Input
```

with

```tsx
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* A <form> cannot be ContentPanel: the panel classes and its spacing (2D-2 R4, spec 2D D9). */}
        <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("modelName")} required>
            <Input
```

(3) Replace

```tsx

              <div className="space-y-2">
                {structuredSpecs.items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
                    {t("specsEmpty")}
                  </div>
                ) : null}
                {structuredSpecs.items.map((item) => (
                  <div key={item.id} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
```

with

```tsx

              <div className="space-y-2">
                {structuredSpecs.items.length === 0 ? (
                  <EmptyNote>{t("specsEmpty")}</EmptyNote>
                ) : null}
                {structuredSpecs.items.map((item) => (
                  <div key={item.id} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
```

(4) Replace

```tsx
          </div>
        </form>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <ImageIcon className="h-5 w-5 text-primary" />
            {t("modelPhoto")}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("modelPhotoHelp")}</p>

          {model?.id ? (
            <div className="mb-4 rounded-md border border-border bg-background p-3">
              <FileDropzone
                file={selectedPhoto}
                onFileChange={handlePhotoUpload}
```

with

```tsx
          </div>
        </form>

        <ContentPanel title={t("modelPhoto")} description={t("modelPhotoHelp")}>
          {/* The dropzone draws its own box: no frame around it (2D-2 R4). Saving first is a condition, a neutral Notice (D7). */}
          {model?.id ? (
            <div className="mb-4">
              <FileDropzone
                file={selectedPhoto}
                onFileChange={handlePhotoUpload}
```

(5) Replace

```tsx
              />
            </div>
          ) : (
            <div className="mb-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("saveModelBeforePhoto")}
            </div>
          )}

          {modelPhotos.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("noModelPhoto")}
            </div>
          ) : (
            <div className="space-y-3">
              {modelPhotos.map((photo, index) => {
```

with

```tsx
              />
            </div>
          ) : (
            <Notice tone="neutral" className="mb-4">{t("saveModelBeforePhoto")}</Notice>
          )}

          {modelPhotos.length === 0 ? (
            <EmptyNote>{t("noModelPhoto")}</EmptyNote>
          ) : (
            <div className="space-y-3">
              {modelPhotos.map((photo, index) => {
```

(6) Replace

```tsx
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                          <span className="max-w-full truncate px-4 text-xs">{photo.originalName}</span>
                        </div>
                      )}
                    </div>
```

with

```tsx
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <ImageIcon aria-hidden="true" className="size-8" />
                          <span className="max-w-full truncate px-4 text-meta">{photo.originalName}</span>
                        </div>
                      )}
                    </div>
```

(7) Replace

```tsx
                          <div className="text-sm font-medium text-foreground">
                            {index === 0 ? t("primaryModelPhoto") : photo.originalName}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{formatFileSize(photo.fileSize)}</div>
                        </div>
                        <Button
                          variant="danger"
```

with

```tsx
                          <div className="text-sm font-medium text-foreground">
                            {index === 0 ? t("primaryModelPhoto") : photo.originalName}
                          </div>
                          <div className="mt-1 text-meta text-muted-foreground">{formatFileSize(photo.fileSize)}</div>
                        </div>
                        <Button
                          variant="danger"
```

(8) Replace

```tsx
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
```

with

```tsx
              })}
            </div>
          )}
        </ContentPanel>
      </div>
    </div>
  )
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/button-size-switch.test.ts tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-sweep-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (97 tests).
  - Run `node <temp>/eol.mjs src/components/master-data/asset-model-form.tsx tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/components/master-data/asset-model-form.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2085 tests, 2084 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/master-data/asset-model-form.tsx tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): the asset model form on the panel classes, a photo ContentPanel, EmptyNote and a neutral save-first Notice, with no box around the dropzone (2D-3 task 19a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 19b: `c/master-data/category-form.tsx`

Its three sections are `ContentPanel`s: the fields, then the custom field template and the photo checklist, whose add buttons move into the panel's `actions` (unchanged `Button`s). The two empty templates are `EmptyNote`. The field cards stay quiet groupings.

**Files:**
- Modify: `src/components/master-data/category-form.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("category form: three ContentPanels with the add buttons as panel actions, and EmptyNote for empty templates (spec 2D D9, M21)", () => {
  const source = read("src/components/master-data/category-form.tsx")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3, "the fields, the custom field template, the photo checklist")
  assert.match(source, /<ContentPanel\n\s+title=\{t\("customFieldTemplate"\)\}\n\s+description=\{t\("customFieldTemplateHelp"\)\}\n\s+actions=\{/)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("photoChecklistTemplate"\)\}\n\s+description=\{t\("photoChecklistTemplateHelp"\)\}\n\s+actions=\{/)
  assert.equal(source.match(/<EmptyNote>\{labels\.empty\}<\/EmptyNote>/g)?.length, 2)
  assert.doesNotMatch(source, /rounded-lg border|border-dashed|\btext-lg\b|<section\b/)
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "category form: three ContentPanels with the add buttons as panel actions, and EmptyNote for empty templates (spec 2D D9, M21)"

- [ ] **Step 2: The form.** In `src/components/master-data/category-form.tsx` (CRLF):

(1) Replace

```tsx
  type CategoryCustomFieldDraft,
} from "@/lib/category-form-arrays"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
```

with

```tsx
  type CategoryCustomFieldDraft,
} from "@/lib/category-form-arrays"
import { Button, buttonVariants } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
```

(2) Replace

```tsx
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

with

```tsx
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <ContentPanel>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

(3) Replace

```tsx
            {tCommon("active")}
          </label>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("customFieldTemplate")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("customFieldTemplateHelp")}</p>
            </div>
            <Button
              variant="outline"
              size="md"
```

with

```tsx
            {tCommon("active")}
          </label>
          </div>
        </ContentPanel>

        <ContentPanel
          title={t("customFieldTemplate")}
          description={t("customFieldTemplateHelp")}
          actions={
            <Button
              variant="outline"
              size="md"
```

(4) Replace

```tsx
              <Plus aria-hidden="true" />
              {t("addCustomField")}
            </Button>
          </div>

          <CustomFieldTemplateEditor
            fields={values.customFieldDefs}
            labels={{
```

with

```tsx
              <Plus aria-hidden="true" />
              {t("addCustomField")}
            </Button>
          }
        >
          <CustomFieldTemplateEditor
            fields={values.customFieldDefs}
            labels={{
```

(5) Replace

```tsx
            }}
            onChange={setCustomFields}
          />
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("photoChecklistTemplate")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("photoChecklistTemplateHelp")}</p>
            </div>
            <Button variant="outline" size="md" onClick={() => setPhotoChecklist([...values.photoChecklist, ""])}>
              <Plus aria-hidden="true" />
              {t("addPhotoChecklist")}
            </Button>
          </div>

          <PhotoChecklistEditor
            items={values.photoChecklist}
            labels={{
```

with

```tsx
            }}
            onChange={setCustomFields}
          />
        </ContentPanel>

        <ContentPanel
          title={t("photoChecklistTemplate")}
          description={t("photoChecklistTemplateHelp")}
          actions={
            <Button variant="outline" size="md" onClick={() => setPhotoChecklist([...values.photoChecklist, ""])}>
              <Plus aria-hidden="true" />
              {t("addPhotoChecklist")}
            </Button>
          }
        >
          <PhotoChecklistEditor
            items={values.photoChecklist}
            labels={{
```

(6) Replace

```tsx
            }}
            onChange={setPhotoChecklist}
          />
        </section>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
```

with

```tsx
            }}
            onChange={setPhotoChecklist}
          />
        </ContentPanel>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
```

(7) Replace

```tsx
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {labels.empty}
      </div>
    )
  }

  return (
```

with

```tsx
  }

  if (fields.length === 0) {
    return <EmptyNote>{labels.empty}</EmptyNote>
  }

  return (
```

(8) Replace

```tsx
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {labels.empty}
      </div>
    )
  }

  return (
```

with

```tsx
  }

  if (items.length === 0) {
    return <EmptyNote>{labels.empty}</EmptyNote>
  }

  return (
```

- [ ] **Step 3: Check.**
  - Run `node --test tests/button-size-switch.test.ts tests/category-form-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-sweep-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (91 tests).
  - Run `node <temp>/eol.mjs src/components/master-data/category-form.tsx tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/components/master-data/category-form.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2086 tests, 2085 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/master-data/category-form.tsx tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): the category form on ContentPanels with the add buttons as panel actions, and EmptyNote for empty templates (2D-3 task 19b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 19c: the seven simple forms

`branch-form.tsx`, `brand-form.tsx`, `company-form.tsx`, `department-form.tsx`, `employee-form.tsx`, `location-form.tsx` and `supplier-form.tsx` in `src/components/master-data/`: each imports `getPanelClasses` and `cn` after its `useApiError` import and draws its `<form>` with `cn(getPanelClasses(), "p-4 sm:p-5")`.

**Files:**
- Modify: `src/components/master-data/branch-form.tsx`, `src/components/master-data/brand-form.tsx`, `src/components/master-data/company-form.tsx`, `src/components/master-data/department-form.tsx`, `src/components/master-data/employee-form.tsx`, `src/components/master-data/location-form.tsx`, `src/components/master-data/supplier-form.tsx`
- Modify: `tests/master-data-sweep-ui.test.ts` (append)

- [ ] **Step 1: The failing test.** Append to `tests/master-data-sweep-ui.test.ts`:

```ts

test("the seven simple master-data forms: a <form> cannot be ContentPanel, so it takes the panel classes and the one panel spacing (spec 2D D9, 2D-2 R4)", () => {
  for (const name of ["branch", "brand", "company", "department", "employee", "location", "supplier"]) {
    const source = read(`src/components/master-data/${name}-form.tsx`)
    assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)
    assert.doesNotMatch(source, /rounded-lg border/, name)
  }
})
```

Run: `node --test tests/master-data-sweep-ui.test.ts`
Expected: 1 failure:
- "the seven simple master-data forms: a <form> cannot be ContentPanel, so it takes the panel classes and the one panel spacing (spec 2D D9, 2D-2 R4)"

- [ ] **Step 2: `branch-form.tsx`.** In `src/components/master-data/branch-form.tsx` (CRLF):

(1) Replace

```tsx
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

type BranchFormValues = {
  id?: string
```

with

```tsx
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type BranchFormValues = {
  id?: string
```

(2) Replace

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

with

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

- [ ] **Step 3: `brand-form.tsx`.** In `src/components/master-data/brand-form.tsx` (CRLF):

(1) Replace

```tsx
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"

type BrandFormValues = {
  id?: string
```

with

```tsx
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type BrandFormValues = {
  id?: string
```

(2) Replace

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("brandName")} required>
            <Input
```

with

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("brandName")} required>
            <Input
```

- [ ] **Step 4: `company-form.tsx`.** In `src/components/master-data/company-form.tsx` (CRLF):

(1) Replace

```tsx
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

type CompanyFormValues = {
  id?: string
```

with

```tsx
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type CompanyFormValues = {
  id?: string
```

(2) Replace

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required hint={t("codeHelp")}>
            <Input
```

with

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required hint={t("codeHelp")}>
            <Input
```

- [ ] **Step 5: `department-form.tsx`.** In `src/components/master-data/department-form.tsx` (CRLF):

(1) Replace

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"

type DepartmentFormValues = {
  id?: string
```

with

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type DepartmentFormValues = {
  id?: string
```

(2) Replace

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

with

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

- [ ] **Step 6: `employee-form.tsx`.** In `src/components/master-data/employee-form.tsx` (CRLF):

(1) Replace

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"

type EmployeeFormValues = {
  id?: string
```

with

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type EmployeeFormValues = {
  id?: string
```

(2) Replace

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

with

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

- [ ] **Step 7: `location-form.tsx`.** In `src/components/master-data/location-form.tsx` (CRLF):

(1) Replace

```tsx
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"

type LocationFormValues = {
  id?: string
```

with

```tsx
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type LocationFormValues = {
  id?: string
```

(2) Replace

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

with

```tsx
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <Input
```

- [ ] **Step 8: `supplier-form.tsx`.** In `src/components/master-data/supplier-form.tsx` (CRLF):

(1) Replace

```tsx
import { Textarea } from "@/components/ui/textarea"
import { shouldGuardLinkClick } from "@/lib/navigation-guard"
import { useApiError } from "@/components/ui/use-api-error"

type SupplierFormValues = {
  id?: string
```

with

```tsx
import { Textarea } from "@/components/ui/textarea"
import { shouldGuardLinkClick } from "@/lib/navigation-guard"
import { useApiError } from "@/components/ui/use-api-error"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type SupplierFormValues = {
  id?: string
```

(2) Replace

```tsx
        back={<PageBackLink href={backHref} onClick={confirmNavigation} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} id="supplier-code" required error={fieldErrors.code ? getErrorMessage(fieldErrors.code) : undefined}>
            <Input
```

with

```tsx
        back={<PageBackLink href={backHref} onClick={confirmNavigation} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} id="supplier-code" required error={fieldErrors.code ? getErrorMessage(fieldErrors.code) : undefined}>
            <Input
```

- [ ] **Step 9: Check.**
  - Run `node --test tests/branch-form-ui.test.ts tests/brand-form-ui.test.ts tests/company-form-ui.test.ts tests/confirm-dialog-ui.test.ts tests/department-form-ui.test.ts tests/employee-form-ui.test.ts tests/form-frames-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/location-form-ui.test.ts tests/master-data-return-navigation.test.ts tests/master-data-sweep-ui.test.ts tests/supplier-form-ui.test.ts tests/ui-overlay-guards.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass (132 tests).
  - Run `node <temp>/eol.mjs src/components/master-data/branch-form.tsx src/components/master-data/brand-form.tsx src/components/master-data/company-form.tsx src/components/master-data/department-form.tsx src/components/master-data/employee-form.tsx src/components/master-data/location-form.tsx src/components/master-data/supplier-form.tsx tests/master-data-sweep-ui.test.ts`. Expected: equal numbers for `src/components/master-data/branch-form.tsx`, `src/components/master-data/brand-form.tsx`, `src/components/master-data/company-form.tsx`, `src/components/master-data/department-form.tsx`, `src/components/master-data/employee-form.tsx`, `src/components/master-data/location-form.tsx`, `src/components/master-data/supplier-form.tsx`; `0 <n>` for `tests/master-data-sweep-ui.test.ts` (LF).
  - Run `npm test` (2087 tests, 2086 pass, 1 skipped; 1 new test), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 10: Commit.**

```bash
git add src/components/master-data/branch-form.tsx src/components/master-data/brand-form.tsx src/components/master-data/company-form.tsx src/components/master-data/department-form.tsx src/components/master-data/employee-form.tsx src/components/master-data/location-form.tsx src/components/master-data/supplier-form.tsx tests/master-data-sweep-ui.test.ts
git commit -m "refactor(ui): the seven simple master-data forms on the panel classes and the one panel spacing (2D-3 task 19c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: your own launch configuration (temporary; never committed; leave any other session's `.claude/` content alone)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan3/after/` and `.superpowers/sdd/ui-phase2d-plan3/task-20-findings.md` (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1a–19c committed; the Task 0 baseline, ids, `href` lists and before images.
- Produces: `task-20-findings.md`, which Task 21 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count (expected 2087, 2086 pass, 1 skipped) and the build page count (60/60 at `bed4f16`; this plan adds no route).

- [ ] **Step 2: Production server.**
  - Add a launch configuration `name: "asset-2d3-start-3101"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3101"]`, `port: 3101`, `autoPort: false` (another free port if 3101 is taken; say which).
  - Start it with `preview_start` and log in with the seed admin; do not echo the password.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`.
  - Playwright code runs inline (`browser_run_code_unsafe`). A file you must create goes under `.playwright-mcp/` and is deleted right after the run.

- [ ] **Step 3: Write nothing.**
  - Open every dialog, sheet, drawer and disclosure to its first screen and close it with ยกเลิก, the X or Esc.
  - Never press save, create, upload, delete, print or "record print", import, rollback, the status correction submit, a transaction cancel confirm, or a confirm of any kind. Forms are opened, tabbed through and left without saving (answer "leave without saving" in the browser's own prompt only when you navigate away).
  - Count POST, PUT, PATCH and DELETE requests while you work. Expected: 0. List by path any read-only lookup a page already sends (`/api/search` from the label tool and the scan search is a GET).

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/`. Compare with `before/`. Check in Thai at 1440, 768 and 375, plus one English pass at 1440 (the asset page, the register, the label tool, the brands page, the supplier page):
  - **No wrapping, truncation or overlap** that was not there before; no horizontal page scroll at 375.
  - **Color only where it means something:** no tone fills on cards, pills or icons; no amber or emerald left on the asset page. Green, orange and red appear only in `StatusBadge`s, `Notice` icons and boxes, `StatStrip` attention feet and danger buttons.
  - **Asset page (Review Focus 1):** every section link in the page's navigation scrolls to its section (the nine ids); every quick action keeps its `href` (compare with the Task 0 list), and a quick action the asset cannot take is a disabled button (focus skips it; NVDA reads "unavailable" in Step 8). The timeline and evidence filters work with the arrow keys (radio groups) and show the same items as before; the movement facts and details read as label and value; the relationship map, QR, photos, purchase documents, components summary, follow-up and data health show the same content. Open the status correction panel (do not submit): the trigger's `aria-expanded` flips.
  - **Empty values (Review Focus 2):** an asset without a checkout destination or a snapshot shows "—" read as "ไม่มีข้อมูล", not "-"; the supplier's document totals show their value or "—", never 0.00 for an empty total.
  - **Badges (Review Focus 3):** the register, the label tool (search results and queue) and the scan search show the same state names as before with the shared `StatusBadge` markers; no database color is on screen.
  - **Forms (Review Focus 6):** the asset form (new, edit, clone), the batch form to its review step without creating, the component manager, the model, category and the seven simple master-data forms: same fields, same order, the same submit button; the license seats line, the cross-company warning and the protected status help where the data shows them. Then leave without saving.
  - **Import and labels:** the import-export cards (the two exports are `<a href download>` in the DOM; do not click), the history with status badges; the import panel only up to the file picker (do not import). The label tool's rows, scope chip and print count; the print page toolbar at 1440 keeps the tape-size box whole; do not print or record.
  - **Scan search:** typed search results are links to the asset page (Enter on a focused result opens it).
  - **Register:** the filter sheet's toggles are chips that apply at once and its footer looks like a dialog footer; the shared ownership chip; the scroll hint line at 768.
  - **My Assets (Review Focus 5):** from page 2 (or the last page) at the smallest page size, open an asset and press the back link: it returns to the same page and page size. A detail URL without `returnTo` goes back to My Assets.
  - **Master data (Review Focus 4):** every `href` on the eight lists, the brands page, the supplier page and the employee page equals the Task 0 list; each drill-down count is a text link, at least 44px tall at 375 and with the row height of before at 1440; the brand picker keeps `aria-current` on the chosen brand. The active state reads as a green "ใช้งาน" badge.

- [ ] **Step 5: Keyboard.** On the asset page, the register, the label tool and a master-data list: Tab order follows the visual order; every focus ring shows (teal 2px), the photo buttons and the evidence cards included. The brands duplicates `<details>`, the suppliers phone filter and the asset page's disclosure open with Enter and keep their marker.

- [ ] **Step 6: axe.**
  - Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })`.
  - Run `axe.run(document.querySelector("main"), { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "link-name", "nested-interactive", "target-size", "list", "listitem"] })` on `/th/assets/<id>`, `/th/assets`, `/th/asset-management/import-export`, `/th/asset-management/labels`, `/th/asset-management/scan`, `/th/my-assets`, `/th/master-data/branches`, `/th/master-data/brands`, the supplier and employee pages and `/th/master-data/categories/new`, at 1440 and 375. Run it once with the evidence drawer open (on the drawer).
  - Expected: 0 violations. The 24px help trigger of the asset state help (R5) may show under `target-size` if it has no neighbour spacing; record it as accepted for 2D-5, not as a failure of this plan.

- [ ] **Step 7: Forced colors, reduced motion and zoom.**
  - Forced colors (`emulateMedia`): the `StatusBadge` and timeline markers, the `Chip` border, the `ContentPanel` lines, the quiet groupings and the focus rings stay visible on the asset page, the register and the brands page.
  - Reduced motion: the label tool's and the scan search's status spinners do not spin.
  - 200% zoom (a 720×450 viewport) on the asset page, the label tool and the supplier page: nothing is clipped.

- [ ] **Step 8: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done:
  - a disabled quick action reads as an unavailable button with its name
  - the status correction trigger reads "collapsed"/"expanded"
  - the timeline and evidence filters read as radio buttons in a group named "ตัวกรอง"
  - a drill-down count reads as a link with its label and number ("สินทรัพย์: 12")
  - on a real phone: the drill-down links and the phone-card counts are easy to tap
  Add them to the open manual checks.

- [ ] **Step 9: Findings report.** Write `.superpowers/sdd/ui-phase2d-plan3/task-20-findings.md` with these parts:
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, at which widths, with results; the `href` comparison; the My Assets back link; the 375 heights of the drill-down links.
  - **Found but not caused by plan 2D-3.**
  - **Accepted mixes:** R5 raw buttons, R15 items, and any new ones.
  - **Still needs a person:** the Step 8 list.

- [ ] **Step 10: Clean up.** Stop your server, remove your launch configuration and every helper you put under the repo. `git status --short` shows only the untracked folders and files of the Global Constraints.

---

### Task 21: Repo documentation for plan 2D-3 (repo docs only; the controller adds the verify numbers and the wiki in Task 22)

Spec §6 ("every plan: DH section, changelog, wiki") and §3.3. What 2D-3 changes in the canonical docs:
- the info-teal exception, the tinted-box line and the `tag` sentence now name 2D-4 and 2D-5 only;
- drill-down counts are text links with a 44px phone target;
- no screen shows a database color any more (M23), and an active record is a success `StatusBadge` (`ActiveBadge` is gone);
- `TABLE_HEADER_FILLS` is `{}`; the LV2 and LV1 numbers.

`.impeccable/design.json` waits for 2D-5. `docs/11_FEATURE_LIST.md` and `docs/07_UAT_CHECKLIST.md` do not change: no feature changes what it does (the My Assets back link now keeps the page, which the 2B spec already asked for).

Three files are CRLF; `DESIGN.md` is LF (`i/lf w/lf`). Edit with exact-string replacement, keep the endings, and never run a formatter. Each old text below occurs exactly once at `bed4f16`.

**Files:**
- Modify `DESIGN.md` (8 replacements)
- Modify `docs/14_UI_UX_DESIGN_SYSTEM.md` (3 replacements)
- Modify `DEVELOPER_HANDOFF.md` (1 replacement): a new section before `## Open Go-Live Decisions`
- Modify `docs/99_CHANGELOG.md` (1 or 2 replacements): the entry on top
- Not changed: `.impeccable/design.json`, `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`, `src/`, `tests/`, `messages/`

**Interfaces:**
- Consumes: Tasks 1a–20 committed; `task-20-findings.md`.
- Produces:
  - the section `## UI Round 4 Phase 2D Plan 3 Assets and Master Data (<today>)` with a `- Dev-app check (Task 20):` bullet;
  - the changelog entry `### หน้าทรัพย์สินและข้อมูลหลัก (UI รอบ 4 เฟส 2D plan 3)` with a `- **ตรวจบนแอป (Task 20):**` bullet.

  Task 22 adds the verify bullet directly above each.

- [ ] **Step 1: Check the base.**
  - Run `git diff --quiet bed4f16 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md && echo DOCS-UNCHANGED`. Expected: `DOCS-UNCHANGED`.
  - Run `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`. Expected: `i/lf w/lf` for `DESIGN.md` and `i/lf w/crlf` for the other three.
  - Read `task-20-findings.md`.

- [ ] **Step 2: `DESIGN.md` color and typography (2 replacements).**

(1) §2 Named Rules, the known exception (`:260`): replace

```
in the files that plans 2D-3 to 2D-5 own still use the `info` tokens and so appear teal (phase 2A changed only their borders, `border-info/30` → `border-info-border`). Plan 2D-2 moved the admin pages, the reports, the dashboard, the work center and the shell: names are the neutral `Chip`, states `StatusBadge` and notes `Notice` by meaning.
```

with

```
in the files that plans 2D-4 and 2D-5 own still use the `info` tokens and so appear teal (phase 2A changed only their borders, `border-info/30` → `border-info-border`). Plan 2D-2 moved the admin pages, the reports, the dashboard, the work center and the shell, and plan 2D-3 the asset pages, the asset tools and the master data: names are the neutral `Chip`, states `StatusBadge` and notes `Notice` by meaning.
```

(2) §3 Typography, the `tag` bullet (`:302`): replace

```
Codes still in `font-mono` (the other forms, the component parts of the asset pages and the label print page) and codes inside a translated sentence or a string a page builds (`assetTag - name`) wait for plans 2D-3 and 2D-4.
```

with

```
Plan 2D-3 moved the codes of the asset pages, the asset forms, the import, label and scan tools and the master data to `tag` (a row's own id at `font-medium`); the import batch id, the QR print target and the relationship card's asset tag must wrap and keep `font-mono`. Codes still in `font-mono` (the forms and pages that plan 2D-4 owns) and codes inside a translated sentence or a string a page builds (`assetTag - name`) wait for plan 2D-4.
```

- [ ] **Step 3: `DESIGN.md` buttons and links (2 replacements).**

(3) §5 Buttons, **Text links** (`:375`): replace

```
It has no 44px box; a stand-alone link on mobile adds `inline-flex min-h-11 items-center md:min-h-0`.
```

with

```
It has no 44px box; a stand-alone link on mobile adds `inline-flex min-h-11 items-center md:min-h-0`. A count that opens a filtered list (a drill-down) is such a link: `cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")` in a table cell (13px `linkVariants()` in the brand picker), and a zero is plain `formatCount(0)` (plan 2D-3, the master-data lists).
```

(4) §5 Buttons, **Hand-written buttons** (`:377`): replace

```
plan 2D-2 the topbar and sidebar buttons, the report and work-center links, the storage archive button and the two floating create buttons, which are `PageHeader` actions now)
```

with

```
plan 2D-2 the topbar and sidebar buttons, the report and work-center links, the storage archive button and the two floating create buttons, which are `PageHeader` actions now; plan 2D-3 the asset page's quick actions, where one the asset cannot take is a disabled `Button`, the attachment, purchase-document and import buttons, and the master-data drill-down links)
```

- [ ] **Step 4: `DESIGN.md` badges, cards, tables and numbers (4 replacements).**

(5) §5 Status Badges, **Database colors are not shown** (`:400`): replace

```
are no longer used on badges; the `color` prop and `getStatusDotColor` were removed. The data itself is unchanged.
```

with

```
are no longer used on badges; the `color` prop and `getStatusDotColor` were removed. The data itself is unchanged. Since plan 2D-3 the label tool and the scan search also take the tone from `status.name` (`getAssetStateTone`, spec 2D D8, M23), so no screen shows a database color. An active master-data record is `StatusBadge` `tone="success"` with `tCommon("active")` (the old `ActiveBadge` pill is gone), and the activity drawer and the movement timeline mark their items with the same marker shapes (`statusMarkerVariants`).
```

(6) §5 Cards, **Border** (`:439`): replace

```
Tinted boxes (`Notice` warning and danger, and the callouts plans 2D-3 to 2D-5 still move)
```

with

```
Tinted boxes (`Notice` warning and danger, and the callouts plans 2D-4 and 2D-5 still move)
```

(7) Data Tables (`:523`): replace

```
which keeps 1 fill in 1 file: the import preview table header, which phase 2D moves. The budget was 44 at the start of 2B, 29 after plan 2B-1, 17 after plans 2B-2 and 2B-3, 11 after plan 2B-4 and 9 after 2C plan 4, which took the role permission and integration client tables onto the white 13/500 header (R-e); a table that moves deletes its row.
```

with

```
which is `{}` since plan 2D-3 moved the import preview table onto `DataTable`. The budget was 44 at the start of 2B, 29 after plan 2B-1, 17 after plans 2B-2 and 2B-3, 11 after plan 2B-4, 9 after 2C plan 4, which took the role permission and integration client tables onto the white 13/500 header (R-e), and 1 after plan 2B-5.
```

(8) Empty Values and Numbers (`:566`): replace

```
113, 20 and 42 after plan 2B-1). Print pages
```

with

```
113, 20 and 42 after plan 2B-1). LV2 was 61 after plan 2D-2; plan 2D-3 took it to 44 and LV1 to 0 (the import panel and the label tool count with `formatCount`). Print pages
```

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (3 replacements).**

(1) Replace

```
| A text link | `linkVariants({ size })` | `meta` when it stands alone, `inherit` inside a sentence |
```

with

```
| A text link | `linkVariants({ size })` | `meta` when it stands alone, `inherit` inside a sentence; a stand-alone link or a drill-down count adds `inline-flex min-h-11 items-center md:min-h-0`, and a zero count is plain text |
```

(2) Replace

```
| A status | `StatusBadge` | one size; there is no `size` prop |
```

with

```
| A status | `StatusBadge` | one size; there is no `size` prop; an asset state takes its tone from `status.name` (`getAssetStateTone`), never a database color; an active record is `tone="success"` |
```

(3) Replace

```
`null` for a missing date; a code with its name as `tag` |
```

with

```
`null` for a missing date; a code with its name as `tag`; the facts of a phone card too (no local `MobileField` or `DocumentFact`) |
```

- [ ] **Step 6: `DEVELOPER_HANDOFF.md` (1 replacement).** Replace the line `## Open Go-Live Decisions` (the only one) with the block below, which ends with that same line.
  - Replace `<today>` with today's date.
  - Write the two `<from task-20-findings.md>` markers from the findings: what was checked and where, the `href` comparison, the My Assets back link, fixes or "none", accepted mixes, issues not caused by this plan, and what still needs a person.
  - When "Still open" has more than two items, write nested bullets as the 2C plan 5 section does.

```
## UI Round 4 Phase 2D Plan 3 Assets and Master Data (<today>)

- Branch `feat/ui-phase2d-plan3` in the main checkout (from `master` `bed4f16`: phase 1, 2A, 2B plans 1–5, 2C plans 1–5, 2D plans 1–2 and the Thai font fix merged, not deployed). Spec `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` §3.3 · plan `docs/superpowers/plans/2026-10-16-ui-phase2d-plan3.md` · canonical values in `DESIGN.md`. The third of five 2D plans, one at a time (D15).
- No new workflow, page, schema, migration, dependency, token, message or API change. Validation is unchanged. One behaviour the 2B spec already asked for: the My Assets back link returns to the page the user came from (M32 c).
- **Small parts (Task 1):** the activity drawer marks items with the `StatusBadge` marker shapes; the QR code has no frame of its own; the status correction trigger has `aria-expanded`/`aria-controls` (M27) and its panel is a quiet grouping with a neutral `Notice`; the transaction cancel dialog (2D-4's file) takes `currentState`/`restoreState` as `string | null` and shows `Nil` (R2).
- **Asset page (Tasks 2–5):** the purchase documents, photos, components summary and parent banner on `ContentPanel`, `EmptyNote`, `StatusBadge`, `Notice` and the shared buttons; the page's nine id sections on the panel classes and its other panels `ContentPanel`s; `Notice` by meaning (R4); data health and warranty `StatusBadge`s; `Chip`s; text links; a disabled quick action is a disabled `Button` (M12); no typed "-" (M32 b); the 16 raw colors gone. The movement timeline (`ChoiceChip` filters, `KeyValueList`s, marker shapes) and the evidence drawer (`StatStrip`, `ChoiceChip`, `Chip`). `src/lib/asset-detail-format.ts` lost four tone helpers and a type (R13).
- **Asset forms and tools (Tasks 6–13):** the asset form, the batch form (three `DataTable`s) and the component manager on `ContentPanel`, `Notice`, `ChoiceCard`, `KeyValueList`, `EmptyNote` and `Nil`; the import panel on `DataTable`, `StatStrip`, `KeyValueList`, `Chip` and `StatusBadge` (M15; `getAssetImportBatchStatusTone` in `src/lib/asset-import-batch.ts`); the import-export link cards (`<a download>` for the two exports) and history; the label batch tool and the scan search with `StatusBadge` from `status.name` (M23) and `formatCount` (M27); the label print toolbar on `PageBackLink` and `Notice`, with the tape-size box whole at 1440 (M27).
- **Register and My Assets (Tasks 14–15):** the filter sheet's `ChoiceChip` toggles and dialog-style footer (D19), a plain filter count; the shared ownership type `Chip`, the panel frame and the shared scroll hint; My Assets' phone facts as a `KeyValueList` and the back link through `returnTo` (a new `"my-assets"` section in `src/lib/operational-return-navigation.ts`).
- **Master data (Tasks 16–19):** the 12 drill-down counts are text links with a 44px phone target (R6); the active state is a success `StatusBadge` and `ActiveBadge` is deleted (M7); the brands page's picker and duplicates on the panel classes, its workspace a `ContentPanel`, "create model" `md` (2D-1 R3); the suppliers list and page (`KeyValueList` phone cards, follow-ups as one warning `Notice`, an empty document total as `Nil`, M32 a); the employee page on `ContentPanel`s and warning `Notice`s; the model and category forms on `ContentPanel`s and `EmptyNote`, and the seven simple forms on the panel classes.
- **Guards:** LFG LV2 61 → 44 (six rows deleted; the asset page stays 4), LV1 5 → 0, LT1 5 → 0, LS1 2 → 1, LK1 1 → 0, LB1 6 → 5 (the label print page); `LOCAL_KEY_VALUE` gained `MovementInfo`, `ReviewItem`, `MobileField` and `DocumentFact`, `LOCAL_STAT_TILE` `EvidenceStat` and `SummaryItem` (D19); VFG `TABLE_HEADER_FILLS` is `{}`; FMG only comment line numbers. No number went up.
- **Tests:** new files `tests/assets-sweep-ui.test.ts` (21) and `tests/master-data-sweep-ui.test.ts` (13); one unit test each in `tests/asset-import-batch.test.ts` and `tests/operational-return-navigation.test.ts`; pins edited with their file in 14 test files, guard rows in 3. 2051 → 2087 tests.
- **Rulings of this plan:** R1 (the 2D-2 rulings), R2 (the cancel dialog type), R3 (markers and tones), R4 (`Notice` by meaning), R5 (raw buttons that stay), R6 (drill-down links, M7), R7 (M23), R8 (M32), R9 (M12), R10 (M15, table header budget), R11 (M27), R12 (D19 helpers), R13 (dead code), R14 (2D-1 hand-on), R15 (not taken), R16 (guard rows).
- **Accepted until their plan:** the raw `<button>`s of R5 (the photo buttons, the component candidates, the label tool rows, the state help trigger, the thumbnail preview) wait for 2D-5's `OWNERS`/`EXEMPT` lists; the register's bulk bar is phase 3 (D2).
- **Not taken (R15, open issues for the user):** `text-xs` outside the sweep categories (the register phone row, the state help popover, the employee list's position and email line); the relationship link lists that keep bordered rows inside a quiet grouping; the My Assets photo box's `rounded-lg`.
- **Handed on:** 2D-4: the rest of `c/asset-operations/transaction-cancel-dialog.tsx`. 2D-5: the R5 raw buttons for `OWNERS`/`EXEMPT`, `.impeccable/design.json`.
- Dev-app check (Task 20): <from task-20-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2d-plan3/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy after 2D and V: <from task-20-findings.md>, together with the open checks of the sections above.
- Next: merge this branch; then plan 2D-4 (its plan first).

## Open Go-Live Decisions
```

- [ ] **Step 7: `docs/99_CHANGELOG.md`.**

The newest date at `bed4f16` is `## 2026-10-16` (the font fix and the 2D plan 2 entries).
  - If `<today>` is 2026-10-16, the entry goes directly under that heading, above the font entry: go straight to the replacement below, whose `## <today>` line is then that heading.
  - Otherwise, first replace the line `## 2026-10-16` with:

```
## <today>

---

## 2026-10-16
```

Then replace the heading line `## <today>` (the newest, the only line with that date) with the block below. Write the marker from the findings in Thai, in the shape of the 2D plan 2 entry's bullet.

```
## <today>

### หน้าทรัพย์สินและข้อมูลหลัก (UI รอบ 4 เฟส 2D plan 3)

Branch `feat/ui-phase2d-plan3` (จาก `master` `bed4f16`) · design `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` ข้อ 3.3 · plan `docs/superpowers/plans/2026-10-16-ui-phase2d-plan3.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md` · plan ที่ 3 จาก 5 ของ 2D

- **ขอบเขต:** หน้าทรัพย์สิน เครื่องมือนำเข้า ป้าย QR และค้นหา ทะเบียนทรัพย์สิน ทรัพย์สินของฉัน และหน้าและฟอร์มของข้อมูลหลัก ใช้ชิ้นส่วนกลางชุดเดียวกับหน้าอื่น · ไม่มีขั้นตอนงานใหม่ ไม่แตะฐานข้อมูล ไม่แก้ API ไม่เพิ่ม token ไม่แก้ข้อความ · การตรวจกรอกไม่เปลี่ยน
- **หน้าทรัพย์สิน:** ทุกส่วนเป็นกรอบเนื้อหาแบบกลาง (ไม่มีกรอบซ้อนกรอบ) · ข้อความแนะนำและคำเตือนเป็น `Notice` ตามความหมาย · สุขภาพข้อมูล ประกัน และรูปตามรายการตรวจเป็นป้ายสถานะ · ปุ่มทำรายการที่ใช้ไม่ได้เป็นปุ่มที่ปิดใช้งานจริง (โปรแกรมอ่านจอบอกได้) · ค่าว่างแสดง "—" ไม่ใช่ "-" · ไม่มีสีดิบเหลือง/เขียวแล้ว · ลำดับเหตุการณ์และหลักฐานใช้ชิปตัวกรองกลาง
- **ฟอร์มและเครื่องมือ:** ฟอร์มทรัพย์สิน ฟอร์มเพิ่มหลายรายการ (ตาราง 3 ตารางเป็นตารางกลาง) และหน้าจัดการชิ้นส่วนใช้กรอบ คำเตือน และค่าว่างแบบกลาง · แผงนำเข้าใช้ตารางกลาง แถบตัวเลข และป้ายสถานะ · เครื่องมือพิมพ์ป้ายและค้นหาแสดงสถานะทรัพย์สินด้วยป้ายสถานะกลาง ไม่ใช้สีจากฐานข้อมูลแล้ว · กล่องขนาดเทปของหน้าพิมพ์ป้ายไม่ถูกตัดที่จอ 1440px
- **ทะเบียนและทรัพย์สินของฉัน:** ตัวกรองบนมือถือเป็นชิปกด ท้ายแผงแบบเดียวกับ dialog · ประเภทการถือครองเป็นชิปชื่อ · ปุ่มกลับจากหน้ารายละเอียดทรัพย์สินของฉันกลับไปหน้าเดิมของรายการ (ไม่กลับหน้าแรก)
- **ข้อมูลหลัก:** ตัวเลขที่กดดูรายการ 12 จุดเป็นลิงก์ข้อความ (บนมือถือพื้นที่กด 44px) · สถานะใช้งานเป็นป้ายสถานะสีเขียวแบบกลาง · หน้าแบรนด์: ปุ่มเพิ่มรุ่น 36px · หน้าผู้จำหน่าย: เรื่องที่ต้องติดตามรวมเป็นคำเตือนเดียว ยอดเอกสารที่ไม่มีค่าแสดง "—" แทน 0.00 · หน้าพนักงาน: ทุกส่วนเป็นกรอบเนื้อหาแบบกลาง · ฟอร์มข้อมูลหลัก 9 ฟอร์มใช้กรอบและระยะชุดเดียว
- **guard:** `list-frame-guards` "-" ที่พิมพ์เอง 61 → 44 · `toLocaleString()` 5 → 0 · หัวตารางทึบ 5 → 0 · `visual-foundation-guards` หัวตารางทึบ `{}` · ไม่มีตัวเลขเพิ่ม
- **test:** ไฟล์ใหม่ 2 ไฟล์ · test 2051 → 2087
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลัง 2D และงาน V
- **ตรวจบนแอป (Task 20):** <จาก task-20-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2d-plan3/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วเริ่ม 2D-4 (เขียน plan ก่อน)
```

Replace every `<today>` and the marker; none may stay. Check the Thai wording against `docs/19_THAI_GLOSSARY.md` (ที่ตั้ง, รหัสทรัพย์สิน, ป้าย, ผู้ถือครอง, ตัวกรอง, แม่แบบ).

- [ ] **Step 8: Check.**
  - Run `grep -n "<from task-20\|<จาก task-20\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md`. Expected: nothing.
  - Run `grep -n "plans 2D-3 to 2D-5\|wait for plans 2D-3 and 2D-4\|which keeps 1 fill in 1 file" DESIGN.md`. Expected: nothing.
  - Run `git diff --numstat`. Expected: exactly the four files. A file that shows every line changed was normalized; restore its line endings.
  - Run `node <temp>/eol.mjs DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`. Expected: `DESIGN.md 0 637` (LF) and equal numbers for the other three.
  - Run `npm test` (2087 tests, 2086 pass, 1 skipped; `tests/audit-round-cancellation.test.ts` reads the handoff and the changelog), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 9: Commit.**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2D plan 3 assets and master data in DESIGN.md, design-system index, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - Add `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) `` to the 2D plan 3 changelog entry, directly above its "ตรวจบนแอป (Task 20)" bullet.
  - Add ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above "Dev-app check (Task 20)".
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again, then commit both files with `docs(ui): record phase 2D plan 3 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: 2D plan 3 is built on `feat/ui-phase2d-plan3` with the verify numbers, not merged, not deployed; the next step is 2D-4. Fix any sentence the row now contradicts (`ActiveBadge`, the database colors, the My Assets back link).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`:
    - the plan 2D-3 checks for a person (Task 20 Step 8): one new numbered item, also added to the list in item 27;
    - close the 2D-1 and 2D-2 hand-ons this plan settled (M32 a, b, c; `brands/page.tsx:425`; `status.name` in the label tool and the scan search; `ActiveBadge`);
    - the open issues of this plan below, if the user has not ruled on them.

  Then:
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Never stage other sessions' changes in the vault.

- [ ] **Step 3: Memory.** Update `review-2026-10-priorities.md`: 2D plan 3 is built on `feat/ui-phase2d-plan3`, not merged, not deployed. Next: the merge choice, then the 2D-4 plan.

- [ ] **Step 4:** Use superpowers:finishing-a-development-branch. A local merge fast-forwards `master` (`git merge --ff-only feat/ui-phase2d-plan3` from `master`) and runs the tests on the merged result. Push only if the user asks.

---

## Open issues (for the user before or during execution)

1. **Plan size.** 23 tasks (0–22) and 34 code commits over 50 source files, with every replacement written out; Task 5a alone has 47 replacements in the 2,4xx-line asset page. It stays one plan because spec §3.3 is one plan and every commit is one file or a tight pair. If a session runs short, stop after any commit (the tree is green after each) and resume at the next task; Tasks 16–19 do not depend on Tasks 1–15.
2. **A 2D-4 file in this plan (R2).** Task 1d widens two props of `c/asset-operations/transaction-cancel-dialog.tsx` and shows `Nil` there, because the asset page's M32 b fix needs the type; 2D-1 had handed "M32 b's cancel dialog type" to 2D-4. 2D-4 keeps the rest of the dialog. Confirm, or move M32 b of the asset page to 2D-4 with it.
3. **Raw buttons that stay (R5).** The three photo buttons, the component candidates and the label tool rows keep `<button>` with a comment; the 24px state help trigger and the thumbnail preview button are untouched. 2D-5 lists them as `OWNERS`/`EXEMPT`. The help trigger is under 44px on phones: give it a 44px hit area in 2D-5, or accept it as an inline label control?
4. **Not taken (R15):** `text-xs` that is not in a sweep category (the register phone row, the state help popover, the employee list's position and email line); the asset relationship link lists that keep bordered rows inside a quiet grouping; the My Assets photo box's `rounded-lg` (the list's is `rounded-md`). For 2D-5's cleanup or not at all?
5. **Visible changes to confirm:**
   - the master-data counts are text links (underlined on hover), no longer small primary pills, and a zero is plain text;
   - the scan search results are links (Enter opens the asset page; Space no longer does, middle-click opens a new tab);
   - the supplier page's follow-ups are one warning box with a list, and "nothing to follow up" is a quiet check line instead of a green box;
   - the brands page's "create model" button is 36px;
   - the import preview table has a white header like every other table;
   - a quick action the asset cannot take is a disabled button: keyboard focus now skips it.
6. **The My Assets back link (M32 c)** keeps the list's page and page size through `returnTo`; it does not keep a search or a filter, because the list has none. Confirm that is enough.
