# UI Round 4 · Phase 2D Sweep and Guard Lock · Plan 1 (foundation and dead-code cleanup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the ground for the 2D sweeps:
- The default and icon buttons become 36px from `md`. Buttons in a row of 40px fields keep 40px through `size="lg"` and the new `size="icon-lg"`, and every `PageHeader` button is `md`.
- The dead code of spec 2D §4.1 is deleted, except `formatCurrency`, which goes in 2D-4.
- The small fixes of spec 2D §3.1 land, and the search API returns a read-only `status.name`.

Workflows, data, validation and the database stay the same.

**Architecture:**
- **One file is one commit where a guard row changes.** Elsewhere a commit holds one change and the tests that pin it.
  - The order keeps `npx tsc --noEmit` and `npm test` green after every commit:
    - the 40px rows get `lg` / `icon-lg` first (Task 1);
    - the callers of the legacy helpers move before the helpers are deleted (Task 2);
    - the switch to 36px comes after both (Task 3);
    - type props go before their message keys (Task 5);
    - the guard comments are rewritten last, when no later task moves a line (Task 10).
- **Branch:** `feat/ui-phase2d` in the main checkout `D:/Antigravity/asset-system`. No worktree, because no other plan runs beside this one (spec 2D D15: one plan at a time).
- **Tests:** three new test files.
  - `tests/button-size-switch.test.ts` (Task 1)
  - `tests/dead-code-cleanup.test.ts` (Tasks 2, 4, 5)
  - `tests/status-name-api.test.ts` (Task 8)
  - Everything else edits the pins that lock what changes. Each new or edited assertion fails before its change, for the reason the task states.
- **Controller tasks:**
  - Task 0: branch check, baseline, before screenshots and button heights.
  - Task 11: verify, production build, dev-app check with before/after button heights.
  - Task 13: verify numbers, wiki, memory, finishing the branch.
- **Task 12** writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md`.
- **What this plan covers:** §3.1, every M row whose plan column says 2D-1 (M1–M6, M8–M11, M16, M23 API part, M31, M32 for the parts in 2D-1 files, M34), and §4.1 except `formatCurrency` (D10, plan 2D-4).
- **Line numbers:** the spec's are from `71597e5`. This plan recounted them at `14e7748`. The code is the same as `71597e5`; `14e7748` only adds the spec.
- **Prior art for the format:** `docs/superpowers/plans/2026-10-15-ui-phase2c-plan5.md`.

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/ui-phase2d`, which holds `master` `71597e5`, the spec commit `14e7748` and this plan's commit.
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`.
  - Commit only the files your task names. Use `git add <paths>` and never `git add -A` or `git add .`.
  - The checkout has untracked folders that are not yours: `.codex/`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`. Leave them alone.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before you use an API you have not seen in this repo. No task here adds a Next.js API.
- **Line endings:**
  - `git config core.autocrlf` is `true`. Most working files are CRLF (`i/lf w/crlf`).
  - These are LF (`w/lf`) and stay LF: `tests/asset-forms-ui.test.ts`, `tests/page-loading-skeleton.test.ts`, `src/app/[locale]/(dashboard)/asset-management/labels/page.tsx`, `src/app/[locale]/(print)/assets/labels/page.tsx`, `src/app/[locale]/(print)/assets/[id]/label/page.tsx`, `src/components/master-data/asset-delete-button.tsx` (deleted in Task 4a) and `src/lib/system-log-history.ts` (not touched).
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files, so do not use it as a check.
  - Edit with exact-string replacement, never a formatter, and never normalize a file.
  - New files are LF.
  - A task that writes a whole existing file (Task 2c) writes it and then runs `node <temp>/crlf.mjs <file>`:

```js
// crlf.mjs: node <temp>/crlf.mjs <file>…   rewrites each file with CRLF line endings and changes nothing else.
import { readFileSync, writeFileSync } from "node:fs"
for (const file of process.argv.slice(2)) writeFileSync(file, readFileSync(file, "utf8").replace(/\r?\n/g, "\r\n"))
```

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
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - `tsconfig.json` includes `**/*.ts`, so **tests are type-checked**. A test that imports a deleted name changes in the same commit as the deletion.
  - Modules that tests import use relative `.ts` imports (no `@/`). Tests cannot import `.tsx`; they read `.tsx` source text instead. Use the helpers in `tests/helpers/source-files.ts`.
- **Baseline at `14e7748`** (checked while writing this plan; Task 0 checks it again):
  - `npm test`: 2011 tests, 2010 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors. The warnings are all under `.agents/`; Task 0 records their number.
  - **After this plan:** 2020 tests, 2019 pass, 1 skipped. Each task states its own count.
- **Every task ends with all of these green:**
  - `npm test` with 0 fail and the task's count
  - `npx tsc --noEmit`
  - `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`

  Report any failure by name.
- **Messages:**
  - Change `messages/th.json` and `messages/en.json` only with `node scripts/messages-edit.mjs <change-file>`, run from the repo root, with the JSON in your temp folder. The script keeps CRLF.
  - Only Task 5b changes messages, and it only deletes keys. Thai copy follows `docs/19_THAI_GLOSSARY.md`; this plan adds no copy.
  - Delete a key only after no code reads it. next-intl messages are untyped, so tsc never catches a key that is still read.
- **No new tokens (2A I21).**
  - No custom property in `:root`, `@theme inline` or `@theme`, and no edit to `tests/design-tokens-contrast.test.ts`.
  - Never write `rounded-[…]`.
  - `icon-lg` is a cva size, not a token (spec 2D D5).
- **No migration, no DB write, no schema change.** The only API change is the read-only field `status.name` that the user approved (D8). The Prisma `select` does not change.
- **Guards only go down.**
  - Never raise a number in `tests/visual-foundation-guards.test.ts` (VFG), `tests/form-migration-guards.test.ts` (FMG) or `tests/list-frame-guards.test.ts` (LFG), and never add a row.
  - This plan changes guard comments and pins, and in Task 10 deletes the 5 LFG rows that count 0.
- **No validation change.** Keep every `required`, `maxLength`, `toast.error` and `disabled` gate.
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 11.
  - Do not run skill helper scripts; they make network calls.
  - Keep helper scripts and change files in your temp folder (`<temp>`), outside the repo.
  - Shell heredocs and `node -e` may drop backslashes. Write regex-bearing text with a file-writing tool or a script file.
- **Deploy:** none. One deploy after 2D and the V track (D17).

## Rulings of this plan

- **R1, M5:** 2D-1 moves the two callers of `getSafeActionLinkClasses` / `getResponsiveActionRowClasses` and deletes the helpers (Task 2b).
  - The callers are `D/admin/readiness/page.tsx` and `D/asset-management/import-export/page.tsx`. Each move is a one-element change.
  - So the spec's alternative (`md:min-h-10` → `md:min-h-9` in the helper) never ships.
  - The two links become `buttonVariants({ variant: "outline", size: "md" })` (36px from `md`, `nowrap`). Their labels are short.
- **R2, file ownership:** spec §3 says to edit a file once per plan, in that plan.
  - 2D-1 takes these one-line edits into files later plans own, because the switch needs them now:
    - `icon-lg` in `asset-form`, `asset-batch-form`, `asset-model-form` and `category-form` (2D-3);
    - `size="lg"` on the print button of `asset-label-print` (2D-3);
    - `size="md"` on the three header buttons of `repair-record-actions` (2D-4);
    - the M8 prop lines;
    - the five `/api` links (M31);
    - the six spinner classes.
  - The later plans edit those files again in full. Each 2D-1 edit is a single line or a tag swap.
- **R3, left to the owning plan** (spec D6 "lg only beside 40px fields"):
  - the `lg` buttons outside field rows:
    - `D/access-denied/page.tsx:34`, `:37` → 2D-2
    - `D/master-data/brands/page.tsx:425` → 2D-3
    - `c/admin/asset-state-review-workspace.tsx:144` → 2D-2
  - the format-preset button `c/admin/system-settings-form.tsx:1027` (`md:min-h-10`, stays 40 until 2D-2);
  - the raw 44px buttons beside the 36px Button at `c/admin/IntegrationClientManager.tsx:844` (2D-2).
- **R4, D18 dialog X order:** this plan does not take it. Moving the close X before `{children}` in `c/ui/dialog.tsx:77-84` and `c/ui/sheet.tsx:83-90` is a two-line change. However, Radix's default `onOpenAutoFocus` then focuses the X in the 11 `AccessibleDialog` callers without `initialFocusRef` and in every sheet. A focus guard in `c/ui/accessible-dialog.tsx` and a check of every dialog are needed, and that is not small. Open issue 1 proposes 2D-2 as its owner.
- **R5, M32:** this plan takes (d) `StatStrip` empty value and (e) `ReportsPageSkeleton` below 640px (Task 9). Both are `c/ui/` foundation files.
  - The caller `c/reports/reports-accounting-view.tsx:74` (`?? "—"`) moves in 2D-2 with its file.
  - (a) the supplier purchase total that shows 0.00 → 2D-3, which owns `D/master-data/suppliers/[id]` and `c/master-data/supplier-purchase-documents.tsx`.
  - (b) the typed "-" in `D/assets/[id]/page.tsx:2425`, `:2480` → 2D-3, and the null type in `c/asset-operations/transaction-cancel-dialog.tsx` → 2D-4. LV2 does not count `return "-"`, so no guard number moves.
  - (c) the my-assets back link → 2D-3.
  - (f) `buildSystemLogFilterHref` is not a bug: the page wraps it with `appendListPage`. It is dropped, unless 2D-2 wants it.
- **R6, M8:**
  - The 10 swaps of 2C `06-actions.md` §6.5.2 are deleted, together with their keys. #8 (`labels.chooseFile`) has nothing to delete, because the label is still read.
  - `common.saving` is deleted: its one pass site is the data-quality page, and the review dialog no longer reads it.
  - The extra unread key `dataQualityPage.assetStateReviews.scanning` (passed at `D/admin/data-quality/page.tsx:81`, never read by the workspace) is **not** deleted. It is not in the spec's list (open issue 2).
- **R7, Badge:** `c/ui/badge.tsx` has no importer.
  - Its `badgeVariants` (`c/ui/badge-variants.ts:3-16`) is then an orphan export, and D12 deletes it too.
  - `statusBadgeVariants` and `statusMarkerVariants` stay.
- **R8, LFG exact rows:** M16 deletes the 5 rows that count 0, and Task 10a adds test L10, which holds every `KEEP` row equal to its live count.
  - This is spec D13's "the number equals what is counted", brought forward for LFG only.
  - It makes the deletion test-first: L10 fails on exactly those 5 rows today.
  - From now on, the commit that moves an LFG site lowers or deletes its row (spec §3, §5.6).
- **R9, Plex Mono 600:**
  - About 8 places still write `font-mono … font-semibold` (for example `D/assets/[id]/page.tsx:2116` and `c/assets/asset-component-manager.tsx:469`). After M11 the browser draws them with a synthesized bold.
  - M33 moves them to `tag` (weight 400) file by file in 2D-2 to 2D-4.
  - Task 11 looks at them and records the result.
- **R10:** `.impeccable/design.json` is not changed here. Spec §6 gives its button heights to the last 2D-5 docs pass.

## Review Focus

1. **A desktop user who fills a form row with a 40px field and an icon or text button** must see the button and the field at the same height. This is pinned by `tests/button-size-switch.test.ts` (`lg` / `icon-lg` in the 7 rows and the label print toolbar) and measured in Task 11 Step 4 (Task 0 heights → after).
2. **Every other default and icon button** must be 36px from `md` and still 44px below `md`, with the label unchanged and nothing clipped. This is pinned by `tests/design-system.test.ts` and checked with before/after screenshots at 1440 and 375 in Task 11.
3. **A user who reaches the error page, the readiness checks or the import page** must still be able to retry, open a check or go back. This is pinned by `tests/dead-code-cleanup.test.ts` (Tasks 2a, 2b) and opened in Task 11.
4. **Nothing deleted may still be read:** no `t()` of a deleted key, and no import of a deleted file or name. tsc and the `dead-code-cleanup` tests pin this, and Task 5b's `find-unused-messages` run shows that the 10 keys had no reader before they went.
5. **The search API** must keep every old field and add only `status.name`. This is pinned by `tests/status-name-api.test.ts`, and the global search, the scan search and the label tool are opened in Task 11 with 0 writes.

## File structure

| File | What changes | Task |
|---|---|---|
| `c/ui/button-variants.ts` | `icon-lg` (1a); `default` = `md`, `icon` 36 (3) | 1a, 3 |
| `c/assets/asset-batch-form.tsx`, `c/assets/asset-form.tsx`, `c/master-data/asset-model-form.tsx`, `c/master-data/category-form.tsx` | 7 field-row icon buttons → `icon-lg` | 1b |
| `c/assets/asset-label-print.tsx` | print button `lg` (1b); `recordingPrint` type prop (5a) | 1b, 5a |
| `c/maintenance/repair-record-actions.tsx` | 3 header buttons `md` | 1b |
| `D/error.tsx`, `c/ui/action-button.tsx` (deleted) | retry is `Button` | 2a |
| `D/admin/readiness/page.tsx`, `D/asset-management/import-export/page.tsx` | links on `buttonVariants` (2b); `importing` pass (5a, import-export) | 2b, 5a |
| `src/lib/design-system.ts` | legacy maps and the unused helpers deleted | 2c |
| `c/master-data/master-data-delete-button.tsx`, `c/master-data/asset-delete-button.tsx` | deleted | 4a |
| `c/ui/badge.tsx` (deleted), `c/ui/badge-variants.ts` | `Badge` and `badgeVariants` gone | 4b |
| `src/lib/asset-detail-format.ts` | two helpers deleted | 4c |
| `c/assets/asset-state-help-popover.tsx` | `size="compact"` gone | 4d |
| `c/assets/asset-component-manager.tsx`, `c/assets/asset-status-correction-button.tsx`, `c/assets/asset-import-preview-panel.tsx` and the pages that pass the labels | busy props (M8) | 5a |
| `messages/th.json`, `messages/en.json` | 10 keys deleted | 5b |
| `src/app/layout.tsx` | Plex Mono 400 and 500 | 6 |
| `c/audit/audit-scan-camera.tsx`, `c/audit/audit-scan-lookup-card.tsx`, `c/layout/global-search.tsx`, `c/ui/scanner-text-input.tsx` | `motion-reduce:animate-none` | 7a |
| `D/admin/roles/page.tsx`, `D/master-data/categories/page.tsx`, `D/master-data/brands/page.tsx` | `/api` download links → `<a>` | 7b |
| `src/app/api/search/route.ts`, `D/asset-management/labels/page.tsx`, `c/assets/asset-label-batch-tool.tsx` (type only) | `status.name` | 8 |
| `c/ui/stat-strip.tsx`, `c/ui/page-skeleton.tsx` | empty value, reports skeleton | 9 |
| `tests/list-frame-guards.test.ts`, `tests/form-migration-guards.test.ts`, `tests/asset-detail-ux.test.ts` | zero rows, L10, comments | 10 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 2D-1 docs | 12 |

`D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/`.

---

### Task 0: Branch, baseline and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` in the main checkout (only while a server runs; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan1/before/` (git-ignored)

**Interfaces:**
- Consumes: `feat/ui-phase2d` at the plan commit (on `14e7748`).
- Produces: the baseline numbers, the ids, the before images and `button-heights-before.json`, which Task 11 compares against.

- [ ] **Step 1: Branch and base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2d`

Run: `git merge-base --is-ancestor 71597e5 HEAD && git diff --quiet 71597e5 HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`. The branch holds only the spec and this plan on top of `master`.

Run: `git status --short`
Expected: only the untracked folders that the Global Constraints name.

- [ ] **Step 2: Baseline.**
  - Run `npm test`. Expected: 2011 tests, 2010 pass, 0 fail, 1 skipped.
  - Run `npx tsc --noEmit`. Expected: clean.
  - Run `npm run lint`. Expected: 0 errors; record the number of warnings and check that all of them are under `.agents/`.
  - Record the numbers in the ledger.

- [ ] **Step 3: Temp scripts.** Save `crlf.mjs` and `eol.mjs` (Global Constraints) in `<temp>`. Hand their path to every implementer.

- [ ] **Step 4: Dev server.**
  - Create `.claude/launch.json` with one configuration: `name: "asset-2d1-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false`.
  - Start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Log in with the seed admin of `prisma/seed.ts`; do not echo the password.

- [ ] **Step 5: Pick ids.** Record these in the ledger, and note any the dev data lacks:
  - an asset: `/th/assets/<id>` and `/th/assets/<id>/components`
  - a repair ticket that is still open: `/th/maintenance/<id>` (the three header buttons)
  - a disposal request: `/th/disposal/<id>`
  - an audit round: `/th/audit/rounds/<id>`
  - a category with photo checklist items: `/th/master-data/categories/<id>/edit` (the 4 icon buttons)
  - an asset model with spec rows: `/th/master-data/brands/models/<id>/edit`
  - an asset whose label can be printed: `/th/assets/<id>/label` (print layout only; never press print)

- [ ] **Step 6: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2d-plan1/before/<view>-<width>.png` at 1440 and 375, plus 768 for the four marked †.
  - `/th/dashboard`, `/th/assets`, `/th/assets/<id>` †, `/th/assets/<id>/components`
  - `/th/assets/new` with the single form and the batch form (switch the mode; type nothing)
  - `/th/asset-management/labels`, `/th/asset-management/import-export`, `/th/assets/<id>/label`
  - `/th/maintenance`, `/th/maintenance/<id>` †, `/th/disposal`, `/th/disposal/<id>`, `/th/audit/rounds`, `/th/audit/rounds/<id>` †
  - `/th/master-data/categories`, `/th/master-data/categories/<id>/edit` †, `/th/master-data/brands`, `/th/master-data/brands/models/<id>/edit`
  - `/th/admin/readiness`, `/th/admin/data-quality`, `/th/admin/settings`, `/th/admin/roles`
  - `/th/reports`, `/th/my-assets`, `/th/work-center`, `/th/notifications`
  - one dialog footer: open "แก้ไข" on the repair ticket and close it with ยกเลิก
  - Write nothing.

- [ ] **Step 7: Button heights.** On each view of Step 6 at 1440, run this inline Playwright code (`browser_run_code_unsafe`). Save the results, keyed by view, to `.superpowers/sdd/screenshots/ui-phase2d-plan1/button-heights-before.json`.

```js
async (page) => page.evaluate(() => {
  const rows = {}
  for (const element of document.querySelectorAll('main [data-slot="button"]')) {
    const box = element.getBoundingClientRect()
    if (box.height === 0) continue
    const key = `${element.getAttribute("data-size")}:${Math.round(box.height)}`
    rows[key] = (rows[key] ?? 0) + 1
  }
  return rows
})
```

Expected at 1440 before the switch:
  - `default:40`, `icon:40`, `md:36`, `lg:40`, `sm:32` and `icon-sm:32`.
  - Any other height (for example 44 for a `min-h-11` override that the page sets) is recorded with its view.

- [ ] **Step 8: Clean up.** Stop the server and delete `.claude/launch.json`. `git status --short` shows what Step 1 showed. No commit in this task.

---

### Task 1: The 40px rows keep 40px (`icon-lg`, `lg` beside fields, `md` in the header) before the switch

Spec §3.1 (first bullet), D3, D5, D6, M2. 2C `06-actions.md` §6.2.3 `:81` lists the seven icon rows (#46, #69, #122, #139–142).

Before Task 3, `icon-lg` and `icon` are both 40px and `lg` and `default` are both 40px, so **nothing changes on screen in this task**. It only names what must stay 40px once Task 3 switches `default` and `icon`.

Two commits:
- 1a: the primitive and its pins.
- 1b: the callers and their pins, plus the new test file.

Not in this task:
- the `lg` buttons outside field rows (R3)
- `system-settings-form.tsx:1027` (R3)
- dialog footers. They cannot take `size=`: FMG GD3 `tests/form-migration-guards.test.ts:529-541` forbids it, so they follow the switch, as intended.
- `asset-batch-form.tsx:843`, the phone card header. It is not a field row; it stays `icon` and becomes 36 in Task 3.

**Files:**
- Modify: `src/components/ui/button-variants.ts` (CRLF), `tests/design-system.test.ts` (CRLF): 1a
- Modify: `src/components/assets/asset-batch-form.tsx`, `src/components/assets/asset-form.tsx`, `src/components/master-data/asset-model-form.tsx`, `src/components/master-data/category-form.tsx`, `src/components/assets/asset-label-print.tsx`, `src/components/maintenance/repair-record-actions.tsx` (all CRLF): 1b
- Modify: `tests/asset-forms-ui.test.ts` (**LF**), `tests/category-form-ui.test.ts`, `tests/asset-label-print-ui.test.ts`, `tests/repair-record-detail-ui.test.ts` (CRLF): 1b
- Create: `tests/button-size-switch.test.ts` (LF): 1b

**Interfaces:**
- Produces:
  - `buttonVariants({ size: "icon-lg" })` and `<Button size="icon-lg">`, which is `min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0 rounded-md`;
  - the size union `"sm" | "md" | "lg" | "default" | "icon-sm" | "icon" | "icon-lg"`, which `ButtonVariantProps` derives;
  - `tests/button-size-switch.test.ts`, which Task 3 does not edit.

#### 1a: `icon-lg` in the cva

- [ ] **Step 1: The failing pins.** Make these three exact replacements in `tests/design-system.test.ts`.

(1) Replace

```ts
const buttonSizeNames = ["sm", "md", "lg", "default", "icon-sm", "icon"] as const
```

with

```ts
const buttonSizeNames = ["sm", "md", "lg", "default", "icon-sm", "icon", "icon-lg"] as const
```

(2) Replace

```ts
  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/)
  assert.doesNotMatch(`${primary} ${buttonVariants({ variant: "destructive" })}`, /dark:/)
```

with

```ts
  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/)
  assert.match(buttonVariants({ size: "icon-lg" }), /min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/)
  assert.doesNotMatch(`${primary} ${buttonVariants({ variant: "destructive" })}`, /dark:/)
```

(3) Replace

```ts
  for (const size of ["md", "lg", "default", "icon"] as const) {
```

with

```ts
  for (const size of ["md", "lg", "default", "icon", "icon-lg"] as const) {
```

- [ ] **Step 2: Watch them fail.**

Run: `node --test tests/design-system.test.ts`
Expected: 3 failures, because cva has no `icon-lg` size and returns no size classes:
  - "button variants keep 44px mobile touch targets…" (the `icon-lg` match)
  - "every button variant and size keeps 44px below md…" (`default/icon-lg: min-h-11`)
  - "button sizes: sm 32…" (`icon-lg matches the fields (8px)`)

- [ ] **Step 3: The size.** Make three exact replacements in `src/components/ui/button-variants.ts`.

(1) Replace

```ts
// Below md every size is at least 44px tall. Radius follows the mockup (spec I15): sm and icon-sm are small
// controls (rounded-control, 6px); md, lg, default and icon match the fields (rounded-md, 8px).
```

with

```ts
// Below md every size is at least 44px tall. Radius follows the mockup (spec I15): sm and icon-sm are small
// controls (rounded-control, 6px); md, lg, default, icon and icon-lg match the fields (rounded-md, 8px).
// lg and icon-lg (40px from md) are only for a button in the same row as a 40px field (spec 2D D5, D6).
```

(2) Replace

```ts
const sizeIcon = "min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0 rounded-md"
```

with

```ts
const sizeIcon = "min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0 rounded-md"
const sizeIconLg = "min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0 rounded-md"
```

(3) Replace

```ts
        icon: sizeIcon,
      },
```

with

```ts
        icon: sizeIcon,
        "icon-lg": sizeIconLg,
      },
```

- [ ] **Step 4: Check.**
  - Run `node --test tests/design-system.test.ts`. Expected: all pass (14 tests).
  - Run `node <temp>/eol.mjs src/components/ui/button-variants.ts tests/design-system.test.ts`. Expected: equal numbers on each line.
  - Run `npm test` (2011 tests, 2010 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/ui/button-variants.ts tests/design-system.test.ts
git commit -m "feat(ui): icon-lg button size for icon buttons in a row of 40px fields (2D-1 task 1a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 1b: The callers

- [ ] **Step 6: The new test file.** Create `tests/button-size-switch.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-1 (spec 2D §3.1, D3–D6, M1, M2): when `default` and `icon` become 36px, a button in the same row as a 40px
// field keeps 40px: text buttons take size="lg" and icon buttons size="icon-lg" (2C 06-actions.md §6.2.3). Every
// PageHeader button is md. Sources are read with LF line endings, so the regexes below may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("buttons in a row of 40px fields stay 40px: lg for text, icon-lg for icons (spec 2D D3, D5, M2)", () => {
  const rows: Array<[string, RegExp, number]> = [
    [`${C}assets/asset-batch-form.tsx`, /variant="outline"\n\s+size="icon-lg"\n\s+onClick=\{\(\) => handleRemoveRow\(row\.clientId\)\}/g, 1],
    [`${C}assets/asset-form.tsx`, /<Button\n\s+variant="outline"\n\s+size="icon-lg"\n\s+className="justify-self-start"\n\s+onClick=\{\(\) => removeRow\(row\.id\)\}/g, 1],
    [`${C}master-data/asset-model-form.tsx`, /variant="danger"\n\s+size="icon-lg"\n\s+onClick=\{\(\) => removeSpecItem\(item\.id\)\}/g, 1],
    [`${C}master-data/category-form.tsx`, /variant="outline"\n\s+size="icon-lg"\n\s+onClick=\{\(\) => (?:moveItem\(index, -1\)|moveItem\(index, 1\)|duplicateItem\(index\)|removeItem\(index\))\}/g, 4],
  ]
  for (const [path, pattern, count] of rows) assert.equal(read(path).match(pattern)?.length, count, path)
  // The phone card header of the batch form is not a field row: its remove icon follows `icon` to 36px.
  assert.match(read(`${C}assets/asset-batch-form.tsx`), /variant="outline"\n\s+size="icon"\n\s+className="shrink-0"\n\s+onClick=\{\(\) => handleRemoveRow\(row\.clientId\)\}/)
  // The label print toolbar: the print button sits beside two boxed 40px fields (K21).
  assert.match(read(`${C}assets/asset-label-print.tsx`), /<Button size="lg" onClick=\{handlePrint\} busy=\{recordingPrint\} className="w-full sm:w-auto">/)
})

test("the repair record's header buttons are md, like every PageHeader button (spec 2D D6)", () => {
  const source = read(`${C}maintenance/repair-record-actions.tsx`)
  assert.match(source, /<Button size="md" onClick=\{\(\) => setDialog\("complete"\)\}>/)
  assert.match(source, /<Button variant="danger" size="md" onClick=\{\(\) => setDialog\("cancel"\)\}>/)
  assert.match(source, /<Button variant="outline" size="md" onClick=\{\(\) => setDialog\("edit"\)\}>/)
})
```

- [ ] **Step 7: The edited pins (they fail with the new file until Step 9).**
  - `tests/asset-forms-ui.test.ts` (LF):
    - Replace `` assert.match(source, /<Button\n\s*variant="outline"\n\s*size="icon"\n\s*className="justify-self-start"/) ``
    - with `` assert.match(source, /<Button\n\s*variant="outline"\n\s*size="icon-lg"\n\s*className="justify-self-start"/) ``.
  - `tests/category-form-ui.test.ts`:
    - Replace `` assert.equal(source.match(/variant="outline"\n\s+size="icon"/g)?.length, 4, "the photo item remove icon is neutral (K22)") ``
    - with `` assert.equal(source.match(/variant="outline"\n\s+size="icon-lg"/g)?.length, 4, "the photo item icons are 40px beside the 40px field (2D D5); remove is neutral (K22)") ``.
  - `tests/asset-label-print-ui.test.ts`:
    - Replace `` assert.match(source, /<Button onClick=\{handlePrint\} busy=\{recordingPrint\} className="w-full sm:w-auto">\n\s+<Printer aria-hidden="true" \/>\n\s+\{translations\.print\}\n\s+<\/Button>/) ``
    - with `` assert.match(source, /<Button size="lg" onClick=\{handlePrint\} busy=\{recordingPrint\} className="w-full sm:w-auto">\n\s+<Printer aria-hidden="true" \/>\n\s+\{translations\.print\}\n\s+<\/Button>/) ``.
  - `tests/repair-record-detail-ui.test.ts`:
    - Replace the two lines

      ```ts
        assert.match(source, /<Button variant="danger" onClick=\{\(\) => setDialog\("cancel"\)\}>/)
        assert.match(source, /<Button variant="outline" onClick=\{\(\) => setDialog\("edit"\)\}>/)
      ```

    - with

      ```ts
        assert.match(source, /<Button variant="danger" size="md" onClick=\{\(\) => setDialog\("cancel"\)\}>/)
        assert.match(source, /<Button variant="outline" size="md" onClick=\{\(\) => setDialog\("edit"\)\}>/)
      ```

- [ ] **Step 8: Watch them fail.**

Run: `node --test tests/button-size-switch.test.ts tests/asset-forms-ui.test.ts tests/category-form-ui.test.ts tests/asset-label-print-ui.test.ts tests/repair-record-detail-ui.test.ts`
Expected: these fail, because the code still says `size="icon"` and has no `lg` or `md`:
  - both tests of `button-size-switch` (`asset-batch-form.tsx: undefined !== 1`, then `setDialog("complete")`)
  - "asset form: every button is a Button…"
  - "the template editors keep their move limits…"
  - "the label print toolbar keeps its boxed fields…"
  - "the three repair dialogs keep their buttons…"

- [ ] **Step 9: The callers.** Make exact replacements and keep CRLF. The indentation shown is the file's own.
  - `src/components/assets/asset-batch-form.tsx`, the desktop row:
    - Replace

      ```tsx
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveRow(row.clientId)}
      ```

      (24 spaces before each line)
    - with the same three lines, the middle one `size="icon-lg"`.
    - The phone card at `:841-847` has `className="shrink-0"` between `size` and `onClick`, so this match is unique.
  - `src/components/assets/asset-form.tsx`:
    - Replace

      ```tsx
                      variant="outline"
                      size="icon"
                      className="justify-self-start"
                      onClick={() => removeRow(row.id)}
      ```

      (16 spaces)
    - with the same lines, the second `size="icon-lg"`.
  - `src/components/master-data/asset-model-form.tsx`:
    - Replace

      ```tsx
                            variant="danger"
                            size="icon"
                            onClick={() => removeSpecItem(item.id)}
      ```

      (22 spaces)
    - with the same lines, the second `size="icon-lg"`.
  - `src/components/master-data/category-form.tsx`: replace each of the four blocks
    - `variant="outline"` / `size="icon"` / `onClick={() => moveItem(index, -1)}`
    - `variant="outline"` / `size="icon"` / `onClick={() => moveItem(index, 1)}`
    - `variant="outline"` / `size="icon"` / `onClick={() => duplicateItem(index)}`
    - `variant="outline"` / `size="icon"` / `onClick={() => removeItem(index)}`

    (12 spaces each) with the same lines and `size="icon-lg"`. These are the only `size="icon"` in the file.
  - `src/components/assets/asset-label-print.tsx`:
    - Replace `            <Button onClick={handlePrint} busy={recordingPrint} className="w-full sm:w-auto">`
    - with `            <Button size="lg" onClick={handlePrint} busy={recordingPrint} className="w-full sm:w-auto">`.
  - `src/components/maintenance/repair-record-actions.tsx`, the three header buttons:
    - `          <Button onClick={() => setDialog("complete")}>` → `          <Button size="md" onClick={() => setDialog("complete")}>`
    - `          <Button variant="danger" onClick={() => setDialog("cancel")}>` → `          <Button variant="danger" size="md" onClick={() => setDialog("cancel")}>`
    - `      <Button variant="outline" onClick={() => setDialog("edit")}>` → `      <Button variant="outline" size="md" onClick={() => setDialog("edit")}>`

- [ ] **Step 10: Check.**
  - Run the Step 8 command. Expected: all pass.
  - Run `git grep -n 'size="icon"' -- src/components/assets/asset-form.tsx src/components/master-data/category-form.tsx src/components/master-data/asset-model-form.tsx src/components/assets/asset-batch-form.tsx`. Expected: only `src/components/assets/asset-batch-form.tsx:843`.
  - Run `node <temp>/eol.mjs` on the six source files and the five test files. Expected: the CRLF files print equal numbers, `tests/asset-forms-ui.test.ts` prints `0 <n>`, and the new file prints `0 <n>`.
  - Run `npm test` (2013 tests, 2012 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 11: Commit.**

```bash
git add src/components/assets/asset-batch-form.tsx src/components/assets/asset-form.tsx src/components/master-data/asset-model-form.tsx src/components/master-data/category-form.tsx src/components/assets/asset-label-print.tsx src/components/maintenance/repair-record-actions.tsx tests/button-size-switch.test.ts tests/asset-forms-ui.test.ts tests/category-form-ui.test.ts tests/asset-label-print-ui.test.ts tests/repair-record-detail-ui.test.ts
git commit -m "feat(ui): lg and icon-lg for buttons beside 40px fields, md header buttons on the repair record (2D-1 task 1b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `ActionButton` and the legacy helpers of `design-system.ts` (M3, M4, M5)

Spec §4.1, D12, M3, M4, M5, R1.

Three commits, in this order:
- 2a: the one `ActionButton` caller moves and the file goes.
- 2b: the two safe-link callers move.
- 2c: `src/lib/design-system.ts` loses everything with no caller, and its tests lose their pins.

**Callers at `14e7748`** (grep of `src` and `tests`, pins not counted):
- `ActionButton`: only `D/error.tsx:7`, `:30-33`. `IntegrationClientManager.tsx` has a different local `ActionButtons`.
- `getSafeActionLinkClasses` / `getResponsiveActionRowClasses`: only `D/admin/readiness/page.tsx:12`, `:165-174` and `D/asset-management/import-export/page.tsx:11`, `:120-124`.
- No caller outside the file for any of these: `uiTones`, `uiButtonVariants`, `uiButtonSizes`, `normalizeUiTone`, `getMetricCardToneClasses`, `getTableShellClasses`, `getResponsiveTableScrollClasses`, `getEmptyStateClasses`, `getMobileSafeBottomPaddingClasses`, `getActionButtonClasses`.
- `UiButtonVariant` / `UiButtonSize`: only `c/ui/action-button.tsx`.

Pins that may stay because they only say "absent":
- `tests/list-pages-ui.test.ts:574`, `:637`, `:753`
- `tests/asset-state-review-ui.test.ts:57`
- `tests/list-filters-ui.test.ts:100`

**Files:**
- 2a: Modify `src/app/[locale]/(dashboard)/error.tsx`, `tests/list-filters-ui.test.ts` (comment) · Delete `src/components/ui/action-button.tsx` · Create `tests/dead-code-cleanup.test.ts` (LF)
- 2b: Modify `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`, `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx`, `tests/dead-code-cleanup.test.ts`
- 2c: Rewrite `src/lib/design-system.ts`, `tests/design-system.test.ts` · Modify `tests/audit-scan-search-ui.test.ts`

All CRLF except the new test file.

**Interfaces:**
- Produces: `src/lib/design-system.ts` exports `UiTone` (a plain union now), `normalizeAssetStateValue`, `getAssetStateTone`, `getPanelClasses`, `getMobileCardListClasses`, `getDesktopTableOnlyClasses` and `getFieldControlClasses`, and nothing else.
- Produces: `tests/dead-code-cleanup.test.ts`, which Tasks 4 and 5 append to.

#### 2a: The error page

- [ ] **Step 1: The failing test.** Create `tests/dead-code-cleanup.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-1 (spec 2D §4.1, D12): code with no caller is deleted, after its last callers move to the shared parts.
// Each test pins one deletion. Grep src and tests before you delete anything (spec 2D §4.1). Sources are read with LF.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"

test("the error page retries with Button, and ActionButton is gone (spec 2D M3)", () => {
  const source = read(`${D}error.tsx`)
  assert.match(source, /import \{ Button \} from "@\/components\/ui\/button"/)
  assert.match(source, /<Button onClick=\{unstable_retry\}>\n\s+<RefreshCw aria-hidden="true" \/>\n\s+\{t\("tryAgain"\)\}\n\s+<\/Button>/)
  assert.equal(existsSync(`${C}ui/action-button.tsx`), false)
})
```

Run: `node --test tests/dead-code-cleanup.test.ts`
Expected: 1 failure. The page still imports `ActionButton`, so the first match fails.

- [ ] **Step 2: The page.** In `src/app/[locale]/(dashboard)/error.tsx`:
  - Replace `import { ActionButton } from "@/components/ui/action-button"` with `import { Button } from "@/components/ui/button"`.
  - Replace

    ```tsx
                <ActionButton variant="primary" onClick={unstable_retry}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t("tryAgain")}
                </ActionButton>
    ```

  - with

    ```tsx
                <Button onClick={unstable_retry}>
                  <RefreshCw aria-hidden="true" />
                  {t("tryAgain")}
                </Button>
    ```

  This renders the same as the old code:
  - `ActionButton` mapped `primary` → `default` and `md` → `default`, which are Button's defaults.
  - Button defaults `type` to `"button"`.
  - The cva gives the svg `size-4`; 2C ruling 9 drops icon size classes.

- [ ] **Step 3: Delete the file.** Run `git rm src/components/ui/action-button.tsx`.

- [ ] **Step 4: The stale comment.** In `tests/list-filters-ui.test.ts`, replace `` // tells it whether any filter is on, so "clear filters" shows only then. ActionButton itself stays for 2D. `` with `` // tells it whether any filter is on, so "clear filters" shows only then. ActionButton was deleted in plan 2D-1. ``.

- [ ] **Step 5: Check.**
  - Run `node --test tests/dead-code-cleanup.test.ts tests/list-filters-ui.test.ts tests/system-state-views.test.ts tests/asset-register-ux.test.ts`. Expected: all pass.
  - Run `npx tsc --noEmit`. Expected: clean. `design-system.ts` still exports the types; nothing imports the deleted file.
  - Run `npm test` (2014 tests, 2013 pass, 1 skipped) and `npm run lint`.

- [ ] **Step 6: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/error.tsx" src/components/ui/action-button.tsx tests/list-filters-ui.test.ts tests/dead-code-cleanup.test.ts
git commit -m "refactor(ui): the error page retries with Button; delete ActionButton (2D-1 task 2a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 2b: The readiness and import-export links (R1)

- [ ] **Step 7: The failing test.** Append to `tests/dead-code-cleanup.test.ts`:

```ts

test("the readiness and import-export links are outline md links, not the old safe-link helpers (spec 2D M5)", () => {
  const readiness = read(`${D}admin/readiness/page.tsx`)
  assert.match(readiness, /<Link\n\s+href=\{`\/\$\{locale\}\$\{check\.href\}`\}\n\s+className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}\n\s+aria-label=\{`\$\{labels\.action\}: \$\{labels\.title\}`\}\n\s+>\n\s+\{labels\.action\}\n\s+<ArrowRight aria-hidden="true" \/>\n\s+<\/Link>/)
  const importExport = read(`${D}asset-management/import-export/page.tsx`)
  assert.match(importExport, /<div>\n\s+<Link href=\{`\/\$\{locale\}\/assets`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\n\s+\{tCommon\("back"\)\}\n\s+<\/Link>\n\s+<\/div>/)
  for (const source of [readiness, importExport]) {
    assert.match(source, /import \{ buttonVariants \} from "@\/components\/ui\/button-variants"/)
    assert.doesNotMatch(source, /getSafeActionLinkClasses|getResponsiveActionRowClasses|@\/lib\/design-system/)
  }
})
```

Run: `node --test tests/dead-code-cleanup.test.ts`
Expected: 1 failure (the new test). The readiness link still uses `getSafeActionLinkClasses("secondary")`.

- [ ] **Step 8: Readiness.** In `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`:
  - Replace `import { getResponsiveActionRowClasses, getSafeActionLinkClasses } from "@/lib/design-system"` with `import { buttonVariants } from "@/components/ui/button-variants"`.
  - Replace

    ```tsx
            <div className={getResponsiveActionRowClasses()}>
              <Link
                href={`/${locale}${check.href}`}
                className={getSafeActionLinkClasses("secondary")}
                aria-label={`${labels.action}: ${labels.title}`}
              >
                {labels.action}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </div>
    ```

  - with

    ```tsx
            <Link
              href={`/${locale}${check.href}`}
              className={buttonVariants({ variant: "outline", size: "md" })}
              aria-label={`${labels.action}: ${labels.title}`}
            >
              {labels.action}
              <ArrowRight aria-hidden="true" />
            </Link>
    ```

  The parent `mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` stretches the link to full width below `sm`, as the old `w-full` did. From `sm` it takes its own width. The longest labels are "ดูตั้งค่างานอัตโนมัติ" and "Open Automation Settings", which fit on one line.

- [ ] **Step 9: Import-export.** In `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx`:
  - Replace `import { getResponsiveActionRowClasses, getSafeActionLinkClasses } from "@/lib/design-system"` with `import { buttonVariants } from "@/components/ui/button-variants"`.
  - Replace

    ```tsx
          <div className={getResponsiveActionRowClasses()}>
            <Link href={`/${locale}/assets`} className={getSafeActionLinkClasses("secondary")}>
    ```

  - with

    ```tsx
          <div>
            <Link href={`/${locale}/assets`} className={buttonVariants({ variant: "outline", size: "md" })}>
    ```

  The back link takes its natural width on phones; it was full width.
  - It is not moved into `PageHeader back=`, because `tests/asset-register-ux.test.ts:248` pins the header without `back`.

- [ ] **Step 10: Check.**
  - Run `node --test tests/dead-code-cleanup.test.ts tests/list-pages-ui.test.ts tests/asset-register-ux.test.ts`. Expected: all pass.
  - Run `npm test` (2015 tests, 2014 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 11: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/readiness/page.tsx" "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx" tests/dead-code-cleanup.test.ts
git commit -m "refactor(ui): readiness and import-export links on buttonVariants outline md (2D-1 task 2b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 2c: `src/lib/design-system.ts`

- [ ] **Step 12: The tests first.** Write `tests/design-system.test.ts` in full with the content below, then run `node <temp>/crlf.mjs tests/design-system.test.ts`. It keeps every test that is not about a deleted name, carries Task 1a's `icon-lg` changes, and replaces six tests with one:
  - removed: `normalizeUiTone`, the metric card classes, the safe-link test, the touch-icon test, the legacy map test and the "no caller" test of plan 2B-5;
  - the panel test drops its four helper assertions;
  - the new last test checks that every deleted name is gone.

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import * as designSystem from "../src/lib/design-system.ts"
import { buttonVariants, linkVariants } from "../src/components/ui/button-variants.ts"
import { cn } from "../src/lib/utils.ts"
import { readSourceFiles } from "./helpers/source-files.ts"

import { getFieldControlClasses, getPanelClasses } from "../src/lib/design-system.ts"

const getAssetStateTone = (designSystem as Record<string, unknown>).getAssetStateTone

test("returns shared panel and form control classes", () => {
  assert.match(getPanelClasses(), /border-border/)
  assert.match(getFieldControlClasses(), /focus:border-ring/)
  assert.doesNotMatch(getPanelClasses(), /shadow/)
  assert.match(getFieldControlClasses(), /border-input/)
})

test("maps seeded asset status and condition values to explicit semantic tones", () => {
  assert.equal(typeof getAssetStateTone, "function")
  if (typeof getAssetStateTone !== "function") return

  const resolveTone = getAssetStateTone as (value?: string | null) => string
  const cases: Array<[string | undefined, string]> = [
    ["Draft", "neutral"],
    ["Ready", "success"],
    ["In Use", "success"],
    ["Reserved", "info"],
    ["In Transit", "info"],
    ["Under Maintenance", "warning"],
    ["Pending Repair", "warning"],
    ["Under Inspection", "warning"],
    ["Checked Out", "warning"],
    ["Pending Disposal", "warning"],
    ["Lost", "danger"],
    ["Missing", "danger"],
    ["Disposed", "neutral"],
    ["Retired", "neutral"],
    ["New", "success"],
    ["Excellent", "success"],
    ["Good", "success"],
    ["Fair", "warning"],
    ["Poor", "danger"],
    ["Damaged", "danger"],
    ["Non-functional", "danger"],
    ["Salvage", "neutral"],
    ["Active", "success"],
    ["in_use", "success"],
    ["unknown legacy value", "info"],
    [undefined, "muted"],
  ]

  for (const [value, expectedTone] of cases) {
    assert.equal(resolveTone(value), expectedTone, value ?? "undefined")
  }
})

const buttonVariantNames = ["default", "outline", "ghost", "danger", "destructive", "warning"] as const
const buttonSizeNames = ["sm", "md", "lg", "default", "icon-sm", "icon", "icon-lg"] as const
const classList = (value: string) => value.split(/\s+/).filter(Boolean)

test("button variants keep 44px mobile touch targets and AA hover fills", () => {
  const primary = buttonVariants({ variant: "default" })
  assert.match(primary, /bg-primary text-primary-foreground/)
  assert.match(primary, /hover:bg-primary-hover/)
  assert.match(primary, /min-h-11/)
  assert.match(primary, /md:h-10 md:min-h-0/)
  assert.match(buttonVariants({ variant: "destructive" }), /bg-destructive text-destructive-foreground hover:bg-danger-hover/)
  assert.match(buttonVariants({ variant: "warning" }), /bg-warning text-warning-foreground hover:bg-warning-hover/)
  assert.match(buttonVariants({ variant: "outline" }), /border-control-border bg-surface/)
  assert.ok(classList(buttonVariants({ variant: "outline" })).includes("border"), "the base draws a 1px border")
  assert.match(buttonVariants({ size: "sm" }), /min-h-11 px-2\.5 text-meta md:h-8 md:min-h-0/)
  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/)
  assert.match(buttonVariants({ size: "icon-lg" }), /min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/)
  assert.doesNotMatch(`${primary} ${buttonVariants({ variant: "destructive" })}`, /dark:/)
})

test("every button variant and size keeps 44px below md, a 1px border, no opacity and no sm: breakpoint", () => {
  for (const variant of buttonVariantNames) {
    for (const size of buttonSizeNames) {
      const classes = buttonVariants({ variant, size })
      const label = `${variant}/${size}`
      assert.ok(classList(classes).includes("min-h-11"), `${label}: min-h-11`)
      assert.ok(classList(classes).includes("border"), `${label}: border`)
      assert.doesNotMatch(classes, /opacity|(?<![\w-])sm:(?:h-|min-h|size-)|dark:/, label)
      assert.equal(cn(classes), classes, `${label}: cn() must not drop a class (Button merges through cn)`)
    }
  }
})

test("the disabled look wins over every variant without opacity, and busy shares it through aria-disabled", () => {
  const classes = buttonVariants({ variant: "outline", size: "md" })
  assert.match(classes, /cursor-pointer/)
  assert.match(classes, /gap-1\.5/)
  assert.match(classes, /disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-faint-foreground/)
  assert.match(classes, /aria-disabled:pointer-events-none aria-disabled:border-border aria-disabled:bg-background aria-disabled:text-faint-foreground/)
  assert.doesNotMatch(classes, /(?<![\w-])disabled:pointer-events-none/, "a disabled button must still show the not-allowed cursor")
})

test("button variants follow the mockup: outlined danger in pages, solid destructive for dialog confirms", () => {
  const danger = buttonVariants({ variant: "danger" })
  assert.match(danger, /border-danger-border bg-surface text-danger/)
  assert.match(danger, /hover:bg-danger-soft/)
  assert.match(danger, /active:border-danger/)
  assert.ok(!classList(danger).some((name) => name === "bg-danger" || name === "bg-destructive"), "danger is outlined, not solid")
  assert.match(buttonVariants({ variant: "default" }), /active:border-brand-navy active:bg-brand-navy/)
  assert.match(buttonVariants({ variant: "outline" }), /hover:border-input hover:bg-background active:border-input active:bg-muted/)
  assert.match(buttonVariants({ variant: "ghost" }), /border-transparent bg-transparent text-muted-foreground hover:bg-background hover:text-foreground active:bg-muted/)
  for (const variant of buttonVariantNames) {
    assert.doesNotMatch(buttonVariants({ variant }), /active:bg-accent/, variant)
  }
  assert.doesNotMatch(buttonVariants({ variant: "secondary" as never }), /bg-secondary/, "secondary was removed")
  assert.doesNotMatch(buttonVariants({ variant: "link" as never }), /underline/, "link moved to linkVariants")
})

test("button sizes: sm 32, md 36, lg 40 from md up, default stays lg until phase 2D, radius per spec I15", () => {
  assert.match(buttonVariants({ size: "md" }), /min-h-11 px-3\.5 text-sm md:h-9 md:min-h-0/)
  assert.match(buttonVariants({ size: "lg" }), /min-h-11 px-4 text-sm md:h-10 md:min-h-0/)
  assert.equal(buttonVariants({ size: "default" }), buttonVariants({ size: "lg" }), "phase 2D switches default to md")
  assert.match(buttonVariants({ size: "icon-sm" }), /min-h-11 min-w-11 md:size-8 md:min-h-0 md:min-w-0/)
  for (const size of ["sm", "icon-sm"] as const) {
    assert.ok(classList(buttonVariants({ size })).includes("rounded-control"), `${size} is a small control (6px)`)
    assert.doesNotMatch(buttonVariants({ size }), /rounded-md/, size)
  }
  for (const size of ["md", "lg", "default", "icon", "icon-lg"] as const) {
    assert.ok(classList(buttonVariants({ size })).includes("rounded-md"), `${size} matches the fields (8px)`)
    assert.doesNotMatch(buttonVariants({ size }), /rounded-control/, size)
  }
})

test("linkVariants draws a text link that underlines on hover and focus, with no button box", () => {
  const link = linkVariants()
  assert.match(link, /text-primary/)
  assert.match(link, /text-meta/)
  assert.match(link, /decoration-transparent/)
  assert.match(link, /hover:decoration-current/)
  assert.match(link, /focus-visible:decoration-current/)
  assert.doesNotMatch(link, /min-h-|rounded|border/)
  assert.doesNotMatch(linkVariants({ size: "inherit" }), /text-meta/)
})

// Plan 2D-1 (spec 2D §4.1, D12, M3–M5): ActionButton, the legacy button maps and the class helpers with no caller are
// gone. The two safe-link callers moved to buttonVariants first (task 2b).
test("the legacy button and class helpers are gone (spec 2D §4.1)", () => {
  const gone = [
    "uiTones",
    "uiButtonVariants",
    "uiButtonSizes",
    "normalizeUiTone",
    "getMetricCardToneClasses",
    "getTableShellClasses",
    "getResponsiveTableScrollClasses",
    "getEmptyStateClasses",
    "getMobileSafeBottomPaddingClasses",
    "getActionButtonClasses",
    "getSafeActionLinkClasses",
    "getResponsiveActionRowClasses",
    "getTouchIconButtonClasses",
  ]
  for (const name of gone) assert.equal(name in designSystem, false, name)
  assert.equal(existsSync("src/components/ui/action-button.tsx"), false)
  const callers = readSourceFiles("src").filter((file) => /\bActionButton\b|\bget(?:SafeActionLink|ResponsiveActionRow|ActionButton|TableShell)Classes\b/.test(file.source))
  assert.deepEqual(callers.map((file) => file.path), [])
})
```

- [ ] **Step 13: The other pin.** In `tests/audit-scan-search-ui.test.ts`:
  - Replace

    ```ts
    test("the scan screen offers no not-found action; mobile safe-area padding stays on the shared bars", () => {
      const actionBar = read("src/components/ui/action-bar.tsx")
      const designSystem = read("src/lib/design-system.ts")
    ```

  - with

    ```ts
    test("the scan screen offers no not-found action; the shared action bar keeps the safe-area padding", () => {
      const actionBar = read("src/components/ui/action-bar.tsx")
    ```

  - Then delete the line `  assert.match(designSystem, /pb-\[calc\(6rem\+max\(0\.75rem,env\(safe-area-inset-bottom\)\)\)\] sm:pb-0/)` and its CRLF.

- [ ] **Step 14: Watch it fail.**

Run: `node --test tests/design-system.test.ts`
Expected: 1 failure, "the legacy button and class helpers are gone": `uiTones` is still exported. The other 8 pass.

- [ ] **Step 15: The module.** Write `src/lib/design-system.ts` in full with the content below, then run `node <temp>/crlf.mjs src/lib/design-system.ts`.
  - The `buttonVariants` and `cn` imports go with their last users.
  - `UiTone` is a plain union now, because `uiTones` is gone.
  - Every kept function is unchanged.

```ts
import { fieldControlVariants, type FieldSize } from "../components/ui/field-variants.ts"

export type UiTone = "neutral" | "info" | "success" | "warning" | "danger" | "muted"

const successAssetStateValues = new Set(["ready", "in use", "new", "excellent", "good", "active"])
const warningAssetStateValues = new Set(["checked out", "under maintenance", "pending repair", "under inspection", "pending disposal", "fair"])
const dangerAssetStateValues = new Set(["lost", "missing", "damaged", "non functional", "poor"])
// Salvage describes a terminal inventory state, so it shares neutral inactive treatment.
const neutralAssetStateValues = new Set(["draft", "disposed", "retired", "salvage"])

export function normalizeAssetStateValue(value?: string | null) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[_\s-]+/g, " ") : ""
}

export function getAssetStateTone(value?: string | null): UiTone {
  const normalizedValue = normalizeAssetStateValue(value)

  if (!normalizedValue) return "muted"
  if (successAssetStateValues.has(normalizedValue)) return "success"
  if (warningAssetStateValues.has(normalizedValue)) return "warning"
  if (dangerAssetStateValues.has(normalizedValue)) return "danger"
  if (neutralAssetStateValues.has(normalizedValue)) return "neutral"
  return "info"
}

export function getPanelClasses() {
  return "min-w-0 max-w-full rounded-lg border border-border bg-surface"
}

export function getMobileCardListClasses() {
  return "grid gap-3 md:hidden"
}

export function getDesktopTableOnlyClasses() {
  return "hidden md:block"
}

// The field recipe as a class string, for elements that cannot use a primitive (a <button> trigger, a <select>
// that keeps its own markup). Change the height with fieldSize, not a className. <select> callers get no chevron here.
export function getFieldControlClasses(options?: { fieldSize?: FieldSize }) {
  return fieldControlVariants(options)
}
```

- [ ] **Step 16: Check.**
  - Run `node --test tests/design-system.test.ts tests/audit-scan-search-ui.test.ts tests/visual-foundation-guards.test.ts`. Expected: all pass. `design-system.test` has 9 tests; VFG `:87` reads `function getPanelClasses() {…}`, which is unchanged.
  - Run `git diff -- src/lib/design-system.ts | grep '^+[^+]'`. Expected: only `+export type UiTone = "neutral" | "info" | "success" | "warning" | "danger" | "muted"`. Every other line of the file existed before.
  - Run `node <temp>/eol.mjs src/lib/design-system.ts tests/design-system.test.ts tests/audit-scan-search-ui.test.ts`. Expected: equal numbers on each line.
  - Run `npx tsc --noEmit` (clean), `npm test` (2010 tests, 2009 pass, 1 skipped: 6 tests out and 1 in) and `npm run lint`.

- [ ] **Step 17: Commit.**

```bash
git add src/lib/design-system.ts tests/design-system.test.ts tests/audit-scan-search-ui.test.ts
git commit -m "refactor(ui): delete the legacy button maps and the class helpers with no caller (2D-1 task 2c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The switch: `default` and `icon` are 36px from `md` (M1, D3)

Spec §3.1, D3, M1. Task 1 made every button that sits beside a 40px field `lg` or `icon-lg`, and Task 2c deleted `getSafeActionLinkClasses`, so the switch is two class lines and their pins.

What users will see from `md` up:
- The 115 `<Button>` with no size, the 25 unsized `buttonVariants(...)` links and the 14 `size="icon"` buttons are 36px (40 before).
- An unsized text button has 14px side padding (16 before).
- Below `md`, nothing changes: every size keeps `min-h-11`.

Accepted mixes until their plan (R3):
- `system-settings-form.tsx:1027` (40 min)
- `IntegrationClientManager.tsx:844` beside raw 44px buttons
- the hand-written `md:h-10` controls that the scout listed: `D/assets/[id]/page.tsx:1825`, `:1833`; `D/disposal/[id]/page.tsx:214`; `IntegrationClientManager.tsx:358`, `:389`; `audit-round-close-button.tsx:67`; `audit-scan-panels.tsx:78`, `:87`, `:96`; `disposal-asset-picker.tsx:63`, `:68`; `asset-components-summary.tsx:67`; `report-preset-controls.tsx:85`

**Files:**
- Modify: `src/components/ui/button-variants.ts`, `tests/design-system.test.ts` (CRLF)

**Interfaces:**
- Produces: `default` = `md` (`min-h-11 px-3.5 text-sm md:h-9 md:min-h-0 rounded-md`) and `icon` = `min-h-11 min-w-11 md:size-9 md:min-h-0 md:min-w-0 rounded-md`.
- `lg` and `icon-lg` stay 40.
- `defaultVariants.size` stays `"default"`, and `data-size` stays `"default"` (no CSS reads it).

- [ ] **Step 1: The failing pins.** Make four exact replacements in `tests/design-system.test.ts`.

(1) Replace `  assert.match(primary, /md:h-10 md:min-h-0/)` with `  assert.match(primary, /md:h-9 md:min-h-0/)`.

(2) Replace `  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0/)` with `  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 md:size-9 md:min-h-0 md:min-w-0/)`.

(3) Replace `test("button sizes: sm 32, md 36, lg 40 from md up, default stays lg until phase 2D, radius per spec I15", () => {` with `test("button sizes from md up: sm 32, md 36, lg 40, default = md (phase 2D), icon 36, icon-lg 40, radius per spec I15", () => {`.

(4) Replace

```ts
  assert.equal(buttonVariants({ size: "default" }), buttonVariants({ size: "lg" }), "phase 2D switches default to md")
```

with

```ts
  assert.equal(buttonVariants({ size: "default" }), buttonVariants({ size: "md" }), "phase 2D: default is md (36px)")
  assert.notEqual(buttonVariants({ size: "icon" }), buttonVariants({ size: "icon-lg" }), "icon is 36px, icon-lg 40px beside 40px fields")
```

- [ ] **Step 2: Watch them fail.**

Run: `node --test tests/design-system.test.ts`
Expected: 2 failures, because `default` is still `sizeLg` and `icon` still `md:size-10`:
  - "button variants keep 44px mobile touch targets…" (`md:h-9`)
  - "button sizes from md up…" (`default` ≠ `md`)

- [ ] **Step 3: The switch.** Make three exact replacements in `src/components/ui/button-variants.ts`.

(1) Replace `` // Size strings live in constants so phase 2D can switch `default` and `icon` to 36px by editing one line each. `` with `` // Phase 2D (spec 2D D3): `default` is `md` and `icon` is 36px from md. Sizes live in constants, one string each. ``.

(2) Replace `const sizeIcon = "min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0 rounded-md"` with `const sizeIcon = "min-h-11 min-w-11 md:size-9 md:min-h-0 md:min-w-0 rounded-md"`.

(3) Replace `        default: sizeLg,` with `        default: sizeMd,`.

- [ ] **Step 4: Check.**
  - Run `node --test tests/design-system.test.ts`. Expected: 9 pass. The `cn()` stability loop holds for the new `icon` string.
  - Run `git grep -n "md:size-10\|default: sizeLg" -- src/components/ui/button-variants.ts`. Expected: only the `sizeIconLg` line.
  - Run `npm test` (2010 tests, 2009 pass, 1 skipped). No other test pins a 40px default or icon; `field-primitives` and `asset-label-print-ui` pin fields, which stay 40.
  - Run `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/ui/button-variants.ts tests/design-system.test.ts
git commit -m "feat(ui): default and icon buttons are 36px from md (2D-1 task 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The other dead code (M6, Badge, M9, M10)

Spec §4.1, D12. Four commits, each independent of the others. Before each deletion, the step's grep must show no caller.

**Files:**
- 4a: Delete `src/components/master-data/master-data-delete-button.tsx` (CRLF), `src/components/master-data/asset-delete-button.tsx` (LF) · Modify `tests/confirm-dialog-ui.test.ts`, `tests/dead-code-cleanup.test.ts`
- 4b: Delete `src/components/ui/badge.tsx` · Modify `src/components/ui/badge-variants.ts`, `tests/dead-code-cleanup.test.ts`
- 4c: Modify `src/lib/asset-detail-format.ts`, `tests/dead-code-cleanup.test.ts`
- 4d: Modify `src/components/assets/asset-state-help-popover.tsx`, `tests/asset-status-help-ui.test.ts`

**Interfaces:**
- `use-delete-action.ts` stays: `c/ui/row-actions.tsx` uses it.
- `statusBadgeVariants` and `statusMarkerVariants` stay.
- `AssetStateHelpPopover` keeps its props except `size`.

#### 4a: `MasterDataDeleteButton` and `AssetDeleteButton` (M6)

- [ ] **Step 1: No caller.**

Run: `git grep -n "MasterDataDeleteButton\|AssetDeleteButton\|master-data-delete-button\|asset-delete-button" -- src tests`
Expected:
  - the two files themselves (`asset-delete-button.tsx` imports the other);
  - `tests/confirm-dialog-ui.test.ts:38`;
  - only "absent" pins: `tests/asset-register-table-ui.test.ts:185` and `tests/dropdown-menus-ui.test.ts:35`, `:42`.

- [ ] **Step 2: The failing test.** Append to `tests/dead-code-cleanup.test.ts`:

```ts

test("the delete buttons with no caller are gone; RowActions keeps useDeleteAction (spec 2D M6)", () => {
  for (const path of [`${C}master-data/master-data-delete-button.tsx`, `${C}master-data/asset-delete-button.tsx`]) assert.equal(existsSync(path), false, path)
  assert.match(read(`${C}ui/row-actions.tsx`), /useDeleteAction/)
})
```

Run: `node --test tests/dead-code-cleanup.test.ts`
Expected: 1 failure (the files exist).

- [ ] **Step 3: Delete.**
  - Run `git rm src/components/master-data/master-data-delete-button.tsx src/components/master-data/asset-delete-button.tsx`.
  - In `tests/confirm-dialog-ui.test.ts`, delete the line `  assert.match(read("src/components/master-data/master-data-delete-button.tsx"), /useDeleteAction\(endpoint\)/)` and its CRLF.

- [ ] **Step 4: Check.**
  - Run `node --test tests/dead-code-cleanup.test.ts tests/confirm-dialog-ui.test.ts tests/list-frame-guards.test.ts`. Expected: all pass. No LFG or FMG row names either file.
  - Run `npm test` (2011 tests, 2010 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/master-data/master-data-delete-button.tsx src/components/master-data/asset-delete-button.tsx tests/confirm-dialog-ui.test.ts tests/dead-code-cleanup.test.ts
git commit -m "refactor(ui): delete MasterDataDeleteButton and AssetDeleteButton, which nothing renders (2D-1 task 4a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 4b: `Badge` and `badgeVariants` (R7)

- [ ] **Step 6: No caller.**

Run: `git grep -nw "Badge\|badgeVariants" -- src tests`
Expected: hits only in `src/components/ui/badge.tsx` and the `badgeVariants` definition in `src/components/ui/badge-variants.ts:3`. `StatusBadge`, `ActiveBadge` and `statusBadgeVariants` do not match `-w Badge`.

- [ ] **Step 7: The failing test.** Append to `tests/dead-code-cleanup.test.ts`:

```ts

test("Badge and badgeVariants are gone; the status badge keeps its variants (spec 2D §4.1)", () => {
  assert.equal(existsSync(`${C}ui/badge.tsx`), false)
  const variants = read(`${C}ui/badge-variants.ts`)
  assert.doesNotMatch(variants, /\bbadgeVariants\b/)
  assert.match(variants, /^import \{ cva \} from "class-variance-authority"\n\n\/\/ Two tiers:/)
  assert.match(variants, /export const statusBadgeVariants = cva\(/)
  assert.match(variants, /export const statusMarkerVariants = cva\(/)
})
```

Run: `node --test tests/dead-code-cleanup.test.ts`
Expected: 1 failure (`badge.tsx` exists).

- [ ] **Step 8: Delete.**
  - Run `git rm src/components/ui/badge.tsx`.
  - In `src/components/ui/badge-variants.ts`, delete from `export const badgeVariants = cva(` through the `)` that closes it and the blank line after it (lines 3–17 at `14e7748`).
  - The file then starts `import { cva } from "class-variance-authority"`, a blank line, `// Two tiers: calm states read as plain text with a marker; …`.

- [ ] **Step 9: Check.**
  - Run `node --test tests/dead-code-cleanup.test.ts tests/modern-enterprise-theme.test.ts tests/status-badge.test.ts`. Expected: all pass. `modern-enterprise-theme` reads three class pairs that `statusBadgeVariants` holds.
  - Run `node <temp>/eol.mjs src/components/ui/badge-variants.ts`. Expected: equal numbers.
  - Run `npm test` (2012 tests, 2011 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 10: Commit.**

```bash
git add src/components/ui/badge.tsx src/components/ui/badge-variants.ts tests/dead-code-cleanup.test.ts
git commit -m "refactor(ui): delete Badge and badgeVariants, which nothing imports (2D-1 task 4b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 4c: The old asset detail helpers (M9, code)

- [ ] **Step 11: No caller.**

Run: `git grep -n "getHealthPanelClass\|getSummaryToneClass" -- src tests`
Expected: only their definitions in `src/lib/asset-detail-format.ts`.

- [ ] **Step 12: The failing test.**
  - Add `import * as assetDetailFormat from "../src/lib/asset-detail-format.ts"` to `tests/dead-code-cleanup.test.ts`, directly below `import test from "node:test"`.
  - Append:

```ts

test("the old panel helpers of the asset detail page are gone (spec 2D M9)", () => {
  for (const name of ["getHealthPanelClass", "getSummaryToneClass"]) assert.equal(name in assetDetailFormat, false, name)
  assert.equal(typeof assetDetailFormat.getHealthBadgeClass, "function", "the badge helper the page uses stays")
})
```

Run: `node --test tests/dead-code-cleanup.test.ts`
Expected: 1 failure (`getHealthPanelClass` is exported).

- [ ] **Step 13: Delete.** In `src/lib/asset-detail-format.ts`, delete these two functions, each with the blank line after it:

```ts
export function getHealthPanelClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "border-success-border bg-success-soft"
  if (tone === "warning") return "border-warning-border bg-warning-soft"
  return "border-danger-border bg-danger-soft"
}
```

and

```ts
export function getSummaryToneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "border-success-border bg-success-soft"
  if (tone === "warning") return "border-warning-border bg-warning-soft"
  if (tone === "danger") return "border-danger-border bg-danger-soft"
  return "border-border bg-background"
}
```

The key `asset.latestMaintenance` goes in Task 5b.

- [ ] **Step 14: Check.**
  - Run `node --test tests/dead-code-cleanup.test.ts tests/asset-detail-format.test.ts`. Expected: all pass.
  - Run `node <temp>/eol.mjs src/lib/asset-detail-format.ts`.
  - Run `npm test` (2013 tests, 2012 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 15: Commit.**

```bash
git add src/lib/asset-detail-format.ts tests/dead-code-cleanup.test.ts
git commit -m "refactor(assets): delete getHealthPanelClass and getSummaryToneClass, which nothing calls (2D-1 task 4c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 4d: `size="compact"` of `AssetStateHelpPopover` (M10)

- [ ] **Step 16: No caller.**

Run: `git grep -n "AssetStateHelpPopover" -- src`
Expected: the 8 render sites below. Read each: none passes `size`, and none of the spread help objects has a `size` key.
  - `D/assets/[id]/page.tsx` twice
  - `c/assets/asset-form.tsx` twice
  - `c/assets/asset-register-filter-sheet.tsx` twice
  - `c/assets/asset-register-table.tsx` once
  - plus the definition

- [ ] **Step 17: The failing pin.** In `tests/asset-status-help-ui.test.ts`:
  - Replace the two lines

    ```ts
      assert.match(source, /size = "default"/)
      assert.match(source, /isCompact/)
    ```

  - with

    ```ts
      assert.doesNotMatch(source, /isCompact|"compact"|size\?:/, "one size only (spec 2D M10)")
      assert.match(source, /className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/)
    ```

Run: `node --test tests/asset-status-help-ui.test.ts`
Expected: 1 failure (`isCompact` is still there).

- [ ] **Step 18: The component.** In `src/components/assets/asset-state-help-popover.tsx`:
  - Delete the line `  size?: "default" | "compact"`.
  - Replace `export function AssetStateHelpPopover({ title, description, items, srLabel, size = "default" }: AssetStateHelpPopoverProps) {` with `export function AssetStateHelpPopover({ title, description, items, srLabel }: AssetStateHelpPopoverProps) {`.
  - Delete the five lines from `  const isCompact = size === "compact"` through `  const iconClassName = isCompact ? "h-3.5 w-3.5" : "h-4 w-4"`.
  - Replace `          className={buttonClassName}` with `          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"`.
  - Replace `          <CircleHelp className={iconClassName} aria-hidden="true" />` with `          <CircleHelp className="h-4 w-4" aria-hidden="true" />`.

  The default look is unchanged.

- [ ] **Step 19: Check.**
  - Run `node --test tests/asset-status-help-ui.test.ts`. Expected: all pass.
  - Run `node <temp>/eol.mjs src/components/assets/asset-state-help-popover.tsx tests/asset-status-help-ui.test.ts`.
  - Run `npm test` (2013 tests, 2012 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 20: Commit.**

```bash
git add src/components/assets/asset-state-help-popover.tsx tests/asset-status-help-ui.test.ts
git commit -m "refactor(assets): the state help popover has one size (2D-1 task 4d)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The busy labels nobody reads (M8) and their keys

Spec M8 (2C `06-actions.md` §6.5.2: 10 swaps), M9 (key), R6. 2C removed every busy label swap (K13): what is left is the type props, the lines that pass them, and the keys.

Two commits:
- 5a: the props and the pass lines together, so tsc never sees a missing or excess property.
- 5b: the keys, once no code reads them.

**The pairs:**

| # | type prop (deleted) | pass line (deleted) | key (5b) |
|---|---|---|---|
| 1 | none (`labels` is a `Record<string, string>` in `c/admin/asset-state-review-dialog.tsx`) | `D/admin/data-quality/page.tsx:131` `saving: tCommon("saving"),` | `common.saving` |
| 2 | none | none (`c/asset-operations/checkin-form.tsx` no longer reads it) | `checkin.legacyReturnCreating` |
| 3 | none | none | `asset.batchCheckDuplicatesRunning` |
| 4 | `c/assets/asset-component-manager.tsx:92` `installing: string` | `D/assets/[id]/components/page.tsx:115` | `asset.componentInstalling` |
| 5 | `c/assets/asset-component-manager.tsx:100` `removing: string` | `D/assets/[id]/components/page.tsx:123` | `asset.componentRemoving` |
| 6 | `c/assets/asset-status-correction-button.tsx:22` `submitting: string` | `D/assets/[id]/page.tsx:1063` | `asset.statusCorrectionSubmitting` |
| 7 | none | none (`c/auth/login-form.tsx`) | `auth.loggingIn` |
| 8 | none: `labels.chooseFile` is still read at `c/assets/asset-import-preview-panel.tsx:216` | none | none |
| 9 | `c/assets/asset-import-preview-panel.tsx:54` `importing: string` | `D/asset-management/import-export/page.tsx:73`, `D/assets/page.tsx:451` | `asset.importing` |
| 10 | `c/assets/asset-label-print.tsx:48` `recordingPrint: string` (the state `recordingPrint` stays) | `src/app/[locale]/(print)/assets/labels/page.tsx:80`, `src/app/[locale]/(print)/assets/[id]/label/page.tsx:75` (both **LF**) | `asset.recordingLabelPrint` |
| M9 | – | – | `asset.latestMaintenance` |

FMG `BUSY_LABEL_SWAPS` (`tests/form-migration-guards.test.ts:152-161`) asserts only that these expressions are absent. It stays green, and 2D-5 decides its future.

**Files:**
- 5a: Modify the 4 components and 7 pages in the table · `tests/dead-code-cleanup.test.ts`
- 5b: Modify `messages/th.json`, `messages/en.json` (through the script), `tests/dead-code-cleanup.test.ts`, `tests/asset-state-review-ui.test.ts`, `tests/legacy-checkin-flow.test.ts`, `tests/login-form-ui.test.ts`

#### 5a: The props and the pass lines

- [ ] **Step 1: Check the reads.**

Run: `git grep -n "labels\.saving\|labels\.installing\|labels\.removing\|labels\.submitting\|labels\.importing\|translations\.recordingPrint\|legacyReturnCreating\|batchCheckDuplicatesRunning\|\"loggingIn\"" -- src`
Expected: nothing. No component reads any of them.

Run: `node scripts/find-unused-messages.mjs | grep -cE "^(common\.saving|checkin\.legacyReturnCreating|asset\.(batchCheckDuplicatesRunning|componentInstalling|componentRemoving|statusCorrectionSubmitting|importing|recordingLabelPrint|latestMaintenance)|auth\.loggingIn)$"`
Expected: `4` (`auth.loggingIn`, `asset.batchCheckDuplicatesRunning`, `asset.latestMaintenance`, `checkin.legacyReturnCreating`).

- [ ] **Step 2: The failing test.** Append to `tests/dead-code-cleanup.test.ts`:

```ts

test("the busy labels nobody reads are gone from the props and the pages (spec 2D M8)", () => {
  const gone: Array<[string, RegExp]> = [
    [`${C}assets/asset-component-manager.tsx`, /^\s+(?:installing|removing): string$/m],
    [`${C}assets/asset-status-correction-button.tsx`, /^\s+submitting: string$/m],
    [`${C}assets/asset-import-preview-panel.tsx`, /^\s+importing: string$/m],
    [`${C}assets/asset-label-print.tsx`, /^\s+recordingPrint: string$/m],
    [`${D}assets/[id]/components/page.tsx`, /componentInstalling|componentRemoving/],
    [`${D}assets/[id]/page.tsx`, /statusCorrectionSubmitting/],
    [`${D}asset-management/import-export/page.tsx`, /importing: t\("importing"\)/],
    [`${D}assets/page.tsx`, /importing: t\("importing"\)/],
    ["src/app/[locale]/(print)/assets/labels/page.tsx", /recordingLabelPrint/],
    ["src/app/[locale]/(print)/assets/[id]/label/page.tsx", /recordingLabelPrint/],
    [`${D}admin/data-quality/page.tsx`, /saving: tCommon\("saving"\)/],
  ]
  for (const [path, pattern] of gone) assert.doesNotMatch(read(path), pattern, path)
  // The label print state stays: it drives busy={recordingPrint} on the print button.
  assert.match(read(`${C}assets/asset-label-print.tsx`), /const \[recordingPrint, setRecordingPrint\] = useState\(false\)/)
})
```

Run: `node --test tests/dead-code-cleanup.test.ts`
Expected: 1 failure on `src/components/assets/asset-component-manager.tsx`.

- [ ] **Step 3: Delete the lines.** Delete each whole line below with its line ending (CRLF, or LF in the two print pages). Each line is unique in its file.

| File | Line to delete |
|---|---|
| `src/components/assets/asset-component-manager.tsx` | `  installing: string` |
| `src/components/assets/asset-component-manager.tsx` | `  removing: string` |
| `src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx` | `        installing: t("componentInstalling"),` |
| `src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx` | `        removing: t("componentRemoving"),` |
| `src/components/assets/asset-status-correction-button.tsx` | `    submitting: string` |
| `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` | `                  submitting: t("statusCorrectionSubmitting"),` |
| `src/components/assets/asset-import-preview-panel.tsx` | `    importing: string` |
| `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx` | `          importing: t("importing"),` |
| `src/app/[locale]/(dashboard)/assets/page.tsx` | `          importing: t("importing"),` |
| `src/components/assets/asset-label-print.tsx` | `    recordingPrint: string` |
| `src/app/[locale]/(print)/assets/labels/page.tsx` | `        recordingPrint: t("recordingLabelPrint"),` |
| `src/app/[locale]/(print)/assets/[id]/label/page.tsx` | `        recordingPrint: t("recordingLabelPrint"),` |
| `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx` | `          saving: tCommon("saving"),` |

`tCommon` stays in use on the data-quality page through `cancel: tCommon("cancel")`.

- [ ] **Step 4: Check.**
  - Run `node --test tests/dead-code-cleanup.test.ts tests/asset-label-print-ui.test.ts tests/asset-register-ux.test.ts tests/asset-state-review-ui.test.ts tests/form-migration-guards.test.ts`. Expected: all pass. The keys still exist, so the key pins of `asset-state-review-ui` still pass.
  - Run `node scripts/find-unused-messages.mjs | grep -cE` with the pattern of Step 1. Expected: `10`.
  - Run `node <temp>/eol.mjs` on the 11 edited files. Expected: the two print pages print `0 <n>`; the others print equal numbers.
  - Run `npx tsc --noEmit` (clean), `npm test` (2014 tests, 2013 pass, 1 skipped) and `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/components/assets/asset-component-manager.tsx src/components/assets/asset-status-correction-button.tsx src/components/assets/asset-import-preview-panel.tsx src/components/assets/asset-label-print.tsx "src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx" "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx" "src/app/[locale]/(dashboard)/assets/page.tsx" "src/app/[locale]/(print)/assets/labels/page.tsx" "src/app/[locale]/(print)/assets/[id]/label/page.tsx" "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" tests/dead-code-cleanup.test.ts
git commit -m "refactor(ui): delete the busy label props and pass lines nobody reads (2D-1 task 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 5b: The keys

- [ ] **Step 6: The failing test and the key pins.**
  - Append to `tests/dead-code-cleanup.test.ts`:

```ts

test("the busy keys nobody reads are gone from both languages (spec 2D M8, M9)", () => {
  const keys = [
    "common.saving",
    "checkin.legacyReturnCreating",
    "asset.batchCheckDuplicatesRunning",
    "asset.componentInstalling",
    "asset.componentRemoving",
    "asset.statusCorrectionSubmitting",
    "auth.loggingIn",
    "asset.importing",
    "asset.recordingLabelPrint",
    "asset.latestMaintenance",
  ]
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, unknown>>
    for (const key of keys) {
      const [namespace, name] = key.split(".")
      assert.equal(name in (messages[namespace] ?? {}), false, `${locale} ${key}`)
    }
  }
})
```

  - In `tests/asset-state-review-ui.test.ts`:
    - Replace

      ```ts
      test("placeholder labels reach the workspace raw and common.saving exists", () => {
        const page = readFileSync("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx", "utf8")
        assert.match(page, /total: t\.raw\("assetStateReviews\.total"\)/)
        assert.match(page, /scanSuccess: t\.raw\("assetStateReviews\.scanSuccess"\)/)
        const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
        const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
        assert.equal(th.common.saving, "กำลังบันทึก...")
        assert.equal(en.common.saving, "Saving...")
      })
      ```

    - with

      ```ts
      test("placeholder labels reach the workspace raw", () => {
        const page = readFileSync("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx", "utf8")
        assert.match(page, /total: t\.raw\("assetStateReviews\.total"\)/)
        assert.match(page, /scanSuccess: t\.raw\("assetStateReviews\.scanSuccess"\)/)
      })
      ```

    - Replace `` // it saves and keeps its label (common.saving stays for other screens); the reason shows the star its required enforces. `` with `` // it saves and keeps its label (plan 2D-1 deleted the unread common.saving); the reason shows the star its required enforces. ``.
  - In `tests/legacy-checkin-flow.test.ts`, delete the line `    "legacyReturnCreating",` with its CRLF.
  - In `tests/login-form-ui.test.ts`:
    - Replace `test("login translations include visibility and loading copy", () => {` with `test("login translations include the password visibility copy", () => {`.
    - Delete the two lines `  assert.equal(thai.auth.loggingIn, "กำลังเข้าสู่ระบบ...")` and `  assert.equal(english.auth.loggingIn, "Signing in...")`.

Run: `node --test tests/dead-code-cleanup.test.ts`
Expected: 1 failure, `th common.saving`.

- [ ] **Step 7: The change file.** Save `<temp>/p2d1-messages.json`:

```json
{
  "delete": [
    "common.saving",
    "checkin.legacyReturnCreating",
    "asset.batchCheckDuplicatesRunning",
    "asset.componentInstalling",
    "asset.componentRemoving",
    "asset.statusCorrectionSubmitting",
    "auth.loggingIn",
    "asset.importing",
    "asset.recordingLabelPrint",
    "asset.latestMaintenance"
  ]
}
```

Run: `node scripts/messages-edit.mjs <temp>/p2d1-messages.json`
Expected: `messages updated: 0 th, 0 en, 10 deleted`. A `No such key` error means a key has a different path. Stop and report; do not edit the JSON by hand.

- [ ] **Step 8: Check.**
  - Run `git diff --numstat messages`. Expected: `0 10` for each of `messages/th.json` and `messages/en.json`. Any other count means the script changed formatting: stop.
  - Run `node <temp>/eol.mjs messages/th.json messages/en.json`. Expected: equal numbers.
  - Run `node scripts/find-unused-messages.mjs | grep -cE` with the pattern of Step 1. Expected: `0`.
  - Run `node --test tests/dead-code-cleanup.test.ts tests/asset-state-review-ui.test.ts tests/legacy-checkin-flow.test.ts tests/login-form-ui.test.ts tests/thai-glossary.test.ts`. Expected: all pass.
  - Run `npm test` (2015 tests, 2014 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 9: Commit.**

```bash
git add messages/th.json messages/en.json tests/dead-code-cleanup.test.ts tests/asset-state-review-ui.test.ts tests/legacy-checkin-flow.test.ts tests/login-form-ui.test.ts
git commit -m "chore(i18n): delete the 10 message keys nobody reads (2D-1 task 5b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Plex Mono loads 400 and 500 only (M11)

Spec M11, R9. Since phase 2B, codes use `tag` (weight 400) and ids use `tag font-medium` (500). No page asks for 600 on purpose; the `font-mono … font-semibold` leftovers are M33's, file by file in 2D-2 to 2D-4.

**Files:**
- Modify: `src/app/layout.tsx`, `tests/visual-foundation-guards.test.ts` (CRLF)

- [ ] **Step 1: The failing pin.** In `tests/visual-foundation-guards.test.ts`:
  - Replace `weight: \["400", "500", "600"\]\[^)\]*preload: false` with `weight: \["400", "500"\]\[^)\]*preload: false`. This edits the regex text of the `IBM_Plex_Mono` line only.
  - The resulting line is `` assert.match(layout, /IBM_Plex_Mono\(\{[^)]*weight: \["400", "500"\][^)]*preload: false[^)]*adjustFontFallback: false/) ``.

Run: `node --test tests/visual-foundation-guards.test.ts`
Expected: 1 failure, the font test (the layout still loads 600).

- [ ] **Step 2: The layout.** In `src/app/layout.tsx`, replace `  weight: ["400", "500", "600"],` with `  weight: ["400", "500"],`. The match is unique: the Thai line ends `"600", "700"],`.

- [ ] **Step 3: Check.**
  - Run `node --test tests/visual-foundation-guards.test.ts`. Expected: all pass.
  - Run `node <temp>/eol.mjs src/app/layout.tsx tests/visual-foundation-guards.test.ts`.
  - Run `npm test` (2015 tests, 2014 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/app/layout.tsx tests/visual-foundation-guards.test.ts
git commit -m "perf(ui): load IBM Plex Mono 400 and 500 only (2D-1 task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Six spinners stop under reduced motion, and five `/api` links are `<a>` (GB2, M31)

Spec §3.1 (third bullet), §1 (`Loader2`: FMG GB2 would fail 6 sites when 2D-5 widens it), M31. Two commits.

#### 7a: `motion-reduce:animate-none` on the six spinners

GB2's rule (FMG `:467-477`): a `<Loader2>` that is not inside a `<Button>` or `<button>` with children needs `motion-reduce:animate-none`. Run over all of `src` at `14e7748`, it fails exactly these six:
- `c/audit/audit-scan-camera.tsx:147`
- `c/audit/audit-scan-lookup-card.tsx:45`
- `c/layout/global-search.tsx:150`, `:183`
- `c/ui/scanner-text-input.tsx:354`, `:409`

The two other spinners of `scanner-text-input` (`:323`, `:397`) sit inside buttons, whose busy state is handled elsewhere. `global-search.tsx` is phase 3 (D2), but adding a class is harmless. The `<Loader2` count does not change, so GB1 does not move.

**Files:** Modify the four files (CRLF) · Create `tests/spinner-motion-ui.test.ts` (LF)

- [ ] **Step 1: The failing test.** Create `tests/spinner-motion-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxElements, findJsxTags } from "./helpers/source-files.ts"

// Plan 2D-1 (spec 2D §3.1, §1): guard GB2 of tests/form-migration-guards.test.ts reads only the 2C files until 2D-5
// widens it to all of src. These four files hold the six spinners it would fail; this test applies GB2's own rule to them.
const FILES = [
  "src/components/audit/audit-scan-camera.tsx",
  "src/components/audit/audit-scan-lookup-card.tsx",
  "src/components/layout/global-search.tsx",
  "src/components/ui/scanner-text-input.tsx",
]

test("a spinner outside a button stops for users who reduce motion, in the files GB2 does not read yet (spec 2D §3.1)", () => {
  const problems: string[] = []
  for (const path of FILES) {
    const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    const buttons = [...findJsxElements(source, "Button"), ...findJsxElements(source, "button")].filter((button) => button.children !== null)
    for (const loader of findJsxTags(source, ["Loader2"])) {
      const inButton = buttons.some((button) => loader.start >= button.end && loader.start < button.closeEnd)
      if (!inButton && !/\bmotion-reduce:animate-none\b/.test(loader.text)) problems.push(`${path}:${loader.line}`)
    }
  }
  assert.deepEqual(problems, [], "add motion-reduce:animate-none")
})
```

Run: `node --test tests/spinner-motion-ui.test.ts`
Expected: 1 failure listing exactly: `audit-scan-camera.tsx:147`, `audit-scan-lookup-card.tsx:45`, `global-search.tsx:150`, `global-search.tsx:183`, `scanner-text-input.tsx:354`, `scanner-text-input.tsx:409` (each with its `src/components/…` path).

- [ ] **Step 2: The classes.** Make exact replacements.
  - `src/components/audit/audit-scan-camera.tsx`: `<Loader2 className="size-6 animate-spin" aria-hidden="true" />` → `<Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />`
  - `src/components/audit/audit-scan-lookup-card.tsx`: `<Loader2 className="size-4 animate-spin" aria-hidden="true" />` → `<Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />`
  - `src/components/layout/global-search.tsx`:
    - `<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />` → `<Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" />`
    - `<Loader2 className="h-4 w-4 animate-spin" />` (unique in this file) → `<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />`
  - `src/components/ui/scanner-text-input.tsx`:
    - `<Loader2 className="h-4 w-4 animate-spin" />` appears 3 times. Anchor on the line before it and replace

      ```tsx
                    <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-background/85 text-sm font-medium text-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
      ```

      with

      ```tsx
                    <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-background/85 text-sm font-medium text-foreground">
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      ```

    - `<Loader2 className="h-3.5 w-3.5 animate-spin" />` (unique) → `<Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />`

- [ ] **Step 3: Check.**
  - Run `node --test tests/spinner-motion-ui.test.ts tests/form-migration-guards.test.ts`. Expected: all pass.
  - Run `node <temp>/eol.mjs` on the four files.
  - Run `npm test` (2016 tests, 2015 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/audit/audit-scan-camera.tsx src/components/audit/audit-scan-lookup-card.tsx src/components/layout/global-search.tsx src/components/ui/scanner-text-input.tsx tests/spinner-motion-ui.test.ts
git commit -m "fix(a11y): six spinners outside buttons stop under reduced motion (2D-1 task 7a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 7b: The `/api` download links (M31)

A download from an API route is a plain `<a href>` with `buttonVariants` (`DESIGN.md` Navigation `:513`). With `next/link`, Next.js may prefetch it and routes the click on the client. Prior art: `D/audit/findings/page.tsx:293`, `D/maintenance/page.tsx:236`, `D/reports/page.tsx:199`. All three files keep `import Link from "next/link"` for their other links.

**Files:** Modify `src/app/[locale]/(dashboard)/admin/roles/page.tsx`, `src/app/[locale]/(dashboard)/master-data/categories/page.tsx`, `src/app/[locale]/(dashboard)/master-data/brands/page.tsx`, `tests/list-pages-ui.test.ts` (all CRLF)

- [ ] **Step 5: The failing tests.** In `tests/list-pages-ui.test.ts`:
  - Replace `` assert.match(source, /<Link href="\/api\/admin\/roles\/export" className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/) `` with `` assert.match(source, /<a href="\/api\/admin\/roles\/export" className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/) ``.
  - Append at the end of the file:

```ts

// Plan 2D-1 (spec 2D M31): a header button that downloads from an API route is a plain <a href> with buttonVariants
// (DESIGN.md Navigation), so Next.js neither prefetches nor client-routes the download.
test("the role, category and brand downloads are plain <a> links to the API (spec 2D M31)", () => {
  for (const path of [`${D}admin/roles/page.tsx`, `${D}master-data/categories/page.tsx`, `${D}master-data/brands/page.tsx`]) {
    assert.doesNotMatch(read(path), /<Link href="\/api\//, path)
  }
  assert.equal(read(`${D}master-data/categories/page.tsx`).match(/<a href="\/api\/categories\/(?:export|import-template)" className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/g)?.length, 2)
  assert.equal(read(`${D}master-data/brands/page.tsx`).match(/<a href="\/api\/brand-models\/(?:export|import-template)" className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/g)?.length, 2)
})
```

Run: `node --test tests/list-pages-ui.test.ts`
Expected: 2 failures, the roles list test (`:585`) and the new test.

- [ ] **Step 6: The links.** Each link is one block, from its `<Link href="/api/…"` line to its own `</Link>`. Replace the whole block, so the closing tag that changes is the right one.
  - `src/app/[locale]/(dashboard)/admin/roles/page.tsx`:
    - Replace

      ```tsx
                  <Link href="/api/admin/roles/export" className={buttonVariants({ variant: "outline", size: "md" })}>
                    <Download aria-hidden="true" />
                    {t("exportAudit")}
                  </Link>
      ```

    - with

      ```tsx
                  <a href="/api/admin/roles/export" className={buttonVariants({ variant: "outline", size: "md" })}>
                    <Download aria-hidden="true" />
                    {t("exportAudit")}
                  </a>
      ```

  - `src/app/[locale]/(dashboard)/master-data/categories/page.tsx`:
    - Replace

      ```tsx
                <Link href="/api/categories/export" className={buttonVariants({ variant: "outline", size: "md" })}>
                  <Download aria-hidden="true" />
                  {t("downloadCategoryExport")}
                </Link>
                <Link href="/api/categories/import-template" className={buttonVariants({ variant: "outline", size: "md" })}>
                  <FileSpreadsheet aria-hidden="true" />
                  {t("downloadCategoryTemplate")}
                </Link>
      ```

    - with

      ```tsx
                <a href="/api/categories/export" className={buttonVariants({ variant: "outline", size: "md" })}>
                  <Download aria-hidden="true" />
                  {t("downloadCategoryExport")}
                </a>
                <a href="/api/categories/import-template" className={buttonVariants({ variant: "outline", size: "md" })}>
                  <FileSpreadsheet aria-hidden="true" />
                  {t("downloadCategoryTemplate")}
                </a>
      ```

  - `src/app/[locale]/(dashboard)/master-data/brands/page.tsx`: the same swap for the `/api/brand-models/export` block (`{t("downloadBrandModelExport")}`) and the `/api/brand-models/import-template` block (`{t("downloadBrandModelTemplate")}`).

- [ ] **Step 7: Check.**
  - Run `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`. Expected: all pass.
  - Run `git grep -n 'Link href="/api/' -- src`. Expected: nothing.
  - Run `npm run lint`. Expected: 0 errors. `@next/next/no-html-link-for-pages` does not apply to `/api` paths, as the three prior-art pages show.
  - Run `npm test` (2017 tests, 2016 pass, 1 skipped) and `npx tsc --noEmit`.

- [ ] **Step 8: Commit.**

```bash
git add "src/app/[locale]/(dashboard)/admin/roles/page.tsx" "src/app/[locale]/(dashboard)/master-data/categories/page.tsx" "src/app/[locale]/(dashboard)/master-data/brands/page.tsx" tests/list-pages-ui.test.ts
git commit -m "fix(ui): API download links are plain anchors on the roles, categories and brands pages (2D-1 task 7b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The search API and the label page data carry a read-only `status.name` (D8, M23 API part)

Spec D8, M23 (API part), §7 ("API (D8): a route test confirms `status.name` and that the old fields do not change"). Plan 2D-3 uses it for `StatusBadge tone={getAssetStateTone(status.name)}` in the scan search and the label tool, because `label` is Thai on Thai pages and cannot pick the tone.

- No query or schema change: both Prisma selects already read `status: { select: { name: true, nameTh: true, colorCode: true } }`.
- `AssetStatus.name` is `String @unique` and `Asset.statusId` is required (`prisma/schema.prisma:215-229`, `:279-280`).

One commit.

**Files:**
- Modify: `src/app/api/search/route.ts` (CRLF), `src/app/[locale]/(dashboard)/asset-management/labels/page.tsx` (**LF**), `src/components/assets/asset-label-batch-tool.tsx` (CRLF, type line only)
- Create: `tests/status-name-api.test.ts` (LF)

**Interfaces:**
- Produces: `/api/search` asset results `status: { name: string; label: string; colorCode: string | null }`. `badge`, `meta` and every other field are unchanged, and the global search reads only `badge`.
- Produces: the label tool's row type `status: { name?: string | null; label: string; colorCode: string | null }`. `name` is optional because the queue mapper `toSearchResult` (`:553-567`) does not set it until 2D-3.

- [ ] **Step 1: The failing test.** Create `tests/status-name-api.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-1 (spec 2D D8, M23): the asset search results and the label page data carry the read-only English status name,
// so plan 2D-3 can pick the StatusBadge tone with getAssetStateTone. The query, the select and every old field stay.
test("search API adds the read-only status name to asset results and keeps the old fields (D8)", () => {
  const source = readFileSync("src/app/api/search/route.ts", "utf8")
  assert.match(source, /status\?: \{\s*name: string\s*label: string\s*colorCode: string \| null\s*\}/)
  assert.match(source, /status: \{ select: \{ name: true, nameTh: true, colorCode: true \} \}/)
  assert.match(source, /status: \{\s*name: asset\.status\.name,\s*label: statusLabel,\s*colorCode: asset\.status\.colorCode,\s*\}/)
  assert.match(source, /badge: \{ label: statusLabel, colorCode: asset\.status\.colorCode \}/)
})

test("label page data carries the read-only status name (D8)", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/asset-management/labels/page.tsx", "utf8")
  const tool = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8")
  assert.match(page, /status: \{\s*name: asset\.status\?\.name \?\? null,\s*label: locale === "th"/)
  assert.match(tool, /status: \{ name\?: string \| null; label: string; colorCode: string \| null \}/)
})
```

Run: `node --test tests/status-name-api.test.ts`
Expected: 2 failures (no `name` yet).

- [ ] **Step 2: The route.** In `src/app/api/search/route.ts`:
  - The type: replace

    ```ts
      status?: {
        label: string
        colorCode: string | null
      }
    ```

  - with

    ```ts
      status?: {
        name: string
        label: string
        colorCode: string | null
      }
    ```

  - The asset mapping in `searchAssets`: replace

    ```ts
          status: {
            label: statusLabel,
            colorCode: asset.status.colorCode,
          },
    ```

  - with

    ```ts
          status: {
            name: asset.status.name,
            label: statusLabel,
            colorCode: asset.status.colorCode,
          },
    ```

  - The select and `badge` stay as they are.

- [ ] **Step 3: The label page (LF).** In `src/app/[locale]/(dashboard)/asset-management/labels/page.tsx`, replace

```ts
          status: {
            label: locale === "th" ? asset.status?.nameTh ?? asset.status?.name ?? "-" : asset.status?.name ?? asset.status?.nameTh ?? "-",
```

with

```ts
          status: {
            name: asset.status?.name ?? null,
            label: locale === "th" ? asset.status?.nameTh ?? asset.status?.name ?? "-" : asset.status?.name ?? asset.status?.nameTh ?? "-",
```

The new line has no `"-"`, so LFG LV2 (`labels/page.tsx` 4) does not move.

- [ ] **Step 4: The tool's row type.** In `src/components/assets/asset-label-batch-tool.tsx`, replace

```ts
  status: { label: string; colorCode: string | null }
  meta: {
```

with

```ts
  status: { name?: string | null; label: string; colorCode: string | null }
  meta: {
```

The `meta: {` line makes the match unique; the `AssetApiRow` line `:549` differs.

- [ ] **Step 5: Check.**
  - Run `node --test tests/status-name-api.test.ts tests/open-repair-filter.test.ts tests/asset-label-print-ui.test.ts tests/list-frame-guards.test.ts tests/asset-scan-search-tool.test.ts`. Expected: all pass.
  - Run `node <temp>/eol.mjs src/app/api/search/route.ts "src/app/[locale]/(dashboard)/asset-management/labels/page.tsx" src/components/assets/asset-label-batch-tool.tsx`. Expected: the route and the tool print equal numbers; the labels page prints `0 <n>`.
  - Run `npx tsc --noEmit` (clean), `npm test` (2019 tests, 2018 pass, 1 skipped) and `npm run lint`.

- [ ] **Step 6: Commit.**

```bash
git add src/app/api/search/route.ts "src/app/[locale]/(dashboard)/asset-management/labels/page.tsx" src/components/assets/asset-label-batch-tool.tsx tests/status-name-api.test.ts
git commit -m "feat(api): read-only status.name on asset search results and the label page data (2D-1 task 8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: `StatStrip` shows `Nil` for an empty value, and the reports skeleton is one column below 640px (M32 d, e)

Spec M32, R5. Both are server-safe `c/ui/` foundation files. Two commits.

#### 9a: `StatStrip` (M32 d)

`orNil` (`c/ui/nil.tsx`) shows a dash that screen readers skip, plus the words "ไม่มีข้อมูล" (`common.noValue`) for them. It is server-safe, and `KeyValueList` already uses it.

The one caller that types a dash today, `c/reports/reports-accounting-view.tsx:74` (`formatPercent(…) ?? "—"`), moves in 2D-2. Its value stays a string until then.

**Files:** Modify `src/components/ui/stat-strip.tsx`, `tests/list-primitives-ui.test.ts` (CRLF)

- [ ] **Step 1: The failing pins.** In `tests/list-primitives-ui.test.ts`, replace

```ts
  assert.match(source, /<span className="text-metric num text-foreground">\{item\.value\}<\/span>/)
```

with

```ts
  assert.match(source, /<span className="text-metric num text-foreground">\{orNil\(item\.value\)\}<\/span>/, "an empty value shows Nil (spec 2D M32)")
  assert.match(source, /import \{ orNil \} from "@\/components\/ui\/nil"/)
  assert.match(source, /\n  value: string \| null\n/)
```

Run: `node --test tests/list-primitives-ui.test.ts`
Expected: 1 failure, the `StatStrip` test.

- [ ] **Step 2: The component.** In `src/components/ui/stat-strip.tsx`:
  - Replace `import { toneIcons } from "@/components/ui/tone-icons"` with the two lines `import { orNil } from "@/components/ui/nil"` and `import { toneIcons } from "@/components/ui/tone-icons"`.
  - Replace

    ```ts
      // Already formatted (formatCount, formatMoney). Never a raw number.
      value: string
    ```

  - with

    ```ts
      // Already formatted (formatCount, formatMoney). Never a raw number. null shows Nil.
      value: string | null
    ```

  - Replace `            <span className="text-metric num text-foreground">{item.value}</span>` with `            <span className="text-metric num text-foreground">{orNil(item.value)}</span>`.

- [ ] **Step 3: Check.**
  - Run `node --test tests/list-primitives-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts`. Expected: all pass. VFG `:64` still finds `"text-metric num text-foreground"`.
  - Run `npx tsc --noEmit`. Expected: clean; every caller passes a string, which is a valid `string | null`.
  - Run `npm test` (2019 tests, 2018 pass, 1 skipped) and `npm run lint`.

- [ ] **Step 4: Commit.**

```bash
git add src/components/ui/stat-strip.tsx tests/list-primitives-ui.test.ts
git commit -m "fix(ui): StatStrip shows Nil for an empty value (2D-1 task 9a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 9b: `ReportsPageSkeleton` below 640px (M32 e)

The reports page shows its two numbers in `<StatStrip className="max-sm:grid-cols-1"` (`D/reports/page.tsx:775`). Its skeleton should show the same single column below 640px.

**Files:** Modify `src/components/ui/page-skeleton.tsx` (CRLF), `tests/page-loading-skeleton.test.ts` (**LF**)

- [ ] **Step 5: The failing pins.** In `tests/page-loading-skeleton.test.ts`, replace

```ts
  assert.match(source, /className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:\[&>:last-child:nth-child\(odd\)\]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none"/, "MetricGridSkeleton is one StatStrip frame (I28)")
```

with

```ts
  assert.match(source, /className=\{cn\("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:\[&>:last-child:nth-child\(odd\)\]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none", className\)\}/, "MetricGridSkeleton is one StatStrip frame (I28)")
  assert.match(source, /<MetricGridSkeleton count=\{2\} className="max-sm:grid-cols-1" \/>/, "the reports numbers are one column below 640px, as on the page (spec 2D M32)")
```

Run: `node --test tests/page-loading-skeleton.test.ts`
Expected: 1 failure (the frame still has a literal `className`).

- [ ] **Step 6: The skeleton.** In `src/components/ui/page-skeleton.tsx` (`cn` is already imported):
  - Replace `function MetricGridSkeleton({ count = 4 }: { count?: number }) {` with `function MetricGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {`.
  - Replace `    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:[&>:last-child:nth-child(odd)]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">` with `    <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:[&>:last-child:nth-child(odd)]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none", className)}>`.
  - Replace `      <MetricGridSkeleton count={2} />` with `      <MetricGridSkeleton count={2} className="max-sm:grid-cols-1" />`.

- [ ] **Step 7: Check.**
  - Run `node --test tests/page-loading-skeleton.test.ts tests/loading-boundaries.test.ts`. Expected: all pass. `loading-boundaries:25` uses the substring `MetricGridSkeleton count={2}`.
  - Run `node <temp>/eol.mjs src/components/ui/page-skeleton.tsx tests/page-loading-skeleton.test.ts`. Expected: equal numbers, then `0 <n>`.
  - Run `npm test` (2019 tests, 2018 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 8: Commit.**

```bash
git add src/components/ui/page-skeleton.tsx tests/page-loading-skeleton.test.ts
git commit -m "fix(ui): the reports skeleton shows its numbers in one column below 640px (2D-1 task 9b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The LFG rows that count 0, and the guard comments with stale lines (M16, M34)

Spec M16, M34, R8. This task runs last among the code tasks, because Tasks 1–9 moved lines that the comments name:
- Task 5a deleted `D/assets/[id]/page.tsx:1063` (−1 from there on).
- It also deleted `c/assets/asset-component-manager.tsx:92`, `:100` (−2 after `:100`), `c/assets/asset-import-preview-panel.tsx:54` (−1) and `c/assets/asset-label-print.tsx:48` (−1).

Two commits:
- 10a: `tests/list-frame-guards.test.ts`
- 10b: `tests/form-migration-guards.test.ts` and `tests/asset-detail-ux.test.ts`

All three files are CRLF.

- [ ] **Step 1: Print the live lines.** Save this as `<temp>/p2d1-anchors.mjs` and run it from the repo root with `node <temp>/p2d1-anchors.mjs`. It only reads.

```js
// p2d1-anchors.mjs: prints the live line of every site the LFG/FMG comments of Task 10 name. Reads only.
import { readFileSync } from "node:fs"
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const lines = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n").split("\n")
const find = (path, test) => lines(path).flatMap((text, index) => (test(text) ? [index + 1] : []))
const show = (label, path, test) => console.log(`${label}: ${find(path, test).join(", ") || "none"}`)
show("LB1 system-settings move-out ArrowLeft", `${C}admin/system-settings-form.tsx`, (t) => t.includes("<ArrowLeft"))
show("LB1 audit round ActionBar back item", `${D}audit/rounds/[id]/page.tsx`, (t) => t.includes("<ArrowLeft"))
show("LV2 asset detail", `${D}assets/[id]/page.tsx`, (t) => /(?:\|\||\?\?|:)\s*"-"/.test(t))
show("LS1 system-settings Metric", `${C}admin/system-settings-form.tsx`, (t) => /\bfunction Metric\b/.test(t))
show("LS1 bulk approval Metric", `${C}disposal/disposal-bulk-approval.tsx`, (t) => /\bfunction Metric\b/.test(t))
show("LS1 integration OperationMetric / SummaryCard", `${C}admin/IntegrationClientManager.tsx`, (t) => /\bfunction (?:OperationMetric|SummaryCard)\b/.test(t))
show("LS1 import panel SummaryPill", `${C}assets/asset-import-preview-panel.tsx`, (t) => /\bfunction SummaryPill\b/.test(t))
show("LN2 integration StatusBadge", `${C}admin/IntegrationClientManager.tsx`, (t) => /\bfunction StatusBadge\b/.test(t))
show("LK1 timeline Info", `${C}assets/asset-movement-timeline.tsx`, (t) => /\bfunction Info\b/.test(t))
show("RAW_FIELDS room search", `${C}audit/audit-scan-room-picker.tsx`, (t) => /^\s*<input\b/.test(t))
show("RAW_FIELDS label print controls", `${C}assets/asset-label-print.tsx`, (t) => /^\s*<(?:input|select)\b/.test(t))
for (const [label, path] of [
  ["LOADER2 maintenance attachments", `${C}maintenance/maintenance-attachments.tsx`],
  ["LOADER2 disposal asset picker", `${C}disposal/disposal-asset-picker.tsx`],
  ["LOADER2 audit scan check form", `${C}audit/audit-scan-check-form.tsx`],
  ["LOADER2 component manager", `${C}assets/asset-component-manager.tsx`],
  ["LOADER2 bulk approval", `${C}disposal/disposal-bulk-approval.tsx`],
  ["LOADER2 bulk execution", `${C}disposal/disposal-bulk-execution.tsx`],
  ["LOADER2 integration manager", `${C}admin/IntegrationClientManager.tsx`],
  ["LOADER2 label batch tool", `${C}assets/asset-label-batch-tool.tsx`],
  ["LOADER2 scan search tool", `${C}assets/asset-scan-search-tool.tsx`],
  ["LOADER2 transaction cancel dialog", `${C}asset-operations/transaction-cancel-dialog.tsx`],
]) show(label, path, (t) => t.includes("<Loader2"))
show("bulk execution BusyLabel", `${C}disposal/disposal-bulk-execution.tsx`, (t) => /\bfunction BusyLabel\b/.test(t))
show("register phone bulk bar", `${C}assets/asset-register-table.tsx`, (t) => /\bfixed\b.*\bbottom-/.test(t))
```

Expected (the lines after Tasks 1–9):

```
LB1 system-settings move-out ArrowLeft: 1407
LB1 audit round ActionBar back item: 496
LV2 asset detail: 1204, 1206, 2454
LS1 system-settings Metric: 2408
LS1 bulk approval Metric: 598
LS1 integration OperationMetric / SummaryCard: 759, 778
LS1 import panel SummaryPill: 407
LN2 integration StatusBadge: 793
LK1 timeline Info: 133
RAW_FIELDS room search: 76
RAW_FIELDS label print controls: 225, 236
LOADER2 maintenance attachments: 210
LOADER2 disposal asset picker: 64
LOADER2 audit scan check form: 247
LOADER2 component manager: 449
LOADER2 bulk approval: 560, 561
LOADER2 bulk execution: 970
LOADER2 integration manager: 524, 854
LOADER2 label batch tool: 311, 446
LOADER2 scan search tool: 141
LOADER2 transaction cancel dialog: 134
bulk execution BusyLabel: 967
register phone bulk bar: 473
```

If a line differs, an earlier task changed more than it should have. Stop and report before you edit anything.

#### 10a: LFG

- [ ] **Step 2: The failing test.** In `tests/list-frame-guards.test.ts`, append after the L9 test (the end of the file):

```ts

// Plan 2D-1 (spec 2D D13, M16, R8): a KEEP row is the number of sites that stay, so it equals the live count. The commit
// that moves a site lowers its row, or deletes it at 0, in BUDGETS and KEEP together (spec 2D §3, §5.6).
test("L10 every KEEP row equals its live count", () => {
  const problems: string[] = []
  for (const [id, rows] of Object.entries(KEEP)) {
    const counts = COUNTERS[id]()
    for (const [path, keep] of Object.entries(rows)) {
      if ((counts[path] ?? 0) !== keep) problems.push(`${id} ${path}: KEEP ${keep}, live ${counts[path] ?? 0}`)
    }
  }
  assert.deepEqual(problems, [])
})
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: 1 failure, L10, with exactly five problems:
  - `LB1 src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx: KEEP 1, live 0`
  - `LP1 …/assets/[id]/page.tsx`, `LP1 …/audit/rounds/[id]/page.tsx`, `LP1 …/maintenance/[id]/page.tsx`, `LP1 …/disposal/[id]/page.tsx`, each `KEEP 1, live 0`

2C batch 5 (`b5405f7`) brought them to 0.

- [ ] **Step 3: The rows.** Exact replacements in `tests/list-frame-guards.test.ts`.

(1) The BUDGETS comment: replace

```ts
// what stays after 2B, and why. The LB1 rows marked 0 → 1 were the only two rows above the d38a0ee count.
```

with

```ts
// what stays after 2B, and why. The LB1 row marked 0 → 1 was one of the only two rows above the d38a0ee count (the
// repair page's reached 0 in 2C batch 5 and plan 2D-1 deleted it).
```

(2) BUDGETS LB1: replace

```ts
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :479 for ArrowLeft
    // 2B-4
    [`${D}maintenance/[id]/page.tsx`]: 1, // 0 → 1: 2B-4 swaps the Wrench icon of the bar's back item :147 for ArrowLeft
```

with

```ts
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :496 for ArrowLeft
```

(3) BUDGETS LP1: replace

```ts
  LP1: {
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}disposal/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}maintenance/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
  },
```

with

```ts
  LP1: {
  },
```

(4) The KEEP header: replace

```ts
// LT1 of the role permission form, LV1 of the integration manager) and plan 2B-5 deleted them; phase 2D empties the
```

with

```ts
// LT1 of the role permission form, LV1 of the integration manager) and plan 2B-5 deleted them; plan 2D-1 deleted the
// five rows 2C batch 5 had brought to 0 (LP1 of the four detail pages, LB1 of the repair page); phase 2D empties the
```

(5) KEEP LB1 and LP1: replace

```ts
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the mobile action bar (O11 owns the bar)
    [`${D}maintenance/[id]/page.tsx`]: 1, // back item of the mobile action bar (O11 owns the bar)
  },
  LP1: {
    [`${D}assets/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}maintenance/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}disposal/[id]/page.tsx`]: 1, // O11, 2C plan 5
  },
```

with

```ts
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)
  },
```

- [ ] **Step 4: The stale line numbers (M34).** Exact replacements in the same file. Each old text occurs twice, once in BUDGETS and once in KEEP; replace both.

| Old text | New text |
|---|---|
| `the move-out button :1412, not a page back` | `the move-out button :1407, not a page back` |
| `translated-sentence arguments :1198, :1200 and the history sentence :2462 (R-n)` | `translated-sentence arguments :1204, :1206 and the history sentence :2454 (R-n)` |
| `Metric :2413 (2D)` | `Metric :2408 (2D)` |
| `Metric :572 in the dialog (2C plan 3)` | `Metric :598 in the dialog (2C plan 3)` |
| `OperationMetric :763, SummaryCard :782 (2C plan 4)` | `OperationMetric :759, SummaryCard :778 (2C plan 4)` |
| `SummaryPill :461 (2C plan 4)` | `SummaryPill :407 (2C plan 4)` |
| `local StatusBadge :797 (2C plan 4)` | `local StatusBadge :793 (2C plan 4)` |

`Info :133` and `disposal-batch-form` `:93` are still right.

- [ ] **Step 5: Check.**
  - Run `node --test tests/list-frame-guards.test.ts`. Expected: 23 tests pass (L9 ignores the empty `LP1: {}` of BUDGETS).
  - Run `git grep -n ":1412\|:1198\|:2462\|:2413\|:572 \|:763\|:782\|:461\|:797\|:479\|:147 " -- tests/list-frame-guards.test.ts`. Expected: nothing.
  - Run `git diff --stat -- tests/list-frame-guards.test.ts`, then `node <temp>/eol.mjs tests/list-frame-guards.test.ts`. Expected: equal numbers.
  - Run `npm test` (2020 tests, 2019 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 6: Commit.**

```bash
git add tests/list-frame-guards.test.ts
git commit -m "test(ui): delete the five LFG rows that count 0 and hold KEEP to the live counts (2D-1 task 10a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 10b: FMG and the asset detail test comments

- [ ] **Step 7: The comments.** These are comment-only exact replacements; no test counts change, so none fails first. The check is Step 8's grep.
  - In `tests/form-migration-guards.test.ts`:

| Old text | New text |
|---|---|
| `the room search :75 stays (O20)` | `the room search :76 stays (O20)` |
| `the print toolbar's boxed fields :226, :237 (K21)` | `the print toolbar's boxed fields :225, :236 (K21)` |
| `the spinner in the search field :58` | `the spinner in the search field :64` |
| `components header toggle :242 (§6.14)` | `components header toggle :247 (§6.14)` |
| `the status line :474` | `the status line :449` |
| `the status lines :559, :560 in the dialog body (I27)` | `the status lines :560, :561 in the dialog body (I27)` |
| `BusyLabel :969, the status line in the dialog body (I27)` | `BusyLabel :967 (its spinner :970), the status line in the dialog body (I27)` |
| `the status line :523 and the rotate button of the row :853 (2D, I27)` | `the status line :524 and the rotate button of the row :854 (2D, I27)` |

  - In `tests/asset-detail-ux.test.ts`, replace `// bottom padding and the mobile action bar stay for 2C plan 5. This file reads the page raw (CRLF): no line breaks here.` with `// bottom padding is actionBarPagePadding and the phone bar is the shared ActionBar (2C batch 5, K23). This file reads the page raw (CRLF): no line breaks here.`

- [ ] **Step 8: Check.**
  - Run `git grep -n "room search :75\|:226, :237\|search field :58\|toggle :242\|status line :474\|:559, :560\|BusyLabel :969\|:523 and\|stay for 2C plan 5" -- tests`. Expected: nothing.
  - Run `node --no-warnings <temp>/p2d1-anchors.mjs` again. Expected: the same output as Step 1.
  - Run `node <temp>/eol.mjs tests/form-migration-guards.test.ts tests/asset-detail-ux.test.ts`. Expected: equal numbers.
  - Run `npm test` (2020 tests, 2019 pass, 1 skipped), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 9: Commit.**

```bash
git add tests/form-migration-guards.test.ts tests/asset-detail-ux.test.ts
git commit -m "test(ui): guard and test comments name today's lines (2D-1 task 10b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan1/after/` and `button-heights-after.json`
- Modify: only files needed to fix problems found here. Each fix gets its own small commit with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–10 committed; the Task 0 ids, before images and `button-heights-before.json`.
- Produces: `.superpowers/sdd/ui-phase2d-plan1/task-11-findings.md`, which Task 12 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count (expected 2020, 2019 pass, 1 skipped) and the build page count (60/60 at `71597e5`).

- [ ] **Step 2: Production server.**
  - Create `.claude/launch.json` with `name: "asset-2d1-start-3101"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3101"]`, `port: 3101`, `autoPort: false`.
  - Start it with `preview_start` and log in with the seed admin; do not echo the password.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`.
  - Playwright code runs inline (`browser_run_code_unsafe`). A file you must create goes under `.playwright-mcp/` and is deleted right after the run.

- [ ] **Step 3: Write nothing.**
  - Open every dialog to its first screen and close it with ยกเลิก, the X or Esc.
  - Never press save, print, import, complete, cancel-ticket, export or a confirm.
  - Count POST, PUT, PATCH and DELETE requests while you work. Expected: 0. List by path any read-only lookup a page already sends (the search API is GET).

- [ ] **Step 4: Screens and heights.**
  - Take every Task 0 view again under the same name in `after/`. Compare height, wrapping, truncation and lost color or shape.
  - Run the Task 0 Step 7 code on each view at 1440 and save `button-heights-after.json`. Expected:
    - `default:36` and `icon:36` everywhere `default:40` and `icon:40` were;
    - `icon-lg:40` on the category edit form (4 per photo item row), the asset model form (one per spec row), the single asset form (custom-field rows) and the batch form's desktop table rows;
    - `lg:40` for the label print button;
    - `md:36` for the three repair header buttons;
    - every other size unchanged.
  - At 375 every Button is still 44px or more.
  - Check, in Thai at 1440, 768 and 375, plus one English pass at 1440:
    - **The 40px rows:** the icon buttons and the print button are the same height as the field beside them, and nothing wraps differently.
    - **Headers:** every `PageHeader` button is 36px from `md`, the repair record's three included.
    - **Dialog footers:** 36px from `md`, 44px below. Open and cancel the repair "แก้ไข" dialog.
    - **`/th/admin/readiness`:** each check's link is an outline 36px button, full width below 640px, with its arrow.
    - **`/th/asset-management/import-export`:** the back link is an outline 36px button.
    - **The error page:** it cannot be triggered without breaking a page. Read `D/error.tsx` and note the gap.
    - **Fonts (R9):** the eight `font-mono … font-semibold` places, among them `/th/assets/<id>` (`:2116`) and `/th/assets/<id>/components`. Record whether the synthesized bold reads acceptably; it is an accepted mix until M33.
    - **Downloads:** on `/th/admin/roles`, `/th/master-data/categories` and `/th/master-data/brands`, the export and template buttons are `<a href="/api/…">`. Check the DOM only and do not click them.
    - **`/th/reports` while loading** (throttle the network): the numbers skeleton is one column at 375.
    - **Search:** type 3+ characters into the topbar search, into `/th/asset-management/scan` and into the label tool's search. Results show as before. Read one `/api/search` response in the network panel: asset results have `status.name`, `status.label`, `status.colorCode` and the old `badge`.

- [ ] **Step 5: Keyboard.** Tab order and focus rings on the four field-row forms and the repair header are unchanged. Dialog focus starts where it did before (D18 is not in this plan).

- [ ] **Step 6: axe.**
  - Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })`.
  - Run `axe.run(document.querySelector("main"), { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive", "target-size"] })` on the category edit form, `/th/maintenance/<id>`, `/th/admin/readiness` and `/th/asset-management/import-export` at 1440 and 375.
  - Expected: 0 violations.

- [ ] **Step 7: Forced colors, reduced motion and zoom.**
  - Use Playwright `emulateMedia`. Forced colors: button borders and focus rings stay visible. Reduced motion: the camera, scan lookup, global search and scanner spinners do not spin.
  - At 200% zoom (a 720×450 viewport) on the category edit form and the repair record: nothing is clipped.

- [ ] **Step 8: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done:
  - the readiness links read "<action>: <check title>"
  - the empty `StatStrip` value reads "ไม่มีข้อมูล" (only reachable with data that has no ratio)
  - on a real iPhone and iPad, the 44px phone targets are unchanged

  Add them to the open manual checks.

- [ ] **Step 9: Findings report.** Write `.superpowers/sdd/ui-phase2d-plan1/task-11-findings.md` with these parts:
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, at which widths, with results.
  - **Button heights:** one line per changed size, before → after, from the two JSON files.
  - **Found but not caused by plan 2D-1.**
  - **Accepted mixes:** R3, R9, and any new ones.
  - **Still needs a person:** the Step 8 list.

- [ ] **Step 10: Clean up.** Stop the server, delete `.claude/launch.json` and every helper you put under the repo. `git status --short` shows only the untracked folders of the Global Constraints.

---

### Task 12: Repo documentation for plan 2D-1 (repo docs only; the controller adds the verify numbers and the wiki in Task 13)

Spec §6 ("every plan: DH section, changelog, wiki") and §3.1. What 2D-1 changes in the canonical docs:
- the button sizes (`default` 36, `icon` 36, new `icon-lg` 40, header `md`);
- the legacy `ActionButton` / safe-link paragraph, which is gone;
- Plex Mono weights.

`.impeccable/design.json` waits for 2D-5 (R10). `docs/11_FEATURE_LIST.md` does not change: no feature changes what it does.

All four files are CRLF. Edit with exact-string replacement, keep the endings, and never run a formatter.

**Files:**
- Modify `DESIGN.md` (9 replacements):
  - the YAML `button-primary`, `button-secondary` and `button-danger` blocks
  - §3 Typography `:275` and `:301`
  - §5 Buttons, the sizes table `:351-356`
  - **Legacy** `:374`
  - **Hand-written buttons** `:375`
- Modify `docs/14_UI_UX_DESIGN_SYSTEM.md` (1 replacement): the button row `:57`
- Modify `DEVELOPER_HANDOFF.md` (1 replacement): a new section before `## Open Go-Live Decisions`
- Modify `docs/99_CHANGELOG.md` (1 or 2 replacements): the entry on top
- Not changed: `.impeccable/design.json`, `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`, `src/`, `tests/`, `messages/`

**Interfaces:**
- Consumes: Tasks 1–11 committed; `task-11-findings.md`.
- Produces:
  - the section `## UI Round 4 Phase 2D Plan 1 Foundation and Dead-Code Cleanup (<today>)` with a `- Dev-app check (Task 11):` bullet;
  - the changelog entry `### รากฐานและลบโค้ดตาย (UI รอบ 4 เฟส 2D plan 1)` with a `- **ตรวจบนแอป (Task 11):**` bullet.

  Task 13 adds the verify bullet directly above each.

- [ ] **Step 1: Check the base.**
  - Run `git diff --quiet 14e7748 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md && echo DOCS-UNCHANGED`. Expected: `DOCS-UNCHANGED`.
  - Run `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`. Expected: `i/lf w/crlf` for all four.
  - Read `task-11-findings.md`.

- [ ] **Step 2: `DESIGN.md` YAML (3 replacements).** In each of the blocks `button-primary:`, `button-secondary:` and `button-danger:`, replace the two lines

```yaml
    padding: "0 16px"
    height: "40px"
```

with

```yaml
    padding: "0 14px"
    height: "36px"
```

The three pairs are the only `padding: "0 16px"` lines in the file (`grep -c` prints 3). Replace all three, and leave `input` (`0 12px`, `40px`) alone.

- [ ] **Step 3: `DESIGN.md` typography (2 replacements).**
  - `:275`: replace `Plex Mono loads 400-600, is not preloaded` with `Plex Mono loads 400 and 500 only (plan 2D-1 dropped 600), is not preloaded`.
  - `:301`: replace `Never bold (Plex Mono loads 400, 500 and 600 only, no 700;` with `Never bold (Plex Mono loads 400 and 500 only; a leftover \`font-mono font-semibold\` gets a synthesized bold until 2D moves it to \`tag\`;`.

- [ ] **Step 4: `DESIGN.md` buttons (3 replacements).**

(1) The sizes table: replace

```
| `md` | 36px | 14px | `text-sm` |
| `lg` | 40px | 16px | `text-sm`; buttons in a row of 40px fields |
| `default` | 40px, the same as `lg`, until phase 2D makes it 36px | 16px | `text-sm` |
| `icon-sm` | 32 × 32px | — | — |
| `icon` | 40 × 40px until phase 2D makes it 36 × 36px | — | — |
```

with

```
| `md` | 36px | 14px | `text-sm`; every `PageHeader` button |
| `lg` | 40px | 16px | `text-sm`; only a text button in the same row as a 40px field (the label print toolbar) |
| `default` | 36px, the same as `md` (since plan 2D-1) | 14px | `text-sm`; dialog footers follow it |
| `icon-sm` | 32 × 32px | — | — |
| `icon` | 36 × 36px (since plan 2D-1) | — | — |
| `icon-lg` | 40 × 40px | — | only an icon button in the same row as a 40px field (the remove, move and copy buttons of the repeating field rows); a cva size, not a token (spec 2D D5) |
```

Also replace `8px (\`rounded-md\`) for \`md\`, \`lg\`, \`default\` and \`icon\`, the same as fields` with `8px (\`rounded-md\`) for \`md\`, \`lg\`, \`default\`, \`icon\` and \`icon-lg\`, the same as fields`. This counts as part of (1) and is in the **Shape** bullet above the table.

(2) **Legacy** (`:374`): replace the whole line that starts `- **Legacy:** \`ActionButton\` and \`getActionButtonClasses\` are deprecated;` with

```
- **Legacy:** none left. Plan 2D-1 moved the retry button of `src/app/[locale]/(dashboard)/error.tsx` to `Button` and deleted `ActionButton`, `getActionButtonClasses`, `getSafeActionLinkClasses` and `getResponsiveActionRowClasses` (the readiness and import-export links are `buttonVariants({ variant: "outline", size: "md" })`), together with the other helpers of `src/lib/design-system.ts` that had no caller. `getTouchIconButtonClasses` was removed earlier: use `Button size="icon"`.
```

(3) **Hand-written buttons** (`:375`): replace `Pick the size from today's desktop height: \`h-8\` → \`sm\`, \`h-9\` → \`md\`, \`h-10\` beside 40px fields → \`lg\`, any other \`h-10\` → no size (\`default\`). A button that is 44px tall on desktop (\`min-h-11\` only, dialog footers included) also takes no size: it becomes 40px now and 36px after 2D (phase 2C ruling K7).` with `Pick the size from today's desktop height: \`h-8\` → \`sm\`, \`h-9\` or any \`h-10\` that is not beside a 40px field → no size (\`default\`, 36px since plan 2D-1), \`h-10\` beside 40px fields → \`lg\` (or \`icon-lg\` for an icon button). A button that is 44px tall on desktop (\`min-h-11\` only, dialog footers included) also takes no size and is 36px (phase 2C ruling K7, spec 2D D3).`

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (1 replacement).** In the row that starts `| A button, or a link that looks like one |`, replace `the label stays the same while busy; the primary action comes last |` with `the label stays the same while busy; the primary action comes last; no size is 36px from \`md\`, \`md\` in a \`PageHeader\`, \`lg\` / \`icon-lg\` (40px) only beside a 40px field |`.

- [ ] **Step 6: `DEVELOPER_HANDOFF.md` (1 replacement).** Replace the line `## Open Go-Live Decisions` (the only one) with the block below, which ends with that same line.
  - Replace `<today>` with today's date.
  - Write the two `<from task-11-findings.md>` markers from the findings: what was checked and where, the button heights before → after, fixes or "none", accepted mixes, issues not caused by this plan, and what still needs a person.
  - When "Still open" has more than two items, write nested bullets as the 2C plan 5 section does.

```
## UI Round 4 Phase 2D Plan 1 Foundation and Dead-Code Cleanup (<today>)

- Branch `feat/ui-phase2d` in the main checkout (from `master` `71597e5`: phase 1, 2A, 2B plans 1–5 and 2C plans 1–5 merged, not deployed). Spec `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` §3.1 · plan `docs/superpowers/plans/2026-10-15-ui-phase2d-plan1.md` · canonical values in `DESIGN.md`. The first of five 2D plans, one at a time (D15).
- No new workflow, page, schema, RBAC, migration, dependency or token. One API change the user approved (D8): `/api/search` asset results carry the read-only `status.name`. Validation is unchanged.
- **Buttons (M1, M2, D3–D6):** `default` is `md` (36px from `md`, 14px side padding) and `icon` is 36 × 36px; below `md` every size is still 44px. New cva size `icon-lg` (40 × 40px, `rounded-md`), not a token. The seven icon buttons that share a row with a 40px field are `icon-lg`: the remove button of the batch form's desktop rows `c/assets/asset-batch-form.tsx`, the custom-field remove `c/assets/asset-form.tsx`, the spec remove `c/master-data/asset-model-form.tsx` and the move up, move down, copy and remove buttons of the photo items `c/master-data/category-form.tsx`. The print button of the label toolbar `c/assets/asset-label-print.tsx` is `lg` beside its two boxed 40px fields (2C missed it in §6.2.3). The three header buttons of `c/maintenance/repair-record-actions.tsx` are `md`, like every other `PageHeader` button. Dialog footers take no size (FMG GD3) and are 36px.
- **Dead code deleted (spec §4.1, D12):** `c/ui/action-button.tsx` (the retry button of `D/error.tsx` is `Button`); in `src/lib/design-system.ts` `uiTones`, `uiButtonVariants`, `uiButtonSizes`, `normalizeUiTone`, `getMetricCardToneClasses`, `getTableShellClasses`, `getResponsiveTableScrollClasses`, `getEmptyStateClasses`, `getMobileSafeBottomPaddingClasses`, `getActionButtonClasses`, `getSafeActionLinkClasses` and `getResponsiveActionRowClasses` (`UiTone` is a plain union; the readiness check links and the import-export back link moved to `buttonVariants({ variant: "outline", size: "md" })` first, R1); `c/master-data/master-data-delete-button.tsx` and `c/master-data/asset-delete-button.tsx`; `c/ui/badge.tsx` and `badgeVariants` (R7); `getHealthPanelClass` and `getSummaryToneClass` of `src/lib/asset-detail-format.ts`; `size="compact"` of `AssetStateHelpPopover`; the 10 busy label props and pass lines of 2C §6.5.2 (#8 `labels.chooseFile` is still read). `formatCurrency` waits for 2D-4 (D10).
- **Messages:** deleted `common.saving`, `checkin.legacyReturnCreating`, `asset.batchCheckDuplicatesRunning`, `asset.componentInstalling`, `asset.componentRemoving`, `asset.statusCorrectionSubmitting`, `auth.loggingIn`, `asset.importing`, `asset.recordingLabelPrint` and `asset.latestMaintenance`, through `scripts/messages-edit.mjs`; none added. `dataQualityPage.assetStateReviews.scanning` is passed but never read and stays (open issue for the user).
- **Small fixes:** Plex Mono loads 400 and 500 (M11); six spinners outside buttons stop under reduced motion (`c/audit/audit-scan-camera.tsx`, `c/audit/audit-scan-lookup-card.tsx`, `c/layout/global-search.tsx` ×2, `c/ui/scanner-text-input.tsx` ×2), so FMG GB2 can widen to all of `src`; the five `/api` download buttons of the roles, categories and brands pages are `<a href>` (M31); `StatStrip` takes `value: string | null` and shows `Nil` (M32 d); the reports skeleton's numbers are one column below 640px (M32 e).
- **API (D8, M23 API part):** `src/app/api/search/route.ts` returns `status: { name, label, colorCode }` for assets (the select already read `name`); `D/asset-management/labels/page.tsx` passes `status.name`; `c/assets/asset-label-batch-tool.tsx` takes `name?: string | null` in its row type (its queue mapper sets it in 2D-3).
- **Guards:** LFG lost the five rows that counted 0 (LP1 of the four detail pages, LB1 of `D/maintenance/[id]/page.tsx`; `BUDGETS.LP1` is `{}`) and gained L10, which holds every `KEEP` row equal to its live count (R8): from now on the commit that moves an LFG site lowers its row in the same commit. The LFG and FMG comments name today's lines (M34). No budget went up; VFG changed one pin (Plex Mono); FMG changed comments only.
- **Tests:** new files `tests/button-size-switch.test.ts` (2), `tests/dead-code-cleanup.test.ts` (7), `tests/spinner-motion-ui.test.ts` (1), `tests/status-name-api.test.ts` (2); `tests/design-system.test.ts` lost 6 tests for deleted names and gained 1; `tests/list-pages-ui.test.ts` gained 1 (M31), LFG 1 (L10). 2011 → 2020 tests.
- **Rulings of this plan:** R1 (M5 callers moved here), R2 (one-line edits in files later plans own), R3 (the `lg` buttons outside field rows, `system-settings-form.tsx:1027` and `IntegrationClientManager.tsx:844` wait for their plans), R4 (D18 dialog X order not taken), R5 (M32 a, b, c to 2D-3/2D-4; f is not a bug), R6–R10.
- **Accepted until their plan:** the hand-written `md:h-10` controls of the scout list stay 40px (2D-2 to 2D-4); `font-mono font-semibold` codes show a synthesized bold until M33 (R9); `reports-accounting-view.tsx:74` still types "—" (2D-2).
- **Handed on:** 2D-2: D18 dialog X order with a focus guard (open issue), `access-denied` `lg` → `md`, `asset-state-review-workspace.tsx:144`, `system-settings-form.tsx:1027`, `reports-accounting-view.tsx:74`. 2D-3: `brands/page.tsx:425`, M32 a (supplier total), b (asset page "-"), c (my-assets back link), `StatusBadge` from `status.name` in the scan search and the label tool. 2D-4: M32 b's cancel dialog type, `formatCurrency`. 2D-5: `.impeccable/design.json` button heights, FMG `BUSY_LABEL_SWAPS`.
- Dev-app check (Task 11): <from task-11-findings.md>
- Before/after screenshots and button heights: `.superpowers/sdd/screenshots/ui-phase2d-plan1/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy after 2D and V: <from task-11-findings.md>, together with the open checks of the sections above.
- Next: merge this branch; then plan 2D-2 (its plan first).

## Open Go-Live Decisions
```

- [ ] **Step 7: `docs/99_CHANGELOG.md`.**

The newest date at `14e7748` is `## 2026-10-15`.
  - If `<today>` is 2026-10-15, put the entry directly under that heading.
  - Otherwise, first replace the line `## 2026-10-15` with:

```
## <today>

---

## 2026-10-15
```

Then replace the heading line `## <today>` (the newest, the only line with that date) with the block below. Write the marker from the findings in Thai, in the shape of the 2C plan 5 entry's bullet.

```
## <today>

### รากฐานและลบโค้ดตาย (UI รอบ 4 เฟส 2D plan 1)

Branch `feat/ui-phase2d` (จาก `master` `71597e5`) · design `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` ข้อ 3.1 · plan `docs/superpowers/plans/2026-10-15-ui-phase2d-plan1.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md` · plan แรกจาก 5 ของ 2D

- **ขอบเขต:** ปุ่มเตี้ยลงเป็น 36px บนจอตั้งแต่ 768px · ลบโค้ดที่ไม่มีใครใช้ · แก้เล็ก 6 เรื่อง · API ค้นหาส่งชื่อสถานะภาษาอังกฤษเพิ่ม (อ่านอย่างเดียว ผู้ใช้อนุมัติ) · ไม่มีขั้นตอนงานใหม่ ไม่แตะฐานข้อมูล ไม่เพิ่ม token · การตรวจกรอกไม่เปลี่ยน
- **ปุ่ม:** ปุ่มที่ไม่ระบุขนาดและปุ่มไอคอนสูง 36px ตั้งแต่ 768px (เดิม 40) ระยะข้างตัวอักษร 14px · มือถือยัง 44 เท่าเดิม · ปุ่มที่อยู่แถวเดียวกับช่องกรอก 40px คง 40: ปุ่มไอคอนลบ เลื่อน และทำสำเนาของแถวกรอกซ้ำ 7 แถว (ฟอร์มทรัพย์สิน ฟอร์มหลายรายการ รุ่น หมวดหมู่) ใช้ขนาดใหม่ `icon-lg` และปุ่มพิมพ์บนแถบพิมพ์ป้ายใช้ `lg` · ปุ่มบนหัวหน้าเป็น `md` ทุกหน้า (ปุ่มปิดงาน ยกเลิก แก้ไข ของบันทึกการซ่อมด้วย) · ปุ่มท้าย dialog 36px
- **ลบโค้ดตาย:** `ActionButton` (ปุ่ม "ลองอีกครั้ง" ของหน้าผิดพลาดใช้ `Button`) · helper ปุ่มและ class เก่าใน `src/lib/design-system.ts` 12 ตัว (ลิงก์ของหน้าความพร้อมใช้งานและลิงก์กลับของหน้านำเข้าเป็นปุ่มขอบขนาด `md`) · ปุ่มลบข้อมูลหลัก 2 ไฟล์ · `Badge` · helper เก่าของหน้ารายละเอียดทรัพย์สิน 2 ตัว · ขนาด compact ของปุ่มช่วยเหลือสถานะ · props ป้ายระหว่างทำงาน 10 จุด
- **ข้อความ:** ลบ key ที่ไม่มีใครอ่าน 10 ตัว (`common.saving` `checkin.legacyReturnCreating` `asset.batchCheckDuplicatesRunning` `asset.componentInstalling` `asset.componentRemoving` `asset.statusCorrectionSubmitting` `auth.loggingIn` `asset.importing` `asset.recordingLabelPrint` `asset.latestMaintenance`) · ไม่เพิ่ม key
- **แก้เล็ก:** ฟอนต์ Plex Mono โหลด 400 และ 500 เท่านั้น · ไอคอนหมุน 6 จุดนอกปุ่มหยุดเมื่อผู้ใช้ลดการเคลื่อนไหว (กล้องตรวจนับ ค้นหาจากทะเบียน ช่องค้นหาด้านบน ช่องสแกน) · ปุ่มดาวน์โหลด 5 ปุ่มของหน้าบทบาท หมวดหมู่ และยี่ห้อเป็นลิงก์ธรรมดา · ตัวเลขสรุปที่ว่างแสดง "—" และโปรแกรมอ่านหน้าจออ่าน "ไม่มีข้อมูล" · โครงโหลดของหน้ารายงานเป็นคอลัมน์เดียวเมื่อจอแคบกว่า 640px
- **API:** `/api/search` ส่ง `status.name` (ชื่อสถานะภาษาอังกฤษ) เพิ่มในผลลัพธ์ทรัพย์สิน และหน้าพิมพ์ป้ายหลายรายการรับค่าเดียวกัน · field เดิมไม่เปลี่ยน · 2D-3 ใช้ทำป้ายสถานะ
- **guard:** `list-frame-guards` ลบแถวที่นับได้ 0 ห้าแถว และเพิ่ม test ให้ทุกแถว `KEEP` เท่ากับที่นับได้จริง · comment ใน guard อ้างบรรทัดปัจจุบัน · ไม่มีตัวเลขเพิ่ม
- **test:** ไฟล์ใหม่ 4 ไฟล์ · test 2011 → 2020
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลัง 2D และงาน V
- **ตรวจบนแอป (Task 11):** <จาก task-11-findings.md>
- ภาพก่อน/หลังและความสูงปุ่ม: `.superpowers/sdd/screenshots/ui-phase2d-plan1/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วเริ่ม 2D-2 (เขียน plan ก่อน)
```

Replace every `<today>` and the marker; none may stay. Check the Thai wording against `docs/19_THAI_GLOSSARY.md`.

- [ ] **Step 8: Check.**
  - Run `grep -n "<from task-11\|<จาก task-11\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md`. Expected: nothing.
  - Run `grep -n "until phase 2D makes it\|ActionButton\` and \`getActionButtonClasses\` are deprecated\|Plex Mono loads 400-600" DESIGN.md`. Expected: nothing.
  - Run `git diff --numstat`. Expected: exactly the four files. A file that shows every line changed was normalized; restore its line endings.
  - Run `node <temp>/eol.mjs DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`. Expected: equal numbers on every line.
  - Run `npm test` (2020 tests, 2019 pass, 1 skipped; `tests/audit-round-cancellation.test.ts` reads the handoff and the changelog), `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 9: Commit.**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2D plan 1 buttons, dead code and small fixes in DESIGN.md, design-system index, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - Add `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) `` to the 2D plan 1 changelog entry, directly above its "ตรวจบนแอป (Task 11)" bullet.
  - Add ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above "Dev-app check (Task 11)".
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again, then commit both files with `docs(ui): record phase 2D plan 1 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: 2D plan 1 is built on `feat/ui-phase2d` with the verify numbers, not merged, not deployed; the next step is 2D-2. Fix any sentence the row now contradicts.
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`:
    - the plan 2D-1 checks for a person (Task 11 Step 8): one new numbered item, also added to the list in item 27;
    - open issues 1 (D18 owner) and 2 (`dataQualityPage.assetStateReviews.scanning`) of this plan, if the user has not ruled on them.

  Then:
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Never stage other sessions' changes in the vault.

- [ ] **Step 3: Memory.** Update `review-2026-10-priorities.md`: 2D plan 1 is built on `feat/ui-phase2d`, not merged, not deployed. Next: the merge choice, then the 2D-2 plan.

- [ ] **Step 4:** Use superpowers:finishing-a-development-branch. A local merge fast-forwards `master` (`git merge --ff-only feat/ui-phase2d` from `master`) and runs the tests on the merged result. Push only if the user asks.

---

## Open issues (for the user before or during execution)

1. **D18 dialog X Tab order has no owner** (R4). Spec §3 gives it to no plan. It needs a focus guard in `c/ui/accessible-dialog.tsx` and the sheet, then a check of every dialog. Proposal: 2D-2, as one task with its own dev-app check.
2. **`dataQualityPage.assetStateReviews.scanning`** is passed (`D/admin/data-quality/page.tsx:81`) but never read. It is outside the spec's 10 keys. Delete it in 2D-2 with the data-quality page, or keep it?
3. **Cross-plan one-line edits** (R2): 2D-1 touches files that 2D-3 and 2D-4 own. If the user wants spec §3's "once per plan" read strictly per file across all of 2D, those edits move and the 40px rows stay unprotected at the switch. The plan assumes one plan at a time is enough.
4. **Plex Mono 600** (R9): until M33, eight `font-mono font-semibold` places draw a synthesized bold. If Task 11 finds it unacceptable, the fallback is to move those eight to `tag font-medium` in a follow-up commit; they are in 2D-2 to 2D-4 files.
