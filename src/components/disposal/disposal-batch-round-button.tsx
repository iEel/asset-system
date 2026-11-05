"use client"

import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { disposalRoundSelectionScope, disposalRoundSelectionStorageKey, type StoredRoundSelection } from "@/lib/disposal-round-selection"
import { Button } from "@/components/ui/button"

/**
 * "สร้างรอบตัดจำหน่ายจากชุดนี้" on the batch page (request batches spec §5, PB-R6): the machines that can join a round
 * go into the queue's selection key with the approved tab's unfiltered scope, then the round page opens and reads them
 * there, as from the queue's selection bar.
 */
export function DisposalBatchRoundButton({ ids, href, label }: { ids: string[]; href: string; label: string }) {
  const router = useRouter()

  function start() {
    const selection: StoredRoundSelection = { ids, scope: disposalRoundSelectionScope({ search: "", disposalType: "", dateFrom: "", dateTo: "" }) }
    // sessionStorage can be missing or blocked (a private window): the round page then opens with nothing selected.
    try {
      window.sessionStorage.setItem(disposalRoundSelectionStorageKey, JSON.stringify(selection))
    } catch {
      // Storage blocked: nothing to hand over.
    }
    router.push(href)
  }

  return (
    <Button size="md" onClick={start} data-disposal-batch-round-create="">
      {label}
      <ArrowRight aria-hidden="true" />
    </Button>
  )
}
