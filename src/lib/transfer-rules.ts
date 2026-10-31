// A transfer destination equal to the asset's current value is not a change (group 3 spec §9.2, call 17; group 3 plan 3,
// P3-R4). Pure and client-safe: the transfer route (before and inside its transaction) and the โอนย้าย form's rules call
// it, and the normalized holder alone decides the operation, the status and the department's source.

export type TransferDestinations = { toLocationId: string | null; toCustodianId: string | null; toDepartmentId: string | null }
export type TransferCurrentValues = { currentLocationId: string; custodianId: string | null; departmentId: string | null }

// undefined, null and "" are no destination; a value equal to the current one is none either.
function destination(sent: string | null | undefined, current: string | null): string | null {
  if (sent === undefined || sent === null || sent === "") return null
  return sent === current ? null : sent
}

export function normalizeTransferDestinations(sent: Partial<TransferDestinations>, current: TransferCurrentValues): TransferDestinations {
  return {
    toLocationId: destination(sent.toLocationId, current.currentLocationId),
    toCustodianId: destination(sent.toCustodianId, current.custodianId),
    toDepartmentId: destination(sent.toDepartmentId, current.departmentId),
  }
}

export function hasTransferChange(destinations: TransferDestinations): boolean {
  return destinations.toLocationId !== null || destinations.toCustodianId !== null || destinations.toDepartmentId !== null
}

export function sameTransferDestinations(a: TransferDestinations, b: TransferDestinations): boolean {
  return a.toLocationId === b.toLocationId && a.toCustodianId === b.toCustodianId && a.toDepartmentId === b.toDepartmentId
}
