import { cva } from "class-variance-authority"

// Two tiers: calm states read as plain text with a marker; states that need action keep a soft fill and border.
// The border stays (transparent) on calm badges so both tiers have the same height side by side.
// One size everywhere: a fixed 22px box (1px border + one 20px line of 13px text) that matches a table line
// and never stretches in a flex row. 6px corners (rounded-control) because the badge is a small control.
export const statusBadgeVariants = cva(
  "inline-flex h-5.5 w-fit max-w-full shrink-0 items-center gap-1.5 rounded-control border text-meta font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "border-transparent text-muted-foreground",
        info: "border-transparent text-muted-foreground",
        primary: "border-transparent text-muted-foreground",
        neutral: "border-transparent text-muted-foreground",
        muted: "border-transparent text-muted-foreground",
        warning: "border-warning-border bg-warning-soft text-warning px-2",
        danger: "border-danger-border bg-danger-soft text-danger px-2",
      },
    },
    defaultVariants: { tone: "muted" },
  },
)

// Shape carries the meaning for color-blind users: ring = open/info, dot = done/fine, triangle = warning, diamond = problem, bar = neutral.
// forced-color-adjust-none keeps the shapes visible in Windows high-contrast mode.
export const statusMarkerVariants = cva("shrink-0 forced-color-adjust-none", {
  variants: {
    tone: {
      info: "size-[7px] rounded-full border-[1.5px] border-info forced-colors:border-[CanvasText]",
      success: "size-1.5 rounded-full bg-success forced-colors:bg-[CanvasText]",
      primary: "size-1.5 rounded-full bg-primary forced-colors:bg-[CanvasText]",
      neutral: "h-0.5 w-[7px] rounded-[1px] bg-neutral-ink forced-colors:bg-[CanvasText]",
      muted: "h-0.5 w-[7px] rounded-[1px] bg-neutral-ink forced-colors:bg-[CanvasText]",
      warning: "h-[7px] w-2 bg-warning [clip-path:polygon(50%_0,100%_100%,0_100%)] forced-colors:bg-[CanvasText]",
      danger: "size-1.5 rotate-45 rounded-[1px] bg-danger forced-colors:bg-[CanvasText]",
    },
  },
  defaultVariants: { tone: "muted" },
})
