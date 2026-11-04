import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ApprovalDisposalDecision } from "@/components/approvals/approval-disposal-decision"
import { ApprovalInboxSeen } from "@/components/approvals/approval-inbox-seen"
import { ApprovalPhotoGallery } from "@/components/approvals/approval-photo-gallery"
import { linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { KeyValueList, type KeyValueItem } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { StatusBadge } from "@/components/ui/status-badge"
import type { DisposalInboxPanel } from "@/lib/approval-inbox-panels"
import { formatApprovalInboxDay } from "@/lib/approval-inbox"
import type { DisposalSodReason } from "@/lib/disposal-policy"
import { formatCount, formatMoney, isBlankValue } from "@/lib/display-format"

// A separation-of-duties block names its reason in the row's words (spec §7.3).
const sodReasonKeys: Record<DisposalSodReason, string> = {
  requester: "blockRequester",
  creator: "blockCreator",
  no_employee: "blockNoEmployee",
}

// "12 ต.ค. 2569 14:05": the Bangkok day and time, Buddhist years in Thai.
function formatSentAt(date: Date, locale: string) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
  return `${formatApprovalInboxDay(date, locale, true)} ${time}`
}

// One disposal request in the approvals panel (group 6 spec §7.5): the head, the photos, the details, what each decision
// does (with the asset's real status before the request), the separation-of-duties line and the decision. A blocked
// request has no decision area. Server component; the gallery, the decision and the seen marker are client islands.
export async function ApprovalDisposalPanel({
  locale,
  panel,
  segregationRequired,
  nextHref,
  closeHref,
  position,
  total,
}: {
  locale: string
  panel: DisposalInboxPanel
  segregationRequired: boolean
  nextHref: string | null
  closeHref: string
  /** "{position} จาก {total}" in the inbox's current order; null when the item is outside the list shown. */
  position: number | null
  total: number
}) {
  const [t, tDisposal] = await Promise.all([
    getTranslations({ locale, namespace: "approvalInboxPage" }),
    getTranslations({ locale, namespace: "disposalPage" }),
  ])
  const { request, asset, age, block } = panel
  const method = tDisposal.has(`types.${request.disposalType}`) ? tDisposal(`types.${request.disposalType}`) : request.disposalType
  const year = asset.purchaseYear !== null ? (locale === "th" ? asset.purchaseYear + 543 : asset.purchaseYear) : null
  const price = asset.purchasePrice !== null && Number.isFinite(Number(asset.purchasePrice)) ? formatMoney(Number(asset.purchasePrice)) : null

  const sourceValue = !panel.source
    ? null
    : panel.source.kind === "other"
      ? panel.source.text
      : (
          <Link href={panel.source.href} className={linkVariants({ size: "inherit" })}>
            {panel.source.kind === "maintenance"
              ? tDisposal("sourceMaintenance", { number: panel.source.number })
              : tDisposal("sourceAuditFinding", { number: panel.source.number })}
          </Link>
        )
  const location = [asset.locationName, asset.branchName].filter((part): part is string => !isBlankValue(part)).join(" · ")

  // Empty rows are hidden; the list puts its labels on top below sm.
  const details: KeyValueItem[] = [
    { key: "reason", label: t("detailReason"), value: request.reason },
    { key: "requester", label: t("detailRequester"), value: `${panel.requesterName} · ${formatSentAt(request.requestDate, locale)}` },
    { key: "source", label: t("detailSource"), value: sourceValue },
    { key: "serial", label: t("detailSerial"), value: asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : null },
    { key: "price", label: t("detailPrice"), value: price ? (year ? t("priceWithYear", { price, year: String(year) }) : t("priceOnly", { price })) : null },
    { key: "location", label: t("detailLocation"), value: location || null },
    { key: "custodian", label: t("detailCustodian"), value: asset.custodianName },
    { key: "condition", label: t("detailCondition"), value: asset.conditionName },
  ].filter((item) => !isBlankValue(item.value))

  const effect: KeyValueItem[] = [
    { key: "approve", label: t("effectIfApprove"), value: t("effectApprove") },
    {
      key: "reject",
      label: t("effectIfReject"),
      value: panel.previousStatusName ? t("effectReject", { status: panel.previousStatusName }) : t("effectRejectUnknown"),
    },
  ]

  const blockLine = block ? (block.sodReason ? t("sodBlocked", { reason: t(sodReasonKeys[block.sodReason]) }) : tDisposal(`errors.${block.code}`)) : null

  return (
    <article data-approval-disposal-panel={request.id} className="grid min-w-0 gap-5">
      <ApprovalInboxSeen itemKey={`disposal:${request.id}`} />

      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{t("subtypeMethod", { method })}</Chip>
          <StatusBadge
            label={age.isOverdue ? t("overdueDays", { days: formatCount(age.daysOverdue) }) : t("waitingDays", { days: formatCount(age.ageDays) })}
            tone={age.isOverdue ? "danger" : "muted"}
          />
          <span className="ms-auto text-meta text-muted-foreground"><span className="tag">{request.disposalNo}</span></span>
        </div>
        <h2 className="break-words text-lg font-semibold text-foreground">{asset.name}</h2>
        <p className="text-meta text-muted-foreground">
          <span className="tag">{asset.assetTag}</span>
          {" · "}
          <Link href={`/${locale}/disposal/${request.id}`} className={linkVariants({ size: "inherit" })}>
            {t("openRequest")}
          </Link>
        </p>
      </header>

      <ApprovalPhotoGallery
        photos={panel.photos.map((photo) => ({ id: photo.id, originalName: photo.originalName }))}
        documents={panel.documents.map((document) => ({ id: document.id, originalName: document.originalName }))}
        assetName={asset.name}
        isLost={request.disposalType === "lost"}
      />

      <KeyValueList items={details} />

      <section aria-labelledby={`approval-effect-${request.id}`} className="grid gap-2">
        <h3 id={`approval-effect-${request.id}`} className="text-sm font-semibold text-foreground">{t("effectTitle")}</h3>
        <KeyValueList items={effect} />
      </section>

      {blockLine ? (
        <Notice tone="warning" data-approval-sod="blocked">{blockLine}</Notice>
      ) : segregationRequired ? (
        <Notice tone="neutral" data-approval-sod="allowed">{t("sodAllowed")}</Notice>
      ) : null}

      {panel.block ? null : (
        <ApprovalDisposalDecision key={request.id} requestId={request.id} disposalNo={request.disposalNo} nextHref={nextHref} closeHref={closeHref} />
      )}

      {panel.block ? null : (
        <p data-approval-panel-foot className="border-t border-border-soft pt-3 text-meta text-muted-foreground">
          {position !== null
            ? t("panelFoot", { position: formatCount(position), total: formatCount(total) })
            : t("panelFootNoPosition")}
        </p>
      )}
    </article>
  )
}
