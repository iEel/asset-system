# Page group 7, plan 2: employees (the list, the employee page, single returns from it) Implementation Plan

> Approved by the user 2026-11-06 ("แผน 2 ผมโอเค").

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A former employee who still holds assets is easy to find (including those AD deactivated); the employee page is rebuilt to its board, lists every held asset with its handover document, and takes each machine back through the return form, which comes back to the employee page.

**Architecture:**
- **Read model:** a new `src/lib/employee-page-data.ts` for the employee page (held assets paged, each with its open handover or "ข้อมูลเก่า", its return block, its audit summary; the user account line; open handovers split into regular and overdue).
- **Return form changes (transactions code, spec §5.2):** its way back accepts one employee page; `assetId` preselects a held asset with no handover (the legacy path the form already has); a shared `getHeldAssetReturnBlock` gives the reason a held asset cannot be returned.
- **Handover form:** `?custodianId=` presets the person ("ส่งมอบทรัพย์สินให้คนนี้").
- **List:** the "พ้นสภาพแต่ยังถือครอง" card counts and opens every not-active (employment status or record) employee holding an active asset.
- No migration. The multi-asset return (spec §5.3) is plan 4; this plan leaves room for its header button.

**Tech Stack:** Next.js 16, Prisma 7 on SQL Server, next-intl, `node --test`, Playwright (4 projects).

**Spec:** `docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md` §5.1, §5.2, §5.4, §7 (approved 2026-11-05, `837bb98e`). Boards: the employees list (## ข้อมูลหลัก) and the employee detail line of ## ข้อมูลหลักที่เหลือ in `.impeccable/critique/2026-10-20-canvas-assumptions.md`; board images to be captured into the plan workspace before Task 3.

## Global Constraints

- Thai first; glossary; messages via `node scripts/messages-edit.mjs` (dotted keys); errors under fields.
- Permissions: pages `employee:view`; "รับคืน" and "ส่งมอบทรัพย์สินให้คนนี้" need `asset:edit` (as the return and handover forms); the user-account line only for `user:view`.
- The employee deactivate block (`getEmployeeDeleteBlockReason`) is unchanged.
- No change to LDAP sync.
- E2E: dev DB only; run-marked employees, assets and handovers only.

## Plan rulings

- **G7P2-R1** "พ้นสภาพแต่ยังถือครอง" = (`employmentStatus !== "active"` OR `isActive = false`) AND holds ≥ 1 active asset as custodian; the card links `?former=withAssets`, which ignores the record-status filter.
- **G7P2-R2** Held assets on the employee page page at 25 (`?heldPage=`), ordered by asset tag.
- **G7P2-R3** A held asset's return block reuses the return form's own search refusal reasons (one helper for both), shown as "รับคืน" disabled with the reason.
- **G7P2-R4** Open handovers: "ใช้ประจำ" = a permanent assignment; "ยืม" = a temporary loan with a due date; only a loan past its due date is a warning.

## Review Focus

1. An employee AD deactivated (isActive false, resigned) holding two assets: counted on the card and listed by it, though the default list shows active records only.
2. A held asset with no handover (imported data): "รับคืน" opens the return form with it preselected through the legacy path, and saving returns to the employee page.
3. A held asset under repair or pending disposal: "รับคืน" disabled with the same reason the return form gives.
4. A forged `returnTo` (another site, another locale, a deeper path) on the return form falls back to its normal page.
5. An employee with more than 25 held assets: paging keeps the rest reachable; the count in the header is the total.

---

### Task 1: The return and handover forms' entry points

**Files:** `src/lib/asset-return-navigation.ts` (accept `/${locale}/master-data/employees/<uuid>`), `src/lib/checkin-page-data.ts` (`getCheckinPreselect` preselects a held asset with no open handover — the legacy row — from `assetId`), a new `src/lib/held-asset-return-block.ts` (`getHeldAssetReturnBlock(asset): HeldAssetReturnBlock | null`, the reasons the return search refuses today), the handover page (`?custodianId=` presets the person when active), tests.
- [ ] Failing tests: returnTo accepts the employee page and refuses `/th/master-data/employees/x/edit`, other origins and locales; `getCheckinPreselect({ assetId })` of a legacy-held asset returns its row; the block helper names under-repair, pending-disposal, fitted-component; the handover page reads `custodianId`.
- [ ] Implement, `npm test`, `tsc`, eslint; commit `feat(transactions): the return form comes back to an employee page and preselects a held asset without a handover; the handover form takes a person (group 7 plan 2)`.

### Task 2: The employee page read model

**Files:** create `src/lib/employee-page-data.ts`; tests.
- Produces `readEmployeePage(db, id, viewer, { heldPage })` → `{ employee, warning: { former: boolean; heldCount: number } | null, held: { rows: Array<{ assetId; assetTag; name; status; handover: { id; documentNo; kind: "regular" | "loan"; dueDate: Date | null } | null; legacy: boolean; returnBlock: HeldAssetReturnBlock | null; lastAudit: { roundNo; result; checkedAt } | null }>, total, page }, openHandovers: { regular: number; loans: number; overdueLoans: number }, account: { username: string; isActive: boolean } | null, ...today's history, repairs, audit, disposal reads }`.
- [ ] Failing tests per Review Focus 1, 2, 3, 5 and G7P2-R4 → implement (IN lists chunked by 2,000) → commit.

### Task 3: The employee page

**Files:** rewrite `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx` to its board: header (name, code, position, the employment status, "แก้ไข", "ส่งมอบทรัพย์สินให้คนนี้" → `/asset-management/checkout?custodianId=&returnTo=`); the warning panel "พ้นสภาพแล้ว ยังถือครอง {n} รายการ"; the held table (photo, name, tag, handover document or "ข้อมูลเก่า" with "สร้างใบส่งมอบย้อนหลัง", last audit, "รับคืน" → `/asset-management/checkin?checkoutId=|assetId=&returnTo=`, disabled with the reason); open handovers split (regular / loans / overdue in the warning tone); "บัญชีผู้ใช้ในระบบ"; the existing history, repairs, audit, disposal sections restyled; phone cards. Messages; pins.
- [ ] Failing pins → implement → commit.

### Task 4: The employee list

**Files:** `src/app/[locale]/(dashboard)/master-data/employees/page.tsx`, `src/lib/organization-master-query.ts` (G7P2-R1), messages, tests.
- [ ] Failing tests: the card's count and filter include an AD-deactivated holder; `?former=withAssets` ignores the record-status filter; each such row shows the held count in the warning tone → implement (restyle to the board) → commit.

### Task 5: E2E

- [ ] `e2e/master-data/employees.spec.ts`: a run-marked employee holding two run assets (one with a handover, one legacy) is marked former (through the API the run may use; no LDAP sync) → the card lists them → the employee page shows both, "รับคืน" on the handover one opens the return form preselected, saving lands back on the employee page with one held; the legacy one opens preselected through the legacy path; an under-repair asset's "รับคืน" is disabled with the reason; "ส่งมอบทรัพย์สินให้คนนี้" opens the handover form with the person chosen. Phone cards; axe.

### Task 6 (controller)

- [ ] E2E `e2e/master-data`, `e2e/transactions`, four projects; look step; final review Workflow 3×2; docs, wiki, memory.
