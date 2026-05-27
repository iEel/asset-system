import createNextIntlPlugin from "next-intl/plugin"
import { getSecurityHeadersConfig } from "./src/lib/security-headers.ts"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig = {
  output: "standalone" as const,
  async headers() {
    return getSecurityHeadersConfig()
  },
}

export default withNextIntl(nextConfig)
