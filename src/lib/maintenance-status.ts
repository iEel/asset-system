import {
  getRepairRecordStatusTone,
  isOpenRepairStatus,
  repairRecordStatuses,
  toRepairRecordStatus,
} from "./repair-record-policy.ts"

// Screens outside the maintenance module (employee, supplier, asset history) show old workflow
// tickets with the same three repair record statuses as new ones.
export const maintenanceStatuses = repairRecordStatuses

export function isMaintenanceClosed(status: string) {
  return !isOpenRepairStatus(status)
}

export function getMaintenanceStatusTone(status: string) {
  return getRepairRecordStatusTone(status)
}

export function getMaintenanceStatusLabel(status: string, labels: Record<string, string>) {
  return labels[toRepairRecordStatus(status)] ?? status
}
