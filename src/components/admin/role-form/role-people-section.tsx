"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ArrowRight, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { StatusBadge } from "@/components/ui/status-badge"
import { RoleAddUsersDialog } from "@/components/admin/role-form/role-add-users-dialog"
import { getPanelClasses } from "@/lib/design-system"
import type { RoleFormPerson } from "@/lib/role-form-data"
import { cn, formatDateTime } from "@/lib/utils"

// ผู้ใช้ในบทบาทนี้ (spec §7.3, edit only, user:view): the first 10 people by name with their login name, status and last
// sign-in; a name links to the user's edit page with user:edit. ดูทั้งหมด opens the user list filtered to the role.
// เพิ่มผู้ใช้เข้าบทบาทนี้ needs user:edit and an active role; on an inactive role the button gives way to a line that
// says why. Removing someone stays on that user's edit page.
export function RolePeopleSection({
  roleId,
  roleActive,
  people,
  userCount,
  canEditUsers,
  usersHref,
}: {
  roleId: string
  roleActive: boolean
  people: RoleFormPerson[]
  userCount: number
  canEditUsers: boolean
  usersHref: string
}) {
  const locale = useLocale()
  const t = useTranslations("adminRolesPage")
  const tUsers = useTranslations("adminUsersPage")
  const tCommon = useTranslations("common")
  const addRef = useRef<HTMLButtonElement | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <section id="role-people" className={cn(getPanelClasses(), "mt-6 scroll-mt-20")} aria-labelledby="role-people-heading">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">
        <h2 id="role-people-heading" className="text-base font-semibold text-foreground">
          {t("form.peopleTitle")} <span className="num font-normal text-muted-foreground">({userCount})</span>
        </h2>
        {canEditUsers && roleActive ? (
          <Button ref={addRef} type="button" variant="outline" size="md" onClick={() => setAdding(true)}>
            <UserPlus aria-hidden="true" />
            {t("form.addUsers")}
          </Button>
        ) : null}
      </div>
      {canEditUsers && !roleActive ? <p className="px-4 pt-3 text-meta text-muted-foreground md:px-5">{t("form.addUsersInactiveRole")}</p> : null}
      {people.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">{t("form.peopleEmpty")}</p>
      ) : (
        <ul className="divide-y divide-border-soft">
          {people.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 md:px-5">
              <span className="min-w-0 font-medium text-foreground">
                {canEditUsers ? (
                  <Link href={`/${locale}/admin/users/${person.id}/edit`} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                    {person.displayName}
                  </Link>
                ) : (
                  person.displayName
                )}
              </span>
              <span className="text-meta text-muted-foreground"><span className="tag">{person.username}</span></span>
              <StatusBadge label={person.isActive ? tCommon("active") : tCommon("inactive")} tone={person.isActive ? "success" : "muted"} />
              <span className="num text-meta text-muted-foreground sm:ml-auto">
                {person.lastLoginAt ? tUsers("form.lastLogin", { time: formatDateTime(person.lastLoginAt) }) : tUsers("neverLoggedIn")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {userCount > 0 ? (
        <div className="border-t border-border px-4 py-3 md:px-5">
          <Link href={usersHref} className={cn(linkVariants({ size: "meta" }), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
            {t("form.peopleAll")}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      ) : null}
      {canEditUsers && roleActive ? (
        <RoleAddUsersDialog roleId={roleId} open={adding} returnFocusRef={addRef} onClose={() => setAdding(false)} />
      ) : null}
    </section>
  )
}
