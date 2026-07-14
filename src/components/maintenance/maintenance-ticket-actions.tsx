"use client"

import { useEffect, useState } from "react"
import { MaintenanceTicketCloseButton } from "@/components/maintenance/maintenance-ticket-close-button"
import { MaintenanceTicketPlanningButton } from "@/components/maintenance/maintenance-ticket-planning-button"
import { MaintenanceTicketStatusButton } from "@/components/maintenance/maintenance-ticket-status-button"

export type MaintenanceActionTicket = {
  id: string
  repairNo: string
  repairStatus: string
  updatedAt: string
  isPreventive: boolean
  assignedToId?: string | null
  dueDate?: string | null
  laborCost?: string
  partsCost?: string
  repairCost?: string
  quotationNo?: string | null
  invoiceNo?: string | null
  warrantyClaim: boolean
}

type SelectedAction = { ticketId: string; action: "status" | "planning" | "close" } | null

export function MaintenanceTicketActions({
  tickets,
  closeStatuses,
}: {
  tickets: MaintenanceActionTicket[]
  closeStatuses: Array<{ id: string; label: string; name: string }>
}) {
  const [selected, setSelected] = useState<SelectedAction>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const trigger = (event.target as Element | null)?.closest<HTMLElement>("[data-maintenance-action]")
      const action = trigger?.dataset.maintenanceAction
      const ticketId = trigger?.dataset.ticketId
      if (ticketId && (action === "status" || action === "planning" || action === "close")) setSelected({ ticketId, action })
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const ticket = selected ? tickets.find((item) => item.id === selected.ticketId) : null
  if (!ticket || !selected) return null
  if (selected.action === "status") {
    return (
      <MaintenanceTicketStatusButton
        ticketId={ticket.id}
        repairNo={ticket.repairNo}
        currentStatus={ticket.repairStatus}
        expectedUpdatedAt={ticket.updatedAt}
        isPreventive={ticket.isPreventive}
        open
        hideTrigger
        onOpenChange={(open) => { if (!open) setSelected(null) }}
      />
    )
  }
  if (selected.action === "planning") {
    return (
      <MaintenanceTicketPlanningButton
        ticketId={ticket.id}
        repairNo={ticket.repairNo}
        currentStatus={ticket.repairStatus}
        initialAssignedToId={ticket.assignedToId}
        initialDueDate={ticket.dueDate}
        expectedUpdatedAt={ticket.updatedAt}
        open
        hideTrigger
        onOpenChange={(open) => { if (!open) setSelected(null) }}
      />
    )
  }
  return (
    <MaintenanceTicketCloseButton
      ticketId={ticket.id}
      repairNo={ticket.repairNo}
      statuses={closeStatuses}
      defaultLaborCost={ticket.laborCost}
      defaultPartsCost={ticket.partsCost}
      defaultRepairCost={ticket.repairCost}
      defaultQuotationNo={ticket.quotationNo}
      defaultInvoiceNo={ticket.invoiceNo}
      defaultWarrantyClaim={ticket.warrantyClaim}
      expectedUpdatedAt={ticket.updatedAt}
      isPreventive={ticket.isPreventive}
      open
      hideTrigger
      onOpenChange={(open) => { if (!open) setSelected(null) }}
    />
  )
}
