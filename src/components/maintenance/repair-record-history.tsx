import { useTranslations } from "next-intl"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { formatHistoryTime } from "@/lib/asset-history-view"
import { getAssetStateTone, getPanelClasses } from "@/lib/design-system"
import type { RepairHistoryEvent, RepairHistoryValue } from "@/lib/repair-record-detail-rules"
import { cn } from "@/lib/utils"

// The record's history (group 5 spec §8.3), oldest first as buildRepairHistory returns it: each movement with its
// label, date-time and actor, from → to as badges for a status and as names otherwise, and the reason line when the
// rules keep it; the attachment runs ("แนบรูปก่อนซ่อม 12 ไฟล์"); while open, a last hollow step "ซ่อมเสร็จ · ยังไม่ถึง" with
// no date (decision 10.3). The phone shows short dates (day, month and time). Server-safe. #history stays the anchor.
export function RepairRecordHistory({ history, locale, statusLabels }: {
  history: RepairHistoryEvent[]
  locale: string
  // Active statuses by name: a status badge takes its tone from the name behind the Thai label.
  statusLabels: Record<string, string>
}) {
  const t = useTranslations("repairRecord")
  const tMaintenance = useTranslations("maintenancePage")
  const statusNameByLabel = new Map(Object.entries(statusLabels).map(([name, label]) => [label, name]))

  const value = (item: RepairHistoryValue) =>
    item.kind === "status" ? (
      <StatusBadge wrap label={item.value} tone={getAssetStateTone(statusNameByLabel.get(item.value) ?? item.value)} />
    ) : (
      <span className="text-foreground">{item.value}</span>
    )

  return (
    <section id="history" className={cn(getPanelClasses(), "scroll-mt-6 p-4 sm:p-5")}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-foreground">{t("history")}</h2>
        <p className="text-meta text-muted-foreground">{t("detail.historyHelp")}</p>
      </div>
      {history.length === 0 ? (
        <EmptyNote>{t("historyEmpty")}</EmptyNote>
      ) : (
        <ol className="space-y-4">
          {history.map((event, index) => {
            const last = index === history.length - 1
            const rail = cn("relative pl-5", !last && "pb-1 before:absolute before:top-3 before:bottom-[-1rem] before:left-0 before:border-l before:border-border")
            if (event.kind === "future") {
              return (
                <li key="future" data-repair-history-event={event.kind} className={rail}>
                  <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: "info" }), "absolute top-1.5 -left-[3px]")} />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t("movement.close")}</span>
                    {" · "}
                    {t("detail.notYet")}
                  </p>
                </li>
              )
            }
            const label = event.kind === "movement"
              ? t(`movement.${event.labelKey}`)
              : t("detail.attachedFiles", { type: tMaintenance(`attachmentTypes.${event.type}`), count: event.count })
            return (
              <li key={event.kind === "movement" ? event.id : event.key} data-repair-history-event={event.kind} className={rail}>
                <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: "primary" }), "absolute top-1.5 -left-[3px]")} />
                <div className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-4">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-meta text-muted-foreground md:shrink-0 md:text-right">
                    <time dateTime={event.at.toISOString()}>
                      <span className="hidden md:inline">{formatAssetDetailDate(event.at, locale)} {formatHistoryTime(event.at)}</span>
                      <span className="md:hidden">{formatShortDate(event.at, locale)} {formatHistoryTime(event.at)}</span>
                    </time>
                    {event.actor ? ` · ${event.actor}` : null}
                  </p>
                </div>
                {event.kind === "movement" && (event.from || event.to) ? (
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta text-muted-foreground">
                    {event.from ? (
                      <>
                        <span className="sr-only">{t("fromValue")}</span>
                        {value(event.from)}
                      </>
                    ) : null}
                    {event.from && event.to ? <span aria-hidden="true">→</span> : null}
                    {event.to ? (
                      <>
                        <span className="sr-only">{t("toValue")}</span>
                        {value(event.to)}
                      </>
                    ) : null}
                  </p>
                ) : null}
                {event.kind === "movement" && event.reason ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.reason}</p>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

// "14 ต.ค.": the phone's short date, in Bangkok, without the year.
function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  }).format(date)
}
