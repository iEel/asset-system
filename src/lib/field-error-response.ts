// Refusals that name fields answer with one body: { error, code?, fieldErrors } (V track spec §6.1, §6.2). A value that
// already exists answers 409 with code "DUPLICATE" and "duplicate" under its field.
import { NextResponse } from "next/server"
import type { FieldErrors } from "./field-errors.ts"

export { isPrismaUniqueConstraintError } from "./prisma-unique-retry.ts"

export function fieldErrorResponse(input: { status: number; error: string; fieldErrors: FieldErrors; code?: string }) {
  const { status, error, fieldErrors, code } = input
  return NextResponse.json(code ? { error, code, fieldErrors } : { error, fieldErrors }, { status })
}

export function uniqueConflictResponse(field: string, error: string) {
  return fieldErrorResponse({ status: 409, error, code: "DUPLICATE", fieldErrors: { [field]: "duplicate" } })
}
