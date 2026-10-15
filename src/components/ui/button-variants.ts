import { cva, type VariantProps } from "class-variance-authority"

// Size strings live in constants so phase 2D can switch `default` and `icon` to 36px by editing one line each.
// Below md every size is at least 44px tall. Radius follows the mockup (spec I15): sm and icon-sm are small
// controls (rounded-control, 6px); md, lg, default, icon and icon-lg match the fields (rounded-md, 8px).
// lg and icon-lg (40px from md) are only for a button in the same row as a 40px field (spec 2D D5, D6).
const sizeSm = "min-h-11 px-2.5 text-meta md:h-8 md:min-h-0 rounded-control"
const sizeMd = "min-h-11 px-3.5 text-sm md:h-9 md:min-h-0 rounded-md"
const sizeLg = "min-h-11 px-4 text-sm md:h-10 md:min-h-0 rounded-md"
const sizeIconSm = "min-h-11 min-w-11 md:size-8 md:min-h-0 md:min-w-0 rounded-control"
const sizeIcon = "min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0 rounded-md"
const sizeIconLg = "min-h-11 min-w-11 md:size-10 md:min-h-0 md:min-w-0 rounded-md"

// Every variant draws a 1px border, so all variants share one box size. The disabled look wins over every
// variant and state because Tailwind emits hover:, active:, disabled: and aria-disabled: rules in that order.
// Nothing fades through transparency. aria-disabled covers busy buttons and asChild links, which cannot take a real disabled.
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-faint-foreground aria-disabled:pointer-events-none aria-disabled:border-border aria-disabled:bg-background aria-disabled:text-faint-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover active:border-brand-navy active:bg-brand-navy",
        outline: "border-control-border bg-surface text-foreground hover:border-input hover:bg-background active:border-input active:bg-muted",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-background hover:text-foreground active:bg-muted",
        danger: "border-danger-border bg-surface text-danger hover:bg-danger-soft active:border-danger",
        destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-danger-hover hover:border-danger-hover",
        warning: "border-warning bg-warning text-warning-foreground hover:bg-warning-hover hover:border-warning-hover",
      },
      size: {
        sm: sizeSm,
        md: sizeMd,
        lg: sizeLg,
        default: sizeLg,
        "icon-sm": sizeIconSm,
        icon: sizeIcon,
        "icon-lg": sizeIconLg,
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

// Text links (mockup `.link`): underline appears on hover and keyboard focus. `meta` is for a stand-alone command
// link ("ล้างทั้งหมด"); `inherit` is for a link inside a sentence. No 44px box of its own: a stand-alone link on
// mobile adds `inline-flex min-h-11 items-center md:min-h-0` at the call site.
export const linkVariants = cva(
  "inline font-medium text-primary underline decoration-transparent decoration-1 underline-offset-3 transition-colors hover:decoration-current focus-visible:decoration-current",
  {
    variants: {
      size: {
        meta: "text-meta whitespace-nowrap",
        inherit: "",
      },
    },
    defaultVariants: {
      size: "meta",
    },
  },
)
