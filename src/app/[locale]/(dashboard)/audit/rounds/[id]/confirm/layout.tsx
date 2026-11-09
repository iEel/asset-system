import type { ReactNode } from "react"
import { InspectionConfirmResultProvider } from "@/components/audit/inspection-confirm/inspection-confirm-result"

// The confirm's last answer lives here, above the page segment (inspection-confirm plan 3 final review): after a 200 or a
// 409 the workspace replaces the URL with the tab it ran on, and a changed URL remounts what the page renders.
export default function InspectionConfirmLayout({ children }: { children: ReactNode }) {
  return <InspectionConfirmResultProvider>{children}</InspectionConfirmResultProvider>
}
