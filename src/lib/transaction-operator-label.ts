import { prisma } from "@/lib/db"

// Who made a handover or a transfer, as a person reads it: the record stores the user's id (checkedOutBy, createdBy),
// which the cancel dialog showed as a UUID (the E2E suite's TX-A7). The label is the asset history's own: the linked
// employee's code and Thai name, else the display name and the username, else the email or the username. An id with no
// user left (a deleted account) stays as it is.
export async function getTransactionOperatorLabel(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, displayName: true, email: true, employee: { select: { code: true, fullNameTh: true } } },
  })
  if (!user) return userId
  if (user.employee) return `${user.employee.code} - ${user.employee.fullNameTh}`
  if (user.displayName) return `${user.displayName} (${user.username})`
  return user.email ?? user.username
}
