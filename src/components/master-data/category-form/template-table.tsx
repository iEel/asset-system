"use client"

import { Fragment, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react"
import { duplicateCategoryCustomField, moveArrayItem, type CategoryCustomFieldDraft } from "@/lib/category-form-arrays"
import {
  countSavedFieldsWithValues,
  customFieldRenameWarning,
  isNewCustomField,
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
  // The rows whose options editor is open, by index: a remove, copy or move closes them all, as it clears the row errors.
  const [openOptions, setOpenOptions] = useState<ReadonlySet<number>>(new Set())
  const savedIds = useMemo(() => new Set(savedFields.flatMap((field) => (field.id ? [field.id] : []))), [savedFields])
  const savedNameById = useMemo(
    () => new Map(savedFields.flatMap((field) => (field.id ? [[field.id, field.fieldName] as const] : []))),
    [savedFields]
  )
  const savedWithValues = countSavedFieldsWithValues(savedFields.map((field) => field.fieldName), valueCounts)

  function updateField(index: number, field: keyof CategoryCustomFieldDraft, value: string | boolean) {
    onChange(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
    if (field in CUSTOM_FIELD_ID_SUFFIX) onFieldEdit(index, field as CustomFieldErrorField)
  }

  function removeField(index: number) {
    onChange(fields.filter((_, itemIndex) => itemIndex !== index))
    shiftRows()
  }

  function duplicateField(index: number) {
    const field = fields[index]
    if (!field) return
    onChange([...fields.slice(0, index + 1), duplicateCategoryCustomField(field), ...fields.slice(index + 1)])
    shiftRows()
  }

  function moveField(index: number, direction: -1 | 1) {
    onChange(moveArrayItem(fields, index, index + direction))
    shiftRows()
  }

  function shiftRows() {
    setOpenOptions(new Set())
    onRowsShift()
  }

  function toggleOptions(index: number) {
    setOpenOptions((open) => {
      const next = new Set(open)
      if (next.has(index)) next.delete(index)
      else next.add(index)
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
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[22%]" />
          <col />
          <col className="w-36" />
          <col className="w-16" />
          <col className="w-36" />
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
            const options = splitCustomFieldOptions(field.options)
            const optionsOpen = openOptions.has(index) || (field.fieldType === "select" && options.length === 0)
            const warning = customFieldRenameWarning(field, savedNameById, valueCounts)
            const isNew = isNewCustomField(field, savedIds)
            const hasSubRow = field.fieldType === "select" || warning
            return (
              <Fragment key={`${field.id ?? "new"}-${index}`}>
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
                                  onClick={() => toggleOptions(index)}
                                >
                                  {optionsOpen ? t("form.optionsDone") : t("form.optionsEdit")}
                                </Button>
                              ) : null}
                            </div>
                            {optionsOpen ? (
                              <Field label={t("fieldOptions")} id={`category-field-${index}-options`}>
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

function toFieldName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
}
