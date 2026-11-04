"use client"

import { useEffect } from "react"
import { addApprovalInboxSeen, approvalInboxSeenStorageKey } from "@/lib/approval-inbox-selection"

// The "seen" marker (group 6 spec §7.4): each panel mounts it, and it records its item ("<key>:<id>") in sessionStorage
// once, so the bulk confirm can say which chosen items were never opened. Storage may be blocked (a private window):
// then nothing is recorded and the confirm counts the item as not opened. Renders nothing.
export function ApprovalInboxSeen({ itemKey }: { itemKey: string }) {
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(approvalInboxSeenStorageKey)
      window.sessionStorage.setItem(approvalInboxSeenStorageKey, addApprovalInboxSeen(raw, itemKey))
    } catch {
      // Storage unavailable: the item stays "not opened", a warning only.
    }
  }, [itemKey])

  return null
}
