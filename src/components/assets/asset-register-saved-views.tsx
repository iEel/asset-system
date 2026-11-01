"use client"

import Link from "next/link"
import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type RefObject } from "react"
import { Bookmark, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatCount } from "@/lib/display-format"
import {
  addSavedView,
  assetRegisterSavedViewNameMax,
  assetRegisterSavedViewsKey,
  assetRegisterSavedViewsMax,
  deleteSavedView,
  readSavedViews,
  renameSavedView,
  type AssetRegisterSavedView,
  type AssetRegisterSavedViewError,
} from "@/lib/asset-register-saved-views"
import { cn } from "@/lib/utils"

// Saved views (group 4 spec §6.4, §6.7, call 4): kept in this browser's localStorage per user and locale. A write here
// tells the other view lists on the page through this event; another tab hears the browser's own storage event.
const savedViewsChangedEvent = "asset-register-saved-views-changed"

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(savedViewsChangedEvent, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(savedViewsChangedEvent, onChange)
  }
}

// Storage can be off (a private window, a blocked site): the list then reads as empty and a save says so.
function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStoredViews(key: string, views: AssetRegisterSavedView[]): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(views))
  } catch {
    return false
  }
  window.dispatchEvent(new Event(savedViewsChangedEvent))
  return true
}

// The raw string is the snapshot, so React compares it by value; the server and the first render read no views.
function useSavedViews(locale: string, userId: string) {
  const key = assetRegisterSavedViewsKey(locale, userId)
  const raw = useSyncExternalStore(subscribe, () => readStoredValue(key), () => null)
  const views = useMemo(() => readSavedViews(raw), [raw])
  return { key, views }
}

type DialogState = { mode: "save" } | { mode: "rename"; id: string }

const viewNameInputId = "asset-saved-view-name"

// noValidate keeps the browser out (V track): the lib's rules check the name and the count before anything is kept,
// and give either the next list or the refusal shown under the name field.
function validate(views: AssetRegisterSavedView[], dialog: DialogState, name: string, viewQuery: string) {
  return dialog.mode === "save" ? addSavedView(views, name, viewQuery) : renameSavedView(views, dialog.id, name)
}

// Desktop: "มุมมองที่บันทึกไว้: <view> · <view> · + บันทึกมุมมองนี้" under the toolbar. The current view (its query
// equals the page's view query) carries aria-current; each view has ⋯ with rename and delete.
export function AssetRegisterSavedViews({ locale, userId, viewQuery }: { locale: string; userId: string; viewQuery: string }) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const { key, views } = useSavedViews(locale, userId)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const saveButtonRef = useRef<HTMLButtonElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const errorText: Record<AssetRegisterSavedViewError, string> = {
    nameRequired: t("viewNameRequired"),
    nameTaken: t("viewNameTaken"),
    full: t("savedViewsFull", { max: formatCount(assetRegisterSavedViewsMax) }),
  }

  function openSave() {
    openerRef.current = saveButtonRef.current
    setName("")
    setError(null)
    setDialog({ mode: "save" })
  }

  function openRename(view: AssetRegisterSavedView, opener: HTMLElement | null) {
    openerRef.current = opener
    setName(view.name)
    setError(null)
    setDialog({ mode: "rename", id: view.id })
  }

  function showError(message: string) {
    setError(message)
    inputRef.current?.focus()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialog) return
    const result = validate(views, dialog, name, viewQuery)
    if (result.error) return showError(errorText[result.error])
    if (!writeStoredViews(key, result.views)) return showError(t("savedViewsStorageError"))
    setDialog(null)
  }

  function handleDelete(view: AssetRegisterSavedView) {
    writeStoredViews(key, deleteSavedView(views, view.id))
  }

  return (
    <nav aria-label={t("savedViews")} data-asset-saved-views className="mb-3 hidden min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm md:flex">
      <span className="text-muted-foreground">{t("savedViews")}:</span>
      {views.map((view) => (
        <span key={view.id} className="inline-flex min-w-0 items-center">
          <Link
            href={`/${locale}/assets?${view.query}`}
            aria-current={view.query === viewQuery ? "page" : undefined}
            className={cn(linkVariants({ size: "inherit" }), "inline-block max-w-60 truncate rounded-control px-1.5 py-1 aria-[current=page]:bg-primary-soft aria-[current=page]:text-foreground")}
          >
            {view.name}
          </Link>
          <SavedViewMenu
            view={view}
            label={t("savedViewActions", { name: view.name })}
            renameLabel={t("renameView")}
            deleteLabel={tCommon("delete")}
            fallbackFocusRef={saveButtonRef}
            onRename={(opener) => openRename(view, opener)}
            onDelete={() => handleDelete(view)}
          />
        </span>
      ))}
      <Button ref={saveButtonRef} variant="ghost" size="sm" onClick={openSave}>
        <Plus aria-hidden="true" />
        {t("saveView")}
      </Button>
      <AccessibleDialog
        open={dialog !== null}
        title={dialog?.mode === "rename" ? t("renameViewTitle") : t("saveView")}
        size="sm"
        initialFocusRef={inputRef}
        returnFocusRef={openerRef}
        fallbackFocusRef={saveButtonRef}
        onClose={() => setDialog(null)}
      >
        <form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>
          <AccessibleDialogBody>
            <Field label={t("viewName")} id={viewNameInputId} required hint={t("viewNameHint")} error={error}>
              <Input
                ref={inputRef}
                value={name}
                maxLength={assetRegisterSavedViewNameMax}
                autoComplete="off"
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
              />
            </Field>
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel />
            <Button type="submit">{tCommon("save")}</Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
    </nav>
  )
}

// One view's ⋯. The menu never holds the dialog (as RowActions): rename asks the owner to open it, and the closing menu
// leaves focus to the dialog. After a delete the ⋯ is gone, so focus goes to "+ บันทึกมุมมองนี้".
function SavedViewMenu({
  view,
  label,
  renameLabel,
  deleteLabel,
  fallbackFocusRef,
  onRename,
  onDelete,
}: {
  view: AssetRegisterSavedView
  label: string
  renameLabel: string
  deleteLabel: string
  fallbackFocusRef: RefObject<HTMLElement | null>
  onRename: (opener: HTMLElement | null) => void
  onDelete: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const nextFocusRef = useRef<"dialog" | "fallback" | null>(null)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon-sm" aria-label={label} title={label} data-saved-view-id={view.id}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(event) => {
          const next = nextFocusRef.current
          nextFocusRef.current = null
          if (!next) return
          event.preventDefault()
          if (next === "fallback") fallbackFocusRef.current?.focus()
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            nextFocusRef.current = "dialog"
            onRename(triggerRef.current)
          }}
        >
          <Pencil aria-hidden="true" />
          {renameLabel}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            nextFocusRef.current = "fallback"
            onDelete()
          }}
        >
          <Trash2 aria-hidden="true" />
          {deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Phone (§6.7): a button beside the filter button opens the views; saving is desktop only (call 4). With no view kept
// in this browser there is nothing to open, so the button stays away.
export function AssetRegisterSavedViewsMenu({
  locale,
  userId,
  viewQuery,
  className,
}: {
  locale: string
  userId: string
  viewQuery: string
  className?: string
}) {
  const t = useTranslations("asset")
  const { views } = useSavedViews(locale, userId)
  if (views.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md" className={className} aria-label={t("savedViews")} title={t("savedViews")}>
          <Bookmark className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {views.map((view) => (
          <DropdownMenuItem key={view.id} asChild>
            <Link href={`/${locale}/assets?${view.query}`} aria-current={view.query === viewQuery ? "page" : undefined}>
              {view.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
