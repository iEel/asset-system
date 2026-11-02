// The words the import and export page's spec reads on screen (page group 4 plan 5, spec
// docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §13, Appendix A), as the app writes them in
// messages/th.json (tests/e2e-register.test.ts checks every value is one of th.json's and names its key). Plain data,
// no imports, so the node test can load it.
export const IMPORT_WORDS = {
  // The page (assetTools.importExportTitle) and the import card (asset.importPage).
  pageTitle: "นำเข้า / ส่งออกทรัพย์สิน", cardTitle: "นำเข้าทรัพย์สินจาก Excel", templateDownload: "ดาวน์โหลดแม่แบบ",
  // The file check: its heading, the three tiles and the row filter with its counts.
  resultTitle: "ผลตรวจไฟล์", statRows: "แถวในไฟล์", statReady: "พร้อมนำเข้า", statErrors: "มีข้อผิดพลาด",
  filterErrors: "มีข้อผิดพลาด {count, number}", filterReady: "พร้อมนำเข้า {count, number}", filterAll: "ทั้งหมด {count, number}",
  // A row's problem in two lines (P5-R4): "<ชื่อช่อง>: <ปัญหา>", then "ค่าในไฟล์: <value>" · "ใช้อยู่กับ <tag>".
  issueLine: "{field}: {problem}", issueValue: "ค่าในไฟล์: {value}", issueSeparator: " · ", usedBy: "ใช้อยู่กับ {tag}",
  fieldCurrentLocation: "รหัสที่ตั้งปัจจุบัน", fieldSerial: "Serial Number",
  notFound: "ไม่พบในข้อมูลอ้างอิง", duplicateExisting: "ซ้ำกับข้อมูลที่มีอยู่แล้ว",
  rowReady: "พร้อมนำเข้า",
  // The card's footer, its confirm (the count it promises) and the done state.
  footerSummary: "นำเข้า {ready, number} แถวที่พร้อม · ข้าม {skipped, number} แถวที่มีข้อผิดพลาด",
  confirm: "ยืนยันนำเข้า {count, number} รายการ",
  doneSummary: "นำเข้าแล้ว {imported, number} รายการ · ข้าม {skipped, number} แถว", doneAssets: "ทรัพย์สินที่นำเข้า",
  // The history (assetTools.importExportPage): a row is its file name, its counts and its outcome.
  historyTitle: "ประวัติรอบนำเข้า", historyCounts: "นำเข้าแล้ว {imported, number}/{total, number} · ข้าม {skipped, number}",
  outcomePartial: "นำเข้าบางส่วน",
  // The export card: "ส่งออกทั้งหมด (Excel)" and its count line (the number is never pinned: the dev data grows).
  exportAll: "ส่งออกทั้งหมด (Excel)", exportAllCount: "{count, number} รายการ · ไม่ใช้ตัวกรอง",
} as const
