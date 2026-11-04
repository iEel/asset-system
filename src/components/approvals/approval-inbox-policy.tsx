import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Settings, Users } from "lucide-react"
import type { ApprovalInboxAccess } from "@/lib/approval-inbox"
import type { ApprovalPermissionMatrixItem } from "@/lib/approval-permission-matrix"
import type { WorkflowApprovalPolicy } from "@/lib/workflow-approval"
import { formatCount } from "@/lib/display-format"
import { ApprovalInboxPolicyDisclosure } from "@/components/approvals/approval-inbox-policy-disclosure"
import { buttonVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"

type ApprovalInboxPolicyProps = {
  locale: string
  policy: WorkflowApprovalPolicy
  access: ApprovalInboxAccess
  matrix: ApprovalPermissionMatrixItem[]
}

/** Every approval workflow has at least the minimum number of approvers. */
export function isApproverMatrixReady(matrix: ApprovalPermissionMatrixItem[]) {
  return matrix.every((item) => item.status === "ready")
}

// The header's one policy line (group 6 spec §7.1), one fact per element: PageHeader's meta row spaces them. The
// counts and the readiness are today's approver-matrix data. Server-only.
export async function ApprovalInboxPolicyLine({ policy, matrix }: Pick<ApprovalInboxPolicyProps, "policy" | "matrix">) {
  const t = await getTranslations("approvalInboxPage")
  const ready = isApproverMatrixReady(matrix)
  const count = (key: ApprovalPermissionMatrixItem["key"]) => formatCount(matrix.find((item) => item.key === key)?.approverCount ?? 0)
  return (
    <>
      <span data-approval-policy-line="sla">{t("policySla", { days: formatCount(policy.slaDays) })}</span>
      <span>{t("policyMinApprovers", { count: formatCount(policy.minApprovers) })}</span>
      <span>{policy.segregationRequired ? t("sodOn") : t("policySodOff")}</span>
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {t("policyApprovers")}
        <StatusBadge label={ready ? t("policyApproversReady") : t("policyApproversNotReady")} tone={ready ? "success" : "warning"} />
        {t("policyApproverCounts", { disposal: count("disposal"), audit: count("audit") })}
      </span>
    </>
  )
}

// "นโยบายและผู้อนุมัติ" (group 6 spec §7.1, Appendix A): today's policy panel and approver matrix, unchanged, behind a
// closed fold, plus the "ตั้งค่านโยบายอนุมัติ" link. Server-rendered; only the fold's state is a client island.
export async function ApprovalInboxPolicy({ locale, policy, access, matrix }: ApprovalInboxPolicyProps) {
  const t = await getTranslations("approvalInboxPage")
  // The inbox no longer hides disposal behind policy.disposalRequired (group 6 spec §7.2): approval is always required.
  const disposalPolicyOn = access.canApproveDisposal
  const auditPolicyOn = policy.auditCloseRequired && access.canApproveAudit

  return (
    <ApprovalInboxPolicyDisclosure
      title={t("disclosureTitle")}
      summary={`${t("policySla", { days: formatCount(policy.slaDays) })} · ${policy.segregationRequired ? t("sodOn") : t("policySodOff")}`}
    >
      <div data-approval-policy className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/admin/settings`} className={buttonVariants({ variant: "outline", size: "md" })}>
            <Settings aria-hidden="true" />
            {t("openPolicySettings")}
          </Link>
        </div>

        {/* The policy in effect: facts as label and value pairs, on and off as status badges (no tinted boxes). */}
        <ContentPanel title={t("policyTitle")} description={t("policyDescription")}>
          <KeyValueList
            items={[
              { key: "disposal", label: t("policyDisposal"), value: <StatusBadge label={disposalPolicyOn ? t("enabled") : t("disabled")} tone={disposalPolicyOn ? "success" : "muted"} /> },
              { key: "auditClose", label: t("policyAuditClose"), value: <StatusBadge label={auditPolicyOn ? t("enabled") : t("disabled")} tone={auditPolicyOn ? "success" : "muted"} /> },
              { key: "minApprovers", label: t("minApprovers"), value: `${formatCount(policy.minApprovers)} / ${policy.segregationRequired ? t("sodOn") : t("sodOff")}` },
              { key: "sla", label: t("approvalSla"), value: t("slaDays", { days: policy.slaDays }) },
            ]}
          />
        </ContentPanel>

        <ContentPanel
          title={t("approverMatrixTitle")}
          description={t("approverMatrixDescription", { min: policy.minApprovers })}
          actions={
            <Link href={`/${locale}/admin/roles`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Users aria-hidden="true" />
              {t("manageRoles")}
            </Link>
          }
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {matrix.map((item) => (
              <ApproverMatrixCard
                key={item.key}
                item={item}
                labels={{
                  workflow: t(`matrixWorkflow_${item.key}`),
                  approverCount: (count) => t("approverCount", { count }),
                  permissionKey: t("permissionKey"),
                  roles: t("roles"),
                  approvers: t("approvers"),
                  noRoles: t("noRoles"),
                  noApprovers: t("noApprovers"),
                  moreApprovers: (count) => t("moreApprovers", { count }),
                  status: t(`matrixStatus_${item.status}`),
                }}
              />
            ))}
          </div>
        </ContentPanel>
      </div>
    </ApprovalInboxPolicyDisclosure>
  )
}

function ApproverMatrixCard({
  item,
  labels,
}: {
  item: ApprovalPermissionMatrixItem
  labels: {
    workflow: string
    approverCount: (count: number) => string
    permissionKey: string
    roles: string
    approvers: string
    noRoles: string
    noApprovers: string
    moreApprovers: (count: number) => string
    status: string
  }
}) {
  const visibleApprovers = item.approverLabels.slice(0, 4)
  const hiddenApproverCount = item.approverLabels.length - visibleApprovers.length

  // A neutral card in the panel; the coverage is its status badge (ready, thin, missing).
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{labels.workflow}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.approverCount(item.approverCount)}</p>
        </div>
        <StatusBadge label={labels.status} tone={matrixTone(item.status)} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.permissionKey}</div>
          <div className="mt-1 text-xs text-foreground"><span className="tag">{item.permissionKey}</span></div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.roles}</div>
          <div className="mt-1 text-foreground">{item.roleLabels.length > 0 ? item.roleLabels.join(", ") : labels.noRoles}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{labels.approvers}</div>
          {visibleApprovers.length === 0 ? (
            <div className="mt-1 text-muted-foreground">{labels.noApprovers}</div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {visibleApprovers.map((approver) => (
                <Chip key={approver}>{approver}</Chip>
              ))}
              {hiddenApproverCount > 0 ? (
                <span className="text-meta text-muted-foreground">{labels.moreApprovers(hiddenApproverCount)}</span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function matrixTone(status: ApprovalPermissionMatrixItem["status"]): StatusTone {
  if (status === "missing") return "danger"
  if (status === "thin") return "warning"
  return "success"
}
