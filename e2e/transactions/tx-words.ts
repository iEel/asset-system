// The app's words the transaction specs read on the shared asset picker (messages/th.json: asset.transactionReason*,
// assetOperation.*). Plain data, no imports: tests/e2e-transactions.test.ts ("the transaction specs find assets on the
// shared picker", server asset search task 8) pins each value against messages/th.json, placeholders aside.
export const TX_WORDS = {
  reasonNotReady: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น",
  legacyRow: "ข้อมูลเก่า (ไม่มีใบส่งมอบ) · {location}",
  alreadyChosen: "เลือกแล้ว",
  chosenList: "ที่เลือกแล้ว {count} รายการ",
  holderCount: "ถืออยู่ {count} ชิ้น",
  reviewAndSave: "ตรวจสอบและบันทึก",
  checkoutFooter: "ส่งมอบ {tag} ให้ {receiver}",
  // The picker with no rows (assetOperation.notFound) and the history's department move (asset.movementTypes.department_change),
  // group 3 plan 1 task 8.
  searchNotFound: "ไม่พบทรัพย์สินที่ตรงกับคำค้น",
  departmentChange: "เปลี่ยนแผนก",
  // ส่งมอบ on the phone, three steps (group 3 spec §7.4, checkout.phone*).
  phoneNext: "ถัดไป: ให้ผู้รับตรวจ",
  phoneAccept: "ถูกต้อง ลงชื่อรับ",
  phoneFix: "มีบางอย่างไม่ถูกต้อง กลับไปแก้",
  phoneSave: "บันทึกการส่งมอบ",
  phoneCancelBack: "ยกเลิกและกลับ",
  phoneBackToCheck: "ย้อนกลับไปขั้นตรวจ",
  signOnBehalf: "รับในนามของ {destination}",
  // รับคืน (group 3 plan 2): the footer line, the checklist, the components' counts on the summary and the review, the
  // warning for one left out, the phone's footer, the ส่งซ่อม hint and the open-repair notice (checkin.*); ส่งมอบ's list,
  // its warning and its summary count for one still out (checkout.*); the picker's line for it
  // (assetOperation.outstandingLine) and the component manager's (asset.componentOutstanding*); the RT-'s lines
  // (checkin.document*).
  checkinFooter: "รับคืน {tag} จาก {returner}",
  componentNotReturned: "ยังไม่ได้คืน",
  componentsBack: "ได้คืน {returned} · ขาด {missing}",
  missingWarning: "{component} ยังไม่ได้คืน จะอยู่กับ {returner} ที่ {room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน",
  phoneComponentsFooter: "ส่วนควบได้คืน {returned} · ขาด {missing}",
  sendToRepairHint: "บันทึกแล้วระบบจะเปิดใบซ่อมให้อัตโนมัติ",
  openRepairNotice: "มีงานซ่อมที่ยังไม่ปิดอยู่ หลังรับคืนทรัพย์สินจะเข้าสถานะ ส่งซ่อม ต่อกับงานซ่อมเดิม ไม่สร้างใบซ่อมใหม่",
  componentsTravel: "ส่วนควบที่จะส่งมอบไปด้วย {count} รายการ",
  checkoutOutstanding: "ยังค้างคืน {count} รายการ: {list}",
  checkoutSummaryOutstanding: "ค้างคืน {count} รายการ",
  outstandingLine: "ส่วนควบค้างคืน ของ {parentTag}",
  componentOutstanding: "ค้างคืน",
  componentOutstandingWith: "อยู่กับ {holder}",
  documentMissingHeld: "{component} · อยู่กับ {holder} ที่ {location}",
  documentComponentReturned: "{tag} คืนแล้ว {date} · รับโดย {name}",
  repairOpened: "เปิดใบซ่อม {repairNo}",
  repairJoined: "ต่อใบซ่อม {repairNo}",
  // โอนย้าย (group 3 plan 3): an empty ตอนนี้ cell (assetOperation.summaryNone), the next status (transfer.inUseStatus,
  // transfer.statusUnchanged), a row that stays (assetOperation.summaryKept), the S-R40 line with the broken asset's
  // reason for a new holder (transfer.assetClearedForCustodian, asset.transactionReasonTransferConditionDamaged), the
  // TR-'s แผนกเดิม (transfer.fromDepartment), and the page's own words (transfer.*): the locked แผนก row, the card's
  // lead and its "both stay" part, the footer, the components line, the components count of the card and the review,
  // the cross-branch line, the chip, and the empty picker with its × (transfer.noChange).
  noneNow: "ไม่มี",
  inUseStatus: "ใช้งานอยู่",
  statusUnchanged: "คงสถานะเดิม",
  summaryKept: "{value} (คงเดิม)",
  assetClearedForCustodian: "นำ {assetTag} ออกแล้ว: {reason}",
  reasonTransferDamaged: "สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่",
  fromDepartment: "แผนกเดิม",
  transferFollowsHolder: "ตามผู้ถือครอง: {department}",
  transferLead: "เปลี่ยน {count} อย่าง: {list}",
  transferKeptBoth: "ผู้ถือครองและแผนกคงเดิม",
  transferFooter: "โอนย้าย {tag}: {changes}",
  transferComponentsMove: "ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย",
  transferSummaryComponents: "ย้ายตาม {count} รายการ",
  transferCrossBranch: "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ {branch} ตามเดิม",
  reasonChipUser: "เปลี่ยนผู้ใช้งาน",
  transferNoChange: "ไม่เปลี่ยนแปลง",
} as const
