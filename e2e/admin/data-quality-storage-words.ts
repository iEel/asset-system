// The words the data-quality and storage spec reads on screen (page group 12 plan 3 Task 5, spec
// docs/superpowers/specs/2026-11-08-page-group-12-admin-design.md §7, §8, boards AD-DataQuality and AD-Storage), as the
// app writes them in messages/th.json dataQualityPage, storagePage and common. Plain data, no imports, so a node test
// can load it.
export const DATA_QUALITY_WORDS = {
  title: "ศูนย์กฎคุณภาพข้อมูล",
  // The tabs' <nav> and its two links; each link ends with its count ("ข้อมูลไม่ครบ 12").
  tabsLabel: "มุมมองคุณภาพข้อมูล", tabRules: "ข้อมูลไม่ครบ", tabReview: "สถานะไม่สอดคล้อง รอตรวจสอบ",
  // The distribution panel's heading, its legend's empty line.
  distributionTitle: "รายการที่ต้องแก้ตามกฎที่เปิด", noIssues: "ไม่มีรายการที่ต้องแก้ตามกฎที่เปิด",
  // The six rule cards, each an <article> named by its rule (dataQualityPage.rules.<key>.label), in the page's order.
  rules: [
    "ต้องมีผู้รับผิดชอบตามประเภท",
    "ต้องมี Serial Number",
    "ต้องมีรูปทรัพย์สิน",
    "ต้องมีแผนก",
    "ต้องมีข้อมูลจัดซื้อ",
    "ใกล้หมดประกัน",
  ],
  // A card's count row: an off rule says ไม่ใช้งาน (common.inactive), one switched on but not saved says นับหลังบันทึก.
  inactive: "ไม่ใช้งาน", countAfterSave: "นับหลังบันทึก",
  // The sticky save bar: its summary, the buttons (ยกเลิก is common.cancel; บันทึกกฎ is never pressed).
  noChanges: "ยังไม่มีการเปลี่ยนแปลง",
  changeTurnedOn: "ปิด → เปิด {rules}", changeTurnedOff: "เปิด → ปิด {rules}", changeEnabled: "กฎที่เปิด {before} → {after}",
  cancel: "ยกเลิก", saveRules: "บันทึกกฎ",
  // The review tab: the workspace panel's heading.
  reviewTitle: "รายการรอตรวจสอบสถานะและสภาพทรัพย์สิน",
} as const

export const STORAGE_WORDS = {
  title: "พื้นที่จัดเก็บไฟล์",
  // The file check's chips <nav> and its three chips; each ends with its count ("ไฟล์หาย 3").
  filterLabel: "กรองสิ่งที่พบ", filterAll: "ทั้งหมด", filterMissing: "ไฟล์หาย", filterOrphan: "ไฟล์หลุด",
  // The empty file check (nothing found at all) and the empty filter.
  emptyDryRunActions: "ไฟล์ในโฟลเดอร์ตรงกับฐานข้อมูลทั้งหมด", emptyFiltered: "ไม่มีรายการในตัวกรองนี้",
  // A row's expand button ("รายละเอียดของ {file}") and its detail: the path line and its copy button.
  showDetails: "รายละเอียดของ {file}", pathInUploads: "path ในโฟลเดอร์อัปโหลด", copyPath: "คัดลอก path",
  // An orphan row's archive button, its confirm dialog's title (named by the path) and the dialog's ยกเลิก.
  archiveOrphanFile: "ย้ายไปที่เก็บถาวร", archiveConfirm: "ย้าย {file} ไปที่เก็บถาวรใช่ไหม? ระบบไม่ลบไฟล์", cancel: "ยกเลิก",
} as const
