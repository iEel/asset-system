type FormContextBannerProps = {
  label: string
  value: string
}

export function FormContextBanner({ label, value }: FormContextBannerProps) {
  return (
    <div className="rounded-md border border-primary/20 bg-primary-soft px-3 py-2">
      <div className="text-xs font-medium uppercase text-primary">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground" title={value}>
        {value}
      </div>
    </div>
  )
}
