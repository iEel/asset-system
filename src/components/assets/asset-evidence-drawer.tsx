"use client"

import { useMemo, useState, type RefObject } from "react"
import { FileText, ImageIcon, Paperclip } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export type AssetEvidenceDrawerItem = {
  id: string
  title: string
  group: string
  detail: string
  uploadedAt: string
  displayDate: string
  fileType: string
  href: string
}

export type AssetEvidenceDrawerLabels = {
  title: string
  triggerLabel: string
  emptyLabel: string
  total: string
  images: string
  documents: string
  all: string
  openFile: string
}

export function AssetEvidenceDrawer({
  items,
  labels,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  returnFocusRef,
}: {
  items: AssetEvidenceDrawerItem[]
  labels: AssetEvidenceDrawerLabels
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const tCommon = useTranslations("common")
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const [activeGroup, setActiveGroup] = useState("__all")
  const groups = useMemo(() => Array.from(new Set(items.map((item) => item.group))), [items])
  const filteredItems = activeGroup === "__all" ? items : items.filter((item) => item.group === activeGroup)
  const imageCount = items.filter((item) => item.fileType.startsWith("image/")).length
  const documentCount = items.length - imageCount

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <SheetTrigger asChild>
          <Button variant="outline">
            <Paperclip aria-hidden="true" />
            {labels.triggerLabel}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        closeLabel={tCommon("close")}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current
          if (!target?.isConnected) return
          event.preventDefault()
          target.focus()
        }}
        className="w-full gap-0 bg-surface p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-3 pr-16">
          <SheetTitle className="text-base font-semibold text-foreground">{labels.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">{labels.triggerLabel}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2">
            <EvidenceStat label={labels.total} value={String(items.length)} />
            <EvidenceStat label={labels.images} value={String(imageCount)} />
            <EvidenceStat label={labels.documents} value={String(documentCount)} />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={activeGroup === "__all"} label={labels.all} onClick={() => setActiveGroup("__all")} />
            {groups.map((group) => (
              <FilterButton key={group} active={activeGroup === group} label={group} onClick={() => setActiveGroup(group)} />
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {labels.emptyLabel}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <a
                  key={`${item.group}-${item.id}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {item.fileType.startsWith("image/") ? (
                    <div className="flex h-28 w-full items-center justify-center bg-muted/40 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${item.href}?inline=1`}
                        alt={item.title}
                        loading="lazy"
                        className="max-h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
                      />
                    </div>
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center bg-muted/40 p-3 text-center text-xs font-medium text-muted-foreground">
                      <FileText className="mr-2 h-4 w-4" />
                      {item.fileType}
                    </div>
                  )}
                  <div className="border-t border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-primary">
                        {item.fileType.startsWith("image/") ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {item.group}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.displayDate}</span>
                    </div>
                    <div className="mt-2 truncate text-sm font-medium text-foreground">{item.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</div>
                    <div className="mt-3 text-xs font-medium text-primary">{labels.openFile}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function EvidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-8 shrink-0 items-center rounded-md bg-primary px-3 text-xs font-medium text-white"
          : "inline-flex h-8 shrink-0 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      }
    >
      {label}
    </button>
  )
}
