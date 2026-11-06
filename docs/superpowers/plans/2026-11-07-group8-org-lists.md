# Page group 8, plan 1: companies, branches, departments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The companies, branches and departments lists rebuilt to their boards with the shared list pattern (spec §3), the department deactivation guard, the register's `departmentId` filter, and `branches/new?companyId=`.

**Architecture:** reuse the group 7 follow-ups' shared pieces (`RecordStatusSegmented`, `deactivateMenuItem`, the location reactivate pattern); queries stay in `src/lib/organization-master-query.ts` (companies, branches) and a new `src/lib/department-list-query.ts`. No migration.

**Spec:** `docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md` §3, §4, §5, §8, §9 (written overnight 2026-11-07 from the boards at the user's request; not merged before review). Boards in this plan's workspace `boards/`.

## Global Constraints

- Thai first; glossary; messages via `node scripts/messages-edit.mjs` (dotted keys); errors under fields; source pins CRLF-safe; IN lists chunked by 2,000.
- **Nothing that works today is removed** (spec §8 list): every search field, every sort (the board's default sort is by name; the others stay reachable), paging with previous/next and past-the-end redirect, `returnTo`, empty states, กรอง/ล้างตัวกรอง, phone table scroll + ⋯ sheet, the forms as they are, the API rules.
- ปิดใช้งาน needs `<module>:delete`; เปิดใช้งาน `<module>:edit`; the server guards stay the backstop.
- No migration; a board item needing one is skipped and listed (spec §9).
- E2E: dev DB only, run-marked companies/branches/departments only (created through the seed admin API as other specs do), no DELETE.

## Recon (2026-11-07, at 840dd248)

- Pages: `src/app/[locale]/(dashboard)/master-data/{companies,branches,departments}/page.tsx` (310 / 328 / 198 lines). Queries: `src/lib/organization-master-query.ts` (`companySorts`, `branchSorts`, `parseCompany/BranchListParams`, `buildCompany/BranchWhere`, `build…OrderBy`, `build…QueryString`, `buildCompany/BranchSummary`, `getCompanyDeleteBlockReason` :577, `getBranchDeleteBlockReason` :596, `getEmployeeDeleteBlockReason` :613); categories `src/lib/category-delete-guard.ts`; locations `getLocationDeleteBlockReason` in `src/lib/location-list-query.ts` (already ปิดใช้งาน wording? check, leave if so).
- Routes: `src/app/api/{companies,branches,departments}/[id]/route.ts`. Companies and branches check usage in PUT (`isDeactivation` from `src/lib/master-data-query.ts`) and DELETE, counting `auditRounds: { where: { isActive: true } }` (every active round, any status — keep as is). **Departments check nothing** (DELETE :82 just sets `isActive: false`).
- `Department` has `employees`, `assets`, `auditRounds` (via `AuditRound.scopeDepartmentId`); `Asset.departmentId` exists. The register (`src/lib/asset-list-query.ts`) has `custodianId`, `locationId`, `supplierId`… but no `departmentId` filter; its key list is at :194 (`dataQuality === "department"` means "no department" — a different thing, keep it).
- Shared pieces from group 7 follow-ups: `src/components/ui/record-status-segmented.tsx` (`RecordStatusSegmented({ value, counts: { active, inactive, all }, hrefFor })`), `deactivateMenuItem` (in the row-actions module; label passed in; hidden without delete; unavailable with the reason when blocked), `src/components/master-data/location-deactivate-button.tsx` (confirm checklist + reactivate pattern), `employee-row-actions.tsx` (a list's ⋯ built on them).

## Plan rulings

- **G8P1-R1** The block-reason texts of companies, branches, departments, categories, suppliers and employees change from "ไม่สามารถลบ…" to "ปิดใช้งาน…ไม่ได้ เพราะ…" wording (shared by the menus and the 409s), with their tests.
- **G8P1-R2** "ปิดใช้งานเมื่อ {date}" reads the newest `delete` (deactivate) system-log entry of the record; "–" when none.
- **G8P1-R3** The department guard blocks while it has active employees, active assets (as the asset's department) or an open audit round scoped to it (status not closed/cancelled — reuse the audit pages' definition).

---

### Task 1: Shared list helpers and the reason wording

**Files:** a small shared module for the five lists (e.g. `src/lib/master-data-list-ui.ts`): the status counts read (`readRecordStatusCounts(model, where)`), the "deactivated at" read (G8P1-R2), the name-sort defaults; G8P1-R1 across `src/lib/organization-master-query.ts`, `src/lib/category-delete-guard.ts`, the supplier lifecycle policy; tests.
- [ ] Failing tests → implement → `npm test`, `tsc`, eslint → commit.

### Task 2: Companies list

**Files:** `src/app/[locale]/(dashboard)/master-data/companies/page.tsx`, `src/lib/organization-master-query.ts`; messages; tests. Board `MD-Companies` per spec §4; ⋯ เพิ่มสาขาให้บริษัทนี้ → `/master-data/branches/new?companyId=` (Task 3 adds the preset).
- [ ] Failing pins/tests → implement → commit.

### Task 3: Branches list and the branch form preset

**Files:** branches page, `branches/new/page.tsx` + `src/components/master-data/branch-form.tsx` (`?companyId=` preset, active companies only), queries; messages; tests. Board `MD-Branches` per spec §5.
- [ ] Failing pins/tests → implement → commit.

### Task 4: Departments list, the department guard, the register filter

**Files:** departments page, `src/lib/department-list-query.ts`, `src/app/api/departments/[id]/route.ts` (DELETE and PUT-deactivate guard, G8P1-R3), `src/lib/asset-list-query.ts` + the register chips (`departmentId` filter and chip); messages; tests. Board `MD-Departments` per spec §5 (cards, filters, chip + summary line, links, the confirm checklist).
- [ ] Failing tests (guard; filter; where builders) → implement → commit.

### Task 5: E2E

- [ ] `e2e/master-data/org-lists.spec.ts`: run-marked company/branch/department: the segmented counts, the board columns, ⋯ เพิ่มสาขาให้บริษัทนี้ presets the branch form, เพิ่มที่ตั้งในสาขานี้ presets the location form, a department with a run employee shows ปิดใช้งาน disabled with the reason and a crafted DELETE is refused… (DELETE is not allowed in E2E — check the refusal through the PUT `isActive:false` path instead), the department's asset count opens the register filtered by `departmentId`; phone; axe.

### Task 6 (controller)

- [ ] E2E `e2e/master-data` + `e2e/assets`; look step; final review Workflow 3×2; docs, wiki, memory.
