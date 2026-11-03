import { useTranslations } from "next-intl"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { formatMoney } from "@/lib/display-format"

export type RepairRecordDetailsData = {
  reportedDate: Date
  returnDate: Date | null
  outcome: string | null
  vendor: { code: string; name: string } | null
  reportedBy: { code: string; fullNameTh: string }
  repairCost: number | null
  invoiceNo: string | null
  maintenancePlan: { planNo: string; title: string } | null
  problem: string
  resolution: string | null
}

// รายละเอียดการซ่อม (group 5 spec §8.3): วันที่แจ้งซ่อม; the vendor ("ช่างภายใน" without one) and the reporter, each with the
// name first and the code under it; ผลการซ่อม ("รอกดซ่อมเสร็จ" while open, "ไม่ระบุ" on an old closed record); วันที่ซ่อมเสร็จ
// once closed; the cost and the invoice number ("ยังไม่ระบุ" when empty); the PM plan when linked; then the problem and
// the remark exactly as typed (decision 10.3). Server-safe.
export function RepairRecordDetails({ ticket, locale, isOpen, outcomeLabel }: {
  ticket: RepairRecordDetailsData
  locale: string
  isOpen: boolean
  // The closed record's result, "ไม่ระบุ" on an old one, or null (cancelled without a result).
  outcomeLabel: string | null
}) {
  const t = useTranslations("repairRecord")

  return (
    <ContentPanel title={t("detailTitle")}>
      <KeyValueList
        items={[
          { key: "date", label: t("detail.reportedDate"), value: formatAssetDetailDate(ticket.reportedDate, locale) },
          {
            key: "vendor",
            label: t("vendor"),
            value: ticket.vendor ? (
              <>
                <span className="block">{ticket.vendor.name}</span>
                <span className="tag block w-fit">{ticket.vendor.code}</span>
              </>
            ) : t("internal"),
          },
          {
            key: "reporter",
            label: t("reporter"),
            value: (
              <>
                <span className="block">{ticket.reportedBy.fullNameTh}</span>
                <span className="tag block w-fit">{ticket.reportedBy.code}</span>
              </>
            ),
          },
          {
            key: "outcome",
            label: t("outcomeQuestion"),
            value: isOpen ? t("detail.awaitingComplete") : outcomeLabel == null ? null : (
              <StatusBadge label={outcomeLabel} tone={ticket.outcome === "usable" ? "success" : ticket.outcome === "beyond_repair" ? "warning" : "muted"} />
            ),
          },
          ...(isOpen ? [] : [{ key: "returnDate", label: t("returnDate"), value: ticket.returnDate ? formatAssetDetailDate(ticket.returnDate, locale) : null }]),
          { key: "cost", label: t("cost"), value: ticket.repairCost == null ? null : <span className="num">{formatMoney(ticket.repairCost)}</span>, nilLabel: t("detail.notGiven") },
          { key: "invoiceNo", label: t("invoiceNo"), value: ticket.invoiceNo, nilLabel: t("detail.notGiven") },
          ...(ticket.maintenancePlan
            ? [{ key: "plan", label: t("planLabel"), value: <><span className="tag">{ticket.maintenancePlan.planNo}</span> - {ticket.maintenancePlan.title}</> }]
            : []),
        ]}
      />
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <TextBlock label={t("problem")} value={ticket.problem} />
        <TextBlock label={t("remarkTitle")} value={ticket.resolution} />
      </div>
    </ContentPanel>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-20 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : <Nil />}
      </div>
    </div>
  )
}
