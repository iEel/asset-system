# ของใช้สิ้นเปลือง plan 3 of 4: the machine's section and the "เครื่องที่เปลี่ยนของบ่อย" report

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- **The machine's page** shows what was replaced on it and when. It says when one kind was replaced unusually often,
  and it lets IT record a replacement from there.
- **The consumables page** has a report that ranks machines by how often their parts were replaced.

**Architecture:**
- **Service reads:** two new reads in `consumable-service.ts`.
- **Asset overview:** gains one panel, shaped like its existing "recent" panel. The panel mounts plan 2's
  `ConsumableIssueDialog` with the machine locked.
- **Report:** a second view on `/consumables`, chosen by `?view=frequent` through `TabNav`.

**Tech Stack:** Next 16, Prisma 7, next-intl, the shared UI kit, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-consumables-design.md` §3 (asset detail, report), §6. User decision
(2026-11-09): this history is IT's. The panel shows only with `consumable:view` (builder-check ruling).

## Global Constraints

**Permissions:**
- The panel and the report need `consumable:view`.
- "+ บันทึกเปลี่ยนของ" needs `consumable:create`.

**Changed often:**
- Flag one kind issued to one machine 2 or more times within 90 days: `consumableOftenChanged` in
  `src/lib/consumable-rules.ts`, `CONSUMABLE_OFTEN_DAYS` / `CONSUMABLE_OFTEN_COUNT`.
- The panel names each such kind: "เครื่องนี้เปลี่ยน{name} {count, number} ครั้งใน 90 วัน".

**The report:**
- **Filters:** ช่วง 30 / 90 / 180 / 365 days (`?days=`, default 90) and ชนิด (all, or one active-or-inactive kind,
  `?item=`).
- **Columns:** เครื่อง (tag + name, a link) · ผู้ถือครอง (or "—") · ครั้งที่เปลี่ยน · ล่าสุด (date + kind).
- **Order:** by count, then by the latest date.
- **Size:** top 100 rows, with a note when more exist.
- **Counting:** each `issue` movement is one time ("ครั้ง"), whatever its quantity.

**Reuse:**
- `ConsumableIssueDialog` from plan 2. Its props are `open`, `items`, `initialItemId?`, `lockedAsset?`,
  `returnFocusRef?` and `onClose`.
- The overview's recent-panel shape: `ContentPanel divided flush`, a desktop `DataTable`, phone `ContentPanelRows`,
  `EmptyNote`.
- `TabNav` and the house filter controls.

**Copy and process:**
- Add messages only through `node scripts/messages-edit.mjs`, in `consumablesPage.*` and a new `assetConsumables.*`.
  ICU plural English, Thai `{x, number}`. Update `tests/i18n-plural-count.test.ts`.
- CRLF-safe pins.
- Never touch `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`,
  `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- No Playwright, build or DB by implementers.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A viewer of the asset without `consumable:view`.** They see no panel. Their page does not even query
   consumables. Task 2 pins it.
2. **A machine with a long history.** The panel shows the latest 10 and a "ดูทั้งหมด n รายการ" link to the report
   filtered to this machine (`?view=frequent&asset=`), which then shows that machine's row. Ruling: no separate
   per-machine movements page. Task 3 pins it.
3. **A disposed machine.** The panel stays readable, and "+ บันทึกเปลี่ยนของ" is hidden. The server would refuse it,
   and the picker is locked anyway. Task 2 pins it.
4. **The report for a kind that was later deactivated.** It still counts, and the kind filter lists inactive kinds
   marked "(ปิดใช้งาน)". Task 1/3 pin it.
5. **Big date windows on the 20,000-asset dev register.** One `groupBy` on (`assetId`) filtered by `type`, date and
   item, then one asset read for the top 100. Never a query per asset. Task 1 pins it.

---

### Task 1: Service reads

**Files:**
- Modify: `src/lib/consumable-service.ts`
- Test: extend `tests/consumable-service.test.ts`

**Interfaces — Produces:**

```ts
export type AssetConsumableIssue = { id: string; performedAt: Date; itemId: string; itemName: string; unit: string; quantity: number; performedByName: string | null; note: string | null }
export async function getAssetConsumableIssues(db, assetId: string, limit: number): Promise<{ issues: AssetConsumableIssue[]; total: number; often: Array<{ itemId: string; itemName: string; count: number }> }>
// `often` uses consumableOftenChanged over this asset's issues in the last CONSUMABLE_OFTEN_DAYS (now = new Date()); actor names as getConsumableHistory resolves them
export type ConsumableFrequentRow = { assetId: string; assetTag: string; assetName: string; holderName: string | null; count: number; latestAt: Date; latestItemName: string }
export async function getConsumableFrequentReport(db, input: { days: 30 | 90 | 180 | 365; itemId?: string | null; assetId?: string | null; now: Date }): Promise<{ rows: ConsumableFrequentRow[]; more: boolean }>
// groupBy assetId over type "issue" in the window (and item when given), order by count desc then max(performedAt) desc, take 101 (more = 101st exists), then one asset read and one latest-movement read for the 100
export const consumableReportDays = [30, 90, 180, 365] as const
export function parseConsumableReportDays(value: string | undefined): 30 | 90 | 180 | 365 // default 90
```

- [ ] **Step 1: Write the failing tests** (with the service's stand-in):
  - **`getAssetConsumableIssues`:**
    - the asset's issues come newest first, limited, with the total;
    - two mouse issues 10 and 60 days ago → `often` has mouse with 2;
    - one at 100 days ago does not count.
  - **`getConsumableFrequentReport`:**
    - **counting:** one row per asset, counting issues not quantity; the window filter; the item filter; the asset
      filter.
    - **order:** count, then the latest date.
    - **more:** `more` is true at 101 assets.
    - **source pin:** `groupBy` with `by: ["assetId"]` and no per-asset loop.
  - **`parseConsumableReportDays`:** `undefined` → 90, `"30"` → 30, `"7"` → 90.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(consumables): reads for a machine's issues and the frequent-replacement report
  (consumables plan 3 task 1)`.

---

### Task 2: The asset overview panel

**Files:**
- Create: `src/components/assets/detail/asset-consumables-panel.tsx` (client: the panel and the dialog mount)
- Modify: `src/components/assets/detail/asset-overview.tsx`. Add a `consumables` prop, and place the panel after the
  recent panel in the same grid column style (`lg:col-span-8`).
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
  - Only with `hasPermission(user, "consumable", "view")`: call `getAssetConsumableIssues(prisma, asset.id, 10)`.
  - With `consumable:create` and an asset that can take consumables (`consumableIssueAssetError` is null): also read the
    active kinds for the dialog (`listConsumablesWithUsage` or a lighter `{ id, name, unit, onHand }` read).
- Test: `tests/asset-consumables-panel-ui.test.ts`

**Panel:**
- **Title:** "ของใช้สิ้นเปลือง".
- **Actions:** "+ บันทึกเปลี่ยนของ" (`canCreate` and the asset eligible), plus "ดูทั้งหมด {total, number} รายการ"
  linking to `/${locale}/consumables?view=frequent&asset=${assetId}` when `total > 10`.
- **Often notice** (`Notice` warning) above the rows when `often` is not empty: one line per kind,
  "เครื่องนี้เปลี่ยน{itemName} {count, number} ครั้งใน 90 วัน".
- **Rows:** วันที่ · ชนิด · จำนวน · โดย, plus หมายเหตุ when present.
- **Empty:** "ยังไม่มีการเปลี่ยนของให้เครื่องนี้".
- **Hidden:** when the viewer lacks `consumable:view`. Also hidden when it would be empty and the viewer lacks
  `consumable:create`.
- **The dialog:** `ConsumableIssueDialog` with `lockedAsset={{ id, label: "{tag} · {name}" }}`. On 200, `router.refresh()`.

**Messages** (`assetConsumables.*`):

| Key | th |
|---|---|
| `title` | ของใช้สิ้นเปลือง |
| `record` | + บันทึกเปลี่ยนของ |
| `all` | ดูทั้งหมด {count, number} รายการ |
| `often` | เครื่องนี้เปลี่ยน{itemName} {count, number} ครั้งใน 90 วัน |
| `col_date` | วันที่ |
| `col_item` | ชนิด |
| `col_qty` | จำนวน |
| `col_by` | โดย |
| `empty` | ยังไม่มีการเปลี่ยนของให้เครื่องนี้ |

- [ ] **Step 1: Write the failing pins:**
  - **Page:** it calls `getAssetConsumableIssues` only inside a `consumable:view` branch; it reads the kinds only when it
    can create and the asset is eligible.
  - **Panel:**
    - the record button follows those flags;
    - the "all" link needs `total > 10`;
    - the often notice shows only when `often` is not empty;
    - the dialog gets `lockedAsset`;
    - phone rows are `md:hidden` and the table `hidden md:block`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`. Also run `tests/asset-detail*.test.ts`, which pins the
  overview's panel order. Update those pins only for the new panel.
- [ ] **Step 5: Commit** `feat(consumables): the machine page shows its replacements, flags frequent ones and records a
  new one (consumables plan 3 task 2)`.

---

### Task 3: The report view on /consumables

**Files:**
- Modify: `src/app/[locale]/(dashboard)/consumables/page.tsx`. It reads `view`, `days`, `item` and `asset`.
- Create: `src/components/consumables/consumables-frequent-report.tsx`
- Modify: `messages/*.json`
- Test: `tests/consumables-report-ui.test.ts`

**View:**
- `TabNav` "รายการ" (`view` absent) and "เครื่องที่เปลี่ยนของบ่อย" (`view=frequent`), keeping the other params.
- **Report view:**
  - **Filters:**
    - ช่วง: four options, GET form or links, as house list filters do;
    - ชนิด: all, plus every kind including inactive ones, labelled with "(ปิดใช้งาน)".
  - **Asset filter:** with `asset` set, a removable chip "เครื่อง {tag}" and the rows of that machine only.
  - **Table and phone cards:** the Global Constraints columns. The tag links to `/assets/${id}`.
  - **More:** "แสดง 100 เครื่องแรก" when `more`.
  - **Empty:** "ไม่มีการเปลี่ยนของในช่วงนี้".
- **List view:** unchanged.

**Messages** (`consumablesPage.*`):
- `tab_list`: รายการ
- `tab_frequent`: เครื่องที่เปลี่ยนของบ่อย
- `filter_days`: ช่วง
- `days_option`: {days, number} วัน
- `filter_item`: ชนิด
- `item_all`: ทุกชนิด
- `item_inactive`: {name} (ปิดใช้งาน)
- `asset_chip`: เครื่อง {tag}
- `col_asset`: เครื่อง
- `col_holder`: ผู้ถือครอง
- `col_count`: ครั้งที่เปลี่ยน
- `col_latest`: ล่าสุด
- `latest_value`: {date} · {item}
- `report_more`: แสดง 100 เครื่องแรก
- `report_empty`: ไม่มีการเปลี่ยนของในช่วงนี้

- [ ] **Step 1: Write the failing pins:**
  - `?view=frequent` renders the report and reads `getConsumableFrequentReport` with the parsed days, item and asset;
  - the tab links keep the params;
  - the asset chip removes `asset` only;
  - inactive kinds are listed with the suffix;
  - the more note shows when `more`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(consumables): the เครื่องที่เปลี่ยนของบ่อย report (consumables plan 3 task 3)`.

---

### Task 4: E2E

**Files:**
- Extend `e2e/consumables/consumables.spec.ts` with a second test, or add `e2e/consumables/consumables-asset.spec.ts`.
  Prefer the new file.
- Update the words file.

**Story** (desktop-light and phone-light; seed admin; run-marked data, kind names per project as plan 2's spec does):
- **Setup:** create a run kind and receive 5.
- **Record from the machine:** open a run asset's page.
  - The panel says "ยังไม่มีการเปลี่ยนของให้เครื่องนี้".
  - "+ บันทึกเปลี่ยนของ" opens the dialog with the machine locked. Issue 1.
  - The panel lists it.
- **Often notice:** issue 1 more through the same panel. The often notice reads "เครื่องนี้เปลี่ยน{kind} 2 ครั้งใน 90 วัน".
- **Report:** `/th/consumables?view=frequent&item=<kind>` lists the asset with 2 and the latest kind.
- **Asset filter:** the asset chip filter shows the same asset only.
- **Without permission:** IT staff, who have no `consumable:view`, open the same asset and see no panel.

- [ ] **Step 1: Write the spec and words.** Copy the Thai from `messages/th.json`, and add the pins.
- [ ] **Step 2: Run** `npm test`.
- [ ] **Step 3: Commit** `test(consumables): E2E for the machine panel and the frequent report (consumables plan 3
  task 4)`.

---

## Controller steps (not for implementers)

- **Build:** `(npx next build || npx next build)`, then probe the DB.
- **E2E:** `npx playwright test e2e/consumables e2e/asset-detail --reporter=line`.
- **Look step:**
  - the asset panel, with and without the notice;
  - the report at 1440 and 390, light and dark.
- **Final review:** 3 lenses, then one fix wave.
- **Docs:** changelog, handoff, wiki and memory.
