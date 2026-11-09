# ของใช้สิ้นเปลือง (IT consumables: stock, issue to a machine, restock warning)

**Inputs:**
- Memory of 2026-10-26: the user asked for the feature, to be built last.
- **Order (user, 2026-11-09):** right after ยืนยันผลตรวจ plan 5.
- **Brainstorm 2026-11-09** in chat, with one mockup of four screens.
  - **Accepted:** "ถูกต้องแล้ว เขียนเอกสารออกแบบได้เลย".
  - **Design:** asked whether the design stays the main system's; confirmed it does.
- Calls marked **(my call)** were played back and accepted with the mockup.

**User decisions 2026-11-09:**
- **Why:**
  - The spare cabinet runs out when something is needed, because nobody knows it is time to buy more.
  - IT also wants to see which machine has its peripherals replaced unusually often.
- **Today:** IT takes items from the spare cabinet and records nothing.
- **One cabinet**, in the IT room.
- **Items:** mouse, keyboard, adapter, and others IT may add later.
  - Counted per kind only, with no model or brand.
  - No asset tag, never in audit rounds.
- **Every issue goes to a machine** that has an asset record. Never to a person without a machine.
- **Receiving** records only the quantity and the date received.
- **Warning:** when a kind runs low, warn IT on the notification bell and in the work center (ศูนย์งานค้าง).
- **Count mismatch:** IT counts the cabinet and corrects the number, with a reason.
- **Entry points:** an issue can be recorded from the machine's page or from the consumables page.
- **Users:** only the IT team uses it. No purchasing user.
- **No returns:** an issued item never goes back into the cabinet. The old part is thrown away.
- **Design:** the main system's design (navy shell, shared components, light/dark, phone cards, Thai glossary).

## 1. Goals, non-goals, anti-goals

**Goals:**
- One place that shows how many of each kind are in the cabinet, and which kinds must be bought.
- Recording an issue takes a few seconds, from either the machine or the item.
- A machine's page shows what was replaced on it and when, and says when it is unusually often.
- A report ranks machines by how often their parts were replaced.

**Non-goals:**
- Purchase orders, suppliers, prices or costs.
- Several cabinets or branches.
- Models or brands per kind.
- Returns into the cabinet.
- Issuing to a person.
- Tags, labels and audit rounds.
- Excel import or export, unless a later request asks.

**Anti-goals (a failure even if it works):**
- **Slow to record:** an issue that takes longer than walking to the cabinet. IT will stop recording, and the numbers
  rot.
- **Numbers that can drift:** a stock number that changes without a recorded movement.
- **Mixed with assets:** consumables showing in the asset register, the audit, or depreciation.
- **Nagging:** a warning that repeats every day while IT already knows.

## 2. Data (new tables; a manual migration)

**`consumable_items`:** one row per kind.
- `id`;
- `name`: unique among active items, ≤100 characters;
- `unit`: default `"ชิ้น"`, ≤20 characters;
- `minQuantity`: int ≥0. 0 means no warning;
- `onHand`: int ≥0;
- `isActive`;
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.

**`consumable_movements`:** append-only.
- `id`, `itemId`;
- `type`: `receive`, `issue` or `adjust`;
- `quantityChange`: signed int, never 0. Receive is +n, issue is −n, adjust is the difference;
- `onHandAfter`;
- `assetId`: required for `issue`, null otherwise;
- `receivedDate`: date, required for `receive`;
- `reason`: required for `adjust`, ≤500 characters;
- `note`: optional, ≤500 characters;
- `performedBy`, `performedAt`.
- **Indexes:** (`itemId`, `performedAt`), (`assetId`, `performedAt`).

**Write rules:**
- `onHand` changes only together with a movement, in one transaction.
- An issue is a conditional update (`onHand >= quantity`), and fails with a field error if the stock is short.
- Each write also logs to `system_logs` (module `consumable`).

**Migration:**
- `prisma/manual-migrations/<date>-add-consumables.sql`, idempotent, in the house style (guards, rollback notes).
- It is applied to `asset_management_dev` during the build. Production gets it on deploy day, with approval and the
  full SQL shown.

**Permissions:**
- The migration adds module `consumable` rows (`view`, `create`, `edit`, as the seed's action set).
- **Grants (user, 2026-11-09, option ก):**
  - The migration grants the new rows to `system_admin` only.
  - The admin then ticks them for the IT team's roles on the roles page (group 11).
  - The migration guesses no role names, and adds no grant beyond `system_admin`.
- `prisma/seed.ts` and `src/lib/permission-groups.ts` learn the module, so the roles page shows it in the
  "operations" group.

## 3. Screens (main system design)

**Menu:** ทรัพย์สิน › **ของใช้สิ้นเปลือง**, shown with `consumable:view`. **(my call)**

**List page `/consumables`:**
- **Header:** title, the meta "ตู้สำรอง ห้อง IT", and the actions **รับเข้า** and **เบิกไปใช้** (primary).
- **Banner** while any kind is low: "ต้องซื้อเพิ่ม n ชนิด: …", naming the kinds and their counts.
- **Table:** ชนิด · คงเหลือ · ขั้นต่ำ · สถานะ · ใช้ไป 90 วัน · actions.
  - สถานะ is พอใช้ / ต้องซื้อเพิ่ม (`onHand ≤ minQuantity`, `minQuantity > 0`) / หมด (`onHand = 0`).
  - Actions: เบิก, plus ⋯ with รับเข้า · ปรับยอดตามที่นับได้ · ดูประวัติ · แก้ชื่อหรือขั้นต่ำ · ปิดใช้งาน.
- **"+ เพิ่มชนิดของ"** under the table.
- **Phone:** cards, with the primary action in the phone action bar.
- **Tab "เครื่องที่เปลี่ยนของบ่อย":** the report, see below.

**Dialogs** (AccessibleDialog, errors under the field):
- **เบิกไปใช้:**
  - fields: ชนิด (shows คงเหลือ), จำนวน (default 1), ไปลงเครื่อง (the asset search used elsewhere, by tag, name,
    holder), หมายเหตุ;
  - it shows "เหลือหลังเบิก: n";
  - a kind with 0 cannot be chosen;
  - opened from a machine, the machine is preselected and locked.
- **รับเข้า:** fields ชนิด, จำนวน (≥1), วันที่รับเข้า (default today, Bangkok day, not in the future).
- **ปรับยอดตามที่นับได้:** fields จำนวนที่นับได้ (≥0) and เหตุผล (required). It shows "เดิม n → ใหม่ m (ต่าง ±d)".
- **เพิ่มชนิด / แก้ชื่อหรือขั้นต่ำ:** fields ชื่อ, หน่วย, ขั้นต่ำ. A new kind starts at 0, and stock comes only through
  รับเข้า or ปรับยอด, so every number has a movement.

**Item history:** a panel or page listing movements newest first.
- Columns: วันที่ · รายการ (รับเข้า / เบิก / ปรับยอด) · จำนวน (±) · คงเหลือหลัง · เครื่อง (a link) / เหตุผล · โดย.

**Asset detail:** a section "ของใช้สิ้นเปลือง" on the machine's page, with the house's placement for a secondary
section **(my call)**.
- It lists the issues to this machine (วันที่ · ชนิด · จำนวน · โดย), with **+ บันทึกเปลี่ยนของ** for `consumable:create`.
- **Notice** "เครื่องนี้เปลี่ยน{ชนิด} n ครั้งใน 90 วัน" when one kind was issued to it 2 or more times in 90 days
  **(my call)**.
- **Visibility (my call, builder check):** only with `consumable:view`. Viewers of the asset without it never see IT's
  replacement history.

**Report "เครื่องที่เปลี่ยนของบ่อย":**
- **Filters:** ช่วง (30 / 90 / 180 / 365 days, default 90) and ชนิด (all or one).
- **Columns:** เครื่อง (tag + name, a link) · ผู้ถือครอง · ครั้งที่เปลี่ยน · ล่าสุด (date + kind). Sorted by count,
  then the latest.

## 4. Warning (bell and work center)

**The waiting-work item:**
- Low stock is one waiting-work item in the existing system (`src/lib/waiting-work-rules.ts`,
  `notification-summary-items.ts`, `work-queues.ts`): **"ของใช้สิ้นเปลืองต้องซื้อเพิ่ม n ชนิด"**, linking to
  `/consumables`.
- Access is `consumable:view`.
- It shows while any kind is low, and disappears after a receive or an adjust brings it above the minimum.
- It follows the bell's existing rules. The daily digest counts it like the others. Whether it nags is the existing
  system's behaviour: a count, not a stream of messages.

**Work center (my call, builder check):**
- The item sits with the advance warnings (เตือนล่วงหน้า), like expiries and returns.
- It is **not** counted in งานค้างทั้งหมด or yesterday's comparison.
- It is one line for all low kinds, opening `/consumables` filtered to the low kinds.
- It shows in the team view only. Stock belongs to no person, so it is not in งานของฉัน.
- **Dashboard:** not shown. The user named the bell and the work center only.

## 5. Constraints

**Process:**
- **Stack:** Next 16, next-intl Thai-first, Prisma 7 on SQL Server.
- **Messages** only through `scripts/messages-edit.mjs`, following the glossary. Add glossary rows for the new words:
  ของใช้สิ้นเปลือง, เบิกไปใช้, รับเข้า, ปรับยอด, ขั้นต่ำ, คงเหลือ.

**Separation from assets:**
- Consumables never appear in the asset register, the audit, depreciation, the asset import/export or labels.

**E2E** (dev DB only, run-marked data):
- The spec creates its own kind, named with the run id. It receives, issues to a run asset, adjusts, sees the
  warning, and sees the machine's section and the report.
- It does not touch other kinds.

**Production:** the migration (tables plus permission rows plus role grants) needs approval with the full SQL on
deploy day.

## 6. Review focus

- **Two people issue the last item at once.** One wins, and the other gets "ของไม่พอ" with the current count.
- **An adjust to the same number.** It is refused, or recorded as no change; pick refuse, "ไม่มีการเปลี่ยนแปลง".
- **A kind is deactivated while it has stock.** Allowed, with a confirm. It leaves the list and the warning; its
  history stays.
- **A machine is disposed.** Its history stays readable.
  - The issue search offers active assets whose status is not ตัดจำหน่ายแล้ว, ปลดระวาง, สูญหาย, หาไม่พบ or
    รอตัดจำหน่าย, in any category **(my call, builder check)**.
  - Use a new eligibility mode of `src/components/ui/asset-operation-picker.tsx`.
- **Name clash:** a kind whose name exists among active kinds is refused, case-insensitively.

## 7. Branch (my call, builder check)

- Build on a new branch from master after `feat/inspection-confirm` is merged (the user's go).
- If it is not merged yet when this starts, stack the branch on `feat/inspection-confirm`. Both touch
  `src/lib/work-queues.ts`.

## 8. Left to the builder

- Component reuse, the exact layout of the history (panel or page), and the asset-detail placement, within the house
  rules.
- Exact Thai copy beyond the strings named here, within the glossary.
- **Plan split.** Suggested:
  1. Data, migration, permissions and server rules.
  2. List page with its dialogs and history.
  3. Asset-detail section and the report.
  4. Warning item (bell, work center).
  5. E2E.
