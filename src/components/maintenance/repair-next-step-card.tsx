import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Camera, FileText, Trash2 } from "lucide-react"
import { RepairHeldNotice } from "@/components/maintenance/repair-held-notice"
import { RepairCompleteButton } from "@/components/maintenance/repair-record-header-actions"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { getAssetStateTone } from "@/lib/design-system"
import { REPAIR_NEXT_STEP_TITLE_ID, type RepairNextStep } from "@/lib/repair-record-detail-rules"
import type { RepairCompleteNote, RepairCompleteRow } from "@/lib/repair-record-outlook"
import { cn } from "@/lib/utils"

// The record's next-step card (group 5 spec §8.2, §8.6): a plain ContentPanel as the audit round's next step, with the
// state on data-repair-next-step. Open: the title by the vendor, what ซ่อมเสร็จ will do per result (one row per
// RepairCompleteRow; a refused row is the early refusal with รับคืน), and from md the buttons ซ่อมเสร็จ (edit),
// แนบรูปก่อนซ่อม (when the person may upload) and เปิดหน้าทรัพย์สิน, a row under the table below xl and a column beside it
// from xl. A create-only person reads who presses ซ่อมเสร็จ; a viewer sees the rows and เปิดหน้าทรัพย์สิน only. The phone
// reads the compact form: the current status in one line, then one block per result, with no buttons (the bar holds
// them). Closed and cancelled records say what the close left; after ซ่อมไม่ได้, the disposal step only while the asset
// is รอตัดจำหน่าย or has an open request (G5P3-R7, spec §5). Its heading is the focus target after ซ่อมเสร็จ or
// ยกเลิกบันทึก (REPAIR_NEXT_STEP_TITLE_ID). Server-safe: ซ่อมเสร็จ is a client part that opens the provider's dialog.
export function RepairNextStepCard({
  nextStep,
  locale,
  assetId,
  assetHref,
  currentStatus,
  statusLabels,
  canEdit,
  canCreate,
  canAttach,
  canReturn,
  canCreateDisposal,
  canViewDisposal,
  disposalRequestHref,
}: {
  nextStep: RepairNextStep
  locale: string
  assetId: string
  assetHref: string
  currentStatus: { name: string; label: string }
  // Active statuses by name, so a predicted status reads its Thai name.
  statusLabels: Record<string, string>
  canEdit: boolean
  canCreate: boolean
  canAttach: boolean
  canReturn: boolean
  canCreateDisposal: boolean
  // disposal:view, the disposal page's permission: without it the open request is its number, not a link.
  canViewDisposal: boolean
  disposalRequestHref: string
}) {
  const t = useTranslations("repairRecord")
  const date = (value: Date | null) => (value ? formatAssetDetailDate(value, locale) : "–")
  const statusBadge = (name: string, label?: string) => (
    <StatusBadge wrap label={label ?? statusLabels[name] ?? name} tone={getAssetStateTone(name)} />
  )
  const currentBadge = statusBadge(currentStatus.name, currentStatus.label)
  const openAssetLink = (
    <Link href={assetHref} className={buttonVariants({ variant: "outline", size: "md" })}>
      <FileText aria-hidden="true" />
      {t("openAsset")}
    </Link>
  )
  const statusNow = (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      {t("detail.headNow")}
      {currentBadge}
    </p>
  )

  let title: string
  let body: ReactNode
  // From md the buttons are a row under the body; only from xl a column beside it (final review 4).
  let buttons: ReactNode = <div className="hidden md:flex md:flex-wrap md:gap-2 xl:flex-col">{openAssetLink}</div>

  if (nextStep.kind === "open") {
    title = nextStep.vendorName ? t("detail.nextOpenVendor", { vendor: nextStep.vendorName }) : t("detail.nextOpenInternal")
    const [phoneBefore, phoneAfter] = t("detail.phoneStatusNow", { status: STATUS_SLOT }).split(STATUS_SLOT)
    body = (
      <div className="space-y-3">
        <p className="hidden text-sm text-muted-foreground md:block">{t("detail.nextOpenHelp")}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground md:hidden">
          {phoneBefore}
          {currentBadge}
          {phoneAfter}
        </p>
        {/* One set of tracks for the head and the rows (subgrid): auto below xl, so หลังกดซ่อมเสร็จ keeps its room with
            the buttons in a row under the table, fixed from xl beside the buttons' column (final review 4). */}
        <div role="table" aria-label={title} className="grid gap-2 md:grid-cols-[auto_minmax(0,auto)_minmax(0,1fr)] xl:grid-cols-[minmax(0,11rem)_minmax(0,10rem)_minmax(0,1fr)] md:gap-0 md:rounded-md md:border md:border-border">
          <div role="row" className="hidden md:col-span-3 md:grid-cols-subgrid md:grid md:gap-4 md:border-b md:border-border md:px-3 md:py-2 md:text-meta md:text-muted-foreground">
            <span role="columnheader">{t("detail.headOutcome")}</span>
            <span role="columnheader">{t("detail.headNow")}</span>
            <span role="columnheader">{t("detail.headAfter")}</span>
          </div>
          {nextStep.rows.map((row) => (
            <div
              key={row.outcome}
              role="row"
              data-repair-outcome-row={row.outcome}
              className="grid gap-1.5 rounded-md border border-border p-3 text-sm md:col-span-3 md:grid-cols-subgrid md:gap-4 md:rounded-none md:border-0 md:border-b md:border-border-soft md:px-3 md:py-2.5 md:last:border-b-0"
            >
              <span role="cell" className="font-medium text-foreground md:font-normal">
                <span className="md:hidden">{t(row.outcome === "usable" ? "detail.ifUsable" : "detail.ifBeyond")}</span>
                <span className="hidden md:inline">{t(`outcome.${row.outcome}`)}</span>
              </span>
              <span role="cell" className="hidden md:block">{currentBadge}</span>
              <span role="cell" className="min-w-0">
                {row.outlook.kind === "refused" && row.outlook.held ? (
                  <RepairHeldNotice held={row.outlook.held} assetId={assetId} locale={locale} canReturn={canReturn} />
                ) : (
                  <OutcomeEffect row={row} badge={statusBadge} />
                )}
              </span>
            </div>
          ))}
        </div>
        {!canEdit && canCreate ? <p className="text-sm text-muted-foreground">{t("detail.completeByEditor")}</p> : null}
      </div>
    )
    buttons = (
      <div className="hidden md:flex md:flex-wrap md:gap-2 xl:w-52 xl:flex-col xl:[&>*]:w-full">
        {canEdit ? <RepairCompleteButton /> : null}
        {canAttach ? (
          <a href="#attachments" className={buttonVariants({ variant: "outline", size: "md" })}>
            <Camera aria-hidden="true" />
            {t("detail.attachBefore")}
          </a>
        ) : null}
        {openAssetLink}
      </div>
    )
  } else if (nextStep.kind === "closedUsable") {
    title = t("detail.closedWithOutcome", { date: date(nextStep.returnDate), outcome: t("outcome.usable") })
    body = statusNow
  } else if (nextStep.kind === "closedBeyond") {
    const closedLine = t("detail.closedWithOutcome", { date: date(nextStep.returnDate), outcome: t("outcome.beyond_repair") })
    const { disposal } = nextStep
    if (disposal.kind === "canRequest") {
      title = t("detail.nextDisposal")
      body = (
        <div className="space-y-2">
          <p className="text-sm text-foreground">{closedLine}</p>
          {statusNow}
          {canCreateDisposal ? (
            <Link href={disposalRequestHref} className={cn(buttonVariants({ size: "md" }), "w-full sm:w-auto")}>
              <Trash2 aria-hidden="true" />
              {t("openDisposalRequest")}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">{t("detail.disposalByCreator")}</p>
          )}
        </div>
      )
    } else if (disposal.kind === "none") {
      title = closedLine
      body = statusNow
    } else {
      // An open request (a link with disposal:view, else its number), or a Disposed or Retired asset (G5P3-R7).
      title = closedLine
      body = (
        <div className="space-y-2">
          {disposal.kind === "openRequest" ? (
            canViewDisposal ? (
              <Link href={`/${locale}/disposal/${disposal.id}`} className={cn(linkVariants({ size: "inherit" }), "text-sm")}>
                {t("detail.disposalOpen", { disposalNo: disposal.disposalNo })}
              </Link>
            ) : (
              <p className="text-sm text-foreground">{t("detail.disposalOpen", { disposalNo: disposal.disposalNo })}</p>
            )
          ) : disposal.kind === "writtenOff" ? (
            <p className="text-sm text-foreground">{t("detail.writtenOff")}</p>
          ) : null}
          {statusNow}
        </div>
      )
    }
  } else if (nextStep.kind === "closedNoOutcome") {
    title = t("detail.closedDone", { date: date(nextStep.returnDate) })
    body = statusNow
  } else {
    title = t("detail.cancelledTitle", { date: date(nextStep.cancelledAt) })
    body = (
      <div className="space-y-2">
        {nextStep.reason ? (
          <div>
            <p className="text-sm text-muted-foreground">{t("detail.cancelReason")}</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{nextStep.reason}</p>
          </div>
        ) : null}
        {statusNow}
      </div>
    )
  }

  return (
    <div data-repair-next-step={nextStep.kind}>
      <ContentPanel title={title} titleId={REPAIR_NEXT_STEP_TITLE_ID}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">{body}</div>
          {buttons}
        </div>
      </ContentPanel>
    </div>
  )
}

// A marker the translated phone line is split on, so the current status badge sits where {status} is.
const STATUS_SLOT = "\u0000"

// "→ ใช้งานอยู่ กลับไปที่ … ตามใบส่งมอบ HO-…": the next status as a badge and the holder note (G5P3-R1).
function OutcomeEffect({ row, badge }: { row: RepairCompleteRow; badge: (name: string) => ReactNode }) {
  const t = useTranslations("repairRecord")
  if (row.outlook.kind !== "status") return null
  const note: RepairCompleteNote = row.outlook.note
  let text: string
  if (note.key === "backTo") {
    text = note.documentNo
      ? t("detail.note.backTo", { holder: note.holder, documentNo: note.documentNo })
      : t("detail.note.backToNoDocument", { holder: note.holder })
  } else if (note.key === "holderStays") {
    text = t("detail.note.holderStays", { holder: note.holder })
  } else if (note.key === "noHolder") {
    text = t("detail.note.noHolder")
  } else {
    // ซ่อมไม่ได้: then the disposal request, and the holder who stays (decision 9).
    const then = t("detail.note.thenDisposal")
    text = note.holderStays ? `${then} · ${t("detail.note.holderStays", { holder: note.holderStays })}` : then
  }
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
      <span aria-hidden="true">→</span>
      {badge(row.outlook.nextStatusName)}
      <span>{text}</span>
    </span>
  )
}
