import Link from "next/link"
import { AssetConfirmInspectionDialog, type AssetConfirmInspectionDialogProps } from "@/components/assets/asset-confirm-inspection-dialog"
import { buttonVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"

export type AssetInspectionNoticeProps = {
  title: string
  /** The round the asset is confirmed in (findAssetInspectionRound): its confirm page on the asset's tab. */
  round: { label: string; href: string } | null
  /** In a round, for a viewer without audit:view: the round number as plain text, no link (the confirm page refuses them). */
  roundText?: string | null
  /** No round and asset:edit: the one-step dialog. Neither: the notice has no action. */
  dialog: AssetConfirmInspectionDialogProps | null
}

// ยืนยันผลตรวจ plan 5 task 2: an asset stuck "Under Inspection" says so on its overview, with the one way on. Server-safe;
// the dialog is the client part.
export function AssetInspectionNotice({ title, round, roundText = null, dialog }: AssetInspectionNoticeProps) {
  const action = round ? (
    <Link href={round.href} className={buttonVariants({ variant: "outline", size: "md" })}>
      {round.label}
    </Link>
  ) : dialog ? (
    <AssetConfirmInspectionDialog {...dialog} />
  ) : undefined
  return (
    <Notice tone="warning" data-slot="asset-inspection-notice" title={title} action={action}>
      {roundText ?? undefined}
    </Notice>
  )
}
