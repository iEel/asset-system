> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2a-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** โดยเฉพาะ I15 (มุมโค้งตามต้นแบบจริง: ปุ่ม md/lg และช่องกรอก 8px · ปุ่ม sm, segmented, chip และป้ายสถานะ 6px · เมนู popover toast 12px) และ I14 (สีจางบน primary-soft อนุญาต)

## 9. งานกวาดแบบกลไก (codemod) และ guard

ส่วนนี้เปลี่ยน class ที่เขียนซ้ำทั่วแอปด้วยสคริปต์ 4 ชุด (R1, R7, R2, R3) แต่ละชุดเป็น 1 commit ที่รวมข้อยกเว้นที่ต้องแก้มือ test ที่ต้องแก้ และ guard แบบ ratchet ของตัวเอง ส่วนนี้ไม่จัดหน้าใหม่ ไม่เพิ่มข้อความ และไม่แตะฐานข้อมูล

- ตัวเลขทุกตัวนับใหม่ที่ `081d538` โดยสแกน `src/**/*.{ts,tsx,css}` (ใน `globals.css` ไม่มีจุดที่ตรง)
- จำลองครบทั้ง 4 ชุดใน copy แยกแล้ว และรัน test ทั้งชุด (ข้อ 9.7)
- เลขบรรทัดในส่วนนี้เป็นของ `081d538` สคริปต์ต้องหาตำแหน่งจากข้อความ ห้ามใช้เลขบรรทัด

### 9.0 สรุป

| ชุด | เปลี่ยนอะไร | สคริปต์ | แก้มือ | ทั้ง commit | test ที่พัง | guard ใหม่ |
|---|---|---|---|---|---|---|
| R1 | `border-{tone}/NN` → `border-{tone}-border` และ tint สีสถานะที่เหลือ | 254 จุด · 249 บรรทัด · 71 ไฟล์ | 13 บรรทัด · 10 ไฟล์ | 72 ไฟล์ · 252 บรรทัด | ไม่มี | tone opacity (budget 1) |
| R7 | `bg-muted/NN` และ `bg-accent/NN` ที่ไม่ใช่หัวตาราง + `border-border/60` → token ทึบ | 80 จุด · 75 บรรทัด · 36 ไฟล์ | ไม่มี | 36 ไฟล์ · 75 บรรทัด | `asset-register-ux.test.ts:99` | ห้ามมีนอกหัวตาราง · หัวตาราง ≤ 44 |
| R2 | ลบ `shadow-sm` | 232 จุด · 84 ไฟล์ | 7 บรรทัด · 3 ไฟล์ | 84 ไฟล์ · 236 บรรทัด | `settings-ldap-role-ui.test.ts:20` | shadow (budget 12 จุดใน 10 ไฟล์) |
| R3 | `text-[11px]` / `text-[10px]` → `text-xs` | 10 จุด · 7 ไฟล์ | 3 จุด (อยู่ใน 10 บรรทัดเดิม) | 7 ไฟล์ · 10 บรรทัด | ไม่มี | ห้ามต่ำกว่า 12px นอกป้ายพิมพ์ |

- รวมทั้ง 4 ชุด แตะ 118 ไฟล์ใน `src` (ไม่นับ `globals.css` ซึ่งเป็นของส่วน token)
- test ที่พังมี 2 test เท่านั้น ผลนี้ได้จากการรัน test จริงในข้อ 9.7

### 9.1 ต้องมีก่อน และลำดับ commit

**ต้องมีจากส่วน token ก่อน R7**

| token | ค่า | class ที่ R7 ใช้ | หมายเหตุ |
|---|---|---|---|
| `--row-hover` | #F3F6FB | `bg-row-hover` | ต้นแบบ `--row-hover` (base.css:84) · ทึบ แถบ sticky จึงไม่โปร่งอีก |
| `--border-soft` | #E7EBF1 | `border-border-soft` | ต้นแบบ `--line-soft` · ตรงกับ `border-border/60` บนขาวพอดี |

- ทั้งสองต้องเป็น hex 6 หลักใน `:root` บล็อกแรก และมี `--color-*` ใน `@theme inline` ตามที่ `design-tokens-contrast.test.ts:102-108` บังคับ
- ชื่อในตารางนี้ตาม mockup.md แถว T และ tables.md ถ้าส่วน token ตั้งชื่ออื่น ให้เปลี่ยนเป้าของ R7 ตาม
- **ทดสอบแล้ว: ถ้าไม่มี token สองตัวนี้ Tailwind 4.2.4 จะไม่สร้าง class `bg-row-hover` และ `border-border-soft` เลยโดยไม่แจ้ง error** ผลคือ hover ของแถวหายไปเฉย ๆ guard ของ R7 จึงต้องตรวจด้วยว่า token มีอยู่ (ข้อ 9.6)

**ลำดับ commit ของ 2A:** T (token) → **R1 → R7 → R2 → R3** → งานแก้มือทุกส่วนที่เหลือของ 2A (เมนู ปุ่ม ป้าย crumbs toast หน้าว่าง ช่องกรอก ฯลฯ)

- **codemod ต้องมาก่อนงานแก้มือ** สคริปต์จับข้อความตาม `081d538` และตรวจตัวเองด้วยจำนวนที่คาดไว้ ถ้ามีงานแก้มือลงก่อน จำนวนจะคลาดและสคริปต์จะหยุด
- ไฟล์กลางที่ทั้ง codemod และงานแก้มือของ 2A แตะ มี 11 ไฟล์ (critic §4 · §5 ข้อ 3):
  - `ui/dropdown-menu.tsx` (R1)
  - `ui/file-dropzone.tsx` (R3)
  - `ui/scanner-text-input.tsx` (R1)
  - `ui/clickable-table-row.tsx` (R7)
  - `ui/confirm-text-dialog.tsx` (R7)
  - `ui/operation-review-dialog.tsx` (R7)
  - `ui/page-skeleton.tsx` (R7, R2)
  - `ui/data-freshness-banner.tsx` (R1)
  - `ui/form-context-banner.tsx` (R1)
  - `layout/topbar.tsx` (R3)
  - `layout/global-search.tsx` (R7)
- **R1 กับ R3 จะลงลำดับไหนก็ได้** ส่วน R7 ต้องลงก่อน R2 เพราะงานแก้มือของ R2 (กรอบ segmented ใน `system-settings-form.tsx:2543`) หาข้อความ `bg-background` ที่ R7 เพิ่งเขียน ลำดับนี้ตรงกับที่ sweeps §0 แนะนำ (1 → 7 → 2 → 3)
- **1 ชุด = 1 commit** ใน commit เดียวกันมี: ผลสคริปต์ ข้อยกเว้นที่แก้มือ test ที่พังเพราะชุดนั้น และ guard ของชุดนั้น (หลักเดียวกับเฟส 1 §15 ข้อ 1) ทุก commit จึงผ่าน `npm test` ได้ด้วยตัวเอง
- **สคริปต์อยู่ในโฟลเดอร์ชั่วคราว ไม่ commit เข้า repo** (แบบเฟส 1)
  - ต้องแทนข้อความทั้งไฟล์ โดยใช้ callback ที่ดูบรรทัดของตำแหน่งที่เจอเมื่อต้องข้ามบรรทัด ห้าม split แล้ว join บรรทัดใหม่ เพราะไฟล์ใน repo มีทั้ง CRLF และ LF
  - สคริปต์ที่ใช้จำลองอยู่ที่ `scratchpad/p2a-spec/work09/codemods.mjs` ใช้เป็นต้นแบบได้ (ตัวนั้น split ตามบรรทัด แต่รักษา EOL ไว้ และผล diff ยืนยันแล้วว่า EOL ไม่เปลี่ยน)

### 9.2 R1: ขอบสีสถานะแบบโปร่ง → token ขอบ

**ตอนนี้:** 254 จุด บน 249 บรรทัด ใน 71 ไฟล์ (ไล่ทีละไฟล์ได้ใน sweeps.md ภาคผนวก A)

| opacity | จำนวน | รายละเอียด |
|---|---|---|
| `/30` | 154 | |
| `/40` | 69 | ในนั้นเป็น `hover:border-primary/40` 30 จุด |
| `/20` | 25 | |
| `/25` | 2 | |
| `/50` | 2 | |
| `/15` | 1 | |
| `/60` | 1 | `hover:` |

- ทุกจุดไม่มี prefix หรือมีแค่ `hover:` (31 จุด) ไม่มีจุดที่อยู่หลัง prefix โฟกัส เพราะเฟส 1 ทำไปแล้ว
- ไม่มีรูปแบบ `border-[trblxy]-{tone}/NN`, `divide-*/NN` หรือ `outline-*/NN`

**สคริปต์**

```
/(?<![\w-])((?:[\w\-\[\]=&]+:)*)border-(success|warning|danger|info|primary)\/\d{1,3}(?![\w\/])/g  →  "$1border-$2-border"
```

ผลที่ต้องได้: `total 254 in 71 files`

**แก้มือหลังรันสคริปต์ (13 บรรทัด ใน 10 ไฟล์)**

| # | จุด | หลังสคริปต์ | แก้เป็น | เหตุผล |
|---|---|---|---|---|
| a | `ui/scanner-text-input.tsx:382` (ปุ่มไฟฉายตอนเปิด บนภาพกล้อง) | `border-warning-border bg-warning` | `border-warning bg-warning` | ปุ่มพื้นทึบ ขอบสีอ่อนจะดูเป็นวงขาวรอบปุ่ม |
| b1 | `work-center/page.tsx:678` (แผงที่ขยายอยู่) | `border-primary-border ring-1 ring-primary/20` | `border-primary-border` | `ring-primary/20` ไม่ใช่วงโฟกัส และต้นแบบไม่มีวงซ้อนขอบ |
| b2 | `assets/asset-label-batch-tool.tsx:364` (ชิป) | `ring-1 ring-primary/20` | `ring-1 ring-primary-border` | |
| c1 | `admin/system-settings-form.tsx:1325` (ปุ่มลบ prefix) | `hover:bg-destructive/10` | `hover:bg-danger-soft` | ต้นแบบใช้ `.btn.danger:hover` = bad-soft |
| c2 | `ui/dropdown-menu.tsx:76` | `data-[variant=destructive]:focus:bg-destructive/10` | `data-[variant=destructive]:focus:bg-danger-soft` | ค่าเดียวกับที่ส่วนเมนูจะใช้ (`.menu-item.danger:hover`) ส่วนเมนูยังเป็นเจ้าของบรรทัดนี้ (critic §4) และจะเขียนทับทั้งบรรทัดทีหลัง |
| d | hover 8 จุดที่ไม่มีพื้นเปลี่ยนตอน hover (ดูรายการข้างล่าง) | `hover:border-primary-border` | `hover:border-input` | ดูข้อตัดสินย่อย ข้อ 1 |

hover 8 จุดในข้อ d:
- เปลี่ยนแค่ขอบ 5 จุด:
  - `assets/[id]/page.tsx:2259` และ `:2314` (กรอบรูป)
  - `asset-evidence-drawer.tsx:113` (กรอบรูป)
  - `asset-form.tsx:1372` (กรอบรูป)
  - `checkout-form.tsx:245` (การ์ดตัวเลือกที่ยังไม่ถูกเลือก)
- เปลี่ยนขอบกับสีตัวหนังสือ 3 จุด:
  - `assets/[id]/page.tsx:2283` (ช่องว่างเส้นประสำหรับเพิ่มรูป)
  - `asset-evidence-drawer.tsx:178` และ `asset-movement-timeline.tsx:57` (ปุ่มเล็กสูง `h-8`)
- hover อีก 23 จุดมี `hover:bg-primary-soft` หรือ `hover:bg-accent` อยู่บนบรรทัดเดียวกัน จึงคง `hover:border-primary-border` จากสคริปต์ไว้ (ต้นแบบ `.chip` ใช้ primary-soft คู่กับ primary-line)

**ไม่แก้ใน R1**
- `bg-primary-foreground/20` (`audit/rounds/page.tsx:597`, ตัวนับบนแท็บที่เลือก) ย้ายไปกับ TabNav ใน 2B ระหว่างนี้ใส่ไว้ใน budget ของ guard
- `focus:ring-ring/20` และ `focus:ring-ring/30` 4 จุด (หน้า login และผู้ขาย) คงไว้ตามเฟส 1 §15 ข้อ 2
- R1 เปลี่ยนแค่ token ขอบของกล่อง info ที่ไม่ได้บอกสถานะ (`border-info/30` 14 จุด และ `/20` 2 จุด เป็น `border-info-border`) กล่องจึงยังเป็นสี teal อยู่ การย้ายกล่องเหล่านี้เป็นสีกลางรอ Notice sweep ใน 2D (sweeps §5) ข้อยกเว้นใน `DESIGN.md:195` ยังอยู่จนถึงตอนนั้น

**test:** ไม่มี test ที่ยึด `border-{tone}/NN` · `audit-scan-check-ui.test.ts:50` คาดรูปแบบ `border-warning-border bg-warning-soft` อยู่แล้ว จึงยังผ่าน

### 9.3 R7: พื้นกลางแบบโปร่ง → token ทึบ

**นิยาม R7:** ทุก `bg-muted/NN` และ `bg-accent/NN` ที่ไม่อยู่บนบรรทัด `<thead` หรือ `<th` และ `border-border/60` อีก 1 จุด

- ตอนนี้มี `bg-muted/NN` และ `bg-accent/NN` ทั้งหมด 123 จุด บน 115 บรรทัด ใน 53 ไฟล์
- หัวตารางมี 44 จุด บน 41 บรรทัด ใน 31 ไฟล์ ส่วนนี้ไม่แตะ ย้ายไปกับ DataTable ใน 2B
- **R7 = 79 + 1 = 80 จุด ใน 36 ไฟล์ บน 75 บรรทัด** (critic เรียกว่า "wells, footers and thumbnails (79)")

| กลุ่ม | จุด | ไฟล์ | regex → แทนด้วย | จุดที่เข้ากลุ่ม |
|---|---|---|---|---|
| R7a พื้นกล่อง (well) | 38 | 16 | `/(?<![\w:\-\/])bg-muted\/(?:20\|30\|40\|50)(?![\w\/])/g` → `bg-background` (ข้ามบรรทัดที่มี `<thead` หรือ `<th`) | `system-settings-form.tsx` 18 · `disposal-bulk-approval.tsx` 417, 550, 573 · `disposal-bulk-execution.tsx` 625, 1104, 1219 · `audit/rounds/[id]` 805, 831 · และไฟล์ละ 1 จุด: `access-denied:27`, `assets/[id]:1796`, `audit/findings:576`, `audit/rounds:681`, `disposal/page:438`, `my-assets:177`, `depreciation-policy-builder:345`, `asset-batch-form:806`, `asset-import-preview-panel:313`, `audit-round-form:155`, `disposal-decision-button:181`, `ui/page-skeleton:45` |
| R7a รูปย่อ (thumbnail) | 10 | 4 | regex เดียวกับแถวบน | `assets/[id]` 2261, 2318, 2328 · `asset-attachments` 182, 352, 391, 402 · `asset-evidence-drawer` 116, 126 · `asset-form` 1374 |
| R7a ท้าย dialog | 6 | 6 | regex เดียวกับแถวบน | `ui/confirm-text-dialog:84` · `ui/operation-review-dialog:54` · `transaction-cancel-dialog:154` · `asset-component-manager:576` · `audit-mark-not-found-button:129` · `audit-round-cancel-button:114` |
| R7b ปิดใช้งาน | 1 | 1 | `disabled:bg-muted/40` → `disabled:bg-background` | `disposal-asset-picker.tsx:60` |
| R7c hover ของปุ่มและการ์ด | 5 | 2 | `hover:bg-muted/60` → `hover:bg-accent` · `hover:bg-accent/60` → `hover:bg-accent` (เฉพาะใน `suppliers/[id]/page.tsx`) | `asset-attachments` 182, 352, 391 · `suppliers/[id]` 280, 325 |
| R7d hover ของแถว (ทำหลัง R7c) | 19 | 13 | `/((?:group-)?(?:hover\|focus):)bg-(?:accent\/(?:40\|50\|60)\|muted\/30)(?![\w\/])/g` → `$1bg-row-hover` | `<tr>` 10 จุด (`admin/logs:112`, `admin/roles:205`, `admin/storage` 114, 165, 266, `role-permission-form:225`, `system-settings-form` 1289, 2042, 2074, `asset-import-preview-panel:359`) · `my-assets:132` · `asset-state-review-workspace:211` · `asset-register-mobile-list:49` · `asset-register-table:151` (2 จุด) · `ui/clickable-table-row:56` (2 จุด) · `global-search:202` · `suppliers/[id]:231` |
| R7e เส้นคั่นแถว | 1 | 1 | `border-border/60` → `border-border-soft` | `audit/rounds/page.tsx:743` |

- **ค่าสีแทบไม่เปลี่ยน**
  - บนขาว muted/40 = #F6F8FB เท่ากับ `--background` พอดี
  - muted/20 = #FBFCFD, muted/30 = #F8FAFC, muted/50 = #F4F7FA
  - accent/50 = #F5F8FB ส่วน `--row-hover` = #F3F6FB (ต่างกัน 1.02:1)
- **แก้บั๊กของทะเบียนไปด้วย:** แถบ sticky ของทะเบียน (`asset-register-table.tsx:151`) ตอนนี้โปร่งตอน hover จึงเห็นคอลัมน์ที่เลื่อนอยู่ข้างใต้ หลัง R7 เป็น `group-hover:bg-row-hover group-focus:bg-row-hover` ซึ่งทึบ และเป็นสีเดียวกับแถวที่ใช้ `ClickableTableRow` (`hover:bg-row-hover focus:bg-row-hover`)
- **ส่วนนี้เปลี่ยนแค่สี** งานโครงสร้างของแถวยังเป็นของ tables ใน 2B (critic §4) ได้แก่ `group/row`, ตัวแปร `--row-bg` บน td และการคง `focus-visible:ring-inset` (`asset-register-ux.test.ts:169-174`)

**test ที่ต้องแก้:** `tests/asset-register-ux.test.ts:99`
- เดิม: `assert.match(source, /group-hover:bg-accent\/50/)`
- ใหม่: `assert.match(source, /group-hover:bg-row-hover group-focus:bg-row-hover/)`

test ที่ตรวจแล้วว่าไม่พัง:
- `audit-scan-room-ui.test.ts:58-59` ยึด `bg-accent` ของแถวห้อง ไม่ใช่ R7
- `visual-foundation-guards.test.ts:99` (`bg-canvas/95`)
- `asset-form-sticky-actions.test.ts:13` (`bg-surface/95`)

### 9.4 R2: ลบเงา `shadow-sm` ออกจากแผงและการ์ด

**ตอนนี้:** 238 จุด ใน 88 ไฟล์ ทุกจุดอยู่คนละบรรทัด ไม่มีจุดที่มี prefix และไม่มีจุดที่เป็น class ตัวแรกของ string (ไล่ทีละไฟล์ได้ใน sweeps.md ภาคผนวก B)

| กลุ่ม | จุด | ทำอะไร |
|---|---|---|
| แผง การ์ด section แผงใน skeleton การ์ดที่คลิกได้ การ์ดความสัมพันธ์ที่เลือก (`assets/[id]:2215-2216`) | 230 | ลบ |
| ปุ่ม segmented ที่ถูกเลือก: `audit-scan-room-list.tsx:81` และ `system-settings-form.tsx:2554` | 2 | ลบ แล้วแต่งใหม่ (ดูข้างล่าง) |
| ลอยบนภาพกล้องหรือภาพถ่าย: `scanner-text-input.tsx:349`, `:380` และ `audit-scan-check-form.tsx:323` (ปุ่มลบรูปที่อยู่บนรูปย่อ) | 3 | **คงไว้** |
| ตัวอย่างกระดาษก่อนพิมพ์: `asset-label-print.tsx:308` · `operation-document-print.tsx:97` · `system-settings-form.tsx:2757` (ตัวอย่างป้าย) | 3 | **คงไว้** |

**สคริปต์**

```
/[ \t]?(?<![\w\-:])shadow-sm(?![\w\-])/g  →  ""
```

- ข้ามไฟล์ทั้งไฟล์: `ui/scanner-text-input.tsx`, `audit/audit-scan-check-form.tsx`, `assets/asset-label-print.tsx`, `asset-operations/operation-document-print.tsx`
- ข้ามบรรทัดที่มี `border-slate-300 bg-white text-slate-950 shadow-sm` (ตัวอย่างป้ายใน settings)
- ผลที่ต้องได้: `total 232 in 84 files`
- ตรวจแล้วว่าการลบไม่ทิ้งช่องว่างเกินไว้: บรรทัดที่เป็น `p-4 shadow-sm ${…}` จะเหลือ `p-4 ${…}`

**แก้มือ (7 บรรทัด ใน 3 ไฟล์)**

| จุด | เดิม (หลังสคริปต์) | ใหม่ |
|---|---|---|
| `dashboard/page.tsx:333` (การ์ดลิงก์) | `transition-shadow hover:shadow-md` | `transition-colors hover:bg-background` (ต้นแบบ `a.stat:hover`) |
| `audit-scan-room-list.tsx:72` กรอบ | `flex gap-1 rounded-md bg-muted p-1` | `flex gap-0.5 rounded-md border border-border bg-surface p-0.5` |
| `audit-scan-room-list.tsx:81` ปุ่ม | ปุ่มที่เลือก `bg-surface text-foreground` · ปุ่มอื่น `text-muted-foreground hover:text-foreground` | ปุ่มที่เลือก `bg-primary-soft font-semibold text-primary-hover` · ปุ่มอื่น `text-muted-foreground hover:bg-background hover:text-foreground` (ไฟล์ใช้ `cn` จึงให้ `font-semibold` ชนะ `font-medium` ของ base ได้) |
| `system-settings-form.tsx:2543` กรอบ | `inline-flex rounded-md border border-border bg-background p-1` (หลัง R7) | `inline-flex gap-0.5 rounded-md border border-border bg-surface p-0.5` |
| `system-settings-form.tsx:2552` base ของปุ่ม | `… rounded px-3 text-sm font-medium transition-colors …` | เอา `font-medium` ออกจาก base (ไฟล์นี้ใช้ template string ไม่ใช่ `cn` ถ้า `font-medium` กับ `font-semibold` อยู่ด้วยกัน ลำดับใน CSS จะเป็นตัวตัดสินว่าอันไหนชนะ) |
| `system-settings-form.tsx:2554-2555` ปุ่มที่เลือก / ปุ่มอื่น | `bg-primary text-white` · `text-muted-foreground hover:bg-background hover:text-foreground` | `bg-primary-soft font-semibold text-primary-hover` · `font-medium text-muted-foreground hover:bg-background hover:text-foreground` (ไอคอน `Check` คงไว้) |

- สูตรของปุ่ม segmented ตามต้นแบบ `.seg` (base.css:244-247) ส่วน `min-h-11 … md:min-h-9` คงไว้ เพื่อให้เป้าบนมือถือสูงพอ
- `Segmented` ใน 2B จะรับ markup ทั้งสองจุดนี้ไปโดยใช้ class ชุดเดียวกัน
- `system-settings-form.tsx:947` (`isActive ? "bg-primary text-white"`) เป็นแท็บของหน้าตั้งค่า ไม่มีเงา จึงไม่อยู่ใน R2 แต่ย้ายไปกับ TabNav ใน 2B

**เงาแบบอื่นที่ไม่แตะ** (นับรวมใน budget ของ guard)

| เงา | จุด | เจ้าของ |
|---|---|---|
| `shadow-lg` ปุ่มลอย (FAB) | 2 (`admin/roles/page.tsx:245`, `admin/users/page.tsx:177`) | 2D |
| `shadow-lg` แถบปุ่มบันทึกที่ติดล่าง | 2 (`system-settings-form.tsx:2099`, `asset-form.tsx:1502`) | `StickyFormFooter` ใน 2C · `asset-form-sticky-actions.test.ts:13-14` ยึด `bg-surface/95` และ `backdrop-blur` ไว้ |
| `shadow-lg` แถบคำสั่งกลุ่มของทะเบียนบนมือถือ | 1 (`asset-register-table.tsx:455`) | 2B / เฟส 3 |
| `shadow-md` ปุ่มสแกนวงกลมในแถบล่าง | 1 | คงไว้ตามเฟส 1 §15 ข้อ 6 |

- แผง sticky 4 จุดจะไม่มีเงาอีก แต่ยังมีพื้นและขอบ แบบเดียวกับที่เฟส 1 ทำกับ toolbar ของทะเบียน
  - `asset-component-manager.tsx:248`
  - `audit-scan-check-panel.tsx:38`
  - `brands/page.tsx:232`
  - `asset-label-batch-tool.tsx:504`

**test ที่ต้องแก้:** `tests/settings-ldap-role-ui.test.ts`

| บรรทัด | เดิม | ใหม่ | หมายเหตุ |
|---|---|---|---|
| :20 | `/overflow-visible rounded-lg border border-border bg-surface shadow-sm/` | `/overflow-visible rounded-lg border border-border bg-surface"/` | |
| :21 | `doesNotMatch /overflow-hidden rounded-lg border border-border bg-surface shadow-sm/` | `doesNotMatch /overflow-hidden rounded-lg border border-border bg-surface/` | ไม่พัง แต่ถ้าไม่แก้ หลัง R2 จะผ่านเสมอโดยไม่ได้ตรวจอะไร |

- ส่วน LDAP อยู่ที่ `system-settings-form.tsx:1703` (sweeps เขียนว่า :1007 ซึ่งผิด เพราะ :1007 คือส่วนรูปแบบรหัส)

test ที่ตรวจแล้วว่าไม่พัง:
- `visual-foundation-guards.test.ts:66` (primitive ที่ลอย)
- `visual-foundation-guards.test.ts:97` และ `:110`
- `design-system.test.ts:36`
- `page-loading-skeleton.test.ts`

### 9.5 R3: ตัวอักษรเล็กกว่า 12px

**ตอนนี้:** `text-[11px]` 9 จุด และ `text-[10px]` 1 จุด รวม 10 จุด ใน 7 ไฟล์ของแอป ส่วนป้ายพิมพ์ความร้อน `asset-label-print.tsx:354,357,358` (10px, 6.5px, 7.5px) และ `:355` (13px) คงไว้ เพราะเป็นขนาดจริงบนป้าย

**สคริปต์**

```
/text-\[1[01]px\]/g  →  "text-xs"   (ข้าม src/components/assets/asset-label-print.tsx)
```

ผลที่ต้องได้: `total 10 in 7 files`

| จุด | หลังสคริปต์ | แก้มือ |
|---|---|---|
| `disposal/page.tsx:340` (คำบอกว่าเลื่อนได้) | `text-xs` | ไม่มี |
| `asset-batch-form.tsx:867`, `:871`, `:918`, `:922` (คำอธิบายใต้ช่อง) | `text-xs` | ไม่มี |
| `system-settings-form.tsx:2190` (`truncate`) | `text-xs` | ไม่มี |
| `supplier-list-view.tsx:202` (ป้ายตัวเลข `line-clamp-2`) | `text-xs` | ไม่มี · หน้าไทยได้บรรทัดละ 18px |
| `IntegrationClientManager.tsx:774` | `text-xs leading-4` | ลบ `leading-4` (16px ต่ำกว่า 1.44 × 12 = 17.3px ของไทย) |
| `ui/file-dropzone.tsx:123` | `text-xs leading-4` | ลบ `leading-4` |
| `layout/topbar.tsx:172` (ตัวนับแจ้งเตือนบนพื้นแดงทึบ) | `text-xs font-bold leading-none` | `font-bold` → `font-semibold` · คง `leading-none` (มีแต่ตัวเลข อยู่ในกล่อง `h-5`) |

- **test:** ไม่มี test ที่ยึด 10 จุดนี้
- `visual-foundation-guards.test.ts:112` (แถบล่างไม่มี `text-[11px]`) ยังผ่าน และจะซ้ำกับ guard ใหม่
- `asset-label-print-ui.test.ts:18` ไม่โดนแตะ

### 9.6 Guard แบบ ratchet (`tests/visual-foundation-guards.test.ts`)

**helper ใหม่** ใน `tests/helpers/source-files.ts` เพื่อให้ guard ของส่วนอื่นและ 2D ใช้ร่วมกันได้:

```ts
export function countMatchesByFile(files: SourceFile[], pattern: RegExp, allow?: (path: string) => boolean): Record<string, number>
```

ในไฟล์ guard เพิ่ม:

```ts
function assertWithinBudget(pattern: RegExp, budget: Record<string, number>, allow?: (path: string) => boolean)
```

- ไฟล์ที่ไม่อยู่ใน `budget` มีได้ 0 จุด ไฟล์ที่อยู่มีได้ไม่เกินตัวเลขที่ให้ไว้
- ถ้าเกิน guard จะพังพร้อมรายการ `path: count > budget`
- **budget ใช้ "ไม่เกิน" ไม่ใช่ "เท่ากับ"** เพราะ 2B กับ 2C ทำพร้อมกัน ถ้าบังคับให้เท่ากัน ทั้งสองต้องแก้ allowlist ก้อนเดียวกันและจะชนกันตอนรวม
- เมื่อแหล่งไหนหมดไป ให้ลดตัวเลขลงในงานนั้น ห้ามเพิ่มตัวเลข
- 2D ปิดท้ายด้วยการตั้งทุก budget เป็น `{}`

| test (ชื่อภาษาอังกฤษตามไฟล์เดิม) | regex | budget / ข้อยกเว้นหลัง 2A | ที่ `081d538` |
|---|---|---|---|
| R1 "tone colors never fade with opacity" | `/(?<![\w-])(?:[\w\-\[\]=&\/]+:)*(?:bg\|border\|ring\|text\|divide\|outline\|fill\|stroke\|from\|via\|to\|decoration\|shadow\|accent\|caret\|placeholder)-(?:primary\|success\|warning\|danger\|info\|destructive)(?:-[a-z]+)?\/\d+/g` | `audit/rounds/page.tsx`: 1 (ตัวนับบนแท็บ → TabNav 2B) | 259 จุด ใน 72 ไฟล์ |
| R2 "only floating layers, camera controls and paper previews cast a shadow" | `/(?<![\w-])(?:[\w\-\[\]=&\/]+:)*shadow-(?:sm\|md\|lg\|xl\|2xl)(?![\w-])/g` | `scanner-text-input` 2 · `audit-scan-check-form` 1 · `asset-label-print` 1 · `operation-document-print` 1 · `system-settings-form` 2 (ตัวอย่างป้าย + แถบบันทึก) · `mobile-field-navigation` 1 · `admin/roles/page` 1 · `admin/users/page` 1 · `asset-register-table` 1 · `asset-form` 1 = 12 จุด | 245 จุด ใน 89 ไฟล์ |
| R3 "no text smaller than 12px outside the thermal label" | `/text-\[(?:\d\|1[01])(?:\.\d+)?px\]/g` | `{}` และยกเว้นทั้งไฟล์ `asset-label-print.tsx` (ถาวร) | 10 จุด |
| R7 "neutral fills are opaque tokens outside table headers" | `/(?<![\w-])(?:[\w\-\[\]=&\/]+:)*(?:bg-(?:muted\|accent)\|border-border)\/\d+/g` บนข้อความที่ตัดบรรทัด `/<th(?:ead)?\b/` ออกแล้ว | `[]` · ใน test เดียวกันตรวจว่า `globals.css` มี `--color-row-hover: var(--row-hover);` และ `--color-border-soft: var(--border-soft);` · จำนวนทั้งหมดรวมหัวตารางต้อง ≤ 44 | 80 จุดนอกหัวตาราง (+44 ในหัวตาราง) |

- **guard ของ R7 กรองบรรทัดหัวตารางทิ้งก่อนค้น** ไม่ใช้ lookbehind ยาว `(?<!<th(?:ead)?\b[^<>]*)` เพราะลองแล้วใช้เวลา 5.4 วินาทีกับ 655 ไฟล์ ส่วนวิธีกรองบรรทัดใช้ 41 ms
  - DataTable ใน 2B เอาการกรองนี้ออก และลดตัวเลข 44 ลงจนเป็น 0
- **guard ของ R1 ครอบคลุม guard เดิม** ใน `ui-overlay-guards.test.ts:11-14` และ `:27-29` (`bg-{tone}/NN`, `text-primary/NN`) แต่ส่วนนี้ไม่ลบของเดิม การรวม guard เป็นงานของ 2D
- เพิ่ม guard ใน commit เดียวกับ codemod ของมัน
- ทดลองแล้ว: guard ทั้ง 4 พังที่ `081d538` และผ่านหลังรัน codemod

### 9.7 ตรวจซ้ำ (replay)

**ที่ทำแล้วตอนเขียนส่วนนี้**
- copy `src`, `tests`, `messages`, `public`, `scripts`, `prisma`, `docs` และไฟล์ root ของ `081d538` ไปไว้ใน scratchpad และเชื่อม `node_modules` ด้วย junction โดยไม่แก้ repo
- ผลการรัน:

| ขั้น | ผล |
|---|---|
| ก่อนแก้ | 1618 test · ผ่าน 1617 · ข้าม 1 · พัง 0 |
| เพิ่ม `--row-hover` และ `--border-soft` แล้วรัน R1 → R7 → R2 → R3 พร้อมข้อยกเว้นที่แก้มือ | พัง 2 test พอดี: "asset register desktop table pins the tag and actions columns only" (`asset-register-ux.test.ts:99`, มาจาก R7) และ "LDAP default role setting uses real active roles instead of free text" (`settings-ldap-role-ui.test.ts:20`, มาจาก R2) · `design-tokens-contrast` ยอมรับ token ใหม่ |
| แก้ test 2 จุดตามข้อ 9.3 และ 9.4 แล้วเพิ่ม guard 5 test | 1623 test · ผ่าน 1622 · ข้าม 1 · พัง 0 |
| compile `globals.css` ของ copy ด้วย `@tailwindcss/node` ของ repo | class ใหม่ทุกตัวได้ CSS: `bg-row-hover` (รวม `hover:`, `focus:`, `group-hover:`, `group-focus:`), `border-border-soft`, `hover:border-input`, `ring-primary-border`, `hover:bg-danger-soft`, `data-[variant=destructive]:focus:bg-danger-soft`, `text-primary-hover` · ถ้าเอา token ออก `bg-row-hover` และ `border-border-soft` จะหายไปโดยไม่มี error |

- diff ของ copy ตรงกับตาราง 9.0 ทุกช่อง: จำนวนไฟล์ บรรทัดที่เพิ่มเท่ากับบรรทัดที่ลบ และ EOL ไม่เปลี่ยน
- สคริปต์ที่ใช้จำลองและ guard อยู่ที่ `scratchpad/p2a-spec/work09/` (`codemods.mjs`, `p2a-guards.test.ts`, `tw-probe-09.mjs`)

**ที่ plan ต้องทำทุก commit**
1. รันสคริปต์จากโฟลเดอร์ชั่วคราวที่ root ของ repo ข้อความท้ายต้องตรงกับตาราง 9.0 (`total 254 in 71 files`, `80` ใน 36 ไฟล์ แยกตามกลุ่ม 54/1/5/19/1, `total 232 in 84 files`, `total 10 in 7 files`) ถ้าไม่ตรงให้หยุดและรายงาน ห้าม commit
2. `git diff --stat -- src | tail -1` ต้องได้จำนวนไฟล์ตามตาราง และบรรทัดที่เพิ่มต้องเท่ากับที่ลบ (R1 249 · R7 75 · R2 232 · R3 10) `git diff --ignore-cr-at-eol --stat -- src` ต้องได้ผลเดียวกัน
3. แก้ข้อยกเว้นที่ต้องแก้มือ แล้วใช้ `rg` ตรวจว่าไม่มีจุดเหลือ เช่น R1 ต้องไม่มี `border-(success|warning|danger|info|primary)/\d` เหลือใน `src`
4. เพิ่ม guard แล้วรัน `node --test tests/visual-foundation-guards.test.ts` ต้องผ่าน (ก่อนรันสคริปต์ guard ต้องพังด้วยจำนวนในตาราง 9.6)
5. รัน `npm test` ก่อนแก้ test ต้องพังเฉพาะ test ที่ระบุในข้อ 9.3 และ 9.4 หลังแก้ test แล้วต้องผ่านทั้งหมด
6. หลังลงครบทั้ง 4 ชุด รัน `npm run verify` แล้วเปิดแอป dev ดูภาษาไทยที่ความกว้าง 1440 และ 375 ในหน้าที่ได้รับผลมากที่สุด:
   - ตั้งค่าระบบ (เงา 18 จุดและพื้นกล่อง 18 จุด รวม segmented)
   - รายละเอียดทรัพย์สิน (R1 15 · R2 16 · รูปย่อ)
   - แดชบอร์ด
   - ศูนย์งานค้าง (แผงที่ขยาย)
   - รอบตรวจนับ (segmented ของรายการห้องในหน้าสแกน)
   - ทะเบียน: hover แถวแล้วเลื่อนแนวนอน แถบ sticky ต้องทึบ
   - dialog ยืนยัน (ส่วนท้าย)
   - hover กรอบรูป 8 จุด

### 9.8 ข้อตัดสินย่อย

ตัดสินตามต้นแบบ หรือตามที่ map แนะนำเมื่อต้นแบบไม่ได้ระบุไว้

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | hover 8 จุดที่ไม่มีพื้นเปลี่ยน (R1 d) | `hover:border-input` (#7C8BA0) | ถ้าใช้ `primary-border` ขอบตอน hover จะต่างจากขอบปกติแค่ 1.22:1 ซึ่งอ่อนกว่าตอนนี้ (`primary/40` บนขาวได้ 2.00:1) ส่วน `input` ต่างจากขอบปกติ 2.56:1 และตรงกับต้นแบบ `.btn:hover` ที่ใช้ line-strong · ไม่ใช้ `--control-border` ของ D5 เพราะต่างจากขอบปกติแค่ 1.19:1 · map แนะนำแบบนี้ ต้นแบบไม่มี hover ของกรอบรูป |
| 2 | ปุ่มไฟฉาย (R1 a) | `border-warning` | ขอบทึบบนปุ่มพื้นทึบ |
| 3 | วงที่ไม่ใช่โฟกัส (R1 b) | `work-center:678` ตัด `ring-1 ring-primary/20` ทิ้ง · `asset-label-batch-tool:364` เป็น `ring-primary-border` | ต้นแบบไม่มีวงซ้อนขอบ · สถานะ "ขยายอยู่" ยังเห็นได้จากเนื้อหาที่ขยายออกมา |
| 4 | `dropdown-menu.tsx:76` | แก้ token ตัวเดียวใน R1 ไม่รอส่วนเมนู | guard ของ R1 จะได้ไม่ต้องมีข้อยกเว้นใน `ui/` · ค่าที่ใช้ตรงกับที่ส่วนเมนูจะเขียน และส่วนเมนูยังเป็นเจ้าของบรรทัดนี้ |
| 5 | `bg-primary-foreground/20` และ `bg-white/20` (ตัวนับบนแท็บที่เลือก) | ไม่แก้ใน 2A · ตัวแรกอยู่ใน budget 1 ส่วนตัวหลังไม่ใช่สี tone จึงไม่อยู่ใน guard | ไปกับ TabNav ใน 2B ตาม critic §4 |
| 6 | เงาที่คงไว้ | คง 6 จุด: กล้อง 2 · ปุ่มลบบนรูปย่อ 1 · ตัวอย่างกระดาษ 3 | ลอยอยู่บนภาพจริง หรือจำลองกระดาษ (ต้นแบบ: มีเงาเฉพาะชั้นที่ลอย) |
| 7 | segmented 2 จุด | ลบเงาแล้วแต่งใหม่ตาม `.seg` ใน 2A ไม่ใช่ลบอย่างเดียว | ถ้าเอาเงาออกอย่างเดียว ปุ่มที่เลือกใน `audit-scan-room-list` จะเป็นพื้นขาวบน muted ซึ่งต่างกันแค่ 1.17:1 และเงาคือสิ่งเดียวที่บอกว่าเลือกอยู่ · แบบใหม่ใช้ primary-hover บน primary-soft ได้ 9.14:1 และตัวหนา 600 · `Segmented` ใน 2B ใช้ class ชุดเดียวกัน |
| 8 | `dashboard:333` | `transition-colors hover:bg-background` | ต้นแบบ `a.stat:hover { background: subtle }` |
| 9 | `shadow-lg` 5 จุด และ `shadow-md` 1 จุด | ไม่แตะใน R2 แต่ใส่ใน budget | มีเจ้าของอยู่แล้ว: แถบบันทึก (2C) ที่ยังมี test ยึด · FAB (2D) · แถบคำสั่งกลุ่มของทะเบียน (2B / เฟส 3) · ปุ่มสแกนวงกลม (คงไว้ตามเฟส 1) |
| 10 | ขนาดเป้าหมายของ R3 | `text-xs` (12px ขั้นเล็กสุดของต้นแบบ) ทุกจุด ไม่ใช่ `text-meta` | R3 แค่ยกขนาดขึ้นถึงขั้นต่ำ การเปลี่ยนตามบทบาท (คำอธิบายใต้ช่อง → `text-meta text-faint-foreground` ตามต้นแบบ `.hint`) ทำตอน component เจ้าของมาถึง: `Field` และ `FileDropzone` ใน 2C · `StatStrip` และ `ScrollHint` ใน 2B |
| 11 | ตัวนับแจ้งเตือนบนแถบบน | `text-xs font-semibold leading-none` | ต้นแบบไม่มีตัวนับบนกระดิ่ง จึงใช้ตามที่ map แนะนำ · ตัวขาว 12px บนพื้นแดงทึบอ่านง่ายขึ้นเมื่อหนา 600 (Plex Sans มีน้ำหนัก 600) |
| 12 | `leading-4` 2 จุด | ลบ | 16px ต่ำกว่าเกณฑ์ไทย 17.3px |
| 13 | ขอบเขต R7 | 79 จุดที่ไม่ใช่หัวตาราง + `border-border/60` 1 จุด = 80 | หัวตาราง 44 จุดไปกับ DataTable ใน 2B · `border-border/60` บนขาวได้ #E7EBF1 เท่ากับ `border-soft` พอดี |
| 14 | hover ของแถว | `bg-row-hover` (token ทึบ) ไม่ใช่ `bg-background` | ตรงกับต้นแบบ `--row-hover` · แก้บั๊ก sticky โปร่งได้ทันที · 2B ไม่ต้องเปลี่ยนสีซ้ำ · R7 เปลี่ยนแค่สีของ `ClickableTableRow` และแถบ sticky งานโครงสร้างยังเป็นของ 2B |
| 15 | `suppliers/[id]:231` | จัดเป็นแถว (`bg-row-hover`) ไม่ใช่ hover ของการ์ด | เป็นลิงก์ในรายการ `divide-y` ไม่มีกรอบ · map จัดไว้เป็น control hover · ผล: control hover 5 จุด แถว 19 จุด |
| 16 | พื้นกล่องที่เป็นของงานอื่นด้วย | `page-skeleton:45`, ปุ่มปิดใช้งาน QuickAction `assets/[id]:1796` และกรอบ segmented `settings:2543` เปลี่ยนตาม R7 ไปก่อน | เปลี่ยนแค่สี · `aria-disabled`, `opacity-70` และ `leading-tight` ของ QuickAction เป็นงานของ sweeps §6 ใน 2D · กรอบ segmented เปลี่ยนต่อใน R2 |
| 17 | budget ของ guard | ไม่เกินรายไฟล์ ไม่ใช่เท่ากันพอดี และไม่ใช้เลขบรรทัด | 2B กับ 2C ทำพร้อมกัน · เลขบรรทัดเลื่อนทุกครั้งที่แก้ไฟล์ |
| 18 | guard ของ R2 | ครอบคลุม `shadow-sm` ถึง `shadow-2xl` | กันเงาแบบใหม่ทุกขนาดที่ไม่ใช่ `shadow-overlay` |
| 19 | วิธีข้ามหัวตารางใน guard ของ R7 | กรองบรรทัดทิ้งก่อนค้น | lookbehind ยาวช้า 5.4 วินาที |
| 20 | การแบ่ง commit | 1 ชุด = 1 commit (รวมข้อยกเว้น test และ guard) · ลำดับ R1 → R7 → R2 → R3 · ทุกชุดลงก่อนงานแก้มือของ 2A | ทุก commit ผ่าน test ด้วยตัวเอง · จำนวนที่สคริปต์ใช้ตรวจตัวเองยังตรง |

### 9.9 ไม่อยู่ในส่วนนี้

| เรื่อง | จำนวนที่ `081d538` | ไปที่ |
|---|---|---|
| พื้นหัวตาราง `bg-muted/NN` | 44 จุด ใน 31 ไฟล์ | DataTable (2B) |
| ตัวนับบนแท็บที่เลือก `bg-primary-foreground/20`, `bg-white/20` | 2 | TabNav (2B) |
| พื้นขาวโปร่งบนพื้นสี `bg-surface/NN`, `bg-background/NN` | 10 จุด ใน 8 ไฟล์ (เช่น `assets/[id]:1376`, `checkin-form:363`, `asset-movement-timeline:92`) | 2D · ไม่มี map ไหนนับไว้ |
| `bg-canvas/95` (ขอบจางของแท็บ ที่มี test ยึด) · ภาพกล้อง (`bg-slate-950/*`, `border-white/50`, `bg-white/85`) · `focus:ring-ring/20\|30` | 1 · 12 · 4 | คงไว้ |
| กล่อง info ที่ไม่ได้บอกสถานะ (20 จุด) | | Notice sweep (2D) · R1 เปลี่ยนแค่ token ขอบ |
| `disabled:opacity-*` (147) · ลิงก์แบ่งหน้า `opacity-50` (20) | | Button (ส่วนปุ่มของ 2A) · Pagination (2B) |
| เงาคอลัมน์ปุ่มของทะเบียน `rgb(15_23_42/0.25)` | 1 | raw palette (2D) หรือ tables (2B) |
| ขนาดตามบทบาทของ 10 จุดใน R3 | | 2B / 2C (ข้อตัดสินย่อย ข้อ 10) |

### 9.10 ตัวเลขใน map ที่ผิด

| map | เขียนไว้ | จริง |
|---|---|---|
| sweeps §2 Tests | ส่วน LDAP อยู่ที่ `system-settings-form.tsx:1007` | `:1703` (`:1007` คือส่วนรูปแบบรหัส) |
| sweeps §7 | พื้นกล่องใน `system-settings-form.tsx` 21 จุด | 18 จุด (อีก 3 จุดเป็น hover ของ `<tr>`) |
| sweeps-body §7 | `<tr hover:bg-accent/50>` 11 จุด | 10 จุด (sweeps.md เขียน 10 ถูกแล้ว) |
| sweeps §3 | R3 อยู่ใน 8 ไฟล์ | 7 ไฟล์ของแอป (ไฟล์ที่ 8 คือป้ายพิมพ์ซึ่งคงไว้) |
| sweeps §1 (d) | hover 8 จุด "เปลี่ยนแค่ขอบ" | เปลี่ยนแค่ขอบ 5 จุด อีก 3 จุดเปลี่ยนขอบกับสีตัวหนังสือ · ทั้ง 8 จุดไม่มีพื้นเปลี่ยน |
| critic §7 P2-A | R2 ลบ 230 จุด | สคริปต์ลบ 232 จุด (230 + segmented 2 จุดที่แต่งใหม่ต่อ) · คงไว้ 6 จุด |
| critic G1 และ sweeps §6 Tests | guard ของ StatusBadge อยู่ที่ `visual-foundation-guards.test.ts:141-146` | `:102-107` (ทั้งไฟล์มี 133 บรรทัด) |

### 9.11 ความเสี่ยง

- **class ใหม่หายไปโดยไม่มี error ถ้าไม่มี token** — ป้องกันด้วยลำดับ commit (T ลงก่อน R7) และ guard ของ R7 ที่ตรวจว่ามี `--color-row-hover` และ `--color-border-soft`
- **กล่องมีสีจะดูอ่อนลง** — `/40` 69 จุดจางลงไปเท่ากับ token เช่น warning: ขอบเทียบกับพื้น soft จาก 1.83 เหลือ 1.42:1 ซึ่งตรงกับเจตนาของต้นแบบ
  - เป็นขอบตกแต่ง พื้น soft กับตัวหนังสือยังบอกความหมายอยู่
  - การ์ด 23 จุดที่ hover แล้วขอบจางลง (2.00 → 1.65:1 บนขาว) มีพื้น soft หรือ accent เปลี่ยนตอน hover อยู่แล้ว
- **เงาหายจาก 232 จุด** — เป็นการเปลี่ยนที่เห็นชัดที่สุดของ 2A
  - แผง sticky 4 จุดจะไม่ลอย (ยังมีขอบ)
  - ปุ่มเปิด/ปิดแบบย่อในหน้าตั้งค่าเปลี่ยนจากพื้นน้ำเงินทึบเป็น primary-soft ต้องดูในขั้นตรวจบนแอป dev
- **ไฟล์ซ้อนกันมาก** — codemod แตะ 118 ไฟล์ และ 11 ไฟล์กลางซ้ำกับงานแก้มือของ 2A ถ้าลำดับผิด จำนวนที่สคริปต์ใช้ตรวจตัวเองจะไม่ตรง ให้หยุดตามข้อ 9.7 ขั้น 1
- **budget แบบ "ไม่เกิน" ไม่บังคับให้ลดตัวเลข** — 2D ต้องตั้งเป็น `{}` จริง และเอาการกรองหัวตารางออกเมื่อ DataTable เสร็จ
- **ช่องโหว่ของการกรองบรรทัดใน guard ของ R7** — ถ้าเขียนพื้นกล่องโปร่งบนบรรทัดเดียวกับ `<th` จะหลุด guard ไป ยอมรับได้จนถึง 2B
- **ตัวเลขผูกกับ `081d538`** — ถ้า master เปลี่ยนก่อนเริ่ม 2A ให้นับใหม่ด้วย regex ในส่วนนี้ ก่อนเชื่อตัวเลขในตาราง

**เอกสารที่ต้องแก้พร้อมงานนี้**
- `DESIGN.md:201` เพิ่มกฎ "ขอบใช้ `border-{tone}-border` ห้าม `border-{tone}/NN`"
- `DESIGN.md:261` ลบวงเล็บ "Some … still carry `shadow-sm`" แล้วเขียนข้อยกเว้น 6 จุด และชื่อ guard แทน
- `DESIGN.md:217` เพิ่มว่าตัวอักษรเล็กสุด 12px ยกเว้นป้ายพิมพ์
- อธิบาย token `row-hover` / `border-soft` ในหมวดสี
- `docs/99_CHANGELOG.md`
- ตัวเลขเก่าในเอกสาร ("258", "242 shadow-sm") แก้ตาม critic §3 ข้อ 10
