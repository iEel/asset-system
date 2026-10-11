import type React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toneIcons } from "@/components/ui/tone-icons"

export type NoticeTone = "warning" | "danger" | "info" | "neutral" | "success"

type NoticeProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Required on purpose, so no notice turns orange by default. */
  tone: NoticeTone
  title?: React.ReactNode
  /** A Button with size="md", or a link, on its own row under the text. */
  action?: React.ReactNode
  /** Replaces the tone's icon. */
  icon?: React.ReactNode
}

// warning and danger are boxes, for something the user has to deal with now; they are the only notices that sit inside
// a panel. info, neutral and success sit inline, with no frame, fill or padding. The text stays foreground or
// muted-foreground and the tone lives in the icon. Live-region attributes are the call site's job (an alert for an
// error after a command, a status for a background result); tests read them from the call site.
const noticeTones: Record<NoticeTone, { fill: string | null; Icon: LucideIcon; iconColor: string }> = {
  warning: { fill: "border-warning-border bg-warning-soft", Icon: toneIcons.warning, iconColor: "text-warning" },
  danger: { fill: "border-danger-border bg-danger-soft", Icon: toneIcons.danger, iconColor: "text-danger" },
  info: { fill: null, Icon: toneIcons.info, iconColor: "text-info" },
  neutral: { fill: null, Icon: toneIcons.info, iconColor: "text-muted-foreground" },
  success: { fill: null, Icon: toneIcons.success, iconColor: "text-success" },
}

export function Notice({ tone, title, action, icon, className, children, ...props }: NoticeProps) {
  const { fill, Icon, iconColor } = noticeTones[tone]
  const boxed = fill !== null
  // In a box with a title, the body is the small second line; without a title, the body is the message itself.
  const bodyClassName = boxed ? (title ? "text-meta text-muted-foreground" : "text-foreground") : "text-muted-foreground"

  return (
    <div
      className={cn(
        boxed
          ? "grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5 rounded-md border px-4 py-3 text-sm text-foreground text-pretty"
          : "flex items-start gap-2 text-sm text-pretty",
        fill,
        className,
      )}
      {...props}
    >
      {/* 22px tall: the icon centers on the first 22px line of text-sm. */}
      <span aria-hidden="true" className={cn("flex h-5.5 shrink-0 items-center", iconColor)}>
        {icon ?? <Icon className={boxed ? "size-4.5" : "size-4"} />}
      </span>
      <div className={cn("grid min-w-0 flex-1 justify-items-start", boxed ? "gap-2" : "gap-1")}>
        {title ? <div className="font-semibold text-foreground">{title}</div> : null}
        {children ? <div className={bodyClassName}>{children}</div> : null}
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  )
}
