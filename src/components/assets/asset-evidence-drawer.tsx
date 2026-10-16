"use client"

import { useId, useMemo, useState, type RefObject } from "react"
import { FileText, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ChoiceChip } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"

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
  filterLabel: string
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
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const filterName = useId()
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
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current
          if (!target?.isConnected) return
          event.preventDefault()
          target.focus()
        }}
        className="w-full gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.triggerLabel}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Spec 2D: the counts are the shared number strip, the filters radio ChoiceChips in a named group (D19). */}
          <StatStrip
            items={[
              { key: "total", label: labels.total, value: formatCount(items.length) },
              { key: "images", label: labels.images, value: formatCount(imageCount) },
              { key: "documents", label: labels.documents, value: formatCount(documentCount) },
            ]}
          />

          <fieldset className="mt-4 min-w-0">
            <legend className="sr-only">{labels.filterLabel}</legend>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip type="radio" name={filterName} checked={activeGroup === "__all"} onChange={() => setActiveGroup("__all")} label={labels.all} />
              {groups.map((group) => (
                <ChoiceChip key={group} type="radio" name={filterName} checked={activeGroup === group} onChange={() => setActiveGroup(group)} label={group} />
              ))}
            </div>
          </fieldset>

          {filteredItems.length === 0 ? (
            <EmptyNote className="mt-4">{labels.emptyLabel}</EmptyNote>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <a
                  key={`${item.group}-${item.id}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.fileType.startsWith("image/") ? (
                    <div className="flex h-28 w-full items-center justify-center bg-background p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${item.href}?inline=1`} alt={item.title} loading="lazy" className="max-h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center gap-2 bg-background p-3 text-center text-meta font-medium text-muted-foreground">
                      <FileText aria-hidden="true" className="size-4" />
                      {item.fileType}
                    </div>
                  )}
                  <div className="border-t border-border p-3">
                    {/* The evidence group is a name, so it is the shared Chip (2D-2 R2). */}
                    <div className="flex items-center justify-between gap-2">
                      <Chip>{item.group}</Chip>
                      <span className="text-meta text-muted-foreground">{item.displayDate}</span>
                    </div>
                    <div className="mt-2 truncate text-sm font-medium text-foreground">{item.title}</div>
                    <div className="mt-1 truncate text-meta text-muted-foreground">{item.detail}</div>
                    <div className="mt-3 text-meta font-medium text-primary">{labels.openFile}</div>
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
