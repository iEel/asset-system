# Page group 7, plan 3: locations (tree view, safe parent choice, safe deactivation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The locations page reads as the building is (branch → building → floor → room) in a tree, every asset count opens the register for that location, a location can only hang under one of its own branch and never under itself or its children, and deactivating says what blocks it.

**Architecture:**
- **Rules:** a new pure `src/lib/location-tree.ts`: the tree with own and subtree asset counts, the name path, the descendants of a node, the parent check (same branch, no cycle over inactive rows too, branch change refused while children or assets remain).
- **API:** `POST/PUT /api/locations` use the parent check only when the parent or branch changes (spec §6.2); existing cross-branch data is not rewritten.
- **Pages:** `/master-data/locations` gains the tree (default) beside today's list; the form's parent becomes a searchable picker limited to the branch, with paths; `?branchId=&parentId=` presets it ("เพิ่มที่ตั้งในนี้"); the register's location chip shows the full path. No migration.

**Tech Stack:** Next.js 16, Prisma 7 on SQL Server, next-intl, `node --test`, Playwright (4 projects).

**Spec:** `docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md` §6, §7 (approved 2026-11-05). Boards (design data): `MD-Locations.dc.html`, `MD-Location-New.dc.html` (copied into this plan's workspace `boards/`).

## Global Constraints

- Thai first; glossary; messages via `node scripts/messages-edit.mjs` (dotted keys); errors under fields; type labels through `src/lib/location-types.ts`.
- Permissions as today: `location:view|create|edit|delete`.
- **Source-pin tests read files CRLF-safe:** normalize with `.replace(/\r\n/g, "\n")` or use `\r?\n` (three merges broke on LF-only pins).
- IN lists chunked by 2,000; a branch holds hundreds of locations — read one branch's (or all active) locations once and build the tree in memory.
- E2E: dev DB only; only run-marked locations and assets are created; deactivation is checked up to its confirm (no DELETE in E2E).

## Plan rulings

- **G7P3-R1** The tree opens with every branch expanded one level (its root locations shown, deeper levels closed); a search opens the ancestors of every match and highlights the match.
- **G7P3-R2** "รวมที่ตั้งย่อย {n}" = active assets whose current location is anywhere in the subtree (the node included), shown on a node that has children.
- **G7P3-R3** The register filter stays exact (`locationId` = that location); the subtree number is for reading only.
- **G7P3-R4** The view choice is a URL parameter `?view=tree|list` (tree default), so links and back keep it.
- **G7P3-R5** Branch change is refused (`LOCATION_BRANCH_IN_USE`, under the branch field) while the location has active children, current assets or home assets.

## Review Focus

1. Editing a room: its own children and grandchildren are not offered as its parent; a crafted PUT with one is refused (`LOCATION_PARENT_CYCLE`), even through an inactive middle node.
2. A parent from another branch in a crafted POST/PUT: refused (`LOCATION_PARENT_OTHER_BRANCH`); an existing location already under another branch's parent saves fine when neither parent nor branch changes.
3. A location with 0 own assets but assets in its children: its own count is 0 and opens an empty register, the subtree number shows the real total.
4. Deactivating a location with children or assets: the confirm names each blocker with its count and offers no deactivate button.
5. "เพิ่มที่ตั้งในนี้" on a node: the form opens with that branch and that parent chosen; saving lands the new location under it in the tree.

---

### Task 1: Location rules and the API checks

**Files:** create `src/lib/location-tree.ts`; modify `src/app/api/locations/route.ts`, `src/app/api/locations/[id]/route.ts`, `src/lib/location-list-query.ts` (reuse or retire `wouldCreateLocationCycle`); messages for the three codes; tests `tests/location-tree.test.ts` + route pins.
- Produces:
  - `export type LocationNodeInput = { id: string; code: string; name: string; locationType: string; branchId: string; parentId: string | null; isActive: boolean; ownAssetCount: number }`
  - `export type LocationTreeNode = LocationNodeInput & { depth: number; path: string[]; subtreeAssetCount: number; children: LocationTreeNode[]; parentOtherBranch: boolean }`
  - `export function buildLocationTree(rows: readonly LocationNodeInput[]): Map<string /* branchId */, LocationTreeNode[]>` (roots per branch; a node whose parent is missing or inactive is a root; `parentOtherBranch` when the parent's branch differs)
  - `export function locationDescendantIds(rows, id): Set<string>` (all rows, inactive included)
  - `export function checkLocationParent(input: { id?: string; branchId: string; parentId: string | null; previous?: { branchId: string; parentId: string | null } }, rows: readonly LocationNodeInput[], usage?: { activeChildren: number; currentAssets: number; homeAssets: number }): "LOCATION_PARENT_OTHER_BRANCH" | "LOCATION_PARENT_CYCLE" | "LOCATION_BRANCH_IN_USE" | null` — runs only when the parent or branch changes against `previous` (always on create).
- [ ] Failing tests for Review Focus 1–3 and G7P3-R2, R5 → implement → wire into POST/PUT (409 with `fieldErrors` on `parentId` / `branchId`) → `npm test`, `tsc`, eslint → commit.

### Task 2: The form

**Files:** `src/components/master-data/location-form.tsx`, `src/app/[locale]/(dashboard)/master-data/locations/new/page.tsx`, `[id]/edit/page.tsx`; messages; tests.
- Parent: `SearchableSelect` listing active locations of the chosen branch with their name path ("สำนักงานใหญ่ › อาคาร A › ชั้น 3"); on edit, the location and its descendants are left out; changing the branch clears a parent of another branch; `?branchId=&parentId=` presets both on create (ignored when invalid). The type select shows Thai labels. Restyle to `MD-Location-New`.
- [ ] Failing tests (pure option builder `buildLocationParentOptions(rows, { branchId, editingId })` + pins) → implement → commit.

### Task 3: The page

**Files:** `src/app/[locale]/(dashboard)/master-data/locations/page.tsx`; create `src/components/master-data/location-tree-view.tsx` (client: expand/collapse, keyboard per the ARIA tree pattern or a nested list of disclosure buttons), `src/components/master-data/location-deactivate-button.tsx`; messages; tests.
- **Copy (th):** views `แผนผัง` / `รายการ`; subtree `รวมที่ตั้งย่อย {n}`; cross-branch warning `อยู่คนละสาขากับที่ตั้งแม่`; add child `เพิ่มที่ตั้งในนี้`; ⋯ `ปิดใช้งาน`; confirm title `ปิดใช้งาน {name}?`; blockers `มีทรัพย์สินอยู่ที่นี่ {n}` · `เป็นที่ตั้งประจำของทรัพย์สิน {n}` · `มีที่ตั้งย่อยที่ใช้งาน {n}` · `ถูกใช้ในรอบตรวจนับ {n}`; blocked footer `ปิดใช้งานไม่ได้จนกว่าจะย้ายหรือปิดรายการข้างบน`.
- Tree (G7P3-R1, R4), list with the name path, counts → `/assets?locationId=` (G7P3-R3), phone = the tree as an indented list. Restyle to `MD-Locations`.
- [ ] Failing pins → implement → commit.

### Task 4: The register chip

**Files:** `src/app/[locale]/(dashboard)/assets/page.tsx` (where chip names load), tests.
- [ ] The `locationId` chip shows the location's name path; pin → commit.

### Task 5: E2E

- [ ] `e2e/master-data/locations.spec.ts`: run-marked building → floor → room under the run's branch (as `createRoom` does), one run asset in the room: the tree shows the chain with the room's count 1 and the floor's "รวมที่ตั้งย่อย 1"; the room's count opens the register filtered to it (chip shows the path); "เพิ่มที่ตั้งในนี้" on the floor opens the form preset; editing the floor does not offer the room as parent; a crafted PUT with a cycle and one with another branch's parent are refused; the floor's ปิดใช้งาน confirm names its blockers (then cancel). Phone tree; axe via recordSettled.

### Task 6 (controller)

- [ ] E2E `e2e/master-data`, `e2e/assets`, four projects; look step; final review Workflow 3×2; docs, wiki, memory.
