import createMiddleware from "next-intl/middleware"
import { NextRequest } from "next/server"
import { routing } from "./i18n/routing"
import { buildRequestPath, requestPathHeader } from "./lib/login-redirect"

const handleI18nRouting = createMiddleware(routing)

// Stamps the page a person asked for (path and query, without `_rsc`) into a request header, so a signed-out
// page can send the person to the login with a callbackUrl. `set` overwrites any value the client sent.
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set(requestPathHeader, buildRequestPath(request.nextUrl))
  return handleI18nRouting(new NextRequest(request, { headers }))
}

export const config = {
  matcher: [
    "/",
    "/(th|en)/:path*",
    // Skip api routes, static files, images
    "/((?!api|q|_next|_vercel|.*\\..*).*)",
  ],
}
