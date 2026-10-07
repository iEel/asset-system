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

export const statusBadgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-md border font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "border-success-border bg-success-soft text-success",
        warning: "border-warning-border bg-warning-soft text-warning",
        danger: "border-danger-border bg-danger-soft text-danger",
        info: "border-info-border bg-info-soft text-info",
        primary: "border-info-border bg-primary-soft text-primary",
        neutral: "border-border bg-muted text-foreground",
        muted: "border-border bg-muted text-muted-foreground",
      },
      size: {
        xs: "px-2 py-0.5 text-xs",
        sm: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: { tone: "muted", size: "sm" },
  },
)

export const statusDotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
      primary: "bg-primary",
      neutral: "bg-muted-foreground",
      muted: "bg-muted-foreground",
    },
  },
  defaultVariants: { tone: "muted" },
})
