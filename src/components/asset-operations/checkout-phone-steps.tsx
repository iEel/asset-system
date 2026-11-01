"use client"

import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetThumbnail, type AssetPhotoPreview } from "@/components/assets/asset-thumbnail"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList, type KeyValueItem } from "@/components/ui/key-value-list"
import { PageBackLink } from "@/components/ui/page-header"
import { Steps } from "@/components/ui/steps"
import type { CheckoutPhoneStep, CheckoutSummaryRow } from "@/lib/checkout-form-rules"
import { getLinearStepStates } from "@/lib/step-states"
import { cn } from "@/lib/utils"

const STEP_KEYS = ["phoneStep1", "phoneStep2", "phoneStep3"] as const

// The phone's step bar (group 3 spec §7.4, P1-R4): on step 1 the way out (ยกเลิกและกลับ), on steps 2-3 one step back,
// then the three steps. A move focuses it (tabIndex -1), so a screen reader reads the new step.
export function CheckoutPhoneBar({
  step,
  cancelHref,
  onStep,
  className,
}: {
  step: CheckoutPhoneStep
  cancelHref: string
  onStep: (step: CheckoutPhoneStep) => void
  className: string
}) {
  const t = useTranslations("checkout")
  const states = getLinearStepStates(3, step - 1)
  return (
    <div id="checkout-phone-steps" tabIndex={-1} className={cn("flex min-w-0 items-start gap-3 outline-none", className)}>
      {step === 1 ? (
        <PageBackLink href={cancelHref} label={t("phoneCancelBack")} />
      ) : (
        <Button type="button" variant="outline" size="md" className="min-w-11 max-md:px-0" onClick={() => onStep(step === 3 ? 2 : 1)}>
          <ArrowLeft aria-hidden="true" />
          <span className="max-md:sr-only">{step === 3 ? t("phoneBackToCheck") : t("phoneBackToEdit")}</span>
        </Button>
      )}
      <Steps
        label={t("phoneStepsLabel")}
        className="min-w-0 flex-1 pt-2.5 md:pt-2"
        steps={STEP_KEYS.map((key, index) => ({ id: key, label: t(key), state: states[index] }))}
      />
    </div>
  )
}

export type CheckoutReadBackProps = {
  receiverLabel: string
  assetName: string
  assetTag: string
  serialNumber: string | null
  /** The register's photo (group 3 spec §19.5), so the receiver sees which asset they take. */
  assetPhoto: AssetPhotoPreview | null
  photoCount: number
  components: ReadonlyArray<{ id: string; assetTag: string; name: string }>
  conditionLabel: string
  handoverModeLabel: string
  /** ผู้ถือครอง and แผนก (and the room for a room handover) from the desktop's สรุปก่อนบันทึก rows (user 2026-11-01). */
  changes: ReadonlyArray<Pick<CheckoutSummaryRow, "key" | "label" | "now" | "next" | "changed">>
  statusAfterLabel: string
  checkoutDateLabel: string
  dueDateLabel: string | null
  remark: string
  deliveredByLabel: string
  className: string
}

// Step 2, ให้ผู้รับตรวจ (spec §7.4): what the receiver reads on the phone before signing. It replaces the review dialog.
export function CheckoutReadBack({
  receiverLabel,
  assetName,
  assetTag,
  serialNumber,
  assetPhoto,
  photoCount,
  components,
  conditionLabel,
  handoverModeLabel,
  changes,
  statusAfterLabel,
  checkoutDateLabel,
  dueDateLabel,
  remark,
  deliveredByLabel,
  className,
}: CheckoutReadBackProps) {
  const t = useTranslations("checkout")
  const tOperation = useTranslations("assetOperation")
  const items: KeyValueItem[] = [
    { key: "condition", label: t("readBackCondition"), value: conditionLabel },
    { key: "mode", label: t("handoverMode"), value: handoverModeLabel },
    ...(dueDateLabel !== null ? [{ key: "due", label: t("expectedReturn"), value: dueDateLabel }] : []),
    { key: "date", label: t("checkoutDate"), value: checkoutDateLabel },
    // A change reads "now → next", the next value semibold, as the desktop card; a kept value reads its next alone, never "A → A".
    ...changes.map((row) => ({ key: row.key, label: row.label, value: row.changed ? (
      <>
        <span className="sr-only">{tOperation("summaryNow")}: </span>
        {row.now}
        <span aria-hidden="true"> → </span>
        <span className="sr-only">, {tOperation("summaryNext")}: </span>
        <span className="font-semibold">{row.next}</span>
      </>
    ) : row.next })),
    { key: "status", label: t("resultingStatus"), value: statusAfterLabel },
    ...(remark.trim() ? [{ key: "remark", label: t("remark"), value: remark }] : []),
    { key: "by", label: t("deliveredBy"), value: deliveredByLabel },
  ]
  return (
    <div data-checkout-read-back className={className}>
      <ContentPanel divided title={t("phoneStep2")} description={t("readBackHandOver")}>
        <div className="grid gap-4">
          <p className="min-w-0 break-words text-base font-semibold text-foreground">{t("readBackReceiving", { receiver: receiverLabel })}</p>
          <div className="flex min-w-0 items-start gap-3">
            <AssetThumbnail photo={assetPhoto} assetTag={assetTag} assetName={assetName} size={64} />
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="min-w-0 break-words font-medium text-foreground">{assetName}</p>
              <p className="min-w-0 break-words text-sm text-muted-foreground">
                {serialNumber ? t("readBackTagSerial", { tag: assetTag, serial: serialNumber }) : assetTag}
              </p>
              <p className="text-sm text-muted-foreground">
                {photoCount > 0 ? t("readBackPhotoCount", { count: photoCount }) : t("readBackNoPhoto")}
              </p>
            </div>
          </div>
          {components.length > 0 ? (
            <div className="grid gap-1.5 text-sm">
              <p className="font-medium text-foreground">{t("readBackComponents", { count: components.length })}</p>
              <ul className="grid gap-1 text-muted-foreground">
                {components.map((component) => (
                  <li key={component.id} className="min-w-0 break-words">
                    <span className="tag">{component.assetTag}</span> {component.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <KeyValueList items={items} />
        </div>
      </ContentPanel>
    </div>
  )
}
