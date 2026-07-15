import { ZodError } from "zod"
import { isPrismaUniqueConstraintError } from "./prisma-unique-retry.ts"
import {
  supplierFormFields,
  type SupplierFormErrorCode,
  type SupplierFormErrors,
  type SupplierFormField,
} from "./supplier-form-errors.ts"

export function getSupplierApiError(error: unknown): {
  status: number
  payload: {
    error: string
    fieldErrors: SupplierFormErrors
  }
} | null {
  if (error instanceof ZodError) {
    const fieldErrors: SupplierFormErrors = {}

    for (const issue of error.issues) {
      const field = issue.path[0]
      if (typeof field !== "string" || !supplierFormFields.includes(field as SupplierFormField)) continue
      if (fieldErrors[field as SupplierFormField]) continue
      fieldErrors[field as SupplierFormField] = mapZodIssueToFormCode(issue)
    }

    return {
      status: 400,
      payload: {
        error: "Invalid supplier data",
        fieldErrors,
      },
    }
  }

  if (isPrismaUniqueConstraintError(error)) {
    return {
      status: 409,
      payload: {
        error: "Supplier code already exists",
        fieldErrors: { code: "duplicate_code" },
      },
    }
  }

  return null
}

function mapZodIssueToFormCode(issue: ZodError["issues"][number]): SupplierFormErrorCode {
  if (issue.code === "too_small") return "required"
  if (issue.code === "too_big") return "too_long"
  if (issue.code === "invalid_format" && "format" in issue && issue.format === "email") return "invalid_email"
  return "required"
}
