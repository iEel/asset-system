export function buildAccessDeniedHref({
  locale,
  module,
  action,
}: {
  locale: string
  module: string
  action: string
}) {
  const params = new URLSearchParams({ module, action })
  return `/${encodeURIComponent(locale)}/access-denied?${params.toString()}`
}
