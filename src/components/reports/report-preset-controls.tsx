"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { BookmarkPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { cn } from "@/lib/utils"
import {
  buildReportPreset,
  buildReportPresetHref,
  persistReportPresets,
  reportPresetStorageKey,
  type ReportPreset,
} from "@/lib/report-presets"

const emptyReportPresets: ReportPreset[] = []
let cachedReportPresetRaw: string | null | undefined
let cachedReportPresets = emptyReportPresets

type ReportPresetControlsProps = {
  locale: string
  currentQuery: string
  labels: {
    presetName: string
    saveCurrentPreset: string
    savedPresetsEmpty: string
    savedPresetsDeviceOnly: string
    deletePreset: string
    presetNameRequired: string
    presetStorageFailed: string
  }
}

export function ReportPresetControls({ locale, currentQuery, labels }: ReportPresetControlsProps) {
  const presets = useSyncExternalStore(subscribeToReportPresets, readReportPresets, getServerReportPresets)
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")

  function persist(next: ReportPreset[]) {
    if (!persistReportPresets(() => window.localStorage, next)) {
      setMessage(labels.presetStorageFailed)
      return false
    }
    window.dispatchEvent(new Event(reportPresetStorageKey))
    return true
  }

  function savePreset() {
    const preset = buildReportPreset({
      id: globalThis.crypto?.randomUUID?.() ?? `preset-${Date.now()}`,
      name,
      query: currentQuery,
    })

    if (!preset) {
      setMessage(labels.presetNameRequired)
      return
    }

    if (!persist([preset, ...presets])) return
    setName("")
    setMessage("")
  }

  function deletePreset(id: string) {
    if (persist(presets.filter((preset) => preset.id !== id))) setMessage("")
  }

  // It sits in the catalog's ContentPanel, so it has no frame of its own (D9). The save button shares a row with the
  // 40px name field, so it is lg (D3, D5); a preset row's delete icon is neutral at rest (K22).
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label={labels.presetName} className="min-w-0 flex-1">
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setMessage("")
            }}
            maxLength={60}
          />
        </Field>
        <Button size="lg" onClick={savePreset}>
          <BookmarkPlus aria-hidden="true" />
          {labels.saveCurrentPreset}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{labels.savedPresetsDeviceOnly}</p>
      {message ? <Notice tone="danger" role="alert" className="mt-2">{message}</Notice> : null}

      {presets.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {presets.map((preset) => (
            <div key={preset.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-surface p-2">
              <Link href={buildReportPresetHref(locale, preset.query)} className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 min-w-0 flex-1 items-center px-2 text-sm md:min-h-0 md:py-1")}>
                <span className="truncate">{preset.name}</span>
              </Link>
              <Button variant="outline" size="icon-sm" onClick={() => deletePreset(preset.id)} aria-label={`${labels.deletePreset}: ${preset.name}`}>
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyNote className="mt-4">{labels.savedPresetsEmpty}</EmptyNote>
      )}
    </div>
  )
}

function isReportPreset(value: unknown): value is ReportPreset {
  if (!value || typeof value !== "object") return false
  const preset = value as Partial<ReportPreset>
  return typeof preset.id === "string" && typeof preset.name === "string" && typeof preset.query === "string" && typeof preset.createdAt === "string"
}

function subscribeToReportPresets(onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === reportPresetStorageKey) onStoreChange()
  }

  window.addEventListener("storage", onStorage)
  window.addEventListener(reportPresetStorageKey, onStoreChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(reportPresetStorageKey, onStoreChange)
  }
}

function readReportPresets() {
  try {
    const stored = window.localStorage.getItem(reportPresetStorageKey)
    if (stored === cachedReportPresetRaw) return cachedReportPresets

    const parsed = stored ? JSON.parse(stored) : []
    cachedReportPresetRaw = stored
    cachedReportPresets = Array.isArray(parsed) ? parsed.filter(isReportPreset) : emptyReportPresets
    return cachedReportPresets
  } catch {
    return emptyReportPresets
  }
}

function getServerReportPresets() {
  return emptyReportPresets
}
