export type MaintenancePlanningDraft = {
  assignedToId: string
  dueDate: string
}

export function createMaintenancePlanningDraft(assignedToId?: string | null, dueDate = ""): MaintenancePlanningDraft {
  return { assignedToId: assignedToId ?? "", dueDate }
}

export function reconcileMaintenancePlanningDraft(
  current: MaintenancePlanningDraft,
  latest: MaintenancePlanningDraft,
  dialogOpen: boolean,
) {
  return dialogOpen ? current : latest
}
