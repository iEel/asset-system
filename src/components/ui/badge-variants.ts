import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

// Two tiers: calm states read as plain text with a marker; states that need action keep a soft fill and border.
// The border stays (transparent) on calm badges so both tiers have the same height side by side.
export const statusBadgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-md border font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "border-transparent text-muted-foreground",
        info: "border-transparent text-muted-foreground",
        primary: "border-transparent text-muted-foreground",
        neutral: "border-transparent text-muted-foreground",
        muted: "border-transparent text-muted-foreground",
        warning: "border-warning-border bg-warning-soft text-warning",
        danger: "border-danger-border bg-danger-soft text-danger",
      },
      size: {
        xs: "py-0.5 text-xs",
        sm: "py-1 text-sm",
      },
    },
    compoundVariants: [
      { tone: ["warning", "danger"], size: "xs", class: "px-2" },
      { tone: ["warning", "danger"], size: "sm", class: "px-2.5" },
    ],
    defaultVariants: { tone: "muted", size: "sm" },
  },
)

// Shape carries the meaning for color-blind users: ring = open/info, dot = done/fine, triangle = warning, diamond = problem, bar = neutral.
// forced-color-adjust-none keeps the shapes visible in Windows high-contrast mode.
export const statusMarkerVariants = cva("shrink-0 forced-color-adjust-none", {
  variants: {
    tone: {
      info: "size-[7px] rounded-full border-[1.5px] border-info",
      success: "size-1.5 rounded-full bg-success",
      primary: "size-1.5 rounded-full bg-primary",
      neutral: "h-0.5 w-[7px] rounded-[1px] bg-muted-foreground",
      muted: "h-0.5 w-[7px] rounded-[1px] bg-muted-foreground",
      warning: "h-[7px] w-2 bg-warning [clip-path:polygon(50%_0,100%_100%,0_100%)]",
      danger: "size-1.5 rotate-45 rounded-[1px] bg-danger",
    },
  },
  defaultVariants: { tone: "muted" },
})
