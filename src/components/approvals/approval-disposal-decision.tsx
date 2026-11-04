"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { getDisposalApiErrorMessage } from "@/lib/disposal-error-message"
import { getDisposalDecisionFieldErrors } from "@/lib/disposal-type-policy"
import { maxLength } from "@/lib/validation-rules"

type Decision = "approve" | "reject"

// The remark box, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = { approvalRemark: "approval-disposal-remark" } as const
type DecisionField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as DecisionField[]

// Someone else decided it, or it is gone: the panel says so and offers the next item instead of a toast.
const STALE_CODES = new Set(["DISPOSAL_CONCURRENT_UPDATE", "DISPOSAL_INVALID_STAGE", "DISPOSAL_REQUEST_NOT_FOUND"])

// No form element: two commands share one box. A reject needs a remark (the server's own rule).
function validate(decision: Decision, approvalRemark: string): Partial<Record<DecisionField, string>> {
  const errors: Partial<Record<DecisionField, string>> = {}
  const tooLong = maxLength(approvalRemark, 4000)
  if (tooLong) errors.approvalRemark = tooLong
  for (const error of getDisposalDecisionFieldErrors({ decision, approvalRemark })) {
    const key = getApiErrorKey(error.message)
    if (key) errors[error.field as DecisionField] = key
  }
  return errors
}

// Deciding one disposal request in the approvals panel (group 6 spec §7.5): approve or reject through plan 1's PATCH
// with no next status (the route resolves Pending Disposal), then the next inbox item in the current order. Mounted
// only when the viewer may approve it (the panel hides it for a blocked request).
export function ApprovalDisposalDecision({
  requestId,
  disposalNo,
  nextHref,
  closeHref,
}: {
  requestId: string
  disposalNo: string
  /** The next inbox item after this one, on the page it will stand on; null when none is left. */
  nextHref: string | null
  /** The inbox without an item: its empty panel. */
  closeHref: string
}) {
  const t = useTranslations("approvalInboxPage")
  const tDisposal = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const apiError = useApiError()
  const fieldErrors = useFieldErrors<DecisionField>()
  const [approvalRemark, setApprovalRemark] = useState("")
  // The press in flight. It stays set after a decision that went through, so nothing is sent twice before the next
  // item's panel replaces this one.
  const [phase, setPhase] = useState<Decision | null>(null)
  const [stale, setStale] = useState(false)
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  async function decide(decision: Decision) {
    fieldErrors.setErrors(validate(decision, approvalRemark))
    if (focusFirstError()) return
    setPhase(decision)
    try {
      const response = await fetch(`/api/disposal-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, approvalRemark: approvalRemark.trim() || null }),
      })
      const payload = (await response.json().catch(() => null)) as { code?: string; error?: string } | null
      if (!response.ok) {
        if ((response.status === 409 || response.status === 400 || response.status === 404) && payload?.code && STALE_CODES.has(payload.code)) {
          setPhase(null)
          setStale(true)
          router.refresh()
          return
        }
        if (fieldErrors.applyServer(payload) && focusFirstError()) {
          setPhase(null)
          return
        }
        throw new Error(getDisposalApiErrorMessage(payload, tDisposal, tCommon("error")))
      }
      toast.success(decision === "approve" ? t("decisionApproved", { number: disposalNo }) : t("decisionRejected", { number: disposalNo }))
      // scroll: false keeps the list's place beside the panel from xl.
      router.replace(nextHref ?? closeHref, { scroll: false })
      router.refresh()
    } catch (error) {
      setPhase(null)
      apiError.toast(error)
    }
  }

  if (stale) {
    return (
      <Notice
        tone="warning"
        role="status"
        data-approval-stale
        action={
          <Link href={nextHref ?? closeHref} scroll={false} className={linkVariants({ size: "inherit" })}>
            {nextHref ? t("goNext") : t("backToInbox")}
          </Link>
        }
      >
        {t("staleNotice")}
      </Notice>
    )
  }

  return (
    <section aria-label={t("remarkLabel")} data-approval-disposal-decision className="grid gap-3">
      <Field label={t("remarkLabel")} id="approval-disposal-remark" hint={t("remarkHint")} error={fieldErrors.message("approvalRemark")}>
        <Textarea
          value={approvalRemark}
          rows={3}
          maxLength={4000}
          disabled={phase !== null}
          onChange={(event) => {
            setApprovalRemark(event.target.value)
            fieldErrors.clear("approvalRemark")
          }}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => decide("approve")} busy={phase === "approve"} disabled={phase !== null && phase !== "approve"}>
          <Check aria-hidden="true" />
          {t("approve")}
        </Button>
        <Button variant="danger" onClick={() => decide("reject")} busy={phase === "reject"} disabled={phase !== null && phase !== "reject"}>
          <X aria-hidden="true" />
          {t("reject")}
        </Button>
      </div>
    </section>
  )
}
