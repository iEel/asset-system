import * as React from "react"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonVariantProps } from "@/components/ui/button-variants"

// `busy` means "working on it". The button keeps keyboard focus (no disabled attribute), is announced as busy and
// unavailable, shows a spinner and ignores clicks. Slot cannot insert a spinner, so busy and asChild never mix.
type ButtonProps = React.ComponentProps<"button"> &
  ButtonVariantProps &
  ({ asChild?: false; busy?: boolean } | { asChild: true; busy?: never })

// Cancelling the click stops the caller's handler and a form submit. It also covers Enter in a form field, because
// implicit submission clicks the submit button. There is no hook, so Button still renders on the server; `busy`
// itself must come from client state, because a server file cannot hand this handler to a <button>.
function preventBusyClick(event: React.MouseEvent<HTMLButtonElement>) {
  event.preventDefault()
}

// The spinner takes the place of a leading icon, so the width stays the same, or goes in front of a text label.
function withBusySpinner(children: React.ReactNode) {
  const spinner = (
    <Loader2 key="button-spinner" data-slot="button-spinner" aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
  )
  const items = React.Children.toArray(children)
  const [first, ...rest] = items
  const leadsWithIcon =
    React.isValidElement(first) && first.type !== React.Fragment && (typeof first.type !== "string" || first.type === "svg")
  return leadsWithIcon ? [spinner, ...rest] : [spinner, ...items]
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  busy = false,
  type,
  onClick,
  children,
  "aria-busy": ariaBusy,
  "aria-disabled": ariaDisabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const isBusy = busy && !asChild

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? type : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
      data-busy={isBusy ? "" : undefined}
      aria-busy={isBusy || ariaBusy}
      aria-disabled={isBusy || ariaDisabled}
      onClick={isBusy ? preventBusyClick : onClick}
    >
      {isBusy ? withBusySpinner(children) : children}
    </Comp>
  )
}

export { Button, buttonVariants }
