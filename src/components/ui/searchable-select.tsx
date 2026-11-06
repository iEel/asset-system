"use client"

import { useId, useMemo, useState } from "react"
import { Check, ChevronDown, Plus, X } from "lucide-react"
import { Chip } from "@/components/ui/chip"
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field"
import { fieldControlVariants, triggerInvalidClasses, type FieldSize } from "@/components/ui/field-variants"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { filterSearchableOptions, type SearchableSelectOption } from "@/lib/searchable-select-filter"
import { cn } from "@/lib/utils"

export type { SearchableSelectOption } from "@/lib/searchable-select-filter"

// Page group 7 plan 1 Task 3 (spec §4.2): a picker that can add what is not in its list. The first shape ends the list
// with "label(query)" while isExactMatch(query) is false (the caller owns the rule, G7P1-R4); the second replaces the
// empty line with a hint saying why nothing can be added. Without createRow nothing changes.
export type SearchableSelectCreateRow =
  | { label: (query: string) => string; onCreate: (query: string) => void; isExactMatch: (query: string) => boolean }
  | { blockedHint: string }

// Not an option id: cmdk needs a value for the create item.
const CREATE_ROW_VALUE = "\u0000searchable-select-create"

// The popover is not modal, so inside a modal dialog or sheet it is portalled outside the dialog's scroll lock
// (react-remove-scroll), which cancels a wheel or touch scroll it sees from outside. Stopping the event at the popover
// keeps the list's own scroll; the page behind stays locked by the dialog.
function stopScrollLock(event: Event) {
  event.stopPropagation()
}

function keepOwnScroll(node: HTMLDivElement | null) {
  if (!node) return
  node.addEventListener("wheel", stopScrollLock, { passive: true })
  node.addEventListener("touchmove", stopScrollLock, { passive: true })
  return () => {
    node.removeEventListener("wheel", stopScrollLock)
    node.removeEventListener("touchmove", stopScrollLock)
  }
}

export function SearchableSelect({
  id,
  label,
  value,
  options,
  required,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  hint,
  error,
  fieldSize,
  currentValue,
  currentMark,
  labelVisuallyHidden,
  createRow,
  onSearchChange,
  onChange,
}: {
  id?: string
  label: string
  value: string
  options: SearchableSelectOption[]
  required?: boolean
  disabled?: boolean
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  clearLabel?: string
  hint?: React.ReactNode
  error?: React.ReactNode
  fieldSize?: FieldSize
  /** The id the record holds now (group 3 plan 3, P3-R11): with currentMark, that option shows the word after its label and is disabled, so it cannot be picked as a change. */
  currentValue?: string
  currentMark?: string
  /** The label stays the trigger's name but only screen readers get it, where a row name on screen already says it (โอนย้าย's table). */
  labelVisuallyHidden?: boolean
  createRow?: SearchableSelectCreateRow
  onSearchChange?: (query: string) => void
  onChange: (value: string) => void
}) {
  const generatedId = useId()
  const triggerId = id ?? `${generatedId}-trigger`
  const labelId = `${triggerId}-label`
  const valueId = `${triggerId}-value`
  const hintId = hint ? `${triggerId}-hint` : undefined
  const errorId = error ? `${triggerId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedOption = options.find((option) => option.id === value)
  const filteredOptions = useMemo(() => filterSearchableOptions(options, query), [options, query])
  const showClear = Boolean(value) && !required && !disabled
  const markCurrent = Boolean(currentValue && currentMark)
  const trimmedQuery = query.trim()
  const offerCreate = createRow && "onCreate" in createRow && trimmedQuery !== "" && !createRow.isExactMatch(query) ? createRow : null
  const blockedHint = createRow && "blockedHint" in createRow ? createRow.blockedHint : undefined

  function setOpenState(next: boolean) {
    setOpen(next)
    if (!next) setQuery("")
  }

  function updateQuery(next: string) {
    setQuery(next)
    onSearchChange?.(next)
  }

  function selectValue(nextValue: string) {
    onChange(nextValue)
    setOpenState(false)
  }

  function create() {
    if (!offerCreate) return
    const typed = trimmedQuery
    setOpenState(false)
    offerCreate.onCreate(typed)
  }

  return (
    <div className="grid min-w-0 max-w-full content-start gap-1.5">
      {label ? (
        <FieldLabel id={labelId} htmlFor={triggerId} required={required} visuallyHidden={labelVisuallyHidden}>
          {label}
        </FieldLabel>
      ) : null}
      <div className="relative min-w-0 max-w-full">
        {/* Not modal (the WAI-ARIA combobox): nothing outside is hidden from a screen reader while it stays focusable.
            Escape or a choice closes it and Radix returns focus to the trigger. */}
        <Popover modal={false} open={open && !disabled} onOpenChange={setOpenState}>
          <PopoverTrigger asChild>
            <button
              id={triggerId}
              type="button"
              disabled={disabled}
              data-invalid={error ? true : undefined}
              className={cn(
                fieldControlVariants({ fieldSize }),
                "flex cursor-pointer items-center justify-between gap-2 text-left aria-expanded:border-ring aria-expanded:ring-1 aria-expanded:ring-ring aria-expanded:shadow-field-focus",
                triggerInvalidClasses,
                showClear ? "pr-24 md:pr-20" : "pr-9",
              )}
              aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
              aria-label={label ? undefined : placeholder}
              aria-describedby={describedBy}
            >
              <span id={valueId} className={selectedOption ? "min-w-0 truncate" : "min-w-0 truncate text-faint-foreground"}>
                {selectedOption?.label ?? placeholder}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent ref={keepOwnScroll} align="start" className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0">
            <Command shouldFilter={false} loop defaultValue={value || undefined}>
              <CommandInput value={query} onValueChange={updateQuery} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
              {/* cmdk's list is always role="listbox": with no option it is hidden (its id stays for the input's
                  aria-controls) and the empty line sits outside it, so no listbox is ever empty. */}
              <CommandEmpty>{blockedHint ?? emptyLabel}</CommandEmpty>
              <CommandList className="max-h-64" hidden={filteredOptions.length === 0 && !offerCreate}>
                {filteredOptions.map((option, index) => {
                  const current = markCurrent && option.id === currentValue
                  // G7F-R3: a rich option shows a second muted line and a right-side chip, but its name stays the label
                  // (aria-labelledby) and the extras (and Task 4's aside) only describe it, so a screen reader and E2E find it by label.
                  const rich = Boolean(option.description || option.meta || option.aside)
                  const optionId = `${triggerId}-option-${index}`
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      disabled={option.disabled || current}
                      data-searchable-current={current || undefined}
                      aria-labelledby={rich ? `${optionId}-label` : undefined}
                      aria-describedby={rich ? [option.description ? `${optionId}-description` : null, option.meta ? `${optionId}-meta` : null, option.aside ? `${optionId}-aside` : null].filter(Boolean).join(" ") : undefined}
                      onSelect={() => selectValue(option.id)}
                      className={option.id === value ? "font-medium" : undefined}
                    >
                      {rich ? (
                        <span className="grid min-w-0 flex-1">
                          <span id={`${optionId}-label`} className={cn("min-w-0 truncate", option.description && "font-medium")}>{option.label}</span>
                          {option.description ? <span id={`${optionId}-description`} className="min-w-0 truncate text-meta text-muted-foreground">{option.description}</span> : null}
                        </span>
                      ) : (
                        <span className="min-w-0 truncate">{option.label}</span>
                      )}
                      {current ? <span className="shrink-0 text-meta text-muted-foreground">{currentMark}</span> : null}
                      {option.meta ? <Chip id={`${optionId}-meta`} className="shrink-0">{option.meta}</Chip> : null}
                      {option.aside ? <span id={`${optionId}-aside`} className="shrink-0 text-meta text-muted-foreground num">{option.aside}</span> : null}
                      {option.id === value ? <Check className="ml-auto size-4 text-primary" aria-hidden="true" /> : null}
                    </CommandItem>
                  )
                })}
                {offerCreate ? (
                  <CommandItem value={CREATE_ROW_VALUE} data-searchable-create="" onSelect={create} className="text-primary">
                    <Plus className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{offerCreate.label(trimmedQuery)}</span>
                  </CommandItem>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {showClear ? (
          <button
            type="button"
            onClick={() => selectValue("")}
            className="absolute inset-y-0 right-8 inline-flex min-h-11 w-11 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0 md:w-10"
            aria-label={clearLabel ?? placeholder}
            title={clearLabel ?? placeholder}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden="true" />
      </div>
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
