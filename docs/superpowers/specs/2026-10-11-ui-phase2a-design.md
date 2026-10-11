# รากฐานคอมโพเนนต์กลาง (UI รอบ 4 เฟส 2A) — Design

วันที่ 2026-10-11 · ฐาน `master` `081d538` (เฟส 1 merge แล้ว ยังไม่ deploy) · branch ที่จะใช้ `feat/ui-phase2a`

เฟส 2 แบ่งเป็น 4 งานย่อย (ผู้ใช้เห็นด้วย 2026-10-11): **2A รากฐาน → (2B หน้ารายการและโครงหน้า ∥ 2C ฟอร์มและ dialog) → 2D กวาดที่เหลือและล็อก guard** แต่ละงานย่อยมีสเปก → plan → ทำ ของตัวเอง เอกสารนี้คือ 2A

ข้อมูลที่ใช้ร่าง: แผนที่โค้ดเฟส 2 (8 ส่วน) · ร่าง 7 ส่วน · การตรวจรวม (integration critic) ที่นับทุกตัวเลขใหม่ที่ `081d538`

## 1. เป้าหมายและหลักฐาน

วันที่ 2026-10-11 · ฐาน `master` `081d538` (เฟส 1 merge แล้ว แต่ยังไม่ deploy)
- ต้นแบบ: `docs/superpowers/specs/2026-10-10-ui-foundation/` (`base.css` และ `screens/*.html`) · ค่า `:root` ใน `base.css` เป็นชุดสีร่าง ค่าจริงอยู่ใน `src/app/globals.css`
- หน้าเปรียบเทียบที่ผู้ใช้อนุมัติ: https://claude.ai/artifact/J83YFzhvmmpyCd8JHKZ2nw (ข้อ 7 บนหน้านั้นอธิบายมุมของต้นแบบผิด · ผู้ใช้เลือกใหม่ให้ตามต้นแบบจริง ดู D7 และ I15)

เฟส 2 (คอมโพเนนต์กลาง) แบ่งเป็น 4 งานย่อย เรียงแบบนี้: **2A → (2B ∥ 2C) → 2D**

2A (เอกสารนี้) ทำ 3 อย่าง:
- วาง token ที่เฟส 2 ยังขาด
- ปรับของกลางในไฟล์เดิม ทุกหน้าที่ใช้ของกลางจึงเปลี่ยนตามเอง
- กวาด class ที่เขียนซ้ำทั้งแอปด้วยสคริปต์ 4 ชุด

2A ไม่จัดหน้าใหม่ ไม่เพิ่มหน้า และไม่แตะฐานข้อมูล

พอ 2A ลงแล้ว 2B (หน้ารายการและโครงหน้า) กับ 2C (ฟอร์มและ dialog) ทำพร้อมกันได้โดยไม่ต้องแก้ token อีก

สิ่งที่พบในโค้ด (`081d538`):

| เรื่อง | หลักฐาน |
|---|---|
| ขนาดตัวอักษรมีแค่ 12 กับ 14 | เส้นทางนำทาง บรรทัดรอง หัวตาราง และคำอธิบายใต้ช่อง ต้องเลือกระหว่างตัวที่เล็กเกินกับตัวที่เท่าเนื้อหา · ต้นแบบใช้ 13/20 |
| placeholder ไม่ผ่าน AA | ค่าตั้งต้นของ preflight ได้ประมาณ #858E9A: 3.32:1 บนขาว และ 3.25:1 บน `--background` · มี `placeholder=` 108 บรรทัดใน 56 ไฟล์ · ตั้งสีเอง 13 บรรทัดใน 10 ไฟล์ |
| ปุ่ม | `Button` 17 จุดใน 11 ไฟล์ · `ActionButton` 9 ปุ่มใน 4 ไฟล์ · ปุ่มที่เขียน class เอง 413 จุดใน 126 ไฟล์ (สแกน ±5%) สูง 32/36/40/44 ปนกัน · `disabled:opacity-*` 147 บรรทัดใน 62 ไฟล์ · `Loader2` 149 บรรทัดใน 58 ไฟล์ ในนั้นมี `motion-reduce` แค่ 2 บรรทัด · ยังไม่มีปุ่มอันตรายแบบเส้นขอบ |
| เมนู | `<DropdownMenu` 7 เมนูใน 6 ไฟล์ · รายการที่ปิดไว้ใช้ `opacity-50` ทำให้บรรทัดเหตุผลเหลือ 2.43:1 และกดลูกศรไปไม่ถึง · ธงอีโมจิ 2 บรรทัด (`topbar.tsx:246,249`) · aria-label ภาษาอังกฤษ 5 จุด (`topbar.tsx:130,139-140,238,261` · `sidebar.tsx:246`) |
| ช่องกรอก | 316 ช่องใน 70 ไฟล์ · 282 ช่องยังใช้ขอบ `border-border` (1.35:1) · ใช้ helper กลาง 10 ช่องใน 6 ไฟล์ · ช่อง disabled ที่ดูเหมือนยังกดได้ 22 ช่อง · ใส่ `aria-invalid` แค่ 6 ช่อง · `FileDropzone` (17 จุด) โฟกัสด้วยคีย์บอร์ดแล้วมองไม่เห็น |
| toast | `richColors` ได้ 3.08–4.35:1 · ไม่มีปุ่มปิด และ Escape แค่หุบกอง toast · ป้ายเป็นภาษาอังกฤษ · `toast.*` 133 จุดใน 47 ไฟล์ · `apiError.toast(` 62 จุดใน 42 ไฟล์ |
| หน้าว่าง | `ActionEmptyState` 29 จุดใน 20 ไฟล์ เป็นกล่องเส้นประที่ซ้อนอยู่ในแผง · ยังไม่มีหน้าว่างแบบบรรทัดเดียว |
| ป้ายสถานะ | ป้ายกลาง 59 จุดใน 22 ไฟล์ แยกเป็น `size="xs"` 50 จุด (บนหน้าไทยสูง 24px) · `sm` 2 จุด + ไม่ระบุ 7 จุด รวม 9 ป้ายที่สูง 32px |
| เส้นทางนำทาง | 11 จุดใน 11 ไฟล์ · `aria-label="Breadcrumb"` · ไม่มี `aria-current` · รหัสถูกตัดด้วย `truncate` |
| ค่าว่างและตัวเลข | `"-"` 156 จุดใน 56 ไฟล์ · `toLocaleString()` ไม่ระบุ locale 44 จุดใน 17 ไฟล์ · `formatCurrency` (มี ฿ นำหน้า) 42 จุดใน 13 ไฟล์ |
| tint เงา และตัวเล็ก | `border-{tone}/NN` 254 จุดใน 71 ไฟล์ · `bg-muted/NN` และ `bg-accent/NN` 123 จุดใน 53 ไฟล์ (อยู่ในหัวตาราง 44 จุด) · `shadow-sm` 238 จุดใน 88 ไฟล์ · `text-[11px]`/`text-[10px]` 10 จุดใน 7 ไฟล์ (ไม่นับป้ายพิมพ์ 1 จุด) |
| กับดักของเครื่องมือ | `cn()` เรียก tailwind-merge 3.5.0 ตรง ๆ: `cn("text-muted-foreground", "text-meta")` ได้แค่ `text-meta` สีหายไป · class ของ token ที่ยังไม่ได้ประกาศ Tailwind 4.2.4 จะไม่สร้าง CSS ให้ และไม่แจ้ง error |

ผู้ใช้เลือก (2026-10-11, "ใช้ตามแนะนำทั้งหมด"):

| # | เรื่อง | เลือก | ค่า |
|---|---|---|---|
| D1 | ขนาดตัวอักษรรอง | `text-meta` | 13px · line-height `calc(20 / 13)` (1.54 เท่า) · หน้าไทยไม่ต้องตั้งค่าเพิ่ม |
| D2 | สีตัวหนังสือจาง | `--faint-foreground` → `text-faint-foreground` | #56677F · ผ่าน AA บนพื้นกลางทุกแบบ (ต่ำสุด 4.95 บน muted) · ใช้กับ placeholder, คำอธิบายใต้ช่อง, หัวตาราง, เส้นทางนำทาง, บรรทัดย่อย และบรรทัดท้ายของตัวเลข · ห้ามใช้บนพื้นสีของสถานะ |
| D3 | ตัวเลขใหญ่ | `text-metric` / `text-count` | metric 28/32 น้ำหนัก 500 ระยะ −0.02em · count 20/24 น้ำหนัก 600 ระยะ −0.01em · ใช้กับตัวเลขเท่านั้น (guard บังคับให้มี `num` คู่กัน) จึงไม่ต้องตั้ง line-height ภาษาไทย |
| D4 | ความสูงปุ่ม | size `sm` / `md` / `lg` | 32 / 36 / 40 ตั้งแต่ `md` ขึ้นไป · ต่ำกว่า `md` สูงอย่างน้อย 44 · 2A แค่เพิ่มขนาดใหม่ ค่าตั้งต้นยังเป็น 40 จนถึง 2D |
| D5 | ขอบปุ่มรอง | `--control-border` | #C3CDDA (1.61:1 เป็นเส้นตกแต่ง เข้มกว่า `border` #D7DEE8 แต่อ่อนกว่า `input` #7C8BA0) |
| D6 | ปุ่มอันตรายที่วางในหน้า | variant ใหม่ `danger` | `border-danger-border bg-surface text-danger hover:bg-danger-soft` · ปุ่มยืนยันใน dialog ยังเป็น `destructive` แบบทึบ |
| D7 | มุมโค้ง (เลือกใหม่ 2026-10-11 ให้ตามต้นแบบจริง) | `--radius-control` → `rounded-control` | 6px เฉพาะ control ขนาดเล็ก: ปุ่ม `sm` 32px · ปุ่มใน segmented · chip · ป้ายสถานะ · ปุ่ม `md`/`lg`/icon และช่องกรอกทุกขนาดคง `rounded-md` 8px · เมนู popover toast แผง 12px (`rounded-lg`) · ไม่เปลี่ยนค่า `rounded-sm` (4px) และ `rounded-md` (8px) |
| D8 | ป้ายสถานะและรหัส | `StatusBadge` ขนาดเดียว · utility `tag` | ป้ายสูง 22px (`h-5.5`) ตัวอักษร 13/20 · `tag` น้ำหนัก 400 + `user-select: all` และห้ามทำตัวหนา (Plex Mono ไม่มีน้ำหนัก 700) |

## 2. ขอบเขต 2A เทียบกับ 2B / 2C / 2D

หลัง 2A ลงแล้ว 2B และ 2C ใช้ token ได้อย่างเดียว ห้ามเพิ่ม token ใน `:root` หรือ `@theme inline` (ข้อ 10 I21)

| เรื่อง | 2A (เอกสารนี้) | 2B หน้ารายการและโครงหน้า | 2C ฟอร์มและ dialog | 2D กวาดที่เหลือและล็อก guard |
|---|---|---|---|---|
| token และตัวอักษร | ทุกอย่างที่เฟส 2 ต้องใช้: สี 5 ตัว · ขนาดตัวอักษร 3 ขนาด · `radius-control` · halo 2 แบบ · `select-chevron` · `tag` · กฎ `::placeholder` · `extendTailwindMerge` | ใช้อย่างเดียว | ใช้อย่างเดียว | ตัด Plex Mono น้ำหนัก 600 |
| ปุ่ม | cva ใหม่ (sm/md/lg · `danger` · disabled ไม่ใช้ opacity · `busy` · `linkVariants`) · ปุ่มกลาง 31 จุด + ลิงก์ 2 ลิงก์ที่หัวหน้ารายละเอียดทรัพย์สิน · ค่าตั้งต้นยังเป็น 40 | ปุ่มในหน้ารายการและหัวหน้าเปลี่ยนเป็น `Button` (ห้ามเปลี่ยนความสูงบนจอใหญ่) · `RowActions` แบบ ช1 | ปุ่มในฟอร์มและ dialog · เปลี่ยน `Loader2` เป็น `busy` · ส่วนท้าย dialog | ปุ่มที่เหลือ · เปลี่ยนค่าตั้งต้นเป็น 36 · ลบ `ActionButton` · ลิงก์ใช้ `linkVariants` |
| เมนู | dropdown / popover / command / `Kbd` · รายการ `unavailable` · `.cbox` · แถบบน (เมนูภาษาเขียนชื่อภาษาเป็นภาษาของตัวเอง ไม่มีธง · aria-label ภาษาไทย) · รายการของ global search และ SearchableSelect | ช1 ต้องใช้ `unavailable` ต่อ · sheet ของแถวบนมือถือ | — | — (เฟส 3: `.menu-foot`, `.cbox.lock`, Ctrl K) |
| ช่องกรอก | primitive ครบชุด ต่อเข้าแค่ 4 จุด: `getFieldControlClasses`, `SearchableSelect`, `ScannerTextInput`, `FileDropzone` | ช่องกรองของหน้ารายการฝั่ง server 33 ช่องใน 12 ไฟล์ · `SearchField` ของทะเบียน | ช่องที่เหลือ · `Field` ที่แต่ละไฟล์เขียนเอง 25 ตัว · select wrapper 16 ตัว · checkbox 49 ตัว · แสดง error ใต้ช่อง | — |
| ป้ายสถานะและรหัส | ป้ายขนาดเดียว (ลบ `size` 52 จุด) · `neutral-ink` · `tag` | ห่อรหัส 79 จุด + ความกว้างคอลัมน์ `assetTag` · ป้ายย้ายเข้า meta ของ PageHeader | — | pill ที่เขียนเองประมาณ 35 จุด (critic G1) · pill สีจากฐานข้อมูล 2 จุด · ลบ `Badge` |
| เส้นทางนำทาง | หน้าตาใหม่ · `common.breadcrumb` · `code: true` 8 จุด | ระยะถึงหัวเรื่องใน PageHeader · ปุ่มกลับ (D10) | — | — |
| ค่าว่างและตัวเลข | `Nil` / `orNil` · `formatCount` / `formatMoney` (2A ยังไม่มีที่ใช้) | ใช้ในตาราง KeyValueList และ StatStrip · แก้ `toLocaleString()` 44 จุด | — | `formatCurrency` ในหน้าพิมพ์ |
| toast และกล่องแจ้ง | `AppToaster` + CSS · `ActionEmptyState` · `EmptyNote` · `Notice` · `toneIcons` · `DataFreshnessBanner` | `TableEmptyRow` 16 แถว · ปุ่มล้างตัวกรองแบบ secondary | `FormContextBanner` · กล่องแจ้งในฟอร์ม · error ตรวจกรอกแสดงใต้ช่อง | กล่องแจ้งประมาณ 80 จุด · กล่องว่างประมาณ 55 จุด · `getEmptyStateClasses` · `AuditScanSavedBanner` |
| codemod | R1 `/NN` 254 จุด · R7 พื้นโปร่ง 80 จุด · R2 `shadow-sm` 232 จุด · R3 ตัวเล็ก 10 จุด · guard แบบ budget | พื้นหัวตาราง 44 จุด (DataTable) · ตัวนับบนแท็บ 2 จุด · โครงแถว `group/row` | แถบบันทึกติดล่างที่มี `shadow-lg` 2 จุด | FAB 2 จุด · `bg-surface/NN` / `bg-background/NN` 10 จุด · ตั้ง budget เป็น `{}` |
| guard | ชุดของ 2A (ข้อ 12 ตาราง C) | ลดตัวเลข budget เมื่อทำเสร็จ ห้ามเพิ่ม | เหมือน 2B | รวม guard ไว้ไฟล์เดียว budget ทุกตัวเป็น 0 |

## 3–9. รายละเอียดแต่ละส่วน (ไฟล์แยก)

รายละเอียดของข้อ 3–9 อยู่ในโฟลเดอร์ `docs/superpowers/specs/2026-10-11-ui-phase2a/` (ร่างโดย agent แยกส่วน ตรวจตัวเลขกับโค้ดที่ `081d538` แล้ว) **ข้อ 10 ของเอกสารนี้ใช้แทนข้อความในไฟล์เหล่านั้นทุกที่ที่ขัดกัน** โดยเฉพาะ I1–I23 และเรื่องมุมโค้ง (I15)

| ข้อ | ไฟล์ | สรุป |
|---|---|---|
| 3. token และตัวอักษร | `2026-10-11-ui-phase2a/03-tokens.md` | สี 5 ตัว (`faint-foreground` #56677F · `control-border` #C3CDDA · `border-soft` #E7EBF1 · `row-hover` #F3F6FB · `neutral-ink` #2A4468) · `text-meta` 13/20 · `text-metric` 28/32 · `text-count` 20/24 · `radius-control` 6px · halo ของช่องกรอก 2 แบบ · `extendTailwindMerge` ใน `cn()` (ไม่ทำ `text-meta` หายเงียบ) · กฎ `::placeholder` · `select-chevron` · `tag` น้ำหนัก 400 + เลือกทั้งรหัส · ข้อตัดสินย่อย T1–T17 (T11 ถูกแทนด้วย I15) |
| 4. ปุ่ม | `2026-10-11-ui-phase2a/04-buttons.md` | cva ใหม่: ขนาด sm 32 / md 36 / lg 40 (ต่ำกว่า `md` 44) · ค่าตั้งต้นยัง 40 จนถึง 2D · variant `danger` เส้นขอบแดง · `destructive` ทึบสำหรับยืนยัน · disabled ไม่ใช้ opacity · `busy` (aria-busy + spinner) · `linkVariants` · ลบ `getTouchIconButtonClasses` · ปุ่มกลาง 31 จุด · ข้อตัดสินย่อย ย1–ย27 (ย1 ถูกแทนด้วย I15 · ย3 ถูกแทนด้วย I5) |
| 5. เมนู popover และ command | `2026-10-11-ui-phase2a/05-menus.md` | แผงมุม 12px · รายการ 36px (ต่ำกว่า `md` 44) · highlight `primary-soft` · รายการ `unavailable` ที่ยังโฟกัสได้พร้อมบรรทัดเหตุผล · `.cbox` · `Kbd` · เมนูภาษาไม่มีธงและ aria-label ไทย (`nav.*` 5 key) · global search · ข้อตัดสินย่อย 33 ข้อ (I6–I8, I10, I20 ทับบางข้อ) |
| 6. ช่องกรอก (คอมโพเนนต์กลาง) | `2026-10-11-ui-phase2a/06-fields.md` | `fieldControlVariants` (ขอบ `input` · พื้นขาว · halo ตอนโฟกัส · error ผ่าน `aria-invalid`) · `Input` · `NativeSelect` · `Textarea` · `Field` (ใช้ใน server ได้) · `SearchField` · checkbox helper · ต่อเข้าแค่ 4 จุด (`getFieldControlClasses`, `SearchableSelect`, `ScannerTextInput`, `FileDropzone`) · การย้าย 316 ช่องเป็นของ 2C · ข้อตัดสินย่อย 28 ข้อ (ข้อ 5 เรื่องมุมถูกแทนด้วย I15) |
| 7. toast หน้าว่าง และกล่องแจ้ง | `2026-10-11-ui-phase2a/07-feedback.md` | `AppToaster` แทน `richColors` (ไอคอนบอกโทน · พื้นอ่อนเฉพาะ warning/error · ผ่าน AA · ปุ่มปิด · อยู่ใต้แถบบน) · ไม่แก้จุดเรียก toast 195 จุด · `ActionEmptyState` แบบไม่มีกรอบเส้นประ · `EmptyNote` · `Notice` · `DataFreshnessBanner` เป็น Notice ตัวแรก · ข้อตัดสินย่อย 27 ข้อ |
| 8. ป้ายสถานะ เส้นทางนำทาง และตัวช่วยค่าว่าง/ตัวเลข | `2026-10-11-ui-phase2a/08-misc.md` | `StatusBadge` ขนาดเดียว 22px (ลบ `size` 52 จุดใน 2 commit ตาม I17) · `neutral-ink` · Breadcrumbs ใหม่ (13/20 สีจาง · `aria-current` · `common.breadcrumb` · รหัสเป็น `tag`) · `Nil`/`orNil` · `display-format.ts` (`formatCount`, `formatMoney` แบบ "บาท") · ข้อตัดสินย่อย 26 ข้อ (ข้อ 8.1.3 เรื่อง `tag` ถูกแทนด้วย I1) |
| 9. งานกวาดแบบกลไก (codemod) และ guard | `2026-10-11-ui-phase2a/09-codemods.md` | R1 `border-{tone}/NN` → `-border` (254 จุด) · R7 พื้นโปร่ง → token ทึบ (80 จุด รวมแก้แถบ sticky โปร่งของทะเบียน) · R2 ลบ `shadow-sm` 232 จุด คงไว้ 6 · R3 ตัวเล็กกว่า 12px 10 จุด · แต่ละชุดเป็น commit เดียวพร้อม guard แบบ budget · จำลองแล้ว test ผ่าน 1623 · ข้อตัดสินย่อย 20 ข้อ |

## 10. ข้อตัดสินจากการรวมส่วน (ใช้แทนข้อความในข้อ 3–9 ที่ขัดกัน)

อ่านร่างทั้ง 7 ส่วนเทียบกันเองและเทียบกับโค้ด เรื่องที่ทุกส่วนตรงกันอยู่แล้วไม่ต้องแก้:
- **ชื่อ token และ class เหมือนกันทุกส่วน:** `faint-foreground`, `control-border`, `border-soft`, `row-hover`, `neutral-ink`, `radius-control`, `shadow-field-focus`, `shadow-field-error`
- **ค่าตรงกับชุดสีจริง:** row-hover #F3F6FB และ border-soft #E7EBF1 คำนวณจาก `color-mix` ของต้นแบบด้วยค่า token จริงแล้วได้ค่าเดียวกัน · halo ใช้ rgb ของ `--ring` #10858D และ `--danger` #B3261E
- **ชื่อขนาดชุดเดียวกันและสลับที่ `md` ทุกที่:** ปุ่ม (ข้อ 4.3), รายการเมนู (5.3), ช่องค้นหาในเมนู (5.8) และช่องกรอก (6.4) · ความเสี่ยงข้อ 2 ของส่วนปุ่มจึงหมดไป
- **disabled แบบเดียวกันทั้งปุ่มและช่อง:** `bg-background border-border text-faint-foreground` ไม่ใช้ opacity
- **วงโฟกัสใช้สีเดียว** ทุกส่วนผ่าน guard `visual-foundation-guards.test.ts:11`

ข้อที่ขัดกัน ซ้ำกัน หรือยังขาด ตัดสินดังนี้

| # | เรื่อง | ขัดกันอย่างไร | ตัดสิน | เหตุผล |
|---|---|---|---|---|
| I1 | `@utility tag` | เขียนไว้ 2 แบบ: ข้อ 3.8 (มี `-webkit-user-select`, `font-variant-numeric: normal` และ `:where(a, button, label, summary) &`) กับข้อ 8.1.3 (มีแค่ `:where(a, button)` ไม่มี prefix) · test `visual-foundation-guards.test.ts:50` ก็เขียนไว้ 2 แบบ (ข้อ 3.9 และ 8.5) | ใช้แบบข้อ 3.8 · ลงในงาน token · test :50 ใช้ชุดของข้อ 3.9 · ตัด code block ในข้อ 8.1.3 ออก เหลือไว้แค่ประโยค "ผู้ใช้แรกคือ crumbs" | แบบข้อ 3.8 ครอบแบบข้อ 8.1.3 ทั้งหมด · Safari บน iOS ต้องมี prefix · `globals.css` ควรมีเจ้าของคนเดียว |
| I2 | `--neutral-ink` | ประกาศไว้ 2 ที่ (ข้อ 3.1 และ 8.1.4) · test ไม่ตรงกัน: ข้อ 3.9 ให้ ≥3:1 บน 4 พื้น ส่วนข้อ 8.5 ให้ AA บน 5 พื้น | ประกาศครั้งเดียวในงาน token · test AA บน card, background, canvas, muted, accent, row-hover (ต่ำสุด 8.48 บน muted) | ใช้เป็นสีตัวหนังสือต่อได้ใน 2D และเฟส 3 · ค่าผ่านทุกพื้น |
| I3 | ขยาย tailwind-merge | มีอยู่ 3 ที่: ข้อ 3.5 (text + radius + shadow) · ข้อ 8.0 ทางสำรอง (text + radius) · ข้อ 7.7 test สำรอง | ทำที่ข้อ 3.5 ที่เดียว · ตัดทางสำรองในข้อ 8.0 และ 7.7 · เพิ่ม 2 แถวใน `tests/class-merge.test.ts`: `cn("text-meta text-faint-foreground")` และ `cn("text-meta", "text-danger")` ต้องเหลือทั้ง 2 class | ทุกส่วนพึ่งการแก้นี้ จึงต้องลงก่อนส่วนอื่น |
| I4 | คู่ contrast | 5 ส่วนแก้ `design-tokens-contrast.test.ts` แยกกัน (ข้อ 3.9, 4.11, 5.11, 7.7, 8.5) | งาน token ใส่ทุกคู่ในครั้งเดียว (ข้อ 12 ตาราง A) งานหลังจากนั้นไม่แตะไฟล์นี้ | เป็นไฟล์ที่ 2B∥2C ห้ามแตะ · คำนวณทุกคู่ซ้ำแล้ว ตรงกับร่าง |
| I5 | สีตอนกดปุ่ม outline และ ghost | ข้อ 4 ย3 ใช้ `active:bg-accent` (อ้าง neutral-soft #EEF2F7) · ข้อ 5 ข้อ 7 ใช้ `active:bg-muted` | ใช้ `active:bg-muted` ทั้งปุ่มและรายการเมนู | #EEF2F7 มาจาก `:root` ร่างของ `base.css` · ใน `palettes/e-light-shell.json` neutral-soft คือ #E9EEF5 = `--muted` (สเปกเฟส 1 ข้อ 3.1) ส่วน `--accent` คือ navy-2 · บนพื้นนี้ foreground ได้ 14.51 และ muted-foreground ได้ 7.14 |
| I6 | `dropdown-menu.tsx:76` (`focus:bg-destructive/10`) | ข้อ 5.14 ให้ R1 ข้ามบรรทัดนี้ · ข้อ 9.2 c2 ให้ R1 แก้เป็น `danger-soft` | ทำตามข้อ 9.2: R1 แก้ token ตัวนี้ แล้วงานเมนูเขียนทับทั้งบรรทัดทีหลัง | codemod ลงก่อนงานแก้มือ · guard ของ R1 ไม่ต้องมีข้อยกเว้นใน `ui/` |
| I7 | placeholder ใน `command.tsx:76` | ข้อ 3.6 บอกว่าถ้างานเมนูแก้ไฟล์นี้ ให้ลบในงานเมนู · ข้อ 5.8 ใส่ `placeholder:text-faint-foreground` | งาน token ลบครบทั้ง 13 บรรทัด รวม `command.tsx:76` · `CommandInput` ไม่ต้องใส่ class placeholder | guard "placeholder มีสีเดียว" ลงในงาน token และต้องได้ 0 ในงานนั้น · base rule ตั้งสีไว้แล้ว |
| I8 | ขนาดตัวอักษรใน `CommandInput` | ข้อ 5.8 ใช้ `text-sm` · ข้อ 6.10 ข้อ 14 ขอ `text-base md:text-sm` | ใช้ `text-base md:text-sm` | iOS ซูมช่องที่ตัวอักษรเล็กกว่า 16px · สลับที่ `md` เหมือนช่องกรอก |
| I9 | ชื่อ `<select>` | ข้อ 3.7 เรียก `Select` · ข้อ 6.8 ข้อ 16 เรียก `NativeSelect` | `NativeSelect` (`native-select.tsx`) | มี `function Select` ที่เขียนเองอยู่แล้ว 4 ไฟล์ |
| I10 | `searchable-select.tsx` ถูกแก้ 2 ส่วน | ข้อ 6.7 แก้ป้าย trigger hint error (:59-79, :101-112) · ข้อ 5.8 แก้รายการ (:87-95) | งานช่องกรอกก่อน แล้วงานเมนู แยกคนละ commit | ไม่ชนบรรทัด · `searchable-select-accessibility.test.ts:5-13` ต้องผ่านทั้งสองงาน |
| I11 | มุมของปุ่ม segmented 2 จุด (แก้มือใน R2) | ข้อ 9.4 ไม่แก้มุม (คง `rounded` 4px) · ข้อ 3.4 ให้ปุ่มใน Segmented ใช้ `rounded-control` | ในงานแก้มือของ R2 เปลี่ยน `rounded` เป็น `rounded-control` ที่ `audit-scan-room-list.tsx:81` และ `system-settings-form.tsx:2552` · กรอบคง `rounded-md` | `.seg button` ของต้นแบบใช้ 6px · บรรทัดนี้ถูกแก้อยู่แล้ว จำนวนบรรทัดจึงไม่เปลี่ยน |
| I12 | ปุ่มรีเฟรชของ `DataFreshnessBanner` | ข้อ 7.5 ใส่ `motion-reduce` ให้ไอคอนหมุนเอง · ข้อ 4.5 มี `busy` แต่ทั้ง 2A ไม่มีที่ใช้ | `<Button variant="outline" size="md" busy={refreshing}>` แทน `disabled={refreshing}` และไอคอนหมุนที่เขียนเอง | `busy` ได้ที่ใช้จริง 1 จุดให้ตรวจบนแอปใน 2A (โฟกัสไม่หลุด และดูในโหมด forced colors) · test ตรวจแค่ชื่อ component (`audit-finding-resolution.test.ts:10`) |
| I13 | เป้ากดที่เล็กกว่า 44px บนจอแคบกว่า `md` | D4 ต้องการ 44 · ปุ่มปิด toast 24px (ข้อ 7) · ลิงก์ crumbs 20px (ข้อ 8) | ยอมรับ 2 จุดนี้เป็นข้อยกเว้น และเขียนไว้ใน DESIGN.md | WCAG 2.5.8 (เป้า 24px หรือมีระยะห่างพอ) · toast ปัดทิ้งได้บนจอสัมผัส · crumbs มีลิงก์เดียวและยังมีปุ่มกลับ |
| I14 | สีจางบน `primary-soft` | D2 เขียนว่า "never on tinted soft fills" · T5 และข้อ 5 ข้อ 33 อนุญาตบนแถวหรือรายการที่ชี้หรือเลือก | อนุญาตตาม T5 (4.99:1 ผ่าน AA) · guard ห้ามเฉพาะพื้นของสถานะ 4 สี · ตัดสินแล้ว 2026-10-11 | ต้นแบบวาง `.stack small` และ `.trail` บนรายการที่ hover |
| I15 | มุม 6px ของปุ่ม md/lg และช่องกรอก · มุม 12px ของเมนู | หน้าเปรียบเทียบข้อ 7 เขียนว่า "ต้นแบบใช้ 6px กับปุ่มและช่องกรอก 8px กับแผงและเมนู" · แต่ `base.css` ใช้ 8px กับ `.btn`/`.input` และ 12px กับ `.menu` | **ผู้ใช้เลือกตามต้นแบบจริง (2026-10-11):** ปุ่ม `sm`, ปุ่มใน segmented, chip และป้ายสถานะใช้ `rounded-control` 6px · ปุ่ม `md`/`lg`/icon และช่องกรอกทุกขนาด (รวม `SearchableSelect` trigger, `SearchField`, `FileDropzone`) ใช้ `rounded-md` 8px · เมนู popover และ toast ใช้ 12px (ข้อ 5.2) · **ใช้แทน** T11 ในข้อ 3, ย1 ในข้อ 4 และข้อ 6.8 ข้อ 5 ทุกที่ที่ร่างเขียนว่าปุ่มหรือช่องกรอกใช้ 6px | หน้าเปรียบเทียบเขียนค่าของต้นแบบผิด · `base.css`: `.btn` และ `.input` ใช้ `--r` 8px · `.btn.sm` และ `.seg button` ใช้ `--r-sm` 6px · `.menu` และ `.panel` ใช้ `--r-lg` 12px |
| I16 | ลำดับงาน token กับ codemod | ข้อ 9.1 ให้ codemod มาก่อนงานแก้มือทุกอย่าง · แต่งาน token มีงานแก้มือ (ลบ placeholder 13 บรรทัด) | งาน token ลงก่อน R1 ได้ · ตรวจแล้ว 13 บรรทัดนี้ไม่มีเป้าของ R1/R7/R2/R3 (มีแค่ `focus:ring-ring/20` ใน `login-form.tsx` ที่เฟส 1 คงไว้) จำนวนที่สคริปต์ใช้ตรวจตัวเองจึงไม่เปลี่ยน | R7 ต้องมี token ก่อน |
| I17 | ลบ `size` ของ StatusBadge | ข้อ 8.1.2 บอกว่าเป็น commit เชิงกลแยก แต่ไม่ได้บอกว่าแต่ละ commit ผ่าน test ได้อย่างไร | งานเดียว 2 commit · (ก) variants เหลือขนาดเดียว type ยังรับ `size?` แบบ `@deprecated` ที่ไม่มีผล และแก้ `status-badge.test.ts` · (ข) ลบ attribute 52 ตัวใน 19 ไฟล์ ลบ `size` ออกจาก type แล้วแก้ `asset-detail-ux.test.ts:37-38` และ `asset-register-table-ui.test.ts:115-116` | ทุก commit ผ่าน `npm test` และ tsc (หลักเฟส 1: 1 ชุด = 1 commit) |
| I18 | สี hover ของแถวและแถบ sticky ในทะเบียน + `asset-register-ux.test.ts:99` | critic §4 ยกให้ tables ใน 2B · ข้อ 9.3 (R7) เปลี่ยนสีใน 2A | ยอมรับ · 2A เปลี่ยนแค่สีเป็น `bg-row-hover` · โครง `group/row` และ `--row-bg` ยังเป็นของ 2B | แก้บั๊ก sticky โปร่งได้ทันที · 2B ไม่ต้องเปลี่ยนสีซ้ำ |
| I19 | ใครแก้ DESIGN.md | 7 ส่วนระบุบรรทัดเอง และชนกันที่ :176, :201, :217, :229-230, :308 | มีงานเอกสารงานเดียวท้าย 2A แก้ตามรายการในข้อ 14 · หัวข้อ "เอกสาร" ในข้อ 3–9 ใช้เป็น checklist | กันการแก้บรรทัดเดียวกันซ้ำ · เฟส 1 ก็แยก commit เอกสารแบบนี้ |
| I20 | ข้อความใหม่ 2 ชุด | ข้อ 5.10: `nav.*` 5 key · `globalSearch.keyboard{Select,Open,Close}` · ลบ `globalSearch.keyboardHint` · ข้อ 8.2.2: `common.breadcrumb`, `common.noValue`, `common.baht` | แยกตามงาน และแก้ผ่าน `node scripts/messages-edit.mjs` ทุกครั้ง | ตรวจแล้วไม่มี key ซ้ำ · `common.close` ("ปิด") และ `notifications.title` ("การแจ้งเตือน") มีอยู่แล้ว · `common.noData` ("ไม่พบข้อมูล") ความหมายต่างจาก `noValue` ("ไม่มีข้อมูล") จึงไม่รวม · คำไทยใหม่ไม่ติดกฎใน `thai-glossary.test.ts` |
| I21 | ห้ามเพิ่ม token หลัง 2A | ข้อ 3 ส่วนหัว และ R8 | เขียนข้อนี้ไว้ใน plan ของทั้ง 2B และ 2C · ถ้าต้องเพิ่มจริง ให้ทำเป็นงานเล็กที่ลง master ก่อนแตกสาย | ถ้าเพิ่มทั้งสองสาย `:root`, `@theme inline` และ test contrast จะชนกันตอนรวม |
| I22 | พื้นช่องกรอกตัดสินใน 2A | critic §5 กับดักข้อ 2 (D16) ให้ตัดสินพร้อม 2C · ข้อ 6.8 ข้อ 1 และ 27 ตัดสินพื้นขาวใน 2A และยอมให้ฟอร์มมีช่องปนกัน | คงตามข้อ 6 · **ไม่ deploy 2A เดี่ยว ๆ** ให้ deploy พร้อม 2C ชุดแรก (16 ไฟล์ที่มีช่องปนกัน) | ผู้ใช้อนุมัติ "ใช้ตามแนะนำทั้งหมด" · Production ยังไม่ได้ deploy เฟส 1 |
| I23 | `Kbd` ใช้ `leading-4` (16/12 = 1.33 เท่า) | ต่ำกว่าเกณฑ์ภาษาไทย 1.44 เท่า | คงไว้ และใส่ comment ว่าใน `Kbd` มีแต่ตัวละตินและสัญลักษณ์ | `.kbd` ของต้นแบบใช้ 12/16 · ไม่มีข้อความไทย |

## 11. ลำดับงาน (ร่างสำหรับ plan)

2A ทำใน branch เดียว ทีละงานตามลำดับ แต่ละงานจบด้วย `npm test`

| # | งาน | ส่วน | ต้องรอ | test ที่แก้หรือเพิ่มในงานนี้ |
|---|---|---|---|---|
| 0 | ตรวจฐาน: ถ้า `master` ไม่ใช่ `081d538` ให้นับใหม่ด้วย regex ในข้อ 9 ก่อนเชื่อตัวเลขในตาราง | 9.11 | — | — |
| 1 | token: สี 5 ตัว · ขนาดตัวอักษร 3 ขนาด · radius · halo · `extendTailwindMerge` · `::placeholder` + ลบ class placeholder 13 บรรทัด · `select-chevron` · `tag` | 3 + I1–I4, I7 | 0 | ตาราง A ข้อ 1–2 · `class-merge.test.ts` · guard ชุด T |
| 2 | R1 `/NN` → `-border` | 9.2 | 1 | helper `countMatchesByFile` · guard R1 |
| 3 | R7 พื้นโปร่ง → token ทึบ | 9.3 | 1, 2 | `asset-register-ux.test.ts:99` · guard R7 |
| 4 | R2 ลบ `shadow-sm` + แก้มือ segmented | 9.4 + I11 | 3 | `settings-ldap-role-ui.test.ts:20-21` · guard R2 |
| 5 | R3 ตัวอักษรเล็กกว่า 12px | 9.5 | 2 | guard R3 |
| 6 | ปุ่ม: cva · `busy` · `linkVariants` · safe link · ลบ touch icon · ลิงก์ 2 ลิงก์ที่หัวหน้ารายละเอียด | 4 + I5 | 1 | `design-system.test.ts` · `button-busy-ui.test.ts` |
| 7 | ช่องกรอก: primitive + ต่อเข้า 4 จุด | 6 + I9 | 1, 5 (`file-dropzone`), 6 (ปุ่มกล้องใช้ `size: "lg"`) | 4 ไฟล์ในตาราง A · `field-primitives.test.ts` |
| 8 | เมนู: dropdown · popover · command · `Kbd` · global search · แถบบน · `nav.*` | 5 + I6–I8, I10, I20 | 1, 2, 3, 7 (`searchable-select.tsx`) | `dropdown-menus-ui` · `global-search-ui` · `menu-primitives-ui.test.ts` · guard motion และ emoji |
| 9 | ป้ายสถานะขนาดเดียว (2 commit) | 8.1 + I17 | 1 | `status-badge.test.ts` · `asset-detail-ux` · `asset-register-table-ui` |
| 10 | crumbs + `Nil` + `display-format` + `common.*` | 8.2–8.3 + I20 | 1 | `breadcrumbs-ui.test.ts` · `display-format.test.ts` |
| 11 | toast · `ActionEmptyState` · `EmptyNote` · `Notice` · `toneIcons` · `DataFreshnessBanner` | 7 + I12 | 1, 6 | `visual-consistency-ui.test.ts` · `feedback-states-ui.test.ts` |
| 12 | `npm run verify` + production build + ตรวจบนแอป dev | 13 | 1–11 | — |
| 13 | เอกสารและ wiki | 14 + I19 | 12 | — |

เหตุผลของลำดับ:
- **token มาก่อนทุกงาน:**
  - ถ้า class ที่ใช้ token ยังไม่มี token Tailwind จะไม่สร้าง CSS และไม่แจ้ง error
  - `cn()` จะทิ้ง `text-meta` ไปเงียบ ๆ
- **codemod มาก่อนงานแก้มือ:**
  - สคริปต์ตรวจตัวเองด้วยจำนวนที่นับไว้ที่ `081d538`
  - มีไฟล์กลาง 11 ไฟล์ที่ทั้ง codemod และงานแก้มือแตะ (ข้อ 9.1)
  - R7 ต้องมาก่อน R2 เพราะงานแก้มือของ R2 หาข้อความที่ R7 เพิ่งเขียน
- **ปุ่มก่อนช่องกรอก** เพราะปุ่มกล้องใช้ `buttonVariants({ size: "lg" })`
- **ช่องกรอกก่อนเมนู** เพราะแก้ `searchable-select.tsx` ไฟล์เดียวกัน (I10)
- **ปุ่มก่อน toast และกล่องแจ้ง** เพราะใช้ `buttonVariants({ size: "md" })` และ `busy`
- **เมนูไม่ได้ใช้ `Button`** จึงไม่ต้องรอปุ่ม
- **งาน 9–11 ไม่พึ่งงาน 7–8** สลับลำดับกันได้

## 12. Test ที่ต้องแก้และเพิ่มใน 2A

ฐานที่ `081d538`: 1618 test (ผ่าน 1617 · ข้าม 1) · หลัง codemod 4 ชุดในการจำลองของข้อ 9.7 ได้ 1623 test ไม่มีที่พัง

**ตาราง A: test เดิมที่ต้องแก้** (แก้ในงานเดียวกับที่ทำให้พัง)

| # | ไฟล์:บรรทัด | แก้ | งาน |
|---|---|---|---|
| 1 | `tests/design-tokens-contrast.test.ts` | ทั้งหมดใส่ในงานนี้ (I4):<br>· `:46` เพิ่ม `"row-hover"` (ต่ำสุดคือ success 4.99) · `:61` primary บน row-hover (7.45) · `:68` foreground และ muted-foreground บน row-hover<br>· test ใหม่หลัง `:76`: faint ผ่าน AA บน background, card, popover, muted, accent, canvas, row-hover, primary-soft (ต่ำสุด 4.95)<br>· `:87-94` เพิ่ม ring บน row-hover / primary-soft / danger-soft (4.07 / 3.82 / 3.93) · input บน row-hover / popover (3.20 / 3.47) · neutral-ink ผ่าน AA บน 6 พื้น (ต่ำสุด 8.48) · foreground และ muted-foreground บน warning-soft / danger-soft (ต่ำสุด 7.42) · primary-foreground บน brand-navy (12.94)<br>· `:96-101` ลำดับ: border < control-border < input (1.35 < 1.61 < 3.47) · border-soft < border · faint < muted-foreground < foreground · row-hover ≠ card<br>· test ใหม่: ค่าที่เขียนตรงต้องตรง token (stroke ของ chevron = faint · rgb ของ halo = ring / danger) | 1 |
| 2 | `tests/visual-foundation-guards.test.ts:41-53` | regex line-height ของ meta, metric และ count พร้อมตรวจ 20/13 ≥ 1.44 · `:50` ตรวจเนื้อ `tag` ใหม่ (I1) · `::placeholder` ใช้ `var(--faint-foreground)` · `select-chevron` มีกฎ forced-colors | 1 |
| 3 | `tests/visual-foundation-guards.test.ts:63-67` | popover และ dropdown-menu ต้องตรงกับ `/shadow-overlay[^"]*motion-reduce:animate-none!/` | 8 |
| 4 | `tests/helpers/source-files.ts` | เพิ่ม `countMatchesByFile` | 2 |
| 5 | `tests/asset-register-ux.test.ts:99` | `/group-hover:bg-row-hover group-focus:bg-row-hover/` | 3 |
| 6 | `tests/settings-ldap-role-ui.test.ts:20`, `:21` | ตัด ` shadow-sm` ออกจาก regex ทั้ง 2 บรรทัด (:20 ปิดท้ายด้วย `bg-surface"`) | 4 |
| 7 | `tests/design-system.test.ts:91`, `:94`, `:95`, `:96` | `md:h-10 md:min-h-0` · `border-control-border bg-surface` · `min-h-11 px-2.5 text-meta md:h-8 md:min-h-0` · `min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0` · เพิ่ม 7 ข้อของข้อ 4.11 · `:92` ต้องผ่านต่อ ดังนั้น `bg-destructive text-destructive-foreground hover:bg-danger-hover` ต้องอยู่ติดกัน | 6 |
| 8 | `tests/scanner-text-input.test.ts:193`, `:194` | `/<Input[\s\S]+id=\{id\}/` · `/<Input[\s\S]*?className="sm:flex-1"/` + `/<NativeSelect fieldSize="md"/` | 7 |
| 9 | `tests/asset-scan-search-tool.test.ts:46` | `assert.doesNotMatch(tool, /inputClassName=/)` | 7 |
| 10 | `tests/audit-scan-search-ui.test.ts:15` | `/getFieldControlClasses\(\{ fieldSize: "xl" \}\)/` | 7 |
| 11 | `tests/dropdown-menus-ui.test.ts:27-35`, `:37-41` | เพิ่ม: row-actions ใช้ `unavailable` + `DropdownMenuItemDescription` · `<DropdownMenuRadioGroup value={locale}` · `lang="th"` / `lang="en"` · ไม่มี `(aria-label\|title)="[A-Z]` ใน topbar · key `nav.*` ทั้ง 5 ตัวมีครบ | 8 |
| 12 | `tests/global-search-ui.test.ts:5-15` | เพิ่ม: ไม่มี `bg-accent/60` · ใช้ `bg-primary-soft` · ท้ายแผงมี `<Kbd>` | 8 |
| 13 | `tests/status-badge.test.ts:20-29`, `:31-38`, `:43`, `:50-51` + test ใหม่ | commit (ก) ของ I17: ไม่วนตาม size · `px-2` ไม่มี `px-2.5` · ตัด `neutral-ink` ในบรรทัด `:43` · `bg-neutral-ink` · มี `h-5.5 text-meta rounded-control` ไม่มี `py-` · `cn(…, "shrink-0")` ยังมี `text-meta` | 9 |
| 14 | `tests/status-badge.test.ts:60-64` · `tests/asset-detail-ux.test.ts:37-38` · `tests/asset-register-table-ui.test.ts:115-116` | commit (ข) ของ I17: source ไม่มี `size` · `<StatusBadge label=` | 9 |
| 15 | `tests/visual-consistency-ui.test.ts:38-39` (test เริ่มที่ :35) | `/buttonVariants\(\{[^}]*size: "md"/` | 11 |

**ตาราง B: test ไฟล์ใหม่**

| ไฟล์ | ตรวจ | งาน |
|---|---|---|
| `tests/class-merge.test.ts` | 5 แถวของข้อ 3.5 + 2 แถวของ I3 | 1 |
| `tests/button-busy-ui.test.ts` | ตามข้อ 4.11 (ไม่มี directive และ hook · `aria-busy`, `aria-disabled`, spinner `motion-reduce:animate-none`, `preventDefault()` · type `asChild: true; busy?: never`) | 6 |
| `tests/field-primitives.test.ts` | ตามข้อ 6.9 | 7 |
| `tests/menu-primitives-ui.test.ts` | ตามข้อ 5.11 + `CommandInput` มี `text-base md:text-sm` (I8) และไม่มี `placeholder:` (I7) | 8 |
| `tests/breadcrumbs-ui.test.ts` | ตามข้อ 8.5 | 10 |
| `tests/display-format.test.ts` | ตามข้อ 8.5 รวมถึงตรวจ source ของ `nil.tsx` | 10 |
| `tests/feedback-states-ui.test.ts` | ตามข้อ 7.7 (ตัดข้อ `cn` สำรองออก ตาม I3) + `data-freshness-banner.tsx` มี `busy={refreshing}` (I12) | 11 |

**ตาราง C: guard ใหม่ใน `tests/visual-foundation-guards.test.ts`**

| guard | เงื่อนไข | ยกเว้นหรือ budget | ที่ `081d538` | งาน |
|---|---|---|---|---|
| placeholder ใช้สีเดียว | `/placeholder:text-(?!faint-foreground\b)[\w-]+/g` | — | 13 (หลังงาน 1 เหลือ 0) | 1 |
| ห้ามเขียนขนาด 13px หรือ 28px แบบ arbitrary | `/text-\[(?:13\|28)px\]/g` | `asset-label-print.tsx` | 1 | 1 |
| ห้ามเขียนมุม 6px แบบ arbitrary | `/rounded-\[6px\]/g` | — | 0 | 1 |
| ตัวเลขใหญ่ต้องมี `num` | string ที่มี `text-(metric\|count)` ต้องมี `num` | — | 0 | 1 |
| ห้ามทำ `tag` เป็นตัวหนาหรือตั้งขนาดทับ | string ที่มี `\btag\b` ห้ามมี `font-(semibold\|bold\|extrabold\|black)` หรือ `text-(xs\|sm\|base\|meta\|lg)` | — | 0 (มี 22 string ที่มีคำว่า tag แต่ไม่มีจุดไหนผิดกฎ) | 1 |
| ห้ามใช้สีจางบนพื้นสีสถานะ | string เดียวกันห้ามมีทั้ง `bg-(success\|warning\|danger\|info)-soft` และ `text-faint-foreground` | — | 0 | 1 |
| R1: สีของ tone ห้ามจางด้วย opacity | regex ในข้อ 9.6 | `audit/rounds/page.tsx`: 1 | 259 จุดใน 72 ไฟล์ | 2 |
| R7: พื้นกลางเป็น token ทึบ ยกเว้นหัวตาราง | regex ในข้อ 9.6 + ตรวจว่ามี `--color-row-hover` และ `--color-border-soft` | `{}` · หัวตารางไม่เกิน 44 จุด | 80 จุด (+44 ในหัวตาราง) | 3 |
| R2: เงามีได้เฉพาะชั้นลอย ปุ่มบนภาพกล้อง และตัวอย่างกระดาษ | regex ในข้อ 9.6 | 12 จุดใน 10 ไฟล์ | 245 จุดใน 89 ไฟล์ | 4 |
| R3: ห้ามตัวอักษรเล็กกว่า 12px นอกป้ายพิมพ์ | `/text-\[(?:\d\|1[01])(?:\.\d+)?px\]/g` | ทั้งไฟล์ `asset-label-print.tsx` | 10 | 5 |
| ห้ามอีโมจิ | `/\p{Emoji_Presentation}\|\uFE0F/u` ใน `src/**/*.{ts,tsx}` และ `messages/*.json` | — | 4 ตัวอักษรบน 2 บรรทัด (`topbar.tsx:246,249`) | 8 |

**ตาราง D: test ที่ยึดของที่ 2A แตะ และต้องผ่านต่อโดยไม่แก้**

- `system-state-views.test.ts:10-13` · `api-error-ui.test.ts:15-24, 28, 31` · `visual-foundation-guards.test.ts:51` (บล็อกฟอนต์ของ sonner ห้ามรวมกับ CSS toast ใหม่) · `:75` · `:102-107`
- `design-system.test.ts:35, 37, 38-41, 87-90, 92-93, 97, 100-105` · `audit-scan-check-ui.test.ts:23, 50` · `confirm-dialog-ui.test.ts:13` · `report-controls-ui.test.ts:9-10`
- `searchable-select-accessibility.test.ts:5-13` · `audit-scan-search-ui.test.ts:144-155` · `asset-register-table-ui.test.ts:10-27, 51-76` · `global-search-ui.test.ts:5-15` · `asset-status-help-ui.test.ts:11-26` · `audit-scan-room-ui.test.ts:58-59`
- `asset-register-ux.test.ts:79-81, 169-174` · `asset-detail-ux.test.ts:27, 39` · `asset-return-navigation.test.ts:46` · `audit-finding-resolution.test.ts:10`
- `mobile-field-navigation-ui.test.ts:56` · `dashboard-shell-theme.test.ts` (topbar) · `messages-parity.test.ts` · `thai-glossary.test.ts`

`asset-detail-ux.test.ts:39` ยึด `{currentLocationLabel || "-"}` ไว้ ถ้า 2B เปลี่ยนเป็น `Nil` ต้องแก้ test นี้ด้วย

## 13. ตรวจบนแอป dev

**ก่อนเริ่มดู**
- รีสตาร์ต dev server ที่เปิดค้างไว้ (globals.css และ token ใหม่)
- `npm run verify` ต้องผ่าน
- เปิดดูซ้ำบน production build (`next build` + `next start`) ด้วย เพราะ:
  - ตอน dev ไม่มี Lightning CSS เติม prefix (`-webkit-user-select` เขียนเองแล้ว แต่ต้องดูผลจริง)
  - CSS ของ sonner ถูกต่อท้าย head ตอน runtime ลำดับอาจต่างจากตอน dev

**ความกว้างและภาษา**
- 1440 · 375 · 700 (ช่วง 640–767 ที่ของกลางสูงขึ้นเป็น 44) · 768 (iPad)
- ภาษาไทยเป็นหลัก ภาษาอังกฤษ 1 รอบ
- zoom 100% และ 200%

| หน้า | ดูอะไร | มาจาก |
|---|---|---|
| ตั้งค่าระบบ | แผงไม่มีเงา · พื้นกล่องเป็นสีทึบ · segmented 2 จุด (primary-soft ตัวหนา 600 มุม 6px) · placeholder · ส่วน LDAP | R2 · R7 · I11 · ข้อ 3 |
| รายละเอียดทรัพย์สิน | ปุ่ม ⋯ กับลิงก์กลับและลิงก์แก้ไขเป็นแบบเดียวกัน · crumbs มีรหัสเป็น `tag` คลิกครั้งเดียวเลือกทั้งรหัส · ป้าย 22px · hover กรอบรูป | ข้อ 4 ย27 · ข้อ 8 · R1 |
| ทะเบียน | hover แถวแล้วเลื่อนแนวนอน แถบ sticky ต้องทึบ · เมนู ⋯ กดลูกศรถึงรายการที่ใช้ไม่ได้ และกด Enter แล้วเมนูไม่ปิด · ตัวเลือกคอลัมน์ (`.cbox`) · เมนูเรียงลำดับ (radio) · เมนูส่งออก · คอลัมน์สถานะ 132px และสภาพ 96px ไม่ตัดคำ · รายการบนมือถือที่มีป้าย 3 ตัวต่อแถว | R7 · ข้อ 5 · ข้อ 8 |
| แถบบนและ popover | เมนูภาษา (radio · ชื่อภาษาเขียนเป็นภาษาของตัวเอง · ไม่มีธง · กว้าง 240) · เมนูผู้ใช้ · ตัวนับแจ้งเตือน `font-semibold` · popover แจ้งเตือนมุม 12px | ข้อ 5 · R3 |
| global search | แถวที่เลือกเป็น `primary-soft` · ไอคอนไม่มีกล่อง · ท้ายแผงมี `Kbd` 3 กลุ่ม | ข้อ 5.9 |
| ฟอร์มที่มี `SearchableSelect` (เพิ่มทรัพย์สิน · ส่งมอบ) | trigger พื้นขาว มุม 8px มี `ChevronDown` · ตอนเปิดมี halo · ช่องค้นหาเป็นกล่องในแผง · เครื่องหมายถูกอยู่ท้าย · ช่องเขียนเองกับช่องกลางปนกัน (I22) | ข้อ 5.8 · ข้อ 6.7 |
| สแกนตรวจนับ (375) | ช่องค้นหา `xl` สูง 48 ตัวอักษร 16px ทุกความกว้าง · segmented ของรายการห้อง · toast บังช่องค้นหา sticky หรือไม่ | ข้อ 6.7 · R2 · ข้อ 7.11 |
| ฟอร์มที่มี `ScannerTextInput` | ปุ่มกล้องสูงเท่าช่อง (44 / 40) · ช่องเลือกกล้อง | ข้อ 6.7 |
| ช่องแนบไฟล์ (`FileDropzone`) | กด Tab แล้วเห็นกรอบโฟกัส · hover · disabled ไม่จาง | ข้อ 6.7 |
| dialog ยืนยัน (`confirm-text`, `operation-review`, ลบผ่าน `useConfirm`) | ปุ่มมุม 8px · ส่วนท้ายพื้น background · ปุ่มที่กดไม่ได้หรือกำลังทำงานเป็นพื้นเทาและตัวหนังสือจาง | ข้อ 4.7 · R7 |
| หน้าว่าง | access-denied · error boundary · รายการตัดจำหน่ายว่าง (อยู่ใน td) · รายการผู้ขายที่กรองแล้วไม่พบ · รายการรอตรวจที่ว่าง | ข้อ 7.3 |
| รายการไม่ตรง ตอนข้อมูลเก่า | `Notice` แบบ warning + ปุ่ม `busy` | ข้อ 7.5 · I12 |
| toast | success (บันทึกฟอร์ม) · error ที่มีคำอธิบาย (`apiError.toast`) · error ตรวจกรอก (`asset-form`) · warning (`scanner-text-input`) ที่ 1440 และ 375 · toast ไม่ทับแถบบน · หัวข้อไม่ลอดใต้ปุ่มปิด | ข้อ 7.2 |
| แดชบอร์ด · ศูนย์งานค้าง · login | hover การ์ดลิงก์ · แผงที่ขยายไม่มีวงซ้อน · placeholder | R2 · R1 · ข้อ 3.6 |
| หน้าพิมพ์ | เอกสาร A4 ยังพิมพ์ได้ 1 หน้า · ป้ายพิมพ์ความร้อนไม่เปลี่ยน · ไม่มี toast ตอนพิมพ์ | R2/R3 ข้ามไฟล์ป้าย · ข้อ 7.2 |

**คีย์บอร์ด**
- Tab ผ่านทุกปุ่มแล้วเห็นวงโฟกัส
- เดินในเมนูด้วยลูกศร
- Alt+T แล้ว Tab ไปถึง toast และปุ่มปิด
- ปุ่มที่กำลัง `busy` ยังมีโฟกัสอยู่
- ลิงก์ใน crumbs

**screen reader (NVDA)**
- รายการที่ใช้ไม่ได้อ่านเหตุผลพร้อมคำว่า "ใช้ไม่ได้"
- เมนูภาษาอ่านเป็น `menuitemradio` และอ่าน "English" ด้วยเสียงอังกฤษ
- region ของ toast อ่านว่า "การแจ้งเตือน" และปุ่มปิดอ่านว่า "ปิด"
- crumbs อ่านว่า "เส้นทางหน้า" และบอกหน้าปัจจุบัน
- `SearchableSelect` อ่านค่าที่เลือก

**axe:** color-contrast ต้องได้ 0 ในหน้าแดชบอร์ด, ทะเบียน (เปิดเมนูค้างไว้), ฟอร์มเพิ่มทรัพย์สิน, ตั้งค่าระบบ และหน้าที่เปิด toast warning หรือ error ค้างไว้

**โหมด forced colors ของ Windows**
- เห็นกรอบโฟกัสบนปุ่ม ช่องกรอก รายการเมนู toast และ `FileDropzone`
- ลูกศรของ `<select>` กลับเป็นของระบบ
- marker ของป้ายสถานะยังเห็น
- ดูหน้าตาปุ่มตอน `busy`

**ลดการเคลื่อนไหว:** เมนูและ popover ไม่เลื่อนและไม่จาง · toast ไม่เคลื่อน · ไอคอนหมุนในปุ่มและช่องค้นหาหยุด

**เครื่องจริง:** iPhone (Safari) แตะช่องแล้วไม่ซูม และกดที่ `tag` แล้วเลือกได้ทั้งรหัส · iPad (≥768px) ช่องเป็นตัว 14px ดูว่าซูมหรือไม่

**ค่าในเบราว์เซอร์**
- กฎ `:root` ของเราชนะ sonner: พื้น ขอบ มุม 12px เงา และสีไอคอน
- HTML ที่ server ส่งมามี `aria-label="เส้นทางหน้า"`

## 14. เอกสาร

ทั้งหมดอยู่ในงานเอกสารงานเดียว (I19) เลขบรรทัดเป็นของ `081d538`

| ไฟล์ | ตำแหน่ง | แก้ | ที่มา |
|---|---|---|---|
| `DESIGN.md` | YAML `:4-44` / `:45-75` / `:76-80` | colors เพิ่ม 5 สี · typography เพิ่ม meta, metric, count · rounded เพิ่ม `control: "6px"` | 3.10 · 4.12 |
| | YAML `:89-100` / `:101-106` | ปุ่ม: `rounded.md` (ขนาด sm ใช้ `rounded.control`) ขอบ #C3CDDA สูง 40 จนถึง 2D · ช่องกรอก: พื้น surface `rounded.md` | 4.12 · 6.11 |
| | §2 `:173-181` (รวม `:176`), `:187-189` | 5 token พร้อมที่ใช้และข้อห้าม · พื้นช่องกรอกเป็นสีขาว · กล่องว่างไม่ใช้พื้น background แล้ว · Non-color values | 3.10 · 6.11 · 7.9 |
| | `:193`, `:195` | สีของไอคอนใน toast, Notice และหน้าว่าง · พื้นอ่อนใช้ได้เฉพาะ warning และ danger · ข้อยกเว้นกล่อง info ใช้ได้ถึง 2D | 7.9 · 9.2 |
| | `:201` | สีจางห้ามใช้บนพื้นสีสถานะ (ระบุ I14) · ขอบปุ่มเป็นเส้นตกแต่ง ช่องกรอกยังต้องใช้ `input` · ใช้ `border-{tone}-border` ห้าม `border-{tone}/NN` | 3.10 · 9.11 |
| | §3 `:215-224` (รวม `:217`), `:226-230`, `:236` | Tailwind + 3 ขนาด · ตัวหนังสือ 3 ระดับ · ตัวเล็กสุด 12px ยกเว้นป้ายพิมพ์ · `tag` แบบใหม่ ("119" → 79 จุด) · `select-chevron` · กฎ toast แบบเงียบ · กฎเส้นบรรทัดภาษาไทย | 3.10 · 7.9 · 8.4 · 9.11 |
| | §4 `:255-257`, `:261` | Motion ของเมนูและ popover · ข้อยกเว้นเรื่องเงา 6 จุด + guard | 5.12 · 9.11 |
| | §5 `:267`, `:356`, `:269-274` | ลบ "touch icon button" · เขียนหัวข้อ Buttons ใหม่ (`busy`, `linkVariants`, `danger` กับ `destructive`, ActionButton เลิกใช้) | 4.12 |
| | `:276-281`, `:283-289`, `:291-296`, `:298-304` (รวม `:301`), `:306-311`, `:313+` | Focus (เส้นโฟกัสขอบในของรายการเมนู) · Status Badges · Dialogs และ Menus · Cards · Inputs ("384" → 316 ช่องใน 70 ไฟล์ ยังเป็น `border-border` 282 ช่อง) · Navigation (Breadcrumbs) | 5.12 · 6.11 · 7.9 · 8.4 |
| | หัวข้อใหม่ | Feedback (Toast, ActionEmptyState, EmptyNote, Notice, กฎ role) · ค่าว่างและตัวเลข (`Nil`, บาท, th-TH) · ข้อยกเว้นเป้ากดของ I13 · คำเตือนว่า `npx shadcn add input\|textarea\|field` จะเขียนทับไฟล์ของเรา | 6.10 · 7.9 · 8.4 |
| `.impeccable/design.json` | `extensions.colorMeta` · `:245-259` · `:351` | เพิ่ม 5 สี · ปุ่ม primary/secondary · ลบ touch icon | 3.10 · 4.12 |
| `docs/14_UI_UX_DESIGN_SYSTEM.md` | ส่วนปุ่ม ช่องกรอก เมนู และ feedback | ให้ตรงกับ DESIGN.md | 6.11 |
| `DEVELOPER_HANDOFF.md` | ส่วน UI | primitive ใหม่ทุกตัว พร้อมกติกาที่ต้องรู้ก่อนใช้:<br>· `cn` ถูกขยายแล้ว · ห้ามเพิ่ม token หลัง 2A (I21) · budget ของ guard ห้ามเพิ่ม<br>· ใช้ `fieldSize` ไม่ใช้ `size` · ห้ามใส่ `busy` คู่กับ `disabled` · `unavailable` ใช้คู่กับ `asChild` ไม่ได้<br>· `Notice` ต้องใส่ `tone` และใส่ role ที่จุดเรียก · `StatusBadge` ไม่มี `size` แล้ว | — |
| `docs/99_CHANGELOG.md` | | 2A | — |
| wiki `AssetSystem` | `ams-status.md` · `ams-log.md` · `ams-open-questions.md` | เพิ่มแถวสถานะ 2A · ข้อ 20 (กล่อง info สี teal: R1 แก้แค่ขอบ เหลือ Notice sweep ใน 2D) · ข้อ 21 (pill สีจากฐานข้อมูล → 2D ต้องเพิ่ม `status.name` ใน API) · ข้อใหม่: I14, I15 ถ้าผู้ใช้ยังไม่ยืนยัน และการซูมบน iPad · รัน `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` แล้ว commit vault ด้วย `ingest:` | — |

## 15. ความเสี่ยงหลัก

1. **class หายแบบไม่มี error มี 2 ทาง**
   - tailwind-merge ทิ้ง `text-meta` หรือสีที่อยู่คู่กัน
   - Tailwind ไม่สร้าง CSS ให้ class ที่ยังไม่มี token
   - ป้องกันด้วยลำดับงาน (งาน 1 มาก่อนทุกงาน), `class-merge.test.ts`, guard R7 ที่ตรวจว่ามี token และ `menu-primitives-ui.test.ts` ที่ตรวจ `globals.css`
2. **หน้าตาเปลี่ยนทั้งแอปพร้อมกัน**
   - เงาหาย 232 จุด
   - placeholder เข้มขึ้นประมาณ 300 ช่อง (3.32 → 5.77:1)
   - ขอบสีสถานะจางลง 254 จุด
   - เมนู toast ป้ายสถานะ หน้าว่าง และ SearchableSelect 29 จุด เปลี่ยนในรอบเดียว
   - ต้องเทียบภาพก่อนและหลังตามข้อ 13 · deploy ตาม I22
3. **หน้าตาสองชุดปนกันจนถึง 2B/2C/2D**
   - ปุ่มกลาง 31 จุดขอบ #C3CDDA ส่วนปุ่มเขียนเอง 413 จุดยังเป็นขอบ #D7DEE8 (มุม 8px เท่ากัน ยกเว้นปุ่ม `sm` ที่เป็น 6px)
   - ช่องกลาง (10 + `SearchableSelect` 29 + `ScannerTextInput` 5) อยู่ข้างช่องเดิม 282 ช่อง โดยมี 16 ฟอร์มที่ปนกัน
4. **ช่วงความกว้าง 640–767px:** ปุ่ม ช่อง และรายการเมนูที่เป็นของกลางสูงขึ้นจาก 40 เป็น 44 แต่ของที่เขียนเองยังสูง 40
5. **toast**
   - sonner ฉีด CSS ตอน runtime · ผูกกับ data attribute ของ `sonner ^2.0.7` · ตรวจได้แค่บนเบราว์เซอร์
   - บนมือถือ toast ที่ top 72 อาจบังช่องค้นหา sticky ของหน้าสแกน (ทางสำรองข้อ 7.11)
   - toast error ที่เงียบลงทำให้ข้อความตรวจกรอกเห็นยากขึ้น จนกว่า 2C จะย้ายไปแสดงใต้ช่อง
6. **`busy` ใช้ `aria-disabled`**
   - ผู้เรียกที่ยังใส่ `disabled={busy}` คู่กันจะทำให้โฟกัสหลุด
   - โหมด forced colors ไม่ใช้สี GrayText ให้เอง
   - ถ้าหน้า server ส่ง `busy` มา จะ error เพราะส่ง event handler ข้าม server ไม่ได้ · `busy` จึงต้องมาจาก state ฝั่ง client เท่านั้น
7. **สีที่เขียนตรงในโค้ด:** ลูกศร `select-chevron` และ halo ทั้งสองแบบจะไม่เปลี่ยนตาม token · มี test กันไว้ (ตาราง A ข้อ 1)
8. **จำนวนใน codemod ผูกกับ `081d538`:** ถ้าจำนวนไม่ตรง ให้หยุด ห้าม commit (ข้อ 9.7)
9. **ป้ายสถานะกว้างขึ้นประมาณ 8%** (12 → 13px) คอลัมน์สถานะ 132px และสภาพ 96px ของทะเบียนอาจตัดคำเร็วขึ้น
10. **I14 และ I15 ตัดสินแล้ว (2026-10-11):** สีจางบน primary-soft อนุญาต · มุมตามต้นแบบจริง (8px ปกติ · 6px ตัวเล็ก · 12px เมนู) · งาน 1, 6, 7 และ 8 ต้องใช้ค่าตาม I15 ไม่ใช่ค่าในร่างข้อ 3, 4 และ 6
11. **ใช้ครั้งแรกใน repo นี้:** `useTranslations` ใน server component แบบไม่ async (Breadcrumbs) · ต้องดู HTML ที่ server ส่งมา
12. **iPad ที่กว้าง 768px ขึ้นไปได้ช่องตัว 14px** ถ้าซูม ให้เลื่อนจุดสลับ `text-base` ไปที่ `lg`

---

## ภาคผนวก ก: ขอบเขต P2-A ของ critic §7 เทียบกับร่าง

| ขอบเขตใน critic §7 | อยู่ในส่วน | สถานะ |
|---|---|---|
| D1–D8 | 3, 4, 6, 8 | ครบ |
| token, คู่ contrast, `::placeholder`, `select-chevron` | 3 | ครบ |
| `buttonVariants` (sizes, `danger`, disabled ไม่ใช้ opacity, `busy`), safe link, ลบ touch icon | 4 | ครบ · `busy` ได้ที่ใช้ตาม I12 |
| เมนู, command, popover, `aria-disabled` + คำอธิบาย, `.cbox`, แถบบน | 5 | ครบ · padding 6px ของ popover (critic G6) ตัดสินให้คง `p-4` (ข้อ 5 ข้อ 22) |
| `StatusBadge` ขนาดเดียว + token ของ marker | 8.1 | ครบ · ไม่เพิ่ม `neutral-border` (T4, ข้อ 8.1.4) |
| Breadcrumbs + `common.breadcrumb` | 8.2 | ครบ |
| toast แบบเงียบ · `ActionEmptyState` · `EmptyNote` · `Notice` | 7 | ครบ |
| primitive ช่องกรอก + ต่อเข้า 4 จุด | 6 | ครบ · พื้นสีขาวตัดสินใน 2A (I22) |
| `Nil`, `formatCount`, `formatMoney` | 8.3 | ครบ |
| codemod R1, R2, R3, R7 + guard | 9 | ครบ |
| แก้ตัวเลขในเอกสารตาม critic §3 ข้อ 10 | 3.10, 6.11 | DESIGN.md มีแค่ :229 (119) และ :308 (384) ซึ่งแก้แล้ว · "258", "242" และ "64 ป้าย" อยู่ในสเปกเฟส 1 ซึ่งเป็นบันทึกย้อนหลัง ไม่แก้ |
| aria-label ภาษาอังกฤษในแถบบน (G15) | 5.10 | ครบ · `closeLabel = "Close"` ของ `dialog.tsx:54` และ `sheet.tsx:51` อยู่ใน 2C (G6) |

**ยังไม่มีเจ้าของ:**
- **pill ที่ใช้สีจากฐานข้อมูล 2 จุด** (สเปกเฟส 1 ข้อ 15 #10 · sweeps §6) อยู่ที่ `asset-scan-search-tool.tsx:170-175` และ `asset-label-batch-tool.tsx:783-788`
  - critic §1 ทำเครื่องหมายว่ามีเจ้าของแล้ว แต่ไม่อยู่ในขอบเขตของงานย่อยใดใน critic §7
  - ต้องเพิ่ม `status.name` ใน `src/app/api/search/route.ts:131-134` และ `asset-management/labels/page.tsx:122-125` ซึ่งเกินขอบเขตของ 2A
  - เสนอให้ไป 2D พร้อม pill ใน G1
- **ช่องปุ่มปิดใช้งานของ QuickAction** (`assets/[id]/page.tsx:1794-1800`) เสนอให้ไป 2D (ข้อ 9.8 ข้อ 16)

**API ที่ 2A สร้างแต่ยังไม่มีที่ใช้ใน 2A:** `Textarea` · `SearchField` · `EmptyNote` · `Nil` / `orNil` · `display-format` · `linkVariants` · variant `danger` (ปุ่มแดงทุกปุ่มในหน้ายังเขียน class เอง) · `checkboxVariants` · API เหล่านี้ยังปรับได้จนถึงตอนล็อก guard ใน 2D

## ภาคผนวก ข: ตัวเลขที่ตรวจซ้ำ

| ข้อความ | ที่มา | นับใหม่ | ผล |
|---|---|---|---|
| `border-{tone}/NN` 254 จุด · 249 บรรทัด · 71 ไฟล์ | ข้อ 9.2 | 254 · 249 · 71 | ตรง |
| `shadow-sm` 238 จุด · 88 ไฟล์ | ข้อ 9.4 | 238 · 88 | ตรง |
| `bg-muted/NN` และ `bg-accent/NN` 123 จุด · 115 บรรทัด · 53 ไฟล์ | ข้อ 9.3 | 123 · 115 · 53 | ตรง |
| `text-[1x px]` 10 จุดใน 7 ไฟล์ | ข้อ 9.5 | 11 จุดใน 8 ไฟล์ (รวม `asset-label-print.tsx:354`) | ตรงเมื่อไม่นับป้ายพิมพ์ |
| `placeholder:text-muted-foreground` 13 บรรทัดใน 10 ไฟล์ · `placeholder=` 108 บรรทัดใน 56 ไฟล์ | ข้อ 3.6 | 13 · 10 · 108 · 56 | ตรง |
| `StatusBadge` 59 จุดใน 22 ไฟล์: xs 50 · sm 2 · ไม่ระบุ 7 · ลบ `size` 52 จุดใน 19 ไฟล์ · `size="xs\|sm"` ทั้งหมด 62 จุดใน 25 ไฟล์ | ข้อ 8.1.2 | ตรงทุกตัว (แยกแท็กหลายบรรทัด) · ชื่อซ้ำที่ประกาศในไฟล์เอง 5 จุด | critic §3 ข้อ 2 ที่เขียนว่า "49 xs" ผิด ค่าจริง 50 |
| Breadcrumbs 11 · ActionEmptyState 29 / 20 · SearchableSelect 29 / 13 · FileDropzone 17 / 14 · ScannerTextInput 5 / 4 · `<Button` 17 / 11 · `<DropdownMenu` 7 / 6 · `<DropdownMenuItem` 14 · `<PopoverContent` 4 | ข้อ 4–8 | ตรงทุกตัว | ตรง |
| `getFieldControlClasses` 10 ช่องใน 6 ไฟล์ | ข้อ 6.1 | เรียก 8 จุดใน 6 ไฟล์ (`asset-register-toolbar.tsx:31` ใช้กับ 3 ช่อง) | ตรง |
| `useConfirm()` 11 จุดใน 11 ไฟล์ | ข้อ 4.7 | 12 บรรทัด รวมตัวประกาศใน `confirm-dialog.tsx` | ข้อ 4 ถูก · critic เขียน "12 calls" นับตัวประกาศรวมไปด้วย |
| `toast.*` 133 / 47 · error 58 · `toast.error` ที่เรียกตรง 57 | ข้อ 7.2, 7.11 | 133 / 47 · `toast.error(` 58 บรรทัดใน 16 ไฟล์ (มี 1 บรรทัดอยู่ใน `ui/use-api-error.ts:21`) | ตรง |
| `apiError.toast(` 62 / 42 · `Loader2` 149 / 58 · `disabled:opacity-` 147 / 62 · `animate-spin` 94 บรรทัด | ข้อ 4.1, 7 | ตรง (`animate-spin` อยู่ใน 60 ไฟล์) | ตรง |
| `"-"` 156 จุด · 150 บรรทัด · 56 ไฟล์ · `toLocaleString()` 44 / 17 · `formatCurrency(` 42 จุดใน 13 ไฟล์ | ข้อ 8.3.1 | 156 · 150 · 56 · 44 / 17 · 43 บรรทัดใน 14 ไฟล์ (รวมตัวประกาศ) | ตรง |
| `text-primary … hover:underline` 44 บรรทัดใน 28 ไฟล์ | ข้อ 4.4 | 45 / 29 (รวม variant `link` ที่ `button-variants.ts:14` ซึ่ง 2A ลบ) | ตรง · critic ใช้ 45 |
| `font-mono` 44 บรรทัดใน 15 ไฟล์ | ข้อ 3.8 | 46 / 16 เมื่อรวม `globals.css` (2 บรรทัด) | ตรงเมื่อนับเฉพาะ ts/tsx |
| อีโมจิ 2 จุด | ข้อ 5.11 | 4 ตัวอักษรบน 2 บรรทัด ใน `src` และ `messages` | ตรง |
| "R2 230" · "codemod ประมาณ 160 ไฟล์" | critic §7 | สคริปต์ลบ 232 จุด (คงไว้ 6) · codemod แตะ 118 ไฟล์ ไม่ซ้ำกัน | critic ผิด |
| neutral-soft #EEF2F7 | ข้อ 4 ย3 | `e-light-shell.json` คือ #E9EEF5 = `--muted` | ร่างผิด (I5) |
| contrast ทุกคู่ในข้อ 3, 4, 5, 7, 8 (faint 4.95–5.77 · neutral-ink 8.48–9.88 · ring บน primary-soft 3.82 · control-border 1.61 · primary-foreground บน brand-navy 12.94 · ฯลฯ) | ข้อ 3–8 | คำนวณซ้ำด้วย `color-contrast.ts` | ตรงทุกคู่ |
| test ที่อ้างบรรทัด: `design-system:91,94-96` · `status-badge:20-64` · `scanner-text-input:193-194` · `asset-scan-search-tool:46` · `audit-scan-search-ui:15` · `asset-register-ux:99` · `settings-ldap-role-ui:20-21` · `asset-detail-ux:37-38` · `asset-register-table-ui:115-116` · `visual-consistency-ui:35-40` · `visual-foundation-guards:50,63-67` · `dropdown-menus-ui:27-41` | ข้อ 3–9 | เปิดอ่านแล้ว | ตรง · `dropdown-menus-ui` ไม่มี assertion ที่จะพัง (แค่เพิ่ม) |
