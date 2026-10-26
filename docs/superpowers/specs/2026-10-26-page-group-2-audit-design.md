# Page group 2 (audit): design

**Status:** draft for the user's approval (2026-10-26)
**Base:** `master` at `a81140d5`. Page group 1 (login, dashboard, asset detail) is merged and pushed. Nothing is deployed.
**Order of the remaining work:** this group → the other page groups of the canvas → E2E again → UAT → the one Production deploy (wiki `ams-open-questions` #27).
**Visual source:** the design canvas https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p, boards AU-Rounds, AU-New, AU-Round, AU-Pending, AU-Findings, AU-Scan-Phone and AU-Scan-Record-Phone. Where this document and a board differ, this document wins.
**Recon:** the comparison of each board with today's page is in the session scratchpad: `audit-group/recon.md` (the decisions), `recon-rest.md` (changes, kept features and bugs, with file:line). The category-filter mockup is `.superpowers/brainstorm/50108-1793020947/content/audit-category-filter.html`.

*My call* marks a choice the user did not make. Each one is listed again in §15 for the user to check.

## 1. Intent

An audit round is the yearly (or ad hoc) count of the company's assets.
- **Who does it:** IT staff walk the rooms with a phone. QR labels are not printed yet, so they find each asset by typing its code, name or serial.
- **Who reviews it:** the IT head sits at a computer to follow the round, review what did not match, and close the round. The person who opened a round cannot close it; the user chose to keep this rule.

The canvas B boards rebuild every audit page:
- **Round list:** the rounds list leads with what to do next.
- **Create round:** creation gets a live summary.
- **Round page:** it gets one "next step" card, one result bar and one table that shows what differed.
- **Pending list:** the pending list counts per room.
- **Findings:** the IT head reviews findings in a side panel, one after another.
- **Phone record sheet:** it asks "ตรง / ไม่ตรง" per field.

**The user's own addition:** a category (หมวดหมู่) filter that shows how many of each kind are still left. It goes on the round page and on the phone walk. In the user's words: both "หน้ารอบตรวจและตอนเดินสแกนบนมือถือ".

## 2. Decisions the user made (2026-10-26)

| # | Decision |
|---|---|
| 1 | The next page group is audit (AU-*), as recommended. |
| 2 | **Category filter on the round page (desktop): a chip row under the result tabs.** Each chip shows its count within the result tab in use. The six largest come first, and the rest are under "อื่น ๆ". Choosing one adds a removable "หมวดหมู่: …" chip to the active-filter row. It combines with company, branch and search. |
| 3 | **Category filter on the phone walk: chips that scroll sideways** under the ยังไม่ตรวจ / ตรวจแล้ว / (third tab) switch. Each counts within the chosen room and tab. They clear when the room changes. The row is hidden when the list holds one category or none. Categories are the existing ones, not sub-levels. (Proposed and confirmed: "ถูกต้องแล้ว".) |
| 4 | **No draft rounds.** A new round is open at once, and scanning starts right away ("สร้างแล้วเริ่มตรวจเลย"). |
| 5 | **A reason is required to reject a finding,** for one finding and for several at once (one shared reason). Approving needs none. |
| 6 | **A "ส่วนควบไม่ครบ" filter on the round page** (§8), even though the team has not met the case yet ("ทำไปเลย"). A finding on a component also names its parent (§10). |

## 3. Goals

1. The seven audit pages match their boards in both themes, inside the menu B shell. Every desktop page also works on the phone, and every phone page also works on a wide screen.
2. On the round page and the phone walk, the counts per result, per category and per room add up and equal the rows they open.
3. The IT head can review findings one after another without leaving the page. Every rule that protects the register still holds: the stale-data warning (409), the rule that a reporter cannot review their own finding, the follow-up action plans and closing with evidence.
4. Nothing the audit pages can do today is lost. Appendix A lists what the boards leave out and where each item stays. The list is binding: each plan copies its pages' part of it as a checklist.
5. The known bugs are fixed: the "ปิดรอบตรวจ" button overflows its card, the next-step text in the rounds list is cut ("ต้องพิจารณ…"), and the others in §12.

## 4. Non-goals and anti-goals

- **Non-goals:**
  - No "open" action and no draft step (decision 4).
  - No "แก้ไขรอบ".
  - No sample-rate column on the round. The board's "สุ่ม 20%" has no stored value, and adding one needs a Production migration.
  - No new finding type for components: a missing component stays a "ไม่พบ" of the component itself.
  - No recording of an asset that is not in the register.
  - No scan blocking after the end date.
- **No schema change and no migration** in this group. Old draft rounds are handled in code (§14).
- **Anti-goals:**
  - A board feature that looks finished but has no rule behind it, such as a "เปิดตรวจ" button that does nothing.
  - A silent change to what gets recorded. For example, the phone sheet must never default a different room to "ตรง".
  - Losing the action plans. While any plan is open, the round cannot be closed.

## 5. Rules that bind all seven pages

- **Parts and look:**
  - Build only with the app's shared parts and tokens (DESIGN.md): `PageHeader`, `StatStrip`, `TabNav`, `FilterChipList`, `DataTable`, `StatusBadge`, `ContentPanel`, `DistributionBar`, `PaceBar`, `Segmented`, `SearchableSelect`, `AccessibleDialog`, `ActionBar`, `RowActions`, `StickyFormFooter`, `EmptyNote`, `Notice`, `Nil`.
  - No hex or rgba in tsx, no `dark:`, no `/NN` tints.
  - Status colour appears only where DESIGN.md allows it.
- **Words:**
  - Words follow `docs/19_THAI_GLOSSARY.md`, and messages change only through `node scripts/messages-edit.mjs`.
  - One word for one thing: "รายการไม่ตรง" in sentences, "ไม่ตรง" on short chips, "พบตรง" for the result.
  - No raw code ever reaches the screen. The `wrong_*` and `need_review` results already read "รายการไม่ตรง", from `b50d2521`.
  - "รายงาน Variance" becomes "รายงานผลต่าง".
- **Permissions:**
  - `audit:view` reads every page.
  - `audit:edit` scans and records not-found. Nobody without it sees a scan, record or "เดินตรวจต่อ" control (today the pending page shows them to viewers).
  - Reviewing needs the review permission the API checks today. The close rules stay as they are.
- **Counts equal lists.** Each count is built from the same where as the rows it opens: per result, per category, per room, per finding tab.
- **What a round counts** *(my call, from the builder check)*:
  - An out-of-scope scan creates an `AuditItem` in the round, with `auditResult: "out_of_scope"` (scan route :145-168).
  - The round's own items are its items without that result. Only they count in every total, progress bar, "ตรวจแล้ว x / y", room count, category chip, phone header, and the dashboard's round numbers (`dashboard-overview.ts`). So พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = the total.
  - Out-of-scope finds are counted apart, from those items and not from scan history. They follow the same company, branch, category and search filters as the table.
  - One shared count helper serves the round page, the pending list, the rounds list, the phone walk and the dashboard.
- **Which filters each count follows** *(my call)*:
  - Each chip counts within all the other active filters:
    - the result chips within category, company, branch and search;
    - the category chips within result, company, branch and search;
    - the room chips within search.
  - The result card and the next-step card stay round-wide.
- **Order and pages:** paging and page size stay on every list, because rounds and items grow every year. Every list keeps its empty state and its "ล้างคำค้น".
- **Phone behaviour that stays:**
  - the offline queue (send now, delete, items left by another user on this device);
  - the "บันทึกแล้ว" toast with edit and photo resend;
  - the closed-round notice;
  - the register lookup when a search finds nothing in the round;
  - the sticky search and "แสดงเพิ่ม" past 50;
  - the wide-screen side-by-side layout.
- **Dates:** Bangkok days, with the Buddhist year in Thai.

## 6. รอบตรวจนับ: the rounds list (AU-Rounds)

- **Order:** "งานที่ต้องทำต่อ" (the StatStrip that exists today) comes first, then the rounds table, then the year's coverage. The coverage is folded to one line by default: bar, %, and "ครอบคลุม X จาก Y · ยังไม่อยู่ในรอบใด Z". The breakdown by category and by department opens under "ดูแยกตามหมวดและแผนก". The four coverage numbers move into the open part, and "งานค้างในรอบเปิด" splits into two numbers (bug, §13).
- **Cells:** "เดินตรวจต่อ" says how many open rounds it covers. "รอบที่ปิดได้แล้ว" is grey and is not a link at 0.
- **Tabs:** a `TabNav` of round status: กำลังดำเนินการ / ปิดแล้ว / ยกเลิก / ทั้งหมด. There is no ร่าง tab (decision 4).
  - The work views that the "งานที่ต้องทำต่อ" cells open (รอตรวจ, รอพิจารณา, ปิดรอบได้) stay as URL views and show as a removable chip.
  - "มีรายการไม่ตรง" goes; it mostly duplicates รอพิจารณา. *(my call)*
- **Search:** it moves into the table's top bar ("ค้นหารอบ"). It also finds rounds by the category and department of their scope (bug, §13).
- **Table:**
  - **รอบ:** the name in bold as a link, with the round number under it.
  - **ขอบเขต:** every scope condition the round has, not only company, branch and location (bug, §13), followed by " · N รายการ".
  - **ช่วงวันที่:** the dates, then "เหลือ N วัน" (warning) or "เลยกำหนด N วัน" (danger). These show for open rounds only, are computed when the page is drawn, and never block scanning.
  - **ความคืบหน้า:** a `PaceBar` with "330 / 342 · 96%", or "ยังไม่เริ่ม".
  - **สถานะ:** one badge. A round that is fully scanned but still has pending findings shows "รอพิจารณา". This is computed, never stored. "พร้อมปิดรอบ" stays as a second badge. The closed badge reads "ปิดรอบแล้ว".
  - **ขั้นถัดไป:** the main task as a link on line 1, wrapping, with no fixed 120px cut (bug, §13). The second task, such as "รอพิจารณา 5", in warning text sits on line 2. The out-of-scope link "นอกขอบเขต N" moves here too.
  - The row's ⋯ keeps the rest.
- **"เดินตรวจต่อ (N)":** it opens the scan page for people with `audit:edit`, and the pending list for everyone else (as the strip cell does today).
- **Header:** the line under the title is "N รอบ". The list is not filtered by year; the year shows only on the coverage line.
- **Phone:** the card list stays.

## 7. สร้างรอบตรวจนับ: create a round (AU-New)

- **Header:** a `PageHeader` with the trail "รอบตรวจนับ › สร้างรอบ".
- **The form, in three numbered sections:**
  1. **Name and dates.** The year, start and end sit on one row. The end defaults to one month after the start, with "แก้ได้" (bug: both default to today).
  2. **What to audit.** The eight scope selects become removable condition chips ("สาขา: บางนา ×") with a "+ เพิ่มเงื่อนไข" button that opens a menu of condition types and then a value picker. `SearchableSelect` serves the custodian list.
     - Option labels keep their code ("BN01 - บางนา").
     - Disposed and retired statuses stay hidden unless "รวมที่ตัดจำหน่ายแล้ว" is ticked, and unticking it clears them.
  3. **Advanced options,** folded. When folded it shows what is in use, such as "ตอนนี้: ตรวจทุกชิ้น 100%". It holds the risk groups and the sample rate.
- **The summary panel "ขอบเขตนี้ได้"** sits on the right. On the phone it moves under the form.
  - **Live count:** a big item count that updates by itself, debounced, when a condition changes. This replaces the "ดูตัวอย่าง" button.
  - **Detail lines:** "ตรงเงื่อนไข X · สุ่มได้ Y" when sampling is below 100%. The note on components pulled in, with "มาจากเครื่องแม่ …".
  - **Category breakdown:** the largest categories plus "อื่น ๆ", from the preview API, which now also counts by category with the same helper as §8.
  - **Overlap warning:** "N รายการอยู่ในรอบอื่นที่เปิดอยู่แล้ว (AUD-…)", with a link to that round. It warns and never blocks. *(my call)*
  - **Daily load:** "ต้องตรวจเฉลี่ยวันละ X รายการ ตามช่วงวันที่ตั้งไว้". This replaces the board's invented "150 รายการ/วัน". *(my call)*
  - **Sample link:** "ดูตัวอย่างรายการ" opens today's eight-row sample.
  - **Empty scope:** 0 items is said in the panel and in the footer before the person submits.
- **Footer:** a `StickyFormFooter` reading "จะสร้างรอบ N รายการ", with "ยกเลิก" and "สร้างรอบ". The board's "(ร่าง)" goes (decision 4).
- **No status choice:** the form has none. The create API accepts no `status` from the client and always creates `open` (bug: today it accepts `closed` or `cancelled` at creation and so skips the close rules).

## 8. หน้ารอบตรวจ: the round page (AU-Round), with the category filter

- **Header:**
  - The trail, the title, and under it the status, number, dates, "เหลือ N วัน" and "เปิดโดย <name>". The creator is read from `createdBy`.
  - On the right: "ส่งออก ▾" (Excel ผลตรวจ, PDF, รายงานผลต่าง, each "ตามตัวกรองที่เลือก"), then "อื่น ๆ ▾", which holds "ยกเลิกรอบตรวจ" in place of today's cancel panel.
  - A cancelled round keeps its cancel details (time, by whom, reason).
- **The next-step card "ขั้นถัดไป: …":** three `Steps` replace the four total boxes and the progress bar.
  - **Step 1, เดินตรวจ:** "ตรวจแล้ว x / y · เหลือ z".
  - **Step 2, หัวหน้า IT พิจารณา:** "รอ n · พิจารณาแล้ว m".
  - **Step 3, ปิดรอบ:**
    - It lists the four close conditions the API checks: nothing pending, nothing awaiting review, no open action plan ("แผนแก้ไขค้าง x", linked), and the closer is not the opener.
    - When the viewer opened the round, it says "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด".
    - The "ปิดรอบตรวจ" button lives in this card when step 3 is reached, which fixes the overflow (bug, §13).
  - The main button follows the step: "เดินตรวจต่อ (12)" (scan page with `audit:edit`, pending list without), then "พิจารณา 5 รายการ".
- **The result card:**
  - A `DistributionBar` and five cells: พบตรง / ไม่ตรง / ไม่พบ / รอตรวจ, plus "พบเพิ่มนอกขอบเขต N" written apart.
  - Out-of-scope finds are outside the round's own items (§5 "What a round counts"), so they are not in the equation or the bar. The board's "300 + 18 + 7 + 5 + 12 = 342" cannot hold. *(my call)*
- **The "ไม่ตรงเรื่องอะไร" card** *(my calls, from the builder check)*:
  - **Bars per field:** ที่ตั้ง / แผนก / ผู้ถือครอง / สภาพ. Each bar counts the round's own items that have a pending or approved finding for that field.
  - **Rejected findings do not count,** including the system's own "ยกเลิกเพราะแก้ผลตรวจ".
  - **One item, several fields:** an item wrong in several fields counts under each bar, so the bars can add up to more than ไม่ตรง. When that happens, the card says so in one line: "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง".
  - **Components:** a component confirmed with its parent but with different fields (`actionTaken: "component_confirmed_with_parent_mismatch"`) stays พบตรง. It shows under its field bar, and the table marks it "ส่วนควบ". There is no separate ส่วนควบ bar.
  - **Department findings now count.** Today they fall in no box (bug, §13).
  - Each bar filters the table to that field.
  - "รูปหลักฐาน: มี x จาก y ที่ตรวจแล้ว" counts only scanned items, the same way as the table's photo column (bug, §13).
  - **"เครื่องที่ส่วนควบไม่ครบ N →"** is the last line of the card (decision 6), shown when N > 0. It opens the "ส่วนควบไม่ครบ" filter.
- **The "ส่วนควบไม่ครบ" filter** (decision 6):
  - **What it lists:** the round's own items whose asset is a parent with at least one installed component (an `AssetComponent` link with `status: "installed"`, not removed) that has its own item in this round with the result ไม่พบ. Items marked ไม่พบ, or not found through the component-missing dialog, both count.
  - **The row:** each listed parent shows under its name which components are missing, for example "ไม่พบ: Adapter 65W (GRL-COM-26-0017-01)". The codes link to the components' own items.
  - **In the filter row:** the active filter shows as a removable "ส่วนควบไม่ครบ ✕" chip in the `FilterChipList`, beside company, branch and category.
  - **How it combines:** it follows the same rules as the other filters (§5). It counts within company, branch, category and search, combines with them, and goes into the links, paging and exports. It works on any result tab; from the card it opens with "ทั้งหมด".
  - **URL and count:** the URL value is `components=missing` (the name is left to the plan). The count and the rows come from one where.
  - **Not on other pages:** not on the phone walk or the findings page. A finding on a component names its parent instead (§10).
- **Filters above the table:**
  - **Result chips with counts:** ทั้งหมด / รอตรวจ / พบตรง / ไม่ตรง / ไม่พบ / นอกขอบเขต, plus รอพิจารณา.
    - รอตรวจ (`auditStatus = pending`) is new on this page; the pending page stays for the phone and for room counts.
    - ไม่ตรง is new as one filter over every variance, through the same `isVarianceAuditResult` as the count.
  - **The category chip row** (decision 2):
    - It counts within the result in use, with the six largest and then "อื่น ๆ". It is hidden when there is one category or none.
    - The chosen category shows in the `FilterChipList` with company and branch (which the dashboard links in).
    - `categoryId` joins the result-list state, the links, the paging and the exports.
  - **Search** finds by code, name and room code or name (bug: the box promises rooms today), for the out-of-scope table too.
- **The table:**
  - **Columns:** ผล / ทรัพย์สิน (name, code under it) / สิ่งที่ต่าง ("ตามระบบ → ที่พบ" from the item's findings) / ตรวจโดย + เวลา / รูป / พิจารณา (the finding's review status).
  - **Row extras that stay:** the component badges ("มีส่วนควบ x ชิ้น", "ติดตั้งอยู่ใน …"), the last result-edit box, and "แก้ไขผลตรวจ" (in the row's ⋯).
  - "ไปพิจารณารายการไม่ตรง" follows the field in use. Paging and page size stay.
- **Phone:** item cards and the `ActionBar` stay.

## 9. รายการรอตรวจ: the pending list (AU-Pending)

- **Header:**
  - The title "รายการรอตรวจ N รายการ" and the trail "รอบตรวจนับ › AUD-… › รายการรอตรวจ".
  - Under the title: the round status, its number, "ตรวจแล้ว 330 / 342" and "เหลือ N วัน".
  - "เดินตรวจต่อ (N)" for `audit:edit`. The back target still honours `returnTo` from the scan page.
- **Room chips with counts:** "ทุกห้อง 12 · ห้องบัญชี 4 …", counted by the expected room as the scan page counts. The largest six come first, then "อื่น ๆ". The search sits at the right of that row.
- **Table:**
  - **Columns:** the asset (name, code, custodian) / ที่ตั้งตามระบบ / ตรวจล่าสุด (date).
  - **Expected values:** room and custodian come from the item's expected values, not the asset's current ones (bug: the filter and the rows disagree after a move). The room code stays beside its name.
  - **Empty cells:** "ไม่มีผู้ถือครอง" and "ยังไม่เคยตรวจ".
  - "สแกนรายการนี้" and "บันทึกไม่พบ" show on every row for `audit:edit`, hidden without it (bug). The name opens the asset.
- **"บันทึกไม่พบ":**
  - It stays an `AccessibleDialog` on both screens. *(my call: a side panel has no place on the phone)*
  - It now names the asset (name, code, expected room and custodian).
  - The result line: "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน", with no before/after numbers.
  - "ผู้ตรวจสอบ" becomes "ผู้พิจารณา", after a glossary check.
- **What stays:** the phone cards, paging, and the jump to the last page when the page number is too high.
- **No category filter:** the pending list has none. The room link from the scan page carries the room only. *(my call)*

## 10. รายการไม่ตรง: findings (AU-Findings)

- **Layout:**
  - Desktop has two panes: the table on the left and a review panel (about 420px, a `ContentPanel`) on the right.
  - Clicking a row opens it in the panel. The chosen finding is in the URL (`?finding=<id>`), so back, refresh and a shared link reopen it.
  - The link to the asset moves into the panel.
- **Table:**
  - **Columns:** tick / เรื่อง (a short-word `StatusBadge`: ผู้ถือครอง, ที่ตั้ง, แผนก, สภาพ, ไม่พบ, นอกขอบเขต) / ทรัพย์สิน / ตามระบบ → ที่พบ / รอบ.
  - **A finding on a component** shows the line "ส่วนควบของ <parent code> <parent name>" under the asset, in the table and in the panel, so the IT head knows which machine it belongs to. The parent is read from the component's installed link (decision 6).
  - The chosen row has the selected-row fill. A finding the viewer reported cannot be ticked, and the panel says why.
- **Tabs with counts** *(my calls, from the builder check)*: รอพิจารณา / อนุมัติแล้ว / ปฏิเสธแล้ว / ต้องติดตาม / ปิดแล้ว / ทั้งหมด.
  - "ต้องติดตาม" is the union of today's open follow-ups: `action_open`, `overdue` and `exception`. Each keeps the round scope it has today. Its sub-chips are ต้องแก้ไข / เกินกำหนด / ต้องตรวจสอบพิเศษ.
  - "ปิดแล้ว" (`closed`) is its own tab.
  - The old URL values (`action_open`, `overdue`, `closed`, `exception`) keep working and open the matching tab and sub-chip. So the bell's links and the round page's "แผนแก้ไขค้าง" link keep landing.
  - Today's four-cell StatStrip goes; the tab counts replace it.
- **Filter row:** "รอบ:" and "เรื่อง:" (`FilterSelect`, which also fixes the Thai search for a field), with the search at the end.
- **"ส่งออก ▾":** Excel and PDF together.
- **The panel:**
  - The finding badge, the round number, the asset with "เปิดหน้าทรัพย์สิน".
  - A four-field comparison (ผู้ถือครอง / แผนก / ที่ตั้ง / สภาพ), with mismatched fields marked.
  - The photo and remark, and "ตรวจโดย … · เวลา · ห้อง".
  - **The consequence sentence for that field:** "ถ้าอนุมัติ ทะเบียนจะเปลี่ยน… เป็น …". For ไม่พบ and นอกขอบเขต: "อนุมัติแล้วทะเบียนจะไม่เปลี่ยน ถ้าจะย้ายให้ทำรายการโอนย้าย".
  - The reason box: "เหตุผล (ต้องกรอกเมื่อปฏิเสธ)" (decision 5).
  - "อนุมัติ" and "ปฏิเสธ", with "1 จาก 14".
  - Other pending fields of the same asset are listed, with "อนุมัติทุกช่องของทรัพย์สินนี้", which sends one review per finding. Rows stay one per finding, so counts, paging and exports keep their meaning. *(my call)*
  - The follow-up section stays in the panel: action plan (owner, due date, status) and close with evidence, with the evidence list, the disposal-request link and the freshness banner.
- **Deciding:**
  - Approve or reject in the panel takes effect without a confirm dialog, then moves to the next pending finding on the page, or the next page.
  - A 409 (the asset changed after the report) shows a warning in the panel and needs a second press, as the dialog does today.
- **Several at once:**
  - Header ticks and row ticks, and a sticky bar: "N รายการที่เลือก · ล้าง · ปฏิเสธที่เลือก · อนุมัติที่เลือก N รายการ".
  - This bar is a new shared part, `DesktopSelectionBar` *(name left to the plan within the naming guards)*, with its DESIGN.md section.
  - **Batch results** (bug: today the batch stops at the first failure and does not refresh):
    - The bar reports how many succeeded and how many failed, then refreshes.
    - A 409 inside a batch skips that finding and says to decide it in the panel.
    - Rejecting several asks for one shared reason (decision 5).
- **Reason rule:** the reject reason is enforced by the review API as well, for single and batch, in the validation schema.
- **Phone:** the cards stay. Tapping a card opens the panel full screen.
- **What else stays:** the back link to the round, the empty states, and the page size.

## 11. เดินสแกนบนมือถือ: the phone walk (AU-Scan-Phone), with the category chips

- **Header:** the round code on line 1, its name small on line 2. On the right, "330 / 342" above "ไม่ตรง 18". The back button's name is "กลับไปหน้ารอบ".
- **Room button:** "ห้องนี้ตรวจแล้ว 14 / 18 · เหลือ 4" and "เปลี่ยนห้อง". Today's "ยังไม่ตรวจ 4 / 18" reads backwards (bug, §13).
- **Search:** the existing xl `SearchField`, still sticky.
  - It searches the whole round as today. Items in the chosen room come first, and the line says both, for example `ผลค้นหา "notebook": ในห้องนี้ 2 · ห้องอื่น 1`.
  - There is no "ค้นทั้งรอบ" link. *(my call: a moved asset is what the audit must find)*
  - The 10-result cap gets the true total and "แสดงเพิ่ม" (bug, §13).
  - The switch stays above the results while searching.
- **The switch:** ยังไม่ตรวจ / ตรวจแล้ว / third tab.
  - The third tab is labelled "ทั้งห้อง" when a room is chosen and "ทั้งรอบ" when none is.
  - It always shows a count, as the others do. *(my call: it lists the room, so "ทั้งรอบ" would mislead)*
- **Category chips** (decision 3):
  - They scroll sideways under the switch and count within the chosen room and tab.
  - They clear on a room change, in the scan workspace's room change.
  - They are hidden with one category or none.
  - The page passes the round's categories to the workspace, which it does not do today.
- **Rows:** the name in bold, the code (mono) under it, then the custodian and "ส่วนควบ N" (`componentCount` already exists). Status badges and "ตรวจโดย … เวลา" stay on the ตรวจแล้ว tab.
- **The out-of-scope box:**
  - "เจอของที่ไม่อยู่ในรายการ? บันทึกนอกขอบเขต" is always shown.
  - Tapping it moves to the search with the hint "พิมพ์รหัสหรือ Serial ของที่เจอ แล้วกดค้นทะเบียน".
  - Recording still goes through the register lookup. There is no record for an asset outside the register.
- **Footer link:** "ของในห้องนี้ที่ยังหาไม่เจอ N รายการ →" (or the round-level wording with no room) opens the pending list.
- **What stays:** everything in §5's phone list, plus the room picker's department choice and its clear.

## 12. บันทึกผลตรวจบนมือถือ: the record sheet (AU-Scan-Record-Phone)

- **Sheet title:** the asset name, wrapping (bug: it is cut to one line today). Line 2 is "รหัส · S/N".
- **Each field:**
  - One row holds the field name, the expected value and a `Segmented` "ตรง / ไม่ตรง" (44px, `showCheck`).
  - "ไม่ตรง" opens "ที่พบ: …" as a `SearchableSelect`. The custodian list shows the department after the name.
  - The mismatched row strikes the expected value and gets a soft warning border. The pressed segment keeps the normal selected look, not a solid orange (DESIGN.md colour rule).
- **What "ไม่ตรง" means stays one rule: the chosen value differs.** The server and the findings do not change.
  - **Not chosen yet:** saving with "ไม่ตรง" but no value shows "เลือกค่าที่พบ" under the field and moves focus there.
  - **Same value chosen:** choosing the expected value turns the row back to "ตรง".
  - **Tapping "ตรง":** this resets the value. "ไม่มี / ไม่ระบุ" stays a choosable value.
- **Location:** when the walked room is not the expected room, the location row opens as "ไม่ตรง", with the walked room chosen and the warning border. The person can tap "ตรง". This is today's rule made visible; the board's "ตรง" default would lose wrong-room findings. *(my call)*
- **Department:** choosing a new custodian turns the department row to "ไม่ตรง", with the small line "ตามแผนกของผู้ถือครองที่พบ", unless the person set the department themselves. This keeps rule N-AU1 and its photo requirement visible.
- **Fields that do not apply** are not shown or are read-only (bug: today they can be edited but are never compared): custodian for non-personal assets, location for licences.
- **Hint line:** "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง", on a first scan only. Every other status line stays: "เพิ่งถูกตรวจโดย …", "เคยบันทึกว่าหาไม่พบ…", "กำลังแก้ผล", "ข้อมูลล่าสุด: …", and "ทรัพย์สินนี้เป็นส่วนควบของ …".
- **Component rows:**
  - "พบ" and "ไม่พบ" sit side by side. "ไม่พบ" opens today's missing dialog.
  - The component code, status badge and role or slot line stay. QR scanning moves into the row's ⋯.
  - The counter keeps "ตรวจแล้ว x / y". The confirm when components are unfinished stays.
- **Buttons:**
  - "ถ่ายรูป / เพิ่มหมายเหตุ", with a camera icon.
  - The save label keeps the field names: "บันทึก · ไม่ตรง 1 ข้อ (ผู้ถือครอง)". The edit and out-of-scope labels stay.
- **What stays:** the photo-type select, the pending thumbnails with delete, the photo-required warnings, the approver's "อัปเดตตามที่พบจริง" tick when segregation is off, and the desktop side panel.

## 13. Bugs fixed in this group

1. **Rounds list:** the next-step text is cut ("ต้องพิจารณ…"). The cause is `RowActions`' fixed 120px slot (`row-actions.tsx:59,121`). The rounds list moves to a wrapping next-step column. Any change to `RowActions` itself must not narrow the register.
2. **Round page:** the "ปิดรอบตรวจ" button overflows. The button moves into the next-step card. Also check `ContentPanel`'s actions box (`content-panel.tsx:47`) for the same squeeze elsewhere.
3. **Rounds list:** the scope column ignores department, category, custodian, status and condition scopes, so a category-only round reads "ทั้งหมด".
4. **Rounds list:** the search does not find a round by its scope's category or department.
5. **Rounds list:** "งานค้างในรอบเปิด" adds pending items to pending findings.
6. **Create round:** the API accepts `closed` / `cancelled` at creation.
7. **Create round:** start and end both default to today.
8. **Create round:** draft rounds are invisible on the dashboard and can never be opened (§14).
9. **Round page:** department and component findings fall in no result box, so the numbers do not add up.
10. **Round page:** "ยังไม่มีรูป" counts unscanned items.
11. **Round page:** the search box promises rooms but searches only code and name.
12. **Round page:** "รายงาน Variance" is in English.
13. **Pending list:** the room filter uses the expected room, while the rows and search use the current one.
14. **Pending list:** viewers see scan and not-found buttons that the API refuses.
15. **Pending list:** the not-found dialog does not name the asset.
16. **Pending list:** an unknown `locationId` shows a raw id.
17. **Findings:** a batch stops at the first failure without refreshing or reporting.
18. **Findings:** a 409 inside a batch fails the whole batch.
19. **Findings:** Thai field names do not match the search.
20. **Phone walk:** search results are capped at 10 while the line claims that is all.
21. **Phone walk:** the room button wording reads backwards.
22. **Record sheet:** custodian and location rows can be edited where they are never compared.
23. **Record sheet:** the title is cut to one line.

## 14. Removing the draft step (decision 4)

- **Form and API:**
  - The form has no status choice.
  - The create API ignores any client `status` and creates `open`. The validation schema drops `status` from the create input, or accepts only `open`.
- **Old drafts:**
  - Existing `draft` rounds are treated as open everywhere: the status badge ("เปิดตรวจ"), the dashboard's round counts and current round (`dashboard-overview*.ts`), the rounds-list tabs and work views, the bell and work center if they count rounds, and the scan page (already allowed).
  - No data update is made. Updating Production rows needs per-time approval, and the code reading covers them. *(my call)*
- **Words:** the word "ร่าง" leaves the audit UI. The enum value stays in the schema.

## 15. Calls I made (for the user to check)

- **Rounds list:**
  - The tabs are กำลังดำเนินการ / ปิดแล้ว / ยกเลิก / ทั้งหมด.
  - The work views stay as URL views with a chip, and "มีรายการไม่ตรง" goes.
- **Round page:**
  - "เหลือ / เลยกำหนด N วัน" shows on open rounds only, display-only, with no scan block.
  - Out-of-scope scans stay outside the round's equation and bar: "พบเพิ่มนอกขอบเขต N".
  - The close conditions are listed in full, including action plans and the opener rule.
- **Create round:**
  - An overlap with other open rounds is a warning only.
  - "ต้องตรวจเฉลี่ยวันละ X รายการ" replaces "150 รายการ/วัน".
- **Pending list:**
  - The not-found form stays a dialog, with a sentence about the result and no before/after numbers.
  - It has no category filter.
- **Findings:**
  - One row per finding, with "อนุมัติทุกช่องของทรัพย์สินนี้" in the panel.
  - Missing components are not a new finding type.
- **Phone walk:**
  - Search stays round-wide, with the room first and no "ค้นทั้งรอบ".
  - The third tab reads "ทั้งห้อง" or "ทั้งรอบ" by context.
  - The out-of-scope box goes through the register lookup.
- **Record sheet:**
  - A wrong room opens as "ไม่ตรง".
  - The department follows a new custodian, visibly.
  - "ไม่ตรง" without a value asks for it.
  - The save label keeps the field names.
- **Old drafts** are read as open, with no data update.
- **Out-of-scope items:**
  - They leave every round total and progress bar, including the dashboard's round numbers, and are counted apart.
  - Every chip counts within the other active filters.
- **"ไม่ตรงเรื่องอะไร":**
  - It counts items with a pending or approved finding, per field.
  - An item wrong in several fields counts under each.
  - There is no ส่วนควบ bar.
- **Findings tabs:**
  - ต้องติดตาม = ต้องแก้ไข + เกินกำหนด + ต้องตรวจสอบพิเศษ.
  - ปิดแล้ว is its own tab.
  - The old URL values keep working.
  - The StatStrip goes.
- **Not built:**
  - "เปิดตรวจ", "แก้ไขรอบ", "สุ่ม X%" and the 150-per-day estimate.
- **"ส่วนควบไม่ครบ" (decision 6):**
  - A parent counts when one of its installed components has its own item in the round with the result ไม่พบ. Unscanned components do not count.
  - The filter is on the round page only.

## 16. E2E

- **Data scope:** every step scopes to the run's own records. The dev data grows by about 230 assets per run, so no step relies on a first page or a global count.
- **Sign-in:** any context that signs a user in starts with an empty storage state.
- **What the audit specs (`e2e/audit/*`) cover after this group:**
  - **Rounds list:**
    - the tabs and the work-view chip from a strip cell;
    - "เดินตรวจต่อ" goes to the scan page for IT staff and to the pending list for a viewer;
    - the next-step text is not cut (the accessible name is whole).
  - **Create round:**
    - the live count matches the created round's item count;
    - the round is open at once and scannable;
    - there is no status choice.
  - **Round page:**
    - the result chips' counts equal their rows;
    - the category chip row counts within the result in use, and choosing a category adds its chip and narrows the rows and the Excel export;
    - each "ไม่ตรงเรื่องอะไร" bar's count equals the rows its filter opens;
    - "ปิดรอบตรวจ" sits in the next-step card and is reachable;
    - the opener is told they cannot close;
    - with a test parent and two installed components, one marked ไม่พบ, "ส่วนควบไม่ครบ" lists the parent once, names the missing component, and its count equals its rows.
  - **Findings, components:** the not-found finding of that component shows "ส่วนควบของ <parent>".
  - **Pending list:**
    - room chip counts equal rows;
    - the viewer sees no scan or not-found control;
    - the not-found dialog names the asset.
  - **Findings:**
    - choosing a row opens the panel with `?finding=`;
    - approve moves to the next;
    - reject without a reason is refused in the UI and by the API;
    - a batch reports successes and failures.
  - **Phone walk (phone projects):**
    - the category chips count within room and tab and clear on a room change;
    - search shows the room's items first and offers "แสดงเพิ่ม" past 10;
    - the third tab's label follows the room.
  - **Record sheet:**
    - "ไม่ตรง" without a value asks for it;
    - a wrong room opens as "ไม่ตรง";
    - a new custodian turns the department to "ไม่ตรง".
- **Steps that change with the new markup** are rewritten in the same task as the page. The spec plans list them by file and line.
- **Runs:** the per-plan targeted run is `e2e/audit` + `e2e/smoke` (+ `e2e/dashboard` for the draft change). The whole suite runs once after the last plan, which closes group 2.

## 17. Build order

Four plans, smallest first, each merged after its own unit tests and targeted E2E. Each plan says whether it needs a dry run.

1. **Rounds list + create + draft removal (§6, §7, §14).** These carry the status change that the others read.
2. **Round page + pending list (§8, §9)**, with the category filter on the desktop.
3. **Phone walk + record sheet (§11, §12)**, with the category chips on the phone.
4. **Findings (§10)**, with the new desktop selection bar.

## 18. Left to the builder

- the exact Tailwind classes and token names within DESIGN.md;
- the SQL shape of the per-category and per-room counts;
- the name of the desktop selection bar (within the naming guards);
- how the create preview is debounced;
- the URL names of the round-list views;
- test names and fixtures.

## Appendix A. What the boards leave out, and stays (binding)

Each item below exists today and is not on its board. It stays, in the place this document gives or where the item says; a plan that touches the page copies its list as a checklist. File and line references are from `master` `a81140d5` and only locate the item. Written from the board-by-board comparison (2026-10-26).

### §6 the rounds list (AU-Rounds)

- ลิงก์ "นอกขอบเขต N" ของแต่ละรอบ ที่พาไปดูของที่สแกนเจอแต่ไม่อยู่ในรอบ (page.tsx:808-815) บอร์ดไม่มี ควรเก็บไว้เป็นบรรทัดที่สองของ "ขั้นถัดไป" หรือในเมนู ⋯
- เมนู ⋯ ของแถว (RowActions) ที่รวมงานรองกับ "ดู" ไว้ (page.tsx:537-543, 828-853) บอร์ดเหลือลิงก์เดียวกับข้อความหนึ่งบรรทัด
- ตัวแบ่งหน้าและตัวเลือกจำนวนแถวต่อหน้า (page.tsx:551-571) บอร์ดไม่มี ต้องเก็บไว้เพราะรอบจะเพิ่มขึ้นทุกปี
- การ์ดรอบสำหรับจอโทรศัพท์ (page.tsx:368-446) บอร์ดมีแค่จอคอม ต้องเก็บไว้
- ช่องสรุป 4 ช่องของภาพรวมความครอบคลุม (ทรัพย์สินใช้งาน / ครอบคลุม / ยังไม่ครอบคลุม / งานค้างในรอบเปิด) และแถบแยก ตรวจแล้ว / รอพิจารณา (page.tsx:299-323) บอร์ดเหลือแค่บรรทัดเดียว ควรย้ายไปไว้ในส่วนที่กดขยาย
- ป้าย "พร้อมปิดรอบ" / "รอตรวจ N" ข้างสถานะ (page.tsx:636-656) บอร์ดรวมเป็นป้ายเดียว ป้าย "พร้อมปิดรอบ" ควรแสดงต่อ
- ตัวกรอง "มีรายการไม่ตรง", "รอตรวจ", "รอพิจารณา", "ปิดรอบได้" (ดูข้อที่ต้องตัดสินใจข้อแรก)
- ข้อความเมื่อค้นหาไม่เจอ พร้อมปุ่ม "ล้างคำค้น" (page.tsx:462-466)

### §7 create a round (AU-New)

- ตัวเลือก "เปิดตรวจ" ตอนสร้าง (audit-round-form.tsx:218-221): บอร์ดเหลือแค่ร่าง ต้องตัดสินพร้อมข้อตัดสินใจข้อ 1 ไม่อย่างนั้นจะไม่มีทางได้รอบที่เปิดตรวจเลย
- ตัวเลขแยก 4 ช่อง: ตรงเงื่อนไข / ได้หลังสุ่ม / ส่วนควบที่ดึงเข้ามา / อัตราสุ่ม (audit-round-form.tsx:265-272) บอร์ดมีตัวเลขเดียว (410) ควรเก็บอย่างน้อย "ตรงเงื่อนไข X · สุ่มได้ Y" ไว้ใต้ตัวเลขใหญ่ตอนที่ตั้งสุ่มต่ำกว่า 100%
- ข้อความบอกว่าส่วนควบติดเข้ามากี่ชิ้น (Notice: audit-round-form.tsx:274-276) และบรรทัด "มาจากเครื่องแม่ …" ของแต่ละรายการ (285-289) ถ้าตัดไป ผู้สร้างจะไม่รู้ว่าจำนวนเพิ่มเพราะส่วนควบ
- รายการตัวอย่าง 8 ชิ้นแรก (รหัส + ชื่อ) (audit-round-form.tsx:277-296, preview/route.ts:29-35) ใช้เช็กได้เร็วว่าขอบเขตถูกต้อง ไม่ได้อยู่บนบอร์ด ควรเก็บไว้เป็นลิงก์ "ดูตัวอย่างรายการ" ในแผงสรุป
- ชื่อกลุ่มความเสี่ยงที่ใช้ในผลดูตัวอย่าง (audit-round-form.tsx:273) ถ้าย้ายไปไว้บรรทัดสรุปในส่วนพับขั้น 3 ได้ก็ไม่หาย
- รหัสในชื่อตัวเลือก ("BN01 - บางนา": audit-options.ts:217-222) บนชิปบอร์ดแสดงแค่ชื่อ ถ้าตัดรหัสออก สาขาหรือที่ตั้งที่ชื่อซ้ำกันจะแยกไม่ออก
- การซ่อนสถานะตัดจำหน่าย/ปลดระวางจากตัวเลือกสถานะเมื่อไม่ได้ติ๊กช่องรวม และการล้างค่าเมื่อเอาติ๊กออก (audit-round-form.tsx:121, 138-145) ต้องทำในเมนูชิปใหม่ด้วย
- บอร์ดไม่ได้วาดหน้าจอมือถือ ฟอร์มวันนี้เรียงเป็นคอลัมน์เดียวบนมือถือ (md:grid-cols-2) ฉบับใหม่ต้องให้แผงสรุปลงไปอยู่ใต้ฟอร์ม

### §8 the round page (AU-Round)

- ปุ่ม "แก้ไขผลตรวจ" ในแต่ละแถว (page.tsx:799-806 และบนมือถือ 716-722) บอร์ดไม่มีปุ่มนี้ ต้องเก็บไว้ใน RowActions
- ตัวกรอง "รอพิจารณา" (pending_review, page.tsx:447, 456) บอร์ดมีแค่คอลัมน์พิจารณา ควรใส่เป็นปุ่มกรองหรือให้ขั้น 2 กดมากรองตารางได้
- ตัวกรองบริษัท/สาขาที่แดชบอร์ดลิงก์เข้ามา (page.tsx:379-393; dashboard/page.tsx:170, 309, 340) ต้องเก็บไว้ใน FilterChipList ร่วมกับปุ่มหมวดหมู่
- ป้ายส่วนควบ (มีส่วนควบ x ชิ้น / ติดตั้งอยู่ใน …) กับกล่องประวัติแก้ผลตรวจล่าสุดในแต่ละแถว (page.tsx:764-778)
- ตัวเลขรูปครบ/ไม่ครบตามรายการตรวจของหมวด (page.tsx:597-598) บอร์ดเหลือแค่มีรูป/ไม่มีรูป
- กล่องรอบที่ถูกยกเลิก (เวลา ผู้ยกเลิก เหตุผล, page.tsx:538-550) บอร์ดมีแค่รอบที่กำลังตรวจ
- หน้าจอมือถือ: การ์ดรายการ (page.tsx:657-726) กับแถบปุ่มล่าง ActionBar (page.tsx:526-536) บอร์ดมีแค่จอคอม
- ตัวเลือกจำนวนแถวต่อหน้า (page.tsx:823-824) บอร์ดเหลือ "แสดงทั้งหมด" ควรเก็บ Pagination เดิมไว้
- ปุ่มไปหน้ารายการรอตรวจ /pending (page.tsx:512-515) ถ้าไม่เพิ่มตัวกรอง "รอตรวจ" จะไม่มีทางไปหน้านี้จากคอม
- ปุ่ม "ไปพิจารณารายการไม่ตรง" ตามเรื่องที่กรองอยู่ (page.tsx:428-439, 627-632)

### §9 the pending list (AU-Pending)

- บอร์ดไม่มีหน้าจอบนโทรศัพท์ ตอนนี้บนโทรศัพท์แสดงเป็นการ์ดพร้อมปุ่ม สแกน / ดูทรัพย์สิน / บันทึกไม่พบ (page.tsx:190-218, 303-353) ต้องเก็บไว้ เพราะคนเดินตรวจใช้โทรศัพท์
- บอร์ดไม่มีตัวแบ่งหน้าและตัวเลือกจำนวนแถวต่อหน้า (page.tsx:277-297) และไม่มีการพาไปหน้าสุดท้ายเมื่อเลขหน้าเกิน (page.tsx:141-144) ต้องเก็บไว้ เพราะรอบจริงมีรายการรอตรวจหลายร้อยรายการ
- บอร์ดไม่มีหน้าว่าง ตอนนี้มีข้อความ "ไม่มีรายการรอตรวจคงเหลือ" และ "ไม่พบรายการ…ที่ตรงกับคำค้น" พร้อมปุ่ม "ล้างคำค้น" (page.tsx:154-157, 191-199, 231-242)
- ปุ่มกลับไปหน้าที่มา (returnTo): ถ้ามาจากหน้าสแกน ตอนนี้กดกลับแล้วไปหน้าสแกน (page.tsx:127-128, 164) แต่เส้นทางหน้าในบอร์ดพากลับไปหน้ารอบอย่างเดียว ต้องให้ "เดินตรวจต่อ" หรือปุ่มกลับยังใช้ returnTo
- รหัสห้องและรหัสพนักงานที่แสดงคู่กับชื่อ (page.tsx:355-370) บอร์ดแสดงแค่ชื่อ ถ้าห้องชื่อซ้ำกันข้ามสาขาจะแยกไม่ออก
- เวลาในคอลัมน์ตรวจล่าสุด (formatDateTime, page.tsx:374) บอร์ดแสดงแค่วันที่
- ตอนนี้กดที่ไหนก็ได้ในแถวเพื่อเปิดทรัพย์สิน (ClickableTableRow, page.tsx:245-249) ในบอร์ดต้องกดที่ชื่อ

### §10 findings (AU-Findings)

- การบันทึกแผนแก้ไข (ผู้รับผิดชอบ กำหนดเสร็จ สถานะ) และการปิดงานที่ต้องแนบหลักฐาน (ActionPlanModal / CloseFindingModal ที่ audit-finding-review-actions.tsx:367-611 ซึ่งเปิดจากเมนู ⋯ ในแถว) บอร์ดไม่มีเลย ถ้าหายไปจะปิดรอบไม่ได้ เพราะงานแก้ไขที่ค้างกันการปิดรอบ (audit-rounds/[id]/route.ts:166-181)
- คอลัมน์ผู้รับผิดชอบและกำหนดเสร็จ (page.tsx:528-531) รวมถึงป้ายสถานะหลายป้ายของรายการ ได้แก่ สถานะจัดการ / แผนแก้ไข / รายการตรวจ / ปรับปรุง (page.tsx:252-262)
- แถบตัวเลขสรุป 4 ช่อง คือ รอพิจารณา / ต้องแก้ไข / เกินกำหนด / ปิดแล้ว (page.tsx:289-301)
- ลิงก์ "เปิดคำขอตัดจำหน่าย" จากรายการไม่ตรง (page.tsx:420-427, 482-484)
- รายชื่อไฟล์หลักฐานที่แนบกับรายการ (AuditFindingEvidenceList ที่ page.tsx:515-523)
- แถบเตือนว่าหน้านี้เปิดค้างไว้นาน ควรรีเฟรชก่อนอนุมัติ (DataFreshnessBanner ที่ page.tsx:272-282)
- ปุ่มกลับไปรอบตรวจนับ (PageBackLink ที่ page.tsx:269) และหน้าว่างที่มีปุ่มพากลับไปรอบตรวจ
- การแสดงแบบการ์ดบนจอมือถือ (page.tsx:338-433) บอร์ดมีแต่แบบจอคอม ต้องกำหนดว่าจอแคบจะแสดงอย่างไร เช่น ใช้การ์ดเดิม แล้วกดการ์ดเพื่อเปิดแผงพิจารณาแบบเต็มจอ
- ตัวเลือกจำนวนแถวต่อหน้า (pageSizes ที่ page.tsx:575) บอร์ดมีแค่ปุ่มก่อนหน้า/ถัดไป
- ข้อความบอกเหตุผลเมื่อผู้ใช้เป็นคนรายงานรายการนั้นเอง (page.tsx:416-417) บอร์ดให้ทุกแถวติ๊กได้ ต้องคงไว้ว่าแถวนั้นติ๊กไม่ได้และปุ่มในแผงบอกเหตุผล

### §11 the phone walk (AU-Scan-Phone)

- แถบออฟไลน์และคิวที่รอส่ง (ส่งเดี๋ยวนี้ / ลบ / ของคนอื่นที่ค้างในเครื่อง) ไม่อยู่ในบอร์ด แต่ต้องเก็บไว้ (audit-scan-workspace.tsx:710-718)
- ป้าย "บันทึกแล้ว" ที่มีปุ่มแก้ไขและปุ่มส่งรูปซ้ำ ไม่อยู่ในบอร์ด (audit-scan-workspace.tsx:719-731)
- กล่องแจ้งว่ารอบปิดแล้ว พร้อมปุ่มกลับไปหน้ารอบ ไม่อยู่ในบอร์ด (audit-scan-workspace.tsx:685-697)
- ผลค้นทะเบียนเมื่อไม่พบในรอบ (ค้นทะเบียน / รายการที่ใกล้เคียง / นอกขอบเขต / ไม่พบในทะเบียน / ออฟไลน์) ไม่อยู่ในบอร์ด (audit-scan-lookup-card.tsx)
- ป้ายสถานะในแถว (ตรวจแล้ว / ไม่ตรง / ไม่พบ / นอกขอบเขต / รอส่ง) และบรรทัด "ตรวจโดย ... เวลา" บนแท็บตรวจแล้ว บอร์ดวาดแค่แท็บยังไม่ตรวจ จึงไม่มีให้เห็น (audit-scan-room-list.tsx:100-128)
- ปุ่ม "แสดงเพิ่ม" เมื่อมีของเกิน 50 ชิ้น (audit-scan-room-list.tsx:135-139)
- การเลือกแผนกในห้องและปุ่ม "ล้างห้อง" ในแผ่นเลือกห้อง (audit-scan-room-picker.tsx:96-109,139-141)
- หน้าจอกว้าง (lg ขึ้นไป) ที่มีรายการกับแผงตรวจวางข้างกัน (audit-scan-workspace.tsx:682,773-806) บอร์ดวาดแค่โทรศัพท์ ถ้าสร้างตามบอร์ดอย่างเดียวจะทำให้ส่วนนี้หายไป
- ช่องค้นหาที่ติดอยู่บนจอเมื่อเลื่อนลง (audit-scan-search.tsx:49) บอร์ดไม่ได้แสดงไว้

### §12 the record sheet (AU-Scan-Record-Phone)

- บรรทัดสถานะ "เพิ่งถูกตรวจโดย … · บันทึกตอนนี้จะเป็นการแก้ผล" / "เคยบันทึกว่าหาไม่พบ…" / "ตรวจแล้ว เวลา โดย … · กำลังแก้ผล" (audit-scan-check-form.tsx:273-285) ต้องเก็บไว้ เพราะตรวจกันหลายคนพร้อมกัน
- ป้ายปุ่มตอนกำลังแก้ผล "บันทึกการแก้ไข · …" และแผ่นแบบของนอกขอบเขต "บันทึกนอกขอบเขต" ที่เปิดหมวดรูปไว้ก่อน (audit-scan-check-form.tsx:128,141,288-292) บอร์ดวาดไว้แค่การตรวจครั้งแรก
- บรรทัด "ข้อมูลล่าสุด: …" ที่ขึ้นเมื่อทรัพย์สินถูกย้ายหลังจากเปิดรอบ (audit-scan-check-field.tsx:59-61, audit-scan-session.ts:292-298)
- ช่องติ๊ก "อัปเดตที่ตั้ง/ผู้ถือครองตามที่พบจริง" สำหรับผู้อนุมัติ เมื่อบริษัทปิดการแยกหน้าที่ (audit-scan-check-form.tsx:470-478, scan/route.ts:432-443)
- ช่องเลือก "ประเภทรูป" ตามรายการรูปของหมวดหมู่ (audit-scan-check-form.tsx:389-398)
- ข้อความเตือน "…ต้องแนบรูปก่อนบันทึก" ที่ผูกกับปุ่มบันทึก และรูปย่อของรูปที่รอส่งพร้อมปุ่มลบ (audit-scan-check-form.tsx:411-433,442-446) บอร์ดรวมทั้งหมดไว้ในปุ่มเดียว
- กล่อง "ทรัพย์สินนี้เป็นส่วนควบของ … (…)" (audit-scan-check-form.tsx:336-342)
- ในแถวส่วนควบ: รหัสของชิ้น ป้ายสถานะ บรรทัดหน้าที่/ช่องของชิ้น และเมนู "สแกน QR ส่วนควบ" (audit-scan-panels.tsx:78-84,117-120) ส่วน QR ยังไม่ได้พิมพ์ จะย้ายไปไว้ในเมนู ⋯ ก็ได้ แต่รหัสของชิ้นต้องเก็บไว้ เพราะคนตรวจหาของด้วยการพิมพ์รหัส
- บรรทัดกำลังโหลดส่วนควบ บรรทัด "ส่วนควบตรวจแล้ว x / y" ในแถบล่าง และหน้าต่างถามยืนยันเมื่อบันทึกทั้งที่ส่วนควบยังตรวจไม่ครบ (audit-scan-check-form.tsx:262-269,344-349,447-449)
- แผงด้านข้างบนจอคอมพิวเตอร์ที่ใช้ฟอร์มเดียวกัน (audit-scan-check-panel.tsx:39-56) บอร์ดวาดไว้แค่มือถือ
