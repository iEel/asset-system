import type { ReactNode } from "react"
import { AuditFindingsBatchReportProvider } from "@/components/audit/audit-findings-batch-actions"

// The findings selection bar's last result lives here, above the page segment (group 2 plan 4 Task 5, P4-R34): a batch
// that empties the last page past page 1 makes the refresh redirect (Task 3), and Next's redirect boundary unmounts all
// the page renders, the selection provider with it.
export default function AuditFindingsLayout({ children }: { children: ReactNode }) {
  return <AuditFindingsBatchReportProvider>{children}</AuditFindingsBatchReportProvider>
}
