// The words the scan page's photo steps read (audit photos spec §3, plan 1 task 5), and the files tab's, the round page's
// and the history's (spec §4-§6, plan 2 task 5), each a value of messages/th.json (tests/e2e-audit-rounds.test.ts checks
// them key by key). Plain data, no imports, so the node test can load it.
export const SCAN_PHOTO_WORDS = {
  // asset.modelPhoto: the chip on a model photo's card and the meta line of a row whose photo is the model's.
  modelPhoto: "รูปประจำรุ่น",
  // asset.photoFrame.emptyTitle: the check form's card for an asset with no photo (own → model → empty frame).
  emptyTitle: "ยังไม่มีรูป",
  // auditScan.addNotePhoto: the check form's note-and-photo section.
  addNotePhoto: "ถ่ายรูป / เพิ่มหมายเหตุ",
  // auditScan.queuedPhotos: the list of photos waiting to upload.
  queuedPhotos: "รูปที่รออัปโหลด {count} รูป",
  // auditScan.saveAllMatch and auditScan.savedAllMatch: the save of an asset that matches, and its banner.
  saveAllMatch: "บันทึก · ตรงทุกข้อ",
  savedAllMatch: "{assetTag} บันทึกแล้ว · ตรงทุกข้อ",
  // common.all: the files tab's first filter chip.
  all: "ทั้งหมด",
  // asset.filesTab.roundFilterLabel: the name of the files tab's filter chips by round.
  roundFilterLabel: "กรองรูปตามรอบตรวจนับ",
  // asset.filesTab.notFromAudit: the last chip, the photos no round holds.
  notFromAudit: "ไม่ได้มาจากการตรวจนับ",
  // asset.filesTab.roundCancelled and asset.filesTab.roundScannedBy: the selected round's line.
  roundCancelled: "ยกเลิกแล้ว",
  roundScannedBy: "ตรวจโดย {name}",
  // asset.filesTab.openPhoto: a photo tile's button, on the files tab and in the round's dialog.
  openPhoto: "ดูรูป {name}",
  // auditRound.found: the result in words of an item that matches (the round's line).
  found: "พบตรง",
  // auditRound.photoColumn, photoAttached, photoMissing: the round page's photo column, its thumbnail's name and a
  // checked item without a photo.
  photoColumn: "รูป",
  photoAttached: "มีรูป",
  photoMissing: "ไม่มีรูป",
  // auditRound.roundPhotoCount, roundPhotosTitle, roundPhotosViewInFiles: the thumbnail's name and the round's dialog.
  roundPhotoCount: "{label} {count} รูป",
  roundPhotosTitle: "รูปของ {assetTag} ในรอบ {auditNo}",
  roundPhotosViewInFiles: "ดูในแท็บไฟล์",
  // auditRound.registerPhoto: under a pending item's own register photo.
  registerPhoto: "รูปทะเบียน",
  // asset.history.viewPhotos and viewPhotosLabel: an audit row's link to the round's photos, and its accessible name.
  viewPhotos: "ดูรูป",
  viewPhotosLabel: "ดูรูป {auditNo}",
} as const
