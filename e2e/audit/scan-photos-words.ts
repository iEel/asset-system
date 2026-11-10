// The words the scan page's photo steps read (audit photos spec §3, plan 1 task 5), each a value of messages/th.json
// (tests/e2e-audit-rounds.test.ts checks them key by key). Plain data, no imports, so the node test can load it.
export const SCAN_PHOTO_WORDS = {
  // asset.modelPhoto: the chip on a model photo's card and the meta line of a row whose photo is the model's.
  modelPhoto: "รูปประจำรุ่น",
  // auditScan.addNotePhoto: the check form's note-and-photo section.
  addNotePhoto: "ถ่ายรูป / เพิ่มหมายเหตุ",
  // auditScan.queuedPhotos: the list of photos waiting to upload.
  queuedPhotos: "รูปที่รออัปโหลด {count} รูป",
  // auditScan.saveAllMatch and auditScan.savedAllMatch: the save of an asset that matches, and its banner.
  saveAllMatch: "บันทึก · ตรงทุกข้อ",
  savedAllMatch: "{assetTag} บันทึกแล้ว · ตรงทุกข้อ",
} as const
