// The words the notifications spec reads on screen (page group 9 plan 3, board NT; Task 3), as the app writes them in
// messages/th.json (tests/e2e-work-center.test.ts checks every value is one of th.json's). Plain data, no imports, so
// the node test can load it.
export const NOTIFICATION_WORDS = {
  // The header: the title and the line that names the bell's number.
  title: "การแจ้งเตือน", bellLine: "กระดิ่งแถบบน = หัวข้อที่ยังไม่อ่าน {count, number}",
  // The status tabs (a <nav>: TabNav from sm, a 2 × 2 grid below).
  statusNavigation: "สถานะการแจ้งเตือน", unread: "ยังไม่อ่าน", read: "อ่านแล้ว", snoozed: "เลื่อนเตือน", all: "ทั้งหมด",
  // A row's ⋯ (a menu from md, a sheet below) and its choices; the toast after a save.
  menu: "ตัวเลือกของ {title}", markRead: "ทำเป็นอ่านแล้ว", snoozeThreeDays: "3 วัน", cancelSnooze: "ยกเลิกการเลื่อนเตือน",
  saved: "บันทึกสถานะแจ้งเตือนแล้ว",
  // The row's state pill: read today (time), snoozed (date and time).
  readToday: "อ่านแล้ว {time}", snoozedUntil: "เลื่อนถึง {date} {time}",
  // The sections and the digest panel.
  backlog: "งานค้าง", advance: "เตือนล่วงหน้า",
  digestTitle: "สรุปรายวันที่ส่งแล้ว", digestEmpty: "ยังไม่มีสรุปรายวันที่ส่ง", legacyTitle: "ก่อนเก็บแบบแยกหัวข้อ",
  digestDay: "{date} · {topics, number} หัวข้อ · {items, number} รายการ",
} as const

// Each topic's title (notifications.<key>), in the waiting-work order (src/lib/waiting-work-rules.ts WAITING_WORK_KEYS):
// the row's ⋯ is named by it.
export const TOPIC_TITLES = {
  approvalInbox: "งานรออนุมัติ",
  openRepairs: "ซ่อมยังไม่เสร็จ",
  stuckRepairs: "รอซ่อมแต่ยังไม่มีบันทึกซ่อม",
  duePm: "PM ครบกำหนดใน 7 วัน",
  pendingAuditFindings: "รายการไม่ตรงทะเบียนรอพิจารณา",
  openAuditActions: "แผนแก้ไขยังเปิด",
  auditActionsDueSoon: "แผนแก้ไขใกล้ครบกำหนด",
  pendingDisposals: "ตัดจำหน่ายรอพิจารณา",
  approvedDisposals: "อนุมัติแล้ว รอตัดจำหน่าย",
  returnsDueSoon: "ใกล้/เกินกำหนดคืน",
  warrantyExpiringSoon: "ประกันใกล้หมดอายุ",
  licenseExpiringSoon: "License ใกล้หมดอายุ",
} as const

export type TopicKey = keyof typeof TOPIC_TITLES

// The เตือนล่วงหน้า section's keys (src/lib/work-queues.ts ADVANCE_WARNING_KEYS).
export const ADVANCE_KEYS: readonly TopicKey[] = ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"]
