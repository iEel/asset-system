# Asset Management System - Handout

Last updated: 2026-06-08

## ระบบนี้คืออะไร

Asset Management System เป็น Web Application สำหรับบริหารจัดการทรัพย์สินองค์กร ตั้งแต่รับเข้าทรัพย์สิน, พิมพ์ QR Label, ส่งมอบ, รับคืน, โอนย้าย, ตรวจนับ, ซ่อมบำรุง, ตัดจำหน่าย, รายงาน และควบคุมสิทธิ์ผู้ใช้งาน

ระบบออกแบบสำหรับองค์กรที่มีหลายบริษัท หลายสาขา หลายแผนก และทรัพย์สินหลายประเภท เช่น IT Asset, Network, CCTV, Office Equipment, Furniture, Software License, Component และอุปกรณ์อื่น ๆ

## เหมาะกับใคร

- IT / Asset Admin: ดูแลทะเบียนทรัพย์สินและอุปกรณ์ IT
- Admin / Branch Staff: รับเข้า ส่งมอบ รับคืน และติดตามทรัพย์สินประจำสาขา
- Auditor / Audit Reviewer: ตรวจนับด้วย QR และ review ข้อมูลที่ไม่ตรง
- Accounting: ดูรายงาน, รหัสทรัพย์สินทางบัญชี, มูลค่า และค่าเสื่อม
- Manager / Employee: ดูทรัพย์สินที่เกี่ยวข้องกับตนเองตามสิทธิ์
- System Admin: ดูแลผู้ใช้, สิทธิ์, LDAP, ตั้งค่าระบบ และ readiness

## จุดเด่นหลัก

### 1. ทะเบียนทรัพย์สินกลาง

- เพิ่ม/แก้ไขทรัพย์สินแบบรายการเดียวหรือแบบ batch
- Import/Export Excel
- ตัวกรองด่วนสำหรับงานประจำ เช่น ข้อมูลไม่ครบ, ใกล้หมดประกัน, รอซ่อม, อยู่ระหว่างซ่อม และชุดคอลัมน์สำหรับมุมมองปฏิบัติการ/บัญชี/ตรวจนับ
- ค้นหาทรัพย์สินจากรหัสทรัพย์สิน, Serial Number, ชื่อผู้ถือครอง หรือรหัสพนักงานของผู้ถือครองปัจจุบันได้
- สร้าง Asset Tag อัตโนมัติจากรูปแบบที่ตั้งค่าได้
- แยกบริษัทเจ้าของทรัพย์สินออกจากผู้ถือครองจริง
- รองรับรูปทรัพย์สิน, รูปประจำรุ่น, เอกสารแนบ, PO/Invoice กลาง และข้อมูลเฉพาะตามประเภท โดยหน้าทะเบียนใช้รูปประจำรุ่นเป็น thumbnail หลักเพื่อให้รายการรุ่นเดียวกันดูสม่ำเสมอ

### 2. QR Label และการสแกนหน้างาน

- พิมพ์ QR Code + Asset Tag text
- รองรับ label tape 12mm, 18mm, 24mm และ custom
- ตั้งค่า Public QR Base URL สำหรับใช้งานหลัง deploy จริง
- สแกน QR จากมือถือเพื่อเปิดรายละเอียดทรัพย์สิน
- รองรับการสแกน Serial Number / Barcode สำหรับป้ายผู้ผลิต

### 3. ส่งมอบ รับคืน และโอนย้าย

- ส่งมอบทรัพย์สินให้พนักงาน แผนก พื้นที่ หรือทรัพย์สินอื่น
- รับคืนพร้อมบันทึกสภาพ รูปหลังรับคืน ลายเซ็น และสถานะถัดไป
- กรณีนำเข้าข้อมูลเก่าที่มีผู้ถือครองอยู่แล้วแต่ยังไม่มีใบส่งมอบค้าง สามารถค้นหาในกล่อง `ข้อมูลเก่า` บนหน้ารับคืน แล้วให้ระบบสร้างรายการย้อนหลังก่อนรับคืนตามขั้นตอนปกติ
- สร้างใบซ่อมจากการรับคืนได้เมื่อพบว่าสินทรัพย์ต้องซ่อม
- โอนย้าย Location / Custodian / Department
- เก็บ Movement History และ Audit Trail ทุกครั้ง
- พิมพ์ใบส่งมอบและใบรับคืนพร้อมเลขเอกสารอ่านง่าย เช่น `HO-202606-0001`, `RT-202606-0001`

### 4. ตรวจนับทรัพย์สิน

- สร้างรอบตรวจนับจาก scope ที่เลือก
- หน้า รอบตรวจนับ แสดงงานถัดไป เช่น สแกนต่อ, Review รายการไม่ตรง, และรอบที่พร้อมปิด พร้อมตัวกรองด่วนสำหรับงานปริมาณมาก โดยกดเปลี่ยนตัวกรองแล้วหน้าจอไม่เด้งกลับขึ้นด้านบน
- ระบบสร้าง Expected Asset List ก่อนเริ่มตรวจ
- สแกน QR ต่อเนื่องจากมือถือหรือกรอกค้นหาเอง
- หน้าสแกนบนมือถือรวมผลสแกนปัจจุบันกับรายการสแกนล่าสุดไว้ในกล่องเดียว และมีปุ่มหลักด้านล่างจอ เพื่อช่วยเดินตรวจจำนวนมากได้เร็วขึ้น
- อุปกรณ์ที่รองรับสามารถเปิดไฟฉายในหน้ากล้องสแกนได้เมื่อทำงานในจุดแสงน้อย
- บันทึกรูปหลักฐานและข้อมูลจริงที่พบ
- แยกกรณี Found, Mismatch, Not Found, Out of Scope
- Reviewer ตรวจและอนุมัติ Finding ก่อนอัปเดตข้อมูลหลัก
- เมนู รายการไม่ตรง เป็นศูนย์จัดการ Finding โดยแยกงานรอ Review, งานที่ต้องแก้ไข, งานเกินกำหนด และงานที่ปิดแล้ว พร้อมเทียบข้อมูลในระบบกับข้อมูลที่พบจริงในหน้าเดียว
- Export ผลตรวจนับและ Finding เป็น Excel/PDF

### 5. ซ่อมบำรุงและ Preventive Maintenance

- สร้างใบซ่อมจากหน้า Maintenance, Asset Detail หรือ Check-in
- ติดตามสถานะงานซ่อม, ผู้แจ้ง, ผู้รับผิดชอบ, Vendor, ค่าใช้จ่าย และหลักฐาน
- ปิดงานซ่อมพร้อมเลือกสถานะทรัพย์สินหลังซ่อม
- สร้าง Preventive Maintenance Plan และ generate ticket ตามรอบเวลา

### 6. ตัดจำหน่ายทรัพย์สิน

- สร้างคำขอตัดจำหน่าย
- แยกขั้นตอนอนุมัติและขั้นตอน execution จริง
- เก็บหลักฐาน, ผู้รับ/ผู้ซื้อ, ปลายทาง, เลขเอกสาร, มูลค่าจริง และวันที่เสร็จสิ้น
- พิมพ์เอกสารตัดจำหน่ายและ export รายงานได้

### 7. รายงานและ Dashboard

- Dashboard และ Work Center สำหรับดูงานสำคัญ
- Asset Register report และ asset overview export
- รายงาน Audit, Finding, Maintenance, Disposal
- PDF รองรับฟอนต์ภาษาไทย
- มี policy builder สำหรับค่าเสื่อมราคาแบบ straight-line ตาม category

### 8. Master Data ครบสำหรับองค์กร

- Company
- Branch
- Department
- Employee / Custodian
- Location แบบลำดับชั้น
- Asset Category พร้อม custom field template และ checklist รูปตามประเภท
- Brand / Model พร้อมรูปประจำรุ่นและ structured specs
- Supplier โดยรองรับ Tax ID / Supplier Code

### 9. สิทธิ์ผู้ใช้และ AD/LDAP

- Login ด้วยบัญชี local หรือ AD/LDAP
- Role-Based Access Control แบบ `module:action`
- Sidebar ซ่อนเมนูที่ผู้ใช้ไม่มีสิทธิ์
- หน้า Access Denied สำหรับ direct URL ที่ไม่มีสิทธิ์
- LDAP sync แบบ Preview / Manual / Scheduled พร้อม safety threshold
- Auto-provision user โดย link กับ Employee จาก email หรือ `employeeID`
- Employee self-service page สำหรับดูทรัพย์สินที่ตนถือครอง

### 10. ความพร้อมใช้งานจริง

- Production readiness checklist
- Backup/restore runbook
- Storage governance สำหรับตรวจไฟล์หายหรือ orphan files
- Upload validation ด้วย size, MIME, extension, content signature และ optional scanner hook
- Security headers และ private attachment responses
- Scheduler สำหรับ PM, LDAP Sync และ Notification Digest

## Workflow ภาพรวม

```text
รับเข้า / ซื้อทรัพย์สิน
→ เพิ่ม Asset หรือ Batch Create
→ แนบเอกสาร PO/Invoice และรูป
→ Generate Asset Tag
→ Print QR Label
→ ส่งมอบ / โอนย้าย / รับคืน
→ ซ่อมบำรุงหรือเสนอจำหน่ายถ้าจำเป็น
→ ตรวจนับด้วย QR
→ Review Finding
→ Report / Audit Trail
```

## ประโยชน์ที่องค์กรจะได้

- รู้ว่าทรัพย์สินอยู่ที่ไหนและใครถือครอง
- ลดปัญหาทรัพย์สินหายหรือข้อมูลไม่ตรง
- ตรวจนับเร็วขึ้นด้วย QR และมือถือ
- มีหลักฐานรูปถ่าย ลายเซ็น และเอกสารประกอบ
- ติดตามประวัติส่งมอบ รับคืน โอนย้าย ซ่อม และตัดจำหน่ายย้อนหลังได้
- รองรับ audit และการควบคุมภายในได้ดีขึ้น
- พร้อมต่อยอดกับ AD/LDAP, scheduler, reporting และ deployment production

## สิ่งที่ควรยืนยันก่อน Go-Live

- Public QR Base URL สำหรับ QR Label
- ขนาดเทปและ driver printer เช่น Brother PT-E550W
- บัญชี database production แบบ least privilege
- Backup/restore owner, RTO, RPO และ restore test
- LDAP default role และ employee matching rule
- LDAP scheduled sync safety threshold
- UAT ตาม role และ workflow จริง
- `npm run verify` และ `npm run build` ผ่านก่อน release
