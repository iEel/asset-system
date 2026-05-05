import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  matcher: [
    "/",
    "/(th|en)/:path*",
    // Skip api routes, static files, images
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
}
