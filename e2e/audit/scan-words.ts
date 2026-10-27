// The words the phone walk's steps read (group 2 spec §11, §12, §16), each a value of messages/th.json
// (tests/e2e-audit.test.ts checks them). Plain data, no imports, so the node test can load it. The placeholders are the
// steps' own names; the test compares the texts with every placeholder alike.
export const SCAN_WORDS = {
  // The header (spec §11): the way back, and the mismatch count under "x / y".
  backToRound: "กลับไปหน้ารอบ",
  progressMismatch: "ไม่ตรง {count}",
  // The room button (bug 21) and the room sheet.
  roomProgress: "ห้องนี้ตรวจแล้ว {checked} / {total} · เหลือ {pending}",
  roomChange: "เปลี่ยนห้อง",
  roomPick: "เลือกห้องที่กำลังตรวจ",
  roomClear: "ไม่เลือกห้อง",
  // The switch (P3-R7): its name and its tabs; the third reads by the room.
  tabsLabel: "สถานะรายการ",
  tabPending: "ยังไม่ตรวจ",
  tabChecked: "ตรวจแล้ว",
  tabRoom: "ทั้งห้อง",
  tabRound: "ทั้งรอบ",
  // The category chips (decision 3, P3-R6); the first reads as the round page's (P3-R16).
  categoryChipsLabel: "หมวดหมู่",
  categoryAll: "ทุกหมวดหมู่",
  // A row's components (spec §11).
  componentCount: "ส่วนควบ {count}",
  // The search (bug 20, P3-R5).
  searchLine: "ผลค้นหา \"{term}\": ในห้องนี้ {inRoom} · ห้องอื่น {otherRooms}",
  showMore: "แสดงเพิ่ม",
  // A row's found badge (P3-R19).
  badgeFound: "พบตรง",
  // The record sheet (spec §12). (The footer link keeps Task 3's literal in block 3, pinned by tests/e2e-audit.test.ts:178.)
  firstScanHint: "ตรงกับของจริงไหม แตะ ไม่ตรง เฉพาะเรื่องที่ต่าง",
  fieldMatch: "ตรง",
  fieldMismatch: "ไม่ตรง",
  foundValue: "ที่พบ",
  chooseFoundValue: "เลือกค่าที่พบ",
  departmentFollowsCustodian: "ตามแผนกของผู้ถือครองที่พบ",
  notePhoto: "ถ่ายรูป / เพิ่มหมายเหตุ",
  componentNotFound: "ไม่พบ",
  photoRequiredPlacement: "แผนกหรือที่ตั้งไม่ตรง ต้องแนบรูปก่อนบันทึก",
  notThisOne: "ไม่ใช่ชิ้นนี้",
  // A recorded out-of-scope find opened again (P3-R3).
  outOfScopeRecorded: "บันทึกนอกขอบเขตไว้แล้ว · บันทึกตอนนี้จะเป็นการแก้",
  // The ตรวจแล้ว tab's recorded finds, apart from the counts, each with its badge (P3-R25).
  recordedOutOfScope: "บันทึกนอกขอบเขตแล้ว {count}",
  badgeOutOfScope: "นอกขอบเขต",
} as const
