// The words the suppliers spec reads on screen (page group 8 plan 3, spec
// docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md §3, §7), as the app writes them in
// messages/th.json (tests/e2e-master-data.test.ts checks every value is one of th.json's). Plain data, no imports, so
// the node test can load it.
export const SUPPLIER_WORDS = {
  // The list's heading and the header's เพิ่มผู้ขาย (only with supplier:create; the run's IT head has view only).
  suppliersTitle: "ผู้ขาย", createTitle: "เพิ่มผู้ขาย",
  // The record-status segmented control (common.recordStatus).
  recordStatusLabel: "สถานะข้อมูล", recordActive: "ใช้งาน", recordInactive: "ไม่ใช้งาน", recordAll: "ทั้งหมด",
  // ⋯ (MasterDataRowActions) and the page header's แก้ไข: neither without supplier:edit or supplier:delete.
  moreActionsFor: "การดำเนินการของ {code}", edit: "แก้ไข", back: "กลับ",
  // Board MD-Suppliers: the columns, the contact cell without contact, "ยังไม่มี" at 0 documents, ค้าง {n}, the summary
  // line with the default sort (by name).
  assetsColumn: "ทรัพย์สิน", purchaseDocumentsColumn: "เอกสารจัดซื้อ", repairsColumn: "งานซ่อม",
  noContact: "ยังไม่มีข้อมูลติดต่อ", addContact: "เพิ่มข้อมูลติดต่อ", none: "ยังไม่มี", openRepairs: "ค้าง {count, number}",
  summaryLine: "{suppliers, number} ผู้ขาย · ทรัพย์สินรวม {assets, number} รายการ · งานซ่อมค้าง {openRepairs, number} งาน · เรียงตาม{sort}",
  nameSort: "ชื่อผู้ขาย",
  // Board MD-Supplier: the contact line, the strip of four and their feet.
  contactLine: "ผู้ติดต่อ {name}",
  repairCostLabel: "ค่าซ่อมสะสม", baht: "บาท",
  assetsWithoutDocument: "{count, number} รายการยังไม่ผูกเอกสาร",
  purchaseAmountFoot: "มูลค่าจัดซื้อรวม {amount} บาท",
  repairsFoot: "ค้าง {open, number} · ซ่อมเสร็จแล้ว {closed, number} · ยกเลิก {cancelled, number}",
  repairCostFoot: "รวมจากใบซ่อม {count, number} ใบที่มีค่าใช้จ่าย",
  // The assets panel: its title, its description, ดูทรัพย์สินทั้งหมด, the table's caption, the เอกสาร cell.
  assetsPanelTitle: "ทรัพย์สินที่ซื้อ/อ้างอิงผู้ขายนี้",
  latestAssets: "{shown, number} รายการล่าสุด จาก {total, number}", viewAllAssets: "ดูทรัพย์สินทั้งหมด ({count, number})",
  assetsCaption: "ทรัพย์สินล่าสุดจากผู้ขายนี้", noDocument: "ยังไม่ผูก", moreDocuments: "+{count, number}",
  // The documents panel: its caption, the type labels, an amount not given, the total row.
  documentsCaption: "เอกสารจัดซื้อของผู้ขายนี้ {count, number} ใบ", documentsTotal: "รวม {count, number} ใบ",
  typePurchaseOrder: "ใบ PO", typeInvoice: "ใบกำกับ", amountUnset: "ยังไม่ระบุ",
  // The side panels: สิ่งที่ควรติดตาม with its count, the assets-without-documents item and the open repair's link, ข้อมูลผู้ขาย.
  followUpTitle: "สิ่งที่ควรติดตาม", followUpCount: "{count, number} เรื่อง", followUpAssetsWithoutDocument: "ทรัพย์สิน {count, number} รายการยังไม่ผูกเอกสารจัดซื้อ", openRepairLink: "เปิดงานซ่อม {repairNo}",
  repairHistoryTitle: "ประวัติงานซ่อมกับผู้ขาย", profileTitle: "ข้อมูลผู้ขาย",
  // The register by the supplier: the chip group and the supplier chip's label.
  activeFilters: "ตัวกรองที่ใช้อยู่", supplierChip: "ผู้ขาย",
} as const
