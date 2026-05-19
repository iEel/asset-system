export type NotificationSummaryItem = {
  key: string
  count: number
  href: string
  tone: "danger" | "warning" | "primary"
}

export type NotificationSummaryCounts = {
  approvalInbox: number
  overdueMaintenance: number
  pendingAuditFindings: number
  openAuditActions: number
  auditActionsDueSoon: number
  pendingDisposals: number
  approvedDisposals: number
  returnsDueSoon: number
  warrantyExpiringSoon: number
  licenseExpiringSoon: number
}

export function buildNotificationSummaryItems(
  locale: string,
  counts: NotificationSummaryCounts
): NotificationSummaryItem[] {
  const approvalCovered = counts.approvalInbox > 0
  const notificationItems = [
    {
      key: "approvalInbox",
      count: counts.approvalInbox,
      href: `/${locale}/admin/approvals`,
      tone: "danger",
    },
    {
      key: "overdueMaintenance",
      count: counts.overdueMaintenance,
      href: `/${locale}/maintenance?overdue=yes`,
      tone: "danger",
    },
    {
      key: "pendingAuditFindings",
      count: approvalCovered ? 0 : counts.pendingAuditFindings,
      href: `/${locale}/audit/findings?status=pending`,
      tone: "warning",
    },
    {
      key: "openAuditActions",
      count: counts.openAuditActions,
      href: `/${locale}/audit/findings?status=all`,
      tone: "warning",
    },
    {
      key: "auditActionsDueSoon",
      count: counts.auditActionsDueSoon,
      href: `/${locale}/audit/findings?status=all`,
      tone: "danger",
    },
    {
      key: "pendingDisposals",
      count: approvalCovered ? 0 : counts.pendingDisposals,
      href: `/${locale}/disposal?status=pending`,
      tone: "danger",
    },
    {
      key: "approvedDisposals",
      count: counts.approvedDisposals,
      href: `/${locale}/disposal?status=approved`,
      tone: "warning",
    },
    {
      key: "returnsDueSoon",
      count: counts.returnsDueSoon,
      href: `/${locale}/asset-management/checkin`,
      tone: "primary",
    },
    {
      key: "warrantyExpiringSoon",
      count: counts.warrantyExpiringSoon,
      href: `/${locale}/assets`,
      tone: "warning",
    },
    {
      key: "licenseExpiringSoon",
      count: counts.licenseExpiringSoon,
      href: `/${locale}/assets?ownershipType=software_license`,
      tone: "warning",
    },
  ] satisfies NotificationSummaryItem[]

  return notificationItems.filter((item) => item.count > 0)
}
