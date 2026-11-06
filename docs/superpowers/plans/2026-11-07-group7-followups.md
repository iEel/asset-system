# Page group 7 follow-ups: the deferred board items (employees, locations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the board items that plans 2 and 3 deferred, and the shared list pieces group 8 reuses: a record-status segmented control with counts, a "deactivate with reason" row item, and rich option rows in `SearchableSelect`.

**Architecture:** shared components first (Task 1), then the employee list (Task 2), the employee page (Task 3), the location parent picker (Task 4), E2E (Task 5). No migration.

**Spec:** `docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md` §5–§6 and the boards `MD-Employees`, `MD-Employee`, `MD-Location-New`; written overnight 2026-11-07 at the user's request ("ทั้งสองอย่าง"), on a branch, not merged before review.

## Global Constraints

- Thai first; glossary; messages via `node scripts/messages-edit.mjs` (dotted keys); source pins CRLF-safe; IN lists chunked by 2,000; no migration (a board item needing one is skipped and listed).
- Nothing that works today is removed.
- E2E: dev DB only, run-marked data, no DELETE.

## Plan rulings

- **G7F-R1** `RecordStatusSegmented({ value, counts: { active, inactive, all }, hrefFor })` in `src/components/ui/record-status-segmented.tsx` replaces the status select on the employee list now and on the five group-8 lists later; the status column shows only under ทั้งหมด.
- **G7F-R2** Row ⋯ items that cannot run show disabled with their reason (the existing `unavailable` RowActions item); "ปิดใช้งาน" needs `<module>:delete`, "เปิดใช้งาน" `<module>:edit`.
- **G7F-R3** `SearchableSelect` options gain an optional `description?: string` and `meta?: string` (second line and a right-side chip); the label stays the searchable/accessible text.
- **G7F-R4** Employee page board items: held totals with/without a handover over **all** held assets (one count query each); "ตรวจนับรอบปัจจุบัน" = the held assets' items in open audit rounds (found / missing / not yet); the open repair number per held row; row ⋯ with โอนย้าย (→ transfer form `?assetId=&returnTo=`) and พิมพ์ใบส่งมอบ (→ its HO- print) when a handover exists.

## Tasks

1. **Shared pieces** — `RecordStatusSegmented`, the `unavailable` deactivate item helper, `SearchableSelect` `description`/`meta` (all callers unchanged); unit tests + pins.
2. **Employee list** — the segmented status with counts; the board's merged name/department columns (keep every filter and sort); the chips line "{n} คน · ถือครองรวม {a} รายการ"; row ⋯: แก้ไข, ดูทรัพย์สินที่ถือครอง ({n}) (→ register `?custodianId=`), ปิดใช้งาน disabled with the employee delete-block reason (held assets, subordinates, user account, open handover, audit rounds) when it applies.
3. **Employee page** — G7F-R4.
4. **Location parent picker** — rich rows per `MD-Location-New` (name bold, path line, type chip, "ย่อย {n}").
5. **E2E** — extend `e2e/master-data/employees.spec.ts` and `locations.spec.ts` for the new items.
6. **Controller** — E2E `e2e/master-data`, look step, final review Workflow 3×2, docs, wiki, memory.
