export const maintenanceErrorCodes = [
  "MAINTENANCE_ASSET_INELIGIBLE",
  "MAINTENANCE_INVALID_TRANSITION",
  "MAINTENANCE_CONFLICT",
  "MAINTENANCE_PLAN_INVALID_TRANSITION",
  "MAINTENANCE_ASSET_WRITTEN_OFF",
  "MAINTENANCE_ASSET_ON_LOAN",
  "MAINTENANCE_OPEN_RECORD_EXISTS",
  "MAINTENANCE_REPORTER_REQUIRED",
] as const

export type MaintenanceErrorCode = (typeof maintenanceErrorCodes)[number]

export class MaintenanceApiError extends Error {
  readonly code: MaintenanceErrorCode
  readonly status: number

  constructor(
    code: MaintenanceErrorCode,
    message: string,
    status = 400,
  ) {
    super(message)
    this.name = "MaintenanceApiError"
    this.code = code
    this.status = status
  }
}

export function isMaintenanceErrorCode(value: unknown): value is MaintenanceErrorCode {
  return typeof value === "string" && maintenanceErrorCodes.includes(value as MaintenanceErrorCode)
}

export function getMaintenanceErrorPayload(error: unknown) {
  if (!(error instanceof MaintenanceApiError)) return null
  return {
    status: error.status,
    body: { code: error.code, error: error.message },
  }
}

export function getMaintenanceErrorMessage(
  code: unknown,
  translate: (key: string) => string,
  fallback: string,
) {
  return isMaintenanceErrorCode(code) ? translate(`errors.${code}`) : fallback
}
