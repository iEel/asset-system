export const supplierFormFields = [
  "code",
  "name",
  "contactPerson",
  "phone",
  "email",
  "address",
  "isActive",
] as const

export type SupplierFormField = (typeof supplierFormFields)[number]

// The shared field codes (src/lib/field-errors.ts) the supplier form shows; the server sends them for every route.
export const supplierFormErrorCodes = [
  "required",
  "invalidEmail",
  "tooLong",
  "duplicate",
] as const

export type SupplierFormErrorCode = (typeof supplierFormErrorCodes)[number]

export type SupplierFormErrors = Partial<Record<SupplierFormField, SupplierFormErrorCode>>

export function parseSupplierFormError(payload: unknown): {
  message?: string
  fieldErrors: SupplierFormErrors
} {
  if (!payload || typeof payload !== "object") return { fieldErrors: {} }

  const record = payload as Record<string, unknown>
  const rawFieldErrors = record.fieldErrors
  const fieldErrors: SupplierFormErrors = {}

  if (rawFieldErrors && typeof rawFieldErrors === "object") {
    for (const field of supplierFormFields) {
      const code = (rawFieldErrors as Record<string, unknown>)[field]
      if (typeof code === "string" && supplierFormErrorCodes.includes(code as SupplierFormErrorCode)) {
        fieldErrors[field] = code as SupplierFormErrorCode
      }
    }
  }

  return {
    ...(typeof record.error === "string" ? { message: record.error } : {}),
    fieldErrors,
  }
}
