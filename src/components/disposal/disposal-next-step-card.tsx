import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { Steps } from "@/components/ui/steps"
import type { DisposalSodReason } from "@/lib/disposal-policy"
import { getLinearStepStates, type StepOutcome } from "@/lib/step-states"

export type DisposalNextStepState = "decide" | "own" | "waiting" | "approved" | "disposed" | "rejected"

// A separation-of-duties block names its reason in the approvals inbox's words (spec §7.3).
const sodReasonKeys: Record<DisposalSodReason, string> = {
  requester: "blockRequester",
  creator: "blockCreator",
  no_employee: "blockNoEmployee",
}

// The three steps: ยื่นคำขอ is always done; a pending request waits at the decision, an approved one at the round; a
// disposed request has every step done; a rejected one stops at the decision with an X.
const stepPlan: Record<DisposalNextStepState, { current: number; outcome: StepOutcome }> = {
  decide: { current: 1, outcome: "in_progress" },
  own: { current: 1, outcome: "in_progress" },
  waiting: { current: 1, outcome: "in_progress" },
  approved: { current: 2, outcome: "in_progress" },
  disposed: { current: 2, outcome: "complete" },
  rejected: { current: 1, outcome: "rejected" },
}
const stepKeys = ["request", "decision", "round"] as const

// The request page's next-step card (group 6 spec §9.2, board DP-Request), modelled on the repair record's: a full-width
// ContentPanel with the state on data-disposal-next-step and the shared Steps rail.
// - decide: รอคุณพิจารณา, the separation-of-duties note when the policy asks for it, and beside it what each decision does
//   (with the asset's real status before the request) and the actions (อนุมัติ, ปฏิเสธ).
// - own / waiting: who it waits for and since when; own adds the warning with the reason the viewer cannot decide.
// - approved: อนุมัติแล้ว · รอบันทึกตัดจำหน่าย, the approver's own note, and executionAction: the page's link to the
//   queue's approved tab, where rounds are made (plan 4).
// - disposed: ตัดจำหน่ายแล้ว · {date}, and roundOrExecution when given: the link to its round (plan 4).
// - rejected: ไม่อนุมัติ, the remark as เหตุผล: {remark}, and the status the asset went back to.
// The buttons show from md; below md the page's ActionBar holds them. Below lg the effect lines move to the page's asset
// status card (board DP-Request-Phone). Server-safe: useTranslations is the only hook.
export function DisposalNextStepCard({
  state,
  sodReason,
  approverLabel,
  waitingSince,
  effect,
  actions,
  executionAction,
  roundOrExecution,
  rejectRemark,
  segregationRequired = false,
  approvedByViewer = false,
  previousStatus,
  doneAt,
}: {
  state: DisposalNextStepState
  sodReason: DisposalSodReason | null
  // The approver named on the request, or null for the central queue.
  approverLabel: string | null
  waitingSince: string
  effect: { approve: string; reject: string }
  actions?: ReactNode
  executionAction?: ReactNode
  roundOrExecution?: ReactNode
  rejectRemark?: string | null
  segregationRequired?: boolean
  approvedByViewer?: boolean
  // The asset's status before the request, in Thai; a rejection restored it.
  previousStatus?: string | null
  // The execution date of a disposed request, formatted.
  doneAt?: string | null
}) {
  const t = useTranslations("disposalPage")
  const tInbox = useTranslations("approvalInboxPage")
  const plan = stepPlan[state]
  const states = getLinearStepStates(stepKeys.length, plan.current, plan.outcome)
  const steps = stepKeys.map((key, index) => ({ id: key, label: t(`requestPage.steps.${key}`), state: states[index] }))

  const waitingLines = (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p className="text-foreground">
        {approverLabel ? t("requestPage.waitingFor", { approver: approverLabel }) : t("requestPage.waitingForQueue")}
      </p>
      <p>{t("requestPage.waitingSince", { date: waitingSince })}</p>
    </div>
  )

  let title: string
  let body: ReactNode = null
  let side: ReactNode = null

  if (state === "decide") {
    title = t("requestPage.titleDecide")
    body = segregationRequired ? <Notice tone="info" data-disposal-sod="allowed">{tInbox("sodAllowed")}</Notice> : null
    side = (
      <div className="space-y-4">
        {/* Below lg the page's asset status card carries these lines (board DP-Request-Phone). */}
        <div className="hidden lg:block">
          <KeyValueList
            items={[
              { key: "approve", label: tInbox("effectIfApprove"), value: effect.approve },
              { key: "reject", label: tInbox("effectIfReject"), value: effect.reject },
            ]}
          />
        </div>
        {actions ? <div className="hidden md:flex md:flex-wrap md:gap-2 [&>*]:flex-1">{actions}</div> : null}
      </div>
    )
  } else if (state === "own" || state === "waiting") {
    title = t("requestPage.titleWaiting")
    body = (
      <div className="space-y-3">
        {state === "own" && sodReason ? (
          <Notice tone="warning" title={t("requestPage.titleOwn")} data-disposal-sod="blocked">
            {tInbox("sodBlocked", { reason: tInbox(sodReasonKeys[sodReason]) })}
          </Notice>
        ) : null}
        {waitingLines}
      </div>
    )
  } else if (state === "approved") {
    title = t("requestPage.titleApproved")
    body = approvedByViewer ? <p className="text-sm text-muted-foreground">{t("requestPage.approverCannotExecute")}</p> : null
    side = executionAction ? <div className="hidden md:flex">{executionAction}</div> : null
  } else if (state === "disposed") {
    title = t("requestPage.titleDisposed", { date: doneAt ?? "–" })
    body = roundOrExecution ?? null
  } else {
    // The title is the status word; the remark, however long, wraps in the body.
    title = t("requestPage.titleRejected")
    body = (
      <div className="space-y-1 text-sm">
        {rejectRemark ? (
          <p data-disposal-reject-remark className="whitespace-pre-wrap [overflow-wrap:anywhere] text-foreground">
            {t("requestPage.rejectReason", { remark: rejectRemark })}
          </p>
        ) : null}
        <p className="text-muted-foreground">
          {previousStatus ? t("requestPage.restoredTo", { status: previousStatus }) : t("requestPage.restoredToUnknown")}
        </p>
      </div>
    )
  }

  return (
    <div data-disposal-next-step={state}>
      <ContentPanel title={title}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
          <div className="min-w-0 space-y-4">
            <Steps label={t("workflowStepsLabel")} steps={steps} />
            {body}
          </div>
          {side ? <div className="min-w-0 lg:border-l lg:border-border-soft lg:pl-5">{side}</div> : null}
        </div>
      </ContentPanel>
    </div>
  )
}
