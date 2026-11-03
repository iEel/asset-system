import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { linkVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import { buildAssetRegisterTransactionHref } from "@/lib/asset-operation-policy"
import type { RepairHeld } from "@/lib/repair-record-outlook"
import { cn } from "@/lib/utils"

// The early refusal on a held asset (group 5 spec §5 "Early refusal on a held asset"), reused by the record page (plan 3):
// the answer would hit MAINTENANCE_ASSET_ON_LOAN, so this says who holds it on which handover before the save. A
// backfilled handover has no document number and reads the other sentence (Review Focus 4). "รับคืน" opens the check-in
// of that handover, back to the asset page, only with asset:edit (the check-in page's permission, Review Focus 5).
export function RepairHeldNotice({ held, assetId, locale, canReturn, hint }: {
  held: RepairHeld
  assetId: string
  locale: string
  canReturn: boolean
  hint?: ReactNode
}) {
  const t = useTranslations("repairRecord")
  const holder = held.holderName ?? "–"
  const text = held.documentNo
    ? t("createForm.heldWithDocument", { holder, documentNo: held.documentNo })
    : t("createForm.heldNoDocument", { holder })

  return (
    <Notice
      tone="warning"
      data-repair-held
      action={canReturn ? (
        <Link
          href={buildAssetRegisterTransactionHref(locale, assetId, "checkin", `/${locale}/assets/${assetId}`, held.checkoutId)}
          className={cn(linkVariants({ size: "inherit" }), "decoration-current")}
        >
          {t("createForm.heldReturn")}
        </Link>
      ) : undefined}
    >
      {text}
      {hint ? <span className="mt-1 block text-meta text-muted-foreground">{hint}</span> : null}
    </Notice>
  )
}
