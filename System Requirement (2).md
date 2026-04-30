# System Requirements  
## Inventory / Asset Management Web Application

---

## 1. วัตถุประสงค์ของระบบ

พัฒนาระบบ Web Application สำหรับบริหารจัดการทรัพย์สินของบริษัท รองรับหลายบริษัทในเครือ หลายสาขา หลายแผนก และทรัพย์สินหลายประเภท เช่น

- IT Asset
- Admin Asset
- Network Equipment
- CCTV
- Office Equipment
- Software License
- Accessory
- Consumable
- อุปกรณ์อื่น ๆ

ระบบต้องสามารถตอบคำถามสำคัญเกี่ยวกับทรัพย์สินได้ว่า

1. ทรัพย์สินชิ้นนี้คืออะไร
2. เป็นของบริษัทใด
3. อยู่สาขาใด
4. อยู่พื้นที่ใด
5. ใครเป็นผู้ถือครอง
6. สภาพปัจจุบันเป็นอย่างไร
7. มีประวัติการรับ-คืน โอนย้าย ซ่อม ตรวจนับ หรือตัดจำหน่ายอย่างไร

---

## 2. หลักการออกแบบระบบ

ระบบต้องแยกข้อมูลออกเป็น 3 แกนหลัก ได้แก่

### 2.1 Organization Structure

ใช้สำหรับโครงสร้างองค์กร

```text
Company → Branch → Department → Employee
```

ตัวอย่าง

```text
Company: SONIC
Branch: Head Office
Department: IT
Employee: นาย A
```

---

### 2.2 Physical Location

ใช้สำหรับตำแหน่งที่ตั้งจริงของทรัพย์สิน

```text
Branch → Location / Area / Room / Rack / Zone
```

ตัวอย่าง

```text
HO - IT Room
HO - Admin Store
HO - 1F Office Area
HO - Server Rack
KK - Warehouse Zone A
TIP7 - CCTV Rack
```

**ข้อกำหนดสำคัญ:**  
ห้ามผูก Department เข้ากับ Location โดยตรง เพราะถ้าแผนกย้ายพื้นที่ เช่น จากชั้น 2 ไปชั้น 1 จะทำให้ต้องแก้ไขโครงสร้างจำนวนมาก

โครงสร้างที่ถูกต้องคือ

```text
Department = หน่วยงาน / เจ้าของ / ผู้ใช้งาน
Location = พื้นที่จริง
Asset = ตัวเชื่อมระหว่าง Department, Location และ Custodian
```

---

### 2.3 Asset

Asset เป็นข้อมูลกลางของระบบ

```text
Asset
├── Company Owner
├── Branch
├── Department Owner
├── Custodian
├── Home Location
├── Current Location
├── Status
└── Condition
```

---

## 3. Scope ของระบบ

ระบบต้องรองรับ Module หลักดังนี้

| Module | รายละเอียด |
|---|---|
| Company Management | จัดการบริษัทในเครือ |
| Branch Management | จัดการสาขา |
| Department Management | จัดการแผนก |
| Location Management | จัดการพื้นที่จริงของทรัพย์สิน |
| Employee / Custodian | จัดการพนักงานและผู้ถือครอง |
| Asset Register | ทะเบียนทรัพย์สิน |
| Category / Model | หมวดหมู่ ยี่ห้อ รุ่น |
| Status / Condition | สถานะและสภาพทรัพย์สิน |
| Check-out / Check-in | ส่งมอบและรับคืนทรัพย์สิน |
| Transfer / Relocation | โอนย้ายทรัพย์สิน |
| Bulk Move Location | ย้าย Location หลายรายการพร้อมกัน |
| Asset Audit | ตรวจนับทรัพย์สิน |
| Audit Expected Asset List | รายการทรัพย์สินที่ต้องตรวจในรอบ Audit |
| Audit Finding | บันทึกข้อมูลที่ตรวจพบไม่ตรง |
| Reconciliation | Review และ Approve เพื่อแก้ข้อมูลหลัก |
| Maintenance | ซ่อม / เคลม / บำรุงรักษา |
| Disposal | ตัดจำหน่าย / ขาย / บริจาค / สูญหาย |
| QR Code / Barcode | สแกนและติดตามทรัพย์สิน |
| Attachment | แนบเอกสารและรูปภาพ |
| Dashboard / Report | รายงานและสรุปผล |
| User / Permission | สิทธิ์ผู้ใช้งาน |
| Audit Trail | ประวัติการแก้ไขข้อมูล |

---

## 4. Master Data Requirements

---

### 4.1 Company Management

ระบบต้องสามารถเพิ่ม แก้ไข ค้นหา และปิดการใช้งานบริษัทได้

#### Field ที่ต้องมี

| Field | Required | รายละเอียด |
|---|---|---|
| Company ID | Yes | Auto Generate |
| Company Code | Yes | เช่น SONIC, GLINK |
| Company Name TH | Yes | ชื่อบริษัทภาษาไทย |
| Company Name EN | No | ชื่อบริษัทภาษาอังกฤษ |
| Tax ID | No | เลขประจำตัวผู้เสียภาษี |
| Address | No | ที่อยู่บริษัท |
| Active Status | Yes | Active / Inactive |
| Created Date | Yes | System Generated |
| Updated Date | Yes | System Generated |

---

### 4.2 Branch / Site Management

ระบบต้องรองรับหลายสาขา และสามารถผูก Branch กับ Company ได้

#### Field ที่ต้องมี

| Field | Required | รายละเอียด |
|---|---|---|
| Branch ID | Yes | Auto Generate |
| Branch Code | Yes | เช่น HO, KK, LCB, TIP7 |
| Branch Name | Yes | ชื่อสาขา |
| Company ID | Yes | บริษัทที่สาขาสังกัด |
| Address | No | ที่อยู่สาขา |
| Contact Person | No | ผู้ประสานงาน |
| Active Status | Yes | Active / Inactive |

---

### 4.3 Department Management

Department ต้องเป็นข้อมูลเชิงองค์กร ไม่ใช่ตำแหน่งที่ตั้ง

#### Field ที่ต้องมี

| Field | Required | รายละเอียด |
|---|---|---|
| Department ID | Yes | Auto Generate |
| Department Code | Yes | เช่น IT, ACC, HR |
| Department Name | Yes | ชื่อแผนก |
| Company ID | No | กรณีต้องแยกตามบริษัท |
| Active Status | Yes | Active / Inactive |

---

### 4.4 Location Management

Location ใช้แทนพื้นที่จริงของทรัพย์สิน ไม่ควรผูกกับ Department โดยตรง

#### ตัวอย่าง Location

```text
HO - IT Room
HO - Admin Store
HO - Server Room
HO - 1F Office Area
HO - 2F Office Area
KK - Warehouse Zone A
LCB - Meeting Room
TIP7 - CCTV Rack
```

#### Location Type ที่ควรรองรับ

| Type | ตัวอย่าง |
|---|---|
| Site | Head Office |
| Building | อาคารหลัก |
| Floor | ชั้น 1 |
| Room | IT Room |
| Area | Office Area |
| Zone | Warehouse Zone A |
| Rack | Server Rack |
| Desk | Desk A01 |
| Storage | Admin Store |
| Vehicle | รถบริษัท |
| User-held | อยู่กับพนักงาน |
| Offsite | นอกสถานที่ |

#### Field ที่ต้องมี

| Field | Required | รายละเอียด |
|---|---|---|
| Location ID | Yes | Auto Generate |
| Location Code | Yes | เช่น HO-ITROOM |
| Location Name | Yes | ชื่อพื้นที่ |
| Branch ID | Yes | สาขา |
| Parent Location ID | No | รองรับ Location แบบลำดับชั้น |
| Location Type | Yes | Room / Area / Rack / Zone |
| Description | No | รายละเอียดเพิ่มเติม |
| Active Status | Yes | Active / Inactive |

#### Business Rules

1. Location ที่มีประวัติใช้งานแล้ว ห้ามลบทิ้งถาวร
2. ให้ใช้ Active / Inactive แทนการลบ
3. ต้องสามารถเปลี่ยนชื่อ Location ได้โดยไม่ทำให้ประวัติเก่าเสีย
4. ต้องมีฟังก์ชัน Bulk Move Asset จาก Location หนึ่งไปอีก Location หนึ่ง

---

### 4.5 Employee / Custodian Management

ระบบต้องจัดการข้อมูลพนักงานและผู้ถือครองทรัพย์สินได้

#### Field ที่ต้องมี

| Field | Required | รายละเอียด |
|---|---|---|
| Employee ID | Yes | Auto Generate |
| Employee Code | Yes | รหัสพนักงาน |
| Full Name TH | Yes | ชื่อ-นามสกุล |
| Full Name EN | No | ชื่ออังกฤษ |
| Email | No | ใช้แจ้งเตือน |
| Company ID | Yes | บริษัท |
| Branch ID | Yes | สาขา |
| Department ID | Yes | แผนก |
| Position | No | ตำแหน่ง |
| Employment Status | Yes | Active / Resigned / Suspended |
| Manager | No | หัวหน้างาน |
| Active Status | Yes | Active / Inactive |

#### Functional Requirements

1. เพิ่ม / แก้ไข / ค้นหาพนักงานได้
2. Import Employee จาก Excel ได้
3. ดูรายการทรัพย์สินที่พนักงานถือครองอยู่ได้
4. รองรับ Exit Clearance กรณีพนักงานลาออก
5. รองรับ AD / LDAP Integration ในอนาคต

---

## 5. Asset Register Requirements

---

### 5.1 Asset Category

ระบบต้องรองรับหมวดหมู่ทรัพย์สิน เช่น

- Notebook
- Desktop PC
- Monitor
- Printer
- Network Equipment
- Access Point
- Server
- UPS
- CCTV
- Mobile Device
- Office Furniture
- Office Equipment
- Software License
- Accessory
- Consumable
- Component

---

### 5.2 Asset Model

ระบบต้องรองรับ Brand / Model ของทรัพย์สิน

| Category | Brand | Model |
|---|---|---|
| Notebook | Dell | Latitude 5420 |
| Monitor | Dell | P2422H |
| Switch | UniFi | USW-Pro-HD-24-PoE |
| Printer | HP | LaserJet M404 |
| CCTV | Hikvision | DS-2CDxxxx |

---

### 5.3 Asset Register

ระบบต้องสามารถเพิ่ม แก้ไข ค้นหา กรอง Import และ Export ทรัพย์สินได้

#### Field หลักของ Asset

| Field | Required | รายละเอียด |
|---|---|---|
| Asset ID | Yes | Auto Generate |
| Asset Tag | Yes | รหัสทรัพย์สิน |
| Asset Name | Yes | ชื่อทรัพย์สิน |
| Category ID | Yes | หมวดหมู่ |
| Brand ID | No | ยี่ห้อ |
| Model ID | No | รุ่น |
| Serial Number | No | Serial / Service Tag |
| Company Owner | Yes | บริษัทเจ้าของ |
| Branch ID | Yes | สาขาปัจจุบัน |
| Department Owner | No | แผนกเจ้าของ / ผู้ใช้งาน |
| Custodian ID | No | ผู้ถือครอง |
| Home Location ID | No | ที่ตั้งประจำ |
| Current Location ID | Yes | ที่ตั้งปัจจุบัน |
| Status ID | Yes | สถานะ |
| Condition ID | Yes | สภาพ |
| Purchase Date | No | วันที่ซื้อ |
| Purchase Price | No | ราคาซื้อ |
| Supplier ID | No | ผู้ขาย |
| Warranty Start Date | No | เริ่มประกัน |
| Warranty End Date | No | หมดประกัน |
| Fixed Asset Code | No | รหัสทรัพย์สินทางบัญชี |
| PO Number | No | เลข PO |
| Invoice Number | No | เลขใบกำกับ |
| Remark | No | หมายเหตุ |
| Created By | Yes | ผู้สร้าง |
| Created Date | Yes | วันที่สร้าง |
| Updated By | Yes | ผู้แก้ไขล่าสุด |
| Updated Date | Yes | วันที่แก้ไขล่าสุด |

---

### 5.4 Asset Tag Format

ระบบต้องสามารถ Generate Asset Tag อัตโนมัติได้

#### Format ที่แนะนำ

```text
[Company]-[Branch]-[Category]-[Running No.]
```

ตัวอย่าง

```text
SONIC-HO-NB-0001
SONIC-KK-PRN-0001
GLINK-LCB-AP-0001
AUTO-TIP7-CCTV-0001
```

#### Business Rules

1. Asset Tag ห้ามซ้ำ
2. Serial Number ควรตรวจสอบซ้ำได้
3. Running Number ต้องแยกตาม Company / Branch / Category ได้
4. ผู้ดูแลระบบต้องสามารถกำหนด Prefix ได้

---

### 5.5 Custom Fields

ระบบต้องรองรับ Custom Fields ตาม Category หรือ Asset Model

#### ตัวอย่าง Custom Fields สำหรับ Notebook / PC

- Computer Name
- CPU
- RAM
- Storage
- Operating System
- AD Username
- BitLocker Ref

#### ตัวอย่าง Custom Fields สำหรับ Network Equipment

- IP Address
- MAC Address
- VLAN
- Management URL
- Rack Position
- Switch Port

#### ตัวอย่าง Custom Fields สำหรับ CCTV

- Camera IP
- NVR Channel
- Camera Position
- Resolution
- PoE Switch
- Port Number

#### ตัวอย่าง Custom Fields สำหรับ Admin Asset

- Size
- Color
- Material
- Area Owner

---

## 6. Status and Condition Requirements

ระบบต้องแยก **Status** และ **Condition** ออกจากกัน

---

### 6.1 Asset Status

Status หมายถึงสถานะการใช้งานของทรัพย์สิน

| Status | ความหมาย |
|---|---|
| Ready to Deploy | พร้อมใช้งาน / อยู่ใน Stock |
| In Use | ใช้งานอยู่ |
| Spare | เครื่องสำรอง |
| Reserved | จองไว้ |
| Pending Repair | รอซ่อม |
| Under Repair | อยู่ระหว่างซ่อม |
| Claim / Warranty | ส่งเคลม |
| Awaiting Disposal | รอตัดจำหน่าย |
| Sold | ขายแล้ว |
| Donated | บริจาคแล้ว |
| Lost | สูญหาย |
| Disposed | ตัดจำหน่าย / ทำลายแล้ว |
| Retired | เลิกใช้งาน |
| Inactive | ไม่ใช้งาน |

---

### 6.2 Asset Condition

Condition หมายถึงสภาพจริงของทรัพย์สิน

| Condition | ความหมาย |
|---|---|
| New | ของใหม่ |
| Good | ใช้งานได้ดี |
| Fair | ใช้งานได้ มีตำหนิ |
| Poor | เสื่อมสภาพ |
| Damaged | เสียหาย |
| Broken | ใช้งานไม่ได้ |
| Missing Parts | อุปกรณ์ไม่ครบ |
| Obsolete | ตกรุ่น |

---

## 7. Check-out / Check-in Requirements

---

### 7.1 Check-out Asset

ใช้สำหรับส่งมอบทรัพย์สินให้พนักงาน แผนก Location หรือ Asset อื่น

ระบบต้อง Checkout ได้ให้

- User / Employee
- Department
- Location
- Another Asset

ตัวอย่าง

```text
Notebook → Checkout ให้พนักงาน
Printer → Checkout ไปที่ Location
Switch → Checkout ไปที่ Rack
SSD → Checkout ไปที่ Server
```

#### Field ที่ต้องมี

| Field | Required | รายละเอียด |
|---|---|---|
| Checkout ID | Yes | Auto Generate |
| Asset ID | Yes | ทรัพย์สิน |
| Checkout Type | Yes | User / Department / Location / Asset |
| Custodian ID | Conditional | กรณี Checkout ให้ User |
| Department ID | Conditional | กรณี Checkout ให้ Department |
| Location ID | Conditional | กรณี Checkout ให้ Location |
| Parent Asset ID | Conditional | กรณี Checkout ให้ Asset |
| Checkout Date | Yes | วันที่ส่งมอบ |
| Expected Return Date | No | วันที่คาดว่าจะคืน |
| Condition Before | Yes | สภาพก่อนส่งมอบ |
| Photo Before | No | รูปก่อนส่งมอบ |
| Remark | No | หมายเหตุ |
| Checked Out By | Yes | ผู้ทำรายการ |
| Receiver Signature | No | ลายเซ็นผู้รับ |

#### Business Rules

เมื่อ Checkout สำเร็จ ระบบต้อง

1. เปลี่ยน Asset Status เป็น In Use
2. อัปเดต Custodian / Department / Location ตามประเภทการ Checkout
3. บันทึก Asset Movement History
4. บันทึก Audit Trail
5. Asset หนึ่งชิ้นต้องมี Active Checkout ได้เพียง 1 รายการ

---

### 7.2 Check-in Asset

ใช้สำหรับรับคืนทรัพย์สิน

#### Field ที่ต้องมี

| Field | Required | รายละเอียด |
|---|---|---|
| Check-in ID | Yes | Auto Generate |
| Asset ID | Yes | ทรัพย์สิน |
| Return Date | Yes | วันที่คืน |
| Return By | Yes | ผู้คืน |
| Receive By | Yes | ผู้รับคืน |
| Condition After | Yes | สภาพตอนคืน |
| Missing Accessories | No | อุปกรณ์ที่ขาด |
| Damage Note | No | รายละเอียดความเสียหาย |
| Photo After | No | รูปตอนคืน |
| Next Status | Yes | Ready / Repair / Disposal |
| Next Location | Yes | จะเก็บไว้ที่ไหน |
| Remark | No | หมายเหตุ |

#### Business Rules

เมื่อ Check-in สำเร็จ ระบบต้อง

1. ล้างหรือเปลี่ยน Custodian เดิม
2. อัปเดต Current Location
3. อัปเดต Status ตาม Next Status
4. อัปเดต Condition ตามสภาพตอนคืน
5. บันทึก Movement History
6. บันทึก Audit Trail

---

## 8. Transfer / Relocation Requirements

ใช้สำหรับโอนย้ายทรัพย์สินระหว่างบริษัท สาขา แผนก Location หรือผู้ถือครอง

### ประเภทการโอนย้าย

| Transfer Type | ตัวอย่าง |
|---|---|
| Company Transfer | SONIC → GLINK |
| Branch Transfer | HO → KK |
| Location Move | ชั้น 2 → ชั้น 1 |
| Department Transfer | IT → Admin |
| Custodian Transfer | นาย A → นาย B |
| Bulk Location Move | ย้ายทรัพย์สินทั้งพื้นที่ |

### Functional Requirements

1. สร้างรายการโอนย้าย Asset เดียวได้
2. สร้างรายการโอนย้ายหลาย Asset พร้อมกันได้
3. ระบุ From / To ได้ตามประเภทการโอน
4. แนบเอกสารหรือรูปภาพได้
5. ระบุเหตุผลการย้ายได้
6. มีสถานะ Pending / Approved / Rejected / Completed
7. เมื่อ Approve แล้วต้องอัปเดตข้อมูล Asset
8. ต้องสร้าง Movement History
9. ต้องบันทึก Audit Trail
10. Export Transfer Form ได้

### Field ที่ต้องมี

| Field | Required |
|---|---|
| Transfer ID | Yes |
| Transfer No. | Yes |
| Transfer Type | Yes |
| Asset List | Yes |
| From Company | No |
| To Company | No |
| From Branch | No |
| To Branch | No |
| From Location | No |
| To Location | No |
| From Department | No |
| To Department | No |
| From Custodian | No |
| To Custodian | No |
| Transfer Date | Yes |
| Reason | Yes |
| Attachment | No |
| Created By | Yes |
| Approved By | No |
| Status | Yes |

---

## 9. Asset Audit Requirements

---

### 9.1 แนวคิดหลักของ Audit

ระบบต้องแยกข้อมูลออกเป็น 2 ส่วนระหว่างตรวจนับ

```text
Expected Data = ข้อมูลเดิมในระบบ
Actual Data = ข้อมูลที่ผู้ตรวจพบจริง
```

ผู้ตรวจสามารถบันทึก Actual Data ได้ทันที แต่ระบบต้องไม่อัปเดตข้อมูลหลักของ Asset โดยอัตโนมัติ ยกเว้นผู้มีสิทธิ์กด Approve ในขั้นตอน Reconciliation

---

### 9.2 Audit Round

ระบบต้องสามารถสร้างรอบตรวจนับทรัพย์สินได้

#### Scope ที่เลือกได้

- Company
- Branch
- Department
- Location
- Category
- Custodian
- Asset Status
- Asset Condition
- Asset Type

#### Field ที่ต้องมี

| Field | Required | รายละเอียด |
|---|---|---|
| Audit Round ID | Yes | Auto Generate |
| Audit Name | Yes | ชื่อรอบตรวจ |
| Audit Year | Yes | ปีที่ตรวจ |
| Scope Company | No | บริษัทที่ตรวจ |
| Scope Branch | No | สาขาที่ตรวจ |
| Scope Department | No | แผนกที่ตรวจ |
| Scope Location | No | พื้นที่ที่ตรวจ |
| Scope Category | No | หมวดทรัพย์สิน |
| Start Date | Yes | วันที่เริ่ม |
| End Date | Yes | วันที่สิ้นสุด |
| Status | Yes | Draft / Open / Closed |
| Created By | Yes | ผู้สร้าง |
| Created Date | Yes | วันที่สร้าง |

---

## 10. Audit Expected Asset List / Pending Asset Requirement

### 10.1 วัตถุประสงค์

เพื่อให้ระบบสามารถทราบได้ว่า ในแต่ละรอบการตรวจนับทรัพย์สิน มีรายการใดที่

- ตรวจแล้ว
- ยังไม่ได้ตรวจ
- ข้อมูลตรง
- ข้อมูลไม่ตรง
- ไม่พบทรัพย์สิน
- อยู่นอก Scope การตรวจ

โดยเฉพาะกรณีที่ผู้ตรวจใช้วิธี **Scan QR Code** ระบบต้องสามารถบอกได้ว่าทรัพย์สินใดบ้างที่ยังไม่ได้ Scan หรือยังไม่ได้บันทึกผลตรวจ

---

### 10.2 Audit Round ต้องสร้าง Expected Asset List

เมื่อผู้ใช้งานสร้าง Audit Round และกำหนด Scope แล้ว ระบบต้อง Generate รายการทรัพย์สินที่อยู่ใน Scope นั้นออกมาเป็น **Audit Item** ทันที

#### Scope ที่ใช้สร้าง Expected Asset List ได้

- Company
- Branch
- Department
- Location
- Category
- Custodian
- Asset Status
- Asset Condition
- Asset Type

ตัวอย่าง

```text
Audit Round: ตรวจทรัพย์สิน HO ปี 2026

Scope:
Company = SONIC
Branch = Head Office
Status = In Use, Ready to Deploy, Spare
```

เมื่อสร้างรอบ Audit ระบบต้องดึง Asset ที่เข้าเงื่อนไขมาเป็นรายการที่ต้องตรวจ

---

### 10.3 ค่าเริ่มต้นของ Audit Item

เมื่อระบบ Generate Expected Asset List แล้ว ทุก Asset ในรอบตรวจต้องมีค่าเริ่มต้นเป็น

```text
Audit Status = Pending
Audit Result = Null
Scanned At = Null
Scanned By = Null
```

ตัวอย่าง

| Asset Tag | Asset Name | Expected Location | Expected Custodian | Audit Status | Audit Result |
|---|---|---|---|---|---|
| SONIC-HO-NB-0001 | Notebook Dell | HO-F1 | คุณ A | Pending | - |
| SONIC-HO-MON-0002 | Monitor Dell | HO-F1 | คุณ A | Pending | - |
| SONIC-HO-PRN-0003 | Printer HP | HO-Admin | Admin Dept | Pending | - |

---

### 10.4 เมื่อ Scan QR Code แล้วต้องอัปเดต Audit Item

เมื่อผู้ตรวจ Scan QR Code หรือค้นหา Asset แล้วบันทึกผลตรวจ ระบบต้องอัปเดต Audit Item ของ Asset นั้น

#### กรณีข้อมูลตรง

ระบบต้องเปลี่ยนเป็น

```text
Audit Status = Scanned
Audit Result = Found
Scanned At = วันที่และเวลาที่ Scan
Scanned By = ผู้ตรวจ
```

#### กรณีข้อมูลไม่ตรง

เช่น Location, Custodian, Department หรือ Condition ไม่ตรง ระบบต้องเปลี่ยนเป็น

```text
Audit Status = Scanned
Audit Result = Wrong Location / Wrong Custodian / Wrong Department / Wrong Condition
Finding Required = Yes
Reconcile Status = Pending
```

และต้องสร้าง **Audit Finding** เพื่อรอ Review / Reconcile

---

### 10.5 ระบบต้องมีหน้ารายการ Pending Assets

ระบบต้องมีหน้าจอสำหรับดูรายการที่ยังไม่ได้ตรวจในแต่ละ Audit Round

เมนูที่แนะนำ:

```text
Audit > Audit Round > Pending Assets
```

หรือ

```text
Audit > ตรวจทรัพย์สิน HO ปี 2026 > Not Yet Scanned
```

ระบบต้องแสดงรายการที่

```text
Audit Status = Pending
```

ตัวอย่างหน้ารายการ Pending

| Asset Tag | Asset Name | Expected Location | Expected Custodian | Last Audit Date | Action |
|---|---|---|---|---|---|
| SONIC-HO-PRN-0003 | Printer HP | HO-Admin | Admin Dept | 2025-12-01 | Mark Not Found |
| SONIC-HO-SW-0004 | Switch UniFi | HO-Rack | IT | 2025-11-20 | Mark Not Found |
| SONIC-HO-UPS-0005 | UPS APC | HO-Rack | IT | 2025-10-15 | Mark Not Found |

---

### 10.6 Audit Dashboard ต้องแสดงความคืบหน้า

ในแต่ละ Audit Round ระบบต้องแสดง Dashboard ความคืบหน้า

#### ข้อมูลที่ต้องแสดง

| รายการ | ความหมาย |
|---|---|
| Total Expected | จำนวน Asset ที่ต้องตรวจทั้งหมด |
| Pending | ยังไม่ได้ตรวจ |
| Scanned | Scan แล้ว |
| Found | พบและข้อมูลตรง |
| Wrong Location | Location ไม่ตรง |
| Wrong Custodian | ผู้ถือครองไม่ตรง |
| Wrong Department | แผนกไม่ตรง |
| Wrong Condition | สภาพไม่ตรง |
| Damaged | เสียหาย |
| Missing Parts | อุปกรณ์ไม่ครบ |
| Not Found | ไม่พบทรัพย์สิน |
| Out of Scope | พบ Asset ที่ไม่อยู่ใน Scope |
| Need Review | ต้องตรวจสอบเพิ่มเติม |
| Progress % | เปอร์เซ็นต์ความคืบหน้า |

ตัวอย่าง

| รายการ | จำนวน |
|---|---:|
| Total Expected | 1,000 |
| Pending | 140 |
| Scanned | 860 |
| Found | 820 |
| Wrong Location | 20 |
| Wrong Custodian | 10 |
| Damaged | 5 |
| Need Review | 5 |
| Progress | 86% |

ระบบควรให้ผู้ใช้งานคลิกตัวเลขแต่ละสถานะเพื่อดูรายการ Asset ที่เกี่ยวข้องได้

---

### 10.7 Audit Status และ Audit Result ต้องแยกกัน

#### Audit Status

ใช้บอกว่ารายการนั้นถูกดำเนินการตรวจถึงขั้นไหนแล้ว

| Audit Status | ความหมาย |
|---|---|
| Pending | ยังไม่ได้ตรวจ / ยังไม่ได้ Scan |
| Scanned | Scan แล้ว |
| Reviewed | ตรวจสอบแล้ว |
| Reconciled | ปรับข้อมูลหลักแล้ว |
| Skipped | ข้ามการตรวจ |
| Closed | ปิดรายการแล้ว |

#### Audit Result

ใช้บอกผลที่ตรวจพบจริง

| Audit Result | ความหมาย |
|---|---|
| Found | พบและข้อมูลตรง |
| Wrong Location | พบแต่ Location ไม่ตรง |
| Wrong Custodian | พบแต่ผู้ถือครองไม่ตรง |
| Wrong Department | พบแต่แผนกไม่ตรง |
| Wrong Condition | พบแต่สภาพไม่ตรง |
| Damaged | พบว่าเสียหาย |
| Missing Parts | อุปกรณ์ไม่ครบ |
| Not Found | ยืนยันว่าไม่พบ |
| Unregistered Asset | พบทรัพย์สินที่ไม่มีในระบบ |
| Out of Scope | พบ Asset ที่ไม่อยู่ใน Scope |
| Need Review | ต้องตรวจสอบเพิ่ม |

---

### 10.8 Mark Pending Asset as Not Found

เมื่อทีมตรวจเดินตรวจครบพื้นที่แล้ว และยังมีรายการ Pending อยู่ ผู้มีสิทธิ์ต้องสามารถเลือก Mark เป็น Not Found ได้

#### Business Rule

เมื่อ Mark as Not Found ระบบต้องทำดังนี้

1. Audit Status = Reviewed
2. Audit Result = Not Found
3. Finding Type = Not Found
4. Finding Status = Pending Investigation
5. ห้ามเปลี่ยน Asset Status เป็น Lost อัตโนมัติ
6. ต้องบันทึก Audit Trail

เหตุผลคือ การตรวจไม่พบในรอบ Audit ยังไม่ควรแปลว่าสูญหายทันที ต้องรอการตรวจสอบซ้ำหรือการอนุมัติจากผู้มีสิทธิ์ก่อน

---

### 10.9 Scan Asset ที่ไม่อยู่ใน Audit Scope

กรณีผู้ตรวจ Scan QR Code แล้ว Asset นั้นไม่ได้อยู่ใน Expected Asset List ของ Audit Round ปัจจุบัน ระบบต้องแจ้งเตือนว่า

```text
Asset นี้ไม่อยู่ใน Audit Scope
```

และให้เลือก Action ได้ดังนี้

| Action | รายละเอียด |
|---|---|
| Add as Out-of-Scope Finding | เพิ่มเป็นรายการนอก Scope |
| Record as Wrong Location | บันทึกว่าอาจอยู่ผิด Location |
| Add to Current Audit | เพิ่มเข้ารอบ Audit นี้ |
| Ignore | ไม่บันทึก |
| Need Review | ส่งให้ผู้ดูแลตรวจสอบ |

ตัวอย่าง

| Asset | Expected Branch | Actual Branch | Result |
|---|---|---|
| SONIC-KK-NB-0020 | Kingkaew | Head Office | Out of Scope / Wrong Location |

---

### 10.10 Duplicate Scan Handling

ระบบต้องตรวจจับกรณี Asset เดิมถูก Scan ซ้ำใน Audit Round เดียวกัน

#### กรณี Scan ซ้ำ

ระบบต้องแจ้งเตือนว่า

```text
Asset นี้ถูกตรวจแล้วเมื่อ [วันที่ เวลา] โดย [ชื่อผู้ตรวจ]
ต้องการบันทึกซ้ำหรือไม่?
```

ระบบควรมีตัวเลือก

| Action | รายละเอียด |
|---|---|
| View Previous Scan | ดูข้อมูลที่เคย Scan |
| Update Existing Audit Item | อัปเดตรายการเดิม |
| Add Additional Scan Note | เพิ่มหมายเหตุการ Scan ซ้ำ |
| Cancel | ยกเลิก |

และต้องบันทึก Scan History ทุกครั้ง

---

### 10.11 Audit Item Field เพิ่มเติม

ให้เพิ่ม Field เหล่านี้ในตาราง `audit_items`

| Field | Required | รายละเอียด |
|---|---|---|
| Audit Item ID | Yes | Auto Generate |
| Audit Round ID | Yes | รอบตรวจ |
| Asset ID | Yes | ทรัพย์สิน |
| Expected Company | Yes | บริษัทตามระบบ |
| Expected Branch | Yes | สาขาตามระบบ |
| Expected Department | No | แผนกตามระบบ |
| Expected Location | Yes | Location ตามระบบ |
| Expected Custodian | No | ผู้ถือครองตามระบบ |
| Expected Condition | No | สภาพตามระบบ |
| Audit Status | Yes | Pending / Scanned / Reviewed / Reconciled / Skipped / Closed |
| Audit Result | No | Found / Wrong Location / Not Found ฯลฯ |
| Actual Department | No | แผนกที่พบจริง |
| Actual Location | No | Location ที่พบจริง |
| Actual Custodian | No | ผู้ถือครองที่พบจริง |
| Actual Condition | No | สภาพที่พบจริง |
| Finding Required | Yes | Yes / No |
| Reconcile Status | No | Pending / Approved / Rejected / Exception |
| Scanned At | No | วันที่เวลาที่ Scan |
| Scanned By | No | ผู้ Scan |
| Last Scan At | No | เวลาที่ Scan ล่าสุด |
| Scan Count | Yes | จำนวนครั้งที่ถูก Scan |
| Photo Evidence | No | รูปหลักฐาน |
| Remark | No | หมายเหตุ |

---

### 10.12 Audit Scan History

ระบบควรมีตาราง `audit_scan_history` เพื่อเก็บประวัติการ Scan ทุกครั้ง

#### Field ที่ควรมี

| Field | Required | รายละเอียด |
|---|---|---|
| Scan ID | Yes | Auto Generate |
| Audit Round ID | Yes | รอบตรวจ |
| Audit Item ID | No | ถ้าอยู่ใน Expected List |
| Asset ID | Yes | Asset ที่ถูก Scan |
| Scanned By | Yes | ผู้ Scan |
| Scanned At | Yes | วันที่เวลา Scan |
| Scan Location | No | Location ที่เลือกตอน Scan |
| GPS Coordinate | No | ถ้าต้องการใช้ GPS |
| Scan Result | Yes | Found / Duplicate / Out of Scope |
| Device Info | No | ข้อมูลอุปกรณ์ที่ใช้ Scan |
| Remark | No | หมายเหตุ |

---

### 10.13 Pending Asset Report

ระบบต้องมีรายงานสำหรับรายการที่ยังไม่ได้ตรวจ

#### Filter ที่ต้องมี

- Audit Round
- Company
- Branch
- Department
- Location
- Category
- Custodian
- Status
- Condition

#### Column ที่ต้องมี

| Column | รายละเอียด |
|---|---|
| Asset Tag | รหัสทรัพย์สิน |
| Asset Name | ชื่อทรัพย์สิน |
| Category | หมวดหมู่ |
| Expected Company | บริษัท |
| Expected Branch | สาขา |
| Expected Department | แผนก |
| Expected Location | Location |
| Expected Custodian | ผู้ถือครอง |
| Status | Asset Status |
| Condition | Asset Condition |
| Last Audit Date | วันที่ Audit ล่าสุด |
| Last Seen Date | วันที่พบล่าสุด |
| Remark | หมายเหตุ |

#### Export

- Excel
- PDF
- CSV

---

## 11. Audit Finding & Reconciliation Requirements

นี่คือ Module สำคัญสำหรับกรณี Audit แล้วข้อมูลไม่ตรง

---

### 11.1 Audit Finding

เมื่อผู้ตรวจพบข้อมูลไม่ตรง ระบบต้องสร้าง Audit Finding อัตโนมัติหรือให้ผู้ตรวจสร้างได้

#### ตัวอย่าง Finding

```text
Finding Type: Wrong Location
Asset: SONIC-HO-NB-0001
Expected Location: HO-F2-Accounting Area
Actual Location: HO-F1-Accounting Area
Evidence: รูปภาพ
Remark: แผนกย้ายมาชั้น 1 แล้ว
Status: Pending Review
```

#### Finding Type ที่ต้องรองรับ

| Finding Type | รายละเอียด |
|---|---|
| Wrong Location | Location ไม่ตรง |
| Wrong Custodian | ผู้ถือครองไม่ตรง |
| Wrong Department | แผนกไม่ตรง |
| Wrong Condition | สภาพไม่ตรง |
| Damaged Asset | ทรัพย์สินเสียหาย |
| Missing Parts | อุปกรณ์ไม่ครบ |
| Not Found | ไม่พบทรัพย์สิน |
| Unregistered Asset | พบทรัพย์สินที่ไม่มีในระบบ |
| Serial Mismatch | Serial ไม่ตรง |
| Need Investigation | ต้องตรวจสอบเพิ่มเติม |

---

### 11.2 Reconciliation

Asset Admin หรือผู้มีสิทธิ์ต้องสามารถ Review Finding และเลือก Action ได้

#### Action ที่ต้องรองรับ

| Action | รายละเอียด |
|---|---|
| Approve and Update Asset | อนุมัติและอัปเดตข้อมูลหลัก |
| Reject | ปฏิเสธข้อมูลที่ตรวจพบ |
| Request More Information | ขอข้อมูลเพิ่มจากผู้ตรวจ |
| Mark as Exception | บันทึกเป็นข้อยกเว้น |
| Create Transfer Record | สร้างรายการโอนย้าย |
| Create Repair Ticket | สร้างใบแจ้งซ่อม |
| Create Disposal Request | สร้างคำขอตัดจำหน่าย |
| Create New Asset | สร้าง Asset ใหม่จาก Unregistered Asset |
| Mark as Lost / Investigation | กรณีไม่พบทรัพย์สิน |

---

### 11.3 Business Rules สำหรับ Reconciliation

#### กรณี Wrong Location

เมื่อ Approve แล้ว ระบบต้อง

1. Update Asset.CurrentLocation = Actual Location
2. Create Asset Movement: Location Correction from Audit
3. Mark Finding = Approved
4. บันทึก Audit Trail

#### กรณี Wrong Custodian

เมื่อ Approve แล้ว ระบบต้อง

1. Update Asset.Custodian = Actual Custodian
2. Create Asset Movement: Custodian Correction from Audit
3. Optionally Create Transfer Record
4. Mark Finding = Approved
5. บันทึก Audit Trail

#### กรณี Wrong Department

เมื่อ Approve แล้ว ระบบต้อง

1. Update Asset.DepartmentOwner = Actual Department
2. Create Department Change History
3. Mark Finding = Approved
4. บันทึก Audit Trail

#### กรณี Wrong Condition / Damaged

เมื่อ Approve แล้ว ระบบต้อง

1. Update Asset.Condition = Actual Condition
2. Create Condition Change History
3. ถ้า Condition = Damaged / Broken ให้เสนอ Create Repair Ticket
4. Mark Finding = Approved
5. บันทึก Audit Trail

#### กรณี Not Found

ไม่ควรเปลี่ยนเป็น Lost ทันที

ระบบต้องทำเป็น

1. Audit Result = Not Found
2. Finding Status = Pending Investigation
3. Asset Status ยังไม่เปลี่ยนเป็น Lost อัตโนมัติ
4. หลังตรวจสอบซ้ำแล้ว ผู้มีสิทธิ์จึงเลือก Mark as Lost ได้

#### กรณี Unregistered Asset

ผู้ตรวจต้องบันทึกข้อมูลเบื้องต้นได้ เช่น

- รูปภาพ
- Location ที่พบ
- ผู้ใช้งาน / ผู้ถือครอง
- ประเภททรัพย์สิน
- Brand / Model
- Serial Number
- Remark

หลังจากนั้น Asset Admin เลือกได้ว่า

- Create New Asset
- Merge with Existing Asset
- Ignore
- Need Investigation

---

### 11.4 Field ของ Audit Finding

| Field | Required | รายละเอียด |
|---|---|---|
| Finding ID | Yes | Auto Generate |
| Audit Round ID | Yes | รอบตรวจ |
| Audit Item ID | Yes | รายการตรวจ |
| Asset ID | Conditional | ถ้ามี Asset ในระบบ |
| Finding Type | Yes | ประเภท Finding |
| Expected Value | No | ค่าเดิมในระบบ |
| Actual Value | No | ค่าที่ตรวจพบ |
| Evidence File | No | รูป/เอกสาร |
| Remark | No | หมายเหตุ |
| Reported By | Yes | ผู้ตรวจ |
| Reported Date | Yes | วันที่รายงาน |
| Review Status | Yes | Pending / Approved / Rejected / Exception |
| Reviewed By | No | ผู้ Review |
| Reviewed Date | No | วันที่ Review |
| Review Remark | No | หมายเหตุผู้ Review |
| Action Taken | No | Action ที่เลือก |

---

## 12. Maintenance / Repair Requirements

ระบบต้องรองรับการแจ้งซ่อม เคลม และบันทึกประวัติการซ่อม

### Functional Requirements

1. เปิด Repair Ticket ได้
2. ระบุอาการเสียได้
3. ระบุผู้แจ้งได้
4. มอบหมายผู้รับผิดชอบได้
5. ระบุว่าเป็น Internal Repair หรือ Vendor Repair ได้
6. บันทึกค่าใช้จ่ายได้
7. แนบรูปหรือเอกสารได้
8. ปิดงานซ่อมได้
9. ดูประวัติซ่อมย้อนหลังตาม Asset ได้
10. สร้าง Repair Ticket จาก Audit Finding ได้

### Field ที่ต้องมี

| Field | Required |
|---|---|
| Repair ID | Yes |
| Repair No. | Yes |
| Asset ID | Yes |
| Problem | Yes |
| Reported By | Yes |
| Report Date | Yes |
| Assigned To | No |
| Repair Type | Yes |
| Vendor ID | No |
| Repair Status | Yes |
| Repair Cost | No |
| Warranty Claim | No |
| Root Cause | No |
| Resolution | No |
| Return Date | No |
| Attachment | No |

---

## 13. Disposal Requirements

ระบบต้องรองรับการตัดจำหน่าย ขาย บริจาค ทำลาย หรือบันทึกสูญหาย

### Disposal Status

| Status | ความหมาย |
|---|---|
| Awaiting Disposal | รอตัดจำหน่าย |
| Approved for Disposal | อนุมัติให้ตัดจำหน่าย |
| Sold | ขายแล้ว |
| Donated | บริจาคแล้ว |
| Destroyed | ทำลายแล้ว |
| Lost | สูญหาย |
| Disposed | ปิดรายการตัดจำหน่ายแล้ว |

### Functional Requirements

1. สร้าง Disposal Request ได้
2. ระบุเหตุผลการตัดจำหน่ายได้
3. แนบรูปและเอกสารได้
4. ระบุผู้อนุมัติได้
5. บันทึกมูลค่าขายหรือมูลค่าซากได้
6. อัปเดต Asset Status หลังอนุมัติได้
7. Export Disposal Report ได้
8. สร้าง Disposal Request จาก Audit Finding ได้

---

## 14. Attachment Requirements

ระบบต้องรองรับไฟล์แนบในหลาย Module

### ประเภทไฟล์ที่ควรรองรับ

- PDF
- JPG
- PNG
- XLSX
- DOCX
- CSV

### เอกสารที่ต้องรองรับ

| ประเภท | ตัวอย่าง |
|---|---|
| Purchase Document | PO, Quotation, Invoice |
| Warranty | ใบรับประกัน |
| Asset Image | รูปทรัพย์สิน |
| Handover Form | ใบส่งมอบ |
| Return Form | ใบคืน |
| Transfer Form | ใบโอนย้าย |
| Repair Document | ใบซ่อม |
| Disposal Document | ใบตัดจำหน่าย |
| Audit Evidence | รูปตอนตรวจนับ |

### Functional Requirements

1. Upload ได้หลายไฟล์ต่อรายการ
2. Download ไฟล์ได้ตามสิทธิ์
3. Delete ไฟล์ได้เฉพาะผู้มีสิทธิ์
4. บันทึกผู้ Upload / Delete
5. จำกัดชนิดไฟล์และขนาดไฟล์ได้

---

## 15. QR Code / Barcode Requirements

ระบบต้องรองรับ QR Code สำหรับติดตามและตรวจนับทรัพย์สิน

### Functional Requirements

1. Generate QR Code จาก Asset Tag ได้
2. Print Label ได้
3. Scan QR แล้วเปิดหน้า Asset Detail ได้
4. Scan QR เพื่อ Check-in / Check-out ได้
5. Scan QR เพื่อ Audit ได้
6. รองรับการใช้งานผ่านมือถือหรือ Tablet

### ข้อมูลบน Label

ควรแสดงอย่างน้อย

- Asset Tag
- Asset Name
- Serial Number
- Company
- QR Code

ตัวอย่าง

```text
SONIC-HO-NB-0001
Dell Latitude 5420
SN: ABC123456
```

---

## 16. Dashboard and Report Requirements

---

### 16.1 Dashboard

ระบบต้องมี Dashboard สรุปข้อมูล เช่น

| Dashboard | รายละเอียด |
|---|---|
| Total Asset | จำนวนทรัพย์สินทั้งหมด |
| Asset by Company | จำนวนตามบริษัท |
| Asset by Branch | จำนวนตามสาขา |
| Asset by Category | จำนวนตามหมวด |
| Asset by Status | จำนวนตามสถานะ |
| Asset by Condition | จำนวนตามสภาพ |
| Asset by Department | จำนวนตามแผนก |
| Asset by Custodian | ทรัพย์สินตามผู้ถือครอง |
| Warranty Expiring | ใกล้หมดประกัน |
| Repair Pending | งานซ่อมค้าง |
| Audit Progress | ความคืบหน้าตรวจนับ |
| Audit Finding Pending | รายการ Finding รอ Review |
| Missing Asset | ทรัพย์สินที่ตรวจไม่พบ |
| Awaiting Disposal | ทรัพย์สินรอตัดจำหน่าย |

---

### 16.2 Reports

ระบบต้อง Export Report ได้

| Report | Export |
|---|---|
| Asset Register Report | Excel / PDF |
| Asset by Company | Excel |
| Asset by Branch | Excel |
| Asset by Department | Excel |
| Asset by Location | Excel |
| Asset by Custodian | Excel |
| Asset Movement Report | Excel |
| Checkout / Check-in Report | Excel |
| Transfer Report | Excel |
| Repair History Report | Excel |
| Warranty Report | Excel |
| Audit Result Report | Excel / PDF |
| Audit Finding Report | Excel / PDF |
| Pending Asset Report | Excel / PDF / CSV |
| Pending Reconciliation Report | Excel |
| Missing Asset Report | Excel |
| Disposal Report | Excel / PDF |
| Employee Asset Holding Report | PDF |
| Asset Handover Form | PDF |
| Asset Return Form | PDF |
| Asset Transfer Form | PDF |

---

## 17. User / Role / Permission Requirements

ระบบต้องมี Role-Based Access Control

### Role ที่ควรมี

| Role | รายละเอียด |
|---|---|
| System Admin | จัดการระบบทั้งหมด |
| Asset Admin | จัดการทะเบียนทรัพย์สิน |
| IT Staff | จัดการทรัพย์สิน IT |
| Admin Staff | จัดการทรัพย์สิน Admin |
| Branch Staff | เห็นข้อมูลเฉพาะสาขา |
| Department Manager | เห็นข้อมูลเฉพาะแผนก |
| Auditor | ตรวจนับและบันทึก Actual Data |
| Audit Reviewer | Review / Approve Audit Finding |
| Accounting | ดูข้อมูลมูลค่าและตัดจำหน่าย |
| Employee | ดูทรัพย์สินที่ตัวเองถือครอง |
| Viewer | ดูข้อมูลอย่างเดียว |

### Permission Matrix ตัวอย่าง

| Function | Admin | Asset Admin | Auditor | Reviewer | Employee |
|---|---:|---:|---:|---:|---:|
| View Asset | Yes | Yes | Yes | Yes | Own Only |
| Create Asset | Yes | Yes | No | No | No |
| Edit Master Asset | Yes | Yes | No | Limited | No |
| Delete Asset | Yes | No | No | No | No |
| Checkout | Yes | Yes | No | No | No |
| Check-in | Yes | Yes | No | No | No |
| Transfer | Yes | Yes | No | Approve Only | No |
| Audit Scan | Yes | Yes | Yes | Yes | No |
| Record Actual Data | Yes | Yes | Yes | Yes | No |
| Approve Audit Finding | Yes | Yes | No | Yes | No |
| Reject Audit Finding | Yes | Yes | No | Yes | No |
| Create Repair from Finding | Yes | Yes | No | Yes | No |
| Create Disposal from Finding | Yes | Yes | No | Yes | No |
| View Cost | Yes | Yes | No | Optional | No |
| Export Report | Yes | Yes | Limited | Yes | No |

---

## 18. Audit Trail / System Log Requirements

ระบบต้องบันทึกการกระทำสำคัญทุกครั้ง

### ต้อง Log เหตุการณ์เหล่านี้

- Login
- Create Asset
- Edit Asset
- Delete Asset
- Checkout
- Check-in
- Transfer
- Change Status
- Change Condition
- Upload File
- Delete File
- Audit Asset
- Create Audit Finding
- Approve Audit Finding
- Reject Audit Finding
- Reconcile Asset Data
- Create Repair Ticket
- Create Disposal Request
- Export Report
- Change User Permission

### Log ต้องเก็บข้อมูล

- Date / Time
- User
- Action
- Module
- Record ID
- Old Value
- New Value
- IP Address
- Remark / Reason

---

## 19. Import / Export Requirements

### Import

ระบบต้องรองรับการ Import จาก Excel Template

| Import Type | รายละเอียด |
|---|---|
| Company | บริษัท |
| Branch | สาขา |
| Department | แผนก |
| Employee | พนักงาน |
| Location | Location |
| Asset | ทรัพย์สิน |
| Supplier | ผู้ขาย |
| Audit Result | ผลตรวจนับ |

### Import Validation

ระบบต้องตรวจสอบ

- Required Field ต้องครบ
- Asset Tag ห้ามซ้ำ
- Serial Number ห้ามซ้ำ ถ้ากำหนดไว้
- Company / Branch / Department ต้องมีอยู่จริง
- Date Format ต้องถูกต้อง
- ราคาต้องเป็นตัวเลข
- แสดง Error เป็นรายแถว
- สามารถ Download Error File ได้

### Export

ระบบต้อง Export ได้อย่างน้อย

- Excel
- CSV
- PDF

---

## 20. Notification Requirements

ระบบควรมี Notification ภายในระบบ และสามารถแจ้งเตือนทาง Email ได้

### รายการแจ้งเตือน

| Notification | เงื่อนไข |
|---|---|
| Warranty Expiring | ก่อนหมดประกัน 30 / 60 / 90 วัน |
| Asset Overdue Return | ทรัพย์สินถึงกำหนดคืน |
| Repair Pending Too Long | งานซ่อมค้างเกิน SLA |
| Transfer Pending Approval | รออนุมัติโอนย้าย |
| Audit Not Completed | ตรวจนับยังไม่ครบ |
| Audit Finding Pending | มีรายการ Finding รอ Review |
| Missing Asset | พบ Asset ไม่เจอ |
| Disposal Pending | รอตัดจำหน่าย |
| Employee Resigned with Asset | พนักงานลาออกแต่ยังถือครองทรัพย์สิน |

---

## 21. Search / Filter Requirements

ระบบต้องค้นหาและกรองข้อมูลได้จาก

- Asset Tag
- Asset Name
- Serial Number
- Company
- Branch
- Department
- Location
- Custodian
- Category
- Brand
- Model
- Status
- Condition
- Purchase Date
- Warranty End Date
- Supplier
- Fixed Asset Code
- Audit Result
- Finding Status

ควรมี Advanced Filter และ Export จากผลลัพธ์ที่ค้นหาได้

---

## 22. Business Rules สำคัญ

### 22.1 Department และ Location ต้องแยกกัน

```text
Department = หน่วยงาน
Location = พื้นที่จริง
```

ห้ามออกแบบให้ Department เป็นส่วนหนึ่งของ Location Tree

### 22.2 ห้ามลบข้อมูลสำคัญแบบถาวร

ข้อมูลที่มีประวัติแล้ว เช่น

- Asset
- Employee
- Location
- Department
- Company
- Audit Round
- Movement History

ไม่ควรถูก Hard Delete ให้ใช้

```text
Active / Inactive
Soft Delete
```

### 22.3 ทุกการเคลื่อนไหวต้องมี History

เมื่อมีการเปลี่ยนข้อมูลต่อไปนี้ ต้องสร้าง Movement / History

- Location
- Custodian
- Department
- Status
- Condition
- Company Owner
- Branch

### 22.4 Audit ต้องไม่แก้ Master โดยตรง

ระหว่าง Audit ผู้ตรวจสามารถบันทึก Actual Data ได้ แต่ไม่ควรอัปเดตข้อมูลหลักทันที

ขั้นตอนที่ถูกต้องคือ

```text
Audit → Actual Data → Audit Finding → Review → Approve → Update Master Asset
```

### 22.5 Not Found ไม่ควรเปลี่ยนเป็น Lost อัตโนมัติ

ถ้าตรวจไม่พบ Asset ให้เป็น

```text
Audit Result = Not Found
Finding Status = Pending Investigation
```

หลังตรวจสอบเพิ่มเติมจึงค่อยเปลี่ยนเป็น

```text
Status = Lost
```

โดยผู้มีสิทธิ์เท่านั้น

---

## 23. Main Workflows

---

### 23.1 เพิ่มทรัพย์สินใหม่

```text
รับของ / ซื้อของ
→ เพิ่ม Asset
→ ระบุ Company / Branch / Category / Location
→ แนบเอกสาร
→ Generate Asset Tag
→ Print QR Label
→ Status = Ready to Deploy
```

---

### 23.2 ส่งมอบทรัพย์สิน

```text
เลือก Asset
→ Checkout
→ เลือกผู้รับ / Location
→ ตรวจสภาพก่อนส่งมอบ
→ แนบรูป / ลายเซ็น
→ Status = In Use
→ บันทึก Movement History
```

---

### 23.3 รับคืนทรัพย์สิน

```text
เลือก Asset
→ Check-in
→ ตรวจสภาพ
→ ระบุอุปกรณ์ขาด/เสียหาย
→ เลือก Location ที่จะเก็บ
→ เลือก Status ถัดไป
→ บันทึกประวัติ
```

---

### 23.4 โอนย้ายทรัพย์สิน

```text
เลือก Asset
→ ระบุ From / To
→ ระบุเหตุผล
→ แนบเอกสาร
→ อนุมัติ ถ้ามี Workflow
→ อัปเดตข้อมูล Asset
→ บันทึก Movement History
```

---

### 23.5 ตรวจนับทรัพย์สิน

```text
สร้าง Audit Round
→ Define Audit Scope
→ Generate Expected Asset List
→ All Audit Items start as Pending
→ Auditor scans QR / searches Asset
→ System checks whether Asset is in Expected List
→ If in Scope, update Audit Item
→ If not in Scope, create Out-of-Scope Finding or Need Review
→ Auditor records Actual Data
→ System compares Expected vs Actual
→ If matched, Audit Result = Found
→ If mismatched, create Audit Finding
→ Dashboard shows Pending / Scanned / Found / Wrong / Not Found
→ After physical walk-through, user reviews Pending Assets
→ Mark unresolved Pending as Not Found
→ Create Not Found Finding
→ Reviewer reconciles Findings
→ Close Audit Round
```

---

### 23.6 Review Audit Finding

```text
Asset Admin / Reviewer เปิด Pending Finding
→ ตรวจ Expected vs Actual
→ ดูรูปหลักฐานและหมายเหตุ
→ เลือก Approve / Reject / Request More Information
→ ถ้า Approve ให้อัปเดต Master Asset
→ สร้าง Movement History
→ บันทึก Audit Trail
```

---

### 23.7 พนักงานลาออก

```text
ค้นหา Employee
→ แสดง Asset ที่ถือครองทั้งหมด
→ Check-in คืนทีละรายการ
→ ตรวจสภาพ
→ ระบุอุปกรณ์ขาดหรือเสียหาย
→ ปิด Exit Clearance
→ Export รายงานคืนทรัพย์สิน
```

---

## 24. Suggested Menu Structure

```text
Dashboard

Asset Management
 ├── Asset Register
 ├── Add New Asset
 ├── Check-out Asset
 ├── Check-in Asset
 ├── Transfer Asset
 ├── Bulk Move Location
 ├── Maintenance / Repair
 ├── Disposal
 └── Asset History

Audit
 ├── Audit Round
 ├── Audit by QR Scan
 ├── Audit Result
 ├── Pending Assets
 ├── Audit Finding
 ├── Pending Reconciliation
 ├── Missing Asset
 └── Audit Report

Master Data
 ├── Company
 ├── Branch
 ├── Department
 ├── Employee
 ├── Location
 ├── Category
 ├── Brand / Model
 ├── Status
 ├── Condition
 └── Supplier

Reports
 ├── Asset Register Report
 ├── Asset by Company
 ├── Asset by Branch
 ├── Asset by Department
 ├── Asset by Location
 ├── Asset by Custodian
 ├── Movement Report
 ├── Warranty Report
 ├── Repair Report
 ├── Audit Report
 ├── Audit Finding Report
 ├── Pending Asset Report
 └── Disposal Report

Administration
 ├── User Management
 ├── Role & Permission
 ├── Import / Export
 ├── QR Label Template
 ├── Notification Setting
 ├── System Log
 └── System Setting
```

---

## 25. Suggested Database Entity List

Developer ควรออกแบบตารางหลักประมาณนี้

```text
companies
branches
departments
employees
locations
asset_categories
asset_brands
asset_models
assets
asset_custom_fields
asset_statuses
asset_conditions
asset_movements
asset_checkouts
asset_checkins
asset_transfers
audit_rounds
audit_items
audit_findings
audit_scan_history
maintenance_tickets
disposal_requests
suppliers
attachments
users
roles
permissions
system_logs
notifications
```

---

## 26. Non-Functional Requirements

---

### 26.1 Web Application

ระบบต้องเป็น Web Application ใช้งานผ่าน Browser ได้

รองรับ Browser หลัก

- Google Chrome
- Microsoft Edge
- Safari

---

### 26.2 Mobile Friendly

ระบบต้องรองรับมือถือหรือ Tablet โดยเฉพาะหน้าจอเหล่านี้

- Scan QR Code
- Asset Detail
- Audit Asset
- Check-in / Check-out
- Take Photo
- Audit Finding
- Pending Assets

---

### 26.3 Performance

ระบบควรรองรับข้อมูลเริ่มต้นอย่างน้อย

| รายการ | จำนวนขั้นต่ำ |
|---|---:|
| Asset | 50,000 รายการ |
| Employee | 5,000 รายการ |
| Location | 1,000 รายการ |
| Movement History | 500,000 รายการ |
| Attachment | 100,000 ไฟล์ |

Search และ Filter ทั่วไปควรตอบสนองภายใน 3 วินาทีในข้อมูลขนาดปกติ

---

### 26.4 Security

ระบบต้องมี

- Login / Authentication
- Role-Based Access Control
- Permission by Company / Branch
- Password Policy
- Session Timeout
- HTTPS
- Audit Log
- File Upload Validation
- SQL Injection Protection
- XSS Protection
- CSRF Protection

---

### 26.5 Backup

ต้องมีแผน Backup

- Database Backup รายวัน
- File Attachment Backup รายวัน
- Retention อย่างน้อย 30-90 วัน
- Restore Test ได้

---

### 26.6 Data Retention

ข้อมูลต่อไปนี้ควรเก็บย้อนหลังอย่างน้อย 5-10 ปี หรือตามนโยบายบริษัท

- Asset
- Movement History
- Audit Result
- Audit Finding
- Audit Scan History
- Repair History
- Disposal History
- System Log

---

## 27. Integration Requirements

ระบบควรออกแบบให้เชื่อมต่อระบบอื่นได้ในอนาคต

| ระบบ | รายละเอียด |
|---|---|
| AD / LDAP | Login / Sync User |
| Microsoft 365 | Email Notification |
| HR System | Employee Master |
| Accounting System | Fixed Asset Code / Asset Value |
| Power BI | Dashboard |
| n8n / API | Workflow / Automation |
| Barcode Printer | พิมพ์ Label |
| Mobile Camera | Scan QR / ถ่ายรูป |

---

### API Requirements

ควรมี REST API สำหรับ

- Get Asset
- Create Asset
- Update Asset
- Checkout Asset
- Check-in Asset
- Transfer Asset
- Create Audit Round
- Generate Expected Asset List
- Create Audit Result
- Create Audit Finding
- Approve Audit Finding
- Get Pending Assets
- Get Employee
- Get Location
- Upload Attachment

---

## 28. Phase การพัฒนา

---

### Phase 1: Core Asset Management

- Company
- Branch
- Department
- Employee
- Location
- Category
- Asset Register
- Status / Condition
- Check-out / Check-in
- Asset History
- Import / Export
- QR Code
- Basic Report
- User Permission

---

### Phase 2: Transfer and Audit

- Asset Transfer
- Bulk Move Location
- Audit Round
- Generate Expected Asset List
- QR Scan Audit
- Audit Result
- Pending Assets
- Audit Finding
- Pending Reconciliation
- Audit Scan History
- Photo Evidence
- Audit Dashboard

---

### Phase 3: Maintenance and Disposal

- Repair Ticket
- Warranty Alert
- Maintenance History
- Disposal Request
- Disposal Report
- Notification

---

### Phase 4: Integration and Advanced Dashboard

- AD / LDAP Login
- HR Sync
- Accounting Asset Code
- Power BI / Dashboard API
- n8n / Workflow API
- Mobile Optimization
- Advanced Approval Workflow

---

## 29. Acceptance Criteria

---

### Phase 1 ผ่านเมื่อ

1. เพิ่ม Company / Branch / Department / Location ได้
2. เพิ่ม Asset ใหม่พร้อม Asset Tag ได้
3. Generate QR Code ได้
4. Checkout Asset ให้พนักงานหรือ Location ได้
5. Check-in Asset คืนได้
6. ดูประวัติ Asset ได้
7. ค้นหา Asset จาก Asset Tag / Serial / Employee ได้
8. Export Asset Register เป็น Excel ได้
9. จำกัดสิทธิ์ผู้ใช้งานตาม Role ได้
10. บันทึก System Log ทุกครั้งที่แก้ไขข้อมูลสำคัญ

---

### Phase 2 ผ่านเมื่อ

1. สร้าง Audit Round ได้
2. เมื่อสร้าง Audit Round ระบบต้อง Generate Expected Asset List ได้
3. ทุก Audit Item ต้องเริ่มต้นเป็น Pending
4. Scan QR เพื่อตรวจนับได้
5. เมื่อ Scan QR แล้วระบบต้องเปลี่ยน Audit Status เป็น Scanned ได้
6. แสดง Expected Data ได้
7. ผู้ตรวจบันทึก Actual Location / Custodian / Condition ได้
8. ระบบสร้าง Audit Finding เมื่อข้อมูลไม่ตรงได้
9. ระบบต้องแสดง Pending Assets ที่ยังไม่ได้ Scan ได้
10. Dashboard ต้องแสดง Total Expected, Pending, Scanned, Found, Wrong Location, Not Found และ Progress %
11. ระบบต้อง Export Pending Asset Report ได้
12. ระบบต้องรองรับการ Mark Pending Asset เป็น Not Found ได้
13. Mark Not Found ต้องสร้าง Audit Finding ประเภท Not Found
14. ระบบต้องไม่เปลี่ยน Asset Status เป็น Lost อัตโนมัติ
15. ระบบต้องตรวจจับ Duplicate Scan ได้
16. ระบบต้องแจ้งเตือนเมื่อ Scan Asset ที่อยู่นอก Scope ได้
17. ระบบต้องเก็บ Audit Scan History ทุกครั้งที่ Scan
18. Reviewer สามารถ Approve / Reject Finding ได้
19. เมื่อ Approve แล้วระบบอัปเดต Master Asset ได้
20. ระบบสร้าง Movement History หลัง Reconcile ได้
21. Export Audit Report และ Finding Report ได้
22. Bulk Move Location ได้

---

## 30. สรุป Requirement สำคัญที่สุด

Developer ต้องเข้าใจหลักสำคัญของระบบนี้ดังนี้

1. Department และ Location ต้องแยกกัน
2. Asset ต้องมีทั้งผู้ถือครองและตำแหน่งที่ตั้ง
3. ทุกการเคลื่อนไหวของ Asset ต้องมี History
4. ระบบต้องรองรับ QR Code สำหรับตรวจนับ
5. เมื่อสร้าง Audit Round ต้อง Generate Expected Asset List ก่อน
6. รายการ Audit Item ต้องเริ่มจาก Pending
7. ระบบต้องบอกได้ว่าทรัพย์สินใดยังไม่ได้ Scan
8. ระหว่าง Audit ผู้ตรวจบันทึก Actual Data ได้
9. ข้อมูล Master Asset ต้องไม่ถูกแก้โดยตรงจากผู้ตรวจ
10. ข้อมูลไม่ตรงต้องถูกสร้างเป็น Audit Finding
11. การแก้ข้อมูลหลักต้องผ่าน Reconciliation และ Approval
12. Not Found ต้องไม่เปลี่ยนเป็น Lost อัตโนมัติ
13. ต้องรองรับ Scan Asset ที่อยู่นอก Scope
14. ต้องตรวจจับ Duplicate Scan
15. ห้ามลบประวัติ ให้ใช้ Active / Inactive และ Audit Trail

---

## 31. Flow หลักของ Audit ที่ต้องการ

```text
Create Audit Round
→ Define Audit Scope
→ Generate Expected Asset List
→ All Audit Items start as Pending
→ Auditor scans QR / searches Asset
→ System checks whether Asset is in Expected List
→ If in Scope, update Audit Item
→ If not in Scope, create Out-of-Scope Finding or Need Review
→ Auditor records Actual Data
→ System compares Expected vs Actual
→ If matched, Audit Result = Found
→ If mismatched, create Audit Finding
→ Dashboard shows Pending / Scanned / Found / Wrong / Not Found
→ After physical walk-through, user reviews Pending Assets
→ Mark unresolved Pending as Not Found
→ Create Not Found Finding
→ Reviewer reconciles Findings
→ Create Movement History
→ Create Audit Trail
→ Close Audit Round
```

---

## 32. ข้อความ Requirement สำคัญสำหรับใส่ใน TOR / Brief Developer

สามารถใช้ข้อความนี้ส่งให้ผู้พัฒนาได้โดยตรง

```text
ระบบต้องรองรับกระบวนการตรวจนับทรัพย์สิน โดยเมื่อสร้าง Audit Round ระบบต้องสร้าง Expected Asset List จาก Scope ที่กำหนด และสร้าง Audit Item สำหรับ Asset ทุกรายการ โดยเริ่มต้นสถานะเป็น Pending

ระหว่างการตรวจนับด้วย QR Code เมื่อผู้ตรวจ Scan Asset ระบบต้องอัปเดต Audit Item ของ Asset นั้นเป็น Scanned พร้อมบันทึกผู้ตรวจ วันเวลา และ Actual Data ที่พบ

ระบบต้องมีหน้าจอและรายงานแสดงรายการ Asset ที่ยังไม่ได้ตรวจ โดยพิจารณาจาก Audit Status = Pending เพื่อให้ผู้ตรวจทราบว่าทรัพย์สินรายการใดยังไม่ได้ Scan หรือยังไม่ได้บันทึกผล

ผู้ตรวจสามารถบันทึกข้อมูลที่พบจริง ณ หน้างานได้ เช่น Actual Location, Actual Custodian, Actual Department, Actual Condition, Photo Evidence และ Remark

หากข้อมูลที่พบจริงไม่ตรงกับข้อมูลเดิมในระบบ ระบบต้องสร้าง Audit Finding เพื่อรอการตรวจสอบ โดยห้ามอัปเดตข้อมูลหลักของ Asset โดยอัตโนมัติ

การอัปเดตข้อมูลหลักของ Asset เช่น Current Location, Custodian, Department, Status หรือ Condition ต้องทำผ่านขั้นตอน Reconciliation โดยผู้มีสิทธิ์ เช่น Asset Admin หรือ Audit Reviewer เท่านั้น

เมื่อสิ้นสุดการตรวจ ผู้มีสิทธิ์สามารถ Mark รายการ Pending เป็น Not Found ได้ โดยระบบต้องสร้าง Audit Finding ประเภท Not Found และตั้งสถานะ Pending Investigation โดยห้ามเปลี่ยน Asset Status เป็น Lost อัตโนมัติ

ระบบต้องรองรับกรณี Scan Asset ที่ไม่อยู่ใน Audit Scope และต้องตรวจจับ Duplicate Scan ภายใน Audit Round เดียวกัน พร้อมเก็บ Audit Scan History ทุกครั้ง

ทุกการอนุมัติแก้ไขข้อมูลจาก Audit Finding ต้องบันทึก Movement History และ Audit Trail เพื่อให้สามารถตรวจสอบย้อนหลังได้ว่า ข้อมูลเดิมคืออะไร ผู้ตรวจพบอะไร ใครเป็นผู้อนุมัติ และแก้ไขเมื่อใด
```

---

## 33. สรุปภาพรวม

Requirement ฉบับนี้ออกแบบให้ระบบรองรับทั้ง

- การใช้งานประจำวัน
- การควบคุมทรัพย์สินหลายบริษัทและหลายสาขา
- การตรวจนับด้วย QR Code
- การบอกได้ว่ารายการใดยังไม่ได้ตรวจ
- การจัดการข้อมูลไม่ตรงแบบมีหลักฐาน
- การอนุมัติปรับข้อมูลหลักผ่าน Reconciliation
- การตรวจสอบย้อนหลังด้วย Movement History และ Audit Trail

แนวทางนี้ช่วยลดความเสี่ยงที่ข้อมูล Master จะถูกแก้ผิดระหว่าง Audit และช่วยให้งานตรวจนับทรัพย์สินมีความน่าเชื่อถือมากขึ้น
