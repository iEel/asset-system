import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react"

// One icon per tone, each a different shape, so the tone reads without color: toasts (error uses danger), Notice and
// ActionEmptyState. Older code imports the aliases AlertTriangle and CheckCircle2; they are the same icons and can stay.
export const toneIcons = {
  warning: TriangleAlert,
  danger: OctagonAlert,
  info: Info,
  success: CircleCheck,
} as const
