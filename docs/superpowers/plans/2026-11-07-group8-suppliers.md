# Page group 8, plan 3: suppliers list and detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The suppliers list (`MD-Suppliers`) and the supplier page (`MD-Supplier`) rebuilt to their boards, every current feature kept.

**Architecture:** the list follows plan 1's shared list pattern; the detail page reads through `src/lib/supplier-detail.ts` (extended, one read model). No migration.

**Spec:** `docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md` §3, §7, §8, §9. Boards in this plan's workspace `boards/`.

## Global Constraints

- Thai first; glossary; messages via `node scripts/messages-edit.mjs`; errors under fields; source pins CRLF-safe; IN lists chunked by 2,000.
- **Kept (spec §8):** every search field (addresses, tax IDs, contacts), every sort (`supplierSorts` — default name), the purchase-document usage filter + status, paging, `returnTo`, the phone cards and filter disclosure, the supplier form as it is (incl. leave-without-saving), the API guard (`getSupplierDeleteBlockReason`, `shouldBlockSupplierLifecycleChange`), the detail page's empty states, phone document cards and back link, the repair history's reported date.
- Open repair = status not closed/cancelled, the same definition the detail page uses today; one helper for list and page.
- Skipped (migration): the description line; "รอผู้ขายมา N วัน" → "เปิดงานเมื่อ {date} ({n} วัน)" (days since reported, Bangkok day).
- E2E dev DB only, run-marked suppliers only, no DELETE.

## Recon (at 840dd248)

- List `src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx` (282), detail `suppliers/[id]/page.tsx` (321), `src/lib/supplier-detail.ts`, `src/lib/supplier-lifecycle-policy.ts`, `supplierSorts`/`parseSupplierListParams`/`buildSupplierWhere` in `src/lib/organization-master-query.ts`, route `src/app/api/suppliers/[id]/route.ts`.

## Plan rulings

- **G8P3-R1** ค่าซ่อมสะสม sums the supplier's repair records' cost over non-cancelled records; the foot counts records with a cost > 0.
- **G8P3-R2** มูลค่าจัดซื้อรวม sums the purchase documents' amounts (null as 0) and the documents table ends with the same total row.
- **G8P3-R3** "{n} รายการยังไม่ผูกเอกสาร" counts the supplier's active assets with no purchase document.

---

### Task 1: Suppliers list

**Files:** list page, `organization-master-query.ts` (status counts, open-repair counts per page ids chunked, default sort name), messages, tests. Board per spec §7 (cards, chip, summary line, columns incl. "เพิ่มข้อมูลติดต่อ" to the edit form, ค้าง {n}; ⋯ แก้ไข / ปิดใช้งาน with the reason incl. PM plans / เปิดใช้งาน); phone cards kept and given the same facts.
- [ ] Failing tests → implement → commit.

### Task 2: Supplier read model

**Files:** `src/lib/supplier-detail.ts`, tests. Four figures (R1–R3), latest 5 assets of n, all documents newest first with type label/invoice/linked count/amount and the total, open repairs for สิ่งที่ควรติดตาม with days since reported (Bangkok day), the repair history (asset name, status, tag · MT-, problem, cost, reported date).
- [ ] Failing tests → implement → commit.

### Task 3: Supplier page

**Files:** detail page, messages, tests. Header (code, contact line, แก้ไข, ⋯ ปิดใช้งาน with the reason / เปิดใช้งาน), the strip of four, assets table + "ดูทรัพย์สินทั้งหมด ({n})" to the register `?supplierId=`, documents with the total row, side panels; empty states and phone document cards kept.
- [ ] Failing pins → implement → commit.

### Task 4: E2E

- [ ] `e2e/master-data/suppliers.spec.ts`: a run-marked supplier with a run asset and document: list facts and ⋯; the page's four figures, document total, ดูทรัพย์สินทั้งหมด opens the register filtered; ปิดใช้งาน unavailable with the reason; phone; axe.

### Task 5 (controller)

- [ ] E2E `e2e/master-data`; look step; final review Workflow 3×2; docs, wiki, memory.
