"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, CheckCheck, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Field } from "@/components/ui/field"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { classifyAuditFindingReviewResponse, foldAuditFindingBatchResults, type AuditFindingReviewFailureReason, type AuditFindingReviewOutcome } from "@/lib/audit-finding-review-results"
import type { AuditFindingApprovalEffect } from "@/lib/audit-finding-review-panel-rules"
import { formatCount } from "@/lib/display-format"
import { formatDateTime } from "@/lib/utils"
import { maxLength, required } from "@/lib/validation-rules"

type ReviewAction = "approve" | "reject"
// The press in flight. It stays set after a decision that went through, so the buttons stay busy or off until the next
// finding's panel replaces this one and nothing is sent twice.
type Phase = ReviewAction | "approveAll" | null
type ReviewConflictPayload = { code?: string; assetUpdatedAt?: string; findingReportedAt?: string }

// The reason box, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  reviewRemark: "audit-review-reason",
} as const
type DecisionField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as DecisionField[]

// No form element: two commands share one box. This restates the box's rules for the command pressed.
function validate(values: { action: ReviewAction; reviewRemark: string }): Partial<Record<DecisionField, string>> {
  const errors: Partial<Record<DecisionField, string>> = {}
  const check = (key: DecisionField, code: string | null) => {
    if (code) errors[key] = code
  }
  // Decision 5: a reason is required to reject, never to approve; the review API refuses the same (group 2 spec §10).
  check("reviewRemark", (values.action === "reject" ? required(values.reviewRemark) : null) ?? maxLength(values.reviewRemark, 4000))
  return errors
}

function errorText(payload: unknown): string | null {
  const error = payload && typeof payload === "object" ? (payload as { error?: unknown }).error : null
  return typeof error === "string" ? error : null
}

// Deciding in the review panel (group 2 spec §10 "Deciding", plan 4 Task 4): approve or reject take effect at once and the
// panel moves on to Task 2's next finding (P4-R18); a 409 warns here and the next approve confirms it;
// "อนุมัติทุกช่องของทรัพย์สินนี้" sends one review per finding. Mounted for every approver (key = the finding), so the
// approve-all result survives the refresh after it.
export function AuditFindingDecision({
  findingId,
  typeLabel,
  decidable,
  effectKind,
  position,
  total,
  siblings,
  nextHref,
  nextHrefAfterSiblings,
  closeHref,
}: {
  findingId: string
  typeLabel: string
  /** Pending, someone else's, on an open round (auditFindingPanelGate "open"). */
  decidable: boolean
  effectKind: AuditFindingApprovalEffect["kind"]
  /** "k จาก N" (Task 2's queue): k is null when this finding is not one the viewer may decide. */
  position: number | null
  total: number
  /** The asset's other pending findings the viewer may decide, each with its own consequence sentence. */
  siblings: readonly { id: string; typeLabel: string; effectText: string }[]
  /** Task 2's next finding after this one, and after this one with its siblings; null when none is left. */
  nextHref: string | null
  nextHrefAfterSiblings: string | null
  /** The list without a finding: the empty panel says the tab is done. */
  closeHref: string
}) {
  const t = useTranslations("auditFinding")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const apiError = useApiError()
  const fieldErrors = useFieldErrors<DecisionField>()
  const [reviewRemark, setReviewRemark] = useState("")
  const [phase, setPhase] = useState<Phase>(null)
  const [conflict, setConflict] = useState<ReviewConflictPayload | null>(null)
  const [result, setResult] = useState<{ succeeded: number; failed: { id: string; reason: AuditFindingReviewFailureReason; label: string }[] } | null>(null)
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })
  const labelById = new Map<string, string>([[findingId, typeLabel], ...siblings.map((sibling): [string, string] => [sibling.id, sibling.typeLabel])])

  async function send(id: string, action: ReviewAction, confirmConflict: boolean) {
    const response = await fetch(`/api/audit-findings/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewRemark: reviewRemark.trim(), confirmConflict }),
    })
    const payload: unknown = await response.json().catch(() => null)
    return { payload, outcome: classifyAuditFindingReviewResponse(response.status, payload) }
  }

  // The next finding is the server's (P4-R18): its link carries the finding and no page; none left opens the list.
  // scroll: false keeps the list's place beside the panel from xl; the page's AuditFindingPaneTop (keyed by the finding)
  // opens the next one at its top, the page below xl and the pane from xl (P4-R13, P4-R31).
  function moveOn(href: string | null) {
    router.replace(href ?? closeHref, { scroll: false })
  }

  async function decide(action: ReviewAction) {
    fieldErrors.setErrors(validate({ action, reviewRemark }))
    if (focusFirstError()) return
    setPhase(action)
    setResult(null)
    try {
      // The second press after the warning confirms it; the route asks it of an approve only.
      const { payload, outcome } = await send(findingId, action, action === "approve" && conflict !== null)
      if (outcome.ok) {
        toast.success(action === "reject" ? t("rejectedSuccess") : effectKind === "change" ? t("approvedSuccess") : t("approvedSuccessNoRegisterChange"))
        moveOn(nextHref)
        return
      }
      setPhase(null)
      if (outcome.reason === "assetChanged") {
        setConflict(payload as ReviewConflictPayload)
        return
      }
      if (fieldErrors.applyServer(payload) && focusFirstError()) return
      // Decided in another tab or by someone else: the panel shows it as it is now, and the toast says why.
      if (outcome.reason === "alreadyDecided") router.refresh()
      throw new Error(errorText(payload) ?? tCommon("error"))
    } catch (error) {
      setPhase(null)
      apiError.toast(error)
    }
  }

  async function approveAll() {
    fieldErrors.setErrors(validate({ action: "approve", reviewRemark }))
    if (focusFirstError()) return
    setPhase("approveAll")
    setResult(null)
    const results: { id: string; outcome: AuditFindingReviewOutcome }[] = []
    // One review per finding, in turn, so rows, counts and exports stay one per finding; a conflict is never confirmed
    // here: that finding is left to be decided on its own in the panel (group 2 spec §10, §15).
    for (const id of [findingId, ...siblings.map((sibling) => sibling.id)]) {
      try {
        results.push({ id, outcome: (await send(id, "approve", false)).outcome })
      } catch {
        results.push({ id, outcome: { ok: false, reason: "failed" } })
      }
    }
    const { succeeded, failed } = foldAuditFindingBatchResults(results)
    if (failed.length === 0) {
      toast.success(t("reviewResultSummary", { succeeded: formatCount(succeeded.length), failed: formatCount(0) }))
      moveOn(nextHrefAfterSiblings)
      return
    }
    // A failure stays in the panel as a Notice, never a warning toast (P4-R23).
    setPhase(null)
    // Each failure line keeps the label it had when pressed: the refresh drops a sibling decided elsewhere from siblings.
    setResult({ succeeded: succeeded.length, failed: failed.map((failure) => ({ ...failure, label: labelById.get(failure.id) ?? typeLabel })) })
    router.refresh()
  }

  if (!decidable && !result) return null

  return (
    <section aria-labelledby={`audit-finding-decision-${findingId}`} data-audit-finding-decision className="grid gap-4">
      <h3 id={`audit-finding-decision-${findingId}`} className="text-sm font-semibold text-foreground">{t("decisionTitle")}</h3>
      {result ? (
        <Notice tone="warning" role="status" title={t("reviewResultSummary", { succeeded: formatCount(result.succeeded), failed: formatCount(result.failed.length) })}>
          <ul className="grid gap-1">
            {result.failed.map((failure) => (
              <li key={failure.id}>
                {t("reviewFailureLine", {
                  type: failure.label,
                  reason: t(`reviewFailure_${failure.reason}`),
                })}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}
      {decidable ? (
        <>
          {conflict ? (
            <>
              <Notice tone="warning" role="alert" title={t("reviewConflictTitle")}>{t("reviewConflictHelp")}</Notice>
              <KeyValueList
                items={[
                  { key: "findingReportedAt", label: t("reviewConflictFindingAt"), value: conflict.findingReportedAt ? formatDateTime(conflict.findingReportedAt) : null },
                  { key: "assetUpdatedAt", label: t("reviewConflictAssetUpdatedAt"), value: conflict.assetUpdatedAt ? formatDateTime(conflict.assetUpdatedAt) : null },
                ]}
              />
            </>
          ) : null}
          {/* A reject without a reason reads "กรุณาระบุเหตุผลการปฏิเสธ" (P4-R27), the client's check and the server's alike. */}
          <Field label={t("reviewReasonLabel")} id={FIELD_IDS.reviewRemark} error={fieldErrors.errors.reviewRemark === "required" ? t("reviewReasonRequired") : fieldErrors.message("reviewRemark")}>
            <Textarea
              value={reviewRemark}
              rows={3}
              maxLength={4000}
              onChange={(event) => {
                setReviewRemark(event.target.value)
                fieldErrors.clear("reviewRemark")
              }}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => decide("approve")} busy={phase === "approve"} disabled={phase !== null && phase !== "approve"}>
              <Check aria-hidden="true" />
              {conflict ? t("reviewConfirmConflict") : t("approve")}
            </Button>
            <Button variant="danger" onClick={() => decide("reject")} busy={phase === "reject"} disabled={phase !== null && phase !== "reject"}>
              <X aria-hidden="true" />
              {t("reject")}
            </Button>
            {position !== null ? (
              <span data-audit-finding-position className="num text-meta text-muted-foreground">
                {t("positionOf", { index: formatCount(position), total: formatCount(total) })}
              </span>
            ) : null}
          </div>
          {siblings.length > 0 ? (
            <div data-audit-finding-siblings className="grid gap-2 border-t border-border-soft pt-4">
              <p className="text-sm font-medium text-foreground">{t("otherPendingFields")}</p>
              <ul className="grid gap-2">
                {siblings.map((sibling) => (
                  <li key={sibling.id} className="grid gap-1">
                    <Chip className="justify-self-start">{sibling.typeLabel}</Chip>
                    <span className="text-sm text-muted-foreground">{sibling.effectText}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="justify-self-start" onClick={approveAll} busy={phase === "approveAll"} disabled={phase !== null && phase !== "approveAll"}>
                <CheckCheck aria-hidden="true" />
                {t("approveAllFields")}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
