import { prisma } from "@/lib/db"
import { normalizeLoginCompanyName } from "@/lib/login-page"

// Before sign-in the login reads this one setting and nothing else from the settings table.
export async function getLoginCompanyName(): Promise<string | null> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: "company_name" },
      select: { value: true },
    })
    return normalizeLoginCompanyName(row?.value)
  } catch {
    return null
  }
}
