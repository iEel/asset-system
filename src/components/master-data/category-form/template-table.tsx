"use client"

import { Fragment, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react"
import { duplicateCategoryCustomField, moveArrayItem, type CategoryCustomFieldDraft } from "@/lib/category-form-arrays"
import {
  countSavedFieldsWithValues,
  customFieldRenameWarning,
  isNewCustomField,
  isOptionsEditorOpen,
  keepsOptionsEditorOpen,
  splitCustomFieldOptions,
} from "@/lib/category-custom-field-names"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldRequiredMark } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { RowActions } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { focusField, waitForDialogToClose } from "@/lib/field-focus"

// The row fields whose errors show under them, keyed like the server's dotted paths (customFieldDefs.0.fieldName), with
// the id suffix focus moves to (v-track M-R1). The form's fieldOrder and fieldId read it.
export const CUSTOM_FIELD_ID_SUFFIX = { fieldName: "name", fieldLabel: "label", fieldLabelTh: "label-th" } as const
export type CustomFieldErrorField = keyof typeof CUSTOM_FIELD_ID_SUFFIX

const FIELD_TYPES = ["text", "number", "select", "date", "boolean"] as const
const TYPE_LABEL_KEYS = {
  text: "fieldTypeText",
  number: "fieldTypeNumber",
  select: "fieldTypeSelect",
  date: "fieldTypeDate",
  boolean: "fieldTypeBoolean",
} as const

// Section 2's compact table (board MD-Category-Edit): ชื่อ field, ป้ายชื่อ, ป้ายชื่อภาษาไทย, ชนิดข้อมูล (all five types),
// จำเป็น, then ขึ้น/ลง and ⋯ (ทำซ้ำ, ลบ). A รายการเลือก row shows its options as chips under it with แก้ตัวเลือก; a row
// not in the saved definition carries ใหม่ (G8P2-R2); a saved field renamed while its saved name holds values in the
// category's assets shows the warning under its row (G8P2-R1). Errors stay under each cell, index-keyed.
export function CustomFieldTemplateTable({
  fields,
  savedFields,
  valueCounts,
  onChange,
  errorFor,
  onFieldEdit,
  onRowsShift,
}: {
  fields: CategoryCustomFieldDraft[]
  // The definition the page loaded (empty on create): the identity behind ใหม่ and the saved names behind the warning.
  savedFields: readonly CategoryCustomFieldDraft[]
  valueCounts: Readonly<Record<string, number>>
  onChange: (fields: CategoryCustomFieldDraft[]) => void
  errorFor: (index: number, field: CustomFieldErrorField) => string | undefined
  onFieldEdit: (index: number, field: CustomFieldErrorField) => void
  onRowsShift: () => void
}) {
  const t = useTranslations("category")
  const tCommon = useTranslations("common")
  // One stable key per row (the saved id, else a client key), moved with its row: a move, copy or remove keeps the other
  // rows and their focused controls mounted (final review fix 5). The form appends rows (เพิ่มช่องข้อมูล), so a longer
  // list gets keys for its new rows here, during render, as React's "adjusting state on a prop change" pattern.
  const [rowKeys, setRowKeys] = useState<readonly string[]>(() => fields.map(rowKeyFor))
  let keys = rowKeys
  if (keys.length !== fields.length) {
    keys = keys.length < fields.length ? [...keys, ...fields.slice(keys.length).map(rowKeyFor)] : keys.slice(0, fields.length)
    setRowKeys(keys)
  }
  // The rows whose options editor is open, by row key. An empty รายการเลือก opens its editor by itself; typing in it or
  // choosing รายการเลือก adds the row here, so the editor stays open once its first option exists (final review fix 4).
  const [openOptions, setOpenOptions] = useState<ReadonlySet<string>>(new Set())
  const savedIds = useMemo(() => new Set(savedFields.flatMap((field) => (field.id ? [field.id] : []))), [savedFields])
  const savedNameById = useMemo(
    () => new Map(savedFields.flatMap((field) => (field.id ? [[field.id, field.fieldName] as const] : []))),
    [savedFields]
  )
  const savedWithValues = countSavedFieldsWithValues(savedFields.map((field) => field.fieldName), valueCounts)

  function updateField(index: number, field: keyof CategoryCustomFieldDraft, value: string | boolean) {
    onChange(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
    if (field in CUSTOM_FIELD_ID_SUFFIX) onFieldEdit(index, field as CustomFieldErrorField)
    if (keepsOptionsEditorOpen(field, value)) keepOptionsOpen(keys[index])
  }

  // ลบ: focus moves to the next row's ⋯, else to เพิ่มช่องข้อมูล (the row and its menu are gone).
  function removeField(index: number) {
    onChange(fields.filter((_, itemIndex) => itemIndex !== index))
    setRowKeys(keys.filter((_, keyIndex) => keyIndex !== index))
    onRowsShift()
    focusAfterRowChange(() => (index < fields.length - 1 ? rowMenuButton(index) : document.getElementById(ADD_CUSTOM_FIELD_ID)))
  }

  // ทำซ้ำ: focus moves to the copy's ชื่อ field.
  function duplicateField(index: number) {
    const field = fields[index]
    if (!field) return
    onChange([...fields.slice(0, index + 1), duplicateCategoryCustomField(field), ...fields.slice(index + 1)])
    setRowKeys([...keys.slice(0, index + 1), newRowKey(), ...keys.slice(index + 1)])
    onRowsShift()
    focusAfterRowChange(() => document.getElementById(`category-field-${index + 1}-name`))
  }

  // ขึ้น/ลง: the row keeps its key, and focus stays on the pressed arrow at the row's new place, or on the other arrow
  // once the row reaches the top or the bottom (the pressed one is disabled there).
  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction
    onChange(moveArrayItem(fields, index, target))
    setRowKeys(moveArrayItem([...keys], index, target))
    onRowsShift()
    const pressed = direction === -1 ? "up" : "down"
    const other = direction === -1 ? "down" : "up"
    focusAfterRowChange(() => rowMoveButton(target, pressed) ?? rowMoveButton(target, other))
  }

  function keepOptionsOpen(key: string | undefined) {
    if (!key || openOptions.has(key)) return
    setOpenOptions((open) => new Set(open).add(key))
  }

  function toggleOptions(key: string) {
    setOpenOptions((open) => {
      const next = new Set(open)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (fields.length === 0) {
    return <EmptyNote padded>{t("customFieldTemplateEmpty")}</EmptyNote>
  }

  const cell = (column: string, row: number) => t("form.cellLabel", { column, row })

  return (
    <>
      <DataTable
        framed={false}
        layout="fixed"
        minWidth={720}
        caption={t("form.templateCaption", { count: fields.length })}
        scrollHint={tCommon("tableScrollHint")}
      >
        {/* ชื่อ field, ป้ายชื่อ and ป้ายชื่อภาษาไทย share what is left equally (no width): at 1440 beside the side panel
            each input is ~140px, enough for a 12-character Thai label (อยู่ในประกัน); ชนิดข้อมูล keeps room for รายการเลือก,
            จำเป็น and the row buttons take their content's width (look step 2026-11-07). */}
        <colgroup>
          <col data-template-col="name" />
          <col data-template-col="label" />
          <col data-template-col="label-th" />
          <col className="w-36" />
          <col className="w-14" />
          <col className="w-32" />
        </colgroup>
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("fieldName")}<FieldRequiredMark /></DataTableHead>
            <DataTableHead>{t("fieldLabel")}<FieldRequiredMark /></DataTableHead>
            <DataTableHead>{t("fieldLabelTh")}</DataTableHead>
            <DataTableHead>{t("fieldType")}</DataTableHead>
            <DataTableHead className="text-center">{t("form.requiredColumn")}</DataTableHead>
            <DataTableHead hideLabel>{t("form.rowActionsColumn")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {fields.map((field, index) => {
            const row = index + 1
            const name = field.fieldLabelTh?.trim() || field.fieldLabel.trim() || field.fieldName.trim() || t("form.rowName", { row })
            const rowKey = keys[index] ?? `row-at-${index}`
            const options = splitCustomFieldOptions(field.options)
            const optionsOpen = isOptionsEditorOpen(openOptions, rowKey, field)
            const warning = customFieldRenameWarning(field, savedNameById, valueCounts)
            const isNew = isNewCustomField(field, savedIds)
            const hasSubRow = field.fieldType === "select" || warning
            // The visible hint, then the field's name for a screen reader, so each row's editor has its own name.
            const optionsLabel = (
              <>
                {t("fieldOptions")}
                <span className="sr-only"> {t("form.optionsOfField", { name })}</span>
              </>
            )
            return (
              <Fragment key={rowKey}>
                <DataTableRow data-category-field-row={index} className={hasSubRow ? "[&>td]:border-b-0" : undefined}>
                  <DataTableCell className="px-1.5">
                    <Field label={cell(t("fieldName"), row)} hideLabel id={`category-field-${index}-name`} required error={errorFor(index, "fieldName")}>
                      <Input
                        value={field.fieldName}
                        onChange={(event) => updateField(index, "fieldName", toFieldName(event.target.value))}
                        maxLength={100}
                        required
                        fieldSize="md"
                        placeholder="cpu"
                        className="font-mono"
                      />
                    </Field>
                  </DataTableCell>
                  <DataTableCell className="px-1.5">
                    <Field label={cell(t("fieldLabel"), row)} hideLabel id={`category-field-${index}-label`} required error={errorFor(index, "fieldLabel")}>
                      <Input
                        value={field.fieldLabel}
                        onChange={(event) => updateField(index, "fieldLabel", event.target.value)}
                        maxLength={200}
                        required
                        fieldSize="md"
                        placeholder="CPU"
                      />
                    </Field>
                  </DataTableCell>
                  <DataTableCell className="px-1.5">
                    <Field label={cell(t("fieldLabelTh"), row)} hideLabel id={`category-field-${index}-label-th`} error={errorFor(index, "fieldLabelTh")}>
                      <Input
                        value={field.fieldLabelTh ?? ""}
                        onChange={(event) => updateField(index, "fieldLabelTh", event.target.value)}
                        maxLength={200}
                        fieldSize="md"
                      />
                    </Field>
                  </DataTableCell>
                  <DataTableCell className="px-1.5">
                    <Field label={cell(t("fieldType"), row)} hideLabel id={`category-field-${index}-type`}>
                      <NativeSelect value={field.fieldType} fieldSize="md" onChange={(event) => updateField(index, "fieldType", event.target.value)}>
                        {FIELD_TYPES.map((type) => (
                          <option key={type} value={type}>{t(TYPE_LABEL_KEYS[type])}</option>
                        ))}
                      </NativeSelect>
                    </Field>
                  </DataTableCell>
                  <DataTableCell className="px-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={field.isRequired}
                      onChange={(event) => updateField(index, "isRequired", event.target.checked)}
                      aria-label={cell(t("fieldRequired"), row)}
                      className={checkboxVariants()}
                    />
                  </DataTableCell>
                  <DataTableCell className="px-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                        data-field-move="up"
                        aria-label={t("form.moveFieldUp", { name })}
                        title={t("form.moveFieldUp", { name })}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => moveField(index, 1)}
                        disabled={index === fields.length - 1}
                        data-field-move="down"
                        aria-label={t("form.moveFieldDown", { name })}
                        title={t("form.moveFieldDown", { name })}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <RowActions
                        code={name}
                        menuLabel={t("form.fieldMenu", { name })}
                        triggerVariant="outline"
                        groups={[
                          {
                            key: "row",
                            items: [
                              { kind: "action", key: "duplicate", label: t("duplicateItem"), icon: <Copy aria-hidden="true" />, onSelect: () => duplicateField(index) },
                              { kind: "action", key: "remove", label: t("removeCustomField"), icon: <Trash2 aria-hidden="true" />, destructive: true, onSelect: () => removeField(index) },
                            ],
                          },
                        ]}
                      />
                      {isNew ? <StatusBadge tone="info" label={t("form.newBadge")} /> : null}
                    </div>
                  </DataTableCell>
                </DataTableRow>
                {hasSubRow ? (
                  <tr data-category-field-detail={index}>
                    <td colSpan={6} className="border-b border-border-soft px-3 pb-3 md:px-4">
                      <div className="grid gap-2">
                        {field.fieldType === "select" ? (
                          <div className="grid gap-2 rounded-md bg-background px-3 py-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="shrink-0 text-meta text-muted-foreground">{t("form.optionsLabel")}</span>
                              {options.length > 0 ? (
                                <span className="flex min-w-0 flex-wrap gap-1.5">
                                  {options.map((option, optionIndex) => (
                                    <Chip key={`${optionIndex}-${option}`} title={option}>{option}</Chip>
                                  ))}
                                </span>
                              ) : (
                                <span className="text-meta text-faint-foreground">{t("form.optionsEmpty")}</span>
                              )}
                              {options.length > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto text-primary"
                                  aria-expanded={optionsOpen}
                                  aria-controls={`category-field-${index}-options`}
                                  aria-label={optionsOpen ? t("form.optionsDoneFor", { name }) : t("form.optionsEditFor", { name })}
                                  onClick={() => toggleOptions(rowKey)}
                                >
                                  {optionsOpen ? t("form.optionsDone") : t("form.optionsEdit")}
                                </Button>
                              ) : null}
                            </div>
                            {optionsOpen ? (
                              <Field label={optionsLabel} id={`category-field-${index}-options`}>
                                <Textarea
                                  value={field.options ?? ""}
                                  onChange={(event) => updateField(index, "options", event.target.value)}
                                  rows={3}
                                  placeholder="Windows 11&#10;Windows 10&#10;macOS"
                                />
                              </Field>
                            ) : null}
                          </div>
                        ) : null}
                        {warning ? (
                          <p data-category-rename-warning={index} className="flex items-start gap-2 text-meta text-muted-foreground">
                            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                            <span className="min-w-0">
                              {t.rich("form.renameWarning", {
                                name: warning.savedName,
                                count: warning.count,
                                mono: (chunks) => <span className="tag text-foreground">{chunks}</span>,
                              })}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </DataTableBody>
      </DataTable>
      <p className="px-4 pt-1 pb-4 text-meta text-faint-foreground md:px-5">
        {t("form.fieldNameRule")}
        {savedWithValues > 0 ? <> · {t("form.savedValuesNote", { count: savedWithValues })}</> : null}
      </p>
    </>
  )
}

export function createCustomFieldDefinition(sortOrder: number): CategoryCustomFieldDraft {
  return {
    fieldName: "",
    fieldLabel: "",
    fieldLabelTh: "",
    fieldType: "text",
    options: "",
    isRequired: false,
    sortOrder,
    isActive: true,
  }
}

// เพิ่มช่องข้อมูล in the section head (category-form.tsx): where focus goes after the last row is removed.
export const ADD_CUSTOM_FIELD_ID = "category-add-custom-field"

let lastRowKey = 0
function newRowKey() {
  lastRowKey += 1
  return `new-${lastRowKey}`
}

function rowKeyFor(field: CategoryCustomFieldDraft) {
  return field.id ? `saved-${field.id}` : newRowKey()
}

function rowMenuButton(index: number) {
  return document.querySelector<HTMLElement>(`[data-category-field-row="${index}"] [data-slot="row-actions"] button`)
}

function rowMoveButton(index: number, which: "up" | "down") {
  return document.querySelector<HTMLElement>(`[data-category-field-row="${index}"] [data-field-move="${which}"]:not([disabled])`)
}

// ทำซ้ำ and ลบ run from ⋯, an "action" item: RowActions keeps the closing menu or phone sheet from handing focus back,
// as it would for a dialog, so focus is placed here on purpose once the sheet has closed and the rows have re-rendered.
// ขึ้น/ลง use it too: React may move the pressed row's DOM node, which drops its focus.
function focusAfterRowChange(find: () => HTMLElement | null) {
  void waitForDialogToClose().then(() => {
    requestAnimationFrame(() => {
      const target = find()
      if (target) focusField(target)
    })
  })
}

function toFieldName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
}
