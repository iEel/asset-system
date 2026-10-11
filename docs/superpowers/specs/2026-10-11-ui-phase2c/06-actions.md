> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2c-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** (I1–I36) · ตัวเลขและบรรทัดอ้างที่ `master` `5ffee76`

## 6. ปุ่มในฟอร์มและ dialog แถบบันทึก และเมนูล่างบนมือถือ

ส่วนนี้ถือ K7 (ฝั่งปุ่ม) · K8 (แถบบันทึก 2 แถบ) · K13 · K14 · K15 · K22 · K23 · O11 · O18 และกติกาแปลงปุ่มของ 2C ทั้งหมด
- ปุ่มใน Appendix A ของ `p2c-map/actions.md` 152 ปุ่ม · trigger ของ dialog 13 ปุ่ม · ปุ่มในหน้านำเข้าและหน้าเครื่องมือ 11 ปุ่ม · ปุ่มใน `ui/` 2 ปุ่ม
- `StickyFormFooter` (primitive ใหม่) และการใช้ในฟอร์มทรัพย์สินกับฟอร์มตั้งค่า
- route ที่ซ่อนเมนูล่างบนมือถือ (`focusTaskRoutes`)
- `ActionBar` เดียวแทนแถบล่าง 2 ตัว และ padding ของ 4 หน้า

ส่วนนี้ไม่ได้ถือ: โครงส่วนท้าย dialog (`AccessibleDialogFooter`, Cancel ที่รู้ busy, ลำดับปุ่มใน dialog) และปุ่มปิด X เป็นของส่วน dialog (K8 ฝั่ง dialog, K9, K10, K12) · ชุดงาน ประตู deploy และไฟล์ guard เป็นของข้อ 8

ฐาน `master` `5ffee76` · ตรวจซ้ำด้วยสคริปต์ใน `scratchpad/p2c-spec/scripts-06/` (อ่านอย่างเดียว)
- `extract.mjs` parse ทุกไฟล์ด้วย `typescript` ของ repo แล้วหา tag ตาม Appendix A: **152 จาก 152 แถวเปิด tag ที่บอกไว้ตรงบรรทัด** · เก็บ attribute ลูก และกล่องที่ห่อ (`rows.json`, `rows.txt`)
- `table.mjs` + `final.mjs` สร้างตารางข้อ 6.3 · `triggers.md`/`trig.json` และ `extra.md`/`extra.json` คือ trigger 20 ปุ่ม และปุ่มนอก 152 อีก 11 ปุ่ม
- ทุก file:line ในส่วนนี้เปิดดูแล้วที่ HEAD · path สั้นหมายถึง `src/components/…`

### 6.1 ตัวเลขที่ `5ffee76`

| เรื่อง | จำนวน | หมายเหตุ |
|---|---|---|
| ปุ่มใน 152 แถว | `<button>` 130 · `<Link>` 16 · `<a>` 2 · `ActionButton` 2 · `Button` 2 · ใน 46 ไฟล์ | ตรงกับแผนที่ |
| ฝั่งฟอร์ม / ฝั่ง dialog | 108 / 44 | |
| `Loader2` ในปุ่ม 152 | 50 tag ใน 38 ไฟล์ · `disabled` เท่ากับเงื่อนไขของไอคอนหมุนพอดี **32** · ต้องแยกเงื่อนไข **18** | ตรงกับแผนที่ (17 + `submitDisabled` 1) |
| ปุ่มที่ได้ `busy` ในส่วนนี้ | **61** = 50 + 3 ใน 152 ที่ไม่มี `Loader2` (#4, #5, #74) + trigger 3 + ปุ่มนอก 152 อีก 3 + `ui/` 2 | ข้อ 6.5 |
| สลับป้ายตอน busy (K13) | **10** (ใน 152 มี 7 · นอก 152 มี 3) | แผนที่และ K13 นับไว้ 4 |
| `disabled:opacity-*` บนปุ่มที่แปลง | 84 ใน 152 (เขียนตรง 79 + ผ่านค่าคงที่ 2 ตัว 5) · trigger 4 · ปุ่มนอก 152 5 | `-50` ×77 · `-60` ×4 · `-40` ×2 · `-70` ×1 |
| ความสูงตอนนี้ (มือถือ/จอใหญ่) | 44/44 ×55 · 40/40 ×40 · 44/40 ×31 · 36/36 ×14 · 44/32 ×4 · 32/32 ×4 · 44/36 ×2 · 48/48 ×1 · ไม่มีความสูง ×1 | 34 ปุ่มสลับความสูงที่ `sm:` |
| trigger ของ dialog ในไฟล์ที่ 2C เปิด | 20 → 2C แปลง **13** · เป็นของ 2B **7** (O1, O4, O21) | ข้อ 6.4.1 |

ที่แผนที่ต้องแก้:
- K13 มีจุดสลับป้าย 10 จุด ไม่ใช่ 4 (เพิ่ม `checkin-form.tsx:389`, `asset-batch-form.tsx:802`, `asset-component-manager.tsx:405`, `asset-status-correction-button.tsx:96`, `asset-import-preview-panel.tsx:216`, `asset-label-print.tsx:261`)
- ความกว้าง sidebar ตอนพับอยู่ที่ `layout/sidebar.tsx:292` (critic เขียน :291)
- แถบ `fixed` ของฟอร์มทรัพย์สินคือ `asset-form.tsx:1501-1517` (ข้อ 8.6 เขียน :1501-1516 · `</div>` ตัวนอกอยู่ที่ :1517)
- `/disposal/batches` (หน้ารายการชุดตัดจำหน่าย) เป็นโหมด focus โดยบังเอิญ เพราะ `[^/]+` ใน `mobile-field-navigation.ts:23` จับคำว่า `batches` (แผนที่ไม่ได้บอก) · ข้อ 6.9

### 6.2 กติกาแปลง

#### 6.2.1 ใช้อะไรแทน

| เดิม | ใหม่ |
|---|---|
| `<button className="…">` | `<Button variant=… size=… className="<layout>">` จาก `@/components/ui/button` · คง `type`, `onClick`, `ref`, `title`, `aria-*` เดิม |
| `<Link className="…">` / `<a className="…">` | `className={cn(buttonVariants({ variant, size }), "<layout>")}` หรือ `className={buttonVariants({ variant })}` ถ้าไม่มี layout · **ไม่ใช้ `asChild`** (ข้อตัดสินย่อย 4) |
| `ActionButton` (`admin/asset-state-review-dialog.tsx:100-101`) | `Button` · secondary → `outline` · primary → `default` · danger → `destructive` |
| `Button` ที่มีอยู่แล้ว (`audit/audit-scan-check-form.tsx:342`, `:361`) | ไม่เปลี่ยน variant หรือ className · `:342` ได้ `busy` |
| ค่าคงที่ class `compactButtonClassName` (`admin/depreciation-policy-builder.tsx:332`) · `secondaryButton` (`maintenance/repair-record-actions.tsx:21`) | ลบทิ้งเมื่อผู้ใช้ทุกตัวแปลงแล้ว (3 ปุ่ม และ 3 ปุ่มรวม trigger `:103`) |

#### 6.2.2 variant

| ลักษณะเดิม | variant | ใน 152 |
|---|---|---|
| พื้น `bg-primary` + `text-white` / `text-primary-foreground` | `default` | 46 |
| ขอบเทา `border border-border` (พื้น `bg-surface`, `bg-background` หรือไม่มีพื้น) รวม Cancel ที่ไม่มี hover 3 ปุ่ม (#75, #77, #79) | `outline` | 70 |
| ปุ่มล้างลายเซ็น (#38) | `ghost` (K25 · ย้ายลงใต้ canvas ตามส่วนที่ถือ K25) | 1 |
| ไอคอนขอบเทา (`text-muted-foreground`, hover เทา) | `outline` | 6 |
| ไอคอนลบที่**กลางตอนปกติ** แดงแค่ตอน hover (#19, #45, #46, #69, #142) | `outline` (K22) · ไม่ใส่สีแดงทับ | 5 |
| ขอบหรือตัวหนังสือแดงที่วางในหน้า (#9, #109, #138) · ไอคอนแดงตั้งแต่ปกติ (#63, #65, #96, #122, #126) | `danger` | 8 |
| แดงทึบที่เป็นปุ่มยืนยันใน dialog (#40, #60, #84, #117) | `destructive` | 4 |
| ส้มทึบ `bg-warning` (#82, #91) | `warning` (K22) | 2 |
| พื้น `warning-soft` (#34) · ขอบเขียว (#53) · outline ตัวหนังสือ primary (#99) · `ActionButton` secondary (#3) | `outline` (ย16/ย17 ของ 2A) | 4 |
| เลือกตามเงื่อนไข (#4, #76) | `variant={… ? "destructive" : "default"}` | 2 |
| `Button` เดิม (#88, #89) | คงเดิม | 2 |
| dialog ลบไฟล์แนบงานซ่อม (#111, #112) | ไม่แปลง · ชุด 5 เปลี่ยน dialog ทั้งตัวเป็น `useConfirm` (K12) | 2 |

ปุ่มยืนยันที่ย้อนกลับไม่ได้แต่ไม่ใช่การลบ (`disposal-bulk-execution.tsx:959`, `disposal-execution-button.tsx:237`, `disposal-bulk-approval.tsx:559`) คง `default` ตาม D6 ของ 2A

#### 6.2.3 size (K7)

ดูความสูงบนจอใหญ่ตอนนี้ ความสูงบนมือถือทุกปุ่มเป็นอย่างน้อย 44 อยู่แล้วจาก `Button`

| ตอนนี้ (มือถือ/จอใหญ่) | ปุ่มข้อความ | ปุ่มไอคอนอย่างเดียว |
|---|---|---|
| 44/44 | ไม่ระบุ (`default`) ×52 (ไม่นับ #111, #112) · จอใหญ่ 44 → 40 (→ 36 หลัง 2D) | `icon` ×1 (#87) |
| 44/40 · 40/40 | ไม่ระบุ ×29 + ×32 · ช่วง 640–767 ปุ่มที่สลับที่ `sm:` สูงขึ้นเป็น 44 | `icon` ×2 + ×8 |
| 36/36 · 44/36 | `md` ×12 + ×2 | `icon` ×2 (#18, #19 จอใหญ่ 36 → 40) |
| 32/32 · 44/32 | `sm` ×3 + ×2 | `icon-sm` ×1 + ×2 |
| ไม่มีความสูง (#109 ตัวหนังสือ "ลบ") | `sm` | — |
| 48/48 (#88) | คง `min-h-12 w-full text-base` | — |

- **`lg` ใช้ 0 ปุ่ม** · ไม่มีปุ่มข้อความใน 152 ที่อยู่แถวเดียวกับช่อง 40px · ปุ่มไอคอน 7 ปุ่มอยู่แถวเดียวกับช่อง (#46, #69, #122, #139–142) บันทึกให้ 2D รู้ว่า `icon` จะเตี้ยกว่าช่องเมื่อพลิกเป็น 36
- ตัวเลขรวม: ไม่ระบุ 114 (รวม #88, #89) · `md` 14 · `sm` 6 · `icon` 13 · `icon-sm` 3 · ไม่แปลง 2

#### 6.2.4 className ที่คงไว้

คงไว้แค่ class จัดวาง (ข้อ 4.8 ของ 2A): `w-full` · `sm:w-auto` · `sm:w-fit` · `lg:w-auto` · `w-fit` · `shrink-0` · `mt-3` · `mt-4` · `absolute right-1 top-1` · `justify-self-start` ข้อ 6.2.6 · ที่เหลือลบทั้งหมด ได้แก่
- ความสูง ความกว้าง padding `rounded-*` `gap-*` `inline-flex items-center justify-center`
- สี พื้น ขอบ `hover:*` `transition-colors` `disabled:*` `focus-visible:*` (มี ring ของตัวเอง 16 ปุ่ม)
- `font-semibold` (9 ปุ่ม · `Button` เป็น `font-medium`) · `text-xs` / `text-sm`

ข้อยกเว้นในตาราง 6.3: #15 (ป้ายยาวขึ้นบรรทัดได้) · #16 (`font-mono` ย้ายไปที่ `<span>` ข้างใน) · #87 (คง `shadow-sm` ของปุ่มที่วางบนรูป ตาม budget R2 1 ของไฟล์นี้)

#### 6.2.5 ไอคอนในปุ่ม

- ลบ `className="h-4 w-4"` / `h-3.5 w-3.5` ของไอคอน · `Button` ให้ 16px เอง (`[&_svg:not([class*='size-'])]:size-4`) · `size-4` ที่มีอยู่ก็ลบได้
- คง `aria-hidden="true"` ที่มีอยู่
- สีของไอคอนคงได้เมื่อมีความหมาย: `Sparkles className="text-primary"` (#121) · ปุ่มเตือนตาม ย17 ใส่ `className="text-warning"` ที่ไอคอนนำหน้า (#34, trigger `asset-status-correction-button.tsx:56`, `audit-mark-not-found-button.tsx:67`, `:77`)
- ไอคอนนำหน้าต้องเป็น child ตัวแรก ไอคอนหมุนของ `busy` จึงแทนที่มันได้ (`button.tsx:21-30`)

#### 6.2.6 ปุ่มไอคอนในกริด

`icon` ต่ำกว่า md กว้าง `min-w-11` (44) แต่กริด 3 จุดล็อกคอลัมน์ไว้ 40px ตั้งแต่ `sm` ช่วง 640–767 ปุ่มจึงล้นคอลัมน์ · บนมือถือกริดเป็นคอลัมน์เดียว ปุ่มจะยืดเต็มแถว

| ที่ | เดิม | ใหม่ |
|---|---|---|
| `assets/asset-form.tsx:1639` (แถว custom field) | `sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_2.5rem]` | `sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_auto]` |
| `master-data/asset-model-form.tsx:308` (แถวสเปก) | `sm:grid-cols-[180px_minmax(0,1fr)_40px]` | `sm:grid-cols-[180px_minmax(0,1fr)_auto]` |
| `master-data/category-form.tsx:508` (รายการตรวจรูป) | `sm:grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)]` | `sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)]` |

ปุ่มไอคอนในกริดทั้ง 3 จุด (#69, #122, #139–142) ใส่ `className="justify-self-start"` บนมือถือจึงยังกว้าง 44 ชิดซ้ายเหมือนเดิม · ไม่มี test ยึด class กริดเหล่านี้

#### 6.2.7 ปุ่มในส่วนท้าย dialog

ตาราง 6.3 ให้ variant, size และ busy ของทุกปุ่มใน dialog · กล่องที่ห่อปุ่ม ลำดับบนมือถือ และ Cancel ที่รู้ busy เป็นของส่วน dialog (K8, K9)
- ถ้า `AccessibleDialogFooter` วาด Cancel เอง แถว Cancel ในตาราง 6.3 คือ props ที่ส่งให้ part · ถ้าผู้เรียกยังเขียน Cancel เอง ใช้ `Button variant="outline"` ตามตาราง
- Cancel 4 ปุ่มที่วันนี้กดได้ระหว่างบันทึกได้ `disabled` ตาม K9: #71 `disabled={bulkSaving}` · #75 `disabled={reviewing}` · #77, #79 `disabled={saving}`
- Cancel ไม่ใช้ `busy` · ใส่ `disabled` ได้เพราะโฟกัสอยู่ที่ปุ่มยืนยัน
- ห้ามใช้ `ghost` เป็น Cancel บนพื้น `bg-background` (hover มองไม่เห็น · DESIGN.md Buttons แถว ghost)

### 6.3 ตาราง 152 ปุ่ม

คอลัมน์ "busy / disabled": `busy={x}` · ลบ `disabled` = disabled เดิมเท่ากับ x พอดี · `busy={x}` · `disabled={y}` = แยกเงื่อนไข · "คง" = ไม่ใช่ปุ่มที่ทำงาน คง disabled เดิม · "—" ไม่มีทั้งสองอย่าง · ชุดตามข้อ 8.6 และ 8.9

| # | ที่ (`src/components/…`) | เดิม (สูง มือถือ/จอใหญ่) | variant | size | busy / disabled | className ที่คงไว้ | หมายเหตุ | ชุด |
|---|---|---|---|---|---|---|---|---|
| 1 | `admin/admin-user-form.tsx:210` | Link 40/40 | outline | — | — |  |  | 4 |
| 2 | `admin/admin-user-form.tsx:216` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 4 |
| 3 | `admin/asset-state-review-dialog.tsx:100` | ActionButton 44/40 | outline | — | คง `disabled={busy}` |  | ActionButton → Button | 4 |
| 4 | `admin/asset-state-review-dialog.tsx:101` | ActionButton 44/40 | `{mode === "dismiss" ? "destructive" : "default"}` | — | `busy={busy}` · `disabled={reason.trim().length < 10}` |  | ActionButton → Button · เลิกสลับป้าย `labels.saving` (K13) | 4 |
| 5 | `admin/data-quality-rule-form.tsx:56` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` | `w-fit` |  | 4 |
| 6 | `admin/depreciation-policy-builder.tsx:202` | button 40/40 | outline | — | คง `disabled={!isPolicyJsonValid}` |  |  | 1f |
| 7 | `admin/depreciation-policy-builder.tsx:260` | button 40/40 | outline | — | คง `disabled={!isPolicyJsonValid \|\| selectedAvailableIds.length === 0}` |  |  | 1f |
| 8 | `admin/depreciation-policy-builder.tsx:263` | button 40/40 | outline | — | คง `disabled={!isPolicyJsonValid \|\| selectedAssignedIds.length === 0}` |  |  | 1f |
| 9 | `admin/depreciation-policy-builder.tsx:279` | button 40/40 | danger | — | คง `disabled={!isPolicyJsonValid}` |  |  | 1f |
| 10 | `admin/IntegrationClientManager.tsx:433` | button 44/44 | outline | — | คง `disabled={updatingClient}` |  |  | 4 |
| 11 | `admin/IntegrationClientManager.tsx:441` | button 44/44 | default | — | `busy={updatingClient}` · `disabled={editScopes.length === 0}` |  |  | 4 |
| 12 | `admin/IntegrationClientManager.tsx:501` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` | `w-fit` |  | 4 |
| 13 | `admin/role-permission-form.tsx:267` | Link 40/40 | outline | — | — |  |  | 4 |
| 14 | `admin/role-permission-form.tsx:273` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 4 |
| 15 | `admin/system-settings-form.tsx:1028` | button 40/40 | outline | — | — |  | + `h-auto justify-start whitespace-normal py-2 text-left md:h-auto md:min-h-10` (ป้ายยาวขึ้นบรรทัดได้) | 1f |
| 16 | `admin/system-settings-form.tsx:1044` | button 44/32 | outline | `sm` | — |  | ป้ายห่อ `<span className="font-mono">` | 1f |
| 17 | `admin/system-settings-form.tsx:1260` | button 44/40 | default | — | — |  |  | 1f |
| 18 | `admin/system-settings-form.tsx:1313` | button 36/36 | outline | `icon` | — |  |  | 1f |
| 19 | `admin/system-settings-form.tsx:1322` | button 36/36 | outline | `icon` | — |  | K22 ไอคอนลบแบบกลาง | 1f |
| 20 | `admin/system-settings-form.tsx:1416` | button 44/40 | outline | — | คง `disabled={checkedAvailableCategoryIds.length === 0}` |  |  | 1f |
| 21 | `admin/system-settings-form.tsx:1425` | button 44/40 | outline | — | คง `disabled={checkedSelectedCategoryIds.length === 0}` |  |  | 1f |
| 22 | `admin/system-settings-form.tsx:1465` | button 44/40 | outline | — | — |  |  | 1f |
| 23 | `admin/system-settings-form.tsx:1472` | button 44/40 | default | — | คง `disabled={!canApplyPrefixEditor}` |  |  | 1f |
| 24 | `admin/system-settings-form.tsx:1652` | a 44/44 | outline | — | — | `w-full sm:w-fit` |  | 1f |
| 25 | `admin/system-settings-form.tsx:1762` | button 44/40 | outline | — | `busy={testingLdap}` · ลบ `disabled` | `mt-4 w-full sm:w-auto` |  | 1f |
| 26 | `admin/system-settings-form.tsx:1988` | button 44/40 | outline | — | `busy={syncingLdap === "preview"}` · `disabled={syncingLdap === "apply"}` | `w-full sm:w-auto` |  | 1f |
| 27 | `admin/system-settings-form.tsx:1997` | button 44/40 | default | — | `busy={syncingLdap === "apply"}` · `disabled={syncingLdap === "preview" \|\| !syncPreview}` | `w-full sm:w-auto` |  | 1f |
| 28 | `admin/system-settings-form.tsx:2107` | button 44/40 | default | — | `busy={saving}` · `disabled={changedCount === 0}` | `w-full sm:w-auto` |  | 1f |
| 29 | `admin/system-settings-form.tsx:2140` | Link 40/40 | outline | — | — | `w-full sm:w-auto` |  | 1f |
| 30 | `admin/system-settings-form.tsx:2449` | a 36/36 | outline | `md` | — |  |  | 1f |
| 31 | `admin/system-settings-form.tsx:2589` | button 44/32 | outline | `sm` | — |  |  | 1f |
| 32 | `asset-operations/bulk-move-form.tsx:130` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 1b |
| 33 | `asset-operations/checkin-form.tsx:321` | Link 44/44 | outline | — | — | `w-full shrink-0 sm:w-auto` |  | 1b |
| 34 | `asset-operations/checkin-form.tsx:382` | button 44/44 | outline | — | `busy={legacyBackfillSavingId === asset.id}` · `disabled={saving}` | `w-full shrink-0 lg:w-auto` | ย17: `<PackageCheck className="text-warning" />` · เลิกสลับป้าย (K13) | 1b |
| 35 | `asset-operations/checkin-form.tsx:520` | button 40/40 | outline | `icon` | — | `shrink-0` |  | 1b |
| 36 | `asset-operations/checkin-form.tsx:563` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` | `w-full sm:w-auto` |  | 1b |
| 37 | `asset-operations/checkout-form.tsx:329` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` | `w-full sm:w-auto` |  | 1b |
| 38 | `asset-operations/signature-pad.tsx:115` | button 32/32 | ghost (K25) | `sm` | คง `disabled={disabled \|\| !hasSignature}` |  | K25: วางใต้ canvas (ตำแหน่งเป็นของส่วนที่ถือ K25) | 1b |
| 39 | `asset-operations/transaction-cancel-dialog.tsx:155` | button 44/44 | outline | — | คง `disabled={saving}` |  |  | 4 |
| 40 | `asset-operations/transaction-cancel-dialog.tsx:156` | button 44/44 | destructive | — | `busy={saving}` · `disabled={loading \|\| blockers.length > 0}` |  |  | 4 |
| 41 | `asset-operations/transfer-form.tsx:145` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` | `w-full sm:w-auto` |  | 1b |
| 42 | `assets/asset-batch-form.tsx:625` | button 32/32 | outline | `sm` | — |  |  | 1e |
| 43 | `assets/asset-batch-form.tsx:786` | button 44/44 | outline | — | คง `disabled={rows.length >= 100}` | `w-full sm:w-auto` |  | 1e |
| 44 | `assets/asset-batch-form.tsx:795` | button 44/44 | outline | — | `busy={checkingDuplicates}` · `disabled={hasClientDuplicates}` | `w-full sm:w-auto` | เลิกสลับป้าย `batchCheckDuplicatesRunning` (K13) | 1e |
| 45 | `assets/asset-batch-form.tsx:853` | button 44/40 | outline | `icon` | คง `disabled={rows.length <= 2}` | `shrink-0` | K22 ไอคอนลบแบบกลาง | 1e |
| 46 | `assets/asset-batch-form.tsx:950` | button 40/40 | outline | `icon` | คง `disabled={rows.length <= 2}` |  | K22 ไอคอนลบแบบกลาง | 1e |
| 47 | `assets/asset-batch-form.tsx:975` | button 44/44 | outline | — | — | `w-full sm:w-auto` |  | 1e |
| 48 | `assets/asset-batch-form.tsx:1025` | Link 44/44 | outline | — | — | `w-full sm:w-auto` |  | 1e |
| 49 | `assets/asset-batch-form.tsx:1028` | Link 44/44 | default | — | — | `w-full sm:w-auto` |  | 1e |
| 50 | `assets/asset-batch-form.tsx:1031` | button 44/44 | outline | — | — | `w-full sm:w-auto` |  | 1e |
| 51 | `assets/asset-batch-form.tsx:1035` | button 44/44 | outline | — | — | `w-full sm:w-auto` |  | 1e |
| 52 | `assets/asset-batch-form.tsx:1065` | button 44/44 | default | — | `busy={saving}` · `disabled={hasClientDuplicates}` | `w-full sm:w-auto` |  | 1e |
| 53 | `assets/asset-component-manager.tsx:283` | button 44/36 | outline | `md` | — | `shrink-0` | ย16/ย17 (เดิมขอบเขียว) | 1e |
| 54 | `assets/asset-component-manager.tsx:374` | button 44/44 | outline | — | — |  |  | 1e |
| 55 | `assets/asset-component-manager.tsx:377` | button 44/44 | default | — | — |  |  | 1e |
| 56 | `assets/asset-component-manager.tsx:400` | button 44/44 | outline | — | คง `disabled={saving}` |  |  | 1e |
| 57 | `assets/asset-component-manager.tsx:403` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` |  | เลิกสลับป้าย `labels.installing` (K13) | 1e |
| 58 | `assets/asset-component-manager.tsx:436` | button 44/40 | outline | — | — | `mt-3` |  | 1e |
| 59 | `assets/asset-component-manager.tsx:577` | button 44/44 | outline | — | คง `disabled={busy}` |  |  | 1e |
| 60 | `assets/asset-component-manager.tsx:578` | button 44/44 | destructive | — | `busy={busy}` · ลบ `disabled` |  | เลิกสลับป้าย `labels.removing` (K13) | 1e |
| 61 | `assets/asset-form.tsx:870` | button 32/32 | outline | `sm` | — |  |  | 1e |
| 62 | `assets/asset-form.tsx:1261` | button 36/36 | outline | `md` | คง `disabled={saving}` | `mt-3` |  | 1e |
| 63 | `assets/asset-form.tsx:1281` | button 44/32 | danger | `icon-sm` | — | `shrink-0` |  | 1e |
| 64 | `assets/asset-form.tsx:1395` | button 36/36 | outline | `md` | คง `disabled={saving}` | `mt-3` |  | 1e |
| 65 | `assets/asset-form.tsx:1415` | button 44/32 | danger | `icon-sm` | — | `shrink-0` |  | 1e |
| 66 | `assets/asset-form.tsx:1444` | button 36/36 | outline | `md` | — |  |  | 1e |
| 67 | `assets/asset-form.tsx:1504` | Link 44/44 | outline | — | — | `w-full sm:w-auto` | อยู่ใน `StickyFormFooter` (ข้อ 6.9) | 1e |
| 68 | `assets/asset-form.tsx:1507` | button 44/44 | default | — | `busy={saving}` · `disabled={isProtectedStatusChange \|\| duplicateState.checking \|\| duplicateState.assetTagExists \|\| duplicateState.serialNumberExists}` | `w-full sm:w-auto` | อยู่ใน `StickyFormFooter` (ข้อ 6.9) | 1e |
| 69 | `assets/asset-form.tsx:1652` | button 44/40 | outline | `icon` | — |  | K22 ไอคอนลบแบบกลาง · + `justify-self-start` · grid ข้อ 6.3 | 1e |
| 70 | `assets/asset-form.tsx:1666` | button 44/36 | outline | `md` | — |  |  | 1e |
| 71 | `assets/asset-register-table.tsx:757` | button 40/40 | outline | — | — |  | + `disabled={bulkSaving}` (K9 Cancel รู้ busy) | 4 |
| 72 | `assets/asset-register-table.tsx:764` | button 40/40 | default | — | `busy={bulkSaving}` · `disabled={!bulkForm.toLocationId && !bulkForm.toCustodianId}` |  |  | 4 |
| 73 | `assets/asset-status-correction-button.tsx:80` | button 44/44 | outline | — | — |  |  | 4 |
| 74 | `assets/asset-status-correction-button.tsx:90` | button 44/44 | default | — | `busy={isSubmitting}` · `disabled={reason.trim().length < 5}` |  | เลิกสลับป้าย `labels.submitting` (K13) | 4 |
| 75 | `audit/audit-finding-review-actions.tsx:245` | button 44/40 | outline | — | — |  | + `disabled={reviewing}` (K9) | 1d |
| 76 | `audit/audit-finding-review-actions.tsx:248` | button 44/40 | `{action === "approve" ? "default" : "destructive"}` | — | `busy={reviewing}` · ลบ `disabled` |  |  | 1d |
| 77 | `audit/audit-finding-review-actions.tsx:394` | button 44/40 | outline | — | — |  | + `disabled={saving}` (K9) | 1d |
| 78 | `audit/audit-finding-review-actions.tsx:397` | button 44/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 1d |
| 79 | `audit/audit-finding-review-actions.tsx:488` | button 44/40 | outline | — | — |  | + `disabled={saving}` (K9) | 1d |
| 80 | `audit/audit-finding-review-actions.tsx:491` | button 44/40 | default | — | `busy={saving}` · `disabled={uploadedCount === 0}` |  |  | 1d |
| 81 | `audit/audit-mark-not-found-button.tsx:130` | button 44/44 | outline | — | คง `disabled={saving}` |  |  | 1d |
| 82 | `audit/audit-mark-not-found-button.tsx:138` | button 44/44 | warning | — | `busy={saving}` · ลบ `disabled` |  |  | 1d |
| 83 | `audit/audit-round-cancel-button.tsx:115` | button 44/44 | outline | — | คง `disabled={saving}` |  |  | 3 |
| 84 | `audit/audit-round-cancel-button.tsx:123` | button 44/44 | destructive | — | `busy={saving}` · ลบ `disabled` |  |  | 3 |
| 85 | `audit/audit-round-form.tsx:186` | button 40/40 | outline | — | `busy={previewing}` · ลบ `disabled` |  |  | 3 |
| 86 | `audit/audit-round-form.tsx:270` | button 40/40 | default | — | `busy={saving}` · `disabled={previewing}` |  |  | 3 |
| 87 | `audit/audit-scan-check-form.tsx:319` | button 44/44 | outline | `icon` | — | `absolute right-1 top-1 shadow-sm` | ปุ่มบนรูป คง `shadow-sm` (R2 budget 1) | 1d |
| 88 | `audit/audit-scan-check-form.tsx:342` | Button 48/48 | `{diff.length === 0 ? "default" : "warning"}` | — | `busy={saving}` · `disabled={disabled \|\| missingPhoto}` | `min-h-12 w-full text-base` (คงเดิม) | เป็น Button อยู่แล้ว · ลบ `{saving ? <Loader2 …/> : null}` | 1d |
| 89 | `audit/audit-scan-check-form.tsx:361` | Button 44/40 | ghost | — | คง `disabled={saving}` | `w-full` | เป็น Button อยู่แล้ว ไม่แก้ | 1d |
| 90 | `audit/audit-scan-component-missing-dialog.tsx:69` | button 44/44 | outline | — | คง `disabled={saving}` |  |  | 1d |
| 91 | `audit/audit-scan-component-missing-dialog.tsx:77` | button 44/44 | warning | — | `busy={saving}` · ลบ `disabled` |  |  | 1d |
| 92 | `audit/audit-scan-room-picker.tsx:126` | button 44/44 | outline | — | — | `w-full` |  | 3 |
| 93 | `auth/login-form.tsx:135` | button 44/40 | default | — | `busy={loading}` · ลบ `disabled` | `w-full` | เลิกสลับป้าย `loggingIn` (K13) · ลบ `aria-busy={loading}` | 4 |
| 94 | `disposal/disposal-batch-form.tsx:85` | button 44/44 | outline | — | — |  |  | 1c |
| 95 | `disposal/disposal-batch-form.tsx:88` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 1c |
| 96 | `disposal/disposal-batch-form.tsx:121` | button 40/40 | danger | `icon` | — |  |  | 1c |
| 97 | `disposal/disposal-batch-form.tsx:122` | button 44/44 | default | — | คง `disabled={!valid}` | `w-full` |  | 1c |
| 98 | `disposal/disposal-bulk-approval.tsx:557` | button 44/40 | outline | — | คง `disabled={busy}` |  |  | 3 |
| 99 | `disposal/disposal-bulk-approval.tsx:558` | button 44/40 | outline | — | คง `disabled={busy \|\| eligible.length === 0}` |  | เดิม outline ตัวหนังสือ primary | 3 |
| 100 | `disposal/disposal-bulk-approval.tsx:559` | button 44/40 | default | — | `busy={busy}` · `disabled={eligible.length === 0}` |  |  | 3 |
| 101 | `disposal/disposal-bulk-execution.tsx:941` | button 44/44 | outline | — | — |  | ซ่อนตอน `committing` อยู่แล้ว | 3 |
| 102 | `disposal/disposal-bulk-execution.tsx:950` | button 44/44 | default | — | คง `disabled={!hasSharedValues}` |  |  | 3 |
| 103 | `disposal/disposal-bulk-execution.tsx:959` | button 44/44 | default | — | คง `disabled={eligible.length === 0 \|\| !permanentConfirmed}` |  |  | 3 |
| 104 | `disposal/disposal-bulk-execution.tsx:976` | button 44/44 | default | — | — |  |  | 3 |
| 105 | `disposal/disposal-decision-button.tsx:198` | button 44/40 | outline | — | คง `disabled={saving}` |  |  | 1c |
| 106 | `disposal/disposal-decision-button.tsx:199` | button 44/40 | default | — | `busy={saving}` · `disabled={rejectionReasonRequired && !values.approvalRemark.trim()}` |  |  | 1c |
| 107 | `disposal/disposal-execution-button.tsx:236` | button 44/40 | outline | — | คง `disabled={saving}` |  |  | 1c |
| 108 | `disposal/disposal-execution-button.tsx:237` | button 44/40 | default | — | `busy={saving}` · `disabled={evidenceBlocked \|\| historicalInputInvalid}` |  | แก้ `:205` เป็น `const submitDisabled = evidenceBlocked \|\| historicalInputInvalid` | 1c |
| 109 | `disposal/disposal-request-form.tsx:196` | button auto/auto | danger | `sm` | — |  |  | 1c |
| 110 | `disposal/disposal-request-form.tsx:209` | button 44/40 | default | — | `busy={saving}` · ลบ `disabled` | `w-full sm:w-auto` |  | 1c |
| 111 | `maintenance/maintenance-attachments.tsx:241` | button 44/44 | (ไม่แปลง) | — | — |  | ทั้ง dialog `:239` เป็น `useConfirm` ในชุด 5 (K12 · ส่วน 8 ข้อตัดสินย่อย 7) · ชุด 1a ไม่แตะ | 5 |
| 112 | `maintenance/maintenance-attachments.tsx:248` | button 44/44 | (ไม่แปลง) | — | — |  | เหมือน #111 | 5 |
| 113 | `maintenance/maintenance-plan-form.tsx:145` | button 44/40 | default | — | `busy={saving}` · ลบ `disabled` | `w-full sm:w-auto` |  | 1a |
| 114 | `maintenance/maintenance-plan-state-actions.tsx:68` | button 44/44 | outline | — | คง `disabled={saving}` |  |  | 3 |
| 115 | `maintenance/maintenance-plan-state-actions.tsx:71` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 3 |
| 116 | `maintenance/repair-record-actions.tsx:170` | button 44/44 | outline | — | คง `disabled={saving}` |  |  | 1a |
| 117 | `maintenance/repair-record-actions.tsx:171` | button 44/44 | destructive | — | `busy={saving}` · ลบ `disabled` |  |  | 1a |
| 118 | `maintenance/repair-record-actions.tsx:235` | button 44/44 | outline | — | คง `disabled={saving}` |  |  | 1a |
| 119 | `maintenance/repair-record-actions.tsx:236` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 1a |
| 120 | `maintenance/repair-record-form.tsx:235` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` | `w-full sm:w-auto` |  | 1a |
| 121 | `master-data/asset-model-form.tsx:291` | button 36/36 | outline | `md` | — |  | ไอคอนคง `text-primary` | 1g |
| 122 | `master-data/asset-model-form.tsx:321` | button 40/40 | danger | `icon` | — |  | + `justify-self-start` · grid ข้อ 6.3 | 1g |
| 123 | `master-data/asset-model-form.tsx:334` | button 36/36 | outline | `md` | — |  |  | 1g |
| 124 | `master-data/asset-model-form.tsx:356` | Link 40/40 | outline | — | — |  |  | 1g |
| 125 | `master-data/asset-model-form.tsx:362` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 1g |
| 126 | `master-data/asset-model-form.tsx:433` | button 32/32 | danger | `icon-sm` | `busy={deletingId === photo.id}` · ลบ `disabled` |  |  | 1g |
| 127 | `master-data/branch-form.tsx:177` | Link 40/40 | outline | — | — |  |  | 2 |
| 128 | `master-data/branch-form.tsx:183` | button 40/40 | default | — | `busy={saving}` · `disabled={companies.length === 0}` |  |  | 2 |
| 129 | `master-data/brand-form.tsx:114` | Link 40/40 | outline | — | — |  |  | 2 |
| 130 | `master-data/brand-form.tsx:120` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 2 |
| 131 | `master-data/category-form.tsx:167` | button 36/36 | outline | `md` | — |  |  | 2 |
| 132 | `master-data/category-form.tsx:207` | button 36/36 | outline | `md` | — |  |  | 2 |
| 133 | `master-data/category-form.tsx:232` | Link 40/40 | outline | — | — |  |  | 2 |
| 134 | `master-data/category-form.tsx:238` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 2 |
| 135 | `master-data/category-form.tsx:401` | button 36/36 | outline | `md` | คง `disabled={index === 0}` |  |  | 2 |
| 136 | `master-data/category-form.tsx:410` | button 36/36 | outline | `md` | คง `disabled={index === fields.length - 1}` |  |  | 2 |
| 137 | `master-data/category-form.tsx:419` | button 36/36 | outline | `md` | — |  |  | 2 |
| 138 | `master-data/category-form.tsx:427` | button 36/36 | danger | `md` | — |  |  | 2 |
| 139 | `master-data/category-form.tsx:516` | button 40/40 | outline | `icon` | คง `disabled={index === 0}` |  | + `justify-self-start` · grid ข้อ 6.3 | 2 |
| 140 | `master-data/category-form.tsx:526` | button 40/40 | outline | `icon` | คง `disabled={index === items.length - 1}` |  | + `justify-self-start` · grid ข้อ 6.3 | 2 |
| 141 | `master-data/category-form.tsx:536` | button 40/40 | outline | `icon` | — |  | + `justify-self-start` · grid ข้อ 6.3 | 2 |
| 142 | `master-data/category-form.tsx:545` | button 40/40 | outline | `icon` | — |  | K22 ไอคอนลบแบบกลาง · + `justify-self-start` · grid ข้อ 6.3 | 2 |
| 143 | `master-data/company-form.tsx:176` | Link 40/40 | outline | — | — |  |  | 2 |
| 144 | `master-data/company-form.tsx:182` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 2 |
| 145 | `master-data/department-form.tsx:151` | Link 40/40 | outline | — | — |  |  | 2 |
| 146 | `master-data/department-form.tsx:157` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 2 |
| 147 | `master-data/employee-form.tsx:303` | Link 40/40 | outline | — | — |  |  | 2 |
| 148 | `master-data/employee-form.tsx:309` | button 40/40 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 2 |
| 149 | `master-data/location-form.tsx:215` | Link 40/40 | outline | — | — |  |  | 2 |
| 150 | `master-data/location-form.tsx:221` | button 40/40 | default | — | `busy={saving}` · `disabled={branches.length === 0}` |  |  | 2 |
| 151 | `master-data/supplier-form.tsx:256` | Link 44/44 | outline | — | — |  | คง `onClick={confirmNavigation}` | 2 |
| 152 | `master-data/supplier-form.tsx:263` | button 44/44 | default | — | `busy={saving}` · ลบ `disabled` |  |  | 2 |

### 6.4 ปุ่มนอก 152 ที่ส่วนนี้แปลง

#### 6.4.1 trigger ของ dialog (A5 ผ่าน K1)

แปลงใน commit เดียวกับ dialog ของมัน · trigger 3 ไฟล์ของ O6 ได้ handle `open()`/`hideTrigger` ใน P0 แล้ว (ข้อ 8.3.3) ส่วนนี้แปลงแค่หน้าตา

| ที่ | variant | size | busy / disabled | className | หมายเหตุ | ชุด |
|---|---|---|---|---|---|---|
| `admin/IntegrationClientManager.tsx:848` | `outline` | ไม่ระบุ | คง `disabled={busy}` (busy ของแถว) | — | | 4 |
| `asset-operations/transaction-cancel-dialog.tsx:123` | `danger` | ไม่ระบุ | — | — | `asset-transaction-cancellation-ui.test.ts:13` | 4 |
| `assets/asset-component-manager.tsx:526` | `danger` | `md` | — | `shrink-0` | | 1e |
| `assets/asset-status-correction-button.tsx:56` | `outline` | ไม่ระบุ | — | — | `<RotateCcw className="text-warning" />` (ย17) | 4 |
| `audit/audit-mark-not-found-button.tsx:67` | `outline` | ไม่ระบุ | `busy={saving}` · ลบ `disabled` | `w-full` | `const icon` (`:64`) เหลือ `<AlertTriangle className="text-warning" />` ไม่มี `Loader2` | 1d |
| `audit/audit-mark-not-found-button.tsx:77` | `ghost` | `icon-sm` | `busy={saving}` · ลบ `disabled` | — | คง `title` และ `aria-label` | 1d |
| `audit/audit-round-cancel-button.tsx:66` | `danger` | ไม่ระบุ | `busy={saving}` · ลบ `disabled` | `w-full sm:w-auto` | เดิมพื้น `danger-soft` | 3 |
| `disposal/disposal-decision-button.tsx:96` | `outline` | ไม่ระบุ | — | `w-full sm:w-auto` | คง `ref={triggerRef}` | 1c |
| `disposal/disposal-execution-button.tsx:155` | `default` | ไม่ระบุ | — | `w-full sm:w-auto` | คง `ref={triggerRef}` | 1c |
| `maintenance/maintenance-plan-state-actions.tsx:50` | `variant={action === "end" ? "danger" : "outline"}` | `sm` | — | — | | 3 |
| `maintenance/repair-record-actions.tsx:95` | `default` | ไม่ระบุ | — | — | | 1a |
| `maintenance/repair-record-actions.tsx:98` | `danger` | ไม่ระบุ | — | — | | 1a |
| `maintenance/repair-record-actions.tsx:103` | `outline` | ไม่ระบุ | — | — | ลบ `secondaryButton` `:21` | 1a |

ไม่แปลงใน 2C (เป็นของ 2B): `audit/audit-finding-review-actions.tsx:95`, `:105`, `:118`, `:127` (trigger ที่แถว · O21) · `disposal/disposal-bulk-approval.tsx:423` (`DisposalBulkApprovalToolbar` · O4) · `disposal/disposal-bulk-execution.tsx:644` (`DisposalBulkExecutionToolbar` · O4) · `assets/asset-register-table.tsx:472` (แถบเลือกหลายรายการ · O1)

#### 6.4.2 หน้านำเข้า (O13) และหน้าเครื่องมือ (O19) · ชุด 4

| ที่ | variant | size | busy / disabled | className | หมายเหตุ |
|---|---|---|---|---|---|
| `assets/asset-import-preview-panel.tsx:112` | `outline` | ไม่ระบุ | — | — | คง `aria-expanded={isOpen}` และไอคอนลูกศร |
| `assets/asset-import-preview-panel.tsx:209` | `outline` | ไม่ระบุ | `busy={isLoading}` · `disabled={isImporting}` | — | เลิกสลับป้าย `:216` (K13) |
| `assets/asset-import-preview-panel.tsx:387` | `default` | ไม่ระบุ | `busy={isImporting}` · `disabled={preview.summary.readyRows === 0}` | — | เลิกสลับป้าย `:393` (K13) |
| `assets/asset-label-batch-tool.tsx:373` | `default` | ไม่ระบุ | คง `disabled={recentAssets.length === 0}` | `w-full shrink-0` | ป้ายที่เปลี่ยนตามจำนวนคงไว้ (ไม่ใช่ busy) |
| `assets/asset-label-batch-tool.tsx:391` | `outline` | ไม่ระบุ | — | — | |
| `assets/asset-label-batch-tool.tsx:493` | `outline` | ไม่ระบุ | — | `mt-3 w-full` | |
| `assets/asset-label-batch-tool.tsx:523` | `outline` | ไม่ระบุ | คง `disabled={selectedForPrint.length === 0}` | `w-full` | |
| `assets/asset-label-batch-tool.tsx:532` | `default` | ไม่ระบุ | คง `disabled={selectedForPrint.length === 0}` | `w-full` | |
| `assets/asset-label-batch-tool.tsx:553` | `outline` | `icon-sm` | — | `shrink-0` | ไอคอนลบแบบกลาง (K22) |
| `assets/asset-label-print.tsx:254` | `default` | ไม่ระบุ | `busy={recordingPrint}` · ลบ `disabled` | `w-full sm:w-auto` | เลิกสลับป้าย `:261` (K13) |
| `assets/asset-scan-search-tool.tsx:131` | `default` | ไม่ระบุ | — | `w-full sm:w-auto` | |

#### 6.4.3 ปุ่มใน `ui/` ที่ใช้ `disabled={busy}`

| ที่ | เปลี่ยน | ชุด |
|---|---|---|
| `ui/operation-review-dialog.tsx:56` | `disabled={busy}` → `busy={busy}` (โฟกัสเริ่มที่ปุ่มนี้ `initialFocusRef={confirmButtonRef}` จึงหลุดทุกครั้งที่บันทึก) · Cancel `:55` คง `disabled={busy}` | 1b |
| `ui/confirm-text-dialog.tsx:86` | `disabled={busy}` → `busy={busy}` · Cancel `:85` คง | 3 |

### 6.5 `Loader2` → `busy` และ K13

#### 6.5.1 วิธีเขียน

| แบบเดิม | ใหม่ |
|---|---|
| `{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{label}` (41 ปุ่ม) | `<Save />{label}` + `busy={saving}` · ไอคอนหมุนแทนไอคอนนำหน้า ความกว้างคงเดิม |
| `{saving ? <Loader2 … /> : null}{label}` (9 ปุ่ม) | `{label}` + `busy={saving}` · ไอคอนหมุนอยู่หน้าข้อความ ปุ่มกว้างขึ้น 22px ตอน busy |
| `{saving ? labels.saving : labels.save}` | `{labels.save}` (K13) |
| `disabled={saving}` | ลบ |
| `disabled={saving \|\| x}` | `disabled={x}` |
| `aria-busy={loading}` ที่เขียนเอง (`auth/login-form.tsx:138`) | ลบ · `Button` ใส่ให้เอง |

- 32 ปุ่มที่ลบ `disabled`: #2, #12, #14, #25, #32, #36, #37, #41, #57, #60, #76, #78, #82, #84, #85, #91, #93, #95, #110, #113, #115, #117, #119, #120, #125, #126, #130, #134, #144, #146, #148, #152
- 18 ปุ่มที่แยกเงื่อนไข (นิพจน์ครบในตาราง 6.3): #11, #26, #27, #28, #34, #40, #44, #52, #68, #72, #80, #86, #88, #100, #106, #108, #128, #150
- ปุ่มที่ได้ `busy` แต่ไม่มี `Loader2`: #4 `busy={busy}` + `disabled={reason.trim().length < 10}` · #5 `busy={saving}` · #74 `busy={isSubmitting}` + `disabled={reason.trim().length < 5}` · เหตุผล: เป็นตัวสั่งงานเองและวันนี้ใช้ `disabled={saving}` ซึ่งทำโฟกัสหลุด (ความเสี่ยง 6 ของ 2A)
- #26 กับ #27 ใช้ตัวแปรเดียวกันคนละค่า: `busy={syncingLdap === "preview"}` · `disabled={syncingLdap === "apply"}` และ `busy={syncingLdap === "apply"}` · `disabled={syncingLdap === "preview" || !syncPreview}` (`syncingLdap` เป็น `"preview" | "apply" | null` ที่ `system-settings-form.tsx:520`)
- #108 แก้ค่าคงที่ `disposal-execution-button.tsx:205` เป็น `const submitDisabled = evidenceBlocked || historicalInputInvalid` แล้วคง `disabled={submitDisabled}`
- #34 `disabled={saving}` ที่เหลือคือการบันทึกของฟอร์มหลัก ไม่ใช่ของแถวนี้ จึงไม่ชน `busy`

#### 6.5.2 K13 เลิกสลับป้ายตอน busy (10 จุด)

| ที่สลับ | ป้ายตอน busy | test |
|---|---|---|
| `admin/asset-state-review-dialog.tsx:102` | `labels.saving` | — |
| `asset-operations/checkin-form.tsx:389` | `t("legacyReturnCreating")` | key ยึดที่ `legacy-checkin-flow.test.ts:63` (คง key) |
| `assets/asset-batch-form.tsx:802` | `t("batchCheckDuplicatesRunning")` | — |
| `assets/asset-component-manager.tsx:405` | `labels.installing` | — |
| `assets/asset-component-manager.tsx:580` | `labels.removing` | — |
| `assets/asset-status-correction-button.tsx:96` | `labels.submitting` | — |
| `auth/login-form.tsx:142` | `t("loggingIn")` | `login-form-ui.test.ts:30` แก้ · `:49`, `:52` ยึด key (คง key) |
| `assets/asset-import-preview-panel.tsx:216` | `` `${labels.chooseFile}...` `` | — |
| `assets/asset-import-preview-panel.tsx:393` | `labels.importing` | — |
| `assets/asset-label-print.tsx:261` | `translations.recordingPrint` | — |

- ป้ายตอนพักเหลือตัวเดียว เช่น `{tCommon("save")}` · การบอกว่ากำลังทำงานมาจาก `aria-busy` ไอคอนหมุน และหน้าตากดไม่ได้
- **ไม่ลบ key ใน `messages/*.json` และไม่ลบ prop ใน `labels`** ของ component (ข้อตัดสินย่อย 6) · ไม่ต้องแก้หน้า server ที่ส่ง labels มา

#### 6.5.3 `Loader2` ที่ไม่ใช่ปุ่ม

บรรทัดสถานะ 7 จุดในไฟล์ที่ส่วนนี้แปลง ใส่ `motion-reduce:animate-none` เพิ่มใน commit ของไฟล์นั้น: `admin/IntegrationClientManager.tsx:528` · `asset-operations/transaction-cancel-dialog.tsx:131` · `assets/asset-component-manager.tsx:474` · `disposal/disposal-bulk-approval.tsx:546`, `:547` · `disposal/disposal-bulk-execution.tsx:971`, `:993` (`BusyLabel`)

ไม่แตะ: `audit/audit-scan-check-form.tsx:242` (ปุ่มเปิดปิดหัวข้อ) · `IntegrationClientManager.tsx:863` และ `maintenance/maintenance-attachments.tsx:210` (ปุ่มแถวของ 2D) · `audit-finding-review-actions.tsx:102`, `:112` และ `disposal-bulk-approval.tsx:424` (ปุ่มของ 2B) · ไอคอนหมุนในหน้าเครื่องมือ (`asset-label-batch-tool.tsx:321`, `:469`, `asset-scan-search-tool.tsx:146` · ส่วนช่องกรอก)

`<Loader2` ที่เหลือหลัง 2C ในไฟล์ที่ส่วนนี้แปลง (ใช้เป็น budget ของ G6 ข้อ 6.11): `IntegrationClientManager.tsx` 2 · `transaction-cancel-dialog.tsx` 1 · `asset-component-manager.tsx` 1 · `audit-finding-review-actions.tsx` 2 · `audit-scan-check-form.tsx` 1 · `disposal-bulk-approval.tsx` 3 · `disposal-bulk-execution.tsx` 2 · `maintenance-attachments.tsx` 1 · `asset-label-batch-tool.tsx` 2 · `asset-scan-search-tool.tsx` 1 · ไฟล์อื่นของส่วนนี้ 0

### 6.6 `disabled:opacity-*`

ปุ่มที่แปลงทุกปุ่มไม่มี `opacity` อีก (93 ตัว: 84 + trigger 4 + นอก 152 อีก 5) · ปุ่มที่กดไม่ได้หรือ busy ได้หน้าตาเดียวของ 2A: `bg-background` · `border-border` · `text-faint-foreground` · cursor not-allowed
- ปุ่มหลักที่กดไม่ได้เปลี่ยนจากน้ำเงินจางเป็นเทา เช่น ปุ่มบันทึกของหน้าตั้งค่าตอนยังไม่มีการเปลี่ยนแปลง · มีบรรทัดสถานะบอกเหตุผลอยู่แล้ว (ข้อ 6.8)
- `disabled:opacity-*` ของช่องกรอกในไฟล์เดียวกันเป็นของส่วนช่องกรอก

### 6.7 ลิงก์ "ยกเลิก" ท้ายฟอร์ม และลิงก์ข้อความ 3 จุด (O18)

**ลิงก์ยกเลิก 12 ลิงก์** (O16: ลิงก์กลับที่หัวหน้าฟอร์มเป็นของ 2B)
- 10 ลิงก์ที่ class เหมือนกัน `"inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"`: #1, #13, #124, #127, #129, #133, #143, #145, #147, #149 → `className={buttonVariants({ variant: "outline" })}`
- #151 `supplier-form.tsx:256` → เหมือนกัน · คง `onClick={confirmNavigation}` (ถามก่อนทิ้งการแก้)
- #67 `asset-form.tsx:1504` → อยู่ใน `StickyFormFooter` (ข้อ 6.8)
- แถวที่ห่อของ F1 (`"mt-6 flex justify-end gap-3 border-t border-border pt-5"` และแบบต่าง ๆ) คงไว้ · ปุ่มยกเลิกอยู่ก่อนปุ่มหลักแล้ว (K8) และป้ายสั้นพอวางคู่กันที่ 320 (ข้อตัดสินย่อย 11)

**ลิงก์ข้อความ (O18)** ใช้ `linkVariants` ของ 2A

| ที่ | เดิม | ใหม่ | ชุด |
|---|---|---|---|
| `assets/asset-form.tsx:1070` (ในกล่อง `warning-soft` `:1063`) | `className="mt-2 inline-flex font-medium underline underline-offset-2"` | `className={cn(linkVariants({ size: "inherit" }), "mt-2 inline-flex decoration-current")}` | 1e |
| `maintenance/repair-record-form.tsx:122` (ในประโยคของ `<p role="alert">` สีเตือน) | `className="font-medium underline underline-offset-2"` | `className={cn(linkVariants({ size: "inherit" }), "decoration-current")}` | 1a |
| `admin/system-settings-form.tsx:2076` (`<button>` ในเซลล์ตาราง) | `className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"` | `className={linkVariants({ size: "inherit" })}` · `<span>` ข้างในคงเดิม · ใช้ outline โฟกัสกลางของ `globals.css` | 1f |

ลิงก์ 2 จุดแรกอยู่บนพื้นเตือน จึงขีดเส้นใต้ตลอด (`decoration-current`) เพราะ primary #1E4F94 กับตัวหนังสือ warning #A14A05 ต่างกันแค่ 1.34:1 (WCAG 1.4.1 ต้อง 3:1 ถ้าแยกด้วยสีอย่างเดียว) · primary บน `warning-soft` ได้ 7.39:1

### 6.8 `StickyFormFooter` (K14 · K8)

ไฟล์ใหม่ `src/components/ui/sticky-form-footer.tsx` · ไม่มี `"use client"` และไม่มี hook (ใช้ใน server ได้ แบบเดียวกับ `Button`)

```tsx
type StickyFormFooterProps = React.ComponentProps<"div"> & {
  /** บรรทัดสถานะ เช่น "มีการเปลี่ยนแปลง 3 รายการ" · มือถืออยู่เหนือปุ่ม ตั้งแต่ sm อยู่ซ้าย */
  status?: React.ReactNode
}
// children = ปุ่ม เรียงตาม DOM: ปุ่มรอง (ยกเลิก) ก่อน ปุ่มหลักท้ายสุด (K8)
function StickyFormFooter({ status, className, children, ...props }: StickyFormFooterProps)
```

| ส่วน | class |
|---|---|
| กล่อง (`data-slot="sticky-form-footer"`) | `cn("sticky -bottom-4 z-10 -mx-4 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-bottom-6 sm:-mx-6 sm:px-6", className)` |
| แถวใน | `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` |
| สถานะ (มีเมื่อส่ง `status`) | `min-w-0` |
| แถวปุ่ม | `flex flex-col gap-2 sm:ms-auto sm:flex-row sm:items-center` |

- **ต้องเป็นลูกตัวสุดท้ายของ `<form>`** ปุ่ม `type="submit"`, การกด Enter ในช่อง และการกันกดของ `busy` จึงทำงานเหมือนเดิม
- ติดล่างของพื้นที่เลื่อน (`main`, `dashboard-shell.tsx:124`) และกลับไปอยู่ท้ายฟอร์มเมื่อเลื่อนถึงสุด · ไม่คำนวณความกว้าง sidebar เลย
- `-bottom-4 sm:-bottom-6` ชดเชย `py-4 sm:py-6` ของ `main` ให้แถบชิดขอบจอพอดี แบบเดียวกับช่องค้นหาตรวจนับ `sticky -top-4 sm:-top-6` (DESIGN.md:469 · `visual-foundation-guards.test.ts:113`) · `-mx-4 sm:-mx-6` ให้เส้นบนยาวเต็ม `main`
- เรียบ: ขอบบน 1px และพื้นทึบ · ไม่มีเงา ไม่มี `backdrop-blur` ไม่มีพื้นโปร่ง (R2, R7)
- มือถือ: ปุ่มเรียงลงเต็มความกว้าง ยกเลิกอยู่บน ปุ่มหลักอยู่ล่าง (flex-col ยืดลูกเต็มกว้างเอง ไม่ต้องใส่ `w-full`) · ตั้งแต่ `sm` เป็นแถวชิดขวา ปุ่มหลักท้ายสุด (K8)
- ขอบล่างเว้นพื้นที่ home indicator ของ iPhone (`viewportFit: "cover"` ที่ `src/app/layout.tsx:46`)

**ฟอร์มทรัพย์สิน** (`assets/asset-form.tsx` · ชุด 1e)
- `:838` `className="space-y-5 pb-36 sm:pb-24"` → `className="space-y-5"` (ไม่ต้องเว้นที่ให้แถบ `fixed` อีก)
- `:1501-1517` แถบ `fixed` 3 ชั้น →

```tsx
<StickyFormFooter>
  <Link href={backHref} className={buttonVariants({ variant: "outline" })}>{tCommon("cancel")}</Link>
  <Button
    type="submit"
    busy={saving}
    disabled={isProtectedStatusChange || duplicateState.checking || duplicateState.assetTagExists || duplicateState.serialNumberExists}
  >
    <Save />
    {tCommon("save")}
  </Button>
</StickyFormFooter>
```

- แก้ G11 ทั้งหมด: แถบเลื่อน 192px ตอน sidebar พับที่ 1024 (`asset-form.tsx:1501` `lg:left-[calc(16rem+1.5rem)]` เทียบ `layout/sidebar.tsx:292` `lg:w-16`) · ล้นขวาเท่าความกว้าง scrollbar · กว้างกว่าฟอร์ม 8px ที่ 640–1023 · กระโดดตอน sidebar เปลี่ยนขนาด · ทับ home indicator
- ลำดับบนมือถือเปลี่ยน: เดิมปุ่มบันทึกอยู่บน (`flex-col-reverse`) ใหม่อยู่ล่าง (K8)
- `/assets/new` ยังมี 2 แบบในหน้าเดียว: ฟอร์มทีละรายการใช้แถบนี้ ฟอร์มเป็นชุดคงปุ่มท้ายฟอร์ม `asset-batch-form.tsx:1064` (K14 ระบุแค่ 2 ฟอร์ม)

**ฟอร์มตั้งค่า** (`admin/system-settings-form.tsx` · ชุด 1f)
- `:2099-2116` →

```tsx
<StickyFormFooter
  status={
    <>
      <p className="text-sm font-semibold text-foreground">
        {changedCount > 0 ? labels.unsavedChanges.replace("{count}", String(changedCount)) : labels.noUnsavedChanges}
      </p>
      <p className="mt-1 hidden text-meta text-muted-foreground sm:block">{labels.settingsOverviewDescription}</p>
    </>
  }
>
  <Button type="submit" busy={saving} disabled={changedCount === 0}>
    <Save />
    {labels.save}
  </Button>
</StickyFormFooter>
```

- บนมือถือซ่อนบรรทัดคำอธิบาย แถบจึงสูงประมาณ 1 + 12 + 20 + 12 + 44 + 12 = 101px (แถบเดิมสูงเกิน 120px และคำอธิบายขึ้น 2 บรรทัดบนจอแคบ) (ข้อตัดสินย่อย 12)
- ต้องลง K15 (ข้อ 6.9) ในชุดเดียวกัน ไม่อย่างนั้นแถบใหม่ก็ยังอยู่ใต้เมนูล่าง (G11b)

### 6.9 ซ่อนเมนูล่างในหน้าฟอร์ม (K15)

`focusTaskRoutes` อยู่ที่ `src/lib/mobile-field-navigation.ts:16-24` · `dashboard-shell.tsx:26-27` ใช้ค่านี้ซ่อน `MobileFieldNavigation` และเอา padding `pb-[calc(5.25rem+env(safe-area-inset-bottom))]` ออก · แถบบน (`topbar.tsx:132`) แสดงปุ่มเมนูแทน

```ts
const focusTaskRoutes = [
  /^\/asset-management\/(?:checkout|checkin|transfer|bulk-move)$/,
  /^\/assets\/new$/,
  /^\/assets\/(?!labels(?:\/|$))[^/]+(?:\/(?:edit|label))?$/,
  /^\/audit\/rounds\/new$/,
  /^\/audit\/rounds\/[^/]+(?:\/scan)?$/,
  /^\/maintenance\/(?!pm$)[^/]+$/,                        // เดิม /^\/maintenance\/[^/]+$/ จับหน้ารายการ PM ด้วย
  /^\/disposal\/(?:new|batch\/new|(?!batches$)[^/]+)$/,   // เดิมจับหน้ารายการ /disposal/batches ด้วย
  // K15: หน้าตั้งค่า และฟอร์ม new / [id]/edit ของผู้ใช้ บทบาท แผน PM และข้อมูลหลัก
  /^\/admin\/settings$/,
  /^\/(?:admin\/(?:users|roles)|maintenance\/pm|master-data\/(?:brands\/models|[^/]+))\/(?:new|[^/]+\/edit)$/,
]
```

25 route ที่เปลี่ยนเป็น focus (ตรวจกับโฟลเดอร์ `src/app/[locale]/(dashboard)` แล้ว):
- `/admin/settings`
- `/admin/users/new` · `/admin/users/[id]/edit` · `/admin/roles/new` · `/admin/roles/[id]/edit`
- `/maintenance/pm/new` · `/maintenance/pm/[id]/edit`
- `/master-data/{branches, brands, brands/models, categories, companies, departments, employees, locations, suppliers}/new` และ `/[id]/edit` (18)

ยังเป็น navigation: หน้ารายการทุกหน้า · `/master-data/employees/[id]`, `/master-data/suppliers/[id]` (หน้ารายละเอียด) · `/admin/data-quality` · `/admin/integrations` · `/asset-management/labels` · `/asset-management/scan` · และกลับเป็น navigation 2 หน้า: `/maintenance/pm` · `/disposal/batches`

ลงใน commit เดียวของชุด 1f ทั้ง 25 route (ข้อ 8.14 ข้อ 16) · **ก่อน commit** เปิด `/th/admin/settings` บนแอป dev ที่ 375 และ 768 จด G11b (เมนูล่างทับแถบบันทึกหรือไม่) · หลัง commit ดูว่าเมนูล่างหายใน 25 route และยังอยู่ในหน้ารายการ

### 6.10 `ActionBar` (K23 · O11 · ชุด 5 หลัง 2B merge)

ไฟล์ใหม่ `src/components/ui/action-bar.tsx` แทน `ui/mobile-action-bar.tsx` และ `disposal/disposal-mobile-action-bar.tsx` (ลบทั้ง 2 ไฟล์) · ไม่มี `"use client"` และไม่มี hook

```tsx
export type ActionBarLink = {
  label: string
  href: string
  icon?: React.ReactNode
  primary?: boolean
  disabled?: boolean
}
export function ActionBar({ actions, primaryAction }: {
  actions: ActionBarLink[]
  primaryAction?: React.ReactNode // ปุ่มของขั้นถัดไปที่วางเต็มแถวบนสุด (หน้ารายละเอียดตัดจำหน่าย)
}): React.JSX.Element

// ระยะล่างที่หน้าต้องเว้นให้แถบ (รวม home indicator) · วางคู่กับแถบในไฟล์เดียวกัน (O11)
export const actionBarPagePadding = {
  single: "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0",
  withPrimary: "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0",
} as const
```

| ส่วน | class / กติกา |
|---|---|
| กล่อง (`data-slot="action-bar"`) | `fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden` (เดิมของทั้ง 2 ไฟล์) |
| แถวใน | `mx-auto grid min-w-0 max-w-lg gap-2` |
| ช่องปุ่มหลัก | `{primaryAction ? <div className="min-w-0 [&>button]:w-full">{primaryAction}</div> : null}` |
| แถวลิงก์ | `cn("grid min-w-0 gap-2", getMobileActionGridClass(visibleActions.length))` · `visibleActions = actions.slice(0, primaryAction ? 3 : 4)` (คง 1–4 คอลัมน์) |
| ลิงก์ | `<Link className={cn(buttonVariants({ variant: action.primary ? "default" : "outline", size: "sm" }), "min-w-0 px-2")}>{action.icon}<span className="min-w-0 truncate">{action.label}</span></Link>` |
| ลิงก์ที่ใช้ไม่ได้ | `<a role="link" aria-disabled="true" className={…class เดียวกัน…}>` ไม่มี `href` · ได้หน้าตา `aria-disabled:` ของ 2A |

- `size="sm"` ต่ำกว่า md สูง 44 (`min-h-11`) ตัวหนังสือ `text-meta` 13/20 · แก้ `text-xs leading-tight` (1.25 เท่า ต่ำกว่าเกณฑ์ไทย 1.44) ของ `mobile-action-bar.tsx:24, :34` และ `disposal-mobile-action-bar.tsx:29`
- ลิงก์ที่ใช้ไม่ได้เดิมเป็น `<span aria-disabled>` ที่โปรแกรมอ่านจอไม่รู้ว่าเป็นลิงก์ (`mobile-action-bar.tsx:22-29`)
- ปุ่มหลักมาจาก flag `primary` เท่านั้น · กติกาเดิมของหน้าตัดจำหน่าย "ลิงก์แรกเป็นปุ่มหลักเมื่อไม่มี `primaryAction`" (`disposal-mobile-action-bar.tsx:30`) ย้ายไปที่หน้า
- แบบ ⋯ ของต้นแบบ (`screens/mobile.html:61`, `:220-224`) ไปเฟส 3

4 หน้า (ไฟล์ของ 2B ทำหลัง 2B merge · commit เดียวกับ `ActionBar`)

| หน้า (`src/app/[locale]/(dashboard)/…`) | import | padding | ที่เรียก |
|---|---|---|---|
| `assets/[id]/page.tsx` | `:50` | `:882` `"space-y-6 pb-24 md:pb-0"` → `` {`space-y-6 ${actionBarPagePadding.single}`} `` | `:989` `<ActionBar actions={mobileActions} />` |
| `audit/rounds/[id]/page.tsx` | `:16` | `:408` `"pb-24 md:pb-0"` → `{actionBarPagePadding.single}` | `:474` |
| `maintenance/[id]/page.tsx` | `:15` | `:105` → `single` | `:142` |
| `disposal/[id]/page.tsx` | `:14` | `:170` `"space-y-6 pb-36 md:pb-0"` → `withPrimary` | `:222` `<ActionBar primaryAction={nextActionControl} actions={[…]} />` · ลิงก์แรก (`:225`) ใส่ `primary: !nextActionControl` |

ระยะใหม่ = ระยะเดิม (96px / 144px) + ความสูง home indicator · หน้าอื่นที่มี `pb-24 md:pb-0` แต่ไม่มีแถบ (`disposal/batches/[id]`, `master-data/employees/[id]`, `master-data/suppliers/[id]`, `my-assets/[id]`) ไม่ใช่ของส่วนนี้

### 6.11 Test

**ตาราง A: test เดิมที่ต้องแก้** (แก้ใน commit ที่ทำให้พัง)

| test:บรรทัด | ตอนนี้ | ใหม่ | ชุด |
|---|---|---|---|
| `asset-form-sticky-actions.test.ts:7-17` | `pb-36 sm:pb-24` · `fixed bottom-3` · `lg:left-[calc(16rem+1.5rem)]` · `bg-surface/95` · `backdrop-blur` · `sm:flex-row sm:items-center sm:justify-end` · `<Save className="h-4 w-4" />` | ชื่อ test "asset form keeps save actions in a sticky form footer" · match `/<StickyFormFooter>/` และ `/<form onSubmit=\{handleSubmit\} className="space-y-5">/` · doesNotMatch `/fixed bottom-3\|lg:left-\[calc\|bg-surface\/95\|backdrop-blur\|pb-36 sm:pb-24/` | 1e |
| `asset-form-sticky-actions.test.ts:19-26` | `disabled={saving \|\| isProtectedStatusChange \|\| …}` | match `/busy=\{saving\}/` และ `/disabled=\{isProtectedStatusChange \|\| duplicateState\.checking \|\| duplicateState\.assetTagExists \|\| duplicateState\.serialNumberExists\}/` · doesNotMatch `/disabled=\{saving/` | 1e |
| `audit-scan-check-ui.test.ts:22` | `disabled={saving \|\| disabled \|\| missingPhoto}` | `/busy=\{saving\}/` + `/disabled=\{disabled \|\| missingPhoto\}/` (`:23` variant ผ่านต่อ) | 1d |
| `asset-transaction-cancellation-ui.test.ts:13` | `/min-h-11/` (จะไม่เหลือในไฟล์) | `/<Button[\s\S]*?variant="danger"/` (trigger) + `/busy=\{saving\}/` | 4 |
| `login-form-ui.test.ts:29` | `aria-busy={loading}` | `/<Button[\s\S]*?type="submit"[\s\S]*?busy=\{loading\}/` · doesNotMatch `/aria-busy=/` | 4 |
| `login-form-ui.test.ts:30` | `loading ? t("loggingIn") : t("login")` | `/\{t\("login"\)\}/` · doesNotMatch `/t\("loggingIn"\)/` (`:49`, `:52` คง) | 4 |
| `mobile-field-navigation.test.ts:13-26` | รายการ navigation | เพิ่ม `/th/maintenance/pm` · `/th/disposal/batches` · `/th/disposal/batches/batch-1` · `/th/admin/users` · `/th/admin/roles` · `/th/admin/data-quality` · `/th/admin/integrations` · `/th/master-data/brands` · `/th/master-data/employees/employee-1` · `/th/master-data/suppliers/supplier-1` | 1f |
| `mobile-field-navigation.test.ts` (test ใหม่ต่อจาก `:46`) | — | "form routes hide the field navigation (K15)": ทั้ง 25 route (ใช้ id ตัวอย่าง เช่น `/th/master-data/brands/models/model-1/edit`) ได้ `"focus"` · ลอง `/en/…` 1 ตัว | 1f |
| `visual-foundation-guards.test.ts:266` | `"…/system-settings-form.tsx": 2, // label preview; sticky save bar shadow-lg → StickyFormFooter (2C)` | `"…/system-settings-form.tsx": 1, // label preview` | 1f |
| `visual-foundation-guards.test.ts:267` | `"…/asset-form.tsx": 1, // sticky save bar …` | ลบบรรทัด | 1e |
| `visual-foundation-guards.test.ts:91` | path ของ 2 แถบเก่า | `["src/components/ui/action-bar.tsx"]` (regex `:92` เดิม · ไม่เพิ่ม path ของ `sticky-form-footer` ที่นี่ ตามข้อ 8.2 กฎ 6 · test ของ primitive ตรวจแทน) | 5 |
| `mobile-action-bar.test.ts:17` | อ่าน `ui/mobile-action-bar.tsx` | อ่าน `ui/action-bar.tsx` · `:19-20` เดิมผ่าน | 5 |
| `audit-scan-search-ui.test.ts:182` | อ่าน `ui/mobile-action-bar.tsx` | อ่าน `ui/action-bar.tsx` · `:187` ผ่าน · `:188` (string ของ helper ที่ไม่มีคนเรียก) ไม่แตะ | 5 |
| `disposal-detail-workspace.test.ts:35` | `/<DisposalMobileActionBar/` | `/<ActionBar/` | 5 |
| `disposal-detail-workspace.test.ts:42` | อ่าน `disposal/disposal-mobile-action-bar.tsx` | อ่าน `ui/action-bar.tsx` · `:44`, `:46-48` ผ่าน | 5 |

ผ่านต่อโดยไม่แก้ (ตรวจแล้ว): `settings-depreciation-policy-ui.test.ts:55-57` (`disabled` ของ builder คงไว้) · `supplier-form-ui.test.ts:13` (`min-h-11` ที่ `supplier-form.tsx:40`) · `disposal-bulk-execution-ui.test.ts:33` และ `disposal-bulk-approval.test.ts:92` (`min-h-11 min-w-11` ฝั่งรายการของ 2B) · `confirm-text-dialog-ui.test.ts:11` และ `disposal-detail-workspace.test.ts:77` (`busy=` ของ `AccessibleDialog`) · `asset-operation-confirmation-ui.test.ts:31` (`<Button`) · `legacy-checkin-flow.test.ts:63` (key คงไว้) · `audit-scan-room-ui.test.ts:59` (อ่าน `audit-scan-room-list.tsx` ไม่ใช่ไฟล์ที่แก้) · `disposal-bulk-execution-ui.test.ts:31` (`<footer … sticky bottom-0`) เป็นของส่วน dialog

**ตาราง B: test ใหม่**

| ไฟล์ | ตรวจ | ชุด |
|---|---|---|
| `tests/sticky-form-footer-ui.test.ts` | source ไม่มี `"use client"` และ hook · มี `sticky -bottom-4`, `sm:-bottom-6`, `-mx-4`, `sm:-mx-6`, `border-t border-border bg-surface`, `pb-[max(0.75rem,env(safe-area-inset-bottom))]`, `sm:flex-row sm:items-center sm:justify-between`, `data-slot="sticky-form-footer"` · ไม่มี `shadow-`, `fixed`, `backdrop-blur`, `bg-surface/` · `asset-form.tsx` และ `system-settings-form.tsx` มี `<StickyFormFooter` · settings ไม่มี `sticky bottom-3` · ใน settings `<StickyFormFooter` อยู่หลัง `<form onSubmit={handleSubmit}` และก่อน `</form>` ตัวแรกที่ตามมา | 0d (ไฟล์ primitive) · ขยายใน 1e, 1f |
| เพิ่มใน `tests/mobile-action-bar.test.ts` | `existsSync` ของ `ui/mobile-action-bar.tsx` และ `disposal/disposal-mobile-action-bar.tsx` เป็น `false` · `action-bar.tsx` มี `buttonVariants({ variant: action.primary ? "default" : "outline", size: "sm" })`, `role="link" aria-disabled="true"`, `fixed inset-x-0 bottom-0`, `md:hidden`, `primaryAction` · ไม่มี `leading-tight`, `text-xs`, `bg-muted` · `actionBarPagePadding` ทั้ง 2 ค่ามี `env(safe-area-inset-bottom)` และ `md:pb-0` · 4 หน้ามี `<ActionBar` และ `actionBarPagePadding.` และไม่มี `pb-24 md:pb-0` / `pb-36 md:pb-0` · หน้าตัดจำหน่ายมี `primary: !nextActionControl` | 5 |
| เพิ่มใน `tests/form-migration-guards.test.ts` (ไฟล์ของข้อ 8.4) | G2, G5, G6 ด้านล่าง | 0d แล้วขยายทุกชุดย่อย |

**เงื่อนไข guard** (ข้อ 8.4 ให้ส่วนที่ถือ K13 เขียน G2 · G5 และ G6 เป็นข้อเสนอเพิ่มของส่วนนี้ ถ้าเลขชนกับส่วนอื่นให้เลื่อน)
- **G2 busy ไม่ทำโฟกัสหลุด** · ทุก opening tag ใน `src/**/*.tsx` ที่มีทั้ง `busy={A}` และ `disabled={B}`: B ต้องไม่มี A เป็นลำดับ token เดียวกัน (เทียบแบบมีขอบคำ เช่น A = `saving` ห้าม B = `saving || x` แต่ `savingDraft` ไม่นับ) · ไม่ห้ามตัวแปรเดียวกันที่เทียบคนละค่า (#26, #27) · ที่ HEAD ผ่านอยู่แล้ว (0 tag) · อ่าน tag ด้วยตัวอ่านที่ข้าม `{…}` ของข้อ 8.4 G4
- **G5 ไม่สลับป้ายตอน busy (K13)** · 9 ไฟล์ในตาราง 6.5.2 ไม่มี `labels.saving`, `labels.installing`, `labels.removing`, `labels.submitting`, `labels.importing`, `translations.recordingPrint`, `t("legacyReturnCreating")`, `t("batchCheckDuplicatesRunning")`, `t("loggingIn")`, `` `${labels.chooseFile}...` `` · เปิดใช้ทีละไฟล์ตามชุดที่แปลง
- **G6 `Loader2` budget** · ไฟล์ใน `migratedFiles` มี `<Loader2` ไม่เกินค่าที่ข้อ 6.5.3 ให้ไว้ (ไฟล์ที่ไม่อยู่ในรายการ = 0) · ลดได้ เพิ่มไม่ได้

### 6.12 เอกสาร (ทำในงานเอกสารของ 2C · ส่วนนี้ให้รายการ)

| ที่ | แก้ |
|---|---|
| `docs/superpowers/specs/2026-10-11-ui-phase2a/04-buttons.md:203` | ประโยค "การแปลงห้ามเปลี่ยนความสูงบนจอใหญ่ ความสูงจะรวมเป็นแบบเดียวกันตอนพลิกใน 2D" → "ใช้ size ตามตารางนี้ · ปุ่มที่วันนี้สูง 44px บนจอใหญ่ (`min-h-11` อย่างเดียว) เหลือ 40px ใน 2C และ 36px หลังพลิกใน 2D (K7 ของ 2C)" |
| `…/04-buttons.md:211` | `min-h-11` อย่างเดียว → "ไม่ระบุ (`default`) รวมส่วนท้าย dialog (K7)" |
| `…/04-buttons.md:129` | "ข้อความอย่าง "กำลังบันทึก…" ยังเป็นหน้าที่ของผู้เรียก" → "ป้ายคงเดิมตอน busy ไม่สลับเป็น "กำลัง…" (K13 ของ 2C)" |
| `DESIGN.md:356` (Busy) | ประโยคสุดท้าย "The caller still writes the label ("กำลังบันทึก…")" → "The label does not change while busy (no "กำลัง…" text)" · "Do not pass `disabled` with `busy`" → "`disabled` may hold other conditions but never the busy one" |
| `DESIGN.md:360` (Hand-written buttons) | "Moving one must not change its desktop height" → ตามแถวแรกของตารางนี้ |
| `DESIGN.md` Buttons (เพิ่ม) | `StickyFormFooter` สำหรับฟอร์มยาว · `ActionBar` บนหน้ารายละเอียด · ลำดับปุ่ม K8 · ไอคอนลบแบบกลางเป็น `outline` และ `warning` ใช้กับยืนยัน "ไม่พบ" 2 จุด (K22) |
| `DESIGN.md:320` | เอา "the 2 sticky save bars (2C)" ออกจากรายการเงารอเจ้าของ · budget R2 เหลือ 10 จุด |
| `DESIGN.md:514-515` | ระบุว่าหน้าตั้งค่าและฟอร์ม new/edit ทุกหน้าเป็น focus-task route |
| changelog และ wiki `AssetSystem` | ตามงานเอกสารของ 2C |

### 6.13 ข้อความใหม่

ไม่มี key ใหม่ · `StickyFormFooter` และ `ActionBar` ไม่มีข้อความของตัวเอง · K13 ทำให้ 10 key/prop ไม่มีคนอ่าน (ตาราง 6.5.2) แต่คงไว้ · 2D ลบพร้อม test ที่ยึด (`login-form-ui.test.ts:49`, `:52` · `legacy-checkin-flow.test.ts:63`)

### 6.14 นอกส่วนนี้

| เรื่อง | ของ |
|---|---|
| `AccessibleDialogBody` / `AccessibleDialogFooter` · ลำดับปุ่มใน dialog บนมือถือ · Cancel ที่รู้ busy · footer sticky 2 จุด (`system-settings-form.tsx:1464`, `disposal-bulk-execution.tsx:939`) · `<form>` ซ้อนใน dialog คำนำหน้ารหัส | ส่วน dialog (K8, K9) |
| ปุ่มปิด X · `DialogFooter` "Close" (`ui/dialog.tsx:120`) | ส่วน dialog (K10) |
| `AlertDialog` / `useConfirm` · `alert-dialog.tsx:94` · dialog ลบไฟล์แนบงานซ่อม | ส่วน dialog (K12) และข้อ 8 |
| ปุ่มแสดงรหัสผ่าน `login-form.tsx:107` · ไอคอนในช่องของ `disposal-asset-picker.tsx:57`, `:62` · `disabled:opacity` ของช่อง | ส่วนช่องกรอก |
| ปุ่มเลือกแบบ segmented/แท็บ (`system-settings-form.tsx:942`, `:2547`, `asset-create-workspace.tsx:21, :30` ฯลฯ) | P0 / 2B (ข้อ 8) |
| แถวหัวข้อเปิดปิด `audit-scan-check-form.tsx:235`, `:261` · `repair-record-form.tsx:188` | ไม่แปลงใน 2C (เป็นหัวข้อพับได้ทั้งแถว ไม่ใช่ปุ่มคำสั่ง) |
| ลิงก์กลับที่หัวหน้าฟอร์ม 14 จุด | 2B (O16) |
| ปุ่มอื่นในไฟล์เดียวกันที่อยู่นอกฟอร์มและ dialog (การ์ดไฟล์แนบ ปุ่มแถว) · ค่าตั้งต้น 36 · ลบ `ActionButton` (เหลือ 7 ปุ่มหลัง 2C) | 2D |
| แบบ ⋯ ของ `ActionBar` | เฟส 3 |

### 6.15 ข้อตัดสินย่อย

1. **size ดูจากความสูง variant ดูจากหน้าตา แยกกัน** · ย15 ของ 2A เขียน "`danger` + `icon-sm`" เพราะไอคอนแดงส่วนใหญ่สูง 32 · ไอคอนแดงที่สูง 40 (#96, #122) จึงเป็น `danger` + `icon`
2. **`lg` ไม่มีผู้ใช้ใน 2C ฝั่งปุ่ม** · ไม่มีปุ่มข้อความแถวเดียวกับช่อง 40px · ปุ่มไอคอน 7 ปุ่มที่อยู่แถวช่องบันทึกไว้ให้ 2D
3. **กริด 3 จุดใช้คอลัมน์ `auto` แทน 40px** + `justify-self-start` ที่ปุ่ม · ไม่ต้องเพิ่ม size ไอคอนใหม่
4. **ลิงก์ใช้ `buttonVariants` ไม่ใช้ `asChild`** · ทำงานทั้ง server และ client และเหมือนที่ 2A ทำกับหัวหน้ารายละเอียดทรัพย์สิน (ย27)
5. **`busy` ใช้กับปุ่มที่เป็นตัวสั่งงานเองทุกปุ่ม** แม้ไม่มี `Loader2` (#4, #5, #74, `ui/` 2 ปุ่ม) · ปุ่มรองที่ปิดระหว่างบันทึก (Cancel, ปุ่มเพิ่มไฟล์ #62, #64) คง `disabled`
6. **K13 ไม่ลบ key และ prop** · ลดงานในหน้า server และไม่ต้องแก้ `legacy-checkin-flow.test.ts:63`, `login-form-ui.test.ts:49`, `:52` · 2D ลบทีหลัง
7. **ปุ่มเตือนพื้น `warning-soft` (ย17) คงรูปไอคอนเดิมและใส่ `text-warning`** · รูปไอคอนบอกว่าปุ่มทำอะไร สีบอกว่าต้องระวัง · ไม่เปลี่ยนเป็น `AlertTriangle` ทุกจุด
8. **ไอคอนลบแบบกลาง (K22) ไม่แดงตอน hover อีก** · ไม่ใส่สีทับใน className (className คงแค่ layout ตามข้อ 4.8 ของ 2A)
9. **ลบ class ขนาดของไอคอน** ใช้ 16px ของ `Button` ทุกปุ่ม (รวมไอคอน 14px เดิมของ #126, #38 และ trigger บางตัว)
10. **`#87` คง `shadow-sm`** เพราะลอยบนรูป และ budget R2 ของ `audit-scan-check-form.tsx` (1) นับตัวนี้อยู่
11. **แถวท้ายฟอร์ม F1 ไม่เปลี่ยนเป็นแนวตั้งบนมือถือ** · K8 ระบุ dialog แถบบันทึก 2 แถบ และ `AlertDialog` · F1 มีปุ่มหลักท้ายสุดอยู่แล้ว และ "ยกเลิก"/"บันทึก" วางคู่กันได้ที่ 320
12. **`StickyFormFooter` ใช้ `-bottom-4 sm:-bottom-6` แทน `bottom-0` ตามตัวอักษรของ K14** เพื่อชิดขอบจอจริง (`main` มี padding ล่าง) · ใช้ `border-border` ไม่ใช่ `border-border-soft` เพราะการ์ดสีขาวเลื่อนผ่านใต้แถบสีขาว เส้นอ่อนจะมองไม่เห็น · `z-10` · ซ่อนคำอธิบายของหน้าตั้งค่าบนมือถือ
13. **ปุ่มบันทึกหน้าตั้งค่าคง `disabled={changedCount === 0}`** (เป็นสีเทา) · บรรทัดสถานะข้างปุ่มบอกเหตุผล
14. **K15 เขียนเป็น regex 2 ตัว** และแก้ regex เดิม 2 ตัวไม่ให้จับหน้ารายการ `/maintenance/pm` (ข้อ 8.14 ข้อ 16) และ `/disposal/batches` (เพิ่มเองในส่วนนี้ ตามหลัก "หน้ารายการคงแถบล่าง" ของ Q4)
15. **`ActionBar` เป็นไฟล์ใหม่ชื่อตรงกับ component** ลบไฟล์เก่าทั้ง 2 · ใช้ `size="sm"` · ลิงก์ที่ใช้ไม่ได้เป็น `<a role="link" aria-disabled="true">` · ใส่ `mx-auto max-w-lg` ทั้ง 2 แบบ (เดิมมีแค่ของตัดจำหน่าย)
16. **padding ของ 4 หน้าอยู่ในไฟล์เดียวกับแถบ** (`actionBarPagePadding`) และบวกความสูง home indicator · ไม่ใช้ `getMobileSafeBottomPaddingClasses()` (`design-system.ts:112`) เพราะสลับที่ `sm:` ไม่ใช่ `md:` ที่แถบหาย
17. **ลิงก์บนพื้นเตือนขีดเส้นใต้ตลอด** (`decoration-current`) ส่วนลิงก์ในเซลล์ตารางใช้ `linkVariants` ตามปกติ
18. **trigger 13 ปุ่มแปลงใน 2C · 7 ปุ่มเป็นของ 2B** ตาม O1, O4, O21
19. **ปุ่มนำเข้า `:112` เป็นปุ่มจริง (`outline`)** · แถวหัวข้อพับได้ 3 แถวไม่แปลง (P7 ของ critic ไม่ได้อยู่ในข้อตัดสินที่อนุมัติ)
20. **บรรทัดสถานะที่มี `Loader2` 7 จุดได้ `motion-reduce:animate-none`** ใน commit ของไฟล์นั้น (แก้ class เดียวต่อจุด)
21. **ป้ายยาวคง `whitespace-nowrap`** · ป้ายที่ยาวที่สุด (`disposal-execution-button.tsx:237` 30 ตัวอักษร · `checkin-form.tsx:382`) อยู่ในปุ่มเต็มความกว้างบนมือถือ ยังพอที่ 320 · ยกเว้น #15 ที่เป็นรายการแม่แบบ
22. **#111, #112 ไม่แปลงในชุด 1a** ตามข้อ 8.14 ข้อ 7 (ชุด 5 แทน dialog ทั้งตัว)

### 6.16 ความเสี่ยง

1. **ตำแหน่ง sticky ขึ้นกับ padding ของ `main`** · `-bottom-4 sm:-bottom-6` อิงพฤติกรรมเดียวกับช่องค้นหาตรวจนับที่ใช้งานจริงอยู่ · ถ้าบนแอป dev แถบลอยหรือถูกตัด ให้ปรับค่า offset ที่ไฟล์เดียว · ต้องดูที่ 375, 768, 1024 (sidebar พับและกาง), 1440 และบน iPhone จริง (home indicator)
2. **โฟกัสหลุดถ้าแยกเงื่อนไขพลาด** · 18 + 2 ปุ่มต้องแยก `disabled` · G2 จับได้ทุกไฟล์ใน `src`
3. **ปุ่มหลักที่กดไม่ได้เป็นสีเทา** (93 ปุ่มเลิกจางด้วย opacity) · ปุ่มบันทึกทรัพย์สินตอนตรวจรหัสซ้ำและปุ่มบันทึกหน้าตั้งค่าดู "ปิด" ไม่ใช่ "กำลังทำ" · มีข้อความเหตุผลอยู่ใกล้ปุ่มแล้ว ต้องดูบนแอป
4. **ความสูงเปลี่ยนทั้งจอ** · จอใหญ่ 55 ปุ่มจาก 44 เหลือ 40 · มือถือ 58 ปุ่มสูงขึ้นเป็น 44 · 34 ปุ่มสูงขึ้นที่ 640–767 · แปลงทั้งแถวพร้อมกันเสมอ ห้ามแปลงปุ่มเดียวของคู่
5. **ลำดับปุ่มบนมือถือของฟอร์มทรัพย์สินกลับด้าน** (บันทึกย้ายลงล่าง) ผู้ใช้ที่ชินอาจกดยกเลิกแทน · ยกเลิกของฟอร์มทรัพย์สินเป็นลิงก์ที่ออกจากหน้าทันทีโดยไม่ถาม (ฟอร์มผู้ขายถามก่อนผ่าน `confirmNavigation`) · ดูบนมือถือจริงในประตู deploy
6. **เมนูล่างหายใน 25 route** · ออกจากฟอร์มต้องใช้ปุ่มกลับ ปุ่มยกเลิก หรือเมนูบนแถบบน · ถูกตาม DESIGN.md:514-515 แต่เปลี่ยนสิ่งที่ผู้ใช้เห็นทันทีที่ประตู deploy
7. **ไฟล์ร่วมกับ 2B** · `asset-register-table.tsx` (#71, #72) · `disposal-bulk-*` (#98–#104) · 4 หน้าของ `ActionBar` · `visual-foundation-guards.test.ts:91`, `:266-267` · ฝ่ายที่ merge ทีหลัง rebase (ข้อ 8.2)
8. **ปุ่มที่ไอคอนหมุนอยู่หน้าข้อความกว้างขึ้น 22px ตอน busy** (9 ปุ่มใน 152 + #4, #74 และปุ่มนอก 152 บางปุ่ม) · แถวที่ชิดขวาจะขยับเล็กน้อย
9. **ghost บนพื้น `bg-background`** · #89 (ghost เดิมใน sheet แผ่นตรวจที่พื้น `bg-background`) hover มองไม่เห็น ถ้าส่วน dialog ไม่เปลี่ยนพื้น sheet
10. **ลิงก์ในประโยคใช้สีแยก** · ลิงก์ `inherit` บนพื้นปกติแยกด้วยสีอย่างเดียวจนกว่าจะชี้ (ตามต้นแบบ) · 2 จุดบนพื้นเตือนแก้ด้วยเส้นใต้แล้ว จุดอื่นเป็นของ 2D

ไฟล์ที่แก้ในส่วนนี้ (นอกจากไฟล์ของปุ่มในตาราง 6.3 และ 6.4): `src/components/ui/sticky-form-footer.tsx` (ใหม่) · `src/components/ui/action-bar.tsx` (ใหม่) · ลบ `src/components/ui/mobile-action-bar.tsx` และ `src/components/disposal/disposal-mobile-action-bar.tsx` · `src/lib/mobile-field-navigation.ts` · 4 หน้าในข้อ 6.10 · test ในข้อ 6.11 · เอกสารในข้อ 6.12
