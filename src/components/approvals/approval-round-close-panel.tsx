import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ApprovalInboxSeen } from "@/components/approvals/approval-inbox-seen"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { Notice } from "@/components/ui/notice"
import type { AuditRoundClosePanel } from "@/lib/approval-inbox-panels"
import { formatApprovalInboxDay } from "@/lib/approval-inbox"

// A round ready to close in the approvals panel (group 6 spec §7.5): its name, number, dates, the close checklist (the
// close API's own) and who created it, with one primary link to the round page, where the close happens.
export async function ApprovalRoundClosePanel({ locale, panel }: { locale: string; panel: AuditRoundClosePanel }) {
  const t = await getTranslations({ locale, namespace: "approvalInboxPage" })
  const day = (date: Date) => formatApprovalInboxDay(date, locale, true)
  const { checklist } = panel

  return (
    <article data-approval-round-panel={panel.id} className="grid min-w-0 gap-4">
      <ApprovalInboxSeen itemKey={`round:${panel.id}`} />

      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{t("subtypeClose")}</Chip>
          <span className="ms-auto text-meta text-muted-foreground"><span className="tag">{panel.auditNo}</span></span>
        </div>
        <h2 className="break-words text-lg font-semibold text-foreground">{panel.name}</h2>
        <p className="text-meta text-muted-foreground">
          {panel.endDate ? t("roundDates", { start: day(panel.startDate), end: day(panel.endDate) }) : t("roundDatesOpen", { start: day(panel.startDate) })}
          {" · "}
          {t("roundCreatedBy", { name: panel.createdByName })}
        </p>
      </header>

      {/* The page shows this panel only while the close checklist is clear; a round with something left reads the
          stale notice instead (it has left the queue). */}
      <Notice tone="success" data-approval-round-checklist={checklist.canClose ? "clear" : undefined}>
        {t("roundChecklistClear")}
      </Notice>

      <Link href={`/${locale}/audit/rounds/${panel.id}`} className={buttonVariants({ variant: "default", size: "md" })}>
        {t("roundOpen")}
      </Link>
    </article>
  )
}
