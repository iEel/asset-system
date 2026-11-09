# ของใช้สิ้นเปลือง plan 2 of 4: the list page, its dialogs and the item history

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** IT opens ทรัพย์สิน › ของใช้สิ้นเปลือง and works the cabinet from one page:
- they see each kind's count, minimum, state and 90-day use;
- they record เบิกไปใช้, รับเข้า and ปรับยอด, and add or edit a kind;
- they open a kind's history.

**Architecture:**
- **List page:** a server page reads the kinds with their 90-day issue totals, through one new service read.
- **Dialogs:** one client workspace holds them and calls plan 1's routes.
- **Issue dialog:** its asset field reuses the shared asset picker through a new `consumable` mode, so the eligibility rule stays the server's.
- **Kind history:** a page of its own.

**Tech Stack:** Next 16 app router, next-intl, the shared UI kit, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-consumables-design.md` §3 (screens, dialogs, history), §5, §6.

## Global Constraints

**Permissions:**

| Action | Permission |
|---|---|
| Page and history | `consumable:view` |
| Issue and receive | `consumable:create` |
| Adjust, add or edit a kind, deactivate | `consumable:edit` |

- Buttons the viewer cannot use are not rendered.

**The menu:**
- A new top-level item in the sidebar section `sectionAssets`, after `assetRegister`: `labelKey: "consumables"`,
  href `/${locale}/consumables`, permission `consumable:view`, icon `Cable` from lucide.
- The phone "more" sheet reads the same config. Check it shows.

**Plan 1's API:**
- `GET/POST /api/consumables`.
- `GET/PATCH /api/consumables/[id]`. PATCH takes the full `{ name, unit, minQuantity }` or exactly `{ isActive: false }`.
- `POST /api/consumables/receive` with `{ itemId, quantity, receivedDate, note? }`.
- `POST /api/consumables/issue` with `{ itemId, quantity, assetId, note? }`.
- `POST /api/consumables/adjust` with `{ itemId, counted, reason }`.
- `GET /api/consumables/movements?itemId|assetId&page`.
- **Errors:**
  - 400 with `fieldErrors` (keys are the schema field names);
  - 409 `CONSUMABLE_SHORT` with `{ onHand, unit }`;
  - 409 `CONSUMABLE_CHANGED`;
  - 404 not found.
- **Rules:** `src/lib/consumable-rules.ts` (`consumableStockState`, `isConsumableLow`, `CONSUMABLE_OFTEN_DAYS` …).

**The asset picker (issue):**
- Add mode `"consumable"` to `assetOperationModes` in `src/lib/asset-operation-eligibility.ts`.
- Its verdict: an active asset whose status name is not in `consumableBlockedIssueStatusNames`, any category or
  ownership. Reason key: one new message.
- `GET /api/asset-operations/search` keeps `asset:edit` for the existing modes, and requires `consumable:create` for
  `mode=consumable`.
- The search rules in `src/lib/asset-operation-search-rules.ts` get a `consumable` case.

**Words** (glossary first):
- Add rows to `docs/19_THAI_GLOSSARY.md` for ของใช้สิ้นเปลือง, เบิกไปใช้, รับเข้า, ปรับยอด, ขั้นต่ำ and คงเหลือ.
- Add messages only through `node scripts/messages-edit.mjs` in a new namespace `consumablesPage`. ICU plural English,
  Thai `{x, number}`. Update `tests/i18n-plural-count.test.ts`.

**Look:**
- Main-system components only: `PageHeader`, `ContentPanel`, `DataTable*`, `StatusBadge`, `Notice`, `RowActions` (⋯),
  `AccessibleDialog`, `SearchableSelect`, `ActionEmptyState`, `ActionBar` on phones.
- Field errors under fields, as `src/components/assets/asset-status-correction-dialog.tsx` does: FIELD_IDS, validate,
  focus the first error, server `fieldErrors`.
- 44px targets below md.
- Tokens only, for both themes.

**Process:**
- CRLF-safe source pins.
- Never touch `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`,
  `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- No Playwright, `next build` or DB by implementers.
- Read `node_modules/next/dist/docs/` for page params.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Two people issue the last unit.** The loser sees "ของในตู้ไม่พอ เหลือ n ชิ้น" built from the 409 body's `onHand`
   and `unit`, under the quantity field. The list refreshes. Task 3 pins the 409 mapping.
2. **A kind with 0 left.** Its row's เบิก is disabled with the reason, and the dialog's kind list marks it and cannot
   pick it. Task 2/3 pin it.
3. **An adjust to the same count.** The `counted` field shows the API's "ไม่มีการเปลี่ยนแปลง". The dialog also shows
   "เดิม n → ใหม่ m (ต่าง ±d)" before saving. Task 3 pins it.
4. **A user with only `consumable:view`.** They see the list and history and no action buttons. A user with `create` but
   not `edit` sees เบิก and รับเข้า only. Task 2 pins it.
5. **Deactivating a kind with stock.** A confirm names the count left. The kind leaves the list, and its history page
   still opens. Task 3/4 pin it.

---

### Task 1: Menu, words, picker mode and the list read

**Files:**
- Modify: `src/components/layout/sidebar.tsx`; `messages/*.json` (`nav.consumables`, the `consumablesPage` namespace,
  the picker reason)
- Modify: `docs/19_THAI_GLOSSARY.md`
- Modify: `src/lib/asset-operation-eligibility.ts`, `src/lib/asset-operation-search-rules.ts`,
  `src/app/api/asset-operations/search/route.ts`
- Modify: `src/lib/consumable-service.ts`. Add
  `listConsumablesWithUsage(db): Promise<Array<{ id, name, unit, minQuantity, onHand, state: ConsumableStockState, issued90: number }>>`
  over active kinds, ordered by name.
  - `issued90` is the sum of `-quantityChange` over the kind's `issue` movements in the last `CONSUMABLE_OFTEN_DAYS`
    days. Use one `groupBy`, not a query per kind.
- Test: `tests/consumables-menu-and-picker.test.ts`; extend `tests/consumable-service.test.ts`

**Words:**
- `nav.consumables`: th "ของใช้สิ้นเปลือง", en "Consumables".
- `consumablesPage.pickerBlocked`: th "เครื่องนี้อยู่ในสถานะที่เบิกของให้ไม่ได้", en "This asset cannot take consumables".
- The rest of `consumablesPage` comes in Tasks 2–4.

- [ ] **Step 1: Write the failing tests:**
  - **Menu:**
    - the sidebar config has the consumables item in `sectionAssets` after `assetRegister`;
    - its permission is `{ module: "consumable", action: "view" }`.
  - **Picker mode `consumable`:**
    - **verdicts:** Ready, In Use, Checked Out and Under Maintenance pass; Disposed, Retired, Lost, Missing and
      Pending Disposal block with the reason key; an inactive asset blocks.
    - **search route permissions:**
      - `mode=consumable` uses `requirePermission(user, "consumable", "create")`;
      - the other modes keep `asset:edit`. Pin both branches.
  - **Glossary:** has the six rows.
  - **`listConsumablesWithUsage`:** sums only `issue` movements inside 90 days. Test with the service's stand-in.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(consumables): the menu item, words, the consumable picker mode and the list read
  (consumables plan 2 task 1)`.

---

### Task 2: The list page

**Files:**
- Create: `src/app/[locale]/(dashboard)/consumables/page.tsx` (server)
- Create: `src/components/consumables/consumables-workspace.tsx` (client: table, phone cards, row menus, and the slots
  where Task 3 mounts the dialogs)
- Test: `tests/consumables-page-ui.test.ts`

**Page:**
- `requirePagePermission(locale, "consumable", "view")`.
- Flags: `canCreate = hasPermission(user, "consumable", "create")`, `canEdit = hasPermission(user, "consumable", "edit")`.
- **Header:** title "ของใช้สิ้นเปลือง", meta "ตู้สำรอง ห้อง IT".
  - Actions "รับเข้า" (outline, `canCreate`) and "เบิกไปใช้" (primary, `canCreate`).
  - On phones the primary moves to the `ActionBar`.
- **Low banner** (`Notice` warning) while any kind is low or out:
  "ต้องซื้อเพิ่ม {count, number} ชนิด: {list}", where list is "name (เหลือ n)" joined with ", ".
- **Table:** ชนิด · คงเหลือ (`num`, right) · ขั้นต่ำ · สถานะ · ใช้ไป 90 วัน · actions.
  - **สถานะ:** `StatusBadge` พอใช้ (success) / ต้องซื้อเพิ่ม (warning) / หมด (danger).
  - **Actions:** "เบิก" when `canCreate`, disabled with the reason "ของหมด" when `onHand === 0`.
  - **⋯ (`RowActions`):**
    - รับเข้า (`canCreate`);
    - ปรับยอดตามที่นับได้ (`canEdit`);
    - ดูประวัติ (always);
    - แก้ชื่อหรือขั้นต่ำ (`canEdit`);
    - ปิดใช้งาน (`canEdit`).
- **"+ เพิ่มชนิดของ"** under the table (`canEdit`).
- **Empty state** (no kinds): "ยังไม่มีชนิดของในตู้". Its action "เพิ่มชนิดของ" needs `canEdit`.
- **Phone:** each kind is a card with the same data. เบิก and ⋯ are on the card.
- **The kind name** links to `/${locale}/consumables/${id}` (Task 4).

**Messages** (`consumablesPage.*`, th; English to match):

| Key | th |
|---|---|
| `title` | ของใช้สิ้นเปลือง |
| `cabinet` | ตู้สำรอง ห้อง IT |
| `receive` | รับเข้า |
| `issue` | เบิกไปใช้ |
| `issueShort` | เบิก |
| `lowBanner` | ต้องซื้อเพิ่ม {count, number} ชนิด: {list} |
| `lowItem` | {name} (เหลือ {onHand, number}) |
| `col_name` | ชนิด |
| `col_onHand` | คงเหลือ |
| `col_min` | ขั้นต่ำ |
| `col_state` | สถานะ |
| `col_used90` | ใช้ไป 90 วัน |
| `state_ok` | พอใช้ |
| `state_low` | ต้องซื้อเพิ่ม |
| `state_out` | หมด |
| `outReason` | ของหมด |
| `menu_receive` | รับเข้า |
| `menu_adjust` | ปรับยอดตามที่นับได้ |
| `menu_history` | ดูประวัติ |
| `menu_edit` | แก้ชื่อหรือขั้นต่ำ |
| `menu_deactivate` | ปิดใช้งาน |
| `addKind` | + เพิ่มชนิดของ |
| `emptyTitle` | ยังไม่มีชนิดของในตู้ |
| `emptyBody` | เพิ่มชนิดของ เช่น เมาส์ คีย์บอร์ด อะแดปเตอร์ แล้วรับเข้าเพื่อเริ่มนับ |

- [ ] **Step 1: Write the failing source pins:**
  - **page:** the gate; the two flags; it calls `listConsumablesWithUsage(prisma)`.
  - **workspace, actions:**
    - the low banner renders only when a kind is low or out;
    - เบิก is disabled with `outReason` when `onHand === 0`;
    - buttons follow the flags.
  - **workspace, layout:**
    - phone cards are `md:hidden` and the table is `hidden md:block` (or the house pattern);
    - the name links to `/consumables/${id}`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(consumables): the list page — counts, states, 90-day use, low banner, row actions
  (consumables plan 2 task 2)`.

---

### Task 3: The dialogs

**Files:**
- Create in `src/components/consumables/`:
  - `consumable-issue-dialog.tsx`;
  - `consumable-receive-dialog.tsx`;
  - `consumable-adjust-dialog.tsx`;
  - `consumable-kind-dialog.tsx` (add and edit);
  - deactivate through the shared `ConfirmDialog`.
- Modify: `consumables-workspace.tsx`, to mount them.
- Test: `tests/consumables-dialogs-ui.test.ts`

**Shared behaviour:**
- AccessibleDialog, FIELD_IDS, client validation, errors under the field, focus on the first error.
- Server `fieldErrors` shown under the matching fields.
- `busy` lock: no close and no second submit while posting.
- Focus returns to the opener.
- On 200: close, a toast, then `router.refresh()`.

**Issue dialog:**
- **Fields:**
  - ชนิด: a `SearchableSelect` of active kinds labelled "name (คงเหลือ n)". Out-of-stock kinds are disabled with the
    reason.
  - จำนวน: a number, default 1, 1–9999.
  - ไปลงเครื่อง: `AssetOperationPicker` with `mode="consumable"`.
  - หมายเหตุ: optional, ≤500 characters.
- **Preview:** "เหลือหลังเบิก: n".
- **Props:**
  - `initialItemId?` (opened from a row);
  - `lockedAsset?: { id, label }`. Plan 3 opens the dialog from a machine with the machine preselected and locked; when
    it is given, the picker is replaced by a read-only line.
- **409 `CONSUMABLE_SHORT`:** under จำนวน show `shortWithCount` ("ของในตู้ไม่พอ เหลือ {onHand, number} {unit}"), then
  refresh.

**Receive dialog:**
- ชนิด (all active kinds).
- จำนวน: 1–9999.
- วันที่รับเข้า: a date input, default today in Bangkok, `max` today.
- หมายเหตุ.

**Adjust dialog:**
- จำนวนที่นับได้: 0–99999, prefilled with the current `onHand`.
- เหตุผล: required, 3–500 characters.
- The live line "เดิม {from, number} → ใหม่ {to, number} (ต่าง {diff})", where `diff` is signed: "+2" or "−1".
- Submit is disabled while `counted === onHand`, with the hint `noChange`.

**Kind dialog:**
- ชื่อ (1–100 characters), หน่วย (1–20, default "ชิ้น"), ขั้นต่ำ (0–99999).
- Add uses POST; edit uses PATCH with all three fields.
- A 400 `fieldErrors.name` shows `consumableNameExists`.

**Deactivate:**
- `ConfirmDialog` "ปิดใช้งาน {name}?".
- Body: "ยังเหลือ {onHand, number} {unit} ในตู้ · ประวัติยังอยู่ครบ", or, when nothing is left, just "ประวัติยังอยู่ครบ".
- Sends PATCH `{ isActive: false }`.

**Messages:** `consumablesPage.*` for every field label, hint, title, submit text, toast, `shortWithCount`, `noChange`,
`adjustLine`, the deactivate title and body, and the receive date hint "วันที่รับของเข้าตู้ ต้องไม่หลังวันนี้".

- [ ] **Step 1: Write the failing pins:**
  - **Requests:**
    - each dialog posts to its route with the exact body keys;
    - the issue picker has `mode="consumable"`;
    - `lockedAsset` replaces the picker.
  - **Responses:** a 409 `CONSUMABLE_SHORT` reads `onHand` and `unit` into `shortWithCount`.
  - **Guards:**
    - the adjust submit is disabled when `counted === onHand`;
    - the receive date has `max` set to today in Bangkok (reuse `getBangkokDateKey`);
    - each dialog passes `busy`.
  - **Deactivate:** sends `{ isActive: false }` only.
  - **Validation guard:** add the dialog forms to `tests/validation-guards.test.ts`'s list, as earlier dialogs did.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(consumables): dialogs for issue, receive, adjust, kinds and deactivate (consumables plan
  2 task 3)`.

---

### Task 4: The kind history page

**Files:**
- Create: `src/app/[locale]/(dashboard)/consumables/[id]/page.tsx`
- Test: `tests/consumables-history-ui.test.ts`

**Page:**
- `consumable:view`.
- **The kind:** read by id. It may be inactive: history stays readable, with a "ปิดใช้งานแล้ว" badge and no action
  buttons.
- **Header:**
  - breadcrumbs ของใช้สิ้นเปลือง › {name};
  - meta "คงเหลือ n {unit} · ขั้นต่ำ m" with the state badge;
  - actions as on the list (เบิก, รับเข้า, ปรับยอด, แก้), gated the same way, reusing Task 3's dialogs;
  - back link to the list.
- **Movements table**, newest first, 50 a page (`?page=`):
  - วันที่ (date and time);
  - รายการ: รับเข้า / เบิก / ปรับยอด;
  - จำนวน: signed, +n or −n;
  - คงเหลือหลัง;
  - เครื่อง (tag + name, a link to the asset) for issues, or the reason for adjusts, or the received date for receipts;
  - หมายเหตุ;
  - โดย: the user's name, resolved like other history pages do (read one).
- **Phone:** cards.
- **No movements:** "ยังไม่มีการเคลื่อนไหว".

- [ ] **Step 1: Write the failing pins:**
  - the gate;
  - inactive kinds render without actions and with the badge;
  - the signed quantity format;
  - the asset link for issue rows;
  - paging by 50;
  - the reason shown for adjust rows.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(consumables): the kind history page (consumables plan 2 task 4)`.

---

### Task 5: E2E `e2e/consumables/consumables.spec.ts`

**Setup:**
- The seed admin holds `consumable:*` through `system_admin`. The suite's IT roles do not; the user grants them later.
- Run this spec as the seed admin, plus one check as IT staff: no menu item, and `/th/consumables` is refused.
- Create a run kind named `<runId> เมาส์ทดสอบ` with min 2.

**Story** (desktop-light and phone-light):
- **Receive:** receive 3 → คงเหลือ 3, พอใช้.
- **Issue:** issue 2 to a run asset through the picker → คงเหลือ 1, and the banner names the kind (ต้องซื้อเพิ่ม).
- **Short:** issue 2 more → the short error under จำนวน reads "ของในตู้ไม่พอ เหลือ 1 ชิ้น".
- **Adjust:** adjust to 4 with a reason → คงเหลือ 4.
- **History:** the kind's history lists receive +3, issue −2 with the asset link, and adjust +3 with the reason.
- **Deactivate:** the confirm names "ยังเหลือ 4 ชิ้น". The kind leaves the list, and its history page still opens.
- **Data:** run-marked only. Do not touch other kinds. No DB writes outside the app.

- [ ] **Step 1: Write the spec and words** (copied from `messages/th.json`).
- [ ] **Step 2: Run** `npm test` (e2e pins).
- [ ] **Step 3: Commit** `test(consumables): E2E for the list, dialogs and history (consumables plan 2 task 5)`.

---

## Controller steps after Task 5 (not for implementers)

- **Build:** `(npx next build || npx next build)`, then probe the dev DB.
- **E2E:** `npx playwright test e2e/consumables e2e/shell e2e/cross-cutting --reporter=line`. The shell spec runs
  because the menu changed; the cross-cutting spec because the picker route changed.
- **Look step:**
  - the list at 1440 light/dark, 1024 and 390 light/dark;
  - each dialog;
  - the history page.
- **Final review:** 3 lenses, then one fix wave.
- **Docs:** changelog, handoff, wiki and memory.
