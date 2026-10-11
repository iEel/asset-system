"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckIcon, ChevronRightIcon } from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

// Floating panel (mockup .menu): 12px corners, 6px padding, at least 240px wide, 1px between items.
// Opens with a 160ms fade and a 4px slide, closes with a 100ms fade, never zooms, and stays still under reduced motion.
const menuPanelClasses =
  "z-50 grid max-h-(--radix-dropdown-menu-content-available-height) min-w-60 origin-(--radix-dropdown-menu-content-transform-origin) gap-px overflow-x-hidden overflow-y-auto rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-overlay outline-none duration-160 ease-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100 motion-reduce:animate-none!"

// One row (mockup .menu-item): 36px from md up, 44px below. The highlight shows at once and fades out in 150ms.
// Keyboard focus draws the base outline inside the row. An item that cannot be used (aria-disabled, set by Radix for
// disabled items and by `unavailable`) is faint with no fill; no opacity, so its reason line stays readable.
const menuItemClasses =
  "relative flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-control px-2.5 py-1.5 text-sm text-foreground transition-colors md:min-h-9 focus:bg-primary-soft focus:duration-0 focus-visible:-outline-offset-2 active:bg-muted data-[disabled]:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:bg-transparent aria-disabled:text-faint-foreground aria-disabled:*:[svg]:text-faint-foreground! data-[inset]:pl-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"

// Delete and sign-out rows. Kept in their own string: data-[…] rules come after aria-disabled: in the CSS, so each rule
// needs not-aria-disabled: or a disabled delete row would stay red; and the guard that keeps faint text off status fills
// reads one class string at a time.
const menuItemDestructiveClasses =
  "data-[variant=destructive]:not-aria-disabled:text-danger data-[variant=destructive]:not-aria-disabled:focus:bg-danger-soft data-[variant=destructive]:not-aria-disabled:*:[svg]:text-danger!"

// Radix skips a disabled item for arrow keys and typeahead. An unavailable item stays focusable and is announced with
// its reason, but choosing it (click, Enter, Space) does nothing and keeps the menu open.
const unavailableItemProps = {
  "aria-disabled": true,
  "data-unavailable": "",
  onSelect: (event: Event) => event.preventDefault(),
} as const

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(menuPanelClasses, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

type DropdownMenuItemProps = React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
} & (
    | { unavailable?: false }
    // Not with asChild: a child <Link> would navigate before the selection is cancelled.
    | { unavailable: true; asChild?: never; onSelect?: never }
  )

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  unavailable,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(menuItemClasses, menuItemDestructiveClasses, className)}
      {...props}
      {...(unavailable ? unavailableItemProps : {})}
    />
  )
}

// Two-line item text (mockup .stack): the item name, then DropdownMenuItemDescription.
function DropdownMenuItemText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-item-text"
      className={cn("grid min-w-0 flex-1", className)}
      {...props}
    />
  )
}

// The second line: why an item cannot be used, or a short hint. 4.99:1 on the primary-soft highlight.
function DropdownMenuItemDescription({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-item-description"
      className={cn("text-meta text-faint-foreground", className)}
      {...props}
    />
  )
}

// A check box in front of the text (mockup .cbox). Its colors follow the checked and disabled props.
function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  disabled,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  const on = Boolean(checked)
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(menuItemClasses, "data-[state=checked]:font-medium", className)}
      checked={checked}
      disabled={disabled}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm border-[1.5px]",
          !on && "border-input bg-surface",
          on && !disabled && "border-primary bg-primary",
          on && disabled && "border-border bg-muted",
        )}
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon strokeWidth={3} className={cn("size-3", disabled ? "text-muted-foreground" : "text-primary-foreground")} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

// The chosen option carries a check at the end of the row (mockup .check) and medium weight, so it is not told by color alone.
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(menuItemClasses, "data-[state=checked]:font-medium", className)}
      {...props}
    >
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="ml-auto flex">
        <CheckIcon className="size-4 text-primary" />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground data-[inset]:pl-9",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("mx-1 my-[5px] h-px bg-border-soft", className)}
      {...props}
    />
  )
}

// Trailing text on a row (mockup .trail), such as a current value or a key name.
function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto pl-3 whitespace-nowrap text-meta text-faint-foreground",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(menuItemClasses, "data-[state=open]:bg-primary-soft", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(menuPanelClasses, className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuItemText,
  DropdownMenuItemDescription,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
