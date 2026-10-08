# ตรวจทั้งระบบ 2026-10-07 — ฟังก์ชัน ความปลอดภัย และ UI/UX

> ตรวจเมื่อ: 2026-10-07 · branch ที่ตรวจ: `master` ที่ `d6ad687`
> สถานะการแก้ไขอัปเดตล่าสุด: 2026-10-07 (รอบที่ 1 และ 2 แก้บน branch `fix/security-round-1`)

## วิธีตรวจ

- อ่านโค้ด 596 ไฟล์ใน `src` + `DEVELOPER_HANDOFF.md` และ `docs/01–16` แบ่งตรวจคู่ขนาน 5 ส่วน: logic ทรัพย์สิน · ตรวจนับ/ซ่อม/จำหน่าย · ความปลอดภัยและ RBAC · รีวิว UX · สแกน UI อัตโนมัติ (impeccable detect)
- ข้อระดับ High ทุกข้อเปิดโค้ดยืนยันซ้ำ
- เปิดหน้าจริงที่ `localhost:3000` ด้วย session System Administrator แบบดูอย่างเดียว ไม่บันทึก ไม่อนุมัติ ไม่ส่งฟอร์ม
- ตอนตรวจ `.env` ของเครื่อง dev ชี้ไปที่ฐานข้อมูล Production จึงไม่ได้รัน test/tsc/lint ในรอบตรวจ (รันในรอบแก้ไขบน DB dev แล้ว)
- snapshot UI critique: `.impeccable/critique/2026-10-06T17-31-20Z__src.md` (ไม่ได้ commit)

## สรุป

1. เครื่อง dev ต่อ Production ด้วย login `sa` → **แก้แล้ว** ด้วย DB dev แยก (หัวข้อ E)
2. ช่องโหว่สิทธิ์ร้ายแรงหลายข้อ → **แก้แล้วรอบที่ 1** (หัวข้อ S)
3. หลายเส้นทางทำให้ทรัพย์สินค้าง (คืน/ซ่อม/จำหน่ายไม่ได้) → รอบที่ 2 (หัวข้อ A, B)
4. ข้อมูลทดสอบปนใน Production ทำให้ตัวเลขเพี้ยน → ยังเปิด
5. UI: โครงงานดี แต่ความสม่ำเสมอต่ำ · คะแนน heuristic 22/40 → รอบหลัง (หัวข้อ U)

## E — สภาพแวดล้อมและ Production

| # | ปัญหา | หลักฐาน | สถานะ |
|---|---|---|---|
| E1 | `.env` ใช้ `sa` ต่อ DB Production · `trustServerCertificate=true` ตายตัว | `src/lib/db-config.ts:34`, `prisma.config.ts` | **ทำแล้วบางส่วน**: เครื่อง dev ใช้ `asset_management_dev` / login `asset_dev` แล้ว · cert validation ยังปิด · Prod ยังใช้ `sa` |
| E2 | README สั่ง `npx prisma db push` | `README.md` | **แก้แล้ว** `5f83e24` |
| E3 | `cleanup-test-data` ตัดสิน Production จาก `NODE_ENV` อย่างเดียว | `scripts/cleanup-test-data.mjs` | **แก้แล้ว** `5f83e24` — ตัดสินจากชื่อ DB |
| E4 | ไฟล์แนบเก็บเป็น absolute path · ไฟล์ Prod เปิดในเครื่อง dev ได้ `500 Invalid attachment path` | `src/lib/uploads.ts:39` | เปิด |
| E5 | `ldap-sync.mjs` ค่าเริ่มต้นเป็น apply | `scripts/ldap-sync.mjs` | **แก้แล้ว** `5f83e24` — preview เป็นค่าเริ่มต้น |
| E6 | รอบตรวจนับ `AUD-2026-0002 "Test"` (Draft, 1,509 รายการ) ค้างใน Prod · coverage นับรอบ Draft · readiness ของการจำหน่ายบล็อกทรัพย์สินที่อยู่ในรอบที่ยังไม่ปิด จึงจำหน่ายแทบทุกชิ้นไม่ได้ | `src/lib/audit-round-status.ts:5` | เปิด — รอผู้ใช้ยกเลิกผ่าน UI |
| E7 | `asset_management` ไม่มี backup ตั้งแต่ 2026-08-31 · FULL recovery ไม่มี log backup (log 3,144 MB) | `msdb.dbo.backupset` | เปิด — ผู้ดูแลเซิร์ฟเวอร์ |

## S — ความปลอดภัยและสิทธิ์

| # | ระดับ | ปัญหา | สถานะ |
|---|---|---|---|
| S1 | High | `GET /api/admin/users` ส่ง `passwordHash` | **แก้แล้ว** `276fa57` |
| S2 | High | settings API ส่ง `ldap_bind_password` และบันทึก plaintext ลง `system_logs` | **แก้แล้ว** `160505b` · แถวเก่าใน `system_logs` ยังมีค่าเดิม |
| S3 | High | `setting:edit` เปลี่ยน LDAP URL แล้วยึดบัญชี admin ได้ · ldap-test เป็น SSRF | **แก้แล้ว** `160505b` (LDAP ทั้งหมดเฉพาะ `system_admin`) · การจับคู่บัญชี LDAP ↔ local ยังหลวม |
| S4 | High | `user:edit` / `role:edit` ยกระดับเป็น `system_admin` ได้ | **แก้แล้ว** `276fa57` |
| S5 | High | JWT ไม่ refresh 8 ชม. · `role.isActive` ไม่มีผล | **แก้แล้ว** `0bef806` |
| S6 | High | login ไม่มี rate-limit · ผิดแต่ละครั้ง bind AD | **แก้แล้ว** `0bef806` |
| S7 | Medium | ไม่มีการจำกัดข้อมูลตามบริษัท/สาขา | เปิด (design gap) |
| S8 | Medium | export ทะเบียนใช้แค่ `asset:view` · ตัด 5,000 แถวเงียบ · ไม่มี log | เปิด |
| S9 | Medium | error message ดิบของ Prisma/filesystem ถึงผู้ใช้ (`src/lib/api-response.ts`) | **แก้แล้ว** `4c2aa77`, `980b906` (branch `feat/thai-copy-cleanup`) · ส่ง "Unexpected error · ref" + log ref เดียวกัน |
| S10 | Low | dashboard แสดง system log โดยไม่เช็ค `log:view` · `.codex/` ฯลฯ ไม่อยู่ใน `.gitignore` · host DB อยู่ใน git history · scheduler token เทียบด้วย `===` | เปิด |

## A — Logic ทรัพย์สิน (ส่งมอบ / คืน / โอน)

| # | ระดับ | ปัญหา | ที่ / สถานะ |
|---|---|---|---|
| A1 | High | ส่งมอบชิ้นเดียวกันพร้อมกันผ่านทั้งคู่ → active checkout ซ้อน ทรัพย์สินค้างถาวร (legacy-checkout, transfer เหมือนกัน) | `src/app/api/assets/[id]/checkout/route.ts` · **`9bf2cdd` แก้แล้ว (+ migration unique index — Prod ยังไม่ apply)** |
| A2 | High | bulk-update เปลี่ยนผู้ถือครองข้าม workflow แม้ของถูกยืม/จำหน่ายแล้ว · PUT แก้ custody ระหว่างยืมได้ | `src/app/api/assets/bulk-update/route.ts` · **`edefbc5` แก้แล้ว** |
| A3 | High | เปิดใบซ่อม/คำขอจำหน่ายบนของที่ถูกยืมอยู่ได้ → คืนไม่ได้ | `src/lib/maintenance-policy.ts`, `src/lib/disposal-policy.ts` · **`56abb27` แก้แล้ว (ซ่อม) · จำหน่ายถูกกันด้วย readiness `open_checkout` อยู่แล้ว** |
| A4 | Med-High | คืนเป็น "รอซ่อม" โดยไม่สร้างใบซ่อม → เปิดใบซ่อมทีหลังไม่ได้ · ใบซ่อมจาก check-in สถานะ `open` เดินต่อไม่ได้ | `src/app/api/assets/[id]/checkin/route.ts` · **`56abb27` แก้แล้ว** |
| A5 | Medium | Status Correction ไม่ดู workflow ค้าง · `asset:edit` ชุบ Disposed กลับ Ready ได้ | `status-correction/route.ts` |
| A6 | Medium | Import commit ทีละแถว · preview ไม่เช็ค tag ซ้ำกับรายการที่ถูก soft-delete | `import-confirm/route.ts` |
| A7 | Medium | ยืมให้แผนกแบบชั่วคราว เปลี่ยน `departmentId` ถาวร | `checkout/route.ts`, `checkin/route.ts` |
| A8 | Medium | เลขเอกสาร HO/RT ไม่มี unique · ออกซ้ำได้เมื่อพร้อมกัน | `src/lib/operation-document-number.ts` |
| A9 | Medium | วันที่เริ่มต้นในฟอร์มใช้ UTC (00:00–06:59 ได้วันที่ของเมื่อวาน) — ยืนยันในเบราว์เซอร์ | `checkout-form.tsx:68`, `checkin-form.tsx:90`, `audit-round-form.tsx`, `disposal-execution-button.tsx` |
| A10 | Medium | `asset:edit` ลบทรัพย์สินได้ผ่านช่อง Active · DELETE ไม่มี guard | `src/lib/validations/asset.ts:49` |

ข้อมูลจริงสอดคล้องกับ A4: Dashboard แสดง รอซ่อม 8 + อยู่ระหว่างซ่อม 2 แต่หน้าซ่อมบำรุงแสดงงานเปิดอยู่ 0

## B — ตรวจนับ / ซ่อมบำรุง / จำหน่าย

| # | ระดับ | ปัญหา | ที่ |
|---|---|---|---|
| B1 | High | `applyCorrections` ให้ผู้มีแค่ `audit:edit` อนุมัติ finding ตัวเองและแก้ที่ตั้ง/ผู้ถือครองทันที | `src/app/api/audit-rounds/[id]/scan/route.ts` · **`e1a4346` แก้แล้ว** |
| B2 | High | ผู้อนุมัติที่ไม่ผูกพนักงาน (เช่น admin) อนุมัติแล้ว execute เองได้ | `src/lib/disposal-approval-service.ts:177` · **`3004555` แก้แล้ว** |
| B3 | High | ปิดงานซ่อมเป็น "รอจำหน่าย" ได้ แต่สร้างคำขอจำหน่ายจากสถานะนั้นไม่ได้ | `src/lib/maintenance-ticket-service.ts:305`, `src/lib/disposal-policy.ts:27` · **`3004555` แก้แล้ว** |
| B4 | High | เปิดใบซ่อมไม่ lock ทรัพย์สิน · รับสถานะนอกเหนือ Ready/In Use | `src/lib/maintenance-ticket-service.ts:53` · **`56abb27` แก้แล้ว** |
| B5–B13 | Medium/Low | `[PM]` prefix ทำให้ค้าง · race ของ reject/review/mark-not-found/close round · สแกนนอกขอบเขตซ้ำกลายเป็น "พบ" · offline queue ไม่มี idempotency · PM run หยุดทั้งรอบ/สร้าง PM ให้ของที่จำหน่ายแล้ว/วันครบกำหนดสิ้นเดือนเลื่อน · สร้างรอบด้วยสถานะ closed ได้ · ลบหลักฐานหลังปิดงานได้ · สุ่มตัวอย่างได้ชุดเดิม · digest ตัดวันตาม UTC | ดูรายละเอียดในหัวข้อ log ของรอบแก้ |

## M — Master data

| # | ปัญหา | ที่ |
|---|---|---|
| M1 | ลบแผนก/ยี่ห้อ/รุ่นได้แม้ยังมีข้อมูลผูก | `src/app/api/departments/[id]/route.ts`, `brands/[id]`, `models/[id]` |
| M2 | dropdown ทรัพย์สินแม่/License ดึงแค่ 500 ชิ้นแรก (Prod มี 1,751) · เอกสารจัดซื้อ 300 | `src/lib/asset-form-options.ts:109` |
| M3 | ตั้งค่า "องค์กร" ยังเป็น "บริษัท ตัวอย่าง จำกัด" และไม่มีโค้ดใช้ค่านี้ | `src/lib/system-setting-defaults.ts:133` |
| M4 | DELETE บริษัทส่ง error ดิบต่างจากโมดูลอื่น — **แก้แล้ว** `4c2aa77` (ใช้ `errorResponse`) | `src/app/api/companies/[id]/route.ts` |

## U — UI/UX (heuristic 22/40 · Acceptable)

| ระดับ | ปัญหา |
|---|---|
| P1 | ตารางทะเบียนที่ 1440px คอลัมน์ปุ่มติดขวาบัง "สถานะ" และ "สภาพ" · ตัวกรองกินจอแรก ~60% · มือถือไม่เห็นแถวในจอแรก |
| P1 | `--warning #F59E0B` (~2.1:1) และ `--success #16A34A` (~3.3:1) ใช้เป็นสีตัวอักษร ไม่ผ่าน AA |
| P1 | การกระทำที่ย้อนไม่ได้ดูเหมือนปุ่มธรรมดา · ลบทรัพย์สินด้วย `window.confirm` แล้ว toast "บันทึกสำเร็จ" · มี `window.confirm` 13 จุด |
| P1 | สแกนตรวจนับ: กล้องหยุดทุกชิ้น ไฟฉาย reset ไม่มี haptic ปุ่มเปิดกล้องอยู่ใต้ header |
| P1 | ไทย/อังกฤษปน ("Finding รอตรวจ", "Scope", "ปี 2026" ข้าง "25/06/2569") · `lang="th"` ตายตัว · API error เป็นอังกฤษ |
| P2 | อนุมัติอยู่ใต้เมนู "การตั้งค่า" · กล่องงานซ้อน 4 ที่ · แนวโน้ม −100% เพราะเทียบช่วงไม่เท่ากัน · กิจกรรมล่าสุดเต็มไปด้วย LDAP sync |
| P2 | component drift: dialog 5+ แบบ, badge 2 ชุด, pagination 4 แบบ · ไม่มีฟอนต์ไทย (`Inter` latin) |

ผู้ใช้เลือกให้ภาษาไทยเป็นหลัก หน้า EN ใช้น้อย

## ลำดับแก้ที่ผู้ใช้เลือก

1. ความปลอดภัย + Production (Critical/High) — **เสร็จรอบที่ 1** commit `160505b`, `0bef806`, `276fa57`, `5f83e24`
2. ทรัพย์สินค้าง: A1–A4, B1–B4 — **เสร็จรอบที่ 2** commit `9bf2cdd`, `edefbc5`, `56abb27`, `3004555`, `e1a4346`
3. UI P1
