# Enterprise Web UI / UX Requirements

## A.1 วัตถุประสงค์ด้านโทนของเว็บไซต์

ระบบ Inventory / Asset Management Web Application ต้องออกแบบให้มีภาพลักษณ์แบบ **Enterprise Web Application** เหมาะสำหรับใช้งานในองค์กรจริง รองรับผู้ใช้งานหลายระดับ เช่น IT, Admin, Accounting, Auditor, Branch Staff, Department Manager และผู้บริหาร

โทนของระบบต้องให้ความรู้สึก:

- Professional
- Clean
- Reliable
- Corporate
- Modern Enterprise
- Data-driven
- Audit-friendly
- Mobile-friendly for field audit

ระบบไม่ควรใช้โทนที่ดูเป็น Consumer App หรือ Casual มากเกินไป เช่น สีสดจัด Animation เยอะ หรือ Layout ที่เน้นความบันเทิงมากกว่าการใช้งานจริงในองค์กร

---

## A.2 Visual Tone

โทนภาพรวมของระบบควรเป็นทางการ สุขุม และอ่านง่าย

| คุณลักษณะ | รายละเอียด |
|---|---|
| น่าเชื่อถือ | เหมาะกับระบบทรัพย์สินและงาน Audit |
| เป็นทางการ | ใช้ในองค์กรได้จริง |
| อ่านง่าย | ตารางและข้อมูลจำนวนมากต้องอ่านง่าย |
| ไม่รก | ลดสีและองค์ประกอบที่ไม่จำเป็น |
| Responsive | ใช้งานได้ทั้ง Desktop, Tablet, Mobile |
| Consistent | รูปแบบปุ่ม สี ฟอร์ม ตาราง และ Badge ต้องสม่ำเสมอ |

---

## A.3 Color Theme

ควรใช้สีหลักในโทน Corporate / Enterprise เช่น Navy Blue, Deep Blue, Slate Gray และพื้นหลังโทนอ่อน

### ตัวอย่างโทนสีที่แนะนำ

```text
Primary: #1E3A5F หรือ #1F4E79
Secondary: #64748B
Background: #F8FAFC
Surface: #FFFFFF
Border: #E2E8F0
Text Primary: #0F172A
Text Secondary: #475569
Success: #16A34A
Warning: #F59E0B
Danger: #DC2626
Info: #2563EB
```

### การใช้งานสี

| ประเภทสี | ตัวอย่างการใช้งาน |
|---|---|
| Primary Color | ปุ่มหลัก, Header, เมนูที่ Active |
| Secondary Color | ข้อความรอง, Icon รอง, Sub menu |
| Background | พื้นหลังของระบบ |
| Surface | Card, Panel, Modal, Form |
| Success | Found, Approved, Completed |
| Warning | Pending, Need Review, Warranty Expiring |
| Danger | Lost, Damaged, Overdue, Rejected |
| Info | Information, Reference, Link |

---

## A.4 Layout Requirements

ระบบควรใช้ Layout แบบ Enterprise Dashboard

### Desktop Layout

```text
Top Bar
├── System Name
├── Global Search
├── Notification
├── User Profile

Left Sidebar
├── Dashboard
├── Asset Management
├── Audit
├── Reports
├── Master Data
└── Administration

Main Content
├── Page Title
├── Breadcrumb
├── Filter / Action Bar
├── Data Table / Form / Dashboard Card
└── Pagination / Summary
```

### Mobile / Tablet Layout

สำหรับการ Scan QR และ Audit หน้างาน ควรมี Layout แบบ Mobile-first

```text
Mobile Header
├── Back Button
├── Asset Tag / Audit Round
└── Quick Action

Main Area
├── QR Scanner
├── Asset Summary Card
├── Expected vs Actual
├── Photo Upload
└── Submit Button
```

---

## A.5 Navigation Requirements

เมนูต้องใช้งานง่ายและเหมาะกับผู้ใช้หลาย Role

ระบบควรมี:

- Left Sidebar แบบ Collapsible
- Breadcrumb ทุกหน้าสำคัญ
- Global Search สำหรับค้นหา Asset Tag, Serial, Employee, Location
- Quick Action เช่น Add Asset, Scan QR, Create Audit Round
- Recent Viewed Assets
- Favorite Report หรือ Saved Filter

---

## A.6 Dashboard UI Requirements

Dashboard ต้องแสดงข้อมูลสำคัญในรูปแบบที่ผู้บริหารและผู้ดูแลระบบเข้าใจง่าย

| Component | รายละเอียด |
|---|---|
| KPI Cards | จำนวน Asset, Pending Audit, Missing Asset, Repair Pending |
| Chart | Asset by Company, Branch, Category, Status |
| Alert Panel | Warranty Expiring, Finding Pending, Overdue Return |
| Recent Activity | รายการเคลื่อนไหวล่าสุด |
| Audit Progress | Progress Bar ของรอบ Audit |
| Quick Filter | Company, Branch, Department, Category |

ตัวอย่าง KPI Card:

```text
Total Assets: 12,500
In Use: 8,900
Pending Audit: 320
Missing / Not Found: 14
Repair Pending: 28
Warranty Expiring: 75
```

---

## A.7 Data Table Requirements

เนื่องจากระบบมีข้อมูลจำนวนมาก ตารางต้องออกแบบให้ใช้งานดี

ระบบต้องรองรับ:

- Column Sort
- Column Filter
- Advanced Filter
- Search in Table
- Pagination
- Export Current Result
- Column Show / Hide
- Freeze Important Column เช่น Asset Tag
- Bulk Select
- Bulk Action
- Status Badge
- Inline Quick View
- Responsive Table สำหรับ Tablet

### ตัวอย่าง Status Badge

| Status | Badge Style |
|---|---|
| Ready to Deploy | Blue / Neutral |
| In Use | Green |
| Pending Repair | Orange |
| Under Repair | Amber |
| Awaiting Disposal | Gray |
| Lost | Red |
| Disposed | Dark Gray |

---

## A.8 Form Design Requirements

ฟอร์มต้องเหมาะกับงานองค์กรและลดความผิดพลาดของผู้ใช้

ระบบควรมี:

- แบ่งฟอร์มเป็น Section
- Required Field Indicator
- Inline Validation
- Auto-complete สำหรับ Employee, Location, Asset
- Dropdown ที่ Search ได้
- Date Picker
- File Upload แบบ Drag & Drop
- Save Draft สำหรับฟอร์มยาว
- Confirmation ก่อนบันทึกข้อมูลสำคัญ
- แสดง Audit Warning ถ้าข้อมูลกระทบ Master Data

ตัวอย่าง Section ในหน้า Asset Detail:

```text
1. Basic Information
2. Ownership
3. Location and Custodian
4. Purchase and Warranty
5. Technical Details / Custom Fields
6. Attachment
7. Movement History
8. Audit History
```

---

## A.9 Asset Detail Page Requirements

หน้า Asset Detail ต้องเป็นหน้ากลางที่รวมข้อมูลของทรัพย์สินแต่ละรายการ

ควรแสดง:

- Asset Summary Card
- Asset Photo
- QR Code
- Current Status
- Current Condition
- Current Custodian
- Current Location
- Company / Branch / Department
- Purchase / Warranty Info
- Attachment
- Movement Timeline
- Checkout / Check-in History
- Repair History
- Audit History
- Audit Finding ที่ยังไม่ปิด
- Related Assets / Components

ควรมีปุ่ม Quick Action:

```text
Check-out
Check-in
Transfer
Audit
Create Repair Ticket
Create Disposal Request
Print Label
Export Asset Profile
```

---

## A.10 Audit Screen UI Requirements

หน้าจอ Audit ต้องออกแบบให้ใช้งานง่ายระหว่างเดินตรวจจริง

### Audit Scan Screen ต้องมี

```text
Audit Round Name
QR Scanner
Manual Search
Asset Summary
Expected Data
Actual Data
Photo Evidence
Audit Result
Submit / Save
```

### Expected vs Actual Layout

ควรแสดงแบบเทียบกันชัดเจน

| Field | Expected Data | Actual Data |
|---|---|---|
| Location | HO-F2-IT Room | HO-F1-IT Room |
| Custodian | คุณ A | คุณ B |
| Department | IT | IT |
| Condition | Good | Fair |

ถ้าข้อมูลไม่ตรง ให้ Highlight สี Warning และแสดงข้อความว่า:

```text
Mismatch detected. Audit Finding will be created after submit.
```

---

## A.11 Pending Asset UI Requirements

หน้า Pending Assets ต้องช่วยให้ผู้ตรวจรู้ว่ารายการใดยังไม่ได้ตรวจ

ควรมี:

- Progress Bar
- Total Expected / Scanned / Pending
- Filter by Location, Department, Category, Custodian
- Search Asset
- Export Pending List
- Mark Selected as Not Found
- Assign Follow-up Auditor
- Last Known Location
- Last Seen Date

ตัวอย่าง Summary:

```text
Total Expected: 1,000
Scanned: 860
Pending: 140
Progress: 86%
```

---

## A.12 Reconciliation UI Requirements

หน้า Pending Reconciliation ต้องช่วยให้ Reviewer ตรวจสอบข้อมูลได้ง่าย

ควรแสดง:

| Field | รายละเอียด |
|---|---|
| Finding Type | Wrong Location / Wrong Custodian / Not Found |
| Asset Summary | Asset Tag, Name, Category |
| Expected Value | ค่าเดิมในระบบ |
| Actual Value | ค่าที่ผู้ตรวจพบ |
| Evidence | รูปภาพ / เอกสาร |
| Auditor Remark | หมายเหตุผู้ตรวจ |
| Reviewer Action | Approve / Reject / Request More Info |
| Impact Preview | แสดงว่าจะเปลี่ยน Master Data อะไรบ้าง |

ก่อนกด Approve ต้องมี Confirmation เช่น:

```text
ระบบจะอัปเดต Current Location จาก HO-F2-IT Room เป็น HO-F1-IT Room
และสร้าง Movement History จาก Audit Finding นี้
ต้องการยืนยันหรือไม่?
```

---

## A.13 Accessibility and Usability

ระบบควรออกแบบให้ใช้งานง่ายสำหรับผู้ใช้ทั่วไป ไม่จำเป็นต้องเป็น IT

ควรมี:

- Font อ่านง่าย
- Contrast เพียงพอ
- ปุ่มหลักชัดเจน
- Error Message เป็นภาษาที่เข้าใจง่าย
- รองรับ Keyboard Navigation ในหน้าตาราง
- Tooltip อธิบาย Field สำคัญ
- Empty State ที่บอกว่าผู้ใช้ต้องทำอะไรต่อ
- Loading State ระหว่างค้นหา / Export / Upload

---

## A.14 Language Requirements

ระบบควรรองรับภาษาไทยเป็นหลัก และควรออกแบบให้รองรับภาษาอังกฤษในอนาคต

ข้อความในระบบควรเป็นทางการ กระชับ และเข้าใจง่าย เช่น:

```text
บันทึกสำเร็จ
ไม่สามารถลบข้อมูลนี้ได้ เนื่องจากมีประวัติการใช้งาน
พบข้อมูลไม่ตรงกับระบบ กรุณาตรวจสอบก่อนยืนยัน
รายการนี้ถูกตรวจแล้วโดย [ชื่อผู้ตรวจ] เมื่อ [วันที่ เวลา]
```

---

## A.15 Enterprise UI Acceptance Criteria

ระบบจะถือว่าผ่านด้าน UI / UX เมื่อ:

1. Layout หลักเป็นแบบ Enterprise Dashboard พร้อม Sidebar และ Top Bar
2. ใช้โทนสี Corporate / Professional ไม่ฉูดฉาด
3. ตารางข้อมูลรองรับ Sort, Filter, Pagination, Export และ Bulk Action
4. หน้า Asset Detail แสดงข้อมูลครบพร้อม Timeline
5. หน้า Audit Scan ใช้งานได้ดีบนมือถือหรือ Tablet
6. หน้า Expected vs Actual แสดงข้อมูลเปรียบเทียบชัดเจน
7. หน้า Pending Assets แสดงรายการที่ยังไม่ได้ตรวจได้ชัดเจน
8. หน้า Reconciliation แสดงผลกระทบก่อน Approve
9. มี Status Badge และ Alert สีที่สอดคล้องกันทั้งระบบ
10. ผู้ใช้ทั่วไปสามารถค้นหา Asset และทำงานหลักได้โดยไม่สับสน
