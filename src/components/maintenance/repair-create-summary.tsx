import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { OperationSummaryCard } from "@/components/asset-operations/operation-summary-card"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
import { getMaintenanceErrorMessage } from "@/lib/maintenance-api-errors"
import type { MaintenancePlanFrequency } from "@/lib/preventive-maintenance"
import type { RepairAssetFacts, RepairCreateOutlook } from "@/lib/repair-record-outlook"
import { buildRepairCreateSummary, type RepairFormValues, type RepairSummaryRow, type RepairSummaryValue } from "@/lib/repair-record-form-rules"
import { formatDate } from "@/lib/utils"

// A message value that a node replaces: the message is formatted with NODE in its place, then split around it, so a
// badge or a bold name sits inside the translated sentence (the status line, the footer).
export const NODE = "\u0000"
export function withNode(text: string, node: ReactNode): ReactNode {
  const at = text.indexOf(NODE)
  if (at < 0) return text
  return <>{text.slice(0, at)}{node}{text.slice(at + NODE.length)}</>
}

// An ISO day of the summary (the plan's dates) in the app's date format, Buddhist year in Thai. Noon UTC keeps the day
// the same in every browser zone.
const isoDay = /^\d{4}-\d{2}-\d{2}$/
const formatDay = (value: string) => (isoDay.test(value) ? formatDate(`${value}T12:00:00Z`) : value)

// "สรุปก่อนบันทึก" of บันทึกซ่อม (group 5 spec §7.5): the rows ตอนนี้ → หลังบันทึก from buildRepairCreateSummary, the
// "ถ้าตอบว่าซ่อมเสร็จแล้ว" block while the result is not chosen (G5P2-R3), the checklist and the footnote.
export function RepairCreateSummary({ facts, values, plan, statusLabels, conditionOptions, salvageLabel, footnote }: {
  facts: RepairAssetFacts | null
  values: RepairFormValues
  plan: { nextDueDate: string; frequency: MaintenancePlanFrequency; intervalDays: number | null } | null
  statusLabels: Record<string, string>
  conditionOptions: { id: string; label: string }[]
  salvageLabel: string
  footnote: string
}) {
  const t = useTranslations("repairRecord")
  const tOperation = useTranslations("assetOperation")
  const tMaintenance = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const summary = buildRepairCreateSummary({
    facts,
    values,
    conditionLabels: Object.fromEntries(conditionOptions.map((option) => [option.id, option.label])),
    salvageLabel,
    plan: plan ? { nextDueDate: plan.nextDueDate, frequency: plan.frequency, intervalDays: plan.intervalDays } : null,
  })
  const badge = (name: string) => (
    <StatusBadge label={statusLabels[name] ?? (name === facts?.statusName ? facts.statusLabel : name)} tone={getAssetStateTone(name)} />
  )
  const show = (value: RepairSummaryValue): ReactNode => {
    if (value.kind === "status") return badge(value.name)
    if (value.kind === "plain") return formatDay(value.text)
    const formatted = value.values ? Object.fromEntries(Object.entries(value.values).map(([key, text]) => [key, key === "date" ? formatDay(text) : text])) : undefined
    return t(value.messageKey, formatted)
  }
  const rowLabels: Record<RepairSummaryRow["key"], string> = {
    status: t("createForm.rowStatus"),
    holder: tOperation("summaryHolder"),
    record: t("listTitle"),
    condition: tOperation("summaryCondition"),
    plan: t("planLabel"),
  }
  const checkLabels = {
    asset: t("asset"),
    dateProblem: t("createForm.checkDateProblem"),
    done: t("doneQuestion"),
    outcome: t("outcomeQuestion"),
    condition: t("conditionAfterRepair"),
  }
  // What a done answer would do: the next status, or the refusal the save would meet (spec §7.5).
  const ifDoneLine = (label: string, outlook: RepairCreateOutlook) => {
    if (outlook.kind === "status") return <>{label} → {badge(outlook.nextStatusName)}</>
    if (outlook.kind !== "refused") return label
    const holder = outlook.held?.holderName ?? "–"
    const refusal = outlook.held
      ? outlook.held.documentNo
        ? t("createForm.heldWithDocument", { holder, documentNo: outlook.held.documentNo })
        : t("createForm.heldNoDocument", { holder })
      : getMaintenanceErrorMessage(outlook.error, tMaintenance, tCommon("error"))
    return <>{label} → {refusal}</>
  }

  // The footnote is one paragraph: the "if done" block sits in it as block spans, so the card keeps its parts.
  return (
    <OperationSummaryCard
      title={tOperation("summaryTitle")}
      nowLabel={tOperation("summaryNow")}
      nextLabel={tOperation("summaryNext")}
      photo={facts ? <AssetThumbnail photo={facts.photo} assetTag={facts.assetTag} assetName={facts.name} size={64} /> : undefined}
      assetLabel={facts ? <>{facts.name} <span className="tag">{facts.assetTag}</span></> : undefined}
      rows={summary.rows.map((row) => ({ key: row.key, label: rowLabels[row.key], now: show(row.now), next: show(row.next), changed: row.changed }))}
      checklist={summary.checklist.map((item) => ({ key: item.key, label: checkLabels[item.key], done: item.done }))}
      footnote={(
        <>
          {summary.ifDone ? (
            <span data-repair-if-done className="mb-3 grid gap-1 text-sm text-foreground">
              <span className="font-medium">{t("createForm.ifDoneTitle")}</span>
              <span className="block">{ifDoneLine(t("outcome.usable"), summary.ifDone.usable)}</span>
              <span className="block">{ifDoneLine(t("outcome.beyond_repair"), summary.ifDone.beyondRepair)}</span>
            </span>
          ) : null}
          <span className="block">{footnote}</span>
        </>
      )}
    />
  )
}
