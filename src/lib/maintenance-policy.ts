export type MaintenanceTicketKindInput = {
  maintenancePlanId?: string | null
  problem?: string | null
}

export type MaintenanceStatus =
  | "open"
  | "reported"
  | "accepted"
  | "in_progress"
  | "waiting_parts"
  | "waiting_vendor"
  | "completed"
  | "closed"

export const maintenanceTerminalAssetStatuses = [
  "Pending Disposal",
  "Disposed",
  "Retired",
  "Lost",
  "Missing",
  "Under Maintenance",
  "Pending Repair",
] as const

const blockedCorrectiveAssetStatuses = new Set(
  maintenanceTerminalAssetStatuses.map((status) => normalizeStatus(status)),
)

const maintenanceTransitions: Record<MaintenanceStatus, readonly MaintenanceStatus[]> = {
  open: ["closed"],
  reported: ["accepted"],
  accepted: ["in_progress"],
  in_progress: ["waiting_parts", "waiting_vendor", "completed"],
  waiting_parts: ["in_progress", "completed"],
  waiting_vendor: ["in_progress", "completed"],
  completed: ["closed"],
  closed: [],
}

export function isPreventiveMaintenanceTicket(ticket: MaintenanceTicketKindInput) {
  if (ticket.maintenancePlanId) return true
  return /^\[PM\]\s+\S+\s+-/.test(ticket.problem?.trim() ?? "")
}

export function getCorrectiveAssetEligibilityError(statusName: string, activeCorrectiveCount: number) {
  if (blockedCorrectiveAssetStatuses.has(normalizeStatus(statusName))) {
    return "MAINTENANCE_ASSET_INELIGIBLE" as const
  }
  if (activeCorrectiveCount > 0) return "MAINTENANCE_ACTIVE_TICKET_EXISTS" as const
  return null
}

export function getAllowedMaintenanceTransitions(status: string): readonly MaintenanceStatus[] {
  return maintenanceTransitions[status as MaintenanceStatus] ?? []
}

export function isMaintenanceTransitionAllowed(currentStatus: string, nextStatus: string) {
  return getAllowedMaintenanceTransitions(currentStatus).includes(nextStatus as MaintenanceStatus)
}

export function getCorrectiveLifecycleTarget(status: string) {
  return status === "in_progress" ? "Under Maintenance" as const : null
}

export function canCloseMaintenanceTicket(ticket: { repairStatus: string }) {
  return ticket.repairStatus === "open" || ticket.repairStatus === "completed"
}

export function canDeleteMaintenanceEvidence(ticketStatus: string) {
  return ticketStatus !== "closed"
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase()
}
