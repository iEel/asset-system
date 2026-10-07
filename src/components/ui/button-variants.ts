import { cva, type VariantProps } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-danger-hover",
        warning: "bg-warning text-warning-foreground hover:bg-warning-hover",
        outline: "border border-border bg-surface text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 text-sm sm:h-10 sm:min-h-0",
        sm: "min-h-11 px-3 text-xs sm:h-8 sm:min-h-0",
        lg: "min-h-11 px-6 text-sm sm:h-11",
        icon: "min-h-11 min-w-11 sm:size-10 sm:min-h-0 sm:min-w-0",
        "icon-sm": "min-h-11 min-w-11 sm:size-8 sm:min-h-0 sm:min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
