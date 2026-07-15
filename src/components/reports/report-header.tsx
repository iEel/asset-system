import Link from "next/link"
import { Download } from "lucide-react"

export type ReportHeaderAction = {
  href: string
  label: string
  variant: "primary" | "secondary"
}

export type ReportHeaderProps = {
  title: string
  subtitle: string
  actions: ReportHeaderAction[]
}

export function ReportHeader({ title, subtitle, actions }: ReportHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions.length > 0 ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {actions.map((action) => (
            <Link
              key={`${action.variant}:${action.href}`}
              href={action.href}
              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors sm:h-10 sm:min-h-0 sm:w-auto ${
                action.variant === "primary"
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "border border-border bg-surface text-foreground hover:bg-accent"
              }`}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  )
}
