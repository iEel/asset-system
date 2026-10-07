import type React from "react"
import { Button } from "@/components/ui/button"
import type { UiButtonSize, UiButtonVariant } from "@/lib/design-system"

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: UiButtonVariant
  size?: UiButtonSize
}

const variantMap = { primary: "default", secondary: "outline", danger: "destructive", ghost: "ghost" } as const
const sizeMap = { md: "default", sm: "sm" } as const

export function ActionButton({ variant = "secondary", size = "md", type = "button", ...props }: ActionButtonProps) {
  return <Button type={type} variant={variantMap[variant]} size={sizeMap[size]} {...props} />
}
