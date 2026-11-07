// The words the work center spec reads on screen (page group 9 plan 2, boards WC and WC-Phone; plan 3 Task 3), as the
// app writes them in messages/th.json (tests/e2e-work-center.test.ts checks every value is one of th.json's). Plain
// data, no imports, so the node test can load it.
export const WORK_CENTER_WORDS = {
  // The header: the title and การแจ้งเตือน with its unread topics (workCenter.notificationsLinkLabel, the link's name).
  title: "ศูนย์งานค้าง", notificationsLinkLabel: "การแจ้งเตือน ยังไม่อ่าน {count, number} หัวข้อ",
  // The view switch (a <nav> of two links, aria-current on the pressed one) and งานของฉัน's notice without an employee.
  viewNavigation: "มุมมองงาน", allWork: "งานทั้งหมด", myWork: "งานของฉัน",
  myWorkUnavailable: "บัญชีนี้ยังไม่ได้ผูกพนักงาน จึงยังไม่สามารถกรองงานของฉันได้",
  // The queue tabs (a <nav>: TabNav from md, the 3 × 2 grid below) and the queues' names.
  focusNavigation: "เลือกคิวงานที่ต้องติดตาม", overview: "ภาพรวม", assetsTab: "ข้อมูลไม่ครบ",
  approvals: "รออนุมัติ", maintenance: "ซ่อมบำรุง", audit: "ตรวจนับ", disposal: "ตัดจำหน่าย",
  // The strip: งานค้างทั้งหมด and the previous day's words (none under งานของฉัน).
  backlogTitle: "งานค้างทั้งหมด", backlogYesterday: "เมื่อวาน {count, number}", backlogOnDay: "เมื่อ {date} {count, number}",
  // The table: its caption (the table's name), "แสดง n จาก m" and แสดงเพิ่ม.
  tableCaption: "งานค้าง เรียงเร่งด่วนก่อน",
  tableShown: "แสดง {shown, number} จาก {total, number} · เกินกำหนดก่อน แล้วค้างนานสุด",
  showMoreRows: "แสดงเพิ่ม {count, number} รายการ",
  // An open repair's next step (workCenter.nextStep.recordRepairDone): its page is /maintenance/{id}.
  recordRepairDone: "บันทึกว่าซ่อมเสร็จ",
} as const

// The queues in the strip's and the tabs' order (src/lib/work-queues.ts WORK_QUEUES), by their th.json names.
export const QUEUE_ORDER = ["รออนุมัติ", "ซ่อมบำรุง", "ตรวจนับ", "ตัดจำหน่าย"] as const
