import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { linkVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { buildNotificationsHref, type NotificationsPageData, type NotificationsParams } from "@/lib/notifications-page-data"
import { cn } from "@/lib/utils"
import { buildWaitingWorkHref, WAITING_WORK_KEYS, type WaitingWorkKey } from "@/lib/waiting-work-rules"

// A digest day is a Bangkok calendar date stored at UTC midnight, so it is formatted in UTC.
function formatDigestDay(day: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(day)
}

function formatLegacyTime(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date)
}

const isWaitingWorkKey = (key: string): key is WaitingWorkKey => (WAITING_WORK_KEYS as readonly string[]).includes(key)

// Board NT side panel, spec §6.2: สรุปรายวันที่ส่งแล้ว. One <details> per day ("20 พ.ย. 2569 · 8 หัวข้อ · 41 รายการ", the
// first open) listing the topics the digest sent with their counts and links; ดูย้อนหลังทั้งหมด (n วัน) opens up to 30
// days (digest=all); digests sent before topics were stored list as text. The right column from lg, after the list on
// phones. Server-safe.
export function NotificationDigestPanel({
  locale,
  params,
  digest,
}: {
  locale: string
  params: NotificationsParams
  digest: NotificationsPageData["digest"]
}) {
  const t = useTranslations("notifications")
  const { days, totalDays, legacy } = digest

  return (
    <section aria-labelledby="notification-digest-heading" className={cn(getPanelClasses(), "min-w-0")}>
      <div className="border-b border-border-soft px-4 py-3">
        <h2 id="notification-digest-heading" className="text-base font-semibold text-foreground">{t("digest.title")}</h2>
        <p className="mt-0.5 text-meta text-muted-foreground">{t("digest.subtitle")}</p>
      </div>

      {days.length === 0 && legacy.length === 0 ? (
        <div className="px-4 py-4">
          <EmptyNote>{t("digest.empty")}</EmptyNote>
        </div>
      ) : null}

      {days.map((day, index) => (
        <details key={day.day.toISOString()} open={index === 0} className="group/day border-b border-border-soft">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-meta text-foreground outline-none hover:bg-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-0 [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/day:rotate-90 motion-reduce:transition-none" />
            <span className="num">
              {t("digest.day", { date: formatDigestDay(day.day, locale), topics: day.topics.length, items: day.items })}
            </span>
          </summary>
          <ul className="flex flex-col gap-1 pb-2.5 pl-10 pr-4 text-meta">
            {day.topics.filter((topic): topic is { key: WaitingWorkKey; count: number } => isWaitingWorkKey(topic.key)).map((topic) => (
              <li key={topic.key} className="flex items-baseline gap-3">
                <Link href={buildWaitingWorkHref(locale, topic.key)} className={cn(linkVariants({ size: "inherit" }), "min-w-0 truncate")}>
                  {t(topic.key)}
                </Link>
                <span className="ms-auto num text-foreground">{formatCount(topic.count)}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}

      {!params.digestAll && totalDays > days.length ? (
        <div className="px-4 py-2.5">
          <Link href={buildNotificationsHref(locale, params, { digestAll: true })} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
            {t("digest.showAll", { days: totalDays })}
          </Link>
        </div>
      ) : null}

      {legacy.length > 0 ? (
        <div className="px-4 py-3">
          <h3 className="text-meta font-semibold text-muted-foreground">{t("digest.legacyTitle")}</h3>
          <ul className="mt-2 flex flex-col gap-3">
            {legacy.map((entry) => (
              <li key={entry.id} className="min-w-0 text-meta">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{entry.title}</p>
                  {/* The delivered type in words, an unknown type as it is (bug §5.10 #1, kept from the old page). */}
                  <StatusBadge label={t.has(`type_${entry.type}`) ? t(`type_${entry.type}`) : entry.type} tone={entry.type} />
                </div>
                <p className="text-muted-foreground">{formatLegacyTime(entry.createdAt, locale)}</p>
                <p className="mt-1 whitespace-pre-line break-words text-muted-foreground">{entry.message}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
