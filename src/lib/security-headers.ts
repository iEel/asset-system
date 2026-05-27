export type SecurityHeader = {
  key: string
  value: string
}

export type SecurityHeaderConfig = {
  source: string
  headers: SecurityHeader[]
}

export const globalSecurityHeaders: SecurityHeader[] = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  },
]

export const serviceWorkerSecurityHeaders: SecurityHeader[] = [
  {
    key: "Content-Type",
    value: "application/javascript; charset=utf-8",
  },
  {
    key: "Cache-Control",
    value: "no-cache, no-store, must-revalidate",
  },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self'",
  },
]

export function getSecurityHeadersConfig(): SecurityHeaderConfig[] {
  return [
    {
      source: "/:path*",
      headers: globalSecurityHeaders,
    },
    {
      source: "/sw.js",
      headers: serviceWorkerSecurityHeaders,
    },
  ]
}
