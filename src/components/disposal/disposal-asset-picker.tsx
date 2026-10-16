"use client"

import { useEffect, useId, useState } from "react"
import { Check, Loader2, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { DisposalReadinessBlocker } from "@/lib/disposal-readiness"

export type DisposalAssetOption = {
  id: string
  label: string
  metadata?: string
  eligible?: boolean
  blockers?: Array<DisposalReadinessBlocker | "lifecycle_status">
}

export function DisposalAssetPicker({ label, selected, onChange, max = 1, searchPlaceholder, emptyLabel, selectedCountLabel }: { label: string; selected: DisposalAssetOption[]; onChange: (assets: DisposalAssetOption[]) => void; max?: number; searchPlaceholder: string; emptyLabel: string; selectedCountLabel?: string }) {
  const t = useTranslations("disposalPage")
  const tAssetTools = useTranslations("assetTools")
  const listboxId = useId()
  const inputId = useId()
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<{ query: string; options: DisposalAssetOption[] }>({ query: "", options: [] })
  const [loadingQuery, setLoadingQuery] = useState("")
  const normalizedQuery = query.trim()
  const options = result.query === normalizedQuery ? result.options : []
  const loading = loadingQuery === normalizedQuery && normalizedQuery.length >= 2

  useEffect(() => {
    const normalized = query.trim()
    if (normalized.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoadingQuery(normalized)
      try {
        const response = await fetch(`/api/disposal-assets?q=${encodeURIComponent(normalized)}`, { signal: controller.signal })
        const payload = await response.json().catch(() => null)
        if (response.ok) setResult({ query: normalized, options: payload?.data ?? [] })
        else setResult({ query: normalized, options: [] })
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResult({ query: normalized, options: [] })
        }
      } finally {
        if (!controller.signal.aborted) setLoadingQuery("")
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query])

  const showSearch = max > 1 || selected.length === 0

  function toggle(option: DisposalAssetOption) {
    if (option.eligible === false) return
    if (selected.some((item) => item.id === option.id)) onChange(selected.filter((item) => item.id !== option.id))
    else if (max === 1) { onChange([option]); setQuery("") }
    else if (selected.length < max) onChange([...selected, option])
  }

  return <div className="min-w-0">
    <div className="flex items-center justify-between gap-3"><FieldLabel htmlFor={showSearch ? inputId : undefined} required>{label}</FieldLabel>{selectedCountLabel ? <span className="text-meta text-muted-foreground">{selectedCountLabel}</span> : null}</div>
    {max === 1 && selected[0] ? <div className="mt-2 flex min-h-11 items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-soft px-3 text-sm"><span className="min-w-0 break-words">{selected[0].label}</span><Button variant="outline" size="icon-sm" onClick={() => onChange([])} aria-label={`${tAssetTools("removeSelectedAsset")}: ${selected[0].label}`}><X aria-hidden="true" /></Button></div> : null}
    {showSearch ? <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden="true" /><Input id={inputId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} role="combobox" aria-expanded={options.length > 0} aria-controls={listboxId} className="pl-9 pr-10" />{loading ? <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" /> : null}</div> : null}
    {query.trim().length >= 2 ? <div id={listboxId} role="listbox" className="mt-2 max-h-72 overflow-y-auto rounded-md border border-border bg-background">
      {/* The options stay raw buttons: a listbox option with its own check box and two lines, which Button cannot hold (plan 2D-4 R5). */}
      {options.length === 0 && !loading ? <EmptyNote className="px-3 py-4">{emptyLabel}</EmptyNote> : options.map((option) => { const active = selected.some((item) => item.id === option.id); return <button key={option.id} type="button" role="option" aria-selected={active} disabled={!option.eligible} onClick={() => toggle(option)} className="flex min-h-11 w-full items-start gap-3 border-b border-border-soft px-3 py-2 text-left text-sm last:border-b-0 hover:bg-row-hover disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-foreground"><span aria-hidden="true" className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border-[1.5px]", active ? "border-primary bg-primary" : option.eligible ? "border-input bg-surface" : "border-border bg-background")}>{active ? <Check strokeWidth={3} className="size-3 text-primary-foreground" /> : null}</span><span className="min-w-0"><span className="block break-words font-medium">{option.label}</span>{option.metadata ? <span className="mt-0.5 block text-meta text-muted-foreground">{option.metadata}</span> : null}{option.blockers && option.blockers.length > 0 ? <span className="mt-1 block text-meta font-medium text-danger">{option.blockers.map((blocker) => t(`readinessBlockers.${blocker}`)).join(" · ")}</span> : null}</span></button> })}
    </div> : null}
    {max > 1 && selected.length > 0 ? <div className="mt-3 max-h-56 divide-y divide-border-soft overflow-y-auto rounded-md border border-border">{selected.map((asset) => <div key={asset.id} className="flex min-h-11 items-center justify-between gap-2 px-3 py-2 text-sm"><span className="min-w-0 break-words">{asset.label}</span><Button variant="outline" size="icon-sm" onClick={() => toggle(asset)} aria-label={`${tAssetTools("removeSelectedAsset")}: ${asset.label}`}><X aria-hidden="true" /></Button></div>)}</div> : null}
  </div>
}
