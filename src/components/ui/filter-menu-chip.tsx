"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { filterMenuChipJoin, filterMenuChipMatches, filterMenuChipText, type FilterMenuChipOption } from "@/lib/filter-menu-chip"
import { cn } from "@/lib/utils"

export type { FilterMenuChipOption } from "@/lib/filter-menu-chip"

type ChipBase = {
  // The filter's name: the start of the chip's text and the name of its menu, for example "บริษัท".
  label: string
  // Draws the chip as an applied filter. Default: a value other than "" (the "ทั้งหมด" option) for the option
  // variants, false for custom content.
  active?: boolean
  // On the chip, for layout only.
  className?: string
}

type OptionChipProps = ChipBase & {
  // Menu labels read "code - name" (spec §5); the closed chip shows the option's name.
  options: readonly FilterMenuChipOption[]
  value: string
  onValueChange: (value: string) => void
  valueText?: never
  children?: never
}

type MenuChipProps = OptionChipProps & { searchable?: false; searchPlaceholder?: never; emptyLabel?: never }

// A long list (rooms): a Popover with a search box over the options instead of a menu.
type SearchChipProps = OptionChipProps & { searchable: true; searchPlaceholder: string; emptyLabel: string }

// The caller's own content (the date range of "สร้างเมื่อ"). open and onOpenChange let it close the chip on apply.
type CustomChipProps = ChipBase & {
  valueText: string
  // valueText is the chip's whole text, not the part after "<filter>: ": a message that names the filter itself, such
  // as the repair list's "ช่วงวันที่" and "ช่วงวันที่: {from} – {to}".
  wholeText?: boolean
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  options?: never
  searchable?: never
}

export type FilterMenuChipProps = MenuChipProps | SearchChipProps | CustomChipProps

// Board AR-Labels .fchip: a pill, 32px from md (44px below), with the filter's name, the chosen value and a chevron.
// An applied filter looks like FilterChipList's applied chip; an idle one is a plain outlined chip. No font weight in
// the shared classes, so font-medium and font-semibold never sit in one class list.
const chipClasses =
  "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-3 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0"
const chipActiveClasses = "border-primary-border bg-primary-soft font-semibold text-primary-hover"
const chipIdleClasses = "border-border bg-surface font-medium text-foreground hover:bg-background"

// The one trigger of the three variants. Radix's Trigger (asChild) adds aria-haspopup ("menu" or "dialog"),
// aria-expanded, the open state and the keyboard (Enter, Space, ArrowDown open; Escape closes and returns focus here).
// The visible text is the button's name: "บริษัท: ทั้งหมด". The Trigger also hands down its own data-slot
// ("popover-trigger", "dropdown-menu-trigger"), so the part's marker comes after the spread (E2E-1103A).
function ChipButton({ text, active, className, ...props }: React.ComponentProps<"button"> & { text: string; active: boolean }) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      className={cn(chipClasses, active ? chipActiveClasses : chipIdleClasses, className)}
      {...props}
      data-slot="filter-menu-chip"
    >
      <span className="min-w-0 truncate">{text}</span>
      <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
    </button>
  )
}

// A filter chip with its menu (P6-R4): FilterChipList renders remove links only, so a client filter that picks one
// value uses this. Options are radio items in the app's DropdownMenu; `searchable` opens a Popover with a search box
// (rooms); custom content opens a Popover with the caller's children (the date range).
export function FilterMenuChip(props: FilterMenuChipProps) {
  if (props.options === undefined) return <CustomChip {...props} />
  if (props.searchable) return <SearchChip {...props} />
  return <MenuChip {...props} />
}

function MenuChip({ label, options, value, onValueChange, active: activeProp, className }: MenuChipProps) {
  const text = filterMenuChipText(label, options, value)
  const active = activeProp ?? value !== ""
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ChipButton text={text} active={active} className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <span className="min-w-0 truncate">{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SearchChip({ label, options, value, onValueChange, searchPlaceholder, emptyLabel, active: activeProp, className }: SearchChipProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const matches = useMemo(() => filterMenuChipMatches(options, query), [options, query])
  const text = filterMenuChipText(label, options, value)
  const active = activeProp ?? value !== ""

  function setOpenState(next: boolean) {
    setOpen(next)
    if (!next) setQuery("")
  }

  function choose(next: string) {
    onValueChange(next)
    setOpenState(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <ChipButton text={text} active={active} className={className} />
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} className="w-80 max-w-[calc(100vw-2rem)] p-0">
        {/* cmdk: the search box keeps focus, arrow keys move through the options (loop), Enter chooses. */}
        {/* No cmdk label: its hidden <label> would name the search box ("ที่ตั้ง") through aria-labelledby over the
            placeholder's aria-label. The dialog is named by PopoverContent's aria-label (final review). */}
        <Command shouldFilter={false} loop>
          <CommandInput value={query} onValueChange={setQuery} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          {/* With no option the list is hidden and the empty line sits outside it, so no listbox is ever empty. */}
          <CommandEmpty>{emptyLabel}</CommandEmpty>
          <CommandList className="max-h-64" hidden={matches.length === 0}>
            {matches.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value || "__all__"}
                onSelect={() => choose(option.value)}
                className={option.value === value ? "font-medium" : undefined}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === value ? <Check className="ml-auto size-4 text-primary" aria-hidden="true" /> : null}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function CustomChip({ label, valueText, wholeText, children, open, onOpenChange, active = false, className }: CustomChipProps) {
  const text = wholeText ? valueText : filterMenuChipJoin(label, valueText)
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <ChipButton text={text} active={active} className={className} />
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} className="w-80 max-w-[calc(100vw-2rem)]">
        {children}
      </PopoverContent>
    </Popover>
  )
}
