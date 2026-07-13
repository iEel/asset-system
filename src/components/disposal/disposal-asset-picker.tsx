"use client"

import { useEffect, useId, useState } from "react"
import { Check, Loader2, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
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
  const listboxId = useId()
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

  function toggle(option: DisposalAssetOption) {
    if (option.eligible === false) return
    if (selected.some((item) => item.id === option.id)) onChange(selected.filter((item) => item.id !== option.id))
    else if (max === 1) { onChange([option]); setQuery("") }
    else if (selected.length < max) onChange([...selected, option])
  }

  return <div className="min-w-0">
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-foreground">{label}<span className="ml-1 text-danger">*</span></span>{selectedCountLabel ? <span className="text-xs text-muted-foreground">{selectedCountLabel}</span> : null}</div>
    {max === 1 && selected[0] ? <div className="mt-2 flex min-h-11 items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 text-sm"><span className="min-w-0 break-words">{selected[0].label}</span><button type="button" onClick={() => onChange([])} aria-label={emptyLabel} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button></div> : null}
    {(max > 1 || selected.length === 0) ? <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} role="combobox" aria-expanded={options.length > 0} aria-controls={listboxId} className="min-h-11 w-full rounded-md border border-border bg-background pl-9 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />{loading ? <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-primary" /> : null}</div> : null}
    {query.trim().length >= 2 ? <div id={listboxId} role="listbox" className="mt-2 max-h-72 overflow-y-auto rounded-md border border-border bg-background">
      {options.length === 0 && !loading ? <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div> : options.map((option) => { const active = selected.some((item) => item.id === option.id); return <button key={option.id} type="button" role="option" aria-selected={active} disabled={!option.eligible} onClick={() => toggle(option)} className="flex min-h-11 w-full items-start gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground"><span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${active ? "border-primary bg-primary text-white" : "border-border"}`}>{active ? <Check className="h-3.5 w-3.5" /> : null}</span><span className="min-w-0"><span className="block break-words font-medium">{option.label}</span>{option.metadata ? <span className="mt-0.5 block text-xs text-muted-foreground">{option.metadata}</span> : null}{option.blockers && option.blockers.length > 0 ? <span className="mt-1 block text-xs font-medium text-danger">{option.blockers.map((blocker) => t(`readinessBlockers.${blocker}`)).join(" · ")}</span> : null}</span></button> })}
    </div> : null}
    {max > 1 && selected.length > 0 ? <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">{selected.map((asset) => <div key={asset.id} className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"><span className="min-w-0 break-words">{asset.label}</span><button type="button" onClick={() => toggle(asset)} aria-label={emptyLabel} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-danger hover:bg-danger/10"><X className="h-4 w-4" /></button></div>)}</div> : null}
  </div>
}
