import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, Circle } from "lucide-react"
import { Notice } from "@/components/ui/notice"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export type OperationSummaryRow = { key: string; label: string; now: ReactNode; next: ReactNode; changed: boolean }
export type OperationSummaryCheck = { key: string; label: string; done: boolean; note?: string }
export type OperationSummaryCardProps = {
  title: string
  nowLabel: string
  nextLabel: string
  rows: OperationSummaryRow[]
  checklist?: OperationSummaryCheck[]
  warnings?: ReactNode[]
  footnote?: ReactNode
  /** The asset line under the title (group 3 spec §19.5): the asset's photo, with its label beside it. */
  photo?: ReactNode
  assetLabel?: ReactNode
  /** One line under the asset line, above the rows: what the save changes, such as โอนย้าย's "เปลี่ยน N อย่าง: …" (group 3 spec §9.3, plan 3 P3-R12). */
  lead?: ReactNode
  /** A block right after the rows, before the checklist: บันทึกซ่อม's "ถ้าตอบว่าซ่อมเสร็จแล้ว" (group 5 spec §7.5). The group 3 forms pass nothing. */
  afterRows?: ReactNode
}

// One class string for the heads row and every row of the list, so the three columns line up.
const SUMMARY_ROW_CLASSES = "grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2"

// "สรุปก่อนบันทึก" of ส่งมอบ, รับคืน and โอนย้าย (group 3 spec §5): one row per field the save writes, ตอนนี้ then หลังบันทึก,
// the new value semibold only when it changes; an optional lead line under the asset line, above the rows; then the checklist, the warnings and a footnote. Sticky in its column from lg.
export function OperationSummaryCard({ title, nowLabel, nextLabel, rows, checklist = [], warnings = [], footnote, photo, assetLabel, lead, afterRows }: OperationSummaryCardProps) {
  const t = useTranslations("assetOperation")

  return (
    <div data-slot="operation-summary-card" className={cn(getPanelClasses(), "grid content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start")}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {photo || assetLabel ? (
        <div data-summary-asset className="flex min-w-0 items-center gap-3 text-sm">
          {photo}
          {assetLabel ? <span className="min-w-0 break-words text-foreground">{assetLabel}</span> : null}
        </div>
      ) : null}
      {lead ? <p data-summary-lead className="min-w-0 break-words text-sm font-medium text-foreground">{lead}</p> : null}
      {rows.length > 0 ? (
        <div className="grid gap-2 text-sm">
          {/* The column heads are visual only: each value names its column for a screen reader. */}
          <div aria-hidden="true" className={cn(SUMMARY_ROW_CLASSES, "text-meta text-muted-foreground")}>
            <span />
            <span>{nowLabel}</span>
            <span>{nextLabel}</span>
          </div>
          <dl className="grid gap-2">
            {rows.map((row) => (
              <div key={row.key} data-summary-row={row.key} data-changed={row.changed || undefined} className={SUMMARY_ROW_CLASSES}>
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 break-words text-foreground">
                  <span className="sr-only">{nowLabel}: </span>
                  {row.now}
                </dd>
                <dd className={cn("min-w-0 break-words text-foreground", row.changed && "font-semibold")}>
                  <span className="sr-only">{nextLabel}: </span>
                  {row.next}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {afterRows ? <div data-summary-after-rows>{afterRows}</div> : null}
      {checklist.length > 0 ? (
        <ul className="grid gap-2 text-sm">
          {checklist.map((item) => (
            <li key={item.key} data-summary-check={item.key} data-done={item.done || undefined} className="flex items-start gap-2">
              {item.done ? (
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint-foreground" />
              )}
              <span className="min-w-0">
                <span className="sr-only">{t(item.done ? "summaryCheckDone" : "summaryCheckMissing")}: </span>
                <span className="text-foreground">{item.label}</span>
                {item.note ? <span className="block text-muted-foreground">{item.note}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {warnings.map((warning, index) => (
        <Notice key={index} tone="warning">
          {warning}
        </Notice>
      ))}
      {footnote ? <p className="text-meta text-muted-foreground">{footnote}</p> : null}
    </div>
  )
}
