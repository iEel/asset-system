"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ListChecks } from "lucide-react"
import {
  DISPOSAL_ROUND_SELECTION_MAX,
  disposalRoundSelectionStorageKey,
  parseStoredRoundSelection,
  restoreRoundSelection,
  selectAllRound,
  toggleRoundSelection,
  type StoredRoundSelection,
} from "@/lib/disposal-round-selection"
import { formatCount } from "@/lib/display-format"
import { Button } from "@/components/ui/button"
import { DesktopSelectionBar } from "@/components/ui/desktop-selection-bar"
import { checkboxVariants } from "@/components/ui/field-variants"

/**
 * The words of the selection, built by the page from the `disposalPage.queue` messages with `t.raw`: the templates keep
 * their {placeholders}, filled here with formatCount.
 */
export type DisposalRoundSelectionCopy = {
  barLabel: string
  /** {count} */
  count: string
  clear: string
  /** {count} */
  selectAll: string
  /** {count} */
  create: string
  limit: string
  /** {count} */
  capped: string
}

function fill(template: string, values: Record<string, number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (values[key] === undefined ? `{${key}}` : formatCount(values[key])))
}

// sessionStorage can be missing or blocked (a private window, a cleared site): that is "no selection", never an error.
function readStorage(): string | null {
  try {
    return window.sessionStorage.getItem(disposalRoundSelectionStorageKey)
  } catch {
    return null
  }
}

function writeSelection(selection: StoredRoundSelection | null) {
  try {
    if (selection) window.sessionStorage.setItem(disposalRoundSelectionStorageKey, JSON.stringify(selection))
    else window.sessionStorage.removeItem(disposalRoundSelectionStorageKey)
  } catch {
    // Storage blocked: the selection lives for this page only.
  }
}

type SelectionContextValue = {
  copy: DisposalRoundSelectionCopy
  tickable: string[]
  selection: StoredRoundSelection | null
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  selectAll: () => void
  clear: () => void
  create: () => void
  /** One line for the bar: the limit or the cap. */
  status: string | null
  /** The cap line when the control above the table selected with nothing ticked (the bar mounts with that click). */
  topStatus: string | null
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

function useSelection() {
  const context = useContext(SelectionContext)
  if (!context) throw new Error("Disposal round ticks and the selection bar must be rendered within DisposalRoundSelectionProvider")
  return context
}

/**
 * The approved tab's selection (group 6 spec §10.2, P4-R2), mirroring the inbox's (approval-inbox-selection.tsx): up to
 * 200, kept in sessionStorage across pages and restored against the list now shown (scope: the search, type and request
 * dates; tickable: every tickable request of the filtered tab, all pages). "สร้างรอบตัดจำหน่าย" leaves the ids in
 * `disposal-round-selection` and opens the round page, which reads them there.
 */
export function DisposalRoundSelectionProvider({
  scope,
  tickable,
  createHref,
  copy,
  children,
}: {
  scope: string
  tickable: string[]
  createHref: string
  copy: DisposalRoundSelectionCopy
  children: ReactNode
}) {
  const router = useRouter()
  const [selection, setSelection] = useState<StoredRoundSelection | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [topStatus, setTopStatus] = useState<string | null>(null)
  // The server sends a new array on every render; the restore runs when the ids change, not on each identity.
  const tickableKey = JSON.stringify(tickable)

  /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage is read after mount: the server render has none. */
  useEffect(() => {
    const restored = restoreRoundSelection(parseStoredRoundSelection(readStorage()), scope, JSON.parse(tickableKey) as string[])
    writeSelection(restored)
    setSelection(restored)
    setStatus(null)
    setTopStatus(null)
  }, [scope, tickableKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  function update(next: StoredRoundSelection | null) {
    writeSelection(next)
    setSelection(next)
  }

  const value: SelectionContextValue = {
    copy,
    tickable,
    selection,
    isSelected: (id) => selection?.ids.includes(id) ?? false,
    toggle: (id) => {
      const result = toggleRoundSelection(selection, id, scope)
      update(result.next)
      setTopStatus(null)
      setStatus(result.refused === "limit" ? copy.limit : null)
    },
    selectAll: () => {
      if (tickable.length === 0) return
      const barShown = selection !== null
      const result = selectAllRound(tickable, scope)
      const line = result.capped ? fill(copy.capped, { count: result.next.ids.length }) : null
      update(result.next)
      setStatus(line)
      setTopStatus(barShown ? null : line)
    },
    clear: () => {
      update(null)
      setStatus(null)
      setTopStatus(null)
    },
    create: () => {
      if (!selection) return
      writeSelection(selection)
      router.push(createHref)
    },
    status,
    topStatus,
  }

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

/** A row's tick in the first column: from md only; a blocked row's is disabled with its reason as the title. */
export function DisposalRoundTick({ id, label, disabled = false, reason }: { id: string; label: string; disabled?: boolean; reason?: string }) {
  const selection = useSelection()
  return (
    // ClickableTableRow skips clicks on the input but not on its label: data-no-row-click keeps a click beside the box
    // from opening the request.
    <label data-no-row-click title={disabled ? reason : undefined} className={`hidden min-h-11 w-11 items-center justify-center md:flex ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        data-disposal-round-tick={id}
        checked={!disabled && selection.isSelected(id)}
        onChange={() => selection.toggle(id)}
        disabled={disabled}
        aria-label={disabled && reason ? `${label} (${reason})` : label}
        title={disabled ? reason : undefined}
        className={checkboxVariants()}
      />
    </label>
  )
}

/** "เลือกทั้ง {n} รายการที่เลือกได้" above the table: from md, while the tab has tickable rows; picks the first 200. */
export function DisposalRoundSelectAll() {
  const { copy, selection, tickable, topStatus, selectAll } = useSelection()
  if (tickable.length === 0) return null
  const allSelected = (selection?.ids.length ?? 0) >= Math.min(tickable.length, DISPOSAL_ROUND_SELECTION_MAX)
  return (
    <div data-disposal-round-select-all className="hidden min-w-0 flex-wrap items-center gap-x-3 gap-y-1 md:flex">
      <Button variant="outline" size="md" onClick={selectAll} disabled={allSelected}>
        <ListChecks aria-hidden="true" />
        {fill(copy.selectAll, { count: tickable.length })}
      </Button>
      <p role="status" className={topStatus ? "text-meta text-muted-foreground" : "sr-only"}>{topStatus}</p>
    </div>
  )
}

/** The bar under the list while something is ticked (spec §10.2): from md only, sticky, counted across pages. */
export function DisposalRoundSelectionBar() {
  const { copy, selection, tickable, status, clear, selectAll, create } = useSelection()
  if (!selection) return null
  const count = selection.ids.length
  const allSelected = count >= Math.min(tickable.length, DISPOSAL_ROUND_SELECTION_MAX)
  return (
    <DesktopSelectionBar
      label={copy.barLabel}
      countLabel={fill(copy.count, { count })}
      clearLabel={copy.clear}
      onClear={clear}
      actions={
        <>
          <Button variant="outline" size="md" onClick={selectAll} disabled={allSelected}>
            <ListChecks aria-hidden="true" />
            {fill(copy.selectAll, { count: tickable.length })}
          </Button>
          <Button size="md" onClick={create} data-disposal-round-create>
            {fill(copy.create, { count })}
            <ArrowRight aria-hidden="true" />
          </Button>
        </>
      }
      status={status}
    />
  )
}
