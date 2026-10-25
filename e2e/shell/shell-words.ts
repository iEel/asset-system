// The words the shell checks read on screen, as the app writes them in messages/th.json (tests/e2e-shell.test.ts checks
// every value is one of th.json's). Plain data, no imports, so the node test can load it.
export const SHELL_WORDS = {
  bellLabel: "การแจ้งเตือน {count} รายการ", title: "การแจ้งเตือน", bellEmpty: "ไม่มีงานค้าง",
  groupDecide: "รอคุณตัดสิน", groupFollow: "ควรติดตาม", read: "อ่านแล้ว", markAllRead: "อ่านแล้วทั้งหมด", allRead: "อ่านครบแล้ว",
  approvalInbox: "งานรออนุมัติ", increase: "{title} เพิ่ม {count} รายการ", openWorkCenter: "เปิดศูนย์งานค้าง",
  workCenter: "ศูนย์งานค้าง", workCenterWaiting: "มีงานรอคุณ {count} รายการ",
  skipLink: "ข้ามไปเนื้อหาหลัก", collapseMenu: "ย่อเมนู", expandMenu: "ขยายเมนู", userMenu: "เมนูผู้ใช้: {name}", languageMenu: "เปลี่ยนภาษา ({code})",
  switchToDark: "เปลี่ยนเป็นโหมดมืด", switchToLight: "เปลี่ยนเป็นโหมดสว่าง", logout: "ออกจากระบบ",
  more: "เพิ่มเติม", close: "ปิด", openMenu: "เปิดเมนู", moreLanguage: "ภาษา", moreTheme: "ธีม", themeLight: "สว่าง", themeDark: "มืด",
  assetRegister: "ทะเบียนทรัพย์สิน", assetManagement: "จัดการทรัพย์สิน",
  searchLabel: "ค้นหาทั่วระบบ", searchMinChars: "พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา", viewAllInRegister: "ดูทั้งหมดในทะเบียน ({count})",
  registerRange: "{from}–{to} จาก {total} รายการ", recentTitle: "เปิดล่าสุด", recentClearLabel: "ล้างรายการที่เปิดล่าสุด", notFound: "ไม่พบ \"{query}\"",
  actionScan: "สแกน / ค้นหาทรัพย์สิน", actionRegister: "หาในทะเบียนด้วยตัวกรอง", actionCreateAsset: "เพิ่มทรัพย์สิน",
  idleWarning: "จะออกจากระบบใน {time} นาทีเพราะไม่มีการใช้งาน · งานที่กรอกค้างไว้ยังไม่ถูกบันทึก",
  ceilingWarning: "จะออกจากระบบเวลา {time} · ครบ {hours} ชั่วโมงของการเข้าระบบ บันทึกงานก่อนแล้วเข้าใหม่",
  stay: "อยู่ในระบบต่อ", sessionExpired: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", offline: "ออฟไลน์อยู่ · บันทึกไม่ได้จนกว่าจะกลับมาออนไลน์",
} as const

// The global search's groups in the order the panel lists them (src/lib/global-search.ts), by their th.json labels.
export const SEARCH_GROUP_ORDER = ["ทรัพย์สิน", "งานซ่อม", "รอบตรวจนับ", "ตัดจำหน่าย", "พนักงาน", "ที่ตั้ง", "ผู้ขาย", "บริษัท", "สาขา"] as const

// A th.json template with its {name} placeholders filled, as next-intl fills a plain one.
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole))
}

// A template as a pattern: the literal text escaped, each placeholder matching what it stands for.
export function templatePattern(template: string, placeholders: Record<string, string>, flags = ""): RegExp {
  const source = template
    .split(/(\{\w+\})/)
    .map((part) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1]
      return name ? (placeholders[name] ?? "[^]*?") : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    })
    .join("")
  return new RegExp(source, flags)
}
