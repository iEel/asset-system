"use client"

import { useEffect } from "react"

// Each open finding starts at its top (P4-R13, P4-R31). Rows and Task 4's next finding open with scroll={false}, which
// the list beside the panel needs from xl. The pane mounts this once per finding (its key): below xl, where the panel
// takes the page in place of the list, it brings the dashboard's scroll area (#main) to the top; from xl, where the
// pane sticks and scrolls on its own, it brings the pane to its top and leaves the list where it was.
export function AuditFindingPaneTop() {
  useEffect(() => {
    if (window.matchMedia("(min-width: 1280px)").matches) document.querySelector("[data-audit-finding-pane]")?.scrollTo({ top: 0 })
    else document.getElementById("main")?.scrollTo({ top: 0 })
  }, [])
  return null
}
