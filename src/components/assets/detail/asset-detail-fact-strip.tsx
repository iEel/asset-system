import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { linkVariants } from "@/components/ui/button-variants"
import { FactStrip, type FactStripItem } from "@/components/ui/fact-strip"
import { Nil } from "@/components/ui/nil"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  buildCustodianHref,
  buildLocationRegisterHref,
  formatAssetDetailDate,
  type AssetAuditCell,
  type AssetHolderCell,
  type AssetWarrantyCell,
  type AuditRoundRef,
} from "@/lib/asset-detail-frame-rules"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

// A link that stands alone in a cell keeps a 44px target below md.
const standaloneLink = cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")

function joinSub(parts: ReadonlyArray<string | null>): string | undefined {
  const text = parts.filter((part): part is string => Boolean(part)).join(" · ")
  return text || undefined
}

// The asset page's four facts under its tabs (group 1 spec §7.4; R18, R19, R30, R32): who holds it (by ownership type),
// where it is, its last audit and its warranty. No tone of its own: the audit result is a StatusBadge in the round
// page's words. A value links onward only for a person who may open that page. Server-rendered.
export function AssetDetailFactStrip({
  locale,
  holder,
  location,
  audit,
  warranty,
  parentHref,
  canViewEmployee,
  canViewAudit,
  purchaseEditHref,
  className,
}: {
  locale: string
  holder: AssetHolderCell
  location: { id: string; name: string; branchName: string | null; parentName: string | null }
  audit: AssetAuditCell
  warranty: AssetWarrantyCell
  parentHref: string | null
  canViewEmployee: boolean
  canViewAudit: boolean
  purchaseEditHref: string | null
  className?: string
}) {
  const t = useTranslations("assetDetail")
  const tAsset = useTranslations("asset")
  const tAudit = useTranslations("auditRound")

  const roundCode = (round: AuditRoundRef): ReactNode =>
    canViewAudit ? (
      <Link href={`/${locale}/audit/rounds/${round.id}`} className={linkVariants({ size: "inherit" })}>
        <span className="tag">{round.auditNo}</span>
      </Link>
    ) : (
      <span className="tag">{round.auditNo}</span>
    )

  let holderItem: FactStripItem
  if (holder.kind === "custodian") {
    holderItem = {
      key: "holder",
      label: tAsset("custodian"),
      value: (
        <Link href={buildCustodianHref(locale, holder.employeeId, canViewEmployee)} className={standaloneLink}>
          {holder.name}
        </Link>
      ),
      sub: joinSub([holder.department, holder.heldDays !== null ? t("heldFor", { days: formatCount(holder.heldDays) }) : null]),
    }
  } else if (holder.kind === "noCustodian") {
    holderItem = { key: "holder", label: tAsset("custodian"), value: tAsset("noCustodian") }
  } else if (holder.kind === "department") {
    holderItem = {
      key: "holder",
      label: holder.label === "managing" ? t("managingDepartment") : t("usingDepartment"),
      value: holder.department ?? <Nil />,
    }
  } else if (holder.kind === "parent") {
    const parent = holder.parent
    holderItem = {
      key: "holder",
      label: t("componentOf"),
      value: parent ? (
        parentHref ? (
          <Link href={parentHref} className={standaloneLink}>
            <span>
              <span className="tag">{parent.assetTag}</span> {parent.name}
            </span>
          </Link>
        ) : (
          <>
            <span className="tag">{parent.assetTag}</span> {parent.name}
          </>
        )
      ) : (
        <Nil />
      ),
    }
  } else {
    holderItem = {
      key: "holder",
      label: t("seats"),
      value:
        holder.total === null
          ? tAsset("licensePool")
          : tAsset("licenseSeatSummary", {
              used: formatCount(holder.used),
              total: formatCount(holder.total),
              remaining: formatCount(Math.max(holder.total - holder.used, 0)),
            }),
    }
  }

  const locationItem: FactStripItem = {
    key: "location",
    label: tAsset("location"),
    value: (
      <Link href={buildLocationRegisterHref(locale, location.id)} className={standaloneLink}>
        {location.name}
      </Link>
    ),
    sub: joinSub([location.branchName, location.parentName]),
  }

  let auditItem: FactStripItem
  if (audit.kind === "result") {
    auditItem = {
      key: "audit",
      label: t("lastAudit"),
      value: <StatusBadge label={audit.labelKey ? tAudit(audit.labelKey) : audit.result} tone={audit.tone} />,
      sub: (
        <>
          {formatAssetDetailDate(audit.at, locale)} · {roundCode(audit.round)}
        </>
      ),
    }
  } else if (audit.kind === "pending") {
    auditItem = {
      key: "audit",
      label: t("lastAudit"),
      value: (
        <>
          {t("auditPendingIn")} {roundCode(audit.round)}
        </>
      ),
    }
  } else {
    auditItem = { key: "audit", label: t("lastAudit"), value: t("auditNever") }
  }

  const warrantyItem: FactStripItem =
    warranty.kind === "until"
      ? { key: "warranty", label: t("warranty"), value: t("warrantyUntil", { date: formatAssetDetailDate(warranty.date, locale) }) }
      : warranty.kind === "expired"
        ? { key: "warranty", label: t("warranty"), value: t("warrantyEnded", { date: formatAssetDetailDate(warranty.date, locale) }) }
        : {
            key: "warranty",
            label: t("warranty"),
            value: t("warrantyUnknown"),
            sub: purchaseEditHref ? (
              <Link href={purchaseEditHref} className={standaloneLink}>
                {t("addPurchaseDetails")}
              </Link>
            ) : undefined,
          }

  return <FactStrip label={tAsset("factStripLabel")} items={[holderItem, locationItem, auditItem, warrantyItem]} className={className} />
}
