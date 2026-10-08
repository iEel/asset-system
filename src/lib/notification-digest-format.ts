import type { NotificationSummaryItem } from "./notification-summary-items.ts"

export type NotificationDigestLocale = "th" | "en"

export function buildDailyDigestReferenceId(date = new Date()) {
  return `notification-digest:${date.toISOString().slice(0, 10)}`
}

export function buildDailyDigestMessage(locale: NotificationDigestLocale, items: NotificationSummaryItem[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const topItems = items.slice(0, 8)
  const lines = topItems.map((item) => `- ${digestLabel(locale, item.key)}: ${item.count.toLocaleString(locale === "th" ? "th-TH" : "en-US")}`)
  const remainder = Math.max(0, items.length - topItems.length)
  if (remainder > 0) {
    lines.push(locale === "th" ? `- และอีก ${remainder.toLocaleString("th-TH")} หัวข้อ` : `- ${remainder.toLocaleString("en-US")} more items`)
  }
  const intro = locale === "th"
    ? `วันนี้มีงานที่ควรติดตาม ${total.toLocaleString("th-TH")} รายการ`
    : `You have ${total.toLocaleString("en-US")} follow-up items today`
  return `${intro}\n${lines.join("\n")}`
}

export function resolveDigestTone(items: NotificationSummaryItem[]) {
  if (items.some((item) => item.tone === "danger")) return "danger"
  if (items.some((item) => item.tone === "warning")) return "warning"
  return "info"
}

function digestLabel(locale: NotificationDigestLocale, key: string) {
  const labels: Record<NotificationDigestLocale, Record<string, string>> = {
    th: {
      approvalInbox: "งานรออนุมัติ",
      duePm: "PM ถึงกำหนด",
      pendingAuditFindings: "รายการไม่ตรงรอพิจารณา",
      openAuditActions: "แผนแก้ไขจากการตรวจนับที่ยังเปิด",
      auditActionsDueSoon: "แผนแก้ไขจากการตรวจนับใกล้ครบกำหนด",
      pendingDisposals: "คำขอตัดจำหน่ายรออนุมัติ",
      approvedDisposals: "คำขอตัดจำหน่ายอนุมัติแล้ว",
      returnsDueSoon: "รายการยืมใช้ชั่วคราวใกล้ครบกำหนดคืน",
      warrantyExpiringSoon: "ประกันใกล้หมดอายุ",
      licenseExpiringSoon: "License ใกล้หมดอายุ",
    },
    en: {
      approvalInbox: "Approval work",
      duePm: "PM due",
      pendingAuditFindings: "Audit discrepancies pending decision",
      openAuditActions: "Open audit action plans",
      auditActionsDueSoon: "Audit actions due soon",
      pendingDisposals: "Disposals pending approval",
      approvedDisposals: "Approved disposals",
      returnsDueSoon: "Returns due soon",
      warrantyExpiringSoon: "Warranty expiring soon",
      licenseExpiringSoon: "Licenses expiring soon",
    },
  }
  return labels[locale][key] ?? key
}
