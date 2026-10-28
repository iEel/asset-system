// The app's words the transaction specs read on the shared asset picker (messages/th.json: asset.transactionReason*,
// assetOperation.*). Plain data, no imports: tests/e2e-transactions.test.ts ("the transaction specs find assets on the
// shared picker", server asset search task 8) pins each value against messages/th.json, placeholders aside.
export const TX_WORDS = {
  reasonNotReady: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น",
  legacyRow: "ข้อมูลเก่า (ไม่มีใบส่งมอบ) · {location}",
  alreadyChosen: "เลือกแล้ว",
  chosenList: "ที่เลือกแล้ว {count} รายการ",
  holderCount: "ถืออยู่ {count} ชิ้น",
} as const
