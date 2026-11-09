// The words the ของใช้สิ้นเปลือง spec reads on screen (consumables plan 2 Task 5), as the app writes them in
// messages/th.json under consumablesPage, nav.consumables and common, and (plan 3 Task 4) assetConsumables and the
// asset register's chip words (tests/e2e-consumables.test.ts checks every value is one of th.json's and each key
// matches its message). Plain data, no imports, so the node test can load it.
export const CONSUMABLES_WORDS = {
  // The menu row and the shared words.
  navConsumables: "ของใช้สิ้นเปลือง", cancel: "ยกเลิก", moreActionsFor: "การดำเนินการของ {code}",
  // The list page: title, the row's เบิก, the low banner's item, the stock states.
  title: "ของใช้สิ้นเปลือง", issueShort: "เบิก", lowItem: "{name} (เหลือ {onHand, number})",
  state_ok: "พอใช้", state_low: "ต้องซื้อเพิ่ม", state_out: "หมด",
  // The row's ⋯ menu.
  menu_receive: "รับเข้า", menu_adjust: "ปรับยอดตามที่นับได้", menu_deactivate: "ปิดใช้งาน",
  // Adding a kind: below the table, or the empty state's button when the cabinet has none.
  addKind: "+ เพิ่มชนิดของ", emptyAction: "เพิ่มชนิดของ",
  createTitle: "เพิ่มชนิดของ", createSubmit: "เพิ่มชนิด", createToast: "เพิ่ม {name} แล้ว",
  // เบิกไปใช้.
  issueTitle: "เบิกไปใช้", issueSubmit: "บันทึกการเบิก", issueToast: "บันทึกการเบิก {name} แล้ว",
  shortWithCount: "ของในตู้ไม่พอ เหลือ {onHand, number} {unit}",
  // รับเข้า.
  receiveTitle: "รับเข้า", receiveSubmit: "บันทึกรับเข้า", receiveToast: "รับ {name} เข้าตู้แล้ว",
  // ปรับยอด.
  adjustTitle: "ปรับยอด {name}", adjustSubmit: "บันทึกยอดใหม่", adjustToast: "ปรับยอด {name} แล้ว",
  adjustLine: "เดิม {from, number} → ใหม่ {to, number} (ต่าง {diff})",
  // ปิดใช้งาน's confirm.
  deactivateTitle: "ปิดใช้งาน {name}?", deactivateBody: "ยังเหลือ {onHand, number} {unit} ในตู้ · ประวัติยังอยู่ครบ",
  deactivateConfirm: "ปิดใช้งาน", deactivateToast: "ปิดใช้งาน {name} แล้ว",
  // The history page: the header's count line, the inactive badge, the actions it drops, and the movement types.
  detailMeta: "คงเหลือ {onHand, number} {unit} · ขั้นต่ำ {min, number}", inactiveBadge: "ปิดใช้งานแล้ว",
  receive: "รับเข้า", adjustShort: "ปรับยอด", editShort: "แก้",
  type_receive: "รับเข้า", type_issue: "เบิก", type_adjust: "ปรับยอด",
  // Plan 3: the issue dialog's kind option (the panel opens it with no kind chosen).
  itemOption: "{name} (คงเหลือ {onHand, number})",
  // Plan 3: the machine's panel on its overview (assetConsumables.*).
  assetTitle: "ของใช้สิ้นเปลือง", assetRecord: "+ บันทึกเปลี่ยนของ", assetEmpty: "ยังไม่มีการเปลี่ยนของให้เครื่องนี้",
  assetOften: "เครื่องนี้เปลี่ยน{itemName} {count, number} ครั้งใน 90 วัน",
  // Plan 3: the เครื่องที่เปลี่ยนของบ่อย report, its machine chip (asset.activeFilters / asset.clearDrilldownFilter name the
  // chip group and its remove link).
  tab_frequent: "เครื่องที่เปลี่ยนของบ่อย", col_count: "ครั้งที่เปลี่ยน", latest_value: "{date} · {item}", asset_chip: "เครื่อง {tag}",
  activeFilters: "ตัวกรองที่ใช้อยู่", clearDrilldownFilter: "ล้างตัวกรองนี้",
  // Plan 4: the low-stock warning. The list's chip (consumablesPage.filterLow); the bell's and the notifications page's
  // topic (notifications.consumablesLow), the bell's empty state, the page's title, its เตือนล่วงหน้า section and a
  // topic's ⋯ (notifications.*); the work center's title and its เตือนล่วงหน้า row (workCenter.*).
  filterLow: "เฉพาะที่ต้องซื้อเพิ่ม",
  lowTopic: "ของใช้สิ้นเปลืองต้องซื้อเพิ่ม", bellEmpty: "ไม่มีงานค้าง", notificationsTitle: "การแจ้งเตือน",
  advanceSection: "เตือนล่วงหน้า", topicMenu: "ตัวเลือกของ {title}",
  workCenterTitle: "ศูนย์งานค้าง", trackingAdvance: "เตือนล่วงหน้า (คืน · ประกัน · License)",
} as const
