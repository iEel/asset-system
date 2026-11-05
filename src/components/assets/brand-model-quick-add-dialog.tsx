"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import type { SearchableSelectCreateRow } from "@/components/ui/searchable-select"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { BrandModelClashNotice } from "@/components/master-data/brand-model-clash-notice"
import { reactivateNameClash, readNameClash } from "@/lib/brand-model-clash"
import type { NameClash } from "@/lib/brand-model-duplicates"
import {
  quickAddRequest,
  shouldOfferCreate,
  similarNamesUrl,
  type QuickAddAvailability,
  type QuickAddKind,
} from "@/lib/brand-model-quick-add-rules"
import { maxLength, required } from "@/lib/validation-rules"

// What the form receives: a brand, or a model with the brand and category the form's model filter reads.
export type QuickAddRecord = { id: string; label: string; brandId?: string | null; categoryId?: string | null }

const NAME_ID = "brand-model-quick-add-name"
const CLASH_ID = "brand-model-quick-add-clash"
const SIMILAR_DELAY_MS = 250

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

// The picker's createRow (spec §4.2): "เพิ่ม{ยี่ห้อ|รุ่น}ใหม่: {query}" when the person may add and no option has the
// typed name (G7P1-R4); otherwise the hint that says why nothing can be added, where the picker finds nothing.
export function useQuickAddCreateRow({
  kind,
  availability,
  optionNames,
  onCreate,
}: {
  kind: QuickAddKind
  availability: QuickAddAvailability
  // The names the duplicate rule compares with: every brand, or every model of the chosen brand.
  optionNames: readonly string[]
  onCreate: (query: string) => void
}): SearchableSelectCreateRow {
  const t = useTranslations("brandModel.quickAdd")
  if (availability === "noPermission") return { blockedHint: t("noPermission") }
  if (availability === "needBrandAndCategory") return { blockedHint: t("needBrandAndCategory") }
  return {
    label: (query) => (kind === "brand" ? t("createBrand", { query }) : t("createModel", { query })),
    onCreate,
    isExactMatch: (query) => !shouldOfferCreate(query, optionNames),
  }
}

// Page group 7 plan 1 Task 3 (spec §4.2): add a brand, or a model of the form's brand and category, from inside an asset
// form. The name comes prefilled with what was typed; similar names already in the list show as the person types
// (a warning, never a block); only the server's duplicate rule refuses, and its 409 names the existing record with
// BrandModelClashNotice. Whatever is chosen (the new record, a similar one, the clash, a reactivated one) goes back
// through onChosen, and the form picks it with the handler a pick uses. No form element here: the dialog renders in a portal
// and React would bubble its submit to the asset form.
export function BrandModelQuickAddDialog({
  kind,
  open,
  initialName,
  brand,
  categoryId,
  canReactivate,
  knownOptions,
  onClose,
  onChosen,
}: {
  kind: QuickAddKind
  open: boolean
  initialName: string
  // The form's chosen brand and category; a model needs both (quickAddAvailability), a brand neither.
  brand: { id: string; label: string } | null
  categoryId: string | null
  canReactivate: boolean
  // The form's options of this kind, so using an existing model keeps its own brand and category.
  knownOptions: readonly QuickAddRecord[]
  onClose: () => void
  onChosen: (record: QuickAddRecord) => void
}) {
  const t = useTranslations("brandModel")
  const tCommon = useTranslations("common")
  const nameRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState(initialName)
  const [similar, setSimilar] = useState<NameClash[]>([])
  const [clash, setClash] = useState<NameClash | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const fieldErrors = useFieldErrors<"name">()
  const brandId = brand?.id ?? null

  // The similar names, read 250 ms after the last keystroke; an answer for an older name is dropped. A name too short
  // to ask about shows no list.
  const similarUrl = similarNamesUrl(kind, name, brand?.id ?? null)
  const shownSimilar = similarUrl ? similar : []
  useEffect(() => {
    if (!open || !similarUrl) return
    const url = similarUrl
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(url, { signal: controller.signal, cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (!controller.signal.aborted) setSimilar(isRecord(payload) && Array.isArray(payload.data) ? (payload.data as NameClash[]) : [])
        })
        .catch(() => {
          // A failed read leaves no list: the warning is a help, the server's rule still refuses a duplicate.
          if (!controller.signal.aborted) setSimilar([])
        })
    }, SIMILAR_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [open, similarUrl])

  function changeName(value: string) {
    setName(value)
    setClash(null)
    setError(null)
    fieldErrors.clear("name")
  }

  // An existing record: a brand needs only its name; a model keeps its own category, read when the form does not hold it.
  async function resolveExisting(existing: NameClash): Promise<QuickAddRecord> {
    const known = knownOptions.find((option) => option.id === existing.id)
    if (known) return known
    if (kind === "brand") return { id: existing.id, label: existing.name }
    try {
      const response = await fetch(`/api/models/${existing.id}`, { cache: "no-store" })
      const model = response.ok ? await response.json() : null
      if (isRecord(model) && typeof model.categoryId === "string") {
        return { id: existing.id, label: existing.name, brandId: typeof model.brandId === "string" ? model.brandId : brandId, categoryId: model.categoryId }
      }
    } catch {
      // Falls through to the form's own scope.
    }
    return { id: existing.id, label: existing.name, brandId, categoryId }
  }

  async function chooseExisting(existing: NameClash) {
    onChosen(await resolveExisting(existing))
  }

  async function reactivate(existing: NameClash) {
    try {
      await reactivateNameClash(kind, existing, { source: "asset-form" })
      onChosen(await resolveExisting({ ...existing, isActive: true }))
    } catch (reactivateError) {
      setError(reactivateError)
    }
  }

  async function save() {
    if (saving) return
    setError(null)
    const nameError = required(name.trim()) ?? maxLength(name.trim(), 200)
    fieldErrors.setErrors(nameError ? { name: nameError } : {})
    if (fieldErrors.focusFirst(["name"], { idFor: () => NAME_ID })) return
    setClash(null)
    setSaving(true)
    try {
      const request = quickAddRequest(kind, name, { brandId: brand?.id ?? null, categoryId })
      const response = await fetch(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A name clash names the existing record under the field (G7P1-R1); any other named field shows there too.
        const nameClash = readNameClash(payload)
        if (nameClash) {
          setClash(nameClash.existing)
          nameRef.current?.focus()
          return
        }
        if (fieldErrors.applyServer(payload) && fieldErrors.focusFirst(["name"], { idFor: () => NAME_ID })) return
        throw new Error(isRecord(payload) && typeof payload.error === "string" ? payload.error : tCommon("error"))
      }
      const created = isRecord(payload) ? payload : {}
      onChosen({
        id: String(created.id),
        label: typeof created.name === "string" ? created.name : name.trim(),
        brandId: kind === "model" ? brandId : undefined,
        categoryId: kind === "model" ? categoryId : undefined,
      })
    } catch (saveError) {
      setError(saveError)
    } finally {
      setSaving(false)
    }
  }

  const title = kind === "brand" ? t("quickAdd.brandTitle") : t("quickAdd.modelTitle", { brand: brand?.label ?? "" })

  return (
    <AccessibleDialog open={open} title={title} busy={saving} size="sm" initialFocusRef={nameRef} onClose={onClose}>
      <AccessibleDialogBody className="grid gap-4">
        {error ? (
          <Notice tone="danger" role="alert">
            <ApiErrorText error={error} />
          </Notice>
        ) : null}
        <div className="grid gap-2">
          <Field label={kind === "brand" ? t("brandName") : t("modelName")} id={NAME_ID} required error={clash ? undefined : fieldErrors.message("name")}>
            <Input
              ref={nameRef}
              value={name}
              required
              maxLength={200}
              autoComplete="off"
              aria-invalid={clash ? true : undefined}
              aria-describedby={clash ? CLASH_ID : undefined}
              onChange={(event) => changeName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return
                event.preventDefault()
                void save()
              }}
            />
          </Field>
          {clash ? (
            <BrandModelClashNotice
              id={CLASH_ID}
              clash={clash}
              kind={kind}
              canReactivate={canReactivate}
              onUse={(existing) => void chooseExisting(existing)}
              onReactivate={reactivate}
            />
          ) : null}
        </div>
        {shownSimilar.length > 0 ? (
          <section aria-labelledby="brand-model-quick-add-similar" className="grid gap-2">
            <h3 id="brand-model-quick-add-similar" className="text-sm font-medium text-foreground">
              {t("quickAdd.similarHeading")}
            </h3>
            <ul className="divide-y divide-border-soft rounded-md border border-border">
              {shownSimilar.map((item) => (
                <li key={item.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate">
                    {item.name}
                    {item.isActive ? null : <span className="ml-2 text-meta text-muted-foreground">{t("quickAdd.inactive")}</span>}
                  </span>
                  {item.isActive ? (
                    <Button variant="outline" size="sm" disabled={saving} aria-label={`${t("quickAdd.useThis")} ${item.name}`} onClick={() => void chooseExisting(item)}>
                      {t("quickAdd.useThis")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel />
        <Button busy={saving} onClick={() => void save()}>
          {t("quickAdd.save")}
        </Button>
      </AccessibleDialogFooter>
    </AccessibleDialog>
  )
}
