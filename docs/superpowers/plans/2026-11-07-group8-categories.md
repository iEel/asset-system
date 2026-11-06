# Page group 8, plan 2: categories list and edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The categories list (`MD-Categories`) and the category edit/create form (`MD-Category-Edit`) rebuilt to their boards, every current feature kept.

**Architecture:** the list follows plan 1's shared list pattern (status counts, ⋯ with ปิดใช้งาน/เปิดใช้งาน, name first); the form stays one client component (`src/components/master-data/category-form.tsx`) restructured into the board's four sections plus a side panel, with the server page passing usage counts for edit. No migration.

**Spec:** `docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md` §3, §6, §8, §9. Boards in this plan's workspace `boards/`.

## Global Constraints

- Thai first; glossary; messages via `node scripts/messages-edit.mjs`; errors under fields; source pins CRLF-safe; IN lists chunked by 2,000.
- **Kept (spec §8):** every search field (the description stays searchable though its column goes), every sort (`categorySorts`: code, name, models, assets, customFields, createdAt — default name), the five health filters + status, paging, `returnTo`, export and import template, the five field types (ข้อความ, ตัวเลข, รายการเลือก, วันที่, ใช่/ไม่ใช่), move/duplicate/remove a field, row-level errors, the duplicate-field-name refusal (`duplicateCustomFieldNameErrors`), reviving an inactive category by its code on create, the photo checklist (`category-photo-checklist.ts`), the prefix read from settings (`category-prefix-groups.ts`, `parseCategoryPrefixMap`).
- The status checkbox is disabled **only** when unticking an active category that has assets or models; an inactive category can always be ticked back on. The server guard (`getCategoryDeleteBlockReason`) stays.
- No migration; E2E dev DB only, run-marked categories only, no DELETE.

## Recon (at 840dd248)

- List `src/app/[locale]/(dashboard)/master-data/categories/page.tsx` (388), query `src/lib/category-list-query.ts` (`parseCategoryListParams`, `buildCategoryWhere`, `buildCategoryHealthSummary`, `buildCategoryDrilldownHrefs`, `buildCategoryOrderBy`, `parseCategoryPrefixMap`), prefix groups `src/lib/category-prefix-groups.ts`, guard `src/lib/category-delete-guard.ts`, excel `src/lib/category-excel.ts`.
- Form `src/components/master-data/category-form.tsx` (585) used by `categories/new/page.tsx` and `categories/[id]/edit/page.tsx`; arrays helpers `src/lib/category-form-arrays.ts`.

## Plan rulings

- **G8P2-R1** "ฟิลด์ที่มีค่าอยู่แล้ว" (the rename warning) counts, per field name, the category's active assets whose `customFieldsJson` holds a non-empty value, read on the edit page server side (assets read in id chunks of 2,000, only `customFieldsJson` selected). The warning shows beside a field whose name changed from the saved one and has values.
- **G8P2-R2** "ใหม่" marks a field row not in the saved definition (by its saved index identity, not name).
- **G8P2-R3** The side panel "ผลของการแก้ไข" compares the saved values to the form state: number of fields, required fields, photo items, status; "หลังบันทึก" updates live.

---

### Task 1: Categories list

**Files:** the list page, `category-list-query.ts` (status counts; default sort name), messages, tests. Board `MD-Categories` per spec §6 (cards incl. the prefix card linking settings; columns; ⋯ แก้ไข, ดูรุ่น ({n}), ดูทรัพย์สิน ({n}), "คำนำหน้ารหัส {p} ในการตั้งค่า", ปิดใช้งาน with the reason / เปิดใช้งาน), plan 1's shared helpers.
- [ ] Failing pins/tests → implement → `npm test`, tsc, eslint → commit.

### Task 2: Edit form sections 1–2 (information, template table)

**Files:** `category-form.tsx` (split into section components under `src/components/master-data/category-form/` if it helps), the edit page (usage counts, G8P2-R1 values count), messages, tests. Header with the counts line; section 1 with hints and the read-only prefix box (prefix, shared-with, example tag, แก้ในการตั้งค่า); section 2 the compact table with option chips + แก้ตัวเลือก, ใหม่ badges (R2), the rename warning (R1), ⋯ move/ทำซ้ำ/ลบ; all five types.
- [ ] Failing tests (values count reader; form pins) → implement → commit.

### Task 3: Edit form sections 3–4, side panel, sticky footer

**Files:** same form, messages, tests. Section 3 numbered photo items; section 4 the status rule above; side panel (R3); sticky footer change summary; the create page uses the same form without counts.
- [ ] Failing tests → implement → commit.

### Task 4: E2E

- [ ] `e2e/master-data/categories.spec.ts` (new or extend the existing one): a run-marked category with a run model: list counts and ⋯ links; edit: add a date field and a yes/no field, save, reopen, both kept; the status checkbox disabled while it has a model; the side panel changes as fields are added; phone; axe.

### Task 5 (controller)

- [ ] E2E `e2e/master-data`; look step; final review Workflow 3×2; docs, wiki, memory.
