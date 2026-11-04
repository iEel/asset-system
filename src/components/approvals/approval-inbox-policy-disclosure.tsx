"use client"

import { useState, type ReactNode } from "react"
import { FormDisclosure } from "@/components/ui/form-disclosure"

// The approvals page's "นโยบายและผู้อนุมัติ" fold (group 6 spec §7.1): closed on load, the person's own toggle only.
// FormDisclosure is controlled, so this island holds its state; the content is rendered on the server.
export function ApprovalInboxPolicyDisclosure({ title, summary, children }: { title: string; summary?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <FormDisclosure title={title} summary={summary} open={open} onOpenChange={setOpen}>
      {children}
    </FormDisclosure>
  )
}
