"use client"

// One hook holds a form's field errors (V track, spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md
// §4.1, §4.3, §7.2): the codes its validate() finds and the codes the server's refusal names, each shown under its field.
//
//   const fieldErrors = useFieldErrors<Key>()
//   submit:  fieldErrors.setErrors(validate(values)); if (fieldErrors.focusFirst(FIELD_ORDER, { idFor })) return
//   refused: if (fieldErrors.applyServer(payload) && fieldErrors.focusFirst(FIELD_ORDER, { idFor })) return
//            otherwise throw as today, so the catch shows the form-level message
//   change:  fieldErrors.clear("code") in the field's onChange (a pair or a group clears all of its keys)
//   render:  <Field label={t("code")} id="supplier-code" required error={fieldErrors.message("code")}>
//
// A validation error never goes through a popup notice: the hook has none, and a form's catch keeps its own.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { FORM_ERROR_KEY } from "@/lib/field-errors"
import {
  firstErrorKey,
  readFieldErrors,
  resolveValidationMessage,
  withoutKeys,
  type ValidationParams,
} from "@/lib/field-error-client"
import { focusField, waitForElement } from "@/lib/field-focus"

export type FieldErrorMap<K extends string> = Partial<Record<K | typeof FORM_ERROR_KEY, string>>

type FocusOptions<K extends string> = {
  idFor?: (key: K) => string
  reveal?: (key: K) => void | Promise<void>
}

type FocusRequest<K extends string> = { order: readonly K[]; options?: FocusOptions<K> }

// The text of a code: common.validation first, then the api-error catalog, then common.validation.invalid.
export function useValidationMessage(): (code: string, params?: ValidationParams) => string {
  const tCommon = useTranslations("common")
  const tApi = useTranslations("apiErrors")
  return useCallback(
    (code: string, params?: ValidationParams) =>
      resolveValidationMessage(code, params, {
        validation: { has: (key) => tCommon.has(`validation.${key}`), get: (key, values) => tCommon(`validation.${key}`, values) },
        apiErrors: { has: (key) => tApi.has(key), get: (key) => tApi(key) },
      }),
    [tCommon, tApi],
  )
}

// params names each field's limits for its message (tooShort {min}, tooLong {max}, outOfRange {min} {max}); without it
// the message is the plain sentence.
export function useFieldErrors<K extends string = string>(options?: { params?: Partial<Record<K, ValidationParams>> }) {
  const resolve = useValidationMessage()
  const params = options?.params
  const [errors, setErrorsState] = useState<FieldErrorMap<K>>({})
  // The latest map, so focusFirst right after setErrors in the same handler sees it.
  const errorsRef = useRef<FieldErrorMap<K>>({})
  const pendingFocus = useRef<FocusRequest<K> | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)

  // Replaces the map: a new submit recomputes every error.
  const setErrors = useCallback((next: FieldErrorMap<K>) => {
    errorsRef.current = next
    setErrorsState(next)
  }, [])

  // True when the body names any key (_form and keys the form does not show included); those errors replace the form's.
  // focusFirst then decides whether one of them is shown.
  const applyServer = useCallback(
    (payload: unknown): boolean => {
      const fieldErrors = readFieldErrors(payload)
      if (!fieldErrors) return false
      setErrors(fieldErrors as FieldErrorMap<K>)
      return true
    },
    [setErrors],
  )

  const clear = useCallback(
    (...keys: K[]) => {
      const next = withoutKeys(errorsRef.current, keys)
      if (next !== errorsRef.current) setErrors(next)
    },
    [setErrors],
  )

  const message = useCallback(
    (key: K | typeof FORM_ERROR_KEY): string | undefined => {
      const code = errors[key]
      if (!code) return undefined
      return resolve(code, key === FORM_ERROR_KEY ? undefined : params?.[key as K])
    },
    [errors, params, resolve],
  )

  // True when a key of order has an error. The focus itself waits for the render that shows the errors, so the field is
  // read with its new aria-describedby.
  const focusFirst = useCallback((order: readonly K[], focusOptions?: FocusOptions<K>): boolean => {
    if (firstErrorKey(errorsRef.current, order) === null) return false
    pendingFocus.current = { order, options: focusOptions }
    setFocusRequest((count) => count + 1)
    return true
  }, [])

  useEffect(() => {
    const request = pendingFocus.current
    if (!request) return
    const key = firstErrorKey(errorsRef.current, request.order)
    if (key === null) return
    let cancelled = false
    const run = async () => {
      // A settings tab mounts its panel after the switch, a review dialog unmounts first: reveal, then wait for the field.
      await request.options?.reveal?.(key)
      if (cancelled) return
      const element = await waitForElement(request.options?.idFor?.(key) ?? key)
      if (!cancelled && element) focusField(element)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [focusRequest])

  return useMemo(() => ({ errors, setErrors, applyServer, clear, message, focusFirst }), [errors, setErrors, applyServer, clear, message, focusFirst])
}
